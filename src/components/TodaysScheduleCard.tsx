
"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, MoreVertical, Brain, Wind, Moon, Sunrise, Sun, CloudSun, Sunset, MoonStar, PlusCircle, Timer, Compass, Grab, Dock, Move, PieChart, Flame, Shield, Paintbrush, BrainCircuit, ListChecks, CheckCircle2, Circle, Trash2, Play, History, Repeat, Link as LinkIcon, ArrowRight, Save, Github, UploadCloud, DownloadCloud, Workflow, Target, Calendar, X, Wallet, Users, Wrench, Blocks, HandHeart, Sparkles, HeartPulse, Palette } from 'lucide-react';
import type { Activity, ActivityType, RecurrenceRule, MetaRule, Pattern, DailySchedule, FullSchedule, Resource, Stopper, MindsetPoint, CoreDomainId } from '@/types/workout';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSeparator, DropdownMenuSubContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { EditableActivityText } from './EditableActivityText';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, useDragControls } from 'framer-motion';
import { format, isToday, getISODay, getDay, parseISO, differenceInDays, differenceInMonths, startOfDay, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';
import { TimeAllocationChart } from './ProductivitySnapshot';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useDraggable } from '@dnd-kit/core';


const activityIcons: Record<ActivityType, React.ReactNode> = {
    workout: <Dumbbell className="h-4 w-4" />,
    upskill: <BookOpenCheck className="h-4 w-4" />,
    deepwork: <Briefcase className="h-4 w-4" />,
    planning: <ClipboardList className="h-4 w-4" />,
    tracking: <ClipboardCheck className="h-4 w-4" />,
    branding: <Share2 className="h-4 w-4" />,
    'lead-generation': <Magnet className="h-4 w-4" />,
    essentials: <CheckSquare className="h-4 w-4" />,
    nutrition: <Utensils className="h-4 w-4" />,
    interrupt: <AlertCircle className="h-4 w-4 text-red-500" />,
    distraction: <Wind className="h-4 w-4 text-yellow-500" />,
    mindset: <Brain className="h-4 w-4" />,
    pomodoro: <Timer className="h-4 w-4" />,
};

const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

const AddActivityMenu = ({ onAddActivity }: { onAddActivity: (type: ActivityType, details: string) => void }) => {
    const { coreSkills } = useAuth();
    const specializations = coreSkills.filter(s => s.type === 'Specialization');

    return (
        <DropdownMenuContent className="w-56 p-2">
            <p className="font-medium text-sm p-2">Select Activity</p>
            <DropdownMenuItem key="pomodoro" onClick={() => onAddActivity('pomodoro', '')}>
                <Timer className="h-4 w-4" />
                <span className="ml-2 capitalize">Pomodoro</span>
            </DropdownMenuItem>
            {Object.entries(activityIcons).map(([type, icon]) => {
                if(type === 'pomodoro') return null;
                const activityType = type as ActivityType;
                if (activityType === 'upskill' || activityType === 'deepwork') {
                    return (
                        <DropdownMenuSub key={type}>
                            <DropdownMenuSubTrigger className="w-full justify-start">
                                {icon}
                                <span className="ml-2 capitalize">{type.replace('-', ' ')}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <ScrollArea className="h-48">
                                        {specializations.length > 0 ? (
                                            specializations.map(spec => (
                                                <DropdownMenuItem key={spec.id} onClick={() => onAddActivity(activityType, spec.name)}>
                                                    {spec.name}
                                                </DropdownMenuItem>
                                            ))
                                        ) : (
                                            <DropdownMenuItem disabled>No specializations defined</DropdownMenuItem>
                                        )}
                                    </ScrollArea>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                    );
                }
                return (
                    <DropdownMenuItem key={type} onClick={() => onAddActivity(activityType, '')}>
                        {icon}
                        <span className="ml-2 capitalize">{type.replace('-', ' ')}</span>
                    </DropdownMenuItem>
                );
            })}
        </DropdownMenuContent>
    );
};

interface AgendaWidgetItemProps {
    activity: Activity & { slot: string };
    date: Date;
    onToggleComplete: (slotName: string, activityId: string) => void;
    onRemoveActivity: (slotName: string, activityId: string) => void;
    onUpdateActivity: (activityId: string, newDetails: string) => void;
    setRoutine: (activity: Activity, rule: RecurrenceRule | null) => void;
    onActivityClick?: (activity: Activity, event: React.MouseEvent) => void;
    onStartFocus?: (activity: Activity, event: React.MouseEvent) => void;
    onOpenHabitPopup: (habitId: string, event: React.MouseEvent) => void;
    context: 'agenda' | 'timeslot';
    loggedDuration?: string;
    hasLoggedStopper?: boolean;
}

export const AgendaWidgetItem = React.memo(({ 
    activity,
    date, 
    onToggleComplete, 
    onRemoveActivity, 
    onUpdateActivity, 
    setRoutine, 
    onActivityClick, 
    onStartFocus,
    onOpenHabitPopup, 
    context,
    loggedDuration,
    hasLoggedStopper,
}: AgendaWidgetItemProps) => {
    const { 
        setSelectedDeepWorkTask, 
        setSelectedUpskillTask,
        findRootTask,
        currentSlot,
        highlightedTaskIds,
    } = useAuth();
    const router = useRouter();

    const isInlineEditable = !['upskill', 'deepwork', 'workout', 'branding', 'lead-generation', 'mindset', 'nutrition'].includes(activity.type);
    const isAgendaContext = context === 'agenda';

    const handleItemClick = (e: React.MouseEvent) => {
        if (onActivityClick) {
            onActivityClick(activity, e);
        }
    };
    
    const isPlanningTask = (activity.type === 'upskill' || activity.type === 'deepwork') && activity.linkedEntityType === 'specialization';
    const baseMatch = activity.id.match(/_(\d{4}-\d{2}-\d{2})$/);
    const baseId = baseMatch ? activity.id.slice(0, -11) : activity.id;
    const isHighlighted =
      highlightedTaskIds?.has(activity.id) ||
      highlightedTaskIds?.has(baseId) ||
      (activity.taskIds || []).some((id) => highlightedTaskIds?.has(id));
    const linkedActivityName = activity.type === 'pomodoro' && activity.linkedActivityType
        ? activity.linkedActivityType.charAt(0).toUpperCase() + activity.linkedActivityType.slice(1).replace('-', ' ')
        : null;
    const shouldStrike = activity.completed || !!hasLoggedStopper;

    const handleBadgeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    
        if (activity.completed && activity.type === 'pomodoro' && activity.taskIds && activity.taskIds.length > 0) {
            const rootTask = findRootTask(activity);
            if (rootTask) {
                if (activity.linkedActivityType === 'deepwork') {
                    setSelectedDeepWorkTask(rootTask);
                    router.push('/deep-work');
                } else if (activity.linkedActivityType === 'upskill') {
                    setSelectedUpskillTask(rootTask);
                    router.push('/deep-work');
                }
            }
        }
    };

    const isPastSlot =
        isToday(date) &&
        currentSlot &&
        slotOrder.indexOf(activity.slot as any) !== -1 &&
        slotOrder.indexOf(currentSlot as any) !== -1 &&
        slotOrder.indexOf(activity.slot as any) < slotOrder.indexOf(currentSlot as any) &&
        !activity.completed;

    const handleAddUrgePrompt = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (typeof window === 'undefined') return;
        const baseMatch = activity.id.match(/_(\d{4}-\d{2}-\d{2})$/);
        const baseId = baseMatch ? activity.id.slice(0, -11) : undefined;
        window.dispatchEvent(new CustomEvent('open-resistance-list-for-task', {
            detail: {
                taskId: activity.id,
                taskIds: activity.taskIds || [],
                baseId,
            },
        }));
    };

    return (
        <li 
            className={cn(
                "flex items-start gap-2 p-2 rounded-lg group transition-all",
                context === 'timeslot' && 'bg-background',
                isHighlighted && "bg-emerald-500/10 ring-1 ring-emerald-400/50",
                onActivityClick && 'cursor-pointer'
            )}
            onClick={handleItemClick}
        >
            <div className="mt-0.5 flex flex-col items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); onToggleComplete(activity.slot, activity.id); }}>
                    {activity.completed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                </button>
                {isPastSlot && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={handleAddUrgePrompt}
                        title="Add urge or resistance"
                    >
                        <PlusCircle className="h-3.5 w-3.5 text-amber-400" />
                    </Button>
                )}
            </div>
            <div className="flex-grow min-w-0">
                <EditableActivityText
                    initialValue={activity.details}
                    onUpdate={(newDetails) => onUpdateActivity(activity.id, newDetails)}
                    className={cn("text-sm font-medium w-full block", shouldStrike && "line-through text-muted-foreground")}
                />
                 <div className="flex flex-wrap items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                        {activityIcons[activity.type]} {activity.type.replace('-', ' ')}
                    </div>
                    {linkedActivityName && (
                        <Badge 
                            variant={activity.completed ? 'outline' : 'secondary'}
                            onClick={handleBadgeClick}
                            className={cn(activity.completed && "cursor-pointer hover:bg-accent")}
                        >
                            {linkedActivityName}
                        </Badge>
                    )}
                    {isPlanningTask && <Badge variant="outline">Planning</Badge>}
                    {activity.completed && loggedDuration && (
                        <Badge variant="secondary">{loggedDuration}</Badge>
                    )}
                </div>
            </div>
        </li>
    );
});
AgendaWidgetItem.displayName = 'AgendaWidgetItem';


