

      

"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { format, getDay, getISOWeek, differenceInDays, addDays, parseISO, subYears, differenceInYears, addWeeks, startOfISOWeek, setISOWeek, getISOWeekYear, subDays, isAfter, startOfToday, isBefore } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MindMapViewer } from '@/components/MindMapViewer';

import { TodaysWorkoutModal } from '@/components/TodaysWorkoutModal';
import { TodaysLearningModal } from '@/components/TodaysLearningModal';
import { TodaysLeadGenModal } from '@/components/TodaysLeadGenModal';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { DietPlanModal } from '@/components/DietPlanModal';
import { StatsOverviewModal } from '@/components/StatsOverviewModal';
import { DashboardStats } from '@/components/DashboardStats';
import { ProductivitySnapshot, TimeAllocationChart } from '@/components/ProductivitySnapshot';
import { TimeSlots } from '@/components/TimeSlots';
import { WeightGoalCard } from '@/components/WeightGoalCard';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { CalendarIcon, Brain as BrainIcon, MessageSquare, Workflow, Utensils, BarChart3, PieChart } from 'lucide-react';
import { TodaysScheduleCard } from '@/components/TodaysScheduleCard';
import { FocusSessionModal } from '@/components/FocusSessionModal';
import { TaskContextModal } from '@/components/TaskContextModal';
import { Checkbox } from '@/components/ui/checkbox';


import type { AllWorkoutPlans, ExerciseDefinition, WorkoutMode, WorkoutExercise, FullSchedule, Activity as ActivityType, DatedWorkout, TopicGoal, WorkoutPlan, ExerciseCategory, WeightLog, Gender, UserDietPlan, DailySchedule, Activity, Release, PistonEntry, ResourceFolder, Interrupt, ProductizationPlan } from '@/types/workout';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { KanbanPageContent } from '@/app/kanban/page';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TodaysDietCard } from '@/components/TodaysDietCard';

const slotEndHours: Record<string, number> = {
  'Late Night': 4, 'Dawn': 8, 'Morning': 12, 'Afternoon': 16, 'Evening': 20, 'Night': 24,
};

const parseDurationToMinutes = (durationStr: string | undefined): number => {
    if (!durationStr) return 0;
    
    // Handle "30" as "30m"
    if (/^\d+$/.test(durationStr.trim())) {
        return parseInt(durationStr.trim(), 10);
    }

    let totalMinutes = 0;
    const hourMatch = durationStr.match(/(\d+)\s*h/);
    if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
    const minMatch = durationStr.match(/(\d+)\s*m/);
    if (minMatch) totalMinutes += parseInt(minMatch[1], 10);
    
    return totalMinutes;
};

