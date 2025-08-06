

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType, FullSchedule } from '@/types/workout';
import {
  CheckCircle2, Circle, Grab, Dock, Move, Save, History, PlusCircle, BrainCircuit
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';

const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

interface AgendaWidgetItemProps {
  activity: Activity & { slot: keyof DailySchedule };
  duration: string | undefined;
  onLogLearning: (activity: Activity, progress: number, duration: number) => void;
  onStartWorkoutLog: (activity: Activity) => void;
  onToggleComplete: (slotName: string, activityId: string) => void;
  onStartLeadGenLog: (activity: Activity) => void;
}

function AgendaWidgetItem({ activity, duration, onLogLearning, onStartWorkoutLog, onToggleComplete, onStartLeadGenLog }: AgendaWidgetItemProps) {
  const [openPopover, setOpenPopover] = useState(false);
  const [progressInput, setProgressInput] = useState('');
  const [durationInput, setDurationInput] = useState('');

  const canLogProgress = (activity.type === 'upskill' || activity.type === 'deepwork') && (activity.taskIds?.length ?? 0) > 0;

  const handleItemClick = () => {
    if (activity.completed) {
      onToggleComplete(activity.slot, activity.id); // Allow un-checking
    } else if (activity.type === 'workout') {
        onStartWorkoutLog(activity);
    } else if (activity.type === 'lead-generation') {
        onStartLeadGenLog(activity);
    } else if (canLogProgress) {
      setOpenPopover(true);
    } else {
      onToggleComplete(activity.slot, activity.id);
    }
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const duration = parseInt(durationInput);

    if(activity.type === 'upskill') {
      const progress = parseInt(progressInput);
      if(!isNaN(progress) && !isNaN(duration) && progress > 0 && duration > 0) {
        onLogLearning(activity, progress, duration);
        // onToggleComplete is now called inside onLogLearning
        setOpenPopover(false);
        setProgressInput('');
        setDurationInput('');
      }
    } else { // deepwork or branding
      if(!isNaN(duration) && duration > 0) {
        onLogLearning(activity, 0, duration);
        // onToggleComplete is now called inside onLogLearning
        setOpenPopover(false);
        setDurationInput('');
      }
    }
  };

  const itemContent = (
    <div className="flex items-center justify-between gap-4 p-2 rounded-md bg-muted/50 w-full" onClick={handleItemClick}>
      <div className="flex items-center gap-3 min-w-0">
        {activity.completed 
          ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          : <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        }
        <div className="flex-grow min-w-0">
          <p className={`font-medium truncate ${activity.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`} title={activity.details}>
            {activity.details}
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 text-muted-foreground text-right">
          {duration && <p className="text-xs font-semibold mt-1 whitespace-nowrap">{duration}</p>}
      </div>
    </div>
  );
  
  if (canLogProgress && !activity.completed) {
    return (
      <Popover open={openPopover} onOpenChange={setOpenPopover}>
        <PopoverTrigger asChild>
          <li className="cursor-pointer">
            {itemContent}
          </li>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <form onSubmit={handleLogSubmit} className="space-y-4">
            <div className="space-y-1">
              <h4 className="font-medium leading-none text-sm">Log Progress</h4>
              <p className="text-sm text-muted-foreground">Log your session for '{activity.details}'.</p>
            </div>
            <div className="space-y-2">
              {activity.type === 'upskill' && (
                <div>
                  <Label htmlFor="progress">Progress (pages/units)</Label>
                  <Input id="progress" type="number" value={progressInput} onChange={e => setProgressInput(e.target.value)} className="h-8" />
                </div>
              )}
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input id="duration" type="number" value={durationInput} onChange={e => setDurationInput(e.target.value)} className="h-8" />
              </div>
            </div>
            <Button type="submit" size="sm" className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Log & Complete
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    );
  }

  return <li className="cursor-pointer">{itemContent}</li>;
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
  onToggleComplete: (slotName: string, activityId: string) => void;
}

const parseDurationToHours = (durationStr: string | undefined): number => {
    if (!durationStr) return 0;
    let totalHours = 0;
    
    const hourMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*h/);
    if (hourMatch) {
      totalHours += parseFloat(hourMatch[1]);
    }
  
    const minMatch = durationStr.match(/(\d+)\s*m/);
    if (minMatch) {
      totalHours += parseFloat(minMatch[1]) / 60;
    }
    
    // Handle case where it's just minutes as a number, e.g. "30"
    if (!hourMatch && !minMatch && /^\d+(\.\d+)?$/.test(durationStr)) {
        totalHours += parseFloat(durationStr) / 60;
    }
  
    return totalHours;
};

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
}: TodaysScheduleCardProps) {
  const { carryForwardTask, dailyPurposes, setDailyPurposes } = useAuth();
  const dayKey = React.useMemo(() => format(date, 'yyyy-MM-dd'), [date]);
  
  const [purposeText, setPurposeText] = useState(dailyPurposes[dayKey] || '');
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
    return slotOrder.flatMap(slot => {
      const activities = todaysSchedule[slot];
      if (activities && activities.length > 0) {
        return activities.map(activity => ({ slot, ...activity }));
      }
      return [];
    });
  }, [todaysSchedule]);

  const timeSummary = React.useMemo(() => {
    const dailyActivities = Object.values(todaysSchedule).flat();
    if (dailyActivities.length === 0) {
        return { completed: 0, total: 0 };
    }

    const totalScheduledHours = dailyActivities.reduce((sum, activity) => {
        const duration = activityDurations[activity.id];
        return sum + parseDurationToHours(duration);
    }, 0);

    const completedHours = dailyActivities
        .filter(activity => activity.completed)
        .reduce((sum, activity) => {
            const duration = activityDurations[activity.id];
            return sum + parseDurationToHours(duration);
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

  useEffect(() => {
    if (!isAgendaDocked) {
      const initialY = window.innerHeight - Math.min(window.innerHeight - 80, 450);
      const initialX = window.innerWidth - Math.min(window.innerWidth - 20, 340);
      setPosition({ x: initialX, y: initialY });
    }
  }, [isAgendaDocked]);

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
  }, [isDragging, dragStartOffset, isAgendaDocked]);
  
  const cardContent = (
    <Card className="shadow-2xl bg-background/80 backdrop-blur-sm">
      <CardHeader
        className={cn("p-3", !isAgendaDocked && "cursor-grab active:cursor-grabbing")}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                  Agenda
              </CardTitle>
              {timeSummary.total > 0 && (
                <span className="font-mono text-sm font-medium text-muted-foreground mr-4">
                  {timeSummary.completed.toFixed(1)} / {timeSummary.total.toFixed(1)}h
                </span>
              )}
            </div>
            {isAgendaDocked && (
                <div className="flex items-center gap-2 mt-1">
                    <Popover open={purposePopoverOpen} onOpenChange={setPurposePopoverOpen}>
                        <PopoverTrigger asChild>
                            <button className="flex items-center gap-2 text-left cursor-pointer group">
                                <BrainCircuit className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                <CardDescription className="text-xs group-hover:text-foreground transition-colors truncate" title={purposeText}>
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
            )}
          </div>
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
            {!isAgendaDocked && <Grab className="text-muted-foreground ml-1 h-4 w-4" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {scheduledActivities.length > 0 ? (
          <ul className="space-y-1 max-h-96 overflow-y-auto pr-2">
            {scheduledActivities.map((activity) => (
              <AgendaWidgetItem
                key={activity.id}
                activity={activity}
                duration={activityDurations[activity.id]}
                onLogLearning={onLogLearning}
                onStartWorkoutLog={onStartWorkoutLog}
                onToggleComplete={onToggleComplete}
                onStartLeadGenLog={onStartLeadGenLog}
              />
            ))}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No activities scheduled.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!isAgendaDocked) {
    return (
      <div
        className="fixed z-50 w-full max-w-xs"
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
