/**
 * Misc usage handlers (Qwen, iFlow, Ollama, GLM, Vercel AI Gateway, Qoder)
 */

import { proxyAwareFetch } from "../../utils/proxyFetch.js";
import { U } from "./shared.js";

// GLM quota endpoints (region-aware) — url from registry transport.usage
const GLM_QUOTA_URLS = {
  international: U("glm").url,
  china: U("glm-cn").url,
};

// Vercel AI Gateway credits endpoint
// Returns { balance: "95.50", total_used: "4.50" } (USD as decimal strings).
const VERCEL_AI_GATEWAY_CREDITS_URL = U("vercel-ai-gateway").url;

/**
 * Qwen Usage
 */
export async function getQwenUsage(accessToken, providerSpecificData) {
  try {
    const resourceUrl = providerSpecificData?.resourceUrl;
    if (!resourceUrl) {
      return { message: "Qwen connected. No resource URL available." };
    }

    // Qwen may have usage endpoint at resource URL
    return { message: "Qwen connected. Usage tracked per request." };
  } catch (error) {
    return { message: "Unable to fetch Qwen usage." };
  }
}

/**
 * iFlow Usage
 */
export async function getIflowUsage(accessToken) {
  try {
    // iFlow may have usage endpoint
    return { message: "iFlow connected. Usage tracked per request." };
  } catch (error) {
    return { message: "Unable to fetch iFlow usage." };
  }
}

/**
 * Ollama Cloud Usage
 * Ollama Cloud uses an API key from ollama.com/settings/keys
 * and has no public usage API — free tier has light usage limits (resets every 5h & 7d).
 * This returns an informational message with the plan details.
 */
export async function getOllamaUsage(accessToken, providerSpecificData) {
  try {
    // Ollama Cloud does not expose a public quota/usage API.
    // The provider is configured as noAuth with a notice explaining limits.
    // We return a graceful message so the UI shows a friendly state instead of an error.
    const plan = providerSpecificData?.plan || "Free";
    return {
      plan,
      message: "Ollama Cloud uses a free tier with light usage limits (resets every 5h & 7d). For detailed usage tracking, visit ollama.com/settings/keys.",
      quotas: [],
    };
  } catch (error) {
    return { message: "Unable to fetch Ollama Cloud usage." };
  }
}

/**
 * GLM Coding Plan usage (international + China regions)
 */
export async function getGlmUsage(apiKey, provider, proxyOptions = null) {
  if (!apiKey) {
    return { message: "GLM API key not available." };
  }

  const region = provider === "glm-cn" ? "china" : "international";
  const quotaUrl = GLM_QUOTA_URLS[region];

  try {
    const response = await proxyAwareFetch(quotaUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    }, proxyOptions);

    if (!response.ok) {
      if (response.status === 401) {
        return { message: "GLM API key invalid or expired." };
      }
      return { message: `GLM quota API error (${response.status}).` };
    }

    const json = await response.json();
    const data = json?.data && typeof json.data === "object" ? json.data : {};
    const limits = Array.isArray(data.limits) ? data.limits : [];
    const quotas = {};

    for (const limit of limits) {
      if (!limit || limit.type !== "TOKENS_LIMIT") continue;
      const usedPercent = Number(limit.percentage) || 0;
      const resetMs = Number(limit.nextResetTime) || 0;
      const remaining = Math.max(0, 100 - usedPercent);

      quotas["session"] = {
        used: usedPercent,
        total: 100,
        remaining,
        remainingPercentage: remaining,
        resetAt: resetMs > 0 ? new Date(resetMs).toISOString() : null,
        unlimited: false,
      };
    }

    const levelRaw = typeof data.level === "string" ? data.level : "";
    const plan = levelRaw
      ? levelRaw.charAt(0).toUpperCase() + levelRaw.slice(1).toLowerCase()
      : "Unknown";

    return { plan, quotas };
  } catch (error) {
    return { message: `GLM error: ${error.message}` };
  }
}

/**
 * Vercel AI Gateway usage — credit balance for the API key
 *
 * Calls GET /v1/credits which returns:
 *   { "balance": "95.50", "total_used": "4.50" }   (USD as decimal strings)
 *
 * We surface this as a single "Balance ($)" quota row so the existing
 * QuotaTable / progress-bar UI can render it. used = total_used,
 * total = balance + total_used (the original credit allotment), so the
 * remaining percentage equals balance / total.
 *
 * Docs: https://vercel.com/docs/ai-gateway/usage
 */
