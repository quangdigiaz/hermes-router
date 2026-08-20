import { describe, it, expect } from "vitest";
import { stripCompetitivePrompts, COMPETITIVE_PROMPT_BLACKLIST, stripPhrases } from "../../open-sse/utils/stripCompetitivePrompts.js";

describe("stripCompetitivePrompts", () => {
  describe("stripPhrases", () => {
    it("strips full phrase with period", () => {
      const text = "You are a Claude agent, built on Anthropic's Claude Agent SDK. Be helpful.";
      const result = stripPhrases(text);
      expect(result).toBe("Be helpful.");
    });

    it("strips phrase without period", () => {
      const text = "You are a Claude agent, built on Anthropic's Claude Agent SDK\nBe helpful.";
      const result = stripPhrases(text);
      expect(result).toBe("Be helpful.");
    });

    it("strips standalone phrase", () => {
      const text = "Anthropic's Claude Agent SDK is the framework.";
      const result = stripPhrases(text);
      expect(result).toBe("is the framework.");
    });

    it("returns null/undefined as-is", () => {
      expect(stripPhrases(null)).toBeNull();
      expect(stripPhrases(undefined)).toBeUndefined();
    });

    it("returns non-string as-is", () => {
      expect(stripPhrases(123)).toBe(123);
    });

    it("returns unchanged text when no match", () => {
      const text = "This is a normal system prompt.";
      const result = stripPhrases(text);
      expect(result).toBe(text);
    });
  });

  describe("stripCompetitivePrompts - system instruction", () => {
    it("strips from system instruction parts", () => {
      const body = {
        systemInstruction: {
          parts: [
            { text: "You are a Claude agent, built on Anthropic's Claude Agent SDK. Be helpful." },
          ],
        },
        contents: [],
      };
      const result = stripCompetitivePrompts(body);
      expect(result.systemInstruction.parts[0].text).toBe("Be helpful.");
    });

    it("preserves reference when no changes", () => {
      const body = {
        systemInstruction: {
          parts: [{ text: "Normal system prompt." }],
        },
      };
      const result = stripCompetitivePrompts(body);
      expect(result).toBe(body); // same reference
    });

    it("handles null system instruction", () => {
      const body = {
        systemInstruction: null,
        contents: [],
      };
      const result = stripCompetitivePrompts(body);
      expect(result).toBe(body); // no change
    });
  });

  describe("stripCompetitivePrompts - contents", () => {
    it("strips from message contents", () => {
      const body = {
        contents: [
          {
            role: "user",
            parts: [
              { text: "Hello with Anthropic's Claude Agent SDK in it." },
            ],
          },
        ],
      };
      const result = stripCompetitivePrompts(body);
      expect(result.contents[0].parts[0].text).toBe("Hello with in it.");
    });

    it("preserves reference when no changes in contents", () => {
      const body = {
        contents: [
          { role: "user", parts: [{ text: "Normal message." }] },
        ],
      };
      const result = stripCompetitivePrompts(body);
      expect(result).toBe(body);
    });
  });

  describe("stripCompetitivePrompts - combined", () => {
    it("strips from both system instruction and contents", () => {
      const body = {
        systemInstruction: {
          parts: [
            { text: "You are a Claude agent, built on Anthropic's Claude Agent SDK." },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: "Using Anthropic's Claude Agent SDK for this task." },
            ],
          },
        ],
      };
      const result = stripCompetitivePrompts(body);
      expect(result.systemInstruction.parts[0].text).toBe("");
      expect(result.contents[0].parts[0].text).toBe("Using for this task.");
    });

    it("returns same body when nothing to strip", () => {
      const body = {
        systemInstruction: { parts: [{ text: "Normal system." }] },
        contents: [{ role: "user", parts: [{ text: "Normal message." }] }],
      };
      const result = stripCompetitivePrompts(body);
      expect(result).toBe(body);
    });

    it("handles null/undefined body", () => {
      expect(stripCompetitivePrompts(null)).toBeNull();
      expect(stripCompetitivePrompts(undefined)).toBeUndefined();
    });

    it("handles empty body", () => {
      const body = {};
      const result = stripCompetitivePrompts(body);
      expect(result).toBe(body);
    });
  });

  describe("COMPETITIVE_PROMPT_BLACKLIST", () => {
    it("contains expected phrases", () => {
      expect(COMPETITIVE_PROMPT_BLACKLIST).toContain("Anthropic's Claude Agent SDK");
      expect(COMPETITIVE_PROMPT_BLACKLIST).toContain(
        "You are a Claude agent, built on Anthropic's Claude Agent SDK."
      );
      expect(COMPETITIVE_PROMPT_BLACKLIST).toContain(
        "You are a Claude agent, built on Anthropic's Claude Agent SDK"
      );
    });
  });
});
