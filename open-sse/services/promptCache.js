/**
 * Cross-provider exact-match prompt cache (port Orca app/prompt_cache.py)
 * LRU 500 entries, TTL 1h, only for deterministic requests (temperature==0 || seed pinned)
 */

const MAX_ENTRIES = 500;
const TTL_MS = 60 * 60 * 1000;

const store = new Map(); // key -> { body, expiresAt }

function hashKey(messages, model, temperature, seed) {
  // Stable JSON key — order matters; messages already normalized by caller
  const payload = JSON.stringify({ messages, model, temperature, seed });
  // Simple djb2 hash hex (avoid crypto import for hot path)
  let hash = 5381;
  for (let i = 0; i < payload.length; i++) {
    hash = ((hash << 5) + hash) ^ payload.charCodeAt(i);
  }
  return `${model}:${hash >>> 0}:${payload.length}`;
}

export function isCacheable(body) {
  if (!body || typeof body !== "object") return false;
  // Orca: deterministic = temperature==0 or seed pinned
  if (body.temperature === 0 || body.temperature === "0") return true;
  if (body.seed != null || body.seed_ != null) return true;
  return false;
}

export function getPromptCacheKey(body) {
  const messages = body.messages || body.input || body.contents || [];
  const model = body.model || "auto";
  const temperature = body.temperature ?? null;
  const seed = body.seed ?? body.seed_ ?? null;
  return hashKey(messages, model, temperature, seed);
}

export function getPromptCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  // LRU touch: delete+reinsert to move to end (Map preserves insertion order)
  store.delete(key);
  store.set(key, entry);
  return entry.body;
}

export function setPromptCache(key, responseBody) {
  if (store.size >= MAX_ENTRIES) {
    // Evict oldest (first key in insertion order)
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { body: responseBody, expiresAt: Date.now() + TTL_MS });
}

export function clearPromptCache() {
  store.clear();
}

export function getPromptCacheStats() {
  return { size: store.size, max: MAX_ENTRIES, ttlMs: TTL_MS };
}
