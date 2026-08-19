import { describe, it, expect } from "vitest";
import { injectCaveman } from "../../open-sse/rtk/caveman.js";
import { injectSystemPrompt } from "../../open-sse/rtk/systemInject.js";
import { injectPonytail } from "../../open-sse/rtk/ponytail.js";
import { CAVEMAN_PROMPTS } from "../../open-sse/rtk/cavemanPrompts.js";
import { PONYTAIL_PROMPTS } from "../../open-sse/rtk/ponytailPrompts.js";
import { FORMATS } from "../../open-sse/translator/formats.js";

// A short marker we can search for in injected output
const cavemanFull = CAVEMAN_PROMPTS.full;
const ponytailFull = PONYTAIL_PROMPTS.full;

describe("caveman prompts", () => {
  it("has lite/full/ultra + wenyan levels with non-empty text", () => {
    for (const lvl of ["lite", "full", "ultra", "wenyan-lite", "wenyan", "wenyan-ultra"]) {
      expect(typeof CAVEMAN_PROMPTS[lvl]).toBe("string");
      expect(CAVEMAN_PROMPTS[lvl].length).toBeGreaterThan(20);
    }
  });
});

describe("ponytail prompts", () => {
  it("has lite/full/ultra levels with the YAGNI ladder", () => {
    for (const lvl of ["lite", "full", "ultra"]) {
      expect(typeof PONYTAIL_PROMPTS[lvl]).toBe("string");
      expect(PONYTAIL_PROMPTS[lvl]).toContain("YAGNI");
      expect(PONYTAIL_PROMPTS[lvl]).toContain("lazy senior developer");
    }
  });
});

describe("injectCaveman — format dispatch", () => {
  it("OpenAI: appends to existing system message", () => {
    const body = { messages: [{ role: "system", content: "You are helpful." }, { role: "user", content: "hi" }] };
    injectCaveman(body, FORMATS.OPENAI, "full");
    expect(body.messages[0].content).toContain("You are helpful.");
    expect(body.messages[0].content).toContain(cavemanFull);
  });

  it("OpenAI: creates a system message when none exists", () => {
    const body = { messages: [{ role: "user", content: "hi" }] };
    injectCaveman(body, FORMATS.OPENAI, "full");
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toBe(cavemanFull);
  });

  it("OpenAI Responses: appends to instructions string", () => {
    const body = { instructions: "Base.", input: [{ role: "user", content: "hi" }] };
    injectCaveman(body, FORMATS.OPENAI_RESPONSES, "full");
    expect(body.instructions).toContain("Base.");
    expect(body.instructions).toContain(cavemanFull);
  });

  it("Claude: appends to string system", () => {
    const body = { system: "Base sys.", messages: [] };
    injectCaveman(body, FORMATS.CLAUDE, "full");
    expect(body.system).toContain("Base sys.");
    expect(body.system).toContain(cavemanFull);
  });

  it("Claude: inserts before the last cache_control block in array system", () => {
    const body = {
      system: [
        { type: "text", text: "A" },
        { type: "text", text: "B", cache_control: { type: "ephemeral" } },
      ],
      messages: [],
    };
    injectCaveman(body, FORMATS.CLAUDE, "full");
    // caveman block inserted BEFORE the cached block (index 1), cached block stays last
    const texts = body.system.map((b) => b.text);
    expect(texts).toContain(cavemanFull);
    expect(body.system[body.system.length - 1].cache_control).toBeTruthy();
    const cavemanIdx = body.system.findIndex((b) => b.text === cavemanFull);
    const cacheIdx = body.system.findIndex((b) => b.cache_control);
    expect(cavemanIdx).toBeLessThan(cacheIdx);
  });

  it("Gemini: appends to systemInstruction.parts", () => {
    const body = { systemInstruction: { parts: [{ text: "base" }] }, contents: [] };
    injectCaveman(body, FORMATS.GEMINI, "full");
    expect(body.systemInstruction.parts.map((p) => p.text)).toContain(cavemanFull);
  });

  it("Gemini: creates systemInstruction when missing", () => {
    const body = { contents: [] };
    injectCaveman(body, FORMATS.VERTEX, "full");
    expect(body.systemInstruction.parts[0].text).toBe(cavemanFull);
  });

  it("Antigravity: injects into body.request.systemInstruction", () => {
    const body = { request: { systemInstruction: { parts: [{ text: "x" }] }, contents: [] } };
    injectCaveman(body, FORMATS.ANTIGRAVITY, "full");
    expect(body.request.systemInstruction.parts.map((p) => p.text)).toContain(cavemanFull);
  });

  it("Kiro: injects into top-level systemPrompt", () => {
    const body = { systemPrompt: "base", conversationState: { currentMessage: { userInputMessage: { content: "my task" } } } };
    injectCaveman(body, FORMATS.KIRO, "full");
    expect(body.systemPrompt).toContain("base");
    expect(body.systemPrompt).toContain(cavemanFull);
    expect(body.conversationState.currentMessage.userInputMessage.content).toBe("my task");
  });

  it("Cursor/CommandCode: injects via OpenAI-shaped messages[] handler", () => {
    const cursorBody = { messages: [{ role: "user", content: "hi" }] };
    injectCaveman(cursorBody, FORMATS.CURSOR, "full");
    expect(cursorBody.messages[0].role).toBe("system");
    expect(cursorBody.messages[0].content).toBe(cavemanFull);

    const ccBody = { messages: [{ role: "user", content: "hi" }] };
    injectCaveman(ccBody, FORMATS.COMMANDCODE, "full");
    expect(ccBody.messages[0].role).toBe("system");
    expect(ccBody.messages[0].content).toBe(cavemanFull);
  });

  it("no-op for unknown level or null body", () => {
    const body = { messages: [{ role: "user", content: "hi" }] };
    const before = JSON.stringify(body);
    injectCaveman(body, FORMATS.OPENAI, "nonexistent-level");
    expect(JSON.stringify(body)).toBe(before);
    expect(() => injectCaveman(null, FORMATS.OPENAI, "full")).not.toThrow();
  });
});

