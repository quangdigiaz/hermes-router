export default {
  id: "teamorouter",
  priority: 115,
  alias: "teamorouter",
  aliases: [
    "teamo",
    "teamo-router",
  ],
  uiAlias: "teamorouter",
  hasFree: true,
  category: "freeTier",
  curatedTier: "free",
  badges: [
    "free",
    "cheap",
    "popular",
  ],
  display: {
    name: "TeamoRouter",
    icon: "router",
    color: "#6366F1",
    textIcon: "TR",
    website: "https://teamorouter.com",
    notice: {
      text: "Official models up to 90% off list price. Pay-as-you-go, credits never expire. Complimentary Free models: deepseek-v4-flash-free (200 req/day), deepseek-v4-pro-free (50 req/day).",
      apiKeyUrl: "https://teamorouter.com/dashboard",
      complimentaryLimits: "Complimentary Free models: deepseek-v4-flash-free (200 req/day), deepseek-v4-pro-free (50 req/day). Once exhausted, switch to paid models or failover.",
    },
  },
  transport: {
    baseUrl: "https://api.teamorouter.com/v1/chat/completions",
    validateUrl: "https://api.teamorouter.com/v1/models",
  },
  serviceKinds: ["llm", "image"],
  imageConfig: {
    baseUrl: "https://api.teamorouter.com/v1/images",
  },
  models: [
    // ── Free Models (Daily Complimentary Quota) ──────────────────────────────
    { id: "deepseek-v4-flash-free", name: "DeepSeek V4 Flash (Free - 200 RPD)", isFree: true, tier: "free", free: true },
    { id: "deepseek-v4-pro-free",   name: "DeepSeek V4 Pro (Free - 50 RPD)",   isFree: true, tier: "free", free: true },

    // ── Discounted Official Models (Up to 90% off) ──────────────────────────
    { id: "gpt-5.6-sol",            name: "GPT-5.6 Sol (91% off)" },
    { id: "gpt-5.6-terra",          name: "GPT-5.6 Terra (92% off)" },
    { id: "gpt-5.6-luna",           name: "GPT-5.6 Luna (44% off)" },
    { id: "claude-opus-5",          name: "Claude Opus 5 (81% off)" },
    { id: "claude-fable-5",         name: "Claude Fable 5 (71% off)" },
    { id: "claude-sonnet-5",        name: "Claude Sonnet 5 (81% off)" },
    { id: "deepseek-v4-flash",      name: "DeepSeek V4 Flash" },
    { id: "deepseek-v4-pro",        name: "DeepSeek V4 Pro" },
    { id: "gemini-2.5-pro",         name: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash",       name: "Gemini 2.5 Flash" },
    { id: "qwen3.8-max",            name: "Qwen 3.8 Max" },
    { id: "kimi-k3",                name: "Kimi K3" },
    { id: "glm-5.3",                name: "GLM 5.3" },
  ],
  modelsFetcher: { url: "https://api.teamorouter.com/v1/models", type: "openai" },
  passthroughModels: true,
  features: { fetchModels: true, usage: true, usageApikey: true },
};
