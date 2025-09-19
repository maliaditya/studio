

"use client";

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, PlusCircle, Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, CheckSquare, Utensils, Wind, AlertCircle, Brain, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Activity, ActivityType, DailySchedule, SlotName } from '@/types/workout';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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

const DraggableActivity = ({ activity, date, slot, index, onRemove }: { activity: Activity, date: Date, slot: SlotName, index: number, onRemove: (id: string) => void }) => {
  const portal = React.useRef<HTMLElement | null>(
    typeof document !== 'undefined'
      ? document.getElementById('global-popup-root')
      : null
  ).current;

  const renderDraggable = (provided: any, snapshot: any) => {
    const child = (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={cn(
          "text-xs bg-card p-1.5 rounded-md shadow-sm group relative",
          snapshot.isDragging && "opacity-80 shadow-lg"
        )}
        style={{...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.5 : 1}} // Hide original item
      >
        <div className="flex items-start gap-1.5">
          {activityIcons[activity.type]}
          <div className="flex-grow min-w-0">
            <p className={cn("font-medium truncate", activity.completed && "line-through text-muted-foreground")} title={activity.details}>{activity.details}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1 -mt-1 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onRemove(activity.id); }}>
            <Trash2 className="h-3 w-3 text-destructive"/>
          </Button>
        </div>
      </div>
    );

    if (snapshot.isDragging && portal) {
      return ReactDOM.createPortal(
        // Render a simpler clone for performance
        <div className="text-xs bg-card p-1.5 rounded-md shadow-lg flex items-start gap-1.5 w-[150px]">
          {activityIcons[activity.type]}
          <p className="font-medium truncate">{activity.details}</p>
        </div>,
        portal
      );
    }
    return child;
  };
    
    return (
        <Draggable draggableId={activity.id} index={index}>
            {renderDraggable}
        </Draggable>
    );
};


export function TimetablePageContent({ isModal = false }: { isModal?: boolean }) {
    const { schedule, setSchedule, settings } = useAuth();
    const { toast } = useToast();
    const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const weekDates = React.useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));
    }, [currentWeek]);

    const handleAddActivity = (date: Date, slot: SlotName) => (type: ActivityType, details: string) => {
        const dateKey = format(date, 'yyyy-MM-dd');

        const newActivity: Activity = {
            id: `${type}-${Date.now()}`,
            type,
            details,
            completed: false,
            slot,
            habitEquationIds: settings.defaultHabitLinks?.[type] ? [settings.defaultHabitLinks[type]!] : [],
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

    const handleRemoveActivity = (date: Date, slot: SlotName, activityId: string) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        setSchedule(prev => {
            const daySchedule = { ...(prev[dateKey] || {}) };
            const slotActivities = (daySchedule[slot] as Activity[] || []).filter(act => act.id !== activityId);
            if (slotActivities.length > 0) {
                daySchedule[slot] = slotActivities;
            } else {
                delete daySchedule[slot];
            }
            return { ...prev, [dateKey]: daySchedule };
        });
    };
    
    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;
    
        const [sourceDateKey, sourceSlotName] = source.droppableId.split('_');
        const [destDateKey, destSlotName] = destination.droppableId.split('_');
    
        setSchedule(prevSchedule => {
            const newSchedule = JSON.parse(JSON.stringify(prevSchedule));
    
            const sourceDaySchedule = newSchedule[sourceDateKey] || {};
            const sourceSlotActivities = (sourceDaySchedule[sourceSlotName as SlotName] as Activity[]) || [];
            if (!sourceSlotActivities[source.index]) return prevSchedule;
            
            const [movedTask] = sourceSlotActivities.splice(source.index, 1);
            if (!movedTask) return prevSchedule;
    
            // If source slot becomes empty, remove it
            if (sourceSlotActivities.length === 0) {
                delete sourceDaySchedule[sourceSlotName as SlotName];
            } else {
                sourceDaySchedule[sourceSlotName as SlotName] = sourceSlotActivities;
            }
            // If day becomes empty, remove it
            if (Object.keys(sourceDaySchedule).length === 0) {
                delete newSchedule[sourceDateKey];
            } else {
                newSchedule[sourceDateKey] = sourceDaySchedule;
            }
    
            // Now handle destination
            const destDaySchedule = newSchedule[destDateKey] || {};
            const destSlotActivities = (destDaySchedule[destSlotName as SlotName] as Activity[]) || [];
            destSlotActivities.splice(destination.index, 0, { ...movedTask, slot: destSlotName as SlotName });
            
            destDaySchedule[destSlotName as SlotName] = destSlotActivities;
            newSchedule[destDateKey] = destDaySchedule;
    
            return newSchedule;
        });
    };


    const timetableGrid = (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-8 gap-1 min-w-[1200px]">
                <div /> 
                {weekDays.map((day, index) => (
                    <div key={day} className="text-center font-semibold text-sm py-2">
                        {day}
                        <div className={cn("text-xs font-normal", isToday(weekDates[index]) && "text-primary font-bold")}>
                            {format(weekDates[index], 'MMM d')}
                        </div>
                    </div>
                ))}

                {slotOrder.map(slot => (
                    <React.Fragment key={slot}>
                        <div className="text-right text-xs font-medium text-muted-foreground pr-2 pt-2">{slot}</div>
                        {weekDates.map(date => {
                            const dateKey = format(date, 'yyyy-MM-dd');
                            const droppableId = `${dateKey}_${slot}`;
                            const activities = (schedule[dateKey]?.[slot] as Activity[] || []);
                            
                            return (
                                <Droppable droppableId={droppableId} key={droppableId}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={cn("border rounded-md bg-muted/30 p-2 min-h-[120px] flex flex-col gap-2 transition-colors", snapshot.isDraggingOver && "bg-primary/10")}
                                        >
                                            {activities.map((act, index) => (
                                                <DraggableActivity
                                                    key={act.id}
                                                    activity={act}
                                                    date={date}
                                                    slot={slot}
                                                    index={index}
                                                    onRemove={(id) => handleRemoveActivity(date, slot, id)}
                                                />
                                            ))}
                                            {provided.placeholder}
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="mt-auto w-full h-8">
                                                        <PlusCircle className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <AddActivityMenu onAddActivity={handleAddActivity(date, slot)} />
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </Droppable>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </DragDropContext>
    );

    if (isModal) {
        return (
            <div className="p-4 overflow-x-auto">
                {timetableGrid}
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
             <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold">Weekly Timetable</h1>
                    <p className="text-muted-foreground">Plan your week at a glance. Drag and drop tasks to reschedule.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentWeek(prev => addDays(prev, -7))}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentWeek(prev => addDays(prev, 7))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
            <div className="overflow-x-auto">
                {timetableGrid}
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
