"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Brain } from "lucide-react";
import { parseISO, startOfDay, differenceInDays, getDay, differenceInMonths, differenceInDays as diffDays, format } from "date-fns";

export function BotheringsCard() {
  const { mindsetCards, highlightedTaskIds, setHighlightedTaskIds, schedule } = useAuth();

  const activeBotheringsByType = useMemo(() => {
    const sources = [
      { id: "mindset_botherings_external", label: "External" as const },
      { id: "mindset_botherings_mismatch", label: "Mismatch" as const },
      { id: "mindset_botherings_constraint", label: "Constraint" as const },
    ];
    return sources.map(({ id, label }) => ({
      type: label,
      points: (mindsetCards.find((c) => c.id === id)?.points || [])
        .filter((point) => (point.tasks?.length || 0) > 0 && !point.completed),
    }));
  }, [mindsetCards]);

  const [activeTab, setActiveTab] = React.useState<'External' | 'Mismatch' | 'Constraint'>('External');
  const activeBotherings = activeBotheringsByType.find(t => t.type === activeTab)?.points || [];
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

  const getHighlightIds = (point: (typeof activeBotherings)[number]) => {
    const ids = new Set<string>();
    (point.tasks || []).forEach(t => {
      if (t.id) ids.add(t.id);
      if (t.activityId) ids.add(t.activityId);
    });
    return ids;
  };

  const setHighlightForPoint = (point: (typeof activeBotherings)[number]) => {
    const ids = getHighlightIds(point);
    const same =
      ids.size === highlightedTaskIds.size &&
      Array.from(ids).every(id => highlightedTaskIds.has(id));
    setHighlightedTaskIds(same ? new Set() : ids);
  };

  const isTaskDueOnDate = (task: NonNullable<(typeof activeBotherings)[number]["tasks"]>[number], dateKey: string) => {
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

  const isTaskCompletedOnDate = (task: NonNullable<(typeof activeBotherings)[number]["tasks"]>[number], dateKey: string) => {
    if (task.recurrence && task.recurrence !== 'none') {
      return !!task.completionHistory?.[dateKey];
    }
    if (task.dateKey && task.dateKey !== dateKey) return false;
    return !!task.completed;
  };

  const getTodayStats = (point: (typeof activeBotherings)[number]) => {
    const tasks = point.tasks || [];
    let total = 0;
    let completed = 0;
    tasks.forEach(t => {
      if (!isTaskDueOnDate(t, todayKey)) return;
      const completedToday = isTaskCompletedOnDate(t, todayKey);
      const activityId = t.activityId || t.id;
      const scheduledToday = activityId ? todayActivityIds.has(activityId) : false;
      if (!scheduledToday && !completedToday) return;
      total += 1;
      if (completedToday) completed += 1;
    });
    return { total, completed };
  };

  return (
    <Card className="bg-card/50 h-[420px]">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Brain />
              Botherings
            </CardTitle>
            <CardDescription>Active botherings with linked tasks.</CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {(['External', 'Mismatch', 'Constraint'] as const).map(tab => (
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
              {tab}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="h-[320px] overflow-y-auto pr-2">
        {activeBotherings.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            No active botherings.
          </div>
        ) : (
          <ul className="space-y-3">
            {activeBotherings.map((b) => {
              const stats = getTodayStats(b);
              const isDoneToday = stats.total > 0 && stats.completed === stats.total;
              return (
              <li
                key={b.id}
                className={`rounded-lg border p-3 cursor-pointer transition ${
                  isDoneToday
                    ? "border-emerald-400/50 bg-emerald-500/10"
                    : "border-muted/40 bg-muted/20 hover:border-emerald-400/40 hover:bg-emerald-500/5"
                }`}
                onClick={() => setHighlightForPoint(b)}
              >
                <div className={`text-sm font-semibold ${isDoneToday ? "line-through text-muted-foreground" : ""}`}>{b.text}</div>
                <div className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300/90 bg-amber-400/10">
                    {getDaysLeftLabel(b.endDate)}
                  </span>
                  {stats.total > 0 ? (
                    <span>{stats.completed}/{stats.total} done</span>
                  ) : (
                    <span>No tasks due today</span>
                  )}
                </div>
              </li>
            )})}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
