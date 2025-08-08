

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
import type { ExerciseDefinition, Resource, PopupState, ResourcePoint } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import Image from 'next/image';
import { Button } from './ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDraggable } from '@dnd-kit/core';

interface IntentionDetailPopupProps {
  popupState: PopupState;
  onClose: (id: string) => void;
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {linkedItems.upskill.map(item => {
                                    const isParent = (item.linkedUpskillIds?.length ?? 0) > 0 || (item.linkedResourceIds?.length ?? 0) > 0;
                                    const isClickable = isParent;
                                    return (
                                        <Card key={item.id} className={isClickable ? "cursor-pointer hover:bg-muted/50" : ""} onClick={isClickable ? () => handleDrillDown(item) : undefined}>
                                          <CardHeader>
                                              <CardTitle className="text-base flex items-center gap-2">
                                                {getIcon(item)}
                                                {item.name}
                                              </CardTitle>
                                              <CardDescription>{item.category}</CardDescription>
                                          </CardHeader>
                                          {isParent && (
                                            <CardContent className="pt-2">
                                                <div className="text-xs text-muted-foreground">
                                                    {item.linkedUpskillIds?.length || 0} sub-task(s), {item.linkedResourceIds?.length || 0} resource(s) linked.
                                                </div>
                                            </CardContent>
                                          )}
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    {linkedItems.resource.length > 0 && (
                        <div>
                             <h3 className="font-semibold mb-2 flex items-center gap-2"><Library className="h-5 w-5 text-blue-500" />Linked Resources</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {linkedItems.resource.map(item => (
                                    <Card 
                                      key={item.id} 
                                      className={item.type === 'card' ? "cursor-pointer hover:bg-muted/50" : ""}
                                      onClick={(e) => {
                                          if (item.type === 'card') {
                                              e.stopPropagation();
                                              handleOpenNestedPopup(item.id, e);
                                          }
                                      }}
                                    >
                                        {item.type === 'card' ? (
                                             <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Library className="h-4 w-4 text-primary" />
                                                    {item.name}
                                                </CardTitle>
                                            </CardHeader>
                                        ) : (
                                            <CardHeader className="flex-row items-center gap-3 space-y-0">
                                                {item.link && item.link.includes('youtube') ? <Youtube className="h-4 w-4 flex-shrink-0 text-red-500" /> : (item.iconUrl ? <Image src={item.iconUrl} alt="" width={16} height={16} className="flex-shrink-0" unoptimized/> : <Globe className="h-4 w-4 flex-shrink-0"/>)}
                                                <div className='min-w-0 flex-grow'>
                                                    <CardTitle className="text-base truncate" title={item.name}>{item.name}</CardTitle>
                                                    {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground truncate block hover:underline" onClick={(e) => e.stopPropagation()}>{item.link}</a>}
                                                </div>
                                                {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><ExternalLink className="h-4 w-4 text-muted-foreground"/></a>}
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
      </Card>
    </div>
  );
}
