import { NextResponse } from "next/server";
import { getComboById } from "@/lib/localDb";
import { pingModelByKind } from "@/app/api/models/test/ping";
import { UPDATER_CONFIG } from "@/shared/constants/config";

/**
 * POST /api/combos/[id]/test
 * Tests every model in the combo independently (loopback through the
 * router's own internal endpoints, same as provider model tests) and
 * reports per-model status so broken members are visible from the
 * dashboard.
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const combo = await getComboById(id);

    if (!combo) {
      return NextResponse.json({ error: "Combo not found" }, { status: 404 });
    }

    const models = combo.models || [];
    if (models.length === 0) {
      return NextResponse.json({ error: "Combo has no models" }, { status: 400 });
    }

    const kind = combo.kind || "llm";
    const baseUrl = `http://127.0.0.1:${process.env.PORT || UPDATER_CONFIG.appPort}`;

    // Warm up with the first model to trigger token refresh (if needed)
    // before parallel calls — same pattern as /api/providers/[id]/test-models.
    const [first, ...rest] = models;
    const firstResult = await pingModelByKind(first, kind, baseUrl);
    const results = [{ model: first, ...firstResult }];

    if (rest.length > 0) {
      const restResults = await Promise.all(
        rest.map(async (model) => {
          const result = await pingModelByKind(model, kind, baseUrl);
          return { model, ...result };
        })
      );
      results.push(...restResults);
    }

    return NextResponse.json({
      comboId: combo.id,
      name: combo.name,
      results,
      testedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error testing combo:", error);
    return NextResponse.json({ error: "Combo test failed" }, { status: 500 });
  }
}
