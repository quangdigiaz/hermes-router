import { describe, it, expect, beforeEach } from "vitest";
import {
  recordLatency,
  getP95Latency,
  getSampleCount,
  clearLatencyData,
  getTrackedKeys,
  DEFAULT_P95_MS,
} from "../../open-sse/services/usage/latencyTracker.js";

describe("latencyTracker", () => {
  beforeEach(() => {
    clearLatencyData();
  });

  // ─── recordLatency ──────────────────────────────────────────────────────

  describe("recordLatency", () => {
    it("records a latency sample", () => {
      recordLatency("openai", "gpt-4o", 2500);
      expect(getSampleCount("openai", "gpt-4o")).toBe(1);
    });

    it("records multiple samples", () => {
      recordLatency("openai", "gpt-4o", 2500);
      recordLatency("openai", "gpt-4o", 3000);
      recordLatency("openai", "gpt-4o", 2000);
      expect(getSampleCount("openai", "gpt-4o")).toBe(3);
    });

    it("ignores invalid provider", () => {
      recordLatency(null, "gpt-4o", 2500);
      recordLatency("", "gpt-4o", 2500);
      expect(getSampleCount("openai", "gpt-4o")).toBe(0);
    });

    it("ignores invalid model", () => {
      recordLatency("openai", null, 2500);
      recordLatency("openai", "", 2500);
      expect(getSampleCount("openai", "gpt-4o")).toBe(0);
    });

    it("ignores invalid latency", () => {
      recordLatency("openai", "gpt-4o", NaN);
      recordLatency("openai", "gpt-4o", Infinity);
      recordLatency("openai", "gpt-4o", -100);
      expect(getSampleCount("openai", "gpt-4o")).toBe(0);
    });

    it("separates by provider/model key", () => {
      recordLatency("openai", "gpt-4o", 2500);
      recordLatency("openai", "gpt-4o-mini", 1500);
      recordLatency("anthropic", "claude-3-opus", 5000);
      expect(getSampleCount("openai", "gpt-4o")).toBe(1);
      expect(getSampleCount("openai", "gpt-4o-mini")).toBe(1);
      expect(getSampleCount("anthropic", "claude-3-opus")).toBe(1);
    });
  });

  // ─── getP95Latency ─────────────────────────────────────────────────────

  describe("getP95Latency", () => {
    it("returns default when no data", () => {
      expect(getP95Latency("openai", "gpt-4o")).toBe(DEFAULT_P95_MS["gpt-4o"]);
    });

    it("returns default when < 10 samples", () => {
      for (let i = 0; i < 5; i++) {
        recordLatency("openai", "gpt-4o", 2000 + i * 100);
      }
      expect(getP95Latency("openai", "gpt-4o")).toBe(DEFAULT_P95_MS["gpt-4o"]);
    });

    it("calculates p95 with 10+ samples", () => {
      // 20 samples: 1000ms × 19, 10000ms × 1 (outlier)
      for (let i = 0; i < 19; i++) {
        recordLatency("openai", "gpt-4o", 1000);
      }
      recordLatency("openai", "gpt-4o", 10000);

      const p95 = getP95Latency("openai", "gpt-4o");
      // p95 should be close to 1000ms (the outlier is at 95th percentile)
      expect(p95).toBeGreaterThanOrEqual(1000);
      expect(p95).toBeLessThanOrEqual(10000);
    });

    it("returns correct default for different models", () => {
      expect(getP95Latency("anthropic", "claude-3-opus")).toBe(DEFAULT_P95_MS.opus);
      expect(getP95Latency("openai", "gpt-4o-mini")).toBe(DEFAULT_P95_MS.mini);
      expect(getP95Latency("google", "gemini-flash")).toBe(DEFAULT_P95_MS.flash);
      expect(getP95Latency("anthropic", "claude-3-haiku")).toBe(DEFAULT_P95_MS.haiku);
    });

    it("returns default for unknown model", () => {
      expect(getP95Latency("unknown", "unknown-model")).toBe(DEFAULT_P95_MS.default);
    });

    it("returns default for null provider/model", () => {
      expect(getP95Latency(null, "gpt-4o")).toBe(DEFAULT_P95_MS.default);
      expect(getP95Latency("openai", null)).toBe(DEFAULT_P95_MS.default);
    });
  });

  // ─── getSampleCount ─────────────────────────────────────────────────────

  describe("getSampleCount", () => {
    it("returns 0 for unknown key", () => {
      expect(getSampleCount("openai", "gpt-4o")).toBe(0);
    });

    it("returns correct count", () => {
      recordLatency("openai", "gpt-4o", 2500);
      recordLatency("openai", "gpt-4o", 3000);
      expect(getSampleCount("openai", "gpt-4o")).toBe(2);
    });
  });

  // ─── clearLatencyData ──────────────────────────────────────────────────

  describe("clearLatencyData", () => {
    it("clears all data", () => {
      recordLatency("openai", "gpt-4o", 2500);
      recordLatency("anthropic", "claude-3-opus", 5000);
      clearLatencyData();
      expect(getSampleCount("openai", "gpt-4o")).toBe(0);
      expect(getSampleCount("anthropic", "claude-3-opus")).toBe(0);
    });
  });

  // ─── getTrackedKeys ────────────────────────────────────────────────────

  describe("getTrackedKeys", () => {
    it("returns empty array when no data", () => {
      expect(getTrackedKeys()).toEqual([]);
    });

    it("returns all tracked keys", () => {
      recordLatency("openai", "gpt-4o", 2500);
      recordLatency("anthropic", "claude-3-opus", 5000);
      const keys = getTrackedKeys();
      expect(keys).toContain("openai/gpt-4o");
      expect(keys).toContain("anthropic/claude-3-opus");
    });
  });

  // ─── DEFAULT_P95_MS ────────────────────────────────────────────────────

  describe("DEFAULT_P95_MS", () => {
    it("has default value", () => {
      expect(DEFAULT_P95_MS.default).toBe(3000);
    });

    it("has values for common models", () => {
      expect(DEFAULT_P95_MS.opus).toBeDefined();
      expect(DEFAULT_P95_MS.mini).toBeDefined();
      expect(DEFAULT_P95_MS.flash).toBeDefined();
      expect(DEFAULT_P95_MS.haiku).toBeDefined();
      expect(DEFAULT_P95_MS["gpt-4o"]).toBeDefined();
    });
  });

  // ─── Ring buffer overflow ──────────────────────────────────────────────

  describe("ring buffer overflow", () => {
    it("overwrites oldest samples when buffer is full", () => {
      // Buffer capacity is 100, add 110 samples
      for (let i = 0; i < 110; i++) {
        recordLatency("openai", "gpt-4o", 1000 + i);
      }
      // Should only keep 100 samples
      expect(getSampleCount("openai", "gpt-4o")).toBe(100);
    });
  });
});
