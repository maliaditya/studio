

"use client";

import React, { useState, useEffect, FormEvent, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, CalendarIcon, TrendingUp, Loader2, Briefcase, BookCopy, MoreVertical, Link as LinkIcon, Folder, Library, Globe, ExternalLink, Youtube, Share2, ArrowRight, Expand, Filter as FilterIcon, LineChart as LineChartIcon, Unlink, GitMerge, Clock, Lightbulb, Flag, Bolt, Flashlight, Focus, GripVertical, PictureInPicture, Code, MessageSquare, BrainCircuit, Blocks, Sprout, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, getISOWeek, isMonday, getYear, addDays, parseISO, differenceInDays } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, Resource, ResourceFolder, SkillArea, SkillDomain, CoreSkill, MicroSkill, Project, Feature, DailySchedule } from '@/types/workout';
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
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

const SLOT_NAMES: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

function AddToSessionPopover({ definition, onSelectSlot }: { definition: ExerciseDefinition; onSelectSlot: (slotName: string) => void; }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm">
          <PlusCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1">
        <div className="flex flex-col">
          <p className="p-2 text-xs font-semibold text-muted-foreground">Add to slot...</p>
          {SLOT_NAMES.map(slotName => (
            <Button
              key={slotName}
              variant="ghost"
              className="w-full justify-start h-8"
              onClick={() => {
                onSelectSlot(slotName as string);
                setIsOpen(false);
              }}
            >
              {slotName}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LinkedDeepWorkCard({
    id,
    deepworkDef,
    getIcon,
    getNodeType,
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
    onUpdateName,
    projectsInDomain,
    onLinkProject
}: {
    id: string;
    deepworkDef: ExerciseDefinition;
    getIcon: (nodeType: string) => React.ReactNode;
    getNodeType: (def: ExerciseDefinition, childIds: Set<string>) => string;
    getDeepWorkLoggedMinutes: (def: ExerciseDefinition) => number;
    permanentlyLoggedActionIds: Set<string>;
    handleAddTaskToSession: (definition: ExerciseDefinition, slot: string) => void;
    setSelectedFocusArea: (def: ExerciseDefinition | null) => void;
    setViewMode: (mode: 'session' | 'library') => void;
    handleToggleReadyForBranding: (id: string) => void;
    handleUnlinkItem: (type: 'deepwork' | 'upskill' | 'resource', id: string) => void;
    handleDeleteExerciseDefinition: (id: string) => void;
    handleViewProgress: (def: ExerciseDefinition, type: 'deepwork' | 'upskill') => void;
    deepWorkDefinitions: ExerciseDefinition[];
    formatDuration: (minutes: number) => string;
    calculatedEstimate: number;
    upskillDefinitions: ExerciseDefinition[];
    resources: Resource[];
    setSelectedSubtopic: (def: ExerciseDefinition | null) => void;
    linkedDeepWorkChildIds: Set<string>;
    onOpenMindMap: (id: string) => void;
    onUpdateName: (id: string, newName: string) => void;
    projectsInDomain: Project[];
    onLinkProject: (intentionId: string, projectId: string | null) => void;
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
    const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id });
    const [isEditingName, setIsEditingName] = useState(false);
    const [currentName, setCurrentName] = useState(deepworkDef.name);
    const router = useRouter();

    const setCombinedRefs = (node: HTMLElement | null) => {
        setNodeRef(node);
        setDroppableNodeRef(node);
    };

    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: transform ? 100 : 'auto', } : undefined;
    const nodeType = getNodeType(deepworkDef, linkedDeepWorkChildIds);
    const isParent = (deepworkDef.linkedDeepWorkIds?.length ?? 0) > 0 || (deepworkDef.linkedUpskillIds?.length ?? 0) > 0 || (deepworkDef.linkedResourceIds?.length ?? 0) > 0;
    const isAction = !isParent;
    const isComplete = isAction && permanentlyLoggedActionIds.has(deepworkDef.id);
    const loggedMinutes = getDeepWorkLoggedMinutes(deepworkDef);
    const estDuration = isParent ? calculatedEstimate : deepworkDef.estimatedDuration;

    const handleNameSave = () => {
        if (currentName.trim()) {
            onUpdateName(deepworkDef.id, currentName.trim());
        } else {
            setCurrentName(deepworkDef.name);
        }
        setIsEditingName(false);
    };

    const linkedProject = deepworkDef.linkedProjectId ? projectsInDomain.find(p => p.id === deepworkDef.linkedProjectId) : null;

    return (
        <div ref={setCombinedRefs} style={style} className={cn(isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg")}>
            <Card className={cn("relative flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl min-h-[230px]", isComplete && "opacity-70 bg-muted/30")}>
                 <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4" /></Button>
                    {isAction ? (
                        <AddToSessionPopover definition={deepworkDef} onSelectSlot={(slot) => handleAddTaskToSession(deepworkDef, slot)} />
                    ) : (
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={() => { setSelectedFocusArea(deepworkDef); setViewMode('library'); }}><ArrowRight className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Drill Down</TooltipContent></Tooltip></TooltipProvider>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onSelect={() => onOpenMindMap(deepworkDef.id)}><GitMerge className="mr-2 h-4 w-4"/>View Mind Map</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleViewProgress(deepworkDef, 'deepwork')}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem>
                            {isAction && <DropdownMenuItem onSelect={() => handleToggleReadyForBranding(deepworkDef.id)}><Checkbox className="mr-2" checked={!!deepworkDef.isReadyForBranding} /><span>Mark as Ready for Branding</span></DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleUnlinkItem('deepwork', id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDeleteExerciseDefinition(id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <CardHeader className="pb-3 flex-grow">
                    <div className="flex items-center gap-2">
                        {getIcon(nodeType)}
                        {isEditingName ? (
                            <Input value={currentName} onChange={(e) => setCurrentName(e.target.value)} onBlur={handleNameSave} onKeyDown={(e) => e.key === 'Enter' && handleNameSave()} autoFocus className="text-base font-semibold h-8" />
                        ) : (
                            <CardTitle className="text-base cursor-pointer" onClick={() => setIsEditingName(true)}>
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                <span className={cn("truncate", isComplete && "line-through text-muted-foreground")} title={deepworkDef.name}>
                                    {deepworkDef.name.length > 25 ? `${deepworkDef.name.substring(0, 25)}...` : deepworkDef.name}
                                </span>
                                </TooltipTrigger><TooltipContent><p>{deepworkDef.name}</p></TooltipContent></Tooltip></TooltipProvider>
                            </CardTitle>
                        )}
                        <Badge variant="outline" className="text-xs flex-shrink-0">{nodeType}</Badge>
                    </div>
                    {linkedProject ? (
                        <CardDescription>
                            Project: <span className="font-semibold text-foreground">{linkedProject.name}</span>
                        </CardDescription>
                    ) : (
                        <CardDescription>{deepworkDef.category}</CardDescription>
                    )}
                </CardHeader>
                <CardContent className="flex-grow">
                    {isParent ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                            {(deepworkDef.linkedDeepWorkIds || []).map(childId => {
                                const childDef = deepWorkDefinitions.find(d => d.id === childId);
                                if (!childDef) return null;
                                return <DraggableSubtaskItem key={childId} childId={childId} parentId={deepworkDef.id} childName={childDef.name} isLogged={permanentlyLoggedActionIds.has(childId)} type="deepwork" onClick={() => { setSelectedSubtopic(childDef); setViewMode('library'); }}/>;
                            })}
                            {(deepworkDef.linkedUpskillIds || []).map(childId => {
                                const childDef = upskillDefinitions.find(d => d.id === childId);
                                if (!childDef) return null;
                                return <DraggableSubtaskItem key={childId} childId={childId} parentId={deepworkDef.id} childName={childDef.name} isLogged={false} type="upskill" onClick={() => router.push('/upskill')}/>;
                            })}
                            {(deepworkDef.linkedResourceIds || []).map(childId => {
                                const childDef = resources.find(d => d.id === childId);
                                if (!childDef) return null;
                                return <DraggableSubtaskItem key={childId} childId={childId} parentId={deepworkDef.id} childName={childDef.name} isLogged={false} type="resource" onClick={() => router.push('/resources')}/>;
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">This is an action. Add it to a session to log time.</p>
                    )}
                </CardContent>
                <CardFooter className="pt-3 flex items-center justify-end">
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {estDuration && estDuration > 0 && <Badge variant="outline" className="flex-shrink-0">{formatDuration(estDuration)} est.</Badge>}
                        {loggedMinutes > 0 && <Badge variant="secondary">{formatDuration(loggedMinutes)} logged</Badge>}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

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
    onEdit
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
    onEdit: (def: ExerciseDefinition) => void;
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
                                    <DropdownMenuItem onSelect={() => onEdit(upskillDef)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
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
                                    <DropdownMenuItem onSelect={() => onEdit(upskillDef)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
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

function DeepWorkPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    allDeepWorkLogs, setAllDeepWorkLogs,
    deepWorkDefinitions, setDeepWorkDefinitions,
    upskillDefinitions, setUpskillDefinitions,
    resources, setResources, resourceFolders,
    setFloatingVideoUrl,
    selectedDeepWorkTask, 
    setSelectedDeepWorkTask,
    skillDomains,
    coreSkills,
    projects,
    microSkillMap,
    handleOpenNestedPopup,
    scheduleTaskFromMindMap,
  } = useAuth();
  const router = useRouter();
  
  const [editingFocusArea, setEditingFocusArea] = useState<ExerciseDefinition | null>(null);
  const [editedFocusAreaData, setEditedFocusAreaData] = useState<Partial<ExerciseDefinition> & { estHours?: string; estMinutes?: string }>({});
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [progressModalConfig, setProgressModalConfig] = useState<{ isOpen: boolean; exercise: ExerciseDefinition | null; type: 'deepwork' | 'upskill' }>({ isOpen: false, exercise: null, type: 'deepwork' });
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  const [viewMode, setViewMode] = useState<'session' | 'library'>('library');
  
  const [isManageLinksModalOpen, setIsManageLinksModalOpen] = useState(false);
  const [manageLinksConfig, setManageLinksConfig] = useState<{type: 'deepwork' | 'upskill' | 'resource', parent: ExerciseDefinition} | null>(null);
  const [newLinkedItemName, setNewLinkedItemName] = useState('');
  const [newLinkedItemTopic, setNewLinkedItemTopic] = useState('');
  const [newLinkedItemDescription, setNewLinkedItemDescription] = useState('');
  const [newLinkedItemLink, setNewLinkedItemLink] = useState('');
  const [newLinkedItemHours, setNewLinkedItemHours] = useState('');
  const [newLinkedItemMinutes, setNewLinkedItemMinutes] = useState('');
  const [newLinkedItemFolderId, setNewLinkedItemFolderId] = useState('');
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [tempLinkedIds, setTempLinkedIds] = useState<string[]>([]);
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  // State for hierarchical linking
  const [skillSelectionStep, setSkillSelectionStep] = useState<'topic' | 'curiosity' | 'visualization'>('topic');
  const [selectedUpskillTopic, setSelectedUpskillTopic] = useState('');
  const [selectedUpskillCuriosity, setSelectedUpskillCuriosity] = useState<ExerciseDefinition | null>(null);
  const [folderPath, setFolderPath] = useState<string[]>([]);
  const currentFolderIdForLinking = folderPath[folderPath.length - 1] || null;

  const [isNewFocusAreaModalOpen, setIsNewFocusAreaModalOpen] = useState(false);
  const [newFocusAreaData, setNewFocusAreaData] = useState({ name: '', description: '', link: '', hours: '', minutes: '' });

  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
  const [mindMapRootFocusAreaId, setMindMapRootFocusAreaId] = useState<string | null>(null);
  
  const [selectedMicroSkill, setSelectedMicroSkill] = useState<MicroSkill | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleOpenNewFocusAreaModal = () => {
    if (!selectedMicroSkill) {
        toast({ title: "Error", description: "Please select a micro-skill first.", variant: "destructive" });
        return;
    }
    setIsNewFocusAreaModalOpen(true);
  };
  
  const getDomainForCategory = useCallback((category: string) => {
    const microSkill = Array.from(microSkillMap.values()).find(ms => ms.microSkillName === category);
    if (!microSkill) return null;
    const coreSkill = coreSkills.find(cs => cs.name === microSkill.coreSkillName);
    if (!coreSkill) return null;
    return skillDomains.find(sd => sd.id === coreSkill.domainId);
  }, [microSkillMap, coreSkills, skillDomains]);

  const projectsInDomain = useMemo(() => {
    if (!selectedDeepWorkTask || !selectedDeepWorkTask.category) return [];
    const domain = getDomainForCategory(selectedDeepWorkTask.category);
    if (!domain) return [];
    return projects.filter(p => p.domainId === domain.id);
  }, [selectedDeepWorkTask, getDomainForCategory, projects]);
  
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
  
  const allKnownTopics = useMemo(() => {
    const topicsFromDefs = new Set(deepWorkDefinitions.map(def => def.category));
    return Array.from(topicsFromDefs).sort();
  }, [deepWorkDefinitions]);

  const linkedDeepWorkChildIds = useMemo(() => 
    new Set<string>((deepWorkDefinitions || []).flatMap(def => def.linkedDeepWorkIds || []))
  , [deepWorkDefinitions]);

  const getDeepWorkLoggedMinutes = useCallback((definition: ExerciseDefinition): number => {
    let totalMinutes = 0;
    const visited = new Set<string>();
    
    function recurse(def: ExerciseDefinition) {
      if (visited.has(def.id)) return;
      visited.add(def.id);
  
      const hasChildren = (def.linkedDeepWorkIds?.length ?? 0) > 0;
  
      if (hasChildren) {
        (def.linkedDeepWorkIds || []).forEach(childId => {
          const childDef = deepWorkDefinitions.find(c => c.id === childId);
          if (childDef) recurse(childDef);
        });
      } else { // It's an "Action"
        allDeepWorkLogs.forEach(log => {
          log.exercises.forEach(ex => {
            if (ex.definitionId === def.id) {
              totalMinutes += ex.loggedSets.reduce((sum, set) => sum + set.weight, 0); // Assuming weight is minutes for deep work
            }
          });
        });
      }
    }
  
    recurse(definition);
    return totalMinutes;
  }, [deepWorkDefinitions, allDeepWorkLogs]);

  const totalLoggedTime = useMemo(() => {
    if (!selectedDeepWorkTask) return 0;
    return getDeepWorkLoggedMinutes(selectedDeepWorkTask);
  }, [selectedDeepWorkTask, getDeepWorkLoggedMinutes]);


  const calculateTotalEstimate = useCallback((def: ExerciseDefinition) => {
    let total = 0;
    const visited = new Set<string>();
  
    function recurse(d: ExerciseDefinition) {
      if (visited.has(d.id)) return;
      visited.add(d.id);
  
      const hasChildren = (d.linkedDeepWorkIds?.length ?? 0) > 0;
  
      if (hasChildren) {
        (d.linkedDeepWorkIds || []).forEach(childId => {
          const childDef = deepWorkDefinitions.find(c => c.id === childId);
          if (childDef) recurse(childDef);
        });
      } else {
        total += d.estimatedDuration || 0;
      }
    }
  
    recurse(def);
    return total;
  }, [deepWorkDefinitions]);


  const totalEstimatedDuration = useMemo(() => {
    if (!selectedDeepWorkTask) return 0;
    return calculateTotalEstimate(selectedDeepWorkTask);
  }, [selectedDeepWorkTask, calculateTotalEstimate]);

  useEffect(() => {
    if (editingFocusArea) {
        const hours = Math.floor((editingFocusArea.estimatedDuration || 0) / 60);
        const minutes = (editingFocusArea.estimatedDuration || 0) % 60;
        setEditedFocusAreaData({
          ...editingFocusArea,
          estHours: hours > 0 ? String(hours) : '',
          estMinutes: minutes > 0 ? String(minutes) : ''
        });
    }
  }, [editingFocusArea]);
  
  useEffect(() => {
    setIsLoadingPage(false);
  }, []);

  const currentDatedWorkout = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return allDeepWorkLogs.find(log => log.id === dateKey);
  }, [selectedDate, allDeepWorkLogs]);

  const currentWorkoutExercises = useMemo(() => currentDatedWorkout?.exercises || [], [currentDatedWorkout]);

  const updateOrAddWorkoutLog = (updatedWorkout: DatedWorkout) => {
    setAllDeepWorkLogs(prevLogs => {
      const index = prevLogs.findIndex(log => log.id === updatedWorkout.id);
      if (index > -1) {
        const newLogs = [...prevLogs]; newLogs[index] = updatedWorkout; return newLogs;
      }
      return [...prevLogs, updatedWorkout];
    });
  };

  const handleCreateFocusArea = () => {
    if (!selectedMicroSkill || !newFocusAreaData.name.trim()) {
        toast({ title: "Error", description: "Name is required.", variant: "destructive" });
        return;
    }

    const hours = parseInt(newFocusAreaData.hours, 10) || 0;
    const minutes = parseInt(newFocusAreaData.minutes, 10) || 0;
    const totalMinutes = hours * 60 + minutes;

    const newDef: ExerciseDefinition = { 
        id: `def_${Date.now()}_${Math.random()}`, 
        name: newFocusAreaData.name.trim(), 
        category: selectedMicroSkill.name as ExerciseCategory,
        description: newFocusAreaData.description.trim(),
        link: newFocusAreaData.link.trim(),
        iconUrl: getFaviconUrl(newFocusAreaData.link.trim()),
        estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined,
    };
    
    setDeepWorkDefinitions(prev => [...prev.filter(d => d.name !== 'placeholder'), newDef]);
    
    setIsNewFocusAreaModalOpen(false);
    setNewFocusAreaData({ name: '', description: '', link: '', hours: '', minutes: '' });
    
    toast({ title: "Success", description: `Focus Area "${newDef.name}" created.` });
  };

  const handleDeleteFocusArea = (id: string) => {
    const defToDelete = deepWorkDefinitions.find(def => def.id === id);
    if (!defToDelete) return;
    setDeepWorkDefinitions(prev => {
        const withoutDef = prev.filter(def => def.id !== id);
        return withoutDef.map(d => ({
            ...d,
            linkedDeepWorkIds: (d.linkedDeepWorkIds || []).filter(linkedId => linkedId !== id)
        }));
    });
    setAllDeepWorkLogs(prevLogs => prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) })));
    if (selectedDeepWorkTask?.id === id) { setSelectedDeepWorkTask(null); setViewMode('session'); }
    toast({ title: "Success", description: `Task "${defToDelete.name}" removed.` });
  };

  const handleUpdateFocusAreaName = (id: string, newName: string) => {
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

  const handleSaveFocusAreaEdit = () => {
    if (!editingFocusArea || !editedFocusAreaData.name?.trim()) { toast({ title: "Error", description: "Name cannot be empty.", variant: "destructive" }); return; }
    
    const hours = parseInt(editedFocusAreaData.estHours || '0', 10);
    const minutes = parseInt(editedFocusAreaData.estMinutes || '0', 10);
    const totalMinutes = hours * 60 + minutes;

    let finalData: Partial<ExerciseDefinition> = { 
      ...editedFocusAreaData,
      estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined
    };
    
    setDeepWorkDefinitions(prev => prev.map(def => def.id === editingFocusArea.id ? { ...def, ...finalData } as ExerciseDefinition : def));
    setAllDeepWorkLogs(prevLogs => prevLogs.map(log => ({...log, exercises: log.exercises.map(ex => ex.definitionId === editingFocusArea.id ? { ...ex, name: finalData.name! } : ex)})));
    if(selectedDeepWorkTask?.id === editingFocusArea.id) setSelectedDeepWorkTask({ ...selectedDeepWorkTask, ...finalData } as ExerciseDefinition);
    toast({ title: "Success", description: `Focus Area updated to "${finalData.name}".` });
    setEditingFocusArea(null);
  };

  const handleAddTaskToSession = (definition: ExerciseDefinition, slot: string) => {
    scheduleTaskFromMindMap(definition.id, 'deepwork', slot);
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
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => { // Reps is unused, weight is duration
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const newSet: LoggedSet = { id: `${Date.now()}-${Math.random()}`, reps: 1, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Progress Logged!", description: `Your deep work session has been saved.`});
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

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => { // Reps=unused, weight=duration
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.map(set => set.id === setId ? { ...set, reps: 1, weight, timestamp: Date.now() } : set )} : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };

  const handleViewProgress = (definition: ExerciseDefinition, type: 'deepwork' | 'upskill') => { 
    setProgressModalConfig({ isOpen: true, exercise: definition, type: type }); 
  };
  
  const handleOpenManageLinksModal = (type: 'deepwork' | 'upskill' | 'resource', parent: ExerciseDefinition) => {
    setManageLinksConfig({ type, parent });
    let ids: string[] = [];
    if (type === 'deepwork') ids = parent.linkedDeepWorkIds || [];
    else if (type === 'upskill') ids = parent.linkedUpskillIds || [];
    else if (type === 'resource') ids = parent.linkedResourceIds || [];
    setTempLinkedIds(ids);

    setNewLinkedItemTopic(parent.category);
    setNewLinkedItemName(''); 
    setNewLinkedItemDescription(''); 
    setNewLinkedItemLink(''); 
    setNewLinkedItemHours(''); 
    setNewLinkedItemMinutes(''); 
    setNewLinkedItemFolderId('');
    setLinkSearchTerm(''); 
    setSkillSelectionStep('topic');
    setFolderPath([]);
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
            if (selectedDeepWorkTask?.id === parent.id) {
                setSelectedDeepWorkTask(updatedParent);
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
    
    // For type 'deepwork' or 'upskill'
    if (!newLinkedItemName.trim() || !newLinkedItemTopic.trim()) {
        toast({ title: "Error", description: "Name and topic are required.", variant: "destructive" }); return;
    }
    const hours = parseInt(newLinkedItemHours, 10) || 0;
    const minutes = parseInt(newLinkedItemMinutes, 10) || 0;
    const totalMinutes = hours * 60 + minutes;
    const link = newLinkedItemLink.trim();
    const newDef: ExerciseDefinition = {
        id: `def_${Date.now()}_${type}_${Math.random()}`, name: newLinkedItemName.trim(), category: newLinkedItemTopic.trim() as ExerciseCategory,
        description: newLinkedItemDescription.trim(), link: link, iconUrl: getFaviconUrl(link),
        estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined,
    };
    newId = newDef.id;

    if (type === 'deepwork') {
      setDeepWorkDefinitions(prev => [...prev, newDef]);
      updatedParent = { ...parent, linkedDeepWorkIds: [...(parent.linkedDeepWorkIds || []), newId] };
    } else { // upskill
      setUpskillDefinitions(prev => [...prev, newDef]);
      updatedParent = { ...parent, linkedUpskillIds: [...(parent.linkedUpskillIds || []), newId] };
    }
    
    setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
    if (selectedDeepWorkTask?.id === parent.id) {
        setSelectedDeepWorkTask(updatedParent);
    }
    toast({ title: "Success", description: "New item created and linked." });
    setIsManageLinksModalOpen(false);
  };


  const handleSaveExistingLinks = () => {
    if (!manageLinksConfig) return;
    const { type, parent } = manageLinksConfig;
    
    let key: 'linkedDeepWorkIds' | 'linkedUpskillIds' | 'linkedResourceIds' = 'linkedDeepWorkIds';
    if(type === 'upskill') key = 'linkedUpskillIds';
    if(type === 'resource') key = 'linkedResourceIds';
    
    const updatedParent = { ...parent, [key]: tempLinkedIds };
    
    setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
    if (selectedDeepWorkTask?.id === parent.id) {
        setSelectedDeepWorkTask(updatedParent);
    }
    toast({ title: "Success", description: "Links have been updated." });
    setIsManageLinksModalOpen(false);
  };

  const getVisualizationsRecursive = useCallback((nodeId: string): ExerciseDefinition[] => {
    const visited = new Set<string>();
    const visualizations: ExerciseDefinition[] = [];
    const queue: string[] = [nodeId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const node = upskillDefinitions.find(d => d.id === currentId);
        if (!node) continue;

        const isParent = (node.linkedUpskillIds?.length ?? 0) > 0 || (node.linkedResourceIds?.length ?? 0) > 0;

        if (!isParent) { // It's a Visualization
            visualizations.push(node);
        } else { // It's a Curiosity or Objective, so recurse
            (node.linkedUpskillIds || []).forEach(childId => {
                if (!visited.has(childId)) {
                    queue.push(childId);
                }
            });
        }
    }
    return visualizations;
  }, [upskillDefinitions]);

  const filteredItemsForLinking = useMemo(() => {
    if (!manageLinksConfig) return [];
    const { type, parent } = manageLinksConfig;
    
    if (type === 'resource') {
        let displayItems: (ResourceFolder | Resource)[] = [];
        const subfolders = resourceFolders.filter(f => f.parentId === currentFolderIdForLinking);
        const resourcesInFolder = resources.filter(res => res.folderId === currentFolderIdForLinking);
        displayItems = [...subfolders, ...resourcesInFolder];
        
        return displayItems.filter(item => {
            if ('link' in item) { // It's a resource
                if (linkSearchTerm && !item.name.toLowerCase().includes(linkSearchTerm.toLowerCase())) return false;
            }
            return true;
        });
    }

    if (type === 'deepwork') {
      return (deepWorkDefinitions || []).filter(def => {
          if (!def.name || def.name === 'placeholder' || def.id === parent.id) return false;
          if (linkSearchTerm && !def.name.toLowerCase().includes(linkSearchTerm.toLowerCase())) return false;
          return true;
      });
    }
    
    // Type === 'upskill'
    let definitionsSource: any[];
    if (skillSelectionStep === 'curiosity') {
        definitionsSource = (upskillDefinitions || []).filter(def => {
            if (def.category !== selectedUpskillTopic) return false;
            const isParent = (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
            const isLinkedAsChild = linkedUpskillChildIds.has(def.id);
            return isParent && !isLinkedAsChild;
        });
    } else if (skillSelectionStep === 'visualization' && selectedUpskillCuriosity) {
        definitionsSource = getVisualizationsRecursive(selectedUpskillCuriosity.id);
    } else {
        definitionsSource = [...new Set(upskillDefinitions.map(def => def.category))].map(t => ({ id: t, name: t }));
    }
    
    return definitionsSource.filter(item => {
        if (!item.name || item.name === 'placeholder' || item.id === parent.id) return false;
        if (linkSearchTerm && !item.name.toLowerCase().includes(linkSearchTerm.toLowerCase())) return false;
        return true;
    });
  }, [manageLinksConfig, deepWorkDefinitions, upskillDefinitions, resources, linkSearchTerm, skillSelectionStep, selectedUpskillTopic, selectedUpskillCuriosity, resourceFolders, currentFolderIdForLinking, linkedDeepWorkChildIds, getVisualizationsRecursive]);


  const handleUnlinkItem = (type: 'deepwork' | 'upskill' | 'resource', idToUnlink: string) => {
    if (!selectedDeepWorkTask) return;
    let updatedParent: ExerciseDefinition;
    
    let key: 'linkedDeepWorkIds' | 'linkedUpskillIds' | 'linkedResourceIds';
    if(type === 'deepwork') key = 'linkedDeepWorkIds';
    else if(type === 'upskill') key = 'linkedUpskillIds';
    else key = 'linkedResourceIds';

    updatedParent = { ...selectedDeepWorkTask, [key]: (selectedDeepWorkTask[key] || []).filter((id: string) => id !== idToUnlink) };
    
    setDeepWorkDefinitions(prev => prev.map(def => def.id === selectedDeepWorkTask.id ? updatedParent : def));
    setSelectedDeepWorkTask(updatedParent);
    toast({ title: "Unlinked", description: "The item has been unlinked." });
  };
  
  const handleStartEditResource = (res: Resource) => {
    router.push('/resources');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
  
    if (!over || active.id === over.id) return;
  
    const draggedId = active.id as string;
    const targetId = over.id as string;
  
    const allDefs = [...deepWorkDefinitions, ...upskillDefinitions, ...resources];
    const draggedDef = allDefs.find(d => d.id === draggedId);
    const targetDef = allDefs.find(d => d.id === targetId);
  
    if (!draggedDef || !targetDef || !selectedDeepWorkTask) {
        toast({ title: "Error", description: "Could not find items to link.", variant: "destructive" });
        return;
    }
    
    const parentChildrenIds = new Set([
        ...(selectedDeepWorkTask.linkedDeepWorkIds || []),
        ...(selectedDeepWorkTask.linkedUpskillIds || []),
        ...(selectedDeepWorkTask.linkedResourceIds || []),
    ]);

    if (!parentChildrenIds.has(draggedId) || !parentChildrenIds.has(targetId)) {
        toast({ title: "Link Error", description: "Can only link sibling items within the same subtopic.", variant: "destructive" });
        return;
    }
    
    const isDraggedResource = resources.some(d => d.id === draggedId);
    const isDraggedUpskill = upskillDefinitions.some(d => d.id === draggedId);
    
    setDeepWorkDefinitions(prev => prev.map(def => {
        if (def.id === targetId) {
            let updatedDef = { ...def };
            if (isDraggedResource) {
                updatedDef.linkedResourceIds = [...(updatedDef.linkedResourceIds || []), draggedId];
            } else if (isDraggedUpskill) {
                updatedDef.linkedUpskillIds = [...(updatedDef.linkedUpskillIds || []), draggedId];
            } else { // Dragged a deepwork item
                updatedDef.linkedDeepWorkIds = [...(updatedDef.linkedDeepWorkIds || []), draggedId];
            }
            return updatedDef;
        }
        return def;
    }));
    
    const updatedParent = {
        ...selectedDeepWorkTask,
        linkedDeepWorkIds: (selectedDeepWorkTask.linkedDeepWorkIds || []).filter(id => id !== draggedId),
        linkedUpskillIds: (selectedDeepWorkTask.linkedUpskillIds || []).filter(id => id !== draggedId),
        linkedResourceIds: (selectedDeepWorkTask.linkedResourceIds || []).filter(id => id !== draggedId),
    };
    
    setDeepWorkDefinitions(prev => prev.map(def => def.id === selectedDeepWorkTask.id ? updatedParent : def));
    setSelectedDeepWorkTask(updatedParent);
  
    toast({ title: "Re-linked!", description: `"${draggedDef.name}" is now a sub-task of "${targetDef.name}".` });
  };

  const handleProjectSelect = (project: Project | null) => {
    setSelectedProject(project);
    setSelectedDeepWorkTask(null);
    setSelectedMicroSkill(null);
  };

  const handleLinkProject = useCallback((intentionId: string, projectId: string | null) => {
    setDeepWorkDefinitions(prev =>
        prev.map(def =>
            def.id === intentionId
                ? { ...def, linkedProjectId: projectId || undefined }
                : def
        )
    );
  }, [setDeepWorkDefinitions]);

  const handleToggleReadyForBranding = (id: string) => {
    setDeepWorkDefinitions(prev => 
      prev.map(def => 
        def.id === id ? { ...def, isReadyForBranding: !def.isReadyForBranding } : def
      )
    );
  };

  if (isLoadingPage) {
    return <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-16 w-16 text-primary animate-spin mb-4" /><p className="text-muted-foreground">Loading your deep work data...</p></div>;
  }

  const getLibraryTitle = () => {
    if (selectedProject) return selectedProject.name;
    if (selectedMicroSkill) return selectedMicroSkill.name;
    return 'Library';
  }

  const selectedFocusAreaIsIntention = selectedDeepWorkTask && (getDomainForCategory(selectedDeepWorkTask.category) !== null);

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
                    onSelectFocusArea={setSelectedDeepWorkTask}
                    onOpenNewFocusArea={handleOpenNewFocusAreaModal}
                    selectedProject={selectedProject}
                    onSelectProject={handleProjectSelect}
                    onDeleteFocusArea={handleDeleteFocusArea}
                    onUpdateFocusAreaName={handleUpdateFocusAreaName}
                    onOpenMindMap={(id) => {
                      setMindMapRootFocusAreaId(id);
                      setIsMindMapModalOpen(true);
                    }}
                    onEditFocusArea={setEditingFocusArea}
                />
              {selectedDeepWorkTask && (
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <div><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Focus Area Stats</CardTitle><CardDescription className="text-xs">Aggregated progress for "{selectedDeepWorkTask.name}"</CardDescription></div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewProgress(selectedDeepWorkTask, 'deepwork')}><TrendingUp className="h-4 w-4"/></Button>
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
                        <div className="flex-grow">
                          <CardTitle id="main-panel-heading" className="flex items-center gap-2 text-lg">
                            {viewMode === 'session' ? <ListChecks /> : <Library />}
                            {viewMode === 'session' ? `Session for: ${format(selectedDate, 'PPP')}` : getLibraryTitle()}
                          </CardTitle>
                        </div>
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
                                  <div className="text-center py-10"><Briefcase className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">No tasks for {format(selectedDate, 'PPP')}.</p><p className="text-sm text-muted-foreground/80">Add tasks from the library to get started!</p></div>
                                ) : (
                                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {currentWorkoutExercises.map((exercise) => {
                                        const definition = deepWorkDefinitions.find(def => def.id === exercise.definitionId);
                                        return (
                                          <WorkoutExerciseCard 
                                            key={exercise.id} exercise={exercise} definition={definition}
                                            onLogSet={handleLogSet} onDeleteSet={handleDeleteSet} onUpdateSet={handleUpdateSet} 
                                            onRemoveExercise={handleRemoveExerciseFromWorkout} onViewProgress={definition ? () => handleViewProgress(definition, 'deepwork') : undefined}
                                            pageType="deepwork"
                                          />
                                        );
                                    })}
                                  </div>
                                )}
                            </div>
                        ) : selectedDeepWorkTask ? (
                             <div className="space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold">{selectedDeepWorkTask.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleOpenManageLinksModal('deepwork', selectedDeepWorkTask)}>
                                            <LinkIcon className="mr-2 h-4 w-4" /> Link Sub-task
                                        </Button>
                                         <Button size="sm" variant="outline" onClick={() => handleOpenManageLinksModal('upskill', selectedDeepWorkTask)}>
                                            <LinkIcon className="mr-2 h-4 w-4" /> Link Learning
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleOpenManageLinksModal('resource', selectedDeepWorkTask)}>
                                            <Folder className="mr-2 h-4 w-4" /> Link Resource
                                        </Button>
                                        {selectedFocusAreaIsIntention && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="sm" variant="outline">
                                                        <Briefcase className="mr-2 h-4 w-4" /> Link Project
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onSelect={() => handleLinkProject(selectedDeepWorkTask.id, null)}>None</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {projectsInDomain.map(proj => (
                                                        <DropdownMenuCheckboxItem key={proj.id} checked={selectedDeepWorkTask.linkedProjectId === proj.id} onSelect={() => handleLinkProject(selectedDeepWorkTask.id, selectedDeepWorkTask.linkedProjectId === proj.id ? null : proj.id)}>{proj.name}</DropdownMenuCheckboxItem>
                                                    ))}
                                                    {projectsInDomain.length === 0 && <DropdownMenuItem disabled>No projects in this domain</DropdownMenuItem>}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {(selectedDeepWorkTask.linkedDeepWorkIds || []).map(id => {
                                        const def = deepWorkDefinitions.find(d => d.id === id);
                                        if (!def) return null;
                                        const domain = getDomainForCategory(def.category);
                                        const projectsInDomainForChild = domain ? projects.filter(p => p.domainId === domain.id) : [];
                                        return <LinkedDeepWorkCard key={id} id={id} deepworkDef={def} {...{ getIcon: (type) => <Lightbulb className="h-5 w-5 text-amber-500" />, getNodeType: getDeepWorkNodeType, getDeepWorkLoggedMinutes, permanentlyLoggedActionIds, handleAddTaskToSession, setSelectedFocusArea, setViewMode, handleToggleReadyForBranding, handleUnlinkItem, handleDeleteExerciseDefinition: handleDeleteFocusArea, handleViewProgress, deepWorkDefinitions, formatDuration: formatMinutes, calculatedEstimate: calculateTotalEstimate(def), upskillDefinitions, resources, setSelectedSubtopic: setSelectedDeepWorkTask, linkedDeepWorkChildIds, onOpenMindMap: (id) => { setMindMapRootFocusAreaId(id); setIsMindMapModalOpen(true); }, onUpdateName: handleUpdateFocusAreaName, projectsInDomain: projectsInDomainForChild, onLinkProject: handleLinkProject }} />;
                                    })}
                                    {(selectedDeepWorkTask.linkedUpskillIds || []).map(id => {
                                        const def = upskillDefinitions.find(d => d.id === id);
                                        if (!def) return null;
                                        // Fake implementation for now to avoid crashes
                                        const isUpskillObjectiveComplete = (id: string) => false;
                                        const getUpskillLoggedMinutesRecursive = (def: ExerciseDefinition) => 0;
                                        return <LinkedUpskillCard key={id} id={id} upskillDef={def} {...{ handleAddTaskToSession, setSelectedSubtopic: setSelectedDeepWorkTask, setViewMode, handleUnlinkItem: (type,id)=>handleUnlinkItem(type as any, id), handleDeleteUpskillDefinition: (id) => {}, handleViewProgress, isUpskillObjectiveComplete, getUpskillLoggedMinutesRecursive, upskillDefinitions, resources, calculatedEstimate: 0, setEmbedUrl, setFloatingVideoUrl, linkedUpskillChildIds, onUpdateName: () => {}, projectsInDomain, onLinkProject: () => {}, onEdit: () => {} }} />;
                                    })}
                                    {(selectedDeepWorkTask.linkedResourceIds || []).map(id => {
                                        const resource = resources.find(r => r.id === id);
                                        return resource ? <LinkedResourceItem key={id} resource={resource} handleUnlinkItem={(type, id) => handleUnlinkItem(type, id)} setEmbedUrl={setEmbedUrl} handleOpenNestedPopup={handleOpenNestedPopup} handleStartEditResource={handleStartEditResource} /> : null;
                                    })}
                                </div>
                            </div>
                        ) : selectedProject ? (
                            <div className="space-y-4">
                                {selectedProject.features.map(feature => (
                                    <Card key={feature.id}>
                                        <CardHeader className="pb-3"><CardTitle className="text-base">{feature.name}</CardTitle></CardHeader>
                                        <CardContent>
                                            <p className="text-sm font-medium mb-1">Required Skills:</p>
                                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                                                {feature.linkedSkills.map(link => {
                                                    const skill = Array.from(microSkillMap.values()).find(ms => ms.microSkillName === link.microSkillId);
                                                    return <li key={link.microSkillId}>{skill?.microSkillName || 'Unknown Skill'}</li>;
                                                })}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">Select a micro-skill or project from the library to view its tasks.</div>
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
                        <Label htmlFor="new-focus-name">Name</Label>
                        <Input id="new-focus-name" value={newFocusAreaData.name} onChange={(e) => setNewFocusAreaData(d => ({ ...d, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="new-focus-desc">Description (Optional)</Label>
                        <Textarea id="new-focus-desc" value={newFocusAreaData.description} onChange={(e) => setNewFocusAreaData(d => ({ ...d, description: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label htmlFor="new-focus-hours">Est. Hours</Label><Input type="number" id="new-focus-hours" value={newFocusAreaData.hours} onChange={(e) => setNewFocusAreaData(d => ({ ...d, hours: e.target.value }))} /></div>
                        <div className="space-y-1"><Label htmlFor="new-focus-mins">Est. Minutes</Label><Input type="number" id="new-focus-mins" value={newFocusAreaData.minutes} onChange={(e) => setNewFocusAreaData(d => ({ ...d, minutes: e.target.value }))} /></div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewFocusAreaModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateFocusArea}>Create</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        {editingFocusArea && (
            <Dialog open={!!editingFocusArea} onOpenChange={() => setEditingFocusArea(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Focus Area</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1"><Label htmlFor="edit-name">Name</Label><Input id="edit-name" value={editedFocusAreaData.name || ''} onChange={(e) => setEditedFocusAreaData(d => ({ ...d, name: e.target.value }))} /></div>
                        <div className="space-y-1"><Label htmlFor="edit-desc">Description</Label><Textarea id="edit-desc" value={editedFocusAreaData.description || ''} onChange={(e) => setEditedFocusAreaData(d => ({ ...d, description: e.target.value }))} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><Label htmlFor="edit-hours">Est. Hours</Label><Input id="edit-hours" type="number" value={editedFocusAreaData.estHours || ''} onChange={(e) => setEditedFocusAreaData(d => ({ ...d, estHours: e.target.value }))} /></div>
                            <div className="space-y-1"><Label htmlFor="edit-mins">Est. Minutes</Label><Input id="edit-mins" type="number" value={editedFocusAreaData.estMinutes || ''} onChange={(e) => setEditedFocusAreaData(d => ({ ...d, estMinutes: e.target.value }))} /></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingFocusArea(null)}>Cancel</Button>
                        <Button onClick={handleSaveFocusAreaEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
          {progressModalConfig.isOpen && progressModalConfig.exercise && (
            <FocusAreaProgressModal isOpen={progressModalConfig.isOpen} onOpenChange={(isOpen) => setProgressModalConfig(prev => ({...prev, isOpen}))} focusArea={progressModalConfig.exercise} deepWorkDefinitions={deepWorkDefinitions} upskillDefinitions={upskillDefinitions} allDeepWorkLogs={allDeepWorkLogs} allUpskillLogs={allUpskillLogs} avgDailyProductiveHours={2.5} />
          )}
          {isManageLinksModalOpen && manageLinksConfig && (
              <Dialog open={isManageLinksModalOpen} onOpenChange={setIsManageLinksModalOpen}>
                <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Manage Links for: {manageLinksConfig.parent.name}</DialogTitle>
                    <DialogDescription>Link existing items or create new ones to build out this objective.</DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="link" className="flex-grow flex flex-col min-h-0">
                      <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="link-deepwork">Deep Work</TabsTrigger>
                          <TabsTrigger value="link-upskill">Upskill</TabsTrigger>
                          <TabsTrigger value="link-resource">Resource</TabsTrigger>
                      </TabsList>
                      {/* Placeholder for content */}
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

const getDeepWorkNodeType = (def: ExerciseDefinition, childIds: Set<string>) => {
    const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
    if (isParent) return 'Intention';
    return 'Action';
};

const formatMinutes = (minutes: number) => {
    if (minutes === 0) return "0m";
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h > 0 ? `${h}h` : ''} ${m > 0 ? `${m}m` : ''}`.trim();
};

export default function DeepWorkPage() {
  return ( <AuthGuard> <DeepWorkPageContent /> </AuthGuard> );
}
