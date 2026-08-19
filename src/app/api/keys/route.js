import { NextResponse } from "next/server";
import { getApiKeys, createApiKey } from "@/lib/localDb";
import { getConsistentMachineId } from "@/shared/utils/machineId";
import { getApiKeyUsageSummary } from "@/lib/quota/apiKeyQuotaService.js";

export const dynamic = "force-dynamic";

// GET /api/keys - List API keys with real-time quota usage
export async function GET() {
  try {
    const rawKeys = await getApiKeys();

    const keysWithUsage = await Promise.all(
      rawKeys.map(async (k) => {
        const usage = await getApiKeyUsageSummary(k.key, k.quotaPeriod || "none");
        let tokenPercent = 0;
        if (k.tokenLimit && k.tokenLimit > 0) {
          tokenPercent = Math.min(100, Math.round((usage.usedTokens / k.tokenLimit) * 100));
        }
        let budgetPercent = 0;
        if (k.budgetLimit && k.budgetLimit > 0) {
          budgetPercent = Math.min(100, Math.round((usage.usedBudget / k.budgetLimit) * 100));
        }

        return {
          ...k,
          usage,
          tokenPercent,
          budgetPercent,
          isExpired: k.expiresAt ? new Date(k.expiresAt) < new Date() : false,
        };
      })
    );

    return NextResponse.json({ keys: keysWithUsage });
  } catch (error) {
    console.log("Error fetching keys:", error);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}

// POST /api/keys - Create new API key with optional limits
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      name,
      allowedProviders,
      allowedCombos,
      allowedKinds,
      allowedModels,
      tokenLimit,
      budgetLimit,
      quotaPeriod,
      rpmLimit,
      expiresAt,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Always get machineId from server
    const machineId = await getConsistentMachineId();
    const apiKey = await createApiKey(name, machineId, {
      allowedProviders: allowedProviders || null,
      allowedCombos: allowedCombos || null,
      allowedKinds: allowedKinds || null,
      allowedModels: allowedModels || null,
      tokenLimit: typeof tokenLimit === "number" ? tokenLimit : (tokenLimit ? Number(tokenLimit) : null),
      budgetLimit: typeof budgetLimit === "number" ? budgetLimit : (budgetLimit ? Number(budgetLimit) : null),
      quotaPeriod: quotaPeriod || "none",
      rpmLimit: typeof rpmLimit === "number" ? rpmLimit : (rpmLimit ? Number(rpmLimit) : null),
      expiresAt: expiresAt || null,
    });

    return NextResponse.json({
      key: apiKey.key,
      name: apiKey.name,
      id: apiKey.id,
      machineId: apiKey.machineId,
      tokenLimit: apiKey.tokenLimit,
      budgetLimit: apiKey.budgetLimit,
      quotaPeriod: apiKey.quotaPeriod,
      rpmLimit: apiKey.rpmLimit,
      expiresAt: apiKey.expiresAt,
      allowedModels: apiKey.allowedModels,
    }, { status: 201 });
  } catch (error) {
    console.log("Error creating key:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}
