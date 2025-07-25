

"use client";

import React, { useState, useEffect, FormEvent, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, ChevronDown, CalendarIcon, TrendingUp, Loader2, Briefcase, BookCopy, MoreVertical, Link as LinkIcon, Folder, Library, Globe, ExternalLink, Youtube, Share2, ArrowRight, Expand, Filter as FilterIcon, LineChart as LineChartIcon, Unlink, GitMerge, Clock, Lightbulb, Flag, Bolt, Flashlight, Focus, GripVertical, PictureInPicture, Code, MessageSquare } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, getISOWeek, isMonday, getYear, addDays, parseISO, differenceInDays } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, DeepWorkTopicMetadata, Resource, ResourceFolder } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { ExerciseProgressModal } from '@/components/ExerciseProgressModal';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
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
import { FocusAreaProgressModal } from '@/components/FocusAreaProgressModal';
import { MindMapViewer } from '@/components/MindMapViewer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';

interface PopupState {
  resourceId: string;
  level: number;
  x: number;
  y: number;
  parentId?: string;
  width?: number;
  height?: number;
}

interface ResourcePopupProps {
  popupState: PopupState;
  allResources: Resource[];
  onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState: PopupState) => void;
  onClose: (resourceId: string) => void;
  onSizeChange: (resourceId: string, newSize: { width: number; height: number }) => void;
}

const ResourcePopupCard = ({ popupState, allResources, onOpenNestedPopup, onClose, onSizeChange }: ResourcePopupProps) => {
    const resource = allResources.find(r => r.id === popupState.resourceId);
    const cardRef = useRef<HTMLDivElement>(null);

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `popup-${popupState.resourceId}`,
    });
    
    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        willChange: 'transform',
    };
    
    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }

    if (!resource) return null;

    const handleLinkClick = (e: React.MouseEvent, pointResourceId: string) => {
      e.stopPropagation();
      onOpenNestedPopup(pointResourceId, e, popupState);
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="z-[60]">
            <Card ref={cardRef} className="shadow-2xl border-2 border-primary/50 bg-card max-h-[70vh] flex flex-col" style={{ width: `${popupState.width}px` }}>
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
    } catch (e) {
        // Silently fail for invalid URLs
    }
    return null;
};

const isNotionUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.endsWith('notion.so');
    } catch (e) {
        return false;
    }
};

const isObsidianUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname === 'share.note.sx';
    } catch (e) {
        return false;
    }
};

