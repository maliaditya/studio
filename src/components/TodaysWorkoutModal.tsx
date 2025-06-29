
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
import type { WorkoutExercise, Activity, ExerciseDefinition } from '@/types/workout';
import { Dumbbell, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import { useToast } from '@/hooks/use-toast';

interface TodaysWorkoutModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activityToLog: Activity | null;
  todaysExercises: WorkoutExercise[];
  muscleGroupsForDay: string[];
  onActivityComplete: (slotName: string, activityId: string) => void;
}

export function TodaysWorkoutModal({
  isOpen,
  onOpenChange,
  activityToLog,
  todaysExercises,
  muscleGroupsForDay,
  onActivityComplete,
}: TodaysWorkoutModalProps) {
  const { 
    allWorkoutLogs, 
    logWorkoutSet, 
    updateWorkoutSet, 
    deleteWorkoutSet,
    removeExerciseFromWorkout,
    swapWorkoutExercise,
    exerciseDefinitions
  } = useAuth();
  const { toast } = useToast();

  const today = useMemo(() => new Date(), [isOpen]);

  const currentWorkoutLog = useMemo(() => {
    if (!isOpen) return null;
    const dateKey = format(today, 'yyyy-MM-dd');
    return allWorkoutLogs.find(log => log.date === dateKey);
  }, [allWorkoutLogs, isOpen, today]);

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
      onActivityComplete(activityToLog.slot, activityToLog.id);
      onOpenChange(false);
    } else {
      toast({
        title: "Workout Incomplete",
        description: "You must log all target sets for every exercise before marking the workout as complete.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            Log Workout: {muscleGroupsForDay.join(' & ') || 'Rest Day'}
          </DialogTitle>
          <DialogDescription>
            Log your sets for each exercise. You can swap exercises if needed.
          </DialogDescription>
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
                          onLogSet={(...args) => logWorkoutSet(today, ...args)} 
                          onDeleteSet={(...args) => deleteWorkoutSet(today, ...args)} 
                          onUpdateSet={(...args) => updateWorkoutSet(today, ...args)} 
                          onRemoveExercise={(...args) => removeExerciseFromWorkout(today, ...args)}
                          onSwapExercise={(newDef) => swapWorkoutExercise(today, exercise.id, newDef)}
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
        <DialogFooter className="flex-shrink-0 pt-4">
            <Button onClick={handleCompleteWorkout}>
                Mark as Complete & Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
