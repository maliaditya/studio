
"use client";

import React, { useMemo, useEffect } from 'react';
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
import { Package, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import { useToast } from '@/hooks/use-toast';

interface TodaysOfferSystemModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activityToLog: Activity | null;
  onActivityComplete: (slotName: string, activityId: string) => void;
}

export function TodaysOfferSystemModal({
  isOpen,
  onOpenChange,
  activityToLog,
  onActivityComplete,
}: TodaysOfferSystemModalProps) {
  const { 
    allOfferSystemLogs, 
    setAllOfferSystemLogs,
    offerSystemDefinitions
  } = useAuth();
  const { toast } = useToast();

  const today = useMemo(() => new Date(), [isOpen]);
  const dateKey = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);

  useEffect(() => {
    if (isOpen && !allOfferSystemLogs.some(log => log.date === dateKey)) {
        const exercises: WorkoutExercise[] = offerSystemDefinitions.map(def => {
            return {
                id: `${def.id}-${dateKey}`,
                definitionId: def.id,
                name: def.name,
                category: def.category,
                description: def.description,
                loggedSets: [],
                targetSets: 1,
                targetReps: `1 action`,
            };
        });
        setAllOfferSystemLogs(prev => [...prev, { id: dateKey, date: dateKey, exercises }]);
    }
  }, [isOpen, dateKey, allOfferSystemLogs, offerSystemDefinitions, setAllOfferSystemLogs]);
    
  const exercisesForToday = useMemo(() => {
      const log = allOfferSystemLogs.find(l => l.date === dateKey);
      return log ? log.exercises : [];
  }, [allOfferSystemLogs, dateKey]);

  const isComplete = useMemo(() => {
    if (exercisesForToday.length === 0) return false;
    return exercisesForToday.every(ex => ex.loggedSets.length >= ex.targetSets);
  }, [exercisesForToday]);

  const handleComplete = () => {
    if (!activityToLog) return;
    if (isComplete) {
      onActivityComplete(activityToLog.slot, activityToLog.id);
      onOpenChange(false);
    } else {
      toast({
        title: "Actions Incomplete",
        description: "You must log all target tasks before marking this as complete.",
        variant: "destructive"
      });
    }
  };

  const handleLogSet = (exerciseId: string) => {
    setAllOfferSystemLogs(prevLogs => {
        const newLogs = [...prevLogs];
        const logIndex = newLogs.findIndex(l => l.date === dateKey);
        if (logIndex > -1) {
            const exerciseIndex = newLogs[logIndex].exercises.findIndex(e => e.id === exerciseId);
            if (exerciseIndex > -1) {
                const newSet = { id: `${Date.now()}-${Math.random()}`, reps: 1, weight: 1, timestamp: Date.now() };
                newLogs[logIndex].exercises[exerciseIndex].loggedSets.push(newSet);
            }
        }
        return newLogs;
    });
    toast({ title: "Action Logged!" });
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    setAllOfferSystemLogs(prevLogs => {
        const newLogs = [...prevLogs];
        const logIndex = newLogs.findIndex(l => l.date === dateKey);
        if (logIndex > -1) {
            const exerciseIndex = newLogs[logIndex].exercises.findIndex(e => e.id === exerciseId);
            if (exerciseIndex > -1) {
                newLogs[logIndex].exercises[exerciseIndex].loggedSets = newLogs[logIndex].exercises[exerciseIndex].loggedSets.filter(s => s.id !== setId);
            }
        }
        return newLogs;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Log Offer System Session</DialogTitle>
          <DialogDescription>
            Log your progress on defining your offers. The session can be marked complete once all tasks are logged.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-4">
            {exercisesForToday.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {exercisesForToday.map(exercise => (
                      <WorkoutExerciseCard 
                          key={exercise.id} 
                          exercise={exercise}
                          onLogSet={(exerciseId) => handleLogSet(exerciseId, 1, 1)} 
                          onDeleteSet={handleDeleteSet} 
                          onUpdateSet={() => {}} // Not needed
                          onRemoveExercise={() => {}} // Not needed
                          pageType="offer-system"
                      />
                  ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 min-h-[300px]">
                  <Package className="h-12 w-12 mb-4" />
                  <p className="font-semibold">No Offer System tasks defined.</p>
                  <p className="text-sm">Go to the Offer System page to set up your tasks.</p>
                </div>
            )}
          </ScrollArea>
        </div>
        <DialogFooter className="flex-shrink-0 pt-4">
            <Button onClick={handleComplete}>
                Mark as Complete & Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
