import { describe, it, expect, beforeEach } from "vitest";
import {
  checkApiKeyQuotaAndLimits,
  checkRpmLimit,
  getPeriodStartTimestamp,
} from "../../src/lib/quota/apiKeyQuotaService.js";

describe("API Key Quota & Rate Limit Engine", () => {
  it("getPeriodStartTimestamp returns correct boundaries", () => {
    expect(getPeriodStartTimestamp("none")).toBeNull();

    const daily = getPeriodStartTimestamp("daily");
    expect(daily).not.toBeNull();
    expect(new Date(daily).getHours()).toBe(0);

    const monthly = getPeriodStartTimestamp("monthly");
    expect(monthly).not.toBeNull();
    expect(new Date(monthly).getDate()).toBe(1);
  });

  describe("RPM Rate Limiting (Sliding Window)", () => {
    it("allows requests within RPM limit", () => {
      const key = "test-key-rpm-1";
      const limit = 3;

      expect(checkRpmLimit(key, limit).ok).toBe(true);
      expect(checkRpmLimit(key, limit).ok).toBe(true);
      expect(checkRpmLimit(key, limit).ok).toBe(true);
    });

    it("rejects requests exceeding RPM limit with 429", () => {
      const key = "test-key-rpm-exceed";
      const limit = 2;

      expect(checkRpmLimit(key, limit).ok).toBe(true);
      expect(checkRpmLimit(key, limit).ok).toBe(true);

      const rejected = checkRpmLimit(key, limit);
      expect(rejected.ok).toBe(false);
      expect(rejected.error).toContain("Rate limit exceeded");
    });
  });

  describe("checkApiKeyQuotaAndLimits", () => {
    it("bypasses check when no apiKeyInfo is provided", async () => {
      const result = await checkApiKeyQuotaAndLimits(null, "auto/best");
      expect(result.ok).toBe(true);
    });

    it("rejects inactive / paused key with 401", async () => {
      const apiKeyInfo = {
        name: "Test Inactive",
        key: "ak_inactive_123",
        isActive: false,
      };

      const result = await checkApiKeyQuotaAndLimits(apiKeyInfo, "auto/best");
      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
      expect(result.error).toContain("paused or inactive");
    });

    it("rejects expired key with 401", async () => {
      const apiKeyInfo = {
        name: "Test Expired",
        key: "ak_expired_123",
        isActive: true,
        expiresAt: "2020-01-01T00:00:00.000Z",
      };

      const result = await checkApiKeyQuotaAndLimits(apiKeyInfo, "auto/best");
      expect(result.ok).toBe(false);
      expect(result.status).toBe(401);
      expect(result.error).toContain("expired");
    });

    it("allows key with future expiration date", async () => {
      const apiKeyInfo = {
        name: "Test Valid Expire",
        key: "ak_valid_future_123",
        isActive: true,
        expiresAt: "2099-12-31T23:59:59.000Z",
      };

      const result = await checkApiKeyQuotaAndLimits(apiKeyInfo, "auto/best");
      expect(result.ok).toBe(true);
    });

    it("enforces allowedModels list properly", async () => {
      const apiKeyInfo = {
        name: "Friend Key",
        key: "ak_friend_123",
        isActive: true,
        allowedModels: ["google/gemini-3.7-flash", "auto/cheapest"],
      };

      // Allowed model
      const okResult = await checkApiKeyQuotaAndLimits(apiKeyInfo, "google/gemini-3.7-flash");
      expect(okResult.ok).toBe(true);

      // Forbidden model
      const blockedResult = await checkApiKeyQuotaAndLimits(apiKeyInfo, "anthropic/claude-opus-5");
      expect(blockedResult.ok).toBe(false);
      expect(blockedResult.status).toBe(403);
      expect(blockedResult.error).toContain("not permitted");
    });

    it("enforces RPM limit through checkApiKeyQuotaAndLimits", async () => {
      const apiKeyInfo = {
        name: "RPM Guard Key",
        key: "ak_rpm_guard_123",
        isActive: true,
        rpmLimit: 2,
      };

      expect((await checkApiKeyQuotaAndLimits(apiKeyInfo, "auto/best")).ok).toBe(true);
      expect((await checkApiKeyQuotaAndLimits(apiKeyInfo, "auto/best")).ok).toBe(true);

      const thirdReq = await checkApiKeyQuotaAndLimits(apiKeyInfo, "auto/best");
      expect(thirdReq.ok).toBe(false);
      expect(thirdReq.status).toBe(429);
      expect(thirdReq.error).toContain("Rate limit exceeded");
    });
  });
});