interface TodaysScheduleCardProps {
  date: Date;
  schedule: FullSchedule;
  activityDurations: Record<string, string>;
  isAgendaDocked: boolean;
  onToggleDock: () => void;
  onActivityClick?: (activity: Activity, event: React.MouseEvent) => void;
  onStartFocus?: (activity: Activity, event: React.MouseEvent) => void;
  onOpenHabitPopup: (habitId: string, event: React.MouseEvent) => void;
  currentSlot: string;
}

export function TodaysScheduleCard({
  date,
  schedule,
  activityDurations,
  isAgendaDocked,
  onToggleDock,
  onActivityClick,
  onStartFocus,
  onOpenHabitPopup,
  currentSlot,
}: TodaysScheduleCardProps) {
  const { toast } = useToast();
  const { 
    currentUser,
    settings,
    setSettings,
    handleToggleComplete, 
    toggleRoutine, 
    setSchedule: setGlobalSchedule,
    resources,
    setResources,
    mindsetCards,
    metaRules,
    patterns,
    syncWithGitHub,
    downloadFromGitHub,
    gitHubSyncNotification,
    dismissGitHubSyncNotification,
    openMindsetWidget,
    openDrawingCanvasFromHeader,
    dateOfBirth,
    highlightedTaskIds,
    setHighlightedTaskIds,
  } = useAuth();
  
  const toggleCurrentSlotOnly = () => {
    setSettings(prev => ({ ...prev, agendaShowCurrentSlotOnly: !prev.agendaShowCurrentSlotOnly }));
  };
  const router = useRouter();

  const [purposeText, setPurposeText] = useState(settings.currentPurpose || '');
  const [purposePopoverOpen, setPurposePopoverOpen] = useState(false);
  const [view, setView] = useState<'list' | 'chart' | 'botherings' | 'core' | 'urges' | 'resistances' | 'rules' | 'milestones'>('list');
  const [activeBotheringTab, setActiveBotheringTab] = useState<'External' | 'Mismatch' | 'Constraint' | 'Parked' | 'Current'>('External');
  const [newEntryText, setNewEntryText] = useState('');
  
  const dragControls = useDragControls()
  const listRef = useRef<HTMLUListElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setPurposeText(settings.currentPurpose || '');
  }, [settings.currentPurpose]);

  const handleSavePurpose = () => {
    setSettings(prev => ({...prev, currentPurpose: purposeText}));
    setPurposePopoverOpen(false);
  };

  const dayKey = React.useMemo(() => format(date, 'yyyy-MM-dd'), [date]);

  const todaysSchedule = useMemo(() => schedule[dayKey] || {}, [schedule, dayKey]);
  const todayActivityIds = useMemo(() => {
    const ids = new Set<string>();
    const daySchedule = schedule?.[dayKey] || {};
    Object.values(daySchedule).flat().forEach((act: any) => {
      if (act?.id) ids.add(act.id);
      (act?.taskIds || []).forEach((tid: string) => ids.add(tid));
    });
    return ids;
  }, [schedule, dayKey]);
  const currentSlotActivityIds = useMemo(() => {
    const ids = new Set<string>();
    const daySchedule = schedule?.[dayKey] || {};
    const slotItems = (daySchedule?.[currentSlot as keyof DailySchedule] || []) as Activity[];
    (slotItems || []).forEach((act: any) => {
      if (act?.id) ids.add(act.id);
      (act?.taskIds || []).forEach((tid: string) => ids.add(tid));
      const baseMatch = act?.id?.match?.(/_(\d{4}-\d{2}-\d{2})$/);
      if (baseMatch) ids.add(act.id.slice(0, -11));
    });
    return ids;
  }, [schedule, dayKey, currentSlot]);

  const mismatchPointById = useMemo(() => {
    const mismatchPoints = mindsetCards.find((c) => c.id === "mindset_botherings_mismatch")?.points || [];
    return new Map(mismatchPoints.map((point) => [point.id, point] as const));
  }, [mindsetCards]);

  const getEffectiveBotheringTasks = useCallback((point: MindsetPoint, sourceType: BotheringSourceType): BotheringTask[] => {
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

  const isBotheringTaskDueOnDate = useCallback((task: BotheringTask, dateKey: string) => {
    const startKey = task.startDate || task.dateKey;
    if (!startKey) return false;
    const start = parseISO(startKey);
    const d = parseISO(dateKey);
    if (Number.isNaN(start.getTime()) || Number.isNaN(d.getTime())) return false;
    if (startOfDay(start) > startOfDay(d)) return false;
    if (task.recurrence === 'daily') return true;
    if (task.recurrence === 'weekly') return getDay(start) === getDay(d);
    if (task.recurrence === 'custom') {
      const interval = Math.max(1, task.repeatInterval || 1);
      if (task.repeatUnit === 'month') {
        if (start.getDate() !== d.getDate()) return false;
        const months = differenceInMonths(d, start);
        return months >= 0 && months % interval === 0;
      }
      if (task.repeatUnit === 'week') {
        const days = differenceInDays(d, start);
        return days >= 0 && days % (interval * 7) === 0;
      }
      const days = differenceInDays(d, start);
      return days >= 0 && days % interval === 0;
    }
    return startKey === dateKey;
  }, []);

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

  const isBotheringTaskScheduledOnDate = useCallback((task: BotheringTask, dateKey: string) => {
    const activityId = task.activityId || task.id;
    if (activityId && scheduledDatesByTaskId.get(activityId)?.has(dateKey)) return true;
    if (task.id && task.id !== activityId && scheduledDatesByTaskId.get(task.id)?.has(dateKey)) return true;
    return false;
  }, [scheduledDatesByTaskId]);

  const isBotheringTaskCompletedOnDate = useCallback((task: BotheringTask, dateKey: string) => {
    const activityMap = activityMapByDate.get(dateKey);
    const activity: any = activityMap?.get(task.activityId || task.id) || activityMap?.get(task.id);
    if (activity) {
      if (activity.completed) return true;
      if (activity.duration && activity.duration > 0) return true;
      if (activity.focusSessionInitialStartTime && activity.focusSessionEndTime) return true;
      if (activity.focusSessionInitialDuration && activity.focusSessionInitialDuration > 0) return true;
    }
    if (task.recurrence && task.recurrence !== 'none') {
      return !!task.completionHistory?.[dateKey];
    }
    if (task.dateKey && task.dateKey !== dateKey) return false;
    return !!task.completed && (!task.dateKey || task.dateKey === dateKey);
  }, [activityMapByDate]);

  const activeBotheringsByType = useMemo(() => {
    const sources = [
      { id: "mindset_botherings_external", label: "External" as const },
      { id: "mindset_botherings_mismatch", label: "Mismatch" as const },
      { id: "mindset_botherings_constraint", label: "Constraint" as const },
    ];
    const typed = sources.map(({ id, label }) => ({
      type: label,
      points: (mindsetCards.find((c) => c.id === id)?.points || [])
        .filter((point) => getEffectiveBotheringTasks(point, label).length > 0 && !point.completed),
    }));
    const parkedPoints = sources.flatMap(({ id, label }) =>
      (mindsetCards.find((c) => c.id === id)?.points || [])
        .filter((point) => getEffectiveBotheringTasks(point, label).length === 0 && !point.completed)
        .map((point) => ({ point, sourceType: label }))
    );
    return [
      ...typed.map(t => ({
        type: t.type,
        points: t.points.map(point => ({ point, sourceType: t.type })),
      })),
      { type: "Parked" as const, points: parkedPoints },
    ];
  }, [mindsetCards, getEffectiveBotheringTasks]);

  const getTodayBotheringStats = useCallback((point: MindsetPoint, sourceType: BotheringSourceType) => {
    const tasks = getEffectiveBotheringTasks(point, sourceType);
    let total = 0;
    let completed = 0;
    tasks.forEach((t) => {
      if (!isBotheringTaskDueOnDate(t, dayKey)) return;
      const completedToday = isBotheringTaskCompletedOnDate(t, dayKey);
      const scheduledToday = !!(
        (t.activityId && todayActivityIds.has(t.activityId)) ||
        (t.id && todayActivityIds.has(t.id))
      );
      if (!scheduledToday && !completedToday) return;
      total += 1;
      if (completedToday) completed += 1;
    });
    return { total, completed };
  }, [dayKey, getEffectiveBotheringTasks, isBotheringTaskCompletedOnDate, isBotheringTaskDueOnDate, todayActivityIds]);
  const getCurrentSlotBotheringStats = useCallback((point: MindsetPoint, sourceType: BotheringSourceType) => {
    const tasks = getEffectiveBotheringTasks(point, sourceType);
    let total = 0;
    let completed = 0;
    tasks.forEach((t) => {
      if (!isBotheringTaskDueOnDate(t, dayKey)) return;
      const inCurrentSlot = !!(
        (t.activityId && currentSlotActivityIds.has(t.activityId)) ||
        (t.id && currentSlotActivityIds.has(t.id))
      );
      if (!inCurrentSlot) return;
      total += 1;
      if (isBotheringTaskCompletedOnDate(t, dayKey)) completed += 1;
    });
    return { total, completed };
  }, [currentSlotActivityIds, dayKey, getEffectiveBotheringTasks, isBotheringTaskCompletedOnDate, isBotheringTaskDueOnDate]);

  const visibleBotheringsByType = useMemo(() => {
    const byType = activeBotheringsByType.map((group) => {
      if (group.type === "Parked") return group;
      return {
        ...group,
        points: group.points.filter(({ point, sourceType }) => getTodayBotheringStats(point, sourceType).total > 0),
      };
    });
    const currentPoints = byType
      .filter((group) => group.type !== "Parked")
      .flatMap((group) => group.points)
      .filter(({ point, sourceType }) => getCurrentSlotBotheringStats(point, sourceType).total > 0);
    return [...byType, { type: "Current" as const, points: currentPoints }];
  }, [activeBotheringsByType, getCurrentSlotBotheringStats, getTodayBotheringStats]);

  const activeBotherings = useMemo(
    () => visibleBotheringsByType.find((t) => t.type === activeBotheringTab)?.points || [],
    [activeBotheringTab, visibleBotheringsByType]
  );

  const botheringTabCounts = useMemo(
    () => visibleBotheringsByType.reduce<Record<string, number>>((acc, item) => {
      acc[item.type] = item.points.length;
      return acc;
    }, {}),
    [visibleBotheringsByType]
  );

  const getBotheringHighlightIds = useCallback((point: MindsetPoint, sourceType: BotheringSourceType) => {
    const ids = new Set<string>();
    getEffectiveBotheringTasks(point, sourceType).forEach((t) => {
      if (t.id) ids.add(t.id);
      if (t.activityId) ids.add(t.activityId);
    });
    return ids;
  }, [getEffectiveBotheringTasks]);

  const selectBotheringInTodo = useCallback((point: MindsetPoint, sourceType: BotheringSourceType) => {
    const ids = getBotheringHighlightIds(point, sourceType);
    const same =
      ids.size === highlightedTaskIds.size &&
      Array.from(ids).every((id) => highlightedTaskIds.has(id));
    setHighlightedTaskIds(same ? new Set() : ids);
    setView('list');
  }, [getBotheringHighlightIds, highlightedTaskIds, setHighlightedTaskIds]);

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

  const scoreCoreFromText = useCallback((text: string, coreId: CoreDomainId) => {
    const haystack = (text || "").toLowerCase();
    if (!haystack.trim()) return 0;
    return CORE_KEYWORDS[coreId].reduce((sum, keyword) => sum + (haystack.includes(keyword) ? 1 : 0), 0);
  }, []);

  const detectAutoCore = useCallback((point: MindsetPoint, type: BotheringSourceType): CoreDomainId => {
    const text = [
      point.text,
      point.resolution,
      point.mismatchType,
      ...(point.tasks || []).map((task) => task.details),
    ].filter(Boolean).join(" ");
    const candidates = CORE_GROUP_BY_TYPE[type];
    let best = candidates[0];
    let bestScore = -1;
    candidates.forEach((coreId) => {
      const score = scoreCoreFromText(text, coreId);
      if (score > bestScore) {
        best = coreId;
        bestScore = score;
      }
    });
    return bestScore > 0 ? best : TYPE_FALLBACK_CORE[type];
  }, [scoreCoreFromText]);

  const allBotheringsForCore = useMemo(() => {
    const sources = [
      { id: "mindset_botherings_external", type: "External" as const },
      { id: "mindset_botherings_mismatch", type: "Mismatch" as const },
      { id: "mindset_botherings_constraint", type: "Constraint" as const },
    ];
    const manualOverrides = settings.coreStateManualOverrides || {};
    return sources.flatMap(({ id, type }) => {
      const points = (mindsetCards.find((c) => c.id === id)?.points || []).filter((point) => !point.completed);
      return points.map((point) => {
        const tasks = getEffectiveBotheringTasks(point, type);
        const allowed = CORE_GROUP_BY_TYPE[type];
        const manualCandidate = manualOverrides[point.id];
        const manual = manualCandidate && allowed.includes(manualCandidate) ? manualCandidate : undefined;
        const saved = point.coreDomainId && allowed.includes(point.coreDomainId) ? point.coreDomainId : undefined;
        return {
          id: point.id,
          type,
          point,
          tasks,
          coreId: saved || manual || detectAutoCore(point, type),
        };
      });
    });
  }, [detectAutoCore, getEffectiveBotheringTasks, mindsetCards, settings.coreStateManualOverrides]);

  const coreStateCards = useMemo(() => {
    const todayStart = startOfDay(date);
    const day21 = addDays(todayStart, -20);
    const day7 = addDays(todayStart, -6);
    const day45 = addDays(todayStart, -44);

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
    }): CoreStateId => {
      const completion21 = metrics.due21 > 0 ? metrics.completed21 / metrics.due21 : 0;
      const completion7 = metrics.due7 > 0 ? metrics.completed7 / metrics.due7 : completion21;
      const trend = completion7 - completion21;
      const painSignal = metrics.highRiskCount > 0 || metrics.backlog >= 4 || (metrics.due7 > 0 && completion7 < 0.25);
      const copingSignal = metrics.stopperEvents7 >= 2 && metrics.stopperRate >= 0.9 && completion7 < 0.45;
      const engagementSignal = (metrics.due7 > 0 && completion7 >= 0.35) || metrics.completed7 >= 2;
      const stabilitySignal = metrics.due21 >= 4 && completion21 >= 0.65 && metrics.backlog <= 2 && trend >= -0.08;
      const integrationSignal = metrics.due21 >= 6 && completion21 >= 0.78 && completion7 >= 0.72 && metrics.backlog <= 1 && metrics.highRiskCount === 0 && metrics.stopperRate < 0.35;
      const expansionSignal = integrationSignal && (metrics.expansionCompletions21 >= 2 || (metrics.completed21 >= 10 && completion21 >= 0.88));
      if (metrics.botheringCount === 0 && metrics.due21 === 0 && metrics.stopperEvents7 === 0) return "S0";
      if (expansionSignal) return "S6";
      if (integrationSignal) return "S5";
      if (stabilitySignal) return "S4";
      if (copingSignal) return "S2";
      if (engagementSignal && !painSignal) return "S3";
      return "S1";
    };

    return CORE_DEFS.map((core) => {
      const botherings = allBotheringsForCore.filter((b) => b.coreId === core.id);
      const taskMap = new Map<string, BotheringTask>();
      botherings.forEach((entry) => {
        entry.tasks.forEach((task) => {
          const key = task.activityId || task.id || `${task.details}:${task.startDate || task.dateKey || ""}`;
          if (!taskMap.has(key)) taskMap.set(key, task);
        });
      });
      const tasks = Array.from(taskMap.values());

      let due21 = 0;
      let completed21 = 0;
      let due7 = 0;
      let completed7 = 0;
      let backlog = 0;
      let expansionCompletions21 = 0;
      for (let d = new Date(day45); d <= todayStart; d = addDays(d, 1)) {
        const dateKey = format(d, "yyyy-MM-dd");
        const in21 = d >= day21;
        const in7 = d >= day7;
        tasks.forEach((task) => {
          if (!isBotheringTaskDueOnDate(task, dateKey)) return;
          if (!isBotheringTaskScheduledOnDate(task, dateKey)) return;
          const completed = isBotheringTaskCompletedOnDate(task, dateKey);
          if (d < todayStart && !completed) backlog += 1;
          if (in21) {
            due21 += 1;
            if (completed) {
              completed21 += 1;
              const details = (task.details || "").toLowerCase();
              if (EXPANSION_KEYWORDS.some((keyword) => details.includes(keyword))) {
                expansionCompletions21 += 1;
              }
            }
          }
          if (in7) {
            due7 += 1;
            if (completed) completed7 += 1;
          }
        });
      }

      let highRiskCount = 0;
      botherings.forEach((entry) => {
        const endDate = entry.point.endDate ? parseISO(entry.point.endDate) : null;
        if (!endDate || Number.isNaN(endDate.getTime())) return;
        const daysLeft = differenceInDays(startOfDay(endDate), todayStart);
        if (daysLeft > 14) return;
        let pendingBeforeToday = 0;
        for (let d = new Date(addDays(todayStart, -21)); d < todayStart; d = addDays(d, 1)) {
          const dateKey = format(d, "yyyy-MM-dd");
          entry.tasks.forEach((task) => {
            if (!isBotheringTaskDueOnDate(task, dateKey)) return;
            if (!isBotheringTaskScheduledOnDate(task, dateKey)) return;
            if (!isBotheringTaskCompletedOnDate(task, dateKey)) pendingBeforeToday += 1;
          });
        }
        if (pendingBeforeToday > 0) highRiskCount += 1;
      });

      const stopperIds = new Set<string>();
      botherings.forEach((entry) => {
        (entry.point.linkedUrgeIds || []).forEach((id) => stopperIds.add(id));
        (entry.point.linkedResistanceIds || []).forEach((id) => stopperIds.add(id));
      });
      const weekStartMs = day7.getTime();
      const tomorrowMs = addDays(todayStart, 1).getTime();
      let stopperEvents7 = 0;
      (resources || []).forEach((resource) => {
        [...(resource.urges || []), ...(resource.resistances || [])].forEach((s) => {
          if (!stopperIds.has(s.id)) return;
          stopperEvents7 += (s.timestamps || []).filter((ts) => ts >= weekStartMs && ts < tomorrowMs).length;
        });
      });

      const completion21 = due21 > 0 ? completed21 / due21 : 0;
      const completion7 = due7 > 0 ? completed7 / due7 : completion21;
      const stopperRate = stopperEvents7 / Math.max(1, due7);
      const state = buildState({
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
        percent: Math.round(completion21 * 100),
        backlog,
        botherings: botherings.length,
      };
    });
  }, [allBotheringsForCore, date, isBotheringTaskCompletedOnDate, isBotheringTaskDueOnDate, isBotheringTaskScheduledOnDate, resources]);

  const loggedTaskIds = useMemo(() => {
    const start = startOfDay(date);
    const end = addDays(start, 1);
    const startMs = start.getTime();
    const endMs = end.getTime();
    const stopperById = new Map<string, { timestamps?: number[] }>();
    (resources || []).forEach(resource => {
      (resource.urges || []).forEach(stopper => stopperById.set(stopper.id, stopper));
      (resource.resistances || []).forEach(stopper => stopperById.set(stopper.id, stopper));
    });
    const loggedStopperIds = new Set<string>();
    stopperById.forEach((stopper, id) => {
      if ((stopper.timestamps || []).some(ts => ts >= startMs && ts < endMs)) {
        loggedStopperIds.add(id);
      }
    });
    if (loggedStopperIds.size === 0) return new Set<string>();
    const taskIds = new Set<string>();
    (mindsetCards || []).forEach(card => {
      if (!card.id.startsWith('mindset_botherings_')) return;
      card.points.forEach(point => {
        const linkedIds = [...(point.linkedUrgeIds || []), ...(point.linkedResistanceIds || [])];
        if (!linkedIds.some(id => loggedStopperIds.has(id))) return;
        (point.tasks || []).forEach(task => {
          if (task.id) taskIds.add(task.id);
          if (task.activityId) taskIds.add(task.activityId);
        });
      });
    });
    return taskIds;
  }, [date, resources, mindsetCards]);

  const isTaskLogged = useCallback((activity: Activity) => {
    const baseMatch = activity.id.match(/_(\d{4}-\d{2}-\d{2})$/);
    const baseId = baseMatch ? activity.id.slice(0, -11) : activity.id;
    if (loggedTaskIds.has(activity.id) || loggedTaskIds.has(baseId)) return true;
    return (activity.taskIds || []).some(id => loggedTaskIds.has(id));
  }, [loggedTaskIds]);

  const scheduledActivities = useMemo(() => {
    const todaysSchedule = schedule[dayKey] || {};
    const explicitActivityIdsForDay = new Set<string>();
    Object.values(todaysSchedule).forEach((value) => {
      if (!Array.isArray(value)) return;
      value.forEach((activity) => {
        if (activity?.id) explicitActivityIdsForDay.add(activity.id);
      });
    });
    let allActivities = slotOrder.flatMap(slot => {
        const activities = todaysSchedule[slot];
        const explicit = (activities && Array.isArray(activities)) ? activities : [];

        const routineInstances = (settings.routines || []).flatMap(r => {
            if (!r || !r.routine) return [] as Activity[];
            if (r.slot !== slot) return [] as Activity[];
            const rule = r.routine;
            const base = r.baseDate || r.createdAt;
            try {
                if (rule.type === 'daily') {
                    return [{ ...r, id: `${r.id}_${dayKey}` } as Activity];
                }
                if (rule.type === 'weekly') {
                    if (!base) return [] as Activity[];
                    const baseDow = getISODay(parseISO(base));
                    const thisDow = getISODay(date);
                    if (baseDow === thisDow) return [{ ...r, id: `${r.id}_${dayKey}` } as Activity];
                    return [] as Activity[];
                }
                if (rule.type === 'custom') {
                    if (!base) return [] as Activity[];
                    const interval = Math.max(1, rule.repeatInterval ?? rule.days ?? 1);
                    const unit = rule.repeatUnit ?? 'day';
                    const baseDate = parseISO(base);
                    if (unit === 'month') {
                        if (baseDate.getDate() !== date.getDate()) return [] as Activity[];
                        const diffMonths = differenceInMonths(date, baseDate);
                        if (diffMonths >= 0 && diffMonths % interval === 0) {
                            return [{ ...r, id: `${r.id}_${dayKey}` } as Activity];
                        }
                        return [] as Activity[];
                    }
                    if (unit === 'week') {
                        const diffDays = differenceInDays(date, baseDate);
                        if (diffDays >= 0 && diffDays % (interval * 7) === 0) {
                            return [{ ...r, id: `${r.id}_${dayKey}` } as Activity];
                        }
                        return [] as Activity[];
                    }
                    const diffDays = differenceInDays(date, baseDate);
                    if (diffDays >= 0 && diffDays % interval === 0) {
                        return [{ ...r, id: `${r.id}_${dayKey}` } as Activity];
                    }
                    return [] as Activity[];
                }
            } catch (e) {
                return [] as Activity[];
            }
            return [] as Activity[];
        });

        const merged = [
            ...explicit,
            // De-dupe across the whole day so moved routine instances do not reappear in their original slot.
            ...routineInstances.filter((ri) => !explicitActivityIdsForDay.has(ri.id)),
        ];
        return merged.map(activity => ({ slot, ...activity }));
    });

    if (settings.agendaShowCurrentSlotOnly) {
        allActivities = allActivities.filter(activity => activity.slot === currentSlot);
    }

    return allActivities.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return slotOrder.indexOf(a.slot as SlotName) - slotOrder.indexOf(b.slot as SlotName);
    });
  }, [schedule, dayKey, settings.agendaShowCurrentSlotOnly, currentSlot, settings.routines, date]);

  useEffect(() => {
    if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [scheduledActivities]);

  const parseDurationToMinutes = (durationStr: string | undefined): number => {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    let totalMinutes = 0;
    const hourMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*h/);
    const minMatch = durationStr.match(/(\d+)\s*m/);

    if (hourMatch) {
        totalMinutes += parseFloat(hourMatch[1]) * 60;
    }
    if (minMatch) {
        totalMinutes += parseInt(minMatch[1], 10);
    }
    if (!hourMatch && !minMatch && /^\d+$/.test(durationStr.trim())) {
        return parseInt(durationStr.trim(), 10);
    }
    return totalMinutes;
  };

  const timeAllocationData = useMemo(() => {
    const dailyActivities = todaysSchedule ? Object.values(todaysSchedule).flat() as Activity[] : [];
    const totals: Record<string, { time: number; activities: { name: string; duration: number }[] }> = {};
    const activityNameMap: Record<ActivityType, string> = { 
      deepwork: 'Deep Work', 
      upskill: 'Learning', 
      workout: 'Workout', 
      branding: 'Branding', 
      essentials: 'Essentials', 
      planning: 'Planning', 
      tracking: 'Tracking', 
      'lead-generation': 'Lead Gen', 
      interrupt: 'Interrupts',
      distraction: 'Distractions', 
      nutrition: 'Nutrition',
      mindset: 'Mindset',
      pomodoro: 'Pomodoro',
    };
  
    dailyActivities.forEach((activity) => {
      if (activity && activity.completed) {
        const activityType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
        const mappedName = activityNameMap[activityType];
        if (mappedName) {
          const duration = parseDurationToMinutes(activityDurations[activity.id]);
          if (duration > 0) {
            if (!totals[mappedName]) {
              totals[mappedName] = { time: 0, activities: [] };
            }
            totals[mappedName].time += duration;
            totals[mappedName].activities.push({ name: activity.details, duration });
          }
        }
      }
    });
  
    return Object.entries(totals).map(([name, data]) => ({ name, time: data.time, activities: data.activities }));
  }, [todaysSchedule, activityDurations]);


  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { setNodeRef, transform } = useDraggable({
    id: 'agenda-widget',
    disabled: isAgendaDocked,
  });


  const positionKey = currentUser ? `lifeos_agenda_widget_position_${currentUser.username}` : null;

  useEffect(() => {
    if (!isAgendaDocked && positionKey) {
        const savedPosition = localStorage.getItem(positionKey);
        if (savedPosition) {
            try {
                const parsed = JSON.parse(savedPosition);
                setPosition(parsed);
            } catch (e) {
                 console.error("Failed to parse widget position from localStorage", e);
                 const initialY = window.innerHeight - Math.min(window.innerHeight - 80, 450);
                 const initialX = window.innerWidth - Math.min(window.innerWidth - 20, 340);
                 setPosition({ x: initialX, y: initialY });
            }
        } else {
            const initialY = window.innerHeight - Math.min(window.innerHeight - 80, 450);
            const initialX = window.innerWidth - Math.min(window.innerWidth - 20, 340);
            setPosition({ x: initialX, y: initialY });
        }
    }
  }, [isAgendaDocked, positionKey]);

  const onRemoveActivity = (slotName: string, activityId: string) => {
    setGlobalSchedule(prev => {
        const newSchedule = { ...prev };
        if (newSchedule[dayKey]) {
            const daySchedule = { ...newSchedule[dayKey] };
            if (daySchedule[slotName]) {
                daySchedule[slotName] = (daySchedule[slotName] as any[]).filter(act => act.id !== activityId);
                newSchedule[dayKey] = daySchedule;
            }
        }
        return newSchedule;
    });
  };

  const handleUpdateActivity = (activityId: string, newDetails: string) => {
    setGlobalSchedule(prev => {
        const newSchedule = {...prev};
        if (newSchedule[dayKey]) {
            const daySchedule = {...newSchedule[dayKey]};
            for (const slotName in daySchedule) {
                const activities = (daySchedule[slotName as SlotName] as Activity[]) || [];
                const activityIndex = activities.findIndex(a => a.id === activityId);
                if (activityIndex > -1) {
                    const newActivities = [...activities];
                    newActivities[activityIndex] = { ...newActivities[activityIndex], details: newDetails };
                    daySchedule[slotName as SlotName] = newActivities;
                    newSchedule[dayKey] = daySchedule;
                    break;
                }
            }
        }
        return newSchedule;
    });
  };
  
  const handleAddActivity = (type: ActivityType, details: string) => {
    let activityDetails = details;
    
    if (type === 'workout') {
        const { description } = getExercisesForDay(date, 'two-muscle', {}, [], false, 'day-of-week');
        activityDetails = description || "New Workout";
    } else if (!details) {
        if (type === 'pomodoro') activityDetails = "New Pomodoro";
        else activityDetails = `New ${type.replace('-', ' ')}`;
    }
    
    const newActivity: Activity = {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        details: activityDetails,
        completed: false,
        slot: currentSlot,
        habitEquationIds: settings.defaultHabitLinks?.[type] ? [settings.defaultHabitLinks[type]!] : [],
        taskIds: [],
        linkedEntityType: (type === 'deepwork' || type === 'upskill') ? 'specialization' : undefined,
    };
    setGlobalSchedule(prev => ({
        ...prev,
        [dayKey]: {
            ...(prev[dayKey] || {}),
            [currentSlot]: [...((prev[dayKey]?.[currentSlot as SlotName] as Activity[]) || []), newActivity],
        }
    }));
    toast({ title: "Activity Added", description: `Added a new task to ${format(date, 'MMM d')}, ${currentSlot}.` });
  };
  
  const handleAddPomodoro = () => {
    handleAddActivity('pomodoro', '');
  };

  const allResistancesAndUrges = useMemo(() => {
    const mindsetCard = resources.find(r => r.name === "Mindset");
    if (!mindsetCard) return { urges: [], resistances: [] };

    const urges = mindsetCard.urges || [];
    const resistances = mindsetCard.resistances || [];
    
    const sortFn = (a: { timestamps?: number[] }, b: { timestamps?: number[] }) => {
        const lastTsA = Math.max(0, ...(a.timestamps || []));
        const lastTsB = Math.max(0, ...(b.timestamps || []));
        return lastTsB - lastTsA;
    };

    return {
      urges: urges.sort(sortFn),
      resistances: resistances.sort(sortFn),
    };
  }, [resources]);
  
  const onAddEntry = (type: 'urges' | 'resistances', text: string) => {
    const mindsetCard = resources.find(r => r.name === "Mindset");
    if (!mindsetCard) {
        toast({ title: "Error", description: "'Mindset' resource card not found.", variant: 'destructive' });
        return;
    }
    
    const newStopper: Stopper = {
        id: `stopper_${Date.now()}`,
        text: text,
        status: 'none',
    };

    const updatedResource = {
        ...mindsetCard,
        [type]: [...(mindsetCard[type] || []), newStopper]
    };
    
    setResources(prev => prev.map(r => r.id === mindsetCard.id ? updatedResource : r));
    toast({ title: 'Entry Added', description: `Your ${type === 'urges' ? 'urge' : 'resistance'} has been logged.`});
  };

  const handleDeleteStopper = (stopperId: string, type: 'urges' | 'resistances') => {
    const mindsetCard = resources.find(r => r.name === "Mindset");
    if (!mindsetCard) return;

    const updatedStoppers = (mindsetCard[type] || []).filter(s => s.id !== stopperId);
    const updatedResource = { ...mindsetCard, [type]: updatedStoppers };
    
    setResources(prev => prev.map(r => r.id === mindsetCard.id ? updatedResource : r));
  };

  const handleRuleClick = (e: React.MouseEvent, rule: MetaRule) => {
    const patternForRule = patterns.find(p => p.id === rule.patternId);
    if (!patternForRule) return;

    const habitPhrase = patternForRule.phrases.find(p => p.category === 'Habit Cards');
    if (!habitPhrase || !habitPhrase.mechanismCardId) return;

    onOpenHabitPopup(habitPhrase.mechanismCardId, e);
  };

  const AllResistancesAndUrgesView = ({ type, onBack }: { type: 'urges' | 'resistances', onBack: () => void }) => {
    const items = allResistancesAndUrges[type];
    const [newEntryText, setNewEntryText] = useState('');

    const handleAddEntry = () => {
        if (newEntryText.trim()) {
            onAddEntry(type, newEntryText.trim());
            setNewEntryText('');
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold capitalize">{type}</h4>
                <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
            </div>
            <div className="flex gap-2">
                <Input
                    value={newEntryText}
                    onChange={e => setNewEntryText(e.target.value)}
                    placeholder={`Describe the ${type === 'urges' ? 'urge' : 'resistance'}...`}
                    onKeyDown={e => e.key === 'Enter' && handleAddEntry()}
                />
                <Button onClick={handleAddEntry} size="icon"><PlusCircle className="h-4 w-4" /></Button>
            </div>
            <ScrollArea className="h-64">
                <ul className="space-y-2 pr-2">
                    {items.map(item => (
                        <li key={item.id}>
                            <div className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50 group">
                                <p className="font-medium">{item.text}</p>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteStopper(item.id, type)}>
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                            </div>
                        </li>
                    ))}
                    {items.length === 0 && <p className="text-center text-sm text-muted-foreground pt-8">No entries yet.</p>}
                </ul>
            </ScrollArea>
        </div>
    );
  };

  const RulesView = ({ onBack }: { onBack: () => void }) => (
    <div className="space-y-3">
        <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold">Meta-Rules</h4>
            <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
        </div>
        <ScrollArea className="h-72">
            <ul className="space-y-1 pr-2">
                {metaRules.map(rule => (
                    <li key={rule.id}>
                        <button className="text-left text-sm text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted/50 w-full" onClick={(e) => handleRuleClick(e, rule)}>
                            {rule.text}
                        </button>
                    </li>
                ))}
                {metaRules.length === 0 && <p className="text-center text-sm text-muted-foreground pt-8">No meta-rules defined.</p>}
            </ul>
        </ScrollArea>
    </div>
  );
  
  const MilestonesView = ({ onBack }: { onBack: () => void }) => {
    if (!dateOfBirth) {
        return (
            <div className="space-y-3 text-center">
                 <h4 className="text-base font-semibold">Birthday Milestones</h4>
                 <p className="text-sm text-muted-foreground py-8">Please set your date of birth in settings to view milestones.</p>
                 <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
            </div>
        )
    }

    const calculateDaysLeft = (targetAge: number) => {
        const dob = new Date(dateOfBirth);
        const targetDate = new Date(dob.getFullYear() + targetAge, dob.getMonth(), dob.getDate());
        return differenceInDays(targetDate, new Date());
    }

    const milestones = [30, 40, 50, 60, 70].map(age => ({
        age,
        daysLeft: calculateDaysLeft(age),
    })).filter(m => m.daysLeft > 0);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold">Birthday Milestones</h4>
                <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
            </div>
            <p className="text-xs text-muted-foreground">Born on: {format(new Date(dateOfBirth), 'PPP')}</p>
            <ScrollArea className="h-72">
                <ul className="space-y-2 pr-2">
                    {milestones.map(m => (
                        <li key={m.age} className="p-2 rounded-md border bg-muted/30">
                            <div className="flex justify-between items-baseline">
                                <span className="text-sm font-semibold">Turning {m.age}</span>
                                <span className="text-lg font-bold text-primary">{m.daysLeft.toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-muted-foreground text-right">days remaining</p>
                        </li>
                    ))}
                    {milestones.length === 0 && <p className="text-sm text-center text-muted-foreground pt-8">No upcoming major milestones.</p>}
                </ul>
            </ScrollArea>
        </div>
    );
  };

  const cardHeightClass = isMobile ? 'h-[80vh]' : isAgendaDocked ? 'h-full' : 'h-auto';
  const gitHubPopup = isMobile && gitHubSyncNotification ? (
    <Card className="fixed bottom-4 left-4 z-[130] w-[420px] max-w-[calc(100vw-2rem)] border-border/70 bg-background/95 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm">{gitHubSyncNotification.title}</CardTitle>
            <CardDescription className="text-xs pt-1">
              {gitHubSyncNotification.mode === 'push' ? 'GitHub push status' : 'GitHub pull status'} • {gitHubSyncNotification.status}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={dismissGitHubSyncNotification}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close GitHub notification</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <pre className="whitespace-pre-wrap break-words text-xs leading-5 font-sans text-foreground/90">
          {gitHubSyncNotification.details}
        </pre>
      </CardContent>
    </Card>
  ) : null;

  const cardContent = (
    <Card className={cn("shadow-2xl bg-background/80 backdrop-blur-sm", cardHeightClass, "flex flex-col")}>
        <CardHeader
            className={cn("p-3", !isAgendaDocked && "cursor-grab active:cursor-grabbing")}
        >
            <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base text-primary">Todo</CardTitle>
                 <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => syncWithGitHub()}><UploadCloud className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={onToggleDock} className="h-8 w-8">
                        {isAgendaDocked ? <Move className="h-4 w-4" /> : <Dock className="h-4 w-4" />}
                    </Button>
                    {!isAgendaDocked && <Grab className="text-muted-foreground h-4 w-4" />}
                </div>
            </div>
             <div className="flex items-center gap-2 mt-1">
                <Popover open={purposePopoverOpen} onOpenChange={setPurposePopoverOpen}>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 text-left cursor-pointer group">
                            <BrainCircuit className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <CardDescription className="text-xs group-hover:text-foreground transition-colors whitespace-pre-wrap break-words" title={purposeText}>
                                {purposeText || "Click to set a daily purpose..."}
                            </CardDescription>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Current Purpose</h4>
                                <p className="text-sm text-muted-foreground">Set your main intention for the day.</p>
                            </div>
                            <div className="space-y-2">
                                <Input value={purposeText} onChange={(e) => setPurposeText(e.target.value)} />
                                <Button onClick={handleSavePurpose} className="w-full">Save Purpose</Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </CardHeader>
        <CardContent className={cn("p-3", isAgendaDocked && "flex-grow min-h-0")}>
            {view === 'list' ? (
              scheduledActivities.length > 0 ? (
                 <ul ref={listRef} className={cn("space-y-1 pr-2", isAgendaDocked ? "h-full overflow-y-auto" : "max-h-[70vh] md:max-h-[60vh] overflow-y-auto")}>
                    {slotOrder.map(slotName => {
                        const activitiesForSlot = scheduledActivities.filter(a => a.slot === slotName);
                        if (activitiesForSlot.length === 0) return null;
                        
                        const isCurrent = slotName === currentSlot;
                        return (
                            <li key={slotName}>
                                <div className={cn("text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2 mb-1", isCurrent && "text-primary")}>
                                     {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>}
                                    {slotName}
                                </div>
                                <ul className="space-y-1 pl-2 border-l">
                                {activitiesForSlot.map(activity => (
                                    <AgendaWidgetItem
                                        key={activity.id}
                                        activity={{...activity, slot: activity.slot as SlotName}}
                                        date={date}
                                        onToggleComplete={handleToggleComplete}
                                        onActivityClick={onActivityClick}
                                        onStartFocus={onStartFocus}
                                        onRemoveActivity={onRemoveActivity}
                                        onUpdateActivity={handleUpdateActivity}
                                        setRoutine={toggleRoutine}
                                        onOpenHabitPopup={onOpenHabitPopup}
                                        context="agenda"
                                        loggedDuration={activityDurations[activity.id]}
                                        hasLoggedStopper={isTaskLogged(activity)}
                                    />
                                ))}
                                </ul>
                            </li>
                        );
                    })}
                </ul>
              ) : (
                  <div className="text-center text-muted-foreground py-4">
                      <p className="text-sm">No activities scheduled.</p>
                  </div>
              )
            ) : view === 'chart' ? (
              <div className="h-[250px] w-full">
                <TimeAllocationChart timeAllocationData={timeAllocationData} />
              </div>
            ) : view === 'botherings' ? (
              <div className={cn("pr-2", isAgendaDocked ? "h-full overflow-y-auto" : "max-h-[70vh] md:max-h-[60vh] overflow-y-auto")}>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {(['External', 'Mismatch', 'Constraint', 'Current', 'Parked'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveBotheringTab(tab)}
                      className={cn(
                        "px-2.5 py-1 rounded-full border text-xs transition",
                        activeBotheringTab === tab
                          ? "border-emerald-400/50 text-emerald-300 bg-emerald-500/10"
                          : "border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20"
                      )}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span>{tab}</span>
                        <span className="px-1.5 py-0.5 rounded-full border border-white/10 bg-background/40 text-[10px]">
                          {botheringTabCounts[tab] ?? 0}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                {activeBotherings.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">
                    No active botherings.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {activeBotherings.map((item) => {
                      const b = item.point;
                      const stats =
                        activeBotheringTab === 'Current'
                          ? getCurrentSlotBotheringStats(b, item.sourceType)
                          : getTodayBotheringStats(b, item.sourceType);
                      const isDoneToday = stats.total > 0 && stats.completed === stats.total;
                      return (
                        <li
                          key={b.id}
                          className={cn(
                            "rounded-lg border p-3 cursor-pointer transition",
                            isDoneToday
                              ? "border-emerald-400/50 bg-emerald-500/10"
                              : "border-muted/40 bg-muted/20 hover:border-emerald-400/40 hover:bg-emerald-500/5"
                          )}
                          onClick={() => selectBotheringInTodo(b, item.sourceType)}
                        >
                          <div className={cn("text-sm font-semibold", isDoneToday && "line-through text-muted-foreground")}>
                            {b.text}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300/90 bg-amber-400/10">
                              {getDaysLeftLabel(b.endDate)}
                            </span>
                            {getEffectiveBotheringTasks(b, item.sourceType).length === 0 ? (
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
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : view === 'core' ? (
              <div className={cn("pr-2", isAgendaDocked ? "h-full overflow-y-auto" : "max-h-[70vh] md:max-h-[60vh] overflow-y-auto")}>
                <div className="grid grid-cols-3 gap-2">
                  {coreStateCards.map((item) => {
                    const meta = STATE_META[item.state];
                    return (
                      <div key={item.core.id} className={cn("rounded-lg border p-2 bg-muted/20 min-h-[92px]", meta.cardClass)}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-muted-foreground shrink-0">{item.core.icon}</span>
                          <span className="text-xs font-semibold truncate">{item.core.label}</span>
                        </div>
                        <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                          <div>{item.percent}%</div>
                          <div>{item.botherings} bothers</div>
                          <div className="flex items-center justify-between gap-2">
                            <span>backlog {item.backlog}</span>
                            <span className={cn("px-2 py-0.5 text-[10px] rounded-full border shrink-0", meta.badgeClass)}>{meta.label}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
                view === 'urges' ? <AllResistancesAndUrgesView type="urges" onBack={() => setView('list')} /> :
                view === 'resistances' ? <AllResistancesAndUrgesView type="resistances" onBack={() => setView('list')} /> :
                view === 'rules' ? <RulesView onBack={() => setView('list')} /> :
                view === 'milestones' ? <MilestonesView onBack={() => setView('list')} /> : null
            )}
        </CardContent>
        <CardFooter className="p-2 flex justify-between items-center">
            <div className="flex items-center">
                <Button variant="ghost" size="sm" onClick={() => setView('list')}>
                    <ListChecks className={cn("h-4 w-4", view === 'list' && "text-primary")} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setView('chart')}>
                    <PieChart className={cn("h-4 w-4", view === 'chart' && "text-primary")} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setView('botherings')}>
                    <Brain className={cn("h-4 w-4", view === 'botherings' && "text-primary")} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setView('core')}>
                    <Shield className={cn("h-4 w-4", view === 'core' && "text-primary")} />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleCurrentSlotOnly}
                    title={settings.agendaShowCurrentSlotOnly ? "Show all slots" : "Show current slot only"}
                >
                    <Target className={cn("h-4 w-4", settings.agendaShowCurrentSlotOnly && "text-primary")} />
                </Button>
            </div>
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadFromGitHub()}>
                    <DownloadCloud className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><PlusCircle className="h-4 w-4"/></Button>
                    </DropdownMenuTrigger>
                    <AddActivityMenu onAddActivity={(type, details) => handleAddActivity(type, details)} />
                </DropdownMenu>
            </div>
        </CardFooter>
    </Card>
  );

  if (!isAgendaDocked) {
    return (
      <>
        <motion.div
          drag
          dragControls={dragControls}
          className="fixed z-50 w-full max-w-sm"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
          onDragEnd={() => {
              if (positionKey) {
                  safeSetLocalStorageItem(positionKey, JSON.stringify(position));
              }
          }}
          dragMomentum={false}
        >
          {cardContent}
        </motion.div>
        {gitHubPopup}
      </>
    );
  }

  return (
    <>
      {cardContent}
      {gitHubPopup}
    </>
  );
}

type BotheringSourceType = "External" | "Mismatch" | "Constraint";
type BotheringTask = NonNullable<MindsetPoint["tasks"]>[number];
type CoreStateId = "S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6";

const CORE_DEFS: Array<{ id: CoreDomainId; label: string; icon: React.ReactNode; dominantType: BotheringSourceType }> = [
  { id: "health", label: "Health", icon: <HeartPulse className="h-3.5 w-3.5" />, dominantType: "External" },
  { id: "wealth", label: "Wealth", icon: <Wallet className="h-3.5 w-3.5" />, dominantType: "Constraint" },
  { id: "relations", label: "Relations", icon: <Users className="h-3.5 w-3.5" />, dominantType: "External" },
  { id: "meaning", label: "Meaning", icon: <Compass className="h-3.5 w-3.5" />, dominantType: "Mismatch" },
  { id: "competence", label: "Competence", icon: <Wrench className="h-3.5 w-3.5" />, dominantType: "Mismatch" },
  { id: "autonomy", label: "Autonomy", icon: <Blocks className="h-3.5 w-3.5" />, dominantType: "Constraint" },
  { id: "creativity", label: "Creativity", icon: <Palette className="h-3.5 w-3.5" />, dominantType: "External" },
  { id: "contribution", label: "Contribution", icon: <HandHeart className="h-3.5 w-3.5" />, dominantType: "Constraint" },
  { id: "transcendence", label: "Transcendence", icon: <Sparkles className="h-3.5 w-3.5" />, dominantType: "Mismatch" },
];

const CORE_GROUP_BY_TYPE: Record<BotheringSourceType, CoreDomainId[]> = {
  Constraint: ["wealth", "autonomy", "contribution"],
  Mismatch: ["meaning", "competence", "transcendence"],
  External: ["health", "relations", "creativity"],
};
const TYPE_FALLBACK_CORE: Record<BotheringSourceType, CoreDomainId> = {
  Constraint: "wealth",
  Mismatch: "meaning",
  External: "health",
};
const CORE_KEYWORDS: Record<CoreDomainId, string[]> = {
  health: ["health", "sleep", "energy", "fatigue", "food", "diet", "body", "ill", "anxiety", "insomnia", "workout"],
  wealth: ["money", "income", "salary", "finance", "job", "cash", "expense", "wealth", "earning", "budget"],
  relations: ["relation", "relationship", "friend", "family", "lonely", "rejection", "buddy", "people", "trust", "bond"],
  meaning: ["meaning", "purpose", "direction", "empty", "confusion", "boredom", "existential", "goal", "narrative"],
  competence: ["skill", "competence", "impostor", "procrastination", "practice", "learn", "performance", "ability"],
  autonomy: ["autonomy", "control", "choice", "trapped", "dependency", "obligation", "freedom", "resentment"],
  creativity: ["creativity", "creative", "expression", "art", "output", "restless", "style", "design", "write", "draw"],
  contribution: ["contribution", "impact", "give", "help", "community", "value", "useful", "reach", "platform"],
  transcendence: ["transcendence", "death", "identity", "spiritual", "truth", "silence", "unity", "meditation", "awareness"],
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
const STATE_META: Record<CoreStateId, { label: string; badgeClass: string; cardClass: string }> = {
  S0: { label: "S0", badgeClass: "border-slate-400/40 text-slate-200 bg-slate-500/10", cardClass: "border-slate-500/30" },
  S1: { label: "S1", badgeClass: "border-red-400/40 text-red-200 bg-red-500/10", cardClass: "border-red-500/35" },
  S2: { label: "S2", badgeClass: "border-orange-400/40 text-orange-200 bg-orange-500/10", cardClass: "border-orange-500/35" },
  S3: { label: "S3", badgeClass: "border-amber-400/40 text-amber-200 bg-amber-500/10", cardClass: "border-amber-500/35" },
  S4: { label: "S4", badgeClass: "border-green-400/40 text-green-200 bg-green-500/10", cardClass: "border-green-500/35" },
  S5: { label: "S5", badgeClass: "border-cyan-400/40 text-cyan-200 bg-cyan-500/10", cardClass: "border-cyan-500/35" },
  S6: { label: "S6", badgeClass: "border-blue-400/40 text-blue-200 bg-blue-500/10", cardClass: "border-blue-500/35" },
};
