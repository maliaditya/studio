export type Domain = "task" | "routine" | "bothering" | "resource" | "skill" | "health" | "canvas" | "journal";

export type ShivPath = "deterministic" | "ai_fallback" | "clarify";

export type ShivLanguage = "english" | "hindi" | "hinglish" | "auto";

export type ShivMetric = "when_next" | "days_remaining" | "current_weight" | "list" | "status" | "search" | "summary" | "general";
export type ShivTimeScope = "today" | "current_slot" | "next" | "all" | "unspecified";

export type ShivIntentSlots = {
  intentId:
    | "botherings.list"
    | "schedule.when_next"
    | "schedule.days_remaining"
    | "tasks.today"
    | "resources.search"
    | "skills.summary"
    | "health.current_weight"
    | "general";
  expectedDomains: Domain[];
  targetPhrase: string;
  timeScope: ShivTimeScope;
  metric: ShivMetric;
};

export type ShivQuery = {
  question: string;
  normalizedQuestion: string;
  tokens: string[];
  meaningfulTokens: string[];
  language: ShivLanguage;
  intent: ShivIntentSlots;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  appContext: Record<string, unknown>;
};

export type ShivEntity = {
  id: string;
  domain: Domain;
  name: string;
  text: string;
  aliases: string[];
  payload: Record<string, unknown>;
};

export type ShivEvidence = ShivEntity & {
  score: number;
  matchReason: string;
};

export type ShivIndex = {
  entities: ShivEntity[];
  byDomain: Record<Domain, ShivEntity[]>;
  meta: {
    todayKey: string;
    currentSlot: string;
    contextScopes: Record<string, boolean>;
  };
};

export type ShivGuardResult = {
  passed: boolean;
  reason?: string;
};

export type ShivDecision = {
  path: ShivPath;
  handlerId: string | null;
  confidence: number;
  answer: string;
  evidence: ShivEvidence[];
  usedDomains: Domain[];
  provider?: string;
  model?: string;
  guards: {
    relevance: ShivGuardResult;
    grounding: ShivGuardResult;
  };
};

export type ShivAnswerMeta = {
  path: ShivPath;
  handlerId: string | null;
  confidence: number;
  matchedEntities: Array<{ id: string; name: string }>;
  usedDomains: Domain[];
  guards: {
    relevance: ShivGuardResult;
    grounding: ShivGuardResult;
  };
};

export type HandlerResult = {
  handlerId: string;
  confidence: number;
  answer: string;
  usedDomains: Domain[];
  evidence: ShivEvidence[];
};
