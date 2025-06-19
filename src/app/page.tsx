"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Dumbbell, ListChecks, Edit3, Save, X, ChevronRight, CheckSquare } from 'lucide-react';
import { ExerciseDefinition, WorkoutExercise, LoggedSet } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = "10-15";

export default function WorkoutPage() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [editingDefinition, setEditingDefinition] = useState<ExerciseDefinition | null>(null);
  const [editingDefinitionName, setEditingDefinitionName] = useState('');

  const [currentWorkout, setCurrentWorkout] = useState<WorkoutExercise[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      const savedDefs = localStorage.getItem('exerciseDefinitions');
      if (savedDefs) setExerciseDefinitions(JSON.parse(savedDefs));
      
      const savedWorkout = localStorage.getItem('currentWorkout');
      if (savedWorkout) setCurrentWorkout(JSON.parse(savedWorkout));
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('exerciseDefinitions', JSON.stringify(exerciseDefinitions));
    }
  }, [exerciseDefinitions, isClient]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('currentWorkout', JSON.stringify(currentWorkout));
    }
  }, [currentWorkout, isClient]);

  const handleAddExerciseDefinition = (e: FormEvent) => {
    e.preventDefault();
    if (newExerciseName.trim() === '') {
      toast({ title: "Error", description: "Exercise name cannot be empty.", variant: "destructive" });
      return;
    }
    if (exerciseDefinitions.some(def => def.name.toLowerCase() === newExerciseName.trim().toLowerCase())) {
      toast({ title: "Error", description: "Exercise with this name already exists.", variant: "destructive" });
      return;
    }
    const newDef: ExerciseDefinition = { id: Date.now().toString(), name: newExerciseName.trim() };
    setExerciseDefinitions(prev => [...prev, newDef]);
    setNewExerciseName('');
    toast({ title: "Success", description: `Exercise "${newDef.name}" added to library.` });
  };

  const handleDeleteExerciseDefinition = (id: string) => {
    setExerciseDefinitions(prev => prev.filter(def => def.id !== id));
    // Also remove from current workout if it's there
    setCurrentWorkout(prev => prev.filter(ex => ex.definitionId !== id));
    toast({ title: "Success", description: "Exercise removed from library." });
  };

  const handleStartEditDefinition = (def: ExerciseDefinition) => {
    setEditingDefinition(def);
    setEditingDefinitionName(def.name);
  };

  const handleSaveEditDefinition = () => {
    if (editingDefinition && editingDefinitionName.trim() !== '') {
      if (exerciseDefinitions.some(def => def.name.toLowerCase() === editingDefinitionName.trim().toLowerCase() && def.id !== editingDefinition.id)) {
        toast({ title: "Error", description: "Another exercise with this name already exists.", variant: "destructive" });
        return;
      }
      setExerciseDefinitions(prev => 
        prev.map(def => def.id === editingDefinition.id ? { ...def, name: editingDefinitionName.trim() } : def)
      );
      // Update name in current workout if it's there
      setCurrentWorkout(prev => 
        prev.map(ex => ex.definitionId === editingDefinition.id ? { ...ex, name: editingDefinitionName.trim() } : ex)
      );
      toast({ title: "Success", description: `Exercise updated to "${editingDefinitionName.trim()}".` });
      setEditingDefinition(null);
      setEditingDefinitionName('');
    } else {
      toast({ title: "Error", description: "Exercise name cannot be empty.", variant: "destructive" });
    }
  };

  const handleAddExerciseToWorkout = (definition: ExerciseDefinition) => {
    const newWorkoutExercise: WorkoutExercise = {
      id: `${definition.id}-${Date.now()}`, // Unique ID for this instance in the workout
      definitionId: definition.id,
      name: definition.name,
      loggedSets: [],
      targetSets: DEFAULT_TARGET_SETS,
      targetReps: DEFAULT_TARGET_REPS,
    };
    setCurrentWorkout(prev => [...prev, newWorkoutExercise]);
    toast({ title: "Added to Workout", description: `"${definition.name}" added to today's workout.` });
  };

  const handleRemoveExerciseFromWorkout = (exerciseId: string) => {
    setCurrentWorkout(prev => prev.filter(ex => ex.id !== exerciseId));
    toast({ title: "Success", description: "Exercise removed from workout." });
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => {
    const newSet: LoggedSet = { id: Date.now().toString(), reps, weight, timestamp: Date.now() };
    setCurrentWorkout(prev => prev.map(ex => 
      ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
    ));
    // Subtle animation or feedback could be triggered here too using toast or a temporary state
    // For now, toast is fine
    toast({ title: "Set Logged!", description: `Logged ${reps} reps at ${weight} kg/lb.`, className: "bg-green-500 text-white" });
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    setCurrentWorkout(prev => prev.map(ex =>
      ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
    ));
    toast({ title: "Set Deleted", description: "The set has been removed." });
  };

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => {
    setCurrentWorkout(prevWorkout => prevWorkout.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          loggedSets: ex.loggedSets.map(set => 
            set.id === setId ? { ...set, reps, weight, timestamp: Date.now() } : set
          )
        };
      }
      return ex;
    }));
    toast({ title: "Set Updated", description: "The set has been updated successfully."});
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
              <form onSubmit={handleAddExerciseDefinition} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="New exercise name"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  aria-label="New exercise name"
                  className="h-10"
                />
                <Button type="submit" size="icon" className="h-10 w-10 bg-primary hover:bg-primary/90 text-primary-foreground" aria-label="Add exercise to library">
                  <PlusCircle />
                </Button>
              </form>
              {exerciseDefinitions.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Your library is empty. Add some exercises!</p>
              ) : (
                <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  <AnimatePresence>
                    {exerciseDefinitions.map(def => (
                      <motion.li
                        key={def.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="p-3 bg-card border rounded-lg shadow-sm flex items-center justify-between gap-2"
                      >
                        {editingDefinition?.id === def.id ? (
                          <>
                            <Input 
                              value={editingDefinitionName} 
                              onChange={(e) => setEditingDefinitionName(e.target.value)}
                              className="flex-grow h-9"
                              aria-label="Edit exercise name"
                            />
                            <Button size="icon" variant="ghost" onClick={handleSaveEditDefinition} className="h-8 w-8 text-green-600 hover:text-green-500"><Save className="h-5 w-5"/></Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingDefinition(null)} className="h-8 w-8 text-gray-600 hover:text-gray-500"><X className="h-5 w-5"/></Button>
                          </>
                        ) : (
                          <>
                            <span className="font-medium text-foreground flex-grow truncate" title={def.name}>{def.name}</span>
                            <div className="flex-shrink-0 flex items-center">
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
                          </>
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
            <CardHeader className="bg-accent/10">
              <CardTitle id="current-workout-heading" className="flex items-center gap-2 text-2xl text-accent">
                <ListChecks />
                Today's Workout
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {currentWorkout.length === 0 ? (
                 <div className="text-center py-10">
                    <ListChecks className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Your workout is empty.</p>
                    <p className="text-sm text-muted-foreground/80">Add exercises from your library to get started!</p>
                 </div>
              ) : (
                <AnimatePresence>
                  {currentWorkout.map(exercise => (
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
    </main>
  );
}
