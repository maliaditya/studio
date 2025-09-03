
"use client";

import React, { useMemo } from 'react';
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

const slotOrder: { name: string; endHour: number }[] = [
    { name: 'Late Night', endHour: 4 },
    { name: 'Dawn', endHour: 8 },
    { name: 'Morning', endHour: 12 },
    { name: 'Afternoon', endHour: 16 },
    { name: 'Evening', endHour: 20 },
    { name: 'Night', endHour: 24 }
];

export function ActivityDistributionCard() {
    const { 
        schedule, 
        currentSlot,
        allDeepWorkLogs, 
        allUpskillLogs,
        allWorkoutLogs,
        brandingLogs,
        allLeadGenLogs,
        activityDurations
    } = useAuth();
    
    const todayKey = format(new Date(), 'yyyy-MM-dd');

    const getLoggedMinutes = (activity: Activity, dateKey: string): number => {
        if (!activity.completed) return 0;
      
        const activityTaskIds = new Set(activity.taskIds || []);
        
        let logs: DatedWorkout[] = [];
        let durationField: 'reps' | 'weight' | null = null;
        let isWorkout = false;
      
        switch (activity.type) {
          case 'upskill':
            logs = allUpskillLogs;
            durationField = 'reps';
            break;
          case 'deepwork':
          case 'branding':
          case 'lead-generation':
            logs = activity.type === 'deepwork' ? allDeepWorkLogs : activity.type === 'branding' ? brandingLogs : allLeadGenLogs;
            durationField = 'weight'; 
            break;
          case 'workout':
            logs = allWorkoutLogs;
            isWorkout = true;
            break;
          default:
            return activity.duration || 0;
        }
      
        if (activityTaskIds.size === 0) {
          return activity.duration || 0;
        }
    
        const logForDay = logs.find(l => l.date === dateKey);
        if (!logForDay) return 0;
      
        return logForDay.exercises
          .filter(ex => activityTaskIds.has(ex.id))
          .reduce((sum, ex) => {
            return sum + (ex.loggedSets || []).reduce((setSum, set) => {
              if (isWorkout) {
                return setSum + 15;
              }
              return setSum + (set[durationField!] || 0);
            }, 0);
          }, 0);
      };

    const timeAllocation = useMemo(() => {
        const dailySchedule = schedule[todayKey] || {};
        const totals: Record<string, number> = {};
        let wastedTime = 0;
        let scheduledButNotCompletedTime = 0;

        const currentHour = new Date().getHours();
        
        slotOrder.forEach(slot => {
            const activities = (dailySchedule[slot.name as keyof DailySchedule] as Activity[]) || [];
            let loggedInSlot = 0;

            activities.forEach(activity => {
                const duration = getLoggedMinutes(activity, todayKey);
                if (activity.completed && duration > 0) {
                    const mappedName = activityNameMap[activity.type];
                    if (mappedName) {
                        totals[mappedName] = (totals[mappedName] || 0) + duration;
                    }
                    loggedInSlot += duration;
                } else if (!activity.completed) {
                   const estDurationStr = activityDurations[activity.id];
                   const estDuration = estDurationStr ? parseInt(estDurationStr.replace(/[a-zA-Z\s]/g, '')) || 0 : 0;
                   scheduledButNotCompletedTime += estDuration;
                }
            });

            if (currentHour >= slot.endHour) { // Slot has passed
                wastedTime += Math.max(0, 240 - loggedInSlot);
            }
        });
        
        if (wastedTime > 0) {
          totals['Wasted Time'] = wastedTime;
        }
        
        const totalLoggedAndWasted = Object.values(totals).reduce((sum, t) => sum + t, 0);
        const totalMinutesInDay = 24 * 60;
        const freeTime = totalMinutesInDay - totalLoggedAndWasted - scheduledButNotCompletedTime;

        if (freeTime > 0) {
            totals['Free Time'] = freeTime;
        }


        return Object.entries(totals)
            .map(([name, time]) => ({ name, time }))
            .sort((a, b) => b.time - a.time);

    }, [schedule, todayKey, getLoggedMinutes, currentSlot, activityDurations]);

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
