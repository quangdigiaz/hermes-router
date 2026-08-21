import { describe, it, expect, vi, beforeEach } from "vitest";
import { proxyAwareFetch } from "../../open-sse/utils/proxyFetch.js";

describe("proxyAwareFetch Circuit Breaker", () => {
  it("exports proxyAwareFetch function", () => {
    expect(typeof proxyAwareFetch).toBe("function");
  });
});