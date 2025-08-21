
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Utensils, BookCopy } from 'lucide-react';
import type { UserDietPlan, MealItem } from '@/types/workout';
import { format } from 'date-fns';

interface TodaysDietCardProps {
  dietPlan: UserDietPlan;
  onEditClick: () => void;
}

export function TodaysDietCard({ dietPlan, onEditClick }: TodaysDietCardProps) {
  const todaysDiet = useMemo(() => {
    if (!dietPlan || dietPlan.length === 0) return null;
    const dayName = format(new Date(), 'EEEE');
    return dietPlan.find(plan => plan.day === dayName);
  }, [dietPlan]);

  const renderMealItems = (meal: MealItem[] | string | undefined) => {
    if (typeof meal === 'string') {
      return meal; // Handle legacy string data
    }
    if (Array.isArray(meal) && meal.length > 0) {
      return meal.map(item => `${item.quantity} ${item.content}`).join(', ');
    }
    return 'N/A';
  };


  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg text-primary">
            <Utensils /> Today's Diet
          </CardTitle>
          <CardDescription>
            Your planned meals for {format(new Date(), 'EEEE')}.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onEditClick}>
          <BookCopy className="mr-2 h-4 w-4" />
          Edit Plan
        </Button>
      </CardHeader>
      <CardContent>
        {todaysDiet ? (
          <div className="space-y-4">
            <div className="text-sm">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold text-foreground">Meal 1</h4>
                        <p className="text-muted-foreground whitespace-pre-wrap mt-1 text-xs">{renderMealItems(todaysDiet.meal1)}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">Meal 2</h4>
                        <p className="text-muted-foreground whitespace-pre-wrap mt-1 text-xs">{renderMealItems(todaysDiet.meal2)}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">Meal 3</h4>
                        <p className="text-muted-foreground whitespace-pre-wrap mt-1 text-xs">{renderMealItems(todaysDiet.meal3)}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">Supplements</h4>
                        <p className="text-muted-foreground whitespace-pre-wrap mt-1 text-xs">{renderMealItems(todaysDiet.supplements)}</p>
                    </div>
                </div>
            </div>

            {todaysDiet.totalCalories != null && todaysDiet.totalCalories > 0 && (
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Total Intake</span>
                    <span className="font-bold text-lg text-primary">{todaysDiet.totalCalories.toLocaleString()} kcal</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  <div className="flex justify-between"><span>Protein</span> <span className="font-medium text-foreground">{todaysDiet.protein?.toFixed(0) ?? '-'}g</span></div>
                  <div className="flex justify-between"><span>Carbs</span> <span className="font-medium text-foreground">{todaysDiet.carbs?.toFixed(0) ?? '-'}g</span></div>
                  <div className="flex justify-between"><span>Fat</span> <span className="font-medium text-foreground">{todaysDiet.fat?.toFixed(0) ?? '-'}g</span></div>
                  <div className="flex justify-between"><span>Fiber</span> <span className="font-medium text-foreground">{todaysDiet.fiber?.toFixed(0) ?? '-'}g</span></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">No diet plan set up for today.</p>
        )}
      </CardContent>
    </Card>
  );
}
