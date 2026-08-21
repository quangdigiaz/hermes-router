/**
 * BytePlus ModelArk Free Credits Only — usage handler
 *
 * Queries the local usageHistory table to calculate remaining free tokens
 * per model. Each model has a 500K free token quota under Free Credits Only mode.
 *
 * @module services/usage/byteplus
 */

// BytePlus model registry — maps model IDs to display names
// Source: console.byteplus.com/ark (2026-08-21)
const BYTEPLUS_MODELS = [
  { id: "DeepSeek-V4-Flash-GA", name: "DeepSeek-V4-Flash-GA" },
  { id: "DeepSeek-V4-Pro-GA", name: "DeepSeek-V4-Pro-GA" },
  { id: "DeepSeek-V4-flash", name: "DeepSeek-V4-flash" },
  { id: "DeepSeek-V4-pro", name: "DeepSeek-V4-pro" },
  { id: "Dola-Seed-2.1-turbo", name: "Dola-Seed-2.1-turbo" },
  { id: "Dola-Seed-2.0-Code", name: "Dola-Seed-2.0-Code" },
  { id: "Dola-Seed-2.0-pro", name: "Dola-Seed-2.0-pro" },
  { id: "Dola-Seed-2.0-mini", name: "Dola-Seed-2.0-mini" },
  { id: "Dola-Seed-2.0-lite", name: "Dola-Seed-2.0-lite" },
  { id: "GLM-5.2", name: "GLM-5.2" },
];

const FREE_QUOTA_TOTAL = 500_000;

/**
 * Get free quota usage for BytePlus ModelArk models.
 * Queries local usageHistory table for token consumption per model.
 *
 * @param {string} apiKey - Not used (local DB query)
 * @param {object} proxyOptions - Not used
 * @returns {Object} Quota data in format expected by QuotaTable
 */
export async function getByteplusUsage(apiKey, proxyOptions) {
  try {
    // Dynamic import to avoid circular deps — only works in Next.js context
    const { getDb } = await import("@/lib/db/index.js");
    const db = getDb();

    const quotas = {};

    for (const model of BYTEPLUS_MODELS) {
      const row = db.get(
        `SELECT COALESCE(SUM(promptTokens + completionTokens), 0) AS used
         FROM usageHistory
         WHERE provider = 'byteplus' AND model = ?`,
        [model.id]
      );

      const used = row?.used || 0;
      const remaining = Math.max(0, FREE_QUOTA_TOTAL - used);
      const remainingPercentage = FREE_QUOTA_TOTAL > 0
        ? Math.round((remaining / FREE_QUOTA_TOTAL) * 100)
        : 0;

      quotas[model.id] = {
        displayName: model.name,
        used,
        total: FREE_QUOTA_TOTAL,
        remaining: remainingPercentage,
        resetAt: null,
      };
    }

    return {
      quotas,
      message: null,
    };
  } catch (e) {
    return {
      quotas: {},
      message: `Failed to load BytePlus quota: ${e.message}`,
    };
  }
}
