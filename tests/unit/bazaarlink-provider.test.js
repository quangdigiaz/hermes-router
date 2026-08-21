import { describe, it, expect, vi } from "vitest";
import { PROVIDERS } from "../../open-sse/providers/index.js";
import bazaarlinkRegistry from "../../open-sse/providers/registry/bazaarlink.js";
import { getCurationData } from "../../open-sse/providers/curation.js";
import { getBazaarLinkUsage } from "../../open-sse/services/usage/misc.js";
import * as proxyFetchModule from "../../open-sse/utils/proxyFetch.js";

describe("BazaarLink Provider Integration", () => {
  it("registers bazaarlink with correct baseUrls from skill.md", () => {
    expect(PROVIDERS.bazaarlink).toBeDefined();
    expect(PROVIDERS.bazaarlink.baseUrl).toBe("https://api.bazaarlink.ai/v1/chat/completions");
    expect(bazaarlinkRegistry.hasFree).toBe(true);
    expect(bazaarlinkRegistry.modelsFetcher.url).toBe("https://api.bazaarlink.ai/v1/models");
  });

  it("marks bazaarlink with free and popular badges", () => {
    const curation = getCurationData("bazaarlink");
    expect(curation.badges).toContain("free");
    expect(curation.badges).toContain("popular");
    expect(curation.badges).not.toContain("cheap");
  });

  it("fetches credits and key limits from bazaarlink API", async () => {
    vi.spyOn(proxyFetchModule, "proxyAwareFetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          credits: 45.5,
          lifetime_usage: 12.3,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          limit: 50.0,
          limit_remaining: 37.7,
        }),
      });

    const usage = await getBazaarLinkUsage("sk-bl-test-key");
    expect(usage.balance).toBe("$45.50");
    expect(usage.quotas["Credits Balance (USD)"]).toBeDefined();
    expect(usage.quotas["Key Spend Limit (USD)"]).toBeDefined();
    expect(usage.quotas["Auto:Free Router (Zero Cost)"]).toBeDefined();
  });
});