
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType } from '@/types/workout';
import {
  Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, CheckCircle2, Circle
} from 'lucide-react';
import { Badge } from './ui/badge';

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
}

export function TodaysScheduleCard({ schedule, activityDurations }: TodaysScheduleCardProps) {
  const scheduledActivities = React.useMemo(() => {
    return slotOrder.flatMap(slot => {
      const activities = schedule[slot];
      if (activities && activities.length > 0) {
        return activities.map(activity => ({ slot, ...activity }));
      }
      return [];
    });
  }, [schedule]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-primary">
          <ClipboardList /> Today's Agenda
        </CardTitle>
        <CardDescription>A sequential view of your scheduled activities for the day.</CardDescription>
      </CardHeader>
      <CardContent>
        {scheduledActivities.length > 0 ? (
          <ul className="space-y-3">
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
}
