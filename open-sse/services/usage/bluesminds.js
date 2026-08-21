/**
 * BluesMinds — Usage & Balance Tracker
 *
 * Uses the Management API to query account balance and usage.
 * BluesMinds is a New API (one-api fork) with custom auth headers.
 *
 * Auth: Session token in Authorization header + New-Api-User: <user_id>
 * Endpoints:
 *   GET /api/user/self  → balance (quota), request_count, aff_code
 *   GET /api/token/     → per-key used_quota, unlimited_quota
 *
 * Quota units: 1 unit = $0.000001 (1 USD = 1,000,000 units)
 *
 * @module services/usage/bluesminds
 */

const UNITS_PER_DOLLAR = 1_000_000;

/**
 * Get BluesMinds account balance and usage.
 *
 * @param {string} apiKey - Session token for Management API
 * @param {object} providerSpecificData - Contains userId (New-Api-User header value)
 * @param {object} proxyOptions - Not used
 * @returns {Object} Quota data for QuotaTable
 */
export async function getBluesmindsUsage(apiKey, providerSpecificData, proxyOptions) {
  try {
    const userId = providerSpecificData?.userId;
    if (!userId) {
      return {
        quotas: {},
        message: "BluesMinds: missing userId in providerSpecificData",
      };
    }

    const baseUrl = "https://api.bluesminds.com";
    const headers = {
      "Authorization": apiKey,
      "New-Api-User": String(userId),
    };

    // Fetch user info (balance + request count)
    const userRes = await fetch(`${baseUrl}/api/user/self`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!userRes.ok) {
      return {
        quotas: {},
        message: `BluesMinds /api/user/self returned ${userRes.status}`,
      };
    }

    const userJson = await userRes.json();
    if (!userJson.success) {
      return {
        quotas: {},
        message: `BluesMinds: ${userJson.message || "unknown error"}`,
      };
    }

    const user = userJson.data;
    const remainingUnits = user.quota || 0;
    const requestCount = user.request_count || 0;

    // Fetch token-level usage details
    const tokenRes = await fetch(`${baseUrl}/api/token/`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    let usedUnits = 0;
    let isUnlimited = false;

    if (tokenRes.ok) {
      const tokenJson = await tokenRes.json();
      if (tokenJson.success && tokenJson.data?.items) {
        for (const token of tokenJson.data.items) {
          usedUnits += token.used_quota || 0;
          if (token.unlimited_quota) isUnlimited = true;
        }
      }
    }

    // Calculate balances in dollars
    const remainingDollars = remainingUnits / UNITS_PER_DOLLAR;
    const usedDollars = usedUnits / UNITS_PER_DOLLAR;

    // Total = remaining + used (approximation for unlimited accounts)
    const totalDollars = isUnlimited
      ? Math.max(remainingDollars, 100) // Unlimited accounts show $100+ balance
      : remainingDollars + usedDollars;

    const quotas = {
      "Balance": {
        displayName: "Balance",
        used: usedDollars,
        total: totalDollars,
        remaining: totalDollars > 0
          ? Math.round((remainingDollars / totalDollars) * 100)
          : 0,
        resetAt: null,
        unit: "$",
        details: isUnlimited ? "Unlimited account" : undefined,
      },
      "API Requests": {
        displayName: "API Requests",
        used: requestCount,
        total: null, // No limit known
        remaining: null,
        resetAt: null,
        unit: "requests",
      },
    };

    return {
      quotas,
      message: null,
    };
  } catch (e) {
    return {
      quotas: {},
      message: `Failed to load BluesMinds usage: ${e.message}`,
    };
  }
}
