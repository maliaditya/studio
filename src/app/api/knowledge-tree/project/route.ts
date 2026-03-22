import { resolveKnowledgeTreePath } from "@/lib/knowledgeTree/knowledgePath";
import { NextResponse } from "next/server";
import { FileStoreAdapter } from "@/lib/knowledgeTree/fileStoreAdapter";
import { KnowledgeStore } from "@/lib/knowledgeTree/knowledgeStore";
import { projectSubtree } from "@/lib/knowledgeTree/diagramProjection";
import { renderAsciiTree } from "@/lib/renderAsciiTree";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rootLabel = typeof body?.rootLabel === "string" ? body.rootLabel.trim() : "";
    const canvasId = typeof body?.canvasId === "string" ? body.canvasId.trim() : undefined;
    if (!rootLabel) {
      return NextResponse.json({ error: "rootLabel is required." }, { status: 400 });
    }

    const adapter = new FileStoreAdapter(resolveKnowledgeTreePath(canvasId));
    const store = new KnowledgeStore(adapter);
    await store.load();
    const graph = store.getGraph();

    const match = graph.nodes.find(
      (node) => node.label.toLowerCase() === rootLabel.toLowerCase()
    );
    if (!match) {
      return NextResponse.json({ error: "Root label not found." }, { status: 404 });
    }

    const subtree = projectSubtree(graph, match.id, 3, 80);
    if (!subtree) {
      return NextResponse.json({ error: "Projection failed." }, { status: 500 });
    }

    const diagramText = renderAsciiTree({ type: "hierarchy", root: subtree });
    return NextResponse.json({ diagramText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Projection failed.", details: message }, { status: 500 });
  }
}

