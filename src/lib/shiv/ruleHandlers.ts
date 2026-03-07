import patternsCatalog from "@/lib/shiv/catalog/patterns.json";
import { formatDisplayDate, formatRemaining } from "@/lib/shiv/formatters";
import { meaningfulTokens, normalizeText, tokenOverlapRatio } from "@/lib/shiv/normalize";
import type { Domain, HandlerResult, ShivEvidence, ShivIndex, ShivQuery } from "@/lib/shiv/types";

type AnyRecord = Record<string, unknown>;

type RuleContext = {
  query: ShivQuery;
  index: ShivIndex;
  evidence: ShivEvidence[];
  byDomain: Record<Domain, ShivEvidence[]>;
};

type RuleHandler = {
  id: string;
  match: (ctx: RuleContext) => number;
  run: (ctx: RuleContext) => HandlerResult | null;
};

const patterns = (patternsCatalog as Record<string, unknown>) || {};

const queryIncludesCue = (query: ShivQuery, key: string) => {
  const cues = Array.isArray((patterns[key] as AnyRecord)?.cues) ? (((patterns[key] as AnyRecord).cues as string[]) || []) : [];
  const q = query.normalizedQuestion;
  if (!q || !cues.length) return false;
  return cues.some((cue) => q.includes(normalizeText(cue)));
};

const pickTop = (items: ShivEvidence[], limit = 5) => items.slice(0, limit);

const uniqueDomains = (evidence: ShivEvidence[]): Domain[] => Array.from(new Set(evidence.map((entry) => entry.domain)));

const clarifyWithCandidates = (items: ShivEvidence[], label: string): HandlerResult | null => {
  const top = pickTop(items, 3);
  if (!top.length) return null;
  return {
    handlerId: "clarify.candidates",
    confidence: 0.45,
    answer: `I found multiple ${label} matches: ${top.map((item) => item.name).join(", ")}. Which one do you mean?`,
    usedDomains: uniqueDomains(top),
    evidence: top,
  };
};

const parseDate = (dateKey: string) => {
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const toDateKey = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const addMonths = (date: Date, months: number) => {
  const out = new Date(date);
  const day = out.getDate();
  out.setDate(1);
  out.setMonth(out.getMonth() + months);
  const lastDay = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(day, lastDay));
  out.setHours(0, 0, 0, 0);
  return out;
};

const diffDays = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));

const findLastScheduledDate = (ctx: RuleContext, targetName: string) => {
  const recentSchedule = (ctx.query.appContext.recentSchedule || {}) as Record<string, unknown>;
  const target = normalizeText(targetName);
  const keys = Object.keys(recentSchedule).sort();
  let last: string | null = null;
  for (const key of keys) {
    const day = (recentSchedule[key] || {}) as AnyRecord;
    for (const slot of Object.keys(day)) {
      const activities = Array.isArray(day[slot]) ? (day[slot] as AnyRecord[]) : [];
      const found = activities.some((activity) => normalizeText(String(activity.details || "")) === target);
      if (found) {
        if (!last || key > last) last = key;
      }
    }
  }
  return last;
};

const getRoutineRule = (ctx: RuleContext, routineId: string | undefined, routineName: string) => {
  const routines = Array.isArray((ctx.query.appContext.settings as AnyRecord)?.routines)
    ? (((ctx.query.appContext.settings as AnyRecord).routines as AnyRecord[]) || [])
    : [];
  const byId = routineId ? routines.find((routine) => String(routine.id) === routineId) : null;
  if (byId) return (byId.routine || null) as AnyRecord | null;
  const target = normalizeText(routineName);
  let best: AnyRecord | null = null;
  let bestScore = 0;
  for (const routine of routines) {
    const details = normalizeText(String(routine.details || ""));
    const score = tokenOverlapRatio(meaningfulTokens(target), meaningfulTokens(details));
    if (score > bestScore) {
      bestScore = score;
      best = routine;
    }
  }
  return (best?.routine || null) as AnyRecord | null;
};

