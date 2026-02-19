
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, MoreVertical, Brain, Wind, History, Repeat, Link as LinkIcon, CheckCircle2, Circle, Trash2, Play, Timer, PlusCircle } from 'lucide-react';
import type { Activity, ActivityType, RecurrenceRule } from '@/types/workout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { isToday } from 'date-fns';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { EditableActivityText } from './EditableActivityText';
import { useRouter } from 'next/navigation';


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
    'spaced-repetition': <Repeat className="h-4 w-4 text-blue-500" />,
    pomodoro: <Timer className="h-4 w-4" />,
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
    expectedDuration?: string;
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
    expectedDuration,
    hasLoggedStopper,
}: AgendaWidgetItemProps) => {
    const { 
        setSelectedDeepWorkTask, 
        setSelectedUpskillTask,
        findRootTask,
        highlightedTaskIds,
        currentSlot,
        coreSkills,
        offerizationPlans,
        upskillDefinitions,
        deepWorkDefinitions,
    } = useAuth();
    const router = useRouter();

    const isInlineEditable = !['upskill', 'deepwork', 'workout', 'branding', 'lead-generation', 'mindset', 'nutrition', 'spaced-repetition'].includes(activity.type);
    const isAgendaContext = context === 'agenda';

    const handleItemClick = (e: React.MouseEvent) => {
        if (onActivityClick) {
            onActivityClick(activity, e);
        }
    };
    
    const isPlanningTask = (activity.type === 'upskill' || activity.type === 'deepwork') && activity.linkedEntityType === 'specialization';
    const linkedActivityName = activity.type === 'pomodoro' && activity.linkedActivityType
        ? activity.linkedActivityType.charAt(0).toUpperCase() + activity.linkedActivityType.slice(1).replace('-', ' ')
        : null;

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

    const baseMatch = activity.id.match(/_(\d{4}-\d{2}-\d{2})$/);
    const baseId = baseMatch ? activity.id.slice(0, -11) : activity.id;
    const isHighlighted =
        highlightedTaskIds?.has(activity.id) ||
        highlightedTaskIds?.has(baseId) ||
        (activity.taskIds || []).some(id => highlightedTaskIds?.has(id));
    const shouldStrike = activity.completed || !!hasLoggedStopper;
    const learningTargetLabel = useMemo(() => {
        if (!(activity.type === 'upskill' || activity.type === 'deepwork')) return null;

        const normalizeText = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const specs = (coreSkills || []).filter((skill) => skill.type === 'Specialization');
        const allDefs = [...(upskillDefinitions || []), ...(deepWorkDefinitions || [])];

        let matchedSpec = specs.find((spec) => spec.id === activity.id || normalizeText(spec.name) === normalizeText(activity.details));

        if (!matchedSpec) {
            const matchedDef =
                allDefs.find((def) => def.id === activity.id) ||
                allDefs.find((def) => normalizeText(def.name) === normalizeText(activity.details));
            if (matchedDef) {
                const categoryKey = normalizeText(matchedDef.category);
                matchedSpec = specs.find((spec) => {
                    if (normalizeText(spec.name) === categoryKey) return true;
                    if (spec.skillAreas.some((area) => normalizeText(area.name) === categoryKey)) return true;
                    return spec.skillAreas.some((area) => area.microSkills.some((micro) => normalizeText(micro.name) === categoryKey));
                });
            }
        }

        if (!matchedSpec) return null;
        if (activity.type === 'deepwork') {
            const releases = offerizationPlans?.[matchedSpec.id]?.releases || [];
            const normalizeStageItem = (item: string | { text: string; completed?: boolean }) =>
                typeof item === 'string'
                    ? { text: item, completed: false }
                    : { text: item.text || '', completed: !!item.completed };
            const toDateKey = (value?: string | null) => {
                if (!value) return null;
                if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
                const parsed = new Date(value);
                if (Number.isNaN(parsed.getTime())) return null;
                return parsed.toISOString().slice(0, 10);
            };
            const today = new Date();
            const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const msPerDay = 24 * 60 * 60 * 1000;

            const candidatePlans = releases
                .map((release) => {
                    const stages = release.workflowStages;
                    const allItems = [
                        ...(stages?.ideaItems || []),
                        ...(stages?.codeItems || []),
                        ...(stages?.breakItems || []),
                        ...(stages?.fixItems || []),
                    ].map(normalizeStageItem);
                    const remainingItems = allItems.filter((item) => item.text.trim() && !item.completed).length;
                    const launchDateKey = toDateKey(release.launchDate);
                    const daysLeft = launchDateKey
                        ? Math.max(0, Math.floor((new Date(launchDateKey).getTime() - startOfToday.getTime()) / msPerDay))
                        : null;
                    return { remainingItems, daysLeft };
                })
                .filter((plan) => plan.remainingItems > 0);

            if (candidatePlans.length === 0) return null;
            const withDate = candidatePlans
                .filter((plan) => plan.daysLeft != null)
                .sort((a, b) => (a.daysLeft as number) - (b.daysLeft as number));
            const chosen = withDate[0] || candidatePlans[0];
            const daysWindow = chosen.daysLeft == null ? null : Math.max(1, chosen.daysLeft);
            const itemTarget = daysWindow == null
                ? null
                : chosen.daysLeft === 0
                    ? chosen.remainingItems
                    : Math.max(1, Math.ceil(chosen.remainingItems / daysWindow));
            return itemTarget != null ? `${itemTarget} items/day` : null;
        }

        const learningPlan = offerizationPlans?.[matchedSpec.id]?.learningPlan;
        const audioResources = learningPlan?.audioVideoResources || [];
        const bookResources = learningPlan?.bookWebpageResources || [];
        const hasAudio = audioResources.length > 0;
        const hasBooks = bookResources.length > 0;
        if (!hasAudio && !hasBooks) return null;

        const totalHours = audioResources.reduce((sum, resource) => sum + (resource.totalHours || 0), 0);
        const totalPages = bookResources.reduce((sum, resource) => sum + (resource.totalPages || 0), 0);
        const completedHours = matchedSpec.skillAreas.reduce((sum, area) => sum + area.microSkills.reduce((inner, micro) => inner + (micro.completedHours || 0), 0), 0);
        const completedPages = matchedSpec.skillAreas.reduce((sum, area) => sum + area.microSkills.reduce((inner, micro) => inner + (micro.completedPages || 0), 0), 0);
        const remainingHours = Math.max(0, totalHours - completedHours);
        const remainingPages = Math.max(0, totalPages - completedPages);

        const normalizeDateKey = (value?: string | null) => {
            if (!value) return null;
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) return null;
            return parsed.toISOString().slice(0, 10);
        };
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const msPerDay = 24 * 60 * 60 * 1000;
        const latestAudioEndDate = audioResources
            .map((resource) => normalizeDateKey(resource.completionDate))
            .filter((date): date is string => !!date)
            .reduce<string | null>((latest, date) => (!latest || date > latest ? date : latest), null);
        const latestBookEndDate = bookResources
            .map((resource) => normalizeDateKey(resource.completionDate))
            .filter((date): date is string => !!date)
            .reduce<string | null>((latest, date) => (!latest || date > latest ? date : latest), null);

        const audioDaysLeft = latestAudioEndDate
            ? Math.max(0, Math.floor((new Date(latestAudioEndDate).getTime() - startOfToday.getTime()) / msPerDay))
            : null;
        const bookDaysLeft = latestBookEndDate
            ? Math.max(0, Math.floor((new Date(latestBookEndDate).getTime() - startOfToday.getTime()) / msPerDay))
            : null;

        const hourTarget = hasAudio && remainingHours > 0 && audioDaysLeft != null
            ? Math.max(0.1, Number((remainingHours / Math.max(1, audioDaysLeft || 1)).toFixed(1)))
            : null;
        const pageTarget = hasBooks && remainingPages > 0 && bookDaysLeft != null
            ? Math.max(1, Math.ceil(remainingPages / Math.max(1, bookDaysLeft || 1)))
            : null;

        const pieces: string[] = [];
        if (pageTarget != null) pieces.push(`${pageTarget}p/day`);
        if (hourTarget != null) pieces.push(`${hourTarget}h/day`);
        if (pieces.length === 0) return null;
        return pieces.join(' / ');
    }, [activity.details, activity.id, activity.type, coreSkills, deepWorkDefinitions, offerizationPlans, upskillDefinitions]);

    const slotOrder = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];
    const isPastSlot =
        isToday(date) &&
        currentSlot &&
        slotOrder.indexOf(activity.slot) !== -1 &&
        slotOrder.indexOf(currentSlot) !== -1 &&
        slotOrder.indexOf(activity.slot) < slotOrder.indexOf(currentSlot) &&
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
                "flex items-start gap-2 p-2 rounded-lg border border-transparent group transition-all",
                context === 'timeslot' && 'bg-background',
                onActivityClick && 'cursor-pointer',
                isHighlighted && "border-emerald-400/50 bg-emerald-500/10"
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
                {(isAgendaContext || context === 'timeslot') && isInlineEditable ? (
                    <EditableActivityText
                        initialValue={activity.details}
                        onUpdate={(newDetails) => onUpdateActivity(activity.id, newDetails)}
                        className={cn("text-sm font-medium w-full block", shouldStrike && "line-through text-muted-foreground")}
                    />
                ) : (
                    <p className={cn("text-sm font-medium", shouldStrike && "line-through text-muted-foreground")}>
                        {activity.details}
                    </p>
                )}
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
                    {!activity.completed && expectedDuration && (
                        <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-400/40 hover:bg-yellow-500/25">
                            {expectedDuration}
                        </Badge>
                    )}
                    {!activity.completed && learningTargetLabel && (
                        <Badge className="bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/20">
                            {learningTargetLabel}
                        </Badge>
                    )}
                    {activity.completed && loggedDuration && (
                        <Badge variant="secondary">{loggedDuration}</Badge>
                    )}
                </div>
            </div>
        </li>
    );
});
AgendaWidgetItem.displayName = 'AgendaWidgetItem';
