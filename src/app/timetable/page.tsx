
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, addDays, isToday, isBefore, startOfToday, parseISO, differenceInDays, getISODay, differenceInMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, PlusCircle, Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, CheckSquare, Utensils, Wind, AlertCircle, Brain, Trash2, Repeat } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Activity, ActivityType, DailySchedule, SlotName, RecurrenceRule, ExerciseDefinition, WorkoutExercise, DatedWorkout } from '@/types/workout';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ScrollArea } from '@/components/ui/scroll-area';

const slotOrder: SlotName[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

type RestoreRoutineOption = {
    id: string;
    type: ActivityType;
    details: string;
};

const AddActivityMenu = ({
    onAddActivity,
    restoreRoutineOptions = [],
    onRestoreRoutine,
}: {
    onAddActivity: (type: ActivityType, details: string) => void;
    restoreRoutineOptions?: RestoreRoutineOption[];
    onRestoreRoutine?: (routineId: string) => void;
}) => {
    const { coreSkills } = useAuth();
    const specializations = coreSkills.filter(s => s.type === 'Specialization');

    return (
        <DropdownMenuContent className="w-56 p-2">
            <p className="font-medium text-sm p-2">Select Activity</p>
            {restoreRoutineOptions.length > 0 && onRestoreRoutine && (
                <>
                    <DropdownMenuSeparator />
                    <p className="text-xs text-muted-foreground px-2 py-1">Restore deleted routine (this day)</p>
                    {restoreRoutineOptions.map((routine) => (
                        <DropdownMenuItem key={routine.id} onClick={() => onRestoreRoutine(routine.id)}>
                            {activityIcons[routine.type]}
                            <span className="ml-2 truncate" title={routine.details}>
                                {routine.details}
                            </span>
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                </>
            )}
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

const DraggableActivity = React.memo(({ activity, index, onRemove, onSetRoutine }: { activity: Activity, index: number, onRemove: (activity: Activity) => void, onSetRoutine: (rule: RecurrenceRule | null) => void }) => {
  const [isBrowser, setIsBrowser] = React.useState(false);
  const [menuPortalContainer, setMenuPortalContainer] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setIsBrowser(true);
    setMenuPortalContainer(document.getElementById('global-popup-root') ?? document.body);
  }, []);

  const [customInterval, setCustomInterval] = React.useState(1);
  const [customUnit, setCustomUnit] = React.useState<'day' | 'week' | 'month'>('day');
  const applyCustomRepeat = () => {
    const interval = Number(customInterval);
    if (!Number.isFinite(interval) || interval <= 0) return;
    onSetRoutine({ type: 'custom', repeatInterval: interval, repeatUnit: customUnit });
  };

  const renderDraggable = (provided: any, snapshot: any) => {
    const item = (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        className={cn(
          "bg-card p-1.5 rounded-md shadow-sm group relative",
          snapshot.isDragging && "opacity-80 shadow-lg",
        )}
        style={provided.draggableProps.style}
      >
        <div className="flex items-start gap-1.5">
          <div
            {...provided.dragHandleProps}
            className="flex items-start gap-1.5 flex-grow min-w-0 cursor-grab active:cursor-grabbing"
          >
            {activityIcons[activity.type]}
            <p
              className={cn(
                "font-medium truncate text-[11px]",
                activity.completed && "line-through text-muted-foreground"
              )}
              title={activity.details}
            >
              {activity.details}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 -mr-1 -mt-1 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                    <Repeat className="h-3 w-3" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal container={menuPortalContainer ?? undefined}>
              <DropdownMenuContent className="z-[220] w-64 p-2" align="end" sideOffset={8} onCloseAutoFocus={(e) => e.preventDefault()}>
                  <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Quick Repeat</p>
                  <div className="px-2 pb-2">
                      <div className="grid grid-cols-3 gap-2">
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onSetRoutine({ type: 'daily' })}>
                              Daily
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onSetRoutine({ type: 'weekly' })}>
                              Weekly
                          </Button>
                          <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-destructive border-destructive/40 hover:text-destructive"
                              onClick={() => onSetRoutine(null)}
                              disabled={!activity.routine}
                          >
                              No Repeat
                          </Button>
                      </div>
                  </div>
                  <DropdownMenuSeparator className="my-1" />
                  <div className="rounded-md border border-border/70 bg-muted/30 p-2.5 space-y-2">
                      <div className="text-[11px] font-medium text-muted-foreground">Custom repeat</div>
                      <div className="flex items-center gap-2">
                          <input
                              type="number"
                              min={1}
                              value={customInterval}
                              onChange={(e) => setCustomInterval(Math.max(1, Number(e.target.value || 1)))}
                              className="h-9 w-16 rounded-md border border-border/70 bg-background px-2 text-xs"
                          />
                          <select
                              value={customUnit}
                              onChange={(e) => setCustomUnit(e.target.value as 'day' | 'week' | 'month')}
                              className="h-9 flex-1 rounded-md border border-border/70 bg-background px-2 text-xs"
                          >
                              <option value="day">days</option>
                              <option value="week">weeks</option>
                              <option value="month">months</option>
                          </select>
                      </div>
                      <Button size="sm" variant="secondary" className="h-8 w-full text-xs" onClick={applyCustomRepeat}>
                          Apply Custom
                      </Button>
                  </div>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 -mr-1 -mt-1 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(activity);
            }}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
    );
    
    if (!isBrowser) {
      return item;
    }

    if (snapshot.isDragging) {
      const portal = document.getElementById('global-popup-root');
      if (portal) {
        return ReactDOM.createPortal(item, portal);
      }
    }
    return item;
  };

  return (
    <Draggable draggableId={activity.id} index={index}>
      {renderDraggable}
    </Draggable>
  );
});
DraggableActivity.displayName = 'DraggableActivity';


