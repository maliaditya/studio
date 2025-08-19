

"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Blocks, Sprout, PlusCircle, Lightbulb, Flag, Bolt, Focus, BookCopy, Flashlight, Frame, Activity, ArrowLeft, Briefcase, Building, Folder, Workflow, Trash2, GitMerge, Edit3, ChevronLeft, MoreVertical, PackageCheck } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from './ui/checkbox';


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
  onOpenLinkProjectModal: (task: ExerciseDefinition) => void;
  onToggleReadyForBranding: (defId: string) => void;
}

const TaskItem = ({ 
    task, 
    allDefinitions, 
    level = 0,
    getIcon,
    onSelectFocusArea,
    onOpenMindMap,
    onEditFocusArea,
    onDeleteFocusArea,
    addToRecents,
    libraryView,
    onOpenLinkProjectModal,
    onToggleReadyForBranding,
  }: {
    task: ExerciseDefinition,
    allDefinitions: Map<string, ExerciseDefinition>,
    level?: number,
    getIcon: (def: ExerciseDefinition) => React.ReactNode,
    onSelectFocusArea: (def: ExerciseDefinition | null, type: 'deepwork' | 'upskill') => void,
    onOpenMindMap: (focusAreaId: string) => void,
    onEditFocusArea: (def: ExerciseDefinition) => void,
    onDeleteFocusArea: (defId: string) => void,
    addToRecents: (item: (ExerciseDefinition | Project) & { type: string }) => void;
    libraryView: 'deepwork' | 'upskill';
    onOpenLinkProjectModal: (task: ExerciseDefinition) => void;
    onToggleReadyForBranding: (defId: string) => void;
  }) => {
    const { linkedDeepWorkIds = [], linkedUpskillIds = [] } = task;
    const childIds = libraryView === 'deepwork' ? linkedDeepWorkIds : linkedUpskillIds;
    const children = childIds.map(id => allDefinitions.get(id)).filter((d): d is ExerciseDefinition => !!d);

    const isIntentionOrCuriosity = (task.linkedDeepWorkIds && task.linkedDeepWorkIds.length > 0) || (task.linkedUpskillIds && task.linkedUpskillIds.length > 0);

    return (
        <div style={{ marginLeft: `${level * 16}px` }}>
            <div className="flex items-center justify-between group/task rounded-md hover:bg-muted">
                <button
                    onClick={() => {
                        onSelectFocusArea(task, libraryView);
                        if (isIntentionOrCuriosity) {
                            addToRecents({ ...task, type: libraryView });
                        }
                    }}
                    className="flex-grow text-left p-1 rounded-md text-sm text-muted-foreground flex items-center gap-2 min-w-0"
                >
                    {getIcon(task)}
                    <span className="truncate" title={task.name}>{task.name}</span>
                </button>
                <div className="flex-shrink-0 flex items-center opacity-0 group-hover/task:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => onEditFocusArea(task)}><Edit3 className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onOpenMindMap(task.id)}><GitMerge className="mr-2 h-4 w-4" />View Mind Map</DropdownMenuItem>
                            {isIntentionOrCuriosity && (
                              <DropdownMenuItem onSelect={() => onOpenLinkProjectModal(task)}><PackageCheck className="mr-2 h-4 w-4" />Link Project</DropdownMenuItem>
                            )}
                            {libraryView === 'deepwork' && (
                                <DropdownMenuItem onSelect={() => onToggleReadyForBranding(task.id)}>
                                    <Checkbox className="mr-2" checked={!!task.isReadyForBranding} />
                                    <span>Mark as Ready for Branding</span>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => onDeleteFocusArea(task.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            {children.length > 0 && (
                <div className="border-l-2 ml-2 pl-2">
                    {children.map(child => (
                        <TaskItem
                            key={child.id}
                            task={child}
                            allDefinitions={allDefinitions}
                            level={level + 1}
                            getIcon={getIcon}
                            onSelectFocusArea={onSelectFocusArea}
                            onOpenMindMap={onOpenMindMap}
                            onEditFocusArea={onEditFocusArea}
                            onDeleteFocusArea={onDeleteFocusArea}
                            addToRecents={addToRecents}
                            libraryView={libraryView}
                            onOpenLinkProjectModal={onOpenLinkProjectModal}
                            onToggleReadyForBranding={onToggleReadyForBranding}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


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
    onOpenLinkProjectModal,
    onToggleReadyForBranding,
}: SkillLibraryProps) {
  const { 
    skillDomains, 
    coreSkills, 
    projects, 
    expandedItems, 
    handleExpansionChange, 
    upskillDefinitions, 
    deepWorkDefinitions,
    setDeepWorkDefinitions,
    selectedDomainId, setSelectedDomainId,
    selectedSkillId, setSelectedSkillId,
    selectedProjectId, setSelectedProjectId
  } = useAuth();
  
  const [editingFocusAreaId, setEditingFocusAreaId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [libraryView, setLibraryView] = useState<'deepwork' | 'upskill'>('deepwork');
  const [contextMenuTask, setContextMenuTask] = useState<ExerciseDefinition | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const selectedDomain = skillDomains.find(d => d.id === selectedDomainId);
  const selectedCoreSkill = coreSkills.find(s => s.id === selectedSkillId);
  const definitions = libraryView === 'deepwork' ? deepWorkDefinitions : upskillDefinitions;
  
  const handleBack = () => {
    if (selectedMicroSkill) {
        onSelectMicroSkill(null);
    } else if (selectedSkillId) {
        setSelectedSkillId(null);
    } else if (selectedProjectId) {
        setSelectedProjectId(null);
        onSelectProject(null);
    } else if (selectedDomainId) {
        setSelectedDomainId(null);
    }
  };
  
  const handleSelect = (item: any, type: 'domain' | 'coreSkill' | 'microSkill' | 'project') => {
    onSelectFocusArea(null, 'deepwork');
    
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
    const hasChildren = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0;
    if (!hasChildren) {
        const isChild = deepWorkDefinitions.some(parent => (parent.linkedDeepWorkIds || []).includes(def.id));
        return isChild ? 'Action' : 'Standalone';
    }
    
    const hasActionableChild = (def.linkedDeepWorkIds || []).some(childId => {
        const childDef = deepWorkDefinitions.find(d => d.id === childId);
        return childDef && getDeepWorkNodeType(childDef).match(/Action|Standalone/);
    });
    if (hasActionableChild) return 'Objective';

    const hasObjectiveChild = (def.linkedDeepWorkIds || []).some(childId => {
        const childDef = deepWorkDefinitions.find(d => d.id === childId);
        return childDef && getDeepWorkNodeType(childDef) === 'Objective';
    });
    if (hasObjectiveChild) return 'Intention';

    return 'Objective';
  };
  
  const getUpskillNodeType = (def: ExerciseDefinition) => {
    const hasChildren = (def.linkedUpskillIds?.length ?? 0) > 0;
    if (!hasChildren) {
        const isChild = upskillDefinitions.some(parent => (parent.linkedUpskillIds || []).includes(def.id));
        return isChild ? 'Visualization' : 'Standalone';
    }
    
    const hasActionableChild = (def.linkedUpskillIds || []).some(childId => {
        const childDef = upskillDefinitions.find(d => d.id === childId);
        return childDef && getUpskillNodeType(childDef).match(/Visualization|Standalone/);
    });
    if (hasActionableChild) return 'Objective';
    
    const hasObjectiveChild = (def.linkedUpskillIds || []).some(childId => {
        const childDef = upskillDefinitions.find(d => d.id === childId);
        return childDef && getUpskillNodeType(childDef) === 'Objective';
    });
    if (hasObjectiveChild) return 'Curiosity';
    
    return 'Objective';
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
        const allTasksForMicroSkill = definitions.filter(def => def.category === selectedMicroSkill.name);
        const allDefsMap = new Map(definitions.map(def => [def.id, def]));
        const childIdSet = libraryView === 'deepwork' ? linkedDeepWorkChildIds : linkedUpskillChildIds;
        const topLevelTasks = allTasksForMicroSkill.filter(task => !childIdSet.has(task.id));
      
        return (
            <div className="space-y-1">
                <div className="flex items-center justify-between group">
                    <h3 className="font-semibold text-base py-2 flex items-center gap-2"><Activity className="h-4 w-4"/>Micro-Skill: {selectedMicroSkill.name}</h3>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenNewFocusArea(libraryView)}>
                        <PlusCircle className="h-4 w-4 text-green-500" />
                    </Button>
                </div>
                <div className="space-y-1">
                    {topLevelTasks.length > 0 ? topLevelTasks.map(task => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            allDefinitions={allDefsMap}
                            getIcon={getIcon}
                            onSelectFocusArea={onSelectFocusArea}
                            onOpenMindMap={onOpenMindMap}
                            onEditFocusArea={onEditFocusArea}
                            onDeleteFocusArea={onDeleteFocusArea}
                            addToRecents={addToRecents}
                            libraryView={libraryView}
                            onOpenLinkProjectModal={onOpenLinkProjectModal}
                            onToggleReadyForBranding={onToggleReadyForBranding}
                        />
                    )) : <p className="text-xs text-muted-foreground text-center py-2">No top-level tasks for this skill yet.</p>}
                </div>
            </div>
        );
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
