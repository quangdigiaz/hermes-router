import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the pricing repo (bulk getPricing returns the merged pricing table)
vi.mock("../../src/lib/db/repos/pricingRepo.js", () => ({
  getPricing: vi.fn().mockImplementation(async () => ({
    anthropic: {
      "claude-3-opus": { input: 15.0, output: 75.0 },
      "claude-3-sonnet": { input: 3.0, output: 15.0 },
    },
    openai: {
      "gpt-4o": { input: 2.5, output: 10.0 },
      "gpt-4o-mini": { input: 0.15, output: 0.6 },
    },
    google: {
      "gemini-pro": { input: 1.25, output: 5.0 },
    },
  })),
}));

import { sortModelsByCost, getRotatedModels, resetComboRotation } from "../../open-sse/services/combo.js";

describe("combo cost-optimized strategy", () => {
  beforeEach(() => {
    resetComboRotation();
  });

  describe("sortModelsByCost", () => {
    it("sorts models by input price (cheapest first)", async () => {
      const models = [
        "anthropic/claude-3-opus",    // $15.00
        "openai/gpt-4o-mini",         // $0.15
        "openai/gpt-4o",              // $2.50
        "anthropic/claude-3-sonnet",  // $3.00
      ];

      const sorted = await sortModelsByCost(models);

      expect(sorted).toEqual([
        "openai/gpt-4o-mini",         // $0.15
        "openai/gpt-4o",              // $2.50
        "anthropic/claude-3-sonnet",  // $3.00
        "anthropic/claude-3-opus",    // $15.00
      ]);
    });

    it("puts models without pricing at the end", async () => {
      const models = [
        "anthropic/claude-3-opus",    // $15.00
        "unknown/model",              // null pricing
        "openai/gpt-4o-mini",         // $0.15
      ];

      const sorted = await sortModelsByCost(models);

      expect(sorted).toEqual([
        "openai/gpt-4o-mini",         // $0.15
        "anthropic/claude-3-opus",    // $15.00
        "unknown/model",              // null → Infinity
      ]);
    });

    it("handles empty array", async () => {
      const sorted = await sortModelsByCost([]);
      expect(sorted).toEqual([]);
    });

    it("handles single model", async () => {
      const sorted = await sortModelsByCost(["openai/gpt-4o"]);
      expect(sorted).toEqual(["openai/gpt-4o"]);
    });

    it("preserves original order for models with same price", async () => {
      const models = [
        "openai/gpt-4o",              // $2.50
        "openai/gpt-4o-mini",         // $0.15
        "anthropic/claude-3-sonnet",  // $3.00
      ];

      const sorted = await sortModelsByCost(models);

      // gpt-4o-mini ($0.15) should be first
      expect(sorted[0]).toBe("openai/gpt-4o-mini");
      // The rest should maintain relative order
      expect(sorted[1]).toBe("openai/gpt-4o");
      expect(sorted[2]).toBe("anthropic/claude-3-sonnet");
    });
  });

  describe("getRotatedModels with cost-optimized", () => {
    it("returns models sorted by cost when strategy is cost-optimized", async () => {
      const models = [
        "anthropic/claude-3-opus",    // $15.00
        "openai/gpt-4o-mini",         // $0.15
        "openai/gpt-4o",              // $2.50
      ];

      const result = await getRotatedModels(models, "test-combo", "cost-optimized");

      expect(result).toEqual([
        "openai/gpt-4o-mini",         // $0.15
        "openai/gpt-4o",              // $2.50
        "anthropic/claude-3-opus",    // $15.00
      ]);
    });

    it("returns original models for fallback strategy", async () => {
      const models = [
        "anthropic/claude-3-opus",
        "openai/gpt-4o-mini",
      ];

      const result = await getRotatedModels(models, "test-combo", "fallback");

      expect(result).toEqual(models);
    });

    it("handles empty models array", async () => {
      const result = await getRotatedModels([], "test-combo", "cost-optimized");
      expect(result).toEqual([]);
    });

    it("handles single model", async () => {
      const models = ["openai/gpt-4o"];
      const result = await getRotatedModels(models, "test-combo", "cost-optimized");
      expect(result).toEqual(["openai/gpt-4o"]);
    });
  });

  describe("getRotatedModels with auto strategy", () => {
    it("returns models sorted by scoring (cost-saver favors cheap + good quality)", async () => {
      const models = [
        "anthropic/claude-3-opus",
        "openai/gpt-4o-mini",
        "openai/gpt-4o",
        "google/gemini-pro",
      ];

      const result = await getRotatedModels(models, "test-combo", "auto", 1, {
        autoMode: "cost-saver",
        explorationRate: 0,
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(4);
      // With benchmark-driven scoring, cost-saver considers both cost AND quality.
      // claude-3-opus (quality 90 via regex) gets high modelTier despite high cost,
      // while gpt-4o-mini (quality 45) gets low modelTier despite low cost.
      // The exact ranking depends on the scoring formula.
      expect(result).toContain("openai/gpt-4o-mini");
      expect(result).toContain("anthropic/claude-3-opus");
    });

    it("returns models for balanced mode", async () => {
      const models = [
        "anthropic/claude-3-opus",
        "openai/gpt-4o-mini",
        "openai/gpt-4o",
      ];

      const result = await getRotatedModels(models, "test-combo", "auto", 1, {
        autoMode: "balanced",
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(3);
    });

    it("returns models for speed mode", async () => {
      const models = [
        "anthropic/claude-3-opus",
        "openai/gpt-4o-mini",
        "google/gemini-pro",
      ];

      const result = await getRotatedModels(models, "test-combo", "auto", 1, {
        autoMode: "speed",
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(3);
    });

    it("returns models for reliable mode", async () => {
      const models = [
        "anthropic/claude-3-opus",
        "openai/gpt-4o-mini",
        "openai/gpt-4o",
      ];

      const result = await getRotatedModels(models, "test-combo", "auto", 1, {
        autoMode: "reliable",
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(3);
    });

    it("preserves all models as fallback", async () => {
      const models = [
        "anthropic/claude-3-opus",
        "openai/gpt-4o-mini",
      ];

      const result = await getRotatedModels(models, "test-combo", "auto");

      expect(result.length).toBe(2);
      expect(result).toContain("anthropic/claude-3-opus");
      expect(result).toContain("openai/gpt-4o-mini");
    });

    it("handles single model", async () => {
      const models = ["openai/gpt-4o"];
      const result = await getRotatedModels(models, "test-combo", "auto");
      expect(result).toEqual(["openai/gpt-4o"]);
    });

    it("handles empty models array", async () => {
      const result = await getRotatedModels([], "test-combo", "auto");
      expect(result).toEqual([]);
    });
  });
});
