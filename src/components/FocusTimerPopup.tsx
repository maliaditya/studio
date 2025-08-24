
"use client";

import React, { } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, MoreHorizontal, BrainCircuit, X, Link as LinkIcon, RefreshCw, Check, Coffee } from 'lucide-react';
import type { Activity, PauseEvent, ExerciseDefinition } from '@/types/workout';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts"
import { useAuth } from '@/contexts/AuthContext';
import { DndContext, useDraggable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';


interface FocusTimerPopupProps {
  activity: Activity;
  duration: number; // in minutes
  initialSecondsLeft: number;
  onClose: () => void;
  onLogTime: (activity: Activity, minutes: number) => void;
}

export function FocusTimerPopup({ activity, duration, initialSecondsLeft, onClose, onLogTime }: FocusTimerPopupProps) {
  const { 
      activeFocusSession, setActiveFocusSession, 
      setIsAudioPlaying, openTaskContextPopup, 
      updateActivity, handleToggleComplete,
      deepWorkDefinitions, upskillDefinitions,
      logSubTaskTime
  } = useAuth();
  const [totalSeconds, setTotalSeconds] = React.useState(duration * 60);
  const [secondsLeft, setSecondsLeft] = React.useState(initialSecondsLeft);
  
  const [lastSubTaskCompletionTime, setLastSubTaskCompletionTime] = React.useState<number | null>(null);
  const [completedSubTaskIds, setCompletedSubTaskIds] = React.useState<Set<string>>(new Set());

  const BREAK_DURATION = 5 * 60; // 5 minutes
  const WORK_DURATION = 25 * 60; // 25 minutes

  const [sessionState, setSessionState] = React.useState<'idle' | 'running' | 'paused'>('idle');
  const [currentCycle, setCurrentCycle] = React.useState<'work' | 'break'>('work');
  const [cycleSecondsLeft, setCycleSecondsLeft] = React.useState(WORK_DURATION);
  
  const popupRef = React.useRef<HTMLDivElement>(null);
  const [activeSubTaskId, setActiveSubTaskId] = React.useState<string | null>(null);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `focus-timer-popup-${activity.id}`,
  });
  
  const allDefinitions = React.useMemo(() => new Map(
      [...deepWorkDefinitions, ...upskillDefinitions].map(def => [def.id, def])
  ), [deepWorkDefinitions, upskillDefinitions]);

  const focusedObjective = React.useMemo(() => {
    const parentId = activity.taskIds?.[0];
    if(!parentId) return null;
    return allDefinitions.get(parentId.split('-')[0]);
  }, [activity.taskIds, allDefinitions]);
  
  const subTasks = React.useMemo(() => {
      if (!focusedObjective) return [];
      const childrenIds = [
          ...(focusedObjective.linkedDeepWorkIds || []), 
          ...(focusedObjective.linkedUpskillIds || [])
      ];
      return childrenIds.map(id => allDefinitions.get(id)).filter((t): t is ExerciseDefinition => !!t);
  }, [focusedObjective, allDefinitions]);

  const style: React.CSSProperties = {
    position: 'fixed',
    top: '1.5rem', // 24px
    right: '1.5rem', // 24px
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    willChange: 'transform',
  };

  React.useEffect(() => {
    // We don't start the main music immediately anymore for Objectives
    // setIsAudioPlaying(true); 
    setLastSubTaskCompletionTime(Date.now());
  }, []);

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (sessionState === 'running') {
      interval = setInterval(() => {
        setSecondsLeft(s => Math.max(0, s - 1));
        setCycleSecondsLeft(s => s - 1);
      }, 1000);
    }
  
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionState]);

  React.useEffect(() => {
    if (secondsLeft <= 0 && sessionState === 'running') {
        setSessionState('idle');
        setIsAudioPlaying(false);
        if (activeSubTaskId) {
            handleSubTaskComplete(activeSubTaskId, true); // Mark as complete when timer ends
            setActiveSubTaskId(null);
        }
    }

    if (cycleSecondsLeft <= 0 && sessionState === 'running') {
        if (currentCycle === 'work') {
            setCurrentCycle('break');
            setCycleSecondsLeft(BREAK_DURATION);
            setIsAudioPlaying(false);
        } else {
            setCurrentCycle('work');
            setCycleSecondsLeft(WORK_DURATION);
            setIsAudioPlaying(true);
        }
    }
  }, [secondsLeft, cycleSecondsLeft, sessionState, currentCycle, setIsAudioPlaying, activeSubTaskId]);

  React.useEffect(() => {
    if (sessionState === 'running' || sessionState === 'paused') {
        const currentActivity = activeFocusSession?.activity?.id === activity.id ? activeFocusSession.activity : activity;
        setActiveFocusSession({ activity: currentActivity, duration: Math.ceil(totalSeconds / 60), secondsLeft });
    }
  }, [secondsLeft, sessionState, totalSeconds, activity, setActiveFocusSession, activeFocusSession?.activity]);


  const handleStop = (completed: boolean) => {
    setSessionState('paused');
    setIsAudioPlaying(false);
    
    const elapsedSeconds = totalSeconds - secondsLeft;
    
    if (activity) {
      const updatedActivity: Activity = {
        ...activity,
        focusSessionEndTime: Date.now(),
      };
      updateActivity(updatedActivity);

      if (completed) {
        onLogTime(updatedActivity, duration);
        handleToggleComplete(activity.slot, activity.id, true);
      } else if (elapsedSeconds > 0) {
        onLogTime(updatedActivity, Math.floor(elapsedSeconds / 60));
      }
    }
    onClose();
  };
  
  const handleStartSubTask = (subTask: ExerciseDefinition) => {
    const durationMins = subTask.estimatedDuration || 25;
    const durationSecs = durationMins * 60;
    
    setTotalSeconds(durationSecs);
    setSecondsLeft(durationSecs);
    setCycleSecondsLeft(WORK_DURATION);
    setCurrentCycle('work');
    setActiveSubTaskId(subTask.id);
    setSessionState('running');
    setIsAudioPlaying(true);
    setLastSubTaskCompletionTime(Date.now()); // Reset timer for this subtask
  };

  const handleSubTaskComplete = (subTaskId: string, timerFinished: boolean = false) => {
    if (completedSubTaskIds.has(subTaskId)) return;
    
    const now = Date.now();
    let durationMinutes = 0;

    if (timerFinished) {
        const subTask = subTasks.find(st => st.id === subTaskId);
        durationMinutes = subTask?.estimatedDuration || Math.floor((totalSeconds - secondsLeft) / 60);
    } else {
        const timeSinceLast = lastSubTaskCompletionTime ? now - lastSubTaskCompletionTime : totalSeconds - secondsLeft;
        durationMinutes = Math.floor(timeSinceLast / 60000);
    }
    
    if (durationMinutes > 0) {
        logSubTaskTime(subTaskId, durationMinutes);
    }
    
    setLastSubTaskCompletionTime(now);
    setCompletedSubTaskIds(prev => new Set(prev).add(subTaskId));
  };


  const progressPercentage = totalSeconds > 0 ? (secondsLeft / totalSeconds) * 100 : 0;
  const chartData = [{ value: progressPercentage }];
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  
  if (!activity) return null;

  const cycleMinutes = Math.floor(cycleSecondsLeft / 60);
  const cycleSeconds = cycleSecondsLeft % 60;
  
  const activeSubTaskName = activeSubTaskId ? allDefinitions.get(activeSubTaskId)?.name : "None";

  return (
        <div ref={setNodeRef} style={style} className="fixed z-[100]">
        <Card ref={popupRef} className="w-[600px] shadow-2xl rounded-xl border-border/20 bg-background/80 backdrop-blur-sm">
            <CardContent className="p-4 grid grid-cols-2 gap-4">
            <div className="col-span-1 space-y-2">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 cursor-grab" {...listeners} {...attributes}>
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium">Focus period...</p>
                  </div>
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStop(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                  </div>
              </div>
              
              <div className="relative w-40 h-40 mx-auto">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        innerRadius="80%"
                        outerRadius="100%"
                        data={chartData}
                        startAngle={90}
                        endAngle={-270}
                    >
                        <PolarAngleAxis
                            type="number"
                            domain={[0, 100]}
                            angleAxisId={0}
                            tick={false}
                        />
                        <RadialBar
                            background
                            dataKey="value"
                            cornerRadius={10}
                            className="fill-primary"
                        />
                         <style>{`
                            .recharts-radial-bar-background-sector {
                                fill: hsl(var(--muted));
                            }
                        `}</style>
                    </RadialBarChart>
                </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-bold font-mono">
                          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                      </span>
                  </div>
              </div>
              <div className="text-center -mt-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      {sessionState === 'running' && (currentCycle === 'work' ? <BrainCircuit className="h-4 w-4" /> : <Coffee className="h-4 w-4" />)}
                      <span className="font-mono">{String(cycleMinutes).padStart(2, '0')}:{String(cycleSeconds).padStart(2, '0')}</span>
                  </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                 <Button
                    variant="secondary"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={() => setSessionState(s => s === 'running' ? 'paused' : 'running')}
                    disabled={!activeSubTaskId || sessionState === 'idle'}
                 >
                    {sessionState === 'running' ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                 </Button>
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full">
                     <MoreHorizontal className="h-5 w-5" />
                  </Button>
              </div>
               <div className="mt-4 pt-4 border-t border-border/20 text-center">
                  <p className="text-xs text-muted-foreground">Task</p>
                  <p className="text-sm font-semibold truncate" title={activeSubTaskName}>
                      {activeSubTaskName}
                  </p>
              </div>
            </div>
            
            <div className="col-span-1 border-l pl-4">
              <h4 className="text-sm font-semibold mb-2">Sub-tasks for {focusedObjective?.name}</h4>
              <ScrollArea className="h-80">
                <div className="space-y-2 pr-2">
                  {subTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-2 text-sm p-1 rounded-md bg-muted/30">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleStartSubTask(task)}
                            disabled={sessionState === 'running' || completedSubTaskIds.has(task.id)}
                        >
                            <Play className="h-4 w-4" />
                        </Button>
                        <label htmlFor={`subtask-${task.id}`} className="flex-grow">{task.name}</label>
                        <Checkbox 
                            id={`subtask-${task.id}`}
                            checked={completedSubTaskIds.has(task.id)}
                            onCheckedChange={() => handleSubTaskComplete(task.id)}
                        />
                    </div>
                  ))}
                  {subTasks.length === 0 && (
                    <p className="text-xs text-center text-muted-foreground py-8">No sub-tasks found for this objective.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
            </CardContent>
        </Card>
        </div>
  );
}
