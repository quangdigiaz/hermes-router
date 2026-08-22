import { describe, it, expect } from "vitest";
import { translateOpenAIToCohere } from "../../open-sse/translator/request/openai-to-cohere.js";
import { translateCohereToOpenAI } from "../../open-sse/translator/response/cohere-to-openai.js";
import { parseSseFrame, createCohereStreamMapper } from "../../open-sse/handlers/chatCore/cohereStreamHandler.js";

describe("cohere v2 translators", () => {
  describe("request: openai → cohere", () => {
    it("maps system/user/assistant roles and flattens content", () => {
      const out = translateOpenAIToCohere({
        messages: [
          { role: "system", content: "be brief" },
          { role: "user", content: [{ type: "text", text: "hello" }] },
          { role: "assistant", content: "hi there" },
        ],
      }, "command-a-plus-05-2026");
      expect(out.model).toBe("command-a-plus-05-2026");
      expect(out.messages).toEqual([
        { role: "system", content: "be brief" },
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi there" },
      ]);
    });

    it("flattens tools to flat shape and maps tool_choice", () => {
      const out = translateOpenAIToCohere({
        messages: [{ role: "user", content: "weather?" }],
        tools: [{ type: "function", function: { name: "get_weather", description: "w", parameters: { type: "object" } } }],
        tool_choice: "required",
      }, "command-a-plus-05-2026");
      expect(out.tools).toEqual([{ name: "get_weather", description: "w", parameters: { type: "object" } }]);
      expect(out.tool_choice).toBe("REQUIRED");
    });

    it("converts assistant tool_calls arguments object→string and top_p→p", () => {
      const out = translateOpenAIToCohere({
        messages: [
          { role: "assistant", content: "", tool_calls: [{ id: "c1", function: { name: "f", arguments: JSON.stringify({ a: 1 }) } }] },
        ],
        top_p: 0.9,
      }, "m");
      expect(out.p).toBe(0.9);
      expect(out.messages[0].tool_calls[0].function.arguments).toBe(JSON.stringify({ a: 1 }));
    });

    it("maps OpenAI tool result message to cohere tool role with text blocks", () => {
      const out = translateOpenAIToCohere({
        messages: [{ role: "tool", tool_call_id: "c1", content: "42" }],
      }, "m");
      expect(out.messages[0]).toMatchObject({ role: "tool", tool_call_id: "c1" });
      expect(out.messages[0].content).toEqual([{ type: "text", text: "42" }]);
    });
  });

  describe("response: cohere → openai (non-stream)", () => {
    it("joins text blocks and maps usage from billed_units", () => {
      const out = translateCohereToOpenAI({
        id: "abc",
        finish_reason: "COMPLETE",
        message: { role: "assistant", content: [{ type: "text", text: "LL" }, { type: "text", text: "Ms" }] },
        usage: { billed_units: { input_tokens: 5, output_tokens: 26 } },
      }, "command-a-plus-05-2026");
      expect(out.choices[0].message.content).toBe("LLMs");
      expect(out.choices[0].finish_reason).toBe("stop");
      expect(out.usage).toEqual({ prompt_tokens: 5, completion_tokens: 26, total_tokens: 31 });
    });

    it("maps MAX_TOKENS→length and TOOL_CALL finish→tool_calls with normalized args string", () => {
      const out = translateCohereToOpenAI({
        id: "x",
        finish_reason: "TOOL_CALL",
        message: { role: "assistant", content: [], tool_calls: [{ id: "t1", function: { name: "f", arguments: "{\"a\":1}" } }] },
        usage: { billed_units: { input_tokens: 1, output_tokens: 2 } },
      }, "m");
      expect(out.choices[0].finish_reason).toBe("tool_calls");
      expect(out.choices[0].message.content).toBeNull();
      expect(out.choices[0].message.tool_calls[0].function.arguments).toBe("{\"a\":1}");
    });

    it("maps MAX_TOKENS finish_reason to length", () => {
      const out = translateCohereToOpenAI({ id: "y", finish_reason: "MAX_TOKENS", message: { content: [{ type: "text", text: "partial" }] } }, "m");
      expect(out.choices[0].finish_reason).toBe("length");
    });
  });

  describe("streaming SSE mapper", () => {
    const mk = () => createCohereStreamMapper({ id: "s1", created: 1700000000, model: "command-a-plus-05-2026" });

    it("parses named SSE frames (event: + data:)", () => {
      const frame = 'event: content-delta\ndata: {"delta":{"message":{"content":{"text":"LL"}}}}';
      const parsed = parseSseFrame(frame);
      expect(parsed.event).toBe("content-delta");
      expect(parsed.data.delta.message.content.text).toBe("LL");
    });

    it("emits role chunk on message-start, content chunks on deltas, [DONE] on message-end", () => {
      const m = mk();
      let out = [];
      out = m.mapEvent(parseSseFrame('event: message-start\ndata: {"delta":{"message":{"role":"assistant"}}}'));
      expect(out.length).toBe(1);
      expect(JSON.parse(out[0].slice(5)).choices[0].delta.role).toBe("assistant");

      out = m.mapEvent(parseSseFrame('event: content-delta\ndata: {"index":0,"delta":{"message":{"content":{"text":"LL"}}}}'));
      expect(JSON.parse(out[0].slice(5)).choices[0].delta.content).toBe("LL");

      // no-op events emit nothing
      out = m.mapEvent(parseSseFrame('event: content-start\ndata: {"index":0,"delta":{"message":{"content":{"text":"","type":"text"}}}}'));
      expect(out.length).toBe(0);

      out = m.mapEvent(parseSseFrame('event: message-end\ndata: {"delta":{"finish_reason":"COMPLETE","usage":{"billed_units":{"input_tokens":71,"output_tokens":26},"tokens":{}}}}'));
      const finalChunk = JSON.parse(out[0].slice(5));
      expect(finalChunk.choices[0].finish_reason).toBe("stop");
      expect(finalChunk.usage).toEqual({ prompt_tokens: 71, completion_tokens: 26, total_tokens: 97 });
      expect(out[1]).toBe("data: [DONE]\n\n");
    });

    it("accumulates tool-call start/delta/end into one OpenAI tool_calls chunk", () => {
      const m = mk();
      m.mapEvent(parseSseFrame('event: message-start\ndata: {"delta":{"message":{"role":"assistant"}}}'));
      const outStart = m.mapEvent(parseSseFrame('event: tool-call-start\ndata: {"index":0,"delta":{"message":{"tool_calls":{"id":"t1","function":{"name":"get_weather"}}}}}'));
      expect(outStart.length).toBe(0); // buffered
      m.mapEvent(parseSseFrame('event: tool-call-delta\ndata: {"index":0,"delta":{"message":{"tool_calls":{"function":{"arguments":"{\\"city\\""}}}}}'));
      m.mapEvent(parseSseFrame('event: tool-call-delta\ndata: {"index":0,"delta":{"message":{"tool_calls":{"function":{"arguments":":\\"HN\\"}"}}}}}'));
      const outEnd = m.mapEvent(parseSseFrame('event: tool-call-end\ndata: {"index":0}'));
      expect(outEnd.length).toBe(1);
      const chunk = JSON.parse(outEnd[0].slice(5));
      const tc = chunk.choices[0].delta.tool_calls[0];
      expect(tc.id).toBe("t1");
      expect(tc.function.name).toBe("get_weather");
      expect(tc.function.arguments).toBe("{\"city\":\"HN\"}");
    });

    it("finalize appends [DONE] if upstream closed early", () => {
      const m = mk();
      const out = m.finalize();
      expect(out).toEqual(["data: [DONE]\n\n"]);
    });
  });
});
