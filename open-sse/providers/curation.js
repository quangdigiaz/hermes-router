/**
 * Provider Curation Config — centralized tier/badges/priority mapping.
 *
 * curatedTier values: "official" | "bridge" | "free" | "community" | "experimental"
 * badges: "recommended" | "new" | "popular" | "free" | "deprecated" | "fast" | "local"
 * curatedPriority: higher = shown first within its tier
 *
 * Providers not listed here default to:
 *   curatedTier: "community"
 *   curatedPriority: 0
 *   badges: []
 */

export const CURATION_DATA = {
  // Official (first-party)
  openai:     { curatedTier: "official", curatedPriority: 100, badges: ["recommended", "popular"] },
  anthropic:  { curatedTier: "official", curatedPriority: 100, badges: ["recommended", "popular"] },
  gemini:     { curatedTier: "official", curatedPriority: 95,  badges: ["recommended", "free"] },
  xai:        { curatedTier: "official", curatedPriority: 90,  badges: ["recommended"] },
  deepseek:   { curatedTier: "official", curatedPriority: 90,  badges: ["recommended", "popular", "cheap"] },
  mistral:    { curatedTier: "official", curatedPriority: 85,  badges: ["recommended"] },
  cohere:     { curatedTier: "official", curatedPriority: 80,  badges: ["recommended"] },
  qwen:       { curatedTier: "official", curatedPriority: 80,  badges: ["recommended"] },
  nvidia:     { curatedTier: "official", curatedPriority: 75,  badges: ["free", "popular"] },

  // Bridge (OAuth / subscription)
  claude:       { curatedTier: "bridge", curatedPriority: 100, badges: ["deprecated"] },
  cursor:       { curatedTier: "bridge", curatedPriority: 95,  badges: ["popular"] },
  kiro:         { curatedTier: "bridge", curatedPriority: 90,  badges: ["deprecated"] },
  github:       { curatedTier: "bridge", curatedPriority: 90,  badges: ["deprecated"] },
  "gemini-cli": { curatedTier: "bridge", curatedPriority: 85,  badges: ["deprecated"] },
  "grok-cli":   { curatedTier: "bridge", curatedPriority: 85,  badges: ["new"] },
  cline:        { curatedTier: "bridge", curatedPriority: 80,  badges: ["popular"] },
  clinepass:    { curatedTier: "bridge", curatedPriority: 75,  badges: [] },
  freebuff:     { curatedTier: "bridge", curatedPriority: 70,  badges: ["free"] },

  // Free tier / no-auth / budget
  ollama:          { curatedTier: "free", curatedPriority: 95,  badges: ["free", "local"] },
  groq:            { curatedTier: "free", curatedPriority: 90,  badges: ["free", "fast", "popular"] },
  openrouter:      { curatedTier: "free", curatedPriority: 90,  badges: ["free", "popular"] },
  "cloudflare-ai": { curatedTier: "free", curatedPriority: 85,  badges: ["free"] },
  sambanova:       { curatedTier: "free", curatedPriority: 80,  badges: ["free"] },
  deepinfra:       { curatedTier: "free", curatedPriority: 75,  badges: ["free", "cheap"] },
  zenmux:          { curatedTier: "free", curatedPriority: 75,  badges: ["free", "popular", "cheap"] },
  bai:             { curatedTier: "free", curatedPriority: 75,  badges: ["free", "popular", "cheap"] },
  siliconflow:     { curatedTier: "free", curatedPriority: 75,  badges: ["free", "popular", "cheap"] },
  llm7:            { curatedTier: "free", curatedPriority: 85,  badges: ["free", "cheap", "popular"] },
  teamorouter:     { curatedTier: "free", curatedPriority: 85,  badges: ["free", "cheap", "popular"] },
  teamo:           { curatedTier: "free", curatedPriority: 85,  badges: ["free", "cheap", "popular"] },

  // Experimental
  antigravity:      { curatedTier: "experimental", curatedPriority: 50, badges: ["new"] },
  "muse-spark-web": { curatedTier: "experimental", curatedPriority: 40, badges: [] },
};

/**
 * Get curation data for a provider, with sensible defaults.
 * @param {string} providerId
 * @returns {{ curatedTier: string, curatedPriority: number, badges: string[] }}
 */
export function getCurationData(providerId) {
  return CURATION_DATA[providerId] || {
    curatedTier: "community",
    curatedPriority: 0,
    badges: [],
  };
}
