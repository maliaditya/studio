
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
import { Magnet, PlusCircle } from 'lucide-react';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

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
    
  const exercisesForToday = useMemo(() => {
      const log = allLeadGenLogs.find(l => l.date === dateKey);
      return log ? log.exercises : [];
  }, [allLeadGenLogs, dateKey]);

  const availableDefinitions = useMemo(() => {
    const todaysDefinitionIds = new Set(exercisesForToday.map(ex => ex.definitionId));
    return leadGenDefinitions.filter(def => !todaysDefinitionIds.has(def.id));
  }, [leadGenDefinitions, exercisesForToday]);

  const handleAddTask = (definition: ExerciseDefinition) => {
    const match = definition.name.match(/(\d+)/);
    const targetSets = match ? parseInt(match[0], 10) : 1;

    const newExercise: WorkoutExercise = {
      id: `${definition.id}-${Date.now()}`,
      definitionId: definition.id,
      name: definition.name,
      category: definition.category,
      description: definition.description,
      loggedSets: [],
      targetSets: targetSets,
      targetReps: `${targetSets} actions`,
    };

    setAllLeadGenLogs(prev => {
        const logIndex = prev.findIndex(l => l.date === dateKey);
        if (logIndex > -1) {
            const newLogs = [...prev];
            const updatedExercises = [...newLogs[logIndex].exercises, newExercise];
            newLogs[logIndex] = {...newLogs[logIndex], exercises: updatedExercises};
            return newLogs;
        } else {
            return [...prev, { id: dateKey, date: dateKey, exercises: [newExercise] }];
        }
    });
    toast({ title: "Task Added", description: `"${definition.name}" added to today's session.` });
  };
  
  const handleRemoveTask = (exerciseId: string) => {
    setAllLeadGenLogs(prev => {
      const logIndex = prev.findIndex(l => l.date === dateKey);
      if (logIndex > -1) {
        const newLogs = [...prev];
        const updatedExercises = newLogs[logIndex].exercises.filter(ex => ex.id !== exerciseId);
        newLogs[logIndex] = { ...newLogs[logIndex], exercises: updatedExercises };
        return newLogs;
      }
      return prev;
    });
    toast({ title: "Task Removed", description: "Task removed from today's session." });
  };

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
        description: "You must log all target actions for the selected tasks before marking this as complete.",
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
                const newSet = { id: `${Date.now()}-${Math.random()}`, reps: 1, weight: 1, timestamp: Date.now() };
                newLogs[logIndex].exercises[exerciseIndex].loggedSets.push(newSet);
            }
        }
        return newLogs;
    });
    toast({ title: "Action Logged!" });
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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Log Lead Generation Session</DialogTitle>
          <DialogDescription>
            Add tasks from the library to your session, then log your progress.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-4">
            <div className="grid md:grid-cols-2 gap-6 items-start">
              <Card>
                <CardHeader>
                  <CardTitle>Available Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  {availableDefinitions.length > 0 ? (
                    <ul className="space-y-2">
                      {availableDefinitions.map(def => (
                        <li key={def.id} className="flex items-center justify-between p-2 rounded-md border">
                          <div className='flex-grow'>
                            <p className="font-medium text-sm">{def.name}</p>
                            <p className="text-xs text-muted-foreground">{def.description}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleAddTask(def)}>
                            <PlusCircle className="h-5 w-5 text-green-500"/>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">All tasks are in today's session.</p>
                  )}
                </CardContent>
              </Card>

              <div className='space-y-4'>
                <h3 className="text-lg font-semibold">Today's Session</h3>
                {exercisesForToday.length > 0 ? (
                  <div className="space-y-4">
                    {exercisesForToday.map(exercise => (
                        <WorkoutExerciseCard 
                            key={exercise.id} 
                            exercise={exercise}
                            onLogSet={() => handleLogSet(exercise.id)} 
                            onDeleteSet={handleDeleteSet} 
                            onUpdateSet={() => {}}
                            onRemoveExercise={handleRemoveTask}
                            pageType="lead-generation"
                        />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 min-h-[200px] border-dashed border-2 rounded-md">
                    <Magnet className="h-10 w-10 mb-2" />
                    <p className="font-semibold">No tasks for today.</p>
                    <p className="text-sm">Add tasks from the library to get started.</p>
                  </div>
                )}
              </div>
            </div>
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
