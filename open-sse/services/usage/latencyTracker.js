/**
 * In-memory latency tracker for auto-combo scoring.
 *
 * Tracks p95 latency per provider/model using a ring buffer.
 * Fast O(1) record, O(n log n) p95 calculation (n = buffer size).
 * Auto-expires samples older than windowMs.
 */

// ─── Default p95 values (used when no data available) ───────────────────────

const DEFAULT_P95_MS = {
  // Premium
  "opus": 6000,
  "o3": 5000,
  "gpt-5": 4500,
  "claude-sonnet-5": 4000,

  // Standard
  "sonnet": 4000,
  "gpt-4o": 3000,
  "gemini-pro": 3500,
  "deepseek-v3": 2500,
  "kimi-k2": 2500,

  // Budget
  "mini": 2000,
  "flash": 1200,
  "haiku": 1800,
  "deepseek-chat": 2000,

  // Fallback
  "default": 3000,
};

// ─── Ring Buffer ────────────────────────────────────────────────────────────

class RingBuffer {
  constructor(capacity) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.size = 0;
  }

  push(item) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size++;
  }

  toArray() {
    if (this.size === 0) return [];
    if (this.size < this.capacity) {
      return this.buffer.slice(0, this.size);
    }
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head),
    ];
  }

  get length() {
    return this.size;
  }
}

// ─── Latency Store ──────────────────────────────────────────────────────────

/**
 * @type {Map<string, RingBuffer>}
 * Key: "provider/model", Value: RingBuffer of { latencyMs, timestamp }
 */
const store = new Map();

// p95 memo (key → { value, expires }) — the sort is cheap but runs per
// candidate per request; short TTL with invalidation on new samples keeps
// values fresh while making burst reads free.
const P95_CACHE_TTL_MS = 2000;
const p95Cache = new Map();

const DEFAULT_BUFFER_SIZE = 100;
const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Record a latency sample for a provider/model.
 * @param {string} provider - Provider ID
 * @param {string} model - Model name
 * @param {number} latencyMs - Latency in milliseconds
 */
export function recordLatency(provider, model, latencyMs) {
  if (!provider || !model || !Number.isFinite(latencyMs) || latencyMs < 0) return;

  const key = `${provider}/${model}`;
  let buffer = store.get(key);
  if (!buffer) {
    buffer = new RingBuffer(DEFAULT_BUFFER_SIZE);
    store.set(key, buffer);
  }

  buffer.push({ latencyMs, timestamp: Date.now() });
  p95Cache.delete(key);
}

/**
 * Get p95 latency for a provider/model.
 * @param {string} provider - Provider ID
 * @param {string} model - Model name
 * @param {number} [windowMs=DEFAULT_WINDOW_MS] - Time window to consider
 * @returns {number} p95 latency in ms, or default if insufficient data
 */
export function getP95Latency(provider, model, windowMs = DEFAULT_WINDOW_MS) {
  if (!provider || !model) return DEFAULT_P95_MS.default;

  const key = `${provider}/${model}`;
  const cached = p95Cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  const buffer = store.get(key);
  let p95;
  if (!buffer || buffer.length === 0) {
    p95 = getDefaultP95(model);
  } else {
    const cutoff = Date.now() - windowMs;
    const samples = buffer.toArray()
      .filter(s => s.timestamp >= cutoff)
      .map(s => s.latencyMs);

    // Need at least 10 samples for meaningful p95
    if (samples.length < 10) {
      p95 = getDefaultP95(model);
    } else {
      // Sort and pick 95th percentile
      samples.sort((a, b) => a - b);
      const p95Index = Math.floor(samples.length * 0.95);
      p95 = samples[p95Index];
    }
  }

  p95Cache.set(key, { value: p95, expires: Date.now() + P95_CACHE_TTL_MS });
  return p95;
}

/**
 * Get default p95 for a model based on name patterns.
 * @param {string} model - Model name
 * @returns {number} Default p95 in ms
 */
function getDefaultP95(model) {
  if (!model) return DEFAULT_P95_MS.default;
  const m = model.toLowerCase();

  // Check patterns (order matters — more specific first)
  if (/\bmini\b/.test(m)) return DEFAULT_P95_MS.mini;
  if (/\bflash\b/.test(m)) return DEFAULT_P95_MS.flash;
  if (/\bhaiku\b/.test(m)) return DEFAULT_P95_MS.haiku;
  if (m.includes("opus")) return DEFAULT_P95_MS.opus;
  if (m.includes("o3")) return DEFAULT_P95_MS.o3;
  if (m.includes("gpt-5")) return DEFAULT_P95_MS["gpt-5"];
  if (m.includes("sonnet")) return DEFAULT_P95_MS.sonnet;
  if (m.includes("gpt-4o")) return DEFAULT_P95_MS["gpt-4o"];
  if (m.includes("gemini-pro")) return DEFAULT_P95_MS["gemini-pro"];
  if (m.includes("deepseek-v3")) return DEFAULT_P95_MS["deepseek-v3"];
  if (m.includes("deepseek")) return DEFAULT_P95_MS["deepseek-chat"];
  if (m.includes("kimi")) return DEFAULT_P95_MS["kimi-k2"];

  return DEFAULT_P95_MS.default;
}

/**
 * Get sample count for a provider/model.
 * @param {string} provider - Provider ID
 * @param {string} model - Model name
 * @returns {number} Number of samples in buffer
 */
export function getSampleCount(provider, model) {
  const key = `${provider}/${model}`;
  const buffer = store.get(key);
  return buffer ? buffer.length : 0;
}

/**
 * Clear all latency data (for testing).
 */
export function clearLatencyData() {
  store.clear();
  p95Cache.clear();
}

/**
 * Get all tracked keys (for debugging).
 * @returns {string[]} Array of "provider/model" keys
 */
export function getTrackedKeys() {
  return [...store.keys()];
}

export { DEFAULT_P95_MS };
