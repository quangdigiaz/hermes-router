import { describe, it, expect } from "vitest";
import { getZenMuxUsage } from "../../open-sse/services/usage/misc.js";
import zenmuxRegistry from "../../open-sse/providers/registry/zenmux.js";
import { USAGE_APIKEY_PROVIDERS } from "../../src/shared/constants/providers.js";

describe("ZenMux Usage & Balance Integration", () => {
  it("enables usage and usageApikey in zenmux registry", () => {
    expect(zenmuxRegistry.features.usage).toBe(true);
    expect(zenmuxRegistry.features.usageApikey).toBe(true);
    expect(USAGE_APIKEY_PROVIDERS).toContain("zenmux");
  });

  it("returns fallback message when no key is provided", async () => {
    const usage = await getZenMuxUsage("");
    expect(usage.plan).toBe("ZenMux");
  });

  it("handles management key for querying PAYG balance and subscriptions", async () => {
    const fakeMgKey = "sk-mg-v1-test";
    const usage = await getZenMuxUsage("sk-inference-key", { managementApiKey: fakeMgKey });
    expect(usage).toBeDefined();
    expect(usage.plan).toContain("ZenMux");
  });
});
