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
import { Calculator, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { analyzeMeal } from '@/ai/flows/analyzeMealFlow';

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
  const [calculatingDay, setCalculatingDay] = useState<string | null>(null);

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
    setCalculatingDay(day);
    const dayPlan = plan.find(p => p.day === day);
    if (!dayPlan) {
        setCalculatingDay(null);
        return;
    }

    const mealsToAnalyze = [dayPlan.meal1, dayPlan.meal2, dayPlan.meal3].filter(m => m && m.trim() !== '');

    if (mealsToAnalyze.length === 0) {
      toast({
        title: "Cannot Calculate",
        description: "Please enter at least one meal description for the day.",
        variant: "destructive",
      });
      setCalculatingDay(null);
      return;
    }

    try {
        const analysisPromises = mealsToAnalyze.map(meal => analyzeMeal(meal));
        const results = await Promise.all(analysisPromises);

        const totals = results.reduce((acc, current) => {
            acc.totalCalories += current.calories;
            acc.protein += current.protein;
            acc.carbs += current.carbs;
            acc.fat += current.fat;
            acc.fiber += current.fiber;
            return acc;
        }, { totalCalories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

        setPlan(currentPlan =>
            currentPlan.map(p => (p.day === day ? { 
                ...p, 
                totalCalories: Math.round(totals.totalCalories),
                protein: Math.round(totals.protein),
                carbs: Math.round(totals.carbs),
                fat: Math.round(totals.fat),
                fiber: Math.round(totals.fiber),
            } : p))
        );

        toast({
            title: "Macros Calculated!",
            description: `AI-estimated values for ${day} have been calculated.`,
        });
    } catch (error) {
        console.error("AI calculation failed:", error);
        toast({
            title: "Calculation Failed",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
            variant: "destructive",
        });
    } finally {
        setCalculatingDay(null);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>My Diet Plan</DialogTitle>
          <DialogDescription>
            Create your weekly diet plan. Use the AI calculator to get an estimated calorie and macro count for each day. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>

        <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>AI-Powered Calculator</AlertTitle>
            <AlertDescription>
                Nutritional values are estimated by an AI model based on your descriptions. This is for informational purposes only and may not be 100% accurate. Consult a qualified professional for precise dietary guidance.
            </AlertDescription>
        </Alert>
        
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
                                disabled={calculatingDay === dayPlan.day}
                                aria-label={`Calculate calories for ${dayPlan.day}`}
                                title="Calculate Calories & Macros"
                            >
                                {calculatingDay === dayPlan.day ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Calculator className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        {dayPlan.totalCalories != null && dayPlan.totalCalories > 0 && (
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
