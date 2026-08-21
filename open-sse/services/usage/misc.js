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
 * TeamoRouter Usage, Wallet Balance & Quota tracker
 *
 * Endpoints:
 *   1. GET https://api.teamorouter.com/api/management/self/wallet
 *      Response: { success: true, data: { topUpBalance, voucherEfficientAmount, toppedUpSpent, voucherSpent } }
 *   2. GET https://api.teamorouter.com/api/management/member/wallet?email=...
 *      Response: { success: true, data: { quotaTotal, quotaRemaining, quotaSpent } }
 *   3. Fallback: GET https://api.teamorouter.com/v1/billing/balance
 */
export async function getTeamoRouterUsage(apiKey, providerSpecificData = null, proxyOptions = null) {
  const mgKey = providerSpecificData?.managementApiKey || apiKey;
  if (!mgKey) {
    return { message: "TeamoRouter API key not available." };
  }

  const cleanKey = mgKey.trim();
  const headers = {
    Authorization: `Bearer ${cleanKey}`,
    Accept: "application/json",
  };

  try {
    const baseHosts = ["https://api.teamorouter.com", "https://teamorouter.com"];
    let walletData = null;
    let memberData = null;
    let balanceData = null;

    const memberEmail = providerSpecificData?.email?.trim();

    // 1. Fetch Member Wallet if email is present
    if (memberEmail) {
      for (const host of baseHosts) {
        try {
          const mRes = await proxyAwareFetch(
            `${host}/api/management/member/wallet?email=${encodeURIComponent(memberEmail)}`,
            { headers },
            proxyOptions
          );
          if (mRes.ok) {
            const mJson = await mRes.json().catch(() => null);
            if (mJson?.success && mJson?.data) {
              memberData = mJson.data;
              break;
            }
          }
        } catch {}
      }
    }

    // 2. Fetch Management Self Wallet if not already resolved by member wallet
    if (!memberData) {
      for (const host of baseHosts) {
        try {
          const wRes = await proxyAwareFetch(`${host}/api/management/self/wallet`, { headers }, proxyOptions);
          if (wRes.ok) {
            const wJson = await wRes.json().catch(() => null);
            if (wJson?.success && wJson?.data) {
              walletData = wJson.data;
              break;
            }
          }
        } catch {}
      }
    }

    // 3. Fallback to /v1/billing/balance if management wallet didn't return data
    if (!walletData && !memberData) {
      for (const host of baseHosts) {
        try {
          const bRes = await proxyAwareFetch(`${host}/v1/billing/balance`, { headers }, proxyOptions);
          if (bRes.ok) {
            balanceData = await bRes.json().catch(() => null);
            break;
          }
        } catch {}
      }
    }

    const quotas = {};
    let totalAvailableBalance = null;
    let summaryMessage = "";

    if (walletData) {
      const topUp = Number(walletData.topUpBalance || 0);
      const voucher = Number(walletData.voucherEfficientAmount || 0);
      const totalAvailable = topUp + voucher;
      const topUpSpent = Number(walletData.toppedUpSpent || 0);
      const voucherSpent = Number(walletData.voucherSpent || 0);
      const totalSpent = topUpSpent + voucherSpent;

      totalAvailableBalance = totalAvailable;

      // Available Balance Quota Card
      quotas["Available Wallet (USD)"] = {
        name: "Available Wallet (USD)",
        used: totalSpent,
        total: totalAvailable + totalSpent,
        remainingPercentage: (totalAvailable + totalSpent) > 0 ? Math.round((totalAvailable / (totalAvailable + totalSpent)) * 100) : 100,
        unit: "USD",
        message: `Top-Up: $${topUp.toFixed(2)} | Voucher: $${voucher.toFixed(2)}`,
        resetAt: null,
      };

      // Spent Quota Card
      quotas["Total Spent (USD)"] = {
        name: "Total Spent (USD)",
        used: totalSpent,
        total: totalSpent,
        unit: "USD",
        message: `Top-Up Spent: $${topUpSpent.toFixed(2)} | Voucher Spent: $${voucherSpent.toFixed(2)}`,
        resetAt: null,
      };

      summaryMessage = `Balance: $${totalAvailable.toFixed(2)} (Top-up: $${topUp.toFixed(2)}, Voucher: $${voucher.toFixed(2)}) | Spent: $${totalSpent.toFixed(2)}`;
    } else if (memberData) {
      const qTotal = Number(memberData.quotaTotal || 0);
      const qRem = Number(memberData.quotaRemaining || 0);
      const qSpent = Number(memberData.quotaSpent || (qTotal - qRem));

      totalAvailableBalance = qRem;

      quotas["Member Quota (USD)"] = {
        name: "Member Quota (USD)",
        used: qSpent,
        total: qTotal,
        remainingPercentage: qTotal > 0 ? Math.round((qRem / qTotal) * 100) : 0,
        unit: "USD",
        message: `$${qRem.toFixed(2)} remaining of $${qTotal.toFixed(2)} allocation`,
        resetAt: null,
      };

      summaryMessage = `Quota: $${qRem.toFixed(2)} / $${qTotal.toFixed(2)} remaining`;
    } else if (balanceData?.balance != null) {
      let bVal = 0;
      if (typeof balanceData.balance === "object") {
        bVal = Number(balanceData.balance.value ?? balanceData.balance.amount ?? 0);
      } else {
        bVal = Number(balanceData.balance);
      }
      totalAvailableBalance = bVal;
      quotas["Balance (USD)"] = {
        name: "Account Balance (USD)",
        used: 0,
        total: bVal,
        remainingPercentage: bVal > 0 ? 100 : 0,
        resetAt: null,
      };
      summaryMessage = `Balance: $${bVal.toFixed(2)}`;
    }

    // Complimentary Free Models Quota Cards
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

    return {
      plan: "TeamoRouter Pay-As-You-Go",
      balance: totalAvailableBalance != null ? `$${totalAvailableBalance.toFixed(2)}` : undefined,
      message: summaryMessage ? `${summaryMessage}. Free: 200 Flash / 50 Pro RPD.` : "TeamoRouter connected.",
      quotas,
    };
  } catch (error) {
    return {
      plan: "TeamoRouter Pay-As-You-Go",
      message: "TeamoRouter connected. Free models: deepseek-v4-flash-free (200 RPD), deepseek-v4-pro-free (50 RPD).",
    };
  }
}

