// Comprehensive matrix coverage for the three token-saver tools across EVERY
// provider/target-format and EVERY scenario:
//   1. RTK            — input compression (tool_result content)
//   2. Caveman        — output style system-prompt injection
//   3. Ponytail       — code-minimalism system-prompt injection
//
// The unit of variance is the TARGET FORMAT (each provider translates to one of
// these). The provider→format mapping below is derived from
// open-sse/services/provider.js getTargetFormat() and asserted live, so if a
// provider's routing changes the matrix catches it.

import { describe, it, expect } from "vitest";
import { compressMessages } from "../../open-sse/rtk/index.js";
import { injectCaveman } from "../../open-sse/rtk/caveman.js";
import { injectSystemPrompt } from "../../open-sse/rtk/systemInject.js";
import { injectPonytail } from "../../open-sse/rtk/ponytail.js";
import { CAVEMAN_PROMPTS } from "../../open-sse/rtk/cavemanPrompts.js";
import { PONYTAIL_PROMPTS } from "../../open-sse/rtk/ponytailPrompts.js";
import { getTargetFormat } from "../../open-sse/services/provider.js";
import { FORMATS } from "../../open-sse/translator/formats.js";

// ── Provider → target format mapping (representative set across all tiers) ──
const PROVIDER_FORMAT = {
  claude: FORMATS.CLAUDE,
  anthropic: FORMATS.CLAUDE,
  glm: FORMATS.CLAUDE,
  minimax: FORMATS.CLAUDE,
  "minimax-cn": FORMATS.CLAUDE,
  kimi: FORMATS.CLAUDE,
  kiro: FORMATS.KIRO,
  codex: FORMATS.OPENAI_RESPONSES,
  openai: FORMATS.OPENAI,
  deepseek: FORMATS.OPENAI,
  groq: FORMATS.OPENAI,
  opencode: FORMATS.OPENAI,
  nvidia: FORMATS.OPENAI,
  openrouter: FORMATS.OPENAI,
  "glm-cn": FORMATS.OPENAI,
  mistral: FORMATS.OPENAI,
  xai: FORMATS.OPENAI,
  cohere: FORMATS.OPENAI,
  together: FORMATS.OPENAI,
  fireworks: FORMATS.OPENAI,
  cerebras: FORMATS.OPENAI,
  gemini: FORMATS.GEMINI,
  "gemini-cli": FORMATS.GEMINI_CLI,
  vertex: FORMATS.VERTEX,
  antigravity: FORMATS.ANTIGRAVITY,
  cursor: FORMATS.CURSOR,
  commandcode: FORMATS.COMMANDCODE,
  ollama: FORMATS.OLLAMA,
  "ollama-local": FORMATS.OLLAMA,
};

// cursor/commandcode are OpenAI-shaped (messages[]) and DO get injected via default handler.
// Kiro uses its native top-level systemPrompt field.
const NO_SYSTEM_SURFACE = new Set();

// A long, compressible git-diff tool output (>500 bytes → above MIN_COMPRESS_SIZE)
function bigDiff() {
  const lines = ["diff --git a/x.js b/x.js", "index a..b 100644", "--- a/x.js", "+++ b/x.js", "@@ -1,3 +1,300 @@"];
  for (let i = 0; i < 300; i++) lines.push(`+added line ${i} ${"y".repeat(20)}`);
  return lines.join("\n");
}

// ── Body builders per target format (the shape RTK/caveman see post-translation) ──
function buildBodyForFormat(format, { withToolResult = false } = {}) {
  const diff = bigDiff();
  switch (format) {
    case FORMATS.CLAUDE:
      return {
        system: "Base system.",
        messages: withToolResult
          ? [{ role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: diff }] }]
          : [{ role: "user", content: "hi" }],
      };
    case FORMATS.KIRO:
      return {
        systemPrompt: "Base system.",
        conversationState: {
          currentMessage: {
            userInputMessage: {
              content: "do task",
              userInputMessageContext: withToolResult
                ? { toolResults: [{ toolUseId: "t1", status: "success", content: [{ text: diff }] }] }
                : {},
            },
          },
          history: [],
        },
      };
    case FORMATS.OPENAI_RESPONSES:
      return {
        instructions: "Base instructions.",
        input: withToolResult
          ? [{ type: "function_call_output", call_id: "c1", output: diff }]
          : [{ role: "user", content: "hi" }],
      };
    case FORMATS.GEMINI:
    case FORMATS.GEMINI_CLI:
    case FORMATS.VERTEX:
      return {
        systemInstruction: { parts: [{ text: "Base." }] },
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
      };
    case FORMATS.ANTIGRAVITY:
      return {
        request: {
          systemInstruction: { parts: [{ text: "Base." }] },
          contents: [{ role: "user", parts: [{ text: "hi" }] }],
        },
      };
    case FORMATS.CURSOR:
    case FORMATS.COMMANDCODE:
      return { messages: [{ role: "user", content: "hi" }] };
    default: // OPENAI, OLLAMA
      return {
        messages: withToolResult
          ? [
              { role: "system", content: "Base system." },
              { role: "tool", tool_call_id: "t1", content: diff },
            ]
          : [{ role: "system", content: "Base system." }, { role: "user", content: "hi" }],
      };
  }
}

