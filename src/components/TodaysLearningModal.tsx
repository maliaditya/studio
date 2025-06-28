
"use client";

import React, { useState, useEffect } from 'react';
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
import { BookOpenCheck, Briefcase, Share2, Save } from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface TodaysLearningModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  availableTasks: WorkoutExercise[];
  initialSelectedIds: string[];
  onSave: (selectedIds: string[]) => void;
  pageType: 'upskill' | 'deepwork' | 'branding';
  isAddingNewTasks: boolean;
  disabledTaskIds?: string[];
}

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
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(initialSelectedIds);

  useEffect(() => {
    // Sync state if initial props change while modal is open
    setSelectedTaskIds(initialSelectedIds);
  }, [initialSelectedIds, isOpen]);

  const handleToggleTask = (taskId: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSaveChanges = () => {
    onSave(selectedTaskIds);
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
          <ScrollArea className="h-full">
            {availableTasks.length > 0 ? (
              <div className="space-y-3 p-1">
                {availableTasks.map((task) => {
                  const isDisabled = disabledTaskIds.includes(task.id);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center space-x-3 p-3 rounded-md border has-[:checked]:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`task-${task.id}`}
                        checked={selectedTaskIds.includes(task.id)}
                        onCheckedChange={() => handleToggleTask(task.id)}
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
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                {info.icon}
                <p className="font-semibold">{isAddingNewTasks ? 'No Available Tasks' : info.emptyText}</p>
                 {isAddingNewTasks && (
                    <p className="text-sm mt-2">
                        No unlogged tasks were found. Visit the{' '}
                        <Link href={info.pageLink} className="font-medium text-primary underline underline-offset-4">
                            {info.pageName} page
                        </Link>
                        {' '}to add new tasks to your library.
                    </p>
                )}
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
