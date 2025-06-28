
"use client";

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
import { Separator } from './ui/separator';

interface TodaysLearningModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  availableTasks: WorkoutExercise[];
  initialSelectedIds: string[];
  onSave: (allTodaysDefIds: string[], selectedDefIdsForSlot: string[]) => void;
  pageType: 'upskill' | 'deepwork' | 'branding';
  isAddingNewTasks: boolean;
  disabledTaskIds?: string[];
}

const ScheduledTaskItem = ({ task, isDisabled, selected, onToggle }: { task: WorkoutExercise; isDisabled: boolean; selected: boolean; onToggle: () => void; }) => (
  <div
    className="flex items-center space-x-3 p-3 rounded-md border has-[:checked]:bg-muted/50 transition-colors"
  >
    <Checkbox
      id={`task-${task.definitionId}`}
      checked={selected}
      onCheckedChange={onToggle}
      disabled={isDisabled}
    />
    <Label
      htmlFor={`task-${task.definitionId}`}
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

const LibraryTaskItem = ({ task, onAdd }: { task: WorkoutExercise; onAdd: () => void; }) => (
    <div className="flex items-center justify-between space-x-3 p-3 rounded-md border transition-colors">
        <Label htmlFor={`task-${task.definitionId}`} className="font-normal w-full cursor-default">
            <p className="font-medium">{task.name}</p>
            <p className="text-xs text-muted-foreground">{task.category}</p>
        </Label>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-accent-foreground" onClick={onAdd} aria-label={`Add ${task.name} to today's session`}>
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
  isAddingNewTasks,
  disabledTaskIds = [],
}: TodaysLearningModalProps) {
  const [scheduledTasks, setScheduledTasks] = useState<WorkoutExercise[]>([]);
  const [libraryTasks, setLibraryTasks] = useState<WorkoutExercise[]>([]);
  const [selectedDefIds, setSelectedDefIds] = useState<string[]>([]);


  useEffect(() => {
    if(isOpen) {
      const todaysDefIds = new Set(initialSelectedIds.concat(disabledTaskIds));
      
      const initialScheduled = availableTasks.filter(task => todaysDefIds.has(task.definitionId));
      const initialLibrary = availableTasks.filter(task => !todaysDefIds.has(task.definitionId));

      setScheduledTasks(initialScheduled);
      setLibraryTasks(initialLibrary);
      setSelectedDefIds(initialSelectedIds);
    }
  }, [isOpen, availableTasks, initialSelectedIds, disabledTaskIds]);

  const handleAddTaskToDay = (taskToAdd: WorkoutExercise) => {
    setLibraryTasks(prev => prev.filter(t => t.id !== taskToAdd.id));
    setScheduledTasks(prev => [...prev, taskToAdd]);
  };

  const handleToggleScheduledTask = (defId: string) => {
    setSelectedDefIds(prev => 
      prev.includes(defId)
        ? prev.filter(id => id !== defId)
        : [...prev, defId]
    );
  };
  
  const handleSaveChanges = () => {
    const allTodaysDefIds = scheduledTasks.map(t => t.definitionId);
    onSave(allTodaysDefIds, selectedDefIds);
    onOpenChange(false);
  };

  const pageInfo = {
    upskill: {
      icon: <BookOpenCheck className="h-12 w-12 mb-4" />,
      title: 'Upskill Session Tasks',
      description: 'Select the tasks you plan to focus on for this session slot.',
      emptyText: 'No learning tasks scheduled for today.',
      pageLink: '/upskill',
      pageName: 'Upskill'
    },
    deepwork: {
      icon: <Briefcase className="h-12 w-12 mb-4" />,
      title: 'Deep Work Session Tasks',
      description: 'Select the focus areas for this session slot.',
      emptyText: 'No focus areas added to the session for today.',
      pageLink: '/deep-work',
      pageName: 'Deep Work'
    },
    branding: {
      icon: <Share2 className="h-12 w-12 mb-4" />,
      title: 'Branding Session Tasks',
      description: 'Select the content bundles to work on for this session slot.',
      emptyText: 'No branding tasks scheduled for today.',
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
                {scheduledTasks.length > 0 && (
                  <div>
                      <h4 className="mb-2 text-sm font-medium text-muted-foreground">Scheduled for Today</h4>
                      <div className="space-y-2">
                        {scheduledTasks.map(task => (
                           <ScheduledTaskItem 
                            key={task.definitionId} 
                            task={task} 
                            isDisabled={disabledTaskIds.includes(task.definitionId)}
                            selected={selectedDefIds.includes(task.definitionId)}
                            onToggle={() => handleToggleScheduledTask(task.definitionId)}
                          />
                        ))}
                      </div>
                  </div>
                )}
                
                {libraryTasks.length > 0 && (
                     <div>
                        <h4 className="mb-2 mt-4 text-sm font-medium text-muted-foreground">Available from Library</h4>
                        <div className="space-y-2">
                           {libraryTasks.map(task => (
                             <LibraryTaskItem 
                              key={task.definitionId} 
                              task={task} 
                              onAdd={() => handleAddTaskToDay(task)}
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
