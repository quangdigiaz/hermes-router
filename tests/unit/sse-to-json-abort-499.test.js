import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const SSE_TO_JSON_PATH = path.resolve("open-sse/handlers/chatCore/sseToJsonHandler.js");
const ERROR_CONFIG_PATH = path.resolve("open-sse/config/errorConfig.js");
const CLASSIFY_429_PATH = path.resolve("open-sse/utils/classify429.js");

describe("SSE to JSON AbortError & Status 499 Guards", () => {
  it("sseToJsonHandler.js catches AbortError and returns status 499", () => {
    const content = fs.readFileSync(SSE_TO_JSON_PATH, "utf8");
    expect(content).toContain('createErrorResult(499, "Client aborted request")');
  });

  it("sseToJsonHandler.js checks err.name === AbortError and signal.aborted", () => {
    const content = fs.readFileSync(SSE_TO_JSON_PATH, "utf8");
    expect(content).toContain('err?.name === "AbortError"');
    expect(content).toContain("clientRawRequest?.signal?.aborted");
  });

  it("errorConfig.js explicitly specifies status 499 with shouldFallback: false", () => {
    const content = fs.readFileSync(ERROR_CONFIG_PATH, "utf8");
    expect(content).toContain("status: 499, shouldFallback: false");
  });

  it("errorConfig.js has text rules for client aborted and client disconnected", () => {
    const content = fs.readFileSync(ERROR_CONFIG_PATH, "utf8");
    expect(content).toContain('"client aborted"');
    expect(content).toContain('"client disconnected"');
    expect(content).toContain("shouldFallback: false");
  });

  it("classify429.js recognizes FreeUsageLimitError as quota_exhausted", () => {
    const content = fs.readFileSync(CLASSIFY_429_PATH, "utf8");
    expect(content).toContain("/FreeUsageLimitError/i");
  });

  it("classify429.js has free usage limit pattern", () => {
    const content = fs.readFileSync(CLASSIFY_429_PATH, "utf8");
    expect(content).toContain("/free.{0,10}usage.{0,10}limit/i");
  });

  it("sseToJsonHandler.js does NOT log console.error on AbortError", () => {
    const content = fs.readFileSync(SSE_TO_JSON_PATH, "utf8");
    // Verify that the AbortError branch returns BEFORE any console.error
    const abortBlock = content.substring(
      content.indexOf('err?.name === "AbortError"'),
      content.indexOf("console.error", content.indexOf('err?.name === "AbortError"'))
    );
    expect(abortBlock).toContain("return createErrorResult(499");
    expect(abortBlock).not.toContain("console.error");
  });
});
