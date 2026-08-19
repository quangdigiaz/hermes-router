/**
 * Antigravity project bootstrap — loadCodeAssist.
 *
 * The Google Cloud Code Assist API (/v1internal:models) requires a prior
 * /v1internal:loadCodeAssist call to assign a project context to the
 * OAuth token. Without this bootstrap, :models returns 404.
 */

import {
  getAntigravityHeaders,
  getAntigravityLoadCodeAssistMetadata,
} from "./antigravityHeaders.js";
import {
  getAntigravityBootstrapHeaders,
} from "./antigravityClientProfile.js";
import { ANTIGRAVITY_BASE_URLS } from "../config/antigravityUpstream.js";

const LOAD_CODE_ASSIST_PATH = "/v1internal:loadCodeAssist";
const BOOTSTRAP_TIMEOUT_MS = 8000;

export function getAntigravityLoadCodeAssistUrls() {
  return ANTIGRAVITY_BASE_URLS.map((base) => `${base}${LOAD_CODE_ASSIST_PATH}`);
}

const projectCache = new Map();

function getProjectCacheKey(accessToken, clientProfile) {
  return `${clientProfile}:${accessToken}`;
}

async function tryLoadCodeAssist(accessToken, fetchImpl, clientProfile) {
  const urls = getAntigravityLoadCodeAssistUrls();
  const headers =
    clientProfile === "harness"
      ? getAntigravityBootstrapHeaders(clientProfile, accessToken)
      : getAntigravityHeaders("loadCodeAssist", accessToken);

  for (const url of urls) {
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ metadata: getAntigravityLoadCodeAssistMetadata() }),
        signal: AbortSignal.timeout(BOOTSTRAP_TIMEOUT_MS),
      });

      if (!response.ok) {
        console.warn(
          `[models] antigravity loadCodeAssist failed at ${url} (${response.status}) — trying next`
        );
        continue;
      }

      const data = await response.json();
      const raw = data.cloudaicompanionProject;
      let projectId =
        typeof raw === "string"
          ? raw.trim()
          : raw && typeof raw === "object" && typeof raw.id === "string"
            ? raw.id.trim()
            : "";

      if (projectId) {
        return projectId;
      }

      console.warn(
        `[models] antigravity loadCodeAssist at ${url} returned no project id — trying next`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[models] antigravity loadCodeAssist threw for ${url}: ${msg} — trying next`);
    }
  }
  return null;
}

export async function ensureAntigravityProjectAssigned(
  accessToken,
  fetchImpl = fetch,
  clientProfile = "ide"
) {
  const cacheKey = getProjectCacheKey(accessToken, clientProfile);
  if (projectCache.has(cacheKey)) {
    return projectCache.get(cacheKey);
  }

  const projectId = await tryLoadCodeAssist(accessToken, fetchImpl, clientProfile);

  if (projectId) {
    projectCache.set(cacheKey, projectId);
    return projectId;
  }
  return undefined;
}

export function clearAntigravityProjectCache() {
  projectCache.clear();
}

export function getAntigravityProjectFromCache(accessToken, clientProfile = "ide") {
  return projectCache.get(getProjectCacheKey(accessToken, clientProfile));
}
