/**
 * BytePlus ModelArk Free Credits Only — usage handler
 *
 * Queries the local usageHistory table to calculate remaining free tokens
 * per model. Each model has a 500K free token quota under Free Credits Only mode.
 *
 * @module services/usage/byteplus
 */

// BytePlus model registry — maps model IDs to display names
const BYTEPLUS_MODELS = [
  { id: "seed-2-0-pro-260328", name: "Seed 2.0 Pro" },
  { id: "seed-2-0-code-preview-260328", name: "Seed 2.0 Code Preview" },
  { id: "seed-2-0-mini-260215", name: "Seed 2.0 Mini" },
  { id: "seed-2-0-lite-260228", name: "Seed 2.0 Lite" },
  { id: "kimi-k2-thinking-251104", name: "Kimi K2 Thinking" },
  { id: "glm-4-7-251222", name: "GLM 4.7" },
  { id: "gpt-oss-120b-250805", name: "GPT-OSS-120B" },
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
