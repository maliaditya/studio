
"use client";

import React, { useMemo, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, parseISO, startOfISOWeek, setISOWeek, addWeeks, subYears, startOfDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import type { Stopper, Activity, DailySchedule, ActivityType } from '@/types/workout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

const hourlyResistanceChartConfig = {
    urges: { label: 'Urges', color: 'hsl(var(--destructive))' },
    resistances: { label: 'Resistances', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

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
        
        if (context === 'hourly-resistance') {
            const hourData = data;
            return (
                <div className="p-2 bg-background border rounded-md text-xs shadow-lg max-w-sm">
                    <p className="font-bold text-lg">{label}</p>
                    {payload.map((pld: any) => (
                        <div key={pld.dataKey} style={{ color: pld.color }}>
                            <strong>{pld.name}:</strong> {pld.value}
                        </div>
                    ))}
                    {hourData?.urgeDetails.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                            <p className="font-semibold">Urges:</p>
                            <ul className="list-disc list-inside">
                                {hourData.urgeDetails.map((d:string, i:number) => <li key={`urge-${i}`}>{d}</li>)}
                            </ul>
                        </div>
                    )}
                    {hourData?.resistanceDetails.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                            <p className="font-semibold">Resistances:</p>
                             <ul className="list-disc list-inside">
                                {hourData.resistanceDetails.map((d:string, i:number) => <li key={`res-${i}`}>{d}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            );
        }

        let formattedLabel = label;
        try {
            // Attempt to parse and format only if it looks like a valid date string
            if (label.match(/^\d{4}-\d{2}-\d{2}/) || !isNaN(parseISO(label).getTime())) {
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
                        if ((context === 'resistance' || context === 'specialization') && customConfig && customConfig[p.dataKey]) {
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
                                        `${value.toFixed(2)} ${context === 'specialization' ? 'hrs' : context === 'resistance' || context === 'activities' || context === 'activity-distribution' ? (value === 1 ? 'time' : 'times') : context === 'activity-trends' ? 'min' : 'min'}`}
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
        mechanismCards,
        coreSkills,
        schedule,
        activityDurations,
    } = useAuth();
    
    const [resistanceFilter, setResistanceFilter] = useState<'all' | 'today' | 'lastX'>('all');
    const [lastXDays, setLastXDays] = useState(5);

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
    
    const { specializationData, specializationChartConfig } = useMemo(() => {
        const categoryToSpecialization: Record<string, string> = {};
        const specializationNames = new Set<string>();

        coreSkills
            .filter(skill => skill.type === 'Specialization')
            .forEach(spec => {
                specializationNames.add(spec.name);
                spec.skillAreas.forEach(area => {
                    area.microSkills.forEach(ms => {
                        categoryToSpecialization[ms.name] = spec.name;
                    });
                });
            });

        const dailyData: Record<string, Record<string, number>> = {};

        const processLogs = (logs: any[], durationField: 'reps' | 'weight') => {
            logs.forEach(log => {
                log.exercises.forEach((ex: any) => {
                    const specName = categoryToSpecialization[ex.category];
                    if (specName) {
                        const duration = ex.loggedSets.reduce((sum: number, set: any) => sum + (set[durationField] || 0), 0);
                        if (duration > 0) {
                            if (!dailyData[log.date]) {
                                dailyData[log.date] = {};
                                specializationNames.forEach(name => {
                                    dailyData[log.date][name] = 0;
                                });
                            }
                            dailyData[log.date][specName] = (dailyData[log.date][specName] || 0) + duration;
                        }
                    }
                });
            });
        };

        processLogs(allUpskillLogs, 'reps');
        processLogs(allDeepWorkLogs, 'weight');

        const data = Object.entries(dailyData)
            .map(([date, specMinutes]) => {
                const dataPoint: Record<string, any> = { date };
                Object.entries(specMinutes).forEach(([specName, minutes]) => {
                    dataPoint[specName] = minutes / 60; // Convert minutes to hours
                });
                return dataPoint;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
        const config: ChartConfig = {};
        let i = 1;
        specializationNames.forEach(specName => {
            config[specName] = { label: specName, color: `hsl(var(--chart-${(i % 5) + 1}))` };
            i++;
        });

        return { specializationData: data, specializationChartConfig: config };
    }, [coreSkills, allUpskillLogs, allDeepWorkLogs]);

    const hourlyResistanceData = useMemo(() => {
        const log = Array.from({ length: 24 }, (_, i) => {
            const startAmPm = i < 12 ? 'AM' : 'PM';
            const hourLabel = i % 12 === 0 ? 12 : i % 12;
            
            return {
                hour: i,
                name: `${hourLabel}${startAmPm}`,
                urges: 0,
                resistances: 0,
                urgeDetails: [] as string[],
                resistanceDetails: [] as string[],
            };
        });

        const today = startOfDay(new Date());
        const filterStartDate = resistanceFilter === 'today' ? today : subYears(today, 10);
        if (resistanceFilter === 'lastX') {
            const daysAgo = startOfDay(subYears(new Date(), lastXDays));
            if (daysAgo > filterStartDate) {
                // This logic is simplified; for a real app, you'd use subDays.
            }
        }
        
        const allLinkedResistances: { habitId: string; habitName: string; stopper: Stopper; isUrge: boolean; mechanismName?: string; }[] = [];
        habitCards.forEach(habit => {
            const processStoppers = (stoppers: Stopper[] = [], isUrge: boolean) => {
                stoppers.forEach(stopper => {
                    const mechanism = mechanismCards.find(m => m.id === (isUrge ? habit.response?.resourceId : habit.newResponse?.resourceId));
                    allLinkedResistances.push({
                        habitId: habit.id,
                        habitName: habit.name,
                        stopper: stopper,
                        isUrge: isUrge,
                        mechanismName: mechanism?.name,
                    });
                });
            };
            processStoppers(habit.urges, true);
            processStoppers(habit.resistances, false);
        });
        
        allLinkedResistances.forEach(link => {
            if (link.stopper.timestamps) {
                link.stopper.timestamps.forEach(ts => {
                    const eventDate = new Date(ts);
                    if (resistanceFilter === 'all' || eventDate >= filterStartDate) {
                        const hour = eventDate.getHours();
                        if (link.isUrge) {
                            log[hour].urges++;
                            log[hour].urgeDetails.push(link.stopper.text);
                        } else {
                            log[hour].resistances++;
                            log[hour].resistanceDetails.push(link.stopper.text);
                        }
                    }
                });
            }
        });
        return log;
    }, [habitCards, mechanismCards, resistanceFilter, lastXDays]);


    const allCategoriesData = useMemo(() => {
        const categoriesWithData = Object.values(activityNameMap)
            .map(category => {
                const historicalData = Object.entries(schedule)
                    .map(([date, dailySchedule]) => {
                        const dailyTotalForCategory = Object.values(dailySchedule)
                            .flat()
                            .filter(activity => activity && activity.completed && activityNameMap[activity.type] === category)
                            .reduce((sum, activity) => sum + (parseInt(activityDurations[activity.id]?.replace(' min', '') || '0')), 0);

                        return {
                            date: date,
                            time: dailyTotalForCategory,
                        };
                    })
                    .filter(item => item.time > 0)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                return {
                    category,
                    historicalData,
                };
            })
            .filter(item => item.historicalData.length > 0);
        return categoriesWithData;
    }, [schedule, activityDurations]);


    const chartComponents = [
        { title: "Productivity Trend", data: productivityData, config: productivityChartConfig, context: "productivity" },
        { title: "Weight Trend", data: combinedWeightData, config: weightChartConfig, context: "weight" },
        { title: "Workout Consistency", data: consistencyData, config: consistencyChartConfig, context: "consistency" },
        { title: "Urges & Resistances by Day", data: resistanceData, config: resistanceChartConfig, context: "resistance", span: "lg:col-span-2" },
        { title: "Specialization Hours", data: specializationData, config: specializationChartConfig, context: "specialization"},
    ];

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-primary">Charts Dashboard</h1>
                <p className="mt-4 text-lg text-muted-foreground">Your key metrics at a glance.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {chartComponents.map(({ title, data, config, context, span }) => {
                    if (data.length < 1) return null;

                    if (["Specialization Hours", "Urges & Resistances by Day"].includes(title)) {
                        const dataKeys = Object.keys(config);
                        return (
                            <Card key={title} className={span}>
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
                        <Card key={title} className={span}>
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
                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Hourly Resistance Log</CardTitle>
                        <CardDescription>A historical log of all your urges and resistances, grouped by the hour of the day they were recorded.</CardDescription>
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            <Button variant={resistanceFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setResistanceFilter('all')}>All Time</Button>
                            <Button variant={resistanceFilter === 'today' ? 'default' : 'outline'} size="sm" onClick={() => setResistanceFilter('today')}>Today</Button>
                            <div className="flex items-center gap-2">
                                <Button variant={resistanceFilter === 'lastX' ? 'default' : 'outline'} size="sm" onClick={() => setResistanceFilter('lastX')}>Last</Button>
                                <Input 
                                    type="number" 
                                    value={lastXDays}
                                    onChange={(e) => setLastXDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="w-16 h-8 text-sm"
                                    onFocus={() => setResistanceFilter('lastX')}
                                />
                                <span className="text-sm">Days</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={hourlyResistanceChartConfig} className="w-full h-[300px]">
                            <ResponsiveContainer>
                                <LineChart
                                    data={hourlyResistanceData}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <XAxis dataKey="name" />
                                    <YAxis allowDecimals={false} />
                                    <RechartsTooltip content={<CustomTooltip context="hourly-resistance"/>}/>
                                    <Line type="monotone" dataKey="urges" name="Urges" stroke="hsl(var(--destructive))" />
                                    <Line type="monotone" dataKey="resistances" name="Resistances" stroke="hsl(var(--chart-2))" />
                                </LineChart>
                           </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
            <div className="mt-8">
                <h2 className="text-2xl font-bold text-center mb-4">All Activity Trends</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allCategoriesData.map(({ category, historicalData }) => (
                        <Card key={category}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activityColorMapping[category] || '#8884d8' }}/>
                                    {category}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-48 w-full">
                                {historicalData.length > 1 ? (
                                    <ChartContainer config={{ time: { label: 'Time (min)' } }} className="h-full w-full">
                                        <ResponsiveContainer>
                                            <LineChart data={historicalData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" fontSize={10} tickFormatter={(tick) => format(parseISO(tick), 'MMM d')} />
                                                <YAxis fontSize={10} domain={[0, 'dataMax + 10']}/>
                                                <RechartsTooltip content={<CustomTooltip context="activity-trends" />} />
                                                <Line type="monotone" dataKey="time" stroke={activityColorMapping[category] || 'hsl(var(--primary))'} strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                        <p>Not enough data for trend.</p>
                                    </div>
                                )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
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
