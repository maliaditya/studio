
"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Sunrise, Sun, Sunset, Moon, MoonStar, CloudSun, PlusCircle, Trash2, Dumbbell, BookOpenCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format, getDay, getISOWeek } from 'date-fns';
import { useRouter } from 'next/navigation';
import { TodaysWorkoutModal } from '@/components/TodaysWorkoutModal';
import type { AllWorkoutPlans, ExerciseDefinition, WorkoutMode, WorkoutExercise, FullSchedule, Activity } from '@/types/workout';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';

const slots = [
  { name: 'Late Night', time: '12 AM - 4 AM', icon: <Moon className="h-6 w-6 text-indigo-400" /> },
  { name: 'Dawn', time: '4 AM - 8 AM', icon: <Sunrise className="h-6 w-6 text-orange-400" /> },
  { name: 'Morning', time: '8 AM - 12 PM', icon: <Sun className="h-6 w-6 text-yellow-400" /> },
  { name: 'Afternoon', time: '12 PM - 4 PM', icon: <CloudSun className="h-6 w-6 text-sky-500" /> },
  { name: 'Evening', time: '4 PM - 8 PM', icon: <Sunset className="h-6 w-6 text-purple-500" /> },
  { name: 'Night', time: '8 PM - 12 AM', icon: <MoonStar className="h-6 w-6 text-indigo-500" /> }
];

const slotEndHours: Record<string, number> = {
  'Late Night': 4,
  'Dawn': 8,
  'Morning': 12,
  'Afternoon': 16,
  'Evening': 20,
  'Night': 24, // Represents midnight of the next day
};


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

