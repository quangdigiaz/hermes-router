/**
 * 429 response classifier — distinguish rate-limit from quota-exhausted
 * from daily-quota.
 *
 * Most LLM providers return HTTP 429 for three semantically different reasons:
 *
 * 1. **rate_limit**: short transient back-off ("too many requests in the
 *    last minute"). Fix: wait ~60s and retry.
 * 2. **quota_exhausted**: long-period cap hit ("monthly limit reached",
 *    "insufficient quota", "out of credits"). Fix: wait ~1h before retrying.
 * 3. **daily_quota**: daily cap hit ("today's quota exhausted", "daily
 *    limit reached"). Fix: lock until tomorrow 00:00 UTC.
 *
 * The HTTP status alone cannot disambiguate. This helper inspects the
 * response body to return a `kind` and the appropriate `cooldownMs`.
 *
 * Ported from OmniRoute's classify429.ts, extended with the `daily_quota`
 * kind required by HermesRouter's generalized daily quota detection.
 *
 * @module open-sse/utils/classify429
 */

/** Cooldown (ms) applied when a 429 is classified as a short rate-limit. */
export const RATE_LIMIT_COOLDOWN_MS = 60_000;
/** Cooldown (ms) applied when a 429 is classified as quota exhaustion (~1h). */
export const QUOTA_EXHAUSTED_COOLDOWN_MS = 3_600_000;

/**
 * Failure kinds returned by {@link classify429}.
 * @typedef {"rate_limit" | "quota_exhausted" | "daily_quota"} FailureKind
 */

/**
 * Heuristic regexes for **daily quota** exhaustion — a cap that resets at
 * the next day boundary (00:00). Distinct from generic quota exhaustion
 * (which implies a longer billing-period cap).
 *
 * Patterns observed across OpenAI free-tier, Google Gemini, Groq, and
 * OpenRouter daily-cap responses.
 */
const DAILY_QUOTA_PATTERNS = [
  /today'?s quota/i,
  /daily quota (exhaust|exceed|reached|used)/i,
  /daily limit (exhaust|exceed|reached|used)/i,
  /per.?day (limit|quota)/i,
  /daily.*exhaust/i,
  /exhaust.*daily/i,
  /daily.*cap/i,
  /cap.*daily/i,
  /reset.*tomorrow/i,
  /try again tomorrow/i,
  /come back tomorrow/i,
  // Grok CLI free-tier daily usage (subscription:free-usage-exhausted)
  // Resets at 00:00 UTC — treat as daily_quota, not a 60s rate_limit.
  /free.*usage.*exhaust/i,
  /used all.*free usage/i,
  // Cline INFERENCE_CAP_ERROR — port from YuJunZhiXue/Cline-proxy pool.go
  /INFERENCE_CAP_ERROR/i,
  /Try again in \d+h/i,
];

/**
 * Heuristic regexes for **quota exhaustion** — a long-period cap (monthly,
 * billing-cycle, credit-based). Does NOT include daily patterns (those are
 * handled separately by {@link DAILY_QUOTA_PATTERNS}).
 *
 * Patterns observed across OpenAI, Anthropic, Groq, Cerebras, Mistral,
 * Google Gemini, OpenRouter, and Freebuff responses.
 */
const QUOTA_EXHAUSTED_PATTERNS = [
  /monthly.*limit/i,
  /monthly.*quota/i,
  /per.?month.*limit/i,
  /quota.*exceed/i,
  /exceed.*quota/i,
  /insufficient.*quota/i,
  /billing.*cap/i,
  /credit.*exhaust/i,
  /out of credits?/i,
  /hard.?limit/i,
  /plan.*limit/i,
  /resource.*exhaust/i,
  /check.*quota/i,
  /individual quota reached/i,
  /enable overages/i,
  /402.*billing/i,
  /billing.*required/i,
  /payment.*required/i,
  // Free-tier / free-model capacity exhaustion (freebuff, openrouter free, opencode, etc.)
  /free.{0,10}model.{0,10}capacity/i,
  /free.{0,10}(tier|usage).{0,10}capacity/i,
  /free.{0,10}usage.{0,10}limit/i,
  /FreeUsageLimitError/i,
  /capacity.{0,20}(exhausted|exceed|limit|reached|full|lower)/i,
  /exhausted.{0,20}capacity/i,
  // Credit/balance exhaustion (various providers)
  /insufficient.{0,10}(balance|funds|credit)/i,
  /balance.{0,10}(zero|depleted|exhausted)/i,
  /no.{0,10}(remaining|available).{0,10}(credits?|balance|funds)/i,
  /account.{0,10}(suspended|disabled|locked)/i,
];

