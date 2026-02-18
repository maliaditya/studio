"use client";

import React, { useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, differenceInCalendarDays, differenceInDays, differenceInMonths, format, getDay, parseISO, startOfDay } from "date-fns";
import type { CoreDomainId, MindsetPoint } from "@/types/workout";
import { cn } from "@/lib/utils";
import { Activity, AlertTriangle, ArrowRight, Blocks, Compass, HandHeart, HeartPulse, Palette, Sparkles, Target, Users, Wallet, Wrench } from "lucide-react";

interface CoreStatesModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type BotheringType = "External" | "Mismatch" | "Constraint";
type CoreStateId = "S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6";
type BotheringTask = NonNullable<MindsetPoint["tasks"]>[number];

const CORE_DEFS: Array<{
  id: CoreDomainId;
  label: string;
  icon: React.ReactNode;
  dominantType: BotheringType;
}> = [
  { id: "health", label: "Health", icon: <HeartPulse className="h-4 w-4" />, dominantType: "External" },
  { id: "wealth", label: "Wealth", icon: <Wallet className="h-4 w-4" />, dominantType: "Constraint" },
  { id: "relations", label: "Relations", icon: <Users className="h-4 w-4" />, dominantType: "External" },
  { id: "meaning", label: "Meaning / Direction", icon: <Compass className="h-4 w-4" />, dominantType: "Mismatch" },
  { id: "competence", label: "Competence / Skill", icon: <Wrench className="h-4 w-4" />, dominantType: "Mismatch" },
  { id: "autonomy", label: "Autonomy", icon: <Blocks className="h-4 w-4" />, dominantType: "Constraint" },
  { id: "creativity", label: "Creativity / Expression", icon: <Palette className="h-4 w-4" />, dominantType: "External" },
  { id: "contribution", label: "Contribution", icon: <HandHeart className="h-4 w-4" />, dominantType: "Constraint" },
  { id: "transcendence", label: "Transcendence", icon: <Sparkles className="h-4 w-4" />, dominantType: "Mismatch" },
];

const CORE_LABEL_BY_ID = CORE_DEFS.reduce((acc, core) => {
  acc[core.id] = core.label;
  return acc;
}, {} as Record<CoreDomainId, string>);

const STATE_META: Record<CoreStateId, { label: string; badgeClass: string; cardClass: string }> = {
  S0: { label: "S0 Absent", badgeClass: "border-slate-400/40 text-slate-200 bg-slate-500/10", cardClass: "border-slate-500/30" },
  S1: { label: "S1 Pain", badgeClass: "border-red-400/40 text-red-200 bg-red-500/10", cardClass: "border-red-500/35" },
  S2: { label: "S2 Coping", badgeClass: "border-orange-400/40 text-orange-200 bg-orange-500/10", cardClass: "border-orange-500/35" },
  S3: { label: "S3 Engage", badgeClass: "border-amber-400/40 text-amber-200 bg-amber-500/10", cardClass: "border-amber-500/35" },
  S4: { label: "S4 Stable", badgeClass: "border-green-400/40 text-green-200 bg-green-500/10", cardClass: "border-green-500/35" },
  S5: { label: "S5 Integrate", badgeClass: "border-cyan-400/40 text-cyan-200 bg-cyan-500/10", cardClass: "border-cyan-500/35" },
  S6: { label: "S6 Expand", badgeClass: "border-blue-400/40 text-blue-200 bg-blue-500/10", cardClass: "border-blue-500/35" },
};

const BOTHERING_SOURCES: Array<{ id: string; type: BotheringType }> = [
  { id: "mindset_botherings_external", type: "External" },
  { id: "mindset_botherings_mismatch", type: "Mismatch" },
  { id: "mindset_botherings_constraint", type: "Constraint" },
];

const CORE_GROUP_BY_TYPE: Record<BotheringType, CoreDomainId[]> = {
  Constraint: ["wealth", "autonomy", "contribution"],
  Mismatch: ["meaning", "competence", "transcendence"],
  External: ["health", "relations", "creativity"],
};

