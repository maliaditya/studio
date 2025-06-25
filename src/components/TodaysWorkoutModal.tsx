
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WorkoutExercise } from '@/types/workout';
import { Dumbbell, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';

interface TodaysWorkoutModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  todaysExercises: WorkoutExercise[];
  muscleGroupsForDay: string[];
  onViewProgress: (definitionId: string) => void;
}

export function TodaysWorkoutModal({
  isOpen,
  onOpenChange,
  todaysExercises,
  muscleGroupsForDay,
  onViewProgress,
}: TodaysWorkoutModalProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Today's Focus: {muscleGroupsForDay.join(' & ') || 'Rest Day'}
          </DialogTitle>
          <DialogDescription>
            Here are the exercises planned for your workout session today.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-6">
            {todaysExercises.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exercise</TableHead>
                    <TableHead className="text-right">Last Workout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaysExercises.map((exercise) => (
                    <TableRow key={exercise.id}>
                      <TableCell>
                          <p className="font-medium">{exercise.name}</p>
                          <p className="text-xs text-muted-foreground">{exercise.category}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                            {exercise.lastPerformance ? (
                            <div>
                                <p className="font-semibold">{exercise.lastPerformance.weight} kg/lb &times; {exercise.lastPerformance.reps} reps</p>
                                <p className="text-xs text-muted-foreground">Top Set</p>
                            </div>
                            ) : (
                            <p className="text-xs text-muted-foreground">No history</p>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => onViewProgress(exercise.definitionId)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                                <TrendingUp className="h-4 w-4" />
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                <Dumbbell className="h-12 w-12 mb-4" />
                <p className="font-semibold">It's a rest day!</p>
                <p className="text-sm">No workout is scheduled for today.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
