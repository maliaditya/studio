
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
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';

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
      <DialogContent className="sm:max-w-4xl max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>My Weekly Diet Plan</DialogTitle>
          <DialogDescription>
            Plan your meals and track your nutritional totals for each day. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="Monday" className="w-full flex-grow min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-7">
                {WEEK_DAYS.map(day => (
                    <TabsTrigger key={day} value={day}>{day.substring(0,3)}</TabsTrigger>
                ))}
            </TabsList>
            {plan.map((dayPlan) => (
                <TabsContent key={dayPlan.day} value={dayPlan.day} className="flex-grow min-h-0 mt-4">
                  <ScrollArea className="h-full pr-6">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Meal Descriptions</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <Label htmlFor={`${dayPlan.day}-meal1`} className="mb-2 block">Meal 1</Label>
                                    <Textarea
                                    id={`${dayPlan.day}-meal1`}
                                    value={dayPlan.meal1}
                                    onChange={(e) => handleTextChange(dayPlan.day, 'meal1', e.target.value)}
                                    placeholder="e.g., Oatmeal with berries and nuts"
                                    className="min-h-[100px]"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`${dayPlan.day}-meal2`} className="mb-2 block">Meal 2</Label>
                                    <Textarea
                                    id={`${dayPlan.day}-meal2`}
                                    value={dayPlan.meal2}
                                    onChange={(e) => handleTextChange(dayPlan.day, 'meal2', e.target.value)}
                                    placeholder="e.g., Grilled chicken salad"
                                    className="min-h-[100px]"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`${dayPlan.day}-meal3`} className="mb-2 block">Meal 3</Label>
                                    <Textarea
                                    id={`${dayPlan.day}-meal3`}
                                    value={dayPlan.meal3}
                                    onChange={(e) => handleTextChange(dayPlan.day, 'meal3', e.target.value)}
                                    placeholder="e.g., Salmon with quinoa and broccoli"
                                    className="min-h-[100px]"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`${dayPlan.day}-supplements`} className="mb-2 block">Snacks & Supplements</Label>
                                    <Textarea
                                    id={`${dayPlan.day}-supplements`}
                                    value={dayPlan.supplements}
                                    onChange={(e) => handleTextChange(dayPlan.day, 'supplements', e.target.value)}
                                    placeholder="e.g., Protein shake, creatine"
                                    className="min-h-[100px]"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Daily Totals</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-4">
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
                            </CardContent>
                        </Card>
                    </div>
                  </ScrollArea>
                </TabsContent>
            ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
