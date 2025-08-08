

"use client";

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from './ui/scroll-area';
import { Lightbulb, Flashlight, Library, Globe, Youtube, ExternalLink, Briefcase, BookCopy, ArrowLeft, Frame, Code, MessageSquare, ArrowRight, GitMerge, GripVertical, X } from 'lucide-react';
import type { ExerciseDefinition, Resource, PopupState as IntentionPopupState, ResourcePoint } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import Image from 'next/image';
import { Button } from './ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDraggable } from '@dnd-kit/core';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface IntentionDetailPopupProps {
  popupState: IntentionPopupState;
  onClose: (id: string) => void;
}

const getYouTubeEmbedUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        let videoId: string | null = null;
        if (urlObj.hostname.includes('youtube.com')) {
            if (urlObj.pathname.startsWith('/shorts/')) {
                videoId = urlObj.pathname.split('/shorts/')[1];
            } else {
                videoId = urlObj.searchParams.get('v');
            }
        } else if (urlObj.hostname.includes('youtu.be')) {
            videoId = urlObj.pathname.slice(1);
        }
        if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=0`;
    } catch (e) {}
    return null;
};

const ResourceItem = ({ item, onOpenNestedPopup }: { item: Resource, onOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void }) => {
    const youtubeEmbedUrl = getYouTubeEmbedUrl(item.link);
    return (
        <Card 
          className={item.type === 'card' ? "cursor-pointer hover:bg-muted/50" : ""}
          onClick={(e) => {
              if (item.type === 'card') {
                  e.stopPropagation();
                  onOpenNestedPopup(item.id, e);
              }
          }}
        >
            {item.type === 'card' ? (
                 <CardHeader className="p-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Library className="h-4 w-4 text-primary" />
                        {item.name}
                    </CardTitle>
                </CardHeader>
            ) : (
                <CardHeader className="flex-row items-center gap-3 space-y-0 p-3">
                    {youtubeEmbedUrl ? <Youtube className="h-4 w-4 flex-shrink-0 text-red-500" /> : (item.iconUrl ? <Image src={item.iconUrl} alt="" width={16} height={16} className="flex-shrink-0" unoptimized/> : <Globe className="h-4 w-4 flex-shrink-0"/>)}
                    <div className='min-w-0 flex-grow'>
                        <CardTitle className="text-sm truncate" title={item.name}>{item.name}</CardTitle>
                    </div>
                    {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><ExternalLink className="h-4 w-4 text-muted-foreground"/></a>}
                </CardHeader>
            )}
        </Card>
    )
};


const UpskillItem = ({ item, onDrillDown, getIcon, children }: { item: ExerciseDefinition, onDrillDown: (item: ExerciseDefinition) => void, getIcon: (item: ExerciseDefinition) => React.ReactNode, children: React.ReactNode }) => {
    const isParent = (item.linkedUpskillIds?.length ?? 0) > 0 || (item.linkedResourceIds?.length ?? 0) > 0;
    
    if (isParent) {
        return (
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value={item.id} className="border-none">
                    <AccordionTrigger className="hover:no-underline p-2 rounded-md hover:bg-muted/50">
                         <div className="flex items-center gap-2">
                            {getIcon(item)}
                            <span className="font-semibold">{item.name}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 border-l ml-2">
                       {children}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        );
    }
    
    return (
        <div className="flex items-center gap-2 p-2 rounded-md">
            {getIcon(item)}
            <span>{item.name}</span>
        </div>
    )
}

const DeepWorkItem = ({ item, onDrillDown, getIcon, children }: { item: ExerciseDefinition, onDrillDown: (item: ExerciseDefinition) => void, getIcon: (item: ExerciseDefinition) => React.ReactNode, children: React.ReactNode }) => {
    const isParent = (item.linkedDeepWorkIds?.length ?? 0) > 0 || (item.linkedUpskillIds?.length ?? 0) > 0 || (item.linkedResourceIds?.length ?? 0) > 0;

    if (isParent) {
        return (
             <Accordion type="single" collapsible className="w-full">
                <AccordionItem value={item.id} className="border-none">
                     <AccordionTrigger className="hover:no-underline p-2 rounded-md hover:bg-muted/50" onClick={(e) => { e.stopPropagation(); onDrillDown(item); }}>
                        <div className="flex items-center gap-2">
                           {getIcon(item)}
                           <span className="font-semibold">{item.name}</span>
                       </div>
                    </AccordionTrigger>
                </AccordionItem>
            </Accordion>
        );
    }

    return (
        <div className="flex items-center gap-2 p-2 rounded-md">
            {getIcon(item)}
            <span>{item.name}</span>
        </div>
    )
}

export function IntentionDetailPopup({ popupState, onClose }: IntentionDetailPopupProps) {
  const { 
    deepWorkDefinitions, 
    upskillDefinitions, 
    resources, 
    handleOpenNestedPopup,
    openIntentionPopup
  } = useAuth();
  
  const [navigationStack, setNavigationStack] = useState<ExerciseDefinition[]>([]);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `intention-popup-${popupState.resourceId}` });

  const style: React.CSSProperties = {
      position: 'fixed',
      top: popupState.y,
      left: popupState.x,
      width: '56rem', // equivalent to max-w-4xl
      willChange: 'transform',
  };
  if (transform) {
      style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
  }
  
  const linkedUpskillChildIds = useMemo(() => 
    new Set<string>((upskillDefinitions || []).flatMap(def => def.linkedUpskillIds || []))
  , [upskillDefinitions]);

  useEffect(() => {
    const initialIntention = deepWorkDefinitions.find(d => d.id === popupState.resourceId) || upskillDefinitions.find(d => d.id === popupState.resourceId);
    if (initialIntention) {
      setNavigationStack([initialIntention]);
    }
  }, [popupState.resourceId, deepWorkDefinitions, upskillDefinitions]);

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
    if (upskillDefinitions.some(d => d.id === subtask.id)) {
      openIntentionPopup(subtask.id);
    } else {
      setNavigationStack(prev => [...prev, subtask]);
    }
  };
  
  const handleGoBack = () => {
    setNavigationStack(prev => prev.slice(0, prev.length - 1));
  };
  
  const getIcon = (item: ExerciseDefinition) => {
    const isUpskill = upskillDefinitions.some(d => d.id === item.id);
    if (isUpskill) {
        const isParent = (item.linkedUpskillIds?.length ?? 0) > 0 || (item.linkedResourceIds?.length ?? 0) > 0;
        const isChild = linkedUpskillChildIds ? linkedUpskillChildIds.has(item.id) : false;
        if (isParent && !isChild) return <Flashlight className="h-4 w-4 text-amber-500" />; // Curiosity
        if (isParent && isChild) return <GitMerge className="h-4 w-4 text-green-500" />; // Objective
        if (!isParent && isChild) return <Frame className="h-4 w-4 text-blue-500" />; // Visualization
        return <BookCopy className="h-4 w-4 text-amber-500" />;
    }
    return <Lightbulb className="h-4 w-4 text-green-500" />;
  };

  const renderUpskillNode = (item: ExerciseDefinition): JSX.Element => {
    const childUpskillItems = (item.linkedUpskillIds || [])
        .map(id => upskillDefinitions.find(d => d.id === id))
        .filter((d): d is ExerciseDefinition => !!d)
        .map(renderUpskillNode);
    
    const childResourceItems = (item.linkedResourceIds || [])
        .map(id => resources.find(r => r.id === id))
        .filter((r): r is Resource => !!r)
        .map(r => <ResourceItem key={r.id} item={r} onOpenNestedPopup={handleOpenNestedPopup} />);

    return (
        <UpskillItem key={item.id} item={item} onDrillDown={handleDrillDown} getIcon={getIcon}>
            {childUpskillItems}
            {childResourceItems.length > 0 && <div className="space-y-2 mt-2">{childResourceItems}</div>}
        </UpskillItem>
    );
  };
  
  if (!currentItem) return null;

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="z-[70]">
       <Card className="shadow-2xl border-2 border-primary/30 bg-card max-h-[85vh] flex flex-col">
        <div 
          className="p-4 flex-shrink-0 border-b flex flex-row items-center cursor-grab active:cursor-grabbing"
          {...listeners}
        >
          {navigationStack.length > 1 && (
            <Button variant="ghost" size="icon" onClick={handleGoBack} className="mr-2 h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-grow min-w-0">
              <CardTitle className="truncate text-lg" title={currentItem.name}>Details for: {currentItem.name}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onClose(popupState.resourceId)} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-grow min-h-0">
            <ScrollArea className="h-full p-4">
                <div className="space-y-6">
                    {linkedItems.deepWork.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2"><Briefcase className="h-5 w-5 text-green-500" />Linked Deep Work</h3>
                            <div className="space-y-1">
                                {linkedItems.deepWork.map(item => (
                                    <DeepWorkItem key={item.id} item={item} onDrillDown={handleDrillDown} getIcon={getIcon}>
                                        {/* Children are not rendered here as drill-down is the interaction */}
                                    </DeepWorkItem>
                                ))}
                            </div>
                        </div>
                    )}
                     {linkedItems.upskill.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2"><BookCopy className="h-5 w-5 text-amber-500" />Linked Learning</h3>
                            <div className="space-y-1">
                                {linkedItems.upskill.map(item => renderUpskillNode(item))}
                            </div>
                        </div>
                    )}
                    {linkedItems.resource.length > 0 && (
                        <div>
                             <h3 className="font-semibold mb-2 flex items-center gap-2"><Library className="h-5 w-5 text-blue-500" />Linked Resources</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {linkedItems.resource.map(item => <ResourceItem key={item.id} item={item} onOpenNestedPopup={handleOpenNestedPopup} />)}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
      </Card>
    </div>
  );
}
