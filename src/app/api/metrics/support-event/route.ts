import { NextResponse } from "next/server";
import {
  isMetricsStorageConfigured,
  recordSupportEvent,
  type SupportChannel,
  type SupportEventType,
} from "@/lib/monetizationMetrics";

export const dynamic = "force-dynamic";

const VALID_EVENTS: SupportEventType[] = ["support_page_view", "support_cta_click", "donation_intent"];
const VALID_CHANNELS: SupportChannel[] = ["buymeacoffee", "upi"];

export async function POST(request: Request) {
  if (!isMetricsStorageConfigured()) {
    return NextResponse.json({ success: false, message: "Metrics storage is not configured." }, { status: 200 });
  }

  try {
    const payload = (await request.json()) as {
      event?: SupportEventType;
      channel?: SupportChannel;
      amountUsd?: number;
      date?: string;
    };

    const event = payload.event;
    if (!event || !VALID_EVENTS.includes(event)) {
      return NextResponse.json({ error: "Invalid payload: unsupported event." }, { status: 400 });
    }

    const channel =
      typeof payload.channel === "string" && VALID_CHANNELS.includes(payload.channel) ? payload.channel : undefined;
    const amountUsd = typeof payload.amountUsd === "number" ? payload.amountUsd : 0;
    const date = typeof payload.date === "string" ? payload.date : undefined;

    const result = await recordSupportEvent(event, { channel, amountUsd, date });
    return NextResponse.json({ success: true, month: result.monthKey });
  } catch (error) {
    console.error("POST /api/metrics/support-event error:", error);
    return NextResponse.json({ error: "Failed to record support event." }, { status: 500 });
  }
}
