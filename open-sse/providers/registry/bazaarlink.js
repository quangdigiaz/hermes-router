export default {
  id: "bazaarlink",
  alias: "bzl",
  aliases: ["bazaar-link", "bzl"],
  uiAlias: "bzl",
  category: "freeTier",
  curatedTier: "free",
  hasFree: true,
  badges: [
    "free",
    "popular",
  ],
  authType: "apikey",
  authModes: ["apikey"],
  display: {
    name: "BazaarLink",
    icon: "storefront",
    color: "#DC2626",
    textIcon: "BZ",
    website: "https://bazaarlink.ai",
    notice: {
      text: "Auto Router v3: 'auto' (paid) & 'auto:free' (zero cost across 14 tiers). Free limits: 10 RPM, 50 RPD (100 RPD if deposited). Suffixes: :floor (lowest price), :nitro (speed), :online (web search), :thinking, :free. Set header 'X-Free-Fallback: false' to prevent auto-switching to paid.",
      apiKeyUrl: "https://bazaarlink.ai/keys",
      docsUrl: "https://bazaarlink.ai/docs",
      skillUrl: "https://bazaarlink.ai/skill.md",
      modelsUrl: "https://bazaarlink.ai/models",
    },
  },
  rateLimits: {
    free: { requestsPerMinute: 10, requestsPerDay: 50, depositedRequestsPerDay: 100 },
  },
  transport: {
    baseUrl: "https://api.bazaarlink.ai/v1/chat/completions",
    validateUrl: "https://api.bazaarlink.ai/v1/models",
    anthropicBaseUrl: "https://api.bazaarlink.ai",
  },
  serviceKinds: ["llm", "embedding", "image", "video", "audio"],
  embeddingConfig: {
    baseUrl: "https://api.bazaarlink.ai/v1/embeddings",
    authType: "apikey",
    authHeader: "bearer",
  },
  imageConfig: {
    baseUrl: "https://api.bazaarlink.ai/v1/images/generations",
    editsUrl: "https://api.bazaarlink.ai/v1/images/edits",
  },
  videoConfig: {
    baseUrl: "https://api.bazaarlink.ai/v1/videos",
  },
  audioConfig: {
    transcriptionsUrl: "https://api.bazaarlink.ai/v1/audio/transcriptions",
    speechUrl: "https://api.bazaarlink.ai/v1/audio/speech",
  },
  models: [
    // ── Auto Router v3 (14 Tiers) ───────────────────────────────────────────
    { id: "auto:free",                     name: "Auto Router (Free - 14 Tiers Zero Cost)", isFree: true, tier: "free", free: true },
    { id: "auto",                          name: "Auto Router (Smart Best Model - 14 Tiers)" },
    { id: "qwen/qwen3.7-flash",            name: "Qwen 3.7 Flash (Free eligible - 10 RPM)", isFree: true, tier: "free", free: true },
    { id: "qwen/qwen3.7-flash:free",       name: "Qwen 3.7 Flash (:free alias)", isFree: true, tier: "free", free: true },
    { id: "deepseek/deepseek-v4-flash:free", name: "DeepSeek V4 Flash (:free alias)", isFree: true, tier: "free", free: true },

    // ── Auto Router Primary & Suffix Variants ───────────────────────────────
    { id: "openai/gpt-5.4-nano",           name: "GPT-5.4 Nano (Auto simple/social/email)" },
    { id: "openai/gpt-5.4-mini",           name: "GPT-5.4 Mini (Auto standard fallback)" },
    { id: "openai/gpt-5.4-pro",            name: "GPT-5.4 Pro (Auto complex/reasoning)" },
    { id: "openai/gpt-5.3-codex",          name: "GPT 5.3 Codex (Auto coding primary)" },
    { id: "openai/gpt-5.4-image-2",        name: "GPT-5.4 Image 2 (Auto vision/image)" },
    { id: "anthropic/claude-opus-4.7",     name: "Claude Opus 4.7 (Auto reasoning primary)" },
    { id: "anthropic/claude-sonnet-4.6",   name: "Claude Sonnet 4.6 (Auto coding/data fallback)" },
    { id: "anthropic/claude-haiku-4.5",    name: "Claude Haiku 4.5 (Auto simple/standard fallback)" },
    { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash (Auto standard primary)" },
    { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (Auto complex primary)" },
    { id: "google/gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite (Auto fallback)" },
    { id: "perplexity/sonar-pro",          name: "Sonar Pro (Auto search primary)" },
    { id: "perplexity/sonar-reasoning-pro", name: "Sonar Reasoning Pro (Auto search fallback)" },
    { id: "bytedance/seedance-2.0-fast",   name: "Seedance 2.0 Fast (Auto video primary)" },
    { id: "bytedance/seedance-2.0",        name: "Seedance 2.0 (Auto video fallback)" },

    // ── OpenAI (GPT-5.6 / GPT-5.5 / GPT-5.4 / Codex) ────────────────────────
    { id: "gpt-5.6-sol",                   name: "GPT-5.6 Sol" },
    { id: "gpt-5.6-terra",                 name: "GPT-5.6 Terra" },
    { id: "gpt-5.6-luna",                  name: "GPT-5.6 Luna" },
    { id: "gpt-5.6-sol-pro",               name: "GPT-5.6 Sol Pro" },
    { id: "gpt-5.6-terra-pro",             name: "GPT-5.6 Terra Pro" },
    { id: "gpt-5.6-luna-pro",              name: "GPT-5.6 Luna Pro" },
    { id: "gpt-5.5",                       name: "GPT-5.5" },
    { id: "gpt-5.4",                       name: "GPT-5.4" },
    { id: "gpt-5.4-mini",                  name: "GPT-5.4 Mini" },
    { id: "gpt-5.3-codex",                 name: "GPT 5.3 Codex" },
    { id: "gpt-4o",                        name: "GPT-4o" },

    // ── Anthropic Claude ─────────────────────────────────────────────────────
    { id: "claude-opus-5",                 name: "Claude Opus 5" },
    { id: "claude-sonnet-5",               name: "Claude Sonnet 5" },
    { id: "claude-fable-5",                name: "Claude Fable 5" },
    { id: "claude-opus-4.8",               name: "Claude Opus 4.8" },
    { id: "claude-sonnet-4.6",             name: "Claude Sonnet 4.6" },
    { id: "claude-haiku-4.5",              name: "Claude Haiku 4.5" },

    // ── Google Gemini ────────────────────────────────────────────────────────
    { id: "gemini-3.7-flash",              name: "Gemini 3.7 Flash" },
    { id: "gemini-3.6-flash",              name: "Gemini 3.6 Flash" },
    { id: "gemini-3.5-flash",              name: "Gemini 3.5 Flash" },
    { id: "gemini-3.1-pro-preview",        name: "Gemini 3.1 Pro Preview" },
    { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite" },
    { id: "gemini-2.5-pro",                name: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash",              name: "Gemini 2.5 Flash" },

    // ── DeepSeek ─────────────────────────────────────────────────────────────
    { id: "deepseek-v4-pro",               name: "DeepSeek V4 Pro" },
    { id: "deepseek-v4-flash",             name: "DeepSeek V4 Flash" },
    { id: "deepseek-v4-flash-0731",        name: "DeepSeek V4 Flash (0731)" },
    { id: "deepseek-v3.2",                 name: "DeepSeek V3.2" },
    { id: "deepseek-r1-0528",              name: "DeepSeek R1 (0528)" },

    // ── xAI Grok ─────────────────────────────────────────────────────────────
    { id: "grok-4.6",                      name: "Grok 4.6" },
    { id: "grok-4.5",                      name: "Grok 4.5" },
    { id: "grok-4.3",                      name: "Grok 4.3" },
    { id: "grok-4.20",                     name: "Grok 4.20" },

    // ── Chinese Ecosystem (Qwen, Kimi, GLM, MiniMax) ─────────────────────────
    { id: "qwen3.8-max",                   name: "Qwen 3.8 Max" },
    { id: "qwen3.7-plus",                  name: "Qwen 3.7 Plus" },
    { id: "kimi-k3",                       name: "Kimi K3" },
    { id: "kimi-k2.7-code",                name: "Kimi K2.7 Code" },
    { id: "glm-5.2",                       name: "GLM 5.2" },
    { id: "glm-5.1",                       name: "GLM 5.1" },
    { id: "glm-5",                         name: "GLM 5" },
    { id: "minimax-m3",                    name: "MiniMax M3" },
    { id: "minimax-m2.7",                  name: "MiniMax M2.7" },
  ],
  modelsFetcher: { url: "https://api.bazaarlink.ai/v1/models", type: "openai" },
  passthroughModels: true,
  features: { fetchModels: true, usage: true, usageApikey: true },
};
