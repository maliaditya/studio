
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType, FullSchedule, SubTask, MetaRule, SlotName, RecurrenceRule } from '@/types/workout';
import {
  CheckCircle2, Circle, Grab, Dock, Move, Save, History, PlusCircle, BrainCircuit, Timer, GitBranch, Focus, Repeat, Link as LinkIcon, Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, MoreVertical, Brain, Wind, Moon, Sunrise, Sun, CloudSun, Sunset, MoonStar, ChevronLeft, Trash2
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSeparator, DropdownMenuSubContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { AgendaWidgetItem } from './TimeSlots';

const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

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
  const { currentUser, carryForwardTask, dailyPurposes, setDailyPurposes, settings, setSettings, habitCards, toggleRoutine, handleLinkHabit, onRemoveActivity } = useAuth();
  const dayKey = React.useMemo(() => format(date, 'yyyy-MM-dd'), [date]);
  
  const [purposeText, setPurposeText] = useState('');
  const [purposePopoverOpen, setPurposePopoverOpen] = useState(false);

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

    if (settings.agendaShowCurrentSlotOnly) {
        allActivities = allActivities.filter(activity => activity.slot === currentSlot);
    }
    
    return allActivities.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot);
    });
  }, [todaysSchedule, settings.agendaShowCurrentSlotOnly, currentSlot]);

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
                <CardTitle className="flex items-center gap-2 text-base text-primary">Todo</CardTitle>
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettings(prev => ({...prev, agendaShowCurrentSlotOnly: !prev.agendaShowCurrentSlotOnly}))}>
                        <Focus className={cn("h-4 w-4", settings.agendaShowCurrentSlotOnly ? "text-primary" : "text-muted-foreground")} />
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
                        onToggleComplete={onToggleComplete}
                        onActivityClick={() => {}}
                        linkedHabit={habitCards.find(h => activity.habitEquationIds?.includes(h.id))}
                        onLinkHabit={(habitId) => handleLinkHabit(activity.id, habitId, date)}
                        setRoutine={toggleRoutine}
                        onOpenHabitPopup={onOpenHabitPopup}
                        onRemoveActivity={onRemoveActivity}
                        context="agenda"
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
    

    

    