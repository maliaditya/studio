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
import type { ExerciseDefinition, DatedWorkout, LoggedSet, TopicGoal } from '@/types/workout';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { LineChart as LineChartIcon, TableIcon, ZoomOut, Check } from 'lucide-react';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine, Legend, Brush } from 'recharts';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface ExerciseProgressModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  exercise: ExerciseDefinition | null;
  allWorkoutLogs: DatedWorkout[];
  topicGoals?: Record<string, TopicGoal>;
  pageType?: 'workout' | 'upskill' | 'deepwork';
}

const workoutChartConfig = {
  maxWeight: { label: "Max Weight (kg/lb)", color: "hsl(var(--primary))" },
  totalVolume: { label: "Total Volume (kg/lb)", color: "hsl(var(--accent))" }
} satisfies ChartConfig;

const deepworkChartConfig = {
  maxWeight: { label: "Max Duration (min)", color: "hsl(var(--primary))" },
  totalVolume: { label: "Total Duration (min)", color: "hsl(var(--accent))" }
} satisfies ChartConfig;

const upskillChartConfig = {
  historicalProgress: { label: "Progress", color: "hsl(var(--primary))" },
  projectedProgress: { label: "Projection", color: "hsl(var(--primary))" }
} satisfies ChartConfig;