describe("injectSystemPrompt — injection behavior per format", () => {
  it("injects marker for formats with a system surface", () => {
    const openaiBody = { messages: [{ role: "system", content: "base" }] };
    injectSystemPrompt(openaiBody, FORMATS.OPENAI, "MARKER");
    expect(openaiBody.messages[0].content).toContain("MARKER");

    const claudeBody = { system: "base", messages: [] };
    injectSystemPrompt(claudeBody, FORMATS.CLAUDE, "MARKER");
    expect(claudeBody.system).toContain("MARKER");

    const geminiBody = { systemInstruction: { parts: [{ text: "base" }] }, contents: [] };
    injectSystemPrompt(geminiBody, FORMATS.GEMINI, "MARKER");
    expect(geminiBody.systemInstruction.parts.map((p) => p.text).join("")).toContain("MARKER");
  });

  it("injects into Cursor/CommandCode via OpenAI-shaped messages[] handler", () => {
    const cursorBody = { messages: [{ role: "user", content: "hi" }] };
    injectSystemPrompt(cursorBody, FORMATS.CURSOR, "MARKER");
    expect(cursorBody.messages[0].role).toBe("system");
    expect(cursorBody.messages[0].content).toContain("MARKER");
  });

  it("injects into Kiro top-level systemPrompt", () => {
    const kiroBody = { systemPrompt: "base", conversationState: { currentMessage: { userInputMessage: { content: "task" } } } };
    injectSystemPrompt(kiroBody, FORMATS.KIRO, "MARKER");
    expect(kiroBody.systemPrompt).toContain("base");
    expect(kiroBody.systemPrompt).toContain("MARKER");
    expect(kiroBody.conversationState.currentMessage.userInputMessage.content).toBe("task");
  });
});

describe("injectPonytail — format dispatch", () => {
  it("OpenAI: appends ponytail ruleset to system message", () => {
    const body = { messages: [{ role: "system", content: "Base." }] };
    injectPonytail(body, FORMATS.OPENAI, "full");
    expect(body.messages[0].content).toContain("Base.");
    expect(body.messages[0].content).toContain(ponytailFull);
  });

  it("Claude: appends to system", () => {
    const body = { system: "Base.", messages: [] };
    injectPonytail(body, FORMATS.CLAUDE, "full");
    expect(body.system).toContain(ponytailFull);
  });

  it("Kiro: injects into top-level systemPrompt", () => {
    const body = { systemPrompt: "base", conversationState: { currentMessage: { userInputMessage: { content: "task" } } } };
    injectPonytail(body, FORMATS.KIRO, "ultra");
    expect(body.systemPrompt).toContain("base");
    expect(body.systemPrompt).toContain(PONYTAIL_PROMPTS.ultra);
    expect(body.conversationState.currentMessage.userInputMessage.content).toBe("task");
  });

  it("Cursor/CommandCode: injects via OpenAI-shaped messages[] handler", () => {
    const body = { messages: [{ role: "user", content: "hi" }] };
    injectPonytail(body, FORMATS.CURSOR, "full");
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain(ponytailFull);
  });

  it("no-op for unknown level", () => {
    const body = { messages: [] };
    const before = JSON.stringify(body);
    injectPonytail(body, FORMATS.OPENAI, "bogus");
    expect(JSON.stringify(body)).toBe(before);
  });
});

describe("caveman + ponytail together (orthogonal, both active)", () => {
  it("both injected into the same OpenAI system message", () => {
    const body = { messages: [{ role: "system", content: "Base." }] };
    injectCaveman(body, FORMATS.OPENAI, "full");
    injectPonytail(body, FORMATS.OPENAI, "full");
    expect(body.messages[0].content).toContain(cavemanFull);
    expect(body.messages[0].content).toContain(ponytailFull);
    expect(body.messages[0].content).toContain("Base.");
  });
});
