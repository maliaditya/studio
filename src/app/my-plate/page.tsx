"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { format, getDay } from 'date-fns';
import { Dumbbell, BrainCircuit, TrendingUp, Share2, Heart, Briefcase, Sparkles, Trophy } from 'lucide-react';
import type { ExerciseDefinition, AllWorkoutPlans, WorkoutMode, ExerciseCategory } from '@/types/workout';

// Duplicating these from workout page for now, can be refactored to a shared util later
const dailyMuscleGroups: Record<number, string[]> = {
  1: ["Chest", "Triceps"], 2: ["Back", "Biceps"], 3: ["Shoulders", "Legs"],
  4: ["Chest", "Triceps"], 5: ["Back", "Biceps"], 6: ["Shoulders", "Legs"], 0: [],
};

const singleMuscleDailySchedule: Record<number, ExerciseCategory | null> = {
    1: "Chest",       // Monday
    2: "Triceps",     // Tuesday
    3: "Back",        // Wednesday
    4: "Biceps",      // Thursday
    5: "Shoulders",   // Friday
    6: "Legs",        // Saturday
    0: null,          // Sunday
};


function MyPlatePageContent() {
  const { currentUser } = useAuth();
  
  const [upskillTopics, setUpskillTopics] = useState<string[]>([]);
  const [deepWorkTopics, setDeepWorkTopics] = useState<string[]>([]);
  const [brandingBundles, setBrandingBundles] = useState<string[]>([]);
  const [todaysWorkout, setTodaysWorkout] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.username) {
      const username = currentUser.username;
      
      // Upskill Data
      const upskillDefsKey = `upskill_definitions_${username}`;
      const storedUpskillDefs: ExerciseDefinition[] = JSON.parse(localStorage.getItem(upskillDefsKey) || '[]');
      const upskillTopicSet = new Set(storedUpskillDefs.map(def => def.category));
      setUpskillTopics(Array.from(upskillTopicSet));
      
      // Deep Work Data
      const deepWorkDefsKey = `deepwork_definitions_${username}`;
      const storedDeepWorkDefs: ExerciseDefinition[] = JSON.parse(localStorage.getItem(deepWorkDefsKey) || '[]');
      const deepWorkTopicSet = new Set(storedDeepWorkDefs.map(def => def.category));
      setDeepWorkTopics(Array.from(deepWorkTopicSet));
      
      // Branding Data
      const brandingTasksKey = `branding_tasks_${username}`;
      const storedBrandingTasks: ExerciseDefinition[] = JSON.parse(localStorage.getItem(brandingTasksKey) || '[]');
      const activeBundles = storedBrandingTasks.filter(task => !(task.sharingStatus?.twitter && task.sharingStatus?.linkedin && task.sharingStatus?.devto));
      setBrandingBundles(activeBundles.map(task => task.name));

      // Workout Data
      const modeKey = `workoutMode_${username}`;
      const storedMode = (localStorage.getItem(modeKey) as WorkoutMode) || 'two-muscle';
      const dayOfWeek = getDay(new Date());
      if (storedMode === 'two-muscle') {
        const muscles = dailyMuscleGroups[dayOfWeek] || [];
        setTodaysWorkout(muscles.length > 0 ? muscles.join(' & ') : "Rest Day");
      } else {
        const muscle = singleMuscleDailySchedule[dayOfWeek];
        setTodaysWorkout(muscle || "Rest Day");
      }

      setIsLoading(false);
    }
  }, [currentUser]);

  const plateItems = [
    {
      title: 'Health',
      icon: <Heart className="h-8 w-8 text-red-500" />,
      description: 'Physical well-being and fitness.',
      items: [
          todaysWorkout !== 'Rest Day' && { name: 'Gym', detail: todaysWorkout, icon: <Dumbbell/> },
          { name: 'Morning Walks', detail: 'Daily Consistency', icon: <Sparkles/> }
      ].filter(Boolean) as {name: string, detail: string | null, icon: React.ReactNode}[]
    },
    {
      title: 'Wealth',
      icon: <Briefcase className="h-8 w-8 text-green-500" />,
      description: 'Focus areas for potential income.',
      items: deepWorkTopics.map(topic => ({ name: topic, detail: 'Deep Work Topic', icon: <BrainCircuit/> }))
    },
    {
      title: 'Growth',
      icon: <TrendingUp className="h-8 w-8 text-blue-500" />,
      description: 'Skills and knowledge acquisition.',
      items: upskillTopics.map(topic => ({ name: topic, detail: 'Learning Topic', icon: <TrendingUp/> }))
    },
    {
      title: 'Branding',
      icon: <Share2 className="h-8 w-8 text-purple-500" />,
      description: 'Content creation and personal marketing.',
      items: brandingBundles.map(bundle => ({ name: bundle, detail: 'Content Bundle', icon: <Share2/> }))
    }
  ];

  if (isLoading) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
            <p className="text-muted-foreground">Loading your plate...</p>
        </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-4">
            <Trophy className="h-10 w-10"/>
            What's On My Plate
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A top-down view of your current life commitments and areas of focus.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {plateItems.map(plate => (
            <Card key={plate.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        {plate.icon}
                        <div>
                            <CardTitle className="text-2xl">{plate.title}</CardTitle>
                            <CardDescription>{plate.description}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {plate.items.length > 0 ? (
                        <ul className="space-y-3">
                            {plate.items.map((item, index) => (
                                <li key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                    <div className="p-2 bg-background rounded-full">
                                        {item.icon}
                                    </div>
                                    <div className='min-w-0'>
                                        <p className="font-semibold text-foreground truncate" title={item.name}>{item.name}</p>
                                        {item.detail && <p className="text-sm text-muted-foreground truncate">{item.detail}</p>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-muted-foreground py-4">Nothing on the plate for this area yet.</p>
                    )}
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}

export default function MyPlatePage() {
    return (
        <AuthGuard>
            <MyPlatePageContent />
        </AuthGuard>
    )
}
