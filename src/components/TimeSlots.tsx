
      
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType, FullSchedule, SubTask } from '@/types/workout';
import {
  CheckCircle2, Circle, Grab, Dock, Move, Save, History, PlusCircle, BrainCircuit, Timer, GitBranch, Focus, Repeat, Link as LinkIcon, Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, MoreVertical, Brain, Wind, Moon, Sunrise, Sun, CloudSun, Sunset, MoonStar, ChevronLeft, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, parseISO, isBefore, startOfDay } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { useRouter } from 'next/navigation';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSeparator, DropdownMenuSubContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';

const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

interface AgendaWidgetItemProps {
  activity: Activity &amp; { slot: keyof DailySchedule };
  duration: string | undefined;
  date: Date;
  onLogLearning: (activity: Activity, progress: number, duration: number) =&gt; void;
  onStartWorkoutLog: (activity: Activity) =&gt; void;
  onToggleComplete: (slotName: string, activityId: string, isCompleted: boolean) =&gt; void;
  onStartLeadGenLog: (activity: Activity) =&gt; void;
  onOpenFocusModal: (activity: Activity) =&gt; boolean;
  onOpenTaskContext: (activityId: string, event: React.MouseEvent&lt;HTMLButtonElement&gt;) =&gt; void;
  onOpenHabitPopup: (habitId: string, event: React.MouseEvent) =&gt; void;
}

function AgendaWidgetItem({ 
    activity, 
    duration, 
    date,
    onStartWorkoutLog, 
    onToggleComplete, 
    onStartLeadGenLog, 
    onOpenFocusModal, 
    onOpenTaskContext,
    onOpenHabitPopup,
}: AgendaWidgetItemProps) {
  const { workoutMode, workoutPlans, exerciseDefinitions, habitCards } = useAuth();
  const { toast } = useToast();
  
  let displayDetails = activity.details;
  if (activity.type === 'workout') {
    const { description } = getExercisesForDay(date, workoutMode, workoutPlans, exerciseDefinitions);
    displayDetails = description.split(' for ')[1] || "Workout";
  }

  const linkedHabit = useMemo(() =&gt; {
    if (activity.habitEquationIds &amp;&amp; activity.habitEquationIds.length &gt; 0) {
      // For simplicity, showing the first linked habit. Can be expanded later.
      return habitCards.find(h =&gt; h.id === activity.habitEquationIds![0]);
    }
    return null;
  }, [activity.habitEquationIds, habitCards]);

  const handleTitleClick = (event: React.MouseEvent) =&gt; {
    if (activity.completed) {
      onToggleComplete(activity.slot, activity.id, false);
      return;
    }
    
    if (linkedHabit) {
        onOpenHabitPopup(linkedHabit.id, event);
        return;
    }
  };

  const handleFocusClick = (e: React.MouseEvent&lt;HTMLButtonElement&gt;) =&gt; {
    e.stopPropagation();
    const shouldOpenModal = onOpenFocusModal(activity);
    if (!shouldOpenModal) {
      toast({
        title: "Objective Already Complete",
        description: `All sub-tasks for "${activity.details}" are already logged.`,
      });
    }
  };
  
  const itemContent = (
    &lt;div className="flex items-center justify-between gap-4 p-2 rounded-md bg-muted/50 w-full group"&gt;
      &lt;div className="flex items-start gap-3 min-w-0 flex-grow"&gt;
        &lt;button onClick={() =&gt; onToggleComplete(activity.slot, activity.id, !activity.completed)} className="pt-0.5"&gt;
            {activity.completed 
              ? &lt;CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" /&gt;
              : &lt;Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" /&gt;
            }
        &lt;/button&gt;
        &lt;div 
          className={cn("flex-grow min-w-0", !activity.completed &amp;&amp; (activity.type === 'essentials' || linkedHabit) &amp;&amp; "cursor-pointer")}
          onClick={handleTitleClick}
        &gt;
          &lt;p className={`font-medium truncate ${activity.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`} title={displayDetails}&gt;
            {displayDetails}
          &lt;/p&gt;
          {linkedHabit &amp;&amp; (
            &lt;div className="min-w-0"&gt;
                &lt;p className="text-xs text-primary font-medium truncate" title={linkedHabit.name}&gt;
                    Habit: {linkedHabit.name}
                &lt;/p&gt;
            &lt;/div&gt;
          )}
        &lt;/div&gt;
      &lt;/div&gt;
      &lt;div className="flex-shrink-0 flex items-center text-right gap-1"&gt;
        {duration &amp;&amp; &lt;p className="text-xs font-semibold whitespace-nowrap text-muted-foreground"&gt;{duration}&lt;/p&gt;}
        {!activity.completed &amp;&amp; activity.type !== 'interrupt' ? (
            &lt;Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleFocusClick}
            &gt;
                &lt;Timer className="h-4 w-4" /&gt;
            &lt;/Button&gt;
        ) : (activity.taskIds &amp;&amp; activity.taskIds.length &gt; 0) ? (
            &lt;Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) =&gt; onOpenTaskContext(activity.id, e)}
            &gt;
                &lt;GitBranch className="h-4 w-4" /&gt;
            &lt;/Button&gt;
        ) : null}
      &lt;/div&gt;
    &lt;/div&gt;
  );
  
  return &lt;li&gt;{itemContent}&lt;/li&gt;;
}


