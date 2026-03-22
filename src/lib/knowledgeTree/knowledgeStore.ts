import type { KnowledgeGraph, KnowledgeNode, KnowledgeEdge, SourceRef } from "./types";
import { ReviewQueue } from "./reviewQueue";

export type KnowledgeStoreAdapter = {
  load(): Promise<KnowledgeGraph | null>;
  save(graph: KnowledgeGraph): Promise<void>;
};

export const createEmptyGraph = (): KnowledgeGraph => {
  const now = new Date().toISOString();
  return {
    nodes: [],
    edges: [],
    aliases: {},
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
};

export class KnowledgeStore {
  private graph: KnowledgeGraph;
  private adapter?: KnowledgeStoreAdapter;
  readonly reviewQueue: ReviewQueue;

  constructor(adapter?: KnowledgeStoreAdapter) {
    this.adapter = adapter;
    this.graph = createEmptyGraph();
    this.reviewQueue = new ReviewQueue();
  }

  async load() {
    if (!this.adapter) return this.graph;
    const loaded = await this.adapter.load();
    if (loaded) this.graph = loaded;
    return this.graph;
  }

  async save() {
    if (!this.adapter) return;
    await this.adapter.save(this.graph);
  }

  getGraph() {
    return this.graph;
  }

  setGraph(next: KnowledgeGraph) {
    this.graph = next;
  }

  addNode(node: KnowledgeNode) {
    this.graph.nodes.push(node);
    this.graph.updatedAt = new Date().toISOString();
  }

  addEdge(edge: KnowledgeEdge) {
    this.graph.edges.push(edge);
    this.graph.updatedAt = new Date().toISOString();
  }

  addAlias(alias: string, nodeId: string) {
    this.graph.aliases[alias.toLowerCase()] = nodeId;
    this.graph.updatedAt = new Date().toISOString();
  }

  touchNode(nodeId: string, source: SourceRef, confidence: number) {
    const node = this.graph.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    node.sources.push(source);
    node.confidence = Math.max(node.confidence, confidence);
    node.updatedAt = new Date().toISOString();
    this.graph.updatedAt = node.updatedAt;
  }
}
