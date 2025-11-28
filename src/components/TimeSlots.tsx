
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType, FullSchedule, SubTask, MetaRule, SlotName, RecurrenceRule, ExerciseDefinition } from '@/types/workout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSeparator, DropdownMenuSubContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, Brain, Wind, Moon, Sunrise, Sun, CloudSun, Sunset, MoonStar, PlusCircle } from 'lucide-react';
import { isToday, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { AgendaWidgetItem } from './AgendaWidgetItem';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useToast } from '@/hooks/use-toast';


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
  onOpenTaskContext: (activityId: string, event: React.MouseEvent) => void;
  onOpenHabitPopup: (habitId: string, event: React.MouseEvent) => void;
  onOpenFocusModal: (activity: Activity) => boolean;
  onOpenLearningModal: (activity: Activity) => void;
  onStartFocus: (activity: Activity, event: React.MouseEvent) => void;
}

export function TimeSlots({
  date,
  schedule,
  currentSlot,
  onOpenTaskContext,
  onOpenHabitPopup,
  onOpenFocusModal,
  onOpenLearningModal,
  onStartFocus,
}: TimeSlotsProps) {
    const { toast } = useAuth();
    const { setSchedule: setGlobalSchedule, settings, handleToggleComplete, toggleRoutine, activityDurations } = useAuth();
    const dateKey = useMemo(() => format(date, 'yyyy-MM-dd'), [date]);
    const todaysSchedule = useMemo(() => schedule[dateKey] || {}, [schedule, dateKey]);


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
    const sourceSlotName = source.droppableId;
    const destinationSlotName = destination.droppableId;

    setGlobalSchedule(currentSchedule => {
        const daySchedule = { ...(currentSchedule[dateKey] || {}) };

        const sourceActivities = [...((daySchedule[sourceSlotName as SlotName] as Activity[]) || [])];
        const [movedActivity] = sourceActivities.splice(source.index, 1);

        if (!movedActivity) return currentSchedule;
        
        movedActivity.slot = destinationSlotName;

        daySchedule[sourceSlotName as SlotName] = sourceActivities;

        const destActivities = sourceSlotName === destinationSlotName 
            ? sourceActivities 
            : [...((daySchedule[destinationSlotName as SlotName] as Activity[]) || [])];
        
        destActivities.splice(destination.index, 0, movedActivity);
        daySchedule[destinationSlotName as SlotName] = destActivities;

        return { ...currentSchedule, [dateKey]: daySchedule };
    });
  };

  const handleAddActivity = (slotName: string, type: ActivityType, details: string) => {
    const newActivity: Activity = {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        details,
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

  const handleActivityClick = (activity: Activity, event: React.MouseEvent) => {
    if (activity.type === 'upskill' || activity.type === 'deepwork') {
      const handled = onOpenFocusModal(activity);
      if (!handled) {
          onOpenTaskContext(activity.id, event);
      }
    } else {
      // For other types, do nothing, allowing inline edit or other default behaviors.
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
                                {activities && activities.length > 0 ? (
                                activities.map((activity, index) => (
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
                                            onActivityClick={handleActivityClick}
                                            onStartFocus={onStartFocus}
                                            onRemoveActivity={onRemoveActivity}
                                            onUpdateActivity={handleUpdateActivity}
                                            setRoutine={toggleRoutine}
                                            onOpenHabitPopup={onOpenHabitPopup}
                                            context="timeslot"
                                            loggedDuration={activityDurations[activity.id]}
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
