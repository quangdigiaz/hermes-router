// Verify provider resilience profiles assign different thresholds per category.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getProviderResilienceProfile, clearProviderResilienceCache } from "../../open-sse/config/providerProfiles.js";
import { recordProviderFailure, clearProviderFailureDedup, isProviderInCooldown } from "../../open-sse/services/accountFallback.js";
import { resetAllCircuitBreakers } from "../../open-sse/utils/circuitBreaker.js";

const log = { warn: vi.fn(), info: vi.fn() };

function failUntilOpen(provider, proxyHash = "direct", max = 50) {
  for (let i = 0; i < max; i++) {
    recordProviderFailure(provider, 500, "boom", log, `conn-${i}`, proxyHash);
    if (isProviderInCooldown(provider, proxyHash)) return i + 1;
  }
  return -1;
}

describe("provider resilience profiles", () => {
  beforeEach(() => {
    clearProviderResilienceCache();
    clearProviderFailureDedup();
    resetAllCircuitBreakers();
  });

  afterEach(() => {
    resetAllCircuitBreakers();
  });

  it("returns apikey defaults for unknown providers", () => {
    const profile = getProviderResilienceProfile("some-apikey-provider");
    expect(profile.providerFailureThreshold).toBe(5);
    expect(profile.providerFailureWindowMs).toBe(30_000);
    expect(profile.providerCooldownMs).toBe(30_000);
  });

  it("uses apikey defaults for known apikey providers (e.g. openai)", () => {
    const profile = getProviderResilienceProfile("openai");
    expect(profile.providerFailureThreshold).toBe(5);
    expect(profile.providerFailureWindowMs).toBe(30_000);
    expect(profile.providerCooldownMs).toBe(30_000);
  });

  it("uses oauth defaults for oauth providers (e.g. antigravity)", () => {
    const profile = getProviderResilienceProfile("antigravity");
    expect(profile.providerFailureThreshold).toBe(10);
    expect(profile.providerFailureWindowMs).toBe(15 * 60 * 1000);
    expect(profile.providerCooldownMs).toBe(5 * 60 * 1000);
  });

  it("uses local defaults for local providers", () => {
    const profile = getProviderResilienceProfile("ollama");
    expect(profile.providerFailureThreshold).toBe(2);
    expect(profile.providerFailureWindowMs).toBe(5 * 60 * 1000);
    expect(profile.providerCooldownMs).toBe(60 * 1000);
  });

  it("opens an apikey provider breaker after the default 5 failures", () => {
    const failures = failUntilOpen("openai");
    expect(failures).toBe(5);
    expect(isProviderInCooldown("openai")).toBe(true);
  });

  it("opens an oauth provider breaker only after more failures", () => {
    const failures = failUntilOpen("antigravity");
    expect(failures).toBe(10);
    expect(isProviderInCooldown("antigravity")).toBe(true);
  });

  it("caches provider category lookups", () => {
    const a = getProviderResilienceProfile("openai");
    const b = getProviderResilienceProfile("openai");
    expect(a).toBe(b);
  });
});
