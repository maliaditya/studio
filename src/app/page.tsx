
"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Sunrise, Sun, Sunset, Moon, MoonStar, CloudSun, PlusCircle, Trash2, Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, BarChart3, Clock, TrendingUp, Zap, Target, LineChart as LineChartIcon, BookCopy, Activity, CalendarDays, Flame, HeartPulse, Utensils, ArrowUp, ArrowDown, Share2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format, getDay, getISOWeek, differenceInDays, addDays, parseISO, subYears, differenceInYears, addWeeks, startOfISOWeek, setISOWeek, getISOWeekYear } from 'date-fns';
import { useRouter } from 'next/navigation';
import { TodaysWorkoutModal } from '@/components/TodaysWorkoutModal';
import { TodaysLearningModal } from '@/components/TodaysLearningModal';
import type { AllWorkoutPlans, ExerciseDefinition, WorkoutMode, WorkoutExercise, FullSchedule, Activity as ActivityType, DatedWorkout, TopicGoal, WorkoutPlan, ExerciseCategory, WeightLog, Gender, UserDietPlan, DailySchedule } from '@/types/workout';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { WeightChartModal } from '@/components/WeightChartModal';
import { DietPlanModal } from '@/components/DietPlanModal';
import { StatsOverviewModal } from '@/components/StatsOverviewModal';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, AreaChart, Area } from 'recharts';
import { Badge } from '@/components/ui/badge';

const slots = [
  { name: 'Late Night', time: '12 AM - 4 AM', icon: <Moon className="h-6 w-6 text-indigo-400" /> },
  { name: 'Dawn', time: '4 AM - 8 AM', icon: <Sunrise className="h-6 w-6 text-orange-400" /> },
  { name: 'Morning', time: '8 AM - 12 PM', icon: <Sun className="h-6 w-6 text-yellow-400" /> },
  { name: 'Afternoon', time: '12 PM - 4 PM', icon: <CloudSun className="h-6 w-6 text-sky-500" /> },
  { name: 'Evening', time: '4 PM - 8 PM', icon: <Sunset className="h-6 w-6 text-purple-500" /> },
  { name: 'Night', time: '8 PM - 12 AM', icon: <MoonStar className="h-6 w-6 text-indigo-500" /> }
];

const slotEndHours: Record<string, number> = {
  'Late Night': 4,
  'Dawn': 8,
  'Morning': 12,
  'Afternoon': 16,
  'Evening': 20,
  'Night': 24, // Represents midnight of the next day
};


// Schedules for workout focus calculation
const dailyMuscleGroups: Record<number, string[]> = {
  1: ["Chest", "Triceps"], // Monday
  2: ["Back", "Biceps"],   // Tuesday
  3: ["Shoulders", "Legs"],// Wednesday
  4: ["Chest", "Triceps"], // Thursday
  5: ["Back", "Biceps"],   // Friday
  6: ["Shoulders", "Legs"], // Saturday
  0: [], // Sunday
};
const singleMuscleDailySchedule: Record<number, ExerciseCategory | null> = {
    1: "Chest",       // Monday
    2: "Triceps",     // Tuesday
    3: "Back",        // Wednesday
    4: "Biceps",      // Thursday
    5: "Shoulders",   // Friday
    6: "Legs",        // Saturday
    0: null,          // Sunday
};

const INITIAL_PLANS: AllWorkoutPlans = {
    "W1": {
      "Chest": ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine"],
      "Triceps": ["Close-Grip Barbell Bench Press", "Overhead Dumbbell Extension", "Dumbbell Kickback", "Rope Pushdown"],
      "Back": ["Lat Pulldown", "Machine Row", "T-Bar Row", "Lat Prayer Pull"],
      "Biceps": ["Standing dumbbell curls", "Standing Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)"],
      "Shoulders": ["Seated Dumbbell Shoulder Press", "Standing Dumbbell Lateral Raise", "Face Pulls", "Shrugs"],
      "Legs": ["Walking Lunges (Barbell)", "Leg Press", "Quads Machine", "Hamstring machine"]
    },
    "W2": {
      "Chest": ["Dumbbell Flat Press", "Incline Dumbbell Press", "Decline Dumbbell Press", "Cable Fly"],
      "Triceps": ["Overhead Dumbbell Extension", "Overhead Bar extension", "Rope Pushdown", "Dumbbell Kickback"],
      "Back": ["Lat Pulldown (Wide Grip)", "V handle lat pulldown", "1-Arm Dumbbell Row", "Back extensions"],
      "Biceps": ["Seated Incline Dumbbell Curl", "Seated Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Reverse Cable"],
      "Shoulders": ["Seated Dumbbell Shoulder Press", "Seated Dumbbell Lateral Raise", "Rear Delt Fly (Incline Bench)", "Cable Upright Rows"],
      "Legs": ["Walking Lunges (Barbell)", "Squats (Barbell)", "hamstring machine", "Quads Machine"]
    },
    "W3": {
      "Chest": ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine"],
      "Triceps": ["Overhead Cable Extension", "Straight bar pushdown", "Reverse Bar Pushdown", "Back dips"],
      "Back": ["Lat Pulldown", "Barbell Row", "Seated Row", "Lat Prayer Pull"],
      "Biceps": ["Strict bar curls", "Reversed Incline curls", "Cable Curls Superset", "Reversed cable curls"],
      "Shoulders": ["Seated Dumbbell Shoulder Press", "Dumbbell Lateral Raise (Lean in)", "Face Pulls", "Shrugs"],
      "Legs": ["Leg Press", "Quads Machine", "Hamstring machine", "Calfs (Bodyweight)"]
    },
    "W4": {
      "Chest": ["Dumbbell Flat Press", "Incline Dumbbell Press", "Dumbbell Pullovers", "Cable Fly"],
      "Triceps": ["Overhead Cable Extension", "Straight bar pushdown", "Reverse Bar Pushdown", "Back dips"],
      "Back": ["Lat Pulldown", "1-Arm Dumbbell Row", "V handle lat pulldown", "DeadLifts"],
      "Biceps": ["Seated Machine Curls", "Cable Curls", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)"],
      "Shoulders": ["Seated Dumbbell Shoulder Press", "Lean-Away Cable Lateral Raise", "Face Pulls", "Front Raise cable"],
      "Legs": ["Walking Lunges (Barbell)", "Squats (Barbell)", "hamstring machine", "Quads Machine"]
    },
    "W5": {
      "Chest": ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine", "Cable Fly", "Dumbbell Pullovers"],
      "Triceps": ["Close-Grip Barbell Bench Press", "Overhead Dumbbell Extension", "Dumbbell Kickback", "Straight bar pushdown", "Reverse Bar Pushdown", "Back dips"],
      "Back": ["Lat Pulldown", "Machine Row", "T-Bar Row", "Lat Prayer Pull", "1-Arm Dumbbell Row", "DeadLifts"],
      "Biceps": ["Standing dumbbell curls", "Standing Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)", "Reversed cable curls", "Reversed Incline curls"],
      "Shoulders": ["Seated Dumbbell Shoulder Press", "Standing Dumbbell Lateral Raise", "Face Pulls", "Cable Upright Rows", "Front Raise Dumbbells", "Shrugs"],
      "Legs": ["Squats (Barbell)", "Leg Press", "Quads Machine", "Hamstring machine", "Walking Lunges (Barbell)", "Calfs (Bodyweight)"]
    },
    "W6": {
      "Chest": ["Dumbbell Flat Press", "Incline Dumbbell Press", "Decline Dumbbell Press", "Peck Machine", "Flat Bench Chest Fly", "Dumbbell Pullovers"],
      "Triceps": ["Overhead Cable Extension", "Single Arm Dumbbell Extensions", "Rope Pushdown", "Straight bar pushdown", "Reverse Bar Pushdown", "Back dips"],
      "Back": ["Lat Pulldown", "1-Arm Dumbbell Row", "V handle lat pulldown", "Barbell Row", "Lat Prayer Pull", "Back extensions"],
      "Biceps": ["Strict bar curls", "Seated Incline Dumbbell Curl", "Seated Dumbbell Alternating Curl", "Preacher Curls Bar", "Reverse Cable", "Concentration Curl"],
      "Shoulders": ["Seated Dumbbell Shoulder Press", "Lean-Away Cable Lateral Raise", "Face Pulls", "Front Raise cable", "Cable Upright Rows", "Shrugs"],
      "Legs": ["Walking Lunges (Barbell)", "Hack Squats", "Hamstring machine", "Quads Machine", "Leg Press", "Calfs (Bodyweight)"]
    }
  };

