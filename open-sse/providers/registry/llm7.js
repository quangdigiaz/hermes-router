export default {
  id: "llm7",
  alias: "llm7",
  aliases: [
    "llm-7",
  ],
  uiAlias: "llm7",
  hasFree: true,
  display: {
    name: "LLM7.io",
    icon: "pool",
    color: "#7C3AED",
    textIcon: "L7",
    website: "https://llm7.io/?r=1Tg",
    notice: {
      text: "Free Token: 1,000,000 tokens/24h (100 r/h, 40 r/m, 2 r/s). Anonymous: 500,000 tokens/24h (60 r/h, 10 r/m, 1 r/s). Pro ($12/mo): 15,000 r/h, 1,500 r/m, 25 r/s with JSON mode & function calling. Docs: https://docs.llm7.io/llms.txt",
      apiKeyUrl: "https://llm7.io/?r=1Tg",
      docsUrl: "https://docs.llm7.io/llms.txt",
    },
  },
  category: "freeTier",
  curatedTier: "free",
  badges: [
    "free",
    "cheap",
    "popular",
  ],
  authType: "apikey",
  authModes: [
    "apikey",
  ],
  serviceKinds: [
    "llm",
    "image",
    "video",
  ],
  imageConfig: {
    baseUrl: "https://api.llm7.io/v1/images/generations",
    editsUrl: "https://api.llm7.io/v1/images/edits",
  },
  videoConfig: {
    baseUrl: "https://api.llm7.io/v1/videos",
  },
  transport: {
    baseUrl: "https://api.llm7.io/v1/chat/completions",
    validateUrl: "https://api.llm7.io/v1/models",
  },
  modelsFetcher: { url: "https://api.llm7.io/v1/models", type: "openai" },
  features: {
    fetchModels: true,
  },
  rateLimits: {
    anonymous: { tokensPerDay: 500_000, requestsPerHour: 60, requestsPerMinute: 10, requestsPerSecond: 1 },
    free: { tokensPerDay: 1_000_000, requestsPerHour: 100, requestsPerMinute: 40, requestsPerSecond: 2 },
    pro: { priceUsdPerMonth: 12, requestsPerHour: 15_000, requestsPerMinute: 1_500, requestsPerSecond: 25 },
  },
  // Model catalogue from https://api.llm7.io/v1/models
  // Turbo tier = Free token eligible; Pro tier = Pro subscription / usage balance
  models: [
    // ── Free / Turbo Tier (1M tokens/day) ───────────────────────────────────
    { id: "DeepSeek-V4-Flash-0731",           name: "DeepSeek V4 Flash (0731)",  tier: "turbo", free: true, isFree: true },
    { id: "gemini-3.1-flash-lite",            name: "Gemini 3.1 Flash Lite",     tier: "turbo", free: true, isFree: true },
    { id: "codestral-latest",                 name: "Codestral Latest",          tier: "turbo", free: true, isFree: true },
    { id: "gemma4:31b",                       name: "Gemma 4 31B",               tier: "turbo", free: true, isFree: true },
    { id: "gpt-oss:20b",                      name: "GPT-OSS 20B",               tier: "turbo", free: true, isFree: true },
    { id: "meta-Llama-3.1-8B-Instruct-Turbo", name: "Llama 3.1 8B Instruct",     tier: "turbo", free: true, isFree: true },
    { id: "minimax-m2.7",                     name: "MiniMax M2.7",              tier: "turbo", free: true, isFree: true },
    { id: "mistral-Nemo-Instruct-2407",       name: "Mistral Nemo 2407",         tier: "turbo", free: true, isFree: true },

    // ── Pro Tier Chat & Reasoning Models ────────────────────────────────────
    { id: "claude-sonnet-5",                  name: "Claude Sonnet 5",           tier: "pro", free: false, isFree: false },
    { id: "claude-sonnet-4-6",                name: "Claude Sonnet 4.6",         tier: "pro", free: false, isFree: false },
    { id: "claude-opus-5",                    name: "Claude Opus 5",             tier: "pro", free: false, isFree: false },
    { id: "claude-opus-4-8",                  name: "Claude Opus 4.8",           tier: "pro", free: false, isFree: false },
    { id: "claude-haiku-4-5",                 name: "Claude Haiku 4.5",          tier: "pro", free: false, isFree: false },
    { id: "claude-fable-5",                   name: "Claude Fable 5",            tier: "pro", free: false, isFree: false },
    { id: "gpt-5.6-sol",                      name: "GPT-5.6 Sol",               tier: "pro", free: false, isFree: false },
    { id: "gpt-5.6-terra",                    name: "GPT-5.6 Terra",             tier: "pro", free: false, isFree: false },
    { id: "gpt-5.5",                          name: "GPT-5.5",                   tier: "pro", free: false, isFree: false },
    { id: "gpt-5.4",                          name: "GPT-5.4",                   tier: "pro", free: false, isFree: false },
    { id: "gpt-5.4-mini",                     name: "GPT-5.4 Mini",              tier: "pro", free: false, isFree: false },
    { id: "gemini-3.7-flash",                 name: "Gemini 3.7 Flash",          tier: "pro", free: false, isFree: false },
    { id: "gemini-3.5-flash-low",             name: "Gemini 3.5 Flash Low",      tier: "pro", free: false, isFree: false },
    { id: "gemini-3-flash",                   name: "Gemini 3 Flash",            tier: "pro", free: false, isFree: false },
    { id: "grok-4.6",                         name: "Grok 4.6",                  tier: "pro", free: false, isFree: false },
    { id: "grok-4.5",                         name: "Grok 4.5",                  tier: "pro", free: false, isFree: false },
    { id: "kimi-k2.6",                        name: "Kimi K2.6",                 tier: "pro", free: false, isFree: false },
    { id: "glm-5.3",                          name: "GLM 5.3",                   tier: "pro", free: false, isFree: false },
    { id: "XiaomiMiMo/MiMo-V2.5-Pro",         name: "MiMo V2.5 Pro",             tier: "pro", free: false, isFree: false },
    { id: "XiaomiMiMo/MiMo-V2.5",             name: "MiMo V2.5",                 tier: "pro", free: false, isFree: false },
    { id: "deepseek-v4-flash:0731",           name: "DeepSeek V4 Flash (Pro)",   tier: "pro", free: false, isFree: false },
    { id: "mistral-Small-24B-Instruct-2501",  name: "Mistral Small 24B",         tier: "pro", free: false, isFree: false },
    { id: "seed-2.0-mini",                    name: "Seed 2.0 Mini",             tier: "pro", free: false, isFree: false },
    { id: "Inkling",                          name: "Inkling",                   tier: "pro", free: false, isFree: false },
    { id: "Inkling-Small",                    name: "Inkling Small",             tier: "pro", free: false, isFree: false },
    { id: "L3-8B-Lunaris-v1-Turbo",           name: "Lunaris 8B Turbo",          tier: "pro", free: false, isFree: false },

    // ── Image Generation Models ──────────────────────────────────────────────
    { id: "firefly-image-5",                  name: "Firefly Image 5",           tier: "pro", free: false, isFree: false, kind: "image" },
    { id: "firefly-gpt-image-2",              name: "Firefly GPT Image 2",       tier: "pro", free: false, isFree: false, kind: "image" },
    { id: "flux-klein-2",                     name: "Flux Klein 2",              tier: "pro", free: false, isFree: false, kind: "image" },
    { id: "gpt-image-2",                      name: "GPT Image 2",               tier: "pro", free: false, isFree: false, kind: "image" },
    { id: "imagine-1.5",                      name: "Imagine 1.5",               tier: "pro", free: false, isFree: false, kind: "image" },

    // ── Video Generation Models ──────────────────────────────────────────────
    { id: "seedance-2.0",                     name: "Seedance 2.0 (Video)",      tier: "pro", free: false, isFree: false, kind: "video" },
    { id: "seedance-2.0-fast",                name: "Seedance 2.0 Fast (Video)", tier: "pro", free: false, isFree: false, kind: "video" },
    { id: "seedance-2.0-mini",                name: "Seedance 2.0 Mini (Video)", tier: "pro", free: false, isFree: false, kind: "video" },
    { id: "kling-v3.0-pro",                   name: "Kling V3.0 Pro (Video)",    tier: "pro", free: false, isFree: false, kind: "video" },
    { id: "kling-v3.0-turbo",                 name: "Kling V3.0 Turbo (Video)",  tier: "pro", free: false, isFree: false, kind: "video" },
    { id: "gemini-omni-flash",                name: "Gemini Omni Flash (Video)", tier: "pro", free: false, isFree: false, kind: "video" },
  ],
  passthroughModels: true,
};
