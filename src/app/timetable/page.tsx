
"use client";

import React, { useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, PlusCircle, Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, CheckSquare, Utensils, Wind, AlertCircle, Brain, Trash2, CheckCircle2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Activity, ActivityType, DailySchedule, SlotName } from '@/types/workout';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

export function TimetablePageContent({ isModal = false }: { isModal?: boolean }) {
    const { schedule, setSchedule, settings, handleToggleComplete: authToggleComplete } = useAuth();
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

    const handleToggleComplete = (date: Date, slot: SlotName, activityId: string, completed: boolean) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        setSchedule(prev => {
            const newSchedule = { ...prev };
            const daySchedule = { ...(newSchedule[dateKey] || {}) };
            const activities = (daySchedule[slot] as Activity[] || []);
            const activityIndex = activities.findIndex(a => a.id === activityId);

            if (activityIndex > -1) {
                const updatedActivities = [...activities];
                updatedActivities[activityIndex] = { 
                    ...updatedActivities[activityIndex], 
                    completed,
                    completedAt: completed ? Date.now() : undefined
                };
                daySchedule[slot] = updatedActivities;
                newSchedule[dateKey] = daySchedule;
            }
            return newSchedule;
        });
    };

    const timetableGrid = (
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
                        const activities = (schedule[dateKey]?.[slot] as Activity[] || []);
                        return (
                            <div key={`${dateKey}-${slot}`} className="border rounded-md bg-muted/30 p-2 min-h-[120px] flex flex-col gap-2">
                                {activities.map(act => (
                                    <div key={act.id} className="text-xs bg-card p-1.5 rounded-md shadow-sm group relative">
                                        <div className="flex items-start gap-1.5">
                                            <button onClick={() => handleToggleComplete(date, slot, act.id, !act.completed)} className="pt-0.5">
                                                <span className={cn("mt-0.5", act.completed && "text-green-500")}>{activityIcons[act.type]}</span>
                                            </button>
                                            <div className="flex-grow min-w-0">
                                                <p className={cn("font-medium truncate", act.completed && "line-through text-muted-foreground")} title={act.details}>{act.details}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1 -mt-1 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveActivity(date, slot, act.id)}>
                                                <Trash2 className="h-3 w-3 text-destructive"/>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="mt-auto w-full h-8">
                                            <PlusCircle className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <AddActivityMenu onAddActivity={handleAddActivity(date, slot)} />
                                </DropdownMenu>
                            </div>
                        );
                    })}
                </React.Fragment>
            ))}
        </div>
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
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Weekly Timetable</CardTitle>
                            <CardDescription>Plan your week at a glance. Changes here will reflect on your dashboard.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => setCurrentWeek(prev => addDays(prev, -7))}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
                            <Button variant="outline" size="icon" onClick={() => setCurrentWeek(prev => addDays(prev, 7))}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        {timetableGrid}
                    </div>
                </CardContent>
            </Card>
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
