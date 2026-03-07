import { normalizeText } from "@/lib/shiv/normalize";
import type { Domain, ShivIntentSlots, ShivMetric, ShivTimeScope } from "@/lib/shiv/types";

const hasAny = (value: string, terms: string[]) => terms.some((term) => value.includes(term));

const detectTimeScope = (q: string): ShivTimeScope => {
  if (q.includes("current slot")) return "current_slot";
  if (q.includes("today") || q.includes("todays") || q.includes("todays")) return "today";
  if (q.includes("next")) return "next";
  return "unspecified";
};

const compactTarget = (raw: string) =>
  normalizeText(raw)
    .replace(/\b(when|is|next|scheduled|schedule|due|how|many|days|remaining|left|for|to|until|what|my|current|slot|today|status|search|find|show)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractTargetPhrase = (question: string) => {
  const q = String(question || "").trim();
  const fromFor = q.match(/\b(?:for|to|until)\b\s+(.+)$/i)?.[1] || "";
  const fromWhen =
    q.match(/\bwhen\s+is\s+(.+?)\b(?:scheduled|schedule|due)\b/i)?.[1] ||
    q.match(/\bwhen\s+(.+?)\b(?:scheduled|schedule|due)\b/i)?.[1] ||
    q.match(/\bnext\s+(.+?)\b(?:scheduled|schedule|due)\b/i)?.[1] ||
    "";
  const seed = fromFor || fromWhen || q;
  return compactTarget(seed);
};

const buildIntent = (
  intentId: ShivIntentSlots["intentId"],
  expectedDomains: Domain[],
  metric: ShivMetric,
  timeScope: ShivTimeScope,
  targetPhrase: string
): ShivIntentSlots => ({ intentId, expectedDomains, metric, timeScope, targetPhrase });

export const detectIntentSlots = (question: string): ShivIntentSlots => {
  const q = normalizeText(question);
  const timeScope = detectTimeScope(q);
  const targetPhrase = extractTargetPhrase(question);

  if (hasAny(q, ["current weight", "latest weight", "my weight", "weight now"])) {
    return buildIntent("health.current_weight", ["health"], "current_weight", timeScope, targetPhrase);
  }
  if (hasAny(q, ["bothering", "botherings", "mismatch", "constraint", "external"])) {
    return buildIntent("botherings.list", ["bothering"], "list", timeScope === "unspecified" ? "all" : timeScope, targetPhrase);
  }
  if (
    (hasAny(q, ["how many days", "days remaining", "remaining", "left"]) && hasAny(q, ["for", "to", "until", "next", "schedule", "due"])) ||
    (q.includes("remaining") && q.includes("scheduled"))
  ) {
    return buildIntent("schedule.days_remaining", ["routine", "task"], "days_remaining", timeScope, targetPhrase);
  }
  if (hasAny(q, ["when is", "when", "next", "scheduled", "schedule", "due"]) && (q.includes("when") || q.includes("next"))) {
    return buildIntent("schedule.when_next", ["routine", "task"], "when_next", timeScope, targetPhrase);
  }
  if (hasAny(q, ["today tasks", "my tasks today", "current slot tasks", "tasks in current slot"])) {
    return buildIntent("tasks.today", ["task"], "list", timeScope === "unspecified" ? "today" : timeScope, targetPhrase);
  }
  if (hasAny(q, ["resource", "resources", "pdf", "book", "folder", "canvas", "find file", "notes"])) {
    return buildIntent("resources.search", ["resource", "canvas"], "search", timeScope, targetPhrase);
  }
  if (hasAny(q, ["skills", "skill", "upskill", "deepwork", "project", "logs", "learning progress"])) {
    return buildIntent("skills.summary", ["skill"], "summary", timeScope, targetPhrase);
  }

  return buildIntent("general", [], "general", timeScope, targetPhrase);
};
