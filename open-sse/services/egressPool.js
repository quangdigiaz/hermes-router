// EgressPool — port from YuJunZhiXue/Cline-proxy internal/app/proxy_pool.go
// Multi-IP per provider dial-level with round_robin/random/fill + per-proxy cooldown
// TODO: implement dialViaProxy + utls Chrome120 + HTTP/2 (see plan-port-cline-proxy-features.md Phase 1)

const poolState = new Map(); // poolId -> { proxies: string[], strategy, cooldowns: Map(idx→until), cursor }

export function setEgressProxies(poolId, proxies, strategy = "round_robin") {
  if (!poolId || !Array.isArray(proxies)) return;
  poolState.set(poolId, { proxies: proxies.filter(Boolean), strategy, cooldowns: new Map(), cursor: 0 });
}

export function pickEgressProxy(poolId) {
  const state = poolState.get(poolId);
  if (!state || !state.proxies.length) return null;
  const now = Date.now();
  // Clean expired cooldowns
  for (const [idx, until] of [...state.cooldowns.entries()]) if (until <= now) state.cooldowns.delete(idx);
  const available = state.proxies.map((_, i) => i).filter(i => !state.cooldowns.has(i));
  if (!available.length) return null;
  if (state.strategy === "fill") return state.proxies[available[0]];
  if (state.strategy === "random") return state.proxies[available[Math.floor(Math.random() * available.length)]];
  // round_robin default
  const idx = state.cursor % available.length;
  state.cursor = (state.cursor + 1) % state.proxies.length;
  return state.proxies[available[idx]];
}

export function cooldownEgressProxy(poolId, proxyUrl, durationMs = 10 * 60 * 1000) {
  const state = poolState.get(poolId);
  if (!state) return;
  const idx = state.proxies.indexOf(proxyUrl);
  if (idx < 0) return;
  state.cooldowns.set(idx, Date.now() + durationMs);
}

export function isEgressAvailable(poolId, proxyUrl) {
  const state = poolState.get(poolId);
  if (!state) return true;
  const idx = state.proxies.indexOf(proxyUrl);
  if (idx < 0) return true;
  const until = state.cooldowns.get(idx);
  return !until || until <= Date.now();
}

// Stub for future: buildEgressTransport(provider) with utls + CONNECT/SOCKS5
export function buildEgressTransport(provider) {
  // TODO: port proxy_pool.go buildZenTransport() — MaxIdleConns 100, utls Chrome120
  return null;
}
