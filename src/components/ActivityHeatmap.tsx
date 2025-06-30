
"use client";

import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { subYears, format, parseISO } from 'date-fns';
import type { FullSchedule, Activity } from '@/types/workout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ActivityHeatmapProps {
  schedule: FullSchedule;
  onDateSelect: (date: string) => void;
}

interface HeatmapValue {
    date: string;
    count: number;
    activities: string;
}

export function ActivityHeatmap({ schedule, onDateSelect }: ActivityHeatmapProps) {
  const today = new Date();
  const oneYearAgo = subYears(today, 1);

  const heatmapValues: HeatmapValue[] = React.useMemo(() => Object.entries(schedule)
    .map(([date, dailySchedule]) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

      const completedActivities = Object.values(dailySchedule) // Gets Activity[][]
        .flat() // Gets Activity[]
        .filter(activity => activity && activity.completed);
      
      if (completedActivities.length === 0) {
        return null;
      }

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
    })
    .filter((value): value is HeatmapValue => value !== null), // filter out nulls
  [schedule]);
    
  return (
    <Card className="mt-8 max-w-5xl mx-auto shadow-lg border-0 bg-transparent">
        <CardHeader>
            <CardTitle>Activity Heatmap</CardTitle>
            <CardDescription>Your consistency over the last year. Click a square to view or schedule tasks for that day.</CardDescription>
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
                    onClick={(value) => {
                        if (value && value.date) {
                            onDateSelect(value.date);
                        }
                    }}
                    transformDayElement={(element, value, index) => {
                        const date = value?.date || format(new Date(oneYearAgo.getTime() + index * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

                        if (!value || value.count === 0) {
                           return (
                                <Tooltip key={index}>
                                    <TooltipTrigger asChild onClick={() => onDateSelect(date)}>
                                      {React.cloneElement(element, { 'aria-label': `Schedule tasks for ${format(parseISO(date), 'PPP')}`})}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{format(parseISO(date), 'PPP')}: No completed tasks</p>
                                    </TooltipContent>
                                </Tooltip>
                            );
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
