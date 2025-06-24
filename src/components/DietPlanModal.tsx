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
import { Input } from './ui/input';
import { Label } from './ui/label';

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
                        onChange={(e) => handleTextChange(dayPlan.day, 'meal1', e.target.value)}
                        placeholder="Breakfast, first meal..."
                        className="min-h-[100px]"
                        />
                    </TableCell>
                    <TableCell>
                        <Textarea
                        value={dayPlan.meal2}
                        onChange={(e) => handleTextChange(dayPlan.day, 'meal2', e.target.value)}
                        placeholder="Lunch, second meal..."
                        className="min-h-[100px]"
                        />
                    </TableCell>
                    <TableCell>
                        <Textarea
                        value={dayPlan.meal3}
                        onChange={(e) => handleTextChange(dayPlan.day, 'meal3', e.target.value)}
                        placeholder="Dinner, third meal..."
                        className="min-h-[100px]"
                        />
                    </TableCell>
                    <TableCell>
                        <Textarea
                        value={dayPlan.supplements}
                        onChange={(e) => handleTextChange(dayPlan.day, 'supplements', e.target.value)}
                        placeholder="e.g., Creatine, Whey Protein..."
                        className="min-h-[100px]"
                        />
                    </TableCell>
                    <TableCell className="align-top pt-3">
                      <div className="space-y-1">
                        <div>
                          <Label htmlFor={`${dayPlan.day}-calories`} className="text-xs text-muted-foreground">Calories</Label>
                          <Input id={`${dayPlan.day}-calories`} type="number" value={dayPlan.totalCalories ?? ''} onChange={(e) => handleTotalsChange(dayPlan.day, 'totalCalories', e.target.value)} className="h-8" placeholder="kcal" />
                        </div>
                        <div>
                          <Label htmlFor={`${dayPlan.day}-protein`} className="text-xs text-muted-foreground">Protein</Label>
                          <Input id={`${dayPlan.day}-protein`} type="number" value={dayPlan.protein ?? ''} onChange={(e) => handleTotalsChange(dayPlan.day, 'protein', e.target.value)} className="h-8" placeholder="grams"/>
                        </div>
                        <div>
                          <Label htmlFor={`${dayPlan.day}-carbs`} className="text-xs text-muted-foreground">Carbs</Label>
                          <Input id={`${dayPlan.day}-carbs`} type="number" value={dayPlan.carbs ?? ''} onChange={(e) => handleTotalsChange(dayPlan.day, 'carbs', e.target.value)} className="h-8" placeholder="grams"/>
                        </div>
                        <div>
                          <Label htmlFor={`${dayPlan.day}-fat`} className="text-xs text-muted-foreground">Fat</Label>
                          <Input id={`${dayPlan.day}-fat`} type="number" value={dayPlan.fat ?? ''} onChange={(e) => handleTotalsChange(dayPlan.day, 'fat', e.target.value)} className="h-8" placeholder="grams"/>
                        </div>
                        <div>
                          <Label htmlFor={`${dayPlan.day}-fiber`} className="text-xs text-muted-foreground">Fiber</Label>
                          <Input id={`${dayPlan.day}-fiber`} type="number" value={dayPlan.fiber ?? ''} onChange={(e) => handleTotalsChange(dayPlan.day, 'fiber', e.target.value)} className="h-8" placeholder="grams"/>
                        </div>
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