const DroppableSlot = React.memo(({
    date,
    slot,
    activities,
    onAddActivity,
    onRemoveActivity,
    onSetRoutine,
    onRestoreRoutine,
    restoreRoutineOptions,
}: {
    date: Date,
    slot: SlotName,
    activities: Activity[],
    onAddActivity: (type: ActivityType, details: string) => void,
    onRemoveActivity: (activity: Activity) => void,
    onSetRoutine: (activity: Activity, rule: RecurrenceRule | null) => void,
    onRestoreRoutine: (routineId: string) => void,
    restoreRoutineOptions: RestoreRoutineOption[],
}) => {
    const droppableId = `${format(date, 'yyyy-MM-dd')}_${slot}`;

    return (
        <Droppable droppableId={droppableId} key={droppableId}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn("rounded-md bg-muted/30 p-2 min-h-[120px] flex flex-col gap-2 transition-colors", snapshot.isDraggingOver && "bg-primary/10")}
                >
                    {activities.map((act, index) => (
                        <DraggableActivity
                            key={act.id}
                            activity={act}
                            index={index}
                            onRemove={onRemoveActivity}
                            onSetRoutine={(rule) => onSetRoutine(act, rule)}
                        />
                    ))}
                    {provided.placeholder}
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="mt-auto w-full h-8">
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <AddActivityMenu
                            onAddActivity={onAddActivity}
                            restoreRoutineOptions={restoreRoutineOptions}
                            onRestoreRoutine={onRestoreRoutine}
                        />
                    </DropdownMenu>
                </div>
            )}
        </Droppable>
    );
});
DroppableSlot.displayName = 'DroppableSlot';