const TYPE_FALLBACK_CORE: Record<BotheringType, CoreDomainId> = {
  Constraint: "wealth",
  Mismatch: "meaning",
  External: "health",
};

const CORE_KEYWORDS: Record<CoreDomainId, string[]> = {
  health: ["health", "sleep", "energy", "fatigue", "food", "diet", "body", "ill", "anxiety", "insomnia", "workout"],
  wealth: ["money", "income", "salary", "finance", "financial", "job", "cash", "expense", "wealth", "earning", "budget"],
  relations: ["relation", "relationship", "friend", "family", "lonely", "rejection", "buddy", "people", "trust", "bond", "attachment"],
  meaning: ["meaning", "purpose", "direction", "empty", "confusion", "boredom", "existential", "goal", "narrative", "life direction"],
  competence: ["skill", "competence", "impostor", "procrastination", "practice", "learn", "performance", "challenge", "ability"],
  autonomy: ["autonomy", "control", "choice", "trapped", "dependency", "obligation", "freedom", "resentment", "permission"],
  creativity: ["creativity", "creative", "expression", "art", "output", "restless", "style", "design", "write", "draw", "music"],
  contribution: ["contribution", "impact", "give back", "serve", "help others", "community", "value", "useful", "reach", "platform"],
  transcendence: ["transcendence", "death", "identity", "spiritual", "truth", "silence", "unity", "meditation", "awareness", "wisdom"],
};

const EXPANSION_KEYWORDS = [
  "teach",
  "mentor",
  "system",
  "philosophy",
  "influence",
  "master",
  "leverage",
  "community",
  "publish",
  "original",
  "art",
  "wisdom",
];

const CORE_PRIORITY_ORDER: CoreDomainId[] = [
  "health",
  "wealth",
  "relations",
  "competence",
  "autonomy",
  "meaning",
  "creativity",
  "contribution",
  "transcendence",
];

const ENTRY_EFFECT_MAP: Record<CoreDomainId, CoreDomainId[]> = {
  health: ["competence", "relations", "autonomy"],
  wealth: ["health", "relations", "autonomy"],
  relations: [],
  competence: ["wealth", "autonomy", "meaning", "contribution"],
  autonomy: ["meaning", "creativity", "contribution"],
  meaning: ["competence"],
  creativity: ["meaning", "relations"],
  contribution: ["meaning"],
  transcendence: ["meaning"],
};

const BLOCKING_STATES = new Set<CoreStateId>(["S0", "S1", "S2"]);

const normalizeText = (value?: string) => (value || "").toLowerCase();

