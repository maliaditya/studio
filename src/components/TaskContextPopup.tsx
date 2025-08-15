
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GitBranch, Briefcase, BrainCircuit, Blocks, Sprout, GripVertical } from 'lucide-react';
import type { ExerciseDefinition, CoreSkill, SkillArea, Project, SkillDomain, TaskContextPopupState } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { useDraggable } from '@dnd-kit/core';

interface TaskContextPopupProps {
    popupState: TaskContextPopupState;
    onClose: () => void;
}

export function TaskContextPopup({ popupState, onClose }: TaskContextPopupProps) {
    const { 
        deepWorkDefinitions, 
        upskillDefinitions, 
        projects, 
        coreSkills, 
        skillDomains,
        microSkillMap
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
        zIndex: 101, // Above the focus timer
    };
    
    const taskInfo = useMemo(() => {
        const { taskId } = popupState;
        if (!taskId) return null;
        
        const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
        const task = allDefs.find(d => d.id === taskId || d.id === taskId.replace('def_upskill_', 'def_').replace('def_deep_', 'def_') || d.id.startsWith(taskId.substring(0, 10)));
        if (!task) return null;

        // Find parent Objective/Intention
        const parent = allDefs.find(p => 
            (p.linkedDeepWorkIds?.includes(task.id)) || 
            (p.linkedUpskillIds?.includes(task.id))
        );
        
        // Find linked project if parent is an intention
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
            <Card className="w-96 shadow-2xl border-2 border-primary/30 bg-card">
                <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-primary"/>
                          Task Context
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={onClose}><X className="h-4 w-4" /></Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-4">
                    <div className="p-3 rounded-lg bg-muted/50 border">
                        <p className="text-xs text-muted-foreground">Current Task</p>
                        <p className="font-bold text-base text-foreground">{task.name}</p>
                    </div>
                    <div className="space-y-3">
                        {parent && (
                            <div className="flex items-center gap-3 text-sm">
                                <Badge variant="outline" className="flex-shrink-0">Parent</Badge>
                                <p className="font-medium truncate">{parent.name}</p>
                            </div>
                        )}
                        {project && (
                            <div className="flex items-center gap-3 text-sm">
                                <Badge variant="outline" className="flex-shrink-0">Project</Badge>
                                <p className="font-medium truncate">{project.name}</p>
                            </div>
                        )}
                    </div>
                    <Separator />
                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Skill Hierarchy</h4>
                        {domain && <div className="text-sm flex items-center gap-2"><Badge variant="secondary" className="w-24 justify-center">Domain</Badge> <span>{domain.name}</span></div>}
                        {coreSkill && <div className="text-sm flex items-center gap-2"><Badge variant="secondary" className="w-24 justify-center">Core Skill</Badge> {getCoreSkillIcon(coreSkill.type)} <span>{coreSkill.name}</span></div>}
                        {skillArea && <div className="text-sm flex items-center gap-2"><Badge variant="secondary" className="w-24 justify-center">Skill Area</Badge> <span>{skillArea.name}</span></div>}
                        <div className="text-sm flex items-center gap-2"><Badge variant="secondary" className="w-24 justify-center">Micro-Skill</Badge> <span className="font-bold">{task.category}</span></div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