export async function getVercelAiGatewayUsage(apiKey, proxyOptions = null) {
  if (!apiKey) {
    return { message: "Vercel AI Gateway API key not available." };
  }

  try {
    const response = await proxyAwareFetch(VERCEL_AI_GATEWAY_CREDITS_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    }, proxyOptions);

    if (response.status === 401 || response.status === 403) {
      return { message: "Vercel AI Gateway API key invalid or expired." };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const trimmed = errorText ? `: ${errorText.slice(0, 200)}` : "";
      return { message: `Vercel AI Gateway credits API error (${response.status})${trimmed}` };
    }

    const data = await response.json();

    // Vercel returns numeric strings; coerce safely.
    const balance = Number(data?.balance) || 0;
    const totalUsed = Number(data?.total_used) || 0;

    // Vercel gives $5/month free credit. The API doesn't return the
    // monthly allocation so we use the known constant as the denominator.
    const MONTHLY_CREDIT = 5;
    const remainingPercentage = (balance / MONTHLY_CREDIT) * 100;

    if (balance <= 0 && totalUsed <= 0) {
      return {
        plan: "Pay-as-you-go",
        message: "Vercel AI Gateway connected. No credit allocation found (BYOK or unfunded account).",
        quotas: {},
      };
    }

    // "Used (USD)": how much has been spent this month (no fixed cap → unlimited).
    // "Remaining (USD)": balance remaining out of the $5 monthly allocation.
    return {
      plan: "Pay-as-you-go",
      quotas: {
        "Used (USD)": {
          used: totalUsed,
          total: 0,
          remaining: 0,
          remainingPercentage: 100,
          unlimited: true,
        },
        "Remaining (USD)": {
          used: balance,
          total: MONTHLY_CREDIT,
          remaining: balance,
          remainingPercentage,
          unlimited: false,
        },
      },
    };
  } catch (error) {
    return { message: `Vercel AI Gateway error: ${error.message}` };
  }
}

export async function getQoderUsage(accessToken, proxyOptions = null) {
  if (!accessToken) {
    return { message: "Qoder usage unavailable: no access token" };
  }
  try {
    const response = await proxyAwareFetch(
      U("qoder").url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
      proxyOptions,
    );
    if (!response.ok) {
      return { message: `Qoder connected. Usage fetch returned ${response.status}.` };
    }
    const body = await response.json().catch(() => null);
    if (!body) {
      return { message: "Qoder connected. Usage response was not JSON." };
    }
    // Quota records live under `quotas`; scalar metadata
    // (totalUsagePercentage, isQuotaExceeded, expiresAt) are surfaced as
    // siblings so the dashboard parser doesn't try to render them as rows.
    const userQuota = body.userQuota || {};
    const orgQuota = body.orgResourcePackage || {};
    // Qoder publishes a single absolute reset timestamp (`expiresAt` in ms);
    // surface it on every quota record as ISO so the table can render
    // "resets at" alongside used/total.
    const expiresAtMs = Number.isFinite(Number(body.expiresAt)) && Number(body.expiresAt) > 0
      ? Number(body.expiresAt)
      : null;
    const resetAt = expiresAtMs ? new Date(expiresAtMs).toISOString() : null;
    const quotas = {
      user: {
        total: Number(userQuota.total) || 0,
        used: Number(userQuota.used) || 0,
        remaining: Number(userQuota.remaining) || 0,
        unit: userQuota.unit || "credits",
        resetAt,
      },
      organization: {
        total: Number(orgQuota.total) || 0,
        used: Number(orgQuota.used) || 0,
        remaining: Number(orgQuota.remaining) || 0,
        unit: orgQuota.unit || "credits",
        resetAt,
      },
    };
    return {
      quotas,
      totalUsagePercentage: Number(body.totalUsagePercentage) || 0,
      isQuotaExceeded: !!body.isQuotaExceeded,
      expiresAt: expiresAtMs,
    };
  } catch (error) {
    return { message: `Qoder connected. Unable to fetch usage: ${error.message}` };
  }
}

/**
 * Token Harbor Usage & Free Allowance tracker
 */
export async function getTokenHarborUsage(apiKey, proxyOptions = null) {
  try {
    return {
      plan: "Free Tier & Pay-As-You-Go",
      message: "Token Harbor provides a rolling 7×24-hour free allowance for :free models (measured by list-price value). For real-time balance and personal allowance progress, visit tokenharbor.ai/dashboard.",
      quotas: {
        freeAllowance: {
          name: "Free Allowance (Rolling 7×24h)",
          type: "allowance",
          period: "7d",
          unit: "%",
          message: "Resets every rolling 7×24 hours from your first free request.",
        },
      },
      notice: "Ensure 'Free models enabled' is toggled ON in Token Harbor dashboard to use :free models. Paid routes remain 100% Zero Data Retention (ZDR).",
    };
  } catch (error) {
    return { message: "Unable to fetch Token Harbor usage." };
  }
}

