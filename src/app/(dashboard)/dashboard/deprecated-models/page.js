"use client";

import { useState, useEffect, useCallback } from "react";
import { translate } from "@/i18n/runtime";

const RISK_COLORS = {
  high: { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-300", badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  medium: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  low: { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
};

function RiskBadge({ hitCount }) {
  const level = hitCount >= 10 ? "high" : hitCount >= 3 ? "medium" : "low";
  const colors = RISK_COLORS[level];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colors.badge}`}>
      {level === "high" ? "🔴" : level === "medium" ? "🟡" : "🔵"} {hitCount} hits
    </span>
  );
}

function StatCard({ label, value, icon, color = "text-text-main" }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-text-muted uppercase tracking-wide">{translate(label)}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ProviderCard({ provider, data }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">{provider}</span>
        <span className="text-xs text-text-muted">{data.count} {translate("models")}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {data.models.map((model) => (
          <span key={model} className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-text-muted border border-border-subtle/60">
            {model}
          </span>
        ))}
      </div>
      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
        ⚠️ {data.totalHits} {translate("total hits")} — {translate("ban risk")}
      </p>
    </div>
  );
}

function RecommendationRow({ rec, onDismiss }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm">⚠️</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-surface-2 dark:bg-surface-3 text-text-main border border-border-subtle shadow-2xs flex-shrink-0">
          {rec.provider}
        </span>
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300 truncate">
          {rec.model}
        </span>
        <span className="text-xs text-text-muted hidden sm:inline">
          — {rec.reason}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <RiskBadge hitCount={rec.hitCount} />
        <button
          onClick={() => onDismiss(rec.provider, rec.model)}
          className="text-xs px-2 py-1 rounded bg-surface-2 hover:bg-surface-3 text-text-muted transition-colors"
          title={translate("Dismiss")}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-8 text-center">
      <div className="text-3xl mb-2">✅</div>
      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
        {translate("No deprecated models tracked")}
      </p>
      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
        {translate("All configured models are available")}
      </p>
    </div>
  );
}

export default function DeprecatedModelsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, active, recommendations

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/usage/deprecated-models", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDismiss = async (provider, model) => {
    // Mark as dismissed locally (would need API to persist)
    if (data?.recommendations) {
      setData({
        ...data,
        recommendations: data.recommendations.filter(
          r => !(r.provider === provider && r.model === model)
        ),
      });
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 animate-pulse">
          <div className="h-6 bg-surface-3 rounded w-48 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-surface-2 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = data?.stats || { totalTracked: 0, activeCount: 0, disabledCount: 0, totalHits: 0, riskScore: 0, accountsAtRisk: 0, byProvider: {} };
  const recommendations = data?.recommendations || [];
  const entries = data?.entries || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text-main">
          🔍 {translate("Deprecated Models Audit")}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {translate("Track models no longer available to prevent account bans from bot-like behavior")}
        </p>
      </div>

      {/* Risk Summary */}
      {stats.riskScore > 0 && (
        <div className={`rounded-xl border px-4 py-3 ${
          stats.riskScore >= 50
            ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
            : stats.riskScore >= 10
            ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
            : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30"
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {stats.riskScore >= 50 ? "🚨" : stats.riskScore >= 10 ? "⚠️" : "ℹ️"}
            </span>
            <span className="text-sm font-semibold">
              {stats.riskScore >= 50
                ? translate("High ban risk")
                : stats.riskScore >= 10
                ? translate("Medium ban risk")
                : translate("Low risk")}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            {stats.activeCount} {translate("deprecated models called")} {stats.totalHits} {translate("times")} — {stats.accountsAtRisk} {translate("accounts at risk")}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Tracked" value={stats.totalTracked} icon="📊" />
        <StatCard label="Active" value={stats.activeCount} icon="🔴" color={stats.activeCount > 0 ? "text-red-600 dark:text-red-400" : ""} />
        <StatCard label="Disabled" value={stats.disabledCount} icon="✅" color="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Total Hits" value={stats.totalHits} icon="🎯" color={stats.totalHits > 50 ? "text-red-600 dark:text-red-400" : ""} />
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle bg-surface-2">
            <h2 className="text-sm font-semibold text-text-main">
              ⚠️ {translate("Auto-Disable Recommendations")}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {translate("Models called 3+ times as deprecated — disable to protect accounts")}
            </p>
          </div>
          <div className="px-4 py-3 space-y-2">
            {recommendations.map((rec) => (
              <RecommendationRow key={`${rec.provider}/${rec.model}`} rec={rec} onDismiss={handleDismiss} />
            ))}
          </div>
        </div>
      )}

      {/* Provider Breakdown */}
      {Object.keys(stats.byProvider).length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle bg-surface-2">
            <h2 className="text-sm font-semibold text-text-main">
              🏢 {translate("By Provider")}
            </h2>
          </div>
          <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(stats.byProvider).map(([provider, data]) => (
              <ProviderCard key={provider} provider={provider} data={data} />
            ))}
          </div>
        </div>
      )}

      {/* All Entries Table */}
      {entries.length > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle bg-surface-2">
            <h2 className="text-sm font-semibold text-text-main">
              📋 {translate("All Tracked Models")}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-text-muted">
                  <th className="px-4 py-2 font-medium">{translate("Provider")}</th>
                  <th className="px-4 py-2 font-medium">{translate("Model")}</th>
                  <th className="px-4 py-2 font-medium">{translate("Hits")}</th>
                  <th className="px-4 py-2 font-medium">{translate("First Seen")}</th>
                  <th className="px-4 py-2 font-medium">{translate("Last Seen")}</th>
                  <th className="px-4 py-2 font-medium">{translate("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={`${entry.provider}/${entry.model}`} className="border-b border-border-subtle/50 hover:bg-surface-2/50">
                    <td className="px-4 py-2 font-medium">{entry.provider}</td>
                    <td className="px-4 py-2 font-mono text-xs">{entry.model}</td>
                    <td className="px-4 py-2"><RiskBadge hitCount={entry.hitCount} /></td>
                    <td className="px-4 py-2 text-xs text-text-muted">{new Date(entry.firstSeen).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-xs text-text-muted">{new Date(entry.lastSeen).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      {entry.disabled ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          {translate("Disabled")}
                        </span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                          {translate("Active")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {entries.length === 0 && <EmptyState />}
    </div>
  );
}
