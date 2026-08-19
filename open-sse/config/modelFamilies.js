/**
 * open-sse/config/modelFamilies.js
 *
 * Model family detection for multi-provider routing.
 */

export const MODEL_FAMILIES = {
  "deepseek": {
    pattern: /^deepseek[-_]/i,
    description: "DeepSeek models (V4, V3, R1)",
  },
  "mimo": {
    pattern: /^mimo[-_]/i,
    description: "Xiaomi MiMo models",
  },
  "qwen": {
    pattern: /^qwen/i,
    description: "Alibaba Qwen models",
  },
  "gemini": {
    pattern: /^gemini[-_]/i,
    description: "Google Gemini models",
  },
  "glm": {
    pattern: /^glm[-_]/i,
    description: "Zhipu GLM models",
  },
  "minimax": {
    pattern: /^minimax[-_]/i,
    description: "MiniMax models",
  },
  "claude": {
    pattern: /^claude[-_]/i,
    description: "Anthropic Claude models (Sonnet, Opus, Haiku)",
  },
  "gpt": {
    pattern: /^(gpt[-_]|o1[-_]?|o3[-_]?|o4[-_]?)/i,
    description: "OpenAI GPT models (GPT-4o, GPT-5, o1, o3)",
  },
  "llama": {
    pattern: /^llama[-_]/i,
    description: "Meta Llama models",
  },
};

/**
 * Detect model family from model name.
 * @param {string} modelId - Model ID (may include provider prefix)
 * @returns {string|null} Family name or null
 */
export function detectModelFamily(modelId) {
  if (!modelId) return null;
  const bare = modelId.includes("/") ? modelId.split("/").pop() : modelId;
  const normalized = bare.toLowerCase();

  for (const [family, { pattern }] of Object.entries(MODEL_FAMILIES)) {
    if (pattern.test(normalized)) return family;
  }
  return null;
}
