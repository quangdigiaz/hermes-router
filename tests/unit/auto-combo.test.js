import { describe, it, expect } from "vitest";
import {
  healthScore,
  costInvScore,
  latencyInvScore,
  modelTierScore,
  scoreCandidate,
  scorePool,
  selectProvider,
  DEFAULT_WEIGHTS,
  MODE_PACKS,
} from "../../open-sse/services/autoCombo.js";

describe("autoCombo", () => {
  // ─── healthScore ────────────────────────────────────────────────────────

  describe("healthScore", () => {
    it("returns 1.0 for CLOSED", () => {
      expect(healthScore("CLOSED")).toBe(1.0);
    });

    it("returns 0.5 for HALF_OPEN", () => {
      expect(healthScore("HALF_OPEN")).toBe(0.5);
    });

    it("returns 0.0 for OPEN", () => {
      expect(healthScore("OPEN")).toBe(0.0);
    });

    it("returns 0.0 for unknown state", () => {
      expect(healthScore("UNKNOWN")).toBe(0.0);
      expect(healthScore(null)).toBe(0.0);
      expect(healthScore(undefined)).toBe(0.0);
    });
  });

  // ─── costInvScore ───────────────────────────────────────────────────────

  describe("costInvScore", () => {
    it("returns higher score for cheaper cost", () => {
      expect(costInvScore(1, 10)).toBeGreaterThan(costInvScore(5, 10));
    });

    it("returns ~1.0 for zero cost", () => {
      expect(costInvScore(0, 10)).toBe(1.0);
    });

    it("returns ~0.0 for max cost", () => {
      expect(costInvScore(10, 10)).toBeCloseTo(0.0, 1);
    });

    it("returns 0.5 when maxCost is zero", () => {
      expect(costInvScore(5, 0)).toBe(0.5);
    });

    it("returns 0.5 when cost is null/undefined", () => {
      expect(costInvScore(null, 10)).toBe(0.5);
      expect(costInvScore(undefined, 10)).toBe(0.5);
    });
  });

  // ─── latencyInvScore ────────────────────────────────────────────────────

  describe("latencyInvScore", () => {
    it("returns higher score for lower latency", () => {
      expect(latencyInvScore(100, 1000)).toBeGreaterThan(latencyInvScore(500, 1000));
    });

    it("returns ~1.0 for very low latency", () => {
      expect(latencyInvScore(1, 1000)).toBeCloseTo(1.0, 1);
    });

    it("returns ~0.0 for max latency", () => {
      expect(latencyInvScore(1000, 1000)).toBeCloseTo(0.0, 1);
    });

    it("returns 0.5 when maxLatency is zero", () => {
      expect(latencyInvScore(100, 0)).toBe(0.5);
    });

    it("returns 0.5 when p95 is null/undefined", () => {
      expect(latencyInvScore(null, 1000)).toBe(0.5);
      expect(latencyInvScore(undefined, 1000)).toBe(0.5);
    });
  });

  // ─── modelTierScore ─────────────────────────────────────────────────────

  describe("modelTierScore", () => {
    it("returns benchmark-driven scores for known models", () => {
      // claude-opus-5 has benchmark quality 95 → 0.95
      expect(modelTierScore("claude-opus-5")).toBe(0.95);
      // gpt-5.6-sol has benchmark quality 92 → 0.92
      expect(modelTierScore("gpt-5.6-sol")).toBe(0.92);
      // claude-sonnet-5 has benchmark quality 85 → 0.85
      expect(modelTierScore("claude-sonnet-5")).toBe(0.85);
    });

    it("returns regex fallback scores for unknown models", () => {
      // "opus" matches regex → quality 90 → 0.9
      expect(modelTierScore("claude-opus-4-6")).toBe(0.9);
      // "gpt-5" matches regex → quality 80 → 0.8
      expect(modelTierScore("gpt-5.6-terra")).toBe(0.8);
      // "sonnet" matches regex → quality 70 → 0.7
      expect(modelTierScore("claude-sonnet-4-6")).toBe(0.7);
    });

    it("returns 0.7 for standard models with benchmark", () => {
      // gpt-4o has benchmark quality 70 → 0.7
      expect(modelTierScore("gpt-4o")).toBe(0.7);
      // deepseek-v3: no benchmark, no regex match → 0.5
      expect(modelTierScore("deepseek-v3")).toBe(0.5);
    });

    it("returns 0.4 for budget models", () => {
      // gpt-4o-mini has benchmark quality 45 → 0.45
      expect(modelTierScore("gpt-4o-mini")).toBe(0.45);
      // "flash" matches regex → quality 45 → 0.45
      expect(modelTierScore("gemini-flash")).toBe(0.45);
      // deepseek-chat has benchmark quality 40 → 0.4
      expect(modelTierScore("deepseek-chat")).toBe(0.4);
    });

    it("returns 0.5 for unknown models", () => {
      expect(modelTierScore("unknown-model")).toBe(0.5);
    });

    it("returns 0.5 for null/undefined", () => {
      expect(modelTierScore(null)).toBe(0.5);
      expect(modelTierScore(undefined)).toBe(0.5);
    });
  });

  // ─── scoreCandidate ─────────────────────────────────────────────────────

  describe("scoreCandidate", () => {
    const poolMaxima = { maxCost: 10, maxLatency: 1000 };

    it("returns high score for healthy, cheap, fast model", () => {
      const candidate = {
        model: "gpt-4o-mini",
        health: "CLOSED",
        cost: 1,
        p95: 100,
      };
      const result = scoreCandidate(candidate, poolMaxima);
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.factors.health).toBe(1.0);
    });

    it("returns low score for unhealthy, expensive, slow model", () => {
      const candidate = {
        model: "unknown-model",
        health: "OPEN",
        cost: 10,
        p95: 1000,
      };
      const result = scoreCandidate(candidate, poolMaxima);
      expect(result.score).toBeLessThan(0.2);
      expect(result.factors.health).toBe(0.0);
    });

    it("applies custom weights", () => {
      const candidate = {
        model: "gpt-4o",
        health: "CLOSED",
        cost: 1,
        p95: 100,
      };
      const weights = { health: 1.0, costInv: 0, latencyInv: 0, modelTier: 0 };
      const result = scoreCandidate(candidate, poolMaxima, weights);
      expect(result.score).toBe(1.0);
    });
  });

  // ─── scorePool ──────────────────────────────────────────────────────────

  describe("scorePool", () => {
    const candidates = [
      { model: "gpt-4o-mini", health: "CLOSED", cost: 1, p95: 100 },
      { model: "claude-opus-4-6", health: "CLOSED", cost: 10, p95: 500 },
      { model: "unknown-down", health: "OPEN", cost: 5, p95: 300 },
    ];

    it("returns sorted by score descending", () => {
      const scored = scorePool(candidates);
      expect(scored.length).toBe(3);
      expect(scored[0].score).toBeGreaterThanOrEqual(scored[1].score);
      expect(scored[1].score).toBeGreaterThanOrEqual(scored[2].score);
    });

    it("returns empty array for empty input", () => {
      expect(scorePool([])).toEqual([]);
      expect(scorePool(null)).toEqual([]);
    });

    it("respects mode pack", () => {
      const scoredBalanced = scorePool(candidates, { mode: "balanced" });
      const scoredCostSaver = scorePool(candidates, { mode: "cost-saver" });
      // Cost saver should rank cheap model higher
      expect(scoredCostSaver[0].model).toBe("gpt-4o-mini");
    });

    it("includes factor breakdown", () => {
      const scored = scorePool(candidates);
      expect(scored[0].factors).toBeDefined();
      expect(scored[0].factors.health).toBeDefined();
      expect(scored[0].factors.costInv).toBeDefined();
      expect(scored[0].factors.latencyInv).toBeDefined();
      expect(scored[0].factors.modelTier).toBeDefined();
    });
  });

  // ─── selectProvider ─────────────────────────────────────────────────────

  describe("selectProvider", () => {
    const candidates = [
      { model: "gpt-4o-mini", health: "CLOSED", cost: 1, p95: 100 },
      { model: "claude-opus-4-6", health: "CLOSED", cost: 10, p95: 500 },
      { model: "unknown-down", health: "OPEN", cost: 5, p95: 300 },
    ];

    it("selects a candidate", () => {
      const selected = selectProvider(candidates, { explorationRate: 0 });
      expect(selected).toBeDefined();
      expect(selected.model).toBeDefined();
    });

    it("filters out OPEN circuit breaker", () => {
      // Run multiple times to ensure OPEN is never selected
      for (let i = 0; i < 20; i++) {
        const selected = selectProvider(candidates, { explorationRate: 0 });
        expect(selected.health).not.toBe("OPEN");
      }
    });

    it("returns null when all candidates are OPEN", () => {
      const allDown = [
        { model: "a", health: "OPEN", cost: 1, p95: 100 },
        { model: "b", health: "OPEN", cost: 2, p95: 200 },
      ];
      expect(selectProvider(allDown)).toBeNull();
    });

    it("returns null for empty input", () => {
      expect(selectProvider([])).toBeNull();
      expect(selectProvider(null)).toBeNull();
    });

    it("uses balanced mode by default", () => {
      const selected = selectProvider(candidates, { explorationRate: 0 });
      // Should pick reasonable default
      expect(selected).toBeDefined();
    });

    it("respects cost-saver mode", () => {
      const selected = selectProvider(candidates, {
        mode: "cost-saver",
        explorationRate: 0,
      });
      expect(selected.model).toBe("gpt-4o-mini");
    });

    it("respects speed mode", () => {
      const selected = selectProvider(candidates, {
        mode: "speed",
        explorationRate: 0,
      });
      expect(selected.model).toBe("gpt-4o-mini");
    });
  });

  // ─── MODE_PACKS ─────────────────────────────────────────────────────────

  describe("MODE_PACKS", () => {
    it("has balanced, cost-saver, speed, reliable", () => {
      expect(MODE_PACKS.balanced).toBeDefined();
      expect(MODE_PACKS["cost-saver"]).toBeDefined();
      expect(MODE_PACKS.speed).toBeDefined();
      expect(MODE_PACKS.reliable).toBeDefined();
    });

    it("weights sum to ~1.0", () => {
      for (const [name, weights] of Object.entries(MODE_PACKS)) {
        const sum = Object.values(weights).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 2);
      }
    });
  });
});
