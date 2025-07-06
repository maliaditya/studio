
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
import { CalendarIcon, Clock, Filter } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import type { Activity } from '@/types/workout';
import { ScrollArea } from '@/components/ui/scroll-area';

type ActivityFilter = "all" | "deepwork" | "upskill" | "deepwork_upskill";
type ViewMode = "day" | "week" | "month";

const formatMinutes = (minutes: number) => {
    if (minutes <= 0) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
};

const slotOrder = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

interface ProcessedActivity extends Activity {
    calculatedDuration: number; // in minutes
}

const DayDetailPopoverContent = ({ date, activities }: { date: Date; activities: ProcessedActivity[] }) => {
    const totalMinutes = activities.reduce((sum, act) => sum + act.calculatedDuration, 0);
    return (
      <PopoverContent className="w-96">
        <h4 className="font-semibold text-lg">{format(date, 'PPP')}</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Total for filters: {formatMinutes(totalMinutes)}
        </p>
        <ScrollArea className="h-64">
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
      </PopoverContent>
    );
};


function TimesheetPageContent() {
    const { schedule, allDeepWorkLogs, allUpskillLogs, activityDurations } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("day");
    const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

    const timeData = useMemo(() => {
        const getLoggedMinutes = (activity: Activity, dateKey: string): number => {
            if (activity.type === 'deepwork' || activity.type === 'upskill') {
                const logs = activity.type === 'deepwork' ? allDeepWorkLogs : allUpskillLogs;
                const dailyLog = logs.find(log => log.date === dateKey);
                if (!dailyLog || !activity.taskIds) return 0;
                
                const relevantExercises = dailyLog.exercises.filter(ex => activity.taskIds!.includes(ex.id));
                const durationField = activity.type === 'deepwork' ? 'weight' : 'reps';
                return relevantExercises.reduce((total, ex) => total + ex.loggedSets.reduce((sum, set) => sum + set[durationField], 0), 0);
            }
            return 0;
        };
        
        const parseDurationToMinutes = (durationStr: string | undefined): number => {
            if (!durationStr) return 0;
            let totalMinutes = 0;
            const hourMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*h/);
            if (hourMatch) totalMinutes += parseFloat(hourMatch[1]) * 60;
            const minMatch = durationStr.match(/(\d+)\s*m/);
            if (minMatch) totalMinutes += parseFloat(minMatch[1]);
            return totalMinutes;
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
                if (dailySchedule[slot]) {
                    dailySchedule[slot].forEach(activity => {
                        if (filterActivity(activity)) {
                            let duration = 0;
                            if (activity.type === 'deepwork' || activity.type === 'upskill') {
                                duration = getLoggedMinutes(activity, dateKey);
                            } else {
                                duration = parseDurationToMinutes(activityDurations[activity.id]);
                            }
                            processedActivities.push({ ...activity, slot, calculatedDuration: duration });
                        }
                    });
                }
            });
            dailyData[dateKey] = processedActivities;
        }

        return { dailyData };
    }, [selectedDate, viewMode, activityFilter, schedule, allDeepWorkLogs, allUpskillLogs, activityDurations]);
    
    const renderDayView = () => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const activities = timeData.dailyData[dateKey] || [];
        const totalMinutes = activities.reduce((sum, act) => sum + act.calculatedDuration, 0);

        return (
            <Card>
                <CardHeader>
                    <CardTitle>Day View: {format(selectedDate, 'PPP')}</CardTitle>
                    <CardDescription>Total time for selected filters: {formatMinutes(totalMinutes)}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Slot</TableHead>
                                <TableHead className="w-[120px]">Type</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right w-[100px]">Duration</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activities.length > 0 ? activities.map(activity => (
                                <TableRow key={activity.id}>
                                    <TableCell>{activity.slot}</TableCell>
                                    <TableCell><span className="capitalize">{activity.type.replace('_', ' + ')}</span></TableCell>
                                    <TableCell>{activity.details}</TableCell>
                                    <TableCell className="text-right font-medium">{formatMinutes(activity.calculatedDuration)}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">No activities matching your filter for this day.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
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
                            <Popover key={dateKey}>
                                <PopoverTrigger asChild>
                                    <Card className={cn("cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 hover:bg-accent", isSameDay(day, new Date()) && "bg-muted")}>
                                        <CardHeader className="p-4">
                                            <CardTitle className="text-base flex justify-between">
                                                {format(day, 'EEE, MMM d')}
                                                <span className="font-bold">{totalDayMinutes > 0 ? formatMinutes(totalDayMinutes) : "-"}</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 text-sm space-y-1">
                                            {Object.entries(dailyTotals).length > 0 ? Object.entries(dailyTotals).map(([type, minutes]) => (
                                                minutes > 0 &&
                                                <div key={type} className="flex justify-between text-muted-foreground">
                                                    <span className="capitalize">{type.replace('_', ' + ')}</span>
                                                    <span className="font-medium text-foreground">{formatMinutes(minutes)}</span>
                                                </div>
                                            )) : <p className="text-xs text-center text-muted-foreground">No activities</p>}
                                        </CardContent>
                                    </Card>
                                </PopoverTrigger>
                                <DayDetailPopoverContent date={day} activities={activities} />
                            </Popover>
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
                                <Popover key={data.dateKey}>
                                    <PopoverTrigger asChild>
                                        <Card className="flex flex-col cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 hover:bg-accent">
                                            <CardHeader className="p-3">
                                                <CardTitle className="text-sm flex justify-between">
                                                    {format(data.day, 'EEE, MMM d')}
                                                    <span className="font-bold text-primary">{formatMinutes(data.totalDuration)}</span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 pt-0 text-xs text-muted-foreground flex-grow">
                                                <ul className="list-disc list-inside space-y-1">
                                                    {data.tasks.map((task, i) => (
                                                        task.calculatedDuration > 0 && <li key={i} className="truncate" title={task.details}>{task.details} ({formatMinutes(task.calculatedDuration)})</li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    </PopoverTrigger>
                                    <DayDetailPopoverContent date={data.day} activities={data.tasks} />
                                </Popover>
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
