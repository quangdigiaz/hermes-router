/**
 * open-sse/config/benchmarks.js
 *
 * Benchmark data, model limits (Context Window / Vision) and promo pricing.
 * Sources: Artificial Analysis / LMSYS Arena / OpenRouter.
 * Last updated: 2026-08-17
 */

// ─── MODEL_BENCHMARKS ───────────────────────────────────────────────────────

export const MODEL_BENCHMARKS = {
  // Premium (quality >= 85)
  "claude-opus-5":        { quality: 95, coding: 90, lastUpdated: "2026-08-17" },
  "gpt-5.6-sol":          { quality: 92, coding: 89, lastUpdated: "2026-08-17" },
  "o3":                   { quality: 91, coding: 87, lastUpdated: "2026-08-17" },

  // High (quality 70-84)
  "claude-sonnet-5":      { quality: 85, coding: 82, lastUpdated: "2026-08-17" },
  "gemini-3.7-flash":     { quality: 76, coding: 76, lastUpdated: "2026-08-17" },
  "grok-4.6":             { quality: 79, coding: 81, lastUpdated: "2026-08-17" },
  "qwen2.5-vl-72b":       { quality: 75, coding: 74, lastUpdated: "2026-08-17" },

  // Value (quality 55-69)
  "gpt-oss-120b":         { quality: 78, coding: 80, lastUpdated: "2026-08-17" },
  "nemotron-3-super":     { quality: 80, coding: 82, lastUpdated: "2026-08-17" },
  "nemotron-3-nano-30b":  { quality: 68, coding: 74, lastUpdated: "2026-08-17" },
  "gemma4-26b":           { quality: 66, coding: 64, lastUpdated: "2026-08-17" },
  "mimo-v2.5":            { quality: 65, coding: 72, lastUpdated: "2026-08-17" },
  "deepseek-v4-flash":    { quality: 60, coding: 68, lastUpdated: "2026-08-17" },
  "qwen3.7-plus":         { quality: 63, coding: 70, lastUpdated: "2026-08-17" },
  "deepseek-v4-pro":      { quality: 62, coding: 69, lastUpdated: "2026-08-17" },
  "sarvam-105b":          { quality: 62, coding: 58, lastUpdated: "2026-08-17" },
  "gpt-oss-20b":          { quality: 58, coding: 56, lastUpdated: "2026-08-17" },
  "qwen3.7-flash":        { quality: 58, coding: 65, lastUpdated: "2026-08-17" },
  "gemini-2.5-flash-lite":{ quality: 62, coding: 60, lastUpdated: "2026-08-17" },
  "qwen2.5-vl-7b":        { quality: 59, coding: 56, lastUpdated: "2026-08-17" },
  "pixtral-12b":          { quality: 61, coding: 58, lastUpdated: "2026-08-17" },
  "llama-3.2-11b-vision": { quality: 57, coding: 54, lastUpdated: "2026-08-17" },
  "minicpm-v-2.6":        { quality: 58, coding: 55, lastUpdated: "2026-08-17" },

  // Budget (quality < 55)
  "gpt-4o-mini":          { quality: 45, coding: 42, lastUpdated: "2026-08-17" },
  "claude-haiku-4.5":     { quality: 50, coding: 48, lastUpdated: "2026-08-17" },
  "deepseek-chat":        { quality: 40, coding: 38, lastUpdated: "2026-08-17" },
};

// ─── MODEL_LIMITS ───────────────────────────────────────────────────────────

