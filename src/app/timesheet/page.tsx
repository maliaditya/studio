
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfDay, isAfter, getDay, differenceInMonths, differenceInDays } from 'date-fns';
import { CalendarIcon, Clock, Filter, BrainCircuit, Coffee, Timer, Moon, Sun, Sunset, MoonStar, CloudSun, Sunrise, Briefcase, BarChart as BarChartIcon, PieChart as PieChartIcon, LineChart as LineChartLucide, Check, CheckCircle, XCircle, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import type { Activity, PauseEvent, ActivityType as ActivityTypeType, MindsetPoint } from '@/types/workout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, PieChart as RechartsPieChart, Tooltip, Line, LineChart as RechartsLineChart, CartesianGrid, Legend, Pie } from 'recharts';
import { TimeAllocationChart } from '@/components/ProductivitySnapshot';
import { ProductivityInsights } from '@/components/ProductivityInsights';

interface TimesheetPageContentProps {
  isModal?: boolean;
  modalTab?: 'timesheet' | 'habit-dashboard';
  onModalTabChange?: (tab: 'timesheet' | 'habit-dashboard') => void;
  showModalTabs?: boolean;
  dashboardMonth?: Date;
  onDashboardMonthChange?: (nextMonth: Date) => void;
  showHabitDashboardMonthControls?: boolean;
}

type ActivityFilter = "all" | "deepwork" | "upskill" | "deepwork_upskill";
type ViewMode = "day" | "week" | "month";
type TimeAllocationView = "bar" | "pie";

type HabitDashboardMonthControlsProps = {
    month: Date;
    onChange: (direction: -1 | 1) => void;
    className?: string;
};

export function HabitDashboardMonthControls({ month, onChange, className }: HabitDashboardMonthControlsProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Button variant="outline" size="icon" onClick={() => onChange(-1)}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 py-2 rounded-md border border-muted/50 bg-muted/30 text-sm font-semibold">
                {format(month, 'MMMM yyyy')}
            </div>
            <Button variant="outline" size="icon" onClick={() => onChange(1)}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}

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

const activityTypeIcons: Record<ActivityTypeType, React.ReactNode> = {
    deepwork: <Briefcase className="h-4 w-4" />,
    upskill: <BrainCircuit className="h-4 w-4" />,
    workout: <Timer className="h-4 w-4" />,
    mindset: <BrainCircuit className="h-4 w-4" />,
    branding: <BarChartIcon className="h-4 w-4" />,
    essentials: <CheckCircle className="h-4 w-4" />,
    planning: <CalendarIcon className="h-4 w-4" />,
    tracking: <Check className="h-4 w-4" />,
    'lead-generation': <Coffee className="h-4 w-4" />,
    interrupt: <XCircle className="h-4 w-4" />,
    distraction: <XCircle className="h-4 w-4" />,
    nutrition: <Coffee className="h-4 w-4" />,
    pomodoro: <Timer className="h-4 w-4" />,
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
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
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
                      <ProductivityInsights activities={activities} date={date} />
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

const getLoggedMinutes = (activity: Activity, allDeepWorkLogs: any[], allUpskillLogs: any[], brandingLogs: any[], allLeadGenLogs: any[], allWorkoutLogs: any[], allMindProgrammingLogs: any[], dateKey: string): number => {
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

export function TimesheetPageContent({
    isModal = false,
    modalTab,
    onModalTabChange,
    showModalTabs = true,
    dashboardMonth,
    onDashboardMonthChange,
    showHabitDashboardMonthControls,
}: TimesheetPageContentProps) {
    const {
        schedule,
        allDeepWorkLogs,
        allUpskillLogs,
        allWorkoutLogs,
        brandingLogs,
        allLeadGenLogs,
        allMindProgrammingLogs,
        upskillDefinitions,
        deepWorkDefinitions,
        microSkillMap,
        mindsetCards,
    } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("day");
    const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
    const [modalData, setModalData] = useState<{ date: Date; activities: ProcessedActivity[], pieData: any[] } | null>(null);
    const [localModalTab, setLocalModalTab] = useState<'timesheet' | 'habit-dashboard'>('habit-dashboard');
    const [localDashboardMonth, setLocalDashboardMonth] = useState(startOfMonth(new Date()));
    const [collapsedHabitGroups, setCollapsedHabitGroups] = useState<Record<string, boolean>>({});
    const [collapsedSpecializations, setCollapsedSpecializations] = useState<Record<string, boolean>>({});
    const [habitDashboardTab, setHabitDashboardTab] = useState<'daily' | 'botherings'>('botherings');
    const [collapsedBotherings, setCollapsedBotherings] = useState<Record<string, boolean>>({});
    const dashboardOuterRef = useRef<HTMLDivElement>(null);
    const dashboardInnerRef = useRef<HTMLDivElement>(null);
    const [dashboardScale, setDashboardScale] = useState(1);
    const effectiveDashboardMonth = dashboardMonth ?? localDashboardMonth;
    const setEffectiveDashboardMonth = onDashboardMonthChange ?? setLocalDashboardMonth;

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

    const handleDashboardMonthChange = (direction: -1 | 1) => {
        const newMonth = new Date(effectiveDashboardMonth);
        newMonth.setMonth(newMonth.getMonth() + direction);
        setEffectiveDashboardMonth(startOfMonth(newMonth));
    };

    const shouldShowHabitDashboardMonthControls = showHabitDashboardMonthControls ?? !isModal;

    useEffect(() => {
        const outer = dashboardOuterRef.current;
        const inner = dashboardInnerRef.current;
        if (!outer || !inner) return;

        const updateScale = () => {
            const outerWidth = outer.clientWidth || 1;
            const innerWidth = inner.scrollWidth || 1;
            const nextScale = Math.min(1, outerWidth / innerWidth);
            setDashboardScale(prev => (Math.abs(prev - nextScale) > 0.01 ? nextScale : prev));
        };

        updateScale();
        const observer = new ResizeObserver(() => updateScale());
        observer.observe(outer);
        observer.observe(inner);
        return () => observer.disconnect();
    }, [effectiveDashboardMonth]);

    const timeData = useMemo(() => {
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
                            let duration = getLoggedMinutes(activity, allDeepWorkLogs, allUpskillLogs, brandingLogs, allLeadGenLogs, allWorkoutLogs, allMindProgrammingLogs, dateKey);
                            
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
    }, [selectedDate, viewMode, activityFilter, schedule, allDeepWorkLogs, allUpskillLogs, allWorkoutLogs, brandingLogs, allLeadGenLogs, allMindProgrammingLogs]);
    
    const allActivitiesData = useMemo(() => {
        const categories = Object.values(activityNameMap);
        
        const historicalData: Record<string, { date: string, time: number }[]> = {};

        Object.entries(schedule).forEach(([date, dailySchedule]) => {
            Object.values(dailySchedule).flat().forEach((activity: Activity) => {
                if (activity && activity.completed) {
                    const effectiveActivityType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
                    const category = activityNameMap[effectiveActivityType];
                    const duration = getLoggedMinutes(activity, allDeepWorkLogs, allUpskillLogs, brandingLogs, allLeadGenLogs, allWorkoutLogs, allMindProgrammingLogs, date);
                    if (category && duration > 0) {
                        if (!historicalData[category]) historicalData[category] = [];
                        
                        const dayEntry = historicalData[category].find(d => d.date === date);
                        if (dayEntry) {
                            dayEntry.time += duration;
                        } else {
                            historicalData[category].push({ date, time: duration });
                        }
                    }
                }
            });
        });

        Object.values(historicalData).forEach(data => data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        
        return categories.map(category => ({
            category,
            historicalData: historicalData[category] || [],
        })).filter(item => item.historicalData.length > 0);
    }, [schedule, allDeepWorkLogs, allUpskillLogs, allWorkoutLogs, brandingLogs, allLeadGenLogs, allMindProgrammingLogs]);

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
    
    const dayViewActivities = useMemo(() => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        return timeData.dailyData[dateKey]?.activities || [];
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
                            <ProductivityInsights activities={dayViewActivities} date={selectedDate}/>
                        </CardContent>
                    </Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {slotOrder.map(slot => {
                        const activitiesInSlot = activitiesForDay.filter(act => act.slot === slot.name);
                        
                        const productiveTime = activitiesInSlot
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

    const habitDashboard = useMemo(() => {
        const daysInMonth = eachDayOfInterval({
            start: startOfMonth(effectiveDashboardMonth),
            end: endOfMonth(effectiveDashboardMonth),
        });

        const monthActivities = daysInMonth.flatMap(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const daySchedule = schedule[dateKey] || {};
            const allSlots = Object.values(daySchedule) as Activity[][];
            return allSlots.flat();
        });

        const getHabitKey = (activity: Activity) => {
            const effectiveType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
            const name = activity.details.trim();
            if (!name) return null;
            return `${effectiveType}::${name}`;
        };

        const habitCounts = new Map<string, { count: number; type: ActivityTypeType; name: string }>();
        monthActivities.forEach(activity => {
            const effectiveType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
            const key = getHabitKey(activity);
            if (!key) return;
            const current = habitCounts.get(key);
            if (current) {
                current.count += 1;
            } else {
                habitCounts.set(key, { count: 1, type: effectiveType as ActivityTypeType, name: activity.details.trim() });
            }
        });

        const monthTypeCounts = new Map<string, number>();
        monthActivities.forEach(activity => {
            const effectiveType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
            const name = activityNameMap[effectiveType] || effectiveType;
            monthTypeCounts.set(name, (monthTypeCounts.get(name) || 0) + 1);
        });

        const monthTypeData = Array.from(monthTypeCounts.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const habits = Array.from(habitCounts.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 12)
            .map(([, meta]) => ({ name: meta.name, type: meta.type }));

        const habitsByType = habits.reduce((acc, habit) => {
            const key = habit.type;
            if (!acc[key]) acc[key] = [];
            acc[key].push(habit);
            return acc;
        }, {} as Record<string, { name: string; type: ActivityTypeType }[]>);

        const getSpecializationForHabit = (habit: { name: string; type: ActivityTypeType }) => {
            if (habit.type !== 'deepwork' && habit.type !== 'upskill') return null;
            const defs = habit.type === 'deepwork' ? deepWorkDefinitions : upskillDefinitions;
            const def = defs.find(d => d.name.trim() === habit.name.trim());
            const microSkillName = def?.category;
            if (!microSkillName) return null;
            const microSkillInfo = Array.from(microSkillMap.values()).find(ms => ms.microSkillName === microSkillName);
            return microSkillInfo?.coreSkillName || microSkillName;
        };

        const getGroupedHabitsForType = (type: ActivityTypeType, list: { name: string; type: ActivityTypeType }[]) => {
            if (type !== 'deepwork' && type !== 'upskill') {
                return [{ label: null as string | null, habits: list }];
            }
            const groups = new Map<string, { name: string; type: ActivityTypeType }[]>();
            list.forEach(habit => {
                const specialization = getSpecializationForHabit(habit);
                if (!specialization) return;
                const bucket = groups.get(specialization) || [];
                bucket.push(habit);
                groups.set(specialization, bucket);
            });
            return Array.from(groups.entries()).map(([label, habits]) => ({ label, habits }));
        };

        const orderedTypes = Object.keys(habitsByType).sort((a, b) => {
            const aName = activityNameMap[a] || a;
            const bName = activityNameMap[b] || b;
            return aName.localeCompare(bName);
        });

        const dayActivityMaps = new Map<string, Map<string, Activity>>();
        daysInMonth.forEach(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const daySchedule = schedule[dateKey] || {};
            const allSlots = Object.values(daySchedule) as Activity[][];
            const activityMap = new Map<string, Activity>();
            allSlots.flat().forEach(act => {
                if (act?.id) activityMap.set(act.id, act);
            });
            dayActivityMaps.set(dateKey, activityMap);
        });

        const botherings = ['mindset_botherings_mismatch', 'mindset_botherings_constraint', 'mindset_botherings_external']
            .map(id => mindsetCards.find(c => c.id === id))
            .flatMap(card => card?.points || [])
            .filter(point => (point.tasks?.length || 0) > 0 && !point.completed)
            .map(point => ({
                id: point.id,
                text: point.text,
                endDate: point.endDate,
                tasks: point.tasks || [],
            }));

        const isTaskDueOnDate = (task: MindsetPoint['tasks'][number], dateKey: string) => {
            const startKey = task.startDate || task.dateKey;
            if (!startKey) return false;
            const start = parseISO(startKey);
            const date = parseISO(dateKey);
            if (Number.isNaN(start.getTime()) || Number.isNaN(date.getTime())) return false;
            if (isAfter(startOfDay(start), startOfDay(date))) return false;
            if (task.recurrence === 'daily') return true;
            if (task.recurrence === 'weekly') return getDay(start) === getDay(date);
            if (task.recurrence === 'custom') {
                const interval = Math.max(1, task.repeatInterval || 1);
                if (task.repeatUnit === 'month') {
                    if (start.getDate() !== date.getDate()) return false;
                    const diffMonths = differenceInMonths(date, start);
                    return diffMonths >= 0 && diffMonths % interval === 0;
                }
                if (task.repeatUnit === 'week') {
                    const diffDays = differenceInDays(date, start);
                    return diffDays >= 0 && diffDays % (interval * 7) === 0;
                }
                const diffDays = differenceInDays(date, start);
                return diffDays >= 0 && diffDays % interval === 0;
            }
            return startKey === dateKey;
        };
        const isTaskCompletedOnDate = (task: MindsetPoint['tasks'][number], dateKey: string, activityMap: Map<string, Activity>) => {
            if (task.recurrence && task.recurrence !== 'none') {
                return !!task.completionHistory?.[dateKey];
            }
            const activity = activityMap.get(task.activityId || task.id);
            if (activity) return !!activity.completed;
            if (task.dateKey && task.dateKey !== dateKey) return false;
            return !!task.completed;
        };

        const dayCompletion = daysInMonth.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const daySchedule = schedule[dateKey] || {};
            const allSlots = Object.values(daySchedule) as Activity[][];
            const activities = allSlots.flat();
            const habitSet = new Map<string, Activity[]>();
            activities.forEach(activity => {
                const key = getHabitKey(activity);
                if (!key) return;
                const bucket = habitSet.get(key) || [];
                bucket.push(activity);
                habitSet.set(key, bucket);
            });

            let total = 0;
            let completed = 0;
            habits.forEach(habit => {
                const habitKey = `${habit.type}::${habit.name}`;
                const acts = habitSet.get(habitKey);
                if (!acts) return;
                total += 1;
                if (acts.some(act => {
                    const effectiveType = act.type === 'pomodoro' && act.linkedActivityType ? act.linkedActivityType : act.type;
                    return effectiveType === habit.type && act.completed;
                })) completed += 1;
            });

            const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
            return { date: day, percent, completed, total };
        });

        const dayBotheringCompletion = daysInMonth.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const activityMap = dayActivityMaps.get(dateKey) || new Map();
            let total = 0;
            let completed = 0;
            botherings.forEach(b => {
                b.tasks.forEach(task => {
                    if (!isTaskDueOnDate(task, dateKey)) return;
                    total += 1;
                    if (isTaskCompletedOnDate(task, dateKey, activityMap)) completed += 1;
                });
            });
            const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
            return { date: day, percent, completed, total };
        });

        const overallTotal = (habitDashboardTab === 'botherings' ? dayBotheringCompletion : dayCompletion)
            .reduce((sum, day) => sum + day.total, 0);
        const overallCompleted = (habitDashboardTab === 'botherings' ? dayBotheringCompletion : dayCompletion)
            .reduce((sum, day) => sum + day.completed, 0);
        const overallPercent = overallTotal === 0 ? 0 : Math.round((overallCompleted / overallTotal) * 100);

        const maxBar = Math.max(1, ...(habitDashboardTab === 'botherings' ? dayBotheringCompletion : dayCompletion).map(day => day.percent));
        const isAltWeek = (index: number) => Math.floor(index / 7) % 2 === 1;

        const habitTotals = habits.map(habit => {
            let totalMinutes = 0;
            daysInMonth.forEach(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const daySchedule = schedule[dateKey] || {};
                const allSlots = Object.values(daySchedule) as Activity[][];
                const activities = allSlots.flat();
                const habitKey = `${habit.type}::${habit.name}`;
                const matches = activities.filter(act => getHabitKey(act) === habitKey);
                matches.forEach(act => {
                    totalMinutes += getLoggedMinutes(act, allDeepWorkLogs, allUpskillLogs, brandingLogs, allLeadGenLogs, allWorkoutLogs, allMindProgrammingLogs, dateKey);
                });
            });
            return { habitKey: `${habit.type}::${habit.name}`, totalMinutes };
        });
        const maxHabitMinutes = Math.max(1, ...habitTotals.map(h => h.totalMinutes));

        const dayTotals = daysInMonth.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const daySchedule = schedule[dateKey] || {};
            const allSlots = Object.values(daySchedule) as Activity[][];
            const activities = allSlots.flat();
            const totalMinutes = activities.reduce((sum, act) => {
                return sum + getLoggedMinutes(act, allDeepWorkLogs, allUpskillLogs, brandingLogs, allLeadGenLogs, allWorkoutLogs, allMindProgrammingLogs, dateKey);
            }, 0);
            return { date: day, totalMinutes };
        });
        const maxDayMinutes = Math.max(1, ...dayTotals.map(d => d.totalMinutes));

        const botheringTotals = botherings.map(b => {
            let totalMinutes = 0;
            daysInMonth.forEach(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const activityMap = dayActivityMaps.get(dateKey) || new Map();
                b.tasks.forEach(task => {
                    if (!isTaskDueOnDate(task, dateKey)) return;
                    if (!isTaskCompletedOnDate(task, dateKey, activityMap)) return;
                    const act = activityMap.get(task.activityId || task.id);
                    if (act) {
                        totalMinutes += getLoggedMinutes(act, allDeepWorkLogs, allUpskillLogs, brandingLogs, allLeadGenLogs, allWorkoutLogs, allMindProgrammingLogs, dateKey);
                    }
                });
            });
            return { id: b.id, totalMinutes };
        });
        const maxBotheringMinutes = Math.max(1, ...botheringTotals.map(b => b.totalMinutes));

        const botheringsDayTotals = daysInMonth.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const activityMap = dayActivityMaps.get(dateKey) || new Map();
            let totalMinutes = 0;
            botherings.forEach(b => {
                b.tasks.forEach(task => {
                    if (!isTaskDueOnDate(task, dateKey)) return;
                    if (!isTaskCompletedOnDate(task, dateKey, activityMap)) return;
                    const act = activityMap.get(task.activityId || task.id);
                    if (act) {
                        totalMinutes += getLoggedMinutes(act, allDeepWorkLogs, allUpskillLogs, brandingLogs, allLeadGenLogs, allWorkoutLogs, allMindProgrammingLogs, dateKey);
                    }
                });
            });
            return { date: day, totalMinutes };
        });
        const maxBotheringsDayMinutes = Math.max(1, ...botheringsDayTotals.map(d => d.totalMinutes));

        const groupTotals = orderedTypes.map(type => {
            const groupHabits = habitsByType[type] || [];
            const totalMinutes = groupHabits.reduce((sum, habit) => {
                const habitKey = `${habit.type}::${habit.name}`;
                return sum + (habitTotals.find(h => h.habitKey === habitKey)?.totalMinutes || 0);
            }, 0);
            return { type, totalMinutes };
        });
        const maxGroupMinutes = Math.max(1, ...groupTotals.map(g => g.totalMinutes));

        return (
            <div ref={dashboardOuterRef} className="w-full overflow-hidden">
                <div ref={dashboardInnerRef} className="origin-top-left" style={{ zoom: dashboardScale } as React.CSSProperties}>
            <div className="grid gap-6 w-full">
                {shouldShowHabitDashboardMonthControls && (
                    <div className="flex flex-wrap items-center gap-4">
                        <HabitDashboardMonthControls
                            month={effectiveDashboardMonth}
                            onChange={handleDashboardMonthChange}
                        />
                        <Tabs value={habitDashboardTab} onValueChange={(v) => setHabitDashboardTab(v as 'daily' | 'botherings')}>
                            <TabsList>
                                <TabsTrigger value="daily">Daily Habits</TabsTrigger>
                                <TabsTrigger value="botherings">Botherings</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                )}

                <div className="overflow-y-auto overflow-x-hidden border border-muted/50 rounded-xl bg-card/50 w-full">
                    <div className="min-w-full px-4">
                        <div
                            className="grid gap-0 text-xs"
                            style={{ gridTemplateColumns: `260px repeat(${daysInMonth.length}, minmax(16px, 1fr)) 140px` }}
                        >
                            <div className="h-40 px-2 flex flex-col justify-center gap-2 text-xs text-muted-foreground border-b border-muted/30">
                                <div className="flex items-center gap-4">
                                    <div className="h-20 w-20 rounded-full border-4 border-emerald-400/30 flex items-center justify-center text-base font-bold text-emerald-300">
                                        {overallPercent}%
                                    </div>
                                    <div className="space-y-1 text-[13px] text-muted-foreground">
                                        <p>Total completed: <span className="text-foreground font-semibold">{overallCompleted}</span></p>
                                        <p>Total scheduled: <span className="text-foreground font-semibold">{overallTotal}</span></p>
                                    </div>
                                </div>
                            </div>
                            <div className="relative border-b border-muted/30 h-40" style={{ gridColumn: `2 / span ${daysInMonth.length}` }}>
                                <div className="grid h-full items-end pt-4" style={{ gridTemplateColumns: `repeat(${daysInMonth.length}, minmax(0, 1fr))` }}>
                                    {(habitDashboardTab === 'botherings' ? dayBotheringCompletion : dayCompletion).map((day, index) => (
                                        <div key={`bar-${day.date.toISOString()}`} className={cn("p-2", isAltWeek(index) && "bg-muted/20")}>
                                            <div className="h-20 flex items-end">
                                                <div
                                                    className="w-full rounded-md border border-sky-200/60 bg-sky-400/20"
                                                    style={{ height: `${(day.percent / maxBar) * 100}%` }}
                                                    title={`${format(day.date, 'MMM d')}: ${day.percent}%`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 80" preserveAspectRatio="none">
                                    <path
                                        d={(() => {
                                            const source = habitDashboardTab === 'botherings' ? dayBotheringCompletion : dayCompletion;
                                            if (source.length === 0) return "";
                                            const points = source.map((day, index) => {
                                                const x = (index / Math.max(1, source.length - 1)) * 100;
                                                const y = 80 - (day.percent / maxBar) * 68 - 4;
                                                return { x, y };
                                            });
                                            let d = `M ${points[0].x} ${points[0].y}`;
                                            for (let i = 1; i < points.length; i++) {
                                                const prev = points[i - 1];
                                                const curr = points[i];
                                                const cp1x = prev.x + (curr.x - prev.x) / 2;
                                                const cp1y = prev.y;
                                                const cp2x = prev.x + (curr.x - prev.x) / 2;
                                                const cp2y = curr.y;
                                                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
                                            }
                                            return d;
                                        })()}
                                        fill="none"
                                        stroke="rgba(148,163,184,0.9)"
                                        strokeWidth="1.6"
                                    />
                                </svg>
                            </div>
                            <div className="h-40 px-2 flex items-center justify-center text-xs text-muted-foreground border-b border-muted/30">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="h-36 w-44">
                                        <ChartContainer config={{}} className="h-full w-full">
                                            <ResponsiveContainer>
                                                <RechartsPieChart>
                                                    <ChartTooltip content={<ChartTooltipContent />} />
                                                    <Pie data={monthTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="45%" outerRadius="85%" stroke="hsl(var(--background))" strokeWidth={2}>
                                                        {monthTypeData.map((entry) => (
                                                            <Cell key={`month-type-mini-${entry.name}`} fill={activityColorMapping[entry.name] || '#8884d8'} />
                                                        ))}
                                                    </Pie>
                                                </RechartsPieChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </div>
                                </div>
                            </div>
                            <div className="h-8 px-2 flex items-center gap-2 font-semibold text-muted-foreground border-b border-muted/30">
                                <CheckCircle className="h-4 w-4 text-emerald-400" />
                                {habitDashboardTab === 'daily' ? 'Daily Habits' : 'Botherings'}
                            </div>
                            {daysInMonth.map((day, index) => {
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const hasEndDate = habitDashboardTab === 'botherings' && botherings.some(b => b.endDate === dateKey);
                                return (
                                    <div key={day.toISOString()} className={cn(
                                        "h-8 flex items-center justify-center font-semibold text-muted-foreground border-b border-muted/30",
                                        isAltWeek(index) && "bg-muted/20",
                                        hasEndDate && "bg-amber-400/20 text-amber-200"
                                    )}>
                                        {format(day, 'd')}
                                    </div>
                                );
                            })}
                            <div className="h-8 px-2 flex items-center justify-end font-semibold text-muted-foreground border-b border-muted/30">Total hrs</div>
                            {habitDashboardTab === 'daily' ? (
                            orderedTypes.map(type => (
                                <React.Fragment key={`group-${type}`}>
                                    {collapsedHabitGroups[type] ? (
                                        <>
                                            <div className="h-8 px-2 flex items-center text-xs font-semibold text-muted-foreground border-b border-muted/30 bg-muted/20">
                                                <button
                                                    className="flex items-center gap-2"
                                                    onClick={() => setCollapsedHabitGroups(prev => ({ ...prev, [type]: !prev[type] }))}
                                                >
                                                    <ChevronDown className={cn("h-4 w-4 transition-transform", collapsedHabitGroups[type] && "-rotate-90")} />
                                                    <span>{activityNameMap[type] || type}</span>
                                                </button>
                                            </div>
                                            {daysInMonth.map((day, index) => {
                                                const dateKey = format(day, 'yyyy-MM-dd');
                                                const daySchedule = schedule[dateKey] || {};
                                                const allSlots = Object.values(daySchedule) as Activity[][];
                                                const activities = allSlots.flat();
                                                const groupHabits = habitsByType[type] || [];
                                                const matches = activities.filter(act => {
                                                    const key = getHabitKey(act);
                                                    return groupHabits.some(h => key === `${h.type}::${h.name}`);
                                                });
                                                const completed = matches.some(act => act.completed);
                                                const hasHabit = matches.length > 0;
                                                return (
                                                    <div key={`${type}-combined-${dateKey}`} className={cn("h-8 flex items-center justify-center border-b border-muted/20 bg-muted/20", isAltWeek(index) && "bg-muted/30")}>
                                                        <div className={cn(
                                                            "h-4 w-4 mx-auto rounded-sm border border-muted-foreground/30",
                                                            hasHabit && !completed && "bg-muted/40",
                                                            completed && "bg-emerald-400/80 border-emerald-400"
                                                        )} />
                                                    </div>
                                                );
                                            })}
                                            <div className="h-8 px-2 border-b border-muted/20 flex items-center bg-muted/20">
                                                {(() => {
                                                    const total = groupTotals.find(g => g.type === type)?.totalMinutes || 0;
                                                    const hours = total / 60;
                                                    const accent = total > 0 ? "text-amber-300" : "text-muted-foreground";
                                                    return (
                                                        <div className="w-full flex items-center gap-2">
                                                            <div className="h-2 flex-1 rounded-full bg-muted/40 overflow-hidden">
                                                                <div
                                                                    className={cn("h-full", total > 0 ? "bg-amber-400/80" : "bg-muted/30")}
                                                                    style={{ width: `${Math.min(100, (total / maxGroupMinutes) * 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className={cn("text-[10px] tabular-nums min-w-[32px] text-right", accent)}>{hours.toFixed(1)}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div
                                                className="h-8 px-2 flex items-center text-xs font-semibold text-muted-foreground border-b border-muted/30 bg-muted/20"
                                                style={{ gridColumn: `1 / span ${daysInMonth.length + 2}` }}
                                            >
                                                <button
                                                    className="flex items-center gap-2"
                                                    onClick={() => setCollapsedHabitGroups(prev => ({ ...prev, [type]: !prev[type] }))}
                                                >
                                                    <ChevronDown className={cn("h-4 w-4 transition-transform", collapsedHabitGroups[type] && "-rotate-90")} />
                                                    <span>{activityNameMap[type] || type}</span>
                                                </button>
                                            </div>
                                            {getGroupedHabitsForType(type, habitsByType[type]).map(group => {
                                                const groupKey = `${type}::${group.label ?? 'all'}`;
                                                const isCollapsed = group.label ? (collapsedSpecializations[groupKey] ?? true) : false;
                                                const groupTotalMinutes = group.habits.reduce((sum, habit) => {
                                                    const habitKey = `${habit.type}::${habit.name}`;
                                                    return sum + (habitTotals.find(h => h.habitKey === habitKey)?.totalMinutes || 0);
                                                }, 0);
                                                return (
                                                <React.Fragment key={`${type}-${group.label ?? 'all'}`}>
                                                    {group.label && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => setCollapsedSpecializations(prev => ({ ...prev, [groupKey]: !isCollapsed }))}
                                                                className="h-7 px-2 border-b border-muted/20 text-[11px] uppercase tracking-wide text-muted-foreground/80 bg-muted/10 flex items-center gap-2"
                                                            >
                                                                <ChevronDown className={cn("h-3 w-3 transition-transform", isCollapsed && "-rotate-90")} />
                                                                {group.label}
                                                            </button>
                                                            {isCollapsed ? (
                                                                <>
                                                                    {daysInMonth.map((day, index) => {
                                                                        const dateKey = format(day, 'yyyy-MM-dd');
                                                                        const daySchedule = schedule[dateKey] || {};
                                                                        const allSlots = Object.values(daySchedule) as Activity[][];
                                                                        const activities = allSlots.flat();
                                                                        const groupHabitKeys = new Set(group.habits.map(h => `${h.type}::${h.name}`));
                                                                        const matches = activities.filter(act => {
                                                                            const key = getHabitKey(act);
                                                                            return key ? groupHabitKeys.has(key) : false;
                                                                        });
                                                                        const completed = matches.some(act => act.completed);
                                                                        const hasHabit = matches.length > 0;
                                                                        return (
                                                                            <div key={`${groupKey}-${dateKey}`} className={cn("h-7 flex items-center justify-center border-b border-muted/20 bg-muted/10", isAltWeek(index) && "bg-muted/20")}>
                                                                                <div className={cn(
                                                                                    "h-4 w-4 mx-auto rounded-sm border border-muted-foreground/30",
                                                                                    hasHabit && !completed && "bg-muted/40",
                                                                                    completed && "bg-emerald-400/80 border-emerald-400"
                                                                                )} />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    <div className="h-7 px-2 border-b border-muted/20 flex items-center bg-muted/10">
                                                                        {(() => {
                                                                            const hours = groupTotalMinutes / 60;
                                                                            const accent = groupTotalMinutes > 0 ? "text-amber-300" : "text-muted-foreground";
                                                                            return (
                                                                                <div className="w-full flex items-center gap-2">
                                                                                    <div className="h-2 flex-1 rounded-full bg-muted/40 overflow-hidden">
                                                                                        <div
                                                                                            className={cn("h-full", groupTotalMinutes > 0 ? "bg-amber-400/80" : "bg-muted/30")}
                                                                                            style={{ width: `${Math.min(100, (groupTotalMinutes / maxHabitMinutes) * 100)}%` }}
                                                                                        />
                                                                                    </div>
                                                                                    <span className={cn("text-[10px] tabular-nums min-w-[32px] text-right", accent)}>{hours.toFixed(1)}</span>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {daysInMonth.map((day, index) => (
                                                                        <div key={`${groupKey}-empty-${day.toISOString()}`} className={cn("h-7 border-b border-muted/20 bg-muted/10", isAltWeek(index) && "bg-muted/20")} />
                                                                    ))}
                                                                    <div className="h-7 border-b border-muted/20 bg-muted/10" />
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                    {!isCollapsed && group.habits.map((habit) => (
                                                        <React.Fragment key={habit.name}>
                                                            <div className="h-8 px-2 border-b border-muted/20 text-sm truncate flex items-center" title={habit.name}>
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="text-muted-foreground">{activityTypeIcons[habit.type] || <CheckCircle className="h-4 w-4" />}</span>
                                                                    <span className="truncate">{habit.name}</span>
                                                                </div>
                                                            </div>
                                                            {daysInMonth.map((day, index) => {
                                                                const dateKey = format(day, 'yyyy-MM-dd');
                                                                const daySchedule = schedule[dateKey] || {};
                                                                const allSlots = Object.values(daySchedule) as Activity[][];
                                                                const activities = allSlots.flat();
                                                                const habitKey = `${habit.type}::${habit.name}`;
                                                                const matches = activities.filter(act => getHabitKey(act) === habitKey);
                                                                const completed = matches.some(act => act.completed);
                                                                const hasHabit = matches.length > 0;
                                                                return (
                                                                    <div key={`${habit.name}-${dateKey}`} className={cn("h-8 flex items-center justify-center border-b border-muted/20", isAltWeek(index) && "bg-muted/20")}>
                                                                        <div className={cn(
                                                                            "h-4 w-4 mx-auto rounded-sm border border-muted-foreground/30",
                                                                            hasHabit && !completed && "bg-muted/40",
                                                                            completed && "bg-emerald-400/80 border-emerald-400"
                                                                        )} />
                                                                    </div>
                                                                );
                                                            })}
                                                            <div className="h-8 px-2 border-b border-muted/20 flex items-center">
                                                                {(() => {
                                                                    const habitKey = `${habit.type}::${habit.name}`;
                                                                    const total = habitTotals.find(h => h.habitKey === habitKey)?.totalMinutes || 0;
                                                                    const hours = total / 60;
                                                                    const accent = total > 0 ? "text-amber-300" : "text-muted-foreground";
                                                                    return (
                                                                        <div className="w-full flex items-center gap-2">
                                                                            <div className="h-2 flex-1 rounded-full bg-muted/40 overflow-hidden">
                                                                                <div
                                                                                    className={cn("h-full", total > 0 ? "bg-amber-400/80" : "bg-muted/30")}
                                                                                    style={{ width: `${Math.min(100, (total / maxHabitMinutes) * 100)}%` }}
                                                                                />
                                                                            </div>
                                                                            <span className={cn("text-[10px] tabular-nums min-w-[32px] text-right", accent)}>{hours.toFixed(1)}</span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </React.Fragment>
                                                    ))}
                                                </React.Fragment>
                                                );
                                            })}
                                        </>
                                    )}
                                </React.Fragment>
                            ))
                            ) : (
                                <>
                                    {botherings.length === 0 && (
                                        <div className="text-center text-muted-foreground py-12 col-span-full">
                                            No active botherings with tasks.
                                        </div>
                                    )}
                                    {botherings.map((bothering) => {
                                        const totalMinutes = botheringTotals.find(b => b.id === bothering.id)?.totalMinutes || 0;
                                        const isCollapsed = collapsedBotherings[bothering.id] ?? true;
                                        return (
                                            <React.Fragment key={bothering.id}>
                                                <div className="h-8 px-2 border-b border-muted/20 text-sm truncate flex items-center" title={bothering.text}>
                                                    <button
                                                        className="flex items-center gap-2 min-w-0"
                                                        onClick={() => setCollapsedBotherings(prev => ({ ...prev, [bothering.id]: !isCollapsed }))}
                                                    >
                                                        <span className="text-emerald-400"><CheckCircle className="h-4 w-4" /></span>
                                                        <span className="truncate">{bothering.text}</span>
                                                    </button>
                                                </div>
                                                {isCollapsed ? (
                                                    <>
                                                        {daysInMonth.map((day, index) => {
                                                            const dateKey = format(day, 'yyyy-MM-dd');
                                                            const activityMap = dayActivityMaps.get(dateKey) || new Map();
                                                            const dueTasks = bothering.tasks.filter(task => isTaskDueOnDate(task, dateKey));
                                                            const completedCount = dueTasks.filter(task => isTaskCompletedOnDate(task, dateKey, activityMap)).length;
                                                            const hasTasks = dueTasks.length > 0;
                                                            const isEndDate = bothering.endDate && bothering.endDate === dateKey;
                                                            return (
                                                                <div key={`${bothering.id}-${dateKey}`} className={cn("h-8 flex items-center justify-center border-b border-muted/20", isAltWeek(index) && "bg-muted/20", isEndDate && "bg-amber-400/20 border-amber-400/40")}>
                                                                    <div className={cn(
                                                                        "h-4 w-4 mx-auto rounded-sm border border-muted-foreground/30",
                                                                        hasTasks && completedCount === 0 && "bg-muted/40",
                                                                        completedCount > 0 && "bg-emerald-400/80 border-emerald-400"
                                                                    )} />
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="h-8 px-2 border-b border-muted/20 flex items-center">
                                                            {(() => {
                                                                const hours = totalMinutes / 60;
                                                                const accent = totalMinutes > 0 ? "text-amber-300" : "text-muted-foreground";
                                                                return (
                                                                    <div className="w-full flex items-center gap-2">
                                                                        <div className="h-2 flex-1 rounded-full bg-muted/40 overflow-hidden">
                                                                            <div
                                                                                className={cn("h-full", totalMinutes > 0 ? "bg-amber-400/80" : "bg-muted/30")}
                                                                                style={{ width: `${Math.min(100, (totalMinutes / maxBotheringMinutes) * 100)}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className={cn("text-[10px] tabular-nums min-w-[32px] text-right", accent)}>{hours.toFixed(1)}</span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {daysInMonth.map((day, index) => (
                                                            <div key={`${bothering.id}-blank-${day.toISOString()}`} className={cn("h-8 border-b border-muted/20", isAltWeek(index) && "bg-muted/20")} />
                                                        ))}
                                                        <div className="h-8 border-b border-muted/20" />
                                                    </>
                                                )}
                                                {!isCollapsed && bothering.tasks.map((task) => (
                                                    <React.Fragment key={`${bothering.id}-${task.id}`}>
                                                        <div className="h-8 px-4 border-b border-muted/20 text-[11px] truncate flex items-center text-muted-foreground" title={task.details}>
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                                                <span className="truncate">{task.details}</span>
                                                            </div>
                                                        </div>
                                                        {daysInMonth.map((day, index) => {
                                                            const dateKey = format(day, 'yyyy-MM-dd');
                                                            const activityMap = dayActivityMaps.get(dateKey) || new Map();
                                                            const isDue = isTaskDueOnDate(task, dateKey);
                                                            const isDone = isDue && isTaskCompletedOnDate(task, dateKey, activityMap);
                                                            return (
                                                                <div key={`${bothering.id}-${task.id}-${dateKey}`} className={cn("h-8 flex items-center justify-center border-b border-muted/20", isAltWeek(index) && "bg-muted/20")}>
                                                                    <div className={cn(
                                                                        "h-4 w-4 mx-auto rounded-sm border border-muted-foreground/30",
                                                                        isDue && !isDone && "bg-muted/40",
                                                                        isDone && "bg-emerald-400/80 border-emerald-400"
                                                                    )} />
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="h-8 px-2 border-b border-muted/20 flex items-center">
                                                            {(() => {
                                                                let taskMinutes = 0;
                                                                daysInMonth.forEach(day => {
                                                                    const dateKey = format(day, 'yyyy-MM-dd');
                                                                    const activityMap = dayActivityMaps.get(dateKey) || new Map();
                                                                    if (!isTaskDueOnDate(task, dateKey)) return;
                                                                    if (!isTaskCompletedOnDate(task, dateKey, activityMap)) return;
                                                                    const act = activityMap.get(task.activityId || task.id);
                                                                    if (act) {
                                                                        taskMinutes += getLoggedMinutes(act, allDeepWorkLogs, allUpskillLogs, brandingLogs, allLeadGenLogs, allWorkoutLogs, allMindProgrammingLogs, dateKey);
                                                                    }
                                                                });
                                                                const hours = taskMinutes / 60;
                                                                const accent = taskMinutes > 0 ? "text-amber-300" : "text-muted-foreground";
                                                                return (
                                                                    <div className="w-full flex items-center gap-2">
                                                                        <div className="h-2 flex-1 rounded-full bg-muted/40 overflow-hidden">
                                                                            <div
                                                                                className={cn("h-full", taskMinutes > 0 ? "bg-amber-400/80" : "bg-muted/30")}
                                                                                style={{ width: `${Math.min(100, (taskMinutes / maxBotheringMinutes) * 100)}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className={cn("text-[10px] tabular-nums min-w-[32px] text-right", accent)}>{hours.toFixed(1)}</span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </React.Fragment>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </>
                            )}
                            <div className="h-8 px-2 flex items-center font-semibold text-muted-foreground border-b border-muted/30">
                                Hours
                            </div>
                            {(habitDashboardTab === 'botherings' ? botheringsDayTotals : dayTotals).map((day, index) => {
                                const hours = day.totalMinutes / 60;
                                return (
                                    <div key={`day-total-${day.date.toISOString()}`} className={cn("h-20 flex flex-col items-center justify-start gap-1 border-b border-muted/30", isAltWeek(index) && "bg-muted/20")}>
                                        <div className="relative h-16 w-5">
                                            <div
                                                className="absolute left-0 top-0 w-full rounded-sm bg-indigo-400/80"
                                                style={{ height: `${(day.totalMinutes / (habitDashboardTab === 'botherings' ? maxBotheringsDayMinutes : maxDayMinutes)) * 100}%` }}
                                            />
                                        </div>
                                        <span className={cn("text-[10px] tabular-nums", hours > 0 ? "text-indigo-300" : "text-muted-foreground")}>{hours > 0 ? hours.toFixed(1) : "0.0"}</span>
                                    </div>
                                );
                            })}
                            <div className="h-12 px-2 flex items-center justify-end font-semibold text-muted-foreground border-b border-muted/30">
                                Total
                            </div>
                        </div>
                    </div>
                </div>
            </div>
                </div>
            </div>
        );
    }, [effectiveDashboardMonth, schedule, collapsedHabitGroups, collapsedSpecializations, collapsedBotherings, upskillDefinitions, deepWorkDefinitions, microSkillMap, mindsetCards, habitDashboardTab, allDeepWorkLogs, allUpskillLogs, brandingLogs, allLeadGenLogs, allWorkoutLogs, allMindProgrammingLogs]);

    const timesheetBody = (
        <>
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
        </>
    );

    return (
        <div className={cn(isModal ? "w-full h-full flex flex-col bg-transparent" : "container mx-auto p-4 sm:p-6 lg:p-8")}>
            <Card className={cn(isModal && "border-0 shadow-none flex-grow flex flex-col min-h-0 bg-transparent")}>
                 {!isModal && (
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Clock /> Timesheet</CardTitle>
                        <CardDescription>Review your logged time. Durations for Deep Work and Upskill tasks are calculated from your logged sessions.</CardDescription>
                    </CardHeader>
                )}
                {isModal ? (
                    showModalTabs ? (
                        <Tabs
                            value={modalTab ?? localModalTab}
                            onValueChange={(v) => (onModalTabChange ?? setLocalModalTab)(v as 'timesheet' | 'habit-dashboard')}
                            className="flex flex-col flex-grow min-h-0"
                        >
                            <CardContent className="p-4 pb-0">
                                <TabsList className="self-start">
                                    <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
                                    <TabsTrigger value="habit-dashboard">Habit Dashboard</TabsTrigger>
                                </TabsList>
                            </CardContent>
                            <CardContent className="pt-0 flex-grow min-h-0 flex flex-col">
                                <TabsContent value="timesheet" className="flex flex-col flex-grow min-h-0">
                                    {timesheetBody}
                                </TabsContent>
                                <TabsContent value="habit-dashboard" className="flex-grow min-h-0 w-full">
                                    <ScrollArea className="h-full w-full">
                                        {habitDashboard}
                                    </ScrollArea>
                                </TabsContent>
                            </CardContent>
                        </Tabs>
                    ) : (
                        <CardContent className="p-4 flex-grow min-h-0 flex flex-col">
                            {(modalTab ?? localModalTab) === 'timesheet' ? (
                                timesheetBody
                            ) : (
                                <ScrollArea className="h-full w-full">
                                    {habitDashboard}
                                </ScrollArea>
                            )}
                        </CardContent>
                    )
                ) : (
                    <CardContent className={cn("space-y-6", isModal ? "p-4 flex-grow min-h-0 flex flex-col" : "")}>
                        {timesheetBody}
                    </CardContent>
                )}
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

    
