import {
  deriveAntigravityMachineId,
  getAntigravityVscodeSessionId,
} from "./antigravityIdentity.js";
import {
  antigravityUserAgent,
  ANTIGRAVITY_CREDIT_PROBE_API_CLIENT,
  ANTIGRAVITY_NODE_API_CLIENT,
  getAntigravityLoadCodeAssistMetadata,
} from "./antigravityHeaders.js";
import { getCachedAntigravityVersion } from "./antigravityVersion.js";

export const DEFAULT_ANTIGRAVITY_CLIENT_PROFILE = "ide";
export const ANTIGRAVITY_CLIENT_PROFILE_VALUES = ["ide", "harness"];

export function normalizeAntigravityClientProfile(profile) {
  if (typeof profile === "string") {
    const lower = profile.toLowerCase();
    if (ANTIGRAVITY_CLIENT_PROFILE_VALUES.includes(lower)) {
      return lower;
    }
  }
  return DEFAULT_ANTIGRAVITY_CLIENT_PROFILE;
}

export function getAntigravityClientProfile(credentials) {
  const fromProviderData =
    credentials?.providerSpecificData &&
    typeof credentials.providerSpecificData === "object" &&
    !Array.isArray(credentials.providerSpecificData)
      ? credentials.providerSpecificData.clientProfile
      : undefined;

  return normalizeAntigravityClientProfile(fromProviderData);
}

function normalizeHarnessPlatform(platform = process.platform) {
  return platform === "win32" ? "windows" : platform || "unknown";
}

function normalizeHarnessArch(arch = process.arch) {
  switch (arch) {
    case "x64":
      return "amd64";
    case "ia32":
      return "386";
    default:
      return arch || "unknown";
  }
}

function getHarnessPlatformArch(platform = process.platform, arch = process.arch) {
  return `${normalizeHarnessPlatform(platform)}/${normalizeHarnessArch(arch)}`;
}

export function antigravityHarnessUserAgent(
  version = getCachedAntigravityVersion(),
  platform = process.platform,
  arch = process.arch
) {
  return `antigravity/${version} ${getHarnessPlatformArch(platform, arch)}`;
}

export function antigravityHarnessLoadCodeAssistUserAgent(version = getCachedAntigravityVersion()) {
  return `${antigravityHarnessUserAgent(version)} ${ANTIGRAVITY_NODE_API_CLIENT}`;
}

export function antigravityHarnessApiClientHeader() {
  return ANTIGRAVITY_CREDIT_PROBE_API_CLIENT;
}

export function removeHeaderCaseInsensitive(headers, name) {
  const lowerName = name.toLowerCase();
  for (const key of Object.keys(headers || {})) {
    if (key.toLowerCase() === lowerName) {
      delete headers[key];
    }
  }
}

function getProjectHeaderValue(body) {
  const project = body && typeof body === "object" ? body.project : null;
  if (typeof project !== "string" || project.trim().length === 0) return null;
  if (project === "test-project" || project === "project-id") return null;
  return project;
}

/** Headers used by OAuth/bootstrap calls (loadCodeAssist, token refresh). */
export function getAntigravityBootstrapHeaders(profile, accessToken) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (profile === "harness") {
    headers["User-Agent"] = antigravityHarnessLoadCodeAssistUserAgent();
    headers["X-Goog-Api-Client"] = antigravityHarnessApiClientHeader();
    return headers;
  }

  headers["User-Agent"] = antigravityUserAgent();
  headers["Client-Metadata"] = JSON.stringify(getAntigravityLoadCodeAssistMetadata());
  return headers;
}

/** Apply per-connection client identity to outbound Cloud Code content requests. */
export function applyAntigravityClientProfileHeaders(headers, credentials, body) {
  const profile = getAntigravityClientProfile(credentials);
  const version = getCachedAntigravityVersion();

  if (profile === "harness") {
    headers["User-Agent"] = antigravityHarnessUserAgent(version);
    removeHeaderCaseInsensitive(headers, "X-Goog-Api-Client");
    removeHeaderCaseInsensitive(headers, "x-client-name");
    removeHeaderCaseInsensitive(headers, "x-client-version");
    removeHeaderCaseInsensitive(headers, "x-machine-id");
    removeHeaderCaseInsensitive(headers, "x-vscode-sessionid");
    removeHeaderCaseInsensitive(headers, "Client-Metadata");
  } else {
    headers["User-Agent"] = antigravityUserAgent();
    headers["x-client-name"] = "antigravity";
    headers["x-client-version"] = version;
    const machineId = deriveAntigravityMachineId(credentials);
    if (machineId) {
      headers["x-machine-id"] = machineId;
    } else {
      removeHeaderCaseInsensitive(headers, "x-machine-id");
    }
    headers["x-vscode-sessionid"] = getAntigravityVscodeSessionId();
    removeHeaderCaseInsensitive(headers, "X-Goog-Api-Client");
    removeHeaderCaseInsensitive(headers, "Client-Metadata");
  }

  const project = getProjectHeaderValue(body);
  if (project) {
    headers["x-goog-user-project"] = project;
  } else {
    removeHeaderCaseInsensitive(headers, "x-goog-user-project");
  }

  return profile;
}
