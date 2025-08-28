
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, MoreHorizontal, BrainCircuit, X, Link as LinkIcon, RefreshCw, Check, Coffee, Timer, Plus, Minus, Edit2, Edit3, Save } from 'lucide-react';
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
      updateTaskDuration,
      permanentlyLoggedTaskIds,
  } = useAuth();
  const [totalSeconds, setTotalSeconds] = useState(duration * 60);
  const [secondsLeft, setSecondsLeft] = useState(initialSecondsLeft);
  
  const [sessionCompletedSubTaskIds, setSessionCompletedSubTaskIds] = useState<Set<string>>(new Set());

  const BREAK_DURATION = 5 * 60; // 5 minutes
  const WORK_DURATION = 25 * 60; // 25 minutes

  const [sessionState, setSessionState] = useState<'running' | 'paused' | 'idle'>('running');
  const [currentCycle, setCurrentCycle] = useState<'work' | 'break'>('work');
  const [cycleSecondsLeft, setCycleSecondsLeft] = useState(WORK_DURATION);
  
  const popupRef = useRef<HTMLDivElement>(null);
  
  const [promptForCompletion, setPromptForCompletion] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(5);
  const [skipBreaks, setSkipBreaks] = useState(false);
  
  const [editingDurationTaskId, setEditingDurationTaskId] = useState<string | null>(null);
  const [subTaskDurationInput, setSubTaskDurationInput] = useState('');

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
  
  const allCompletedSubTaskIds = useMemo(() => new Set([
      ...Array.from(permanentlyLoggedTaskIds), 
      ...Array.from(sessionCompletedSubTaskIds)
  ]), [permanentlyLoggedTaskIds, sessionCompletedSubTaskIds]);

  const activeSubTask = useMemo(() => {
    return subTasks.find(task => !allCompletedSubTaskIds.has(task.id)) || null;
  }, [subTasks, allCompletedSubTaskIds]);
  
  const pendingSubTasks = useMemo(() => {
    return subTasks.filter(task => 
      !allCompletedSubTaskIds.has(task.id) && task.id !== activeSubTask?.id
    );
  }, [subTasks, activeSubTask?.id, allCompletedSubTaskIds]);

  const completedSubTaskComponents = useMemo(() => {
    return subTasks.filter(task => allCompletedSubTaskIds.has(task.id));
  }, [subTasks, allCompletedSubTaskIds]);

  const showSubTasks = useMemo(() => {
      return (activity.type === 'deepwork' || activity.type === 'upskill') && subTasks.length > 0;
  }, [activity.type, subTasks]);

  const style: React.CSSProperties = {
    position: 'fixed',
    top: '1.5rem',
    right: '1.5rem',
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    willChange: 'transform',
  };

  const handleStop = useCallback((completed: boolean) => {
    setSessionState('idle');
    setIsAudioPlaying(false);
    
    if (activity) {
      const updatedActivity: Activity = {
        ...activity,
        focusSessionEndTime: Date.now(),
      };
      updateActivity(updatedActivity);

      if (completed) {
        const elapsedSeconds = (Date.now() - (updatedActivity.focusSessionInitialStartTime || Date.now())) / 1000;
        const elapsedMinutes = Math.floor(elapsedSeconds / 60);
        onLogTime(updatedActivity, elapsedMinutes);
        handleToggleComplete(activity.slot, activity.id, true);
      }
    }
    onClose();
  }, [activity, onLogTime, onClose, setIsAudioPlaying, updateActivity, handleToggleComplete]);

  const handleStartSubTask = useCallback((subTask: ExerciseDefinition) => {
    const durationMins = subTask.estimatedDuration || 25;
    const durationSecs = durationMins * 60;
    
    setTotalSeconds(durationSecs);
    setSecondsLeft(durationSecs);
    setCycleSecondsLeft(WORK_DURATION);
    setCurrentCycle('work');
    setSessionState('running');
    setIsAudioPlaying(true);
    setPromptForCompletion(false);
  }, [WORK_DURATION, setIsAudioPlaying]);

  const handleSubTaskComplete = useCallback(() => {
    if (!activeSubTask) {
        if (!showSubTasks) handleStop(true); // Standalone task
        return;
    }

    setPromptForCompletion(false);
    
    const durationMinutes = Math.floor(totalSeconds / 60);
    if (durationMinutes > 0) {
        logSubTaskTime(activeSubTask.id, durationMinutes);
    }
    
    const newCompletedSet = new Set(sessionCompletedSubTaskIds).add(activeSubTask.id);
    setSessionCompletedSubTaskIds(newCompletedSet);
    
    // Crucially, check against the *updated* set of completed tasks
    const nextTask = subTasks.find(st => !newCompletedSet.has(st.id) && !permanentlyLoggedTaskIds.has(st.id));

    if (nextTask) {
        handleStartSubTask(nextTask);
    } else {
        // All sub-tasks for this objective are now complete
        handleStop(true);
    }
  }, [activeSubTask, totalSeconds, sessionCompletedSubTaskIds, subTasks, permanentlyLoggedTaskIds, logSubTaskTime, handleStartSubTask, handleStop, showSubTasks]);

  useEffect(() => {
    if (sessionState === 'idle' && showSubTasks) {
        if (activeSubTask) {
             handleStartSubTask(activeSubTask);
        } else if (subTasks.length > 0 && completedSubTaskComponents.length === subTasks.length) {
            // This case handles when the component opens and all tasks are already done
            handleStop(true);
        }
    }
  }, [sessionState, showSubTasks, activeSubTask, handleStartSubTask, subTasks.length, completedSubTaskComponents.length, handleStop]);


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (sessionState === 'running') {
      interval = setInterval(() => {
        setSecondsLeft(s => Math.max(0, s - 1));
        if (!skipBreaks) {
          setCycleSecondsLeft(s => s > 0 ? s - 1 : 0);
        }
      }, 1000);
    }
  
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionState, skipBreaks]);

  useEffect(() => {
    if (secondsLeft <= 0 && sessionState === 'running') {
        setSessionState('paused');
        setIsAudioPlaying(false);
        setPromptForCompletion(true);
    }

    if (!skipBreaks && cycleSecondsLeft <= 0 && sessionState === 'running') {
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
  }, [secondsLeft, cycleSecondsLeft, sessionState, currentCycle, setIsAudioPlaying, activeSubTask, handleSubTaskComplete, showSubTasks, BREAK_DURATION, WORK_DURATION, skipBreaks]);

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
    
    if (!skipBreaks) {
      const remainingCycleTime = cycleSecondsLeft > 0 ? cycleSecondsLeft : 0;
      setCycleSecondsLeft(remainingCycleTime + additionalSeconds);
      setCurrentCycle('work');
    }

    setPromptForCompletion(false);
    setSessionState('running');
    setIsAudioPlaying(true);
  };
  
  const handleTogglePause = () => {
    const isCurrentlyRunning = sessionState === 'running';
    setSessionState(isCurrentlyRunning ? 'paused' : 'running');
    setIsAudioPlaying(!isCurrentlyRunning);
  };
  
  const handleSetSubTaskDuration = () => {
    if (editingDurationTaskId) {
      const newDuration = parseInt(subTaskDurationInput, 10);
      if (!isNaN(newDuration) && newDuration > 0) {
        updateTaskDuration(editingDurationTaskId, newDuration);
        if (activeSubTask?.id === editingDurationTaskId) {
          setTotalSeconds(newDuration * 60);
          setSecondsLeft(newDuration * 60);
        }
        setEditingDurationTaskId(null);
        setSubTaskDurationInput('');
      } else {
        setEditingDurationTaskId(null);
      }
    }
  };

  const elapsedSeconds = totalSeconds - secondsLeft;
  
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  
  const cycleMinutes = Math.floor(cycleSecondsLeft / 60);
  const cycleSeconds = cycleSecondsLeft % 60;

  if (!activity) return null;

  const RADIUS = 70;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = totalSeconds > 0 ? CIRCUMFERENCE - (elapsedSeconds / totalSeconds * CIRCUMFERENCE) : CIRCUMFERENCE;

  return (
        <div ref={setNodeRef} style={style} className="fixed z-[100]">
        <Card ref={popupRef} className={cn("shadow-2xl rounded-xl border-border/20 bg-background/80 backdrop-blur-sm", showSubTasks ? "w-[600px]" : "w-[300px]")}>
            <CardContent className={cn("p-4 grid gap-4", showSubTasks ? "grid-cols-2" : "grid-cols-1")}>
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
                        strokeDashoffset={strokeDashoffset}
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
              {!skipBreaks && (
                <div className="text-center -mt-2">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        {sessionState === 'running' && (currentCycle === 'work' ? <BrainCircuit className="h-4 w-4" /> : <Coffee className="h-4 w-4" />)}
                        <span className="font-mono">{String(cycleMinutes).padStart(2, '0')}:{String(cycleSeconds).padStart(2, '0')}</span>
                    </div>
                </div>
              )}
              <div className="mt-2 text-center">
                <p className="text-xs text-muted-foreground">Now Focusing On</p>
                <div className="flex items-center justify-center gap-2 p-2 rounded-md bg-muted/30">
                    <p className="text-sm font-semibold truncate" title={activeSubTask?.name || activity.details}>{activeSubTask?.name || activity.details}</p>
                    {showSubTasks && activeSubTask && (activeSubTask.estimatedDuration === undefined || activeSubTask.estimatedDuration === 0) && editingDurationTaskId !== activeSubTask?.id && (
                        <button className="text-yellow-500" onClick={() => { setEditingDurationTaskId(activeSubTask?.id || null); setSubTaskDurationInput(''); }}>
                            <Timer className="h-4 w-4" />
                        </button>
                    )}
                    {editingDurationTaskId === activeSubTask?.id && (
                        <form onSubmit={(e) => { e.preventDefault(); handleSetSubTaskDuration(); }} className="flex items-center gap-1">
                            <Input type="number" value={subTaskDurationInput} onChange={e => setSubTaskDurationInput(e.target.value)} className="w-16 h-7 text-xs" autoFocus onBlur={handleSetSubTaskDuration} />
                            <Button size="xs" type="submit">Set</Button>
                        </form>
                    )}
                  {promptForCompletion ? (
                    <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleSubTaskComplete}>Complete</Button>
                        <Input
                        type="number"
                        value={extendMinutes}
                        onChange={e => setExtendMinutes(Number(e.target.value))}
                        className="w-16 h-9 text-center"
                        />
                        <Button size="sm" onClick={handleExtendTimer}>Extend</Button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleTogglePause}>
                          {sessionState === 'running' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" onClick={() => handleStop(true)}>
                          <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {showSubTasks && (
                <div className="mt-2 pt-2 border-t border-border/20 text-center">
                    <p className="text-xs text-muted-foreground">Objective</p>
                    <p className="text-sm font-semibold truncate" title={focusedObjective?.name}>
                        {focusedObjective?.name || '...'}
                    </p>
                </div>
              )}
            </div>
            
            {showSubTasks && (
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
                         <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            {task.estimatedDuration ? `${task.estimatedDuration}m est.` : 'No est.'}
                            {(task.estimatedDuration === undefined || task.estimatedDuration === 0) && editingDurationTaskId !== task.id && (
                                <button className="text-yellow-500" onClick={() => { setEditingDurationTaskId(task.id); setSubTaskDurationInput(''); }}>
                                    <Timer className="h-4 w-4"/>
                                </button>
                            )}
                            {editingDurationTaskId === task.id && (
                                <form onSubmit={(e) => { e.preventDefault(); handleSetSubTaskDuration(); }} className="flex items-center gap-1">
                                    <Input type="number" value={subTaskDurationInput} onChange={e => setSubTaskDurationInput(e.target.value)} className="w-16 h-7 text-xs" autoFocus onBlur={handleSetSubTaskDuration} />
                                    <Button size="xs" type="submit">Set</Button>
                                </form>
                            )}
                        </span>
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
                            <span className="text-xs text-muted-foreground">{permanentlyLoggedTaskIds.has(task.id) ? `${(deepWorkDefinitions.find(d => d.id === task.id)?.estimatedDuration || 0)}m logged` : 'Just completed'}</span>
                       </div>
                    ))}
                    {completedSubTaskComponents.length === 0 && (
                       <p className="text-xs text-center text-muted-foreground py-4">No tasks completed yet.</p>
                    )}
                </div>
              </ScrollArea>
            </div>
            )}
            </CardContent>
        </Card>
        </div>
  );
}
