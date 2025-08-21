
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import type { UserDietPlan, EditableMealPlan, MealItem } from '@/types/workout';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { PlusCircle, Trash2, BrainCircuit, Loader2 } from 'lucide-react';
import { estimateCalories, NutritionOutput } from '@/services/nutritionService';

interface DietPlanModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const getDefaultPlan = (): UserDietPlan => {
  return WEEK_DAYS.map(day => ({
    day,
    meal1: [], meal2: [], meal3: [], supplements: [],
    totalCalories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
  }));
};

const MEAL_KEYS: (keyof EditableMealPlan)[] = ['meal1', 'meal2', 'meal3', 'supplements'];
type MealKey = 'meal1' | 'meal2' | 'meal3' | 'supplements';
const MEAL_NAMES: Record<MealKey, string> = {
  meal1: "Meal 1",
  meal2: "Meal 2",
  meal3: "Meal 3",
  supplements: "Snacks & Supplements",
}

const NUTRITION_FIELDS: (keyof MealItem)[] = ['protein', 'carbs', 'fat', 'fiber', 'calories'];

const MealEditor = ({ mealKey, day, plan, onUpdate }: { 
  mealKey: MealKey, 
  day: string,
  plan: EditableMealPlan,
  onUpdate: (day: string, field: MealKey, items: MealItem[]) => void
}) => {
  const items = Array.isArray(plan[mealKey]) ? (plan[mealKey] as MealItem[]) : [];

  const handleItemChange = (itemId: string, field: keyof MealItem, value: string) => {
    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const numericFields = ['protein', 'carbs', 'fat', 'fiber', 'calories'];
        if (numericFields.includes(field)) {
            const numValue = value === '' ? null : parseFloat(value);
            return { ...item, [field]: isNaN(numValue!) ? null : numValue };
        }
        return { ...item, [field]: value };
      }
      return item;
    });
    onUpdate(day, mealKey, updatedItems);
  };

  const handleAddItem = () => {
    const newItem: MealItem = {
      id: `item_${Date.now()}`,
      quantity: '', content: '', protein: null, carbs: null, fat: null, fiber: null, calories: null,
    };
    onUpdate(day, mealKey, [...items, newItem]);
  };

  const handleDeleteItem = (itemId: string) => {
    onUpdate(day, mealKey, items.filter(item => item.id !== itemId));
  };
  
  const mealTotals = useMemo(() => {
    return items.reduce((totals, item) => {
      totals.protein += item.protein || 0;
      totals.carbs += item.carbs || 0;
      totals.fat += item.fat || 0;
      totals.fiber += item.fiber || 0;
      totals.calories += item.calories || 0;
      return totals;
    }, { protein: 0, carbs: 0, fat: 0, fiber: 0, calories: 0 });
  }, [items]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{MEAL_NAMES[mealKey]}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Qty</TableHead>
                <TableHead>Content</TableHead>
                <TableHead className="w-[70px]">Protein</TableHead>
                <TableHead className="w-[70px]">Carbs</TableHead>
                <TableHead className="w-[70px]">Fat</TableHead>
                <TableHead className="w-[70px]">Fiber</TableHead>
                <TableHead className="w-[70px]">Calories</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell><Input value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} className="h-8" /></TableCell>
                  <TableCell><Input value={item.content} onChange={(e) => handleItemChange(item.id, 'content', e.target.value)} className="h-8" /></TableCell>
                  {NUTRITION_FIELDS.map(field => (
                     <TableCell key={field}>
                        <Input 
                            type="number" 
                            value={item[field] === null ? '' : item[field]} 
                            onChange={(e) => handleItemChange(item.id, field, e.target.value)} 
                            className="h-8" 
                        />
                     </TableCell>
                  ))}
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button variant="outline" size="sm" onClick={handleAddItem} className="mt-2">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Item
        </Button>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs mt-4 pt-2 border-t text-center">
            <div><div className="font-bold">{mealTotals.calories.toFixed(0)}</div><div className="text-muted-foreground">Calories</div></div>
            <div><div className="font-bold">{mealTotals.protein.toFixed(0)}g</div><div className="text-muted-foreground">Protein</div></div>
            <div><div className="font-bold">{mealTotals.carbs.toFixed(0)}g</div><div className="text-muted-foreground">Carbs</div></div>
            <div><div className="font-bold">{mealTotals.fat.toFixed(0)}g</div><div className="text-muted-foreground">Fat</div></div>
            <div><div className="font-bold">{mealTotals.fiber.toFixed(0)}g</div><div className="text-muted-foreground">Fiber</div></div>
        </div>
      </CardContent>
    </Card>
  )
};