const activityIcons: Record<ActivityType, React.ReactNode> = {
  workout: <Dumbbell className="h-5 w-5 text-primary" />,
  upskill: <BookOpenCheck className="h-5 w-5 text-primary" />,
  deepwork: <Briefcase className="h-5 w-5 text-primary" />,
  planning: <ClipboardList className="h-5 w-5 text-primary" />,
  tracking: <ClipboardCheck className="h-5 w-5 text-primary" />,
  branding: <Share2 className="h-5 w-5 text-primary" />,
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
  const { currentUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [currentSlot, setCurrentSlot] = useState('');
  const [remainingTime, setRemainingTime] = useState('');
  const [schedule, setSchedule] = useState<FullSchedule>({});
  const [isScheduleLoaded, setIsScheduleLoaded] = useState(false);
  const [todayKey, setTodayKey] = useState('');

  // State for workout data
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>('two-muscle');
  const [workoutPlans, setWorkoutPlans] = useState<AllWorkoutPlans>(INITIAL_PLANS);
  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  const [allWorkoutLogs, setAllWorkoutLogs] = useState<DatedWorkout[]>([]);
  
  // State for upskill and deepwork data
  const [allUpskillLogs, setAllUpskillLogs] = useState<DatedWorkout[]>([]);
  const [allDeepWorkLogs, setAllDeepWorkLogs] = useState<DatedWorkout[]>([]);
  const [deepWorkDefinitions, setDeepWorkDefinitions] = useState<ExerciseDefinition[]>([]);
  const [topicGoals, setTopicGoals] = useState<Record<string, TopicGoal>>({});

  // State for personal branding data
  const [brandingTasks, setBrandingTasks] = useState<ExerciseDefinition[]>([]);
  const [brandingLogs, setAllBrandingLogs] = useState<DatedWorkout[]>([]);

  // State for health data
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [dietPlan, setDietPlan] = useState<UserDietPlan>([]);

  // State for Modals
  const [isTodaysWorkoutModalOpen, setIsTodaysWorkoutModalOpen] = useState(false);
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [isWeightChartModalOpen, setIsWeightChartModalOpen] = useState(false);
  const [isDietPlanModalOpen, setIsDietPlanModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  
  // State for Modal content
  const [todaysExercises, setTodaysExercises] = useState<WorkoutExercise[]>([]);
  const [todaysMuscleGroups, setTodaysMuscleGroups] = useState<string[]>([]);
  const [learningModalProps, setLearningModalProps] = useState({
      tasks: [] as WorkoutExercise[],
      title: '',
      description: '',
      pageType: 'upskill' as 'upskill' | 'deepwork' | 'branding'
  });
  
  // State for productivity stats
  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  const DEFAULT_TARGET_SETS = 4;
  const DEFAULT_TARGET_REPS = "8-12";

  useEffect(() => {
    setTodayKey(format(new Date(), 'yyyy-MM-dd'));
    const now = new Date();
    setToday(now);
    setOneYearAgo(subYears(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1));
  }, []);

  const scheduleStorageKey = currentUser ? `lifeos_schedule_${currentUser.username}` : null;

  // Load schedule from localStorage
  useEffect(() => {
    if (scheduleStorageKey) {
      try {
        const storedSchedule = localStorage.getItem(scheduleStorageKey);
        if (storedSchedule) {
          const parsedSchedule: FullSchedule = JSON.parse(storedSchedule);
          // Data migration: ensure all slots have arrays of activities with IDs.
          Object.keys(parsedSchedule).forEach(dateKey => {
            Object.keys(parsedSchedule[dateKey]).forEach(slotName => {
              const slotContent = parsedSchedule[dateKey][slotName];
              if (slotContent && !Array.isArray(slotContent)) {
                // This is old data (a single activity object). Convert to an array.
                const activity = slotContent as ActivityType;
                parsedSchedule[dateKey][slotName] = [{
                  ...activity,
                  id: activity.id || `${activity.type}-${Date.now()}-${Math.random()}`,
                }];
              } else if (Array.isArray(slotContent)) {
                // It's already an array. Ensure all items have an ID.
                parsedSchedule[dateKey][slotName] = slotContent.map(activity => ({
                  ...activity,
                  id: activity.id || `${activity.type}-${Date.now()}-${Math.random()}`
                }));
              }
            });
          });
          setSchedule(parsedSchedule);
        }
      } catch (error) {
        console.error("Failed to parse schedule from localStorage", error);
        setSchedule({});
      }
      setIsScheduleLoaded(true);
    }
  }, [scheduleStorageKey]);

  // Save schedule to localStorage
  useEffect(() => {
    if (scheduleStorageKey && isScheduleLoaded) {
      localStorage.setItem(scheduleStorageKey, JSON.stringify(schedule));
    }
  }, [schedule, scheduleStorageKey, isScheduleLoaded]);

  // Load all other data from local storage
  useEffect(() => {
    if (currentUser?.username) {
        const username = currentUser.username;
        // Workout
        const defsKey = `exerciseDefinitions_${username}`;
        const plansKey = `workoutPlans_${username}`;
        const modeKey = `workoutMode_${username}`;
        const logsKey = `allWorkoutLogs_${username}`;
        // Upskill
        const upskillLogsKey = `upskill_logs_${username}`;
        const goalsKey = `upskill_topic_goals_${username}`;
        // Deep Work
        const deepworkDefsKey = `deepwork_definitions_${username}`;
        const deepworkLogsKey = `deepwork_logs_${username}`;
        // Personal Branding
        const brandingTasksKey = `branding_tasks_${username}`;
        const brandingLogsKey = `branding_logs_${username}`;
        // Health
        const weightLogsKey = `weightLogs_${username}`;
        const goalWeightKey = `goalWeight_${username}`;
        const heightKey = `height_${username}`;
        const dobKey = `dateOfBirth_${username}`;
        const genderKey = `gender_${username}`;
        const dietPlanKey = `dietPlan_${username}`;

        // Load workout
        const storedMode = localStorage.getItem(modeKey);
        setWorkoutMode((storedMode as WorkoutMode) || 'two-muscle');
        try { const d = localStorage.getItem(plansKey); setWorkoutPlans(d ? JSON.parse(d) : INITIAL_PLANS); } catch (e) { setWorkoutPlans(INITIAL_PLANS); }
        try { const d = localStorage.getItem(defsKey); setExerciseDefinitions(d ? JSON.parse(d) : []); } catch (e) { setExerciseDefinitions([]); }
        try { const d = localStorage.getItem(logsKey); setAllWorkoutLogs(d ? JSON.parse(d) : []); } catch (e) { setAllWorkoutLogs([]); }
        
        // Load upskill/deepwork
        try { const d = localStorage.getItem(upskillLogsKey); setAllUpskillLogs(d ? JSON.parse(d) : []); } catch (e) { setAllUpskillLogs([]); }
        try { const d = localStorage.getItem(deepworkLogsKey); setAllDeepWorkLogs(d ? JSON.parse(d) : []); } catch (e) { setAllDeepWorkLogs([]); }
        try { const d = localStorage.getItem(deepworkDefsKey); setDeepWorkDefinitions(d ? JSON.parse(d) : []); } catch (e) { setDeepWorkDefinitions([]); }
        try { const d = localStorage.getItem(goalsKey); setTopicGoals(d ? JSON.parse(d) : {}); } catch (e) { setTopicGoals({}); }

        // Load branding
        try { const d = localStorage.getItem(brandingTasksKey); setBrandingTasks(d ? JSON.parse(d) : []); } catch (e) { setBrandingTasks([]); }
        try { const d = localStorage.getItem(brandingLogsKey); setAllBrandingLogs(d ? JSON.parse(d) : []); } catch (e) { setAllBrandingLogs([]); }
        
        // Load health
        try { const d = localStorage.getItem(dietPlanKey); setDietPlan(d ? JSON.parse(d) : []); } catch(e) { setDietPlan([]); }
        try { const d = localStorage.getItem(weightLogsKey); setWeightLogs(d ? JSON.parse(d) : []); } catch(e) { setWeightLogs([]); }
        const storedGoal = localStorage.getItem(goalWeightKey);
        if (storedGoal) setGoalWeight(parseFloat(storedGoal));
        const storedHeight = localStorage.getItem(heightKey);
        if (storedHeight) setHeight(parseFloat(storedHeight));
        const storedDob = localStorage.getItem(dobKey);
        if (storedDob) setDateOfBirth(storedDob);
        const storedGender = localStorage.getItem(genderKey);
        if (storedGender === 'male' || storedGender === 'female') setGender(storedGender as Gender);
    }
  }, [currentUser]);

  // Save health data back to local storage on change
  useEffect(() => {
    if (currentUser?.username) {
        const username = currentUser.username;
        localStorage.setItem(`weightLogs_${username}`, JSON.stringify(weightLogs));
        localStorage.setItem(`dietPlan_${username}`, JSON.stringify(dietPlan));
        if (goalWeight !== null) localStorage.setItem(`goalWeight_${username}`, goalWeight.toString()); else localStorage.removeItem(`goalWeight_${username}`);
        if (height !== null) localStorage.setItem(`height_${username}`, height.toString()); else localStorage.removeItem(`height_${username}`);
        if (dateOfBirth) localStorage.setItem(`dateOfBirth_${username}`, dateOfBirth); else localStorage.removeItem(`dateOfBirth_${username}`);
        if (gender) localStorage.setItem(`gender_${username}`, gender); else localStorage.removeItem(`gender_${username}`);
    }
  }, [weightLogs, goalWeight, height, dateOfBirth, gender, dietPlan, currentUser]);


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
        const slotEndTime = new Date();
        slotEndTime.setHours(slotEndHour, 0, 0, 0);

        const diff = slotEndTime.getTime() - now.getTime();

        if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);

            setRemainingTime(
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            );
        } else {
            setRemainingTime('00:00:00');
        }
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

    // Only run this logic once per day
    if (lastCarryForwardDate === todayKey) return;

    const todaysActivities = schedule[todayKey];
    const hasTodaysActivities = todaysActivities && Object.keys(todaysActivities).length > 0 && Object.values(todaysActivities).some(slot => slot.length > 0);

    // Only carry forward if today's schedule is empty
    if (hasTodaysActivities) {
        localStorage.setItem(lastCarryForwardKey, todayKey);
        return;
    }

    const yesterdaysSchedule = schedule[yesterdayKey];
    if (!yesterdaysSchedule || Object.keys(yesterdaysSchedule).length === 0) {
        localStorage.setItem(lastCarryForwardKey, todayKey);
        return;
    }
    
    // Create a new schedule for today based on yesterday's activities
    const newTodaySchedule: DailySchedule = {};
    let carriedOver = false;
    Object.entries(yesterdaysSchedule).forEach(([slotName, activities]) => {
        if (activities && activities.length > 0) {
            newTodaySchedule[slotName] = activities.map(activity => ({
                ...activity,
                id: `${activity.type}-${Date.now()}-${Math.random()}`,
                completed: false, // IMPORTANT: Reset completion status
            }));
            carriedOver = true;
        }
    });

    if (carriedOver) {
        setSchedule(prev => ({
            ...prev,
            [todayKey]: newTodaySchedule
        }));
        toast({
            title: "Activities Carried Over",
            description: "Yesterday's activities have been added to today's schedule.",
        });
    }

    // Mark that we've processed the carry-forward for today
    localStorage.setItem(lastCarryForwardKey, todayKey);

  }, [currentUser, isScheduleLoaded, schedule, toast]);


  const handleAddActivity = (slotName: string, type: ActivityType) => {
    if (!currentUser?.username || !todayKey) return;
    
    const currentActivities = schedule[todayKey]?.[slotName] || [];
    if (currentActivities.length >= 2) {
      toast({
        title: "Slot Full",
        description: "You can add a maximum of two activities per slot.",
        variant: "destructive",
      });
      return;
    }

    let details = '';
    switch (type) {
      case 'workout': {
        const dayOfWeek = getDay(new Date());
        let muscleGroups: string[] = [];
        if (workoutMode === 'one-muscle') {
          const muscle = singleMuscleDailySchedule[dayOfWeek];
          if (muscle) muscleGroups = [muscle];
        } else {
          muscleGroups = dailyMuscleGroups[dayOfWeek] || [];
        }
        details = muscleGroups.join(' & ') || "Rest Day";
        break;
      }
      case 'upskill':
        details = 'Learning Session';
        break;
      case 'deepwork':
        details = 'Deep Work';
        break;
      case 'planning':
        details = 'Planning Session';
        break;
      case 'tracking':
        details = 'Tracking Session';
        break;
      case 'branding':
        details = 'Branding Session';
        break;
    }

    const newActivity: ActivityType = {
      id: `${type}-${Date.now()}`,
      type,
      details,
      completed: false,
    };

    setSchedule(prev => ({
      ...prev,
      [todayKey]: {
        ...(prev[todayKey] || {}),
        [slotName]: [...(prev[todayKey]?.[slotName] || []), newActivity]
      }
    }));
  };

  const handleRemoveActivity = (slotName: string, activityId: string) => {
    if (!todayKey) return;
    setSchedule(prev => {
      const newTodaySchedule = { ...(prev[todayKey] || {}) };
      const activities = newTodaySchedule[slotName] || [];
      const updatedActivities = activities.filter(act => act.id !== activityId);
      
      if (updatedActivities.length > 0) {
        newTodaySchedule[slotName] = updatedActivities;
      } else {
        delete newTodaySchedule[slotName]; // Clean up if slot becomes empty
      }
      
      return { ...prev, [todayKey]: newTodaySchedule };
    });
  };

  const handleToggleComplete = (slotName: string, activityId: string) => {
    if (!todayKey) return;
    setSchedule(prev => {
      const todaySchedule = { ...(prev[todayKey] || {}) };
      const activities = todaySchedule[slotName] || [];

      if (activities.length > 0) {
        todaySchedule[slotName] = activities.map(act => 
            act.id === activityId ? { ...act, completed: !act.completed } : act
        );
      }

      return { ...prev, [todayKey]: todaySchedule };
    });
  };

  const findLastPerformance = (exerciseDefinitionId: string) => {
    // Iterate through all logs in reverse chronological order
    const sortedLogs = allWorkoutLogs
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (const log of sortedLogs) {
        // Skip today's log if we're looking for *previous* performance
        if (log.date === todayKey) continue;

        const exerciseInstance = log.exercises.find(ex => ex.definitionId === exerciseDefinitionId && ex.loggedSets.length > 0);
        if (exerciseInstance) {
            // Find the set with the highest weight in that session
            const bestSet = [...exerciseInstance.loggedSets].sort((a, b) => b.weight - a.weight)[0];
            
            if (bestSet) {
              return {
                  reps: bestSet.reps,
                  weight: bestSet.weight,
              };
            }
        }
    }

    return null; // No previous performance found
  };

  const getTodaysWorkout = () => {
    const today = new Date();
    // Re-using the robust logic from the new utility function
    const { exercises } = getExercisesForDay(today, workoutMode, workoutPlans, exerciseDefinitions, findLastPerformance);
    
    // The modal title needs the muscle groups, which can be derived from the generated exercises
    const muscleGroups = Array.from(new Set(exercises.map(ex => ex.category)));

    return { exercises, muscleGroups };
  };

  const handleActivityClick = (activity: ActivityType) => {
    if (activity.completed) return; // Don't open modal for completed tasks

    if (activity.type === 'workout') {
      const { exercises, muscleGroups } = getTodaysWorkout();
      setTodaysExercises(exercises);
      setTodaysMuscleGroups(muscleGroups);
      setIsTodaysWorkoutModalOpen(true);
    } else if (activity.type === 'upskill') {
        const todayLog = allUpskillLogs.find(log => log.date === todayKey);
        setLearningModalProps({
            tasks: todayLog?.exercises || [],
            title: "Today's Learning Session",
            description: "Here are the learning tasks planned for today.",
            pageType: 'upskill'
        });
        setIsLearningModalOpen(true);
    } else if (activity.type === 'deepwork') {
        const todayLog = allDeepWorkLogs.find(log => log.date === todayKey);
        setLearningModalProps({
            tasks: todayLog?.exercises || [],
            title: "Today's Deep Work Session",
            description: "Here are the focus areas planned for today.",
            pageType: 'deepwork'
        });
        setIsLearningModalOpen(true);
    } else if (activity.type === 'branding') {
        const todayLog = brandingLogs.find(log => log.date === todayKey);
        setLearningModalProps({
            tasks: todayLog?.exercises || [],
            title: "Today's Branding Session",
            description: "Here are the content creation tasks for today.",
            pageType: 'branding'
        });
        setIsLearningModalOpen(true);
    }
  };

  const todaysSchedule = schedule[todayKey] || {};

  const dailyStats = useMemo(() => {
    const todaysActivities = schedule[todayKey] || {};
    const completedActivities = Object.values(todaysActivities)
      .flat()
      .filter(activity => activity && activity.completed);

    const healthDone = completedActivities.some(act => act.type === 'workout');
    const wealthDone = completedActivities.some(act => act.type === 'deepwork');
    const growthDone = completedActivities.some(act => act.type === 'upskill');
    const planningDone = completedActivities.some(act => act.type === 'planning');
    const trackingDone = completedActivities.some(act => act.type === 'tracking');
    const directionDone = planningDone && trackingDone;

    return { health: healthDone, wealth: wealthDone, growth: growthDone, direction: directionDone };
  }, [schedule, todayKey]);

    const consistencyData = useMemo(() => {
      if (!allWorkoutLogs || !oneYearAgo || !today) return [];
      const workoutDates = new Set(allWorkoutLogs.filter(log => log.exercises.some(ex => ex.loggedSets.length > 0)).map(log => log.date));
      const data: { date: string; fullDate: string; score: number }[] = [];
      let score = 0.5;
      for (let d = new Date(oneYearAgo); d <= today; d = addDays(d, 1)) {
          const dateKey = format(d, 'yyyy-MM-dd');
          if (workoutDates.has(dateKey)) {
              score += (1 - score) * 0.1;
          } else {
              score *= 0.95;
          }
          data.push({ 
            date: format(d, 'MMM dd'), 
            fullDate: format(d, 'PPP'), 
            score: Math.round(score * 100) 
          });
      }
      return data;
    }, [allWorkoutLogs, oneYearAgo, today]);

    const productivityStats = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const yesterdayStr = format(addDays(new Date(), -1), 'yyyy-MM-dd');

        const getDailyDuration = (logs: DatedWorkout[], dateStr: string, durationField: 'reps' | 'weight') => {
            const logForDay = logs.find(log => log.date === dateStr);
            if (!logForDay) return 0;
            return logForDay.exercises.reduce((total, ex) => 
                total + ex.loggedSets.reduce((sum, set) => sum + (set[durationField] || 0), 0), 0);
        };
        
        const todayDeepWork = getDailyDuration(allDeepWorkLogs, todayStr, 'weight');
        const yesterdayDeepWork = getDailyDuration(allDeepWorkLogs, yesterdayStr, 'weight');
        const todayUpskill = getDailyDuration(allUpskillLogs, todayStr, 'reps');
        const yesterdayUpskill = getDailyDuration(allUpskillLogs, yesterdayStr, 'reps');

        const calculateChange = (todayVal: number, yesterdayVal: number) => {
            if (yesterdayVal === 0) return todayVal > 0 ? 100 : 0;
            if (todayVal === 0 && yesterdayVal > 0) return -100;
            if (isNaN(todayVal) || isNaN(yesterdayVal)) return 0;
            return ((todayVal - yesterdayVal) / yesterdayVal) * 100;
        };

        const deepWorkChange = calculateChange(todayDeepWork, yesterdayDeepWork);
        const upskillChange = calculateChange(todayUpskill, yesterdayUpskill);

        const latestConsistency = consistencyData.length > 0 ? consistencyData[consistencyData.length - 1].score : 0;
        const previousConsistency = consistencyData.length > 1 ? consistencyData[consistencyData.length - 2].score : latestConsistency;
        const consistencyChange = latestConsistency - previousConsistency;

        const calculateAverageDuration = (logs: DatedWorkout[], durationField: 'reps' | 'weight', excludeToday: boolean = false) => {
            const dailyDurations: Record<string, number> = {};
            logs.forEach(log => {
                if (excludeToday && log.date === todayStr) return;
                const duration = log.exercises.reduce((total, ex) => 
                    total + ex.loggedSets.reduce((sum, set) => sum + (set[durationField] || 0), 0), 0);
                if (duration > 0) {
                    dailyDurations[log.date] = (dailyDurations[log.date] || 0) + duration;
                }
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
                        if (!topicData[ex.category]) {
                            topicData[ex.category] = { totalDuration: 0, logs: [] };
                        }
                        const dailyProgress = ex.loggedSets.reduce((sum, set) => sum + set.weight, 0);
                        const dailyDuration = ex.loggedSets.reduce((sum, set) => sum + set.reps, 0);

                        if (dailyProgress > 0) {
                            topicData[ex.category].logs.push({ date: parseISO(log.date), progress: dailyProgress });
                        }
                        topicData[ex.category].totalDuration += dailyDuration;
                    }
                });
            });

            Object.keys(topicData).forEach(topic => {
                const data = topicData[topic];
                const goal = goals[topic];
                if (!goal || data.logs.length === 0) return;
                
                const totalProgress = data.logs.reduce((sum, log) => sum + log.progress, 0);
                const remainingProgress = Math.max(0, goal.goalValue - totalProgress);
                
                const sortedLogs = data.logs.sort((a,b) => a.date.getTime() - b.date.getTime());
                const firstDay = sortedLogs[0].date;
                const durationInDays = differenceInDays(new Date(), firstDay) + 1;
                const averageRatePerDay = durationInDays > 0 ? totalProgress / durationInDays : 0;

                let completionStats = null;
                if (averageRatePerDay > 0.01 && remainingProgress > 0) {
                    const daysToCompletion = Math.ceil(remainingProgress / averageRatePerDay);
                    const estimatedCompletionDate = addDays(new Date(), daysToCompletion);
                    completionStats = {
                        date: format(estimatedCompletionDate, 'PPP'),
                        daysRemaining: daysToCompletion
                    };
                }

                const milestones = [0.25, 0.50, 0.75, 1.0].map(m => m * goal.goalValue);
                let nextMilestoneValue = null;
                let nextMilestonePercent = null;
                for (let i = 0; i < milestones.length; i++) {
                    if (totalProgress < milestones[i]) {
                        nextMilestoneValue = milestones[i];
                        nextMilestonePercent = (i + 1) * 25;
                        break;
                    }
                }
                
                let milestoneStats = null;
                if (nextMilestoneValue && averageRatePerDay > 0.01) {
                    const progressToMilestone = nextMilestoneValue - totalProgress;
                    const daysToMilestone = Math.ceil(progressToMilestone / averageRatePerDay);
                    const estimatedMilestoneDate = addDays(new Date(), daysToMilestone);
                    milestoneStats = {
                        percent: nextMilestonePercent,
                        date: format(estimatedMilestoneDate, 'PPP'),
                        daysRemaining: daysToMilestone,
                        progressNeeded: Math.round(progressToMilestone),
                        unit: goal.goalType,
                    };
                }

                let requiredDailyRate = 0;
                if (milestoneStats && milestoneStats.daysRemaining > 0) {
                    requiredDailyRate = milestoneStats.progressNeeded / milestoneStats.daysRemaining;
                } else if (completionStats && completionStats.daysRemaining > 0) {
                    requiredDailyRate = remainingProgress / completionStats.daysRemaining;
                }

                const speed = data.totalDuration > 0 ? (totalProgress / data.totalDuration) * 60 : 0;

                topicStats[topic] = {
                    topic,
                    speed,
                    unit: `${goal.goalType}/hr`,
                    totalProgress: Math.round(totalProgress),
                    remainingProgress: Math.round(remainingProgress),
                    goalValue: goal.goalValue,
                    completion: completionStats,
                    nextMilestone: milestoneStats,
                    requiredDailyRate: requiredDailyRate,
                };
            });

            return topicStats;
        };

        const calculateWorkoutStats = (logs: DatedWorkout[]) => {
            const dailyData: Record<string, { volume: number }> = {};
            logs.forEach(log => {
                const dailyVolume = log.exercises.reduce((total, ex) =>
                    total + ex.loggedSets.reduce((sum, set) => sum + (set.reps * set.weight), 0), 0);
                
                if (dailyVolume > 0) {
                    dailyData[log.date] = { volume: (dailyData[log.date]?.volume || 0) + dailyVolume };
                }
            });

            const daysWithWorkouts = Object.keys(dailyData).length;
            if (daysWithWorkouts === 0) return { avgVolume: 0 };
            
            const totalVolume = Object.values(dailyData).reduce((sum, d) => sum + d.volume, 0);
            return { avgVolume: Math.round(totalVolume / daysWithWorkouts) };
        };
        
        const avgUpskillDuration = calculateAverageDuration(allUpskillLogs, 'reps');
        const avgDeepWorkDuration = calculateAverageDuration(allDeepWorkLogs, 'weight');
        const totalProductiveMinutes = avgUpskillDuration + avgDeepWorkDuration;
        const totalProductiveHours = totalProductiveMinutes / 60;
        
        const yesterdayAvgUpskillDuration = calculateAverageDuration(allUpskillLogs, 'reps', true);
        const yesterdayAvgDeepWorkDuration = calculateAverageDuration(allDeepWorkLogs, 'weight', true);
        const yesterdayTotalProductiveMinutes = yesterdayAvgUpskillDuration + yesterdayAvgDeepWorkDuration;
        const yesterdayTotalProductiveHours = yesterdayTotalProductiveMinutes / 60;
        
        const avgProductiveHoursChange = calculateChange(totalProductiveHours, yesterdayTotalProductiveHours);

        const currentLevel = productivityLevels.find(l => totalProductiveMinutes >= l.min && totalProductiveMinutes < l.max) || null;
        const learningStats = calculateLearningStats(allUpskillLogs, topicGoals);
        const workoutStats = calculateWorkoutStats(allWorkoutLogs);
        
        // Health Metrics calculation
        const calories = dietPlan.length > 0 ? dietPlan.map(d => d.totalCalories).filter((c): c is number => c !== null && c > 0) : [];
        const averageIntake = calories.length > 0 ? calories.reduce((sum, c) => sum + c, 0) / calories.length : null;
        const currentWeightVal = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : null;
        const age = dateOfBirth ? differenceInYears(new Date(), parseISO(dateOfBirth)) : null;
        let bmr = null;
        if (currentWeightVal && height && age && gender) {
            if (gender === 'male') { bmr = (10 * currentWeightVal) + (6.25 * height) - (5 * age) + 5; } 
            else { bmr = (10 * currentWeightVal) + (6.25 * height) - (5 * age) - 161; }
        }
        const healthMetrics = {
            averageIntake: averageIntake ? Math.round(averageIntake) : null,
            maintenanceCalories: bmr ? Math.round(bmr) : null,
        };

        // Projection Summary calculation
        let projectionSummary = null;
        if (goalWeight && weightLogs.length >= 2) {
            const sortedLogs = weightLogs.map(log => {
                const [year, weekNum] = log.date.split('-W');
                return { ...log, dateObj: startOfISOWeek(setISOWeek(new Date(parseInt(year), 0, 4), parseInt(weekNum))) };
            }).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

            const weightChartData = sortedLogs.map((log, index, arr) => ({
                weight: log.weight, dateObj: log.dateObj,
                weeklyChange: index > 0 ? log.weight - arr[index - 1].weight : null,
            }));
            const lastLog = weightChartData[weightChartData.length - 1];
            
            if (lastLog) {
                const currentWeight = lastLog.weight;
                const weightDifference = goalWeight - currentWeight;
                const changes = weightChartData.map(d => d.weeklyChange).filter((c): c is number => c !== null && c !== 0);
                let averageWeeklyChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
                let projectionRate = averageWeeklyChange;
                if (weightDifference < 0) { if (projectionRate >= 0) projectionRate = -0.5; } 
                else { if (projectionRate <= 0) projectionRate = 0.25; }

                const baseSummary = {
                    currentWeight: parseFloat(currentWeight.toFixed(1)), goalWeight,
                    weightDifference: parseFloat(weightDifference.toFixed(1)),
                    averageWeeklyChange: parseFloat(averageWeeklyChange.toFixed(2)),
                };

                if (Math.abs(projectionRate) > 0.01) {
                    const weeksToGo = Math.ceil(Math.abs(weightDifference / projectionRate));
                    if (weeksToGo > 0 && weeksToGo <= 520) {
                        const projectedDate = addWeeks(lastLog.dateObj, weeksToGo);
                        const nextProjectedWeight = currentWeight + projectionRate;
                        const nextWeekDate = addWeeks(lastLog.dateObj, 1);
                        projectionSummary = {
                            ...baseSummary,
                            projectedDate: format(projectedDate, 'PPP'),
                            nextProjectedWeight: parseFloat(nextProjectedWeight.toFixed(1)),
                            weeksToGo,
                            daysToNextWeek: differenceInDays(nextWeekDate, new Date()),
                            daysToGoal: differenceInDays(projectedDate, new Date()),
                        };
                    } else { projectionSummary = baseSummary; }
                } else { projectionSummary = baseSummary; }
            }
        }
        
        const allNextMilestones = Object.values(learningStats)
            .map(stats => stats.nextMilestone ? { ...stats.nextMilestone, topic: stats.topic } : null)
            .filter((m): m is NonNullable<typeof m> => m !== null)
            .sort((a, b) => a.daysRemaining - b.daysRemaining);

        const overallNextMilestone = allNextMilestones.length > 0 ? allNextMilestones[0] : null;

        const calculateBrandingStatus = () => {
            const isFullyShared = (task: ExerciseDefinition) => 
                task.sharingStatus && 
                task.sharingStatus.twitter && 
                task.sharingStatus.linkedin && 
                task.sharingStatus.devto;
            
            const activeTasks = brandingTasks.filter(task => !isFullyShared(task));
            const nextTask = activeTasks[0];
    
            if (nextTask) {
                let loggedStagesCount = 0;
                for (const log of brandingLogs) {
                    const taskInLog = log.exercises.find(ex => ex.definitionId === nextTask.id);
                    if (taskInLog) {
                        loggedStagesCount = Math.max(loggedStagesCount, taskInLog.loggedSets.length);
                    }
                }
    
                const stages = ['Create', 'Optimize', 'Review', 'Final Review'];
                return {
                    status: 'in_progress' as const,
                    taskName: nextTask.name,
                    stage: loggedStagesCount < 4 ? stages[loggedStagesCount] : 'Ready to Share',
                    progress: `${loggedStagesCount}/4`,
                };
            }

            const bundledFocusAreaNames = new Set<string>();
            brandingTasks.forEach(task => {
                if (task.focusAreas) {
                    task.focusAreas.forEach(name => bundledFocusAreaNames.add(name));
                }
            });
    
            const focusAreaSessionCounts: Record<string, number> = {};
            allDeepWorkLogs.forEach(log => {
                log.exercises.forEach(ex => {
                    const currentSets = ex.loggedSets.length;
                    focusAreaSessionCounts[ex.definitionId] = (focusAreaSessionCounts[ex.definitionId] || 0) + currentSets;
                });
            });
    
            const eligibleFocusAreas = deepWorkDefinitions.filter(def => {
                const hasEnoughSessions = (focusAreaSessionCounts[def.id] || 0) >= 4;
                const isAlreadyBundled = bundledFocusAreaNames.has(def.name);
                return hasEnoughSessions && !isAlreadyBundled;
            });

            const topics: Record<string, { eligibleCount: number, focusAreas: ExerciseDefinition[] }> = {};
            
            deepWorkDefinitions.forEach(def => {
                if (!topics[def.category]) topics[def.category] = { eligibleCount: 0, focusAreas: [] };
                topics[def.category].focusAreas.push(def);
            });
    
            eligibleFocusAreas.forEach(def => {
                if (topics[def.category]) {
                    topics[def.category].eligibleCount++;
                }
            });
    
            let closestTopic = { name: '', needed: 4 };
            Object.entries(topics).forEach(([topicName, data]) => {
                if (data.eligibleCount > 0 && data.eligibleCount < 4) {
                    const needed = 4 - data.eligibleCount;
                    if (needed < closestTopic.needed) {
                        closestTopic = { name: topicName, needed };
                    }
                }
            });
    
            if (closestTopic.name) {
                return {
                    status: 'pending' as const,
                    message: `Need ${closestTopic.needed} more eligible focus areas in "${closestTopic.name}" to form a bundle.`,
                    subMessage: `(An area is eligible after 4 deep work sessions).`,
                    eligibleFocusAreas: eligibleFocusAreas.map(fa => `${fa.name} (${fa.category})`),
                };
            }
    
            let closestFocusArea = { name: '', needed: 5 };
            deepWorkDefinitions.forEach(def => {
                const sessions = focusAreaSessionCounts[def.id] || 0;
                const isBundled = bundledFocusAreaNames.has(def.name);
                if (sessions < 4 && !isBundled) {
                    const needed = 4 - sessions;
                    if (needed < closestFocusArea.needed) {
                        closestFocusArea = { name: def.name, needed };
                    }
                }
            });
            
            if (closestFocusArea.name) {
                 return {
                    status: 'pending' as const,
                    message: `Log ${closestFocusArea.needed} more session(s) for "${closestFocusArea.name}" to make it eligible.`,
                    subMessage: 'Then, group 4 eligible areas in one topic to form a bundle.',
                    eligibleFocusAreas: eligibleFocusAreas.map(fa => `${fa.name} (${fa.category})`),
                };
            }
    
            return {
                status: 'pending' as const,
                message: 'Log 4 sessions on 4 focus areas within the same topic.',
                subMessage: 'This will create your first branding bundle.',
                eligibleFocusAreas: [],
            };
        };
        const brandingStatus = calculateBrandingStatus();

        return {
            todayDeepWorkHours: todayDeepWork / 60,
            deepWorkChange,
            todayUpskillHours: todayUpskill / 60,
            upskillChange,
            consistencyChange,
            avgUpskillHours: avgUpskillDuration / 60, 
            avgDeepWorkHours: avgDeepWorkDuration / 60,
            totalProductiveHours, currentLevel, learningStats, workoutStats, latestConsistency,
            healthMetrics, projectionSummary, overallNextMilestone,
            avgProductiveHoursChange,
            brandingStatus,
        };
    }, [allUpskillLogs, allDeepWorkLogs, topicGoals, allWorkoutLogs, oneYearAgo, today, dietPlan, weightLogs, dateOfBirth, height, gender, goalWeight, consistencyData, brandingTasks, brandingLogs, deepWorkDefinitions]);
    
    // MODAL HANDLERS
    const handleDietModalOpenChange = (isOpen: boolean) => {
        setIsDietPlanModalOpen(isOpen);
        if (!isOpen && currentUser?.username) {
            const planKey = `dietPlan_${currentUser.username}`;
            const storedPlan = localStorage.getItem(planKey);
            if (storedPlan) {
                try {
                    const parsedPlan = JSON.parse(storedPlan);
                    if (Array.isArray(parsedPlan)) { setDietPlan(parsedPlan); }
                } catch (e) { console.error("Error parsing diet plan on modal close", e); }
            }
        }
    };
    
    const handleLogWeight = (weight: number, date: Date) => {
      if (!currentUser || isNaN(weight) || weight <= 0) { toast({ title: "Invalid Input", description: "Please enter a valid weight.", variant: "destructive" }); return; }
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
      toast({ title: "Weight Logged", description: `Weight for the week of ${format(date, 'PPP')} has been saved.` });
    };

  const handleUpdateWeightLog = (dateKey: string, newWeight: number) => {
    if (!currentUser || isNaN(newWeight) || newWeight <= 0) { toast({ title: "Invalid Input", description: "Please enter a valid weight.", variant: "destructive" }); return; }
    setWeightLogs(prevLogs => {
      const logIndex = prevLogs.findIndex(log => log.date === dateKey);
      if (logIndex > -1) {
        const updatedLogs = [...prevLogs];
        updatedLogs[logIndex] = { ...updatedLogs[logIndex], weight: newWeight };
        toast({ title: "Weight Updated" });
        return updatedLogs.sort((a,b) => a.date.localeCompare(b.date));
      }
      return prevLogs;
    });
  };

  const handleDeleteWeightLog = (dateKey: string) => {
    if (!currentUser) return;
    setWeightLogs(prevLogs => prevLogs.filter(log => log.date !== dateKey));
    toast({ title: "Weight Deleted" });
  };
  const handleSetGoalWeight = (goal: number) => {
    if (!isNaN(goal) && goal > 0) {
      if (currentUser?.username) { setGoalWeight(goal); toast({ title: "Goal Set!" }); }
    } else { toast({ title: "Invalid Input", variant: "destructive" }); }
  };
  const handleSetHeight = (h: number) => {
    if (!isNaN(h) && h > 0) {
      if (currentUser?.username) { setHeight(h); toast({ title: "Height Set!" }); }
    } else { toast({ title: "Invalid Input", variant: "destructive" }); }
  };
  const handleSetDateOfBirth = (dob: string) => {
    if (dob && currentUser?.username) { setDateOfBirth(dob); toast({ title: "Date of Birth Set" }); }
  };
  const handleSetGender = (g: Gender) => {
    if (g && currentUser?.username) { setGender(g); toast({ title: "Gender Set!" }); }
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="max-w-5xl mx-auto shadow-lg border-0 bg-transparent">
        <CardHeader className="text-center">
            <BrainCircuit className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-bold">Hello, <span className="text-primary">{currentUser?.username}</span>!</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
                Control Health, Wealth, Growth, Direction — Life Aligns.
            </CardDescription>
            <p className="text-md text-muted-foreground pt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </CardHeader>
        <CardContent>
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => router.push('/workout-tracker')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Health</CardTitle>
                  <HeartPulse className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{productivityStats.latestConsistency}%</div>
                  <p className="text-xs text-muted-foreground">Workout Consistency</p>
                  {productivityStats.consistencyChange !== 0 && (
                    <p className={cn("text-xs text-muted-foreground mt-1 flex items-center", productivityStats.consistencyChange > 0 ? "text-emerald-500" : "text-red-500")}>
                        {productivityStats.consistencyChange > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        {productivityStats.consistencyChange.toFixed(1)} points vs yesterday
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => router.push('/deep-work')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Wealth</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{productivityStats.todayDeepWorkHours.toFixed(1)} hrs</div>
                  <p className="text-xs text-muted-foreground">Today's Deep Work</p>
                  {productivityStats.deepWorkChange !== 0 && (
                    <p className={cn("text-xs text-muted-foreground mt-1 flex items-center", productivityStats.deepWorkChange > 0 ? "text-emerald-500" : "text-red-500")}>
                        {productivityStats.deepWorkChange > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        {Math.abs(productivityStats.deepWorkChange).toFixed(0)}% vs yesterday
                    </p>
                  )}
                </CardContent>
              </Card>

              <Popover>
                <PopoverTrigger asChild>
                  <Card className="cursor-pointer hover:bg-muted/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Growth</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{productivityStats.todayUpskillHours.toFixed(1)} hrs</div>
                      <p className="text-xs text-muted-foreground">Today's Learning</p>
                      {productivityStats.upskillChange !== 0 && (
                        <p className={cn("text-xs text-muted-foreground mt-1 flex items-center", productivityStats.upskillChange > 0 ? "text-emerald-500" : "text-red-500")}>
                            {productivityStats.upskillChange > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                            {Math.abs(productivityStats.upskillChange).toFixed(0)}% vs yesterday
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </PopoverTrigger>
                {productivityStats.overallNextMilestone && (
                    <PopoverContent className="w-60" align="end">
                        <div className="space-y-2">
                            <h4 className="font-medium leading-none">Next Milestone</h4>
                            <p className="text-sm text-muted-foreground">
                                Your closest goal is for <span className="font-bold text-foreground">{productivityStats.overallNextMilestone.topic}</span>.
                            </p>
                            <div className="grid gap-2">
                                <div className="grid grid-cols-2 items-center">
                                    <span className="text-sm text-muted-foreground">Progress Needed:</span>
                                    <span className="font-bold text-right">{productivityStats.overallNextMilestone.progressNeeded} {productivityStats.overallNextMilestone.unit}</span>
                                </div>
                                <div className="grid grid-cols-2 items-center">
                                    <span className="text-sm text-muted-foreground">Est. Date:</span>
                                    <span className="font-bold text-right">{productivityStats.overallNextMilestone.date}</span>
                                </div>
                            </div>
                        </div>
                    </PopoverContent>
                )}
              </Popover>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Direction</CardTitle>
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${dailyStats.direction ? 'text-green-500' : ''}`}>{dailyStats.direction ? 'Aligned' : 'Pending'}</div>
                  <p className="text-xs text-muted-foreground">Daily Planning & Tracking</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                <div className="lg:col-span-3">
                    <Card className="h-full bg-card/50">
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-primary">Your Productivity Snapshot</CardTitle>
                            </div>
                             <Button variant="outline" size="icon" onClick={() => setIsStatsModalOpen(true)}>
                                <BarChart3 className="h-4 w-4" />
                                <span className="sr-only">Open Stats Overview</span>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1 flex flex-col items-center justify-center text-center p-4 rounded-lg bg-muted/50">
                                    <p className="text-muted-foreground">Productivity Level</p>
                                    {productivityStats.currentLevel ? (
                                        <>
                                            <h3 className="text-4xl font-bold text-primary">{productivityStats.currentLevel.level}</h3>
                                            <p className="text-sm">{productivityStats.currentLevel.description}</p>
                                            <p className="text-xs text-muted-foreground">{productivityStats.currentLevel.zone}</p>
                                        </>
                                    ) : (
                                        <p className="text-muted-foreground mt-2">Not enough data</p>
                                    )}
                                    <Separator className="my-4" />
                                    <p className="text-muted-foreground">Total Productive Hours</p>
                                    <h3 className="text-2xl font-bold">{productivityStats.totalProductiveHours.toFixed(2)}</h3>
                                    <p className="text-xs text-muted-foreground mb-1">per day (average)</p>
                                    {productivityStats.avgProductiveHoursChange !== 0 && (
                                        <p className={cn("text-xs text-muted-foreground flex items-center justify-center", productivityStats.avgProductiveHoursChange > 0 ? "text-emerald-500" : "text-red-500")}>
                                            {productivityStats.avgProductiveHoursChange > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                                            {Math.abs(productivityStats.avgProductiveHoursChange).toFixed(0)}% vs previous average
                                        </p>
                                    )}
                                </div>

                                <div className="md:col-span-2 space-y-4">
                                    <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp /> Learning Progress</h4>
                                        <div className="text-sm">
                                            {Object.keys(productivityStats.learningStats).length > 0 ? (
                                                <Accordion type="single" collapsible className="w-full space-y-2">
                                                    {Object.entries(productivityStats.learningStats).map(([topic, stats]: [string, any]) => (
                                                        <AccordionItem key={topic} value={topic} className="p-3 rounded-md bg-muted/30 border-0">
                                                            <AccordionTrigger className="py-0 text-left hover:no-underline">
                                                                <div className="flex flex-col items-start">
                                                                    <h5 className="font-bold text-foreground text-base">{topic}</h5>
                                                                    <div className="text-xs text-muted-foreground font-normal">
                                                                        Progress: {stats.totalProgress.toLocaleString()} / {stats.goalValue.toLocaleString()} {stats.unit.split('/')[0]}
                                                                    </div>
                                                                </div>
                                                                {stats.requiredDailyRate > 0 && (
                                                                    <div className="text-right text-xs ml-4 flex-shrink-0">
                                                                        <div className="font-semibold text-foreground whitespace-nowrap">Needed Today</div>
                                                                        <div className="text-muted-foreground whitespace-nowrap">
                                                                            {stats.requiredDailyRate.toFixed(1)} {stats.unit.split('/')[0]}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </AccordionTrigger>
                                                            <AccordionContent className="pt-2">
                                                                <Progress value={(stats.totalProgress / stats.goalValue) * 100} className="h-2 my-2" />
                                                                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                                                    {stats.nextMilestone && (
                                                                        <div className="space-y-1">
                                                                            <div className="font-semibold">Next Milestone ({stats.nextMilestone.percent}%)</div>
                                                                            <div>Est. Date: <span className="font-medium text-foreground">{stats.nextMilestone.date}</span></div>
                                                                            <div>Days Left: <span className="font-medium text-foreground">{stats.nextMilestone.daysRemaining}</span></div>
                                                                            <div>Needed: <span className="font-medium text-foreground">{stats.nextMilestone.progressNeeded} {stats.nextMilestone.unit}</span></div>
                                                                        </div>
                                                                    )}
                                                                    <div className="space-y-1">
                                                                    <div className="font-semibold">Goal Completion</div>
                                                                    {stats.completion ? (
                                                                            <>
                                                                                <div>Est. Date: <span className="font-medium text-foreground">{stats.completion.date}</span></div>
                                                                                <div>Days Left: <span className="font-medium text-foreground">{stats.completion.daysRemaining}</span></div>
                                                                            </>
                                                                    ) : (stats.totalProgress >= stats.goalValue) ? <div className="text-green-500 font-bold">Completed!</div> : <div className="text-muted-foreground">Not enough data to project.</div>}
                                                                    </div>
                                                                </div>
                                                                <div className="mt-2 pt-2 border-t text-xs">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-muted-foreground">Learning Speed</span>
                                                                        <span className="font-medium text-foreground">{stats.speed.toFixed(1)} {stats.unit}</span>
                                                                    </div>
                                                                </div>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    ))}
                                                </Accordion>
                                            ) : (
                                                <p className="text-sm text-muted-foreground text-center py-2">No learning stats yet. Log progress and duration in the Upskill page.</p>
                                            )}
                                        </div>
                                    </div>
                                    <Separator className="my-2" />
                                    <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-2"><Share2 /> Personal Branding</h4>
                                        {productivityStats.brandingStatus && (
                                            productivityStats.brandingStatus.status === 'in_progress' ? (
                                                <div className="text-sm cursor-pointer hover:bg-muted/50 p-2 rounded-md" onClick={() => router.push('/personal-branding')}>
                                                    <p>Next up: <span className="font-bold text-foreground">{productivityStats.brandingStatus.taskName}</span></p>
                                                    <p>Current Stage: <span className="font-bold text-foreground">{productivityStats.brandingStatus.stage} ({productivityStats.brandingStatus.progress})</span></p>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-muted-foreground p-2">
                                                    <p>{productivityStats.brandingStatus.message}</p>
                                                    <p className="text-xs mt-1">{productivityStats.brandingStatus.subMessage}</p>
                                                    {productivityStats.brandingStatus.eligibleFocusAreas.length > 0 && (
                                                        <div className="mt-2">
                                                            <p className="font-medium text-foreground text-xs">Eligible Areas:</p>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {productivityStats.brandingStatus.eligibleFocusAreas.map(area => <Badge key={area} variant="secondary" className="text-xs">{area}</Badge>)}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card className="h-full bg-card/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <Target /> Weight Goal
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Button onClick={() => setIsWeightChartModalOpen(true)} className="w-full text-xs xl:text-sm">
                                    <LineChartIcon className="mr-2 h-4 w-4" />
                                    Chart & Goal
                                </Button>
                                <Button onClick={() => handleDietModalOpenChange(true)} variant="outline" className="w-full text-xs xl:text-sm">
                                    <BookCopy className="mr-2 h-4 w-4" />
                                    Diet Plan
                                </Button>
                            </div>
                            {(productivityStats.projectionSummary || productivityStats.latestConsistency || productivityStats.healthMetrics.averageIntake || productivityStats.healthMetrics.maintenanceCalories) ? (
                                <div className="space-y-4 pt-4 border-t">
                                    {productivityStats.projectionSummary && (
                                        <>
                                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                                <div>
                                                    <div className="text-muted-foreground">Current</div>
                                                    <div className="font-bold text-lg">{productivityStats.projectionSummary.currentWeight}</div>
                                                    <div className="text-xs text-muted-foreground">kg/lb</div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground">Goal</div>
                                                    <div className="font-bold text-lg">{productivityStats.projectionSummary.goalWeight}</div>
                                                    <div className="text-xs text-muted-foreground">kg/lb</div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground">{productivityStats.projectionSummary.weightDifference > 0 ? "To Gain" : "To Lose"}</div>
                                                    <div className={`font-bold text-lg ${productivityStats.projectionSummary.weightDifference > 0 ? "text-orange-500" : "text-green-500"}`}>{Math.abs(productivityStats.projectionSummary.weightDifference)}</div>
                                                    <div className="text-xs text-muted-foreground">kg/lb</div>
                                                </div>
                                            </div>

                                            <Separator />
                                            
                                            <div className="space-y-2 text-sm">
                                            {productivityStats.projectionSummary.averageWeeklyChange !== undefined && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4" /> Avg. Weekly Change</span>
                                                    <span className={`font-bold ${productivityStats.projectionSummary.averageWeeklyChange > 0 ? "text-orange-500" : productivityStats.projectionSummary.averageWeeklyChange < 0 ? "text-green-500" : ""}`}>
                                                        {productivityStats.projectionSummary.averageWeeklyChange > 0 ? '+' : ''}{productivityStats.projectionSummary.averageWeeklyChange.toFixed(2)} kg/lb
                                                    </span>
                                                </div>
                                            )}
                                            {productivityStats.projectionSummary.projectedDate && (
                                                <>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Next Week Est.</span>
                                                    <span className="font-bold">{productivityStats.projectionSummary.nextProjectedWeight} kg/lb</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground pl-6">Days Remaining</span>
                                                    <span className="font-bold">{productivityStats.projectionSummary.daysToNextWeek > 0 ? `${productivityStats.projectionSummary.daysToNextWeek} days` : 'Past'}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 mt-2 border-t">
                                                    <span className="text-muted-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Est. Goal Date</span>
                                                    <span className="font-bold">{productivityStats.projectionSummary.projectedDate}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground pl-6">Days Remaining</span>
                                                    <span className="font-bold">{productivityStats.projectionSummary.daysToGoal > 0 ? `${productivityStats.projectionSummary.daysToGoal} days` : 'N/A'}</span>
                                                </div>
                                                </>
                                            )}
                                            </div>
                                        </>
                                    )}
                                    
                                    {(productivityStats.healthMetrics.averageIntake || productivityStats.healthMetrics.maintenanceCalories) && (
                                    <div className="space-y-2 text-sm pt-4 border-t">
                                        {productivityStats.healthMetrics.averageIntake && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground flex items-center gap-2"><Flame className="h-4 w-4" /> Current Avg. Daily Intake</span>
                                                <span className="font-bold">{productivityStats.healthMetrics.averageIntake} kcal</span>
                                            </div>
                                        )}
                                        {productivityStats.healthMetrics.maintenanceCalories && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground flex items-center gap-2"><HeartPulse className="h-4 w-4" /> Est. Maintenance</span>
                                                <span className="font-bold">{productivityStats.healthMetrics.maintenanceCalories} kcal</span>
                                            </div>
                                        )}
                                        {productivityStats.healthMetrics.averageIntake && productivityStats.healthMetrics.maintenanceCalories && productivityStats.healthMetrics.averageIntake < productivityStats.healthMetrics.maintenanceCalories && (
                                            <p className="text-xs text-orange-500 mt-2">
                                                ⚠️ You’re eating below maintenance — watch for fatigue, low mood, or muscle loss.
                                            </p>
                                        )}
                                    </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Log your weight and set a goal on the Workout Tracker page to see your projection here.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {slots.map((slot) => {
                const activities = todaysSchedule[slot.name];
                return (
                  <Card 
                    key={slot.name} 
                    className={`transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col ${
                      currentSlot === slot.name 
                      ? 'ring-2 ring-primary shadow-2xl bg-card' 
                      : 'shadow-md bg-card/60'
                    }`}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div>
                        <CardTitle className="text-lg font-medium">{slot.name}</CardTitle>
                        <CardDescription>{slot.time}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentSlot === slot.name ? (
                          <div className="font-mono text-lg text-primary/80 tracking-wider animate-subtle-pulse">
                            {remainingTime}
                          </div>
                        ) : (
                          slot.icon
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-grow justify-between min-h-[8rem]">
                      <div className="flex-grow space-y-2 mb-2">
                        {activities && activities.length > 0 ? (
                          activities.map((activity) => (
                            <div key={activity.id} className="p-2.5 rounded-md bg-card/70 shadow-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div
                                  className={cn("flex items-start gap-3 flex-grow", activity.completed ? "opacity-60" : "cursor-pointer")}
                                  onClick={() => handleActivityClick(activity)}
                                >
                                  <div className="pt-0.5">{activityIcons[activity.type]}</div>
                                  <div className="flex-grow">
                                    <p className={cn("font-semibold text-foreground", activity.completed && "line-through")}>
                                      {activity.details}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {activity.type === 'deepwork' ? 'Deep Work' : activity.type === 'branding' ? 'Personal Branding' : activity.type}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center flex-shrink-0">
                                  <Checkbox
                                      id={`cb-${activity.id}`}
                                      checked={!!activity.completed}
                                      onCheckedChange={() => handleToggleComplete(slot.name, activity.id)}
                                  />
                                  <Button variant="ghost" size="icon" onClick={() => handleRemoveActivity(slot.name, activity.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex-grow flex items-center justify-center h-full">
                            {currentSlot === slot.name ? (
                              <div className="text-center">
                                <p className="text-lg text-muted-foreground">Current Focus</p>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center px-4">
                                Plan an activity for this block.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {(!activities || activities.length < 2) && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="mt-auto self-end h-8 w-8 rounded-full">
                                <PlusCircle className="h-5 w-5" />
                                <span className="sr-only">Add Activity</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-52 p-2" align="end" side="top">
                              <div className="grid gap-1">
                                <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleAddActivity(slot.name, 'workout')}>
                                  <Dumbbell className="h-4 w-4 mr-2" />
                                  Add Workout
                                </Button>
                                <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleAddActivity(slot.name, 'upskill')}>
                                  <BookOpenCheck className="h-4 w-4 mr-2" />
                                  Add Upskill
                                </Button>
                                <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleAddActivity(slot.name, 'deepwork')}>
                                  <Briefcase className="h-4 w-4 mr-2" />
                                  Add Deep Work
                                </Button>
                                <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleAddActivity(slot.name, 'branding')}>
                                  <Share2 className="h-4 w-4 mr-2" />
                                  Add Branding
                                </Button>
                                <Separator className="my-1" />
                                <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleAddActivity(slot.name, 'planning')}>
                                  <ClipboardList className="h-4 w-4 mr-2" />
                                  Add Planning
                                </Button>
                                <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleAddActivity(slot.name, 'tracking')}>
                                  <ClipboardCheck className="h-4 w-4 mr-2" />
                                  Add Tracking
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
        </CardContent>
      </Card>
      
      <ActivityHeatmap schedule={schedule} />

      {currentUser && (
        <TodaysWorkoutModal
            isOpen={isTodaysWorkoutModalOpen}
            onOpenChange={setIsTodaysWorkoutModalOpen}
            todaysExercises={todaysExercises}
            muscleGroupsForDay={todaysMuscleGroups}
            allWorkoutLogs={allWorkoutLogs}
        />
      )}

      {currentUser && (
        <TodaysLearningModal
            isOpen={isLearningModalOpen}
            onOpenChange={setIsLearningModalOpen}
            tasks={learningModalProps.tasks}
            title={learningModalProps.title}
            description={learningModalProps.description}
            pageType={learningModalProps.pageType}
        />
      )}

      <WeightChartModal
        isOpen={isWeightChartModalOpen}
        onOpenChange={setIsWeightChartModalOpen}
        weightLogs={weightLogs}
        goalWeight={goalWeight}
        height={height}
        dateOfBirth={dateOfBirth}
        gender={gender}
        onLogWeight={handleLogWeight}
        onUpdateWeightLog={handleUpdateWeightLog}
        onDeleteWeightLog={handleDeleteWeightLog}
        onSetGoalWeight={handleSetGoalWeight}
        onSetHeight={handleSetHeight}
        onSetDateOfBirth={handleSetDateOfBirth}
        onSetGender={handleSetGender}
      />

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
      />
    </div>
  );
}

export default function Page() {
    return ( <AuthGuard> <HomePageContent /> </AuthGuard> );
}

    
