
"use client";

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Dumbbell, ListChecks, Edit3, Save, X, ChevronRight, CalendarIcon, GripVertical, TrendingUp, Filter as FilterIcon, Loader2, Info, Youtube, Settings, ChevronDown, ChevronUp, Target, CalendarDays, Plus, Minus, Activity, LineChart as LineChartIcon, BookCopy, Flame, HeartPulse, Utensils } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, getDay, getISOWeek, isMonday, getYear, parse, getISOWeekYear, addWeeks, startOfISOWeek, setISOWeek, differenceInDays, subYears, addDays, differenceInYears } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, exerciseCategories, WorkoutMode, AllWorkoutPlans, WeightLog, Gender, UserDietPlan, WorkoutPlan } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { ExerciseProgressModal } from '@/components/ExerciseProgressModal';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { getExercisesForDay } from '@/lib/workoutUtils';
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
import { TodaysDietCard } from '@/components/TodaysDietCard';


const DEFAULT_TARGET_SETS = 4;
const DEFAULT_TARGET_REPS = "8-12";
const DEFAULT_EXERCISE_CATEGORY: ExerciseCategory = "Other";

const DEFAULT_EXERCISE_DEFINITIONS: ExerciseDefinition[] = [
    { id: 'def_1', name: '1-Arm Dumbbell Row', category: 'Back' },
    { id: 'def_2', name: 'Back dips', category: 'Triceps' },
    { id: 'def_3', name: 'Back extensions', category: 'Back' },
    { id: 'def_4', name: 'Barbell Row', category: 'Back' },
    { id: 'def_5', name: 'Cable Curls', category: 'Biceps' },
    { id: 'def_6', name: 'Cable Curls Superset', category: 'Biceps' },
    { id: 'def_7', name: 'Cable Fly', category: 'Chest' },
    { id: 'def_8', name: 'Cable Rope Pushdown (Slow)', category: 'Triceps' },
    { id: 'def_9', name: 'Cable Upright Rows', category: 'Shoulders' },
    { id: 'def_10', name: 'Calfs (Bodyweight)', category: 'Legs' },
    { id: 'def_11', name: 'Close-Grip Barbell Bench Press', category: 'Triceps' },
    { id: 'def_12', name: 'DeadLifts', category: 'Back' },
    { id: 'def_13', name: 'Decline Dumbbell Press', category: 'Chest' },
    { id: 'def_14', name: 'Double-Arm Dumbbell Kickback', category: 'Triceps' },
    { id: 'def_15', name: 'Dumbbell Chest Fly', category: 'Chest' },
    { id: 'def_16', name: 'Dumbbell Flat Press', category: 'Chest' },
    { id: 'def_17', name: 'Dumbbell Kickback', category: 'Triceps' },
    { id: 'def_18', name: 'Dumbbell Lateral Raise (Lean in)', category: 'Shoulders' },
    { id: 'def_19', name: 'Dumbbell Pullovers', category: 'Chest' },
    { id: 'def_20', name: 'Face Pulls', category: 'Shoulders' },
    { id: 'def_21', name: 'Flat Barbell Bench Press', category: 'Chest' },
    { id: 'def_22', name: 'Front Raise cable', category: 'Shoulders' },
    { id: 'def_23', name: 'Hammer Curl (Dumbbell)', category: 'Biceps' },
    { id: 'def_24', name: 'Hamstring machine', category: 'Legs' },
    { id: 'def_25', name: 'Incline Barbell Press', category: 'Chest' },
    { id: 'def_26', name: 'Incline Dumbbell Press', category: 'Chest' },
    { id: 'def_27', name: 'Lat Prayer Pull', category: 'Back' },
    { id: 'def_28', name: 'Lat Pulldown', category: 'Back' },
    { id: 'def_29', name: 'Lat Pulldown (Wide Grip)', category: 'Back' },
    { id: 'def_30', name: 'Lean-Away Cable Lateral Raise', category: 'Shoulders' },
    { id: 'def_31', name: 'Leg Press', category: 'Legs' },
    { id: 'def_32', name: 'Machine Row', category: 'Back' },
    { id: 'def_33', name: 'Overhead Cable Extension', category: 'Triceps' },
    { id: 'def_34', name: 'Overhead Dumbbell Extension', category: 'Triceps' },
    { id: 'def_35', name: 'Peck Machine', category: 'Chest' },
    { id: 'def_36', name: 'Preacher curls Dumbbells', category: 'Biceps' },
    { id: 'def_37', name: 'Quads Machine', category: 'Legs' },
    { id: 'def_38', name: 'Rear Delt Fly (Incline Bench)', category: 'Shoulders' },
    { id: 'def_39', name: 'Reverse Bar Pushdown', category: 'Triceps' },
    { id: 'def_40', name: 'Reverse Cable', category: 'Biceps' },
    { id: 'def_41', name: 'Reversed cable curls', category: 'Biceps' },
    { id: 'def_42', name: 'Reversed Incline curls', category: 'Biceps' },
    { id: 'def_43', name: 'Rope Pushdown', category: 'Triceps' },
    { id: 'def_44', name: 'Seated Dumbbell Alternating Curl', category: 'Biceps' },
    { id: 'def_45', name: 'Seated Dumbbell Lateral Raise', category: 'Shoulders' },
    { id: 'def_46', name: 'Seated Dumbbell Shoulder Press', category: 'Shoulders' },
    { id: 'def_47', name: 'Seated Incline Dumbbell Curl', category: 'Biceps' },
    { id: 'def_48', name: 'Seated Machine Curls', category: 'Biceps' },
    { id: 'def_49', name: 'Seated Row', category: 'Back' },
    { id: 'def_50', name: 'Shrugs', category: 'Shoulders' },
    { id: 'def_51', name: 'Squats (Barbell)', category: 'Legs' },
    { id: 'def_52', name: 'Standing Dumbbell Alternating Curl', category: 'Biceps' },
    { id: 'def_53', name: 'Standing dumbbell curls', category: 'Biceps' },
    { id: 'def_54', name: 'Standing Dumbbell Lateral Raise', category: 'Shoulders' },
    { id: 'def_55', name: 'Straight bar pushdown', category: 'Triceps' },
    { id: 'def_56', name: 'Strict bar curls', category: 'Biceps' },
    { id: 'def_57', name: 'T-Bar Row', category: 'Back' },
    { id: 'def_58', name: 'V handle lat pulldown', category: 'Back' },
    { id: 'def_59', name: 'Walking Lunges (Barbell)', category: 'Legs' },
    { id: 'def_60', name: 'Concentration Curl', category: 'Biceps' },
    { id: 'def_61', name: 'Hack Squats', category: 'Legs' },
    { id: 'def_62', name: 'Preacher Curls Bar', category: 'Biceps' },
    { id: 'def_63', name: 'Front Raise Dumbbells', category: 'Shoulders' },
    { id: 'def_64', name: 'Overhead Bar extension', category: 'Triceps' },
    { id: 'def_65', name: 'Reverse-grip pushdown', category: 'Triceps' },
    { id: 'def_66', name: 'Single Arm Dumbbell Extensions', category: 'Triceps'},
    { id: 'def_67', name: 'Flat Bench Chest Fly', category: 'Chest'},
];

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
    1: "Chest",       // Monday
    2: "Triceps",     // Tuesday
    3: "Back",        // Wednesday
    4: "Biceps",      // Thursday
    5: "Shoulders",   // Friday
    6: "Legs",        // Saturday
    0: null,          // Sunday
};

function WorkoutPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    exportData,
    weightLogs, setWeightLogs,
    goalWeight, setGoalWeight,
    height, setHeight,
    dateOfBirth, setDateOfBirth,
    gender, setGender,
    dietPlan
  } = useAuth();

  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>('two-muscle');
  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory | "">("");

  const [editingDefinition, setEditingDefinition] = useState<ExerciseDefinition | null>(null);
  const [editingDefinitionName, setEditingDefinitionName] = useState('');
  const [editingDefinitionCategory, setEditingDefinitionCategory] = useState<ExerciseCategory | "">("");

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allWorkoutLogs, setAllWorkoutLogs] = useState<DatedWorkout[]>([]);

  const [viewingProgressExercise, setViewingProgressExercise] = useState<ExerciseDefinition | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<ExerciseCategory[]>([]);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  const [workoutPlans, setWorkoutPlans] = useState<AllWorkoutPlans>(INITIAL_PLANS);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(false);

  const [isWeightChartModalOpen, setIsWeightChartModalOpen] = useState(false);
  const [isDietPlanModalOpen, setIsDietPlanModalOpen] = useState(false);

  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  // State for the details form
  const [goalWeightInput, setGoalWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [dobInput, setDobInput] = useState<Date | undefined>();
  const [genderInput, setGenderInput] = useState<Gender | null>(null);

  useEffect(() => {
    if (currentUser) {
        setGoalWeightInput(goalWeight ? String(goalWeight) : '');
        setHeightInput(height ? String(height) : '');
        setDobInput(dateOfBirth ? parseISO(dateOfBirth) : undefined);
        setGenderInput(gender || null);
    }
  }, [currentUser, goalWeight, height, dateOfBirth, gender]);


  useEffect(() => {
    const now = new Date();
    setToday(now);
    setOneYearAgo(subYears(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1));
  }, []);

  useEffect(() => {
    if (currentUser?.username) {
        const username = currentUser.username;
        const defsKey = `exerciseDefinitions_${username}`;
        const plansKey = `workoutPlans_${username}`;
        const logsKey = `allWorkoutLogs_${username}`;
        const modeKey = `workoutMode_${username}`;

        const storedMode = localStorage.getItem(modeKey);
        if (storedMode === 'one-muscle' || storedMode === 'two-muscle') {
            setWorkoutMode(storedMode as WorkoutMode);
        } else {
            setWorkoutMode('two-muscle');
            localStorage.setItem(modeKey, 'two-muscle');
        }

        try {
            const storedPlans = localStorage.getItem(plansKey);
            if (storedPlans) {
                setWorkoutPlans(JSON.parse(storedPlans));
            } else {
                setWorkoutPlans(INITIAL_PLANS);
                localStorage.setItem(plansKey, JSON.stringify(INITIAL_PLANS));
            }
        } catch (e) {
            console.error("Error with workout plans, resetting to default:", e);
            setWorkoutPlans(INITIAL_PLANS);
            localStorage.setItem(plansKey, JSON.stringify(INITIAL_PLANS));
        }

        try {
            const storedDefinitions = localStorage.getItem(defsKey);
            if (storedDefinitions) {
                const parsedDefs = JSON.parse(storedDefinitions);
                if (Array.isArray(parsedDefs) && parsedDefs.length > 0) {
                    setExerciseDefinitions(parsedDefs);
                } else {
                    throw new Error("Stored definitions are empty or invalid.");
                }
            } else {
                setExerciseDefinitions(DEFAULT_EXERCISE_DEFINITIONS);
                localStorage.setItem(defsKey, JSON.stringify(DEFAULT_EXERCISE_DEFINITIONS));
            }
        } catch (e) {
            console.error("Error with exercise definitions, resetting to default:", e);
            setExerciseDefinitions(DEFAULT_EXERCISE_DEFINITIONS);
            localStorage.setItem(defsKey, JSON.stringify(DEFAULT_EXERCISE_DEFINITIONS));
        }
        
        try {
            const storedLogs = localStorage.getItem(logsKey);
            setAllWorkoutLogs(storedLogs ? JSON.parse(storedLogs) : []);
        } catch (e) { console.error("Error parsing workout logs", e); setAllWorkoutLogs([]); }

    } else {
      setExerciseDefinitions([]);
      setAllWorkoutLogs([]);
      setWorkoutPlans(INITIAL_PLANS);
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
        
        localStorage.setItem(defsKey, JSON.stringify(exerciseDefinitions));
        localStorage.setItem(logsKey, JSON.stringify(allWorkoutLogs));
        localStorage.setItem(modeKey, workoutMode);
        localStorage.setItem(plansKey, JSON.stringify(workoutPlans));
      } catch (e) {
        console.error("Error saving workout data to localStorage", e);
        toast({ title: "Save Error", description: "Could not save workout data locally.", variant: "destructive"});
      }
    }
  }, [exerciseDefinitions, allWorkoutLogs, workoutMode, workoutPlans, currentUser, isLoadingPage, toast]);

  useEffect(() => {
    if (!currentUser || exerciseDefinitions.length === 0 || Object.keys(workoutPlans).length === 0 || !workoutMode) {
      return;
    }

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const workoutExists = allWorkoutLogs.some(log => log.id === dateKey);

    if (!workoutExists) {
        const { exercises, description } = getExercisesForDay(selectedDate, workoutMode, workoutPlans, exerciseDefinitions);
        
        if (exercises.length > 0) {
            const newDatedWorkout: DatedWorkout = { id: dateKey, date: dateKey, exercises };
            setAllWorkoutLogs(prevLogs => [...prevLogs, newDatedWorkout]);
            toast({
              title: "Workout Autopopulated!",
              description: description,
            });
        }
    }
  }, [selectedDate, currentUser, exerciseDefinitions, workoutMode, workoutPlans, allWorkoutLogs, toast]);

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

  const handleSetGoalWeight = (goal: number | null) => {
    if (goal === null || (!isNaN(goal) && goal > 0)) {
        setGoalWeight(goal);
        if(goal !== null) toast({ title: "Goal Set!", description: `Your new goal weight is ${goal} kg/lb.` });
    } else {
        toast({ title: "Invalid Input", description: "Please enter a valid goal weight.", variant: "destructive" });
    }
  };

  const handleSetHeight = (h: number | null) => {
    if (h === null || (!isNaN(h) && h > 0)) {
        setHeight(h);
        if (h !== null) toast({ title: "Height Set!", description: `Your height has been saved as ${h} cm.` });
    } else {
        toast({ title: "Invalid Input", description: "Please enter a valid height.", variant: "destructive" });
    }
  };

  const handleSetDateOfBirth = (dob: string | null) => {
    if (dob) {
        setDateOfBirth(dob);
        toast({ title: "Date of Birth Set", description: `Your DoB has been saved.` });
    } else {
      setDateOfBirth(null);
    }
  };

  const handleSetGender = (g: Gender | null) => {
    if (g) {
      setGender(g);
      toast({ title: "Gender Set!", description: `Your gender has been saved.` });
    } else {
      setGender(null);
    }
  };

  const handleWorkoutModeChange = (newMode: WorkoutMode) => {
    if (newMode === workoutMode) return;
  
    const hasLoggedData = currentDatedWorkout?.exercises.some(ex => ex.loggedSets.length > 0);
  
    if (hasLoggedData) {
      toast({
        title: "Cannot Change Mode",
        description: "You have already logged sets for this workout. Please clear the logged sets before changing the workout mode.",
        variant: "destructive"
      });
      return; // Prevent switching
    }
  
    // Set the new mode state
    setWorkoutMode(newMode);
  
    // Remove the current day's workout log. This will trigger the auto-population
    // useEffect to regenerate the workout with the new mode.
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    setAllWorkoutLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
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

  const areDetailsSet = height && dateOfBirth && gender;


  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your workout data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <section aria-labelledby="exercise-library-heading" className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle id="exercise-library-heading" className="flex items-center gap-2 text-lg text-primary">
                    <BookCopy /> Exercise Library
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
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
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <RadioGroup
                      value={workoutMode}
                      onValueChange={(value) => handleWorkoutModeChange(value as WorkoutMode)}
                      className="flex flex-wrap gap-x-4 gap-y-2"
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
                        <Input type="text" placeholder="New exercise name" value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} aria-label="New exercise name" className="h-10 text-sm" />
                        <Select value={newExerciseCategory} onValueChange={(value) => setNewExerciseCategory(value as ExerciseCategory)}>
                          <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>{exerciseCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                        </Select>
                        <Button type="submit" size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs xl:text-sm xl:h-10 xl:px-4"> <PlusCircle className="mr-2 h-5 w-5" /> Add Exercise </Button>
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

            <TodaysDietCard 
                dietPlan={dietPlan}
                onEditClick={() => setIsDietPlanModalOpen(true)}
            />

            {areDetailsSet ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-primary">
                            <Target /> Weight Goal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button onClick={() => setIsWeightChartModalOpen(true)} className="w-full text-xs xl:text-sm">
                            <LineChartIcon className="mr-2 h-4 w-4" />
                            View Chart & History
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg text-primary"><Target/> Your Details</CardTitle>
                        <CardDescription>Provide these details first for accurate health and goal projections.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs text-muted-foreground">Gender (for BMR)</Label>
                                <RadioGroup
                                    value={genderInput || ""}
                                    onValueChange={(value) => setGenderInput(value as Gender)}
                                    className="flex gap-4 pt-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="male" id="gender-male-page" />
                                        <Label htmlFor="gender-male-page" className="font-normal">Male</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="female" id="gender-female-page" />
                                        <Label htmlFor="gender-female-page" className="font-normal">Female</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div>
                                <Label htmlFor="dob-input-page" className="text-xs text-muted-foreground">Date of Birth</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button id="dob-input-page" variant={"outline"} className={cn("h-9 w-full justify-start text-left font-normal", !dobInput && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dobInput ? format(dobInput, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dobInput}
                                        onSelect={setDobInput}
                                        captionLayout="dropdown-buttons"
                                        fromYear={1950}
                                        toYear={new Date().getFullYear()}
                                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label htmlFor="height-input-page" className="text-xs text-muted-foreground">Height (cm)</Label>
                                <Input
                                    id="height-input-page"
                                    type="number"
                                    placeholder="e.g., 180"
                                    value={heightInput}
                                    onChange={(e) => setHeightInput(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div>
                                <Label htmlFor="goal-weight-input-page" className="text-xs text-muted-foreground">Goal Weight (kg/lb)</Label>
                                <Input
                                    id="goal-weight-input-page"
                                    type="number"
                                    placeholder="e.g., 75 (Optional)"
                                    value={goalWeightInput}
                                    onChange={(e) => setGoalWeightInput(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button onClick={() => {
                              handleSetHeight(parseFloat(heightInput));
                              if (dobInput) handleSetDateOfBirth(format(dobInput, 'yyyy-MM-dd'));
                              if (genderInput) handleSetGender(genderInput);
                              if (goalWeightInput) handleSetGoalWeight(parseFloat(goalWeightInput)); else handleSetGoalWeight(null);
                            }}>
                                <Save className="mr-2 h-4 w-4"/>
                                Save Details
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

          </section>

          <section aria-labelledby="current-workout-heading" className="md:col-span-2 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="flex-grow">
                          <CardTitle id="current-workout-heading" className="flex items-center gap-2 text-lg text-primary">
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
                    <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
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
              <div>
                <WorkoutHeatmap
                  title="Workout Activity"
                  description="Your workout consistency over the last year. Click a square to view that day's log."
                  graphDescription="Your probability of working out, based on recent consistency."
                  allWorkoutLogs={allWorkoutLogs}
                  onDateSelect={(date) => setSelectedDate(parse(date, 'yyyy-MM-dd', new Date()))}
                  consistencyData={consistencyData}
                  oneYearAgo={oneYearAgo}
                  today={today}
                />
              </div>
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
            definitions={exerciseDefinitions}
            initialPlans={INITIAL_PLANS}
            pageType="workout"
            categories={exerciseCategories}
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
