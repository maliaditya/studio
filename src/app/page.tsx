
"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { format, getDay, getISOWeek, differenceInDays, addDays, parseISO, subYears, differenceInYears, addWeeks, startOfISOWeek, setISOWeek, getISOWeekYear } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';

import { TodaysWorkoutModal } from '@/components/TodaysWorkoutModal';
import { TodaysLearningModal } from '@/components/TodaysLearningModal';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { DietPlanModal } from '@/components/DietPlanModal';
import { StatsOverviewModal } from '@/components/StatsOverviewModal';
import { DashboardStats } from '@/components/DashboardStats';
import { ProductivitySnapshot } from '@/components/ProductivitySnapshot';
import { TimeSlots } from '@/components/TimeSlots';
import { WeightGoalCard } from '@/components/WeightGoalCard';
import { TodaysScheduleCard } from '@/components/TodaysScheduleCard';

import type { AllWorkoutPlans, ExerciseDefinition, WorkoutMode, WorkoutExercise, FullSchedule, Activity as ActivityType, DatedWorkout, TopicGoal, WorkoutPlan, ExerciseCategory, WeightLog, Gender, UserDietPlan, DailySchedule, Activity } from '@/types/workout';
import { getExercisesForDay } from '@/lib/workoutUtils';

const slotEndHours: Record<string, number> = {
  'Late Night': 4, 'Dawn': 8, 'Morning': 12, 'Afternoon': 16, 'Evening': 20, 'Night': 24,
};

const slotTimeRanges: Record<string, string> = {
  'Late Night': '12 AM - 4 AM',
  'Dawn': '4 AM - 8 AM',
  'Morning': '8 AM - 12 PM',
  'Afternoon': '12 PM - 4 PM',
  'Evening': '4 PM - 8 PM',
  'Night': '8 PM - 12 AM',
};

const dailyMuscleGroups: Record<number, string[]> = {
  1: ["Chest", "Triceps"], 2: ["Back", "Biceps"], 3: ["Shoulders", "Legs"],
  4: ["Chest", "Triceps"], 5: ["Back", "Biceps"], 6: ["Shoulders", "Legs"], 0: [],
};
const singleMuscleDailySchedule: Record<number, ExerciseCategory | null> = {
    1: "Chest", 2: "Triceps", 3: "Back", 4: "Biceps", 5: "Shoulders", 6: "Legs", 0: null,
};

