
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
  const { microSkillMap, getDeepWorkNodeType, getUpskillNodeType } = useAuth();
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
    const activeProjectIds = new Set<string>();
    const today = startOfToday();

    (projects || []).forEach(project => {
        // Check productization plans - assuming any project with a plan is active
        if (productizationPlans && productizationPlans[project.name]) {
            activeProjectIds.add(project.id);
            return;
        }

        // Check offerization plans for releases linked to this project by name
        const isOfferedAndActive = Object.values(offerizationPlans).some(plan => 
            plan.releases?.some(release => {
                if (release.name !== project.name) return false;
                try {
                    const launchDate = parseISO(release.launchDate);
                    return isAfter(launchDate, today) || format(launchDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                } catch { return false; }
            })
        );
        if (isOfferedAndActive) {
            activeProjectIds.add(project.id);
        }
    });

    return (projects || []).filter(p => activeProjectIds.has(p.id));
  }, [projects, productizationPlans, offerizationPlans]);

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
  const curiositiesForProject = useMemo(() => {
    if (!selectedUpskillProject || pageType !== 'upskill') return [];
    return (upskillDefinitions || []).filter(def => {
        if (getUpskillNodeType(def) !== 'Curiosity') {
            return false;
        }
        return (def.linkedProjectIds || []).includes(selectedUpskillProject.id);
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [upskillDefinitions, selectedUpskillProject, pageType, getUpskillNodeType]);

  const getObjectivesRecursive = useCallback((nodeId: string): ExerciseDefinition[] => {
      const visited = new Set<string>();
      const objectives: ExerciseDefinition[] = [];
      const queue: string[] = [nodeId];
  
      while (queue.length > 0) {
          const currentId = queue.shift()!;
          if (visited.has(currentId)) continue;
          visited.add(currentId);
  
          const node = upskillDefinitions.find(d => d.id === currentId);
          if (!node) continue;
  
          if (getUpskillNodeType(node) === 'Objective') {
              objectives.push(node);
          }
          (node.linkedUpskillIds || []).forEach(childId => {
              if (!visited.has(childId)) {
                  queue.push(childId);
              }
          });
      }
      return objectives.sort((a,b) => a.name.localeCompare(b.name));
  }, [upskillDefinitions, getUpskillNodeType]);

  const objectivesForCuriosity = useMemo(() => {
    if (!selectedUpskillCuriosity || pageType !== 'upskill') return [];
    return getObjectivesRecursive(selectedUpskillCuriosity.id);
  }, [selectedUpskillCuriosity, pageType, getObjectivesRecursive]);


  // ----- DEEPWORK-SPECIFIC LOGIC -----
  const getObjectivesForIntentionRecursive = useCallback((nodeId: string): ExerciseDefinition[] => {
      const visited = new Set<string>();
      const objectives: ExerciseDefinition[] = [];
      const queue: string[] = [nodeId];

      while (queue.length > 0) {
          const currentId = queue.shift()!;
          if (visited.has(currentId)) continue;
          visited.add(currentId);
  
          const node = deepWorkDefinitions.find(d => d.id === currentId);
          if (!node) continue;
  
          if(getDeepWorkNodeType(node) === 'Objective') {
              objectives.push(node);
          }
          (node.linkedDeepWorkIds || []).forEach(childId => {
              if (!visited.has(childId)) queue.push(childId);
          });
      }
      return objectives.sort((a,b) => a.name.localeCompare(b.name));
  }, [deepWorkDefinitions, getDeepWorkNodeType]);

  const intentionsForProject = useMemo(() => {
    if (!selectedDeepWorkProject || pageType !== 'deepwork') return [];

    return (deepWorkDefinitions || []).filter(def => {
        if (getDeepWorkNodeType(def) !== 'Intention') return false;
        return (def.linkedProjectIds || []).includes(selectedDeepWorkProject.id);
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [deepWorkDefinitions, selectedDeepWorkProject, pageType, getDeepWorkNodeType]);

  const objectivesForIntention = useMemo(() => {
    if (!selectedDeepWorkIntention || pageType !== 'deepwork') return [];
    return getObjectivesForIntentionRecursive(selectedDeepWorkIntention.id);
  }, [selectedDeepWorkIntention, pageType, getObjectivesForIntentionRecursive]);


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
                           {objectivesForIntention.length > 0 ? (
                                <RadioGroup value={selectedRadioDefId ?? ''} onValueChange={setSelectedRadioDefId} className="space-y-2">
                                {objectivesForIntention.map(objective => (
                                    <div key={objective.id} className="flex items-center space-x-3 p-3 rounded-md border bg-muted/20 has-[[data-state=checked]]:bg-accent transition-colors">
                                        <RadioGroupItem value={objective.id} id={`objective-radio-${objective.id}`} />
                                        <Label htmlFor={`objective-radio-${objective.id}`} className="font-normal w-full cursor-pointer flex items-center gap-2">
                                            <Flag className="h-4 w-4 text-green-500 flex-shrink-0" />
                                            {objective.name}
                                        </Label>
                                    </div>
                                ))}
                                </RadioGroup>
                           ) : <p className="text-sm text-center text-muted-foreground py-4">No actionable objectives found for this intention.</p>}
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
                            {objectivesForCuriosity.length > 0 ? (
                                <RadioGroup value={selectedRadioDefId ?? ''} onValueChange={setSelectedRadioDefId} className="space-y-2">
                                {objectivesForCuriosity.map(objective => (
                                    <div key={objective.id} className="flex items-center space-x-3 p-3 rounded-md border bg-muted/20 has-[[data-state=checked]]:bg-accent transition-colors">
                                        <RadioGroupItem value={objective.id} id={`objective-radio-${objective.id}`} />
                                        <Label htmlFor={`objective-radio-${objective.id}`} className="font-normal w-full cursor-pointer flex items-center gap-2">
                                            <Flag className="h-4 w-4 text-green-500 flex-shrink-0" />
                                            {objective.name}
                                        </Label>
                                    </div>
                                ))}
                                </RadioGroup>
                            ) : <p className="text-sm text-center text-muted-foreground py-4">No actionable objectives found for this curiosity.</p>}
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
