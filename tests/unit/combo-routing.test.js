import { describe, it, expect, beforeEach } from "vitest";

import { getRotatedModels, resetComboRotation } from "../../open-sse/services/combo.js";

describe("combo round-robin routing", () => {
  beforeEach(() => {
    resetComboRotation();
  });

  it("keeps existing one-request round-robin behavior by default", async () => {
    const models = ["provider/model-a", "provider/model-b"];

    const firstChoices = [];
    for (let i = 0; i < 4; i++) {
      const result = await getRotatedModels(models, "code-xhigh", "round-robin");
      firstChoices.push(result[0]);
    }

    expect(firstChoices).toEqual([
      "provider/model-a",
      "provider/model-b",
      "provider/model-a",
      "provider/model-b",
    ]);
  });

  it("sticks to each combo model for the configured number of requests", async () => {
    const models = ["provider/model-a", "provider/model-b"];

    const firstChoices = [];
    for (let i = 0; i < 6; i++) {
      const result = await getRotatedModels(models, "code-xhigh", "round-robin", 2);
      firstChoices.push(result[0]);
    }

    expect(firstChoices).toEqual([
      "provider/model-a",
      "provider/model-a",
      "provider/model-b",
      "provider/model-b",
      "provider/model-a",
      "provider/model-a",
    ]);
  });

  it("tracks sticky rotation independently per combo", async () => {
    const models = ["provider/model-a", "provider/model-b"];

    expect((await getRotatedModels(models, "code-high", "round-robin", 2))[0]).toBe("provider/model-a");
    expect((await getRotatedModels(models, "code-xhigh", "round-robin", 2))[0]).toBe("provider/model-a");
    expect((await getRotatedModels(models, "code-high", "round-robin", 2))[0]).toBe("provider/model-a");
    expect((await getRotatedModels(models, "code-high", "round-robin", 2))[0]).toBe("provider/model-b");
    expect((await getRotatedModels(models, "code-xhigh", "round-robin", 2))[0]).toBe("provider/model-a");
  });

  it("does not rotate fallback combos", async () => {
    const models = ["provider/model-a", "provider/model-b"];

    expect(await getRotatedModels(models, "code-xhigh", "fallback", 2)).toEqual(models);
    expect(await getRotatedModels(models, "code-xhigh", "fallback", 2)).toEqual(models);
  });
});
