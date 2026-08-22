import { describe, expect, it } from "vitest";
import REGISTRY from "../../open-sse/providers/registry/index.js";
import { PROVIDERS, PROVIDER_MODELS } from "../../open-sse/providers/index.js";
import { ALIAS_TO_ID, AI_PROVIDERS, getAclProviderList, resolveProviderId } from "@/shared/constants/providers";
import { isProviderAllowed } from "@/sse/services/auth.js";

/**
 * Providers ported from OmniRoute in this batch. They are expected to be
 * simple OpenAI-compatible API-key providers with default executor.
 *
 * NOTE (2026-08-22): pruned ids whose registry files never existed on disk
 * (ai21, alibaba, baseten, bytez, codestral, databricks, friendliai,
 * galadriel, gigachat, nanogpt, predibase, publicai, wandb; heroku pruned
 * 2026-08-22 — registry file missing on disk) — the shipped
 * list was aspirational, not factual.
 */
const PORTED_PROVIDER_IDS = [
  "volcengine",
];

const REMOVED_PROVIDER_IDS = ["deepinfra", "heroku", "llamagate", "hyperbolic", "morph", "ovhcloud", "nscale", "nebius", "perplexity", "perplexity-web", "siliconflow", "venice", "upstage", "together", "tencent", "snowflake", "sambanova"];

describe("OmniRoute-ported providers", () => {
  it("does not register removed providers", () => {
    for (const id of REMOVED_PROVIDER_IDS) {
      expect(REGISTRY.find((e) => e.id === id), `${id} should be removed`).toBeUndefined();
    }
  });

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
