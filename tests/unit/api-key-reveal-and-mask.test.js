import { describe, it, expect } from "vitest";
import { maskApiKey } from "../../src/lib/apiKeyMask.js";

describe("maskApiKey", () => {
  it("returns empty string for empty input", () => {
    expect(maskApiKey("")).toBe("");
    expect(maskApiKey(null)).toBe("");
    expect(maskApiKey(undefined)).toBe("");
  });

  it("returns placeholder for short keys (<=8 chars)", () => {
    expect(maskApiKey("12345")).toBe("••••••••");
    expect(maskApiKey("12345678")).toBe("••••••••");
  });

  it("masks standard OpenAI/TeamoRouter sk- keys", () => {
    const masked1 = maskApiKey("sk-teamo-1234567890abcdef");
    expect(masked1).toMatch(/^sk-teamo-...\w{4}$/);
    expect(masked1.endsWith("cdef")).toBe(true);

    const masked2 = maskApiKey("sk-proj-abcde12345uvwxyz");
    expect(masked2).toMatch(/^sk-proj-...\w{4}$/);
    expect(masked2.endsWith("wxyz")).toBe(true);
  });

  it("masks Google/Anthropic/generic keys", () => {
    const masked = maskApiKey("AIzaSyD1234567890abcdef");
    expect(masked).toBe("AIzaSy...cdef");
  });
});