export function TimetablePageContent({ isModal = false, currentWeek: initialWeek, onWeekChange }: { 
  isModal?: boolean; 
  currentWeek?: Date;
  onWeekChange?: (newWeek: Date) => void;
}) {
    const { 
        schedule, setSchedule, 
        settings, setSettings, toggleRoutine, 
        currentSlot, 
        coreSkills,
    } = useAuth();
    const { toast } = useToast();
    const [currentWeek, setCurrentWeek] = useState(initialWeek || startOfWeek(new Date(), { weekStartsOn: 1 }));

    useEffect(() => {
        if (initialWeek) {
            setCurrentWeek(initialWeek);
        }
    }, [initialWeek]);

    const handleWeekChange = (newWeek: Date) => {
        setCurrentWeek(newWeek);
        if (onWeekChange) {
            onWeekChange(newWeek);
        }
    };

    
    const weekDates = React.useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));
    }, [currentWeek]);

    const handleAddActivity = (date: Date, slot: SlotName) => (type: ActivityType, details: string) => {
        const dateKey = format(date, 'yyyy-MM-dd');
    
        const newActivity: Activity = { 
            id: `${type}-${Date.now()}-${Math.random()}`, 
            type, 
            details, 
            completed: false,
            slot,
            habitEquationIds: settings.defaultHabitLinks?.[type] ? [settings.defaultHabitLinks[type]!] : [],
            taskIds: [],
            linkedEntityType: (type === 'deepwork' || type === 'upskill') ? 'specialization' : undefined,
        };
    
        setSchedule(prev => {
            const daySchedule = prev[dateKey] || {};
            const slotActivities = (daySchedule[slot] as Activity[] || []);
            return {
                ...prev,
                [dateKey]: {
                    ...daySchedule,
                    [slot]: [...slotActivities, newActivity]
                }
            };
        });
    
        toast({ title: "Activity Added", description: `Added "${details}" to ${format(date, 'MMM d')}, ${slot}.` });
    };


    const handleRemoveActivity = (date: Date, slot: SlotName, activity: Activity) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const rawId = activity.id || '';
        const normalizedId = rawId.replace(/_(\d{4}-\d{2}-\d{2})$/, '');
        const isRoutineInstance =
            !!activity.routine ||
            (settings.routines || []).some(r => r.id === normalizedId);

        // Deleting a routine instance should only skip it for this date, not remove future recurrences.
        if (isRoutineInstance) {
            setSettings(prev => {
                const existingForDate = new Set(prev.routineSkipByDate?.[dateKey] || []);
                existingForDate.add(normalizedId);
                return {
                    ...prev,
                    routineSkipByDate: {
                        ...(prev.routineSkipByDate || {}),
                        [dateKey]: Array.from(existingForDate),
                    },
                };
            });
        }

        setSchedule(prev => {
            const newSchedule = { ...prev };
            if (!newSchedule[dateKey] || !newSchedule[dateKey][slot]) return prev;

            const daySchedule = { ...newSchedule[dateKey] };
            const slotActivities = ((daySchedule[slot] as Activity[] | undefined) || []).filter(act => act.id !== activity.id);
            
            if (slotActivities.length > 0) {
                daySchedule[slot] = slotActivities;
            } else {
                delete daySchedule[slot];
            }

            if (Object.keys(daySchedule).length === 0) {
                 delete newSchedule[dateKey];
            } else {
                 newSchedule[dateKey] = daySchedule;
            }

            return newSchedule;
        });
    };

    const handleRestoreRoutine = (date: Date, routineId: string) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        setSettings(prev => {
            const currentForDate = prev.routineSkipByDate?.[dateKey] || [];
            const nextForDate = currentForDate.filter(id => id !== routineId);
            const nextSkipMap = { ...(prev.routineSkipByDate || {}) };
            if (nextForDate.length === 0) {
                delete nextSkipMap[dateKey];
            } else {
                nextSkipMap[dateKey] = nextForDate;
            }
            return {
                ...prev,
                routineSkipByDate: nextSkipMap,
            };
        });
        toast({ title: "Routine Restored", description: "Restored for this day." });
    };
    
    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;
    
        const sourceDroppableId = source.droppableId;
        const destinationDroppableId = destination.droppableId;
        
        setSchedule(currentSchedule => {
            const [sourceDateKey, sourceSlotName] = sourceDroppableId.split('_');
            const [destDateKey, destSlotName] = destinationDroppableId.split('_');
            
            const newSchedule = JSON.parse(JSON.stringify(currentSchedule));
    
            const sourceDaySchedule = newSchedule[sourceDateKey];
            const sourceActivities = sourceDaySchedule?.[sourceSlotName as SlotName] as Activity[] | undefined;
            
            if (!sourceActivities || source.index >= sourceActivities.length) {
                return currentSchedule; // Dragged item not found
            }
            
            const [movedActivity] = sourceActivities.splice(source.index, 1);
            movedActivity.slot = destSlotName as SlotName;
    
            const destDaySchedule = newSchedule[destDateKey] || {};
            const destActivities = (destDaySchedule[destSlotName as SlotName] as Activity[] || []);
            
            destActivities.splice(destination.index, 0, movedActivity);
        
            if (!newSchedule[destDateKey]) newSchedule[destDateKey] = {};
            newSchedule[destDateKey][destSlotName as SlotName] = destActivities;
            
            if (sourceActivities.length === 0) {
                if(newSchedule[sourceDateKey]) delete newSchedule[sourceDateKey][sourceSlotName as SlotName];
            } else {
                newSchedule[sourceDateKey][sourceSlotName as SlotName] = sourceActivities;
            }

            return newSchedule;
        });
    };

    const timetableGrid = (
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1">
            <div /> 
            {weekDays.map((day, index) => {
                const date = weekDates[index];
                const isPastDay = isBefore(date, startOfToday());
                return (
                    <div key={day} className={cn("text-center font-semibold text-sm py-2 flex-shrink-0", isPastDay && "opacity-60")}>
                        {day.substring(0,3)}
                        <div className={cn("text-xs font-normal", isToday(weekDates[index]) && "text-primary font-bold")}>
                            {format(weekDates[index], 'd')}
                        </div>
                    </div>
                )
            })}

            {slotOrder.map(slot => (
                <React.Fragment key={slot}>
                    <div className="text-right text-xs font-medium text-muted-foreground pr-2 pt-2">{slot}</div>
                    {weekDates.map(date => {
                        const dateKey = format(date, 'yyyy-MM-dd');
                        const allActivities = (schedule[dateKey]?.[slot] as Activity[] | undefined) || [];
                        const skippedRoutineIdsForDate = new Set(settings.routineSkipByDate?.[dateKey] || []);
                        const restoreRoutineOptions: RestoreRoutineOption[] = (settings.routines || [])
                            .filter(r => r.slot === slot && skippedRoutineIdsForDate.has(r.id))
                            .map(r => ({ id: r.id, type: r.type, details: r.details }));
                        // Build routine instances for this date+slot
                        const routineInstances = (settings.routines || []).flatMap(r => {
                            if (!r || !r.routine) return [] as Activity[];
                            if (r.slot !== slot) return [] as Activity[];
                            if (skippedRoutineIdsForDate.has(r.id)) return [] as Activity[];
                            const rule = r.routine;
                            // determine base date for recurrence calculations
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

                        // Merge routines with explicit schedule, avoiding duplicates by details/type/slot
                        const mergedActivities = [
                            ...allActivities,
                            ...routineInstances.filter(ri => !allActivities.some(a => a.id === ri.id))
                        ];
                        const isPastDay = isBefore(date, startOfToday());
                        
                        const activitiesToDisplay = isPastDay
                            ? mergedActivities.filter(act => act.completed)
                            : mergedActivities;
                        
                        const isCurrentSlot = isToday(date) && slot === currentSlot;

                        return (
                            <div key={dateKey} className={cn("p-1 rounded-lg", isPastDay && "opacity-60", isCurrentSlot && "bg-primary/10")}>
                                <DroppableSlot 
                                    date={date}
                                    slot={slot}
                                    activities={activitiesToDisplay}
                                    onAddActivity={handleAddActivity(date, slot)}
                                    onRemoveActivity={(activity) => handleRemoveActivity(date, slot, activity)}
                                    onSetRoutine={(activity, rule) => toggleRoutine(activity, rule, format(date, 'yyyy-MM-dd'))}
                                    onRestoreRoutine={(routineId) => handleRestoreRoutine(date, routineId)}
                                    restoreRoutineOptions={restoreRoutineOptions}
                                />
                            </div>
                        );
                    })}
                </React.Fragment>
            ))}
        </div>
      </DragDropContext>
    );


    if (isModal) {
        return (
            <div className="h-full flex flex-col overflow-hidden">
                <ScrollArea className="flex-grow">
                    <div className="p-4 pt-0">
                        {timetableGrid}
                    </div>
                </ScrollArea>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-[calc(100vh-4rem-1px)] flex flex-col">
             <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold">Weekly Timetable</h1>
                    <p className="text-muted-foreground">Plan your week at a glance. Drag and drop tasks to reschedule.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleWeekChange(addDays(currentWeek, -7))}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" onClick={() => handleWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
                    <Button variant="outline" size="icon" onClick={() => handleWeekChange(addDays(currentWeek, 7))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
            <div className="flex-grow min-h-0 relative">
                <ScrollArea className="absolute inset-0">
                    {timetableGrid}
                </ScrollArea>
            </div>
        </div>
    );
}

export default function TimetablePage() {
    return (
        <AuthGuard>
            <TimetablePageContent />
        </AuthGuard>
    )
}