/**
 * Universal payment required / wallet balance exhausted patterns across languages.
 * Covers English, Chinese (TeamoRouter), and Indonesian (HalloRouter).
 */
export const PAYMENT_REQUIRED_PATTERNS = [
  // Chinese
  /钱包余额不足/i,
  /余额不足/i,
  /充值后继续使用/i,
  /请前往.*充值/i,
  // Indonesian / Malay
  /token tidak mencukupi/i,
  /saldo tidak cukup/i,
  /kuota habis/i,
  // English
  /insufficient.?balance/i,
  /insufficient.?funds/i,
  /insufficient.?tokens?/i,
  /insufficient.?quota/i,
  /insufficient balance for billable/i,
  /available_quota/i,
  /min_required_credit/i,
  /min_required_quota/i,
  /payment.?required/i,
  /recharge.?required/i,
  /out of credits?/i,
  /balance.?zero/i,
  /enterprise_wallet/i,
];

/**
 * Returns true if the status or body indicates an account-level payment/balance exhaustion error.
 * @param {number|undefined} status
 * @param {unknown} body
 * @returns {boolean}
 */
export function isPaymentRequiredError(status, body) {
  if (status === 402) return true;
  const text = bodyToText(body);
  if (!text) return false;
  return PAYMENT_REQUIRED_PATTERNS.some((pat) => pat.test(text));
}

/**
 * Extracts a recharge / top-up URL from error JSON or message text.
 * @param {unknown} body
 * @param {string} [providerWebsite=""]
 * @returns {string|null}
 */
export function extractRechargeUrl(body, providerWebsite = "") {
  if (!body) return providerWebsite || null;
  // (a) Check JSON properties
  try {
    const data = typeof body === "string" ? JSON.parse(body) : body;
    if (data?.error?.details?.recharge_url) return data.error.details.recharge_url;
    if (data?.details?.recharge_url) return data.details.recharge_url;
    if (data?.recharge_url) return data.recharge_url;
  } catch {}

  // (b) Check embedded URL in message text (e.g. Orca / Teamo)
  const text = bodyToText(body);
  const urlMatch = text.match(/https?:\/\/[^\s"'<>\\]*(?:buy|billing|recharge|dashboard\?buy|topup|wallet|console\/billing)[^\s"'<>\\]*/i);
  if (urlMatch) return urlMatch[0];

  return providerWebsite || null;
}

/**
 * Coerce a body of unknown shape to a string for keyword scanning.
 * - string: returned as-is
 * - object: JSON-stringified (so nested error.message gets scanned)
 * - undefined/null: empty string
 */
function bodyToText(body) {
  if (typeof body === "string") return body;
  if (body == null) return "";
  try {
    return JSON.stringify(body);
  } catch {
    return "";
  }
}

/**
 * Returns true if the body looks like a **daily** quota-exhausted error.
 * Checked BEFORE generic quota exhaustion so daily patterns take priority.
 */
export function looksLikeDailyQuota(body) {
  const text = bodyToText(body);
  if (!text) return false;
  return DAILY_QUOTA_PATTERNS.some((pat) => pat.test(text));
}

/**
 * Returns true if the body looks like a generic quota-exhausted error
 * (monthly / billing / credit based). Does NOT match daily patterns.
 */
export function looksLikeQuotaExhausted(body) {
  const text = bodyToText(body);
  if (!text) return false;
  return QUOTA_EXHAUSTED_PATTERNS.some((pat) => pat.test(text));
}

/**
 * Gemini's per-minute RPM (rate LIMIT) messages refresh in ~60s and must NOT
 * become a 60-minute quota lock. Both look like quota errors but are generic:
 *   - "Resource has been exhausted (e.g. check quota)." (RESOURCE_EXHAUSTED)
 *   - "You exceeded your current quota, please check your plan and billing details."
 * NOTE: the RPM text mentions "plan and billing details" — bare "billing" is NOT
 * a real-cap qualifier here (it's just Gemini's standard suggestion). A REAL cap
 * carries specific qualifiers: a reset timeframe, monthly/daily limits, "quota
 * exceeded", "USER_PROJECT quota", or an actual billing/payment block. Those still
 * fall through to quota_exhausted (60-min lock).
 *
 * @param {string|object} errorText - raw error body or message
 * @returns {boolean} true when this is Gemini's generic (RPM) exhaustion phrasing
 */
export function isGeminiGenericRateLimit(errorText) {
  const text = typeof errorText === "string"
    ? errorText
    : (() => { try { return JSON.stringify(errorText); } catch { return String(errorText); } })();
  if (!text) return false;
  const isGenericResourceExhausted = /resource has been exhausted/i.test(text);
  const isGenericQuotaExceeded = /exceeded your (current )?quota/i.test(text);
  if (!isGenericResourceExhausted && !isGenericQuotaExceeded) return false;
  // Specific-cap qualifiers that mean a REAL quota/billing cap (keep 60-min lock):
  // a per-minute reset, monthly/daily limits, USER_PROJECT quota, or an actual
  // billing/payment block. NOTE: do NOT include bare "quota exceeded" — Gemini's
  // RPM body literally says "Quota exceeded for metric: .../embed_content_free_tier_requests",
  // which is the generic RPM limit, not a hard cap.
  const hasSpecificQualifier = /per[- ]?minute|rpm|daily quota|per[- ]?day|monthly|user[- ]?project|billing required|payment required|reset (tomorrow|at)|will reset/i.test(text);
  return !hasSpecificQualifier;
}

/**
 * Parse Cline INFERENCE_CAP duration — "Try again in 17h 59m" → ms
 * Port from YuJunZhiXue/Cline-proxy pool.go parseInferenceCapDuration
 * Default 18h if no duration found.
 */
export function parseInferenceCapDuration(text) {
  if (!text) return null;
  const str = String(text);
  if (!/INFERENCE_CAP_ERROR/i.test(str) && !/Try again in/i.test(str)) return null;
  const hMatch = str.match(/(\d+)\s*h/i);
  const mMatch = str.match(/(\d+)\s*m/i);
  const h = hMatch ? parseInt(hMatch[1], 10) : 0;
  const m = mMatch ? parseInt(mMatch[1], 10) : 0;
  if (h === 0 && m === 0) return 18 * 60 * 60 * 1000; // default 18h
  return (h * 60 * 60 + m * 60) * 1000;
}

/**
 * Compute the millisecond offset until the next UTC midnight (tomorrow 00:00 UTC).
 * Used as the cooldown for `daily_quota` classification.
 *
 * @param {Date} [now=new Date()]
 * @returns {number} ms until next 00:00 UTC (always > 0)
 */
export function getMsUntilTomorrowMidnightUTC(now = new Date()) {
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  ));
  return Math.max(1, next.getTime() - now.getTime());
}

