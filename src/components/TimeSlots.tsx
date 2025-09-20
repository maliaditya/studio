
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType, FullSchedule, SubTask, MetaRule, SlotName, RecurrenceRule } from '@/types/workout';
import {
  CheckCircle2, Circle, Grab, Dock, Move, Save, History, PlusCircle, BrainCircuit, Timer, GitBranch, Focus, Repeat, Link as LinkIcon, Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, AlertCircle, CheckSquare, Utensils, MoreVertical, Brain, Wind, Moon, Sunrise, Sun, CloudSun, Sunset, MoonStar, ChevronLeft, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { useRouter } from 'next/navigation';
import { getExercisesForDay } from '@/lib/workoutUtils';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSeparator, DropdownMenuSubContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Badge } from '@/components/ui/badge';

const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

interface TimeSlotsProps {
  date: Date;
  schedule: DailySchedule;
  currentSlot: string;
  remainingTime: string;
  onAddActivity: (slotName: string, type: ActivityType) => void;
  onRemoveActivity: (slotName: string, activityId: string) => void;
  onToggleComplete: (slotName: string, activityId: string, isCompleted: boolean) => void;
  onActivityClick: (slotName: string, activity: Activity, event: React.MouseEvent) => void;
  slotDurations: Record<string, { logged: number; total: number }>;
  setRoutine: (activity: Activity, rule: RecurrenceRule | null) => void;
}

