

"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { Activity, DailySchedule, FullSchedule, ActivityType, SlotName, Release, ExerciseDefinition, Project, CoreSkill } from '@/types/workout';
import { format, startOfToday, isAfter, parseISO, differenceInDays, subDays, isSameDay, getISOWeekYear, getISOWeek, startOfMonth } from 'date-fns';
import { motion } from 'framer-motion';
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { TimeSlots } from '@/components/TimeSlots';
import { ProductivitySnapshot, TimeAllocationChart } from '@/components/ProductivitySnapshot';
import { DashboardStats } from '@/components/DashboardStats';
import { WeightGoalCard } from '@/components/WeightGoalCard';
import { BotheringsCard } from '@/components/BotheringsCard';
import { TodaysScheduleCard } from '@/components/TodaysScheduleCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TodaysWorkoutModal } from '@/components/TodaysWorkoutModal';
import { TodaysMindsetModal } from '@/components/TodaysMindsetModal';
import { TodaysLeadGenModal } from '@/components/TodaysLeadGenModal';
import { TodaysLearningModal } from '@/components/TodaysLearningModal';
import { DietPlanModal } from '@/components/DietPlanModal';
import { MindMapViewer } from '@/components/MindMapViewer';
import { KanbanPageContent } from '@/app/kanban/page';
import { ChartsPageContent as ChartsPageContentActual } from '@/app/charts/page';
import { HabitDashboardMonthControls, TimesheetPageContent } from '@/app/timesheet/page';
import { TimetablePageContent } from '@/app/timetable/page';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { Link as LinkIconLucide, X } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WeightLog } from '@/types/workout';
import { WeightChartModal } from '@/components/WeightChartModal';
import { DeepWorkPageContent } from '@/app/deep-work/page';
import { useIsMobile } from '@/hooks/use-mobile';


const slotEndHours: Record<string, number> = {
  'Late Night': 4, 'Dawn': 8, 'Morning': 12, 'Afternoon': 16, 'Evening': 20, 'Night': 24,
};

