
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType, FullSchedule, SubTask, MetaRule, SlotName, RecurrenceRule, ExerciseDefinition } from '@/types/workout';
import {
  Grab, Dock, Move, History, PlusCircle, BrainCircuit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { AgendaWidgetItem } from './AgendaWidgetItem';


const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

interface TodaysScheduleCardProps {
  date: Date;
  isAgendaDocked: boolean;
  onToggleDock: () => void;
  onOpenFocusModal: (activity: Activity, event: React.MouseEvent) => void;
  onOpenTaskContext: (activityId: string, event: React.MouseEvent) => void;
  onOpenHabitPopup: (habitId: string, event: React.MouseEvent) => void;
  currentSlot: string;
  schedule: FullSchedule;
  activityDurations: Record<string, string>;
}

export function TodaysScheduleCard({ 
  date,
  isAgendaDocked, 
  onToggleDock,
  onOpenFocusModal,
  onOpenTaskContext,
  onOpenHabitPopup,
  currentSlot,
  schedule,
  activityDurations,
}: TodaysScheduleCardProps) {
  const { 
    currentUser, 
    carryForwardTask, 
    settings, 
    setSettings,
    handleToggleComplete,
    toggleRoutine,
    setSchedule: setGlobalSchedule,
  } = useAuth();
  
  const [purposeText, setPurposeText] = useState(settings.currentPurpose || '');
  const [purposePopoverOpen, setPurposePopoverOpen] = useState(false);

  useEffect(() => {
    setPurposeText(settings.currentPurpose || '');
  }, [settings.currentPurpose]);

  const handleSavePurpose = () => {
    setSettings(prev => ({...prev, currentPurpose: purposeText}));
    setPurposePopoverOpen(false);
  };
  
  const dayKey = React.useMemo(() => format(date, 'yyyy-MM-dd'), [date]);
  
  const scheduledActivities = useMemo(() => {
    const todaysSchedule = schedule[dayKey] || {};
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
  }, [schedule, dayKey, settings.agendaShowCurrentSlotOnly, currentSlot]);


  const pendingTasks = React.useMemo(() => {
    const yesterday = addDays(date, -1);
    const yesterdayKey = format(yesterday, 'yyyy-MM-dd');
    const yesterdaysSchedule = schedule[yesterdayKey] || {};
    return Object.values(yesterdaysSchedule)
      .flat()
      .filter((activity): activity is Activity => !!activity && !activity.completed);
  }, [schedule, date]);

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

  const cardContent = (
    <Card className="shadow-2xl bg-background/80 backdrop-blur-sm">
        <CardHeader
            className={cn("p-3", !isAgendaDocked && "cursor-grab active:cursor-grabbing")}
            onMouseDown={handleMouseDown}
        >
            <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base text-primary">Todo</CardTitle>
                <div className="flex items-center">
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
                                            {slotOrder.map(slot => (
                                            <Button
                                                key={slot}
                                                variant="ghost"
                                                className="justify-start h-8 text-sm"
                                                onClick={() => {
                                                carryForwardTask(task, slot as string);
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
        <CardContent className="p-3">
            {scheduledActivities.length > 0 ? (
                <ul className="space-y-1 max-h-64 overflow-y-auto pr-2">
                    {scheduledActivities.map((activity) => (
                    <AgendaWidgetItem
                        key={activity.id}
                        activity={{...activity, slot: activity.slot as SlotName}}
                        date={date}
                        onToggleComplete={handleToggleComplete}
                        onActivityClick={onOpenFocusModal}
                        onRemoveActivity={onRemoveActivity}
                        onUpdateActivity={handleUpdateActivity}
                        setRoutine={toggleRoutine}
                        onOpenTaskContext={onOpenTaskContext}
                        onOpenHabitPopup={onOpenHabitPopup}
                        context="agenda"
                        loggedDuration={activityDurations[activity.id]}
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
