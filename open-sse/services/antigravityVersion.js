/**
 * Antigravity version auto-resolver.
 *
 * Keeps the client version up to date by scraping official release feeds
 * or fallback GitHub API endpoint periodically.
 */

const ANTIGRAVITY_RELEASE_FEED_URL =
  "https://antigravity-auto-updater-974169037036.us-central1.run.app/releases";
const ANTIGRAVITY_GITHUB_RELEASE_URL =
  "https://api.github.com/repos/antigravityide/antigravity/releases/latest";

export const ANTIGRAVITY_VERSION_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const ANTIGRAVITY_VERSION_FETCH_TIMEOUT_MS = 5000;
export const ANTIGRAVITY_FALLBACK_VERSION = "4.2.0";

let versionCache = null;
let inFlightRequest = null;

function normalizeVersion(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^v/i, "");
  const match = trimmed.match(/^(\d+\.\d+\.\d+)\b/);
  return match ? match[1] : null;
}

function compareSemver(a, b) {
  const aParts = a.split(".").map((part) => parseInt(part, 10) || 0);
  const bParts = b.split(".").map((part) => parseInt(part, 10) || 0);
  for (let i = 0; i < 3; i += 1) {
    if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
  }
  return 0;
}

function pickNewestVersion(...versions) {
  return versions
    .map((version) => normalizeVersion(version))
    .filter((version) => !!version)
    .reduce(
      (best, version) => (compareSemver(version, best) > 0 ? version : best),
      ANTIGRAVITY_FALLBACK_VERSION
    );
}

async function fetchJsonWithTimeout(fetchImpl, url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANTIGRAVITY_VERSION_FETCH_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "hermes-router-AntigravityVersion/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Version source ${url} returned ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseOfficialReleaseFeed(payload) {
  if (!Array.isArray(payload)) return null;
  for (const entry of payload) {
    const version = normalizeVersion(entry?.version);
    if (version) return version;
  }
  return null;
}

function parseGitHubRelease(payload) {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload.tag_name ?? payload.name;
  return normalizeVersion(candidate);
}

async function fetchLatestAntigravityVersion(fetchImpl) {
  const sources = [
    {
      parse: parseOfficialReleaseFeed,
      url: ANTIGRAVITY_RELEASE_FEED_URL,
    },
    {
      parse: parseGitHubRelease,
      url: ANTIGRAVITY_GITHUB_RELEASE_URL,
    },
  ];

  for (const source of sources) {
    try {
      const payload = await fetchJsonWithTimeout(fetchImpl, source.url);
      const version = source.parse(payload);
      if (version) return version;
    } catch {
      // Try next
    }
  }
  return null;
}

export async function resolveAntigravityVersion(fetchImpl = fetch) {
  const now = Date.now();
  if (versionCache && now - versionCache.fetchedAt < ANTIGRAVITY_VERSION_CACHE_TTL_MS) {
    return versionCache.version;
  }

  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    const resolved = await fetchLatestAntigravityVersion(fetchImpl);
    const version = resolved
      ? pickNewestVersion(resolved, ANTIGRAVITY_FALLBACK_VERSION)
      : pickNewestVersion(versionCache?.version, ANTIGRAVITY_FALLBACK_VERSION);

    if (resolved) {
      versionCache = {
        fetchedAt: Date.now(),
        version,
      };
    }
    return version;
  })();

  try {
    return await inFlightRequest;
  } finally {
    inFlightRequest = null;
  }
}

export function getCachedAntigravityVersion() {
  return versionCache?.version || ANTIGRAVITY_FALLBACK_VERSION;
}

export function seedAntigravityVersionCache(version, fetchedAt = Date.now()) {
  versionCache = {
    fetchedAt,
    version,
  };
}

export function clearAntigravityVersionCache() {
  versionCache = null;
  inFlightRequest = null;
}
