import { NextResponse } from "next/server";
import { getProxyPoolById, updateProxyPool } from "@/lib/db/repos/proxyPoolsRepo.js";
import { testProxyUrl } from "@/lib/network/proxyTest";
import { fetch as undiciFetch } from "undici";
import { requireDashboardAuth } from "@/lib/auth/routeAuth.js";
import { autoRotateCkeyProxy } from "@/lib/ckey/autoRotate.js";
import { getSettings } from "@/lib/db/repos/settingsRepo.js";

async function testVercelRelay(relayUrl, timeoutMs = 10000) {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await undiciFetch(relayUrl, {
      method: "GET",
      headers: {
        "x-relay-target": "https://httpbin.org",
        "x-relay-path": "/get",
      },
      signal: controller.signal,
    });
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: err?.name === "AbortError" ? "Relay test timed out" : (err?.message || String(err)),
    };
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/proxy-pools/[id]/test - Test proxy pool entry
export async function POST(request, { params }) {
  if (!await requireDashboardAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const proxyPool = await getProxyPoolById(id);

    if (!proxyPool) {
      return NextResponse.json({ error: "Proxy pool not found" }, { status: 404 });
    }

    let result = proxyPool.type === "vercel" || proxyPool.type === "cloudflare" || proxyPool.type === "deno"
      ? await testVercelRelay(proxyPool.proxyUrl)
      : await testProxyUrl({ proxyUrl: proxyPool.proxyUrl });

    let autoRotated = false;
    let newIp = null;

    // Smart CKEY auto-rotation on timeout / failure
    if (!result.ok && proxyPool.type === "ckey") {
      const settings = await getSettings();
      const resolvedKeyproxy = (
        proxyPool.ckeyKeyproxy ||
        proxyPool.providerSpecificData?.ckeyKeyproxy ||
        settings.ckeyKeyproxy ||
        ""
      ).trim();

      if (resolvedKeyproxy) {
        console.log(`[CKEY Test Auto-Rotate] Proxy pool ${id} failed test (${result.error}), rotating new IP...`);
        const rotResult = await autoRotateCkeyProxy(id, {
          keyproxy: resolvedKeyproxy,
          tinhthanh: proxyPool.ckeyTinhThanh,
          nhamang: proxyPool.ckeyNhaMang,
          force: true,
        });

        if (rotResult.rotated && rotResult.proxyUrl) {
          // Re-test with new rotated proxy URL
          const retryResult = await testProxyUrl({ proxyUrl: rotResult.proxyUrl });
          if (retryResult.ok) {
            result = retryResult;
            autoRotated = true;
            newIp = rotResult.ip || null;
            console.log(`[CKEY Test Auto-Rotate] Proxy pool ${id} recovered with new IP ${newIp}!`);
          }
        }
      }
    }

    const now = new Date().toISOString();

    await updateProxyPool(id, {
      testStatus: result.ok ? "active" : "error",
      lastTestedAt: now,
      lastError: result.ok ? null : (result.error || `Proxy test failed with status ${result.status}`),
      isActive: result.ok,
    });

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      statusText: result.statusText || null,
      error: result.error || null,
      elapsedMs: result.elapsedMs || 0,
      testedAt: now,
      autoRotated,
      newIp,
    });
  } catch (error) {
    console.log("Error testing proxy pool:", error);
    return NextResponse.json({ error: "Failed to test proxy pool" }, { status: 500 });
  }
}
