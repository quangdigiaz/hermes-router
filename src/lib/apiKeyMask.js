/**
 * Helper to mask sensitive API keys for safe display
 * e.g. "sk-teamo-1234567890abcdef" -> "sk-teamo-...cdef"
 *      "AIzaSyD-1234567890" -> "AIzaSy...7890"
 */
export function maskApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== "string") return "";
  const str = apiKey.trim();
  if (str.length <= 8) return "••••••••";
  
  if (str.startsWith("sk-")) {
    const secondDash = str.indexOf("-", 3);
    if (secondDash !== -1 && secondDash + 4 < str.length) {
      const prefix = str.slice(0, secondDash + 1);
      const suffix = str.slice(-4);
      return `${prefix}...${suffix}`;
    }
    const prefix = str.slice(0, Math.min(7, str.length - 4));
    const suffix = str.slice(-4);
    return `${prefix}...${suffix}`;
  }

  const prefix = str.slice(0, Math.min(6, str.length - 4));
  const suffix = str.slice(-4);
  return `${prefix}...${suffix}`;
}
