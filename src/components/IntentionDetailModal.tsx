
"use client";

import React from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from './ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { BookCopy, Link as LinkIcon, Briefcase, ExternalLink, Globe, Workflow } from 'lucide-react';
import type { ExerciseDefinition, Resource } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';

interface IntentionDetailModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  intention: ExerciseDefinition | null;
}

const getYouTubeThumbnailUrl = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        let videoId: string | null = null;
        if (urlObj.hostname.includes('youtube.com')) videoId = urlObj.searchParams.get('v');
        else if (urlObj.hostname.includes('youtu.be')) videoId = urlObj.pathname.slice(1);
        if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    } catch (e) {}
    return null;
};

export function IntentionDetailModal({ isOpen, onOpenChange, intention }: IntentionDetailModalProps) {
  const { upskillDefinitions, deepWorkDefinitions, resources, resourceFolders } = useAuth();

  if (!intention) return null;

  const linkedLearningTasks = (intention.linkedUpskillIds || []).map(id => upskillDefinitions.find(d => d.id === id)).filter(Boolean) as ExerciseDefinition[];
  const linkedWorkTasks = (intention.linkedDeepWorkIds || []).map(id => deepWorkDefinitions.find(d => d.id === id)).filter(Boolean) as ExerciseDefinition[];
  const isIntentionCheck = (def: ExerciseDefinition) => (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;

  const solutionText = [
    ...linkedWorkTasks.map(t => t.name),
    ...linkedLearningTasks.map(t => t.name)
  ].join(' + ');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Conceptual Flow: {intention.name}</DialogTitle>
          <DialogDescription>
            This diagram illustrates the strategic path from your current state to your desired outcome.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0 flex items-center justify-center p-8">
            <div className="relative w-full h-full max-w-3xl">
                {/* SVG for lines */}
                <svg className="absolute top-0 left-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <marker id="arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
                        </marker>
                    </defs>
                    {/* Base line */}
                    <line x1="5%" y1="90%" x2="95%" y2="90%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                    {/* Left line */}
                    <line x1="5%" y1="90%" x2="50%" y2="10%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                    {/* Right line */}
                    <line x1="50%" y1="10%" x2="95%" y2="90%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                </svg>

                {/* Text labels */}
                <div className="absolute left-[5%] bottom-[10%] -translate-x-1/2 translate-y-[150%] text-center">
                    <p className="font-semibold text-foreground">Current state</p>
                </div>
                
                <div className="absolute left-1/2 top-[10%] -translate-x-1/2 -translate-y-[150%] text-center w-full px-4">
                    <p className="font-semibold text-foreground text-lg">Solution</p>
                    <p className="text-sm text-muted-foreground truncate" title={solutionText || 'Define linked tasks'}>
                        {solutionText || 'Define linked tasks'}
                    </p>
                </div>

                <div className="absolute right-[5%] bottom-[10%] translate-x-1/2 translate-y-[150%] text-center">
                     <p className="font-semibold text-foreground">Outcome</p>
                     <p className="text-sm text-muted-foreground">To be defined</p>
                </div>

                <div className="absolute left-1/2 bottom-[10%] -translate-x-1/2 translate-y-[120%] text-center w-full px-4">
                     <p className="font-semibold text-foreground text-lg">Intention</p>
                     <p className="text-sm text-muted-foreground truncate" title={intention.name}>
                        {intention.name}
                     </p>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
