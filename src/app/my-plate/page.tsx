

"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { format, getDay, getISOWeek, getISOWeekYear, differenceInDays, addDays, parseISO, subDays, isAfter, startOfToday, isBefore, isSameDay, startOfWeek, max, min, isValid } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MindMapViewer } from '@/components/MindMapViewer';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';

import { TodaysWorkoutModal } from '@/components/TodaysWorkoutModal';
import { TodaysMindsetModal } from '@/components/TodaysMindsetModal';
import { TodaysLearningModal } from '@/components/TodaysLearningModal';
import { TodaysLeadGenModal } from '@/components/TodaysLeadGenModal';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { DietPlanModal } from '@/components/DietPlanModal';
import { DashboardStats } from '@/components/DashboardStats';
import { ProductivitySnapshot, TimeAllocationChart } from '@/components/ProductivitySnapshot';
import { TimeSlots } from '@/components/TimeSlots';
import { WeightGoalCard } from '@/components/WeightGoalCard';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from '@/lib/utils';
import { CalendarIcon, Brain as BrainIcon, MessageSquare, Workflow, Utensils, BarChart3, PieChart as PieChartIcon, Link as LinkIconLucide, Expand, LayoutDashboard, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { TodaysScheduleCard } from '@/components/TodaysScheduleCard';
import { FocusSessionModal } from '@/components/FocusSessionModal';
import { TaskContextModal } from '@/components/TaskContextModal';
import { Checkbox } from '@/components/ui/checkbox';
import { SmartLoggingPrompt } from '@/components/SmartLoggingPrompt';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


import type { AllWorkoutPlans, ExerciseDefinition, WorkoutExercise, FullSchedule, Activity as ActivityType, DatedWorkout, TopicGoal, WorkoutPlan, ExerciseCategory, WeightLog, Gender, UserDietPlan, DailySchedule, Activity, Release, PistonEntry, ResourceFolder, Interrupt, ProductizationPlan, Resource, MissedSlotReview, SlotName, RecurrenceRule, NodeType, AbandonmentLog, SkillAcquisitionPlan, HabitEquation } from '@/types/workout';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { KanbanPageContent } from '@/app/kanban/page';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TodaysDietCard } from '@/components/ui/TodaysDietCard';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TimesheetPageContent } from '@/app/timesheet/page';

const slotEndHours: Record<string, number> = {
  'Late Night': 4, 'Dawn': 8, 'Morning': 12, 'Afternoon': 16, 'Evening': 20, 'Night': 24,
};

const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

const activityColorMapping: Record<string, string> = {
    'Deep Work': 'hsl(var(--chart-1))',
    'Learning': 'hsl(var(--chart-2))',
    'Workout': 'hsl(var(--chart-3))',
    'Branding': 'hsl(var(--chart-4))',
    'Lead Gen': 'hsl(var(--chart-5))',
    'Essentials': 'hsl(173, 58%, 39%)',
    'Planning': 'hsl(197, 37%, 24%)',
    'Tracking': 'hsl(43, 74%, 66%)',
    'Interrupts': 'hsl(var(--destructive))',
    'Distractions': 'hsl(var(--destructive))',
    'Nutrition': 'hsl(340, 82%, 56%)',
    'Free Time': 'hsl(var(--muted))',
};