/**
 * Classify a 429 response into a `FailureKind` with its cooldown in ms.
 *
 * Decision order:
 * 1. status !== 429/402/403/400 → `{ kind: "rate_limit", cooldownMs: RATE_LIMIT_COOLDOWN_MS }`
 *    (the caller is responsible for only passing relevant errors; for other
 *    statuses we still default to rate_limit cooldown as a safe fallback).
 * 2. status === 402 → `{ kind: "quota_exhausted", cooldownMs: QUOTA_EXHAUSTED_COOLDOWN_MS }`
 *    (402 Payment Required is unambiguously a billing/quota signal).
 * 3. status === 403/400 with quota keywords → `quota_exhausted`.
 *    (Some providers return 403 instead of 429 when free tier is exhausted).
 * 4. body matches a daily-quota keyword → `{ kind: "daily_quota", cooldownMs: getMsUntilTomorrowMidnightUTC() }`
 * 5. body matches a quota-exhausted keyword → `{ kind: "quota_exhausted", cooldownMs: QUOTA_EXHAUSTED_COOLDOWN_MS }`
 * 6. otherwise → `{ kind: "rate_limit", cooldownMs: RATE_LIMIT_COOLDOWN_MS }`
 *    (a 429 without explicit quota wording is per-definition a rate-limit signal).
 *
 * @param {{ status?: number, body?: unknown, headers?: Record<string, string> }} response
 * @returns {{ kind: FailureKind, cooldownMs: number }}
 */