const INITIAL_PLANS: AllWorkoutPlans = {
    "W1": { "Chest": ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine"], "Triceps": ["Close-Grip Barbell Bench Press", "Overhead Dumbbell Extension", "Dumbbell Kickback", "Rope Pushdown"], "Back": ["Lat Pulldown", "Machine Row", "T-Bar Row", "Lat Prayer Pull"], "Biceps": ["Standing dumbbell curls", "Standing Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)"], "Shoulders": ["Seated Dumbbell Shoulder Press", "Standing Dumbbell Lateral Raise", "Face Pulls", "Shrugs"], "Legs": ["Walking Lunges (Barbell)", "Leg Press", "Quads Machine", "Hamstring machine"] },
    "W2": { "Chest": ["Dumbbell Flat Press", "Incline Dumbbell Press", "Decline Dumbbell Press", "Cable Fly"], "Triceps": ["Overhead Dumbbell Extension", "Overhead Bar extension", "Rope Pushdown", "Dumbbell Kickback"], "Back": ["Lat Pulldown (Wide Grip)", "V handle lat pulldown", "1-Arm Dumbbell Row", "Back extensions"], "Biceps": ["Seated Incline Dumbbell Curl", "Seated Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Reverse Cable"], "Shoulders": ["Seated Dumbbell Shoulder Press", "Seated Dumbbell Lateral Raise", "Rear Delt Fly (Incline Bench)", "Cable Upright Rows"], "Legs": ["Walking Lunges (Barbell)", "Squats (Barbell)", "hamstring machine", "Quads Machine"] },
    "W3": { "Chest": ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine"], "Triceps": ["Overhead Cable Extension", "Straight bar pushdown", "Reverse Bar Pushdown", "Back dips"], "Back": ["Lat Pulldown", "Barbell Row", "Seated Row", "Lat Prayer Pull"], "Biceps": ["Strict bar curls", "Reversed Incline curls", "Cable Curls Superset", "Reversed cable curls"], "Shoulders": ["Seated Dumbbell Shoulder Press", "Dumbbell Lateral Raise (Lean in)", "Face Pulls", "Shrugs"], "Legs": ["Leg Press", "Quads Machine", "Hamstring machine", "Calfs (Bodyweight)"] },
    "W4": { "Chest": ["Dumbbell Flat Press", "Incline Dumbbell Press", "Dumbbell Pullovers", "Cable Fly"], "Triceps": ["Overhead Cable Extension", "Straight bar pushdown", "Reverse Bar Pushdown", "Back dips"], "Back": ["Lat Pulldown", "1-Arm Dumbbell Row", "V handle lat pulldown", "DeadLifts"], "Biceps": ["Seated Machine Curls", "Cable Curls", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)"], "Shoulders": ["Seated Dumbbell Shoulder Press", "Lean-Away Cable Lateral Raise", "Face Pulls", "Front Raise cable"], "Legs": ["Walking Lunges (Barbell)", "Squats (Barbell)", "hamstring machine", "Quads Machine"] },
    "W5": { "Chest": ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine", "Cable Fly", "Dumbbell Pullovers"], "Triceps": ["Close-Grip Barbell Bench Press", "Overhead Dumbbell Extension", "Dumbbell Kickback", "Straight bar pushdown", "Reverse Bar Pushdown", "Back dips"], "Back": ["Lat Pulldown", "Machine Row", "T-Bar Row", "Lat Prayer Pull", "1-Arm Dumbbell Row", "DeadLifts"], "Biceps": ["Standing dumbbell curls", "Standing Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)", "Reversed cable curls", "Reversed Incline curls"], "Shoulders": ["Seated Dumbbell Shoulder Press", "Standing Dumbbell Lateral Raise", "Face Pulls", "Cable Upright Rows", "Front Raise Dumbbells", "Shrugs"], "Legs": ["Squats (Barbell)", "Leg Press", "Quads Machine", "Hamstring machine", "Walking Lunges (Barbell)", "Calfs (Bodyweight)"] },
    "W6": { "Chest": ["Dumbbell Flat Press", "Incline Dumbbell Press", "Decline Dumbbell Press", "Peck Machine", "Flat Bench Chest Fly", "Dumbbell Pullovers"], "Triceps": ["Overhead Cable Extension", "Single Arm Dumbbell Extensions", "Rope Pushdown", "Straight bar pushdown", "Reverse Bar Pushdown", "Back dips"], "Back": ["Lat Pulldown", "1-Arm Dumbbell Row", "V handle lat pulldown", "Barbell Row", "Lat Prayer Pull", "Back extensions"], "Biceps": ["Strict bar curls", "Seated Incline Dumbbell Curl", "Seated Dumbbell Alternating Curl", "Preacher Curls Bar", "Reverse Cable", "Concentration Curl"], "Shoulders": ["Seated Dumbbell Shoulder Press", "Lean-Away Cable Lateral Raise", "Face Pulls", "Front Raise cable", "Cable Upright Rows", "Shrugs"], "Legs": ["Walking Lunges (Barbell)", "Hack Squats", "hamstring machine", "Quads Machine", "Leg Press", "Calfs (Bodyweight)"] }
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
    weightLogs, 
    setWeightLogs,
    goalWeight, 
    setGoalWeight,
    height, 
    setHeight,
    dateOfBirth, 
    setDateOfBirth,
    gender,
    setGender,
    dietPlan,
    schedule,
    setSchedule,
    allUpskillLogs,
    setAllUpskillLogs,
    allDeepWorkLogs,
    setAllDeepWorkLogs,
    allWorkoutLogs,
    setActivityDurations,
    isAgendaDocked,
    setIsAgendaDocked,
    handleToggleComplete,
    handleLogLearning,
    activityDurations,
  } = useAuth();
  const { toast } = useToast();
  const [currentSlot, setCurrentSlot] = useState('');
  const [remainingTime, setRemainingTime] = useState('');
  const [isScheduleLoaded, setIsScheduleLoaded] = useState(false);
  const [todayKey, setTodayKey] = useState('');

  // State for workout data
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>('two-muscle');
  const [workoutPlans, setWorkoutPlans] = useState<AllWorkoutPlans>(INITIAL_PLANS);
  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  
  // State for upskill and deepwork data (now using context, but some local state might be needed for modals etc)
  const [deepWorkDefinitions, setDeepWorkDefinitions] = useState<ExerciseDefinition[]>([]);
  const [upskillDefinitions, setUpskillDefinitions] = useState<ExerciseDefinition[]>([]);
  const [topicGoals, setTopicGoals] = useState<Record<string, TopicGoal>>({});

  // State for personal branding data
  const [brandingTasks, setBrandingTasks] = useState<ExerciseDefinition[]>([]);
  const [brandingLogs, setAllBrandingLogs] = useState<DatedWorkout[]>([]);

  // State for Modals
  const [isTodaysWorkoutModalOpen, setIsTodaysWorkoutModalOpen] = useState(false);
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [isDietPlanModalOpen, setIsDietPlanModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<{ slotName: string; activity: Activity } | null>(null);
  const [workoutActivityToLog, setWorkoutActivityToLog] = useState<Activity | null>(null);

  // State for Modal content
  const [todaysExercises, setTodaysExercises] = useState<WorkoutExercise[]>([]);
  const [todaysMuscleGroups, setTodaysMuscleGroups] = useState<string[]>([]);
  
  // State for productivity stats
  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setTodayKey(format(new Date(), 'yyyy-MM-dd'));
    const now = new Date();
    setToday(now);
    setOneYearAgo(subYears(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1));
  }, []);

  // Effect to load data specific to this page from local storage
  useEffect(() => {
    if (currentUser?.username) {
        const username = currentUser.username;
        const keys = {
            workout: { defs: `exerciseDefinitions_${username}`, plans: `workoutPlans_${username}`, mode: `workoutMode_${username}` },
            upskill: { defs: `upskill_definitions_${username}`, goals: `upskill_topic_goals_${username}` },
            deepwork: { defs: `deepwork_definitions_${username}` },
            branding: { tasks: `branding_tasks_${username}`, logs: `branding_logs_${username}` },
        };
        const loadItem = (key: string, isJson: boolean = true) => localStorage.getItem(key);

        setWorkoutMode((loadItem(keys.workout.mode, false) as WorkoutMode) || 'two-muscle');
        try { const d = loadItem(keys.workout.plans); setWorkoutPlans(d ? JSON.parse(d) : INITIAL_PLANS); } catch (e) { setWorkoutPlans(INITIAL_PLANS); }
        try { const d = loadItem(keys.workout.defs); setExerciseDefinitions(d ? JSON.parse(d) : []); } catch (e) { setExerciseDefinitions([]); }
        try { const d = loadItem(keys.upskill.defs); setUpskillDefinitions(d ? JSON.parse(d) : []); } catch (e) { setUpskillDefinitions([]); }
        try { const d = loadItem(keys.deepwork.defs); setDeepWorkDefinitions(d ? JSON.parse(d) : []); } catch (e) { setDeepWorkDefinitions([]); }
        try { const d = loadItem(keys.upskill.goals); setTopicGoals(d ? JSON.parse(d) : {}); } catch (e) { setTopicGoals({}); }
        try { const d = loadItem(keys.branding.tasks); setBrandingTasks(d ? JSON.parse(d) : []); } catch (e) { setBrandingTasks([]); }
        try { const d = loadItem(keys.branding.logs); setAllBrandingLogs(d ? JSON.parse(d) : []); } catch (e) { setAllBrandingLogs([]); }
    }
     setIsScheduleLoaded(true);
  }, [currentUser]);

   // Effect to save page-specific data
  useEffect(() => {
    if (!currentUser || !isScheduleLoaded) return;
    const username = currentUser.username;
    // Note: schedule, upskillLogs, deepWorkLogs are saved via context now.
    // We only save data managed locally on this page.
    localStorage.setItem(`workoutMode_${username}`, workoutMode);
    localStorage.setItem(`workoutPlans_${username}`, JSON.stringify(workoutPlans));
    localStorage.setItem(`exerciseDefinitions_${username}`, JSON.stringify(exerciseDefinitions));
    localStorage.setItem(`upskill_definitions_${username}`, JSON.stringify(upskillDefinitions));
    localStorage.setItem(`upskill_topic_goals_${username}`, JSON.stringify(topicGoals));
    localStorage.setItem(`deepwork_definitions_${username}`, JSON.stringify(deepWorkDefinitions));
    localStorage.setItem(`branding_tasks_${username}`, JSON.stringify(brandingTasks));
    localStorage.setItem(`branding_logs_${username}`, JSON.stringify(brandingLogs));

  }, [workoutMode, workoutPlans, exerciseDefinitions, upskillDefinitions, topicGoals, deepWorkDefinitions, brandingTasks, brandingLogs, currentUser, isScheduleLoaded]);

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
    const todayKey = format(today, 'yyyy-MM-dd');
    const yesterday = addDays(today, -1);
    const yesterdayKey = format(yesterday, 'yyyy-MM-dd');
    const lastCarryForwardKey = `lifeos_last_carry_forward_${currentUser.username}`;
    const lastCarryForwardDate = localStorage.getItem(lastCarryForwardKey);
    if (lastCarryForwardDate === todayKey) return;
    const todaysActivities = schedule[todayKey];
    const hasTodaysActivities = todaysActivities && Object.keys(todaysActivities).length > 0 && Object.values(todaysActivities).some(slot => slot.length > 0);
    if (hasTodaysActivities) { localStorage.setItem(lastCarryForwardKey, todayKey); return; }
    const yesterdaysSchedule = schedule[yesterdayKey];
    if (!yesterdaysSchedule || Object.keys(yesterdaysSchedule).length === 0) { localStorage.setItem(lastCarryForwardKey, todayKey); return; }
    const newTodaySchedule: DailySchedule = {};
    let carriedOver = false;
    Object.entries(yesterdaysSchedule).forEach(([slotName, activities]) => {
        if (activities && activities.length > 0) {
            newTodaySchedule[slotName] = activities.map(activity => ({ ...activity, id: `${activity.type}-${Date.now()}-${Math.random()}`, completed: false }));
            carriedOver = true;
        }
    });
    if (carriedOver) {
        setSchedule(prev => ({ ...prev, [todayKey]: newTodaySchedule }));
        toast({ title: "Activities Carried Over", description: "Yesterday's activities have been added to today's schedule." });
    }
    localStorage.setItem(lastCarryForwardKey, todayKey);
  }, [currentUser, isScheduleLoaded, schedule, setSchedule, toast]);

  const handleAddActivity = (slotName: string, type: ActivityType) => {
    if (!currentUser?.username || !todayKey) return;
    const currentActivities = schedule[todayKey]?.[slotName] || [];
    if (currentActivities.length >= 2) { toast({ title: "Slot Full", description: "You can add a maximum of two activities per slot.", variant: "destructive" }); return; }
    let details = '';
    switch (type) {
      case 'workout': { const dayOfWeek = getDay(new Date()); let muscleGroups: string[] = []; if (workoutMode === 'one-muscle') { const muscle = singleMuscleDailySchedule[dayOfWeek]; if (muscle) muscleGroups = [muscle]; } else { muscleGroups = dailyMuscleGroups[dayOfWeek] || []; } details = muscleGroups.join(' & ') || "Rest Day"; break; }
      case 'upskill': details = 'Learning Session'; break;
      case 'deepwork': details = 'Deep Work Session'; break;
      case 'planning': details = 'Planning Session'; break;
      case 'tracking': details = 'Tracking Session'; break;
      case 'branding': details = 'Branding Session'; break;
    }
    const newActivity: Activity = { 
      id: `${type}-${Date.now()}`, 
      type, 
      details, 
      completed: false,
      taskIds: [],
    };
    setSchedule(prev => ({ ...prev, [todayKey]: { ...(prev[todayKey] || {}), [slotName]: [...(prev[todayKey]?.[slotName] || []), newActivity] } }));
  };

  const handleRemoveActivity = (slotName: string, activityId: string) => {
    if (!todayKey) return;
    setSchedule(prev => {
      const newTodaySchedule = { ...(prev[todayKey] || {}) };
      const activities = newTodaySchedule[slotName] || [];
      const updatedActivities = activities.filter(act => act.id !== activityId);
      if (updatedActivities.length > 0) { newTodaySchedule[slotName] = updatedActivities; } else { delete newTodaySchedule[slotName]; }
      return { ...prev, [todayKey]: newTodaySchedule };
    });
  };

  const getTodaysWorkout = () => {
    const today = new Date();
    const { exercises } = getExercisesForDay(today, workoutMode, workoutPlans, exerciseDefinitions);
    const muscleGroups = Array.from(new Set(exercises.map(ex => ex.category)));
    return { exercises, muscleGroups };
  };

  const handleStartWorkoutLog = (activity: Activity) => {
    const { exercises, muscleGroups } = getTodaysWorkout();
    setTodaysExercises(exercises);
    setTodaysMuscleGroups(muscleGroups);
    setWorkoutActivityToLog(activity);
  };
  
  const handleActivityClick = (slotName: string, activity: Activity) => {
    if (!activity || activity.completed) return;
    if (activity.type === 'workout') {
      handleStartWorkoutLog(activity);
    } else if (['upskill', 'deepwork', 'branding'].includes(activity.type)) {
      setEditingActivity({ slotName, activity });
      setIsLearningModalOpen(true);
    }
  };

  const handleSaveTaskSelection = (allTodaysDefIds: string[], checkedDefIdsForSlot: string[]) => {
    if (!editingActivity) return;

    const { slotName, activity } = editingActivity;
    const pageType = activity.type as 'upskill' | 'deepwork' | 'branding';
    
    const logsUpdater = pageType === 'upskill' ? setAllUpskillLogs : pageType === 'deepwork' ? setAllDeepWorkLogs : setAllBrandingLogs;
    const definitionSource = pageType === 'upskill' ? upskillDefinitions : pageType === 'deepwork' ? deepWorkDefinitions : brandingTasks;
    const logSource = pageType === 'upskill' ? allUpskillLogs : pageType === 'deepwork' ? allDeepWorkLogs : brandingLogs;

    // 1. Determine which exercises need to be created.
    const logForDay = logSource.find(log => log.date === todayKey);
    const existingDefIdsForDay = new Set(logForDay?.exercises.map(ex => ex.definitionId) || []);
    const defIdsToCreate = allTodaysDefIds.filter(id => !existingDefIdsForDay.has(id));

    const newExercises: WorkoutExercise[] = defIdsToCreate.length > 0
      ? definitionSource
          .filter(def => defIdsToCreate.includes(def.id))
          .map(def => ({
              id: `${def.id}-${Date.now()}-${Math.random()}`,
              definitionId: def.id,
              name: def.name,
              category: def.category,
              loggedSets: [], targetSets: 1, targetReps: '25',
          }))
      : [];
    
    // 2. If new exercises were created, update the logs state.
    if (newExercises.length > 0) {
      logsUpdater(prevLogs => {
          const newLogs = [...prevLogs];
          const logIndex = newLogs.findIndex(log => log.date === todayKey);
          if (logIndex > -1) {
              newLogs[logIndex].exercises.push(...newExercises);
          } else {
              newLogs.push({ id: todayKey, date: todayKey, exercises: [...(logForDay?.exercises || []), ...newExercises] });
          }
          return newLogs;
      });
    }

    // 3. Update the schedule with the correct task IDs.
    const allRelevantExercises = [...(logForDay?.exercises || []), ...newExercises];
    const finalTaskIdsForSlot = allRelevantExercises
      .filter(ex => checkedDefIdsForSlot.includes(ex.definitionId))
      .map(ex => ex.id);

    const newDetails = allRelevantExercises
      .filter(ex => finalTaskIdsForSlot.includes(ex.id))
      .map(t => t.name).join(', ') || (pageType === 'upskill' ? 'Learning Session' : 'Deep Work Session');
    
    setSchedule(prev => {
      const newTodaySchedule = { ...(prev[todayKey] || {}) };
      const activitiesInSlot = (newTodaySchedule[slotName] || []).map(act =>
        act.id === activity.id ? { ...act, taskIds: finalTaskIdsForSlot, details: newDetails } : act
      );
      newTodaySchedule[slotName] = activitiesInSlot;
      return { ...prev, [todayKey]: newTodaySchedule };
    });

    setEditingActivity(null);
  };


  const todaysSchedule = schedule[todayKey] || {};

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
              let requiredDailyRate = (milestoneStats?.progressNeeded || remainingProgress) / (milestoneStats?.daysRemaining || completionStats?.daysRemaining || 1);
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
          const isFullyShared = (task: ExerciseDefinition) => task.sharingStatus && task.sharingStatus.twitter && task.sharingStatus.linkedin && task.sharingStatus.devto;
          const activeTasks = brandingTasks.filter(task => !isFullyShared(task));
          const nextTask = activeTasks[0];
          if (nextTask) {
              let loggedStagesCount = brandingLogs.find(log => log.exercises.some(ex => ex.definitionId === nextTask.id))?.exercises.find(ex => ex.definitionId === nextTask.id)?.loggedSets.length || 0;
              const stages = ['Create', 'Optimize', 'Review', 'Final Review'];
              return { status: 'in_progress' as const, taskName: nextTask.name, stage: loggedStagesCount < 4 ? stages[loggedStagesCount] : 'Ready to Share', progress: `${loggedStagesCount}/4` };
          }
          const bundledFocusAreaNames = new Set(brandingTasks.flatMap(task => task.focusAreas || []));
          const focusAreaSessionCounts: Record<string, number> = {};
          allDeepWorkLogs.forEach(log => log.exercises.forEach(ex => { focusAreaSessionCounts[ex.definitionId] = (focusAreaSessionCounts[ex.definitionId] || 0) + ex.loggedSets.length; }));
          const eligibleFocusAreas = deepWorkDefinitions.filter(def => (focusAreaSessionCounts[def.id] || 0) >= 4 && !bundledFocusAreaNames.has(def.name));
          const topics: Record<string, { eligibleCount: number, focusAreas: ExerciseDefinition[] }> = {};
          deepWorkDefinitions.forEach(def => { if (!topics[def.category]) topics[def.category] = { eligibleCount: 0, focusAreas: [] }; topics[def.category].focusAreas.push(def); });
          eligibleFocusAreas.forEach(def => { if (topics[def.category]) topics[def.category].eligibleCount++; });
          let closestTopic = { name: '', needed: 4 };
          Object.entries(topics).forEach(([topicName, data]) => { if (data.eligibleCount > 0 && data.eligibleCount < 4) { const needed = 4 - data.eligibleCount; if (needed < closestTopic.needed) closestTopic = { name: topicName, needed }; } });
          if (closestTopic.name) return { status: 'pending' as const, message: `Need ${closestTopic.needed} more eligible focus areas in "${closestTopic.name}" to form a bundle.`, subMessage: `(An area is eligible after 4 deep work sessions).`, eligibleFocusAreas: eligibleFocusAreas.map(fa => `${fa.name} (${fa.category})`) };
          let closestFocusArea = { name: '', needed: 5 };
          deepWorkDefinitions.forEach(def => { const sessions = focusAreaSessionCounts[def.id] || 0; if (sessions < 4 && !bundledFocusAreaNames.has(def.name)) { const needed = 4 - sessions; if (needed < closestFocusArea.needed) closestFocusArea = { name: def.name, needed }; } });
          if (closestFocusArea.name) return { status: 'pending' as const, message: `Log ${closestFocusArea.needed} more session(s) for "${closestFocusArea.name}" to make it eligible.`, subMessage: 'Then, group 4 eligible areas in one topic to form a bundle.', eligibleFocusAreas: eligibleFocusAreas.map(fa => `${fa.name} (${fa.category})`) };
          return { status: 'pending' as const, message: 'Log 4 sessions on 4 focus areas within the same topic.', subMessage: 'This will create your first branding bundle.', eligibleFocusAreas: [] };
      };

      const learningStats = calculateLearningStats(allUpskillLogs, topicGoals);

      const milestones = Object.values(learningStats)
        .map((s: any) => s.nextMilestone)
        .filter(m => m)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);
    
      let overallNextMilestone = null;
      if (milestones.length > 0) {
          const closestMilestone = milestones[0];
          const topic = Object.keys(learningStats).find(
              (t: string) => learningStats[t].nextMilestone === closestMilestone
          );
          overallNextMilestone = { ...closestMilestone, topic };
      }

      const totalProductiveMinutes = calculateAverageDuration(allUpskillLogs, 'reps') + calculateAverageDuration(allDeepWorkLogs, 'weight');
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
      const avgProductiveHours = totalProductiveMinutes / 60;
      const yesterdayTotalProductiveMinutes = calculateAverageDuration(allUpskillLogs, 'reps', true) + calculateAverageDuration(allDeepWorkLogs, 'weight', true);

      return {
          todayDeepWorkHours: todayDeepWork / 60, deepWorkChange: calculateChange(todayDeepWork, yesterdayDeepWork),
          todayUpskillHours: todayUpskill / 60, upskillChange: calculateChange(todayUpskill, yesterdayUpskill),
          consistencyChange: (consistencyData[consistencyData.length - 1]?.score || 0) - (consistencyData[consistencyData.length - 2]?.score || 0),
          totalProductiveHours: avgProductiveHours,
          avgProductiveHoursChange: calculateChange(avgProductiveHours, yesterdayTotalProductiveMinutes / 60),
          currentLevel: productivityLevels.find(l => totalProductiveMinutes >= l.min && totalProductiveMinutes < l.max) || null,
          learningStats: learningStats,
          overallNextMilestone: overallNextMilestone,
          latestConsistency: consistencyData[consistencyData.length - 1]?.score || 0,
          brandingStatus: calculateBrandingStatus(),
          totalHoursData, todayHoursData,
      };
  }, [allUpskillLogs, allDeepWorkLogs, topicGoals, allWorkoutLogs, oneYearAgo, today, consistencyData, brandingTasks, brandingLogs, deepWorkDefinitions]);
    
  const _activityDurations = useMemo(() => {
    const durations: Record<string, string> = {};
    if (!schedule[todayKey] || !productivityStats.learningStats) return durations;

    const allTodaysActivities = Object.entries(schedule[todayKey] || {}).flatMap(([slotName, activities]) =>
      activities.map(activity => ({ ...activity, slotName }))
    );

    const todaysUpskillTasks = allUpskillLogs.find(log => log.date === todayKey)?.exercises || [];
    const upskillTaskMap = new Map(todaysUpskillTasks.map(task => [task.id, task]));

    for (const activity of allTodaysActivities) {
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
          durations[activity.id] = slotTimeRanges[activity.slotName] || activity.slotName;
          break;
        case 'upskill':
          if (activity.taskIds && activity.taskIds.length > 0) {
            const firstTask = upskillTaskMap.get(activity.taskIds[0]);
            if (firstTask) {
              const topic = firstTask.category;
              const topicStats = productivityStats.learningStats[topic];
              if (topicStats && topicStats.remainingForToday > 0 && topicStats.speed > 0) {
                const timeInMinutes = (topicStats.remainingForToday / (topicStats.speed / 60));
                if (timeInMinutes >= 60) {
                  const hours = Math.floor(timeInMinutes / 60);
                  const minutes = Math.round(timeInMinutes % 60);
                  durations[activity.id] = `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
                } else {
                  durations[activity.id] = `${Math.round(timeInMinutes)}m`;
                }
              }
            }
          }
          break;
        default:
          break;
      }
    }
    return durations;
  }, [schedule, todayKey, productivityStats.learningStats, allUpskillLogs]);

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
      return { availableTasks: [], initialSelectedIds: [], pageType: 'upskill' as const, disabledTaskIds: [], isAddingNewTasks: false, allTodaysLoggedDefIds: [] };
    }

    const { activity } = editingActivity;
    const pageType = activity.type as 'upskill' | 'deepwork' | 'branding';

    const logSource = pageType === 'upskill' ? allUpskillLogs : pageType === 'deepwork' ? allDeepWorkLogs : brandingLogs;
    const definitionSource = pageType === 'upskill' ? upskillDefinitions : pageType === 'deepwork' ? deepWorkDefinitions : brandingTasks;
    
    const allTasksForDay = logSource.find(log => log.date === todayKey)?.exercises || [];
    
    const combinedTasksMap = new Map<string, WorkoutExercise>();
    allTasksForDay.forEach(task => combinedTasksMap.set(task.definitionId, task));

    definitionSource.forEach(def => {
        if (!combinedTasksMap.has(def.id)) {
            combinedTasksMap.set(def.id, {
                id: `${def.id}-lib-${Math.random()}`,
                definitionId: def.id,
                name: def.name,
                category: def.category,
                loggedSets: [], targetSets: 0, targetReps: ''
            });
        }
    });

    const availableTasks = Array.from(combinedTasksMap.values());
    
    const initialSelectedDefIds = new Set<string>();
    (activity.taskIds || []).forEach(taskId => {
        const task = allTasksForDay.find(t => t.id === taskId);
        if (task) {
            initialSelectedDefIds.add(task.definitionId);
        }
    });
    const initialSelectedIds = Array.from(initialSelectedDefIds);
    
    const todaysActivitiesForType = Object.values(schedule[todayKey] || {}).flat();
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

    const isAddingNewTasks = activity.taskIds?.length === 0;

    const allTodaysLoggedDefIds = allTasksForDay.map(t => t.definitionId);

    return { 
        availableTasks, 
        initialSelectedIds, 
        pageType, 
        disabledTaskIds, 
        isAddingNewTasks,
        allTodaysLoggedDefIds,
    };

}, [editingActivity, allUpskillLogs, allDeepWorkLogs, brandingLogs, todayKey, schedule, upskillDefinitions, deepWorkDefinitions, brandingTasks]);

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
          <CardHeader className="text-center py-4">
              <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </CardHeader>
          <CardContent>
            <DashboardStats stats={productivityStats} />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
              <div className="lg:col-span-3">
                <ProductivitySnapshot 
                  stats={productivityStats} 
                  timeAllocationData={timeAllocationData} 
                  onOpenStatsModal={() => setIsStatsModalOpen(true)} 
                />
              </div>
              <div className="lg:col-span-2 space-y-6">
                 {currentUser && isAgendaDocked && (
                    <TodaysScheduleCard
                        schedule={schedule}
                        activityDurations={activityDurations}
                        isAgendaDocked={isAgendaDocked}
                        onToggleDock={() => setIsAgendaDocked(prev => !prev)}
                        onLogLearning={handleLogLearning}
                        onStartWorkoutLog={handleStartWorkoutLog}
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
                />
              </div>
            </div>
            <TimeSlots 
              schedule={todaysSchedule}
              currentSlot={currentSlot}
              remainingTime={remainingTime}
              onAddActivity={handleAddActivity}
              onRemoveActivity={handleRemoveActivity}
              onToggleComplete={handleToggleComplete}
              onActivityClick={handleActivityClick}
            />
          </CardContent>
        </Card>
        
        <ActivityHeatmap schedule={schedule} />

        {currentUser && !isAgendaDocked && (
            <TodaysScheduleCard
                schedule={schedule}
                activityDurations={activityDurations}
                isAgendaDocked={isAgendaDocked}
                onToggleDock={() => setIsAgendaDocked(prev => !prev)}
                onLogLearning={handleLogLearning}
                onStartWorkoutLog={handleStartWorkoutLog}
            />
        )}

        {currentUser && (
          <TodaysWorkoutModal
              isOpen={!!workoutActivityToLog}
              onOpenChange={(isOpen) => { if(!isOpen) setWorkoutActivityToLog(null); }}
              activityToLog={workoutActivityToLog}
              todaysExercises={todaysExercises}
              muscleGroupsForDay={todaysMuscleGroups}
              onActivityComplete={(slotName, activityId) => {
                handleToggleComplete(slotName, activityId);
                setWorkoutActivityToLog(null);
              }}
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
              isAddingNewTasks={learningModalProps.isAddingNewTasks}
              disabledTaskIds={learningModalProps.disabledTaskIds}
              allTodaysLoggedDefIds={learningModalProps.allTodaysLoggedDefIds}
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
      </div>
    </>
  );
}

export default function Page() {
    return ( <AuthGuard> <HomePageContent /> </AuthGuard> );
}
