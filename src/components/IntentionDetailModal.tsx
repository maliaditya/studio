
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
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
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
  
  const [contentModalState, setContentModalState] = useState<{ isOpen: boolean; resource: Resource | null }>({ isOpen: false, resource: null });

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
    if (!contentModalState.resource?.id) return;
    const audioEl = audioRef.current;
    if (!audioEl) return;
    
    let objectUrl: string | null = null;
    const loadAudio = async () => {
      if (contentModalState.resource?.hasLocalAudio) {
        try {
          const audioBlob = await getAudio(contentModalState.resource.id);
          if (audioBlob) {
            objectUrl = URL.createObjectURL(audioBlob);
            setAudioSrc(objectUrl);
          } else {
            setAudioSrc(null);
          }
        } catch (error) { console.error("Failed to load audio from DB:", error); setAudioSrc(null); }
      } else {
          setAudioSrc(null);
      }
    };
    loadAudio();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [contentModalState.resource]);
  
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl || !audioSrc) return;
    if (audioEl.src !== audioSrc) {
      audioEl.src = audioSrc;
    }
    if (playingAudio) {
      audioEl.volume = globalVolume;
      audioEl.play().catch(e => console.error("Audio play failed:", e));
    } else {
      audioEl.pause();
    }
  }, [playingAudio, audioSrc, globalVolume]);

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


  const renderDeepWorkNode = (item: ExerciseDefinition): JSX.Element => {
    const childDeepWorkItems = (item.linkedDeepWorkIds || [])
        .map(id => deepWorkDefinitions.find(d => d.id === id))
        .filter((d): d is ExerciseDefinition => !!d)
        .map(renderDeepWorkNode);

    const childUpskillItems = (item.linkedUpskillIds || [])
        .map(id => upskillDefinitions.find(d => d.id === id))
        .filter((d): d is ExerciseDefinition => !!d)
        .map(renderUpskillNode);
    
    const childResourceItems = (item.linkedResourceIds || [])
        .map(id => resources.find(r => r.id === id))
        .filter((r): r is Resource => !!r)
        .map(r => <ResourceItem key={r.id} item={r} onOpenNestedPopup={(resourceId, event) => setContentModalState({ isOpen: true, resource: resources.find(res => res.id === resourceId) || null })} />);
        
    return (
        <DeepWorkItem key={item.id} item={item} onDrillDown={handleDrillDown} getIcon={getIcon}>
            {childDeepWorkItems}
            {childUpskillItems}
            {childResourceItems.length > 0 && <div className="space-y-2 mt-2">{childResourceItems}</div>}
        </DeepWorkItem>
    );
  };

  const renderUpskillNode = (item: ExerciseDefinition): JSX.Element => {
    const childUpskillItems = (item.linkedUpskillIds || [])
        .map(id => upskillDefinitions.find(d => d.id === id))
        .filter((d): d is ExerciseDefinition => !!d)
        .map(renderUpskillNode);
    
    const childResourceItems = (item.linkedResourceIds || [])
        .map(id => resources.find(r => r.id === id))
        .filter((r): r is Resource => !!r)
        .map(r => <ResourceItem key={r.id} item={r} onOpenNestedPopup={(resourceId, event) => setContentModalState({ isOpen: true, resource: resources.find(res => res.id === resourceId) || null })} />);

    return (
        <UpskillItem key={item.id} item={item} onDrillDown={handleDrillDown} getIcon={getIcon}>
            {childUpskillItems}
            {childResourceItems.length > 0 && <div className="space-y-2 mt-2">{childResourceItems}</div>}
        </UpskillItem>
    );
  };
  
  if (!currentItem) return null;

  const isUpskillCuriosity = upskillDefinitions.some(d => d.id === currentItem!.id) && (currentItem!.linkedUpskillIds?.length ?? 0) > 0 && !linkedUpskillChildIds.has(currentItem!.id);

  const youtubeEmbedUrl = getYouTubeEmbedUrl(contentModalState.resource?.link);

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
              <div className="space-y-4">
                {linkedItems.resource.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-1 flex items-center gap-2 text-sm">
                      <Library className="h-4 w-4 text-blue-500" />Linked Resources
                    </h3>
                    <div className="space-y-1">
                      {linkedItems.resource.map(item => <ResourceItem key={item.id} item={item} onOpenNestedPopup={(resourceId, event) => {
                        setContentModalState({ isOpen: true, resource: resources.find(res => res.id === resourceId) || null });
                      }} />)}
                    </div>
                  </div>
                )}
              </div>
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
        
        <Dialog open={contentModalState.isOpen} onOpenChange={() => setContentModalState({ isOpen: false, resource: null })}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>{contentModalState.resource?.name}</DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <ScrollArea className="h-full">
                        <div className="p-6">
                           <audio ref={audioRef} onEnded={() => setPlayingAudio(false)} className="hidden" />
                           {(contentModalState.resource?.hasLocalAudio || youtubeEmbedUrl) && (
                                <div className="w-full space-y-2 pt-2 mb-4 p-2 rounded-md bg-muted/50">
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPlayingAudio(p => !p)}>
                                            {playingAudio ? <Pause className="h-4 w-4 text-green-500" /> : <Play className="h-4 w-4 text-green-500" />}
                                        </Button>
                                        <span className="text-xs font-mono text-muted-foreground">{formatTime(currentTime)}</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max={duration || 0}
                                            value={currentTime}
                                            onChange={(e) => {
                                                const newTime = parseFloat(e.target.value);
                                                setCurrentTime(newTime);
                                                if (audioRef.current) audioRef.current.currentTime = newTime;
                                                if (playerRef.current) playerRef.current.seekTo(newTime, 'seconds');
                                            }}
                                            className="w-full h-1 bg-primary/20 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <span className="text-xs font-mono text-muted-foreground">{formatTime(duration)}</span>
                                    </div>
                                    {contentModalState.resource?.audioFileName && (
                                        <p className="text-xs text-muted-foreground truncate" title={contentModalState.resource.audioFileName}>
                                        Now Playing: {contentModalState.resource.audioFileName}
                                        </p>
                                    )}
                                </div>
                            )}
                            
                            {youtubeEmbedUrl && (
                                <div className="aspect-video w-full bg-black overflow-hidden mb-4 rounded-md">
                                    <ReactPlayer
                                        ref={playerRef}
                                        url={contentModalState.resource?.link!}
                                        width="100%"
                                        height="100%"
                                        playing={playingAudio}
                                        controls={true}
                                        volume={globalVolume}
                                        onProgress={(state) => setCurrentTime(state.playedSeconds)}
                                        onDuration={setDuration}
                                    />
                                </div>
                            )}

                            <ul className="space-y-4">
                                {(contentModalState.resource?.points || []).map(point => (
                                    <li key={point.id} className="p-4 rounded-lg bg-muted/30 border">
                                        <div className="flex items-start gap-4">
                                            {point.type === 'timestamp' ? (
                                                <button onClick={() => handleSeekTo(point.timestamp || 0)} className="font-mono text-primary font-semibold mt-1 flex-shrink-0 bg-background px-2 py-1 rounded-md text-base">
                                                    {formatTime(point.timestamp || 0)}
                                                </button>
                                            ) : point.type === 'code' ? (
                                                <Code className="h-5 w-5 mt-1 text-primary/70 flex-shrink-0" />
                                            ) : point.type === 'markdown' ? (
                                                <MessageSquare className="h-5 w-5 mt-1 text-primary/70 flex-shrink-0" />
                                            ) : (
                                                <ArrowRight className="h-5 w-5 mt-1 text-primary/50 flex-shrink-0" />
                                            )}
                                            
                                            <div className="flex-grow min-w-0">
                                                {point.type === 'markdown' ? (
                                                    <div className="prose dark:prose-invert max-w-none">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text || ""}</ReactMarkdown>
                                                    </div>
                                                ) : point.type === 'code' ? (
                                                    <SyntaxHighlighter language="javascript" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', borderRadius: '0.5rem', width: '100%', whiteSpace: 'pre-wrap', wordBreak: 'all' }} codeTagProps={{style: {fontSize: '0.9rem', fontFamily: 'monospace'}}}>
                                                        {point.text || ""}
                                                    </SyntaxHighlighter>
                                                ) : (
                                                    <p className="pt-1 text-base">{point.text}</p>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    </>
  );
}

    