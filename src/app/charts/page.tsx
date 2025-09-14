
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, parseISO, startOfISOWeek, setISOWeek, addWeeks, subYears } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import type { Stopper, Activity, DailySchedule, ActivityType } from '@/types/workout';

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

const specializationChartConfig = {
    hours: { label: "Hours Logged", color: "hsl(var(--chart-1))" },
};

const activityNameMap: Record<ActivityType, string> = {
    deepwork: 'Deep Work',
    upskill: 'Learning',
    workout: 'Workout',
    mindset: 'Mindset',
    branding: 'Branding',
    essentials: 'Essentials',
    planning: 'Planning',
    tracking: 'Tracking',
    'lead-generation': 'Lead Gen',
    interrupt: 'Interrupts',
    distraction: 'Distractions',
    nutrition: 'Nutrition',
};

const activityColorMapping: Record<string, string> = {
    'Deep Work': 'hsl(var(--chart-1))',
    'Learning': 'hsl(var(--chart-2))',
    'Workout': 'hsl(var(--chart-3))',
    'Branding': 'hsl(var(--chart-4))',
    'Lead Gen': 'hsl(var(--chart-5))',
    'Essentials': 'hsl(var(--chart-1))',
    'Planning': 'hsl(var(--chart-2))',
    'Tracking': 'hsl(var(--chart-3))',
    'Interrupts': 'hsl(var(--destructive))',
    'Distractions': 'hsl(var(--destructive))',
    'Nutrition': 'hsl(var(--chart-4))',
};


