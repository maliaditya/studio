import type { KnowledgeGraph, MergeDecision, CandidateNode } from "./types";

const normalize = (label: string) => label.toLowerCase().replace(/\s+/g, " ").trim();

const bigrams = (value: string) => {
  const cleaned = value.replace(/\s+/g, " ");
  const grams: string[] = [];
  for (let i = 0; i < cleaned.length - 1; i += 1) {
    grams.push(cleaned.slice(i, i + 2));
  }
  return grams;
};

const diceCoefficient = (a: string, b: string) => {
  if (a === b) return 1;
  const aGrams = bigrams(a);
  const bGrams = bigrams(b);
  if (!aGrams.length || !bGrams.length) return 0;
  let matches = 0;
  const bCounts = new Map<string, number>();
  bGrams.forEach((gram) => bCounts.set(gram, (bCounts.get(gram) || 0) + 1));
  aGrams.forEach((gram) => {
    const count = bCounts.get(gram) || 0;
    if (count > 0) {
      matches += 1;
      bCounts.set(gram, count - 1);
    }
  });
  return (2 * matches) / (aGrams.length + bGrams.length);
};

export const resolveEntity = (
  graph: KnowledgeGraph,
  node: CandidateNode
): MergeDecision => {
  const target = normalize(node.label);

  const aliasMatch = graph.aliases[target];
  if (aliasMatch) {
    return { action: "merge", targetId: aliasMatch, confidence: 0.98, reason: "alias" };
  }

  let bestId: string | null = null;
  let bestScore = 0;
  graph.nodes.forEach((existing) => {
    const score = diceCoefficient(target, normalize(existing.label));
    if (score > bestScore) {
      bestScore = score;
      bestId = existing.id;
    }
  });

  if (bestId && bestScore >= 0.92) {
    return { action: "merge", targetId: bestId, confidence: bestScore, reason: "high_similarity" };
  }
  if (bestId && bestScore >= 0.82) {
    return { action: "review", targetId: bestId, confidence: bestScore, reason: "medium_similarity" };
  }

  return { action: "new", confidence: 0.6, reason: "no_match" };
};
