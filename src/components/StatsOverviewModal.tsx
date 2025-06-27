
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area, Legend, ReferenceLine, Bar, BarChart, RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell } from 'recharts';
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
  totalHoursData: { name: string; hours: number }[];
  todayHoursData: { name: string; hours: number }[];
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

const learningChartConfig = {
    totalMinutes: { label: "Learning Time (min)", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const deepWorkChartConfig = {
    totalMinutes: { label: "Deep Work Time (min)", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

const totalHoursChartConfig = {
  hours: { label: "Hours", color: "hsl(var(--primary))" },
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
  totalHoursData,
  todayHoursData,
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
  
  const learningData = useMemo(() => {
    const dailyData: Record<string, { dateObj: Date, totalMinutes: number }> = {};
    allUpskillLogs.forEach(log => {
        const duration = log.exercises.reduce((sum, ex) => sum + ex.loggedSets.reduce((s, set) => s + set.reps, 0), 0);
        if (duration > 0) {
            if (!dailyData[log.date]) dailyData[log.date] = { dateObj: parseISO(log.date), totalMinutes: 0 };
            dailyData[log.date].totalMinutes += duration;
        }
    });
    return Object.values(dailyData).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()).map(d => ({
        ...d,
        date: format(d.dateObj, 'MMM dd'),
    }));
  }, [allUpskillLogs]);

  const deepWorkData = useMemo(() => {
    const dailyData: Record<string, { dateObj: Date, totalMinutes: number }> = {};
    allDeepWorkLogs.forEach(log => {
        const duration = log.exercises.reduce((sum, ex) => sum + ex.loggedSets.reduce((s, set) => s + set.weight, 0), 0);
        if (duration > 0) {
            if (!dailyData[log.date]) dailyData[log.date] = { dateObj: parseISO(log.date), totalMinutes: 0 };
            dailyData[log.date].totalMinutes += duration;
        }
    });
    return Object.values(dailyData).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()).map(d => ({
        ...d,
        date: format(d.dateObj, 'MMM dd'),
    }));
  }, [allDeepWorkLogs]);

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

  const radarData = useMemo(() => {
    const idealHours: Record<string, number> = {
      'Deep Work': 6,
      'Learning': 3,
      'Workout': 1,
      'Branding': 2,
    };

    const todayMap = new Map(todayHoursData.map(d => [d.name, d.hours]));

    return Object.keys(idealHours).map(subject => ({
      subject,
      today: todayMap.get(subject) || 0,
      ideal: idealHours[subject],
    }));
  }, [todayHoursData]);

  const renderProductivityTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="grid min-w-[12rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                <div className="font-bold text-foreground">{format(data.dateObj, 'PPP')}</div>
                <div className="grid gap-1.5">
                    <div className="flex w-full items-center gap-2">
                        <div className="w-2.5 h-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: payload[0].color }} />
                        <div className="flex flex-1 justify-between">
                            <span className="text-muted-foreground">{payload[0].name}</span>
                            <span className="font-mono font-medium text-foreground">{data.totalMinutes} min</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Statistics Overview</DialogTitle>
          <DialogDescription>
            A graphical summary of your key metrics over time.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="radar" className="w-full flex-grow min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
                <TabsTrigger value="radar">Radar</TabsTrigger>
                <TabsTrigger value="daily-trend">Daily Trend</TabsTrigger>
                <TabsTrigger value="total-hours">Total Hours</TabsTrigger>
                <TabsTrigger value="todays-hours">Today's Hours</TabsTrigger>
                <TabsTrigger value="consistency">Consistency</TabsTrigger>
                <TabsTrigger value="weight">Weight</TabsTrigger>
                <TabsTrigger value="learning">Learning</TabsTrigger>
                <TabsTrigger value="deepwork">Deep Work</TabsTrigger>
            </TabsList>
            
            <TabsContent value="radar" className="flex-grow mt-4 min-h-0">
                <ScrollArea className="h-full pr-4">
                    <div>
                        <h4 className="font-semibold mb-4 text-center md:text-left">Today vs. Ideal Hours</h4>
                        <ChartContainer config={{}} className="min-h-[400px] w-full">
                            <ResponsiveContainer>
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="subject" />
                                    <RechartsTooltip content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                    <p className="font-bold text-foreground">{data.subject}</p>
                                                    <p className="text-muted-foreground">Today: {data.today.toLocaleString()} hours</p>
                                                    <p className="text-muted-foreground">Ideal: {data.ideal.toLocaleString()} hours</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />
                                    <Legend />
                                    <Radar name="Today" dataKey="today" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                                    <Radar name="Ideal" dataKey="ideal" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.4} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </ScrollArea>
            </TabsContent>

            <TabsContent value="daily-trend" className="flex-grow mt-4 min-h-0">
                <ScrollArea className="h-full pr-4">
                  {productivityData.length > 1 ? (
                    <div>
                      <h4 className="font-semibold mb-4 text-center md:text-left">Daily Productive Time</h4>
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
                              <RechartsTooltip content={renderProductivityTooltip} />
                              <Legend verticalAlign="top" height={36}/>
                              <Area type="monotone" dataKey="totalMinutes" fill="url(#fillTotalMinutesModal)" stroke="var(--color-totalMinutes)" strokeWidth={2} name="Productive Time (min)" />
                          </AreaChart>
                      </ChartContainer>
                    </div>
                  ) : <p className="text-center text-muted-foreground py-8">Not enough data to show productivity stats.</p> }
                </ScrollArea>
            </TabsContent>

            <TabsContent value="total-hours" className="flex-grow mt-4 min-h-0">
                <ScrollArea className="h-full pr-4">
                    <div>
                        <h4 className="font-semibold mb-4 text-center md:text-left">Total Hours Logged</h4>
                        {totalHoursData.some(d => d.hours > 0) ? (
                            <ChartContainer config={totalHoursChartConfig} className="h-[400px] w-full">
                                <ResponsiveContainer>
                                    <BarChart accessibilityLayer data={totalHoursData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                        <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} label={{ value: "Hours", angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '0.8rem', fill: 'hsl(var(--muted-foreground))' }}} />
                                        <RechartsTooltip
                                            cursor={{ fill: "hsl(var(--muted))" }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                            <p className="font-bold text-foreground">{data.name}</p>
                                                            <p className="text-muted-foreground">{data.hours.toLocaleString()} hours</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-[400px] items-center justify-center text-center text-sm text-muted-foreground">
                                <p>Log some activities to see your total hours spent.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </TabsContent>
            
            <TabsContent value="todays-hours" className="flex-grow mt-4 min-h-0">
                <ScrollArea className="h-full pr-4">
                  <div>
                      <h4 className="font-semibold mb-4 text-center md:text-left">Hours Spent Today</h4>
                      {todayHoursData.some(d => d.hours > 0) ? (
                          <ChartContainer config={totalHoursChartConfig} className="h-[400px] w-full">
                              <ResponsiveContainer>
                                  <BarChart accessibilityLayer data={todayHoursData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                      <CartesianGrid vertical={false} />
                                      <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                      <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} label={{ value: "Hours", angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '0.8rem', fill: 'hsl(var(--muted-foreground))' }}} />
                                      <RechartsTooltip
                                          cursor={{ fill: "hsl(var(--muted))" }}
                                          content={({ active, payload }) => {
                                              if (active && payload && payload.length) {
                                                  const data = payload[0].payload;
                                                  return (
                                                      <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                          <p className="font-bold text-foreground">{data.name}</p>
                                                          <p className="text-muted-foreground">{data.hours.toLocaleString()} hours</p>
                                                      </div>
                                                  );
                                              }
                                              return null;
                                          }}
                                      />
                                      <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </ChartContainer>
                      ) : (
                          <div className="flex h-[400px] items-center justify-center text-center text-sm text-muted-foreground">
                              <p>Log some activities today to see your hours spent.</p>
                          </div>
                      )}
                  </div>
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
                            <RechartsTooltip cursor={true} content={({ active, payload, label }) => active && payload?.length ? (
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

            <TabsContent value="learning" className="flex-grow mt-4 min-h-0">
                <ScrollArea className="h-full pr-4">
                  {learningData.length > 1 ? (
                    <ChartContainer config={learningChartConfig} className="min-h-[400px] w-full">
                       <AreaChart accessibilityLayer data={learningData} margin={{ top: 10, right: 30, left: 0, bottom: 0, }}>
                            <defs>
                                <linearGradient id="fillLearningTime" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-totalMinutes)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--color-totalMinutes)" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}/>
                             <RechartsTooltip content={renderProductivityTooltip} />
                            <Legend verticalAlign="top" height={36}/>
                            <Area type="monotone" dataKey="totalMinutes" fill="url(#fillLearningTime)" stroke="var(--color-totalMinutes)" strokeWidth={2} name="Learning Time (min)" />
                        </AreaChart>
                    </ChartContainer>
                  ) : <p className="text-center text-muted-foreground py-8">Not enough data to show learning stats.</p> }
                </ScrollArea>
            </TabsContent>

            <TabsContent value="deepwork" className="flex-grow mt-4 min-h-0">
                <ScrollArea className="h-full pr-4">
                  {deepWorkData.length > 1 ? (
                    <ChartContainer config={deepWorkChartConfig} className="min-h-[400px] w-full">
                       <AreaChart accessibilityLayer data={deepWorkData} margin={{ top: 10, right: 30, left: 0, bottom: 0, }}>
                            <defs>
                                <linearGradient id="fillDeepWorkTime" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-totalMinutes)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--color-totalMinutes)" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}/>
                             <RechartsTooltip content={renderProductivityTooltip} />
                            <Legend verticalAlign="top" height={36}/>
                            <Area type="monotone" dataKey="totalMinutes" fill="url(#fillDeepWorkTime)" stroke="var(--color-totalMinutes)" strokeWidth={2} name="Deep Work Time (min)" />
                        </AreaChart>
                    </ChartContainer>
                  ) : <p className="text-center text-muted-foreground py-8">Not enough data to show deep work stats.</p> }
                </ScrollArea>
            </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
