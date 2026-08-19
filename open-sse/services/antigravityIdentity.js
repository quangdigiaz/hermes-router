import crypto from "node:crypto";
import { machineIdSync } from "node-machine-id";

const FNV_OFFSET_I64 = -3750763034362895579n;
const FNV_PRIME_I64 = 1099511628211n;
const PROCESS_SESSION_ID = crypto.randomUUID();

let systemMachineIdSync = null;
try {
  systemMachineIdSync = machineIdSync;
} catch {
  systemMachineIdSync = null;
}

function toNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getProviderDataString(credentials, key) {
  const data = credentials?.providerSpecificData;
  return data && typeof data === "object" ? toNonEmptyString(data[key]) : null;
}

export function getAntigravityAccountKey(credentials) {
  return (
    toNonEmptyString(credentials?.email) ||
    getProviderDataString(credentials, "email") ||
    getProviderDataString(credentials, "accountId") ||
    toNonEmptyString(credentials?.connectionId) ||
    null
  );
}

export function isAntigravityEnterpriseAccount(credentials) {
  const email =
    toNonEmptyString(credentials?.email) || getProviderDataString(credentials, "email") || "";
  return !!email && !/@(?:gmail|googlemail)\.com$/i.test(email);
}

export function getAntigravityEnvelopeUserAgent(credentials) {
  return isAntigravityEnterpriseAccount(credentials) ? "jetski" : "antigravity";
}

export function generateAntigravityRequestId() {
  return `agent/${Date.now()}/${crypto.randomBytes(4).toString("hex")}`;
}

export function generateAntigravitySessionId() {
  const max = 18446744073709551615n; // 2^64 - 1
  const target = 9000000000000000000n;
  const limit = max - (max % target);
  let value;
  do {
    value = crypto.randomBytes(8).readBigUInt64BE();
  } while (value >= limit);
  return `-${(value % target).toString()}`;
}

export function deriveAntigravitySessionId(accountKey) {
  const key = toNonEmptyString(accountKey);
  if (!key) return null;

  let hash = FNV_OFFSET_I64;
  for (const byte of Buffer.from(key, "utf8")) {
    hash = BigInt.asIntN(64, hash ^ BigInt(byte));
    hash = BigInt.asIntN(64, hash * FNV_PRIME_I64);
  }
  return hash.toString();
}

export function getAntigravitySessionId(credentials, fallback) {
  return (
    deriveAntigravitySessionId(getAntigravityAccountKey(credentials)) ||
    toNonEmptyString(fallback) ||
    generateAntigravitySessionId()
  );
}

export function deriveAntigravityMachineId(_credentials) {
  try {
    const systemMachineId = toNonEmptyString(systemMachineIdSync?.(true));
    if (systemMachineId) return systemMachineId;
  } catch {
    // ignore
  }
  return null;
}

export function getAntigravityVscodeSessionId() {
  return PROCESS_SESSION_ID;
}
