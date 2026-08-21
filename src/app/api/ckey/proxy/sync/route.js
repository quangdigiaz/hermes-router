import { NextResponse } from "next/server";
import { getProxyXoay, TINH_THANH_CODES } from "@/lib/ckey/client.js";
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { getProxyPools, createProxyPool, updateProxyPool } from "@/lib/db/repos/proxyPoolsRepo.js";
import { requireDashboardAuth } from "@/lib/auth/routeAuth.js";

export const dynamic = "force-dynamic";

/**
 * POST /api/ckey/proxy/sync
 * Sync / Create a CKEY rotating proxy pool entry
 * Body: { keyproxy, tinhthanh, nhamang, poolName, poolId }
 */
export async function POST(request) {
  if (!await requireDashboardAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const settings = await getSettings();

    const keyproxy = (body.keyproxy || settings.ckeyKeyproxy || "").trim();
    if (!keyproxy) {
      return NextResponse.json({
        success: false,
        error: "Chưa có Key Proxy (keyproxy). Vui lòng nhập hoặc lưu trong Cài đặt Profile",
      }, { status: 400 });
    }

    const tinhthanh = Number.isFinite(Number(body.tinhthanh)) ? Number(body.tinhthanh) : 0;
    const nhamang = body.nhamang || "random";
    const tinhthanhName = TINH_THANH_CODES[tinhthanh] || "Random";

    // Call CKEY API to fetch live rotating proxy
    const ckeyRes = await getProxyXoay({ keyproxy, nhamang, tinhthanh });
    if (!ckeyRes.ok || !ckeyRes.json) {
      return NextResponse.json({
        success: false,
        error: `CKEY API returned HTTP ${ckeyRes.status}: ${ckeyRes.text?.slice(0, 150) || "Network error"}`,
      }, { status: 502 });
    }

    const data = ckeyRes.json;
    if (data.status !== 100 || !data.proxyUrl) {
      const msg = data.message || `Status ${data.status} (không lấy được proxy)`;
      return NextResponse.json({
        success: false,
        error: `CKEY lỗi: ${msg}`,
        data,
      }, { status: 400 });
    }

    const proxyUrl = data.proxyUrl;
    const ip = data.parsed?.ip || "";
    const poolName = (body.poolName || `CKEY Xoay - ${tinhthanhName}`).trim();

    // Check if updating existing pool or creating a new one
    let targetPool = null;
    if (body.poolId) {
      const allPools = await getProxyPools();
      targetPool = allPools.find((p) => p.id === body.poolId);
    } else {
      const allPools = await getProxyPools();
      targetPool = allPools.find((p) => p.type === "ckey" && (p.ckeyKeyproxy === keyproxy || p.name === poolName));
    }

    const ckeyMeta = {
      tinhthanh,
      tinhthanhName,
      nhamang,
      lastIp: ip,
      rotatedAt: Date.now(),
      proxyhttpRaw: data.proxyhttp || "",
    };

    if (targetPool) {
      const updated = await updateProxyPool(targetPool.id, {
        name: poolName,
        proxyUrl,
        type: "ckey",
        isActive: true,
        testStatus: "active",
        lastTestedAt: new Date().toISOString(),
        lastRotatedAt: new Date().toISOString(),
        lastError: null,
        ckeyKeyproxy: keyproxy,
        ckeyTinhThanh: tinhthanh,
        ckeyNhaMang: nhamang,
        ckeyMeta,
      });
      return NextResponse.json({
        success: true,
        action: "updated",
        pool: updated,
        proxyUrl,
        ip,
        tinhthanhName,
      });
    }

    const created = await createProxyPool({
      name: poolName,
      proxyUrl,
      type: "ckey",
      isActive: true,
      strictProxy: false,
      testStatus: "active",
      lastTestedAt: new Date().toISOString(),
      lastRotatedAt: new Date().toISOString(),
      ckeyKeyproxy: keyproxy,
      ckeyTinhThanh: tinhthanh,
      ckeyNhaMang: nhamang,
      ckeyMeta,
    });

    return NextResponse.json({
      success: true,
      action: "created",
      pool: created,
      proxyUrl,
      ip,
      tinhthanhName,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message || "Lỗi đồng bộ CKEY proxy",
    }, { status: 500 });
  }
}
