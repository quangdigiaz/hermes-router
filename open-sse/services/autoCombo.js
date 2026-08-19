/**
 * Auto-Combo Scoring Engine
 *
 * 5-factor provider selection:
 * 1. health (varies) — Circuit breaker state
 * 2. costInv (varies) — Inverse cost (cheaper = better)
 * 3. latencyInv (varies) — Inverse p95 latency (faster = better)
 * 4. modelTier (varies) — Benchmark-driven quality score
 * 5. valueScore (value mode only) — Quality per dollar (log-scale)
 *
 * Mode packs override weights for different use cases.
 */

import { getBenchmarkForModel } from "../config/benchmarks.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp01(value) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

// ─── Scoring Factors ────────────────────────────────────────────────────────

function healthScore(state) {
  if (state === "CLOSED") return 1.0;
  if (state === "HALF_OPEN") return 0.5;
  return 0.0;
}

function costInvScore(cost, maxCost) {
  if (cost == null || maxCost <= 0) return 0.5;
  return clamp01(1 - cost / maxCost);
}

function latencyInvScore(p95, maxLatency) {
  if (!p95 || maxLatency <= 0) return 0.5;
  return clamp01(1 - p95 / maxLatency);
}

/**
 * Model tier score — benchmark-driven quality classification.
 * Falls back to regex only when model has no benchmark entry.
 */
export function modelTierScore(model) {
  if (!model) return 0.5;

  const bench = getBenchmarkForModel(model);
  if (bench && typeof bench.quality === "number") {
    return clamp01(bench.quality / 100);
  }

  // Regex fallback for unknown models
  const m = model.toLowerCase();
  if (/\bmini\b/.test(m) || /\bflash\b/.test(m) || /\bhaiku\b/.test(m)) return 0.4;
  if (m.includes("opus") || m.includes("o3") || m.includes("pro-max")) return 1.0;
  if (m.includes("sonnet") || m.includes("gpt-4o") || m.includes("gemini-pro")) return 0.7;
  return 0.5;
}

/**
 * Value score — quality per dollar with log-scale normalization.
 * Free models: 0.85-1.0 range based on quality (not flat 1.0).
 * Paid models: log(quality/cost) normalized to 0-1.
 */
export function valueScore(benchmark, cost) {
  const quality = benchmark?.quality ?? 50;

  if (cost === 0 || cost == null) {
    return clamp01(0.85 + 0.15 * (quality / 100));
  }

  if (cost < 0) return 0.5;

  const rawValue = quality / cost;
  const maxNormalizedRatio = 1000;
  return clamp01(Math.log1p(rawValue) / Math.log1p(maxNormalizedRatio));
}

// ─── Weights & Mode Packs ───────────────────────────────────────────────────

const DEFAULT_WEIGHTS = {
  health:      0.35,
  costInv:     0.30,
  latencyInv:  0.20,
  modelTier:   0.15,
};

export const MODE_PACKS = {
  balanced: {
    health:      0.35,
    costInv:     0.30,
    latencyInv:  0.20,
    modelTier:   0.15,
  },
  "cost-saver": {
    health:      0.25,
    costInv:     0.45,
    latencyInv:  0.15,
    modelTier:   0.15,
  },
  speed: {
    health:      0.35,
    costInv:     0.15,
    latencyInv:  0.40,
    modelTier:   0.10,
  },
  reliable: {
    health:      0.45,
    costInv:     0.25,
    latencyInv:  0.20,
    modelTier:   0.10,
  },
  value: {
    health:      0.20,
    costInv:     0.20,
    latencyInv:  0.10,
    modelTier:   0.15,
    valueScore:  0.35,
  },
  "best-free": {
    health:      0.30,
    costInv:     0.10,
    latencyInv:  0.25,
    modelTier:   0.35,
  },
};

// ─── Scoring ────────────────────────────────────────────────────────────────

export function scoreCandidate(candidate, poolMaxima, weights = DEFAULT_WEIGHTS) {
  const factors = {
    health: healthScore(candidate.health),
    costInv: costInvScore(candidate.cost, poolMaxima.maxCost),
    latencyInv: latencyInvScore(candidate.p95, poolMaxima.maxLatency),
    modelTier: modelTierScore(candidate.model),
  };

  // Free model boost: max costInv, but NEVER inflate modelTier
  if (candidate.isFree) {
    factors.costInv = 1.0;
  }

  // Value factor (only when weight > 0)
  if (weights.valueScore) {
    factors.valueScore = valueScore(candidate.benchmark, candidate.cost);
  }

  let score = 0;
  for (const [key, value] of Object.entries(factors)) {
    score += (weights[key] || 0) * value;
  }

  return { score: clamp01(score), factors };
}

export function scorePool(candidates, options = {}) {
  if (!candidates || candidates.length === 0) return [];

  const { mode = "balanced", weights: customWeights } = options;
  const weights = customWeights || MODE_PACKS[mode] || DEFAULT_WEIGHTS;

  const maxCost = Math.max(0.001, ...candidates.map(c => c.cost || 0));
  const maxLatency = Math.max(1, ...candidates.map(c => c.p95 || 0));
  const poolMaxima = { maxCost, maxLatency };

  const scored = candidates.map(c => ({
    ...c,
    ...scoreCandidate(c, poolMaxima, weights),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function selectProvider(candidates, options = {}) {
  const { mode = "balanced", explorationRate = 0.05 } = options;

  if (!candidates || candidates.length === 0) return null;

  const healthy = candidates.filter(c => c.health !== "OPEN");
  if (healthy.length === 0) return null;

  const scored = scorePool(healthy, { mode });

  if (Math.random() < explorationRate) {
    return scored[Math.floor(Math.random() * scored.length)];
  }

  return scored[0];
}

// ─── Exports ────────────────────────────────────────────────────────────────

export { healthScore, costInvScore, latencyInvScore };
export { DEFAULT_WEIGHTS };
export { clamp01 };
