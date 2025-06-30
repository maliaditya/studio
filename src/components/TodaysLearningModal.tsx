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
import type { WorkoutExercise } from '@/types/workout';
import { BookOpenCheck, Briefcase, Share2, Save, PlusCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface TodaysLearningModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  availableTasks: WorkoutExercise[];
  initialSelectedIds: string[];
  onSave: (selectedDefIds: string[]) => void;
  pageType: 'upskill' | 'deepwork' | 'branding';
  disabledTaskIds?: string[];
}

const ScheduledTaskItem = ({ task, isDisabled, selected, onToggle }: { task: WorkoutExercise; isDisabled: boolean; selected: boolean; onToggle: () => void; }) => (
  <div
    className="flex items-center space-x-3 p-3 rounded-md border has-[:checked]:bg-muted/50 transition-colors"
  >
    <Checkbox
      id={`task-${task.id}`}
      checked={selected}
      onCheckedChange={onToggle}
      disabled={isDisabled}
    />
    <Label
      htmlFor={`task-${task.id}`}
      className={cn(
        "font-normal w-full",
        isDisabled ? "cursor-not-allowed text-muted-foreground/50" : "cursor-pointer"
      )}
    >
      <p className="font-medium">{task.name}</p>
      <p className="text-xs text-muted-foreground">{task.category}</p>
    </Label>
  </div>
);

const LibraryTaskItem = ({ task, onAddAndSelect }: { task: WorkoutExercise; onAddAndSelect: () => void; }) => (
    <div className="flex items-center justify-between space-x-3 p-3 rounded-md border transition-colors">
        <Label htmlFor={`task-${task.id}`} className="font-normal w-full cursor-default">
            <p className="font-medium">{task.name}</p>
            <p className="text-xs text-muted-foreground">{task.category}</p>
        </Label>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent-foreground" onClick={onAddAndSelect} aria-label={`Add and select ${task.name}`}>
            <PlusCircle className="h-5 w-5" />
        </Button>
    </div>
);


export function TodaysLearningModal({
  isOpen,
  onOpenChange,
  availableTasks,
  initialSelectedIds,
  onSave,
  pageType,
  disabledTaskIds = [],
}: TodaysLearningModalProps) {
  const [selectedDefinitionIds, setSelectedDefinitionIds] = useState<string[]>(initialSelectedIds);
  const [selectedRadioDefId, setSelectedRadioDefId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (pageType === 'deepwork') {
        setSelectedRadioDefId(initialSelectedIds.length > 0 ? initialSelectedIds[0] : null);
        setSelectedDefinitionIds([]); // Clear checkbox state
      } else {
        setSelectedDefinitionIds(initialSelectedIds);
        setSelectedRadioDefId(null); // Clear radio state
      }
    }
  }, [isOpen, initialSelectedIds, pageType]);

  const handleToggleSelection = (defId: string) => {
    setSelectedDefinitionIds(currentIds => {
      const newIds = new Set(currentIds);
      if (newIds.has(defId)) {
        newIds.delete(defId);
      } else {
        newIds.add(defId);
      }
      return Array.from(newIds);
    });
  };

  const handleAddAndSelect = (defId: string) => {
    if (pageType === 'deepwork') {
      setSelectedRadioDefId(defId);
    } else {
      setSelectedDefinitionIds(currentIds => Array.from(new Set([...currentIds, defId])));
    }
  };

  const handleSaveChanges = () => {
    if (pageType === 'deepwork') {
      onSave(selectedRadioDefId ? [selectedRadioDefId] : []);
    } else {
      onSave(selectedDefinitionIds);
    }
    onOpenChange(false);
  };
  
  const { allTasksForToday, libraryTasks } = useMemo(() => {
    const todaysLogDefIds = new Set(availableTasks.filter(t => !t.id.startsWith('lib-')).map(t => t.definitionId));
    
    let currentlySelectedIds: Set<string>;
    if (pageType === 'deepwork') {
        currentlySelectedIds = new Set(selectedRadioDefId ? [selectedRadioDefId] : []);
    } else {
        currentlySelectedIds = new Set(selectedDefinitionIds);
    }
    
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
  }, [availableTasks, selectedDefinitionIds, selectedRadioDefId, pageType]);
  
  const pageInfo = {
    upskill: {
      icon: <BookOpenCheck className="h-12 w-12 mb-4" />,
      title: 'Upskill Session Tasks',
      description: 'Select the tasks you plan to focus on for this session slot.',
      pageLink: '/upskill',
      pageName: 'Upskill'
    },
    deepwork: {
      icon: <Briefcase className="h-12 w-12 mb-4" />,
      title: 'Deep Work Session Tasks',
      description: 'Select a focus area for this session slot.',
      pageLink: '/deep-work',
      pageName: 'Deep Work'
    },
    branding: {
      icon: <Share2 className="h-12 w-12 mb-4" />,
      title: 'Branding Session Tasks',
      description: 'Select the content bundles to work on for this session slot.',
      pageLink: '/personal-branding',
      pageName: 'Personal Branding'
    }
  };

  const info = pageInfo[pageType];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{info.title}</DialogTitle>
          <DialogDescription>{info.description}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-4">
            {availableTasks.length > 0 ? (
              <div className="space-y-4">
                {allTasksForToday.length > 0 && (
                  <div>
                      <h4 className="mb-2 text-sm font-medium text-muted-foreground">Scheduled for Today</h4>
                      {pageType === 'deepwork' ? (
                        <RadioGroup
                          value={selectedRadioDefId ?? ''}
                          onValueChange={setSelectedRadioDefId}
                          className="space-y-2"
                        >
                          {allTasksForToday.map(task => (
                            <div key={task.id} className="flex items-center space-x-3 p-3 rounded-md border has-[[data-state=checked]]:bg-muted/50 transition-colors">
                              <RadioGroupItem
                                value={task.definitionId}
                                id={`task-radio-${task.id}`}
                                disabled={disabledTaskIds.includes(task.definitionId)}
                              />
                              <Label
                                htmlFor={`task-radio-${task.id}`}
                                className={cn(
                                  "font-normal w-full",
                                  disabledTaskIds.includes(task.definitionId) ? "cursor-not-allowed text-muted-foreground/50" : "cursor-pointer"
                                )}
                              >
                                <p className="font-medium">{task.name}</p>
                                <p className="text-xs text-muted-foreground">{task.category}</p>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <div className="space-y-2">
                          {allTasksForToday.map(task => (
                             <ScheduledTaskItem 
                              key={task.id} 
                              task={task} 
                              isDisabled={disabledTaskIds.includes(task.definitionId)}
                              selected={selectedDefinitionIds.includes(task.definitionId)}
                              onToggle={() => handleToggleSelection(task.definitionId)}
                            />
                          ))}
                        </div>
                      )}
                  </div>
                )}
                
                {libraryTasks.length > 0 && (
                     <div>
                        <h4 className="mb-2 mt-4 text-sm font-medium text-muted-foreground">Available from Library</h4>
                        <div className="space-y-2">
                           {libraryTasks.map(task => (
                             <LibraryTaskItem 
                              key={task.id} 
                              task={task} 
                              onAddAndSelect={() => handleAddAndSelect(task.definitionId)}
                            />
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
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
            <Button onClick={handleSaveChanges} disabled={availableTasks.length === 0}>
                <Save className="mr-2 h-4 w-4" />
                Save Selections
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
