
"use client";

import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceDot, Legend, Brush } from 'recharts';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { ExerciseDefinition, DatedWorkout } from '@/types/workout';
import { Button } from './ui/button';
import { ZoomOut } from 'lucide-react';

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
  const [chartKey, setChartKey] = useState(Date.now());
  const [brushIndex, setBrushIndex] = useState<{ startIndex?: number; endIndex?: number }>({});

  const graphData = useMemo(() => {
    if (!focusArea || !avgDailyProductiveHours || avgDailyProductiveHours <= 0) {
      return { combinedData: [], milestones: [] };
    }

    const isParent = (focusArea.linkedDeepWorkIds?.length ?? 0) > 0 || (focusArea.linkedUpskillIds?.length ?? 0) > 0 || (focusArea.linkedResourceIds?.length ?? 0) > 0;
    
    const deepWorkIdsToSum = new Set<string>(focusArea.linkedDeepWorkIds || []);
    if (!isParent) {
        deepWorkIdsToSum.add(focusArea.id);
    }
    const upskillIdsToSum = new Set<string>(focusArea.linkedUpskillIds || []);

    const dailyLoggedMinutes: Record<string, number> = {};
    let firstLogDateStr: string | null = null;

    allDeepWorkLogs.forEach(log => {
        let dailyMinutes = 0;
        log.exercises.forEach(ex => {
            if (deepWorkIdsToSum.has(ex.definitionId)) {
                dailyMinutes += ex.loggedSets.reduce((sum, set) => sum + set.weight, 0);
            }
        });
        if (dailyMinutes > 0) {
            dailyLoggedMinutes[log.date] = (dailyLoggedMinutes[log.date] || 0) + dailyMinutes;
            if (!firstLogDateStr || log.date < firstLogDateStr) {
                firstLogDateStr = log.date;
            }
        }
    });
    
    allUpskillLogs.forEach(log => {
        let dailyMinutes = 0;
        log.exercises.forEach(ex => {
            if (upskillIdsToSum.has(ex.definitionId)) {
                dailyMinutes += ex.loggedSets.reduce((sum, set) => sum + set.reps, 0);
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

  const isZoomed = useMemo(() => {
    if (graphData.combinedData.length <= 1) return false;
    const { startIndex, endIndex } = brushIndex;
    return (
      startIndex !== undefined &&
      endIndex !== undefined &&
      (startIndex !== 0 || endIndex !== graphData.combinedData.length - 1)
    );
  }, [brushIndex, graphData.combinedData.length]);

  const handleResetZoom = () => {
    setBrushIndex({});
    setChartKey(Date.now());
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
           <div className="flex justify-between items-center">
             <div>
                <DialogTitle>Progress Projection for: {focusArea?.name}</DialogTitle>
                <DialogDescription>
                  Comparing your logged work against a projection. Drag on the timeline to zoom.
                </DialogDescription>
             </div>
             {isZoomed && (
                <Button variant="outline" size="sm" onClick={handleResetZoom} className="flex-shrink-0">
                    <ZoomOut className="mr-2 h-4 w-4" />
                    Reset Zoom
                </Button>
            )}
           </div>
        </DialogHeader>

        <div className="flex-grow min-h-0 py-4">
            {graphData.combinedData.length > 0 ? (
                <ChartContainer config={chartConfig} key={chartKey} className="h-full w-full">
                    <ResponsiveContainer>
                        <LineChart data={graphData.combinedData} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
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
                             <Brush 
                                dataKey="timestamp" 
                                height={40} 
                                stroke="hsl(var(--primary))" 
                                tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM dd')}
                                travellerWidth={15}
                                onChange={(e) => setBrushIndex({startIndex: e.startIndex, endIndex: e.endIndex})}
                            />
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
