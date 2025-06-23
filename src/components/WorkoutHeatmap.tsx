
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { subYears, format, addDays, parse } from 'date-fns';
import type { DatedWorkout, WeightLog } from '@/types/workout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { LineChart as LineChartIcon, Calendar as CalendarIcon, Weight as WeightIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ChartContainer, ChartConfig } from './ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';

interface WorkoutHeatmapProps {
  allWorkoutLogs: DatedWorkout[];
  onDateSelect: (date: Date) => void;
  weightLogs: WeightLog[];
  onLogWeight: (weight: number) => void;
  selectedDate: Date;
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

const weightChartConfig = {
  weight: {
    label: "Weight (kg/lb)",
    color: "hsl(var(--chart-2))",
  }
} satisfies ChartConfig;

export function WorkoutHeatmap({ allWorkoutLogs, onDateSelect, weightLogs, onLogWeight, selectedDate }: WorkoutHeatmapProps) {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [view, setView] = useState<'heatmap' | 'graph' | 'weight'>('heatmap');
  const [newWeight, setNewWeight] = useState('');
  
  const [today, setToday] = useState<Date | null>(null);
  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);

  useEffect(() => {
    // This now only runs on the client, preventing hydration mismatches
    const now = new Date();
    setToday(now);
    setOneYearAgo(subYears(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1));
  }, []);

  const heatmapValues: HeatmapValue[] = useMemo(() => allWorkoutLogs
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
    }), [allWorkoutLogs]);

    const consistencyData = useMemo(() => {
        if (!allWorkoutLogs || !oneYearAgo || !today) return [];
    
        const workoutDates = new Set(
          allWorkoutLogs
            .filter(log => log.exercises.some(ex => ex.loggedSets.length > 0))
            .map(log => log.date)
        );
    
        const data = [];
        let score = 0.5; // Start at 50% probability
    
        for (let d = new Date(oneYearAgo); d <= today; d = addDays(d, 1)) {
            const dateKey = format(d, 'yyyy-MM-dd');
            
            if (workoutDates.has(dateKey)) {
                score += (1 - score) * 0.1;
            } else {
                score *= 0.95;
            }
    
            data.push({
                date: format(d, 'MMM dd'),
                fullDate: format(d, 'PPP'),
                score: Math.round(score * 100),
            });
        }
    
        return data;
    }, [allWorkoutLogs, oneYearAgo, today]);

    const weightChartData = useMemo(() => {
      return weightLogs.map(log => {
          const weekNum = log.date.split('-W')[1];
          return {
              week: `W${weekNum}`,
              weight: log.weight,
              fullWeek: log.date
          }
      });
    }, [weightLogs]);

    const handleLogWeightClick = () => {
      const weightValue = parseFloat(newWeight);
      if (!isNaN(weightValue) && weightValue > 0) {
        onLogWeight(weightValue);
        setNewWeight('');
      }
    };

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
                    <p className="font-bold text-base">{format(parse(value.date, 'yyyy-MM-dd', new Date()), 'PPP')}</p>
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
              <CardTitle>Workout Activity</CardTitle>
              <CardDescription>
                {view === 'heatmap' && "Your workout consistency over the last year. Click a square to view that day's log."}
                {view === 'graph' && 'Your probability of working out, based on recent consistency.'}
                {view === 'weight' && 'Your weekly body weight trend.'}
              </CardDescription>
            </div>
             <div className='flex items-center gap-2'>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-[200px] justify-start text-left font-normal h-10",!selectedDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && onDateSelect(date)} initialFocus />
                    </PopoverContent>
                </Popover>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setView(v => v === 'graph' ? 'heatmap' : 'graph')}
                                className="flex-shrink-0"
                            >
                                {view === 'heatmap' || view === 'weight' ? <LineChartIcon className="h-4 w-4" /> : <CalendarIcon className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{view === 'graph' ? 'Show Heatmap' : 'Show Consistency Graph'}</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setView(v => v === 'weight' ? 'heatmap' : 'weight')}
                                className="flex-shrink-0"
                            >
                                <WeightIcon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{view === 'weight' ? 'Show Heatmap' : 'Show Weight Tracker'}</p>
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
                              // Manually parse to avoid timezone issues with `new Date('YYYY-MM-DD')`
                              const [year, month, day] = value.date.split('-').map(Number);
                              onDateSelect(new Date(year, month - 1, day));
                          }
                        }}
                        showMonthLabels={true}
                        showWeekdayLabels={true}
                    />
                </div>
            ) : view === 'graph' ? (
                <>
                {consistencyData.length > 0 ? (
                    <ChartContainer config={consistencyChartConfig} className="min-h-[250px] w-full pr-4">
                        <LineChart accessibilityLayer data={consistencyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value, index) => {
                                    if (index % 30 !== 0) return '';
                                    return value.split(' ')[0]; // Show only month name
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
            ) : (
                 <>
                    {weightChartData.length > 1 ? (
                        <ChartContainer config={weightChartConfig} className="min-h-[250px] w-full pr-4">
                            <LineChart accessibilityLayer data={weightChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={8} domain={['dataMin - 2', 'dataMax + 2']} />
                                <RechartsTooltip
                                    cursor={true}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="rounded-lg border bg-background p-2.5 shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.7rem] uppercase text-muted-foreground">
                                                            {data.fullWeek}
                                                        </span>
                                                        <span className="font-bold text-foreground">
                                                            {data.weight} kg/lb
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Line yAxisId="left" dataKey="weight" type="monotone" stroke="var(--color-weight)" strokeWidth={2} dot={true} />
                            </LineChart>
                        </ChartContainer>
                    ) : (
                        <div className="flex justify-center items-center min-h-[250px]">
                        <p className="text-center text-muted-foreground">
                            Not enough data for a weight chart. Log your weight for at least two weeks.
                        </p>
                        </div>
                    )}
                    <div className="flex gap-2 items-center mt-4 pt-4 border-t">
                        <Input
                            type="number"
                            placeholder="Enter current weight (kg/lb)"
                            value={newWeight}
                            onChange={(e) => setNewWeight(e.target.value)}
                            className="h-9"
                        />
                        <Button onClick={handleLogWeightClick} disabled={!newWeight} className="h-9">
                            Log Weight
                        </Button>
                    </div>
                </>
            )}
        </CardContent>
      </Card>
      {view === 'heatmap' && <CustomTooltip />}
    </>
  );
}