const pillars = [
    { name: 'Mind', attributes: ['Focus', 'Learning', 'Creativity'] },
    { name: 'Body', attributes: ['Health', 'Strength', 'Energy'] },
    { name: 'Heart', attributes: ['Relationships', 'Emotional Health'] },
    { name: 'Spirit', attributes: ['Meaning', 'Contribution', 'Legacy'] },
];

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
  setRoutine,
}: TimeSlotsProps) {

  const { settings, setSettings, habitCards, toggleRoutine, handleLinkHabit, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, allWorkoutLogs, metaRules, openRuleDetailPopup, openPillarPopup } = useAuth();
  
  const handleUpdateSubTask = (slotName: string, activityId: string, subTaskId: string, newText: string) => {
    // This logic should now be in AuthContext
  };
  
  const handleToggleSubTask = (slotName: string, activityId: string, subTaskId: string) => {
    // This logic should now be in AuthContext
  };

  const handleDeleteSubTask = (slotName: string, activityId: string, subTaskId: string) => {
    // This logic should now be in AuthContext
  };
  
  const handleLinkRule = (slotName: SlotName, ruleId: string) => {
    const currentSlotRules = settings.slotRules?.[slotName] || [];
    const isLinked = currentSlotRules.includes(ruleId);
    
    const newRules = isLinked
        ? currentSlotRules.filter(id => id !== ruleId)
        : [...currentSlotRules, ruleId];
        
    setSettings(prev => ({
      ...prev,
      slotRules: {
        ...(prev.slotRules || {}),
        [slotName]: newRules
      }
    }));
  };

  const slots = [
    { name: 'Late Night', time: '12am - 4am', endHour: 4, icon: <Moon className="h-5 w-5 text-indigo-400" /> },
    { name: 'Dawn', time: '4am - 8am', endHour: 8, icon: <Sunrise className="h-5 w-5 text-orange-400" /> },
    { name: 'Morning', time: '8am - 12pm', endHour: 12, icon: <Sun className="h-5 w-5 text-yellow-400" /> },
    { name: 'Afternoon', time: '12pm - 4pm', endHour: 16, icon: <CloudSun className="h-5 w-5 text-sky-500" /> },
    { name: 'Evening', time: '4pm - 8pm', endHour: 20, icon: <Sunset className="h-5 w-5 text-purple-500" /> },
    { name: 'Night', time: '8pm - 12am', endHour: 24, icon: <MoonStar className="h-5 w-5 text-indigo-500" /> }
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {slots.map((slot) => {
        const activities = (schedule[slot.name as keyof DailySchedule] as Activity[]) || [];
        const slotData = slotDurations[slot.name] || { logged: 0, total: 0 };
        const { logged: loggedTime } = slotData;
        const freeTime = 240 - loggedTime;
        const progress = (loggedTime / 240) * 100;
        
        const now = new Date();
        const todayKey = format(now, 'yyyy-MM-dd');
        const selectedDateKey = format(date, 'yyyy-MM-dd');
        const isPastSlot = selectedDateKey < todayKey || (selectedDateKey === todayKey && now.getHours() >= slot.endHour);
        
        const linkedRules = metaRules.filter(rule => 
            settings.slotRules?.[slot.name as SlotName]?.includes(rule.id)
        );

        const getPillarName = (purposePillar?: string) => {
            if (!purposePillar) return null;
            const mainPillar = pillars.find(p => p.name === purposePillar || p.attributes.includes(purposePillar));
            return mainPillar?.name || null;
        };

        const pillarName = linkedRules.length > 0 ? getPillarName(linkedRules[0].purposePillar) : null;

        return (
          <Card
            key={slot.name}
            id={`slot-card-${slot.name.replace(/\s+/g, '-')}`}
            className={cn(
              "transition-all duration-300 ease-in-out transform hover:-translate-y-1 flex flex-col",
              currentSlot === slot.name && selectedDateKey === todayKey
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
                {currentSlot === slot.name && selectedDateKey === todayKey ? (
                  <div className="font-mono text-lg text-primary/80 tracking-wider animate-subtle-pulse">
                    {remainingTime}
                  </div>
                ) : (
                  slot.icon
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow justify-between min-h-[8rem] p-3">
              <div className="flex-grow min-h-0 mb-2">
                 {linkedRules.length > 0 && (
                    <div className="mb-2 space-y-1">
                        {linkedRules.map(rule => (
                            <button 
                                key={rule.id} 
                                className="text-xs text-left w-full text-muted-foreground italic pl-2 border-l-2 border-primary/50 hover:text-primary transition-colors"
                                onClick={(e) => openRuleDetailPopup(rule.id, e)}
                            >
                                {rule.text}
                            </button>
                        ))}
                    </div>
                 )}
                <div className="h-[200px] overflow-y-auto pr-2">
                  <ul className="space-y-2">
                    {activities && activities.length > 0 ? (
                      activities.map((activity) => (
                        <AgendaWidgetItem
                          key={activity.id}
                          activity={{...activity, slot: slot.name as SlotName}}
                          date={date}
                          onToggleComplete={onToggleComplete}
                          onActivityClick={onActivityClick}
                          linkedHabit={habitCards.find(h => activity.habitEquationIds?.includes(h.id))}
                          onLinkHabit={(habitId) => handleLinkHabit(activity.id, habitId, date)}
                          setRoutine={setRoutine}
                          onOpenHabitPopup={openRuleDetailPopup}
                        />
                      ))
                    ) : (
                      <div className="flex-grow flex items-center justify-center h-full">
                        {currentSlot === slot.name && selectedDateKey === todayKey ? (
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
                </div>
              </div>
              <div className="flex-shrink-0 mt-2 space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{loggedTime} min logged</span>
                    <span>{freeTime} min {isPastSlot ? 'untracked' : 'free'}</span>
                </div>
                <div className="flex justify-between items-center">
                    {pillarName ? (
                        <Button variant="outline" size="sm" onClick={() => openPillarPopup(pillarName)}>{pillarName}</Button>
                    ) : <div></div>}
                    <div className={cn("flex-grow flex justify-end items-center", !pillarName && "w-full")}>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                                    <Brain className="h-4 w-4" />
                                    <span className="sr-only">Link Rule</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-0">
                                <ScrollArea className="h-60">
                                    <div className="p-2 space-y-1">
                                        {metaRules.map(rule => (
                                            <div key={rule.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`rule-${slot.name}-${rule.id}`}
                                                    checked={settings.slotRules?.[slot.name as SlotName]?.includes(rule.id)}
                                                    onCheckedChange={() => handleLinkRule(slot.name as SlotName, rule.id)}
                                                />
                                                <Label htmlFor={`rule-${slot.name}-${rule.id}`} className="text-xs font-normal cursor-pointer">
                                                    {rule.text}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                            <PlusCircle className="h-4 w-4" />
                            <span className="sr-only">Add Activity</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-52 p-2" align="end" side="top">
                            <div className="grid gap-1">
                            <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name as string, 'workout')}>
                                <Dumbbell className="h-4 w-4 mr-2" />
                                Add Workout
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name as string, 'mindset')}>
                                <Brain className="h-4 w-4 mr-2" />
                                Add Mindset
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name as string, 'upskill')}>
                                <BookOpenCheck className="h-4 w-4 mr-2" />
                                Add Upskill
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name as string, 'deepwork')}>
                                <Briefcase className="h-4 w-4 mr-2" />
                                Add Deep Work
                            </Button>
                             <Separator className="my-1" />
                            <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name as string, 'planning')}>
                                <ClipboardList className="h-4 w-4 mr-2" />
                                Add Planning
                            </Button>
                             <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name as string, 'tracking')}>
                                <ClipboardCheck className="h-4 w-4 mr-2" />
                                Add Tracking
                            </Button>
                            <Separator className="my-1" />
                            <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name as string, 'essentials')}>
                                <CheckSquare className="h-4 w-4 mr-2" />
                                Add Daily Essentials
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name as string, 'nutrition')}>
                                <Utensils className="h-4 w-4 mr-2" />
                                Add Nutrition
                            </Button>
                            <Separator className="my-1" />
                            <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name as string, 'branding')}>
                                <Share2 className="h-4 w-4 mr-2" />
                                Add Branding
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddActivity(slot.name as string, 'lead-generation')}>
                                <Magnet className="h-4 w-4 mr-2" />
                                Add Lead Gen
                            </Button>
                            <Separator className="my-1" />
                            <Button variant="ghost" size="sm" className="justify-start text-destructive hover:text-destructive" onClick={() => onAddActivity(slot.name as string, 'interrupt')}>
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Add Interrupt
                            </Button>
                            <Button variant="ghost" size="sm" className="justify-start text-yellow-600 hover:text-yellow-600" onClick={() => onAddActivity(slot.name as string, 'distraction')}>
                                <Wind className="h-4 w-4 mr-2" />
                                Add Distraction
                            </Button>
                            </div>
                        </PopoverContent>
                        </Popover>
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  );
}

