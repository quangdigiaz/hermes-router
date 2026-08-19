import { describe, expect, it } from "vitest";
import { CLAUDE_BLOCK } from "../../open-sse/translator/schema/index.js";
import { hasValidContent } from "../../open-sse/translator/formats/claude.js";

describe("Claude content validation", () => {
  it.each([CLAUDE_BLOCK.IMAGE, CLAUDE_BLOCK.DOCUMENT])("keeps %s-only messages", (type) => {
    expect(hasValidContent({ content: [{ type }] })).toBe(true);
  });
});
