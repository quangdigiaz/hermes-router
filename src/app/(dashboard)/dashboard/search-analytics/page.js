"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Card from "@/shared/components/Card";
import { SegmentedControl } from "@/shared/components";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
];

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => {
  if (!n || n === 0) return "$0.00";
  if (n > 0 && n < 0.005) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
};
const fmtMs = (n) => {
  if (!n || n === 0) return "-";
  if (n < 1000) return `${Math.round(n)}ms`;
  return `${(n / 1000).toFixed(1)}s`;
};

function OverviewCards({ stats }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 sm:gap-4">
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Total Searches</span>
        <span className="truncate text-2xl font-bold">{fmt(stats.totalSearches)}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Avg Response Time</span>
        <span className="truncate text-2xl font-bold text-primary">{fmtMs(stats.avgResponseTimeMs)}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Avg Results</span>
        <span className="truncate text-2xl font-bold text-info">{stats.avgResultCount}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Total Cost</span>
        <span className="truncate text-2xl font-bold text-warning">~{fmtCost(stats.totalCost)}</span>
        <span className="text-[10px] text-text-muted">Search API costs</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Success Rate</span>
        <span className="truncate text-2xl font-bold text-success">
          {stats.totalSearches > 0
            ? `${Math.round(((stats.byStatus?.success || 0) / stats.totalSearches) * 100)}%`
            : "-"}
        </span>
      </Card>
    </div>
  );
}

function ProviderTable({ byProvider }) {
  const providers = Object.entries(byProvider || {})
    .sort((a, b) => b[1].searches - a[1].searches);

  if (providers.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-text-muted text-sm">No search data available</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-subtle/50">
              <th className="px-4 py-3 text-left font-semibold">Provider</th>
              <th className="px-4 py-3 text-right font-semibold">Searches</th>
              <th className="px-4 py-3 text-right font-semibold">Avg Time</th>
              <th className="px-4 py-3 text-right font-semibold">Avg Results</th>
              <th className="px-4 py-3 text-right font-semibold">Cost</th>
            </tr>
          </thead>
          <tbody>
            {providers.map(([name, stats]) => (
              <tr key={name} className="border-b border-border hover:bg-bg-hover/50">
                <td className="px-4 py-3 font-medium">{name}</td>
                <td className="px-4 py-3 text-right">{fmt(stats.searches)}</td>
                <td className="px-4 py-3 text-right text-primary">{fmtMs(stats.avgResponseTimeMs)}</td>
                <td className="px-4 py-3 text-right text-info">{stats.avgResultCount}</td>
                <td className="px-4 py-3 text-right text-warning">{fmtCost(stats.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SearchTypeBreakdown({ bySearchType }) {
  const types = Object.entries(bySearchType || {})
    .sort((a, b) => b[1].searches - a[1].searches);

  if (types.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase text-text-muted">Search Types</h3>
      <div className="flex flex-wrap gap-3">
        {types.map(([type, stats]) => (
          <div key={type} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <span className="font-medium capitalize">{type}</span>
            <span className="text-text-muted text-sm">({fmt(stats.searches)})</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SearchChart({ timeSeries }) {
  if (!timeSeries || timeSeries.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-text-muted text-sm">No time series data</p>
      </Card>
    );
  }

  const maxSearches = Math.max(...timeSeries.map(d => d.searches), 1);
  const maxTime = Math.max(...timeSeries.map(d => d.avgResponseTimeMs), 1);

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase text-text-muted">Search Activity</h3>
      <div className="flex items-end gap-1 h-32">
        {timeSeries.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-primary/80 rounded-t"
              style={{ height: `${(d.searches / maxSearches) * 100}%`, minHeight: d.searches > 0 ? "4px" : "0" }}
              title={`${d.searches} searches`}
            />
            {i % Math.ceil(timeSeries.length / 7) === 0 && (
              <span className="text-[9px] text-text-muted truncate w-full text-center">{d.label}</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function SearchAnalyticsPage() {
  const [period, setPeriod] = useState("7d");
  const [provider, setProvider] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (provider) params.set("provider", provider);
      const res = await fetch(`/api/usage/search?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch search analytics:", e);
    } finally {
      setLoading(false);
    }
  }, [period, provider]);

  useEffect(() => {
    const key = `${period}|${provider}`;
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;
    fetchData();
  }, [fetchData, period, provider]);

  const providers = data?.providers || [];

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Search Analytics</h1>
          <p className="text-text-muted text-sm">Track provider usage, latency, and costs</p>
        </div>
        <div className="flex gap-2">
          <SegmentedControl
            options={PERIODS}
            value={period}
            onChange={setPeriod}
            size="sm"
          />
        </div>
      </div>

      {/* Provider Filter */}
      {providers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setProvider(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !provider
                ? "bg-primary text-white"
                : "bg-bg-subtle text-text-muted hover:bg-bg-hover"
            }`}
          >
            All Providers
          </button>
          {providers.map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                provider === p
                  ? "bg-primary text-white"
                  : "bg-bg-subtle text-text-muted hover:bg-bg-hover"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Card className="h-48 flex items-center justify-center">
          <p className="text-text-muted">Loading...</p>
        </Card>
      ) : !data?.stats ? (
        <Card className="h-48 flex items-center justify-center">
          <p className="text-text-muted">No search data available</p>
        </Card>
      ) : (
        <>
          {/* Overview Cards */}
          <OverviewCards stats={data.stats} />

          {/* Chart */}
          <SearchChart timeSeries={data.stats.timeSeries} />

          {/* Provider Table */}
          <ProviderTable byProvider={data.stats.byProvider} />

          {/* Search Type Breakdown */}
          <SearchTypeBreakdown bySearchType={data.stats.bySearchType} />
        </>
      )}
    </div>
  );
}