function MyPlatePageContent() {
    const {
        settings,
        allUpskillLogs,
        allDeepWorkLogs,
        brandingLogs,
        upskillDefinitions,
        deepWorkDefinitions,
        weightLogs, setWeightLogs,
        goalWeight,
        height,
        dateOfBirth,
        gender,
        onSetHeight,
        onSetDateOfBirth,
        onSetGender,
        onSetGoalWeight,
        dietPlan,
        isAgendaDocked,
        setIsAgendaDocked,
        productizationPlans,
        offerizationPlans,
        projects,
        coreSkills,
        microSkillMap,
        findRootTask,
        onOpenIntentionPopup,
        getDescendantLeafNodes,
        permanentlyLoggedTaskIds,
        currentSlot,
        onOpenFocusModal,
        focusActivity,
        setFocusActivity,
        focusDuration,
        setFocusSessionModalOpen,
        logWorkoutSet, 
        updateWorkoutSet, 
        deleteWorkoutSet, 
        removeExerciseFromWorkout, 
        swapWorkoutExercise,
        logMindsetSet,
        deleteMindsetSet,
        onOpenHabitPopup,
        toggleRoutine,
        schedule,
        activityDurations,
        onUpdateWeightLog,
        onDeleteWeightLog,
        setSchedule,
        updateActivity,
        selectedUpskillTask,
        setSelectedUpskillTask,
        selectedDeepWorkTask,
        setSelectedDeepWorkTask,
        selectedDomainId,
        setSelectedDomainId,
        selectedSkillId,
        setSelectedSkillId,
        handleToggleComplete,
        getUpskillNodeType,
        onStartFocus,
    } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [isTodaysWorkoutModalOpen, setIsTodaysWorkoutModalOpen] = useState(false);
    const [isTodaysMindsetModalOpen, setIsTodaysMindsetModalOpen] = useState(false);
    const [timesheetModalTab, setTimesheetModalTab] = useState<'timesheet' | 'habit-dashboard'>('habit-dashboard');
    const [timesheetDashboardMonth, setTimesheetDashboardMonth] = useState(startOfMonth(new Date()));
    const [isLeadGenModalOpen, setIsLeadGenModalOpen] = useState(false);
    const [isDeepWorkModalOpen, setIsDeepWorkModalOpen] = useState(false);
    const [learningActivity, setLearningActivity] = useState<Activity | null>(null);
    const [isDietPlanModalOpen, setIsDietPlanModalOpen] = useState(false);
    const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
    const [isKanbanModalOpen, setIsKanbanModalOpen] = useState(false);
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [isTimesheetModalOpen, setIsTimesheetModalOpen] = useState(false);
    const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
    const [workoutActivityToLog, setWorkoutActivityToLog] = useState<Activity | null>(null);
    const [mindsetActivityToLog, setMindsetActivityToLog] = useState<Activity | null>(null);

    const [isWeightChartModalOpen, setIsWeightChartModalOpen] = useState(false);
    
    const [remainingTime, setRemainingTime] = useState<string | null>(null);

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: 'deep-work-modal',
    });
    const [dwPosition, setDwPosition] = useState({ x: 100, y: 100 });

    useEffect(() => {
        if (isDeepWorkModalOpen) {
            const popupWidth = Math.min(window.innerWidth * 0.95, 1600);
            const popupHeight = window.innerHeight * 0.9;
            setDwPosition({
                x: (window.innerWidth - popupWidth) / 2,
                y: (window.innerHeight - popupHeight) / 2,
            });
        }
    }, [isDeepWorkModalOpen]);

    const handleTimesheetDashboardMonthChange = (direction: -1 | 1) => {
        const nextMonth = new Date(timesheetDashboardMonth);
        nextMonth.setMonth(nextMonth.getMonth() + direction);
        setTimesheetDashboardMonth(startOfMonth(nextMonth));
    };


    const selectedDateKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
    const todaysSchedule = useMemo(() => schedule[selectedDateKey] || {}, [schedule, selectedDateKey]);
    
    const findSpecializationForTask = useCallback((def: ExerciseDefinition | null | undefined) => {
        if (!def) return null;
        const targetNames = new Set<string>();
        if (def.category) targetNames.add(def.category);
        if (def.name) targetNames.add(def.name);

        for (const coreSkill of coreSkills) {
            if (coreSkill.type !== 'Specialization') continue;
            for (const skillArea of coreSkill.skillAreas || []) {
                for (const microSkill of skillArea.microSkills || []) {
                    if (targetNames.has(microSkill.name)) {
                        return coreSkill;
                    }
                }
            }
        }
        return null;
    }, [coreSkills]);

    const handleOpenFocusModalForPlanning = useCallback((activity: Activity) => {
        const { type, details } = activity;
        if (type === 'workout') {
          setWorkoutActivityToLog(activity);
          setIsTodaysWorkoutModalOpen(true);
          return true;
        }
        
        if (type !== 'upskill' && type !== 'deepwork') {
            return false;
        }

        const rootTask = findRootTask(activity);
        if (rootTask) {
            if (type === 'deepwork') {
                setSelectedDeepWorkTask(rootTask);
                setSelectedUpskillTask(null);
            } else {
                setSelectedUpskillTask(rootTask);
                setSelectedDeepWorkTask(null);
            }
            const coreSkill = findSpecializationForTask(rootTask) || coreSkills.find(cs => cs.name === details && cs.type === 'Specialization');
            if (coreSkill) {
                setSelectedDomainId(coreSkill.domainId);
                setSelectedSkillId(coreSkill.id);
            }
            setFocusActivity(activity);
            setIsDeepWorkModalOpen(true);
            return true;
        }

        const coreSkill = coreSkills.find(cs => cs.name === details && cs.type === 'Specialization');
        if (coreSkill) {
            setSelectedDomainId(coreSkill.domainId);
            setSelectedSkillId(coreSkill.id);
            setSelectedUpskillTask(null);
            setSelectedDeepWorkTask(null);
            setFocusActivity(activity);
            setIsDeepWorkModalOpen(true);
            return true;
        }
        
        return false;
    }, [coreSkills, findRootTask, findSpecializationForTask, setSelectedDomainId, setSelectedSkillId, setSelectedUpskillTask, setSelectedDeepWorkTask, setFocusActivity, setIsDeepWorkModalOpen, setIsTodaysWorkoutModalOpen, setWorkoutActivityToLog]);

    const calculateTotalEstimate = useCallback((def: ExerciseDefinition): number => {
        let total = 0;
        const visited = new Set<string>();
        const allDefsMap = new Map([...deepWorkDefinitions, ...upskillDefinitions].map(d => [d.id, d]));
    
        function recurse(currentDef: ExerciseDefinition) {
            if (!currentDef || visited.has(currentDef.id)) return;
            visited.add(currentDef.id);
      
            const deepWorkChildren = currentDef.linkedDeepWorkIds || [];
            const upskillChildren = currentDef.linkedUpskillIds || [];
            const hasChildren = deepWorkChildren.length > 0 || upskillChildren.length > 0;
    
            if (hasChildren) {
                deepWorkChildren.forEach(childId => {
                    const childDef = allDefsMap.get(childId);
                    if (childDef) recurse(childDef);
                });
                upskillChildren.forEach(childId => {
                    const childDef = allDefsMap.get(childId);
                    if (childDef) recurse(childDef);
                });
            } else {
                total += currentDef.estimatedDuration || 0;
            }
        }
    
        recurse(def);
        return total;
    }, [deepWorkDefinitions, upskillDefinitions]);
    
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
            todayDeepWorkHours: todayDeepWorkMinutes / 60,
            deepWorkChange: calculateChange(todayDeepWorkMinutes, yesterdayDeepWorkMinutes),
            todayUpskillHours: todayUpskillMinutes / 60,
            upskillChange: calculateChange(todayUpskillMinutes, yesterdayUpskillMinutes),
            totalProductiveHours: totalTodayMinutes / 60,
            avgProductiveHoursChange: calculateChange(totalTodayMinutes, totalYesterdayMinutes),
            learningStats,
            productivityLevel,
        };
    }, [upskillDefinitions, deepWorkDefinitions, coreSkills, settings.dailyProductiveHoursGoal, calculateTotalEstimate]);
    
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
                        console.error("Invalid date format for release:", release);
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
        
        const inProgressItems = (todaysBrandingTasks as Activity[] || [])
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
    
    const parseDurationToMinutes = (durationStr: string | undefined): number => {
        if (!durationStr || typeof durationStr !== 'string') return 0;
        let totalMinutes = 0;
        const hourMatch = durationStr.match(/(\d+(?:\.\d+)?)\s*h/);
        const minMatch = durationStr.match(/(\d+)\s*m/);
    
        if (hourMatch) {
            totalMinutes += parseFloat(hourMatch[1]) * 60;
        }
        if (minMatch) {
            totalMinutes += parseInt(minMatch[1], 10);
        }
        if (!hourMatch && !minMatch && /^\d+$/.test(durationStr.trim())) {
            return parseInt(durationStr.trim(), 10);
        }
        return totalMinutes;
    };
    
    const timeAllocationData = useMemo(() => {
        const dailyActivities = todaysSchedule ? Object.values(todaysSchedule).flat() as Activity[] : [];
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
          distraction: 'Distractions', 
          nutrition: 'Nutrition',
          mindset: 'Mindset',
          'spaced-repetition': 'Spaced Repetition',
          pomodoro: 'Pomodoro',
        };
      
        dailyActivities.forEach((activity) => {
          if (activity && activity.completed) {
            const activityType = activity.type === 'pomodoro' && activity.linkedActivityType ? activity.linkedActivityType : activity.type;
            const mappedName = activityNameMap[activityType];
            if (mappedName) {
              const duration = parseDurationToMinutes(activityDurations[activity.id]);
              if (duration > 0) {
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
    }, [todaysSchedule, activityDurations]);
    
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
      
        const hasPlannedOrCompleted = Object.values(todaysSchedule).flat().length > 0;
        const allCompleted = hasPlannedOrCompleted && Object.values(todaysSchedule).flat().every(a => (a as Activity).completed);
      
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
    }, [productivityStats, todaysSchedule, upcomingReleases, brandingStatus]);

    const handleLogWeight = (weight: number, date: Date) => {
      if (isNaN(weight) || weight <= 0) {
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

    if (isMobile) {
      return (
          <div className="container mx-auto p-4">
              <TodaysScheduleCard
                  date={selectedDate}
                  schedule={schedule}
                  activityDurations={activityDurations}
                  isAgendaDocked={true} // Docked by default on mobile
                  onToggleDock={() => {}} // No-op, can't undock
                  onOpenHabitPopup={onOpenHabitPopup}
                  currentSlot={currentSlot}
                  onOpenFocusModal={onOpenFocusModal}
                  onActivityClick={handleOpenFocusModalForPlanning}
                  onStartFocus={onStartFocus}
              />
          </div>
      );
    }

    return (
        <>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <Card className="max-w-5xl mx-auto shadow-lg bg-card/60 border-border/20 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between text-center py-4">
                        <div className="flex-grow">
                            <div className="text-sm text-muted-foreground">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DashboardStats stats={dashboardStats} />
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                            <div className="space-y-6 lg:col-span-3">
                                <ProductivitySnapshot
                                    stats={dashboardStats}
                                    timeAllocationData={timeAllocationData}
                                    onOpenTimeAllocationModal={() => {}}
                                    todaysSchedule={todaysSchedule}
                                />
                            </div>
                            <div className="lg:col-span-2 space-y-6">
                                {isAgendaDocked ? (
                                    <TodaysScheduleCard
                                        date={selectedDate}
                                        schedule={schedule}
                                        activityDurations={activityDurations}
                                        isAgendaDocked={isAgendaDocked}
                                        onToggleDock={() => setIsAgendaDocked(prev => !prev)}
                                        onOpenHabitPopup={onOpenHabitPopup}
                                        currentSlot={currentSlot}
                                    />
                                ) : (
                                    <>
                                        <WeightGoalCard
                                            weightLogs={weightLogs}
                                            goalWeight={goalWeight}
                                            height={height}
                                            dateOfBirth={dateOfBirth}
                                            gender={gender}
                                            onSetHeight={onSetHeight}
                                            onSetDateOfBirth={onSetDateOfBirth}
                                            onSetGender={onSetGender}
                                            onSetGoalWeight={onSetGoalWeight}
                                            onLogWeight={handleLogWeight}
                                            dietPlan={dietPlan}
                                            onEditDietClick={() => setIsDietPlanModalOpen(true)}
                                            onOpenChartModal={() => setIsWeightChartModalOpen(true)}
                                        />
                                        {!isAgendaDocked && <BotheringsCard />}
                                    </>
                                )}
                            </div>
                        </div>
                        <TimeSlots
                            date={selectedDate}
                            schedule={schedule}
                            currentSlot={currentSlot}
                            onActivityClick={handleOpenFocusModalForPlanning}
                            onOpenHabitPopup={onOpenHabitPopup}
                            onStartFocus={onStartFocus}
                        />
                    </CardContent>
                </Card>
                <ActivityHeatmap schedule={schedule} onDateSelect={(date) => setSelectedDate(parseISO(date))} />
            </div>
            
            {isDeepWorkModalOpen && (
                <motion.div
                    ref={setNodeRef}
                    style={{
                        position: 'fixed',
                        top: dwPosition.y,
                        left: dwPosition.x,
                        width: '95vw',
                        maxWidth: '1600px',
                        height: '90vh',
                        zIndex: 50,
                    }}
                    drag
                    dragMomentum={false}
                    onDragEnd={(e, info) => {
                        setDwPosition(pos => ({ x: pos.x + info.offset.x, y: pos.y + info.offset.y }));
                    }}
                    className="flex flex-col"
                >
                    <Card className="w-full h-full p-0 flex flex-col overflow-hidden shadow-2xl">
                        <div className="flex-grow min-h-0">
                           <DeepWorkPageContent isModal={true} onClose={() => setIsDeepWorkModalOpen(false)} />
                        </div>
                    </Card>
                </motion.div>
            )}

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
             <TodaysMindsetModal
                isOpen={isTodaysMindsetModalOpen}
                onOpenChange={setIsTodaysMindsetModalOpen}
                activityToLog={mindsetActivityToLog}
                dateForWorkout={selectedDate}
                onActivityComplete={handleToggleComplete}
            />

            <TodaysLeadGenModal 
                isOpen={isLeadGenModalOpen} 
                onOpenChange={setIsLeadGenModalOpen} 
                activityToLog={workoutActivityToLog}
                onActivityComplete={handleToggleComplete}
            />
            
            <Dialog open={isMindMapModalOpen} onOpenChange={setIsMindMapModalOpen}>
                <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>Mind Map</DialogTitle>
                    </DialogHeader>
                    <div className="flex-grow min-h-0"><MindMapViewer showControls={true} /></div>
                </DialogContent>
            </Dialog>
            <Dialog open={isKanbanModalOpen} onOpenChange={setIsKanbanModalOpen}>
                <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>Kanban Board</DialogTitle>
                    </DialogHeader>
                    <div className="flex-grow min-h-0"><KanbanPageContent isModal={true} /></div>
                </DialogContent>
            </Dialog>
            <Dialog open={isChartModalOpen} onOpenChange={setIsChartModalOpen}>
                <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
                    <DialogHeader className="p-4 border-b">
                       <DialogTitle>Charts</DialogTitle>
                    </DialogHeader>
                    <div className="flex-grow min-h-0">
                        <ScrollArea className="h-full"><ChartsPageContentActual /></ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={isTimesheetModalOpen} onOpenChange={setIsTimesheetModalOpen}>
                <DialogContent className="max-w-[98vw] w-[98vw] h-[90vh] p-0 flex flex-col">
                    <DialogHeader className="p-4 border-b">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center justify-start gap-2">
                                <Button
                                    variant={timesheetModalTab === 'timesheet' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setTimesheetModalTab('timesheet')}
                                >
                                    Timesheet
                                </Button>
                                <Button
                                    variant={timesheetModalTab === 'habit-dashboard' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setTimesheetModalTab('habit-dashboard')}
                                >
                                    Habit Dashboard
                                </Button>
                            </div>
                            {timesheetModalTab === 'habit-dashboard' && (
                                <HabitDashboardMonthControls
                                    month={timesheetDashboardMonth}
                                    onChange={handleTimesheetDashboardMonthChange}
                                    className="mr-10"
                                />
                            )}
                        </div>
                    </DialogHeader>
                    <div className="flex-grow min-h-0">
                        <TimesheetPageContent
                            isModal={true}
                            modalTab={timesheetModalTab}
                            onModalTabChange={setTimesheetModalTab}
                            showModalTabs={false}
                            dashboardMonth={timesheetDashboardMonth}
                            onDashboardMonthChange={setTimesheetDashboardMonth}
                        />
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={isTimetableModalOpen} onOpenChange={setIsTimetableModalOpen}>
                <DialogContent
                    className="max-w-7xl h-[90vh] flex flex-col p-0"
                    onInteractOutside={(event) => {
                        const target = event.target as HTMLElement | null;
                        if (!target) return;
                        if (target.closest('[data-radix-dropdown-menu-content]') || target.closest('[data-radix-popper-content-wrapper]')) {
                            event.preventDefault();
                        }
                    }}
                >
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>Weekly Timetable</DialogTitle>
                        <DialogDescription>
                            Plan your week at a glance.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow min-h-0">
                        <TimetablePageContent isModal={true} />
                    </div>
                </DialogContent>
            </Dialog>
            <WeightChartModal
                isOpen={isWeightChartModalOpen}
                onOpenChange={setIsWeightChartModalOpen}
                weightLogs={weightLogs}
                goalWeight={goalWeight}
                height={height}
                dateOfBirth={dateOfBirth}
                gender={gender}
                onLogWeight={handleLogWeight}
                onUpdateWeightLog={onUpdateWeightLog}
                onDeleteWeightLog={onDeleteWeightLog}
                onSetGoalWeight={onSetGoalWeight}
                onSetHeight={onSetHeight}
                onSetDateOfBirth={onSetDateOfBirth}
                onSetGender={onSetGender}
            />
        </>
    );
}

export default function MyPlatePage() {
    return <AuthGuard><MyPlatePageContent /></AuthGuard>;
}
