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

  it("ensures generic built-in templates exclude freebuff provider", () => {
    for (const [key, template] of Object.entries(AUTO_TEMPLATES)) {
      if (key.startsWith("freebuff/")) continue;
      if (Array.isArray(template.seedModels)) {
        for (const model of template.seedModels) {
          expect(model.startsWith("freebuff/"), `Template ${key} contains freebuff model ${model}`).toBe(false);
        }
      }
      if (Array.isArray(template.models)) {
        for (const model of template.models) {
          expect(model.startsWith("freebuff/"), `Template ${key} contains freebuff model ${model}`).toBe(false);
        }
      }
    }
  });

  it("ensures dedicated freebuff family combos are properly defined", () => {
    expect(AUTO_TEMPLATES["freebuff/deepseek"]).toBeDefined();
    expect(AUTO_TEMPLATES["freebuff/kimi"]).toBeDefined();
    expect(AUTO_TEMPLATES["freebuff/minimax"]).toBeDefined();
    expect(AUTO_TEMPLATES["freebuff/best"]).toBeDefined();

    for (const key of ["freebuff/deepseek", "freebuff/kimi", "freebuff/minimax", "freebuff/best"]) {
      const t = AUTO_TEMPLATES[key];
      expect(t.sessionAffinity).toBe(true);
      expect(t.models.every((m) => m.startsWith("freebuff/"))).toBe(true);
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
