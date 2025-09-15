

      
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DailySchedule, Activity, ActivityType, FullSchedule, SubTask, MetaRule, SlotName } from '@/types/workout';
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
                      activities.map((activity) => {
                        let displayDetails = activity.details;
                        if (activity.type === 'workout') {
                            const { description } = getExercisesForDay(date, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling, allWorkoutLogs);
                            displayDetails = description.split(' for ')[1] || "Workout";
                        }
                        const linkedHabit = habitCards.find(h => activity.habitEquationIds?.includes(h.id));
                        const isRoutine = settings.routines.some(r => r.details === activity.details && r.type === activity.type && r.slot === activity.slot);

                        return (
                          <div key={activity.id} className="p-2.5 rounded-md bg-card/70 shadow-sm group">
                            <div className="flex items-start justify-between gap-3">
                              <div
                                className={cn("flex items-start gap-3 flex-grow min-w-0", !activity.completed && "cursor-pointer")}
                                onClick={(e) => !activity.completed && onActivityClick(slot.name as string, activity, e)}
                              >
                                <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      onToggleComplete(slot.name as string, activity.id, !activity.completed);
                                  }}
                                  className="pt-0.5"
                                >
                                  {activity.completed 
                                    ? <CheckSquare className="h-5 w-5 text-green-500 flex-shrink-0" />
                                    : <div className="h-5 w-5 border-2 rounded-sm mt-0.5 flex-shrink-0" />
                                  }
                                </button>
                                <div className="flex-grow min-w-0">
                                  <p className={cn(
                                      "font-semibold text-foreground", 
                                      activity.completed && "line-through"
                                  )}>
                                    {displayDetails}
                                  </p>
                                  <div className="text-xs text-muted-foreground capitalize flex items-center gap-2">
                                    <span>{activity.type === 'deepwork' ? 'Deep Work' : activity.type === 'branding' ? 'Personal Branding' : activity.type === 'lead-generation' ? 'Lead Generation' : activity.type.replace('-', ' ')}</span>
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
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => toggleRoutine(activity)}>
                                    <Repeat className={cn("h-4 w-4", isRoutine ? "text-primary" : "text-muted-foreground")} />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                        <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => {}}>
                                        <PlusCircle className="mr-2 h-4 w-4"/> Add Sub-task
                                      </DropdownMenuItem>
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
                                                    <DropdownMenuCheckboxItem
                                                      key={habit.id}
                                                      checked={(activity.habitEquationIds || []).includes(habit.id)}
                                                      onCheckedChange={(checked) => {
                                                        handleLinkHabit(activity.id, habit.id, date);
                                                      }}
                                                      onSelect={(e) => e.preventDefault()}
                                                    >
                                                        {habit.name}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                                {habitCards.length === 0 && <DropdownMenuItem disabled>No habits found</DropdownMenuItem>}
                                              </ScrollArea>
                                            </DropdownMenuSubContent>
                                          </DropdownMenuPortal>
                                        </DropdownMenuSub>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => onRemoveActivity(slot.name as string, activity.id)} className="text-destructive">
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
