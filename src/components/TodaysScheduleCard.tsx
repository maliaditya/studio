
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType } from '@/types/workout';
import {
  Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, CheckCircle2, Circle, Grab, Dock, Move
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const activityIcons: Record<ActivityType, React.ReactNode> = {
  workout: <Dumbbell className="h-4 w-4" />,
  upskill: <BookOpenCheck className="h-4 w-4" />,
  deepwork: <Briefcase className="h-4 w-4" />,
  planning: <ClipboardList className="h-4 w-4" />,
  tracking: <ClipboardCheck className="h-4 w-4" />,
  branding: <Share2 className="h-4 w-4" />,
};

const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

interface TodaysScheduleCardProps {
  schedule: DailySchedule;
  activityDurations: Record<string, string>;
  isAgendaDocked: boolean;
  onToggleDock: () => void;
}

export function TodaysScheduleCard({ schedule, activityDurations, isAgendaDocked, onToggleDock }: TodaysScheduleCardProps) {
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
      const initialY = window.innerHeight - Math.min(window.innerHeight - 80, 600);
      setPosition({ x: 20, y: initialY });
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
        className={cn(!isAgendaDocked && "cursor-grab active:cursor-grabbing")}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <ClipboardList /> Today's Agenda
            </CardTitle>
            <CardDescription>A sequential view of your scheduled activities.</CardDescription>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={onToggleDock} className="h-8 w-8">
              {isAgendaDocked ? <Move className="h-4 w-4" /> : <Dock className="h-4 w-4" />}
            </Button>
            {!isAgendaDocked && <Grab className="text-muted-foreground ml-1" />}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {scheduledActivities.length > 0 ? (
          <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {scheduledActivities.map((activity) => {
              const duration = activityDurations[activity.id];
              return (
              <li key={activity.id} className="flex items-center justify-between gap-4 p-2 rounded-md bg-muted/50">
                <div className="flex items-center gap-3">
                  {activity.completed 
                    ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    : <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  }
                  <div className="flex-grow">
                    <p className={`font-medium ${activity.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {activity.details}
                    </p>
                    <Badge variant="outline" className="text-xs">{activity.slot}</Badge>
                  </div>
                </div>
                <div className="flex-shrink-0 text-muted-foreground text-right w-20">
                    {activityIcons[activity.type]}
                    {duration && <p className="text-xs font-semibold mt-1 whitespace-nowrap">{duration}</p>}
                </div>
              </li>
            )})}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>No activities scheduled for today.</p>
            <p className="text-xs">Add tasks to your time slots to see them here.</p>
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