/**
 * ZenMux usage & balance fetcher via Platform Management API
 *
 * Calls:
 *   1. GET https://zenmux.ai/api/v1/management/payg/balance
 *   2. GET https://zenmux.ai/api/v1/management/subscription/detail
 *
 * Uses managementApiKey if present in providerSpecificData, or falls back to apiKey
 */
export async function getZenMuxUsage(apiKey, providerSpecificData = null, proxyOptions = null) {
  const mgKey = providerSpecificData?.managementApiKey || apiKey;
  if (!mgKey) {
    return { plan: "ZenMux", message: "ZenMux connected." };
  }

  try {
    const headers = {
      Authorization: `Bearer ${mgKey}`,
      Accept: "application/json",
    };

    // 1. Fetch PAYG balance
    const balanceRes = await proxyAwareFetch(
      "https://zenmux.ai/api/v1/management/payg/balance",
      { method: "GET", headers },
      proxyOptions
    ).catch(() => null);

    // 2. Fetch Subscription details & rolling window quotas
    const subRes = await proxyAwareFetch(
      "https://zenmux.ai/api/v1/management/subscription/detail",
      { method: "GET", headers },
      proxyOptions
    ).catch(() => null);

    let balanceVal = null;
    let currency = "USD";
    if (balanceRes?.ok) {
      const bData = await balanceRes.json().catch(() => null);
      if (bData?.data?.total_credits != null) {
        balanceVal = Number(bData.data.total_credits);
        currency = (bData.data.currency || "USD").toUpperCase();
      }
    }

    let subData = null;
    if (subRes?.ok) {
      const sData = await subRes.json().catch(() => null);
      if (sData?.data) {
        subData = sData.data;
      }
    }

    const quotas = {};

    // Account Balance Quota Card
    if (balanceVal != null && !isNaN(balanceVal)) {
      quotas[`Balance (${currency})`] = {
        name: `Account Balance (${currency})`,
        used: 0,
        total: balanceVal,
        remainingPercentage: balanceVal > 0 ? 100 : 0,
        resetAt: null,
      };
    }

    // 5-Hour Rolling Window Quota
    if (subData?.quota_5_hour) {
      const q5 = subData.quota_5_hour;
      const maxF = Number(q5.max_flows) || 0;
      const usedF = Number(q5.used_flows) || 0;
      const remainingF = Number(q5.remaining_flows) ?? (maxF - usedF);
      quotas["5-Hour Window (Flows)"] = {
        name: "5-Hour Window (Flows)",
        used: usedF,
        total: maxF,
        remainingPercentage: maxF > 0 ? Math.round((remainingF / maxF) * 100) : 0,
        resetAt: q5.resets_at || null,
        message: `${usedF} / ${maxF} Flows used ($${Number(q5.used_value_usd || 0).toFixed(2)})`,
      };
    }

    // 7-Day Rolling Window Quota
    if (subData?.quota_7_day) {
      const q7 = subData.quota_7_day;
      const maxF = Number(q7.max_flows) || 0;
      const usedF = Number(q7.used_flows) || 0;
      const remainingF = Number(q7.remaining_flows) ?? (maxF - usedF);
      quotas["7-Day Window (Flows)"] = {
        name: "7-Day Window (Flows)",
        used: usedF,
        total: maxF,
        remainingPercentage: maxF > 0 ? Math.round((remainingF / maxF) * 100) : 0,
        resetAt: q7.resets_at || null,
        message: `${usedF} / ${maxF} Flows used ($${Number(q7.used_value_usd || 0).toFixed(2)})`,
      };
    }

    const planTier = subData?.plan?.tier ? subData.plan.tier.toUpperCase() : "PAYG";
    const accStatus = subData?.account_status ? ` | Status: ${subData.account_status}` : "";
    const formattedBal = balanceVal != null ? `$${balanceVal.toFixed(2)}` : "Connected";

    return {
      plan: `ZenMux ${planTier}`,
      balance: balanceVal != null ? `$${balanceVal.toFixed(2)}` : undefined,
      message: `Balance: ${formattedBal}${accStatus}`,
      quotas,
    };
  } catch (error) {
    return {
      plan: "ZenMux",
      message: "ZenMux connected.",
    };
  }
}

