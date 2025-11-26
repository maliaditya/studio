
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { Activity, DailySchedule, FullSchedule, ActivityType, SlotName, Release, ExerciseDefinition, Project } from '@/types/workout';
import { format, startOfToday, isAfter, parseISO, differenceInDays, subDays, isSameDay } from 'date-fns';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { TimeSlots } from '@/components/TimeSlots';
import { ProductivitySnapshot, TimeAllocationChart } from '@/components/ProductivitySnapshot';
import { DashboardStats } from '@/components/DashboardStats';
import { WeightGoalCard } from '@/components/WeightGoalCard';
import { TodaysScheduleCard } from '@/components/TodaysScheduleCard';
import { FocusSessionModal } from '@/components/FocusSessionModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TodaysWorkoutModal } from '@/components/TodaysWorkoutModal';
import { TodaysMindsetModal } from '@/components/TodaysMindsetModal';
import { TodaysLeadGenModal } from '@/components/TodaysLeadGenModal';
import { DietPlanModal } from '@/components/DietPlanModal';
import { MindMapViewer } from '@/components/MindMapViewer';
import { KanbanPageContent } from '@/app/kanban/page';
import { ChartsPageContent } from '@/app/charts/page';
import { TimesheetPageContent } from '@/app/timesheet/page';
import { TimetablePageContent } from '@/app/timetable/page';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
import { Link as LinkIconLucide } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { ScrollArea } from '@/components/ui/scroll-area';


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
        weightLogs,
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
        onOpenIntentionPopup,
        getDescendantLeafNodes,
        permanentlyLoggedTaskIds,
        currentSlot,
        handleStartFocusSession,
        setFocusSessionModalOpen,
        focusSessionModalOpen,
        focusActivity,
        focusDuration,
        logWorkoutSet, 
        updateWorkoutSet, 
        deleteWorkoutSet, 
        removeExerciseFromWorkout, 
        swapWorkoutExercise,
        logMindsetSet,
        deleteMindsetSet,
        onOpenTaskContext,
        onOpenHabitPopup,
        toggleRoutine,
        handleToggleComplete,
        schedule,
        activityDurations
    } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
    const [remainingTime, setRemainingTime] = useState<string | null>(null);
    const [isTodaysWorkoutModalOpen, setIsTodaysWorkoutModalOpen] = useState(false);
    const [isTodaysMindsetModalOpen, setIsTodaysMindsetModalOpen] = useState(false);
    const [isLeadGenModalOpen, setIsLeadGenModalOpen] = useState(false);
    const [isDietPlanModalOpen, setIsDietPlanModalOpen] = useState(false);
    const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
    const [isKanbanModalOpen, setIsKanbanModalOpen] = useState(false);
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [isTimesheetModalOpen, setIsTimesheetModalOpen] = useState(false);
    const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
    const [workoutActivityToLog, setWorkoutActivityToLog] = useState<Activity | null>(null);
    const [mindsetActivityToLog, setMindsetActivityToLog] = useState<Activity | null>(null);

    const onOpenFocusModal = useCallback((activity: Activity) => {
        const estDurationStr = activity.duration?.toString();
        let minutes = 0;
        if (estDurationStr) {
            const hMatch = estDurationStr.match(/(\d+)h/);
            const mMatch = estDurationStr.match(/(\d+)m/);
            const h = hMatch ? parseInt(hMatch[1]) * 60 : 0;
            const m = mMatch ? parseInt(mMatch[1]) : 0;
            minutes = h + m;
            if (minutes === 0 && /^\d+$/.test(estDurationStr.trim())) {
                minutes = parseInt(estDurationStr.trim());
            }
        }
        if (isNaN(minutes) || minutes <= 0) minutes = 45;
        
        setFocusSessionModalOpen(true);
        return true;
    }, [setFocusSessionModalOpen]);
    

    const handleActivityClick = (slotName: string, activity: Activity, event: React.MouseEvent) => {
        if (activity.completed) return;
        if (activity.type === 'workout') {
            setWorkoutActivityToLog(activity);
            setIsTodaysWorkoutModalOpen(true);
        } else if (activity.type === 'mindset') {
            setMindsetActivityToLog(activity);
            setIsTodaysMindsetModalOpen(true);
        } else if (activity.type === 'deepwork' || activity.type === 'upskill') {
            onOpenFocusModal(activity);
        }
    };
    
    useEffect(() => {
        const timerInterval = setInterval(() => {
            const now = new Date();
            const slotEndHour = slotEndHours[currentSlot];
            if (slotEndHour === undefined) {
                setRemainingTime(null);
                return;
            }
            const slotEndTime = new Date(); slotEndTime.setHours(slotEndHour, 0, 0, 0);
            const diff = slotEndTime.getTime() - now.getTime();
            
            if (diff > 0) {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff / 1000 * 60) % 60);
                const seconds = Math.floor((diff / 1000) % 60);
                setRemainingTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
            } else { 
                setRemainingTime('00:00:00'); 
            }
        }, 1000);
        return () => clearInterval(timerInterval);
    }, [currentSlot]);

    const selectedDateKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
    const todaysSchedule = useMemo(() => schedule[selectedDateKey] || {}, [schedule, selectedDateKey]);

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
    
    const timeAllocationData = useMemo(() => {
        const dailyActivities = todaysSchedule ? Object.values(todaysSchedule).flat() : [];
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
        };
      
        (dailyActivities as Activity[]).forEach((activity) => {
          if (activity && typeof activity === 'object' && 'type' in activity) {
            const mappedName = activityNameMap[activity.type as ActivityType];
            if (mappedName) {
              const duration = activity.duration || 0;
              if (duration > 0) {
                if (!totals[mappedName]) {
                  totals[mappedName] = { time: 0, activities: [] };
                }
                totals[mappedName].time += duration;
                totals[mappedName].activities.push({ name: (activity as Activity).details, duration });
              }
            }
          }
        });
      
        return Object.entries(totals).map(([name, data]) => ({ name, time: data.time, activities: data.activities }));
    }, [todaysSchedule]);
    
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
                                        isAgendaDocked={isAgendaDocked}
                                        onToggleDock={() => setIsAgendaDocked(prev => !prev)}
                                        onOpenFocusModal={onOpenFocusModal}
                                        onOpenTaskContext={onOpenTaskContext}
                                        onOpenHabitPopup={onOpenHabitPopup}
                                        currentSlot={currentSlot}
                                    />
                                ) : (
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <CardTitle className="flex items-center gap-2">Daily Time Allocation</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <TimeAllocationChart timeAllocationData={timeAllocationData} />
                                        </CardContent>
                                    </Card>
                                )}
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
                                    dietPlan={dietPlan}
                                    onEditDietClick={() => setIsDietPlanModalOpen(true)}
                                    deepWorkDefinitions={deepWorkDefinitions}
                                    upskillDefinitions={upskillDefinitions}
                                    onOpenIntentionPopup={onOpenIntentionPopup}
                                    metaRules={[]}
                                    productizationPlans={{}}
                                    offerizationPlans={{}}
                                    projects={[]}
                                    onOpenExcuseModal={() => {}}
                                />
                            </div>
                        </div>
                        <TimeSlots
                            date={selectedDate}
                            currentSlot={currentSlot}
                            remainingTime={remainingTime}
                            onOpenTaskContext={onOpenTaskContext}
                        />
                    </CardContent>
                </Card>
                <ActivityHeatmap schedule={schedule} onDateSelect={(date) => setSelectedDate(parseISO(date))} />
            </div>

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
            
            <DietPlanModal isOpen={isDietPlanModalOpen} onOpenChange={setIsDietPlanModalOpen} />
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
                        <ScrollArea className="h-full"><ChartsPageContent /></ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={isTimesheetModalOpen} onOpenChange={setIsTimesheetModalOpen}>
                <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle>Timesheet</DialogTitle>
                    </DialogHeader>
                    <div className="flex-grow min-h-0">
                        <TimesheetPageContent isModal={true} />
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={isTimetableModalOpen} onOpenChange={setIsTimetableModalOpen}>
                <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
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
        </>
    );
}

export default function MyPlatePage() {
    return <AuthGuard><MyPlatePageContent /></AuthGuard>;
}
