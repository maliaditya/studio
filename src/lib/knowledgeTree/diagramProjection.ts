import type { KnowledgeGraph } from "./types";
import type { DiagramNode } from "@/lib/parseConsoleDiagram";
import { planVisualDiagram } from "@/lib/planVisualDiagram";
import { layoutClusteredDiagram } from "@/lib/layoutClusteredDiagram";
import { renderExcalidrawScene } from "@/lib/renderExcalidraw";

const buildAdjacency = (graph: KnowledgeGraph) => {
  const map = new Map<string, string[]>();
  graph.edges.forEach((edge) => {
    if (edge.type !== "parent") return;
    if (!map.has(edge.from)) map.set(edge.from, []);
    map.get(edge.from)?.push(edge.to);
  });
  return map;
};

export const projectSubtree = (
  graph: KnowledgeGraph,
  rootId: string,
  maxDepth = 3,
  maxNodes = 60
): DiagramNode | null => {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = buildAdjacency(graph);
  const seen = new Set<string>();
  let count = 0;

  const walk = (id: string, depth: number): DiagramNode | null => {
    const node = nodeMap.get(id);
    if (!node || seen.has(id) || count >= maxNodes) return null;
    seen.add(id);
    count += 1;
    if (depth >= maxDepth) return { label: node.label, children: [] };
    const children = (adjacency.get(id) || [])
      .map((childId) => walk(childId, depth + 1))
      .filter(Boolean) as DiagramNode[];
    return { label: node.label, children };
  };

  return walk(rootId, 0);
};

export const projectSubtreeToExcalidraw = (
  graph: KnowledgeGraph,
  rootId: string,
  maxDepth = 3,
  maxNodes = 60
) => {
  const subtree = projectSubtree(graph, rootId, maxDepth, maxNodes);
  if (!subtree) return null;
  const planned = planVisualDiagram(subtree);
  const positioned = layoutClusteredDiagram(planned);
  return renderExcalidrawScene(positioned);
};
