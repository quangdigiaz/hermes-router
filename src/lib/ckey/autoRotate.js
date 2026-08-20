/**
 * Auto-rotate logic cho CKEY proxy xoay
 * Khi proxy bị WAF/5xx/timeout → tự động gọi /api/getproxyxoay để lấy IP mới
 */

import { getProxyXoay, TINH_THANH_CODES } from "./client.js";
import { getProxyPoolById, updateProxyPool } from "@/lib/db/repos/proxyPoolsRepo.js";

const ROTATE_COOLDOWN_MS = 15_000; // tránh spam xoay liên tục
const lastRotateAt = new Map(); // poolId -> timestamp

function shouldRotate(poolId) {
  const last = lastRotateAt.get(poolId) || 0;
  return Date.now() - last > ROTATE_COOLDOWN_MS;
}

/**
 * Tự xoay IP cho proxy pool CKEY khi gặp lỗi
 * @param {string} poolId
 * @param {{ keyproxy: string, tinhthanh?: number, nhamang?: string }} opts
 * @returns {Promise<{ rotated: boolean, proxyUrl?: string, reason?: string }>}
 */
export async function autoRotateCkeyProxy(poolId, opts = {}) {
  if (!poolId) return { rotated: false, reason: "missing poolId" };
  if (!opts.keyproxy) return { rotated: false, reason: "missing keyproxy" };
  if (!shouldRotate(poolId)) return { rotated: false, reason: "cooldown" };

  const pool = await getProxyPoolById(poolId);
  if (!pool) return { rotated: false, reason: "pool not found" };

  // Chỉ xoay nếu pool type là http và proxyUrl trông như CKEY (chứa IP:PORT pattern)
  const tinhthanh = Number.isFinite(Number(opts.tinhthanh)) ? Number(opts.tinhthanh) : 0;
  const nhamang = opts.nhamang || "random";

  try {
    const res = await getProxyXoay({ keyproxy: opts.keyproxy, nhamang, tinhthanh });
    if (!res.ok) return { rotated: false, reason: `ckey api ${res.status}: ${res.text?.slice(0, 120)}` };
    const data = res.json;
    if (data?.status !== 100 || !data?.proxyUrl) {
      return { rotated: false, reason: `ckey status ${data?.status}: ${JSON.stringify(data).slice(0, 150)}` };
    }

    const newUrl = data.proxyUrl;
    const oldUrl = pool.proxyUrl;

    // Cập nhật pool
    await updateProxyPool(poolId, {
      proxyUrl: newUrl,
      lastRotatedAt: new Date().toISOString(),
      lastError: null,
      ckeyMeta: {
        tinhthanh,
        tinhthanhName: TINH_THANH_CODES[tinhthanh] || "Random",
        nhamang,
        lastIp: data.parsed?.ip || "",
        rotatedAt: Date.now(),
      },
    });

    lastRotateAt.set(poolId, Date.now());
    console.log(`[CKEY auto-rotate] pool ${poolId} ${oldUrl?.slice(0, 30)} → ${newUrl.slice(0, 30)} (tinhthanh ${tinhthanh})`);
    return { rotated: true, proxyUrl: newUrl };
  } catch (e) {
    return { rotated: false, reason: e.message };
  }
}

/**
 * Kiểm tra lỗi có nên trigger auto-rotate không
 * WAF 403 HTML, 502/503, timeout đều là ứng viên
 */
export function shouldAutoRotateOnError(status, errorText) {
  const text = String(errorText || "").toLowerCase();
  if (status === 403 && /unable to load site|ray id|cloudflare/i.test(text)) return true;
  if (status === 502 || status === 503 || status === 504) return true;
  if (/timeout|econnreset|etimedout|und_err_socket/i.test(text)) return true;
  return false;
}

export function clearRotateCooldown(poolId) {
  if (poolId) lastRotateAt.delete(poolId);
}
