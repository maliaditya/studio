
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
import { BrainCircuit, ArrowUp, ArrowDown, PauseCircle, AlertCircle } from 'lucide-react';
import { Separator } from './ui/separator';

interface IntentionDetailModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  intention: ExerciseDefinition | null;
}

const productivityLevels = [
    { level: 'L1', min: 15, max: 30, description: 'Just showing up', zone: '⚪️ Entry Zone' },
    { level: 'L2', min: 30, max: 45, description: 'Light touch / spark', zone: '⚪️ Entry Zone' },
    { level: 'L3', min: 45, max: 60, description: 'Single Pomodoro session', zone: '⚪️ Entry Zone' },
    { level: 'L4', min: 60, max: 90, description: 'Basic learner habit', zone: '🟢 Stable Zone' },
    { level: 'L5', min: 90, max: 120, description: 'Focused beginner phase', zone: '🟢 Stable Zone' },
    { level: 'L6', min: 120, max: 150, description: 'Mini deep work commitment', zone: '🟢 Stable Zone' },
    { level: 'L7', min: 150, max: 180, description: 'Structured discipline zone', zone: '🟢 Stable Zone' },
    { level: 'L8', min: 180, max: 210, description: 'Daily scholar mode', zone: '🟡 Progress Zone' },
    { level: 'L9', min: 210, max: 240, description: 'Solid effort / Part-time student', zone: '🟡 Progress Zone' },
    { level: 'L10', min: 240, max: 300, description: 'Full-time learner level', zone: '🟡 Progress Zone' },
    { level: 'L11', min: 300, max: 360, description: 'Deep learner zone', zone: '🟡 Progress Zone' },
    { level: 'L12', min: 360, max: 420, description: 'Advanced practice / Bootcamp ready', zone: '🟠 High Intensity' },
    { level: 'L13', min: 420, max: 480, description: 'Peak state zone', zone: '🟠 High Intensity' },
    { level: 'L14', min: 480, max: 540, description: 'Monastic discipline', zone: '🔴 Extreme Zone' },
    { level: 'L15', min: 540, max: 600, description: 'Total immersion day', zone: '🔴 Extreme Zone' },
    { level: 'L16', min: 600, max: 660, description: 'Elite performer stretch', zone: '🔴 Extreme Zone' },
    { level: 'L17', min: 660, max: 720, description: 'Near-max capacity', zone: '🔴 Extreme Zone' },
    { level: 'L18', min: 720, max: 780, description: 'Obsessive learner', zone: '🔴 Extreme Zone' },
    { level: 'L19', min: 780, max: 900, description: 'Burning fuel — not sustainable daily', zone: '🔥 Overdrive Zone' },
    { level: 'L20', min: 900, max: Infinity, description: 'Legendary grind day (Rare / Purpose-driven only)', zone: '⚠️ Apex Zone' },
];

