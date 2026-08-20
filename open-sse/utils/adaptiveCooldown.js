/**
 * Adaptive cooldown state management for account fallback.
 *
 * Unlike fixed exponential backoff, adaptive cooldown:
 * - Increases delay after consecutive failures (punish bad accounts)
 * - Decreases delay after success (reward healthy accounts)
 * - Adds jitter to prevent thundering herd on cooldown expiry
 *
 * Ported concept from 9router-kiro-automator's adaptive cooldown.
 *
 * @module open-sse/utils/adaptiveCooldown
 */

/**
 * Per-connection cooldown state.
 * @typedef {object} CooldownState
 * @property {number} level - Current backoff level (0 = baseline)
 * @property {number} lastSuccessAt - Timestamp of last successful request
 * @property {number} consecutiveFailures - Number of consecutive failures
 */

/** @type {Map<string, CooldownState>} */
const state = new Map();

/** Decay interval: reduce level after this many ms of success (5 minutes) */
const SUCCESS_DECAY_INTERVAL_MS = 5 * 60 * 1000;

/** Maximum jitter ratio (0-1). 0.3 = up to 30% jitter */
const MAX_JITTER_RATIO = 0.3;

/**
 * Get or initialize cooldown state for a connection.
 * @param {string} connectionId
 * @returns {CooldownState}
 */
export function getState(connectionId) {
  if (!state.has(connectionId)) {
    state.set(connectionId, {
      level: 0,
      lastSuccessAt: Date.now(),
      consecutiveFailures: 0,
    });
  }
  return state.get(connectionId);
}

/**
 * Record a successful request for a connection.
 * Reduces backoff level and resets failure count.
 * @param {string} connectionId
 */
export function recordSuccess(connectionId) {
  const s = getState(connectionId);
  s.lastSuccessAt = Date.now();
  s.consecutiveFailures = 0;
  // Decay level: if enough time passed since last success, reduce level
  if (s.level > 0) {
    s.level = Math.max(0, s.level - 1);
  }
}

/**
 * Record a failed request for a connection.
 * Increases backoff level.
 * @param {string} connectionId
 */
export function recordFailure(connectionId) {
  const s = getState(connectionId);
  s.consecutiveFailures++;
  s.level = s.level + 1;
}

/**
 * Get adaptive cooldown duration for a connection.
 *
 * Cooldown = base * 2^(level-1), capped at max, with jitter.
 * Additionally, if the connection has been successful recently,
 * the level is reduced.
 *
 * @param {string} connectionId
 * @param {number} baseMs - Base cooldown in ms (default: 1000)
 * @param {number} maxMs - Maximum cooldown in ms (default: 240000 = 4 min)
 * @param {number} maxLevel - Maximum backoff level (default: 15)
 * @returns {number} Cooldown duration in ms with jitter
 */
export function getAdaptiveCooldown(connectionId, baseMs = 1000, maxMs = 240_000, maxLevel = 15) {
  const s = getState(connectionId);
  let effectiveLevel = s.level;

  // If successful recently, decay the level
  const timeSinceSuccess = Date.now() - s.lastSuccessAt;
  if (timeSinceSuccess < SUCCESS_DECAY_INTERVAL_MS && effectiveLevel > 0) {
    effectiveLevel = Math.max(0, effectiveLevel - 1);
  }

  // Exponential backoff: base * 2^(level-1)
  const adjLevel = Math.max(0, effectiveLevel - 1);
  const cooldown = baseMs * Math.pow(2, adjLevel);
  const capped = Math.min(cooldown, maxMs);

  // Add jitter: 0 to MAX_JITTER_RATIO of the cooldown
  const jitter = Math.random() * MAX_JITTER_RATIO * capped;
  return Math.round(capped + jitter);
}

/**
 * Clear state for a connection (e.g. when account is deleted).
 * @param {string} connectionId
 */
export function clearState(connectionId) {
  state.delete(connectionId);
}

/**
 * Clear all state (for testing).
 */
export function clearAllState() {
  state.clear();
}

/**
 * Get all state (for debugging/testing).
 * @returns {Map<string, CooldownState>}
 */
export function getAllState() {
  return state;
}