/**
 * A6API Balance and Quota tracker
 */
export async function getA6ApiUsage(apiKey, proxyOptions = null) {
  if (!apiKey) {
    return { message: "A6API key not available." };
  }

  const cleanKey = apiKey.trim();
  const headers = {
    Authorization: `Bearer ${cleanKey}`,
    Accept: "application/json",
  };

  try {
    const endpoints = [
      "https://a6api.com/v1/dashboard/billing/credit_grants",
      "https://a6api.com/dashboard/billing/credit_grants",
      "https://a6api.com/v1/billing/balance",
      "https://a6api.com/api/user/self",
    ];

    let balanceVal = null;
    for (const url of endpoints) {
      try {
        const res = await proxyAwareFetch(url, { headers }, proxyOptions);
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.total_available != null) {
            balanceVal = Number(json.total_available);
            break;
          }
          if (json?.data?.total_credits != null) {
            balanceVal = Number(json.data.total_credits);
            break;
          }
          if (json?.data?.quota != null) {
            balanceVal = Number(json.data.quota) / 500000;
            break;
          }
          if (json?.balance != null) {
            balanceVal = Number(json.balance);
            break;
          }
        }
      } catch {}
    }

    const quotas = {};
    if (balanceVal != null && !isNaN(balanceVal)) {
      quotas["Account Balance (USD)"] = {
        name: "Account Balance (USD)",
        used: 0,
        total: Math.max(0, balanceVal),
        remainingPercentage: balanceVal > 0 ? 100 : 0,
        resetAt: null,
      };
    }

    const formattedBal = balanceVal != null ? `$${balanceVal.toFixed(2)}` : "Connected";
    return {
      plan: "A6API Pay-As-You-Go",
      balance: balanceVal != null ? `$${balanceVal.toFixed(2)}` : undefined,
      message: `Balance: ${formattedBal} | 4,700+ routes with up to 90% discount.`,
      quotas,
    };
  } catch (error) {
    return {
      plan: "A6API Pay-As-You-Go",
      message: "A6API connected. 4,700+ routes with up to 90% discount.",
    };
  }
}

/**
 * BazaarLink Balance & Key Limits tracker
 * Calls:
 *   1. GET https://api.bazaarlink.ai/v1/credits
 *   2. GET https://api.bazaarlink.ai/v1/key
 */
