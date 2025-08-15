
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GitBranch, Briefcase, BrainCircuit, Blocks, Sprout, GripVertical, Clock } from 'lucide-react';
import type { ExerciseDefinition, CoreSkill, SkillArea, Project, SkillDomain, TaskContextPopupState, Activity, FullSchedule } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { useDraggable } from '@dnd-kit/core';
import { format, formatDistanceStrict } from 'date-fns';

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
        openTaskContextPopup,
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
        zIndex: 101 + popupState.level,
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
        
        const linkedProject = parent?.linkedProjectId 
            ? projects.find(p => p.id === parent.linkedProjectId) 
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
        
        if (!activityForSpan || !activityForSpan.focusSessionStartTime) {
            return null;
        }
        
        if (activityForSpan.focusSessionEndTime) {
             const elapsedMs = activityForSpan.focusSessionEndTime - activityForSpan.focusSessionStartTime;
             const elapsed = formatDistanceStrict(new Date(0), new Date(elapsedMs));
             return {
                title: "Attention Span",
                value: elapsed,
                pauses: activityForSpan.focusSessionPauses || 0
             };
        } else {
            return {
                title: "Session Started",
                value: format(activityForSpan.focusSessionStartTime, 'p'),
                pauses: activityForSpan.focusSessionPauses || 0
            }
        }
    }, [activityInfo, activeFocusSession]);


    const handleOpenParentContext = (e: React.MouseEvent) => {
        if (!taskInfo?.parent) return;
        
        // This is a simplification; we'd need to find the Activity associated with the parent task
        // For now, this functionality will be limited. A more robust implementation would
        // search for the parent's activity in the schedule.
        // openTaskContextPopup(taskInfo.parent.id, undefined, popupState);
    };
    
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
                    <CardContent className="p-4 pt-0 flex-grow flex flex-col items-center justify-center text-center">
                        {attentionSpanInfo ? (
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-muted-foreground">{attentionSpanInfo.title}</p>
                                    <p className="text-xl font-bold">{attentionSpanInfo.value}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Pauses</p>
                                    <p className="text-xl font-bold">{attentionSpanInfo.pauses}</p>
                                </div>
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
