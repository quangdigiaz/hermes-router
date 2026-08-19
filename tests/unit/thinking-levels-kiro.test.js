import { describe, expect, it } from "vitest";
import { applyKiroThinkingOverride, resolveKiroModelIntent } from "../../open-sse/config/kiroConstants.js";

describe("Kiro model(level) suffix", () => {
  it("strips suffix before synthetic Kiro variants", () => {
    expect(resolveKiroModelIntent("claude-opus-5(high)")).toMatchObject({
      model: "claude-opus-5",
      upstream: "claude-opus-5",
      thinking: false,
      thinkingOverride: { mode: "level", level: "high" },
    });
  });

  it("maps numeric suffix to enabled budget", () => {
    const intent = resolveKiroModelIntent("claude-opus-5(8192)");
    expect(applyKiroThinkingOverride({}, intent.thinkingOverride)).toEqual({
      thinking: { type: "enabled", budget_tokens: 8192 },
    });
  });
});
