/**
 * Ported from OrcaRouter-Lite app/auto_routing.py:canonical_model_base
 * Strip known version suffix to get canonical base id.
 * Used to dedup sibling versions in auto fallback list.
 */

const VERSION_SUFFIX_RE = new RegExp(
  [
    "\\d{4}-\\d{2}-\\d{2}", // YYYY-MM-DD
    "\\d{6,}",               // YYYYMMDD compact
    "\\d{3,4}",              // 001, 002 revision codes (3+ digits)
    "v\\d[\\d.]*",           // v1, v1.5
  ].join("|")
);

export function canonicalModelBase(modelId) {
  if (typeof modelId !== "string" || !modelId) return modelId;
  const parts = modelId.split("-");
  // Try longest suffix first (up to 3 segments) so YYYY-MM-DD beats single digit
  for (let cut = 3; cut >= 1; cut--) {
    if (parts.length <= cut) continue;
    const suffix = parts.slice(-cut).join("-");
    const base = parts.slice(0, -cut).join("-");
    if (!base) continue;
    // Check if suffix matches version pattern fully
    if (new RegExp(`^(${VERSION_SUFFIX_RE.source})$`).test(suffix)) {
      // Single digit suffix is semantic version in Anthropic (e.g. claude-opus-4-7) — don't strip
      if (cut === 1 && /^\d$/.test(suffix)) continue;
      return base;
    }
    // For multi-segment, test joined suffix
    if (cut > 1 && VERSION_SUFFIX_RE.test(suffix)) {
      // Ensure suffix is version-like, not model name
      const suffixParts = suffix.split("-");
      const allVersion = suffixParts.every((p) => VERSION_SUFFIX_RE.test(p) || /^\d+$/.test(p));
      if (allVersion && suffixParts.some((p) => /^\d{4}|\d{3,}|v\d/i.test(p))) {
        return base;
      }
    }
  }
  // Single suffix check (fallback)
  const last = parts[parts.length - 1];
  if (VERSION_SUFFIX_RE.test(last) && !/^\d$/.test(last)) {
    // e.g. gemini-2.0-flash-lite-001 -> gemini-2.0-flash-lite
    if (/^\d{3,}$|^v\d/i.test(last) || /^\d{4}-\d{2}-\d{2}$/.test(last)) {
      return parts.slice(0, -1).join("-");
    }
  }
  return modelId;
}
