
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

const isProductive: Record<ActivityType, boolean> = {
    planning: true,
    upskill: true,
    deepwork: true,
    workout: true,
    mindset: true,
    branding: true,
    'lead-generation': true,
    essentials: true,
    tracking: true,
    nutrition: true,
    interrupts: false,
    distractions: false,
    pomodoro: true,
};

export function ProductivityInsights() {
    const { schedule, activityDurations } = useAuth();

    const todaysInsights = useMemo(() => {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const daySchedule = schedule[todayKey] || {};
        const dailyTotals: Record<ActivityType, number> = {} as any;

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
                const duration = parseDurationToMinutes(activityDurations[activity.id]);
                if (duration > 0 && dailyTotals[effectiveType] !== undefined) {
                    dailyTotals[effectiveType] = (dailyTotals[effectiveType] || 0) + duration;
                } else if (duration > 0) {
                    dailyTotals[effectiveType] = duration;
                }
            }
        });
        
        const sortedActivities = Object.entries(dailyTotals)
            .map(([type, time]) => ({ type: type as ActivityType, time }))
            .sort((a, b) => b.time - a.time);

        const productiveActivities = sortedActivities.filter(a => isProductive[a.type]).slice(0, 2);
        const unproductiveActivities = sortedActivities.filter(a => !isProductive[a.type]).slice(0, 2);

        return {
            productive: productiveActivities,
            unproductive: unproductiveActivities,
        };

    }, [schedule, activityDurations]);


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
                                Your main efforts today were in: {todaysInsights.productive.map(a => activityNameMap[a.type]).join(' and ')}.
                            </p>
                        </div>
                    )}
                     {todaysInsights.unproductive.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold mb-1">Main Distractions</h4>
                            <p className="text-sm text-muted-foreground">
                                Your biggest time sinks were: {todaysInsights.unproductive.map(a => activityNameMap[a.type]).join(' and ')}.
                            </p>
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
