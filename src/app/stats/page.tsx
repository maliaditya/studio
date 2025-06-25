
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { DatedWorkout, TopicGoal } from '@/types/workout';
import { Loader2, TrendingUp, BarChart, Clock, BrainCircuit, Dumbbell, BookOpenCheck, Briefcase } from 'lucide-react';

function StatsPageContent() {
    const { currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    // State for all data
    const [allWorkoutLogs, setAllWorkoutLogs] = useState<DatedWorkout[]>([]);
    const [allUpskillLogs, setAllUpskillLogs] = useState<DatedWorkout[]>([]);
    const [allDeepWorkLogs, setAllDeepWorkLogs] = useState<DatedWorkout[]>([]);
    const [topicGoals, setTopicGoals] = useState<Record<string, TopicGoal>>({});

    useEffect(() => {
        if (currentUser?.username) {
            const username = currentUser.username;
            try {
                const workoutLogs = localStorage.getItem(`allWorkoutLogs_${username}`);
                setAllWorkoutLogs(workoutLogs ? JSON.parse(workoutLogs) : []);

                const upskillLogs = localStorage.getItem(`upskill_logs_${username}`);
                setAllUpskillLogs(upskillLogs ? JSON.parse(upskillLogs) : []);
                
                const upskillGoals = localStorage.getItem(`upskill_topic_goals_${username}`);
                setTopicGoals(upskillGoals ? JSON.parse(upskillGoals) : {});

                const deepWorkLogs = localStorage.getItem(`deepwork_logs_${username}`);
                setAllDeepWorkLogs(deepWorkLogs ? JSON.parse(deepWorkLogs) : []);

            } catch (e) {
                console.error("Error loading stats data from localStorage", e);
            } finally {
                setIsLoading(false);
            }
        } else {
             setIsLoading(false);
        }
    }, [currentUser]);

    const stats = useMemo(() => {
        if (!currentUser) return null;

        // Upskill Stats
        const upskillDays = new Set(allUpskillLogs.map(log => log.date));
        const totalUpskillDuration = allUpskillLogs.reduce((total, log) => 
            total + log.exercises.reduce((subTotal, ex) => 
                subTotal + ex.loggedSets.reduce((setTotal, set) => setTotal + set.reps, 0)
            , 0)
        , 0);
        const avgUpskillDuration = upskillDays.size > 0 ? totalUpskillDuration / upskillDays.size : 0;

        // Deep Work Stats
        const deepWorkDays = new Set(allDeepWorkLogs.map(log => log.date));
        const totalDeepWorkDuration = allDeepWorkLogs.reduce((total, log) => 
            total + log.exercises.reduce((subTotal, ex) => 
                subTotal + ex.loggedSets.reduce((setTotal, set) => setTotal + set.weight, 0)
            , 0)
        , 0);
        const avgDeepWorkDuration = deepWorkDays.size > 0 ? totalDeepWorkDuration / deepWorkDays.size : 0;

        // Workout Stats (Estimated)
        const workoutDays = new Set(allWorkoutLogs.map(log => log.date));
        const totalSets = allWorkoutLogs.reduce((total, log) => 
            total + log.exercises.reduce((subTotal, ex) => subTotal + ex.loggedSets.length, 0)
        , 0);
        const ESTIMATED_MINS_PER_SET = 2;
        const totalWorkoutDuration = totalSets * ESTIMATED_MINS_PER_SET;
        const avgWorkoutDuration = workoutDays.size > 0 ? totalWorkoutDuration / workoutDays.size : 0;
        
        // Total Productivity
        const dailyProductiveMinutes = avgUpskillDuration + avgDeepWorkDuration + avgWorkoutDuration;
        const dailyProductiveHours = dailyProductiveMinutes / 60;
        
        // Learning Speed
        const learningSpeeds = Object.entries(topicGoals).map(([topic, goal]) => {
            const topicLogs = allUpskillLogs.flatMap(log => log.exercises.filter(ex => ex.category === topic));
            const totalProgress = topicLogs.reduce((sum, ex) => sum + ex.loggedSets.reduce((setSum, set) => setSum + set.weight, 0), 0);
            const totalDuration = topicLogs.reduce((sum, ex) => sum + ex.loggedSets.reduce((setSum, set) => setSum + set.reps, 0), 0);
            const durationInHours = totalDuration / 60;
            const speed = durationInHours > 0 ? totalProgress / durationInHours : 0;
            return {
                topic,
                speed: speed.toFixed(1),
                unit: `${goal.goalType}/hr`,
            };
        });

        return {
            avgUpskillDuration,
            avgDeepWorkDuration,
            avgWorkoutDuration,
            dailyProductiveHours,
            learningSpeeds,
        }
    }, [allWorkoutLogs, allUpskillLogs, allDeepWorkLogs, topicGoals, currentUser]);


    if (isLoading) {
        return (
          <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Calculating your stats...</p>
          </div>
        );
    }
    
    if (!stats) {
        return <p className="text-center py-10">Log some activities to see your stats!</p>
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Clock className="text-primary"/> Daily Averages</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-lg">
                         <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><BookOpenCheck className="h-5 w-5"/>Upskill</span> <strong className="text-foreground">{stats.avgUpskillDuration.toFixed(0)} min</strong></div>
                         <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><Briefcase className="h-5 w-5"/>Deep Work</span> <strong className="text-foreground">{stats.avgDeepWorkDuration.toFixed(0)} min</strong></div>
                         <div className="flex justify-between items-center"><span className="flex items-center gap-2 text-muted-foreground"><Dumbbell className="h-5 w-5"/>Workout</span> <strong className="text-foreground">{stats.avgWorkoutDuration.toFixed(0)} min</strong></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingUp className="text-primary"/> Learning Speed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.learningSpeeds.length > 0 ? (
                            <ul className="space-y-3">
                                {stats.learningSpeeds.map(item => (
                                    <li key={item.topic} className="flex justify-between items-baseline">
                                        <span className="font-medium text-foreground">{item.topic}</span>
                                        <span className="text-muted-foreground text-sm">{item.speed} {item.unit}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">Set goals for topics in the Upskill page to see your learning speed.</p>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-primary"/> Total Productivity</CardTitle>
                    </CardHeader>
                     <CardContent className="text-center">
                        <p className="text-6xl font-bold text-primary">{stats.dailyProductiveHours.toFixed(2)}</p>
                        <p className="text-muted-foreground mt-1">Avg. Productive Hours / Day</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function StatsPage() {
    return ( <AuthGuard> <StatsPageContent /> </AuthGuard> );
}
