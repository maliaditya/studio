
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

// --- Message Banks ---
const messageTemplates = {
  burnout: [
    "You're putting in incredible hours! This is amazing, but make sure you're taking time to rest and avoid burnout. Sustainable progress is key.",
    "An absolutely massive week! Your dedication is off the charts. Remember, even the sharpest axe needs sharpening. Don't forget to schedule some downtime.",
    "Incredible intensity! You're crushing it. Just a friendly reminder to listen to your body and mind. Rest is as important as the work itself for long-term gains.",
  ],
  up: [
    "Fantastic momentum! You've significantly increased your focus this week. Keep up the great work and build on this success.",
    "What a surge in productivity! Whatever you changed this week is clearly working. Let's keep that fire going.",
    "Great job stepping up the intensity. You're making serious progress. Channel this energy into next week.",
  ],
  down: [
    "It looks like things slowed down a bit this week. That's completely normal. Was this intentional rest, or did something get in the way? Reflect and adjust for next week.",
    "A quieter week. A great opportunity to plan your comeback and set a clear, achievable goal for the upcoming days.",
    "Every system needs downtime. If this was a planned break, great. If not, what's one small step you can take tomorrow to get back on track?",
  ],
  stable: [
    "Solid and steady! Consistency is the foundation of all progress. You're building strong habits. Keep it going!",
    "Another consistent week in the books. This is how long-term goals are achieved. Well done.",
    "You're in the groove. Maintaining this level of effort is a skill in itself. Keep executing.",
  ],
  new_week: [
    "It's a fresh start. What's one small step you can take today to get the ball rolling?",
    "A new week begins. What's your number one priority? Let's get after it.",
  ],
  goal_getting_closer: [
      "Incredible work! You've cut down your estimated time to goal. Your consistent effort is paying off, and the finish line is getting closer.",
      "Your goal is approaching faster than ever! This week's progress has significantly shortened your timeline. Keep up this amazing pace!",
      "Momentum is on your side. You've made great strides and your projected completion date has moved up. This is what progress looks like!",
  ],
  goal_slipping: [
      "Your projected goal date has slipped a bit. It's a good time to reassess. Was this a planned rest, or is it time to recommit to the original pace?",
      "It looks like the timeline for your goal has extended. Let's analyze what happened this week and see how we can get back on the fast track.",
      "A small course correction might be needed. Your goal date has moved further out. Let's set a clear intention for this week to close the gap.",
  ],
  goal_stable: [
      "You're on a steady path to your goal. Your consistent effort is maintaining your projected completion date. Keep up the great work!",
      "Steady as she goes! You're right on track with your projection. Consistency is your superpower right now.",
      "Excellent. You're meeting the required pace to stay on schedule for your goal. Keep this rhythm going.",
  ],
  weight_loss_good: [
      "Excellent! You're moving closer to your weight loss goal. Your hard work in diet and exercise is clearly paying off.",
      "Great progress! You're successfully trending towards your target weight. Keep up the consistent effort.",
  ],
  weight_loss_bad: [
      "A small bump in the road. This week's trend is moving away from your weight loss goal. Let's review the plan and get back on track.",
      "It looks like we're slightly off course from your weight loss target. A minor adjustment to your diet or activity could make all the difference this week.",
  ],
  weight_gain_good: [
      "Great! This is solid progress towards your weight gain goal. Stay consistent with your nutrition and training!",
      "Nice work. You're successfully adding mass and moving towards your target. Keep fueling your body for growth.",
  ],
  weight_gain_bad: [
      "This week's trend is moving away from your weight gain goal. Consider a small, consistent calorie surplus to get back on track.",
      "A slight dip this week. Let's ensure you're getting enough fuel to support your muscle-building goals.",
  ],
  weight_stable: [
      "Your weight is stable, holding steady. This is great for maintenance. Keep your habits strong.",
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
  ]
};

// Helper to select a random message
const getRandomMessage = (category: keyof typeof messageTemplates) => {
  const messages = messageTemplates[category];
  return messages[Math.floor(Math.random() * messages.length)];
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
      return { trend: 'burnout', message: getRandomMessage('burnout') };
    }
    if (current > prev * 1.2) { // More than 20% increase
      return { trend: 'up', message: getRandomMessage('up') };
    }
    if (current < prev * 0.8) { // More than 20% decrease
      if (prev > 0) {
        return { trend: 'down', message: getRandomMessage('down') };
      }
      return { trend: 'down', message: getRandomMessage('new_week') };
    }
    if (current > 0) {
      return { trend: 'stable', message: getRandomMessage('stable') };
    }
    return { trend: 'stable', message: getRandomMessage('new_week') };
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
        return { trend: 'up' as const, message: getRandomMessage('goal_getting_closer') };
      }
      if (currentDays > prevDays) {
        return { trend: 'down' as const, message: getRandomMessage('goal_slipping') };
      }
      return { trend: 'stable' as const, message: getRandomMessage('goal_stable') };
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
        return { trend: 'stable', message: getRandomMessage('weight_stable') };
    }
  
    const wentUp = change > 0;
    const wentDown = change < 0;
  
    // With a goal set
    if (goal) {
      const goalIsLower = goal < prev;
      const goalIsHigher = goal > prev;
  
      if (goalIsLower) { // Goal is to lose weight
        if (wentDown) return { trend: 'down', message: getRandomMessage('weight_loss_good') };
        if (wentUp) return { trend: 'up', message: getRandomMessage('weight_loss_bad') };
      }
      if (goalIsHigher) { // Goal is to gain weight
        if (wentUp) return { trend: 'up', message: getRandomMessage('weight_gain_good') };
        if (wentDown) return { trend: 'down', message: getRandomMessage('weight_gain_bad') };
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

