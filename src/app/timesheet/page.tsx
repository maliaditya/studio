
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { CalendarIcon, Clock, Filter, BrainCircuit, Coffee, Timer, Moon, Sun, Sunset, MoonStar, CloudSun, Sunrise, Briefcase, BarChart as BarChartIcon, PieChart as PieChartIcon, LineChart as LineChartLucide, Check, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import type { Activity, PauseEvent, ActivityType as ActivityTypeType } from '@/types/workout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, PieChart as RechartsPieChart, Tooltip, Line, LineChart as RechartsLineChart, CartesianGrid, Legend, Pie } from 'recharts';
import { TimeAllocationChart } from '@/components/ProductivitySnapshot';
import { ProductivityInsights } from '@/components/ProductivityInsights';

interface TimesheetPageContentProps {
  isModal?: boolean;
}

type ActivityFilter = "all" | "deepwork" | "upskill" | "deepwork_upskill";
type ViewMode = "day" | "week" | "month";
type TimeAllocationView = "bar" | "pie";

const formatMinutes = (minutes: number) => {
    if (minutes <= 0) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
};

const slotOrder: {name: string, icon: React.ReactNode}[] = [
  { name: 'Late Night', icon: <Moon className="h-5 w-5 text-indigo-400" /> },
  { name: 'Dawn', icon: <Sunrise className="h-5 w-5 text-orange-400" /> },
  { name: 'Morning', icon: <Sun className="h-5 w-5 text-yellow-400" /> },
  { name: 'Afternoon', icon: <CloudSun className="h-5 w-5 text-sky-500" /> },
  { name: 'Evening', icon: <Sunset className="h-5 w-5 text-purple-500" /> },
  { name: 'Night', icon: <MoonStar className="h-5 w-5 text-indigo-500" /> }
];

interface ProcessedActivity extends Activity {
    calculatedDuration: number; // in minutes
}

const activityNameMap: Record<ActivityTypeType, string> = {
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
    pomodoro: 'Pomodoro',
};


const activityColorMapping: Record<string, string> = {
    'Deep Work': 'hsl(var(--chart-4))',
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
    'Untracked Time': 'hsl(var(--muted))',
    'Scheduled': 'hsl(var(--muted))',
    'Free Time': 'hsl(var(--muted))',
    'Mindset': 'hsl(var(--chart-5))',
};


const DayDetailModal = ({ isOpen, onOpenChange, data, allActivitiesData }: { 
    isOpen: boolean; 
    onOpenChange: (open: boolean) => void; 
    data: { date: Date; activities: ProcessedActivity[], pieData: any[] };
    allActivitiesData: { category: string, historicalData: { date: string, time: number }[] }[];
}) => {
  const { date, activities } = data;
  const totalMinutes = activities.reduce((sum, act) => sum + act.calculatedDuration, 0);

  const timeAllocationData = useMemo(() => {
    return data.pieData.map(d => ({
        name: d.name,
        time: d.value,
        activities: d.activities,
    }));
  }, [data.pieData]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Details for {format(date, 'PPP')}</DialogTitle>
          <DialogDescriptionComponent>
            Total time for selected filters: {formatMinutes(totalMinutes)}
          </DialogDescriptionComponent>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base"><PieChartIcon/> Time Allocation</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <TimeAllocationChart timeAllocationData={timeAllocationData} />
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base"><Briefcase /> Productivity Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <ProductivityInsights />
                  </CardContent>
              </Card>
            </div>
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">All Activity Trends</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allActivitiesData.map(({ category, historicalData }) => (
                         <Card key={category}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activityColorMapping[category] || '#8884d8' }}/>
                                    {category}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-32 w-full">
                                {historicalData.length > 1 ? (
                                    <ChartContainer config={{ time: { label: 'Time (min)' } }} className="h-full w-full">
                                        <ResponsiveContainer>
                                            <RechartsLineChart data={historicalData} margin={{ top: 5, right: 10, left: -20, bottom: -10 }}>
                                                <XAxis dataKey="date" fontSize={9} tickFormatter={(tick) => format(parseISO(tick), 'MMM d')} />
                                                <YAxis fontSize={9} domain={[0, 'dataMax + 10']}/>
                                                <Tooltip 
                                                    content={({ active, payload, label }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                        <div className="p-2 bg-background border rounded-md text-xs shadow-lg max-w-sm">
                                                            <p>{format(parseISO(label), 'PPP')}: <strong>{formatMinutes(payload[0].value as number)}</strong></p>
                                                        </div>
                                                        )
                                                    }
                                                    return null;
                                                    }}
                                                />
                                                <Line type="monotone" dataKey="time" stroke={activityColorMapping[category] || 'hsl(var(--primary))'} strokeWidth={2} dot={false} />
                                            </RechartsLineChart>
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
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};


