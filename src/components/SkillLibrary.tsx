
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Blocks, Sprout, PlusCircle, Lightbulb, Flag, Bolt, Focus, BookCopy, Flashlight, Frame, Activity, ArrowLeft, Briefcase, Building, Folder, Workflow, Trash2, GitMerge } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SkillDomain, CoreSkill, SkillArea, MicroSkill, ExerciseDefinition, Project, Feature } from '@/types/workout';
import { AnimatePresence, motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from './ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface SkillLibraryProps {
  pageType: 'deepwork' | 'upskill';
  selectedMicroSkill: MicroSkill | null;
  onSelectMicroSkill: (skill: MicroSkill | null) => void;
  definitions: ExerciseDefinition[];
  onSelectFocusArea: (def: ExerciseDefinition | null) => void;
  onOpenNewFocusArea: () => void;
  selectedProject: Project | null;
  onSelectProject: (project: Project | null) => void;
  onDeleteFocusArea: (defId: string) => void;
  onUpdateFocusAreaName: (defId: string, newName: string) => void;
  onOpenMindMap: (focusAreaId: string) => void;
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
    onDeleteFocusArea,
    onUpdateFocusAreaName,
    onOpenMindMap,
}: SkillLibraryProps) {
  const { skillDomains, coreSkills, projects, expandedItems, handleExpansionChange, upskillDefinitions, deepWorkDefinitions } = useAuth();
  
  const [currentView, setCurrentView] = useState<'root' | 'domain' | 'coreSkill' | 'skillArea' | 'project' | 'feature'>('root');
  const [selectedDomain, setSelectedDomain] = useState<SkillDomain | null>(null);
  const [selectedCoreSkill, setSelectedCoreSkill] = useState<CoreSkill | null>(null);
  const [selectedSkillArea, setSelectedSkillArea] = useState<SkillArea | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [editingFocusAreaId, setEditingFocusAreaId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleBack = () => {
    if (selectedMicroSkill) {
        onSelectMicroSkill(null);
    } else if (selectedFeature) {
        setSelectedFeature(null);
        setCurrentView('project');
    } else if (selectedSkillArea) {
        setSelectedSkillArea(null);
        setCurrentView('coreSkill');
    } else if (selectedCoreSkill) {
        setSelectedCoreSkill(null);
        setCurrentView('domain');
    } else if (selectedProject) {
        onSelectProject(null);
        setCurrentView('root');
    } else if (selectedDomain) {
        setSelectedDomain(null);
        setCurrentView('root');
    }
  };
  
  const handleSelect = (item: any, type: string) => {
    switch(type) {
        case 'domain':
            setSelectedDomain(item);
            setCurrentView('domain');
            break;
        case 'project':
            onSelectProject(item);
            setCurrentView('project');
            break;
        case 'coreSkill':
            setSelectedCoreSkill(item);
            setCurrentView('coreSkill');
            break;
        case 'skillArea':
            setSelectedSkillArea(item);
            setCurrentView('skillArea');
            break;
        case 'feature':
            setSelectedFeature(item);
            setCurrentView('feature');
            break;
        case 'microSkill':
            onSelectMicroSkill(item);
            onSelectFocusArea(null);
            break;
    }
  };

  const handleStartEditing = (def: ExerciseDefinition) => {
    setEditingFocusAreaId(def.id);
    setEditingName(def.name);
  };
  
  const handleSaveName = () => {
    if (editingFocusAreaId && editingName.trim()) {
      onUpdateFocusAreaName(editingFocusAreaId, editingName.trim());
    }
    setEditingFocusAreaId(null);
  };

  const linkedDeepWorkChildIds = React.useMemo(() => new Set<string>((deepWorkDefinitions || []).flatMap(def => def.linkedDeepWorkIds || [])), [deepWorkDefinitions]);
  const linkedUpskillChildIds = React.useMemo(() => new Set<string>((upskillDefinitions || []).flatMap(def => def.linkedUpskillIds || [])), [upskillDefinitions]);

  const getDeepWorkNodeType = (def: ExerciseDefinition) => {
    const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
    const isChild = linkedDeepWorkChildIds.has(def.id);
    if (isParent) return isChild ? 'Objective' : 'Intention';
    return isChild ? 'Action' : 'Standalone';
  };
  
  const getUpskillNodeType = (def: ExerciseDefinition) => {
    const isParent = (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
    const isChild = linkedUpskillChildIds.has(def.id);
    if (isParent) return isChild ? 'Objective' : 'Curiosity';
    return isChild ? 'Visualization' : 'Standalone';
  };

  const getDeepWorkIcon = (def: ExerciseDefinition) => {
    const nodeType = getDeepWorkNodeType(def);
    switch (nodeType) {
        case 'Intention': return <Lightbulb className="mr-2 h-4 w-4 text-amber-500" />;
        case 'Objective': return <Flag className="mr-2 h-4 w-4 text-green-500" />;
        case 'Action': return <Bolt className="mr-2 h-4 w-4 text-blue-500" />;
        case 'Standalone': return <Focus className="mr-2 h-4 w-4 text-purple-500" />;
        default: return <Briefcase className="mr-2 h-4 w-4" />;
    }
  };

  const getUpskillIcon = (def: ExerciseDefinition) => {
    const nodeType = getUpskillNodeType(def);
    switch (nodeType) {
        case 'Curiosity': return <Flashlight className="mr-2 h-4 w-4 text-amber-500" />;
        case 'Objective': return <Flag className="mr-2 h-4 w-4 text-green-500" />;
        case 'Visualization': return <Frame className="mr-2 h-4 w-4 text-blue-500" />;
        case 'Standalone': return <Focus className="mr-2 h-4 w-4 text-purple-500" />;
        default: return <BookCopy className="mr-2 h-4 w-4" />;
    }
  };
  
  const renderHeader = () => {
    let title = "Library";
    if (selectedFeature) title = selectedFeature.name;
    else if (selectedMicroSkill) title = selectedMicroSkill.name;
    else if (selectedSkillArea) title = selectedSkillArea.name;
    else if (selectedCoreSkill) title = selectedCoreSkill.name;
    else if (selectedProject) title = selectedProject.name;
    else if (selectedDomain) title = selectedDomain.name;

    const showBackButton = currentView !== 'root' || selectedMicroSkill !== null;
    
    return (
        <div className="flex items-center gap-2">
            {showBackButton && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleBack}><ArrowLeft className="h-4 w-4" /></Button>
            )}
            <CardTitle className="text-lg text-primary truncate" title={title}>{title}</CardTitle>
        </div>
    );
  };
  
  const renderContent = () => {
    if (selectedMicroSkill) {
      const allTasks = definitions.filter(def => def.category === selectedMicroSkill.name);
      
      const filteredTasks = allTasks.filter(task => {
        const nodeType = pageType === 'deepwork' ? getDeepWorkNodeType(task) : getUpskillNodeType(task);
        return ['Intention', 'Curiosity', 'Standalone'].includes(nodeType);
      });
      
      return (
        <div className="space-y-1">
           <div className="flex items-center justify-between group">
              <h3 className="font-semibold text-base py-2 flex items-center gap-2"><Activity className="h-4 w-4"/>Micro-Skill: {selectedMicroSkill.name}</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenNewFocusArea}>
                  <PlusCircle className="h-4 w-4 text-green-500" />
              </Button>
            </div>
            <div className="pl-4 space-y-1">
                {filteredTasks.length > 0 ? filteredTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between group/task">
                        {editingFocusAreaId === task.id ? (
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={handleSaveName}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            className="h-8"
                            autoFocus
                          />
                        ) : (
                          <button
                            onDoubleClick={() => handleStartEditing(task)}
                            onClick={() => onSelectFocusArea(task)}
                            className="flex-grow text-left p-1 rounded-md text-sm text-muted-foreground hover:bg-muted flex items-center gap-2 min-w-0"
                          >
                            {pageType === 'deepwork' ? getDeepWorkIcon(task) : getUpskillIcon(task)}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="truncate" title={task.name}>
                                            {task.name.length > 25 ? `${task.name.substring(0, 25)}...` : task.name}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{task.name}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                          </button>
                        )}
                        <div className="flex-shrink-0 flex items-center opacity-0 group-hover/task:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onOpenMindMap(task.id)}>
                                <GitMerge className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete the task "{task.name}". This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onDeleteFocusArea(task.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                )) : <p className="text-xs text-muted-foreground text-center py-2">No top-level tasks for this skill yet.</p>}
            </div>
        </div>
      )
    }

    if (currentView === 'feature' && selectedFeature) {
        const linkedMicroSkills = coreSkills.flatMap(cs => cs.skillAreas).flatMap(sa => sa.microSkills).filter(ms => selectedFeature?.linkedSkills.some(l => l.microSkillId === ms.id));
        return (
            <div className="space-y-2">
                {linkedMicroSkills.map(ms => (
                    <Button key={ms.id} variant="outline" className="w-full justify-start" onClick={() => handleSelect(ms, 'microSkill')}>
                        <Activity className="mr-2 h-4 w-4"/>
                        {ms.name}
                    </Button>
                ))}
            </div>
        )
    }

    if (currentView === 'project' && selectedProject) {
        return (
            <div className="space-y-2">
                {selectedProject.features.map(feature => (
                    <Button key={feature.id} variant="outline" className="w-full justify-start" onClick={() => handleSelect(feature, 'feature')}>
                        <Workflow className="mr-2 h-4 w-4"/>
                        {feature.name}
                    </Button>
                ))}
            </div>
        )
    }
    
    if (currentView === 'skillArea' && selectedSkillArea) {
       return (
        <div className="space-y-2">
            {selectedSkillArea.microSkills.map(ms => (
                <Button key={ms.id} variant="outline" className="w-full justify-start" onClick={() => handleSelect(ms, 'microSkill')}>
                    <Activity className="mr-2 h-4 w-4"/>
                    {ms.name}
                </Button>
            ))}
        </div>
       )
    }

    if (currentView === 'coreSkill' && selectedCoreSkill) {
      return (
        <div className="space-y-2">
          {selectedCoreSkill.skillAreas.map(sa => (
            <Button key={sa.id} variant="outline" className="w-full justify-start" onClick={() => handleSelect(sa, 'skillArea')}>
                <Folder className="mr-2 h-4 w-4"/>
              {sa.name}
            </Button>
          ))}
        </div>
      );
    }
    
    if (currentView === 'domain' && selectedDomain) {
        const filteredCoreSkills = coreSkills.filter(cs => cs.domainId === selectedDomain?.id);
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
        <Accordion type="multiple" className="w-full" value={expandedItems} onValueChange={handleExpansionChange}>
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
               key={currentView + (selectedDomain?.id || '') + (selectedCoreSkill?.id || '') + (selectedSkillArea?.id || '') + (selectedProject?.id || '') + (selectedFeature?.id || '') + (selectedMicroSkill?.id || '')}
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
