import { NextResponse } from "next/server";
import { getDeprecatedModels, getDeprecatedModelStats, getModelsToDisable } from "@/lib/deprecatedModelTracker.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/usage/deprecated-models
 * 
 * Returns audit data for models that have been flagged as deprecated/unavailable.
 * Used by the dashboard to show which models should be disabled to prevent
 * account bans from bot-like behavior.
 * 
 * Query params:
 * - provider: filter by provider name
 * - onlyActive: "true" to show only non-disabled entries
 * - stats: "true" to return summary stats only
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") || undefined;
    const onlyActive = searchParams.get("onlyActive") === "true";
    const statsOnly = searchParams.get("stats") === "true";

    if (statsOnly) {
      const stats = getDeprecatedModelStats();
      return NextResponse.json(stats);
    }

    const entries = getDeprecatedModels({ provider, onlyActive });
    const recommendations = getModelsToDisable(3); // threshold: 3 hits
    const stats = getDeprecatedModelStats();

    return NextResponse.json({
      entries,
      recommendations,
      stats,
    });
  } catch (error) {
    console.error("[DeprecatedModels] API error:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch deprecated models data" },
      { status: 500 }
    );
  }
}
