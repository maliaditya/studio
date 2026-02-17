
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { format, isBefore, startOfDay, parseISO, subDays } from 'date-fns';
import type { Activity, ActivityType, DailySchedule, DatedWorkout, FullSchedule } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';
import { PieChart as PieChartIcon, X, LineChart as LineChartIcon, Expand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from './ui/separator';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, PieChart, Tooltip, Line, LineChart as RechartsLineChart, CartesianGrid, Legend } from 'recharts';


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
    pomodoro: 'Pomodoro',
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
    'Untracked Time': 'hsl(var(--muted))',
    'Scheduled': 'hsl(var(--muted))',
    'Free Time': 'hsl(var(--muted))',
    'Mindset': 'hsl(var(--chart-5))',
};

const formatMinutes = (minutes: number) => {
    if (minutes < 1) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
};

const slotOrder: { name: string; endHour: number, startHour: number }[] = [
    { name: 'Late Night', endHour: 4, startHour: 0 },
    { name: 'Dawn', endHour: 8, startHour: 4 },
    { name: 'Morning', endHour: 12, startHour: 8 },
    { name: 'Afternoon', endHour: 16, startHour: 12 },
    { name: 'Evening', endHour: 20, startHour: 16 },
    { name: 'Night', endHour: 24, startHour: 20 }
];

interface ActivityDetailDialogState {
    category: string;
    tasks: { name: string; duration: number }[];
    historicalData: { date: string; time: number; activities: { name: string, duration: number }[] }[];
}

