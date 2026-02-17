"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addDays, differenceInCalendarDays, differenceInDays, differenceInMonths, format, getDay, parseISO, startOfDay } from "date-fns";
import type { Activity, MindsetPoint, SlotName, UserSettings } from "@/types/workout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  Blocks,
  CalendarClock,
  Gauge,
  Globe2,
  ListChecks,
  Loader2,
  ShieldAlert,
  SplitSquareVertical,
  Target,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type BotheringType = "External" | "Mismatch" | "Constraint";
type BotheringTask = NonNullable<MindsetPoint["tasks"]>[number];
const SLOT_ORDER: SlotName[] = ["Late Night", "Dawn", "Morning", "Afternoon", "Evening", "Night"];
type RoutineRebalanceSuggestion = {
  id: string;
  details: string;
  action: "move_slot" | "stagger";
  source?: "routine" | "instance";
  dateKey?: string;
  model?: "pressure" | "utilization";
  currentSlot: SlotName;
  suggestedSlot?: SlotName;
  missRate: number;
  missed: number;
  due: number;
  confidence: number;
  reason: string;
  impact: string;
  targetSlotAwakeSignal?: number;
  targetSlotAvgLoggedMinutes?: number;
  targetSlotWastedHours?: number;
  targetSlotStopperEvents?: number;
  targetSlotLearningDelta?: number;
  targetSlotLearningConfidence?: number;
  targetRule?: NonNullable<Activity["routine"]>;
  currentCadenceLabel?: string;
  targetCadenceLabel?: string;
};
type RoutineRebalanceLearningEvent = NonNullable<UserSettings["routineRebalanceLearning"]>["history"][number];

const BOTHERING_SOURCES: Array<{ id: string; type: BotheringType }> = [
  { id: "mindset_botherings_external", type: "External" },
  { id: "mindset_botherings_mismatch", type: "Mismatch" },
  { id: "mindset_botherings_constraint", type: "Constraint" },
];

const TYPE_META: Record<BotheringType, { icon: LucideIcon; badgeClass: string; trackClass: string; fillClass: string }> = {
  External: {
    icon: Globe2,
    badgeClass: "border-sky-400/40 text-sky-200 bg-sky-500/10",
    trackClass: "bg-sky-500/15",
    fillClass: "bg-sky-400",
  },
  Mismatch: {
    icon: SplitSquareVertical,
    badgeClass: "border-amber-400/40 text-amber-200 bg-amber-500/10",
    trackClass: "bg-amber-500/15",
    fillClass: "bg-amber-400",
  },
  Constraint: {
    icon: Blocks,
    badgeClass: "border-violet-400/40 text-violet-200 bg-violet-500/10",
    trackClass: "bg-violet-500/15",
    fillClass: "bg-violet-400",
  },
};