function MyPlatePageContent() {
  const { 
    currentUser, 
    setWeightLogs,
    goalWeight, setGoalWeight,
    height, setHeight,
    dateOfBirth, setDateOfBirth,
    gender, setGender,
    dietPlan, setDietPlan,
    schedule, setSchedule,
    allUpskillLogs, setAllUpskillLogs,
    allDeepWorkLogs, setAllDeepWorkLogs,
    allWorkoutLogs,
    allLeadGenLogs,
    brandingLogs, setAllBrandingLogs,
    isAgendaDocked, setIsAgendaDocked,
    handleToggleComplete, handleLogLearning,
    workoutMode, workoutPlans, exerciseDefinitions,
    upskillDefinitions, topicGoals, deepWorkDefinitions, setDeepWorkDefinitions,
    leadGenDefinitions,
    projects,
    productizationPlans,
    offerizationPlans,
    onOpenIntentionPopup,
    onOpenFocusModal,
    setIsAudioPlaying,
    openTaskContextPopup,
    metaRules,
    coreSkills,
    openTodaysDietPopup,
    getUpskillNodeType,
    getDeepWorkNodeType,
    skillDomains,
    microSkillMap,
    currentSlot,
    activityDurations,
    weightLogs,
  } = useAuth();
  const { toast } = useToast();
  const [remainingTime, setRemainingTime] = useState('');
  const [isScheduleLoaded, setIsScheduleLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // State for Modals
  const [isTodaysWorkoutModalOpen, setIsTodaysWorkoutModalOpen] = useState(false);
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [isLeadGenModalOpen, setIsLeadGenModalOpen] = useState(false);
  const [isDietPlanModalOpen, setIsDietPlanModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
  const [isKanbanModalOpen, setIsKanbanModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<{ slotName: string; activity: Activity } | null>(null);
  const [workoutActivityToLog, setWorkoutActivityToLog] = useState<Activity | null>(null);
  
  const [interruptModalState, setInterruptModalState] = useState<{isOpen: boolean, slotName: string | null}>({ isOpen: false, slotName: null });
  const [interruptDetails, setInterruptDetails] = useState('');
  const [interruptDuration, setInterruptDuration] = useState('');
  const [applyInterruptToFutureSlots, setApplyInterruptToFutureSlots] = useState(false);


  const [essentialsModalState, setEssentialsModalState] = useState<{isOpen: boolean, slotName: string | null, activity: Activity | null}>({ isOpen: false, slotName: null, activity: null });
  const [essentialDetails, setEssentialDetails] = useState('');
  const [essentialDuration, setEssentialDuration] = useState('');
  
  // Meal selection modal
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [currentSlotForMeal, setCurrentSlotForMeal] = useState<string | null>(null);


  // State for Modal content
  const [todaysExercises, setTodaysExercises] = useState<WorkoutExercise[]>([]);
  const [todaysMuscleGroups, setTodaysMuscleGroups] = useState<string[]>([]);
  
  // State for productivity stats
  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);
  
  const selectedDateKey = useMemo(() => selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '', [selectedDate]);
  
  // New state to track if carry-over has run
  const [carryOverComplete, setCarryOverComplete] = useState(false);
  
  useEffect(() => {
    // Correctly initialize date on client-side to prevent hydration mismatch
    setSelectedDate(new Date());
  }, []);

  useEffect(() => {
    if (selectedDate) {
      setOneYearAgo(subYears(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()), 1));
    }
  }, [selectedDate]);

  // Effect to set schedule as loaded once user is available
  useEffect(() => {
    if (currentUser?.username) {
        setIsScheduleLoaded(true);
    }
  }, [currentUser]);

  useEffect(() => {
    const timerInterval = setInterval(() => {
        const now = new Date();
        const slotEndHour = slotEndHours[currentSlot];
        const slotEndTime = new Date(); slotEndTime.setHours(slotEndHour, 0, 0, 0);
        const diff = slotEndTime.getTime() - now.getTime();
        if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            setRemainingTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        } else { setRemainingTime('00:00:00'); }
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [currentSlot]);

  // Carry forward tasks logic
  useEffect(() => {
    if (!currentUser || !isScheduleLoaded || !selectedDate || carryOverComplete) return;

    const settingsKey = `lifeos_settings_${currentUser.username}`;
    const storedSettings = localStorage.getItem(settingsKey);
    const settings = storedSettings ? JSON.parse(storedSettings) : { carryForward: false, carryForwardEssentials: false, carryForwardNutrition: false };
    
    const today = selectedDate;
    const todayDateKey = format(today, 'yyyy-MM-dd');
    const yesterday = addDays(today, -1);
    const yesterdayKey = format(yesterday, 'yyyy-MM-dd');
    
    const todaysActivities = schedule[todayDateKey];
    const hasTodaysActivities = todaysActivities && Object.keys(todaysActivities).length > 0 && Object.values(todaysActivities).some(slot => Array.isArray(slot) && slot.length > 0);
    if (hasTodaysActivities) {
        setCarryOverComplete(true);
        return;
    }

    const yesterdaysSchedule = schedule[yesterdayKey];
    if (!yesterdaysSchedule || Object.keys(yesterdaysSchedule).length === 0) {
        setCarryOverComplete(true);
        return;
    }

    const newTodaySchedule: DailySchedule = {};
    let carriedOver = false;

    Object.entries(yesterdaysSchedule).forEach(([slotName, activities]) => {
        if (Array.isArray(activities) && activities.length > 0) {
            const activitiesToCarry = (activities as Activity[]).filter(activity => {
                if(activity.completed) return false;
                if(activity.type === 'essentials') return settings.carryForwardEssentials;
                if(activity.type === 'nutrition') return settings.carryForwardNutrition;
                return settings.carryForward;
            });

            if (activitiesToCarry.length > 0) {
                if (!newTodaySchedule[slotName]) newTodaySchedule[slotName] = [];
                (newTodaySchedule[slotName] as Activity[]).push(
                    ...activitiesToCarry.map(activity => ({
                        ...activity,
                        id: `${activity.type}-${Date.now()}-${Math.random()}`,
                        completed: false,
                    }))
                );
                carriedOver = true;
            }
        }
    });

    if (carriedOver) {
        setSchedule(prev => ({ ...prev, [todayDateKey]: { ...(prev[todayDateKey] || {}), ...newTodaySchedule } }));
        toast({ title: "Tasks Carried Over", description: "Yesterday's incomplete tasks have been moved to today." });
    }
    setCarryOverComplete(true); 
  }, [currentUser, isScheduleLoaded, schedule, setSchedule, toast, selectedDate, carryOverComplete]);
  
    const handleAddActivity = (slotName: string, type: ActivityType) => {
    if (!currentUser?.username || !selectedDateKey) return;
    
    if (type === 'interrupt') {
        setInterruptDetails('');
        setInterruptDuration('');
        setApplyInterruptToFutureSlots(false);
        setInterruptModalState({ isOpen: true, slotName });
        return;
    }
    
    if (type === 'essentials') {
        setEssentialDetails('');
        setEssentialDuration('');
        setEssentialsModalState({ isOpen: true, slotName, activity: null });
        return;
    }
    
    if (type === 'nutrition') {
        setCurrentSlotForMeal(slotName);
        setIsMealModalOpen(true);
        return;
    }

    const SLOT_CAPACITY_MINUTES = 240;
    
    const activitiesInSlot = schedule[selectedDateKey]?.[slotName] || [];
    const currentSlotDuration = (Array.isArray(activitiesInSlot) ? activitiesInSlot : []).reduce((sum, act) => sum + (act.duration || 0), 0);

    let details = '';
    let newActivityDuration = 0;

    switch (type) {
      case 'workout': 
        if (selectedDate) {
            const { description } = getExercisesForDay(selectedDate, workoutMode, workoutPlans, exerciseDefinitions);
            details = description.split(' for ')[1] || "Workout";
        }
        newActivityDuration = 90;
        break;
      case 'upskill': details = 'Learning Session'; newActivityDuration = 120; break;
      case 'deepwork': details = 'Deep Work Session'; newActivityDuration = 120; break;
      case 'planning': details = 'Planning Session'; newActivityDuration = 30; break;
      case 'tracking': details = 'Tracking Session'; newActivityDuration = 30; break;
      case 'branding': details = 'Branding Session'; newActivityDuration = 120; break;
      case 'lead-generation': details = 'Lead Generation Session'; newActivityDuration = 45; break;
    }
    
    if (currentSlotDuration + newActivityDuration > SLOT_CAPACITY_MINUTES) {
        toast({ title: "Slot Full", description: `This activity would exceed the 4-hour slot limit.`, variant: "destructive" });
        return;
    }
    
    const newActivity: Activity = { 
      id: `${type}-${Date.now()}-${Math.random()}`, 
      type, 
      details, 
      completed: false,
      taskIds: [],
      slot: slotName,
    };
    
    setSchedule(prev => ({ ...prev, [selectedDateKey]: { ...(prev[selectedDateKey] || {}), [slotName]: [...(Array.isArray(prev[selectedDateKey]?.[slotName]) ? prev[selectedDateKey]?.[slotName] as Activity[] : []), newActivity] } }));
  };

  const handleSaveInterrupt = () => {
    const { slotName } = interruptModalState;
    if (!slotName || !interruptDetails.trim()) {
        toast({ title: 'Invalid Input', description: 'Please provide a description.', variant: 'destructive' });
        return;
    }
    
    let durationMinutes = parseInt(interruptDuration, 10);
    if (applyInterruptToFutureSlots) {
        durationMinutes = 240;
    } else if (isNaN(durationMinutes) || durationMinutes <= 0) {
        toast({ title: 'Invalid Duration', description: 'Please enter a valid number of minutes.', variant: 'destructive' });
        return;
    }

    setSchedule(prev => {
        const newDaySchedule = { ...(prev[selectedDateKey] || {}) };

        if (applyInterruptToFutureSlots) {
            const currentSlotIndex = Object.keys(slotEndHours).indexOf(slotName);
            const slotsToUpdate = Object.keys(slotEndHours).slice(currentSlotIndex);
            
            slotsToUpdate.forEach(sName => {
                const newActivity: Activity = {
                    id: `interrupt-${Date.now()}-${Math.random()}`,
                    type: 'interrupt',
                    details: interruptDetails,
                    completed: true,
                    taskIds: [],
                    duration: durationMinutes,
                    slot: sName,
                };
                const currentActivities = Array.isArray(newDaySchedule[sName]) ? newDaySchedule[sName] as Activity[] : [];
                newDaySchedule[sName] = [...currentActivities, newActivity];
            });
            toast({ title: 'Interrupt Logged', description: `Interruption added to all future slots.` });
        } else {
            const newActivity: Activity = {
                id: `interrupt-${Date.now()}`,
                type: 'interrupt',
                details: interruptDetails,
                completed: true,
                taskIds: [],
                duration: durationMinutes,
                slot: slotName,
            };
            const currentActivities = Array.isArray(newDaySchedule[slotName]) ? newDaySchedule[slotName] as Activity[] : [];
            newDaySchedule[slotName] = [...currentActivities, newActivity];
            toast({ title: 'Interrupt Logged', description: 'The interruption has been added to your agenda.' });
        }

        return { ...prev, [selectedDateKey]: newDaySchedule };
    });

    setInterruptDetails('');
    setInterruptDuration('');
    setApplyInterruptToFutureSlots(false);
    setInterruptModalState({ isOpen: false, slotName: null });
  };
  
  const handleSaveEssential = () => {
    const { slotName, activity } = essentialsModalState;
    if (!slotName || !essentialDetails.trim()) {
        toast({ title: 'Invalid Input', description: 'Please provide a description.', variant: 'destructive' });
        return;
    }
    const durationMinutes = parseInt(essentialDuration, 10) || 0;
    
    if (activity) { // Editing existing
        setSchedule(prev => {
            const newSchedule = { ...prev };
            if (newSchedule[selectedDateKey]) {
                const daySchedule = { ...newSchedule[selectedDateKey] };
                if (Array.isArray(daySchedule[slotName])) {
                    (daySchedule[slotName] as Activity[]) = (daySchedule[slotName] as Activity[]).map(act => 
                        act.id === activity.id 
                            ? { ...act, details: essentialDetails, duration: durationMinutes }
                            : act
                    );
                    newSchedule[selectedDateKey] = daySchedule;
                }
            }
            return newSchedule;
        });
        toast({ title: 'Essential Task Updated', description: 'The task has been updated.' });

    } else { // Creating new
        const newActivity: Activity = {
            id: `essentials-${Date.now()}`,
            type: 'essentials',
            details: essentialDetails,
            completed: false,
            taskIds: [],
            duration: durationMinutes,
            slot: slotName,
        };

        setSchedule(prev => ({
            ...prev,
            [selectedDateKey]: {
                ...(prev[selectedDateKey] || {}),
                [slotName]: [...(Array.isArray(prev[selectedDateKey]?.[slotName]) ? prev[selectedDateKey]?.[slotName] as Activity[] : []), newActivity],
            },
        }));
        toast({ title: 'Essential Task Added', description: 'The task has been added to your agenda.' });
    }

    setEssentialDetails('');
    setEssentialDuration('');
    setEssentialsModalState({ isOpen: false, slotName: null, activity: null });
  };

  const handleSelectMeal = (mealType: 'meal1' | 'meal2' | 'meal3' | 'supplements') => {
    if (!currentSlotForMeal) return;

    const dayName = selectedDate ? format(selectedDate, 'EEEE') : '';
    const dayPlan = dietPlan.find(p => p.day === dayName);
    
    let mealDetails = `Nutrition: ${mealType.replace('meal', 'Meal ')}`;
    if (dayPlan) {
      const mealItems = dayPlan[mealType];
      if (Array.isArray(mealItems) && mealItems.length > 0) {
        mealDetails = mealItems.map(item => `${item.quantity} ${item.content}`).join(', ');
      } else if (typeof mealItems === 'string') {
        mealDetails = mealItems; // Legacy support
      }
    }

    const newActivity: Activity = {
      id: `nutrition-${Date.now()}-${Math.random()}`,
      type: 'nutrition',
      details: mealDetails,
      completed: false,
      taskIds: [mealType], // Use taskIds to store which meal it is
      slot: currentSlotForMeal,
    };

    setSchedule(prev => {
      const daySchedule = prev[selectedDateKey] || {};
      const slotActivities = Array.isArray(daySchedule[currentSlotForMeal!]) ? daySchedule[currentSlotForMeal!] as Activity[] : [];
      return {
        ...prev,
        [selectedDateKey]: {
          ...daySchedule,
          [currentSlotForMeal!]: [...slotActivities, newActivity],
        }
      }
    });

    setIsMealModalOpen(false);
    setCurrentSlotForMeal(null);
  };


  const handleRemoveActivity = (slotName: string, activityId: string) => {
    if (!selectedDateKey) return;
    setSchedule(prev => {
      const newTodaySchedule = { ...(prev[selectedDateKey] || {}) };
      const activities = Array.isArray(newTodaySchedule[slotName]) ? newTodaySchedule[slotName] as Activity[] : [];
      const updatedActivities = activities.filter(act => act.id !== activityId);
      if (updatedActivities.length > 0) { newTodaySchedule[slotName] = updatedActivities; } else { delete newTodaySchedule[slotName]; }
      return { ...prev, [selectedDateKey]: newTodaySchedule };
    });
  };

  const getTodaysWorkout = () => {
    if(!selectedDate) return { exercises: [], description: ""};
    const { exercises, description } = getExercisesForDay(selectedDate, workoutMode, workoutPlans, exerciseDefinitions);
    const muscleGroups = Array.from(new Set(exercises.map(ex => ex.category)));
    return { exercises, muscleGroups };
  };

  const handleStartWorkoutLog = (activity: Activity) => {
    if(!selectedDate) return;
    const { exercises, muscleGroups } = getExercisesForDay(selectedDate, workoutMode, workoutPlans, exerciseDefinitions);
    setTodaysExercises(exercises);
    setTodaysMuscleGroups(muscleGroups);
    setWorkoutActivityToLog(activity);
    setIsTodaysWorkoutModalOpen(true);
  };
  
  const handleStartLeadGenLog = (activity: Activity) => {
    setWorkoutActivityToLog(activity); // Reusing state for simplicity
    setIsLeadGenModalOpen(true);
  };

  const handleActivityClick = (slotName: string, activity: Activity, event: React.MouseEvent) => {
    if (!activity || activity.completed || !selectedDate) return;
    if (activity.type === 'workout') {
      const { exercises, muscleGroups } = getExercisesForDay(selectedDate, workoutMode, workoutPlans, exerciseDefinitions);
      setTodaysExercises(exercises);
      setTodaysMuscleGroups(muscleGroups);
      setWorkoutActivityToLog(activity);
      setIsTodaysWorkoutModalOpen(true);
    } else if (['upskill', 'deepwork', 'branding'].includes(activity.type)) {
      const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
      const mainDefId = activity.taskIds?.[0]?.split('-')[0];
      const mainDef = mainDefId ? allDefs.find(d => d.id === mainDefId) : null;
      
      let nodeType = '';
      if (mainDef) {
        if(activity.type === 'upskill') nodeType = getUpskillNodeType(mainDef);
        if(activity.type === 'deepwork') nodeType = getDeepWorkNodeType(mainDef);
      }
      
      const isParentNode = ['Intention', 'Curiosity', 'Objective'].includes(nodeType);
      
      if (isParentNode && activity.taskIds && activity.taskIds.length > 0) {
        onOpenFocusModal(activity);
      } else {
        setEditingActivity({ slotName, activity });
        setIsLearningModalOpen(true);
      }
    } else if (activity.type === 'lead-generation') {
      handleStartLeadGenLog(activity);
    } else if (activity.type === 'essentials') {
        setEssentialDetails(activity.details);
        setEssentialDuration(activity.duration ? String(activity.duration) : '');
        setEssentialsModalState({ isOpen: true, slotName, activity });
    } else if (activity.type === 'nutrition') {
      openTodaysDietPopup(event);
    }
  };

  const handleSaveTaskSelection = (finalSelectedDefIds: string[]) => {
    if (!editingActivity) return;
    const { slotName, activity } = editingActivity;
    const pageType = activity.type as 'upskill' | 'deepwork' | 'branding';
    
    let logsUpdater: React.Dispatch<React.SetStateAction<DatedWorkout[]>>;
    let definitionSource: ExerciseDefinition[];
    let logSource: DatedWorkout[];

    if (pageType === 'upskill') {
      logsUpdater = setAllUpskillLogs;
      definitionSource = upskillDefinitions;
      logSource = allUpskillLogs;
    } else if (pageType === 'deepwork') {
      logsUpdater = setAllDeepWorkLogs;
      definitionSource = deepWorkDefinitions;
      logSource = allDeepWorkLogs;
    } else { // branding
      logsUpdater = setAllBrandingLogs;
      definitionSource = deepWorkDefinitions.filter(def => Array.isArray(def.focusAreaIds));
      logSource = brandingLogs;
    }
    
    const logForDay = logSource.find(log => log.date === selectedDateKey);
    const existingDefIdsForDay = new Set(logForDay?.exercises.map(ex => ex.definitionId) || []);
    const defIdsToCreate = finalSelectedDefIds.filter(id => !existingDefIdsForDay.has(id));

    const newExercises: WorkoutExercise[] = defIdsToCreate.map((defId) => {
      const def = definitionSource.find(d => d.id === defId)!;
      return {
        id: `${def.id}-${Date.now()}-${Math.random()}`,
        definitionId: def.id,
        name: def.name,
        category: def.category,
        loggedSets: [],
        targetSets: 1,
        targetReps: pageType === 'branding' ? '4 stages' : '25',
      };
    });

    const finalExercisesForDay = [...(logForDay?.exercises || []), ...newExercises];
    const updatedLogForDay: DatedWorkout = { id: selectedDateKey, date: selectedDateKey, exercises: finalExercisesForDay };
    
    logsUpdater(prevLogs => {
      const logIndex = prevLogs.findIndex(log => log.date === selectedDateKey);
      if (logIndex > -1) {
        const newLogs = [...prevLogs];
        newLogs[logIndex] = updatedLogForDay;
        return newLogs;
      }
      return [...prevLogs, updatedLogForDay];
    });

    const finalInstanceIds = updatedLogForDay.exercises
      .filter(ex => finalSelectedDefIds.includes(ex.definitionId))
      .map(t => t.id);

    const newDetails = updatedLogForDay.exercises
      .filter(ex => finalInstanceIds.includes(ex.id))
      .map(t => t.name).join(', ') || (pageType === 'upskill' ? 'Learning Session' : pageType === 'deepwork' ? 'Deep Work Session' : 'Branding Session');
    
    setSchedule(prev => {
      const newSchedule = { ...prev };
      const daySchedule = { ...(newSchedule[selectedDateKey] || {}) };
      const activitiesInSlot = (Array.isArray(daySchedule[slotName]) ? daySchedule[slotName] as Activity[] : []).map(act =>
        act.id === activity.id ? { ...act, taskIds: finalInstanceIds, details: newDetails } : act
      );
      daySchedule[slotName] = activitiesInSlot;
      newSchedule[selectedDateKey] = daySchedule;
      return newSchedule;
    });

    setEditingActivity(null);
  };
  
  const selectedDaySchedule = schedule[selectedDateKey] || {};

  const getLoggedMinutes = useCallback((logs: DatedWorkout[], dateKey: string, taskType: 'deepwork' | 'upskill') => {
    const dailyLog = logs.find(log => log.date === dateKey);
    if (!dailyLog) return 0;
    const durationField = taskType === 'deepwork' ? 'weight' : 'reps';
    return dailyLog.exercises.reduce((total, ex) => total + ex.loggedSets.reduce((sum, set) => sum + (set[durationField] || 0), 0), 0);
  }, []);

  const productivityStats = useMemo(() => {
    if(!selectedDate) return {
      todayUpskillHours: 0,
      upskillChange: 0,
      todayDeepWorkHours: 0,
      deepWorkChange: 0,
      totalProductiveHours: 0,
      avgProductiveHoursChange: 0,
      learningStats: {},
    };
    
    const yesterday = format(subDays(selectedDate, 1), 'yyyy-MM-dd');

    const todayUpskillMinutes = getLoggedMinutes(allUpskillLogs, selectedDateKey, 'upskill');
    const yesterdayUpskillMinutes = getLoggedMinutes(allUpskillLogs, yesterday, 'upskill');

    const todayDeepWorkMinutes = getLoggedMinutes(allDeepWorkLogs, selectedDateKey, 'deepwork');
    const yesterdayDeepWorkMinutes = getLoggedMinutes(allDeepWorkLogs, yesterday, 'deepwork');

    const calculateChange = (todayVal: number, yesterdayVal: number) => {
      if (yesterdayVal === 0) return todayVal > 0 ? Infinity : 0;
      return ((todayVal - yesterdayVal) / yesterdayVal) * 100;
    };

    const totalTodayMinutes = todayUpskillMinutes + todayDeepWorkMinutes;
    const totalYesterdayMinutes = yesterdayUpskillMinutes + yesterdayDeepWorkMinutes;
    
    const getDescendantsRecursive = (startNodeId: string, definitions: ExerciseDefinition[], linkKey: 'linkedDeepWorkIds' | 'linkedUpskillIds'): ExerciseDefinition[] => {
        const visited = new Set<string>();
        const queue: string[] = [startNodeId];
        let leafNodes: ExerciseDefinition[] = [];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            const node = definitions.find(d => d.id === currentId);
            if (!node) continue;

            const children = node[linkKey] || [];
            if (children.length === 0) { // It's a leaf node
                leafNodes.push(node);
            } else {
                children.forEach(childId => {
                    if (!visited.has(childId)) {
                        queue.push(childId);
                    }
                });
            }
        }
        return leafNodes;
    };
  
    const learningStats: Record<string, { logged: number, estimated: number }> = {};
    const specializations = coreSkills.filter(cs => cs.type === 'Specialization');

    specializations.forEach(spec => {
        let totalLoggedMinutes = 0;
        let totalEstimatedMinutes = 0;
        const microSkillNamesInSpec = new Set<string>();
        
        spec.skillAreas.forEach(area => {
            area.microSkills.forEach(ms => microSkillNamesInSpec.add(ms.name));
        });

        const allUpskillDefsForSpec = upskillDefinitions.filter(def => microSkillNamesInSpec.has(def.category));
        const allDeepWorkDefsForSpec = deepWorkDefinitions.filter(def => microSkillNamesInSpec.has(def.category));

        const allUpskillTaskIds = new Set<string>();
        allUpskillDefsForSpec.forEach(def => {
            getDescendantsRecursive(def.id, upskillDefinitions, 'linkedUpskillIds').forEach(d => allUpskillTaskIds.add(d.id));
        });

        const allDeepWorkTaskIds = new Set<string>();
        allDeepWorkDefsForSpec.forEach(def => {
             getDescendantsRecursive(def.id, deepWorkDefinitions, 'linkedDeepWorkIds').forEach(d => allDeepWorkTaskIds.add(d.id));
        });

        allUpskillLogs.forEach(log => {
            log.exercises.forEach(ex => {
                if (allUpskillTaskIds.has(ex.definitionId)) {
                    totalLoggedMinutes += ex.loggedSets.reduce((sum, set) => sum + (set.reps || 0), 0);
                }
            });
        });

        allDeepWorkLogs.forEach(log => {
            log.exercises.forEach(ex => {
                if (allDeepWorkTaskIds.has(ex.definitionId)) {
                    totalLoggedMinutes += ex.loggedSets.reduce((sum, set) => sum + (set.weight || 0), 0);
                }
            });
        });
        
        const allDefsForSpec = [...allUpskillDefsForSpec, ...allDeepWorkDefsForSpec];
        let totalEstForLeaves = 0;
        const leafNodes = new Set<string>();
        
        const allTaskIds = new Set([...allUpskillTaskIds, ...allDeepWorkTaskIds]);
        allTaskIds.forEach(id => {
            const def = [...upskillDefinitions, ...deepWorkDefinitions].find(d => d.id === id);
            if(def) totalEstForLeaves += def.estimatedDuration || 0;
        });


        if (totalLoggedMinutes > 0 || totalEstForLeaves > 0) {
            learningStats[spec.name] = { logged: totalLoggedMinutes / 60, estimated: totalEstForLeaves / 60 };
        }
    });


    return {
      todayUpskillHours: todayUpskillMinutes / 60,
      upskillChange: calculateChange(todayUpskillMinutes, yesterdayUpskillMinutes),
      todayDeepWorkHours: todayDeepWorkMinutes / 60,
      deepWorkChange: calculateChange(todayDeepWorkMinutes, yesterdayDeepWorkMinutes),
      totalProductiveHours: totalTodayMinutes / 60,
      avgProductiveHoursChange: calculateChange(totalTodayMinutes, totalYesterdayMinutes),
      learningStats,
    };
  }, [allUpskillLogs, allDeepWorkLogs, getLoggedMinutes, coreSkills, upskillDefinitions, deepWorkDefinitions, selectedDate, selectedDateKey]);
  
  const upcomingReleases = useMemo(() => {
    const allReleases: { topic: string, release: Release, type: 'product' | 'service' }[] = [];
    const today = startOfToday();

    const processPlan = (plan: any, topicName: string, type: 'product' | 'service') => {
      if (plan.releases) {
        plan.releases.forEach((release: Release) => {
          try {
            const launchDate = parseISO(release.launchDate);
            if (isAfter(launchDate, today) || format(launchDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
              allReleases.push({
                topic: topicName,
                release: { ...release, daysRemaining: differenceInDays(launchDate, today) },
                type,
              });
            }
          } catch (e) {
            // Invalid date format, skip this release
          }
        });
      }
    };

    if (productizationPlans) {
      Object.entries(productizationPlans).forEach(([projectId, plan]) => {
        const project = projects.find(p => p.id === projectId);
        processPlan(plan, project?.name || projectId, 'product');
      });
    }

    if (offerizationPlans) {
      Object.entries(offerizationPlans).forEach(([specId, plan]) => {
        const specialization = coreSkills.find(s => s.id === specId);
        processPlan(plan, specialization?.name || specId, 'service');
      });
    }

    return allReleases.sort((a, b) => new Date(a.release.launchDate).getTime() - new Date(b.release.launchDate).getTime());
  }, [productizationPlans, offerizationPlans, projects, coreSkills]);

  const brandingStatus = useMemo(() => {
    const todayLog = brandingLogs.find(log => log.date === selectedDateKey);
    const todaysBrandingTasks = schedule[selectedDateKey]?.branding || [];
    
    const inProgressItems = (todaysBrandingTasks || [])
        .filter(act => !act.completed)
        .map(act => {
            const task = todayLog?.exercises.find(ex => ex.id === act.taskIds?.[0]);
            if (!task) return null;
            
            const progress = task.loggedSets.length;
            const stages = ['Create', 'Optimize', 'Review', 'Final Review'];
            
            return {
                taskName: task.name,
                stage: stages[progress] || 'Starting',
                progress: `${progress}/4`
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

    const isFullyShared = (task: ExerciseDefinition) => 
        task.sharingStatus && 
        task.sharingStatus.twitter && 
        task.sharingStatus.linkedin && 
        task.sharingStatus.devto;

    const allBundles = deepWorkDefinitions.filter(def => Array.isArray(def.focusAreaIds));

    const publishedItems = allBundles.filter(isFullyShared).map(bundle => ({
        taskName: bundle.name,
        stage: 'Published',
        sharingStatus: bundle.sharingStatus
    }));

    const readyForBrandingItems = deepWorkDefinitions.filter(def => 
        def.isReadyForBranding && !def.focusAreaIds
    );

    let message = null;
    let subMessage = null;

    if (inProgressItems.length === 0 && publishedItems.length === 0) {
        if (readyForBrandingItems.length > 0) {
            message = `${readyForBrandingItems.length} focus area(s) ready for branding.`;
            subMessage = "Go to the Personal Branding page to create a content bundle.";
        } else {
            message = 'No active branding tasks.';
            subMessage = 'Mark a Deep Work item as "Ready for Branding" to begin.';
        }
    }
    
    return {
        items: inProgressItems,
        publishedItems: publishedItems,
        readyForBrandingCount: readyForBrandingItems.length,
        message,
        subMessage
    };
}, [brandingLogs, schedule, selectedDateKey, deepWorkDefinitions]);
  
  const timeAllocationData = useMemo(() => {
    const dailyActivities = schedule[selectedDateKey] ? Object.values(schedule[selectedDateKey]).flat() : [];
    const totals: Record<string, { time: number; activities: { name: string; duration: number }[] }> = {};
    const activityNameMap: Record<ActivityType, string> = {
        deepwork: 'Deep Work',
        upskill: 'Learning',
        workout: 'Workout',
        branding: 'Branding',
        essentials: 'Essentials',
        planning: 'Planning',
        tracking: 'Tracking',
        'lead-generation': 'Lead Gen',
        interrupt: 'Interrupts',
        nutrition: 'Nutrition',
    };

    dailyActivities.forEach((activity) => {
        if (activity && typeof activity === 'object' && 'type' in activity && activity.completed) {
            const mappedName = activityNameMap[activity.type];
            if (mappedName) {
                if (!totals[mappedName]) {
                    totals[mappedName] = { time: 0, activities: [] };
                }
                const duration = parseDurationToMinutes(activityDurations[activity.id]);
                totals[mappedName].time += duration;
                totals[mappedName].activities.push({ name: activity.details, duration });
            }
        }
    });

    return Object.entries(totals).map(([name, data]) => ({ name, time: data.time, activities: data.activities }));
  }, [schedule, selectedDateKey, activityDurations]);
  
  const dashboardStats = useMemo(() => {
    const {
      todayDeepWorkHours,
      deepWorkChange,
      todayUpskillHours,
      upskillChange,
      totalProductiveHours,
      avgProductiveHoursChange,
      learningStats
    } = productivityStats;
  
    const todaysActivities = schedule[selectedDateKey] || {};
    const hasPlannedOrCompleted = Object.values(todaysActivities).flat().length > 0;
    const allCompleted = hasPlannedOrCompleted && Object.values(todaysActivities).flat().every(a => a.completed);
  
    return {
      latestConsistency: 0, 
      consistencyChange: 0,
      todayDeepWorkHours,
      deepWorkChange,
      todayUpskillHours,
      upskillChange,
      totalProductiveHours,
      avgProductiveHoursChange,
      direction: allCompleted,
      overallNextMilestone: null,
      upcomingReleases: upcomingReleases,
      learningStats: learningStats,
      brandingStatus,
    };
  }, [productivityStats, schedule, selectedDateKey, upcomingReleases, brandingStatus]);

  const handleLogWeight = (weight: number, date: Date) => {
    if (!currentUser || isNaN(weight) || weight <= 0) {
      toast({ title: "Invalid Input", description: "Please enter a valid weight.", variant: "destructive" });
      return;
    }
    const year = getISOWeekYear(date);
    const week = getISOWeek(date).toString().padStart(2, '0');
    const weekKey = `${year}-W${week}`;

    setWeightLogs(prevLogs => {
        const logIndex = prevLogs.findIndex(log => log.date === weekKey);
        const newLog: WeightLog = { date: weekKey, weight: weight };
        
        if (logIndex > -1) {
            const updatedLogs = [...prevLogs];
            updatedLogs[logIndex] = newLog;
            return updatedLogs;
        } else {
            return [...prevLogs, newLog].sort((a,b) => a.date.localeCompare(b.date));
        }
    });

    toast({ title: "Weight Logged", description: `Weight for the week of ${format(date, 'PPP')} has been saved as ${weight} kg/lb.` });
  };


  if (!selectedDate) return null;

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Card className="max-w-5xl mx-auto shadow-lg bg-card/60 border-border/20 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between text-center py-4">
              <div className="flex-grow">
                <p className="text-sm text-muted-foreground">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
              </div>
              <Popover>
                  <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-[150px] justify-start text-left font-normal h-9",!selectedDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "MMM d") : <span>Pick a date</span>}
                  </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
                  </PopoverContent>
              </Popover>
          </CardHeader>
          <CardContent>
            <DashboardStats stats={dashboardStats} />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
              <div className="space-y-6 lg:col-span-3">
                  <ProductivitySnapshot 
                    stats={dashboardStats} 
                    timeAllocationData={timeAllocationData}
                    onOpenStatsModal={() => setIsStatsModalOpen(true)} 
                    onOpenKanbanModal={() => setIsKanbanModalOpen(true)}
                    todaysSchedule={schedule[selectedDateKey] || {}}
                    activityDurations={activityDurations}
                    showTimeAllocation={isAgendaDocked}
                />
              </div>
               <div className="lg:col-span-2 space-y-6">
                {isAgendaDocked ? (
                    <TodaysScheduleCard
                        schedule={schedule}
                        date={selectedDate}
                        activityDurations={activityDurations}
                        isAgendaDocked={isAgendaDocked}
                        onToggleDock={() => setIsAgendaDocked(prev => !prev)}
                        onLogLearning={handleLogLearning}
                        onStartWorkoutLog={handleStartWorkoutLog}
                        onStartLeadGenLog={handleStartLeadGenLog}
                        onToggleComplete={handleToggleComplete}
                        onOpenFocusModal={onOpenFocusModal}
                        onOpenTaskContext={openTaskContextPopup}
                        currentSlot={currentSlot}
                    />
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><PieChart /> Daily Time Allocation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TimeAllocationChart timeAllocationData={timeAllocationData} />
                        </CardContent>
                    </Card>
                )}
                <WeightGoalCard 
                  weightLogs={weightLogs}
                  goalWeight={goalWeight}
                  onLogWeight={handleLogWeight}
                  height={height}
                  dateOfBirth={dateOfBirth}
                  gender={gender}
                  onSetHeight={setHeight}
                  onSetDateOfBirth={setDateOfBirth}
                  onSetGender={setGender}
                  onSetGoalWeight={setGoalWeight}
                  dietPlan={dietPlan}
                  onEditDietClick={() => setIsDietPlanModalOpen(true)}
                  deepWorkDefinitions={deepWorkDefinitions}
                  upskillDefinitions={upskillDefinitions}
                  onOpenIntentionPopup={onOpenIntentionPopup}
                  metaRules={metaRules}
                  offerizationPlans={offerizationPlans}
                  productizationPlans={productizationPlans}
                  projects={projects}
                />
              </div>
            </div>
            <TimeSlots 
              schedule={selectedDaySchedule}
              currentSlot={currentSlot}
              remainingTime={remainingTime}
              onAddActivity={handleAddActivity}
              onRemoveActivity={handleRemoveActivity}
              onToggleComplete={handleToggleComplete}
              onActivityClick={handleActivityClick}
            />
          </CardContent>
        </Card>
        
        <ActivityHeatmap schedule={schedule} onDateSelect={(date) => setSelectedDate(parseISO(date))} />

        {currentUser && (
          <TodaysWorkoutModal
              isOpen={isTodaysWorkoutModalOpen}
              onOpenChange={setIsTodaysWorkoutModalOpen}
              activityToLog={workoutActivityToLog}
              todaysExercises={todaysExercises}
              muscleGroupsForDay={todaysMuscleGroups}
              onActivityComplete={handleToggleComplete}
          />
        )}

        {currentUser && (
            <TodaysLeadGenModal
                isOpen={isLeadGenModalOpen}
                onOpenChange={setIsLeadGenModalOpen}
                activityToLog={workoutActivityToLog}
                onActivityComplete={handleToggleComplete}
            />
        )}
        
        {currentUser && editingActivity && (
          <TodaysLearningModal
              isOpen={isLearningModalOpen}
              onOpenChange={(isOpen) => {
                  if (!isOpen) setEditingActivity(null);
                  setIsLearningModalOpen(isOpen);
              }}
              availableTasks={editingActivity.activity.type === 'upskill' ? allUpskillLogs.find(log => log.date === selectedDateKey)?.exercises || [] : editingActivity.activity.type === 'deepwork' ? allDeepWorkLogs.find(log => log.date === selectedDateKey)?.exercises || [] : brandingLogs.find(log => log.date === selectedDateKey)?.exercises || []}
              initialSelectedIds={editingActivity.activity.taskIds || []}
              onSave={handleSaveTaskSelection}
              pageType={editingActivity.activity.type as 'upskill' | 'deepwork' | 'branding'}
              deepWorkDefinitions={deepWorkDefinitions}
              upskillDefinitions={upskillDefinitions}
              setDeepWorkDefinitions={setDeepWorkDefinitions}
              projects={projects}
              offerizationPlans={offerizationPlans}
              productizationPlans={productizationPlans}
          />
        )}

        <DietPlanModal
          isOpen={isDietPlanModalOpen}
          onOpenChange={setIsDietPlanModalOpen}
        />

        <StatsOverviewModal
          isOpen={isStatsModalOpen}
          onOpenChange={setIsStatsModalOpen}
          allWorkoutLogs={allWorkoutLogs}
          allUpskillLogs={allUpskillLogs}
          allDeepWorkLogs={allDeepWorkLogs}
          weightLogs={weightLogs}
          goalWeight={goalWeight}
          consistencyData={[]}
          totalHoursData={[]}
          todayHoursData={[]}
        />

        <Dialog open={isMindMapModalOpen} onOpenChange={setIsMindMapModalOpen}>
            <DialogContent className="max-w-7xl h-[90vh] p-0">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Strategic Mind Map</DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                  <MindMapViewer />
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={isKanbanModalOpen} onOpenChange={setIsKanbanModalOpen}>
          <DialogContent className="max-w-7xl h-[80vh] flex flex-col p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Task Board</DialogTitle>
              <DialogDescription>A Kanban-style view of all your tasks for today.</DialogDescription>
            </DialogHeader>
            <div className="flex-grow min-h-0">
                <KanbanPageContent isModal={true} />
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={interruptModalState.isOpen} onOpenChange={(isOpen) => setInterruptModalState({ isOpen, slotName: null })}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log an Interruption</DialogTitle>
                    <DialogDescription>What pulled you away from your planned tasks?</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-1">
                        <Label htmlFor="interrupt-details">Description</Label>
                        <Textarea id="interrupt-details" value={interruptDetails} onChange={(e) => setInterruptDetails(e.target.value)} placeholder="e.g., Unexpected phone call, urgent email..." />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="interrupt-duration">Duration (minutes)</Label>
                        <Input 
                          id="interrupt-duration" 
                          type="number" 
                          value={applyInterruptToFutureSlots ? '240' : interruptDuration} 
                          onChange={(e) => setInterruptDuration(e.target.value)} 
                          placeholder="e.g., 30"
                          disabled={applyInterruptToFutureSlots}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="apply-all-slots" 
                            checked={applyInterruptToFutureSlots} 
                            onCheckedChange={(checked) => setApplyInterruptToFutureSlots(!!checked)}
                        />
                        <Label htmlFor="apply-all-slots" className="font-normal">Apply to all future slots for today (sets duration to 240 mins)</Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setInterruptModalState({ isOpen: false, slotName: null })}>Cancel</Button>
                    <Button onClick={handleSaveInterrupt}>Save Interrupt</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
         <Dialog open={essentialsModalState.isOpen} onOpenChange={(isOpen) => setEssentialsModalState({ isOpen: false, slotName: null, activity: null })}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{essentialsModalState.activity ? 'Edit' : 'Log a'} Daily Essential</DialogTitle>
                    <DialogDescription>Add a recurring or essential one-off task.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-1">
                        <Label htmlFor="essential-details">Description</Label>
                        <Textarea id="essential-details" value={essentialDetails} onChange={(e) => setEssentialDetails(e.target.value)} placeholder="e.g., Meditate, Journal..." />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="essential-duration">Est. Duration (minutes)</Label>
                        <Input id="essential-duration" type="number" value={essentialDuration} onChange={(e) => setEssentialDuration(e.target.value)} placeholder="e.g., 15" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setEssentialsModalState({ isOpen: false, slotName: null, activity: null })}>Cancel</Button>
                    <Button onClick={handleSaveEssential}>Save Task</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isMealModalOpen} onOpenChange={setIsMealModalOpen}>
            <DialogContent className="sm:max-w-xs">
                <DialogHeader>
                    <DialogTitle>Select Meal</DialogTitle>
                    <DialogDescription>Which meal are you logging?</DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-4">
                    <Button variant="outline" onClick={() => handleSelectMeal('meal1')}>Meal 1</Button>
                    <Button variant="outline" onClick={() => handleSelectMeal('meal2')}>Meal 2</Button>
                    <Button variant="outline" onClick={() => handleSelectMeal('meal3')}>Meal 3</Button>
                    <Button variant="outline" onClick={() => handleSelectMeal('supplements')}>Supplements</Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

export default function MyPlatePage() {
    return <AuthGuard><MyPlatePageContent/></AuthGuard>
}

      
    






