
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { DatedWorkout, TopicGoal } from '@/types/workout';
import { Loader2, TrendingUp, Clock, BrainCircuit, Dumbbell, BookOpenCheck, Briefcase, Trophy } from 'lucide-react';

function StatsPageContent() {
    const { currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    // State for all data
    const [allWorkoutLogs, setAllWorkoutLogs] = useState<DatedWorkout[]>([]);
    const [allUpskillLogs, setAllUpskillLogs] = useState<DatedWorkout[]>([]);
    const [allDeepWorkLogs, setAllDeepWorkLogs] = useState<DatedWorkout[]>([]);
    const [topicGoals, setTopicGoals] = useState<Record<string, TopicGoal>>({});

    const levels = [
        { level: 'L1', min: 15 / 60, max: 30 / 60, name: 'Just showing up', zone: '⚪️ Entry Zone' },
        { level: 'L2', min: 30 / 60, max: 45 / 60, name: 'Light touch / spark', zone: '⚪️ Entry Zone' },
        { level: 'L3', min: 45 / 60, max: 1, name: 'Single Pomodoro session', zone: '⚪️ Entry Zone' },
        { level: 'L4', min: 1, max: 1.5, name: 'Basic learner habit', zone: '🟢 Stable Zone' },
        { level: 'L5', min: 1.5, max: 2, name: 'Focused beginner phase', zone: '🟢 Stable Zone' },
        { level: 'L6', min: 2, max: 2.5, name: 'Mini deep work commitment', zone: '🟢 Stable Zone' },
        { level: 'L7', min: 2.5, max: 3, name: 'Structured discipline zone', zone: '🟢 Stable Zone' },
        { level: 'L8', min: 3, max: 3.5, name: 'Daily scholar mode', zone: '🟡 Progress Zone' },
        { level: 'L9', min: 3.5, max: 4, name: 'Solid effort / Part-time student', zone: '🟡 Progress Zone' },
        { level: 'L10', min: 4, max: 5, name: 'Full-time learner level', zone: '🟡 Progress Zone' },
        { level: 'L11', min: 5, max: 6, name: 'Deep learner zone', zone: '🟡 Progress Zone' },
        { level: 'L12', min: 6, max: 7, name: 'Advanced practice / Bootcamp ready', zone: '🟠 High Intensity' },
        { level: 'L13', min: 7, max: 8, name: 'Peak state zone', zone: '🟠 High Intensity' },
        { level: 'L14', min: 8, max: 9, name: 'Monastic discipline', zone: '🔴 Extreme Zone' },
        { level: 'L15', min: 9, max: 10, name: 'Total immersion day', zone: '🔴 Extreme Zone' },
        { level: 'L16', min: 10, max: 11, name: 'Elite performer stretch', zone: '🔴 Extreme Zone' },
        { level: 'L17', min: 11, max: 12, name: 'Near-max capacity', zone: '🔴 Extreme Zone' },
        { level: 'L18', min: 12, max: 13, name: 'Obsessive learner', zone: '🔴 Extreme Zone' },
        { level: 'L19', min: 13, max: 15, name: 'Burning fuel — not sustainable daily', zone: '🔥 Overdrive Zone' },
        { level: 'L20', min: 15, max: 24, name: 'Legendary grind day (Rare / Purpose-driven only)', zone: '⚠️ Apex Zone' },
    ];
    const defaultLevel = { level: 'L0', name: 'Just starting', zone: '⚪️ Entry Zone' };


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

        const levelInfo = levels.find(l => dailyProductiveHours >= l.min && dailyProductiveHours < l.max) || defaultLevel;


        return {
            avgUpskillDuration,
            avgDeepWorkDuration,
            avgWorkoutDuration,
            dailyProductiveHours,
            learningSpeeds,
            levelInfo,
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Trophy className="text-primary"/> Your Level</CardTitle>
                    </CardHeader>
                     <CardContent className="text-center">
                        <p className="text-5xl font-bold text-primary">{stats.levelInfo.level}</p>
                        <p className="text-muted-foreground mt-1">{stats.levelInfo.name}</p>
                        <p className="text-sm font-semibold mt-2">{stats.levelInfo.zone}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BrainCircuit className="text-primary"/> Total Productivity</CardTitle>
                    </CardHeader>
                     <CardContent className="text-center">
                        <p className="text-5xl font-bold text-primary">{stats.dailyProductiveHours.toFixed(2)}</p>
                        <p className="text-muted-foreground mt-1">Avg. Productive Hours / Day</p>
                    </CardContent>
                </Card>
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
            </div>
        </div>
    );
}

export default function StatsPage() {
    return ( <AuthGuard> <StatsPageContent /> </AuthGuard> );
}
