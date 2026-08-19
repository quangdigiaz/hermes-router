import { describe, it, expect } from "vitest";
import { isPaymentRequiredError, extractRechargeUrl, classify429 } from "open-sse/utils/classify429.js";

describe("Payment Required Multi-Provider Classification", () => {
  const REAL_WORLD_PAYWALL_LOGS = {
    teamo: {
      status: 402,
      body: '{"error":{"message":"TeamoRouter 钱包余额不足，请前往 https://teamorouter.com/dashboard?buy=1 充值后继续使用","type":"insufficient_balance","code":402,"details":{"source":"enterprise_wallet","reason":"insufficient_funds","http_status":402,"paywall":true,"paywall_site":"teamorouter","recharge_url":"https://teamorouter.com/dashboard?buy=1"}},"trace_id":"5d1d3661-4e52-4266-bb1a-9d612dccf306"}',
    },
    yescale: {
      status: 402,
      body: '{"error":{"available_quota":-2346,"code":"insufficient_balance","message":"This workspace has insufficient balance for billable AI requests.","min_required_credit":"$0.010000","min_required_quota":5000,"request_id":"20260819195243778196657QFS9QsvM"}}',
    },
    hallo: {
      status: 402,
      body: '{"error":{"code":"insufficient_tokens","message":"Token tidak mencukupi.","type":"hallorouter_error","param":null},"request_id":"c035ef2de797770a568556c4b3fdef15"}',
    },
    orca_rate: {
      status: 429,
      headers: { "retry-after": "45" },
      body: '{"error":{"code":"free_rate_limited","message":"free model capacity is limited right now — upgrade or top up to get higher, more stable limits: https://www.orcarouter.ai/console/billing | Recharging will increase your access frequency.","type":"orcarouter_api_error"}}',
    },
    orca_prompt_cap: {
      status: 429,
      headers: {},
      body: '{"error":{"code":"free_rate_limited","message":"free model capacity is limited right now — upgrade or top up to get higher, more stable limits: https://www.orcarouter.ai/console/billing","type":"orcarouter_api_error"}}',
    },
  };

  it("identifies TeamoRouter 402 Chinese paywall and extracts recharge URL", () => {
    const { status, body } = REAL_WORLD_PAYWALL_LOGS.teamo;
    expect(isPaymentRequiredError(status, body)).toBe(true);
    expect(extractRechargeUrl(body)).toBe("https://teamorouter.com/dashboard?buy=1");
  });

  it("identifies YesScale 402 English negative quota error", () => {
    const { status, body } = REAL_WORLD_PAYWALL_LOGS.yescale;
    expect(isPaymentRequiredError(status, body)).toBe(true);
  });

  it("identifies HalloRouter 402 Indonesian insufficient tokens error", () => {
    const { status, body } = REAL_WORLD_PAYWALL_LOGS.hallo;
    expect(isPaymentRequiredError(status, body)).toBe(true);
  });

  it("extracts embedded recharge URL from message text (OrcaRouter)", () => {
    const { body } = REAL_WORLD_PAYWALL_LOGS.orca_prompt_cap;
    expect(extractRechargeUrl(body)).toBe("https://www.orcarouter.ai/console/billing");
  });

  it("classifies OrcaRouter 429 with retry-after header as transient rate limit", () => {
    const { status, headers, body } = REAL_WORLD_PAYWALL_LOGS.orca_rate;
    const res = classify429({ status, headers, body, provider: "orcarouter" });
    expect(res.kind).toBe("rate_limit");
    expect(res.cooldownMs).toBe(45000); // 45 seconds from Retry-After: 45
  });

  it("classifies OrcaRouter 429 without retry-after header as quota exhausted (1h cooldown)", () => {
    const { status, headers, body } = REAL_WORLD_PAYWALL_LOGS.orca_prompt_cap;
    const res = classify429({ status, headers, body, provider: "orcarouter" });
    expect(res.kind).toBe("quota_exhausted");
    expect(res.cooldownMs).toBe(3600000); // 1 hour
  });
});
