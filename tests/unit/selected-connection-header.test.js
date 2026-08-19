// Tests for X-HermesRouter-Selected-Connection-Id response header.
import { describe, it, expect } from "vitest";
import { withSelectedConnectionHeader, errorResponse } from "open-sse/utils/error.js";

describe("withSelectedConnectionHeader", () => {
  it("adds X-HermesRouter-Selected-Connection-Id to a non-streaming response", () => {
    const original = errorResponse(400, "bad request");
    const tagged = withSelectedConnectionHeader(original, "conn-123");
    expect(tagged.headers.get("X-HermesRouter-Selected-Connection-Id")).toBe("conn-123");
  });

  it("preserves the original status code", () => {
    const original = errorResponse(429, "rate limited");
    const tagged = withSelectedConnectionHeader(original, "conn-456");
    expect(tagged.status).toBe(429);
  });

  it("preserves the original Content-Type header", () => {
    const original = errorResponse(500, "server error");
    const tagged = withSelectedConnectionHeader(original, "conn-789");
    expect(tagged.headers.get("Content-Type")).toBe("application/json");
  });

  it("preserves the original response body for non-streaming responses", async () => {
    const original = errorResponse(400, "test error");
    const tagged = withSelectedConnectionHeader(original, "conn-abc");
    const body = await tagged.json();
    expect(body.error.message).toBe("test error");
  });

  it("works with streaming responses (body passed by reference)", async () => {
    // Simulate a streaming response with a ReadableStream body
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("data: hello\n\n"));
        controller.close();
      },
    });
    const original = new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
    const tagged = withSelectedConnectionHeader(original, "conn-stream-1");
    expect(tagged.headers.get("X-HermesRouter-Selected-Connection-Id")).toBe("conn-stream-1");
    expect(tagged.headers.get("Content-Type")).toBe("text/event-stream");
    expect(tagged.status).toBe(200);
    // Body is still readable — stream was not consumed
    const text = await tagged.text();
    expect(text).toBe("data: hello\n\n");
  });

  it("returns the original response when connectionId is falsy", () => {
    const original = errorResponse(200, "ok");
    expect(withSelectedConnectionHeader(original, null)).toBe(original);
    expect(withSelectedConnectionHeader(original, undefined)).toBe(original);
    expect(withSelectedConnectionHeader(original, "")).toBe(original);
  });

  it("returns the original response when response is falsy", () => {
    expect(withSelectedConnectionHeader(null, "conn-1")).toBe(null);
    expect(withSelectedConnectionHeader(undefined, "conn-1")).toBe(undefined);
  });

  it("preserves Retry-After header when present", () => {
    const original = new Response(JSON.stringify({ error: { message: "rate limited" } }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    });
    const tagged = withSelectedConnectionHeader(original, "conn-ratelimited");
    expect(tagged.headers.get("Retry-After")).toBe("60");
    expect(tagged.headers.get("X-HermesRouter-Selected-Connection-Id")).toBe("conn-ratelimited");
  });

  it("does not mutate the original response headers", () => {
    const original = errorResponse(200, "ok");
    const tagged = withSelectedConnectionHeader(original, "conn-mutation-test");
    // Original should NOT have the header
    expect(original.headers.get("X-HermesRouter-Selected-Connection-Id")).toBe(null);
    // Tagged should
    expect(tagged.headers.get("X-HermesRouter-Selected-Connection-Id")).toBe("conn-mutation-test");
  });

  it("handles connection IDs with special characters (UUIDs)", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const original = errorResponse(200, "ok");
    const tagged = withSelectedConnectionHeader(original, uuid);
    expect(tagged.headers.get("X-HermesRouter-Selected-Connection-Id")).toBe(uuid);
  });
});
