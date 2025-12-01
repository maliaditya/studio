
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, MoreHorizontal, BrainCircuit, X, Link as LinkIcon, RefreshCw, Check, Coffee, Timer, Plus, Minus, Edit2, Edit3, Save, Menu, PlusCircle } from 'lucide-react';
import type { Activity, PauseEvent, ExerciseDefinition, PostSessionReview, SubTask } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { useDraggable } from '@dnd-kit/core';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface FocusTimerPopupProps {
  activity: Activity;
  duration: number; // in minutes
  initialSecondsLeft: number;
  onClose: () => void;
  onLogDuration: (activity: Activity, minutes: number) => void;
  onToggleMicroSkillRepetition: (coreSkillId: string, areaId: string, microSkillId: string, isReady: boolean) => void;
}

const EditableStep = React.memo(({ point, onUpdate, onDelete }: { point: { id: string; text: string }, onUpdate: (id: string, newText: string) => void, onDelete: (id: string) => void }) => {
  const [text, setText] = useState(point.text);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(point.text);
    if(point.text === '') {
        textareaRef.current?.focus();
    }
  }, [point.text]);
  
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleBlur = () => {
    const newText = text.trim();
    if (newText === '') {
      onDelete(point.id);
    } else if (newText !== point.text) {
      onUpdate(point.id, newText);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
    }
  }

  return (
    <div className="text-sm flex items-start gap-2 group w-full">
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="editable-placeholder w-full min-h-[1.5rem] resize-none overflow-hidden bg-transparent border-none focus-visible:ring-1 p-1"
        rows={1}
      />
    </div>
  );
});
EditableStep.displayName = 'EditableStep';