export function DietPlanModal({
  isOpen,
  onOpenChange,
}: DietPlanModalProps) {
  const { dietPlan, setDietPlan } = useAuth();
  const [smartEstimateText, setSmartEstimateText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Monday");
  
  const plan = Array.isArray(dietPlan) && dietPlan.length === 7 ? dietPlan : getDefaultPlan();

  useEffect(() => {
    const updatedPlan = plan.map(dayPlan => {
      let dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      
      MEAL_KEYS.forEach(mealKey => {
        const mealItems = dayPlan[mealKey];
        if (Array.isArray(mealItems)) {
            (mealItems as MealItem[]).forEach(item => {
                dailyTotals.calories += item.calories || 0;
                dailyTotals.protein += item.protein || 0;
                dailyTotals.carbs += item.carbs || 0;
                dailyTotals.fat += item.fat || 0;
                dailyTotals.fiber += item.fiber || 0;
            });
        }
      });
      
      return {
        ...dayPlan,
        totalCalories: dailyTotals.calories,
        protein: dailyTotals.protein,
        carbs: dailyTotals.carbs,
        fat: dailyTotals.fat,
        fiber: dailyTotals.fiber,
      };
    });

    // Deep comparison to prevent infinite loops
    if (JSON.stringify(updatedPlan) !== JSON.stringify(plan)) {
      setDietPlan(updatedPlan);
    }
  }, [plan, setDietPlan]);

  const handleUpdateDayPlan = (day: string, field: MealKey, items: MealItem[]) => {
    setDietPlan(currentPlan =>
      currentPlan.map(dayPlan =>
        dayPlan.day === day ? { ...dayPlan, [field]: items } : dayPlan
      )
    );
  };

  const handleSmartEstimate = async () => {
    if (!smartEstimateText.trim()) return;
    setIsLoading(true);
    try {
      const result = estimateCalories({ meal1: smartEstimateText, meal2: '', meal3: '' });

      const newItems: MealItem[] = Object.entries(result).map(([key, value]) => {
          if (key === 'totalCalories' || key === 'day') return null; // These are not food items
          
          if (value > 0) {
              const baseItem = {
                  id: `smart_${key}_${Date.now()}`,
                  quantity: 'Est.',
                  content: `${value}g ${key.charAt(0).toUpperCase() + key.slice(1)}`, // e.g., 150g Protein
                  calories: key === 'protein' ? value * 4 : key === 'carbs' ? value * 4 : value * 9,
                  protein: key === 'protein' ? value : 0,
                  carbs: key === 'carbs' ? value : 0,
                  fat: key === 'fat' ? value : 0,
                  fiber: key === 'fiber' ? value : 0,
              };
              return baseItem;
          }
          return null;
      }).filter((item): item is MealItem => item !== null);
      
      const newItemsWithCorrectCalories = newItems.map(item => {
          let calories = 0;
          if (item.protein) calories += item.protein * 4;
          if (item.carbs) calories += item.carbs * 4;
          if (item.fat) calories += item.fat * 9;
          return { ...item, calories };
      });
      
      setDietPlan(currentPlan =>
        currentPlan.map(dayPlan => {
            if (dayPlan.day === activeTab) {
                return { ...dayPlan, meal1: newItemsWithCorrectCalories, meal2: [], meal3: [], supplements: [] };
            }
            return dayPlan;
        })
      );
      
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const activeDayPlan = plan.find(p => p.day === activeTab);
  const dailyTotals = useMemo(() => {
    if (!activeDayPlan) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    return {
      calories: activeDayPlan.totalCalories || 0,
      protein: activeDayPlan.protein || 0,
      carbs: activeDayPlan.carbs || 0,
      fat: activeDayPlan.fat || 0,
      fiber: activeDayPlan.fiber || 0,
    }
  }, [activeDayPlan]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>My Weekly Diet Plan</DialogTitle>
          <DialogDescription>
            Plan your meals and track your nutritional totals. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-grow min-h-0 flex flex-col">
            <TabsList className="grid w-full grid-cols-7">
                {WEEK_DAYS.map(day => (
                    <TabsTrigger key={day} value={day}>{day.substring(0,3)}</TabsTrigger>
                ))}
            </TabsList>
            <div className="flex-grow min-h-0 mt-4">
              <ScrollArea className="h-full pr-6">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BrainCircuit className="text-primary h-5 w-5" />
                                Smart Estimate
                            </CardTitle>
                             <CardDescription>
                                Describe your full day's meals. The system will parse keywords to estimate your macros. This will replace the current items for this day.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Textarea 
                                    value={smartEstimateText} 
                                    onChange={(e) => setSmartEstimateText(e.target.value)}
                                    placeholder="e.g., For breakfast I had 3 eggs and 50g of oats. For lunch, 200g chicken breast with 150g white rice..."
                                />
                                <Button onClick={handleSmartEstimate} disabled={isLoading} className="flex-shrink-0">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Estimate"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <MealEditor mealKey="meal1" day={activeTab} plan={activeDayPlan!} onUpdate={handleUpdateDayPlan} />
                        <MealEditor mealKey="meal2" day={activeTab} plan={activeDayPlan!} onUpdate={handleUpdateDayPlan} />
                        <MealEditor mealKey="meal3" day={activeTab} plan={activeDayPlan!} onUpdate={handleUpdateDayPlan} />
                        <MealEditor mealKey="supplements" day={activeTab} plan={activeDayPlan!} onUpdate={handleUpdateDayPlan} />
                    </div>
                </div>
              </ScrollArea>
            </div>
            <div className="mt-4 pt-4 border-t flex-shrink-0">
              <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Daily Totals for {activeTab}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-2 text-sm text-center">
                      <div><div className="font-bold text-lg">{dailyTotals.calories.toFixed(0)}</div><div className="text-muted-foreground">Calories</div></div>
                      <div><div className="font-bold text-lg">{dailyTotals.protein.toFixed(0)}g</div><div className="text-muted-foreground">Protein</div></div>
                      <div><div className="font-bold text-lg">{dailyTotals.carbs.toFixed(0)}g</div><div className="text-muted-foreground">Carbs</div></div>
                      <div><div className="font-bold text-lg">{dailyTotals.fat.toFixed(0)}g</div><div className="text-muted-foreground">Fat</div></div>
                      <div><div className="font-bold text-lg">{dailyTotals.fiber.toFixed(0)}g</div><div className="text-muted-foreground">Fiber</div></div>
                  </div>
              </div>
            </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
