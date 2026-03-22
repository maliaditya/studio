export type SourceRef = {
  sourceId: string;
  pageId?: string;
  snippet?: string;
  createdAt: string;
};

export type KnowledgeNode = {
  id: string;
  label: string;
  aliases: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
  sources: SourceRef[];
};

export type KnowledgeEdge = {
  id: string;
  from: string;
  to: string;
  type: "parent" | "related";
  confidence: number;
  createdAt: string;
  sources: SourceRef[];
};

export type KnowledgeGraph = {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  aliases: Record<string, string>;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CandidateNode = {
  label: string;
  aliases?: string[];
};

export type CandidateEdge = {
  parent: string;
  child: string;
};

export type CandidateGraph = {
  nodes: CandidateNode[];
  edges: CandidateEdge[];
};

export type MergeDecision = {
  action: "merge" | "new" | "review";
  targetId?: string;
  confidence: number;
  reason: string;
};

export type ReviewItem = {
  id: string;
  type: "node" | "edge";
  createdAt: string;
  candidate: CandidateNode | CandidateEdge;
  reason: string;
  confidence: number;
  suggested?: { from?: string; to?: string; nodeId?: string };
  source: SourceRef;
};
