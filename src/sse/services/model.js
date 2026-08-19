import { getModelAliases, getComboByName, getProviderNodes } from "@/lib/localDb";
import { parseModel as parseModelCore, resolveModelAliasFromMap, getModelInfoCore } from "open-sse/services/model.js";
import REGISTRY from "open-sse/providers/registry/index.js";
import { stripComboPrefix } from "open-sse/services/combo.js";
import { resolveTemplate } from "open-sse/config/autoTemplates.js";
import { buildModelsList } from "@/sse/services/allowedModels.js";
import { getDisabledModels } from "@/lib/disabledModelsDb";

// Local provider alias overrides (HMR-friendly, applied on top of open-sse map)
const LOCAL_PROVIDER_ALIASES = {
  xmtp: "xiaomi-tokenplan",
  "xiaomi-tokenplan": "xiaomi-tokenplan",
};

const RESERVED_PROVIDER_PREFIXES = new Set(Object.keys(LOCAL_PROVIDER_ALIASES));
for (const entry of REGISTRY) {
  RESERVED_PROVIDER_PREFIXES.add(entry.id);
  if (entry.alias) RESERVED_PROVIDER_PREFIXES.add(entry.alias);
  for (const alias of entry.aliases || []) RESERVED_PROVIDER_PREFIXES.add(alias);
}

export function parseModel(modelStr) {
  const parsed = parseModelCore(modelStr);
  if (parsed?.providerAlias && LOCAL_PROVIDER_ALIASES[parsed.providerAlias]) {
    return { ...parsed, provider: LOCAL_PROVIDER_ALIASES[parsed.providerAlias] };
  }
  return parsed;
}

/**
 * Resolve model alias from localDb
 */
export async function resolveModelAlias(alias) {
  const aliases = await getModelAliases();
  return resolveModelAliasFromMap(alias, aliases);
}

/**
 * Get full model info (parse or resolve)
 */
export async function getModelInfo(modelStr) {
  if (!modelStr || typeof modelStr !== "string") {
    return { provider: null, model: modelStr };
  }

  const cleanName = stripComboPrefix(modelStr);

  // Check if this is a combo name (or built-in template) before resolving as provider/model
  const directCombo = (await getComboByName(cleanName)) || (await getComboByName(modelStr));
  if (directCombo) {
    return { provider: null, model: cleanName };
  }
  if (resolveTemplate(cleanName) || resolveTemplate(modelStr)) {
    return { provider: null, model: cleanName };
  }

  const parsed = parseModel(modelStr);

  if (!parsed.isAlias) {
    // Provider-node prefixes are user-defined. They must not override built-in
    // provider ids/aliases such as `cf`, `cloudflare-ai`, `openai`, or `hf`.
    if (!RESERVED_PROVIDER_PREFIXES.has(parsed.providerAlias)) {
      const openaiNodes = await getProviderNodes({ type: "openai-compatible" });
      const matchedOpenAI = openaiNodes.find((node) => node.prefix === parsed.providerAlias);
      if (matchedOpenAI) {
        return { provider: matchedOpenAI.id, model: parsed.model };
      }

      const anthropicNodes = await getProviderNodes({ type: "anthropic-compatible" });
      const matchedAnthropic = anthropicNodes.find((node) => node.prefix === parsed.providerAlias);
      if (matchedAnthropic) {
        return { provider: matchedAnthropic.id, model: parsed.model };
      }

      const embeddingNodes = await getProviderNodes({ type: "custom-embedding" });
      const matchedEmbedding = embeddingNodes.find((node) => node.prefix === parsed.providerAlias);
      if (matchedEmbedding) {
        return { provider: matchedEmbedding.id, model: parsed.model };
      }
    }
    return {
      provider: parsed.provider,
      model: parsed.model
    };
  }

  // Check if this is a combo name before resolving as alias
  // This prevents combo names from being incorrectly routed to providers
  const aliasCombo = (await getComboByName(parsed.model)) || (await getComboByName(cleanName));
  if (aliasCombo || resolveTemplate(parsed.model) || resolveTemplate(cleanName)) {
    // Return null provider to signal this should be handled as combo
    // The caller (handleChat) will detect this and handle it as combo
    return { provider: null, model: parsed.model };
  }

  return getModelInfoCore(modelStr, getModelAliases);
}

/**
 * Check if model is a combo and get models list
 * Supports custom database combos and built-in auto templates.
 * @returns {Promise<string[]|null>} Array of models or null if not a combo
 */
export async function getComboModels(modelStr) {
  if (!modelStr || typeof modelStr !== "string") return null;

  const cleanName = stripComboPrefix(modelStr);

  // 1. Check custom combo in database (try cleanName first, then raw modelStr)
  const combo = (await getComboByName(cleanName)) || (await getComboByName(modelStr));
  if (combo && Array.isArray(combo.models) && combo.models.length > 0) {
    return filterDisabledModels(combo.models);
  }

  // 2. Check built-in auto templates (e.g. auto/best-free, family/gemini, agent/workhorse)
  const template = resolveTemplate(cleanName) || resolveTemplate(modelStr);
  if (template) {
    if (Array.isArray(template.models) && template.models.length > 0) {
      return filterDisabledModels(template.models);
    }

    try {
      const allModels = await buildModelsList(["llm"], { skipDynamicFetch: true });
      const providerModels = allModels
        .filter((m) => m?.id && m.owned_by !== "combo" && m.owned_by !== "auto-router" && !m.id.startsWith("combo/") && m.id.includes("/"))
        .map((m) => m.id);

      if (Array.isArray(template.seedModels) && template.seedModels.length > 0) {
        const combined = Array.from(new Set([...template.seedModels, ...providerModels]));
        return filterDisabledModels(combined.length > 0 ? combined : template.seedModels);
      }

      return filterDisabledModels(providerModels.length > 0 ? providerModels : null);
    } catch {
      return filterDisabledModels(Array.isArray(template.seedModels) && template.seedModels.length > 0 ? template.seedModels : null);
    }
  }

  return null;
}

/**
 * Filter out disabled models from a combo model list.
 * Single point of enforcement — called by getComboModels() so both
 * handleChat and handleSingleModelChat get filtered lists.
 */
async function filterDisabledModels(models) {
  if (!models || models.length === 0) return models;
  try {
    const disabledByAlias = await getDisabledModels();
    if (!disabledByAlias || Object.keys(disabledByAlias).length === 0) return models;
    return models.filter((modelStr) => {
      if (typeof modelStr !== "string") return true;
      // Extract provider alias from "provider/model" string
      const slashIdx = modelStr.indexOf("/");
      if (slashIdx === -1) return true;
      const providerAlias = modelStr.slice(0, slashIdx);
      const modelId = modelStr.slice(slashIdx + 1);
      const disabled = disabledByAlias[providerAlias];
      return !Array.isArray(disabled) || !disabled.includes(modelId);
    });
  } catch {
    // DB unavailable — return unfiltered list (fail-open)
    return models;
  }
}