export function CoreStatesModal({ isOpen, onOpenChange }: CoreStatesModalProps) {
  const { mindsetCards, schedule, habitCards, settings, setSettings } = useAuth();
  const today = startOfDay(new Date());
  const todayKey = format(today, "yyyy-MM-dd");

  const mismatchPointById = useMemo(() => {
    const mismatchPoints = mindsetCards.find((c) => c.id === "mindset_botherings_mismatch")?.points || [];
    return new Map(mismatchPoints.map((point) => [point.id, point] as const));
  }, [mindsetCards]);

  const activityMapByDate = useMemo(() => {
    const map = new Map<string, Map<string, Activity>>();
    Object.entries(schedule || {}).forEach(([dateKey, day]) => {
      const activityMap = new Map<string, Activity>();
      Object.values(day).forEach((value: any) => {
        if (!Array.isArray(value)) return;
        value.forEach((act: any) => {
          if (!act?.id) return;
          activityMap.set(act.id, act);
          const baseMatch = act.id.match(/_(\d{4}-\d{2}-\d{2})$/);
          if (baseMatch) {
            const baseId = act.id.slice(0, -11);
            if (!activityMap.has(baseId)) activityMap.set(baseId, act);
          }
        });
      });
      map.set(dateKey, activityMap);
    });
    return map;
  }, [schedule]);

  const scheduledDatesByTaskId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    Object.entries(schedule || {}).forEach(([dateKey, day]) => {
      Object.values(day).forEach((value: any) => {
        if (!Array.isArray(value)) return;
        value.forEach((act: any) => {
          if (!act?.id) return;
          const ids = new Set<string>();
          ids.add(act.id);
          const baseMatch = act.id.match(/_(\d{4}-\d{2}-\d{2})$/);
          if (baseMatch) ids.add(act.id.slice(0, -11));
          (act.taskIds || []).forEach((taskId: string) => {
            if (taskId) ids.add(taskId);
          });
          ids.forEach((id) => {
            if (!id) return;
            if (!map.has(id)) map.set(id, new Set<string>());
            map.get(id)!.add(dateKey);
          });
        });
      });
    });
    return map;
  }, [schedule]);

  const stopperTimestampsById = useMemo(() => {
    const map = new Map<string, number[]>();
    (habitCards || []).forEach((habit) => {
      [...(habit.urges || []), ...(habit.resistances || [])].forEach((stopper) => {
        map.set(stopper.id, stopper.timestamps || []);
      });
    });
    return map;
  }, [habitCards]);

  const isTaskDueOnDate = (task: BotheringTask, dateKey: string) => {
    const startKey = task.startDate || task.dateKey;
    if (!startKey) return false;
    const start = parseISO(startKey);
    const date = parseISO(dateKey);
    if (Number.isNaN(start.getTime()) || Number.isNaN(date.getTime())) return false;
    if (startOfDay(start) > startOfDay(date)) return false;
    if (task.recurrence === "daily") return true;
    if (task.recurrence === "weekly") return getDay(start) === getDay(date);
    if (task.recurrence === "custom") {
      const interval = Math.max(1, task.repeatInterval || 1);
      if (task.repeatUnit === "month") {
        if (start.getDate() !== date.getDate()) return false;
        const diffMonths = differenceInMonths(date, start);
        return diffMonths >= 0 && diffMonths % interval === 0;
      }
      if (task.repeatUnit === "week") {
        const diffDayCount = differenceInDays(date, start);
        return diffDayCount >= 0 && diffDayCount % (interval * 7) === 0;
      }
      const diffDayCount = differenceInDays(date, start);
      return diffDayCount >= 0 && diffDayCount % interval === 0;
    }
    return startKey === dateKey;
  };

  const isTaskScheduledOnDate = (task: BotheringTask, dateKey: string) => {
    const activityId = task.activityId || task.id;
    if (activityId && scheduledDatesByTaskId.get(activityId)?.has(dateKey)) return true;
    if (task.id && task.id !== activityId && scheduledDatesByTaskId.get(task.id)?.has(dateKey)) return true;
    return false;
  };

  const isTaskCompletedOnDate = (task: BotheringTask, dateKey: string) => {
    const activityMap = activityMapByDate.get(dateKey);
    const activity = activityMap?.get(task.activityId || task.id) as any;
    if (activity) {
      if (activity.completed) return true;
      if (activity.duration && activity.duration > 0) return true;
      if (activity.focusSessionInitialStartTime && activity.focusSessionEndTime) return true;
      if (activity.focusSessionInitialDuration && activity.focusSessionInitialDuration > 0) return true;
    }
    if (task.recurrence && task.recurrence !== "none") {
      return !!task.completionHistory?.[dateKey];
    }
    if (task.dateKey && task.dateKey !== dateKey) return false;
    return !!task.completed;
  };

  const getEffectiveTasks = useCallback((point: MindsetPoint, type: BotheringType): BotheringTask[] => {
    const directTasks = point.tasks || [];
    if (type !== "Constraint") return directTasks;

    const merged: BotheringTask[] = [...directTasks];
    const seen = new Set<string>();
    merged.forEach((task) => {
      seen.add(task.activityId || task.id || `${task.details}:${task.startDate || task.dateKey || ""}`);
    });

    (point.linkedMismatchIds || []).forEach((mismatchId) => {
      const mismatch = mismatchPointById.get(mismatchId);
      if (!mismatch?.tasks?.length) return;
      mismatch.tasks.forEach((task) => {
        const key = task.activityId || task.id || `${task.details}:${task.startDate || task.dateKey || ""}`;
        if (seen.has(key)) return;
        seen.add(key);
        merged.push(task);
      });
    });

    return merged;
  }, [mismatchPointById]);

  const scoreCoreFromText = (text: string, coreId: CoreDomainId) => {
    const haystack = normalizeText(text);
    if (!haystack.trim()) return 0;
    return CORE_KEYWORDS[coreId].reduce((sum, keyword) => {
      return sum + (haystack.includes(keyword) ? 1 : 0);
    }, 0);
  };

  const detectAutoCore = useCallback((point: MindsetPoint, type: BotheringType): CoreDomainId => {
    const text = [
      point.text,
      point.resolution,
      point.mismatchType,
      ...(point.tasks || []).map((task) => task.details),
    ]
      .filter(Boolean)
      .join(" ");

    const groupCandidates = CORE_GROUP_BY_TYPE[type];
    let bestGroup = groupCandidates[0];
    let bestGroupScore = -1;
    groupCandidates.forEach((coreId) => {
      const score = scoreCoreFromText(text, coreId);
      if (score > bestGroupScore) {
        bestGroup = coreId;
        bestGroupScore = score;
      }
    });
    return bestGroupScore > 0 ? bestGroup : TYPE_FALLBACK_CORE[type];
  }, []);

  const manualOverrides = settings.coreStateManualOverrides || {};
  const allBotherings = useMemo(() => {
    return BOTHERING_SOURCES.flatMap(({ id, type }) => {
      const points = (mindsetCards.find((c) => c.id === id)?.points || []).filter((point) => !point.completed);
      return points.map((point) => {
        const tasks = getEffectiveTasks(point, type);
        const autoCore = detectAutoCore(point, type);
        const allowedCoreIds = CORE_GROUP_BY_TYPE[type];
        const manualCoreCandidate = manualOverrides[point.id];
        const manualCore = manualCoreCandidate && allowedCoreIds.includes(manualCoreCandidate) ? manualCoreCandidate : undefined;
        const savedCoreCandidate = point.coreDomainId;
        const savedCore = savedCoreCandidate && allowedCoreIds.includes(savedCoreCandidate) ? savedCoreCandidate : undefined;
        return {
          id: point.id,
          type,
          point,
          tasks,
          autoCore,
          savedCore,
          coreId: savedCore || manualCore || autoCore,
          isManual: !!manualCore,
        };
      });
    });
  }, [mindsetCards, manualOverrides, detectAutoCore, getEffectiveTasks]);

  const coreCards = useMemo(() => {
    const historyStart = addDays(today, -20);
    const weekStart = addDays(today, -6);
    const backlogStart = addDays(today, -44);
    const tomorrowStartMs = addDays(today, 1).getTime();
    const sevenDayStartMs = weekStart.getTime();

    const buildState = (metrics: {
      botheringCount: number;
      due21: number;
      completed21: number;
      due7: number;
      completed7: number;
      backlog: number;
      highRiskCount: number;
      stopperEvents7: number;
      stopperRate: number;
      expansionCompletions21: number;
    }) => {
      const completion21 = metrics.due21 > 0 ? metrics.completed21 / metrics.due21 : 0;
      const completion7 = metrics.due7 > 0 ? metrics.completed7 / metrics.due7 : completion21;
      const trend = completion7 - completion21;

      const painSignal = metrics.highRiskCount > 0 || metrics.backlog >= 4 || (metrics.due7 > 0 && completion7 < 0.25);
      const copingSignal = metrics.stopperEvents7 >= 2 && metrics.stopperRate >= 0.9 && completion7 < 0.45;
      const engagementSignal = (metrics.due7 > 0 && completion7 >= 0.35) || metrics.completed7 >= 2;
      const stabilitySignal = metrics.due21 >= 4 && completion21 >= 0.65 && metrics.backlog <= 2 && trend >= -0.08;
      const integrationSignal =
        metrics.due21 >= 6 &&
        completion21 >= 0.78 &&
        completion7 >= 0.72 &&
        metrics.backlog <= 1 &&
        metrics.highRiskCount === 0 &&
        metrics.stopperRate < 0.35;
      const expansionSignal =
        integrationSignal &&
        (metrics.expansionCompletions21 >= 2 || (metrics.completed21 >= 10 && completion21 >= 0.88));

      if (metrics.botheringCount === 0 && metrics.due21 === 0 && metrics.stopperEvents7 === 0) {
        return { state: "S0" as CoreStateId, reason: "No active signal yet. Domain appears uninitialized." };
      }
      if (expansionSignal) {
        return { state: "S6" as CoreStateId, reason: "Stable base with expansion signal (teaching/leverage/expression)." };
      }
      if (integrationSignal) {
        return { state: "S5" as CoreStateId, reason: "Low-maintenance stability. Domain is supporting other areas." };
      }
      if (stabilitySignal) {
        return { state: "S4" as CoreStateId, reason: "Predictable consistency with controlled backlog." };
      }
      if (copingSignal) {
        return { state: "S2" as CoreStateId, reason: "High urge/resistance signal with weak net progress." };
      }
      if (engagementSignal && !painSignal) {
        return { state: "S3" as CoreStateId, reason: "Intentional action started, but still not stable enough." };
      }
      return { state: "S1" as CoreStateId, reason: "Pain/threat signal is dominating this domain." };
    };

    return CORE_DEFS.map((core) => {
      const botherings = allBotherings.filter((entry) => entry.coreId === core.id);
      const dedupTaskMap = new Map<string, BotheringTask>();
      botherings.forEach((entry) => {
        entry.tasks.forEach((task) => {
          const key = task.activityId || task.id || `${task.details}:${task.startDate || task.dateKey || ""}`;
          if (!dedupTaskMap.has(key)) dedupTaskMap.set(key, task);
        });
      });
      const tasks = Array.from(dedupTaskMap.values());

      let due21 = 0;
      let completed21 = 0;
      let due7 = 0;
      let completed7 = 0;
      let backlog = 0;
      let expansionCompletions21 = 0;

      for (let d = new Date(backlogStart); d <= today; d = addDays(d, 1)) {
        const dateKey = format(d, "yyyy-MM-dd");
        const isIn21 = d >= historyStart;
        const isIn7 = d >= weekStart;
        tasks.forEach((task) => {
          if (!isTaskDueOnDate(task, dateKey)) return;
          if (!isTaskScheduledOnDate(task, dateKey)) return;
          const completed = isTaskCompletedOnDate(task, dateKey);
          if (d < today && !completed) backlog += 1;
          if (isIn21) {
            due21 += 1;
            if (completed) {
              completed21 += 1;
              const details = normalizeText(task.details);
              if (EXPANSION_KEYWORDS.some((keyword) => details.includes(keyword))) {
                expansionCompletions21 += 1;
              }
            }
          }
          if (isIn7) {
            due7 += 1;
            if (completed) completed7 += 1;
          }
        });
      }

      let highRiskCount = 0;
      botherings.forEach((entry) => {
        const endDate = entry.point.endDate ? parseISO(entry.point.endDate) : null;
        if (!endDate || Number.isNaN(endDate.getTime())) return;
        const daysLeft = differenceInCalendarDays(startOfDay(endDate), today);
        if (daysLeft > 14) return;
        let pendingBeforeToday = 0;
        for (let d = new Date(addDays(today, -21)); d < today; d = addDays(d, 1)) {
          const dateKey = format(d, "yyyy-MM-dd");
          entry.tasks.forEach((task) => {
            if (!isTaskDueOnDate(task, dateKey)) return;
            if (!isTaskScheduledOnDate(task, dateKey)) return;
            if (!isTaskCompletedOnDate(task, dateKey)) pendingBeforeToday += 1;
          });
        }
        if (pendingBeforeToday > 0) highRiskCount += 1;
      });

      const stopperIds = new Set<string>();
      botherings.forEach((entry) => {
        (entry.point.linkedUrgeIds || []).forEach((id) => stopperIds.add(id));
        (entry.point.linkedResistanceIds || []).forEach((id) => stopperIds.add(id));
      });
      let stopperEvents7 = 0;
      stopperIds.forEach((id) => {
        const timestamps = stopperTimestampsById.get(id) || [];
        stopperEvents7 += timestamps.filter((ts) => ts >= sevenDayStartMs && ts < tomorrowStartMs).length;
      });
      const stopperRate = stopperEvents7 / Math.max(1, due7);

      const completion21 = due21 > 0 ? completed21 / due21 : 0;
      const completion7 = due7 > 0 ? completed7 / due7 : completion21;
      const trend = completion7 - completion21;

      const { state, reason } = buildState({
        botheringCount: botherings.length,
        due21,
        completed21,
        due7,
        completed7,
        backlog,
        highRiskCount,
        stopperEvents7,
        stopperRate,
        expansionCompletions21,
      });

      return {
        core,
        state,
        reason,
        botherings,
        completion21,
        completion7,
        trend,
        backlog,
        highRiskCount,
        stopperEvents7,
        due7,
      };
    });
  }, [allBotherings, isTaskCompletedOnDate, isTaskDueOnDate, isTaskScheduledOnDate, stopperTimestampsById, today]);

  const sortedOverrides = useMemo(() => {
    return [...allBotherings].sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.point.text.localeCompare(b.point.text);
    });
  }, [allBotherings]);

  const coreCardById = useMemo(() => {
    return coreCards.reduce((acc, item) => {
      acc[item.core.id] = item;
      return acc;
    }, {} as Record<CoreDomainId, (typeof coreCards)[number]>);
  }, [coreCards]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[86vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 border-b border-white/10">
          <DialogTitle>Core State Review</DialogTitle>
          <DialogDescription>
            Hybrid mode: manual core override + auto fallback from bothering signals.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["S0", "S1", "S2", "S3", "S4", "S5", "S6"] as CoreStateId[]).map((state) => (
                <Badge key={state} variant="outline" className={STATE_META[state].badgeClass}>
                  {STATE_META[state].label}
                </Badge>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {coreCards.map((item) => {
                const meta = STATE_META[item.state];
                const completionPct = Math.round(item.completion21 * 100);
                const trendPct = Math.round(item.trend * 100);
                const priorityIndex = CORE_PRIORITY_ORDER.indexOf(item.core.id);
                const blockers = CORE_PRIORITY_ORDER.slice(0, Math.max(priorityIndex, 0)).filter((coreId) => {
                  const candidate = coreCardById[coreId];
                  return candidate ? BLOCKING_STATES.has(candidate.state) : false;
                });
                const helps = (ENTRY_EFFECT_MAP[item.core.id] || []).filter((id) => id !== item.core.id);
                const isFixFirstCore = priorityIndex <= 2 && BLOCKING_STATES.has(item.state);
                return (
                  <Card key={item.core.id} className={cn("bg-background/40", meta.cardClass)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {item.core.icon}
                          {item.core.label}
                        </CardTitle>
                        <Badge variant="outline" className={meta.badgeClass}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {item.core.dominantType} dominant
                        </Badge>
                        <Badge variant="outline">
                          {item.botherings.length} bothering{item.botherings.length === 1 ? "" : "s"}
                        </Badge>
                        {isFixFirstCore ? (
                          <Badge variant="outline" className="border-red-500/40 text-red-200 bg-red-500/10">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Fix First
                          </Badge>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md border border-white/10 p-2">
                          <div className="text-muted-foreground">7d completion</div>
                          <div className="font-semibold">{Math.round(item.completion7 * 100)}%</div>
                        </div>
                        <div className="rounded-md border border-white/10 p-2">
                          <div className="text-muted-foreground">Backlog</div>
                          <div className="font-semibold">{item.backlog}</div>
                        </div>
                        <div className="rounded-md border border-white/10 p-2">
                          <div className="text-muted-foreground">Trend</div>
                          <div className={cn("font-semibold", trendPct < 0 ? "text-red-300" : "text-emerald-300")}>
                            {trendPct >= 0 ? "+" : ""}{trendPct}%
                          </div>
                        </div>
                        <div className="rounded-md border border-white/10 p-2">
                          <div className="text-muted-foreground">Risk cards</div>
                          <div className="font-semibold">{item.highRiskCount}</div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>21d stability</span>
                          <span>{completionPct}%</span>
                        </div>
                        <Progress value={completionPct} />
                      </div>
                      <div className="space-y-2">
                        {blockers.length > 0 ? (
                          <div className="rounded-md border border-red-500/25 bg-red-500/5 p-2">
                            <div className="text-[11px] text-red-200 flex items-center gap-1 mb-1">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              First fix these lower cores
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {blockers.map((coreId) => {
                                const core = CORE_DEFS.find((c) => c.id === coreId);
                                if (!core) return null;
                                return (
                                  <Badge key={`${item.core.id}-block-${coreId}`} variant="secondary" className="text-[10px]">
                                    <span className="mr-1">{core.icon}</span>
                                    {core.label}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-md border border-emerald-500/25 bg-emerald-500/5 p-2 text-[11px] text-emerald-200 flex items-center gap-1">
                            <Target className="h-3.5 w-3.5" />
                            Entry point ready
                          </div>
                        )}
                        {helps.length > 0 ? (
                          <div className="rounded-md border border-white/10 p-2">
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                              <ArrowRight className="h-3.5 w-3.5" />
                              Then this can help
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {helps.map((coreId) => {
                                const core = CORE_DEFS.find((c) => c.id === coreId);
                                if (!core) return null;
                                return (
                                  <Badge key={`${item.core.id}-help-${coreId}`} variant="outline" className="text-[10px]">
                                    <span className="mr-1">{core.icon}</span>
                                    {core.label}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.reason}</div>
                      <div className="flex flex-wrap gap-2">
                        {item.botherings.slice(0, 3).map((b) => (
                          <Badge key={b.id} variant="secondary" className="max-w-full truncate">
                            {b.point.text}
                          </Badge>
                        ))}
                        {item.botherings.length > 3 ? <Badge variant="outline">+{item.botherings.length - 3} more</Badge> : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="border-white/10 bg-background/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Manual Overrides</CardTitle>
                <DialogDescription>
                  Saved core on bothering card has priority. Manual override is used only when no saved core is set.
                </DialogDescription>
              </CardHeader>
              <CardContent>
                {sortedOverrides.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No active botherings.</div>
                ) : (
                  <div className="space-y-2">
                    {sortedOverrides.map((entry) => (
                      <div key={entry.id} className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-2 items-center rounded-md border border-white/10 p-2">
                        <div className="min-w-0">
                          <div className="text-sm truncate">{entry.point.text}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{entry.type}</span>
                            {entry.savedCore ? <span>Saved: {CORE_LABEL_BY_ID[entry.savedCore]}</span> : null}
                            <span>Auto: {CORE_LABEL_BY_ID[entry.autoCore]}</span>
                          </div>
                        </div>
                        {entry.savedCore ? (
                          <div className="h-8 rounded-md border border-white/10 px-3 text-xs text-muted-foreground flex items-center">
                            Core locked from bothering card
                          </div>
                        ) : (
                          <Select
                            value={(() => {
                              const allowedCoreIds = CORE_GROUP_BY_TYPE[entry.type];
                              const current = manualOverrides[entry.id];
                              return current && allowedCoreIds.includes(current) ? current : "__auto__";
                            })()}
                            onValueChange={(value) => {
                              const allowedCoreIds = CORE_GROUP_BY_TYPE[entry.type];
                              setSettings((prev) => {
                                const nextOverrides = { ...(prev.coreStateManualOverrides || {}) };
                                if (value === "__auto__") {
                                  delete nextOverrides[entry.id];
                                } else if (allowedCoreIds.includes(value as CoreDomainId)) {
                                  nextOverrides[entry.id] = value as CoreDomainId;
                                }
                                return { ...prev, coreStateManualOverrides: nextOverrides };
                              });
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Auto" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__auto__">Auto</SelectItem>
                              {CORE_DEFS.filter((core) => CORE_GROUP_BY_TYPE[entry.type].includes(core.id)).map((core) => (
                                <SelectItem key={core.id} value={core.id}>
                                  {core.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
