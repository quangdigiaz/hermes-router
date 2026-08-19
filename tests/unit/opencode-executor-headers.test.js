import { describe, it, expect } from "vitest";
import { OpenCodeExecutor } from "../../open-sse/executors/opencode.js";

describe("OpenCodeExecutor identity headers", () => {
  it("should have stable session and project IDs across calls", () => {
    const executor = new OpenCodeExecutor();
    const headers1 = executor.buildHeaders({});
    const headers2 = executor.buildHeaders({});

    expect(headers1["x-opencode-session"]).toMatch(/^ses_[a-z0-9]{40}$/);
    expect(headers1["x-opencode-project"]).toMatch(/^p_[a-z0-9]{20}$/);
    expect(headers1["x-opencode-session"]).toBe(headers2["x-opencode-session"]);
    expect(headers1["x-opencode-project"]).toBe(headers2["x-opencode-project"]);
  });

  it("should generate unique request ID for each call", () => {
    const executor = new OpenCodeExecutor();
    const headers1 = executor.buildHeaders({});
    const headers2 = executor.buildHeaders({});

    expect(headers1["x-opencode-request"]).toMatch(/^ses_[a-z0-9]+:\d+:[a-z0-9]+$/);
    expect(headers1["x-opencode-request"]).not.toBe(headers2["x-opencode-request"]);
  });

  it("should have correct User-Agent", () => {
    const executor = new OpenCodeExecutor();
    const headers = executor.buildHeaders({});

    expect(headers["User-Agent"]).toBe("opencode/1.17.0");
  });

  it("should use Bearer public when no credentials", () => {
    const executor = new OpenCodeExecutor();
    const headers = executor.buildHeaders({});

    expect(headers["Authorization"]).toBe("Bearer public");
  });

  it("should use API key when provided", () => {
    const executor = new OpenCodeExecutor();
    const headers = executor.buildHeaders({ apiKey: "test-key-123" });

    expect(headers["Authorization"]).toBe("Bearer test-key-123");
  });

  it("should use access token when provided", () => {
    const executor = new OpenCodeExecutor();
    const headers = executor.buildHeaders({ accessToken: "token-456" });

    expect(headers["Authorization"]).toBe("Bearer token-456");
  });

  it("should include Accept header when streaming", () => {
    const executor = new OpenCodeExecutor();
    const headers = executor.buildHeaders({}, true);

    expect(headers["Accept"]).toBe("text/event-stream");
  });

  it("should not include Accept header when not streaming", () => {
    const executor = new OpenCodeExecutor();
    const headers = executor.buildHeaders({}, false);

    expect(headers["Accept"]).toBeUndefined();
  });
});
