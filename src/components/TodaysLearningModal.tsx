
"use client"

import React, { useState, useEffect, useMemo } from 'react';
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
import { BookOpenCheck, Briefcase, Share2, Save, PlusCircle, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';

interface TodaysLearningModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  availableTasks: WorkoutExercise[];
  initialSelectedIds: string[];
  onSave: (selectedDefIds: string[]) => void;
  pageType: 'upskill' | 'deepwork' | 'branding';
  disabledTaskIds?: string[];
  deepWorkDefinitions?: ExerciseDefinition[];
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


  useEffect(() => {
    if (isOpen) {
      if (pageType === 'deepwork') {
        setSelectionStep('topic');
        setSelectedDeepWorkTopic(null);
        setSelectedDeepWorkObjective(null);
        setSelectedRadioDefId(initialSelectedIds.length > 0 ? initialSelectedIds[0] : null);
      } else {
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
  const { allTasksForToday, libraryTasks } = useMemo(() => {
    if (pageType !== 'upskill') return { allTasksForToday: [], libraryTasks: [] };
    const todaysLogDefIds = new Set(availableTasks.filter(t => !t.id.startsWith('lib-')).map(t => t.definitionId));
    
    let currentlySelectedIds: Set<string>;
    currentlySelectedIds = new Set(selectedRadioDefId ? [selectedRadioDefId] : []);
    
    const allConsideredDefIds = new Set([...todaysLogDefIds, ...currentlySelectedIds]);

    const scheduled: WorkoutExercise[] = [];
    const library: WorkoutExercise[] = [];
    const processedDefIds = new Set<string>();

    availableTasks.forEach(task => {
        if (processedDefIds.has(task.definitionId)) return;

        if (allConsideredDefIds.has(task.definitionId)) {
            scheduled.push(task);
        } else {
            library.push(task);
        }
        processedDefIds.add(task.definitionId);
    });
    return { allTasksForToday: scheduled, libraryTasks: library };
  }, [availableTasks, selectedRadioDefId, pageType]);
  
  // ----- DEEPWORK-SPECIFIC LOGIC -----
  const deepWorkTopics = useMemo(() => {
    if (pageType !== 'deepwork') return [];
    return [...new Set(deepWorkDefinitions.map(def => def.category))].sort();
  }, [deepWorkDefinitions, pageType]);

  const objectivesForTopic = useMemo(() => {
      if (!selectedDeepWorkTopic || pageType !== 'deepwork') return [];
      return deepWorkDefinitions.filter(
          def => def.category === selectedDeepWorkTopic && (def.linkedDeepWorkIds?.length ?? 0) > 0
      ).sort((a,b) => a.name.localeCompare(b.name));
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
                                    <span className="font-medium">{obj.name}</span>
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            )) : <p className="text-sm text-center text-muted-foreground py-4">No objectives found in this topic.</p>}
                        </div>
                    )}
                    {selectionStep === 'action' && (
                        <div className="space-y-2">
                           {actionsForObjective.length > 0 ? (
                                <RadioGroup value={selectedRadioDefId ?? ''} onValueChange={setSelectedRadioDefId} className="space-y-2">
                                {actionsForObjective.map(action => (
                                    <div key={action.id} className="flex items-center space-x-3 p-3 rounded-md border bg-muted/20 has-[[data-state=checked]]:bg-accent transition-colors">
                                        <RadioGroupItem value={action.id} id={`action-radio-${action.id}`} />
                                        <Label htmlFor={`action-radio-${action.id}`} className="font-normal w-full cursor-pointer">
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
                availableTasks.length > 0 ? (
                    <div className="space-y-4">
                        {allTasksForToday.length > 0 && (
                            <div>
                                <h4 className="mb-2 text-sm font-medium text-muted-foreground">Scheduled for Today</h4>
                                <RadioGroup value={selectedRadioDefId ?? ''} onValueChange={setSelectedRadioDefId} className="space-y-2">
                                {allTasksForToday.map(task => (
                                    <div key={task.id} className="flex items-center space-x-3 p-3 rounded-md border bg-muted/20 has-[[data-state=checked]]:bg-accent transition-colors">
                                    <RadioGroupItem
                                        value={task.definitionId}
                                        id={`task-radio-${task.id}`}
                                        disabled={disabledTaskIds.includes(task.definitionId)}
                                    />
                                    <Label htmlFor={`task-radio-${task.id}`} className={cn("font-normal w-full", disabledTaskIds.includes(task.definitionId) ? "cursor-not-allowed text-muted-foreground/50" : "cursor-pointer")}>
                                        <p className="font-medium">{task.name}</p>
                                        <p className="text-xs text-muted-foreground">{task.category}</p>
                                    </Label>
                                    </div>
                                ))}
                                </RadioGroup>
                            </div>
                        )}
                        {libraryTasks.length > 0 && (
                            <div>
                                <h4 className="mb-2 mt-4 text-sm font-medium text-muted-foreground">Available from Library</h4>
                                <div className="space-y-2">
                                {libraryTasks.map(task => (
                                    <div key={task.id} className="flex items-center justify-between space-x-3 p-3 rounded-md border bg-muted/20 transition-colors">
                                        <Label htmlFor={`task-${task.id}`} className="font-normal w-full cursor-default">
                                            <p className="font-medium">{task.name}</p>
                                            <p className="text-xs text-muted-foreground">{task.category}</p>
                                        </Label>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent-foreground" onClick={() => setSelectedRadioDefId(task.definitionId)} aria-label={`Add and select ${task.name}`}>
                                            <PlusCircle className="h-5 w-5" />
                                        </Button>
                                    </div>
                                ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                        {info.icon}
                        <p className="font-semibold">No Available Tasks</p>
                        <p className="text-sm mt-2">
                            Visit the{' '}
                            <Link href={info.pageLink} className="font-medium text-primary underline underline-offset-4">
                                {info.pageName} page
                            </Link>
                            {' '}to add new tasks to your library.
                        </p>
                    </div>
                )
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
