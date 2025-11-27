
"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ExerciseDefinition, WorkoutExercise, Project, ProductizationPlan, CoreSkill } from '@/types/workout';
import { BookOpenCheck, Briefcase, Share2, Save, PlusCircle, ChevronRight, Flashlight, Focus, Frame, ArrowLeft, Bolt, Flag, Lightbulb } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { isAfter, parseISO, startOfToday } from 'date-fns';

interface TodaysLearningModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  availableTasks: WorkoutExercise[];
  initialSelectedIds: string[];
  onSave: (selectedDefIds: string[]) => void;
  pageType: 'upskill' | 'deepwork' | 'branding';
  disabledTaskIds?: string[];
  deepWorkDefinitions?: ExerciseDefinition[];
  upskillDefinitions?: ExerciseDefinition[];
  setDeepWorkDefinitions?: React.Dispatch<React.SetStateAction<ExerciseDefinition[]>>;
  projects?: Project[];
  offerizationPlans?: Record<string, ProductizationPlan>;
  productizationPlans?: Record<string, ProductizationPlan>;
  activeProjectIds?: Set<string>;
}

export function TodaysLearningModal({
  isOpen,
  onOpenChange,
  availableTasks,
  initialSelectedIds,
  onSave,
  pageType,
  disabledTaskIds = [],
  deepWorkDefinitions = [],
  upskillDefinitions = [],
  setDeepWorkDefinitions,
  projects = [],
  offerizationPlans = {},
  productizationPlans = {},
  activeProjectIds = new Set(),
}: TodaysLearningModalProps) {
  const { toast } = useToast();
  const { coreSkills, skillDomains, microSkillMap, getDeepWorkNodeType, getUpskillNodeType, updateActivity } = useAuth();
  
  const [selectedRadioDefId, setSelectedRadioDefId] = useState<string | null>(null);

  // State for bundle creation
  const [newBundleName, setNewBundleName] = useState('');
  const [selectedFocusAreaIds, setSelectedFocusAreaIds] = useState<string[]>([]);
  
  // State for selection flow
  const [selectionStep, setSelectionStep] = useState<'project' | 'task'>('project');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const currentSpecializationName = useMemo(() => {
    if (availableTasks.length > 0) {
        const firstTask = availableTasks[0];
        // If a specific task instance is already linked, get its category
        if (initialSelectedIds.length > 0) {
            const initialTask = availableTasks.find(t => initialSelectedIds.includes(t.id));
            if (initialTask) {
                return initialTask.category;
            }
        }
        // Fallback to the activity's detail, which holds the specialization name
        return firstTask.category;
    }
    return null;
  }, [availableTasks, initialSelectedIds]);

  const projectsForSpecialization = useMemo(() => {
    if (!currentSpecializationName) return [];

    const coreSkill = coreSkills.find(cs => cs.name === currentSpecializationName && cs.type === 'Specialization');
    if (!coreSkill) {
      // Fallback for when details might be the category name directly
      const foundInMap = Array.from(microSkillMap.values()).find(info => info.microSkillName === currentSpecializationName);
      if (foundInMap) {
        const parentCoreSkill = coreSkills.find(cs => cs.name === foundInMap.coreSkillName);
        if (parentCoreSkill) {
            return projects.filter(p => p.domainId === parentCoreSkill.domainId);
        }
      }
      return [];
    }
  
    const domainId = coreSkill.domainId;
    return projects.filter(p => p.domainId === domainId);
  }, [currentSpecializationName, coreSkills, projects, microSkillMap]);


  useEffect(() => {
    if (isOpen) {
        // Reset state on open
        setSelectionStep('project');
        setSelectedProject(null);
        setSelectedRadioDefId(initialSelectedIds.length > 0 ? availableTasks.find(t => initialSelectedIds.includes(t.id))?.definitionId || null : null);
    }
  }, [isOpen, pageType, initialSelectedIds, availableTasks]);
  
  const handleSaveChanges = () => {
    const activityToUpdate = availableTasks[0];
    if (activityToUpdate && selectedRadioDefId) {
      updateActivity({
        ...activityToUpdate,
        linkedEntityType: activityToUpdate.type === 'deepwork' ? 'intention' : 'curiosity'
      });
    }

    onSave(selectedRadioDefId ? [selectedRadioDefId] : []);
    onOpenChange(false);
  };
  
  const eligibleFocusAreas = useMemo(() => {
    if (pageType !== 'branding') return [];
    return deepWorkDefinitions.filter(def => def.isReadyForBranding && !def.focusAreaIds);
  }, [deepWorkDefinitions, pageType]);

  const activeBundles = useMemo(() => {
    if (pageType !== 'branding') return [];
    return availableTasks;
  }, [availableTasks, pageType]);

  const handleToggleFocusAreaSelection = (focusAreaId: string) => {
    setSelectedFocusAreaIds(prev =>
      prev.includes(focusAreaId)
        ? prev.filter(id => id !== focusAreaId)
        : [...prev, focusAreaId]
    );
  };

  const handleCreateBundle = () => {
    if (!setDeepWorkDefinitions) return;
    if (newBundleName.trim() === '') {
      toast({ title: "Error", description: "Please provide a name for the bundle.", variant: "destructive" });
      return;
    }
    if (selectedFocusAreaIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one focus area for the bundle.", variant: "destructive" });
      return;
    }

    const newBundle: ExerciseDefinition = {
      id: `bundle_${Date.now()}_${Math.random()}`,
      name: newBundleName.trim(),
      category: "Content Bundle",
      focusAreaIds: selectedFocusAreaIds,
      isReadyForBranding: false,
      sharingStatus: { twitter: false, linkedin: false, devto: false }
    };

    setDeepWorkDefinitions(prevDefs => {
      const updatedDefs = prevDefs.map(def => {
        if (selectedFocusAreaIds.includes(def.id)) {
          return { ...def, isReadyForBranding: false };
        }
        return def;
      });
      return [...updatedDefs, newBundle];
    });

    toast({ title: "Bundle Created!", description: `"${newBundle.name}" is now in your pipeline.` });
    setNewBundleName('');
    setSelectedFocusAreaIds([]);
  };

  const tasksForProject = useMemo(() => {
    if (!selectedProject || (pageType !== 'deepwork' && pageType !== 'upskill')) return [];
    const sourceDefs = pageType === 'deepwork' ? deepWorkDefinitions : upskillDefinitions;
    const getNodeType = pageType === 'deepwork' ? getDeepWorkNodeType : getUpskillNodeType;
    const targetType = pageType === 'deepwork' ? 'Intention' : 'Curiosity';

    return (sourceDefs || []).filter(def => {
        if (getNodeType(def) !== targetType) return false;
        return (def.linkedProjectIds || []).includes(selectedProject.id);
    });
  }, [deepWorkDefinitions, upskillDefinitions, selectedProject, pageType, getDeepWorkNodeType, getUpskillNodeType]);

  const pageInfo = {
    upskill: {
      icon: <BookOpenCheck className="h-12 w-12 mb-4" />,
      title: 'Upskill Session Task',
      description: 'Select the task you plan to focus on for this session slot.',
      pageLink: '/upskill',
      pageName: 'Upskill'
    },
    deepwork: {
      icon: <Briefcase className="h-12 w-12 mb-4" />,
      title: 'Deep Work Session Task',
      description: 'Select a focus area for this session slot.',
      pageLink: '/deep-work',
      pageName: 'Deep Work'
    },
    branding: {
      icon: <Share2 className="h-12 w-12 mb-4" />,
      title: 'Branding Session Task',
      description: 'Create a new content bundle or select an existing one to work on.',
      pageLink: '/personal-branding',
      pageName: 'Personal Branding'
    }
  };

  const info = pageInfo[pageType];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-full max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{info.title}</DialogTitle>
          <DialogDescription>{info.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-4">
            {(pageType === 'deepwork' || pageType === 'upskill') ? (
                <div className="space-y-4">
                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                        <button onClick={() => setSelectionStep('project')} disabled={selectionStep === 'project'} className={cn(selectionStep !== 'project' && 'hover:underline')}>
                          {currentSpecializationName || 'Projects'}
                        </button>
                        {selectedProject && (
                            <>
                                <ChevronRight className="h-4 w-4 mx-1" />
                                <span className="font-medium text-foreground truncate max-w-[200px]" title={selectedProject.name}>
                                    {selectedProject.name}
                                </span>
                            </>
                        )}
                    </div>
                    {selectionStep === 'project' ? (
                        <div className="space-y-2">
                            {projectsForSpecialization.map(project => ( 
                                <button key={project.id} onClick={() => { setSelectedProject(project); setSelectionStep('task'); }} className={cn(
                                    "flex items-center justify-between w-full text-left p-3 rounded-md border bg-muted/20 hover:bg-accent transition-colors",
                                    activeProjectIds.has(project.id) && "bg-primary/10 border-primary/50"
                                )}>
                                    <span className="font-medium">{project.name}</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            ))}
                            {projectsForSpecialization.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No projects found for this specialization. Go to the Skill page to link them.</p>}
                        </div>
                    ) : (
                        <RadioGroup value={selectedRadioDefId ?? ''} onValueChange={setSelectedRadioDefId} className="space-y-2">
                           {tasksForProject.map(task => (
                                <div key={task.id} className="flex items-center space-x-3 p-3 rounded-md border bg-muted/20 has-[[data-state=checked]]:bg-accent transition-colors">
                                    <RadioGroupItem value={task.id} id={`task-radio-${task.id}`} />
                                    <Label htmlFor={`task-radio-${task.id}`} className="font-normal w-full cursor-pointer flex items-center gap-2">
                                        {pageType === 'deepwork' ? <Lightbulb className="h-4 w-4 text-amber-500"/> : <Flashlight className="h-4 w-4 text-amber-500"/>}
                                        {task.name}
                                    </Label>
                                </div>
                            ))}
                            {tasksForProject.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No high-level tasks (Intentions/Curiosities) are linked to this project.</p>}
                        </RadioGroup>
                    )}
                </div>
            ) : ( // Branding
                <div className="space-y-6">
                    <div>
                        <h4 className="mb-2 text-sm font-medium text-muted-foreground">Create New Bundle</h4>
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                            {eligibleFocusAreas.length > 0 ? (
                                <>
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Select focus areas to bundle:</p>
                                    {eligibleFocusAreas.map(area => (
                                    <div key={area.id} className="flex items-center space-x-3">
                                        <Checkbox
                                        id={`focus-${area.id}`}
                                        checked={selectedFocusAreaIds.includes(area.id)}
                                        onCheckedChange={() => handleToggleFocusAreaSelection(area.id)}
                                        />
                                        <Label htmlFor={`focus-${area.id}`} className="font-normal w-full cursor-pointer">
                                        {area.name} <span className="text-muted-foreground/80">({area.category})</span>
                                        </Label>
                                    </div>
                                    ))}
                                </div>
                                <Input
                                    placeholder="Name your new bundle"
                                    value={newBundleName}
                                    onChange={(e) => setNewBundleName(e.target.value)}
                                />
                                <Button onClick={handleCreateBundle} className="w-full" size="sm">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Create Bundle
                                </Button>
                                </>
                            ) : (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                No focus areas are ready for bundling. Go to Deep Work and mark items as "Ready for Branding".
                                </p>
                            )}
                        </div>
                    </div>

                    {activeBundles.length > 0 && (
                        <div>
                        <h4 className="mb-2 text-sm font-medium text-muted-foreground">Branding Pipeline</h4>
                        <RadioGroup
                            value={selectedRadioDefId ?? ''}
                            onValueChange={setSelectedRadioDefId}
                            className="space-y-2"
                        >
                            {activeBundles.map(bundle => (
                            <div key={bundle.id} className="flex items-center space-x-3 p-3 rounded-md border bg-muted/20 has-[[data-state=checked]]:bg-accent transition-colors">
                                <RadioGroupItem
                                value={bundle.definitionId}
                                id={`bundle-radio-${bundle.id}`}
                                disabled={disabledTaskIds.includes(bundle.definitionId)}
                                />
                                <Label
                                htmlFor={`bundle-radio-${bundle.id}`}
                                className={cn("font-normal w-full", disabledTaskIds.includes(bundle.definitionId) ? "cursor-not-allowed opacity-50" : "cursor-pointer")}
                                >
                                <p className="font-medium">{bundle.name}</p>
                                <p className="text-xs text-muted-foreground">{bundle.category}</p>
                                </Label>
                            </div>
                            ))}
                        </RadioGroup>
                        </div>
                    )}
                </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button onClick={handleSaveChanges} disabled={!selectedRadioDefId && pageType !== 'branding'}>
            <Save className="mr-2 h-4 w-4" />
            Save Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
