import { parseConsoleDiagram, type DiagramNode } from "@/lib/parseConsoleDiagram";
import type { CandidateGraph } from "./types";

const normalizeLabel = (label: string) => label.replace(/\s+/g, " ").trim();

const walk = (node: DiagramNode, nodes: Map<string, string>, edges: CandidateGraph["edges"]) => {
  const label = normalizeLabel(node.label);
  if (!nodes.has(label)) nodes.set(label, label);
  (node.children || []).forEach((child) => {
    const childLabel = normalizeLabel(child.label);
    if (!nodes.has(childLabel)) nodes.set(childLabel, childLabel);
    edges.push({ parent: label, child: childLabel });
    walk(child, nodes, edges);
  });
};

export const parseAsciiTree = (input: string): CandidateGraph | null => {
  const root = parseConsoleDiagram(input);
  if (!root) return null;
  const nodes = new Map<string, string>();
  const edges: CandidateGraph["edges"] = [];
  walk(root, nodes, edges);
  return {
    nodes: Array.from(nodes.values()).map((label) => ({ label })),
    edges,
  };
};
