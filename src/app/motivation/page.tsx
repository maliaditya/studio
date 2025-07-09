
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, ArrowDown, ArrowUp, BarChart3, TrendingUp, TrendingDown, CheckCircle2, PauseCircle, Calendar, BookCopy, HeartPulse } from 'lucide-react';
import { differenceInDays, subDays, format, parseISO, addDays, differenceInYears, addWeeks, getISOWeekYear, setISOWeek, startOfISOWeek } from 'date-fns';
import type { DatedWorkout, WeightLog, TopicGoal, ExerciseDefinition } from '@/types/workout';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

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
  weight_no_goal_up: [
      "Your weight trended up this week. Is this aligned with your current, unstated goals? A good time to reflect.",
  ],
  weight_no_goal_down: [
      "Your weight trended down this week. Great progress if you're aiming for weight loss! If not, now is a good time to assess.",
  ],
  weight_no_data: [
      "Log your weight for two consecutive weeks to start seeing trends and get personalized feedback.",
      "Track your weight weekly to unlock insights and feedback on your progress.",
  ],
  age_related: [
    "At age {{age}}, you're building habits that will compound for decades. Keep investing in yourself, {{username}}.",
    "Think about where you want to be at age {{next_age}}. The work you're doing now is paving that path.",
    "Every hour you invest in your skills at {{age}} is a massive leverage point for your future. Great work.",
  ],
  life_perspective_weight: [
    "Your dedication to fitness is clear. If you stay on this path, you're projected to hit your weight goal at age {{projectedAge}}. Future you will be grateful.",
  ],
  life_perspective_intention: [
    "Your vision for '{{intentionName}}' is taking shape. At this rate, you could complete it by age {{projectedAge}}. That's a huge milestone to look forward to.",
  ],
  life_perspective_skill: [
    "Mastering '{{topicName}}' is a marathon, not a sprint. At this pace, you're set to reach your learning goal by age {{projectedAge}}, {{username}}.",
  ],
};

// Helper to select a random message and personalize it
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


