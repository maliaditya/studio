
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GripVertical, GitBranch, Briefcase, BrainCircuit, Blocks, Sprout } from 'lucide-react';
import type { ExerciseDefinition, CoreSkill, SkillArea, Project, TaskContextPopupState } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { useDraggable } from '@dnd-kit/core';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

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
    
    const { taskId, x, y } = popupState;

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `task-context-popup-${taskId}`,
    });

    const style: React.CSSProperties = {
        position: 'fixed',
        top: y,
        left: x,
        width: '26rem', // 416px
        zIndex: 75,
        willChange: 'transform',
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }

    const taskInfo = useMemo(() => {
        const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
        const task = allDefs.find(d => d.id === taskId);
        if (!task) return null;

        // Find parent Objective/Intention
        const parent = allDefs.find(p => 
            (p.linkedDeepWorkIds?.includes(taskId)) || 
            (p.linkedUpskillIds?.includes(taskId))
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

    }, [taskId, deepWorkDefinitions, upskillDefinitions, projects, coreSkills, skillDomains, microSkillMap]);

    const handleClose = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        onClose();
    };

    if (!taskInfo) return null;

    const { task, parent, project, domain, coreSkill, skillArea } = taskInfo;
    
    const getCoreSkillIcon = (type?: string) => {
      switch(type) {
        case 'Foundation': return <Blocks className="h-4 w-4" />;
        case 'Specialization': return <BrainCircuit className="h-4 w-4" />;
        case 'Professionalism': return <Sprout className="h-4 w-4" />;
        default: return null;
      }
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className="shadow-2xl border-2 border-primary/30 bg-card flex flex-col max-h-[80vh]">
                <CardHeader className="p-3 relative flex-shrink-0" {...listeners}>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base flex items-center gap-2 cursor-grab">
                            <GitBranch className="h-5 w-5 text-primary" />
                            Task Context
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={handleClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-full max-h-[calc(80vh-4rem)] p-4">
                        <div className="space-y-4">
                            <div className="p-3 rounded-lg bg-muted/50 border">
                                <p className="text-sm text-muted-foreground">Current Task</p>
                                <p className="font-bold text-lg text-foreground">{task.name}</p>
                            </div>

                            <div className="space-y-3">
                                {parent && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-px h-6 bg-border ml-3"></div>
                                        <Badge variant="outline" className="flex-shrink-0">Parent</Badge>
                                        <p className="text-sm font-medium">{parent.name}</p>
                                    </div>
                                )}
                                {project && (
                                     <div className="flex items-center gap-3">
                                        <div className="w-px h-6 bg-border ml-3"></div>
                                        <Badge variant="outline" className="flex-shrink-0">Project</Badge>
                                        <p className="text-sm font-medium">{project.name}</p>
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
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
