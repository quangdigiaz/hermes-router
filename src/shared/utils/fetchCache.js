const cache = new Map();
const pending = new Map();

function cacheKey(url, options) {
  return JSON.stringify([String(url), options?.method || "GET", options?.headers || {}, options?.body || null]);
}

function responseFromSnapshot(snapshot) {
  return new Response(snapshot.body, {
    status: snapshot.status,
    statusText: snapshot.statusText,
    headers: snapshot.headers,
  });
}

/**
 * Fetch and retain a response snapshot so callers receive independent bodies.
 * Explicit invalidation keeps dashboard data fresh after mutations.
 */
export async function fetchCached(url, options = {}) {
  const key = cacheKey(url, options);
  const cached = cache.get(key);
  if (cached) return responseFromSnapshot(cached);

  let request = pending.get(key);
  if (!request) {
    request = (async () => {
      const response = await fetch(url, { cache: "no-store", ...options });
      const snapshot = {
        body: await response.clone().arrayBuffer(),
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers.entries()],
      };
      cache.set(key, snapshot);
      return snapshot;
    })().finally(() => pending.delete(key));
    pending.set(key, request);
  }

  return responseFromSnapshot(await request);
}

export async function fetchCachedJson(url, options = {}) {
  const res = await fetchCached(url, options);
  return res.json();
}

export function invalidateCache(url, options = {}) {
  cache.delete(cacheKey(url, options));
}

export function clearFetchCache() {
  cache.clear();
}


