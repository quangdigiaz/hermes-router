"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Card from "@/shared/components/Card";
import { SegmentedControl, Input, Button } from "@/shared/components";

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

// ── Provider Capabilities Card ──────────────────────────────────────────
function ProviderCapabilities({ capabilities }) {
  const providers = Object.entries(capabilities || {}).sort((a, b) => {
    const order = { both: 0, search: 1, fetch: 2 };
    return (order[a[1].capability] || 3) - (order[b[1].capability] || 3);
  });

  if (providers.length === 0) return null;

  const searchOnly = providers.filter(([, p]) => p.capability === "search");
  const fetchOnly = providers.filter(([, p]) => p.capability === "fetch");
  const both = providers.filter(([, p]) => p.capability === "both");

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase text-text-muted">Provider Capabilities</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search + Fetch (Both) */}
        {both.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                <span className="material-symbols-outlined text-[12px]">search</span>
                <span className="material-symbols-outlined text-[12px]">language</span>
                Search + Fetch
              </span>
            </div>
            <div className="space-y-2">
              {both.map(([id, p]) => (
                <div key={id} className="flex items-center gap-2 p-2 rounded-lg bg-bg-subtle/50">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-[10px] text-text-muted ml-auto">
                    {p.costPerSearchQuery > 0 ? `$${p.costPerSearchQuery}/query` : "Free"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Only */}
        {searchOnly.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <span className="material-symbols-outlined text-[12px]">search</span>
                Search Only
              </span>
            </div>
            <div className="space-y-2">
              {searchOnly.map(([id, p]) => (
                <div key={id} className="flex items-center gap-2 p-2 rounded-lg bg-bg-subtle/50">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-[10px] text-text-muted ml-auto">
                    {p.costPerSearchQuery > 0 ? `$${p.costPerSearchQuery}/query` : "Free"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fetch Only */}
        {fetchOnly.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info/10 text-info text-xs font-semibold">
                <span className="material-symbols-outlined text-[12px]">language</span>
                Fetch Only
              </span>
            </div>
            <div className="space-y-2">
              {fetchOnly.map(([id, p]) => (
                <div key={id} className="flex items-center gap-2 p-2 rounded-lg bg-bg-subtle/50">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-[10px] text-text-muted ml-auto">
                    {p.costPerFetchQuery > 0 ? `$${p.costPerFetchQuery}/query` : "Free"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Overview Cards ──────────────────────────────────────────────────────
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

// ── Provider Table ──────────────────────────────────────────────────────
function ProviderTable({ byProvider, capabilities }) {
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
              <th className="px-4 py-3 text-center font-semibold">Capabilities</th>
              <th className="px-4 py-3 text-right font-semibold">Searches</th>
              <th className="px-4 py-3 text-right font-semibold">Avg Time</th>
              <th className="px-4 py-3 text-right font-semibold">Avg Results</th>
              <th className="px-4 py-3 text-right font-semibold">Cost</th>
            </tr>
          </thead>
          <tbody>
            {providers.map(([name, stats]) => {
              const cap = capabilities?.[name];
              return (
                <tr key={name} className="border-b border-border hover:bg-bg-hover/50">
                  <td className="px-4 py-3 font-medium">{name}</td>
                  <td className="px-4 py-3 text-center">
                    {cap && (
                      <div className="flex items-center justify-center gap-1">
                        {cap.hasSearch && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">
                            Search
                          </span>
                        )}
                        {cap.hasFetch && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-info/10 text-info text-[10px] font-medium">
                            Fetch
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(stats.searches)}</td>
                  <td className="px-4 py-3 text-right text-primary">{fmtMs(stats.avgResponseTimeMs)}</td>
                  <td className="px-4 py-3 text-right text-info">{stats.avgResultCount}</td>
                  <td className="px-4 py-3 text-right text-warning">{fmtCost(stats.cost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Search Type Breakdown ───────────────────────────────────────────────
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

// ── Search Chart ────────────────────────────────────────────────────────
function SearchChart({ timeSeries }) {
  if (!timeSeries || timeSeries.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-text-muted text-sm">No time series data</p>
      </Card>
    );
  }

  const maxSearches = Math.max(...timeSeries.map(d => d.searches), 1);

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

// ── Search Playground ───────────────────────────────────────────────────
function SearchPlayground({ capabilities }) {
  const [query, setQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [searchType, setSearchType] = useState("web");
  const [maxResults, setMaxResults] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  const searchProviders = Object.entries(capabilities || {})
    .filter(([, p]) => p.hasSearch)
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  const handleSearch = async () => {
    if (!query.trim() || !selectedProvider) return;
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedProvider,
          query: query.trim(),
          search_type: searchType,
          max_results: maxResults,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || `HTTP ${res.status}`);
      } else {
        setResults(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase text-text-muted">Search Playground</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {/* Provider Select */}
        <div>
          <label className="block text-xs font-medium mb-1">Provider</label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
          >
            <option value="">Select provider...</option>
            {searchProviders.map(([id, p]) => (
              <option key={id} value={id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Search Type */}
        <div>
          <label className="block text-xs font-medium mb-1">Type</label>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
          >
            <option value="web">Web</option>
            <option value="news">News</option>
          </select>
        </div>

        {/* Max Results */}
        <div>
          <label className="block text-xs font-medium mb-1">Max Results</label>
          <input
            type="number"
            min="1"
            max="20"
            value={maxResults}
            onChange={(e) => setMaxResults(parseInt(e.target.value) || 5)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
          />
        </div>

        {/* Search Button */}
        <div className="flex items-end">
          <Button
            onClick={handleSearch}
            disabled={!query.trim() || !selectedProvider || loading}
            loading={loading}
            className="w-full"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Query Input */}
      <div className="mb-4">
        <Input
          placeholder="Enter search query..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-3">
          {/* Answer (if chat-based) */}
          {results.answer?.text && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium text-primary mb-1">Answer</p>
              <p className="text-sm">{results.answer.text}</p>
            </div>
          )}

          {/* Results List */}
          {results.results?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-text-muted">{results.results.length} results</p>
              {results.results.map((r, i) => (
                <div key={i} className="p-3 rounded-lg border border-border hover:bg-bg-subtle/50">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-text-muted mt-0.5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline line-clamp-1"
                      >
                        {r.title || r.url}
                      </a>
                      <p className="text-xs text-text-muted mt-1 line-clamp-2">{r.snippet}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Metrics */}
          {results.metrics && (
            <div className="flex gap-4 text-xs text-text-muted pt-2 border-t border-border">
              <span>Time: {fmtMs(results.metrics.response_time_ms)}</span>
              <span>Results: {results.results?.length || 0}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────
export default function SearchAnalyticsPage() {
  const [tab, setTab] = useState("analytics");
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
  const capabilities = data?.providerCapabilities || {};

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Search & Fetch</h1>
          <p className="text-text-muted text-sm">Analytics, provider capabilities, and playground</p>
        </div>
        <div className="flex gap-2">
          <SegmentedControl
            options={[
              { value: "analytics", label: "Analytics" },
              { value: "playground", label: "Playground" },
            ]}
            value={tab}
            onChange={setTab}
            size="sm"
          />
          {tab === "analytics" && (
            <SegmentedControl
              options={PERIODS}
              value={period}
              onChange={setPeriod}
              size="sm"
            />
          )}
        </div>
      </div>

      {tab === "analytics" ? (
        <>
          {/* Provider Capabilities */}
          <ProviderCapabilities capabilities={capabilities} />

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
              <ProviderTable byProvider={data.stats.byProvider} capabilities={capabilities} />

              {/* Search Type Breakdown */}
              <SearchTypeBreakdown bySearchType={data.stats.bySearchType} />
            </>
          )}
        </>
      ) : (
        /* Playground Tab */
        <SearchPlayground capabilities={capabilities} />
      )}
    </div>
  );
}
