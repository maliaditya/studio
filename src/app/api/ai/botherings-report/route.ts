import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider } from "@/lib/ai/providerRouter";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

type BreakdownItem = {
  label?: string;
  value?: number;
  hours?: number;
  completionRate?: number;
  note?: string;
};

type BotheringItem = {
  id?: string;
  text?: string;
  sourceType?: string;
  totalHours?: number;
  pending?: number;
  scheduled?: number;
  completed?: number;
  completionRate?: number;
  missedDays?: number;
  note?: string;
};

type DashboardPayload = {
  month?: string;
  view?: string;
  typeFilter?: string;
  totals?: {
    completed?: number;
    scheduled?: number;
    percent?: number;
    loggedHours?: number;
    activeBotherings?: number;
    activeDays?: number;
  };
  productivity?: {
    monthHours?: number;
    avgDayHours?: number;
    avgWeekHours?: number;
    rolling30DayHours?: number;
    rolling30AvgDayHours?: number;
    rolling30AvgActiveDayHours?: number;
    activeDays?: number;
  };
  slotBreakdown?: BreakdownItem[];
  weeklyBreakdown?: BreakdownItem[];
  dailyLoad?: BreakdownItem[];
  sourceSummary?: Record<
    string,
    {
      botherings?: number;
      tasks?: number;
      scheduled?: number;
      completed?: number;
      totalMinutes?: number;
      totalHours?: number;
    }
  >;
  topBotherings?: BotheringItem[];
  topBotheringsByTime?: BotheringItem[];
  topBotheringsByPending?: BotheringItem[];
  bestSlot?: {
    label?: string;
    hours?: number;
    completionRate?: number;
    note?: string;
  };
};

type StructuredReport = {
  summary: {
    headline: string;
    periodLabel: string;
    bestSlot: string;
    monthHours: number;
    avgDayHours: number;
    avgWeekHours: number;
  };
  productivity: {
    monthCompleted: number;
    monthScheduled: number;
    completionRate: number;
    activeDays: number;
    rolling30DayHours: number;
  };
  timePatterns: {
    slotBreakdown: Array<{
      label: string;
      hours: number;
      completionRate: number;
      note: string;
    }>;
    bestSlotReason: string;
    heavyDays: Array<{
      label: string;
      hours: number;
      note: string;
    }>;
    weeklyBreakdown: Array<{
      label: string;
      hours: number;
    }>;
  };
  workload: {
    monthHours: number;
    avgDayHours: number;
    avgWeekHours: number;
    rolling30AvgDayHours: number;
    rolling30AvgActiveDayHours: number;
    note: string;
  };
  botherings: {
    topByTime: Array<{
      id: string;
      text: string;
      sourceType: string;
      totalHours: number;
      pending: number;
      completionRate: number;
      note: string;
    }>;
    topByPending: Array<{
      id: string;
      text: string;
      sourceType: string;
      pending: number;
      totalHours: number;
      missedDays: number;
      note: string;
    }>;
    sourceDistribution: Array<{
      label: string;
      count: number;
      hours: number;
      completionRate: number;
    }>;
    predictions: Array<{
      id: string;
      text: string;
      sourceType: string;
      severity: string;
      prediction: string;
    }>;
    keyPattern: string;
  };
  suggestions: {
    timeUse: string[];
    botheringActions: string[];
  };
  nextActions: {
    items: string[];
  };
};

const coerceNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const coerceString = (value: unknown, fallback = "") => {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const stripFences = (input: string) =>
  input
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

const tryParseJson = (input: string) => {
  try {
    return JSON.parse(stripFences(input));
  } catch {
    return null;
  }
};

const summarizeSourceSummary = (sourceSummary: DashboardPayload["sourceSummary"]) => {
  return Object.entries(sourceSummary || {}).map(([label, value]) => {
    const scheduled = coerceNumber(value?.scheduled);
    const completed = coerceNumber(value?.completed);
    return {
      label,
      count: coerceNumber(value?.botherings),
      hours: coerceNumber(value?.totalHours, Number(((value?.totalMinutes || 0) / 60).toFixed(1))),
      completionRate: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0,
    };
  });
};

const buildEvidencePack = (dashboard: DashboardPayload) => {
  const slotBreakdown = asArray<BreakdownItem>(dashboard.slotBreakdown)
    .map((item) => ({
      label: coerceString(item.label, "Unknown"),
      hours: coerceNumber(item.hours ?? item.value),
      completionRate: coerceNumber(item.completionRate),
      note: coerceString(item.note),
    }))
    .sort((a, b) => b.hours - a.hours);

  const weeklyBreakdown = asArray<BreakdownItem>(dashboard.weeklyBreakdown)
    .map((item) => ({
      label: coerceString(item.label, "Week"),
      hours: coerceNumber(item.hours ?? item.value),
    }))
    .sort((a, b) => b.hours - a.hours);

  const heavyDays = asArray<BreakdownItem>(dashboard.dailyLoad)
    .map((item) => ({
      label: coerceString(item.label, "Day"),
      hours: coerceNumber(item.hours ?? item.value),
      scheduled: coerceNumber((item as any).scheduled),
      completed: coerceNumber((item as any).completed),
      note: coerceString(item.note),
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  const topByTime = asArray<BotheringItem>(dashboard.topBotheringsByTime?.length ? dashboard.topBotheringsByTime : dashboard.topBotherings)
    .map((item) => ({
      id: coerceString(item.id),
      text: coerceString(item.text, "Untitled bothering"),
      sourceType: coerceString(item.sourceType, "unknown"),
      totalHours: coerceNumber(item.totalHours),
      pending: coerceNumber(item.pending),
      scheduled: coerceNumber(item.scheduled),
      completed: coerceNumber(item.completed),
      completionRate: coerceNumber(item.completionRate),
      missedDays: coerceNumber(item.missedDays),
      note: coerceString(item.note),
    }))
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 5);

  const topByPending = asArray<BotheringItem>(dashboard.topBotheringsByPending?.length ? dashboard.topBotheringsByPending : dashboard.topBotherings)
    .map((item) => ({
      id: coerceString(item.id),
      text: coerceString(item.text, "Untitled bothering"),
      sourceType: coerceString(item.sourceType, "unknown"),
      totalHours: coerceNumber(item.totalHours),
      pending: coerceNumber(item.pending),
      scheduled: coerceNumber(item.scheduled),
      completed: coerceNumber(item.completed),
      completionRate: coerceNumber(item.completionRate),
      missedDays: coerceNumber(item.missedDays),
      note: coerceString(item.note),
    }))
    .sort((a, b) => b.pending - a.pending || b.missedDays - a.missedDays || b.totalHours - a.totalHours)
    .slice(0, 5);

  const sourceDistribution = summarizeSourceSummary(dashboard.sourceSummary);
  const bestSlot = dashboard.bestSlot || slotBreakdown[0] || {};

  return {
    month: coerceString(dashboard.month, "Current Month"),
    typeFilter: coerceString(dashboard.typeFilter, "all"),
    summary: {
      monthHours: coerceNumber(dashboard.productivity?.monthHours ?? dashboard.totals?.loggedHours),
      avgDayHours: coerceNumber(dashboard.productivity?.avgDayHours),
      avgWeekHours: coerceNumber(dashboard.productivity?.avgWeekHours),
      rolling30DayHours: coerceNumber(dashboard.productivity?.rolling30DayHours),
      rolling30AvgDayHours: coerceNumber(dashboard.productivity?.rolling30AvgDayHours),
      rolling30AvgActiveDayHours: coerceNumber(dashboard.productivity?.rolling30AvgActiveDayHours),
      monthCompleted: coerceNumber(dashboard.totals?.completed),
      monthScheduled: coerceNumber(dashboard.totals?.scheduled),
      completionRate: coerceNumber(dashboard.totals?.percent),
      activeDays: coerceNumber(dashboard.productivity?.activeDays ?? dashboard.totals?.activeDays),
      activeBotherings: coerceNumber(dashboard.totals?.activeBotherings),
      bestSlot: {
        label: coerceString(bestSlot.label, "Unknown"),
        hours: coerceNumber((bestSlot as any).hours ?? (bestSlot as any).value),
        completionRate: coerceNumber((bestSlot as any).completionRate),
        note: coerceString((bestSlot as any).note),
      },
    },
    slotBreakdown,
    weeklyBreakdown,
    heavyDays,
    topByTime,
    topByPending,
    sourceDistribution,
  };
};

const buildFallbackReport = (evidence: ReturnType<typeof buildEvidencePack>): StructuredReport => {
  const bestSlot = evidence.summary.bestSlot;
  const strongestSource = [...evidence.sourceDistribution].sort((a, b) => b.hours - a.hours)[0];
  const topTime = evidence.topByTime.slice(0, 3).map((item) => ({
    id: item.id,
    text: item.text,
    sourceType: item.sourceType,
    totalHours: item.totalHours,
    pending: item.pending,
    completionRate: item.completionRate,
    note:
      item.note ||
      `${item.totalHours.toFixed(1)}h logged, ${item.pending} pending, ${item.completionRate}% completion.`,
  }));
  const topPending = evidence.topByPending.slice(0, 3).map((item) => ({
    id: item.id,
    text: item.text,
    sourceType: item.sourceType,
    pending: item.pending,
    totalHours: item.totalHours,
    missedDays: item.missedDays,
    note:
      item.note ||
      `${item.pending} pending occurrences and ${item.missedDays} missed days in the visible month.`,
  }));
  const predictions = evidence.topByPending.slice(0, 4).map((item) => {
    const severity =
      item.pending >= 6 || item.missedDays >= 6 ? "high" : item.pending >= 3 || item.missedDays >= 3 ? "medium" : "low";
    let prediction = "";
    if (item.completed === 0 && item.scheduled > 0) {
      prediction = `${item.text}: no task progress is being logged, so this bothering is likely to keep increasing because there is no visible work moving it in the opposite direction.`;
    } else if (item.pending > item.completed && item.scheduled > 0) {
      prediction = `${item.text}: completion is lagging behind the scheduled load, so this bothering is likely to stay active and create recurring drag unless the task load is reduced or finished more consistently.`;
    } else if (item.totalHours === 0 && item.pending > 0) {
      prediction = `${item.text}: tasks exist but no work time is being captured, so this bothering is likely remaining conceptual instead of operational.`;
    } else {
      prediction = `${item.text}: current progress is present but still fragile, so this bothering may continue resurfacing if the completion rate drops again.`;
    }
    return {
      id: item.id,
      text: item.text,
      sourceType: item.sourceType,
      severity,
      prediction,
    };
  });

  return {
    summary: {
      headline: `${bestSlot.label} is currently your strongest time window, with ${evidence.summary.monthHours.toFixed(
        1
      )} hours logged in ${evidence.month}.`,
      periodLabel: `${evidence.month} + rolling 30 days`,
      bestSlot: bestSlot.label,
      monthHours: evidence.summary.monthHours,
      avgDayHours: evidence.summary.avgDayHours,
      avgWeekHours: evidence.summary.avgWeekHours,
    },
    productivity: {
      monthCompleted: evidence.summary.monthCompleted,
      monthScheduled: evidence.summary.monthScheduled,
      completionRate: evidence.summary.completionRate,
      activeDays: evidence.summary.activeDays,
      rolling30DayHours: evidence.summary.rolling30DayHours,
    },
    timePatterns: {
      slotBreakdown: evidence.slotBreakdown.slice(0, 6).map((item) => ({
        label: item.label,
        hours: item.hours,
        completionRate: item.completionRate,
        note: item.note || `${item.hours.toFixed(1)}h logged in ${item.label}.`,
      })),
      bestSlotReason:
        bestSlot.note ||
        `${bestSlot.label} leads by logged hours${bestSlot.completionRate > 0 ? ` and is running at ${bestSlot.completionRate}% completion` : ""}.`,
      heavyDays: evidence.heavyDays.map((day) => ({
        label: day.label,
        hours: day.hours,
        note:
          day.note ||
          `${day.hours.toFixed(1)}h logged, ${coerceNumber((day as any).completed)}/${coerceNumber((day as any).scheduled)} completed.`,
      })),
      weeklyBreakdown: evidence.weeklyBreakdown.slice(0, 5).map((item) => ({
        label: item.label,
        hours: item.hours,
      })),
    },
    workload: {
      monthHours: evidence.summary.monthHours,
      avgDayHours: evidence.summary.avgDayHours,
      avgWeekHours: evidence.summary.avgWeekHours,
      rolling30AvgDayHours: evidence.summary.rolling30AvgDayHours,
      rolling30AvgActiveDayHours: evidence.summary.rolling30AvgActiveDayHours,
      note:
        evidence.summary.avgWeekHours >= evidence.summary.avgDayHours * 6
          ? "Workload is clustered into a few heavier days each week."
          : "Workload appears relatively spread across the visible month.",
    },
    botherings: {
      topByTime: topTime,
      topByPending: topPending,
      sourceDistribution: evidence.sourceDistribution,
      predictions,
      keyPattern: strongestSource
        ? `${strongestSource.label} is the largest bothering source by logged hours.`
        : "No dominant bothering source was detected.",
    },
    suggestions: {
      timeUse: [
        `Protect ${bestSlot.label} for your highest-friction work because it currently produces the strongest logged output.`,
        "Batch lower-value admin work into weaker slots instead of spreading it across strong slots.",
        "Use heavy days as anchors and leave lighter days for recovery, cleanup, or spillover work.",
      ],
      botheringActions: [
        topPending[0]
          ? `Reduce pressure on ${topPending[0].text} by decomposing it into smaller scheduled units.`
          : "Decompose the highest-pending bothering into smaller tasks.",
        topTime[0]
          ? `Audit whether ${topTime[0].text} is consuming time proportionate to its value.`
          : "Audit the most time-consuming bothering for unnecessary work.",
        strongestSource
          ? `Review ${strongestSource.label} botherings first because they dominate the current load.`
          : "Review the current bothering mix and remove the noisiest source first.",
      ],
    },
    nextActions: {
      items: [
        `Reserve the next 3 ${bestSlot.label} blocks for high-priority execution.`,
        "Pick one high-pending bothering and break it into concrete sub-tasks.",
        "Move one low-value task out of your strongest slot this week.",
        "Review heavy days and identify which one should be intentionally lighter next week.",
      ],
    },
  };
};

const normalizeReport = (value: unknown, evidence: ReturnType<typeof buildEvidencePack>): StructuredReport => {
  const fallback = buildFallbackReport(evidence);
  const input = (value && typeof value === "object" ? value : {}) as Record<string, any>;

  const summaryInput = (input.summary && typeof input.summary === "object" ? input.summary : {}) as Record<string, any>;
  const productivityInput = (input.productivity && typeof input.productivity === "object" ? input.productivity : {}) as Record<string, any>;
  const timePatternsInput = (input.timePatterns && typeof input.timePatterns === "object" ? input.timePatterns : {}) as Record<string, any>;
  const workloadInput = (input.workload && typeof input.workload === "object" ? input.workload : {}) as Record<string, any>;
  const botheringsInput = (input.botherings && typeof input.botherings === "object" ? input.botherings : {}) as Record<string, any>;
  const suggestionsInput = (input.suggestions && typeof input.suggestions === "object" ? input.suggestions : {}) as Record<string, any>;
  const nextActionsInput = (input.nextActions && typeof input.nextActions === "object" ? input.nextActions : {}) as Record<string, any>;

  const normalized: StructuredReport = {
    summary: {
      headline: coerceString(summaryInput.headline, fallback.summary.headline),
      periodLabel: coerceString(summaryInput.periodLabel, fallback.summary.periodLabel),
      bestSlot: coerceString(summaryInput.bestSlot, fallback.summary.bestSlot),
      monthHours: coerceNumber(summaryInput.monthHours, fallback.summary.monthHours),
      avgDayHours: coerceNumber(summaryInput.avgDayHours, fallback.summary.avgDayHours),
      avgWeekHours: coerceNumber(summaryInput.avgWeekHours, fallback.summary.avgWeekHours),
    },
    productivity: {
      monthCompleted: coerceNumber(productivityInput.monthCompleted, fallback.productivity.monthCompleted),
      monthScheduled: coerceNumber(productivityInput.monthScheduled, fallback.productivity.monthScheduled),
      completionRate: coerceNumber(productivityInput.completionRate, fallback.productivity.completionRate),
      activeDays: coerceNumber(productivityInput.activeDays, fallback.productivity.activeDays),
      rolling30DayHours: coerceNumber(productivityInput.rolling30DayHours, fallback.productivity.rolling30DayHours),
    },
    timePatterns: {
      slotBreakdown: asArray<any>(timePatternsInput.slotBreakdown)
        .slice(0, 6)
        .map((item, index) => ({
          label: coerceString(item?.label, fallback.timePatterns.slotBreakdown[index]?.label || "Slot"),
          hours: coerceNumber(item?.hours, fallback.timePatterns.slotBreakdown[index]?.hours || 0),
          completionRate: coerceNumber(
            item?.completionRate,
            fallback.timePatterns.slotBreakdown[index]?.completionRate || 0
          ),
          note: coerceString(item?.note, fallback.timePatterns.slotBreakdown[index]?.note || ""),
        })),
      bestSlotReason: coerceString(timePatternsInput.bestSlotReason, fallback.timePatterns.bestSlotReason),
      heavyDays: asArray<any>(timePatternsInput.heavyDays)
        .slice(0, 5)
        .map((item, index) => ({
          label: coerceString(item?.label, fallback.timePatterns.heavyDays[index]?.label || "Day"),
          hours: coerceNumber(item?.hours, fallback.timePatterns.heavyDays[index]?.hours || 0),
          note: coerceString(item?.note, fallback.timePatterns.heavyDays[index]?.note || ""),
        })),
      weeklyBreakdown: asArray<any>(timePatternsInput.weeklyBreakdown)
        .slice(0, 5)
        .map((item, index) => ({
          label: coerceString(item?.label, fallback.timePatterns.weeklyBreakdown[index]?.label || "Week"),
          hours: coerceNumber(item?.hours, fallback.timePatterns.weeklyBreakdown[index]?.hours || 0),
        })),
    },
    workload: {
      monthHours: coerceNumber(workloadInput.monthHours, fallback.workload.monthHours),
      avgDayHours: coerceNumber(workloadInput.avgDayHours, fallback.workload.avgDayHours),
      avgWeekHours: coerceNumber(workloadInput.avgWeekHours, fallback.workload.avgWeekHours),
      rolling30AvgDayHours: coerceNumber(
        workloadInput.rolling30AvgDayHours,
        fallback.workload.rolling30AvgDayHours
      ),
      rolling30AvgActiveDayHours: coerceNumber(
        workloadInput.rolling30AvgActiveDayHours,
        fallback.workload.rolling30AvgActiveDayHours
      ),
      note: coerceString(workloadInput.note, fallback.workload.note),
    },
    botherings: {
      topByTime: asArray<any>(botheringsInput.topByTime)
        .slice(0, 5)
        .map((item, index) => ({
          id: coerceString(item?.id, fallback.botherings.topByTime[index]?.id || ""),
          text: coerceString(item?.text, fallback.botherings.topByTime[index]?.text || "Bothering"),
          sourceType: coerceString(item?.sourceType, fallback.botherings.topByTime[index]?.sourceType || "unknown"),
          totalHours: coerceNumber(item?.totalHours, fallback.botherings.topByTime[index]?.totalHours || 0),
          pending: coerceNumber(item?.pending, fallback.botherings.topByTime[index]?.pending || 0),
          completionRate: coerceNumber(
            item?.completionRate,
            fallback.botherings.topByTime[index]?.completionRate || 0
          ),
          note: coerceString(item?.note, fallback.botherings.topByTime[index]?.note || ""),
        })),
      topByPending: asArray<any>(botheringsInput.topByPending)
        .slice(0, 5)
        .map((item, index) => ({
          id: coerceString(item?.id, fallback.botherings.topByPending[index]?.id || ""),
          text: coerceString(item?.text, fallback.botherings.topByPending[index]?.text || "Bothering"),
          sourceType: coerceString(item?.sourceType, fallback.botherings.topByPending[index]?.sourceType || "unknown"),
          pending: coerceNumber(item?.pending, fallback.botherings.topByPending[index]?.pending || 0),
          totalHours: coerceNumber(item?.totalHours, fallback.botherings.topByPending[index]?.totalHours || 0),
          missedDays: coerceNumber(item?.missedDays, fallback.botherings.topByPending[index]?.missedDays || 0),
          note: coerceString(item?.note, fallback.botherings.topByPending[index]?.note || ""),
        })),
      sourceDistribution: asArray<any>(botheringsInput.sourceDistribution)
        .slice(0, 6)
        .map((item, index) => ({
          label: coerceString(item?.label, fallback.botherings.sourceDistribution[index]?.label || "source"),
          count: coerceNumber(item?.count, fallback.botherings.sourceDistribution[index]?.count || 0),
          hours: coerceNumber(item?.hours, fallback.botherings.sourceDistribution[index]?.hours || 0),
          completionRate: coerceNumber(
            item?.completionRate,
            fallback.botherings.sourceDistribution[index]?.completionRate || 0
          ),
        })),
      predictions: asArray<any>(botheringsInput.predictions)
        .slice(0, 5)
        .map((item, index) => ({
          id: coerceString(item?.id, fallback.botherings.predictions[index]?.id || ""),
          text: coerceString(item?.text, fallback.botherings.predictions[index]?.text || "Bothering"),
          sourceType: coerceString(item?.sourceType, fallback.botherings.predictions[index]?.sourceType || "unknown"),
          severity: coerceString(item?.severity, fallback.botherings.predictions[index]?.severity || "medium"),
          prediction: coerceString(item?.prediction, fallback.botherings.predictions[index]?.prediction || ""),
        })),
      keyPattern: coerceString(botheringsInput.keyPattern, fallback.botherings.keyPattern),
    },
    suggestions: {
      timeUse: asArray<any>(suggestionsInput.timeUse)
        .map((item) => coerceString(item))
        .filter(Boolean)
        .slice(0, 5),
      botheringActions: asArray<any>(suggestionsInput.botheringActions)
        .map((item) => coerceString(item))
        .filter(Boolean)
        .slice(0, 5),
    },
    nextActions: {
      items: asArray<any>(nextActionsInput.items)
        .map((item) => coerceString(item))
        .filter(Boolean)
        .slice(0, 5),
    },
  };

  if (!normalized.timePatterns.slotBreakdown.length) normalized.timePatterns.slotBreakdown = fallback.timePatterns.slotBreakdown;
  if (!normalized.timePatterns.heavyDays.length) normalized.timePatterns.heavyDays = fallback.timePatterns.heavyDays;
  if (!normalized.timePatterns.weeklyBreakdown.length) normalized.timePatterns.weeklyBreakdown = fallback.timePatterns.weeklyBreakdown;
  if (!normalized.botherings.topByTime.length) normalized.botherings.topByTime = fallback.botherings.topByTime;
  if (!normalized.botherings.topByPending.length) normalized.botherings.topByPending = fallback.botherings.topByPending;
  if (!normalized.botherings.sourceDistribution.length) normalized.botherings.sourceDistribution = fallback.botherings.sourceDistribution;
  if (!normalized.botherings.predictions.length) normalized.botherings.predictions = fallback.botherings.predictions;
  if (!normalized.suggestions.timeUse.length) normalized.suggestions.timeUse = fallback.suggestions.timeUse;
  if (!normalized.suggestions.botheringActions.length) normalized.suggestions.botheringActions = fallback.suggestions.botheringActions;
  if (!normalized.nextActions.items.length) normalized.nextActions.items = fallback.nextActions.items;

  return normalized;
};

const buildGenerationPrompt = (evidence: ReturnType<typeof buildEvidencePack>) => {
  return [
    "Return strict JSON only. No markdown. No commentary outside JSON.",
    "",
    "Required schema:",
    JSON.stringify(buildFallbackReport(evidence), null, 2),
    "",
    "Rules:",
    "- Do not praise the report or evaluate its quality.",
    "- Use numbers from the evidence when available.",
    "- Keep text concise and operational.",
    "- suggestions.timeUse must focus on better use of strong time slots.",
    "- suggestions.botheringActions must focus on reducing bothering pressure.",
    "- nextActions.items must be 3 to 5 direct actions.",
    "",
    "Evidence:",
    JSON.stringify(evidence, null, 2),
  ].join("\n");
};

const buildRepairPrompt = (raw: string, evidence: ReturnType<typeof buildEvidencePack>) => {
  return [
    "Convert the following into strict JSON matching the required schema exactly.",
    "Return JSON only.",
    "",
    "Required schema:",
    JSON.stringify(buildFallbackReport(evidence), null, 2),
    "",
    "Source content:",
    raw,
  ].join("\n");
};

export async function POST(request: Request) {
  try {
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";
    const body = await request.json().catch(() => ({}));
    const dashboard = (body?.dashboard || {}) as DashboardPayload;
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    const aiConfig = getAiConfigFromSettings(
      {
        ai: {
          provider: aiConfigInput.provider,
          model: aiConfigInput.model,
          ollamaBaseUrl: aiConfigInput.ollamaBaseUrl,
          openaiApiKey: aiConfigInput.openaiApiKey,
          openaiBaseUrl: aiConfigInput.openaiBaseUrl,
          perplexityApiKey: aiConfigInput.perplexityApiKey,
          perplexityBaseUrl: aiConfigInput.perplexityBaseUrl,
          anthropicApiKey: aiConfigInput.anthropicApiKey,
          anthropicBaseUrl: aiConfigInput.anthropicBaseUrl,
          requestTimeoutMs: aiConfigInput.requestTimeoutMs,
        },
      },
      isDesktopRuntime
    );

    const evidence = buildEvidencePack(dashboard);
    const fallback = buildFallbackReport(evidence);

    if (aiConfig.provider === "none") {
      return NextResponse.json({
        report: fallback,
        provider: "fallback",
        model: "deterministic",
        warning: "AI provider is not configured. Showing deterministic report.",
      });
    }

    const systemPrompt =
      "You are an operations analyst for a personal execution system. Return strict JSON only. Never critique the report.";

    const generation = await runChatWithProvider(
      aiConfig,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildGenerationPrompt(evidence) },
      ],
      { temperature: 0.2 }
    );

    if (!generation.ok || !generation.content?.trim()) {
      return NextResponse.json({
        report: fallback,
        provider: "fallback",
        model: "deterministic",
        warning: generation.details || "Provider returned an empty response.",
      });
    }

    let parsed = tryParseJson(generation.content.trim());

    if (!parsed) {
      const repair = await runChatWithProvider(
        aiConfig,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildRepairPrompt(generation.content.trim(), evidence) },
        ],
        { temperature: 0.1 }
      );
      if (repair.ok && repair.content?.trim()) {
        parsed = tryParseJson(repair.content.trim());
      }
    }

    const report = normalizeReport(parsed, evidence);
    return NextResponse.json({
      report,
      provider: generation.provider,
      model: generation.model,
      warning: parsed ? undefined : "Structured AI output was normalized with deterministic fallback fields.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to generate botherings report.",
        details: message,
      },
      { status: 500 }
    );
  }
}
