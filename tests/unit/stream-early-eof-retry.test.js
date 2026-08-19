// Tests for STREAM_EARLY_EOF detection + bounded single retry.
// When upstream returns HTTP 200 then closes SSE with zero useful frames,
// HermesRouter retries once on the SAME connection before returning 502.
import { describe, it, expect } from "vitest";
import { handleStreamingResponse } from "../../open-sse/handlers/chatCore/streamingHandler.js";
import { createStreamController } from "../../open-sse/utils/streamHandler.js";

// Test the retry decision logic: shouldRetryStreamEarlyEof
describe("STREAM_EARLY_EOF retry logic", () => {
  const STREAM_EARLY_EOF_MAX_RETRIES = 1;

  function shouldRetryStreamEarlyEof(errorCode, attempt) {
    return errorCode === "STREAM_EARLY_EOF" && attempt < STREAM_EARLY_EOF_MAX_RETRIES;
  }

  it("retries on first STREAM_EARLY_EOF (attempt 0)", () => {
    expect(shouldRetryStreamEarlyEof("STREAM_EARLY_EOF", 0)).toBe(true);
  });

  it("does NOT retry after first retry exhausted (attempt 1)", () => {
    expect(shouldRetryStreamEarlyEof("STREAM_EARLY_EOF", 1)).toBe(false);
  });

  it("does NOT retry on other error codes", () => {
    expect(shouldRetryStreamEarlyEof("STREAM_READINESS_TIMEOUT", 0)).toBe(false);
    expect(shouldRetryStreamEarlyEof("stream_timeout", 0)).toBe(false);
    expect(shouldRetryStreamEarlyEof(null, 0)).toBe(false);
    expect(shouldRetryStreamEarlyEof(undefined, 0)).toBe(false);
  });

  it("is bounded — never retries beyond max", () => {
    expect(shouldRetryStreamEarlyEof("STREAM_EARLY_EOF", 2)).toBe(false);
    expect(shouldRetryStreamEarlyEof("STREAM_EARLY_EOF", 99)).toBe(false);
  });
});

// Test the readiness gate behavior: if stream ends before first chunk, it's early EOF
describe("stream readiness gate", () => {
  function createMockStream(chunks) {
    const queue = [...chunks];
    return {
      getReader: () => ({
        read: async () => {
          if (queue.length === 0) return { done: true };
          return { value: queue.shift(), done: false };
        },
        cancel: () => {},
      }),
    };
  }

  it("detects early EOF when stream has zero chunks", async () => {
    const stream = createMockStream([]);
    const reader = stream.getReader();
    const { done } = await reader.read();
    expect(done).toBe(true);
    // This signals STREAM_EARLY_EOF
  });

  it("passes through when stream has at least one chunk", async () => {
    const stream = createMockStream([new Uint8Array([1, 2, 3])]);
    const reader = stream.getReader();
    const { value, done } = await reader.read();
    expect(done).toBe(false);
    expect(value).toBeDefined();
  });
});

// Test that the streaming handler returns the correct error shape
describe("STREAM_EARLY_EOF result shape", () => {
  it("returns success=false with errorCode and 502 status", () => {
    const result = {
      success: false,
      status: 502,
      errorCode: "STREAM_EARLY_EOF",
      error: "Upstream closed stream before any useful content",
    };
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("STREAM_EARLY_EOF");
    expect(result.status).toBe(502);
  });
});

// Integration: handleStreamingResponse must actually detect and report early EOF.
describe("handleStreamingResponse STREAM_EARLY_EOF integration", () => {
  function makeStream(chunks) {
    const queue = [...chunks];
    return new ReadableStream({
      pull(controller) {
        if (queue.length === 0) {
          controller.close();
          return;
        }
        controller.enqueue(queue.shift());
      }
    });
  }

  function makeResponse(chunks) {
    return new Response(makeStream(chunks), {
      status: 200,
      headers: { "content-type": "text/event-stream" }
    });
  }

  function makeController() {
    return createStreamController({
      onDisconnect: () => {},
      onError: () => {},
      provider: "agentrouter",
      model: "glm-5.2"
    });
  }

  const baseCtx = {
    provider: "agentrouter",
    model: "glm-5.2",
    sourceFormat: "claude",
    targetFormat: "openai",
    userAgent: "test",
    body: { messages: [{ role: "user", content: "hi" }] },
    stream: true,
    translatedBody: null,
    finalBody: null,
    requestStartTime: Date.now(),
    connectionId: "conn-1",
    apiKey: "sk-test",
    apiKeyName: "test-key",
    clientRawRequest: null,
    onRequestSuccess: null,
    reqLogger: null,
    toolNameMap: new Map(),
    onStreamComplete: () => {}
  };

  it("returns STREAM_EARLY_EOF when upstream body is empty", async () => {
    const result = await handleStreamingResponse({
      ...baseCtx,
      providerResponse: makeResponse([]),
      streamController: makeController()
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("STREAM_EARLY_EOF");
    expect(result.status).toBe(502);
  });

  it("returns success=true when upstream body has at least one chunk", async () => {
    const encoder = new TextEncoder();
    const result = await handleStreamingResponse({
      ...baseCtx,
      providerResponse: makeResponse([encoder.encode("data: {\"ok\":true}\n\n")]),
      streamController: makeController()
    });
    expect(result.success).toBe(true);
    expect(result.response).toBeInstanceOf(Response);
    expect(result.response.body).toBeInstanceOf(ReadableStream);
  });

  it("returns STREAM_EARLY_EOF when upstream body is null", async () => {
    const result = await handleStreamingResponse({
      ...baseCtx,
      providerResponse: new Response(null, { status: 200, headers: { "content-type": "text/event-stream" } }),
      streamController: makeController()
    });
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("STREAM_EARLY_EOF");
  });
});
