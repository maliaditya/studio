
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
import type { ExerciseDefinition, Resource, DatedWorkout } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, parseISO, addDays } from 'date-fns';
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
  const { upskillDefinitions, deepWorkDefinitions, allUpskillLogs, allDeepWorkLogs } = useAuth();
  
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
  
  const permanentlyLoggedActionIds = useMemo(() => {
    const loggedIds = new Set<string>();
    allDeepWorkLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (ex.loggedSets.length > 0) loggedIds.add(ex.definitionId);
      });
    });
    return loggedIds;
  }, [allDeepWorkLogs]);

  const permanentlyLoggedVisualizationIds = useMemo(() => {
    const loggedIds = new Set<string>();
    allUpskillLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (ex.loggedSets.length > 0) loggedIds.add(ex.definitionId);
      });
    });
    return loggedIds;
  }, [allUpskillLogs]);

  const {
    linkedLearningTasks,
    linkedWorkTasks,
    totalEstimatedHours,
    totalLoggedHours,
    progressPercent,
    projectedDate,
    daysRemaining,
  } = useMemo(() => {
    if (!intention) return {
        linkedLearningTasks: [],
        linkedWorkTasks: [],
        totalEstimatedHours: 0,
        totalLoggedHours: 0,
        progressPercent: 0,
        projectedDate: null,
        daysRemaining: null,
    };

    const isDeepWorkObjectiveComplete = (objective: ExerciseDefinition): boolean => {
      const childActionIds = (objective.linkedDeepWorkIds || []).filter(childId => {
          const childDef = deepWorkDefinitions.find(d => d.id === childId);
          return childDef && (childDef.linkedDeepWorkIds?.length ?? 0) === 0;
      });
      if (childActionIds.length === 0) return false;
      return childActionIds.every(id => permanentlyLoggedActionIds.has(id));
    };
  
    const isUpskillObjectiveComplete = (objective: ExerciseDefinition): boolean => {
      const visited = new Set<string>();
      const visualizationIds = new Set<string>();
      const queue: string[] = [objective.id];

      while (queue.length > 0) {
          const currentId = queue.shift()!;
          if (visited.has(currentId)) continue;
          visited.add(currentId);
          const node = upskillDefinitions.find(d => d.id === currentId);
          if (!node) continue;
          const isParent = (node.linkedUpskillIds?.length ?? 0) > 0 || (node.linkedResourceIds?.length ?? 0) > 0;
          if (!isParent) {
              visualizationIds.add(node.id);
          } else {
              (node.linkedUpskillIds || []).forEach(childId => {
                  if (!visited.has(childId)) queue.push(childId);
              });
          }
      }
      if (visualizationIds.size === 0) return false;
      return Array.from(visualizationIds).every(vizId => permanentlyLoggedVisualizationIds.has(vizId));
    };
    
    const learningTasks = (intention.linkedUpskillIds || []).map(id => {
      const def = upskillDefinitions.find(d => d.id === id);
      return def ? { ...def, isCompleted: isUpskillObjectiveComplete(def) } : null;
    }).filter(Boolean) as (ExerciseDefinition & { isCompleted: boolean })[];

    const workTasks = (intention.linkedDeepWorkIds || []).map(id => {
      const def = deepWorkDefinitions.find(d => d.id === id);
      return def ? { ...def, isCompleted: isDeepWorkObjectiveComplete(def) } : null;
    }).filter(Boolean) as (ExerciseDefinition & { isCompleted: boolean })[];

    const allLinkedTasks = [...learningTasks, ...workTasks];
    const totalLinkedEstimatedMinutes = allLinkedTasks.reduce((sum, task) => sum + (task.estimatedDuration || 0), 0);
    const totalLinkedEstimatedHours = totalLinkedEstimatedMinutes / 60;
    
    // --- New Progress Calculation ---
    // Sum the estimated duration of *completed* sub-tasks.
    // This represents the "value" of the work completed.
    const completedObjectiveHours = allLinkedTasks
      .filter(task => task.isCompleted)
      .reduce((sum, task) => sum + (task.estimatedDuration || 0), 0) / 60;

    const progress = totalLinkedEstimatedHours > 0 ? (completedObjectiveHours / totalLinkedEstimatedHours) * 100 : 0;
    
    const remainingHours = Math.max(0, totalLinkedEstimatedHours - completedObjectiveHours);
    const daysLeft = (productivityStats.avgProductiveHours > 0 && remainingHours > 0)
        ? Math.ceil(remainingHours / productivityStats.avgProductiveHours)
        : null;
    const estDate = daysLeft !== null ? format(addDays(new Date(), daysLeft), 'MMM d, yyyy') : null;

    return {
        linkedLearningTasks: learningTasks,
        linkedWorkTasks: workTasks,
        totalEstimatedHours: (intention.estimatedDuration || 0) / 60,
        totalLoggedHours: completedObjectiveHours,
        progressPercent: progress,
        projectedDate: estDate,
        daysRemaining: daysLeft,
    };
  }, [intention, upskillDefinitions, deepWorkDefinitions, allUpskillLogs, allDeepWorkLogs, productivityStats.avgProductiveHours, permanentlyLoggedActionIds, permanentlyLoggedVisualizationIds]);

  if (!intention) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Conceptual Flow: {intention.name}</DialogTitle>
          <DialogDescription>
            This diagram illustrates the strategic path from your current state to your desired outcome.
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
                    <foreignObject x="5%" y="87%" width="90%" height="24px">
                        <Progress value={progressPercent} className="h-2" />
                    </foreignObject>
                    
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
                
                <div className="absolute left-1/2 top-[10%] -translate-x-1/2 -translate-y-full text-center w-full px-4">
                    <p className="font-semibold text-foreground text-lg">Solution</p>
                     <div className="text-sm text-muted-foreground w-full max-w-sm mx-auto p-2 border rounded-md bg-background/50 backdrop-blur-sm mt-2">
                        <ScrollArea className="max-h-32">
                          <ul className="text-xs list-disc list-inside space-y-1 text-left">
                              {[...linkedWorkTasks, ...linkedLearningTasks].sort((a,b) => a.name.localeCompare(b.name)).map(task => (
                                  <li key={task.id} className={cn("truncate", task.isCompleted && "line-through text-muted-foreground/60")} title={task.name}>
                                      {task.name}
                                  </li>
                              ))}
                          </ul>
                        </ScrollArea>
                    </div>
                </div>

                <div className="absolute right-[5%] bottom-[10%] translate-x-1/2 translate-y-[150%] text-center">
                     <p className="font-semibold text-foreground">Outcome</p>
                     <div className="text-xs text-muted-foreground mt-1">
                        {projectedDate ? (
                            <>
                                <p>{projectedDate}</p>
                                <p>({daysRemaining} days remaining)</p>
                            </>
                        ) : (
                            <p>To be defined</p>
                        )}
                     </div>
                </div>

                <div className="absolute left-1/2 bottom-[10%] -translate-x-1/2 translate-y-[120%] text-center w-full px-4">
                     <p className="font-semibold text-foreground text-lg">Intention</p>
                     <p className="text-sm text-muted-foreground truncate" title={intention.name}>
                        {intention.name}
                     </p>
                     <p className="text-xs font-mono text-primary/80">
                        Total Est: {totalEstimatedHours.toFixed(1)}h
                      </p>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
