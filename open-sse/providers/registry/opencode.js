export default {
  id: "opencode",
  priority: 40,
  hasFree: true,
  alias: "oc",
  uiAlias: "oc",
  display: {
    name: "OpenCode Free",
    icon: "terminal",
    color: "#E87040",
    textIcon: "OC",
    website: "https://opencode.ai",
    notice: {
      text: "Free tier: Unlimited models via OpenCode proxy.",
      apiKeyUrl: "https://opencode.ai/go?ref=60CR9J3G67",
    },
  },
  category: "freeTier",
  authType: "apikey",
  transport: {
    baseUrl: "https://opencode.ai",
    headers: {
      "x-opencode-client": "desktop",
    },
  },
  models: [],
  modelsFetcher: { url: "https://opencode.ai/zen/v1/models", type: "opencode-free" },
  passthroughModels: true,
  features: { fetchModels: true },
};
