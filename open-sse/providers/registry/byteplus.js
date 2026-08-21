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
  models: [
    { id: "seed-2-0-pro-260328", name: "Seed 2.0 Pro", free: true },
    { id: "seed-2-0-code-preview-260328", name: "Seed 2.0 Code Preview", free: true },
    { id: "seed-2-0-mini-260215", name: "Seed 2.0 Mini", free: true },
    { id: "seed-2-0-lite-260228", name: "Seed 2.0 Lite", free: true },
    { id: "kimi-k2-thinking-251104", name: "Kimi K2 Thinking", free: true },
    { id: "glm-4-7-251222", name: "GLM 4.7", free: true },
    { id: "gpt-oss-120b-250805", name: "GPT-OSS-120B", free: true },
  ],
  serviceKinds: ["llm"],
  freeQuota: {
    totalTokens: 500_000,
    label: "Free Credits Only",
    resetOnExhaust: true,
  },
  features: {
    usage: true,
  },
};
