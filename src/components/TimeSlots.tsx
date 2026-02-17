

"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType, FullSchedule, SubTask, MetaRule, SlotName, RecurrenceRule, ExerciseDefinition } from '@/types/workout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSeparator, DropdownMenuSubContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, Brain, Wind, Moon, Sunrise, Sun, CloudSun, Sunset, MoonStar, PlusCircle, Timer } from 'lucide-react';
import { isToday, format, getISODay, parseISO, differenceInDays, differenceInMonths, startOfDay, addDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { AgendaWidgetItem } from './AgendaWidgetItem';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useToast } from '@/hooks/use-toast';
import { getExercisesForDay } from '@/lib/workoutUtils';


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

interface TimeSlotsProps {
  date: Date;
  schedule: FullSchedule;
  currentSlot: string;
  onActivityClick: (activity: Activity, event: React.MouseEvent) => void;
  onOpenHabitPopup: (habitId: string, event: React.MouseEvent) => void;
  onStartFocus: (activity: Activity, event: React.MouseEvent) => void;
}

export function TimeSlots({
  date,
  schedule,
  currentSlot,
  onActivityClick,
  onOpenHabitPopup,
  onStartFocus,
}: TimeSlotsProps) {
    const { toast } = useToast();
    const { 
        setSchedule: setGlobalSchedule, 
        settings, 
        handleToggleComplete, 
        toggleRoutine, 
        activityDurations,
        workoutMode,
        workoutPlans,
        exerciseDefinitions,
        allWorkoutLogs,
        workoutPlanRotation,
        resources,
        mindsetCards,
    } = useAuth();
    const dateKey = useMemo(() => format(date, 'yyyy-MM-dd'), [date]);
    const todaysSchedule = useMemo(() => schedule[dateKey] || {}, [schedule, dateKey]);
    const explicitActivityIdsForDay = useMemo(() => {
        const ids = new Set<string>();
        Object.values(todaysSchedule).forEach((value) => {
            if (!Array.isArray(value)) return;
            value.forEach((activity) => {
                if (activity?.id) ids.add(activity.id);
            });
        });
        return ids;
    }, [todaysSchedule]);
    const [nowMs, setNowMs] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setNowMs(Date.now());
        }, 30000);
        return () => clearInterval(interval);
    }, []);
    const loggedTaskIds = useMemo(() => {
        const start = startOfDay(date);
        const end = addDays(start, 1);
        const startMs = start.getTime();
        const endMs = end.getTime();
        const stopperById = new Map<string, { timestamps?: number[] }>();
        (resources || []).forEach(resource => {
            (resource.urges || []).forEach(stopper => stopperById.set(stopper.id, stopper));
            (resource.resistances || []).forEach(stopper => stopperById.set(stopper.id, stopper));
        });
        const loggedStopperIds = new Set<string>();
        stopperById.forEach((stopper, id) => {
            if ((stopper.timestamps || []).some(ts => ts >= startMs && ts < endMs)) {
                loggedStopperIds.add(id);
            }
        });
        if (loggedStopperIds.size === 0) return new Set<string>();
        const taskIds = new Set<string>();
        (mindsetCards || []).forEach(card => {
            if (!card.id.startsWith('mindset_botherings_')) return;
            card.points.forEach(point => {
                const linkedIds = [...(point.linkedUrgeIds || []), ...(point.linkedResistanceIds || [])];
                if (!linkedIds.some(id => loggedStopperIds.has(id))) return;
                (point.tasks || []).forEach(task => {
                    if (task.id) taskIds.add(task.id);
                    if (task.activityId) taskIds.add(task.activityId);
                });
            });
        });
        return taskIds;
    }, [date, resources, mindsetCards]);

    const isTaskLogged = useCallback((activity: Activity) => {
        const baseMatch = activity.id.match(/_(\d{4}-\d{2}-\d{2})$/);
        const baseId = baseMatch ? activity.id.slice(0, -11) : activity.id;
        if (loggedTaskIds.has(activity.id) || loggedTaskIds.has(baseId)) return true;
        return (activity.taskIds || []).some(id => loggedTaskIds.has(id));
    }, [loggedTaskIds]);


  const slots = [
    { name: 'Late Night', time: '12am - 4am', endHour: 4, icon: <Moon className="h-5 w-5 text-indigo-400" /> },
    { name: 'Dawn', time: '4am - 8am', endHour: 8, icon: <Sunrise className="h-5 w-5 text-orange-400" /> },
    { name: 'Morning', time: '8am - 12pm', endHour: 12, icon: <Sun className="h-5 w-5 text-yellow-400" /> },
    { name: 'Afternoon', time: '12pm - 4pm', endHour: 16, icon: <CloudSun className="h-5 w-5 text-sky-500" /> },
    { name: 'Evening', time: '4pm - 8pm', endHour: 20, icon: <Sunset className="h-5 w-5 text-purple-500" /> },
    { name: 'Night', time: '8pm - 12am', endHour: 24, icon: <MoonStar className="h-5 w-5 text-indigo-500" /> }
  ];

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const sourceSlotName = source.droppableId;
    const destinationSlotName = destination.droppableId;

    setGlobalSchedule(currentSchedule => {
        const daySchedule = { ...(currentSchedule[dateKey] || {}) };

        const sourceActivities = [...((daySchedule[sourceSlotName as SlotName] as Activity[]) || [])];
        const [movedActivity] = sourceActivities.splice(source.index, 1);

        if (!movedActivity) return currentSchedule;
        
        const movedActivityWithSlot: Activity = { ...movedActivity, slot: destinationSlotName as SlotName };

        daySchedule[sourceSlotName as SlotName] = sourceActivities;

        const destActivities = sourceSlotName === destinationSlotName 
            ? sourceActivities 
            : [...((daySchedule[destinationSlotName as SlotName] as Activity[]) || [])];
        
        destActivities.splice(destination.index, 0, movedActivityWithSlot);
        daySchedule[destinationSlotName as SlotName] = destActivities;

        return { ...currentSchedule, [dateKey]: daySchedule };
    });
  };

  const handleAddActivity = (slotName: string, type: ActivityType, details: string) => {
    let activityDetails = details;
    
    if (type === 'workout') {
        const { description } = getExercisesForDay(date, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling, allWorkoutLogs);
        activityDetails = description || "New Workout";
    } else if (!details) {
        if (type === 'pomodoro') activityDetails = "New Pomodoro";
        else activityDetails = `New ${type.replace('-', ' ')}`;
    }
    
    const newActivity: Activity = {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        details: activityDetails,
        completed: false,
        slot: slotName,
        habitEquationIds: settings.defaultHabitLinks?.[type] ? [settings.defaultHabitLinks[type]!] : [],
        taskIds: [],
        linkedEntityType: (type === 'deepwork' || type === 'upskill') ? 'specialization' : undefined,
    };
    setGlobalSchedule(prev => ({
        ...prev,
        [dateKey]: {
            ...(prev[dateKey] || {}),
            [slotName]: [...((prev[dateKey]?.[slotName as SlotName] as Activity[]) || []), newActivity],
        }
    }));
    toast({ title: "Activity Added", description: `Added a new task to ${format(date, 'MMM d')}, ${slotName}.` });
  };
  
  const handleUpdateActivity = (activityId: string, newDetails: string) => {
    setGlobalSchedule(prev => {
        const newSchedule = {...prev};
        if (newSchedule[dateKey]) {
            const daySchedule = {...newSchedule[dateKey]};
            for (const slotName in daySchedule) {
                const activities = (daySchedule[slotName as SlotName] as Activity[]) || [];
                const activityIndex = activities.findIndex(a => a.id === activityId);
                if (activityIndex > -1) {
                    const newActivities = [...activities];
                    newActivities[activityIndex] = { ...newActivities[activityIndex], details: newDetails };
                    daySchedule[slotName as SlotName] = newActivities;
                    newSchedule[dateKey] = daySchedule;
                    break;
                }
            }
        }
        return newSchedule;
    });
  };

  const onRemoveActivity = (slotName: string, activityId: string) => {
    setGlobalSchedule(prev => {
        const newSchedule = { ...prev };
        if (newSchedule[dateKey]) {
            const daySchedule = { ...newSchedule[dateKey] };
            if (daySchedule[slotName]) {
                daySchedule[slotName] = (daySchedule[slotName] as any[]).filter(act => act.id !== activityId);
                newSchedule[dateKey] = daySchedule;
            }
        }
        return newSchedule;
    });
  };

  const formatTimeLeft = (msLeft: number) => {
    if (msLeft <= 0) return "0m left";
    const totalMinutes = Math.ceil(msLeft / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {slots.map((slot) => {
        const activities = (todaysSchedule[slot.name as keyof DailySchedule] as Activity[]) || [];
        const routineInstances = (settings.routines || []).flatMap(r => {
            if (!r || !r.routine) return [] as Activity[];
            if (r.slot !== slot.name) return [] as Activity[];
            const rule = r.routine;
            const base = r.baseDate || r.createdAt;
            try {
                if (rule.type === 'daily') {
                    return [{ ...r, id: `${r.id}_${dateKey}` } as Activity];
                }
                if (rule.type === 'weekly') {
                    if (!base) return [] as Activity[];
                    const baseDow = getISODay(parseISO(base));
                    const thisDow = getISODay(date);
                    if (baseDow === thisDow) return [{ ...r, id: `${r.id}_${dateKey}` } as Activity];
                    return [] as Activity[];
                }
                if (rule.type === 'custom') {
                    if (!base) return [] as Activity[];
                    const interval = Math.max(1, rule.repeatInterval ?? rule.days ?? 1);
                    const unit = rule.repeatUnit ?? 'day';
                    const baseDate = parseISO(base);
                    if (unit === 'month') {
                        if (baseDate.getDate() !== date.getDate()) return [] as Activity[];
                        const diffMonths = differenceInMonths(date, baseDate);
                        if (diffMonths >= 0 && diffMonths % interval === 0) {
                            return [{ ...r, id: `${r.id}_${dateKey}` } as Activity];
                        }
                        return [] as Activity[];
                    }
                    if (unit === 'week') {
                        const diffDays = differenceInDays(date, baseDate);
                        if (diffDays >= 0 && diffDays % (interval * 7) === 0) {
                            return [{ ...r, id: `${r.id}_${dateKey}` } as Activity];
                        }
                        return [] as Activity[];
                    }
                    const diffDays = differenceInDays(date, baseDate);
                    if (diffDays >= 0 && diffDays % interval === 0) {
                        return [{ ...r, id: `${r.id}_${dateKey}` } as Activity];
                    }
                    return [] as Activity[];
                }
            } catch (e) {
                return [] as Activity[];
            }
            return [] as Activity[];
        });
        const mergedActivities = [
            ...activities,
            // De-dupe across the whole day so moved routine instances do not reappear in their original slot.
            ...routineInstances.filter((ri) => !explicitActivityIdsForDay.has(ri.id))
        ];
        const isCurrentSlotToday = isToday(date) && currentSlot === slot.name;
        let timeLeftLabel: string | null = null;
        if (isCurrentSlotToday) {
            const endTime = new Date(date);
            if (slot.endHour >= 24) {
                endTime.setDate(endTime.getDate() + 1);
                endTime.setHours(0, 0, 0, 0);
            } else {
                endTime.setHours(slot.endHour, 0, 0, 0);
            }
            const msLeft = endTime.getTime() - nowMs;
            timeLeftLabel = formatTimeLeft(msLeft);
        }

        return (
          <Card
            key={slot.name}
            id={`slot-card-${slot.name.replace(/\s+/g, '-')}`}
            className={cn(
              "transition-all duration-300 ease-in-out flex flex-col",
              isCurrentSlotToday
                ? 'ring-2 ring-primary shadow-2xl bg-card'
                : 'shadow-md bg-card/60'
            )}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg font-medium">{slot.name}</CardTitle>
                <CardDescription>{slot.time}</CardDescription>
                {timeLeftLabel && (
                    <div className="text-xs font-semibold text-emerald-400 mt-1">
                        {timeLeftLabel}
                    </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 flex items-center justify-center">
                  {slot.icon}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow justify-between min-h-[8rem] p-3">
              <Droppable droppableId={slot.name}>
                {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="flex-grow min-h-0 mb-2">
                        <ScrollArea className="h-[200px] pr-2">
                            <ul className="space-y-2">
                                {mergedActivities && mergedActivities.length > 0 ? (
                                mergedActivities.map((activity, index) => (
                                    <Draggable key={activity.id} draggableId={activity.id} index={index}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                      >
                                        <AgendaWidgetItem
                                            activity={{...activity, slot: slot.name as SlotName}}
                                            date={date}
                                            onToggleComplete={handleToggleComplete}
                                            onActivityClick={onActivityClick}
                                            onStartFocus={onStartFocus}
                                            onRemoveActivity={onRemoveActivity}
                                            onUpdateActivity={handleUpdateActivity}
                                            setRoutine={toggleRoutine}
                                            onOpenHabitPopup={onOpenHabitPopup}
                                            context="timeslot"
                                            loggedDuration={activityDurations[activity.id]}
                                            hasLoggedStopper={isTaskLogged(activity)}
                                        />
                                      </div>
                                    )}
                                    </Draggable>
                                ))
                                ) : (
                                <div className="flex-grow flex items-center justify-center h-full">
                                    <p className="text-sm text-muted-foreground text-center px-4">
                                        Plan an activity for this block.
                                    </p>
                                </div>
                                )}
                                {provided.placeholder}
                            </ul>
                        </ScrollArea>
                    </div>
                )}
              </Droppable>
              <div className="flex-shrink-0 mt-2 space-y-2">
                <div className="flex justify-between items-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start h-8">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Activity
                            </Button>
                        </DropdownMenuTrigger>
                        <AddActivityMenu onAddActivity={(type, details) => handleAddActivity(slot.name, type, details)} />
                    </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
    </DragDropContext>
  );
}
