// In-memory egress metadata populated by optional proxy probes.
// No probe runs here: callers receive null until another service records data.

const POOL_GEO_STATE_KEY = "__hermes-routerPoolGeo__";
const poolGeo = (globalThis[POOL_GEO_STATE_KEY] ??= new Map());

export function getPoolGeo(poolId) {
  return poolId ? poolGeo.get(poolId) || null : null;
}

export function setPoolGeo(poolId, geo) {
  if (!poolId) return;
  if (geo == null) poolGeo.delete(poolId);
  else poolGeo.set(poolId, geo);
}

export function clearPoolGeo(poolId) {
  if (poolId) poolGeo.delete(poolId);
}

export function resetPoolGeo() {
  poolGeo.clear();
}
