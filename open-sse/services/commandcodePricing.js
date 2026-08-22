/**
 * Live pricing for Command Code Provider API — deals auto-applied.
 * Fetches GET https://api.commandcode.ai/provider/v1/models (OpenAI format)
 * and caches blended cost per model. Falls back to static PROMO_PRICING when fetch fails.
 * No hardcode of Go/Pro/Max 2×/5× tables — live from upstream.
 */

const ENDPOINT = "https://api.commandcode.ai/provider/v1/models";
const TTL_MS = 60 * 60 * 1000; // 1h — deals change slowly, pricing page says auto-expires

let cache = { map: new Map(), expires: 0, inflight: null };

async function fetchLive() {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(ENDPOINT, { headers: { "Content-Type": "application/json" }, signal: controller.signal, cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
    const map = new Map();
    for (const m of raw) {
      const id = m?.id || m?.name;
      if (!id) continue;
      // Try to extract per-million pricing if upstream includes it (e.g. m.pricing or m.cost)
      // Common shapes: {id, pricing:{input,output}} or {id, cost:{input,output}} or {id, price:"$0.30/1M"}
      const p = m.pricing || m.cost || m.price || null;
      let input = null, output = null;
      if (p && typeof p === "object") {
        input = p.input ?? p.prompt ?? p.input_price ?? null;
        output = p.output ?? p.completion ?? p.output_price ?? null;
      }
      // If pricing present, store blended; else leave empty so fallback uses static
      if (typeof input === "number" && typeof output === "number") {
        map.set(id, { input, output });
        // Also index short name for case-insensitive --model matching
        const short = String(id).split("/").pop().toLowerCase();
        if (!map.has(short)) map.set(short, { input, output });
      } else if (m.id) {
        // Keep id in map as known model even without pricing (for validation)
        if (!map.has(id)) map.set(id, null);
      }
    }
    return map;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function getCommandCodePricingMap() {
  const now = Date.now();
  if (cache.map.size > 0 && now < cache.expires) return cache.map;
  if (cache.inflight) return cache.inflight;
  cache.inflight = (async () => {
    const live = await fetchLive();
    if (live && live.size > 0) {
      cache.map = live;
      cache.expires = now + TTL_MS;
    } else if (cache.map.size === 0) {
      // First fetch failed — keep empty, retry in 60s
      cache.expires = now + 60 * 1000;
    }
    cache.inflight = null;
    return cache.map;
  })();
  return cache.inflight;
}

export function getCommandCodeLivePricing(modelId) {
  if (!modelId || cache.map.size === 0) return null;
  const direct = cache.map.get(modelId);
  if (direct) return direct;
  const short = String(modelId).split("/").pop().toLowerCase();
  return cache.map.get(short) || cache.map.get(modelId.toLowerCase()) || null;
}

export function clearCommandCodePricingCache() {
  cache.map = new Map();
  cache.expires = 0;
  cache.inflight = null;
}
