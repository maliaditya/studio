
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
import type { WorkoutExercise, Activity, ExerciseDefinition, DatedWorkout } from '@/types/workout';
import { Brain, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import { useToast } from '@/hooks/use-toast';

interface TodaysMindsetModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activityToLog: Activity | null;
  dateForWorkout: Date;
  onActivityComplete: (slotName: string, activityId: string, isCompleted: boolean) => void;
}

export function TodaysMindsetModal({
  isOpen,
  onOpenChange,
  activityToLog,
  dateForWorkout,
  onActivityComplete,
}: TodaysMindsetModalProps) {
  const { 
    allMindProgrammingLogs,
    mindProgrammingDefinitions,
    logMindsetSet,
    deleteMindsetSet
  } = useAuth();
  const { toast } = useToast();

  const dateKey = useMemo(() => format(dateForWorkout, 'yyyy-MM-dd'), [dateForWorkout]);

  const exercisesForToday = useMemo(() => {
    // For mindset, we always show all available definitions
    return mindProgrammingDefinitions;
  }, [mindProgrammingDefinitions]);

  const loggedExercisesForToday = useMemo(() => {
    const log = allMindProgrammingLogs.find(l => l.date === dateKey);
    return log ? log.exercises : [];
  }, [allMindProgrammingLogs, dateKey]);

  const isComplete = useMemo(() => {
    return loggedExercisesForToday.some(ex => ex.loggedSets.length > 0);
  }, [loggedExercisesForToday]);

  const handleCompleteMindset = () => {
    if (!activityToLog) return;
    onActivityComplete(activityToLog.slot, activityToLog.id, true);
    onOpenChange(false);
  };
  
  const handleLogSet = (definitionId: string) => {
    const log = allMindProgrammingLogs.find(l => l.date === dateKey);
    const exerciseLog = log?.exercises.find(ex => ex.definitionId === definitionId);
    
    logMindsetSet(dateForWorkout, exerciseLog?.id || `${definitionId}-${Date.now()}`, definitionId, 1, 15);
    toast({ title: "Mindset Logged!" });
  };
  
  const handleDeleteSet = (exerciseId: string, setId: string) => {
     deleteMindsetSet(dateForWorkout, exerciseId, setId);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            Log Mindset Session
          </DialogTitle>
          <DialogDescription>
            Perform your chosen mindset techniques.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-4">
            {exercisesForToday.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {exercisesForToday.map(exerciseDef => {
                  const exerciseLog = loggedExercisesForToday.find(ex => ex.definitionId === exerciseDef.id);
                  const workoutExercise: WorkoutExercise = exerciseLog || {
                      id: `${exerciseDef.id}-${Date.now()}`,
                      definitionId: exerciseDef.id,
                      name: exerciseDef.name,
                      category: exerciseDef.category,
                      loggedSets: [],
                      targetSets: 1,
                      targetReps: '1'
                  };

                  return (
                     <WorkoutExerciseCard 
                        key={workoutExercise.id}
                        exercise={workoutExercise}
                        definition={exerciseDef}
                        onLogSet={() => handleLogSet(exerciseDef.id)} 
                        onDeleteSet={handleDeleteSet} 
                        onUpdateSet={() => {}}
                        onRemoveExercise={() => {}}
                        pageType="mind-programming"
                     />
                  )
                })}
              </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 min-h-[300px]">
                  <Brain className="h-12 w-12 mb-4" />
                  <p className="font-semibold">No techniques defined.</p>
                  <p className="text-sm">Go to the Mind Programming page to add techniques.</p>
                </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter className="flex-shrink-0 pt-4">
            <Button onClick={handleCompleteMindset}>
                Mark as Complete & Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
