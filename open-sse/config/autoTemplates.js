/**
 * open-sse/config/autoTemplates.js
 *
 * 11 built-in templates & combos for auto-combo routing.
 */

export const AUTO_TEMPLATES = {
  // ─── 6 Standard Templates ────────────────────────────────────────────────
  "auto/best": {
    strategy: "auto",
    mode: "balanced",
    description: "Balanced across quality, cost and stability",
  },
  "auto/cheapest": {
    strategy: "cost-optimized",
    mode: "cost-saver",
    description: "Maximum cost savings",
  },
  "auto/fastest": {
    strategy: "auto",
    mode: "speed",
    description: "Fastest response with minimum quality",
    minQuality: 0.5,
  },
  "auto/reliable": {
    strategy: "auto",
    mode: "reliable",
    description: "Highest circuit breaker stability",
  },
  "auto/value": {
    strategy: "auto",
    mode: "value",
    description: "Best quality per dollar (P/P)",
  },
  "auto/best-free": {
    strategy: "auto",
    mode: "best-free",
    filter: "free",
    description: "Best free model available",
  },

  // ─── 6 Model Family Templates ────────────────────────────────────────────
  "family/deepseek": {
    strategy: "auto",
    mode: "value",
    family: "deepseek",
    description: "Cross-provider DeepSeek auto-routing (V4, V3, R1) across all active connections",
    seedModels: [
      "freebuff/deepseek-v4-flash",
      "deepseek/deepseek-v4-pro",
    ],
  },
  "family/gemini": {
    strategy: "auto",
    mode: "balanced",
    family: "gemini",
    description: "Cross-provider Google Gemini auto-routing (Flash, Pro, Lite) with zero-drop failover",
    seedModels: [
      "google/gemini-3.7-flash",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-pro",
    ],
  },
  "family/qwen": {
    strategy: "auto",
    mode: "value",
    family: "qwen",
    description: "Cross-provider Alibaba Qwen auto-routing (Coder, Plus, Max, VL)",
    seedModels: [
      "alibaba/qwen3.7-plus",
      "alibaba/qwen2.5-coder-32b",
      "alibaba/qwen3-coder-plus",
    ],
  },
  "family/claude": {
    strategy: "auto",
    mode: "balanced",
    family: "claude",
    description: "Cross-provider Anthropic Claude auto-routing (Sonnet, Opus, Haiku)",
    seedModels: [
      "anthropic/claude-sonnet-5",
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-haiku-4-5",
    ],
  },
  "family/mimo": {
    strategy: "auto",
    mode: "value",
    family: "mimo",
    description: "Cross-provider Xiaomi MiMo auto-routing with cost & latency optimization",
    seedModels: [
      "xiaomi/mimo-v2.5",
      "bazaarlink/mimo-v2.5",
    ],
  },
  "family/gpt": {
    strategy: "auto",
    mode: "balanced",
    family: "gpt",
    description: "Cross-provider OpenAI GPT auto-routing (GPT-4o, GPT-5, o1, o3, mini)",
    seedModels: [
      "openai/gpt-4o",
      "openai/gpt-4.1",
      "openai/gpt-5-mini",
    ],
  },

  // ─── 2 Agent Combos ─────────────────────────────────────────────────────
  "agent/workhorse": {
    strategy: "auto",
    mode: "value",
    sessionAffinity: true,
    requiresTools: true,
    description: "24/7 Agent workhorse: ultra-cheap ($0.14), fast, 429-resistant",
    models: [
      "bazaarlink/mimo-v2.5",
      "freebuff/deepseek-v4-flash",
      "xiaomi/mimo-v2.5",
      "google/gemini-3.7-flash",
    ],
  },
  "agent/deep-think": {
    strategy: "auto",
    mode: "balanced",
    requiresTools: true,
    description: "Agent hard tasks: deep architecture, large refactor, complex debugging",
    models: [
      "anthropic/claude-sonnet-5",
      "deepseek/deepseek-v4-pro",
      "google/gemini-3.7-flash",
    ],
  },

  // ─── 1 SEO Combo ────────────────────────────────────────────────────────
  "seo/vietnamese": {
    strategy: "auto",
    mode: "balanced",
    description: "Vietnamese SEO & Content: natural writing, H1-H3 structure",
    models: [
      "google/gemini-3.7-flash",
      "anthropic/claude-sonnet-5",
      "alibaba/qwen3.7-plus",
      "deepseek/deepseek-v4-pro",
    ],
  },

  // ─── 2 Vision Combos ────────────────────────────────────────────────────
  "vision/fast-cheap": {
    strategy: "auto",
    mode: "value",
    requiresVision: true,
    description: "Bulk image/OCR ultra-cheap ($0.05): Qwen2.5-VL 7B, Gemini Flash-Lite, Pixtral",
    models: [
      "alibaba/qwen2.5-vl-7b",
      "google/gemini-2.5-flash-lite",
      "mistral/pixtral-12b",
      "meta/llama-3.2-11b-vision",
    ],
  },
  "vision/pro": {
    strategy: "auto",
    mode: "balanced",
    requiresVision: true,
    description: "Premium vision reasoning & image-to-code: Gemini, Sonnet, Qwen 72B, GPT-4o",
    models: [
      "google/gemini-3.7-flash",
      "anthropic/claude-sonnet-5",
      "alibaba/qwen2.5-vl-72b",
      "openai/gpt-4o",
    ],
  },
};

export function resolveTemplate(templateName) {
  if (!templateName) return null;
  return AUTO_TEMPLATES[templateName] || null;
}
