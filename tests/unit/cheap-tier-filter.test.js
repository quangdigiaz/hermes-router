import { describe, it, expect } from "vitest";
import { getCurationData, CURATION_DATA } from "../../open-sse/providers/curation.js";

describe("Cheap / Budget Tier Classification", () => {
  it("marks budget providers with cheap badge", () => {
    const llm7 = getCurationData("llm7");
    expect(llm7.badges).toContain("cheap");

    const zenmux = getCurationData("zenmux");
    expect(zenmux.badges).toContain("cheap");

    const deepseek = getCurationData("deepseek");
    expect(deepseek.badges).toContain("cheap");

    const bai = getCurationData("bai");
    expect(bai.badges).toContain("cheap");
  });
});