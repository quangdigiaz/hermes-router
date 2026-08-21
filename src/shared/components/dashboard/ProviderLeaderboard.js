"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AI_PROVIDERS, isOpenAICompatibleProvider, isAnthropicCompatibleProvider } from "@/shared/constants/providers";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);

function cleanProviderDisplayName(providerId, connList = []) {
  const builtin = AI_PROVIDERS[providerId];
  if (builtin?.name) return builtin.name;

  // Check connection custom names / node names
  for (const c of connList) {
    if (c.name && !c.name.startsWith("openai-compatible-") && !c.name.startsWith("anthropic-compatible-")) {
      return c.name;
    }
  }

  if (isOpenAICompatibleProvider(providerId)) {
    const suffix = providerId.replace(/^openai-compatible-(?:chat-)?/, "");
    return suffix.length > 8 ? `Custom OpenAI (${suffix.slice(0, 6)})` : "OpenAI Compatible";
  }

  if (isAnthropicCompatibleProvider(providerId)) {
    const suffix = providerId.replace(/^anthropic-compatible-(?:chat-)?/, "");
    return suffix.length > 8 ? `Custom Anthropic (${suffix.slice(0, 6)})` : "Anthropic Compatible";
  }

  return providerId.charAt(0).toUpperCase() + providerId.slice(1);
}

