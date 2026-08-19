import { describe, expect, it } from "vitest";
import REGISTRY from "../../open-sse/providers/registry/index.js";
import { PROVIDERS, PROVIDER_MODELS } from "../../open-sse/providers/index.js";
import { ALIAS_TO_ID, AI_PROVIDERS, getAclProviderList, resolveProviderId } from "@/shared/constants/providers";
import { isProviderAllowed } from "@/sse/services/auth.js";

/**
 * Providers ported from OmniRoute in this batch. They are expected to be
 * simple OpenAI-compatible API-key providers with default executor.
 */
const PORTED_PROVIDER_IDS = [
  "ai21",
  "alibaba",
  "baseten",
  "bytez",
  "codestral",
  "databricks",
  "deepinfra",
  "friendliai",
  "galadriel",
  "gigachat",
  "heroku",
  "llamagate",
  "nanogpt",
  "nscale",
  "ovhcloud",
  "predibase",
  "publicai",
  "sambanova",
  "snowflake",
  "upstage",
  "volcengine",
  "wandb",
];

describe("SambaNova compatibility metadata", () => {
  const sambanova = REGISTRY.find((entry) => entry.id === "sambanova");

  it("preserves the visible alias and curated model catalog", () => {
    expect(sambanova.alias).toBe("samba");
    expect(sambanova.uiAlias).toBe("samba");
    expect(sambanova.models.map((model) => model.id)).toEqual([
      "MiniMax-M2.7",
      "DeepSeek-V3.2",
      "Llama-4-Maverick-17B-128E-Instruct",
      "Meta-Llama-3.3-70B-Instruct",
      "gpt-oss-120b",
    ]);
  });

  it("resolves the additive alias without hiding SambaNova from ACL", async () => {
    expect(sambanova.aliases).toEqual(["sambanova-ai"]);
    expect(sambanova.authModes).toEqual(["apikey"]);
    expect(resolveProviderId("sambanova-ai")).toBe("sambanova");
    expect(ALIAS_TO_ID["sambanova-ai"]).toBe("sambanova");
    expect(AI_PROVIDERS.sambanova.alias).toBe("samba");
    expect(getAclProviderList().some((provider) => provider.alias === "samba")).toBe(true);
    expect(await isProviderAllowed({ allowedProviders: ["sambanova-ai"] }, "sambanova-ai")).toBe(true);
  });
});

describe("OmniRoute-ported providers", () => {
  it("registers every ported provider exactly once", () => {
    const ids = REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const id of PORTED_PROVIDER_IDS) {
      const found = REGISTRY.find((e) => e.id === id);
      expect(found).toBeDefined();
    }
  });

  it("exposes required provider shape for every ported provider", () => {
    for (const id of PORTED_PROVIDER_IDS) {
      const entry = REGISTRY.find((e) => e.id === id);
      expect(entry.id, `${id}: id`).toBe(id);
      expect(entry.alias, `${id}: alias`).toBeTruthy();
      expect(entry.category, `${id}: category`).toBe("apikey");
      expect(entry.authType, `${id}: authType`).toBe("apikey");
      expect(entry.transport, `${id}: transport`).toBeDefined();
      expect(entry.transport.baseUrl, `${id}: transport.baseUrl`).toMatch(/^https:\/\//);
      // format may fall back to the global openai default at build time
      const effectiveFormat = entry.transport.format || PROVIDERS[id]?.format;
      expect(effectiveFormat, `${id}: effective format`).toBe("openai");
      expect(entry.models, `${id}: models`).toBeInstanceOf(Array);
      expect(entry.models.length, `${id}: models.length`).toBeGreaterThan(0);
    }
  });

  it("builds into runtime PROVIDERS map", () => {
    for (const id of PORTED_PROVIDER_IDS) {
      expect(PROVIDERS[id], `${id}: PROVIDERS[id]`).toBeDefined();
      expect(PROVIDERS[id].format, `${id}: PROVIDERS format`).toBe("openai");
      expect(PROVIDERS[id].baseUrl, `${id}: PROVIDERS baseUrl`).toMatch(/^https:\/\//);
    }
  });

  it("builds into runtime PROVIDER_MODELS map", () => {
    for (const id of PORTED_PROVIDER_IDS) {
      const alias = REGISTRY.find((e) => e.id === id)?.alias || id;
      const models = PROVIDER_MODELS[alias];
      expect(models, `${id}: PROVIDER_MODELS[${alias}]`).toBeInstanceOf(Array);
      expect(models.length, `${id}: model count`).toBeGreaterThan(0);

      const modelIds = models.map((m) => m.id);
      expect(new Set(modelIds).size, `${id}: unique model ids`).toBe(modelIds.length);
    }
  });

  it("does not duplicate model ids within a provider", () => {
    for (const id of PORTED_PROVIDER_IDS) {
      const entry = REGISTRY.find((e) => e.id === id);
      const ids = entry.models.map((m) => m.id);
      expect(new Set(ids).size, `${id}: registry model ids unique`).toBe(ids.length);
    }
  });
});
