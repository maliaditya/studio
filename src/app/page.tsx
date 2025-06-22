
"use client";

import React, { useState, useEffect, FormEvent, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Dumbbell, ListChecks, Edit3, Save, X, ChevronRight, CalendarIcon, GripVertical, TrendingUp, Filter as FilterIcon, Loader2, Info } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, getDay, getWeekOfMonth } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, exerciseCategories } from '@/types/workout';
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


const DEFAULT_TARGET_SETS = 4;
const DEFAULT_TARGET_REPS = "8-12";
const DEFAULT_EXERCISE_CATEGORY: ExerciseCategory = "Other";

// A comprehensive default list based on the provided workout plans
const DEFAULT_EXERCISE_DEFINITIONS: ExerciseDefinition[] = [
  // Chest
  { id: 'def_chest_01', name: "Flat Barbell Bench Press", category: "Chest" },
  { id: 'def_chest_02', name: "Incline Barbell Press", category: "Chest" },
  { id: 'def_chest_03', name: "Decline Dumbbell Press", category: "Chest" },
  { id: 'def_chest_04', name: "Peck Machine", category: "Chest" },
  { id: 'def_chest_05', name: "Dumbbell Flat Press", category: "Chest" },
  { id: 'def_chest_06', name: "Incline Dumbbell Press", category: "Chest" },
  { id: 'def_chest_07', name: "Cable Fly", category: "Chest" },
  { id: 'def_chest_08', name: "Dumbbell Chest Fly", category: "Chest" },
  { id: 'def_chest_09', name: "Dumbbell Pullovers", category: "Chest" },
  // Triceps
  { id: 'def_triceps_01', name: "Close-Grip Barbell Bench Press", category: "Triceps" },
  { id: 'def_triceps_02', name: "Overhead Dumbbell Extension", category: "Triceps" },
  { id: 'def_triceps_03', name: "Dumbbell Kickback", category: "Triceps" },
  { id: 'def_triceps_04', name: "Cable Rope Pushdown (Slow)", category: "Triceps" },
  { id: 'def_triceps_05', name: "Overhead Bar extension", category: "Triceps" },
  { id: 'def_triceps_06', name: "Rope Pushdown", category: "Triceps" },
  { id: 'def_triceps_07', name: "Overhead Cable Extension", category: "Triceps" },
  { id: 'def_triceps_08', name: "Straight bar pushdown", category: "Triceps" },
  { id: 'def_triceps_09', name: "Reversebar pushdown", category: "Triceps" },
  { id: 'def_triceps_10', name: "Back dips", category: "Triceps" },
  // Back
  { id: 'def_back_01', name: "Lat Pulldown", category: "Back" },
  { id: 'def_back_02', name: "Machine Row", category: "Back" },
  { id: 'def_back_03', name: "T-Bar Row", category: "Back" },
  { id: 'def_back_04', name: "Lat Prayer Pull", category: "Back" },
  { id: 'def_back_05', name: "Lat Pulldown (Wide Grip)", category: "Back" },
  { id: 'def_back_06', name: "V handle lat pulldown", category: "Back" },
  { id: 'def_back_07', name: "1-Arm Dumbbell Row", category: "Back" },
  { id: 'def_back_08', name: "Back extensions", category: "Back" },
  { id: 'def_back_09', name: "Barbell Row", category: "Back" },
  { id: 'def_back_10', name: "Seated Row", category: "Back" },
  { id: 'def_back_11', name: "V handle pulldown Cable", category: "Back" },
  { id: 'def_back_12', name: "DeadLifts", category: "Back" },
  // Biceps
  { id: 'def_biceps_01', name: "Standing dumbbell curls", category: "Biceps" },
  { id: 'def_biceps_02', name: "Standing Dumbbell Alternating Curl", category: "Biceps" },
  { id: 'def_biceps_03', name: "Preacher curls Dumbbells", category: "Biceps" },
  { id: 'def_biceps_04', name: "Hammer Curl (Dumbbell)", category: "Biceps" },
  { id: 'def_biceps_05', name: "Seated Incline Dumbbell Curl", category: "Biceps" },
  { id: 'def_biceps_06', name: "Seated Dumbbell Alternating Curl", category: "Biceps" },
  { id: 'def_biceps_07', name: "Reverse Cable", category: "Biceps" },
  { id: 'def_biceps_08', name: "Strict bar curls", category: "Biceps" },
  { id: 'def_biceps_09', name: "Reversed Incline curls", category: "Biceps" },
  { id: 'def_biceps_10', name: "Cable Curls Superset", category: "Biceps" },
  { id: 'def_biceps_11', name: "Reversed cable curls", category: "Biceps" },
  { id: 'def_biceps_12', name: "Seated Machine Curls", category: "Biceps" },
  { id: 'def_biceps_13', name: "Cable Curls", category: "Biceps" },
  // Shoulders
  { id: 'def_shoulders_01', name: "Seated Dumbbell Shoulder Press", category: "Shoulders" },
  { id: 'def_shoulders_02', name: "Standing Dumbbell Lateral Raise", category: "Shoulders" },
  { id: 'def_shoulders_03', name: "Face Pulls", category: "Shoulders" },
  { id: 'def_shoulders_04', name: "Shrugs", category: "Shoulders" },
  { id: 'def_shoulders_05', name: "Seated Dumbbell Lateral Raise", category: "Shoulders" },
  { id: 'def_shoulders_06', name: "Rear Delt Fly (Incline Bench)", category: "Shoulders" },
  { id: 'def_shoulders_07', name: "Cable Upright Rows", category: "Shoulders" },
  { id: 'def_shoulders_08', name: "Dumbbell Lateral Raise (Lean in)", category: "Shoulders" },
  { id: 'def_shoulders_09', name: "Lean-Away Cable Lateral Raise", category: "Shoulders" },
  { id: 'def_shoulders_10', name: "Front Raise cable", category: "Shoulders" },
  // Legs
  { id: 'def_legs_01', name: "Walking Lunges (Barbell)", category: "Legs" },
  { id: 'def_legs_02', name: "Leg Press", category: "Legs" },
  { id: 'def_legs_03', name: "Quads Machine", category: "Legs" },
  { id: 'def_legs_04', name: "Hamstring machine", category: "Legs" },
  { id: 'def_legs_05', name: "Squats (Barbell)", category: "Legs" },
  { id: 'def_legs_06', name: "Calfs (Bodyweight)", category: "Legs" },
];

