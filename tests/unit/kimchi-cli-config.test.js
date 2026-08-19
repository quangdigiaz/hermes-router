import { describe, it, expect } from "vitest";

import { getModelUpstreamId } from "../../open-sse/config/providerModels.js";
import { getCapabilitiesForModel } from "../../open-sse/providers/capabilities.js";
import { stripUnsupportedParams } from "../../open-sse/translator/concerns/paramSupport.js";
import kimchiRegistry from "../../open-sse/providers/registry/kimchi.js";
import { DefaultExecutor } from "../../open-sse/executors/default.js";

// Aligned to the official Kimchi CLI catalog: https://models.dev/api.json (provider moonshotai)
describe("Kimchi CLI-aligned config", () => {
  it("supports API keys and browser-token OAuth without changing the API-key transport", () => {
    expect(kimchiRegistry.authType).toBe("apikey");
    expect(kimchiRegistry.authModes).toEqual(["apikey", "oauth"]);
    expect(kimchiRegistry.hasOAuth).toBe(true);
    expect(kimchiRegistry.transport.baseUrl).toBe("https://llm.kimchi.dev/openai/v1/chat/completions");
    expect(kimchiRegistry.transport.auth.apiKey).toEqual({
      header: "Authorization",
      scheme: "bearer",
      hooks: ["kimchiHeaders"],
    });
    expect(kimchiRegistry.transport.auth.oauth).toEqual(kimchiRegistry.transport.auth.apiKey);
    expect(kimchiRegistry.oauth).toMatchObject({
      webAppUrl: "https://app.kimchi.dev",
      validationUrl: "https://api.cast.ai/v1/llm/openai/supported-providers",
      userInfoUrl: "https://app.kimchi.dev/api/v1/me",
      modelsUrl: "https://llm.kimchi.dev/v1/models/metadata?include_in_cli=true",
    });
  });

  it("keeps User-Agent dynamic and out of static transport headers", () => {
    expect(kimchiRegistry.transport.headers["User-Agent"]).toBeUndefined();
    expect(new DefaultExecutor("kimchi").buildHeaders({ apiKey: "api-key" })["User-Agent"])
      .toMatch(/^kimchi\/\d+\.\d+\.\d+$/);
  });

  it("builds bearer headers for API-key and OAuth credentials", () => {
    const executor = new DefaultExecutor("kimchi");
    expect(executor.buildHeaders({ apiKey: "api-key" })["Authorization"]).toBe("Bearer api-key");
    expect(executor.buildHeaders({ accessToken: "oauth-token" })["Authorization"]).toBe("Bearer oauth-token");
  });

  describe("upstream model id", () => {
    it("keeps user-facing Kimi ids unchanged for upstream llm.kimchi.dev", () => {
      expect(getModelUpstreamId("kimchi", "kimi-k2.7")).toBe("kimi-k2.7");
    });
  });

  describe("capabilities", () => {
    it("kimi-k2.7 inherits kimi-k2.7-code caps from CLI", () => {
      const caps = getCapabilitiesForModel("kimchi", "kimi-k2.7");
      expect(caps.vision).toBe(true);
      expect(caps.videoInput).toBe(true);
      expect(caps.reasoning).toBe(true);
      expect(caps.thinkingFormat).toBe("kimi");
      expect(caps.thinkingCanDisable).toBe(false);
      expect(caps.contextWindow).toBe(262144);
      expect(caps.maxOutput).toBe(262144);
      expect(caps.structuredOutput).toBe(true);
      expect(caps.supportsTemperature).toBe(false);
    });

    it("deepseek-v4-flash matches CLI", () => {
      const caps = getCapabilitiesForModel("kimchi", "deepseek-v4-flash");
      expect(caps.vision).toBe(true);
      expect(caps.reasoning).toBe(true);
      expect(caps.thinkingFormat).toBe("deepseek");
      expect(caps.thinkingCanDisable).toBe(false);
      expect(caps.contextWindow).toBe(1000000);
      expect(caps.maxOutput).toBe(50000);
    });

    it("minimax-m3 matches CLI capabilities", () => {
      const caps = getCapabilitiesForModel("kimchi", "minimax-m3");
      expect(caps.vision).toBe(true);
      expect(caps.reasoning).toBe(true);
      expect(caps.thinkingFormat).toBe("minimax");
      expect(caps.contextWindow).toBe(1048576);
      expect(caps.maxOutput).toBe(512000);
    });

    it("nemotron-3-ultra-fp4 is non-reasoning", () => {
      const caps = getCapabilitiesForModel("kimchi", "nemotron-3-ultra-fp4");
      expect(caps.reasoning).toBe(false);
      expect(caps.contextWindow).toBe(128000);
      expect(caps.maxOutput).toBe(8192);
    });


  });

  describe("param stripping", () => {
    it("keeps temperature for deepseek-v4-flash", () => {
      const body = { temperature: 0.7, messages: [] };
      stripUnsupportedParams("kimchi", "deepseek-v4-flash", body);
      expect(body.temperature).toBe(0.7);
    });

    it("drops temperature for kimi-k2.7 (CLI temperature:false)", () => {
      const body = { temperature: 0.7, messages: [] };
      stripUnsupportedParams("kimchi", "kimi-k2.7", body);
      expect(body.temperature).toBeUndefined();
    });

    it("still drops non-temperature sampling knobs for all Kimchi models", () => {
      const body = { top_p: 0.9, presence_penalty: 0.5, frequency_penalty: 0.5, messages: [] };
      stripUnsupportedParams("kimchi", "deepseek-v4-flash", body);
      expect(body.top_p).toBeUndefined();
      expect(body.presence_penalty).toBeUndefined();
      expect(body.frequency_penalty).toBeUndefined();
    });
  });
});