const ActivityDetailDialog = ({ dialogState, onClose }: {
    dialogState: ActivityDetailDialogState;
    onClose: () => void;
}) => {
    return (
        <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Trend for: {dialogState.category}</DialogTitle>
                    <DialogDescriptionComponent>
                        Showing your logged time for this activity over its history.
                    </DialogDescriptionComponent>
                </DialogHeader>
                <div className="flex-grow min-h-0 py-4">
                    {dialogState.historicalData.length > 1 ? (
                        <ChartContainer config={{ time: { label: 'Time (min)' } }} className="h-full w-full">
                            <ResponsiveContainer>
                                <RechartsLineChart data={dialogState.historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" fontSize={10} tickFormatter={(tick) => format(parseISO(tick), 'MMM d')} />
                                    <YAxis fontSize={10} />
                                    <ChartTooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                <div className="p-2 bg-background border rounded-md text-xs shadow-lg max-w-sm">
                                                    <p>{format(parseISO(label), 'PPP')}: <strong>{formatMinutes(payload[0].value as number)}</strong></p>
                                                    {(data.activities && data.activities.length > 0) && (
                                                        <>
                                                            <Separator className="my-1.5" />
                                                            <ul className="space-y-1">
                                                                {data.activities.map((act: { name: string; duration: number }, index: number) => (
                                                                    <li key={index} className="text-muted-foreground">{act.name} ({formatMinutes(act.duration)})</li>
                                                                ))}
                                                            </ul>
                                                        </>
                                                    )}
                                                </div>
                                                )
                                            }
                                            return null
                                        }}
                                    />
                                    <Line type="monotone" dataKey="time" stroke={activityColorMapping[dialogState.category] || 'hsl(var(--primary))'} strokeWidth={2} dot={false} />
                                </RechartsLineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            <p>Not enough data to draw a trend line for this activity.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const AllTrendsModal = ({ isOpen, onOpenChange, allCategoriesData }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    allCategoriesData: { category: string, historicalData: { date: string, time: number }[] }[];
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
                 <DialogHeader>
                    <DialogTitle>All Activity Trends</DialogTitle>
                    <DialogDescriptionComponent>
                        A historical overview of time spent in each category.
                    </DialogDescriptionComponent>
                </DialogHeader>
                <div className="flex-grow min-h-0 py-4">
                    <ScrollArea className="h-full pr-4">
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
                                        <div className="h-[200px] w-full">
                                        {historicalData.length > 1 ? (
                                            <ChartContainer config={{ time: { label: 'Time (min)' } }} className="w-full h-full">
                                                <ResponsiveContainer>
                                                    <RechartsLineChart data={historicalData} margin={{top: 5, right: 10, left: -20, bottom: -10}}>
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
                                                        <Line type="monotone" dataKey="time" stroke={activityColorMapping[category]} strokeWidth={2} dot={false} />
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
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
};


export function ActivityDistributionCard() {
    const { 
        schedule, 
        currentSlot,
        activityDurations,
    } = useAuth();
    
    const [isClient, setIsClient] = useState(false);
    const [detailDialogState, setDetailDialogState] = useState<ActivityDetailDialogState | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isAllTrendsModalOpen, setIsAllTrendsModalOpen] = useState(false);

    const [position, setPosition] = useState({ x: 20, y: 870 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
      setIsClient(true);
    }, []);

    const parseDurationToMinutes = (durationStr: string | undefined): number => {
        if (!durationStr || typeof durationStr !== 'string') return 0;
        let totalMinutes = 0;
        const hourMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*h/);
        const minMatch = durationStr.match(/(\d+)\s*m/);

        if (hourMatch) {
            totalMinutes += parseFloat(hourMatch[1]) * 60;
        }
        if (minMatch) {
            totalMinutes += parseInt(minMatch[1], 10);
        }
        if (!hourMatch && !minMatch && /^\d+$/.test(durationStr.trim())) {
            return parseInt(durationStr.trim(), 10);
        }
        return totalMinutes;
    };
    
    const timeAllocation = useMemo(() => {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const dailySchedule = schedule[todayKey] || {};
        const dailyActivities = Object.values(dailySchedule).flat() as Activity[];
        const totals: Record<string, { time: number; activities: { name: string; duration: number }[] }> = {};
        
        let untrackedTime = 0;
        let scheduledTime = 0;
        let totalLoggedMinutes = 0;

        const now = new Date();
        const currentHour = now.getHours();
        
        slotOrder.forEach(slot => {
            const activities = (dailySchedule[slot.name as keyof DailySchedule] as Activity[]) || [];
            let loggedInSlot = 0;
            let scheduledInSlot = 0;
            const isPastSlot = currentHour >= slot.endHour;

            activities.forEach(activity => {
                const duration = parseDurationToMinutes(activityDurations[activity.id]);
                
                if (activity.completed) {
                    const effectiveType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
                    const mappedName = activityNameMap[effectiveType];
                    if (mappedName) {
                        if (!totals[mappedName]) {
                            totals[mappedName] = { time: 0, activities: [] };
                        }
                        totals[mappedName].time += duration;
                        totals[mappedName].activities.push({ name: activity.details, duration });
                    }
                    loggedInSlot += duration;
                } else if (!isPastSlot) {
                    scheduledInSlot += duration;
                }
            });

            totalLoggedMinutes += loggedInSlot;
            
            if (isPastSlot) {
                untrackedTime += Math.max(0, 240 - loggedInSlot);
            }
            
            scheduledTime += scheduledInSlot;
        });
        
        if (untrackedTime > 0) {
          if (!totals['Untracked Time']) totals['Untracked Time'] = { time: 0, activities: [] };
          totals['Untracked Time'].time = untrackedTime;
        }

        if (scheduledTime > 0) {
            if (!totals['Scheduled']) totals['Scheduled'] = { time: 0, activities: [] };
            totals['Scheduled'].time = scheduledTime;
        }
        
        const totalAccountedForTime = totalLoggedMinutes + untrackedTime + scheduledTime;
        const totalMinutesInDay = 24 * 60;
        const freeTime = totalMinutesInDay - totalAccountedForTime;

        if (freeTime > 0) {
             if (!totals['Free Time']) totals['Free Time'] = { time: 0, activities: [] };
            totals['Free Time'].time = freeTime;
        }

        const PREFERRED_ORDER = ['Untracked Time', 'Free Time', 'Scheduled', 'Distractions'];

        return Object.entries(totals)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => {
                const aIndex = PREFERRED_ORDER.indexOf(a.name);
                const bIndex = PREFERRED_ORDER.indexOf(b.name);
        
                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;
                return b.time - a.time;
            });
        
    }, [schedule, currentSlot, activityDurations]);
    
    const allCategoriesData = useMemo(() => {
        const categories = Object.values(activityNameMap);
        const calculatedData = categories.map(category => {
          const dailyTotals: Record<string, number> = {};
          
          Object.entries(schedule).forEach(([date, dailySchedule]) => {
            if (!dailyTotals[date]) dailyTotals[date] = 0;
            
            Object.values(dailySchedule).flat().forEach((activity: Activity) => {
              if (activity && activity.completed) {
                const effectiveActivityType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
                if (activityNameMap[effectiveActivityType] === category) {
                    const duration = parseDurationToMinutes(activityDurations[activity.id]);
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

        const order = ['Planning', 'Learning', 'Deep Work', 'Essentials', 'Distractions', 'Workout', 'Interrupts', 'Nutrition', 'Branding', 'Lead Gen', 'Tracking', 'Mindset', 'Pomodoro'];

        return calculatedData.sort((a, b) => {
            const indexA = order.indexOf(a.category);
            const indexB = order.indexOf(b.category);

            if (indexA === -1 && indexB === -1) return 0; // both not in order list, keep original order
            if (indexA === -1) return 1; // a is not in order list, should come after
            if (indexB === -1) return -1; // b is not in order list, should come after a

            return indexA - indexB;
        });

    }, [schedule, activityDurations]);


    const getHistoricalData = (category: string): { date: string; time: number; activities: { name: string, duration: number }[] }[] => {
        const activityType = Object.keys(activityNameMap).find(key => activityNameMap[key as ActivityType] === category) as ActivityType | undefined;
        
        const dailyData: Record<string, { time: number; activities: { name: string; duration: number }[] }> = {};
    
        for (const dateKey in schedule) {
            const daySchedule = schedule[dateKey];
            let dailyTotalForCategory = 0;
            const dailyActivitiesForCategory: { name: string; duration: number }[] = [];
    
            for (const slotName in daySchedule) {
                const activities = daySchedule[slotName as keyof DailySchedule] as Activity[];
                if (Array.isArray(activities)) {
                    activities.forEach(activity => {
                         const effectiveActivityType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
                         if (activity.completed && ((activityType && effectiveActivityType === activityType) || (!activityType && activityNameMap[effectiveActivityType] === category))) {
                            const duration = parseDurationToMinutes(activityDurations[activity.id]);
                            if (duration > 0) {
                                dailyTotalForCategory += duration;
                                dailyActivitiesForCategory.push({ name: activity.details, duration });
                            }
                        }
                    });
                }
            }
    
            if (dailyTotalForCategory > 0) {
                if (!dailyData[dateKey]) {
                    dailyData[dateKey] = { time: 0, activities: [] };
                }
                dailyData[dateKey].time += dailyTotalForCategory;
                dailyData[dateKey].activities.push(...dailyActivitiesForCategory);
            }
        }
    
        return Object.entries(dailyData)
            .map(([date, data]) => ({ date, time: data.time, activities: data.activities }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };


    const handleItemClick = (item: { name: string; activities: { name: string, duration: number }[] }) => {
        const category = item.name;
        if (['Untracked Time', 'Free Time', 'Scheduled'].includes(category)) return;

        const historicalData = getHistoricalData(category);
        setDetailDialogState({
            category: category,
            tasks: item.activities,
            historicalData: historicalData,
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, [role="button"]')) {
            return;
        }
        setIsDragging(true);
        setDragStartOffset({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
    };
    
    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            setPosition({
            x: e.clientX - dragStartOffset.x,
            y: e.clientY - dragStartOffset.y,
            });
        }
    };
    
    const handleMouseUp = () => {
        setIsDragging(false);
        safeSetLocalStorageItem('all_resistances_position', JSON.stringify(position));
    };

    useEffect(() => {
        if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
        } else {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStartOffset]);
    
    const style: React.CSSProperties = {
        position: 'fixed',
        top: position.y,
        left: position.x,
        willChange: 'transform',
        userSelect: isDragging ? 'none' : 'auto',
    };
    
    if (!isClient) {
        return null;
    }
    
    if (timeAllocation.length === 0) {
        return null;
    }

    return (
        <>
            <motion.div
                ref={containerRef}
                style={style}
                className="fixed w-full max-w-xs z-50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                onMouseDown={handleMouseDown}
            >
                <Card className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg">
                    <div className="cursor-grab active:cursor-grabbing">
                        <CardHeader className="p-0 mb-3 flex flex-row justify-between items-center">
                            <CardTitle className="flex items-center gap-2 text-base text-primary">
                                <PieChartIcon className="h-5 w-5 text-blue-500" />
                                Activity Distribution
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setIsAllTrendsModalOpen(true)}>
                                <Expand className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                    </div>
                    <CardContent className="p-0">
                        <ScrollArea className="h-48 pr-3">
                            <ul className="space-y-2">
                                {timeAllocation.map(item => (
                                    <li key={item.name}>
                                        <button
                                            className="flex justify-between items-center text-sm w-full text-left group"
                                            onClick={(e) => handleItemClick(item)}
                                            disabled={['Untracked Time', 'Free Time', 'Scheduled'].includes(item.name)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activityColorMapping[item.name] || 'bg-gray-400' }}></div>
                                                <span className="font-medium text-foreground">{item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="font-semibold text-muted-foreground">{formatMinutes(item.time)}</span>
                                                {!['Untracked Time', 'Free Time', 'Scheduled'].includes(item.name) && (
                                                    <LineChartIcon className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors"/>
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </motion.div>
            {detailDialogState && (
                <ActivityDetailDialog
                    dialogState={detailDialogState}
                    onClose={() => setDetailDialogState(null)}
                />
            )}
             <AllTrendsModal
                isOpen={isAllTrendsModalOpen}
                onOpenChange={setIsAllTrendsModalOpen}
                allCategoriesData={allCategoriesData}
            />
        </>
    );
}
