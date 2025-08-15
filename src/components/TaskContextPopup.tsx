
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GitBranch, Briefcase, BrainCircuit, Blocks, Sprout } from 'lucide-react';
import type { ExerciseDefinition, CoreSkill, SkillArea, Project, SkillDomain } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { useDraggable } from '@dnd-kit/core';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

interface TaskContextModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    taskId: string | null;
}

export function TaskContextModal({ isOpen, onOpenChange, taskId }: TaskContextModalProps) {
    const { 
        deepWorkDefinitions, 
        upskillDefinitions, 
        projects, 
        coreSkills, 
        skillDomains,
        microSkillMap
    } = useAuth();
    
    const taskInfo = useMemo(() => {
        if (!taskId) return null;
        
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
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5 text-primary" />
                        Task Context
                    </DialogTitle>
                    <DialogDescription>
                        The strategic hierarchy for your current focus task.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
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
            </DialogContent>
        </Dialog>
    );
}
