import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as syncCkeyProxy } from "../../src/app/api/ckey/proxy/sync/route.js";
import { getProxyPools, createProxyPool } from "../../src/lib/db/repos/proxyPoolsRepo.js";
import { getSettings, updateSettings } from "../../src/lib/db/repos/settingsRepo.js";

// Mock routeAuth to always allow in unit tests
vi.mock("../../src/lib/auth/routeAuth.js", () => ({
  requireDashboardAuth: vi.fn().mockResolvedValue(true),
}));

// Mock CKEY client
vi.mock("../../src/lib/ckey/client.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getProxyXoay: vi.fn().mockImplementation(async ({ keyproxy, tinhthanh }) => {
      if (keyproxy === "invalid_key") {
        return {
          ok: false,
          status: 400,
          json: { status: 101, message: "Key proxy khong hop le" },
          text: '{"status":101,"message":"Key proxy khong hop le"}',
        };
      }
      return {
        ok: true,
        status: 200,
        json: {
          status: 100,
          proxyhttp: "103.145.2.10:8080:ckeyuser:ckeypass",
          proxyUrl: "http://ckeyuser:ckeypass@103.145.2.10:8080",
          parsed: {
            ip: "103.145.2.10",
            port: "8080",
            user: "ckeyuser",
            pass: "ckeypass",
          },
        },
        text: '{"status":100}',
      };
    }),
  };
});

describe("CKEY Proxy Pool 1-Click Sync API", () => {
  it("fails if keyproxy is missing", async () => {
    const req = new Request("http://localhost/api/ckey/proxy/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyproxy: "" }),
    });

    const res = await syncCkeyProxy(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it("successfully creates a new CKEY rotating proxy pool", async () => {
    const req = new Request("http://localhost/api/ckey/proxy/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyproxy: "keyproxy_test_valid_123",
        tinhthanh: 3, // Hà Nội
        nhamang: "viettel",
        poolName: "CKEY Xoay - Hà Nội",
      }),
    });

    const res = await syncCkeyProxy(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.ip).toBe("103.145.2.10");
    expect(json.proxyUrl).toBe("http://ckeyuser:ckeypass@103.145.2.10:8080");

    const allPools = await getProxyPools();
    const createdPool = allPools.find((p) => p.name === "CKEY Xoay - Hà Nội");
    expect(createdPool).toBeDefined();
    expect(createdPool.type).toBe("ckey");
    expect(createdPool.ckeyKeyproxy).toBe("keyproxy_test_valid_123");
    expect(createdPool.testStatus).toBe("active");
  });
});
