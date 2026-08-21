import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as testProxyPool } from "../../src/app/api/proxy-pools/[id]/test/route.js";
import { getProxyPoolById, updateProxyPool } from "../../src/lib/db/repos/proxyPoolsRepo.js";
import { testProxyUrl } from "../../src/lib/network/proxyTest";
import { autoRotateCkeyProxy } from "../../src/lib/ckey/autoRotate.js";
import { getSettings } from "../../src/lib/db/repos/settingsRepo.js";

// Mock dependencies
vi.mock("../../src/lib/db/repos/proxyPoolsRepo.js", () => ({
  getProxyPoolById: vi.fn(),
  updateProxyPool: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../src/lib/auth/routeAuth.js", () => ({
  requireDashboardAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../src/lib/network/proxyTest", () => ({
  testProxyUrl: vi.fn(),
}));

vi.mock("../../src/lib/ckey/autoRotate.js", () => ({
  autoRotateCkeyProxy: vi.fn(),
}));

vi.mock("../../src/lib/db/repos/settingsRepo.js", () => ({
  getSettings: vi.fn().mockResolvedValue({ ckeyKeyproxy: "test_keyproxy" }),
}));

describe("CKEY Proxy Test Auto-Rotation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("automatically rotates CKEY proxy and recovers if old IP timed out", async () => {
    // 1. Mock proxy pool with CKEY type
    getProxyPoolById.mockResolvedValue({
      id: "ckey-pool-1",
      name: "CKEY Xoay HCM",
      type: "ckey",
      proxyUrl: "http://user:pass@103.1.1.1:8080",
      ckeyKeyproxy: "keyproxy_test123",
      ckeyTinhThanh: 6,
      ckeyNhaMang: "viettel",
    });

    // 2. First test fails with timeout (old expired IP)
    // 3. Second test with new IP succeeds
    testProxyUrl
      .mockResolvedValueOnce({ ok: false, status: 500, error: "Proxy test timed out" })
      .mockResolvedValueOnce({ ok: true, status: 200, elapsedMs: 350 });

    // Mock autoRotateCkeyProxy to rotate to new IP
    autoRotateCkeyProxy.mockResolvedValue({
      rotated: true,
      proxyUrl: "http://user:pass@103.2.2.2:9090",
      ip: "103.2.2.2",
    });

    const req = new Request("http://localhost/api/proxy-pools/ckey-pool-1/test", { method: "POST" });
    const res = await testProxyPool(req, { params: Promise.resolve({ id: "ckey-pool-1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.autoRotated).toBe(true);
    expect(json.newIp).toBe("103.2.2.2");

    // Verify autoRotate was called with force: true
    expect(autoRotateCkeyProxy).toHaveBeenCalledWith("ckey-pool-1", {
      keyproxy: "keyproxy_test123",
      tinhthanh: 6,
      nhamang: "viettel",
      force: true,
    });

    // Verify DB updated with active state
    expect(updateProxyPool).toHaveBeenCalledWith("ckey-pool-1", expect.objectContaining({
      isActive: true,
      testStatus: "active",
      lastError: null,
    }));
  });
});
