
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import type { Activity, ActivityType, DatedWorkout, DailySchedule } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';
import { PieChart as PieChartIcon } from 'lucide-react';

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
    'Deep Work': 'bg-green-500',
    'Learning': 'bg-blue-500',
    'Workout': 'bg-red-500',
    'Mindset': 'bg-purple-500',
    'Branding': 'bg-pink-500',
    'Lead Gen': 'bg-yellow-500',
    'Essentials': 'bg-gray-400',
    'Planning': 'bg-teal-500',
    'Tracking': 'bg-indigo-500',
    'Interrupts': 'bg-orange-600',
    'Distractions': 'bg-amber-600',
    'Nutrition': 'bg-lime-500',
    'Wasted Time': 'bg-orange-600',
    'Scheduled': 'bg-sky-500',
    'Free Time': 'bg-gray-400',
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

export function ActivityDistributionCard() {
    const { 
        schedule, 
        currentSlot,
        activityDurations
    } = useAuth();
    
    const [timeAllocation, setTimeAllocation] = useState<{ name: string; time: number }[]>([]);

    const parseDurationToMinutes = (durationStr: string | undefined): number => {
        if (!durationStr || typeof durationStr !== 'string') return 0;
        if (/^\d+$/.test(durationStr.trim())) {
            return parseInt(durationStr.trim(), 10);
        }
        let totalMinutes = 0;
        const hourMatch = durationStr.match(/(\d+)\s*h/);
        if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
        const minMatch = durationStr.match(/(\d+)\s*m/);
        if (minMatch) totalMinutes += parseInt(minMatch, 10);
        return totalMinutes;
    };

    useEffect(() => {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const dailySchedule = schedule[todayKey] || {};
        const totals: Record<string, number> = {};
        let wastedTime = 0;
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
                if (activity.completed) {
                    const duration = parseDurationToMinutes(activityDurations[activity.id]);
                    const mappedName = activityNameMap[activity.type];
                    if (mappedName) {
                        totals[mappedName] = (totals[mappedName] || 0) + duration;
                    }
                    loggedInSlot += duration;
                } else if (!isPastSlot) {
                    // It's a future or current slot, count as scheduled
                    const estDuration = parseDurationToMinutes(activityDurations[activity.id]);
                    scheduledInSlot += estDuration;
                }
            });

            totalLoggedMinutes += loggedInSlot;
            scheduledTime += scheduledInSlot;
            
            if (isPastSlot) {
                wastedTime += Math.max(0, 240 - loggedInSlot);
            }
        });
        
        if (wastedTime > 0) {
          totals['Wasted Time'] = wastedTime;
        }

        if (scheduledTime > 0) {
            totals['Scheduled'] = scheduledTime;
        }
        
        const totalAccountedForTime = totalLoggedMinutes + wastedTime + scheduledTime;
        const totalMinutesInDay = 24 * 60;
        const freeTime = totalMinutesInDay - totalAccountedForTime;

        if (freeTime > 0) {
            totals['Free Time'] = freeTime;
        }

        const newTimeAllocation = Object.entries(totals)
            .map(([name, time]) => ({ name, time }))
            .sort((a, b) => b.time - a.time);

        setTimeAllocation(newTimeAllocation);
        
    }, [schedule, currentSlot, activityDurations]);


    if (timeAllocation.length === 0) {
        return null;
    }

    return (
        <motion.div
            className="fixed bottom-20 left-4 z-50 w-full max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg">
                <CardHeader className="p-0 mb-3">
                    <CardTitle className="flex items-center gap-2 text-base text-primary">
                        <PieChartIcon className="h-5 w-5" />
                        Activity Distribution
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-48 pr-3">
                        <ul className="space-y-2">
                            {timeAllocation.map(item => (
                                <li key={item.name}>
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${activityColorMapping[item.name] || 'bg-gray-400'}`}></div>
                                            <span className="font-medium text-foreground">{item.name}</span>
                                        </div>
                                        <span className="font-semibold text-muted-foreground">{formatMinutes(item.time)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </CardContent>
            </Card>
        </motion.div>
    );
}
