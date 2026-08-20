import { NextResponse } from "next/server";
import { autoRotateCkeyProxy } from "@/lib/ckey/autoRotate.js";
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { getProxyPoolById } from "@/lib/db/repos/proxyPoolsRepo.js";

export const dynamic = "force-dynamic";

/**
 * POST /api/ckey/proxy/rotate
 * Body: { poolId, keyproxy, tinhthanh, nhamang }
 * Tự xoay IP cho proxy pool CKEY. Dùng cho manual và auto-rotate.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { poolId, keyproxy, tinhthanh, nhamang, key: overrideKey } = body;

    if (!poolId) return NextResponse.json({ success: false, error: "poolId required" }, { status: 400 });

    const pool = await getProxyPoolById(poolId);
    if (!pool) return NextResponse.json({ success: false, error: "pool not found" }, { status: 404 });

    // keyproxy ưu tiên: body > pool.data.ckeyKeyproxy > settings
    const settings = await getSettings();
    const resolvedKeyproxy = (keyproxy || pool.ckeyKeyproxy || pool.providerSpecificData?.ckeyKeyproxy || settings.ckeyKeyproxy || overrideKey || "").trim();
    if (!resolvedKeyproxy) {
      return NextResponse.json({
        success: false,
        error: "keyproxy chưa cấu hình. Gửi keyproxy trong body hoặc lưu vào pool/settings",
        poolId,
      }, { status: 400 });
    }

    const result = await autoRotateCkeyProxy(poolId, {
      keyproxy: resolvedKeyproxy,
      tinhthanh: tinhthanh ?? pool.ckeyTinhThanh ?? 0,
      nhamang: nhamang ?? pool.ckeyNhaMang ?? "random",
    });

    if (result.rotated) {
      return NextResponse.json({ success: true, ...result, poolId });
    }
    return NextResponse.json({ success: false, ...result, poolId }, { status: 409 });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/ckey/proxy/rotate?poolId=xxx
 * Lấy trạng thái pool (không xoay)
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const poolId = url.searchParams.get("poolId");
    if (!poolId) return NextResponse.json({ success: false, error: "poolId required" }, { status: 400 });
    const pool = await getProxyPoolById(poolId);
    if (!pool) return NextResponse.json({ success: false, error: "pool not found" }, { status: 404 });
    return NextResponse.json({
      success: true,
      poolId,
      proxyUrl: pool.proxyUrl ? pool.proxyUrl.replace(/:[^:@]+@/, ":***@") : null,
      ckeyMeta: pool.ckeyMeta || null,
      lastRotatedAt: pool.lastRotatedAt || null,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
