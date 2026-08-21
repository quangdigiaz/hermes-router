import { NextResponse } from "next/server";
import { getProxyXoay, TINH_THANH_CODES } from "@/lib/ckey/client.js";
import { getSettings } from "@/lib/db/repos/settingsRepo.js";
import { getProxyPools, createProxyPool } from "@/lib/db/repos/proxyPoolsRepo.js";
import { getProviderConnections, updateProviderConnection } from "@/lib/localDb";
import { requireDashboardAuth } from "@/lib/auth/routeAuth.js";

export const dynamic = "force-dynamic";

// Top diverse provinces for auto-batch creation
const DEFAULT_BATCH_PROVINCES = [
  0,  // Random
  3,  // Hà Nội
  6,  // Hồ Chí Minh
  16, // Đà Nẵng
  25, // Hải Phòng
  10, // Bình Dương
  8,  // Đồng Nai
  11, // Nghệ An
  9,  // Vũng Tàu
  26, // Quảng Ninh
  27, // Cà Mau
  15, // Huế
];

/**
 * POST /api/ckey/proxy/batch-create
 * Automatically generate N distinct CKEY Proxy Pools in 1 click
 * Body: { keyproxy, count: number (1-10), nhamang, autoDistribute: boolean }
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
        error: "Key Proxy (keyproxy) required",
      }, { status: 400 });
    }

    const count = Math.min(Math.max(Number(body.count) || 3, 1), 10);
    const nhamang = body.nhamang || "random";
    const autoDistribute = body.autoDistribute === true;

    const existingPools = await getProxyPools();
    const createdPools = [];
    const errors = [];

    // Create pools for each chosen province
    for (let i = 0; i < count; i++) {
      const tinhthanh = DEFAULT_BATCH_PROVINCES[i % DEFAULT_BATCH_PROVINCES.length];
      const tinhthanhName = TINH_THANH_CODES[tinhthanh] || "Random";
      const poolName = `CKEY #${i + 1} - ${tinhthanhName}`;

      // Check if a pool with this exact name already exists
      const existing = existingPools.find((p) => p.name === poolName);
      if (existing) {
        createdPools.push(existing);
        continue;
      }

      try {
        const ckeyRes = await getProxyXoay({ keyproxy, nhamang, tinhthanh });
        let proxyUrl = "http://127.0.0.1:8080"; // Fallback placeholder if rate limited, will auto-rotate on first use
        let ip = "";

        if (ckeyRes.ok && ckeyRes.json?.status === 100 && ckeyRes.json?.proxyUrl) {
          proxyUrl = ckeyRes.json.proxyUrl;
          ip = ckeyRes.json.parsed?.ip || "";
        }

        const pool = await createProxyPool({
          name: poolName,
          proxyUrl,
          type: "ckey",
          isActive: true,
          strictProxy: false,
          testStatus: ip ? "active" : "pending",
          lastTestedAt: new Date().toISOString(),
          lastRotatedAt: new Date().toISOString(),
          ckeyKeyproxy: keyproxy,
          ckeyTinhThanh: tinhthanh,
          ckeyNhaMang: nhamang,
          ckeyMeta: {
            tinhthanh,
            tinhthanhName,
            nhamang,
            lastIp: ip,
            rotatedAt: Date.now(),
          },
        });

        createdPools.push(pool);
      } catch (err) {
        errors.push(`Pool ${i + 1}: ${err.message}`);
      }
    }

    // Optional: Auto-distribute created pools across existing provider connections
    let distributedCount = 0;
    if (autoDistribute && createdPools.length > 0) {
      try {
        const connections = await getProviderConnections();
        for (let idx = 0; idx < connections.length; idx++) {
          const conn = connections[idx];
          const assignedPool = createdPools[idx % createdPools.length];
          const nextPsd = {
            ...(conn.providerSpecificData || {}),
            proxyPoolId: assignedPool.id,
            proxyPoolIds: [assignedPool.id],
            connectionProxyEnabled: true,
          };
          await updateProviderConnection(conn.id, { providerSpecificData: nextPsd });
          distributedCount++;
        }
      } catch (distErr) {
        console.warn("[CKEY batch-create] Failed to auto-distribute:", distErr);
      }
    }

    return NextResponse.json({
      success: true,
      count: createdPools.length,
      pools: createdPools,
      distributedCount,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message || "Batch create failed",
    }, { status: 500 });
  }
}