import { NextResponse } from "next/server";
import { getProviderConnections, getProviderNodes } from "@/models";
import { getDisabledModels, enableModels } from "@/lib/disabledModelsDb";
import { getCustomModels } from "@/lib/db";
import { getProviderModels } from "open-sse/config/providerModels.js";
import { poolFitnessSnapshot } from "open-sse/services/proxyPoolFitness.js";
import { sessionStateSize } from "open-sse/executors/freebuff.js";
import { getConsoleLogs } from "@/lib/consoleLogBuffer.js";
import { getUsageStats } from "@/lib/usageDb.js";
import { AI_PROVIDERS } from "@/shared/constants/providers";

export const dynamic = "force-dynamic";

/** Extract recent error logs (last 15 min) grouped by provider. */
function recentErrors(logs) {
  const cutoff = Date.now() - 15 * 60_000;
  const grouped = new Map();
  for (const line of logs) {
    if (line.level !== "error" || !line.ts || line.ts < cutoff) continue;
    const provider = line.provider || extractProvider(line.text) || "unknown";
    if (!grouped.has(provider)) grouped.set(provider, []);
    const arr = grouped.get(provider);
    if (arr.length < 3) arr.push(line); // cap per provider
  }
  return grouped;
}

function extractProvider(text = "") {
  const lower = text.toLowerCase();
  if (lower.includes("freebuff")) return "freebuff";
  if (lower.includes("openrouter")) return "openrouter";
  if (lower.includes("deepseek")) return "deepseek";
  if (lower.includes("groq")) return "groq";
  if (lower.includes("kiro")) return "kiro";
  return null;
}

function resolveProviderInfo(providerId, nodesMap) {
  if (!providerId) return { name: "Unknown", icon: null, color: null };
  const builtin = AI_PROVIDERS[providerId];
  if (builtin) {
    return {
      name: builtin.name || providerId,
      icon: builtin.icon || builtin.textIcon || null,
      color: builtin.color || null,
    };
  }
  const node = nodesMap?.get(providerId);
  if (node) {
    return {
      name: node.name || providerId,
      icon: node.type?.includes("anthropic") ? "AC" : "OC",
      color: node.type?.includes("anthropic") ? "#D97757" : "#10A37F",
    };
  }
  const formatted = providerId.charAt(0).toUpperCase() + providerId.slice(1);
  return { name: formatted, icon: null, color: null };
}

function getConnectionDisplayName(conn) {
  if (!conn) return null;
  if (conn.name && conn.name.trim()) return conn.name.trim();
  if (conn.email && conn.email.trim()) return conn.email.trim();
  if (conn.displayName && conn.displayName.trim()) return conn.displayName.trim();
  if (conn.apiKey) {
    const raw = String(conn.apiKey);
    return raw.length > 8 ? `Key ...${raw.slice(-4)}` : "API Key";
  }
  return null;
}

let cachedResponse = null;
let cachedTime = 0;
const CACHE_TTL_MS = 5_000;

export function invalidateHubStatusCache() {
  cachedResponse = null;
  cachedTime = 0;
}

