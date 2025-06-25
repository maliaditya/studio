
"use client";

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WorkoutExercise, DatedWorkout, LoggedSet } from '@/types/workout';
import { Dumbbell, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { LineChart as LineChartIcon, TableIcon } from 'lucide-react';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { format, parseISO } from 'date-fns';

const chartConfig = {
  maxWeight: {
    label: "Max Weight (kg/lb)",
    color: "hsl(var(--primary))",
  },
  totalVolume: {
    label: "Total Volume (kg/lb)",
    color: "hsl(var(--accent))",
  }
} satisfies ChartConfig;

const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload; // The full data point for the hovered item
        
        return (
            <div className="grid min-w-[12rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                {/* Date */}
                <div className="font-medium text-foreground">{data.fullDate}</div>
                
                {/* Main metrics (Max Weight, Total Volume) */}
                <div className="grid gap-1.5">
                    {payload.map((p: any, index: number) => {
                         const configItem = chartConfig[p.name as keyof typeof chartConfig];
                         return (
                            <div key={index} className="flex w-full items-center gap-2">
                                 <div
                                    className="w-2.5 h-2.5 shrink-0 rounded-[2px]"
                                    style={{ backgroundColor: configItem?.color }}
                                />
                                <div className="flex flex-1 justify-between">
                                    <span className="text-muted-foreground">{configItem?.label}</span>
                                    <span className="font-mono font-medium text-foreground">{p.value.toLocaleString()}</span>
                                </div>
                            </div>
                         )
                    })}
                </div>
                
                {/* Sets List */}
                {data.sets && data.sets.length > 0 && (
                     <div className="mt-2 pt-2 border-t">
                        <p className="font-medium text-foreground mb-1">Sets Logged:</p>
                        <ul className="space-y-1">
                            {data.sets.slice().sort((a: LoggedSet, b: LoggedSet) => a.timestamp - b.timestamp).map((set: LoggedSet, index: number) => (
                                <li key={index} className="flex justify-between text-muted-foreground">
                                   <span>Set {index + 1}:</span> 
                                   <span className="font-mono font-medium">{set.reps}r x {set.weight}kg/lb</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        )
    }
    return null;
}

const ProgressPopover = ({ exercise, allWorkoutLogs }: { exercise: WorkoutExercise, allWorkoutLogs: DatedWorkout[] }) => {
  const graphData = useMemo(() => {
    if (!exercise) return [];

    const dailyMetrics: Record<string, { 
      dateObj: Date; 
      maxWeight: number; 
      totalVolume: number;
      sets: LoggedSet[];
    }> = {};

    allWorkoutLogs.forEach((datedLog) => {
      const dateKey = datedLog.date; // yyyy-MM-dd
      datedLog.exercises.forEach((ex) => {
        if (ex.definitionId === exercise.definitionId && ex.loggedSets.length > 0) {
          if (!dailyMetrics[dateKey]) {
            dailyMetrics[dateKey] = {
              dateObj: parseISO(datedLog.date),
              maxWeight: 0,
              totalVolume: 0,
              sets: [],
            };
          }

          ex.loggedSets.forEach((set) => {
            dailyMetrics[dateKey].totalVolume += set.reps * set.weight;
            if (set.weight > dailyMetrics[dateKey].maxWeight) {
              dailyMetrics[dateKey].maxWeight = set.weight;
            }
            dailyMetrics[dateKey].sets.push(set);
          });
        }
      });
    });

    return Object.values(dailyMetrics)
      .map((metric) => ({
        date: format(metric.dateObj, "MMM dd"),
        fullDate: format(metric.dateObj, "PPP"),
        timestamp: metric.dateObj.getTime(),
        maxWeight: metric.maxWeight,
        totalVolume: Math.round(metric.totalVolume),
        sets: metric.sets,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [exercise, allWorkoutLogs]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <TrendingUp className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] sm:w-[500px]">
          <p className="font-semibold text-sm mb-4">{exercise.name} Progress</p>
          {graphData.length < 2 ? (
            <div className="flex justify-center items-center h-[200px]">
                <p className="text-center text-muted-foreground text-sm">
                    Need at least two workouts to draw a graph.
                </p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                <LineChart
                    accessibilityLayer
                    data={graphData}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.slice(0, 6)}
                    />
                    <YAxis
                        yAxisId="left"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        domain={['dataMin - 5', 'dataMax + 5']}
                        stroke="var(--color-maxWeight)"
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        domain={['dataMin - 50', 'dataMax + 50']}
                        stroke="var(--color-totalVolume)"
                    />
                    <RechartsTooltip
                        cursor={true}
                        content={<CustomChartTooltip />}
                    />
                    <Line yAxisId="left" dataKey="maxWeight" type="monotone" stroke="var(--color-maxWeight)" strokeWidth={2} dot={{ r: 4 }} name="maxWeight" />
                    <Line yAxisId="right" dataKey="totalVolume" type="monotone" stroke="var(--color-totalVolume)" strokeWidth={2} dot={{ r: 4 }} name="totalVolume" />
                </LineChart>
            </ChartContainer>
          )}
      </PopoverContent>
    </Popover>
  );
};


interface TodaysWorkoutModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  todaysExercises: WorkoutExercise[];
  muscleGroupsForDay: string[];
  allWorkoutLogs: DatedWorkout[];
}

export function TodaysWorkoutModal({
  isOpen,
  onOpenChange,
  todaysExercises,
  muscleGroupsForDay,
  allWorkoutLogs,
}: TodaysWorkoutModalProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Today's Focus: {muscleGroupsForDay.join(' & ') || 'Rest Day'}
          </DialogTitle>
          <DialogDescription>
            Here are the exercises planned for your workout session today. Click the trend icon to see your progress.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-6">
            {todaysExercises.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exercise</TableHead>
                    <TableHead className="text-right">Last Workout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaysExercises.map((exercise) => (
                    <TableRow key={exercise.id}>
                      <TableCell>
                          <p className="font-medium">{exercise.name}</p>
                          <p className="text-xs text-muted-foreground">{exercise.category}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                            {exercise.lastPerformance ? (
                            <div>
                                <p className="font-semibold">{exercise.lastPerformance.weight} kg/lb &times; {exercise.lastPerformance.reps} reps</p>
                                <p className="text-xs text-muted-foreground">Top Set</p>
                            </div>
                            ) : (
                            <p className="text-xs text-muted-foreground">No history</p>
                            )}
                            <ProgressPopover exercise={exercise} allWorkoutLogs={allWorkoutLogs} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                <Dumbbell className="h-12 w-12 mb-4" />
                <p className="font-semibold">It's a rest day!</p>
                <p className="text-sm">No workout is scheduled for today.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