export const MODEL_LIMITS = {
  // Google Gemini & Gemma
  "gemini-3.7-flash":     { maxContext: 1048576, maxOutput: 8192,  vision: true,  audio: true },
  "gemini-2.5-pro":       { maxContext: 1048576, maxOutput: 8192,  vision: true,  audio: true },
  "gemini-2.5-flash":     { maxContext: 1048576, maxOutput: 8192,  vision: true,  audio: true },
  "gemini-2.5-flash-lite":{ maxContext: 1000000, maxOutput: 8192,  vision: true,  audio: true },
  "gemini-2.0-flash":     { maxContext: 1048576, maxOutput: 8192,  vision: true,  audio: true },
  "gemini-2.0-flash-lite":{ maxContext: 1048576, maxOutput: 8192,  vision: true,  audio: true },
  "gemma4-26b":           { maxContext: 131072,  maxOutput: 8192,  vision: false, audio: false },

  // Anthropic Claude
  "claude-sonnet-5":      { maxContext: 200000,  maxOutput: 8192,  vision: true,  audio: false },
  "claude-opus-5":        { maxContext: 200000,  maxOutput: 4096,  vision: true,  audio: false },
  "claude-3-5-sonnet":    { maxContext: 200000,  maxOutput: 8192,  vision: true,  audio: false },
  "claude-haiku-4.5":     { maxContext: 200000,  maxOutput: 8192,  vision: true,  audio: false },

  // OpenAI / GPT & OSS
  "gpt-5.6-sol":          { maxContext: 256000,  maxOutput: 16384, vision: true,  audio: false },
  "gpt-4o":               { maxContext: 128000,  maxOutput: 16384, vision: true,  audio: false },
  "gpt-4o-mini":          { maxContext: 128000,  maxOutput: 16384, vision: true,  audio: false },
  "gpt-oss-120b":         { maxContext: 131072,  maxOutput: 8192,  vision: false, audio: false },
  "gpt-oss-20b":          { maxContext: 64000,   maxOutput: 8192,  vision: false, audio: false },
  "o3":                   { maxContext: 200000,  maxOutput: 100000,vision: true,  audio: false },

  // Alibaba Qwen
  "qwen2.5-vl-72b":       { maxContext: 131072,  maxOutput: 8192,  vision: true,  audio: false },
  "qwen2.5-vl-7b":        { maxContext: 131072,  maxOutput: 8192,  vision: true,  audio: false },
  "qwen-vl-max":          { maxContext: 131072,  maxOutput: 8192,  vision: true,  audio: false },
  "qwen3.7-plus":         { maxContext: 131072,  maxOutput: 8192,  vision: false, audio: false },
  "qwen3.7-flash":        { maxContext: 131072,  maxOutput: 8192,  vision: false, audio: false },

  // Open-source Vision
  "pixtral-12b":          { maxContext: 131072,  maxOutput: 8192,  vision: true,  audio: false },
  "llama-3.2-11b-vision": { maxContext: 131072,  maxOutput: 8192,  vision: true,  audio: false },
  "llama-3.2-90b-vision": { maxContext: 131072,  maxOutput: 8192,  vision: true,  audio: false },
  "minicpm-v-2.6":        { maxContext: 32768,   maxOutput: 4096,  vision: true,  audio: false },
  "glm-4.6v":             { maxContext: 131072,  maxOutput: 8192,  vision: true,  audio: false },

  // DeepSeek & Xiaomi & NVIDIA & Sarvam
  "nemotron-3-super":     { maxContext: 131072,  maxOutput: 8192,  vision: false, audio: false },
  "nemotron-3-nano-30b":  { maxContext: 131072,  maxOutput: 8192,  vision: false, audio: false },
  "sarvam-105b":          { maxContext: 32768,   maxOutput: 4096,  vision: false, audio: false },
  "deepseek-v4-pro":      { maxContext: 128000,  maxOutput: 8192,  vision: false, audio: false },
  "deepseek-v4-flash":    { maxContext: 128000,  maxOutput: 8192,  vision: false, audio: false },
  "deepseek-chat":        { maxContext: 64000,   maxOutput: 8192,  vision: false, audio: false },
  "deepseek-reasoner":    { maxContext: 64000,   maxOutput: 8192,  vision: false, audio: false },
  "mimo-v2.5":            { maxContext: 64000,   maxOutput: 4096,  vision: false, audio: false },
  "MiniMax-M3":           { maxContext: 1000000, maxOutput: 8192,  vision: false, audio: false },
};

export function getModelLimits(model) {
  if (!model) return { maxContext: 64000, maxOutput: 4096, vision: false };
  const base = model.includes("/") ? model.split("/").pop() : model;
  return MODEL_LIMITS[base] || MODEL_LIMITS[model] || { maxContext: 64000, maxOutput: 4096, vision: false };
}