const MotivationPageContent = () => {
  const { 
    currentUser, 
    dateOfBirth, 
    allDeepWorkLogs, 
    allUpskillLogs, 
    allWorkoutLogs, 
    weightLogs, 
    goalWeight, 
    topicGoals,
    deepWorkDefinitions,
    upskillDefinitions
  } = useAuth();
  
  const userContext = useMemo(() => {
    const age = dateOfBirth ? differenceInYears(new Date(), parseISO(dateOfBirth)) : null;
    return { username: currentUser?.username, age };
  }, [currentUser, dateOfBirth]);
  
  const weeklyStats = useMemo(() => {
    const today = new Date();
    const oneWeekAgo = subDays(today, 7);
    const last7DaysStart = subDays(today, 6);
    const prev7DaysStart = subDays(today, 13);
    
    const calculateTotal = (logs: DatedWorkout[], startDate: Date, endDate: Date, field: 'reps' | 'weight') => {
      return logs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= startDate && logDate <= endDate;
      }).reduce((total, log) => total + log.exercises.reduce((exTotal, ex) => exTotal + ex.loggedSets.reduce((setTotal, set) => setTotal + (set[field] || 0), 0), 0), 0);
    };
    
    const countWorkouts = (logs: DatedWorkout[], startDate: Date, endDate: Date) => {
        return logs.filter(log => {
            const logDate = new Date(log.date);
            return logDate >= startDate && logDate <= endDate && log.exercises.some(ex => ex.loggedSets.length > 0);
        }).length;
    }

    const getLatestWeight = (logs: WeightLog[], endDate: Date) => {
        const relevantLogs = logs.filter(log => {
            const [year, weekNum] = log.date.split('-W');
            const logDate = startOfISOWeek(setISOWeek(new Date(parseInt(year), 0, 4), parseInt(weekNum)));
            return logDate <= endDate;
        });
        return relevantLogs.sort((a,b) => a.date.localeCompare(b.date)).pop();
    };

    const calculateProjection = (logs: DatedWorkout[], goals: Record<string, TopicGoal>, endDate: Date) => {
      const dailyProgress: Record<string, { total: number; firstDate: Date }> = {};
      
      logs.forEach(log => {
          if (parseISO(log.date) > endDate) return;
          log.exercises.forEach(ex => {
              if (goals[ex.category]) {
                  const progress = ex.loggedSets.reduce((sum, set) => sum + set.weight, 0);
                  if (progress > 0) {
                      if (!dailyProgress[ex.category]) {
                          dailyProgress[ex.category] = { total: 0, firstDate: parseISO(log.date) };
                      }
                      dailyProgress[ex.category].total += progress;
                      if (parseISO(log.date) < dailyProgress[ex.category].firstDate) {
                          dailyProgress[ex.category].firstDate = parseISO(log.date);
                      }
                  }
              }
          });
      });

      let overallDaysToCompletion: number | null = null;
      Object.keys(dailyProgress).forEach(topic => {
          const data = dailyProgress[topic];
          const goal = goals[topic];
          const duration = differenceInDays(endDate, data.firstDate) + 1;
          const rate = data.total / duration;
          if (rate > 0) {
              const remaining = goal.goalValue - data.total;
              if (remaining > 0) {
                  const days = Math.ceil(remaining / rate);
                  if (overallDaysToCompletion === null || days < overallDaysToCompletion) {
                      overallDaysToCompletion = days;
                  }
              }
          }
      });
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

    return {
      deepWork: { current: currentDeepWork, prev: prevDeepWork },
      upskill: { current: currentUpskill, prev: prevUpskill, currentDaysToGoal, prevDaysToGoal },
      workouts: { current: currentWorkouts, prev: prevWorkouts },
      weight: { current: latestWeight?.weight || 0, prev: prevWeightLog?.weight || 0 },
    };
  }, [allDeepWorkLogs, allUpskillLogs, allWorkoutLogs, weightLogs, topicGoals]);

  const lifePerspectiveInsight = useMemo(() => {
    if (!userContext.age || !dateOfBirth) return null;

    let projectionData = null;
    let messageKey: keyof typeof messageTemplates = 'age_related';
    let context: Record<string, any> = userContext;
    
    const calculateProjection = (totalRequired: number, logged: number, avgDailyRate: number, firstLogDate: Date) => {
        const remaining = totalRequired - logged;
        if (remaining <= 0) return null;
        const daysToCompletion = Math.ceil(remaining / avgDailyRate);
        const projectedDate = addDays(new Date(), daysToCompletion);
        const projectedAge = differenceInYears(projectedDate, parseISO(dateOfBirth));
        return {
            logged,
            totalRequired,
            progressPercent: (logged / totalRequired) * 100,
            projectedAge,
            daysRemaining: daysToCompletion,
            avgRate: avgDailyRate,
        };
    };

    if (goalWeight && weightLogs.length >= 2) {
      const sortedLogs = weightLogs.map(log => {
        const [year, weekNum] = log.date.split('-W');
        return { ...log, dateObj: startOfISOWeek(setISOWeek(new Date(parseInt(year), 0, 4), parseInt(weekNum))) };
      }).sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());
      
      const lastLog = sortedLogs[sortedLogs.length - 1];
      const weightToChange = goalWeight - lastLog.weight;

      if (Math.abs(weightToChange) > 0.1) {
        const changes = sortedLogs.map((log, i) => i > 0 ? log.weight - sortedLogs[i-1].weight : null).filter((c): c is number => c !== null);
        let rate = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
        if (weightToChange < 0 && rate >= 0) rate = -0.5;
        if (weightToChange > 0 && rate <= 0) rate = 0.25;

        if (Math.abs(rate) > 0.01) {
          const weeksToGo = Math.ceil(Math.abs(weightToChange / rate));
          const projectedDate = addWeeks(lastLog.dateObj, weeksToGo);
          const projectedAge = differenceInYears(projectedDate, parseISO(dateOfBirth));
          
          projectionData = {
              title: "Weight Goal",
              current: lastLog.weight.toFixed(1),
              goal: goalWeight,
              unit: "kg/lb",
              projectedAge: projectedAge,
              avgRate: Math.abs(rate),
              rateUnit: "kg/lb per week"
          };
          messageKey = 'life_perspective_weight';
          context = { ...userContext, ...projectionData };
        }
      }
    }
    
    const linkedDeepWorkChildIds = new Set<string>((deepWorkDefinitions || []).flatMap(def => def.linkedDeepWorkIds || []));
    const intentions = deepWorkDefinitions.filter(def => {
        const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0;
        const isChild = linkedDeepWorkChildIds.has(def.id);
        return isParent && !isChild;
    });

    if (intentions.length > 0 && !projectionData) {
      const mainIntention = intentions[0];
      let totalEstimatedHours = 0;
      let totalLoggedHours = 0;
      const descendentIds = new Set<string>();
      const queue = [mainIntention.id];
      const visited = new Set<string>();
      
      while(queue.length > 0) {
          const id = queue.shift()!;
          if(visited.has(id)) continue;
          visited.add(id);
          descendentIds.add(id);
          const def = [...deepWorkDefinitions, ...upskillDefinitions].find(d => d.id === id);
          if (def) {
              (def.linkedDeepWorkIds || []).forEach(childId => queue.push(childId));
              (def.linkedUpskillIds || []).forEach(childId => queue.push(childId));
          }
      }

      descendentIds.forEach(id => {
          const def = [...deepWorkDefinitions, ...upskillDefinitions].find(d => d.id === id);
          if(def) totalEstimatedHours += def.estimatedHours || 0;

          allDeepWorkLogs.forEach(log => log.exercises.forEach(ex => {
              if (ex.definitionId === id) totalLoggedHours += ex.loggedSets.reduce((sum, set) => sum + set.weight, 0) / 60;
          }));
          allUpskillLogs.forEach(log => log.exercises.forEach(ex => {
              if (ex.definitionId === id) totalLoggedHours += ex.loggedSets.reduce((sum, set) => sum + set.reps, 0) / 60;
          }));
      });
      
      const avgDailyProductiveHours = (weeklyStats.deepWork.current + weeklyStats.upskill.current) / 7;
      if (totalEstimatedHours > 0 && avgDailyProductiveHours > 0) {
        const proj = calculateProjection(totalEstimatedHours, totalLoggedHours, avgDailyProductiveHours, new Date());
        if(proj) {
            projectionData = {
                title: mainIntention.name,
                current: totalLoggedHours.toFixed(1),
                goal: totalEstimatedHours,
                unit: "hours",
                ...proj
            };
            messageKey = 'life_perspective_intention';
            context = { ...userContext, intentionName: mainIntention.name, projectedAge: proj.projectedAge };
        }
      }
    }
    
    if (weeklyStats.upskill.currentDaysToGoal !== null && !projectionData) {
      const topicName = Object.keys(topicGoals)[0];
      if (topicName) {
        const goal = topicGoals[topicName];
        const logs = allUpskillLogs.filter(log => log.exercises.some(ex => ex.category === topicName));
        const totalProgress = logs.reduce((sum, log) => sum + log.exercises.reduce((exSum, ex) => exSum + ex.loggedSets.reduce((sSum, s) => sSum + s.weight, 0), 0), 0);
        
        projectionData = {
            title: topicName,
            current: totalProgress.toFixed(0),
            goal: goal.goalValue,
            unit: goal.goalType,
            projectedAge: differenceInYears(addDays(new Date(), weeklyStats.upskill.currentDaysToGoal), parseISO(dateOfBirth)),
        };
        messageKey = 'life_perspective_skill';
        context = { ...userContext, topicName: topicName, projectedAge: projectionData.projectedAge };
      }
    }

    if (!projectionData) {
        return {
            type: 'generic',
            message: getRandomMessage('age_related', { ...userContext, next_age: userContext.age ? userContext.age + 1 : '' })
        };
    }
    
    return {
        type: 'specific',
        data: projectionData,
        message: getRandomMessage(messageKey, context)
    };
  }, [userContext, dateOfBirth, goalWeight, weightLogs, deepWorkDefinitions, upskillDefinitions, allDeepWorkLogs, allUpskillLogs, topicGoals, weeklyStats]);

  const getInsight = (
    current: number,
    prev: number,
    burnoutThreshold: number
  ): { trend: 'up' | 'down' | 'stable' | 'burnout'; message: string } => {
    if (current > burnoutThreshold) {
      return { trend: 'burnout', message: getRandomMessage('burnout', userContext) };
    }
    if (current > prev * 1.2) { // More than 20% increase
      return { trend: 'up', message: getRandomMessage('up', userContext) };
    }
    if (current < prev * 0.8) { // More than 20% decrease
      if (prev > 0) {
        return { trend: 'down', message: getRandomMessage('down', userContext) };
      }
      return { trend: 'down', message: getRandomMessage('new_week', userContext) };
    }
    if (current > 0) {
      return { trend: 'stable', message: getRandomMessage('stable', userContext) };
    }
    return { trend: 'stable', message: getRandomMessage('new_week', userContext) };
  };

  const getUpskillInsight = (
    currentHours: number,
    prevHours: number,
    currentDays: number | null,
    prevDays: number | null
  ) => {
    // Check for goal projection changes first
    if (currentDays !== null && prevDays !== null) {
      if (currentDays < prevDays) {
        return { trend: 'up' as const, message: getRandomMessage('goal_getting_closer', userContext) };
      }
      if (currentDays > prevDays) {
        return { trend: 'down' as const, message: getRandomMessage('goal_slipping', userContext) };
      }
      return { trend: 'stable' as const, message: getRandomMessage('goal_stable', userContext) };
    }

    // Fallback to simple hour comparison if projections aren't available
    return getInsight(currentHours, prevHours, 28);
  };

  const getWeightInsight = (current: number, prev: number, goal: number | null): { trend: 'up' | 'down' | 'stable'; message: string } => {
    if (current === 0 || prev === 0) {
        return { trend: 'stable', message: getRandomMessage('weight_no_data') };
    }
    const change = current - prev;
    if (Math.abs(change) < 0.2) {
        return { trend: 'stable', message: getRandomMessage('weight_stable', userContext) };
    }
  
    const wentUp = change > 0;
    const wentDown = change < 0;
  
    // With a goal set
    if (goal) {
      const goalIsLower = goal < prev;
      const goalIsHigher = goal > prev;
  
      if (goalIsLower) { // Goal is to lose weight
        if (wentDown) return { trend: 'down', message: getRandomMessage('weight_loss_good', userContext) };
        if (wentUp) return { trend: 'up', message: getRandomMessage('weight_loss_bad', userContext) };
      }
      if (goalIsHigher) { // Goal is to gain weight
        if (wentUp) return { trend: 'up', message: getRandomMessage('weight_gain_good', userContext) };
        if (wentDown) return { trend: 'down', message: getRandomMessage('weight_gain_bad', userContext) };
      }
    }
  
    // No goal set (generic feedback)
    if (wentUp) {
        return { trend: 'up', message: getRandomMessage('weight_no_goal_up') };
    }
    // wentDown
    return { trend: 'down', message: getRandomMessage('weight_no_goal_down') };
  };

  const deepWorkInsight = getInsight(weeklyStats.deepWork.current, weeklyStats.deepWork.prev, 35); // 5h/day burnout
  const upskillInsight = getUpskillInsight(weeklyStats.upskill.current, weeklyStats.upskill.prev, weeklyStats.upskill.currentDaysToGoal, weeklyStats.upskill.prevDaysToGoal);
  const workoutInsight = getInsight(weeklyStats.workouts.current, weeklyStats.workouts.prev, 7);
  const weightInsight = getWeightInsight(weeklyStats.weight.current, weeklyStats.weight.prev, goalWeight);

  const renderTrend = (trend: 'up' | 'down' | 'stable' | 'burnout', changeText: string) => {
    const getIcon = () => {
        switch (trend) {
        case 'up': return <ArrowUp className="h-4 w-4 text-green-500" />;
        case 'down': return <ArrowDown className="h-4 w-4 text-red-500" />;
        case 'burnout': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
        default: return <PauseCircle className="h-4 w-4 text-muted-foreground" />;
        }
    };
    return (
        <div className="flex items-center text-xs text-muted-foreground">
            {getIcon()}
            <span className="ml-1">{changeText}</span>
        </div>
    )
  };

  const getChangeText = (current: number, prev: number, trend: 'up'|'down'|'stable'|'burnout') => {
    const change = current - prev;
    const percentChange = prev !== 0 ? (change / prev) * 100 : current > 0 ? 100 : 0;
    if (trend === 'up') return `Up ${percentChange.toFixed(0)}% from last week`;
    if (trend === 'down') return `Down ${Math.abs(percentChange).toFixed(0)}% from last week`;
    if (trend === 'burnout') return 'Potential burnout risk';
    return 'Consistent effort';
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          Weekly Insights
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Your personal AI coach analyzing last week's performance to keep you motivated.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Productivity Insights</CardTitle>
                <CardDescription>Your deep work and learning trends from the last week.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary"/>
                            <h3 className="font-semibold">Deep Work</h3>
                        </div>
                        {renderTrend(deepWorkInsight.trend, getChangeText(weeklyStats.deepWork.current, weeklyStats.deepWork.prev, deepWorkInsight.trend))}
                    </div>
                    <div className="mt-2 text-2xl font-bold">{weeklyStats.deepWork.current.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">hours</span></div>
                    <p className="text-xs text-muted-foreground">vs {weeklyStats.deepWork.prev.toFixed(1)} hours last week</p>
                    <p className="mt-4 text-sm text-foreground" dangerouslySetInnerHTML={{ __html: deepWorkInsight.message }}></p>
                </div>
                <Separator />
                <div>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary"/>
                            <h3 className="font-semibold">Upskill</h3>
                        </div>
                        {renderTrend(upskillInsight.trend, getChangeText(weeklyStats.upskill.current, weeklyStats.upskill.prev, upskillInsight.trend))}
                    </div>
                    <div className="mt-2 text-2xl font-bold">{weeklyStats.upskill.current.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">hours</span></div>
                    <p className="text-xs text-muted-foreground">vs {weeklyStats.upskill.prev.toFixed(1)} hours last week</p>
                    <p className="mt-4 text-sm text-foreground" dangerouslySetInnerHTML={{ __html: upskillInsight.message }}></p>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Health & Fitness Insights</CardTitle>
                <CardDescription>Your workout consistency and weight tracking analysis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary"/>
                            <h3 className="font-semibold">Workouts</h3>
                        </div>
                        {renderTrend(workoutInsight.trend, getChangeText(weeklyStats.workouts.current, weeklyStats.workouts.prev, workoutInsight.trend))}
                    </div>
                    <div className="mt-2 text-2xl font-bold">{weeklyStats.workouts.current} <span className="text-sm font-normal text-muted-foreground">sessions</span></div>
                    <p className="text-xs text-muted-foreground">vs {weeklyStats.workouts.prev} sessions last week</p>
                    <p className="mt-4 text-sm text-foreground" dangerouslySetInnerHTML={{ __html: workoutInsight.message }}></p>
                </div>
                <Separator />
                <div>
                    <div className="flex justify-between items-start">
                         <div className="flex items-center gap-2">
                            <HeartPulse className="h-5 w-5 text-primary"/>
                            <h3 className="font-semibold">Weight Trend</h3>
                        </div>
                        {renderTrend(weightInsight.trend, `${weeklyStats.weight.current > weeklyStats.weight.prev ? 'Up' : 'Down'} ${Math.abs(weeklyStats.weight.current - weeklyStats.weight.prev).toFixed(1)} kg/lb`)}
                    </div>
                    <div className="mt-2 text-2xl font-bold">{weeklyStats.weight.current > 0 ? weeklyStats.weight.current.toFixed(1) : '-'} <span className="text-sm font-normal text-muted-foreground">kg/lb</span></div>
                    <p className="text-xs text-muted-foreground">{weeklyStats.weight.prev > 0 ? `vs ${weeklyStats.weight.prev.toFixed(1)} kg/lb last week` : 'No data from last week'}</p>
                    <p className="mt-4 text-sm text-foreground" dangerouslySetInnerHTML={{ __html: weightInsight.message }}></p>
                </div>
            </CardContent>
        </Card>

        {userContext.age && lifePerspectiveInsight && (
           <Card className="flex flex-col md:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar /> Life Perspective
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow justify-between">
              {lifePerspectiveInsight.type === 'specific' && lifePerspectiveInsight.data ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg" dangerouslySetInnerHTML={{ __html: lifePerspectiveInsight.message }}></p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-md bg-muted/50">
                      <div className="text-muted-foreground">Goal: <b>{lifePerspectiveInsight.data.title}</b></div>
                      <div className="grid grid-cols-2 gap-x-2 mt-2">
                          <div>Current:</div><div className="font-bold">{lifePerspectiveInsight.data.current} {lifePerspectiveInsight.data.unit}</div>
                          <div>Goal:</div><div className="font-bold">{lifePerspectiveInsight.data.goal} {lifePerspectiveInsight.data.unit}</div>
                      </div>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <div className="text-muted-foreground">Projection</div>
                      <div className="grid grid-cols-2 gap-x-2 mt-2">
                          <div>Current Age:</div><div className="font-bold">{userContext.age}</div>
                          <div>Est. Age:</div><div className="font-bold">{lifePerspectiveInsight.data.projectedAge}</div>
                      </div>
                    </div>
                  </div>
                  {lifePerspectiveInsight.data.logged !== undefined && (
                    <div>
                      <Progress value={lifePerspectiveInsight.data.progressPercent} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{lifePerspectiveInsight.data.logged.toFixed(1)}h logged</span>
                        <span>{lifePerspectiveInsight.data.totalRequired.toFixed(1)}h est.</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-lg" dangerouslySetInnerHTML={{ __html: lifePerspectiveInsight.message }}></p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default function MotivationPage() {
  return (
    <AuthGuard>
      <MotivationPageContent />
    </AuthGuard>
  );
}