export function FocusTimerPopup({ activity, duration, initialSecondsLeft, onClose, onLogDuration, onToggleMicroSkillRepetition }: FocusTimerPopupProps) {
  const { 
      activeFocusSession, setActiveFocusSession, 
      updateActivity, handleToggleComplete,
      deepWorkDefinitions, upskillDefinitions,
      logSubTaskTime,
      setIsAudioPlaying,
      updateTaskDuration,
      permanentlyLoggedTaskIds,
      setSelectedDeepWorkTask,
      setSelectedUpskillTask,
      updateActivitySubtask, deleteActivitySubtask,
  } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const popupRef = useRef<HTMLDivElement>(null);
  
  const [sessionCompletedSubTaskIds, setSessionCompletedSubTaskIds] = useState<Set<string>>(new Set());

  const [promptForCompletion, setPromptForCompletion] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(5);
  const [skipBreaks, setSkipBreaks] = useState(false);
  
  const [editingDurationTaskId, setEditingDurationTaskId] = useState<string | null>(null);
  const [subTaskDurationInput, setSubTaskDurationInput] = useState('');
  
  const [isSubTasksVisible, setIsSubTasksVisible] = useState(true);

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
  
  const pomodoroSubTasks = useMemo(() => {
    if (activity.type !== 'pomodoro') return [];
    const totalDuration = activeFocusSession?.duration || duration;
    const actionTime = Math.max(5, totalDuration - 3 - 5 - 5);
    return [
        { id: 'pomodoro_goal', name: "What is the Goal?", completed: false, estimatedDuration: 3 },
        { id: 'pomodoro_visualize', name: "Visualize the action", completed: false, estimatedDuration: 5 },
        { id: 'pomodoro_action', name: "Action", completed: false, estimatedDuration: actionTime },
        { id: 'pomodoro_reflect', name: "Reflect", completed: false, estimatedDuration: 5 },
    ];
  }, [activity.type, activeFocusSession?.duration, duration]);
  
  const subTasks = useMemo(() => {
    if (activity.type === 'pomodoro') return pomodoroSubTasks;
    if (activity.subTasks && activity.subTasks.length > 0) {
      return activity.subTasks.map(st => ({
        id: st.id,
        name: st.text,
        completed: st.completed,
        estimatedDuration: 25,
      }));
    }
    if (!focusedObjective) return [];
    const childrenIds = [
        ...(focusedObjective.linkedDeepWorkIds || []), 
        ...(focusedObjective.linkedUpskillIds || [])
    ];
    return childrenIds.map(id => allDefinitions.get(id)).filter((t): t is ExerciseDefinition => !!t);
  }, [activity.type, activity.subTasks, focusedObjective, allDefinitions, pomodoroSubTasks]);
  
  const isSubTaskComplete = useCallback((subTask: SubTask | ExerciseDefinition) => {
    if ('completed' in subTask) { // It's a generic SubTask
        return subTask.completed;
    }
    // It's a deep work/upskill task
    return permanentlyLoggedTaskIds.has(subTask.id) || 
           sessionCompletedSubTaskIds.has(subTask.id) ||
           (subTask.loggedDuration || 0) > 0;
  }, [permanentlyLoggedTaskIds, sessionCompletedSubTaskIds]);

  const activeSubTask = useMemo(() => {
    return subTasks.find(task => !isSubTaskComplete(task)) || null;
  }, [subTasks, isSubTaskComplete]);
  
  const pendingSubTasks = useMemo(() => {
    return subTasks.filter(task => 
      !isSubTaskComplete(task) && task.id !== activeSubTask?.id
    );
  }, [subTasks, activeSubTask?.id, isSubTaskComplete]);

  const completedSubTaskComponents = useMemo(() => {
    return subTasks.filter(task => isSubTaskComplete(task));
  }, [subTasks, isSubTaskComplete]);

  const showSubTasks = useMemo(() => {
      return (activity.type === 'deepwork' || activity.type === 'upskill' || activity.type === 'pomodoro' || (activity.subTasks && activity.subTasks.length > 0)) && subTasks.length > 0;
  }, [activity.type, activity.subTasks, subTasks]);

  const style: React.CSSProperties = {
    position: 'fixed',
    top: '1.5rem',
    right: '1.5rem',
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    willChange: 'transform',
  };
  
  const handleStartSubTask = useCallback((subTask: (SubTask | ExerciseDefinition)) => {
    const durationMins = 'estimatedDuration' in subTask ? (subTask.estimatedDuration || 25) : 25;
    if (activeFocusSession) {
        setActiveFocusSession({
            ...activeFocusSession,
            duration: durationMins,
            secondsLeft: durationMins * 60,
            totalSeconds: durationMins * 60,
            startTime: Date.now(), // Reset start time for the new sub-task
            subTaskStartTime: Date.now(),
            state: 'running',
        });
    }
    setIsAudioPlaying(true);
    setPromptForCompletion(false);
  }, [activeFocusSession, setActiveFocusSession, setIsAudioPlaying]);

  const handleStop = useCallback((completed: boolean) => {
    setIsAudioPlaying(false);
    
    if (activity && activeFocusSession) {
      const updatedActivity: Activity = { ...activity, focusSessionEndTime: Date.now() };
      updateActivity(updatedActivity);

      if (completed) {
        handleToggleComplete(activity.slot, activity.id, true);
        toast({ title: "Objective Complete!", description: `All tasks for "${focusedObjective?.name || activity.details}" are done.` });
      }
    }
    onClose();
  }, [activity, onClose, setIsAudioPlaying, updateActivity, handleToggleComplete, showSubTasks, toast, focusedObjective?.name, activeFocusSession]);
  
  const handleSubTaskComplete = useCallback(() => {
    if (!activeSubTask || !activeFocusSession) return;
  
    // Log time for the completed sub-task, even if finished early
    if ('completed' in activeSubTask) {
      updateActivitySubtask(activity.id, activeSubTask.id, { completed: true });
    } else {
      // Calculate elapsed time for the current sub-task and log it
      const startTime = activeFocusSession.subTaskStartTime || activeFocusSession.startTime;
      const durationMs = Date.now() - startTime;
      const durationMinutes = Math.max(1, Math.floor(durationMs / 60000));
      logSubTaskTime(activeSubTask.id, durationMinutes);
      setSessionCompletedSubTaskIds(prev => new Set(prev).add(activeSubTask.id));
    }
    setPromptForCompletion(false);
  
    const updatedCompletedIds = new Set(sessionCompletedSubTaskIds).add(activeSubTask.id);
    const nextTask = subTasks.find(st => !updatedCompletedIds.has(st.id) && !('completed' in st && st.completed) && !('loggedDuration' in st && (st.loggedDuration || 0 > 0)));
  
    if (nextTask) {
      handleStartSubTask(nextTask);
    } else {
      handleStop(true);
    }
  }, [
    activeSubTask,
    subTasks,
    logSubTaskTime,
    handleStartSubTask,
    handleStop,
    activeFocusSession,
    activity.id,
    updateActivitySubtask,
    sessionCompletedSubTaskIds,
  ]);
  
  const handleStandaloneTaskComplete = () => {
    if (activeFocusSession) {
      const { startTime } = activeFocusSession;
      const elapsedMs = Date.now() - startTime;
      const elapsedMinutes = Math.max(1, Math.round(elapsedMs / 60000));
      onLogDuration(activity, elapsedMinutes);
    } else {
      onLogDuration(activity, activity.focusSessionInitialDuration || duration);
    }
    onClose();
  };

  useEffect(() => {
    if (activeFocusSession?.state === 'idle' && showSubTasks) {
      const allDone = subTasks.length > 0 && subTasks.every(isSubTaskComplete);
      if (allDone) {
        handleStop(true);
      } else if (activeSubTask) {
        handleStartSubTask(activeSubTask);
      }
    }
  }, [activeFocusSession?.state, showSubTasks, activeSubTask, handleStartSubTask, isSubTaskComplete, subTasks, handleStop]);

  useEffect(() => {
    if (activeFocusSession?.secondsLeft === 0 && activeFocusSession.state === 'running') {
      setActiveFocusSession(prev => prev ? { ...prev, state: 'paused' } : null);
      setIsAudioPlaying(false);
      setPromptForCompletion(true);
    }
  }, [activeFocusSession, setActiveFocusSession, setIsAudioPlaying]);

  const handleExtendTimer = () => {
    const additionalSeconds = extendMinutes * 60;
    if (activeFocusSession) {
        setActiveFocusSession({
            ...activeFocusSession,
            secondsLeft: (activeFocusSession.secondsLeft || 0) + additionalSeconds,
            totalSeconds: (activeFocusSession.totalSeconds || 0) + additionalSeconds,
            state: 'running',
        });
    }
    setPromptForCompletion(false);
    setIsAudioPlaying(true);
  };
  
  const handleTogglePause = () => {
    if (!activeFocusSession) return;
    const isCurrentlyRunning = activeFocusSession.state === 'running';
    setActiveFocusSession({
        ...activeFocusSession,
        state: isCurrentlyRunning ? 'paused' : 'running',
    });
    setIsAudioPlaying(!isCurrentlyRunning);
  };
  
  const handleSetSubTaskDuration = () => {
    if (editingDurationTaskId) {
      const newDuration = parseInt(subTaskDurationInput, 10);
      if (!isNaN(newDuration) && newDuration > 0) {
        updateTaskDuration(editingDurationTaskId, newDuration);
        if (activeSubTask?.id === editingDurationTaskId && activeFocusSession) {
            setActiveFocusSession({
                ...activeFocusSession,
                totalSeconds: newDuration * 60,
                secondsLeft: newDuration * 60,
            });
        }
        setEditingDurationTaskId(null);
        setSubTaskDurationInput('');
      } else {
        setEditingDurationTaskId(null);
      }
    }
  };

  const getLoggedMinutesForTask = useCallback((taskId: string) => {
    const definition = allDefinitions.get(taskId);
    return definition?.loggedDuration || 0;
  }, [allDefinitions]);
  
  const handleObjectiveClick = () => {
    if (!focusedObjective) return;
    const isUpskill = upskillDefinitions.some(d => d.id === focusedObjective.id);
    if (isUpskill) {
      setSelectedUpskillTask(focusedObjective);
    } else {
      setSelectedDeepWorkTask(focusedObjective);
    }
    router.push('/deep-work');
  };

  const secondsLeft = Math.floor(activeFocusSession?.secondsLeft ?? 0);
  const totalSeconds = activeFocusSession?.totalSeconds ?? duration * 60;

  const elapsedSeconds = totalSeconds - secondsLeft;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  
  if (!activity || !activeFocusSession) return null;

  const RADIUS = 70;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = totalSeconds > 0 ? CIRCUMFERENCE - (elapsedSeconds / totalSeconds * CIRCUMFERENCE) : CIRCUMFERENCE;
  
  const allSubTasksCompleted = showSubTasks && !activeSubTask;
  let nowFocusingText: string;

  if (allSubTasksCompleted) {
    nowFocusingText = "All sub-tasks completed!";
  } else if (activeSubTask) {
    nowFocusingText = activeSubTask.name;
  } else {
    nowFocusingText = activity.details;
  }

  const doesSubTaskNeedDuration = (task: any) => {
      // Check for simple sub-tasks that always need duration, or exercise-based ones without a pre-set duration.
      return ('completed' in task) || !('estimatedDuration' in task && task.estimatedDuration && task.estimatedDuration > 0);
  };


  return (
        <div ref={setNodeRef} style={style} className="fixed z-[100]">
        <Card ref={popupRef} className={cn(
            "shadow-2xl rounded-xl border-border/20 bg-background/80 backdrop-blur-sm transition-[width]",
            showSubTasks && isSubTasksVisible ? "w-[600px]" : "w-[300px]"
        )}>
            <CardContent className={cn(
                "p-4 grid gap-4",
                showSubTasks && isSubTasksVisible ? "grid-cols-2" : "grid-cols-1"
            )}>
            <div className="col-span-1 space-y-2">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 cursor-grab" {...listeners} {...attributes}>
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium">Focus period...</p>
                  </div>
                  <div className="flex items-center">
                    {showSubTasks && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsSubTasksVisible(v => !v)}>
                            <Menu className="h-4 w-4" />
                        </Button>
                    )}
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

              <div className="mt-2 text-center">
                <p className="text-xs text-muted-foreground">Now Focusing On</p>
                <div className="flex items-center justify-center gap-2 p-2 rounded-md bg-muted/30">
                    <p className="text-sm font-semibold truncate" title={nowFocusingText}>{nowFocusingText}</p>
                    {showSubTasks && activeSubTask && doesSubTaskNeedDuration(activeSubTask) && editingDurationTaskId !== activeSubTask.id && (
                        <button className="text-yellow-500" onClick={() => { setEditingDurationTaskId(activeSubTask.id); setSubTaskDurationInput(''); }}>
                            <Timer className="h-4 w-4" />
                        </button>
                    )}
                    {editingDurationTaskId === activeSubTask?.id && (
                        <form onSubmit={(e) => { e.preventDefault(); handleSetSubTaskDuration(); }} className="flex items-center gap-1">
                            <Input type="number" value={subTaskDurationInput} onChange={e => setSubTaskDurationInput(e.target.value)} className="w-16 h-7 text-xs" autoFocus onBlur={handleSetSubTaskDuration} />
                            <Button size="xs" type="submit">Set</Button>
                        </form>
                    )}
                  {!promptForCompletion && !allSubTasksCompleted && (
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleTogglePause}>
                          {activeFocusSession.state === 'running' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" onClick={showSubTasks ? handleSubTaskComplete : handleStandaloneTaskComplete}>
                          <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {showSubTasks && (
                <div className="mt-2 pt-2 border-t border-border/20 text-center">
                    <p className="text-xs text-muted-foreground">Objective</p>
                    <button 
                        className="text-sm font-semibold truncate hover:underline" 
                        title={focusedObjective?.name}
                        onClick={handleObjectiveClick}
                    >
                        {focusedObjective?.name || '...'}
                    </button>
                </div>
              )}
            </div>
            
            {showSubTasks && isSubTasksVisible && (
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
                            disabled={activeFocusSession.state === 'running' || promptForCompletion}
                        >
                            <Play className="h-4 w-4" />
                        </Button>
                        <label className="flex-grow">{task.name}</label>
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            {'estimatedDuration' in task && task.estimatedDuration ? `${task.estimatedDuration}m est.` : 'No est.'}
                            {doesSubTaskNeedDuration(task) && editingDurationTaskId !== task.id && (
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
                  {pendingSubTasks.length === 0 && !allSubTasksCompleted && (
                    <p className="text-xs text-center text-muted-foreground py-4">Loading next task...</p>
                  )}
                  {allSubTasksCompleted && (
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
                            {'loggedDuration' in task && <span className="text-xs text-muted-foreground">{getLoggedMinutesForTask(task.id)}m logged</span>}
                       </div>
                    ))}
                    {completedSubTaskComponents.length === 0 && (
                       <p className="text-xs text-center text-muted-foreground py-4">No tasks completed yet.</p>
                    )}
                </div>
              </ScrollArea>
            </div>
            )}
             {promptForCompletion && (
                <div className="col-span-1 flex flex-col items-center justify-center gap-2">
                    <p className="text-lg font-semibold">Time's up!</p>
                    <p className="text-sm text-center text-muted-foreground">Log your time or extend the session.</p>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setExtendMinutes(5)} size="sm" variant={extendMinutes === 5 ? 'default' : 'outline'}>5m</Button>
                        <Button onClick={() => setExtendMinutes(15)} size="sm" variant={extendMinutes === 15 ? 'default' : 'outline'}>15m</Button>
                        <Button onClick={() => setExtendMinutes(25)} size="sm" variant={extendMinutes === 25 ? 'default' : 'outline'}>25m</Button>
                    </div>
                    <Button onClick={handleExtendTimer} className="w-full">Extend Session</Button>
                     <Button onClick={showSubTasks ? handleSubTaskComplete : handleStandaloneTaskComplete} variant="secondary" className="w-full">
                        Complete & Next
                    </Button>
                </div>
            )}
            </CardContent>
        </Card>
        </div>
      );
}

    