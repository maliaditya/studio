"use client";

import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, differenceInCalendarDays, differenceInDays, differenceInMonths, format, getDay, parseISO, startOfDay } from "date-fns";
import type { MindsetPoint } from "@/types/workout";
import {
  AlertTriangle,
  Blocks,
  CalendarClock,
  Gauge,
  Globe2,
  ListChecks,
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
const formatPct = (value: number) => `${Math.round(value * 100)}%`;

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
  const { mindsetCards, schedule } = useAuth();
  const today = startOfDay(new Date());
  const todayKey = format(today, "yyyy-MM-dd");

  const botheringsByType = useMemo(() => {
    return BOTHERING_SOURCES.map(({ id, type }) => ({
      type,
      points: (mindsetCards.find((c) => c.id === id)?.points || []).filter((p) => !p.completed),
    }));
  }, [mindsetCards]);

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

  const getTodayTaskStats = (point: MindsetPoint) => {
    const tasks = point.tasks || [];
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
        const stats = getTodayTaskStats(point);
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
    points.map((point) => ({ type, point }))
  );

  const riskCandidates = allBotherings
    .map(({ type, point }) => {
      const tasks = point.tasks || [];
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
                              {formatPct(risk.previousRate)} -> {formatPct(risk.recentRate)}
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
                              {formatPct(risk.previousRate)} -> {formatPct(risk.recentRate)}
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
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
