
"use client";

import React, { useState, useEffect, FormEvent, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, ChevronDown, CalendarIcon, TrendingUp, Loader2, BookCopy, MoreVertical, Link as LinkIcon, Folder, Library, Globe, ExternalLink, Youtube, Share2, ArrowRight, Expand, Filter as FilterIcon, GitMerge, Clock, Unlink, Flashlight, Focus, Frame, Lightbulb, PictureInPicture, GripVertical, Flag, Bolt, Code, MessageSquare, BrainCircuit, Blocks, Sprout } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, getISOWeek, isMonday, getYear, parseISO, differenceInDays } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, Resource, ResourceFolder, TopicGoal, SkillDomain, CoreSkill, MicroSkill } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { ExerciseProgressModal } from '@/components/ExerciseProgressModal';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SkillLibrary } from '@/components/SkillLibrary';

interface PopupState {
  resourceId: string;
  level: number;
  x: number;
  y: number;
  parentId?: string;
  width?: number;
  height?: number;
}

const ResourcePopupCard = ({ popupState, allResources, onOpenNestedPopup, onClose, onSizeChange }: {
    popupState: PopupState;
    allResources: Resource[];
    onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState: PopupState) => void;
    onClose: (resourceId: string) => void;
    onSizeChange: (resourceId: string, newSize: { width: number; height: number }) => void;
}) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `popup-${popupState.resourceId}`,
    });

    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        width: `${popupState.width}px`,
        willChange: 'transform',
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }

    const resource = allResources.find(r => r.id === popupState.resourceId);
    if (!resource) return null;

    const handleLinkClick = (e: React.MouseEvent, pointResourceId: string) => {
      e.stopPropagation();
      onOpenNestedPopup(pointResourceId, e, popupState);
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="z-[60]">
            <Card className="shadow-2xl border-2 border-primary/50 bg-card max-h-[70vh] flex flex-col">
                <CardHeader className="p-3 relative cursor-grab flex-shrink-0" {...listeners}>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Library className="h-4 w-4" />
                        <span className="truncate">{resource.name}</span>
                    </CardTitle>
                </CardHeader>
                <div className="flex-grow min-h-0 overflow-y-auto">
                    <CardContent className="p-3 pt-0">
                        <ul className="space-y-2 text-sm text-muted-foreground pr-2">
                            {(resource.points || []).map(point => (
                                <li key={point.id} className="flex items-start gap-2">
                                    {point.type === 'code' ? <Code className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> :
                                    point.type === 'markdown' ? <MessageSquare className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> :
                                    <ArrowRight className="h-4 w-4 mt-0.5 text-primary/50 flex-shrink-0" />
                                    }
                                    {point.type === 'card' && point.resourceId ? (
                                        <button
                                            onClick={(e) => handleLinkClick(e, point.resourceId!)}
                                            className="text-left font-medium text-primary hover:underline"
                                        >
                                            {point.text}
                                        </button>
                                    ) : point.type === 'markdown' ? (
                                        <div className="w-full prose dark:prose-invert prose-sm">
                                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text || ""}</ReactMarkdown>
                                        </div>
                                    ) : point.type === 'code' ? (
                                         <pre className="w-full bg-muted/50 p-2 rounded-md text-xs font-mono text-foreground whitespace-pre-wrap break-words">{point.text}</pre>
                                    ) : (
                                        <span className="break-words w-full" title={point.text}>{point.text}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </div>
                <CardFooter className="p-2 flex justify-end flex-shrink-0 relative">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onClose(resource.id); }}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

const getFaviconUrl = (link: string): string | undefined => {
  try {
    let url = link;
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }
    const urlObject = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObject.hostname}&sz=32`;
  } catch (e) {
    return undefined;
  }
};

const DEFAULT_TARGET_SESSIONS = 1;
const DEFAULT_TARGET_DURATION = "25";

const getYouTubeEmbedUrl = (url: string): string | null => {
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

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
    } catch (e) {}
    return null;
};

const isNotionUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.endsWith('notion.so');
    } catch (e) { return false; }
};

const isObsidianUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname === 'share.note.sx';
    } catch (e) { return false; }
};

const DraggableSubtaskItem: React.FC<{ 
    childId: string;
    parentId: string;
    childName: string;
    isLogged: boolean;
    type: 'upskill' | 'resource';
    onClick: () => void;
  }> = ({ childId, parentId, childName, isLogged, type, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `subtask-${childId}-from-${parentId}`,
    });
  
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
        backgroundColor: 'hsl(var(--card))',
        padding: '2px 4px',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    } : undefined;
  
    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={cn(
                "text-xs text-muted-foreground truncate transition-transform", 
                isLogged && "line-through text-muted-foreground/70",
                isDragging && "opacity-50 scale-90"
            )} 
            title={childName}
        >
          <span {...listeners} {...attributes} className="cursor-grab pr-1"> - </span>
          <span onClick={onClick} className="cursor-pointer hover:text-foreground">
             {childName}
          </span>
        </div>
    );
};

function LinkedUpskillItem({ upskillDef, handleAddTaskToSession, setSelectedSubtopic, setViewMode, handleStartEditSubtopic, handleUnlinkItem, handleDeleteSubtopic, handleViewProgress, isComplete, getUpskillLoggedMinutesRecursive, upskillDefinitions, resources, calculatedEstimate, setEmbedUrl, setFloatingVideoUrl, linkedUpskillChildIds }: {
  upskillDef: ExerciseDefinition;
  handleAddTaskToSession: (def: ExerciseDefinition) => void;
  setSelectedSubtopic: (def: ExerciseDefinition | null) => void;
  setViewMode: (mode: 'session' | 'library') => void;
  handleStartEditSubtopic: (def: ExerciseDefinition) => void;
  handleUnlinkItem: (type: 'upskill' | 'resource', id: string) => void;
  handleDeleteSubtopic: (id: string) => void;
  handleViewProgress: (def: ExerciseDefinition) => void;
  isComplete: boolean;
  getUpskillLoggedMinutesRecursive: (def: ExerciseDefinition) => number;
  upskillDefinitions: ExerciseDefinition[];
  resources: Resource[];
  calculatedEstimate: number;
  setEmbedUrl: (url: string | null) => void;
  setFloatingVideoUrl: (url: string | null) => void;
  linkedUpskillChildIds: Set<string>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: upskillDef.id });
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id: upskillDef.id });
  const router = useRouter();

  const setCombinedRefs = (node: HTMLElement | null) => {
    setNodeRef(node);
    setDroppableNodeRef(node);
  };
  
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 100 : 'auto', } : undefined;

  const isParent = (upskillDef.linkedUpskillIds?.length ?? 0) > 0 || (upskillDef.linkedResourceIds?.length ?? 0) > 0;
  const isChild = linkedUpskillChildIds.has(upskillDef.id);
  
  const getNodeType = () => {
    if (isParent) {
      return isChild ? 'Objective' : 'Curiosity';
    }
    return isChild ? 'Visualization' : 'Standalone';
  };
  const nodeType = getNodeType();

  const getIcon = () => {
    switch(nodeType) {
        case 'Curiosity': return <Flashlight className="h-5 w-5 text-amber-500 flex-shrink-0" />;
        case 'Objective': return <Flag className="h-5 w-5 text-green-500 flex-shrink-0" />;
        case 'Visualization': return <Frame className="h-5 w-5 text-blue-500 flex-shrink-0" />;
        case 'Standalone': return <Focus className="h-5 w-5 text-purple-500 flex-shrink-0" />;
        default: return <BookCopy className="h-5 w-5 flex-shrink-0" />;
    }
  };

  const loggedMinutes = getUpskillLoggedMinutesRecursive(upskillDef);
  const estDuration = isParent ? calculatedEstimate : upskillDef.estimatedDuration;
  
  const formatMinutes = (minutes: number) => {
    if (minutes === 0) return "0m";
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h > 0 ? `${h}h` : ''} ${m > 0 ? `${m}m` : ''}`.trim();
  };

  return (
    <div ref={setCombinedRefs} style={style} className={cn(isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg")}>
      <Card className={cn("relative group transition-all duration-300 hover:shadow-xl", isComplete && "opacity-70 bg-muted/30")}>
        <div className="absolute inset-0 z-0" onMouseDown={(e) => isDragging && e.stopPropagation()}/>
         <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"><GripVertical className="h-4 w-4" /></Button>
            <TooltipProvider>
                <Tooltip><TooltipTrigger asChild><span tabIndex={nodeType === 'Visualization' || nodeType === 'Standalone' ? 0 : -1}><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); (nodeType === 'Visualization' || nodeType === 'Standalone') && handleAddTaskToSession(upskillDef); }} disabled={nodeType !== 'Visualization' && nodeType !== 'Standalone'}><PlusCircle className="h-4 w-4" /></Button></span></TooltipTrigger><TooltipContent>{nodeType === 'Visualization' || nodeType === 'Standalone' ? 'Add to Session' : 'Add sub-tasks instead'}</TooltipContent></Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setSelectedSubtopic(upskillDef); setViewMode('library'); }}><ArrowRight className="h-4 w-4" /></Button>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}><DropdownMenuItem onSelect={() => handleViewProgress(upskillDef)}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => handleStartEditSubtopic(upskillDef)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem><DropdownMenuItem onSelect={() => handleUnlinkItem('upskill', upskillDef.id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem><DropdownMenuItem onSelect={() => handleDeleteSubtopic(upskillDef.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {getIcon()}
            <span className={cn("truncate", isComplete && "line-through text-muted-foreground")} title={upskillDef.name}>{upskillDef.name}</span>
             <Badge variant="outline" className="text-xs">{nodeType}</Badge>
          </CardTitle>
          <CardDescription>{upskillDef.category}</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[50px]">
            {isParent ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    {(upskillDef.linkedUpskillIds || []).map(childId => {
                        const childDef = upskillDefinitions.find(d => d.id === childId);
                        if (!childDef) return null;
                        return (
                            <DraggableSubtaskItem 
                                key={childId} 
                                childId={childId} 
                                parentId={upskillDef.id} 
                                childName={childDef.name} 
                                isLogged={isComplete} // This might need refinement for sub-task completion status
                                type="upskill" 
                                onClick={() => { setSelectedSubtopic(childDef); setViewMode('library'); }}
                            />
                        );
                    })}
                     {(upskillDef.linkedResourceIds || []).map(childId => {
                        const childDef = resources.find(d => d.id === childId);
                        if (!childDef) return null;
                        return <DraggableSubtaskItem key={childId} childId={childId} parentId={upskillDef.id} childName={childDef.name} isLogged={false} type="resource" onClick={() => { router.push('/resources') }}/>;
                    })}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground line-clamp-2">{upskillDef.description || "This is a visualization task. Add it to a session to log time."}</p>
            )}
        </CardContent>
        <CardFooter className="pt-3 flex items-center justify-end">
            <div className="flex items-center gap-1 flex-shrink-0">
                {estDuration && estDuration > 0 && <Badge variant="outline" className="flex-shrink-0">{formatMinutes(estDuration)}</Badge>}
                {loggedMinutes > 0 && <Badge variant="secondary">{formatMinutes(loggedMinutes)} logged</Badge>}
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}

function LinkedResourceItem({ resource, handleUnlinkItem, setEmbedUrl, onOpenNestedPopup, handleStartEditResource }: {
  resource: Resource;
  handleUnlinkItem: (type: 'upskill' | 'resource', id: string) => void;
  setEmbedUrl: (url: string | null) => void;
  onOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
  handleStartEditResource: (resource: Resource) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: resource.id });
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id: resource.id });

  const setCombinedRefs = (node: HTMLElement | null) => {
    setNodeRef(node);
    setDroppableNodeRef(node);
  };
  
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: transform ? 100 : 'auto', } : undefined;

  const youtubeEmbedUrl = resource.link ? getYouTubeEmbedUrl(resource.link) : null;
  const isSpecialEmbed = resource.link ? (isNotionUrl(resource.link) || isObsidianUrl(resource.link)) : false;
  const embedLinkForModal = youtubeEmbedUrl || (isSpecialEmbed ? resource.link : null);

  if (resource.type === 'card') {
    const hasMarkdownContent = (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
    return (
      <div ref={setCombinedRefs} style={style} className={cn(isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg")}>
        <Card className={cn("relative flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl", hasMarkdownContent ? 'md:col-span-2 xl:col-span-3' : '')}>
           <div {...listeners} {...attributes} className="absolute inset-0 z-0"/>
           <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={() => handleStartEditResource(resource)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleUnlinkItem('resource', resource.id)} className="text-destructive"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                  <Library className="h-5 w-5 text-primary" />
                  <span className="truncate" title={resource.name}>{resource.name}</span>
              </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow min-h-0">
              <ScrollArea className={cn(hasMarkdownContent ? 'h-[200px]' : '')}>
                  <ul className="space-y-3 pr-3">
                      {(resource.points || []).map((point) => (
                        <li key={point.id} className="flex items-start gap-3 text-sm text-muted-foreground group/item">
                          {point.type === 'code' ? <Code className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> : point.type === 'markdown' ? <MessageSquare className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> : <ArrowRight className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" />}
                          {point.type === 'card' && point.resourceId ? (
                            <button
                              onClick={(e) => onOpenNestedPopup(point.resourceId!, e)}
                              className="text-left font-medium text-primary hover:underline"
                            >
                              {point.text}
                            </button>
                          ) : point.type === 'markdown' ? (<div className="w-full prose dark:prose-invert prose-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text || ""}</ReactMarkdown></div>) : point.type === 'code' ? (<pre className="w-full bg-muted/50 p-2 rounded-md text-xs font-mono text-foreground whitespace-pre-wrap break-words">{point.text}</pre>) : (<span className="break-words w-full" title={point.text}>{point.text}</span>)}
                        </li>
                      ))}
                  </ul>
              </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={setCombinedRefs} style={style} className={cn(isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg")}>
        <Card className="relative group transition-all duration-300 hover:shadow-xl">
            <div {...listeners} {...attributes} className="absolute inset-0 z-0"/>
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {embedLinkForModal ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={() => setEmbedUrl(embedLinkForModal)}><Expand className="h-4 w-4" /></Button>
                ) : (
                    resource.link ? <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><a href={resource.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button> : null
                )}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onSelect={() => handleStartEditResource(resource)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleUnlinkItem('resource', resource.id)} className="text-destructive"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
            </div>
             {youtubeEmbedUrl ? (
                <>
                    <div className="aspect-video w-full bg-black overflow-hidden rounded-t-lg">
                        <iframe src={youtubeEmbedUrl} title={resource.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
                    </div>
                    <div className="p-3">
                        <div className="flex items-center gap-2">
                            <Youtube className="h-5 w-5 flex-shrink-0 text-red-500" />
                            <p className="text-sm font-bold truncate" title={resource.name}>{resource.name}</p>
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                    {resource.iconUrl ? <Image src={resource.iconUrl} alt="" width={16} height={16} className="h-4 w-4 rounded-sm flex-shrink-0" unoptimized /> : <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    <span className="truncate" title={resource.name}>{resource.name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-1 truncate">{resource.link}</CardDescription>
                </div>
            )}
        </Card>
    </div>
  );
}

function UpskillPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    allUpskillLogs, setAllUpskillLogs,
    upskillDefinitions, setUpskillDefinitions,
    topicGoals, 
    resources, setResources, resourceFolders,
    setFloatingVideoUrl,
    selectedSubtopic, 
    setSelectedSubtopic,
    skillDomains,
    coreSkills,
  } = useAuth();
  const router = useRouter();
  
  const [editingSubtopic, setEditingSubtopic] = useState<ExerciseDefinition | null>(null);
  const [editedSubtopicData, setEditedSubtopicData] = useState<Partial<ExerciseDefinition> & { estHours?: string; estMinutes?: string }>({});
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [progressModalConfig, setProgressModalConfig] = useState<{ isOpen: boolean; exercise: ExerciseDefinition | null; }>({ isOpen: false, exercise: null });
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  const [viewMode, setViewMode] = useState<'session' | 'library'>('library');
  
  const [isManageLinksModalOpen, setIsManageLinksModalOpen] = useState(false);
  const [manageLinksConfig, setManageLinksConfig] = useState<{type: 'upskill' | 'resource', parent: ExerciseDefinition} | null>(null);
  const [newLinkedItemName, setNewLinkedItemName] = useState('');
  const [newLinkedItemTopic, setNewLinkedItemTopic] = useState('');
  const [newLinkedItemDescription, setNewLinkedItemDescription] = useState('');
  const [newLinkedItemLink, setNewLinkedItemLink] = useState('');
  const [newLinkedItemHours, setNewLinkedItemHours] = useState('');
  const [newLinkedItemMinutes, setNewLinkedItemMinutes] = useState('');
  const [newLinkedItemFolderId, setNewLinkedItemFolderId] = useState('');
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [tempLinkedIds, setTempLinkedIds] = useState<string[]>([]);
  const [linkResourceFolderId, setLinkResourceFolderId] = useState<string>('');
  const [linkUpskillTopic, setLinkUpskillTopic] = useState('');
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  const [isNewSubtopicModalOpen, setIsNewSubtopicModalOpen] = useState(false);
  const [newSubtopicData, setNewSubtopicData] = useState({ name: '', description: '', link: '', hours: '', minutes: '' });

  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [openPopups, setOpenPopups] = useState<Map<string, PopupState>>(new Map());

  const [selectedMicroSkill, setSelectedMicroSkill] = useState<MicroSkill | null>(null);


  const handleOpenNewSubtopicModal = () => {
    if (!selectedMicroSkill) {
        toast({ title: "Error", description: "Please select a micro-skill first.", variant: "destructive" });
        return;
    }
    setIsNewSubtopicModalOpen(true);
  };
  
  const handleOpenNestedPopup = (resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState) => {
      setOpenPopups(prev => {
          const newPopups = new Map(prev);
          const resource = resources.find(r => r.id === resourceId);
          if (!resource) return newPopups;
          
          const hasMarkdown = (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
          const popupWidth = hasMarkdown ? 896 : 512;
      
          let x, y, level, parentId;
      
          if (parentPopupState) {
              level = parentPopupState.level + 1;
              parentId = parentPopupState.resourceId;
              x = parentPopupState.x + 40;
              y = parentPopupState.y + 40;
          } else {
              level = 0;
              parentId = undefined;
              if (hasMarkdown) {
                  x = window.innerWidth / 2 - popupWidth / 2;
                  y = window.innerHeight / 2 - Math.min(window.innerHeight * 0.7, 700) / 2;
              } else {
                  x = event.clientX;
                  y = event.clientY;
              }
          }
          
          newPopups.set(resourceId, {
              resourceId, level, x, y, parentId, width: popupWidth
          });
          return newPopups;
      });
  };
  
  const handleClosePopup = (resourceId: string) => {
      setOpenPopups(prev => {
        const newPopups = new Map(prev);
        const popupsToDelete = new Set<string>();
        function findChildren(parentId: string) {
          popupsToDelete.add(parentId);
          for (const [id, popup] of newPopups.entries()) {
            if (popup.parentId === parentId) findChildren(id);
          }
        }
        findChildren(resourceId);
        for (const id of popupsToDelete) newPopups.delete(id);
        return newPopups;
      });
  };

  const handleSizeChange = useCallback((resourceId: string, newSize: { width: number; height: number }) => {
      setOpenPopups(prev => {
          const newPopups = new Map(prev);
          const popup = newPopups.get(resourceId);
          if (popup) {
              newPopups.set(resourceId, {
                  ...popup,
                  ...newSize
              });
          }
          return newPopups;
      });
  }, []);

  const permanentlyLoggedVisualizationIds = useMemo(() => {
    const loggedIds = new Set<string>();
    if (!allUpskillLogs) return loggedIds;
    allUpskillLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (ex.loggedSets.length > 0) {
          loggedIds.add(ex.definitionId);
        }
      });
    });
    return loggedIds;
  }, [allUpskillLogs]);
  
  const allKnownTopics = useMemo(() => {
    const topicsFromDefs = new Set(upskillDefinitions.map(def => def.category));
    const topicsFromMeta = new Set(Object.keys(topicGoals));
    return Array.from(new Set([...topicsFromDefs, ...topicsFromMeta])).sort();
  }, [upskillDefinitions, topicGoals]);

  const linkedUpskillChildIds = useMemo(() => 
    new Set<string>((upskillDefinitions || []).flatMap(def => def.linkedUpskillIds || []))
  , [upskillDefinitions]);

  const isUpskillObjectiveComplete = useCallback((objectiveId: string): boolean => {
    const visited = new Set<string>();
    const visualizationIds = new Set<string>();
    const queue: string[] = [objectiveId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const node = upskillDefinitions.find(d => d.id === currentId);
        if (!node) continue;

        const isParent = (node.linkedUpskillIds?.length ?? 0) > 0 || (node.linkedResourceIds?.length ?? 0) > 0;
        
        if (!isParent) { // It's a Visualization
            visualizationIds.add(node.id);
        } else { // It's an Objective or Curiosity, so recurse
            (node.linkedUpskillIds || []).forEach(childId => {
                if (!visited.has(childId)) {
                    queue.push(childId);
                }
            });
        }
    }
    
    if (visualizationIds.size === 0) return false;

    return Array.from(visualizationIds).every(vizId => permanentlyLoggedVisualizationIds.has(vizId));
  }, [upskillDefinitions, permanentlyLoggedVisualizationIds]);


  const calculateTotalEstimate = useCallback((def: ExerciseDefinition) => {
    let total = 0;
    const visited = new Set<string>();
  
    function recurse(d: ExerciseDefinition) {
      if (visited.has(d.id)) return;
      visited.add(d.id);
  
      const hasChildren = (d.linkedUpskillIds?.length ?? 0) > 0;
  
      if (hasChildren) {
        (d.linkedUpskillIds || []).forEach(childId => {
          const childDef = upskillDefinitions.find(c => c.id === childId);
          if (childDef) recurse(childDef);
        });
      } else {
        total += d.estimatedDuration || 0;
      }
    }
  
    recurse(def);
    return total;
  }, [upskillDefinitions]);

  const getUpskillLoggedMinutesRecursive = useCallback((definition: ExerciseDefinition) => {
    if (!definition) return 0;
    const visited = new Set<string>();
    const visualizationIds = new Set<string>();

    function recurse(nodeId: string) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        const node = upskillDefinitions.find(d => d.id === nodeId);
        if (!node) return;
        
        const isParent = (node.linkedUpskillIds?.length ?? 0) > 0 || (node.linkedResourceIds?.length ?? 0) > 0;

        if (!isParent) {
            visualizationIds.add(node.id);
        } else {
            (node.linkedUpskillIds || []).forEach(childId => recurse(childId));
        }
    }
    recurse(definition.id);

    let totalMinutes = 0;
    if (allUpskillLogs) {
        allUpskillLogs.forEach(log => {
            log.exercises.forEach(ex => {
                if (visualizationIds.has(ex.definitionId)) {
                    totalMinutes += ex.loggedSets.reduce((sum, set) => sum + set.reps, 0);
                }
            });
        });
    }
    return totalMinutes;
  }, [allUpskillLogs, upskillDefinitions]);

  const totalLoggedTime = useMemo(() => {
    if (!selectedSubtopic) return 0;
    return getUpskillLoggedMinutesRecursive(selectedSubtopic);
  }, [selectedSubtopic, getUpskillLoggedMinutesRecursive]);

  const formatMinutes = (minutes: number) => {
    if (minutes === 0) return "0m";
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h > 0 ? `${h}h` : ''} ${m > 0 ? `${m}m` : ''}`.trim();
  }

  const totalEstimatedDuration = useMemo(() => {
    if (!selectedSubtopic) return 0;
    return calculateTotalEstimate(selectedSubtopic);
  }, [selectedSubtopic, calculateTotalEstimate]);

  useEffect(() => {
    if (editingSubtopic) {
        const hours = Math.floor((editingSubtopic.estimatedDuration || 0) / 60);
        const minutes = (editingSubtopic.estimatedDuration || 0) % 60;
        setEditedSubtopicData({
          ...editingSubtopic,
          estHours: hours > 0 ? String(hours) : '',
          estMinutes: minutes > 0 ? String(minutes) : ''
        });
    }
  }, [editingSubtopic]);
  
  useEffect(() => {
    setIsLoadingPage(false);
  }, []);

  const currentDatedWorkout = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return allUpskillLogs.find(log => log.id === dateKey);
  }, [selectedDate, allUpskillLogs]);

  const currentWorkoutExercises = useMemo(() => currentDatedWorkout?.exercises || [], [currentDatedWorkout]);

  const updateOrAddWorkoutLog = (updatedWorkout: DatedWorkout) => {
    setAllUpskillLogs(prevLogs => {
      const index = prevLogs.findIndex(log => log.id === updatedWorkout.id);
      if (index > -1) {
        const newLogs = [...prevLogs]; newLogs[index] = updatedWorkout; return newLogs;
      }
      return [...prevLogs, updatedWorkout];
    });
  };

  const handleCreateSubtopic = () => {
    if (!selectedMicroSkill || !newSubtopicData.name.trim()) {
        toast({ title: "Error", description: "Name is required.", variant: "destructive" });
        return;
    }

    const hours = parseInt(newSubtopicData.hours, 10) || 0;
    const minutes = parseInt(newSubtopicData.minutes, 10) || 0;
    const totalMinutes = hours * 60 + minutes;

    const newDef: ExerciseDefinition = { 
        id: `def_${Date.now()}_${Math.random()}`, 
        name: newSubtopicData.name.trim(), 
        category: selectedMicroSkill.name as ExerciseCategory,
        description: newSubtopicData.description.trim(),
        link: newSubtopicData.link.trim(),
        iconUrl: getFaviconUrl(newSubtopicData.link.trim()),
        estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined,
    };
    
    setUpskillDefinitions(prev => [...prev.filter(d => d.name !== 'placeholder'), newDef]);
    
    setIsNewSubtopicModalOpen(false);
    setNewSubtopicData({ name: '', description: '', link: '', hours: '', minutes: '' });
    
    toast({ title: "Success", description: `Task "${newDef.name}" created.` });
  };

  const handleDeleteSubtopic = (id: string) => {
    const defToDelete = upskillDefinitions.find(def => def.id === id);
    if (!defToDelete) return;
    setUpskillDefinitions(prev => {
        const withoutDef = prev.filter(def => def.id !== id);
        return withoutDef.map(d => ({
            ...d,
            linkedUpskillIds: (d.linkedUpskillIds || []).filter(linkedId => linkedId !== id)
        }));
    });
    setAllUpskillLogs(prevLogs => prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) })));
    if (selectedSubtopic?.id === id) { setSelectedSubtopic(null); setViewMode('session'); }
    toast({ title: "Success", description: `Task "${defToDelete.name}" removed.` });
  };

  const handleStartEditSubtopic = (def: ExerciseDefinition) => {
    setEditingSubtopic(def);
  };

  const handleSaveSubtopicEdit = () => {
    if (!editingSubtopic || !editedSubtopicData.name?.trim()) { toast({ title: "Error", description: "Subtopic name cannot be empty.", variant: "destructive" }); return; }
    
    const hours = parseInt(editedSubtopicData.estHours || '0', 10);
    const minutes = parseInt(editedSubtopicData.estMinutes || '0', 10);
    const totalMinutes = hours * 60 + minutes;

    let finalData: Partial<ExerciseDefinition> = { 
      ...editedSubtopicData,
      estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined
    };

    if (finalData.link !== editingSubtopic.link) finalData.iconUrl = getFaviconUrl(finalData.link || '');
    
    setUpskillDefinitions(prev => prev.map(def => def.id === editingSubtopic.id ? { ...def, ...finalData } as ExerciseDefinition : def));
    setAllUpskillLogs(prevLogs => prevLogs.map(log => ({...log, exercises: log.exercises.map(ex => ex.definitionId === editingSubtopic.id ? { ...ex, name: finalData.name! } : ex)})));
    if(selectedSubtopic?.id === editingSubtopic.id) setSelectedSubtopic({ ...selectedSubtopic, ...finalData } as ExerciseDefinition);
    toast({ title: "Success", description: `Task updated to "${finalData.name}".` });
    setEditingSubtopic(null);
  };

  const handleAddTaskToSession = (definition: ExerciseDefinition) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newWorkoutExercise: WorkoutExercise = {
      id: `${definition.id}-${Date.now()}-${Math.random()}`, definitionId: definition.id, name: definition.name, category: definition.category,
      loggedSets: [], targetSets: parseInt(DEFAULT_TARGET_SESSIONS.toString(), 10), targetReps: DEFAULT_TARGET_DURATION,
    };
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      if (existingWorkout.exercises.some(ex => ex.definitionId === definition.id)) { toast({ title: "Info", description: `"${definition.name}" is already in this session.` }); return; }
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: [...existingWorkout.exercises, newWorkoutExercise] });
    } else {
      updateOrAddWorkoutLog({ id: dateKey, date: dateKey, exercises: [newWorkoutExercise] });
    }
    toast({ title: "Added to Session", description: `"${definition.name}" added for ${format(selectedDate, 'PPP')}.` });
  };

  const handleRemoveExerciseFromWorkout = (exerciseId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) setAllUpskillLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      else updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => { // Reps will be duration, weight is progress
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const newSet: LoggedSet = { id: `${Date.now()}-${Math.random()}`, reps, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Progress Logged!", description: `Your learning session has been saved.`});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => { // Reps=duration, weight=progress
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.map(set => set.id === setId ? { ...set, reps, weight, timestamp: Date.now() } : set )} : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };

  const handleViewProgress = (definition: ExerciseDefinition) => { setProgressModalConfig({ isOpen: true, exercise: definition }); };
  
  const handleOpenManageLinksModal = (type: 'upskill' | 'resource', parent: ExerciseDefinition) => {
    setManageLinksConfig({ type, parent });
    setTempLinkedIds(type === 'upskill' ? (parent.linkedUpskillIds || []) : (parent.linkedResourceIds || []));
    setNewLinkedItemTopic(parent.category);
    setNewLinkedItemName(''); 
    setNewLinkedItemDescription(''); 
    setNewLinkedItemLink(''); 
    setNewLinkedItemHours(''); 
    setNewLinkedItemMinutes(''); 
    setNewLinkedItemFolderId('');
    setLinkSearchTerm(''); 
    setLinkResourceFolderId(''); 
    setLinkUpskillTopic('');
    setIsManageLinksModalOpen(true);
  };
  
  const handleCreateAndLinkItem = async () => {
    if (!manageLinksConfig) return;
    const { type, parent } = manageLinksConfig;
    
    let newId: string;
    let updatedParent: ExerciseDefinition;

    if (type === 'resource') {
        if (!newLinkedItemFolderId) { toast({ title: "Error", description: "A folder must be selected.", variant: "destructive" }); return; }
        if (!newLinkedItemLink.trim()) { toast({ title: "Error", description: "A link is required.", variant: "destructive" }); return; }
        
        setIsCreatingLink(true);
        try {
            let fullLink = newLinkedItemLink.trim();
            if (!fullLink.startsWith('http://') && !fullLink.startsWith('https://')) {
                fullLink = 'https://' + fullLink;
            }
            const response = await fetch('/api/get-link-metadata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: fullLink }), });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to fetch metadata.');
            const newResource: Resource = {
                id: `res_${Date.now()}_${Math.random()}`, name: result.title || 'Untitled Resource', link: fullLink, type: 'link',
                description: result.description || '', folderId: newLinkedItemFolderId, iconUrl: getFaviconUrl(fullLink),
            };
            newId = newResource.id;
            setResources(prev => [...prev, newResource]);
            
            updatedParent = { ...parent, linkedResourceIds: [...(parent.linkedResourceIds || []), newId] };
            setUpskillDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
            if (selectedSubtopic?.id === parent.id) {
                setSelectedSubtopic(updatedParent);
            }
            toast({ title: "Resource Added", description: `"${newResource.name}" has been saved and linked.`});

        } catch (error) {
            toast({ title: "Error adding resource", description: error instanceof Error ? error.message : "Could not fetch metadata.", variant: "destructive" });
        } finally { 
            setIsCreatingLink(false);
            setIsManageLinksModalOpen(false); 
        }
        return;
    }
    
    // For type 'upskill'
    if (!newLinkedItemName.trim() || !newLinkedItemTopic.trim()) {
        toast({ title: "Error", description: "Name and topic are required.", variant: "destructive" }); return;
    }
    const hours = parseInt(newLinkedItemHours, 10) || 0;
    const minutes = parseInt(newLinkedItemMinutes, 10) || 0;
    const totalMinutes = hours * 60 + minutes;
    const link = newLinkedItemLink.trim();
    const newUpskillDef: ExerciseDefinition = {
        id: `def_${Date.now()}_upskill_${Math.random()}`, name: newLinkedItemName.trim(), category: newLinkedItemTopic.trim() as ExerciseCategory,
        description: newLinkedItemDescription.trim(), link: link, iconUrl: getFaviconUrl(link),
        estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined,
    };
    newId = newUpskillDef.id;
    setUpskillDefinitions(prev => [...prev, newUpskillDef]);
    updatedParent = { ...parent, linkedUpskillIds: [...(parent.linkedUpskillIds || []), newId] };
    setUpskillDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
    if (selectedSubtopic?.id === parent.id) {
        setSelectedSubtopic(updatedParent);
    }
    toast({ title: "Success", description: "New item created and linked." });
    setIsManageLinksModalOpen(false);
  };


  const handleSaveExistingLinks = () => {
    if (!manageLinksConfig) return;
    const { type, parent } = manageLinksConfig;
    const key = type === 'upskill' ? 'linkedUpskillIds' : 'linkedResourceIds';
    const updatedParent = { ...parent, [key]: tempLinkedIds };
    
    setUpskillDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
    if (selectedSubtopic?.id === parent.id) {
        setSelectedSubtopic(updatedParent);
    }
    toast({ title: "Success", description: "Links have been updated." });
    setIsManageLinksModalOpen(false);
  };
  
  const filteredItemsForLinking = useMemo(() => {
    if (!manageLinksConfig) return [];
    const { type, parent } = manageLinksConfig;
    
    let definitionsSource: any[];
    let parentLinkedIds: string[] = [];
    
    if (type === 'resource') {
        if (!linkResourceFolderId) return [];
        definitionsSource = resources.filter(res => res.folderId === linkResourceFolderId);
        parentLinkedIds = parent.linkedResourceIds || [];
    } else { // 'upskill'
        definitionsSource = linkUpskillTopic ? upskillDefinitions.filter(d => d.category === linkUpskillTopic) : upskillDefinitions;
        parentLinkedIds = parent.linkedUpskillIds || [];
    }
    
    return definitionsSource.filter(def => {
        if (!def.name || def.name === 'placeholder' || def.id === parent.id || parentLinkedIds.includes(def.id)) {
            return false;
        }

        if (linkSearchTerm && !def.name.toLowerCase().includes(linkSearchTerm.toLowerCase())) {
            return false;
        }
        
        return true;
    });
  }, [manageLinksConfig, upskillDefinitions, resources, linkSearchTerm, linkResourceFolderId, linkUpskillTopic]);


  const handleUnlinkItem = (type: 'upskill' | 'resource', idToUnlink: string) => {
    if (!selectedSubtopic) return;
    let updatedParent: ExerciseDefinition;
    let key: 'linkedUpskillIds' | 'linkedResourceIds' = type === 'upskill' ? 'linkedUpskillIds' : 'linkedResourceIds';
    updatedParent = { ...selectedSubtopic, [key]: (selectedSubtopic[key] || []).filter((id: string) => id !== idToUnlink) };
    
    setUpskillDefinitions(prev => prev.map(def => def.id === selectedSubtopic.id ? updatedParent : def));
    setSelectedSubtopic(updatedParent);
    toast({ title: "Unlinked", description: "The item has been unlinked." });
  };
  
  const renderFolderOptions = useCallback((parentId: string | null, level: number): JSX.Element[] => {
    const folders = resourceFolders.filter(f => f.parentId === parentId).sort((a,b) => a.name.localeCompare(b.name));
    let options: JSX.Element[] = [];
    folders.forEach(folder => {
        options.push(<SelectItem key={folder.id} value={folder.id}><span style={{ paddingLeft: `${level * 1.5}rem` }}>{folder.name}</span></SelectItem>);
        options = options.concat(renderFolderOptions(folder.id, level + 1));
    });
    return options;
  }, [resourceFolders]);

  const handleStartEditResource = (res: Resource) => {
    router.push('/resources');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
  
    if (!over || active.id === over.id) return;
  
    const draggedId = active.id as string;
    const targetId = over.id as string;
  
    const allDefs = [...upskillDefinitions, ...resources];
    const draggedDef = allDefs.find(d => d.id === draggedId);
    const targetDef = allDefs.find(d => d.id === targetId);
  
    if (!draggedDef || !targetDef || !selectedSubtopic) {
        toast({ title: "Error", description: "Could not find items to link.", variant: "destructive" });
        return;
    }
    
    const parentChildrenIds = new Set([
        ...(selectedSubtopic.linkedUpskillIds || []),
        ...(selectedSubtopic.linkedResourceIds || []),
    ]);

    if (!parentChildrenIds.has(draggedId) || !parentChildrenIds.has(targetId)) {
        toast({ title: "Link Error", description: "Can only link sibling items within the same subtopic.", variant: "destructive" });
        return;
    }
    
    const isDraggedResource = resources.some(d => d.id === draggedId);
    
    setUpskillDefinitions(prev => prev.map(def => {
        if (def.id === targetId) { // targetDef is always an upskill task
            let updatedDef = { ...def };
            if (isDraggedResource) {
                updatedDef.linkedResourceIds = [...(updatedDef.linkedResourceIds || []), draggedId];
            } else { // Dragged an upskill item
                updatedDef.linkedUpskillIds = [...(updatedDef.linkedUpskillIds || []), draggedId];
            }
            return updatedDef;
        }
        return def;
    }));
    
    const updatedParent = {
        ...selectedSubtopic,
        linkedUpskillIds: (selectedSubtopic.linkedUpskillIds || []).filter(id => id !== draggedId),
        linkedResourceIds: (selectedSubtopic.linkedResourceIds || []).filter(id => id !== draggedId),
    };
    
    setUpskillDefinitions(prev => prev.map(def => def.id === selectedSubtopic.id ? updatedParent : def));
    setSelectedSubtopic(updatedParent);
  
    toast({ title: "Re-linked!", description: `"${draggedDef.name}" is now a sub-task of "${targetDef.name}".` });
  };
  
  if (isLoadingPage) {
    return <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-16 w-16 text-primary animate-spin mb-4" /><p className="text-muted-foreground">Loading your upskill data...</p></div>;
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            
            <aside className="lg:col-span-1 space-y-6">
                 <SkillLibrary
                    pageType="upskill"
                    selectedMicroSkill={selectedMicroSkill}
                    onSelectMicroSkill={setSelectedMicroSkill}
                    definitions={upskillDefinitions}
                    onSelectFocusArea={setSelectedSubtopic}
                    onOpenNewFocusArea={handleOpenNewSubtopicModal}
                />
              {selectedSubtopic && (
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <div><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Subtopic Stats</CardTitle><CardDescription className="text-xs">Aggregated progress for "{selectedSubtopic.name}"</CardDescription></div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewProgress(selectedSubtopic)}><TrendingUp className="h-4 w-4"/></Button>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                          <div className="space-y-2">
                              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Logged Time</span><span className="font-medium">{formatMinutes(totalLoggedTime)}</span></div>
                              {totalEstimatedDuration > 0 && (<div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Estimated Time</span><span className="font-medium">{formatMinutes(totalEstimatedDuration)}</span></div>)}
                          </div>
                          {totalEstimatedDuration > 0 && (
                              <div>
                                  <Progress value={Math.min(100, (totalLoggedTime / totalEstimatedDuration) * 100)} className="h-2" />
                                  <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>0%</span><span>{((totalLoggedTime / totalEstimatedDuration) * 100).toFixed(0)}%</span></div>
                              </div>
                          )}
                          {totalEstimatedDuration > 0 && totalLoggedTime > totalEstimatedDuration && (<Badge variant="destructive" className="w-full justify-center">Overspent by {formatMinutes(totalLoggedTime - totalEstimatedDuration)}</Badge>)}
                      </CardContent>
                  </Card>
              )}
            </aside>

            <section aria-labelledby="main-panel-heading" className="lg:col-span-3 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between p-4">
                        <div className="flex-grow"><CardTitle id="main-panel-heading" className="flex items-center gap-2 text-lg">{viewMode === 'session' ? <ListChecks /> : <Library />}{viewMode === 'session' ? `Session for: ${format(selectedDate, 'PPP')}` : `Library: ${selectedMicroSkill?.name || 'Select a micro-skill'}`}</CardTitle></div>
                        <div className='flex items-center gap-2 flex-shrink-0'>
                          <Button variant={viewMode === 'session' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('session')}>Session</Button>
                          <Button variant={viewMode === 'library' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('library')}>Library</Button>
                          <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-[150px] justify-start text-left font-normal h-9",!selectedDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{selectedDate ? format(selectedDate, "MMM dd") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus /></PopoverContent></Popover>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        {viewMode === 'session' ? (
                            <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
                                {currentWorkoutExercises.length === 0 ? (
                                  <div className="text-center py-10"><BookCopy className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">No tasks for {format(selectedDate, 'PPP')}.</p><p className="text-sm text-muted-foreground/80">Add tasks from the library to get started!</p></div>
                                ) : (
                                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {currentWorkoutExercises.map((exercise) => {
                                        const definition = upskillDefinitions.find(def => def.id === exercise.definitionId);
                                        return (
                                          <WorkoutExerciseCard 
                                            key={exercise.id} exercise={exercise} definition={definition} definitionGoal={topicGoals[exercise.category]}
                                            onLogSet={handleLogSet} onDeleteSet={handleDeleteSet} onUpdateSet={handleUpdateSet} 
                                            onRemoveExercise={handleRemoveExerciseFromWorkout} onViewProgress={definition ? () => handleViewProgress(definition) : undefined}
                                            pageType="upskill"
                                          />
                                        );
                                    })}
                                  </div>
                                )}
                            </div>
                        ) : selectedSubtopic ? (
                             <div className="space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold">{selectedSubtopic.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleOpenManageLinksModal('upskill', selectedSubtopic)}>
                                            <LinkIcon className="mr-2 h-4 w-4" /> Link Sub-task
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleOpenManageLinksModal('resource', selectedSubtopic)}>
                                            <Folder className="mr-2 h-4 w-4" /> Link Resource
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {(selectedSubtopic.linkedUpskillIds || []).map(id => {
                                        const def = upskillDefinitions.find(d => d.id === id);
                                        return def ? <LinkedUpskillItem key={id} upskillDef={def} {...{ handleAddTaskToSession, setSelectedSubtopic, setViewMode, handleStartEditSubtopic, handleUnlinkItem: (type, id) => handleUnlinkItem(type, id), handleDeleteSubtopic, handleViewProgress, isComplete: isUpskillObjectiveComplete(def.id), getUpskillLoggedMinutesRecursive, upskillDefinitions, resources, calculatedEstimate: calculateTotalEstimate(def), setEmbedUrl, setFloatingVideoUrl, linkedUpskillChildIds }} /> : null;
                                    })}
                                    {(selectedSubtopic.linkedResourceIds || []).map(id => {
                                        const resource = resources.find(r => r.id === id);
                                        return resource ? <LinkedResourceItem key={id} resource={resource} handleUnlinkItem={(type, id) => handleUnlinkItem(type, id)} setEmbedUrl={setEmbedUrl} onOpenNestedPopup={handleOpenNestedPopup} handleStartEditResource={handleStartEditResource} /> : null;
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">Select a micro-skill from the library to view its tasks.</div>
                        )}
                    </CardContent>
                </Card>
            </section>
          </div>
          <Dialog open={isNewSubtopicModalOpen} onOpenChange={setIsNewSubtopicModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>
                        This will create a new standalone task under the "{selectedMicroSkill?.name}" micro-skill.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-1">
                        <Label htmlFor="new-subtopic-name">Task Name</Label>
                        <Input id="new-subtopic-name" value={newSubtopicData.name} onChange={(e) => setNewSubtopicData(d => ({ ...d, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="new-subtopic-desc">Description (Optional)</Label>
                        <Textarea id="new-subtopic-desc" value={newSubtopicData.description} onChange={(e) => setNewSubtopicData(d => ({ ...d, description: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="new-subtopic-link">Link (Optional)</Label>
                        <Input id="new-subtopic-link" value={newSubtopicData.link} onChange={(e) => setNewSubtopicData(d => ({ ...d, link: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label htmlFor="new-subtopic-hours">Est. Hours</Label><Input type="number" id="new-subtopic-hours" value={newSubtopicData.hours} onChange={(e) => setNewSubtopicData(d => ({ ...d, hours: e.target.value }))} /></div>
                        <div className="space-y-1"><Label htmlFor="new-subtopic-mins">Est. Minutes</Label><Input type="number" id="new-subtopic-mins" value={newSubtopicData.minutes} onChange={(e) => setNewSubtopicData(d => ({ ...d, minutes: e.target.value }))} /></div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewSubtopicModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateSubtopic}>Create Task</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
          {progressModalConfig.isOpen && progressModalConfig.exercise && (
            <ExerciseProgressModal isOpen={progressModalConfig.isOpen} onOpenChange={(isOpen) => setProgressModalConfig(prev => ({...prev, isOpen}))} exercise={progressModalConfig.exercise} allWorkoutLogs={allUpskillLogs} pageType="upskill" topicGoals={topicGoals} />
          )}
          {isManageLinksModalOpen && manageLinksConfig && (
              <Dialog open={isManageLinksModalOpen} onOpenChange={setIsManageLinksModalOpen}>
                <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Manage Links for: {manageLinksConfig.parent.name}</DialogTitle>
                    <DialogDescription>Link existing items or create new ones to build out this objective.</DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="link" className="flex-grow flex flex-col min-h-0">
                      <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="link">Link Existing</TabsTrigger>
                          <TabsTrigger value="create">Create New</TabsTrigger>
                      </TabsList>
                      <TabsContent value="link" className="flex-grow min-h-0">
                          <div className="flex flex-col h-full">
                              <div className="flex gap-2 mb-2 p-1">
                                  {manageLinksConfig.type === 'resource' && <Select value={linkResourceFolderId} onValueChange={setLinkResourceFolderId}><SelectTrigger placeholder="Select Folder..."/><SelectContent>{renderFolderOptions(null, 0)}</SelectContent></Select>}
                                  {manageLinksConfig.type === 'upskill' && <Select value={linkUpskillTopic} onValueChange={setLinkUpskillTopic}><SelectTrigger placeholder="Select Topic..."/><SelectContent>{allKnownTopics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>}
                                  <Input placeholder="Search..." value={linkSearchTerm} onChange={e => setLinkSearchTerm(e.target.value)} />
                              </div>
                              <ScrollArea className="flex-grow border rounded-md p-2">
                                  {filteredItemsForLinking.length > 0 ? (
                                      filteredItemsForLinking.map(item => (
                                          <div key={item.id} className="flex items-center space-x-2 p-1">
                                              <Checkbox
                                                  id={`link-${item.id}`}
                                                  checked={tempLinkedIds.includes(item.id)}
                                                  onCheckedChange={(checked) => {
                                                      setTempLinkedIds(prev => checked ? [...prev, item.id] : prev.filter(id => id !== item.id));
                                                  }}
                                              />
                                              <Label htmlFor={`link-${item.id}`} className="font-normal">{item.name}</Label>
                                          </div>
                                      ))
                                  ) : <p className="text-sm text-center text-muted-foreground p-4">No items to link. Try another filter or create a new item.</p>}
                              </ScrollArea>
                              <DialogFooter className="pt-4">
                                  <Button onClick={handleSaveExistingLinks}>Save Links</Button>
                              </DialogFooter>
                          </div>
                      </TabsContent>
                      <TabsContent value="create" className="flex-grow">
                          <ScrollArea className="h-full pr-4">
                              <div className="space-y-4">
                                  {manageLinksConfig.type !== 'resource' ? (
                                      <>
                                          <div className="space-y-1"><Label>Topic</Label><Input value={newLinkedItemTopic} onChange={e => setNewLinkedItemTopic(e.target.value)} /></div>
                                          <div className="space-y-1"><Label>Name</Label><Input value={newLinkedItemName} onChange={e => setNewLinkedItemName(e.target.value)} /></div>
                                          <div className="space-y-1"><Label>Description</Label><Textarea value={newLinkedItemDescription} onChange={e => setNewLinkedItemDescription(e.target.value)} /></div>
                                          <div className="space-y-1"><Label>Link (Optional)</Label><Input value={newLinkedItemLink} onChange={e => setNewLinkedItemLink(e.target.value)} /></div>
                                          <div className="grid grid-cols-2 gap-4">
                                              <div className="space-y-1"><Label>Est. Hours</Label><Input type="number" value={newLinkedItemHours} onChange={e => setNewLinkedItemHours(e.target.value)} /></div>
                                              <div className="space-y-1"><Label>Est. Minutes</Label><Input type="number" value={newLinkedItemMinutes} onChange={e => setNewLinkedItemMinutes(e.target.value)} /></div>
                                          </div>
                                      </>
                                  ) : (
                                      <>
                                          <div className="space-y-1"><Label>Folder</Label><Select value={newLinkedItemFolderId} onValueChange={setNewLinkedItemFolderId}><SelectTrigger/><SelectContent>{renderFolderOptions(null, 0)}</SelectContent></Select></div>
                                          <div className="space-y-1"><Label>Link</Label><Input value={newLinkedItemLink} onChange={e => setNewLinkedItemLink(e.target.value)} /></div>
                                      </>
                                  )}
                                  <DialogFooter className="pt-4">
                                      <Button onClick={handleCreateAndLinkItem} disabled={isCreatingLink}>{isCreatingLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create & Link</Button>
                                  </DialogFooter>
                              </div>
                          </ScrollArea>
                      </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
          )}

        </div>
      {Array.from(openPopups.values()).map((popupState) => (
          <ResourcePopupCard
              key={popupState.resourceId}
              popupState={popupState}
              allResources={resources}
              onOpenNestedPopup={handleOpenNestedPopup}
              onClose={handleClosePopup}
              onSizeChange={handleSizeChange}
          />
      ))}
    </DndContext>
  );
}

export default function UpskillPage() {
  return ( <AuthGuard> <UpskillPageContent /> </AuthGuard> );
}