const W1_PLAN = {
  Chest: ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine"],
  Triceps: ["Close-Grip Barbell Bench Press", "Overhead Dumbbell Extension", "Dumbbell Kickback", "Cable Rope Pushdown (Slow)"],
  Back: ["Lat Pulldown", "Machine Row", "T-Bar Row", "Lat Prayer Pull"],
  Biceps: ["Standing dumbbell curls", "Standing Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)"],
  Shoulders: ["Seated Dumbbell Shoulder Press", "Standing Dumbbell Lateral Raise", "Face Pulls", "Shrugs"],
  Legs: ["Walking Lunges (Barbell)", "Leg Press", "Quads Machine", "Hamstring machine"]
};

const W2_PLAN = {
  Chest: ["Dumbbell Flat Press", "Incline Dumbbell Press", "Decline Dumbbell Press", "Cable Fly"],
  Triceps: ["Overhead Dumbbell Extension", "Overhead Bar extension", "Rope Pushdown", "Dumbbell Kickback"],
  Back: ["Lat Pulldown (Wide Grip)", "V handle lat pulldown", "1-Arm Dumbbell Row", "Back extensions"],
  Biceps: ["Seated Incline Dumbbell Curl", "Seated Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Reverse Cable"],
  Shoulders: ["Seated Dumbbell Shoulder Press", "Seated Dumbbell Lateral Raise", "Rear Delt Fly (Incline Bench)", "Cable Upright Rows"],
  Legs: ["Walking Lunges (Barbell)", "Squats (Barbell)", "Hamstring machine", "Quads Machine"]
};