// ─── PROMO_PRICING ──────────────────────────────────────────────────────────

export const PROMO_PRICING = [
  { model: "deepseek-v4-flash-free", promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "mimo-v2.5-free",         promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "gpt-oss-120b:free",      promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "gpt-oss-20b:free",       promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "gemma4-26b:free",        promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "nemotron-3-nano-30b:free", promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "nemotron-3-super:free",  promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "sarvam-105b:free",       promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "mimo-v2.5",              promoInput: 0.14,  promoOutput: 0.28,  validUntil: null },
  { model: "mimo-v2.5-pro",          promoInput: 0.435, promoOutput: 0.87,  validUntil: null },
  { model: "MiniMax-M3",             promoInput: 0.30,  promoOutput: 1.20,  validUntil: null },
  { model: "gemini-3.7-flash",       promoInput: 0.75, promoOutput: 3.75, validUntil: "2026-12-31T23:59:59Z" },
  // BytePlus ModelArk / Volcengine Ark — Free Credits Only (500K tokens per model)
  { model: "DeepSeek-V4-Flash-GA",   promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "DeepSeek-V4-Flash",      promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "DeepSeek-V4-Pro",        promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "Doubao-Seed-2.1-turbo",  promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "Doubao-Seed-2.0-Code",   promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "Doubao-Seed-2.0-pro",    promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "Doubao-Seed-2.0-lite",   promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "Doubao-Seed-2.0-mini",   promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "Doubao-Seed-Code",       promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "GLM-5.2",                promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "GLM-5.1",                promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "MiniMax-M2.7",           promoInput: 0, promoOutput: 0, validUntil: null },
  { model: "Kimi-K2.6",              promoInput: 0, promoOutput: 0, validUntil: null },
];

export function getPromoPriceSync(model) {
  if (!model) return null;
  const base = model.includes("/") ? model.split("/").pop() : model;
  const now = Date.now();

  for (const promo of PROMO_PRICING) {
    if (promo.model === base || promo.model === model) {
      if (promo.validUntil && now >= Date.parse(promo.validUntil)) continue;
      return promo;
    }
  }
  return null;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

export function isFreeModel(model, provider = "", providerRegistry = null, rawModelData = null) {
  const promo = getPromoPriceSync(model);
  if (promo && promo.promoInput === 0) return true;

  const base = model.includes("/") ? model.split("/").pop() : model;
  if (base.toLowerCase().endsWith("-free") || base.toLowerCase().endsWith(":free")) return true;

  if (provider && providerRegistry) {
    const reg = typeof providerRegistry.get === "function"
      ? providerRegistry.get(provider)
      : providerRegistry[provider];
    if (reg?.category === "free") return true;
  }

  // Check raw pricing data from /models API response (e.g. OpenRouter)
  if (rawModelData?.pricing) {
    const p = rawModelData.pricing;
    const promptFree = p.prompt === "0" || p.prompt === 0;
    const completionFree = p.completion === "0" || p.completion === 0;
    if (promptFree && completionFree) return true;
  }

  return false;
}

export function getBenchmarkForModel(model) {
  if (!model) return null;
  const base = model.includes("/") ? model.split("/").pop() : model;

  if (MODEL_BENCHMARKS[base]) return MODEL_BENCHMARKS[base];
  if (MODEL_BENCHMARKS[model]) return MODEL_BENCHMARKS[model];

  // Regex fallback only when not in table
  const BENCHMARK_PATTERNS = [
    { pattern: /opus|o3|pro-max/i,                    quality: 90 },
    { pattern: /sonnet.*5|gpt-5\.[4-6]/i,             quality: 80 },
    { pattern: /sonnet|gpt-4o(?!-mini)|gemini-pro/i,  quality: 70 },
    { pattern: /mini|flash|haiku/i,                    quality: 45 },
  ];
  for (const { pattern, quality } of BENCHMARK_PATTERNS) {
    if (pattern.test(base)) return { quality, coding: quality, source: "pattern-fallback" };
  }
  return null;
}
