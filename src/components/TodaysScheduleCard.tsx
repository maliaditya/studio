
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType, FullSchedule, SubTask, MetaRule, SlotName, RecurrenceRule, ExerciseDefinition, Stopper, Resource } from '@/types/workout';
import {
  Grab, Dock, Move, History, PlusCircle, BrainCircuit, Timer, PieChart, AlertCircle, Brain, Flame, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, startOfToday, subDays, getHours, isWithinInterval } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { AgendaWidgetItem } from './AgendaWidgetItem';
import { useToast } from '@/hooks/use-toast';
import { motion, useDragControls } from 'framer-motion';
import { TimeAllocationChart } from './ProductivitySnapshot';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Checkbox } from './ui/checkbox';

const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

interface TodaysScheduleCardProps {
  date: Date;
  isAgendaDocked: boolean;
  onToggleDock: () => void;
  onActivityClick?: (activity: Activity, event: React.MouseEvent) => void;
  onStartFocus?: (activity: Activity, event: React.MouseEvent) => void;
  onOpenHabitPopup: (habitId: string, event: React.MouseEvent) => void;
  currentSlot: string;
  schedule: FullSchedule;
  activityDurations: Record<string, string>;
}

export function TodaysScheduleCard({
  date,
  isAgendaDocked,
  onToggleDock,
  onActivityClick,
  onStartFocus,
  onOpenHabitPopup,
  currentSlot,
  schedule,
  activityDurations,
}: TodaysScheduleCardProps) {
  const { 
    currentUser,
    settings,
    setSettings,
    handleToggleComplete, 
    toggleRoutine, 
    setSchedule: setGlobalSchedule,
    habitCards,
    mechanismCards,
    logStopperEncounter,
    setResources,
    handleDeleteStopper,
  } = useAuth();
  const { toast } = useToast();

  const [purposeText, setPurposeText] = useState(settings.currentPurpose || '');
  const [purposePopoverOpen, setPurposePopoverOpen] = useState(false);
  const [view, setView] = useState<'list' | 'chart' | 'urges' | 'resistances'>('list');
  
  const [newEntryText, setNewEntryText] = useState('');
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);
  const [selectedResistanceIds, setSelectedResistanceIds] = useState<string[]>([]);
  
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
  
  const predictedResistances = useMemo(() => {
    const today = startOfToday();
    const sevenDaysAgo = subDays(today, 7);
    const predictions: Record<string, { text: string; type: 'Urge' | 'Resistance' }[]> = {
        'Late Night': [], 'Dawn': [], 'Morning': [], 'Afternoon': [], 'Evening': [], 'Night': [],
    };

    const allLinks: { stopper: Stopper; isUrge: boolean }[] = [];
    habitCards.forEach(habit => {
        (habit.urges || []).forEach(stopper => allLinks.push({ stopper, isUrge: true }));
        (habit.resistances || []).forEach(stopper => allLinks.push({ stopper, isUrge: false }));
    });
    mechanismCards.forEach(mechanism => {
        (mechanism.urges || []).forEach(stopper => allLinks.push({ stopper, isUrge: true }));
        (mechanism.resistances || []).forEach(stopper => allLinks.push({ stopper, isUrge: false }));
    });
    
    const slotTimes: { name: SlotName, start: number, end: number }[] = [
        { name: 'Late Night', start: 0, end: 4 },
        { name: 'Dawn', start: 4, end: 8 },
        { name: 'Morning', start: 8, end: 12 },
        { name: 'Afternoon', start: 12, end: 16 },
        { name: 'Evening', start: 16, end: 20 },
        { name: 'Night', start: 20, end: 24 },
    ];

    allLinks.forEach(link => {
        const slotCounts: Record<string, number> = {};
        (link.stopper.timestamps || []).forEach((ts: number) => {
            const eventDate = new Date(ts);
            if (isWithinInterval(eventDate, { start: sevenDaysAgo, end: addDays(new Date(), 1) })) {
                const hour = getHours(eventDate);
                const slot = slotTimes.find(s => hour >= s.start && hour < s.end);
                if (slot) {
                    slotCounts[slot.name] = (slotCounts[slot.name] || 0) + 1;
                }
            }
        });

        for (const slotName in slotCounts) {
            if (slotCounts[slotName] > 0) {
                const existing = predictions[slotName].find(p => p.text === link.stopper.text);
                if (!existing) {
                    predictions[slotName].push({
                        text: link.stopper.text,
                        type: link.isUrge ? 'Urge' : 'Resistance',
                    });
                }
            }
        }
    });

    return predictions;
  }, [habitCards, mechanismCards]);

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
    const urges: { habitId: string; stopper: Stopper; isUrge: boolean }[] = [];
    const resistances: { habitId: string; stopper: Stopper; isUrge: boolean }[] = [];
    habitCards.forEach(habit => {
      (habit.urges || []).forEach(stopper => urges.push({ habitId: habit.id, stopper, isUrge: true }));
      (habit.resistances || []).forEach(stopper => resistances.push({ habitId: habit.id, stopper, isUrge: false }));
    });
    mechanismCards.forEach(mechanism => {
        (mechanism.urges || []).forEach(stopper => urges.push({ habitId: mechanism.id, stopper, isUrge: true }));
        (mechanism.resistances || []).forEach(stopper => resistances.push({ habitId: mechanism.id, stopper, isUrge: false }));
    });
    
    const sortFn = (a: { stopper: Stopper }, b: { stopper: Stopper }) => {
        const lastTsA = Math.max(0, ...(a.stopper.timestamps || []));
        const lastTsB = Math.max(0, ...(b.stopper.timestamps || []));
        return lastTsB - lastTsA;
    };

    return {
      urges: urges.sort(sortFn),
      resistances: resistances.sort(sortFn),
    };
  }, [habitCards, mechanismCards]);
  
  const handleAddEntry = () => {
    if (!newEntryText.trim()) {
        toast({ title: 'Error', description: 'Please describe the entry.', variant: 'destructive'});
        return;
    }

    const newStopper: Stopper = {
        id: `stopper_${Date.now()}`,
        text: newEntryText.trim(),
        status: 'none',
        linkedResistanceIds: view === 'urges' ? selectedResistanceIds : undefined,
    };
    
    const targetHabitId = selectedHabitId;
    
    if (!targetHabitId) {
        toast({ title: 'Error', description: 'Please link this entry to a habit.', variant: 'destructive'});
        return;
    }

    setResources(prev => prev.map(r => {
        if (r.id === targetHabitId) {
            const updatedResource = { ...r };
            if (view === 'urges') {
                updatedResource.urges = [...(updatedResource.urges || []), newStopper];
            } else {
                updatedResource.resistances = [...(updatedResource.resistances || []), newStopper];
            }
            return updatedResource;
        }
        return r;
    }));

    setNewEntryText('');
    setSelectedHabitId('');
    setSelectedResistanceIds([]);
    setIsAddPopoverOpen(false);
    toast({ title: 'Success', description: `New ${view === 'urges' ? 'urge' : 'resistance'} has been logged.`});
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
              scheduledActivities.length > 0 || Object.values(predictedResistances).some(v => v.length > 0) ? (
                 <ul ref={listRef} className="space-y-1 max-h-64 overflow-y-auto pr-2">
                    {slotOrder.map(slotName => {
                        const activitiesForSlot = scheduledActivities.filter(a => a.slot === slotName);
                        const predictionsForSlot = predictedResistances[slotName] || [];
                        if (activitiesForSlot.length === 0 && predictionsForSlot.length === 0) return null;
                        
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
                                {predictionsForSlot.map((prediction, index) => (
                                    <li key={`pred-${index}`} className="flex items-center gap-2 p-1">
                                        <AlertCircle className={cn("h-4 w-4 flex-shrink-0", prediction.type === 'Urge' ? 'text-red-500' : 'text-yellow-500')} />
                                        <p className="text-xs text-muted-foreground italic truncate" title={prediction.text}>
                                            {prediction.text}
                                        </p>
                                    </li>
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
                                    placeholder={`Describe the ${view}...`}
                                />
                                <Select onValueChange={setSelectedHabitId} value={selectedHabitId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Link to a Habit..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {habitCards.map(habit => (
                                            <SelectItem key={habit.id} value={habit.id}>{habit.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {view === 'urges' && (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                {selectedResistanceIds.length > 0 ? `${selectedResistanceIds.length} resistance(s) selected` : "Link Resistances..."}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-0">
                                            <ScrollArea className="h-48">
                                                <div className="p-2 space-y-1">
                                                    {allResistancesAndUrges.resistances.map(link => (
                                                        <div key={link.stopper.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`res-check-${link.stopper.id}`}
                                                                checked={selectedResistanceIds.includes(link.stopper.id)}
                                                                onCheckedChange={(checked) => {
                                                                    setSelectedResistanceIds(prev =>
                                                                        checked ? [...prev, link.stopper.id] : prev.filter(id => id !== link.stopper.id)
                                                                    );
                                                                }}
                                                            />
                                                            <Label htmlFor={`res-check-${link.stopper.id}`} className="text-xs font-normal">{link.stopper.text}</Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </PopoverContent>
                                    </Popover>
                                )}
                                <Button onClick={handleAddEntry} className="w-full">Add Entry</Button>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <ScrollArea className="h-64 pr-2">
                        <ul className="space-y-2">
                            {(view === 'urges' ? allResistancesAndUrges.urges : allResistancesAndUrges.resistances).map(link => (
                                <li key={`${link.habitId}-${link.stopper.id}`}>
                                    <div className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50 group">
                                        <div className="flex-grow pr-2">
                                            <p className="font-medium">{link.stopper.text}</p>
                                        </div>
                                        <div className="flex items-center flex-shrink-0">
                                            <span className="text-xs font-bold mr-1">{(link.stopper.timestamps?.length || 0)}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); logStopperEncounter(link.habitId, link.stopper.id); }}>
                                                <PlusCircle className="h-4 w-4 text-green-500" />
                                            </Button>
                                             <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => {e.stopPropagation(); handleDeleteStopper(link.habitId, link.stopper.id)}}>
                                                <Trash2 className="h-3 w-3"/>
                                            </Button>
                                        </div>
                                    </div>
                                </li>
                            ))}
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
