
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, ArrowDown, ArrowUp, BarChart3, TrendingUp, TrendingDown, CheckCircle2, PauseCircle } from 'lucide-react';
import { differenceInDays, subDays, format, parseISO, addDays } from 'date-fns';
import type { DatedWorkout, WeightLog, TopicGoal } from '@/types/workout';

const InsightCard = ({
  icon,
  title,
  trend,
  currentValue,
  previousValue,
  unit,
  message,
}: {
  icon: React.ReactNode;
  title: string;
  trend: 'up' | 'down' | 'stable' | 'burnout';
  currentValue: number;
  previousValue: number;
  unit: string;
  message: string;
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'down': return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'burnout': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <PauseCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const trendText = () => {
    const change = currentValue - previousValue;
    const percentChange = previousValue !== 0 ? (change / previousValue) * 100 : currentValue > 0 ? 100 : 0;
    
    if (trend === 'up') return `Up ${percentChange.toFixed(0)}% from last week`;
    if (trend === 'down') return `Down ${Math.abs(percentChange).toFixed(0)}% from last week`;
    if (trend === 'burnout') return 'Potential burnout risk';
    return 'Consistent effort';
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
            {icon} {title}
        </CardTitle>
        <div className="flex items-center text-xs text-muted-foreground">
            {getTrendIcon()}
            <span className="ml-1">{trendText()}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow">
        <div className="text-2xl font-bold">{currentValue.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">{unit}</span></div>
        <p className="text-xs text-muted-foreground">vs {previousValue.toFixed(1)} {unit} last week</p>
        <p className="mt-4 text-sm text-foreground flex-grow">{message}</p>
      </CardContent>
    </Card>
  );
};

const MotivationPageContent = () => {
  const { allDeepWorkLogs, allUpskillLogs, allWorkoutLogs, weightLogs, goalWeight, topicGoals } = useAuth();

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
            const logDate = new Date(`${year}-01-01`);
            logDate.setDate(logDate.getDate() + (parseInt(weekNum) - 1) * 7);
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

  const getInsight = (
    current: number,
    prev: number,
    burnoutThreshold: number
  ): { trend: 'up' | 'down' | 'stable' | 'burnout'; message: string } => {
    if (current > burnoutThreshold) {
      return { trend: 'burnout', message: "You're putting in incredible hours! This is amazing, but make sure you're taking time to rest and avoid burnout. Sustainable progress is key." };
    }
    if (current > prev * 1.2) { // More than 20% increase
      return { trend: 'up', message: "Fantastic momentum! You've significantly increased your focus this week. Keep up the great work and build on this success." };
    }
    if (current < prev * 0.8) { // More than 20% decrease
      if (prev > 0) {
        return { trend: 'down', message: "It looks like things slowed down a bit this week. That's completely normal. Was this intentional rest, or did something get in the way? Reflect and adjust for next week." };
      }
      return { trend: 'down', message: "A quieter week. A great opportunity to plan your comeback and set clear goals for the upcoming days." };
    }
    if (current > 0) {
      return { trend: 'stable', message: "Solid and steady! Consistency is the foundation of all progress. You're building strong habits. Keep it going!" };
    }
    return { trend: 'stable', message: "It's a fresh start. What's one small step you can take today to get the ball rolling?" };
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
        const daysReduced = prevDays - currentDays;
        return { trend: 'up' as const, message: `Incredible work! You've cut your estimated time to goal by ${daysReduced} day${daysReduced > 1 ? 's' : ''}. Your goal is getting closer!` };
      }
      if (currentDays > prevDays) {
        const daysIncreased = currentDays - prevDays;
        return { trend: 'down' as const, message: `Your projected goal date has slipped by ${daysIncreased} day${daysIncreased > 1 ? 's' : ''}. Let's refocus this week to get back on track!` };
      }
      return { trend: 'stable' as const, message: `You're on a steady path to your goal. Your consistent effort is maintaining your projected completion date. Keep it up!` };
    }

    // Fallback to simple hour comparison if projections aren't available
    return getInsight(currentHours, prevHours, 28);
  };

  const getWeightInsight = (current: number, prev: number, goal: number | null): { trend: 'up' | 'down' | 'stable'; message: string } => {
    if (current === 0 || prev === 0) {
        return { trend: 'stable', message: "Log your weight for two consecutive weeks to start seeing trends and get personalized feedback." };
    }
    const change = current - prev;
    if (Math.abs(change) < 0.2) {
        return { trend: 'stable', message: `Your weight is stable, holding at ${current.toFixed(1)} kg/lb. Consistency is paying off. Keep your habits strong.` };
    }
  
    const wentUp = change > 0;
    const wentDown = change < 0;
  
    // With a goal set
    if (goal) {
      const goalIsLower = goal < prev;
      const goalIsHigher = goal > prev;
  
      if (goalIsLower) { // Goal is to lose weight
        if (wentDown) return { trend: 'down', message: `Excellent! You dropped from ${prev.toFixed(1)} to ${current.toFixed(1)} kg/lb, moving you closer to your goal. Keep up the great work!` };
        if (wentUp) return { trend: 'up', message: `Your weight went up from ${prev.toFixed(1)} to ${current.toFixed(1)} kg/lb. This is a small step away from your weight loss goal. Let's refocus on the plan this week!` };
      }
      if (goalIsHigher) { // Goal is to gain weight
        if (wentUp) return { trend: 'up', message: `Great! You went from ${prev.toFixed(1)} to ${current.toFixed(1)} kg/lb. This is solid progress towards your weight gain goal. Stay consistent!` };
        if (wentDown) return { trend: 'down', message: `Your weight dropped from ${prev.toFixed(1)} to ${current.toFixed(1)} kg/lb. This is moving away from your goal. Consider a small calorie surplus to get back on track.` };
      }
    }
  
    // No goal set (generic feedback)
    if (wentUp) {
        return { trend: 'up', message: `Your weight went from ${prev.toFixed(1)} to ${current.toFixed(1)} kg/lb. Is this aligned with your current goals? Review your diet and activity.` };
    }
    // wentDown
    return { trend: 'down', message: `Your weight dropped from ${prev.toFixed(1)} to ${current.toFixed(1)} kg/lb. Great progress if you're aiming for weight loss! If not, consider a small calorie surplus.` };
  };

  const deepWorkInsight = getInsight(weeklyStats.deepWork.current, weeklyStats.deepWork.prev, 35); // 5h/day burnout
  const upskillInsight = getUpskillInsight(weeklyStats.upskill.current, weeklyStats.upskill.prev, weeklyStats.upskill.currentDaysToGoal, weeklyStats.upskill.prevDaysToGoal);
  const workoutInsight = getInsight(weeklyStats.workouts.current, weeklyStats.workouts.prev, 7);
  const weightInsight = getWeightInsight(weeklyStats.weight.current, weeklyStats.weight.prev, goalWeight);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <InsightCard
          icon={<BarChart3 />}
          title="Deep Work"
          trend={deepWorkInsight.trend}
          currentValue={weeklyStats.deepWork.current}
          previousValue={weeklyStats.deepWork.prev}
          unit="hours"
          message={deepWorkInsight.message}
        />
        <InsightCard
          icon={<TrendingUp />}
          title="Upskill"
          trend={upskillInsight.trend}
          currentValue={weeklyStats.upskill.current}
          previousValue={weeklyStats.upskill.prev}
          unit="hours"
          message={upskillInsight.message}
        />
        <InsightCard
          icon={<CheckCircle2 />}
          title="Workouts"
          trend={workoutInsight.trend}
          currentValue={weeklyStats.workouts.current}
          previousValue={weeklyStats.workouts.prev}
          unit="sessions"
          message={workoutInsight.message}
        />
        <InsightCard
          icon={<TrendingDown />}
          title="Weight Trend"
          trend={weightInsight.trend}
          currentValue={weeklyStats.weight.current}
          previousValue={weeklyStats.weight.prev}
          unit="kg/lb"
          message={weightInsight.message}
        />
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

