
"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from './ui/scroll-area';
import { Lightbulb, Flashlight, Library, Globe, Youtube, ExternalLink, Briefcase, BookCopy, ArrowLeft, Frame, Code, MessageSquare, ArrowRight, GitMerge, GripVertical, X, Flag, Bolt, Focus, Link as LinkIcon, Play, Pause } from 'lucide-react';
import type { ExerciseDefinition, Resource, PopupState as IntentionPopupState, ResourcePoint } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import Image from 'next/image';
import { Button } from './ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDraggable } from '@dnd-kit/core';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { getAudio } from '@/lib/audioDB';
import ReactPlayer from 'react-player';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
    
    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value={item.id} className="border-none">
                 <AccordionTrigger className="hover:no-underline p-2 rounded-md hover:bg-muted/50" disabled={!isParent}>
                    <div className="flex items-center gap-2">
                       {getIcon(item)}
                       <span className="font-semibold">{item.name}</span>
                   </div>
                </AccordionTrigger>
                {isParent && (
                    <AccordionContent className="pl-6 border-l ml-2">
                    {children}
                    </AccordionContent>
                )}
            </AccordionItem>
        </Accordion>
    );
}

const LinkedIntentionsPopupCard = ({ popupState, onClose }: {
    popupState: { x: number; y: number; intentions: { intention: ExerciseDefinition; links: { source: string; target: string; }[] }[] };
    onClose: () => void;
}) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: 'linked-intentions-popup' });
    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        zIndex: 100, // Ensure it's on top
        willChange: 'transform',
    };
     if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className="w-96 shadow-2xl border-2 border-primary/30 bg-card">
                <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base">Linked Intentions</CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <ScrollArea className="h-96 pr-4">
                        {popupState.intentions.length > 0 ? (
                            <div className="space-y-4">
                            {popupState.intentions.map(({ intention, links }) => (
                                <Card key={intention.id} className="bg-muted/50">
                                    <CardHeader className="p-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Lightbulb className="h-4 w-4 text-amber-500" />
                                            {intention.name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0">
                                        <ul className="space-y-3">
                                            {links.map((link, index) => (
                                                <li key={index} className="space-y-1 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="font-medium text-foreground">{link.source}</span>
                                                    </div>
                                                    <div className="flex items-center pl-1">
                                                        <ArrowRight className="h-3 w-3 mr-2 text-muted-foreground" />
                                                        <div className="flex items-center gap-2">
                                                            <BookCopy className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <span className="text-muted-foreground">{link.target}</span>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))}
                            </div>
                        ) : (
                             <div className="text-sm text-muted-foreground text-center py-8">
                                No intentions are currently linked to this curiosity.
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};


export function IntentionDetailPopup({ popupState, onClose }: IntentionDetailPopupProps) {
  const { 
    deepWorkDefinitions, 
    upskillDefinitions, 
    resources, 
    openGeneralPopup,
    globalVolume,
  } = useAuth();
  
  const [navigationStack, setNavigationStack] = useState<ExerciseDefinition[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [linkedIntentionsPopup, setLinkedIntentionsPopup] = useState<{ x: number; y: number; intentions: { intention: ExerciseDefinition; links: { source: string; target: string; }[] }[] } | null>(null);

  const [playingAudio, setPlayingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<ReactPlayer>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `intention-popup-${popupState.resourceId}`,
  });
  
  const style: React.CSSProperties = {
    position: 'fixed',
    top: popupState.y,
    left: popupState.x,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    willChange: 'transform',
    zIndex: 70 + (popupState.level || 0),
  };

  const linkedUpskillChildIds = useMemo(() => 
    new Set<string>((upskillDefinitions || []).flatMap(def => def.linkedUpskillIds || []))
  , [upskillDefinitions]);

  const linkedDeepWorkChildIds = useMemo(() => 
    new Set<string>((deepWorkDefinitions || []).flatMap(def => def.linkedDeepWorkIds || []))
  , [deepWorkDefinitions]);

  useEffect(() => {
    const initialIntention = deepWorkDefinitions.find(d => d.id === popupState.resourceId) || upskillDefinitions.find(d => d.id === popupState.resourceId);
    if (initialIntention) {
      setNavigationStack([initialIntention]);
    }
  }, [popupState.resourceId, deepWorkDefinitions, upskillDefinitions]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const handleTimeUpdate = () => setCurrentTime(audioEl.currentTime);
    const handleDurationChange = () => setDuration(audioEl.duration);
    audioEl.addEventListener('timeupdate', handleTimeUpdate);
    audioEl.addEventListener('durationchange', handleDurationChange);
    return () => {
      if (audioEl) {
        audioEl.removeEventListener('timeupdate', handleTimeUpdate);
        audioEl.removeEventListener('durationchange', handleDurationChange);
      }
    };
  }, []);

  const handleSeekTo = (timestamp: number) => {
    if (audioRef.current) {
        audioRef.current.currentTime = timestamp;
        if (audioRef.current.paused) {
            setPlayingAudio(true);
        }
    }
    if (playerRef.current) {
        playerRef.current.seekTo(timestamp, 'seconds');
        setPlayingAudio(true);
    }
  };

  const currentItem = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1] : null;

  const linkedItems = useMemo(() => {
    if (!currentItem) return { deepWork: [], upskill: [], resource: [] };

    const childDeepWorkItems = (currentItem.linkedDeepWorkIds || [])
        .map(id => deepWorkDefinitions.find(d => d.id === id))
        .filter((d): d is ExerciseDefinition => !!d);

    const childUpskillItems = (currentItem.linkedUpskillIds || [])
        .map(id => upskillDefinitions.find(d => d.id === id))
        .filter((d): d is ExerciseDefinition => !!d);

    const allLinkedResourceIds = new Set<string>(currentItem.linkedResourceIds || []);

    const processChildren = (children: ExerciseDefinition[]) => {
      children.forEach(child => {
        (child.linkedResourceIds || []).forEach(resId => allLinkedResourceIds.add(resId));
        const grandChildren = [
          ...(child.linkedDeepWorkIds || []).map(id => deepWorkDefinitions.find(d => d.id === id)),
          ...(child.linkedUpskillIds || []).map(id => upskillDefinitions.find(d => d.id === id))
        ].filter((d): d is ExerciseDefinition => !!d);
        if (grandChildren.length > 0) {
          processChildren(grandChildren);
        }
      });
    };
    
    processChildren([...childDeepWorkItems, ...childUpskillItems]);

    return {
        resource: Array.from(allLinkedResourceIds).map(id => resources.find(r => r.id === id)).filter((r): r is Resource => !!r),
    };
}, [currentItem, deepWorkDefinitions, upskillDefinitions, resources]);

  const handleDrillDown = (subtask: ExerciseDefinition) => {
    if (upskillDefinitions.some(d => d.id === subtask.id)) {
        console.log("Drilling into upskill item from intention popup is not fully supported yet with its own popup type.");
    } else {
      setNavigationStack(prev => [...prev, subtask]);
    }
  };
  
  const handleGoBack = () => {
    setNavigationStack(prev => prev.slice(0, prev.length - 1));
  };
  
  const getDeepWorkNodeType = useCallback((def: ExerciseDefinition) => {
    if (def.nodeType) return def.nodeType;
    const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0;
    const isChild = linkedDeepWorkChildIds.has(def.id);
    
    if (isParent) {
        return isChild ? 'Objective' : 'Intention';
    }
    return isChild ? 'Action' : 'Standalone';
  }, [linkedDeepWorkChildIds]);
  
  const getUpskillNodeType = useCallback((def: ExerciseDefinition) => {
    if (def.nodeType) return def.nodeType;
    const isParent = (def.linkedUpskillIds?.length ?? 0) > 0;
    const isChild = linkedUpskillChildIds.has(def.id);
    
    if (isParent) {
        return isChild ? 'Objective' : 'Curiosity';
    }
    return isChild ? 'Visualization' : 'Standalone';
  }, [linkedUpskillChildIds]);

  const getIcon = (item: ExerciseDefinition) => {
    const isUpskill = upskillDefinitions.some(d => d.id === item.id);
    if (isUpskill) {
        const isParent = (item.linkedUpskillIds?.length ?? 0) > 0 || (item.linkedResourceIds?.length ?? 0) > 0;
        const isChild = linkedUpskillChildIds ? linkedUpskillChildIds.has(item.id) : false;
        if (isParent && !isChild) return <Flashlight className="h-4 w-4 text-amber-500" />; // Curiosity
        if (isParent && isChild) return <Flag className="h-4 w-4 text-green-500" />; // Objective
        if (!isParent && isChild) return <Frame className="h-4 w-4 text-blue-500" />; // Visualization
        return <Focus className="h-4 w-4 text-purple-500" />; // Standalone
    }
    
    const nodeType = getDeepWorkNodeType(item);
    switch (nodeType) {
        case 'Intention': return <Lightbulb className="h-4 w-4 text-amber-500" />;
        case 'Objective': return <Flag className="h-4 w-4 text-green-500" />;
        case 'Action': return <Bolt className="h-4 w-4 text-blue-500" />;
        case 'Standalone': return <Focus className="h-4 w-4 text-purple-500" />;
        default: return <Briefcase className="h-4 w-4" />;
    }
  };
  
  const handleViewLinkedIntentions = () => {
    if (!currentItem || !cardRef.current) return;
    
    const allUpskillDefs = new Map(upskillDefinitions.map(d => [d.id, d]));
    const allDeepWorkDefs = new Map(deepWorkDefinitions.map(d => [d.id, d]));
  
    const getDescendants = (startNodeId: string, defsMap: Map<string, ExerciseDefinition>, linkKey: 'linkedDeepWorkIds' | 'linkedUpskillIds'): Map<string, ExerciseDefinition> => {
        const visited = new Set<string>();
        const queue: string[] = [startNodeId];
        const descendantsMap = new Map<string, ExerciseDefinition>();
        
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            const node = defsMap.get(currentId);
            if (node) {
                descendantsMap.set(currentId, node);
                const childIds = (node[linkKey] || []);
                childIds.forEach(childId => {
                    if (!visited.has(childId)) {
                        queue.push(childId);
                    }
                });
            }
        }
        return descendantsMap;
    };
    
    const curiosityTreeDescendants = getDescendants(currentItem.id, allUpskillDefs, 'linkedUpskillIds');
    const intentions = deepWorkDefinitions.filter(def => getDeepWorkNodeType(def) === 'Intention');
    
    const foundLinksByIntention = new Map<string, { intention: ExerciseDefinition; links: { source: string; target: string; }[] }>();
  
    intentions.forEach(intention => {
      const intentionTreeDescendants = getDescendants(intention.id, allDeepWorkDefs, 'linkedDeepWorkIds');
      
      intentionTreeDescendants.forEach(intentionNode => {
        (intentionNode.linkedUpskillIds || []).forEach(linkedUpskillId => {
          if (curiosityTreeDescendants.has(linkedUpskillId)) {
            if (!foundLinksByIntention.has(intention.id)) {
              foundLinksByIntention.set(intention.id, { intention, links: [] });
            }
            const upskillNode = curiosityTreeDescendants.get(linkedUpskillId);
            if (upskillNode) {
              foundLinksByIntention.get(intention.id)!.links.push({
                source: intentionNode.name,
                target: upskillNode.name,
              });
            }
          }
        });
      });
    });
  
    const rect = cardRef.current.getBoundingClientRect();
    setLinkedIntentionsPopup({
      x: rect.right + 20,
      y: rect.top,
      intentions: Array.from(foundLinksByIntention.values()),
    });
  };

  const renderContent = () => {
    if (!currentItem) return null;

    return (
        <div className="space-y-2">
            {linkedItems.resource.length > 0 ? (
                linkedItems.resource.map(item => (
                    <ResourceItem
                        key={item.id}
                        item={item}
                        onOpenNestedPopup={(resourceId, event) => {
                          if (cardRef.current) {
                            openGeneralPopup(resourceId, event, popupState, cardRef.current.getBoundingClientRect());
                          }
                        }}
                    />
                ))
            ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No linked resources.</p>
            )}
        </div>
    );
  };
  
  if (!currentItem) return null;

  const isUpskillCuriosity = upskillDefinitions.some(d => d.id === currentItem!.id) && (currentItem!.linkedUpskillIds?.length ?? 0) > 0 && !linkedUpskillChildIds.has(currentItem!.id);

  return (
    <>
      <div ref={setNodeRef} style={style} {...attributes}>
        <Card ref={cardRef} className="w-[450px] shadow-2xl border-2 border-primary/30 bg-card">
          <CardHeader className="p-3 relative cursor-grab" {...listeners}>
            {navigationStack.length > 1 && (
              <Button variant="ghost" size="icon" onClick={handleGoBack} className="absolute left-1 top-1 h-7 w-7">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex justify-between items-center pl-8">
              <CardTitle className="text-base truncate" title={currentItem.name}>
                {currentItem.name}
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={() => onClose(popupState.resourceId)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <ScrollArea className="h-96 pr-4">
              {renderContent()}
            </ScrollArea>
          </CardContent>
          {isUpskillCuriosity && (
            <CardFooter className="p-3 border-t">
              <Button variant="outline" size="sm" onClick={handleViewLinkedIntentions}>
                <LinkIcon className="mr-2 h-4 w-4" /> View Linked Intentions
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
        
        {linkedIntentionsPopup && (
            <LinkedIntentionsPopupCard
                popupState={linkedIntentionsPopup}
                onClose={() => setLinkedIntentionsPopup(null)}
            />
        )}
    </>
  );
}
