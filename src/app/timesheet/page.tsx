

"use client";

import React, { useState, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { CalendarIcon, Clock, Filter, BrainCircuit, Coffee, Timer, Moon, Sun, Sunset, MoonStar, CloudSun, Sunrise, Briefcase, BarChart as BarChartIcon, Radar as RadarIcon, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import type { Activity, PauseEvent, ActivityType as ActivityTypeType } from '@/types/workout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, LineChart, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar, PolarRadiusAxis, PieChart, Pie } from 'recharts';


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

const DayDetailModal = ({ isOpen, onOpenChange, data }: { isOpen: boolean, onOpenChange: (open: boolean) => void, data: { date: Date; activities: ProcessedActivity[] } }) => {
  const { date, activities } = data;
  const totalMinutes = activities.reduce((sum, act) => sum + act.calculatedDuration, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Details for {format(date, 'PPP')}</DialogTitle>
          <DialogDescriptionComponent>
            Total time for selected filters: {formatMinutes(totalMinutes)}
          </DialogDescriptionComponent>
        </DialogHeader>
        <div className="max-h-[60vh]">
          <ScrollArea className="h-full pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Slot</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right w-[100px]">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>{activity.slot}</TableCell>
                      <TableCell>
                        <div className="font-medium">{activity.details}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {activity.type.replace('_', ' + ')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMinutes(activity.calculatedDuration)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      No activities for this day.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};


function TimesheetPageContent() {
    const { schedule, allDeepWorkLogs, allUpskillLogs, activityDurations } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("day");
    const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
    const [modalData, setModalData] = useState<{ date: Date; activities: ProcessedActivity[] } | null>(null);
    const [timeAllocationView, setTimeAllocationView] = useState<TimeAllocationView>('bar');

    const parseDurationToMinutes = (durationStr: string | undefined): number => {
        if (!durationStr) return 0;
        if (/^\d+$/.test(durationStr.trim())) {
            return parseInt(durationStr.trim(), 10);
        }
        let totalMinutes = 0;
        const hourMatch = durationStr.match(/(\d+)\s*h/);
        if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
        const minMatch = durationStr.match(/(\d+)\s*m/);
        if (minMatch) totalMinutes += parseInt(minMatch[1], 10);
        return totalMinutes;
    };

    const timeData = useMemo(() => {
        const getLoggedMinutes = (activity: Activity, dateKey: string): number => {
             if (activity.completed) {
                if (activity.type === 'deepwork') {
                    const dailyLog = allDeepWorkLogs.find(log => log.date === dateKey);
                    let duration = 0;
                    if (dailyLog && activity.taskIds) {
                        activity.taskIds.forEach(taskId => {
                            const taskLog = dailyLog.exercises.find(ex => ex.id === taskId);
                            if (taskLog) {
                                duration += taskLog.loggedSets.reduce((sum, set) => sum + set.weight, 0);
                            }
                        });
                    }
                    return duration;
                }
                if (activity.type === 'upskill') {
                    const dailyLog = allUpskillLogs.find(log => log.date === dateKey);
                    let duration = 0;
                    if (dailyLog && activity.taskIds) {
                        activity.taskIds.forEach(taskId => {
                            const taskLog = dailyLog.exercises.find(ex => ex.id === taskId);
                            if (taskLog) {
                                duration += taskLog.loggedSets.reduce((sum, set) => sum + set.reps, 0);
                            }
                        });
                    }
                    return duration;
                }
                if (activity.type === 'interrupt' || activity.type === 'essentials') {
                    return activity.duration || 0;
                }
                return parseDurationToMinutes(activityDurations[activity.id]);
            }
            return 0; // Return 0 if not completed
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
        
        const dailyData: Record<string, ProcessedActivity[]> = {};
        
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
            dailyData[dateKey] = processedActivities;
        }

        return { dailyData };
    }, [selectedDate, viewMode, activityFilter, schedule, allDeepWorkLogs, allUpskillLogs, activityDurations]);
    
    const timeAllocationData = useMemo(() => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const dailySchedule = schedule[dateKey] || {};
        const allActivitiesForDay: ProcessedActivity[] = [];
    
        Object.values(dailySchedule).flat().forEach((activity: any) => {
            if (activity && typeof activity === 'object' && 'type' in activity && activity.completed) {
                let duration = 0;
                if (activity.type === 'deepwork') {
                    const dailyLog = allDeepWorkLogs.find(log => log.date === dateKey);
                    if (dailyLog && activity.taskIds) {
                      activity.taskIds.forEach((taskId: string) => {
                          const taskLog = dailyLog.exercises.find(ex => ex.id === taskId);
                          if (taskLog) {
                              duration += taskLog.loggedSets.reduce((sum, set) => sum + set.weight, 0);
                          }
                      });
                    }
                } else if (activity.type === 'upskill') {
                    const dailyLog = allUpskillLogs.find(log => log.date === dateKey);
                     if (dailyLog && activity.taskIds) {
                      activity.taskIds.forEach((taskId: string) => {
                          const taskLog = dailyLog.exercises.find(ex => ex.id === taskId);
                          if (taskLog) {
                              duration += taskLog.loggedSets.reduce((sum, set) => sum + set.reps, 0);
                          }
                      });
                    }
                } else if (activity.type === 'interrupt' || activity.type === 'essentials') {
                    duration = activity.duration || 0;
                } else {
                    duration = parseDurationToMinutes(activityDurations[activity.id]);
                }
                
                if (duration > 0) {
                     allActivitiesForDay.push({ ...activity, calculatedDuration: duration });
                }
            }
        });
        
        const totals: Record<string, number> = {};
        
        const activityNameMap: Record<ActivityTypeType, string> = {
            deepwork: 'Deep Work', upskill: 'Learning', workout: 'Workout', branding: 'Branding', essentials: 'Essentials', planning: 'Planning', tracking: 'Tracking', 'lead-generation': 'Lead Gen', interrupt: 'Interrupts', nutrition: 'Nutrition',
        };

        allActivitiesForDay.forEach(activity => {
            const mappedName = activityNameMap[activity.type];
            if (mappedName) {
                totals[mappedName] = (totals[mappedName] || 0) + activity.calculatedDuration;
            }
        });
        
        return Object.entries(totals)
          .map(([name, time]) => ({ name, time }))
          .filter(item => item.time > 0);
    }, [selectedDate, schedule, activityDurations, allDeepWorkLogs, allUpskillLogs]);

    const pieData = useMemo(() => {
        const totalMinutesInDay = 24 * 60;
        const totalAllocatedMinutes = timeAllocationData.reduce((sum, act) => sum + act.time, 0);
        const freeTime = totalMinutesInDay - totalAllocatedMinutes;

        const data = timeAllocationData.map(item => ({ name: item.name, value: item.time }));
        if (freeTime > 0) {
            data.push({ name: 'Free Time', value: freeTime });
        }
        return data;
    }, [timeAllocationData]);

    
    const renderDayView = () => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const activitiesForDay = timeData.dailyData[dateKey] || [];
        
        const calculateAttentionMetrics = (activity: Activity) => {
            if (!activity.focusSessionInitialStartTime || !activity.focusSessionEndTime) {
                return { totalFocusMinutes: 0, totalBreakMinutes: 0 };
            }
    
            const pauses = Array.isArray(activity.focusSessionPauses) ? activity.focusSessionPauses : [];
    
            let lastEventTime = activity.focusSessionInitialStartTime;
            let workIntervalsMs: number[] = [];
    
            pauses.forEach(p => {
                if (p.resumeTime) {
                    workIntervalsMs.push(p.pauseTime - lastEventTime);
                    lastEventTime = p.resumeTime;
                }
            });
            workIntervalsMs.push(activity.focusSessionEndTime - lastEventTime);
    
            const validWorkIntervalsMs = workIntervalsMs.filter(i => i > 1000);
            const totalFocusMs = validWorkIntervalsMs.reduce((sum, i) => sum + i, 0);
            
            const totalBreakMs = (activity.focusSessionEndTime - activity.focusSessionInitialStartTime) - totalFocusMs;
    
            return {
                totalFocusMinutes: Math.round(totalFocusMs / 60000),
                totalBreakMinutes: Math.round(totalBreakMs / 60000),
            };
        };
    
        return (
            <div className="space-y-6">
                <CardHeader className="text-center">
                    <CardTitle>Day View: {format(selectedDate, 'PPP')}</CardTitle>
                    <CardDescription>A summary of your logged time and attention for the selected day.</CardDescription>
                </CardHeader>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base"><BarChartIcon/> Time Allocation</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setTimeAllocationView(v => v === 'bar' ? 'pie' : 'bar')}>
                            {timeAllocationView === 'bar' ? <PieChartIcon className="h-4 w-4" /> : <BarChartIcon className="h-4 w-4" />}
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {timeAllocationData.length > 0 ? (
                            timeAllocationView === 'bar' ? (
                                <ChartContainer config={{}} className="h-[200px] w-full">
                                    <ResponsiveContainer>
                                        <BarChart data={timeAllocationData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                                            <XAxis type="number" dataKey="time" domain={[0, 'dataMax + 1']} fontSize={12} tickFormatter={(value) => formatMinutes(value)} />
                                            <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} fontSize={12} />
                                            <ChartTooltip
                                                cursor={{ fill: "hsl(var(--muted))" }}
                                                content={<ChartTooltipContent formatter={(value) => formatMinutes(value as number)} />}
                                            />
                                            <Bar dataKey="time" radius={[0, 4, 4, 0]}>
                                                {timeAllocationData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            ) : (
                                <ChartContainer config={{}} className="h-[250px] w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <ChartTooltip
                                                cursor={{ fill: "hsl(var(--muted))" }}
                                                content={<ChartTooltipContent formatter={(value) => formatMinutes(value as number)} nameKey="name" />}
                                            />
                                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name }) => name}>
                                                {pieData.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            )
                        ) : (
                            <p className="text-sm text-center text-muted-foreground py-8">No time logged for this day.</p>
                        )}
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {slotOrder.map(slot => {
                        const activitiesInSlot = activitiesForDay.filter(act => act.slot === slot.name);
                        const totalDuration = activitiesInSlot.reduce((sum, act) => sum + act.calculatedDuration, 0);
                        const { totalFocusMinutes, totalBreakMinutes } = activitiesInSlot.reduce(
                            (acc, act) => {
                                const metrics = calculateAttentionMetrics(act);
                                acc.totalFocusMinutes += metrics.totalFocusMinutes;
                                acc.totalBreakMinutes += metrics.totalBreakMinutes;
                                return acc;
                            },
                            { totalFocusMinutes: 0, totalBreakMinutes: 0 }
                        );
    
                        return (
                            <Card key={slot.name}>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-lg">
                                            {slot.icon}
                                            {slot.name}
                                        </div>
                                        <div className="text-sm font-medium text-muted-foreground">
                                            {formatMinutes(totalDuration)} / 4h
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm text-muted-foreground">Total Time</span>
                                            <span className="text-xl font-bold">{formatMinutes(totalDuration)}</span>
                                        </div>
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm text-muted-foreground flex items-center gap-2"><BrainCircuit className="h-4 w-4" />Focused</span>
                                            <span className="text-lg font-semibold">{formatMinutes(totalFocusMinutes)}</span>
                                        </div>
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm text-muted-foreground flex items-center gap-2"><Coffee className="h-4 w-4" />Breaks</span>
                                            <span className="text-lg font-semibold">{formatMinutes(totalBreakMinutes)}</span>
                                        </div>
                                    </div>
                                    {activitiesInSlot.length > 0 && <Separator />}
                                    <div className="space-y-2">
                                        {activitiesInSlot.map(act => (
                                            <div key={act.id} className="text-xs p-2 rounded-md bg-muted/50">
                                                <p className="font-medium truncate text-foreground">{act.details}</p>
                                                <p className="text-muted-foreground capitalize">{act.type.replace('-', ' ')} - {formatMinutes(act.calculatedDuration)}</p>
                                            </div>
                                        ))}
                                    </div>
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
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {weekRange.map(day => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const activities = timeData.dailyData[dateKey] || [];
                        const dailyTotals: Record<string, number> = activities.reduce((acc, act) => {
                            acc[act.type] = (acc[act.type] || 0) + act.calculatedDuration;
                            return acc;
                        }, {} as Record<string, number>);
                        const totalDayMinutes = Object.values(dailyTotals).reduce((sum, d) => sum + d, 0);

                        return (
                            <Card 
                                key={dateKey} 
                                onClick={() => setModalData({ date: day, activities })}
                                className={cn("cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 hover:bg-accent flex flex-col", isSameDay(day, new Date()) && "bg-muted")}
                            >
                                <CardHeader className="p-4 pb-2 flex-row items-start justify-between">
                                  <div className="flex-grow">
                                    <CardTitle className="text-base">
                                        {format(day, 'EEE, MMM d')}
                                    </CardTitle>
                                  </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 text-sm space-y-2 flex-grow flex flex-col justify-end">
                                    <p className="text-2xl font-bold">{totalDayMinutes > 0 ? formatMinutes(totalDayMinutes) : "-"}</p>
                                    
                                    <div className="space-y-1">
                                        {Object.entries(dailyTotals).length > 0 ? Object.entries(dailyTotals).map(([type, minutes]) => (
                                            minutes > 0 &&
                                            <div key={type} className="flex justify-between text-muted-foreground text-xs">
                                                <span className="capitalize">{type.replace('_', ' + ')}</span>
                                                <span className="font-medium text-foreground">{formatMinutes(minutes)}</span>
                                            </div>
                                        )) : <p className="text-xs text-center text-muted-foreground">No activities</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </CardContent>
            </Card>
        );
    };

    const renderMonthView = () => {
        const startDate = startOfMonth(selectedDate);
        const endDate = endOfMonth(selectedDate);
        const monthRange = eachDayOfInterval({ start: startDate, end: endDate });
        
        const monthlyData = monthRange.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const activities = timeData.dailyData[dateKey] || [];
            return {
                day,
                dateKey,
                tasks: activities,
                totalDuration: activities.reduce((sum, act) => sum + act.calculatedDuration, 0)
            };
        });

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Month View: {format(selectedDate, 'MMMM yyyy')}</CardTitle>
                    <CardDescription>A high-level overview of your time this month. Click a card for details.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-4">
                        {monthlyData.map(data => (
                            data.totalDuration > 0 && (
                                <Card 
                                    key={data.dateKey}
                                    onClick={() => setModalData({ date: data.day, activities: data.tasks })}
                                    className="flex flex-col cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 hover:bg-accent"
                                >
                                    <CardHeader className="p-3 flex flex-row items-start justify-between">
                                        <div className="flex-grow">
                                          <CardTitle className="text-sm">
                                              {format(data.day, 'EEE, MMM d')}
                                          </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0 text-xs text-muted-foreground flex-grow flex flex-col justify-between">
                                        <p className="text-xl font-bold text-primary mb-2">{formatMinutes(data.totalDuration)}</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            {data.tasks.map((task, i) => (
                                                task.calculatedDuration > 0 && <li key={i} className="truncate" title={task.details}>{task.details} ({formatMinutes(task.calculatedDuration)})</li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            )
                        ))}
                    </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Clock /> Timesheet</CardTitle>
                    <CardDescription>Review your logged time. Durations for Deep Work and Upskill tasks are calculated from your logged sessions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-4">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className="w-[280px] justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {format(selectedDate, 'PPP')}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus />
                            </PopoverContent>
                        </Popover>
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
                                <SelectTrigger className="w-[200px]">
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
                </CardContent>
            </Card>
            
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}

            {modalData && (
                <DayDetailModal 
                    isOpen={!!modalData}
                    onOpenChange={() => setModalData(null)}
                    data={modalData}
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