const computeStrictFuture = (
  todayKey: string,
  fallbackNextDate: string | null,
  lastDateKey: string | null,
  rule: AnyRecord | null
) => {
  const today = parseDate(todayKey);
  if (!today || !rule) return null;

  const base = parseDate(lastDateKey || fallbackNextDate || "");
  if (!base) return null;

  const type = String(rule.type || "").toLowerCase();
  let cursor = new Date(base);
  cursor.setHours(0, 0, 0, 0);

  const step = () => {
    if (type === "daily") {
      cursor.setDate(cursor.getDate() + 1);
      return;
    }
    if (type === "weekly") {
      cursor.setDate(cursor.getDate() + 7);
      return;
    }
    if (type === "custom") {
      const interval = Math.max(1, Number(rule.repeatInterval ?? rule.days ?? 1));
      const unit = String(rule.repeatUnit || "day").toLowerCase();
      if (unit === "month") {
        cursor = addMonths(cursor, interval);
        return;
      }
      if (unit === "week") {
        cursor.setDate(cursor.getDate() + interval * 7);
        return;
      }
      cursor.setDate(cursor.getDate() + interval);
      return;
    }
    cursor.setDate(cursor.getDate() + 1);
  };

  if (cursor.getTime() <= today.getTime()) step();
  while (cursor.getTime() <= today.getTime()) step();

  return {
    nextDate: toDateKey(cursor),
    nextInDays: Math.max(0, diffDays(today, cursor)),
  };
};

const withTargetFilter = (items: ShivEvidence[], targetPhrase: string) => {
  const targetNorm = normalizeText(targetPhrase);
  if (!targetNorm) return items;
  const filtered = items.filter((item) => {
    const nameNorm = normalizeText(item.name);
    return (
      nameNorm.includes(targetNorm) ||
      targetNorm.includes(nameNorm) ||
      item.aliases.some((alias) => {
        const normAlias = normalizeText(alias);
        return normAlias.includes(targetNorm) || targetNorm.includes(normAlias);
      })
    );
  });
  return filtered.length ? filtered : items;
};

const maybeDisambiguate = (items: ShivEvidence[], label: string): HandlerResult | null => {
  if (items.length < 2) return null;
  const [a, b] = items;
  const closeScore = Math.abs(a.score - b.score) <= 0.08 && b.score >= 0.3;
  const distinct = normalizeText(a.name) !== normalizeText(b.name);
  if (!closeScore || !distinct) return null;
  return clarifyWithCandidates(items, label);
};

const isGenericSchedulePrompt = (query: ShivQuery) => {
  if (query.intent.intentId !== "schedule.when_next" && query.intent.intentId !== "schedule.days_remaining") {
    return false;
  }
  const target = normalizeText(query.intent.targetPhrase || "");
  if (!target) return true;
  const genericTargets = new Set(["date", "next date", "schedule", "scheduled", "due", "next"]);
  if (genericTargets.has(target)) return true;
  return query.meaningfulTokens.length <= 3 && /\bnext date\b/.test(query.normalizedQuestion);
};

const pickSoonestScheduled = (items: ShivEvidence[]) => {
  const withNext = items
    .map((item) => {
      const nextDate = String(item.payload.nextDate || "").trim();
      const nextInDays = Number(item.payload.nextInDays);
      if (!nextDate || !Number.isFinite(nextInDays) || nextInDays < 0) return null;
      return { item, nextDate, nextInDays };
    })
    .filter(Boolean) as Array<{ item: ShivEvidence; nextDate: string; nextInDays: number }>;
  if (!withNext.length) return null;
  withNext.sort((a, b) => a.nextInDays - b.nextInDays || b.item.score - a.item.score);
  return withNext[0];
};

