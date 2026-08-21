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
  // All models are free under Free Credits Only mode (500K tokens/model)
  // Source: console.byteplus.com/ark official documentation
  models: [
    // DeepSeek Series (Up to 1024K Context, 384K Output)
    { id: "DeepSeek-V4-Flash-GA", name: "DeepSeek-V4-Flash-GA", free: true },
    { id: "DeepSeek-V4-Pro-GA", name: "DeepSeek-V4-Pro-GA", free: true },
    { id: "DeepSeek-V4-flash", name: "DeepSeek-V4-flash", free: true },
    { id: "DeepSeek-V4-pro", name: "DeepSeek-V4-pro", free: true },
    { id: "deepseek-v4-pro-ga-260813", name: "DeepSeek V4 Pro GA (260813)", free: true },
    { id: "deepseek-v4-flash-ga-260731", name: "DeepSeek V4 Flash GA (260731)", free: true },
    { id: "deepseek-v4-pro-260425", name: "DeepSeek V4 Pro (260425)", free: true },
    { id: "deepseek-v4-flash-260425", name: "DeepSeek V4 Flash (260425)", free: true },
    { id: "deepseek-v3-2-251201", name: "DeepSeek V3.2 (251201)", free: true },

    // Dola Seed Series (ByteDance Agentic Flagship Models - 256K Context)
    { id: "Dola-Seed-2.1-turbo", name: "Dola-Seed-2.1-turbo", free: true },
    { id: "dola-seed-2-1-turbo-260628", name: "Dola Seed 2.1 Turbo (260628)", free: true },
    { id: "Dola-Seed-2.0-pro", name: "Dola-Seed-2.0-pro", free: true },
    { id: "seed-2-0-pro-260328", name: "Dola Seed 2.0 Pro (260328)", free: true },
    { id: "Dola-Seed-2.0-lite", name: "Dola-Seed-2.0-lite", free: true },
    { id: "seed-2-0-lite-260428", name: "Dola Seed 2.0 Lite (260428)", free: true },
    { id: "seed-2-0-lite-260228", name: "Dola Seed 2.0 Lite (260228)", free: true },
    { id: "Dola-Seed-2.0-mini", name: "Dola-Seed-2.0-mini", free: true },
    { id: "seed-2-0-mini-260428", name: "Dola Seed 2.0 Mini (260428)", free: true },
    { id: "seed-2-0-mini-260215", name: "Dola Seed 2.0 Mini (260215)", free: true },
    { id: "Dola-Seed-2.0-Code", name: "Dola-Seed-2.0-Code", free: true },
    { id: "seed-2-0-code-preview-260328", name: "Dola Seed 2.0 Code Preview (260328)", free: true },
    { id: "seed-1-8-251228", name: "Seed 1.8 (251228)", free: true },
    { id: "seed-1-6-250915", name: "Seed 1.6 (250915)", free: true },
    { id: "seed-1-6-flash-250715", name: "Seed 1.6 Flash (250715)", free: true },

    // GLM & Open-source
    { id: "GLM-5.2", name: "GLM-5.2", free: true },
    { id: "glm-5-2-260617", name: "GLM 5.2 (260617)", free: true },
    { id: "glm-4-7-251222", name: "GLM 4.7 (251222)", free: true },
    { id: "gpt-oss-120b-250805", name: "GPT-OSS 120B (250805)", free: true },

    // Video Generation (Dreamina Seedance)
    { id: "dreamina-seedance-2-5-260628", name: "Dreamina Seedance 2.5", free: true },
    { id: "dreamina-seedance-2-0-260128", name: "Dreamina Seedance 2.0", free: true },
    { id: "dreamina-seedance-2-0-fast-260128", name: "Dreamina Seedance 2.0 Fast", free: true },
    { id: "dreamina-seedance-2-0-mini-260615", name: "Dreamina Seedance 2.0 Mini", free: true },
    { id: "seedance-1-5-pro-251215", name: "Seedance 1.5 Pro", free: true },

    // Image Generation (Dola Seedream)
    { id: "dola-seedream-5-0-pro-260628", name: "Dola Seedream 5.0 Pro", free: true },
    { id: "seedream-5-0-260128", name: "Dola Seedream 5.0", free: true },
    { id: "seedream-5-0-lite-260128", name: "Dola Seedream 5.0 Lite", free: true },
    { id: "seedream-4-5-251128", name: "Seedream 4.5", free: true },
    { id: "seedream-4-0-250828", name: "Seedream 4.0", free: true },

    // 3D Generation & Multimodal Embedding
    { id: "Hyper3d-Rodin-Gen2", name: "Hyper3d Rodin Gen2 (3D)", free: true },
    { id: "Hitem3d-2.0", name: "Hitem3d 2.0 (3D)", free: true },
    { id: "skylark-embedding-vision-251215", name: "Skylark Embedding Vision (251215)", free: true },
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
