// OpencodeModels — port from YuJunZhiXue/Cline-proxy internal/app/zen.go
// Dynamic sync free models from https://opencode.ai/zen/v1/models

const ZEN_BASE = "https://opencode.ai/zen/v1";
const ZEN_MODELS_URL = `${ZEN_BASE}/models`;
const SYNC_INTERVAL_MS = 10 * 60 * 1000;

const seedModels = [
  { id: "deepseek-v4-flash-free", context: 200000, alias: "deepseek-v4-flash" },
  { id: "mimo-v2.5-free", context: 200000 },
  { id: "ling-3.0-flash-free", context: 200000 },
  { id: "nemotron-3-ultra-free", context: 1000000 },
  { id: "north-mini-code-free", context: 256000 },
  { id: "laguna-s-2.1-free", context: 200000 },
  { id: "longcat-2.0-free", context: 200000 },
  { id: "big-pickle", context: 200000 },
];

let cachedModels = [...seedModels];
let lastSync = 0;
let syncTimer = null;

export function getZenModels() {
  return cachedModels;
}

export function isZenFreeModel(modelId) {
  if (!modelId) return false;
  const base = modelId.includes("/") ? modelId.split("/").pop() : modelId;
  if (base.endsWith("-free") || base.endsWith(":free")) return true;
  return cachedModels.some(m => m.id === base || m.alias === base);
}

export async function syncOpencodeModels() {
  try {
    const res = await fetch(ZEN_MODELS_URL, {
      headers: { Authorization: "Bearer public", "x-opencode-client": "desktop" },
    });
    if (!res.ok) throw new Error(`zen sync ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.models || data.data || [];
    const newIds = list.map(m => m.id || m.name).filter(Boolean);
    // Merge new IDs not in seed/alias
    for (const id of newIds) {
      if (!cachedModels.some(m => m.id === id || m.alias === id)) {
        cachedModels.push({ id, context: 200000, source: "synced" });
      }
    }
    lastSync = Date.now();
    return cachedModels;
  } catch (e) {
    console.warn("[opencodeModels] sync failed:", e.message);
    return cachedModels;
  }
}

export function startZenModelsRefresher() {
  if (syncTimer) return;
  syncTimer = setInterval(syncOpencodeModels, SYNC_INTERVAL_MS);
  syncTimer.unref?.();
  // Initial sync without blocking
  syncOpencodeModels().catch(() => {});
}

export function stopZenModelsRefresher() {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = null;
}

export function resolveZenModel(modelId) {
  if (!modelId) return modelId;
  // Support opencode/<id> prefix and alias
  const base = modelId.includes("/") ? modelId.split("/").pop() : modelId;
  const found = cachedModels.find(m => m.id === base || m.alias === base);
  return found ? found.id : base;
}
