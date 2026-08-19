// Tests for cooldown-aware retry decision logic.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { maybeWaitForCooldown, sleepMs, MAX_RETRY_WAIT_MS, MAX_COOLDOWN_RETRIES } from "open-sse/utils/cooldownRetry.js";

describe("maybeWaitForCooldown — constants", () => {
  it("max wait is 30s", () => {
    expect(MAX_RETRY_WAIT_MS).toBe(30_000);
  });
  it("max retries is 1", () => {
    expect(MAX_COOLDOWN_RETRIES).toBe(1);
  });
});

describe("maybeWaitForCooldown — no-retry cases", () => {
  it("returns false when retry budget exhausted", async () => {
    const result = await maybeWaitForCooldown({
      retryAfter: new Date(Date.now() + 1000).toISOString(),
      retriesSoFar: 1,
    });
    expect(result.shouldRetry).toBe(false);
    expect(result.reason).toBe("budget_exhausted");
  });

  it("returns false when retryAfter is null/missing", async () => {
    const result = await maybeWaitForCooldown({ retryAfter: null, retriesSoFar: 0 });
    expect(result.shouldRetry).toBe(false);
    expect(result.reason).toBe("invalid_retry_after");
  });

  it("returns false when retryAfter is unparseable string", async () => {
    const result = await maybeWaitForCooldown({ retryAfter: "not-a-date", retriesSoFar: 0 });
    expect(result.shouldRetry).toBe(false);
    expect(result.reason).toBe("invalid_retry_after");
  });

  it("returns false when required wait exceeds 30s", async () => {
    const result = await maybeWaitForCooldown({
      retryAfter: new Date(Date.now() + 60_000).toISOString(),
      retriesSoFar: 0,
    });
    expect(result.shouldRetry).toBe(false);
    expect(result.reason).toBe("wait_too_long");
  });

  it("returns false when client already disconnected", async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await maybeWaitForCooldown({
      retryAfter: new Date(Date.now() + 1000).toISOString(),
      retriesSoFar: 0,
      signal: controller.signal,
    });
    expect(result.shouldRetry).toBe(false);
    expect(result.reason).toBe("client_disconnected");
  });
});

describe("maybeWaitForCooldown — retry cases", () => {
  it("retries immediately when cooldown already expired (waitMs <= 0)", async () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const result = await maybeWaitForCooldown({ retryAfter: past, retriesSoFar: 0 });
    expect(result.shouldRetry).toBe(true);
    expect(result.waitedMs).toBe(0);
  });

  it("waits and retries when wait is within 30s budget", async () => {
    vi.useFakeTimers();
    const waitMs = 5000;
    const retryAfter = new Date(Date.now() + waitMs).toISOString();
    const promise = maybeWaitForCooldown({ retryAfter, retriesSoFar: 0 });
    vi.advanceTimersByTime(waitMs);
    const result = await promise;
    expect(result.shouldRetry).toBe(true);
    expect(result.waitedMs).toBe(waitMs);
    vi.useRealTimers();
  });

  it("respects custom maxWaitMs override", async () => {
    const result = await maybeWaitForCooldown({
      retryAfter: new Date(Date.now() + 4000).toISOString(),
      retriesSoFar: 0,
      maxWaitMs: 2000,
    });
    expect(result.shouldRetry).toBe(false);
    expect(result.reason).toBe("wait_too_long");
  });

  it("respects custom maxRetries override", async () => {
    vi.useFakeTimers();
    const waitMs = 1000;
    const retryAfter = new Date(Date.now() + waitMs).toISOString();
    const promise = maybeWaitForCooldown({ retryAfter, retriesSoFar: 2, maxRetries: 3 });
    vi.advanceTimersByTime(waitMs);
    const result = await promise;
    expect(result.shouldRetry).toBe(true);
    vi.useRealTimers();
  });
});

describe("maybeWaitForCooldown — client disconnect during wait", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("aborts wait and returns client_disconnected when signal fires during sleep", async () => {
    const controller = new AbortController();
    const waitMs = 10_000;
    const retryAfter = new Date(Date.now() + waitMs).toISOString();
    const promise = maybeWaitForCooldown({
      retryAfter,
      retriesSoFar: 0,
      signal: controller.signal,
    });
    // Abort midway through the wait
    vi.advanceTimersByTime(3000);
    controller.abort();
    const result = await promise;
    expect(result.shouldRetry).toBe(false);
    expect(result.reason).toBe("client_disconnected");
  });
});

describe("sleepMs", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("resolves after the specified duration", async () => {
    const promise = sleepMs(1000);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects immediately if signal already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(sleepMs(1000, controller.signal)).rejects.toThrow();
  });

  it("rejects when signal aborts during sleep", async () => {
    const controller = new AbortController();
    const promise = sleepMs(5000, controller.signal);
    vi.advanceTimersByTime(2000);
    controller.abort();
    await expect(promise).rejects.toThrow();
  });

  it("accepts ISO string, epoch ms, and Date for retryAfter indirectly", async () => {
    // epoch ms
    const r1 = await maybeWaitForCooldown({ retryAfter: Date.now() - 100, retriesSoFar: 0 });
    expect(r1.shouldRetry).toBe(true);
    // Date object
    const r2 = await maybeWaitForCooldown({ retryAfter: new Date(Date.now() - 100), retriesSoFar: 0 });
    expect(r2.shouldRetry).toBe(true);
  });
});
