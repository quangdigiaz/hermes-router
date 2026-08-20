import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkAccountHealth,
  getDefaultBaseUrl,
  _state,
} from "../../open-sse/services/accountHealth.js";

// Mock dependencies
vi.mock("../../src/lib/db/repos/connectionsRepo.js", () => ({
  getProviderConnections: vi.fn(),
  updateProviderConnection: vi.fn(),
}));

vi.mock("../../open-sse/utils/proxyFetch.js", () => ({
  proxyAwareFetch: vi.fn(),
}));

import { proxyAwareFetch } from "../../open-sse/utils/proxyFetch.js";

describe("accountHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _state.healthCache.clear();
  });

  describe("getDefaultBaseUrl", () => {
    it("returns correct URLs for known providers", () => {
      expect(getDefaultBaseUrl("claude")).toBe("https://api.anthropic.com");
      expect(getDefaultBaseUrl("openai")).toBe("https://api.openai.com");
      expect(getDefaultBaseUrl("gemini")).toBe("https://generativelanguage.googleapis.com");
      expect(getDefaultBaseUrl("grok")).toBe("https://api.x.ai");
      expect(getDefaultBaseUrl("codex")).toBe("https://api.openai.com");
      expect(getDefaultBaseUrl("antigravity")).toBe("https://cloudcode-pa.googleapis.com");
    });

    it("returns null for unknown provider", () => {
      expect(getDefaultBaseUrl("unknown")).toBeNull();
    });
  });

  describe("checkAccountHealth", () => {
    it("returns unknown for unknown provider", async () => {
      const conn = { provider: "unknown", id: "1", data: "{}" };
      const result = await checkAccountHealth(conn);
      expect(result.status).toBe("unknown");
      expect(result.reason).toBe("no_health_endpoint");
    });

    it("returns healthy on 200 OK", async () => {
      proxyAwareFetch.mockResolvedValue({ ok: true, status: 200 });
      const conn = { provider: "openai", id: "1", authType: "oauth", data: '{"accessToken":"sk-test"}' };
      const result = await checkAccountHealth(conn);
      expect(result.status).toBe("healthy");
    });

    it("returns banned on 401", async () => {
      proxyAwareFetch.mockResolvedValue({ ok: false, status: 401 });
      const conn = { provider: "openai", id: "1", authType: "oauth", data: '{"accessToken":"sk-test"}' };
      const result = await checkAccountHealth(conn);
      expect(result.status).toBe("banned");
      expect(result.reason).toBe("auth_401");
    });

    it("returns banned on 403", async () => {
      proxyAwareFetch.mockResolvedValue({ ok: false, status: 403 });
      const conn = { provider: "openai", id: "1", authType: "oauth", data: '{"accessToken":"sk-test"}' };
      const result = await checkAccountHealth(conn);
      expect(result.status).toBe("banned");
      expect(result.reason).toBe("auth_403");
    });

    it("returns rate_limited on 429", async () => {
      proxyAwareFetch.mockResolvedValue({ ok: false, status: 429 });
      const conn = { provider: "openai", id: "1", authType: "oauth", data: '{"accessToken":"sk-test"}' };
      const result = await checkAccountHealth(conn);
      expect(result.status).toBe("rate_limited");
      expect(result.reason).toBe("429_too_many_requests");
    });

    it("returns rate_limited on 402", async () => {
      proxyAwareFetch.mockResolvedValue({ ok: false, status: 402 });
      const conn = { provider: "openai", id: "1", authType: "oauth", data: '{"accessToken":"sk-test"}' };
      const result = await checkAccountHealth(conn);
      expect(result.status).toBe("rate_limited");
      expect(result.reason).toBe("402_payment_required");
    });

    it("returns error on 500", async () => {
      proxyAwareFetch.mockResolvedValue({ ok: false, status: 500 });
      const conn = { provider: "openai", id: "1", authType: "oauth", data: '{"accessToken":"sk-test"}' };
      const result = await checkAccountHealth(conn);
      expect(result.status).toBe("error");
      expect(result.reason).toBe("http_500");
    });

    it("returns error on timeout", async () => {
      const timeoutError = new Error("timeout");
      timeoutError.name = "TimeoutError";
      proxyAwareFetch.mockRejectedValue(timeoutError);
      const conn = { provider: "openai", id: "1", authType: "oauth", data: '{"accessToken":"sk-test"}' };
      const result = await checkAccountHealth(conn);
      expect(result.status).toBe("error");
      expect(result.reason).toBe("timeout");
    });

    it("returns error on network error", async () => {
      proxyAwareFetch.mockRejectedValue(new Error("ECONNREFUSED"));
      const conn = { provider: "openai", id: "1", authType: "oauth", data: '{"accessToken":"sk-test"}' };
      const result = await checkAccountHealth(conn);
      expect(result.status).toBe("error");
      expect(result.reason).toBe("ECONNREFUSED");
    });

    it("uses apiKey auth for apikey connections", async () => {
      proxyAwareFetch.mockResolvedValue({ ok: true, status: 200 });
      const conn = { provider: "openai", id: "1", authType: "apikey", data: '{"apiKey":"sk-test"}' };
      await checkAccountHealth(conn);
      
      const callArgs = proxyAwareFetch.mock.calls[0];
      expect(callArgs[1].headers["x-api-key"]).toBe("sk-test");
    });

    it("uses custom baseUrl from connection data", async () => {
      proxyAwareFetch.mockResolvedValue({ ok: true, status: 200 });
      const conn = { provider: "openai", id: "1", authType: "oauth", data: '{"accessToken":"sk-test","baseUrl":"https://custom.api.com"}' };
      await checkAccountHealth(conn);
      
      const callArgs = proxyAwareFetch.mock.calls[0];
      expect(callArgs[0]).toBe("https://custom.api.com/v1/models");
    });
  });
});
