

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
import type { ExerciseDefinition, WorkoutExercise } from '@/types/workout';
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
}: TodaysLearningModalProps) {
  const { toast } = useToast();
  const [selectedRadioDefId, setSelectedRadioDefId] = useState<string | null>(null);

  // State for branding bundle creation
  const [newBundleName, setNewBundleName] = useState('');
  const [selectedFocusAreaIds, setSelectedFocusAreaIds] = useState<string[]>([]);
  
  // State for deep work selection flow
  const [selectionStep, setSelectionStep] = useState<'topic' | 'objective' | 'action'>('topic');
  const [selectedDeepWorkTopic, setSelectedDeepWorkTopic] = useState<string | null>(null);
  const [selectedDeepWorkObjective, setSelectedDeepWorkObjective] = useState<ExerciseDefinition | null>(null);

  // State for upskill selection flow
  const [upskillSelectionStep, setUpskillSelectionStep] = useState<'topic' | 'curiosity' | 'visualization'>('topic');
  const [selectedUpskillTopic, setSelectedUpskillTopic] = useState<string | null>(null);
  const [selectedUpskillCuriosity, setSelectedUpskillCuriosity] = useState<ExerciseDefinition | null>(null);


  useEffect(() => {
    if (isOpen) {
      if (pageType === 'deepwork') {
        setSelectionStep('topic');
        setSelectedDeepWorkTopic(null);
        setSelectedDeepWorkObjective(null);
        setSelectedRadioDefId(initialSelectedIds.length > 0 ? initialSelectedIds[0] : null);
      } else if (pageType === 'upskill') {
        setUpskillSelectionStep('topic');
        setSelectedUpskillTopic(null);
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
  const upskillTopics = useMemo(() => {
    if (pageType !== 'upskill') return [];
    return [...new Set(upskillDefinitions.map(def => def.category))].sort();
  }, [upskillDefinitions, pageType]);

  const linkedUpskillChildIds = useMemo(() => 
    new Set<string>((upskillDefinitions || []).flatMap(def => def.linkedUpskillIds || []))
  , [upskillDefinitions]);

  const curiositiesForTopic = useMemo(() => {
    if (!selectedUpskillTopic || pageType !== 'upskill') return [];

    return (upskillDefinitions || []).filter(def => {
        if (def.category !== selectedUpskillTopic) return false;
        
        const isParent = (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
        const isLinkedAsChild = linkedUpskillChildIds.has(def.id);
        
        return isParent && !isLinkedAsChild;
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [upskillDefinitions, selectedUpskillTopic, pageType, linkedUpskillChildIds]);
  
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
  const deepWorkTopics = useMemo(() => {
    if (pageType !== 'deepwork') return [];
    return [...new Set(deepWorkDefinitions.map(def => def.category))].sort();
  }, [deepWorkDefinitions, pageType]);

  const objectivesForTopic = useMemo(() => {
    if (!selectedDeepWorkTopic || pageType !== 'deepwork') return [];
    
    return deepWorkDefinitions.filter(objectiveDef => {
        if (objectiveDef.category !== selectedDeepWorkTopic) return false;
        
        // It must have children to be considered an objective.
        if ((objectiveDef.linkedDeepWorkIds?.length ?? 0) === 0) return false;

        // At least one of its children must be an "Action" (a task with no children).
        return objectiveDef.linkedDeepWorkIds!.some(childId => {
            const childDef = deepWorkDefinitions.find(d => d.id === childId);
            return childDef && (childDef.linkedDeepWorkIds?.length ?? 0) === 0;
        });
    }).sort((a,b) => a.name.localeCompare(b.name));
}, [deepWorkDefinitions, selectedDeepWorkTopic, pageType]);

  const actionsForObjective = useMemo(() => {
      if (!selectedDeepWorkObjective || pageType !== 'deepwork') return [];
      const childIds = new Set(selectedDeepWorkObjective.linkedDeepWorkIds || []);
      return deepWorkDefinitions.filter(
          def => childIds.has(def.id) && (def.linkedDeepWorkIds?.length ?? 0) === 0
      ).sort((a,b) => a.name.localeCompare(b.name));
  }, [deepWorkDefinitions, selectedDeepWorkObjective, pageType]);


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
                        onClick={() => {
                          setSelectionStep('topic');
                          setSelectedDeepWorkTopic(null);
                          setSelectedDeepWorkObjective(null);
                        }}
                        className="hover:text-foreground disabled:text-muted-foreground disabled:hover:text-muted-foreground disabled:cursor-not-allowed"
                        disabled={selectionStep === 'topic'}
                      >
                        Topics
                      </button>
                      {selectedDeepWorkTopic && (
                        <>
                          <ChevronRight className="h-4 w-4 mx-1" />
                          <button
                            onClick={() => {
                              setSelectionStep('objective');
                              setSelectedDeepWorkObjective(null);
                            }}
                            className="hover:text-foreground disabled:text-muted-foreground disabled:hover:text-muted-foreground disabled:cursor-not-allowed"
                            disabled={selectionStep === 'objective'}
                          >
                            {selectedDeepWorkTopic}
                          </button>
                        </>
                      )}
                      {selectedDeepWorkObjective && (
                        <>
                          <ChevronRight className="h-4 w-4 mx-1" />
                          <span className="font-medium text-foreground truncate" title={selectedDeepWorkObjective.name}>{selectedDeepWorkObjective.name}</span>
                        </>
                      )}
                    </div>
                    {selectionStep === 'topic' && (
                        <div className="space-y-2">
                            {deepWorkTopics.map(topic => (
                                <button key={topic} onClick={() => { setSelectedDeepWorkTopic(topic); setSelectionStep('objective'); }} className="flex items-center justify-between w-full text-left p-3 rounded-md border bg-muted/20 hover:bg-accent transition-colors">
                                    <span className="font-medium">{topic}</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            ))}
                        </div>
                    )}
                    {selectionStep === 'objective' && (
                        <div className="space-y-2">
                           {objectivesForTopic.length > 0 ? objectivesForTopic.map(obj => (
                                <button key={obj.id} onClick={() => { setSelectedDeepWorkObjective(obj); setSelectionStep('action'); }} className="flex items-center justify-between w-full text-left p-3 rounded-md border bg-muted/20 hover:bg-accent transition-colors">
                                    <div className='flex items-center gap-2 min-w-0'>
                                        <Flag className="h-4 w-4 text-green-500 flex-shrink-0" />
                                        <span className="font-medium truncate">{obj.name}</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            )) : <p className="text-sm text-center text-muted-foreground py-4">No objectives with actions found in this topic.</p>}
                        </div>
                    )}
                    {selectionStep === 'action' && (
                        <div className="space-y-2">
                           {actionsForObjective.length > 0 ? (
                                <RadioGroup value={selectedRadioDefId ?? ''} onValueChange={setSelectedRadioDefId} className="space-y-2">
                                {actionsForObjective.map(action => (
                                    <div key={action.id} className="flex items-center space-x-3 p-3 rounded-md border bg-muted/20 has-[[data-state=checked]]:bg-accent transition-colors">
                                        <RadioGroupItem value={action.id} id={`action-radio-${action.id}`} />
                                        <Label htmlFor={`action-radio-${action.id}`} className="font-normal w-full cursor-pointer flex items-center gap-2">
                                            <Bolt className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                            {action.name}
                                        </Label>
                                    </div>
                                ))}
                                </RadioGroup>
                           ) : <p className="text-sm text-center text-muted-foreground py-4">No actions found for this objective.</p>}
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
                                setUpskillSelectionStep('topic');
                                setSelectedUpskillTopic(null);
                                setSelectedUpskillCuriosity(null);
                            }}
                            className="hover:text-foreground disabled:text-muted-foreground disabled:hover:text-muted-foreground disabled:cursor-not-allowed"
                            disabled={upskillSelectionStep === 'topic'}
                        >
                            Topics
                        </button>
                        {selectedUpskillTopic && (
                            <>
                                <ChevronRight className="h-4 w-4 mx-1" />
                                <button
                                    onClick={() => {
                                        setUpskillSelectionStep('curiosity');
                                        setSelectedUpskillCuriosity(null);
                                    }}
                                    className="hover:text-foreground disabled:text-muted-foreground disabled:hover:text-muted-foreground disabled:cursor-not-allowed truncate max-w-[150px]"
                                    disabled={upskillSelectionStep === 'curiosity'}
                                    title={selectedUpskillTopic}
                                >
                                    {selectedUpskillTopic}
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
                    {upskillSelectionStep === 'topic' && (
                        <div className="space-y-2">
                            {upskillTopics.map(topic => (
                                <button key={topic} onClick={() => { setSelectedUpskillTopic(topic); setUpskillSelectionStep('curiosity'); }} className="flex items-center justify-between w-full text-left p-3 rounded-md border bg-muted/20 hover:bg-accent transition-colors">
                                    <span className="font-medium">{topic}</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            ))}
                        </div>
                    )}
                    {upskillSelectionStep === 'curiosity' && (
                         <div className="space-y-2">
                            {curiositiesForTopic.length > 0 ? curiositiesForTopic.map(curiosity => (
                                <button key={curiosity.id} onClick={() => { setSelectedUpskillCuriosity(curiosity); setUpskillSelectionStep('visualization'); }} className="flex items-center justify-between w-full text-left p-3 rounded-md border bg-muted/20 hover:bg-accent transition-colors">
                                    <div className='flex items-center gap-2 min-w-0'>
                                        <Flashlight className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                        <span className="font-medium truncate">{curiosity.name}</span>
                                    </div>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            )) : <p className="text-sm text-center text-muted-foreground py-4">No curiosities found in this topic.</p>}
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
