
"use client";

import React, { useState, useEffect, useRef } from 'react';
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
}: AgendaWidgetItemProps) => {
    const { 
        setSelectedDeepWorkTask, 
        setSelectedUpskillTask,
        findRootTask,
        highlightedTaskIds,
        currentSlot,
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
                        className={cn("text-sm font-medium w-full block", activity.completed && "line-through text-muted-foreground")}
                    />
                ) : (
                    <p className={cn("text-sm font-medium", activity.completed && "line-through text-muted-foreground")}>
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
                    {activity.completed && loggedDuration && (
                        <Badge variant="secondary">{loggedDuration}</Badge>
                    )}
                </div>
            </div>
        </li>
    );
});
AgendaWidgetItem.displayName = 'AgendaWidgetItem';
