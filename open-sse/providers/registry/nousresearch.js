export default {
  id: "nousresearch",
  alias: "nous",
  aliases: ["nrc"],
  uiAlias: "nous",
  display: {
    name: "Nous Research",
    icon: "psychology",
    color: "#7C3AED",
    textIcon: "NR",
    website: "https://portal.nousresearch.com",
    notice: {
      text: "OpenAI-compatible Inference API. API key from portal.nousresearch.com. Also supports x402 Solana pay-per-request (not used for routing).",
      apiKeyUrl: "https://portal.nousresearch.com",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://inference-api.nousresearch.com/v1/chat/completions",
    validateUrl: "https://inference-api.nousresearch.com/v1/models",
    format: "openai",
  },
  models: [
    { id: "Hermes-4-405B", name: "Hermes 4 405B (128k)" },
    { id: "Hermes-4-70B", name: "Hermes 4 70B (128k)" },
    { id: "Hermes-4.3-36B", name: "Hermes 4.3 36B (128k)" },
  ],
  modelsFetcher: { url: "https://inference-api.nousresearch.com/v1/models", type: "openai" },
  passthroughModels: true,
  features: { fetchModels: true },
};
