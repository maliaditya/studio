
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { format, getDay, parseISO, differenceInDays, subDays, isAfter, startOfToday, isBefore, differenceInYears, addDays, addWeeks, setISOWeek, startOfISOWeek, getISOWeekYear } from 'date-fns';
import { DollarSign, Share2, Heart, Trophy, MessageSquareQuote, CheckCircle2, Circle, Target, TrendingUp, Magnet, Package, Rocket, AlertCircle, ArrowDown, ArrowUp, BarChart3, CheckCircle2 as CheckCircleIcon, PauseCircle, Calendar, LineChart, BrainCircuit, Activity as ActivityIcon, Workflow, BookCopy } from 'lucide-react';
import type { Activity, Release, DatedWorkout, WeightLog, TopicGoal, ExerciseDefinition } from '@/types/workout';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from 'next/link';

const messageTemplates = {
    burnout: [
      "{{username}}, you're putting in incredible hours! This is amazing, but make sure you're taking time to rest and avoid burnout. Sustainable progress is key.",
      "An absolutely massive week, {{username}}! Your dedication is off the charts. Remember, even the sharpest axe needs sharpening. Don't forget to schedule some downtime.",
      "Incredible intensity! You're crushing it. Just a friendly reminder to listen to your body and mind. Rest is as important as the work itself for long-term gains.",
    ],
    up: [
      "Fantastic momentum, {{username}}! You've significantly increased your focus this week. Keep up the great work and build on this success.",
      "What a surge in productivity! Whatever you changed this week is clearly working. Let's keep that fire going.",
      "Great job stepping up the intensity. You're making serious progress. Channel this energy into next week.",
    ],
    down: [
      "{{username}}, it looks like things slowed down a bit this week. That's completely normal. Was this intentional rest, or did something get in the way? Reflect and adjust for next week.",
      "A quieter week. A great opportunity to plan your comeback and set a clear, achievable goal for the upcoming days.",
      "Every system needs downtime. If this was a planned break, great. If not, what's one small step you can take tomorrow to get back on track?",
    ],
    stable: [
      "Solid and steady, {{username}}! Consistency is the foundation of all progress. You're building strong habits. Keep it going!",
      "Another consistent week in the books. This is how long-term goals are achieved. Well done.",
      "You're in the groove. Maintaining this level of effort is a skill in itself. Keep executing.",
    ],
    new_week: [
      "It's a fresh start, {{username}}. What's one small step you can take today to get the ball rolling?",
      "A new week begins. What's your number one priority? Let's get after it.",
    ],
    goal_getting_closer: [
        "Incredible work, {{username}}! You've cut down your estimated time to goal. Your consistent effort is paying off, and the finish line is getting closer.",
        "Your goal is approaching faster than ever! This week's progress has significantly shortened your timeline. Keep up this amazing pace!",
        "Momentum is on your side. You've made great strides and your projected completion date has moved up. This is what progress looks like!",
    ],
    goal_slipping: [
        "Your projected goal date has slipped a bit, {{username}}. It's a good time to reassess. Was this a planned rest, or is it time to recommit to the original pace?",
        "It looks like the timeline for your goal has extended. Let's analyze what happened this week and see how we can get back on the fast track.",
        "A small course correction might be needed. Your goal date has moved further out. Let's set a clear intention for this week to close the gap.",
    ],
    goal_stable: [
        "You're on a steady path to your goal. Your consistent effort is maintaining your projected completion date. Keep up the great work!",
        "Steady as she goes, {{username}}! You're right on track with your projection. Consistency is your superpower right now.",
        "Excellent. You're meeting the required pace to stay on schedule for your goal. Keep this rhythm going.",
    ],
    weight_loss_good: [
        "Excellent, {{username}}! You're moving closer to your weight loss goal. Your hard work in diet and exercise is clearly paying off.",
        "Great progress! You're successfully trending towards your target weight. Keep up the consistent effort.",
    ],
    weight_loss_bad: [
        "A small bump in the road, {{username}}. This week's trend is moving away from your weight loss goal. Let's review the plan and get back on track.",
        "It looks like we're slightly off course from your weight loss target. A minor adjustment to your diet or activity could make all the difference this week.",
    ],
    weight_gain_good: [
        "Great! This is solid progress towards your weight gain goal. Stay consistent with your nutrition and training!",
        "Nice work, {{username}}. You're successfully adding mass and moving towards your target. Keep fueling your body for growth.",
    ],
    weight_gain_bad: [
        "This week's trend is moving away from your weight gain goal, {{username}}. Consider a small, consistent calorie surplus to get back on track.",
        "A slight dip this week. Let's ensure you're getting enough fuel to support your muscle-building goals, {{username}}.",
    ],
    weight_stable: [
        "Your weight is stable, holding steady. This is great for maintenance, {{username}}. Keep your habits strong.",
        "Consistency is key, and you're maintaining your current weight perfectly. Well done.",
    ],
    weight_no_data: [
        "Log your weight for two consecutive weeks to start seeing trends and get personalized feedback.",
        "Track your weight weekly to unlock insights and feedback on your progress.",
    ],
    weight_no_goal_up: [
        "Your weight trended up this week. Is this aligned with your current, unstated goals? A good time to reflect.",
    ],
    weight_no_goal_down: [
        "Your weight trended down this week. Great progress if you're aiming for weight loss! If not, now is a good time to assess.",
    ],
};

