
"use client";

import React, { useState } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { subYears, format, parseISO } from 'date-fns';
import type { DatedWorkout } from '@/types/workout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WorkoutHeatmapProps {
  allWorkoutLogs: DatedWorkout[];
  onDateSelect: (date: Date) => void;
}

interface HeatmapValue {
    date: string;
    count: number;
    exercises: string;
}

interface TooltipData {
    value: HeatmapValue;
    x: number;
    y: number;
}

const today = new Date();
const oneYearAgo = subYears(new Date(today.getFullYear(), today.getMonth(), today.getDate()), 1);

export function WorkoutHeatmap({ allWorkoutLogs, onDateSelect }: WorkoutHeatmapProps) {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

  const heatmapValues: HeatmapValue[] = allWorkoutLogs
    .filter(log => log.exercises.some(ex => ex.loggedSets.length > 0))
    .map(log => {
      const totalSets = log.exercises.reduce((sum, ex) => sum + ex.loggedSets.length, 0);
      const exercisesPerformed = log.exercises
        .filter(ex => ex.loggedSets.length > 0)
        .map(ex => ex.name)
        .slice(0, 3) // Limit for tooltip brevity
        .join(', ');
        
      return {
        date: log.date, // 'yyyy-MM-dd'
        count: totalSets,
        exercises: exercisesPerformed,
      };
    });

    const CustomTooltip = () => {
        if (!tooltipData) return null;
        const { value, x, y } = tooltipData;

        const style: React.CSSProperties = {
            position: 'fixed',
            left: `${x + 15}px`,
            top: `${y + 15}px`,
            pointerEvents: 'none',
        };
        
        return (
            <div style={style} className={cn("z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95")}>
                 <div className="text-center">
                    <p className="font-bold text-base">{format(parseISO(value.date), 'PPP')}</p>
                    <p className="text-sm">{value.count} sets logged</p>
                    {value.exercises && (
                        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground max-w-xs">
                            <p>{value.exercises}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

  return (
    <>
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
                onMouseOver={(event, value) => {
                    if (value && value.date && value.count > 0) {
                        setTooltipData({ value: value as HeatmapValue, x: event.clientX, y: event.clientY });
                    }
                }}
                onMouseOut={() => {
                    setTooltipData(null);
                }}
                onClick={(value) => {
                  if (value && value.date) {
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
      <CustomTooltip />
    </>
  );
}
