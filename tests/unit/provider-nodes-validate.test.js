import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const originalFetch = global.fetch;

function mockFetch(handler) {
  global.fetch = vi.fn(handler);
}

async function setupRoute() {
  vi.resetModules();
  vi.doMock("next/server", () => ({
    NextResponse: {
      json(body, init = {}) {
        return new Response(JSON.stringify(body), {
          status: init.status || 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  }));
  // SSRF guard treats local/private URLs as allowed for tests
  vi.doMock("@/shared/utils/ssrfGuard.js", () => ({
    assertPublicUrl: async () => true,
  }));
  vi.doMock("@/dashboardGuard", () => ({
    isLocalRequest: () => false,
  }));

  const { POST } = await import("@/app/api/provider-nodes/validate/route.js");
  return { POST };
}

function makeRequest(body) {
  return new Request("https://hermes-router.local/api/provider-nodes/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("provider node validation", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.doUnmock("next/server");
    vi.doUnmock("@/shared/utils/ssrfGuard.js");
    vi.doUnmock("@/dashboardGuard");
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("anthropic-compatible", () => {
    it("normalizes base URL missing /v1 to /v1/models", async () => {
      const { POST } = await setupRoute();
      mockFetch((url) => {
        expect(url).toBe("https://dashscope-intl.aliyuncs.com/apps/anthropic/v1/models");
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      const response = await POST(makeRequest({
        type: "anthropic-compatible",
        baseUrl: "https://dashscope-intl.aliyuncs.com/apps/anthropic",
        apiKey: "sk-test",
        modelId: "",
      }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.valid).toBe(true);
    });

    it("keeps base URL that already ends with /v1", async () => {
      const { POST } = await setupRoute();
      mockFetch((url) => {
        expect(url).toBe("https://example.com/anthropic/v1/models");
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      const response = await POST(makeRequest({
        type: "anthropic-compatible",
        baseUrl: "https://example.com/anthropic/v1",
        apiKey: "sk-test",
        modelId: "",
      }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.valid).toBe(true);
    });

    it("returns a clear error when /models is 404 and no model ID is given", async () => {
      const { POST } = await setupRoute();
      mockFetch(() =>
        Promise.resolve({ ok: false, status: 404, text: async () => "Not Found" })
      );

      const response = await POST(makeRequest({
        type: "anthropic-compatible",
        baseUrl: "https://dashscope-intl.aliyuncs.com/apps/anthropic",
        apiKey: "sk-test",
        modelId: "",
      }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.valid).toBe(false);
      expect(body.error).toContain("Model ID");
      expect(body.error).toContain("/models");
    });

    it("falls back to /v1/chat/completions when model ID is provided and /models is 404", async () => {
      const { POST } = await setupRoute();
      mockFetch((url, options) => {
        if (url.endsWith("/models")) {
          return Promise.resolve({ ok: false, status: 404, text: async () => "Not Found" });
        }
        expect(url).toBe("https://dashscope-intl.aliyuncs.com/apps/anthropic/v1/chat/completions");
        expect(options.method).toBe("POST");
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      });

      const response = await POST(makeRequest({
        type: "anthropic-compatible",
        baseUrl: "https://dashscope-intl.aliyuncs.com/apps/anthropic",
        apiKey: "sk-test",
        modelId: "claude-3-5-sonnet",
      }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.valid).toBe(true);
      expect(body.method).toBe("chat");
    });
  });
});
