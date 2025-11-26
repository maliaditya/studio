

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType, SlotName, RecurrenceRule, FullSchedule } from '@/types/workout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSeparator, DropdownMenuSubContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, Brain, Wind, Moon, Sunrise, Sun, CloudSun, Sunset, MoonStar, PlusCircle } from 'lucide-react';
import { isToday, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { AgendaWidgetItem } from './AgendaWidgetItem';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';

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
  currentSlot: string;
  remainingTime: string | null;
  onOpenTaskContext: (activityId: string, event: React.MouseEvent) => void;
}

export function TimeSlots({
  date,
  currentSlot,
  remainingTime,
  onOpenTaskContext,
}: TimeSlotsProps) {
  const { 
    schedule: globalSchedule, 
    setSchedule: setGlobalSchedule,
    handleToggleComplete,
    toggleRoutine,
    onOpenHabitPopup,
    onOpenFocusModal,
    settings,
  } = useAuth();

  const [schedule, setSchedule] = useState<FullSchedule>(globalSchedule);

  useEffect(() => {
    setSchedule(globalSchedule);
  }, [globalSchedule]);

  // Save back to global state whenever local schedule changes
  useEffect(() => {
    setGlobalSchedule(schedule);
  }, [schedule, setGlobalSchedule]);

  const todaysSchedule = useMemo(() => schedule[format(date, 'yyyy-MM-dd')] || {}, [schedule, date]);

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
    const sourceDroppableId = source.droppableId;
    const destinationDroppableId = destination.droppableId;
    if (sourceDroppableId === destinationDroppableId && source.index === destination.index) {
        return;
    }
    const [sourceDateKey, sourceSlotName] = sourceDroppableId.split('_');
    const [destDateKey, destSlotName] = destinationDroppableId.split('_');
    setSchedule(currentSchedule => {
        const sourceDaySchedule = { ...(currentSchedule[sourceDateKey] || {}) };
        const sourceActivities = [...((sourceDaySchedule[sourceSlotName as SlotName] as Activity[]) || [])];
        const [movedActivity] = sourceActivities.splice(source.index, 1);
        if (!movedActivity) return currentSchedule;
        movedActivity.slot = destSlotName;
        
        const newSchedule = { ...currentSchedule, [sourceDateKey]: { ...sourceDaySchedule, [sourceSlotName as SlotName]: sourceActivities } };

        const destDaySchedule = { ...(newSchedule[destDateKey] || {}) };
        const destActivities = [...((destDaySchedule[destSlotName as SlotName] as Activity[]) || [])];
        destActivities.splice(destination.index, 0, movedActivity);
        newSchedule[destDateKey] = { ...destDaySchedule, [destSlotName as SlotName]: destActivities };

        return newSchedule;
    });
  };

  const handleAddActivity = (slotName: string, type: ActivityType, details: string) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const newActivity: Activity = {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        details,
        completed: false,
        slot: slotName,
    };
    setSchedule(prev => ({
        ...prev,
        [dateKey]: {
            ...(prev[dateKey] || {}),
            [slotName]: [...((prev[dateKey]?.[slotName as SlotName] as Activity[]) || []), newActivity],
        }
    }));
  };

  const onRemoveActivity = (slotName: string, activityId: string, date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setSchedule(prev => {
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

  const handleActivityClick = (slotName: string, activity: Activity, event: React.MouseEvent) => {
    if (activity.completed) return;
    if (activity.type === 'deepwork' || activity.type === 'upskill' || activity.type === 'branding') {
        onOpenFocusModal(activity);
    }
  };


  return (
    <DragDropContext onDragEnd={onDragEnd}>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {slots.map((slot) => {
        const activities = (todaysSchedule[slot.name as keyof DailySchedule] as Activity[]) || [];
        const isCurrentSlotToday = isToday(date) && currentSlot === slot.name;

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
                {isCurrentSlotToday && remainingTime !== null ? (
                  <div className="font-mono text-lg text-primary/80 tracking-wider animate-subtle-pulse">
                    {remainingTime}
                  </div>
                ) : (
                  <div className="h-7 w-7 flex items-center justify-center">
                    {slot.icon}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow justify-between min-h-[8rem] p-3">
              <div className="flex-grow min-h-0 mb-2">
                <ScrollArea className="h-[200px] pr-2">
                  <ul className="space-y-2">
                    {activities && activities.length > 0 ? (
                      activities.map((activity) => (
                        <AgendaWidgetItem
                          key={activity.id}
                          activity={{...activity, slot: slot.name as SlotName}}
                          date={date}
                          onToggleComplete={handleToggleComplete}
                          onActivityClick={handleActivityClick}
                          onRemoveActivity={(slotName, id) => onRemoveActivity(slotName, id, date)}
                          setRoutine={toggleRoutine}
                          onOpenTaskContext={onOpenTaskContext}
                          onOpenHabitPopup={onOpenHabitPopup}
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
                </ScrollArea>
              </div>
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
