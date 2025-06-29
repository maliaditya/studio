
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { format, getDay } from 'date-fns';
import { DollarSign, Share2, Heart, Trophy, MessageSquareQuote, CheckCircle2, Circle, Target, TrendingUp } from 'lucide-react';
import type { Activity } from '@/types/workout';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getExercisesForDay } from '@/lib/workoutUtils';


function MyPlatePageContent() {
  const { 
    currentUser, 
    schedule,
    allUpskillLogs,
    topicGoals, 
    deepWorkDefinitions, 
    workoutMode, 
    workoutPlans, 
    exerciseDefinitions,
    goalWeight,
    weightLogs,
  } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);

  // Memoized data extraction
  const todaysActivities = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const todaySchedule = schedule[todayKey] || {};
    return Object.values(todaySchedule).flat();
  }, [schedule]);

  const { todaysMuscleGroups } = useMemo(() => {
    if (!workoutPlans || !exerciseDefinitions || !workoutMode) return { todaysMuscleGroups: [] };
    const { exercises } = getExercisesForDay(new Date(), workoutMode, workoutPlans, exerciseDefinitions);
    const muscleGroups = Array.from(new Set(exercises.map(ex => ex.category)));
    return { todaysMuscleGroups: muscleGroups };
  }, [workoutMode, workoutPlans, exerciseDefinitions]);
  
  const upskillProgress = useMemo(() => {
    const stats: { topic: string, progress: number, goal: number, unit: string }[] = [];
    if (!topicGoals || !allUpskillLogs) return stats;

    Object.entries(topicGoals).forEach(([topic, goal]) => {
      let totalProgress = 0;
      allUpskillLogs.forEach(log => {
        log.exercises.forEach(ex => {
          if (ex.category === topic) {
            totalProgress += ex.loggedSets.reduce((sum, set) => sum + set.weight, 0);
          }
        });
      });
      stats.push({
        topic,
        progress: totalProgress,
        goal: goal.goalValue,
        unit: goal.goalType,
      });
    });
    return stats;
  }, [topicGoals, allUpskillLogs]);
  
  const brandingPipeline = useMemo(() => {
    const activeTasks = (deepWorkDefinitions || []).filter(task => 
      task.isReadyForBranding && 
      !(task.sharingStatus?.twitter && task.sharingStatus?.linkedin && task.sharingStatus?.devto)
    );
    return activeTasks.slice(0, 3); // Show top 3 active items
  }, [deepWorkDefinitions]);
  
  const latestWeightLog = useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) return null;
    return [...weightLogs].sort((a, b) => a.date.localeCompare(b.date)).pop();
  }, [weightLogs]);


  useEffect(() => {
    if (currentUser?.username) {
      setIsLoading(false);
    }
  }, [currentUser]);


  if (isLoading) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
            <p className="text-muted-foreground">Loading your plate...</p>
        </div>
    )
  }

  // Main render function
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-4">
            <Trophy className="h-10 w-10"/>
            What's On My Plate
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A top-down dashboard of your current life commitments and focus areas.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Today's Focus */}
        <div className="lg:col-span-1 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Today's Agenda</CardTitle>
                    <CardDescription>{format(new Date(), 'EEEE, MMMM do')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {todaysActivities.length > 0 ? (
                        <ul className="space-y-3">
                            {todaysActivities.map(activity => (
                                <li key={activity.id} className="flex items-center gap-3">
                                    {activity.completed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                                    <span className={`flex-grow truncate ${activity.completed ? 'line-through text-muted-foreground' : ''}`} title={activity.details}>
                                        {activity.details}
                                    </span>
                                    <Badge variant="outline" className="capitalize">{activity.type}</Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No activities scheduled for today.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl"><Heart className="h-6 w-6 text-primary"/> Health</CardTitle>
                    <CardDescription>Physical well-being & fitness.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm mb-1">Today's Workout</h4>
                        <p className="text-muted-foreground text-sm">{todaysMuscleGroups.length > 0 ? todaysMuscleGroups.join(' & ') : 'Rest Day'}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-sm mb-1">Weight Tracking</h4>
                         {latestWeightLog && (
                             <p className="text-muted-foreground text-sm">
                                 Latest: {latestWeightLog.weight} kg/lb on week {latestWeightLog.date.split('-W')[1]}
                            </p>
                         )}
                         {goalWeight && (
                            <p className="text-muted-foreground text-sm">Goal: {goalWeight} kg/lb</p>
                         )}
                         {!latestWeightLog && !goalWeight && <p className="text-muted-foreground text-sm">No weight data logged.</p>}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Long-term Progress */}
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl"><DollarSign className="h-6 w-6 text-primary"/> Wealth</CardTitle>
                    <CardDescription>Deep work & income opportunities.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp /> Upskill Progress</h3>
                        {upskillProgress.length > 0 ? (
                            <div className="space-y-4">
                                {upskillProgress.map(item => (
                                    <div key={item.topic}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-medium text-sm">{item.topic}</span>
                                            <span className="text-xs text-muted-foreground">{item.progress.toLocaleString()} / {item.goal.toLocaleString()} {item.unit}</span>
                                        </div>
                                        <Progress value={(item.progress / item.goal) * 100} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">No upskill goals set yet.</p>
                        )}
                    </div>
                     <div className="pt-6 border-t">
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><Share2 /> Branding Pipeline</h3>
                        {brandingPipeline.length > 0 ? (
                             <ul className="space-y-2">
                                {brandingPipeline.map(task => (
                                    <li key={task.id} className="text-sm p-2 rounded-md bg-muted/50 flex justify-between items-center">
                                        <span>{task.name}</span>
                                        <Badge variant="secondary">Active</Badge>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm">Branding pipeline is clear. Go to Deep Work to mark items as ready!</p>
                        )}
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                        <MessageSquareQuote className="h-6 w-6 text-primary"/>
                        Weekly Reflection
                    </CardTitle>
                    <CardDescription>Take a moment to reflect and adjust your focus.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4 text-muted-foreground list-disc pl-5">
                      <li>Which of these are moving you forward the most?</li>
                      <li>Which one have you neglected and why?</li>
                      <li>What do you want to add/remove from your plate this week?</li>
                    </ul>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}

export default function MyPlatePage() {
    return (
        <AuthGuard>
            <MyPlatePageContent />
        </AuthGuard>
    )
}