const CustomTooltip = ({ active, payload, label, context, customConfig }: { active?: boolean, payload?: any[], label?: string, context?: string, customConfig?: ChartConfig }) => {
    if (active && payload && payload.length && label) {
        const data = payload[0].payload;
        
        let formattedLabel = label;
        try {
            // Attempt to parse and format only if it looks like a valid date string
            if (label.match(/^\d{4}-\d{2}-\d{2}/)) {
                formattedLabel = format(parseISO(label), 'PPP');
            }
        } catch (e) {
            // If parsing fails, use the original label
        }

        return (
            <div className="grid min-w-[12rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                <div className="font-bold text-foreground">{formattedLabel}</div>
                <div className="grid gap-1.5">
                    {payload.map((p: any, index: number) => {
                        const value = p.value;
                        if (value === 0 || value === null || value === undefined) return null;
                        
                        let name = p.name;
                        if (context === 'resistance' && customConfig && customConfig[p.dataKey]) {
                            name = customConfig[p.dataKey]?.label;
                        }

                        return (
                            <div key={index} className="flex w-full items-center gap-2">
                                <div className="w-2.5 h-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: p.color }} />
                                <div className="flex flex-1 justify-between">
                                    <span className="text-muted-foreground">{name}</span>
                                    <span className="font-mono font-medium text-foreground">
                                        {context === 'weight' ? `${value.toFixed(1)} kg/lb` : 
                                        context === 'consistency' ? `${value}%` :
                                        `${value} ${context === 'specialization' ? 'hrs' : context === 'resistance' || context === 'activities' || context === 'activity-distribution' ? (value === 1 ? 'time' : 'times') : 'min'}`}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
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
        schedule,
        activityDurations,
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
    
        let allData: any[] = sortedLogs.map((log) => ({
            date: log.dateObj.toISOString(),
            historicalWeight: log.weight,
            projectedWeight: null,
            isProjection: false,
        }));
    
        if (!goalWeight || sortedLogs.length < 1) return allData;
    
        const lastLog = sortedLogs[sortedLogs.length - 1];
        const weightToChange = goalWeight - lastLog.weight;
        if (Math.abs(weightToChange) < 0.1) return allData;
    
        const weeksToGo = 26;
        const projectionRate = weightToChange / weeksToGo;
    
        for (let i = 1; i <= weeksToGo; i++) {
            const projectedDate = addWeeks(lastLog.dateObj, i);
            allData.push({
                date: projectedDate.toISOString(),
                projectedWeight: lastLog.weight + (i * projectionRate),
                isProjection: true,
                historicalWeight: null,
            });
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
    
    const { resistanceData, resistanceChartConfig } = useMemo(() => {
        const dailyCounts: Record<string, { dateObj: Date } & Record<string, number>> = {};
        const allStoppers: Stopper[] = [];
        const stopperNames = new Set<string>();

        habitCards.forEach(habit => {
            (habit.urges || []).forEach(s => { allStoppers.push(s); stopperNames.add(s.text); });
            (habit.resistances || []).forEach(s => { allStoppers.push(s); stopperNames.add(s.text); });
        });
        
        allStoppers.forEach(stopper => {
            (stopper.timestamps || []).forEach(ts => {
                const dateKey = format(new Date(ts), 'yyyy-MM-dd');
                if (!dailyCounts[dateKey]) {
                    dailyCounts[dateKey] = { dateObj: parseISO(dateKey) };
                    stopperNames.forEach(name => dailyCounts[dateKey][name] = 0);
                };
                dailyCounts[dateKey][stopper.text] = (dailyCounts[dateKey][stopper.text] || 0) + 1;
            });
        });

        const data = Object.values(dailyCounts).sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime()).map(d => ({ ...d, date: d.dateObj.toISOString() }));
        
        const config: ChartConfig = {};
        let i = 1;
        stopperNames.forEach(name => {
            config[name] = { label: name, color: `hsl(var(--chart-${(i%5)+1}))` };
            i++;
        });

        return { resistanceData: data, resistanceChartConfig: config };
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

    const { activityData, activityChartConfig } = useMemo(() => {
        const dailyData: Record<string, { dateObj: Date } & Record<string, number>> = {};
        const activityTypes = new Set<string>();

        Object.entries(schedule).forEach(([date, dailySchedule]) => {
            const dateKey = date;
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = { dateObj: parseISO(dateKey) };
            }

            Object.values(dailySchedule).forEach(slotActivities => {
                if (Array.isArray(slotActivities)) {
                    (slotActivities as Activity[]).forEach(activity => {
                        if (activity.completed) {
                            const mappedType = activityNameMap[activity.type] || activity.type;
                            activityTypes.add(mappedType);
                            dailyData[dateKey][mappedType] = (dailyData[dateKey][mappedType] || 0) + 1;
                        }
                    });
                }
            });
        });

        const data = Object.values(dailyData)
            .filter(d => Object.keys(d).length > 2) // Filter out days with only dateObj
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
            .map(d => ({ ...d, date: d.dateObj.toISOString() }));
        
        const config: ChartConfig = {};
        activityTypes.forEach(name => {
            config[name] = { label: name, color: activityColorMapping[name] || 'hsl(var(--muted))' };
        });

        return { activityData: data, activityChartConfig: config };
    }, [schedule]);


    const chartComponents = [
        { title: "Productivity Trend", data: productivityData, config: productivityChartConfig, context: "productivity" },
        { title: "Weight Trend", data: combinedWeightData, config: weightChartConfig, context: "weight" },
        { title: "Workout Consistency", data: consistencyData, config: consistencyChartConfig, context: "consistency" },
        { title: "Urges & Resistances", data: resistanceData, config: resistanceChartConfig, context: "resistance" },
        { title: "Specialization Hours", data: specializationData, config: specializationChartConfig, context: "specialization"},
        { title: "Completed Activities", data: activityData, config: activityChartConfig, context: "activities" },
    ];

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-primary">Charts Dashboard</h1>
                <p className="mt-4 text-lg text-muted-foreground">Your key metrics at a glance.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {chartComponents.map(({ title, data, config, context }, index) => {
                    if (data.length < 1) return null;

                    if (["Specialization Hours", "Urges & Resistances", "Completed Activities"].includes(title)) {
                        const dataKeys = Object.keys(data[0] || {}).filter(k => k !== 'date' && k !== 'dateObj');
                        return (
                            <Card key={title} className="lg:col-span-2">
                                <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
                                <CardContent>
                                    <ChartContainer config={config} className="min-h-[300px] w-full">
                                        <ResponsiveContainer>
                                            <LineChart data={data}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" tickFormatter={(val) => format(parseISO(val), 'MMM d')} />
                                                <YAxis label={{ value: title === 'Specialization Hours' ? 'Hours' : 'Count', angle: -90, position: 'insideLeft' }} />
                                                <RechartsTooltip content={<CustomTooltip context={context} customConfig={config} />} />
                                                {dataKeys.map((key, i) => (
                                                    <Line key={key} type="monotone" dataKey={key} stroke={config[key]?.color || `hsl(var(--chart-${(i%5)+1}))`} name={config[key]?.label || key} dot={false} />
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
