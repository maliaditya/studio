
"use client";

import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { subYears, format, parseISO } from 'date-fns';
import type { FullSchedule } from '@/types/workout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityHeatmapProps {
  schedule: FullSchedule;
}

interface HeatmapValue {
    date: string;
    count: number;
    activities: string;
}

export function ActivityHeatmap({ schedule }: ActivityHeatmapProps) {
  const today = new Date();
  const oneYearAgo = subYears(today, 1);

  const heatmapValues: HeatmapValue[] = React.useMemo(() => Object.entries(schedule)
    .filter(([date, dailySchedule]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
      return Object.values(dailySchedule).some(activity => activity.completed);
    })
    .map(([date, dailySchedule]) => {
      const completedActivities = Object.values(dailySchedule).filter(activity => activity.completed);
      const count = completedActivities.length;
      const activities = completedActivities
        .map(a => a.details)
        .slice(0, 3)
        .join(', ');

      return {
        date,
        count,
        activities,
      };
    }), [schedule]);
    
  return (
    <Card className="mt-8 max-w-5xl mx-auto shadow-lg border-0 bg-transparent">
        <CardHeader>
            <CardTitle>Activity Heatmap</CardTitle>
            <CardDescription>Your consistency over the last year. More completed activities result in a darker square.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 overflow-x-auto">
             <TooltipProvider>
                <CalendarHeatmap
                    startDate={oneYearAgo}
                    endDate={today}
                    values={heatmapValues}
                    classForValue={(value) => {
                        if (!value || value.count === 0) { return 'color-empty'; }
                        if (value.count >= 4) return 'color-scale-4';
                        if (value.count >= 3) return 'color-scale-3';
                        if (value.count >= 2) return 'color-scale-2';
                        return 'color-scale-1';
                    }}
                    transformDayElement={(element, value, index) => {
                         if (!value || value.count === 0) {
                            return React.cloneElement(element, { key: index });
                        }
                        const tooltipText = `${format(parseISO(value.date), 'PPP')}: ${value.activities || `${value.count} task(s)`}`;
                        return (
                            <Tooltip key={index}>
                                <TooltipTrigger asChild>{element}</TooltipTrigger>
                                <TooltipContent>
                                    <p>{tooltipText}</p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    }}
                />
            </TooltipProvider>
        </CardContent>
    </Card>
  );
}
