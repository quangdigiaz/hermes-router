import { NextResponse } from "next/server";
import { pingModelByKind } from "./ping";
import { clearAccountError } from "@/sse/services/auth";
import { getProviderConnections } from "@/lib/localDb";

// POST /api/models/test - Ping a single model via internal completions or embeddings
// When connectionId is provided and the test succeeds, auto-heal stale lastError.
export async function POST(request) {
  try {
    const { model, kind, connectionId } = await request.json();
    if (!model) return NextResponse.json({ error: "Model required" }, { status: 400 });
    const result = await pingModelByKind(model, kind || "llm");

    // Auto-heal: when a model test succeeds, clear any stale lastError on the
    // connection (e.g. from a previous model-specific 400 INVALID_MODEL_ID).
    if (result.ok && connectionId) {
      try {
        const modelId = model.includes("/") ? model.split("/").pop() : model;
        const provider = model.includes("/") ? model.split("/")[0] : null;
        const conns = await getProviderConnections({ provider });
        const conn = conns.find((c) => c.id === connectionId);
        if (conn && (conn.lastError || conn.testStatus === "unavailable")) {
          await clearAccountError(connectionId, conn, modelId);
        }
      } catch (e) {
        // Best-effort — don't fail the test if auto-heal errors
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
