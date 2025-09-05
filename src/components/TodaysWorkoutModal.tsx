
"use client";

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WorkoutExercise, Activity, ExerciseDefinition, DatedWorkout, ExerciseCategory } from '@/types/workout';
import { Dumbbell, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import { useToast } from '@/hooks/use-toast';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

interface TodaysWorkoutModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activityToLog: Activity | null;
  dateForWorkout: Date;
  onActivityComplete: (slotName: string, activityId: string, isCompleted: boolean) => void;
  logWorkoutSet: (date: Date, exerciseId: string, reps: number, weight: number) => void;
  updateWorkoutSet: (date: Date, exerciseId: string, setId: string, reps: number, weight: number) => void;
  deleteWorkoutSet: (date: Date, exerciseId: string, setId: string) => void;
  removeExerciseFromWorkout: (date: Date, exerciseId: string) => void;
  swapWorkoutExercise: (date: Date, oldExerciseId: string, newExerciseDefinition: ExerciseDefinition) => void;
}

export function TodaysWorkoutModal({
  isOpen,
  onOpenChange,
  activityToLog,
  dateForWorkout,
  onActivityComplete,
  logWorkoutSet,
  updateWorkoutSet,
  deleteWorkoutSet,
  removeExerciseFromWorkout,
  swapWorkoutExercise,
}: TodaysWorkoutModalProps) {
  const { allWorkoutLogs, setAllWorkoutLogs, exerciseDefinitions, workoutMode, workoutPlans, swapWorkoutForDay, workoutPlanRotation, settings } = useAuth();
  const { toast } = useToast();

  const currentWorkoutLog = useMemo(() => {
    if (!isOpen) return null;
    const dateKey = format(dateForWorkout, 'yyyy-MM-dd');
    return allWorkoutLogs.find(log => log.date === dateKey);
  }, [allWorkoutLogs, isOpen, dateForWorkout]);
  
  const { exercises: todaysExercises, muscleGroupsForDay } = useMemo(() => {
      if (!isOpen) return { exercises: [], muscleGroupsForDay: []};
      
      const log = currentWorkoutLog;
      if (log && log.exercises.length > 0) {
          const muscleGroups = Array.from(new Set(log.exercises.map(ex => ex.category)));
          return { exercises: log.exercises, muscleGroupsForDay: muscleGroups };
      }

      // If no log for today, generate the workout plan
      const { exercises, description } = getExercisesForDay(dateForWorkout, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling, allWorkoutLogs);
      const muscleGroups = Array.from(new Set(exercises.map(ex => ex.category)));
      return { exercises, muscleGroupsForDay: muscleGroups };
      
  }, [isOpen, dateForWorkout, currentWorkoutLog, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling, allWorkoutLogs]);

  const exercisesInLog = currentWorkoutLog?.exercises || todaysExercises;

  const pendingExercises = useMemo(() => 
    exercisesInLog.filter(ex => ex.loggedSets.length < ex.targetSets), 
    [exercisesInLog]
  );

  const isWorkoutComplete = useMemo(() => {
    if (!currentWorkoutLog || currentWorkoutLog.exercises.length === 0) return false;
    
    return currentWorkoutLog.exercises.every(ex => 
      ex.loggedSets.length >= ex.targetSets
    );
  }, [currentWorkoutLog]);

  const handleCompleteWorkout = () => {
    if (!activityToLog) return;
    
    if (isWorkoutComplete) {
      onActivityComplete(activityToLog.slot, activityToLog.id, true);
      onOpenChange(false);
    } else {
      toast({
        title: "Workout Incomplete",
        description: "You must log all target sets for every exercise before marking the workout as complete.",
        variant: "destructive"
      });
    }
  };

  const handleSwapWorkout = (newCategories: ExerciseCategory[]) => {
    swapWorkoutForDay(dateForWorkout, newCategories);
  };

  const workoutOptions = useMemo(() => {
    if (workoutMode === 'one-muscle') {
      return ["Chest", "Triceps", "Back", "Biceps", "Shoulders", "Legs"].map(cat => ({
        label: cat,
        value: [cat as ExerciseCategory]
      }));
    } else { // two-muscle
      return [
        { label: "Chest & Triceps", value: ["Chest", "Triceps"] as ExerciseCategory[] },
        { label: "Back & Biceps", value: ["Back", "Biceps"] as ExerciseCategory[] },
        { label: "Shoulders & Legs", value: ["Shoulders", "Legs"] as ExerciseCategory[] },
      ];
    }
  }, [workoutMode]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 flex-row items-center justify-between">
          <div>
            <DialogTitle>
              Log Workout: {Array.isArray(muscleGroupsForDay) && muscleGroupsForDay.length > 0 ? muscleGroupsForDay.join(' & ') : 'Rest Day'}
            </DialogTitle>
            <DialogDescription>
              Log your sets for each exercise. You can swap exercises if needed.
            </DialogDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Change Workout
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {workoutOptions.map(option => (
                <DropdownMenuItem key={option.label} onSelect={() => handleSwapWorkout(option.value)}>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-4">
            {exercisesInLog.length > 0 ? (
              pendingExercises.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pendingExercises.map(exercise => {
                    const swappableExercises = exerciseDefinitions.filter(
                      def => def.category === exercise.category && !exercisesInLog.some(e => e.definitionId === def.id)
                    );
                    
                    return (
                      <WorkoutExerciseCard 
                          key={exercise.id}
                          exercise={exercise}
                          onLogSet={(...args) => logWorkoutSet(dateForWorkout, ...args)} 
                          onDeleteSet={(...args) => deleteWorkoutSet(dateForWorkout, ...args)} 
                          onUpdateSet={(...args) => updateWorkoutSet(dateForWorkout, ...args)} 
                          onRemoveExercise={(...args) => removeExerciseFromWorkout(dateForWorkout, ...args)}
                          onSwapExercise={(newDef) => swapWorkoutExercise(dateForWorkout, exercise.id, newDef)}
                          swappableExercises={swappableExercises}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 min-h-[300px]">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <p className="font-semibold text-lg">Workout Complete!</p>
                  <p className="text-sm">All target sets have been logged.</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 min-h-[300px]">
                <Dumbbell className="h-12 w-12 mb-4" />
                <p className="font-semibold">It's a rest day!</p>
                <p className="text-sm">No workout is scheduled for today.</p>
              </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button onClick={handleCompleteWorkout}>
                Mark as Complete & Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
