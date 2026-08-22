/**
 * Cohere v2 → OpenAI response translator (non-streaming)
 *
 * Upstream response shape:
 * {
 *   id, finish_reason: "COMPLETE"|"MAX_TOKENS"|"STOP_SEQUENCE"|"TOOL_CALL"|"ERROR"|"TIMEOUT",
 *   message: { role:"assistant", content:[{type:"text",text}], tool_calls?:[{id,type,function:{name,arguments}}] },
 *   usage: { billed_units:{input_tokens,output_tokens}, tokens:{...} }
 * }
 */
import { register } from "../index.js";
import { FORMATS } from "../formats.js";
import { OPENAI_FINISH, COHERE_FINISH } from "../schema/index.js";

const FINISH_MAP = {
  [COHERE_FINISH.COMPLETE]: OPENAI_FINISH.STOP,
  [COHERE_FINISH.MAX_TOKENS]: OPENAI_FINISH.LENGTH,
  [COHERE_FINISH.STOP_SEQUENCE]: OPENAI_FINISH.STOP,
  [COHERE_FINISH.TOOL_CALL]: OPENAI_FINISH.TOOL_CALLS,
  [COHERE_FINISH.ERROR]: OPENAI_FINISH.STOP,
  [COHERE_FINISH.TIMEOUT]: OPENAI_FINISH.LENGTH,
};

function joinTextBlocks(content) {
  if (!Array.isArray(content)) return typeof content === "string" ? content : "";
  return content
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
}

function convertToolCalls(toolCalls = []) {
  return toolCalls.map((tc, i) => ({
    id: tc.id || `call_${i}`,
    type: "function",
    function: {
      name: tc.function?.name || "",
      // Cohere returns arguments as JSON string already; normalize to string
      arguments: typeof tc.function?.arguments === "string"
        ? tc.function.arguments
        : JSON.stringify(tc.function?.arguments || {}),
    },
  }));
}

export function translateCohereToOpenAI(cohereResponse, upstreamModel) {
  if (!cohereResponse || typeof cohereResponse !== "object") {
    return { id: "chatcmpl-empty", object: "chat.completion", created: Math.floor(Date.now() / 1000), model: upstreamModel, choices: [], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } };
  }

  const message = cohereResponse.message || {};
  const text = joinTextBlocks(message.content);
  const toolCalls = Array.isArray(message.tool_calls) ? convertToolCalls(message.tool_calls) : undefined;

  const finishRaw = cohereResponse.finish_reason || COHERE_FINISH.COMPLETE;
  const finish = FINISH_MAP[finishRaw] || OPENAI_FINISH.STOP;

  const assistantMessage = { role: "assistant", content: text || null };
  if (toolCalls && toolCalls.length > 0) {
    assistantMessage.tool_calls = toolCalls;
    // OpenAI convention: content null when only tool_calls
    if (!text) assistantMessage.content = null;
  }

  const billed = cohereResponse.usage?.billed_units || {};
  const promptTokens = Number(billed.input_tokens ?? cohereResponse.usage?.tokens?.input_tokens ?? 0);
  const completionTokens = Number(billed.output_tokens ?? cohereResponse.usage?.tokens?.output_tokens ?? 0);

  return {
    id: cohereResponse.id || `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: upstreamModel,
    choices: [
      {
        index: 0,
        message: assistantMessage,
        finish_reason: finish,
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };
}

register(FORMATS.COHERE, FORMATS.OPENAI, translateCohereToOpenAI);