const botheringsHandler: RuleHandler = {
  id: "botherings.list",
  match: (ctx) => (ctx.query.intent.intentId === "botherings.list" || queryIncludesCue(ctx.query, "botherings.list") ? 0.95 : 0),
  run: (ctx) => {
    const pending = withTargetFilter(
      ctx.byDomain.bothering.filter((item) => !Boolean(item.payload.completed)),
      ctx.query.intent.targetPhrase
    );
    const mode = ctx.query.intent.timeScope;

    const scoped = pending.filter((item) => {
      if (mode === "current_slot") return Boolean(item.payload.hasCurrentSlotLinkedTask);
      if (mode === "today") return Boolean(item.payload.hasTodayLinkedTask);
      return true;
    });

    if (!scoped.length) {
      if (mode === "current_slot") {
        return { handlerId: "botherings.list", confidence: 0.9, answer: "Current slot botherings: 0 pending.", usedDomains: ["bothering"], evidence: [] };
      }
      if (mode === "today") {
        return { handlerId: "botherings.list", confidence: 0.9, answer: "Today botherings: 0 pending.", usedDomains: ["bothering"], evidence: [] };
      }
      return { handlerId: "botherings.list", confidence: 0.9, answer: "Botherings: 0 pending.", usedDomains: ["bothering"], evidence: [] };
    }

    const list = scoped.slice(0, 6).map((item, idx) => `${idx + 1}. ${item.name}`);
    const prefix = mode === "current_slot" ? "Current slot botherings" : mode === "today" ? "Today botherings" : "Botherings";

    return {
      handlerId: "botherings.list",
      confidence: 0.93,
      answer: `${prefix}: ${scoped.length} pending.\n${list.join("\n")}`,
      usedDomains: ["bothering"],
      evidence: scoped.slice(0, 6),
    };
  },
};

const scheduleWhenNextHandler: RuleHandler = {
  id: "schedule.when_next",
  match: (ctx) => (ctx.query.intent.intentId === "schedule.when_next" || queryIncludesCue(ctx.query, "schedule.when_next") ? 0.9 : 0),
  run: (ctx) => {
    const candidates = withTargetFilter(
      ctx.evidence.filter((entry) => entry.domain === "routine" || entry.domain === "task"),
      ctx.query.intent.targetPhrase
    );

    const ambiguity = maybeDisambiguate(candidates, "task/routine");
    if (ambiguity) return ambiguity;

    const topRoutine = candidates[0];
    if (!topRoutine || topRoutine.score < 0.24) {
      if (isGenericSchedulePrompt(ctx.query)) {
        const soonest = pickSoonestScheduled(ctx.byDomain.routine.concat(ctx.byDomain.task));
        if (soonest) {
          const remaining = formatRemaining(soonest.nextInDays);
          return {
            handlerId: "schedule.when_next",
            confidence: 0.84,
            answer: `Next scheduled item: ${soonest.item.name} on ${formatDisplayDate(soonest.nextDate)} (${remaining.days} days remaining).`,
            usedDomains: [soonest.item.domain],
            evidence: [soonest.item],
          };
        }
      }
      return clarifyWithCandidates(ctx.byDomain.routine.concat(ctx.byDomain.task), "task/routine");
    }

    let nextDate = String(topRoutine.payload.nextDate || "") || null;
    let nextInDays = Number.isFinite(Number(topRoutine.payload.nextInDays)) ? Number(topRoutine.payload.nextInDays) : null;

    if (ctx.query.intent.timeScope === "next") {
      const routineId = String(topRoutine.payload.id || topRoutine.id || "");
      const lastDate = findLastScheduledDate(ctx, topRoutine.name);
      const rule = getRoutineRule(ctx, routineId, topRoutine.name);
      const strict = computeStrictFuture(ctx.index.meta.todayKey, nextDate, lastDate, rule);
      if (strict) {
        nextDate = strict.nextDate;
        nextInDays = strict.nextInDays;
      }
    }

    if (!nextDate || nextInDays === null) {
      return {
        handlerId: "schedule.when_next",
        confidence: 0.62,
        answer: `I found ${topRoutine.name}, but next date is unavailable in current context.`,
        usedDomains: [topRoutine.domain],
        evidence: [topRoutine],
      };
    }

    const remaining = formatRemaining(nextInDays);
    return {
      handlerId: "schedule.when_next",
      confidence: 0.92,
      answer: `Next ${topRoutine.name}: ${formatDisplayDate(nextDate)} (${remaining.days} days remaining).`,
      usedDomains: [topRoutine.domain],
      evidence: [topRoutine],
    };
  },
};

