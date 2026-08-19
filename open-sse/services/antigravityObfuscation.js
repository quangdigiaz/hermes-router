/**
 * Antigravity sensitive-word obfuscation (ZWJ cloak).
 *
 * Inserts zero-width joiners into known client-tool names so upstream
 * log scraping can't grep for them. Mirrors OmniRoute's ZEROGRAVITY
 * sensitive-word list and CLIProxyAPI cloak system.
 */

const ZWJ = "\u200d";

const DEFAULT_WORDS = [
  "opencode",
  "open-code",
  "cline",
  "roo-cline",
  "roo_cline",
  "cursor",
  "windsurf",
  "aider",
  "continue.dev",
  "copilot",
  "avante",
  "codecompanion",
  "claude code",
  "claude-code",
  "kilo code",
  "kilocode",
  "omniroute",
  "hermes-router",
  "hermes-router",
];

let words = [...DEFAULT_WORDS];

export function setAntigravitySensitiveWords(w) {
  words = Array.isArray(w) && w.length > 0 ? w : [...DEFAULT_WORDS];
}

export function getAntigravitySensitiveWords() {
  return [...words];
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const _obfuscationRegexCache = new Map();
function getObfuscationRegex(word) {
  let regex = _obfuscationRegexCache.get(word);
  if (!regex) {
    if (_obfuscationRegexCache.size > 2000) _obfuscationRegexCache.clear();
    regex = new RegExp(escapeRegex(word), "gi");
    _obfuscationRegexCache.set(word, regex);
  }
  return regex;
}

export function obfuscateSensitiveWords(text) {
  if (!text || typeof text !== "string" || words.length === 0) return text;
  let result = text;
  for (const word of words) {
    if (!word) continue;
    const regex = getObfuscationRegex(word);
    result = result.replace(regex, (m) => (m.length <= 1 ? m : m[0] + ZWJ + m.slice(1)));
  }
  return result;
}

export function obfuscateJson(value) {
  if (typeof value === "string") return obfuscateSensitiveWords(value);
  if (Array.isArray(value)) return value.map(obfuscateJson);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = obfuscateJson(v);
    }
    return out;
  }
  return value;
}
