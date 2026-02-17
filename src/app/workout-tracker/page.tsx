

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
import { format, parseISO, getDay, getISOWeek, isMonday, getYear, parse, getISOWeekYear, addWeeks, startOfISOWeek, setISOWeek, differenceInDays, subYears, addDays } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, exerciseCategories, WorkoutMode, AllWorkoutPlans, WeightLog, Gender, UserDietPlan, WorkoutPlan, StrengthTrainingMode } from '@/types/workout';
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
import { safeSetLocalStorageItem } from '@/lib/safeStorage';
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
import { INITIAL_PLANS } from '@/lib/constants';


const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = "8-12";
const DEFAULT_EXERCISE_CATEGORY: ExerciseCategory = "Other";

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
    dietPlan,
    allWorkoutLogs, setAllWorkoutLogs,
    logWorkoutSet, updateWorkoutSet, deleteWorkoutSet,
    removeExerciseFromWorkout,
    swapWorkoutExercise,
    workoutMode, setWorkoutMode,
    strengthTrainingMode, setStrengthTrainingMode,
    workoutPlanRotation, setWorkoutPlanRotation,
    workoutPlans, setWorkoutPlans,
    exerciseDefinitions, setExerciseDefinitions,
  } = useAuth();

  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseCategory, setNewExerciseCategory] = useState<ExerciseCategory | "">("");

  const [editingDefinition, setEditingDefinition] = useState<ExerciseDefinition | null>(null);
  const [editingDefinitionName, setEditingDefinitionName] = useState('');
  const [editingDefinitionCategory, setEditingDefinitionCategory] = useState<ExerciseCategory | "">("");

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [viewingProgressExercise, setViewingProgressExercise] = useState<ExerciseDefinition | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<ExerciseCategory[]>([]);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);

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
    // The context handles loading data, so we just set loading to false.
    setIsLoadingPage(false);
  }, []);

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
    if (!currentUser || exerciseDefinitions.length === 0 || Object.keys(workoutPlans).length === 0 || !workoutMode) {
      return;
    }

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const workoutExists = allWorkoutLogs.some(log => log.id === dateKey);

    if (!workoutExists) {
        const { exercises, description } = getExercisesForDay(selectedDate, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation);
        
        if (exercises.length > 0) {
            const newDatedWorkout: DatedWorkout = { id: dateKey, date: dateKey, exercises };
            setAllWorkoutLogs(prevLogs => [...prevLogs, newDatedWorkout]);
            toast({
              title: "Workout Autopopulated!",
              description: description,
            });
        }
    }
  }, [selectedDate, currentUser, exerciseDefinitions, workoutMode, workoutPlanRotation, workoutPlans, allWorkoutLogs, setAllWorkoutLogs, toast]);

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
    safeSetLocalStorageItem(backupPromptKey, 'true');
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
    if (!currentDatedWorkout?.exercises) return [];
    // Ensure all loaded exercises respect the current default target sets
    return currentDatedWorkout.exercises.map(ex => ({ ...ex, targetSets: DEFAULT_TARGET_SETS }));
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
        const singleMuscleDailySchedule: Record<number, ExerciseCategory | null> = {
            1: "Chest", 2: "Triceps", 3: "Back", 4: "Biceps", 5: "Shoulders", 6: "Legs", 0: null,
        };
        const muscle = singleMuscleDailySchedule[dayOfWeek];
        return muscle ? [muscle] : [];
    }
    const dailyMuscleGroups: Record<number, string[]> = {
      1: ["Chest", "Triceps"], 2: ["Back", "Biceps"], 3: ["Shoulders", "Legs"],
      4: ["Chest", "Triceps"], 5: ["Back", "Biceps"], 6: ["Shoulders", "Legs"], 0: [],
    };
    return dailyMuscleGroups[dayOfWeek] || [];
  }, [selectedDate, workoutMode]);

  const handleCategoryFilterChange = (category: ExerciseCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
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
      id: `def_${Date.now()}_${Math.random()}`, 
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
      id: `${definition.id}-${Date.now()}-${Math.random()}`, definitionId: definition.id, name: definition.name, category: definition.category,
      loggedSets: [], targetSets: DEFAULT_TARGET_SETS, targetReps: DEFAULT_TARGET_REPS,
    };

    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      if (existingWorkout.exercises.some(ex => ex.definitionId === definition.id)) {
        toast({ title: "Info", description: `"${definition.name}" is already in this workout.`, variant: "default" }); return;
      }
      setAllWorkoutLogs(prev => prev.map(log => log.id === dateKey ? {...log, exercises: [...log.exercises, newWorkoutExercise]} : log));
    } else {
      setAllWorkoutLogs(prev => [...prev, { id: dateKey, date: dateKey, exercises: [newWorkoutExercise] }]);
    }
    toast({ title: "Added to Workout", description: `"${definition.name}" added for ${format(selectedDate, 'PPP')}.` });
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
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Strength Training</Label>
                    <RadioGroup
                      value={strengthTrainingMode}
                      onValueChange={(value) => setStrengthTrainingMode(value as StrengthTrainingMode)}
                      className="flex flex-wrap gap-x-4 gap-y-2 pt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="resistance" id="r-resistance" />
                        <Label htmlFor="r-resistance" className="font-normal">Resistance Training</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="calisthenics" id="r-calisthenics" />
                        <Label htmlFor="r-calisthenics" className="font-normal">Calisthenics</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Workout Plan</Label>
                    <RadioGroup
                      value={workoutMode}
                      onValueChange={(value) => handleWorkoutModeChange(value as WorkoutMode)}
                      className="flex flex-wrap gap-x-4 gap-y-2 pt-2"
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
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Switch id="plan-rotation" checked={workoutPlanRotation} onCheckedChange={setWorkoutPlanRotation}/>
                        <Label htmlFor="plan-rotation">Plan Rotation</Label>
                    </div>
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
                              const swappableExercises = exerciseDefinitions.filter(
                                def => def.category === exercise.category && !currentWorkoutExercises.some(e => e.definitionId === def.id)
                              );
                              return (
                                <WorkoutExerciseCard 
                                  key={exercise.id} 
                                  exercise={exercise}
                                  onLogSet={(...args) => logWorkoutSet(selectedDate, ...args)} 
                                  onDeleteSet={(...args) => deleteWorkoutSet(selectedDate, ...args)} 
                                  onUpdateSet={(...args) => updateWorkoutSet(selectedDate, ...args)} 
                                  onRemoveExercise={(...args) => removeExerciseFromWorkout(selectedDate, ...args)}
                                  onSwapExercise={(newDef) => swapWorkoutExercise(selectedDate, exercise.id, newDef)}
                                  swappableExercises={swappableExercises}
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
                  description="Your consistency over the last year. Click a square to view that day's log."
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
