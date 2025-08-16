

"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Blocks, Sprout, PlusCircle, Lightbulb, Flag, Bolt, Focus, BookCopy, Flashlight, Frame, Activity, ArrowLeft, Briefcase, Building, Folder, Workflow, Trash2, GitMerge, Edit3, ChevronLeft } from 'lucide-react';
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
  selectedMicroSkill: MicroSkill | null;
  onSelectMicroSkill: (skill: MicroSkill | null) => void;
  onSelectFocusArea: (def: ExerciseDefinition | null, type: 'deepwork' | 'upskill') => void;
  onOpenNewFocusArea: (type: 'deepwork' | 'upskill') => void;
  selectedProject: Project | null;
  onSelectProject: (project: Project | null) => void;
  onDeleteFocusArea: (defId: string) => void;
  onUpdateFocusAreaName: (defId: string, newName: string) => void;
  onOpenMindMap: (focusAreaId: string) => void;
  onEditFocusArea: (def: ExerciseDefinition) => void;
  addToRecents: (item: (ExerciseDefinition | Project) & { type: string }) => void;
}

export function SkillLibrary({ 
    selectedMicroSkill, 
    onSelectMicroSkill,
    onSelectFocusArea,
    onOpenNewFocusArea,
    selectedProject,
    onSelectProject,
    onDeleteFocusArea,
    onUpdateFocusAreaName,
    onOpenMindMap,
    onEditFocusArea,
    addToRecents,
}: SkillLibraryProps) {
  const { 
    skillDomains, 
    coreSkills, 
    projects, 
    expandedItems, 
    handleExpansionChange, 
    upskillDefinitions, 
    deepWorkDefinitions,
    selectedDomainId, setSelectedDomainId,
    selectedSkillId, setSelectedSkillId,
    selectedProjectId, setSelectedProjectId
  } = useAuth();
  
  const [editingFocusAreaId, setEditingFocusAreaId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [libraryView, setLibraryView] = useState<'deepwork' | 'upskill'>('deepwork');

  const selectedDomain = skillDomains.find(d => d.id === selectedDomainId);
  const selectedCoreSkill = coreSkills.find(s => s.id === selectedSkillId);
  const definitions = libraryView === 'deepwork' ? deepWorkDefinitions : upskillDefinitions;
  
  const handleBack = () => {
    if (selectedMicroSkill) {
        onSelectMicroSkill(null);
    } else if (selectedSkillId) {
        setSelectedSkillId(null);
    } else if (selectedDomainId) {
        setSelectedDomainId(null);
    } else if (selectedProjectId) {
        setSelectedProjectId(null);
        onSelectProject(null);
    }
  };
  
  const handleSelect = (item: any, type: 'domain' | 'coreSkill' | 'microSkill' | 'project') => {
    onSelectFocusArea(null, 'deepwork');
    if(type !== 'project') onSelectProject(null);
    
    if(type === 'project') {
        addToRecents({ ...item, type: 'project' });
    }

    switch(type) {
        case 'domain':
            setSelectedDomainId(item.id);
            break;
        case 'coreSkill':
            setSelectedSkillId(item.id);
            break;
        case 'microSkill':
            onSelectMicroSkill(item);
            break;
        case 'project':
            onSelectProject(item);
            setSelectedProjectId(item.id);
            break;
    }
  };
  
  const handleSaveName = () => {
    if (editingFocusAreaId && editingName.trim()) {
      onUpdateFocusAreaName(editingFocusAreaId, editingName.trim());
    }
    setEditingFocusAreaId(null);
  };

  const linkedDeepWorkChildIds = useMemo(() => new Set<string>((deepWorkDefinitions || []).flatMap(def => def.linkedDeepWorkIds || [])), [deepWorkDefinitions]);
  const linkedUpskillChildIds = useMemo(() => new Set<string>((upskillDefinitions || []).flatMap(def => def.linkedUpskillIds || [])), [upskillDefinitions]);

  const getDeepWorkNodeType = (def: ExerciseDefinition) => {
    const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0;
    if (isParent) {
        const hasObjectiveChild = (def.linkedDeepWorkIds || []).some(childId => {
            const childDef = deepWorkDefinitions.find(d => d.id === childId);
            return childDef && getDeepWorkNodeType(childDef) === 'Objective';
        });
        return hasObjectiveChild ? 'Intention' : 'Objective';
    }
    return linkedDeepWorkChildIds.has(def.id) ? 'Action' : 'Standalone';
  };
  
  const getUpskillNodeType = (def: ExerciseDefinition) => {
     const isParent = (def.linkedUpskillIds?.length ?? 0) > 0;
    if (isParent) {
        const hasObjectiveChild = (def.linkedUpskillIds || []).some(childId => {
            const childDef = upskillDefinitions.find(d => d.id === childId);
            return childDef && getUpskillNodeType(childDef) === 'Objective';
        });
        return hasObjectiveChild ? 'Curiosity' : 'Objective';
    }
    return linkedUpskillChildIds.has(def.id) ? 'Visualization' : 'Standalone';
  };

  const getIcon = (def: ExerciseDefinition) => {
    const nodeType = libraryView === 'deepwork' ? getDeepWorkNodeType(def) : getUpskillNodeType(def);
    switch (nodeType) {
        case 'Intention': return <Lightbulb className="mr-2 h-4 w-4 text-amber-500" />;
        case 'Objective': return <Flag className="mr-2 h-4 w-4 text-green-500" />;
        case 'Action': return <Bolt className="mr-2 h-4 w-4 text-blue-500" />;
        case 'Curiosity': return <Flashlight className="mr-2 h-4 w-4 text-amber-500" />;
        case 'Visualization': return <Frame className="mr-2 h-4 w-4 text-blue-500" />;
        case 'Standalone': return <Focus className="mr-2 h-4 w-4 text-purple-500" />;
        default: return <Briefcase className="mr-2 h-4 w-4" />;
    }
  };
  
  const renderHeader = () => {
    let title = "Library";
    if (selectedMicroSkill) title = selectedMicroSkill.name;
    else if (selectedCoreSkill) title = selectedCoreSkill.name;
    else if (selectedProject) title = selectedProject.name;
    else if (selectedDomain) title = selectedDomain.name;

    const showBackButton = !!(selectedDomainId || selectedProjectId);
    
    return (
        <div className="flex items-center gap-2">
            {showBackButton && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleBack}><ChevronLeft className="h-4 w-4" /></Button>
            )}
            <CardTitle className="text-lg text-primary truncate" title={title}>{title}</CardTitle>
        </div>
    );
  };
  
  const renderContent = () => {
    if (selectedMicroSkill) {
      const allTasks = definitions.filter(def => def.category === selectedMicroSkill.name);
      
      const filteredTasks = allTasks.filter(task => {
        const childIdSet = libraryView === 'deepwork' ? linkedDeepWorkChildIds : linkedUpskillChildIds;
        return !childIdSet.has(task.id);
      });
      
      return (
        <div className="space-y-1">
           <div className="flex items-center justify-between group">
              <h3 className="font-semibold text-base py-2 flex items-center gap-2"><Activity className="h-4 w-4"/>Micro-Skill: {selectedMicroSkill.name}</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenNewFocusArea(libraryView)}>
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
                            onDoubleClick={() => onEditFocusArea(task)}
                            onClick={() => {
                                onSelectFocusArea(task, libraryView);
                                const nodeType = libraryView === 'deepwork' ? getDeepWorkNodeType(task) : getUpskillNodeType(task);
                                if (nodeType === 'Intention' || nodeType === 'Curiosity') {
                                    addToRecents({ ...task, type: libraryView });
                                }
                            }}
                            className="flex-grow text-left p-1 rounded-md text-sm text-muted-foreground hover:bg-muted flex items-center gap-2 min-w-0"
                          >
                            {getIcon(task)}
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
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditFocusArea(task)}>
                                <Edit3 className="h-3 w-3" />
                            </Button>
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

    if (selectedCoreSkill) {
      return (
        <div className="space-y-2">
          {selectedCoreSkill.skillAreas.map(sa => (
            <Accordion key={sa.id} type="single" collapsible>
                <AccordionItem value={sa.id} className="border-b-0">
                    <AccordionTrigger className="p-2 rounded-md hover:no-underline hover:bg-muted font-semibold text-base">{sa.name}</AccordionTrigger>
                    <AccordionContent className="pl-4 pt-1">
                        <ul className="space-y-1">
                            {sa.microSkills.map(ms => (
                                <li key={ms.id}>
                                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleSelect(ms, 'microSkill')}>{ms.name}</Button>
                                </li>
                            ))}
                        </ul>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
          ))}
        </div>
      );
    }
    
    if (selectedDomain) {
        const filteredCoreSkills = coreSkills.filter(cs => cs.domainId === selectedDomainId);
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

    if (selectedProject) {
        return (
            <div className="space-y-2">
                {selectedProject.features.map(feature => (
                    <Accordion key={feature.id} type="single" collapsible>
                        <AccordionItem value={feature.id} className="border-b-0">
                            <AccordionTrigger className="p-2 rounded-md hover:no-underline hover:bg-muted font-semibold text-base">{feature.name}</AccordionTrigger>
                            <AccordionContent className="pl-4 pt-1">
                                <ul className="space-y-1">
                                {feature.linkedSkills.map(link => {
                                    const microSkill = coreSkills.flatMap(cs => cs.skillAreas).flatMap(sa => sa.microSkills).find(ms => ms.id === link.microSkillId);
                                    return microSkill ? (
                                        <li key={microSkill.id}>
                                            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleSelect(microSkill, 'microSkill')}>
                                                {microSkill.name}
                                            </Button>
                                        </li>
                                    ) : null;
                                })}
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
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
            <div className="flex gap-1 mb-4 p-1 bg-muted rounded-md">
                <Button variant={libraryView === 'deepwork' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => setLibraryView('deepwork')}>Deep Work</Button>
                <Button variant={libraryView === 'upskill' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => setLibraryView('upskill')}>Upskill</Button>
            </div>
           <AnimatePresence mode="wait">
             <motion.div
               key={(selectedDomain?.id || '') + (selectedCoreSkill?.id || '') + (selectedProject?.id || '') + (selectedMicroSkill?.id || '') + libraryView}
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
