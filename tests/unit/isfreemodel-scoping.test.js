import { describe, it, expect } from "vitest";
import { isFreeModel, getPromoPriceSync, PROMO_PRICING } from "../../open-sse/config/benchmarks.js";

/**
 * Regression guards for isFreeModel / PROMO_PRICING scoping.
 *
 * Bug context (2026-08-22): PROMO_PRICING matched by model NAME only, so 0-promo
 * rows for one provider's trial leaked "free" onto PAID endpoints of other
 * providers hosting a same-named model (e.g. deepseek/DeepSeek-V4-Pro).
 */

describe("getPromoPriceSync provider scoping", () => {
  it("scoped entry does NOT leak to a different provider", () => {
    PROMO_PRICING.push({ model: "zz-test-model", provider: "prov-a", promoInput: 0, promoOutput: 0, validUntil: null });
    try {
      expect(getPromoPriceSync("prov-a/zz-test-model", "prov-a")).not.toBeNull();
      expect(getPromoPriceSync("prov-b/zz-test-model", "prov-b")).toBeNull();
      // conservative: scoped entry requires explicit provider match
      expect(getPromoPriceSync("prov-b/zz-test-model")).toBeNull();
    } finally {
      PROMO_PRICING.pop();
    }
  });

  it("legacy entry without provider keeps match-any behaviour", () => {
    const promo = getPromoPriceSync("anything/mimo-v2.5", "whatever");
    expect(promo).not.toBeNull();
    expect(promo.promoInput).toBe(0.14);
  });

  it("expired validUntil entries are ignored", () => {
    PROMO_PRICING.push({ model: "zz-expired", promoInput: 0, promoOutput: 0, validUntil: "2000-01-01T00:00:00Z" });
    try {
      expect(getPromoPriceSync("zz-expired")).toBeNull();
    } finally {
      PROMO_PRICING.pop();
    }
  });
});

describe("isFreeModel signals", () => {
  it("paid model must NOT be flagged free via another provider's trial promo", () => {
    // Pre-fix this returned true: PROMO_PRICING had name-only DeepSeek-V4-Pro @ 0
    // (BytePlus/Volcengine trial credits misread as permanent free).
    expect(isFreeModel("deepseek/DeepSeek-V4-Pro", "deepseek")).toBe(false);
  });

  it("registry category 'free' counts when registry is passed", () => {
    const reg = new Map([["myfree-lane", { id: "myfree-lane", category: "free" }]]);
    expect(isFreeModel("whatever-model", "myfree-lane", reg)).toBe(true);
  });

  it("registry category 'apikey' does not count as free", () => {
    const reg = new Map([["paid-guy", { id: "paid-guy", category: "apikey" }]]);
    expect(isFreeModel("whatever-model", "paid-guy", reg)).toBe(false);
  });

  it(":free suffix stays free regardless of provider", () => {
    expect(isFreeModel("openrouter/gpt-oss-120b:free", "openrouter")).toBe(true);
  });
});
