import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, afterEach, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;

async function setupRoute() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-router-provider-nodes-"));
  process.env.DATA_DIR = tempDir;
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

  const { POST } = await import("@/app/api/provider-nodes/route.js");
  const { getProviderNodes } = await import("@/models/index.js");
  return { POST, getProviderNodes, cleanup() { fs.rmSync(tempDir, { recursive: true, force: true }); } };
}

function makeRequest(body) {
  return new Request("https://hermes-router.local/api/provider-nodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("provider node creation", () => {
  let cleanup = () => {};

  afterEach(() => {
    vi.doUnmock("next/server");
    vi.resetModules();
    vi.clearAllMocks();
    cleanup();
    cleanup = () => {};
    if (originalDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = originalDataDir;
  });

  describe("anthropic-compatible", () => {
    it("auto-appends /v1 to base URL missing it", async () => {
      const ctx = await setupRoute();
      cleanup = ctx.cleanup;

      const response = await ctx.POST(makeRequest({
        type: "anthropic-compatible",
        name: "DashScope Anthropic",
        prefix: "dsa",
        baseUrl: "https://dashscope-intl.aliyuncs.com/apps/anthropic",
      }));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.node.baseUrl).toBe("https://dashscope-intl.aliyuncs.com/apps/anthropic/v1");

      const nodes = await ctx.getProviderNodes();
      const stored = nodes.find((n) => n.id === body.node.id);
      expect(stored.baseUrl).toBe("https://dashscope-intl.aliyuncs.com/apps/anthropic/v1");
    });

    it("keeps /v1 in base URL that already has it", async () => {
      const ctx = await setupRoute();
      cleanup = ctx.cleanup;

      const response = await ctx.POST(makeRequest({
        type: "anthropic-compatible",
        name: "Official Anthropic",
        prefix: "ant",
        baseUrl: "https://api.anthropic.com/v1",
      }));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.node.baseUrl).toBe("https://api.anthropic.com/v1");
    });

    it("strips trailing /messages and then appends /v1 if needed", async () => {
      const ctx = await setupRoute();
      cleanup = ctx.cleanup;

      const response = await ctx.POST(makeRequest({
        type: "anthropic-compatible",
        name: "Pasted Endpoint",
        prefix: "pe",
        baseUrl: "https://gateway.example.com/anthropic/messages",
      }));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.node.baseUrl).toBe("https://gateway.example.com/anthropic/v1");
    });
  });
});
