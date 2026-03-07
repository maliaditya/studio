import { runShivAiFallback } from "@/lib/shiv/aiFallback";
import { attachEvidenceCitations, validateCriticalAnswer } from "@/lib/shiv/contracts";
import { groundingGuard, relevanceGuard } from "@/lib/shiv/guards";
import { buildShivIndex } from "@/lib/shiv/indexBuilder";
import { detectUserLanguage, meaningfulTokens, normalizeText, toPlainText, tokenize } from "@/lib/shiv/normalize";
import { detectIntentSlots } from "@/lib/shiv/intent";
import { retrieveEvidence } from "@/lib/shiv/retriever";
import { runDeterministicHandlers } from "@/lib/shiv/ruleHandlers";
import type { Domain, ShivDecision, ShivEvidence, ShivQuery } from "@/lib/shiv/types";
import type { AiRequestConfig } from "@/types/ai";

const clarifyAnswer = (query: ShivQuery, evidence: ShivEvidence[]) => {
  const q = query.normalizedQuestion;
  const greeting = /\b(hi|hello|hey|yo|good morning|good afternoon|good evening)\b/.test(q);
  const thanks = /\b(thanks|thank you|thx)\b/.test(q);
  const shortPrompt = query.meaningfulTokens.length <= 2;

  if (thanks) {
    return "You're welcome. I can help with today tasks, routines, botherings, resources, skills, and health.";
  }
  if (greeting || (query.intent.intentId === "general" && shortPrompt)) {
    return "Hi. Ask me about your app data, for example: \"what are today's tasks\", \"next hair cutting date\", or \"current weight\".";
  }
  if (!evidence.length) {
    return "I couldn't map that to app data yet. Try adding a task/resource name, slot, or date scope (today/current slot/next).";
  }
  const names = Array.from(new Set(evidence.slice(0, 3).map((item) => item.name))).join(", ");
  return `I found multiple possible matches: ${names}. Which one do you mean?`;
};

const filterEvidenceByDomains = (items: ShivEvidence[], domains: Domain[]) => {
  if (!domains.length) return items;
  const filtered = items.filter((item) => domains.includes(item.domain));
  return filtered.length ? filtered : items;
};

const filterByDomainRecord = (
  byDomain: Record<Domain, ShivEvidence[]>,
  domains: Domain[]
): Record<Domain, ShivEvidence[]> => {
  if (!domains.length) return byDomain;
  const empty: ShivEvidence[] = [];
  return {
    task: domains.includes("task") ? byDomain.task : empty,
    routine: domains.includes("routine") ? byDomain.routine : empty,
    bothering: domains.includes("bothering") ? byDomain.bothering : empty,
    resource: domains.includes("resource") ? byDomain.resource : empty,
    skill: domains.includes("skill") ? byDomain.skill : empty,
    health: domains.includes("health") ? byDomain.health : empty,
    canvas: domains.includes("canvas") ? byDomain.canvas : empty,
  };
};

export const buildShivQuery = (
  question: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  appContext: Record<string, unknown>
): ShivQuery => {
  const cleanQuestion = String(question || "").trim();
  return {
    question: cleanQuestion,
    normalizedQuestion: normalizeText(cleanQuestion),
    tokens: tokenize(cleanQuestion),
    meaningfulTokens: meaningfulTokens(cleanQuestion),
    language: detectUserLanguage(cleanQuestion),
    intent: detectIntentSlots(cleanQuestion),
    history: history
      .filter((message) =>
        message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string"
      )
      .slice(-8),
    appContext,
  };
};

const domainsFromEvidence = (evidence: ShivEvidence[]): Domain[] => {
  const set = new Set<Domain>();
  for (const item of evidence) set.add(item.domain);
  return Array.from(set);
};