const DraggableSubtaskItem: React.FC<{ 
    childId: string;
    parentId: string;
    childName: string;
    isLogged: boolean;
    type: 'deepwork' | 'upskill' | 'resource';
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

function LinkedUpskillCard({ 
    id,
    upskillDef,
    isUpskillObjectiveComplete,
    getUpskillLoggedMinutesRecursive,
    setEmbedUrl,
    setFloatingVideoUrl,
    handleViewProgress,
    handleStartEditUpskill,
    handleUnlinkItem,
    handleDeleteUpskillDefinition,
    upskillDefinitions,
    formatDuration,
    calculatedEstimate,
    setSelectedSubtopic,
    setViewMode,
} : {
    id: string;
    upskillDef: ExerciseDefinition;
    isUpskillObjectiveComplete: (id: string) => boolean;
    getUpskillLoggedMinutesRecursive: (def: ExerciseDefinition) => number;
    setEmbedUrl: (url: string | null) => void;
    setFloatingVideoUrl: (url: string | null) => void;
    handleViewProgress: (def: ExerciseDefinition, type: 'deepwork' | 'upskill') => void;
    handleStartEditUpskill: (def: ExerciseDefinition) => void;
    handleUnlinkItem: (type: 'upskill' | 'deepwork' | 'resource', id: string) => void;
    handleDeleteUpskillDefinition: (id: string) => void;
    upskillDefinitions: ExerciseDefinition[];
    formatDuration: (minutes: number) => string;
    calculatedEstimate: number;
    setSelectedSubtopic: (def: ExerciseDefinition | null) => void;
    setViewMode: (mode: 'session' | 'library') => void;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id });
    const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id });
    
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 100 : 'auto', } : undefined;

    const setCombinedRefs = (node: HTMLElement | null) => {
        setNodeRef(node);
        setDroppableNodeRef(node);
    };

    const youtubeEmbedUrl = upskillDef.link ? getYouTubeEmbedUrl(upskillDef.link) : null;
    const isNotionObsidianEmbed = upskillDef.link ? (isNotionUrl(upskillDef.link) || isObsidianUrl(upskillDef.link)) : false;
    const embedLinkForModal = youtubeEmbedUrl || (isNotionObsidianEmbed ? upskillDef.link : null);

    const loggedMinutes = getUpskillLoggedMinutesRecursive(upskillDef);
    const isComplete = isUpskillObjectiveComplete(upskillDef.id);
    const isParent = (upskillDef.linkedUpskillIds?.length ?? 0) > 0 || (upskillDef.linkedResourceIds?.length ?? 0) > 0;
    const estDuration = isParent ? calculatedEstimate : upskillDef.estimatedDuration;

    return (
        <div ref={setCombinedRefs} style={style} className={cn(isOver && !isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-2xl", isDragging && "opacity-80 shadow-2xl")}>
            <Card className={cn("relative rounded-2xl flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl min-h-[230px]", isComplete && "opacity-70 bg-muted/30")}>
                <button ref={setActivatorNodeRef} {...listeners} {...attributes} className="absolute bottom-2 left-2 z-20 cursor-grab rounded-full p-2 hover:bg-muted" onMouseDown={(e) => e.stopPropagation()} >
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </button>
                {youtubeEmbedUrl ? (
                    <>
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={() => setFloatingVideoUrl(upskillDef.link!)} onMouseDown={(e) => e.stopPropagation()}>
                                <PictureInPicture className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={() => setEmbedUrl(embedLinkForModal)} onMouseDown={(e) => e.stopPropagation()}>
                                <Expand className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onMouseDown={(e) => e.stopPropagation()}>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onMouseDown={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem onSelect={() => handleViewProgress(upskillDef, 'upskill')}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => handleStartEditUpskill(upskillDef)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleUnlinkItem('upskill', id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleDeleteUpskillDefinition(id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="aspect-video w-full bg-black overflow-hidden rounded-t-2xl">
                            <iframe src={youtubeEmbedUrl} title={upskillDef.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
                        </div>
                        <div className="p-4 flex-grow flex flex-col">
                          <div className="flex items-start justify-between gap-2 flex-grow">
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2">
                                    <Youtube className="h-5 w-5 flex-shrink-0 text-red-500" />
                                    <p className={cn("text-base font-bold truncate", isComplete && "line-through text-muted-foreground")} title={upskillDef.name}>{upskillDef.name}</p>
                                </div>
                                <CardDescription className="text-xs">{upskillDef.category}</CardDescription>
                            </div>
                          </div>
                          <div className="mt-auto pt-2 flex items-center justify-end">
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {estDuration && <Badge variant="outline">{formatDuration(estDuration)} est.</Badge>}
                                {loggedMinutes > 0 && <Badge variant="secondary">{formatDuration(loggedMinutes)} logged</Badge>}
                            </div>
                          </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isNotionObsidianEmbed ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={() => setEmbedUrl(embedLinkForModal)} onMouseDown={(e) => e.stopPropagation()}>
                                    <Expand className="h-4 w-4" />
                                </Button>
                            ) : (
                                upskillDef.link ? (
                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm">
                                        <a href={upskillDef.link} target="_blank" rel="noopener noreferrer" onMouseDown={(e) => e.stopPropagation()}>
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </Button>
                                ) : null
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onMouseDown={(e) => e.stopPropagation()}>
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onMouseDown={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem onSelect={() => handleViewProgress(upskillDef, 'upskill')}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => handleStartEditUpskill(upskillDef)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleUnlinkItem('upskill', id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleDeleteUpskillDefinition(id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Flashlight className="h-5 w-5 text-amber-500 flex-shrink-0" />
                            <span className={cn("truncate", isComplete && "line-through text-muted-foreground")} title={upskillDef.name}>{upskillDef.name}</span>
                          </CardTitle>
                          <CardDescription>{upskillDef.category}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            {(upskillDef.linkedUpskillIds?.length ?? 0) > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                {(upskillDef.linkedUpskillIds || []).map(childId => {
                                  const childDef = upskillDefinitions.find(d => d.id === childId);
                                  if (!childDef) return null;
                                  const isChildComplete = isUpskillObjectiveComplete(childId);
                                  return (
                                    <DraggableSubtaskItem 
                                        key={childId} 
                                        childId={childId} 
                                        parentId={upskillDef.id} 
                                        childName={childDef.name} 
                                        isLogged={isChildComplete} 
                                        type="upskill" 
                                        onClick={() => { setSelectedSubtopic(childDef); setViewMode('library'); }}
                                    />
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground line-clamp-2">{upskillDef.description || "This curiosity has no objectives yet."}</p>
                            )}
                        </CardContent>
                        <CardFooter className="pt-3 flex items-center justify-end">
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {estDuration && <Badge variant="outline" className="flex-shrink-0">{formatDuration(estDuration)}</Badge>}
                            {loggedMinutes > 0 && <Badge variant="secondary">{formatDuration(loggedMinutes)} logged</Badge>}
                          </div>
                        </CardFooter>
                    </>
                )}
            </Card>
        </div>
    )
}

function LinkedResourceItem({ resource, handleUnlinkItem, setEmbedUrl, onOpenNestedPopup, handleStartEditResource }: {
  resource: Resource;
  handleUnlinkItem: (type: 'upskill' | 'deepwork' | 'resource', id: string) => void;
  setEmbedUrl: (url: string | null) => void;
  onOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
  handleStartEditResource: (resource: Resource) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id: resource.id });
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id: resource.id });

  const setCombinedRefs = (node: HTMLElement | null) => {
    setNodeRef(node);
    setDroppableNodeRef(node);
  };
  
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 100 : 'auto', } : undefined;

  const youtubeEmbedUrl = getYouTubeEmbedUrl(resource.link);
  const isSpecialEmbed = resource.link ? (isNotionUrl(resource.link) || isObsidianUrl(resource.link)) : false;
  const embedLinkForModal = youtubeEmbedUrl || (isSpecialEmbed ? resource.link : null);

  if (resource.type === 'card') {
    const hasMarkdownContent = (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
    return (
      <div ref={setCombinedRefs} style={style} className={cn(isOver && !isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg", isDragging && "opacity-80 shadow-2xl")}>
        <Card className={cn("relative flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl", hasMarkdownContent ? 'md:col-span-2 xl:col-span-3' : '')}>
          <button ref={setActivatorNodeRef} {...listeners} {...attributes} className="absolute bottom-2 left-2 z-20 cursor-grab rounded-full p-2 hover:bg-muted" onMouseDown={(e) => e.stopPropagation()} >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
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
    <div ref={setCombinedRefs} style={style} className={cn(isOver && !isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg", isDragging && "opacity-80 shadow-2xl")}>
        <Card className="relative group transition-all duration-300 hover:shadow-xl">
            <button ref={setActivatorNodeRef} {...listeners} {...attributes} className="absolute bottom-2 left-2 z-20 cursor-grab rounded-full p-2 hover:bg-muted" onMouseDown={(e) => e.stopPropagation()} >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
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


function LinkedDeepWorkCard({
    id,
    deepworkDef,
    getDeepWorkLoggedMinutes,
    permanentlyLoggedActionIds,
    handleAddTaskToSession,
    setSelectedFocusArea,
    setViewMode,
    handleToggleReadyForBranding,
    handleStartEditDefinition,
    handleUnlinkItem,
    handleDeleteExerciseDefinition,
    handleViewProgress,
    deepWorkDefinitions,
    formatDuration,
    calculatedEstimate,
    upskillDefinitions,
    resources,
    setSelectedSubtopic
} : {
    id: string;
    deepworkDef: ExerciseDefinition;
    getDeepWorkLoggedMinutes: (def: ExerciseDefinition) => number;
    permanentlyLoggedActionIds: Set<string>;
    handleAddTaskToSession: (def: ExerciseDefinition) => void;
    setSelectedFocusArea: (def: ExerciseDefinition) => void;
    setViewMode: (mode: 'session' | 'library') => void;
    handleToggleReadyForBranding: (id: string) => void;
    handleStartEditDefinition: (def: ExerciseDefinition) => void;
    handleUnlinkItem: (type: 'upskill' | 'deepwork' | 'resource', id: string) => void;
    handleDeleteExerciseDefinition: (id: string) => void;
    handleViewProgress: (def: ExerciseDefinition, type: 'deepwork' | 'upskill') => void;
    deepWorkDefinitions: ExerciseDefinition[];
    formatDuration: (minutes: number) => string;
    calculatedEstimate: number;
    upskillDefinitions: ExerciseDefinition[];
    resources: Resource[];
    setSelectedSubtopic: (def: ExerciseDefinition | null) => void;
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id });
    const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id });
    
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: isDragging ? 100 : 'auto', } : undefined;

    const setCombinedRefs = (node: HTMLElement | null) => {
        setNodeRef(node);
        setDroppableNodeRef(node);
    };

    const isObjective = (deepworkDef.linkedDeepWorkIds?.length ?? 0) > 0;
    const nodeType = isObjective ? 'Objective' : 'Action';
    const loggedMinutes = getDeepWorkLoggedMinutes(deepworkDef);
    const estDuration = isObjective ? calculatedEstimate : deepworkDef.estimatedDuration;
    const hasLinkedLearning = (deepworkDef.linkedUpskillIds?.length ?? 0) > 0 || (deepworkDef.linkedResourceIds?.length ?? 0) > 0;
    const router = useRouter();

    const isComplete = useMemo(() => {
        if (!isObjective) return permanentlyLoggedActionIds.has(deepworkDef.id);
        
        const childActionIds = (deepworkDef.linkedDeepWorkIds || []).filter(childId => {
            const childDef = deepWorkDefinitions.find(d => d.id === childId);
            // Include only final actions (no children of their own)
            return childDef && (childDef.linkedDeepWorkIds?.length ?? 0) === 0;
        });

        if (childActionIds.length === 0) return false;
        
        return childActionIds.every(id => permanentlyLoggedActionIds.has(id));
    }, [deepworkDef, isObjective, permanentlyLoggedActionIds, deepWorkDefinitions]);

    return (
        <div ref={setCombinedRefs} style={style} className={cn(isOver && !isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-2xl", isDragging && "opacity-80 shadow-2xl")}>
         <Card className={cn("relative rounded-2xl flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl min-h-[230px]", isComplete && "opacity-70 bg-muted/30")}>
            <button ref={setActivatorNodeRef} {...listeners} {...attributes} className="absolute bottom-2 left-2 z-20 cursor-grab rounded-full p-2 hover:bg-muted" onMouseDown={(e) => e.stopPropagation()} >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={isObjective ? -1 : 0}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={() => handleAddTaskToSession(deepworkDef)} disabled={isObjective} onMouseDown={(e) => e.stopPropagation()}>
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{isObjective ? 'Add sub-tasks instead' : 'Add to Session'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={() => { setSelectedFocusArea(deepworkDef); setViewMode('library'); }} onMouseDown={(e) => e.stopPropagation()}>
                    <ArrowRight className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onMouseDown={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onMouseDown={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onSelect={() => handleViewProgress(deepworkDef, 'deepwork')}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem checked={!!deepworkDef.isReadyForBranding} onSelect={(e) => { e.preventDefault(); handleToggleReadyForBranding(deepworkDef.id); }}>
                            <Share2 className="mr-2 h-4 w-4" />
                            <span>Ready for Branding</span>
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleStartEditDefinition(deepworkDef)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleUnlinkItem('deepwork', id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDeleteExerciseDefinition(deepworkDef.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
           <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {isObjective ? (
                    <Flag className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Bolt className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  )}
                <span className={cn("truncate", isComplete && "line-through text-muted-foreground")} title={deepworkDef.name}>{deepworkDef.name}</span>
                <Badge variant="outline" className="text-xs">{nodeType}</Badge>
              </CardTitle>
              <CardDescription>{deepworkDef.category}</CardDescription>
           </CardHeader>
           <CardContent className="flex-grow">
              {deepworkDef.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">{deepworkDef.description}</p>
              ) : isObjective ? (
                  (deepworkDef.linkedDeepWorkIds?.length ?? 0) > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                          {(deepworkDef.linkedDeepWorkIds || []).map(childId => {
                              const childDef = deepWorkDefinitions.find(d => d.id === childId);
                              if (!childDef) return null;
                              const isChildPermanentlyLogged = permanentlyLoggedActionIds.has(childDef.id);
                              return (
                                  <DraggableSubtaskItem 
                                    key={childId} 
                                    childId={childId} 
                                    parentId={deepworkDef.id} 
                                    childName={childDef.name} 
                                    isLogged={isChildPermanentlyLogged} 
                                    type="deepwork" 
                                    onClick={() => { setSelectedFocusArea(childDef); setViewMode('library'); }}
                                  />
                              );
                          })}
                      </div>
                  ) : (
                      <p className="text-sm text-muted-foreground line-clamp-2">This objective has no sub-tasks yet. Link items to it.</p>
                  )
              ) : hasLinkedLearning ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    {(deepworkDef.linkedUpskillIds || []).map(childId => {
                        const childDef = upskillDefinitions.find(d => d.id === childId);
                        if (!childDef) return null;
                        return <DraggableSubtaskItem key={childId} childId={childId} parentId={deepworkDef.id} childName={childDef.name} isLogged={false} type="upskill" onClick={() => { router.push('/upskill'); setSelectedSubtopic(childDef) }} />;
                    })}
                     {(deepworkDef.linkedResourceIds || []).map(childId => {
                        const childDef = resources.find(d => d.id === childId);
                        if (!childDef) return null;
                        return <DraggableSubtaskItem key={childId} childId={childId} parentId={deepworkDef.id} childName={childDef.name} isLogged={false} type="resource" onClick={() => { router.push('/resources') }}/>;
                    })}
                </div>
              ) : (
                  <p className="text-sm text-muted-foreground line-clamp-2">This is a final action. You can add it to a session to log time.</p>
              )}
            </CardContent>
           <CardFooter className="pt-3 flex items-center justify-end">
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {estDuration && <Badge variant="outline">{formatDuration(estDuration)}</Badge>}
                  {loggedMinutes > 0 && <Badge variant="secondary">{formatDuration(loggedMinutes)} logged</Badge>}
              </div>
            </CardFooter>
         </Card>
        </div>
    )
}

function DeepWorkPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    exportData,
    allDeepWorkLogs, setAllDeepWorkLogs,
    allUpskillLogs, setAllUpskillLogs,
    deepWorkDefinitions, setDeepWorkDefinitions,
    upskillDefinitions, setUpskillDefinitions,
    deepWorkTopicMetadata, setDeepWorkTopicMetadata,
    updateTopic, deleteTopic,
    resources, setResources,
    resourceFolders,
    topicGoals,
    setFloatingVideoUrl,
    setSelectedSubtopic,
  } = useAuth();

  const [newTopicName, setNewTopicName] = useState('');
  
  const [editingDefinition, setEditingDefinition] = useState<ExerciseDefinition | null>(null);
  const [editingDefinitionName, setEditingDefinitionName] = useState('');
  const [editingDefinitionHours, setEditingDefinitionHours] = useState('');
  const [editingDefinitionMinutes, setEditingDefinitionMinutes] = useState('');
  
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  const [newTopicNameForEdit, setNewTopicNameForEdit] = useState('');
  const [newTopicClassificationForEdit, setNewTopicClassificationForEdit] = useState<'product' | 'service'>('product');

  // State for adding a focus area with a modal
  const [isNewFocusAreaModalOpen, setIsNewFocusAreaModalOpen] = useState(false);
  const [newFocusAreaParentTopic, setNewFocusAreaParentTopic] = useState<string | null>(null);
  const [newFocusAreaData, setNewFocusAreaData] = useState({ name: '', hours: '', minutes: '' });

  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Edit states for linked items
  const [editingUpskill, setEditingUpskill] = useState<ExerciseDefinition | null>(null);
  const [editedUpskillData, setEditedUpskillData] = useState<Partial<ExerciseDefinition> & { estHours?: string; estMinutes?: string }>({});
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editedResourceData, setEditedResourceData] = useState<Partial<Resource>>({});

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    item: string; // The topic name
  } | null>(null);

  const focusAreaContextMenuRef = useRef<HTMLDivElement>(null);
  const [focusAreaContextMenu, setFocusAreaContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    item: ExerciseDefinition;
  } | null>(null);

  const [visibilityFilters, setVisibilityFilters] = useState<Set<'intention' | 'objective' | 'action' | 'standalone'>>(new Set(['intention', 'objective', 'action', 'standalone']));

  // Mind map modal state
  const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
  const [mindMapRootId, setMindMapRootId] = useState<string | null>(null);

  const [openPopups, setOpenPopups] = useState<Map<string, PopupState>>(new Map());

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
            setContextMenu(null);
        }
        if (focusAreaContextMenuRef.current && !focusAreaContextMenuRef.current.contains(event.target as Node)) {
            setFocusAreaContextMenu(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenuRef, focusAreaContextMenuRef]);

  const handleContextMenu = (e: React.MouseEvent, topic: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFocusAreaContextMenu(null); // Close other menu
    setContextMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      item: topic,
    });
  };

  const handleFocusAreaContextMenu = (e: React.MouseEvent, item: ExerciseDefinition) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(null); // Close other menu
    setFocusAreaContextMenu({
        mouseX: e.clientX,
        mouseY: e.clientY,
        item: item,
    });
  };

  const toggleTopicExpansion = useCallback((topic: string) => {
    setExpandedTopics(prev => {
        const newSet = new Set(prev);
        if (newSet.has(topic)) {
            newSet.delete(topic);
        } else {
            newSet.add(topic);
        }
        return newSet;
    });
  }, []);

  useEffect(() => {
    if (editingTopic) {
      setNewTopicNameForEdit(editingTopic);
      setNewTopicClassificationForEdit(deepWorkTopicMetadata[editingTopic]?.classification || 'product');
    }
  }, [editingTopic, deepWorkTopicMetadata]);

  useEffect(() => {
    if (editingUpskill) {
      const hours = Math.floor((editingUpskill.estimatedDuration || 0) / 60);
      const minutes = (editingUpskill.estimatedDuration || 0) % 60;
      setEditedUpskillData({
        ...editingUpskill,
        estHours: hours > 0 ? String(hours) : '',
        estMinutes: minutes > 0 ? String(minutes) : ''
      });
    }
  }, [editingUpskill]);

  useEffect(() => {
    if (editingResource) setEditedResourceData(editingResource);
  }, [editingResource]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [progressModalConfig, setProgressModalConfig] = useState<{
    isOpen: boolean;
    exercise: ExerciseDefinition | null;
    pageType: 'deepwork' | 'upskill';
  }>({ isOpen: false, exercise: null, pageType: 'deepwork' });
  const [isFocusAreaProgressModalOpen, setIsFocusAreaProgressModalOpen] = useState(false);
  const [isFocusAreaTimesheetModalOpen, setIsFocusAreaTimesheetModalOpen] = useState(false);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);

  // New state for right panel view
  const [viewMode, setViewMode] = useState<'session' | 'library'>('session');
  const [selectedFocusArea, setSelectedFocusArea] = useState<ExerciseDefinition | null>(null);

  // State for the "Manage Links" functionality
  const [isManageLinksModalOpen, setIsManageLinksModalOpen] = useState(false);
  const [manageLinksConfig, setManageLinksConfig] = useState<{type: 'upskill' | 'deepwork' | 'resource', parent: ExerciseDefinition} | null>(null);
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
  const [linkDeepWorkTopic, setLinkDeepWorkTopic] = useState('');
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  const allKnownTopics = useMemo(() => {
    const topicsFromDefs = new Set(deepWorkDefinitions.map(def => def.category));
    const topicsFromMeta = new Set(Object.keys(deepWorkTopicMetadata));
    return Array.from(new Set([...topicsFromDefs, ...topicsFromMeta])).sort();
  }, [deepWorkDefinitions, deepWorkTopicMetadata]);

  const allUpskillTopics = useMemo(() => 
    Array.from(new Set(upskillDefinitions.map(def => def.category))).sort()
  , [upskillDefinitions]);

  // A memoized set of all focus area IDs that are linked as children.
  const linkedDeepWorkChildIds = useMemo(() =>
    new Set<string>(deepWorkDefinitions.flatMap(def => def.linkedDeepWorkIds || []))
  , [deepWorkDefinitions]);
  
  const linkedUpskillChildIds = useMemo(() => 
    new Set<string>((upskillDefinitions || []).flatMap(def => def.linkedUpskillIds || []))
  , [upskillDefinitions]);

  const handleVisibilityFilterChange = (filter: 'intention' | 'objective' | 'action' | 'standalone') => {
    setVisibilityFilters(prev => {
        const newSet = new Set(prev);
        if (newSet.has(filter)) {
            newSet.delete(filter);
        } else {
            newSet.add(filter);
        }
        return newSet;
    });
  };

  const topicsWithFocusAreas = useMemo(() => {
    const effectiveFilters = visibilityFilters.size === 0 ? new Set(['intention']) : visibilityFilters;

    const visibleDefinitions = deepWorkDefinitions.filter(def => {
        const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0;
        const isLinkedAsChild = linkedDeepWorkChildIds.has(def.id);

        const isIntention = isParent && !isLinkedAsChild;
        const isObjective = isParent && isLinkedAsChild;
        const isAction = !isParent && !isLinkedAsChild;
        const isStandalone = !isParent && !isLinkedAsChild;

        if (effectiveFilters.has('intention') && isIntention) return true;
        if (effectiveFilters.has('objective') && isObjective) return true;
        if (effectiveFilters.has('action') && isAction) return true;
        if (effectiveFilters.has('standalone') && isStandalone) return true;
        
        return false;
    });
    
    const grouped: { [key: string]: ExerciseDefinition[] } = {};
    visibleDefinitions.forEach(def => {
        if (!grouped[def.category]) {
            grouped[def.category] = [];
        }
        grouped[def.category].push(def);
    });

    return allKnownTopics.map(topic => [topic, grouped[topic] || []] as [string, ExerciseDefinition[]]);
  }, [allKnownTopics, deepWorkDefinitions, linkedDeepWorkChildIds, visibilityFilters]);


  const formatDuration = (minutes: number) => {
    if (minutes === 0) return "0m";
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h > 0 ? `${h}h` : ''} ${m > 0 ? `${m}m` : ''}`.trim();
  }
  
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
        
        if (!isParent) { // It's a Visualization, the actionable item
            visualizationIds.add(node.id);
        } else { // It's an Objective or Curiosity, so recurse
            (node.linkedUpskillIds || []).forEach(childId => {
                if (!visited.has(childId)) {
                    recurse(childId);
                }
            });
        }
    }
    
    recurse(definition.id);

    let totalMinutes = 0;
    if (allUpskillLogs) {
        allUpskillLogs.forEach(log => {
            log.exercises.forEach(ex => {
                if (visualizationIds.has(ex.definitionId)) {
                    totalMinutes += ex.loggedSets.reduce((sum, set) => sum + set.reps, 0); // reps is duration for upskill
                }
            });
        });
    }
    return totalMinutes;
  }, [allUpskillLogs, upskillDefinitions]);

  const getDeepWorkLoggedMinutes = useCallback((definition: ExerciseDefinition) => {
    if (!definition) return 0;

    const visitedDeepWork = new Set<string>();
    const deepWorkActionIds = new Set<string>();
    const directUpskillLinkIds = new Set<string>(); 

    // 1. Traverse the Deep Work tree to find all leaf nodes (actions)
    //    and all directly linked upskill items (curiosities).
    function findDeepWorkActionsAndUpskillLinks(nodeId: string) {
        if (visitedDeepWork.has(nodeId)) return;
        visitedDeepWork.add(nodeId);

        const node = deepWorkDefinitions.find(d => d.id === nodeId);
        if (!node) return;

        (node.linkedUpskillIds || []).forEach(id => directUpskillLinkIds.add(id));
        
        const isParent = (node.linkedDeepWorkIds?.length ?? 0) > 0;

        if (!isParent) { // It's an Action (leaf node)
            deepWorkActionIds.add(node.id);
        } else { // It's an Intention or Objective, so recurse
            (node.linkedDeepWorkIds || []).forEach(childId => findDeepWorkActionsAndUpskillLinks(childId));
        }
    }

    findDeepWorkActionsAndUpskillLinks(definition.id);

    // 2. Calculate total minutes from the deep work actions.
    let totalMinutes = 0;
    if (allDeepWorkLogs) {
        allDeepWorkLogs.forEach(log => {
            log.exercises.forEach(ex => {
                if (deepWorkActionIds.has(ex.definitionId)) {
                    totalMinutes += ex.loggedSets.reduce((sum, set) => sum + set.weight, 0);
                }
            });
        });
    }

    // 3. For each linked upskill 'Curiosity', traverse its own tree to find all
    //    leaf nodes ('Visualizations') and sum their logged times.
    directUpskillLinkIds.forEach(curiosityId => {
        const curiosityDef = upskillDefinitions.find(d => d.id === curiosityId);
        if(curiosityDef) {
            totalMinutes += getUpskillLoggedMinutesRecursive(curiosityDef);
        }
    });
    
    return totalMinutes;
  }, [allDeepWorkLogs, deepWorkDefinitions, upskillDefinitions, getUpskillLoggedMinutesRecursive]);

  const totalLoggedTime = useMemo(() => {
    if (!selectedFocusArea) return 0;
    return getDeepWorkLoggedMinutes(selectedFocusArea);
  }, [selectedFocusArea, getDeepWorkLoggedMinutes]);

  const calculateTotalEstimate = useCallback((def: ExerciseDefinition) => {
    let total = 0;
    const visited = new Set<string>();
  
    function recurse(d: ExerciseDefinition) {
      if (visited.has(d.id)) return;
      visited.add(d.id);
  
      const hasDeepWorkChildren = (d.linkedDeepWorkIds?.length ?? 0) > 0;
      const hasUpskillChildren = (d.linkedUpskillIds?.length ?? 0) > 0;
  
      if (hasDeepWorkChildren || hasUpskillChildren) {
        (d.linkedDeepWorkIds || []).forEach(childId => {
          const childDef = deepWorkDefinitions.find(c => c.id === childId);
          if (childDef) recurse(childDef);
        });
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
  }, [deepWorkDefinitions, upskillDefinitions]);

  const totalEstimatedDuration = useMemo(() => {
    if (!selectedFocusArea) return 0;
    return calculateTotalEstimate(selectedFocusArea);
  }, [selectedFocusArea, calculateTotalEstimate]);

  const timesheetData = useMemo(() => {
    if (!selectedFocusArea) return [];

    const allDefIds = new Set([
        selectedFocusArea.id,
        ...(selectedFocusArea.linkedDeepWorkIds || []),
        ...(selectedFocusArea.linkedUpskillIds || []),
    ]);

    const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
    const defIdToNameMap = new Map(allDefs.map(def => [def.id, def.name]));

    const entries: { date: string; taskName: string; duration: number }[] = [];

    allDeepWorkLogs.forEach(log => {
        log.exercises.forEach(ex => {
            if (allDefIds.has(ex.definitionId)) {
                ex.loggedSets.forEach(set => {
                    if (set.weight > 0) { // weight is duration for deepwork
                        entries.push({
                            date: log.date,
                            taskName: defIdToNameMap.get(ex.definitionId) || ex.name,
                            duration: set.weight
                        });
                    }
                });
            }
        });
    });

    allUpskillLogs.forEach(log => {
        log.exercises.forEach(ex => {
            if (allDefIds.has(ex.definitionId)) {
                ex.loggedSets.forEach(set => {
                    if (set.reps > 0) { // reps is duration for upskill
                        entries.push({
                            date: log.date,
                            taskName: defIdToNameMap.get(ex.definitionId) || ex.name,
                            duration: set.reps
                        });
                    }
                });
            }
        });
    });

    // Group by date
    const groupedByDate: Record<string, { taskName: string; duration: number }[]> = {};
    entries.forEach(entry => {
        if (!groupedByDate[entry.date]) {
            groupedByDate[entry.date] = [];
        }
        groupedByDate[entry.date].push({ taskName: entry.taskName, duration: entry.duration });
    });

    return Object.entries(groupedByDate)
        .map(([date, tasks]) => ({ date, tasks, totalDuration: tasks.reduce((sum, task) => sum + task.duration, 0) }))
        .sort((a, b) => b.date.localeCompare(a.date)); // Sort by most recent date first
}, [selectedFocusArea, allDeepWorkLogs, allUpskillLogs, deepWorkDefinitions, upskillDefinitions]);

  const permanentlyLoggedActionIds = useMemo(() => {
    const loggedIds = new Set<string>();
    if (!allDeepWorkLogs) return loggedIds;

    allDeepWorkLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (ex.loggedSets.length > 0) {
          loggedIds.add(ex.definitionId);
        }
      });
    });
    return loggedIds;
  }, [allDeepWorkLogs]);

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


  useEffect(() => {
    setIsLoadingPage(false); // Data is loaded from context
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_deepwork_${year}-${week}`;
    const hasBeenPrompted = localStorage.getItem(backupPromptKey);
    if (isMonday(today) && !hasBeenPrompted) setShowBackupPrompt(true);
  }, [currentUser]);

  const markBackupPromptAsHandled = () => {
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_deepwork_${year}-${week}`;
    localStorage.setItem(backupPromptKey, 'true');
    setShowBackupPrompt(false);
  };

  const handleBackupConfirm = () => {
    exportData(); 
    markBackupPromptAsHandled();
  };

  const currentDatedWorkout = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return allDeepWorkLogs.find(log => log.id === dateKey);
  }, [selectedDate, allDeepWorkLogs]);

  const currentWorkoutExercises = useMemo(() => {
    return currentDatedWorkout?.exercises || [];
  }, [currentDatedWorkout]);

  const updateOrAddWorkoutLog = (updatedWorkout: DatedWorkout) => {
    setAllDeepWorkLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.id === updatedWorkout.id);
      if (existingLogIndex > -1) {
        const newLogs = [...prevLogs];
        newLogs[existingLogIndex] = updatedWorkout;
        return newLogs;
      }
      return [...prevLogs, updatedWorkout];
    });
  };

  const handleAddTopic = (e: FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) {
        toast({ title: "Error", description: "Topic name cannot be empty.", variant: "destructive" });
        return;
    }
    const topic = newTopicName.trim();
    if (allKnownTopics.some(t => t.toLowerCase() === topic.toLowerCase())) {
        toast({ title: "Error", description: "This topic already exists.", variant: "destructive" });
        return;
    }
    setDeepWorkTopicMetadata(prev => ({
        ...prev,
        [topic]: { classification: 'product' }
    }));
    setNewTopicName('');
    toast({ title: "Topic Created", description: `"${topic}" has been added to your library.` });
  }
  
  const handleOpenNewFocusAreaModal = (topic: string) => {
    setNewFocusAreaParentTopic(topic);
    setIsNewFocusAreaModalOpen(true);
  };

  const handleCreateFocusArea = () => {
    if (!newFocusAreaParentTopic || !newFocusAreaData.name.trim()) {
      toast({ title: "Error", description: "Focus area name cannot be empty.", variant: "destructive" });
      return;
    }

    if (deepWorkDefinitions.some(def => def.name.toLowerCase() === newFocusAreaData.name.trim().toLowerCase() && def.category.toLowerCase() === newFocusAreaParentTopic.toLowerCase())) {
        toast({ title: "Error", description: "This focus area already exists for this topic.", variant: "destructive" });
        return;
    }

    const hours = parseInt(newFocusAreaData.hours, 10) || 0;
    const minutes = parseInt(newFocusAreaData.minutes, 10) || 0;
    const totalMinutes = hours * 60 + minutes;

    const newDef: ExerciseDefinition = { 
        id: `def_${Date.now()}_${Math.random()}`, 
        name: newFocusAreaData.name.trim(),
        category: newFocusAreaParentTopic as ExerciseCategory,
        isReadyForBranding: false,
        sharingStatus: { twitter: false, linkedin: false, devto: false },
        estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined,
    };

    setDeepWorkDefinitions(prev => [...prev, newDef]);
    
    // Expand the topic to show the new area
    setExpandedTopics(prev => {
        const newSet = new Set(prev);
        newSet.add(newFocusAreaParentTopic);
        return newSet;
    });

    // Select the new focus area
    setSelectedFocusArea(newDef);
    setViewMode('library');

    // Reset and close modal
    setNewFocusAreaData({ name: '', hours: '', minutes: '' });
    setIsNewFocusAreaModalOpen(false);
    setNewFocusAreaParentTopic(null);
    toast({ title: "Success", description: `Focus Area "${newDef.name}" added to ${newFocusAreaParentTopic}.` });
  };


  const handleDeleteExerciseDefinition = (id: string) => {
    const defToDelete = deepWorkDefinitions.find(def => def.id === id);
    if (!defToDelete) return;
    setDeepWorkDefinitions(prev => prev.filter(def => def.id !== id));
    setAllDeepWorkLogs(prevLogs => prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) })));
    if (selectedFocusArea?.id === id) {
        setSelectedFocusArea(null);
        setViewMode('session');
    }
    toast({ title: "Success", description: `Focus Area "${defToDelete.name}" removed.` });
  };

  const handleStartEditDefinition = (def: ExerciseDefinition) => {
    setEditingDefinition(def);
    setEditingDefinitionName(def.name);
    const hours = Math.floor((def.estimatedDuration || 0) / 60);
    const minutes = (def.estimatedDuration || 0) % 60;
    setEditingDefinitionHours(hours > 0 ? String(hours) : '');
    setEditingDefinitionMinutes(minutes > 0 ? String(minutes) : '');
  };

  const handleSaveEditDefinition = () => {
    if (!editingDefinition || editingDefinitionName.trim() === '') {
      toast({ title: "Error", description: "Focus Area name cannot be empty.", variant: "destructive" });
      return;
    }
    const hours = parseInt(editingDefinitionHours, 10) || 0;
    const minutes = parseInt(editingDefinitionMinutes, 10) || 0;
    const totalMinutes = hours * 60 + minutes;

    const updatedDef = { ...editingDefinition, name: editingDefinitionName.trim(), estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined };
    setDeepWorkDefinitions(prev => prev.map(def => def.id === editingDefinition.id ? updatedDef : def));
    setAllDeepWorkLogs(prevLogs => prevLogs.map(log => ({...log, exercises: log.exercises.map(ex => ex.definitionId === editingDefinition.id ? { ...ex, name: updatedDef.name } : ex)})));
    if(selectedFocusArea?.id === editingDefinition.id) {
        setSelectedFocusArea(updatedDef);
    }
    toast({ title: "Success", description: `Focus Area updated to "${updatedDef.name}".` });
    setEditingDefinition(null);
  };

  const handleToggleReadyForBranding = (definitionId: string) => {
    const def = deepWorkDefinitions.find(d => d.id === definitionId);
    if (!def) return;

    setDeepWorkDefinitions(prevDefs => 
      prevDefs.map(d => 
        d.id === definitionId 
          ? { ...d, isReadyForBranding: !d.isReadyForBranding } 
          : d
      )
    );
    
    toast({
      title: "Status Updated",
      description: `"${def.name}" is now ${!def.isReadyForBranding ? 'marked as ready' : 'no longer ready'} for branding.`
    });
  };

  const handleSaveTopicEdit = () => {
    if (!editingTopic || !newTopicNameForEdit.trim()) return;
    updateTopic(editingTopic, newTopicNameForEdit, newTopicClassificationForEdit);
    setEditingTopic(null);
  }

  const handleDeleteTopic = () => {
    if (!topicToDelete) return;
    deleteTopic(topicToDelete);
    if (selectedFocusArea && selectedFocusArea.category === topicToDelete) {
        setSelectedFocusArea(null);
        setViewMode('session');
    }
    setTopicToDelete(null);
  }

  const handleAddTaskToSession = (definition: ExerciseDefinition) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newWorkoutExercise: WorkoutExercise = {
      id: `dwex_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      definitionId: definition.id, name: definition.name, category: definition.category,
      loggedSets: [], targetSets: parseInt(DEFAULT_TARGET_SESSIONS.toString(), 10), targetReps: DEFAULT_TARGET_DURATION,
    };
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      if (existingWorkout.exercises.some(ex => ex.definitionId === definition.id)) {
        toast({ title: "Info", description: `"${definition.name}" is already in this session.` }); return;
      }
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: [...existingWorkout.exercises, newWorkoutExercise] });
    } else {
      updateOrAddWorkoutLog({ id: dateKey, date: dateKey, exercises: [newWorkoutExercise] });
    }
    toast({ title: "Added to Session", description: `"${definition.name}" added for ${format(selectedDate, 'PPP')}.` });
  };

  const handleRemoveExerciseFromWorkout = (exerciseId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) setAllDeepWorkLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      else updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => { // Reps will be 1, weight is duration
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const newSet: LoggedSet = { id: `${Date.now()}-${Math.random()}`, reps, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Session Logged!", description: `Logged ${weight} minutes.`});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => { // Reps=1, weight=duration
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return { ...ex, loggedSets: ex.loggedSets.map(set => 
              set.id === setId ? { ...set, reps, weight, timestamp: Date.now() } : set
            )};
        }
        return ex;
      });
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };
  
  const handleViewProgress = (definition: ExerciseDefinition, pageType: 'deepwork' | 'upskill') => {
    setProgressModalConfig({
      isOpen: true,
      exercise: definition,
      pageType: pageType,
    });
  };

  const handleDeleteUpskillDefinition = (id: string) => {
    const defToDelete = upskillDefinitions.find(def => def.id === id);
    if (!defToDelete) return;
  
    setUpskillDefinitions(prev => prev.filter(def => def.id !== id));
    
    // Also remove it from any deep work definitions that link to it
    setDeepWorkDefinitions(prevDefs => 
      prevDefs.map(def => ({
        ...def,
        linkedUpskillIds: (def.linkedUpskillIds || []).filter(linkedId => linkedId !== id)
      }))
    );
  
    setAllUpskillLogs(prevLogs => 
      prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) }))
    );
    toast({ title: "Success", description: `Task "${defToDelete.name}" permanently deleted.` });
  };
  
  const handleOpenManageLinksModal = (type: 'upskill' | 'deepwork' | 'resource', parent: ExerciseDefinition) => {
    setManageLinksConfig({ type, parent });
    if (type === 'upskill') {
        setTempLinkedIds(parent.linkedUpskillIds || []);
    } else if (type === 'deepwork') {
        setTempLinkedIds(parent.linkedDeepWorkIds || []);
    } else { // resource
        setTempLinkedIds(parent.linkedResourceIds || []);
    }
    // Reset form for "Create New" tab
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
    setLinkDeepWorkTopic('');
    setIsManageLinksModalOpen(true);
  };
  
  const handleCreateAndLinkItem = async () => {
    if (!manageLinksConfig) return;
    const { type, parent } = manageLinksConfig;
    
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
            setResources(prev => [...prev, newResource]);
            const updatedParent = { ...parent, linkedResourceIds: [...(parent.linkedResourceIds || []), newResource.id] };
            setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
            setSelectedFocusArea(updatedParent);
            toast({ title: "Resource Added", description: `"${newResource.name}" has been saved and linked.`});
            setIsManageLinksModalOpen(false);
        } catch (error) {
            toast({ title: "Error adding resource", description: error instanceof Error ? error.message : "Could not fetch metadata.", variant: "destructive" });
        } finally { setIsCreatingLink(false); }
        return;
    }

    if (!newLinkedItemName.trim()) { toast({ title: "Error", description: "Name is required.", variant: "destructive" }); return; }
    const hours = parseInt(newLinkedItemHours, 10) || 0;
    const minutes = parseInt(newLinkedItemMinutes, 10) || 0;
    const totalMinutes = hours * 60 + minutes;

    if (type === 'upskill') {
        if (!newLinkedItemTopic.trim()) { toast({ title: "Error", description: "Topic is required.", variant: "destructive" }); return; }
        const link = newLinkedItemLink.trim();
        const newUpskillDef: ExerciseDefinition = {
            id: `def_${Date.now()}_upskill_${Math.random()}`, name: newLinkedItemName.trim(), category: newLinkedItemTopic.trim() as ExerciseCategory,
            description: newLinkedItemDescription.trim(), link: link, iconUrl: getFaviconUrl(link),
            estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined,
        };
        setUpskillDefinitions(prev => [...prev, newUpskillDef]);
        const updatedParent = { ...parent, linkedUpskillIds: [...(parent.linkedUpskillIds || []), newUpskillDef.id] };
        setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
        setSelectedFocusArea(updatedParent);
        toast({ title: "Success", description: "New upskill task created and linked." });
    } else { // 'deepwork'
        if (!newLinkedItemTopic.trim()) { toast({ title: "Error", description: "Topic is required.", variant: "destructive" }); return; }
        const newDeepWorkDef: ExerciseDefinition = {
            id: `def_${Date.now()}_deepwork_${Math.random()}`, name: newLinkedItemName.trim(), category: newLinkedItemTopic.trim() as ExerciseCategory,
            estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined,
        };
        setDeepWorkDefinitions(prev => [...prev, newDeepWorkDef]);
        const updatedParent = { ...parent, linkedDeepWorkIds: [...(parent.linkedDeepWorkIds || []), newDeepWorkDef.id] };
        setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
        setSelectedFocusArea(updatedParent);
        toast({ title: "Success", description: "New focus area created and linked." });
    }
    setIsManageLinksModalOpen(false);
  };


  const handleSaveExistingLinks = () => {
    if (!manageLinksConfig) return;
    const { type, parent } = manageLinksConfig;

    const key = type === 'upskill' ? 'linkedUpskillIds' :
                type === 'deepwork' ? 'linkedDeepWorkIds' :
                'linkedResourceIds';

    const updatedParent = {
        ...parent,
        [key]: tempLinkedIds
    };

    setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
    setSelectedFocusArea(updatedParent);
    toast({ title: "Success", description: "Links have been updated." });
    setIsManageLinksModalOpen(false);
  }

  const filteredItemsForLinking = useMemo(() => {
    if (!manageLinksConfig) return [];
    const { type, parent } = manageLinksConfig;

    let definitionsSource: any[];
    if (type === 'upskill') {
        definitionsSource = upskillDefinitions;
        if (linkUpskillTopic) {
            definitionsSource = definitionsSource.filter(def => def.category === linkUpskillTopic);
        }
    } else if (type === 'deepwork') {
        definitionsSource = linkDeepWorkTopic ? deepWorkDefinitions.filter(d => d.category === linkDeepWorkTopic) : deepWorkDefinitions;
    } else { // 'resource'
        if (!linkResourceFolderId) return [];
        definitionsSource = resources.filter(res => res.folderId === linkResourceFolderId);
    }
    
    return definitionsSource.filter(def => {
        if (!def.name || def.name === 'placeholder' || def.id === parent.id || (linkSearchTerm && !def.name.toLowerCase().includes(linkSearchTerm.toLowerCase()))) {
          return false;
        }
        
        // This is the new logic to allow standalone tasks to be linked
        const isChild = linkedDeepWorkChildIds.has(def.id);
        const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0;
        const isStandalone = !isParent && !isChild;

        return isStandalone || isParent;
    });
}, [manageLinksConfig, upskillDefinitions, deepWorkDefinitions, resources, linkSearchTerm, linkResourceFolderId, linkUpskillTopic, linkDeepWorkTopic, linkedDeepWorkChildIds]);


  const handleStartEditUpskill = (def: ExerciseDefinition) => {
    setEditingUpskill(def);
  };
  
  const handleSaveUpskillEdit = () => {
    if (!editedUpskillData || !editingUpskill) return;

    const hours = parseInt(editedUpskillData.estHours || '0', 10);
    const minutes = parseInt(editedUpskillData.estMinutes || '0', 10);
    const totalMinutes = hours * 60 + minutes;

    const finalUpskillData: Partial<ExerciseDefinition> = { 
        ...editedUpskillData,
        estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined
    };

    if (finalUpskillData.link !== editingUpskill.link) {
        finalUpskillData.iconUrl = getFaviconUrl(finalUpskillData.link || '');
    }
    setUpskillDefinitions(prev => prev.map(def => def.id === editingUpskill.id ? { ...def, ...finalUpskillData } : def));
    setEditingUpskill(null);
    toast({ title: 'Success', description: 'Upskill task updated.' });
  };
  
  const handleStartEditResource = (res: Resource) => {
    setEditingResource(res);
  };
  
  const handleSaveResourceEdit = () => {
    if (!editedResourceData || !editingResource) return;
    const finalResourceData = { ...editedResourceData };
    if (finalResourceData.link !== editingResource.link) {
        finalResourceData.iconUrl = getFaviconUrl(finalResourceData.link || '');
    }
    setResources(prev => prev.map(res => res.id === editingResource.id ? { ...res, ...finalResourceData } as Resource : res));
    setEditingResource(null);
    toast({ title: 'Success', description: 'Resource updated.' });
  };

  const handleUnlinkItem = (type: 'upskill' | 'deepwork' | 'resource', idToUnlink: string) => {
    if (!selectedFocusArea) return;
    let updatedParent: ExerciseDefinition;
    let key: 'linkedUpskillIds' | 'linkedDeepWorkIds' | 'linkedResourceIds' = 'linkedUpskillIds';
    if (type === 'deepwork') key = 'linkedDeepWorkIds';
    if (type === 'resource') key = 'linkedResourceIds';
    
    updatedParent = {
      ...selectedFocusArea,
      [key]: (selectedFocusArea[key] || []).filter((id: string) => id !== idToUnlink)
    };
    
    setDeepWorkDefinitions(prev => prev.map(def => def.id === selectedFocusArea.id ? updatedParent : def));
    setSelectedFocusArea(updatedParent);
    toast({ title: "Unlinked", description: "The item has been unlinked from this focus area." });
  };
  
  const renderFolderOptions = useCallback((parentId: string | null, level: number): JSX.Element[] => {
    const folders = resourceFolders.filter(f => f.parentId === parentId).sort((a,b) => a.name.localeCompare(b.name));
    let options: JSX.Element[] = [];

    folders.forEach(folder => {
        options.push(
            <SelectItem key={folder.id} value={folder.id}>
                <span style={{ paddingLeft: `${level * 1.5}rem` }}>{folder.name}</span>
            </SelectItem>
        );
        options = options.concat(renderFolderOptions(folder.id, level + 1));
    });

    return options;
  }, [resourceFolders]);
  
  const productivityStats = useMemo(() => {
    const calculateAverageDuration = (logs: DatedWorkout[], durationField: 'reps' | 'weight') => {
        if (!logs) return 0;
        const dailyDurations: Record<string, number> = {};
        logs.forEach(log => {
            const duration = log.exercises.reduce((total, ex) => total + ex.loggedSets.reduce((sum, set) => sum + (set[durationField] || 0), 0), 0);
            if (duration > 0) { dailyDurations[log.date] = (dailyDurations[log.date] || 0) + duration; }
        });
        const daysWithActivity = Object.keys(dailyDurations).length;
        if (daysWithActivity === 0) return 0;
        const totalDuration = Object.values(dailyDurations).reduce((sum, d) => sum + d, 0);
        return totalDuration / daysWithActivity;
    };

    const totalProductiveMinutes = calculateAverageDuration(allUpskillLogs, 'reps') + calculateAverageDuration(allDeepWorkLogs, 'weight');
    const avgProductiveHours = totalProductiveMinutes / 60;
    
    return { avgProductiveHours };
  }, [allUpskillLogs, allDeepWorkLogs]);

  const openMindMapFor = (focusAreaId: string) => {
    setMindMapRootId(focusAreaId);
    setIsMindMapModalOpen(true);
  };
  
  const isUpskillObjectiveComplete = useCallback((objectiveId: string): boolean => {
    const visited = new Set<string>();
    const visualizations: ExerciseDefinition[] = [];

    function recurse(nodeId: string) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const node = upskillDefinitions.find(d => d.id === nodeId);
        if (!node) return;

        const isParent = (node.linkedUpskillIds?.length ?? 0) > 0 || (node.linkedResourceIds?.length ?? 0) > 0;
        
        if (!isParent) { // It's a Visualization
            visualizations.push(node);
        } else { // It's an Objective or Curiosity, so recurse
            (node.linkedUpskillIds || []).forEach(childId => {
                if (!visited.has(childId)) {
                    recurse(childId);
                }
            });
        }
    }
    
    recurse(objectiveId);
    
    if (visualizations.length === 0) return false;

    return visualizations.every(viz => permanentlyLoggedVisualizationIds.has(viz.id));
  }, [upskillDefinitions, permanentlyLoggedVisualizationIds]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;

    if (active.id.toString().startsWith('popup-')) {
        const resourceId = active.id.toString().replace('popup-', '');
        setOpenPopups(prev => {
            const newPopups = new Map(prev);
            const popup = newPopups.get(resourceId);
            if (popup) {
                newPopups.set(resourceId, { ...popup, x: popup.x + delta.x, y: popup.y + delta.y });
            }
            return newPopups;
        });
        return;
    }
  
    if (!over) return;
  
    // Case 1: Promoting a sub-task to a main linked task
    if (typeof active.id === 'string' && active.id.startsWith('subtask-') && typeof over.id === 'string' && over.id.startsWith('linked-work-area')) {
        const [_, childId, __, parentId] = active.id.split('-');
        
        // Determine if child is deep work or upskill
        const childIsDeepWork = deepWorkDefinitions.some(d => d.id === childId);
        const childIsUpskill = upskillDefinitions.some(d => d.id === childId);
        const childIsResource = resources.some(d => d.id === childId);
  
        // Remove from old parent (which can be deep work or upskill def)
        setDeepWorkDefinitions(prev => prev.map(def => {
            if (def.id === parentId) {
                return {
                    ...def,
                    linkedDeepWorkIds: (def.linkedDeepWorkIds || []).filter(id => id !== childId),
                    linkedUpskillIds: (def.linkedUpskillIds || []).filter(id => id !== childId),
                    linkedResourceIds: (def.linkedResourceIds || []).filter(id => id !== childId)
                };
            }
            return def;
        }));
        setUpskillDefinitions(prev => prev.map(def => {
            if (def.id === parentId) {
                return {
                    ...def,
                    linkedUpskillIds: (def.linkedUpskillIds || []).filter(id => id !== childId),
                    linkedResourceIds: (def.linkedResourceIds || []).filter(id => id !== childId)
                };
            }
            return def;
        }));
  
        // Add the child to the main selectedFocusArea
        if (selectedFocusArea) {
            let updatedFocusArea: ExerciseDefinition;
            if (childIsDeepWork) {
                updatedFocusArea = { ...selectedFocusArea, linkedDeepWorkIds: [...(selectedFocusArea.linkedDeepWorkIds || []), childId] }
            } else if (childIsUpskill) {
                updatedFocusArea = { ...selectedFocusArea, linkedUpskillIds: [...(selectedFocusArea.linkedUpskillIds || []), childId] }
            } else if (childIsResource) {
                 updatedFocusArea = { ...selectedFocusArea, linkedResourceIds: [...(selectedFocusArea.linkedResourceIds || []), childId] }
            } else {
                return; // should not happen
            }
  
            setDeepWorkDefinitions(prev => prev.map(def => def.id === selectedFocusArea.id ? updatedFocusArea : def));
            setSelectedFocusArea(updatedFocusArea);
            toast({ title: "Task Promoted", description: "The sub-task is now a direct child of the focus area." });
        }
        return;
    }
  
    // Case 2: Linking one main task to another (existing logic)
    if (active.id === over.id) return;
  
    const draggedId = active.id as string;
    const targetId = over.id as string;
  
    const allDefs = [...deepWorkDefinitions, ...upskillDefinitions, ...resources];
    const draggedDef = allDefs.find(d => d.id === draggedId);
    const targetDef = allDefs.find(d => d.id === targetId);
  
    if (!draggedDef || !targetDef || !selectedFocusArea) {
      toast({ title: "Error", description: "Could not find items to link.", variant: "destructive" });
      return;
    }
    
    const parentChildrenIds = new Set([
      ...(selectedFocusArea.linkedDeepWorkIds || []),
      ...(selectedFocusArea.linkedUpskillIds || []),
      ...(selectedFocusArea.linkedResourceIds || []),
    ]);
  
    if (!parentChildrenIds.has(draggedId) || !parentChildrenIds.has(targetId)) {
        toast({ title: "Link Error", description: "Can only link sibling items within the same focus area.", variant: "destructive" });
        return;
    }
  
    const isDraggedUpskill = upskillDefinitions.some(d => d.id === draggedId);
    const isDraggedResource = resources.some(d => d.id === draggedId);
    const isTargetUpskill = upskillDefinitions.some(d => d.id === targetId);
  
    if (isTargetUpskill) {
        toast({ title: "Invalid Link", description: "You can only link items to a Deep Work Focus Area, not a Learning Task.", variant: "destructive" });
        return;
    }
    
    setDeepWorkDefinitions(prev => prev.map(def => {
        if (def.id === targetId) {
            if (isDraggedUpskill) {
                 return { ...def, linkedUpskillIds: [...(def.linkedUpskillIds || []), draggedId] };
            } else if(isDraggedResource) {
                 return { ...def, linkedResourceIds: [...(def.linkedResourceIds || []), draggedId] };
            }
            else {
                 return { ...def, linkedDeepWorkIds: [...(def.linkedDeepWorkIds || []), draggedId] };
            }
        }
        return def;
    }));
    
    const updatedParent = {
      ...selectedFocusArea,
      linkedDeepWorkIds: (selectedFocusArea.linkedDeepWorkIds || []).filter(id => id !== draggedId),
      linkedUpskillIds: (selectedFocusArea.linkedUpskillIds || []).filter(id => id !== draggedId),
      linkedResourceIds: (selectedFocusArea.linkedResourceIds || []).filter(id => id !== draggedId),
    };
    
    setDeepWorkDefinitions(prev => prev.map(def => def.id === selectedFocusArea.id ? updatedParent : def));
    
    setSelectedFocusArea(updatedParent);
  
    toast({ title: "Re-linked!", description: `"${draggedDef.name}" is now a sub-task of "${targetDef.name}".` });
  };

  const DroppableArea: React.FC<{ id: string; children: React.ReactNode; className?: string; }> = ({ id, children, className }) => {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={cn("rounded-lg transition-colors", isOver && "bg-primary/10", className)}>
            {children}
        </div>
    );
  };
  
  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your deep work data...</p>
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8" onClick={() => { if (contextMenu) setContextMenu(null); if (focusAreaContextMenu) setFocusAreaContextMenu(null); }}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            
            <aside className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-lg text-primary">
                        <Folder /> Topic Library
                      </CardTitle>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <FilterIcon className="h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuCheckboxItem
                                  checked={visibilityFilters.has('intention')}
                                  onCheckedChange={() => handleVisibilityFilterChange('intention')}
                              >
                                  <Lightbulb className="mr-2 h-4 w-4 text-amber-500" />
                                  <span>Intentions</span>
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                  checked={visibilityFilters.has('objective')}
                                  onCheckedChange={() => handleVisibilityFilterChange('objective')}
                              >
                                  <Flag className="mr-2 h-4 w-4 text-green-500" />
                                  <span>Objectives</span>
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                  checked={visibilityFilters.has('action')}
                                  onCheckedChange={() => handleVisibilityFilterChange('action')}
                              >
                                  <Bolt className="mr-2 h-4 w-4 text-blue-500" />
                                  <span>Actions</span>
                              </DropdownMenuCheckboxItem>
                              <DropdownMenuCheckboxItem
                                  checked={visibilityFilters.has('standalone')}
                                  onCheckedChange={() => handleVisibilityFilterChange('standalone')}
                              >
                                  <Focus className="mr-2 h-4 w-4 text-purple-500" />
                                  <span>Standalone</span>
                              </DropdownMenuCheckboxItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  <CardDescription>Organize your focus areas by topic.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddTopic} className="flex gap-2 mb-4">
                    <Input value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="New Topic" />
                    <Button size="icon" type="submit"><PlusCircle className="h-4 w-4" /></Button>
                  </form>
                  <div className="space-y-2">
                    {topicsWithFocusAreas.map(([topic, focusAreas]) => {
                      const isCollapsed = !expandedTopics.has(topic);
                      // Hide topics that become empty after filtering, unless they are in the metadata
                      if (focusAreas.length === 0 && !deepWorkTopicMetadata[topic]) {
                        return null;
                      }
                      return (
                      <div key={topic}>
                        <div 
                          className="group flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer" 
                          onClick={() => toggleTopicExpansion(topic)}
                          onContextMenu={(e) => handleContextMenu(e, topic)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-grow">
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isCollapsed && "-rotate-90")} />
                            <Folder className="h-4 w-4 flex-shrink-0 text-primary/80" />
                            <h4 className="font-semibold text-sm truncate">{topic}</h4>
                          </div>
                        </div>
                        {!isCollapsed && (
                          <ul className="space-y-1 pl-4 border-l-2 border-muted ml-4">
                              {focusAreas.sort((a,b) => a.name.localeCompare(b.name)).map(def => {
                                const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0;
                                const isLinkedAsChild = linkedDeepWorkChildIds.has(def.id);
                                
                                const isIntention = isParent && !isLinkedAsChild;
                                const isObjective = isParent && isLinkedAsChild;
                                const isStandalone = !isParent && !isLinkedAsChild;
                                const isAction = !isParent && isLinkedAsChild;

                                const calculatedEst = calculateTotalEstimate(def);
                                const estDuration = isParent ? calculatedEst : def.estimatedDuration;

                                return (
                                  <li key={def.id} className="group flex items-center justify-between p-1.5 rounded-md hover:bg-muted" onContextMenu={(e) => handleFocusAreaContextMenu(e, def)}>
                                      <>
                                        <div className="flex items-center gap-2 flex-grow min-w-0">
                                          {isIntention ? (
                                            <Lightbulb className="h-4 w-4 flex-shrink-0 text-amber-500" />
                                          ) : isObjective ? (
                                            <Flag className="h-4 w-4 flex-shrink-0 text-green-500" />
                                          ) : isStandalone ? (
                                            <Focus className="h-4 w-4 flex-shrink-0 text-purple-500" />
                                          ) : (
                                            <Bolt className="h-4 w-4 flex-shrink-0 text-blue-500" />
                                          )}
                                          <span className="truncate cursor-pointer" onClick={() => { setSelectedFocusArea(def); setViewMode('library'); }} title={`View details for ${def.name}`}>{def.name}</span>
                                          {def.isReadyForBranding && <Share2 className="h-3 w-3 text-primary flex-shrink-0" title="Ready for Branding" />}
                                          {estDuration && estDuration > 0 && <Badge variant="secondary" className="text-xs ml-auto">{formatDuration(estDuration)}</Badge>}
                                        </div>
                                        <div className='hidden items-center flex-shrink-0 group-hover:flex'>
                                          <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openMindMapFor(def.id)}>
                                                        <GitMerge className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>View Mind Map</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span tabIndex={isParent ? 0 : -1}>
                                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => !isParent && handleAddTaskToSession(def)} disabled={isParent}>
                                                    <PlusCircle className="h-4 w-4" />
                                                  </Button>
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>{isParent ? 'Add sub-tasks instead' : 'Add to Session'}</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </div>
                                      </>
                                  </li>
                                )})}
                          </ul>
                        )}
                      </div>
                    )})}
                  </div>
                </CardContent>
              </Card>
              {selectedFocusArea && (
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                  <TrendingUp className="h-5 w-5 text-primary" />
                                  Focus Area Stats
                              </CardTitle>
                              <CardDescription className="text-xs">
                                  Aggregated progress for "{selectedFocusArea.name}"
                              </CardDescription>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFocusAreaProgressModalOpen(true)}>
                              <LineChartIcon className="h-4 w-4"/>
                          </Button>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                          <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Total Logged Time</span>
                                  <span className="font-medium">{formatDuration(totalLoggedTime)}</span>
                              </div>
                              {totalEstimatedDuration > 0 && (
                                  <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Total Estimated Time</span>
                                      <span className="font-medium">{formatDuration(totalEstimatedDuration)}</span>
                                  </div>
                              )}
                          </div>
                          
                          {totalEstimatedDuration > 0 && (
                              <div>
                                  <Progress 
                                      value={Math.min(100, (totalLoggedTime / totalEstimatedDuration) * 100)} 
                                      className="h-2" 
                                  />
                                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                      <span>0%</span>
                                      <span>{((totalLoggedTime / totalEstimatedDuration) * 100).toFixed(0)}%</span>
                                  </div>
                              </div>
                          )}
                          
                          {totalEstimatedDuration > 0 && totalLoggedTime > totalEstimatedDuration && (
                              <Badge variant="destructive" className="w-full justify-center">
                                  Overspent by {formatDuration(totalLoggedTime - totalEstimatedDuration)}
                              </Badge>
                          )}
                      </CardContent>
                  </Card>
              )}
            </aside>

            <section aria-labelledby="main-panel-heading" className="lg:col-span-3 space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between p-4">
                        <div className="flex-grow">
                            <CardTitle id="main-panel-heading" className="flex items-center gap-2 text-lg">
                                {viewMode === 'session' ? <ListChecks /> : <Library />}
                                {viewMode === 'session' ? `Session for: ${format(selectedDate, 'PPP')}` : `Library: ${selectedFocusArea?.name || 'Select an item'}`}
                            </CardTitle>
                            {viewMode === 'library' && selectedFocusArea && (
                              <CardDescription className="text-xs mt-1">{selectedFocusArea.category}</CardDescription>
                            )}
                        </div>

                        <div className='flex items-center gap-2 flex-shrink-0'>
                          <Button variant={viewMode === 'session' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('session')}>Session</Button>
                          <Button variant={viewMode === 'library' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('library')} disabled={!selectedFocusArea}>Library</Button>
                          {viewMode === 'library' && selectedFocusArea && (
                              <TooltipProvider>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsFocusAreaTimesheetModalOpen(true)}>
                                              <Clock className="h-4 w-4"/>
                                              <span className="sr-only">View Timesheet</span>
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                          <p>View Timesheet</p>
                                      </TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                          )}
                          <Popover>
                              <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-[150px] justify-start text-left font-normal h-9",!selectedDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{selectedDate ? format(selectedDate, "MMM dd") : <span>Pick a date</span>}</Button></PopoverTrigger>
                              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus /></PopoverContent>
                          </Popover>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        {viewMode === 'session' ? (
                            <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
                                {currentWorkoutExercises.length === 0 ? (
                                  <div className="text-center py-10"><Briefcase className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">No focus areas for {format(selectedDate, 'PPP')}.</p><p className="text-sm text-muted-foreground/80">Add focus areas from the library to get started!</p></div>
                                ) : (
                                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {currentWorkoutExercises.map((exercise) => {
                                        const definition = deepWorkDefinitions.find(def => def.id === exercise.definitionId);
                                        return (
                                          <WorkoutExerciseCard 
                                            key={exercise.id} 
                                            exercise={exercise}
                                            definition={definition}
                                            selectedDate={selectedDate}
                                            allDeepWorkLogs={allDeepWorkLogs}
                                            allUpskillLogs={allUpskillLogs}
                                            onLogSet={handleLogSet} 
                                            onDeleteSet={handleDeleteSet} 
                                            onUpdateSet={handleUpdateSet} 
                                            onRemoveExercise={handleRemoveExerciseFromWorkout}
                                            onViewProgress={definition ? () => handleViewProgress(definition, 'deepwork') : undefined}
                                            pageType="deepwork"
                                          />
                                        );
                                    })}
                                  </div>
                                )}
                            </div>
                        ) : selectedFocusArea ? (
                            <DndContext onDragEnd={handleDragEnd}>
                              <ScrollArea className="h-[calc(100vh-16rem)] pr-2">
                                <div className="space-y-6">
                                  <div className="space-y-3">
                                    <h3 className="font-semibold flex items-center gap-2"><BookCopy className="h-5 w-5 text-primary" /> Linked Learning</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                      {Array.from(new Set(selectedFocusArea.linkedUpskillIds || [])).map((id, index) => {
                                        const upskillDef = upskillDefinitions.find(ud => ud.id === id);
                                        if (!upskillDef) return null;
                                        return (
                                          <LinkedUpskillCard
                                              key={`${id}-${index}`}
                                              id={id}
                                              upskillDef={upskillDef}
                                              getUpskillLoggedMinutesRecursive={getUpskillLoggedMinutesRecursive}
                                              isUpskillObjectiveComplete={isUpskillObjectiveComplete}
                                              setEmbedUrl={setEmbedUrl}
                                              setFloatingVideoUrl={setFloatingVideoUrl}
                                              handleViewProgress={handleViewProgress}
                                              handleStartEditUpskill={handleStartEditUpskill}
                                              handleUnlinkItem={handleUnlinkItem}
                                              handleDeleteUpskillDefinition={handleDeleteUpskillDefinition}
                                              upskillDefinitions={upskillDefinitions}
                                              formatDuration={formatDuration}
                                              calculatedEstimate={calculateTotalEstimate(upskillDef)}
                                              setSelectedSubtopic={setSelectedSubtopic}
                                              setViewMode={setViewMode}
                                          />
                                        )
                                      })}
                                      <Card 
                                          onClick={() => handleOpenManageLinksModal('upskill', selectedFocusArea)}
                                          className="rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[230px] hover:shadow-xl hover:-translate-y-1"
                                      >
                                          <PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                                          <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add / Link Task</p>
                                      </Card>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <h3 className="font-semibold flex items-center gap-2"><LinkIcon className="h-5 w-5 text-primary" /> Linked Work</h3>
                                    <DroppableArea id={`linked-work-area-${selectedFocusArea.id}`} className="-m-2 p-2">
                                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                      {Array.from(new Set(selectedFocusArea.linkedDeepWorkIds || [])).map((id, index) => {
                                        const deepworkDef = deepWorkDefinitions.find(dd => dd.id === id);
                                        if (!deepworkDef) return null;
                                        return (
                                          <LinkedDeepWorkCard 
                                              key={`${id}-${index}`}
                                              id={id}
                                              deepworkDef={deepworkDef}
                                              getDeepWorkLoggedMinutes={getDeepWorkLoggedMinutes}
                                              permanentlyLoggedActionIds={permanentlyLoggedActionIds}
                                              handleAddTaskToSession={handleAddTaskToSession}
                                              setSelectedFocusArea={setSelectedFocusArea}
                                              setViewMode={setViewMode}
                                              handleToggleReadyForBranding={handleToggleReadyForBranding}
                                              handleStartEditDefinition={handleStartEditDefinition}
                                              handleUnlinkItem={handleUnlinkItem}
                                              handleDeleteExerciseDefinition={handleDeleteExerciseDefinition}
                                              handleViewProgress={handleViewProgress}
                                              deepWorkDefinitions={deepWorkDefinitions}
                                              formatDuration={formatDuration}
                                              calculatedEstimate={calculateTotalEstimate(deepworkDef)}
                                              upskillDefinitions={upskillDefinitions}
                                              resources={resources}
                                              setSelectedSubtopic={setSelectedSubtopic}
                                          />
                                        );
                                      })}
                                      <Card 
                                          onClick={() => handleOpenManageLinksModal('deepwork', selectedFocusArea)}
                                          className="rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[230px] hover:shadow-xl hover:-translate-y-1"
                                      >
                                          <PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                                          <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add / Link Focus Area</p>
                                      </Card>
                                    </div>
                                    </DroppableArea>
                                  </div>
                                  <div className="space-y-3">
                                    <h3 className="font-semibold flex items-center gap-2"><Library className="h-5 w-5 text-primary" /> Linked Resources</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                      {(selectedFocusArea.linkedResourceIds || []).map((id, index) => {
                                        const resource = resources.find(r => r.id === id);
                                        if (!resource) return null;
                                        return <LinkedResourceItem key={`${id}-${index}`} resource={resource} handleUnlinkItem={handleUnlinkItem} setEmbedUrl={setEmbedUrl} onOpenNestedPopup={handleOpenNestedPopup} handleStartEditResource={handleStartEditResource} />;
                                      })}
                                      <Card 
                                          onClick={() => handleOpenManageLinksModal('resource', selectedFocusArea)}
                                          className="rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[230px] hover:shadow-xl hover:-translate-y-1"
                                      >
                                          <PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                                          <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add / Link Resource</p>
                                      </Card>
                                    </div>
                                  </div>
                                </div>
                              </ScrollArea>
                            </DndContext>
                        ) : (
                            <div className="text-center py-10"><p className="text-muted-foreground">Select a Focus Area from the library to view its details.</p></div>
                        )}
                    </CardContent>
                </Card>
            </section>
          </div>
          
          {progressModalConfig.isOpen && progressModalConfig.exercise && (
            <ExerciseProgressModal 
              isOpen={progressModalConfig.isOpen} 
              onOpenChange={(isOpen) => setProgressModalConfig(prev => ({...prev, isOpen}))}
              exercise={progressModalConfig.exercise} 
              allWorkoutLogs={progressModalConfig.pageType === 'upskill' ? allUpskillLogs : allDeepWorkLogs}
              pageType={progressModalConfig.pageType}
              topicGoals={progressModalConfig.pageType === 'upskill' ? topicGoals : undefined}
            />
          )}
          
          {selectedFocusArea && (
              <FocusAreaProgressModal 
                  isOpen={isFocusAreaProgressModalOpen}
                  onOpenChange={setIsFocusAreaProgressModalOpen}
                  focusArea={selectedFocusArea}
                  deepWorkDefinitions={deepWorkDefinitions}
                  upskillDefinitions={upskillDefinitions}
                  allDeepWorkLogs={allDeepWorkLogs}
                  allUpskillLogs={allUpskillLogs}
                  avgDailyProductiveHours={productivityStats.avgProductiveHours}
              />
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

export default function DeepWorkPage() {
  return ( <AuthGuard> <DeepWorkPageContent /> </AuthGuard> );
}



    