export function IntentionDetailModal({ isOpen, onOpenChange, intention }: IntentionDetailModalProps) {
  const { deepWorkDefinitions, upskillDefinitions, allDeepWorkLogs, allUpskillLogs, schedule } = useAuth();
  
  const productivityStats = useMemo(() => {
    const getDailyDuration = (logs: DatedWorkout[], dateStr: string, durationField: 'reps' | 'weight') => {
        if (!logs) return 0;
        const logForDay = logs.find(log => log.date === dateStr);
        if (!logForDay) return 0;
        return logForDay.exercises.reduce((total, ex) => total + ex.loggedSets.reduce((sum, set) => sum + (set[durationField] || 0), 0), 0);
    };

    const calculateWeeklyAverage = (logs: DatedWorkout[], durationField: 'reps' | 'weight') => {
      if (!logs) return 0;
      const today = new Date();
      let totalMinutes = 0;
      for (let i = 0; i < 7; i++) {
        const day = subDays(today, i);
        const dateKey = format(day, 'yyyy-MM-dd');
        totalMinutes += getDailyDuration(logs, dateKey, durationField);
      }
      return totalMinutes / 7;
    };
    
    const avgUpskillMinutes = calculateWeeklyAverage(allUpskillLogs, 'reps');
    const avgDeepWorkMinutes = calculateWeeklyAverage(allDeepWorkLogs, 'weight');
    const totalProductiveMinutes = avgUpskillMinutes + avgDeepWorkMinutes;
    const avgProductiveHours = totalProductiveMinutes / 60;
    const currentLevel = productivityLevels.find(l => totalProductiveMinutes >= l.min && totalProductiveMinutes < l.max) || null;

    return {
      avgProductiveHours: avgProductiveHours,
      currentLevel: currentLevel?.level || 'N/A'
    };
  }, [allUpskillLogs, allDeepWorkLogs]);
  
  const { solutionTasks, outcomeObjectives } = useMemo(() => {
    if (!intention) return { solutionTasks: [], outcomeObjectives: [] };

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
    
    // Find leaf "Actions" from the pending list
    const solutionActions = deepWorkDefinitions.filter(def => {
        return scheduledOrPendingDefIds.has(def.id) && (def.linkedDeepWorkIds?.length ?? 0) === 0;
    });

    const solutionTasks = solutionActions.map(action => {
      // Find linked visualizations for each action
      const linkedVisualizations = (action.linkedUpskillIds || [])
        .map(id => upskillDefinitions.find(d => d.id === id))
        .filter((viz): viz is ExerciseDefinition => !!viz && (viz.linkedUpskillIds?.length ?? 0) === 0);
      return { action, linkedVisualizations };
    });

    // Find parent objectives of the solution tasks
    const objectiveIds = new Set<string>();
    solutionActions.forEach(action => {
      deepWorkDefinitions.forEach(parent => {
        if ((parent.linkedDeepWorkIds || []).includes(action.id)) {
          objectiveIds.add(parent.id);
        }
      });
    });
    const outcomeObjectives = deepWorkDefinitions.filter(def => objectiveIds.has(def.id));

    return { solutionTasks, outcomeObjectives };
  }, [intention, schedule, deepWorkDefinitions, upskillDefinitions, allDeepWorkLogs, allUpskillLogs]);


  if (!intention) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Conceptual Flow: {intention.name}</DialogTitle>
          <DialogDescription>
            This diagram illustrates the strategic path from your current state to your desired outcome based on pending tasks.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0 flex flex-col items-center justify-center p-8">
            <div className="relative w-full h-full max-w-3xl">
                <svg className="absolute top-0 left-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <marker id="arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
                        </marker>
                    </defs>
                    
                    <line x1="5%" y1="90%" x2="50%" y2="10%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                    <line x1="50%" y1="10%" x2="95%" y2="90%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                </svg>

                 <div className="absolute left-[5%] bottom-[10%] -translate-x-1/2 translate-y-[150%] text-center">
                    <p className="font-semibold text-foreground">Current state</p>
                    <div className="text-xs text-muted-foreground mt-1">
                        <p>Avg. Productive: {productivityStats.avgProductiveHours.toFixed(1)}h/day</p>
                        <p>Productivity Level: {productivityStats.currentLevel}</p>
                    </div>
                </div>
                
                <div className="absolute left-1/2 top-[10%] -translate-x-1/2 -translate-y-[110%] text-center w-full px-4">
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

                <div className="absolute right-[5%] bottom-[10%] translate-x-1/2 translate-y-[150%] text-center">
                     <p className="font-semibold text-foreground">Outcome</p>
                     <div className="text-xs text-muted-foreground mt-1 max-w-[150px]">
                        {outcomeObjectives.length > 0 ? (
                          outcomeObjectives.map(obj => obj.name).join(', ')
                        ) : (
                          'No objectives targeted.'
                        )}
                     </div>
                </div>

                <div className="absolute left-1/2 bottom-[10%] -translate-x-1/2 translate-y-[120%] text-center w-full px-4">
                     <p className="font-semibold text-foreground text-lg">Intention</p>
                     <p className="text-sm text-muted-foreground truncate" title={intention.name}>
                        {intention.name}
                     </p>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