export const resolveShivAnswer = async (
  query: ShivQuery,
  appContext: Record<string, unknown>,
  aiConfig: AiRequestConfig
): Promise<ShivDecision> => {
  const index = buildShivIndex(appContext);
  const retrieved = retrieveEvidence(query, index);
  const evidence = filterEvidenceByDomains(retrieved.global, query.intent.expectedDomains);
  const scopedByDomain = filterByDomainRecord(retrieved.byDomain, query.intent.expectedDomains);

  const deterministic = runDeterministicHandlers({
    query,
    index,
    evidence,
    byDomain: scopedByDomain,
  });

  if (deterministic && deterministic.confidence >= 0.72) {
    let normalizedAnswer = toPlainText(deterministic.answer);
    const relevance = relevanceGuard(query, normalizedAnswer);
    if (!relevance.passed) {
      return {
        path: "clarify",
        handlerId: "clarify.low_relevance_deterministic",
        confidence: 0.4,
        answer: clarifyAnswer(query, evidence.slice(0, 3)),
        evidence: evidence.slice(0, 3),
        usedDomains: domainsFromEvidence(evidence.slice(0, 3)),
        guards: {
          relevance,
          grounding: { passed: true },
        },
      };
    }
    const contract = validateCriticalAnswer(query, normalizedAnswer, deterministic.evidence);
    if (!contract.valid && contract.repairedAnswer) {
      normalizedAnswer = contract.repairedAnswer;
    }
    normalizedAnswer = attachEvidenceCitations(query, normalizedAnswer, deterministic.evidence);
    return {
      path: "deterministic",
      handlerId: deterministic.handlerId,
      confidence: deterministic.confidence,
      answer: normalizedAnswer,
      evidence: deterministic.evidence,
      usedDomains: deterministic.usedDomains,
      guards: {
        relevance,
        grounding: { passed: true },
      },
    };
  }

  if (!evidence.length || (evidence[0]?.score || 0) < 0.12) {
    const domainTop = query.intent.expectedDomains
      .flatMap((domain) => retrieved.byDomain[domain] || [])
      .slice(0, 3);
    const clarifyEvidence = domainTop.length ? domainTop : evidence.slice(0, 3);
    return {
      path: "clarify",
      handlerId: "clarify.low_evidence",
      confidence: 0.35,
      answer: clarifyAnswer(query, clarifyEvidence),
      evidence: clarifyEvidence,
      usedDomains: domainsFromEvidence(clarifyEvidence),
      guards: {
        relevance: { passed: true },
        grounding: { passed: true },
      },
    };
  }

  if (aiConfig.provider === "none") {
    return {
      path: "clarify",
      handlerId: deterministic?.handlerId || "clarify.provider_none",
      confidence: deterministic?.confidence || 0.4,
      answer:
        deterministic?.answer ||
        "I need a configured AI provider or a more specific question for deterministic answer.",
      evidence: deterministic?.evidence || evidence.slice(0, 5),
      usedDomains: deterministic?.usedDomains || domainsFromEvidence(evidence.slice(0, 5)),
      guards: {
        relevance: { passed: true },
        grounding: { passed: true },
      },
    };
  }

  const aiEvidence = evidence.slice(0, 12);
  let aiResult = await runShivAiFallback(query, aiEvidence, aiConfig);

  if (!aiResult.ok) {
    const clarifyEvidence = evidence.slice(0, 3);
    return {
      path: "clarify",
      handlerId: "clarify.ai_failed",
      confidence: 0.45,
      answer: clarifyAnswer(query, clarifyEvidence),
      evidence: clarifyEvidence,
      usedDomains: domainsFromEvidence(clarifyEvidence),
      guards: {
        relevance: { passed: true },
        grounding: { passed: true },
      },
    };
  }

  let aiAnswer = aiResult.answer;
  const contract = validateCriticalAnswer(query, aiAnswer, aiEvidence);
  if (!contract.valid) {
    const retry = await runShivAiFallback(query, aiEvidence, aiConfig);
    if (retry.ok) {
      aiResult = retry;
      aiAnswer = retry.answer;
    }
  }
  const repaired = validateCriticalAnswer(query, aiAnswer, aiEvidence);
  if (!repaired.valid && repaired.repairedAnswer) {
    aiAnswer = repaired.repairedAnswer;
  }
  aiAnswer = attachEvidenceCitations(query, aiAnswer, aiEvidence);

  const relevance = relevanceGuard(query, aiAnswer);
  const grounding = groundingGuard(aiAnswer, aiEvidence);

  if (!relevance.passed || !grounding.passed) {
    const clarifyEvidence = evidence.slice(0, 3);
    return {
      path: "clarify",
      handlerId: "clarify.guard_failed",
      confidence: 0.4,
      answer: clarifyAnswer(query, clarifyEvidence),
      evidence: clarifyEvidence,
      usedDomains: domainsFromEvidence(clarifyEvidence),
      guards: {
        relevance,
        grounding,
      },
      provider: aiResult.provider,
      model: aiResult.model,
    };
  }

  return {
    path: "ai_fallback",
    handlerId: deterministic?.handlerId || "ai.fallback",
    confidence: Math.max(0.5, deterministic?.confidence || 0.5),
    answer: toPlainText(aiAnswer),
    evidence: aiEvidence,
    usedDomains: domainsFromEvidence(aiEvidence),
    provider: aiResult.provider,
    model: aiResult.model,
    guards: {
      relevance,
      grounding,
    },
  };
};
