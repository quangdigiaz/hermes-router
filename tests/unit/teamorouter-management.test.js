import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTeamoRouterUsage } from "../../open-sse/services/usage/misc.js";
import * as proxyFetchModule from "../../open-sse/utils/proxyFetch.js";

describe("TeamoRouter Management Wallet Usage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles /api/management/self/wallet response with top-up & vouchers", async () => {
    vi.spyOn(proxyFetchModule, "proxyAwareFetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: "",
        data: {
          topUpBalance: 120.5,
          voucherEfficientAmount: 30.0,
          toppedUpSpent: 80.25,
          voucherSpent: 10.0,
        },
      }),
    });

    const result = await getTeamoRouterUsage("sk-teamo-mgmt", { managementApiKey: "sk-teamo-mgmt" });
    expect(result.balance).toBe("$150.50");
    expect(result.quotas["Available Wallet (USD)"]).toBeDefined();
    expect(result.quotas["Total Spent (USD)"]).toBeDefined();
    expect(result.quotas["Total Spent (USD)"].used).toBe(90.25);
    expect(result.quotas["DeepSeek V4 Flash (Free)"]).toBeDefined();
  });

  it("handles member wallet quota when email is provided", async () => {
    vi.spyOn(proxyFetchModule, "proxyAwareFetch")
      .mockResolvedValueOnce({ ok: false, status: 404 }) // self wallet fails
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: "",
          data: {
            quotaTotal: 100.0,
            quotaRemaining: 65.0,
            quotaSpent: 35.0,
          },
        }),
      });

    const result = await getTeamoRouterUsage("sk-teamo-mgmt", { email: "alice@example.com" });
    expect(result.balance).toBe("$65.00");
    expect(result.quotas["Member Quota (USD)"]).toBeDefined();
    expect(result.quotas["Member Quota (USD)"].total).toBe(100.0);
    expect(result.quotas["Member Quota (USD)"].used).toBe(35.0);
  });
});