const scheduleDaysRemainingHandler: RuleHandler = {
  id: "schedule.days_remaining",
  match: (ctx) => (ctx.query.intent.intentId === "schedule.days_remaining" || queryIncludesCue(ctx.query, "schedule.days_remaining") ? 0.9 : 0),
  run: (ctx) => {
    const candidates = withTargetFilter(
      ctx.evidence.filter((entry) => entry.domain === "routine" || entry.domain === "task"),
      ctx.query.intent.targetPhrase
    );

    const ambiguity = maybeDisambiguate(candidates, "task/routine");
    if (ambiguity) return ambiguity;

    const topRoutine = candidates[0];
    if (!topRoutine || topRoutine.score < 0.24) {
      if (isGenericSchedulePrompt(ctx.query)) {
        const soonest = pickSoonestScheduled(ctx.byDomain.routine.concat(ctx.byDomain.task));
        if (soonest) {
          return {
            handlerId: "schedule.days_remaining",
            confidence: 0.84,
            answer: `${soonest.item.name}: ${Math.max(0, soonest.nextInDays)} days remaining (next on ${formatDisplayDate(soonest.nextDate)}).`,
            usedDomains: [soonest.item.domain],
            evidence: [soonest.item],
          };
        }
      }
      return clarifyWithCandidates(ctx.byDomain.routine.concat(ctx.byDomain.task), "task/routine");
    }

    let nextDate = String(topRoutine.payload.nextDate || "") || null;
    let days = Number.isFinite(Number(topRoutine.payload.nextInDays)) ? Number(topRoutine.payload.nextInDays) : null;

    if (ctx.query.intent.timeScope === "next") {
      const routineId = String(topRoutine.payload.id || topRoutine.id || "");
      const lastDate = findLastScheduledDate(ctx, topRoutine.name);
      const rule = getRoutineRule(ctx, routineId, topRoutine.name);
      const strict = computeStrictFuture(ctx.index.meta.todayKey, nextDate, lastDate, rule);
      if (strict) {
        nextDate = strict.nextDate;
        days = strict.nextInDays;
      }
    }

    if (days === null) {
      return {
        handlerId: "schedule.days_remaining",
        confidence: 0.64,
        answer: `I found ${topRoutine.name}, but remaining days are unavailable in current context.`,
        usedDomains: [topRoutine.domain],
        evidence: [topRoutine],
      };
    }

    return {
      handlerId: "schedule.days_remaining",
      confidence: 0.92,
      answer: `${topRoutine.name}: ${Math.max(0, days)} days remaining${nextDate ? ` (next on ${formatDisplayDate(nextDate)})` : ""}.`,
      usedDomains: [topRoutine.domain],
      evidence: [topRoutine],
    };
  },
};

const tasksTodayHandler: RuleHandler = {
  id: "tasks.today",
  match: (ctx) => (ctx.query.intent.intentId === "tasks.today" || queryIncludesCue(ctx.query, "tasks.today") ? 0.88 : 0),
  run: (ctx) => {
    const allToday = ctx.byDomain.task.filter((entry) => String(entry.payload.source || "") === "today.tasks");
    const currentSlot = ctx.index.meta.currentSlot;
    const mode = ctx.query.intent.timeScope;
    const scoped = mode === "current_slot" ? allToday.filter((entry) => String(entry.payload.slot || "") === currentSlot) : allToday;

    if (!scoped.length) {
      return {
        handlerId: "tasks.today",
        confidence: 0.88,
        answer: mode === "current_slot" ? `Current slot tasks: 0 in ${currentSlot || "unknown"}.` : "Today tasks: 0.",
        usedDomains: ["task"],
        evidence: [],
      };
    }

    const pending = scoped.filter((entry) => !Boolean(entry.payload.completed));
    const lines = (pending.length ? pending : scoped).slice(0, 6).map((entry, idx) => `${idx + 1}. ${entry.name}`);

    return {
      handlerId: "tasks.today",
      confidence: 0.9,
      answer:
        mode === "current_slot"
          ? `Current slot tasks (${currentSlot}): ${scoped.length} total, ${pending.length} pending.\n${lines.join("\n")}`
          : `Today tasks: ${scoped.length} total, ${pending.length} pending.\n${lines.join("\n")}`,
      usedDomains: ["task"],
      evidence: scoped.slice(0, 6),
    };
  },
};

