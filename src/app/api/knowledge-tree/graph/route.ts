import { resolveKnowledgeTreePath } from "@/lib/knowledgeTree/knowledgePath";
import { NextResponse } from "next/server";
import { FileStoreAdapter } from "@/lib/knowledgeTree/fileStoreAdapter";
import { KnowledgeStore } from "@/lib/knowledgeTree/knowledgeStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const canvasId = url.searchParams.get("canvasId")?.trim() || undefined;
    const adapter = new FileStoreAdapter(resolveKnowledgeTreePath(canvasId));
    const store = new KnowledgeStore(adapter);
    await store.load();
    return NextResponse.json({ graph: store.getGraph() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to load knowledge graph.", details: message }, { status: 500 });
  }
}

