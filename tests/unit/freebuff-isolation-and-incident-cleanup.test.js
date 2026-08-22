import { describe, it, expect } from "vitest";
import { AUTO_TEMPLATES } from "../../open-sse/config/autoTemplates.js";
import { __test__ as freebuffTest } from "../../open-sse/executors/freebuff.js";
import { invalidateHubStatusCache } from "../../src/app/api/hub/status/route.js";

describe("Freebuff Isolation & Auto-Combo Safeguards", () => {
  it("ensures family/deepseek template does not contain freebuff models", () => {
    const deepseekTemplate = AUTO_TEMPLATES["family/deepseek"];
    expect(deepseekTemplate).toBeDefined();
    expect(deepseekTemplate.seedModels).not.toContain("freebuff/deepseek-v4-flash");
    expect(deepseekTemplate.seedModels).toContain("deepseek/deepseek-v4-flash");
  });

  it("ensures all built-in auto templates exclude freebuff provider", () => {
    for (const [key, template] of Object.entries(AUTO_TEMPLATES)) {
      if (Array.isArray(template.seedModels)) {
        for (const model of template.seedModels) {
          expect(model.startsWith("freebuff/"), `Template ${key} contains freebuff model ${model}`).toBe(false);
        }
      }
    }
  });

  it("resolves root agent ID for freebuff models including dynamic mappings", () => {
    const { rootAgentIdForModel } = freebuffTest;
    expect(rootAgentIdForModel("mimo/mimo-v2.5")).toBe("base2-free");
    expect(rootAgentIdForModel("deepseek/deepseek-v4-pro")).toBe("base2-free-deepseek");
    expect(rootAgentIdForModel("moonshotai/kimi-k2.6")).toBe("base2-free-kimi");
    expect(rootAgentIdForModel("unknown/model")).toBe("base2-free");
  });

  it("invalidates hub status cache properly without throwing", () => {
    expect(() => invalidateHubStatusCache()).not.toThrow();
  });
});
