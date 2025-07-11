

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
import { BookCopy, Link as LinkIcon, Briefcase, ExternalLink, Globe, Workflow, Clock, Lightbulb, TrendingUp } from 'lucide-react';
import type { ExerciseDefinition, Resource, DatedWorkout, DailySchedule } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, parseISO, addDays, isBefore, startOfToday, isAfter } from 'date-fns';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { BrainCircuit, ArrowUp, ArrowDown, PauseCircle, AlertTriangle, CheckSquare, Zap } from 'lucide-react';
import { Separator } from './ui/separator';

interface IntentionDetailModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  intention: ExerciseDefinition | null;
  avgDailyProductiveHours?: number;
}

const getProductivitySuggestion = (hours: number): { title: string; description: string } => {
    if (hours >= 8) {
        return {
            title: "Apex Zone: Monitor for Burnout",
            description: "Your output is exceptional. Ensure this pace is sustainable. Prioritize rest and recovery to maintain this high level of performance without compromising your well-being."
        };
    }
    if (hours >= 4) {
        return {
            title: "High-Intensity Zone: Optimize & Sustain",
            description: "You're in a highly productive zone. Focus on maintaining this momentum with structured breaks. Your current pace is ideal for making significant progress on key objectives."
        };
    }
    if (hours >= 2) {
        return {
            title: "Stable Zone: Build Consistency",
            description: "You have a solid, consistent work habit. Focus on maintaining this routine daily. This is the foundation from which you can build towards more intensive work sprints when needed."
        };
    }
    return {
        title: "The Truth of the Moment",
        description: "Fulfillment doesn't come from chasing feelings or perfection. It comes from taking justified action, aligned with the truth of your current moment."
    };
};

const TUTORIAL_CONTENT = [
    {
      title: "Visualization to Action",
      icon: <BrainCircuit className="h-5 w-5" />,
      points: [
        "Breathe in, out — 5 times",
        "Activate PFC",
        "Visualize task: no judgment, no labels",
        "Say: “See clearly, not judge quickly”",
        "Visualize effort, form, breath",
        "Ask: “Can I do 1 rep, 1 line with control?”",
        "Act: Full focus, match visualization",
        "You’re the observer, not the doer",
        "Start"
      ]
    },
    {
      title: "Mental Checkpoint",
      icon: <CheckSquare className="h-5 w-5" />,
      points: [
        "Spot it: “What image just flashed before action?”",
        "Label it: [[Judgmental]]? [[Mastery]]? [[Shame]]? [[Ego]]? Wish or reality?",
        "Question it: “Is this true?” “Is it helping?” “Am I rushing?” “Will this keep tomorrow intact — and bring fulfillment now?”",
        "Replace it: Visualize from grounded self",
        "Detach: You are not your body",
        "Don’t chase completion. Chase comprehension. *Finishing isn’t winning if nothing sticks.*"
      ]
    },
    {
      title: "Devotion Mode",
      icon: <Zap className="h-5 w-5" />,
      points: [
        "Every sub-action is deliberate",
        "No time wasted",
        "Fully in the task — not above, not beside",
        "No judgment, no past/future",
        "Just you — merged with the motion",
        "No gap between intent and action",
        "No ego, no inner audience"
      ]
    }
];

export function IntentionDetailModal({ isOpen, onOpenChange, intention, avgDailyProductiveHours = 1 }: IntentionDetailModalProps) {
  const { deepWorkDefinitions, upskillDefinitions, allDeepWorkLogs, allUpskillLogs, schedule } = useAuth();
  
  const { solutionTasks, outcomeObjectives, totalEstimatedMinutes } = useMemo(() => {
    if (!intention) return { solutionTasks: [], outcomeObjectives: [], totalEstimatedMinutes: 0 };

    const today = startOfToday();
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
            const isTodayOrPast = isBefore(scheduleDate, addDays(today, 1));

            Object.values(dailySchedule).flat().forEach(activity => {
                if (activity && !activity.completed && isTodayOrPast) {
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

    const allScheduledOrPendingDefs = allDefs.filter(def => scheduledOrPendingDefIds.has(def.id));
    
    const solutionTasks: { action: ExerciseDefinition, linkedVisualizations: ExerciseDefinition[] }[] = [];
    const outcomeObjectiveIds = new Set<string>();
    let estimatedMinutes = 0;

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
  const suggestion = getProductivitySuggestion(avgDailyProductiveHours);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-2">
        <DialogHeader className="p-4">
          <DialogTitle>Conceptual Flow: {intention.name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="flex-grow min-h-0 flex flex-col items-center justify-between p-6">
                <div className="relative w-full h-[300px] max-w-3xl mb-12">
                    <svg className="absolute top-0 left-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                        <defs>
                            <marker id="arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
                            </marker>
                        </defs>
                        <line x1="5%" y1="90%" x2="50%" y2="20%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                        <line x1="50%" y1="20%" x2="95%" y2="90%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                    </svg>

                     <div className="absolute left-[5%] top-[90%] -translate-x-1/2 translate-y-4 text-center">
                        <p className="font-semibold text-foreground">Current state</p>
                        <p className="text-xs text-muted-foreground">Productivity: <strong>{avgDailyProductiveHours.toFixed(1)}h/day</strong></p>
                    </div>
                    
                    <div className="absolute left-1/2 top-[20%] -translate-x-1/2 -translate-y-full text-center w-full px-4">
                        <p className="font-semibold text-foreground text-lg">Solution</p>
                        <div className="text-sm text-muted-foreground w-full max-w-sm mx-auto p-2 border rounded-md bg-background/50 backdrop-blur-sm mt-2">
                            <ScrollArea className="h-32">
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

                    <div className="absolute right-[5%] top-[90%] translate-x-1/2 translate-y-4 text-center">
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

                    <div className="absolute left-1/2 top-[90%] -translate-x-1/2 translate-y-4 text-center w-full px-4">
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

                <div className="w-full text-center mt-auto">
                    <Separator className="my-12" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {TUTORIAL_CONTENT.map((card, index) => (
                            <Card key={index} className="text-left bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        {card.icon}
                                        {card.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        {card.points.map((point, pointIndex) => (
                                            <li key={pointIndex} dangerouslySetInnerHTML={{ __html: point.replace(/<br>/g, '') }} />
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <Separator className="my-8" />
                    <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                    <p className="text-xs text-muted-foreground max-w-xl mx-auto">{suggestion.description}</p>
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
