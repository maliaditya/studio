
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType, FullSchedule, SubTask, MetaRule, SlotName, RecurrenceRule, WorkoutSchedulingMode, ExerciseDefinition, CoreSkill, Stopper } from '@/types/workout';
import {
  CheckCircle2, Circle, Grab, Dock, Move, Save, History, PlusCircle, BrainCircuit, Timer, GitBranch, Focus, Repeat, Link as LinkIcon, Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, MoreVertical, Brain, Wind, Moon, Sunrise, Sun, CloudSun, Sunset, MoonStar, ChevronLeft, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, isToday, isBefore, startOfToday, parseISO, getHours, differenceInDays, isAfter } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { useRouter } from 'next/navigation';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSeparator, DropdownMenuSubContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { MissedSlotModal } from './MissedSlotModal';
import { Dialog, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogContent } from './ui/dialog';

const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

const activityIcons: Record<ActivityType, React.ReactNode> = {
    workout: <Dumbbell className="h-4 w-4" />,
    upskill: <BookOpenCheck className="h-4 w-4" />,
    deepwork: <Briefcase className="h-4 w-4" />,
    planning: <ClipboardList className="h-4 w-4" />,
    tracking: <ClipboardCheck className="h-4 w-4" />,
    branding: <Share2 className="h-4 w-4" />,
    'lead-generation': <Magnet className="h-4 w-4" />,
    essentials: <CheckSquare className="h-4 w-4" />,
    nutrition: <Utensils className="h-4 w-4" />,
    interrupt: <AlertCircle className="h-4 w-4 text-red-500" />,
    distraction: <Wind className="h-4 w-4 text-yellow-500" />,
    mindset: <Brain className="h-4 w-4" />,
};

const AddActivityMenu = ({ onAddActivity }: { onAddActivity: (type: ActivityType, details: string) => void }) => {
    const { coreSkills } = useAuth();
    const specializations = coreSkills.filter(s => s.type === 'Specialization');

    return (
        <DropdownMenuContent className="w-56 p-2">
            <p className="font-medium text-sm p-2">Select Activity</p>
            {Object.entries(activityIcons).map(([type, icon]) => {
                const activityType = type as ActivityType;
                if (activityType === 'upskill' || activityType === 'deepwork') {
                    return (
                        <DropdownMenuSub key={type}>
                            <DropdownMenuSubTrigger className="w-full justify-start">
                                {icon}
                                <span className="ml-2 capitalize">{type.replace('-', ' ')}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <ScrollArea className="h-48">
                                        {specializations.length > 0 ? (
                                            specializations.map(spec => (
                                                <DropdownMenuItem key={spec.id} onClick={() => onAddActivity(activityType, spec.name)}>
                                                    {spec.name}
                                                </DropdownMenuItem>
                                            ))
                                        ) : (
                                            <DropdownMenuItem disabled>No specializations defined</DropdownMenuItem>
                                        )}
                                    </ScrollArea>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                    );
                }
                return (
                    <DropdownMenuItem key={type} onClick={() => onAddActivity(activityType, `New ${type.replace('-', ' ')}`)}>
                        {icon}
                        <span className="ml-2 capitalize">{type.replace('-', ' ')}</span>
                    </DropdownMenuItem>
                );
            })}
        </DropdownMenuContent>
    );
};

interface TimeSlotsProps {
  date: Date;
  schedule: DailySchedule;
  currentSlot: string;
  remainingTime: string;
  onAddActivity: (slotName: string, type: ActivityType, details: string) => void;
  onRemoveActivity: (slotName: string, activityId: string) => void;
  onToggleComplete: (slotName: string, activityId: string, isCompleted: boolean) => void;
  onActivityClick: (slotName: string, activity: Activity, event: React.MouseEvent) => void;
  slotDurations: Record<string, { logged: number; total: number }>;
  setRoutine: (activity: Activity, rule: RecurrenceRule | null) => void;
  deepWorkDefinitions: ExerciseDefinition[];
  upskillDefinitions: ExerciseDefinition[];
}

const pillars = [
    { name: 'Mind', attributes: ['Focus', 'Learning', 'Creativity'] },
    { name: 'Body', attributes: ['Health', 'Strength', 'Energy'] },
    { name: 'Heart', attributes: ['Relationships', 'Emotional Health'] },
    { name: 'Spirit', attributes: ['Meaning', 'Contribution', 'Legacy'] },
];