interface TimeSlotsProps {
  date: Date;
  schedule: DailySchedule;
  currentSlot: string;
  remainingTime: string;
  onAddActivity: (slotName: string, type: ActivityType) =&gt; void;
  onRemoveActivity: (slotName: string, activityId: string) =&gt; void;
  onToggleComplete: (slotName: string, activityId: string, isCompleted: boolean) =&gt; void;
  onActivityClick: (slotName: string, activity: Activity, event: React.MouseEvent) =&gt; void;
  slotDurations: Record&lt;string, { logged: number; total: number }&gt;;
}

export function TimeSlots({
  date,
  schedule,
  currentSlot,
  remainingTime,
  onAddActivity,
  onRemoveActivity,
  onToggleComplete,
  onActivityClick,
  slotDurations,
}: TimeSlotsProps) {

  const { setSchedule, workoutMode, workoutPlans, exerciseDefinitions, habitCards, missedSlotReviews, pillarEquations, handleLinkHabit: linkHabitFromContext } = useAuth();
  
  const handleToggleRoutine = (activity: Activity) =&gt; {
    setSchedule(prev =&gt; {
        const dayKey = format(date, 'yyyy-MM-dd');
        const newSchedule = { ...prev };
        const daySchedule = { ...(newSchedule[dayKey] || {}) };
        daySchedule[activity.slot] = (daySchedule[activity.slot] as Activity[]).map(act =&gt; 
            act.id === activity.id 
                ? { ...act, isRoutine: !act.isRoutine }
                : act
        );
        newSchedule[dayKey] = daySchedule;
        return newSchedule;
    });
  };

  const handleLinkHabit = (activityId: string, habitId: string) =&gt; {
    linkHabitFromContext(activityId, habitId, date);
  };

  const handleAddSubTask = (slotName: string, activityId: string) =&gt; {
    const newSubTask: SubTask = { id: `sub_${Date.now()}`, text: '', completed: false };
    setSchedule(prev =&gt; {
        const dayKey = format(date, 'yyyy-MM-dd');
        const newSchedule = { ...prev };
        const daySchedule = { ...(newSchedule[dayKey] || {}) };
        daySchedule[slotName] = (daySchedule[slotName] as Activity[]).map(act =&gt;
            act.id === activityId
                ? { ...act, subTasks: [...(act.subTasks || []), newSubTask] }
                : act
        );
        newSchedule[dayKey] = daySchedule;
        return newSchedule;
    });
  };

  const handleUpdateSubTask = (slotName: string, activityId: string, subTaskId: string, newText: string) =&gt; {
    setSchedule(prev =&gt; {
        const dayKey = format(date, 'yyyy-MM-dd');
        const newSchedule = { ...prev };
        const daySchedule = { ...(newSchedule[dayKey] || {}) };
        daySchedule[slotName] = (daySchedule[slotName] as Activity[]).map(act =&gt;
            act.id === activityId
                ? { ...act, subTasks: (act.subTasks || []).map(st =&gt; st.id === subTaskId ? { ...st, text: newText } : st) }
                : act
        );
        newSchedule[dayKey] = daySchedule;
        return newSchedule;
    });
  };
  
  const handleToggleSubTask = (slotName: string, activityId: string, subTaskId: string) =&gt; {
    setSchedule(prev =&gt; {
        const dayKey = format(date, 'yyyy-MM-dd');
        const newSchedule = { ...prev };
        const daySchedule = { ...(newSchedule[dayKey] || {}) };
        daySchedule[slotName] = (daySchedule[slotName] as Activity[]).map(act =&gt;
            act.id === activityId
                ? { ...act, subTasks: (act.subTasks || []).map(st =&gt; st.id === subTaskId ? { ...st, completed: !st.completed } : st) }
                : act
        );
        newSchedule[dayKey] = daySchedule;
        return newSchedule;
    });
  };

  const handleDeleteSubTask = (slotName: string, activityId: string, subTaskId: string) =&gt; {
    setSchedule(prev =&gt; {
      const dayKey = format(date, 'yyyy-MM-dd');
      const newSchedule = { ...prev };
      const daySchedule = { ...(newSchedule[dayKey] || {}) };
      daySchedule[slotName] = (daySchedule[slotName] as Activity[]).map(act =&gt;
        act.id === activityId
          ? { ...act, subTasks: (act.subTasks || []).filter(st =&gt; st.id !== subTaskId) }
          : act
      );
      newSchedule[dayKey] = daySchedule;
      return newSchedule;
    });
  };

  const allEquations = useMemo(() =&gt; Object.values(pillarEquations).flat(), [pillarEquations]);

  const slots = [
    { name: 'Late Night', time: '12am - 4am', endHour: 4, icon: &lt;Moon className="h-5 w-5 text-indigo-400" /&gt; },
    { name: 'Dawn', time: '4am - 8am', endHour: 8, icon: &lt;Sunrise className="h-5 w-5 text-orange-400" /&gt; },
    { name: 'Morning', time: '8am - 12pm', endHour: 12, icon: &lt;Sun className="h-5 w-5 text-yellow-400" /&gt; },
    { name: 'Afternoon', time: '12pm - 4pm', endHour: 16, icon: &lt;CloudSun className="h-5 w-5 text-sky-500" /&gt; },
    { name: 'Evening', time: '4pm - 8pm', endHour: 20, icon: &lt;Sunset className="h-5 w-5 text-purple-500" /&gt; },
    { name: 'Night', time: '8pm - 12am', endHour: 24, icon: &lt;MoonStar className="h-5 w-5 text-indigo-500" /&gt; }
  ];
  return (
    &lt;div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"&gt;
      {slots.map((slot) =&gt; {
        const activities = (schedule[slot.name as keyof DailySchedule] as Activity[]) || [];
        const slotData = slotDurations[slot.name] || { logged: 0, total: 0 };
        const { logged: loggedTime } = slotData;
        const freeTime = 240 - loggedTime;
        const progress = (loggedTime / 240) * 100;
        
        const reviewKey = `${format(date, 'yyyy-MM-dd')}-${slot.name}`;
        const review = missedSlotReviews[reviewKey];
        const isSlotComplete = activities.length &gt; 0 &amp;&amp; activities.every(a =&gt; a.completed);
        const allRulesFollowed = review &amp;&amp; allEquations.length &gt; 0 &amp;&amp; allEquations.every(eq =&gt; review.followedRuleIds.includes(eq.id));
        
        const isPartiallyComplete = activities.length &gt; 0 &amp;&amp; !isSlotComplete &amp;&amp; activities.some(a =&gt; a.completed);
        const partialAndRulesNotFollowed = isPartiallyComplete &amp;&amp; review &amp;&amp; !allRulesFollowed;

        const isSlotFailed = !isSlotComplete &amp;&amp; review &amp;&amp; !allRulesFollowed;
        const hasLongDistraction = activities.some(act =&gt; act.type === 'distraction' &amp;&amp; (act.duration || 0) &gt; 30);
        
        const now = new Date();
        const todayKey = format(now, 'yyyy-MM-dd');
        const selectedDateKey = format(date, 'yyyy-MM-dd');
        const isPastDay = isBefore(startOfDay(date), startOfDay(now));
        const isPastSlot = isPastDay || (selectedDateKey === todayKey &amp;&amp; now.getHours() &gt;= slot.endHour);
        
        return (
          &lt;Card
            key={slot.name}
            id={`slot-card-${slot.name.replace(/\s+/g, '-')}`}
            className={cn(
              "transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col",
              currentSlot === slot.name &amp;&amp; selectedDateKey === todayKey
                ? 'ring-2 ring-primary shadow-2xl bg-card'
                : 'shadow-md bg-card/60',
              (isSlotComplete || allRulesFollowed) &amp;&amp; 'border-green-500',
              partialAndRulesNotFollowed &amp;&amp; 'border-orange-500',
              (isSlotFailed &amp;&amp; !isPartiallyComplete || hasLongDistraction) &amp;&amp; 'border-red-500'
            )}
          &gt;
            &lt;CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"&gt;
              &lt;div&gt;
                &lt;CardTitle className="text-lg font-medium"&gt;{slot.name}&lt;/CardTitle&gt;
                &lt;CardDescription&gt;{slot.time}&lt;/CardDescription&gt;
              &lt;/div&gt;
              &lt;div className="flex items-center gap-2"&gt;
                {currentSlot === slot.name &amp;&amp; selectedDateKey === todayKey ? (
                  &lt;div className="font-mono text-lg text-primary/80 tracking-wider animate-subtle-pulse"&gt;
                    {remainingTime}
                  &lt;/div&gt;
                ) : (
                  slot.icon
                )}
              &lt;/div&gt;
            &lt;/CardHeader&gt;
            &lt;CardContent className="flex flex-col flex-grow justify-between min-h-[8rem]"&gt;
              &lt;div className="flex-grow space-y-2 mb-2"&gt;
                {activities &amp;&amp; activities.length &gt; 0 ? (
                  activities.map((activity) =&gt; {
                    let displayDetails = activity.details;
                    if (activity.type === 'workout') {
                      const { description } = getExercisesForDay(date, workoutMode, workoutPlans, exerciseDefinitions);
                      displayDetails = description.split(' for ')[1] || "Workout";
                    }

                    const linkedHabit = habitCards.find(h =&gt; activity.habitEquationIds?.includes(h.id));

                    return (
                      &lt;div key={activity.id} className="p-2.5 rounded-md bg-card/70 shadow-sm group"&gt;
                        &lt;div className="flex items-start justify-between gap-3"&gt;
                          &lt;div
                            className="flex items-start gap-3 flex-grow min-w-0"
                            onClick={(e) =&gt; !activity.completed &amp;&amp; onActivityClick(slot.name, activity, e)}
                          &gt;
                            &lt;button
                              onClick={(e) =&gt; {
                                  e.stopPropagation();
                                  onToggleComplete(slot.name, activity.id, !activity.completed);
                              }}
                              className="pt-0.5"
                            &gt;
                              {activity.completed 
                                ? &lt;CheckSquare className="h-5 w-5 text-green-500 flex-shrink-0" /&gt;
                                : &lt;div className="h-5 w-5 border-2 rounded-sm mt-0.5 flex-shrink-0" /&gt;
                              }
                            &lt;/button&gt;
                            &lt;div className="flex-grow min-w-0"&gt;
                              &lt;p className={cn(
                                  "font-semibold text-foreground", 
                                  activity.completed &amp;&amp; "line-through"
                              )}&gt;
                                {displayDetails}
                              &lt;/p&gt;
                              &lt;div className="text-xs text-muted-foreground capitalize flex items-center gap-2"&gt;
                                &lt;span&gt;{activity.type === 'deepwork' ? 'Deep Work' : activity.type === 'branding' ? 'Personal Branding' : activity.type === 'lead-generation' ? 'Lead Generation' : activity.type.replace('-', ' ')}&lt;/span&gt;
                              &lt;/div&gt;
                              {linkedHabit &amp;&amp; (
                                &lt;div className="min-w-0"&gt;
                                  &lt;p className="text-xs text-primary font-medium truncate" title={linkedHabit.name}&gt;
                                    Habit: {linkedHabit.name}
                                  &lt;/p&gt;
                                &lt;/div&gt;
                              )}
                            &lt;/div&gt;
                          &lt;/div&gt;
                          &lt;div className="flex items-center flex-shrink-0"&gt;
                            &lt;Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() =&gt; handleToggleRoutine(activity)}&gt;
                                &lt;Repeat className={cn("h-4 w-4", activity.isRoutine ? "text-primary" : "text-muted-foreground")} /&gt;
                            &lt;/Button&gt;
                             &lt;DropdownMenu&gt;
                                &lt;DropdownMenuTrigger asChild&gt;
                                    &lt;Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"&gt;
                                    &lt;MoreVertical className="h-4 w-4" /&gt;
                                    &lt;/Button&gt;
                                &lt;/DropdownMenuTrigger&gt;
                                &lt;DropdownMenuContent align="end"&gt;
                                  &lt;DropdownMenuItem onClick={() =&gt; handleAddSubTask(slot.name as string, activity.id)}&gt;
                                    &lt;PlusCircle className="mr-2 h-4 w-4"/&gt; Add Sub-task
                                  &lt;/DropdownMenuItem&gt;
                                  {activity.type !== 'interrupt' &amp;&amp; (
                                    &lt;DropdownMenuSub&gt;
                                      &lt;DropdownMenuSubTrigger&gt;
                                        &lt;LinkIcon className="mr-2 h-4 w-4" /&gt;
                                        &lt;span&gt;Link Habit&lt;/span&gt;
                                      &lt;/DropdownMenuSubTrigger&gt;
                                      &lt;DropdownMenuPortal&gt;
                                         &lt;DropdownMenuSubContent&gt;
                                          &lt;ScrollArea className="h-48"&gt;
                                            {habitCards.map(habit =&gt; (
                                                &lt;DropdownMenuCheckboxItem
                                                  key={habit.id}
                                                  checked={(activity.habitEquationIds || []).includes(habit.id)}
                                                  onCheckedChange={(checked) =&gt; {
                                                      handleLinkHabit(activity.id, habit.id);
                                                  }}
                                                  onSelect={(e) =&gt; e.preventDefault()}
                                                &gt;
                                                    {habit.name}
                                                &lt;/DropdownMenuCheckboxItem&gt;
                                            ))}
                                            {habitCards.length === 0 &amp;&amp; &lt;DropdownMenuItem disabled&gt;No habits found&lt;/DropdownMenuItem&gt;}
                                          &lt;/ScrollArea&gt;
                                        &lt;/DropdownMenuSubContent&gt;
                                      &lt;/DropdownMenuPortal&gt;
                                    &lt;/DropdownMenuSub&gt;
                                  )}
                                  &lt;DropdownMenuSeparator /&gt;
                                  &lt;DropdownMenuItem onClick={() =&gt; onRemoveActivity(slot.name as string, activity.id)} className="text-destructive"&gt;
                                    &lt;Trash2 className="mr-2 h-4 w-4" /&gt;
                                    &lt;span&gt;Delete&lt;/span&gt;
                                  &lt;/DropdownMenuItem&gt;
                                &lt;/DropdownMenuContent&gt;
                              &lt;/DropdownMenu&gt;
                          &lt;/div&gt;
                        &lt;/div&gt;
                        {activity.subTasks &amp;&amp; activity.subTasks.length &gt; 0 &amp;&amp; (
                            &lt;div className="pl-8 pt-2 space-y-2"&gt;
                                {activity.subTasks.map(st =&gt; (
                                    &lt;div key={st.id} className="flex items-center gap-2 group/subtask"&gt;
                                        &lt;Checkbox 
                                            id={`subtask-${st.id}`}
                                            checked={st.completed}
                                            onCheckedChange={() =&gt; handleToggleSubTask(slot.name, activity.id, st.id)}
                                        /&gt;
                                        &lt;Input
                                            value={st.text}
                                            onChange={(e) =&gt; handleUpdateSubTask(slot.name, activity.id, st.id, e.target.value)}
                                            onBlur={(e) =&gt; { if (e.target.value.trim() === '') handleDeleteSubTask(slot.name, activity.id, st.id) }}
                                            className={cn("h-7 text-xs border-0 bg-transparent px-1 focus-visible:ring-1 focus-visible:ring-ring", st.completed &amp;&amp; "line-through text-muted-foreground")}
                                            placeholder="New sub-task..."
                                        /&gt;
                                        &lt;Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/subtask:opacity-100" onClick={() =&gt; handleDeleteSubTask(slot.name, activity.id, st.id)}&gt;
                                            &lt;Trash2 className="h-3 w-3 text-destructive"/&gt;
                                        &lt;/Button&gt;
                                    &lt;/div&gt;
                                ))}
                            &lt;/div&gt;
                        )}
                      &lt;/div&gt;
                    )
                  })
                ) : (
                  &lt;div className="flex-grow flex items-center justify-center h-full"&gt;
                    {currentSlot === slot.name &amp;&amp; selectedDateKey === todayKey ? (
                      &lt;div className="text-center"&gt;
                        &lt;p className="text-lg text-muted-foreground"&gt;Current Focus&lt;/p&gt;
                      &lt;/div&gt;
                    ) : (
                      &lt;p className="text-sm text-muted-foreground text-center px-4"&gt;
                        Plan an activity for this block.
                      &lt;/p&gt;
                    )}
                  &lt;/div&gt;
                )}
              &lt;/div&gt;
              &lt;div className="flex-shrink-0 mt-2 space-y-2"&gt;
                &lt;Progress value={progress} className="h-2" /&gt;
                &lt;div className="flex justify-between text-xs text-muted-foreground"&gt;
                    &lt;span&gt;{loggedTime} min logged&lt;/span&gt;
                    &lt;span&gt;{freeTime} min {isPastSlot ? 'wasted' : 'free'}&lt;/span&gt;
                &lt;/div&gt;
                &lt;div className="flex justify-end items-center"&gt;
                    &lt;Popover&gt;
                    &lt;PopoverTrigger asChild&gt;
                        &lt;Button variant="ghost" size="icon" className="h-7 w-7 rounded-full"&gt;
                        &lt;PlusCircle className="h-4 w-4" /&gt;
                        &lt;span className="sr-only"&gt;Add Activity&lt;/span&gt;
                        &lt;/Button&gt;
                    &lt;/PopoverTrigger&gt;
                    &lt;PopoverContent className="w-52 p-2" align="end" side="top"&gt;
                        &lt;div className="grid gap-1"&gt;
                        &lt;Button variant="ghost" size="sm" className="justify-start" onClick={() =&gt; onAddActivity(slot.name as string, 'workout')}&gt;
                            &lt;Dumbbell className="h-4 w-4 mr-2" /&gt;
                            Add Workout
                        &lt;/Button&gt;
                        &lt;Button variant="ghost" size="sm" className="justify-start" onClick={() =&gt; onAddActivity(slot.name as string, 'mindset')}&gt;
                            &lt;Brain className="h-4 w-4 mr-2" /&gt;
                            Add Mindset
                        &lt;/Button&gt;
                        &lt;Button variant="ghost" size="sm" className="justify-start" onClick={() =&gt; onAddActivity(slot.name as string, 'upskill')}&gt;
                            &lt;BookOpenCheck className="h-4 w-4 mr-2" /&gt;
                            Add Upskill
                        &lt;/Button&gt;
                        &lt;Button variant="ghost" size="sm" className="justify-start" onClick={() =&gt; onAddActivity(slot.name as string, 'deepwork')}&gt;
                            &lt;Briefcase className="h-4 w-4 mr-2" /&gt;
                            Add Deep Work
                        &lt;/Button&gt;
                        &lt;Button variant="ghost" size="sm" className="justify-start" onClick={() =&gt; onAddActivity(slot.name as string, 'essentials')}&gt;
                            &lt;CheckSquare className="h-4 w-4 mr-2" /&gt;
                            Add Daily Essentials
                        &lt;/Button&gt;
                        &lt;Button variant="ghost" size="sm" className="justify-start" onClick={() =&gt; onAddActivity(slot.name as string, 'nutrition')}&gt;
                            &lt;Utensils className="h-4 w-4 mr-2" /&gt;
                            Add Nutrition
                        &lt;/Button&gt;
                        &lt;Separator className="my-1" /&gt;
                        &lt;Button variant="ghost" size="sm" className="justify-start" onClick={() =&gt; onAddActivity(slot.name as string, 'branding')}&gt;
                            &lt;Share2 className="h-4 w-4 mr-2" /&gt;
                            Add Branding
                        &lt;/Button&gt;
                        &lt;Button variant="ghost" size="sm" className="justify-start" onClick={() =&gt; onAddActivity(slot.name as string, 'lead-generation')}&gt;
                            &lt;Magnet className="h-4 w-4 mr-2" /&gt;
                            Add Lead Gen
                        &lt;/Button&gt;
                        &lt;Separator className="my-1" /&gt;
                        &lt;Button variant="ghost" size="sm" className="justify-start" onClick={() =&gt; onAddActivity(slot.name as string, 'planning')}&gt;
                            &lt;ClipboardList className="h-4 w-4 mr-2" /&gt;
                            Add Planning
                        &lt;/Button&gt;
                        &lt;Button variant="ghost" size="sm" className="justify-start" onClick={() =&gt; onAddActivity(slot.name as string, 'tracking')}&gt;
                            &lt;ClipboardCheck className="h-4 w-4 mr-2" /&gt;
                            Add Tracking
                        &lt;/Button&gt;
                        &lt;Separator className="my-1" /&gt;
                        &lt;Button variant="ghost" size="sm" className="justify-start text-destructive hover:text-destructive" onClick={() =&gt; onAddActivity(slot.name as string, 'interrupt')}&gt;
                            &lt;AlertCircle className="h-4 w-4 mr-2" /&gt;
                            Add Interrupt
                        &lt;/Button&gt;
                        &lt;Button variant="ghost" size="sm" className="justify-start text-yellow-600 hover:text-yellow-600" onClick={() =&gt; onAddActivity(slot.name as string, 'distraction')}&gt;
                            &lt;Wind className="h-4 w-4 mr-2" /&gt;
                            Add Distraction
                        &lt;/Button&gt;
                        &lt;/div&gt;
                    &lt;/PopoverContent&gt;
                    &lt;/Popover&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            &lt;/CardContent&gt;
          &lt;/Card&gt;
        )
      })}
    &lt;/div&gt;
  );
}

    
    