
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
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), `&lt;b&gt;${value}&lt;/b&gt;`);
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
  const renderTrend = (trend: 'up' | 'down' | 'stable' | 'burnout', changeText: string) => { const getIcon = () => { switch (trend) { case 'up': return &lt;ArrowUp className=&quot;h-4 w-4 text-green-500&quot; /&gt;; case 'down': return &lt;ArrowDown className=&quot;h-4 w-4 text-red-500&quot; /&gt;; case 'burnout': return &lt;AlertCircle className=&quot;h-4 w-4 text-yellow-500&quot; /&gt;; default: return &lt;PauseCircle className=&quot;h-4 w-4 text-muted-foreground&quot; /&gt;; } }; return ( &lt;div className=&quot;flex items-center text-xs text-muted-foreground&quot;&gt; {getIcon()} &lt;span className=&quot;ml-1&quot;&gt;{changeText}&lt;/span&gt; &lt;/div&gt; ) };
  const getChangeText = (current: number, prev: number, trend: 'up'|'down'|'stable'|'burnout') => { const change = current - prev; const percentChange = prev !== 0 ? (change / prev) * 100 : current > 0 ? 100 : 0; if (trend === 'up') return `Up ${percentChange.toFixed(0)}% from last week`; if (trend === 'down') return `Down ${Math.abs(percentChange).toFixed(0)}% from last week`; if (trend === 'burnout') return 'Potential burnout risk'; return 'Consistent effort'; }

  useEffect(() => { if (currentUser?.username) setIsLoading(false); }, [currentUser]);

  if (isLoading) return &lt;div className=&quot;flex justify-center items-center min-h-[calc(100vh-8rem)]&quot;&gt;&lt;p className=&quot;text-muted-foreground&quot;&gt;Loading your plate...&lt;/p&gt;&lt;/div&gt;;

  return (
    &lt;div className=&quot;container mx-auto p-4 sm:p-6 lg:p-8 space-y-8&quot;&gt;
      &lt;div className=&quot;text-center&quot;&gt;
        &lt;h1 className=&quot;text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-4&quot;&gt;
            &lt;BrainCircuit className=&quot;h-10 w-10&quot;/&gt;
            My Plate
        &lt;/h1&gt;
        &lt;p className=&quot;mt-4 text-lg text-muted-foreground&quot;&gt;
          A top-down dashboard of your current life commitments, focus areas, and weekly insights.
        &lt;/p&gt;
      &lt;/div&gt;

      &lt;div className=&quot;grid grid-cols-1 lg:grid-cols-3 gap-8&quot;&gt;
        
        &lt;div className=&quot;lg:col-span-1 space-y-8&quot;&gt;
            &lt;Card&gt;
                &lt;CardHeader&gt;
                    &lt;CardTitle&gt;Today's Agenda&lt;/CardTitle&gt;
                    &lt;CardDescription&gt;{format(new Date(), 'EEEE, MMMM do')}&lt;/CardDescription&gt;
                &lt;/CardHeader&gt;
                &lt;CardContent&gt;
                    {todaysActivities.length &gt; 0 ? (
                        &lt;ul className=&quot;space-y-3&quot;&gt;
                            {todaysActivities.map(activity =&gt; (
                                &lt;li key={activity.id} className=&quot;flex items-center gap-3&quot;&gt;
                                    {activity.completed ? &lt;CheckCircle2 className=&quot;h-5 w-5 text-green-500&quot; /&gt; : &lt;Circle className=&quot;h-5 w-5 text-muted-foreground&quot; /&gt;}
                                    &lt;span className={`flex-grow truncate ${activity.completed ? 'line-through text-muted-foreground' : ''}`} title={activity.details}&gt;
                                        {activity.details}
                                    &lt;/span&gt;
                                    &lt;Badge variant=&quot;outline&quot; className=&quot;capitalize&quot;&gt;{activity.type}&lt;/Badge&gt;
                                &lt;/li&gt;
                            ))}
                        &lt;/ul&gt;
                    ) : (
                        &lt;p className=&quot;text-muted-foreground text-center py-4&quot;&gt;No activities scheduled for today.&lt;/p&gt;
                    )}
                &lt;/CardContent&gt;
            &lt;/Card&gt;

             &lt;Card&gt;
                &lt;CardHeader&gt;
                    &lt;CardTitle className=&quot;flex items-center gap-2 text-xl&quot;&gt;&lt;Heart className=&quot;h-6 w-6 text-primary&quot;/&gt; Health Insights&lt;/CardTitle&gt;
                &lt;/CardHeader&gt;
                &lt;CardContent className=&quot;space-y-6&quot;&gt;
                    &lt;div&gt;
                        &lt;div className=&quot;flex justify-between items-start&quot;&gt;
                            &lt;h3 className=&quot;font-semibold&quot;&gt;Workout Consistency&lt;/h3&gt;
                            {renderTrend(workoutInsight.trend, `${weeklyStats.workouts.current} sessions`)}
                        &lt;/div&gt;
                        &lt;p className=&quot;mt-4 text-sm text-foreground&quot; dangerouslySetInnerHTML={{ __html: workoutInsight.message }}&gt;&lt;/p&gt;
                    &lt;/div&gt;
                    &lt;Separator /&gt;
                    &lt;div&gt;
                        &lt;div className=&quot;flex justify-between items-start&quot;&gt;
                            &lt;h3 className=&quot;font-semibold&quot;&gt;Weight Trend&lt;/h3&gt;
                            {renderTrend(weightInsight.trend, `${weeklyStats.weight.change.toFixed(1)} kg/lb`)}
                        &lt;/div&gt;
                         &lt;p className=&quot;mt-4 text-sm text-foreground&quot; dangerouslySetInnerHTML={{ __html: weightInsight.message }}&gt;&lt;/p&gt;
                    &lt;/div&gt;
                &lt;/CardContent&gt;
            &lt;/Card&gt;

            &lt;Card&gt;
                &lt;CardHeader&gt;
                    &lt;CardTitle className=&quot;flex items-center gap-2 text-xl&quot;&gt;&lt;LineChart className=&quot;h-6 w-6 text-primary&quot;/&gt; Productivity Insights&lt;/CardTitle&gt;
                &lt;/CardHeader&gt;
                &lt;CardContent className=&quot;space-y-6&quot;&gt;
                    &lt;div&gt;
                        &lt;div className=&quot;flex justify-between items-start&quot;&gt;
                            &lt;h3 className=&quot;font-semibold&quot;&gt;Deep Work&lt;/h3&gt;
                            {renderTrend(deepWorkInsight.trend, getChangeText(weeklyStats.deepWork.current, weeklyStats.deepWork.prev, deepWorkInsight.trend))}
                        &lt;/div&gt;
                        &lt;div className=&quot;mt-2 text-2xl font-bold&quot;&gt;{weeklyStats.deepWork.current.toFixed(1)} &lt;span className=&quot;text-sm font-normal text-muted-foreground&quot;&gt;hours&lt;/span&gt;&lt;/div&gt;
                        &lt;p className=&quot;text-xs text-muted-foreground&quot;&gt;vs {weeklyStats.deepWork.prev.toFixed(1)} hours last week&lt;/p&gt;
                        &lt;p className=&quot;mt-4 text-sm text-foreground&quot; dangerouslySetInnerHTML={{ __html: deepWorkInsight.message }}&gt;&lt;/p&gt;
                    &lt;/div&gt;
                    &lt;Separator /&gt;
                    &lt;div&gt;
                        &lt;div className=&quot;flex justify-between items-start&quot;&gt;
                            &lt;h3 className=&quot;font-semibold&quot;&gt;Upskill&lt;/h3&gt;
                            {renderTrend(upskillInsight.trend, getChangeText(weeklyStats.upskill.current, weeklyStats.upskill.prev, upskillInsight.trend))}
                        &lt;/div&gt;
                        &lt;div className=&quot;mt-2 text-2xl font-bold&quot;&gt;{weeklyStats.upskill.current.toFixed(1)} &lt;span className=&quot;text-sm font-normal text-muted-foreground&quot;&gt;hours&lt;/span&gt;&lt;/div&gt;
                        &lt;p className=&quot;text-xs text-muted-foreground&quot;&gt;vs {weeklyStats.upskill.prev.toFixed(1)} hours last week&lt;/p&gt;
                        &lt;p className=&quot;mt-4 text-sm text-foreground&quot; dangerouslySetInnerHTML={{ __html: upskillInsight.message }}&gt;&lt;/p&gt;
                    &lt;/div&gt;
                &lt;/CardContent&gt;
            &lt;/Card&gt;
        &lt;/div&gt;

        &lt;div className=&quot;lg:col-span-2 space-y-8&quot;&gt;
          &lt;Card&gt;
            &lt;CardHeader&gt;
                &lt;CardTitle&gt;Vision &amp;amp; Trajectory&lt;/CardTitle&gt;
                &lt;CardDescription&gt;A 1-week forecast based on your current momentum.&lt;/CardDescription&gt;
            &lt;/CardHeader&gt;
            &lt;CardContent&gt;
                &lt;Tabs defaultValue=&quot;health&quot; className=&quot;w-full&quot;&gt;
                    &lt;TabsList className=&quot;grid w-full grid-cols-3&quot;&gt;
                        &lt;TabsTrigger value=&quot;health&quot;&gt;&lt;Heart className=&quot;h-4 w-4 mr-2&quot;/&gt;Health&lt;/TabsTrigger&gt;
                        &lt;TabsTrigger value=&quot;intention&quot;&gt;&lt;Workflow className=&quot;h-4 w-4 mr-2&quot;/&gt;Intention&lt;/TabsTrigger&gt;
                        &lt;TabsTrigger value=&quot;upskill&quot;&gt;&lt;BookCopy className=&quot;h-4 w-4 mr-2&quot;/&gt;Upskill&lt;/TabsTrigger&gt;
                    &lt;/TabsList&gt;
                    &lt;TabsContent value=&quot;health&quot; className=&quot;pt-4&quot;&gt;
                        &lt;div className=&quot;grid grid-cols-2 gap-4 text-sm&quot;&gt;
                            &lt;div className=&quot;p-3 bg-muted rounded-lg&quot;&gt;
                                &lt;p className=&quot;font-semibold&quot;&gt;Current Consistency&lt;/p&gt;
                                &lt;p className=&quot;text-2xl font-bold text-primary&quot;&gt;{lifePerspectiveData.health.currentConsistency}%&lt;/p&gt;
                                &lt;p className=&quot;text-xs text-muted-foreground&quot;&gt;Keep it above 40%&lt;/p&gt;
                            &lt;/div&gt;
                            &lt;div className=&quot;p-3 bg-muted/80 rounded-lg&quot;&gt;
                                &lt;p className=&quot;font-semibold&quot;&gt;Next Week's Forecast&lt;/p&gt;
                                &lt;p className=&quot;text-lg font-bold text-green-500&quot;&gt;{lifePerspectiveData.health.nextWeekWithWorkouts}% &lt;span className=&quot;text-xs font-normal text-muted-foreground&quot;&gt;(with workouts)&lt;/span&gt;&lt;/p&gt;
                                &lt;p className=&quot;text-lg font-bold text-red-500&quot;&gt;{lifePerspectiveData.health.nextWeekWithoutWorkouts}% &lt;span className=&quot;text-xs font-normal text-muted-foreground&quot;&gt;(without workouts)&lt;/span&gt;&lt;/p&gt;
                            &lt;/div&gt;
                        &lt;/div&gt;
                         &lt;p className=&quot;text-xs text-center text-muted-foreground mt-3 italic&quot;&gt;{lifePerspectiveData.health.suggestion}&lt;/p&gt;
                    &lt;/TabsContent&gt;
                    &lt;TabsContent value=&quot;intention&quot; className=&quot;pt-4&quot;&gt;
                        {lifePerspectiveData.intention ? (
                            &lt;div className=&quot;space-y-3&quot;&gt;
                                &lt;p className=&quot;font-semibold text-center&quot;&gt;Project: &lt;Link href=&quot;/deep-work&quot; className=&quot;text-primary hover:underline&quot;&gt;{lifePerspectiveData.intention.name}&lt;/Link&gt;&lt;/p&gt;
                                &lt;Progress value={(lifePerspectiveData.intention.completed / lifePerspectiveData.intention.totalEstimated) * 100} className=&quot;h-2&quot; /&gt;
                                &lt;div className=&quot;grid grid-cols-3 gap-2 text-center text-xs&quot;&gt;
                                    &lt;div className=&quot;p-2 bg-muted rounded-md&quot;&gt;&lt;p className=&quot;font-semibold&quot;&gt;{lifePerspectiveData.intention.completed.toFixed(1)}h&lt;/p&gt;&lt;p&gt;Completed&lt;/p&gt;&lt;/div&gt;
                                    &lt;div className=&quot;p-2 bg-muted rounded-md&quot;&gt;&lt;p className=&quot;font-semibold&quot;&gt;{lifePerspectiveData.intention.forecastHours.toFixed(1)}h&lt;/p&gt;&lt;p&gt;Next Week&lt;/p&gt;&lt;/div&gt;
                                    &lt;div className=&quot;p-2 bg-muted rounded-md&quot;&gt;&lt;p className=&quot;font-semibold&quot;&gt;{lifePerspectiveData.intention.totalEstimated}h&lt;/p&gt;&lt;p&gt;Total Est.&lt;/p&gt;&lt;/div&gt;
                                &lt;/div&gt;
                                &lt;p className=&quot;text-xs text-center text-muted-foreground italic&quot;&gt;Est. completion: {lifePerspectiveData.intention.estCompletionDate}&lt;/p&gt;
                            &lt;/div&gt;
                        ) : &lt;p className=&quot;text-sm text-center text-muted-foreground py-4&quot;&gt;No active intention with an estimate found in Deep Work.&lt;/p&gt;}
                    &lt;/TabsContent&gt;
                    &lt;TabsContent value=&quot;upskill&quot; className=&quot;pt-4&quot;&gt;
                        {lifePerspectiveData.upskill ? (
                             &lt;div className=&quot;space-y-3&quot;&gt;
                                &lt;p className=&quot;font-semibold text-center&quot;&gt;Topic: &lt;Link href=&quot;/upskill&quot; className=&quot;text-primary hover:underline&quot;&gt;{lifePerspectiveData.upskill.topic}&lt;/Link&gt;&lt;/p&gt;
                                &lt;Progress value={(lifePerspectiveData.upskill.completed / lifePerspectiveData.upskill.goal) * 100} className=&quot;h-2&quot; /&gt;
                                &lt;div className=&quot;grid grid-cols-3 gap-2 text-center text-xs&quot;&gt;
                                    &lt;div className=&quot;p-2 bg-muted rounded-md&quot;&gt;&lt;p className=&quot;font-semibold&quot;&gt;{lifePerspectiveData.upskill.completed.toFixed(0)}&lt;/p&gt;&lt;p&gt;Completed&lt;/p&gt;&lt;/div&gt;
                                    &lt;div className=&quot;p-2 bg-muted rounded-md&quot;&gt;&lt;p className=&quot;font-semibold&quot;&gt;{lifePerspectiveData.upskill.forecastPages.toFixed(0)}&lt;/p&gt;&lt;p&gt;Next Week&lt;/p&gt;&lt;/div&gt;
                                    &lt;div className=&quot;p-2 bg-muted rounded-md&quot;&gt;&lt;p className=&quot;font-semibold&quot;&gt;{lifePerspectiveData.upskill.goal}&lt;/p&gt;&lt;p&gt;Goal&lt;/p&gt;&lt;/div&gt;
                                &lt;/div&gt;
                                &lt;p className=&quot;text-xs text-center text-muted-foreground italic&quot;&gt;{lifePerspectiveData.upskill.suggestion}&lt;/p&gt;
                            &lt;/div&gt;
                        ) : &lt;p className=&quot;text-sm text-center text-muted-foreground py-4&quot;&gt;No active learning goal found in Upskill.&lt;/p&gt;}
                    &lt;/TabsContent&gt;
                &lt;/Tabs&gt;
            &lt;/CardContent&gt;
          &lt;/Card&gt;

            &lt;Card&gt;
                &lt;CardHeader&gt;
                    &lt;CardTitle className=&quot;flex items-center gap-3 text-xl&quot;&gt;&lt;DollarSign className=&quot;h-6 w-6 text-primary&quot;/&gt; Monetization Pipeline&lt;/CardTitle&gt;
                    &lt;CardDescription&gt;Your content, lead generation, and offer creation flow.&lt;/CardDescription&gt;
                &lt;/CardHeader&gt;
                &lt;CardContent className=&quot;space-y-6&quot;&gt;
                    &lt;div&gt;
                        &lt;h4 className=&quot;font-semibold mb-2 flex items-center gap-2 text-base&quot;&gt;&lt;Share2 className=&quot;h-5 w-5&quot;/&gt; Branding Pipeline&lt;/h4&gt;
                        {brandingPipeline.length &gt; 0 ? (
                             &lt;ul className=&quot;space-y-2&quot;&gt;
                                {brandingPipeline.map(task =&gt; (
                                    &lt;li key={task.id} className=&quot;text-sm p-2 rounded-md bg-muted/50 flex justify-between items-center&quot;&gt;
                                        &lt;span&gt;{task.name}&lt;/span&gt;
                                        &lt;Badge variant=&quot;secondary&quot;&gt;Active&lt;/Badge&gt;
                                    &lt;/li&gt;
                                ))}
                            &lt;/ul&gt;
                        ) : (
                            &lt;p className=&quot;text-muted-foreground text-sm&quot;&gt;Branding pipeline is clear. Go to Deep Work to mark items as ready!&lt;/p&gt;
                        )}
                    &lt;/div&gt;
                    &lt;div className=&quot;pt-4 border-t&quot;&gt;
                        &lt;h4 className=&quot;font-semibold mb-2 flex items-center gap-2 text-base&quot;&gt;&lt;Magnet className=&quot;h-5 w-5&quot;/&gt; Lead Generation Tasks&lt;/h4&gt;
                        {leadGenPipeline.length &gt; 0 ? (
                             &lt;ul className=&quot;space-y-2&quot;&gt;
                                {leadGenPipeline.map(task =&gt; (
                                    &lt;li key={task.id} className=&quot;text-sm p-2 rounded-md bg-muted/50 flex justify-between items-center&quot;&gt;
                                        &lt;span&gt;{task.name}&lt;/span&gt;
                                    &lt;/li&gt;
                                ))}
                            &lt;/ul&gt;
                        ) : (
                            &lt;p className=&quot;text-muted-foreground text-sm&quot;&gt;No lead generation tasks defined.&lt;/p&gt;
                        )}
                    &lt;/div&gt;
                    &lt;div className=&quot;pt-4 border-t&quot;&gt;
                        &lt;h4 className=&quot;font-semibold mb-2 flex items-center gap-2 text-base&quot;&gt;&lt;Package className=&quot;h-5 w-5&quot;/&gt; Defined Offers&lt;/h4&gt;
                        {offerSystemPipeline.length &gt; 0 ? (
                             &lt;ul className=&quot;space-y-2&quot;&gt;
                                {offerSystemPipeline.map((task: any) =&gt; (
                                    &lt;li key={task.id} className=&quot;text-sm p-2 rounded-md bg-muted/50 flex justify-between items-center&quot;&gt;
                                        &lt;span&gt;{task.name}&lt;/span&gt;
                                    &lt;/li&gt;
                                ))}
                            &lt;/ul&gt;
                        ) : (
                            &lt;p className=&quot;text-muted-foreground text-sm&quot;&gt;No offers have been defined yet.&lt;/p&gt;
                        )}
                    &lt;/div&gt;
                &lt;/CardContent&gt;
            &lt;/Card&gt;

            &lt;Card&gt;
                &lt;CardHeader&gt;
                    &lt;CardTitle className=&quot;flex items-center gap-3 text-xl&quot;&gt;&lt;Rocket className=&quot;h-6 w-6 text-primary&quot;/&gt; Upcoming Roadmap&lt;/CardTitle&gt;
                    &lt;CardDescription&gt;Your upcoming product and service releases.&lt;/CardDescription&gt;
                &lt;/CardHeader&gt;
                &lt;CardContent&gt;
                    {upcomingReleases.length &gt; 0 ? (
                         &lt;ul className=&quot;space-y-3&quot;&gt;
                            {upcomingReleases.map(({ topic, release, type }) =&gt; (
                                &lt;li key={release.id} className=&quot;text-sm p-3 rounded-md bg-muted/50 flex justify-between items-center&quot;&gt;
                                    &lt;div&gt;
                                        &lt;span className=&quot;font-semibold&quot;&gt;{release.name}&lt;/span&gt;
                                        &lt;span className=&quot;text-muted-foreground ml-2&quot;&gt;({topic})&lt;/span&gt;
                                    &lt;/div&gt;
                                     &lt;div className=&quot;flex items-center gap-2&quot;&gt;
                                        &lt;Badge variant=&quot;outline&quot; className=&quot;capitalize&quot;&gt;{type}&lt;/Badge&gt;
                                        &lt;Badge variant=&quot;secondary&quot;&gt;{format(parseISO(release.launchDate), 'MMM dd, yyyy')}&lt;/Badge&gt;
                                    &lt;/div&gt;
                                &lt;/li&gt;
                            ))}
                        &lt;/ul&gt;
                    ) : (
                        &lt;p className=&quot;text-muted-foreground text-sm&quot;&gt;No upcoming releases planned.&lt;/p&gt;
                    )}
                &lt;/CardContent&gt;
            &lt;/Card&gt;
            
             &lt;Card&gt;
                &lt;CardHeader&gt;
                    &lt;CardTitle className=&quot;flex items-center gap-3 text-xl&quot;&gt;
                        &lt;MessageSquareQuote className=&quot;h-6 w-6 text-primary&quot;/&gt;
                        Weekly Reflection
                    &lt;/CardTitle&gt;
                    &lt;CardDescription&gt;Take a moment to reflect and adjust your focus.&lt;/CardDescription&gt;
                &lt;/CardHeader&gt;
                &lt;CardContent&gt;
                    &lt;ul className=&quot;space-y-4 text-muted-foreground list-disc pl-5&quot;&gt;
                      &lt;li&gt;Which of these are moving you forward the most?&lt;/li&gt;
                      &lt;li&gt;Which one have you neglected and why?&lt;/li&gt;
                      &lt;li&gt;What do you want to add/remove from your plate this week?&lt;/li&gt;
                    &lt;/ul&gt;
                &lt;/CardContent&gt;
            &lt;/Card&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  );
}

export default function MyPlatePage() {
    return (
        &lt;AuthGuard&gt;
            &lt;MyPlatePageContent /&gt;
        &lt;/AuthGuard&gt;
    )
}

    
