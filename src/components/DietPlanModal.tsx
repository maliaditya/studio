
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from '@/contexts/AuthContext';
import type { UserDietPlan, EditableMealPlan } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Calculator, Loader2 } from 'lucide-react';
import { calculateCalories } from '@/ai/flows/calculateCaloriesFlow';
import { useToast } from '@/hooks/use-toast';

interface DietPlanModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const getDefaultPlan = (): UserDietPlan => {
  return WEEK_DAYS.map(day => ({
    day,
    meal1: '',
    meal2: '',
    meal3: '',
    supplements: '',
    totalCalories: null,
    protein: null,
    carbs: null,
    fat: null,
    fiber: null,
  }));
};

export function DietPlanModal({
  isOpen,
  onOpenChange,
}: DietPlanModalProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [plan, setPlan] = useState<UserDietPlan>(getDefaultPlan());
  const [isCalculating, setIsCalculating] = useState<Record<string, boolean>>({});

  const planStorageKey = currentUser ? `dietPlan_${currentUser.username}` : null;

  useEffect(() => {
    if (isOpen && planStorageKey) {
      try {
        const storedPlan = localStorage.getItem(planStorageKey);
        if (storedPlan) {
          const parsedPlan = JSON.parse(storedPlan);
          if (Array.isArray(parsedPlan) && parsedPlan.length === 7 && parsedPlan[0].meal1 !== undefined) {
             setPlan(parsedPlan);
          } else {
             setPlan(getDefaultPlan());
          }
        } else {
          setPlan(getDefaultPlan());
        }
      } catch (error) {
        console.error("Failed to load diet plan from localStorage", error);
        setPlan(getDefaultPlan());
      }
    }
  }, [isOpen, planStorageKey]);

  useEffect(() => {
    // Only save when the modal is open to avoid overwriting on initial load
    if (isOpen && planStorageKey) {
      try {
        localStorage.setItem(planStorageKey, JSON.stringify(plan));
      } catch (error) {
        console.error("Failed to save diet plan to localStorage", error);
      }
    }
  }, [plan, planStorageKey, isOpen]);


  const handlePlanChange = (day: string, field: keyof Pick<EditableMealPlan, 'meal1' | 'meal2' | 'meal3' | 'supplements'>, value: string) => {
    setPlan(currentPlan =>
      currentPlan.map(dayPlan => {
        if (dayPlan.day === day) {
          const updatedPlan = { ...dayPlan, [field]: value };
          // If a meal is changed, reset the calculated values
          if (field.startsWith('meal')) {
            updatedPlan.totalCalories = null;
            updatedPlan.protein = null;
            updatedPlan.carbs = null;
            updatedPlan.fat = null;
            updatedPlan.fiber = null;
          }
          return updatedPlan;
        }
        return dayPlan;
      })
    );
  };
  
  const handleCalculateCalories = async (day: string) => {
    const dayPlan = plan.find(p => p.day === day);
    if (!dayPlan || (!dayPlan.meal1 && !dayPlan.meal2 && !dayPlan.meal3)) {
      toast({
        title: "Cannot Calculate",
        description: "Please enter at least one meal description for the day.",
        variant: "destructive",
      });
      return;
    }
  
    setIsCalculating(prev => ({ ...prev, [day]: true }));
  
    try {
      const result = await calculateCalories({
        meal1: dayPlan.meal1,
        meal2: dayPlan.meal2,
        meal3: dayPlan.meal3,
      });
      
      if (result?.totalCalories !== undefined) {
        setPlan(currentPlan =>
          currentPlan.map(p =>
            p.day === day
              ? {
                  ...p,
                  totalCalories: result.totalCalories,
                  protein: result.protein ?? null,
                  carbs: result.carbs ?? null,
                  fat: result.fat ?? null,
                  fiber: result.fiber ?? null,
                }
              : p
          )
        );
        toast({
          title: "Macros Calculated!",
          description: `Estimated values for ${day} have been calculated.`,
        });
      } else {
        throw new Error("AI did not return a valid response.");
      }
    } catch (error) {
      console.error("Failed to calculate calories:", error);
      toast({
        title: "AI Error",
        description: error instanceof Error ? error.message : "Could not calculate calories. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCalculating(prev => ({ ...prev, [day]: false }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>My Diet Plan</DialogTitle>
          <DialogDescription>
            Create your weekly diet plan. Use the calculator to get an AI-estimated calorie and macro count for each day. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow border rounded-lg">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Day</TableHead>
                    <TableHead>Meal 1</TableHead>
                    <TableHead>Meal 2</TableHead>
                    <TableHead>Meal 3</TableHead>
                    <TableHead>Supplements</TableHead>
                    <TableHead className="w-[180px]">Daily Totals</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {plan.map((dayPlan) => (
                    <TableRow key={dayPlan.day}>
                    <TableCell className="font-medium align-top pt-5">{dayPlan.day}</TableCell>
                    <TableCell>
                        <Textarea
                        value={dayPlan.meal1}
                        onChange={(e) => handlePlanChange(dayPlan.day, 'meal1', e.target.value)}
                        placeholder="Breakfast, first meal..."
                        className="min-h-[100px]"
                        />
                    </TableCell>
                    <TableCell>
                        <Textarea
                        value={dayPlan.meal2}
                        onChange={(e) => handlePlanChange(dayPlan.day, 'meal2', e.target.value)}
                        placeholder="Lunch, second meal..."
                        className="min-h-[100px]"
                        />
                    </TableCell>
                    <TableCell>
                        <Textarea
                        value={dayPlan.meal3}
                        onChange={(e) => handlePlanChange(dayPlan.day, 'meal3', e.target.value)}
                        placeholder="Dinner, third meal..."
                        className="min-h-[100px]"
                        />
                    </TableCell>
                    <TableCell>
                        <Textarea
                        value={dayPlan.supplements}
                        onChange={(e) => handlePlanChange(dayPlan.day, 'supplements', e.target.value)}
                        placeholder="e.g., Creatine, Whey Protein..."
                        className="min-h-[100px]"
                        />
                    </TableCell>
                    <TableCell className="align-top pt-5">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                            <div className="flex-grow">
                                {dayPlan.totalCalories != null ? (
                                <span className="font-bold text-lg">{dayPlan.totalCalories.toLocaleString()} <span className="text-xs text-muted-foreground">kcal</span></span>
                                ) : (
                                <span className="text-muted-foreground text-sm">Not set</span>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => handleCalculateCalories(dayPlan.day)}
                                disabled={isCalculating[dayPlan.day]}
                                aria-label={`Calculate calories for ${dayPlan.day}`}
                                title="Calculate Calories & Macros"
                            >
                                {isCalculating[dayPlan.day] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                <Calculator className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        {dayPlan.totalCalories != null && (
                            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                                <div className="flex justify-between"><span>Protein</span> <span className="font-medium text-foreground">{dayPlan.protein?.toFixed(0) ?? '-'}g</span></div>
                                <div className="flex justify-between"><span>Carbs</span> <span className="font-medium text-foreground">{dayPlan.carbs?.toFixed(0) ?? '-'}g</span></div>
                                <div className="flex justify-between"><span>Fat</span> <span className="font-medium text-foreground">{dayPlan.fat?.toFixed(0) ?? '-'}g</span></div>
                                <div className="flex justify-between"><span>Fiber</span> <span className="font-medium text-foreground">{dayPlan.fiber?.toFixed(0) ?? '-'}g</span></div>
                            </div>
                        )}
                      </div>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
