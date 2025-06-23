
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { generateDietPlan } from '@/ai/flows/generateDietPlanFlow';
import type { GenerateDietPlanInput, GenerateDietPlanOutput } from '@/types/workout';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from './ui/badge';

interface DietPlanModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentWeight: number | null;
  goalWeight: number | null;
}

export function DietPlanModal({
  isOpen,
  onOpenChange,
  currentWeight,
  goalWeight
}: DietPlanModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [dietPlan, setDietPlan] = useState<GenerateDietPlanOutput | null>(null);

  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<GenerateDietPlanInput['gender'] | ''>('');
  const [activityLevel, setActivityLevel] = useState<GenerateDietPlanInput['activityLevel'] | ''>('');
  const [preferences, setPreferences] = useState('');

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWeight || !goalWeight || !height || !age || !gender || !activityLevel) {
      toast({
        title: "Missing Information",
        description: "Please fill out all required fields to generate a diet plan.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setDietPlan(null);

    try {
      const input: GenerateDietPlanInput = {
        currentWeight,
        goalWeight,
        height: parseInt(height),
        age: parseInt(age),
        gender: gender as GenerateDietPlanInput['gender'],
        activityLevel: activityLevel as GenerateDietPlanInput['activityLevel'],
        preferences,
      };
      const result = await generateDietPlan(input);
      if (result?.weeklyPlan && result.summary) {
        setDietPlan(result);
      } else {
        throw new Error("The AI did not return a valid diet plan object.");
      }
    } catch (error) {
      console.error("Failed to generate diet plan:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI-Powered Diet Plan Generator</DialogTitle>
          <DialogDescription>
            Fill in your details below to get a personalized 7-day diet plan.
            This is a suggestion and not medical advice.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow min-h-0">
          {/* Form Section */}
          <form onSubmit={handleGeneratePlan} className="space-y-4 md:col-span-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g., 180" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g., 30" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <RadioGroup value={gender} onValueChange={(value) => setGender(value as any)} className="flex gap-4">
                <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Male</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Female</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="other" id="other" /><Label htmlFor="other">Other</Label></div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-level">Activity Level</Label>
              <Select value={activityLevel} onValueChange={(value) => setActivityLevel(value as any)} required>
                <SelectTrigger id="activity-level"><SelectValue placeholder="Select your activity level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                  <SelectItem value="light">Lightly active (light exercise/sports 1-3 days/week)</SelectItem>
                  <SelectItem value="moderate">Moderately active (moderate exercise/sports 3-5 days/week)</SelectItem>
                  <SelectItem value="active">Very active (hard exercise/sports 6-7 days a week)</SelectItem>
                  <SelectItem value="very_active">Extra active (very hard exercise/physical job)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferences">Dietary Preferences & Restrictions</Label>
              <Textarea id="preferences" value={preferences} onChange={(e) => setPreferences(e.target.value)} placeholder="e.g., Vegetarian, gluten-free, no seafood..." />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : 'Generate Diet Plan'}
            </Button>
          </form>

          {/* Display Section */}
          <ScrollArea className="md:col-span-2 border rounded-md p-4 bg-muted/20">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="mt-4 text-muted-foreground">Generating your personalized plan...</p>
              </div>
            )}
            {dietPlan && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground italic border-l-4 pl-4">{dietPlan.summary}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Day</TableHead>
                      <TableHead>Breakfast</TableHead>
                      <TableHead>Lunch</TableHead>
                      <TableHead>Dinner</TableHead>
                      <TableHead>Snacks</TableHead>
                      <TableHead className="text-right w-[120px]">Total Calories</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dietPlan.weeklyPlan.map((dayPlan) => (
                      <TableRow key={dayPlan.day}>
                        <TableCell className="font-medium">{dayPlan.day}</TableCell>
                        <TableCell>
                          <p>{dayPlan.breakfast.description}</p>
                          <Badge variant="secondary" className="mt-1">{dayPlan.breakfast.calories} kcal</Badge>
                        </TableCell>
                        <TableCell>
                          <p>{dayPlan.lunch.description}</p>
                          <Badge variant="secondary" className="mt-1">{dayPlan.lunch.calories} kcal</Badge>
                        </TableCell>
                        <TableCell>
                          <p>{dayPlan.dinner.description}</p>
                          <Badge variant="secondary" className="mt-1">{dayPlan.dinner.calories} kcal</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <p>{dayPlan.snack1.description} ({dayPlan.snack1.calories} kcal)</p>
                          <p className="mt-2">{dayPlan.snack2.description} ({dayPlan.snack2.calories} kcal)</p>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">{dayPlan.totalCalories.toLocaleString()} kcal</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {!isLoading && !dietPlan && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-muted-foreground">Your generated diet plan will appear here.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
