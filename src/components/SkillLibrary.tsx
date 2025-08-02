
"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Blocks, Sprout, PlusCircle, Lightbulb, Flag, Bolt, Focus, BookCopy, Flashlight, Frame, Activity, ArrowLeft, Briefcase, Building, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SkillDomain, CoreSkill, SkillArea, MicroSkill, ExerciseDefinition, Project, Feature } from '@/types/workout';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';


interface SkillLibraryProps {
  pageType: 'deepwork' | 'upskill';
  selectedMicroSkill: MicroSkill | null;
  onSelectMicroSkill: (skill: MicroSkill | null) => void;
  definitions: ExerciseDefinition[];
  onSelectFocusArea: (def: ExerciseDefinition | null) => void;
  onOpenNewFocusArea: () => void;
  selectedProject: Project | null;
  onSelectProject: (project: Project | null) => void;
}

export function SkillLibrary({ 
    pageType, 
    selectedMicroSkill, 
    onSelectMicroSkill,
    definitions,
    onSelectFocusArea,
    onOpenNewFocusArea,
    selectedProject,
    onSelectProject,
}: SkillLibraryProps) {
  const { skillDomains, coreSkills, projects } = useAuth();
  const [historyStack, setHistoryStack] = useState<any[]>([]);

  const [currentView, setCurrentView] = useState<'root' | 'domain' | 'project' | 'coreSkill' | 'skillArea' | 'feature'>('root');
  const [selectedDomain, setSelectedDomain] = useState<SkillDomain | null>(null);
  const [selectedCoreSkill, setSelectedCoreSkill] = useState<CoreSkill | null>(null);
  const [selectedSkillArea, setSelectedSkillArea] = useState<SkillArea | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const handleBack = () => {
    const prevState = historyStack.pop();
    setHistoryStack([...historyStack]);
    
    if (selectedFeature) {
        setSelectedFeature(null);
        setCurrentView('project');
    } else if (selectedSkillArea) {
        setSelectedSkillArea(null);
        setCurrentView('coreSkill');
    } else if (selectedCoreSkill) {
        setSelectedCoreSkill(null);
        setCurrentView('domain');
    } else if (selectedProject || selectedDomain) {
        setSelectedProject(null);
        setSelectedDomain(null);
        setCurrentView('root');
    }
  };
  
  const handleSelect = (item: any, type: string) => {
    switch(type) {
        case 'domain':
            setSelectedDomain(item);
            setCurrentView('coreSkill');
            setHistoryStack([...historyStack, { view: 'root' }]);
            break;
        case 'project':
            onSelectProject(item);
            setCurrentView('feature');
            setHistoryStack([...historyStack, { view: 'root' }]);
            break;
        case 'coreSkill':
            setSelectedCoreSkill(item);
            setCurrentView('skillArea');
            setHistoryStack([...historyStack, { view: 'domain' }]);
            break;
        case 'skillArea':
            setSelectedSkillArea(item);
            setCurrentView('root'); // No deeper level, so just set it.
            break;
        case 'feature':
            setSelectedFeature(item);
            setCurrentView('root'); // No deeper level, so just set it.
            break;
        case 'microSkill':
            onSelectMicroSkill(item);
            onSelectFocusArea(null);
            onSelectProject(null);
            break;
    }
  };

  const linkedDeepWorkChildIds = React.useMemo(() => new Set<string>((definitions || []).flatMap(def => def.linkedDeepWorkIds || [])), [definitions]);
  const linkedUpskillChildIds = React.useMemo(() => new Set<string>((definitions || []).flatMap(def => def.linkedUpskillIds || [])), [definitions]);

  const getDeepWorkIcon = (def: ExerciseDefinition) => {
    const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
    const isChild = linkedDeepWorkChildIds.has(def.id);
    if (isParent && !isChild) return <Lightbulb className="mr-2 h-4 w-4 text-amber-500" />;
    if (isParent && isChild) return <Flag className="mr-2 h-4 w-4 text-green-500" />;
    if (!isParent && isChild) return <Bolt className="mr-2 h-4 w-4 text-blue-500" />;
    return <Focus className="mr-2 h-4 w-4 text-purple-500" />;
  };

  const getUpskillIcon = (def: ExerciseDefinition) => {
    const isParent = (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
    const isChild = linkedUpskillChildIds.has(def.id);
    if (isParent && !isChild) return <Flashlight className="mr-2 h-4 w-4 text-amber-500" />;
    if (isParent && isChild) return <Flag className="mr-2 h-4 w-4 text-green-500" />;
    if (!isParent && isChild) return <Frame className="mr-2 h-4 w-4 text-blue-500" />;
    return <Focus className="mr-2 h-4 w-4 text-purple-500" />;
  };
  
  const renderHeader = () => {
    let title = "Library";
    if (selectedDomain) title = selectedDomain.name;
    if (selectedCoreSkill) title = selectedCoreSkill.name;
    if (selectedSkillArea) title = selectedSkillArea.name;
    if (selectedProject) title = selectedProject.name;
    if (selectedFeature) title = selectedFeature.name;
    
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
    if (selectedSkillArea) {
       return (
         <div className="space-y-1">
            {selectedSkillArea.microSkills.map(ms => {
                 const tasks = definitions.filter(def => def.category === ms.name);
                 return (
                    <Accordion key={ms.id} type="single" collapsible>
                        <AccordionItem value={ms.id}>
                            <div className="flex items-center group">
                                <AccordionTrigger
                                    className={cn(
                                        "text-base font-semibold hover:no-underline py-2 flex-grow",
                                        selectedMicroSkill?.id === ms.id && "text-primary"
                                    )}
                                    onClick={() => handleSelect(ms, 'microSkill')}
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
       )
    }

    if (selectedFeature) {
        return (
            <div className="space-y-2">
                {selectedFeature.linkedSkills.map(link => {
                    const microSkill = coreSkills.flatMap(cs => cs.skillAreas).flatMap(sa => sa.microSkills).find(ms => ms.id === link.microSkillId);
                    if (!microSkill) return null;
                    return (
                         <Button key={microSkill.id} variant="outline" className="w-full justify-start" onClick={() => handleSelect(microSkill, 'microSkill')}>
                            {microSkill.name}
                         </Button>
                    )
                })}
            </div>
        )
    }

    if (selectedCoreSkill) {
      return (
        <div className="space-y-2">
          {selectedCoreSkill.skillAreas.map(sa => (
            <Button key={sa.id} variant="outline" className="w-full justify-start" onClick={() => handleSelect(sa, 'skillArea')}>
              {sa.name}
            </Button>
          ))}
        </div>
      );
    }
    
    if (selectedProject) {
        return (
             <div className="space-y-2">
                {selectedProject.features.map(feature => (
                     <Button key={feature.id} variant="outline" className="w-full justify-start" onClick={() => handleSelect(feature, 'feature')}>
                        {feature.name}
                     </Button>
                ))}
             </div>
        )
    }

    if (selectedDomain) {
        const filteredCoreSkills = coreSkills.filter(cs => cs.domainId === selectedDomain.id);
        return (
             <div className="space-y-2">
                {filteredCoreSkills.map(cs => (
                    <Button key={cs.id} variant="outline" className="w-full justify-start" onClick={() => handleSelect(cs, 'coreSkill')}>
                        {cs.type === 'Foundation' ? <Blocks className="mr-2 h-4 w-4" /> : cs.type === 'Professionalism' ? <Sprout className="mr-2 h-4 w-4" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                        {cs.name}
                    </Button>
                ))}
             </div>
        )
    }

    // Root View
    return (
        <Accordion type="multiple" className="w-full">
            <AccordionItem value="skills-domains">
                <AccordionTrigger>Skills</AccordionTrigger>
                <AccordionContent>
                     {skillDomains.map(domain => (
                        <Button key={domain.id} variant="ghost" className="w-full justify-start" onClick={() => handleSelect(domain, 'domain')}>
                            {domain.name}
                        </Button>
                     ))}
                </AccordionContent>
            </AccordionItem>
             <AccordionItem value="projects">
                <AccordionTrigger>Projects</AccordionTrigger>
                <AccordionContent>
                     {projects.map(project => (
                        <Button key={project.id} variant="ghost" className="w-full justify-start" onClick={() => handleSelect(project, 'project')}>
                            {project.name}
                        </Button>
                     ))}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
  };


  return (
    <Card>
        <CardHeader>
           {renderHeader()}
        </CardHeader>
        <CardContent>
           <AnimatePresence mode="wait">
             <motion.div
               key={selectedSkillArea?.id || selectedCoreSkill?.id || selectedDomain?.id || selectedProject?.id || selectedFeature?.id || 'root'}
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
