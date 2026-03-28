"use client";

import React, { startTransition, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Brain, ExternalLink, LineChart as LineChartIcon, Sparkles, Loader2 } from "lucide-react";
import {
  parseISO,
  startOfDay,
  differenceInDays,
  getDay,
  differenceInMonths,
  differenceInDays as diffDays,
  format,
  addDays,
} from "date-fns";
import type { MindsetPoint } from "@/types/workout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChartContainer } from "@/components/ui/chart";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { getAiConfigFromSettings, normalizeAiSettings } from "@/lib/ai/config";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getEffectiveConstraintTasks } from "@/lib/botheringUtils";
import { useHighlightedTasks } from "@/hooks/useHighlightedTasks";

type BotheringSourceType = "External" | "Mismatch" | "Constraint";
type BotheringTask = NonNullable<MindsetPoint["tasks"]>[number];
type BotheringTab = "All" | "External" | "Mismatch" | "Constraint" | "Parked";

type BotheringItem = {
  point: MindsetPoint;
  sourceType: BotheringSourceType;
};

const SOURCE_CONFIG: Array<{ id: string; label: BotheringSourceType }> = [
  { id: "mindset_botherings_external", label: "External" },
  { id: "mindset_botherings_mismatch", label: "Mismatch" },
  { id: "mindset_botherings_constraint", label: "Constraint" },
];

