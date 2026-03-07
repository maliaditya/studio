import { meaningfulTokens, normalizeText, tokenOverlapRatio } from "@/lib/shiv/normalize";
import type { ShivEvidence, ShivGuardResult, ShivQuery } from "@/lib/shiv/types";

export const relevanceGuard = (query: ShivQuery, answer: string): ShivGuardResult => {
  const q = meaningfulTokens(query.question);
  if (!q.length) return { passed: true };
  const a = meaningfulTokens(answer);
  const ratio = tokenOverlapRatio(q, a);
  if (ratio >= 0.2) return { passed: true };
  return { passed: false, reason: `low_overlap:${ratio.toFixed(2)}` };
};

export const groundingGuard = (answer: string, evidence: ShivEvidence[]): ShivGuardResult => {
  if (!evidence.length) return { passed: false, reason: "no_evidence" };
  const normalizedAnswer = normalizeText(answer);
  if (!normalizedAnswer) return { passed: false, reason: "empty_answer" };
  for (const item of evidence.slice(0, 8)) {
    const name = normalizeText(item.name);
    if (!name) continue;
    if (normalizedAnswer.includes(name)) return { passed: true };
    const parts = name.split(" ").filter((token) => token.length >= 4);
    if (parts.length > 0 && parts.some((part) => normalizedAnswer.includes(part))) {
      return { passed: true };
    }
  }
  return { passed: false, reason: "no_entity_reference" };
};
