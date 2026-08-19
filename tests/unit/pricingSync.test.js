import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the kv store
vi.mock("../../src/lib/db/helpers/kvStore.js", () => ({
  makeKv: () => ({
    get: vi.fn().mockResolvedValue(null),
    getAll: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    setMany: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("pricingSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("transformEntry", () => {
    it("transforms per-token pricing to $/1M tokens", async () => {
      const { transformEntry } = await import("../../src/sse/services/pricingSync.js");

      const entry = {
        input_cost_per_token: 0.0000025,
        output_cost_per_token: 0.00001,
      };

      const result = transformEntry(entry);
      expect(result).toEqual({
        input: 2.5,
        output: 10,
      });
    });

    it("returns null for entries with no pricing", async () => {
      const { transformEntry } = await import("../../src/sse/services/pricingSync.js");

      expect(transformEntry(null)).toBeNull();
      expect(transformEntry({})).toBeNull();
      expect(transformEntry({ error: "not found" })).toBeNull();
    });

    it("handles cached pricing", async () => {
      const { transformEntry } = await import("../../src/sse/services/pricingSync.js");

      const entry = {
        input_cost_per_token: 0.0000025,
        output_cost_per_token: 0.00001,
        cache_read_input_token_cost: 0.00000025,
        cache_creation_input_token_cost: 0.000003125,
      };

      const result = transformEntry(entry);
      expect(result).toEqual({
        input: 2.5,
        output: 10,
        cached: 0.25,
        cache_creation: 3.125,
      });
    });
  });

  describe("syncPricing", () => {
    it("fetches and transforms LiteLLM data", async () => {
      const mockData = {
        "openai/gpt-4o": {
          input_cost_per_token: 0.0000025,
          output_cost_per_token: 0.00001,
          litellm_provider: "openai",
        },
        "anthropic/claude-3-opus": {
          input_cost_per_token: 0.000015,
          output_cost_per_token: 0.000075,
          litellm_provider: "anthropic",
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const { syncPricing } = await import("../../src/sse/services/pricingSync.js");
      const result = await syncPricing();

      expect(result.count).toBe(2);
      expect(result.duration).toBeGreaterThan(0);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("litellm"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": "hermes-router/pricing-sync",
          }),
        })
      );
    });

    it("handles fetch errors gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { syncPricing } = await import("../../src/sse/services/pricingSync.js");
      await expect(syncPricing()).rejects.toThrow("LiteLLM fetch failed: 500");
    });
  });
});
