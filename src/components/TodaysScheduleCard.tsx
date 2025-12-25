
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, MoreVertical, Brain, Wind, Moon, Sunrise, Sun, CloudSun, Sunset, MoonStar, PlusCircle, Timer, Compass, Grab, Dock, Move, PieChart, Flame, Shield, Paintbrush, BrainCircuit, ListChecks, CheckCircle2, Circle, Trash2, Play, History, Repeat, Link as LinkIcon, ArrowRight, Save } from 'lucide-react';
import type { Activity, ActivityType, RecurrenceRule, MetaRule, Pattern } from '@/types/workout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { EditableActivityText } from './EditableActivityText';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { motion, useDragControls } from 'framer-motion';
import { format, isToday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { TimeAllocationChart } from './ProductivitySnapshot';
import { Input } from './ui/input';
import { Label } from './ui/label';


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
    pomodoro: <Timer className="h-4 w-4" />,
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
                    <DropdownMenuItem key={type} onClick={() => onAddActivity(activityType, '')}>
                        {icon}
                        <span className="ml-2 capitalize">{type.replace('-', ' ')}</span>
                    </DropdownMenuItem>
                );
            })}
        </DropdownMenuContent>
    );
};

interface AgendaWidgetItemProps {
    activity: Activity & { slot: string };
    date: Date;
    onToggleComplete: (slotName: string, activityId: string) => void;
    onRemoveActivity: (slotName: string, activityId: string) => void;
    onUpdateActivity: (activityId: string, newDetails: string) => void;
    setRoutine: (activity: Activity, rule: RecurrenceRule | null) => void;
    onActivityClick?: (activity: Activity, event: React.MouseEvent) => void;
    onStartFocus?: (activity: Activity, event: React.MouseEvent) => void;
    onOpenHabitPopup: (habitId: string, event: React.MouseEvent) => void;
    context: 'agenda' | 'timeslot';
    loggedDuration?: string;
}

export const AgendaWidgetItem = React.memo(({ 
    activity,
    date, 
    onToggleComplete, 
    onRemoveActivity, 
    onUpdateActivity, 
    setRoutine, 
    onActivityClick, 
    onStartFocus,
    onOpenHabitPopup, 
    context,
    loggedDuration,
}: AgendaWidgetItemProps) => {
    const { 
        setSelectedDeepWorkTask, 
        setSelectedUpskillTask,
        findRootTask
    } = useAuth();
    const router = useRouter();

    const isInlineEditable = !['upskill', 'deepwork', 'workout', 'branding', 'lead-generation', 'mindset', 'nutrition'].includes(activity.type);
    const isAgendaContext = context === 'agenda';

    const handleItemClick = (e: React.MouseEvent) => {
        if (onActivityClick) {
            onActivityClick(activity, e);
        }
    };
    
    const isPlanningTask = (activity.type === 'upskill' || activity.type === 'deepwork') && activity.linkedEntityType === 'specialization';
    const linkedActivityName = activity.type === 'pomodoro' && activity.linkedActivityType
        ? activity.linkedActivityType.charAt(0).toUpperCase() + activity.linkedActivityType.slice(1).replace('-', ' ')
        : null;

    const handleBadgeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    
        if (activity.completed && activity.type === 'pomodoro' && activity.taskIds && activity.taskIds.length > 0) {
            const rootTask = findRootTask(activity);
            if (rootTask) {
                if (activity.linkedActivityType === 'deepwork') {
                    setSelectedDeepWorkTask(rootTask);
                    router.push('/deep-work');
                } else if (activity.linkedActivityType === 'upskill') {
                    setSelectedUpskillTask(rootTask);
                    router.push('/deep-work');
                }
            }
        }
    };

    return (
        <li 
            className={cn(
                "flex items-start gap-2 p-2 rounded-lg group transition-all",
                context === 'timeslot' && 'bg-background',
                onActivityClick && 'cursor-pointer'
            )}
            onClick={handleItemClick}
        >
            <button onClick={(e) => { e.stopPropagation(); onToggleComplete(activity.slot, activity.id); }} className="mt-0.5">
                {activity.completed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
            </button>
            <div className="flex-grow min-w-0">
                {(isAgendaContext || context === 'timeslot') && isInlineEditable ? (
                    <EditableActivityText
                        initialValue={activity.details}
                        onUpdate={(newDetails) => onUpdateActivity(activity.id, newDetails)}
                        className={cn("text-sm font-medium w-full block", activity.completed && "line-through text-muted-foreground")}
                    />
                ) : (
                    <p className={cn("text-sm font-medium", activity.completed && "line-through text-muted-foreground")}>
                        {activity.details}
                    </p>
                )}
                 <div className="flex flex-wrap items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                        {activityIcons[activity.type]} {activity.type.replace('-', ' ')}
                    </div>
                    {linkedActivityName && (
                        <Badge 
                            variant={activity.completed ? 'outline' : 'secondary'}
                            onClick={handleBadgeClick}
                            className={cn(activity.completed && "cursor-pointer hover:bg-accent")}
                        >
                            {linkedActivityName}
                        </Badge>
                    )}
                    {isPlanningTask && <Badge variant="outline">Planning</Badge>}
                    {activity.completed && loggedDuration && (
                        <Badge variant="secondary">{loggedDuration}</Badge>
                    )}
                </div>
            </div>
        </li>
    );
});
AgendaWidgetItem.displayName = 'AgendaWidgetItem';


