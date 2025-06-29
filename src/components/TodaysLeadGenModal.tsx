
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
import { Magnet, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import { useToast } from '@/hooks/use-toast';

interface TodaysLeadGenModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activityToLog: Activity | null;
  onActivityComplete: (slotName: string, activityId: string) => void;
}

export function TodaysLeadGenModal({
  isOpen,
  onOpenChange,
  activityToLog,
  onActivityComplete,
}: TodaysLeadGenModalProps) {
  const { 
    allLeadGenLogs, 
    setAllLeadGenLogs,
    leadGenDefinitions
  } = useAuth();
  const { toast } = useToast();

  const today = useMemo(() => new Date(), [isOpen]);
  const dateKey = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);

  useEffect(() => {
    if (isOpen && !allLeadGenLogs.some(log => log.date === dateKey)) {
        const exercises: WorkoutExercise[] = leadGenDefinitions.map(def => {
            const match = def.name.match(/(\d+)/);
            const targetSets = match ? parseInt(match[0], 10) : 1;
            return {
                id: `${def.id}-${dateKey}`,
                definitionId: def.id,
                name: def.name,
                category: def.category,
                description: def.description,
                loggedSets: [],
                targetSets: targetSets,
                targetReps: `${targetSets} actions`,
            };
        });
        setAllLeadGenLogs(prev => [...prev, { id: dateKey, date: dateKey, exercises }]);
    }
  }, [isOpen, dateKey, allLeadGenLogs, leadGenDefinitions, setAllLeadGenLogs]);
    
  const exercisesForToday = useMemo(() => {
      const log = allLeadGenLogs.find(l => l.date === dateKey);
      return log ? log.exercises : [];
  }, [allLeadGenLogs, dateKey]);

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
        description: "You must log all target actions before marking this as complete.",
        variant: "destructive"
      });
    }
  };

  const handleLogSet = (exerciseId: string) => {
    setAllLeadGenLogs(prevLogs => {
        const newLogs = [...prevLogs];
        const logIndex = newLogs.findIndex(l => l.date === dateKey);
        if (logIndex > -1) {
            const exerciseIndex = newLogs[logIndex].exercises.findIndex(e => e.id === exerciseId);
            if (exerciseIndex > -1) {
                const newSet = { id: Date.now().toString(), reps: 1, weight: 1, timestamp: Date.now() };
                newLogs[logIndex].exercises[exerciseIndex].loggedSets.push(newSet);
                toast({ title: "Action Logged!" });
            }
        }
        return newLogs;
    });
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    setAllLeadGenLogs(prevLogs => {
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
          <DialogTitle>Log Lead Generation Session</DialogTitle>
          <DialogDescription>
            Log your outreach actions for today. The session can be marked complete once all targets are met.
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
                          pageType="lead-generation"
                      />
                  ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 min-h-[300px]">
                  <Magnet className="h-12 w-12 mb-4" />
                  <p className="font-semibold">No Lead Gen tasks defined.</p>
                  <p className="text-sm">Go to the Lead Generation page to set up your tasks.</p>
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
