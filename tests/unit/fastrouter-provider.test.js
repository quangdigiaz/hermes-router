import { describe, it, expect } from "vitest";
import fastrouter from "../../open-sse/providers/registry/fastrouter.js";
import REGISTRY from "../../open-sse/providers/registry/index.js";
import { getProviderIconSrc } from "../../src/shared/utils/providerIcon.js";
import {
  isFreeModel,
  getModelLimits,
  getBenchmarkForModel,
  getPromoPriceSync,
} from "../../open-sse/config/benchmarks.js";

describe("FastRouter Provider Registry & Integration", () => {
  it("exports valid fastrouter provider definition", () => {
    expect(fastrouter.id).toBe("fastrouter");
    expect(fastrouter.display.name).toBe("FastRouter");
    expect(fastrouter.display.color).toBe("#2E52E5");
    expect(fastrouter.transport.baseUrl).toBe("https://api.fastrouter.ai/api/v1/chat/completions");
    expect(fastrouter.hasFree).toBe(true);
    expect(fastrouter.passthroughModels).toBe(true);
    expect(Array.isArray(fastrouter.models)).toBe(true);
    expect(fastrouter.models.length).toBeGreaterThan(15);
  });

  it("is registered in REGISTRY index", () => {
    const found = REGISTRY.find((p) => p.id === "fastrouter");
    expect(found).toBeDefined();
    expect(found.transport.baseUrl).toContain("api.fastrouter.ai");
  });

  it("resolves FastRouter SVG icon correctly", () => {
    const iconSrc = getProviderIconSrc("fastrouter");
    expect(iconSrc).toBe("/providers/fastrouter.svg");
  });

  it("detects free models with :free suffix", () => {
    expect(isFreeModel("openai/gpt-oss-120b:free", "fastrouter")).toBe(true);
    expect(isFreeModel("openai/gpt-oss-20b:free", "fastrouter")).toBe(true);
    expect(isFreeModel("google/gemma4-26b:free", "fastrouter")).toBe(true);
    expect(isFreeModel("nvidia/nemotron-3-nano-30b:free", "fastrouter")).toBe(true);
    expect(isFreeModel("nvidia/nemotron-3-super:free", "fastrouter")).toBe(true);
    expect(isFreeModel("sarvam/sarvam-105b:free", "fastrouter")).toBe(true);

    // Paid models are not free
    expect(isFreeModel("openai/gpt-5.6-sol", "fastrouter")).toBe(false);
    expect(isFreeModel("anthropic/claude-sonnet-5", "fastrouter")).toBe(false);
  });

  it("provides correct limits for FastRouter models", () => {
    const gptOssLimits = getModelLimits("gpt-oss-120b");
    expect(gptOssLimits.maxContext).toBe(131072);
    expect(gptOssLimits.vision).toBe(false);

    const nemoLimits = getModelLimits("nemotron-3-super");
    expect(nemoLimits.maxContext).toBe(131072);
  });

  it("provides benchmark quality for FastRouter models", () => {
    const gptOss = getBenchmarkForModel("gpt-oss-120b");
    expect(gptOss).toBeDefined();
    expect(gptOss.quality).toBe(78);

    const nemo = getBenchmarkForModel("nemotron-3-super");
    expect(nemo).toBeDefined();
    expect(nemo.quality).toBe(80);
  });

  it("resolves promo prices for free models to 0", () => {
    const promo = getPromoPriceSync("gpt-oss-120b:free");
    expect(promo).toBeDefined();
    expect(promo.promoInput).toBe(0);
  });
});
