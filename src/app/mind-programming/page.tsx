

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

function MindProgrammingPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    exportData,
    // Using workout-related state names but they will store mind-programming data
    allMindProgrammingLogs: allWorkoutLogs, 
    setAllMindProgrammingLogs: setAllWorkoutLogs,
    mindProgrammingDefinitions: exerciseDefinitions, 
    setMindProgrammingDefinitions: setExerciseDefinitions,
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

  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(false);

  useEffect(() => {
    setIsLoadingPage(false);
  }, []);


  useEffect(() => {
      if (!currentUser) return;
      
      const today = new Date();
      const year = getYear(today);
      const week = getISOWeek(today);
      const backupPromptKey = `backupPrompt_mind_${year}-${week}`;

      const hasBeenPrompted = localStorage.getItem(backupPromptKey);

      if (isMonday(today) && !hasBeenPrompted) {
          setShowBackupPrompt(true);
      }

  }, [currentUser]);

  const markBackupPromptAsHandled = () => {
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_mind_${year}-${week}`;
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
    if (!currentDatedWorkout?.exercises) return [];
    return currentDatedWorkout.exercises.map(ex => ({ ...ex, targetSets: DEFAULT_TARGET_SETS }));
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

  const handleAddExerciseDefinition = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" }); return;
    }
    if (newExerciseName.trim() === '') {
      toast({ title: "Error", description: "Name cannot be empty.", variant: "destructive" }); return;
    }
    if (!newExerciseCategory) {
      toast({ title: "Error", description: "Please select a category.", variant: "destructive" }); return;
    }
    const newDef: ExerciseDefinition = { 
      id: `mp_def_${Date.now()}`, 
      name: newExerciseName.trim(),
      category: newExerciseCategory || DEFAULT_EXERCISE_CATEGORY
    };
    setExerciseDefinitions(prev => [...prev, newDef]);
    setNewExerciseName('');
    setNewExerciseCategory("");
    toast({ title: "Success", description: `"${newDef.name}" added to library.` });
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
    toast({ title: "Success", description: `"${defToDelete?.name}" removed.` });
  };

  const handleStartEditDefinition = (def: ExerciseDefinition) => {
    setEditingDefinition(def);
    setEditingDefinitionName(def.name);
    setEditingDefinitionCategory(def.category);
  };

  const handleSaveEditDefinition = () => {
    if (!currentUser) { toast({ title: "Error", description: "You must be logged in.", variant: "destructive" }); return; }
    if (editingDefinition && editingDefinitionName.trim() !== '' && editingDefinitionCategory) {
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
      toast({ title: "Success", description: `Updated to "${updatedDef.name}".` });
      setEditingDefinition(null);
      setEditingDefinitionName('');
      setEditingDefinitionCategory("");
    } else {
      toast({ title: "Error", description: "Name and category cannot be empty.", variant: "destructive" });
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
        toast({ title: "Info", description: `"${definition.name}" is already in this session.`, variant: "default" }); return;
      }
      setAllWorkoutLogs(prev => prev.map(log => log.id === dateKey ? {...log, exercises: [...log.exercises, newWorkoutExercise]} : log));
    } else {
      setAllWorkoutLogs(prev => [...prev, { id: dateKey, date: dateKey, exercises: [newWorkoutExercise] }]);
    }
    toast({ title: "Added to Session", description: `"${definition.name}" added for ${format(selectedDate, 'PPP')}.` });
  };
  
  const handleRemoveExerciseFromWorkout = (exerciseId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) { 
        setAllWorkoutLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      } else {
        setAllWorkoutLogs(prevLogs => prevLogs.map(log => log.id === dateKey ? {...log, exercises: updatedExercises} : log));
      }
    }
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const newSet: LoggedSet = { id: `${Date.now()}-${Math.random()}`, reps, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      setAllWorkoutLogs(prevLogs => prevLogs.map(log => log.id === dateKey ? {...log, exercises: updatedExercises} : log));
      toast({ title: "Set Logged!", description: "Your progress has been saved."});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    setAllWorkoutLogs(prevLogs => prevLogs.map(log => {
      if (log.id === dateKey) {
        return {
          ...log,
          exercises: log.exercises.map(ex =>
            ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
          )
        };
      }
      return log;
    }));
  };

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    setAllWorkoutLogs(prevLogs => prevLogs.map(log => {
      if (log.id === dateKey) {
        return {
          ...log,
          exercises: log.exercises.map(ex =>
            ex.id === exerciseId ? {
              ...ex,
              loggedSets: ex.loggedSets.map(set =>
                set.id === setId ? { ...set, reps, weight, timestamp: Date.now() } : set
              )
            } : ex
          )
        };
      }
      return log;
    }));
  };
  
  const handleViewProgress = (definition: ExerciseDefinition) => {
    setViewingProgressExercise(definition);
    setIsProgressModalOpen(true);
  };

  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading Mind Programming module...</p>
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
                    <BookCopy /> Mindset Card Library
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                  <form onSubmit={handleAddExerciseDefinition} className="space-y-3">
                    <Input type="text" placeholder="New mindset card name" value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} aria-label="New mindset card name" className="h-10 text-sm" />
                    <Select value={newExerciseCategory} onValueChange={(value) => setNewExerciseCategory(value as ExerciseCategory)}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{exerciseCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent>
                    </Select>
                    <Button type="submit" size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs xl:text-sm xl:h-10 xl:px-4"> <PlusCircle className="mr-2 h-5 w-5" /> Add Card </Button>
                  </form>
                  <div className="max-h-[calc(100vh-38rem)] overflow-y-auto pr-1">
                    {exerciseDefinitions.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">Library empty. Add a new card to get started!</p>
                    ) : (
                      <ul className="space-y-2">
                        <AnimatePresence>
                          {exerciseDefinitions.sort((a,b) => a.name.localeCompare(b.name)).map(def => (
                            <motion.li key={def.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="p-3 bg-card border rounded-lg shadow-sm">
                              {editingDefinition?.id === def.id ? (
                                <div className="space-y-2">
                                  <Input value={editingDefinitionName} onChange={(e) => setEditingDefinitionName(e.target.value)} className="h-9" aria-label="Edit name"/>
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
                                    <Button variant="ghost" size="icon" onClick={() => handleAddExerciseToWorkout(def)} className="h-8 w-8 text-muted-foreground hover:text-accent" aria-label={`Add ${def.name} to session`}> <ChevronRight className="h-5 w-5" /> </Button>
                                  </div>
                                </div>
                              )}
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    )}
                  </div>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="current-session-heading" className="md:col-span-2 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="flex-grow">
                          <CardTitle id="current-session-heading" className="flex items-center gap-2 text-lg text-primary">
                              <ListChecks /> Session for: {format(selectedDate, 'PPP')}
                          </CardTitle>
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
                            <p className="text-muted-foreground">No mindset cards for {format(selectedDate, 'PPP')}.</p>
                            <p className="text-sm text-muted-foreground/80">Add cards from the library to get started!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <AnimatePresence>
                          {currentWorkoutExercises.map(exercise => (
                              <WorkoutExerciseCard 
                                key={exercise.id} 
                                exercise={exercise}
                                onLogSet={handleLogSet} 
                                onDeleteSet={handleDeleteSet} 
                                onUpdateSet={handleUpdateSet} 
                                onRemoveExercise={handleRemoveExerciseFromWorkout}
                                onViewProgress={viewingProgressExercise ? () => handleViewProgress(viewingProgressExercise) : undefined}
                              />
                          ))}
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
            exercise={viewingProgressExercise} allWorkoutLogs={allWorkoutLogs} pageType="workout"
          />
        )}
      </div>

      <AlertDialog open={showBackupPrompt} onOpenChange={setShowBackupPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weekly Backup Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              It's Monday! Would you like to back up your mind programming data now? This will download a file to your computer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={markBackupPromptAsHandled}>Maybe Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackupConfirm}>Yes, Back Up Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function Page() {
  return ( <AuthGuard> <MindProgrammingPageContent /> </AuthGuard> );
}
