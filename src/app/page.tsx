
"use client";

import React, { useState, useEffect, FormEvent, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Dumbbell, ListChecks, Edit3, Save, X, ChevronRight, CalendarIcon, GripVertical, TrendingUp, Filter as FilterIcon, Loader2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, getDay } from 'date-fns';
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

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = "10-15";
const DEFAULT_EXERCISE_CATEGORY: ExerciseCategory = "Other";

const dailyCategoryMap: Record<number, ExerciseCategory[]> = {
  0: [], 1: ["Chest", "Triceps"], 2: ["Back", "Biceps"], 3: ["Shoulders", "Legs"],
  4: ["Chest", "Triceps"], 5: ["Back", "Biceps"], 6: ["Shoulders", "Legs"],
};

const DEFAULT_EXERCISE_DEFINITIONS: ExerciseDefinition[] = [
  { id: `def_chest_01`, name: "Flat Barbell Bench Press", category: "Chest" }, { id: `def_chest_02`, name: "Incline Barbell Press", category: "Chest" }, { id: `def_chest_03`, name: "Decline Dumbbell Press", category: "Chest" }, { id: `def_chest_04`, name: "Peck Machine", category: "Chest" }, { id: `def_chest_05`, name: "Dumbbell Flat Press", category: "Chest" }, { id: `def_chest_06`, name: "Incline Dumbbell Press", category: "Chest" }, { id: `def_chest_07`, name: "Cable Fly", category: "Chest" }, { id: `def_chest_08`, name: "Dumbbell Chest Fly", category: "Chest" }, { id: `def_chest_09`, name: "Dumbbell Pullovers", category: "Chest" },
  { id: `def_triceps_01`, name: "Close-Grip Barbell Bench Press", category: "Triceps" }, { id: `def_triceps_02`, name: "Overhead Dumbbell Extension", category: "Triceps" }, { id: `def_triceps_03`, name: "Dumbbell Kickback", category: "Triceps" }, { id: `def_triceps_04`, name: "Cable Rope Pushdown (Slow)", category: "Triceps" }, { id: `def_triceps_05`, name: "Overhead Cable Extension", category: "Triceps" }, { id: `def_triceps_06`, name: "Reverse-grip pushdown", category: "Triceps" }, { id: `def_triceps_07`, name: "Rope Pushdown", category: "Triceps" }, { id: `def_triceps_08`, name: "Double-Arm Dumbbell Kickback", category: "Triceps" }, { id: `def_triceps_09`, name: "Straight bar pushdown", category: "Triceps" }, { id: `def_triceps_10`, name: "Reverse Bar Pushdown", category: "Triceps" }, { id: `def_triceps_11`, name: "Back dips", category: "Triceps" },
  { id: `def_back_01`, name: "Lat Pulldown", category: "Back" }, { id: `def_back_02`, name: "Machine Row", category: "Back" }, { id: `def_back_03`, name: "T-Bar Row", category: "Back" }, { id: `def_back_04`, name: "Lat Prayer Pull", category: "Back" }, { id: `def_back_05`, name: "Lat Pulldown (Wide Grip)", category: "Back" }, { id: `def_back_06`, name: "V handle lat pulldown", category: "Back" }, { id: `def_back_07`, name: "1-Arm Dumbbell Row", category: "Back" }, { id: `def_back_08`, name: "Back extensions", category: "Back" }, { id: `def_back_09`, name: "Barbell Row", category: "Back" }, { id: `def_back_10`, name: "Seated Row", category: "Back" }, { id: `def_back_11`, name: "DeadLifts", category: "Back" },
  { id: `def_biceps_01`, name: "Standing dumbbell curls", category: "Biceps" }, { id: `def_biceps_02`, name: "Standing Dumbbell Alternating Curl", category: "Biceps" }, { id: `def_biceps_03`, name: "Preacher curls Dumbbells", category: "Biceps" }, { id: `def_biceps_04`, name: "Hammer Curl (Dumbbell)", category: "Biceps" }, { id: `def_biceps_05`, name: "Seated Incline Dumbbell Curl", category: "Biceps" }, { id: `def_biceps_06`, name: "Seated Dumbbell Alternating Curl", category: "Biceps" }, { id: `def_biceps_07`, name: "Reverse Cable", category: "Biceps" }, { id: `def_biceps_08`, name: "Strict bar curls", category: "Biceps" }, { id: `def_biceps_09`, name: "Reversed Incline curls", category: "Biceps" }, { id: `def_biceps_10`, name: "Cable Curls Superset", category: "Biceps" }, { id: `def_biceps_11`, name: "Reversed cable curls", category: "Biceps" }, { id: `def_biceps_12`, name: "Seated Machine Curls", category: "Biceps" }, { id: `def_biceps_13`, name: "Cable Curls", category: "Biceps" },
  { id: `def_shoulders_01`, name: "Seated Dumbbell Shoulder Press", category: "Shoulders" }, { id: `def_shoulders_02`, name: "Standing Dumbbell Lateral Raise", category: "Shoulders" }, { id: `def_shoulders_03`, name: "Face Pulls", category: "Shoulders" }, { id: `def_shoulders_04`, name: "Shrugs", category: "Shoulders" }, { id: `def_shoulders_05`, name: "Seated Dumbbell Lateral Raise", category: "Shoulders" }, { id: `def_shoulders_06`, name: "Rear Delt Fly (Incline Bench)", category: "Shoulders" }, { id: `def_shoulders_07`, name: "Cable Upright Rows", category: "Shoulders" }, { id: `def_shoulders_08`, name: "Dumbbell Lateral Raise (Lean in)", category: "Shoulders" }, { id: `def_shoulders_09`, name: "Lean-Away Cable Lateral Raise", category: "Shoulders" }, { id: `def_shoulders_10`, name: "Front Raise cable", category: "Shoulders" },
  { id: `def_legs_01`, name: "Walking Lunges (Barbell)", category: "Legs" }, { id: `def_legs_02`, name: "Leg Press", category: "Legs" }, { id: `def_legs_03`, name: "Quads Machine", category: "Legs" }, { id: `def_legs_04`, name: "Hamstring machine", category: "Legs" }, { id: `def_legs_05`, name: "Squats (Barbell)", category: "Legs" }, { id: `def_legs_06`, name: "Calfs (Bodyweight)", category: "Legs" },
];

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
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSavingData, setIsSavingData] = useState(false);

  // Debounce function
  const debounce = <F extends (...args: any[]) => any>(func: F, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<F>): Promise<ReturnType<F>> => {
      return new Promise((resolve) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          resolve(func(...args));
        }, delay);
      });
    };
  };

  const saveDataToBackend = useCallback(async (userId: string, data: { exerciseDefinitions: ExerciseDefinition[], allWorkoutLogs: DatedWorkout[] }) => {
    if (!userId) return;
    setIsSavingData(true);
    try {
      const response = await fetch(`/api/workout-data?userId=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save data');
      }
      // Optional: show success toast, but can be too noisy for autosave
      // toast({ title: "Data Saved", description: "Your workout data has been saved to the server." });
    } catch (error: any) {
      console.error("Error saving data to backend:", error);
      toast({ title: "Save Error", description: error.message || "Could not save data to server.", variant: "destructive" });
    } finally {
      setIsSavingData(false);
    }
  }, [toast]);

  const debouncedSaveData = useMemo(() => debounce(saveDataToBackend, 2000), [saveDataToBackend]);


  useEffect(() => {
    if (currentUser?.username) {
      const fetchData = async () => {
        setIsLoadingData(true);
        try {
          const response = await fetch(`/api/workout-data?userId=${encodeURIComponent(currentUser.username)}`);
          if (!response.ok) {
            throw new Error('Failed to fetch data');
          }
          const data = await response.json();
          
          if (data.exerciseDefinitions && data.exerciseDefinitions.length > 0) {
            setExerciseDefinitions(data.exerciseDefinitions);
          } else {
            // Initialize with defaults if backend has no definitions for this user
            const timestamp = Date.now().toString();
            const uniqueDefaultDefs = DEFAULT_EXERCISE_DEFINITIONS.map((def, index) => ({
              ...def,
              id: `${timestamp}_${index}_${def.name.replace(/\s+/g, '_')}`
            }));
            setExerciseDefinitions(uniqueDefaultDefs);
            // Trigger a save for the new default definitions
            if(currentUser?.username){
                // This will be picked up by the other useEffect to save
            }
          }
          setAllWorkoutLogs(data.allWorkoutLogs || []);

        } catch (error) {
          console.error("Error fetching data from backend:", error);
          toast({ title: "Error", description: "Could not load data from server.", variant: "destructive" });
          // Fallback to defaults if server fetch fails for some reason, or empty if preferred
           const timestamp = Date.now().toString();
            const uniqueDefaultDefs = DEFAULT_EXERCISE_DEFINITIONS.map((def, index) => ({
              ...def,
              id: `${timestamp}_${index}_${def.name.replace(/\s+/g, '_')}`
            }));
          setExerciseDefinitions(uniqueDefaultDefs);
          setAllWorkoutLogs([]);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchData();
    } else {
      // Not logged in, clear data or handle as guest (currently AuthGuard handles this)
      setExerciseDefinitions([]);
      setAllWorkoutLogs([]);
      setIsLoadingData(false);
    }
  }, [currentUser, toast]);


  useEffect(() => {
    // This effect triggers a save whenever exerciseDefinitions or allWorkoutLogs change,
    // after the initial data load is complete and user is logged in.
    if (!isLoadingData && currentUser?.username && (exerciseDefinitions.length > 0 || allWorkoutLogs.length > 0)) {
      debouncedSaveData(currentUser.username, { exerciseDefinitions, allWorkoutLogs });
    }
  }, [exerciseDefinitions, allWorkoutLogs, isLoadingData, currentUser, debouncedSaveData]);


  useEffect(() => {
    if (selectedDate) {
      const dayOfWeek = getDay(selectedDate);
      const categoriesForDay = dailyCategoryMap[dayOfWeek];
      if (categoriesForDay && JSON.stringify(categoriesForDay) !== JSON.stringify(selectedCategories)) {
        setSelectedCategories(categoriesForDay);
      }
    }
  }, [selectedDate, selectedCategories]);


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
      if (updatedExercises.length === 0 && !existingWorkout.notes) { 
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
  
  if (isLoadingData) {
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
        <p className="text-muted-foreground mt-1 text-md">Log your gains, {currentUser?.username || "Guest"}.</p>
        {isSavingData && (
          <div className="absolute top-0 right-0 mt-1 mr-1 flex items-center text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving...
          </div>
        )}
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
                                <span className="font-medium text-foreground" title={def.name}>{def.name}</span>
                                <Badge variant="secondary" className="text-xs ml-1 my-0.5">{def.category}</Badge>
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
                        <p className="text-sm text-muted-foreground/80">Add exercises from library!</p>
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
