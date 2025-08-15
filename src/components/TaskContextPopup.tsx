
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
import { formatDistanceStrict } from 'date-fns';

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
        openTaskContextPopup,
        closeTaskContextPopup,
    } = useAuth();
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `task-context-popup-${popupState.taskId}`,
    });

    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        willChange: 'transform',
        zIndex: 101 + popupState.level,
    };
    
    const taskInfo = useMemo(() => {
        const { taskId } = popupState;
        if (!taskId) return null;
        
        const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
        const task = allDefs.find(d => d.id === taskId || d.id.startsWith(taskId.substring(0, 10)));
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

    }, [popupState.taskId, deepWorkDefinitions, upskillDefinitions, projects, coreSkills, skillDomains, microSkillMap]);

    const attentionSpanInfo = useMemo(() => {
        let activity: Activity | undefined;
        
        // Find the activity associated with the task in the schedule
        for (const dateKey in schedule) {
            for (const slotName in schedule[dateKey]) {
                const activities = schedule[dateKey][slotName] as Activity[];
                if (Array.isArray(activities)) {
                    const foundActivity = activities.find(act => (act.taskIds || []).some(tid => tid.startsWith(taskInfo?.task.id.substring(0,10) || '')));
                    if (foundActivity) {
                        activity = foundActivity;
                        break;
                    }
                }
            }
            if (activity) break;
        }

        if (!activity || !activity.focusSessionStartTime || !activity.focusSessionEndTime) {
            return null;
        }

        const elapsedMs = activity.focusSessionEndTime - activity.focusSessionStartTime;
        const elapsed = formatDistanceStrict(new Date(0), new Date(elapsedMs), { unit: 'minute' });
        
        return {
            elapsed,
            pauses: activity.focusSessionPauses || 0
        };
    }, [schedule, taskInfo]);

    const handleOpenParentContext = (e: React.MouseEvent) => {
        if (!taskInfo?.parent) return;
        openTaskContextPopup(taskInfo.parent.id, undefined, popupState);
    };

    const getCoreSkillIcon = (type?: string) => {
      switch(type) {
        case 'Foundation': return <Blocks className="h-4 w-4" />;
        case 'Specialization': return <BrainCircuit className="h-4 w-4" />;
        case 'Professionalism': return <Sprout className="h-4 w-4" />;
        default: return null;
      }
    };
    
    if (!taskInfo) return null;
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
                                    <Button variant="link" className="p-0 h-auto font-medium truncate" onClick={handleOpenParentContext}>
                                        {parent.name}
                                    </Button>
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
                                    <p className="text-xs text-muted-foreground">Total Time</p>
                                    <p className="text-xl font-bold">{attentionSpanInfo.elapsed}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Pauses</p>
                                    <p className="text-xl font-bold">{attentionSpanInfo.pauses}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">No completed focus session data for this task yet.</p>
                        )}
                    </CardContent>
                    <div className="absolute top-2 right-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={(e) => { e.stopPropagation(); onClose(); }}><X className="h-4 w-4" /></Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