const W3_PLAN = {
  Chest: ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine"],
  Triceps: ["Overhead Cable Extension", "Straight bar pushdown", "Reversebar pushdown", "Back dips"],
  Back: ["Lat Pulldown", "Barbell Row", "Seated Row", "Lat Prayer Pull"],
  Biceps: ["Strict bar curls", "Reversed Incline curls", "Cable Curls Superset", "Reversed cable curls"],
  Shoulders: ["Seated Dumbbell Shoulder Press", "Dumbbell Lateral Raise (Lean in)", "Face Pulls", "Shrugs"],
  Legs: ["Leg Press", "Quads Machine", "Hamstring machine", "Calfs (Bodyweight)"]
};

const W4_PLAN = {
  Chest: ["Dumbbell Flat Press", "Incline Dumbbell Press", "Dumbbell Pullovers", "Cable Fly"],
  Triceps: ["Overhead Cable Extension", "Straight bar pushdown", "Reversebar pushdown", "Back dips"],
  Back: ["Lat Pulldown", "1-Arm Dumbbell Row", "V handle pulldown Cable", "DeadLifts"],
  Biceps: ["Seated Machine Curls", "Cable Curls", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)"],
  Shoulders: ["Seated Dumbbell Shoulder Press", "Lean-Away Cable Lateral Raise", "Face Pulls", "Front Raise cable"],
  Legs: ["Walking Lunges (Barbell)", "Squats (Barbell)", "Hamstring machine", "Quads Machine"]
};

const dailyMuscleGroups: Record<number, string[]> = {
  1: ["Chest", "Triceps"], // Monday
  2: ["Back", "Biceps"],   // Tuesday
  3: ["Shoulders", "Legs"],// Wednesday
  4: ["Chest", "Triceps"], // Thursday
  5: ["Back", "Biceps"],   // Friday
  0: [], // Sunday
  6: [], // Saturday
};

