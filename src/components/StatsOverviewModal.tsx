
"use client";

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area, Legend, ReferenceLine } from 'recharts';
import { format, parseISO, startOfISOWeek, setISOWeek, addWeeks } from 'date-fns';
import type { DatedWorkout, WeightLog } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';

interface StatsOverviewModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  allWorkoutLogs: DatedWorkout[];
  allUpskillLogs: DatedWorkout[];
  allDeepWorkLogs: DatedWorkout[];
  weightLogs: WeightLog[];
  goalWeight: number | null;
  consistencyData: { date: string; fullDate: string; score: number }[];
}

const totalProductivityChartConfig = {
    totalMinutes: { label: "Productive Time (min)", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const consistencyChartConfig = {
  score: { label: "Consistency", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const weightChartConfig = {
  historicalWeight: { label: "Weight (kg/lb)", color: "hsl(var(--chart-2))" },
  projectedWeight: { label: "Projection", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;


export function StatsOverviewModal({
  isOpen,
  onOpenChange,
  allWorkoutLogs,
  allUpskillLogs,
  allDeepWorkLogs,
  weightLogs,
  goalWeight,
  consistencyData,
}: StatsOverviewModalProps) {

  const productivityData = useMemo(() => {
    const dailyData: Record<string, { dateObj: Date, upskill: number, deepwork: number }> = {};
    
    allUpskillLogs.forEach(log => {
        const duration = log.exercises.reduce((sum, ex) => sum + ex.loggedSets.reduce((s, set) => s + set.reps, 0), 0);
        if (duration > 0) {
            if (!dailyData[log.date]) dailyData[log.date] = { dateObj: parseISO(log.date), upskill: 0, deepwork: 0 };
            dailyData[log.date].upskill += duration;
        }
    });

    allDeepWorkLogs.forEach(log => {
        const duration = log.exercises.reduce((sum, ex) => sum + ex.loggedSets.reduce((s, set) => s + set.weight, 0), 0);
        if (duration > 0) {
            if (!dailyData[log.date]) dailyData[log.date] = { dateObj: parseISO(log.date), upskill: 0, deepwork: 0 };
            dailyData[log.date].deepwork += duration;
        }
    });

    return Object.values(dailyData).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()).map(d => ({
        ...d,
        date: format(d.dateObj, 'MMM dd'),
        totalMinutes: d.upskill + d.deepwork,
    }));
  }, [allUpskillLogs, allDeepWorkLogs]);

  const combinedWeightData = useMemo(() => {
     const sortedLogs = weightLogs
    .map(log => {
        const [year, weekNum] = log.date.split('-W');
        const dateObj = startOfISOWeek(setISOWeek(new Date(parseInt(year), 0, 4), parseInt(weekNum)));
        return { ...log, dateObj, weight: log.weight, timestamp: dateObj.getTime() };
    })
    .sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());

    let allData = sortedLogs.map(log => ({
        ...log,
        historicalWeight: log.weight,
        projectedWeight: null,
        isProjection: false,
    }));

    if (!goalWeight || sortedLogs.length < 1) return allData;
    
    const lastLog = sortedLogs[sortedLogs.length - 1];
    const weightToChange = goalWeight - lastLog.weight;
    if (Math.abs(weightToChange) < 0.1) return allData;

    const changes = sortedLogs.map((log, index) => index > 0 ? log.weight - sortedLogs[index-1].weight : null).filter((c): c is number => c !== null);
    let averageWeeklyChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
    let projectionRate = averageWeeklyChange;
    if (weightToChange < 0) { if (projectionRate >= 0) projectionRate = -0.5; } 
    else { if (projectionRate <= 0) projectionRate = 0.25; }
    
    if (Math.abs(projectionRate) < 0.01) return allData;
    const weeksToGo = Math.ceil(Math.abs(weightToChange / projectionRate));
    if (weeksToGo <= 0) return allData;

    const lastLogIndex = allData.findIndex(d => d.timestamp === lastLog.timestamp);
    if (lastLogIndex !== -1) allData[lastLogIndex].projectedWeight = lastLog.weight;

    for (let i = 1; i <= weeksToGo; i++) {
        const projectedDate = addWeeks(lastLog.dateObj, i);
        allData.push({
            projectedWeight: lastLog.weight + (i * projectionRate),
            timestamp: projectedDate.getTime(),
            dateObj: projectedDate,
            isProjection: true,
            historicalWeight: null,
            weight: 0,
            date: ''
        });
    }
    
    if (allData.length > sortedLogs.length) {
      allData[allData.length - 1].projectedWeight = goalWeight;
    }

    return allData;
  }, [goalWeight, weightLogs]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Statistics Overview</DialogTitle>
          <DialogDescription>
            A graphical summary of your key metrics over time.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="productivity" className="w-full flex-grow min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="productivity">Productivity</TabsTrigger>
                <TabsTrigger value="consistency">Workout Consistency</TabsTrigger>
                <TabsTrigger value="weight">Weight Trend</TabsTrigger>
            </TabsList>

            <TabsContent value="productivity" className="flex-grow mt-4 min-h-0">
                <ScrollArea className="h-full pr-4">
                  {productivityData.length > 1 ? (
                    <ChartContainer config={totalProductivityChartConfig} className="min-h-[400px] w-full">
                       <AreaChart accessibilityLayer data={productivityData} margin={{ top: 10, right: 30, left: 0, bottom: 0, }}>
                            <defs>
                                <linearGradient id="fillTotalMinutesModal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-totalMinutes)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--color-totalMinutes)" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}/>
                             <RechartsTooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="grid min-w-[12rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                <div className="font-bold text-foreground">{format(data.dateObj, 'PPP')}</div>
                                                <div className="grid gap-1.5">
                                                    <div className="flex w-full items-center gap-2">
                                                        <div className="w-2.5 h-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                                                        <div className="flex flex-1 justify-between">
                                                            <span className="text-muted-foreground">Productive Time</span>
                                                            <span className="font-mono font-medium text-foreground">{data.totalMinutes} min</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend verticalAlign="top" height={36}/>
                            <Area type="monotone" dataKey="totalMinutes" fill="url(#fillTotalMinutesModal)" stroke="var(--color-totalMinutes)" strokeWidth={2} name="Productive Time (min)" />
                        </AreaChart>
                    </ChartContainer>
                  ) : <p className="text-center text-muted-foreground py-8">Not enough data to show productivity stats.</p> }
                </ScrollArea>
            </TabsContent>
            
            <TabsContent value="consistency" className="flex-grow mt-4 min-h-0">
                 <ScrollArea className="h-full pr-4">
                  {consistencyData.length > 0 ? (
                    <ChartContainer config={consistencyChartConfig} className="min-h-[400px] w-full">
                         <LineChart accessibilityLayer data={consistencyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value, index) => (index % 30 !== 0 ? '' : value.split(' ')[0])} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                            <RechartsTooltip cursor={true} content={({ active, payload }) => active && payload?.length ? (
                                <div className="rounded-lg border bg-background p-2.5 shadow-sm">
                                    <p className="font-bold">{payload[0].payload.fullDate}</p>
                                    <p>Consistency: {payload[0].value}%</p>
                                </div>
                            ) : null} />
                            <Line dataKey="score" type="monotone" stroke="var(--color-score)" strokeWidth={2} dot={false} name="Consistency" />
                        </LineChart>
                    </ChartContainer>
                  ) : <p className="text-center text-muted-foreground py-8">Not enough data for consistency graph.</p> }
                </ScrollArea>
            </TabsContent>

            <TabsContent value="weight" className="flex-grow mt-4 min-h-0">
                 <ScrollArea className="h-full pr-4">
                  {combinedWeightData.length > 1 ? (
                    <ChartContainer config={weightChartConfig} className="min-h-[400px] w-full">
                         <LineChart accessibilityLayer data={combinedWeightData} margin={{ top: 5, right: 20, left: 0, bottom: 5, }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM dd')} tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={['dataMin - 2', 'dataMax + 2']} />
                            <RechartsTooltip />
                            {goalWeight !== null && <ReferenceLine y={goalWeight} label={{ value: `Goal: ${goalWeight}`, position: 'insideTopRight' }} stroke="hsl(var(--primary))" strokeDasharray="4 4" />}
                            <Line dataKey="historicalWeight" type="monotone" stroke="var(--color-historicalWeight)" strokeWidth={2} dot={true} name="Weight" connectNulls={false} />
                            <Line dataKey="projectedWeight" type="monotone" stroke="var(--color-projectedWeight)" strokeDasharray="5 5" strokeWidth={2} dot={{r: 4}} name="Projection" connectNulls={false} />
                        </LineChart>
                    </ChartContainer>
                  ) : <p className="text-center text-muted-foreground py-8">Not enough data for weight graph.</p> }
                </ScrollArea>
            </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
