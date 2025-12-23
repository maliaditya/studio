

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, MoreVertical, Brain, Wind, History, Repeat, Link as LinkIcon, CheckCircle2, Circle, Trash2, Play, Timer } from 'lucide-react';
import type { Activity, ActivityType, RecurrenceRule } from '@/types/workout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { EditableActivityText } from './EditableActivityText';


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
    const isTimeslot = context === 'timeslot';

    const isInlineEditable = !['upskill', 'deepwork', 'workout', 'branding', 'lead-generation', 'mindset', 'nutrition'].includes(activity.type);

    const handleItemClick = (e: React.MouseEvent) => {
        if (onActivityClick) {
            onActivityClick(activity, e);
        }
    };
    
    const isPlanningTask = (activity.type === 'upskill' || activity.type === 'deepwork') && activity.linkedEntityType === 'specialization';
    const linkedActivityName = activity.type === 'pomodoro' && activity.linkedActivityType
        ? activity.linkedActivityType.charAt(0).toUpperCase() + activity.linkedActivityType.slice(1).replace('-', ' ')
        : null;

    return (
        <li 
            className={cn(
                "flex items-start gap-2 p-2 rounded-lg group transition-all",
                isTimeslot && 'bg-background',
                onActivityClick && 'cursor-pointer'
            )}
            onClick={handleItemClick}
        >
            <button onClick={(e) => { e.stopPropagation(); onToggleComplete(activity.slot, activity.id); }} className="mt-0.5">
                {activity.completed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
            </button>
            <div className="flex-grow min-w-0">
                {isTimeslot && isInlineEditable ? (
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
                    {linkedActivityName && <Badge variant={activity.completed ? 'outline' : 'secondary'}>{linkedActivityName}</Badge>}
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
