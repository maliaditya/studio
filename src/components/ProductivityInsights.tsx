
"use client";

import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Lightbulb, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import type { Activity, ActivityType } from '@/types/workout';

const CORRELATION_THRESHOLD = 0.4;
const LAG_DAYS = 1; // For checking next-day impact

const activityOrder: ActivityType[] = [
    'planning', 'learning', 'deepwork', 'workout', 'mindset',
    'branding', 'lead-generation', 'essentials', 'tracking', 
    'nutrition', 'interrupts', 'distractions'
];

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

    const insightChains = useMemo(() => {
        const today = new Date();
        const thirtyDaysAgo = subDays(today, 30);
        const dateRange = eachDayOfInterval({ start: thirtyDaysAgo, end: today });
        const dailyTotals: Record<string, Record<ActivityType, number>> = {};

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

        dateRange.forEach(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const daySchedule = schedule[dateKey] || {};
            const totalsForDay: Record<ActivityType, number> = {} as any;

            activityOrder.forEach(type => totalsForDay[type] = 0);

            Object.values(daySchedule).flat().forEach((activity: Activity) => {
                if (activity?.completed) {
                    const effectiveType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
                    const duration = parseDurationToMinutes(activityDurations[activity.id]);
                    if (duration > 0 && totalsForDay[effectiveType] !== undefined) {
                        totalsForDay[effectiveType] += duration;
                    }
                }
            });
            dailyTotals[dateKey] = totalsForDay;
        });

        const dailyTotalsArray = Object.values(dailyTotals);
        if (dailyTotalsArray.length < 2) return [];

        const correlations: { source: ActivityType, target: ActivityType, score: number }[] = [];

        for (let i = 0; i < activityOrder.length; i++) {
            for (let j = i + 1; j < activityOrder.length; j++) {
                const typeA = activityOrder[i];
                const typeB = activityOrder[j];

                let n = dailyTotalsArray.length;
                let sum_A = 0, sum_B = 0, sum_AB = 0, sum_A2 = 0, sum_B2 = 0;
                
                for(let k = 0; k < n; k++) {
                    const valA = dailyTotalsArray[k][typeA] || 0;
                    const valB = dailyTotalsArray[k][typeB] || 0;
                    sum_A += valA;
                    sum_B += valB;
                    sum_AB += valA * valB;
                    sum_A2 += valA * valA;
                    sum_B2 += valB * valB;
                }

                const numerator = n * sum_AB - sum_A * sum_B;
                const denominator = Math.sqrt((n * sum_A2 - sum_A * sum_A) * (n * sum_B2 - sum_B * sum_B));
                
                if (denominator !== 0) {
                    const score = numerator / denominator;
                    if (Math.abs(score) > CORRELATION_THRESHOLD) {
                        correlations.push({ source: typeA, target: typeB, score });
                    }
                }
            }
        }
        
        const positiveChain = correlations
            .filter(c => c.score > 0 && isProductive[c.source] && isProductive[c.target])
            .sort((a,b) => b.score - a.score);

        const negativeChain = correlations
            .filter(c => c.score < 0 && isProductive[c.source] !== isProductive[c.target])
            .sort((a,b) => a.score - b.score);
        
        const buildChain = (chainData: typeof correlations, isPositive: boolean) => {
            if (chainData.length === 0) return null;
            const chain = [chainData[0].source, chainData[0].target];
            const usedTypes = new Set(chain);

            for (let i = 1; i < chainData.length && chain.length < 5; i++) {
                const nextLink = chainData[i];
                if (!usedTypes.has(nextLink.source) && chain[chain.length - 1] === nextLink.target) {
                     // This logic is too simple, but it's a start
                } else if (!usedTypes.has(nextLink.target) && chain.includes(nextLink.source)) {
                     chain.push(nextLink.target);
                     usedTypes.add(nextLink.target);
                } else if (!usedTypes.has(nextLink.source) && chain.includes(nextLink.target)) {
                    chain.push(nextLink.source);
                    usedTypes.add(nextLink.source);
                }
            }
            return chain.map(type => ({ type, name: activityNameMap[type] || type, isUp: isPositive ? isProductive[type] : isPositive, isDown: !isPositive ? isProductive[type] : !isPositive }));
        };
        
        const positiveInsight = buildChain(positiveChain, true);
        const negativeInsight = buildChain(negativeChain, false);
        
        const formattedChains = [];
        if (positiveInsight) formattedChains.push(positiveInsight);
        if (negativeInsight) formattedChains.push(negativeInsight);

        return formattedChains;

    }, [schedule, activityDurations]);

    const InsightChain = ({ chain }: { chain: {name: string, isUp: boolean}[] }) => (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {chain.map((link, index) => (
                <React.Fragment key={index}>
                    <div className="flex items-center gap-1">
                        <span className="font-medium">{link.name}</span>
                        {link.isUp ? <ArrowUp className="h-4 w-4 text-green-500" /> : <ArrowDown className="h-4 w-4 text-red-500" />}
                    </div>
                    {index < chain.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                </React.Fragment>
            ))}
        </div>
    );

    return (
        <Card className="bg-transparent border-0 shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb />
                    Productivity Insights
                </CardTitle>
            </CardHeader>
            <CardContent>
                {insightChains.length > 0 ? (
                    <div className="space-y-4">
                        {insightChains.map((chain, index) => <InsightChain key={index} chain={chain} />)}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Log more activities to generate productivity insights.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
