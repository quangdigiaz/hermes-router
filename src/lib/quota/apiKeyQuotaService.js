import { getAdapter } from "@/lib/db/driver.js";

// In-memory sliding window for per-key RPM rate limiting
if (!global._apiKeyRpmWindows) {
  global._apiKeyRpmWindows = new Map();
}
const _rpmWindows = global._apiKeyRpmWindows;

/**
 * Get ISO date boundary string for quota period calculation
 * @param {"none" | "daily" | "monthly"} period
 * @returns {string | null}
 */
export function getPeriodStartTimestamp(period) {
  const now = new Date();
  if (period === "daily") {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return startOfDay.toISOString();
  }
  if (period === "monthly") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return startOfMonth.toISOString();
  }
  return null; // "none" = lifetime (all-time)
}

/**
 * Get token usage and budget spend summary for a given API key within its quota period.
 * @param {string} apiKeyString
 * @param {"none" | "daily" | "monthly"} quotaPeriod
 * @returns {Promise<{ usedTokens: number, usedBudget: number, totalRequests: number }>}
 */
export async function getApiKeyUsageSummary(apiKeyString, quotaPeriod = "none") {
  if (!apiKeyString || typeof apiKeyString !== "string") {
    return { usedTokens: 0, usedBudget: 0, totalRequests: 0 };
  }

  try {
    const db = await getAdapter();
    const periodStart = getPeriodStartTimestamp(quotaPeriod);

    let query = `
      SELECT 
        SUM(COALESCE(promptTokens, 0) + COALESCE(completionTokens, 0)) as totalTokens,
        SUM(COALESCE(cost, 0)) as totalCost,
        COUNT(*) as totalRequests
      FROM usageHistory
      WHERE apiKey = ?
    `;
    const params = [apiKeyString];

    if (periodStart) {
      query += ` AND timestamp >= ?`;
      params.push(periodStart);
    }

    const row = db.get(query, params);

    return {
      usedTokens: Number(row?.totalTokens || 0),
      usedBudget: Number(row?.totalCost || 0),
      totalRequests: Number(row?.totalRequests || 0),
    };
  } catch (error) {
    console.error("[QuotaService] Error fetching API key usage:", error);
    return { usedTokens: 0, usedBudget: 0, totalRequests: 0 };
  }
}

/**
 * Check and record in-memory RPM (Requests Per Minute) sliding window
 * @param {string} keyString
 * @param {number | null} rpmLimit
 * @returns {{ ok: boolean, error?: string, remaining?: number }}
 */
export function checkRpmLimit(keyString, rpmLimit) {
  if (!rpmLimit || typeof rpmLimit !== "number" || rpmLimit <= 0) {
    return { ok: true };
  }

  const now = Date.now();
  const windowMs = 60 * 1000;
  const cutoff = now - windowMs;

  let timestamps = _rpmWindows.get(keyString) || [];
  // Evict timestamps older than 60s
  timestamps = timestamps.filter((t) => t > cutoff);

  if (timestamps.length >= rpmLimit) {
    return {
      ok: false,
      error: `Rate limit exceeded (Max ${rpmLimit} requests per minute)`,
      remaining: 0,
    };
  }

  // Record current request
  timestamps.push(now);
  _rpmWindows.set(keyString, timestamps);

  return {
    ok: true,
    remaining: Math.max(0, rpmLimit - timestamps.length),
  };
}

/**
 * Validate all Quota, Rate Limit, Expiration and Model restrictions for an API key.
 * @param {object} apiKeyInfo - Resolved API key object from DB
 * @param {string} [requestedModel] - Model ID or combo name requested
 * @returns {Promise<{ ok: boolean, status?: number, error?: string }>}
 */
export async function checkApiKeyQuotaAndLimits(apiKeyInfo, requestedModel = null) {
  if (!apiKeyInfo) return { ok: true }; // No key or local bypass

  // 1. Check Active Status
  if (apiKeyInfo.isActive === false) {
    return {
      ok: false,
      status: 401,
      error: "API key is paused or inactive",
    };
  }

  // 2. Check Expiration Date
  if (apiKeyInfo.expiresAt) {
    const expireDate = new Date(apiKeyInfo.expiresAt);
    if (!isNaN(expireDate.getTime()) && expireDate < new Date()) {
      return {
        ok: false,
        status: 401,
        error: `API key expired on ${expireDate.toISOString()}`,
      };
    }
  }

  // 3. Check Allowed Models List (null = all, [] = none, [models] = specific)
  if (apiKeyInfo.allowedModels !== null && apiKeyInfo.allowedModels !== undefined) {
    const allowed = apiKeyInfo.allowedModels;
    if (!Array.isArray(allowed) || allowed.length === 0) {
      return {
        ok: false,
        status: 403,
        error: "No models are permitted for this API key",
      };
    }
    if (requestedModel) {
      const isDirectMatch = allowed.includes(requestedModel);
      const isComboMatch = allowed.some((m) => requestedModel.startsWith("combo/") && m === requestedModel.slice(6));
      if (!isDirectMatch && !isComboMatch) {
        return {
          ok: false,
          status: 403,
          error: `Model '${requestedModel}' is not permitted for this API key`,
        };
      }
    }
  }

  // 4. Check RPM Rate Limit
  if (apiKeyInfo.rpmLimit && apiKeyInfo.rpmLimit > 0) {
    const rpmCheck = checkRpmLimit(apiKeyInfo.key, apiKeyInfo.rpmLimit);
    if (!rpmCheck.ok) {
      return {
        ok: false,
        status: 429,
        error: rpmCheck.error,
      };
    }
  }

  // 5. Check Token Limit & Budget Limit
  if (apiKeyInfo.tokenLimit || apiKeyInfo.budgetLimit) {
    const summary = await getApiKeyUsageSummary(apiKeyInfo.key, apiKeyInfo.quotaPeriod || "none");

    if (apiKeyInfo.tokenLimit && summary.usedTokens >= apiKeyInfo.tokenLimit) {
      const periodLabel = apiKeyInfo.quotaPeriod && apiKeyInfo.quotaPeriod !== "none" ? ` (${apiKeyInfo.quotaPeriod})` : "";
      return {
        ok: false,
        status: 402,
        error: `Token quota exceeded${periodLabel} for this API key (Used: ${summary.usedTokens.toLocaleString()} / Limit: ${apiKeyInfo.tokenLimit.toLocaleString()} tokens)`,
      };
    }

    if (apiKeyInfo.budgetLimit && summary.usedBudget >= apiKeyInfo.budgetLimit) {
      const periodLabel = apiKeyInfo.quotaPeriod && apiKeyInfo.quotaPeriod !== "none" ? ` (${apiKeyInfo.quotaPeriod})` : "";
      return {
        ok: false,
        status: 402,
        error: `Budget limit exceeded${periodLabel} for this API key (Spent: $${summary.usedBudget.toFixed(4)} / Limit: $${apiKeyInfo.budgetLimit.toFixed(2)})`,
      };
    }
  }

  return { ok: true };
}
