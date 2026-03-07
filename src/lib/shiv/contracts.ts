import { formatDisplayDate } from "@/lib/shiv/formatters";
import { toPlainText } from "@/lib/shiv/normalize";
import type { ShivEvidence, ShivQuery } from "@/lib/shiv/types";

type ContractResult = {
  valid: boolean;
  repairedAnswer?: string;
  reason?: string;
};

const firstEvidence = (evidence: ShivEvidence[]) => evidence[0] || null;

const containsNumber = (value: string) => /\d+/.test(value);

export const validateCriticalAnswer = (
  query: ShivQuery,
  answer: string,
  evidence: ShivEvidence[]
): ContractResult => {
  const intent = query.intent.intentId;
  const clean = toPlainText(answer);
  const top = firstEvidence(evidence);

  if (intent === "schedule.when_next") {
    if (/\b(next|scheduled|date)\b/i.test(clean) && /\b\d{1,2}\b/.test(clean)) {
      return { valid: true };
    }
    const date = String(top?.payload?.nextDate || "").trim();
    const days = Number(top?.payload?.nextInDays);
    if (top && date && Number.isFinite(days)) {
      return {
        valid: false,
        reason: "missing_schedule_fields",
        repairedAnswer: `Next ${top.name}: ${formatDisplayDate(date)} (${Math.max(0, days)} days remaining).`,
      };
    }
  }

  if (intent === "schedule.days_remaining") {
    if (containsNumber(clean) && /\bdays?\b/i.test(clean)) return { valid: true };
    const date = String(top?.payload?.nextDate || "").trim();
    const days = Number(top?.payload?.nextInDays);
    if (top && Number.isFinite(days)) {
      return {
        valid: false,
        reason: "missing_days_remaining",
        repairedAnswer: `${top.name}: ${Math.max(0, days)} days remaining${date ? ` (next on ${formatDisplayDate(date)})` : ""}.`,
      };
    }
  }

  if (intent === "health.current_weight") {
    if (/\bweight\b/i.test(clean) && containsNumber(clean)) return { valid: true };
    const value = Number((top?.payload?.latestWeightLog as Record<string, unknown> | undefined)?.weight);
    const date = String((top?.payload?.latestWeightLog as Record<string, unknown> | undefined)?.date || "");
    if (top && Number.isFinite(value)) {
      return {
        valid: false,
        reason: "missing_weight_value",
        repairedAnswer: `Current weight: ${value}${date ? ` (logged ${formatDisplayDate(date)})` : ""}.`,
      };
    }
  }

  if (intent === "tasks.today" && /\btoday|current slot\b/i.test(query.normalizedQuestion)) {
    if (/\btasks?\b/i.test(clean) && containsNumber(clean)) return { valid: true };
  }

  return { valid: true };
};

export const attachEvidenceCitations = (
  query: ShivQuery,
  answer: string,
  evidence: ShivEvidence[]
) => {
  if (query.intent.intentId === "general") return toPlainText(answer);
  if (!evidence.length) return toPlainText(answer);
  if (/sources?:/i.test(answer)) return toPlainText(answer);

  const sources = evidence.slice(0, 3).map((item) => {
    const date = String(item.payload?.nextDate || item.payload?.date || "").trim();
    if (date) return `${item.name} (${item.domain}, ${formatDisplayDate(date)})`;
    return `${item.name} (${item.domain})`;
  });
  return `${toPlainText(answer)}\nSources: ${sources.join(" | ")}`;
};
