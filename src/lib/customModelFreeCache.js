/**
 * Custom Model Free Cache — server-only.
 *
 * Caches custom models manually tagged "free" (Map<providerAlias, Set<modelId>>)
 * so combo routing can treat them as free models without an async DB read per
 * candidate. Kept OUT of open-sse/config/benchmarks.js because that module is
 * imported by client components — a static server DB import there would break
 * the client bundle.
 */

import { getCustomModels } from "@/models";

const TTL_MS = 15_000;

if (!global._customModelFreeCache) {
  global._customModelFreeCache = { map: null, ts: 0, loading: null };
}

const state = global._customModelFreeCache;

async function load() {
  const models = await getCustomModels();
  const map = new Map(); // providerAlias -> Set<modelId>
  for (const m of models) {
    if (!m?.isFree || !m.providerAlias || !m.id) continue;
    if (!map.has(m.providerAlias)) map.set(m.providerAlias, new Set());
    map.get(m.providerAlias).add(m.id);
  }
  state.map = map;
  state.ts = Date.now();
  return map;
}

// Coalesce concurrent loads so a burst of calls shares one DB read.
function getMap() {
  const now = Date.now();
  if (state.map && now - state.ts < TTL_MS) return Promise.resolve(state.map);
  if (state.loading) return state.loading;
  state.loading = load().finally(() => {
    state.loading = null;
  });
  return state.loading;
}

/**
 * Check one provider/model against the cached free custom models.
 * @param {string} providerAlias
 * @param {string} modelId
 * @returns {Promise<boolean>}
 */
export async function isCustomModelFree(providerAlias, modelId) {
  if (!providerAlias || !modelId) return false;
  const map = await getMap();
  return map.get(providerAlias)?.has(modelId) ?? false;
}

/**
 * Full cached map (providerAlias -> Set<modelId>) — for batch filters.
 * @returns {Promise<Map<string, Set<string>>>}
 */
export async function getFreeCustomModelsMap() {
  return getMap();
}

/** Force the next lookup to reload from DB (called after custom model writes). */
export function invalidateCustomModelFreeCache() {
  state.map = null;
  state.ts = 0;
}