export function BotheringsCard() {
  const { mindsetCards, schedule, settings, setMindsetCards } = useAuth();
  const { setHighlightedTaskIds } = useHighlightedTasks();
  const isDesktopRuntime = typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop);
  const isAiEnabled = normalizeAiSettings(settings.ai, isDesktopRuntime).provider !== "none";

  const [activeTab, setActiveTab] = useState<BotheringTab>("External");
  const [rewritingIds, setRewritingIds] = useState<Set<string>>(new Set());
  const [consistencyModal, setConsistencyModal] = useState<{ title: string; data: { date: string; fullDate: string; score: number }[] } | null>(null);

  const todayKey = format(new Date(), "yyyy-MM-dd");

  const normalizeText = useCallback(
    (value?: string) =>
      (value || "")
        .trim()
        .toLowerCase()
        .replace(/[’']/g, "")
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " "),
    []
  );

  const isMalformedBotheringText = useCallback((value?: string) => {
    const text = String(value || "").trim();
    if (!text) return true;
    return /^(output|rewrite|rephrase)\s*:?\s*$/i.test(text);
  }, []);

  const hasEgoIdentification = useCallback((value?: string) => {
    const text = normalizeText(value);
    if (!text) return false;
    if (/^(my|i|me|mine|myself)\b/.test(text)) return true;
    return /\b(i|me|my|mine|myself|im|ive|id|ill)\b/.test(text);
  }, [normalizeText]);

  const mismatchPointById = useMemo(() => {
    const mismatchPoints = mindsetCards.find((c) => c.id === "mindset_botherings_mismatch")?.points || [];
    return new Map(mismatchPoints.map((point) => [point.id, point] as const));
  }, [mindsetCards]);
  const externalPointById = useMemo(() => {
    const externalPoints = mindsetCards.find((c) => c.id === "mindset_botherings_external")?.points || [];
    return new Map(externalPoints.map((point) => [point.id, point] as const));
  }, [mindsetCards]);

  const sourceTypeToCardId = useCallback((sourceType: BotheringSourceType) => {
    if (sourceType === "External") return "mindset_botherings_external";
    if (sourceType === "Mismatch") return "mindset_botherings_mismatch";
    return "mindset_botherings_constraint";
  }, []);

  const getEffectiveTasks = useCallback(
    (point: MindsetPoint, sourceType: BotheringSourceType): BotheringTask[] => {
      const directTasks = point.tasks || [];
      if (sourceType !== "Constraint") return directTasks;
      return getEffectiveConstraintTasks(point, mismatchPointById, externalPointById);
    },
    [externalPointById, mismatchPointById]
  );

  const todayScheduleContext = useMemo(() => {
    const idSet = new Set<string>();
    const detailSet = new Set<string>();
    const activityMap = new Map<string, { completed?: boolean }>();
    const activities: any[] = [];

    const day = schedule?.[todayKey] || {};
    Object.values(day).forEach((value: any) => {
      if (!Array.isArray(value)) return;
      value.forEach((act: any) => {
        activities.push(act);
        const actId = String(act?.id || "");
        if (actId) {
          idSet.add(actId);
          activityMap.set(actId, act);
          const baseMatch = actId.match(/_(\d{4}-\d{2}-\d{2})$/);
          if (baseMatch) {
            const baseId = actId.slice(0, -11);
            idSet.add(baseId);
            if (!activityMap.has(baseId)) activityMap.set(baseId, act);
          }
        }

        (act?.taskIds || []).forEach((taskId: string) => {
          const tid = String(taskId || "");
          if (!tid) return;
          idSet.add(tid);
          if (!activityMap.has(tid)) activityMap.set(tid, act);
        });

        const detail = normalizeText(act?.details);
        if (detail) detailSet.add(detail);
      });
    });

    return { idSet, detailSet, activityMap, activities };
  }, [schedule, todayKey, normalizeText]);

  const getHighlightIdsForTaskInTodaySlots = useCallback(
    (task: BotheringTask) => {
      const ids = new Set<string>();
      const activityId = String(task.activityId || "");
      const taskId = String(task.id || "");
      const taskDetail = normalizeText(task.details);

      todayScheduleContext.activities.forEach((activity: any) => {
        const scheduledActivityId = String(activity?.id || "");
        const baseMatch = scheduledActivityId.match(/_(\d{4}-\d{2}-\d{2})$/);
        const scheduledBaseId = baseMatch ? scheduledActivityId.slice(0, -11) : scheduledActivityId;
        const scheduledTaskIds = (activity?.taskIds || []).map((id: string) => String(id || "")).filter(Boolean);
        const scheduledDetail = normalizeText(activity?.details);

        const matchesById =
          (!!activityId && (activityId === scheduledActivityId || activityId === scheduledBaseId || scheduledTaskIds.includes(activityId))) ||
          (!!taskId && (taskId === scheduledActivityId || taskId === scheduledBaseId || scheduledTaskIds.includes(taskId)));
        const matchesByDetail = !!taskDetail && !!scheduledDetail && taskDetail === scheduledDetail;

        if (!matchesById && !matchesByDetail) return;

        if (scheduledActivityId) ids.add(scheduledActivityId);
        if (scheduledBaseId) ids.add(scheduledBaseId);
        scheduledTaskIds.forEach((id: string) => ids.add(id));
      });

      return ids;
    },
    [normalizeText, todayScheduleContext.activities]
  );

  const getHighlightIdsForPoint = useCallback(
    (point: MindsetPoint, sourceType: BotheringSourceType) => {
      const ids = new Set<string>();
      getEffectiveTasks(point, sourceType).forEach((task) => {
        getHighlightIdsForTaskInTodaySlots(task).forEach((id) => ids.add(id));
      });

      if (ids.size === 0) {
        getEffectiveTasks(point, sourceType).forEach((task) => {
          if (task.id) ids.add(task.id);
          if (task.activityId) ids.add(task.activityId);
        });
      }

      return ids;
    },
    [getEffectiveTasks, getHighlightIdsForTaskInTodaySlots]
  );

  const isTaskPresentInTodaySlots = useCallback(
    (task: BotheringTask) => {
      const activityId = String(task.activityId || "");
      const taskId = String(task.id || "");
      const taskDetail = normalizeText(task.details);

      if (activityId && todayScheduleContext.idSet.has(activityId)) return true;
      if (taskId && todayScheduleContext.idSet.has(taskId)) return true;

      if (taskDetail && todayScheduleContext.detailSet.has(taskDetail)) return true;

      return false;
    },
    [normalizeText, todayScheduleContext]
  );

  const isTaskCompletedToday = useCallback(
    (task: BotheringTask) => {
      const activity: any =
        todayScheduleContext.activityMap.get(task.activityId || task.id || "") ||
        todayScheduleContext.activityMap.get(task.id || "");
      if (activity?.completed) return true;
      if (task.recurrence && task.recurrence !== "none") return !!task.completionHistory?.[todayKey];
      if (task.dateKey && task.dateKey !== todayKey) return false;
      if (!task.dateKey) return false;
      return !!task.completed;
    },
    [todayScheduleContext.activityMap, todayKey]
  );

  const isTaskDueOnDate = useCallback((task: BotheringTask, dateKey: string) => {
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
        const months = differenceInMonths(date, start);
        return months >= 0 && months % interval === 0;
      }
      if (task.repeatUnit === "week") {
        const days = diffDays(date, start);
        return days >= 0 && days % (interval * 7) === 0;
      }
      const days = diffDays(date, start);
      return days >= 0 && days % interval === 0;
    }
    return startKey === dateKey;
  }, []);

  const activeByType = useMemo(() => {
    const typed = SOURCE_CONFIG.map(({ id, label }) => {
      const points = (mindsetCards.find((c) => c.id === id)?.points || []).filter((p) => getEffectiveTasks(p, label).length > 0);
      return { type: label, points: points.map((point) => ({ point, sourceType: label } as BotheringItem)) };
    });

    const parkedPoints = SOURCE_CONFIG.flatMap(({ id, label }) =>
      (mindsetCards.find((c) => c.id === id)?.points || [])
        .filter((point) => getEffectiveTasks(point, label).length === 0 && !point.completed && !!point.endDate?.trim())
        .map((point) => ({ point, sourceType: label } as BotheringItem))
    );

    return [...typed, { type: "Parked" as const, points: parkedPoints }];
  }, [mindsetCards, getEffectiveTasks]);

  const visibleByType = useMemo(() => {
    return activeByType.map((group) => {
      if (group.type === "Parked") return group;
      return {
        ...group,
        points: group.points.filter((item) => getEffectiveTasks(item.point, item.sourceType).some(isTaskPresentInTodaySlots)),
      };
    });
  }, [activeByType, getEffectiveTasks, isTaskPresentInTodaySlots]);

  const allPoints = visibleByType.flatMap((group) => group.points);
  const uniqueAllPoints = Array.from(new Map(allPoints.map((item) => [`${item.sourceType}:${item.point.id}`, item])).values());
  const visibleTabs = [{ type: "All" as const, points: uniqueAllPoints }, ...visibleByType];
  const activeBotherings = visibleTabs.find((t) => t.type === activeTab)?.points || [];
  const tabCounts = visibleTabs.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = item.points.length;
    return acc;
  }, {});

  const highlightIdsByPointKey = useMemo(() => {
    const map = new Map<string, Set<string>>();
    uniqueAllPoints.forEach((item) => {
      map.set(`${item.sourceType}:${item.point.id}`, getHighlightIdsForPoint(item.point, item.sourceType));
    });
    return map;
  }, [getHighlightIdsForPoint, uniqueAllPoints]);

  const getTodayStats = useCallback(
    (point: MindsetPoint, sourceType: BotheringSourceType) => {
      const tasks = getEffectiveTasks(point, sourceType);
      let total = 0;
      let completed = 0;
      tasks.forEach((task) => {
        if (!isTaskPresentInTodaySlots(task)) return;
        total += 1;
        if (isTaskCompletedToday(task)) completed += 1;
      });
      return { total, completed };
    },
    [getEffectiveTasks, isTaskCompletedToday, isTaskPresentInTodaySlots]
  );

  const getDaysLeftLabel = useCallback((endDate?: string) => {
    if (!endDate) return "No end date";
    const target = parseISO(endDate);
    if (Number.isNaN(target.getTime())) return "No end date";
    const today = startOfDay(new Date());
    const diff = differenceInDays(target, today);
    if (diff < 0) return `Overdue ${Math.abs(diff)}d`;
    if (diff === 0) return "Due today";
    return `${diff}d left`;
  }, []);

  const setHighlightForPoint = useCallback((point: MindsetPoint, sourceType: BotheringSourceType) => {
    const ids = highlightIdsByPointKey.get(`${sourceType}:${point.id}`) || new Set<string>();
    startTransition(() => {
      setHighlightedTaskIds((prev) => {
        const same = ids.size === prev.size && Array.from(ids).every((id) => prev.has(id));
        return same ? new Set() : new Set(ids);
      });
    });
  }, [highlightIdsByPointKey, setHighlightedTaskIds]);

  const buildBotheringConsistency = useCallback((point: MindsetPoint, sourceType: BotheringSourceType) => {
    const today = startOfDay(new Date());
    const oneYearAgo = addDays(today, -365);
    let score = 0;
    let hasAnyCompletion = false;
    const data: { date: string; fullDate: string; score: number }[] = [];
    const tasks = getEffectiveTasks(point, sourceType);

    for (let d = new Date(oneYearAgo); d <= today; d = addDays(d, 1)) {
      const dateKey = format(d, "yyyy-MM-dd");
      let due = 0;
      let completed = 0;
      tasks.forEach((task) => {
        if (!isTaskDueOnDate(task, dateKey)) return;
        if (dateKey !== todayKey) return;
        if (!isTaskPresentInTodaySlots(task)) return;
        due += 1;
        if (isTaskCompletedToday(task)) completed += 1;
      });

      if (due === 0) continue;
      if (completed === due) {
        hasAnyCompletion = true;
        score += (1 - score) * 0.1;
      } else if (hasAnyCompletion) {
        score *= 0.95;
      }

      data.push({
        date: format(d, "MMM dd"),
        fullDate: format(d, "PPP"),
        score: Math.round(score * 100),
      });
    }

    return data;
  }, [getEffectiveTasks, isTaskCompletedToday, isTaskDueOnDate, isTaskPresentInTodaySlots, todayKey]);

  const cleanRewrite = useCallback((value: string) => {
    const trimmed = value
      .trim()
      .replace(/^['"`]+|['"`]+$/g, "")
      .replace(/^(output|rewrite|rephrase)\s*:\s*/i, "")
      .replace(/^\-\s*/, "");
    const oneLine = trimmed
      .replace(/```[\s\S]*?```/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !/^(output|rewrite|rephrase)\s*:?$/i.test(line))[0] || trimmed;
    return oneLine;
  }, []);

  const fallbackEgoLessRewrite = useCallback((value: string) => {
    return String(value || "")
      .replace(/[’]/g, "'")
      .replace(/^\s*my\b/i, "Body")
      .replace(/\bmy\b/gi, "the")
      .replace(/\bmine\b/gi, "theirs")
      .replace(/\bi\b/gi, "this person")
      .replace(/\bme\b/gi, "this person")
      .replace(/\bmyself\b/gi, "oneself")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const fallbackFromTasks = useCallback((point: MindsetPoint, sourceType: BotheringSourceType) => {
    const firstTask = getEffectiveTasks(point, sourceType).find((t) => (t.details || "").trim().length > 0);
    if (firstTask?.details) return `Difficulty maintaining consistency with ${firstTask.details}.`;
    return "Difficulty maintaining consistency with current priorities.";
  }, [getEffectiveTasks]);

  const rewriteToEgoLess = useCallback(async (point: MindsetPoint, sourceType: BotheringSourceType) => {
    const rewriteKey = `${sourceType}:${point.id}`;
    if (rewritingIds.has(rewriteKey)) return;

    const original = (point.text || "").trim();
    const malformed = isMalformedBotheringText(original);
    if (!original || (!hasEgoIdentification(original) && !malformed)) return;
    const inputText = malformed ? fallbackFromTasks(point, sourceType) : original;

    setRewritingIds((prev) => new Set(prev).add(rewriteKey));
    try {
      const isDesktopRuntime = typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop);
      const response = await fetch("/api/ai/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isDesktopRuntime ? { "x-studio-desktop": "1" } : {}),
        },
        body: JSON.stringify({
          text: inputText,
          context: "Bothering sentence rephrase",
          question: "Rewrite this bothering in neutral ego-less wording. Keep same meaning. Output one short sentence only, plain text.",
          aiConfig: getAiConfigFromSettings(settings, isDesktopRuntime),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(result?.details || result?.error || "Failed to rewrite bothering."));

      const rewrittenCandidate = cleanRewrite(String(result?.explanation || ""));
      const invalid = !rewrittenCandidate || /^(output|rewrite|rephrase)\s*:?$/i.test(rewrittenCandidate) || rewrittenCandidate.length < 5;
      const rewritten = invalid ? (malformed ? fallbackFromTasks(point, sourceType) : fallbackEgoLessRewrite(original)) : rewrittenCandidate;
      if (!rewritten || rewritten === original) return;

      const cardId = sourceTypeToCardId(sourceType);
      setMindsetCards((prev) =>
        prev.map((card) =>
          card.id !== cardId
            ? card
            : {
                ...card,
                points: (card.points || []).map((p) => (p.id === point.id ? { ...p, text: rewritten } : p)),
              }
        )
      );
    } catch {
      // keep silent to avoid interrupting card usage
    } finally {
      setRewritingIds((prev) => {
        const next = new Set(prev);
        next.delete(rewriteKey);
        return next;
      });
    }
  }, [cleanRewrite, fallbackEgoLessRewrite, fallbackFromTasks, hasEgoIdentification, isMalformedBotheringText, rewritingIds, settings, setMindsetCards, sourceTypeToCardId]);

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
          {(["All", "External", "Mismatch", "Constraint", "Parked"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded-full border text-xs transition ${
                activeTab === tab
                  ? "bothering-tab-active"
                  : "bothering-tab-inactive"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <span>{tab}</span>
                <span className="bothering-tab-count px-1.5 py-0.5 rounded-full border text-[10px]">
                  {tabCounts[tab] ?? 0}
                </span>
              </span>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto pr-2">
        {activeBotherings.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">No active botherings.</div>
        ) : (
          <ul className="space-y-3">
            {activeBotherings.map((item) => {
              const b = item.point;
              const stats = getTodayStats(b, item.sourceType);
              const isDoneToday = stats.total > 0 && stats.completed === stats.total;

              return (
                <li
                  key={`${item.sourceType}:${b.id}`}
                  className={`rounded-lg border p-3 cursor-pointer select-none transition ${
                    isDoneToday
                      ? "bothering-item-done"
                      : "bothering-item-open"
                  }`}
                  onClick={() => setHighlightForPoint(b, item.sourceType)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={`pointer-events-none select-none text-sm font-semibold ${isDoneToday ? "line-through text-muted-foreground" : ""}`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="m-0">{children}</p>,
                        }}
                      >
                        {b.text || ""}
                      </ReactMarkdown>
                    </div>
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

                      {isDesktopRuntime && isAiEnabled && (hasEgoIdentification(b.text) || isMalformedBotheringText(b.text)) ? (
                        <button
                          type="button"
                          className="mt-0.5 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            void rewriteToEgoLess(b, item.sourceType);
                          }}
                          title="Rewrite to ego-less wording"
                        >
                          {rewritingIds.has(`${item.sourceType}:${b.id}`) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="mt-0.5 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          const type = item.sourceType === "External" ? "external" : item.sourceType === "Mismatch" ? "mismatch" : "constraint";
                          window.dispatchEvent(new CustomEvent("open-bothering-popup", { detail: { type, pointId: b.id } }));
                        }}
                        title="Open bothering"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground select-none pointer-events-none">
                    <span className="bothering-deadline-pill px-2 py-0.5 rounded-full border">
                      {getDaysLeftLabel(b.endDate)}
                    </span>
                    {getEffectiveTasks(b, item.sourceType).length === 0 ? (
                      <span>No tasks linked</span>
                    ) : stats.total > 0 ? (
                      <span className={stats.completed === stats.total ? "line-through text-muted-foreground" : ""}>
                        {stats.completed}/{stats.total} done
                      </span>
                    ) : (
                      <span>No linked task in today's slots</span>
                    )}
                  </div>
                </li>
              );
            })}
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
              <ChartContainer config={{ score: { label: "Consistency %" } }} className="min-h-[300px] w-full pr-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={consistencyModal.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} domain={[0, 100]} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="p-2 bg-background border rounded-md text-xs shadow-lg max-w-sm">
                              <p>
                                {payload[0].payload.fullDate}: <strong>{payload[0].value}%</strong>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
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
