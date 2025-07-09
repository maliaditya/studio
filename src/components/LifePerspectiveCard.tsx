
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, subDays, isAfter, parseISO, differenceInDays } from 'date-fns';
import type { DatedWorkout, ExerciseDefinition, TopicGoal, WeightLog } from '@/types/workout';
import { LocalUser } from '@/types/workout';
import { BrainCircuit, ArrowUp, ArrowDown, PauseCircle, AlertCircle } from 'lucide-react';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';

interface LifePerspectiveCardProps {
    currentUser: LocalUser | null;
    allWorkoutLogs: DatedWorkout[];
    deepWorkDefinitions: ExerciseDefinition[];
    allDeepWorkLogs: DatedWorkout[];
    upskillDefinitions: ExerciseDefinition[];
    allUpskillLogs: DatedWorkout[];
    topicGoals: Record<string, TopicGoal>;
    weeklyStats: any; // Simplified for brevity
    weightLogs: WeightLog[];
}

export function LifePerspectiveCard({
    currentUser,
    weeklyStats
}: LifePerspectiveCardProps) {

    const userContext = useMemo(() => {
        return { username: currentUser?.username };
    }, [currentUser]);
    
    const getInsight = (current: number, prev: number, burnoutThreshold: number): { trend: 'up' | 'down' | 'stable' | 'burnout'; message: string } => { 
        if (current > burnoutThreshold) return { trend: 'burnout', message: `Potential burnout risk` }; 
        if (current > prev * 1.2) return { trend: 'up', message: `Up from ${prev.toFixed(1)}h last week` }; 
        if (current < prev * 0.8) { 
            if (prev > 0) return { trend: 'down', message: `Down from ${prev.toFixed(1)}h last week` }; 
            return { trend: 'down', message: `No activity last week` }; 
        } 
        if (current > 0) return { trend: 'stable', message: `Consistent with last week` }; 
        return { trend: 'stable', message: `No activity logged` }; 
    };

    const getWorkoutInsight = (current: number, prev: number) => {
        if (current > 7) return { trend: 'burnout' as const, message: `Potential overtraining` };
        if (current > prev) return { trend: 'up' as const, message: `Up from ${prev} last week` };
        if (current < prev) return { trend: 'down' as const, message: `Down from ${prev} last week` };
        if (current > 0) return { trend: 'stable' as const, message: `Consistent with last week` };
        return { trend: 'stable' as const, message: 'No workouts logged' };
    };

    const getWeightInsight = (current: number, prev: number, goal: number | null) => {
        if (current === 0 || prev === 0) return { trend: 'stable' as const, message: `Log weekly to see trends` };
        const change = current - prev;
        if (Math.abs(change) < 0.2) return { trend: 'stable' as const, message: `Weight is stable` };
        const trend = change > 0 ? 'up' : 'down';
        const message = `${trend === 'up' ? 'Up' : 'Down'} ${Math.abs(change).toFixed(1)} from last week`;
        return { trend, message };
    };

    const deepWorkInsight = getInsight(weeklyStats.deepWork.current, weeklyStats.deepWork.prev, 35);
    const upskillInsight = getInsight(weeklyStats.upskill.current, weeklyStats.upskill.prev, 28);
    const workoutInsight = getWorkoutInsight(weeklyStats.workouts.current, weeklyStats.workouts.prev);
    const weightInsight = getWeightInsight(weeklyStats.weight.current, weeklyStats.weight.prev, weeklyStats.goalWeight);

    const renderTrend = (trend: 'up' | 'down' | 'stable' | 'burnout') => {
        const getIcon = () => {
            switch (trend) {
                case 'up': return <ArrowUp className="h-4 w-4 text-green-500" />;
                case 'down': return <ArrowDown className="h-4 w-4 text-red-500" />;
                case 'burnout': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
                default: return <PauseCircle className="h-4 w-4 text-muted-foreground" />;
            }
        };
        return getIcon();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <BrainCircuit />
                    Weekly Insights
                </CardTitle>
                <CardDescription>Your 7-day productivity and health trends.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* Deep Work */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <h3 className="font-semibold text-sm">Deep Work</h3>
                        <p className="text-2xl font-bold">{weeklyStats.deepWork.current.toFixed(1)}h</p>
                        <div className="flex items-center text-xs text-muted-foreground">
                            {renderTrend(deepWorkInsight.trend)}
                            <span className="ml-1">{deepWorkInsight.message}</span>
                        </div>
                    </div>
                    {/* Upskill */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <h3 className="font-semibold text-sm">Upskill</h3>
                        <p className="text-2xl font-bold">{weeklyStats.upskill.current.toFixed(1)}h</p>
                        <div className="flex items-center text-xs text-muted-foreground">
                            {renderTrend(upskillInsight.trend)}
                            <span className="ml-1">{upskillInsight.message}</span>
                        </div>
                    </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                     {/* Health */}
                     <div className="p-4 bg-muted/50 rounded-lg">
                        <h3 className="font-semibold text-sm">Health</h3>
                        <div className="grid grid-cols-2 gap-x-2 mt-2">
                             <div>
                                <p className="text-lg font-bold">{weeklyStats.workouts.current}</p>
                                <p className="text-xs text-muted-foreground">Workouts</p>
                             </div>
                             <div>
                                <p className="text-lg font-bold">{weeklyStats.weight.current > 0 ? weeklyStats.weight.current.toFixed(1) : '-'}</p>
                                <p className="text-xs text-muted-foreground">Weight</p>
                             </div>
                        </div>
                         <div className="flex items-center text-xs text-muted-foreground mt-2">
                            {renderTrend(workoutInsight.trend)}
                            <span className="ml-1">{workoutInsight.message}</span>
                        </div>
                         <div className="flex items-center text-xs text-muted-foreground mt-1">
                            {renderTrend(weightInsight.trend)}
                            <span className="ml-1">{weightInsight.message}</span>
                        </div>
                    </div>
                    {/* Placeholder for future */}
                    <div className="p-4 bg-muted/20 rounded-lg flex items-center justify-center">
                        <p className="text-sm text-muted-foreground text-center">More insights coming soon.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