const AgendaWidgetItem = ({
  activity,
  date,
  onToggleComplete,
  onActivityClick,
  linkedHabit,
  onLinkHabit,
  setRoutine,
  onOpenHabitPopup,
}: {
  activity: Activity & { slot: SlotName };
  date: Date;
  onToggleComplete: (slotName: string, activityId: string, isCompleted: boolean) => void;
  onActivityClick: (slotName: string, activity: Activity, event: React.MouseEvent) => void;
  linkedHabit: any;
  onLinkHabit: (habitId: string) => void;
  setRoutine: (activity: Activity, rule: RecurrenceRule | null) => void;
  onOpenHabitPopup: (habitId: string, event: React.MouseEvent) => void;
}) => {
  const { workoutMode, workoutPlans, exerciseDefinitions, habitCards, deepWorkDefinitions, upskillDefinitions, getDeepWorkNodeType, getUpskillNodeType, getDescendantLeafNodes, permanentlyLoggedTaskIds, getUpskillLoggedMinutesRecursive, getDeepWorkLoggedMinutes, activityDurations, onOpenFocusModal, onOpenTaskContext } = useAuth();
  const { toast } = useToast();
  
  const allDefs = useMemo(() => new Map([...deepWorkDefinitions, ...upskillDefinitions].map(def => [def.id, def])), [deepWorkDefinitions, upskillDefinitions]);
  
  const parentTaskDefinition = useMemo(() => {
    if (!activity.taskIds || activity.taskIds.length === 0) return null;
    const mainDefId = activity.taskIds[0].split('-')[0];
    return allDefs.get(mainDefId);
  }, [activity.taskIds, allDefs]);
  
  const { isHighLevelTask, allSubTasksCompleted, totalLoggedMinutes } = useMemo(() => {
    if (!parentTaskDefinition || (activity.type !== 'deepwork' && activity.type !== 'upskill')) {
      return { isHighLevelTask: false, allSubTasksCompleted: false, totalLoggedMinutes: 0 };
    }

    const nodeType = activity.type === 'deepwork' 
      ? getDeepWorkNodeType(parentTaskDefinition)
      : getUpskillNodeType(parentTaskDefinition);
    
    const isHighLevel = ['Intention', 'Curiosity', 'Objective'].includes(nodeType);
    if (!isHighLevel) {
      return { isHighLevelTask: false, allSubTasksCompleted: false, totalLoggedMinutes: 0 };
    }

    const leafNodes = getDescendantLeafNodes(parentTaskDefinition.id, activity.type);
    const areAllComplete = leafNodes.length > 0 && leafNodes.every(node => permanentlyLoggedTaskIds.has(node.id));

    const totalMinutes = activity.type === 'deepwork' 
      ? getDeepWorkLoggedMinutes(parentTaskDefinition)
      : getUpskillLoggedMinutesRecursive(parentTaskDefinition);

    return { 
      isHighLevelTask: true, 
      allSubTasksCompleted: areAllComplete,
      totalLoggedMinutes: totalMinutes,
    };
  }, [parentTaskDefinition, activity.type, getDescendantLeafNodes, permanentlyLoggedTaskIds, getDeepWorkNodeType, getUpskillNodeType, getDeepWorkLoggedMinutes, getUpskillLoggedMinutesRecursive]);

  useEffect(() => {
    if (isHighLevelTask && allSubTasksCompleted && !activity.completed) {
      onToggleComplete(activity.slot, activity.id, true);
    }
  }, [isHighLevelTask, allSubTasksCompleted, activity.completed, activity.slot, activity.id, onToggleComplete]);
  
  let displayDetails = activity.details;
  if (activity.type === 'workout') {
    const { description } = getExercisesForDay(date, workoutMode, workoutPlans, exerciseDefinitions);
    displayDetails = description.split(' for ')[1] || "Workout";
  }
  
  const duration = activityDurations[activity.id];

  const handleTitleClick = (event: React.MouseEvent) => {
    if (activity.completed) {
      onToggleComplete(activity.slot, activity.id, false);
      return;
    }
    
    if (linkedHabit) {
        onOpenHabitPopup(linkedHabit.id, event);
        return;
    }
    
    onActivityClick(activity.slot, activity, event);
  };
  
  const handleFocusClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const shouldOpenModal = onOpenFocusModal(activity);
    if (!shouldOpenModal) {
      toast({
        title: "Objective Already Complete",
        description: `All sub-tasks for '${activity.details}' are already logged.`,
      });
    }
  };
  
  let displayDuration = duration;
  if (isHighLevelTask && totalLoggedMinutes > 0) {
    const h = Math.floor(totalLoggedMinutes / 60);
    const m = Math.round(totalLoggedMinutes % 60);
    displayDuration = ((`${h > 0 ? `${h}h` : ''} ${m > 0 ? `${m}m` : ''}`).trim() || '0m') + ' logged';
  }
  
  const itemContent = (
    <div className="flex items-center justify-between gap-4 p-2 rounded-md bg-muted/30 w-full group">
      <div 
        className={cn("flex items-start gap-3 min-w-0 flex-grow", !activity.completed && (activity.type === 'essentials' || linkedHabit) && "cursor-pointer")}
        onClick={handleTitleClick}
      >
        <button onClick={() => onToggleComplete(activity.slot, activity.id, !activity.completed)} className="pt-0.5">
            {activity.completed 
              ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              : <div className="h-5 w-5 border-2 rounded-sm mt-0.5 flex-shrink-0" />
            }
        </button>
        <div className="flex-grow min-w-0">
          <p className={`font-semibold text-foreground ${activity.completed ? 'line-through text-muted-foreground' : ''}`} title={displayDetails}>
            {displayDetails}
          </p>
          {linkedHabit && (
            <div className="min-w-0">
                <p className="text-xs text-primary font-medium truncate" title={linkedHabit.name}>
                    Habit: {linkedHabit.name}
                </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 flex items-center text-right gap-1">
        {displayDuration && <p className="text-xs font-semibold whitespace-nowrap text-muted-foreground">{displayDuration}</p>}
        {!activity.completed && activity.type !== 'interrupt' && activity.type !== 'distraction' ? (
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleFocusClick}
            >
                <Timer className="h-4 w-4" />
            </Button>
        ) : (activity.taskIds && activity.taskIds.length > 0) ? (
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => onOpenTaskContext(activity.id, e)}
            >
                <GitBranch className="h-4 w-4" />
            </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Repeat className="mr-2 h-4 w-4" />
                <span>Repeat</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onSelect={() => setRoutine(activity, { type: 'daily' })}>Daily</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setRoutine(activity, { type: 'weekly' })}>Weekly</DropdownMenuItem>
                  
                  {activity.routine && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => setRoutine(activity, null)} className="text-destructive">Remove Routine</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {}} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
  
  return <li>{itemContent}</li>;
};

    