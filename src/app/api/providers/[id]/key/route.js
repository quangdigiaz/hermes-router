import { NextResponse } from "next/server";
import { getProviderConnectionById } from "@/models";

export const dynamic = "force-dynamic";

/**
 * GET /api/providers/[id]/key
 * Retrieve the actual apiKey for viewing or copying in authorized dashboard sessions.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const connection = await getProviderConnectionById(id);

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: connection.id,
      provider: connection.provider,
      apiKey: connection.apiKey || null,
      hasKey: !!connection.apiKey,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve provider API key" },
      { status: 500 }
    );
  }
}
