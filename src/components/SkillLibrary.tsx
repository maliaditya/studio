
"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Blocks, Sprout, PlusCircle, Lightbulb, Flag, Bolt, Focus, BookCopy, Flashlight, Frame, Activity, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SkillDomain, CoreSkill, SkillArea, MicroSkill, ExerciseDefinition } from '@/types/workout';
import { AnimatePresence, motion } from 'framer-motion';

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
  const [selectedDomain, setSelectedDomain] = useState<SkillDomain | null>(null);
  const [selectedCoreSkill, setSelectedCoreSkill] = useState<CoreSkill | null>(null);
  const [selectedSkillArea, setSelectedSkillArea] = useState<SkillArea | null>(null);
  const [historyStack, setHistoryStack] = useState<any[]>([]);

  const handleDomainSelect = (domainId: string) => {
    const domain = skillDomains.find(d => d.id === domainId);
    if (domain) {
      setSelectedDomain(domain);
      setHistoryStack([null]);
    }
  };

  const handleCoreSkillClick = (coreSkill: CoreSkill) => {
    setSelectedCoreSkill(coreSkill);
    setHistoryStack(prev => [...prev, selectedDomain]);
  };
  
  const handleSkillAreaClick = (skillArea: SkillArea) => {
    setSelectedSkillArea(skillArea);
    setHistoryStack(prev => [...prev, selectedCoreSkill]);
  };
  
  const handleBack = () => {
    const previousState = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, -1));

    if (selectedSkillArea) {
      setSelectedSkillArea(null);
    } else if (selectedCoreSkill) {
      setSelectedCoreSkill(null);
    } else if (selectedDomain) {
      setSelectedDomain(null);
    }
  };

  const linkedDeepWorkChildIds = React.useMemo(() => new Set<string>((definitions || []).flatMap(def => def.linkedDeepWorkIds || [])), [definitions]);
  const linkedUpskillChildIds = React.useMemo(() => new Set<string>((definitions || []).flatMap(def => def.linkedUpskillIds || [])), [definitions]);

  const getDeepWorkIcon = (def: ExerciseDefinition) => {
    const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
    const isChild = linkedDeepWorkChildIds.has(def.id);
    if (isParent && !isChild) return <Lightbulb className="h-4 w-4 text-amber-500" />;
    if (isParent && isChild) return <Flag className="h-4 w-4 text-green-500" />;
    if (!isParent && isChild) return <Bolt className="h-4 w-4 text-blue-500" />;
    return <Focus className="h-4 w-4 text-purple-500" />;
  };

  const getUpskillIcon = (def: ExerciseDefinition) => {
    const isParent = (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
    const isChild = linkedUpskillChildIds.has(def.id);
    if (isParent && !isChild) return <Flashlight className="h-4 w-4 text-amber-500" />;
    if (isParent && isChild) return <Flag className="h-4 w-4 text-green-500" />;
    if (!isParent && isChild) return <Frame className="h-4 w-4 text-blue-500" />;
    return <Focus className="h-4 w-4 text-purple-500" />;
  };
  
  const renderHeader = () => {
    let title = "Skill Library";
    if (selectedDomain) title = selectedDomain.name;
    if (selectedCoreSkill) title = selectedCoreSkill.name;
    if (selectedSkillArea) title = selectedSkillArea.name;
    
    return (
        <div className="flex items-center gap-2">
            {historyStack.length > 0 && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleBack}><ArrowLeft className="h-4 w-4" /></Button>
            )}
            <CardTitle className="text-lg text-primary truncate" title={title}>{title}</CardTitle>
        </div>
    );
  };
  
  const renderContent = () => {
    if (!selectedDomain) {
      return (
        <div className="space-y-2">
          {skillDomains.map(domain => (
            <Button key={domain.id} variant="outline" className="w-full justify-start" onClick={() => handleDomainSelect(domain.id)}>
              {domain.name}
            </Button>
          ))}
        </div>
      );
    }
    
    if (!selectedCoreSkill) {
      const filteredCoreSkills = coreSkills.filter(cs => cs.domainId === selectedDomain.id && cs.skillAreas.length > 0);
      return (
        <div className="space-y-2">
          {filteredCoreSkills.map(cs => (
            <Button key={cs.id} variant="outline" className="w-full justify-start" onClick={() => handleCoreSkillClick(cs)}>
              {cs.type === 'Foundation' ? <Blocks className="mr-2 h-4 w-4" /> : cs.type === 'Professionalism' ? <Sprout className="mr-2 h-4 w-4" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
              {cs.name}
            </Button>
          ))}
        </div>
      );
    }

    if (!selectedSkillArea) {
      return (
        <div className="space-y-2">
          {selectedCoreSkill.skillAreas.map(sa => (
            <Button key={sa.id} variant="outline" className="w-full justify-start" onClick={() => handleSkillAreaClick(sa)}>
              {sa.name}
            </Button>
          ))}
        </div>
      );
    }
    
    return (
        <div className="space-y-2">
            {selectedSkillArea.microSkills.map(ms => {
                 const tasks = definitions.filter(def => def.category === ms.name);
                 return (
                    <Accordion key={ms.id} type="single" collapsible>
                        <AccordionItem value={ms.id}>
                            <div className="flex items-center group">
                                <AccordionTrigger
                                    className={cn(
                                        "text-sm font-semibold hover:no-underline py-2 flex-grow",
                                        selectedMicroSkill?.id === ms.id && "text-primary"
                                    )}
                                    onClick={() => onSelectMicroSkill(ms)}
                                >
                                    {ms.name}
                                </AccordionTrigger>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={onOpenNewFocusArea}>
                                    <PlusCircle className="h-4 w-4 text-green-500" />
                                </Button>
                            </div>
                            <AccordionContent className="pl-4 space-y-1">
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
        </div>
    );
  };


  return (
    <Card>
        <CardHeader>
           {renderHeader()}
        </CardHeader>
        <CardContent>
           <AnimatePresence mode="wait">
             <motion.div
               key={selectedSkillArea?.id || selectedCoreSkill?.id || selectedDomain?.id || 'root'}
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 20 }}
               transition={{ duration: 0.2 }}
             >
                <ScrollArea className="h-[calc(100vh-25rem)] pr-2">
                   {renderContent()}
                </ScrollArea>
             </motion.div>
           </AnimatePresence>
        </CardContent>
    </Card>
  );
}