const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

interface TodaysScheduleCardProps {
  date: Date;
  schedule: FullSchedule;
  activityDurations: Record<string, string>;
  isAgendaDocked: boolean;
  onToggleDock: () => void;
  onActivityClick?: (activity: Activity, event: React.MouseEvent) => void;
  onStartFocus?: (activity: Activity, event: React.MouseEvent) => void;
  onOpenHabitPopup: (habitId: string, event: React.MouseEvent) => void;
  currentSlot: string;
}

export function TodaysScheduleCard({
  date,
  schedule,
  activityDurations,
  isAgendaDocked,
  onToggleDock,
  onActivityClick,
  onStartFocus,
  onOpenHabitPopup,
  currentSlot,
}: TodaysScheduleCardProps) {
  const { toast } = useToast();
  const { 
    currentUser,
    settings,
    setSettings,
    handleToggleComplete, 
    toggleRoutine, 
    setSchedule: setGlobalSchedule,
    resources,
    metaRules,
    patterns,
  } = useAuth();
  const router = useRouter();

  const [purposeText, setPurposeText] = useState(settings.currentPurpose || '');
  const [purposePopoverOpen, setPurposePopoverOpen] = useState(false);
  const [view, setView] = useState<'list' | 'chart' | 'urges' | 'resistances' | 'rules'>('list');
  const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);
  const [newEntryText, setNewEntryText] = useState('');
  
  const dragControls = useDragControls()
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setPurposeText(settings.currentPurpose || '');
  }, [settings.currentPurpose]);

  const handleSavePurpose = () => {
    setSettings(prev => ({...prev, currentPurpose: purposeText}));
    setPurposePopoverOpen(false);
  };

  const dayKey = React.useMemo(() => format(date, 'yyyy-MM-dd'), [date]);

  const todaysSchedule = useMemo(() => schedule[dayKey] || {}, [schedule, dayKey]);

  const scheduledActivities = useMemo(() => {
    const todaysSchedule = schedule[dayKey] || {};
    let allActivities = slotOrder.flatMap(slot => {
        const activities = todaysSchedule[slot];
        if (activities && Array.isArray(activities) && activities.length > 0) {
            return activities.map(activity => ({ slot, ...activity }));
        }
        return [];
    });

    if (settings.agendaShowCurrentSlotOnly) {
        allActivities = allActivities.filter(activity => activity.slot === currentSlot);
    }

    return allActivities.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return slotOrder.indexOf(a.slot as SlotName) - slotOrder.indexOf(b.slot as SlotName);
    });
  }, [schedule, dayKey, settings.agendaShowCurrentSlotOnly, currentSlot]);

  useEffect(() => {
    if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [scheduledActivities]);

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


  const [position, setPosition] = useState({ x: 20, y: 80 });

  const positionKey = currentUser ? `lifeos_agenda_widget_position_${currentUser.username}` : null;

  useEffect(() => {
    if (!isAgendaDocked && positionKey) {
        const savedPosition = localStorage.getItem(positionKey);
        if (savedPosition) {
            try {
                const parsed = JSON.parse(savedPosition);
                setPosition(parsed);
            } catch (e) {
                 console.error("Failed to parse widget position from localStorage", e);
                 const initialY = window.innerHeight - Math.min(window.innerHeight - 80, 450);
                 const initialX = window.innerWidth - Math.min(window.innerWidth - 20, 340);
                 setPosition({ x: initialX, y: initialY });
            }
        } else {
            const initialY = window.innerHeight - Math.min(window.innerHeight - 80, 450);
            const initialX = window.innerWidth - Math.min(window.innerWidth - 20, 340);
            setPosition({ x: initialX, y: initialY });
        }
    }
  }, [isAgendaDocked, positionKey]);

  const onRemoveActivity = (slotName: string, activityId: string) => {
    setGlobalSchedule(prev => {
        const newSchedule = { ...prev };
        if (newSchedule[dayKey]) {
            const daySchedule = { ...newSchedule[dayKey] };
            if (daySchedule[slotName]) {
                daySchedule[slotName] = (daySchedule[slotName] as any[]).filter(act => act.id !== activityId);
                newSchedule[dayKey] = daySchedule;
            }
        }
        return newSchedule;
    });
  };

  const handleUpdateActivity = (activityId: string, newDetails: string) => {
    setGlobalSchedule(prev => {
        const newSchedule = {...prev};
        if (newSchedule[dayKey]) {
            const daySchedule = {...newSchedule[dayKey]};
            for (const slotName in daySchedule) {
                const activities = (daySchedule[slotName as SlotName] as Activity[]) || [];
                const activityIndex = activities.findIndex(a => a.id === activityId);
                if (activityIndex > -1) {
                    const newActivities = [...activities];
                    newActivities[activityIndex] = { ...newActivities[activityIndex], details: newDetails };
                    daySchedule[slotName as SlotName] = newActivities;
                    newSchedule[dayKey] = daySchedule;
                    break;
                }
            }
        }
        return newSchedule;
    });
  };

  const allResistancesAndUrges = useMemo(() => {
    const mindsetCard = resources.find(r => r.name === "Mindset");
    if (!mindsetCard) return { urges: [], resistances: [] };

    const urges = mindsetCard.urges || [];
    const resistances = mindsetCard.resistances || [];
    
    const sortFn = (a: { timestamps?: number[] }, b: { timestamps?: number[] }) => {
        const lastTsA = Math.max(0, ...(a.timestamps || []));
        const lastTsB = Math.max(0, ...(b.timestamps || []));
        return lastTsB - lastTsA;
    };

    return {
      urges: urges.sort(sortFn),
      resistances: resistances.sort(sortFn),
    };
  }, [resources]);
  
  const handleAddEntry = () => {
    if (!newEntryText.trim()) return;
  
    const mindsetCard = resources.find(r => r.name === "Mindset");
    if (!mindsetCard) {
      toast({ title: 'Error', description: 'Mindset resource card not found.', variant: 'destructive'});
      return;
    }
  
    const newStopper: Stopper = {
      id: `stopper_${Date.now()}`,
      text: newEntryText.trim(),
      status: 'none',
    };
  
    const updatedMindsetCard = { ...mindsetCard };
    if (view === 'urges') {
      updatedMindsetCard.urges = [...(updatedMindsetCard.urges || []), newStopper];
    } else {
      updatedMindsetCard.resistances = [...(updatedMindsetCard.resistances || []), newStopper];
    }
  
    setResources(prev => prev.map(r => r.id === mindsetCard.id ? updatedMindsetCard : r));
  
    setNewEntryText('');
    setIsAddPopoverOpen(false);
    toast({ title: 'Success', description: `New ${view === 'urges' ? 'urge' : 'resistance'} has been logged.`});
  };

  const handleDeleteStopper = (stopperId: string) => {
    setResources(prev => prev.map(r => {
      if (r.name === "Mindset") {
        const updatedResource = { ...r };
        updatedResource.urges = (updatedResource.urges || []).filter(s => s.id !== stopperId);
        updatedResource.resistances = (updatedResource.resistances || []).filter(s => s.id !== stopperId);
        return updatedResource;
      }
      return r;
    }));
  };

  const handleRuleClick = (e: React.MouseEvent, rule: MetaRule) => {
    const patternForRule = patterns.find(p => p.id === rule.patternId);
    if (!patternForRule) return;

    const habitPhrase = patternForRule.phrases.find(p => p.category === 'Habit Cards');
    if (!habitPhrase || !habitPhrase.mechanismCardId) return;

    onOpenHabitPopup(habitPhrase.mechanismCardId, e);
  };

  const cardContent = (
    <Card className="shadow-2xl bg-background/80 backdrop-blur-sm">
        <CardHeader
            className={cn("p-3")}
        >
            <div 
              className={cn("flex items-center justify-between gap-2", !isAgendaDocked && "cursor-grab active:cursor-grabbing")}
              onPointerDown={(e) => dragControls.start(e)}
            >
                <CardTitle className="flex items-center gap-2 text-base text-primary">Todo</CardTitle>
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/canvas')}>
                        <Paintbrush className="h-4 w-4" />
                        <span className="sr-only">Canvas</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('rules')}>
                        <Compass className="h-4 w-4 text-orange-500" />
                        <span className="sr-only">Toggle Rules View</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('urges')}>
                        <Flame className="h-4 w-4 text-red-500" />
                        <span className="sr-only">Toggle Urges View</span>
                    </Button>
                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView('resistances')}>
                        <Shield className="h-4 w-4 text-blue-500" />
                        <span className="sr-only">Toggle Resistances View</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setView(v => v === 'chart' ? 'list' : 'chart')}>
                        <PieChart className="h-4 w-4" />
                        <span className="sr-only">Toggle Chart View</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onToggleDock} className="h-8 w-8">
                        {isAgendaDocked ? <Move className="h-4 w-4" /> : <Dock className="h-4 w-4" />}
                    </Button>
                    {!isAgendaDocked && <Grab className="text-muted-foreground h-4 w-4" />}
                </div>
            </div>
             <div className="flex items-center gap-2 mt-1">
                <Popover open={purposePopoverOpen} onOpenChange={setPurposePopoverOpen}>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 text-left cursor-pointer group">
                            <BrainCircuit className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            <CardDescription className="text-xs group-hover:text-foreground transition-colors whitespace-pre-wrap break-words" title={purposeText}>
                                {purposeText || "Click to set a daily purpose..."}
                            </CardDescription>
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Current Purpose</h4>
                                <p className="text-sm text-muted-foreground">Set your main intention for the day.</p>
                            </div>
                            <div className="space-y-2">
                                <Input value={purposeText} onChange={(e) => setPurposeText(e.target.value)} />
                                <Button onClick={handleSavePurpose} className="w-full">Save Purpose</Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </CardHeader>
        <CardContent className="p-3">
            {view === 'list' ? (
              scheduledActivities.length > 0 ? (
                 <ul ref={listRef} className="space-y-1 max-h-64 md:max-h-[70vh] overflow-y-auto pr-2">
                    {slotOrder.map(slotName => {
                        const activitiesForSlot = scheduledActivities.filter(a => a.slot === slotName);
                        if (activitiesForSlot.length === 0) return null;
                        
                        const isCurrent = slotName === currentSlot;
                        return (
                            <li key={slotName}>
                                <div className={cn("text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2 mb-1", isCurrent && "text-primary")}>
                                     {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>}
                                    {slotName}
                                </div>
                                <ul className="space-y-1 pl-2 border-l">
                                {activitiesForSlot.map(activity => (
                                    <AgendaWidgetItem
                                        key={activity.id}
                                        activity={{...activity, slot: activity.slot as SlotName}}
                                        date={date}
                                        onToggleComplete={handleToggleComplete}
                                        onActivityClick={onActivityClick}
                                        onStartFocus={onStartFocus}
                                        onRemoveActivity={onRemoveActivity}
                                        onUpdateActivity={handleUpdateActivity}
                                        setRoutine={toggleRoutine}
                                        onOpenHabitPopup={onOpenHabitPopup}
                                        context="agenda"
                                        loggedDuration={activityDurations[activity.id]}
                                    />
                                ))}
                                </ul>
                            </li>
                        );
                    })}
                </ul>
              ) : (
                  <div className="text-center text-muted-foreground py-4">
                      <p className="text-sm">No activities scheduled.</p>
                  </div>
              )
            ) : view === 'chart' ? (
              <div className="h-[250px] w-full">
                <TimeAllocationChart timeAllocationData={timeAllocationData} />
              </div>
            ) : (
                 <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="text-base font-semibold capitalize">{view}</h4>
                        <Popover open={isAddPopoverOpen} onOpenChange={setIsAddPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><PlusCircle className="h-4 w-4 text-green-500"/></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4 space-y-4">
                                <h5 className="font-medium text-sm">Add New {view === 'urges' ? 'Urge' : 'Resistance'}</h5>
                                <Input 
                                    value={newEntryText}
                                    onChange={e => setNewEntryText(e.target.value)}
                                    placeholder={`Describe the ${view === 'urges' ? 'urge' : 'resistance'}...`}
                                />
                                <Button onClick={handleAddEntry} className="w-full">Add Entry</Button>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <ScrollArea className="h-64 pr-2">
                        <ul className="space-y-2">
                            {(view === 'urges' ? allResistancesAndUrges.urges : view === 'resistances' ? allResistancesAndUrges.resistances : view === 'rules' ? metaRules : []).map(item => {
                                const isStopper = 'stopper' in item;
                                const id = isStopper ? item.stopper.id : item.id;
                                const text = isStopper ? item.stopper.text : item.text;
                                const habitId = isStopper ? item.habitId : undefined;
                                const timestamps = isStopper ? item.stopper.timestamps || [] : [];
                                
                                return (
                                <li key={id}>
                                    <div className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50 group" onClick={e => isStopper ? null : handleRuleClick(e, item as MetaRule)}>
                                        <div className="flex-grow pr-2">
                                            <p className="font-medium">{text}</p>
                                        </div>
                                        {isStopper && (
                                            <div className="flex items-center flex-shrink-0">
                                                <span className="text-xs font-bold mr-1">{timestamps.length}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); logStopperEncounter(habitId!, id); }}>
                                                    <PlusCircle className="h-4 w-4 text-green-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => {e.stopPropagation(); handleDeleteStopper(id)}}>
                                                    <Trash2 className="h-3 w-3"/>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                                )
                            })}
                        </ul>
                    </ScrollArea>
                 </div>
            )}
        </CardContent>
    </Card>
  );

  if (!isAgendaDocked) {
    return (
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        className="fixed z-50 w-full max-w-sm"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onDragEnd={() => {
            if (positionKey) {
                localStorage.setItem(positionKey, JSON.stringify(position));
            }
        }}
        dragMomentum={false}
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
}
