import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver.js";

/**
 * GET /api/usage/search?period=7d&provider=brave-search
 * 
 * Returns search-specific analytics:
 * - Total searches, by provider, by search type
 * - Average response time, result counts
 * - Cost breakdown
 * - Time series data for charts
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const provider = searchParams.get("provider") || null;

    const db = await getAdapter();
    
    // Calculate cutoff date
    const now = new Date();
    let cutoff;
    const periodDays = { "today": 0, "24h": 1, "7d": 7, "30d": 30, "60d": 60 };
    
    if (period === "today") {
      cutoff = new Date(now);
      cutoff.setHours(0, 0, 0, 0);
    } else {
      const days = periodDays[period] || 7;
      cutoff = new Date(now.getTime() - days * 86400000);
    }

    // Get search requests from usageHistory
    const conditions = ["endpoint = '/v1/search'"];
    const params = [cutoff.toISOString()];
    
    if (provider) {
      conditions.push("provider = ?");
      params.push(provider);
    }

    const whereClause = conditions.join(" AND ");
    
    // Get all search requests
    const rows = db.all(`
      SELECT 
        timestamp, provider, model, connectionId, apiKey, 
        cost, status, tokens, meta
      FROM usageHistory 
      WHERE ${whereClause}
      ORDER BY id DESC
    `, params);

    // Parse and aggregate
    const stats = {
      totalSearches: rows.length,
      byProvider: {},
      bySearchType: {},
      byStatus: {},
      totalCost: 0,
      avgResponseTimeMs: 0,
      avgResultCount: 0,
      timeSeries: [],
    };

    let totalResponseTime = 0;
    let totalResultCount = 0;
    let responseTimeCount = 0;
    let resultCountCount = 0;

    for (const row of rows) {
      const meta = row.meta ? JSON.parse(row.meta) : {};
      const providerName = row.provider || "unknown";
      const searchType = meta.searchType || "web";
      const responseTimeMs = meta.responseTimeMs || 0;
      const resultCount = meta.resultCount || 0;
      const cost = row.cost || 0;

      // By provider
      if (!stats.byProvider[providerName]) {
        stats.byProvider[providerName] = {
          searches: 0,
          cost: 0,
          avgResponseTimeMs: 0,
          avgResultCount: 0,
          totalResponseTime: 0,
          totalResultCount: 0,
        };
      }
      const provStats = stats.byProvider[providerName];
      provStats.searches++;
      provStats.cost += cost;
      provStats.totalResponseTime += responseTimeMs;
      provStats.totalResultCount += resultCount;

      // By search type
      if (!stats.bySearchType[searchType]) {
        stats.bySearchType[searchType] = { searches: 0, cost: 0 };
      }
      stats.bySearchType[searchType].searches++;
      stats.bySearchType[searchType].cost += cost;

      // By status
      const status = row.status || "success";
      if (!stats.byStatus[status]) {
        stats.byStatus[status] = 0;
      }
      stats.byStatus[status]++;

      // Totals
      stats.totalCost += cost;
      if (responseTimeMs > 0) {
        totalResponseTime += responseTimeMs;
        responseTimeCount++;
      }
      if (resultCount > 0) {
        totalResultCount += resultCount;
        resultCountCount++;
      }
    }

    // Calculate averages
    stats.avgResponseTimeMs = responseTimeCount > 0 
      ? Math.round(totalResponseTime / responseTimeCount) 
      : 0;
    stats.avgResultCount = resultCountCount > 0 
      ? Math.round(totalResultCount / resultCountCount * 10) / 10 
      : 0;

    // Calculate provider averages
    for (const [name, provStats] of Object.entries(stats.byProvider)) {
      provStats.avgResponseTimeMs = provStats.totalResponseTime > 0 && provStats.searches > 0
        ? Math.round(provStats.totalResponseTime / provStats.searches)
        : 0;
      provStats.avgResultCount = provStats.totalResultCount > 0 && provStats.searches > 0
        ? Math.round(provStats.totalResultCount / provStats.searches * 10) / 10
        : 0;
      // Clean up temp fields
      delete provStats.totalResponseTime;
      delete provStats.totalResultCount;
    }

    // Build time series for chart
    const bucketCount = period === "today" ? 24 : period === "24h" ? 24 : periodDays[period] || 7;
    const bucketMs = period === "today" || period === "24h" ? 3600000 : 86400000;
    
    const startTime = period === "today" 
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      : now.getTime() - bucketCount * bucketMs;
    
    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const ts = startTime + i * bucketMs;
      const label = period === "today" || period === "24h"
        ? new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
        : new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { label, searches: 0, cost: 0, avgResponseTimeMs: 0, totalResponseTimeMs: 0 };
    });

    for (const row of rows) {
      const ts = new Date(row.timestamp).getTime();
      if (ts < startTime) continue;
      const idx = Math.min(
        Math.floor((ts - startTime) / bucketMs),
        bucketCount - 1
      );
      if (idx >= 0 && idx < bucketCount) {
        buckets[idx].searches++;
        buckets[idx].cost += row.cost || 0;
        const meta = row.meta ? JSON.parse(row.meta) : {};
        if (meta.responseTimeMs > 0) {
          buckets[idx].totalResponseTimeMs += meta.responseTimeMs;
        }
      }
    }

    // Calculate bucket averages
    stats.timeSeries = buckets.map(b => ({
      label: b.label,
      searches: b.searches,
      cost: b.cost,
      avgResponseTimeMs: b.searches > 0 
        ? Math.round(b.totalResponseTimeMs / b.searches) 
        : 0,
    }));

    // Get list of unique providers for filter
    const providers = [...new Set(rows.map(r => r.provider).filter(Boolean))];

    return NextResponse.json({
      period,
      provider,
      providers,
      stats,
    });
  } catch (error) {
    console.error("Error fetching search analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch search analytics" },
      { status: 500 }
    );
  }
}
