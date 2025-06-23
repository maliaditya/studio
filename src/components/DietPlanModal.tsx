
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
  }));
};

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


  const handlePlanChange = (day: string, field: keyof Omit<EditableMealPlan, 'day'>, value: string) => {
    setPlan(currentPlan => 
      currentPlan.map(dayPlan => 
        dayPlan.day === day ? { ...dayPlan, [field]: value } : dayPlan
      )
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>My Diet Plan</DialogTitle>
          <DialogDescription>
            Create and edit your weekly diet plan. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow border rounded-lg">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[120px]">Day</TableHead>
                    <TableHead>Meal 1</TableHead>
                    <TableHead>Meal 2</TableHead>
                    <TableHead>Meal 3</TableHead>
                    <TableHead>Supplements</TableHead>
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
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
