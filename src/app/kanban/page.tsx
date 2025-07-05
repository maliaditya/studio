"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import { BookCopy, Briefcase, Share2, Calendar, Check, AlertTriangle } from 'lucide-react';
import type { DatedWorkout, ExerciseDefinition, ActivityType } from '@/types/workout';

// This is a new component for the Kanban page.
function KanbanPageContent() {
    const {
        schedule,
        allUpskillLogs,
        allDeepWorkLogs,
        brandingLogs,
        upskillDefinitions,
        deepWorkDefinitions,
    } = useAuth();

    const allTasks = useMemo(() => {
        const upskillTasks = upskillDefinitions.map(t => ({...t, taskType: 'upskill' as const}));
        // Ensure we differentiate focus areas from content bundles in the initial list
        const deepWorkTasks = deepWorkDefinitions.map(t => ({...t, taskType: (Array.isArray(t.focusAreaIds) ? 'branding' : 'deepwork') as 'branding' | 'deepwork'}));
        return [...upskillTasks, ...deepWorkTasks];
    }, [upskillDefinitions, deepWorkDefinitions]);

    const taskStatusMaps = useMemo(() => {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        
        // --- Maps definitionId to its status ---
        const scheduledTaskInfo = new Map<string, { slot: string; type: ActivityType }[]>();
        const loggedTaskInfo = new Map<string, { type: ActivityType; totalTime: number }>();
        const pendingTaskInfo = new Map<string, { oldestDate: string; type: ActivityType }>();
        const pastLoggedTaskInfo = new Map<string, { lastLogDate: string; type: ActivityType; }>();

        // --- Helper to get mapping from instance ID to definition ID for all tasks ---
        const instanceIdToDefIdMap = new Map<string, string>();
        [...allUpskillLogs, ...allDeepWorkLogs, ...brandingLogs].forEach(log => {
            (log.exercises || []).forEach(ex => instanceIdToDefIdMap.set(ex.id, ex.definitionId));
        });

        // --- Populate Scheduled for Today ---
        const todaysActivities = schedule[todayKey];
        if (todaysActivities) {
            Object.entries(todaysActivities).forEach(([slotName, activities]) => {
                (activities || []).forEach(activity => {
                    (activity.taskIds || []).forEach(instanceId => {
                        const defId = instanceIdToDefIdMap.get(instanceId);
                        if (!defId) return;

                        const addScheduledInfo = (definitionId: string, activityType: ActivityType) => {
                            if (!scheduledTaskInfo.has(definitionId)) scheduledTaskInfo.set(definitionId, []);
                            const entries = scheduledTaskInfo.get(definitionId)!;
                            if(!entries.some(e => e.type === activityType)) {
                                entries.push({ slot: slotName, type: activityType });
                            }
                        };
                        
                        // For branding, mark the constituent focus areas, not the bundle itself
                        if (activity.type === 'branding') {
                             const bundleDef = deepWorkDefinitions.find(d => d.id === defId);
                             if (bundleDef?.focusAreaIds) {
                                 bundleDef.focusAreaIds.forEach(focusAreaDefId => addScheduledInfo(focusAreaDefId, 'branding'));
                             }
                        } else {
                            addScheduledInfo(defId, activity.type);
                        }
                    });
                });
            });
        }
        
        // --- Populate Logged Today ---
        const processLogsForToday = (logs: DatedWorkout[], activityType: ActivityType, timeField: 'reps' | 'weight') => {
            const todayLog = logs.find(log => log.date === todayKey);
            if(todayLog) {
                todayLog.exercises.forEach(ex => {
                    const loggedTime = ex.loggedSets.reduce((sum, set) => sum + set[timeField], 0);
                    if (loggedTime > 0) {
                        if (activityType === 'branding') {
                            const bundleDef = deepWorkDefinitions.find(d => d.id === ex.definitionId);
                            if (bundleDef?.focusAreaIds) {
                                bundleDef.focusAreaIds.forEach(faId => loggedTaskInfo.set(faId, { type: 'branding', totalTime: 1}));
                            }
                        } else {
                            loggedTaskInfo.set(ex.definitionId, { type: activityType, totalTime: loggedTime });
                        }
                    }
                });
            }
        };
        processLogsForToday(allUpskillLogs, 'upskill', 'reps');
        processLogsForToday(allDeepWorkLogs, 'deepwork', 'weight');
        processLogsForToday(brandingLogs, 'branding', 'reps'); // 'reps' is just a placeholder here
        
        // --- Populate Pending from Past ---
        Object.keys(schedule).forEach(dateKey => {
            if (dateKey < todayKey) {
                Object.values(schedule[dateKey]).flat().forEach(activity => {
                    if (activity && !activity.completed && activity.taskIds) {
                        activity.taskIds.forEach(taskId => {
                            const defId = instanceIdToDefIdMap.get(taskId);
                            if(!defId) return;

                            const addPendingInfo = (definitionId: string, activityType: ActivityType) => {
                                const existing = pendingTaskInfo.get(definitionId);
                                if (!existing || dateKey < existing.oldestDate) {
                                    pendingTaskInfo.set(definitionId, { oldestDate: dateKey, type: activityType });
                                }
                            }

                             if (activity.type === 'branding') {
                                const bundleDef = deepWorkDefinitions.find(d => d.id === defId);
                                if (bundleDef?.focusAreaIds) {
                                    bundleDef.focusAreaIds.forEach(focusAreaDefId => addPendingInfo(focusAreaDefId, 'branding'));
                                }
                            } else {
                                addPendingInfo(defId, activity.type);
                            }
                        });
                    }
                });
            }
        });
        
        // --- Populate Completed in Past ---
        const processLogsForPast = (logs: DatedWorkout[], activityType: ActivityType) => {
            logs.forEach(log => {
                if (log.date < todayKey) {
                    log.exercises.forEach(ex => {
                        if (ex.loggedSets.length > 0) {
                            if (activityType === 'branding') {
                                const bundleDef = deepWorkDefinitions.find(d => d.id === ex.definitionId);
                                if (bundleDef?.focusAreaIds) {
                                    bundleDef.focusAreaIds.forEach(faId => {
                                        const existing = pastLoggedTaskInfo.get(faId);
                                        if (!existing || log.date > existing.lastLogDate) {
                                            pastLoggedTaskInfo.set(faId, { lastLogDate: log.date, type: 'branding' });
                                        }
                                    });
                                }
                            } else {
                                const existing = pastLoggedTaskInfo.get(ex.definitionId);
                                if (!existing || log.date > existing.lastLogDate) {
                                    pastLoggedTaskInfo.set(ex.definitionId, { lastLogDate: log.date, type: activityType });
                                }
                            }
                        }
                    });
                }
            });
        };
        processLogsForPast(allUpskillLogs, 'upskill');
        processLogsForPast(allDeepWorkLogs, 'deepwork');
        processLogsForPast(brandingLogs, 'branding');

        return { scheduledTaskInfo, loggedTaskInfo, pendingTaskInfo, pastLoggedTaskInfo };
    }, [schedule, allUpskillLogs, allDeepWorkLogs, brandingLogs, deepWorkDefinitions]);
    
    const { loggedToday, scheduledToday, pending, completedPast } = useMemo(() => {
        const { scheduledTaskInfo, loggedTaskInfo, pendingTaskInfo, pastLoggedTaskInfo } = taskStatusMaps;
        
        const logged: (ExerciseDefinition & { taskType: 'upskill' | 'deepwork' | 'branding' })[] = [];
        const scheduled: (ExerciseDefinition & { taskType: 'upskill' | 'deepwork' | 'branding' })[] = [];
        const pendingFromPast: (ExerciseDefinition & { taskType: 'upskill' | 'deepwork' | 'branding', daysPending: number })[] = [];
        const completed: (ExerciseDefinition & { taskType: 'upskill' | 'deepwork' | 'branding', lastLogDate: string })[] = [];

        const processedIds = new Set<string>();
        
        // We only want to show individual focus areas and learning tasks on the board
        const individualTasks = allTasks.filter(task => task.taskType !== 'branding' && !Array.isArray(task.focusAreaIds));

        individualTasks.forEach(task => {
            if (task.name === 'placeholder' || processedIds.has(task.id)) return;

            if (loggedTaskInfo.has(task.id)) {
                logged.push(task as any);
                processedIds.add(task.id);
            } else if (scheduledTaskInfo.has(task.id)) {
                scheduled.push(task as any);
                processedIds.add(task.id);
            } else if (pendingTaskInfo.has(task.id)) {
                const daysPending = differenceInDays(new Date(), parseISO(pendingTaskInfo.get(task.id)!.oldestDate));
                pendingFromPast.push({ ...task, daysPending } as any);
                processedIds.add(task.id);
            } else if (pastLoggedTaskInfo.has(task.id)) {
                completed.push({ ...task, lastLogDate: pastLoggedTaskInfo.get(task.id)!.lastLogDate } as any);
                processedIds.add(task.id);
            }
        });

        // Sort pending by most days pending
        pendingFromPast.sort((a,b) => b.daysPending - a.daysPending);
        // Sort completed by most recent
        completed.sort((a,b) => new Date(b.lastLogDate).getTime() - new Date(a.lastLogDate).getTime());

        return { loggedToday: logged, scheduledToday: scheduled, pending: pendingFromPast, completedPast: completed };
    }, [allTasks, taskStatusMaps]);

    const taskIcons: Record<'upskill' | 'deepwork' | 'branding', React.ReactNode> = {
        upskill: <BookCopy className="h-4 w-4 text-blue-500" />,
        deepwork: <Briefcase className="h-4 w-4 text-green-500" />,
        branding: <Share2 className="h-4 w-4 text-purple-500" />,
    };

    const KanbanColumn = ({ title, tasks, children }: { title: string, tasks?: any[], children?: (task: any) => React.ReactNode }) => (
        <div className="flex flex-col flex-shrink-0 w-80">
            <h2 className="text-lg font-semibold mb-4 px-2">{title} <Badge variant="secondary" className="ml-2">{tasks?.length || 0}</Badge></h2>
            <ScrollArea className="h-full">
                <div className="space-y-3 pr-4">
                    {tasks && tasks.map(task => (
                        <Card key={task.id} className="p-3 shadow-sm hover:shadow-md transition-shadow">
                           <div className="flex items-start gap-3">
                                {taskIcons[task.taskType]}
                                <div className="flex-grow min-w-0">
                                    <p className="font-medium text-sm leading-tight">{task.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{task.category}</p>
                                </div>
                           </div>
                           {children && children(task)}
                        </Card>
                    ))}
                    {(!tasks || tasks.length === 0) && (
                        <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-md">
                            <p className="text-sm text-muted-foreground">No tasks</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
    
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-[calc(100vh-4rem)] flex flex-col">
            <div className="text-center mb-8 flex-shrink-0">
                <h1 className="text-4xl font-bold tracking-tight text-primary">Task Board</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    A Kanban-style view of all your tasks based on their current status.
                </p>
            </div>
            <div className="flex-grow flex gap-6 overflow-x-auto pb-4 min-h-0">
                <KanbanColumn title="Pending from Past" tasks={pending}>
                    {(task: any) => (
                        <div className="mt-2 pt-2 border-t flex items-center justify-end text-xs text-orange-600">
                           <AlertTriangle className="h-3 w-3 mr-1"/>
                           {task.daysPending} {task.daysPending === 1 ? 'day' : 'days'} pending
                        </div>
                    )}
                </KanbanColumn>
                <KanbanColumn title="Scheduled for Today" tasks={scheduledToday}>
                     {(task: any) => (
                        <div className="mt-2 pt-2 border-t flex items-center justify-end text-xs text-yellow-600">
                           <Calendar className="h-3 w-3 mr-1"/>
                           Today
                        </div>
                    )}
                </KanbanColumn>
                <KanbanColumn title="Logged Today" tasks={loggedToday}>
                     {(task: any) => (
                        <div className="mt-2 pt-2 border-t flex items-center justify-end text-xs text-green-600">
                           <Check className="h-3 w-3 mr-1"/>
                           Logged Today
                        </div>
                    )}
                </KanbanColumn>
                 <KanbanColumn title="Completed" tasks={completedPast}>
                    {(task: any) => (
                        <div className="mt-2 pt-2 border-t flex items-center justify-end text-xs text-muted-foreground">
                            Last log: {format(parseISO(task.lastLogDate), 'MMM dd')}
                        </div>
                    )}
                </KanbanColumn>
            </div>
        </div>
    );
}

export default function KanbanPage() {
    return (
        <AuthGuard>
            <KanbanPageContent />
        </AuthGuard>
    );
}
