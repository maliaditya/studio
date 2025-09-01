

      
"use client";

import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Moon, Sun, Sunset, MoonStar, CloudSun, Sunrise, PlusCircle, Trash2,
  Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, MoreVertical, Link as LinkIcon, Brain, Wind
} from 'lucide-react';
import type { ActivityType, Activity, DailySchedule, FullSchedule, SubTask } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from './ui/dropdown-menu';
import { useState, useMemo } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';

const slots = [
  { name: 'Late Night', time: '12 AM - 4 AM', icon: <Moon className="h-6 w-6 text-indigo-400" /> },
  { name: 'Dawn', time: '4 AM - 8 AM', icon: <Sunrise className="h-6 w-6 text-orange-400" /> },
  { name: 'Morning', time: '8 AM - 12 PM', icon: <Sun className="h-6 w-6 text-yellow-400" /> },
  { name: 'Afternoon', time: '12 PM - 4 PM', icon: <CloudSun className="h-6 w-6 text-sky-500" /> },
  { name: 'Evening', time: '4 PM - 8 PM', icon: <Sunset className="h-6 w-6 text-purple-500" /> },
  { name: 'Night', time: '8 PM - 12 AM', icon: <MoonStar className="h-6 w-6 text-indigo-500" /> }
];

const activityIcons: Record<ActivityType, React.ReactNode> = {
  workout: <Dumbbell className="h-5 w-5" />,
  upskill: <BookOpenCheck className="h-5 w-5" />,
  deepwork: <Briefcase className="h-5 w-5" />,
  planning: <ClipboardList className="h-5 w-5" />,
  tracking: <ClipboardCheck className="h-5 w-5" />,
  branding: <Share2 className="h-5 w-5" />,
  'lead-generation': <Magnet className="h-5 w-5" />,
  interrupt: <AlertCircle className="h-5 w-5 text-destructive" />,
  distraction: <Wind className="h-5 w-5 text-yellow-500" />,
  essentials: <CheckSquare className="h-5 w-5" />,
  nutrition: <Utensils className="h-5 w-5" />,
  mindset: <Brain className="h-5 w-5" />,
};

interface TimeSlotsProps {
  date: Date;
  schedule: DailySchedule;
  currentSlot: string;
  remainingTime: string;
  onAddActivity: (slotName: string, type: ActivityType) => void;
  onRemoveActivity: (slotName: string, activityId: string) => void;
  onToggleComplete: (slotName: string, activityId: string, isCompleted: boolean) => void;
  onActivityClick: (slotName: string, activity: Activity, event: React.MouseEvent) => void;
}

const parseDurationToMinutes = (durationStr: string | undefined): number => {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    
    // Handle "30" as "30m"
    if (/^\d+$/.test(durationStr.trim())) {
        return parseInt(durationStr.trim(), 10);
    }

    let totalMinutes = 0;
    const hourMatch = durationStr.match(/(\d+)\s*h/);
    if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
    const minMatch = durationStr.match(/(\d+)\s*m/);
    if (minMatch) totalMinutes += parseInt(minMatch[1], 10);
    
    return totalMinutes;
};


