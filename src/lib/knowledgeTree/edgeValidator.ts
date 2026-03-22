import type { KnowledgeGraph, MergeDecision } from "./types";

const normalize = (label: string) => label.toLowerCase().replace(/\s+/g, " ").trim();

const similarity = (a: string, b: string) => {
  if (a === b) return 1;
  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  let overlap = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) overlap += 1;
  });
  return overlap / Math.max(aTokens.size, bTokens.size, 1);
};

export const validateEdge = (
  graph: KnowledgeGraph,
  fromId: string,
  toId: string
): MergeDecision => {
  if (fromId === toId) {
    return { action: "review", confidence: 0.1, reason: "self_edge" };
  }

  const from = graph.nodes.find((node) => node.id === fromId);
  const to = graph.nodes.find((node) => node.id === toId);
  if (!from || !to) {
    return { action: "review", confidence: 0.2, reason: "missing_node" };
  }

  const fromLabel = normalize(from.label);
  const toLabel = normalize(to.label);
  if (fromLabel.includes(toLabel) || toLabel.includes(fromLabel)) {
    return { action: "review", confidence: 0.45, reason: "label_overlap" };
  }

  const overlap = similarity(fromLabel, toLabel);
  if (overlap >= 0.6) {
    return { action: "review", confidence: 0.55, reason: "high_token_overlap" };
  }

  const existing = graph.edges.some(
    (edge) => edge.from === fromId && edge.to === toId && edge.type === "parent"
  );
  if (existing) {
    return { action: "merge", confidence: 0.95, reason: "existing_edge" };
  }

  return { action: "merge", confidence: 0.8, reason: "validated" };
};
