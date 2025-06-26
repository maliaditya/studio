
"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WorkoutExercise } from '@/types/workout';
import { BookOpenCheck, Briefcase, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

interface TodaysLearningModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  tasks: WorkoutExercise[];
  title: string;
  description: string;
  pageType: 'upskill' | 'deepwork' | 'branding';
}

export function TodaysLearningModal({
  isOpen,
  onOpenChange,
  tasks,
  title,
  description,
  pageType
}: TodaysLearningModalProps) {
  const router = useRouter();

  const handleGoToPage = () => {
    onOpenChange(false);
    const path = pageType === 'branding' ? '/personal-branding' : `/${pageType}`;
    router.push(path);
  };

  const icon = pageType === 'upskill' 
    ? <BookOpenCheck className="h-12 w-12 mb-4" /> 
    : pageType === 'deepwork' 
    ? <Briefcase className="h-12 w-12 mb-4" /> 
    : <Share2 className="h-12 w-12 mb-4" />;
  
  const pageName = pageType === 'upskill' ? 'Upskill' : pageType === 'deepwork' ? 'Deep Work' : 'Personal Branding';


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full">
            {tasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Topic</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.name}</TableCell>
                      <TableCell>{task.category}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                {icon}
                <p className="font-semibold">No sessions planned for today!</p>
                <p className="text-sm">You can add tasks on the dedicated page.</p>
                <Button onClick={handleGoToPage} variant="link" className="mt-2">
                  Go to {pageName} page
                </Button>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
