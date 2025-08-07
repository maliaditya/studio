

"use client";

import React, { useState, useEffect, FormEvent, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, CalendarIcon, TrendingUp, Loader2, Briefcase, BookCopy, MoreVertical, Link as LinkIcon, Folder, Library, Globe, ExternalLink, Youtube, Share2, ArrowRight, Expand, Filter as FilterIcon, LineChart as LineChartIcon, Unlink, GitMerge, Clock, Lightbulb, Flag, Bolt, Flashlight, Focus, GripVertical, PictureInPicture, Code, MessageSquare, BrainCircuit, Blocks, Sprout } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, getISOWeek, isMonday, getYear, addDays, parseISO, differenceInDays } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, Resource, ResourceFolder, SkillArea, SkillDomain, CoreSkill, MicroSkill, Project, Feature } from '@/types/workout';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SkillLibrary } from '@/components/SkillLibrary';


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
             {childName.length > 25 ? `${childName.substring(0, 25)}...` : childName}
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
    handleUnlinkItem,
    handleDeleteUpskillDefinition,
    upskillDefinitions,
    formatDuration,
    calculatedEstimate,
    setSelectedSubtopic,
    setViewMode,
    onUpdateName,
} : {
    id: string;
    upskillDef: ExerciseDefinition;
    isUpskillObjectiveComplete: (id: string) => boolean;
    getUpskillLoggedMinutesRecursive: (def: ExerciseDefinition) => number;
    setEmbedUrl: (url: string | null) => void;
    setFloatingVideoUrl: (url: string | null) => void;
    handleViewProgress: (def: ExerciseDefinition, type: 'deepwork' | 'upskill') => void;
    handleUnlinkItem: (type: 'upskill' | 'deepwork' | 'resource', id: string) => void;
    handleDeleteUpskillDefinition: (id: string) => void;
    upskillDefinitions: ExerciseDefinition[];
    formatDuration: (minutes: number) => string;
    calculatedEstimate: number;
    setSelectedSubtopic: (def: ExerciseDefinition | null) => void;
    setViewMode: (mode: 'session' | 'library') => void;
    onUpdateName: (id: string, newName: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
    const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id });
    
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: transform ? 100 : 'auto', } : undefined;

    const [isEditingName, setIsEditingName] = useState(false);
    const [currentName, setCurrentName] = useState(upskillDef.name);

    const setCombinedRefs = (node: HTMLElement | null) => {
        setNodeRef(node);
        setDroppableNodeRef(node);
    };

    const handleNameSave = () => {
      if (currentName.trim()) {
        onUpdateName(upskillDef.id, currentName.trim());
      } else {
        setCurrentName(upskillDef.name); // Revert if empty
      }
      setIsEditingName(false);
    };

    const youtubeEmbedUrl = upskillDef.link ? getYouTubeEmbedUrl(upskillDef.link) : null;
    const isNotionObsidianEmbed = upskillDef.link ? (isNotionUrl(upskillDef.link) || isObsidianUrl(upskillDef.link)) : false;
    const embedLinkForModal = youtubeEmbedUrl || (isNotionObsidianEmbed ? upskillDef.link : null);

    const loggedMinutes = getUpskillLoggedMinutesRecursive(upskillDef);
    const isComplete = isUpskillObjectiveComplete(upskillDef.id);
    const isParent = (upskillDef.linkedUpskillIds?.length ?? 0) > 0 || (upskillDef.linkedResourceIds?.length ?? 0) > 0;
    const estDuration = isParent ? calculatedEstimate : upskillDef.estimatedDuration;

    return (
        <div ref={setCombinedRefs} style={style} className={cn(isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-2xl")}>
            <Card className={cn("relative rounded-2xl flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl min-h-[230px]", isComplete && "opacity-70 bg-muted/30")}>
                {youtubeEmbedUrl ? (
                    <>
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4" /></Button>
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
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <p className={cn("text-base font-bold truncate", isComplete && "line-through text-muted-foreground")} title={upskillDef.name}>
                                                    {upskillDef.name.length > 25 ? `${upskillDef.name.substring(0, 25)}...` : upskillDef.name}
                                                </p>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{upskillDef.name}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
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
                            <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4" /></Button>
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
                                    <DropdownMenuItem onSelect={() => handleUnlinkItem('upskill', id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handleDeleteUpskillDefinition(id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <CardHeader className="pb-3">
                            {isEditingName ? (
                                <Input 
                                    value={currentName} 
                                    onChange={(e) => setCurrentName(e.target.value)} 
                                    onBlur={handleNameSave} 
                                    onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                                    className="text-base font-semibold h-8"
                                    autoFocus
                                />
                            ) : (
                                <CardTitle className="text-base flex items-center gap-2 cursor-pointer" onClick={() => setIsEditingName(true)}>
                                    <Flashlight className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className={cn("truncate", isComplete && "line-through text-muted-foreground")} title={upskillDef.name}>
                                                    {upskillDef.name.length > 25 ? `${upskillDef.name.substring(0, 25)}...` : upskillDef.name}
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{upskillDef.name}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </CardTitle>
                            )}
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

function LinkedResourceItem({ resource, handleUnlinkItem, setEmbedUrl, handleOpenNestedPopup, handleStartEditResource }: {
  resource: Resource;
  handleUnlinkItem: (type: 'upskill' | 'deepwork' | 'resource', id: string) => void;
  setEmbedUrl: (url: string | null) => void;
  handleOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
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
        <Card className={cn("relative flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl", hasMarkdownContent ? 'md:col-span-2 xl:col-span-3' : '')} onClick={(e) => handleOpenNestedPopup(resource.id, e)}>
           <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4" /></Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={() => handleStartEditResource(resource)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleUnlinkItem('resource', resource.id)} className="text-destructive"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                  <Library className="h-5 w-5 text-primary" />
                  <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="truncate" title={resource.name}>
                                {resource.name.length > 25 ? `${resource.name.substring(0, 25)}...` : resource.name}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{resource.name}</p>
                        </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
                              onClick={(e) => {
                                  e.stopPropagation(); // Prevent card's onClick from firing
                                  handleOpenNestedPopup(point.resourceId!, e);
                              }}
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
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4" /></Button>
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
    handleUnlinkItem,
    handleDeleteExerciseDefinition,
    handleViewProgress,
    deepWorkDefinitions,
    formatDuration,
    calculatedEstimate,
    upskillDefinitions,
    resources,
    setSelectedSubtopic,
    linkedDeepWorkChildIds,
    onOpenMindMap,
    getIcon,
    getNodeType,
    onUpdateName
} : {
    id: string;
    deepworkDef: ExerciseDefinition;
    getDeepWorkLoggedMinutes: (def: ExerciseDefinition) => number;
    permanentlyLoggedActionIds: Set<string>;
    handleAddTaskToSession: (def: ExerciseDefinition) => void;
    setSelectedFocusArea: (def: ExerciseDefinition | null) => void;
    setViewMode: (mode: 'session' | 'library') => void;
    handleToggleReadyForBranding: (id: string) => void;
    handleUnlinkItem: (type: 'upskill' | 'deepwork' | 'resource', id: string) => void;
    handleDeleteExerciseDefinition: (id: string) => void;
    handleViewProgress: (def: ExerciseDefinition, type: 'deepwork' | 'upskill') => void;
    deepWorkDefinitions: ExerciseDefinition[];
    formatDuration: (minutes: number) => string;
    calculatedEstimate: number;
    upskillDefinitions: ExerciseDefinition[];
    resources: Resource[];
    setSelectedSubtopic: (def: ExerciseDefinition | null) => void;
    linkedDeepWorkChildIds: Set<string>;
    onOpenMindMap: (rootFocusAreaId: string) => void;
    getIcon: (nodeType: string) => React.ReactNode;
    getNodeType: (def: ExerciseDefinition, childIds: Set<string>) => string;
    onUpdateName: (id: string, newName: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
    const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id });
    
    const [isEditingName, setIsEditingName] = useState(false);
    const [currentName, setCurrentName] = useState(deepworkDef.name);
    
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: transform ? 100 : 'auto', } : undefined;

    const setCombinedRefs = (node: HTMLElement | null) => {
        setNodeRef(node);
        setDroppableNodeRef(node);
    };

    const handleNameSave = () => {
      if (currentName.trim()) {
        onUpdateName(deepworkDef.id, currentName.trim());
      } else {
        setCurrentName(deepworkDef.name); // Revert if empty
      }
      setIsEditingName(false);
    };
    
    const isParent = (deepworkDef.linkedDeepWorkIds?.length ?? 0) > 0 || (deepworkDef.linkedUpskillIds?.length ?? 0) > 0 || (deepworkDef.linkedResourceIds?.length ?? 0) > 0;
    const nodeType = getNodeType(deepworkDef, linkedDeepWorkChildIds);

    const loggedMinutes = getDeepWorkLoggedMinutes(deepworkDef);
    const estDuration = isParent ? calculatedEstimate : deepworkDef.estimatedDuration;
    const hasLinkedLearning = (deepworkDef.linkedUpskillIds?.length ?? 0) > 0 || (deepworkDef.linkedResourceIds?.length ?? 0) > 0;
    const router = useRouter();

    const isComplete = useMemo(() => {
        if (!isParent) return permanentlyLoggedActionIds.has(deepworkDef.id);
        
        const childActionIds = (deepworkDef.linkedDeepWorkIds || []).filter(childId => {
            const childDef = deepWorkDefinitions.find(d => d.id === childId);
            return childDef && (childDef.linkedDeepWorkIds?.length ?? 0) === 0;
        });

        if (childActionIds.length === 0) return false;
        
        return childActionIds.every(id => permanentlyLoggedActionIds.has(id));
    }, [deepworkDef, isParent, permanentlyLoggedActionIds, deepWorkDefinitions]);

    return (
        <div ref={setCombinedRefs} style={style} className={cn(isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-2xl")}>
         <Card className={cn("relative rounded-2xl flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl min-h-[230px]", isComplete && "opacity-70 bg-muted/30")}>
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={() => onOpenMindMap(deepworkDef.id)} onMouseDown={(e) => e.stopPropagation()}>
                    <GitMerge className="h-4 w-4" />
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={nodeType === 'Action' || nodeType === 'Standalone' ? 0 : -1}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={() => handleAddTaskToSession(deepworkDef)} disabled={nodeType !== 'Action' && nodeType !== 'Standalone'} onMouseDown={(e) => e.stopPropagation()}>
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{nodeType === 'Action' || nodeType !== 'Standalone' ? 'Add to Session' : 'Add sub-tasks instead'}</TooltipContent>
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
                        <DropdownMenuItem onSelect={() => handleUnlinkItem('deepwork', id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDeleteExerciseDefinition(deepworkDef.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
           <CardHeader className="pb-3">
              {isEditingName ? (
                <Input 
                    value={currentName} 
                    onChange={(e) => setCurrentName(e.target.value)} 
                    onBlur={handleNameSave} 
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                    className="text-base font-semibold h-8"
                    autoFocus
                />
              ) : (
                <CardTitle className="text-base flex items-center gap-2 cursor-pointer" onClick={() => setIsEditingName(true)}>
                  {getIcon(nodeType)}
                  <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className={cn("truncate", isComplete && "line-through text-muted-foreground")} title={deepworkDef.name}>
                                {deepworkDef.name.length > 25 ? `${deepworkDef.name.substring(0, 25)}...` : deepworkDef.name}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{deepworkDef.name}</p>
                        </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Badge variant="outline" className="text-xs">{nodeType}</Badge>
                </CardTitle>
              )}
              <CardDescription>{deepworkDef.category}</CardDescription>
           </CardHeader>
           <CardContent className="flex-grow">
              {deepworkDef.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">{deepworkDef.description}</p>
              ) : isParent ? (
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
                      <p className="text-sm text-muted-foreground line-clamp-2">This objective has no sub-tasks yet. Link items to it.</p>
                  )
              ) : (
                  <p className="text-sm text-muted-foreground line-clamp-2">This is a final action. You can add it to a session to log time.</p>
              )}
            </CardContent>
           <CardFooter className="pt-3 flex items-center justify-end">
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {estDuration && estDuration > 0 && <Badge variant="outline">{formatDuration(estDuration)}</Badge>}
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
    allDeepWorkLogs, setAllDeepWorkLogs,
    allUpskillLogs, setAllUpskillLogs,
    deepWorkDefinitions, setDeepWorkDefinitions,
    upskillDefinitions, setUpskillDefinitions,
    resources, setResources,
    resourceFolders,
    topicGoals,
    setFloatingVideoUrl,
    selectedSubtopic, 
    setSelectedSubtopic,
    skillDomains,
    coreSkills,
    projects,
    microSkillMap,
    handleOpenNestedPopup,
  } = useAuth();
  
  const [isNewFocusAreaModalOpen, setIsNewFocusAreaModalOpen] = useState(false);
  const [newFocusAreaData, setNewFocusAreaData] = useState({ name: '', hours: '', minutes: '' });
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [progressModalConfig, setProgressModalConfig] = useState<{
    isOpen: boolean;
    exercise: ExerciseDefinition | null;
    pageType: 'deepwork' | 'upskill';
  }>({ isOpen: false, exercise: null, pageType: 'deepwork' });
  const [isFocusAreaProgressModalOpen, setIsFocusAreaProgressModalOpen] = useState(false);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  
  const [viewMode, setViewMode] = useState<'session' | 'library'>('library');

  const selectedFocusArea = selectedSubtopic;
  const setSelectedFocusArea = setSelectedSubtopic;
  
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

  const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
  const [mindMapRootFocusAreaId, setMindMapRootFocusAreaId] = useState<string | null>(null);

  const [selectedMicroSkill, setSelectedMicroSkill] = useState<MicroSkill | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const linkedDeepWorkChildIds = useMemo(() => {
    return new Set<string>(
        (deepWorkDefinitions || []).flatMap(def => def.linkedDeepWorkIds || [])
    );
  }, [deepWorkDefinitions]);

  const getNodeType = useCallback((def: ExerciseDefinition, childIds: Set<string>) => {
    const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
    const isChild = childIds.has(def.id);
    if (isParent) {
        return isChild ? 'Objective' : 'Intention';
    }
    return isChild ? 'Action' : 'Standalone';
  }, []);

  const getIcon = useCallback((nodeType: string) => {
    switch (nodeType) {
        case 'Intention': return <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0" />;
        case 'Objective': return <Flag className="h-5 w-5 text-green-500 flex-shrink-0" />;
        case 'Action': return <Bolt className="h-5 w-5 text-blue-500 flex-shrink-0" />;
        case 'Standalone': return <Focus className="h-5 w-5 text-purple-500 flex-shrink-0" />;
        default: return <Briefcase className="h-5 w-5 flex-shrink-0" />;
    }
  }, []);

  const allKnownTopics = useMemo(() => {
    const topicsFromDefs = new Set(deepWorkDefinitions.map(def => def.category));
    return Array.from(new Set([...topicsFromDefs])).sort();
  }, [deepWorkDefinitions]);

  const allUpskillTopics = useMemo(() => 
    Array.from(new Set(upskillDefinitions.map(def => def.category))).sort()
  , [upskillDefinitions]);

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

    function findDeepWorkActionsAndUpskillLinks(nodeId: string) {
        if (visitedDeepWork.has(nodeId)) return;
        visitedDeepWork.add(nodeId);

        const node = deepWorkDefinitions.find(d => d.id === nodeId);
        if (!node) return;

        (node.linkedUpskillIds || []).forEach(id => directUpskillLinkIds.add(id));
        
        const isParent = (node.linkedDeepWorkIds?.length ?? 0) > 0;

        if (!isParent) {
            deepWorkActionIds.add(node.id);
        } else {
            (node.linkedDeepWorkIds || []).forEach(childId => findDeepWorkActionsAndUpskillLinks(childId));
        }
    }

    findDeepWorkActionsAndUpskillLinks(definition.id);

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
  
  useEffect(() => {
    setIsLoadingPage(false);
  }, []);

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

  const handleCreateFocusArea = () => {
    if (!selectedMicroSkill || !newFocusAreaData.name.trim()) {
      toast({ title: "Error", description: "Focus area name cannot be empty.", variant: "destructive" });
      return;
    }

    if (deepWorkDefinitions.some(def => def.name.toLowerCase() === newFocusAreaData.name.trim().toLowerCase() && def.category.toLowerCase() === selectedMicroSkill.name.toLowerCase())) {
        toast({ title: "Error", description: "This focus area already exists for this topic.", variant: "destructive" });
        return;
    }

    const hours = parseInt(newFocusAreaData.hours, 10) || 0;
    const minutes = parseInt(newFocusAreaData.minutes, 10) || 0;
    const totalMinutes = hours * 60 + minutes;

    const newDef: ExerciseDefinition = { 
        id: `def_${Date.now()}_${Math.random()}`, 
        name: newFocusAreaData.name.trim(),
        category: selectedMicroSkill.name as ExerciseCategory,
        isReadyForBranding: false,
        sharingStatus: { twitter: false, linkedin: false, devto: false },
        estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined,
    };

    setDeepWorkDefinitions(prev => [...prev, newDef]);

    setNewFocusAreaData({ name: '', hours: '', minutes: '' });
    setIsNewFocusAreaModalOpen(false);
    toast({ title: "Success", description: `Focus Area "${newDef.name}" added to ${selectedMicroSkill.name}.` });
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

  const handleUpdateDefinitionName = (id: string, newName: string) => {
    setDeepWorkDefinitions(prev => prev.map(def => 
        def.id === id ? { ...def, name: newName } : def
    ));
    setAllDeepWorkLogs(prevLogs => prevLogs.map(log => ({
        ...log,
        exercises: log.exercises.map(ex => 
            ex.definitionId === id ? { ...ex, name: newName } : ex
        )
    })));
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
            setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
            if (selectedFocusArea?.id === parent.id) {
                setSelectedFocusArea(updatedParent);
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
        newId = newUpskillDef.id;
        setUpskillDefinitions(prev => [...prev, newUpskillDef]);
        updatedParent = { ...parent, linkedUpskillIds: [...(parent.linkedUpskillIds || []), newId] };
        setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
        if (selectedFocusArea?.id === parent.id) {
            setSelectedFocusArea(updatedParent);
        }
        toast({ title: "Success", description: "New upskill task created and linked." });
    } else { // 'deepwork'
        if (!newLinkedItemTopic.trim()) { toast({ title: "Error", description: "Topic is required.", variant: "destructive" }); return; }
        const newDeepWorkDef: ExerciseDefinition = {
            id: `def_${Date.now()}_deepwork_${Math.random()}`, name: newLinkedItemName.trim(), category: newLinkedItemTopic.trim() as ExerciseCategory,
            estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined,
        };
        newId = newDeepWorkDef.id;
        setDeepWorkDefinitions(prev => [...prev, newDeepWorkDef]);
        updatedParent = { ...parent, linkedDeepWorkIds: [...(parent.linkedDeepWorkIds || []), newId] };
        setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
        if (selectedFocusArea?.id === parent.id) {
            setSelectedFocusArea(updatedParent);
        }
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
    let parentLinkedIds: string[] = [];

    if (type === 'upskill') {
        definitionsSource = upskillDefinitions;
        if (linkUpskillTopic) {
            definitionsSource = definitionsSource.filter(def => def.category === linkUpskillTopic);
        }
        parentLinkedIds = parent.linkedUpskillIds || [];
    } else if (type === 'deepwork') {
        definitionsSource = linkDeepWorkTopic ? deepWorkDefinitions.filter(d => d.category === linkDeepWorkTopic) : deepWorkDefinitions;
        parentLinkedIds = parent.linkedDeepWorkIds || [];
    } else { // 'resource'
        if (!linkResourceFolderId) return [];
        definitionsSource = resources.filter(res => res.folderId === linkResourceFolderId);
        parentLinkedIds = parent.linkedResourceIds || [];
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
}, [manageLinksConfig, upskillDefinitions, deepWorkDefinitions, resources, linkSearchTerm, linkResourceFolderId, linkUpskillTopic, linkDeepWorkTopic]);


  const handleStartEditResource = (res: Resource) => {
    router.push('/resources');
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

    return visualizations.every(viz => permanentlyLoggedActionIds.has(viz.id));
  }, [upskillDefinitions, permanentlyLoggedActionIds]);
  

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
  
    if (!over) return;
  
    if (typeof active.id === 'string' && active.id.startsWith('subtask-') && typeof over.id === 'string' && over.id.startsWith('linked-work-area')) {
        const [_, childId, __, parentId] = active.id.split('-');
        
        const childIsDeepWork = deepWorkDefinitions.some(d => d.id === childId);
        const childIsUpskill = upskillDefinitions.some(d => d.id === childId);
        const childIsResource = resources.some(d => d.id === childId);
  
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
  
        if (selectedFocusArea) {
            let updatedFocusArea: ExerciseDefinition;
            if (childIsDeepWork) {
                updatedFocusArea = { ...selectedFocusArea, linkedDeepWorkIds: [...(selectedFocusArea.linkedDeepWorkIds || []), childId] }
            } else if (childIsUpskill) {
                updatedFocusArea = { ...selectedFocusArea, linkedUpskillIds: [...(selectedFocusArea.linkedUpskillIds || []), childId] }
            } else if (childIsResource) {
                 updatedFocusArea = { ...selectedFocusArea, linkedResourceIds: [...(selectedFocusArea.linkedResourceIds || []), childId] }
            } else {
                return;
            }
  
            setDeepWorkDefinitions(prev => prev.map(def => def.id === selectedFocusArea.id ? updatedFocusArea : def));
            setSelectedFocusArea(updatedFocusArea);
            toast({ title: "Task Promoted", description: "The sub-task is now a direct child of the focus area." });
        }
        return;
    }
  
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

  const handleProjectSelect = (project: Project | null) => {
    setSelectedProject(project);
    setSelectedMicroSkill(null);
    setSelectedFocusArea(null);
  };
  
  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your deep work data...</p>
      </div>
    );
  }

  const getLibraryTitle = () => {
    if (selectedProject) return selectedProject.name;
    if (selectedMicroSkill) return selectedMicroSkill.name;
    return 'Library';
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            
            <aside className="lg:col-span-1 space-y-6">
                <SkillLibrary
                    pageType="deepwork"
                    selectedMicroSkill={selectedMicroSkill}
                    onSelectMicroSkill={setSelectedMicroSkill}
                    definitions={deepWorkDefinitions}
                    onSelectFocusArea={setSelectedFocusArea}
                    onOpenNewFocusArea={() => {
                        if (!selectedMicroSkill) {
                           toast({ title: "Error", description: "Please select a micro-skill first.", variant: "destructive" });
                           return;
                        }
                        setIsNewFocusAreaModalOpen(true);
                    }}
                    selectedProject={selectedProject} 
                    onSelectProject={handleProjectSelect}
                    onDeleteFocusArea={handleDeleteExerciseDefinition}
                    onUpdateFocusAreaName={handleUpdateDefinitionName}
                    onOpenMindMap={(id) => {
                      setMindMapRootFocusAreaId(id);
                      setIsMindMapModalOpen(true);
                    }}
                 />
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
                                {viewMode === 'session' ? <ListChecks /> : selectedFocusArea ? getIcon(getNodeType(selectedFocusArea, linkedDeepWorkChildIds)) : <Library />}
                                {viewMode === 'session' ? `Session for: ${format(selectedDate, 'PPP')}` : getLibraryTitle()}
                            </CardTitle>
                        </div>

                        <div className='flex items-center gap-2 flex-shrink-0'>
                          <Button variant={viewMode === 'session' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('session')}>Session</Button>
                          <Button variant={viewMode === 'library' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('library')}>Library</Button>
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
                            <DroppableArea id={`linked-work-area-${selectedFocusArea.id}`} className="space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold">{selectedFocusArea.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleOpenManageLinksModal('deepwork', selectedFocusArea)}>
                                            <LinkIcon className="mr-2 h-4 w-4" /> Link Focus Area
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleOpenManageLinksModal('upskill', selectedFocusArea)}>
                                            <BookCopy className="mr-2 h-4 w-4" /> Link Learning
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleOpenManageLinksModal('resource', selectedFocusArea)}>
                                            <Folder className="mr-2 h-4 w-4" /> Link Resource
                                        </Button>
                                    </div>
                                </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {(selectedFocusArea.linkedDeepWorkIds || []).map(id => {
                                        const def = deepWorkDefinitions.find(d => d.id === id);
                                        return def ? <LinkedDeepWorkCard key={id} id={id} deepworkDef={def} {...{ getIcon, getNodeType, getDeepWorkLoggedMinutes, permanentlyLoggedActionIds, handleAddTaskToSession, setSelectedFocusArea, setViewMode, handleToggleReadyForBranding, handleUnlinkItem, handleDeleteExerciseDefinition, handleViewProgress, deepWorkDefinitions, formatDuration, calculatedEstimate: calculateTotalEstimate(def), upskillDefinitions, resources, setSelectedSubtopic, linkedDeepWorkChildIds, onOpenMindMap:(id) => { setMindMapRootFocusAreaId(id); setIsMindMapModalOpen(true); }, onUpdateName: handleUpdateDefinitionName }}/> : null;
                                    })}
                                    {(selectedFocusArea.linkedUpskillIds || []).map(id => {
                                        const def = upskillDefinitions.find(d => d.id === id);
                                        return def ? <LinkedUpskillCard key={id} id={id} upskillDef={def} {...{isUpskillObjectiveComplete, getUpskillLoggedMinutesRecursive, setEmbedUrl, setFloatingVideoUrl, handleViewProgress, handleUnlinkItem: (type, id) => handleUnlinkItem(type, id), handleDeleteUpskillDefinition: (id) => handleDeleteUpskillDefinition(id), upskillDefinitions, formatDuration: formatDuration, calculatedEstimate: calculateTotalEstimate(def), setSelectedSubtopic, setViewMode, onUpdateName: () => {} }} /> : null;
                                    })}
                                    {(selectedFocusArea.linkedResourceIds || []).map(id => {
                                        const resource = resources.find(r => r.id === id);
                                        return resource ? <LinkedResourceItem key={id} resource={resource} handleUnlinkItem={(type, id) => handleUnlinkItem(type, id)} setEmbedUrl={setEmbedUrl} handleOpenNestedPopup={handleOpenNestedPopup} handleStartEditResource={handleStartEditResource} /> : null;
                                    })}
                                </div>
                            </DroppableArea>
                          ) : selectedProject ? (
                            <div className="space-y-4">
                                {selectedProject.features.map(feature => (
                                    <Card key={feature.id}>
                                        <CardHeader className="pb-3"><CardTitle className="text-base">{feature.name}</CardTitle></CardHeader>
                                        <CardContent>
                                            <p className="text-sm font-medium mb-1">Required Skills:</p>
                                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                                                {feature.linkedSkills.map(link => {
                                                    const skill = microSkillMap.get(link.microSkillId);
                                                    return <li key={link.microSkillId}>{skill?.microSkillName || 'Unknown Skill'}</li>;
                                                })}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                          <div className="text-center py-10 text-muted-foreground">Select a micro-skill or project from the library to view its focus areas.</div>
                        )}
                    </CardContent>
                </Card>
            </section>
          </div>
          <Dialog open={isNewFocusAreaModalOpen} onOpenChange={setIsNewFocusAreaModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Focus Area</DialogTitle>
                    <DialogDescription>
                        This will create a new standalone focus area under the "{selectedMicroSkill?.name}" micro-skill.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-1">
                        <Label htmlFor="new-focus-name">Focus Area Name</Label>
                        <Input id="new-focus-name" value={newFocusAreaData.name} onChange={(e) => setNewFocusAreaData(d => ({ ...d, name: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label htmlFor="new-focus-hours">Est. Hours</Label><Input type="number" id="new-focus-hours" value={newFocusAreaData.hours} onChange={(e) => setNewFocusAreaData(d => ({ ...d, hours: e.target.value }))} /></div>
                        <div className="space-y-1"><Label htmlFor="new-focus-mins">Est. Minutes</Label><Input type="number" id="new-focus-mins" value={newFocusAreaData.minutes} onChange={(e) => setNewFocusAreaData(d => ({ ...d, minutes: e.target.value }))} /></div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewFocusAreaModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateFocusArea}>Create Focus Area</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
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
                                  {manageLinksConfig.type === 'upskill' && <Select value={linkUpskillTopic} onValueChange={setLinkUpskillTopic}><SelectTrigger placeholder="Select Topic..."/><SelectContent>{allUpskillTopics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>}
                                  {manageLinksConfig.type === 'deepwork' && <Select value={linkDeepWorkTopic} onValueChange={setLinkDeepWorkTopic}><SelectTrigger placeholder="Select Topic..."/><SelectContent>{allKnownTopics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>}
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

       <Dialog open={isMindMapModalOpen} onOpenChange={setIsMindMapModalOpen}>
            <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
                <DialogHeader className="sr-only"><DialogTitle>Focus Area Mind Map</DialogTitle></DialogHeader>
                <MindMapViewer showControls={false} rootFocusAreaId={mindMapRootFocusAreaId} />
            </DialogContent>
        </Dialog>
    </div>
    </DndContext>
  );
}

export default function DeepWorkPage() {
  return ( <AuthGuard> <DeepWorkPageContent /> </AuthGuard> );
}
