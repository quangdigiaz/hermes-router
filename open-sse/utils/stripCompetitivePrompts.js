/**
 * Strip competitive prompt phrases that cause Antigravity to reject requests
 * with synthetic 429 errors.
 *
 * When Claude Code tool calls are forwarded through Antigravity, the system
 * prompt often contains "Anthropic's Claude Agent SDK" — Antigravity detects
 * this as competitor identity and returns a fake 429 to block the request.
 *
 * Ported from 9router-go's StripCompetitivePrompts.
 *
 * @module open-sse/utils/stripCompetitivePrompts
 */

/**
 * Competitive prompt phrases that cause Antigravity to reject requests with 429.
 * Checked as substring match (case-insensitive) against system instruction and
 * message content text.
 */
const COMPETITIVE_PROMPT_BLACKLIST = [
  "You are a Claude agent, built on Anthropic's Claude Agent SDK.",
  "You are a Claude agent, built on Anthropic's Claude Agent SDK",
  "Anthropic's Claude Agent SDK",
];

/**
 * Strip all blacklisted phrases from a text string.
 * @param {string} text
 * @returns {string}
 */
function stripPhrases(text) {
  if (!text || typeof text !== "string") return text;
  let result = text;
  for (const phrase of COMPETITIVE_PROMPT_BLACKLIST) {
    if (result.includes(phrase)) {
      result = result.replaceAll(phrase, "");
    }
  }
  // Normalize whitespace: collapse multiple spaces into one, trim
  return result.replace(/\s+/g, " ").trim();
}

/**
 * Strip competitive prompt phrases from system instruction parts.
 * @param {object} systemInstruction - Gemini-format system instruction
 * @returns {object} Cleaned system instruction
 */
function stripFromSystemInstruction(systemInstruction) {
  if (!systemInstruction?.parts?.length) return systemInstruction;

  const cleanedParts = systemInstruction.parts.map((part) => {
    if (!part.text) return part;
    const cleaned = stripPhrases(part.text);
    if (cleaned === part.text) return part; // no change → preserve reference
    return { ...part, text: cleaned };
  });

  // Only return new object if something changed
  const changed = cleanedParts.some((p, i) => p !== systemInstruction.parts[i]);
  return changed ? { ...systemInstruction, parts: cleanedParts } : systemInstruction;
}

/**
 * Strip competitive prompt phrases from message contents.
 * @param {Array} contents - Gemini-format contents array
 * @returns {Array} Cleaned contents
 */
function stripFromContents(contents) {
  if (!Array.isArray(contents)) return contents;

  const cleanedContents = contents.map((content) => {
    if (!content.parts?.length) return content;

    const cleanedParts = content.parts.map((part) => {
      if (!part.text) return part;
      const cleaned = stripPhrases(part.text);
      if (cleaned === part.text) return part; // no change → preserve reference
      return { ...part, text: cleaned };
    });

    const changed = cleanedParts.some((p, i) => p !== content.parts[i]);
    return changed ? { ...content, parts: cleanedParts } : content;
  });

  const changed = cleanedContents.some((c, i) => c !== contents[i]);
  return changed ? cleanedContents : contents;
}

/**
 * Strip competitive prompt phrases from an Antigravity/Gemini request body.
 * Removes "Anthropic's Claude Agent SDK" and similar competitor identity
 * strings from system instruction and message contents.
 *
 * @param {object} body - Gemini-format request body with systemInstruction and/or contents
 * @returns {object} Cleaned request body (new object if changes were made)
 */
export function stripCompetitivePrompts(body) {
  if (!body || typeof body !== "object") return body;

  const cleanedSystem = stripFromSystemInstruction(body.systemInstruction);
  const cleanedContents = stripFromContents(body.contents);

  const systemChanged = cleanedSystem !== body.systemInstruction;
  const contentsChanged = cleanedContents !== body.contents;

  if (!systemChanged && !contentsChanged) return body; // no change → preserve reference

  return {
    ...body,
    ...(systemChanged && { systemInstruction: cleanedSystem }),
    ...(contentsChanged && { contents: cleanedContents }),
  };
}

// Export for testing
export { COMPETITIVE_PROMPT_BLACKLIST, stripPhrases };
