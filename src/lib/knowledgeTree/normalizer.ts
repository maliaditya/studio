import type { CandidateGraph, CandidateNode } from "./types";

const normalizeLabel = (label: string) =>
  label
    .replace(/\s+/g, " ")
    .replace(/\s*&\s*/g, " and ")
    .trim();

const titleCase = (label: string) =>
  label
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");

const normalizeNode = (node: CandidateNode): CandidateNode => {
  const cleaned = normalizeLabel(node.label);
  const label = cleaned.length > 2 ? titleCase(cleaned) : cleaned;
  return { label, aliases: node.aliases ? [...node.aliases] : [] };
};

export const normalizeCandidateGraph = (graph: CandidateGraph): CandidateGraph => {
  const nodeMap = new Map<string, CandidateNode>();
  graph.nodes.forEach((node) => {
    const normalized = normalizeNode(node);
    if (!nodeMap.has(normalized.label)) nodeMap.set(normalized.label, normalized);
  });

  const edges = graph.edges
    .map((edge) => ({
      parent: normalizeLabel(edge.parent),
      child: normalizeLabel(edge.child),
    }))
    .filter((edge) => edge.parent && edge.child && edge.parent !== edge.child)
    .map((edge) => ({
      parent: titleCase(edge.parent),
      child: titleCase(edge.child),
    }));

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
  };
};
