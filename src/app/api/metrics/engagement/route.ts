import { NextResponse } from "next/server";
import { isMetricsStorageConfigured, recordEngagement } from "@/lib/monetizationMetrics";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isMetricsStorageConfigured()) {
    return NextResponse.json({ success: false, message: "Metrics storage is not configured." }, { status: 200 });
  }

  try {
    const payload = (await request.json()) as { username?: string; date?: string };
    const username = typeof payload.username === "string" ? payload.username.trim().toLowerCase() : "";
    const date = typeof payload.date === "string" ? payload.date : undefined;

    if (!username) {
      return NextResponse.json({ error: "Invalid payload: username is required." }, { status: 400 });
    }

    const result = await recordEngagement(username, date);
    return NextResponse.json({ success: true, month: result.monthKey });
  } catch (error) {
    console.error("POST /api/metrics/engagement error:", error);
    return NextResponse.json({ error: "Failed to record engagement event." }, { status: 500 });
  }
}
