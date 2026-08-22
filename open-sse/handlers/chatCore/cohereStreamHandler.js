/**
 * Cohere v2 SSE → OpenAI chat.completion.chunk SSE stream mapper
 *
 * Cohere v2 streaming uses NAMED events (event: <type> + data: {...}):
 *   message-start, content-start, content-delta, content-end,
 *   tool-plan-delta, tool-call-start, tool-call-delta, tool-call-end,
 *   citation-start, citation-end, message-end
 *
 * This mapper converts them to OpenAI `data: {choices:[{delta:{...}}]}` chunks.
 */

const FINISH_MAP = {
  COMPLETE: "stop",
  MAX_TOKENS: "length",
  STOP_SEQUENCE: "stop",
  TOOL_CALL: "tool_calls",
  ERROR: "stop",
  TIMEOUT: "length",
};

/**
 * Parse an SSE frame into { event, data } — handles both named events and data-only.
 */
export function parseSseFrame(frame) {
  if (!frame || typeof frame !== "string") return null;
  let event = null;
  const dataLines = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    // ignore comments (:), id:, retry:
  }
  if (dataLines.length === 0) return null;
  const raw = dataLines.join("\n");
  if (raw === "[DONE]") return { event: "__done__", data: null };
  try {
    return { event, data: JSON.parse(raw) };
  } catch {
    return null;
  }
}

/**
 * Create a stateful mapper. Feed each parsed SSE frame via mapEvent(),
 * collect OpenAI SSE string chunks from output buffer.
 */
export function createCohereStreamMapper({ id, created, model }) {
  const out = [];
  const emit = (delta, finishReason = null) => {
    out.push(`data: ${JSON.stringify({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta, finish_reason: finishReason }],
    })}\n\n`);
  };

  // Tool call accumulation across tool-call-start/delta/end
  let toolIndex = -1;
  let toolName = "";
  let toolArgs = "";
  let toolId = "";

  return {
    /** Process one parsed frame; returns array of OpenAI SSE strings emitted so far this call. */
    mapEvent(parsed) {
      const before = out.length;
      if (!parsed || !parsed.event) return [];

      switch (parsed.event) {
        case "message-start":
          // Emit role chunk once
          emit({ role: "assistant", content: "" });
          break;

        case "content-delta": {
          const text = parsed.data?.delta?.message?.content?.text;
          if (typeof text === "string" && text.length > 0) {
            emit({ content: text });
          }
          break;
        }

        case "content-start":
        case "content-end":
        case "citation-start":
        case "citation-end":
          // no-op (content block boundaries; citations appended by non-stream path only)
          break;

        case "tool-plan-delta": {
          // Surface thinking/plan as reasoning_content when present
          const plan = parsed.data?.delta?.message?.tool_plan ?? parsed.data?.delta?.tool_plan;
          if (typeof plan === "string" && plan.length > 0) {
            emit({ reasoning_content: plan });
          }
          break;
        }

        case "tool-call-start": {
          toolIndex += 1;
          toolName = parsed.data?.delta?.message?.tool_calls?.function?.name
            || parsed.data?.delta?.message?.tool_calls?.function?.name || "";
          toolArgs = "";
          toolId = parsed.data?.delta?.message?.tool_calls?.id || `call_${toolIndex}`;
          break;
        }

        case "tool-call-delta": {
          const argsDelta = parsed.data?.delta?.message?.tool_calls?.function?.arguments
            ?? parsed.data?.delta?.message?.tool_calls?.arguments_delta ?? "";
          if (typeof argsDelta === "string") toolArgs += argsDelta;
          break;
        }

        case "tool-call-end": {
          emit({
            tool_calls: [{
              index: toolIndex,
              id: toolId,
              type: "function",
              function: { name: toolName, arguments: toolArgs },
            }],
          });
          toolName = ""; toolArgs = ""; toolId = "";
          break;
        }

        case "message-end": {
          const finishRaw = parsed.data?.delta?.finish_reason || "COMPLETE";
          const finish = FINISH_MAP[finishRaw] || "stop";
          const billed = parsed.data?.delta?.usage?.billed_units || {};
          const usage = {
            prompt_tokens: Number(billed.input_tokens ?? 0),
            completion_tokens: Number(billed.output_tokens ?? 0),
            total_tokens: Number(billed.input_tokens ?? 0) + Number(billed.output_tokens ?? 0),
          };
          // Final chunk carries usage per OpenAI stream_options.include_usage convention
          out.push(`data: ${JSON.stringify({
            id,
            object: "chat.completion.chunk",
            created,
            model,
            choices: [{ index: 0, delta: {}, finish_reason: finish }],
            usage,
          })}\n\n`);
          out.push("data: [DONE]\n\n");
          break;
        }

        default:
          // Unknown event — ignore silently
          break;
      }

      return out.splice(before);
    },

    /** Finalize: if upstream closed without message-end, emit [DONE]. */
    finalize() {
      if (out.length === 0 || !out[out.length - 1].includes("[DONE]")) {
        out.push("data: [DONE]\n\n");
      }
      return out.splice(0);
    },
  };
}
