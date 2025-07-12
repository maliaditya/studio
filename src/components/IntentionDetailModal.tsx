
"use client";

import React, { useMemo } from 'react';
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
import { BookCopy, Link as LinkIcon, Briefcase, ExternalLink, Globe, Workflow, Clock, Lightbulb, TrendingUp, ArrowDown, BrainCircuit, ArrowRight } from 'lucide-react';
import type { ExerciseDefinition, DatedWorkout, DailySchedule } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
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
            const isTodayOrPast = isBefore(scheduleDate, new Date());

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

  if (!intention) return null;
  const suggestion = getProductivitySuggestion(avgDailyProductiveHours);

  const solutionText = solutionTasks.length > 0 
    ? solutionTasks.map(st => st.action.name).join(', ')
    : "No solution tasks pending";

  const outcomeText = outcomeObjectives.length > 0 
    ? outcomeObjectives.map(obj => obj.name).join(', ')
    : "Not yet defined";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-2">
        <DialogHeader className="p-4 flex-shrink-0">
          <DialogTitle>Conceptual Flow: {intention.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow min-h-0">
            <ScrollArea className="h-full p-4">
                <div className="flex flex-col items-center gap-4 text-center">

                   <div className="w-full h-full flex items-center justify-center bg-muted/30 p-8 min-h-[500px]">
                      <div className="relative w-[800px] h-[450px]">
                        
                        {/* Nodes */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-center max-w-sm">
                          <div className="font-semibold text-lg">Solution</div>
                          <p className="text-sm text-muted-foreground truncate" title={solutionText}>{solutionText}</p>
                        </div>

                        <div className="absolute bottom-0 left-0 text-center max-w-sm">
                          <div className="font-semibold text-lg">Current State</div>
                           <p className="text-sm text-muted-foreground">Productivity: <strong>{avgDailyProductiveHours.toFixed(1)}h/day</strong></p>
                        </div>
                        
                        <div className="absolute bottom-0 right-0 text-center max-w-sm">
                          <div className="font-semibold text-lg">Outcome</div>
                          <p className="text-sm text-muted-foreground truncate" title={outcomeText}>{outcomeText}</p>
                        </div>

                        {/* Lines and Arrows */}
                        <svg className="absolute top-0 left-0 w-full h-full overflow-visible">
                          <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto" markerUnits="strokeWidth">
                              <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground))" />
                            </marker>
                          </defs>
                          {/* Base Line */}
                          <line x1="100" y1="430" x2="700" y2="430" stroke="hsl(var(--foreground))" strokeWidth="2" markerEnd="url(#arrowhead)" />
                          {/* Left Line */}
                          <line x1="80" y1="410" x2="390" y2="60" stroke="hsl(var(--foreground))" strokeWidth="2" markerEnd="url(#arrowhead)" />
                          {/* Right Line */}
                          <line x1="410" y1="60" x2="720" y2="410" stroke="hsl(var(--foreground))" strokeWidth="2" markerEnd="url(#arrowhead)" />
                        </svg>

                        {/* Labels on lines */}
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center max-w-xs">
                           <div className="text-sm text-muted-foreground truncate" title={intention.name}>{intention.name}</div>
                          <div className="font-semibold mt-1">Intention</div>
                        </div>
                      </div>
                    </div>


                    {/* FOOTER */}
                     <div className="w-full max-w-lg pt-8">
                        <Separator className="my-8" />
                        <h4 className="font-semibold text-lg flex items-center justify-center gap-2">
                            <BrainCircuit className="h-5 w-5 text-primary" />
                            {suggestion.title}
                        </h4>
                        <p className="text-sm text-muted-foreground max-w-xl mx-auto mt-2">{suggestion.description}</p>
                    </div>
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

