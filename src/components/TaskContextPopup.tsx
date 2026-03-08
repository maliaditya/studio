

"use client";

import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GitBranch, Briefcase, BrainCircuit, Blocks, Sprout, GripVertical, Clock, Plus, Minus, Timer } from 'lucide-react';
import type { ExerciseDefinition, CoreSkill, SkillArea, Project, SkillDomain, TaskContextPopupState, Activity, FullSchedule, PauseEvent } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { useDraggable } from '@dnd-kit/core';
import { format, formatDistanceStrict } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';

interface TaskContextPopupProps {
    popupState: TaskContextPopupState;
}

export function TaskContextPopup({ popupState }: TaskContextPopupProps) {
    const { 
        deepWorkDefinitions, 
        upskillDefinitions, 
        projects, 
        coreSkills, 
        skillDomains,
        microSkillMap,
        schedule,
        activeFocusSession,
        closeTaskContextPopup,
    } = useAuth();
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `task-context-popup-${popupState.activityId}`,
    });

    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        willChange: 'transform',
        zIndex: 101 + (popupState.level || 0),
    };
    
    const activityInfo = useMemo(() => {
        if (!popupState.activityId) return null;
        for (const dateKey in schedule) {
            for (const slotName in schedule[dateKey]) {
                const activities = schedule[dateKey][slotName] as Activity[];
                if (Array.isArray(activities)) {
                    const foundActivity = activities.find(act => act.id === popupState.activityId);
                    if (foundActivity) return foundActivity;
                }
            }
        }
        return null;
    }, [popupState.activityId, schedule]);

    const taskInfo = useMemo(() => {
        if (!activityInfo?.taskIds?.[0]) return null;
        
        const taskId = activityInfo.taskIds[0];
        const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
        const task = allDefs.find(d => taskId.startsWith(d.id));

        if (!task) return null;

        const parent = allDefs.find(p => 
            (p.linkedDeepWorkIds?.includes(task.id)) || 
            (p.linkedUpskillIds?.includes(task.id))
        );
        
        const linkedProjectId =
            parent?.primaryProjectId ||
            (parent?.linkedProjectIds && parent.linkedProjectIds.length > 0 ? parent.linkedProjectIds[0] : null);
        const linkedProject = linkedProjectId
            ? projects.find(p => p.id === linkedProjectId) 
            : null;

        const microSkillId = Array.from(microSkillMap.entries()).find(([, v]) => v.microSkillName === task.category)?.[0];
        const microSkillInfo = microSkillId ? microSkillMap.get(microSkillId) : null;
        
        let domain: SkillDomain | undefined;
        let coreSkill: CoreSkill | undefined;
        let skillArea: SkillArea | undefined;

        if (microSkillInfo) {
            coreSkill = coreSkills.find(cs => cs.name === microSkillInfo.coreSkillName);
            if (coreSkill) {
                domain = skillDomains.find(d => d.id === coreSkill!.domainId);
                skillArea = coreSkill.skillAreas.find(sa => sa.microSkills.some(ms => ms.id === microSkillId));
            }
        }
        
        return {
            task,
            parent,
            project: linkedProject,
            domain,
            coreSkill,
            skillArea,
        };

    }, [activityInfo, deepWorkDefinitions, upskillDefinitions, projects, coreSkills, skillDomains, microSkillMap]);

    const attentionSpanInfo = useMemo(() => {
        const activityForSpan = activeFocusSession?.activity?.id === activityInfo?.id ? activeFocusSession.activity : activityInfo;
        
        if (!activityForSpan || !activityForSpan.focusSessionInitialStartTime) {
            return null;
        }

        const { focusSessionInitialStartTime, focusSessionEndTime, focusSessionInitialDuration } = activityForSpan;
        const focusSessionPauses = Array.isArray(activityForSpan.focusSessionPauses) ? activityForSpan.focusSessionPauses : [];

        if (focusSessionEndTime) {
            const totalSessionMs = focusSessionEndTime - focusSessionInitialStartTime;
            
            const pauseDurationsMs: number[] = [];
            (focusSessionPauses || []).forEach(p => {
                if (p.resumeTime) {
                    pauseDurationsMs.push(p.resumeTime - p.pauseTime);
                }
            });
            const totalPauseTimeMs = pauseDurationsMs.reduce((sum, p) => sum + p, 0);

            const workIntervalsMs: number[] = [];
            let lastStartTime = focusSessionInitialStartTime;

            focusSessionPauses.forEach(p => {
                workIntervalsMs.push(p.pauseTime - lastStartTime);
                if (p.resumeTime) {
                    lastStartTime = p.resumeTime;
                }
            });
            
            const lastEventTime = focusSessionPauses.length > 0 && focusSessionPauses[focusSessionPauses.length-1].resumeTime 
                ? focusSessionPauses[focusSessionPauses.length-1].resumeTime! 
                : focusSessionInitialStartTime;

            workIntervalsMs.push(focusSessionEndTime - lastEventTime);

            const validIntervalsMs = workIntervalsMs.filter(i => i > 1000); // Ignore intervals less than a second
            const totalWorkTimeMs = validIntervalsMs.reduce((sum, i) => sum + i, 0);

            const attentionSpanMs = validIntervalsMs.length > 0 ? Math.max(...validIntervalsMs) : 0;
            const avgSpanMs = validIntervalsMs.length > 0 ? totalWorkTimeMs / validIntervalsMs.length : 0;
            
            const totalDurationMinutes = Math.ceil(totalSessionMs / 60000);
            const extendedTime = focusSessionInitialDuration ? totalDurationMinutes - focusSessionInitialDuration : 0;
            
            return {
                title: "Session Completed",
                sessionCompleted: formatDistanceStrict(new Date(0), new Date(totalSessionMs)),
                attentionSpan: formatDistanceStrict(new Date(0), new Date(attentionSpanMs)),
                avgSpan: formatDistanceStrict(new Date(0), new Date(avgSpanMs)),
                totalAttention: formatDistanceStrict(new Date(0), new Date(totalWorkTimeMs)),
                workIntervals: validIntervalsMs.map(ms => formatDistanceStrict(new Date(0), new Date(ms))),
                pauses: focusSessionPauses.length,
                extendedBy: extendedTime > 0 ? `${extendedTime} minutes` : null,
                totalBreakTime: formatDistanceStrict(new Date(0), new Date(totalPauseTimeMs)),
            };
        } else {
            // Live session data
             const now = Date.now();
             const totalSessionMs = now - focusSessionInitialStartTime;
             return {
                title: "Session In Progress",
                sessionCompleted: formatDistanceStrict(new Date(0), new Date(totalSessionMs)),
                attentionSpan: '-',
                avgSpan: '-',
                totalAttention: '-',
                workIntervals: [],
                pauses: focusSessionPauses.length,
                extendedBy: null,
                totalBreakTime: '-',
            };
        }
    }, [activityInfo, activeFocusSession]);

    const handleClose = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        closeTaskContextPopup(popupState.activityId);
    };

    const getCoreSkillIcon = (type?: string) => {
      switch(type) {
        case 'Foundation': return <Blocks className="h-4 w-4" />;
        case 'Specialization': return <BrainCircuit className="h-4 w-4" />;
        case 'Professionalism': return <Sprout className="h-4 w-4" />;
        default: return null;
      }
    };
    
    if (!taskInfo || !activityInfo) return null;
    const { task, parent, project, domain, coreSkill, skillArea } = taskInfo;

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className="w-[600px] shadow-2xl border-2 border-primary/30 bg-card grid grid-cols-3">
                <div className="col-span-2">
                    <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-primary"/>
                            Task Context
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                        <div className="p-3 rounded-lg bg-muted/50 border">
                            <p className="text-xs text-muted-foreground">Current Task</p>
                            <p className="font-bold text-base text-foreground">{task.name}</p>
                        </div>
                        <div className="space-y-2 text-sm">
                            {parent && (
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="flex-shrink-0">Parent</Badge>
                                    <p className="font-medium truncate">{parent.name}</p>
                                </div>
                            )}
                            {project && (
                                <div className="flex items-center gap-3">
                                <Badge variant="outline" className="flex-shrink-0">Project</Badge>
                                <p className="font-medium truncate">{project.name}</p>
                            </div>
                            )}
                        </div>

                        <Separator />
                        
                        <div className="space-y-2 text-sm">
                            <h4 className="font-semibold text-xs text-muted-foreground">Skill Hierarchy</h4>
                            {domain && <div className="flex items-center gap-2"><Badge variant="secondary" className="w-24 justify-center">Domain</Badge> <span>{domain.name}</span></div>}
                            {coreSkill && <div className="flex items-center gap-2"><Badge variant="secondary" className="w-24 justify-center">Core Skill</Badge> {getCoreSkillIcon(coreSkill.type)} <span>{coreSkill.name}</span></div>}
                            {skillArea && <div className="flex items-center gap-2"><Badge variant="secondary" className="w-24 justify-center">Skill Area</Badge> <span>{skillArea.name}</span></div>}
                            <div className="flex items-center gap-2"><Badge variant="secondary" className="w-24 justify-center">Micro-Skill</Badge> <span className="font-bold">{task.category}</span></div>
                        </div>
                    </CardContent>
                </div>
                <div className="col-span-1 border-l flex flex-col">
                    <CardHeader className="p-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="truncate">Attention</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex-grow flex flex-col justify-center text-center">
                        {attentionSpanInfo ? (
                            <div className="space-y-4 w-full">
                                <div>
                                    <p className="text-xs text-muted-foreground">{attentionSpanInfo.title}</p>
                                    <p className="text-2xl font-bold">{attentionSpanInfo.sessionCompleted}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-center">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Attention Span</p>
                                        <p className="text-lg font-bold">{attentionSpanInfo.attentionSpan}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Avg. Span</p>
                                        <p className="text-lg font-bold">{attentionSpanInfo.avgSpan}</p>
                                    </div>
                                     <div>
                                        <p className="text-xs text-muted-foreground">Pauses</p>
                                        <p className="text-lg font-bold">{attentionSpanInfo.pauses}</p>
                                    </div>
                                     <div>
                                        <p className="text-xs text-muted-foreground">Extended By</p>
                                        <p className="text-lg font-bold">{attentionSpanInfo.extendedBy || '-'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-muted-foreground">Total Break Time</p>
                                        <p className="text-lg font-bold">{attentionSpanInfo.totalBreakTime}</p>
                                    </div>
                                </div>
                                {attentionSpanInfo.workIntervals.length > 0 && (
                                    <div className="pt-2 border-t">
                                        <p className="text-xs font-semibold text-muted-foreground mb-1">Work Intervals ({attentionSpanInfo.totalAttention})</p>
                                        <ScrollArea className="h-20">
                                            <ul className="text-xs text-center space-y-1">
                                                {attentionSpanInfo.workIntervals.map((interval, i) => (
                                                    <li key={i}>{i+1}. {interval}</li>
                                                ))}
                                            </ul>
                                        </ScrollArea>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">No active or completed focus session data for this task.</p>
                        )}
                    </CardContent>
                    <div className="absolute top-2 right-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={handleClose}><X className="h-4 w-4" /></Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
