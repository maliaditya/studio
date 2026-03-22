
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, BrainCircuit, Heart, Settings, ChevronDown, Search, Play, Library, Info, Repeat, Book, CheckSquare, Calendar as CalendarIcon, ListChecks, Brain, Workflow, Activity as ActivityIcon, Github, Download, Paintbrush, UploadCloud, DownloadCloud, X, Link2, Plus, Pencil, GitBranch } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { isAdminUsername } from '@/lib/adminUsers';
import { useRouter as useRouterShadCN, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DemoTokenModal } from './DemoTokenModal';
import { SettingsModal } from './SettingsModal';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { Resource, ResourcePoint, MicroSkill, Activity, SlotName, WorkoutExercise, ExerciseDefinition, Stopper, ActivityType, RecurrenceRule } from '@/types/workout';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { format, isBefore, isToday, startOfToday, addDays, parseISO, differenceInDays, isAfter, subDays, startOfDay, startOfMonth } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { TimesheetPageContent } from '@/app/timesheet/page';
import { StateDiagramModal } from './StateDiagramModal';
import { LearningPerformanceModal } from './LearningPerformanceModal';


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


function NavigationMenu({ simpleMode }: { simpleMode: boolean }) {
  const [isClient, setIsClient] = useState(false);
  const [activePath, setActivePath] = useState('');
  const pathname = usePathname();
  const { currentUser } = useAuth();

  useEffect(() => {
    setIsClient(true);
    setActivePath(pathname);
  }, [pathname]);

    const isAdminUser = isAdminUsername(currentUser?.username);

  const navLinks: Array<{ href: string; label: string; icon?: React.ComponentType<{ className?: string }> }> = simpleMode
    ? [
        { href: '/my-plate', label: 'Dashboard' },
        { href: '/resources', label: 'Resources' },
        { href: '/skill', label: 'Skill Tree' },
        { href: '/deep-work', label: 'Deep Work' },
        { href: '/kanban', label: 'Kanban' },
        { href: '/finance', label: 'Finance' },
        // Portfolio moved to More menu
        { href: '/strategic-planning', label: 'Strategy' },
        { href: '/truth', label: 'Truth' },
        { href: '/support', label: 'Support' },
        ...(isAdminUser
          ? [
              { href: '/admin/monetization', label: 'Monetization' },
                            { href: '/admin/donors', label: 'Donors' },
                            { href: '/admin/users', label: 'Users' },
              { href: '/admin/config', label: 'Config' },
            ]
          : []),
      ]
    : [
        { href: '/my-plate', label: 'Dashboard' },
        { href: '/resources', label: 'Resources' },
        { href: '/skill', label: 'Skill Tree' },
        { href: '/kanban', label: 'Kanban' },
        { href: '/finance', label: 'Finance' },
        // Portfolio moved to More menu
        { href: '/strategic-planning', label: 'Strategy' },
        { href: '/truth', label: 'Truth' },
        { href: '/graph', label: 'Graph', icon: Workflow },
        ...(isAdminUser
          ? [
              { href: '/admin/monetization', label: 'Monetization' },
                            { href: '/admin/donors', label: 'Donors' },
                            { href: '/admin/users', label: 'Users' },
              { href: '/admin/config', label: 'Config' },
            ]
          : []),
      ];

  if (!isClient) {
    return <div className="hidden md:flex items-center gap-4 h-8 w-96 bg-muted rounded-md animate-pulse" />;
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
          <Link href={link.href} className="flex items-center gap-1.5">
            {link.icon ? <link.icon className="h-3.5 w-3.5" /> : null}
            {link.label}
          </Link>
        </Button>
      ))}
      {!simpleMode && <DropdownMenu>
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
          <DropdownMenuItem asChild><Link href="/timetable">Timetable</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/personal-branding">Branding</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/lead-generation">Lead Gen</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/finance">Finance</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/portfolio">Portfolio</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/support">Support</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/gamified-skills">Gamified Skills</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/formalization">Formalization</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/patterns">Patterns</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/purpose">Purpose</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/path">Path</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/charts">Charts</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/timesheet">Timesheet</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/cube">3D Cube</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/code-viz">3D Code Viz</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/canvas">Canvas</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/code-of-conduct">Code of Conduct</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>}
    </nav>
  );
}

const slotOrder: SlotName[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];
type OverviewTab = 'scheduled' | 'pending' | 'review' | 'daily' | 'routine';
type RoutineSourceFilter = 'all' | 'external' | 'mismatch';
type RoutineSourceType = 'external' | 'mismatch' | 'other';
type RoutineTaskView = Activity & { routineSource: RoutineSourceType };
type ManualRoutineSource = 'external' | 'mismatch' | 'none';

