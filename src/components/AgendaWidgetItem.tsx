
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, MoreVertical, Brain, Wind, History, Repeat, Link as LinkIcon, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import type { Activity, ActivityType, RecurrenceRule } from '@/types/workout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';


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
};

interface AgendaWidgetItemProps {
    activity: Activity & { slot: string };
    date: Date;
    onToggleComplete: (slot: string, activityId: string, isCompleted: boolean) => void;
    onActivityClick: (slotName: string, activity: Activity, event: React.MouseEvent) => void;
    onRemoveActivity: (slotName: string, activityId: string) => void;
    setRoutine: (activity: Activity, rule: RecurrenceRule | null) => void;
    onOpenTaskContext: (activityId: string, event: React.MouseEvent) => void;
    onOpenHabitPopup: (habitId: string, event: React.MouseEvent) => void;
    context: 'agenda' | 'timeslot';
}

export const AgendaWidgetItem = React.memo(({ activity, date, onToggleComplete, onActivityClick, onRemoveActivity, setRoutine, onOpenTaskContext, onOpenHabitPopup, context }: AgendaWidgetItemProps) => {
    const { habitCards } = useAuth();
    const isClickable = !activity.completed && (activity.type === 'deepwork' || activity.type === 'upskill' || activity.type === 'branding' || activity.type === 'workout' || activity.type === 'mindset' || activity.type === 'essentials' || activity.type === 'nutrition');

    const linkedHabits = React.useMemo(() => 
        (activity.habitEquationIds || []).map(id => habitCards.find(h => h.id === id)).filter((h): h is NonNullable<typeof h> => !!h)
    , [activity.habitEquationIds, habitCards]);
    
    return (
        <li 
            className={cn("flex items-start gap-2 p-2 rounded-lg group transition-all", isClickable && "cursor-pointer hover:bg-muted/50", context === 'timeslot' && 'bg-background')}
            onClick={(e) => isClickable && onActivityClick(activity.slot, activity, e)}
        >
            <button onClick={(e) => { e.stopPropagation(); onToggleComplete(activity.slot, activity.id, !activity.completed); }} className="mt-0.5">
                {activity.completed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
            </button>
            <div className="flex-grow min-w-0">
                <p className={cn("text-sm font-medium", activity.completed && "line-through text-muted-foreground")}>{activity.details}</p>
                 <div className="flex flex-wrap items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                        {activityIcons[activity.type]} {activity.type.replace('-', ' ')}
                    </div>
                    {linkedHabits.map(habit => (
                        <button key={habit.id} onClick={(e) => {e.stopPropagation(); onOpenHabitPopup(habit.id, e);}} className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/80 hover:bg-primary/20">
                            {habit.name}
                        </button>
                    ))}
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                 <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={() => onOpenTaskContext(activity.id, { clientX: 0, clientY: 0 } as React.MouseEvent)}>View Context</DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>Repeat</DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onSelect={() => setRoutine(activity, { type: 'daily' })}>Daily</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setRoutine(activity, { type: 'weekly' })}>Weekly</DropdownMenuItem>
                                {activity.routine && <DropdownMenuSeparator />}
                                {activity.routine && <DropdownMenuItem onSelect={() => setRoutine(activity, null)} className="text-destructive">No Repeat</DropdownMenuItem>}
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => onRemoveActivity(activity.slot, activity.id)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Remove
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </li>
    );
});
AgendaWidgetItem.displayName = 'AgendaWidgetItem';
