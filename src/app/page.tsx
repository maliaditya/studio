
"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Sunrise, Sun, Sunset, Moon, MoonStar, CloudSun, PlusCircle, Trash2, Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, BarChart3, Clock, TrendingUp, Zap } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format, getDay, getISOWeek, differenceInDays, addDays, parseISO, subYears } from 'date-fns';
import { useRouter } from 'next/navigation';
import { TodaysWorkoutModal } from '@/components/TodaysWorkoutModal';
import { TodaysLearningModal } from '@/components/TodaysLearningModal';
import type { AllWorkoutPlans, ExerciseDefinition, WorkoutMode, WorkoutExercise, FullSchedule, Activity, ActivityType, DatedWorkout, TopicGoal, WorkoutPlan, ExerciseCategory } from '@/types/workout';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getExercisesForDay } from '@/lib/workoutUtils';

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
      "Legs": ["Walking Lunges (Barbell)", "Squats (Barbell)", "Hamstring machine", "Quads Machine"]
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
      "Legs": ["Walking Lunges (Barbell)", "Squats (Barbell)", "Hamstring machine", "Quads Machine"]
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
  const [topicGoals, setTopicGoals] = useState<Record<string, TopicGoal>>({});

  // State for TodaysWorkoutModal
  const [isTodaysWorkoutModalOpen, setIsTodaysWorkoutModalOpen] = useState(false);
  const [todaysExercises, setTodaysExercises] = useState<WorkoutExercise[]>([]);
  const [todaysMuscleGroups, setTodaysMuscleGroups] = useState<string[]>([]);
  
  // State for TodaysLearningModal
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [learningModalProps, setLearningModalProps] = useState({
      tasks: [] as WorkoutExercise[],
      title: '',
      description: '',
      pageType: 'upskill' as 'upskill' | 'deepwork'
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
                const activity = slotContent as Activity;
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

  // Load workout, upskill, and deepwork data
  useEffect(() => {
    if (currentUser?.username) {
        const username = currentUser.username;
        const defsKey = `exerciseDefinitions_${username}`;
        const plansKey = `workoutPlans_${username}`;
        const modeKey = `workoutMode_${username}`;
        const logsKey = `allWorkoutLogs_${username}`;
        const upskillLogsKey = `upskill_logs_${username}`;
        const deepworkLogsKey = `deepwork_logs_${username}`;
        const goalsKey = `upskill_topic_goals_${username}`;


        const storedMode = localStorage.getItem(modeKey);
        setWorkoutMode((storedMode as WorkoutMode) || 'two-muscle');

        try {
            const storedPlans = localStorage.getItem(plansKey);
            setWorkoutPlans(storedPlans ? JSON.parse(storedPlans) : INITIAL_PLANS);
        } catch (e) {
            setWorkoutPlans(INITIAL_PLANS);
        }

        try {
            const storedDefinitions = localStorage.getItem(defsKey);
            setExerciseDefinitions(storedDefinitions ? JSON.parse(storedDefinitions) : []);
        } catch (e) {
            setExerciseDefinitions([]);
        }

        try {
            const storedLogs = localStorage.getItem(logsKey);
            setAllWorkoutLogs(storedLogs ? JSON.parse(storedLogs) : []);
        } catch (e) { console.error("Error parsing workout logs", e); setAllWorkoutLogs([]); }
        
        try {
            const storedUpskillLogs = localStorage.getItem(upskillLogsKey);
            setAllUpskillLogs(storedUpskillLogs ? JSON.parse(storedUpskillLogs) : []);
        } catch (e) { console.error("Error parsing upskill logs", e); setAllUpskillLogs([]); }

        try {
            const storedDeepWorkLogs = localStorage.getItem(deepworkLogsKey);
            setAllDeepWorkLogs(storedDeepWorkLogs ? JSON.parse(storedDeepWorkLogs) : []);
        } catch (e) { console.error("Error parsing deep work logs", e); setAllDeepWorkLogs([]); }
        
        try {
            const storedGoals = localStorage.getItem(goalsKey);
            setTopicGoals(storedGoals ? JSON.parse(storedGoals) : {});
        } catch (e) { console.error("Error parsing topic goals", e); setTopicGoals({}); }

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
    }

    const newActivity: Activity = {
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

  const handleActivityClick = (activity: Activity) => {
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

    const productivityStats = useMemo(() => {
        const calculateAverageDuration = (logs: DatedWorkout[], durationField: 'reps' | 'weight') => {
            const dailyDurations: Record<string, number> = {};
            logs.forEach(log => {
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
                        daysRemaining: daysToMilestone
                    };
                }

                const speed = data.totalDuration > 0 ? (totalProgress / data.totalDuration) * 60 : 0;

                topicStats[topic] = {
                    speed,
                    unit: `${goal.goalType}/hr`,
                    totalProgress: Math.round(totalProgress),
                    remainingProgress: Math.round(remainingProgress),
                    goalValue: goal.goalValue,
                    completion: completionStats,
                    nextMilestone: milestoneStats,
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

        const avgUpskillHours = avgUpskillDuration / 60;
        const avgDeepWorkHours = avgDeepWorkDuration / 60;

        const currentLevel = productivityLevels.find(l => totalProductiveMinutes >= l.min && totalProductiveMinutes < l.max) || null;

        const learningStats = calculateLearningStats(allUpskillLogs, topicGoals);

        const workoutStats = calculateWorkoutStats(allWorkoutLogs);

        const consistencyData: { score: number }[] = [];
        if (oneYearAgo && today) {
            const workoutDates = new Set(allWorkoutLogs.filter(log => log.exercises.some(ex => ex.loggedSets.length > 0)).map(log => log.date));
            let score = 0.5;
            for (let d = new Date(oneYearAgo); d <= today; d = addDays(d, 1)) {
                const dateKey = format(d, 'yyyy-MM-dd');
                if (workoutDates.has(dateKey)) {
                    score += (1 - score) * 0.1;
                } else {
                    score *= 0.95;
                }
                consistencyData.push({ score: Math.round(score * 100) });
            }
        }
        const latestConsistency = consistencyData.length > 0 ? consistencyData[consistencyData.length - 1].score : 0;


        return {
            avgUpskillDuration,
            avgDeepWorkDuration,
            avgUpskillHours,
            avgDeepWorkHours,
            totalProductiveHours,
            currentLevel,
            learningStats,
            workoutStats,
            latestConsistency,
        };
    }, [allUpskillLogs, allDeepWorkLogs, topicGoals, allWorkoutLogs, oneYearAgo, today]);

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
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={cn( "rounded-lg p-3 text-center transition-all duration-300", dailyStats.health ? "bg-green-100 dark:bg-green-900/50 border border-green-500/50" : "bg-muted/50" )}>
                  <h3 className="font-semibold text-foreground">Health</h3>
                  <p className={cn("text-xs font-medium", dailyStats.health ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
                      {dailyStats.health ? "Complete" : "Pending"}
                  </p>
              </div>
              <div className={cn( "rounded-lg p-3 text-center transition-all duration-300", dailyStats.wealth ? "bg-green-100 dark:bg-green-900/50 border border-green-500/50" : "bg-muted/50" )}>
                  <h3 className="font-semibold text-foreground">Wealth</h3>
                  <p className={cn("text-xs font-medium", dailyStats.wealth ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
                      {dailyStats.wealth ? "Complete" : "Pending"}
                  </p>
              </div>
              <div className={cn( "rounded-lg p-3 text-center transition-all duration-300", dailyStats.growth ? "bg-green-100 dark:bg-green-900/50 border border-green-500/50" : "bg-muted/50" )}>
                  <h3 className="font-semibold text-foreground">Growth</h3>
                  <p className={cn("text-xs font-medium", dailyStats.growth ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
                      {dailyStats.growth ? "Complete" : "Pending"}
                  </p>
              </div>
              <div className={cn( "rounded-lg p-3 text-center transition-all duration-300", dailyStats.direction ? "bg-green-100 dark:bg-green-900/50 border border-green-500/50" : "bg-muted/50" )}>
                  <h3 className="font-semibold text-foreground">Direction</h3>
                  <p className={cn("text-xs font-medium", dailyStats.direction ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
                      {dailyStats.direction ? "Complete" : "Pending"}
                  </p>
              </div>
            </div>

            <Card className="mb-6 bg-card/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary"><BarChart3 /> Your Productivity Snapshot</CardTitle>
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
                            <p className="text-xs text-muted-foreground">per day (average)</p>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><Clock /> Daily Averages</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                                        <span className="flex items-center gap-2 text-muted-foreground"><BookOpenCheck className="h-4 w-4" /> Learning</span>
                                        <span className="font-semibold">{productivityStats.avgUpskillHours.toFixed(2)} hr</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                                        <span className="flex items-center gap-2 text-muted-foreground"><Briefcase className="h-4 w-4" /> Deep Work</span>
                                        <span className="font-semibold">{productivityStats.avgDeepWorkHours.toFixed(2)} hr</span>
                                    </div>
                                </div>
                            </div>
                            
                            {(productivityStats.workoutStats.avgVolume > 0 || productivityStats.latestConsistency > 0) && (
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Dumbbell className="h-4 w-4 text-destructive" /> Workout Stats</h4>
                                    <div className="space-y-2 text-sm">
                                        {productivityStats.workoutStats.avgVolume > 0 && (
                                            <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                                                <span className="flex items-center gap-2 text-muted-foreground"><BarChart3 className="h-4 w-4" /> Avg. Daily Volume</span>
                                                <span className="font-semibold">{productivityStats.workoutStats.avgVolume.toLocaleString()} kg/lb</span>
                                            </div>
                                        )}
                                        {productivityStats.latestConsistency > 0 && (
                                            <div className="flex justify-between items-center p-2 rounded bg-muted/30">
                                                <span className="flex items-center gap-2 text-muted-foreground"><Zap className="h-4 w-4" /> Consistency</span>
                                                <span className="font-semibold">{productivityStats.latestConsistency}%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

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
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-2">
                                                        <Progress value={(stats.totalProgress / stats.goalValue) * 100} className="h-2 my-2" />
                                                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                                            {stats.nextMilestone && (
                                                                <div className="space-y-1">
                                                                    <div className="font-semibold">Next Milestone ({stats.nextMilestone.percent}%)</div>
                                                                    <div>Est. Date: <span className="font-medium text-foreground">{stats.nextMilestone.date}</span></div>
                                                                    <div>Days Left: <span className="font-medium text-foreground">{stats.nextMilestone.daysRemaining}</span></div>
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
                        </div>
                    </div>
                </CardContent>
            </Card>

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
                                      {activity.type === 'deepwork' ? 'Deep Work' : activity.type}
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
    </div>
  );
}

export default function Page() {
    return ( <AuthGuard> <HomePageContent /> </AuthGuard> );
}

    

    
