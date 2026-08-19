import { NextResponse } from "next/server";
import { getCombos, createCombo, getComboByName } from "@/lib/localDb";
import { invalidateAllowedModelsCache } from "@/sse/services/allowedModels.js";
import { AUTO_TEMPLATES } from "open-sse/config/autoTemplates.js";
import { validateContextLength } from "./[id]/route.js";

export const dynamic = "force-dynamic";

// Validate combo name: only a-z, A-Z, 0-9, -, _
const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

// GET /api/combos - Get all combos (Built-in + Custom DB combos)
export async function GET() {
  try {
    const dbCombos = await getCombos();

    // Map AUTO_TEMPLATES to Combo schema for UI consumption
    const builtinCombos = Object.entries(AUTO_TEMPLATES).map(([name, tmpl]) => ({
      id: `builtin-${name.replace("/", "-")}`,
      name,
      isBuiltin: true,
      strategy: tmpl.strategy || "auto",
      mode: tmpl.mode || "balanced",
      description: tmpl.description || "",
      models: Array.isArray(tmpl.models) ? tmpl.models : [],
      kind: tmpl.requiresVision ? "vision" : (tmpl.requiresTools ? "agent" : "llm"),
      sessionAffinity: tmpl.sessionAffinity || false,
      minQuality: tmpl.minQuality || null,
      filter: tmpl.filter || null,
      createdAt: "2026-08-17T00:00:00Z",
    }));

    return NextResponse.json({
      combos: [...builtinCombos, ...(Array.isArray(dbCombos) ? dbCombos : [])],
      builtinCount: builtinCombos.length,
      customCount: Array.isArray(dbCombos) ? dbCombos.length : 0,
    });
  } catch (error) {
    console.log("Error fetching combos:", error);
    return NextResponse.json({ error: "Failed to fetch combos" }, { status: 500 });
  }
}

// POST /api/combos - Create new combo
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, models, kind, context_length } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate name format
    if (!VALID_NAME_REGEX.test(name)) {
      return NextResponse.json({ error: "Name can only contain letters, numbers, -, _ and ." }, { status: 400 });
    }

    let contextLength = null;
    if ("context_length" in body && context_length !== undefined && context_length !== null) {
      const v = validateContextLength(context_length);
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
      contextLength = v.value;
    }

    // Check if name already exists
    const existing = await getComboByName(name);
    if (existing) {
      return NextResponse.json({ error: "Combo name already exists" }, { status: 400 });
    }

    const combo = await createCombo({ name, models: models || [], kind: kind || null, context_length: contextLength });
    invalidateAllowedModelsCache();

    return NextResponse.json(combo, { status: 201 });
  } catch (error) {
    console.log("Error creating combo:", error);
    return NextResponse.json({ error: "Failed to create combo" }, { status: 500 });
  }
}
