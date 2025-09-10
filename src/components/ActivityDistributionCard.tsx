
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import type { Activity, ActivityType, DatedWorkout, DailySchedule } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';
import { PieChart as PieChartIcon, X, LineChart as LineChartIcon } from 'lucide-react';
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from './ui/separator';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, PieChart, Pie, Tooltip, Line, LineChart as RechartsLineChart, CartesianGrid } from 'recharts';


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
    'Untracked Time': 'hsl(var(--muted))',
    'Scheduled': 'hsl(var(--muted))',
    'Free Time': 'hsl(var(--muted))',
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
    historicalData: { date: string; time: number }[];
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
                                                return (
                                                <div className="p-2 bg-background border rounded-md text-xs shadow-lg">
                                                    <p>{format(parseISO(label), 'PPP')}: <strong>{formatMinutes(payload[0].value as number)}</strong></p>
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

export function ActivityDistributionCard() {
    const { 
        schedule, 
        currentSlot,
        activityDurations,
        allUpskillLogs,
        allDeepWorkLogs,
        allWorkoutLogs,
        brandingLogs,
        allLeadGenLogs,
    } = useAuth();
    
    const [isClient, setIsClient] = useState(false);
    const [detailDialogState, setDetailDialogState] = useState<ActivityDetailDialogState | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [position, setPosition] = useState({ x: 20, y: 870 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
      setIsClient(true);
    }, []);

    const parseDurationToMinutes = (durationStr: string | undefined): number => {
        if (!durationStr || typeof durationStr !== 'string') return 0;
        let totalMinutes = 0;
        const hourMatch = durationStr.match(/(\d+)\s*h/);
        if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
        const minMatch = durationStr.match(/(\d+)\s*m/);
        if (minMatch) totalMinutes += parseInt(minMatch[1], 10);
        
        // Handle cases like "30" without units
        if (!hourMatch && !minMatch && /^\d+$/.test(durationStr.trim())) {
            totalMinutes = parseInt(durationStr.trim(), 10);
        }
        return totalMinutes;
    };

    const timeAllocation = useMemo(() => {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const dailySchedule = schedule[todayKey] || {};
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
                    const mappedName = activityNameMap[activity.type];
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

    const getHistoricalData = (category: string): { date: string; time: number }[] => {
        const activityType = Object.keys(activityNameMap).find(key => activityNameMap[key as ActivityType] === category) as ActivityType | undefined;
        if (!activityType) return [];
    
        let logs: DatedWorkout[];
        let durationField: 'reps' | 'weight' = 'weight'; // default
    
        switch (activityType) {
            case 'deepwork': logs = allDeepWorkLogs; durationField = 'weight'; break;
            case 'upskill': logs = allUpskillLogs; durationField = 'reps'; break;
            case 'workout': logs = allWorkoutLogs; durationField = 'weight'; break; // Placeholder for workout duration
            case 'branding': logs = brandingLogs; durationField = 'weight'; break;
            case 'lead-generation': logs = allLeadGenLogs; durationField = 'weight'; break;
            default: return [];
        }
    
        const dailyTotals: Record<string, number> = {};
        logs.forEach(log => {
            const dayTotal = log.exercises.reduce((sum, ex) =>
                sum + ex.loggedSets.reduce((setSum, set) => setSum + (set[durationField] || 0), 0)
            , 0);
            if (dayTotal > 0) {
                dailyTotals[log.date] = (dailyTotals[log.date] || 0) + dayTotal;
            }
        });
    
        return Object.entries(dailyTotals)
            .map(([date, time]) => ({ date, time }))
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
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                onMouseDown={handleMouseDown}
            >
                <Card className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg">
                    <div className="cursor-grab active:cursor-grabbing">
                        <CardHeader className="p-0 mb-3">
                            <CardTitle className="flex items-center gap-2 text-base text-primary">
                                <PieChartIcon className="h-5 w-5 text-blue-500" />
                                Activity Distribution
                            </CardTitle>
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
        </>
    );
}
    

    