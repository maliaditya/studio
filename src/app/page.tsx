
"use client";

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Dumbbell, ListChecks, Edit3, Save, X, ChevronRight, CalendarIcon, GripVertical, TrendingUp } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, exerciseCategories } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { ExerciseProgressModal } from '@/components/ExerciseProgressModal';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';


const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = "10-15";
const DEFAULT_EXERCISE_CATEGORY: ExerciseCategory = "Other";

export default function WorkoutPage() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

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

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const savedDefs = localStorage.getItem('exerciseDefinitions');
      if (savedDefs) setExerciseDefinitions(JSON.parse(savedDefs));
      
      const savedLogs = localStorage.getItem('allWorkoutLogs');
      if (savedLogs) {
        const parsedLogs: DatedWorkout[] = JSON.parse(savedLogs);
        setAllWorkoutLogs(parsedLogs);
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('exerciseDefinitions', JSON.stringify(exerciseDefinitions));
    }
  }, [exerciseDefinitions, isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('allWorkoutLogs', JSON.stringify(allWorkoutLogs));
    }
  }, [allWorkoutLogs, isClient]);

  const currentDatedWorkout = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return allWorkoutLogs.find(log => log.id === dateKey);
  }, [selectedDate, allWorkoutLogs]);

  const currentWorkoutExercises = useMemo(() => {
    return currentDatedWorkout?.exercises || [];
  }, [currentDatedWorkout]);

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
    if (newExerciseName.trim() === '') {
      toast({ title: "Error", description: "Exercise name cannot be empty.", variant: "destructive" });
      return;
    }
    if (!newExerciseCategory) {
      toast({ title: "Error", description: "Please select an exercise category.", variant: "destructive" });
      return;
    }
    if (exerciseDefinitions.some(def => def.name.toLowerCase() === newExerciseName.trim().toLowerCase())) {
      toast({ title: "Error", description: "Exercise with this name already exists.", variant: "destructive" });
      return;
    }
    const newDef: ExerciseDefinition = { 
      id: Date.now().toString(), 
      name: newExerciseName.trim(),
      category: newExerciseCategory || DEFAULT_EXERCISE_CATEGORY
    };
    setExerciseDefinitions(prev => [...prev, newDef]);
    setNewExerciseName('');
    setNewExerciseCategory("");
    toast({ title: "Success", description: `Exercise "${newDef.name}" added to library.` });
  };

  const handleDeleteExerciseDefinition = (id: string) => {
    const defToDelete = exerciseDefinitions.find(def => def.id === id);
    setExerciseDefinitions(prev => prev.filter(def => def.id !== id));
    setAllWorkoutLogs(prevLogs => 
      prevLogs.map(log => ({
        ...log,
        exercises: log.exercises.filter(ex => ex.definitionId !== id)
      }))
    );
    toast({ title: "Success", description: `Exercise "${defToDelete?.name}" removed from library and all workouts.` });
  };

  const handleStartEditDefinition = (def: ExerciseDefinition) => {
    setEditingDefinition(def);
    setEditingDefinitionName(def.name);
    setEditingDefinitionCategory(def.category);
  };

  const handleSaveEditDefinition = () => {
    if (editingDefinition && editingDefinitionName.trim() !== '' && editingDefinitionCategory) {
      if (exerciseDefinitions.some(def => def.name.toLowerCase() === editingDefinitionName.trim().toLowerCase() && def.id !== editingDefinition.id)) {
        toast({ title: "Error", description: "Another exercise with this name already exists.", variant: "destructive" });
        return;
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
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newWorkoutExercise: WorkoutExercise = {
      id: `${definition.id}-${Date.now()}`,
      definitionId: definition.id,
      name: definition.name,
      category: definition.category,
      loggedSets: [],
      targetSets: DEFAULT_TARGET_SETS,
      targetReps: DEFAULT_TARGET_REPS,
    };

    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      if (existingWorkout.exercises.some(ex => ex.definitionId === definition.id)) {
        toast({ title: "Info", description: `"${definition.name}" is already in this workout.`, variant: "default" });
        return;
      }
      const updatedWorkout = {
        ...existingWorkout,
        exercises: [...existingWorkout.exercises, newWorkoutExercise]
      };
      updateOrAddWorkoutLog(updatedWorkout);
    } else {
      const newDatedWorkout: DatedWorkout = {
        id: dateKey,
        date: dateKey,
        exercises: [newWorkoutExercise]
      };
      updateOrAddWorkoutLog(newDatedWorkout);
    }
    toast({ title: "Added to Workout", description: `"${definition.name}" added to workout for ${format(selectedDate, 'PPP')}.` });
  };

  const handleRemoveExerciseFromWorkout = (exerciseId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.filter(ex => ex.id !== exerciseId);
      const exerciseName = existingWorkout.exercises.find(ex => ex.id === exerciseId)?.name;
      if (updatedExercises.length === 0 && !existingWorkout.notes) { 
        setAllWorkoutLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      } else {
        const updatedWorkout = { ...existingWorkout, exercises: updatedExercises };
        updateOrAddWorkoutLog(updatedWorkout);
      }
      toast({ title: "Success", description: `Exercise "${exerciseName || ''}" removed from workout for ${format(selectedDate, 'PPP')}.` });
    }
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const newSet: LoggedSet = { id: Date.now().toString(), reps, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      const updatedWorkout = { ...existingWorkout, exercises: updatedExercises };
      updateOrAddWorkoutLog(updatedWorkout);
      toast({ title: "Set Logged!", description: `Logged ${reps} reps at ${weight} kg/lb.`});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
      );
      const updatedWorkout = { ...existingWorkout, exercises: updatedExercises };
      updateOrAddWorkoutLog(updatedWorkout);
      toast({ title: "Set Deleted", description: "The set has been removed." });
    }
  };

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            loggedSets: ex.loggedSets.map(set => 
              set.id === setId ? { ...set, reps, weight, timestamp: Date.now() } : set
            )
          };
        }
        return ex;
      });
      const updatedWorkout = { ...existingWorkout, exercises: updatedExercises };
      updateOrAddWorkoutLog(updatedWorkout);
      toast({ title: "Set Updated", description: "The set has been updated successfully."});
    }
  };

  const handleViewProgress = (definition: ExerciseDefinition) => {
    setViewingProgressExercise(definition);
    setIsProgressModalOpen(true);
  };

  if (!isClient) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Dumbbell className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <main className="container mx-auto p-4 sm:p-6 lg:p-8 min-h-screen">
      <header className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-primary flex items-center justify-center gap-3">
          <Dumbbell className="h-10 w-10 sm:h-12 sm:w-12" />
          Workout Tracker
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Log your gains, one rep at a time.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <section aria-labelledby="exercise-library-heading" className="md:col-span-1 space-y-6">
          <Card className="shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="bg-primary/10">
              <CardTitle id="exercise-library-heading" className="flex items-center gap-2 text-2xl text-primary">
                <Dumbbell />
                Exercise Library
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleAddExerciseDefinition} className="space-y-3">
                <Input
                  type="text"
                  placeholder="New exercise name"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  aria-label="New exercise name"
                  className="h-10"
                />
                <Select value={newExerciseCategory} onValueChange={(value) => setNewExerciseCategory(value as ExerciseCategory)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {exerciseCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10">
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Exercise
                </Button>
              </form>
              {exerciseDefinitions.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Your library is empty. Add some exercises!</p>
              ) : (
                <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  <AnimatePresence>
                    {exerciseDefinitions.sort((a,b) => a.name.localeCompare(b.name)).map(def => (
                      <motion.li
                        key={def.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="p-3 bg-card border rounded-lg shadow-sm flex flex-col gap-2"
                      >
                        {editingDefinition?.id === def.id ? (
                          <div className="space-y-2">
                            <Input 
                              value={editingDefinitionName} 
                              onChange={(e) => setEditingDefinitionName(e.target.value)}
                              className="h-9"
                              aria-label="Edit exercise name"
                            />
                             <Select value={editingDefinitionCategory} onValueChange={(value) => setEditingDefinitionCategory(value as ExerciseCategory)}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {exerciseCategories.map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveEditDefinition} className="flex-grow bg-green-600 hover:bg-green-500 text-white"><Save className="h-4 w-4 mr-1"/>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingDefinition(null)} className="flex-grow"><X className="h-4 w-4 mr-1"/>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-grow">
                                <span className="font-medium text-foreground truncate block" title={def.name}>{def.name}</span>
                                <Badge variant="secondary" className="text-xs">{def.category}</Badge>
                            </div>
                            <div className="flex-shrink-0 flex items-center">
                              <Button variant="ghost" size="icon" onClick={() => handleViewProgress(def)} className="h-8 w-8 text-muted-foreground hover:text-blue-500" aria-label={`View progress for ${def.name}`}>
                                <TrendingUp className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleStartEditDefinition(def)} className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label={`Edit ${def.name}`}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteExerciseDefinition(def.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${def.name}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleAddExerciseToWorkout(def)} className="h-8 w-8 text-muted-foreground hover:text-accent" aria-label={`Add ${def.name} to workout`}>
                                <ChevronRight className="h-5 w-5" />
                              </Button>
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
                        <ListChecks />
                        Workout for: {format(selectedDate, 'PPP')}
                    </CardTitle>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                            "w-[200px] justify-start text-left font-normal h-10",
                            !selectedDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(date)}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                </CardHeader>
                <CardContent className="p-4">
                  {currentWorkoutExercises.length === 0 ? (
                    <div className="text-center py-10">
                        <GripVertical className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No exercises logged for {format(selectedDate, 'PPP')}.</p>
                        <p className="text-sm text-muted-foreground/80">Add exercises from your library to get started!</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                    {currentWorkoutExercises.map(exercise => (
                        <WorkoutExerciseCard 
                        key={exercise.id} 
                        exercise={exercise}
                        onLogSet={handleLogSet}
                        onDeleteSet={handleDeleteSet}
                        onUpdateSet={handleUpdateSet}
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
        <ExerciseProgressModal
          isOpen={isProgressModalOpen}
          onOpenChange={setIsProgressModalOpen}
          exercise={viewingProgressExercise}
          allWorkoutLogs={allWorkoutLogs}
        />
      )}
    </main>
  );
}

