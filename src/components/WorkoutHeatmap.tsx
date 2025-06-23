
"use client";

import React from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { subYears, format, parseISO } from 'date-fns';
import type { DatedWorkout } from '@/types/workout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WorkoutHeatmapProps {
  allWorkoutLogs: DatedWorkout[];
  onDateSelect: (date: Date) => void;
}

const today = new Date();
// Ensure the start date is consistent for all users by setting time to 0
const oneYearAgo = subYears(new Date(today.getFullYear(), today.getMonth(), today.getDate()), 1);

export function WorkoutHeatmap({ allWorkoutLogs, onDateSelect }: WorkoutHeatmapProps) {
  const heatmapValues = allWorkoutLogs
    // Only include logs that have actual sets recorded
    .filter(log => log.exercises.some(ex => ex.loggedSets.length > 0))
    .map(log => {
      const totalSets = log.exercises.reduce((sum, ex) => sum + ex.loggedSets.length, 0);
      const exercisesPerformed = log.exercises
        .filter(ex => ex.loggedSets.length > 0)
        .map(ex => ex.name)
        .join(', ');
        
      return {
        date: log.date, // 'yyyy-MM-dd'
        count: totalSets,
        exercises: exercisesPerformed,
      };
    });

  return (
    <TooltipProvider>
      <Card className="shadow-xl rounded-xl overflow-hidden mb-8">
        <CardHeader>
          <CardTitle>Workout Activity</CardTitle>
          <CardDescription>Your workout consistency over the last year. Click a square to view that day's log.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 overflow-x-auto">
          <div className="min-w-[720px]">
            <CalendarHeatmap
                startDate={oneYearAgo}
                endDate={today}
                values={heatmapValues}
                classForValue={(value) => {
                  if (!value || value.count === 0) {
                    return 'color-empty';
                  }
                  if (value.count > 15) return 'color-scale-4';
                  if (value.count > 10) return 'color-scale-3';
                  if (value.count > 5) return 'color-scale-2';
                  return 'color-scale-1';
                }}
                transformDayElement={(element, value, index) => {
                  if (!value || value.count === 0) {
                    return React.cloneElement(element, { key: index });
                  }
                  return (
                    <Tooltip key={index} delayDuration={100}>
                      <TooltipTrigger asChild>{element}</TooltipTrigger>
                      <TooltipContent>
                        <div className="text-center">
                          <p className="font-bold text-base">{format(parseISO(value.date), 'PPP')}</p>
                          <p className="text-sm">{value.count} sets logged</p>
                          {value.exercises && (
                              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground max-w-xs">
                                  <p>{value.exercises}</p>
                              </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }}
                onClick={(value) => {
                  if (value && value.date) {
                      // Heatmap date might not have time, parseISO is robust.
                      // Create new Date object to avoid timezone issues with setSelectedDate.
                      const d = parseISO(value.date);
                      onDateSelect(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
                  }
                }}
                showMonthLabels={true}
                showWeekdayLabels={true}
              />
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
