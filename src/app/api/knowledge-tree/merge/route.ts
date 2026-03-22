import { resolveKnowledgeTreePath } from "@/lib/knowledgeTree/knowledgePath";
import { NextResponse } from "next/server";
import { parseAsciiTree } from "@/lib/knowledgeTree/treeParser";
import { normalizeCandidateGraph } from "@/lib/knowledgeTree/normalizer";
import { mergeCandidateGraph } from "@/lib/knowledgeTree/mergeEngine";
import { KnowledgeStore } from "@/lib/knowledgeTree/knowledgeStore";
import { FileStoreAdapter } from "@/lib/knowledgeTree/fileStoreAdapter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const sourceId = typeof body?.sourceId === "string" ? body.sourceId.trim() : "";
    const pageId = typeof body?.pageId === "string" ? body.pageId.trim() : undefined;
    const snippet = typeof body?.snippet === "string" ? body.snippet.trim() : undefined;
    const canvasId = typeof body?.canvasId === "string" ? body.canvasId.trim() : undefined;

    if (!text) {
      return NextResponse.json({ error: "Diagram text is required." }, { status: 400 });
    }
    if (!sourceId) {
      return NextResponse.json({ error: "sourceId is required." }, { status: 400 });
    }

    const parsed = parseAsciiTree(text);
    if (!parsed) {
      return NextResponse.json({ error: "Unable to parse ASCII tree." }, { status: 400 });
    }

    const candidate = normalizeCandidateGraph(parsed);
    const adapter = new FileStoreAdapter(resolveKnowledgeTreePath(canvasId));
    const store = new KnowledgeStore(adapter);
    await store.load();

    mergeCandidateGraph(store, candidate, {
      sourceId,
      pageId,
      snippet,
      createdAt: new Date().toISOString(),
    });

    await store.save();

    return NextResponse.json({
      ok: true,
      nodes: store.getGraph().nodes.length,
      edges: store.getGraph().edges.length,
      reviewQueue: store.reviewQueue.list().length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Merge failed.", details: message }, { status: 500 });
  }
}