export async function getBazaarLinkUsage(apiKey, proxyOptions = null) {
  if (!apiKey) {
    return { message: "BazaarLink API key not available." };
  }

  const cleanKey = apiKey.trim();
  const headers = {
    Authorization: `Bearer ${cleanKey}`,
    Accept: "application/json",
  };

  try {
    const baseHosts = ["https://api.bazaarlink.ai", "https://bazaarlink.ai/api"];
    let creditsData = null;
    let keyData = null;

    for (const host of baseHosts) {
      try {
        const [credRes, keyRes] = await Promise.allSettled([
          proxyAwareFetch(`${host}/v1/credits`, { headers }, proxyOptions),
          proxyAwareFetch(`${host}/v1/key`, { headers }, proxyOptions),
        ]);

        if (credRes.status === "fulfilled" && credRes.value.ok) {
          creditsData = await credRes.value.json().catch(() => null);
        }
        if (keyRes.status === "fulfilled" && keyRes.value.ok) {
          keyData = await keyRes.value.json().catch(() => null);
        }

        if (creditsData || keyData) break;
      } catch {}
    }

    const quotas = {};
    const credObj = creditsData?.data || creditsData || {};
    const keyObj = keyData?.data || keyData || {};

    // 1. Credits & Lifetime Usage
    const credits = Number(credObj.total_credits ?? credObj.credits ?? credObj.balance ?? 0);
    const lifetime = Number(credObj.total_usage ?? credObj.lifetime_usage ?? credObj.total_used ?? 0);

    quotas["Credits Balance (USD)"] = {
      name: "Credits Balance (USD)",
      used: lifetime,
      total: credits + lifetime,
      remainingPercentage: (credits + lifetime) > 0 ? Math.round((credits / (credits + lifetime)) * 100) : 100,
      unit: "USD",
      message: `Available: $${credits.toFixed(2)} | Lifetime Usage: $${lifetime.toFixed(2)}`,
      resetAt: null,
    };

    // 2. Per-Key Spend Limits / Quota
    const limit = Number(keyObj.limit ?? keyObj.spend_limit ?? 0);
    const remaining = Number(keyObj.limit_remaining ?? keyObj.limitRemaining ?? keyObj.remaining ?? 0);
    if (limit > 0) {
      quotas["Key Spend Limit (USD)"] = {
        name: "Key Spend Limit (USD)",
        used: Math.max(0, limit - remaining),
        total: limit,
        remainingPercentage: Math.round((remaining / limit) * 100),
        unit: "USD",
        message: `$${remaining.toFixed(2)} remaining of $${limit.toFixed(2)} limit`,
        resetAt: keyObj.limit_reset || keyObj.resets_at || null,
      };
    }

    // 3. Rate Limit Card
    if (keyObj.rate_limit) {
      const rl = keyObj.rate_limit;
      quotas["Rate Limit"] = {
        name: "Rate Limit",
        used: 0,
        total: rl.requests || 20,
        unit: `req/${rl.interval || "1m"}`,
        message: rl.note || `${rl.requests || 20} requests per ${rl.interval || "1 minute"}`,
      };
    }

    // 4. Auto Free Router Indicator
    quotas["Auto:Free Router (Zero Cost)"] = {
      name: "Auto:Free Router (Zero Cost)",
      used: 0,
      total: 100,
      unit: "%",
      message: "Zero credits deducted; daily rate limits apply (auto:free model).",
    };

    const isFreeTier = keyObj.is_free_tier !== false;
    const keyType = keyObj.is_management_key ? "Management Key" : (isFreeTier ? "Free Tier" : "Standard Key");
    const keyLabel = keyObj.label ? ` (${keyObj.label})` : "";
    const formattedBal = `$${credits.toFixed(2)}`;

    return {
      plan: `BazaarLink ${keyType}${keyLabel}`,
      balance: formattedBal,
      message: `Balance: ${formattedBal} | Type: ${keyType}${keyLabel} | Auto:Free & 150+ models.`,
      quotas,
    };
  } catch (error) {
    return {
      plan: "BazaarLink AI Gateway",
      message: "BazaarLink connected. Auto:Free (Zero Cost) & 150+ models supported.",
    };
  }
}

