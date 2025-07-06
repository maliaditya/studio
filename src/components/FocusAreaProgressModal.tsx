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
    if (!focusArea || !avgDailyProductiveHours || avgDailyProductiveHours <= 0) {
      return { combinedData: [], milestones: [] };
    }

    const allRelatedDefIds = new Set([
      focusArea.id,
      ...(focusArea.linkedDeepWorkIds || []),
      ...(focusArea.linkedUpskillIds || []),
    ]);

    const dailyLoggedMinutes: Record<string, number> = {};
    const allLogs = [...allDeepWorkLogs, ...allUpskillLogs];
    let firstLogDateStr: string | null = null;

    allLogs.forEach(log => {
      let dailyMinutes = 0;
      log.exercises.forEach(ex => {
        if (allRelatedDefIds.has(ex.definitionId) && ex.loggedSets.length > 0) {
          // In upskill, `reps` is duration. In deepwork, `weight` is duration.
          const minutes = ex.loggedSets.reduce((sum, set) => sum + (ex.category === 'Upskill' ? set.reps : set.weight), 0);
          dailyMinutes += minutes;
        }
      });
      if (dailyMinutes > 0) {
        dailyLoggedMinutes[log.date] = (dailyLoggedMinutes[log.date] || 0) + dailyMinutes;
        if (!firstLogDateStr || log.date < firstLogDateStr) {
          firstLogDateStr = log.date;
        }
      }
    });

    if (!firstLogDateStr) return { combinedData: [], milestones: [] };

    const startDate = parseISO(firstLogDateStr);
    const endDate = new Date();
    
    const combinedData: { date: string; timestamp: number; logged?: number; estimated?: number }[] = [];
    let cumulativeLoggedHours = 0;

    // Milestone calculation
    const allMilestoneDefs = [
      focusArea,
      ...(focusArea.linkedDeepWorkIds || []).map(id => deepWorkDefinitions.find(def => def.id === id)),
      ...(focusArea.linkedUpskillIds || []).map(id => upskillDefinitions.find(def => def.id === id))
    ].filter((def): def is ExerciseDefinition => !!(def && def.estimatedHours && def.estimatedHours > 0));

    let cumulativeEstHoursForMilestones = 0;
    const milestones = allMilestoneDefs.map(def => {
      cumulativeEstHoursForMilestones += def.estimatedHours!;
      const daysToMilestone = cumulativeEstHoursForMilestones / avgDailyProductiveHours;
      const milestoneDate = addDays(startDate, Math.ceil(daysToMilestone));
      return {
        x: milestoneDate.getTime(),
        y: cumulativeEstHoursForMilestones,
        label: def.name,
      };
    });

    const totalEstimatedHours = cumulativeEstHoursForMilestones;
    const totalDaysToComplete = totalEstimatedHours > 0 ? totalEstimatedHours / avgDailyProductiveHours : 0;
    const lastProjectedDate = addDays(startDate, Math.ceil(totalDaysToComplete));
    const finalDate = endDate > lastProjectedDate ? endDate : lastProjectedDate;
    
    for (let d = new Date(startDate); d <= finalDate; d = addDays(d, 1)) {
        const dateKey = format(d, 'yyyy-MM-dd');
        
        if (d <= endDate) {
            cumulativeLoggedHours += (dailyLoggedMinutes[dateKey] || 0) / 60;
        }

        const daysFromStart = differenceInDays(d, startDate);
        const estimatedHours = daysFromStart * avgDailyProductiveHours;
        
        combinedData.push({
            date: format(d, 'MMM dd'),
            timestamp: d.getTime(),
            logged: (d <= endDate) ? parseFloat(cumulativeLoggedHours.toFixed(2)) : undefined,
            estimated: parseFloat(estimatedHours.toFixed(2)),
        });
    }

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
                            <XAxis 
                                dataKey="timestamp" 
                                type="number"
                                scale="time"
                                domain={['dataMin', 'dataMax']}
                                tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM dd')}
                            />
                            <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                            <RechartsTooltip 
                                content={({ active, payload, label }) => {
                                    if (active && payload?.length) {
                                        const dateLabel = format(new Date(label), 'PPP');
                                        return (
                                            <div className="rounded-lg border bg-background p-2.5 shadow-sm">
                                                <p className="font-bold text-foreground">{dateLabel}</p>
                                                {payload.map(p => (
                                                  p.value !== undefined && p.value !== null && (
                                                    <p key={p.name} style={{ color: p.color }}>
                                                        {p.name}: {p.value?.toFixed(1)}h
                                                    </p>
                                                  )
                                                ))}
                                            </div>
                                        )
                                    }
                                    return null;
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="logged" stroke="var(--color-logged)" name="Logged" dot={false} strokeWidth={2} connectNulls={false} />
                            <Line type="monotone" dataKey="estimated" stroke="var(--color-estimated)" name="Projected" strokeDasharray="5 5" dot={false} strokeWidth={2} />
                            
                            {graphData.milestones.map((dot, i) => (
                                <ReferenceDot key={i} x={dot.x} y={dot.y} r={5} fill="var(--color-estimated)" stroke="white" >
                                    <title>{dot.label}</title>
                                </ReferenceDot>
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Not enough data to create a projection chart. Log some time for this focus area and ensure it has an average daily productive hours value.</p>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
