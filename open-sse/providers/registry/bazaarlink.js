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
    "cheap",
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
      text: "Taiwan AI API Gateway with OpenAI & Anthropic compatibility, auto router (auto:free for zero cost), multimodal generation, and per-key spend limits. Docs: https://bazaarlink.ai/skill.md",
      apiKeyUrl: "https://bazaarlink.ai/keys",
      docsUrl: "https://bazaarlink.ai/docs",
      skillUrl: "https://bazaarlink.ai/skill.md",
      modelsUrl: "https://bazaarlink.ai/models",
    },
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
    // ── Auto Routers ────────────────────────────────────────────────────────
    { id: "auto:free",                     name: "Auto Router (Free - Zero Cost)", isFree: true, tier: "free", free: true },
    { id: "auto",                          name: "Auto Router (Smart Best Model)" },
    { id: "qwen/qwen3.7-flash:free",       name: "Qwen 3.7 Flash (Free)", isFree: true, tier: "free", free: true },

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
