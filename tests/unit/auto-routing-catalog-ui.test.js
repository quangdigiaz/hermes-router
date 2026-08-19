import { describe, it, expect } from "vitest";
import { AUTO_TEMPLATES } from "../../open-sse/config/autoTemplates.js";
import { buildModelsList } from "../../src/sse/services/allowedModels.js";

describe("Auto-routing Catalog & Built-in Combos UI Integration", () => {
  it("contains all 17 built-in templates with required metadata", () => {
    const keys = Object.keys(AUTO_TEMPLATES);
    expect(keys.length).toBe(17);

    // Standard Auto (6)
    expect(keys).toContain("auto/best");
    expect(keys).toContain("auto/cheapest");
    expect(keys).toContain("auto/fastest");
    expect(keys).toContain("auto/reliable");
    expect(keys).toContain("auto/value");
    expect(keys).toContain("auto/best-free");

    // Model Family (6)
    expect(keys).toContain("family/deepseek");
    expect(keys).toContain("family/gemini");
    expect(keys).toContain("family/qwen");
    expect(keys).toContain("family/claude");
    expect(keys).toContain("family/mimo");
    expect(keys).toContain("family/gpt");

    // Agent (2)
    expect(keys).toContain("agent/workhorse");
    expect(keys).toContain("agent/deep-think");

    // SEO (1)
    expect(keys).toContain("seo/vietnamese");

    // Vision (2)
    expect(keys).toContain("vision/fast-cheap");
    expect(keys).toContain("vision/pro");
  });

  it("Model Family templates have family property configured", () => {
    expect(AUTO_TEMPLATES["family/deepseek"].family).toBe("deepseek");
    expect(AUTO_TEMPLATES["family/gemini"].family).toBe("gemini");
    expect(AUTO_TEMPLATES["family/qwen"].family).toBe("qwen");
    expect(AUTO_TEMPLATES["family/claude"].family).toBe("claude");
    expect(AUTO_TEMPLATES["family/mimo"].family).toBe("mimo");
    expect(AUTO_TEMPLATES["family/gpt"].family).toBe("gpt");
  });

  it("agent/workhorse has session affinity and tools enabled", () => {
    const tmpl = AUTO_TEMPLATES["agent/workhorse"];
    expect(tmpl.sessionAffinity).toBe(true);
    expect(tmpl.requiresTools).toBe(true);
    expect(tmpl.mode).toBe("value");
    expect(Array.isArray(tmpl.models)).toBe(true);
    expect(tmpl.models.length).toBeGreaterThanOrEqual(4);
  });

  it("vision combos require vision modality", () => {
    expect(AUTO_TEMPLATES["vision/fast-cheap"].requiresVision).toBe(true);
    expect(AUTO_TEMPLATES["vision/pro"].requiresVision).toBe(true);
  });

  it("exposes built-in templates in buildModelsList catalog", async () => {
    const models = await buildModelsList(["llm"], { skipDynamicFetch: true });
    const modelIds = models.map((m) => m.id);

    expect(modelIds).toContain("auto/best");
    expect(modelIds).toContain("family/deepseek");
    expect(modelIds).toContain("family/mimo");
    expect(modelIds).toContain("agent/workhorse");
    expect(modelIds).toContain("seo/vietnamese");
    expect(modelIds).toContain("vision/fast-cheap");
  });
});
