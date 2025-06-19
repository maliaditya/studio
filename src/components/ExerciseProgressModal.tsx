
"use client";

import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { ExerciseDefinition, DatedWorkout, LoggedSet } from '@/types/workout';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { LineChart as LineChartIcon, TableIcon } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface ExerciseProgressModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  exercise: ExerciseDefinition | null;
  allWorkoutLogs: DatedWorkout[];
}

interface ChartDataPoint {
  date: string; // Formatted for X-axis display e.g., "MMM dd"
  fullDate: string; // For tooltip
  timestamp: number; // For sorting
  maxWeight: number;
  repsAtMaxWeight: number;
}

const chartConfig = {
  maxWeight: {
    label: "Max Weight",
    color: "hsl(var(--primary))",
  },
  repsAtMaxWeight: {
    label: "Reps at Max Weight",
    color: "hsl(var(--accent))",
  }
} satisfies ChartConfig;

export function ExerciseProgressModal({
  isOpen,
  onOpenChange,
  exercise,
  allWorkoutLogs,
}: ExerciseProgressModalProps) {
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');

  const tableData = useMemo(() => {
    if (!exercise) return [];

    const groupedEntries: Record<string, { originalDate: Date; sets: LoggedSet[] }> = {};

    allWorkoutLogs.forEach(datedLog => {
      datedLog.exercises.forEach(ex => {
        if (ex.definitionId === exercise.id && ex.loggedSets.length > 0) {
          const dateKey = format(parseISO(datedLog.date), 'PPP');
          if (!groupedEntries[dateKey]) {
            groupedEntries[dateKey] = {
              originalDate: parseISO(datedLog.date),
              sets: []
            };
          }
          const sortedSets = [...ex.loggedSets].sort((a, b) => a.timestamp - b.timestamp);
          groupedEntries[dateKey].sets.push(...sortedSets);
        }
      });
    });

    return Object.entries(groupedEntries)
      .map(([date, data]) => ({
        date,
        originalDate: data.originalDate,
        sets: data.sets,
      }))
      .sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
  }, [exercise, allWorkoutLogs]);

  const graphData = useMemo((): ChartDataPoint[] => {
    if (!exercise) return [];
    
    const dailyMetrics: Record<string, { dateObj: Date; maxWeight: number; repsAtMaxWeight: number }> = {};

    allWorkoutLogs.forEach(datedLog => {
      const dateKey = datedLog.date; // yyyy-MM-dd
      datedLog.exercises.forEach(ex => {
        if (ex.definitionId === exercise.id) {
          ex.loggedSets.forEach(set => {
            if (!dailyMetrics[dateKey]) {
              dailyMetrics[dateKey] = { 
                dateObj: parseISO(datedLog.date), 
                maxWeight: 0, 
                repsAtMaxWeight: 0 
              };
            }
            
            const currentEntry = dailyMetrics[dateKey];
            if (set.weight > currentEntry.maxWeight) {
              currentEntry.maxWeight = set.weight;
              currentEntry.repsAtMaxWeight = set.reps;
            } else if (set.weight === currentEntry.maxWeight) {
              if (set.reps > currentEntry.repsAtMaxWeight) {
                currentEntry.repsAtMaxWeight = set.reps;
              }
            }
          });
        }
      });
    });
    
    return Object.values(dailyMetrics)
      .filter(metric => metric.maxWeight > 0) // Only include days where the exercise was actually done
      .map(metric => ({
        date: format(metric.dateObj, 'MMM dd'),
        fullDate: format(metric.dateObj, 'PPP'),
        timestamp: metric.dateObj.getTime(),
        maxWeight: metric.maxWeight,
        repsAtMaxWeight: metric.repsAtMaxWeight,
      }))
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by date ascending for the chart
  }, [exercise, allWorkoutLogs]);

  if (!exercise) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-3xl lg:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Progress for: {exercise.name}</DialogTitle>
          <DialogDescription>
            Showing history for this exercise. Toggle between table and graph view.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'table' ? 'graph' : 'table')}
            className="w-32"
          >
            {viewMode === 'table' ? (
              <>
                <LineChartIcon className="mr-2 h-4 w-4" /> Graph View
              </>
            ) : (
              <>
                <TableIcon className="mr-2 h-4 w-4" /> Table View
              </>
            )}
          </Button>
        </div>

        {viewMode === 'table' ? (
          <>
            {tableData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No sets logged for this exercise yet.
              </p>
            ) : (
              <ScrollArea className="flex-grow border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Date</TableHead>
                      <TableHead>Sets Details (Reps x Weight)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((entry) => (
                      <TableRow key={entry.date}>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell>
                          {entry.sets.map((set, idx) => (
                            <span key={set.id} className="mr-2 inline-block bg-muted/50 px-1.5 py-0.5 rounded text-xs">
                              {set.reps}r x {set.weight}kg/lb
                              {idx < entry.sets.length -1 ? "" : ""}
                            </span>
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </>
        ) : (
          <>
            {graphData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                    No data available to display graph. Log some sets!
                </p>
            ) : graphData.length < 2 ? (
                 <p className="text-center text-muted-foreground py-8">
                    Need at least two data points (workouts on different days) to draw a graph.
                </p>
            ): (
              <ChartContainer config={chartConfig} className="min-h-[300px] w-full flex-grow">
                <LineChart
                  accessibilityLayer
                  data={graphData}
                  margin={{
                    top: 5,
                    right: 40, // Increased right margin for second Y-axis label
                    left: 10,
                    bottom: 5,
                  }}
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
                    label={{ value: "Max Weight (kg/lb)", angle: -90, position: "insideLeft", offset: -0, style: { textAnchor: 'middle', fontSize: '0.8rem', fill: 'hsl(var(--muted-foreground))' } }}
                    stroke="var(--color-maxWeight)"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    domain={['dataMin - 2', 'dataMax + 2']} // Adjust domain for reps
                    label={{ value: "Reps", angle: 90, position: "insideRight", offset: 10, style: { textAnchor: 'middle', fontSize: '0.8rem', fill: 'hsl(var(--muted-foreground))' } }}
                    stroke="var(--color-repsAtMaxWeight)"
                  />
                   <RechartsTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        labelFormatter={(value, payload) => {
                           if (payload && payload.length > 0 && payload[0].payload.fullDate) {
                             return payload[0].payload.fullDate;
                           }
                           return value;
                        }}
                        formatter={(value, name) => {
                          const configItem = chartConfig[name as keyof typeof chartConfig];
                          return (
                            <>
                              <div className="flex items-center">
                                <div
                                  className="w-2.5 h-2.5 rounded-full mr-2"
                                  style={{ backgroundColor: configItem?.color }}
                                />
                                <span>{configItem?.label}: {value}</span>
                              </div>
                            </>
                          );
                        }}
                      />
                    }
                  />
                  <Line
                    yAxisId="left"
                    dataKey="maxWeight"
                    type="monotone"
                    stroke="var(--color-maxWeight)"
                    strokeWidth={2}
                    dot={{
                      fill: "var(--color-maxWeight)",
                      r: 4,
                    }}
                    activeDot={{
                      r: 6,
                    }}
                    name="maxWeight" // Name for tooltip
                  />
                  <Line
                    yAxisId="right"
                    dataKey="repsAtMaxWeight"
                    type="monotone"
                    stroke="var(--color-repsAtMaxWeight)"
                    strokeWidth={2}
                    dot={{
                      fill: "var(--color-repsAtMaxWeight)",
                      r: 4,
                    }}
                    activeDot={{
                      r: 6,
                    }}
                    name="repsAtMaxWeight" // Name for tooltip
                  />
                </LineChart>
              </ChartContainer>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