export function classify429(response) {
  if (!response) {
    return { kind: "rate_limit", cooldownMs: RATE_LIMIT_COOLDOWN_MS };
  }
  // Gemini's generic "Resource has been exhausted" / "exceeded your current quota"
  // is its per-minute RPM limit (refreshes in ~60s), NOT a quota lock. Treat it
  // as a transient rate_limit so embeddings / high-RPS calls only wait 60s.
  if (
    (response.provider === "gemini" || response.provider === "gemini-cli") &&
    isGeminiGenericRateLimit(response.body)
  ) {
    return { kind: "rate_limit", cooldownMs: RATE_LIMIT_COOLDOWN_MS };
  }
  // Check Retry-After header: if present and valid, honor the upstream duration
  const retrySec = retryAfterFromResponse(response);
  if (retrySec !== null && retrySec > 0) {
    return { kind: "rate_limit", cooldownMs: retrySec * 1000 };
  }
  // HTTP 402 Payment Required is unambiguously a billing/quota signal.
  if (response.status === 402) {
    return { kind: "quota_exhausted", cooldownMs: QUOTA_EXHAUSTED_COOLDOWN_MS };
  }
  // HTTP 403/400 with quota/credit keywords → treat as quota_exhausted.
  // Some providers return 403 instead of 429 when the free tier is exhausted.
  if (response.status === 403 || response.status === 400) {
    const text = bodyToText(response.body);
    if (text && QUOTA_EXHAUSTED_PATTERNS.some((pat) => pat.test(text))) {
      return { kind: "quota_exhausted", cooldownMs: QUOTA_EXHAUSTED_COOLDOWN_MS };
    }
  }
  // Cline INFERENCE_CAP — precise duration (e.g. 17h 59m) → daily_quota with exact ms
  const inferenceMs = parseInferenceCapDuration(bodyToText(response.body));
  if (inferenceMs !== null) {
    return { kind: "daily_quota", cooldownMs: inferenceMs };
  }
  // Daily quota checked first — it's the most specific (daily implies a
  // midnight reset, which is shorter than the 1h quota_exhausted cooldown
  // but locks until a precise boundary).
  if (looksLikeDailyQuota(response.body)) {
    return { kind: "daily_quota", cooldownMs: getMsUntilTomorrowMidnightUTC() };
  }
  if (looksLikeQuotaExhausted(response.body)) {
    return { kind: "quota_exhausted", cooldownMs: QUOTA_EXHAUSTED_COOLDOWN_MS };
  }
  return { kind: "rate_limit", cooldownMs: RATE_LIMIT_COOLDOWN_MS };
}

/**
 * Adapter that takes an error thrown by an HTTP client (fetch wrapper,
 * upstream SDK, etc.) and produces a classified result.
 *
 * Recognises common error shapes:
 * - `err.status` + `err.body` (low-level fetch wrapper)
 * - `err.response.status` + `err.response.data` (axios-style)
 * - `err.message` (last-resort body for keyword scan)
 *
 * @param {unknown} err
 * @returns {{ kind: FailureKind, cooldownMs: number } | null} null when the
 *   error doesn't carry enough information to classify.
 */
export function classify429FromError(err) {
  if (err === null || typeof err !== "object") return null;
  const e = err;

  let status;
  let body;

  if (typeof e.status === "number") {
    status = e.status;
  } else if (typeof e.statusCode === "number") {
    status = e.statusCode;
  }

  if (e.response && typeof e.response === "object") {
    const resp = e.response;
    if (typeof resp.status === "number" && status === undefined) {
      status = resp.status;
    }
    if (resp.data !== undefined) {
      body = resp.data;
    } else if (resp.body !== undefined) {
      body = resp.body;
    }
  }

  if (body === undefined) {
    if (e.body !== undefined) {
      body = e.body;
    } else if (typeof e.message === "string") {
      body = e.message;
    }
  }

  // Only classify if we have a 429 status (or no status at all, in which
  // case we still attempt a body-based classification as a fallback).
  if (typeof status === "number" && status !== 429) return null;

  return classify429({ status: status ?? 429, body });
}

/**
 * Parse a `Retry-After` header value into seconds.
 *
 * Accepts:
 * - integer seconds: `"60"`
 * - HTTP date: `"Wed, 08 May 2026 03:00:00 GMT"`
 * - Groq-style relative: `"60s"`, `"5m"`, `"2h"`
 *
 * Returns `null` if unparseable.
 */
export function parseRetryAfter(headerValue) {
  if (!headerValue) return null;
  const trimmed = String(headerValue).trim();
  if (!trimmed) return null;

  // Groq-style relative: must check BEFORE plain int parse.
  const relMatch = trimmed.match(/^(\d+)([smh])$/i);
  if (relMatch) {
    const n = Number(relMatch[1]);
    const unit = relMatch[2].toLowerCase();
    if (Number.isFinite(n)) {
      if (unit === "s") return n;
      if (unit === "m") return n * 60;
      if (unit === "h") return n * 3600;
    }
  }

  // Pure integer seconds.
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }

  // HTTP date.
  const ts = Date.parse(trimmed);
  if (Number.isFinite(ts)) {
    return Math.max(0, Math.floor((ts - Date.now()) / 1000));
  }

  return null;
}

/**
 * Best-effort case-insensitive header lookup from a plain object or Headers.
 */
function getHeader(headers, name) {
  if (!headers) return undefined;
  const target = name.toLowerCase();
  // Native Headers instance
  if (typeof headers.get === "function") {
    const v = headers.get(name);
    if (v) return v;
  }
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === target) return v;
  }
  return undefined;
}

/**
 * Convenience wrapper: pull the Retry-After from a response's headers
 * and parse it to seconds. Returns null if absent or unparseable.
 */
export function retryAfterFromResponse(response) {
  if (!response) return null;
  return parseRetryAfter(getHeader(response.headers, "retry-after"));
}
