import { describe, it, expect } from "vitest";
import { PROVIDERS } from "../../open-sse/providers/index.js";
import llm7Registry from "../../open-sse/providers/registry/llm7.js";

describe("LLM7 Provider Configuration", () => {
  it("registers llm7 provider with correct endpoints and metadata", () => {
    expect(PROVIDERS.llm7).toBeDefined();
    expect(PROVIDERS.llm7.baseUrl).toBe("https://api.llm7.io/v1/chat/completions");
    expect(llm7Registry.hasFree).toBe(true);
    expect(llm7Registry.display.website).toBe("https://llm7.io/?r=1Tg");
    expect(llm7Registry.display.notice.apiKeyUrl).toBe("https://llm7.io/?r=1Tg");
    expect(llm7Registry.modelsFetcher.url).toBe("https://api.llm7.io/v1/models");
    expect(llm7Registry.models.length).toBeGreaterThan(30);
  });

  it("classifies free vs pro tier models correctly", () => {
    const freeModels = llm7Registry.models.filter((m) => m.isFree || m.free);
    const proModels = llm7Registry.models.filter((m) => !m.isFree && !m.free);

    expect(freeModels.length).toBeGreaterThan(0);
    expect(proModels.length).toBeGreaterThan(0);

    // DeepSeek V4 Flash is on free/turbo tier
    const dsFlash = freeModels.find((m) => m.id.includes("DeepSeek-V4-Flash"));
    expect(dsFlash).toBeDefined();
  });
});