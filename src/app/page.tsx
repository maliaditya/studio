
"use client";

import React, { useState, useEffect, FormEvent, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Dumbbell, ListChecks, Edit3, Save, X, ChevronRight, CalendarIcon, GripVertical, TrendingUp, Filter as FilterIcon, Loader2, Info, Youtube, Settings, ChevronDown, ChevronUp, Target, CalendarDays, Plus, Minus, Activity, LineChart as LineChartIcon, BookCopy, Flame, HeartPulse, Utensils } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, getDay, getWeekOfMonth, isMonday, getYear, getISOWeek, parse, getISOWeekYear, addWeeks, startOfISOWeek, setISOWeek, differenceInDays, subYears, addDays, differenceInYears } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, exerciseCategories, WorkoutMode, AllWorkoutPlans, WeightLog, Gender, UserDietPlan } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { ExerciseProgressModal } from '@/components/ExerciseProgressModal';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { WorkoutHeatmap } from '@/components/WorkoutHeatmap';
import { WorkoutPlanModal } from '@/components/WorkoutPlanModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from '@/components/ui/switch';
import { WeightChartModal } from '@/components/WeightChartModal';
import { DietPlanModal } from '@/components/DietPlanModal';


const DEFAULT_TARGET_SETS = 4;
const DEFAULT_TARGET_REPS = "8-12";
const DEFAULT_EXERCISE_CATEGORY: ExerciseCategory = "Other";

// A reduced default list to fit within Vercel Edge Config free tier limits.
const DEFAULT_EXERCISE_DEFINITIONS: ExerciseDefinition[] = [
  // Chest
  { id: 'def_chest_01', name: "Flat Barbell Bench Press", category: "Chest" },
  { id: 'def_chest_02', name: "Incline Dumbbell Press", category: "Chest" },
  { id: 'def_chest_03', name: "Cable Fly", category: "Chest" },
  { id: 'def_chest_04', name: "Dumbbell Pullovers", category: "Chest" },

  // Triceps
  { id: 'def_triceps_01', name: "Close-Grip Barbell Bench Press", category: "Triceps" },
  { id: 'def_triceps_02', name: "Overhead Dumbbell Extension", category: "Triceps" },
  { id: 'def_triceps_03', name: "Rope Pushdown", category: "Triceps" },
  { id: 'def_triceps_04', name: "Dumbbell Kickback", category: "Triceps" },

  // Back
  { id: 'def_back_01', name: "Lat Pulldown", category: "Back" },
  { id: 'def_back_02', name: "Barbell Row", category: "Back" },
  { id: 'def_back_03', name: "1-Arm Dumbbell Row", category: "Back" },
  { id: 'def_back_04', name: "DeadLifts", category: "Back" },
  
  // Biceps
  { id: 'def_biceps_01', name: "Standing dumbbell curls", category: "Biceps" },
  { id: 'def_biceps_02', name: "Hammer Curl (Dumbbell)", category: "Biceps" },
  { id: 'def_biceps_03', name: "Preacher Curls Bar", category: "Biceps" },
  { id: 'def_biceps_04', name: "Cable Curls", category: "Biceps" },

  // Shoulders
  { id: 'def_shoulders_01', name: "Seated Dumbbell Shoulder Press", category: "Shoulders" },
  { id: 'def_shoulders_02', name: "Standing Dumbbell Lateral Raise", category: "Shoulders" },
  { id: 'def_shoulders_03', name: "Face Pulls", category: "Shoulders" },
  { id: 'def_shoulders_04', name: "Shrugs", category: "Shoulders" },

  // Legs
  { id: 'def_legs_01', name: "Squats (Barbell)", category: "Legs" },
  { id: 'def_legs_02', name: "Leg Press", category: "Legs" },
  { id: 'def_legs_03', name: "Walking Lunges (Barbell)", category: "Legs" },
  { id: 'def_legs_04', name: "Hamstring machine", category: "Legs" },
  { id: 'def_legs_05', name: "Calf Raises", category: "Legs" },
];

const INITIAL_PLANS: AllWorkoutPlans = {
  W1: {
    Chest: ["Flat Barbell Bench Press", "Incline Dumbbell Press"],
    Triceps: ["Close-Grip Barbell Bench Press", "Overhead Dumbbell Extension"],
    Back: ["Lat Pulldown", "Barbell Row"],
    Biceps: ["Standing dumbbell curls", "Hammer Curl (Dumbbell)"],
    Shoulders: ["Seated Dumbbell Shoulder Press", "Face Pulls"],
    Legs: ["Squats (Barbell)", "Leg Press"]
  },
  W2: {
    Chest: ["Cable Fly", "Dumbbell Pullovers"],
    Triceps: ["Rope Pushdown", "Dumbbell Kickback"],
    Back: ["1-Arm Dumbbell Row", "DeadLifts"],
    Biceps: ["Preacher Curls Bar", "Cable Curls"],
    Shoulders: ["Standing Dumbbell Lateral Raise", "Shrugs"],
    Legs: ["Walking Lunges (Barbell)", "Hamstring machine"]
  },
  W3: { // Same as W2
    Chest: ["Cable Fly", "Dumbbell Pullovers"],
    Triceps: ["Rope Pushdown", "Dumbbell Kickback"],
    Back: ["1-Arm Dumbbell Row", "DeadLifts"],
    Biceps: ["Preacher Curls Bar", "Cable Curls"],
    Shoulders: ["Standing Dumbbell Lateral Raise", "Shrugs"],
    Legs: ["Walking Lunges (Barbell)", "Hamstring machine"]
  },
  W4: { // Same as W1
    Chest: ["Flat Barbell Bench Press", "Incline Dumbbell Press"],
    Triceps: ["Close-Grip Barbell Bench Press", "Overhead Dumbbell Extension"],
    Back: ["Lat Pulldown", "Barbell Row"],
    Biceps: ["Standing dumbbell curls", "Hammer Curl (Dumbbell)"],
    Shoulders: ["Seated Dumbbell Shoulder Press", "Face Pulls"],
    Legs: ["Squats (Barbell)", "Leg Press"]
  },
  W5: { // One-muscle day, more exercises
    Chest: ["Flat Barbell Bench Press", "Incline Dumbbell Press", "Cable Fly"],
    Back: ["Lat Pulldown", "Barbell Row", "1-Arm Dumbbell Row"],
    Legs: ["Squats (Barbell)", "Leg Press", "Hamstring machine", "Calf Raises"],
    Shoulders: ["Seated Dumbbell Shoulder Press", "Standing Dumbbell Lateral Raise", "Face Pulls"],
    Biceps: ["Standing dumbbell curls", "Hammer Curl (Dumbbell)", "Preacher Curls Bar"],
    Triceps: ["Close-Grip Barbell Bench Press", "Overhead Dumbbell Extension", "Rope Pushdown"],
  },
  W6: { // One-muscle day, alternative exercises
    Chest: ["Incline Dumbbell Press", "Dumbbell Pullovers", "Cable Fly"],
    Back: ["Barbell Row", "1-Arm Dumbbell Row", "DeadLifts"],
    Legs: ["Leg Press", "Walking Lunges (Barbell)", "Hamstring machine", "Calf Raises"],
    Shoulders: ["Standing Dumbbell Lateral Raise", "Face Pulls", "Shrugs"],
    Biceps: ["Hammer Curl (Dumbbell)", "Preacher Curls Bar", "Cable Curls"],
    Triceps: ["Overhead Dumbbell Extension", "Rope Pushdown", "Dumbbell Kickback"],
  }
};


