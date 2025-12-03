

"use client";

import React, { useMemo } from 'react';
import { Lightbulb, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format, isBefore, parseISO, startOfDay, subDays } from 'date-fns';
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

const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    return `${(minutes / 60).toFixed(1)}h`;
}

interface ProductivityInsightsProps {
    activities: Activity[];
    date: Date;
}

const ChainDisplay = ({ chain, isUnproductive = false }: { chain: { name: string; up?: boolean }[], isUnproductive?: boolean }) => (
    <div className="flex items-center gap-1.5 text-xs font-semibold flex-wrap">
        {chain.map((item, index) => (
            <React.Fragment key={item.name}>
                <div className="flex items-center gap-0.5">
                    <span className={item.up === false ? 'text-muted-foreground' : 'text-foreground'}>{item.name}</span>
                    {item.up !== false ? <ArrowUp className="h-3 w-3 text-green-500" /> : <ArrowDown className="h-3 w-3 text-red-500" />}
                </div>
                {index < chain.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </React.Fragment>
        ))}
    </div>
);


export function ProductivityInsights({ activities, date }: ProductivityInsightsProps) {
    const { activityDurations } = useAuth();

    const dailyInsights = useMemo(() => {
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

        activities.forEach((activity: Activity) => {
            if (activity?.completed) {
                const effectiveType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
                const mappedName = activityNameMap[effectiveType];
                const duration = parseDurationToMinutes(activityDurations[activity.id] || `${activity.duration || 0}`);
                
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

        const keyProductive = ['Planning', 'Learning', 'Deep Work'];
        const productiveChain = keyProductive
            .map(name => ({ name, time: dailyTotals[name]?.time || 0 }))
            .sort((a, b) => b.time - a.time)
            .filter(item => item.time > 0);

        const keyUnproductive = ['Interrupts', 'Distractions'];

        const topUnproductive = unproductiveActivities[0];
        let unproductiveChain: { name: string; up?: boolean }[] = [];

        if (topUnproductive) {
            unproductiveChain.push({ name: topUnproductive.name, up: true });
            const leastProductive = keyProductive
                .map(name => ({ name, time: dailyTotals[name]?.time || 0 }))
                .sort((a,b) => a.time - b.time)[0];
            
            if (leastProductive && leastProductive.time === 0) {
                 unproductiveChain.push({ name: leastProductive.name, up: false });
            }
        }
        
        return {
            productive: productiveActivities,
            unproductive: unproductiveActivities,
            productiveChain,
            unproductiveChain,
        };

    }, [activities, activityDurations]);

    return (
        <div className="space-y-4">
            {dailyInsights.productive.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-1">Productive Focus</h4>
                    {dailyInsights.productiveChain.length > 0 && <ChainDisplay chain={dailyInsights.productiveChain} />}
                    <p className="text-sm text-muted-foreground mt-2">
                        Your main efforts were in: {dailyInsights.productive.map(a => `${a.name} (${a.slots.join(', ')})`).join(' and ')}.
                    </p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside pl-2 mt-1">
                        {dailyInsights.productive.flatMap(a => a.tasks).map((task, i) => (
                            <li key={i} className="truncate" title={task.name}>{task.name} ({formatMinutes(task.duration)})</li>
                        ))}
                    </ul>
                </div>
            )}
            {dailyInsights.unproductive.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold mb-1">Main Distractions</h4>
                    {dailyInsights.unproductiveChain.length > 0 && <ChainDisplay chain={dailyInsights.unproductiveChain} isUnproductive={true} />}
                    <p className="text-sm text-muted-foreground mt-2">
                        Your biggest time sinks were: {dailyInsights.unproductive.map(a => `${a.name} (${a.slots.join(', ')})`).join(' and ')}.
                    </p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside pl-2 mt-1">
                        {dailyInsights.unproductive.flatMap(a => a.tasks).map((task, i) => (
                            <li key={i} className="truncate" title={task.name}>{task.name} ({formatMinutes(task.duration)})</li>
                        ))}
                    </ul>
                </div>
            )}
            {dailyInsights.productive.length === 0 && dailyInsights.unproductive.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                    Log some activities to generate insights for this day.
                </p>
            )}
        </div>
    );
}
