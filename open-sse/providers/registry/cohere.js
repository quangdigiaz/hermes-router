export default {
  id: "cohere",
  priority: 90,
  alias: "cohere",
  display: {
    name: "Cohere",
    icon: "hub",
    color: "#39594D",
    textIcon: "CO",
    website: "https://cohere.com",
    notice: {
      text: "Cohere v2 native API (api.cohere.com/v2/chat). Live model list from /v1/models. Supports thinking, tools, response_format.",
      apiKeyUrl: "https://dashboard.cohere.com/api-keys",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.cohere.com/v2/chat",
    validateUrl: "https://api.cohere.com/v1/models",
    format: "cohere",
  },
  models: [],
  modelsFetcher: { url: "https://api.cohere.com/v1/models", type: "openai" },
  passthroughModels: true,
  features: { fetchModels: true },
};
