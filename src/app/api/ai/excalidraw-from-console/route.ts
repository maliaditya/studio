import { NextResponse } from "next/server";
import { consoleDiagramToExcalidraw } from "@/lib/consoleToExcalidraw";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json(
        { error: "Console diagram text is required." },
        { status: 400 }
      );
    }

    const scene = consoleDiagramToExcalidraw(text);
    return NextResponse.json({
      scene,
      blueprint: null,
      model: "local",
      provider: "local",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to create Excalidraw scene.",
        details: message,
      },
      { status: 500 }
    );
  }
}
