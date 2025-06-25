"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Sunrise, Sun, Sunset, Moon, MoonStar, CloudSun, PlusCircle, Trash2, Dumbbell, BookOpenCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format, getDay } from 'date-fns';

const slots = [
  { name: 'Late Night', time: '12 AM - 4 AM', icon: <Moon className="h-6 w-6 text-indigo-400" /> },
  { name: 'Dawn', time: '4 AM - 8 AM', icon: <Sunrise className="h-6 w-6 text-orange-400" /> },
  { name: 'Morning', time: '8 AM - 12 PM', icon: <Sun className="h-6 w-6 text-yellow-400" /> },
  { name: 'Afternoon', time: '12 PM - 4 PM', icon: <CloudSun className="h-6 w-6 text-sky-500" /> },
  { name: 'Evening', time: '4 PM - 8 PM', icon: <Sunset className="h-6 w-6 text-purple-500" /> },
  { name: 'Night', time: '8 PM - 12 AM', icon: <MoonStar className="h-6 w-6 text-indigo-500" /> }
];

// Schedules for workout focus calculation
const dailyMuscleGroups: Record<number, string[]> = {
  1: ["Chest", "Triceps"], // Monday
  2: ["Back", "Biceps"],   // Tuesday
  3: ["Shoulders", "Legs"],// Wednesday
  4: ["Chest", "Triceps"], // Thursday
  5: ["Back", "Biceps"],   // Friday
  6: ["Shoulders", "Legs"], // Saturday
  0: [], // Sunday
};
const singleMuscleDailySchedule: Record<number, string | null> = {
    1: "Chest",
    2: "Back",
    3: "Legs",
    4: "Shoulders",
    5: "Biceps",
    6: "Triceps",
    0: null,
};

type Activity = {
  type: 'workout' | 'upskill';
  details: string;
};
type DailySchedule = Record<string, Activity>; // Slot name -> Activity
type FullSchedule = Record<string, DailySchedule>; // Date key -> DailySchedule

function HomePageContent() {
  const { currentUser } = useAuth();
  const [currentSlot, setCurrentSlot] = useState('');
  const [schedule, setSchedule] = useState<FullSchedule>({});
  const [todayKey, setTodayKey] = useState('');

  useEffect(() => {
    setTodayKey(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const scheduleStorageKey = currentUser ? `lifeos_schedule_${currentUser.username}` : null;

  // Load schedule from localStorage
  useEffect(() => {
    if (scheduleStorageKey) {
      try {
        const storedSchedule = localStorage.getItem(scheduleStorageKey);
        if (storedSchedule) {
          setSchedule(JSON.parse(storedSchedule));
        }
      } catch (error) {
        console.error("Failed to parse schedule from localStorage", error);
        setSchedule({});
      }
    }
  }, [scheduleStorageKey]);

  // Save schedule to localStorage
  useEffect(() => {
    if (scheduleStorageKey) {
      localStorage.setItem(scheduleStorageKey, JSON.stringify(schedule));
    }
  }, [schedule, scheduleStorageKey]);

  useEffect(() => {
    const getSlot = () => {
      const currentHour = new Date().getHours();
      if (currentHour >= 0 && currentHour < 4) return 'Late Night';
      if (currentHour >= 4 && currentHour < 8) return 'Dawn';
      if (currentHour >= 8 && currentHour < 12) return 'Morning';
      if (currentHour >= 12 && currentHour < 16) return 'Afternoon';
      if (currentHour >= 16 && currentHour < 20) return 'Evening';
      return 'Night';
    };
    
    setCurrentSlot(getSlot());
    const interval = setInterval(() => setCurrentSlot(getSlot()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAddActivity = (slotName: string, type: 'workout' | 'upskill') => {
    if (!currentUser?.username || !todayKey) return;

    let details = '';
    if (type === 'workout') {
      const workoutMode = localStorage.getItem(`workoutMode_${currentUser.username}`) || 'two-muscle';
      const dayOfWeek = getDay(new Date());

      let muscleGroups: string[] = [];
      if (workoutMode === 'one-muscle') {
        const muscle = singleMuscleDailySchedule[dayOfWeek];
        if (muscle) muscleGroups = [muscle];
      } else {
        muscleGroups = dailyMuscleGroups[dayOfWeek] || [];
      }
      
      details = muscleGroups.join(' & ');
      if (!details) details = "Rest Day";

    } else if (type === 'upskill') {
      details = 'Learning Session'; // Placeholder
    }

    setSchedule(prev => ({
      ...prev,
      [todayKey]: {
        ...(prev[todayKey] || {}),
        [slotName]: { type, details }
      }
    }));
  };

  const handleRemoveActivity = (slotName: string) => {
    if (!todayKey) return;
    setSchedule(prev => {
      const newTodaySchedule = { ...(prev[todayKey] || {}) };
      delete newTodaySchedule[slotName];
      return {
        ...prev,
        [todayKey]: newTodaySchedule
      };
    });
  };

  const todaysSchedule = schedule[todayKey] || {};

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="max-w-5xl mx-auto shadow-lg border-0 bg-transparent">
        <CardHeader className="text-center">
            <BrainCircuit className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-bold">Welcome to LifeOS</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
                Hello, <span className="font-semibold text-primary">{currentUser?.username}</span>! Here's a look at your day.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {slots.map((slot) => {
                const activity = todaysSchedule[slot.name];
                return (
                  <Card 
                    key={slot.name} 
                    className={`transition-all duration-300 ease-in-out transform hover:-translate-y-1 ${
                      currentSlot === slot.name 
                      ? 'ring-2 ring-primary shadow-2xl bg-card' 
                      : 'shadow-md bg-card/60'
                    }`}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg font-medium">{slot.name}</CardTitle>
                      {slot.icon}
                    </CardHeader>
                    <CardContent className="flex flex-col justify-between min-h-[8rem]">
                        {activity ? (
                          <>
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                  {activity.type === 'workout' 
                                      ? <Dumbbell className="h-5 w-5 text-primary" /> 
                                      : <BookOpenCheck className="h-5 w-5 text-primary" />}
                                  <span className="font-semibold capitalize">{activity.type}</span>
                              </div>
                              <p className="text-xl font-bold text-foreground">{activity.details}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveActivity(slot.name)} className="self-start p-1 h-auto text-xs text-muted-foreground hover:text-destructive mt-2">
                                <Trash2 className="h-3 w-3 mr-1" />
                                Remove
                            </Button>
                          </>
                        ) : (
                          <>
                              <p className="text-sm text-muted-foreground">
                                  {currentSlot === slot.name ? "This is your current focus block." : "Plan an activity for this block."}
                              </p>
                              <Popover>
                                  <PopoverTrigger asChild>
                                      <Button variant="outline" size="sm" className="mt-2 self-start">
                                          <PlusCircle className="h-4 w-4 mr-2" />
                                          Add Activity
                                      </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-48 p-2">
                                      <div className="grid gap-1">
                                          <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleAddActivity(slot.name, 'workout')}>
                                              <Dumbbell className="h-4 w-4 mr-2" />
                                              Add Workout
                                          </Button>
                                          <Button variant="ghost" size="sm" className="justify-start" onClick={() => handleAddActivity(slot.name, 'upskill')}>
                                              <BookOpenCheck className="h-4 w-4 mr-2" />
                                              Add Upskill
                                          </Button>
                                      </div>
                                  </PopoverContent>
                              </Popover>
                          </>
                        )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
    return ( <AuthGuard> <HomePageContent /> </AuthGuard> );
}