export function TimesheetPageContent({ isModal = false }: TimesheetPageContentProps) {
    const { schedule, allDeepWorkLogs, allUpskillLogs, activityDurations, allWorkoutLogs, brandingLogs, allLeadGenLogs, allMindProgrammingLogs } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("day");
    const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
    const [modalData, setModalData] = useState<{ date: Date; activities: ProcessedActivity[], pieData: any[] } | null>(null);

    const handlePrev = () => {
        if (viewMode === 'day') {
            setSelectedDate(prev => subDays(prev, 1));
        } else if (viewMode === 'week') {
            setSelectedDate(prev => subWeeks(prev, 1));
        } else if (viewMode === 'month') {
            setSelectedDate(prev => subMonths(prev, 1));
        }
    };

    const handleNext = () => {
        if (viewMode === 'day') {
            setSelectedDate(prev => addDays(prev, 1));
        } else if (viewMode === 'week') {
            setSelectedDate(prev => addWeeks(prev, 1));
        } else if (viewMode === 'month') {
            setSelectedDate(prev => addMonths(prev, 1));
        }
    };

    const timeData = useMemo(() => {
        const getLoggedMinutes = (activity: Activity, dateKey: string): number => {
            if (!activity.completed) return 0;
    
            // Handle focus sessions first
            if (activity.focusSessionInitialStartTime && activity.focusSessionEndTime) {
                const totalSessionMs = activity.focusSessionEndTime - activity.focusSessionInitialStartTime;
                const pauseDurationsMs = (activity.focusSessionPauses || [])
                    .filter(p => p.resumeTime)
                    .reduce((sum, p) => sum + (p.resumeTime! - p.pauseTime), 0);
                const totalWorkTimeMs = totalSessionMs - pauseDurationsMs;
                return Math.round(totalWorkTimeMs / 60000);
            }
            
            // Fallback for simple duration-based activities if no focus session
            if (activity.duration) {
                return activity.duration;
            }

            // Fallback for older log types if necessary
            const activityTaskInstanceIds = new Set(activity.taskIds || []);
            if (activityTaskInstanceIds.size === 0) return 0;
            
            const findDurationInLogs = (logs: any[], durationField: 'reps' | 'weight') => {
                const logForDay = logs.find(l => l.date === dateKey);
                if (!logForDay) return 0;
                return logForDay.exercises
                    .filter((ex: any) => activityTaskInstanceIds.has(ex.id))
                    .reduce((sum: number, ex: any) => sum + (ex.loggedSets || []).reduce((setSum: number, set: any) => setSum + (set[durationField] || 0), 0), 0);
            };

            switch(activity.type) {
                case 'deepwork': return findDurationInLogs(allDeepWorkLogs, 'weight');
                case 'upskill': return findDurationInLogs(allUpskillLogs, 'reps');
                case 'branding': return findDurationInLogs(brandingLogs, 'weight');
                case 'lead-generation': return findDurationInLogs(allLeadGenLogs, 'weight');
                case 'workout': return findDurationInLogs(allWorkoutLogs, 'reps');
                case 'mindset': return findDurationInLogs(allMindProgrammingLogs, 'reps');
                default: return 0;
            }
        };

        const filterActivity = (activity: Activity): boolean => {
            if (activityFilter === 'all') return true;
            if (activityFilter === 'deepwork') return activity.type === 'deepwork';
            if (activityFilter === 'upskill') return activity.type === 'upskill';
            if (activityFilter === 'deepwork_upskill') return activity.type === 'deepwork' || activity.type === 'upskill';
            return false;
        };

        let startDate, endDate;
        if (viewMode === 'week') {
            startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
            endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
        } else if (viewMode === 'month') {
            startDate = startOfMonth(selectedDate);
            endDate = endOfMonth(selectedDate);
        } else {
            startDate = endDate = selectedDate;
        }

        const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
        
        const dailyData: Record<string, { activities: ProcessedActivity[]; pieData: { name: string; value: number, activities: any[] }[] }> = {};
        
        for (const day of dateRange) {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dailySchedule = schedule[dateKey] || {};
            const processedActivities: ProcessedActivity[] = [];
            
            slotOrder.forEach(slot => {
                const activities = dailySchedule[slot.name] as Activity[] | undefined;
                if (activities) {
                    activities.forEach(activity => {
                        if (filterActivity(activity)) {
                            let duration = getLoggedMinutes(activity, dateKey);
                            
                            if (duration > 0) {
                                processedActivities.push({ ...activity, slot: slot.name, calculatedDuration: duration });
                            }
                        }
                    });
                }
            });

            const totals: Record<string, { time: number; activities: { name: string; duration: number }[] }> = {};
            
            processedActivities.forEach(activity => {
                const effectiveType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
                const mappedName = activityNameMap[effectiveType];
                if (mappedName) {
                    if (!totals[mappedName]) totals[mappedName] = { time: 0, activities: [] };
                    totals[mappedName].time += activity.calculatedDuration;
                    totals[mappedName].activities.push({ name: activity.details, duration: activity.calculatedDuration });
                }
            });

            const allocatedMinutes = Object.values(totals).reduce((sum, t) => sum + t.time, 0);
            const freeTime = (24 * 60) - allocatedMinutes;
            
            const pieData = Object.entries(totals).map(([name, data]) => ({ name, value: data.time, activities: data.activities }));
            if (freeTime > 0) pieData.push({ name: 'Free Time', value: freeTime, activities: [] });


            dailyData[dateKey] = { activities: processedActivities, pieData };
        }

        return { dailyData };
    }, [selectedDate, viewMode, activityFilter, schedule, allDeepWorkLogs, allUpskillLogs, allWorkoutLogs, brandingLogs, allLeadGenLogs, allMindProgrammingLogs, activityDurations]);
    
    const allActivitiesData = useMemo(() => {
        const categories = Object.values(activityNameMap);
        const thirtyDaysAgo = subDays(new Date(), 30);

        return categories.map(category => {
          const dailyTotals: Record<string, number> = {};
          
          Object.entries(schedule).forEach(([date, dailySchedule]) => {
            const logDate = parseISO(date);
            if (logDate < thirtyDaysAgo) return;

            if (!dailyTotals[date]) dailyTotals[date] = 0;
            
            Object.values(dailySchedule).flat().forEach((activity: Activity) => {
              if (activity && activity.completed) {
                const effectiveActivityType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
                if (activityNameMap[effectiveActivityType] === category) {
                    const duration = activity.duration || 0;
                    dailyTotals[date] += duration;
                }
              }
            });
          });
          
          const historicalData = Object.entries(dailyTotals)
            .filter(([, time]) => time > 0)
            .map(([date, time]) => ({ date, time }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
          return {
            category,
            historicalData,
          };
        }).filter(item => item.historicalData.length > 0);
    }, [schedule, activityDurations]);

    const timeAllocationData = useMemo(() => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const dayData = timeData.dailyData[dateKey];
        if (!dayData) return [];
        return dayData.pieData.map(d => ({
            name: d.name,
            time: d.value,
            activities: d.activities,
        }));
    }, [selectedDate, timeData]);
    

    const renderDayView = () => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const dayData = timeData.dailyData[dateKey];
        const activitiesForDay = dayData?.activities || [];
    
        return (
            <div className="space-y-6">
                 {!isModal && (
                    <CardHeader className="text-center">
                        <CardTitle>Day View: {format(selectedDate, 'PPP')}</CardTitle>
                        <CardDescription>A summary of your logged time for the selected day.</CardDescription>
                    </CardHeader>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <Card className={cn(isModal ? 'bg-transparent border-0 shadow-none' : '')}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base"><PieChartIcon/> Time Allocation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TimeAllocationChart timeAllocationData={timeAllocationData} />
                        </CardContent>
                    </Card>
                    <Card className={cn(isModal ? 'bg-transparent border-0 shadow-none' : '')}>
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base"><Briefcase /> Productivity Insights</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ProductivityInsights />
                        </CardContent>
                    </Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {slotOrder.map(slot => {
                        const activitiesInSlot = activitiesForDay.filter(act => act.slot === slot.name);
                        
                        const productiveTime = activitiesInSlot
                            .filter(a => ['deepwork', 'upskill', 'branding', 'lead-generation', 'planning', 'tracking', 'workout', 'mindset', 'essentials', 'nutrition', 'pomodoro'].includes(a.type))
                            .reduce((sum, act) => sum + act.calculatedDuration, 0);

                        const unproductiveTime = 240 - productiveTime;

                        const allTasksInSlot = schedule[dateKey]?.[slot.name as keyof typeof schedule[string]] || [];
                        const totalTasks = Array.isArray(allTasksInSlot) ? allTasksInSlot.length : 0;
                        const completedTasks = Array.isArray(allTasksInSlot) ? allTasksInSlot.filter(a => a.completed).length : 0;

                        return (
                            <Card key={slot.name}>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-lg">
                                            {slot.icon}
                                            {slot.name}
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Productive Time</span>
                                            <span className="font-bold text-green-500">{formatMinutes(productiveTime)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Unproductive Time</span>
                                            <span className="font-bold text-red-500">{formatMinutes(unproductiveTime)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Tasks Completed</span>
                                            <span className="font-bold">{completedTasks} / {totalTasks}</span>
                                        </div>
                                    </div>
                                    {activitiesInSlot.length > 0 && (
                                        <div className="pt-2 border-t">
                                            <ul className="space-y-1">
                                                {activitiesInSlot.map(act => (
                                                    <li key={act.id} className="text-xs flex justify-between">
                                                        <span className="truncate pr-2" title={act.details}>{act.details}</span>
                                                        <span className="font-medium text-muted-foreground">{formatMinutes(act.calculatedDuration)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekRange = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Week View: {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}</CardTitle>
                    <CardDescription>A summary of your time for the selected week. Click a card for details.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs mb-4">
                        {Object.keys(activityColorMapping).map((name) => (
                            <div key={name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activityColorMapping[name] || '#8884d8' }}/>
                                <span>{name}</span>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {weekRange.map(day => {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            const dayData = timeData.dailyData[dateKey];
                            const activities = dayData?.activities || [];
                            const pieData = dayData?.pieData || [];
                            const totalDayMinutes = activities.reduce((sum, act) => sum + act.calculatedDuration, 0);

                            return (
                                <Card 
                                    key={dateKey} 
                                    onClick={() => setModalData({ date: day, activities, pieData })}
                                    className={cn("cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 hover:bg-accent flex flex-col", isSameDay(day, new Date()) && "bg-muted")}
                                >
                                    <CardHeader className="p-3 pb-0">
                                    <CardTitle className="text-base flex justify-between items-center">
                                        <span>{format(day, 'EEE, MMM d')}</span>
                                        <span className="font-mono text-sm text-muted-foreground">{formatMinutes(totalDayMinutes)}</span>
                                    </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-2 flex-grow flex items-center justify-center">
                                        {pieData.length > 0 ? (
                                            <ChartContainer config={{}} className="h-32 w-32">
                                                <ResponsiveContainer>
                                                    <RechartsPieChart>
                                                        <ChartTooltip
                                                            content={({ active, payload }) => {
                                                                if (active && payload && payload.length) {
                                                                    const data = payload[0].payload;
                                                                    const categoryName = data.name;
                                                                    const categoryActivities = data.activities || [];
                                                                    return (
                                                                        <div className="grid min-w-[12rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                                            <p className="font-bold text-foreground">{categoryName}: {formatMinutes(data.value)}</p>
                                                                            {categoryActivities.length > 0 && <Separator />}
                                                                            <ul className="space-y-1">
                                                                                {categoryActivities.map((act: any, index: number) => (
                                                                                    <li key={index} className="text-muted-foreground">{act.name} ({formatMinutes(act.duration)})</li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            }}
                                                        />
                                                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" stroke="hsl(var(--background))" strokeWidth={2}>
                                                            {pieData.map((entry) => (
                                                                <Cell key={`cell-${entry.name}`} fill={activityColorMapping[entry.name] || '#8884d8'} />
                                                            ))}
                                                        </Pie>
                                                    </RechartsPieChart>
                                                </ResponsiveContainer>
                                            </ChartContainer>
                                        ) : (
                                            <p className="text-xs text-center text-muted-foreground p-4">No activities</p>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const renderMonthView = () => {
        const startDate = startOfMonth(selectedDate);
        const endDate = endOfMonth(selectedDate);
        const monthRange = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Month View: {format(selectedDate, 'MMMM yyyy')}</CardTitle>
                    <CardDescription>A high-level overview of your time this month. Click a card for details.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs mb-4">
                        {Object.keys(activityColorMapping).map((name) => (
                            <div key={name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activityColorMapping[name] || '#8884d8' }}/>
                                <span>{name}</span>
                            </div>
                        ))}
                    </div>
                    <ScrollArea className="h-[60vh] pr-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {monthRange.map(day => {
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const dayData = timeData.dailyData[dateKey];
                                if (!dayData || dayData.activities.length === 0) return null;

                                const activities = dayData.activities;
                                const pieData = dayData.pieData;
                                const totalDayMinutes = activities.reduce((sum, act) => sum + act.calculatedDuration, 0);

                                return (
                                    <Card 
                                        key={dateKey} 
                                        onClick={() => setModalData({ date: day, activities, pieData })}
                                        className={cn("cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 hover:bg-accent flex flex-col", isSameDay(day, new Date()) && "bg-muted")}
                                    >
                                        <CardHeader className="p-3 pb-0">
                                        <CardTitle className="text-base flex justify-between items-center">
                                            <span>{format(day, 'EEE, MMM d')}</span>
                                            <span className="font-mono text-sm text-muted-foreground">{formatMinutes(totalDayMinutes)}</span>
                                        </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-2 flex-grow flex items-center justify-center">
                                            <ChartContainer config={{}} className="h-32 w-32">
                                                <ResponsiveContainer>
                                                    <RechartsPieChart>
                                                        <ChartTooltip
                                                            content={({ active, payload }) => {
                                                                if (active && payload && payload.length) {
                                                                    const data = payload[0].payload;
                                                                    const categoryName = data.name;
                                                                    const categoryActivities = data.activities || [];
                                                                    return (
                                                                        <div className="grid min-w-[12rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                                            <p className="font-bold text-foreground">{categoryName}: {formatMinutes(data.value)}</p>
                                                                            {categoryActivities.length > 0 && <Separator />}
                                                                            <ul className="space-y-1">
                                                                                {categoryActivities.map((act: any, index: number) => (
                                                                                    <li key={index} className="text-muted-foreground">{act.name} ({formatMinutes(act.duration)})</li>
                                                                                ))}
                                                                            </ul>
                                                                        </div>
                                                                    );
                                                                }
                                                                return null;
                                                            }}
                                                        />
                                                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" stroke="hsl(var(--background))" strokeWidth={2}>
                                                            {pieData.map((entry) => (
                                                                <Cell key={`cell-${entry.name}`} fill={activityColorMapping[entry.name] || '#8884d8'} />
                                                            ))}
                                                        </Pie>
                                                    </RechartsPieChart>
                                                </ResponsiveContainer>
                                            </ChartContainer>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className={cn("container mx-auto", isModal ? "p-0 h-full flex flex-col bg-transparent" : "p-4 sm:p-6 lg:p-8")}>
            <Card className={cn(isModal && "border-0 shadow-none flex-grow flex flex-col min-h-0 bg-transparent")}>
                 {!isModal && (
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Clock /> Timesheet</CardTitle>
                        <CardDescription>Review your logged time. Durations for Deep Work and Upskill tasks are calculated from your logged sessions.</CardDescription>
                    </CardHeader>
                )}
                <CardContent className={cn("space-y-6", isModal ? "p-4 flex-grow min-h-0 flex flex-col" : "")}>
                    <div className="flex flex-wrap items-center gap-4 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className="w-auto sm:w-[240px] justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(selectedDate, 'PPP')}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <Button variant="outline" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-auto">
                            <TabsList>
                                <TabsTrigger value="day">Day</TabsTrigger>
                                <TabsTrigger value="week">Week</TabsTrigger>
                                <TabsTrigger value="month">Month</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="flex items-center gap-2">
                             <Filter className="h-4 w-4 text-muted-foreground"/>
                             <Select value={activityFilter} onValueChange={(v) => setActivityFilter(v as ActivityFilter)}>
                                <SelectTrigger className="w-auto sm:w-[200px]">
                                    <SelectValue placeholder="Filter activities..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Activities</SelectItem>
                                    <SelectItem value="deepwork">Deep Work Only</SelectItem>
                                    <SelectItem value="upskill">Upskill Only</SelectItem>
                                    <SelectItem value="deepwork_upskill">Deep Work + Upskill</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className={cn(isModal && "flex-grow min-h-0")}>
                        <ScrollArea className={cn(isModal && "h-full")}>
                            {viewMode === 'day' && renderDayView()}
                            {viewMode === 'week' && renderWeekView()}
                            {viewMode === 'month' && renderMonthView()}
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>
            
            {modalData && (
                <DayDetailModal 
                    isOpen={!!modalData}
                    onOpenChange={() => setModalData(null)}
                    data={modalData}
                    allActivitiesData={allActivitiesData}
                />
            )}
        </div>
    );
}


export default function TimesheetPage() {
    return (
        <AuthGuard>
            <TimesheetPageContent />
        </AuthGuard>
    );
}