/**
 * TeamoRouter Usage, Cost & Balance tracker
 */
export async function getTeamoRouterUsage(apiKey, proxyOptions = null) {
  if (!apiKey) {
    return { message: "TeamoRouter API key not available." };
  }

  const cleanKey = apiKey.trim();
  const headers = {
    Authorization: `Bearer ${cleanKey}`,
    Accept: "application/json",
  };

  try {
    const baseHosts = ["https://teamorouter.com", "https://api.teamorouter.com"];
    let balanceData = null;
    let costData = null;
    let tokenData = null;

    const now = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - 7 * 86400;

    for (const host of baseHosts) {
      try {
        const balRes = await proxyAwareFetch(`${host}/v1/billing/balance`, { headers }, proxyOptions);
        if (balRes.ok) {
          balanceData = await balRes.json();
          
          // Also fetch 7-day cost and token usage
          const [costRes, usageRes] = await Promise.allSettled([
            proxyAwareFetch(`${host}/v1/billing/costs?start_time=${sevenDaysAgo}&end_time=${now}`, { headers }, proxyOptions),
            proxyAwareFetch(`${host}/v1/usage?start_time=${sevenDaysAgo}&end_time=${now}`, { headers }, proxyOptions),
          ]);

          if (costRes.status === "fulfilled" && costRes.value.ok) {
            costData = await costRes.value.json().catch(() => null);
          }
          if (usageRes.status === "fulfilled" && usageRes.value.ok) {
            tokenData = await usageRes.value.json().catch(() => null);
          }
          break;
        }
      } catch {
        // try next host
      }
    }

    // Extract balance
    let balanceVal = null;
    let currency = "USD";
    if (balanceData?.balance != null) {
      if (typeof balanceData.balance === "object") {
        balanceVal = Number(balanceData.balance.value ?? balanceData.balance.amount ?? 0);
        currency = balanceData.balance.currency || "USD";
      } else {
        balanceVal = Number(balanceData.balance);
      }
    }

    // Extract 7-day cost
    let cost7d = null;
    let req7d = 0;
    if (costData?.total_amount != null) {
      cost7d = Number(costData.total_amount.value ?? costData.total_amount.amount ?? costData.total_amount ?? 0);
      req7d = Number(costData.requests || 0);
    }

    // Extract token usage
    const totalTokens7d = Number(tokenData?.usage?.total_tokens || 0);
    const cachedTokens7d = Number(tokenData?.usage?.cached_read_tokens || 0);

    const quotas = {};

    // 1. Account Balance Card
    if (balanceVal != null && !isNaN(balanceVal)) {
      const displayBalance = Math.max(0, balanceVal);
      quotas[`Balance (${currency})`] = {
        name: `Account Balance (${currency})`,
        used: 0,
        total: displayBalance,
        remainingPercentage: displayBalance > 0 ? 100 : 0,
        resetAt: null,
      };
    }

    // 2. 7-Day Cost Metric
    if (cost7d != null && !isNaN(cost7d)) {
      quotas["7-Day Cost (USD)"] = {
        name: "7-Day Cost (USD)",
        used: cost7d,
        total: cost7d,
        unit: "USD",
        message: `${req7d} requests | ${(totalTokens7d / 1000).toFixed(1)}k tokens (7 days)`,
        resetAt: null,
      };
    }

    // 3. Complimentary Free Model Limits
    quotas["DeepSeek V4 Flash (Free)"] = {
      name: "DeepSeek V4 Flash (Free)",
      used: 0,
      total: 200,
      unit: "req/day",
      message: "200 requests/day complimentary limit.",
    };
    quotas["DeepSeek V4 Pro (Free)"] = {
      name: "DeepSeek V4 Pro (Free)",
      used: 0,
      total: 50,
      unit: "req/day",
      message: "50 requests/day complimentary limit.",
    };

    const formattedBal = balanceVal != null ? `$${balanceVal.toFixed(2)}` : "Connected";
    const costSummary = cost7d != null ? ` | 7D Spent: $${cost7d.toFixed(3)} (${req7d} reqs)` : "";

    return {
      plan: "TeamoRouter Pay-As-You-Go",
      balance: balanceVal != null ? `$${balanceVal.toFixed(2)}` : undefined,
      message: `Balance: ${formattedBal}${costSummary}. Free models: deepseek-v4-flash-free (200 RPD), deepseek-v4-pro-free (50 RPD).`,
      quotas,
    };
  } catch (error) {
    return {
      plan: "TeamoRouter Pay-As-You-Go",
      message: "TeamoRouter connected. Free models: deepseek-v4-flash-free (200 RPD), deepseek-v4-pro-free (50 RPD).",
    };
  }
}
