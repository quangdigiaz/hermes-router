import { describe, it, expect } from "vitest";
import { PROVIDERS, PROVIDER_MODELS } from "../../open-sse/providers/index.js";
import { APIKEY_PROVIDERS } from "../../src/shared/constants/providers.js";
import { isFreeModel } from "../../open-sse/config/benchmarks.js";
import baiRegistry from "../../open-sse/providers/registry/bai.js";

describe("B.AI Provider Integration", () => {
  it("registers B.AI in open-sse PROVIDERS and PROVIDER_MODELS", () => {
    expect(PROVIDERS.bai).toBeDefined();
    expect(PROVIDERS.bai.baseUrl).toBe("https://api.b.ai/v1/chat/completions");
    expect(PROVIDERS.bai.transports).toBeDefined();
    expect(PROVIDERS.bai.transports.length).toBe(2);

    const openaiTransport = PROVIDERS.bai.transports.find((t) => t.format === "openai");
    const claudeTransport = PROVIDERS.bai.transports.find((t) => t.format === "claude");

    expect(openaiTransport.baseUrl).toBe("https://api.b.ai/v1/chat/completions");
    expect(claudeTransport.baseUrl).toBe("https://api.b.ai/v1/messages");

    expect(PROVIDER_MODELS.bai).toBeDefined();
    expect(PROVIDER_MODELS.bai.length).toBeGreaterThanOrEqual(40);
  });

  it("registers B.AI in APIKEY_PROVIDERS constant", () => {
    expect(APIKEY_PROVIDERS.bai).toBeDefined();
    expect(APIKEY_PROVIDERS.bai.name).toBe("B.AI");
    expect(APIKEY_PROVIDERS.bai.website).toBe("https://b.ai");
    expect(APIKEY_PROVIDERS.bai.color).toBe("#0066FF");
  });

  it("identifies free promotion models properly", () => {
    const dsFlash = baiRegistry.models.find((m) => m.id === "deepseek-v4-flash");
    const hy3 = baiRegistry.models.find((m) => m.id === "hy3");
    const paidModel = baiRegistry.models.find((m) => m.id === "claude-sonnet-5");

    expect(dsFlash).toBeDefined();
    expect(dsFlash.isFree).toBe(true);
    expect(dsFlash.tier).toBe("free");
    expect(isFreeModel("deepseek-v4-flash", "bai", null, dsFlash)).toBe(true);

    expect(hy3).toBeDefined();
    expect(hy3.isFree).toBe(true);
    expect(hy3.tier).toBe("free");
    expect(isFreeModel("hy3", "bai", null, hy3)).toBe(true);

    expect(paidModel).toBeDefined();
    expect(paidModel.isFree).toBeFalsy();
    expect(isFreeModel("claude-sonnet-5", "bai", null, paidModel)).toBe(false);
  });

  it("has live models fetcher and features enabled", () => {
    expect(baiRegistry.features.fetchModels).toBe(true);
    expect(baiRegistry.modelsFetcher.url).toBe("https://api.b.ai/v1/models");
    expect(baiRegistry.modelsFetcher.type).toBe("openai");
  });
});
