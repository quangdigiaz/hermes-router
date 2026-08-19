import { isCreditsDisabled, recordCreditsFailure } from "./antigravity429Engine.js";

/**
 * Google One AI credits injection for Antigravity.
 *
 * When Antigravity returns a quota_exhausted 429, CLIProxyAPI retries the
 * request with `enabledCreditTypes: ["GOOGLE_ONE_AI"]` injected into the
 * body. This uses the user's Google One AI credit balance for the retry.
 */

export function injectCreditsField(body) {
  return {
    ...body,
    enabledCreditTypes: ["GOOGLE_ONE_AI"],
  };
}

export function shouldRetryWithCredits(authKey, creditsEnabled) {
  if (!creditsEnabled) return false;
  if (isCreditsDisabled(authKey)) return false;
  return true;
}

export function handleCreditsFailure(authKey) {
  return recordCreditsFailure(authKey);
}

export function getCreditsMode() {
  const raw = (process.env.ANTIGRAVITY_CREDITS || "").trim().toLowerCase();
  if (raw === "always" || raw === "retry") return raw;
  return "off";
}

export function shouldUseCreditsFirst(authKey, creditsMode) {
  if (creditsMode !== "always") return false;
  if (isCreditsDisabled(authKey)) return false;
  return true;
}
