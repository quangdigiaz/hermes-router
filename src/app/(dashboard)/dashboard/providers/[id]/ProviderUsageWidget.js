"use client";

import React, { useState, useEffect, useCallback } from "react";
import Card from "@/shared/components/Card";
import Badge from "@/shared/components/Badge";
import Button from "@/shared/components/Button";
import { parseQuotaData, getRemainingPercentage } from "../../usage/components/ProviderLimits/utils";

export default function ProviderUsageWidget({ providerId, providerInfo, connections }) {
  const activeConnections = (connections || []).filter((c) => c.isActive !== false);
  const availableConnections = activeConnections.length > 0 ? activeConnections : connections || [];

  const [selectedConnId, setSelectedConnId] = useState(() => availableConnections[0]?.id || null);
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Sync selectedConnId if connections list changes
  useEffect(() => {
    if (!selectedConnId && availableConnections[0]?.id) {
      setSelectedConnId(availableConnections[0].id);
    } else if (selectedConnId && !availableConnections.some((c) => c.id === selectedConnId)) {
      setSelectedConnId(availableConnections[0]?.id || null);
    }
  }, [availableConnections, selectedConnId]);

  const fetchUsage = useCallback(async (connId) => {
    if (!connId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/usage/${connId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUsageData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.warn(`[ProviderUsageWidget] Error fetching usage for ${providerId} (${connId}):`, err);
      setError(err.message || "Failed to fetch usage data");
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    if (selectedConnId) {
      fetchUsage(selectedConnId);
    }
  }, [selectedConnId, fetchUsage]);

  if (!availableConnections || availableConnections.length === 0) {
    return null;
  }

  // If no usage data and not loading, check if this provider even supports usage
  const hasUsageSupport =
    providerInfo?.features?.usage ||
    providerInfo?.features?.usageApikey ||
    usageData?.balance ||
    usageData?.quotas ||
    usageData?.plan;

  if (!loading && !usageData && !hasUsageSupport && error) {
    return null;
  }

  const selectedConn = availableConnections.find((c) => c.id === selectedConnId) || availableConnections[0];
  const normalizedQuotas = usageData ? parseQuotaData(providerId, usageData) : [];

  // Extract Balance info
  let balanceDisplay = usageData?.balance || null;
  if (!balanceDisplay && usageData?.quotas) {
    const balEntry = Object.entries(usageData.quotas).find(([k]) => k.toLowerCase().includes("balance"));
    if (balEntry && balEntry[1]?.total != null) {
      balanceDisplay = `$${Number(balEntry[1].total).toFixed(2)}`;
    }
  }

  // Extract 7-Day Cost info
  let costDisplay = null;
  let costSubText = null;
  if (usageData?.quotas) {
    const costEntry = Object.entries(usageData.quotas).find(([k]) => k.toLowerCase().includes("cost"));
    if (costEntry) {
      costDisplay = `$${Number(costEntry[1]?.used ?? costEntry[1]?.total ?? 0).toFixed(3)}`;
      costSubText = costEntry[1]?.message || null;
    }
  }

  return (
    <Card className="border border-black/10 dark:border-white/10 shadow-sm bg-gradient-to-br from-card to-card/60">
      <div className="flex flex-col gap-4">
        {/* Header toolbar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-black/5 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">account_balance_wallet</span>
            <h2 className="text-base font-semibold text-text-main">
              Account Balance &amp; Quotas
            </h2>
            {usageData?.plan && (
              <Badge variant="primary" size="sm">
                {usageData.plan}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {availableConnections.length > 1 && (
              <select
                value={selectedConnId || ""}
                onChange={(e) => setSelectedConnId(e.target.value)}
                disabled={loading}
                aria-label="Select account connection"
                className="text-xs rounded-lg border border-border bg-surface px-2.5 py-1.5 text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {availableConnections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email || c.displayName || `Account #${c.priority || 1}`}
                  </option>
                ))}
              </select>
            )}

            <Button
              size="xs"
              variant="secondary"
              icon={loading ? "progress_activity" : "refresh"}
              onClick={() => fetchUsage(selectedConnId)}
              disabled={loading}
              title="Refresh live balance & quotas"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
            {lastUpdated && (
              <span className="text-[11px] text-text-muted">
                {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        {/* Loading state skeleton */}
        {loading && !usageData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-pulse">
            <div className="h-20 bg-black/5 dark:bg-white/5 rounded-xl" />
            <div className="h-20 bg-black/5 dark:bg-white/5 rounded-xl" />
            <div className="h-20 bg-black/5 dark:bg-white/5 rounded-xl" />
          </div>
        )}

        {/* Error message */}
        {error && !loading && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Top KPI Metric Cards */}
        {usageData && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Balance Card */}
            <div className="rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Current Balance</span>
                <span className="material-symbols-outlined text-[16px] text-emerald-500">payments</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {balanceDisplay || "Active"}
              </div>
              <span className="text-[11px] text-text-muted mt-1 truncate">
                {selectedConn?.name || "Connected API Key"}
              </span>
            </div>

            {/* 7-Day Spend Card */}
            <div className="rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>7-Day Cost</span>
                <span className="material-symbols-outlined text-[16px] text-indigo-500">monitoring</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-text-main">
                {costDisplay || "$0.00"}
              </div>
              <span className="text-[11px] text-text-muted mt-1 truncate" title={costSubText || "Rolling 7-day usage"}>
                {costSubText || "Rolling 7-day consumption"}
              </span>
            </div>

            {/* Plan / Status Card */}
            <div className="rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Service Tier</span>
                <span className="material-symbols-outlined text-[16px] text-amber-500">verified</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-text-main truncate">
                {usageData?.plan || "Pay-As-You-Go"}
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                Live API Synced
              </span>
            </div>
          </div>
        )}

        {/* Detailed Quotas & Complimentary Model Limits */}
        {normalizedQuotas.length > 0 && (
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Model Allowances &amp; Quota Windows
            </span>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {normalizedQuotas.map((q, idx) => {
                const pct = getRemainingPercentage(q);
                return (
                  <div
                    key={`${q.name}-${idx}`}
                    className="rounded-lg border border-black/5 dark:border-white/5 bg-surface/50 p-2.5 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-text-main truncate max-w-[200px]" title={q.name}>
                        {q.name}
                      </span>
                      <span className="text-text-muted font-mono">
                        {q.used != null && q.total != null && q.total > 0
                          ? `${q.used}/${q.total} ${q.unit || ""}`
                          : q.remainingPercentage != null
                          ? `${q.remainingPercentage}%`
                          : "Available"}
                      </span>
                    </div>
                    {q.total > 0 && (
                      <div className="h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            pct <= 10 ? "bg-red-500" : pct <= 30 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, 100 - (q.used / q.total) * 100))}%` }}
                        />
                      </div>
                    )}
                    {q.message && (
                      <p className="text-[11px] text-text-muted leading-tight">{q.message}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Explanatory Message / Notice */}
        {usageData?.message && (
          <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 text-xs text-text-muted leading-relaxed flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">info</span>
            <span>{usageData.message}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