export function TimeSlots({
  date,
  schedule,
  currentSlot,
  remainingTime,
  onAddActivity,
  onRemoveActivity,
  onToggleComplete,
  onActivityClick,
  slotDurations,
  setRoutine,
}: TimeSlotsProps) {

  const { settings, setSettings, habitCards, mechanismCards, toggleRoutine, handleLinkHabit, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, allWorkoutLogs, metaRules, openRuleDetailPopup, openPillarPopup, missedSlotReviews, setMissedSlotReviews, setSchedule, schedule: fullSchedule, coreSkills, microSkillMap, allUpskillLogs, allDeepWorkLogs, deepWorkDefinitions, upskillDefinitions, purposeData, offerizationPlans, dailyReviewLogs, handleToggleDailyGoalCompletion } = useAuth();
  const [missedSlotModalState, setMissedSlotModalState] = useState<{ isOpen: boolean; slotName: string; allTasks: Activity[]; incompleteTasks: Activity[] }>({ isOpen: false, slotName: '', allTasks: [], incompleteTasks: [] });
  const [optionsModalSlot, setOptionsModalSlot] = useState<string | null>(null);
  const [lastXDays, setLastXDays] = useState(5);
  const { toast } = useToast();

  const handleLinkRule = (slotName: SlotName, ruleId: string) => {
    const currentSlotRules = settings.slotRules?.[slotName] || [];
    const isLinked = currentSlotRules.includes(ruleId);
    
    const newRules = isLinked
        ? currentSlotRules.filter(id => id !== ruleId)
        : [...currentSlotRules, ruleId];
        
    setSettings(prev => ({
      ...prev,
      slotRules: {
        ...(prev.slotRules || {}),
        [slotName]: newRules
      }
    }));
  };

  const handleOpenReviewModal = (slotName: string) => {
    const allTasksInSlot = (schedule[slotName as keyof DailySchedule] as Activity[] | undefined) || [];
    const incompleteTasks = allTasksInSlot.filter(a => a && !a.completed);
    setMissedSlotModalState({ isOpen: true, slotName: slotName, allTasks: allTasksInSlot, incompleteTasks: incompleteTasks });
  };
  
  const handleSaveMissedSlotReview = (review: MissedSlotReview, newDistraction?: Activity) => {
    setMissedSlotReviews(prev => ({
        ...prev,
        [review.id]: review
    }));

    if (newDistraction) {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        setSchedule(prev => {
            const newDaySchedule = { ...(prev[todayKey] || {}) };
            const currentActivities = Array.isArray(newDaySchedule[newDistraction.slot]) 
                ? newDaySchedule[newDistraction.slot] as Activity[]
                : [];
            
            newDaySchedule[newDistraction.slot] = [...currentActivities, newDistraction];
            
            return { ...prev, [todayKey]: newDaySchedule };
        });
        toast({ title: 'Distraction Logged', description: 'Your unscheduled time has been logged as a distraction.' });
    }

    setMissedSlotModalState({ isOpen: false, slotName: '', incompleteTasks: [], allTasks: [] });
  };
  
  const pastCompletedTasks = useMemo(() => {
    if (!optionsModalSlot) return [];
  
    const loggedDates = new Set<string>();
    const dateEntries = Object.entries(fullSchedule);
  
    for (let i = dateEntries.length - 1; i >= 0; i--) {
      const [dateKey, daySchedule] = dateEntries[i];
      const scheduleDate = parseISO(dateKey);
      if (isBefore(scheduleDate, startOfToday())) {
        const activities = (daySchedule[optionsModalSlot as SlotName] as Activity[] | undefined) || [];
        if (activities.some(activity => activity.completed)) {
          loggedDates.add(dateKey);
        }
      }
      if (loggedDates.size >= lastXDays) break;
    }

    const tasks = new Map<string, Activity>();
  
    loggedDates.forEach(dateKey => {
      const daySchedule = fullSchedule[dateKey];
      const activities = (daySchedule[optionsModalSlot as SlotName] as Activity[] | undefined) || [];
      
      activities.forEach(activity => {
        if (activity.completed && activity.type !== 'interrupt') {
            const findRootSpecialization = (taskDef: ExerciseDefinition): string | null => {
                const microSkillInfo = Array.from(microSkillMap.values()).find(ms => ms.microSkillName === taskDef.category);
                if (!microSkillInfo) return null;
                
                const coreSkill = coreSkills.find(cs => cs.name === microSkillInfo.coreSkillName);
                if (!coreSkill || coreSkill.type !== 'Specialization') return null;
          
                let rootSpec = coreSkill;
                while (rootSpec.parentId) {
                    const parent = coreSkills.find(cs => cs.id === rootSpec.parentId);
                    if (parent && parent.type === 'Specialization') {
                        rootSpec = parent;
                    } else {
                        break;
                    }
                }
                return rootSpec.name;
            };

            let taskDetail = activity.details;
            let taskKey: string;
            
            if ((activity.type === 'upskill' || activity.type === 'deepwork')) {
                const allLogs = activity.type === 'upskill' ? allUpskillLogs : allDeepWorkLogs;
                const taskLog = allLogs.flatMap(log => log.exercises).find(ex => activity.taskIds?.includes(ex.id));
                let definition;
                if (taskLog) {
                    definition = [...upskillDefinitions, ...deepWorkDefinitions].find(d => d.id === taskLog.definitionId);
                }
                if (definition) {
                    const specializationName = findRootSpecialization(definition);
                    if (specializationName) {
                        taskDetail = specializationName;
                    } else {
                        taskDetail = definition.name;
                    }
                }
            }
          
            taskKey = `${taskDetail.trim().toLowerCase()}-${activity.type}`;
            if (!tasks.has(taskKey)) {
                tasks.set(taskKey, { ...activity, details: taskDetail });
            }
        }
      });
    });
  
    return Array.from(tasks.values());
  }, [fullSchedule, optionsModalSlot, lastXDays, deepWorkDefinitions, upskillDefinitions, microSkillMap, allUpskillLogs, allDeepWorkLogs, coreSkills]);
  
  const loggedResistances = useMemo(() => {
    if (!optionsModalSlot) return [];
  
    const slotTimes = {
      'Late Night': { start: 0, end: 4 }, 'Dawn': { start: 4, end: 8 },
      'Morning': { start: 8, end: 12 }, 'Afternoon': { start: 12, end: 16 },
      'Evening': { start: 16, end: 20 }, 'Night': { start: 20, end: 24 }
    };
    const slot = slotTimes[optionsModalSlot as SlotName];
    if (!slot) return [];

    const resistancesMap = new Map<string, { text: string; type: 'Urge' | 'Resistance' | 'Distraction'; count: number; dates: Set<string> }>();
    const allLinks: { stopper: Stopper; isUrge: boolean }[] = [];

    habitCards.forEach(habit => {
        const negMech = mechanismCards.find(m => m.id === habit.response?.resourceId);
        if (negMech?.urges) allLinks.push(...negMech.urges.map(s => ({ stopper: s, isUrge: true })));
        if (habit.urges) allLinks.push(...habit.urges.map(s => ({ stopper: s, isUrge: true })));

        const posMech = mechanismCards.find(m => m.id === habit.newResponse?.resourceId);
        if (posMech?.resistances) allLinks.push(...posMech.resistances.map(s => ({ stopper: s, isUrge: false })));
        if (habit.resistances) allLinks.push(...habit.resistances.map(s => ({ stopper: s, isUrge: false })));
    });

    allLinks.forEach(link => {
        (link.stopper.timestamps || []).forEach((ts: number) => {
            const eventHour = getHours(new Date(ts));
            if (eventHour >= slot.start && eventHour < slot.end) {
                const key = link.stopper.text;
                if (!resistancesMap.has(key)) {
                    resistancesMap.set(key, { text: key, type: link.isUrge ? 'Urge' : 'Resistance', count: 0, dates: new Set() });
                }
                const entry = resistancesMap.get(key)!;
                entry.count += 1;
                entry.dates.add(format(new Date(ts), 'yyyy-MM-dd'));
            }
        });
    });
    
    Object.entries(fullSchedule).forEach(([dateKey, daySchedule]) => {
      const activities = (daySchedule[optionsModalSlot as SlotName] as Activity[] | undefined) || [];
      activities.forEach(activity => {
          if (activity.type === 'distraction' && activity.completedAt) {
              const eventHour = getHours(new Date(activity.completedAt));
              if (eventHour >= slot.start && eventHour < slot.end) {
                  const key = activity.details;
                  if (!resistancesMap.has(key)) {
                      resistancesMap.set(key, { text: key, type: 'Distraction', count: 0, dates: new Set() });
                  }
                  const entry = resistancesMap.get(key)!;
                  entry.count += 1;
                  entry.dates.add(dateKey);
              }
          }
      });
    });

    return Array.from(resistancesMap.values()).sort((a,b) => b.count - a.count);
  }, [optionsModalSlot, habitCards, mechanismCards, fullSchedule]);

  const routineTasksForSlot = useMemo(() => {
    if (!optionsModalSlot) return [];
    return (settings.routines || []).filter(task => task.slot === optionsModalSlot);
  }, [optionsModalSlot, settings.routines]);
  
  const dailyLearningGoals = useMemo(() => {
    const goals: { specName: string, resourceName: string, dailyTarget: string, progress: string, resourceId: string }[] = [];
    const today = startOfToday();
    
    const plannedSpecializations = Object.entries(offerizationPlans || {})
        .filter(([, plan]) => plan.learningPlan && ((plan.learningPlan.audioVideoResources?.length || 0) > 0 || (plan.learningPlan.bookWebpageResources?.length || 0) > 0))
        .map(([specId]) => coreSkills.find(s => s.id === specId))
        .filter((spec): spec is NonNullable<typeof spec> => !!spec);
        
    plannedSpecializations.forEach(spec => {
        const plan = offerizationPlans[spec.id]?.learningPlan;
        if (!plan) return;
        
        const completed = spec.skillAreas.flatMap(sa => sa.microSkills).reduce((acc, ms) => {
            acc.items += ms.completedItems || 0;
            acc.hours += ms.completedHours || 0;
            acc.pages += ms.completedPages || 0;
            return acc;
        }, { items: 0, hours: 0, pages: 0 });

        const calculateTarget = (total: number | null, completed: number, start: string | null | undefined, end: string | null | undefined) => {
            if (!total || !start || !end) return null;
            const startDate = parseISO(start);
            const endDate = parseISO(end);
            
            if (isAfter(startDate, endDate) || isBefore(endDate, today)) return null;
            
            const remainingWork = total - completed;
            const relevantStartDate = isBefore(startDate, today) ? today : startDate;
            const remainingDays = differenceInDays(endDate, relevantStartDate) + 1;
        
            if (remainingWork <= 0 || remainingDays <= 0) return null;
        
            return (remainingWork / remainingDays).toFixed(1);
        };

        (plan.audioVideoResources || []).forEach(res => {
            const targetItems = calculateTarget(res.totalItems, completed.items, res.startDate, res.completionDate);
            const targetHours = calculateTarget(res.totalHours, completed.hours, res.startDate, res.completionDate);
            let dailyTarget = [];
            if (targetItems) dailyTarget.push(`${targetItems} items/day`);
            if (targetHours) dailyTarget.push(`${targetHours} h/day`);
            
            if (dailyTarget.length > 0) {
                goals.push({
                    specName: spec.name,
                    resourceName: res.name,
                    dailyTarget: dailyTarget.join(' & '),
                    progress: `${completed.items}/${res.totalItems} items & ${completed.hours.toFixed(1)}/${res.totalHours}h`,
                    resourceId: res.id,
                });
            }
        });

        (plan.bookWebpageResources || []).forEach(res => {
            const targetPages = calculateTarget(res.totalPages, completed.pages, res.startDate, res.completionDate);
            if (targetPages) {
                goals.push({
                    specName: spec.name,
                    resourceName: res.name,
                    dailyTarget: `${targetPages} pgs/day`,
                    progress: `${completed.pages}/${res.totalPages} pages`,
                    resourceId: res.id,
                });
            }
        });
    });
    
    return goals;
}, [offerizationPlans, coreSkills]);

  const slots = [
    { name: 'Late Night', time: '12am - 4am', endHour: 4, icon: <Moon className="h-5 w-5 text-indigo-400" /> },
    { name: 'Dawn', time: '4am - 8am', endHour: 8, icon: <Sunrise className="h-5 w-5 text-orange-400" /> },
    { name: 'Morning', time: '8am - 12pm', endHour: 12, icon: <Sun className="h-5 w-5 text-yellow-400" /> },
    { name: 'Afternoon', time: '12pm - 4pm', endHour: 16, icon: <CloudSun className="h-5 w-5 text-sky-500" /> },
    { name: 'Evening', time: '4pm - 8pm', endHour: 20, icon: <Sunset className="h-5 w-5 text-purple-500" /> },
    { name: 'Night', time: '8pm - 12am', endHour: 24, icon: <MoonStar className="h-5 w-5 text-indigo-500" /> }
  ];
  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {slots.map((slot) => {
        const activities = (schedule[slot.name as keyof DailySchedule] as Activity[]) || [];
        const slotData = slotDurations[slot.name] || { logged: 0, total: 0 };
        const { logged: loggedTime } = slotData;
        const freeTime = 240 - loggedTime;
        const progress = (loggedTime / 240) * 100;
        
        const isCurrentSlotToday = isToday(date) && currentSlot === slot.name;
        const isPastSlot = isBefore(date, startOfToday()) || (isToday(date) && new Date().getHours() >= slot.endHour);
        
        const linkedRules = metaRules.filter(rule => 
            settings.slotRules?.[slot.name as SlotName]?.includes(rule.id)
        );

        const getPillarName = (purposePillar?: string) => {
            if (!purposePillar) return null;
            const mainPillar = pillars.find(p => p.name === purposePillar || p.attributes.includes(purposePillar));
            return mainPillar?.name || null;
        };

        const pillarName = linkedRules.length > 0 ? getPillarName(linkedRules[0].purposePillar) : null;

        return (
          <Card
            key={slot.name}
            id={`slot-card-${slot.name.replace(/\s+/g, '-')}`}
            className={cn(
              "transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col",
              isCurrentSlotToday
                ? 'ring-2 ring-primary shadow-2xl bg-card'
                : 'shadow-md bg-card/60'
            )}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg font-medium">{slot.name}</CardTitle>
                <CardDescription>{slot.time}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isCurrentSlotToday ? (
                  <div className="font-mono text-lg text-primary/80 tracking-wider animate-subtle-pulse">
                    {remainingTime}
                  </div>
                ) : (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenReviewModal(slot.name)}>
                    {slot.icon}
                  </Button>
                )}
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOptionsModalSlot(slot.name)}>
                    <History className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow justify-between min-h-[8rem] p-3">
              <div className="flex-grow min-h-0 mb-2">
                 {linkedRules.length > 0 && (
                    <div className="mb-2 space-y-1">
                        {linkedRules.map(rule => (
                            <button 
                                key={rule.id} 
                                className="text-xs text-left w-full text-muted-foreground italic pl-2 border-l-2 border-primary/50 hover:text-primary transition-colors"
                                onClick={(e) => openRuleDetailPopup(rule.id, e)}
                            >
                                {rule.text}
                            </button>
                        ))}
                    </div>
                 )}
                <div className="h-[200px] overflow-y-auto pr-2">
                  <ul className="space-y-2">
                    {activities && activities.length > 0 ? (
                      activities.map((activity) => (
                        <AgendaWidgetItem
                          key={activity.id}
                          activity={{...activity, slot: slot.name as SlotName}}
                          date={date}
                          onToggleComplete={onToggleComplete}
                          onActivityClick={onActivityClick}
                          onRemoveActivity={onRemoveActivity}
                          setRoutine={setRoutine}
                          context="timeslot"
                        />
                      ))
                    ) : (
                      <div className="flex-grow flex items-center justify-center h-full">
                        {isCurrentSlotToday ? (
                          <div className="text-center">
                            <p className="text-lg text-muted-foreground">Current Focus</p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center px-4">
                            Plan an activity for this block.
                          </p>
                        )}
                      </div>
                    )}
                  </ul>
                </div>
              </div>
              <div className="flex-shrink-0 mt-2 space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{loggedTime} min logged</span>
                    <span>{freeTime} min {isPastSlot ? 'untracked' : 'free'}</span>
                </div>
                <div className="flex justify-between items-center">
                    {pillarName ? (
                        <Button variant="outline" size="sm" onClick={() => openPillarPopup(pillarName)}>{pillarName}</Button>
                    ) : <div></div>}
                    <div className={cn("flex-grow flex justify-end items-center", !pillarName && "w-full")}>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                                    <Brain className="h-4 w-4" />
                                    <span className="sr-only">Link Rule</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-0">
                                <ScrollArea className="h-60">
                                    <div className="p-2 space-y-1">
                                        {metaRules.map(rule => (
                                            <div key={rule.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`rule-${slot.name}-${rule.id}`}
                                                    checked={settings.slotRules?.[slot.name as SlotName]?.includes(rule.id)}
                                                    onCheckedChange={() => handleLinkRule(slot.name as SlotName, rule.id)}
                                                />
                                                <Label htmlFor={`rule-${slot.name}-${rule.id}`} className="text-xs font-normal cursor-pointer">
                                                    {rule.text}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                                    <PlusCircle className="h-4 w-4" />
                                    <span className="sr-only">Add Activity</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <AddActivityMenu onAddActivity={(type, details) => onAddActivity(slot.name, type, details)} />
                        </DropdownMenu>
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
    <MissedSlotModal 
      state={missedSlotModalState}
      onOpenChange={(isOpen) => setMissedSlotModalState(prev => ({...prev, isOpen}))}
      onSave={handleSaveMissedSlotReview}
    />
     {optionsModalSlot && (
        <Dialog open={!!optionsModalSlot} onOpenChange={() => setOptionsModalSlot(null)}>
            <DialogContent className="max-w-7xl">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        <DialogTitle>Your Current Options for {optionsModalSlot}</DialogTitle>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Label htmlFor="last-x-days" className="text-muted-foreground flex-shrink-0">Show tasks from last</Label>
                        <Input 
                            id="last-x-days"
                            type="number"
                            value={lastXDays}
                            onChange={e => setLastXDays(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-16 h-8"
                        />
                        <span className="text-muted-foreground">logged days</span>
                    </div>
                </DialogHeader>
                <div className="py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <h3 className="font-semibold text-lg mb-4">Past Completed Tasks</h3>
                            {pastCompletedTasks.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {pastCompletedTasks.map(task => (
                                        <Card key={task.id}>
                                            <CardHeader className="p-4 relative">
                                                <div className="absolute top-2 right-2">
                                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                                                          onAddActivity(optionsModalSlot as SlotName, task.type, task.details);
                                                          setOptionsModalSlot(null);
                                                      }}>
                                                      <PlusCircle className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    {activityIcons[task.type]}
                                                    {task.details}
                                                </CardTitle>
                                                <CardDescription>
                                                  <Badge variant="outline" className="capitalize">{task.type.replace('-', ' ')}</Badge>
                                                </CardDescription>
                                            </CardHeader>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-40 border rounded-md">
                                    <p className="text-sm text-muted-foreground text-center">No completed tasks in this slot for the selected period.</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg mb-4">Past Friction</h3>
                            {loggedResistances.length > 0 ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {loggedResistances.map(item => (
                                        <Card key={item.text}>
                                            <CardContent className="p-3">
                                                <p className="text-sm font-medium">{item.text}</p>
                                                <div className="flex justify-between items-center mt-1">
                                                    <Badge variant={item.type === 'Urge' ? 'destructive' : item.type === 'Distraction' ? 'secondary' : 'outline'} className="capitalize text-xs">{item.type}</Badge>
                                                    <span className="text-xs text-muted-foreground">Logged {item.count} time(s)</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-40 border rounded-md">
                                    <p className="text-sm text-muted-foreground text-center">No friction logged in this slot.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-8">
                      <div>
                          <h3 className="font-semibold text-lg mb-4">Daily Purpose</h3>
                           <div className="space-y-2">
                                {(purposeData.statement || "Not set for today.").split('\n').map((line, index) => (
                                  <Card key={index}>
                                      <CardContent className="p-3">
                                          <p className="text-sm whitespace-pre-wrap">{line}</p>
                                      </CardContent>
                                  </Card>
                                ))}
                            </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-4">Slot Rules</h3>
                        {(settings.slotRules?.[optionsModalSlot as SlotName] || []).length > 0 ? (
                            <div className="space-y-2">
                                {metaRules.filter(rule => settings.slotRules?.[optionsModalSlot as SlotName]?.includes(rule.id)).map(rule => (
                                    <Card key={rule.id}>
                                        <CardContent className="p-3">
                                            <p className="text-sm">{rule.text}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-40 border rounded-md">
                                <p className="text-sm text-muted-foreground text-center">No rules linked to this slot.</p>
                            </div>
                        )}
                      </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )}
    </>
  );
}

export const AgendaWidgetItem = ({
  activity,
  date,
  onToggleComplete,
  onActivityClick,
  onRemoveActivity,
  setRoutine,
  context = 'timeslot'
}: {
  activity: Activity & { slot: SlotName };
  date: Date;
  onToggleComplete: (slotName: string, activityId: string, isCompleted: boolean) => void;
  onActivityClick: (slotName: string, activity: Activity, event: React.MouseEvent) => void;
  onRemoveActivity: (slotName: string, activityId: string) => void;
  setRoutine: (activity: Activity, rule: RecurrenceRule | null) => void;
  context?: 'timeslot' | 'agenda';
}) => {
  const { workoutMode, workoutPlans, exerciseDefinitions, handleLinkHabit, habitCards, onOpenFocusModal, onOpenHabitPopup, activityDurations, settings, allWorkoutLogs, workoutPlanRotation } = useAuth();
  
  let displayDetails = activity.details;
  if (activity.type === 'workout') {
    const { description } = getExercisesForDay(date, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling, allWorkoutLogs);
    displayDetails = description.split(' for ')[1] || "Workout";
  }
  
  const linkedHabit = useMemo(() => {
    if (activity.habitEquationIds && activity.habitEquationIds.length > 0) {
      return habitCards.find(h => h.id === activity.habitEquationIds![0]);
    }
    return null;
  }, [activity.habitEquationIds, habitCards]);
  
  const handleTitleClick = (event: React.MouseEvent) => {
    if (activity.completed) {
      onToggleComplete(activity.slot, activity.id, false);
      return;
    }
    
    if (linkedHabit && onOpenHabitPopup) {
        onOpenHabitPopup(linkedHabit.id, event);
        return;
    }
    
    onActivityClick(activity.slot, activity, event);
  };
  
  const handleFocusClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onOpenFocusModal(activity);
  };
  
  const duration = activityDurations[activity.id];

  const itemContent = (
    <div className="flex items-center justify-between gap-4 p-2 rounded-md bg-muted/30 w-full group">
      <div 
        className={cn("flex items-start gap-3 min-w-0 flex-grow", (linkedHabit || (activity.type !== 'interrupt' && activity.type !== 'distraction')) && "cursor-pointer")}
        onClick={handleTitleClick}
      >
        <button onClick={(e) => { e.stopPropagation(); onToggleComplete(activity.slot, activity.id, !activity.completed); }} className="pt-0.5">
            {activity.completed 
              ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              : <div className="h-5 w-5 border-2 rounded-sm mt-0.5 flex-shrink-0" />
            }
        </button>
        <div className="flex-grow min-w-0">
          <div className={`font-semibold text-foreground ${activity.completed ? 'line-through text-muted-foreground' : ''}`} title={displayDetails}>
            {displayDetails}
          </div>
          {linkedHabit && (
            <div className="min-w-0">
                <p className="text-xs text-primary font-medium truncate" title={linkedHabit.name}>
                    Habit: {linkedHabit.name}
                </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center text-right gap-1">
        {duration && <p className="text-xs font-semibold whitespace-nowrap text-muted-foreground">{duration}</p>}
        {context === 'agenda' && !activity.completed && activity.type !== 'interrupt' && activity.type !== 'distraction' && (
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleFocusClick}
            >
                <Timer className="h-4 w-4" />
            </Button>
        )}
        {context === 'timeslot' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Repeat className="mr-2 h-4 w-4" />
                  <span>Repeat</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={() => setRoutine(activity, { type: 'daily' })}>Daily</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setRoutine(activity, { type: 'weekly' })}>Weekly</DropdownMenuItem>
                    {activity.routine && <DropdownMenuSeparator />}
                    {activity.routine && <DropdownMenuItem onSelect={() => setRoutine(activity, null)} className="text-destructive">No Repeat</DropdownMenuItem>}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRemoveActivity(activity.slot, activity.id)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
  
  return <li>{itemContent}</li>;
};
    
