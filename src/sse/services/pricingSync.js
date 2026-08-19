// Pricing sync — fetches latest prices from LiteLLM and stores in DB.
// Runs on server startup + hourly. Synced pricing sits between
// user overrides (highest priority) and static defaults (lowest).

import { makeKv } from "../../lib/db/helpers/kvStore.js";

const LITELLM_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

const SYNCED_KV_SCOPE = "pricing-synced";
const SYNC_META_KEY = "_syncMeta";
const SYNC_INTERVAL_MS = 3_600_000; // 1 hour

const syncedKv = makeKv(SYNCED_KV_SCOPE);

let syncTimer = null;

/**
 * Fetch the LiteLLM pricing JSON and transform to Hermes format.
 * LiteLLM uses per-token costs; we convert to $/1M tokens.
 */
async function fetchLiteLLM() {
  const res = await fetch(LITELLM_URL, {
    headers: { "User-Agent": "hermes-router/pricing-sync" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`LiteLLM fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Transform a single LiteLLM entry to Hermes pricing format.
 * Returns null if the entry has no usable pricing data.
 */
export function transformEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  if (entry.error) return null; // skip error entries

  const input =
    typeof entry.input_cost_per_token === "number"
      ? entry.input_cost_per_token * 1_000_000
      : null;
  const output =
    typeof entry.output_cost_per_token === "number"
      ? entry.output_cost_per_token * 1_000_000
      : null;

  // Skip entries with no pricing at all
  if (input === null && output === null) return null;

  const pricing = {};
  if (input !== null) pricing.input = round(input);
  if (output !== null) pricing.output = round(output);

  // Cached tokens (some providers)
  if (typeof entry.cache_read_input_token_cost === "number") {
    pricing.cached = round(entry.cache_read_input_token_cost * 1_000_000);
  }

  // Cache creation cost
  if (typeof entry.cache_creation_input_token_cost === "number") {
    pricing.cache_creation = round(entry.cache_creation_input_token_cost * 1_000_000);
  }

  return pricing;
}

function round(n) {
  return Math.round(n * 10_000) / 10_000; // 4 decimal places
}

/**
 * Fetch, transform, and store all pricing from LiteLLM.
 * Returns { count, duration } for logging.
 */
export async function syncPricing() {
  const start = Date.now();

  const raw = await fetchLiteLLM();

  // Group by provider (LiteLLM uses "litellm_provider" or falls back to first segment)
  const byProvider = {};
  let count = 0;

  for (const [modelId, entry] of Object.entries(raw)) {
    const pricing = transformEntry(entry);
    if (!pricing) continue;

    // Determine provider from litellm_provider field or model prefix
    const provider = resolveProvider(entry, modelId);
    if (!provider) continue;

    if (!byProvider[provider]) byProvider[provider] = {};
    byProvider[provider][modelId] = pricing;
    count++;
  }

  // Write to DB in batches (per-provider transactions)
  for (const [provider, models] of Object.entries(byProvider)) {
    await syncedKv.set(provider, models);
  }

  // Store sync metadata
  await syncedKv.set(SYNC_META_KEY, {
    lastSyncedAt: new Date().toISOString(),
    modelCount: count,
    providerCount: Object.keys(byProvider).length,
  });

  const duration = Date.now() - start;
  console.log(
    `[pricingSync] Synced ${count} models from ${Object.keys(byProvider).length} providers in ${duration}ms`
  );

  return { count, duration };
}

/**
 * Resolve the Hermes provider alias from a LiteLLM entry.
 * Maps litellm_provider strings to Hermes aliases.
 */
function resolveProvider(entry, modelId) {
  // LiteLLM litellm_provider field (most reliable)
  const litellmProvider = entry.litellm_provider;

  // Known mappings: litellm_provider → hermes alias
  const PROVIDER_MAP = {
    openai: "openai",
    anthropic: "anthropic",
    gemini: "gemini",
    vertex_ai: "gemini",
    bedrock: "bedrock",
    deepseek: "deepseek",
    groq: "groq",
    openrouter: "openrouter",
    together_ai: "together",
    fireworks_ai: "fireworks",
    deepgram: "deepgram",
    mistral: "mistral",
    cohere: "cohere",
    volcengine: "volcengine",
    siliconflow: "siliconflow",
    alibaba: "qwen",
    azure: "azure",
    nvidia_nim: "nvidia",
    codestral: "codestral",
    xai: "xai",
    minimax: "minimax",
    glassai: "glassai",
  };

  if (litellmProvider && PROVIDER_MAP[litellmProvider]) {
    return PROVIDER_MAP[litellmProvider];
  }

  // Fallback: infer from model ID prefix
  const prefix = modelId.split("/")[0];
  if (prefix && PROVIDER_MAP[prefix]) return PROVIDER_MAP[prefix];

  // Skip unknown providers
  return null;
}

/**
 * Get synced pricing for a specific model.
 * Returns the pricing object or null if not found.
 */
export async function getSyncedPricing(model) {
  if (!model) return null;
  const all = await syncedKv.getAll();
  for (const [provider, models] of Object.entries(all)) {
    if (provider === SYNC_META_KEY) continue;
    if (models[model]) return models[model];
  }
  return null;
}

/**
 * Get sync metadata (last sync time, counts).
 */
export async function getSyncMeta() {
  return await syncedKv.get(SYNC_META_KEY, null);
}

/**
 * Start periodic sync. Safe to call multiple times — only one timer runs.
 */
export function startPeriodicSync() {
  if (syncTimer) return;
  syncTimer = setInterval(() => {
    syncPricing().catch((e) => {
      console.warn("[pricingSync] Periodic sync failed:", e?.message || e);
    });
  }, SYNC_INTERVAL_MS);
  if (typeof syncTimer.unref === "function") syncTimer.unref();
}

/**
 * Stop periodic sync (for testing/cleanup).
 */
export function stopPeriodicSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}
