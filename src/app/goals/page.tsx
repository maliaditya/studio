"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Plus, Edit2, Trash2, Check, X, Link as LinkIcon, Unlink, Circle, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import CalendarHeatmap from 'react-calendar-heatmap';
import { differenceInCalendarDays, format, parseISO, startOfDay, subYears } from 'date-fns';
import type { Goal, GoalMilestone } from '@/types/workout';

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  archived: 'bg-neutral-100 text-neutral-800',
};

const normalizeMilestones = (milestones?: GoalMilestone[]) =>
  (milestones || [])
    .map((milestone) => ({
      ...milestone,
      title: String(milestone.title || '').trim(),
      date: String(milestone.date || '').trim(),
      completed: Boolean(milestone.completed),
      completedDate: milestone.completedDate,
    }))
    .filter((milestone) => milestone.title && milestone.date)
    .sort((left, right) => left.date.localeCompare(right.date));

const stripInstanceDateSuffix = (value?: string) => (value || '').replace(/_\d{4}-\d{2}-\d{2}$/, '');

const GoalActivityHeatmap = ({ goal, routines, schedule }: { goal: Goal; routines: any[]; schedule: any }) => {
  const linkedRoutines = useMemo(() => {
    return routines.filter((r) => goal.linkedTaskIds?.includes(r.id));
  }, [goal.linkedTaskIds, routines]);
  const linkedRoutineIds = useMemo(
    () => new Set(linkedRoutines.map((routine) => stripInstanceDateSuffix(routine.id))),
    [linkedRoutines]
  );
  const milestones = useMemo(() => normalizeMilestones(goal.milestones), [goal.milestones]);

  if (linkedRoutines.length === 0 && milestones.length === 0) return null;

  const today = new Date();
  const oneYearAgo = subYears(today, 1);
  const milestoneTitlesByDate = useMemo(() => {
    const next = new Map<string, GoalMilestone[]>();
    milestones.forEach((milestone) => {
      const existing = next.get(milestone.date) || [];
      existing.push(milestone);
      next.set(milestone.date, existing);
    });
    return next;
  }, [milestones]);

  interface HeatmapValue {
    date: string;
    count: number;
    activities: string[];
    milestones: GoalMilestone[];
  }

  const heatmapValues: HeatmapValue[] = useMemo(() => {
    const valuesByDate = new Map<string, HeatmapValue>();

    Object.entries(schedule).forEach(([date, dailySchedule]: [string, any]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

      const completedLinkedActivities = Object.values(dailySchedule as Record<string, any[]>)
        .flat()
        .filter((activity: any) => {
          if (!activity || !activity.completed) return false;

          const normalizedIds = new Set([
            stripInstanceDateSuffix(activity.id),
            ...(activity.taskIds || []).map((id: string) => stripInstanceDateSuffix(id)),
          ]);

          for (const normalizedId of normalizedIds) {
            if (linkedRoutineIds.has(normalizedId)) {
              return true;
            }
          }

          return false;
        });

      const activities = Array.from(
        new Set(
          completedLinkedActivities
            .map((activity: any) => String(activity.details || '').trim())
            .filter(Boolean)
        )
      );

      const milestoneEntries = milestoneTitlesByDate.get(date) || [];

      if (completedLinkedActivities.length === 0 && milestoneEntries.length === 0) {
        return;
      }

      valuesByDate.set(date, {
        date,
        count: completedLinkedActivities.length,
        activities,
        milestones: milestoneEntries,
      });
    });

    milestones.forEach((milestone) => {
      const existing = valuesByDate.get(milestone.date);
      if (existing) {
        if (!existing.milestones.some((entry) => entry.id === milestone.id)) {
          existing.milestones = [...existing.milestones, milestone];
        }
        return;
      }

      valuesByDate.set(milestone.date, {
        date: milestone.date,
        count: 0,
        activities: [],
        milestones: [milestone],
      });
    });

    return Array.from(valuesByDate.values());
  }, [linkedRoutineIds, milestoneTitlesByDate, milestones, schedule]);

  return (
    <div className="mt-5 border-t border-border pt-5">
      <div className="w-full rounded-lg bg-transparent">
        <TooltipProvider>
          <CalendarHeatmap
            startDate={oneYearAgo}
            endDate={today}
            values={heatmapValues}
            className="goal-heatmap w-full"
            showOutOfRangeDays={true}
            classForValue={(value) => {
              if (value?.milestones?.length) {
                const allMilestonesCompleted = value.milestones.every((milestone) => milestone.completed);
                if (allMilestonesCompleted && value.count > 0) return 'goal-milestone-complete';
                if (allMilestonesCompleted) return 'goal-milestone-done';
                if (value.count > 0) return 'goal-milestone-progress';
                return 'goal-milestone';
              }
              if (!value || value.count === 0) { return 'color-empty'; }
              if (value.count >= 4) return 'color-scale-4';
              if (value.count >= 3) return 'color-scale-3';
              if (value.count >= 2) return 'color-scale-2';
              return 'color-scale-1';
            }}
            onClick={() => {}}
            transformDayElement={(element, value, index) => {
              const date = value?.date || format(new Date(oneYearAgo.getTime() + index * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

              if (!value || value.count === 0) {
                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      {React.cloneElement(element, { 'aria-label': `No linked tasks completed on ${format(parseISO(date), 'PPP')}` })}
                    </TooltipTrigger>
                    <TooltipContent className="max-w-72">
                      <div className="space-y-1">
                        <p className="font-medium">{format(parseISO(date), 'PPP')}</p>
                        {value?.milestones?.length ? (
                          <div className="space-y-1">
                            <p className="text-sm text-amber-300">Milestone day</p>
                            {value.milestones.map((milestone, milestoneIndex) => (
                              <p key={`${date}-milestone-${milestoneIndex}`} className="text-sm leading-snug break-words">
                                {milestone.completed ? 'Completed: ' : ''}{milestone.title}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No linked tasks completed</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>{element}</TooltipTrigger>
                  <TooltipContent className="max-w-80">
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium">{format(parseISO(value.date), 'PPP')}</p>
                        <p className="text-sm text-muted-foreground">
                          {value.count} linked task{value.count === 1 ? '' : 's'} completed
                        </p>
                      </div>
                      {value.milestones.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-amber-300">Milestones</p>
                          {value.milestones.map((milestone, milestoneIndex) => (
                            <p key={`${value.date}-milestone-${milestoneIndex}`} className="text-sm leading-snug break-words">
                              {milestone.completed ? 'Completed: ' : 'Pending: '}{milestone.title}
                            </p>
                          ))}
                        </div>
                      )}
                      {value.activities.length > 0 && (
                        <div className="space-y-1">
                          {value.activities.slice(0, 4).map((activity, activityIndex) => (
                            <p key={`${value.date}-${activityIndex}`} className="text-sm leading-snug break-words">
                              {activity}
                            </p>
                          ))}
                          {value.activities.length > 4 && (
                            <p className="text-xs text-muted-foreground">
                              +{value.activities.length - 4} more
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }}
          />
        </TooltipProvider>
      </div>
    </div>
  );
};

export default function GoalsPage() {
  const { goals, setGoals, settings, schedule } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinkTasksDialogOpen, setIsLinkTasksDialogOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [selectedRoutineTaskIds, setSelectedRoutineTaskIds] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    status: 'active' as const,
    dueDate: '',
    milestones: [] as GoalMilestone[],
  });

  const routines = useMemo(() => settings.routines || [], [settings.routines]);

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoalId(goal.id);
      setFormData({
        title: goal.title,
        description: goal.description || '',
        priority: goal.priority || 'medium',
        status: goal.status,
        dueDate: goal.dueDate || '',
        milestones: normalizeMilestones(goal.milestones),
      });
    } else {
      setEditingGoalId(null);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        status: 'active',
        dueDate: '',
        milestones: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleOpenLinkTasksDialog = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (goal) {
      setEditingGoalId(goalId);
      setSelectedRoutineTaskIds(new Set(goal.linkedTaskIds || []));
      setIsLinkTasksDialogOpen(true);
    }
  };

  const handleSaveGoal = () => {
    if (!formData.title.trim()) {
      alert('Goal title is required');
      return;
    }

    if (editingGoalId) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === editingGoalId
            ? {
                ...g,
                title: formData.title,
                description: formData.description,
                priority: formData.priority,
                status: formData.status,
                dueDate: formData.dueDate || undefined,
                milestones: normalizeMilestones(formData.milestones),
              }
            : g
        )
      );
    } else {
      const newGoal: Goal = {
        id: `goal_${Date.now()}`,
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate || undefined,
        createdDate: format(new Date(), 'yyyy-MM-dd'),
        linkedBotheringIds: [],
        linkedTaskIds: [],
        milestones: normalizeMilestones(formData.milestones),
      };
      setGoals((prev) => [...prev, newGoal]);
    }

    setIsDialogOpen(false);
  };

  const handleSaveLinkedTasks = () => {
    if (editingGoalId) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === editingGoalId
            ? {
                ...g,
                linkedTaskIds: Array.from(selectedRoutineTaskIds),
              }
            : g
        )
      );
    }
    setIsLinkTasksDialogOpen(false);
    setEditingGoalId(null);
  };

  const handleUnlinkTask = (goalId: string, taskId: string) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? {
              ...g,
              linkedTaskIds: (g.linkedTaskIds || []).filter((id) => id !== taskId),
            }
          : g
      )
    );
  };

  const handleDeleteGoal = (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    }
  };

  const handleToggleStatus = (goalId: string, currentStatus: Goal['status']) => {
    const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? {
              ...g,
              status: newStatus,
              completedDate: newStatus === 'completed' ? format(new Date(), 'yyyy-MM-dd') : undefined,
            }
          : g
      )
    );
  };

  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.status === 'completed'), [goals]);
  const archivedGoals = useMemo(() => goals.filter((g) => g.status === 'archived'), [goals]);
  const todayStart = startOfDay(new Date());

  const getRoutineTaskTitle = (taskId: string) => {
    const routine = routines.find((r) => r.id === taskId);
    return routine ? `${routine.details} (${routine.slot})` : 'Unknown Task';
  };

  const handleAddMilestone = () => {
    setFormData((prev) => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        { id: `milestone_${Date.now()}_${prev.milestones.length}`, title: '', date: '' },
      ],
    }));
  };

  const handleMilestoneChange = (milestoneId: string, field: 'title' | 'date', value: string) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.map((milestone) =>
        milestone.id === milestoneId ? { ...milestone, [field]: value } : milestone
      ),
    }));
  };

  const handleRemoveMilestone = (milestoneId: string) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((milestone) => milestone.id !== milestoneId),
    }));
  };

  const handleToggleMilestoneComplete = (goalId: string, milestoneId: string) => {
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== goalId) {
          return goal;
        }

        return {
          ...goal,
          milestones: normalizeMilestones(goal.milestones).map((milestone) =>
            milestone.id === milestoneId
              ? {
                  ...milestone,
                  completed: !milestone.completed,
                  completedDate: !milestone.completed ? format(new Date(), 'yyyy-MM-dd') : undefined,
                }
              : milestone
          ),
        };
      })
    );
  };

  return (
    <AuthGuard>
      <div className="h-screen overflow-hidden bg-background p-4 md:p-8">
        <div className="mx-auto flex h-full max-w-6xl flex-col">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Target className="h-8 w-8" />
                <h1 className="text-3xl font-bold">Goals</h1>
              </div>
              <p className="text-muted-foreground">Create and manage your goals</p>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              New Goal
            </Button>
          </div>

          <ScrollArea className="min-h-0 flex-1 pr-3">
            <div className="space-y-8 pb-6">
              {/* Active Goals */}
              {activeGoals.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Active Goals ({activeGoals.length})</h2>
                  <div className="grid gap-4">
                    {activeGoals.map((goal) => {
                      const milestones = normalizeMilestones(goal.milestones);
                      const milestoneCount = milestones.length;
                      const completedMilestoneCount = milestones.filter((milestone) => milestone.completed).length;
                      const linkedTaskCount = goal.linkedTaskIds?.length || 0;
                      const hasHeatmap = linkedTaskCount > 0 || milestoneCount > 0;
                      const dueDateValue = goal.dueDate ? parseISO(goal.dueDate) : null;
                      const daysRemaining = dueDateValue ? differenceInCalendarDays(startOfDay(dueDateValue), todayStart) : null;
                      const daysRemainingLabel = daysRemaining === null
                        ? 'No deadline'
                        : daysRemaining < 0
                          ? 'Overdue'
                          : daysRemaining === 0
                            ? 'Due today'
                            : 'Days left';
                      const daysRemainingDisplay = daysRemaining === null
                        ? '--'
                        : daysRemaining < 0
                          ? `${Math.abs(daysRemaining)}`
                          : `${daysRemaining}`;
                      const dueToneClass = daysRemaining === null
                        ? 'from-slate-500/10 to-transparent text-slate-300'
                        : daysRemaining < 0
                          ? 'from-rose-500/15 to-transparent text-rose-300'
                          : daysRemaining === 0
                            ? 'from-amber-500/15 to-transparent text-amber-300'
                            : 'from-emerald-500/15 to-transparent text-emerald-300';

                      return (
                        <Card key={goal.id} className="overflow-hidden border-border/70 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm">
                          <CardContent className="p-0">
                            <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
                              <div className="p-6">
                                <div className="flex flex-wrap items-start gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-2xl font-semibold tracking-tight">{goal.title}</h3>
                                      {goal.priority && (
                                        <Badge className={PRIORITY_COLORS[goal.priority]}>
                                          {goal.priority}
                                        </Badge>
                                      )}
                                      <Badge className={STATUS_COLORS[goal.status]}>
                                        {goal.status}
                                      </Badge>
                                    </div>
                                    {goal.description ? (
                                      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{goal.description}</p>
                                    ) : (
                                      <p className="mt-3 text-sm text-muted-foreground">No description added yet.</p>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-6 space-y-5">
                                  <div>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Linked Routine Tasks</p>
                                      <span className="text-xs text-muted-foreground">{linkedTaskCount} linked</span>
                                    </div>
                                    {linkedTaskCount > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {goal.linkedTaskIds?.map((taskId) => (
                                          <Badge key={taskId} variant="outline" className="flex items-center gap-1 rounded-full border-border/80 bg-background/40 px-3 py-1 text-xs">
                                            <span>{getRoutineTaskTitle(taskId)}</span>
                                            <button
                                              onClick={() => handleUnlinkTask(goal.id, taskId)}
                                              className="ml-1 rounded-full text-muted-foreground transition-colors hover:text-destructive"
                                              title="Unlink task"
                                            >
                                              <Unlink className="h-3 w-3" />
                                            </button>
                                          </Badge>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="rounded-xl border border-dashed border-border/80 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
                                        No routine tasks linked yet.
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Milestones</p>
                                      <span className="text-xs text-muted-foreground">{completedMilestoneCount}/{milestoneCount} completed</span>
                                    </div>
                                    {milestoneCount > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {milestones.map((milestone) => (
                                          <div key={milestone.id} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${milestone.completed ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}`}>
                                            <button
                                              type="button"
                                              onClick={() => handleToggleMilestoneComplete(goal.id, milestone.id)}
                                              className="inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-ring"
                                              title={milestone.completed ? 'Mark milestone as incomplete' : 'Mark milestone as complete'}
                                            >
                                              {milestone.completed ? (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                              ) : (
                                                <Circle className="h-3.5 w-3.5 text-amber-300" />
                                              )}
                                            </button>
                                            <span className={`leading-none ${milestone.completed ? 'line-through' : ''}`}>
                                              {milestone.title} • {format(parseISO(milestone.date), 'MMM d, yyyy')}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="rounded-xl border border-dashed border-border/80 bg-background/30 px-4 py-3 text-sm text-muted-foreground">
                                        No milestones added yet.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="border-t border-border/70 bg-background/30 p-6 lg:border-l lg:border-t-0">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenLinkTasksDialog(goal.id)}
                                    title="Link routine tasks"
                                  >
                                    <LinkIcon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleToggleStatus(goal.id, goal.status)}
                                    title="Mark goal completed"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenDialog(goal)}
                                    title="Edit goal"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteGoal(goal.id)}
                                    title="Delete goal"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="mt-6 grid gap-3">
                                  <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                                    <div className="grid grid-cols-[minmax(0,1fr)_1px_112px] items-stretch gap-4">
                                      <div className="flex min-w-0 flex-col justify-center">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Due Date</p>
                                        {goal.dueDate ? (
                                          <div className="mt-2">
                                            <p className="text-lg font-semibold leading-none text-foreground">
                                              {format(parseISO(goal.dueDate), 'MMM d')}
                                            </p>
                                            <p className="mt-1 text-sm font-medium text-muted-foreground">
                                              {format(parseISO(goal.dueDate), 'yyyy')}
                                            </p>
                                          </div>
                                        ) : (
                                          <p className="mt-2 text-sm font-medium text-muted-foreground">No due date</p>
                                        )}
                                      </div>
                                      <div className="my-1 w-px bg-border/80" />
                                      <div className={`rounded-xl bg-gradient-to-br px-3 py-3 text-right ${dueToneClass}`}>
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{daysRemainingLabel}</p>
                                        <p className="mt-2 text-3xl font-semibold leading-none">{daysRemainingDisplay}</p>
                                        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                                          {daysRemaining === null ? 'unset' : daysRemaining < 0 ? 'days late' : 'day window'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Progress</p>
                                    <div className="mt-2 flex items-end justify-between gap-3">
                                      <p className="text-2xl font-semibold text-foreground">{completedMilestoneCount}/{Math.max(milestoneCount, 1)}</p>
                                      <p className="text-xs text-muted-foreground">milestones done</p>
                                    </div>
                                  </div>
                                  <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Routine Links</p>
                                    <div className="mt-2 text-sm text-muted-foreground">
                                      <p>{linkedTaskCount} routine task{linkedTaskCount === 1 ? '' : 's'} linked</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {hasHeatmap && (
                                <div className="border-t border-border/70 bg-background/20 px-6 py-5 lg:col-span-2">
                                  <GoalActivityHeatmap goal={goal} routines={routines} schedule={schedule} />
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Completed Goals */}
              {completedGoals.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Completed ({completedGoals.length})</h2>
                  <div className="grid gap-4">
                    {completedGoals.map((goal) => (
                      <Card key={goal.id} className="opacity-75">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 line-through text-muted-foreground">
                              <h3 className="text-lg font-semibold">{goal.title}</h3>
                              {goal.description && (
                                <p className="text-sm">{goal.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleStatus(goal.id, goal.status)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteGoal(goal.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {goals.length === 0 && (
                <Card>
                  <CardContent className="pt-12 text-center">
                    <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground mb-4">No goals yet. Create one to get started!</p>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Goal
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Goal Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGoalId ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Goal Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter goal title"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter goal description"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Milestones</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddMilestone}>
                    <Plus className="mr-2 h-3 w-3" />
                    Add milestone
                  </Button>
                </div>
                {formData.milestones.length > 0 ? (
                  <div className="space-y-3 rounded-md border p-3">
                    {formData.milestones.map((milestone, index) => (
                      <div key={milestone.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-md border p-3">
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`milestone-title-${index}`}>Title</Label>
                            <Input
                              id={`milestone-title-${index}`}
                              value={milestone.title}
                              onChange={(e) => handleMilestoneChange(milestone.id, 'title', e.target.value)}
                              placeholder="Milestone title"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`milestone-date-${index}`}>Date</Label>
                            <Input
                              id={`milestone-date-${index}`}
                              type="date"
                              value={milestone.date}
                              onChange={(e) => handleMilestoneChange(milestone.id, 'date', e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="self-start"
                          onClick={() => handleRemoveMilestone(milestone.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Add dated milestones and they will appear in the heatmap with a different color.</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveGoal}>
                {editingGoalId ? 'Update' : 'Create'} Goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Link Routine Tasks Dialog */}
        <Dialog open={isLinkTasksDialogOpen} onOpenChange={setIsLinkTasksDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Link Routine Tasks to Goal</DialogTitle>
              <DialogDescription>
                Select routine tasks to link to this goal
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-80 border rounded-md p-4">
              {routines.length > 0 ? (
                <div className="space-y-3">
                  {routines.map((routine) => (
                    <div key={routine.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={routine.id}
                        checked={selectedRoutineTaskIds.has(routine.id)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedRoutineTaskIds);
                          if (checked) {
                            newSet.add(routine.id);
                          } else {
                            newSet.delete(routine.id);
                          }
                          setSelectedRoutineTaskIds(newSet);
                        }}
                      />
                      <Label
                        htmlFor={routine.id}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        <div className="font-medium">{routine.details}</div>
                        <div className="text-xs text-muted-foreground">
                          {routine.slot} • {routine.type}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No routine tasks available. Create routines first.
                </p>
              )}
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLinkTasksDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveLinkedTasks}>
                Link Tasks
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}

