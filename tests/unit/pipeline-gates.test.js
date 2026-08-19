// Tests for pipeline gates — circuit breaker check BEFORE credential lookup.
import { describe, it, expect, beforeEach } from "vitest";
import {
  isProviderFullyBlocked,
  getProviderShortestCooldownMs,
  recordProviderFailure,
  clearProviderFailure,
  clearProviderFailureDedup,
} from "open-sse/services/accountFallback.js";
import { resetAllCircuitBreakers } from "open-sse/utils/circuitBreaker.js";

function resetAll() {
  resetAllCircuitBreakers();
  clearProviderFailureDedup();
}

describe("Pipeline gates — isProviderFullyBlocked", () => {
  beforeEach(resetAll);

  it("returns false when no breakers are registered", () => {
    expect(isProviderFullyBlocked("test-provider")).toBe(false);
  });

  it("returns false when breaker is CLOSED (can execute)", () => {
    recordProviderFailure("test-provider", 500, "server error", null, "conn-1", "direct");
    expect(isProviderFullyBlocked("test-provider")).toBe(false);
  });

  it("returns true when ALL proxy buckets for a provider are OPEN", () => {
    for (let i = 0; i < 5; i++) {
      recordProviderFailure("blocked-provider", 500, "server error", null, `conn-${i}`, "direct");
    }
    expect(isProviderFullyBlocked("blocked-provider")).toBe(true);
  });

  it("returns false when at least one proxy bucket can still execute", () => {
    for (let i = 0; i < 5; i++) {
      recordProviderFailure("mixed-provider", 500, "server error", null, `conn-${i}`, "direct");
    }
    // Register (but don't trip) another bucket
    recordProviderFailure("mixed-provider", 500, "server error", null, "conn-x", "proxy-a");
    expect(isProviderFullyBlocked("mixed-provider")).toBe(false);
  });

  it("only matches the exact provider (no false positives on prefix)", () => {
    for (let i = 0; i < 5; i++) {
      recordProviderFailure("provider-a", 500, "err", null, `conn-${i}`, "direct");
    }
    expect(isProviderFullyBlocked("provider-a")).toBe(true);
    expect(isProviderFullyBlocked("provider-ab")).toBe(false);
  });
});

describe("Pipeline gates — getProviderShortestCooldownMs", () => {
  beforeEach(resetAll);

  it("returns 0 when no breakers are registered", () => {
    expect(getProviderShortestCooldownMs("test-provider")).toBe(0);
  });

  it("returns 0 when breaker is CLOSED", () => {
    recordProviderFailure("test-provider", 500, "err", null, "conn-1", "direct");
    expect(getProviderShortestCooldownMs("test-provider")).toBe(0);
  });

  it("returns remaining cooldown when breaker is OPEN", () => {
    for (let i = 0; i < 5; i++) {
      recordProviderFailure("blocked-provider", 500, "err", null, `conn-${i}`, "direct");
    }
    expect(isProviderFullyBlocked("blocked-provider")).toBe(true);
    const cooldown = getProviderShortestCooldownMs("blocked-provider");
    expect(cooldown).toBeGreaterThan(0);
    expect(cooldown).toBeLessThanOrEqual(30_000);
  });
});

describe("Pipeline gates — clearProviderFailure unblocks", () => {
  beforeEach(resetAll);

  it("clearing the breaker makes isProviderFullyBlocked return false", () => {
    for (let i = 0; i < 5; i++) {
      recordProviderFailure("clearable-provider", 500, "err", null, `conn-${i}`, "direct");
    }
    expect(isProviderFullyBlocked("clearable-provider")).toBe(true);
    clearProviderFailure("clearable-provider", "direct");
    expect(isProviderFullyBlocked("clearable-provider")).toBe(false);
  });
});