const mismatchTypeLabel = (mismatchType?: MindsetPoint["mismatchType"]) => {
  if (mismatchType === "mental-model") return "Mental model mismatch";
  if (mismatchType === "cognitive-load") return "Cognitive load mismatch";
  if (mismatchType === "threat-prediction") return "Threat prediction mismatch";
  if (mismatchType === "action-sequencing") return "Action sequencing mismatch";
  return "No mismatch subtype";
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const formatPct = (value: number) => `${Math.round(value * 100)}%`;
const SLOT_CAPACITY_MINUTES = 240;
const cadenceToDays = (interval: number, unit: "day" | "week" | "month") => {
  if (unit === "week") return interval * 7;
  if (unit === "month") return interval * 30;
  return interval;
};
const getCadenceLabel = (rule?: Activity["routine"] | null) => {
  if (!rule) return "none";
  if (rule.type === "daily") return "daily";
  if (rule.type === "weekly") return "weekly";
  const interval = Math.max(1, Math.floor(rule.repeatInterval ?? rule.days ?? 1));
  const unit = rule.repeatUnit ?? "day";
  const unitLabel = interval === 1 ? unit : `${unit}s`;
  return `every ${interval} ${unitLabel}`;
};
const getRuleSignature = (rule?: Activity["routine"] | null) => {
  if (!rule) return "";
  if (rule.type === "daily" || rule.type === "weekly") return rule.type;
  const interval = Math.max(1, Math.floor(rule.repeatInterval ?? rule.days ?? 1));
  const unit = rule.repeatUnit ?? "day";
  return `custom:${interval}:${unit}`;
};
const getRelaxedCadencePlan = (routine: Activity) => {
  if (!routine.routine) return null;
  const rule = routine.routine;

  if (rule.type === "daily") {
    return {
      currentCadenceLabel: "daily",
      targetCadenceLabel: "every 2 days",
      targetIntervalDays: 2,
      targetRule: {
        type: "custom",
        repeatInterval: 2,
        repeatUnit: "day",
      } as NonNullable<Activity["routine"]>,
    };
  }

  if (rule.type === "weekly") {
    return {
      currentCadenceLabel: "weekly",
      targetCadenceLabel: "every 2 weeks",
      targetIntervalDays: 14,
      targetRule: {
        type: "custom",
        repeatInterval: 2,
        repeatUnit: "week",
      } as NonNullable<Activity["routine"]>,
    };
  }

  const currentInterval = Math.max(1, Math.floor(rule.repeatInterval ?? rule.days ?? 1));
  const currentUnit = rule.repeatUnit ?? "day";
  const targetInterval = Math.min(currentUnit === "day" ? 14 : currentUnit === "week" ? 8 : 6, currentInterval + 1);
  if (targetInterval <= currentInterval) return null;

  return {
    currentCadenceLabel: getCadenceLabel(rule),
    targetCadenceLabel: `every ${targetInterval} ${targetInterval === 1 ? currentUnit : `${currentUnit}s`}`,
    targetIntervalDays: cadenceToDays(targetInterval, currentUnit),
    targetRule: {
      type: "custom",
      repeatInterval: targetInterval,
      repeatUnit: currentUnit,
    } as NonNullable<Activity["routine"]>,
  };
};
const getSuggestionKey = (suggestion: RoutineRebalanceSuggestion) =>
  `${suggestion.source || "routine"}::${suggestion.dateKey || ""}::${suggestion.id}::${suggestion.action}::${suggestion.suggestedSlot || ""}::${getRuleSignature(suggestion.targetRule)}`;

const riskTone = (score: number) => {
  if (score >= 0.75) {
    return {
      cardClass: "border-red-400/40",
      glowClass: "from-red-500/70 via-red-300/60 to-red-500/70",
      label: "Critical",
      badgeVariant: "destructive" as const,
    };
  }
  if (score >= 0.5) {
    return {
      cardClass: "border-amber-400/40",
      glowClass: "from-amber-500/70 via-amber-300/60 to-amber-500/70",
      label: "High",
      badgeVariant: "secondary" as const,
    };
  }
  return {
    cardClass: "border-sky-400/40",
    glowClass: "from-sky-500/70 via-sky-300/60 to-sky-500/70",
    label: "Watch",
    badgeVariant: "outline" as const,
  };
};

export function WeeklyReviewModal({ isOpen, onOpenChange }: WeeklyReviewModalProps) {
  const { mindsetCards, schedule, setSchedule, habitCards, mechanismCards, settings, setSettings } = useAuth();
  const { toast } = useToast();
  const [applyDialogTarget, setApplyDialogTarget] = useState<RoutineRebalanceSuggestion | null>(null);
  const [applyingSuggestionId, setApplyingSuggestionId] = useState<string | null>(null);
  const today = startOfDay(new Date());
  const todayKey = format(today, "yyyy-MM-dd");
  const normalizeSlotName = (slot?: string): SlotName => {
    const casted = (slot || "Evening") as SlotName;
    return SLOT_ORDER.includes(casted) ? casted : "Evening";
  };

  const botheringsByType = useMemo(() => {
    return BOTHERING_SOURCES.map(({ id, type }) => ({
      type,
      points: (mindsetCards.find((c) => c.id === id)?.points || []).filter((p) => !p.completed),
    }));
  }, [mindsetCards]);
  const mismatchPointById = useMemo(() => {
    const mismatchPoints = mindsetCards.find((c) => c.id === "mindset_botherings_mismatch")?.points || [];
    return new Map(mismatchPoints.map((point) => [point.id, point] as const));
  }, [mindsetCards]);
  const getEffectiveBotheringTasks = useCallback((point: MindsetPoint, type: BotheringType): BotheringTask[] => {
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

  const activityMapByDate = useMemo(() => {
    const map = new Map<string, Map<string, { completed?: boolean; duration?: number; focusSessionInitialStartTime?: number; focusSessionEndTime?: number; focusSessionInitialDuration?: number }>>();
    Object.entries(schedule || {}).forEach(([dateKey, day]) => {
      const activityMap = new Map<string, { completed?: boolean; duration?: number; focusSessionInitialStartTime?: number; focusSessionEndTime?: number; focusSessionInitialDuration?: number }>();
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
          if (baseMatch) {
            ids.add(act.id.slice(0, -11));
          }
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

  const getTodayTaskStats = (point: MindsetPoint, type: BotheringType) => {
    const tasks = getEffectiveBotheringTasks(point, type);
    let scheduled = 0;
    let completed = 0;
    const pendingTaskNames: string[] = [];
    tasks.forEach((task) => {
      if (!isTaskDueOnDate(task, todayKey)) return;
      const completedToday = isTaskCompletedOnDate(task, todayKey);
      const scheduledToday = isTaskScheduledOnDate(task, todayKey);
      if (!scheduledToday && !completedToday) return;
      scheduled += 1;
      if (completedToday) completed += 1;
      else pendingTaskNames.push(task.details);
    });
    return {
      scheduled,
      completed,
      pending: Math.max(0, scheduled - completed),
      pendingTaskNames: Array.from(new Set(pendingTaskNames)),
    };
  };

  const summaryByType = botheringsByType.map(({ type, points }) => {
    const totals = points.reduce(
      (acc, point) => {
        const stats = getTodayTaskStats(point, type);
        acc.todayScheduled += stats.scheduled;
        acc.todayCompleted += stats.completed;
        acc.todayPending += stats.pending;
        return acc;
      },
      { todayScheduled: 0, todayCompleted: 0, todayPending: 0 }
    );
    return {
      type,
      botherings: points.length,
      completionRate: totals.todayScheduled > 0 ? totals.todayCompleted / totals.todayScheduled : 0,
      ...totals,
    };
  });

  const allBotherings = botheringsByType.flatMap(({ type, points }) =>
    points.map((point) => ({ type, point, tasks: getEffectiveBotheringTasks(point, type) }))
  );
  const routineRebalanceSuggestions = useMemo(() => {
    const todayDate = startOfDay(parseISO(todayKey));
    const routines = (settings.routines || []).filter((r) => !!r.routine);

    const windowDays = 21;
    const windowStart = addDays(todayDate, -(windowDays - 1));
    const pastDateKeys: string[] = [];
    for (let d = new Date(windowStart); d < todayDate; d = addDays(d, 1)) {
      pastDateKeys.push(format(d, "yyyy-MM-dd"));
    }
    const utilizationWindowDays = 5;
    const utilizationDateKeys: string[] = [];
    for (let i = utilizationWindowDays; i >= 1; i -= 1) {
      utilizationDateKeys.push(format(addDays(todayDate, -i), "yyyy-MM-dd"));
    }
    const utilizationDateKeySet = new Set(utilizationDateKeys);

    const normalizeSlot = normalizeSlotName;
    const getSlotFromHour = (hour: number): SlotName => {
      if (hour >= 0 && hour < 4) return "Late Night";
      if (hour >= 4 && hour < 8) return "Dawn";
      if (hour >= 8 && hour < 12) return "Morning";
      if (hour >= 12 && hour < 16) return "Afternoon";
      if (hour >= 16 && hour < 20) return "Evening";
      return "Night";
    };
    const getSlotFromTimestamp = (timestamp: number): { slot: SlotName; dateKey: string } => {
      const date = new Date(timestamp);
      const slot = getSlotFromHour(date.getHours());
      const dateKey = format(startOfDay(date), "yyyy-MM-dd");
      return { slot, dateKey };
    };
    const getLoggedMinutes = (activity: Activity) => {
      let minutes = 0;
      if (activity.focusSessionInitialStartTime && activity.focusSessionEndTime) {
        const focusMinutes = Math.max(
          0,
          Math.round((activity.focusSessionEndTime - activity.focusSessionInitialStartTime) / 60000)
        );
        minutes = Math.max(minutes, focusMinutes);
      }
      if (activity.focusSessionInitialDuration && activity.focusSessionInitialDuration > 0) {
        minutes = Math.max(minutes, activity.focusSessionInitialDuration);
      }
      if (activity.duration && activity.duration > 0) {
        minutes = Math.max(minutes, activity.duration);
      }
      return minutes;
    };

    const isRoutineDueOnDate = (routine: Activity, dateKey: string) => {
      if (!routine.routine) return false;
      const rule = routine.routine;
      const baseKey = routine.baseDate || (routine as any).createdAt || routine.dateKey;
      const date = parseISO(dateKey);
      if (Number.isNaN(date.getTime())) return false;
      if (rule.type === "daily") return true;
      if (!baseKey) return false;
      const base = parseISO(baseKey);
      if (Number.isNaN(base.getTime()) || startOfDay(base) > startOfDay(date)) return false;
      if (rule.type === "weekly") return getDay(base) === getDay(date);
      if (rule.type === "custom") {
        const interval = Math.max(1, rule.repeatInterval ?? rule.days ?? 1);
        const unit = rule.repeatUnit ?? "day";
        if (unit === "month") {
          if (base.getDate() !== date.getDate()) return false;
          const diffMonths = differenceInMonths(date, base);
          return diffMonths >= 0 && diffMonths % interval === 0;
        }
        if (unit === "week") {
          const diffDayCount = differenceInDays(date, base);
          return diffDayCount >= 0 && diffDayCount % (interval * 7) === 0;
        }
        const diffDayCount = differenceInDays(date, base);
        return diffDayCount >= 0 && diffDayCount % interval === 0;
      }
      return false;
    };

    const isCompletedActivity = (activity: Activity) => {
      if (activity.completed) return true;
      if (activity.duration && activity.duration > 0) return true;
      if (activity.focusSessionInitialStartTime && activity.focusSessionEndTime) return true;
      if (activity.focusSessionInitialDuration && activity.focusSessionInitialDuration > 0) return true;
      return false;
    };

    const findRoutineInstance = (routine: Activity, dateKey: string) => {
      const day = schedule?.[dateKey];
      if (!day) return null;
      const instanceId = `${routine.id}_${dateKey}`;
      const allActivities: Activity[] = [];
      Object.values(day).forEach((slotValue: any) => {
        if (!Array.isArray(slotValue)) return;
        slotValue.forEach((item: any) => {
          if (!item || typeof item !== "object") return;
          if (!("id" in item) || !("type" in item)) return;
          allActivities.push(item as Activity);
        });
      });
      const exact = allActivities.find((a) => a.id === instanceId);
      if (exact) return exact;
      const byTaskLink = allActivities.find((a) => (a.taskIds || []).includes(routine.id));
      if (byTaskLink) return byTaskLink;
      const bySameDetails = allActivities.find((a) => a.type === routine.type && a.details === routine.details);
      if (bySameDetails) return bySameDetails;
      return null;
    };
    const learningHistory = settings.routineRebalanceLearning?.history || [];
    const routineByIdForLearning = new Map(routines.map((routine) => [routine.id, routine] as const));
    const analysisToday = addDays(todayDate, -1);
    const getWindowCompletionStats = (
      routine: Activity,
      windowStartDate: Date,
      windowEndDate: Date,
      expectedSlot?: SlotName
    ) => {
      let scheduled = 0;
      let completed = 0;
      const start = startOfDay(windowStartDate);
      const end = startOfDay(windowEndDate);
      if (end < start) return { scheduled: 0, completed: 0, rate: 0 };
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const dateKey = format(d, "yyyy-MM-dd");
        if (!isRoutineDueOnDate(routine, dateKey)) continue;
        const instance = findRoutineInstance(routine, dateKey);
        if (!instance) continue;
        const instanceSlot = normalizeSlot(instance.slot || routine.slot);
        if (expectedSlot && instanceSlot !== expectedSlot) continue;
        scheduled += 1;
        if (isCompletedActivity(instance)) completed += 1;
      }
      return { scheduled, completed, rate: scheduled > 0 ? completed / scheduled : 0 };
    };
    const slotLearningAgg = SLOT_ORDER.reduce((acc, slot) => {
      acc[slot] = { sumDelta: 0, count: 0, positive: 0, negative: 0 };
      return acc;
    }, {} as Record<SlotName, { sumDelta: number; count: number; positive: number; negative: number }>);
    learningHistory.forEach((event) => {
      if (event.action !== "move_slot" || !event.toSlot) return;
      const routine = routineByIdForLearning.get(event.routineId);
      if (!routine || !routine.routine) return;
      const appliedDay = startOfDay(new Date(event.appliedAt));
      if (Number.isNaN(appliedDay.getTime())) return;
      const daysSinceApply = differenceInCalendarDays(analysisToday, appliedDay);
      if (daysSinceApply < 3) return;

      const beforeStart = addDays(appliedDay, -7);
      const beforeEnd = addDays(appliedDay, -1);
      const afterStart = addDays(appliedDay, 1);
      const afterEnd = addDays(appliedDay, Math.min(7, daysSinceApply));
      if (afterEnd < afterStart) return;

      const before = getWindowCompletionStats(routine, beforeStart, beforeEnd, event.fromSlot);
      const after = getWindowCompletionStats(routine, afterStart, afterEnd, event.toSlot);
      if (before.scheduled < 2 || after.scheduled < 2) return;

      const delta = after.rate - before.rate;
      const agg = slotLearningAgg[event.toSlot];
      agg.sumDelta += delta;
      agg.count += 1;
      if (delta >= 0) agg.positive += 1;
      else agg.negative += 1;
    });
    const slotLearning = SLOT_ORDER.reduce((acc, slot) => {
      const agg = slotLearningAgg[slot];
      const meanDelta = agg.count > 0 ? agg.sumDelta / agg.count : 0;
      const confidence = clamp01(agg.count / 6);
      const learnedLift = clamp(meanDelta, -0.25, 0.25) * confidence;
      acc[slot] = { meanDelta, confidence, learnedLift, count: agg.count, positive: agg.positive, negative: agg.negative };
      return acc;
    }, {} as Record<SlotName, { meanDelta: number; confidence: number; learnedLift: number; count: number; positive: number; negative: number }>);

    const routineStats = routines.map((routine) => {
      let due = 0;
      let scheduled = 0;
      let completed = 0;
      let missed = 0;
      const slotOutcomeAgg = SLOT_ORDER.reduce((acc, slot) => {
        acc[slot] = { seen: 0, completed: 0 };
        return acc;
      }, {} as Record<SlotName, { seen: number; completed: number }>);

      pastDateKeys.forEach((dateKey) => {
        if (!isRoutineDueOnDate(routine, dateKey)) return;
        due += 1;
        const instance = findRoutineInstance(routine, dateKey);
        if (!instance) return;
        scheduled += 1;
        const instanceSlot = normalizeSlot(instance.slot || routine.slot);
        slotOutcomeAgg[instanceSlot].seen += 1;
        if (isCompletedActivity(instance)) {
          completed += 1;
          slotOutcomeAgg[instanceSlot].completed += 1;
        } else {
          missed += 1;
        }
      });

      const missRate = scheduled > 0 ? missed / scheduled : 0;
      const slotCompletionRate = SLOT_ORDER.reduce((acc, slot) => {
        const seen = slotOutcomeAgg[slot].seen;
        acc[slot] = seen > 0 ? slotOutcomeAgg[slot].completed / seen : 0;
        return acc;
      }, {} as Record<SlotName, number>);
      return {
        routine,
        due,
        scheduled,
        completed,
        missed,
        missRate,
        slot: normalizeSlot(routine.slot),
        slotCompletionRate,
      };
    });

    const slotUtilizationAgg = SLOT_ORDER.reduce((acc, slot) => {
      acc[slot] = {
        totalLoggedMinutes: 0,
        dayCount: 0,
        daysWithLowUtilization: 0,
        daysWithHighUtilization: 0,
      };
      return acc;
    }, {} as Record<SlotName, { totalLoggedMinutes: number; dayCount: number; daysWithLowUtilization: number; daysWithHighUtilization: number }>);
    utilizationDateKeys.forEach((dateKey) => {
      const day = schedule?.[dateKey];
      SLOT_ORDER.forEach((slot) => {
        const slotActivities = Array.isArray(day?.[slot]) ? (day?.[slot] as Activity[]) : [];
        const loggedMinutes = slotActivities.reduce((sum, activity) => sum + getLoggedMinutes(activity), 0);
        const agg = slotUtilizationAgg[slot];
        agg.totalLoggedMinutes += loggedMinutes;
        agg.dayCount += 1;
        if (loggedMinutes <= 120) agg.daysWithLowUtilization += 1;
        if (loggedMinutes >= 180) agg.daysWithHighUtilization += 1;
      });
    });

    const slotStopperAgg = SLOT_ORDER.reduce((acc, slot) => {
      acc[slot] = { events: 0, daysActive: new Set<string>() };
      return acc;
    }, {} as Record<SlotName, { events: number; daysActive: Set<string> }>);
    (habitCards || []).forEach((habit) => {
      const allStoppers = [...(habit.urges || []), ...(habit.resistances || [])];
      allStoppers.forEach((stopper) => {
        (stopper.timestamps || []).forEach((timestamp) => {
          if (!timestamp || !Number.isFinite(timestamp)) return;
          const { slot, dateKey } = getSlotFromTimestamp(timestamp);
          if (!utilizationDateKeySet.has(dateKey)) return;
          slotStopperAgg[slot].events += 1;
          slotStopperAgg[slot].daysActive.add(dateKey);
        });
      });
    });

    const slotBehavior = SLOT_ORDER.reduce((acc, slot) => {
      const util = slotUtilizationAgg[slot];
      const stop = slotStopperAgg[slot];
      const dayCount = Math.max(1, util.dayCount);
      const avgLoggedMinutes = util.totalLoggedMinutes / dayCount;
      const wastedRatio = clamp01((SLOT_CAPACITY_MINUTES - avgLoggedMinutes) / SLOT_CAPACITY_MINUTES);
      const lowUtilRate = util.daysWithLowUtilization / dayCount;
      const highUtilRate = util.daysWithHighUtilization / dayCount;
      const stopperDaysRate = stop.daysActive.size / dayCount;
      const stopperEventRate = clamp01(stop.events / (dayCount * 2));
      const awakeSignal = clamp01(stopperDaysRate * 0.65 + stopperEventRate * 0.35);
      const opportunityScore = clamp01(wastedRatio * 0.55 + awakeSignal * 0.45);
      acc[slot] = {
        avgLoggedMinutes,
        wastedRatio,
        lowUtilRate,
        highUtilRate,
        awakeSignal,
        stopperEvents: stop.events,
        opportunityScore,
      };
      return acc;
    }, {} as Record<SlotName, { avgLoggedMinutes: number; wastedRatio: number; lowUtilRate: number; highUtilRate: number; awakeSignal: number; stopperEvents: number; opportunityScore: number }>);
    const totalStopperEvents = SLOT_ORDER.reduce((sum, slot) => sum + slotBehavior[slot].stopperEvents, 0);
    const stopperSignalAvailable = totalStopperEvents > 0;

    const slotAgg = SLOT_ORDER.reduce(
      (acc, slot) => {
        acc[slot] = { due: 0, missed: 0 };
        return acc;
      },
      {} as Record<SlotName, { due: number; missed: number }>
    );
    routineStats.forEach((r) => {
      slotAgg[r.slot].due += r.due;
      slotAgg[r.slot].missed += r.missed;
    });
    const maxDue = Math.max(1, ...SLOT_ORDER.map((slot) => slotAgg[slot].due));
    const slotPressure = SLOT_ORDER.reduce((acc, slot) => {
      const due = slotAgg[slot].due;
      const missed = slotAgg[slot].missed;
      const missRate = due > 0 ? missed / due : 0;
      const load = due / maxDue;
      acc[slot] = 0.65 * missRate + 0.35 * load;
      return acc;
    }, {} as Record<SlotName, number>);

    const moveSuggestions: RoutineRebalanceSuggestion[] = [];
    const staggerSuggestions: RoutineRebalanceSuggestion[] = [];

    routineStats.forEach((stat) => {
      const overloaded = (stat.missed >= 3 && stat.missRate >= 0.35 && stat.scheduled >= 5) || (stat.missRate >= 0.55 && stat.scheduled >= 4);
      const currentPressure = slotPressure[stat.slot];
      const currentBehavior = slotBehavior[stat.slot];
      const currentCompletionRate = stat.slotCompletionRate[stat.slot] || 0;
      const moderatelyStruggling =
        !overloaded &&
        ((stat.missed >= 2 && stat.missRate >= 0.25 && stat.scheduled >= 4) ||
          (stat.missRate >= 0.4 && stat.scheduled >= 3));

      const rankedTargets = SLOT_ORDER.filter((slot) => slot !== stat.slot)
        .map((slot) => {
          const targetPressure = slotPressure[slot];
          const targetBehavior = slotBehavior[slot];
          const targetLearning = slotLearning[slot];
          const pressureGain = currentPressure - targetPressure;
          const opportunityGain = targetBehavior.opportunityScore - currentBehavior.opportunityScore;
          const slotFitGain = (stat.slotCompletionRate[slot] || 0) - currentCompletionRate;
          const learnedGain = targetLearning.learnedLift;
          const compositeGain = 0.34 * pressureGain + 0.34 * opportunityGain + 0.17 * slotFitGain + 0.15 * learnedGain;
          const targetWastedHours = Math.max(0, (SLOT_CAPACITY_MINUTES - targetBehavior.avgLoggedMinutes) / 60);
          const utilizationDriven =
            targetBehavior.avgLoggedMinutes <= 150 &&
            targetBehavior.wastedRatio >= 0.35 &&
            (stopperSignalAvailable ? targetBehavior.awakeSignal >= 0.2 : targetBehavior.lowUtilRate >= 0.4);
          return {
            slot,
            targetPressure,
            targetBehavior,
            targetLearning,
            pressureGain,
            opportunityGain,
            slotFitGain,
            learnedGain,
            compositeGain,
            targetWastedHours,
            utilizationDriven,
          };
        })
        .sort((a, b) => b.compositeGain - a.compositeGain);
      const bestTarget = rankedTargets[0];
      const hasViableAwakeEvidence =
        !stopperSignalAvailable ||
        (!!bestTarget && (bestTarget.targetBehavior.highUtilRate >= 0.2 || bestTarget.targetBehavior.awakeSignal >= 0.2));

      const shouldMoveForOverload =
        overloaded &&
        !!bestTarget &&
        bestTarget.compositeGain > 0.05 &&
        (bestTarget.pressureGain > 0.08 || bestTarget.utilizationDriven) &&
        hasViableAwakeEvidence;
      const shouldMoveForUtilization =
        moderatelyStruggling &&
        !!bestTarget &&
        bestTarget.compositeGain > 0.07 &&
        bestTarget.utilizationDriven &&
        bestTarget.opportunityGain > 0.05;
      const shouldMoveForOptimization =
        !overloaded &&
        !moderatelyStruggling &&
        !!bestTarget &&
        stat.scheduled >= 1 &&
        bestTarget.compositeGain > 0.06 &&
        bestTarget.utilizationDriven &&
        (bestTarget.opportunityGain > 0.06 ||
          (bestTarget.targetLearning.confidence >= 0.2 && bestTarget.targetLearning.meanDelta > 0.03));

      let moveGenerated = false;
      if (bestTarget && (shouldMoveForOverload || shouldMoveForUtilization || shouldMoveForOptimization)) {
        const confidence = clamp01(
          (shouldMoveForOptimization ? 0.28 : 0.34) +
            stat.missRate * (shouldMoveForOptimization ? 0.12 : 0.28) +
            Math.max(0, bestTarget.compositeGain) * (shouldMoveForOptimization ? 0.34 : 0.3) +
            bestTarget.targetBehavior.awakeSignal * (shouldMoveForOptimization ? 0.14 : 0.12) +
            bestTarget.targetBehavior.wastedRatio * (shouldMoveForOptimization ? 0.12 : 0.1) +
            Math.max(0, bestTarget.learnedGain) * 0.08
        );
        const primaryModel: RoutineRebalanceSuggestion["model"] = shouldMoveForUtilization || shouldMoveForOptimization ? "utilization" : "pressure";
        const targetSignalText = stopperSignalAvailable
          ? `awake signal from urge/resistance logs (${(bestTarget.targetBehavior.awakeSignal * 100).toFixed(0)}%)`
          : `underused execution pattern (${Math.round(bestTarget.targetBehavior.avgLoggedMinutes)}m/240m)`;
        const learningEvidence =
          bestTarget.targetLearning.confidence >= 0.2
            ? ` Historical lift: ${bestTarget.targetLearning.meanDelta >= 0 ? "+" : ""}${Math.round(bestTarget.targetLearning.meanDelta * 100)}% (conf ${(bestTarget.targetLearning.confidence * 100).toFixed(0)}%).`
            : "";
        const reason =
          shouldMoveForOptimization
            ? `${bestTarget.slot} is a higher-efficiency opportunity: ${targetSignalText} and unused capacity over last 5 days.${learningEvidence} Move from ${stat.slot} to improve throughput, even though miss pressure is currently moderate.`
            : primaryModel === "utilization"
            ? `${bestTarget.slot} shows ${targetSignalText} over last 5 days.${learningEvidence} Rebalancing from ${stat.slot} should capture this wasted block.`
            : `High misses in ${stat.slot}; ${bestTarget.slot} has lower pressure and better utilization fit from last 5 days.${learningEvidence}`;
        const impact =
          shouldMoveForOptimization
            ? `Optimization gain: ${bestTarget.targetWastedHours.toFixed(1)}h recoverable capacity per slot.`
            : primaryModel === "utilization"
            ? `Estimated reclaimed capacity: ${bestTarget.targetWastedHours.toFixed(1)}h/slot. ${stopperSignalAvailable ? `Awake signal ${(bestTarget.targetBehavior.awakeSignal * 100).toFixed(0)}% with ${bestTarget.targetBehavior.stopperEvents} urge/resistance events.` : "Based on low-utilization pattern from recent execution history."}`
            : `Estimated pressure drop: ${Math.round(Math.max(0, bestTarget.pressureGain) * 100)}%. Additional free capacity: ${bestTarget.targetWastedHours.toFixed(1)}h/slot.`;
        moveSuggestions.push({
          id: stat.routine.id,
          details: stat.routine.details,
          action: "move_slot",
          source: "routine",
          model: primaryModel,
          currentSlot: stat.slot,
          suggestedSlot: bestTarget.slot,
          missRate: stat.missRate,
          missed: stat.missed,
          due: stat.scheduled,
          confidence,
          reason,
          impact,
          targetSlotAwakeSignal: bestTarget.targetBehavior.awakeSignal,
          targetSlotAvgLoggedMinutes: bestTarget.targetBehavior.avgLoggedMinutes,
          targetSlotWastedHours: bestTarget.targetWastedHours,
          targetSlotStopperEvents: bestTarget.targetBehavior.stopperEvents,
          targetSlotLearningDelta: bestTarget.targetLearning.meanDelta,
          targetSlotLearningConfidence: bestTarget.targetLearning.confidence,
        });
        moveGenerated = true;
      }

      const cadencePlan = getRelaxedCadencePlan(stat.routine);
      const cadenceOverload = stat.missRate >= 0.5 && stat.scheduled >= 4 && stat.missed >= 2;
      const severeCadenceFailure = stat.missRate >= 0.8 && stat.scheduled >= 6;
      if (cadencePlan && cadenceOverload && (!moveGenerated || severeCadenceFailure)) {
        const cadenceLift = Math.min(1, cadencePlan.targetIntervalDays / Math.max(1, stat.scheduled));
        const bestPressureGain = bestTarget ? Math.max(0, bestTarget.pressureGain) : 0;
        const confidence = clamp01(0.36 + stat.missRate * 0.42 + Math.max(0, 0.18 - bestPressureGain) * 0.25 + cadenceLift * 0.07);
        staggerSuggestions.push({
          id: stat.routine.id,
          details: stat.routine.details,
          action: "stagger",
          source: "routine",
          currentSlot: stat.slot,
          missRate: stat.missRate,
          missed: stat.missed,
          due: stat.scheduled,
          confidence,
          reason: `Execution is breaking at ${cadencePlan.currentCadenceLabel}; easing cadence should recover consistency.`,
          impact: `Suggest ${cadencePlan.targetCadenceLabel} for 2 weeks, then reassess.`,
          targetRule: cadencePlan.targetRule,
          currentCadenceLabel: cadencePlan.currentCadenceLabel,
          targetCadenceLabel: cadencePlan.targetCadenceLabel,
        });
      }
    });

    if (moveSuggestions.length === 0 && staggerSuggestions.length === 0) {
      const todayDay = schedule?.[todayKey];
      if (todayDay) {
        const todayPendingBySlot = SLOT_ORDER.reduce((acc, slot) => {
          const slotActivities = Array.isArray(todayDay[slot]) ? (todayDay[slot] as Activity[]) : [];
          acc[slot] = slotActivities.filter((activity) => !isCompletedActivity(activity)).length;
          return acc;
        }, {} as Record<SlotName, number>);
        const maxPendingToday = Math.max(1, ...SLOT_ORDER.map((slot) => todayPendingBySlot[slot]));

        const pendingTodayInstances: Activity[] = [];
        const seenActivityIds = new Set<string>();
        SLOT_ORDER.forEach((slot) => {
          const slotActivities = Array.isArray(todayDay[slot]) ? (todayDay[slot] as Activity[]) : [];
          slotActivities.forEach((activity) => {
            if (!activity?.id || seenActivityIds.has(activity.id)) return;
            if (activity.type === "interrupt") return;
            if (isCompletedActivity(activity)) return;
            seenActivityIds.add(activity.id);
            pendingTodayInstances.push({ ...activity, slot });
          });
        });

        const maxFallbackCards = 6;
        const weakFallbackCandidates: Array<{
          activity: Activity;
          currentSlot: SlotName;
          bestTarget: {
            slot: SlotName;
            targetBehavior: {
              avgLoggedMinutes: number;
              wastedRatio: number;
              lowUtilRate: number;
              highUtilRate: number;
              awakeSignal: number;
              stopperEvents: number;
              opportunityScore: number;
            };
            targetLearning: {
              meanDelta: number;
              confidence: number;
              learnedLift: number;
              count: number;
              positive: number;
              negative: number;
            };
            opportunityGain: number;
            pendingRelief: number;
            score: number;
            targetWastedHours: number;
          };
        }> = [];
        for (const activity of pendingTodayInstances) {
          if (moveSuggestions.length >= maxFallbackCards) break;
          const currentSlot = normalizeSlot(activity.slot);
          const currentBehavior = slotBehavior[currentSlot];
          const rankedTargets = SLOT_ORDER.filter((slot) => slot !== currentSlot)
            .map((slot) => {
              const targetBehavior = slotBehavior[slot];
              const targetLearning = slotLearning[slot];
              const opportunityGain = targetBehavior.opportunityScore - currentBehavior.opportunityScore;
              const pendingRelief = (todayPendingBySlot[currentSlot] - todayPendingBySlot[slot]) / maxPendingToday;
              const score =
                0.5 * opportunityGain +
                0.25 * pendingRelief +
                0.15 * Math.max(0, targetLearning.learnedLift) +
                0.1 * targetBehavior.wastedRatio;
              const targetWastedHours = Math.max(0, (SLOT_CAPACITY_MINUTES - targetBehavior.avgLoggedMinutes) / 60);
              return { slot, targetBehavior, targetLearning, opportunityGain, pendingRelief, score, targetWastedHours };
            })
            .sort((a, b) => b.score - a.score);
          const bestTarget = rankedTargets[0];
          if (!bestTarget) continue;
          weakFallbackCandidates.push({ activity, currentSlot, bestTarget });

          const isActionable =
            bestTarget.score > 0.04 &&
            (bestTarget.opportunityGain > 0.02 || bestTarget.pendingRelief > 0.1);
          if (!isActionable) continue;

          const confidence = clamp01(
            0.3 + Math.max(0, bestTarget.score) * 0.7 + bestTarget.targetBehavior.awakeSignal * 0.08
          );
          const learningEvidence =
            bestTarget.targetLearning.confidence >= 0.05
              ? ` Historical lift: ${bestTarget.targetLearning.meanDelta >= 0 ? "+" : ""}${Math.round(bestTarget.targetLearning.meanDelta * 100)}% (conf ${(bestTarget.targetLearning.confidence * 100).toFixed(0)}%).`
              : "";

          moveSuggestions.push({
            id: activity.id,
            details: activity.details,
            action: "move_slot",
            source: "instance",
            dateKey: todayKey,
            model: "utilization",
            currentSlot,
            suggestedSlot: bestTarget.slot,
            missRate: 0,
            missed: 0,
            due: 1,
            confidence,
            reason: `${bestTarget.slot} has better today utilization opportunity than ${currentSlot} for this pending task.${learningEvidence}`,
            impact: `Optimization gain: ${bestTarget.targetWastedHours.toFixed(1)}h recoverable capacity in target slot.`,
            targetSlotAwakeSignal: bestTarget.targetBehavior.awakeSignal,
            targetSlotAvgLoggedMinutes: bestTarget.targetBehavior.avgLoggedMinutes,
            targetSlotWastedHours: bestTarget.targetWastedHours,
            targetSlotStopperEvents: bestTarget.targetBehavior.stopperEvents,
            targetSlotLearningDelta: bestTarget.targetLearning.meanDelta,
            targetSlotLearningConfidence: bestTarget.targetLearning.confidence,
          });
        }

        if (moveSuggestions.length === 0 && weakFallbackCandidates.length > 0) {
          weakFallbackCandidates
            .sort((a, b) => {
              const scoreDiff = b.bestTarget.score - a.bestTarget.score;
              if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
              return todayPendingBySlot[b.currentSlot] - todayPendingBySlot[a.currentSlot];
            })
            .slice(0, 3)
            .forEach(({ activity, currentSlot, bestTarget }) => {
              const confidence = clamp01(
                0.24 + Math.max(0, bestTarget.score) * 0.55 + bestTarget.targetBehavior.awakeSignal * 0.06
              );
              moveSuggestions.push({
                id: activity.id,
                details: activity.details,
                action: "move_slot",
                source: "instance",
                dateKey: todayKey,
                model: "utilization",
                currentSlot,
                suggestedSlot: bestTarget.slot,
                missRate: 0,
                missed: 0,
                due: 1,
                confidence,
                reason: `Low-signal optimization: ${bestTarget.slot} currently has slightly better utilization room than ${currentSlot}. Try this move for 2 days and reassess completion.`,
                impact: `Pilot move to use ${bestTarget.targetWastedHours.toFixed(1)}h spare capacity in target slot.`,
                targetSlotAwakeSignal: bestTarget.targetBehavior.awakeSignal,
                targetSlotAvgLoggedMinutes: bestTarget.targetBehavior.avgLoggedMinutes,
                targetSlotWastedHours: bestTarget.targetWastedHours,
                targetSlotStopperEvents: bestTarget.targetBehavior.stopperEvents,
                targetSlotLearningDelta: bestTarget.targetLearning.meanDelta,
                targetSlotLearningConfidence: bestTarget.targetLearning.confidence,
              });
            });
        }
      }
    }

    moveSuggestions.sort((a, b) => b.confidence - a.confidence);
    staggerSuggestions.sort((a, b) => b.confidence - a.confidence);

    const merged: RoutineRebalanceSuggestion[] = [];
    const usedRoutineIds = new Set<string>();
    const maxCards = 8;
    let staggerCardCount = 0;
    const maxStaggerCards = 2;
    const pushUnique = (candidate?: RoutineRebalanceSuggestion) => {
      if (!candidate) return;
       if (candidate.action === "stagger" && staggerCardCount >= maxStaggerCards) return;
      if (usedRoutineIds.has(candidate.id)) return;
      usedRoutineIds.add(candidate.id);
      if (candidate.action === "stagger") staggerCardCount += 1;
      merged.push(candidate);
    };

    // Prefer concrete slot moves first; cadence easing is a guarded fallback.
    while (merged.length < maxCards && (moveSuggestions.length > 0 || staggerSuggestions.length > 0)) {
      pushUnique(moveSuggestions.shift());
      if (merged.length >= maxCards) break;
      pushUnique(moveSuggestions.shift());
      if (merged.length >= maxCards) break;
      pushUnique(staggerSuggestions.shift());
      if (moveSuggestions.length === 0 && staggerSuggestions.length > 0) {
        pushUnique(staggerSuggestions.shift());
      }
    }

    return merged.slice(0, maxCards);
  }, [settings.routines, settings.routineRebalanceLearning, schedule, todayKey, habitCards]);
  const routineById = useMemo(() => {
    return new Map((settings.routines || []).map((routine) => [routine.id, routine] as const));
  }, [settings.routines]);
  const appendLearningHistory = (prev: UserSettings, event: RoutineRebalanceLearningEvent): UserSettings => {
    const previousLearning = prev.routineRebalanceLearning || { history: [] };
    const nextHistory = [...(previousLearning.history || []), event].slice(-400);
    return {
      ...prev,
      routineRebalanceLearning: {
        ...previousLearning,
        history: nextHistory,
      },
    };
  };

  const isSuggestionApplyEligible = (suggestion: RoutineRebalanceSuggestion) => {
    if (suggestion.action === "move_slot" && suggestion.source === "instance") {
      if (!suggestion.suggestedSlot || !SLOT_ORDER.includes(suggestion.suggestedSlot)) return false;
      const targetDateKey = suggestion.dateKey || todayKey;
      const day = schedule?.[targetDateKey];
      if (!day) return false;
      let foundSlot: SlotName | null = null;
      SLOT_ORDER.forEach((slot) => {
        const list = Array.isArray(day[slot]) ? (day[slot] as Activity[]) : [];
        if (list.some((activity) => activity.id === suggestion.id)) foundSlot = slot;
      });
      if (!foundSlot) return false;
      return foundSlot === suggestion.currentSlot && foundSlot !== suggestion.suggestedSlot;
    }

    const routine = routineById.get(suggestion.id);
    if (!routine) return false;
    if (suggestion.action === "move_slot") {
      if (!suggestion.suggestedSlot || !SLOT_ORDER.includes(suggestion.suggestedSlot)) return false;
      const currentSlot = (routine.slot || "Evening") as SlotName;
      return currentSlot === suggestion.currentSlot && currentSlot !== suggestion.suggestedSlot;
    }
    if (!routine.routine || !suggestion.targetRule) return false;
    return getRuleSignature(routine.routine) !== getRuleSignature(suggestion.targetRule);
  };

  const applyRoutineSuggestion = (suggestion: RoutineRebalanceSuggestion) => {
    if (applyingSuggestionId) return;
    const applyKey = getSuggestionKey(suggestion);
    setApplyingSuggestionId(applyKey);
    try {
      const stillSuggested = routineRebalanceSuggestions.some(
        (candidate) =>
          (candidate.source || "routine") === (suggestion.source || "routine") &&
          (candidate.dateKey || "") === (suggestion.dateKey || "") &&
          candidate.id === suggestion.id &&
          candidate.action === suggestion.action &&
          candidate.currentSlot === suggestion.currentSlot &&
          candidate.suggestedSlot === suggestion.suggestedSlot &&
          getRuleSignature(candidate.targetRule) === getRuleSignature(suggestion.targetRule)
      );
      if (!stillSuggested) {
        toast({
          title: "Suggestion changed",
          description: "This suggestion is no longer active. Please review the refreshed recommendations.",
          variant: "destructive",
        });
        return;
      }

      if (suggestion.action === "move_slot" && suggestion.source === "instance") {
        const targetSlot = suggestion.suggestedSlot;
        if (!targetSlot || !SLOT_ORDER.includes(targetSlot)) {
          toast({
            title: "Invalid slot suggestion",
            description: "Could not apply this move safely.",
            variant: "destructive",
          });
          return;
        }
        const targetDateKey = suggestion.dateKey || todayKey;
        const day = schedule?.[targetDateKey];
        if (!day) {
          toast({
            title: "Task not found",
            description: "This task is no longer available for rebalancing.",
            variant: "destructive",
          });
          return;
        }

        let foundSlot: SlotName | null = null;
        SLOT_ORDER.forEach((slot) => {
          const list = Array.isArray(day[slot]) ? (day[slot] as Activity[]) : [];
          if (list.some((activity) => activity.id === suggestion.id)) foundSlot = slot;
        });
        if (!foundSlot || foundSlot !== suggestion.currentSlot || foundSlot === targetSlot) {
          toast({
            title: "Task changed",
            description: "This task has already moved. Refresh suggestions.",
            variant: "destructive",
          });
          return;
        }

        setSchedule((prev) => {
          const todayDay = prev[targetDateKey];
          if (!todayDay) return prev;
          let matched: Activity | null = null;
          let changed = false;
          const nextDay = { ...todayDay };

          SLOT_ORDER.forEach((slot) => {
            const slotActivities = nextDay[slot];
            if (!Array.isArray(slotActivities)) return;
            const list = slotActivities as Activity[];
            const filtered = list.filter((activity) => {
              const isMatch = activity.id === suggestion.id;
              if (isMatch && !matched) matched = activity;
              return !isMatch;
            });
            if (filtered.length !== list.length) {
              nextDay[slot] = filtered;
              changed = true;
            }
          });

          if (!matched) return prev;
          const targetActivities = Array.isArray(nextDay[targetSlot]) ? [...(nextDay[targetSlot] as Activity[])] : [];
          const movedInstance: Activity = { ...matched, slot: targetSlot };
          targetActivities.push(movedInstance);
          nextDay[targetSlot] = targetActivities;
          changed = true;

          if (!changed) return prev;
          return { ...prev, [targetDateKey]: nextDay };
        });

        toast({
          title: "Suggestion applied",
          description: `"${suggestion.details}" moved to ${targetSlot}.`,
        });
        return;
      }

      const routine = routineById.get(suggestion.id);
      if (!routine) {
        toast({
          title: "Routine not found",
          description: "The routine no longer exists. Nothing was changed.",
          variant: "destructive",
        });
        return;
      }

      if (suggestion.action === "move_slot") {
        const targetSlot = suggestion.suggestedSlot;
        if (!targetSlot || !SLOT_ORDER.includes(targetSlot)) {
          toast({
            title: "Invalid slot suggestion",
            description: "Could not apply this slot change safely.",
            variant: "destructive",
          });
          return;
        }

        const currentSlot = (routine.slot || "Evening") as SlotName;
        if (currentSlot !== suggestion.currentSlot || currentSlot === targetSlot) {
          toast({
            title: "Routine changed",
            description: "This routine has already changed. Refresh the suggestion before applying.",
            variant: "destructive",
          });
          return;
        }

        setSettings((prev) => {
          const learningEvent: RoutineRebalanceLearningEvent = {
            id: `rr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            routineId: suggestion.id,
            action: "move_slot",
            model: suggestion.model,
            fromSlot: suggestion.currentSlot,
            toSlot: targetSlot,
            appliedAt: Date.now(),
            baselineMissRate: suggestion.missRate,
            baselineDue: suggestion.due,
            source: "guarded_apply",
          };
          const nextSettings: UserSettings = {
            ...prev,
            routines: (prev.routines || []).map((r) => (r.id === suggestion.id ? { ...r, slot: targetSlot } : r)),
          };
          return appendLearningHistory(nextSettings, learningEvent);
        });

        setSchedule((prev) => {
          const todayDay = prev[todayKey];
          if (!todayDay) return prev;
          const routineInstanceId = `${suggestion.id}_${todayKey}`;
          let matched: Activity | null = null;
          let changed = false;
          const nextDay = { ...todayDay };

          SLOT_ORDER.forEach((slot) => {
            const slotActivities = nextDay[slot];
            if (!Array.isArray(slotActivities)) return;
            const list = slotActivities as Activity[];
            const filtered = list.filter((activity) => {
              const isMatch = activity.id === routineInstanceId;
              if (isMatch && !matched) matched = activity;
              return !isMatch;
            });
            if (filtered.length !== list.length) {
              nextDay[slot] = filtered;
              changed = true;
            }
          });

          if (!matched) return prev;
          const targetActivities = Array.isArray(nextDay[targetSlot]) ? [...(nextDay[targetSlot] as Activity[])] : [];
          const existingIndex = targetActivities.findIndex((activity) => activity.id === routineInstanceId);
          const movedInstance: Activity = { ...matched, slot: targetSlot };
          if (existingIndex >= 0) targetActivities[existingIndex] = { ...targetActivities[existingIndex], ...movedInstance };
          else targetActivities.push(movedInstance);
          nextDay[targetSlot] = targetActivities;
          changed = true;

          if (!changed) return prev;
          return { ...prev, [todayKey]: nextDay };
        });

        toast({
          title: "Suggestion applied",
          description: `"${routine.details}" moved to ${targetSlot}.`,
        });
        return;
      }

      if (!routine.routine || !suggestion.targetRule) {
        toast({
          title: "Cannot apply",
          description: "Cadence relaxation is no longer valid for this routine.",
          variant: "destructive",
        });
        return;
      }
      if (getRuleSignature(routine.routine) === getRuleSignature(suggestion.targetRule)) {
        toast({
          title: "Routine changed",
          description: "This cadence suggestion has already been applied or is outdated.",
          variant: "destructive",
        });
        return;
      }

      setSettings((prev) => {
        const learningEvent: RoutineRebalanceLearningEvent = {
          id: `rr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          routineId: suggestion.id,
          action: "stagger",
          model: suggestion.model,
          fromSlot: suggestion.currentSlot,
          appliedAt: Date.now(),
          baselineMissRate: suggestion.missRate,
          baselineDue: suggestion.due,
          source: "guarded_apply",
        };
        const nextSettings: UserSettings = {
          ...prev,
          routines: (prev.routines || []).map((r) =>
            r.id === suggestion.id
              ? {
                  ...r,
                  routine: { ...suggestion.targetRule },
                }
              : r
          ),
        };
        return appendLearningHistory(nextSettings, learningEvent);
      });

      toast({
        title: "Suggestion applied",
        description: `"${routine.details}" cadence changed: ${suggestion.currentCadenceLabel || getCadenceLabel(routine.routine)} -> ${suggestion.targetCadenceLabel || getCadenceLabel(suggestion.targetRule)} (guarded apply).`,
      });
    } finally {
      setApplyingSuggestionId(null);
      setApplyDialogTarget(null);
    }
  };

  const linkedStopperById = useMemo(() => {
    const map = new Map<string, { id: string; text: string; isUrge: boolean; habitName: string; mechanismName?: string }>();
    habitCards.forEach((habit) => {
      const urgeMechanismName = mechanismCards.find((m) => m.id === habit.response?.resourceId)?.name;
      const resistanceMechanismName = mechanismCards.find((m) => m.id === habit.newResponse?.resourceId)?.name;
      (habit.urges || []).forEach((stopper) => {
        map.set(stopper.id, {
          id: stopper.id,
          text: stopper.text,
          isUrge: true,
          habitName: habit.name,
          mechanismName: urgeMechanismName,
        });
      });
      (habit.resistances || []).forEach((stopper) => {
        map.set(stopper.id, {
          id: stopper.id,
          text: stopper.text,
          isUrge: false,
          habitName: habit.name,
          mechanismName: resistanceMechanismName,
        });
      });
    });
    return map;
  }, [habitCards, mechanismCards]);

  const riskCandidates = allBotherings
    .map(({ type, point, tasks }) => {
      if (tasks.length === 0) return null;
      const parsedDeadline = point.endDate ? parseISO(point.endDate) : null;
      const hasDeadline = !!parsedDeadline && !Number.isNaN(parsedDeadline.getTime());
      const deadlineDay = hasDeadline ? startOfDay(parsedDeadline!) : null;
      const daysLeft = deadlineDay ? differenceInCalendarDays(deadlineDay, today) : null;
      const isDeadlineNear = daysLeft !== null && daysLeft <= 21;

      const historyStart = addDays(today, -120);
      const occurrences: Array<{ dateKey: string; due: number; completed: number; pending: number }> = [];

      for (let d = new Date(historyStart); d <= today; d = addDays(d, 1)) {
        const dateKey = format(d, "yyyy-MM-dd");
        let due = 0;
        let completed = 0;
        tasks.forEach((task) => {
          if (!isTaskDueOnDate(task, dateKey)) return;
          if (!isTaskScheduledOnDate(task, dateKey)) return;
          due += 1;
          if (isTaskCompletedOnDate(task, dateKey)) completed += 1;
        });
        if (due === 0) continue;
        occurrences.push({ dateKey, due, completed, pending: due - completed });
      }

      const recent = occurrences.slice(-6);
      const previous = occurrences.slice(-12, -6);
      const avgRate = (items: Array<{ due: number; completed: number }>) => {
        if (items.length === 0) return 1;
        const totalDue = items.reduce((sum, i) => sum + i.due, 0);
        const totalCompleted = items.reduce((sum, i) => sum + i.completed, 0);
        return totalDue > 0 ? totalCompleted / totalDue : 1;
      };
      const recentRate = avgRate(recent);
      const previousRate = previous.length > 0 ? avgRate(previous) : recentRate;
      const trendDelta = recentRate - previousRate;
      const trendDrop = Math.max(0, previousRate - recentRate);
      const recentDue = recent.reduce((sum, i) => sum + i.due, 0);
      const recentMissed = recent.reduce((sum, i) => sum + i.pending, 0);
      const missPressure = recentDue > 0 ? recentMissed / recentDue : 0;

      const urgency =
        daysLeft === null
          ? 0.2
          : daysLeft < 0
            ? 1
            : daysLeft <= 3
              ? 0.95
              : daysLeft <= 7
                ? 0.8
                : daysLeft <= 14
                  ? 0.6
                  : daysLeft <= 21
                    ? 0.4
                    : 0.2;
      const trendRisk = trendDelta < 0 ? Math.min(1, Math.abs(trendDelta) * 2.5) : 0;
      const consistencyRisk = 1 - recentRate;
      const riskScore = clamp01(urgency * 0.5 + trendRisk * 0.3 + consistencyRisk * 0.15 + missPressure * 0.05);

      const isDownward = trendDelta < -0.05 || (recentRate < 0.65 && recentMissed > 0);
      if (!isDownward) return null;

      let missedBacklog = 0;
      occurrences.forEach((occ) => {
        if (occ.dateKey < todayKey) missedBacklog += occ.pending;
      });

      let upcomingPending = 0;
      const pendingTaskInstances: string[] = [];
      const pendingTodayTaskNames: string[] = [];
      const planningEnd =
        deadlineDay
          ? (deadlineDay < today ? today : deadlineDay)
          : addDays(today, 14);

      for (let d = new Date(today); d <= planningEnd; d = addDays(d, 1)) {
        const dateKey = format(d, "yyyy-MM-dd");
        tasks.forEach((task) => {
          if (!isTaskDueOnDate(task, dateKey)) return;
          if (!isTaskScheduledOnDate(task, dateKey)) return;
          if (isTaskCompletedOnDate(task, dateKey)) return;
          upcomingPending += 1;
          pendingTaskInstances.push(`${task.details} (${format(d, "MMM d")})`);
          if (dateKey === todayKey) pendingTodayTaskNames.push(task.details);
        });
      }

      const daysForRecovery = daysLeft === null ? 14 : Math.max(1, daysLeft + 1);
      const requiredCompletions = missedBacklog + upcomingPending;
      const requiredPerDay = requiredCompletions / daysForRecovery;
      const deadlineLabel =
        daysLeft === null ? "No deadline" : daysLeft < 0 ? `Overdue ${Math.abs(daysLeft)}d` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`;
      const linkedStoppers = [
        ...(point.linkedUrgeIds || []).map((id) => ({ id, isUrge: true })),
        ...(point.linkedResistanceIds || []).map((id) => ({ id, isUrge: false })),
      ]
        .map((entry) => {
          const found = linkedStopperById.get(entry.id);
          if (!found) return null;
          return {
            id: found.id,
            text: found.text,
            isUrge: entry.isUrge,
            habitName: found.habitName,
            mechanismName: found.mechanismName,
          };
        })
        .filter(Boolean) as Array<{
          id: string;
          text: string;
          isUrge: boolean;
          habitName: string;
          mechanismName?: string;
        }>;

      return {
        id: point.id,
        text: point.text,
        type,
        hasDeadline,
        isDeadlineNear,
        mismatch: type === "Mismatch" ? mismatchTypeLabel(point.mismatchType) : type === "External" ? "External friction" : "Constraint bottleneck",
        daysLeft,
        deadlineLabel,
        riskScore,
        previousRate,
        recentRate,
        trendDrop,
        missedBacklog,
        requiredCompletions,
        requiredPerDay,
        daysForRecovery,
        pendingTodayTaskNames: Array.from(new Set(pendingTodayTaskNames)),
        pendingTaskInstances: Array.from(new Set(pendingTaskInstances)),
        linkedStoppers,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      text: string;
      type: BotheringType;
      hasDeadline: boolean;
      isDeadlineNear: boolean;
      mismatch: string;
      daysLeft: number | null;
      deadlineLabel: string;
      riskScore: number;
      previousRate: number;
      recentRate: number;
      trendDrop: number;
      missedBacklog: number;
      requiredCompletions: number;
      requiredPerDay: number;
      daysForRecovery: number;
      pendingTodayTaskNames: string[];
      pendingTaskInstances: string[];
      linkedStoppers: Array<{
        id: string;
        text: string;
        isUrge: boolean;
        habitName: string;
        mechanismName?: string;
      }>;
    }>;

  const sortRiskCards = (a: (typeof riskCandidates)[number], b: (typeof riskCandidates)[number]) => {
    if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore;
    const aDays = a.daysLeft ?? Number.MAX_SAFE_INTEGER;
    const bDays = b.daysLeft ?? Number.MAX_SAFE_INTEGER;
    return aDays - bDays;
  };
  const atRiskCards = riskCandidates.filter((risk) => risk.isDeadlineNear).sort(sortRiskCards);
  const potentialRiskCards = riskCandidates.filter((risk) => !risk.isDeadlineNear).sort(sortRiskCards);

  const totalBotherings = summaryByType.reduce((sum, item) => sum + item.botherings, 0);
  const totalScheduledToday = summaryByType.reduce((sum, item) => sum + item.todayScheduled, 0);
  const totalPendingToday = summaryByType.reduce((sum, item) => sum + item.todayPending, 0);
  const totalRiskCards = atRiskCards.length;
  const totalPotentialRiskCards = potentialRiskCards.length;
  const totalRebalanceSuggestions = routineRebalanceSuggestions.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[86vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-300" />
            Botherings Risk Review
          </DialogTitle>
          <DialogDescription>Visual triage for today&apos;s load and deadline pressure.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[72vh] pr-3">
          <div className="space-y-5 py-1">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <Card className="md:col-span-2 border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
                <CardContent className="p-4 space-y-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">System Pulse</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-white/10 bg-background/30 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Gauge className="h-3.5 w-3.5" />
                        Botherings
                      </div>
                      <div className="mt-1 text-2xl font-semibold">{totalBotherings}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-background/30 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ListChecks className="h-3.5 w-3.5" />
                        Scheduled
                      </div>
                      <div className="mt-1 text-2xl font-semibold">{totalScheduledToday}</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-background/30 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Pending
                      </div>
                      <div className="mt-1 text-2xl font-semibold">{totalPendingToday}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent">
                <CardContent className="p-4 h-full flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-red-200/80">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Active Risk Cards
                  </div>
                  <div className="text-3xl font-semibold">{totalRiskCards}</div>
                  <div className="text-xs text-muted-foreground">near deadline + consistency downtrend</div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent">
                <CardContent className="p-4 h-full flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-sky-200/80">
                    <TrendingDown className="h-3.5 w-3.5" />
                    Potential Risks
                  </div>
                  <div className="text-3xl font-semibold">{totalPotentialRiskCards}</div>
                  <div className="text-xs text-muted-foreground">downtrend without near deadline</div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-fuchsia-500/5 to-transparent">
                <CardContent className="p-4 h-full flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-fuchsia-200/80">
                    <Gauge className="h-3.5 w-3.5" />
                    Rebalance Suggestions
                  </div>
                  <div className="text-3xl font-semibold">{totalRebalanceSuggestions}</div>
                  <div className="text-xs text-muted-foreground">suggest-first, guarded apply</div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
                <CardContent className="p-4 h-full flex flex-col justify-between">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-200/80">
                    <Target className="h-3.5 w-3.5" />
                    Today Focus
                  </div>
                  <div className="text-3xl font-semibold">{Math.max(0, totalScheduledToday - totalPendingToday)}</div>
                  <div className="text-xs text-muted-foreground">linked tasks already done today</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {summaryByType.map((item) => {
                const meta = TYPE_META[item.type];
                const Icon = meta.icon;
                const donePct = Math.round(item.completionRate * 100);
                return (
                  <Card key={item.type} className="border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{item.type}</span>
                        </div>
                        <Badge variant="outline" className={meta.badgeClass}>
                          {item.botherings}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-md border border-white/10 p-2">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Sch</div>
                          <div className="text-lg font-semibold">{item.todayScheduled}</div>
                        </div>
                        <div className="rounded-md border border-white/10 p-2">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Done</div>
                          <div className="text-lg font-semibold">{item.todayCompleted}</div>
                        </div>
                        <div className="rounded-md border border-white/10 p-2">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Pend</div>
                          <div className="text-lg font-semibold">{item.todayPending}</div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Completion</span>
                          <span>{donePct}%</span>
                        </div>
                        <div className={cn("h-1.5 rounded-full overflow-hidden", meta.trackClass)}>
                          <div className={cn("h-full transition-all", meta.fillClass)} style={{ width: `${donePct}%` }} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-fuchsia-300" />
                <h3 className="text-lg font-semibold">Routine Rebalance Suggestions</h3>
                <Badge variant="outline" className="border-fuchsia-400/40 text-fuchsia-200 bg-fuchsia-500/10">
                  Suggest + Guarded Apply
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">No automatic rescheduling is applied. You can apply each suggestion with guard checks.</div>

              {routineRebalanceSuggestions.length === 0 ? (
                <Card className="border-fuchsia-500/30 bg-fuchsia-500/5">
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No rebalance recommendation right now. Miss pressure and last-5-day utilization signals are both within acceptable range.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {routineRebalanceSuggestions.map((s) => {
                    const suggestionKey = getSuggestionKey(s);
                    const canApply = isSuggestionApplyEligible(s);
                    const isApplying = applyingSuggestionId === suggestionKey;
                    return (
                      <Card key={`suggest-${suggestionKey}`} className="border-fuchsia-400/35 bg-fuchsia-500/[0.03]">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold truncate">{s.details}</div>
                            <Badge variant="outline" className="border-white/20">
                              {(s.confidence * 100).toFixed(0)}% confidence
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {s.source === "instance" ? (
                              <Badge variant="outline">Today pending task</Badge>
                            ) : (
                              <>
                                <Badge variant="outline">Missed {s.missed}/{s.due}</Badge>
                                <Badge variant="outline">Miss rate {(s.missRate * 100).toFixed(0)}%</Badge>
                              </>
                            )}
                            <Badge variant="outline">Current {s.currentSlot}</Badge>
                            {s.model === "utilization" ? (
                              <Badge variant="outline" className="border-sky-400/40 text-sky-200 bg-sky-500/10">
                                Utilization model
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-400/40 text-amber-200 bg-amber-500/10">
                                Pressure model
                              </Badge>
                            )}
                            {s.action === "move_slot" && s.suggestedSlot ? <Badge variant="secondary">Suggest {s.suggestedSlot}</Badge> : null}
                            {s.action === "stagger" && s.targetCadenceLabel ? <Badge variant="secondary">Suggest {s.targetCadenceLabel}</Badge> : null}
                            {s.action === "move_slot" && typeof s.targetSlotAwakeSignal === "number" ? (
                              <Badge variant="outline">Awake {(s.targetSlotAwakeSignal * 100).toFixed(0)}%</Badge>
                            ) : null}
                            {s.action === "move_slot" && typeof s.targetSlotAvgLoggedMinutes === "number" ? (
                              <Badge variant="outline">Avg {Math.round(s.targetSlotAvgLoggedMinutes)}m/240m</Badge>
                            ) : null}
                            {s.action === "move_slot" &&
                            typeof s.targetSlotLearningDelta === "number" &&
                            typeof s.targetSlotLearningConfidence === "number" &&
                            s.targetSlotLearningConfidence >= 0.05 ? (
                              <Badge variant="outline">
                                Learn {s.targetSlotLearningDelta >= 0 ? "+" : ""}
                                {Math.round(s.targetSlotLearningDelta * 100)}%
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-sm text-muted-foreground">{s.reason}</div>
                          <div className="text-sm">
                            <span className="font-semibold">
                              {s.action === "move_slot" ? "Action: Move slot" : "Action: Ease cadence"}
                            </span>
                            {s.action === "move_slot" && s.suggestedSlot ? (
                              <span className="text-muted-foreground"> ({s.currentSlot} -&gt; {s.suggestedSlot})</span>
                            ) : null}
                            {s.action === "stagger" && s.targetCadenceLabel ? (
                              <span className="text-muted-foreground"> ({s.currentCadenceLabel || "current"} -&gt; {s.targetCadenceLabel})</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">{s.impact}</div>
                          {s.action === "move_slot" &&
                          typeof s.targetSlotLearningConfidence === "number" &&
                          s.targetSlotLearningConfidence >= 0.05 ? (
                            <div className="text-[11px] text-muted-foreground">
                              Historical model confidence: {(s.targetSlotLearningConfidence * 100).toFixed(0)}%.
                            </div>
                          ) : null}
                          {s.action === "move_slot" && typeof s.targetSlotStopperEvents === "number" ? (
                            <div className="text-[11px] text-muted-foreground">
                              Last 5 days: {s.targetSlotStopperEvents} urge/resistance events in suggested slot.
                            </div>
                          ) : null}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="text-[11px] text-muted-foreground">
                              {canApply ? "Guard checks passed" : "Guard check failed (routine changed)"}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-fuchsia-400/40 text-fuchsia-100 hover:bg-fuchsia-500/10"
                              disabled={!canApply || isApplying || !!applyingSuggestionId}
                              onClick={() => setApplyDialogTarget(s)}
                            >
                              {isApplying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                              Apply (Guarded)
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative py-1">
              <div className="h-px bg-gradient-to-r from-transparent via-zinc-500/70 to-transparent" />
              <div className="absolute left-1/4 right-1/4 top-[3px] h-px bg-gradient-to-r from-transparent via-zinc-200/70 to-transparent blur-[1px]" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-300" />
                <h3 className="text-lg font-semibold">Active Deadline + Downtrend Cards</h3>
              </div>

              {atRiskCards.length === 0 ? (
                <Card className="border-emerald-500/30 bg-emerald-500/5">
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No active downtrend near deadline.
                  </CardContent>
                </Card>
              ) : (
                atRiskCards.map((risk) => {
                  const tone = riskTone(risk.riskScore);
                  const actionableTasks = risk.pendingTodayTaskNames.length > 0 ? risk.pendingTodayTaskNames : risk.pendingTaskInstances.map((x) => x.split(" (")[0]);
                  const uniqueActionable = Array.from(new Set(actionableTasks));
                  const visibleTasks = uniqueActionable.slice(0, 6);
                  const hiddenCount = Math.max(0, uniqueActionable.length - visibleTasks.length);

                  return (
                    <Card key={risk.id} className={cn("overflow-hidden", tone.cardClass)}>
                      <div className={cn("h-0.5 w-full bg-gradient-to-r", tone.glowClass)} />
                      <CardContent className="p-4 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-300" />
                              <h4 className="font-semibold">{risk.text}</h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={TYPE_META[risk.type].badgeClass}>
                                {risk.type}
                              </Badge>
                              <Badge variant={risk.daysLeft !== null && risk.daysLeft <= 3 ? "destructive" : "secondary"}>{risk.deadlineLabel}</Badge>
                              <Badge variant={tone.badgeVariant}>
                                {tone.label} {(risk.riskScore * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">{risk.mismatch}</div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="rounded-lg border border-white/10 bg-background/25 p-2.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <CalendarClock className="h-3.5 w-3.5" />
                              Deadline
                            </div>
                            <div className="mt-1 font-semibold">{risk.deadlineLabel}</div>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-background/25 p-2.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              {risk.recentRate >= risk.previousRate ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                              Consistency
                            </div>
                            <div className="mt-1 font-semibold">
                              {formatPct(risk.previousRate)} -&gt; {formatPct(risk.recentRate)}
                            </div>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-background/25 p-2.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Backlog
                            </div>
                            <div className="mt-1 font-semibold">{risk.missedBacklog}</div>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-background/25 p-2.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Target className="h-3.5 w-3.5" />
                              Pace
                            </div>
                            <div className="mt-1 font-semibold">{risk.requiredPerDay.toFixed(1)}/day</div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent p-3">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Recovery Target</div>
                          <div className="mt-1 text-sm font-medium">
                            {risk.requiredCompletions} completions in {risk.daysForRecovery} day(s)
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            trend drop: {formatPct(risk.trendDrop)}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ListChecks className="h-3.5 w-3.5" />
                            Focus Tasks
                          </div>
                          {visibleTasks.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {visibleTasks.map((task) => (
                                <Badge key={task} variant="secondary" className="max-w-full truncate">
                                  {task}
                                </Badge>
                              ))}
                              {hiddenCount > 0 ? <Badge variant="outline">+{hiddenCount} more</Badge> : null}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No pending scheduled task.</div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Linked Urges / Resistances
                          </div>
                          {risk.linkedStoppers.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {risk.linkedStoppers.slice(0, 6).map((link) => (
                                <Badge
                                  key={`${risk.id}-linked-${link.id}`}
                                  variant="outline"
                                  className={cn(
                                    "max-w-full truncate",
                                    link.isUrge
                                      ? "border-red-400/40 text-red-200 bg-red-500/10"
                                      : "border-blue-400/40 text-blue-200 bg-blue-500/10"
                                  )}
                                  title={`${link.habitName}${link.mechanismName ? ` | ${link.mechanismName}` : ""}`}
                                >
                                  {link.isUrge ? "Urge" : "Resistance"}: {link.text}
                                </Badge>
                              ))}
                              {risk.linkedStoppers.length > 6 ? <Badge variant="outline">+{risk.linkedStoppers.length - 6} more</Badge> : null}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No linked urges or resistances.</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-sky-300" />
                <h3 className="text-lg font-semibold">Potential Downtrend Cards</h3>
              </div>

              {potentialRiskCards.length === 0 ? (
                <Card className="border-sky-500/30 bg-sky-500/5">
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No early downtrend signals right now.
                  </CardContent>
                </Card>
              ) : (
                potentialRiskCards.map((risk) => {
                  const actionableTasks = risk.pendingTodayTaskNames.length > 0 ? risk.pendingTodayTaskNames : risk.pendingTaskInstances.map((x) => x.split(" (")[0]);
                  const uniqueActionable = Array.from(new Set(actionableTasks));
                  const visibleTasks = uniqueActionable.slice(0, 6);
                  const hiddenCount = Math.max(0, uniqueActionable.length - visibleTasks.length);

                  return (
                    <Card key={`${risk.id}-potential`} className="overflow-hidden border-sky-400/35 bg-sky-500/[0.03]">
                      <div className="h-0.5 w-full bg-gradient-to-r from-sky-500/70 via-sky-300/60 to-sky-500/70" />
                      <CardContent className="p-4 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-4 w-4 text-sky-300" />
                              <h4 className="font-semibold">{risk.text}</h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className={TYPE_META[risk.type].badgeClass}>
                                {risk.type}
                              </Badge>
                              <Badge variant="outline">{risk.deadlineLabel}</Badge>
                              <Badge variant="outline">Potential {(risk.riskScore * 100).toFixed(0)}%</Badge>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">{risk.mismatch}</div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="rounded-lg border border-white/10 bg-background/25 p-2.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <CalendarClock className="h-3.5 w-3.5" />
                              Deadline
                            </div>
                            <div className="mt-1 font-semibold">{risk.deadlineLabel}</div>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-background/25 p-2.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              {risk.recentRate >= risk.previousRate ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                              Consistency
                            </div>
                            <div className="mt-1 font-semibold">
                              {formatPct(risk.previousRate)} -&gt; {formatPct(risk.recentRate)}
                            </div>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-background/25 p-2.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Trend Drop
                            </div>
                            <div className="mt-1 font-semibold">{formatPct(risk.trendDrop)}</div>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-background/25 p-2.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Target className="h-3.5 w-3.5" />
                              Stabilize Pace
                            </div>
                            <div className="mt-1 font-semibold">{risk.requiredPerDay.toFixed(1)}/day</div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent p-3">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Stabilization Target</div>
                          <div className="mt-1 text-sm font-medium">
                            Keep at least {risk.requiredCompletions} completions over next {risk.daysForRecovery} day(s)
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            backlog: {risk.missedBacklog}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ListChecks className="h-3.5 w-3.5" />
                            Focus Tasks
                          </div>
                          {visibleTasks.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {visibleTasks.map((task) => (
                                <Badge key={`${risk.id}-${task}`} variant="secondary" className="max-w-full truncate">
                                  {task}
                                </Badge>
                              ))}
                              {hiddenCount > 0 ? <Badge variant="outline">+{hiddenCount} more</Badge> : null}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No pending scheduled task.</div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Linked Urges / Resistances
                          </div>
                          {risk.linkedStoppers.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {risk.linkedStoppers.slice(0, 6).map((link) => (
                                <Badge
                                  key={`${risk.id}-potential-linked-${link.id}`}
                                  variant="outline"
                                  className={cn(
                                    "max-w-full truncate",
                                    link.isUrge
                                      ? "border-red-400/40 text-red-200 bg-red-500/10"
                                      : "border-blue-400/40 text-blue-200 bg-blue-500/10"
                                  )}
                                  title={`${link.habitName}${link.mechanismName ? ` | ${link.mechanismName}` : ""}`}
                                >
                                  {link.isUrge ? "Urge" : "Resistance"}: {link.text}
                                </Badge>
                              ))}
                              {risk.linkedStoppers.length > 6 ? <Badge variant="outline">+{risk.linkedStoppers.length - 6} more</Badge> : null}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No linked urges or resistances.</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </ScrollArea>
        <AlertDialog
          open={!!applyDialogTarget}
          onOpenChange={(open) => {
            if (!open && !applyingSuggestionId) setApplyDialogTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apply guarded routine suggestion?</AlertDialogTitle>
              <AlertDialogDescription>
                This will update the routine rule only after validation checks pass at apply time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {applyDialogTarget ? (
              <div className="rounded-md border border-white/10 bg-muted/30 p-3 text-sm">
                <div className="font-medium">{applyDialogTarget.details}</div>
                <div className="mt-1 text-muted-foreground">
                  {applyDialogTarget.action === "move_slot" && applyDialogTarget.suggestedSlot
                    ? `Move slot: ${applyDialogTarget.currentSlot} -> ${applyDialogTarget.suggestedSlot}`
                    : `Ease cadence: ${applyDialogTarget.currentCadenceLabel || "current"} -> ${applyDialogTarget.targetCadenceLabel || "target cadence"}`}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Confidence {(applyDialogTarget.confidence * 100).toFixed(0)}%</div>
              </div>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={!!applyingSuggestionId}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={!applyDialogTarget || !!applyingSuggestionId}
                onClick={(event) => {
                  event.preventDefault();
                  if (!applyDialogTarget) return;
                  applyRoutineSuggestion(applyDialogTarget);
                }}
              >
                {applyingSuggestionId ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Apply
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
