import { describe, it, expect, vi } from "vitest";
import { PROVIDERS } from "../../open-sse/providers/index.js";
import a6apiRegistry from "../../open-sse/providers/registry/a6api.js";
import { getCurationData } from "../../open-sse/providers/curation.js";
import { getA6ApiUsage } from "../../open-sse/services/usage/misc.js";
import * as proxyFetchModule from "../../open-sse/utils/proxyFetch.js";

describe("A6API Provider Integration", () => {
  it("registers a6api with referral link LMjF", () => {
    expect(PROVIDERS.a6api).toBeDefined();
    expect(a6apiRegistry.display.website).toBe("https://a6api.com/?auth=register&aff=LMjF");
    expect(a6apiRegistry.display.notice.apiKeyUrl).toBe("https://a6api.com/?auth=register&aff=LMjF");
  });

  it("marks a6api with cheap and popular badges", () => {
    const curation = getCurationData("a6api");
    expect(curation.badges).toContain("cheap");
    expect(curation.badges).toContain("popular");
  });

  it("fetches balance from a6api balance endpoint", async () => {
    vi.spyOn(proxyFetchModule, "proxyAwareFetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total_available: 50.25,
      }),
    });

    const usage = await getA6ApiUsage("sk-a6-test");
    expect(usage.balance).toBe("$50.25");
    expect(usage.quotas["Account Balance (USD)"]).toBeDefined();
  });
});