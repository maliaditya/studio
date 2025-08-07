

"use client";

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from './ui/scroll-area';
import { Lightbulb, Flashlight, Library, Globe, Youtube, ExternalLink } from 'lucide-react';
import type { ExerciseDefinition, Resource } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import Image from 'next/image';

interface IntentionDetailModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  intention: ExerciseDefinition | null;
}

export function IntentionDetailModal({ isOpen, onOpenChange, intention }: IntentionDetailModalProps) {
  const { deepWorkDefinitions, upskillDefinitions, resources } = useAuth();
  
  const linkedItems = useMemo(() => {
    if (!intention) return { deepWork: [], upskill: [], resource: [] };

    const linkedDeepWork = (intention.linkedDeepWorkIds || [])
        .map(id => deepWorkDefinitions.find(d => d.id === id))
        .filter((d): d is ExerciseDefinition => !!d);

    const linkedUpskill = (intention.linkedUpskillIds || [])
        .map(id => upskillDefinitions.find(d => d.id === id))
        .filter((d): d is ExerciseDefinition => !!d);
        
    const linkedResources = (intention.linkedResourceIds || [])
        .map(id => resources.find(r => r.id === id))
        .filter((r): r is Resource => !!r);

    return { deepWork: linkedDeepWork, upskill: linkedUpskill, resource: linkedResources };
  }, [intention, deepWorkDefinitions, upskillDefinitions, resources]);

  if (!intention) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col p-2">
        <DialogHeader className="p-4 flex-shrink-0 border-b">
          <DialogTitle>Details for: {intention.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow min-h-0">
            <ScrollArea className="h-full p-4">
                <div className="space-y-6">
                    {linkedItems.deepWork.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5 text-green-500" />Linked Deep Work</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {linkedItems.deepWork.map(item => (
                                    <Card key={item.id}><CardHeader><CardTitle className="text-base">{item.name}</CardTitle><CardDescription>{item.category}</CardDescription></CardHeader></Card>
                                ))}
                            </div>
                        </div>
                    )}
                     {linkedItems.upskill.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2"><Flashlight className="h-5 w-5 text-amber-500" />Linked Learning</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {linkedItems.upskill.map(item => (
                                    <Card key={item.id}><CardHeader><CardTitle className="text-base">{item.name}</CardTitle><CardDescription>{item.category}</CardDescription></CardHeader></Card>
                                ))}
                            </div>
                        </div>
                    )}
                    {linkedItems.resource.length > 0 && (
                        <div>
                             <h3 className="font-semibold mb-2 flex items-center gap-2"><Library className="h-5 w-5 text-blue-500" />Linked Resources</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {linkedItems.resource.map(item => (
                                    <Card key={item.id}>
                                        <CardHeader className="flex-row items-center gap-3 space-y-0">
                                            {item.link && item.link.includes('youtube') ? <Youtube className="h-4 w-4 flex-shrink-0 text-red-500" /> : (item.iconUrl ? <Image src={item.iconUrl} alt="" width={16} height={16} className="flex-shrink-0" unoptimized/> : <Globe className="h-4 w-4 flex-shrink-0"/>)}
                                            <div className='min-w-0 flex-grow'>
                                                <CardTitle className="text-base truncate" title={item.name}>{item.name}</CardTitle>
                                                {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground truncate block hover:underline">{item.link}</a>}
                                            </div>
                                             {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 text-muted-foreground"/></a>}
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
