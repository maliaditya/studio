
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType } from '@/types/workout';
import {
  Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, CheckCircle2, Circle, Grab, Dock, Move, Save
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';

const activityIcons: Record<ActivityType, React.ReactNode> = {
  workout: <Dumbbell className="h-4 w-4" />,
  upskill: <BookOpenCheck className="h-4 w-4" />,
  deepwork: <Briefcase className="h-4 w-4" />,
  planning: <ClipboardList className="h-4 w-4" />,
  tracking: <ClipboardCheck className="h-4 w-4" />,
  branding: <Share2 className="h-4 w-4" />,
};

const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

interface AgendaWidgetItemProps {
  activity: Activity & { slot: keyof DailySchedule };
  duration: string | undefined;
  onToggleComplete: (slotName: string, activityId: string) => void;
  onLogLearning: (activity: Activity, progress: number, duration: number) => void;
}

function AgendaWidgetItem({ activity, duration, onToggleComplete, onLogLearning }: AgendaWidgetItemProps) {
  const [openPopover, setOpenPopover] = useState(false);
  const [progressInput, setProgressInput] = useState('');
  const [durationInput, setDurationInput] = useState('');

  const canLogProgress = (activity.type === 'upskill' || activity.type === 'deepwork') && (activity.taskIds?.length ?? 0) > 0;

  const handleItemClick = () => {
    if (activity.completed) {
      onToggleComplete(activity.slot, activity.id); // Allow un-checking
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
        onToggleComplete(activity.slot, activity.id);
        setOpenPopover(false);
        setProgressInput('');
        setDurationInput('');
      }
    } else { // deepwork
      if(!isNaN(duration) && duration > 0) {
        onLogLearning(activity, 0, duration);
        onToggleComplete(activity.slot, activity.id);
        setOpenPopover(false);
        setDurationInput('');
      }
    }
  };

  const itemContent = (
    <div className="flex items-center justify-between gap-4 p-2 rounded-md bg-muted/50 w-full" onClick={handleItemClick}>
      <div className="flex items-center gap-3">
        {activity.completed 
          ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          : <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        }
        <div className="flex-grow min-w-0">
          <p className={`font-medium truncate ${activity.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`} title={activity.details}>
            {activity.details}
          </p>
          <Badge variant="outline" className="text-xs">{activity.slot}</Badge>
        </div>
      </div>
      <div className="flex-shrink-0 text-muted-foreground text-right w-20">
          {activityIcons[activity.type]}
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
  schedule: DailySchedule;
  activityDurations: Record<string, string>;
  isAgendaDocked: boolean;
  onToggleDock: () => void;
  onToggleComplete: (slotName: string, activityId: string) => void;
  onLogLearning: (activity: Activity, progress: number, duration: number) => void;
}

export function TodaysScheduleCard({ 
  schedule, 
  activityDurations, 
  isAgendaDocked, 
  onToggleDock,
  onToggleComplete,
  onLogLearning,
}: TodaysScheduleCardProps) {
  const scheduledActivities = React.useMemo(() => {
    return slotOrder.flatMap(slot => {
      const activities = schedule[slot];
      if (activities && activities.length > 0) {
        return activities.map(activity => ({ slot, ...activity }));
      }
      return [];
    });
  }, [schedule]);

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
    if ((e.target as HTMLElement).closest('button') || isAgendaDocked) return;
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
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <ClipboardList className="h-5 w-5" /> Today's Agenda
            </CardTitle>
            {isAgendaDocked && <CardDescription className="text-xs mt-1">A sequential view of your scheduled activities.</CardDescription>}
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={onToggleDock} className="h-8 w-8">
              {isAgendaDocked ? <Move className="h-4 w-4" /> : <Dock className="h-4 w-4" />}
            </Button>
            {!isAgendaDocked && <Grab className="text-muted-foreground ml-1 h-4 w-4" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {scheduledActivities.length > 0 ? (
          isAgendaDocked ? (
            // DOCKED VIEW
            <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {scheduledActivities.map((activity) => (
                <AgendaWidgetItem
                  key={activity.id}
                  activity={activity}
                  duration={activityDurations[activity.id]}
                  onToggleComplete={onToggleComplete}
                  onLogLearning={onLogLearning}
                />
              ))}
            </ul>
          ) : (
            // WIDGET VIEW
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {scheduledActivities.map((activity) => {
                const duration = activityDurations[activity.id];
                return (
                  <li key={activity.id} className="flex items-center justify-between gap-4 text-sm cursor-pointer" onClick={() => {
                    if (activity.completed) {
                      onToggleComplete(activity.slot, activity.id);
                    } else if(activity.type === 'upskill' || activity.type === 'deepwork') {
                      // Logic to open popover will go here for the widget view
                    } else {
                      onToggleComplete(activity.slot, activity.id);
                    }
                  }}>
                    <div className="flex items-center gap-2 min-w-0">
                       {activity.completed 
                        ? <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        : <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      }
                      <p className={`truncate ${activity.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`} title={activity.details}>
                        {activity.details}
                      </p>
                    </div>
                    {duration && <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">{duration}</span>}
                  </li>
                )
              })}
            </ul>
          )
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
        <Card className="shadow-2xl bg-background/80 backdrop-blur-sm">
          <CardHeader
            className="p-3 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <ClipboardList className="h-5 w-5" /> Today's Agenda
              </CardTitle>
              <div className="flex items-center">
                <Button variant="ghost" size="icon" onClick={onToggleDock} className="h-8 w-8">
                  <Dock className="h-4 w-4" />
                </Button>
                <Grab className="text-muted-foreground ml-1 h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            {scheduledActivities.length > 0 ? (
                <ul className="space-y-1 max-h-80 overflow-y-auto pr-2">
                  {scheduledActivities.map((activity) => (
                    <AgendaWidgetItem
                      key={activity.id}
                      activity={activity}
                      duration={activityDurations[activity.id]}
                      onToggleComplete={onToggleComplete}
                      onLogLearning={onLogLearning}
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
      </div>
    );
  }

  return cardContent;
}
