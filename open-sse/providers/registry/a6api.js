export default {
  id: "a6api",
  priority: 115,
  alias: "a6api",
  aliases: [
    "a6",
    "a6-api",
  ],
  uiAlias: "a6",
  curatedTier: "free",
  badges: [
    "cheap",
    "popular",
  ],
  display: {
    name: "A6API",
    icon: "bolt",
    color: "#EF4444",
    textIcon: "A6",
    website: "https://a6api.com/?auth=register&aff=LMjF",
    notice: {
      text: "A unified transaction network with 4,700+ routes across OpenAI, Anthropic, DeepSeek, xAI, Zhipu, Moonshot, Google, MiniMax, Alibaba. Smart routing, real-time price comparison & up to 90% discount.",
      apiKeyUrl: "https://a6api.com/?auth=register&aff=LMjF",
      docsUrl: "https://a6api.com/docs",
      modelsUrl: "https://a6api.com/models",
    },
  },
  category: "freeTier",
  transport: {
    baseUrl: "https://a6api.com/v1/chat/completions",
    validateUrl: "https://a6api.com/v1/models",
  },
  serviceKinds: ["llm", "embedding", "image"],
  embeddingConfig: {
    baseUrl: "https://a6api.com/v1/embeddings",
    authType: "apikey",
    authHeader: "bearer",
  },
  imageConfig: {
    baseUrl: "https://a6api.com/v1/images/generations",
  },
  models: [
    // ── DeepSeek (Best price priority) ───────────────────────────────────────
    { id: "DeepSeek-V4-Flash-0731",   name: "DeepSeek V4 Flash (0731) ($0.0036/1M)" },
    { id: "deepseek-v4-pro",          name: "DeepSeek V4 Pro" },
    { id: "deepseek-v4-flash",        name: "DeepSeek V4 Flash" },

    // ── OpenAI (GPT-5.6 / GPT-5.5 / GPT-5.4) ─────────────────────────────────
    { id: "gpt-5.6-sol",              name: "GPT-5.6 Sol ($0.1044/1M)" },
    { id: "gpt-5.6-terra",            name: "GPT-5.6 Terra ($0.0336/1M)" },
    { id: "gpt-5.6-luna",             name: "GPT-5.6 Luna ($0.0348/1M)" },
    { id: "gpt-5.5",                  name: "GPT-5.5" },
    { id: "gpt-5.4",                  name: "GPT-5.4 ($0.084/1M)" },
    { id: "gpt-4o",                   name: "GPT-4o" },

    // ── Anthropic Claude ─────────────────────────────────────────────────────
    { id: "claude-sonnet-5",          name: "Claude Sonnet 5" },
    { id: "claude-opus-5",            name: "Claude Opus 5" },
    { id: "claude-opus-4-8",          name: "Claude Opus 4.8 ($0.90/1M)" },
    { id: "claude-sonnet-4-6",        name: "Claude Sonnet 4.6 ($0.54/1M)" },
    { id: "claude-fable-5",           name: "Claude Fable 5" },
    { id: "claude-haiku-4-5",         name: "Claude Haiku 4.5" },

    // ── Google Gemini ────────────────────────────────────────────────────────
    { id: "gemini-3.5-flash",         name: "Gemini 3.5 Flash" },
    { id: "gemini-3.1-pro-preview",   name: "Gemini 3.1 Pro Preview" },
    { id: "gemini-3-pro-preview",     name: "Gemini 3 Pro Preview" },
    { id: "gemini-2.5-pro",           name: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash",         name: "Gemini 2.5 Flash" },

    // ── xAI Grok ─────────────────────────────────────────────────────────────
    { id: "grok-4.5",                 name: "Grok 4.5" },
    { id: "grok-4.3",                 name: "Grok 4.3" },
    { id: "grok-4.20-0309-console",   name: "Grok 4.20 Console (0309)" },
    { id: "grok-build-0.1",           name: "Grok Build 0.1" },

    // ── Major Chinese Ecosystem Models (Kimi, Qwen, GLM, MiniMax) ───────────
    { id: "kimi-k3",                  name: "Kimi K3" },
    { id: "kimi-k2.7-code",           name: "Kimi K2.7 Code" },
    { id: "qwen3.7-plus",             name: "Qwen 3.7 Plus" },
    { id: "glm-5.2",                  name: "GLM 5.2" },
    { id: "minimax-m3",               name: "MiniMax M3" },

    // ── Image Generation Models ──────────────────────────────────────────────
    { id: "gpt-image-2",              name: "GPT Image 2 ($0.0078/call)", kind: "image" },
    { id: "gemini-3.1-flash-image",   name: "Gemini 3.1 Flash Image", kind: "image" },
    { id: "grok-imagine-image",       name: "Grok Imagine Image", kind: "image" },
  ],
  modelsFetcher: { url: "https://a6api.com/v1/models", type: "openai" },
  passthroughModels: true,
  features: { fetchModels: true, usage: true, usageApikey: true },
};
