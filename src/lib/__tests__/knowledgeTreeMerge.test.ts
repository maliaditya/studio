import assert from "node:assert/strict";
import test from "node:test";

import { parseAsciiTree } from "@/lib/knowledgeTree/treeParser";
import { normalizeCandidateGraph } from "@/lib/knowledgeTree/normalizer";
import { KnowledgeStore } from "@/lib/knowledgeTree/knowledgeStore";
import { mergeCandidateGraph } from "@/lib/knowledgeTree/mergeEngine";

const sample = `Machine Learning
├─ Algorithms
│  ├─ Clustering
│  ├─ Logistic Regression
│  └─ Decision Trees
└─ Foundation Models`;

test("mergeCandidateGraph adds nodes and edges", () => {
  const parsed = parseAsciiTree(sample);
  assert.ok(parsed);
  const normalized = normalizeCandidateGraph(parsed!);
  const store = new KnowledgeStore();
  mergeCandidateGraph(store, normalized, {
    sourceId: "test:unit",
    createdAt: new Date().toISOString(),
  });

  const graph = store.getGraph();
  assert.ok(graph.nodes.length >= 4);
  assert.ok(graph.edges.length >= 3);
  const root = graph.nodes.find((n) => n.label === "Machine Learning");
  assert.ok(root);
});