export async function GET() {
  const now = Date.now();
  if (cachedResponse && now - cachedTime < CACHE_TTL_MS) {
    return NextResponse.json(cachedResponse);
  }

  try {
    const [connections, providerNodes, disabledModels, customModels, proxyFitness, freebuffState, stats] =
      await Promise.all([
        getProviderConnections().catch(() => []),
        getProviderNodes().catch(() => []),
        getDisabledModels().catch(() => ({})),
        getCustomModels().catch(() => []),
        poolFitnessSnapshot().catch(() => ({ pools: [] })),
        Promise.resolve(sessionStateSize()).catch(() => ({})),
        getUsageStats("today").catch(() => null),
      ]);

    const nodesMap = new Map((providerNodes || []).map((n) => [n.id, n]));
    const providerInfoCache = new Map();
    const incidents = [];
    const logs = getConsoleLogs();
    const errorGroups = recentErrors(logs);

    for (const conn of connections) {
      if (conn.isActive === false) continue;

      const pInfo = providerInfoCache.get(conn.provider) || (() => {
        const info = resolveProviderInfo(conn.provider, nodesMap);
        providerInfoCache.set(conn.provider, info);
        return info;
      })();
      const connName = getConnectionDisplayName(conn);
      const targetLink = `/dashboard/providers/${encodeURIComponent(conn.provider)}?connectionId=${encodeURIComponent(conn.id)}`;

      if (conn.testStatus === "auth_failed") {
        incidents.push({
          severity: "critical",
          type: "auth_failed",
          provider: conn.provider,
          providerName: pInfo.name,
          providerIcon: pInfo.icon,
          providerColor: pInfo.color,
          connectionId: conn.id,
          connectionName: connName,
          message: conn.lastError || "Token expired or invalid — re-login or update key",
          link: targetLink,
          actionLabel: "Re-login",
        });
      } else if (conn.testStatus === "unavailable") {
        const isAuth = conn.errorCode === 401 || conn.errorCode === 403 || conn.lastErrorType === "auth_failed";
        incidents.push({
          severity: isAuth ? "critical" : "warning",
          type: isAuth ? "auth_failed" : "unavailable",
          provider: conn.provider,
          providerName: pInfo.name,
          providerIcon: pInfo.icon,
          providerColor: pInfo.color,
          connectionId: conn.id,
          connectionName: connName,
          message: conn.lastError ? `Account unavailable (${conn.errorCode || (isAuth ? 403 : "error")}): ${conn.lastError}` : "Account temporarily unavailable",
          link: targetLink,
          actionLabel: isAuth ? "Fix Auth →" : "Fix →",
        });
      } else if (conn.testStatus === "payment_required") {
        incidents.push({
          severity: "warning",
          type: "payment_required",
          provider: conn.provider,
          providerName: pInfo.name,
          providerIcon: pInfo.icon,
          providerColor: pInfo.color,
          connectionId: conn.id,
          connectionName: connName,
          message: conn.lastError || "Payment required (insufficient balance)",
          link: conn.rechargeUrl || targetLink,
          actionLabel: conn.rechargeUrl ? "Recharge →" : "Top Up →",
        });
      } else if (conn.testStatus === "expired") {
        incidents.push({
          severity: "critical",
          type: "token_expired",
          provider: conn.provider,
          providerName: pInfo.name,
          providerIcon: pInfo.icon,
          providerColor: pInfo.color,
          connectionId: conn.id,
          connectionName: connName,
          message: conn.lastError || "Session or token expired",
          link: targetLink,
          actionLabel: "Re-login",
        });
      } else if (conn.testStatus === "error" || (conn.lastError && conn.testStatus !== "active" && conn.testStatus !== "success")) {
        incidents.push({
          severity: "warning",
          type: "test_error",
          provider: conn.provider,
          providerName: pInfo.name,
          providerIcon: pInfo.icon,
          providerColor: pInfo.color,
          connectionId: conn.id,
          connectionName: connName,
          message: conn.lastError || "Connection error",
          link: targetLink,
          actionLabel: "Fix →",
        });
      }

      if (conn.rateLimitedUntil) {
        const until = new Date(conn.rateLimitedUntil).getTime();
        if (until > now) {
          incidents.push({
            severity: "warning",
            type: "rate_limited",
            provider: conn.provider,
            providerName: pInfo.name,
            providerIcon: pInfo.icon,
            providerColor: pInfo.color,
            connectionId: conn.id,
            connectionName: connName,
            message: `Rate limited — retry after ${new Date(until).toLocaleTimeString()}`,
            resetsAtMs: until,
            link: targetLink,
            actionLabel: "View →",
          });
        }
      }
    }

    for (const [provider, rawModels] of Object.entries(disabledModels)) {
      if (Array.isArray(rawModels) && rawModels.length > 0) {
        const builtIn = getProviderModels(provider) || [];
        const builtInIds = new Set(builtIn.map((m) => m.id));
        const providerCustom = (customModels || []).filter((m) => m.providerAlias === provider);
        const customIds = new Set(providerCustom.map((m) => m.id));

        const validModels = rawModels.filter((id) => builtInIds.has(id) || customIds.has(id));
        const orphanedModels = rawModels.filter((id) => !builtInIds.has(id) && !customIds.has(id));

        // Auto-clean orphaned disabled models from SQLite
        if (orphanedModels.length > 0) {
          enableModels(provider, orphanedModels).catch(() => {});
        }

        // Only report an incident if ALL models for an active provider are disabled
        const totalModelsCount = builtInIds.size + customIds.size;
        const isAllDisabled = totalModelsCount > 0 && validModels.length >= totalModelsCount;

        if (isAllDisabled) {
          const pInfo = resolveProviderInfo(provider, nodesMap);
          incidents.push({
            severity: "warning",
            type: "model_disabled",
            provider,
            providerName: pInfo.name,
            providerIcon: pInfo.icon,
            providerColor: pInfo.color,
            models: validModels,
            message: `All ${totalModelsCount} models disabled for ${pInfo.name}`,
            link: `/dashboard/providers/${encodeURIComponent(provider)}?tab=models`,
            actionLabel: "Manage Models →",
          });
        }
      }
    }

    const unfitPools = proxyFitness.pools?.filter((p) => p.unfit?.length > 0) || [];
    for (const pool of unfitPools) {
      incidents.push({
        severity: "warning",
        type: "proxy_unfit",
        poolId: pool.id,
        poolName: pool.name || pool.id,
        message: `${pool.unfit.length} scope(s) blocked — fitness degraded`,
        link: `/dashboard/proxy-fitness?poolId=${encodeURIComponent(pool.id)}`,
        actionLabel: "Fix Proxy →",
      });
    }

    if (freebuffState.modelLocks > 0) {
      incidents.push({
        severity: "info",
        type: "session_locked",
        provider: "freebuff",
        providerName: "FreeBuff",
        message: `${freebuffState.modelLocks} model lock(s) active (cooldown)`,
        link: "/dashboard/providers/freebuff",
        actionLabel: "View FreeBuff →",
      });
    }
    if (freebuffState.poolLimits > 0) {
      incidents.push({
        severity: "warning",
        type: "pool_limited",
        provider: "freebuff",
        providerName: "FreeBuff",
        message: `${freebuffState.poolLimits} IP pool(s) rate limited`,
        link: "/dashboard/providers/freebuff",
        actionLabel: "View FreeBuff →",
      });
    }

    // --- System Pulse ---
    const totalProviders = connections.length;
    const activeProviders = connections.filter((c) => c.isActive && (c.testStatus === "active" || c.testStatus === "success")).length;
    const errorProviders = connections.filter((c) =>
      c.isActive && (
        ["error", "auth_failed", "unavailable", "payment_required", "expired"].includes(c.testStatus) ||
        Boolean(c.lastError && c.testStatus !== "active" && c.testStatus !== "success")
      )
    ).length;

    const totalPools = proxyFitness.pools?.length || 0;
    const healthyPools = proxyFitness.pools?.filter((p) => !p.unfit?.length).length || 0;
    const proxyHealthPercent = totalPools > 0 ? Math.round((healthyPools / totalPools) * 100) : 100;

    let connModelLocks = 0;
    for (const conn of connections) {
      for (const k of Object.keys(conn)) {
        if (k.startsWith("modelLock_") && conn[k]) {
          const exp = new Date(conn[k]).getTime();
          if (exp > now) connModelLocks++;
        }
      }
    }
    const activeCooldowns = (freebuffState.modelLocks || 0) + (freebuffState.poolLimits || 0) + connModelLocks;

    const requestsToday = stats?.totalRequests || 0;
    const errorsToday = stats?.failedRequests || 0;

    // --- Error Logs (recent) ---
    const recentErrorLogs = [];
    for (const [provider, errs] of errorGroups) {
      recentErrorLogs.push({ provider, count: errs.length, sample: errs[0]?.text?.slice(0, 120) });
    }

    const incidentSummary = {
      total: incidents.length,
      critical: incidents.filter((i) => i.severity === "critical").length,
      warning: incidents.filter((i) => i.severity === "warning").length,
      info: incidents.filter((i) => i.severity === "info").length,
      healthy: incidents.length === 0,
    };

    const payload = {
      incidents,
      incidentSummary,
      summary: incidentSummary,
      systemPulse: {
        providers: { total: totalProviders, active: activeProviders, error: errorProviders },
        proxyHealth: { total: totalPools, healthy: healthyPools, percent: proxyHealthPercent },
        activeCooldowns,
        requestsToday,
        errorsToday,
      },
      recentErrorLogs,
    };

    cachedResponse = payload;
    cachedTime = now;

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[API] Status check failed:", error);
    return NextResponse.json({ error: "Status check failed" }, { status: 500 });
  }
}