const INITIAL_PLANS: AllWorkoutPlans = {
    "W1": { "Chest": ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine"], "Triceps": ["Close-Grip Barbell Bench Press", "Overhead Dumbbell Extension", "Dumbbell Kickback", "Cable Rope Pushdown (Slow)"], "Back": ["Lat Pulldown", "Machine Row", "T-Bar Row", "Lat Prayer Pull"], "Biceps": ["Standing dumbbell curls", "Standing Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)"], "Shoulders": ["Seated Dumbbell Shoulder Press", "Standing Dumbbell Lateral Raise", "Face Pulls", "Shrugs"], "Legs": ["Walking Lunges (Barbell)", "Leg Press", "Quads Machine", "Hamstring machine"] },
    "W2": { "Chest": ["Dumbbell Flat Press", "Incline Dumbbell Press", "Decline Dumbbell Press", "Cable Fly"], "Triceps": ["Overhead Dumbbell Extension", "Overhead Bar extension", "Rope Pushdown", "Dumbbell Kickback"], "Back": ["Lat Pulldown (Wide Grip)", "V handle lat pulldown", "1-Arm Dumbbell Row", "Back extensions"], "Biceps": ["Seated Incline Dumbbell Curl", "Seated Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Reverse Cable"], "Shoulders": ["Seated Dumbbell Shoulder Press", "Seated Dumbbell Lateral Raise", "Rear Delt Fly (Incline Bench)", "Cable Upright Rows"], "Legs": ["Walking Lunges (Barbell)", "Squats (Barbell)", "Hamstring machine", "Quads Machine"] },
    "W3": { "Chest": ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine"], "Triceps": ["Overhead Cable Extension", "Straight bar pushdown", "Reversebar pushdown", "Back dips"], "Back": ["Lat Pulldown", "Barbell Row", "Seated Row", "Lat Prayer Pull"], "Biceps": ["Strict bar curls", "Reversed Incline curls", "Cable Curls Superset", "Reversed cable curls"], "Shoulders": ["Seated Dumbbell Shoulder Press", "Dumbbell Lateral Raise (Lean in)", "Face Pulls", "Shrugs"], "Legs": ["Leg Press", "Quads Machine", "Hamstring machine", "Calf Raises (Bodyweight)"] },
    "W4": { "Chest": ["Dumbbell Flat Press", "Incline Dumbbell Press", "Dumbbell Pullovers", "Cable Fly"], "Triceps": ["Overhead Cable Extension", "Straight bar pushdown", "Reversebar pushdown", "Back dips"], "Back": ["Lat Pulldown", "1-Arm Dumbbell Row", "V handle pulldown Cable", "DeadLifts"], "Biceps": ["Seated Machine Curls", "Cable Curls", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)"], "Shoulders": ["Seated Dumbbell Shoulder Press", "Lean-Away Cable Lateral Raise", "Face Pulls", "Front Raise cable"], "Legs": ["Walking Lunges (Barbell)", "Squats (Barbell)", "Hamstring machine", "Quads Machine"] },
    "W5": { "Chest": ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine", "Cable Fly", "Dumbbell Pullovers"], "Triceps": ["Close-Grip Barbell Bench Press", "Overhead Dumbbell Extension", "Dumbbell Kickback", "Straight bar pushdown", "Reversebar pushdown", "Back dips"], "Back": ["Lat Pulldown", "Machine Row", "T-Bar Row", "Lat Prayer Pull", "1-Arm Dumbbell Row", "DeadLifts"], "Biceps": ["Standing dumbbell curls", "Standing Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)", "Reversed cable curls", "Reversed Incline curls"], "Shoulders": ["Seated Dumbbell Shoulder Press", "Standing Dumbbell Lateral Raise", "Face Pulls", "Cable Upright Rows", "Front Raise Dumbbells", "Shrugs"], "Legs": ["Squats (Barbell)", "Leg Press", "Quads Machine", "Hamstring machine", "Walking Lunges (Barbell)", "Calf Raises"] },
    "W6": { "Chest": ["Dumbbell Flat Press", "Incline Dumbbell Press", "Decline Dumbbell Press", "Peck Machine", "Flat Bench Chest Fly", "Dumbbell Pullovers"], "Triceps": ["Overhead Cable Extension", "Single Arm Dumbbell Extensions", "Rope Pushdown", "Straight bar pushdown", "Reversebar pushdown", "Back dips"], "Back": ["Lat Pulldown", "1-Arm Dumbbell Row", "V handle pulldown Cable", "Barbell Row", "Lat Prayer Pull", "Back extensions"], "Biceps": ["Strict bar curls", "Seated Incline Dumbbell Curl", "Seated Dumbbell Alternating Curl", "Preacher Curls Bar", "Reverse Cable", "Concentration Curl"], "Shoulders": ["Seated Dumbbell Shoulder Press", "Lean-Away Cable Lateral Raise", "Face Pulls", "Front Raise cable", "Cable Upright Rows", "Shrugs"], "Legs": ["Walking Lunges (Barbell)", "Hack Squats", "Hamstring machine", "Quads Machine", "Leg Press", "Calf Raises"] }
};

function HomePageContent() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [currentSlot, setCurrentSlot] = useState('');
  const [remainingTime, setRemainingTime] = useState('');
  const [schedule, setSchedule] = useState<FullSchedule>({});
  const [todayKey, setTodayKey] = useState('');

  // State for workout data
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>('two-muscle');
  const [workoutPlans, setWorkoutPlans] = useState<AllWorkoutPlans>(INITIAL_PLANS);
  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  
  // State for TodaysWorkoutModal
  const [isTodaysWorkoutModalOpen, setIsTodaysWorkoutModalOpen] = useState(false);
  const [todaysExercises, setTodaysExercises] = useState<WorkoutExercise[]>([]);
  const [todaysMuscleGroups, setTodaysMuscleGroups] = useState<string[]>([]);

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
          const parsedSchedule: FullSchedule = JSON.parse(storedSchedule);
          // Data migration: ensure all activities have a 'completed' property
          Object.keys(parsedSchedule).forEach(dateKey => {
            Object.keys(parsedSchedule[dateKey]).forEach(slotName => {
              if (parsedSchedule[dateKey][slotName].completed === undefined) {
                parsedSchedule[dateKey][slotName].completed = false;
              }
            });
          });
          setSchedule(parsedSchedule);
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

  // Load workout data
  useEffect(() => {
    if (currentUser?.username) {
        const username = currentUser.username;
        const defsKey = `exerciseDefinitions_${username}`;
        const plansKey = `workoutPlans_${username}`;
        const modeKey = `workoutMode_${username}`;

        const storedMode = localStorage.getItem(modeKey);
        setWorkoutMode((storedMode as WorkoutMode) || 'two-muscle');

        try {
            const storedPlans = localStorage.getItem(plansKey);
            setWorkoutPlans(storedPlans ? JSON.parse(storedPlans) : INITIAL_PLANS);
        } catch (e) {
            setWorkoutPlans(INITIAL_PLANS);
        }

        try {
            const storedDefinitions = localStorage.getItem(defsKey);
            setExerciseDefinitions(storedDefinitions ? JSON.parse(storedDefinitions) : []);
        } catch (e) {
            setExerciseDefinitions([]);
        }
    }
  }, [currentUser]);

  useEffect(() => {
    const timerInterval = setInterval(() => {
        const now = new Date();
        const currentHour = now.getHours();

        let activeSlot = 'Night';
        if (currentHour >= 0 && currentHour < 4) activeSlot = 'Late Night';
        else if (currentHour >= 4 && currentHour < 8) activeSlot = 'Dawn';
        else if (currentHour >= 8 && currentHour < 12) activeSlot = 'Morning';
        else if (currentHour >= 12 && currentHour < 16) activeSlot = 'Afternoon';
        else if (currentHour >= 16 && currentHour < 20) activeSlot = 'Evening';
        
        setCurrentSlot(activeSlot);

        const slotEndHour = slotEndHours[activeSlot];
        const slotEndTime = new Date();
        slotEndTime.setHours(slotEndHour, 0, 0, 0);

        const diff = slotEndTime.getTime() - now.getTime();

        if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);

            setRemainingTime(
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            );
        } else {
            setRemainingTime('00:00:00');
        }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  const handleAddActivity = (slotName: string, type: 'workout' | 'upskill') => {
    if (!currentUser?.username || !todayKey) return;

    let details = '';
    if (type === 'workout') {
      const dayOfWeek = getDay(new Date());
      let muscleGroups: string[] = [];
      if (workoutMode === 'one-muscle') {
        const muscle = singleMuscleDailySchedule[dayOfWeek];
        if (muscle) muscleGroups = [muscle];
      } else {
        muscleGroups = dailyMuscleGroups[dayOfWeek] || [];
      }
      details = muscleGroups.join(' & ') || "Rest Day";
    } else {
      details = 'Learning Session';
    }

    setSchedule(prev => ({
      ...prev,
      [todayKey]: { ...(prev[todayKey] || {}), [slotName]: { type, details, completed: false } }
    }));
  };

  const handleRemoveActivity = (slotName: string) => {
    if (!todayKey) return;
    setSchedule(prev => {
      const newTodaySchedule = { ...(prev[todayKey] || {}) };
      delete newTodaySchedule[slotName];
      return { ...prev, [todayKey]: newTodaySchedule };
    });
  };

  const handleToggleComplete = (slotName: string) => {
    if (!todayKey) return;
    setSchedule(prev => {
      const todaySchedule = { ...(prev[todayKey] || {}) };
      const activity = todaySchedule[slotName];

      if (activity) {
        todaySchedule[slotName] = { ...activity, completed: !activity.completed };
      }

      return { ...prev, [todayKey]: todaySchedule };
    });
  };

  const getTodaysWorkout = () => {
    const today = new Date();
    const dayOfWeek = getDay(today);
    const isoWeek = getISOWeek(today);
    const isOddWeek = isoWeek % 2 !== 0;

    let muscleGroupsForDay: string[] = [];
    let plan: any = null;
    
    if (workoutMode === 'two-muscle') {
        if (isOddWeek) {
          plan = (dayOfWeek >= 1 && dayOfWeek <= 3) || dayOfWeek === 6 ? workoutPlans.W1 : workoutPlans.W2;
        } else {
          plan = (dayOfWeek >= 1 && dayOfWeek <= 3) || dayOfWeek === 6 ? workoutPlans.W3 : workoutPlans.W4;
        }
        muscleGroupsForDay = dailyMuscleGroups[dayOfWeek] || [];
    } else {
        plan = isOddWeek ? workoutPlans.W5 : workoutPlans.W6;
        const muscleGroupForDay = singleMuscleDailySchedule[dayOfWeek];
        if (muscleGroupForDay) muscleGroupsForDay = [muscleGroupForDay];
    }

    const exercisesToAdd: WorkoutExercise[] = [];
    if (plan && muscleGroupsForDay.length > 0) {
      muscleGroupsForDay.forEach(muscleGroup => {
        const exerciseNames = (plan as any)[muscleGroup] as string[] | undefined;
        if (exerciseNames) {
          exerciseNames.forEach(exName => {
            const definition = exerciseDefinitions.find(def => def.name.toLowerCase() === exName.toLowerCase());
            if (definition && !exercisesToAdd.some(e => e.definitionId === definition.id)) {
              exercisesToAdd.push({
                id: `${definition.id}-${Date.now()}-${Math.random()}`,
                definitionId: definition.id,
                name: definition.name,
                category: definition.category,
                loggedSets: [], targetSets: 4, targetReps: "8-12",
              });
            }
          });
        }
      });
    }
    return { exercises: exercisesToAdd, muscleGroups: muscleGroupsForDay };
  };

  const handleActivityClick = (activity: Activity) => {
    if (activity.completed) return; // Don't open modal for completed tasks

    if (activity.type === 'workout') {
      const { exercises, muscleGroups } = getTodaysWorkout();
      setTodaysExercises(exercises);
      setTodaysMuscleGroups(muscleGroups);
      setIsTodaysWorkoutModalOpen(true);
    } else if (activity.type === 'upskill') {
      router.push('/upskill');
    }
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
            <p className="text-md text-muted-foreground pt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
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
                      <div>
                        <CardTitle className="text-lg font-medium">{slot.name}</CardTitle>
                        <CardDescription>{slot.time}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentSlot === slot.name ? (
                          <div className="font-mono text-lg text-primary/80 tracking-wider animate-subtle-pulse">
                            {remainingTime}
                          </div>
                        ) : (
                          slot.icon
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col justify-between min-h-[8rem]">
                        {activity ? (
                          <>
                            <div 
                              className={cn("flex-grow", activity.completed ? "opacity-60" : "cursor-pointer")}
                              onClick={() => handleActivityClick(activity)}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                  {activity.type === 'workout' 
                                      ? <Dumbbell className="h-5 w-5 text-primary" /> 
                                      : <BookOpenCheck className="h-5 w-5 text-primary" />}
                                  <span className="font-semibold capitalize">{activity.type}</span>
                              </div>
                              <p className={cn("text-xl font-bold text-foreground", activity.completed && "line-through")}>
                                {activity.details}
                              </p>
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-3 border-t">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id={`cb-${slot.name}`} checked={!!activity.completed} onCheckedChange={() => handleToggleComplete(slot.name)} />
                                    <Label htmlFor={`cb-${slot.name}`} className="text-sm font-medium cursor-pointer text-muted-foreground">Mark as done</Label>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveActivity(slot.name)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                          </>
                        ) : (
                          <>
                              {currentSlot === slot.name ? (
                                <div className="flex-grow flex items-center justify-center">
                                    <div className="text-center">
                                        <p className="text-lg text-muted-foreground">Current Focus</p>
                                    </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground flex-grow flex items-center justify-center text-center px-4">
                                    Plan an activity for this block.
                                </p>
                              )}
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
      
      <ActivityHeatmap schedule={schedule} />

      {currentUser && (
        <TodaysWorkoutModal
            isOpen={isTodaysWorkoutModalOpen}
            onOpenChange={setIsTodaysWorkoutModalOpen}
            todaysExercises={todaysExercises}
            muscleGroupsForDay={todaysMuscleGroups}
        />
      )}
    </div>
  );
}

export default function Page() {
    return ( <AuthGuard> <HomePageContent /> </AuthGuard> );
}
