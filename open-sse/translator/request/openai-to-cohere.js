/**
 * OpenAI → Cohere v2 request translator
 *
 * Upstream POST https://api.cohere.com/v2/chat (native schema, NOT OpenAI):
 *  - messages[*].role ∈ {"system","user","assistant","tool"}
 *  - assistant/user content: string OR [{type:"text", text}] blocks
 *  - tools[]: flat {name, description, parameters}
 *  - tool_choice: "REQUIRED" | "NONE" (v2 native names)
 *  - top_p → p
 *  - response_format passthrough {type:"json_object"} / json_schema
 */
import { register } from "../index.js";
import { FORMATS } from "../formats.js";
import { ROLE, OPENAI_BLOCK, COHERE_BLOCK } from "../schema/index.js";

function flattenText(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts = [];
    for (const p of content) {
      if (typeof p === "string") parts.push(p);
      else if (p && typeof p === "object") {
        if (typeof p.text === "string") parts.push(p.text);
        else if (p.type === OPENAI_BLOCK.IMAGE_URL || p.type === OPENAI_BLOCK.IMAGE) parts.push("[image omitted]");
      }
    }
    return parts.join("\n");
  }
  return String(content);
}

// OpenAI tool_calls (assistant) → Cohere assistant message tool_calls
function convertAssistantToolCalls(toolCalls = []) {
  return toolCalls.map((tc) => ({
    id: tc.id,
    type: "function",
    function: {
      name: tc.function?.name || "",
      arguments: typeof tc.function?.arguments === "string"
        ? JSON.stringify(safeParseJson(tc.function.arguments))
        : JSON.stringify(tc.function?.arguments || {}),
    },
  }));
}

function safeParseJson(s) {
  if (s == null) return {};
  if (typeof s !== "string") return s;
  try { return JSON.parse(s); } catch { return {}; }
}

function convertMessages(messages = []) {
  const out = [];
  for (const msg of messages) {
    if (!msg || !msg.role) continue;
    const role = String(msg.role).toLowerCase();

    if (role === ROLE.SYSTEM || role === "developer") {
      out.push({ role: "system", content: flattenText(msg.content) });
      continue;
    }

    if (role === ROLE.USER || role === "human") {
      out.push({ role: "user", content: flattenText(msg.content) });
      continue;
    }

    if (role === ROLE.ASSISTANT) {
      const entry = { role: "assistant", content: flattenText(msg.content) };
      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        entry.tool_calls = convertAssistantToolCalls(msg.tool_calls);
      }
      out.push(entry);
      continue;
    }

    if (role === ROLE.TOOL || role === "function") {
      // OpenAI tool result → Cohere tool role message
      const toolCallId = msg.tool_call_id || null;
      const content = flattenText(msg.content);
      out.push({
        role: "tool",
        tool_call_id: toolCallId,
        content: [{ type: COHERE_BLOCK.TEXT, text: content }],
      });
      continue;
    }
  }
  return out;
}

// OpenAI tools[{type:"function", function:{name,description,parameters}}] → Cohere flat
function convertTools(tools = []) {
  return tools
    .filter((t) => t && (t.function || t.name))
    .map((t) => {
      if (t.function) {
        return {
          name: t.function.name,
          description: t.function.description || "",
          parameters: t.function.parameters || { type: "object", properties: {} },
        };
      }
      return { name: t.name, description: t.description || "", parameters: t.parameters || { type: "object", properties: {} } };
    });
}

// OpenAI tool_choice → Cohere v2 enum
function convertToolChoice(toolChoice) {
  if (!toolChoice) return undefined;
  const s = typeof toolChoice === "string" ? toolChoice.toLowerCase() : null;
  if (s === "required") return "REQUIRED";
  if (s === "none") return "NONE";
  // auto or object form — let model choose (omit)
  return undefined;
}

export function translateOpenAIToCohere(body, upstreamModel) {
  if (!body || typeof body !== "object") return body;

  const out = {
    model: upstreamModel,
    messages: convertMessages(Array.isArray(body.messages) ? body.messages : []),
  };

  // Sampling params (same names in v2 except top_p → p)
  if (body.max_tokens != null) out.max_tokens = body.max_tokens;
  if (body.temperature != null) out.temperature = body.temperature;
  if (body.seed != null) out.seed = body.seed;
  if (body.stop != null) {
    out.stop_sequences = Array.isArray(body.stop) ? body.stop.slice(0, 5) : [String(body.stop)];
  }
  if (body.frequency_penalty != null) out.frequency_penalty = body.frequency_penalty;
  if (body.presence_penalty != null) out.presence_penalty = body.presence_penalty;
  if (body.top_p != null) out.p = body.top_p;

  // Tools + choice
  if (Array.isArray(body.tools) && body.tools.length > 0) {
    out.tools = convertTools(body.tools);
    const tc = convertToolChoice(body.tool_choice);
    if (tc) out.tool_choice = tc;
  }

  // Structured output passthrough
  if (body.response_format) out.response_format = body.response_format;

  // Streaming flag handled by executor via `stream` field
  if (body.stream != null) out.stream = body.stream === true;

  return out;
}

register(FORMATS.OPENAI, FORMATS.COHERE, translateOpenAIToCohere);
