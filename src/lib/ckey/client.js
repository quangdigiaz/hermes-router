/**
 * CKEY API Client — https://ckey.vn/docs
 * Base: https://ckey.vn | LLM Inference: https://api.xah.io/v1
 * Auth: Docs API via ?key=<CKEY_API_KEY>, Proxy xoay via ?keyproxy=<KEY>
 */

const CKEY_BASE = "https://ckey.vn";
const CKEY_LLM_BASE = "https://api.xah.io/v1";
export const CKEY_REF_LINK = "https://ckey.vn/register?ref=ckeyA8497D";

function buildUrl(path, params = {}) {
  const url = new URL(`${CKEY_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function ckeyFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { Accept: "application/json", ...(opts.headers || {}) },
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json, text, headers: res.headers };
}

// ── Tài khoản ──────────────────────────────────────────────
export async function getProfile(ckeyKey) {
  if (!ckeyKey) throw new Error("CKEY_API_KEY required");
  return ckeyFetch(buildUrl("/api/profile", { key: ckeyKey }));
}

// ── Nạp tiền ───────────────────────────────────────────────
export async function getDepositInfo(ckeyKey, amount) {
  return ckeyFetch(buildUrl("/api/deposit-info", { key: ckeyKey, amount }));
}

export async function getDepositHistory(ckeyKey, page = 1, limit = 20) {
  return ckeyFetch(buildUrl("/api/deposit-history", { key: ckeyKey, page, limit }));
}

// ── Proxy xoay ─────────────────────────────────────────────
const TINH_THANH_CODES = {
  0: "Random", 1: "Phú Thọ", 2: "Tuyên Quang", 3: "Hà Nội", 4: "Hải Dương", 5: "Bắc Giang",
  6: "HCM", 7: "Tây Ninh", 8: "Đồng Nai", 9: "Vũng Tàu", 10: "Bình Dương",
  11: "Nghệ An", 12: "Hà Tĩnh", 13: "Quảng Bình", 14: "Quảng Trị", 15: "Huế",
  16: "Đà Nẵng", 17: "Vĩnh Phúc", 18: "Yên Bái", 19: "Lào Cai", 20: "Lạng Sơn",
  21: "Thái Nguyên", 22: "Hà Nam", 23: "Nam Định", 24: "Thái Bình", 25: "Hải Phòng",
  26: "Quảng Ninh", 27: "Cà Mau", 28: "Kiên Giang", 29: "Bắc Liêu", 30: "Sóc Trăng", 31: "Hậu Giang",
};
export { TINH_THANH_CODES };

/**
 * Lấy proxy xoay — GET /api/getproxyxoay?keyproxy=...&nhamang=...&tinhthanh=...&whitelist=...
 * Response: {status:100, proxyhttp:"IP:PORT:user:pass", proxysocks5:"..."}
 * Cần parse sang http://user:pass@IP:PORT
 */
export async function getProxyXoay({ keyproxy, nhamang = "random", tinhthanh = 0, whitelist = "" }) {
  if (!keyproxy) throw new Error("keyproxy required");
  const res = await ckeyFetch(buildUrl("/api/getproxyxoay", { keyproxy, nhamang, tinhthanh, whitelist }));
  if (!res.ok || !res.json) return res;
  // Normalize proxyhttp -> URL
  const data = res.json;
  if (data?.status === 100 && (data?.proxyhttp || data?.proxysocks5)) {
    const raw = String(data.proxyhttp || data.proxysocks5).trim();
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("socks5://")) {
      data.proxyUrl = raw;
      try {
        const u = new URL(raw);
        data.parsed = { ip: u.hostname, port: u.port, user: u.username, pass: u.password };
      } catch { data.parsed = { ip: raw, port: "" }; }
    } else {
      const parts = raw.split(":");
      if (parts.length === 4) {
        const [ip, port, user, pass] = parts;
        data.proxyUrl = `http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${ip}:${port}`;
        data.parsed = { ip, port, user, pass };
      } else if (parts.length === 2) {
        const [ip, port] = parts;
        data.proxyUrl = `http://${ip}:${port}`;
        data.parsed = { ip, port, user: "", pass: "" };
      } else {
        data.proxyUrl = `http://${raw}`;
        data.parsed = { ip: raw, port: "" };
      }
    }
  }
  return res;
}

export async function muaProxyXoay(ckeyKey, { soluong = 1, ngaymua = "monthly" }) {
  return ckeyFetch(buildUrl("/api/muaproxyxoay", { key: ckeyKey, soluong, ngaymua }));
}

export async function renewProxyXoay(ckeyKey, { keyproxy, period = "monthly" }) {
  return ckeyFetch(buildUrl("/api/renewproxyxoay", { key: ckeyKey, keyproxy, period }));
}

// ── LLM ────────────────────────────────────────────────────
export async function getLlmModels(ckeyKey) {
  return ckeyFetch(buildUrl("/api/llm/models", { key: ckeyKey }));
}

export async function getLlmUsage(ckeyKey, { page = 1, limit = 20, model, key_id, ai_key } = {}) {
  return ckeyFetch(buildUrl("/api/llm/usage", { key: ckeyKey, page, limit, model, key_id, ai_key }));
}

export async function getLlmUsageStats(ckeyKey, { since = 0, key_id, ai_key } = {}) {
  return ckeyFetch(buildUrl("/api/llm/usage-stats", { key: ckeyKey, since, key_id, ai_key }));
}

export async function getLlmKeys(ckeyKey) {
  return ckeyFetch(buildUrl("/api/llm/keys", { key: ckeyKey }));
}

// ── Proxy tĩnh ─────────────────────────────────────────────
export async function listProxyStatic(ckeyKey) {
  return ckeyFetch(buildUrl("/api/proxy-static/list", { key: ckeyKey }));
}

export async function buyProxyStatic(ckeyKey, opts) {
  return ckeyFetch(buildUrl("/api/proxy-static/buy"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: ckeyKey, ...opts }),
  });
}

export async function changeProxyStaticIp(ckeyKey, opts) {
  return ckeyFetch(buildUrl("/api/proxy-static/change-ip"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: ckeyKey, ...opts }),
  });
}

// ── Ref ────────────────────────────────────────────────────
// Dùng chung ref link của anh cho mọi nơi
export const CKEY_REGISTER_URL = CKEY_REF_LINK;
export const CKEY_DOCS_URL = "https://ckey.vn/docs";

// ── Helpers ────────────────────────────────────────────────
export function formatVnd(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("vi-VN").format(num) + " VND";
}

export function parseCkeyBalance(profileRes) {
  try {
    const data = profileRes?.json?.data?.profile;
    if (!data) return null;
    return {
      balanceText: data.balance || "0 VND",
      balanceRaw: Number(data.balance_raw) || 0,
      username: data.username,
      email: data.email,
      apiKeyMasked: data.api_key_masked,
    };
  } catch { return null; }
}

export { CKEY_BASE, CKEY_LLM_BASE };
