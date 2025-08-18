
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
import type { ExerciseDefinition, WorkoutExercise, Project, ProductizationPlan } from '@/types/workout';
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
  const { microSkillMap } = useAuth();
  const [selectedRadioDefId, setSelectedRadioDefId] = useState<string | null>(null);

  // State for branding bundle creation
  const [newBundleName, setNewBundleName] = useState('');
  const [selectedFocusAreaIds, setSelectedFocusAreaIds] = useState<string[]>([]);
  
  // State for deep work selection flow
  const [deepWorkSelectionStep, setDeepWorkSelectionStep] = useState<'project' | 'intention' | 'action'>('project');
  const [selectedDeepWorkProject, setSelectedDeepWorkProject] = useState<Project | null>(null);
  const [selectedDeepWorkIntention, setSelectedDeepWorkIntention] = useState<ExerciseDefinition | null>(null);

  // State for upskill selection flow
  const [upskillSelectionStep, setUpskillSelectionStep] = useState<'project' | 'curiosity' | 'visualization'>('project');
  const [selectedUpskillProject, setSelectedUpskillProject] = useState<Project | null>(null);
  const [selectedUpskillCuriosity, setSelectedUpskillCuriosity] = useState<ExerciseDefinition | null>(null);


  const filteredProjects = useMemo(() => {
    if (!projects) return [];

    return projects.filter(project => {
        // Check if the project is part of any offerization plan with a future release
        const isOfferedAndActive = Object.values(offerizationPlans).some(plan =>
            plan.releases?.some(release => {
                if (release.name !== project.name) return false;
                try {
                    const releaseDate = parseISO(release.launchDate);
                    const today = startOfToday();
                    return isAfter(releaseDate, today) || format(releaseDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                } catch {
                    return false;
                }
            })
        );
        
        if(isOfferedAndActive) return true;

        // Check if the project has a product plan
        const hasProductPlan = productizationPlans && productizationPlans[project.name];
        if(hasProductPlan) return true;
        
        return false;
    });
  }, [projects, offerizationPlans, productizationPlans]);

  useEffect(() => {
    if (isOpen) {
      if (pageType === 'deepwork') {
        setDeepWorkSelectionStep('project');
        setSelectedDeepWorkProject(null);
        setSelectedDeepWorkIntention(null);
        setSelectedRadioDefId(initialSelectedIds.length > 0 ? initialSelectedIds[0] : null);
      } else if (pageType === 'upskill') {
        setUpskillSelectionStep('project');
        setSelectedUpskillProject(null);
        setSelectedUpskillCuriosity(null);
        setSelectedRadioDefId(initialSelectedIds.length > 0 ? initialSelectedIds[0] : null);
      }
      else {
        setSelectedRadioDefId(initialSelectedIds.length > 0 ? initialSelectedIds[0] : null);
      }
    }
  }, [isOpen, pageType, initialSelectedIds]);
  
  const handleSaveChanges = () => {
    onSave(selectedRadioDefId ? [selectedRadioDefId] : []);
    onOpenChange(false);
  };
  
  // ----- BRANDING-SPECIFIC LOGIC -----
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

  // ----- UPSKILL-SPECIFIC LOGIC -----
  const linkedUpskillChildIds = useMemo(() => 
    new Set<string>((upskillDefinitions || []).flatMap(def => def.linkedUpskillIds || []))
  , [upskillDefinitions]);

  const curiositiesForProject = useMemo(() => {
    if (!selectedUpskillProject || pageType !== 'upskill') return [];
    
    const microSkillIdsInProject = new Set(
      selectedUpskillProject.features.flatMap(f => f.linkedSkills.map(l => l.microSkillId))
    );

    return (upskillDefinitions || []).filter(def => {
        const microSkillInfo = Array.from(microSkillMap.entries()).find(([,v]) => v.microSkillName === def.category);
        if (!microSkillInfo) return false;
        
        const microSkillId = microSkillInfo[0];
        if(!microSkillIdsInProject.has(microSkillId)) return false;

        const isParent = (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
        const isLinkedAsChild = linkedUpskillChildIds.has(def.id);
        
        return isParent && !isLinkedAsChild;
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [upskillDefinitions, selectedUpskillProject, pageType, linkedUpskillChildIds, microSkillMap]);

  const getVisualizationsRecursive = useCallback((nodeId: string): ExerciseDefinition[] => {
      const visited = new Set<string>();
      const visualizations: ExerciseDefinition[] = [];
      const queue: string[] = [nodeId];
  
      while (queue.length > 0) {
          const currentId = queue.shift()!;
          if (visited.has(currentId)) continue;
          visited.add(currentId);
  
          const node = upskillDefinitions.find(d => d.id === currentId);
          if (!node) continue;
  
          const isParent = (node.linkedUpskillIds?.length ?? 0) > 0 || (node.linkedResourceIds?.length ?? 0) > 0;
  
          if (!isParent) { // It's a Visualization
              visualizations.push(node);
          } else { // It's a Curiosity or Objective, so recurse
              (node.linkedUpskillIds || []).forEach(childId => {
                  if (!visited.has(childId)) {
                      queue.push(childId);
                  }
              });
          }
      }
      return visualizations.sort((a,b) => a.name.localeCompare(b.name));
  }, [upskillDefinitions]);

  const visualizationsForCuriosity = useMemo(() => {
    if (!selectedUpskillCuriosity || pageType !== 'upskill') return [];
    return getVisualizationsRecursive(selectedUpskillCuriosity.id);
  }, [selectedUpskillCuriosity, pageType, getVisualizationsRecursive]);


  // ----- DEEPWORK-SPECIFIC LOGIC -----
  const linkedDeepWorkChildIds = useMemo(() => new Set<string>((deepWorkDefinitions || []).flatMap(def => def.linkedDeepWorkIds || [])), [deepWorkDefinitions]);

  const getActionsRecursive = useCallback((nodeId: string): ExerciseDefinition[] => {
      const visited = new Set<string>();
      const actions: ExerciseDefinition[] = [];
      const queue: string[] = [nodeId];

      while (queue.length > 0) {
          const currentId = queue.shift()!;
          if (visited.has(currentId)) continue;
          visited.add(currentId);
  
          const node = deepWorkDefinitions.find(d => d.id === currentId);
          if (!node) continue;
  
          const isParent = (node.linkedDeepWorkIds?.length ?? 0) > 0 || (node.linkedUpskillIds?.length ?? 0) > 0 || (node.linkedResourceIds?.length ?? 0) > 0;
  
          if (!isParent) { // It's an Action
              actions.push(node);
          } else { // It's an Intention or Objective, so recurse
              (node.linkedDeepWorkIds || []).forEach(childId => {
                  if (!visited.has(childId)) queue.push(childId);
              });
          }
      }
      return actions.sort((a,b) => a.name.localeCompare(b.name));
  }, [deepWorkDefinitions]);

  const intentionsForProject = useMemo(() => {
    if (!selectedDeepWorkProject || pageType !== 'deepwork') return [];

    return (deepWorkDefinitions || []).filter(def => {
        const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
        const isChild = linkedDeepWorkChildIds.has(def.id);
        const isIntention = isParent && !isChild;

        if (!isIntention) return false;
        
        // This is a simplified check. A more robust check might trace up the project hierarchy.
        return (def.linkedProjectIds || []).includes(selectedDeepWorkProject.id);
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [deepWorkDefinitions, selectedDeepWorkProject, pageType, linkedDeepWorkChildIds]);

  const actionsForIntention = useMemo(() => {
    if (!selectedDeepWorkIntention || pageType !== 'deepwork') return [];
    return getActionsRecursive(selectedDeepWorkIntention.id);
  }, [selectedDeepWorkIntention, pageType, getActionsRecursive]);


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
                        <button
                            onClick={() => { setDeepWorkSelectionStep('project'); setSelectedDeepWorkProject(null); setSelectedDeepWorkIntention(null); }}
                            className="hover:text-foreground disabled:text-muted-foreground disabled:hover:text-muted-foreground disabled:cursor-not-allowed"
                            disabled={deepWorkSelectionStep === 'project'}
                        >
                            Projects
                        </button>
                        {selectedDeepWorkProject && (
                            <>
                                <ChevronRight className="h-4 w-4 mx-1" />
                                <button
                                    onClick={() => { setDeepWorkSelectionStep('intention'); setSelectedDeepWorkIntention(null); }}
                                    className="hover:text-foreground disabled:text-muted-foreground disabled:hover:text-muted-foreground disabled:cursor-not-allowed truncate max-w-[150px]"
                                    disabled={deepWorkSelectionStep === 'intention'}
                                    title={selectedDeepWorkProject.name}
                                >
                                    {selectedDeepWorkProject.name}
                                </button>
                            </>
                        )}
                        {selectedDeepWorkIntention && (
                            <>
                                <ChevronRight className="h-4 w-4 mx-1" />
                                <span className="font-medium text-foreground truncate max-w-[150px]" title={selectedDeepWorkIntention.name}>{selectedDeepWorkIntention.name}</span>
                            </>
                        )}
                    </div>
                    {deepWorkSelectionStep === 'project' && (
                        <div className="space-y-2">
                            {filteredProjects.map(project => ( 
                                <button key={project.id} onClick={() => { setSelectedDeepWorkProject(project); setDeepWorkSelectionStep('intention'); }} className="flex items-center justify-between w-full text-left p-3 rounded-md border bg-muted/20 hover:bg-accent transition-colors">
                                    <span className="font-medium">{project.name}</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            ))}
                        </div>
                    )}
                    {deepWorkSelectionStep === 'intention' && (
                        <div className="space-y-2">
                           {intentionsForProject.length > 0 ? intentionsForProject.map(intention => (
                                <button key={intention.id} onClick={() => { setSelectedDeepWorkIntention(intention); setDeepWorkSelectionStep('action'); }} className="flex items-center justify-between w-full text-left p-3 rounded-md border bg-muted/20 hover:bg-accent transition-colors">
                                    <div className='flex items-center gap-2 min-w-0'>
                                        <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                        <span className="font-medium truncate">{intention.name}</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            )) : <p className="text-sm text-center text-muted-foreground py-4">No Intentions linked to this project.</p>}
                        </div>
                    )}
                    {deepWorkSelectionStep === 'action' && (
                         <div className="space-y-2">
                           {actionsForIntention.length > 0 ? (
                                <RadioGroup value={selectedRadioDefId ?? ''} onValueChange={setSelectedRadioDefId} className="space-y-2">
                                {actionsForIntention.map(action => (
                                    <div key={action.id} className="flex items-center space-x-3 p-3 rounded-md border bg-muted/20 has-[[data-state=checked]]:bg-accent transition-colors">
                                        <RadioGroupItem value={action.id} id={`action-radio-${action.id}`} />
                                        <Label htmlFor={`action-radio-${action.id}`} className="font-normal w-full cursor-pointer flex items-center gap-2">
                                            <Bolt className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                            {action.name}
                                        </Label>
                                    </div>
                                ))}
                                </RadioGroup>
                           ) : <p className="text-sm text-center text-muted-foreground py-4">No actionable tasks found for this intention.</p>}
                        </div>
                    )}
                </div>
            ) : pageType === 'branding' ? (
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
            ) : ( // For upskill
                <div className="space-y-4">
                    <div className="flex items-center text-sm text-muted-foreground mb-4">
                        <button
                            onClick={() => {
                                setUpskillSelectionStep('project');
                                setSelectedUpskillProject(null);
                                setSelectedUpskillCuriosity(null);
                            }}
                            className="hover:text-foreground disabled:text-muted-foreground disabled:hover:text-muted-foreground disabled:cursor-not-allowed"
                            disabled={upskillSelectionStep === 'project'}
                        >
                            Projects
                        </button>
                        {selectedUpskillProject && (
                            <>
                                <ChevronRight className="h-4 w-4 mx-1" />
                                <button
                                    onClick={() => {
                                        setUpskillSelectionStep('curiosity');
                                        setSelectedUpskillCuriosity(null);
                                    }}
                                    className="hover:text-foreground disabled:text-muted-foreground disabled:hover:text-muted-foreground disabled:cursor-not-allowed truncate max-w-[150px]"
                                    disabled={upskillSelectionStep === 'curiosity'}
                                    title={selectedUpskillProject.name}
                                >
                                    {selectedUpskillProject.name}
                                </button>
                            </>
                        )}
                        {selectedUpskillCuriosity && (
                            <>
                                <ChevronRight className="h-4 w-4 mx-1" />
                                <span className="font-medium text-foreground truncate max-w-[150px]" title={selectedUpskillCuriosity.name}>{selectedUpskillCuriosity.name}</span>
                            </>
                        )}
                    </div>
                     {upskillSelectionStep === 'project' && (
                        <div className="space-y-2">
                            {filteredProjects.map(project => (
                                <button key={project.id} onClick={() => { setSelectedUpskillProject(project); setUpskillSelectionStep('curiosity'); }} className="flex items-center justify-between w-full text-left p-3 rounded-md border bg-muted/20 hover:bg-accent transition-colors">
                                    <span className="font-medium">{project.name}</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            ))}
                        </div>
                    )}
                    {upskillSelectionStep === 'curiosity' && (
                         <div className="space-y-2">
                            {curiositiesForProject.length > 0 ? curiositiesForProject.map(curiosity => (
                                <button key={curiosity.id} onClick={() => { setSelectedUpskillCuriosity(curiosity); setUpskillSelectionStep('visualization'); }} className="flex items-center justify-between w-full text-left p-3 rounded-md border bg-muted/20 hover:bg-accent transition-colors">
                                    <div className='flex items-center gap-2 min-w-0'>
                                        <Flashlight className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                        <span className="font-medium truncate">{curiosity.name}</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            )) : <p className="text-sm text-center text-muted-foreground py-4">No curiosities found for this project.</p>}
                        </div>
                    )}
                    {upskillSelectionStep === 'visualization' && (
                        <div className="space-y-2">
                            {visualizationsForCuriosity.length > 0 ? (
                                <RadioGroup value={selectedRadioDefId ?? ''} onValueChange={setSelectedRadioDefId} className="space-y-2">
                                {visualizationsForCuriosity.map(viz => (
                                    <div key={viz.id} className="flex items-center space-x-3 p-3 rounded-md border bg-muted/20 has-[[data-state=checked]]:bg-accent transition-colors">
                                        <RadioGroupItem value={viz.id} id={`viz-radio-${viz.id}`} />
                                        <Label htmlFor={`viz-radio-${viz.id}`} className="font-normal w-full cursor-pointer flex items-center gap-2">
                                            <Frame className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                            {viz.name}
                                        </Label>
                                    </div>
                                ))}
                                </RadioGroup>
                            ) : <p className="text-sm text-center text-muted-foreground py-4">No actionable visualizations found for this curiosity.</p>}
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
