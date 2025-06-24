
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
import { useAuth } from '@/contexts/AuthContext';
import type { UserDietPlan, EditableMealPlan } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

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

// Defines the fields that can be manually edited as numbers.
type ManualTotals = Omit<EditableMealPlan, 'day' | 'meal1' | 'meal2' | 'meal3' | 'supplements'>;

export function DietPlanModal({
  isOpen,
  onOpenChange,
}: DietPlanModalProps) {
  const { currentUser } = useAuth();
  const [plan, setPlan] = useState<UserDietPlan>(getDefaultPlan());

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


  const handleTextChange = (day: string, field: keyof Pick<EditableMealPlan, 'meal1' | 'meal2' | 'meal3' | 'supplements'>, value: string) => {
    setPlan(currentPlan =>
      currentPlan.map(dayPlan => {
        if (dayPlan.day === day) {
          return { ...dayPlan, [field]: value };
        }
        return dayPlan;
      })
    );
  };
  
  const handleTotalsChange = (day: string, field: keyof ManualTotals, value: string) => {
    setPlan(currentPlan =>
      currentPlan.map(dayPlan => {
        if (dayPlan.day === day) {
          const numericValue = value === '' ? null : parseFloat(value);
          return { ...dayPlan, [field]: isNaN(numericValue!) ? null : numericValue };
        }
        return dayPlan;
      })
    );
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>My Diet Plan</DialogTitle>
          <DialogDescription>
            Create your weekly diet plan. Manually enter your daily totals. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow min-h-0 border rounded-lg p-4 lg:p-6">
          <div className="space-y-6">
            {plan.map((dayPlan) => (
              <Card key={dayPlan.day}>
                <CardHeader>
                  <CardTitle>{dayPlan.day}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Meals</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor={`${dayPlan.day}-meal1`} className="mb-2 block">Meal 1</Label>
                        <Textarea
                          id={`${dayPlan.day}-meal1`}
                          value={dayPlan.meal1}
                          onChange={(e) => handleTextChange(dayPlan.day, 'meal1', e.target.value)}
                          placeholder="Breakfast, first meal..."
                          className="min-h-[120px]"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${dayPlan.day}-meal2`} className="mb-2 block">Meal 2</Label>
                        <Textarea
                          id={`${dayPlan.day}-meal2`}
                          value={dayPlan.meal2}
                          onChange={(e) => handleTextChange(dayPlan.day, 'meal2', e.target.value)}
                          placeholder="Lunch, second meal..."
                          className="min-h-[120px]"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${dayPlan.day}-meal3`} className="mb-2 block">Meal 3</Label>
                        <Textarea
                          id={`${dayPlan.day}-meal3`}
                          value={dayPlan.meal3}
                          onChange={(e) => handleTextChange(dayPlan.day, 'meal3', e.target.value)}
                          placeholder="Dinner, third meal..."
                          className="min-h-[120px]"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`${dayPlan.day}-supplements`} className="mb-2 block">Supplements</Label>
                        <Textarea
                          id={`${dayPlan.day}-supplements`}
                          value={dayPlan.supplements}
                          onChange={(e) => handleTextChange(dayPlan.day, 'supplements', e.target.value)}
                          placeholder="e.g., Creatine, Whey Protein..."
                          className="min-h-[120px]"
                        />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-medium mb-4">Daily Totals</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                      <div>
                        <Label htmlFor={`${dayPlan.day}-calories`}>Calories (kcal)</Label>
                        <Input id={`${dayPlan.day}-calories`} type="number" value={dayPlan.totalCalories ?? ''} onChange={(e) => handleTotalsChange(dayPlan.day, 'totalCalories', e.target.value)} className="mt-1" placeholder="e.g., 2500" />
                      </div>
                      <div>
                        <Label htmlFor={`${dayPlan.day}-protein`}>Protein (g)</Label>
                        <Input id={`${dayPlan.day}-protein`} type="number" value={dayPlan.protein ?? ''} onChange={(e) => handleTotalsChange(dayPlan.day, 'protein', e.target.value)} className="mt-1" placeholder="e.g., 180"/>
                      </div>
                      <div>
                        <Label htmlFor={`${dayPlan.day}-carbs`}>Carbs (g)</Label>
                        <Input id={`${dayPlan.day}-carbs`} type="number" value={dayPlan.carbs ?? ''} onChange={(e) => handleTotalsChange(dayPlan.day, 'carbs', e.target.value)} className="mt-1" placeholder="e.g., 300"/>
                      </div>
                      <div>
                        <Label htmlFor={`${dayPlan.day}-fat`}>Fat (g)</Label>
                        <Input id={`${dayPlan.day}-fat`} type="number" value={dayPlan.fat ?? ''} onChange={(e) => handleTotalsChange(dayPlan.day, 'fat', e.target.value)} className="mt-1" placeholder="e.g., 70"/>
                      </div>
                      <div>
                        <Label htmlFor={`${dayPlan.day}-fiber`}>Fiber (g)</Label>
                        <Input id={`${dayPlan.day}-fiber`} type="number" value={dayPlan.fiber ?? ''} onChange={(e) => handleTotalsChange(dayPlan.day, 'fiber', e.target.value)} className="mt-1" placeholder="e.g., 30"/>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
