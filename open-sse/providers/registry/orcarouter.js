export default {
  id: "orcarouter",
  priority: 20,
  alias: "orcarouter",
  display: {
    name: "OrcaRouter",
    icon: "route",
    color: "#FF6B35",
    textIcon: "OR",
    website: "https://www.orcarouter.ai",
    notice: {
      apiKeyUrl: "https://www.orcarouter.ai/dashboard",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.orcarouter.ai/v1/chat/completions",
    forceStream: true,
  },
  passthroughModels: true,
  models: [
    // Free models (rate-limited, $0)
    // upstreamModelId = what OrcaRouter API expects
    { id: "free", name: "Free Router (Smart)", upstreamModelId: "orcarouter/free" },
    { id: "qwen3.8-27b-free", name: "Qwen 3.8 27B (Free)", upstreamModelId: "qwen/qwen3.8-27b-free" },
    { id: "deepseek-v4-flash-free", name: "DeepSeek V4 Flash (Free)", upstreamModelId: "deepseek/deepseek-v4-flash-free" },
    { id: "deepseek-v4-pro-free", name: "DeepSeek V4 Pro (Free)", upstreamModelId: "deepseek/deepseek-v4-pro-free" },
    // Auto router
    { id: "auto", name: "Auto Router (Smart)", upstreamModelId: "orcarouter/auto" },
    // OpenAI models
    { id: "gpt-4o", name: "GPT-4o", upstreamModelId: "openai/gpt-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", upstreamModelId: "openai/gpt-4o-mini" },
    { id: "gpt-4o-turbo", name: "GPT-4o Turbo", upstreamModelId: "openai/gpt-4o-turbo" },
    { id: "o3", name: "O3", upstreamModelId: "openai/o3" },
    { id: "o3-mini", name: "O3 Mini", upstreamModelId: "openai/o3-mini" },
    { id: "o4-mini", name: "O4 Mini", upstreamModelId: "openai/o4-mini" },
    // Anthropic models
    { id: "claude-opus-4-6", name: "Claude Opus 4.6", upstreamModelId: "anthropic/claude-opus-4-6" },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", upstreamModelId: "anthropic/claude-sonnet-4-6" },
    { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", upstreamModelId: "anthropic/claude-haiku-4-5" },
    // Google models
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", upstreamModelId: "google/gemini-2.5-pro" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", upstreamModelId: "google/gemini-2.5-flash" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", upstreamModelId: "google/gemini-2.0-flash" },
    // Other providers
    { id: "deepseek-chat", name: "DeepSeek Chat", upstreamModelId: "deepseek/deepseek-chat" },
    { id: "deepseek-reasoner", name: "DeepSeek Reasoner", upstreamModelId: "deepseek/deepseek-reasoner" },
    { id: "grok-4-fast-reasoning", name: "Grok 4 Fast", upstreamModelId: "grok/grok-4-fast-reasoning" },
    { id: "qwen3.6-plus", name: "Qwen 3.6 Plus", upstreamModelId: "qwen/qwen3.6-plus" },
    { id: "kimi-k2.6", name: "Kimi K2.6", upstreamModelId: "kimi/kimi-k2.6" },
    { id: "minimax-m2.7", name: "MiniMax M2.7", upstreamModelId: "minimax/minimax-m2.7" },
  ],
  serviceKinds: ["llm"],
};
