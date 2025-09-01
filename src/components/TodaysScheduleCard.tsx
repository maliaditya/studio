
      
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType, FullSchedule, SubTask } from '@/types/workout';
import {
  CheckCircle2, Circle, Grab, Dock, Move, Save, History, PlusCircle, BrainCircuit, Timer, GitBranch, Focus, Repeat, Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { useRouter } from 'next/navigation';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { useToast } from '@/hooks/use-toast';

const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

interface AgendaWidgetItemProps {
  activity: Activity & { slot: keyof DailySchedule };
  duration: string | undefined;
  date: Date;
  onLogLearning: (activity: Activity, progress: number, duration: number) => void;
  onStartWorkoutLog: (activity: Activity) => void;
  onToggleComplete: (slotName: string, activityId: string, isCompleted: boolean) => void;
  onStartLeadGenLog: (activity: Activity) => void;
  onOpenFocusModal: (activity: Activity) => boolean;
  onOpenTaskContext: (activityId: string, event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenHabitPopup: (habitId: string, event: React.MouseEvent) => void;
}

function AgendaWidgetItem({ 
    activity, 
    duration, 
    date,
    onStartWorkoutLog, 
    onToggleComplete, 
    onStartLeadGenLog, 
    onOpenFocusModal, 
    onOpenTaskContext,
    onOpenHabitPopup,
}: AgendaWidgetItemProps) {
  const { workoutMode, workoutPlans, exerciseDefinitions, habitCards } = useAuth();
  const { toast } = useToast();
  
  let displayDetails = activity.details;
  if (activity.type === 'workout') {
    const { description } = getExercisesForDay(date, workoutMode, workoutPlans, exerciseDefinitions);
    displayDetails = description.split(' for ')[1] || "Workout";
  }

  const linkedHabit = useMemo(() => {
    if (activity.habitEquationIds && activity.habitEquationIds.length > 0) {
      // For simplicity, showing the first linked habit. Can be expanded later.
      return habitCards.find(h => h.id === activity.habitEquationIds![0]);
    }
    return null;
  }, [activity.habitEquationIds, habitCards]);

  const handleTitleClick = (event: React.MouseEvent) => {
    if (activity.completed) {
      onToggleComplete(activity.slot, activity.id, false);
      return;
    }
    
    if (linkedHabit) {
        onOpenHabitPopup(linkedHabit.id, event);
        return;
    }
  };

  const handleFocusClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const shouldOpenModal = onOpenFocusModal(activity);
    if (!shouldOpenModal) {
      toast({
        title: "Objective Already Complete",
        description: `All sub-tasks for "${activity.details}" are already logged.`,
      });
    }
  };
  
  const itemContent = (
    <div className="flex items-center justify-between gap-4 p-2 rounded-md bg-muted/50 w-full group">
      <div className="flex items-start gap-3 min-w-0 flex-grow">
        <button onClick={() => onToggleComplete(activity.slot, activity.id, !activity.completed)} className="pt-0.5">
            {activity.completed 
              ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              : <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            }
        </button>
        <div 
          className={cn("flex-grow min-w-0", !activity.completed && (activity.type === 'essentials' || linkedHabit) && "cursor-pointer")}
          onClick={handleTitleClick}
        >
          <p className={`font-medium truncate ${activity.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`} title={displayDetails}>
            {displayDetails}
          </p>
          {linkedHabit && (
            <div className="min-w-0">
                <p className="text-xs text-primary font-medium truncate" title={linkedHabit.name}>
                    Habit: {linkedHabit.name}
                </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center text-right gap-1">
        {duration && <p className="text-xs font-semibold whitespace-nowrap text-muted-foreground">{duration}</p>}
        {!activity.completed && activity.type !== 'interrupt' ? (
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleFocusClick}
            >
                <Timer className="h-4 w-4" />
            </Button>
        ) : (activity.taskIds && activity.taskIds.length > 0) ? (
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => onOpenTaskContext(activity.id, e)}
            >
                <GitBranch className="h-4 w-4" />
            </Button>
        ) : null}
      </div>
    </div>
  );
  
  return <li>{itemContent}</li>;
}


interface TodaysScheduleCardProps {
  schedule: FullSchedule;
  date: Date;
  activityDurations: Record<string, string>;
  isAgendaDocked: boolean;
  onToggleDock: () => void;
  onLogLearning: (activity: Activity, progress: number, duration: number) => void;
  onStartWorkoutLog: (activity: Activity) => void;
  onStartLeadGenLog: (activity: Activity) => void;
  onToggleComplete: (slotName: string, activityId: string, isCompleted: boolean) => void;
  onOpenFocusModal: (activity: Activity) => boolean;
  onOpenTaskContext: (activityId: string, event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenHabitPopup: (habitId: string, event: React.MouseEvent) => void;
  currentSlot: string;
}

export function TodaysScheduleCard({ 
  schedule, 
  date,
  activityDurations, 
  isAgendaDocked, 
  onToggleDock,
  onLogLearning,
  onStartWorkoutLog,
  onStartLeadGenLog,
  onToggleComplete,
  onOpenFocusModal,
  onOpenTaskContext,
  onOpenHabitPopup,
  currentSlot,
}: TodaysScheduleCardProps) {
  const { currentUser, carryForwardTask, dailyPurposes, setDailyPurposes, openRuleDetailPopup, patterns, metaRules, handleLinkHabit } = useAuth();
  const dayKey = React.useMemo(() => format(date, 'yyyy-MM-dd'), [date]);
  
  const [purposeText, setPurposeText] = useState('');
  const [purposePopoverOpen, setPurposePopoverOpen] = useState(false);
  const [showCurrentSlotOnly, setShowCurrentSlotOnly] = useState(false);

  useEffect(() => {
    setPurposeText(dailyPurposes[dayKey] || '');
  }, [dailyPurposes, dayKey]);

  const handleSavePurpose = () => {
    setDailyPurposes(prev => ({...prev, [dayKey]: purposeText}));
    setPurposePopoverOpen(false);
  };

  const todaysSchedule = React.useMemo(() => {
    return schedule[dayKey] || {};
  }, [schedule, dayKey]);

  const scheduledActivities = React.useMemo(() => {
    let allActivities = slotOrder.flatMap(slot => {
        const activities = todaysSchedule[slot];
        if (activities && Array.isArray(activities) && activities.length > 0) {
            return activities.map(activity => ({ slot, ...activity }));
        }
        return [];
    });

    if (showCurrentSlotOnly) {
        allActivities = allActivities.filter(activity => activity.slot === currentSlot);
    }
    
    return allActivities.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot);
    });
  }, [todaysSchedule, showCurrentSlotOnly, currentSlot]);

  const timeSummary = React.useMemo(() => {
    const dailyActivities = Object.values(todaysSchedule).flat();
    if (dailyActivities.length === 0) {
        return { completed: 0, total: 0 };
    }

    const parseDurationToHours = (activity: Activity): number => {
        let totalMinutes = 0;
        if (activity.completed && activity.duration) {
            totalMinutes = activity.duration;
        } else {
            const durationStr = activityDurations[activity.id];
            if (!durationStr || typeof durationStr !== 'string') return 0;
            if (/^\d+$/.test(durationStr.trim())) {
                totalMinutes = parseInt(durationStr.trim(), 10);
            } else {
                const hourMatch = durationStr.match(/(\d+)\s*h/);
                if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
                const minMatch = durationStr.match(/(\d+)\s*m/);
                if (minMatch) totalMinutes += parseInt(minMatch[1], 10);
            }
        }
        return totalMinutes / 60;
    };

    const totalScheduledHours = dailyActivities.reduce((sum, activity) => {
        return sum + parseDurationToHours(activity);
    }, 0);

    const completedHours = dailyActivities
        .filter(activity => activity.completed)
        .reduce((sum, activity) => {
            return sum + parseDurationToHours(activity);
        }, 0);

    return { completed: completedHours, total: totalScheduledHours };
  }, [todaysSchedule, activityDurations]);


  const pendingTasks = React.useMemo(() => {
    const yesterday = addDays(date, -1);
    const yesterdayKey = format(yesterday, 'yyyy-MM-dd');
    const yesterdaysSchedule = schedule[yesterdayKey] || {};
    return Object.values(yesterdaysSchedule)
      .flat()
      .filter((activity): activity is Activity => !!activity && !activity.completed);
  }, [schedule, date]);

  const slotNames: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

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
                 // Fallback to default position if parsing fails
                 const initialY = window.innerHeight - Math.min(window.innerHeight - 80, 450);
                 const initialX = window.innerWidth - Math.min(window.innerWidth - 20, 340);
                 setPosition({ x: initialX, y: initialY });
            }
        } else {
             // Default position if nothing is saved
            const initialY = window.innerHeight - Math.min(window.innerHeight - 80, 450);
            const initialX = window.innerWidth - Math.min(window.innerWidth - 20, 340);
            setPosition({ x: initialX, y: initialY });
        }
    }
  }, [isAgendaDocked, positionKey]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, [role="button"]') || isAgendaDocked) return;
    setIsDragging(true);
    setDragStartOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartOffset.x,
        y: e.clientY - dragStartOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (positionKey) {
        localStorage.setItem(positionKey, JSON.stringify(position));
    }
  };

  useEffect(() => {
    if (isDragging && !isAgendaDocked) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStartOffset, isAgendaDocked, position, positionKey]);

  const cardContent = (
    <Card className="shadow-2xl bg-background/80 backdrop-blur-sm">
        <CardHeader
            className={cn("p-3", !isAgendaDocked && "cursor-grab active:cursor-grabbing")}
            onMouseDown={handleMouseDown}
        >
            <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base text-primary">Agenda</CardTitle>
                <div className="flex items-center">
                    {timeSummary.total > 0 && (
                        <span className="font-mono text-sm font-medium text-muted-foreground">
                            {timeSummary.completed.toFixed(1)} / {timeSummary.total.toFixed(1)}h
                        </span>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowCurrentSlotOnly(p => !p)}>
                        <Focus className={cn("h-4 w-4", showCurrentSlotOnly ? "text-primary" : "text-muted-foreground")} />
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <History className="h-4 w-4" />
                            <span className="sr-only">Pending Tasks</span>
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <h4 className="font-medium leading-none mb-2">Yesterday's Pending Tasks</h4>
                            {pendingTasks.length > 0 ? (
                            <ScrollArea className="h-64">
                                <ul className="space-y-2">
                                {pendingTasks.map(task => (
                                    <li key={task.id} className="flex items-center justify-between text-sm">
                                    <span className="truncate pr-2" title={task.details}>{task.details}</span>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-7"><PlusCircle className="mr-2 h-3.5 w-3.5" /> Add</Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-48 p-1">
                                        <div className="flex flex-col">
                                            {slotNames.map(slot => (
                                            <Button
                                                key={slot}
                                                variant="ghost"
                                                className="justify-start h-8 text-sm"
                                                onClick={() => {
                                                carryForwardTask(task, slot);
                                                }}
                                            >
                                                {slot}
                                            </Button>
                                            ))}
                                        </div>
                                        </PopoverContent>
                                    </Popover>
                                    </li>
                                ))}
                                </ul>
                            </ScrollArea>
                            ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No pending tasks from yesterday.</p>
                            )}
                        </PopoverContent>
                    </Popover>
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
                                <h4 className="font-medium leading-none">Daily Purpose</h4>
                                <p className="text-sm text-muted-foreground">Set your main intention for today.</p>
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
        <CardContent className="p-3">
            {scheduledActivities.length > 0 ? (
                <ul className="space-y-1 max-h-64 overflow-y-auto pr-2">
                    {scheduledActivities.map((activity) => (
                    <AgendaWidgetItem
                        key={activity.id}
                        activity={activity}
                        duration={activityDurations[activity.id]}
                        date={date}
                        onLogLearning={() => {}}
                        onStartWorkoutLog={onStartWorkoutLog}
                        onToggleComplete={onToggleComplete}
                        onStartLeadGenLog={onStartLeadGenLog}
                        onOpenFocusModal={onOpenFocusModal}
                        onOpenTaskContext={onOpenTaskContext}
                        onOpenHabitPopup={onOpenHabitPopup}
                    />
                    ))}
                </ul>
            ) : (
                <div className="text-center text-muted-foreground py-4">
                    <p className="text-sm">No activities scheduled.</p>
                </div>
            )}
        </CardContent>
    </Card>
  );

  if (!isAgendaDocked) {
    return (
      <div
        className="fixed z-50 w-full max-w-sm"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          userSelect: isDragging ? 'none' : 'auto',
        }}
      >
        {cardContent}
      </div>
    );
  }

  return cardContent;
}

    

    


