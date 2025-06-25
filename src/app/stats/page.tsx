
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { DatedWorkout, TopicGoal } from '@/types/workout';
import { Loader2, TrendingUp, BarChart, Clock, Award, BrainCircuit, Dumbbell, BookOpenCheck, Briefcase } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Level data structure
const levels = [
    { level: 'L1', hours: '15 – 30 mins', description: 'Just showing up', zone: '⚪️ Entry Zone', minHours: 0.25, maxHours: 0.5 },
    { level: 'L2', hours: '30 – 45 mins', description: 'Light touch / spark', zone: '⚪️ Entry Zone', minHours: 0.5, maxHours: 0.75 },
    { level: 'L3', hours: '45 mins – 1 hr', description: 'Single Pomodoro session', zone: '⚪️ Entry Zone', minHours: 0.75, maxHours: 1 },
    { level: 'L4', hours: '1 – 1.5 hrs', description: 'Basic learner habit', zone: '🟢 Stable Zone', minHours: 1, maxHours: 1.5 },
    { level: 'L5', hours: '1.5 – 2 hrs', description: 'Focused beginner phase', zone: '🟢 Stable Zone', minHours: 1.5, maxHours: 2 },
    { level: 'L6', hours: '2 – 2.5 hrs', description: 'Mini deep work commitment', zone: '🟢 Stable Zone', minHours: 2, maxHours: 2.5 },
    { level: 'L7', hours: '2.5 – 3 hrs', description: 'Structured discipline zone', zone: '🟢 Stable Zone', minHours: 2.5, maxHours: 3 },
    { level: 'L8', hours: '3 – 3.5 hrs', description: 'Daily scholar mode', zone: '🟡 Progress Zone', minHours: 3, maxHours: 3.5 },
    { level: 'L9', hours: '3.5 – 4 hrs', description: 'Solid effort / Part-time student', zone: '🟡 Progress Zone', minHours: 3.5, maxHours: 4 },
    { level: 'L10', hours: '4 – 5 hrs', description: 'Full-time learner level', zone: '🟡 Progress Zone', minHours: 4, maxHours: 5 },
    { level: 'L11', hours: '5 – 6 hrs', description: 'Deep learner zone', zone: '🟡 Progress Zone', minHours: 5, maxHours: 6 },
    { level: 'L12', hours: '6 – 7 hrs', description: 'Advanced practice / Bootcamp ready', zone: '🟠 High Intensity', minHours: 6, maxHours: 7 },
    { level: 'L13', hours: '7 – 8 hrs', description: 'Peak state zone', zone: '🟠 High Intensity', minHours: 7, maxHours: 8 },
    { level: 'L14', hours: '8 – 9 hrs', description: 'Monastic discipline', zone: '🔴 Extreme Zone', minHours: 8, maxHours: 9 },
    { level: 'L15', hours: '9 – 10 hrs', description: 'Total immersion day', zone: '🔴 Extreme Zone', minHours: 9, maxHours: 10 },
    { level: 'L16', hours: '10 – 11 hrs', description: 'Elite performer stretch', zone: '🔴 Extreme Zone', minHours: 10, maxHours: 11 },
    { level: 'L17', hours: '11 – 12 hrs', description: 'Near-max capacity', zone: '🔴 Extreme Zone', minHours: 11, maxHours: 12 },
    { level: 'L18', hours: '12 – 13 hrs', description: 'Obsessive learner', zone: '🔴 Extreme Zone', minHours: 12, maxHours: 13 },
    { level: 'L19', hours: '13 – 15 hrs', description: 'Burning fuel — not sustainable daily', zone: '🔥 Overdrive Zone', minHours: 13, maxHours: 15 },
    { level: 'L20', hours: '15 – 16+ hrs', description: 'Legendary grind day (Rare / Purpose-driven only)', zone: '⚠️ Apex Zone', minHours: 15, maxHours: Infinity },
];

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

    const currentLevel = useMemo(() => {
        if (!stats) return null;
        return levels.find(l => stats.dailyProductiveHours >= l.minHours && stats.dailyProductiveHours < l.maxHours) || null;
    }, [stats]);


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
             <Card className="mb-8 text-center bg-card/50">
                <CardHeader>
                    <Award className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="text-3xl">Your Productivity Level</CardTitle>
                    {currentLevel ? (
                        <CardDescription className="text-lg">
                           Based on your daily average productive time of <strong>{stats.dailyProductiveHours.toFixed(2)} hours</strong>.
                        </CardDescription>
                    ) : (
                         <CardDescription className="text-lg">
                           Log some activities to determine your level.
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    {currentLevel && (
                         <div className="max-w-md mx-auto bg-primary/10 p-4 rounded-lg">
                            <p className="text-5xl font-bold text-primary">{currentLevel.level}</p>
                            <p className="text-xl font-semibold text-foreground mt-1">{currentLevel.description}</p>
                            <p className="text-lg text-muted-foreground">{currentLevel.zone}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

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

            <Card>
                <CardHeader>
                    <CardTitle>Productivity Levels</CardTitle>
                    <CardDescription>Find your current standing and see what's next.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Level</TableHead>
                                <TableHead>Daily Hours</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Zone</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {levels.map((level) => (
                                <TableRow key={level.level} className={cn(level.level === currentLevel?.level && "bg-primary/10")}>
                                    <TableCell className="font-bold">{level.level}</TableCell>
                                    <TableCell>{level.hours}</TableCell>
                                    <TableCell>{level.description}</TableCell>
                                    <TableCell>
                                         <Badge variant={
                                            level.zone.includes('Stable') ? 'secondary' :
                                            level.zone.includes('Extreme') || level.zone.includes('Overdrive') || level.zone.includes('Apex') ? 'destructive' :
                                            'default'
                                         }>{level.zone}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export default function StatsPage() {
    return ( <AuthGuard> <StatsPageContent /> </AuthGuard> );
}