const CustomChartTooltip = ({ active, payload, pageType, goalType }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        
        if (pageType === 'upskill') {
          const value = data.historicalProgress ?? data.projectedProgress;
          if (data.isProjection) {
            return (
              <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[14rem]">
                <div className="grid gap-1.5">
                    <div className="flex flex-col">
                        <span className="text-[0.7rem] uppercase text-muted-foreground">Projected Progress</span>
                        <span className="font-bold text-foreground">{value.toLocaleString()} {goalType}</span>
                    </div>
                    <div className="flex flex-col border-t pt-1.5 mt-1.5">
                        <span className="text-[0.7rem] uppercase text-muted-foreground">Est. Date</span>
                        <span className="font-bold text-foreground">{format(data.dateObj, 'PPP')} ({data.daysRemaining} days remaining)</span>
                    </div>
                    <div className="flex flex-col border-t pt-1.5 mt-1.5">
                        <span className="text-[0.7rem] uppercase text-muted-foreground">
                            Required Rate
                        </span>
                        <span className="font-bold text-foreground">
                            {data.averageRatePerDay.toFixed(1)} {goalType}/day
                        </span>
                    </div>
                </div>
              </div>
            )
          }
          return (
             <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[12rem]">
                <div className="grid gap-1.5">
                    <div className="flex flex-col">
                        <span className="text-[0.7rem] uppercase text-muted-foreground">{format(data.dateObj, 'PPP')}</span>
                        <span className="font-bold text-foreground">{value.toLocaleString()} {goalType}</span>
                    </div>
                    {data.dailyProgress > 0 && (
                        <div className="flex flex-col border-t pt-1.5 mt-1.5">
                            <span className="text-[0.7rem] uppercase text-muted-foreground">Daily Change</span>
                            <span className="font-bold text-green-500">+{data.dailyProgress.toLocaleString()} {goalType}</span>
                        </div>
                    )}
                </div>
            </div>
          )
        }
        
        // Fallback for workout/deepwork
        return (
            <div className="grid min-w-[12rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                <div className="font-medium text-foreground">{data.fullDate}</div>
                <div className="grid gap-1.5">
                    {payload.map((p: any, index: number) => {
                         const config = pageType === 'deepwork' ? deepworkChartConfig : workoutChartConfig;
                         const configItem = config[p.name as keyof typeof config];
                         return (
                            <div key={index} className="flex w-full items-center gap-2">
                                 <div className="w-2.5 h-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: configItem?.color }} />
                                <div className="flex flex-1 justify-between">
                                    <span className="text-muted-foreground">{configItem?.label}</span>
                                    <span className="font-mono font-medium text-foreground">{p.value.toLocaleString()}</span>
                                </div>
                            </div>
                         )
                    })}
                </div>
                 <div className="mt-2 pt-2 border-t">
                    <p className="font-medium text-foreground mb-1">
                      {pageType === 'workout' ? 'Sets Logged:' : 'Sessions Logged:'}
                    </p>
                    <ul className="space-y-1">
                        {data.sets.slice().sort((a: LoggedSet, b: LoggedSet) => a.timestamp - b.timestamp).map((set: LoggedSet, index: number) => (
                            <li key={index} className="flex justify-between text-muted-foreground">
                               <span>{pageType === 'workout' ? `Set ${index + 1}` : `Session ${index + 1}`}:</span> 
                               <span className="font-mono font-medium">{pageType === 'workout' ? `${set.reps}r x ${set.weight}kg/lb` : `${set.weight} min`}</span>
                            </li>
                        ))}
                    </ul>
                </div>
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
  topicGoals,
  pageType = 'workout'
}: ExerciseProgressModalProps) {
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');
  const [chartKey, setChartKey] = useState(Date.now());
  const [brushIndex, setBrushIndex] = useState<{ startIndex?: number; endIndex?: number }>({});

  const tableData = useMemo(() => {
    if (!exercise) return [];
    const groupedEntries: Record<string, { originalDate: Date; sets: LoggedSet[] }> = {};
    allWorkoutLogs.forEach(datedLog => {
      datedLog.exercises.forEach(ex => {
        if (ex.definitionId === exercise.id && ex.loggedSets.length > 0) {
          const dateKey = format(parseISO(datedLog.date), 'PPP');
          if (!groupedEntries[dateKey]) {
            groupedEntries[dateKey] = { originalDate: parseISO(datedLog.date), sets: [] };
          }
          const sortedSets = [...ex.loggedSets].sort((a, b) => a.timestamp - b.timestamp);
          groupedEntries[dateKey].sets.push(...sortedSets);
        }
      });
    });
    return Object.entries(groupedEntries)
      .map(([date, data]) => ({ date, originalDate: data.originalDate, sets: data.sets }))
      .sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
  }, [exercise, allWorkoutLogs]);

  const defaultGraphData = useMemo(() => {
    if (!exercise || pageType === 'upskill') return [];
    const dailyMetrics: Record<string, { dateObj: Date; maxWeight: number; totalVolume: number; sets: LoggedSet[]; }> = {};
    allWorkoutLogs.forEach((datedLog) => {
      const dateKey = datedLog.date;
      datedLog.exercises.forEach((ex) => {
        if (ex.definitionId === exercise.id && ex.loggedSets.length > 0) {
          if (!dailyMetrics[dateKey]) {
            dailyMetrics[dateKey] = { dateObj: parseISO(datedLog.date), maxWeight: 0, totalVolume: 0, sets: [] };
          }
          ex.loggedSets.forEach((set) => {
            const setVolume = pageType === 'workout' ? (set.reps || 0) * (set.weight || 0) : (set.weight || 0);
            dailyMetrics[dateKey].totalVolume += setVolume;
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
  }, [exercise, allWorkoutLogs, pageType]);

  const upskillData = useMemo(() => {
    if (!exercise || !topicGoals || pageType !== 'upskill') return null;

    const topic = exercise.category;
    const topicGoal = topicGoals[topic];
    if (!topicGoal) return null;

    const allLogsForTopic = allWorkoutLogs
      .flatMap(datedLog => datedLog.exercises
        .filter(ex => ex.category === topic && ex.loggedSets.length > 0)
        .flatMap(ex => ex.loggedSets.map(set => ({ date: datedLog.date, progress: set.weight })))
      );
    
    if (allLogsForTopic.length === 0) return { graphData: [], summary: null };

    const dailyDataMap = new Map<string, number>();
    allLogsForTopic.forEach(log => {
      dailyDataMap.set(log.date, (dailyDataMap.get(log.date) || 0) + log.progress);
    });

    const uniqueDailyData = Array.from(dailyDataMap.entries())
      .map(([date, dailyProgress]) => ({ date, dailyProgress, dateObj: parseISO(date) }))
      .sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());

    let cumulativeProgress = 0;
    const graphData = uniqueDailyData.map(d => {
      cumulativeProgress += d.dailyProgress;
      return {
        date: format(d.dateObj, "MMM dd"),
        fullDate: format(d.dateObj, "PPP"),
        timestamp: d.dateObj.getTime(),
        cumulativeProgress: cumulativeProgress,
        dailyProgress: d.dailyProgress,
        dateObj: d.dateObj,
      };
    });

    const lastDataPoint = graphData[graphData.length - 1];
    if (!lastDataPoint) return { graphData: [], summary: null };
    
    const totalProgress = lastDataPoint.cumulativeProgress;

    const firstDataPoint = graphData[0];
    const durationInDays = differenceInDays(new Date(), firstDataPoint.dateObj) + 1;
    const averageRatePerDay = totalProgress / durationInDays;

    let summary: any = { totalProgress, averageRatePerDay };

    if (totalProgress < topicGoal.goalValue && averageRatePerDay > 0) {
      const remainingProgress = topicGoal.goalValue - totalProgress;
      const daysToCompletion = Math.ceil(remainingProgress / averageRatePerDay);
      const projectedDate = addDays(new Date(), daysToCompletion);
      
      summary.projectedDate = format(projectedDate, 'PPP');
      summary.daysToCompletion = daysToCompletion;

      summary.milestones = [0.25, 0.5, 0.75, 1.0].map(percent => {
            const milestoneValue = topicGoal.goalValue * percent;
            if (totalProgress >= milestoneValue) {
                return {
                    percent: Math.round(percent * 100),
                    value: Math.round(milestoneValue),
                    date: 'Reached',
                    daysRemaining: 0,
                    isReached: true,
                    progressNeeded: 0,
                };
            }
            const progressToMilestone = milestoneValue - totalProgress;
            const daysToMilestone = Math.ceil(progressToMilestone / averageRatePerDay);
            const estimatedMilestoneDate = addDays(new Date(), daysToMilestone);

            return {
                percent: Math.round(percent * 100),
                value: Math.round(milestoneValue),
                date: format(estimatedMilestoneDate, 'PPP'),
                daysRemaining: daysToMilestone,
                isReached: false,
                progressNeeded: Math.round(progressToMilestone),
            };
        });
    }

    return { graphData, summary };
  }, [exercise, allWorkoutLogs, pageType, topicGoals]);

  const combinedUpskillData = useMemo(() => {
    if (!upskillData || !upskillData.graphData || !upskillData.summary) return [];

    let allData = upskillData.graphData.map(d => ({
        ...d,
        historicalProgress: d.cumulativeProgress,
        projectedProgress: null,
        isProjection: false,
    }));
    
    const { summary, graphData } = upskillData;
    const { totalProgress, averageRatePerDay, daysToCompletion } = summary;
    const topicGoal = topicGoals && exercise ? topicGoals[exercise.category] : null;

    if (!topicGoal || totalProgress >= topicGoal.goalValue || averageRatePerDay <= 0 || !daysToCompletion) {
        return allData;
    }

    const lastDataPoint = graphData[graphData.length - 1];
    if (!lastDataPoint) return allData;

    // Connect the last historical point to the start of the projection
    const lastHistoricalDataPointInCombined = allData.find(d => d.timestamp === lastDataPoint.timestamp);
    if(lastHistoricalDataPointInCombined) {
        lastHistoricalDataPointInCombined.projectedProgress = lastHistoricalDataPointInCombined.historicalProgress;
    }

    const today = new Date();
    // Add projection points. Let's add one point per day for the projection.
    for (let i = 1; i <= daysToCompletion; i++) {
        const projectedDate = addDays(today, i);
        const projectedProgress = totalProgress + (i * averageRatePerDay);
        const daysRemaining = daysToCompletion - i;
        
        allData.push({
            date: format(projectedDate, "MMM dd"),
            fullDate: format(projectedDate, "PPP"),
            timestamp: projectedDate.getTime(),
            dateObj: projectedDate,
            historicalProgress: null,
            projectedProgress: parseFloat(projectedProgress.toFixed(1)),
            isProjection: true,
            daysRemaining: daysRemaining,
            averageRatePerDay: averageRatePerDay,
            dailyProgress: 0,
        });
    }
    
    // Ensure the very last point is exactly the goal value
    const lastPoint = allData[allData.length - 1];
    if (lastPoint && lastPoint.isProjection) {
        lastPoint.projectedProgress = topicGoal.goalValue;
    }

    return allData;
  }, [upskillData, topicGoals, exercise]);

  const isZoomed = useMemo(() => {
    const data = pageType === 'upskill' ? combinedUpskillData : defaultGraphData;
    if (data.length <= 1) return false;
    const { startIndex, endIndex } = brushIndex;
    return (
      startIndex !== undefined &&
      endIndex !== undefined &&
      (startIndex !== 0 || endIndex !== data.length - 1)
    );
  }, [brushIndex, combinedUpskillData, defaultGraphData, pageType]);

  const handleResetZoom = () => {
    setBrushIndex({});
    setChartKey(Date.now());
  };

  if (!exercise) return null;

  const topicGoal = pageType === 'upskill' && topicGoals ? topicGoals[exercise.category] : null;

  const renderContent = () => {
    if (viewMode === 'table') {
      return (
        <>
        {tableData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No sessions logged for this task yet.</p>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Date</TableHead>
                  <TableHead>{pageType === 'workout' ? 'Sets Details (Reps x Weight)' : 'Session Details'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((entry) => (
                  <TableRow key={entry.date}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>
                      {entry.sets.map((set) => (
                        <span key={set.id} className="mr-2 inline-block bg-muted/50 px-1.5 py-0.5 rounded text-xs">
                           {
                            pageType === 'workout' ? `${set.reps}r x ${set.weight}kg/lb` :
                            pageType === 'upskill' ? `${set.weight} ${topicGoal?.goalType || 'units'} in ${set.reps} min` :
                            `${set.weight} min`
                          }
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
      )
    }

    if (pageType === 'upskill' && upskillData) {
      if (upskillData.graphData.length < 2) {
        return <p className="text-center text-muted-foreground py-8">Need at least two log entries for this topic to draw a graph.</p>;
      }
      return (
        <div className='space-y-4'>
          {upskillData.summary && topicGoal && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-muted/50 rounded-md">
                  <div className="text-muted-foreground">Progress</div>
                  <div className="font-bold text-base">{upskillData.summary.totalProgress.toLocaleString()} / {topicGoal.goalValue?.toLocaleString()}</div>
                </div>
                 <div className="p-2 bg-muted/50 rounded-md">
                  <div className="text-muted-foreground">Avg. Daily Rate</div>
                  <div className="font-bold text-base">{upskillData.summary.averageRatePerDay?.toFixed(1) || '-'} {topicGoal.goalType}/day</div>
                </div>
                 <div className="p-2 bg-muted/50 rounded-md">
                  <div className="text-muted-foreground">Est. Completion</div>
                  <div className="font-bold text-base">{upskillData.summary.projectedDate || 'N/A'}</div>
                </div>
                 <div className="p-2 bg-muted/50 rounded-md">
                  <div className="text-muted-foreground">Days Remaining</div>
                  <div className="font-bold text-base">{upskillData.summary.daysToCompletion || '-'}</div>
                </div>
              </div>

              {upskillData.summary.milestones && (
                <div className="pt-4">
                  <h4 className="text-sm font-semibold mb-2">Milestone Projections</h4>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Milestone</TableHead>
                          <TableHead>Goal ({topicGoal.goalType})</TableHead>
                          <TableHead>Needed</TableHead>
                          <TableHead>Est. Date</TableHead>
                          <TableHead className="text-right">Days Left</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upskillData.summary.milestones.map((m: any) => (
                          <TableRow key={m.percent} className={m.isReached ? 'opacity-60' : ''}>
                            <TableCell className="font-medium">{m.percent}%</TableCell>
                            <TableCell>{m.value.toLocaleString()}</TableCell>
                            <TableCell>{m.isReached ? '-' : m.progressNeeded.toLocaleString()}</TableCell>
                            <TableCell>{m.date}</TableCell>
                            <TableCell className="text-right">{m.isReached ? <Check className="h-4 w-4 text-green-500 ml-auto" /> : m.daysRemaining}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
          <ChartContainer config={upskillChartConfig} key={chartKey} className="min-h-[400px] w-full">
            <LineChart accessibilityLayer data={combinedUpskillData} margin={{ top: 5, right: 40, left: 10, bottom: 40 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM dd')} tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={['auto', 'dataMax + 10']} label={{ value: `Cumulative ${topicGoal?.goalType}`, angle: -90, position: "insideLeft", offset: -0, style: { textAnchor: 'middle', fontSize: '0.8rem', fill: 'hsl(var(--muted-foreground))' } }} />
              <RechartsTooltip cursor={true} content={<CustomChartTooltip pageType={pageType} goalType={topicGoal?.goalType} />} />
              {topicGoal && (
                  <>
                      <ReferenceLine y={topicGoal.goalValue} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "Goal", position: 'insideTopRight' }} />
                      {[0.25, 0.5, 0.75].map(fraction => {
                          const milestoneValue = Math.round(topicGoal.goalValue * fraction);
                          if (milestoneValue > 0 && milestoneValue < topicGoal.goalValue) {
                              return (
                                  <ReferenceLine 
                                      key={fraction}
                                      y={milestoneValue} 
                                      stroke="hsl(var(--muted-foreground))" 
                                      strokeOpacity={0.6}
                                      strokeDasharray="2 6" 
                                      label={{ 
                                          value: `${fraction * 100}%`, 
                                          position: 'insideTopRight', 
                                          fill: 'hsl(var(--muted-foreground))', 
                                          fontSize: 10,
                                          opacity: 0.8
                                      }} 
                                  />
                              );
                          }
                          return null;
                      })}
                  </>
              )}
              <Line dataKey="historicalProgress" type="monotone" stroke="var(--color-historicalProgress)" strokeWidth={2} dot={{ r: 4 }} name="historicalProgress" connectNulls={false} />
              <Line dataKey="projectedProgress" type="monotone" stroke="var(--color-projectedProgress)" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 4 }} name="projectedProgress" connectNulls={false} />
               <Brush 
                  dataKey="timestamp" 
                  height={40} 
                  stroke="hsl(var(--primary))" 
                  tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM dd')}
                  travellerWidth={15}
                  onChange={(e) => setBrushIndex({startIndex: e.startIndex, endIndex: e.endIndex})}
              />
            </LineChart>
          </ChartContainer>
        </div>
      );
    }
    
    // Default chart for workout/deepwork
    if (defaultGraphData.length < 2) {
      return <p className="text-center text-muted-foreground py-8">Need at least two sessions on different days to draw a graph.</p>;
    }
    const chartConfig = pageType === 'deepwork' ? deepworkChartConfig : workoutChartConfig;
    const yAxisLabel = pageType === 'deepwork' ? "Max Duration" : "Max Weight";
    const yAxisLabel2 = pageType === 'deepwork' ? "Total Duration" : "Total Volume";
    return (
      <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
        <LineChart accessibilityLayer data={defaultGraphData} margin={{ top: 5, right: 40, left: 10, bottom: 5, }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.slice(0, 6)} />
          <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={8} domain={['dataMin - 5', 'dataMax + 5']} label={{ value: yAxisLabel, angle: -90, position: "insideLeft", offset: -0, style: { textAnchor: 'middle', fontSize: '0.8rem', fill: 'hsl(var(--muted-foreground))' } }} stroke="var(--color-maxWeight)" />
          <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickMargin={8} domain={['dataMin - 50', 'dataMax + 50']} label={{ value: yAxisLabel2, angle: 90, position: "insideRight", offset: 10, style: { textAnchor: 'middle', fontSize: '0.8rem', fill: 'hsl(var(--muted-foreground))' } }} stroke="var(--color-totalVolume)" />
          <RechartsTooltip cursor={true} content={<CustomChartTooltip pageType={pageType} />} />
          <Line yAxisId="left" dataKey="maxWeight" type="monotone" stroke="var(--color-maxWeight)" strokeWidth={2} dot={{ fill: "var(--color-maxWeight)", r: 4, }} activeDot={{ r: 6, }} name="maxWeight" />
          <Line yAxisId="right" dataKey="totalVolume" type="monotone" stroke="var(--color-totalVolume)" strokeWidth={2} dot={{ fill: "var(--color-totalVolume)", r: 4, }} activeDot={{ r: 6, }} name="totalVolume" />
        </LineChart>
      </ChartContainer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-3xl lg:max-w-4xl max-h-[85dvh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div className='flex-grow'>
              <DialogTitle>Progress for: {pageType === 'upskill' ? exercise.category : exercise.name}</DialogTitle>
              <DialogDescription>
                {pageType === 'workout' 
                ? "Showing history for this exercise. Toggle between table and graph view."
                : pageType === 'upskill' && topicGoal
                ? `Showing cumulative progress for the topic "${exercise.category}" towards your goal of ${topicGoal.goalValue} ${topicGoal.goalType}.`
                : "Showing history for this task. Toggle between table and graph view."
                }
              </DialogDescription>
            </div>
            {viewMode === 'graph' && isZoomed && (
                <Button variant="outline" size="sm" onClick={handleResetZoom} className="flex-shrink-0">
                    <ZoomOut className="mr-2 h-4 w-4" />
                    Reset Zoom
                </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'table' ? 'graph' : 'table')} className="w-32">
            {viewMode === 'table' ? (<><LineChartIcon className="mr-2 h-4 w-4" /> Graph View</>) : (<><TableIcon className="mr-2 h-4 w-4" /> Table View</>)}
          </Button>
        </div>

        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-4">
            {renderContent()}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
