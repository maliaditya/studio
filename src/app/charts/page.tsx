
"use client";

import React, { useMemo, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, parseISO, startOfISOWeek, setISOWeek, addWeeks, subYears, startOfDay, subDays, isSameDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import type { Stopper, Activity, DailySchedule, ActivityType, ExerciseDefinition, CoreSkill } from '@/types/workout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

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
                        if ((context === 'resistance' || context === 'specialization' || context === 'hourly-activity' || context === 'spec-summary' || context === 'spec-trend') && customConfig && customConfig[p.dataKey]) {
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
                                        `${value.toFixed(2)} ${context === 'specialization' || context === 'hourly-activity' || context === 'spec-summary' || context === 'spec-trend' ? 'hrs' : context === 'resistance' || context === 'activities' || context === 'activity-distribution' ? (value === 1 ? 'time' : 'times') : (context === 'activity-trends') ? 'min' : 'min'}`}
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

interface LoggedIntention {
    name: string;
    date: string;
}

interface IntentionModalData {
    specializationName: string;
    loggedIntentions: LoggedIntention[];
}

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
        deepWorkDefinitions,
        upskillDefinitions,
        getDescendantLeafNodes,
        getDeepWorkNodeType,
        getUpskillNodeType,
        microSkillMap,
    } = useAuth();
    
    const [resistanceFilter, setResistanceFilter] = useState<'all' | 'today' | 'lastX'>('all');
    const [lastXDays, setLastXDays] = useState(5);
    const [selectedActivityDate, setSelectedActivityDate] = useState<Date>(new Date());
    const [specHoursFilter, setSpecHoursFilter] = useState<'all' | 'today'>('all');
    const [intentionModalData, setIntentionModalData] = useState<IntentionModalData | null>(null);

    const productivityData = useMemo(() => {
        const dailyData: Record<string, { dateObj: Date, upskill: number, deepwork: number }> = {};
        
        allUpskillLogs.forEach(log => {
            const duration = log.exercises.reduce((sum, ex) => sum + (ex.loggedDuration || 0), 0);
            if (duration > 0) {
                if (!dailyData[log.date]) dailyData[log.date] = { dateObj: parseISO(log.date), upskill: 0, deepwork: 0 };
                dailyData[log.date].upskill += duration;
            }
        });

        allDeepWorkLogs.forEach(log => {
            const duration = log.exercises.reduce((sum, ex) => sum + (ex.loggedDuration || 0), 0);
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
    
    const specializationTrendData = useMemo(() => {
        const specializations: CoreSkill[] = coreSkills.filter(skill => skill.type === 'Specialization');
    
        return specializations.map((spec, specIndex) => {
            const allLeafNodesUpskill = spec.skillAreas.flatMap(sa => sa.microSkills).flatMap(ms =>
                upskillDefinitions.filter(def => def.category === ms.name && getUpskillNodeType(def) === 'Curiosity')
            ).flatMap(curiosity => getDescendantLeafNodes(curiosity.id, 'upskill'));
    
            const allLeafNodesDeepWork = spec.skillAreas.flatMap(sa => sa.microSkills).flatMap(ms =>
                deepWorkDefinitions.filter(def => def.category === ms.name && getDeepWorkNodeType(def) === 'Intention')
            ).flatMap(intention => getDescendantLeafNodes(intention.id, 'deepwork'));
            
            const leafNodeIdsUpskill = new Set(allLeafNodesUpskill.map(n => n.id));
            const leafNodeIdsDeepWork = new Set(allLeafNodesDeepWork.map(n => n.id));

            const dailyData: Record<string, number> = {};
    
            allDeepWorkLogs.forEach(log => {
                const dailyMinutes = log.exercises
                    .filter(ex => leafNodeIdsDeepWork.has(ex.definitionId))
                    .reduce((sum, ex) => sum + ex.loggedSets.reduce((setSum, set) => setSum + (set.weight || 0), 0), 0);
                if (dailyMinutes > 0) {
                    if (!dailyData[log.date]) dailyData[log.date] = 0;
                    dailyData[log.date] += dailyMinutes;
                }
            });
    
            allUpskillLogs.forEach(log => {
                const dailyMinutes = log.exercises
                    .filter(ex => leafNodeIdsUpskill.has(ex.definitionId))
                    .reduce((sum, ex) => sum + ex.loggedSets.reduce((setSum, set) => setSum + (set.reps || 0), 0), 0);
                if (dailyMinutes > 0) {
                    if (!dailyData[log.date]) dailyData[log.date] = 0;
                    dailyData[log.date] += dailyMinutes;
                }
            });
    
            const data = Object.entries(dailyData)
                .map(([date, minutes]) => ({
                    date: date,
                    hours: minutes / 60
                }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
            return {
                name: spec.name,
                historicalData: data,
                color: `hsl(var(--chart-${(specIndex % 5) + 1}))`
            };
        }).filter(spec => spec.historicalData.length > 0);
    }, [coreSkills, deepWorkDefinitions, upskillDefinitions, getDescendantLeafNodes, getDeepWorkNodeType, getUpskillNodeType, allDeepWorkLogs, allUpskillLogs]);
    
    const { specializationHoursSummary, specHoursChartConfig } = useMemo(() => {
        const totals: Record<string, number> = {};
        const specializations = coreSkills.filter(s => s.type === 'Specialization');
        specializations.forEach(spec => totals[spec.name] = 0);
    
        const todayKey = format(new Date(), 'yyyy-MM-dd');
    
        specializations.forEach(spec => {
            const allLeafNodesUpskill = spec.skillAreas.flatMap(sa => sa.microSkills).flatMap(ms => 
                upskillDefinitions.filter(def => def.category === ms.name && getUpskillNodeType(def) === 'Curiosity')
            ).flatMap(curiosity => getDescendantLeafNodes(curiosity.id, 'upskill'));
    
            const allLeafNodesDeepWork = spec.skillAreas.flatMap(sa => sa.microSkills).flatMap(ms => 
                deepWorkDefinitions.filter(def => def.category === ms.name && getDeepWorkNodeType(def) === 'Intention')
            ).flatMap(intention => getDescendantLeafNodes(intention.id, 'deepwork'));
    
            let totalSpecMinutes = 0;
    
            if (specHoursFilter === 'all') {
                allLeafNodesUpskill.forEach(leaf => { totalSpecMinutes += leaf.loggedDuration || 0; });
                allLeafNodesDeepWork.forEach(leaf => { totalSpecMinutes += leaf.loggedDuration || 0; });
            } else { // 'today'
                const todaysDeepWorkLog = allDeepWorkLogs.find(log => log.date === todayKey);
                const todaysUpskillLog = allUpskillLogs.find(log => log.date === todayKey);
                
                const leafNodeIdsUpskill = new Set(allLeafNodesUpskill.map(leaf => leaf.id));
                const leafNodeIdsDeepWork = new Set(allLeafNodesDeepWork.map(leaf => leaf.id));

                if (todaysUpskillLog) {
                    todaysUpskillLog.exercises.forEach(exerciseLog => {
                        if (leafNodeIdsUpskill.has(exerciseLog.definitionId)) {
                             totalSpecMinutes += exerciseLog.loggedSets.reduce((sum, set) => sum + (set.reps || 0), 0);
                        }
                    });
                }
                if (todaysDeepWorkLog) {
                    todaysDeepWorkLog.exercises.forEach(exerciseLog => {
                        if (leafNodeIdsDeepWork.has(exerciseLog.definitionId)) {
                           totalSpecMinutes += exerciseLog.loggedSets.reduce((sum, set) => sum + (set.weight || 0), 0);
                        }
                    });
                }
            }
            totals[spec.name] = totalSpecMinutes / 60; // to hours
        });
  
        const summaryData = Object.entries(totals)
            .map(([name, hours]) => ({ name, hours }))
            .filter(d => d.hours > 0)
            .sort((a, b) => b.hours - a.hours);
  
        const config: ChartConfig = {};
        summaryData.forEach((d, i) => {
            config[d.name] = { label: d.name, color: `hsl(var(--chart-${(i % 5) + 1}))` };
        });
  
        return { specializationHoursSummary: summaryData, specHoursChartConfig: config };
    }, [coreSkills, deepWorkDefinitions, upskillDefinitions, getDescendantLeafNodes, getDeepWorkNodeType, getUpskillNodeType, specHoursFilter, allDeepWorkLogs, allUpskillLogs]);

    const handleBarClick = (data: any) => {
        if (!data || !data.activePayload || !data.activePayload[0]) return;
        const specializationName = data.activePayload[0].payload.name;

        const spec = coreSkills.find(s => s.name === specializationName && s.type === 'Specialization');
        if (!spec) return;

        const intentionNodes = spec.skillAreas.flatMap(sa => sa.microSkills).flatMap(ms =>
            deepWorkDefinitions.filter(def => def.category === ms.name && getDeepWorkNodeType(def) === 'Intention')
        );

        const intentionIds = new Set(intentionNodes.map(i => i.id));
        
        const loggedIntentions: LoggedIntention[] = [];
        
        allDeepWorkLogs.forEach(log => {
            log.exercises.forEach(ex => {
                if(intentionIds.has(ex.definitionId) && ex.loggedSets.length > 0) {
                    loggedIntentions.push({ name: ex.name, date: log.date });
                }
            })
        });
        
        // Remove duplicates and sort by date descending
        const uniqueLoggedIntentions = Array.from(new Map(loggedIntentions.map(item => [`${item.name}-${item.date}`, item])).values())
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setIntentionModalData({
            specializationName,
            loggedIntentions: uniqueLoggedIntentions
        });
    };


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
        let filterStartDate: Date;

        if (resistanceFilter === 'today') {
            filterStartDate = today;
        } else if (resistanceFilter === 'lastX') {
            filterStartDate = subDays(today, lastXDays - 1);
        } else { // 'all'
            filterStartDate = subYears(today, 10); // Effectively all time
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
                         if (resistanceFilter === 'today' && !isSameDay(eventDate, today)) return;
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
    
    const { hourlyActivityData, hourlyActivityConfig } = useMemo(() => {
        const hourlyData = Array.from({ length: 24 }, (_, i) => {
            const hourLabel = i % 12 === 0 ? 12 : i % 12;
            const ampm = i < 12 ? 'AM' : 'PM';
            const record: Record<string, any> = {
                hour: i,
                name: `${hourLabel}${ampm}`,
            };
            Object.values(activityNameMap).forEach(name => {
                record[name] = 0;
            });
            return record;
        });
    
        const selectedDateKey = format(selectedActivityDate, 'yyyy-MM-dd');
        const dailySchedule = schedule[selectedDateKey];
    
        if (dailySchedule) {
            Object.values(dailySchedule).flat().forEach((activity: Activity) => {
                if (!activity.completed) return;
                
                const activityName = activityNameMap[activity.type];
                if (!activityName) return;
    
                let startTime, endTime;
                if (activity.focusSessionInitialStartTime && activity.focusSessionEndTime) {
                    startTime = new Date(activity.focusSessionInitialStartTime);
                    endTime = new Date(activity.focusSessionEndTime);
                } else if (activity.duration) {
                    // Fallback for simple duration tasks (interrupts, essentials)
                    const activityDate = parseISO(selectedDateKey);
                    // Distribute it somewhat arbitrarily for now if no start time exists
                    const startHour = activityDate.getHours();
                    startTime = new Date(activityDate.setHours(startHour, 0, 0, 0));
                    endTime = new Date(startTime.getTime() + activity.duration * 60 * 1000);
                } else {
                    return; // No time data to process
                }
    
                let current = startTime;
                while (current < endTime) {
                    const currentHour = current.getHours();
                    const nextHour = new Date(current);
                    nextHour.setHours(currentHour + 1, 0, 0, 0);
    
                    const endOfInterval = endTime < nextHour ? endTime : nextHour;
                    const minutesInHour = (endOfInterval.getTime() - current.getTime()) / 60000;
                    
                    if (minutesInHour > 0) {
                        hourlyData[currentHour][activityName] = (hourlyData[currentHour][activityName] || 0) + (minutesInHour / 60);
                    }
                    
                    current = nextHour;
                }
            });
        }
        
        const config: ChartConfig = {};
        Object.keys(activityColorMapping).forEach(name => {
            config[name] = { label: name, color: activityColorMapping[name] };
        });
    
        return { hourlyActivityData: hourlyData, hourlyActivityConfig: config };
    }, [schedule, activityDurations, selectedActivityDate]);

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
                            activities: Object.values(dailySchedule).flat().filter(a => a && a.completed && activityNameMap[a.type] === category).map(a => ({ name: a.details, duration: parseInt(activityDurations[a.id]?.replace(' min', '') || '0') }))
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
    ];

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold tracking-tight text-primary">Charts Dashboard</h1>
                <p className="mt-4 text-lg text-muted-foreground">Your key metrics at a glance.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {chartComponents.map(({ title, data, config, context }) => {
                    if (data.length < 1) return null;

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

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Top Specializations</CardTitle>
                        <CardDescription>Total hours logged per specialization. Click a bar for more details.</CardDescription>
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            <Button variant={specHoursFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSpecHoursFilter('all')}>All Time</Button>
                            <Button variant={specHoursFilter === 'today' ? 'default' : 'outline'} size="sm" onClick={() => setSpecHoursFilter('today')}>Today</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={specHoursChartConfig} className="w-full h-[300px]">
                            <ResponsiveContainer>
                                <BarChart data={specializationHoursSummary} layout="vertical" onClick={handleBarClick}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={120} />
                                    <RechartsTooltip content={<CustomTooltip context="spec-summary" customConfig={specHoursChartConfig}/>}/>
                                    <Bar dataKey="hours" layout="vertical" radius={[0, 4, 4, 0]}>
                                        {specializationHoursSummary.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={specHoursChartConfig[entry.name]?.color || `hsl(var(--chart-${(index % 5) + 1}))`} cursor="pointer" />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

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
                                    <CartesianGrid strokeDasharray="3 3" />
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
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Hourly Activity Log</CardTitle>
                        <CardDescription>A historical log of your logged activity time, grouped by the hour of the day.</CardDescription>
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-[240px] justify-start text-left font-normal", !selectedActivityDate && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {selectedActivityDate ? format(selectedActivityDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={selectedActivityDate}
                                    onSelect={(date) => {
                                        if (date) setSelectedActivityDate(date);
                                    }}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={hourlyActivityConfig} className="w-full h-[300px]">
                            <ResponsiveContainer>
                                <LineChart data={hourlyActivityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis label={{ value: 'Hours Logged', angle: -90, position: 'insideLeft' }} />
                                    <RechartsTooltip content={<CustomTooltip context="hourly-activity" customConfig={hourlyActivityConfig} />} />
                                    {Object.keys(activityColorMapping).map((key, i) => (
                                      <Line key={key} type="monotone" dataKey={key} name={key} stroke={activityColorMapping[key]} dot={false} />
                                    ))}
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
            <div className="mt-8">
                <h2 className="text-2xl font-bold text-center mb-4">Specialization Trends</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {specializationTrendData.map(({ name, historicalData, color }) => (
                        <Card key={name}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}/>
                                    {name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-48 w-full">
                                {historicalData.length > 1 ? (
                                    <ChartContainer config={{ hours: { label: 'Hours', color: color } }} className="h-full w-full">
                                        <ResponsiveContainer>
                                            <LineChart data={historicalData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" fontSize={10} tickFormatter={(tick) => format(parseISO(tick), 'MMM d')} />
                                                <YAxis fontSize={10} domain={[0, 'dataMax + 2']}/>
                                                <RechartsTooltip content={<CustomTooltip context="spec-trend" customConfig={{'hours': {label: 'Hours'}}}/>} />
                                                <Line type="monotone" dataKey="hours" stroke={color} strokeWidth={2} dot={false} />
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
            {intentionModalData && (
                <Dialog open={!!intentionModalData} onOpenChange={() => setIntentionModalData(null)}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Logged Intentions for "{intentionModalData.specializationName}"</DialogTitle>
                            <DialogDescription>A log of all intentions you have completed for this specialization.</DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] mt-4">
                            <ScrollArea className="h-full pr-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Intention</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {intentionModalData.loggedIntentions.length > 0 ? (
                                            intentionModalData.loggedIntentions.map((intention, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{format(parseISO(intention.date), 'PPP')}</TableCell>
                                                    <TableCell>{intention.name}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={2} className="text-center h-24">No intentions have been logged for this specialization yet.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
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
