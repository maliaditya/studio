
"use client";

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import type { Activity, ActivityType, DatedWorkout } from '@/types/workout';
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
};

const formatMinutes = (minutes: number) => {
    if (minutes < 1) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
};

export function ActivityDistributionCard() {
    const { 
        schedule, 
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
            logs = allDeepWorkLogs;
            durationField = 'weight'; 
            break;
          case 'branding':
            logs = brandingLogs;
            durationField = 'weight';
            break;
          case 'lead-generation':
            logs = allLeadGenLogs;
            durationField = 'weight'; // Assuming 1 action = 1 min for simplicity in this context
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
        const activities = Object.values(dailySchedule).flat() as Activity[];
        
        const totals: Record<string, number> = {};

        activities.forEach(activity => {
            if (activity && activity.completed) {
                const mappedName = activityNameMap[activity.type];
                const duration = getLoggedMinutes(activity, todayKey);
                if (mappedName && duration > 0) {
                    totals[mappedName] = (totals[mappedName] || 0) + duration;
                }
            }
        });

        return Object.entries(totals)
            .map(([name, time]) => ({ name, time }))
            .sort((a, b) => b.time - a.time);

    }, [schedule, todayKey, getLoggedMinutes]);

    if (timeAllocation.length === 0) {
        return null;
    }

    return (
        <motion.div
            className="fixed bottom-4 left-4 z-50 w-full max-w-xs"
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
