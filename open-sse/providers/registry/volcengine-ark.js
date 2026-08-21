export default {
  id: "volcengine-ark",
  priority: 270,
  hasFree: true,
  alias: "volcengine-ark",
  aliases: [
    "ark",
  ],
  uiAlias: "ark",
  display: {
    name: "Volcengine Ark",
    icon: "cloud",
    color: "#1677FF",
    textIcon: "ARK",
    website: "https://ark.cn-beijing.volces.com",
    notice: {
      text: "Free Credits Only: 500K free tokens per model. ⚠️ Requires credit card verification ($1.1 hold, PayPal NOT supported). Service auto-pauses when free quota is exhausted — no charges.",
      apiKeyUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
    },
  },
  category: "freeTier",
  transport: {
    baseUrl: "https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions",
    headers: {},
  },
  // All models are free under Free Credits Only mode (500K tokens/model)
  models: [
    // DeepSeek
    { id: "DeepSeek-V4-Flash-GA", name: "DeepSeek-V4-Flash-GA", free: true },
    { id: "DeepSeek-V4-Flash", name: "DeepSeek-V4-Flash", free: true },
    { id: "DeepSeek-V4-Pro", name: "DeepSeek-V4-Pro", free: true },
    // Doubao / Dola Seed (ByteDance)
    { id: "Doubao-Seed-2.1-turbo", name: "Doubao-Seed-2.1-turbo", free: true },
    { id: "Doubao-Seed-2.0-Code", name: "Doubao-Seed-2.0-Code", free: true },
    { id: "Doubao-Seed-2.0-pro", name: "Doubao-Seed-2.0-pro", free: true },
    { id: "Doubao-Seed-2.0-lite", name: "Doubao-Seed-2.0-lite", free: true },
    { id: "Doubao-Seed-2.0-mini", name: "Doubao-Seed-2.0-mini", free: true },
    { id: "Doubao-Seed-Code", name: "Doubao-Seed-Code", free: true },
    // GLM
    { id: "GLM-5.2", name: "GLM-5.2", free: true },
    { id: "GLM-5.1", name: "GLM-5.1", free: true },
    // MiniMax & Kimi
    { id: "MiniMax-M2.7", name: "MiniMax-M2.7", free: true },
    { id: "Kimi-K2.6", name: "Kimi-K2.6", free: true },
  ],
};
