
"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { format, getDay, getISOWeek, differenceInDays, addDays, parseISO, subYears, differenceInYears, addWeeks, startOfISOWeek, setISOWeek, getISOWeekYear } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MindMapViewer } from '@/components/MindMapViewer';

import { TodaysWorkoutModal } from '@/components/TodaysWorkoutModal';
import { TodaysLearningModal } from '@/components/TodaysLearningModal';
import { TodaysLeadGenModal } from '@/components/TodaysLeadGenModal';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { DietPlanModal } from '@/components/DietPlanModal';
import { StatsOverviewModal } from '@/components/StatsOverviewModal';
import { DashboardStats } from '@/components/DashboardStats';
import { ProductivitySnapshot } from '@/components/ProductivitySnapshot';
import { TimeSlots } from '@/components/TimeSlots';
import { WeightGoalCard } from '@/components/WeightGoalCard';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { TodaysScheduleCard } from '@/components/TodaysScheduleCard';


import type { AllWorkoutPlans, ExerciseDefinition, WorkoutMode, WorkoutExercise, FullSchedule, Activity as ActivityType, DatedWorkout, TopicGoal, WorkoutPlan, ExerciseCategory, WeightLog, Gender, UserDietPlan, DailySchedule, Activity, Release } from '@/types/workout';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { KanbanPageContent } from '@/app/kanban/page';

const slotEndHours: Record<string, number> = {
  'Late Night': 4, 'Dawn': 8, 'Morning': 12, 'Afternoon': 16, 'Evening': 20, 'Night': 24,
};

const productivityLevels = [
    { level: 'L1', min: 15, max: 30, description: 'Just showing up', zone: '⚪️ Entry Zone' },
    { level: 'L2', min: 30, max: 45, description: 'Light touch / spark', zone: '⚪️ Entry Zone' },
    { level: 'L3', min: 45, max: 60, description: 'Single Pomodoro session', zone: '⚪️ Entry Zone' },
    { level: 'L4', min: 60, max: 90, description: 'Basic learner habit', zone: '🟢 Stable Zone' },
    { level: 'L5', min: 90, max: 120, description: 'Focused beginner phase', zone: '🟢 Stable Zone' },
    { level: 'L6', min: 120, max: 150, description: 'Mini deep work commitment', zone: '🟢 Stable Zone' },
    { level: 'L7', min: 150, max: 180, description: 'Structured discipline zone', zone: '🟢 Stable Zone' },
    { level: 'L8', min: 180, max: 210, description: 'Daily scholar mode', zone: '🟡 Progress Zone' },
    { level: 'L9', min: 210, max: 240, description: 'Solid effort / Part-time student', zone: '🟡 Progress Zone' },
    { level: 'L10', min: 240, max: 300, description: 'Full-time learner level', zone: '🟡 Progress Zone' },
    { level: 'L11', min: 300, max: 360, description: 'Deep learner zone', zone: '🟡 Progress Zone' },
    { level: 'L12', min: 360, max: 420, description: 'Advanced practice / Bootcamp ready', zone: '🟠 High Intensity' },
    { level: 'L13', min: 420, max: 480, description: 'Peak state zone', zone: '🟠 High Intensity' },
    { level: 'L14', min: 480, max: 540, description: 'Monastic discipline', zone: '🔴 Extreme Zone' },
    { level: 'L15', min: 540, max: 600, description: 'Total immersion day', zone: '🔴 Extreme Zone' },
    { level: 'L16', min: 600, max: 660, description: 'Elite performer stretch', zone: '🔴 Extreme Zone' },
    { level: 'L17', min: 660, max: 720, description: 'Near-max capacity', zone: '🔴 Extreme Zone' },
    { level: 'L18', min: 720, max: 780, description: 'Obsessive learner', zone: '🔴 Extreme Zone' },
    { level: 'L19', min: 780, max: 900, description: 'Burning fuel — not sustainable daily', zone: '🔥 Overdrive Zone' },
    { level: 'L20', min: 900, max: Infinity, description: 'Legendary grind day (Rare / Purpose-driven only)', zone: '⚠️ Apex Zone' },
];