// Schedule for "Two Muscles / Day" mode
const dailyMuscleGroups: Record<number, string[]> = {
  1: ["Chest", "Triceps"], // Monday
  2: ["Back", "Biceps"],   // Tuesday
  3: ["Shoulders", "Legs"],// Wednesday
  4: ["Chest", "Triceps"], // Thursday
  5: ["Back", "Biceps"],   // Friday
  6: ["Shoulders", "Legs"], // Saturday
  0: [], // Sunday
};

// Schedule for "One Muscle / Day" mode
const singleMuscleDailySchedule: Record<number, ExerciseCategory | null> = {
    1: "Chest",
    2: "Back",
    3: "Legs",
    4: "Shoulders",
    5: "Biceps",
    6: "Triceps",
    0: null, // Sunday
};

function WorkoutPageContent() {
  const { toast } = useToast();
  const { currentUser, exportData } = useAuth();

  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>('two-muscle');
  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory | "">("");

  const [editingDefinition, setEditingDefinition] = useState<ExerciseDefinition | null>(null);
  const [editingDefinitionName, setEditingDefinitionName] = useState('');
  const [editingDefinitionCategory, setEditingDefinitionCategory] = useState<ExerciseCategory | "">("");

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allWorkoutLogs, setAllWorkoutLogs] = useState<DatedWorkout[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [dietPlan, setDietPlan] = useState<UserDietPlan>([]);

  const [viewingProgressExercise, setViewingProgressExercise] = useState<ExerciseDefinition | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<ExerciseCategory[]>([]);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  const [workoutPlans, setWorkoutPlans] = useState<AllWorkoutPlans>(INITIAL_PLANS);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);

  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [isWeightChartModalOpen, setIsWeightChartModalOpen] = useState(false);
  const [isDietPlanModalOpen, setIsDietPlanModalOpen] = useState(false);

  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setOneYearAgo(subYears(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1));
  }, []);

  useEffect(() => {
    if (currentUser?.username) {
      const defsKey = `exerciseDefinitions_${currentUser.username}`;
      const logsKey = `allWorkoutLogs_${currentUser.username}`;
      const modeKey = `workoutMode_${currentUser.username}`;
      const plansKey = `workoutPlans_${currentUser.username}`;
      const weightLogsKey = `weightLogs_${currentUser.username}`;
      const goalWeightKey = `goalWeight_${currentUser.username}`;
      const heightKey = `height_${currentUser.username}`;
      const dobKey = `dateOfBirth_${currentUser.username}`;
      const genderKey = `gender_${currentUser.username}`;
      const dietPlanKey = `dietPlan_${currentUser.username}`;
      let localDefsLoaded = false;
      
      const storedMode = localStorage.getItem(modeKey);
      if (storedMode === 'one-muscle' || storedMode === 'two-muscle') {
        setWorkoutMode(storedMode);
      }

      const storedGoal = localStorage.getItem(goalWeightKey);
      if (storedGoal) setGoalWeight(parseFloat(storedGoal));

      const storedHeight = localStorage.getItem(heightKey);
      if (storedHeight) setHeight(parseFloat(storedHeight));
      
      const storedDob = localStorage.getItem(dobKey);
      if (storedDob) setDateOfBirth(storedDob);

      const storedGender = localStorage.getItem(genderKey);
      if (storedGender === 'male' || storedGender === 'female') {
        setGender(storedGender as Gender);
      }

      try {
        const storedDietPlan = localStorage.getItem(dietPlanKey);
        if (storedDietPlan) {
            const parsedPlan = JSON.parse(storedDietPlan);
            if (Array.isArray(parsedPlan)) setDietPlan(parsedPlan);
        }
      } catch (e) {
        console.error("Error parsing diet plan from localStorage", e);
      }

      try {
        const storedPlans = localStorage.getItem(plansKey);
        if (storedPlans) {
          const parsedPlans = JSON.parse(storedPlans);
          setWorkoutPlans(parsedPlans);
        } else {
          setWorkoutPlans(INITIAL_PLANS);
        }
      } catch (e) {
        console.error("Error parsing workout plans from localStorage", e);
        setWorkoutPlans(INITIAL_PLANS);
      }

      try {
        const storedWeightLogs = localStorage.getItem(weightLogsKey);
        if (storedWeightLogs) {
          const parsedWeightLogs = JSON.parse(storedWeightLogs);
          if (Array.isArray(parsedWeightLogs)) {
            setWeightLogs(parsedWeightLogs);
          }
        }
      } catch (e) {
        console.error("Error parsing weight logs from localStorage", e);
      }

      try {
        const storedDefinitions = localStorage.getItem(defsKey);
        if (storedDefinitions) {
          const parsedDefs = JSON.parse(storedDefinitions);
          if (Array.isArray(parsedDefs) && parsedDefs.length > 0) {
            setExerciseDefinitions(parsedDefs);
            localDefsLoaded = true;
          }
        }
      } catch (e) {
        console.error("Error parsing exercise definitions from localStorage", e);
      }
      
      if (!localDefsLoaded) {
        const timestamp = Date.now().toString();
        const uniqueDefaultDefs = DEFAULT_EXERCISE_DEFINITIONS.map((def, index) => ({
          ...def,
          id: `${timestamp}_${index}_${def.name.replace(/\s+/g, '_')}`
        }));
        setExerciseDefinitions(uniqueDefaultDefs);
      }

      try {
        const storedLogs = localStorage.getItem(logsKey);
        if (storedLogs) {
          const parsedLogs = JSON.parse(storedLogs);
           if (Array.isArray(parsedLogs)) {
            setAllWorkoutLogs(parsedLogs);
          } else {
            setAllWorkoutLogs([]);
          }
        } else {
          setAllWorkoutLogs([]);
        }
      } catch (e) {
        console.error("Error parsing workout logs from localStorage", e);
        setAllWorkoutLogs([]);
      }

    } else {
      setExerciseDefinitions([]);
      setAllWorkoutLogs([]);
      setWorkoutPlans(INITIAL_PLANS);
      setWeightLogs([]);
      setGoalWeight(null);
      setHeight(null);
      setDateOfBirth(null);
      setGender(null);
      setDietPlan([]);
    }
    const timer = setTimeout(() => setIsLoadingPage(false), 300);
    return () => clearTimeout(timer);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.username && !isLoadingPage) {
      try {
        const defsKey = `exerciseDefinitions_${currentUser.username}`;
        const logsKey = `allWorkoutLogs_${currentUser.username}`;
        const modeKey = `workoutMode_${currentUser.username}`;
        const plansKey = `workoutPlans_${currentUser.username}`;
        const weightLogsKey = `weightLogs_${currentUser.username}`;
        const goalWeightKey = `goalWeight_${currentUser.username}`;
        const heightKey = `height_${currentUser.username}`;
        const dobKey = `dateOfBirth_${currentUser.username}`;
        const genderKey = `gender_${currentUser.username}`;
        
        localStorage.setItem(defsKey, JSON.stringify(exerciseDefinitions));
        localStorage.setItem(logsKey, JSON.stringify(allWorkoutLogs));
        localStorage.setItem(modeKey, workoutMode);
        localStorage.setItem(plansKey, JSON.stringify(workoutPlans));
        localStorage.setItem(weightLogsKey, JSON.stringify(weightLogs));

        if (goalWeight !== null) localStorage.setItem(goalWeightKey, goalWeight.toString());
        else localStorage.removeItem(goalWeightKey);

        if (height !== null) localStorage.setItem(heightKey, height.toString());
        else localStorage.removeItem(heightKey);
        
        if (dateOfBirth) localStorage.setItem(dobKey, dateOfBirth);
        else localStorage.removeItem(dobKey);

        if (gender) localStorage.setItem(genderKey, gender);
        else localStorage.removeItem(genderKey);

      } catch (e) {
        console.error("Error saving data to localStorage", e);
        toast({ title: "Save Error", description: "Could not save data locally. Storage might be full.", variant: "destructive"});
      }
    }
  }, [exerciseDefinitions, allWorkoutLogs, currentUser, isLoadingPage, toast, workoutMode, workoutPlans, weightLogs, goalWeight, height, dateOfBirth, gender]);


  useEffect(() => {
    if (!currentUser || exerciseDefinitions.length === 0 || Object.keys(workoutPlans).length === 0) return;
  
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
  
    setAllWorkoutLogs(prevLogs => {
      const workoutExists = prevLogs.some(log => log.id === dateKey);
      if (workoutExists) {
        return prevLogs; // Don't modify if workout already exists
      }
  
      const dayOfWeek = getDay(selectedDate);
      const exercisesToAdd: WorkoutExercise[] = [];
      let toastDescription = "";
      
      const isoWeek = getISOWeek(selectedDate);
      const isOddWeek = isoWeek % 2 !== 0;

      if (workoutMode === 'two-muscle') {
          let plan: any = null;
          let planName = "";
    
          // Use a consistent weekly rotation
          if (isOddWeek) {
            // Week A schedule
            plan = dayOfWeek >= 1 && dayOfWeek <= 3 ? workoutPlans.W1 : workoutPlans.W2;
            planName = dayOfWeek >= 1 && dayOfWeek <= 3 ? "W1" : "W2";
            if (dayOfWeek === 6) { plan = workoutPlans.W1; planName = "W1"; } // Saturday mirrors Monday
          } else {
            // Week B schedule
            plan = dayOfWeek >= 1 && dayOfWeek <= 3 ? workoutPlans.W3 : workoutPlans.W4;
            planName = dayOfWeek >= 1 && dayOfWeek <= 3 ? "W3" : "W4";
            if (dayOfWeek === 6) { plan = workoutPlans.W3; planName = "W3"; } // Saturday mirrors Monday
          }

          if (!plan) return prevLogs;
    
          const muscleGroupsForDay = dailyMuscleGroups[dayOfWeek];
          if (!muscleGroupsForDay || muscleGroupsForDay.length === 0) return prevLogs;
          
          toastDescription = `Added ${planName} exercises for ${muscleGroupsForDay.join(' & ')}.`;
          muscleGroupsForDay.forEach(muscleGroup => {
            const exerciseNames = (plan as any)[muscleGroup] as string[];
            if (exerciseNames) {
              exerciseNames.forEach(exName => {
                const definition = exerciseDefinitions.find(def => def.name.toLowerCase() === exName.toLowerCase());
                if (definition && !exercisesToAdd.some(e => e.definitionId === definition.id)) {
                  exercisesToAdd.push({
                    id: `${definition.id}-${Date.now()}-${Math.random()}`,
                    definitionId: definition.id,
                    name: definition.name,
                    category: definition.category,
                    loggedSets: [],
                    targetSets: DEFAULT_TARGET_SETS,
                    targetReps: DEFAULT_TARGET_REPS,
                  });
                }
              });
            }
          });
      } else { // 'one-muscle' mode
          const plan = isOddWeek ? workoutPlans.W5 : workoutPlans.W6;
          const planName = isOddWeek ? "W5" : "W6";
          const muscleGroupForDay = singleMuscleDailySchedule[dayOfWeek];
          if (!muscleGroupForDay) return prevLogs;

          const exerciseNames = (plan as any)[muscleGroupForDay] as string[] | undefined;
          if (!exerciseNames || exerciseNames.length === 0) return prevLogs;
          
          toastDescription = `Added ${planName} exercises for ${muscleGroupForDay}.`;

          exerciseNames.forEach(exName => {
            const definition = exerciseDefinitions.find(def => def.name.toLowerCase() === exName.toLowerCase());
            if (definition) {
              exercisesToAdd.push({
                id: `${definition.id}-${Date.now()}-${Math.random()}`,
                definitionId: definition.id,
                name: definition.name,
                category: definition.category,
                loggedSets: [],
                targetSets: DEFAULT_TARGET_SETS,
                targetReps: DEFAULT_TARGET_REPS,
              });
            }
          });
      }

      if (exercisesToAdd.length > 0) {
        const newDatedWorkout: DatedWorkout = { id: dateKey, date: dateKey, exercises: exercisesToAdd };
        toast({ 
          title: "Workout Autopopulated!", 
          description: toastDescription
        });
        return [...prevLogs, newDatedWorkout];
      }
  
      return prevLogs;
    });
  
  }, [selectedDate, currentUser, exerciseDefinitions, toast, workoutMode, workoutPlans]);

  // Check for backup prompt on Mondays
  useEffect(() => {
      if (!currentUser) return;
      
      const today = new Date();
      const year = getYear(today);
      const week = getISOWeek(today);
      const backupPromptKey = `backupPrompt_${year}-${week}`;

      const hasBeenPrompted = localStorage.getItem(backupPromptKey);

      if (isMonday(today) && !hasBeenPrompted) {
          setShowBackupPrompt(true);
      }

  }, [currentUser]);

  const handleDietModalOpenChange = (isOpen: boolean) => {
    setIsDietPlanModalOpen(isOpen);
    if (!isOpen && currentUser?.username) {
      // When modal closes, reload diet plan from storage to update parent state for calculations
      const planKey = `dietPlan_${currentUser.username}`;
      const storedPlan = localStorage.getItem(planKey);
      if (storedPlan) {
        try {
          const parsedPlan = JSON.parse(storedPlan);
          if (Array.isArray(parsedPlan)) {
            setDietPlan(parsedPlan);
          }
        } catch (e) {
          console.error("Error parsing diet plan from localStorage on modal close", e);
        }
      }
    }
  };

  const markBackupPromptAsHandled = () => {
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_${year}-${week}`;
    localStorage.setItem(backupPromptKey, 'true');
    setShowBackupPrompt(false);
  };

  const handleBackupConfirm = () => {
    exportData();
    markBackupPromptAsHandled();
  };

  const currentDatedWorkout = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return allWorkoutLogs.find(log => log.id === dateKey);
  }, [selectedDate, allWorkoutLogs]);

  const currentWorkoutExercises = useMemo(() => {
    return currentDatedWorkout?.exercises || [];
  }, [currentDatedWorkout]);

  const filteredExerciseDefinitions = useMemo(() => {
    if (selectedCategories.length === 0) {
      return exerciseDefinitions;
    }
    return exerciseDefinitions.filter(def => selectedCategories.includes(def.category));
  }, [exerciseDefinitions, selectedCategories]);

  const muscleGroupsForSelectedDay = useMemo(() => {
    const dayOfWeek = getDay(selectedDate);
    if (workoutMode === 'one-muscle') {
        const muscle = singleMuscleDailySchedule[dayOfWeek];
        return muscle ? [muscle] : [];
    }
    return dailyMuscleGroups[dayOfWeek] || [];
  }, [selectedDate, workoutMode]);

  const handleCategoryFilterChange = (category: ExerciseCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const updateOrAddWorkoutLog = (updatedWorkout: DatedWorkout) => {
    setAllWorkoutLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.id === updatedWorkout.id);
      if (existingLogIndex > -1) {
        const newLogs = [...prevLogs];
        newLogs[existingLogIndex] = updatedWorkout;
        return newLogs;
      }
      return [...prevLogs, updatedWorkout];
    });
  };

  const handleAddExerciseDefinition = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" }); return;
    }
    if (newExerciseName.trim() === '') {
      toast({ title: "Error", description: "Exercise name cannot be empty.", variant: "destructive" }); return;
    }
    if (!newExerciseCategory) {
      toast({ title: "Error", description: "Please select an exercise category.", variant: "destructive" }); return;
    }
    if (exerciseDefinitions.some(def => def.name.toLowerCase() === newExerciseName.trim().toLowerCase())) {
      toast({ title: "Error", description: "Exercise with this name already exists.", variant: "destructive" }); return;
    }
    const newDef: ExerciseDefinition = { 
      id: `def_${Date.now().toString()}_${newExerciseName.trim().replace(/\s+/g, '_')}`, 
      name: newExerciseName.trim(),
      category: newExerciseCategory || DEFAULT_EXERCISE_CATEGORY
    };
    setExerciseDefinitions(prev => [...prev, newDef]);
    setNewExerciseName('');
    setNewExerciseCategory("");
    toast({ title: "Success", description: `Exercise "${newDef.name}" added to library.` });
  };

  const handleDeleteExerciseDefinition = (id: string) => {
    if (!currentUser) { toast({ title: "Error", description: "You must be logged in.", variant: "destructive" }); return; }
    const defToDelete = exerciseDefinitions.find(def => def.id === id);
    setExerciseDefinitions(prev => prev.filter(def => def.id !== id));
    setAllWorkoutLogs(prevLogs => 
      prevLogs.map(log => ({
        ...log,
        exercises: log.exercises.filter(ex => ex.definitionId !== id)
      }))
    );
    toast({ title: "Success", description: `Exercise "${defToDelete?.name}" removed.` });
  };

  const handleStartEditDefinition = (def: ExerciseDefinition) => {
    setEditingDefinition(def);
    setEditingDefinitionName(def.name);
    setEditingDefinitionCategory(def.category);
  };

  const handleSaveEditDefinition = () => {
    if (!currentUser) { toast({ title: "Error", description: "You must be logged in.", variant: "destructive" }); return; }
    if (editingDefinition && editingDefinitionName.trim() !== '' && editingDefinitionCategory) {
      if (exerciseDefinitions.some(def => def.name.toLowerCase() === editingDefinitionName.trim().toLowerCase() && def.id !== editingDefinition.id)) {
        toast({ title: "Error", description: "Another exercise with this name already exists.", variant: "destructive" }); return;
      }
      const updatedDef = { ...editingDefinition, name: editingDefinitionName.trim(), category: editingDefinitionCategory };
      setExerciseDefinitions(prev => 
        prev.map(def => def.id === editingDefinition.id ? updatedDef : def)
      );
      setAllWorkoutLogs(prevLogs => 
        prevLogs.map(log => ({
          ...log,
          exercises: log.exercises.map(ex => 
            ex.definitionId === editingDefinition.id ? { ...ex, name: updatedDef.name, category: updatedDef.category } : ex
          )
        }))
      );
      toast({ title: "Success", description: `Exercise updated to "${updatedDef.name}".` });
      setEditingDefinition(null);
      setEditingDefinitionName('');
      setEditingDefinitionCategory("");
    } else {
      toast({ title: "Error", description: "Exercise name and category cannot be empty.", variant: "destructive" });
    }
  };

  const handleAddExerciseToWorkout = (definition: ExerciseDefinition) => {
    if (!currentUser) { toast({ title: "Error", description: "You must be logged in.", variant: "destructive" }); return; }
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newWorkoutExercise: WorkoutExercise = {
      id: `${definition.id}-${Date.now()}`, definitionId: definition.id, name: definition.name, category: definition.category,
      loggedSets: [], targetSets: DEFAULT_TARGET_SETS, targetReps: DEFAULT_TARGET_REPS,
    };

    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      if (existingWorkout.exercises.some(ex => ex.definitionId === definition.id)) {
        toast({ title: "Info", description: `"${definition.name}" is already in this workout.`, variant: "default" }); return;
      }
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: [...existingWorkout.exercises, newWorkoutExercise] });
    } else {
      updateOrAddWorkoutLog({ id: dateKey, date: dateKey, exercises: [newWorkoutExercise] });
    }
    toast({ title: "Added to Workout", description: `"${definition.name}" added for ${format(selectedDate, 'PPP')}.` });
  };

  const handleRemoveExerciseFromWorkout = (exerciseId: string) => {
    if (!currentUser) return;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.filter(ex => ex.id !== exerciseId);
      const exerciseName = existingWorkout.exercises.find(ex => ex.id === exerciseId)?.name;
      if (updatedExercises.length === 0) { 
        setAllWorkoutLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      } else {
        updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
      }
      toast({ title: "Success", description: `"${exerciseName || ''}" removed from workout.` });
    }
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => {
    if (!currentUser) return;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const newSet: LoggedSet = { id: Date.now().toString(), reps, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Set Logged!", description: `Logged ${reps} reps at ${weight} kg/lb.`});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    if (!currentUser) return;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Set Deleted", description: "The set has been removed." });
    }
  };

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => {
    if (!currentUser) return;
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return { ...ex, loggedSets: ex.loggedSets.map(set => 
              set.id === setId ? { ...set, reps, weight, timestamp: Date.now() } : set
            )};
        }
        return ex;
      });
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Set Updated", description: "The set has been updated."});
    }
  };

  const handleViewProgress = (definition: ExerciseDefinition) => {
    setViewingProgressExercise(definition);
    setIsProgressModalOpen(true);
  };
  
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

  const handleUpdateWeightLog = (dateKey: string, newWeight: number) => {
    if (!currentUser || isNaN(newWeight) || newWeight <= 0) {
      toast({ title: "Invalid Input", description: "Please enter a valid weight.", variant: "destructive" });
      return;
    }
    setWeightLogs(prevLogs => {
      const logIndex = prevLogs.findIndex(log => log.date === dateKey);
      if (logIndex > -1) {
        const updatedLogs = [...prevLogs];
        updatedLogs[logIndex] = { ...updatedLogs[logIndex], weight: newWeight };
        toast({ title: "Weight Updated", description: `Weight for week ${dateKey} updated.` });
        return updatedLogs.sort((a,b) => a.date.localeCompare(b.date));
      }
      return prevLogs;
    });
  };

  const handleDeleteWeightLog = (dateKey: string) => {
    if (!currentUser) return;
    setWeightLogs(prevLogs => prevLogs.filter(log => log.date !== dateKey));
    toast({ title: "Weight Deleted", description: `Weight log for week ${dateKey} has been removed.` });
  };

  const handleSetGoalWeight = (goal: number) => {
    if (!isNaN(goal) && goal > 0) {
        if (currentUser?.username) {
            setGoalWeight(goal);
            toast({ title: "Goal Set!", description: `Your new goal weight is ${goal} kg/lb.` });
        } else {
            toast({ title: "Error", description: "You must be logged in to set a goal.", variant: "destructive" });
        }
    } else {
        toast({ title: "Invalid Input", description: "Please enter a valid goal weight.", variant: "destructive" });
    }
  };

  const handleSetHeight = (h: number) => {
    if (!isNaN(h) && h > 0) {
        if (currentUser?.username) {
            setHeight(h);
            toast({ title: "Height Set!", description: `Your height has been saved as ${h} cm.` });
        } else {
            toast({ title: "Error", description: "You must be logged in to set your height.", variant: "destructive" });
        }
    } else {
        toast({ title: "Invalid Input", description: "Please enter a valid height.", variant: "destructive" });
    }
  };

  const handleSetDateOfBirth = (dob: string) => {
    if (dob) {
        if (currentUser?.username) {
            setDateOfBirth(dob);
            toast({ title: "Date of Birth Set", description: `Your DoB has been saved.` });
        } else {
            toast({ title: "Error", description: "You must be logged in to set your date of birth.", variant: "destructive" });
        }
    } else {
        toast({ title: "Invalid Input", description: "Please select a valid date.", variant: "destructive" });
    }
  };

  const handleSetGender = (g: Gender) => {
    if (g) {
      if (currentUser?.username) {
        setGender(g);
        toast({ title: "Gender Set!", description: `Your gender has been saved.` });
      } else {
        toast({ title: "Error", description: "You must be logged in to set your gender.", variant: "destructive" });
      }
    }
  };

  const consistencyData = useMemo(() => {
    if (!allWorkoutLogs || !oneYearAgo || !today) return [];

    const workoutDates = new Set(
      allWorkoutLogs
        .filter(log => log.exercises.some(ex => ex.loggedSets.length > 0))
        .map(log => log.date)
    );

    const data = [];
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
            score: Math.round(score * 100),
        });
    }

    return data;
  }, [allWorkoutLogs, oneYearAgo, today]);

  const latestConsistency = useMemo(() => {
    if (!consistencyData.length) return null;
    return consistencyData[consistencyData.length - 1].score;
  }, [consistencyData]);

  const healthMetrics = useMemo(() => {
    const calories = dietPlan.length > 0
        ? dietPlan
            .map(d => d.totalCalories)
            .filter((c): c is number => c !== null && c > 0)
        : [];
    const averageIntake = calories.length > 0 ? calories.reduce((sum, c) => sum + c, 0) / calories.length : null;

    const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : null;
    const age = dateOfBirth ? differenceInYears(new Date(), parseISO(dateOfBirth)) : null;
    
    let bmr = null;
    if (currentWeight && height && age && gender) {
        if (gender === 'male') {
            // Mifflin-St Jeor Equation for men
            bmr = (10 * currentWeight) + (6.25 * height) - (5 * age) + 5;
        } else {
            // Mifflin-St Jeor Equation for women
            bmr = (10 * currentWeight) + (6.25 * height) - (5 * age) - 161;
        }
    }

    return {
        averageIntake: averageIntake ? Math.round(averageIntake) : null,
        maintenanceCalories: bmr ? Math.round(bmr) : null,
    };
  }, [dietPlan, weightLogs, height, dateOfBirth, gender]);

  const projectionSummary = useMemo(() => {
    if (!goalWeight || weightLogs.length < 2) {
        return null;
    }

    const sortedLogs = weightLogs
        .map(log => {
            const [year, weekNum] = log.date.split('-W');
            const dateObj = startOfISOWeek(setISOWeek(new Date(parseInt(year), 0, 4), parseInt(weekNum)));
            return { ...log, dateObj };
        })
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    const weightChartData = sortedLogs.map((log, index, arr) => {
        let weeklyChange = null;
        if (index > 0) {
            const prevWeight = arr[index - 1].weight;
            weeklyChange = log.weight - prevWeight;
        }
        return {
            weight: log.weight,
            dateObj: log.dateObj,
            weeklyChange: weeklyChange,
        };
    });

    const lastLog = weightChartData[weightChartData.length - 1];
    if (!lastLog) return null;

    const currentWeight = lastLog.weight;
    const weightDifference = goalWeight - currentWeight;

    const changes = weightChartData
        .map(d => d.weeklyChange)
        .filter((c): c is number => c !== null && c !== 0);

    let averageWeeklyChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;

    const baseSummary = {
        currentWeight: parseFloat(currentWeight.toFixed(1)),
        goalWeight,
        weightDifference: parseFloat(weightDifference.toFixed(1)),
        averageWeeklyChange: parseFloat(averageWeeklyChange.toFixed(2)),
    };

    let projectionRate = averageWeeklyChange;
    if (weightDifference < 0) { // Need to lose weight
        if (projectionRate >= 0) projectionRate = -0.5; // Assume 0.5 kg/lb loss per week if current trend is gain/stagnant
    } else { // Need to gain weight
        if (projectionRate <= 0) projectionRate = 0.25; // Assume 0.25 kg/lb gain per week
    }

    if (Math.abs(projectionRate) < 0.01) {
        return baseSummary;
    }

    const weeksToGo = Math.ceil(Math.abs(weightDifference / projectionRate));
    if (weeksToGo <= 0 || weeksToGo > 520) {
        return baseSummary;
    }

    const projectedDate = addWeeks(lastLog.dateObj, weeksToGo);
    const nextProjectedWeight = currentWeight + projectionRate;
    const nextWeekDate = addWeeks(lastLog.dateObj, 1);
    const daysToNextWeek = differenceInDays(nextWeekDate, new Date());
    const daysToGoal = differenceInDays(projectedDate, new Date());

    return {
        ...baseSummary,
        projectedDate: format(projectedDate, 'PPP'),
        nextProjectedWeight: parseFloat(nextProjectedWeight.toFixed(1)),
        weeksToGo,
        daysToNextWeek,
        daysToGoal,
    };
  }, [goalWeight, weightLogs]);
  
  const todaysDiet = useMemo(() => {
    if (!dietPlan || dietPlan.length === 0) return null;
    const dayName = format(new Date(), 'EEEE'); // "Monday", "Tuesday", etc.
    return dietPlan.find(plan => plan.day === dayName);
  }, [dietPlan]);


  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)] bg-background">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your workout data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6 text-center relative">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary">
            Daily Workout Log
          </h1>
          <div className="flex justify-center items-center gap-2">
            <p className="text-muted-foreground mt-1 text-md">Log your gains, {currentUser?.username || "Guest"}.</p>
            <TooltipProvider>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>Workouts are auto-populated based on a 4-week schedule.<br/> You can still add, remove, and log exercises manually.</p>
                  </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="mb-8">
          <WorkoutHeatmap
            allWorkoutLogs={allWorkoutLogs}
            onDateSelect={(date) => setSelectedDate(parse(date, 'yyyy-MM-dd', new Date()))}
            consistencyData={consistencyData}
            oneYearAgo={oneYearAgo}
            today={today}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <section aria-labelledby="exercise-library-heading" className="md:col-span-1 space-y-6">
            <Card className="shadow-xl rounded-xl overflow-hidden">
              <CardHeader className="bg-primary/10">
                <div className="flex items-center justify-between">
                  <CardTitle id="exercise-library-heading" className="flex items-center gap-2 text-2xl text-primary">
                    <Dumbbell /> Exercise Library
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          <FilterIcon className="h-4 w-4 mr-2" />
                          Filter ({selectedCategories.length > 0 ? selectedCategories.length : "All"})
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Filter by Category</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {exerciseCategories.map((category) => (
                          <DropdownMenuCheckboxItem
                            key={category} checked={selectedCategories.includes(category)}
                            onCheckedChange={() => handleCategoryFilterChange(category)}
                            onSelect={(e) => e.preventDefault()} 
                          > {category} </DropdownMenuCheckboxItem>
                        ))}
                        {selectedCategories.length > 0 && (
                          <> <DropdownMenuSeparator />
                            <Button variant="ghost" size="sm" className="w-full justify-start text-sm" onClick={() => setSelectedCategories([])}> Clear Filters </Button>
                          </>)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="icon" onClick={() => setIsLibraryExpanded(!isLibraryExpanded)} className="h-8 w-8" aria-label={isLibraryExpanded ? "Collapse exercise library" : "Expand exercise library"}>
                      {isLibraryExpanded ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-primary" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Workout Plan</Label>
                  <div className="flex items-center gap-4">
                    <RadioGroup
                      value={workoutMode}
                      onValueChange={(value) => setWorkoutMode(value as WorkoutMode)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="two-muscle" id="r1" />
                        <Label htmlFor="r1" className="font-normal">Two Muscles / Day</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="one-muscle" id="r2" />
                        <Label htmlFor="r2" className="font-normal">One Muscle / Day</Label>
                      </div>
                    </RadioGroup>
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setIsPlanModalOpen(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Plans
                    </Button>
                  </div>
                </div>
                <Separator />
                <AnimatePresence>
                  {isLibraryExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                      className="space-y-4"
                    >
                      <form onSubmit={handleAddExerciseDefinition} className="space-y-3">
                        <Input type="text" placeholder="New exercise name" value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} aria-label="New exercise name" className="h-10" />
                        <Select value={newExerciseCategory} onValueChange={(value) => setNewExerciseCategory(value as ExerciseCategory)}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>{exerciseCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                        </Select>
                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10"> <PlusCircle className="mr-2 h-5 w-5" /> Add Exercise </Button>
                      </form>
                      <div className="max-h-[calc(100vh-38rem)] overflow-y-auto pr-1">
                        {filteredExerciseDefinitions.length === 0 && exerciseDefinitions.length > 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">No exercises match filter.</p>
                        ) : filteredExerciseDefinitions.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">Library empty. Add exercises!</p>
                        ) : (
                          <ul className="space-y-2">
                            <AnimatePresence>
                              {filteredExerciseDefinitions.sort((a,b) => a.name.localeCompare(b.name)).map(def => (
                                <motion.li key={def.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="p-3 bg-card border rounded-lg shadow-sm">
                                  {editingDefinition?.id === def.id ? (
                                    <div className="space-y-2">
                                      <Input value={editingDefinitionName} onChange={(e) => setEditingDefinitionName(e.target.value)} className="h-9" aria-label="Edit exercise name"/>
                                      <Select value={editingDefinitionCategory} onValueChange={(value) => setEditingDefinitionCategory(value as ExerciseCategory)}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
                                        <SelectContent>{exerciseCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                                      </Select>
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={handleSaveEditDefinition} className="flex-grow bg-green-600 hover:bg-green-500 text-white"><Save className="h-4 w-4 mr-1"/>Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingDefinition(null)} className="flex-grow"><X className="h-4 w-4 mr-1"/>Cancel</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex-grow min-w-0">
                                          <span className="font-medium text-foreground block" title={def.name}>{def.name}</span>
                                          <Badge variant="secondary" className="text-xs ml-0 my-0.5">{def.category}</Badge>
                                      </div>
                                      <div className="flex-shrink-0 flex items-center">
                                        <Button variant="ghost" size="icon" onClick={() => handleViewProgress(def)} className="h-8 w-8 text-muted-foreground hover:text-blue-500" aria-label={`View progress for ${def.name}`}> <TrendingUp className="h-4 w-4" /> </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleStartEditDefinition(def)} className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label={`Edit ${def.name}`}> <Edit3 className="h-4 w-4" /> </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteExerciseDefinition(def.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${def.name}`}> <Trash2 className="h-4 w-4" /> </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleAddExerciseToWorkout(def)} className="h-8 w-8 text-muted-foreground hover:text-accent" aria-label={`Add ${def.name} to workout`}> <ChevronRight className="h-5 w-5" /> </Button>
                                      </div>
                                    </div>
                                  )}
                                </motion.li>
                              ))}
                            </AnimatePresence>
                          </ul>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            <Card className="shadow-xl rounded-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                        <Utensils /> Today's Diet
                    </CardTitle>
                    <CardDescription>
                       Your planned meals for {format(new Date(), 'EEEE')}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {todaysDiet ? (
                        <div className="space-y-3 text-sm">
                            <div>
                                <h4 className="font-semibold text-foreground">Meal 1</h4>
                                <p className="text-muted-foreground whitespace-pre-wrap">{todaysDiet.meal1 || 'Not planned.'}</p>
                            </div>
                            <Separator/>
                            <div>
                                <h4 className="font-semibold text-foreground">Meal 2</h4>
                                <p className="text-muted-foreground whitespace-pre-wrap">{todaysDiet.meal2 || 'Not planned.'}</p>
                            </div>
                            <Separator/>
                            <div>
                                <h4 className="font-semibold text-foreground">Meal 3</h4>
                                <p className="text-muted-foreground whitespace-pre-wrap">{todaysDiet.meal3 || 'Not planned.'}</p>
                            </div>
                            <Separator/>
                            <div>
                                <h4 className="font-semibold text-foreground">Supplements</h4>
                                <p className="text-muted-foreground whitespace-pre-wrap">{todaysDiet.supplements || 'Not planned.'}</p>
                            </div>

                            {todaysDiet.totalCalories != null && (
                                <div className="pt-3 border-t">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-foreground">Est. Total Calories</span>
                                        <span className="font-bold text-lg text-primary">{todaysDiet.totalCalories.toLocaleString()} kcal</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground space-y-1 pt-2">
                                        <div className="flex justify-between"><span>Protein</span> <span className="font-medium text-foreground">{todaysDiet.protein?.toFixed(0) ?? '-'}g</span></div>
                                        <div className="flex justify-between"><span>Carbs</span> <span className="font-medium text-foreground">{todaysDiet.carbs?.toFixed(0) ?? '-'}g</span></div>
                                        <div className="flex justify-between"><span>Fat</span> <span className="font-medium text-foreground">{todaysDiet.fat?.toFixed(0) ?? '-'}g</span></div>
                                        <div className="flex justify-between"><span>Fiber</span> <span className="font-medium text-foreground">{todaysDiet.fiber?.toFixed(0) ?? '-'}g</span></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No diet plan set up for today.</p>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-xl rounded-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                        <Target /> Weight Goal
                    </CardTitle>
                    <CardDescription>
                       Track your progress and stay consistent.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={() => setIsWeightChartModalOpen(true)} className="w-full">
                            <LineChartIcon className="mr-2 h-4 w-4" />
                            Chart & Goal
                        </Button>
                        <Button onClick={() => handleDietModalOpenChange(true)} variant="outline" className="w-full">
                            <BookCopy className="mr-2 h-4 w-4" />
                            Diet Plan
                        </Button>
                    </div>
                    {(projectionSummary || latestConsistency || healthMetrics.averageIntake || healthMetrics.maintenanceCalories) && (
                        <div className="space-y-4 pt-4 border-t">
                            {projectionSummary && (
                                <>
                                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                        <div>
                                            <div className="text-muted-foreground">Current</div>
                                            <div className="font-bold text-lg">{projectionSummary.currentWeight}</div>
                                            <div className="text-xs text-muted-foreground">kg/lb</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">Goal</div>
                                            <div className="font-bold text-lg">{projectionSummary.goalWeight}</div>
                                            <div className="text-xs text-muted-foreground">kg/lb</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">{projectionSummary.weightDifference > 0 ? "To Gain" : "To Lose"}</div>
                                            <div className={`font-bold text-lg ${projectionSummary.weightDifference > 0 ? "text-orange-500" : "text-green-500"}`}>{Math.abs(projectionSummary.weightDifference)}</div>
                                            <div className="text-xs text-muted-foreground">kg/lb</div>
                                        </div>
                                    </div>

                                    <Separator />
                                    
                                    <div className="space-y-2 text-sm">
                                      {projectionSummary.averageWeeklyChange !== undefined && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4" /> Avg. Weekly Change</span>
                                            <span className={`font-bold ${projectionSummary.averageWeeklyChange > 0 ? "text-orange-500" : projectionSummary.averageWeeklyChange < 0 ? "text-green-500" : ""}`}>
                                                {projectionSummary.averageWeeklyChange > 0 ? '+' : ''}{projectionSummary.averageWeeklyChange.toFixed(2)} kg/lb
                                            </span>
                                        </div>
                                      )}
                                      {projectionSummary.projectedDate && (
                                        <>
                                          <div className="flex justify-between items-center">
                                              <span className="text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Next Week Est.</span>
                                              <span className="font-bold">{projectionSummary.nextProjectedWeight} kg/lb</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                              <span className="text-muted-foreground pl-6">Days Remaining</span>
                                              <span className="font-bold">{projectionSummary.daysToNextWeek > 0 ? `${projectionSummary.daysToNextWeek} days` : 'Past'}</span>
                                          </div>
                                          <div className="flex justify-between items-center pt-2 mt-2 border-t">
                                              <span className="text-muted-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Est. Goal Date</span>
                                              <span className="font-bold">{projectionSummary.projectedDate}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                              <span className="text-muted-foreground pl-6">Days Remaining</span>
                                              <span className="font-bold">{projectionSummary.daysToGoal > 0 ? `${projectionSummary.daysToGoal} days` : 'N/A'}</span>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                </>
                            )}
                            
                            {(healthMetrics.averageIntake || healthMetrics.maintenanceCalories) && (
                              <div className="space-y-2 text-sm pt-4 border-t">
                                  {healthMetrics.averageIntake && (
                                      <div className="flex justify-between items-center">
                                          <span className="text-muted-foreground flex items-center gap-2"><Flame className="h-4 w-4" /> Current Avg. Daily Intake</span>
                                          <span className="font-bold">{healthMetrics.averageIntake} kcal</span>
                                      </div>
                                  )}
                                  {healthMetrics.maintenanceCalories && (
                                      <div className="flex justify-between items-center">
                                          <span className="text-muted-foreground flex items-center gap-2"><HeartPulse className="h-4 w-4" /> Est. Maintenance</span>
                                          <span className="font-bold">{healthMetrics.maintenanceCalories} kcal</span>
                                      </div>
                                  )}
                                  {healthMetrics.averageIntake && healthMetrics.maintenanceCalories && healthMetrics.averageIntake < healthMetrics.maintenanceCalories && (
                                      <p className="text-xs text-orange-500 mt-2">
                                          ⚠️ You’re eating below maintenance — watch for fatigue, low mood, or muscle loss.
                                      </p>
                                  )}
                              </div>
                            )}

                            {latestConsistency !== null && (
                                <div className="space-y-1 text-sm pt-4 border-t">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4" /> Workout Consistency</span>
                                        <span className="font-bold text-lg">{latestConsistency}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

          </section>

          <section aria-labelledby="current-workout-heading" className="md:col-span-2 space-y-6">
              <Card className="shadow-xl rounded-xl overflow-hidden">
                  <CardHeader className="bg-accent/10 flex flex-row items-center justify-between p-4">
                      <div className="flex-grow">
                          <CardTitle id="current-workout-heading" className="flex items-center gap-2 text-2xl text-accent">
                              <ListChecks /> Workout for: {format(selectedDate, 'PPP')}
                          </CardTitle>
                          {muscleGroupsForSelectedDay.length > 0 && (
                              <p className="text-sm text-muted-foreground mt-1 ml-1">
                                  Today's focus: {muscleGroupsForSelectedDay.join(' & ')}
                              </p>
                          )}
                      </div>
                      <Popover>
                          <PopoverTrigger asChild>
                          <Button variant={"outline"} className={cn("w-[200px] justify-start text-left font-normal h-10",!selectedDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
                          </PopoverContent>
                      </Popover>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="max-h-[calc(100vh-26rem)] overflow-y-auto pr-2">
                      {currentWorkoutExercises.length === 0 ? (
                        <div className="text-center py-10">
                            <GripVertical className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">No exercises for {format(selectedDate, 'PPP')}.</p>
                            <p className="text-sm text-muted-foreground/80">Add exercises from library or select a weekday!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <AnimatePresence>
                          {currentWorkoutExercises.map(exercise => {
                              const definition = exerciseDefinitions.find(def => def.id === exercise.definitionId);
                              return (
                                <WorkoutExerciseCard 
                                  key={exercise.id} 
                                  exercise={exercise}
                                  onLogSet={handleLogSet} 
                                  onDeleteSet={handleDeleteSet} 
                                  onUpdateSet={handleUpdateSet} 
                                  onRemoveExercise={handleRemoveExerciseFromWorkout}
                                  onViewProgress={definition ? () => handleViewProgress(definition) : undefined}
                                />
                              );
                          })}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </CardContent>
              </Card>
          </section>
        </div>
        {viewingProgressExercise && (
          <ExerciseProgressModal isOpen={isProgressModalOpen} onOpenChange={setIsProgressModalOpen}
            exercise={viewingProgressExercise} allWorkoutLogs={allWorkoutLogs}
          />
        )}
        {currentUser && (
          <WorkoutPlanModal
            isOpen={isPlanModalOpen}
            onOpenChange={setIsPlanModalOpen}
            workoutMode={workoutMode}
            workoutPlans={workoutPlans}
            setWorkoutPlans={setWorkoutPlans}
            exerciseDefinitions={exerciseDefinitions}
          />
        )}
      </div>

      <AlertDialog open={showBackupPrompt} onOpenChange={setShowBackupPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weekly Backup Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              It's Monday! Would you like to back up your workout data now? This will download a file to your computer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={markBackupPromptAsHandled}>Maybe Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackupConfirm}>Yes, Back Up Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </>
  );
}

export default function Page() {
  return ( <AuthGuard> <WorkoutPageContent /> </AuthGuard> );
}
