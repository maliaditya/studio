
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, parseISO, startOfISOWeek, setISOWeek, addWeeks, subYears } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import type { Stopper } from '@/types/workout';

const productivityChartConfig = {
    totalMinutes: { label: "Productive Time (min)", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const weightChartConfig = {
  historicalWeight: { label: "Weight (kg/lb)", color: "hsl(var(--chart-2))" },
  projectedWeight: { label: "Projection", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const consistencyChartConfig = {
  score: { label: "Consistency", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const resistanceChartConfig = {
    urges: { label: "Urges", color: "hsl(var(--chart-4))" },
    resistances: { label: "Resistances", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

const specializationChartConfig = {
    hours: { label: "Hours Logged", color: "hsl(var(--chart-1))" },
};

const CustomTooltip = ({ active, payload, label, context }: { active?: boolean, payload?: any[], label?: string, context?: string }) => {
    if (active && payload && payload.length && label) {
        const data = payload[0].payload;
        return (
            <div className="grid min-w-[12rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                <div className="font-bold text-foreground">{format(parseISO(label), 'PPP')}</div>
                <div className="grid gap-1.5">
                    {payload.map((p: any, index: number) => (
                        <div key={index} className="flex w-full items-center gap-2">
                            <div className="w-2.5 h-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: p.color }} />
                            <div className="flex flex-1 justify-between">
                                <span className="text-muted-foreground">{p.name}</span>
                                <span className="font-mono font-medium text-foreground">
                                    {context === 'weight' ? `${p.value.toFixed(1)} kg/lb` : 
                                     context === 'consistency' ? `${p.value}%` :
                                     `${p.value} ${context === 'specialization' ? 'hrs' : context === 'resistance' ? '' : 'min'}`}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

function ChartsPageContent() {
    const { 
        allUpskillLogs, 
        allDeepWorkLogs, 
        weightLogs, 
        goalWeight,
        allWorkoutLogs,
        habitCards,
        coreSkills,
    } = useAuth();

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
            date: d.dateObj.toISOString(),
            totalMinutes: d.upskill + d.deepwork,
        }));
    }, [allUpskillLogs, allDeepWorkLogs]);

    const combinedWeightData = useMemo(() => {
        const sortedLogs = weightLogs.map(log => {
            const [year, weekNum] = log.date.split('-W');
            const dateObj = startOfISOWeek(setISOWeek(new Date(parseInt(year), 0, 4), parseInt(weekNum)));
            return { ...log, dateObj, timestamp: dateObj.getTime() };
        }).sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());
    
        let allData = sortedLogs.map((log, index, arr) => ({
            ...log,
            historicalWeight: log.weight,
            projectedWeight: null,
            isProjection: false,
        }));
    
        if (!goalWeight || sortedLogs.length < 1) return allData;
    
        // Simplified projection logic for brevity
        const lastLog = sortedLogs[sortedLogs.length - 1];
        const weightToChange = goalWeight - lastLog.weight;
        if (Math.abs(weightToChange) < 0.1) return allData;
    
        const weeksToGo = 26; // Simplified: project 6 months out
        const projectionRate = weightToChange / weeksToGo;
    
        for (let i = 1; i <= weeksToGo; i++) {
            const projectedDate = addWeeks(lastLog.dateObj, i);
            allData.push({
                projectedWeight: lastLog.weight + (i * projectionRate),
                timestamp: projectedDate.getTime(),
                isProjection: true,
                historicalWeight: null,
            } as any);
        }
    
        return allData;
    }, [goalWeight, weightLogs]);

    const consistencyData = useMemo(() => {
        const today = new Date();
        const oneYearAgo = subYears(today, 1);
        const workoutDates = new Set(allWorkoutLogs.filter(log => log.exercises.some(ex => ex.loggedSets.length > 0)).map(log => log.date));
        const data = [];
        let score = 0.5;
        for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
            const dateKey = format(d, 'yyyy-MM-dd');
            if (workoutDates.has(dateKey)) score += (1 - score) * 0.1;
            else score *= 0.95;
            data.push({ date: d.toISOString(), score: Math.round(score * 100) });
        }
        return data;
    }, [allWorkoutLogs]);
    
    const resistanceData = useMemo(() => {
        const dailyCounts: Record<string, { dateObj: Date, urges: number, resistances: number }> = {};
        const allStoppers: { stopper: Stopper, isUrge: boolean }[] = [];
        habitCards.forEach(habit => {
            (habit.urges || []).forEach(s => allStoppers.push({ stopper: s, isUrge: true }));
            (habit.resistances || []).forEach(s => allStoppers.push({ stopper: s, isUrge: false }));
        });
        
        allStoppers.forEach(({ stopper, isUrge }) => {
            (stopper.timestamps || []).forEach(ts => {
                const dateKey = format(new Date(ts), 'yyyy-MM-dd');
                if (!dailyCounts[dateKey]) dailyCounts[dateKey] = { dateObj: parseISO(dateKey), urges: 0, resistances: 0 };
                if (isUrge) dailyCounts[dateKey].urges++;
                else dailyCounts[dateKey].resistances++;
            });
        });

        return Object.values(dailyCounts).sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime()).map(d => ({ ...d, date: d.dateObj.toISOString() }));
    }, [habitCards]);
    
    const specializationData = useMemo(() => {
      const dailyData: Record<string, Record<string, number>> = {}; // date -> { specName: hours }
      const specializations = coreSkills.filter(s => s.type === 'Specialization');
      const specNameById = new Map(specializations.map(s => [s.id, s.name]));
      const specIdByMicroSkillCat: Record<string, string> = {};

      specializations.forEach(spec => {
          spec.skillAreas.forEach(area => {
              area.microSkills.forEach(ms => {
                  specIdByMicroSkillCat[ms.name] = spec.id;
              });
          });
      });

      const processLogs = (logs: any[], durationField: 'reps' | 'weight') => {
        logs.forEach(log => {
            log.exercises.forEach((ex: any) => {
                const specId = specIdByMicroSkillCat[ex.category];
                if (specId) {
                    const specName = specNameById.get(specId);
                    if (specName) {
                        const duration = ex.loggedSets.reduce((sum: number, set: any) => sum + (set[durationField] || 0), 0);
                        if (duration > 0) {
                            if (!dailyData[log.date]) dailyData[log.date] = {};
                            dailyData[log.date][specName] = (dailyData[log.date][specName] || 0) + duration / 60;
                        }
                    }
                }
            });
        });
      };

      processLogs(allUpskillLogs, 'reps');
      processLogs(allDeepWorkLogs, 'weight');
      
      const allDates = Object.keys(dailyData).sort();
      return allDates.map(date => {
          return {
              date,
              ...dailyData[date]
          }
      });
    }, [coreSkills, allUpskillLogs, allDeepWorkLogs]);


    const chartComponents = [
        { title: "Productivity Trend", data: productivityData, config: productivityChartConfig, yAxisKey: "totalMinutes", context: "productivity" },
        { title: "Weight Trend", data: combinedWeightData, config: weightChartConfig, yAxisKey: "weight", context: "weight" },
        { title: "Workout Consistency", data: consistencyData, config: consistencyChartConfig, yAxisKey: "score", context: "consistency" },
        { title: "Urges & Resistances", data: resistanceData, config: resistanceChartConfig, context: "resistance" },
        { title: "Specialization Hours", data: specializationData, config: specializationChartConfig, context: "specialization"},
    ];

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-primary">Charts Dashboard</h1>
                <p className="mt-4 text-lg text-muted-foreground">Your key metrics at a glance.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {chartComponents.map(({ title, data, config, yAxisKey, context }, index) => {
                    if (data.length < 2) return null; // Don't render chart if not enough data
                    
                    if (title === "Specialization Hours") {
                        const specNames = Object.keys(data[0] || {}).filter(k => k !== 'date');
                        return (
                            <Card key={title} className="lg:col-span-2">
                                <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
                                <CardContent>
                                    <ChartContainer config={config} className="min-h-[300px] w-full">
                                        <ResponsiveContainer>
                                            <LineChart data={data}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" tickFormatter={(val) => format(parseISO(val), 'MMM d')} />
                                                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                                                <RechartsTooltip content={<CustomTooltip context={context} />} />
                                                {specNames.map((specName, i) => (
                                                    <Line key={specName} type="monotone" dataKey={specName} stroke={`hsl(var(--chart-${(i%5)+1}))`} name={specName} dot={false} />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                        )
                    }

                    return (
                        <Card key={title}>
                            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
                            <CardContent>
                                <ChartContainer config={config} className="min-h-[300px] w-full">
                                    <ResponsiveContainer>
                                        <LineChart data={data}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tickFormatter={(val) => format(parseISO(val), 'MMM d')} />
                                            <YAxis />
                                            <RechartsTooltip content={<CustomTooltip context={context} />} />
                                            {Object.keys(config).map((key) => (
                                                <Line key={key} type="monotone" dataKey={key} stroke={`var(--color-${key})`} name={config[key as keyof typeof config]?.label} dot={false} strokeDasharray={key === 'projectedWeight' ? '5 5' : ''}/>
                                            ))}
                                            {title === 'Weight Trend' && goalWeight && <ReferenceLine y={goalWeight} label="Goal" stroke="hsl(var(--destructive))" strokeDasharray="3 3" />}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

export default function ChartsPage() {
    return (
        <AuthGuard>
            <ChartsPageContent />
        </AuthGuard>
    );
}
