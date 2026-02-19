"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Brain, ExternalLink, LineChart as LineChartIcon } from "lucide-react";
import { parseISO, startOfDay, differenceInDays, getDay, differenceInMonths, differenceInDays as diffDays, format, addDays } from "date-fns";
import type { MindsetPoint } from "@/types/workout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChartContainer } from "@/components/ui/chart";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

type BotheringSourceType = "External" | "Mismatch" | "Constraint";
type BotheringTask = NonNullable<MindsetPoint["tasks"]>[number];

export function BotheringsCard() {
  const { mindsetCards, highlightedTaskIds, setHighlightedTaskIds, schedule } = useAuth();
  const [consistencyModal, setConsistencyModal] = useState<{ title: string; data: { date: string; fullDate: string; score: number }[] } | null>(null);
  const mismatchPointById = useMemo(() => {
    const mismatchPoints = mindsetCards.find((c) => c.id === "mindset_botherings_mismatch")?.points || [];
    return new Map(mismatchPoints.map((point) => [point.id, point] as const));
  }, [mindsetCards]);

  const getEffectiveTasks = useCallback((point: MindsetPoint, sourceType: BotheringSourceType): BotheringTask[] => {
    const directTasks = point.tasks || [];
    if (sourceType !== "Constraint") return directTasks;

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

  const activeBotheringsByType = useMemo(() => {
    const sources = [
      { id: "mindset_botherings_external", label: "External" as const },
      { id: "mindset_botherings_mismatch", label: "Mismatch" as const },
      { id: "mindset_botherings_constraint", label: "Constraint" as const },
    ];
    const typed = sources.map(({ id, label }) => ({
      type: label,
      points: (mindsetCards.find((c) => c.id === id)?.points || [])
        .filter((point) => getEffectiveTasks(point, label).length > 0 && !point.completed),
    }));
    const parkedPoints = sources.flatMap(({ id, label }) =>
      (mindsetCards.find((c) => c.id === id)?.points || [])
        .filter((point) => getEffectiveTasks(point, label).length === 0 && !point.completed)
        .map((point) => ({ point, sourceType: label }))
    );
    return [
      ...typed.map(t => ({
        type: t.type,
        points: t.points.map(point => ({ point, sourceType: t.type })),
      })),
      { type: "Parked" as const, points: parkedPoints },
    ];
  }, [mindsetCards, getEffectiveTasks]);

  const [activeTab, setActiveTab] = React.useState<'All' | 'External' | 'Mismatch' | 'Constraint' | 'Parked'>('All');
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayActivityIds = useMemo(() => {
    const ids = new Set<string>();
    const daySchedule = schedule?.[todayKey] || {};
    Object.values(daySchedule).flat().forEach((act: any) => {
      if (act?.id) ids.add(act.id);
      (act?.taskIds || []).forEach((tid: string) => ids.add(tid));
    });
    return ids;
  }, [schedule, todayKey]);

  const getDaysLeftLabel = (endDate?: string) => {
    if (!endDate) return "No end date";
    const target = parseISO(endDate);
    if (Number.isNaN(target.getTime())) return "No end date";
    const today = startOfDay(new Date());
    const diff = differenceInDays(target, today);
    if (diff < 0) return `Overdue ${Math.abs(diff)}d`;
    if (diff === 0) return "Due today";
    return `${diff}d left`;
  };

  const getHighlightIds = (point: MindsetPoint, sourceType: BotheringSourceType) => {
    const ids = new Set<string>();
    getEffectiveTasks(point, sourceType).forEach(t => {
      if (t.id) ids.add(t.id);
      if (t.activityId) ids.add(t.activityId);
    });
    return ids;
  };

  const setHighlightForPoint = (point: MindsetPoint, sourceType: BotheringSourceType) => {
    const ids = getHighlightIds(point, sourceType);
    const same =
      ids.size === highlightedTaskIds.size &&
      Array.from(ids).every(id => highlightedTaskIds.has(id));
    setHighlightedTaskIds(same ? new Set() : ids);
  };

  const isTaskDueOnDate = (task: NonNullable<MindsetPoint["tasks"]>[number], dateKey: string) => {
    const startKey = task.startDate || task.dateKey;
    if (!startKey) return false;
    const start = parseISO(startKey);
    const date = parseISO(dateKey);
    if (Number.isNaN(start.getTime()) || Number.isNaN(date.getTime())) return false;
    if (startOfDay(start) > startOfDay(date)) return false;
    if (task.recurrence === 'daily') return true;
    if (task.recurrence === 'weekly') return getDay(start) === getDay(date);
    if (task.recurrence === 'custom') {
      const interval = Math.max(1, task.repeatInterval || 1);
      if (task.repeatUnit === 'month') {
        if (start.getDate() !== date.getDate()) return false;
        const months = differenceInMonths(date, start);
        return months >= 0 && months % interval === 0;
      }
      if (task.repeatUnit === 'week') {
        const days = diffDays(date, start);
        return days >= 0 && days % (interval * 7) === 0;
      }
      const days = diffDays(date, start);
      return days >= 0 && days % interval === 0;
    }
    return startKey === dateKey;
  };

  const activityMapByDate = useMemo(() => {
    const map = new Map<string, Map<string, { completed?: boolean }>>();
    Object.entries(schedule || {}).forEach(([dateKey, day]) => {
      const activityMap = new Map<string, { completed?: boolean }>();
      Object.values(day).forEach((value: any) => {
        if (!Array.isArray(value)) return;
        value.forEach((act: any) => {
          if (!act?.id) return;
          activityMap.set(act.id, act);
          (act.taskIds || []).forEach((taskId: string) => {
            if (!taskId) return;
            if (!activityMap.has(taskId)) activityMap.set(taskId, act);
          });
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

  const isTaskCompletedOnDate = (task: NonNullable<MindsetPoint["tasks"]>[number], dateKey: string) => {
    const activityMap = activityMapByDate.get(dateKey);
    const activity: any = activityMap?.get(task.activityId || task.id) || activityMap?.get(task.id);
    if (activity) {
      if (activity.completed) return true;
    }
    if (task.recurrence && task.recurrence !== 'none') {
      return !!task.completionHistory?.[dateKey];
    }
    if (task.dateKey && task.dateKey !== dateKey) return false;
    // For one-off tasks only: require date-bound completion; ignore stale global completed flags.
    if (!task.dateKey) return false;
    return !!task.completed;
  };
  const isTaskScheduledOnDate = (task: NonNullable<MindsetPoint["tasks"]>[number], dateKey: string) => {
    const activityId = task.activityId || task.id;
    if (activityId && scheduledDatesByTaskId.get(activityId)?.has(dateKey)) return true;
    if (task.id && task.id !== activityId && scheduledDatesByTaskId.get(task.id)?.has(dateKey)) return true;
    return false;
  };

  const buildBotheringConsistency = useCallback((point: MindsetPoint, sourceType: BotheringSourceType) => {
    const today = startOfDay(new Date());
    const oneYearAgo = addDays(today, -365);
    let score = 0;
    let hasAnyCompletion = false;
    const data: { date: string; fullDate: string; score: number }[] = [];
    const tasks = getEffectiveTasks(point, sourceType);

    for (let d = new Date(oneYearAgo); d <= today; d = addDays(d, 1)) {
      const dateKey = format(d, 'yyyy-MM-dd');
      let due = 0;
      let completed = 0;
      tasks.forEach(task => {
        if (!isTaskDueOnDate(task, dateKey)) return;
        if (!isTaskScheduledOnDate(task, dateKey)) return;
        due += 1;
        if (isTaskCompletedOnDate(task, dateKey)) completed += 1;
      });

      if (due === 0) continue;
      if (completed === due) {
        hasAnyCompletion = true;
        score += (1 - score) * 0.1;
      } else if (hasAnyCompletion) {
        score *= 0.95;
      }

      data.push({
        date: format(d, 'MMM dd'),
        fullDate: format(d, 'PPP'),
        score: Math.round(score * 100),
      });
    }

    return data;
  }, [getEffectiveTasks, isTaskDueOnDate, isTaskScheduledOnDate, isTaskCompletedOnDate]);

  const getTodayStats = (point: MindsetPoint, sourceType: BotheringSourceType) => {
    const tasks = getEffectiveTasks(point, sourceType);
    let total = 0;
    let completed = 0;
    tasks.forEach(t => {
      if (!isTaskDueOnDate(t, todayKey)) return;
      const completedToday = isTaskCompletedOnDate(t, todayKey);
      const scheduledToday = !!(
        (t.activityId && todayActivityIds.has(t.activityId)) ||
        (t.id && todayActivityIds.has(t.id))
      );
      if (!scheduledToday && !completedToday) return;
      total += 1;
      if (completedToday) completed += 1;
    });
    return { total, completed };
  };
  const visibleBotheringsByType = activeBotheringsByType.map((group) => {
    if (group.type === 'Parked') return group;
    return {
      ...group,
      points: group.points.filter(({ point, sourceType }) => getTodayStats(point, sourceType).total > 0),
    };
  });
  const allPoints = visibleBotheringsByType.flatMap((group) => group.points);
  const uniqueAllPoints = Array.from(
    new Map(allPoints.map((item) => [`${item.sourceType}:${item.point.id}`, item])).values()
  );
  const visibleTabs = [{ type: 'All' as const, points: uniqueAllPoints }, ...visibleBotheringsByType];
  const activeBotherings = visibleTabs.find(t => t.type === activeTab)?.points || [];
  const tabCounts = visibleTabs.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = item.points.length;
    return acc;
  }, {});

  return (
    <Card className="bg-card/50 h-[520px] flex flex-col overflow-hidden">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Brain />
              Botherings
            </CardTitle>
            <CardDescription>Botherings grouped by task links.</CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(['All', 'External', 'Mismatch', 'Constraint', 'Parked'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded-full border text-xs transition ${
                activeTab === tab
                  ? 'border-emerald-400/50 text-emerald-300 bg-emerald-500/10'
                  : 'border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <span>{tab}</span>
                <span className="px-1.5 py-0.5 rounded-full border border-white/10 bg-background/40 text-[10px]">
                  {tabCounts[tab] ?? 0}
                </span>
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pr-2">
        {activeBotherings.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            No active botherings.
          </div>
        ) : (
          <ul className="space-y-3">
            {activeBotherings.map((item) => {
              const b = item.point;
              const stats = getTodayStats(b, item.sourceType);
              const isDoneToday = stats.total > 0 && stats.completed === stats.total;
              return (
              <li
                key={b.id}
                className={`rounded-lg border p-3 cursor-pointer transition ${
                  isDoneToday
                    ? "border-emerald-400/50 bg-emerald-500/10"
                    : "border-muted/40 bg-muted/20 hover:border-emerald-400/40 hover:bg-emerald-500/5"
                }`}
                onClick={() => setHighlightForPoint(b, item.sourceType)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`text-sm font-semibold ${isDoneToday ? "line-through text-muted-foreground" : ""}`}>{b.text}</div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="mt-0.5 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        const data = buildBotheringConsistency(b, item.sourceType);
                        setConsistencyModal({ title: b.text, data });
                      }}
                      title="Show consistency"
                    >
                      <LineChartIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="mt-0.5 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        const type =
                          item.sourceType === 'External' ? 'external' :
                          item.sourceType === 'Mismatch' ? 'mismatch' :
                          'constraint';
                        window.dispatchEvent(new CustomEvent('open-bothering-popup', { detail: { type, pointId: b.id } }));
                      }}
                      title="Open bothering"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300/90 bg-amber-400/10">
                    {getDaysLeftLabel(b.endDate)}
                  </span>
                  {getEffectiveTasks(b, item.sourceType).length === 0 ? (
                    <span>No tasks linked</span>
                  ) : stats.total > 0 ? (
                    <span className={stats.completed === stats.total ? "line-through text-muted-foreground" : ""}>
                      {stats.completed}/{stats.total} done
                    </span>
                  ) : (
                    <span>No tasks due today</span>
                  )}
                </div>
              </li>
            )})}
          </ul>
        )}
      </CardContent>
      {consistencyModal && (
        <Dialog open onOpenChange={() => setConsistencyModal(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Consistency</DialogTitle>
              <DialogDescription>{consistencyModal.title}</DialogDescription>
            </DialogHeader>
            {consistencyModal.data.length > 0 ? (
              <ChartContainer config={{ score: { label: 'Consistency %' } }} className="min-h-[300px] w-full pr-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={consistencyModal.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} domain={[0, 100]} />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-2 bg-background border rounded-md text-xs shadow-lg max-w-sm">
                            <p>{payload[0].payload.fullDate}: <strong>{payload[0].value}%</strong></p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Line type="monotone" dataKey="score" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">Not enough data to calculate consistency.</p>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