function WorkoutPageContent() {
  const { toast } = useToast();
  const { currentUser } = useAuth();

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

  useEffect(() => {
    if (currentUser?.username) {
      const defsKey = `exerciseDefinitions_${currentUser.username}`;
      const logsKey = `allWorkoutLogs_${currentUser.username}`;
      let localDefsLoaded = false;

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
    }
    const timer = setTimeout(() => setIsLoadingPage(false), 300);
    return () => clearTimeout(timer);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.username && !isLoadingPage) {
      try {
        const defsKey = `exerciseDefinitions_${currentUser.username}`;
        const logsKey = `allWorkoutLogs_${currentUser.username}`;
        
        localStorage.setItem(defsKey, JSON.stringify(exerciseDefinitions));
        localStorage.setItem(logsKey, JSON.stringify(allWorkoutLogs));
      } catch (e) {
        console.error("Error saving data to localStorage", e);
        toast({ title: "Save Error", description: "Could not save data locally. Storage might be full.", variant: "destructive"});
      }
    }
  }, [exerciseDefinitions, allWorkoutLogs, currentUser, isLoadingPage, toast]);


  useEffect(() => {
    if (!currentUser || exerciseDefinitions.length === 0) return;
  
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
  
    setAllWorkoutLogs(prevLogs => {
      const workoutExists = prevLogs.some(log => log.id === dateKey);
      if (workoutExists) {
        return prevLogs; // Don't modify if workout already exists
      }
  
      const weekOfMonth = getWeekOfMonth(selectedDate, { weekStartsOn: 1 });
      const dayOfWeek = getDay(selectedDate);
  
      let plan: typeof W1_PLAN | null = null;
      let planName = "";
  
      if (dayOfWeek >= 1 && dayOfWeek <= 3) { // Mon-Wed
        if (weekOfMonth === 1 || weekOfMonth === 3) { plan = W1_PLAN; planName="W1"; }
        if (weekOfMonth === 2 || weekOfMonth === 4) { plan = W3_PLAN; planName="W3"; }
      } else if (dayOfWeek >= 4 && dayOfWeek <= 5) { // Thu-Fri
        if (weekOfMonth === 1 || weekOfMonth === 3) { plan = W2_PLAN; planName="W2"; }
        if (weekOfMonth === 2 || weekOfMonth === 4) { plan = W4_PLAN; planName="W4"; }
      }
  
      if (!plan) return prevLogs;
  
      const muscleGroupsForDay = dailyMuscleGroups[dayOfWeek];
      if (!muscleGroupsForDay || muscleGroupsForDay.length === 0) return prevLogs;
      
      const exercisesToAdd: WorkoutExercise[] = [];
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
  
      if (exercisesToAdd.length > 0) {
        const newDatedWorkout: DatedWorkout = { id: dateKey, date: dateKey, exercises: exercisesToAdd };
        toast({ 
          title: "Workout Autopopulated!", 
          description: `Added ${planName} exercises for ${muscleGroupsForDay.join(' & ')}.`
        });
        return [...prevLogs, newDatedWorkout];
      }
  
      return prevLogs;
    });
  
  }, [selectedDate, currentUser, exerciseDefinitions, toast]);


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
  
  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)] bg-background">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your workout data...</p>
      </div>
    );
  }

  return (
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <section aria-labelledby="exercise-library-heading" className="md:col-span-1 space-y-6">
          <Card className="shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="bg-primary/10">
              <div className="flex items-center justify-between">
                <CardTitle id="exercise-library-heading" className="flex items-center gap-2 text-2xl text-primary">
                  <Dumbbell /> Exercise Library
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-auto h-8">
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
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleAddExerciseDefinition} className="space-y-3">
                <Input type="text" placeholder="New exercise name" value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} aria-label="New exercise name" className="h-10" />
                <Select value={newExerciseCategory} onValueChange={(value) => setNewExerciseCategory(value as ExerciseCategory)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{exerciseCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                </Select>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10"> <PlusCircle className="mr-2 h-5 w-5" /> Add Exercise </Button>
              </form>
              {filteredExerciseDefinitions.length === 0 && exerciseDefinitions.length > 0 ? (
                 <p className="text-muted-foreground text-sm text-center py-4">No exercises match filter.</p>
              ) : filteredExerciseDefinitions.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Library empty. Add exercises!</p>
              ) : (
                <ul className="space-y-2 max-h-[calc(50vh-100px)] overflow-y-auto pr-1">
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
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="current-workout-heading" className="md:col-span-2 space-y-6">
            <Card className="shadow-xl rounded-xl overflow-hidden">
                <CardHeader className="bg-accent/10 flex flex-row items-center justify-between p-4">
                    <CardTitle id="current-workout-heading" className="flex items-center gap-2 text-2xl text-accent">
                        <ListChecks /> Workout for: {format(selectedDate, 'PPP')}
                    </CardTitle>
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
                  {currentWorkoutExercises.length === 0 ? (
                    <div className="text-center py-10">
                        <GripVertical className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No exercises for {format(selectedDate, 'PPP')}.</p>
                        <p className="text-sm text-muted-foreground/80">Add exercises from library or select a weekday!</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                    {currentWorkoutExercises.map(exercise => (
                        <WorkoutExerciseCard 
                        key={exercise.id} exercise={exercise}
                        onLogSet={handleLogSet} onDeleteSet={handleDeleteSet} onUpdateSet={handleUpdateSet}
                        onRemoveExercise={handleRemoveExerciseFromWorkout}
                        />
                    ))}
                    </AnimatePresence>
                  )}
                </CardContent>
            </Card>
        </section>
      </div>
      {viewingProgressExercise && (
        <ExerciseProgressModal isOpen={isProgressModalOpen} onOpenChange={setIsProgressModalOpen}
          exercise={viewingProgressExercise} allWorkoutLogs={allWorkoutLogs}
        />
      )}
    </div>
  );
}

export default function Page() {
  return ( <AuthGuard> <WorkoutPageContent /> </AuthGuard> );
}

    