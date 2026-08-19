export default {
  id: "fastrouter",
  priority: 22,
  alias: "fastrouter",
  display: {
    name: "FastRouter",
    icon: "bolt",
    color: "#2E52E5",
    textIcon: "FR",
    website: "https://fastrouter.ai",
    notice: {
      apiKeyUrl: "https://dashboard.fastrouter.ai",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.fastrouter.ai/api/v1/chat/completions",
    forceStream: true,
  },
  hasFree: true,
  passthroughModels: true,
  models: [
    // ─── Free Models ($0) ──────────────────────────────────────────────────
    { id: "gpt-oss-120b-free", name: "GPT OSS 120B (Free)", upstreamModelId: "openai/gpt-oss-120b:free" },
    { id: "gpt-oss-20b-free", name: "GPT OSS 20B (Free)", upstreamModelId: "openai/gpt-oss-20b:free" },
    { id: "gemma4-26b-free", name: "Gemma 4 26B (Free)", upstreamModelId: "google/gemma4-26b:free" },
    { id: "nemotron-3-nano-free", name: "Nemotron 3 Nano (Free)", upstreamModelId: "nvidia/nemotron-3-nano-30b:free" },
    { id: "nemotron-3-super-free", name: "Nemotron 3 Super (Free)", upstreamModelId: "nvidia/nemotron-3-super:free" },
    { id: "sarvam-105b-free", name: "Sarvam 105B (Free)", upstreamModelId: "sarvam/sarvam-105b:free" },
    { id: "sarvam-30b-free", name: "Sarvam 30B (Free)", upstreamModelId: "sarvam/sarvam-30b:free" },
    { id: "saaras-v3-free", name: "Saaras V3 (Free)", upstreamModelId: "sarvam/saaras:v3:free" },
    { id: "bulbul-v2-free", name: "Bulbul V2 (Free)", upstreamModelId: "sarvam/bulbul:v2:free" },

    // ─── Auto Router ────────────────────────────────────────────────────────
    { id: "auto", name: "FastRouter Auto", upstreamModelId: "fastrouter/auto" },

    // ─── Anthropic Models ───────────────────────────────────────────────────
    { id: "claude-sonnet-5", name: "Claude Sonnet 5", upstreamModelId: "anthropic/claude-sonnet-5" },
    { id: "claude-opus-5", name: "Claude Opus 5", upstreamModelId: "anthropic/claude-opus-5" },
    { id: "claude-haiku-4.5", name: "Claude Haiku 4.5", upstreamModelId: "anthropic/claude-haiku-4.5" },
    { id: "claude-fable-5", name: "Claude Fable 5", upstreamModelId: "anthropic/claude-fable-5" },

    // ─── OpenAI Models ──────────────────────────────────────────────────────
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", upstreamModelId: "openai/gpt-5.6-sol" },
    { id: "gpt-5.3-codex", name: "GPT-5.3 Codex", upstreamModelId: "openai/gpt-5.3-codex" },
    { id: "gpt-4o", name: "GPT-4o", upstreamModelId: "openai/gpt-4o" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", upstreamModelId: "openai/gpt-4o-mini" },
    { id: "o3", name: "O3", upstreamModelId: "openai/o3" },
    { id: "o3-mini", name: "O3 Mini", upstreamModelId: "openai/o3-mini" },
    { id: "o4-mini", name: "O4 Mini", upstreamModelId: "openai/o4-mini" },
    { id: "gpt-oss-120b", name: "GPT OSS 120B", upstreamModelId: "openai/gpt-oss-120b" },
    { id: "gpt-oss-20b", name: "GPT OSS 20B", upstreamModelId: "openai/gpt-oss-20b" },

    // ─── Google Models ──────────────────────────────────────────────────────
    { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash", upstreamModelId: "google/gemini-3.7-flash" },
    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", upstreamModelId: "google/gemini-3.5-flash" },
    { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", upstreamModelId: "google/gemini-3.5-flash-lite" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", upstreamModelId: "google/gemini-2.5-pro" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", upstreamModelId: "google/gemini-2.5-flash" },

    // ─── DeepSeek Models ────────────────────────────────────────────────────
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", upstreamModelId: "deepseek/deepseek-v4-flash" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", upstreamModelId: "deepseek/deepseek-v4-pro" },
    { id: "deepseek-v3.2", name: "DeepSeek V3.2", upstreamModelId: "deepseek/deepseek-v3.2" },
    { id: "deepseek-r1", name: "DeepSeek R1", upstreamModelId: "deepseek-ai/DeepSeek-R1" },

    // ─── Moonshot & Qwen & xAI Models ───────────────────────────────────────
    { id: "kimi-k3", name: "Kimi K3", upstreamModelId: "moonshotai/kimi-k3" },
    { id: "kimi-k2.7-code", name: "Kimi K2.7 Code", upstreamModelId: "moonshotai/kimi-k2.7-code" },
    { id: "qwen2.5-72b-instruct", name: "Qwen 2.5 72B Instruct", upstreamModelId: "Qwen/Qwen2.5-72B-Instruct" },
    { id: "qwen2.5-vl-32b-instruct", name: "Qwen 2.5 VL 32B Instruct", upstreamModelId: "qwen/qwen2.5-vl-32b-instruct" },
    { id: "grok-4.5", name: "Grok 4.5", upstreamModelId: "x-ai/grok-4.5" },
  ],
  serviceKinds: ["llm"],
};
