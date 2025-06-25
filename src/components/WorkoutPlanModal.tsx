
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
import { Trash2, PlusCircle, RotateCcw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ExerciseDefinition, ExerciseCategory, WorkoutMode, AllWorkoutPlans } from '@/types/workout';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

interface WorkoutPlanModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  workoutPlans: AllWorkoutPlans;
  setWorkoutPlans: (plans: AllWorkoutPlans) => void;
  definitions: ExerciseDefinition[];
  workoutMode: WorkoutMode;
  initialPlans: AllWorkoutPlans;
  pageType: 'workout' | 'upskill';
  categories: ExerciseCategory[];
}

export function WorkoutPlanModal({
  isOpen,
  onOpenChange,
  workoutPlans,
  setWorkoutPlans,
  definitions,
  workoutMode,
  initialPlans,
  pageType,
  categories,
}: WorkoutPlanModalProps) {
    const { toast } = useToast();
    const [addSelection, setAddSelection] = useState<Record<string, string>>({});

    const handleRemoveExercise = (planKey: string, category: ExerciseCategory, exerciseName: string) => {
        const currentExercises = workoutPlans[planKey]?.[category];
        if (!Array.isArray(currentExercises)) {
            toast({ title: "Error", description: "Could not remove from an invalid plan.", variant: "destructive" });
            return;
        }

        setWorkoutPlans({
            ...workoutPlans,
            [planKey]: {
                ...workoutPlans[planKey],
                [category]: currentExercises.filter(name => name !== exerciseName)
            }
        });
        toast({ title: "Item Removed", description: `"${exerciseName}" removed from ${planKey}.` });
    };
    
    const handleAddExercise = (planKey: string, category: ExerciseCategory) => {
        const exerciseName = addSelection[`${planKey}-${category}`];
        if (!exerciseName) {
            toast({ title: "Error", description: "Please select an item to add.", variant: "destructive" });
            return;
        }

        const currentExercises = workoutPlans[planKey]?.[category] || [];
        if (Array.isArray(currentExercises) && currentExercises.includes(exerciseName)) {
            toast({ title: "Already Exists", description: `"${exerciseName}" is already in this plan.` });
            return;
        }

        setWorkoutPlans({
            ...workoutPlans,
            [planKey]: {
                ...workoutPlans[planKey],
                [category]: [...(Array.isArray(currentExercises) ? currentExercises : []), exerciseName]
            }
        });

        setAddSelection(prev => ({ ...prev, [`${planKey}-${category}`]: '' }));
        toast({ title: "Item Added", description: `"${exerciseName}" added to ${category} in ${planKey}.` });
    };

    const handleResetPlan = (planKeyToReset: string) => {
        const defaultPlan = initialPlans[planKeyToReset];
        if (!defaultPlan) {
            toast({ title: "Error", description: `Default plan for ${planKeyToReset} not found.`, variant: "destructive" });
            return;
        }
    
        setWorkoutPlans(prevPlans => ({
            ...prevPlans,
            [planKeyToReset]: defaultPlan
        }));
    
        toast({ title: "Plan Reset", description: `Plan ${planKeyToReset} has been restored to its default state.` });
    };

    const renderPlanContent = (planKey: string) => (
      <TabsContent key={planKey} value={planKey} className="m-0 mt-4 flex-grow flex flex-col min-h-0">
        <div className="flex justify-end mb-4 pr-4 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => handleResetPlan(planKey)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Plan to Default
            </Button>
        </div>
        <ScrollArea className="flex-grow pr-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(Object.keys(workoutPlans[planKey] || {}) as ExerciseCategory[]).map(category => {
                    const exercisesForCategory = workoutPlans[planKey]?.[category];
                    const addEntityPlaceholder = pageType === 'upskill' ? 'Add a task...' : 'Add an exercise...';
                    return (
                    <Card key={category} className="overflow-hidden">
                        <CardHeader className="p-3"><CardTitle className="text-lg">{category}</CardTitle></CardHeader>
                        <CardContent className="p-3">
                            <Table>
                                <TableHeader>
                                    <TableRow><TableHead>Exercise</TableHead><TableHead className="w-[50px] text-right"></TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                {Array.isArray(exercisesForCategory) && exercisesForCategory.map((exName: string) => (
                                    <TableRow key={exName}>
                                        <TableCell className="font-medium truncate" title={exName}>{exName}</TableCell>
                                        <TableCell className="text-right p-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveExercise(planKey, category, exName)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                                <Select value={addSelection[`${planKey}-${category}`] || ''} onValueChange={(value) => setAddSelection(prev => ({ ...prev, [`${planKey}-${category}`]: value }))}>
                                    <SelectTrigger><SelectValue placeholder={addEntityPlaceholder} /></SelectTrigger>
                                    <SelectContent>
                                        {definitions.filter(def => def.category === category).filter(def => !(Array.isArray(exercisesForCategory) && exercisesForCategory.includes(def.name))).sort((a,b) => a.name.localeCompare(b.name)).map(def => (<SelectItem key={def.id} value={def.name}>{def.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                                <Button size="icon" className="h-10 w-10 shrink-0" onClick={() => handleAddExercise(planKey, category)} disabled={!addSelection[`${planKey}-${category}`]}>
                                    <PlusCircle className="h-5 w-5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )})}
            </div>
        </ScrollArea>
      </TabsContent>
    );

    const renderWorkoutContent = () => {
      const planKeysToShow = workoutMode === 'one-muscle' 
          ? Object.keys(workoutPlans).filter(k => k === 'W5' || k === 'W6')
          : Object.keys(workoutPlans).filter(k => k !== 'W5' && k !== 'W6');
      
      return (
        <Tabs defaultValue={planKeysToShow[0]} className="w-full flex-grow flex flex-col min-h-0">
          <TabsList className="shrink-0">
            {planKeysToShow.map(planKey => (
              <TabsTrigger key={planKey} value={planKey}>{planKey}</TabsTrigger>
            ))}
          </TabsList>
          {planKeysToShow.map(planKey => renderPlanContent(planKey))}
        </Tabs>
      );
    };

    const renderUpskillContent = () => {
      const planKeys = workoutMode === 'one-muscle' ? ['W5'] : ['W1', 'W2'];
      const planLabels = workoutMode === 'one-muscle' 
          ? { 'W5': 'Single Skill Plan' }
          : { 'W1': 'Skill Plan A', 'W2': 'Skill Plan B' };

      return (
        <Tabs defaultValue={planKeys[0]} className="w-full flex-grow flex flex-col min-h-0">
          <TabsList className="shrink-0">
            {planKeys.map(planKey => (
              <TabsTrigger key={planKey} value={planKey}>
                {planLabels[planKey as keyof typeof planLabels]}
              </TabsTrigger>
            ))}
          </TabsList>
          {planKeys.map(planKey => renderPlanContent(planKey))}
        </Tabs>
      );
    };

    const dialogTitle = pageType === 'upskill' ? 'Edit Auto-Populated Learning Plans' : 'Edit Auto-Populated Workout Plans';
    const dialogDescription = pageType === 'upskill' ? 'Customize the tasks for each weekly learning plan. Changes are saved automatically.' : 'Customize the exercises for each weekly plan. Changes are saved automatically.';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90dvb] flex flex-col">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {pageType === 'workout' ? renderWorkoutContent() : renderUpskillContent()}

      </DialogContent>
    </Dialog>
  );
}
