

"use client";

import React, { useMemo } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { BookCopy, Link as LinkIcon, Briefcase, ExternalLink, Globe, Workflow } from 'lucide-react';
import type { ExerciseDefinition, Resource, DatedWorkout, DailySchedule } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, parseISO, addDays, isBefore, startOfToday } from 'date-fns';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { BrainCircuit, ArrowUp, ArrowDown, PauseCircle, AlertCircle, Clock } from 'lucide-react';
import { Separator } from './ui/separator';

interface IntentionDetailModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  intention: ExerciseDefinition | null;
  avgDailyProductiveHours?: number;
}

export function IntentionDetailModal({ isOpen, onOpenChange, intention, avgDailyProductiveHours = 1 }: IntentionDetailModalProps) {
  const { deepWorkDefinitions, upskillDefinitions, allDeepWorkLogs, allUpskillLogs, schedule } = useAuth();
  
  const { solutionTasks, outcomeObjectives, totalEstimatedMinutes } = useMemo(() => {
    if (!intention) return { solutionTasks: [], outcomeObjectives: [], totalEstimatedMinutes: 0 };

    const today = startOfToday();
    const todayKey = format(today, 'yyyy-MM-dd');
    const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];

    const allDescendantIds = new Set<string>();
    const queue = [intention.id];
    const visited = new Set<string>();
    while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        allDescendantIds.add(currentId);
        const def = allDefs.find(d => d.id === currentId);
        if (def) {
            (def.linkedDeepWorkIds || []).forEach(childId => queue.push(childId));
            (def.linkedUpskillIds || []).forEach(childId => queue.push(childId));
        }
    }
    
    const scheduledOrPendingDefIds = new Set<string>();
    for (const dateKey in schedule) {
        const scheduleDate = parseISO(dateKey);
        const dailySchedule = schedule[dateKey] as DailySchedule;
        if (dailySchedule) {
            const isToday = dateKey === todayKey;
            const isPast = isBefore(scheduleDate, today);

            Object.values(dailySchedule).flat().forEach(activity => {
                if (activity && !activity.completed && (isToday || isPast)) {
                    (activity.taskIds || []).forEach(taskId => {
                        let defId: string | undefined;
                        if (activity.type === 'deepwork') {
                           defId = allDeepWorkLogs.flatMap(l => l.exercises).find(t => t.id === taskId)?.definitionId;
                        } else if (activity.type === 'upskill') {
                           defId = allUpskillLogs.flatMap(l => l.exercises).find(t => t.id === taskId)?.definitionId;
                        }
                        if (defId && allDescendantIds.has(defId)) {
                            scheduledOrPendingDefIds.add(defId);
                        }
                    });
                }
            });
        }
    }

    const solutionTasks: { action: ExerciseDefinition, linkedVisualizations: ExerciseDefinition[] }[] = [];
    const outcomeObjectiveIds = new Set<string>();
    let estimatedMinutes = 0;

    const allScheduledOrPendingDefs = allDefs.filter(def => scheduledOrPendingDefIds.has(def.id));
    
    const solutionLeafs = allScheduledOrPendingDefs.filter(def => {
        const isDWAction = deepWorkDefinitions.some(d => d.id === def.id) && (def.linkedDeepWorkIds?.length ?? 0) === 0;
        const isUpskillViz = upskillDefinitions.some(d => d.id === def.id) && (def.linkedUpskillIds?.length ?? 0) === 0;
        return isDWAction || isUpskillViz;
    });

    solutionLeafs.forEach(leaf => {
        estimatedMinutes += leaf.estimatedDuration || 0;
        if (upskillDefinitions.some(d => d.id === leaf.id)) {
            const parentAction = deepWorkDefinitions.find(action => (action.linkedUpskillIds || []).includes(leaf.id));
            if (parentAction && scheduledOrPendingDefIds.has(parentAction.id)) {
                let solutionTask = solutionTasks.find(st => st.action.id === parentAction.id);
                if (!solutionTask) {
                    solutionTask = { action: parentAction, linkedVisualizations: [] };
                    solutionTasks.push(solutionTask);
                }
                solutionTask.linkedVisualizations.push(leaf);
            }
        } else {
            if (!solutionTasks.some(st => st.action.id === leaf.id)) {
                solutionTasks.push({ action: leaf, linkedVisualizations: [] });
            }
        }
    });

    solutionTasks.forEach(({ action }) => {
        deepWorkDefinitions.forEach(parent => {
            if ((parent.linkedDeepWorkIds || []).includes(action.id)) {
                outcomeObjectiveIds.add(parent.id);
            }
        });
    });

    const outcomeObjectives = deepWorkDefinitions.filter(def => outcomeObjectiveIds.has(def.id));

    return { solutionTasks, outcomeObjectives, totalEstimatedMinutes: estimatedMinutes };
  }, [intention, schedule, deepWorkDefinitions, upskillDefinitions, allDeepWorkLogs, allUpskillLogs]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) return `${days}d ${remainingHours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };
  
  const projectedCompletion = useMemo(() => {
    if (avgDailyProductiveHours <= 0 || totalEstimatedMinutes <= 0) return null;
    const totalHours = totalEstimatedMinutes / 60;
    const days = totalHours / avgDailyProductiveHours;

    if (days < 1) {
        return `${(days * avgDailyProductiveHours).toFixed(1)} hours`;
    }
    return `${Math.ceil(days)} days`;
  }, [totalEstimatedMinutes, avgDailyProductiveHours]);


  if (!intention) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Conceptual Flow: {intention.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow min-h-0 flex flex-col items-center justify-center p-8">
            <div className="relative w-full h-full max-w-2xl">
                <svg className="absolute top-0 left-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <marker id="arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
                        </marker>
                    </defs>
                    
                    <line x1="5%" y1="80%" x2="50%" y2="20%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                    <line x1="50%" y1="20%" x2="95%" y2="80%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                </svg>

                 <div className="absolute left-[5%] top-[80%] -translate-x-1/2 translate-y-4 text-center">
                    <p className="font-semibold text-foreground">Current state</p>
                </div>
                
                <div className="absolute left-1/2 top-[20%] -translate-x-1/2 -translate-y-[120%] text-center w-full px-4">
                    <p className="font-semibold text-foreground text-lg">Solution</p>
                     <div className="text-sm text-muted-foreground w-full max-w-sm mx-auto p-2 border rounded-md bg-background/50 backdrop-blur-sm mt-2">
                        <ScrollArea className="max-h-32">
                          <ul className="text-xs list-disc list-inside space-y-2 text-left">
                              {solutionTasks.length > 0 ? (
                                solutionTasks.map(({ action, linkedVisualizations }) => (
                                  <li key={action.id} className="font-semibold text-foreground" title={action.name}>
                                    {action.name}
                                    {linkedVisualizations.length > 0 && (
                                      <ul className="pl-4 list-['▹'] list-inside text-muted-foreground font-normal">
                                        {linkedVisualizations.map(viz => (
                                          <li key={viz.id} className="truncate" title={viz.name}>{viz.name}</li>
                                        ))}
                                      </ul>
                                    )}
                                  </li>
                                ))
                              ) : (
                                <li>No actions scheduled or pending.</li>
                              )}
                          </ul>
                        </ScrollArea>
                    </div>
                </div>

                <div className="absolute right-[5%] top-[80%] translate-x-1/2 translate-y-4 text-center">
                     <p className="font-semibold text-foreground">Outcome</p>
                     <div className="text-xs text-muted-foreground mt-1 max-w-[150px]">
                        {outcomeObjectives.length > 0 ? (
                          outcomeObjectives.map(obj => obj.name).join(', ')
                        ) : (
                          'No objectives targeted.'
                        )}
                     </div>
                      {totalEstimatedMinutes > 0 && (
                        <div className="mt-2 pt-2 border-t font-semibold">
                            <p className="text-xs flex items-center gap-1 justify-center"><Clock className="h-3 w-3" /> {formatDuration(totalEstimatedMinutes)}</p>
                        </div>
                      )}
                </div>

                <div className="absolute left-1/2 top-[80%] -translate-x-1/2 translate-y-4 text-center w-full px-4">
                     <p className="font-semibold text-foreground text-lg">Intention</p>
                     <p className="text-sm text-muted-foreground truncate" title={intention.name}>
                        {intention.name}
                     </p>
                     {projectedCompletion && (
                        <div className="mt-2 pt-2 border-t font-semibold">
                            <p className="text-xs flex items-center gap-1 justify-center"><Clock className="h-3 w-3" /> Est. {projectedCompletion}</p>
                        </div>
                     )}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
