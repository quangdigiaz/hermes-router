import { NextResponse } from "next/server";
import { getProfile, getLlmUsageStats, parseCkeyBalance, formatVnd } from "@/lib/ckey/client.js";
import { getSettings } from "@/lib/db/repos/settingsRepo.js";

export const dynamic = "force-dynamic";

/**
 * GET /api/ckey/balance
 * Trả về số dư VND + thống kê LLM + danh sách proxy xoay (nếu có key)
 * Query: ?key=<optional override>
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const overrideKey = url.searchParams.get("key")?.trim() || "";
    const settings = await getSettings();
    const ckeyKey = overrideKey || settings.ckeyApiKey || process.env.CKEY_API_KEY || "";

    if (!ckeyKey) {
      return NextResponse.json({
        success: false,
        error: "CKEY_API_KEY chưa cấu hình. Vào Settings → CKEY hoặc set env CKEY_API_KEY",
        balance: null,
      }, { status: 400 });
    }

    const [profileRes, statsRes] = await Promise.all([
      getProfile(ckeyKey).catch(e => ({ ok: false, status: 0, text: e.message })),
      getLlmUsageStats(ckeyKey).catch(e => ({ ok: false, status: 0, text: e.message })),
    ]);

    const balance = parseCkeyBalance(profileRes);
    const stats = statsRes?.json?.data || null;

    return NextResponse.json({
      success: profileRes.ok && profileRes.json?.success !== false,
      balance: balance ? {
        raw: balance.balanceRaw,
        text: balance.balanceText,
        formatted: formatVnd(balance.balanceRaw),
        username: balance.username,
        email: balance.email,
        masked: balance.apiKeyMasked,
      } : null,
      stats: stats ? {
        requests: stats.requests || 0,
        successRequests: stats.success_requests || 0,
        chargedVnd: stats.charged_vnd || 0,
        chargedText: stats.charged_vnd_text || formatVnd(stats.charged_vnd || 0),
        promptTokens: stats.prompt_tokens || 0,
        completionTokens: stats.completion_tokens || 0,
      } : null,
      refLink: "https://ckey.vn/register?ref=ckeyA8497D",
      raw: {
        profile: profileRes.json || null,
        stats: statsRes.json || null,
      }
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
