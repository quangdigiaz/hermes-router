import { NextResponse } from "next/server";
import { getSettings } from "@/lib/localDb";

export async function GET() {
  try {
    const settings = await getSettings();
    const requireLogin = settings.requireLogin !== false;
    const tunnelDashboardAccess = settings.tunnelDashboardAccess !== false;
    const tunnelUrl = settings.tunnelUrl || "";
    const tailscaleUrl = settings.tailscaleUrl || "";
    const studioLandingEnabled = settings.studioLandingEnabled === true;
    return NextResponse.json({ requireLogin, tunnelDashboardAccess, tunnelUrl, tailscaleUrl, studioLandingEnabled });
  } catch (error) {
    return NextResponse.json({ requireLogin: true }, { status: 200 });
  }
}
