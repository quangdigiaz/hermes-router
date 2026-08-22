import { NextResponse } from "next/server";
import {
  listProxyStatic,
  buyProxyStatic,
  renewProxyStatic,
  changeProxyStaticAuth,
  changeProxyStaticIp,
} from "@/lib/ckey/client.js";
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { getProxyPools, createProxyPool, updateProxyPool } from "@/lib/db/repos/proxyPoolsRepo.js";
import { requireDashboardAuth } from "@/lib/auth/routeAuth.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/ckey/static-proxy?key=...
 * Lấy danh sách proxy tĩnh đang sở hữu từ CKEY.VN
 */
export async function GET(request) {
  if (!await requireDashboardAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const settings = await getSettings();
    const ckeyKey = (searchParams.get("key") || settings.ckeyKey || "").trim();

    if (!ckeyKey) {
      return NextResponse.json({
        success: false,
        error: "Chưa có CKEY API Key. Vui lòng cấu hình trong Cài đặt Profile.",
      }, { status: 400 });
    }

    const ckeyRes = await listProxyStatic(ckeyKey);
    if (!ckeyRes.ok || !ckeyRes.json) {
      return NextResponse.json({
        success: false,
        error: `CKEY API trả về mã lỗi HTTP ${ckeyRes.status}: ${ckeyRes.text?.slice(0, 150) || "Network error"}`,
      }, { status: 502 });
    }

    return NextResponse.json(ckeyRes.json);
  } catch (error) {
    console.error("[GET /api/ckey/static-proxy] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/ckey/static-proxy
 * Actions: buy | renew | change-auth | change-ip | sync-pool
 */
export async function POST(request) {
  if (!await requireDashboardAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const settings = await getSettings();
    const ckeyKey = (body.key || settings.ckeyKey || "").trim();

    if (!ckeyKey) {
      return NextResponse.json({
        success: false,
        error: "Chưa có CKEY API Key. Vui lòng cấu hình trong Cài đặt Profile.",
      }, { status: 400 });
    }

    const action = body.action || "buy";

    // 1. Mua Proxy Tĩnh mới
    if (action === "buy") {
      const res = await buyProxyStatic(ckeyKey, body);
      return NextResponse.json(res.json || { success: false, error: res.text }, { status: res.status });
    }

    // 2. Gia hạn Proxy Tĩnh
    if (action === "renew") {
      const res = await renewProxyStatic(ckeyKey, body);
      return NextResponse.json(res.json || { success: false, error: res.text }, { status: res.status });
    }

    // 3. Đổi thông tin bảo mật (Auth)
    if (action === "change-auth") {
      const res = await changeProxyStaticAuth(ckeyKey, body);
      return NextResponse.json(res.json || { success: false, error: res.text }, { status: res.status });
    }

    // 4. Đổi IP Proxy
    if (action === "change-ip") {
      const res = await changeProxyStaticIp(ckeyKey, body);
      return NextResponse.json(res.json || { success: false, error: res.text }, { status: res.status });
    }

    // 5. Đồng bộ vào Proxy Pool
    if (action === "sync-pool") {
      const { idproxy, ip, port, user, password, type, loaiproxy, time_expire, time_expire_text } = body;
      if (!ip || !port) {
        return NextResponse.json({ success: false, error: "Thiếu thông tin IP hoặc Port" }, { status: 400 });
      }

      const protocol = (type || "").toLowerCase() === "socks5" ? "socks5" : "http";
      const proxyUrl = user && password
        ? `${protocol}://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${ip}:${port}`
        : `${protocol}://${ip}:${port}`;

      const poolName = (body.poolName || `CKEY Tĩnh - ${loaiproxy || "US"} (${ip})`).trim();

      const existingPools = await getProxyPools();
      const match = existingPools.find(
        (p) => p.type === "ckey-static" && (p.idproxy === idproxy || p.proxyUrl === proxyUrl)
      );

      let savedPool;
      const poolPayload = {
        name: poolName,
        type: "ckey-static",
        proxyUrl,
        idproxy: idproxy || null,
        loaiproxy: loaiproxy || "US",
        time_expire: time_expire || null,
        time_expire_text: time_expire_text || null,
        strictProxy: true,
        isActive: true,
      };

      if (match) {
        savedPool = await updateProxyPool(match.id, poolPayload);
      } else {
        savedPool = await createProxyPool(poolPayload);
      }

      return NextResponse.json({
        success: true,
        message: "Đồng bộ Proxy Tĩnh vào Proxy Pool thành công",
        pool: savedPool,
      });
    }

    return NextResponse.json({ success: false, error: `Action không hợp lệ: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/ckey/static-proxy] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
