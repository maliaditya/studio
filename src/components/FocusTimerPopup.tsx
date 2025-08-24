
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, MoreHorizontal, BrainCircuit, X, Link as LinkIcon, RefreshCw, Check, Coffee, Timer, Plus, Minus } from 'lucide-react';
import type { Activity, PauseEvent, ExerciseDefinition } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { useDraggable } from '@dnd-kit/core';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';


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
      updateActivity, handleToggleComplete,
      deepWorkDefinitions, upskillDefinitions,
      allDeepWorkLogs, allUpskillLogs,
      logSubTaskTime,
      setIsAudioPlaying,
  } = useAuth();
  const [totalSeconds, setTotalSeconds] = useState(duration * 60);
  const [secondsLeft, setSecondsLeft] = useState(initialSecondsLeft);
  
  const [lastSubTaskCompletionTime, setLastSubTaskCompletionTime] = useState<number | null>(null);
  const [completedSubTaskIds, setCompletedSubTaskIds] = useState<Set<string>>(new Set());

  const BREAK_DURATION = 5 * 60; // 5 minutes
  const WORK_DURATION = 25 * 60; // 25 minutes

  const [sessionState, setSessionState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [currentCycle, setCurrentCycle] = useState<'work' | 'break'>('work');
  const [cycleSecondsLeft, setCycleSecondsLeft] = useState(WORK_DURATION);
  
  const popupRef = useRef<HTMLDivElement>(null);
  const [activeSubTaskId, setActiveSubTaskId] = useState<string | null>(null);

  const [promptForCompletion, setPromptForCompletion] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(5);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `focus-timer-popup-${activity.id}`,
  });
  
  const allDefinitions = useMemo(() => new Map(
      [...deepWorkDefinitions, ...upskillDefinitions].map(def => [def.id, def])
  ), [deepWorkDefinitions, upskillDefinitions]);

  const focusedObjective = useMemo(() => {
    const parentId = activity.taskIds?.[0];
    if (!parentId) return null;

    const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
    return allDefs.find(d => parentId.startsWith(d.id));
  }, [activity.taskIds, deepWorkDefinitions, upskillDefinitions]);
  
  const subTasks = useMemo(() => {
      if (!focusedObjective) return [];
      const childrenIds = [
          ...(focusedObjective.linkedDeepWorkIds || []), 
          ...(focusedObjective.linkedUpskillIds || [])
      ];
      return childrenIds.map(id => allDefinitions.get(id)).filter((t): t is ExerciseDefinition => !!t);
  }, [focusedObjective, allDefinitions]);
  
  const loggedTimeMap = useMemo(() => {
    const timeMap = new Map<string, number>();
    const processLogs = (logs: any[], durationField: 'weight' | 'reps') => {
        logs.forEach(log => {
            log.exercises.forEach((ex: any) => {
                const duration = ex.loggedSets.reduce((sum: number, set: any) => sum + (set[durationField] || 0), 0);
                if (duration > 0) {
                    timeMap.set(ex.definitionId, (timeMap.get(ex.definitionId) || 0) + duration);
                }
            });
        });
    };
    processLogs(allDeepWorkLogs, 'weight');
    processLogs(allUpskillLogs, 'reps');
    return timeMap;
  }, [allDeepWorkLogs, allUpskillLogs]);


  const activeSubTask = useMemo(() => {
    return activeSubTaskId ? allDefinitions.get(activeSubTaskId) : null;
  }, [activeSubTaskId, allDefinitions]);

  const style: React.CSSProperties = {
    position: 'fixed',
    top: '1.5rem', // 24px
    right: '1.5rem', // 24px
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    willChange: 'transform',
  };
  
  useEffect(() => {
    // Pre-populate completed tasks
    const preCompletedIds = new Set<string>();
    subTasks.forEach(task => {
        if (loggedTimeMap.has(task.id)) {
            preCompletedIds.add(task.id);
        }
    });
    setCompletedSubTaskIds(preCompletedIds);
  }, [subTasks, loggedTimeMap]);


  const handleStop = useCallback((completed: boolean) => {
    setSessionState('idle');
    setActiveSubTaskId(null);
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
  }, [activity, duration, onLogTime, onClose, setIsAudioPlaying, secondsLeft, totalSeconds, updateActivity, handleToggleComplete]);

  const handleStartSubTask = useCallback((subTask: ExerciseDefinition) => {
    const durationMins = subTask.estimatedDuration || 25;
    const durationSecs = durationMins * 60;
    
    setTotalSeconds(durationSecs);
    setSecondsLeft(durationSecs);
    setCycleSecondsLeft(WORK_DURATION);
    setCurrentCycle('work');
    setActiveSubTaskId(subTask.id);
    setSessionState('running');
    setIsAudioPlaying(true);
    if (!lastSubTaskCompletionTime) {
      setLastSubTaskCompletionTime(Date.now());
    }
    setPromptForCompletion(false);
  }, [WORK_DURATION, setIsAudioPlaying, lastSubTaskCompletionTime]);

  const handleSubTaskComplete = useCallback((subTaskId: string, timerFinished: boolean = false) => {
    if (completedSubTaskIds.has(subTaskId)) return;
    setPromptForCompletion(false);
    
    const now = Date.now();
    let durationMinutes = 0;

    if (timerFinished) {
        const subTask = subTasks.find(st => st.id === subTaskId);
        durationMinutes = subTask?.estimatedDuration || Math.floor((totalSeconds) / 60);
    } else if (lastSubTaskCompletionTime) {
        durationMinutes = Math.floor((now - lastSubTaskCompletionTime) / 60000);
    }
    
    if (durationMinutes > 0) {
        logSubTaskTime(subTaskId, durationMinutes);
    }
    
    setLastSubTaskCompletionTime(now);
    const newCompletedIds = new Set(completedSubTaskIds).add(subTaskId);
    setCompletedSubTaskIds(newCompletedIds);
    setActiveSubTaskId(null);
    setSessionState('idle');
    setIsAudioPlaying(false);

    // Auto-start next task
    const nextTask = subTasks.find(st => !newCompletedIds.has(st.id));
    if (nextTask) {
        handleStartSubTask(nextTask);
    } else {
        // All tasks done
        handleStop(true); // Automatically stop and mark complete
    }
  }, [completedSubTaskIds, subTasks, totalSeconds, lastSubTaskCompletionTime, logSubTaskTime, handleStartSubTask, setIsAudioPlaying, handleStop]);


  useEffect(() => {
    const firstUncompletedTask = subTasks.find(st => !completedSubTaskIds.has(st.id));
    // Start the first available task if no task is active and the session is idle.
    if (firstUncompletedTask && !activeSubTaskId && sessionState === 'idle') {
      // Check if the would-be active task is somehow already completed. If so, don't start.
      if (!completedSubTaskIds.has(firstUncompletedTask.id)) {
        handleStartSubTask(firstUncompletedTask);
      }
    }
  }, [subTasks, completedSubTaskIds, activeSubTaskId, handleStartSubTask, sessionState]);


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (sessionState === 'running') {
      interval = setInterval(() => {
        setSecondsLeft(s => Math.max(0, s - 1));
        setCycleSecondsLeft(s => s > 0 ? s - 1 : 0);
      }, 1000);
    }
  
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionState]);

  useEffect(() => {
    if (secondsLeft <= 0 && sessionState === 'running') {
        if (activeSubTaskId) {
            setSessionState('paused');
            setIsAudioPlaying(false);
            setPromptForCompletion(true);
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
  }, [secondsLeft, cycleSecondsLeft, sessionState, currentCycle, setIsAudioPlaying, activeSubTaskId, BREAK_DURATION, WORK_DURATION]);

  useEffect(() => {
    if (sessionState === 'running' || sessionState === 'paused') {
        const currentActivity = activeFocusSession?.activity?.id === activity.id ? activeFocusSession.activity : activity;
        setActiveFocusSession({ activity: currentActivity, duration: Math.ceil(totalSeconds / 60), secondsLeft });
    }
  }, [secondsLeft, sessionState, totalSeconds, activity, setActiveFocusSession, activeFocusSession?.activity]);

  const handleExtendTimer = () => {
    const additionalSeconds = extendMinutes * 60;
    setTotalSeconds(prev => prev + additionalSeconds);
    setSecondsLeft(prev => prev + additionalSeconds);
    
    const remainingCycleTime = cycleSecondsLeft > 0 ? cycleSecondsLeft : 0;
    setCycleSecondsLeft(remainingCycleTime + additionalSeconds);
    setCurrentCycle('work');

    setPromptForCompletion(false);
    setSessionState('running');
    setIsAudioPlaying(true);
  };
  
  const handleTogglePause = () => {
    setSessionState(prev => {
        if (prev === 'running') {
            setIsAudioPlaying(false);
            return 'paused';
        }
        if (prev === 'paused') {
            setIsAudioPlaying(true);
            return 'running';
        }
        return prev;
    });
  };

  const elapsedSeconds = totalSeconds - secondsLeft;
  const progressPercentage = totalSeconds > 0 ? (elapsedSeconds / totalSeconds) * 100 : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  
  if (!activity) return null;

  const RADIUS = 70;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = elapsedSeconds / totalSeconds * CIRCUMFERENCE;

  const cycleMinutes = Math.floor(cycleSecondsLeft / 60);
  const cycleSeconds = cycleSecondsLeft % 60;
  
  const pendingSubTasks = subTasks.filter(task => !completedSubTaskIds.has(task.id) && task.id !== activeSubTaskId);
  const completedSubTaskComponents = subTasks.filter(task => completedSubTaskIds.has(task.id));

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
                 <svg className="w-full h-full" viewBox="0 0 160 160">
                    <circle
                        cx="80"
                        cy="80"
                        r={RADIUS}
                        fill="transparent"
                        stroke="hsl(var(--muted))"
                        strokeWidth="10"
                    />
                    <circle
                        cx="80"
                        cy="80"
                        r={RADIUS}
                        fill="transparent"
                        stroke="hsl(var(--primary))"
                        strokeWidth="10"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={CIRCUMFERENCE - strokeDashoffset}
                        transform="rotate(-90 80 80)"
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                </svg>
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
              <div className="mt-2 text-center">
                <p className="text-xs text-muted-foreground">Now Focusing On</p>
                <div className="flex items-center justify-center gap-2 p-2 rounded-md bg-muted/30">
                  {activeSubTask ? (
                    <>
                      <p className="text-sm font-semibold truncate" title={activeSubTask.name}>{activeSubTask.name}</p>
                      {promptForCompletion ? (
                        <div className="flex items-center gap-2">
                           <Button size="sm" onClick={() => handleSubTaskComplete(activeSubTask.id, true)}>Complete</Button>
                           <Input 
                            type="number" 
                            value={extendMinutes} 
                            onChange={e => setExtendMinutes(Number(e.target.value))} 
                            className="w-16 h-9 text-center"
                           />
                           <Button size="sm" onClick={handleExtendTimer}>Extend</Button>
                        </div>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleTogglePause}>
                            {sessionState === 'running' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSubTaskComplete(activeSubTask.id)}>
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">Select a task to begin</p>
                  )}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-border/20 text-center">
                  <p className="text-xs text-muted-foreground">Objective</p>
                  <p className="text-sm font-semibold truncate" title={focusedObjective?.name}>
                      {focusedObjective?.name || '...'}
                  </p>
              </div>
            </div>
            
            <div className="col-span-1 border-l pl-4">
              <h4 className="text-sm font-semibold mb-2">Pending Sub-tasks</h4>
              <ScrollArea className="h-48 mb-2">
                <div className="space-y-2 pr-2">
                  {pendingSubTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-2 text-sm p-1 rounded-md bg-muted/30">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleStartSubTask(task)}
                            disabled={sessionState === 'running' || promptForCompletion}
                        >
                            <Play className="h-4 w-4" />
                        </Button>
                        <label className="flex-grow">{task.name}</label>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{task.estimatedDuration || 25}m est.</span>
                    </div>
                  ))}
                  {pendingSubTasks.length === 0 && (
                    <p className="text-xs text-center text-muted-foreground py-4">All tasks completed!</p>
                  )}
                </div>
              </ScrollArea>

              <h4 className="text-sm font-semibold my-2">Completed</h4>
              <ScrollArea className="h-28">
                <div className="space-y-2 pr-2">
                    {completedSubTaskComponents.map(task => (
                       <div key={task.id} className="flex items-center justify-between text-sm p-1 rounded-md bg-green-500/10">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Check className="h-4 w-4 text-green-500" />
                                <span className="line-through">{task.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{loggedTimeMap.get(task.id) || 0}m logged</span>
                       </div>
                    ))}
                    {completedSubTaskComponents.length === 0 && (
                       <p className="text-xs text-center text-muted-foreground py-4">No tasks completed yet.</p>
                    )}
                </div>
              </ScrollArea>
            </div>
            </CardContent>
        </Card>
        </div>
  );
}
