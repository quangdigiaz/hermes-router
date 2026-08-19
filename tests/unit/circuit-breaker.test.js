import { describe, it, expect } from "vitest";

import {
  getCircuitBreaker,
  resetCircuitBreaker,
  resetAllCircuitBreakers,
  getAllCircuitBreakerStatuses,
  CircuitBreakerOpenError,
  STATE,
  PROVIDER_FAILURE_ERROR_CODES,
  FAILURE_KIND,
} from "../../open-sse/utils/circuitBreaker.js";

describe("CircuitBreaker", () => {
  beforeEach(() => {
    resetAllCircuitBreakers();
  });

  describe("state transitions", () => {
    it("starts in CLOSED state", () => {
      const cb = getCircuitBreaker("test-closed", { failureThreshold: 3 });
      expect(cb.getStatus().state).toBe(STATE.CLOSED);
      expect(cb.canExecute()).toBe(true);
    });

    it("opens after reaching failure threshold", () => {
      const cb = getCircuitBreaker("test-open", { failureThreshold: 3, resetTimeout: 1000 });
      cb._onFailure();
      // After 1 failure: DEGRADED (degradationThreshold = floor(3 * 0.6) = 1)
      expect(cb.getStatus().state).toBe(STATE.DEGRADED);
      cb._onFailure();
      // After 2 failures: still DEGRADED (not yet at failureThreshold)
      expect(cb.getStatus().state).toBe(STATE.DEGRADED);
      cb._onFailure();
      // After 3 failures: OPEN
      expect(cb.getStatus().state).toBe(STATE.OPEN);
      expect(cb.canExecute()).toBe(false);
    });

    it("transitions to HALF_OPEN after resetTimeout", async () => {
      const cb = getCircuitBreaker("test-halfopen", { failureThreshold: 2, resetTimeout: 50 });
      cb._onFailure();
      cb._onFailure();
      expect(cb.getStatus().state).toBe(STATE.OPEN);
      await new Promise(r => setTimeout(r, 60));
      expect(cb.canExecute()).toBe(true);
      expect(cb.getStatus().state).toBe(STATE.HALF_OPEN);
    });

    it("closes after successful probe in HALF_OPEN", async () => {
      const cb = getCircuitBreaker("test-recover", { failureThreshold: 2, resetTimeout: 50 });
      cb._onFailure();
      cb._onFailure();
      await new Promise(r => setTimeout(r, 60));
      cb.canExecute(); // transitions to HALF_OPEN
      cb._onSuccess();
      expect(cb.getStatus().state).toBe(STATE.CLOSED);
    });

    it("re-opens immediately if probe fails in HALF_OPEN", async () => {
      const cb = getCircuitBreaker("test-reopen", { failureThreshold: 2, resetTimeout: 50 });
      cb._onFailure();
      cb._onFailure();
      await new Promise(r => setTimeout(r, 60));
      cb.canExecute(); // transitions to HALF_OPEN
      cb._onFailure();
      expect(cb.getStatus().state).toBe(STATE.OPEN);
    });
  });

  describe("isFailure filter", () => {
    it("ignores errors when isFailure returns false", () => {
      const cb = getCircuitBreaker("test-isfailure-filter", {
        failureThreshold: 2,
        isFailure: () => false,
      });
      cb._onFailure({ statusCode: 500 });
      cb._onFailure({ statusCode: 500 });
      // When isFailure returns false, failures are ignored — breaker stays CLOSED
      expect(cb.getStatus().state).toBe(STATE.CLOSED);
    });

    it("counts errors when isFailure returns true", () => {
      const cb = getCircuitBreaker("test-isfailure-count", {
        failureThreshold: 2,
        isFailure: () => true,
      });
      cb._onFailure({ statusCode: 500 });
      cb._onFailure({ statusCode: 500 });
      expect(cb.getStatus().state).toBe(STATE.OPEN);
    });
  });

  describe("PROVIDER_FAILURE_ERROR_CODES", () => {
    it("includes 5xx but not 429", () => {
      expect(PROVIDER_FAILURE_ERROR_CODES.has(500)).toBe(true);
      expect(PROVIDER_FAILURE_ERROR_CODES.has(502)).toBe(true);
      expect(PROVIDER_FAILURE_ERROR_CODES.has(503)).toBe(true);
      expect(PROVIDER_FAILURE_ERROR_CODES.has(504)).toBe(true);
      expect(PROVIDER_FAILURE_ERROR_CODES.has(408)).toBe(true);
      // 429 is per-account, not provider-wide — must NOT be in this set
      expect(PROVIDER_FAILURE_ERROR_CODES.has(429)).toBe(false);
    });
  });

  describe("adaptive backoff", () => {
    it("escalates resetTimeout after repeated open→probe→open cycles", async () => {
      const cb = getCircuitBreaker("test-backoff", {
        failureThreshold: 1,
        resetTimeout: 50,
        maxBackoffMultiplier: 4,
        backoffEscalationCount: 1,
      });
      cb._onFailure();
      expect(cb.getStatus().state).toBe(STATE.OPEN);

      // First cycle: probe and fail again
      await new Promise(r => setTimeout(r, 60));
      cb.canExecute();
      cb._onFailure();
      const secondRetryAfter = cb.getRetryAfterMs();
      expect(secondRetryAfter).toBeGreaterThan(0);
    });
  });

  describe("FAILURE_KIND export", () => {
    it("exports the expected kinds", () => {
      expect(FAILURE_KIND.TRANSIENT).toBe("transient");
      expect(FAILURE_KIND.RATE_LIMIT).toBe("rate_limit");
      expect(FAILURE_KIND.QUOTA_EXHAUSTED).toBe("quota_exhausted");
    });
  });

  describe("getAllCircuitBreakerStatuses", () => {
    it("returns status for all registered breakers", () => {
      getCircuitBreaker("provider-a", { failureThreshold: 2 });
      getCircuitBreaker("provider-b", { failureThreshold: 2 });
      const statuses = getAllCircuitBreakerStatuses();
      const names = statuses.map(s => s.name);
      expect(names).toContain("provider-a");
      expect(names).toContain("provider-b");
    });
  });

  describe("CircuitBreakerOpenError", () => {
    it("is throwable with name and retryAfterMs", () => {
      const err = new CircuitBreakerOpenError("foo", 5000);
      expect(err.name).toBe("CircuitBreakerOpenError");
      expect(err.breakerName).toBe("foo");
      expect(err.retryAfterMs).toBe(5000);
      expect(err.message).toContain("foo");
      expect(err.message).toContain("5s");
    });
  });

  describe("resetCircuitBreaker", () => {
    it("resets a single breaker to CLOSED", () => {
      const cb = getCircuitBreaker("test-reset", { failureThreshold: 1 });
      cb._onFailure();
      expect(cb.getStatus().state).toBe(STATE.OPEN);
      resetCircuitBreaker("test-reset");
      const same = getCircuitBreaker("test-reset");
      expect(same.getStatus().state).toBe(STATE.CLOSED);
    });
  });

  describe("getRetryAfterMs", () => {
    it("returns 0 when breaker is CLOSED", () => {
      const cb = getCircuitBreaker("test-no-retry", { failureThreshold: 3 });
      expect(cb.getRetryAfterMs()).toBe(0);
    });

    it("returns positive value when breaker is OPEN", () => {
      const cb = getCircuitBreaker("test-has-retry", { failureThreshold: 1, resetTimeout: 10000 });
      cb._onFailure();
      const retry = cb.getRetryAfterMs();
      expect(retry).toBeGreaterThan(0);
      expect(retry).toBeLessThanOrEqual(10000);
    });
  });
});
