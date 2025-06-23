
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Trash2, PlusCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ExerciseDefinition, ExerciseCategory, WorkoutMode, AllWorkoutPlans } from '@/types/workout';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface WorkoutPlanModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  workoutPlans: AllWorkoutPlans;
  setWorkoutPlans: (plans: AllWorkoutPlans) => void;
  exerciseDefinitions: ExerciseDefinition[];
  workoutMode: WorkoutMode;
}

export function WorkoutPlanModal({
  isOpen,
  onOpenChange,
  workoutPlans,
  setWorkoutPlans,
  exerciseDefinitions,
  workoutMode,
}: WorkoutPlanModalProps) {
    const { toast } = useToast();
    const [addSelection, setAddSelection] = useState<Record<string, string>>({}); // Key: 'W1-Chest', Value: 'Exercise Name'

    const handleRemoveExercise = (planKey: string, category: ExerciseCategory, exerciseName: string) => {
        setWorkoutPlans({
            ...workoutPlans,
            [planKey]: {
                ...workoutPlans[planKey],
                [category]: workoutPlans[planKey][category].filter(name => name !== exerciseName)
            }
        });
        toast({ title: "Exercise Removed", description: `"${exerciseName}" removed from ${planKey}.` });
    };
    
    const handleAddExercise = (planKey: string, category: ExerciseCategory) => {
        const exerciseName = addSelection[`${planKey}-${category}`];
        if (!exerciseName) {
            toast({ title: "Error", description: "Please select an exercise to add.", variant: "destructive" });
            return;
        }

        const currentExercises = workoutPlans[planKey]?.[category] || [];
        if (currentExercises.includes(exerciseName)) {
            toast({ title: "Already Exists", description: `"${exerciseName}" is already in this plan.` });
            return;
        }

        setWorkoutPlans({
            ...workoutPlans,
            [planKey]: {
                ...workoutPlans[planKey],
                [category]: [...currentExercises, exerciseName]
            }
        });

        // Clear selection after adding
        setAddSelection(prev => ({ ...prev, [`${planKey}-${category}`]: '' }));
        toast({ title: "Exercise Added", description: `"${exerciseName}" added to ${category} in ${planKey}.` });
    };

    const planKeysToShow = workoutMode === 'one-muscle' 
        ? Object.keys(workoutPlans).filter(k => k === 'W5' || k === 'W6')
        : Object.keys(workoutPlans).filter(k => k !== 'W5' && k !== 'W6');

    // Get categories relevant to the current mode
    const relevantCategoriesForPlan = (planKey: string): ExerciseCategory[] => {
        return Object.keys(workoutPlans[planKey] || {}) as ExerciseCategory[];
    }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Auto-Populated Workout Plans</DialogTitle>
          <DialogDescription>
            Customize the exercises for each weekly plan. Changes are saved automatically when you close this window.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={planKeysToShow[0]} className="w-full flex-grow flex flex-col min-h-0">
          <TabsList className="shrink-0">
            {planKeysToShow.map(planKey => (
              <TabsTrigger key={planKey} value={planKey}>{planKey}</TabsTrigger>
            ))}
          </TabsList>
          
          {planKeysToShow.map(planKey => (
            <TabsContent key={planKey} value={planKey} className="m-0 mt-4 flex-grow min-h-0">
                <ScrollArea className="h-full pr-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {relevantCategoriesForPlan(planKey).map(category => (
                        <Card key={category} className="overflow-hidden">
                            <CardHeader className="bg-muted/50 p-3">
                                <CardTitle className="text-lg">{category}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Exercise</TableHead>
                                            <TableHead className="w-[50px] text-right"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {workoutPlans[planKey]?.[category]?.map((exName: string) => (
                                        <TableRow key={exName}>
                                            <TableCell className="font-medium truncate" title={exName}>{exName}</TableCell>
                                            <TableCell className="text-right p-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleRemoveExercise(planKey, category as ExerciseCategory, exName)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                                    <Select
                                        value={addSelection[`${planKey}-${category}`] || ''}
                                        onValueChange={(value) => setAddSelection(prev => ({ ...prev, [`${planKey}-${category}`]: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Add an exercise..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {exerciseDefinitions
                                                .filter(def => def.category === category)
                                                .filter(def => !workoutPlans[planKey]?.[category]?.includes(def.name))
                                                .sort((a,b) => a.name.localeCompare(b.name))
                                                .map(def => (
                                                    <SelectItem key={def.id} value={def.name}>
                                                        {def.name}
                                                    </SelectItem>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="icon"
                                        className="h-10 w-10 shrink-0"
                                        onClick={() => handleAddExercise(planKey, category)}
                                        disabled={!addSelection[`${planKey}-${category}`]}
                                    >
                                        <PlusCircle className="h-5 w-5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        ))}
                    </div>
                </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