// Extract the injected system text for assertions, per format
function readSystemText(body, format) {
  switch (format) {
    case FORMATS.CLAUDE:
      return typeof body.system === "string"
        ? body.system
        : Array.isArray(body.system) ? body.system.map((b) => b.text).join("\n") : "";
    case FORMATS.KIRO:
      return body.systemPrompt || "";
    case FORMATS.OPENAI_RESPONSES:
      return body.instructions || "";
    case FORMATS.GEMINI:
    case FORMATS.GEMINI_CLI:
    case FORMATS.VERTEX:
      return (body.systemInstruction?.parts || []).map((p) => p.text).join("\n");
    case FORMATS.ANTIGRAVITY:
      return (body.request?.systemInstruction?.parts || []).map((p) => p.text).join("\n");
    default: {
      const arr = body.messages || body.input || [];
      const sys = arr.find((m) => m.role === "system" || m.role === "developer");
      if (!sys) return "";
      return typeof sys.content === "string" ? sys.content : (sys.content || []).map((p) => p.text || "").join("\n");
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 0. Provider → format mapping is correct (guards routing regressions)
// ─────────────────────────────────────────────────────────────────────────
describe("provider → target format mapping", () => {
  for (const [provider, expectedFormat] of Object.entries(PROVIDER_FORMAT)) {
    it(`${provider} routes to ${expectedFormat}`, () => {
      expect(getTargetFormat(provider)).toBe(expectedFormat);
    });
  }
});

// Distinct formats under test
const ALL_FORMATS = [...new Set(Object.values(PROVIDER_FORMAT))];

// ─────────────────────────────────────────────────────────────────────────
// 1. RTK — compresses tool_result for every format that carries tool output
// ─────────────────────────────────────────────────────────────────────────
describe("RTK across all formats", () => {
  // Formats that carry a compressible tool_result shape
  const RTK_FORMATS = [FORMATS.CLAUDE, FORMATS.KIRO, FORMATS.OPENAI_RESPONSES, FORMATS.OPENAI, FORMATS.OLLAMA];

  for (const format of RTK_FORMATS) {
    describe(`format=${format}`, () => {
      it("compresses large tool_result when enabled", () => {
        const body = buildBodyForFormat(format, { withToolResult: true });
        const before = JSON.stringify(body).length;
        const stats = compressMessages(body, true);
        expect(stats).not.toBeNull();
        expect(stats.hits.length).toBeGreaterThan(0);
        expect(JSON.stringify(body).length).toBeLessThan(before);
      });

      it("no-op when disabled (enabled=false)", () => {
        const body = buildBodyForFormat(format, { withToolResult: true });
        const before = JSON.stringify(body);
        expect(compressMessages(body, false)).toBeNull();
        expect(JSON.stringify(body)).toBe(before);
      });

      it("no tool_result → no hits, body unchanged", () => {
        const body = buildBodyForFormat(format, { withToolResult: false });
        const before = JSON.stringify(body);
        const stats = compressMessages(body, true);
        // either null (no items) or zero hits, but body content preserved
        if (stats) expect(stats.hits.length).toBe(0);
        expect(JSON.stringify(body)).toBe(before);
      });
    });
  }

  it("scenario: error tool_result is preserved (not compressed) — Claude", () => {
    const diff = bigDiff();
    const body = { messages: [{ role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: diff, is_error: true }] }] };
    const stats = compressMessages(body, true);
    expect(stats.hits.length).toBe(0);
    expect(body.messages[0].content[0].content).toBe(diff);
  });

  it("scenario: error tool_result is preserved — Kiro (status=error)", () => {
    const diff = bigDiff();
    const body = { conversationState: { currentMessage: { userInputMessage: { content: "x", userInputMessageContext: { toolResults: [{ toolUseId: "t1", status: "error", content: [{ text: diff }] }] } } }, history: [] } };
    compressMessages(body, true);
    expect(body.conversationState.currentMessage.userInputMessage.userInputMessageContext.toolResults[0].content[0].text).toBe(diff);
  });

  it("scenario: below MIN_COMPRESS_SIZE is left untouched", () => {
    const small = "diff --git a/x b/x\n@@ -1 +1 @@\n+a";
    const body = { messages: [{ role: "tool", tool_call_id: "t1", content: small }] };
    const stats = compressMessages(body, true);
    expect(stats.hits.length).toBe(0);
    expect(body.messages[0].content).toBe(small);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2 & 3. Caveman + Ponytail — system-prompt injection across ALL formats
// ─────────────────────────────────────────────────────────────────────────
const INJECTORS = [
  { name: "Caveman", fn: injectCaveman, prompts: CAVEMAN_PROMPTS, levels: ["lite", "full", "ultra"] },
  { name: "Ponytail", fn: injectPonytail, prompts: PONYTAIL_PROMPTS, levels: ["lite", "full", "ultra"] },
];

for (const { name, fn, prompts, levels } of INJECTORS) {
  describe(`${name} injection across all formats`, () => {
    for (const format of ALL_FORMATS) {
      for (const level of levels) {
        it(`format=${format} level=${level}`, () => {
          const body = buildBodyForFormat(format);
          fn(body, format, level);
          const sysText = readSystemText(body, format);
          if (NO_SYSTEM_SURFACE.has(format)) {
            // No system surface → prompt must NOT appear (silent no-op)
            expect(sysText).not.toContain(prompts[level]);
          } else {
            expect(sysText).toContain(prompts[level]);
          }
        });
      }
    }

    it(`no-op for unknown level`, () => {
      const body = buildBodyForFormat(FORMATS.OPENAI);
      const before = JSON.stringify(body);
      fn(body, FORMATS.OPENAI, "does-not-exist");
      expect(JSON.stringify(body)).toBe(before);
    });

    it(`no-op for null body`, () => {
      expect(() => fn(null, FORMATS.OPENAI, "full")).not.toThrow();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Combined scenario — RTK + Caveman + Ponytail all active, every format
// ─────────────────────────────────────────────────────────────────────────
describe("RTK + Caveman + Ponytail combined, every format", () => {
  for (const format of ALL_FORMATS) {
    it(`format=${format}: all three apply without corrupting the body`, () => {
      const body = buildBodyForFormat(format, { withToolResult: true });

      // 1. RTK (skipped cleanly for formats with no tool_result shape)
      compressMessages(body, true);
      // 2. Caveman
      injectCaveman(body, format, "full");
      // 3. Ponytail
      injectPonytail(body, format, "full");

      const sysText = readSystemText(body, format);
      if (NO_SYSTEM_SURFACE.has(format)) {
        expect(sysText).not.toContain(CAVEMAN_PROMPTS.full);
        expect(sysText).not.toContain(PONYTAIL_PROMPTS.full);
      } else {
        // both prompts present, original base preserved
        expect(sysText).toContain(CAVEMAN_PROMPTS.full);
        expect(sysText).toContain(PONYTAIL_PROMPTS.full);
      }
      // body still serializable (no circular / undefined corruption)
      expect(() => JSON.stringify(body)).not.toThrow();
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Disabled scenarios — when a tool's flag is off, nothing changes
// ─────────────────────────────────────────────────────────────────────────
describe("disabled-flag scenarios per format", () => {
  for (const format of ALL_FORMATS) {
    it(`format=${format}: RTK disabled leaves tool_result intact`, () => {
      const body = buildBodyForFormat(format, { withToolResult: true });
      const before = JSON.stringify(body);
      compressMessages(body, false);
      expect(JSON.stringify(body)).toBe(before);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 6. injectSystemPrompt contract — injection works per format (upstream refactor
//    removed the return value; verify by checking the marker appears in the body)
// ─────────────────────────────────────────────────────────────────────────
describe("injectSystemPrompt injection per format", () => {
  for (const format of ALL_FORMATS) {
    it(`format=${format}: ${NO_SYSTEM_SURFACE.has(format) ? "no-op" : "injects marker"}`, () => {
      const body = buildBodyForFormat(format);
      injectSystemPrompt(body, format, "MARKER-XYZ");
      const sysText = readSystemText(body, format);
      if (NO_SYSTEM_SURFACE.has(format)) {
        expect(sysText).not.toContain("MARKER-XYZ");
      } else {
        expect(sysText).toContain("MARKER-XYZ");
      }
    });
  }
});