const parseDurationToMinutes = (durationStr: string | undefined): number => {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    
    let totalMinutes = 0;
    const trimmedStr = durationStr.trim();
    
    const hourMatch = trimmedStr.match(/(\d+(?:\.\d+)?)\s*h/);
    const minMatch = trimmedStr.match(/(\d+)\s*m/);

    if (hourMatch) {
        totalMinutes += parseFloat(hourMatch[1]) * 60;
    }
    if (minMatch) {
        totalMinutes += parseInt(minMatch[1], 10);
    }

    if (!hourMatch && !minMatch && /^\d+$/.test(trimmedStr.trim())) {
        totalMinutes += parseInt(trimmedStr.trim(), 10);
    }

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
    allMindProgrammingLogs,
    allLeadGenLogs,
    brandingLogs, setBrandingLogs,
    isAgendaDocked, setIsAgendaDocked,
    handleToggleComplete, handleLogLearning,
    workoutMode, workoutPlans, exerciseDefinitions,
    workoutPlanRotation,
    strengthTrainingMode,
    upskillDefinitions, setUpskillDefinitions,
    topicGoals, 
    deepWorkDefinitions, setDeepWorkDefinitions,
    leadGenDefinitions,
    projects,
    productizationPlans,
    offerizationPlans,
    onOpenIntentionPopup,
    handleStartFocusSession,
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
    weightLogs,
    logWorkoutSet,
    updateWorkoutSet,
    deleteWorkoutSet,
    removeExerciseFromWorkout,
    swapWorkoutExercise,
    resources,
    patterns,
    openRuleDetailPopup,
    getDescendantLeafNodes,
    settings,
    activeFocusSession,
    onOpenFocusModal,
    toggleRoutine,
    activeProjectIds,
    abandonmentLogs, 
    setAbandonmentLogs,
    skillAcquisitionPlans,
    pillarEquations,
  } = useAuth();
  const { toast } = useToast();
  const [remainingTime, setRemainingTime] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  
  // State for Modals
  const [isTodaysWorkoutModalOpen, setIsTodaysWorkoutModalOpen] = useState(false);
  const [isTodaysMindsetModalOpen, setIsTodaysMindsetModalOpen] = useState(false);
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [isLeadGenModalOpen, setIsLeadGenModalOpen] = useState(false);
  const [isDietPlanModalOpen, setIsDietPlanModalOpen] = useState(false);
  const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
  const [isKanbanModalOpen, setIsKanbanModalOpen] = useState(false);
  const [isTimeAllocationModalOpen, setIsTimeAllocationModalOpen] = useState(false);
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<{ slotName: string; activity: Activity } | null>(null);
  const [workoutActivityToLog, setWorkoutActivityToLog] = useState<Activity | null>(null);
  const [mindsetActivityToLog, setMindsetActivityToLog] = useState<Activity | null>(null);
  
  const [interruptModalState, setInterruptModalState] = useState<{isOpen: boolean, slotName: string | null, type: 'interrupt' | 'distraction' | null}>({ isOpen: false, slotName: null, type: null });
  const [interruptDetails, setInterruptDetails] = useState('');
  const [interruptDuration, setInterruptDuration] = useState('');
  const [applyInterruptToFutureSlots, setApplyInterruptToFutureSlots] = useState(false);


  const [essentialsModalState, setEssentialsModalState] = useState<{isOpen: boolean, slotName: string | null, activity: Activity | null}>({ isOpen: false, slotName: null, activity: null });
  const [essentialDetails, setEssentialDetails] = useState('');
  const [essentialDuration, setEssentialDuration] = useState('');
  const [essentialLinkedHabitId, setEssentialLinkedHabitId] = useState<string | null>(null);
  const [excuseModalState, setExcuseModalState] = useState<{ isOpen: boolean; planId: string | null; planName: string | null }>({ isOpen: false, planId: null, planName: null });
  const [newExcuse, setNewExcuse] = useState('');
  const [isLoggingNewExcuse, setIsLoggingNewExcuse] = useState(false);
  const [editingExcuseLogId, setEditingExcuseLogId] = useState<string | null>(null);
  const [editedHandlingStrategy, setEditedHandlingStrategy] = useState('');


  
  // Meal selection modal
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [currentSlotForMeal, setCurrentSlotForMeal] = useState<string | null>(null);

  const [currentTimetableWeek, setCurrentTimetableWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));


  // State for Modal content
  const [todaysExercises, setTodaysExercises] = useState<WorkoutExercise[]>([]);
  const [todaysMuscleGroups, setTodaysMuscleGroups] = useState<string[]>([]);
  
  // State for productivity stats
  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);
  
  const selectedDateKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  
  const habitResources = useMemo(() => {
    return resources.filter(r => r.type === 'habit');
  }, [resources]);

  useEffect(() => {
    if (selectedDate) {
      setOneYearAgo(subDays(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()), 1));
    }
  }, [selectedDate]);

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


  const calculateTotalEstimate = useCallback((def: ExerciseDefinition): number => {
    let total = 0;
    const visited = new Set<string>();
    const allDefsMap = new Map([...deepWorkDefinitions, ...upskillDefinitions].map(d => [d.id, d]));

    function recurse(currentDef: ExerciseDefinition) {
        if (!currentDef || visited.has(currentDef.id)) return;
        visited.add(currentDef.id);
  
        const deepWorkChildren = currentDef.linkedDeepWorkIds || [];
        const upskillChildren = currentDef.linkedUpskillIds || [];

        if (deepWorkChildren.length === 0 && upskillChildren.length === 0) {
            total += currentDef.estimatedDuration || 0;
        } else {
            deepWorkChildren.forEach(childId => {
                const childDef = allDefsMap.get(childId);
                if (childDef) recurse(childDef);
            });
            upskillChildren.forEach(childId => {
                const childDef = allDefsMap.get(childId);
                if (childDef) recurse(childDef);
            });
        }
    }
  
    recurse(def);
    return total;
  }, [deepWorkDefinitions, upskillDefinitions]);
  
  const activityDurations = useMemo(() => {
    const newDurations: Record<string, string> = {};
    if (!schedule) return newDurations;
  
    const allDefs = new Map([...deepWorkDefinitions, ...upskillDefinitions].map(def => [def.id, def]));
  
    for (const dateKey in schedule) {
      const daySchedule = schedule[dateKey];
      if (!daySchedule) continue;
  
      for (const slotName in daySchedule) {
        const activities = (daySchedule as any)[slotName] || [];
        if (!Array.isArray(activities)) continue;
  
        for (const activity of activities) {
          if (!activity || !activity.id) continue;
  
          let totalMinutes = 0;
          let suffix = '';
  
          if (activity.completed) {
            if (activity.type === 'upskill' || activity.type === 'deepwork' || activity.type === 'branding') {
              let definition: ExerciseDefinition | undefined;
              
              if (activity.taskIds && activity.taskIds.length > 0) {
                const mainLogInstanceId = activity.taskIds[0];
                let mainDefId: string | undefined;

                const upskillLog = allUpskillLogs.flatMap(l => l.exercises).find(ex => ex.id === mainLogInstanceId);
                if (upskillLog) mainDefId = upskillLog.definitionId;
                else {
                    const deepWorkLog = allDeepWorkLogs.flatMap(l => l.exercises).find(ex => ex.id === mainLogInstanceId);
                    if (deepWorkLog) mainDefId = deepWorkLog.definitionId;
                    else {
                         const brandingLog = brandingLogs.flatMap(l => l.exercises).find(ex => ex.id === mainLogInstanceId);
                         if(brandingLog) mainDefId = brandingLog.definitionId;
                    }
                }
                if (mainDefId) {
                  definition = allDefs.get(mainDefId);
                }
              }

              if (definition) {
                const leafNodes = getDescendantLeafNodes(definition.id, activity.type === 'upskill' ? 'upskill' : 'deepwork');
                
                if (leafNodes.length > 0) {
                    totalMinutes = leafNodes.reduce((sum, node) => {
                        if (node.last_logged_date === dateKey) {
                            return sum + (node.loggedDuration || 0);
                        }
                        return sum;
                    }, 0);
                } else {
                    if (definition.last_logged_date === dateKey) {
                        totalMinutes = definition.loggedDuration || 0;
                    }
                }
                suffix = ' logged';
              }
  
            } else if (activity.duration) {
              totalMinutes = activity.duration;
              suffix = ' logged';
            }
          } else {
            // For non-completed tasks, calculate estimated duration
            switch(activity.type) {
              case 'workout': 
                const { exercises: workoutExercises } = getExercisesForDay(parseISO(dateKey), workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling, allWorkoutLogs);
                totalMinutes = workoutExercises.length > 0 ? 90 : 0;
                break;
              case 'mindset': totalMinutes = 15; break;
              case 'upskill':
              case 'deepwork':
              case 'branding':
                if (activity.taskIds && activity.taskIds.length > 0) {
                  const mainLogInstanceId = activity.taskIds[0];
                  let mainTaskDefId: string | undefined;
                  const allLogs = [...allUpskillLogs, ...allDeepWorkLogs, ...brandingLogs];
                  mainTaskDefId = allLogs.flatMap(l => l.exercises).find(ex => ex.id === mainLogInstanceId)?.definitionId;

                  if (mainTaskDefId) {
                    const taskDef = allDefs.get(mainTaskDefId);
                    if (taskDef) {
                      totalMinutes = calculateTotalEstimate(taskDef);
                    } else {
                      totalMinutes = 120;
                    }
                  } else {
                     totalMinutes = 120;
                  }
                } else {
                  totalMinutes = 120;
                }
                break;
              case 'planning':
              case 'tracking':
              case 'essentials':
              case 'nutrition':
                 totalMinutes = activity.duration || 30; break;
              case 'lead-generation': totalMinutes = 45; break;
              case 'interrupt':
              case 'distraction':
                 totalMinutes = activity.duration || 0; break;
              default: totalMinutes = 0;
            }
          }
  
          if (totalMinutes > 0) {
            const h = Math.floor(totalMinutes / 60);
            const m = Math.round(totalMinutes % 60);
            newDurations[activity.id] = ((`${h > 0 ? `${h}h` : ''} ${m > 0 ? `${m}m` : ''}`).trim() || '0m') + suffix;
          }
        }
      }
    }
    return newDurations;
  }, [schedule, deepWorkDefinitions, upskillDefinitions, allUpskillLogs, allDeepWorkLogs, brandingLogs, calculateTotalEstimate, getDescendantLeafNodes, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling, allWorkoutLogs]);


  const slotDurations = useMemo(() => {
    const durations: Record<string, { logged: number; total: number }> = {};
    const daySchedule = schedule[selectedDateKey];
    if (!daySchedule) return durations;

    for (const slotName of slotOrder) {
        let loggedTime = 0;
        let totalTime = 0;

        const activities = (daySchedule[slotName as keyof DailySchedule] as Activity[]) || [];
        
        activities.forEach(activity => {
            const durationMinutes = parseDurationToMinutes(activityDurations[activity.id]);
            
            if (activity.completed) {
              loggedTime += durationMinutes;
            }
            totalTime += durationMinutes;
        });

        durations[slotName] = { logged: loggedTime, total: totalTime };
    }
    return durations;
  }, [schedule, selectedDateKey, activityDurations]);


    const handleAddActivity = (slotName: string, type: ActivityType, detailsOverride?: string) => {
        if (!currentUser?.username) return;

        if (type === 'interrupt' || type === 'distraction') {
            setInterruptDetails('');
            setInterruptDuration('');
            setApplyInterruptToFutureSlots(false);
            setInterruptModalState({ isOpen: true, slotName, type });
            return;
        }

        if (type === 'essentials') {
            setEssentialDetails('');
            setEssentialDuration('');
            setEssentialLinkedHabitId(null);
            setEssentialsModalState({ isOpen: true, slotName, activity: null });
            return;
        }

        if (type === 'nutrition') {
            setCurrentSlotForMeal(slotName);
            setIsMealModalOpen(true);
            return;
        }
        
        const SLOT_CAPACITY_MINUTES = 240;
        const currentSlotDuration = slotDurations[slotName]?.total || 0;

        let newActivityDuration = 0;
        let details = detailsOverride || '';
        let taskIds: string[] = [];
        let linkedEntityType: Activity['linkedEntityType'] = undefined;

        if ((type === 'upskill' || type === 'deepwork') && detailsOverride) {
            const sourceDefs = type === 'upskill' ? upskillDefinitions : deepWorkDefinitions;
            const coreSkill = coreSkills.find(cs => cs.name === detailsOverride && cs.type === 'Specialization');
            const microSkillName = coreSkill ? Array.from(microSkillMap.values()).find(ms => ms.coreSkillName === coreSkill.name)?.microSkillName : detailsOverride;

            const existingDef = sourceDefs.find(d => d.name === detailsOverride && d.category === microSkillName);

            if (existingDef) {
                taskIds = [`${existingDef.id}-${Date.now()}`];
            } else {
                const newDef: ExerciseDefinition = {
                    id: `def_${Date.now()}_${Math.random()}`,
                    name: detailsOverride,
                    category: microSkillName as ExerciseCategory,
                    ...(type === 'upskill' ? { linkedUpskillIds: [] } : { linkedDeepWorkIds: [] })
                };
    
                const setDefinitions = type === 'upskill' ? setUpskillDefinitions : setDeepWorkDefinitions;
                setDefinitions(prev => [...prev, newDef]);
                taskIds = [`${newDef.id}-${Date.now()}`];
            }
            linkedEntityType = 'specialization';
        }


        if (!details) {
          switch (type) {
              case 'workout': 
                const { description: workoutDescription } = getExercisesForDay(selectedDate, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling, allWorkoutLogs);
                details = workoutDescription;
                newActivityDuration = 90;
                break;
              case 'mindset': details = 'Mindset Session'; newActivityDuration = 15; break;
              case 'upskill': details = 'Learning Session'; newActivityDuration = 120; linkedEntityType = 'specialization'; break;
              case 'deepwork': details = 'Deep Work Session'; newActivityDuration = 120; linkedEntityType = 'specialization'; break;
              case 'planning': details = 'Planning Session'; newActivityDuration = 30; break;
              case 'tracking': details = 'Tracking Session'; newActivityDuration = 30; break;
              case 'branding': details = 'Branding Session'; newActivityDuration = 120; break;
              case 'lead-generation': details = 'Lead Generation Session'; newActivityDuration = 45; break;
          }
        }
        
        if (currentSlotDuration + newActivityDuration > SLOT_CAPACITY_MINUTES) {
            toast({
                title: "Slot Full",
                description: `Cannot add task. This would exceed the 4-hour slot limit.`,
                variant: "destructive"
            });
            return;
        }
        
        const defaultHabitId = settings.defaultHabitLinks?.[type] || null;

        const newActivity: Activity = { 
          id: `${type}-${Date.now()}-${Math.random()}`, 
          type, 
          details, 
          completed: false,
          taskIds: taskIds,
          slot: slotName,
          habitEquationIds: defaultHabitId ? [defaultHabitId] : [],
          linkedEntityType,
        };
        
        setSchedule(prev => ({ ...prev, [selectedDateKey]: { ...(prev[selectedDateKey] || {}), [slotName]: [...(Array.isArray(prev[selectedDateKey]?.[slotName]) ? prev[selectedDateKey]?.[slotName] as Activity[] : []), newActivity] } }));
    };

  const handleSaveInterrupt = () => {
    const { slotName, type } = interruptModalState;
    if (!slotName || !type || !interruptDetails.trim()) {
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
    
    const activityType: ActivityType = type;
    const newActivity: Activity = {
        id: `${activityType}-${Date.now()}`,
        type: activityType,
        details: interruptDetails,
        completed: true,
        taskIds: [],
        duration: durationMinutes,
        slot: slotName,
    };
    
    setSchedule(prev => {
        const newDaySchedule = { ...(prev[selectedDateKey] || {}) };

        if (applyInterruptToFutureSlots) {
            const currentSlotIndex = Object.keys(slotEndHours).indexOf(slotName);
            const slotsToUpdate = Object.keys(slotEndHours).slice(currentSlotIndex);
            
            slotsToUpdate.forEach(sName => {
                const currentActivities = Array.isArray(newDaySchedule[sName]) ? newDaySchedule[sName] as Activity[] : [];
                newDaySchedule[sName] = [...currentActivities, { ...newActivity, slot: sName, id: `${activityType}-${Date.now()}-${Math.random()}` }];
            });
        } else {
            const currentActivities = Array.isArray(newDaySchedule[slotName]) ? newDaySchedule[slotName] as Activity[] : [];
            newDaySchedule[slotName] = [...currentActivities, newActivity];
        }

        return { ...prev, [selectedDateKey]: newDaySchedule };
    });
    
    if (applyInterruptToFutureSlots) {
      toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Logged`, description: `Added to all future slots.` });
    } else {
      toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Logged`, description: `The ${type} has been added to your agenda.` });
    }

    setInterruptDetails('');
    setInterruptDuration('');
    setApplyInterruptToFutureSlots(false);
    setInterruptModalState({ isOpen: false, slotName: null, type: null });
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
                            ? { ...act, details: essentialDetails, duration: durationMinutes, taskIds: essentialLinkedHabitId ? [essentialLinkedHabitId] : [] }
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
            taskIds: essentialLinkedHabitId ? [essentialLinkedHabitId] : [],
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
    setEssentialLinkedHabitId(null);
    setEssentialsModalState({ isOpen: false, slotName: null, activity: null });
  };

  const handleSelectMeal = (mealType: 'meal1' | 'meal2' | 'meal3' | 'supplements') => {
    if (!currentSlotForMeal) return;

    const dayName = format(selectedDate, 'EEEE');
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


  const handleActivityClick = (slotName: string, activity: Activity, event: React.MouseEvent) => {
    if (activity.completed) return;
  
    if (activity.type === 'deepwork' || activity.type === 'upskill' || activity.type === 'branding') {
        setEditingActivity({ slotName, activity });
        setIsLearningModalOpen(true);
    } else if (activity.type === 'workout') {
        handleStartWorkoutLog(activity);
    } else if (activity.type === 'mindset') {
        handleStartMindsetLog(activity);
    } else if (activity.type === 'essentials') {
        setEssentialDetails(activity.details);
        setEssentialDuration(activity.duration ? String(activity.duration) : '');
        setEssentialLinkedHabitId(activity.taskIds?.[0] || null);
        setEssentialsModalState({ isOpen: true, slotName, activity });
    } else if (activity.type === 'nutrition') {
      openTodaysDietPopup(event);
    }
  };

  const handleStartWorkoutLog = (activity: Activity) => {
    setWorkoutActivityToLog(activity);
    setIsTodaysWorkoutModalOpen(true);
  };

  const handleStartMindsetLog = (activity: Activity) => {
    setMindsetActivityToLog(activity);
    setIsTodaysMindsetModalOpen(true);
  };

  const handleStartLeadGenLog = (activity: Activity) => {
    setWorkoutActivityToLog(activity); // Reusing workout activity log state for simplicity
    setIsLeadGenModalOpen(true);
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
      logsUpdater = setBrandingLogs;
      definitionSource = deepWorkDefinitions.filter(def => Array.isArray(def.focusAreaIds));
      logSource = brandingLogs;
    }
    
    const logForDay = logSource.find(log => log.date === selectedDateKey);
    
    // Find definitions for the selected IDs.
    const selectedDefinitions = finalSelectedDefIds.map(id => definitionSource.find(d => d.id === id)).filter((d): d is ExerciseDefinition => !!d);

    const newExercises: WorkoutExercise[] = selectedDefinitions
      .filter(def => !(logForDay?.exercises.some(ex => ex.definitionId === def.id))) // Only create instances for new defs
      .map((def) => ({
          id: `${def.id}-${Date.now()}-${Math.random()}`,
          definitionId: def.id,
          name: def.name,
          category: def.category,
          loggedSets: [],
          targetSets: 1,
          targetReps: pageType === 'branding' ? '4 stages' : '25',
          focusAreaIds: def.focusAreaIds,
      }));

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

    const newDetails = selectedDefinitions.map(t => t.name).join(', ') || (pageType === 'upskill' ? 'Learning Session' : pageType === 'deepwork' ? 'Deep Work Session' : 'Branding Session');
    
    const linkedEntityType = (pageType === 'upskill' ? 'curiosity' : 'intention');

    setSchedule(prev => {
      const newSchedule = { ...prev };
      const daySchedule = { ...(newSchedule[selectedDateKey] || {}) };
      const activitiesInSlot = (Array.isArray(daySchedule[slotName]) ? daySchedule[slotName] as Activity[] : []).map(act =>
        act.id === activity.id ? { ...act, taskIds: finalInstanceIds, details: newDetails, linkedEntityType } : act
      );
      daySchedule[slotName] = activitiesInSlot;
      newSchedule[selectedDateKey] = daySchedule;
      return newSchedule;
    });

    setEditingActivity(null);
  };
  
  const productivityStats = useMemo(() => {
    const today = startOfToday();
    const todayKey = format(today, 'yyyy-MM-dd');
    const yesterdayKey = format(subDays(today, 1), 'yyyy-MM-dd');
    
    const thirtyDaysAgo = subDays(today, 30);

    let totalProductiveMinutesLast30Days = 0;
    const productiveDays = new Set<string>();

    const getMinutesForDay = (definitions: ExerciseDefinition[], dateKey: string): number => {
      return definitions
        .filter(def => def.last_logged_date === dateKey && def.loggedDuration)
        .reduce((sum, def) => sum + def.loggedDuration!, 0);
    };
    
    [...upskillDefinitions, ...deepWorkDefinitions].forEach(def => {
        if (def.last_logged_date && def.loggedDuration) {
            const logDate = parseISO(def.last_logged_date);
            if (isAfter(logDate, thirtyDaysAgo) || isSameDay(logDate, thirtyDaysAgo)) {
                totalProductiveMinutesLast30Days += def.loggedDuration;
                productiveDays.add(def.last_logged_date);
            }
        }
    });
    
    const numberOfProductiveDays = productiveDays.size || 1;
    const avgDailyProductiveHours = (totalProductiveMinutesLast30Days / numberOfProductiveDays) / 60;
    const productivityLevel = settings.dailyProductiveHoursGoal > 0 
      ? (avgDailyProductiveHours / settings.dailyProductiveHoursGoal) * 100
      : 0;

    const todayUpskillMinutes = getMinutesForDay(upskillDefinitions, todayKey);
    const yesterdayUpskillMinutes = getMinutesForDay(upskillDefinitions, yesterdayKey);

    const todayDeepWorkMinutes = getMinutesForDay(deepWorkDefinitions, todayKey);
    const yesterdayDeepWorkMinutes = getMinutesForDay(deepWorkDefinitions, yesterdayKey);

    const calculateChange = (todayVal: number, yesterdayVal: number) => {
      if (yesterdayVal === 0) return todayVal > 0 ? Infinity : 0;
      return ((todayVal - yesterdayVal) / yesterdayVal) * 100;
    };

    const totalTodayMinutes = todayUpskillMinutes + todayDeepWorkMinutes;
    const totalYesterdayMinutes = yesterdayUpskillMinutes + yesterdayDeepWorkMinutes;

    const learningStats: Record<string, { logged: number; estimated: number }> = {};
    const specializations = coreSkills.filter(cs => cs.type === 'Specialization');
    
    specializations.forEach(spec => {
        let totalSpecLoggedMinutes = 0;
        let totalSpecEstimatedMinutes = 0;

        const microSkillNames = new Set(spec.skillAreas.flatMap(sa => sa.microSkills.map(ms => ms.name)));

        const allTasks = [...upskillDefinitions, ...deepWorkDefinitions];

        allTasks.forEach(task => {
            if (microSkillNames.has(task.category)) {
                totalSpecLoggedMinutes += task.loggedDuration || 0;
                totalSpecEstimatedMinutes += calculateTotalEstimate(task);
            }
        });
        
        if (totalSpecLoggedMinutes > 0 || totalSpecEstimatedMinutes > 0) {
            learningStats[spec.name] = { logged: totalSpecLoggedMinutes / 60, estimated: totalSpecEstimatedMinutes / 60 };
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
      productivityLevel,
    };
  }, [upskillDefinitions, deepWorkDefinitions, coreSkills, selectedDate, settings.dailyProductiveHoursGoal, calculateTotalEstimate]);
  
  const upcomingReleases = useMemo(() => {
    const allReleases: { topic: string, release: Release, type: 'product' | 'service' }[] = [];
    const today = startOfToday();

    const processPlan = (plan: any, topicId: string, topicName: string, type: 'product' | 'service') => {
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
        processPlan(plan, projectId, project?.name || projectId, 'product');
      });
    }

    if (offerizationPlans) {
      Object.entries(offerizationPlans).forEach(([specId, plan]) => {
        const specialization = coreSkills.find(s => s.id === specId);
        processPlan(plan, specId, specialization?.name || specId, 'service');
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
      mindset: 'Mindset', 
      branding: 'Branding', 
      essentials: 'Essentials', 
      planning: 'Planning', 
      tracking: 'Tracking', 
      'lead-generation': 'Lead Gen', 
      interrupt: 'Interrupts',
      distraction: 'Distractions', 
      nutrition: 'Nutrition',
    };
  
    dailyActivities.forEach((activity) => {
      if (activity && typeof activity === 'object' && 'type' in activity) {
        const mappedName = activityNameMap[activity.type as ActivityType];
        if (mappedName) {
          const isCompletedOrLogged = activity.completed || ['interrupt', 'distraction', 'planning', 'tracking', 'essentials', 'nutrition'].includes(activity.type);
          if (isCompletedOrLogged) {
            const duration = parseDurationToMinutes(activityDurations[activity.id]);
            if (!totals[mappedName]) {
              totals[mappedName] = { time: 0, activities: [] };
            }
            totals[mappedName].time += duration;
            totals[mappedName].activities.push({ name: activity.details, duration });
          }
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
      learningStats,
      productivityLevel,
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
      productivityLevel,
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
  
  const selectedDaySchedule = schedule[selectedDateKey] || {};
  
  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    
    if (!destination) return;
  
    const sourceDroppableId = source.droppableId;
    const destinationDroppableId = destination.droppableId;

    if (sourceDroppableId === destinationDroppableId && source.index === destination.index) {
        return;
    }

    const [sourceDateKey, sourceSlotName] = sourceDroppableId.split('_');
    const [destDateKey, destSlotName] = destinationDroppableId.split('_');

    setSchedule(currentSchedule => {
        const daySchedule = currentSchedule[sourceDateKey] ? JSON.parse(JSON.stringify(currentSchedule[sourceDateKey])) : {};
        
        const sourceActivities = (daySchedule[sourceSlotName as SlotName] as Activity[] | undefined) || [];
        if (source.index >= sourceActivities.length) {
            return currentSchedule;
        }
        
        const [movedActivity] = sourceActivities.splice(source.index, 1);
        
        if (sourceSlotName === destSlotName) {
            sourceActivities.splice(destination.index, 0, movedActivity);
            daySchedule[sourceSlotName as SlotName] = sourceActivities;
        } else {
            const destActivities = (daySchedule[destSlotName as SlotName] as Activity[] | undefined) || [];
            destActivities.splice(destination.index, 0, movedActivity);
            daySchedule[destSlotName as SlotName] = destActivities;
            
            if (sourceActivities.length === 0) {
                delete daySchedule[sourceSlotName as SlotName];
            } else {
                daySchedule[sourceSlotName as SlotName] = sourceActivities;
            }
        }
        
        return {
            ...currentSchedule,
            [sourceDateKey]: daySchedule
        };
    });
  };
  
  const onRemoveActivity = (slotName: string, activityId: string) => {
    setSchedule(prev => {
        const newSchedule = { ...prev };
        if (newSchedule[selectedDateKey]) {
            const daySchedule = { ...newSchedule[selectedDateKey] };
            if (daySchedule[slotName]) {
                daySchedule[slotName] = (daySchedule[slotName] as any[]).filter(act => act.id !== activityId);
                newSchedule[selectedDateKey] = daySchedule;
            }
        }
        return newSchedule;
    });
  };

  const handleSaveExcuse = () => {
    if (!excuseModalState.planId || !newExcuse.trim()) {
        toast({ title: 'Error', description: 'Excuse cannot be empty.', variant: 'destructive' });
        return;
    }
    const newLogEntry: AbandonmentLog = {
        id: `log_${Date.now()}`,
        timestamp: Date.now(),
        reason: newExcuse.trim()
    };
    setAbandonmentLogs(prev => {
        const existingLogs = prev[excuseModalState.planId!] || [];
        return {
            ...prev,
            [excuseModalState.planId!]: [...existingLogs, newLogEntry]
        };
    });
    setNewExcuse('');
    setIsLoggingNewExcuse(false);
    setExcuseModalState({ isOpen: false, planId: null, planName: null });
    toast({ title: 'Excuse Logged', description: 'Your reason has been saved for future review.' });
  };
  
  const handleUpdateExcuse = (logId: string) => {
    if (!excuseModalState.planId || !editedHandlingStrategy.trim()) {
      return;
    }
  
    setAbandonmentLogs(prev => {
      const planLogs = prev[excuseModalState.planId!] || [];
      const updatedLogs = planLogs.map(log => 
        log.id === logId ? { ...log, handlingStrategy: editedHandlingStrategy.trim() } : log
      );
      return {
        ...prev,
        [excuseModalState.planId!]: updatedLogs
      };
    });
  
    setEditingExcuseLogId(null);
    setEditedHandlingStrategy('');
  };


  const activityInfo = editingActivity?.activity;

  const availableTasksForModal = useMemo(() => {
    if (!activityInfo) return [];

    const sourceDefs = activityInfo.type === 'upskill' ? upskillDefinitions : deepWorkDefinitions;
    
    // Find the core skill that this activity is for.
    const coreSkill = coreSkills.find(cs => cs.name === activityInfo.details && cs.type === 'Specialization');
    if (!coreSkill) return [];
    
    const hasLearningPlan = offerizationPlans[coreSkill.id]?.learningPlan &&
        ((offerizationPlans[coreSkill.id]?.learningPlan?.audioVideoResources?.length || 0) > 0 || 
         (offerizationPlans[coreSkill.id]?.learningPlan?.bookWebpageResources?.length || 0) > 0);
         
    if (!hasLearningPlan) return [];
    
    const getNodeType = activityInfo.type === 'upskill' ? getUpskillNodeType : getDeepWorkNodeType;
    const targetNodeType = activityInfo.type === 'upskill' ? 'Curiosity' : 'Intention';
    
    return (sourceDefs || []).filter(def => {
        if (getNodeType(def) !== targetNodeType) return false;
        
        const microSkillInfo = Array.from(microSkillMap.values()).find(ms => ms.microSkillName === def.category);
        if (!microSkillInfo) return false;

        const taskCoreSkill = coreSkills.find(cs => cs.name === microSkillInfo.coreSkillName);
        return taskCoreSkill?.id === coreSkill.id;
    });
  }, [activityInfo, upskillDefinitions, deepWorkDefinitions, coreSkills, microSkillMap, offerizationPlans, getUpskillNodeType, getDeepWorkNodeType]);


  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <Card className="max-w-5xl mx-auto shadow-lg bg-card/60 border-border/20 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between text-center py-4">
                <div className="flex-grow">
                  <div className="text-sm text-muted-foreground">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</div>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-[150px] justify-start text-left font-normal h-9",!selectedDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, "MMM d")}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(startOfToday())} initialFocus />
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
                      onOpenTimeAllocationModal={() => setIsTimeAllocationModalOpen(true)}
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
                          onOpenHabitPopup={openRuleDetailPopup}
                          currentSlot={currentSlot}
                          onRemoveActivity={onRemoveActivity}
                      />
                  ) : (
                      <Card>
                          <CardHeader className="flex flex-row items-center justify-between">
                              <CardTitle className="flex items-center gap-2"><PieChartIcon /> Daily Time Allocation</CardTitle>
                               <Button variant="outline" size="icon" onClick={() => setIsTimeAllocationModalOpen(true)}>
                                  <Expand className="h-4 w-4" />
                                  <span className="sr-only">Open Time Allocation in Modal</span>
                              </Button>
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
                    onOpenExcuseModal={(planId, planName) => setExcuseModalState({ isOpen: true, planId, planName })}
                  />
                </div>
              </div>
              <TimeSlots 
                date={selectedDate}
                schedule={selectedDaySchedule}
                currentSlot={currentSlot}
                remainingTime={remainingTime}
                onAddActivity={handleAddActivity}
                onRemoveActivity={onRemoveActivity}
                onToggleComplete={handleToggleComplete}
                onActivityClick={handleActivityClick}
                slotDurations={slotDurations}
                setRoutine={toggleRoutine}
                deepWorkDefinitions={deepWorkDefinitions}
                upskillDefinitions={upskillDefinitions}
              />
            </CardContent>
          </Card>
          
          <ActivityHeatmap schedule={schedule} onDateSelect={(date) => setSelectedDate(parseISO(date))} />
        </div>
      </DragDropContext>
      
      {currentUser && (
        <TodaysWorkoutModal
            isOpen={isTodaysWorkoutModalOpen}
            onOpenChange={setIsTodaysWorkoutModalOpen}
            activityToLog={workoutActivityToLog}
            dateForWorkout={selectedDate}
            onActivityComplete={handleToggleComplete}
            logWorkoutSet={logWorkoutSet}
            updateWorkoutSet={updateWorkoutSet}
            deleteWorkoutSet={deleteWorkoutSet}
            removeExerciseFromWorkout={removeExerciseFromWorkout}
            swapWorkoutExercise={swapWorkoutExercise}
        />
      )}
      
      {currentUser && (
        <TodaysMindsetModal
          isOpen={isTodaysMindsetModalOpen}
          onOpenChange={setIsTodaysMindsetModalOpen}
          activityToLog={mindsetActivityToLog}
          dateForWorkout={selectedDate}
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
            availableTasks={availableTasksForModal as WorkoutExercise[]}
            initialSelectedIds={editingActivity.activity.taskIds || []}
            onSave={handleSaveTaskSelection}
            pageType={editingActivity.activity.type as 'upskill' | 'deepwork' | 'branding'}
            disabledTaskIds={[]}
            deepWorkDefinitions={deepWorkDefinitions}
            upskillDefinitions={upskillDefinitions}
            setDeepWorkDefinitions={setDeepWorkDefinitions}
            projects={projects}
            offerizationPlans={offerizationPlans}
            productizationPlans={productizationPlans}
            activeProjectIds={activeProjectIds}
        />
      )}

      <DietPlanModal
        isOpen={isDietPlanModalOpen}
        onOpenChange={setIsDietPlanModalOpen}
      />

      <Dialog open={isTimeAllocationModalOpen} onOpenChange={setIsTimeAllocationModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Daily Time Allocation</DialogTitle>
            <DialogDescription>A breakdown of your logged time for {format(selectedDate, 'PPP')}.</DialogDescription>
          </DialogHeader>
          <div className="py-4 h-[400px]">
            <TimeAllocationChart timeAllocationData={timeAllocationData} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isMindMapModalOpen} onOpenChange={setIsMindMapModalOpen}>
          <DialogContent className="max-w-full w-screen h-screen p-0 flex flex-col">
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
      
      <Dialog open={isTimetableModalOpen} onOpenChange={setIsTimetableModalOpen}>
        <DialogContent className="h-[90vh] max-w-full w-full grid grid-rows-[auto,1fr] p-0">
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                  <DialogTitle>Weekly Timetable</DialogTitle>
                  <DialogDescription>
                      Plan your week at a glance.
                  </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCurrentTimetableWeek(prev => addDays(prev, -7))}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" onClick={() => setCurrentTimetableWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentTimetableWeek(prev => addDays(prev, 7))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
          </DialogHeader>
          <div className="min-h-0">
              <TimesheetPageContent isModal={true} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={interruptModalState.isOpen} onOpenChange={(isOpen) => setInterruptModalState({ ...interruptModalState, isOpen })}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Log an {interruptModalState.type === 'distraction' ? 'Distraction' : 'Interruption'}</DialogTitle>
                  <DialogDescription>What pulled you away from your planned tasks?</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-1">
                      <Label>Type</Label>
                       <RadioGroup value={interruptModalState.type || ''} onValueChange={(value) => setInterruptModalState(prev => ({...prev, type: value as 'interrupt' | 'distraction'}))} className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="interrupt" id="type-interrupt" /><Label htmlFor="type-interrupt">Interruption</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="distraction" id="type-distraction" /><Label htmlFor="type-distraction">Distraction</Label></div>
                        </RadioGroup>
                  </div>
                  <div className="space-y-1">
                      <Label htmlFor="interrupt-details">Description</Label>
                      <Textarea id="interrupt-details" value={interruptDetails} onChange={(e) => setInterruptDetails(e.target.value)} placeholder="e.g., Unexpected phone call, browsing social media..." />
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
                  <Button variant="outline" onClick={() => setInterruptModalState({ isOpen: false, slotName: null, type: null })}>Cancel</Button>
                  <Button onClick={handleSaveInterrupt}>Save</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
       <Dialog open={essentialsModalState.isOpen} onOpenChange={(isOpen) => { if(!isOpen) setEssentialsModalState({ isOpen: false, slotName: null, activity: null }); }}>
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
                  <div className="space-y-1">
                      <Label htmlFor="essential-habit">Link Habit (Optional)</Label>
                      <Select
                          value={essentialLinkedHabitId || ''}
                          onValueChange={(value) => setEssentialLinkedHabitId(value === 'none' ? null : value)}
                      >
                          <SelectTrigger id="essential-habit">
                              <SelectValue placeholder="Select a habit..." />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="none">-- None --</SelectItem>
                              {habitResources.map(habit => (
                                  <SelectItem key={habit.id} value={habit.id}>{habit.name}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
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
      <Dialog open={excuseModalState.isOpen} onOpenChange={() => {
        setExcuseModalState({isOpen: false, planId: null, planName: null});
        setIsLoggingNewExcuse(false);
        setNewExcuse('');
      }}>
        <DialogContent className="sm:max-w-7xl">
            <DialogHeader>
                <DialogTitle>Log Abandonment Reason</DialogTitle>
                <DialogDescription>
                    Why did you stop pursuing the plan for "{excuseModalState.planName}"?
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                 <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Previous Reasons:</h4>
                    <ScrollArea className="h-40">
                        <div className="space-y-3">
                            {(abandonmentLogs[excuseModalState.planId!] || []).length > 0 ? (
                                (abandonmentLogs[excuseModalState.planId!] || []).map(log => {
                                    const plan = skillAcquisitionPlans.find(p => p.specializationId === excuseModalState.planId);
                                    const startDate = plan?.targetDate ? format(parseISO(plan.targetDate), 'PPP') : 'N/A';
                                    const allRuleEquations = Object.values(pillarEquations).flat();
                                    const linkedRuleEquations = (plan?.linkedRuleEquationIds || [])
                                    .map(id => allRuleEquations.find(eq => eq.id === id))
                                    .filter(eq => !!eq) as HabitEquation[];

                                    return (
                                        <div key={log.id} 
                                            className="text-sm p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                                            onClick={() => {
                                                setEditingExcuseLogId(log.id);
                                                setEditedHandlingStrategy(log.handlingStrategy || '');
                                            }}
                                        >
                                            <p className="font-medium text-foreground">{log.reason}</p>
                                            <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                                              <span>Abandoned: {format(new Date(log.timestamp), 'PPP')}</span>
                                            </div>
                                             {editingExcuseLogId === log.id ? (
                                                <div className="mt-2 space-y-2">
                                                    <Textarea
                                                        value={editedHandlingStrategy}
                                                        onChange={(e) => setEditedHandlingStrategy(e.target.value)}
                                                        placeholder="How will you handle this next time?"
                                                        onClick={(e) => e.stopPropagation()}
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingExcuseLogId(null); }}>Cancel</Button>
                                                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleUpdateExcuse(log.id); }}>Save Strategy</Button>
                                                    </div>
                                                </div>
                                            ) : log.handlingStrategy ? (
                                                <p className="text-xs mt-2 pt-2 border-t border-muted-foreground/20 text-green-600 dark:text-green-400 italic">
                                                    Strategy: {log.handlingStrategy}
                                                </p>
                                            ) : null}
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="flex items-center justify-center h-24 border rounded-md">
                                    <p className="text-sm text-muted-foreground">No reasons logged for this plan yet.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                {isLoggingNewExcuse && (
                    <div className="space-y-2">
                         <Label htmlFor="excuse-textarea">New Reason:</Label>
                         <Textarea
                            id="excuse-textarea"
                            value={newExcuse}
                            onChange={(e) => setNewExcuse(e.target.value)}
                            placeholder="e.g., Lost interest, found a better approach..."
                            className="min-h-[120px]"
                            autoFocus
                        />
                    </div>
                )}
            </div>
            <DialogFooter className="flex justify-between w-full">
                 <Button variant="secondary" size="sm" onClick={() => setIsLoggingNewExcuse(true)}>
                    Log New Excuse
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                        setExcuseModalState({isOpen: false, planId: null, planName: null});
                        setIsLoggingNewExcuse(false);
                        setNewExcuse('');
                    }}>Cancel</Button>
                    {isLoggingNewExcuse && (
                        <Button onClick={handleSaveExcuse}>Save Reason</Button>
                    )}
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

export default function MyPlatePage() {
    return <AuthGuard><MyPlatePageContent/></AuthGuard>
}

