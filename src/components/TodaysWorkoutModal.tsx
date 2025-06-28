
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
import type { WorkoutExercise, Activity } from '@/types/workout';
import { Dumbbell, TrendingUp } from 'lucide-react';
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
    removeExerciseFromWorkout 
  } = useAuth();
  const { toast } = useToast();

  const today = useMemo(() => new Date(), [isOpen]); // Recalculate 'today' only when modal opens

  const currentWorkoutLog = useMemo(() => {
    if (!isOpen) return null;
    const dateKey = format(today, 'yyyy-MM-dd');
    return allWorkoutLogs.find(log => log.date === dateKey);
  }, [allWorkoutLogs, isOpen, today]);

  const exercisesInLog = currentWorkoutLog?.exercises || todaysExercises;

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
      <DialogContent className="sm:max-w-3xl max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Log Workout: {muscleGroupsForDay.join(' & ') || 'Rest Day'}
          </DialogTitle>
          <DialogDescription>
            Log your sets for each exercise. The workout can be marked as complete once all target sets are logged.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow min-h-0">
          <div className="pr-6">
            {exercisesInLog.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 {exercisesInLog.map(exercise => (
                    <WorkoutExerciseCard 
                        key={exercise.id} 
                        exercise={exercise}
                        onLogSet={(...args) => logWorkoutSet(today, ...args)} 
                        onDeleteSet={(...args) => deleteWorkoutSet(today, ...args)} 
                        onUpdateSet={(...args) => updateWorkoutSet(today, ...args)} 
                        onRemoveExercise={(...args) => removeExerciseFromWorkout(today, ...args)}
                    />
                 ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                <Dumbbell className="h-12 w-12 mb-4" />
                <p className="font-semibold">It's a rest day!</p>
                <p className="text-sm">No workout is scheduled for today.</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="flex-shrink-0">
            <Button onClick={handleCompleteWorkout}>
                Mark as Complete & Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
