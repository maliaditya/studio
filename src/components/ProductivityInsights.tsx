
"use client";

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Lightbulb, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import type { Activity, ActivityType } from '@/types/workout';

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

const isProductive: Record<string, boolean> = {
    'Deep Work': true,
    'Learning': true,
    'Workout': true,
    'Mindset': true,
    'Branding': true,
    'Essentials': true,
    'Planning': true,
    'Tracking': true,
    'Lead Gen': true,
    'Nutrition': true,
    'Pomodoro': true,
    'Interrupts': false,
    'Distractions': false,
};


export function ProductivityInsights() {
    const { schedule, activityDurations } = useAuth();

    const todaysInsights = useMemo(() => {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const daySchedule = schedule[todayKey] || {};
        const dailyTotals: Record<string, { time: number; tasks: { name: string; duration: number }[], slots: Set<string> }> = {};

        const parseDurationToMinutes = (durationStr: string | undefined): number => {
            if (!durationStr) return 0;
            const hourMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*h/);
            const minMatch = durationStr.match(/(\d+)\s*m/);
            let totalMinutes = 0;
            if (hourMatch) totalMinutes += parseFloat(hourMatch[1]) * 60;
            if (minMatch) totalMinutes += parseInt(minMatch[1], 10);
            if (!hourMatch && !minMatch && /^\d+$/.test(durationStr.trim())) {
                totalMinutes += parseInt(durationStr.trim(), 10);
            }
            return totalMinutes;
        };

        Object.values(daySchedule).flat().forEach((activity: Activity) => {
            if (activity?.completed) {
                const effectiveType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
                const mappedName = activityNameMap[effectiveType];
                const duration = parseDurationToMinutes(activityDurations[activity.id]);

                if (mappedName && duration > 0) {
                    if (!dailyTotals[mappedName]) {
                        dailyTotals[mappedName] = { time: 0, tasks: [], slots: new Set() };
                    }
                    dailyTotals[mappedName].time += duration;
                    dailyTotals[mappedName].tasks.push({ name: activity.details, duration });
                    if (activity.slot) {
                      dailyTotals[mappedName].slots.add(activity.slot);
                    }
                }
            }
        });
        
        const sortedActivities = Object.entries(dailyTotals)
            .map(([name, data]) => ({ 
                name, 
                ...data,
                slots: Array.from(data.slots) 
            }))
            .sort((a, b) => b.time - a.time);

        const productiveActivities = sortedActivities.filter(a => isProductive[a.name]).slice(0, 2);
        const unproductiveActivities = sortedActivities.filter(a => !isProductive[a.name]).slice(0, 2);

        return {
            productive: productiveActivities,
            unproductive: unproductiveActivities,
        };

    }, [schedule, activityDurations]);

    const formatMinutes = (minutes: number) => {
        if (minutes < 60) return `${Math.round(minutes)}m`;
        return `${(minutes / 60).toFixed(1)}h`;
    }

    return (
        <Card className="bg-transparent border-0 shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb />
                    Today's Insights
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {todaysInsights.productive.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold mb-1">Productive Focus</h4>
                            <p className="text-sm text-muted-foreground">
                                Your main efforts today were in: {todaysInsights.productive.map(a => `${a.name} (${a.slots.join(', ')})`).join(' and ')}.
                            </p>
                             <ul className="text-xs text-muted-foreground list-disc list-inside pl-2 mt-1">
                                {todaysInsights.productive.flatMap(a => a.tasks).map((task, i) => (
                                    <li key={i} className="truncate" title={task.name}>{task.name} ({formatMinutes(task.duration)})</li>
                                ))}
                            </ul>
                        </div>
                    )}
                     {todaysInsights.unproductive.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold mb-1">Main Distractions</h4>
                            <p className="text-sm text-muted-foreground">
                                Your biggest time sinks were: {todaysInsights.unproductive.map(a => `${a.name} (${a.slots.join(', ')})`).join(' and ')}.
                            </p>
                            <ul className="text-xs text-muted-foreground list-disc list-inside pl-2 mt-1">
                                {todaysInsights.unproductive.flatMap(a => a.tasks).map((task, i) => (
                                    <li key={i} className="truncate" title={task.name}>{task.name} ({formatMinutes(task.duration)})</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {todaysInsights.productive.length === 0 && todaysInsights.unproductive.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Log some activities to generate today's insights.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
