
"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Blocks, Sprout, PlusCircle, Lightbulb, Flag, Bolt, Focus, BookCopy, Flashlight, Frame, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SkillDomain, CoreSkill, SkillArea, MicroSkill, ExerciseDefinition } from '@/types/workout';

interface SkillLibraryProps {
  pageType: 'deepwork' | 'upskill';
  selectedMicroSkill: MicroSkill | null;
  onSelectMicroSkill: (skill: MicroSkill) => void;
  definitions: ExerciseDefinition[];
  onSelectFocusArea: (def: ExerciseDefinition) => void;
  onOpenNewFocusArea: () => void;
}

export function SkillLibrary({ 
    pageType, 
    selectedMicroSkill, 
    onSelectMicroSkill,
    definitions,
    onSelectFocusArea,
    onOpenNewFocusArea,
}: SkillLibraryProps) {
  const { skillDomains, coreSkills } = useAuth();
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);

  const linkedDeepWorkChildIds = React.useMemo(() => new Set<string>((definitions || []).flatMap(def => def.linkedDeepWorkIds || [])), [definitions]);
  const linkedUpskillChildIds = React.useMemo(() => new Set<string>((definitions || []).flatMap(def => def.linkedUpskillIds || [])), [definitions]);

  const getDeepWorkIcon = (def: ExerciseDefinition) => {
    const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
    const isChild = linkedDeepWorkChildIds.has(def.id);
    if (isParent && !isChild) return <Lightbulb className="h-4 w-4 text-amber-500" />; // Intention
    if (isParent && isChild) return <Flag className="h-4 w-4 text-green-500" />; // Objective
    if (!isParent && isChild) return <Bolt className="h-4 w-4 text-blue-500" />; // Action
    return <Focus className="h-4 w-4 text-purple-500" />; // Standalone
  };

  const getUpskillIcon = (def: ExerciseDefinition) => {
    const isParent = (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
    const isChild = linkedUpskillChildIds.has(def.id);
    if (isParent && !isChild) return <Flashlight className="h-4 w-4 text-amber-500" />; // Curiosity
    if (isParent && isChild) return <Flag className="h-4 w-4 text-green-500" />; // Objective
    if (!isParent && isChild) return <Frame className="h-4 w-4 text-blue-500" />; // Visualization
    return <Focus className="h-4 w-4 text-purple-500" />; // Standalone
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <BrainCircuit /> Skill Library
            </CardTitle>
        </CardHeader>
        <CardContent>
            <Select value={selectedDomainId || ''} onValueChange={setSelectedDomainId}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a Skill Domain..." />
                </SelectTrigger>
                <SelectContent>
                    {skillDomains.map(domain => (
                        <SelectItem key={domain.id} value={domain.id}>{domain.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {selectedDomainId && (
                <div className="mt-4 space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto">
                    <Accordion type="multiple" className="w-full">
                        {coreSkills
                            .filter(cs => cs.domainId === selectedDomainId && cs.skillAreas.length > 0)
                            .map(coreSkill => (
                                <AccordionItem value={coreSkill.id} key={coreSkill.id}>
                                    <AccordionTrigger className="text-sm font-semibold">
                                        <div className="flex items-center gap-2">
                                            {coreSkill.type === 'Foundation' ? <Blocks className="h-4 w-4" /> : coreSkill.type === 'Professionalism' ? <Sprout className="h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
                                            {coreSkill.name}
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <Accordion type="multiple" className="w-full">
                                            {coreSkill.skillAreas.map(skillArea => (
                                                <AccordionItem value={skillArea.id} key={skillArea.id}>
                                                    <AccordionTrigger className="text-sm font-semibold text-muted-foreground pl-2">{skillArea.name}</AccordionTrigger>
                                                    <AccordionContent className="pl-4 space-y-1">
                                                        {skillArea.microSkills.map(microSkill => {
                                                            const tasks = definitions.filter(def => def.category === microSkill.name);
                                                            return (
                                                                <Accordion key={microSkill.id} type="single" collapsible>
                                                                    <AccordionItem value={microSkill.id}>
                                                                        <AccordionTrigger className="text-sm font-semibold hover:no-underline py-2">
                                                                            <div
                                                                                onClick={(e) => { e.stopPropagation(); onSelectMicroSkill(microSkill); }}
                                                                                className={cn(
                                                                                    "w-full text-left p-1 rounded-md font-semibold text-foreground hover:bg-muted text-base",
                                                                                    selectedMicroSkill?.id === microSkill.id && "text-primary"
                                                                                )}
                                                                            >
                                                                                {microSkill.name}
                                                                            </div>
                                                                        </AccordionTrigger>
                                                                        <AccordionContent className="pl-4">
                                                                            {tasks.map(task => (
                                                                                <button key={task.id} onClick={() => onSelectFocusArea(task)} className="w-full text-left p-1 rounded-md text-sm text-muted-foreground hover:bg-muted flex items-center gap-2">
                                                                                    {pageType === 'deepwork' ? getDeepWorkIcon(task) : getUpskillIcon(task)}
                                                                                    <span>{task.name}</span>
                                                                                </button>
                                                                            ))}
                                                                        </AccordionContent>
                                                                    </AccordionItem>
                                                                </Accordion>
                                                            )
                                                        })}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                    </Accordion>
                </div>
            )}
        </CardContent>
    </Card>
  );
}

