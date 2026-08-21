/**
 * Deprecated Model Tracker
 * 
 * Tracks404 "deprecated model" errors to prevent calling models that no longer exist.
 * Stores in global state (survives hot reload) with periodic persistence to DB.
 * 
 * Purpose: Weekly audit report to identify and disable deprecated models before
 * providers ban accounts for bot-like behavior.
 */

// In-memory store — survives hot reload via global
if (!global._deprecatedModelTracker) {
  global._deprecatedModelTracker = {
    /** @type {Map<string, DeprecatedModelEntry>} key = `${provider}/${model}` */
    entries: new Map(),
    /** @type {number} last cleanup timestamp */
    lastCleanup: Date.now(),
  };
}

const state = global._deprecatedModelTracker;

/**
 * @typedef {Object} DeprecatedModelEntry
 * @property {string} provider
 * @property {string} model
 * @property {string} firstSeen - ISO timestamp
 * @property {string} lastSeen - ISO timestamp
 * @property {number} hitCount - total hits since first seen
 * @property {string} lastError - last error message (truncated)
 * @property {string[]} connectionIds - affected connection IDs
 * @property {boolean} disabled - whether model has been auto-disabled
 * @property {string|null} disabledAt - when it was disabled
 */

/**
 * Record a deprecated model error.
 * Called when classify429 returns kind=deprecated_model or auth.js detects deprecated model.
 * 
 * @param {Object} params
 * @param {string} params.provider
 * @param {string} params.model
 * @param {string} [params.connectionId]
 * @param {string} [params.error]
 */
export function recordDeprecatedModel({ provider, model, connectionId, error }) {
  if (!provider || !model) return;

  const key = `${provider}/${model}`;
  const now = new Date().toISOString();
  const existing = state.entries.get(key);

  if (existing) {
    existing.hitCount++;
    existing.lastSeen = now;
    existing.lastError = (typeof error === "string" ? error : JSON.stringify(error)).slice(0, 500);
    if (connectionId && !existing.connectionIds.includes(connectionId)) {
      existing.connectionIds.push(connectionId);
      // Cap at 20 connections to prevent unbounded growth
      if (existing.connectionIds.length > 20) {
        existing.connectionIds = existing.connectionIds.slice(-20);
      }
    }
  } else {
    state.entries.set(key, {
      provider,
      model,
      firstSeen: now,
      lastSeen: now,
      hitCount: 1,
      lastError: (typeof error === "string" ? error : JSON.stringify(error)).slice(0, 500),
      connectionIds: connectionId ? [connectionId] : [],
      disabled: false,
      disabledAt: null,
    });
  }
}

/**
 * Get all tracked deprecated models.
 * @param {Object} [filters]
 * @param {string} [filters.provider] - filter by provider
 * @param {boolean} [filters.onlyActive] - only non-disabled entries
 * @returns {DeprecatedModelEntry[]}
 */
export function getDeprecatedModels(filters = {}) {
  let entries = Array.from(state.entries.values());

  if (filters.provider) {
    entries = entries.filter(e => e.provider === filters.provider);
  }
  if (filters.onlyActive) {
    entries = entries.filter(e => !e.disabled);
  }

  // Sort by hitCount descending (most problematic first)
  entries.sort((a, b) => b.hitCount - a.hitCount);

  return entries;
}

/**
 * Mark a deprecated model as disabled.
 * @param {string} provider
 * @param {string} model
 */
export function markDeprecatedModelDisabled(provider, model) {
  const key = `${provider}/${model}`;
  const entry = state.entries.get(key);
  if (entry) {
    entry.disabled = true;
    entry.disabledAt = new Date().toISOString();
  }
}

/**
 * Get summary stats for the audit report.
 */
export function getDeprecatedModelStats() {
  const entries = Array.from(state.entries.values());
  const active = entries.filter(e => !e.disabled);
  const disabled = entries.filter(e => e.disabled);

  // Group by provider
  const byProvider = {};
  for (const entry of active) {
    if (!byProvider[entry.provider]) {
      byProvider[entry.provider] = { count: 0, totalHits: 0, models: [] };
    }
    byProvider[entry.provider].count++;
    byProvider[entry.provider].totalHits += entry.hitCount;
    byProvider[entry.provider].models.push(entry.model);
  }

  // Total risk score (sum of all hit counts for active deprecated models)
  const riskScore = active.reduce((sum, e) => sum + e.hitCount, 0);

  // Accounts at risk (unique connection IDs across all active entries)
  const accountsAtRisk = new Set(active.flatMap(e => e.connectionIds));

  return {
    totalTracked: entries.length,
    activeCount: active.length,
    disabledCount: disabled.length,
    totalHits: entries.reduce((sum, e) => sum + e.hitCount, 0),
    riskScore,
    accountsAtRisk: accountsAtRisk.size,
    byProvider,
    entries: active, // return active entries for display
  };
}

/**
 * Cleanup old entries (older than 30 days) that are disabled.
 */
export function cleanupOldEntries() {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const [key, entry] of state.entries) {
    if (entry.disabled && new Date(entry.disabledAt).getTime() < thirtyDaysAgo) {
      state.entries.delete(key);
    }
  }
}

/**
 * Get the list of models that should be disabled based on deprecated tracking.
 * Returns models with hitCount > threshold (default: 3 hits).
 * @param {number} threshold
 * @returns {Array<{provider: string, model: string, reason: string}>}
 */
export function getModelsToDisable(threshold = 3) {
  const entries = Array.from(state.entries.values());
  return entries
    .filter(e => !e.disabled && e.hitCount >= threshold)
    .map(e => ({
      provider: e.provider,
      model: e.model,
      reason: `Deprecated ${e.hitCount}x since ${e.firstSeen.split("T")[0]}`,
      hitCount: e.hitCount,
      firstSeen: e.firstSeen,
      lastSeen: e.lastSeen,
    }));
}