const getRandomMessage = (
    category: keyof typeof messageTemplates, 
    context: Record<string, any> = {}
) => {
  const messages = messageTemplates[category];
  if (!messages) return '';
  let message = messages[Math.floor(Math.random() * messages.length)];
  
  Object.keys(context).forEach(key => {
    const value = context[key];
    if (value !== null && value !== undefined) {
      if (key === 'username') {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), `<b>${value}</b>`);
      } else {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), value.toString());
      }
    }
  });

  return message;
};


function MyPlatePageContent() {
  const { 
    currentUser, 
    schedule,
    allUpskillLogs,
    topicGoals, 
    deepWorkDefinitions, 
    upskillDefinitions,
    workoutMode, 
    workoutPlans, 
    exerciseDefinitions,
    goalWeight,
    weightLogs,
    leadGenDefinitions,
    offerizationPlans,
    productizationPlans,
    dateOfBirth,
    allWorkoutLogs,
    allDeepWorkLogs,
    allDeepWorkLogs
  } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);

  // Memoized data extraction from the original MyPlate
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
  
  const leadGenPipeline = useMemo(() => {
    return (leadGenDefinitions || []).slice(0, 3);
  }, [leadGenDefinitions]);

  const offerSystemPipeline = useMemo(() => {
    return Object.values(offerizationPlans || {}).flatMap(plan => plan.offers || []).slice(0, 3);
  }, [offerizationPlans]);

  const upcomingReleases = useMemo(() => {
    if (!productizationPlans && !offerizationPlans) return [];
    const allReleases: { topic: string, release: Release, type: 'product' | 'service' }[] = [];
    if (productizationPlans) {
      Object.entries(productizationPlans).forEach(([topic, plan]) => {
          if (plan.releases) plan.releases.forEach(release => allReleases.push({ topic, release, type: 'product' }));
      });
    }
    if (offerizationPlans) {
      Object.entries(offerizationPlans).forEach(([topic, plan]) => {
          if (plan.releases) plan.releases.forEach(release => allReleases.push({ topic, release, type: 'service' }));
      });
    }
    const today = startOfToday();
    return allReleases
        .filter(({ release }) => { try { return !isBefore(parseISO(release.launchDate), today); } catch (e) { return false; } })
        .sort((a, b) => new Date(a.release.launchDate).getTime() - new Date(b.release.launchDate).getTime())
        .slice(0, 3);
  }, [productizationPlans, offerizationPlans]);

  const latestWeightLog = useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) return null;
    return [...weightLogs].sort((a, b) => a.date.localeCompare(b.date)).pop();
  }, [weightLogs]);

  const userContext = useMemo(() => {
    const age = dateOfBirth ? differenceInYears(new Date(), parseISO(dateOfBirth)) : null;
    return { username: currentUser?.username, age };
  }, [currentUser, dateOfBirth]);
  
  const weeklyStats = useMemo(() => {
    const today = new Date();
    const oneWeekAgo = subDays(today, 7);
    const last7DaysStart = subDays(today, 6);
    const prev7DaysStart = subDays(today, 13);
    
    const calculateTotal = (logs: DatedWorkout[], startDate: Date, endDate: Date, field: 'reps' | 'weight') => logs.filter(log => { const logDate = parseISO(log.date); return logDate >= startDate && logDate <= endDate; }).reduce((total, log) => total + log.exercises.reduce((exTotal, ex) => exTotal + ex.loggedSets.reduce((setTotal, set) => setTotal + (set[field] || 0), 0), 0), 0);
    const countWorkouts = (logs: DatedWorkout[], startDate: Date, endDate: Date) => logs.filter(log => { const logDate = parseISO(log.date); return logDate >= startDate && logDate <= endDate && log.exercises.some(ex => ex.loggedSets.length > 0); }).length;
    const getLatestWeight = (logs: WeightLog[], endDate: Date) => logs.filter(log => { const [year, weekNum] = log.date.split('-W'); const logDate = startOfISOWeek(setISOWeek(new Date(parseInt(year), 0, 4), parseInt(weekNum))); return logDate <= endDate; }).sort((a,b) => a.date.localeCompare(b.date)).pop();
    const calculateProjection = (logs: DatedWorkout[], goals: Record<string, TopicGoal>, endDate: Date) => {
      const dailyProgress: Record<string, { total: number; firstDate: Date }> = {};
      logs.forEach(log => { if (parseISO(log.date) > endDate) return; log.exercises.forEach(ex => { if (goals[ex.category]) { const progress = ex.loggedSets.reduce((sum, set) => sum + set.weight, 0); if (progress > 0) { if (!dailyProgress[ex.category]) dailyProgress[ex.category] = { total: 0, firstDate: parseISO(log.date) }; dailyProgress[ex.category].total += progress; if (isBefore(parseISO(log.date), dailyProgress[ex.category].firstDate)) dailyProgress[ex.category].firstDate = parseISO(log.date); } } }); });
      let overallDaysToCompletion: number | null = null;
      Object.keys(dailyProgress).forEach(topic => { const data = dailyProgress[topic]; const goal = goals[topic]; const duration = differenceInDays(endDate, data.firstDate) + 1; const rate = data.total / duration; if (rate > 0) { const remaining = goal.goalValue - data.total; if (remaining > 0) { const days = Math.ceil(remaining / rate); if (overallDaysToCompletion === null || days < overallDaysToCompletion) overallDaysToCompletion = days; } } });
      return overallDaysToCompletion;
    };
    const currentDeepWork = calculateTotal(allDeepWorkLogs, last7DaysStart, today, 'weight') / 60;
    const prevDeepWork = calculateTotal(allDeepWorkLogs, prev7DaysStart, oneWeekAgo, 'weight') / 60;
    const currentUpskill = calculateTotal(allUpskillLogs, last7DaysStart, today, 'reps') / 60;
    const prevUpskill = calculateTotal(allUpskillLogs, prev7DaysStart, oneWeekAgo, 'reps') / 60;
    const currentDaysToGoal = calculateProjection(allUpskillLogs, topicGoals, today);
    const prevDaysToGoal = calculateProjection(allUpskillLogs, topicGoals, oneWeekAgo);
    const currentWorkouts = countWorkouts(allWorkoutLogs, last7DaysStart, today);
    const prevWorkouts = countWorkouts(allWorkoutLogs, prev7DaysStart, oneWeekAgo);
    const latestWeight = getLatestWeight(weightLogs, today);
    const prevWeightLog = getLatestWeight(weightLogs, oneWeekAgo);
    return { deepWork: { current: currentDeepWork, prev: prevDeepWork }, upskill: { current: currentUpskill, prev: prevUpskill, currentDaysToGoal, prevDaysToGoal }, workouts: { current: currentWorkouts, prev: prevWorkouts }, weight: { current: latestWeight?.weight || 0, prev: prevWeightLog?.weight || 0, change: (latestWeight?.weight || 0) - (prevWeightLog?.weight || 0) }};
  }, [allDeepWorkLogs, allUpskillLogs, allWorkoutLogs, weightLogs, topicGoals]);

  const lifePerspectiveData = useMemo(() => {
    // Health Perspective
    const workoutLogsForYear = allWorkoutLogs.filter(log => isAfter(parseISO(log.date), subDays(new Date(), 365)));
    const workoutDates = new Set(workoutLogsForYear.map(log => log.date));
    let score = 0.5;
    for (let i = 0; i < 365; i++) {
        const date = subDays(new Date(), 365 - i);
        const dateKey = format(date, 'yyyy-MM-dd');
        if (workoutDates.has(dateKey)) score += (1 - score) * 0.1;
        else score *= 0.95;
    }
    const currentConsistency = Math.round(score * 100);
    const scoreWithWorkout = Math.round((score + (1 - score) * 0.1) * 100);
    const scoreWithoutWorkout = Math.round((score * 0.95) * 100);

    const healthPerspective = {
      currentConsistency,
      nextWeekWithWorkouts: scoreWithWorkout,
      nextWeekWithoutWorkouts: scoreWithoutWorkout,
      suggestion: "3 workouts this week will maintain a 40%+ score."
    };
    
    // Intention Perspective
    const linkedChildIds = new Set(deepWorkDefinitions.flatMap(def => def.linkedDeepWorkIds || []));
    const activeIntention = deepWorkDefinitions.find(def => ((def.linkedDeepWorkIds?.length ?? 0) > 0) && !linkedChildIds.has(def.id));
    let intentionPerspective = null;
    if (activeIntention) {
        let totalLoggedHours = 0;
        let totalEstimatedHours = 0;
        const descendantIds = new Set<string>();
        const queue: string[] = [activeIntention.id];
        while(queue.length > 0) {
            const id = queue.shift()!;
            if (descendantIds.has(id)) continue;
            descendantIds.add(id);
            const def = [...deepWorkDefinitions, ...upskillDefinitions].find(d => d.id === id);
            if(def) {
                totalEstimatedHours += def.estimatedHours || 0;
                (def.linkedDeepWorkIds || []).forEach(childId => queue.push(childId));
                (def.linkedUpskillIds || []).forEach(childId => queue.push(childId));
            }
        }
        allDeepWorkLogs.forEach(log => {log.exercises.forEach(ex => {if(descendantIds.has(ex.definitionId)) totalLoggedHours += ex.loggedSets.reduce((sum, set) => sum + set.weight, 0) / 60})});
        allUpskillLogs.forEach(log => {log.exercises.forEach(ex => {if(descendantIds.has(ex.definitionId)) totalLoggedHours += ex.loggedSets.reduce((sum, set) => sum + set.reps, 0) / 60})});
        
        const avgDailyProductiveHours = (weeklyStats.deepWork.current + weeklyStats.upskill.current) / 7;
        const remainingHours = totalEstimatedHours > totalLoggedHours ? totalEstimatedHours - totalLoggedHours : 0;
        const daysRemaining = avgDailyProductiveHours > 0 ? Math.ceil(remainingHours / avgDailyProductiveHours) : null;

        intentionPerspective = {
            name: activeIntention.name,
            avgHours: avgDailyProductiveHours,
            totalEstimated: totalEstimatedHours,
            completed: totalLoggedHours,
            forecastHours: totalLoggedHours + (avgDailyProductiveHours * 7),
            forecastPercent: totalEstimatedHours > 0 ? ((totalLoggedHours + (avgDailyProductiveHours * 7)) / totalEstimatedHours) * 100 : 0,
            estCompletionDate: daysRemaining ? format(addDays(new Date(), daysRemaining), 'MMM d, yyyy') : 'N/A',
        };
    }

    // Upskill Perspective
    let upskillPerspective = null;
    if (Object.keys(topicGoals).length > 0) {
        const topic = Object.keys(topicGoals)[0];
        const goal = topicGoals[topic];
        const logsForTopic = allUpskillLogs.flatMap(log => log.exercises.filter(ex => ex.category === topic));
        const totalProgress = logsForTopic.reduce((sum, ex) => sum + ex.loggedSets.reduce((s, set) => s + set.weight, 0), 0);
        const sortedLogs = logsForTopic.map(ex => ex.loggedSets.map(s => s.timestamp)).flat().sort();
        const firstDay = sortedLogs.length > 0 ? new Date(sortedLogs[0]) : new Date();
        const durationDays = differenceInDays(new Date(), firstDay) + 1;
        const avgRate = durationDays > 0 ? totalProgress / durationDays : 0;

        upskillPerspective = {
            topic,
            goal: goal.goalValue,
            unit: goal.goalType,
            completed: totalProgress,
            avgRate: avgRate,
            forecastPages: totalProgress + (avgRate * 7),
            forecastPercent: (totalProgress + (avgRate * 7)) / goal.goalValue * 100,
            suggestion: `Complete Chapter 3 by Friday.`
        };
    }

    return { health: healthPerspective, intention: intentionPerspective, upskill: upskillPerspective };
  }, [allWorkoutLogs, deepWorkDefinitions, upskillDefinitions, allDeepWorkLogs, allUpskillLogs, weeklyStats, topicGoals]);

  const getInsight = (current: number, prev: number, burnoutThreshold: number): { trend: 'up' | 'down' | 'stable' | 'burnout'; message: string } => { if (current > burnoutThreshold) return { trend: 'burnout', message: getRandomMessage('burnout', userContext) }; if (current > prev * 1.2) return { trend: 'up', message: getRandomMessage('up', userContext) }; if (current < prev * 0.8) { if (prev > 0) return { trend: 'down', message: getRandomMessage('down', userContext) }; return { trend: 'down', message: getRandomMessage('new_week', userContext) }; } if (current > 0) return { trend: 'stable', message: getRandomMessage('stable', userContext) }; return { trend: 'stable', message: getRandomMessage('new_week', userContext) }; };
  const getUpskillInsight = (currentHours: number, prevHours: number, currentDays: number | null, prevDays: number | null) => { if (currentDays !== null && prevDays !== null) { if (currentDays < prevDays) return { trend: 'up' as const, message: getRandomMessage('goal_getting_closer', userContext) }; if (currentDays > prevDays) return { trend: 'down' as const, message: getRandomMessage('goal_slipping', userContext) }; return { trend: 'stable' as const, message: getRandomMessage('goal_stable', userContext) }; } return getInsight(currentHours, prevHours, 28); };
  const getWeightInsight = (current: number, prev: number, goal: number | null): { trend: 'up' | 'down' | 'stable'; message: string } => { if (current === 0 || prev === 0) return { trend: 'stable', message: getRandomMessage('weight_no_data') }; const change = current - prev; if (Math.abs(change) < 0.2) return { trend: 'stable', message: getRandomMessage('weight_stable', userContext) }; const wentUp = change > 0; const wentDown = change < 0; if (goal) { const goalIsLower = goal < prev; const goalIsHigher = goal > prev; if (goalIsLower) { if (wentDown) return { trend: 'down', message: getRandomMessage('weight_loss_good', userContext) }; if (wentUp) return { trend: 'up', message: getRandomMessage('weight_loss_bad', userContext) }; } if (goalIsHigher) { if (wentUp) return { trend: 'up', message: getRandomMessage('weight_gain_good', userContext) }; if (wentDown) return { trend: 'down', message: getRandomMessage('weight_gain_bad', userContext) }; } } if (wentUp) return { trend: 'up', message: getRandomMessage('weight_no_goal_up') }; return { trend: 'down', message: getRandomMessage('weight_no_goal_down') }; };
  const deepWorkInsight = getInsight(weeklyStats.deepWork.current, weeklyStats.deepWork.prev, 35);
  const upskillInsight = getUpskillInsight(weeklyStats.upskill.current, weeklyStats.upskill.prev, weeklyStats.upskill.currentDaysToGoal, weeklyStats.upskill.prevDaysToGoal);
  const workoutInsight = getInsight(weeklyStats.workouts.current, weeklyStats.workouts.prev, 7);
  const weightInsight = getWeightInsight(weeklyStats.weight.current, weeklyStats.weight.prev, goalWeight);
   const renderTrend = (trend: 'up' | 'down' | 'stable' | 'burnout', changeText: string) => {
    const getIcon = () => {
      switch (trend) {
        case 'up':
          return <ArrowUp className="h-4 w-4 text-green-500" />;
        case 'down':
          return <ArrowDown className="h-4 w-4 text-red-500" />;
        case 'burnout':
          return <AlertCircle className="h-4 w-4 text-yellow-500" />;
        default:
          return <PauseCircle className="h-4 w-4 text-muted-foreground" />;
      }
    };
    return (
      <div className="flex items-center text-xs text-muted-foreground">
        {getIcon()}
        <span className="ml-1">{changeText}</span>
      </div>
    );
  };
  const getChangeText = (current: number, prev: number, trend: 'up'|'down'|'stable'|'burnout') => { const change = current - prev; const percentChange = prev !== 0 ? (change / prev) * 100 : current > 0 ? 100 : 0; if (trend === 'up') return `Up ${percentChange.toFixed(0)}% from last week`; if (trend === 'down') return `Down ${Math.abs(percentChange).toFixed(0)}% from last week`; if (trend === 'burnout') return 'Potential burnout risk'; return 'Consistent effort'; }

  useEffect(() => { if (currentUser?.username) setIsLoading(false); }, [currentUser]);

  if (isLoading) return <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]"><p className="text-muted-foreground">Loading your plate...</p></div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-4">
            <BrainCircuit className="h-10 w-10"/>
            My Plate
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A top-down dashboard of your current life commitments, focus areas, and weekly insights.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
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
                    <CardTitle className="flex items-center gap-2 text-xl"><Heart className="h-6 w-6 text-primary"/> Health Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <div className="flex justify-between items-start">
                            <h3 className="font-semibold">Workout Consistency</h3>
                            {renderTrend(workoutInsight.trend, `${weeklyStats.workouts.current} sessions`)}
                        </div>
                        <p className="mt-4 text-sm text-foreground" dangerouslySetInnerHTML={{ __html: workoutInsight.message }}></p>
                    </div>
                    <Separator />
                    <div>
                        <div className="flex justify-between items-start">
                            <h3 className="font-semibold">Weight Trend</h3>
                            {renderTrend(weightInsight.trend, `${weeklyStats.weight.change.toFixed(1)} kg/lb`)}
                        </div>
                         <p className="mt-4 text-sm text-foreground" dangerouslySetInnerHTML={{ __html: weightInsight.message }}></p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl"><LineChart className="h-6 w-6 text-primary"/> Productivity Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <div className="flex justify-between items-start">
                            <h3 className="font-semibold">Deep Work</h3>
                            {renderTrend(deepWorkInsight.trend, getChangeText(weeklyStats.deepWork.current, weeklyStats.deepWork.prev, deepWorkInsight.trend))}
                        </div>
                        <div className="mt-2 text-2xl font-bold">{weeklyStats.deepWork.current.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">hours</span></div>
                        <p className="text-xs text-muted-foreground">vs {weeklyStats.deepWork.prev.toFixed(1)} hours last week</p>
                        <p className="mt-4 text-sm text-foreground" dangerouslySetInnerHTML={{ __html: deepWorkInsight.message }}></p>
                    </div>
                    <Separator />
                    <div>
                        <div className="flex justify-between items-start">
                            <h3 className="font-semibold">Upskill</h3>
                            {renderTrend(upskillInsight.trend, getChangeText(weeklyStats.upskill.current, weeklyStats.upskill.prev, upskillInsight.trend))}
                        </div>
                        <div className="mt-2 text-2xl font-bold">{weeklyStats.upskill.current.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">hours</span></div>
                        <p className="text-xs text-muted-foreground">vs {weeklyStats.upskill.prev.toFixed(1)} hours last week</p>
                        <p className="mt-4 text-sm text-foreground" dangerouslySetInnerHTML={{ __html: upskillInsight.message }}></p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
                <CardTitle>Vision & Trajectory</CardTitle>
                <CardDescription>A 1-week forecast based on your current momentum.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="health" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="health"><Heart className="h-4 w-4 mr-2"/>Health</TabsTrigger>
                        <TabsTrigger value="intention"><Workflow className="h-4 w-4 mr-2"/>Intention</TabsTrigger>
                        <TabsTrigger value="upskill"><BookCopy className="h-4 w-4 mr-2"/>Upskill</TabsTrigger>
                    </TabsList>
                    <TabsContent value="health" className="pt-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="font-semibold">Current Consistency</p>
                                <p className="text-2xl font-bold text-primary">{lifePerspectiveData.health.currentConsistency}%</p>
                                <p className="text-xs text-muted-foreground">Keep it above 40%</p>
                            </div>
                            <div className="p-3 bg-muted/80 rounded-lg">
                                <p className="font-semibold">Next Week's Forecast</p>
                                <p className="text-lg font-bold text-green-500">{lifePerspectiveData.health.nextWeekWithWorkouts}% <span className="text-xs font-normal text-muted-foreground">(with workouts)</span></p>
                                <p className="text-lg font-bold text-red-500">{lifePerspectiveData.health.nextWeekWithoutWorkouts}% <span className="text-xs font-normal text-muted-foreground">(without workouts)</span></p>
                            </div>
                        </div>
                         <p className="text-xs text-center text-muted-foreground mt-3 italic">{lifePerspectiveData.health.suggestion}</p>
                    </TabsContent>
                    <TabsContent value="intention" className="pt-4">
                        {lifePerspectiveData.intention ? (
                            <div className="space-y-3">
                                <p className="font-semibold text-center">Project: <Link href="/deep-work" className="text-primary hover:underline">{lifePerspectiveData.intention.name}</Link></p>
                                <Progress value={(lifePerspectiveData.intention.completed / lifePerspectiveData.intention.totalEstimated) * 100} className="h-2" />
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="p-2 bg-muted rounded-md"><p className="font-semibold">{lifePerspectiveData.intention.completed.toFixed(1)}h</p><p>Completed</p></div>
                                    <div className="p-2 bg-muted rounded-md"><p className="font-semibold">{lifePerspectiveData.intention.forecastHours.toFixed(1)}h</p><p>Next Week</p></div>
                                    <div className="p-2 bg-muted rounded-md"><p className="font-semibold">{lifePerspectiveData.intention.totalEstimated}h</p><p>Total Est.</p></div>
                                </div>
                                <p className="text-xs text-center text-muted-foreground italic">Est. completion: {lifePerspectiveData.intention.estCompletionDate}</p>
                            </div>
                        ) : <p className="text-sm text-center text-muted-foreground py-4">No active intention with an estimate found in Deep Work.</p>}
                    </TabsContent>
                    <TabsContent value="upskill" className="pt-4">
                        {lifePerspectiveData.upskill ? (
                             <div className="space-y-3">
                                <p className="font-semibold text-center">Topic: <Link href="/upskill" className="text-primary hover:underline">{lifePerspectiveData.upskill.topic}</Link></p>
                                <Progress value={(lifePerspectiveData.upskill.completed / lifePerspectiveData.upskill.goal) * 100} className="h-2" />
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="p-2 bg-muted rounded-md"><p className="font-semibold">{lifePerspectiveData.upskill.completed.toFixed(0)}</p><p>Completed</p></div>
                                    <div className="p-2 bg-muted rounded-md"><p className="font-semibold">{lifePerspectiveData.upskill.forecastPages.toFixed(0)}</p><p>Next Week</p></div>
                                    <div className="p-2 bg-muted rounded-md"><p className="font-semibold">{lifePerspectiveData.upskill.goal}</p><p>Goal</p></div>
                                </div>
                                <p className="text-xs text-center text-muted-foreground italic">{lifePerspectiveData.upskill.suggestion}</p>
                            </div>
                        ) : <p className="text-sm text-center text-muted-foreground py-4">No active learning goal found in Upskill.</p>}
                    </TabsContent>
                </Tabs>
            </CardContent>
          </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl"><DollarSign className="h-6 w-6 text-primary"/> Monetization Pipeline</CardTitle>
                    <CardDescription>Your content, lead generation, and offer creation flow.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2 text-base"><Share2 className="h-5 w-5"/> Branding Pipeline</h4>
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
                    <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-2 flex items-center gap-2 text-base"><Magnet className="h-5 w-5"/> Lead Generation Tasks</h4>
                        {leadGenPipeline.length > 0 ? (
                             <ul className="space-y-2">
                                {leadGenPipeline.map(task => (
                                    <li key={task.id} className="text-sm p-2 rounded-md bg-muted/50 flex justify-between items-center">
                                        <span>{task.name}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm">No lead generation tasks defined.</p>
                        )}
                    </div>
                    <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-2 flex items-center gap-2 text-base"><Package className="h-5 w-5"/> Defined Offers</h4>
                        {offerSystemPipeline.length > 0 ? (
                             <ul className="space-y-2">
                                {offerSystemPipeline.map((task: any) => (
                                    <li key={task.id} className="text-sm p-2 rounded-md bg-muted/50 flex justify-between items-center">
                                        <span>{task.name}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm">No offers have been defined yet.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl"><Rocket className="h-6 w-6 text-primary"/> Upcoming Roadmap</CardTitle>
                    <CardDescription>Your upcoming product and service releases.</CardDescription>
                </CardHeader>
                <CardContent>
                    {upcomingReleases.length > 0 ? (
                         <ul className="space-y-3">
                            {upcomingReleases.map(({ topic, release, type }) => (
                                <li key={release.id} className="text-sm p-3 rounded-md bg-muted/50 flex justify-between items-center">
                                    <div>
                                        <span className="font-semibold">{release.name}</span>
                                        <span className="text-muted-foreground ml-2">({topic})</span>
                                    </div>
                                     <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="capitalize">{type}</Badge>
                                        <Badge variant="secondary">{format(parseISO(release.launchDate), 'MMM dd, yyyy')}</Badge>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground text-sm">No upcoming releases planned.</p>
                    )}
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

    

    