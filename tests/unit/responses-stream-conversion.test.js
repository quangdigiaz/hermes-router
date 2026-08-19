import { describe, it, expect } from "vitest";
import { convertResponsesStreamToJson } from "open-sse/transformer/streamToJsonConverter.js";
import { responsesUsageToOpenAI } from "open-sse/handlers/chatCore/sseToJsonHandler.js";

function streamOf(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
}

describe("forced SSE conversion", () => {
  it("flushes decoder data from a final incomplete event", async () => {
    const result = await convertResponsesStreamToJson(streamOf([
      "event: response.completed\ndata: {\"response\":{\"usage\":{\"input_tokens\":0,\"output_tokens\":2,\"total_tokens\":2}}}",
    ]));
    expect(result.usage).toEqual({ input_tokens: 0, output_tokens: 2, total_tokens: 2 });
  });

  it("preserves zero and falls back to prompt/completion usage", () => {
    const result = responsesUsageToOpenAI({ input_tokens: 0, output_tokens: 0, prompt_tokens: 7, completion_tokens: 3 });
    expect(result).toMatchObject({ prompt_tokens: 0, completion_tokens: 0 });
    expect(responsesUsageToOpenAI({ prompt_tokens: 7, completion_tokens: 3 })).toMatchObject({ prompt_tokens: 7, completion_tokens: 3 });
  });

  it("normalizes provider-style usage in Responses SSE", async () => {
    const result = await convertResponsesStreamToJson(streamOf([
      "event: response.completed\ndata: {\"response\":{\"usage\":{\"prompt_tokens\":7,\"completion_tokens\":3}}}",
    ]));
    expect(result.usage).toEqual({ input_tokens: 7, output_tokens: 3, total_tokens: 10 });
  });
});
