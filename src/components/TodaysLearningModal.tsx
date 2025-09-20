
"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
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
import { isAfter, parseISO, startOfToday, format } from 'date-fns';

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
}: TodaysLearningModalProps) {
  const { toast } = useToast();
  const { coreSkills, skillDomains, microSkillMap, getDeepWorkNodeType, getUpskillNodeType, settings } = useAuth();
  const [selectedRadioDefId, setSelectedRadioDefId] = useState<string | null>(null);

  // State for bundle creation
  const [newBundleName, setNewBundleName] = useState('');
  const [selectedFocusAreaIds, setSelectedFocusAreaIds] = useState<string[]>([]);
  
  // State for deep work selection flow
  const [deepWorkSelectionStep, setDeepWorkSelectionStep] = useState<'project' | 'intention'>('project');
  const [selectedDeepWorkProject, setSelectedDeepWorkProject] = useState<Project | null>(null);

  // State for upskill selection flow
  const [upskillSelectionStep, setUpskillSelectionStep] = useState<'project' | 'curiosity'>('project');
  const [selectedUpskillProject, setSelectedUpskillProject] = useState<Project | null>(null);

  const schedulingLevel = settings.schedulingLevel || 3;
  
  const currentSpecializationName = useMemo(() => {
    if (availableTasks.length > 0) {
      const taskDefId = availableTasks[0].definitionId;
      const definition = [...deepWorkDefinitions, ...upskillDefinitions].find(d => d.id === taskDefId);
      return definition?.category || null;
    }
    return null;
  }, [availableTasks, deepWorkDefinitions, upskillDefinitions]);
  
  const projectsForSpecialization = useMemo(() => {
    if (!currentSpecializationName) return [];
  
    // Find the microSkill info from the map using the task's category (which is the micro-skill name)
    const microSkillInfo = Array.from(microSkillMap.values()).find(
      (info) => info.microSkillName === currentSpecializationName
    );
  
    if (!microSkillInfo) return [];
  
    // Find the core skill (specialization) using the name from the map
    const specialization = coreSkills.find(
      (cs) => cs.name === microSkillInfo.coreSkillName && cs.type === 'Specialization'
    );
  
    if (!specialization) return [];
  
    // Get the domain ID from the found specialization
    const domainId = specialization.domainId;
  
    // Filter projects based on the correct domain ID
    return projects.filter(p => p.domainId === domainId);
  
  }, [currentSpecializationName, coreSkills, projects, microSkillMap]);


  useEffect(() => {
    if (isOpen) {
      if (pageType === 'deepwork') {
        setDeepWorkSelectionStep('project');
        setSelectedDeepWorkProject(null);
        setSelectedRadioDefId(initialSelectedIds.length > 0 ? availableTasks.find(t => initialSelectedIds.includes(t.id))?.definitionId || null : null);
      } else if (pageType === 'upskill') {
        setUpskillSelectionStep('project');
        setSelectedUpskillProject(null);
        setSelectedRadioDefId(initialSelectedIds.length > 0 ? availableTasks.find(t => initialSelectedIds.includes(t.id))?.definitionId || null : null);
      }
      else {
        setSelectedRadioDefId(initialSelectedIds.length > 0 ? availableTasks.find(t => initialSelectedIds.includes(t.id))?.definitionId || null : null);
      }
    }
  }, [isOpen, pageType, initialSelectedIds, availableTasks]);
  
  const handleSaveChanges = () => {
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
      toast({ title: "Error", description: "Please select at least one focus area.", variant: "destructive" });
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

  const intentionsForProject = useMemo(() => {
    if (!selectedDeepWorkProject || pageType !== 'deepwork') return [];
    return (deepWorkDefinitions || []).filter(def => {
        if (getDeepWorkNodeType(def) !== 'Intention') return false;
        return (def.linkedProjectIds || []).includes(selectedDeepWorkProject.id);
    });
  }, [deepWorkDefinitions, selectedDeepWorkProject, pageType, getDeepWorkNodeType]);

  const curiositiesForProject = useMemo(() => {
    if (!selectedUpskillProject || pageType !== 'upskill') return [];
    return (upskillDefinitions || []).filter(def => {
        if (getUpskillNodeType(def) !== 'Curiosity') return false;
        return (def.linkedProjectIds || []).includes(selectedUpskillProject.id);
    });
  }, [upskillDefinitions, selectedUpskillProject, pageType, getUpskillNodeType]);

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
            {pageType === 'deepwork' ? (
                <div className="space-y-4">
                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                        {currentSpecializationName || 'Projects'}
                        {selectedDeepWorkProject && (
                            <>
                                <ChevronRight className="h-4 w-4 mx-1" />
                                <span className="font-medium text-foreground truncate max-w-[200px]" title={selectedDeepWorkProject.name}>
                                    {selectedDeepWorkProject.name}
                                </span>
                            </>
                        )}
                    </div>
                    {deepWorkSelectionStep === 'project' && (
                        <div className="space-y-2">
                            {projectsForSpecialization.map(project => ( 
                                <button key={project.id} onClick={() => { setSelectedDeepWorkProject(project); setDeepWorkSelectionStep('intention'); }} className="flex items-center justify-between w-full text-left p-3 rounded-md border bg-muted/20 hover:bg-accent transition-colors">
                                    <span className="font-medium">{project.name}</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            ))}
                            {projectsForSpecialization.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No projects found for this specialization. Go to the Skill page to link them.</p>}
                        </div>
                    )}
                    {deepWorkSelectionStep === 'intention' && (
                        <RadioGroup value={selectedRadioDefId ?? ''} onValueChange={setSelectedRadioDefId} className="space-y-2">
                           {intentionsForProject.map(task => (
                                <div key={task.id} className="flex items-center space-x-3 p-3 rounded-md border bg-muted/20 has-[[data-state=checked]]:bg-accent transition-colors">
                                    <RadioGroupItem value={task.id} id={`task-radio-${task.id}`} />
                                    <Label htmlFor={`task-radio-${task.id}`} className="font-normal w-full cursor-pointer flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4 text-amber-500"/>
                                        {task.name}
                                    </Label>
                                </div>
                            ))}
                            {intentionsForProject.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No intentions linked to this project.</p>}
                        </RadioGroup>
                    )}
                </div>
            ) : pageType === 'upskill' ? (
                <div className="space-y-4">
                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                        {currentSpecializationName || 'Projects'}
                        {selectedUpskillProject && (
                            <>
                                <ChevronRight className="h-4 w-4 mx-1" />
                                <span className="font-medium text-foreground truncate max-w-[200px]" title={selectedUpskillProject.name}>
                                    {selectedUpskillProject.name}
                                </span>
                            </>
                        )}
                    </div>
                     {upskillSelectionStep === 'project' && (
                        <div className="space-y-2">
                            {projectsForSpecialization.map(project => ( 
                                <button key={project.id} onClick={() => { setSelectedUpskillProject(project); setUpskillSelectionStep('curiosity'); }} className="flex items-center justify-between w-full text-left p-3 rounded-md border bg-muted/20 hover:bg-accent transition-colors">
                                    <span className="font-medium">{project.name}</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            ))}
                             {projectsForSpecialization.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No projects found for this specialization. Go to the Skill page to link them.</p>}
                        </div>
                    )}
                    {upskillSelectionStep === 'curiosity' && (
                         <RadioGroup value={selectedRadioDefId ?? ''} onValueChange={setSelectedRadioDefId} className="space-y-2">
                           {curiositiesForProject.map(task => (
                                <div key={task.id} className="flex items-center space-x-3 p-3 rounded-md border bg-muted/20 has-[[data-state=checked]]:bg-accent transition-colors">
                                    <RadioGroupItem value={task.id} id={`task-radio-${task.id}`} />
                                    <Label htmlFor={`task-radio-${task.id}`} className="font-normal w-full cursor-pointer flex items-center gap-2">
                                        <Flashlight className="h-4 w-4 text-amber-500"/>
                                        {task.name}
                                    </Label>
                                </div>
                            ))}
                             {curiositiesForProject.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No curiosities linked to this project.</p>}
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
