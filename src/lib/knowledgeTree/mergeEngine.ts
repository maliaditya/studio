import type { CandidateGraph, KnowledgeNode, KnowledgeEdge, SourceRef } from "./types";
import { resolveEntity } from "./entityResolver";
import { validateEdge } from "./edgeValidator";
import { KnowledgeStore } from "./knowledgeStore";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "node";

const ensureUniqueId = (base: string, used: Set<string>) => {
  let id = base;
  let counter = 2;
  while (used.has(id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  used.add(id);
  return id;
};

const buildNode = (
  label: string,
  source: SourceRef,
  usedIds: Set<string>
): KnowledgeNode => {
  const now = new Date().toISOString();
  return {
    id: ensureUniqueId(slugify(label), usedIds),
    label,
    aliases: [],
    confidence: 0.7,
    createdAt: now,
    updatedAt: now,
    sources: [source],
  };
};

const buildEdge = (
  from: string,
  to: string,
  source: SourceRef,
  confidence: number
): KnowledgeEdge => {
  const now = new Date().toISOString();
  return {
    id: `${from}__${to}__parent`,
    from,
    to,
    type: "parent",
    confidence,
    createdAt: now,
    sources: [source],
  };
};

export const mergeCandidateGraph = (
  store: KnowledgeStore,
  candidate: CandidateGraph,
  source: SourceRef
) => {
  const graph = store.getGraph();
  const usedIds = new Set(graph.nodes.map((node) => node.id));
  const labelToId = new Map<string, string>();

  candidate.nodes.forEach((node) => {
    const decision = resolveEntity(graph, node);
    if (decision.action === "merge" && decision.targetId) {
      labelToId.set(node.label, decision.targetId);
      store.touchNode(decision.targetId, source, decision.confidence);
      return;
    }

    if (decision.action === "review") {
      store.reviewQueue.add({
        id: `review-node-${Date.now()}-${Math.random()}`,
        type: "node",
        createdAt: new Date().toISOString(),
        candidate: node,
        reason: decision.reason,
        confidence: decision.confidence,
        suggested: { nodeId: decision.targetId },
        source,
      });
      if (decision.targetId) {
        labelToId.set(node.label, decision.targetId);
      }
      return;
    }

    const next = buildNode(node.label, source, usedIds);
    store.addNode(next);
    labelToId.set(node.label, next.id);
    if (node.aliases) {
      node.aliases.forEach((alias) => store.addAlias(alias, next.id));
    }
  });

  candidate.edges.forEach((edge) => {
    const fromId = labelToId.get(edge.parent);
    const toId = labelToId.get(edge.child);
    if (!fromId || !toId) return;
    const decision = validateEdge(graph, fromId, toId);
    if (decision.action === "review") {
      store.reviewQueue.add({
        id: `review-edge-${Date.now()}-${Math.random()}`,
        type: "edge",
        createdAt: new Date().toISOString(),
        candidate: edge,
        reason: decision.reason,
        confidence: decision.confidence,
        suggested: { from: fromId, to: toId },
        source,
      });
      return;
    }

    const exists = graph.edges.some(
      (existing) => existing.from === fromId && existing.to === toId && existing.type === "parent"
    );
    if (exists) return;
    store.addEdge(buildEdge(fromId, toId, source, decision.confidence));
  });
};
