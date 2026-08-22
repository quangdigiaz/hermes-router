export default {
  id: "commandcode",
  priority: 100,
  alias: "commandcode",
  aliases: [
    "cmc",
  ],
  uiAlias: "cmc",
  display: {
    name: "Command Code",
    icon: "smart_toy",
    color: "#000000",
    textIcon: "CC",
    website: "https://commandcode.ai",
    notice: {
      text: "Provider API — same key as CLI (user_...). Endpoints: POST /provider/v1/chat/completions (OpenAI) and /provider/v1/messages (Anthropic). GET /provider/v1/models for live list. Supports x-cmd-zdr:1 for ZDR.",
      apiKeyUrl: "https://commandcode.ai/studio",
    },
  },
  category: "apikey",
  // Provider API is the public contract: POST /provider/v1/chat/completions (OpenAI)
  // and POST /provider/v1/messages (Anthropic). CLI internal /alpha/generate is not for routing.
  transport: {
    baseUrl: "https://api.commandcode.ai/provider/v1/chat/completions",
    validateUrl: "https://api.commandcode.ai/provider/v1/models",
    format: "openai",
    headers: {
      "x-command-code-version": "0.25.7",
    },
  },
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.commandcode.ai/provider/v1/chat/completions",
      auth: { header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.commandcode.ai/provider/v1/messages",
      auth: { header: "Authorization", scheme: "bearer" },
      headers: {
        "x-command-code-version": "0.25.7",
      },
    },
  ],
  // Dynamic catalog — same registry that backs `cmd --list-models` and `/model` picker.
  // Hardcoded 11 were fallback only; now passthrough + fetcher so --list-models / API stay in sync.
  // Matches opencode pattern: empty static + live fetcher + passthrough.
  models: [
    { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "moonshotai/Kimi-K2.6", name: "Kimi K2.6" },
    { id: "moonshotai/Kimi-K2.5", name: "Kimi K2.5" },
    { id: "zai-org/GLM-5.1", name: "GLM 5.1" },
    { id: "zai-org/GLM-5", name: "GLM 5" },
    { id: "MiniMaxAI/MiniMax-M2.7", name: "MiniMax M2.7" },
    { id: "MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" },
    { id: "Qwen/Qwen3.6-Max-Preview", name: "Qwen 3.6 Max Preview" },
    { id: "Qwen/Qwen3.6-Plus", name: "Qwen 3.6 Plus" },
    { id: "stepfun/Step-3.5-Flash", name: "Step 3.5 Flash" },
  ],
  // Live catalog from Provider API: GET /provider/v1/models (same list as Pricing & Limits)
  // Fallback 11 kept for offline; passthrough allows any id from `cmd --list-models` without code change.
  modelsFetcher: { url: "https://api.commandcode.ai/provider/v1/models", type: "openai" },
  passthroughModels: true,
  features: { fetchModels: true },
};
