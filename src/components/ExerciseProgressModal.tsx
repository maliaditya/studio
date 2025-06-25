
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
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface ExerciseProgressModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  exercise: ExerciseDefinition | null;
  allWorkoutLogs: DatedWorkout[];
}

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
        if (ex.definitionId === exercise.id && ex.loggedSets.length > 0) {
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
        totalVolume: Math.round(metric.totalVolume), // Round to nearest integer
        sets: metric.sets,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
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

        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-4">
            {viewMode === 'table' ? (
              <>
                {tableData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No sets logged for this exercise yet.
                  </p>
                ) : (
                  <div className="border rounded-md">
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
                  </div>
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
                  <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
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
                        domain={['dataMin - 50', 'dataMax + 50']} // Adjust domain for volume
                        label={{ value: "Total Volume", angle: 90, position: "insideRight", offset: 10, style: { textAnchor: 'middle', fontSize: '0.8rem', fill: 'hsl(var(--muted-foreground))' } }}
                        stroke="var(--color-totalVolume)"
                      />
                       <RechartsTooltip
                        cursor={true}
                        content={<CustomChartTooltip />}
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
                        dataKey="totalVolume"
                        type="monotone"
                        stroke="var(--color-totalVolume)"
                        strokeWidth={2}
                        dot={{
                          fill: "var(--color-totalVolume)",
                          r: 4,
                        }}
                        activeDot={{
                          r: 6,
                        }}
                        name="totalVolume" // Name for tooltip
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