function HomePageContent() {
  const { 
    currentUser, 
    weightLogs, setWeightLogs,
    goalWeight, setGoalWeight,
    height, setHeight,
    dateOfBirth, setDateOfBirth,
    gender, setGender,
    dietPlan, setDietPlan,
    schedule, setSchedule,
    allUpskillLogs, setAllUpskillLogs,
    allDeepWorkLogs, setAllDeepWorkLogs,
    allWorkoutLogs,
    allLeadGenLogs,
    brandingLogs, setAllBrandingLogs,
    setActivityDurations,
    isAgendaDocked, setIsAgendaDocked,
    handleToggleComplete, handleLogLearning,
    workoutMode, workoutPlans, exerciseDefinitions,
    upskillDefinitions, topicGoals, deepWorkDefinitions, setDeepWorkDefinitions,
    leadGenDefinitions,
    productizationPlans,
    offerizationPlans,
  } = useAuth();
  const { toast } = useToast();
  const [currentSlot, setCurrentSlot] = useState('');
  const [remainingTime, setRemainingTime] = useState('');
  const [isScheduleLoaded, setIsScheduleLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedDateKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const todayKey = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // State for Modals
  const [isTodaysWorkoutModalOpen, setIsTodaysWorkoutModalOpen] = useState(false);
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [isLeadGenModalOpen, setIsLeadGenModalOpen] = useState(false);
  const [isDietPlanModalOpen, setIsDietPlanModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
  const [isKanbanModalOpen, setIsKanbanModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<{ slotName: string; activity: Activity } | null>(null);
  const [workoutActivityToLog, setWorkoutActivityToLog] = useState<Activity | null>(null);

  // State for Modal content
  const [todaysExercises, setTodaysExercises] = useState<WorkoutExercise[]>([]);
  const [todaysMuscleGroups, setTodaysMuscleGroups] = useState<string[]>([]);
  
  // State for productivity stats
  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setOneYearAgo(subYears(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1));
  }, []);

  // Effect to set schedule as loaded once user is available
  useEffect(() => {
    if (currentUser?.username) {
        setIsScheduleLoaded(true);
    }
  }, [currentUser]);

  useEffect(() => {
    const timerInterval = setInterval(() => {
        const now = new Date();
        const currentHour = now.getHours();
        let activeSlot = 'Night';
        if (currentHour >= 0 && currentHour < 4) activeSlot = 'Late Night';
        else if (currentHour >= 4 && currentHour < 8) activeSlot = 'Dawn';
        else if (currentHour >= 8 && currentHour < 12) activeSlot = 'Morning';
        else if (currentHour >= 12 && currentHour < 16) activeSlot = 'Afternoon';
        else if (currentHour >= 16 && currentHour < 20) activeSlot = 'Evening';
        setCurrentSlot(activeSlot);
        const slotEndHour = slotEndHours[activeSlot];
        const slotEndTime = new Date(); slotEndTime.setHours(slotEndHour, 0, 0, 0);
        const diff = slotEndTime.getTime() - now.getTime();
        if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            setRemainingTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        } else { setRemainingTime('00:00:00'); }
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // Carry forward tasks logic
  useEffect(() => {
    if (!currentUser || !isScheduleLoaded) return;
    const settingsKey = `lifeos_settings_${currentUser.username}`;
    const storedSettings = localStorage.getItem(settingsKey);
    const settings = storedSettings ? JSON.parse(storedSettings) : { carryForward: false };
    if (!settings.carryForward) return;
    const today = new Date();
    const todayDateKey = format(today, 'yyyy-MM-dd');
    const yesterday = addDays(today, -1);
    const yesterdayKey = format(yesterday, 'yyyy-MM-dd');
    const lastCarryForwardKey = `lifeos_last_carry_forward_${currentUser.username}`;
    const lastCarryForwardDate = localStorage.getItem(lastCarryForwardKey);
    if (lastCarryForwardDate === todayDateKey) return;
    const todaysActivities = schedule[todayDateKey];
    const hasTodaysActivities = todaysActivities && Object.keys(todaysActivities).length > 0 && Object.values(todaysActivities).some(slot => slot.length > 0);
    if (hasTodaysActivities) { localStorage.setItem(lastCarryForwardKey, todayDateKey); return; }
    const yesterdaysSchedule = schedule[yesterdayKey];
    if (!yesterdaysSchedule || Object.keys(yesterdaysSchedule).length === 0) { localStorage.setItem(lastCarryForwardKey, todayDateKey); return; }
    const newTodaySchedule: DailySchedule = {};
    let carriedOver = false;
    Object.entries(yesterdaysSchedule).forEach(([slotName, activities]) => {
        if (activities && activities.length > 0) {
            newTodaySchedule[slotName] = activities.map(activity => ({ ...activity, id: `${activity.type}-${Date.now()}-${Math.random()}`, completed: false }));
            carriedOver = true;
        }
    });
    if (carriedOver) {
        setSchedule(prev => ({ ...prev, [todayDateKey]: newTodaySchedule }));
        toast({ title: "Activities Carried Over", description: "Yesterday's activities have been added to today's schedule." });
    }
    localStorage.setItem(lastCarryForwardKey, todayDateKey);
  }, [currentUser, isScheduleLoaded, schedule, setSchedule, toast]);

  const handleAddActivity = (slotName: string, type: ActivityType) => {
    if (!currentUser?.username || !selectedDateKey) return;
    const currentActivities = schedule[selectedDateKey]?.[slotName] || [];
    if (currentActivities.length >= 2) { toast({ title: "Slot Full", description: "You can add a maximum of two activities per slot.", variant: "destructive" }); return; }
    let details = '';
    switch (type) {
      case 'workout': { const { description } = getExercisesForDay(selectedDate, workoutMode, workoutPlans, exerciseDefinitions); details = description.split(' for ')[1] || "Workout"; break; }
      case 'upskill': details = 'Learning Session'; break;
      case 'deepwork': details = 'Deep Work Session'; break;
      case 'planning': details = 'Planning Session'; break;
      case 'tracking': details = 'Tracking Session'; break;
      case 'branding': details = 'Branding Session'; break;
      case 'lead-generation': details = 'Lead Generation Session'; break;
    }
    const newActivity: Activity = { 
      id: `${type}-${Date.now()}-${Math.random()}`, 
      type, 
      details, 
      completed: false,
      taskIds: [],
    };
    setSchedule(prev => ({ ...prev, [selectedDateKey]: { ...(prev[selectedDateKey] || {}), [slotName]: [...(prev[selectedDateKey]?.[slotName] || []), newActivity] } }));
  };

  const handleRemoveActivity = (slotName: string, activityId: string) => {
    if (!selectedDateKey) return;
    setSchedule(prev => {
      const newTodaySchedule = { ...(prev[selectedDateKey] || {}) };
      const activities = newTodaySchedule[slotName] || [];
      const updatedActivities = activities.filter(act => act.id !== activityId);
      if (updatedActivities.length > 0) { newTodaySchedule[slotName] = updatedActivities; } else { delete newTodaySchedule[slotName]; }
      return { ...prev, [selectedDateKey]: newTodaySchedule };
    });
  };

  const getTodaysWorkout = () => {
    const { exercises, description } = getExercisesForDay(selectedDate, workoutMode, workoutPlans, exerciseDefinitions);
    const muscleGroups = Array.from(new Set(exercises.map(ex => ex.category)));
    return { exercises, muscleGroups };
  };

  const handleStartWorkoutLog = (activity: Activity) => {
    const { exercises, muscleGroups } = getTodaysWorkout();
    setTodaysExercises(exercises);
    setTodaysMuscleGroups(muscleGroups);
    setWorkoutActivityToLog(activity);
    setIsTodaysWorkoutModalOpen(true);
  };
  
  const handleStartLeadGenLog = (activity: Activity) => {
    setWorkoutActivityToLog(activity); // Reusing state for simplicity
    setIsLeadGenModalOpen(true);
  };

  const handleActivityClick = (slotName: string, activity: Activity) => {
    if (!activity || activity.completed) return;
    if (activity.type === 'workout') {
      handleStartWorkoutLog(activity);
    } else if (['upskill', 'deepwork', 'branding'].includes(activity.type)) {
      setEditingActivity({ slotName, activity });
      setIsLearningModalOpen(true);
    } else if (activity.type === 'lead-generation') {
      handleStartLeadGenLog(activity);
    }
  };

  const handleSaveTaskSelection = (finalSelectedDefIds: string[]) => {
    if (!editingActivity) return;
    const { slotName, activity } = editingActivity;
    const pageType = activity.type as 'upskill' | 'deepwork' | 'branding';
    
    let logsUpdater: React.Dispatch<React.SetStateAction<DatedWorkout[]>>;
    let definitionSource: ExerciseDefinition[];
    let logSource: DatedWorkout[];

    if (pageType === 'upskill') {
      logsUpdater = setAllUpskillLogs;
      definitionSource = upskillDefinitions;
      logSource = allUpskillLogs;
    } else if (pageType === 'deepwork') {
      logsUpdater = setAllDeepWorkLogs;
      definitionSource = deepWorkDefinitions;
      logSource = allDeepWorkLogs;
    } else { // branding
      logsUpdater = setAllBrandingLogs;
      definitionSource = deepWorkDefinitions.filter(def => Array.isArray(def.focusAreaIds));
      logSource = brandingLogs;
    }
    
    // Get the state of the log for the selected day BEFORE any updates.
    const logForDay = logSource.find(log => log.date === selectedDateKey);
    const existingDefIdsForDay = new Set(logForDay?.exercises.map(ex => ex.definitionId) || []);

    // Determine which of the selected definitions need a new exercise instance created.
    const defIdsToCreate = finalSelectedDefIds.filter(id => !existingDefIdsForDay.has(id));

    const newExercises: WorkoutExercise[] = defIdsToCreate.map((defId) => {
      const def = definitionSource.find(d => d.id === defId)!;
      return {
        id: `${def.id}-${Date.now()}-${Math.random()}`,
        definitionId: def.id,
        name: def.name,
        category: def.category,
        loggedSets: [],
        targetSets: 1,
        targetReps: pageType === 'branding' ? '4 stages' : '25',
      };
    });

    // Construct the final state of the exercises for the day's log.
    const finalExercisesForDay = [...(logForDay?.exercises || []), ...newExercises];
    const updatedLogForDay: DatedWorkout = { id: selectedDateKey, date: selectedDateKey, exercises: finalExercisesForDay };
    
    // Update the main logs state.
    logsUpdater(prevLogs => {
      const logIndex = prevLogs.findIndex(log => log.date === selectedDateKey);
      if (logIndex > -1) {
        const newLogs = [...prevLogs];
        newLogs[logIndex] = updatedLogForDay;
        return newLogs;
      }
      return [...prevLogs, updatedLogForDay];
    });

    // Now, using the final computed state, update the schedule.
    const finalInstanceIds = updatedLogForDay.exercises
      .filter(ex => finalSelectedDefIds.includes(ex.definitionId))
      .map(t => t.id);

    const newDetails = updatedLogForDay.exercises
      .filter(ex => finalInstanceIds.includes(ex.id))
      .map(t => t.name).join(', ') || (pageType === 'upskill' ? 'Learning Session' : pageType === 'deepwork' ? 'Deep Work Session' : 'Branding Session');
    
    setSchedule(prev => {
      const newSchedule = { ...prev };
      const daySchedule = { ...(newSchedule[selectedDateKey] || {}) };
      const activitiesInSlot = (daySchedule[slotName] || []).map(act =>
        act.id === activity.id ? { ...act, taskIds: finalInstanceIds, details: newDetails } : act
      );
      daySchedule[slotName] = activitiesInSlot;
      newSchedule[selectedDateKey] = daySchedule;
      return newSchedule;
    });

    setEditingActivity(null);
  };

  const selectedDaySchedule = schedule[selectedDateKey] || {};

  const dailyStats = useMemo(() => {
    const todaysActivities = schedule[todayKey] || {};
    const completedActivities = Object.values(todaysActivities).flat().filter(activity => activity && activity.completed);
    const healthDone = completedActivities.some(act => act.type === 'workout');
    const wealthDone = completedActivities.some(act => act.type === 'deepwork');
    const growthDone = completedActivities.some(act => act.type === 'upskill');
    const planningDone = completedActivities.some(act => act.type === 'planning');
    const trackingDone = completedActivities.some(act => act.type === 'tracking');
    return { health: healthDone, wealth: wealthDone, growth: growthDone, direction: planningDone && trackingDone };
  }, [schedule, todayKey]);

  const consistencyData = useMemo(() => {
    if (!allWorkoutLogs || !oneYearAgo || !today) return [];
    const workoutDates = new Set(allWorkoutLogs.filter(log => log.exercises.some(ex => ex.loggedSets.length > 0)).map(log => log.date));
    const data: { date: string; fullDate: string; score: number }[] = [];
    let score = 0.5;
    for (let d = new Date(oneYearAgo); d <= today; d = addDays(d, 1)) {
        const dateKey = format(d, 'yyyy-MM-dd');
        if (workoutDates.has(dateKey)) { score += (1 - score) * 0.1; } else { score *= 0.95; }
        data.push({ date: format(d, 'MMM dd'), fullDate: format(d, 'PPP'), score: Math.round(score * 100) });
    }
    return data;
  }, [allWorkoutLogs, oneYearAgo, today]);

  const productivityStats = useMemo(() => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const getDailyDuration = (logs: DatedWorkout[], dateStr: string, durationField: 'reps' | 'weight') => {
          if (!logs) return 0;
          const logForDay = logs.find(log => log.date === dateStr);
          if (!logForDay) return 0;
          return logForDay.exercises.reduce((total, ex) => total + ex.loggedSets.reduce((sum, set) => sum + (set[durationField] || 0), 0), 0);
      };
      const calculateChange = (todayVal: number, yesterdayVal: number) => {
          if (yesterdayVal === 0) return todayVal > 0 ? 100 : 0;
          return ((todayVal - yesterdayVal) / yesterdayVal) * 100;
      };
      const calculateAverageDuration = (logs: DatedWorkout[], durationField: 'reps' | 'weight', excludeToday: boolean = false) => {
          if (!logs) return 0;
          const dailyDurations: Record<string, number> = {};
          logs.forEach(log => {
              if (excludeToday && log.date === todayStr) return;
              const duration = log.exercises.reduce((total, ex) => total + ex.loggedSets.reduce((sum, set) => sum + (set[durationField] || 0), 0), 0);
              if (duration > 0) { dailyDurations[log.date] = (dailyDurations[log.date] || 0) + duration; }
          });
          const daysWithActivity = Object.keys(dailyDurations).length;
          if (daysWithActivity === 0) return 0;
          const totalDuration = Object.values(dailyDurations).reduce((sum, d) => sum + d, 0);
          return totalDuration / daysWithActivity;
      };

      const calculateTotalLoggedMinutesForFocusArea = (focusAreaDef: ExerciseDefinition | undefined) => {
        let totalMinutes = 0;
        if (!focusAreaDef) return 0;
    
        const allDeepWorkDefIdsToSum = new Set<string>([focusAreaDef.id, ...(focusAreaDef.linkedDeepWorkIds || [])]);
        const allUpskillDefIdsToSum = new Set<string>(focusAreaDef.linkedUpskillIds || []);
    
        if (allDeepWorkLogs) {
            allDeepWorkLogs.forEach(log => {
                log.exercises.forEach(ex => {
                    if (allDeepWorkDefIds.has(ex.definitionId)) {
                        ex.loggedSets.forEach(set => {
                            totalMinutes += set.weight;
                        });
                    }
                });
            });
        }
    
        if (allUpskillLogs) {
            allUpskillLogs.forEach(log => {
                log.exercises.forEach(ex => {
                    if (allUpskillDefIds.has(ex.definitionId)) {
                        ex.loggedSets.forEach(set => {
                            totalMinutes += set.reps;
                        });
                    }
                });
            });
        }
        return totalMinutes;
      };

      const calculateLearningStats = (logs: DatedWorkout[], goals: typeof topicGoals) => {
          const topicStats: Record<string, any> = {};
          const topicData: Record<string, { totalDuration: number; logs: { date: Date; progress: number }[] }> = {};
          logs.forEach(log => {
              log.exercises.forEach(ex => {
                  if (goals[ex.category]) {
                      if (!topicData[ex.category]) topicData[ex.category] = { totalDuration: 0, logs: [] };
                      const dailyProgress = ex.loggedSets.reduce((sum, set) => sum + set.weight, 0);
                      const dailyDuration = ex.loggedSets.reduce((sum, set) => sum + set.reps, 0);
                      if (dailyProgress > 0) topicData[ex.category].logs.push({ date: parseISO(log.date), progress: dailyProgress });
                      topicData[ex.category].totalDuration += dailyDuration;
                  }
              });
          });
          Object.keys(topicData).forEach(topic => {
              const data = topicData[topic]; const goal = goals[topic]; if (!goal || data.logs.length === 0) return;
              const totalProgress = data.logs.reduce((sum, log) => sum + log.progress, 0);
              const remainingProgress = Math.max(0, goal.goalValue - totalProgress);
              const sortedLogs = data.logs.sort((a,b) => a.date.getTime() - b.date.getTime());
              const firstDay = sortedLogs[0].date;
              const durationInDays = differenceInDays(new Date(), firstDay) + 1;
              const averageRatePerDay = durationInDays > 0 ? totalProgress / durationInDays : 0;
              const todaysProgress = logs.find(log => log.date === todayStr)?.exercises.filter(ex => ex.category === topic).reduce((total, ex) => total + ex.loggedSets.reduce((sum, set) => sum + set.weight, 0), 0) || 0;
              const speed = data.totalDuration > 0 ? (totalProgress / data.totalDuration) * 60 : 0; // units per hour
              let completionStats = null;
              if (averageRatePerDay > 0.01 && remainingProgress > 0) {
                  const daysToCompletion = Math.ceil(remainingProgress / averageRatePerDay);
                  completionStats = { date: format(addDays(new Date(), daysToCompletion), 'PPP'), daysRemaining: daysToCompletion, timeNeeded: (remainingProgress / (speed / 60)) || null };
              }
              let milestoneStats = null;
              const milestones = [0.25, 0.50, 0.75, 1.0].map(m => m * goal.goalValue);
              for (let i = 0; i < milestones.length; i++) {
                  if (totalProgress < milestones[i]) {
                      const progressToMilestone = milestones[i] - totalProgress;
                      const daysToMilestone = Math.ceil(progressToMilestone / averageRatePerDay);
                      const unitType = goal.goalType.endsWith('s') && progressToMilestone === 1 ? goal.goalType.slice(0, -1) : goal.goalType;
                      milestoneStats = {
                          percent: (i + 1) * 25, date: format(addDays(new Date(), daysToMilestone), 'PPP'), daysRemaining: daysToMilestone,
                          progressNeeded: Math.round(progressToMilestone), unit: unitType, timeNeeded: (progressToMilestone / (speed / 60)) || null,
                      };
                      break;
                  }
              }
              let requiredDailyRate = (milestoneStats?.progressNeeded || remainingProgress) / (milestoneStats?.daysRemaining || 1);
              const remainingForToday = Math.max(0, requiredDailyRate - todaysProgress);
              topicStats[topic] = {
                  topic, speed, unit: `${goal.goalType}/hr`, totalProgress: Math.round(totalProgress), remainingProgress: Math.round(remainingProgress),
                  goalValue: goal.goalValue, completion: completionStats, nextMilestone: milestoneStats, requiredDailyRate, todaysProgress,
                  timeForTodaysProgress: (todaysProgress / (speed / 60)) || null, progressUnit: goal.goalType, remainingForToday: parseFloat(remainingForToday.toFixed(1)),
              };
          });
          return topicStats;
      };
      
      const calculateBrandingStatus = () => {
          if (!deepWorkDefinitions || !brandingLogs) {
              return { status: 'pending' as const, message: 'Loading branding status...', items: [] };
          }
          
          const allBundles = deepWorkDefinitions.filter(def => def.category === "Content Bundle");
          const isFullyShared = (task: ExerciseDefinition) => task.sharingStatus && task.sharingStatus.twitter && task.sharingStatus.linkedin && task.sharingStatus.devto;
          
          const activeBundles = allBundles.filter(task => !isFullyShared(task));

          if (activeBundles.length > 0) {
              return {
                  status: 'in_progress' as const,
                  items: activeBundles.map(nextTask => {
                    const logForTask = brandingLogs.flatMap(log => log.exercises).find(ex => ex.definitionId === nextTask.id);
                    const loggedStagesCount = logForTask?.loggedSets.length || 0;
                    const stages = ['Create', 'Optimize', 'Review', 'Final Review'];
                    return {
                      taskName: nextTask.name,
                      stage: loggedStagesCount < 4 ? stages[loggedStagesCount] : 'Ready to Share',
                      progress: `${loggedStagesCount}/4`
                    }
                  })
              };
          }
          
          const readyForBrandingCount = deepWorkDefinitions.filter(def => def.isReadyForBranding && !Array.isArray(def.focusAreaIds)).length;

          if (readyForBrandingCount > 0) {
              return {
                  status: 'pending' as const,
                  message: `You have ${readyForBrandingCount} focus area(s) ready.`,
                  subMessage: "Go to Personal Branding to create a content bundle.",
                  items: [] 
              };
          }

          return {
              status: 'pending' as const,
              message: "No content bundles in the pipeline.",
              subMessage: "Go to Deep Work to mark focus areas as 'Ready for Branding'.",
              items: []
          };
      };

      const totalProductiveMinutes = calculateAverageDuration(allUpskillLogs, 'reps') + calculateAverageDuration(allDeepWorkLogs, 'weight');
      const avgProductiveHours = totalProductiveMinutes / 60;

      const getUpcomingReleases = () => {
        if (!productizationPlans && !offerizationPlans) return [];
    
        const allReleasesWithDetails: { topic: string, release: Release, type: 'product' | 'service' }[] = [];
    
        const processPlan = (plan: ProductizationPlan, topic: string, type: 'product' | 'service') => {
            if (plan.releases) {
                plan.releases.forEach(release => {
                    const featureNames = (release.focusAreaIds || [])
                        .map(id => deepWorkDefinitions.find(def => def.id === id)?.name)
                        .filter((name): name is string => !!name);
                    
                    let totalLoggedMinutesForRelease = 0;
                    let totalEstimatedDurationForRelease = 0;
                    
                    (release.focusAreaIds || []).forEach(id => {
                        const focusAreaDef = deepWorkDefinitions.find(def => def.id === id);
                        if (focusAreaDef) {
                            totalLoggedMinutesForRelease += calculateTotalLoggedMinutesForFocusArea(focusAreaDef);
                            totalEstimatedDurationForRelease += focusAreaDef.estimatedDuration || 0;
                        }
                    });

                    allReleasesWithDetails.push({ 
                        topic, 
                        release: { 
                            ...release, 
                            features: featureNames,
                            totalLoggedHours: totalLoggedMinutesForRelease / 60,
                            totalEstimatedHours: totalEstimatedDurationForRelease / 60
                        }, 
                        type 
                    });
                });
            }
        };
    
        if (productizationPlans) {
            Object.entries(productizationPlans).forEach(([topic, plan]) => {
                processPlan(plan, topic, 'product');
            });
        }
        if (offerizationPlans) {
            Object.entries(offerizationPlans).forEach(([topic, plan]) => {
                processPlan(plan, topic, 'service');
            });
        }
    
        const today = new Date();
        today.setHours(0, 0, 0, 0);
    
        return allReleasesWithDetails
            .filter(({ release }) => {
                try { return parseISO(release.launchDate) >= today; } 
                catch (e) { return false; }
            })
            .map(item => {
                const { release, topic, type } = item;
                const launchDate = parseISO(release.launchDate);
                const daysRemaining = differenceInDays(launchDate, today);
                const availableHours = daysRemaining * avgProductiveHours;
                const totalAvailableHours = daysRemaining * 24;

                return {
                    topic,
                    type,
                    release: {
                        ...release,
                        daysRemaining,
                        availableHours,
                        totalAvailableHours,
                    }
                };
            })
            .sort((a, b) => new Date(a.release.launchDate).getTime() - new Date(b.release.launchDate).getTime());
      };

      const learningStats = calculateLearningStats(allUpskillLogs, topicGoals);
      
      const getHours = (logs: DatedWorkout[], field: 'reps' | 'weight') => logs.reduce((total, log) => total + log.exercises.reduce((exTotal, ex) => exTotal + ex.loggedSets.reduce((setTotal, set) => setTotal + (field === 'reps' ? set.reps : set.weight), 0), 0), 0) / 60;
      const totalHoursData = [
          { name: 'Learning', hours: parseFloat(getHours(allUpskillLogs, 'reps').toFixed(1)) },
          { name: 'Deep Work', hours: parseFloat(getHours(allDeepWorkLogs, 'weight').toFixed(1)) },
          { name: 'Workout', hours: new Set(allWorkoutLogs.filter(log => log.exercises.some(ex => ex.loggedSets.length > 0)).map(log => log.date)).size },
          { name: 'Branding', hours: parseFloat((brandingLogs.reduce((total, log) => total + log.exercises.reduce((exTotal, ex) => exTotal + ex.loggedSets.length, 0), 0) * 30 / 60).toFixed(1)) },
      ];
      const getTodayHours = (logs: DatedWorkout[], field: 'reps' | 'weight') => (logs.find(log => log.date === todayStr)?.exercises.reduce((total, ex) => total + ex.loggedSets.reduce((sum, set) => sum + (field === 'reps' ? set.reps : set.weight), 0), 0) || 0) / 60;
      const todayHoursData = [
          { name: 'Learning', hours: parseFloat(getTodayHours(allUpskillLogs, 'reps').toFixed(1)) },
          { name: 'Deep Work', hours: parseFloat(getTodayHours(allDeepWorkLogs, 'weight').toFixed(1)) },
          { name: 'Workout', hours: allWorkoutLogs.some(log => log.date === todayStr && log.exercises.some(ex => ex.loggedSets.length > 0)) ? 1 : 0 },
          { name: 'Branding', hours: (brandingLogs.find(log => log.date === todayStr)?.exercises.reduce((total, ex) => total + ex.loggedSets.length, 0) || 0) * 0.5 },
      ];
      const todayDeepWork = getDailyDuration(allDeepWorkLogs, todayStr, 'weight');
      const yesterdayDeepWork = getDailyDuration(allDeepWorkLogs, format(addDays(new Date(), -1), 'yyyy-MM-dd'), 'weight');
      const todayUpskill = getDailyDuration(allUpskillLogs, todayStr, 'reps');
      const yesterdayUpskill = getDailyDuration(allUpskillLogs, format(addDays(new Date(), -1), 'yyyy-MM-dd'), 'reps');
      
      const yesterdayTotalProductiveMinutes = calculateAverageDuration(allUpskillLogs, 'reps', true) + calculateAverageDuration(allDeepWorkLogs, 'weight', true);

      return {
          todayDeepWorkHours: todayDeepWork / 60, deepWorkChange: calculateChange(todayDeepWork, yesterdayDeepWork),
          todayUpskillHours: todayUpskill / 60, upskillChange: calculateChange(todayUpskill, yesterdayUpskill),
          consistencyChange: (consistencyData[consistencyData.length - 1]?.score || 0) - (consistencyData[consistencyData.length - 2]?.score || 0),
          totalProductiveHours: avgProductiveHours,
          avgProductiveHoursChange: calculateChange(avgProductiveHours, yesterdayTotalProductiveMinutes / 60),
          currentLevel: productivityLevels.find(l => totalProductiveMinutes >= l.min && totalProductiveMinutes < l.max) || null,
          learningStats: learningStats,
          latestConsistency: consistencyData[consistencyData.length - 1]?.score || 0,
          brandingStatus: calculateBrandingStatus(),
          totalHoursData, todayHoursData,
          upcomingReleases: getUpcomingReleases(),
      };
  }, [allUpskillLogs, allDeepWorkLogs, topicGoals, allWorkoutLogs, oneYearAgo, today, consistencyData, brandingLogs, deepWorkDefinitions, productizationPlans, offerizationPlans]);
    
  const _activityDurations = useMemo(() => {
    const durations: Record<string, string> = {};
    const daySchedule = schedule[selectedDateKey];
    if (!daySchedule) return durations;

    for (const slotName in daySchedule) {
        const activitiesInSlot = daySchedule[slotName] || [];
        const totalActivitiesInSlot = activitiesInSlot.length;

        for (const activity of activitiesInSlot) {
            switch (activity.type) {
                case 'workout':
                    durations[activity.id] = '1h 30m';
                    break;
                case 'planning':
                case 'tracking':
                    durations[activity.id] = '30m';
                    break;
                case 'deepwork':
                case 'branding':
                    durations[activity.id] = totalActivitiesInSlot === 1 ? '4h' : '2h';
                    break;
                case 'lead-generation':
                    durations[activity.id] = '45m';
                    break;
                case 'upskill':
                    durations[activity.id] = '30m';
                    break;
            }
        }
    }
    return durations;
}, [schedule, selectedDateKey]);

  // Push calculated durations to the global context
  useEffect(() => {
    setActivityDurations(_activityDurations);
  }, [_activityDurations, setActivityDurations]);

  const handleLogWeight = (weight: number, date: Date) => {
    if (!currentUser || isNaN(weight) || weight <= 0) {
      toast({ title: "Invalid Input", description: "Please enter a valid weight.", variant: "destructive" });
      return;
    }
    const year = getISOWeekYear(date);
    const week = getISOWeek(date).toString().padStart(2, '0');
    const weekKey = `${year}-W${week}`;

    setWeightLogs(prevLogs => {
        const logIndex = prevLogs.findIndex(log => log.date === weekKey);
        const newLog: WeightLog = { date: weekKey, weight: weight };
        
        if (logIndex > -1) {
            const updatedLogs = [...prevLogs];
            updatedLogs[logIndex] = newLog;
            return updatedLogs;
        } else {
            return [...prevLogs, newLog].sort((a,b) => a.date.localeCompare(b.date));
        }
    });

    toast({ title: "Weight Logged", description: `Weight for the week of ${format(date, 'PPP')} has been saved as ${weight} kg/lb.` });
  };

  const handleSetGoalWeight = (goal: number | null) => {
    if (!currentUser?.username) {
        toast({ title: "Error", description: "You must be logged in to set a goal.", variant: "destructive" });
        return;
    }
    if (goal === null || (!isNaN(goal) && goal > 0)) {
        setGoalWeight(goal);
        if(goal !== null) toast({ title: "Goal Set!", description: `Your new goal weight is ${goal} kg/lb.` });
    } else {
        toast({ title: "Invalid Input", description: "Please enter a valid goal weight.", variant: "destructive" });
    }
  };

  const handleSetHeight = (h: number | null) => {
    if (!currentUser?.username) {
        toast({ title: "Error", description: "You must be logged in to set your height.", variant: "destructive" });
        return;
    }
    if (h === null || (!isNaN(h) && h > 0)) {
        setHeight(h);
        if (h !== null) toast({ title: "Height Set!", description: `Your height has been saved as ${h} cm.` });
    } else {
        toast({ title: "Invalid Input", description: "Please enter a valid height.", variant: "destructive" });
    }
  };

  const handleSetDateOfBirth = (dob: string | null) => {
    if (!currentUser?.username) {
        toast({ title: "Error", description: "You must be logged in to set your date of birth.", variant: "destructive" });
        return;
    }
    setDateOfBirth(dob);
    if(dob) toast({ title: "Date of Birth Set", description: `Your DoB has been saved.` });
  };

  const handleSetGender = (g: Gender | null) => {
    if (!currentUser?.username) {
        toast({ title: "Error", description: "You must be logged in to set your gender.", variant: "destructive" });
        return;
    }
    setGender(g);
    if(g) toast({ title: "Gender Set!", description: `Your gender has been saved.` });
  };

  // MODAL HANDLERS
  const handleDietModalOpenChange = (isOpen: boolean) => {
      setIsDietPlanModalOpen(isOpen);
  };
  
  const learningModalProps = useMemo(() => {
    if (!editingActivity) {
      return { availableTasks: [], initialSelectedIds: [], pageType: 'upskill' as const, disabledTaskIds: [], upskillDefinitions: [] };
    }

    const { activity } = editingActivity;
    const pageType = activity.type as 'upskill' | 'deepwork' | 'branding';

    let logSource: DatedWorkout[];
    let definitionSource: ExerciseDefinition[];

    if (pageType === 'upskill') {
      logSource = allUpskillLogs;
      definitionSource = upskillDefinitions;
    } else if (pageType === 'deepwork') {
      logSource = allDeepWorkLogs;
      definitionSource = deepWorkDefinitions;
    } else { // branding
      logSource = brandingLogs;
      definitionSource = deepWorkDefinitions.filter(def => Array.isArray(def.focusAreaIds));
    }
    
    // These are the WorkoutExercise objects already created for the selected day.
    const allTasksForDay = logSource.find(log => log.date === selectedDateKey)?.exercises || [];
    const definitionIdsForDay = new Set(allTasksForDay.map(task => task.definitionId));

    // These are definitions from the library that have NOT been added to the selected day's log at all.
    const libraryDefinitions = definitionSource.filter(def => !definitionIdsForDay.has(def.id));

    // Convert library definitions to temporary WorkoutExercise objects for the modal.
    const libraryTasks = libraryDefinitions.map(def => ({
        id: `lib-${def.id}-${Math.random()}`,
        definitionId: def.id,
        name: def.name,
        category: def.category,
        loggedSets: [], targetSets: 0, targetReps: ''
    }));

    const availableTasks = [...allTasksForDay, ...libraryTasks];
    
    const initialSelectedDefIds = new Set<string>();
    (activity.taskIds || []).forEach(taskId => {
        const task = allTasksForDay.find(t => t.id === taskId);
        if (task) {
            initialSelectedDefIds.add(task.definitionId);
        }
    });
    const initialSelectedIds = Array.from(initialSelectedDefIds);
    
    const todaysActivitiesForType = Object.values(schedule[selectedDateKey] || {}).flat();
    const disabledDefIds = new Set<string>();
    todaysActivitiesForType.forEach(act => {
        if (act && act.type === pageType && act.id !== activity.id && act.taskIds) {
            (act.taskIds || []).forEach(taskId => {
                const task = allTasksForDay.find(t => t.id === taskId);
                if (task) {
                    disabledDefIds.add(task.definitionId);
                }
            });
        }
    });
    const disabledTaskIds = Array.from(disabledDefIds);

    return { 
        availableTasks, 
        initialSelectedIds, 
        pageType, 
        disabledTaskIds, 
        upskillDefinitions,
    };

}, [editingActivity, allUpskillLogs, allDeepWorkLogs, brandingLogs, selectedDateKey, schedule, upskillDefinitions, deepWorkDefinitions]);

  const timeAllocationData = useMemo(() => {
    if (!productivityStats.todayHoursData) return [];
    const dailyTime = productivityStats.todayHoursData.reduce((sum, d) => sum + d.hours, 0);
    return [
      { name: 'Productive', time: dailyTime, fill: 'hsl(var(--primary))' },
      { name: 'Ideal', time: 12, fill: 'hsl(var(--chart-2))' },
      { name: 'Autopilot', time: Math.max(0, 24 - dailyTime), fill: 'hsl(var(--border))' },
    ];
  }, [productivityStats.todayHoursData]);

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Card className="max-w-5xl mx-auto shadow-lg bg-card/60 border-border/20 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between text-center py-4">
              <div className="flex-grow">
                <p className="text-sm text-muted-foreground">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
              </div>
              <Popover>
                  <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-[150px] justify-start text-left font-normal h-9",!selectedDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "MMM d") : <span>Pick a date</span>}
                  </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
                  </PopoverContent>
              </Popover>
          </CardHeader>
          <CardContent>
            <DashboardStats stats={productivityStats} />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
              <div className="lg:col-span-3">
                <ProductivitySnapshot 
                  stats={productivityStats} 
                  timeAllocationData={timeAllocationData} 
                  onOpenStatsModal={() => setIsStatsModalOpen(true)} 
                  onOpenMindMapModal={() => setIsMindMapModalOpen(true)}
                  onOpenKanbanModal={() => setIsKanbanModalOpen(true)}
                />
              </div>
              <div className="lg:col-span-2 space-y-6">
                 {currentUser && isAgendaDocked && (
                    <TodaysScheduleCard
                        schedule={schedule}
                        date={selectedDate}
                        activityDurations={_activityDurations}
                        isAgendaDocked={isAgendaDocked}
                        onToggleDock={() => setIsAgendaDocked(prev => !prev)}
                        onLogLearning={(...args) => handleLogLearning(selectedDateKey, ...args)}
                        onStartWorkoutLog={handleStartWorkoutLog}
                        onStartLeadGenLog={handleStartLeadGenLog}
                        onToggleComplete={(...args) => handleToggleComplete(selectedDateKey, ...args)}
                    />
                )}
                <WeightGoalCard 
                  weightLogs={weightLogs}
                  goalWeight={goalWeight}
                  onLogWeight={handleLogWeight}
                  height={height}
                  dateOfBirth={dateOfBirth}
                  gender={gender}
                  onSetHeight={setHeight}
                  onSetDateOfBirth={setDateOfBirth}
                  onSetGender={setGender}
                  onSetGoalWeight={setGoalWeight}
                  dietPlan={dietPlan}
                  onEditDietClick={() => setIsDietPlanModalOpen(true)}
                  deepWorkDefinitions={deepWorkDefinitions}
                  upskillDefinitions={upskillDefinitions}
                />
              </div>
            </div>
            <TimeSlots 
              schedule={selectedDaySchedule}
              currentSlot={currentSlot}
              remainingTime={remainingTime}
              onAddActivity={handleAddActivity}
              onRemoveActivity={handleRemoveActivity}
              onToggleComplete={(...args) => handleToggleComplete(selectedDateKey, ...args)}
              onActivityClick={handleActivityClick}
            />
          </CardContent>
        </Card>
        
        <ActivityHeatmap schedule={schedule} onDateSelect={(date) => setSelectedDate(parseISO(date))} />

        {currentUser && !isAgendaDocked && (
            <TodaysScheduleCard
                schedule={schedule}
                date={selectedDate}
                activityDurations={_activityDurations}
                isAgendaDocked={isAgendaDocked}
                onToggleDock={() => setIsAgendaDocked(prev => !prev)}
                onLogLearning={(...args) => handleLogLearning(selectedDateKey, ...args)}
                onStartWorkoutLog={handleStartWorkoutLog}
                onStartLeadGenLog={handleStartLeadGenLog}
                onToggleComplete={(...args) => handleToggleComplete(selectedDateKey, ...args)}
            />
        )}

        {currentUser && (
          <TodaysWorkoutModal
              isOpen={isTodaysWorkoutModalOpen}
              onOpenChange={setIsTodaysWorkoutModalOpen}
              activityToLog={workoutActivityToLog}
              todaysExercises={todaysExercises}
              muscleGroupsForDay={todaysMuscleGroups}
              onActivityComplete={(...args) => handleToggleComplete(selectedDateKey, ...args)}
          />
        )}

        {currentUser && (
            <TodaysLeadGenModal
                isOpen={isLeadGenModalOpen}
                onOpenChange={setIsLeadGenModalOpen}
                activityToLog={workoutActivityToLog}
                onActivityComplete={(...args) => handleToggleComplete(selectedDateKey, ...args)}
            />
        )}
        
        {currentUser && editingActivity && (
          <TodaysLearningModal
              isOpen={isLearningModalOpen}
              onOpenChange={(isOpen) => {
                  if (!isOpen) setEditingActivity(null);
                  setIsLearningModalOpen(isOpen);
              }}
              availableTasks={learningModalProps.availableTasks}
              initialSelectedIds={learningModalProps.initialSelectedIds}
              onSave={handleSaveTaskSelection}
              pageType={learningModalProps.pageType}
              disabledTaskIds={learningModalProps.disabledTaskIds}
              deepWorkDefinitions={deepWorkDefinitions}
              upskillDefinitions={learningModalProps.upskillDefinitions}
              setDeepWorkDefinitions={setDeepWorkDefinitions}
          />
        )}

        <DietPlanModal
          isOpen={isDietPlanModalOpen}
          onOpenChange={handleDietModalOpenChange}
        />

        <StatsOverviewModal
          isOpen={isStatsModalOpen}
          onOpenChange={setIsStatsModalOpen}
          allWorkoutLogs={allWorkoutLogs}
          allUpskillLogs={allUpskillLogs}
          allDeepWorkLogs={allDeepWorkLogs}
          weightLogs={weightLogs}
          goalWeight={goalWeight}
          consistencyData={consistencyData}
          totalHoursData={productivityStats.totalHoursData}
          todayHoursData={productivityStats.todayHoursData}
        />

        <Dialog open={isMindMapModalOpen} onOpenChange={setIsMindMapModalOpen}>
            <DialogContent className="max-w-7xl h-[90vh] p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Strategic Mind Map</DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                  <MindMapViewer />
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={isKanbanModalOpen} onOpenChange={setIsKanbanModalOpen}>
          <DialogContent className="max-w-7xl h-[80vh] flex flex-col p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Task Board</DialogTitle>
              <DialogDescription>A Kanban-style view of all your tasks for today.</DialogDescription>
            </DialogHeader>
            <div className="flex-grow min-h-0">
                <KanbanPageContent isModal={true} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

export default function Page() {
    return <AuthGuard><HomePageContent/></AuthGuard>
}
