/**
 * Kilo Gateway — Free Model Rate Limit Tracker
 *
 * Kilo Gateway free models (pricing.prompt === "0") are rate-limited at
 * 200 requests per hour per IP. This handler queries the local usageHistory
 * table to count requests in the current rolling hour window.
 *
 * Paid models have no gateway-level rate limit (only upstream limits).
 *
 * @module services/usage/kilo-gateway
 */

const FREE_RATE_LIMIT = 200;
const FREE_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Free model IDs from Kilo Gateway API (2026-08-21)
// These have pricing.prompt === "0" and isFree === true
const FREE_MODEL_IDS = [
  "kilo-auto/free",
  "stepfun/step-3.7-flash:free",
  "tencent/hy3:free",
  "poolside/laguna-s-2.1:free",
  "meituan/longcat-2.0-free",
  "stealth/ox-alpha",
  "dots-studio/dots-3-note-preview:free",
  "liquid/lfm-2.5-2.6b:free",
  "nvidia/nemotron-3.5-lightning:free",
  "poolside/laguna-xs-2.1:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "minimax/minimax-m2.5:free",
  "arcee-ai/trinity-large-preview:free",
  "deepseek/deepseek-v4-flash-0731:free",
  "stepfun/step-3.7-flash-preview:free",
  "tencent/hy2.5:free",
  "moonshotai/kimi-k2.5:free",
  "z-ai/glm-4.5-flash:free",
];

/**
 * Get free model rate limit usage for Kilo Gateway.
 * Counts requests to free models in the last rolling hour.
 *
 * @param {string} apiKey - Not used (local DB query)
 * @param {object} proxyOptions - Not used
 * @returns {Object} Quota data for QuotaTable
 */
export async function getKiloGatewayUsage(apiKey, proxyOptions) {
  try {
    const { getDb } = await import("@/lib/db/index.js");
    const db = getDb();

    const oneHourAgo = new Date(Date.now() - FREE_RATE_WINDOW_MS).toISOString();

    // Count total requests to free models in the last hour
    const row = db.get(
      `SELECT COUNT(*) AS requestCount
       FROM usageHistory
       WHERE provider = 'kilo-gateway'
         AND createdAt >= ?
         AND model IN (${FREE_MODEL_IDS.map(() => "?").join(",")})`,
      [oneHourAgo, ...FREE_MODEL_IDS]
    );

    const used = row?.requestCount || 0;
    const remaining = Math.max(0, FREE_RATE_LIMIT - used);
    const remainingPercentage = FREE_RATE_LIMIT > 0
      ? Math.round((remaining / FREE_RATE_LIMIT) * 100)
      : 0;

    // Calculate when the oldest request in the window will expire
    const oldestRow = db.get(
      `SELECT MIN(createdAt) AS oldest
       FROM usageHistory
       WHERE provider = 'kilo-gateway'
         AND createdAt >= ?
         AND model IN (${FREE_MODEL_IDS.map(() => "?").join(",")})`,
      [oneHourAgo, ...FREE_MODEL_IDS]
    );

    let resetAt = null;
    if (oldestRow?.oldest) {
      const resetTime = new Date(new Date(oldestRow.oldest).getTime() + FREE_RATE_WINDOW_MS);
      if (resetTime > new Date()) {
        resetAt = resetTime.toISOString();
      }
    }

    const quotas = {
      "Free Models (200 req/hr)": {
        displayName: "Free Models Rate Limit",
        used,
        total: FREE_RATE_LIMIT,
        remaining: remainingPercentage,
        resetAt,
        // Include breakdown by model
        details: `Rolling 1-hour window · ${FREE_MODEL_IDS.length} free models available`,
      },
    };

    return {
      quotas,
      message: null,
    };
  } catch (e) {
    return {
      quotas: {},
      message: `Failed to load Kilo Gateway usage: ${e.message}`,
    };
  }
}
