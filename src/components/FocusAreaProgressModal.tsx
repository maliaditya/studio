
"use client";

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceDot, Legend } from 'recharts';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { ExerciseDefinition, DatedWorkout } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';

interface FocusAreaProgressModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  focusArea: ExerciseDefinition | null;
  deepWorkDefinitions: ExerciseDefinition[];
  upskillDefinitions: ExerciseDefinition[];
  allDeepWorkLogs: DatedWorkout[];
  allUpskillLogs: DatedWorkout[];
  avgDailyProductiveHours: number;
}

const chartConfig = {
  logged: { label: "Logged Hours", color: "hsl(var(--chart-1))" },
  estimated: { label: "Projected Hours", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export function FocusAreaProgressModal({
  isOpen,
  onOpenChange,
  focusArea,
  deepWorkDefinitions,
  upskillDefinitions,
  allDeepWorkLogs,
  allUpskillLogs,
  avgDailyProductiveHours,
}: FocusAreaProgressModalProps) {

  const graphData = useMemo(() => {
    if (!focusArea || !avgDailyProductiveHours) return { combinedData: [], milestones: [] };

    const allRelatedDefIds = new Set([focusArea.id, ...(focusArea.linkedDeepWorkIds || []), ...(focusArea.linkedUpskillIds || [])]);
    
    // Combine all logs and calculate daily logged minutes
    const dailyLoggedMinutes: Record<string, number> = {};
    [...allDeepWorkLogs, ...allUpskillLogs].forEach(log => {
        log.exercises.forEach(ex => {
            if (allRelatedDefIds.has(ex.definitionId)) {
                const minutes = ex.loggedSets.reduce((sum, set) => sum + (ex.category === 'Upskill' ? set.reps : set.weight), 0);
                dailyLoggedMinutes[log.date] = (dailyLoggedMinutes[log.date] || 0) + minutes;
            }
        });
    });

    const sortedLogDates = Object.keys(dailyLoggedMinutes).sort();
    if (sortedLogDates.length === 0) return { combinedData: [], milestones: [] };

    const startDate = parseISO(sortedLogDates[0]);
    const endDate = new Date();
    
    const combinedData: { date: string; logged?: number; estimated?: number }[] = [];
    let cumulativeLoggedHours = 0;
    
    // Generate data points for each day from start to today
    for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
      const dateKey = format(d, 'yyyy-MM-dd');
      cumulativeLoggedHours += (dailyLoggedMinutes[dateKey] || 0) / 60;
      
      const daysFromStart = differenceInDays(d, startDate);
      const estimatedHours = daysFromStart * avgDailyProductiveHours;

      combinedData.push({
        date: format(d, 'MMM dd'),
        logged: parseFloat(cumulativeLoggedHours.toFixed(2)),
        estimated: parseFloat(estimatedHours.toFixed(2)),
      });
    }

    // Milestone calculation
    const allRelatedDefs = [...deepWorkDefinitions, ...upskillDefinitions].filter(def => allRelatedDefIds.has(def.id));
    let cumulativeEstHoursForMilestones = 0;
    const milestones = allRelatedDefs
      .filter(d => d.estimatedHours)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(def => {
        cumulativeEstHoursForMilestones += def.estimatedHours!;
        const daysToMilestone = cumulativeEstHoursForMilestones / avgDailyProductiveHours;
        const milestoneDate = addDays(startDate, daysToMilestone);
        return {
          x: milestoneDate.getTime(),
          y: cumulativeEstHoursForMilestones,
          label: def.name,
        };
      });

    return { combinedData, milestones };

  }, [focusArea, deepWorkDefinitions, upskillDefinitions, allDeepWorkLogs, allUpskillLogs, avgDailyProductiveHours]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Progress Projection for: {focusArea?.name}</DialogTitle>
          <DialogDescription>
            Comparing your logged work against a projection based on your average daily productive hours.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow min-h-0 py-4">
            {graphData.combinedData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-full w-full">
                    <ResponsiveContainer>
                        <LineChart data={graphData.combinedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                            <RechartsTooltip 
                                content={({ active, payload, label }) => {
                                    if (active && payload?.length) {
                                        return (
                                            <div className="rounded-lg border bg-background p-2.5 shadow-sm">
                                                <p className="font-bold text-foreground">{label}</p>
                                                {payload.map(p => (
                                                    <p key={p.name} style={{ color: p.color }}>
                                                        {p.name}: {p.value?.toFixed(1)}h
                                                    </p>
                                                ))}
                                            </div>
                                        )
                                    }
                                    return null;
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="logged" stroke="var(--color-logged)" name="Logged" dot={false} strokeWidth={2} />
                            <Line type="monotone" dataKey="estimated" stroke="var(--color-estimated)" name="Projected" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                            
                            {graphData.milestones.map((dot, i) => (
                                <ReferenceDot key={i} x={dot.label} y={dot.y} r={5} fill="var(--color-estimated)" stroke="white" >
                                    <title>{dot.label}</title>
                                </ReferenceDot>
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Not enough data to create a projection chart. Log some time for this focus area.</p>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
