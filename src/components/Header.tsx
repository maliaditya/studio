
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, BrainCircuit, Heart, Settings, ChevronDown, Search, Play, Library, Info, Repeat, Book, CheckSquare, Calendar as CalendarIcon, ListChecks } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter as useRouterShadCN, usePathname } from 'next/navigation';
import { SupportModal } from './SupportModal';
import { cn } from '@/lib/utils';
import { DemoTokenModal } from './DemoTokenModal';
import { SettingsModal } from './SettingsModal';
import { SaveStatusWidget } from './SaveStatusWidget';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { Resource, ResourcePoint, MicroSkill, Activity, SlotName, WorkoutExercise, ExerciseDefinition } from '@/types/workout';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { format, isBefore, isToday, startOfToday, addDays, parseISO, differenceInDays, isAfter } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { getExercisesForDay } from '@/lib/workoutUtils';


const GlobalSearch = ({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) => {
  const { resources, openGeneralPopup, setPlaybackRequest } = useAuth();
  const [query, setQuery] = useState('');

  const { audioResults, cardResults } = useMemo(() => {
    if (!query) return { audioResults: [], cardResults: [] };
    
    const lowerCaseQuery = query.toLowerCase();
    const audioResults: { resource: Resource, annotation: ResourcePoint }[] = [];
    const cardResults: { resource: Resource, point?: ResourcePoint }[] = [];
    const addedCardIds = new Set<string>();

    resources.forEach(resource => {
      if (resource.name && resource.name.toLowerCase().includes(lowerCaseQuery) && !addedCardIds.has(resource.id)) {
        cardResults.push({ resource });
        addedCardIds.add(resource.id);
      }

      // Search card points
      if (resource.points) {
        resource.points.forEach(point => {
          if (point.text && point.text.toLowerCase().includes(lowerCaseQuery)) {
            if (point.type === 'timestamp') {
              audioResults.push({ resource, annotation: point });
            } else if (!addedCardIds.has(resource.id)) {
              cardResults.push({ resource, point });
              addedCardIds.add(resource.id);
            }
          }
        });
      }
    });

    return { audioResults, cardResults };
  }, [query, resources]);

  const handleSelect = (item: { resource: Resource, annotation?: ResourcePoint }, e: React.MouseEvent) => {
    const { resource, annotation } = item;
    
    if (annotation && annotation.timestamp !== undefined) {
      setPlaybackRequest({
        resourceId: resource.id,
        timestamp: annotation.timestamp,
        endTime: annotation.endTime,
      });
    }
    openGeneralPopup(resource.id, e);
    
    setOpen(false);
    setQuery('');
  };
  
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search notes and cards..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {cardResults.length > 0 && (
          <CommandGroup heading="Resource Cards">
            {cardResults.map(({ resource, point }) => (
              <CommandItem 
                key={resource.id + (point?.id || '')}
                onSelect={(e) => handleSelect({ resource }, e as any)}
                className="flex justify-between items-center"
              >
                <div className="flex-grow min-w-0">
                  <p className="font-medium truncate">{resource.name}</p>
                  {point && (
                    <p className="text-xs text-muted-foreground truncate">
                      <span className='font-semibold'>Match:</span> {point.text}
                    </p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {audioResults.length > 0 && (
          <CommandGroup heading="Audio Annotations">
            {audioResults.map(({ resource, annotation }) => (
              <CommandItem 
                key={annotation.id}
                onSelect={(e) => handleSelect({ resource, annotation }, e as any)}
                className="flex justify-between items-center"
              >
                <div className="flex-grow min-w-0">
                  <p className="font-medium truncate">{annotation.text}</p>
                  <p className="text-xs text-muted-foreground truncate">{resource.name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatTime(annotation.timestamp || 0)}
                    {annotation.endTime && ` - ${formatTime(annotation.endTime)}`}
                  </span>
                  <Play className="h-4 w-4 text-primary" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};


function NavigationMenu() {
  const [isClient, setIsClient] = useState(false);
  const [activePath, setActivePath] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
    setActivePath(pathname);
  }, [pathname]);

  const navLinks = [
    { href: '/my-plate', label: 'Dashboard' },
    { href: '/timetable', label: 'Timetable' },
    { href: '/resources', label: 'Resources' },
    { href: '/skill', label: 'Skill Tree' },
    { href: '/strategic-planning', label: 'Strategy' },
    { href: '/gamified-skills', label: 'Gamified Skills' },
  ];

  if (!isClient) {
    return <div className="flex items-center gap-4 h-8 w-96 bg-muted rounded-md animate-pulse" />;
  }

  return (
    <nav className="hidden md:flex items-center gap-2">
      {navLinks.map((link) => (
        <Button
          key={link.href}
          asChild
          variant={activePath === link.href ? 'default' : 'ghost'}
          size="sm"
        >
          <Link href={link.href}>{link.label}</Link>
        </Button>
      ))}
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-1">
            More <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem asChild><Link href="/workout-tracker">Workout Tracker</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/mind-programming">Mind Programming</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/upskill">Upskill</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/deep-work">Deep Work</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/personal-branding">Branding</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/lead-generation">Lead Gen</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/formalization">Formalization</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/patterns">Patterns</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/purpose">Purpose</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/path">Path</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/charts">Charts</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/timesheet">Timesheet</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/code-of-conduct">Code of Conduct</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

const slotOrder: SlotName[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

function UpcomingTasksModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { 
        coreSkills, 
        deepWorkDefinitions, 
        getDescendantLeafNodes, 
        scheduleTaskFromMindMap, 
        currentSlot, 
        offerizationPlans,
        settings,
        schedule,
        workoutMode,
        workoutPlans,
        exerciseDefinitions,
        allWorkoutLogs,
        workoutPlanRotation,
        allUpskillLogs,
        allDeepWorkLogs,
        dailyReviewLogs,
        handleToggleDailyGoalCompletion,
    } = useAuth();
    const { toast } = useToast();

    const DOUBLING_INTERVALS = [1, 2, 4, 8, 16, 32, 64, 128];

    const repetitionSkillsWithDates = useMemo(() => {
        const repetitionSkills = coreSkills.flatMap(cs => 
            cs.skillAreas.flatMap(sa => 
                sa.microSkills.filter(ms => ms.isReadyForRepetition)
            )
        );

        return repetitionSkills.map(skill => {
            const intentions = deepWorkDefinitions.filter(def => def.category === skill.name);
            const mainIntention = intentions.find(i => !deepWorkDefinitions.some(d => d.linkedDeepWorkIds?.includes(i.id)));
            const allLeafNodes = intentions.flatMap(intention => getDescendantLeafNodes(intention.id, 'deepwork'));
            const completionDates = new Set<string>();
            allLeafNodes.forEach(node => {
                if (node.last_logged_date) completionDates.add(node.last_logged_date);
            });
            const sortedDates = Array.from(completionDates).map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());

            let reps = 0;
            let lastReviewDate = sortedDates.length > 0 ? sortedDates[0] : new Date();

            if (sortedDates.length > 0) {
                reps = 1;
                for (let i = 1; i < sortedDates.length; i++) {
                    const daysBetween = differenceInDays(sortedDates[i], lastReviewDate);
                    if (daysBetween <= (DOUBLING_INTERVALS[reps - 1] || 128)) {
                        reps++;
                    } else {
                        reps = 1;
                    }
                    lastReviewDate = sortedDates[i];
                }
            }

            const nextInterval = DOUBLING_INTERVALS[reps] || 128;
            const nextReviewDate = addDays(lastReviewDate, nextInterval);

            return {
                ...skill,
                mainIntentionId: mainIntention?.id,
                nextReviewDate: sortedDates.length > 0 ? nextReviewDate : new Date(),
                isOverdue: sortedDates.length > 0 && isBefore(nextReviewDate, startOfToday()),
            };
        }).sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime());
    }, [coreSkills, deepWorkDefinitions, getDescendantLeafNodes]);

    const handleScheduleClick = (skill: { mainIntentionId?: string, name: string }) => {
        if (skill.mainIntentionId) {
            scheduleTaskFromMindMap(skill.mainIntentionId, 'deepwork', currentSlot);
        } else {
            toast({
                title: "Cannot Schedule",
                description: `No main intention found for "${skill.name}".`,
                variant: "destructive",
            });
        }
    };
    
    const todayKey = format(new Date(), 'yyyy-MM-dd');

    const todaysCompletions = useMemo(() => {
        const log = dailyReviewLogs.find(log => log.date === todayKey);
        return new Set(log?.completedResourceIds || []);
    }, [dailyReviewLogs, todayKey]);

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

            const calculateTarget = (total: number | null, completed: number, start: string | null | undefined, end: string | null | undefined): string | null => {
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
    
    const routineTasks = useMemo(() => {
        return (settings.routines || []).map(task => {
            if (task.type === 'workout') {
                const { description } = getExercisesForDay(new Date(), workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling, allWorkoutLogs);
                return { ...task, details: description };
            }
            return task;
        });
    }, [settings.routines, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling, allWorkoutLogs]);
    
    const todaysScheduledTasks = useMemo(() => {
        const todaysSchedule = schedule[todayKey] || {};
        const tasks: Activity[] = [];
        
        const routineTaskIdentifiers = new Set(routineTasks.map(rt => {
            return `${rt.details}_${rt.type}_${rt.slot}`;
        }));
        const reviewTaskDefIds = new Set(repetitionSkillsWithDates.map(rt => rt.mainIntentionId));

        for (const slotName of slotOrder) {
            const activities = todaysSchedule[slotName as SlotName] as Activity[] | undefined;
            if (Array.isArray(activities)) {
                const filteredActivities = activities.filter(act => {
                    if (!act || act.completed) return false;
                    const isRoutine = routineTaskIdentifiers.has(`${act.details}_${act.type}_${act.slot}`);
                    
                    const isReview = act.taskIds?.some(tid => {
                        const allLogs = [...allUpskillLogs, ...allDeepWorkLogs];
                        const taskLog = allLogs.flatMap(log => log.exercises).find(ex => ex.id === tid);
                        return taskLog && reviewTaskDefIds.has(taskLog.definitionId);
                    });
                    return !isRoutine && !isReview;
                });
                tasks.push(...filteredActivities);
            }
        }
        return tasks;
    }, [schedule, todayKey, routineTasks, repetitionSkillsWithDates, allUpskillLogs, allDeepWorkLogs]);

    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-500" />
                        Today's Learning Overview
                    </DialogTitle>
                    <DialogDescription>
                        A summary of your goals and review tasks for the day.
                    </DialogDescription>
                </DialogHeader>
                 <Tabs defaultValue="scheduled" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="scheduled">
                            Scheduled <Badge variant="secondary" className="ml-2">{todaysScheduledTasks.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="daily">
                            Daily Goals <Badge variant="secondary" className="ml-2">{dailyLearningGoals.filter(g => !todaysCompletions.has(g.resourceId)).length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="review">
                            Review <Badge variant="secondary" className="ml-2">{repetitionSkillsWithDates.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="routine">
                            Routine <Badge variant="secondary" className="ml-2">{routineTasks.length}</Badge>
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="scheduled" className="mt-4">
                       <ScrollArea className="h-80">
                            <ul className="space-y-3 pr-4">
                                {todaysScheduledTasks.map((task) => (
                                    <li key={task.id} className="p-3 rounded-md border bg-muted/30">
                                        <div className="flex items-start">
                                            <div className="flex-grow">
                                                <p className="font-semibold text-sm">{task.details}</p>
                                                <p className="text-xs text-muted-foreground">{task.slot}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                                {todaysScheduledTasks.length === 0 && (
                                    <p className="text-center text-muted-foreground pt-12">No other tasks scheduled for today.</p>
                                )}
                            </ul>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="daily" className="mt-4">
                       <ScrollArea className="h-80">
                            <ul className="space-y-3 pr-4">
                                {dailyLearningGoals.map((goal, index) => {
                                    const isCompletedToday = todaysCompletions.has(goal.resourceId);
                                    return (
                                        <li key={index} className="p-3 rounded-md border bg-muted/30">
                                            <div className="flex items-start">
                                                <Checkbox
                                                    id={`goal-check-${goal.resourceId}`}
                                                    checked={isCompletedToday}
                                                    onCheckedChange={() => handleToggleDailyGoalCompletion(goal.resourceId)}
                                                    className="mr-2 mt-0.5"
                                                />
                                                <div className="flex-grow">
                                                    <p className={cn("font-semibold text-sm", isCompletedToday && "line-through text-muted-foreground")}>{goal.resourceName}</p>
                                                    <p className={cn("text-xs text-muted-foreground", isCompletedToday && "line-through")}>{goal.specName}</p>
                                                    <div className="flex justify-between items-center mt-1 pt-1 border-t">
                                                        <Badge variant="secondary" className={cn(isCompletedToday && "line-through")}>{goal.progress}</Badge>
                                                        <Badge variant="default" className={cn(isCompletedToday && "line-through")}>{goal.dailyTarget}</Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                                {dailyLearningGoals.length === 0 && (
                                    <p className="text-center text-muted-foreground pt-12">No active daily learning goals.</p>
                                )}
                            </ul>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="review" className="mt-4">
                        <ScrollArea className="h-80">
                            <ul className="space-y-3 pr-4">
                                {repetitionSkillsWithDates.map(skill => (
                                    <li key={skill.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                                        <div>
                                            <p className="font-semibold">{skill.name}</p>
                                            <p className={cn("text-xs", skill.isOverdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
                                                Due: {format(skill.nextReviewDate, 'PPP')}
                                            </p>
                                        </div>
                                        <Button size="sm" onClick={() => handleScheduleClick(skill)}>Schedule</Button>
                                    </li>
                                ))}
                                {repetitionSkillsWithDates.length === 0 && (
                                    <p className="text-center text-muted-foreground pt-12">No skills are ready for repetition.</p>
                                )}
                            </ul>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="routine" className="mt-4">
                        <ScrollArea className="h-80">
                            <ul className="space-y-3 pr-4">
                                {routineTasks.map((task, index) => (
                                    <li key={index} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                                        <div>
                                            <p className="font-semibold text-sm">{task.details}</p>
                                            <p className="text-xs text-muted-foreground">{task.slot} - {task.routine?.type}</p>
                                        </div>
                                    </li>
                                ))}
                                {routineTasks.length === 0 && (
                                    <p className="text-center text-muted-foreground pt-12">No routine tasks configured.</p>
                                )}
                            </ul>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

export function Header() {
  const { currentUser, signOut, isDemoTokenModalOpen, setIsDemoTokenModalOpen, pushDemoDataWithToken, coreSkills, deepWorkDefinitions, getDescendantLeafNodes, offerizationPlans, settings, schedule, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, allWorkoutLogs, dailyReviewLogs, allUpskillLogs, allDeepWorkLogs } = useAuth();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUpcomingTasksModalOpen, setIsUpcomingTasksModalOpen] = useState(false);

  const upcomingTaskCount = useMemo(() => {
    const today = startOfToday();
    const todayKey = format(today, 'yyyy-MM-dd');
    
    // 1. Spaced Repetition Count
    const repetitionSkills = coreSkills.flatMap(cs => 
        cs.skillAreas.flatMap(sa => 
            sa.microSkills.filter(ms => ms.isReadyForRepetition)
        )
    );

    const repetitionSkillCount = repetitionSkills.filter(skill => {
        const intentions = deepWorkDefinitions.filter(def => def.category === skill.name);
        const allLeafNodes = intentions.flatMap(intention => getDescendantLeafNodes(intention.id, 'deepwork'));
        const completionDates = new Set<string>();
        allLeafNodes.forEach(node => {
            if (node.last_logged_date) completionDates.add(node.last_logged_date);
        });
        const sortedDates = Array.from(completionDates).map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());
        if (sortedDates.length === 0) return true;

        let reps = 1;
        let lastReviewDate = sortedDates[0];
        for (let i = 1; i < sortedDates.length; i++) {
            const daysBetween = differenceInDays(sortedDates[i], lastReviewDate);
            if (daysBetween <= ([1, 2, 4, 8, 16, 32, 64, 128][reps - 1] || 128)) {
                reps++;
            } else {
                reps = 1;
            }
            lastReviewDate = sortedDates[i];
        }
        const nextInterval = [1, 2, 4, 8, 16, 32, 64, 128][reps] || 128;
        const nextReviewDate = addDays(lastReviewDate, nextInterval);
        return isBefore(nextReviewDate, today) || isToday(nextReviewDate);
    }).length;

    // 2. Daily Learning Goals Count
    const todaysCompletions = new Set(dailyReviewLogs.find(log => log.date === todayKey)?.completedResourceIds || []);
    const learningGoalsCount = Object.values(offerizationPlans || {}).reduce((count, plan) => {
        if (plan.learningPlan) {
            const activeAudio = (plan.learningPlan.audioVideoResources || []).filter(res => res.completionDate && isAfter(parseISO(res.completionDate), today) && !todaysCompletions.has(res.id));
            const activeBooks = (plan.learningPlan.bookWebpageResources || []).filter(res => res.completionDate && isAfter(parseISO(res.completionDate), today) && !todaysCompletions.has(res.id));
            return count + activeAudio.length + activeBooks.length;
        }
        return count;
    }, 0);
    
    // 3. Routine Tasks Count
    const routineTasks = (settings.routines || []).map(task => {
      if (task.type === 'workout') {
        const { description } = getExercisesForDay(new Date(), workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling, allWorkoutLogs);
        return { ...task, details: description };
      }
      return task;
    });
    const routineCount = routineTasks.length;
    
    // 4. Scheduled (non-routine, non-review) Tasks
    const todaysSchedule = schedule[todayKey] || {};
    const routineTaskIdentifiers = new Set(routineTasks.map(rt => `${rt.details}_${rt.type}_${rt.slot}`));
    const reviewTaskDefIds = new Set(repetitionSkills.map(rt => rt.mainIntentionId));
    
    const scheduledTaskCount = Object.values(todaysSchedule).flat().filter(act => {
        if (!act || act.completed) return false;
        const isRoutine = routineTaskIdentifiers.has(`${act.details}_${act.type}_${act.slot}`);
        const isReview = act.taskIds?.some(tid => {
            const allLogs = [...allUpskillLogs, ...allDeepWorkLogs];
            const taskLog = allLogs.flatMap(log => log.exercises).find(ex => ex.id === tid);
            return taskLog && reviewTaskDefIds.has(taskLog.definitionId);
        });
        return !isRoutine && !isReview;
    }).length;
    
    return repetitionSkillCount + learningGoalsCount + scheduledTaskCount;
  }, [coreSkills, deepWorkDefinitions, getDescendantLeafNodes, offerizationPlans, settings.routines, schedule, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, allWorkoutLogs, dailyReviewLogs, allUpskillLogs, allDeepWorkLogs]);


  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2 mr-6">
            <BrainCircuit className="h-6 w-6 text-primary" />
            <span className="font-bold hidden sm:inline-block">Dock</span>
          </Link>

          {currentUser && <NavigationMenu />}

          <div className="flex flex-1 items-center justify-end gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSearchOpen(true)}>
                  <Search className="h-4 w-4" />
                  <span className="sr-only">Search</span>
              </Button>
              
              <GlobalSearch open={isSearchOpen} setOpen={setIsSearchOpen} />

              <div className="relative">
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:text-blue-600" onClick={() => setIsUpcomingTasksModalOpen(true)}>
                    <Info className="h-4 w-4" />
                    <span className="sr-only">Upcoming Tasks</span>
                </Button>
                {upcomingTaskCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-2 h-5 w-5 justify-center p-0">{upcomingTaskCount}</Badge>
                )}
              </div>

              <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => setIsSupportModalOpen(true)}>
                  <Heart className="mr-2 h-4 w-4 text-red-500" />
                  Support
              </Button>
            
              {currentUser && <SaveStatusWidget />}

              <UserProfile onSettingsClick={() => setIsSettingsModalOpen(true)} />
          </div>
        </div>
      </header>
      <SupportModal isOpen={isSupportModalOpen} onOpenChange={setIsSupportModalOpen} />
      <DemoTokenModal isOpen={isDemoTokenModalOpen} onOpenChange={setIsDemoTokenModalOpen} onSubmit={pushDemoDataWithToken} />
      <SettingsModal isOpen={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen} />
      <UpcomingTasksModal isOpen={isUpcomingTasksModalOpen} onOpenChange={setIsUpcomingTasksModalOpen} />
    </>
  );
}
