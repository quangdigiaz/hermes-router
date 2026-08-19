import { NextResponse } from "next/server";
import { getRecentNotifications } from "@/lib/notificationBus";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const notifications = getRecentNotifications();
    return NextResponse.json({ notifications });
  } catch (error) {
    console.log("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