const resourcesSearchHandler: RuleHandler = {
  id: "resources.search",
  match: (ctx) => (ctx.query.intent.intentId === "resources.search" || queryIncludesCue(ctx.query, "resources.search") ? 0.85 : 0),
  run: (ctx) => {
    const items = withTargetFilter(ctx.byDomain.resource, ctx.query.intent.targetPhrase);
    if (!items.length) {
      return { handlerId: "resources.search", confidence: 0.82, answer: "No matching resources found.", usedDomains: ["resource"], evidence: [] };
    }
    return {
      handlerId: "resources.search",
      confidence: 0.9,
      answer: `Top resources: ${items.slice(0, 6).map((entry) => entry.name).join(" | ")}`,
      usedDomains: ["resource"],
      evidence: items.slice(0, 6),
    };
  },
};

const skillsSummaryHandler: RuleHandler = {
  id: "skills.summary",
  match: (ctx) => (ctx.query.intent.intentId === "skills.summary" || queryIncludesCue(ctx.query, "skills.summary") ? 0.82 : 0),
  run: (ctx) => {
    const items = withTargetFilter(ctx.byDomain.skill, ctx.query.intent.targetPhrase);
    if (!items.length) {
      return { handlerId: "skills.summary", confidence: 0.8, answer: "Skills data is unavailable in current context.", usedDomains: ["skill"], evidence: [] };
    }
    const logs = items.find((entry) => entry.id === "logs-summary") || ctx.byDomain.skill.find((entry) => entry.id === "logs-summary");
    const top = items.filter((entry) => entry.id !== "logs-summary").slice(0, 5);
    const logText = logs
      ? `Logs: upskill ${Number(logs.payload.upskillLogsCount || 0)}, deepwork ${Number(logs.payload.deepWorkLogsCount || 0)}, workout ${Number(logs.payload.workoutLogsCount || 0)}, mindset ${Number(logs.payload.mindsetLogsCount || 0)}.`
      : "Logs summary unavailable.";
    const topText = top.length ? `Top: ${top.map((entry) => entry.name).join(" | ")}` : "";

    return {
      handlerId: "skills.summary",
      confidence: 0.88,
      answer: `${logText}${topText ? ` ${topText}` : ""}`,
      usedDomains: ["skill"],
      evidence: (logs ? [logs, ...top] : top).slice(0, 6),
    };
  },
};

const healthWeightHandler: RuleHandler = {
  id: "health.current_weight",
  match: (ctx) => (ctx.query.intent.intentId === "health.current_weight" || queryIncludesCue(ctx.query, "health.current_weight") ? 0.95 : 0),
  run: (ctx) => {
    const weight = ctx.byDomain.health.find((entry) => entry.id === "health-latest-weight") || ctx.byDomain.health[0];
    if (!weight) {
      return {
        handlerId: "health.current_weight",
        confidence: 0.9,
        answer: "Current weight is unavailable. Enable Health context and add weight logs.",
        usedDomains: ["health"],
        evidence: [],
      };
    }

    const log = (weight.payload.latestWeightLog || {}) as AnyRecord;
    const value = Number(log.weight);
    const date = String(log.date || "");
    if (!Number.isFinite(value)) {
      return {
        handlerId: "health.current_weight",
        confidence: 0.9,
        answer: "Current weight is unavailable in numeric form.",
        usedDomains: ["health"],
        evidence: [weight],
      };
    }

    return {
      handlerId: "health.current_weight",
      confidence: 0.96,
      answer: `Current weight: ${value}${date ? ` (logged ${formatDisplayDate(date)})` : ""}.`,
      usedDomains: ["health"],
      evidence: [weight],
    };
  },
};

const handlers: RuleHandler[] = [
  botheringsHandler,
  scheduleDaysRemainingHandler,
  scheduleWhenNextHandler,
  healthWeightHandler,
  tasksTodayHandler,
  resourcesSearchHandler,
  skillsSummaryHandler,
];

export const runDeterministicHandlers = (ctx: RuleContext): HandlerResult | null => {
  const ranked = handlers
    .map((handler) => ({ handler, confidence: handler.match(ctx) }))
    .filter((entry) => entry.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence);

  if (!ranked.length) return null;

  const top = ranked[0];
  const result = top.handler.run(ctx);
  if (!result) return null;

  if (result.confidence < 0.55) {
    const clarify = clarifyWithCandidates(ctx.evidence, "possible");
    if (clarify) return clarify;
  }

  return result;
};
