"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const PERIODS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "all", label: "All time" },
];

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => {
  if (!n || n === 0) return "$0.00";
  if (n > 0 && n < 0.005) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
};

export default function DashboardUsageSummary() {
  const [period, setPeriod] = useState("today");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async (p) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/usage/stats?period=${p}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setStats(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage(period);
    const interval = setInterval(() => fetchUsage(period), 30_000);
    return () => clearInterval(interval);
  }, [fetchUsage, period]);

  const totalRequests = stats?.totalRequests || 0;
  const promptTokens = stats?.totalPromptTokens || 0;
  const cachedTokens = stats?.totalCachedTokens || 0;
  const completionTokens = stats?.totalCompletionTokens || 0;
  const totalCost = stats?.totalCost || 0;

  // Calculate cache hit ratio
  const totalInputWithCache = promptTokens + cachedTokens;
  const cacheHitRatio = totalInputWithCache > 0 ? ((cachedTokens / totalInputWithCache) * 100).toFixed(1) : 0;

  // Estimated savings from caching (typical ~75% discount on cached tokens compared to base input)
  const estSavedCost = cachedTokens > 0 ? (cachedTokens / 1_000_000) * 2.25 : 0;

  return (
    <div className="rounded-2xl border border-border/80 bg-surface/90 shadow-sm backdrop-blur-md p-5 sm:p-6 transition-all">
      {/* Header with period toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="material-symbols-outlined text-[20px]">savings</span>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Usage &amp; Savings Overview
            </h2>
            <p className="text-xs text-text-muted">
              Live token consumption and estimated prompt caching savings
            </p>
          </div>
        </div>

        {/* Period Selector & Link to Usage */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  period === p.id
                    ? "bg-primary text-white shadow-xs"
                    : "text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Link
            href="/dashboard/usage"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border text-text-muted hover:text-primary hover:border-primary/40 text-xs font-medium transition-all"
            title="Open detailed usage analytics"
          >
            <span>Details</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* 5 Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Requests */}
        <div className="rounded-xl border border-border/70 bg-black/[0.02] dark:bg-white/[0.02] p-4 flex flex-col justify-between hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs uppercase font-bold text-text-muted tracking-wider">
              Total Requests
            </span>
            <span className="material-symbols-outlined text-[16px] text-text-muted">
              sync_alt
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
            {loading ? "..." : fmt(totalRequests)}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            Processed via Router
          </div>
        </div>

        {/* Total Input Tokens */}
        <div className="rounded-xl border border-border/70 bg-black/[0.02] dark:bg-white/[0.02] p-4 flex flex-col justify-between hover:border-orange-500/30 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs uppercase font-bold text-text-muted tracking-wider">
              Input Tokens
            </span>
            <span className="material-symbols-outlined text-[16px] text-orange-500">
              input
            </span>
          </div>
          <div className="text-2xl font-extrabold text-orange-600 dark:text-orange-400 font-mono tracking-tight">
            {loading ? "..." : fmt(promptTokens)}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            Prompt context sent
          </div>
        </div>

        {/* Cached Tokens */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.03] dark:bg-blue-500/[0.06] p-4 flex flex-col justify-between hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1">
              Cached Tokens
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
              {cacheHitRatio}% hit
            </span>
          </div>
          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono tracking-tight">
            {loading ? "..." : fmt(cachedTokens)}
          </div>
          <div className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-1 font-medium">
            ⚡ ~${estSavedCost.toFixed(2)} cost saved
          </div>
        </div>

        {/* Output Tokens */}
        <div className="rounded-xl border border-border/70 bg-black/[0.02] dark:bg-white/[0.02] p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs uppercase font-bold text-text-muted tracking-wider">
              Output Tokens
            </span>
            <span className="material-symbols-outlined text-[16px] text-emerald-500">
              output
            </span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
            {loading ? "..." : fmt(completionTokens)}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            Generated responses
          </div>
        </div>

        {/* Estimated Cost */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] dark:bg-amber-500/[0.06] p-4 flex flex-col justify-between hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">
              Est. Cost
            </span>
            <span className="material-symbols-outlined text-[16px] text-amber-500">
              payments
            </span>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            {loading ? "..." : `~${fmtCost(totalCost)}`}
          </div>
          <div className="text-[10px] text-text-muted mt-1 truncate">
            Estimated, not actual billing
          </div>
        </div>
      </div>
    </div>
  );
}
