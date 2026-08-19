import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/usageDb.js", () => ({
  trackPendingRequest: vi.fn(),
  appendRequestLog: vi.fn(async () => {}),
}));

import { createSSEStream } from "../../open-sse/utils/stream.js";

const encode = (value) => new TextEncoder().encode(value);

async function runStream(options, input) {
  const stream = createSSEStream(options);
  const reader = stream.readable.getReader();
  let output = "";
  const consume = (async () => {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      output += new TextDecoder().decode(value);
    }
  })();
  const writer = stream.writable.getWriter();
  await writer.write(encode(input));
  await writer.close();
  await consume;
  return output;
}

const finishChunk = (usage) => `data: ${JSON.stringify({
  id: "chatcmpl-test",
  object: "chat.completion.chunk",
  choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
  usage,
})}\n`;

describe("zero-completion correction across stream modes", () => {
  it("corrects zero completion tokens in passthrough mode", async () => {
    let completedUsage;
    const output = await runStream({
      mode: "passthrough",
      provider: "test",
      body: { messages: [{ role: "user", content: "hello" }] },
      onStreamComplete: (_content, usage) => { completedUsage = usage; },
    }, [
      'data: {"choices":[{"delta":{"content":"hello"}}]}\n',
      finishChunk({ prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 }),
      "data: [DONE]\n\n",
    ].join(""));

    expect(output).toContain("data: [DONE]");
    expect(completedUsage.completion_tokens).toBeGreaterThan(0);
    expect(completedUsage.estimated).toBe(true);
  });

  it("corrects zero completion tokens in translated mode", async () => {
    let completedUsage;
    const output = await runStream({
      onStreamComplete: (_content, usage) => { completedUsage = usage; },
      mode: "translate",
      targetFormat: "openai",
      sourceFormat: "openai",
      provider: "test",
      body: { messages: [{ role: "user", content: "hello" }] },
    }, [
      'data: {"choices":[{"delta":{"content":"hello"}}]}\n',
      finishChunk({ prompt_tokens: 5, completion_tokens: 0, total_tokens: 5 }),
      "data: [DONE]\n\n",
    ].join(""));

    expect(output).toContain('"finish_reason":"stop"');
    expect(completedUsage.completion_tokens).toBeGreaterThan(0);
    expect(completedUsage.estimated).toBe(true);
  });
});