function UpcomingTasksModal({
    isOpen,
    onOpenChange,
    initialTab = 'scheduled',
}: {
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    initialTab?: OverviewTab,
}) {
    const { 
        coreSkills, 
        deepWorkDefinitions, 
        upskillDefinitions,
        getDescendantLeafNodes, 
        getDeepWorkNodeType,
        getUpskillNodeType,
        scheduleTaskFromMindMap, 
        currentSlot, 
        offerizationPlans,
        settings,
        setSettings,
        mindsetCards,
        setMindsetCards,
        schedule,
        setSchedule,
        dailyReviewLogs,
        workoutMode,
        workoutPlans,
        exerciseDefinitions,
        allWorkoutLogs,
        handleToggleDailyGoalCompletion,
        allUpskillLogs,
        allDeepWorkLogs,
        workoutPlanRotation,
    } = useAuth();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<OverviewTab>(initialTab);
    const [routineSourceFilter, setRoutineSourceFilter] = useState<RoutineSourceFilter>('all');
    const [routineSearch, setRoutineSearch] = useState('');
    const [isCreateRoutineOpen, setIsCreateRoutineOpen] = useState(false);
    const [newRoutineDetails, setNewRoutineDetails] = useState('');
    const [newRoutineSlot, setNewRoutineSlot] = useState<SlotName>('Morning');
    const [newRoutineType, setNewRoutineType] = useState<ActivityType>('essentials');
    const [newRoutineCostIn, setNewRoutineCostIn] = useState('');
    const [newRoutineCostOut, setNewRoutineCostOut] = useState('');
    const [newRoutineRuleType, setNewRoutineRuleType] = useState<'daily' | 'weekly' | 'custom'>('daily');
    const [newRoutineInterval, setNewRoutineInterval] = useState('2');
    const [newRoutineRepeatUnit, setNewRoutineRepeatUnit] = useState<'day' | 'week' | 'month'>('day');
    const [newRoutineSource, setNewRoutineSource] = useState<ManualRoutineSource>('none');
    const [newRoutineBotheringId, setNewRoutineBotheringId] = useState('');
    const [linkDialogRoutineId, setLinkDialogRoutineId] = useState<string | null>(null);
    const [linkDialogSource, setLinkDialogSource] = useState<'external' | 'mismatch'>('external');
    const [linkDialogBotheringId, setLinkDialogBotheringId] = useState('');
    const [editRoutineId, setEditRoutineId] = useState<string | null>(null);
    const [editRoutineDetails, setEditRoutineDetails] = useState('');
    const [editRoutineSlot, setEditRoutineSlot] = useState<SlotName>('Morning');
    const [editRoutineType, setEditRoutineType] = useState<ActivityType>('essentials');
    const [editRoutineCostIn, setEditRoutineCostIn] = useState('');
    const [editRoutineCostOut, setEditRoutineCostOut] = useState('');
    const [editRoutineRuleType, setEditRoutineRuleType] = useState<'daily' | 'weekly' | 'custom'>('daily');
    const [editRoutineInterval, setEditRoutineInterval] = useState('2');
    const [editRoutineRepeatUnit, setEditRoutineRepeatUnit] = useState<'day' | 'week' | 'month'>('day');
    const [editRoutineSource, setEditRoutineSource] = useState<ManualRoutineSource>('none');
    const [editRoutineBotheringId, setEditRoutineBotheringId] = useState('');

    useEffect(() => {
        if (isOpen) setActiveTab(initialTab);
    }, [isOpen, initialTab]);

    const DOUBLING_INTERVALS = [1, 2, 4, 8, 16, 32, 64, 128];

    const repetitionTasks = useMemo(() => {
        const repetitionSkills = coreSkills.flatMap(cs => 
            cs.skillAreas.flatMap(sa => 
                sa.microSkills.filter(ms => ms.isReadyForRepetition)
            )
        );

        return repetitionSkills.map(skill => {
            const intentions = deepWorkDefinitions.filter(def => def.category === skill.name);
            const curiosities = upskillDefinitions.filter(def => def.category === skill.name);
            const mainIntention = intentions.find(i => !deepWorkDefinitions.some(d => d.linkedDeepWorkIds?.includes(i.id)));
            const deepworkFallback = intentions.find((def) => getDeepWorkNodeType(def) === 'Intention') || intentions[0];
            const upskillFallback = curiosities.find((def) => getUpskillNodeType(def) === 'Curiosity') || curiosities[0];
            const fallbackDefinition = deepworkFallback || upskillFallback;
            const fallbackActivityType = deepworkFallback ? 'deepwork' : (upskillFallback ? 'upskill' : null);
            const deepWorkLeafNodes = intentions.flatMap(intention => getDescendantLeafNodes(intention.id, 'deepwork'));
            const upskillLeafNodes = curiosities.flatMap(curiosity => getDescendantLeafNodes(curiosity.id, 'upskill'));
            const allTrackableNodes = [...deepWorkLeafNodes, ...upskillLeafNodes];
            const fallbackNodes = [...intentions, ...curiosities];
            const completionDates = new Set<string>();
            (allTrackableNodes.length > 0 ? allTrackableNodes : fallbackNodes).forEach(node => {
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
                fallbackDefinitionId: fallbackDefinition?.id,
                fallbackActivityType,
                nextReviewDate: sortedDates.length > 0 ? nextReviewDate : new Date(),
                isOverdue: sortedDates.length > 0 && isBefore(nextReviewDate, startOfToday()),
            };
        });
    }, [coreSkills, deepWorkDefinitions, upskillDefinitions, getDescendantLeafNodes, getDeepWorkNodeType, getUpskillNodeType]);

    const { todaysReviewTasks, pendingReviewTasks } = useMemo(() => {
        const today = startOfToday();
        const todays = [];
        const pending = [];

        for (const task of repetitionTasks) {
            if (isToday(task.nextReviewDate)) {
                todays.push(task);
            } else if (isBefore(task.nextReviewDate, today)) {
                pending.push(task);
            }
        }
        
        const sortTasks = (tasks: any[]) => tasks.sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime());

        return { 
            todaysReviewTasks: sortTasks(todays),
            pendingReviewTasks: sortTasks(pending),
        };
    }, [repetitionTasks]);


    const handleScheduleClick = (skill: { mainIntentionId?: string; fallbackDefinitionId?: string; fallbackActivityType?: 'deepwork' | 'upskill' | null; name: string }) => {
        if (skill.mainIntentionId) {
            scheduleTaskFromMindMap(skill.mainIntentionId, 'spaced-repetition', currentSlot, 0, 'deepwork');
        } else if (skill.fallbackDefinitionId && skill.fallbackActivityType) {
            scheduleTaskFromMindMap(skill.fallbackDefinitionId, 'spaced-repetition', currentSlot, 0, skill.fallbackActivityType);
        } else {
            toast({
                title: "Cannot Schedule",
                description: `No schedulable task found for "${skill.name}".`,
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

    const routineSourceIds = useMemo(() => {
        const collectIdsForCard = (cardId: string) => {
            const ids = new Set<string>();
            const points = mindsetCards.find((card) => card.id === cardId)?.points || [];
            points.forEach((point) => {
                (point.tasks || []).forEach((task) => {
                    if (task.id) ids.add(task.id);
                    if (task.activityId) ids.add(task.activityId);
                });
            });
            return ids;
        };

        return {
            external: collectIdsForCard('mindset_botherings_external'),
            mismatch: collectIdsForCard('mindset_botherings_mismatch'),
        };
    }, [mindsetCards]);

    const routineLinkedBotheringByRoutineId = useMemo(() => {
        const map = new Map<string, { id: string; source: 'external' | 'mismatch'; text: string }>();
        const ingest = (cardId: string, source: 'external' | 'mismatch') => {
            const points = mindsetCards.find((card) => card.id === cardId)?.points || [];
            points.forEach((point) => {
                const text = (point.text || '').trim();
                if (!text) return;
                (point.tasks || []).forEach((task) => {
                    const rid = task.activityId || task.id;
                    if (!rid) return;
                    if (!map.has(rid)) {
                        map.set(rid, { id: point.id, source, text });
                    }
                });
            });
        };
        ingest('mindset_botherings_external', 'external');
        ingest('mindset_botherings_mismatch', 'mismatch');
        return map;
    }, [mindsetCards]);

    const externalBotherings = useMemo(
        () => (mindsetCards.find((card) => card.id === 'mindset_botherings_external')?.points || []).map((point) => ({ id: point.id, text: point.text || 'Untitled bothering' })),
        [mindsetCards]
    );
    const mismatchBotherings = useMemo(
        () => (mindsetCards.find((card) => card.id === 'mindset_botherings_mismatch')?.points || []).map((point) => ({ id: point.id, text: point.text || 'Untitled bothering' })),
        [mindsetCards]
    );
    const getBotheringsBySource = useCallback(
        (source: 'external' | 'mismatch') => (source === 'external' ? externalBotherings : mismatchBotherings),
        [externalBotherings, mismatchBotherings]
    );
    
    const routineTasks = useMemo(() => {
        return (settings.routines || []).map(task => {
            const override = settings.routineSourceOverrides?.[task.id];
            const routineSource: RoutineSourceType =
                override === 'external' || override === 'mismatch'
                    ? override
                    : routineSourceIds.external.has(task.id) || (task.taskIds || []).some((id) => routineSourceIds.external.has(id))
                        ? 'external'
                        : routineSourceIds.mismatch.has(task.id) || (task.taskIds || []).some((id) => routineSourceIds.mismatch.has(id))
                            ? 'mismatch'
                            : 'other';

            if (task.type === 'workout') {
                const { description } = getExercisesForDay(new Date(), workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling, allWorkoutLogs);
                return { ...task, details: description, routineSource } as RoutineTaskView;
            }
            return { ...task, routineSource } as RoutineTaskView;
        });
    }, [settings.routines, workoutMode, workoutPlans, exerciseDefinitions, allWorkoutLogs, workoutPlanRotation, settings.workoutScheduling, routineSourceIds, settings.routineSourceOverrides]);

    const routineSourceCounts = useMemo(() => {
        return {
            external: routineTasks.filter((task) => task.routineSource === 'external').length,
            mismatch: routineTasks.filter((task) => task.routineSource === 'mismatch').length,
        };
    }, [routineTasks]);

    const displayedRoutineTasks = useMemo(() => {
        const query = routineSearch.trim().toLowerCase();
        const filtered = routineTasks.filter((task) => {
            if (routineSourceFilter === 'all') return true;
            return task.routineSource === routineSourceFilter;
        }).filter((task) => {
            if (!query) return true;
            const details = task.details?.toLowerCase() || '';
            const type = task.type?.toLowerCase() || '';
            const slot = String(task.slot || '').toLowerCase();
            const source = task.routineSource.toLowerCase();
            return details.includes(query) || type.includes(query) || slot.includes(query) || source.includes(query);
        });

        const sourceRank: Record<RoutineSourceType, number> = {
            external: 0,
            mismatch: 1,
            other: 2,
        };

        return [...filtered].sort((a, b) => {
            const rankDiff = sourceRank[a.routineSource] - sourceRank[b.routineSource];
            if (rankDiff !== 0) return rankDiff;
            return a.details.localeCompare(b.details);
        });
    }, [routineTasks, routineSourceFilter, routineSearch]);

    const displayedRoutineTasksBySlot = useMemo(() => {
        const bySlot = new Map<string, RoutineTaskView[]>();
        slotOrder.forEach((slot) => bySlot.set(slot, []));
        const other: RoutineTaskView[] = [];

        displayedRoutineTasks.forEach((task) => {
            const slot = String(task.slot || '').trim();
            if (bySlot.has(slot)) {
                bySlot.get(slot)!.push(task);
            } else {
                other.push(task);
            }
        });

        const gridSlots = slotOrder.map((slot) => ({ slot, tasks: bySlot.get(slot) || [] }));
        return { gridSlots, other };
    }, [displayedRoutineTasks]);

    const getRoutineCadenceLabel = useCallback((task: Activity) => {
        const rule = task.routine;
        if (!rule) return 'One-time';
        if (rule.type === 'daily') return 'Daily';
        if (rule.type === 'weekly') return 'Weekly';
        const unit = rule.repeatUnit || 'day';
        const interval = Math.max(1, rule.repeatInterval ?? rule.days ?? 1);
        return `Every ${interval} ${unit}${interval > 1 ? 's' : ''}`;
    }, []);

    const getMindsetTaskRecurrence = useCallback((rule?: RecurrenceRule | null): 'none' | 'daily' | 'weekly' | 'custom' => {
        if (!rule) return 'none';
        if (rule.type === 'daily') return 'daily';
        if (rule.type === 'weekly') return 'weekly';
        return 'custom';
    }, []);

    const detachRoutineFromAllBotherings = useCallback((routineId: string) => {
        setMindsetCards((prev) =>
            prev.map((card) => {
                if (card.id !== 'mindset_botherings_external' && card.id !== 'mindset_botherings_mismatch') return card;
                return {
                    ...card,
                    points: card.points.map((point) => ({
                        ...point,
                        tasks: (point.tasks || []).filter((task) => task.id !== routineId && task.activityId !== routineId),
                    })),
                };
            })
        );
    }, [setMindsetCards]);

    const attachRoutineToBothering = useCallback((routine: Activity, source: 'external' | 'mismatch', botheringId: string) => {
        const cardId = source === 'external' ? 'mindset_botherings_external' : 'mindset_botherings_mismatch';
        const recurrence = getMindsetTaskRecurrence(routine.routine);
        const taskPayload = {
            id: routine.id,
            type: routine.type,
            details: routine.details,
            completed: false,
            activityId: routine.id,
            slotName: (slotOrder.includes(routine.slot as SlotName) ? routine.slot : undefined) as SlotName | undefined,
            recurrence,
            repeatInterval: routine.routine?.repeatInterval ?? routine.routine?.days,
            repeatUnit: routine.routine?.repeatUnit,
            startDate: routine.baseDate || format(new Date(), 'yyyy-MM-dd'),
            completionHistory: {},
        };

        detachRoutineFromAllBotherings(routine.id);
        setMindsetCards((prev) =>
            prev.map((card) => {
                if (card.id !== cardId) return card;
                return {
                    ...card,
                    points: card.points.map((point) => {
                        if (point.id !== botheringId) return point;
                        const existing = (point.tasks || []).find((task) => task.activityId === routine.id || task.id === routine.id);
                        if (existing) {
                            return {
                                ...point,
                                tasks: (point.tasks || []).map((task) =>
                                    task.activityId === routine.id || task.id === routine.id ? { ...task, ...taskPayload } : task
                                ),
                            };
                        }
                        return { ...point, tasks: [...(point.tasks || []), taskPayload] };
                    }),
                };
            })
        );
    }, [detachRoutineFromAllBotherings, getMindsetTaskRecurrence, setMindsetCards]);

    const handleSetRoutineSource = useCallback((routineId: string, source: ManualRoutineSource) => {
        if (source === 'none') {
            detachRoutineFromAllBotherings(routineId);
        }
        setSettings((prev) => {
            const nextOverrides = { ...(prev.routineSourceOverrides || {}) };
            if (source === 'none') {
                delete nextOverrides[routineId];
            } else {
                nextOverrides[routineId] = source;
            }
            return { ...prev, routineSourceOverrides: nextOverrides };
        });
        toast({ title: 'Routine Link Updated', description: source === 'none' ? 'Removed manual source link.' : `Linked routine to ${source}.` });
    }, [detachRoutineFromAllBotherings, setSettings, toast]);

    const openRoutineLinkDialog = useCallback((routineId: string, source: 'external' | 'mismatch') => {
        setLinkDialogRoutineId(routineId);
        setLinkDialogSource(source);
        const list = getBotheringsBySource(source);
        setLinkDialogBotheringId(list[0]?.id || '');
    }, [getBotheringsBySource]);

    const openEditRoutineDialog = useCallback((task: RoutineTaskView) => {
        const source: ManualRoutineSource =
            task.routineSource === 'external' || task.routineSource === 'mismatch' ? task.routineSource : 'none';
        const linked = routineLinkedBotheringByRoutineId.get(task.id);
        const recurrence = task.routine?.type || 'daily';
        setEditRoutineId(task.id);
        setEditRoutineDetails(task.details || '');
        setEditRoutineSlot((slotOrder.includes(task.slot as SlotName) ? task.slot : 'Morning') as SlotName);
        setEditRoutineType(task.type);
        setEditRoutineCostIn(task.costIn != null ? String(task.costIn) : '');
        setEditRoutineCostOut(task.costOut != null ? String(task.costOut) : task.cost != null ? String(task.cost) : '');
        setEditRoutineRuleType(recurrence);
        setEditRoutineInterval(String(Math.max(1, task.routine?.repeatInterval ?? task.routine?.days ?? 2)));
        setEditRoutineRepeatUnit((task.routine?.repeatUnit || 'day') as 'day' | 'week' | 'month');
        setEditRoutineSource(source);
        setEditRoutineBotheringId(source !== 'none' ? (linked?.id || getBotheringsBySource(source)[0]?.id || '') : '');
    }, [getBotheringsBySource, routineLinkedBotheringByRoutineId]);

    const confirmRoutineBotheringLink = useCallback(() => {
        if (!linkDialogRoutineId) return;
        if (!linkDialogBotheringId) {
            toast({ title: 'Select Bothering', description: 'Choose a bothering to link this routine.', variant: 'destructive' });
            return;
        }
        const routine = (settings.routines || []).find((r) => r.id === linkDialogRoutineId);
        if (!routine) {
            toast({ title: 'Routine Not Found', description: 'Could not locate this routine task.', variant: 'destructive' });
            return;
        }

        handleSetRoutineSource(linkDialogRoutineId, linkDialogSource);
        attachRoutineToBothering(routine, linkDialogSource, linkDialogBotheringId);
        setLinkDialogRoutineId(null);
        setLinkDialogBotheringId('');
    }, [attachRoutineToBothering, handleSetRoutineSource, linkDialogBotheringId, linkDialogRoutineId, linkDialogSource, settings.routines, toast]);

    const handleSaveRoutineEdit = useCallback(() => {
        if (!editRoutineId) return;
        const details = editRoutineDetails.trim();
        if (!details) {
            toast({ title: 'Missing Name', description: 'Enter a routine task name.', variant: 'destructive' });
            return;
        }
        if (editRoutineSource !== 'none' && !editRoutineBotheringId) {
            toast({ title: 'Select Bothering', description: 'Choose a bothering for External/Mismatch link.', variant: 'destructive' });
            return;
        }
        const costInRaw = editRoutineCostIn.trim();
        const costOutRaw = editRoutineCostOut.trim();
        const costInValue = costInRaw === '' ? null : Number(costInRaw);
        const costOutValue = costOutRaw === '' ? null : Number(costOutRaw);
        const normalizedCostIn = Number.isFinite(costInValue as number) ? Math.max(0, costInValue as number) : null;
        const normalizedCostOut = Number.isFinite(costOutValue as number) ? Math.max(0, costOutValue as number) : null;

        const updatedRule: RecurrenceRule =
            editRoutineRuleType === 'custom'
                ? {
                    type: 'custom',
                    repeatInterval: Math.max(1, parseInt(editRoutineInterval || '1', 10) || 1),
                    repeatUnit: editRoutineRepeatUnit,
                }
                : { type: editRoutineRuleType };

        const current = (settings.routines || []).find((r) => r.id === editRoutineId);
        if (!current) {
            toast({ title: 'Routine Not Found', description: 'Could not find this routine.', variant: 'destructive' });
            return;
        }
        const updatedRoutine: Activity = {
            ...current,
            details,
            slot: editRoutineSlot,
            type: editRoutineType,
            costIn: normalizedCostIn,
            costOut: normalizedCostOut,
            cost: normalizedCostOut,
            routine: updatedRule,
        };

        setSettings((prev) => {
            const nextOverrides = { ...(prev.routineSourceOverrides || {}) };
            if (editRoutineSource === 'none') {
                delete nextOverrides[editRoutineId];
            } else {
                nextOverrides[editRoutineId] = editRoutineSource;
            }
            return {
                ...prev,
                routines: (prev.routines || []).map((r) => (r.id === editRoutineId ? updatedRoutine : r)),
                routineSourceOverrides: nextOverrides,
            };
        });

        setSchedule((prev) => {
            const next = { ...prev };
            let changed = false;
            Object.keys(next).forEach((dateKey) => {
                const day = { ...(next[dateKey] || {}) };
                const moved: Activity[] = [];
                Object.keys(day).forEach((slotName) => {
                    const list = (day[slotName as SlotName] as Activity[]) || [];
                    const kept: Activity[] = [];
                    let slotChanged = false;
                    list.forEach((activity) => {
                        const isMatch =
                            activity.id === editRoutineId ||
                            activity.id.startsWith(`${editRoutineId}_`) ||
                            (activity.taskIds || []).includes(editRoutineId);
                        if (!isMatch) {
                            kept.push(activity);
                            return;
                        }
                        slotChanged = true;
                        changed = true;
                        moved.push({
                            ...activity,
                            details,
                            type: editRoutineType,
                            slot: editRoutineSlot,
                            costIn: normalizedCostIn,
                            costOut: normalizedCostOut,
                            cost: normalizedCostOut,
                        });
                    });
                    if (slotChanged) day[slotName as SlotName] = kept;
                });
                if (moved.length > 0) {
                    const target = ((day[editRoutineSlot] as Activity[]) || []).concat(moved);
                    day[editRoutineSlot] = target;
                }
                next[dateKey] = day;
            });
            return changed ? next : prev;
        });

        setMindsetCards((prev) =>
            prev.map((card) => {
                if (card.id !== 'mindset_botherings_external' && card.id !== 'mindset_botherings_mismatch') return card;
                return {
                    ...card,
                    points: card.points.map((point) => ({
                        ...point,
                        tasks: (point.tasks || []).map((task) => {
                            if (task.id !== editRoutineId && task.activityId !== editRoutineId) return task;
                            return {
                                ...task,
                                details,
                                type: editRoutineType,
                                slotName: editRoutineSlot,
                                recurrence: getMindsetTaskRecurrence(updatedRule),
                                repeatInterval: updatedRule.repeatInterval ?? updatedRule.days,
                                repeatUnit: updatedRule.repeatUnit,
                            };
                        }),
                    })),
                };
            })
        );

        if (editRoutineSource === 'none') {
            detachRoutineFromAllBotherings(editRoutineId);
        } else {
            attachRoutineToBothering(updatedRoutine, editRoutineSource, editRoutineBotheringId);
        }

        setEditRoutineId(null);
        toast({ title: 'Routine Updated', description: 'Changes applied across routine, schedule, and linked botherings.' });
    }, [
        attachRoutineToBothering,
        editRoutineBotheringId,
        editRoutineDetails,
        editRoutineId,
        editRoutineInterval,
        editRoutineCostIn,
        editRoutineCostOut,
        editRoutineRepeatUnit,
        editRoutineRuleType,
        editRoutineSlot,
        editRoutineSource,
        editRoutineType,
        getMindsetTaskRecurrence,
        detachRoutineFromAllBotherings,
        setMindsetCards,
        setSchedule,
        setSettings,
        settings.routines,
        toast,
    ]);

    const handleCreateRoutine = useCallback(() => {
        const details = newRoutineDetails.trim();
        if (!details) {
            toast({ title: 'Missing Name', description: 'Enter a routine task name.', variant: 'destructive' });
            return;
        }
        if (newRoutineSource !== 'none' && !newRoutineBotheringId) {
            toast({ title: 'Select Bothering', description: 'Choose a bothering when linking External/Mismatch.', variant: 'destructive' });
            return;
        }
        const costInRaw = newRoutineCostIn.trim();
        const costOutRaw = newRoutineCostOut.trim();
        const costInValue = costInRaw === '' ? null : Number(costInRaw);
        const costOutValue = costOutRaw === '' ? null : Number(costOutRaw);
        const normalizedCostIn = Number.isFinite(costInValue as number) ? Math.max(0, costInValue as number) : null;
        const normalizedCostOut = Number.isFinite(costOutValue as number) ? Math.max(0, costOutValue as number) : null;

        const rule: RecurrenceRule =
            newRoutineRuleType === 'custom'
                ? {
                    type: 'custom',
                    repeatInterval: Math.max(1, parseInt(newRoutineInterval || '1', 10) || 1),
                    repeatUnit: newRoutineRepeatUnit,
                }
                : { type: newRoutineRuleType };

        const routineId = `routine-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const newRoutine: Activity = {
            id: routineId,
            type: newRoutineType,
            details,
            completed: false,
            slot: newRoutineSlot,
            costIn: normalizedCostIn,
            costOut: normalizedCostOut,
            cost: normalizedCostOut,
            routine: rule,
            isRoutine: true,
            baseDate: format(new Date(), 'yyyy-MM-dd'),
            taskIds: [],
        };

        setSettings((prev) => {
            const nextOverrides = { ...(prev.routineSourceOverrides || {}) };
            if (newRoutineSource !== 'none') {
                nextOverrides[routineId] = newRoutineSource;
            }
            return {
                ...prev,
                routines: [...(prev.routines || []), newRoutine],
                routineSourceOverrides: nextOverrides,
            };
        });
        if (newRoutineSource !== 'none' && newRoutineBotheringId) {
            attachRoutineToBothering(newRoutine, newRoutineSource, newRoutineBotheringId);
        }

        setNewRoutineDetails('');
        setNewRoutineInterval('2');
        setNewRoutineRuleType('daily');
        setNewRoutineRepeatUnit('day');
        setNewRoutineType('essentials');
        setNewRoutineSlot('Morning');
        setNewRoutineCostIn('');
        setNewRoutineCostOut('');
        setNewRoutineSource('none');
        setNewRoutineBotheringId('');
        setIsCreateRoutineOpen(false);
        toast({ title: 'Routine Created', description: `Added "${details}" to ${newRoutineSlot}.` });
    }, [
        attachRoutineToBothering,
        newRoutineBotheringId,
        newRoutineDetails,
        newRoutineInterval,
        newRoutineCostIn,
        newRoutineCostOut,
        newRoutineRepeatUnit,
        newRoutineRuleType,
        newRoutineSlot,
        newRoutineSource,
        newRoutineType,
        setSettings,
        toast,
    ]);
    
    const todaysScheduledTasks = useMemo(() => {
        const todaysSchedule = schedule[todayKey] || {};
        const tasks: Activity[] = [];
        
        const routineTaskIdentifiers = new Set(routineTasks.map(rt => {
            return `${rt.details}_${rt.type}_${rt.slot}`;
        }));
        
        const reviewTaskDefIds = new Set([
            ...todaysReviewTasks.map(rt => rt.mainIntentionId),
            ...pendingReviewTasks.map(rt => rt.mainIntentionId),
        ]);

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
    }, [schedule, todayKey, routineTasks, todaysReviewTasks, pendingReviewTasks, allUpskillLogs, allDeepWorkLogs]);

    const pendingDailyGoalsCount = useMemo(
        () => dailyLearningGoals.filter((goal) => !todaysCompletions.has(goal.resourceId)).length,
        [dailyLearningGoals, todaysCompletions]
    );

    const overviewNavItems: Array<{
        key: OverviewTab;
        label: string;
        count: number;
        icon: React.ComponentType<{ className?: string }>;
        countVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
    }> = [
        { key: 'scheduled', label: 'Scheduled', count: todaysScheduledTasks.length, icon: CalendarIcon, countVariant: 'secondary' },
        { key: 'pending', label: 'Pending', count: pendingReviewTasks.length, icon: Repeat, countVariant: 'destructive' },
        { key: 'review', label: 'Review', count: todaysReviewTasks.length, icon: Book, countVariant: 'secondary' },
        { key: 'daily', label: 'Daily Goals', count: pendingDailyGoalsCount, icon: CheckSquare, countVariant: 'secondary' },
        { key: 'routine', label: 'Routine', count: routineTasks.length, icon: Workflow, countVariant: 'secondary' },
    ];
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-[95vw] h-[95vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="border-b border-border/60 px-6 pb-2 pt-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <DialogTitle className="flex items-center gap-2">
                                <Info className="h-5 w-5 text-blue-500" />
                                Today's Learning Overview
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                A summary of your goals and review tasks for the day.
                            </DialogDescription>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <div className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/20 p-1">
                                {overviewNavItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.key;
                                    return (
                                        <Button
                                            key={item.key}
                                            size="icon"
                                            variant={isActive ? 'secondary' : 'ghost'}
                                            className="relative h-8 w-8"
                                            onClick={() => setActiveTab(item.key)}
                                            title={item.label}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span className="sr-only">{item.label}</span>
                                            <Badge
                                                variant={item.countVariant || 'secondary'}
                                                className="absolute -right-2 -top-2 h-5 min-w-[20px] px-1 text-[10px]"
                                            >
                                                {item.count}
                                            </Badge>
                                        </Button>
                                    );
                                })}
                            </div>
                            {activeTab === 'routine' && (
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={routineSearch}
                                            onChange={(e) => setRoutineSearch(e.target.value)}
                                            placeholder="Search routines..."
                                            className="h-6 w-44 rounded-md pl-7 text-[11px] md:w-52"
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        className="h-6 px-2 text-[11px]"
                                        variant={routineSourceFilter === 'all' ? 'default' : 'outline'}
                                        onClick={() => setRoutineSourceFilter('all')}
                                    >
                                        All {routineTasks.length}
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-6 px-2 text-[11px]"
                                        variant={routineSourceFilter === 'external' ? 'default' : 'outline'}
                                        onClick={() => setRoutineSourceFilter('external')}
                                    >
                                        External {routineSourceCounts.external}
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-6 px-2 text-[11px]"
                                        variant={routineSourceFilter === 'mismatch' ? 'default' : 'outline'}
                                        onClick={() => setRoutineSourceFilter('mismatch')}
                                    >
                                        Mismatch {routineSourceCounts.mismatch}
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-6 px-2 text-[11px]"
                                        variant={isCreateRoutineOpen ? 'secondary' : 'outline'}
                                        onClick={() => setIsCreateRoutineOpen(true)}
                                    >
                                        <Plus className="mr-1 h-3 w-3" />
                                        Routine
                                    </Button>
                                    <Badge variant="outline" className="h-6 px-2 text-[11px]">Filtered {displayedRoutineTasks.length}</Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogHeader>
                <div className="flex-1 min-h-0 px-6 pb-4 pt-2">
                    {activeTab === 'scheduled' && (
                       <ScrollArea className="h-full">
                            <ul className="space-y-3 pr-4">
                                {todaysScheduledTasks.map((task) => (
                                    <li key={task.id} className="p-4 rounded-lg border bg-muted/30">
                                        <div className="flex items-start">
                                            <div className="flex-grow">
                                                <p className="font-semibold text-base">{task.details}</p>
                                                <p className="text-sm text-muted-foreground mt-1">{task.slot}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                                {todaysScheduledTasks.length === 0 && (
                                    <p className="text-center text-muted-foreground pt-12">No other tasks scheduled for today.</p>
                                )}
                            </ul>
                        </ScrollArea>
                    )}
                    {activeTab === 'pending' && (
                        <ScrollArea className="h-full">
                            <ul className="space-y-3 pr-4">
                                {pendingReviewTasks.map(skill => (
                                    <li key={skill.id} className="flex items-center justify-between p-4 rounded-lg border bg-destructive/10">
                                        <div>
                                            <p className="font-semibold text-base">{skill.name}</p>
                                            <p className="text-sm text-destructive mt-1">
                                                Due: {format(skill.nextReviewDate, 'PPP')}
                                            </p>
                                        </div>
                                        <Button size="sm" onClick={() => handleScheduleClick(skill)}>Schedule</Button>
                                    </li>
                                ))}
                                {pendingReviewTasks.length === 0 && (
                                    <p className="text-center text-muted-foreground pt-12">No overdue review tasks.</p>
                                )}
                            </ul>
                        </ScrollArea>
                    )}
                    {activeTab === 'review' && (
                        <ScrollArea className="h-full">
                            <ul className="space-y-3 pr-4">
                                {todaysReviewTasks.map(skill => (
                                    <li key={skill.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                        <div>
                                            <p className="font-semibold text-base">{skill.name}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Due: {format(skill.nextReviewDate, 'PPP')}
                                            </p>
                                        </div>
                                        <Button size="sm" onClick={() => handleScheduleClick(skill)}>Schedule</Button>
                                    </li>
                                ))}
                                {todaysReviewTasks.length === 0 && (
                                    <p className="text-center text-muted-foreground pt-12">No skills to review today.</p>
                                )}
                            </ul>
                        </ScrollArea>
                    )}
                    {activeTab === 'daily' && (
                       <ScrollArea className="h-full">
                            <ul className="space-y-3 pr-4">
                                {dailyLearningGoals.map((goal, index) => {
                                    const isCompletedToday = todaysCompletions.has(goal.resourceId);
                                    return (
                                        <li key={index} className="p-4 rounded-lg border bg-muted/30">
                                            <div className="flex items-start">
                                                <Checkbox
                                                    id={`goal-check-modal-${goal.resourceId}`}
                                                    checked={isCompletedToday}
                                                    onCheckedChange={() => handleToggleDailyGoalCompletion(goal.resourceId)}
                                                    className="mr-2 mt-0.5"
                                                />
                                                <div className="flex-grow">
                                                    <p className={cn("font-semibold text-base", isCompletedToday && "line-through text-muted-foreground")} title={goal.resourceName}>{goal.resourceName}</p>
                                                    <p className={cn("text-sm text-muted-foreground mt-1", isCompletedToday && "line-through")}>{goal.specName}</p>
                                                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                                        <Badge variant="secondary" className={cn("text-xs", isCompletedToday && "line-through")}>{goal.progress}</Badge>
                                                        <Badge variant="default" className={cn("text-xs", isCompletedToday && "line-through")}>{goal.dailyTarget}</Badge>
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
                    )}
                    {activeTab === 'routine' && (
                        <div className="h-full min-h-0 pr-2">
                            {displayedRoutineTasks.length > 0 ? (
                                <div className="h-full min-h-0 pr-4">
                                    <div className="h-full min-h-0 overflow-x-auto">
                                        <div className="grid h-full min-h-0 min-w-[1500px] grid-cols-6 gap-3">
                                        {displayedRoutineTasksBySlot.gridSlots.map((group) => (
                                            <div key={group.slot} className="min-h-0 h-full rounded-lg border border-border/60 bg-muted/20 flex flex-col">
                                                <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                                                    <h4 className="text-sm font-semibold">{group.slot}</h4>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {(group.slot === 'Night' ? group.tasks.length + displayedRoutineTasksBySlot.other.length : group.tasks.length)}
                                                    </Badge>
                                                </div>
                                                <ScrollArea className="flex-1 min-h-0">
                                                    <div className="space-y-2 p-3">
                                                        {(group.slot === 'Night' ? [...group.tasks, ...displayedRoutineTasksBySlot.other] : group.tasks).length > 0 ? (
                                                            (group.slot === 'Night' ? [...group.tasks, ...displayedRoutineTasksBySlot.other] : group.tasks).map((task, index) => (
                                                                <div key={`${task.id}-${index}`} className="rounded-md border bg-background/70 p-3">
                                                                    <div className="space-y-2">
                                                                        <div className="min-w-0">
                                                                            <p className="font-semibold text-sm leading-snug break-words">{task.details}</p>
                                                                        </div>
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            {(task.routineSource === 'external' || task.routineSource === 'mismatch') && (
                                                                                <Badge
                                                                                    variant="default"
                                                                                    className={cn(
                                                                                        "text-xs capitalize",
                                                                                        task.routineSource === 'external'
                                                                                            ? "bg-sky-500/20 text-sky-300 border border-sky-400/40"
                                                                                            : "bg-rose-500/20 text-rose-300 border border-rose-400/40"
                                                                                    )}
                                                                                >
                                                                                    {task.routineSource}
                                                                                </Badge>
                                                                            )}
                                                                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => openEditRoutineDialog(task)}>
                                                                                <Pencil className="h-3 w-3" />
                                                                                <span className="sr-only">Edit Routine</span>
                                                                            </Button>
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <Button size="icon" variant="ghost" className="h-5 w-5">
                                                                                        <Link2 className="h-3 w-3" />
                                                                                        <span className="sr-only">Link Routine Source</span>
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="end">
                                                                                    <DropdownMenuItem onSelect={() => openRoutineLinkDialog(task.id, 'external')}>Link External</DropdownMenuItem>
                                                                                    <DropdownMenuItem onSelect={() => openRoutineLinkDialog(task.id, 'mismatch')}>Link Mismatch</DropdownMenuItem>
                                                                                    <DropdownMenuSeparator />
                                                                                    <DropdownMenuItem onSelect={() => handleSetRoutineSource(task.id, 'none')}>Remove Link</DropdownMenuItem>
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                            <Badge variant="outline" className="text-xs">{task.type}</Badge>
                                                                            <Badge variant="secondary" className="text-xs">{getRoutineCadenceLabel(task)}</Badge>
                                                                        </div>
                                                                        {(() => {
                                                                            const linked = routineLinkedBotheringByRoutineId.get(task.id);
                                                                            return linked ? (
                                                                                <div className="pt-1">
                                                                                    <Badge variant="outline" className="text-xs leading-normal whitespace-normal break-words">
                                                                                        {linked.text}
                                                                                    </Badge>
                                                                                </div>
                                                                            ) : null;
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="rounded-md border border-dashed border-border/60 bg-background/40 px-3 py-10 text-center text-xs text-muted-foreground">
                                                                No tasks in this slot.
                                                            </div>
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground pt-12 pr-4">
                                    {routineTasks.length === 0 ? 'No routine tasks configured.' : 'No routine tasks for this source filter.'}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                <Dialog open={isCreateRoutineOpen} onOpenChange={setIsCreateRoutineOpen}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create Routine Task</DialogTitle>
                            <DialogDescription>
                                Add a recurring task and optionally link it to External or Mismatch.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Task</p>
                                <input
                                    value={newRoutineDetails}
                                    onChange={(e) => setNewRoutineDetails(e.target.value)}
                                    placeholder="e.g., Weekly billing review"
                                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Time Slot</p>
                                    <select
                                        value={newRoutineSlot}
                                        onChange={(e) => setNewRoutineSlot(e.target.value as SlotName)}
                                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                    >
                                        {slotOrder.map((slot) => (
                                            <option key={slot} value={slot}>{slot}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Task Type</p>
                                    <select
                                        value={newRoutineType}
                                        onChange={(e) => setNewRoutineType(e.target.value as ActivityType)}
                                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                    >
                                        {['essentials', 'interrupt', 'planning', 'upskill', 'deepwork', 'branding', 'lead-generation', 'finance', 'mindset', 'tracking', 'workout', 'nutrition'].map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Cost In (optional)</p>
                                    <input
                                        value={newRoutineCostIn}
                                        onChange={(e) => setNewRoutineCostIn(e.target.value)}
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="0"
                                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <p className="text-xs font-medium text-muted-foreground">Cost Out (optional)</p>
                                    <input
                                        value={newRoutineCostOut}
                                        onChange={(e) => setNewRoutineCostOut(e.target.value)}
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="0"
                                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                                <p className="text-xs font-medium text-muted-foreground">Recurrence</p>
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                    <select
                                        value={newRoutineRuleType}
                                        onChange={(e) => setNewRoutineRuleType(e.target.value as 'daily' | 'weekly' | 'custom')}
                                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                    {newRoutineRuleType === 'custom' ? (
                                        <>
                                            <input
                                                value={newRoutineInterval}
                                                onChange={(e) => setNewRoutineInterval(e.target.value)}
                                                type="number"
                                                min={1}
                                                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                                placeholder="Every"
                                            />
                                            <select
                                                value={newRoutineRepeatUnit}
                                                onChange={(e) => setNewRoutineRepeatUnit(e.target.value as 'day' | 'week' | 'month')}
                                                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                            >
                                                <option value="day">day(s)</option>
                                                <option value="week">week(s)</option>
                                                <option value="month">month(s)</option>
                                            </select>
                                        </>
                                    ) : (
                                        <p className="col-span-2 flex items-center text-xs text-muted-foreground">
                                            {newRoutineRuleType === 'daily' ? 'Runs every day.' : 'Runs once every week.'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Optional Link</p>
                                <select
                                    value={newRoutineSource}
                                    onChange={(e) => {
                                        const source = e.target.value as ManualRoutineSource;
                                        setNewRoutineSource(source);
                                        if (source === 'external' || source === 'mismatch') {
                                            const list = getBotheringsBySource(source);
                                            setNewRoutineBotheringId(list[0]?.id || '');
                                        } else {
                                            setNewRoutineBotheringId('');
                                        }
                                    }}
                                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm md:w-64"
                                >
                                    <option value="none">No Link</option>
                                    <option value="external">Link External</option>
                                    <option value="mismatch">Link Mismatch</option>
                                </select>
                                {newRoutineSource !== 'none' && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Select Bothering</p>
                                        <Select value={newRoutineBotheringId || undefined} onValueChange={setNewRoutineBotheringId}>
                                            <SelectTrigger className="h-10 w-full md:w-[28rem]">
                                                <SelectValue placeholder={`Select ${newRoutineSource} bothering...`} />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60">
                                                {getBotheringsBySource(newRoutineSource).length > 0 ? (
                                                    getBotheringsBySource(newRoutineSource).map((point) => (
                                                        <SelectItem key={point.id} value={point.id}>{point.text}</SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value="__none__" disabled>No botherings available</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {getBotheringsBySource(newRoutineSource).length === 0 && (
                                            <p className="text-xs text-amber-400">
                                                No {newRoutineSource} botherings found. Add one in Mindset first.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                                <Button size="sm" variant="outline" className="h-9" onClick={() => setIsCreateRoutineOpen(false)}>Cancel</Button>
                                <Button size="sm" className="h-9" onClick={handleCreateRoutine}>
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Create Routine
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
                <Dialog open={!!editRoutineId} onOpenChange={(open) => !open && setEditRoutineId(null)}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit Routine Task</DialogTitle>
                            <DialogDescription>
                                Update this routine. Changes will reflect in timetable instances and linked bothering tasks.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Task</p>
                                <input
                                    value={editRoutineDetails}
                                    onChange={(e) => setEditRoutineDetails(e.target.value)}
                                    placeholder="Routine task name..."
                                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Time Slot</p>
                                    <select
                                        value={editRoutineSlot}
                                        onChange={(e) => setEditRoutineSlot(e.target.value as SlotName)}
                                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                    >
                                        {slotOrder.map((slot) => (
                                            <option key={slot} value={slot}>{slot}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Task Type</p>
                                    <select
                                        value={editRoutineType}
                                        onChange={(e) => setEditRoutineType(e.target.value as ActivityType)}
                                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                    >
                                        {['essentials', 'interrupt', 'planning', 'upskill', 'deepwork', 'branding', 'lead-generation', 'finance', 'mindset', 'tracking', 'workout', 'nutrition'].map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Cost In (optional)</p>
                                    <input
                                        value={editRoutineCostIn}
                                        onChange={(e) => setEditRoutineCostIn(e.target.value)}
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="0"
                                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                    />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <p className="text-xs font-medium text-muted-foreground">Cost Out (optional)</p>
                                    <input
                                        value={editRoutineCostOut}
                                        onChange={(e) => setEditRoutineCostOut(e.target.value)}
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        placeholder="0"
                                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                                <p className="text-xs font-medium text-muted-foreground">Recurrence</p>
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                    <select
                                        value={editRoutineRuleType}
                                        onChange={(e) => setEditRoutineRuleType(e.target.value as 'daily' | 'weekly' | 'custom')}
                                        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                    {editRoutineRuleType === 'custom' ? (
                                        <>
                                            <input
                                                value={editRoutineInterval}
                                                onChange={(e) => setEditRoutineInterval(e.target.value)}
                                                type="number"
                                                min={1}
                                                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                                placeholder="Every"
                                            />
                                            <select
                                                value={editRoutineRepeatUnit}
                                                onChange={(e) => setEditRoutineRepeatUnit(e.target.value as 'day' | 'week' | 'month')}
                                                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                            >
                                                <option value="day">day(s)</option>
                                                <option value="week">week(s)</option>
                                                <option value="month">month(s)</option>
                                            </select>
                                        </>
                                    ) : (
                                        <p className="col-span-2 flex items-center text-xs text-muted-foreground">
                                            {editRoutineRuleType === 'daily' ? 'Runs every day.' : 'Runs once every week.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Link</p>
                                <select
                                    value={editRoutineSource}
                                    onChange={(e) => {
                                        const source = e.target.value as ManualRoutineSource;
                                        setEditRoutineSource(source);
                                        if (source === 'external' || source === 'mismatch') {
                                            const list = getBotheringsBySource(source);
                                            setEditRoutineBotheringId(list[0]?.id || '');
                                        } else {
                                            setEditRoutineBotheringId('');
                                        }
                                    }}
                                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm md:w-64"
                                >
                                    <option value="none">No Link</option>
                                    <option value="external">Link External</option>
                                    <option value="mismatch">Link Mismatch</option>
                                </select>
                                {editRoutineSource !== 'none' && (
                                    <Select value={editRoutineBotheringId || undefined} onValueChange={setEditRoutineBotheringId}>
                                        <SelectTrigger className="h-10 w-full md:w-[28rem]">
                                            <SelectValue placeholder={`Select ${editRoutineSource} bothering...`} />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                            {getBotheringsBySource(editRoutineSource).length > 0 ? (
                                                getBotheringsBySource(editRoutineSource).map((point) => (
                                                    <SelectItem key={point.id} value={point.id}>{point.text}</SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="__none__" disabled>No botherings available</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                                <Button size="sm" variant="outline" className="h-9" onClick={() => setEditRoutineId(null)}>Cancel</Button>
                                <Button size="sm" className="h-9" onClick={handleSaveRoutineEdit}>
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
                <Dialog open={!!linkDialogRoutineId} onOpenChange={(open) => !open && setLinkDialogRoutineId(null)}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Link Routine to Bothering</DialogTitle>
                            <DialogDescription>
                                Select a {linkDialogSource} bothering to attach this routine task.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Bothering</p>
                                <Select value={linkDialogBotheringId || undefined} onValueChange={setLinkDialogBotheringId}>
                                    <SelectTrigger className="h-10 w-full">
                                        <SelectValue placeholder={`Select ${linkDialogSource} bothering...`} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {getBotheringsBySource(linkDialogSource).length > 0 ? (
                                            getBotheringsBySource(linkDialogSource).map((point) => (
                                                <SelectItem key={point.id} value={point.id}>{point.text}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="__none__" disabled>No botherings available</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                {getBotheringsBySource(linkDialogSource).length === 0 && (
                                    <p className="text-xs text-amber-400">
                                        No {linkDialogSource} botherings found. Add one in Mindset first.
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                                <Button size="sm" variant="outline" onClick={() => setLinkDialogRoutineId(null)}>Cancel</Button>
                                <Button size="sm" onClick={confirmRoutineBotheringLink} disabled={getBotheringsBySource(linkDialogSource).length === 0}>
                                    Link
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
}


export function Header() {
  const { 
    currentUser, 
    signOut, 
    settings,
    isDemoTokenModalOpen, 
    setIsDemoTokenModalOpen, 
    pushDemoDataWithToken,
    syncWithGitHub,
    downloadFromGitHub,
    gitHubSyncNotification,
    dismissGitHubSyncNotification,
    openMindsetWidget,
    openDrawingCanvasFromHeader,
  } = useAuth();

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUpcomingTasksModalOpen, setIsUpcomingTasksModalOpen] = useState(false);
  const [upcomingTasksInitialTab, setUpcomingTasksInitialTab] = useState<OverviewTab>('scheduled');
  const [isHabitDashboardOpen, setIsHabitDashboardOpen] = useState(false);
  const [isStateDiagramOpen, setIsStateDiagramOpen] = useState(false);
  const [isLearningPerformanceOpen, setIsLearningPerformanceOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const openStateDiagram = () => setIsStateDiagramOpen(true);
    window.addEventListener('open-state-diagram', openStateDiagram);
    return () => window.removeEventListener('open-state-diagram', openStateDiagram);
  }, []);
  const [habitDashboardMonth, setHabitDashboardMonth] = useState(startOfMonth(new Date()));
  const isMobile = useIsMobile();
  const simpleMode = settings.ispSimpleMode ?? true;
  const keepCanvasAndBotheringsInSimpleMode = settings.ispSimpleKeepCanvasAndBotherings ?? true;
  
  if (isMobile) {
    return null;
  }

  return (
    <>
      <div className="h-14" />
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 w-full items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8" />
            <Link href="/" className="flex items-center gap-2">
              <BrainCircuit className="h-6 w-6 text-primary" />
              <span className="font-bold">Dock</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSearchOpen(true)}>
                <Search className="h-4 w-4" />
                <span className="sr-only">Search</span>
              </Button>
              <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                <Link href="/support">
                  <Heart className="h-4 w-4" />
                  <span className="sr-only">Support</span>
                </Link>
              </Button>
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setUpcomingTasksInitialTab('routine');
                    setIsUpcomingTasksModalOpen(true);
                  }}
                >
                  <Workflow className="h-4 w-4" />
                  <span className="sr-only">Routine Tasks</span>
                </Button>

                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsHabitDashboardOpen(true)}>
                  <ListChecks className="h-4 w-4" />
                  <span className="sr-only">Habit Dashboard</span>
                </Button>
              </>
              
              <GlobalSearch open={isSearchOpen} setOpen={setIsSearchOpen} />

              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openMindsetWidget}>
                    <Brain className="h-4 w-4" />
                    <span className="sr-only">Resistances & Urges</span>
                </Button>
                
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openDrawingCanvasFromHeader}>
                    <Paintbrush className="h-4 w-4" />
                    <span className="sr-only">Drawing Canvas</span>
                </Button>
              </>

              {!simpleMode && (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsStateDiagramOpen(true)}>
                    <GitBranch className="h-4 w-4" />
                    <span className="sr-only">State Diagram</span>
                  </Button>

                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsLearningPerformanceOpen(true)}>
                    <ActivityIcon className="h-4 w-4" />
                    <span className="sr-only">Learning Performance</span>
                  </Button>
                </>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                    <Github className="h-4 w-4" />
                    {gitHubSyncNotification && (
                      <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500" />
                    )}
                    <span className="sr-only">GitHub Sync</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => syncWithGitHub()}>
                    <UploadCloud className="mr-2 h-4 w-4" /> Push to GitHub
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => downloadFromGitHub()}>
                    <DownloadCloud className="mr-2 h-4 w-4" /> Download from GitHub
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {gitHubSyncNotification ? (
                    <>
                      <DropdownMenuLabel className="max-w-[360px] whitespace-pre-wrap text-xs leading-5">
                        {gitHubSyncNotification.title}
                        {"\n"}
                        {gitHubSyncNotification.details}
                      </DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => dismissGitHubSyncNotification()}>
                        Clear Notification
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      No active GitHub notification
                    </DropdownMenuLabel>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSettingsModalOpen(true)}>
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Settings</span>
              </Button>
            
              <UserProfile onSettingsClick={() => setIsSettingsModalOpen(true)} />
            </nav>
          </div>
        </div>
      </header>
      <DemoTokenModal isOpen={isDemoTokenModalOpen} onOpenChange={setIsDemoTokenModalOpen} onSubmit={pushDemoDataWithToken} />
      <SettingsModal isOpen={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen} />
      <UpcomingTasksModal
        isOpen={isUpcomingTasksModalOpen}
        onOpenChange={setIsUpcomingTasksModalOpen}
        initialTab={upcomingTasksInitialTab}
      />
      <Dialog open={isHabitDashboardOpen} onOpenChange={setIsHabitDashboardOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 overflow-hidden">
          <ScrollArea className="h-full w-full">
            <TimesheetPageContent
              isModal={true}
              modalTab="habit-dashboard"
              showModalTabs={false}
              dashboardMonth={habitDashboardMonth}
              onDashboardMonthChange={setHabitDashboardMonth}
              showHabitDashboardMonthControls={true}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <StateDiagramModal isOpen={isStateDiagramOpen} onOpenChange={setIsStateDiagramOpen} />
      <LearningPerformanceModal isOpen={isLearningPerformanceOpen} onOpenChange={setIsLearningPerformanceOpen} />
      {gitHubSyncNotification && (
        <Card className="fixed bottom-4 left-4 z-[120] w-[420px] max-w-[calc(100vw-2rem)] border-border/70 bg-background/95 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-sm">
                  {gitHubSyncNotification.title}
                </CardTitle>
                <CardDescription className="text-xs pt-1">
                  {gitHubSyncNotification.mode === 'push' ? 'GitHub push status' : 'GitHub pull status'} • {gitHubSyncNotification.status}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={dismissGitHubSyncNotification}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close GitHub notification</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <pre className="whitespace-pre-wrap break-words text-xs leading-5 font-sans text-foreground/90">
              {gitHubSyncNotification.details}
            </pre>
          </CardContent>
        </Card>
      )}
    </>
  );
}
