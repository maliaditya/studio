

"use client";

import React, { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from './ui/scroll-area';
import { Lightbulb, Flashlight, Library, Globe, Youtube, ExternalLink, Briefcase, BookCopy, ArrowLeft, Frame, Code, MessageSquare, ArrowRight } from 'lucide-react';
import type { ExerciseDefinition, Resource } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import Image from 'next/image';
import { Button } from './ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface IntentionDetailModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  intention: ExerciseDefinition | null;
  linkedUpskillChildIds: Set<string>;
}

export function IntentionDetailModal({ isOpen, onOpenChange, intention, linkedUpskillChildIds }: IntentionDetailModalProps) {
  const { deepWorkDefinitions, upskillDefinitions, resources } = useAuth();
  const [navigationStack, setNavigationStack] = useState<ExerciseDefinition[]>([]);

  useEffect(() => {
    if (isOpen && intention) {
      setNavigationStack([intention]);
    } else if (!isOpen) {
      // Reset stack when modal is closed
      setNavigationStack([]);
    }
  }, [isOpen, intention]);

  const currentItem = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1] : null;

  const linkedItems = useMemo(() => {
    if (!currentItem) return { deepWork: [], upskill: [], resource: [] };

    const linkedDeepWork = (currentItem.linkedDeepWorkIds || [])
        .map(id => deepWorkDefinitions.find(d => d.id === id))
        .filter((d): d is ExerciseDefinition => !!d);

    const linkedUpskill = (currentItem.linkedUpskillIds || [])
        .map(id => upskillDefinitions.find(d => d.id === id))
        .filter((d): d is ExerciseDefinition => !!d);
        
    const linkedResources = (currentItem.linkedResourceIds || [])
        .map(id => resources.find(r => r.id === id))
        .filter((r): r is Resource => !!r);

    return { deepWork: linkedDeepWork, upskill: linkedUpskill, resource: linkedResources };
  }, [currentItem, deepWorkDefinitions, upskillDefinitions, resources]);
  
  const handleDrillDown = (subtask: ExerciseDefinition) => {
    setNavigationStack(prev => [...prev, subtask]);
  };
  
  const handleGoBack = () => {
    setNavigationStack(prev => prev.slice(0, prev.length - 1));
  };
  
  const getIcon = (item: ExerciseDefinition) => {
    const isUpskill = upskillDefinitions.some(d => d.id === item.id);
    if (isUpskill) {
        const isParent = (item.linkedUpskillIds?.length ?? 0) > 0 || (item.linkedResourceIds?.length ?? 0) > 0;
        const isChild = linkedUpskillChildIds.has(item.id);
        if (isParent && !isChild) return <Flashlight className="h-4 w-4 text-amber-500" />; // Curiosity
        if (!isParent && isChild) return <Frame className="h-4 w-4 text-blue-500" />; // Visualization
        return <BookCopy className="h-4 w-4 text-amber-500" />;
    }
    return <Lightbulb className="h-4 w-4 text-green-500" />;
  };


  if (!currentItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col p-2">
        <DialogHeader className="p-4 flex-shrink-0 border-b flex flex-row items-center">
            {navigationStack.length > 1 && (
              <Button variant="ghost" size="icon" onClick={handleGoBack} className="mr-2 h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>Details for: {currentItem.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow min-h-0">
            <ScrollArea className="h-full p-4">
                <div className="space-y-6">
                    {linkedItems.deepWork.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2"><Briefcase className="h-5 w-5 text-green-500" />Linked Deep Work</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {linkedItems.deepWork.map(item => (
                                    <Card key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleDrillDown(item)}>
                                      <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            {getIcon(item)}
                                            {item.name}
                                        </CardTitle>
                                        <CardDescription>{item.category}</CardDescription>
                                      </CardHeader>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                     {linkedItems.upskill.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2"><BookCopy className="h-5 w-5 text-amber-500" />Linked Learning</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {linkedItems.upskill.map(item => (
                                    <Card key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleDrillDown(item)}>
                                      <CardHeader>
                                          <CardTitle className="text-base flex items-center gap-2">
                                            {getIcon(item)}
                                            {item.name}
                                          </CardTitle>
                                          <CardDescription>{item.category}</CardDescription>
                                      </CardHeader>
                                      {item.linkedResourceIds && item.linkedResourceIds.length > 0 && (
                                        <CardContent className="pt-2">
                                            <div className="text-xs text-muted-foreground">
                                                {item.linkedResourceIds.length} resource(s) linked.
                                            </div>
                                        </CardContent>
                                      )}
                                    </Card>
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
                                        {item.type === 'card' ? (
                                             <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Library className="h-4 w-4 text-primary" />
                                                    {item.name}
                                                </CardTitle>
                                                <CardContent className="p-0 pt-2 text-xs">
                                                     <ul className="space-y-2 text-muted-foreground pr-2">
                                                        {(item.points || []).map(point => (
                                                            <li key={point.id} className="flex items-start gap-2">
                                                                {point.type === 'code' ? <Code className="h-4 w-4 mt-0.5" /> : point.type === 'markdown' ? <MessageSquare className="h-4 w-4 mt-0.5" /> : <ArrowRight className="h-4 w-4 mt-0.5" />}
                                                                {point.type === 'card' && point.resourceId ? (
                                                                    <button onClick={(e) => { e.stopPropagation(); const subItem = resources.find(r => r.id === point.resourceId); if(subItem) handleDrillDown(subItem as any); }} className="text-left font-medium text-primary hover:underline">{point.text}</button>
                                                                ) : point.type === 'code' ? (
                                                                    <pre className="w-full bg-muted/50 p-1 rounded-sm text-xs font-mono whitespace-pre-wrap break-words">{point.text}</pre>
                                                                ) : (
                                                                    <div className="w-full prose dark:prose-invert prose-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text || ""}</ReactMarkdown></div>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </CardContent>
                                            </CardHeader>
                                        ) : (
                                            <CardHeader className="flex-row items-center gap-3 space-y-0">
                                                {item.link && item.link.includes('youtube') ? <Youtube className="h-4 w-4 flex-shrink-0 text-red-500" /> : (item.iconUrl ? <Image src={item.iconUrl} alt="" width={16} height={16} className="flex-shrink-0" unoptimized/> : <Globe className="h-4 w-4 flex-shrink-0"/>)}
                                                <div className='min-w-0 flex-grow'>
                                                    <CardTitle className="text-base truncate" title={item.name}>{item.name}</CardTitle>
                                                    {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground truncate block hover:underline">{item.link}</a>}
                                                </div>
                                                {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 text-muted-foreground"/></a>}
                                            </CardHeader>
                                        )}
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
