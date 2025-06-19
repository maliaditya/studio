
"use client";

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { ExerciseDefinition, DatedWorkout, LoggedSet } from '@/types/workout';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExerciseProgressModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  exercise: ExerciseDefinition | null;
  allWorkoutLogs: DatedWorkout[];
}

interface ProgressSetData {
  date: string;
  originalDate: Date;
  setNumber: number;
  reps: number;
  weight: number;
  timestamp: number;
}

export function ExerciseProgressModal({
  isOpen,
  onOpenChange,
  exercise,
  allWorkoutLogs,
}: ExerciseProgressModalProps) {
  const progressData = useMemo(() => {
    if (!exercise) return [];

    const entries: ProgressSetData[] = [];
    allWorkoutLogs.forEach(datedLog => {
      datedLog.exercises.forEach(ex => {
        if (ex.definitionId === exercise.id) {
          // Sort sets by timestamp ascending to ensure correct set numbering
          const sortedSets = [...ex.loggedSets].sort((a, b) => a.timestamp - b.timestamp);
          sortedSets.forEach((set, index) => {
            entries.push({
              date: format(parseISO(datedLog.date), 'PPP'),
              originalDate: parseISO(datedLog.date),
              setNumber: index + 1,
              reps: set.reps,
              weight: set.weight,
              timestamp: set.timestamp,
            });
          });
        }
      });
    });

    // Sort by date descending (most recent first), then by set timestamp ascending (set order)
    return entries.sort((a, b) => {
      const dateComparison = b.originalDate.getTime() - a.originalDate.getTime();
      if (dateComparison !== 0) return dateComparison;
      return a.timestamp - b.timestamp;
    });
  }, [exercise, allWorkoutLogs]);

  if (!exercise) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Progress for: {exercise.name}</DialogTitle>
          <DialogDescription>
            Showing all logged sets for this exercise, sorted by date.
          </DialogDescription>
        </DialogHeader>
        {progressData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No sets logged for this exercise yet.
          </p>
        ) : (
          <ScrollArea className="flex-grow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Date</TableHead>
                  <TableHead className="w-[80px]">Set</TableHead>
                  <TableHead className="w-[80px]">Reps</TableHead>
                  <TableHead className="w-[100px]">Weight (kg/lb)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {progressData.map((set, index) => (
                  <TableRow key={`${set.date}-${set.setNumber}-${set.timestamp}-${index}`}>
                    <TableCell>{set.date}</TableCell>
                    <TableCell>{set.setNumber}</TableCell>
                    <TableCell>{set.reps}</TableCell>
                    <TableCell>{set.weight}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