export default function ProviderLeaderboard({ data: hubData }) {
  const [providersList, setProvidersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [provRes, usageRes] = await Promise.all([
          fetch("/api/providers", { cache: "no-store" }).catch(() => null),
          fetch("/api/usage/stats?period=7d", { cache: "no-store" }).catch(() => null),
        ]);

        let connections = [];
        if (provRes?.ok) {
          const json = await provRes.json();
          connections = json.connections || [];
        }

        let byProvider = {};
        if (usageRes?.ok) {
          const uData = await usageRes.json();
          byProvider = uData?.byProvider || {};
        }

        // Group connections by Provider
        const grouped = {};
        for (const c of connections) {
          const pId = c.provider;
          if (!pId) continue;

          if (!grouped[pId]) {
            grouped[pId] = {
              id: pId,
              accounts: [],
              activeAccounts: 0,
              errorAccounts: 0,
            };
          }
          grouped[pId].accounts.push(c);

          const isActive = c.isActive !== false;
          const isHealthy = c.testStatus === "active" || c.testStatus === "success";
          const isError =
            ["error", "auth_failed", "unavailable", "payment_required", "expired"].includes(c.testStatus) ||
            Boolean(c.lastError && !isHealthy);

          if (isActive && isHealthy) {
            grouped[pId].activeAccounts++;
          } else if (isActive && isError) {
            grouped[pId].errorAccounts++;
          }
        }

        // Include any provider in usage stats even if no current connection
        for (const pId of Object.keys(byProvider)) {
          if (!grouped[pId]) {
            grouped[pId] = {
              id: pId,
              accounts: [],
              activeAccounts: 0,
              errorAccounts: 0,
            };
          }
        }

        const items = Object.values(grouped).map((p) => {
          const builtin = AI_PROVIDERS[p.id] || {};
          const usage = byProvider[p.id] || { requests: 0, promptTokens: 0, completionTokens: 0 };
          const totalTokens = (usage.promptTokens || 0) + (usage.completionTokens || 0);

          let status = "healthy";
          if (p.accounts.length === 0 && usage.requests > 0) {
            status = "healthy";
          } else if (p.errorAccounts > 0 && p.activeAccounts === 0) {
            status = "down";
          } else if (p.errorAccounts > 0 || (p.accounts.length > 0 && p.activeAccounts < p.accounts.length)) {
            status = "degraded";
          } else if (p.accounts.length > 0 && p.activeAccounts === p.accounts.length) {
            status = "healthy";
          }

          const friendlyName = cleanProviderDisplayName(p.id, p.accounts);

          return {
            id: p.id,
            name: friendlyName,
            icon: builtin.icon || builtin.textIcon || "🤖",
            color: builtin.color || "#6366f1",
            totalAccounts: p.accounts.length,
            activeAccounts: p.activeAccounts,
            errorAccounts: p.errorAccounts,
            requests: usage.requests || 0,
            totalTokens,
            status,
          };
        });

        // Score and sort: Healthy & high activity first
        items.sort((a, b) => {
          const statusScore = { healthy: 3, degraded: 2, down: 1 };
          const sDiff = (statusScore[b.status] || 0) - (statusScore[a.status] || 0);
          if (sDiff !== 0) return sDiff;
          if (b.requests !== a.requests) return b.requests - a.requests;
          return b.totalTokens - a.totalTokens;
        });

        setProvidersList(items);
      } catch (err) {
        console.error("Failed to load provider leaderboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [hubData]);

  const topProviders = providersList.slice(0, 6);

  return (
    <div className="rounded-2xl border border-border/80 bg-surface/90 shadow-sm backdrop-blur-md p-5 sm:p-6 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="material-symbols-outlined text-[20px]">trophy</span>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Provider Health &amp; Fitness Leaderboard
            </h2>
            <p className="text-xs text-text-muted">
              Live ranking of provider stability, uptime, and request throughput
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/providers"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-text-muted hover:text-primary hover:border-primary/40 text-xs font-medium transition-all shrink-0"
        >
          <span>All Providers</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>

      {/* Leaderboard Table / Cards */}
      {loading ? (
        <div className="space-y-2.5 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl border border-border/50 bg-black/[0.02] dark:bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : topProviders.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-xs">
          No active providers configured yet.{" "}
          <Link href="/dashboard/providers/new" className="text-primary underline">
            Add a provider
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {topProviders.map((p, idx) => {
            const isFirst = idx === 0;
            const isSecond = idx === 1;
            const isThird = idx === 2;

            const rankBadge = isFirst
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
              : isSecond
              ? "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30"
              : isThird
              ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30"
              : "bg-black/5 dark:bg-white/5 text-text-muted border-border/50";

            const statusDot =
              p.status === "healthy"
                ? "bg-emerald-500"
                : p.status === "degraded"
                ? "bg-amber-500"
                : "bg-red-500";

            const statusText =
              p.status === "healthy"
                ? "Optimal (100% Online)"
                : p.status === "degraded"
                ? `Degraded (${p.activeAccounts}/${p.totalAccounts} online)`
                : "Offline / Error";

            return (
              <Link
                key={p.id}
                href={`/dashboard/providers/${encodeURIComponent(p.id)}`}
                className={`group relative rounded-xl border p-4 flex flex-col justify-between transition-all hover:shadow-md ${
                  isFirst
                    ? "border-amber-500/40 bg-linear-to-b from-amber-500/[0.05] to-transparent shadow-xs"
                    : "border-border/70 bg-black/[0.02] dark:bg-white/[0.02] hover:border-primary/40"
                }`}
              >
                {/* Top row: Rank, Name, Status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex size-6 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold font-mono ${rankBadge}`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate flex items-center gap-1.5" title={p.name}>
                        <span className="truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-0.5">
                        <span className={`size-1.5 rounded-full ${statusDot}`} />
                        <span className="truncate">{statusText}</span>
                      </div>
                    </div>
                  </div>

                  {p.totalAccounts > 0 && (
                    <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-black/5 dark:bg-white/10 text-text-muted border border-black/5 dark:border-white/10">
                      {p.activeAccounts}/{p.totalAccounts} accs
                    </span>
                  )}
                </div>

                {/* Bottom stats row */}
                <div className="pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-text-muted font-semibold block">
                      Requests (7D)
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {fmt(p.requests)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-text-muted font-semibold block">
                      Tokens Served
                    </span>
                    <span className="font-mono font-bold text-primary">
                      {p.totalTokens > 1_000_000
                        ? `${(p.totalTokens / 1_000_000).toFixed(1)}M`
                        : p.totalTokens > 1000
                        ? `${(p.totalTokens / 1000).toFixed(1)}k`
                        : fmt(p.totalTokens)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
