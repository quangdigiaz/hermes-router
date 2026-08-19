/**
 * Auto-Disable Tracker — counts consecutive hard errors per key (connectionId or provider|model)
 * and triggers auto-disable when threshold is exceeded.
 */

const HARD_STATUSES = new Set([401, 403, 404]);
const SKIP_STATUSES = new Set([499, 524, 599, 429, 503]);

const DEFAULT_CONFIG = {
  enabled: true,
  threshold: 5,
  windowMs: 300_000, // 5 minutes
};

if (!global._autoDisableState) {
  global._autoDisableState = {
    counters: new Map(),
    // Per-connection auth-error counter (401 / 403-invalid-token) — used to
    // deactivate whole accounts (login-based providers like Kiro) instead of
    // only disabling the failing model.
    authCounters: new Map(),
    config: { ...DEFAULT_CONFIG },
  };
}

const state = global._autoDisableState;

export function classifyHardError(status, errorText = "") {
  if (SKIP_STATUSES.has(status)) return "skip";
  if (HARD_STATUSES.has(status)) {
    // 403 must be specifically "invalid token" related, not just any 403
    if (status === 403) {
      const text = (errorText || "").toLowerCase();
      if (text.includes("invalid") || text.includes("expired") || text.includes("unauthorized") || text.includes("bearer")) {
        return "hard";
      }
      return "soft";
    }
    return "hard";
  }
  return "soft";
}

export function recordHardError(key) {
  const now = Date.now();
  const existing = state.counters.get(key);

  if (!existing || now - existing.firstTs > state.config.windowMs) {
    state.counters.set(key, { count: 1, firstTs: now });
    return 1;
  }

  existing.count++;
  return existing.count;
}

export function getHardErrorCount(key) {
  const existing = state.counters.get(key);
  if (!existing) return 0;
  if (Date.now() - existing.firstTs > state.config.windowMs) {
    state.counters.delete(key);
    return 0;
  }
  return existing.count;
}

export function resetCounter(key) {
  state.counters.delete(key);
}

/** Record an auth-level failure (401 / 403-invalid-token) for a connection. */
export function recordAuthFailure(connectionId) {
  if (!connectionId) return 0;
  const now = Date.now();
  const existing = state.authCounters.get(connectionId);
  if (!existing || now - existing.firstTs > state.config.windowMs) {
    state.authCounters.set(connectionId, { count: 1, firstTs: now });
    return 1;
  }
  existing.count++;
  return existing.count;
}

/** Whether the connection has hit the auth-failure threshold in the window. */
export function shouldDeactivateAccount(connectionId) {
  if (!state.config.enabled || !connectionId) return false;
  const existing = state.authCounters.get(connectionId);
  if (!existing) return false;
  if (Date.now() - existing.firstTs > state.config.windowMs) {
    state.authCounters.delete(connectionId);
    return false;
  }
  return existing.count >= state.config.threshold;
}

export function resetAuthCounter(connectionId) {
  state.authCounters.delete(connectionId);
}

/**
 * Reset all auto-disable counters for a connection that was previously
 * auth_failed — called when the user fixes their token or re-enables
 * the account from the dashboard.
 */
export function reactivateConnection(connectionId) {
  if (!connectionId) return;
  resetAuthCounter(connectionId);
  resetCounter(connectionId);
}

export function getAutoDisableConfig() {
  return { ...state.config };
}

export function updateAutoDisableConfig(updates) {
  Object.assign(state.config, updates);
}

export function shouldAutoDisable(key) {
  if (!state.config.enabled) return false;
  const count = getHardErrorCount(key);
  return count >= state.config.threshold;
}

export function getActiveTrackers() {
  const now = Date.now();
  const active = [];
  for (const [key, data] of state.counters) {
    if (now - data.firstTs <= state.config.windowMs) {
      active.push({ key, count: data.count, firstTs: data.firstTs });
    }
  }
  return active;
}
