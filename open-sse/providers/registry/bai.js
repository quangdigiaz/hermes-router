export default {
  id: "bai",
  priority: 117,
  alias: "bai",
  aliases: ["b.ai", "b-ai"],
  uiAlias: "bai",
  display: {
    name: "B.AI",
    icon: "smart_toy",
    color: "#0066FF",
    textIcon: "BAI",
    website: "https://b.ai",
    notice: {
      apiKeyUrl: "https://chat.b.ai/chat",
      complimentaryLimits: "Free Offers (0 Credits): deepseek-v4-flash, hy3. Credits Rate: 1 USD = 1,000,000 Credits. Both OpenAI and Claude endpoints supported.",
    },
  },
  category: "apikey",
  hasFree: true,
  transport: {
    baseUrl: "https://api.b.ai/v1/chat/completions",
    validateUrl: "https://api.b.ai/v1/models",
  },
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.b.ai/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.b.ai/v1/messages",
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  serviceKinds: ["llm"],
  models: [
    // Free Promotion Models (0 Credits)
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash (Free Promotion)", isFree: true, tier: "free" },
    { id: "hy3", name: "Tencent Hy3 (Free Promotion)", isFree: true, tier: "free" },
    // DeepSeek Series
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek-v4-flash-vision", name: "DeepSeek V4 Flash Vision" },
    { id: "deepseek-v3.2", name: "DeepSeek V3.2" },
    // OpenAI Series
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
    { id: "gpt-5.6-terra", name: "GPT-5.6 Terra" },
    { id: "gpt-5.6-luna", name: "GPT-5.6 Luna" },
    { id: "gpt-5.5", name: "GPT-5.5" },
    { id: "gpt-5.5-instant", name: "GPT-5.5 Instant" },
    { id: "gpt-5.4", name: "GPT-5.4" },
    { id: "gpt-5.4-pro", name: "GPT-5.4 Pro" },
    { id: "gpt-5.4-mini", name: "GPT-5.4 Mini" },
    { id: "gpt-5.4-nano", name: "GPT-5.4 Nano" },
    { id: "gpt-5.2", name: "GPT-5.2" },
    { id: "gpt-5-mini", name: "GPT-5 Mini" },
    { id: "gpt-5-nano", name: "GPT-5 Nano" },
    // Anthropic Claude Series
    { id: "claude-opus-5", name: "Claude Opus 5" },
    { id: "claude-fable-5", name: "Claude Fable 5" },
    { id: "claude-opus-4-8", name: "Claude Opus 4.8" },
    { id: "claude-opus-4-7", name: "Claude Opus 4.7" },
    { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
    { id: "claude-opus-4-5", name: "Claude Opus 4.5" },
    { id: "claude-sonnet-5", name: "Claude Sonnet 5" },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
    { id: "claude-haiku-4-5", name: "Claude Haiku 4.5" },
    // Google Gemini Series
    { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash" },
    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash" },
    { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite" },
    { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro" },
    { id: "gemini-3-flash", name: "Gemini 3 Flash" },
    // xAI Grok Series
    { id: "grok-4.6", name: "Grok 4.6" },
    { id: "grok-4.5", name: "Grok 4.5" },
    // Moonshot Kimi Series
    { id: "kimi-k3", name: "Kimi K3" },
    { id: "kimi-k2.6", name: "Kimi K2.6" },
    { id: "kimi-k2.5", name: "Kimi K2.5" },
    // Zhipu GLM Series
    { id: "glm-5.3", name: "GLM 5.3" },
    { id: "glm-5.2", name: "GLM 5.2" },
    { id: "glm-5.1", name: "GLM 5.1" },
    // Alibaba Qwen Series
    { id: "qwen3.8-max", name: "Qwen 3.8 Max" },
    { id: "qwen3.8-27b", name: "Qwen 3.8 27B" },
    { id: "qwen3.7-max", name: "Qwen 3.7 Max" },
    { id: "qwen3.6-27b", name: "Qwen 3.6 27B" },
    // Xiaomi MiMo Series
    { id: "mimo-v2.5-pro", name: "MiMo V2.5 Pro" },
    { id: "mimo-v2.5", name: "MiMo V2.5" },
    // MiniMax Series
    { id: "minimax-m3", name: "MiniMax M3" },
    { id: "minimax-m2.7", name: "MiniMax M2.7" },
  ],
  modelsFetcher: { url: "https://api.b.ai/v1/models", type: "openai" },
  passthroughModels: true,
  features: { fetchModels: true, usage: true, usageApikey: true },
};
