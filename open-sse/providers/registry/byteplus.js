export default {
  id: "byteplus",
  priority: 70,
  hasFree: true,
  alias: "byteplus",
  aliases: [
    "bpm",
  ],
  uiAlias: "bpm",
  display: {
    name: "BytePlus ModelArk",
    icon: "cloud",
    color: "#2563EB",
    textIcon: "BP",
    website: "https://console.byteplus.com/ark",
    notice: {
      text: "Free Credits Only: 500K free tokens per model. ⚠️ Requires credit card verification ($1.1 hold, PayPal NOT supported). Service auto-pauses when free quota is exhausted — no charges.",
      apiKeyUrl: "https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey",
    },
  },
  category: "freeTier",
  transport: {
    baseUrl: "https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions",
    validateUrl: "https://ark.ap-southeast.bytepluses.com/api/v3/models",
    headers: {},
  },
  modelsFetcher: { url: "https://ark.ap-southeast.bytepluses.com/api/v3/models", type: "openai" },
  // Model IDs verified from live GET /api/v3/models (2026-08-21)
  // free: true  = activated with 500K Free Credits quota in console
  // free: false = available in API but not activated / requires paid subscription
  models: [
    // ── DeepSeek Series ─────────────────────────────────────────────────────
    // Activated (Free Credits 500K each): V4 Flash GA, V4 Flash, V4 Pro GA, V4 Pro, V3.2
    { id: "deepseek-v4-flash-ga-260731",      name: "DeepSeek V4 Flash GA",     free: true,  isFree: true },
    { id: "deepseek-v4-flash-260425",          name: "DeepSeek V4 Flash",         free: true,  isFree: true },
    { id: "deepseek-v4-pro-ga-260813",         name: "DeepSeek V4 Pro GA",        free: true,  isFree: true },
    { id: "deepseek-v4-pro-260425",            name: "DeepSeek V4 Pro",           free: true,  isFree: true },
    { id: "deepseek-v3-2-251201",              name: "DeepSeek V3.2",             free: true,  isFree: true },
    // Also in API — not activated with Free Credits
    { id: "deepseek-v3-1-250821",              name: "DeepSeek V3.1",             free: false, isFree: false },
    { id: "deepseek-v3-241226",                name: "DeepSeek V3 (Dec)",         free: false, isFree: false },
    { id: "deepseek-v3",                       name: "DeepSeek V3",               free: false, isFree: false },
    { id: "deepseek-r1-250528",                name: "DeepSeek R1 (May)",         free: false, isFree: false },
    { id: "deepseek-r1-250120",                name: "DeepSeek R1 (Jan)",         free: false, isFree: false },
    { id: "deepseek-r1-distill-qwen-32b-250120", name: "DeepSeek R1 Distill Qwen 32B", free: false, isFree: false },

    // ── Dola Seed / Seed VLM Series ─────────────────────────────────────────
    // Activated: Dola Seed 2.1 Turbo, Seed 2.0 Mini, Seed 2.0 Lite, Seed 2.0 Pro
    { id: "dola-seed-2-1-turbo-260628",        name: "Dola Seed 2.1 Turbo",       free: true,  isFree: true },
    { id: "seed-2-0-mini-260428",              name: "Dola Seed 2.0 Mini",        free: true,  isFree: true },
    { id: "seed-2-0-mini-260215",              name: "Dola Seed 2.0 Mini (Feb)",  free: true,  isFree: true },
    { id: "seed-2-0-lite-260428",              name: "Dola Seed 2.0 Lite",        free: true,  isFree: true },
    { id: "seed-2-0-lite-260228",              name: "Dola Seed 2.0 Lite (Feb)",  free: true,  isFree: true },
    { id: "seed-2-0-pro-260328",               name: "Dola Seed 2.0 Pro",         free: true,  isFree: true },
    { id: "seed-2-0-code-preview-260328",      name: "Dola Seed 2.0 Code",        free: true,  isFree: true },
    { id: "seed-1-8-251228",                   name: "Seed 1.8",                  free: true,  isFree: true },
    { id: "seed-1-6-250915",                   name: "Seed 1.6",                  free: true,  isFree: true },
    { id: "seed-1-6-250615",                   name: "Seed 1.6 (Jun)",            free: false, isFree: false },
    { id: "seed-1-6-flash-250715",             name: "Seed 1.6 Flash",            free: true,  isFree: true },
    { id: "seed-1-6-flash-250615",             name: "Seed 1.6 Flash (Jun)",      free: false, isFree: false },

    // ── Kimi K2 (Moonshot, in API but not activated) ─────────────────────────
    { id: "kimi-k2-250905",                    name: "Kimi K2 (Sep)",             free: false, isFree: false },
    { id: "kimi-k2-250711",                    name: "Kimi K2 (Jul)",             free: false, isFree: false },
    { id: "kimi-k2-thinking-251104",           name: "Kimi K2 Thinking",          free: false, isFree: false },

    // ── GLM & Skylark (ByteDance proprietary) ────────────────────────────────
    // Activated: GLM 5.2, GLM 4.7, GPT-OSS 120B
    { id: "glm-5-2-260617",                    name: "GLM 5.2",                   free: true,  isFree: true },
    { id: "glm-4-7-251222",                    name: "GLM 4.7",                   free: true,  isFree: true },
    { id: "gpt-oss-120b-250805",               name: "GPT-OSS 120B",              free: true,  isFree: true },
    // Skylark — in API, not activated
    { id: "skylark-pro-250215",                name: "Skylark Pro",               free: false, isFree: false },
    { id: "skylark-pro",                       name: "Skylark Pro (latest)",      free: false, isFree: false },
    { id: "skylark-lite-250215",               name: "Skylark Lite",              free: false, isFree: false },
    { id: "skylark-vision-250515",             name: "Skylark Vision",            free: false, isFree: false },
    { id: "seed-translation-250915",           name: "Seed Translation",          free: false, isFree: false },

    // ── Video Generation ─────────────────────────────────────────────────────
    // Activated: Dreamina Seedance 2.5, 2.0, 2.0 Fast, 2.0 Mini, Seedance 1.5 Pro
    { id: "dreamina-seedance-2-5-260628",      name: "Dreamina Seedance 2.5",     free: true,  isFree: true },
    { id: "dreamina-seedance-2-0-260128",      name: "Dreamina Seedance 2.0",     free: true,  isFree: true },
    { id: "dreamina-seedance-2-0-fast-260128", name: "Dreamina Seedance 2.0 Fast",free: true,  isFree: true },
    { id: "dreamina-seedance-2-0-mini-260615", name: "Dreamina Seedance 2.0 Mini",free: true,  isFree: true },
    { id: "seedance-1-5-pro-251215",           name: "Seedance 1.5 Pro",          free: true,  isFree: true },
    // Older Seedance versions — in API, not activated
    { id: "seedance-1-0-pro-250528",           name: "Seedance 1.0 Pro",          free: false, isFree: false },
    { id: "seedance-1-0-pro-fast-251015",      name: "Seedance 1.0 Pro Fast",     free: false, isFree: false },
    { id: "seedance-1-0-lite-t2v-250428",      name: "Seedance 1.0 Lite T2V",     free: false, isFree: false },
    { id: "seedance-1-0-lite-i2v-250428",      name: "Seedance 1.0 Lite I2V",     free: false, isFree: false },

    // ── Image Generation ─────────────────────────────────────────────────────
    // Activated: Dola Seedream 5.0 Pro, Seedream 5.0, Seedream 4.5, Seedream 4.0
    { id: "dola-seedream-5-0-pro-260628",      name: "Dola Seedream 5.0 Pro",     free: true,  isFree: true },
    { id: "seedream-5-0-260128",               name: "Dola Seedream 5.0",         free: true,  isFree: true },
    { id: "seedream-4-5-251128",               name: "Seedream 4.5",              free: true,  isFree: true },
    { id: "seedream-4-0-250828",               name: "Seedream 4.0",              free: true,  isFree: true },
    { id: "seedream-4-0-20260415",             name: "Seedream 4.0 (Apr)",        free: false, isFree: false },
    { id: "seedream-3-0-t2i-250415",           name: "Seedream 3.0 T2I",          free: false, isFree: false },
    { id: "seededit-3-0-i2i-250628",           name: "SeedEdit 3.0 I2I",          free: false, isFree: false },

    // ── 3D Generation & Multimodal Embedding ─────────────────────────────────
    { id: "hyper3d-gen2-260112",               name: "Hyper3D Gen2 (3D)",         free: true,  isFree: true },
    { id: "hitem3d-2-0-251223",                name: "HiTem3D 2.0 (3D)",          free: true,  isFree: true },
    { id: "skylark-embedding-vision-251215",   name: "Skylark Embedding Vision",  free: true,  isFree: true },
    { id: "skylark-embedding-vision-250615",   name: "Skylark Embedding Vision (Jun)", free: false, isFree: false },
    { id: "skylark-embedding-vision-250328",   name: "Skylark Embedding Vision (Mar)", free: false, isFree: false },
  ],
  regions: [
    { id: "ap-southeast-1", label: "AP Southeast 1 (Singapore)" },
    { id: "eu-west-1", label: "EU West 1 (Ireland)" },
  ],
  defaultRegion: "ap-southeast-1",
  thinkingConfig: "extended",
  serviceKinds: ["llm", "image", "video"],
  imageConfig: {
    baseUrl: "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations",
  },
  freeQuota: {
    totalTokens: 500_000,
    label: "Free Credits Only",
    resetOnExhaust: true,
  },
  features: {
    usage: true,
    fetchModels: true,
  },
};
