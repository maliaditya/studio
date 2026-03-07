import { NextResponse } from "next/server";
import { getShivObservabilitySnapshot, trackShivEvent } from "@/lib/shiv/observability";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getShivObservabilitySnapshot());
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const kind = String(body?.kind || "voice");
    if (kind === "voice") {
      trackShivEvent({
        ts: new Date().toISOString(),
        question: String(body?.question || ""),
        mode: String(body?.mode || "curated") === "open" ? "open" : "curated",
        path: "ai_fallback",
        handlerId: "voice.latency",
        confidence: 1,
        latencyMs: Number(body?.totalMs || 0),
        usedDomains: [],
        sttMs: Number(body?.sttMs || 0),
        ttsMs: Number(body?.ttsMs || 0),
        llmMs: Number(body?.llmMs || 0),
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Unsupported event kind." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