export function TimeSlots({
  date,
  schedule,
  currentSlot,
  remainingTime,
  onAddActivity,
  onRemoveActivity,
  onToggleComplete,
  onActivityClick,
}: TimeSlotsProps) {

  const { activityDurations, setSchedule, workoutMode, workoutPlans, exerciseDefinitions, habitCards } = useAuth();
  const SLOT_CAPACITY_MINUTES = 240;

  const handleToggleRoutine = (slotName: string, activityId: string) => {
    setSchedule(prev => {
        const newSchedule = { ...prev };
        for (const dateKey in newSchedule) {
            const day = newSchedule[dateKey];
            if (day[slotName] && Array.isArray(day[slotName])) {
                const activities = day[slotName] as Activity[];
                const activityIndex = activities.findIndex(a => a.id === activityId);
                if (activityIndex > -1) {
                    const updatedActivities = [...activities];
                    updatedActivities[activityIndex] = { ...updatedActivities[activityIndex], isRoutine: !updatedActivities[activityIndex].isRoutine };
                    newSchedule[dateKey] = { ...day, [slotName]: updatedActivities };
                }
            }
        }
        return newSchedule;
    });
  };

  const handleLinkHabit = (activityId: string, habitId: string) => {
    setSchedule(prev => {
        const newSchedule = { ...prev };
        for (const dateKey in newSchedule) {
            const day = newSchedule[dateKey];
            for(const slotName in day) {
                if (Array.isArray(day[slotName])) {
                    const activities = day[slotName] as Activity[];
                    const activityIndex = activities.findIndex(a => a.id === activityId);
                    if (activityIndex > -1) {
                        const updatedActivities = [...activities];
                        const currentHabits = updatedActivities[activityIndex].habitEquationIds || [];
                        const isLinked = currentHabits.includes(habitId);
                        updatedActivities[activityIndex] = {
                            ...updatedActivities[activityIndex],
                            habitEquationIds: isLinked ? currentHabits.filter(id => id !== habitId) : [...currentHabits, habitId]
                        };
                        newSchedule[dateKey] = { ...day, [slotName]: updatedActivities };
                        return newSchedule; // Exit after finding and updating
                    }
                }
            }
        }
        return newSchedule;
    });
  };

  const handleAddSubTask = (slotName: string, activityId: string) => {
    const newSubTask: SubTask = { id: `sub_${Date.now()}`, text: '', completed: false };
    setSchedule(prev => {
        const dayKey = Object.keys(prev).find(key => prev[key][slotName]?.some(act => act.id === activityId));
        if (!dayKey) return prev;
        const newSchedule = { ...prev };
        const daySchedule = { ...newSchedule[dayKey] };
        daySchedule[slotName] = (daySchedule[slotName] as Activity[]).map(act =>
            act.id === activityId
                ? { ...act, subTasks: [...(act.subTasks || []), newSubTask] }
                : act
        );
        newSchedule[dayKey] = daySchedule;
        return newSchedule;
    });
  };

  const handleUpdateSubTask = (slotName: string, activityId: string, subTaskId: string, newText: string) => {
    setSchedule(prev => {
        const dayKey = Object.keys(prev).find(key => prev[key][slotName]?.some(act => act.id === activityId));
        if (!dayKey) return prev;
        const newSchedule = { ...prev };
        const daySchedule = { ...newSchedule[dayKey] };
        daySchedule[slotName] = (daySchedule[slotName] as Activity[]).map(act =>
            act.id === activityId
                ? { ...act, subTasks: (act.subTasks || []).map(st => st.id === subTaskId ? { ...st, text: newText } : st) }
                : act
        );
        newSchedule[dayKey] = daySchedule;
        return newSchedule;
    });
  };
  
  const handleToggleSubTask = (slotName: string, activityId: string, subTaskId: string) => {
    setSchedule(prev => {
        const dayKey = Object.keys(prev).find(key => prev[key][slotName]?.some(act => act.id === activityId));
        if (!dayKey) return prev;
        const newSchedule = { ...prev };
        const daySchedule = { ...newSchedule[dayKey] };
        daySchedule[slotName] = (daySchedule[slotName] as Activity[]).map(act =>
            act.id === activityId
                ? { ...act, subTasks: (act.subTasks || []).map(st => st.id === subTaskId ? { ...st, completed: !st.completed } : st) }
                : act
        );
        newSchedule[dayKey] = daySchedule;
        return newSchedule;
    });
  };

  const handleDeleteSubTask = (slotName: string, activityId: string, subTaskId: string) => {
    setSchedule(prev => {
      const dayKey = Object.keys(prev).find(key => prev[key][slotName]?.some(act => act.id === activityId));
      if (!dayKey) return prev;
      const newSchedule = { ...prev };
      const daySchedule = { ...newSchedule[dayKey] };
      daySchedule[slotName] = (daySchedule[slotName] as Activity[]).map(act =>
        act.id === activityId
          ? { ...act, subTasks: (act.subTasks || []).filter(st => st.id !== subTaskId) }
          : act
      );
      newSchedule[dayKey] = daySchedule;
      return newSchedule;
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {slots.map((slot) => {
        const activities = (schedule[slot.name] as Activity[]) || [];
        const currentSlotDuration = activities.reduce((sum, act) => {
            let duration = 0;
            if(act.type === 'essentials' || act.type === 'interrupt') {
                duration = act.duration || 0;
            } else {
                duration = parseDurationToMinutes(activityDurations[act.id]);
            }
            return sum + duration;
        }, 0);

        return (
          <Card
            key={slot.name}
            id={`slot-card-${slot.name.replace(/\s+/g, '-')}`}
            className={cn(
              "transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col",
              currentSlot === slot.name
                ? 'ring-2 ring-primary shadow-2xl bg-card'
                : 'shadow-md bg-card/60'
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg font-medium">{slot.name}</CardTitle>
                <CardDescription>{slot.time}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {currentSlot === slot.name ? (
                  <div className="font-mono text-lg text-primary/80 tracking-wider animate-subtle-pulse">
                    {remainingTime}
                  </div>
                ) : (
                  slot.icon
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow justify-between min-h-[8rem]">
              <div className="flex-grow space-y-2 mb-2">
                {activities && activities.length > 0 ? (
                  activities.map((activity) => {
                    let displayDetails = activity.details;
                    if (activity.type === 'workout') {
                      const { description } = getExercisesForDay(date, workoutMode, workoutPlans, exerciseDefinitions);
                      displayDetails = description.split(' for ')[1] || "Workout";
                    }

                    const linkedHabit = habitCards.find(h => activity.habitEquationIds?.includes(h.id));

                    return (
                      <div key={activity.id} className="p-2.5 rounded-md bg-card/70 shadow-sm group">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className="flex items-start gap-3 flex-grow min-w-0"
                            onClick={(e) => !activity.completed && onActivityClick(slot.name, activity, e)}
                          >
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleComplete(slot.name, activity.id, !activity.completed);
                              }}
                              className="pt-0.5"
                            >
                              {activity.completed 
                                ? <CheckSquare className="h-5 w-5 text-green-500 flex-shrink-0" />
                                : <div className="h-5 w-5 border-2 rounded-sm mt-0.5 flex-shrink-0" />
                              }
                            </button>
                            <div className="flex-grow min-w-0">
                              <p className={cn("font-semibold text-foreground", activity.completed && "line-through")}>
                                {displayDetails}
                              </p>
                              <div className="text-xs text-muted-foreground capitalize flex items-center gap-2">
                                <span>{activity.type === 'deepwork' ? 'Deep Work' : activity.type === 'branding' ? 'Personal Branding' : activity.type === 'lead-generation' ? 'Lead Generation' : activity.type.replace('-', ' ')}</span>
                                {activityDurations[activity.id] && <span className="font-mono">({activityDurations[activity.id]})</span>}
                              </div>
                              {linkedHabit && (
                                <div className="min-w-0">
                                  <p className="text-xs text-primary font-medium truncate" title={linkedHabit.name}>
                                    Habit: {linkedHabit.name}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center flex-shrink-0">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                    <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleAddSubTask(slot.name, activity.id)}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> Add Sub-task
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleRoutine(slot.name, activity.id)}>{activity.isRoutine ? "Unmark as Routine" : "Mark as Routine"}</DropdownMenuItem>
                                  {activity.type !== 'interrupt' && (
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <LinkIcon className="mr-2 h-4 w-4" />
                                        <span>Link Habit</span>
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuPortal>
                                         <DropdownMenuSubContent>
                                          <ScrollArea className="h-48">
                                            {habitCards.map(habit => (
                                                <DropdownMenuItem key={habit.id} onSelect={() => handleLinkHabit(activity.id, habit.id)}>
                                                    {habit.name}
                                                </DropdownMenuItem>
                                            ))}
                                            {habitCards.length === 0 && <DropdownMenuItem disabled>No habits found</DropdownMenuItem>}
                                          </ScrollArea>
                                        </DropdownMenuSubContent>
                                      </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => onRemoveActivity(slot.name, activity.id)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </div>
                        </div>
                        {activity.subTasks && activity.subTasks.length > 0 && (
                            <div className="pl-8 pt-2 space-y-2">
                                {activity.subTasks.map(st => (
                                    <div key={st.id} className="flex items-center gap-2 group/subtask">
                                        <Checkbox 
                                            id={`subtask-${st.id}`}
                                            checked={st.completed}
                                            onCheckedChange={() => handleToggleSubTask(slot.name, activity.id, st.id)}
                                        />
                                        <Input
                                            value={st.text}
                                            onChange={(e) => handleUpdateSubTask(slot.name, activity.id, st.id, e.target.value)}
                                            onBlur={(e) => { if (e.target.value.trim() === '') handleDeleteSubTask(slot.name, activity.id, st.id) }}
                                            className={cn("h-7 text-xs border-0 bg-transparent px-1 focus-visible:ring-1 focus-visible:ring-ring", st.completed && "line-through text-muted-foreground")}
                                            placeholder="New sub-task..."
                                        />
                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/subtask:opacity-100" onClick={() => handleDeleteSubTask(slot.name, activity.id, st.id)}>
                                            <Trash2 className="h-3 w-3 text-destructive"/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="flex-grow flex items-center justify-center h-full">
                    {currentSlot === slot.name ? (
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
              </div>

              {currentSlotDuration < SLOT_CAPACITY_MINUTES && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="mt-auto self-end h-8 w-8 rounded-full">
                      <PlusCircle className="h-5 w-5" />
                      <span className="sr-only">Add Activity</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-2" align="end" side="top">
                    <div className="grid gap-1">
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name, 'workout')}>
                        <Dumbbell className="h-4 w-4 mr-2" />
                        Add Workout
                      </Button>
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name, 'mindset')}>
                        <Brain className="h-4 w-4 mr-2" />
                        Add Mindset
                      </Button>
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name, 'upskill')}>
                        <BookOpenCheck className="h-4 w-4 mr-2" />
                        Add Upskill
                      </Button>
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name, 'deepwork')}>
                        <Briefcase className="h-4 w-4 mr-2" />
                        Add Deep Work
                      </Button>
                       <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name, 'essentials')}>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Add Daily Essentials
                      </Button>
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name, 'nutrition')}>
                        <Utensils className="h-4 w-4 mr-2" />
                        Add Nutrition
                      </Button>
                      <Separator className="my-1" />
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name, 'branding')}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Add Branding
                      </Button>
                       <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name, 'lead-generation')}>
                        <Magnet className="h-4 w-4 mr-2" />
                        Add Lead Gen
                      </Button>
                      <Separator className="my-1" />
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name, 'planning')}>
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Add Planning
                      </Button>
                      <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name, 'tracking')}>
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        Add Tracking
                      </Button>
                      <Separator className="my-1" />
                      <Button variant="ghost" size="sm" className="justify-start text-destructive hover:text-destructive" onClick={() => onAddActivity(slot.name, 'interrupt')}>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Add Interrupt
                      </Button>
                      <Button variant="ghost" size="sm" className="justify-start text-yellow-600 hover:text-yellow-600" onClick={() => onAddActivity(slot.name, 'distraction')}>
                        <Wind className="h-4 w-4 mr-2" />
                        Add Distraction
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  );
}
