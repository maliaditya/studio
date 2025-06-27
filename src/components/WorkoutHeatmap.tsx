
"use client";

import React, { useState, useMemo } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { addDays, format, parseISO } from 'date-fns';
import type { DatedWorkout } from '@/types/workout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { LineChart as LineChartIcon, Calendar as CalendarIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ChartContainer, ChartConfig } from './ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface WorkoutHeatmapProps {
  allWorkoutLogs: DatedWorkout[];
  onDateSelect: (dateString: string) => void;
  consistencyData: { date: string; fullDate: string; score: number }[];
  oneYearAgo: Date | null;
  today: Date | null;
  title?: string;
  description?: string;
  graphDescription?: string;
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

const consistencyChartConfig = {
  score: {
    label: "Consistency",
    color: "hsl(var(--primary))",
  }
} satisfies ChartConfig;


export function WorkoutHeatmap({ 
  allWorkoutLogs, 
  onDateSelect, 
  consistencyData,
  oneYearAgo,
  today,
  title = "Activity",
  description = "Your consistency over the last year. Click a square to view that day's log.",
  graphDescription = "Your probability of being active, based on recent consistency."
}: WorkoutHeatmapProps) {
  
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [view, setView] = useState<'heatmap' | 'graph'>('heatmap');

  const heatmapValues: HeatmapValue[] = useMemo(() => allWorkoutLogs
    .filter(log => log.exercises.some(ex => ex.loggedSets.length > 0))
    .map(log => {
      const totalSets = log.exercises.reduce((sum, ex) => sum + ex.loggedSets.length, 0);
      const exercisesPerformed = log.exercises
        .filter(ex => ex.loggedSets.length > 0)
        .map(ex => ex.name)
        .slice(0, 3) 
        .join(', ');
        
      return {
        date: log.date,
        count: totalSets,
        exercises: exercisesPerformed,
      };
    }), [allWorkoutLogs]);
    
    const CustomHeatmapTooltip = () => {
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
    
    if (!oneYearAgo || !today) {
        return (
          <Card className="shadow-xl rounded-xl overflow-hidden mb-8">
            <CardHeader>
              <CardTitle>Workout Activity</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[200px] w-full animate-pulse bg-muted rounded-md" />
            </CardContent>
          </Card>
        );
    }

  return (
    <>
      <Card className="shadow-xl rounded-xl overflow-hidden mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                {view === 'heatmap' && description}
                {view === 'graph' && graphDescription}
              </CardDescription>
            </div>
             <div className='flex items-center gap-2'>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setView(v => v === 'graph' ? 'heatmap' : 'graph')}
                                className="flex-shrink-0"
                            >
                                {view === 'heatmap' ? <LineChartIcon className="h-4 w-4" /> : <CalendarIcon className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{view === 'graph' ? 'Show Heatmap' : 'Show Consistency Graph'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
            {view === 'heatmap' ? (
                <div className="min-w-[720px] overflow-x-auto">
                    <CalendarHeatmap
                        startDate={oneYearAgo}
                        endDate={today}
                        values={heatmapValues}
                        classForValue={(value) => {
                        if (!value || value.count === 0) { return 'color-empty'; }
                        if (value.count > 15) return 'color-scale-4';
                        if (value.count > 10) return 'color-scale-3';
                        if (value.count > 5) return 'color-scale-2';
                        return 'color-scale-1';
                        }}
                        onMouseOver={(event, value) => {
                            if (value && value.date && value.count > 0) {
                                setTooltipData({ value: value as HeatmapValue, x: event.clientX, y: event.clientY });
                            } else {
                                setTooltipData(null);
                            }
                        }}
                        onMouseOut={() => {
                            setTooltipData(null);
                        }}
                        onClick={(value) => {
                          if (value && value.date) {
                              setTooltipData(null);
                              onDateSelect(value.date);
                          }
                        }}
                        showMonthLabels={true}
                        showWeekdayLabels={true}
                    />
                </div>
            ) : view === 'graph' ? (
                <>
                {consistencyData.length > 0 ? (
                    <ChartContainer config={consistencyChartConfig} className="min-h-[300px] w-full pr-4">
                        <LineChart accessibilityLayer data={consistencyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value, index) => {
                                    if (index % 30 !== 0) return '';
                                    return value.split(' ')[0]; 
                                }}
                            />
                            <YAxis 
                                tickLine={false} 
                                axisLine={false} 
                                tickMargin={8} 
                                domain={[0, 100]}
                                tickFormatter={(value) => `${value}%`}
                            />
                            <RechartsTooltip
                                cursor={true}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="rounded-lg border bg-background p-2.5 shadow-sm">
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.7rem] uppercase text-muted-foreground">
                                                            Date
                                                        </span>
                                                        <span className="font-bold text-foreground">
                                                            {data.fullDate}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col text-right">
                                                        <span className="text-[0.7rem] uppercase text-muted-foreground">
                                                            Consistency
                                                        </span>
                                                        <span className="font-bold text-foreground">
                                                            {data.score}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Line
                                dataKey="score"
                                type="monotone"
                                stroke="var(--color-score)"
                                strokeWidth={2}
                                dot={false}
                                name="Consistency"
                            />
                        </LineChart>
                    </ChartContainer>
                ) : (
                    <p className="text-center text-muted-foreground py-8">
                        Not enough data to calculate consistency. Log some workouts!
                    </p>
                )}
                </>
            ) : null}
        </CardContent>
      </Card>
      {view === 'heatmap' && <CustomHeatmapTooltip />}
    </>
  );
}
