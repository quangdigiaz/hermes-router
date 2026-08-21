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
    baseUrl: "https://ark.ap-southeast.bytepluses.com/api/coding/v3/chat/completions",
    headers: {},
  },
  // All models are free under Free Credits Only mode (500K tokens/model)
  // Source: console.byteplus.com/ark (2026-08-21)
  models: [
    // DeepSeek
    { id: "DeepSeek-V4-Flash-GA", name: "DeepSeek-V4-Flash-GA", free: true },
    { id: "DeepSeek-V4-Pro-GA", name: "DeepSeek-V4-Pro-GA", free: true },
    { id: "DeepSeek-V4-flash", name: "DeepSeek-V4-flash", free: true },
    { id: "DeepSeek-V4-pro", name: "DeepSeek-V4-pro", free: true },
    // Dola-Seed (ByteDance)
    { id: "Dola-Seed-2.1-turbo", name: "Dola-Seed-2.1-turbo", free: true },
    { id: "Dola-Seed-2.0-Code", name: "Dola-Seed-2.0-Code", free: true },
    { id: "Dola-Seed-2.0-pro", name: "Dola-Seed-2.0-pro", free: true },
    { id: "Dola-Seed-2.0-mini", name: "Dola-Seed-2.0-mini", free: true },
    { id: "Dola-Seed-2.0-lite", name: "Dola-Seed-2.0-lite", free: true },
    // GLM
    { id: "GLM-5.2", name: "GLM-5.2", free: true },
  ],
  serviceKinds: ["llm"],
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
