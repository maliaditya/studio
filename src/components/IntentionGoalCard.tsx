
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Workflow, GitMerge, TrendingUp, Calendar, Clock, Lightbulb } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import type { ExerciseDefinition, DatedWorkout } from '@/types/workout';

interface IntentionGoalCardProps {
    intention: ExerciseDefinition;
    onMindMapClick: () => void;
    onDiagramClick: () => void;
}

const calculateProductiveHours = (allUpskillLogs: DatedWorkout[], allDeepWorkLogs: DatedWorkout[]) => {
    const dailyDurations: Record<string, number> = {};
    const processLogs = (logs: DatedWorkout[], durationField: 'reps' | 'weight') => {
        if (!logs) return;
        logs.forEach(log => {
            const duration = log.exercises.reduce((total, ex) => total + ex.loggedSets.reduce((sum, set) => sum + (set[durationField] || 0), 0), 0);
            if (duration > 0) {
                dailyDurations[log.date] = (dailyDurations[log.date] || 0) + duration;
            }
        });
    };
    processLogs(allUpskillLogs, 'reps');
    processLogs(allDeepWorkLogs, 'weight');

    const daysWithActivity = Object.keys(dailyDurations).length;
    if (daysWithActivity === 0) return 1; // Default to 1 hour to avoid division by zero if no logs exist
    const totalDuration = Object.values(dailyDurations).reduce((sum, d) => sum + d, 0);
    const avgMinutesPerDay = totalDuration / daysWithActivity;
    return avgMinutesPerDay > 0 ? avgMinutesPerDay / 60 : 1;
};

export function IntentionGoalCard({ intention, onMindMapClick, onDiagramClick }: IntentionGoalCardProps) {
    const { deepWorkDefinitions, upskillDefinitions, allDeepWorkLogs, allUpskillLogs } = useAuth();
    
    const avgDailyProductiveHours = useMemo(() => 
        calculateProductiveHours(allUpskillLogs, allDeepWorkLogs), 
    [allUpskillLogs, allDeepWorkLogs]);

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

    const projectStats = useMemo(() => {
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
        
        const linkedDeepWork = (intention.linkedDeepWorkIds || []).map(id => deepWorkDefinitions.find(d => d.id === id)).filter(Boolean) as ExerciseDefinition[];
        const linkedUpskill = (intention.linkedUpskillIds || []).map(id => upskillDefinitions.find(d => d.id === id)).filter(Boolean) as ExerciseDefinition[];
        
        const allLinkedTasks = [...linkedDeepWork, ...linkedUpskill];

        let completedHours = 0;
        let totalEstimatedHours = 0;

        allLinkedTasks.forEach(task => {
            totalEstimatedHours += (task.estimatedDuration || 0) / 60;

            const isCompleted = deepWorkDefinitions.some(d => d.id === task.id) 
                ? isDeepWorkObjectiveComplete(task)
                : isUpskillObjectiveComplete(task);
            
            if (isCompleted) {
                completedHours += (task.estimatedDuration || 0) / 60;
            }
        });
        
        // This is the actual logged time, used only for projection, not for the progress bar.
        let actualLoggedHours = 0;
        allDeepWorkLogs.forEach(log => {
            log.exercises.forEach(ex => {
                if (intention.linkedDeepWorkIds?.includes(ex.definitionId)) {
                    actualLoggedHours += ex.loggedSets.reduce((sum, set) => sum + set.weight, 0) / 60;
                }
            });
        });
         allUpskillLogs.forEach(log => {
            log.exercises.forEach(ex => {
                if (intention.linkedUpskillIds?.includes(ex.definitionId)) {
                    actualLoggedHours += ex.loggedSets.reduce((sum, set) => sum + set.reps, 0) / 60;
                }
            });
        });


        const remainingHours = Math.max(0, totalEstimatedHours - actualLoggedHours);
        const daysRemaining = avgDailyProductiveHours > 0 ? Math.ceil(remainingHours / avgDailyProductiveHours) : null;
        const projectedDate = daysRemaining !== null ? format(addDays(new Date(), daysRemaining), 'MMM d, yyyy') : null;

        return {
            loggedHours: completedHours, // Use completed hours for progress display
            estimatedHours: totalEstimatedHours,
            progressPercent: totalEstimatedHours > 0 ? (completedHours / totalEstimatedHours) * 100 : 0,
            daysRemaining,
            projectedDate,
        };
    }, [intention, deepWorkDefinitions, upskillDefinitions, allDeepWorkLogs, allUpskillLogs, avgDailyProductiveHours, permanentlyLoggedActionIds, permanentlyLoggedVisualizationIds]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Lightbulb className="h-5 w-5 text-primary flex-shrink-0" />
                            <span className="truncate" title={intention.name}>{intention.name}</span>
                        </CardTitle>
                        <CardDescription className="text-xs">{intention.category}</CardDescription>
                    </div>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 flex-shrink-0" onClick={onDiagramClick}>
                            <Workflow className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 flex-shrink-0" onClick={onMindMapClick}>
                            <GitMerge className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                {projectStats.estimatedHours > 0 ? (
                    <>
                        <div>
                            <Progress value={projectStats.progressPercent} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>{projectStats.loggedHours.toFixed(1)}h logged</span>
                                <span>{projectStats.estimatedHours.toFixed(1)}h est.</span>
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                <span>Avg. Productive Time: <strong>{avgDailyProductiveHours.toFixed(1)}h/day</strong></span>
                            </div>
                            {projectStats.projectedDate && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>Est. Completion: <strong>{projectStats.projectedDate}</strong></span>
                                </div>
                            )}
                             {projectStats.daysRemaining !== null && (
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>Days Remaining: <strong>{projectStats.daysRemaining}</strong></span>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="text-center text-sm text-muted-foreground py-4">
                        Set estimated hours on linked tasks to see progress and projections.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

