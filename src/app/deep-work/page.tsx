

"use client";

import React, { useState, useEffect, FormEvent, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, CalendarIcon, TrendingUp, Loader2, Briefcase, BookCopy, MoreVertical, Link as LinkIcon, Folder, Library, Globe, ExternalLink, Youtube, Share2, ArrowRight, Expand, Filter as FilterIcon, LineChart as LineChartIcon, Unlink, GitMerge, Clock, Lightbulb, Flag, Bolt, Flashlight, Focus, GripVertical, PictureInPicture, Code, MessageSquare, BrainCircuit, Blocks, Sprout, ChevronRight as ChevronRightIcon, ChevronDown, Frame, History, ChevronLeft } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, getISOWeek, isMonday, getYear, addDays, parseISO, differenceInDays } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, Resource, ResourceFolder, SkillArea, SkillDomain, CoreSkill, MicroSkill, Project, Feature, DailySchedule, Activity } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
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
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
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
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { FocusAreaProgressModal } from '@/components/FocusAreaProgressModal';
import { MindMapViewer } from '@/components/MindMapViewer';
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SkillLibrary } from '@/components/SkillLibrary';
import { LinkedUpskillCard } from '@/components/LinkedUpskillCard';


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
}> = ({ childId, parentId, childName, isLogged, type }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `subtask-${type}-${childId}-from-${parentId}`,
    data: { type: 'subtask', itemType: type, subtaskId: childId, name: childName, parentId: parentId },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "text-xs text-muted-foreground truncate flex items-center gap-1 cursor-grab active:cursor-grabbing",
        isLogged && "line-through text-muted-foreground/70",
        isDragging && "opacity-0"
      )}
      title={childName}
    >
      <span>-</span>
      <span>{childName.length > 25 ? `${childName.substring(0, 25)}...` : childName}</span>
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

const LinkedDeepWorkCard = React.forwardRef<HTMLDivElement, {
    deepworkDef: ExerciseDefinition;
    getDeepWorkNodeType: (def: ExerciseDefinition) => string;
    getDeepWorkLoggedMinutes: (def: ExerciseDefinition) => number;
    permanentlyLoggedActionIds: Set<string>;
    handleAddTaskToSession: (definition: ExerciseDefinition, slot: string) => void;
    handleCardClick: (def: ExerciseDefinition) => void;
    handleToggleReadyForBranding: (id: string) => void;
    handleUnlinkItem: (type: 'deepwork' | 'upskill' | 'resource', id: string) => void;
    handleDeleteFocusArea: (id: string) => void;
    handleViewProgress: (def: ExerciseDefinition, type: 'deepwork' | 'upskill') => void;
    deepWorkDefinitions: ExerciseDefinition[];
    formatDuration: (minutes: number) => string;
    calculatedEstimate: number;
    upskillDefinitions: ExerciseDefinition[];
    resources: Resource[];
    onOpenMindMap: (id: string) => void;
    onUpdateName: (id: string, newName: string) => void;
    projects: Project[];
    handleOpenLinkProjectModal: (task: ExerciseDefinition) => void;
    handleCreateAndLinkChild: (parentId: string, type: 'deepwork' | 'upskill') => void;
}>(({
    deepworkDef,
    getDeepWorkNodeType,
    getDeepWorkLoggedMinutes,
    permanentlyLoggedActionIds,
    handleAddTaskToSession,
    handleCardClick,
    handleToggleReadyForBranding,
    handleUnlinkItem,
    handleDeleteFocusArea,
    handleViewProgress,
    deepWorkDefinitions,
    formatDuration,
    calculatedEstimate,
    upskillDefinitions,
    resources,
    onOpenMindMap,
    onUpdateName,
    projects,
    handleOpenLinkProjectModal,
    handleCreateAndLinkChild,
}, ref) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `card-deepwork-${deepworkDef.id}`,
        data: { type: 'card', itemType: 'deepwork', definition: deepworkDef, id: deepworkDef.id }
    });
    const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id: `card-deepwork-${deepworkDef.id}`, data: { type: 'card', itemType: 'deepwork', definition: deepworkDef, id: deepworkDef.id } });
    const [isEditingName, setIsEditingName] = useState(false);
    const [currentName, setCurrentName] = useState(deepworkDef.name);

    const setCombinedRefs = (node: HTMLElement | null) => {
        if (typeof ref === 'function') {
            ref(node);
        } else if (ref) {
            ref.current = node;
        }
        setDroppableNodeRef(node);
        setNodeRef(node);
    };
    
    const nodeType = getDeepWorkNodeType(deepworkDef);

    const getIcon = () => {
      switch (nodeType) {
        case 'Intention': return <Lightbulb className="h-5 w-5 text-amber-500" />;
        case 'Objective': return <Flag className="h-5 w-5 text-green-500" />;
        case 'Action': return <Bolt className="h-5 w-5 text-blue-500" />;
        case 'Standalone':
        default:
            return <Focus className="h-5 w-5 text-purple-500" />;
      }
    };

    const isActionable = ['Action', 'Standalone', 'Intention'].includes(nodeType);
    const isComplete = isActionable && permanentlyLoggedActionIds.has(deepworkDef.id);
    const loggedMinutes = getDeepWorkLoggedMinutes(deepworkDef);
    const estDuration = (nodeType === 'Intention' || nodeType === 'Objective') ? calculatedEstimate : deepworkDef.estimatedDuration;

    const handleNameSave = () => {
        if (currentName.trim()) {
            onUpdateName(deepworkDef.id, currentName.trim());
        } else {
            setCurrentName(deepworkDef.name);
        }
        setIsEditingName(false);
    };

    const linkedProjects = (deepworkDef.linkedProjectIds || [])
        .map(pid => projects.find(p => p.id === pid))
        .filter((p): p is Project => !!p);
    
    return (
        <div ref={setCombinedRefs} className={cn(isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg", isDragging && "opacity-50")}>
            <Card className={cn("relative flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl min-h-[230px]", isComplete && "opacity-70 bg-muted/30")}>
                 <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4" /></Button>
                    <AddToSessionPopover definition={deepworkDef} onSelectSlot={(slot) => handleAddTaskToSession(deepworkDef, slot)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={() => handleCardClick(deepworkDef)}><ArrowRight className="h-4 w-4" /></Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => onOpenMindMap(deepworkDef.id)}><GitMerge className="mr-2 h-4 w-4"/>View Mind Map</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleViewProgress(deepworkDef, 'deepwork')}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem>
                            {isActionable && <DropdownMenuItem onSelect={() => handleToggleReadyForBranding(deepworkDef.id)}><Checkbox className="mr-2" checked={!!deepworkDef.isReadyForBranding} /><span>Mark as Ready for Branding</span></DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleUnlinkItem('deepwork', deepworkDef.id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDeleteFocusArea(deepworkDef.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <CardHeader className="pb-3 flex-grow" onDoubleClick={() => setIsEditingName(true)}>
                    <div className="flex items-center gap-2">
                        {getIcon()}
                        {isEditingName ? (
                            <Input value={currentName} onChange={(e) => setCurrentName(e.target.value)} onBlur={handleNameSave} onKeyDown={(e) => e.key === 'Enter' && handleNameSave()} autoFocus className="text-base font-semibold h-8" />
                        ) : (
                            <CardTitle className="text-base">
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                <span className={cn("truncate", isComplete && "line-through text-muted-foreground")} title={deepworkDef.name}>
                                    {deepworkDef.name.length > 25 ? `${deepworkDef.name.substring(0, 25)}...` : deepworkDef.name}
                                </span>
                                </TooltipTrigger><TooltipContent><p>{deepworkDef.name}</p></TooltipContent></Tooltip></TooltipProvider>
                            </CardTitle>
                        )}
                        <Badge variant="outline" className="text-xs flex-shrink-0">{nodeType}</Badge>
                    </div>
                     {linkedProjects.length > 0 ? (
                        <CardDescription className="flex flex-wrap gap-x-2 gap-y-1 text-xs mt-1">
                            <span>Projects:</span>
                            {linkedProjects.map(p => <Badge key={p.id} variant="secondary">{p.name}</Badge>)}
                        </CardDescription>
                    ) : (
                        <CardDescription>{deepworkDef.category}</CardDescription>
                    )}
                </CardHeader>
                <CardContent className="flex-grow">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        {(deepworkDef.linkedDeepWorkIds || []).map(childId => {
                            const childDef = deepWorkDefinitions.find(d => d.id === childId);
                            if (!childDef) return null;
                            return <DraggableSubtaskItem key={childId} parentId={deepworkDef.id} childId={childId} childName={childDef.name} isLogged={permanentlyLoggedActionIds.has(childId)} type="deepwork" />;
                        })}
                        {(deepworkDef.linkedUpskillIds || []).map(childId => {
                            const childDef = upskillDefinitions.find(d => d.id === childId);
                            if (!childDef) return null;
                            return <DraggableSubtaskItem key={childId} parentId={deepworkDef.id} childId={childId} childName={childDef.name} isLogged={false} type="upskill" />;
                        })}
                        {(deepworkDef.linkedResourceIds || []).map(childId => {
                            const childDef = resources.find(d => d.id === childId);
                            if (!childDef) return null;
                            return <DraggableSubtaskItem key={childId} parentId={deepworkDef.id} childId={childId} childName={childDef.name} isLogged={false} type="resource" />;
                        })}
                    </div>
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
});
LinkedDeepWorkCard.displayName = 'LinkedDeepWorkCard';

function LinkedResourceItem({ resource, handleUnlinkItem, handleDelete, setEmbedUrl, handleOpenNestedPopup, handleStartEditResource }: {
  resource: Resource;
  handleUnlinkItem: (type: 'upskill' | 'resource', id: string) => void;
  handleDelete: (id: string) => void;
  setEmbedUrl: (url: string | null) => void;
  handleOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
  handleStartEditResource: (resource: Resource) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: `card-resource-${resource.id}`,
      data: { type: 'card', id: resource.id, itemType: 'resource' }
  });
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id: `card-resource-${resource.id}` });

  const setCombinedRefs = (node: HTMLElement | null) => {
    setNodeRef(node);
    setDroppableNodeRef(node);
  };
  
  const youtubeEmbedUrl = resource.link ? getYouTubeEmbedUrl(resource.link) : null;
  const isSpecialEmbed = resource.link ? (isNotionUrl(resource.link) || isObsidianUrl(resource.link)) : false;
  const embedLinkForModal = youtubeEmbedUrl || (isSpecialEmbed ? resource.link : null);

  if (resource.type === 'card') {
    const hasMarkdownContent = (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
    return (
      <div ref={setCombinedRefs} className={cn(isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg", isDragging && "opacity-50")}>
        <Card className={cn("relative flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer", hasMarkdownContent ? 'md:col-span-2 xl:col-span-3' : '')} onClick={(e) => handleStartEditResource(resource)}>
           <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4" /></Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={(e) => { e.stopPropagation(); handleStartEditResource(resource); }}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleUnlinkItem('resource', resource.id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => handleDelete(resource.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
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
    <div ref={setCombinedRefs} className={cn(isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg", isDragging && "opacity-50")}>
        <Card className="relative group transition-all duration-300 hover:shadow-xl" onClick={(e) => handleStartEditResource(resource)}>
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4" /></Button>
                {embedLinkForModal ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setEmbedUrl(embedLinkForModal); }}><Expand className="h-4 w-4" /></Button>
                ) : (
                    resource.link ? <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><a href={resource.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button> : null
                )}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onSelect={() => handleStartEditResource(resource)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleUnlinkItem('resource', resource.id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleDelete(resource.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
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

const LibraryContent = React.forwardRef<HTMLDivElement, {
    currentTask: ExerciseDefinition & { type: 'deepwork' | 'upskill' };
    deepWorkDefinitions: ExerciseDefinition[];
    upskillDefinitions: ExerciseDefinition[];
    resources: Resource[];
    permanentlyLoggedActionIds: Set<string>;
    getDeepWorkNodeType: (def: ExerciseDefinition) => string;
    getUpskillNodeType: (def: ExerciseDefinition) => string;
    getDeepWorkLoggedMinutes: (def: ExerciseDefinition) => number;
    getUpskillLoggedMinutesRecursive: (def: ExerciseDefinition) => number;
    calculateTotalEstimate: (def: ExerciseDefinition) => number;
    formatMinutes: (minutes: number) => string;
    isUpskillObjectiveComplete: (id: string) => boolean;
    handleAddTaskToSession: (definition: ExerciseDefinition, slot: string) => void;
    handleCardClick: (def: ExerciseDefinition) => void;
    handleSelectFocusArea: (def: ExerciseDefinition | null, type: 'deepwork' | 'upskill') => void;
    handleToggleReadyForBranding: (id: string) => void;
    handleUnlinkItem: (type: 'deepwork' | 'upskill' | 'resource', id: string) => void;
    handleDeleteFocusArea: (id: string) => void;
    handleDeleteResource: (id: string) => void;
    handleViewProgress: (def: ExerciseDefinition, type: 'deepwork' | 'upskill') => void;
    onOpenMindMap: (id: string) => void;
    handleUpdateFocusAreaName: (id: string, newName: string) => void;
    handleCreateAndLinkChild: (parentId: string, type: 'deepwork' | 'upskill') => void;
    setEmbedUrl: (url: string | null) => void;
    setFloatingVideoUrl: (url: string | null) => void;
    handleOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
    handleStartEditResource: (resource: Resource) => void;
    setViewMode: (mode: 'session' | 'library') => void;
    handleOpenLinkProjectModal: (task: ExerciseDefinition) => void;
    linkProjectToTask: (taskId: string, projectId: string | null) => void;
    onEdit: (def: ExerciseDefinition) => void;
    handleOpenManageLinksModal: (type: 'resource', parent: ExerciseDefinition) => void;
    handleCreateResource: (parentTask: ExerciseDefinition) => void;
}>(({
    currentTask,
    deepWorkDefinitions,
    upskillDefinitions,
    resources,
    permanentlyLoggedActionIds,
    getDeepWorkNodeType,
    getUpskillNodeType,
    getDeepWorkLoggedMinutes,
    getUpskillLoggedMinutesRecursive,
    calculateTotalEstimate,
    formatMinutes,
    isUpskillObjectiveComplete,
    handleAddTaskToSession,
    handleCardClick,
    handleSelectFocusArea,
    handleToggleReadyForBranding,
    handleUnlinkItem,
    handleDeleteFocusArea,
    handleDeleteResource,
    handleViewProgress,
    onOpenMindMap,
    handleUpdateFocusAreaName,
    handleCreateAndLinkChild,
    setEmbedUrl,
    setFloatingVideoUrl,
    handleOpenNestedPopup,
    handleStartEditResource,
    setViewMode,
    handleOpenLinkProjectModal,
    linkProjectToTask,
    onEdit,
    handleOpenManageLinksModal,
    handleCreateResource,
}, ref) => {

    const { microSkillMap, coreSkills, skillDomains, projects, scheduleTaskFromMindMap, setUpskillDefinitions, setDeepWorkDefinitions, setEditingFocusArea } = useAuth();
    
    const getDomainForCategory = useCallback((category: string) => {
        const microSkill = Array.from(microSkillMap.values()).find(ms => ms.microSkillName === category);
        if (!microSkill) return null;
        const coreSkill = coreSkills.find(cs => cs.name === microSkill.coreSkillName);
        if (!coreSkill) return null;
        return skillDomains.find(sd => sd.id === coreSkill.domainId);
    }, [microSkillMap, coreSkills, skillDomains]);

    const projectsInDomain = useMemo(() => {
        if (!currentTask || !currentTask.category) return [];
        const domain = getDomainForCategory(currentTask.category);
        if (!domain) return [];
        return projects.filter(p => p.domainId === domain.id);
    }, [currentTask, getDomainForCategory, projects]);
    
    const nodeType = currentTask.type === 'deepwork' ? getDeepWorkNodeType(currentTask) : getUpskillNodeType(currentTask);
    const isHighLevelNode = nodeType === 'Intention' || nodeType === 'Curiosity';
    const linkedProjects = (currentTask.linkedProjectIds || [])
      .map(pid => projects.find(p => p.id === pid))
      .filter((p): p is Project => !!p);
    
    const deepWorkLinkableTasks = deepWorkDefinitions.filter((def: ExerciseDefinition) => {
        if (def.id === currentTask.id) return false;
        const nodeType = getDeepWorkNodeType(def);
        return def.category === currentTask.category && (nodeType === 'Action' || nodeType === 'Standalone');
    });

    const upskillLinkableTasks = upskillDefinitions.filter((def: ExerciseDefinition) => {
        if (def.id === currentTask.id) return false;
        const nodeType = getUpskillNodeType(def);
        return def.category === currentTask.category && (nodeType === 'Visualization' || nodeType === 'Standalone');
    });
    
    const handleLinkToggle = (itemId: string, itemType: 'deepwork' | 'upskill' | 'resource') => {
        if (!currentTask) return;
        
        const linkKey = itemType === 'deepwork' ? 'linkedDeepWorkIds' : itemType === 'upskill' ? 'linkedUpskillIds' : 'linkedResourceIds';
        const currentLinks = currentTask[linkKey] || [];
        const isLinked = currentLinks.includes(itemId);
        
        const newLinks = isLinked ? currentLinks.filter((id: string) => id !== itemId) : [...currentLinks, itemId];
        
        const setParentDefinitions = currentTask.type === 'deepwork' ? setDeepWorkDefinitions : setUpskillDefinitions;
        
        setParentDefinitions((prev: ExerciseDefinition[]) => prev.map(def => 
            def.id === currentTask.id ? { ...def, [linkKey]: newLinks } : def
        ));
    };

    return (
        <div ref={ref} className="space-y-4">
            <div className="space-y-1">
                <h3 className="text-xl font-bold">{currentTask.name}</h3>
                <div className="flex flex-wrap items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline"><LinkIcon className="mr-2 h-4 w-4" /> Link Deep Work</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64">
                            <DropdownMenuLabel>Link Actions/Standalones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <ScrollArea className="h-[200px]">
                                {deepWorkLinkableTasks.map((task: ExerciseDefinition) => (
                                    <DropdownMenuCheckboxItem
                                        key={task.id}
                                        checked={(currentTask.linkedDeepWorkIds || []).includes(task.id)}
                                        onCheckedChange={() => handleLinkToggle(task.id, 'deepwork')}
                                    >
                                        {task.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </ScrollArea>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline"><BookCopy className="mr-2 h-4 w-4" /> Link Upskill</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64">
                            <DropdownMenuLabel>Link Visualizations/Standalones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <ScrollArea className="h-[200px]">
                                {upskillLinkableTasks.map((task: ExerciseDefinition) => (
                                    <DropdownMenuCheckboxItem
                                        key={task.id}
                                        checked={(currentTask.linkedUpskillIds || []).includes(task.id)}
                                        onCheckedChange={() => handleLinkToggle(task.id, 'upskill')}
                                    >
                                        {task.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </ScrollArea>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" variant="outline" onClick={() => handleOpenManageLinksModal('resource', currentTask as ExerciseDefinition)}>
                        <Folder className="mr-2 h-4 w-4" /> Link Resource
                    </Button>
                    {isHighLevelNode && (
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="gap-2">
                                        <Briefcase className="h-4 w-4" />
                                        {linkedProjects.length > 0 ? `${linkedProjects.length} Linked Project(s)` : "Link Project"}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {projectsInDomain.map(proj => (
                                        <DropdownMenuCheckboxItem
                                            key={proj.id}
                                            checked={linkedProjects.some(p => p.id === proj.id)}
                                            onCheckedChange={() => linkProjectToTask(currentTask.id, proj.id)}
                                        >
                                            {proj.name}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(currentTask.linkedDeepWorkIds || []).map((id: string) => {
                    const def = deepWorkDefinitions.find((d: ExerciseDefinition) => d.id === id);
                    if (!def) return null;
                    const domain = getDomainForCategory(def.category);
                    const projectsInDomainForChild = domain ? projects.filter((p: Project) => p.domainId === domain.id) : [];
                    return (
                        <LinkedDeepWorkCard 
                            key={id} 
                            deepworkDef={def}
                            getDeepWorkNodeType={getDeepWorkNodeType}
                            getDeepWorkLoggedMinutes={getDeepWorkLoggedMinutes}
                            permanentlyLoggedActionIds={permanentlyLoggedActionIds}
                            handleAddTaskToSession={handleAddTaskToSession}
                            handleCardClick={handleCardClick}
                            handleToggleReadyForBranding={handleToggleReadyForBranding}
                            handleUnlinkItem={handleUnlinkItem}
                            handleDeleteFocusArea={handleDeleteFocusArea}
                            handleViewProgress={handleViewProgress}
                            deepWorkDefinitions={deepWorkDefinitions}
                            formatDuration={formatMinutes}
                            calculatedEstimate={calculateTotalEstimate(def)}
                            upskillDefinitions={upskillDefinitions}
                            resources={resources}
                            onOpenMindMap={onOpenMindMap}
                            onUpdateName={handleUpdateFocusAreaName}
                            projects={projectsInDomainForChild}
                            handleOpenLinkProjectModal={handleOpenLinkProjectModal}
                            handleCreateAndLinkChild={handleCreateAndLinkChild}
                        />
                    );
                })}
                 {(currentTask.linkedUpskillIds || []).map((id: string) => {
                    const def = upskillDefinitions.find((d: ExerciseDefinition) => d.id === id);
                    if (!def) return null;
                    const domain = getDomainForCategory(def.category);
                    const projectsInDomainForChild = domain ? projects.filter((p: Project) => p.domainId === domain.id) : [];
                    return (
                        <LinkedUpskillCard 
                            key={id} 
                            upskillDef={def} 
                            handleAddTaskToSession={(def: ExerciseDefinition, slot: string) => scheduleTaskFromMindMap(def.id, 'upskill', slot)} 
                            setSelectedSubtopic={(d: ExerciseDefinition | null) => handleSelectFocusArea(d, 'upskill')}
                            setViewMode={setViewMode}
                            handleUnlinkItem={handleUnlinkItem} 
                            handleDeleteSubtopic={handleDeleteFocusArea}
                            handleViewProgress={(d: ExerciseDefinition) => handleViewProgress(d, 'upskill')} 
                            isComplete={isUpskillObjectiveComplete(def.id)} 
                            getUpskillLoggedMinutesRecursive={getUpskillLoggedMinutesRecursive} 
                            upskillDefinitions={upskillDefinitions} 
                            resources={resources} 
                            calculatedEstimate={calculateTotalEstimate(def)} 
                            setEmbedUrl={setEmbedUrl} 
                            setFloatingVideoUrl={setFloatingVideoUrl} 
                            linkedUpskillChildIds={new Set(upskillDefinitions.flatMap((d: ExerciseDefinition) => d.linkedUpskillIds || []))} 
                            onUpdateName={handleUpdateFocusAreaName} 
                            projectsInDomain={projectsInDomainForChild} 
                            onLinkProject={() => handleOpenLinkProjectModal(def)}
                            onEdit={onEdit}
                            onCreateAndLinkChild={handleCreateAndLinkChild}
                        />
                    );
                })}
                {(currentTask.linkedResourceIds || []).map((id: string) => {
                    const resource = resources.find((r: Resource) => r.id === id);
                    return resource ? (
                        <LinkedResourceItem 
                            key={id} 
                            resource={resource} 
                            handleUnlinkItem={(type: 'upskill' | 'resource', id: string) => handleUnlinkItem(type, id)}
                            handleDelete={handleDeleteResource}
                            setEmbedUrl={setEmbedUrl} 
                            handleOpenNestedPopup={handleOpenNestedPopup} 
                            handleStartEditResource={handleStartEditResource} 
                        />
                    ) : null;
                })}
                <Card
                    onClick={() => handleCreateAndLinkChild(currentTask.id, currentTask.type)}
                    className="rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[230px] hover:shadow-xl hover:-translate-y-1"
                >
                    <PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                    <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                        Add New {currentTask.type === 'deepwork' ? 'Action' : 'Visualization'}
                    </p>
                </Card>
                 <Card
                    onClick={() => handleCreateResource(currentTask)}
                    className="rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[230px] hover:shadow-xl hover:-translate-y-1"
                >
                    <Folder className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                    <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                        Add New Resource
                    </p>
                </Card>
            </div>
        </div>
    );
});
LibraryContent.displayName = 'LibraryContent';

function DeepWorkPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    allDeepWorkLogs, setAllDeepWorkLogs,
    allUpskillLogs, setAllUpskillLogs,
    deepWorkDefinitions, setDeepWorkDefinitions,
    upskillDefinitions, setUpskillDefinitions,
    topicGoals, 
    resources, setResources, resourceFolders, setResourceFolders,
    setFloatingVideoUrl,
    selectedDeepWorkTask, 
    setSelectedDeepWorkTask,
    selectedUpskillTask,
    setSelectedUpskillTask,
    skillDomains,
    coreSkills,
    projects,
    setProjects,
    microSkillMap,
    handleOpenNestedPopup,
    openGeneralPopup,
    scheduleTaskFromMindMap,
    recentItems,
    addToRecents,
    selectedMicroSkill,
    setSelectedMicroSkill,
    setSelectedDomainId,
    setSelectedSkillId,
    createResourceWithHierarchy,
    deleteResource,
  } = useAuth();
  const router = useRouter();
  
  const [navigationStack, setNavigationStack] = useState<(ExerciseDefinition & { type: 'deepwork' | 'upskill' })[]>([]);
  const currentTask = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1] : null;
  const currentTaskType = currentTask?.type || null;

  const [editingFocusArea, setEditingFocusArea] = useState<ExerciseDefinition | null>(null);
  const [editedFocusAreaData, setEditedFocusAreaData] = useState<Partial<ExerciseDefinition> & { estHours?: string; estMinutes?: string }>({});
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [progressModalConfig, setProgressModalConfig] = useState<{ isOpen: boolean; exercise: ExerciseDefinition | null; type: 'deepwork' | 'upskill' }>({ isOpen: false, exercise: null, type: 'deepwork' });
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  const [viewMode, setViewMode] = useState<'session' | 'library'>('library');
  const [libraryView, setLibraryView] = useState<'deepwork' | 'upskill'>('deepwork');
  
  const [isManageLinksModalOpen, setIsManageLinksModalOpen] = useState(false);
  const [manageLinksConfig, setManageLinksConfig] = useState<{type: 'deepwork' | 'upskill' | 'resource', parent: ExerciseDefinition} | null>(null);
  const [newLinkedItemName, setNewLinkedItemName] = useState('');
  const [newLinkedItemDescription, setNewLinkedItemDescription] = useState('');
  const [newLinkedItemLink, setNewLinkedItemLink] = useState('');
  const [newLinkedItemHours, setNewLinkedItemHours] = useState('');
  const [newLinkedItemMinutes, setNewLinkedItemMinutes] = useState('');
  const [newLinkedItemFolderId, setNewLinkedItemFolderId] = useState('');
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [tempLinkedIds, setTempLinkedIds] = useState<string[]>([]);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  
  const [newLinkedItemMicroSkillId, setNewLinkedItemMicroSkillId] = useState<string>('');
  const [newLinkedItemCuriosityId, setNewLinkedItemCuriosityId] = useState<string | null>(null);

  // State for hierarchical linking
  const [folderPath, setFolderPath] = useState<string[]>([]);
  const currentFolderIdForLinking = folderPath[folderPath.length - 1] || null;
  const [isNewFocusAreaModalOpen, setIsNewFocusAreaModalOpen] = useState(false);
  const [newFocusAreaType, setNewFocusAreaType] = useState<'deepwork' | 'upskill'>('deepwork');
  const [newFocusAreaData, setNewFocusAreaData] = useState({ name: '', description: '', hours: '', minutes: '', link: '' });

  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
  const [mindMapRootFocusAreaId, setMindMapRootFocusAreaId] = useState<string | null>(null);
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const [selectedSpecializationId, setSelectedSpecializationId] = useState<string | null>(null);
  
  const [addResourceType, setAddResourceType] = useState<'link' | 'card' | 'habit' | 'mechanism'>('link');
  const [mechanismFramework, setMechanismFramework] = useState<'negative' | 'positive'>('negative');

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  
  const [isLinkProjectModalOpen, setIsLinkProjectModalOpen] = useState(false);
  const [linkingTask, setLinkingTask] = useState<ExerciseDefinition | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const onOpenMindMap = (id: string) => {
    setMindMapRootFocusAreaId(id);
    setIsMindMapModalOpen(true);
  };
  
  const handleOpenNewFocusAreaModal = (type: 'deepwork' | 'upskill') => {
    if (!selectedMicroSkill) {
        toast({ title: "Error", description: "Please select a micro-skill first.", variant: "destructive" });
        return;
    }
    setNewFocusAreaType(type);
    setIsNewFocusAreaModalOpen(true);
  };
  
  const getDomainForCategory = useCallback((category: string) => {
    const microSkill = Array.from(microSkillMap.values()).find(ms => ms.microSkillName === category);
    if (!microSkill) return null;
    const coreSkill = coreSkills.find(cs => cs.name === microSkill.coreSkillName);
    if (!coreSkill) return null;
    return skillDomains.find(sd => sd.id === coreSkill.domainId);
  }, [microSkillMap, coreSkills, skillDomains]);

  const linkProjectToTask = useCallback((taskId: string, projectId: string) => {
    const isDeepWork = deepWorkDefinitions.some(d => d.id === taskId);
    const setDefinitions = isDeepWork ? setDeepWorkDefinitions : setUpskillDefinitions;

    setDefinitions(prev => prev.map(task => {
        if (task.id === taskId) {
            const currentProjectIds = task.linkedProjectIds || [];
            const isLinked = currentProjectIds.includes(projectId);
            const newProjectIds = isLinked
                ? currentProjectIds.filter(id => id !== projectId)
                : [...currentProjectIds, projectId];
            return { ...task, linkedProjectIds: newProjectIds };
        }
        return task;
    }));
  }, [deepWorkDefinitions, upskillDefinitions, setDeepWorkDefinitions, setUpskillDefinitions]);

  useEffect(() => {
    if (linkingTask) {
        const fullTaskData = [...deepWorkDefinitions, ...upskillDefinitions].find(t => t.id === linkingTask.id);
        if (fullTaskData) {
            setLinkingTask(fullTaskData);
        }
    }
  }, [deepWorkDefinitions, upskillDefinitions, linkingTask]);

  const handleOpenLinkProjectModal = (task: ExerciseDefinition) => {
    setLinkingTask(task);
    setIsLinkProjectModalOpen(true);
  };

  const projectsForLinking = useMemo(() => {
    if (!linkingTask) return [];
    const domain = getDomainForCategory(linkingTask.category);
    if (!domain) return [];
    return projects.filter(p => p.domainId === domain.id);
  }, [linkingTask, getDomainForCategory, projects]);

  const permanentlyLoggedActionIds = useMemo(() => {
    const loggedIds = new Set<string>();
    const processLogs = (logs: DatedWorkout[]) => {
      logs.forEach(log => {
        log.exercises.forEach(ex => {
          if (ex.loggedSets.length > 0) {
            loggedIds.add(ex.definitionId);
          }
        });
      });
    };
    if (allDeepWorkLogs) processLogs(allDeepWorkLogs);
    if (allUpskillLogs) processLogs(allUpskillLogs);
    return loggedIds;
  }, [allDeepWorkLogs, allUpskillLogs]);
  
  const getDeepWorkNodeType = useCallback((def: ExerciseDefinition): string => {
    const hasChildren = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0;
    const hasResources = (def.linkedResourceIds?.length ?? 0) > 0;
    
    if (!hasChildren || hasResources) {
        const isChild = deepWorkDefinitions.some(parent => (parent.linkedDeepWorkIds || []).includes(def.id));
        return isChild ? 'Action' : 'Standalone';
    }
    
    const hasActionableChild = (def.linkedDeepWorkIds || []).some(childId => {
        const childDef = deepWorkDefinitions.find(d => d.id === childId);
        return childDef && getDeepWorkNodeType(childDef).match(/Action|Standalone/);
    });
    if (hasActionableChild) return 'Objective';

    const hasObjectiveChild = (def.linkedDeepWorkIds || []).some(childId => {
        const childDef = deepWorkDefinitions.find(d => d.id === childId);
        return childDef && getDeepWorkNodeType(childDef) === 'Objective';
    });
    if (hasObjectiveChild) return 'Intention';

    return 'Objective';
  }, [deepWorkDefinitions]);


  const getUpskillNodeType = useCallback((def: ExerciseDefinition): string => {
    const hasChildren = (def.linkedUpskillIds?.length ?? 0) > 0;
    const hasResources = (def.linkedResourceIds?.length ?? 0) > 0;

    if (!hasChildren || hasResources) {
        const isChild = upskillDefinitions.some(parent => (parent.linkedUpskillIds || []).includes(def.id));
        return isChild ? 'Visualization' : 'Standalone';
    }
    
    const hasActionableChild = (def.linkedUpskillIds || []).some(childId => {
        const childDef = upskillDefinitions.find(d => d.id === childId);
        return childDef && getUpskillNodeType(childDef).match(/Visualization|Standalone/);
    });
    if (hasActionableChild) return 'Objective';
    
    const hasObjectiveChild = (def.linkedUpskillIds || []).some(childId => {
        const childDef = upskillDefinitions.find(d => d.id === childId);
        return childDef && getUpskillNodeType(childDef) === 'Objective';
    });
    if (hasObjectiveChild) return 'Curiosity';
    
    return 'Objective';
  }, [upskillDefinitions]);

  const calculateTotalEstimate = useCallback((def: ExerciseDefinition) => {
    let total = 0;
    const visited = new Set<string>();
  
    function recurse(d: ExerciseDefinition) {
      if (visited.has(d.id)) return;
      visited.add(d.id);
  
      const hasDeepWorkChildren = (d.linkedDeepWorkIds?.length ?? 0) > 0;
      const hasUpskillChildren = (d.linkedUpskillIds?.length ?? 0) > 0;
  
      if (hasDeepWorkChildren) {
        (d.linkedDeepWorkIds || []).forEach(childId => {
          const childDef = deepWorkDefinitions.find(c => c.id === childId);
          if (childDef) recurse(childDef);
        });
      } else if (hasUpskillChildren) {
         (d.linkedUpskillIds || []).forEach(childId => {
          const childDef = upskillDefinitions.find(d => d.id === childId);
          if (childDef) recurse(childDef);
        });
      }
      else {
        total += d.estimatedDuration || 0;
      }
    }
  
    recurse(def);
    return total;
  }, [deepWorkDefinitions, upskillDefinitions]);
  
  const getDeepWorkLoggedMinutes = useCallback((definition: ExerciseDefinition) => {
    if (!definition) return 0;
    const visited = new Set<string>();
    const actionIds = new Set<string>();

    function recurse(nodeId: string) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        const node = deepWorkDefinitions.find(d => d.id === nodeId);
        if (!node) return;
        
        const nodeType = getDeepWorkNodeType(node);

        if (nodeType === 'Action' || nodeType === 'Standalone') {
            actionIds.add(node.id);
        } else {
            (node.linkedDeepWorkIds || []).forEach(childId => recurse(childId));
        }
    }
    recurse(definition.id);

    let totalMinutes = 0;
    if (allDeepWorkLogs) {
        allDeepWorkLogs.forEach(log => {
            log.exercises.forEach(ex => {
                if (actionIds.has(ex.definitionId)) {
                    totalMinutes += ex.loggedSets.reduce((sum, set) => sum + set.weight, 0);
                }
            });
        });
    }
    return totalMinutes;
  }, [allDeepWorkLogs, deepWorkDefinitions, getDeepWorkNodeType]);
  
  const getUpskillLoggedMinutesRecursive = useCallback((definition: ExerciseDefinition) => {
    if (!definition) return 0;
    const visited = new Set<string>();
    const visualizationIds = new Set<string>();

    function recurse(nodeId: string) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        const node = upskillDefinitions.find(d => d.id === nodeId);
        if (!node) return;
        
        const nodeType = getUpskillNodeType(node);

        if (nodeType === 'Visualization' || nodeType === 'Standalone') {
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
  }, [allUpskillLogs, upskillDefinitions, getUpskillNodeType]);

  const totalLoggedTime = useMemo(() => {
    if (!currentTask) return 0;
    if (currentTaskType === 'deepwork') return getDeepWorkLoggedMinutes(currentTask);
    if (currentTaskType === 'upskill') return getUpskillLoggedMinutesRecursive(currentTask);
    return 0;
  }, [currentTask, currentTaskType, getDeepWorkLoggedMinutes, getUpskillLoggedMinutesRecursive]);

  const formatMinutes = (minutes: number) => {
    if (minutes === 0) return "0m";
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h > 0 ? `${h}h` : ''} ${m > 0 ? `${m}m` : ''}`.trim();
  }

  const totalEstimatedDuration = useMemo(() => {
    if (!currentTask) return 0;
    return calculateTotalEstimate(currentTask);
  }, [currentTask, calculateTotalEstimate]);

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
  
  const currentDatedWorkout = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const logs = currentTaskType === 'deepwork' ? allDeepWorkLogs : allUpskillLogs;
    return logs.find(log => log.id === dateKey);
  }, [selectedDate, allDeepWorkLogs, allUpskillLogs, currentTaskType]);

  const currentWorkoutExercises = useMemo(() => currentDatedWorkout?.exercises || [], [currentDatedWorkout]);

  const updateOrAddWorkoutLog = (updatedWorkout: DatedWorkout) => {
    const logsUpdater = newFocusAreaType === 'deepwork' ? setAllDeepWorkLogs : setAllUpskillLogs;
    logsUpdater(prevLogs => {
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
        estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined,
        link: newFocusAreaData.link.trim(),
        iconUrl: getFaviconUrl(newFocusAreaData.link.trim()),
    };
    
    if (newFocusAreaType === 'deepwork') {
      setDeepWorkDefinitions(prev => [...prev, newDef]);
    } else {
      setUpskillDefinitions(prev => [...prev, newDef]);
    }
    
    setIsNewFocusAreaModalOpen(false);
    setNewFocusAreaData({ name: '', description: '', hours: '', minutes: '', link: '' });
    
    toast({ title: "Success", description: `Task "${newDef.name}" created.` });
  };

  const handleDeleteFocusArea = (id: string) => {
    let defToDelete: ExerciseDefinition | undefined;
    
    let isDeepWork = deepWorkDefinitions.some(d => d.id === id);
    if(isDeepWork) {
        defToDelete = deepWorkDefinitions.find(d => d.id === id);
        setDeepWorkDefinitions(prev => prev.filter(def => def.id !== id).map(d => ({...d, linkedDeepWorkIds: (d.linkedDeepWorkIds || []).filter(linkedId => linkedId !== id)})));
        setAllDeepWorkLogs(prevLogs => prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) })));
    } else {
        defToDelete = upskillDefinitions.find(d => d.id === id);
        setUpskillDefinitions(prev => prev.filter(def => def.id !== id).map(d => ({...d, linkedUpskillIds: (d.linkedUpskillIds || []).filter(linkedId => linkedId !== id)})));
        setAllUpskillLogs(prevLogs => prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) })));
    }

    if (defToDelete) {
        if (navigationStack.some(item => item.id === id)) {
            setNavigationStack(prev => prev.filter(item => item.id !== id));
        }
        toast({ title: "Success", description: `Task "${defToDelete.name}" removed.` });
    }
  };
  
  const handleDeleteResource = (id: string) => {
    deleteResource(id);
    toast({ title: "Success", description: "Resource removed." });
  };


  const handleUpdateFocusAreaName = (id: string, newName: string) => {
    const isDeepWork = deepWorkDefinitions.some(d => d.id === id);
    if(isDeepWork) {
      setDeepWorkDefinitions(prev => prev.map(def => def.id === id ? { ...def, name: newName } : def));
      setAllDeepWorkLogs(prevLogs => prevLogs.map(log => ({...log, exercises: log.exercises.map(ex => ex.definitionId === id ? { ...ex, name: newName } : ex)})));
    } else {
      setUpskillDefinitions(prev => prev.map(def => def.id === id ? { ...def, name: newName } : def));
      setAllUpskillLogs(prevLogs => prevLogs.map(log => ({...log, exercises: log.exercises.map(ex => ex.definitionId === id ? { ...ex, name: newName } : ex)})));
    }
  };

  const handleSaveFocusAreaEdit = () => {
    if (!editingFocusArea || !editedFocusAreaData.name?.trim()) { toast({ title: "Error", description: "Task name cannot be empty.", variant: "destructive" }); return; }
    
    const hours = parseInt(editedFocusAreaData.estHours || '0', 10);
    const minutes = parseInt(editedFocusAreaData.estMinutes || '0', 10);
    const totalMinutes = hours * 60 + minutes;

    let finalData: Partial<ExerciseDefinition> = { 
      ...editedFocusAreaData,
      estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined
    };
    
    let isDeepWork = deepWorkDefinitions.some(d => d.id === editingFocusArea.id);
    if (isDeepWork) {
        setDeepWorkDefinitions(prev => prev.map(def => def.id === editingFocusArea.id ? { ...def, ...finalData } as ExerciseDefinition : def));
        setAllDeepWorkLogs(prevLogs => prevLogs.map(log => ({...log, exercises: log.exercises.map(ex => ex.definitionId === editingFocusArea.id ? { ...ex, name: finalData.name! } : ex)})));
    } else {
        if (finalData.link !== editingFocusArea.link) finalData.iconUrl = getFaviconUrl(finalData.link || '');
        setUpskillDefinitions(prev => prev.map(def => def.id === editingFocusArea.id ? { ...def, ...finalData } as ExerciseDefinition : def));
        setAllUpskillLogs(prevLogs => prevLogs.map(log => ({...log, exercises: log.exercises.map(ex => ex.definitionId === editingFocusArea.id ? { ...ex, name: finalData.name! } : ex)})));
    }
    
    setNavigationStack(prev => prev.map(item => item.id === editingFocusArea.id ? { ...item, ...finalData } as (ExerciseDefinition & { type: 'deepwork' | 'upskill'}) : item));
    toast({ title: "Success", description: `Task updated to "${finalData.name}".` });
    setEditingFocusArea(null);
  };

  const handleAddTaskToSession = (definition: ExerciseDefinition, slot: string) => {
    scheduleTaskFromMindMap(definition.id, definition.category === "Content Bundle" ? 'branding' : (deepWorkDefinitions.some(d => d.id === definition.id) ? 'deepwork' : 'upskill'), slot);
  };

  const handleRemoveExerciseFromWorkout = (exerciseId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    let logsUpdater = allUpskillLogs;
    let setLogsUpdater = setAllUpskillLogs;
    if (currentTaskType === 'deepwork') {
      logsUpdater = allDeepWorkLogs;
      setLogsUpdater = setAllDeepWorkLogs;
    }
    
    const existingWorkout = logsUpdater.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) setLogsUpdater(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      else updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => { // Reps for upskill duration, weight for deepwork duration
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const logs = currentTaskType === 'deepwork' ? allDeepWorkLogs : allUpskillLogs;
    const logsUpdater = currentTaskType === 'deepwork' ? setAllDeepWorkLogs : setAllUpskillLogs;
    
    const existingWorkout = logs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const newSet: LoggedSet = { id: `${Date.now()}-${Math.random()}`, reps, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      logsUpdater(prevLogs => prevLogs.map(log => log.id === dateKey ? {...log, exercises: updatedExercises} : log));
      toast({ title: "Progress Logged!", description: `Your work session has been saved.`});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const logsUpdater = currentTaskType === 'deepwork' ? setAllDeepWorkLogs : setAllUpskillLogs;
    
    logsUpdater(prevLogs => prevLogs.map(log => {
      if (log.id === dateKey) {
        const updatedExercises = log.exercises.map(ex =>
          ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
        );
        return { ...log, exercises: updatedExercises };
      }
      return log;
    }));
  };

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const logsUpdater = currentTaskType === 'deepwork' ? setAllDeepWorkLogs : setAllUpskillLogs;

    logsUpdater(prevLogs => prevLogs.map(log => {
      if (log.id === dateKey) {
        const updatedExercises = log.exercises.map(ex =>
          ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.map(set => set.id === setId ? { ...set, reps, weight, timestamp: Date.now() } : set )} : ex
        );
        return { ...log, exercises: updatedExercises };
      }
      return log;
    }));
  };
  
  const handleViewProgress = (definition: ExerciseDefinition, type: 'deepwork' | 'upskill') => {
    setProgressModalConfig({ isOpen: true, exercise: definition, type: type });
  };
  
  const allMicroSkillsGrouped = useMemo(() => {
    const grouped: Record<string, MicroSkill[]> = {};
    coreSkills.forEach(core => {
        if(core.type === 'Specialization') {
            core.skillAreas.forEach(area => {
                const groupName = `${core.name} > ${area.name}`;
                if(!grouped[groupName]) grouped[groupName] = [];
                grouped[groupName].push(...area.microSkills);
            });
        }
    });
    return grouped;
  }, [coreSkills]);

  const getMicroSkillIdFromCategory = useCallback((category: string) => {
    const microSkill = Array.from(microSkillMap.values()).find(ms => ms.microSkillName === category);
    if (!microSkill) return null;
    const coreSkill = coreSkills.find(cs => cs.name === microSkill.coreSkillName);
    if (!coreSkill) return null;
    const skillArea = coreSkill.skillAreas.find(sa => sa.microSkills.some(ms => ms.name === microSkill.microSkillName));
    if (!skillArea) return null;
    const finalMicroSkill = skillArea.microSkills.find(ms => ms.name === microSkill.microSkillName);
    return finalMicroSkill?.id || null;
}, [microSkillMap, coreSkills]);


  const handleOpenManageLinksModal = (type: 'deepwork' | 'upskill' | 'resource', parent: ExerciseDefinition) => {
    setManageLinksConfig({ type, parent });
    if (type === 'deepwork') {
        setTempLinkedIds(parent.linkedDeepWorkIds || []);
    } else if (type === 'upskill') {
        setTempLinkedIds(parent.linkedUpskillIds || []);
    } else {
        setTempLinkedIds(parent.linkedResourceIds || []);
    }
    
    const parentMicroSkillId = getMicroSkillIdFromCategory(parent.category);
    if (parentMicroSkillId) {
        setNewLinkedItemMicroSkillId(parentMicroSkillId);
    }
    
    setNewLinkedItemCuriosityId(null);
    setNewLinkedItemName(''); 
    setNewLinkedItemDescription(''); 
    setNewLinkedItemLink(''); 
    setNewLinkedItemHours(''); 
    setNewLinkedItemMinutes(''); 
    setNewLinkedItemFolderId('');
    setLinkSearchTerm(''); 
    setFolderPath([]);
    setIsManageLinksModalOpen(true);
  };
  
  const handleCreateAndLinkItem = async () => {
    if (!manageLinksConfig) return;
    const { type, parent } = manageLinksConfig;
    
    let newId: string;
    let updatedParent: ExerciseDefinition;
    
    const setParentDefinitions = upskillDefinitions.some(d => d.id === parent.id) ? setUpskillDefinitions : setDeepWorkDefinitions;
    
    if (type === 'resource') {
        if (addResourceType === 'link') {
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
                    description: result.description || '', folderId: newLinkedItemFolderId, iconUrl: getFaviconUrl(fullLink), createdAt: new Date().toISOString()
                };
                newId = newResource.id;
                setResources(prev => [...prev, newResource]);
            } catch (error) {
                toast({ title: "Error adding resource", description: error instanceof Error ? error.message : "Could not fetch metadata.", variant: "destructive" });
                return;
            } finally { 
                setIsCreatingLink(false);
            }
        } else { // Card, Habit, Mechanism
            if (!newLinkedItemFolderId || !newLinkedItemName.trim()) { toast({ title: "Error", description: "Folder and name are required.", variant: "destructive" }); return; }
            const newResource: Resource = {
                id: `res_${Date.now()}`,
                name: newLinkedItemName.trim(),
                folderId: newLinkedItemFolderId,
                type: addResourceType,
                points: [],
                icon: 'Library',
                createdAt: new Date().toISOString(),
                mechanismFramework: addResourceType === 'mechanism' ? mechanismFramework : undefined,
            };
            newId = newResource.id;
            setResources(prev => [...prev, newResource]);
        }
        
        updatedParent = { ...parent, linkedResourceIds: [...(parent.linkedResourceIds || []), newId] };
        setParentDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
        setNavigationStack(prev => prev.map(item => item.id === parent.id ? { ...item, ...updatedParent } : item));
        toast({ title: "Resource Added", description: `New resource has been saved and linked.`});
        setIsManageLinksModalOpen(false);
        return;
    }
     if (type === 'upskill') {
        const microSkillName = microSkillMap.get(newLinkedItemMicroSkillId)?.microSkillName;
        if (!newLinkedItemName.trim() || !microSkillName) {
            toast({ title: "Error", description: "Name and micro-skill are required.", variant: "destructive" });
            return;
        }

        const hours = parseInt(newLinkedItemHours, 10) || 0;
        const minutes = parseInt(newLinkedItemMinutes, 10) || 0;
        const totalMinutes = hours * 60 + minutes;
        const newUpskillDef: ExerciseDefinition = {
            id: `def_upskill_${Date.now()}`,
            name: newLinkedItemName.trim(),
            category: microSkillName as ExerciseCategory,
            description: newLinkedItemDescription.trim(),
            link: newLinkedItemLink.trim(),
            iconUrl: getFaviconUrl(newLinkedItemLink.trim()),
            estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined,
        };
        setUpskillDefinitions(prev => [...prev, newUpskillDef]);
        
        if (newLinkedItemCuriosityId) {
            setUpskillDefinitions(prev => prev.map(def => 
                def.id === newLinkedItemCuriosityId 
                    ? { ...def, linkedUpskillIds: [...(def.linkedUpskillIds || []), newUpskillDef.id] } 
                    : def
            ));
        }

        let finalParent = { ...parent, linkedUpskillIds: [...(parent.linkedUpskillIds || []), newUpskillDef.id] };

        setParentDefinitions(prev => prev.map(def => def.id === parent.id ? finalParent : def));
        setNavigationStack(prev => prev.map(item => item.id === parent.id ? { ...item, ...finalParent } : item));

    } else { // deepwork
        const microSkillName = microSkillMap.get(newLinkedItemMicroSkillId)?.microSkillName;
        if (!newLinkedItemName.trim() || !microSkillName) {
             toast({ title: "Error", description: "Name and micro-skill are required.", variant: "destructive" });
            return;
        }
        const hours = parseInt(newLinkedItemHours, 10) || 0;
        const minutes = parseInt(newLinkedItemMinutes, 10) || 0;
        const totalMinutes = hours * 60 + minutes;
        
        const newDeepWorkDef: ExerciseDefinition = {
            id: `def_deep_${Date.now()}`, 
            name: newLinkedItemName.trim(), 
            category: microSkillName as ExerciseCategory,
            description: newLinkedItemDescription.trim(),
            estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined,
        };
        setDeepWorkDefinitions(prev => [...prev, newDeepWorkDef]);
        updatedParent = { ...parent, linkedDeepWorkIds: [...(parent.linkedDeepWorkIds || []), newDeepWorkDef.id] };
        setParentDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
        setNavigationStack(prev => prev.map(item => item.id === parent.id ? { ...item, ...updatedParent } : item));
    }
    toast({ title: "Success", description: "New item created and linked." });
    setIsManageLinksModalOpen(false);
  };

  const handleSaveExistingLinks = () => {
    if (!manageLinksConfig) return;
    const { type, parent } = manageLinksConfig;
    let key;
    if (type === 'deepwork') key = 'linkedDeepWorkIds';
    else if (type === 'upskill') key = 'linkedUpskillIds';
    else key = 'linkedResourceIds';
    
    const updatedParent = { ...parent, [key]: tempLinkedIds };
    
    const setParentDefinitions = upskillDefinitions.some(d => d.id === parent.id) ? setUpskillDefinitions : setDeepWorkDefinitions;
    
    setParentDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
    setNavigationStack(prev => prev.map(item => item.id === parent.id ? { ...item, ...updatedParent } : item));
    toast({ title: "Success", description: "Links have been updated." });
    setIsManageLinksModalOpen(false);
  };
  
  const filteredItemsForLinking = useMemo(() => {
    if (!manageLinksConfig) return [];
    const { type, parent } = manageLinksConfig;

    if (type === 'resource') {
        let displayItems: (ResourceFolder | Resource)[] = [];
        const subfolders = resourceFolders.filter(f => f.parentId === currentFolderIdForLinking);
        const resourcesInFolder = resources.filter(res => res.folderId === currentFolderIdForLinking);
        displayItems = [...subfolders, ...resourcesInFolder];
        
        return displayItems.filter(item => {
            if ('link' in item || 'points' in item) { // It's a resource, not a folder
                if (linkSearchTerm && !item.name.toLowerCase().includes(linkSearchTerm.toLowerCase())) return false;
            }
            return true;
        });
    }

    if (type === 'deepwork') {
        let filteredDefs = deepWorkDefinitions.filter(def => def.name && def.name !== 'placeholder' && def.id !== parent.id);
        if (linkSearchTerm) {
            filteredDefs = filteredDefs.filter(def => def.name.toLowerCase().includes(linkSearchTerm.toLowerCase()));
        }
        return filteredDefs;
    }

    // Type is 'upskill'
    let sourceDefs = upskillDefinitions.filter(def => {
      if (!def.name || def.name === 'placeholder' || def.id === parent.id) return false;
      const nodeType = getUpskillNodeType(def);
      return nodeType === 'Visualization' || nodeType === 'Standalone';
    });

    if (selectedSpecializationId) {
        const microSkillNamesInSpecialization = new Set(
            coreSkills.find(s => s.id === selectedSpecializationId)
                ?.skillAreas.flatMap(sa => sa.microSkills)
                .map(ms => ms.name) || []
        );
        sourceDefs = sourceDefs.filter(def => microSkillNamesInSpecialization.has(def.category));
    }
    
    if (linkSearchTerm) {
        sourceDefs = sourceDefs.filter(def => def.name.toLowerCase().includes(linkSearchTerm.toLowerCase()));
    }
    return sourceDefs;

  }, [manageLinksConfig, deepWorkDefinitions, upskillDefinitions, resources, linkSearchTerm, resourceFolders, currentFolderIdForLinking, getUpskillNodeType, selectedSpecializationId, coreSkills]);


  const curiositiesForLinking = useMemo(() => {
    return upskillDefinitions.filter(def => getUpskillNodeType(def) === 'Curiosity');
  }, [upskillDefinitions, getUpskillNodeType]);

  const handleUnlinkItem = (type: 'deepwork' | 'upskill' | 'resource', idToUnlink: string) => {
    if (!currentTask) return;
    let updatedParent: ExerciseDefinition;
    let key: 'linkedDeepWorkIds' | 'linkedUpskillIds' | 'linkedResourceIds';
    
    if (type === 'deepwork') key = 'linkedDeepWorkIds';
    else if (type === 'upskill') key = 'linkedUpskillIds';
    else key = 'linkedResourceIds';
    
    updatedParent = { ...currentTask, [key]: (currentTask[key] || []).filter((id: string) => id !== idToUnlink) };
    
    if (currentTask.type === 'deepwork') {
        setDeepWorkDefinitions(prev => prev.map(def => def.id === currentTask!.id ? updatedParent : def));
    } else {
        setUpskillDefinitions(prev => prev.map(def => def.id === currentTask!.id ? updatedParent : def));
    }

    setNavigationStack(prev => prev.map(item => item.id === currentTask!.id ? { ...item, ...updatedParent } : item));
    toast({ title: "Unlinked", description: "The item has been unlinked." });
  };
  
  const handleStartEditResource = (res: Resource) => {
    openGeneralPopup(res.id, new MouseEvent('click'));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) {
        if (active.data.current?.type === 'subtask') {
            const { itemType, subtaskId, parentId } = active.data.current;

            // Unlink from old parent
            if (parentId) {
                const oldParentIsDeepWork = deepWorkDefinitions.some(d => d.id === parentId);
                const setOldDefs = oldParentIsDeepWork ? setDeepWorkDefinitions : setUpskillDefinitions;
                const oldLinkKey = itemType === 'deepwork' ? 'linkedDeepWorkIds' : 'linkedUpskillIds';
                
                setOldDefs((prev: ExerciseDefinition[]) => prev.map(def => 
                    def.id === parentId ? { ...def, [oldLinkKey]: (def[oldLinkKey] || []).filter((id: string) => id !== subtaskId) } : def
                ));
            }
            toast({ title: "Promoted to Top-Level", description: "Subtask has been unlinked and is now a top-level item." });
        }
        return;
    }
    
    if (active.id === over.id) return;

    const activeId = active.data.current?.subtaskId || active.data.current?.id;
    const activeType = active.data.current?.itemType;
    const oldParentId = active.data.current?.parentId;
    const targetId = over.data.current?.id;
    const targetType = over.data.current?.type;

    if (targetType === 'card') {
        if (oldParentId) {
            const oldParentIsDeepWork = deepWorkDefinitions.some(d => d.id === oldParentId);
            const setOldDefs = oldParentIsDeepWork ? setDeepWorkDefinitions : setUpskillDefinitions;
            const oldLinkKey = activeType === 'deepwork' ? 'linkedDeepWorkIds' : 'linkedUpskillIds';
            
            setOldDefs((prev: ExerciseDefinition[]) => prev.map(def => 
                def.id === oldParentId ? { ...def, [oldLinkKey]: (def[oldLinkKey] || []).filter((id: string) => id !== activeId) } : def
            ));
        }

        const newParentIsDeepWork = deepWorkDefinitions.some(d => d.id === targetId);
        const setNewDefs = newParentIsDeepWork ? setDeepWorkDefinitions : setUpskillDefinitions;
        const newLinkKey = activeType === 'deepwork' ? 'linkedDeepWorkIds' : 'linkedUpskillIds';
        
        setNewDefs((prev: ExerciseDefinition[]) => prev.map(def =>
            def.id === targetId ? { ...def, [newLinkKey]: [...(def[newLinkKey] || []), activeId] } : def
        ));

        toast({ title: "Task Re-linked!", description: `Item moved to a new parent.` });
    }
  };


  const handleProjectSelect = (project: Project | null) => {
    setSelectedProject(project);
    setNavigationStack([]);
    setSelectedMicroSkill(null);
  };
  
  const handleToggleReadyForBranding = (defId: string) => {
    setDeepWorkDefinitions(prev => prev.map(def =>
      def.id === defId ? { ...def, isReadyForBranding: !def.isReadyForBranding } : def
    ));
    toast({ title: "Status Updated", description: "Ready for Branding status has been toggled." });
  };
  
  const currentTaskIsIntention = currentTask && getDeepWorkNodeType(currentTask) === 'Intention';

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

        const isParent = (node.linkedUpskillIds?.length ?? 0) > 0;
        
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

    return Array.from(visualizationIds).every(vizId => permanentlyLoggedActionIds.has(vizId));
  }, [upskillDefinitions, permanentlyLoggedActionIds]);

  const handleCreateAndLinkChild = useCallback((parentId: string, type: 'deepwork' | 'upskill') => {
      const parentDef = deepWorkDefinitions.find(d => d.id === parentId) || upskillDefinitions.find(d => d.id === parentId);
      if (!parentDef) return;

      const newDef: ExerciseDefinition = {
          id: `def_${Date.now()}_${type}_${Math.random().toString(36).substring(2, 9)}`,
          name: 'New Task',
          category: parentDef.category,
      };

      if (type === 'deepwork') {
          setDeepWorkDefinitions(prev => [...prev, newDef]);
      } else {
          setUpskillDefinitions(prev => [...prev, newDef]);
      }

      const linkKey = type === 'deepwork' ? 'linkedDeepWorkIds' : 'linkedUpskillIds';
      
      const setParentDefinitions = upskillDefinitions.some(d => d.id === parentId) ? setUpskillDefinitions : setDeepWorkDefinitions;

      setParentDefinitions(prev => prev.map(def => 
          def.id === parentId 
              ? { ...def, [linkKey]: [...(def[linkKey] || []), newDef.id] }
              : def
      ));

      setNavigationStack(prev => prev.map(item =>
          item.id === parentId
              ? { ...item, [linkKey]: [...(item[linkKey] || []), newDef.id] }
              : item
      ));

      setEditingCardId(newDef.id);
  }, [deepWorkDefinitions, upskillDefinitions, setDeepWorkDefinitions, setUpskillDefinitions]);

  
  const getLibraryTitle = () => {
    if (selectedProject) return selectedProject.name;
    if (selectedMicroSkill) return selectedMicroSkill.name;
    return 'Library';
  }

  const handleCardClick = (def: ExerciseDefinition) => {
    const type = deepWorkDefinitions.some(d => d.id === def.id) ? 'deepwork' : 'upskill';
    
    const nodeType = type === 'deepwork' ? getDeepWorkNodeType(def) : getUpskillNodeType(def);

    if (nodeType === 'Intention' || nodeType === 'Curiosity') {
        addToRecents({ ...def, type });
    }

    const existingIndex = navigationStack.findIndex(item => item.id === def.id);
    if (existingIndex !== -1) {
        setNavigationStack(prev => prev.slice(0, existingIndex + 1));
    } else {
        setNavigationStack(prev => [...prev, { ...def, type }]);
    }
  };

  const handleCreateResource = (parentTask: ExerciseDefinition) => {
    const updatedTask = createResourceWithHierarchy(parentTask, 'card');
    if (updatedTask) {
        setNavigationStack(prev => prev.map(item =>
            item.id === updatedTask!.id ? { ...item, ...updatedTask } : item
        ));
    }
  };

  const handleSelectFocusArea = (def: ExerciseDefinition | null, type: 'deepwork' | 'upskill') => {
    if (type === 'deepwork') {
      setSelectedDeepWorkTask(def);
      setSelectedUpskillTask(null);
    } else {
      setSelectedUpskillTask(def);
      setSelectedDeepWorkTask(null);
    }
  };
  
  const onSelectMicroSkill = (skill: MicroSkill | null) => {
    setSelectedMicroSkill(skill);
    // Also reset the navigation stack and selected tasks
    setNavigationStack([]);
    setSelectedDeepWorkTask(null);
    setSelectedUpskillTask(null);
  };

  const handleSelectRecentItem = (item: (ExerciseDefinition | Project) & { type: string }) => {
    if (item.type === 'project') {
      handleProjectSelect(item as Project);
      return;
    }
    
    const task = item as ExerciseDefinition;
    const taskType = item.type as 'deepwork' | 'upskill';
    
    const microSkill = Array.from(microSkillMap.values()).find(ms => ms.microSkillName === task.category);
    if (microSkill) {
        const coreSkill = coreSkills.find(cs => cs.name === microSkill.coreSkillName);
        if (coreSkill) {
            setSelectedDomainId(coreSkill.domainId);
            setSelectedSkillId(coreSkill.id);
            const skillArea = coreSkill.skillAreas.find(sa => sa.name === microSkill.skillAreaName);
            if (skillArea) {
                const fullMicroSkill = skillArea.microSkills.find(ms => ms.name === microSkill.microSkillName);
                if (fullMicroSkill) {
                    onSelectMicroSkill(fullMicroSkill);
                }
            }
        }
    } else {
        onSelectMicroSkill(null);
        setSelectedSkillId(null);
        setSelectedDomainId(null);
    }

    handleSelectFocusArea(task, taskType);
  };

  const filteredRecentItems = useMemo(() => {
    const isIntentionOrCuriosity = (item: ExerciseDefinition, type: 'deepwork' | 'upskill') => {
      const nodeType = type === 'deepwork' ? getDeepWorkNodeType(item) : getUpskillNodeType(item);
      return nodeType === 'Intention' || nodeType === 'Curiosity';
    };

    return recentItems.filter(item => {
      if (item.type === 'project') return true;
      if (item.type === 'deepwork' || item.type === 'upskill') {
        return isIntentionOrCuriosity(item as ExerciseDefinition, item.type as 'deepwork' | 'upskill');
      }
      return false;
    });
  }, [recentItems, getDeepWorkNodeType, getUpskillNodeType]);


  const handleBreadcrumbClick = (index: number) => {
    setNavigationStack(prev => prev.slice(0, index + 1));
  };
  
  useEffect(() => {
    setIsLoadingPage(false);
  }, []);
  
  useEffect(() => {
    if (selectedDeepWorkTask) {
        setNavigationStack([{...selectedDeepWorkTask, type: 'deepwork'}]);
    } else if (selectedUpskillTask) {
        setNavigationStack([{...selectedUpskillTask, type: 'upskill'}]);
    }
     else {
        setNavigationStack([]);
    }
}, [selectedDeepWorkTask, selectedUpskillTask]);

  const allDefinitions = useMemo(() => new Map([...deepWorkDefinitions, ...upskillDefinitions, ...resources].map(def => [def.id, def])), [deepWorkDefinitions, upskillDefinitions, resources]);
  const activeDragItem = useMemo(() => {
    if (!activeId) return null;
    const parsedId = activeId.toString().startsWith('subtask-') ? activeId.toString().split('-')[2] : activeId.toString().replace(/^card-(deepwork|upskill|resource)-/, '');
    return allDefinitions.get(parsedId);
  }, [activeId, allDefinitions]);
  
  const allChildIds = useMemo(() => {
    const childIds = new Set<string>();
    [...deepWorkDefinitions, ...upskillDefinitions].forEach(def => {
        (def.linkedDeepWorkIds || []).forEach(id => childIds.add(id));
        (def.linkedUpskillIds || []).forEach(id => childIds.add(id));
        (def.linkedResourceIds || []).forEach(id => childIds.add(id));
    });
    return childIds;
  }, [deepWorkDefinitions, upskillDefinitions]);

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setActiveId(e.active.id.toString())} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            
            <aside className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><History />Recents</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {filteredRecentItems.length > 0 ? (
                            <ul className="space-y-1">
                                {filteredRecentItems.map(item => (
                                    <li key={item.id}>
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start h-auto py-2"
                                            onClick={() => handleSelectRecentItem(item as (ExerciseDefinition | Project) & { type: 'deepwork' | 'upskill' | 'project' })}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {(item as any).type === 'deepwork' ? <Lightbulb className="h-4 w-4 text-amber-500" /> : (item as any).type === 'project' ? <Briefcase className="h-4 w-4 text-indigo-500" /> : <Flashlight className="h-4 w-4 text-cyan-500" />}
                                                <span className="truncate" title={item.name}>{item.name}</span>
                                            </div>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center">No recent items.</p>
                        )}
                    </CardContent>
                </Card>

                 <SkillLibrary
                    selectedMicroSkill={selectedMicroSkill}
                    onSelectMicroSkill={onSelectMicroSkill}
                    onSelectFocusArea={handleSelectFocusArea}
                    onOpenNewFocusArea={handleOpenNewFocusAreaModal}
                    selectedProject={selectedProject}
                    onSelectProject={(project) => { if(project) handleSelectRecentItem(project as Project & { type: 'project' }) }}
                    onDeleteFocusArea={handleDeleteFocusArea}
                    onUpdateFocusAreaName={handleUpdateFocusAreaName}
                    onOpenMindMap={onOpenMindMap}
                    onEdit={setEditingFocusArea}
                    addToRecents={addToRecents}
                    onOpenLinkProjectModal={handleOpenLinkProjectModal}
                    onToggleReadyForBranding={handleToggleReadyForBranding}
                    libraryView={libraryView}
                    setLibraryView={setLibraryView}
                />
              {currentTask && (
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <div><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Focus Area Stats</CardTitle><CardDescription className="text-xs">Aggregated progress for "{currentTask.name}"</CardDescription></div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewProgress(currentTask, currentTaskType!)}><TrendingUp className="h-4 w-4"/></Button>
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
                           <Button variant={viewMode === 'library' ? 'default' : 'outline'} size="sm" onClick={() => { setViewMode('library'); }}>Library</Button>
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
                                        const definition = (deepWorkDefinitions.find(def => def.id === exercise.definitionId) || upskillDefinitions.find(def => def.id === exercise.definitionId));
                                        return (
                                          <WorkoutExerciseCard 
                                            key={exercise.id} exercise={exercise} definition={definition} definitionGoal={topicGoals[exercise.category]}
                                            onLogSet={handleLogSet} onDeleteSet={handleDeleteSet} onUpdateSet={handleUpdateSet} 
                                            onRemoveExercise={handleRemoveExerciseFromWorkout} onViewProgress={definition ? () => handleViewProgress(definition, deepWorkDefinitions.some(d=>d.id===definition?.id) ? 'deepwork' : 'upskill') : undefined}
                                            pageType={deepWorkDefinitions.some(d=>d.id===definition?.id) ? 'deepwork' : 'upskill'}
                                          />
                                        );
                                    })}
                                  </div>
                                )}
                            </div>
                        ) : currentTask ? (
                            <LibraryContent 
                                ref={null}
                                currentTask={currentTask}
                                deepWorkDefinitions={deepWorkDefinitions}
                                upskillDefinitions={upskillDefinitions}
                                resources={resources}
                                permanentlyLoggedActionIds={permanentlyLoggedActionIds}
                                getDeepWorkNodeType={getDeepWorkNodeType}
                                getUpskillNodeType={getUpskillNodeType}
                                getDeepWorkLoggedMinutes={getDeepWorkLoggedMinutes}
                                getUpskillLoggedMinutesRecursive={getUpskillLoggedMinutesRecursive}
                                calculateTotalEstimate={calculateTotalEstimate}
                                formatMinutes={formatMinutes}
                                isUpskillObjectiveComplete={isUpskillObjectiveComplete}
                                handleAddTaskToSession={handleAddTaskToSession}
                                handleCardClick={handleCardClick}
                                handleSelectFocusArea={handleSelectFocusArea}
                                handleToggleReadyForBranding={handleToggleReadyForBranding}
                                handleUnlinkItem={handleUnlinkItem}
                                handleDeleteFocusArea={handleDeleteFocusArea}
                                handleDeleteResource={handleDeleteResource}
                                handleViewProgress={handleViewProgress}
                                onOpenMindMap={onOpenMindMap}
                                handleUpdateFocusAreaName={handleUpdateFocusAreaName}
                                handleCreateAndLinkChild={handleCreateAndLinkChild}
                                setEmbedUrl={setEmbedUrl}
                                setFloatingVideoUrl={setFloatingVideoUrl}
                                handleOpenNestedPopup={handleOpenNestedPopup}
                                handleStartEditResource={handleStartEditResource}
                                setViewMode={setViewMode}
                                handleOpenLinkProjectModal={handleOpenLinkProjectModal}
                                linkProjectToTask={linkProjectToTask}
                                onEdit={setEditingFocusArea}
                                handleOpenManageLinksModal={handleOpenManageLinksModal}
                                handleCreateResource={handleCreateResource}
                            />
                        ) : (
                           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {deepWorkDefinitions.filter(def => !allChildIds.has(def.id) && def.category === selectedMicroSkill?.name).map(def => (
                                    <LinkedDeepWorkCard 
                                        key={def.id} 
                                        deepworkDef={def}
                                        getDeepWorkNodeType={getDeepWorkNodeType}
                                        getDeepWorkLoggedMinutes={getDeepWorkLoggedMinutes}
                                        permanentlyLoggedActionIds={permanentlyLoggedActionIds}
                                        handleAddTaskToSession={handleAddTaskToSession}
                                        handleCardClick={handleCardClick}
                                        handleToggleReadyForBranding={handleToggleReadyForBranding}
                                        handleUnlinkItem={handleUnlinkItem}
                                        handleDeleteFocusArea={handleDeleteFocusArea}
                                        handleViewProgress={handleViewProgress}
                                        deepWorkDefinitions={deepWorkDefinitions}
                                        formatDuration={formatMinutes}
                                        calculatedEstimate={calculateTotalEstimate(def)}
                                        upskillDefinitions={upskillDefinitions}
                                        resources={resources}
                                        onOpenMindMap={onOpenMindMap}
                                        onUpdateName={handleUpdateFocusAreaName}
                                        projects={projects}
                                        handleOpenLinkProjectModal={handleOpenLinkProjectModal}
                                        handleCreateAndLinkChild={handleCreateAndLinkChild}
                                    />
                                ))}
                                {upskillDefinitions.filter(def => !allChildIds.has(def.id) && def.category === selectedMicroSkill?.name).map(def => (
                                    <LinkedUpskillCard 
                                        key={def.id} 
                                        upskillDef={def}
                                        handleAddTaskToSession={handleAddTaskToSession} 
                                        setSelectedSubtopic={setSelectedUpskillTask}
                                        setViewMode={setViewMode}
                                        handleUnlinkItem={handleUnlinkItem} 
                                        handleDeleteSubtopic={handleDeleteFocusArea}
                                        handleViewProgress={(d) => handleViewProgress(d, 'upskill')} 
                                        isComplete={isUpskillObjectiveComplete(def.id)} 
                                        getUpskillLoggedMinutesRecursive={getUpskillLoggedMinutesRecursive} 
                                        upskillDefinitions={upskillDefinitions} 
                                        resources={resources} 
                                        calculatedEstimate={calculateTotalEstimate(def)} 
                                        setEmbedUrl={setEmbedUrl} 
                                        setFloatingVideoUrl={setFloatingVideoUrl} 
                                        linkedUpskillChildIds={new Set(upskillDefinitions.flatMap(d => d.linkedUpskillIds || []))} 
                                        onUpdateName={handleUpdateFocusAreaName} 
                                        projectsInDomain={projects} 
                                        onLinkProject={() => handleOpenLinkProjectModal(def)}
                                        onEdit={setEditingFocusArea} 
                                        onCreateAndLinkChild={handleCreateAndLinkChild}
                                    />
                                ))}
                                {selectedMicroSkill && (
                                    <Card
                                        onClick={() => handleOpenNewFocusAreaModal(libraryView)}
                                        className="rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[230px] hover:shadow-xl hover:-translate-y-1"
                                    >
                                        <PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                                        <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                                            Add New Task
                                        </p>
                                    </Card>
                                )}
                                {!selectedMicroSkill && <div className="col-span-3 text-center py-10 text-muted-foreground">Select a micro-skill or project from the library to view its tasks.</div>}
                           </div>
                        )}
                    </CardContent>
                </Card>
            </section>
          </div>
          <Dialog open={isNewFocusAreaModalOpen} onOpenChange={setIsNewFocusAreaModalOpen}>
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
                        <Input id="new-subtopic-name" value={newFocusAreaData.name} onChange={(e) => setNewFocusAreaData(d => ({ ...d, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="new-subtopic-desc">Description (Optional)</Label>
                        <Textarea id="new-subtopic-desc" value={newFocusAreaData.description} onChange={(e) => setNewFocusAreaData(d => ({ ...d, description: e.target.value }))} />
                    </div>
                    {newFocusAreaType === 'upskill' && (
                       <div className="space-y-1">
                          <Label htmlFor="new-subtopic-link">Link (Optional)</Label>
                          <Input id="new-subtopic-link" value={newFocusAreaData.link} onChange={(e) => setNewFocusAreaData(d => ({ ...d, link: e.target.value }))} />
                       </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><Label htmlFor="new-subtopic-hours">Est. Hours</Label><Input type="number" id="new-subtopic-hours" value={newFocusAreaData.hours} onChange={(e) => setNewFocusAreaData(d => ({ ...d, hours: e.target.value }))} /></div>
                        <div className="space-y-1"><Label htmlFor="new-subtopic-mins">Est. Minutes</Label><Input type="number" id="new-subtopic-mins" value={newFocusAreaData.minutes} onChange={(e) => setNewFocusAreaData(d => ({ ...d, minutes: e.target.value }))} /></div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewFocusAreaModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateFocusArea}>Create Task</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        {editingFocusArea && (
            <Dialog open={!!editingFocusArea} onOpenChange={() => setEditingFocusArea(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1"><Label htmlFor="edit-name">Task Name</Label><Input id="edit-name" value={editedFocusAreaData.name || ''} onChange={(e) => setEditedFocusAreaData(d => ({ ...d, name: e.target.value }))} /></div>
                        <div className="space-y-1"><Label htmlFor="edit-desc">Description</Label><Textarea id="edit-desc" value={editedFocusAreaData.description || ''} onChange={(e) => setEditedFocusAreaData(d => ({ ...d, description: e.target.value }))} /></div>
                        <div className="space-y-1"><Label htmlFor="edit-link">Link</Label><Input id="edit-link" value={editedFocusAreaData.link || ''} onChange={(e) => setEditedFocusAreaData(d => ({ ...d, link: e.target.value }))} /></div>
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
            <FocusAreaProgressModal
                isOpen={progressModalConfig.isOpen}
                onOpenChange={(isOpen) => setProgressModalConfig(prev => ({...prev, isOpen}))}
                focusArea={progressModalConfig.exercise}
                deepWorkDefinitions={deepWorkDefinitions}
                upskillDefinitions={upskillDefinitions}
                allDeepWorkLogs={allDeepWorkLogs}
                allUpskillLogs={allUpskillLogs}
                avgDailyProductiveHours={2}
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
                                <Input placeholder="Search..." value={linkSearchTerm} onChange={e => setLinkSearchTerm(e.target.value)} />
                                <Select value={manageLinksConfig.type} onValueChange={(value) => {
                                    setManageLinksConfig(prev => prev ? { ...prev, type: value as any } : null);
                                    setSelectedSpecializationId(null);
                                }}>
                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="deepwork">Deep Work</SelectItem>
                                        <SelectItem value="upskill">Upskill</SelectItem>
                                        <SelectItem value="resource">Resource</SelectItem>
                                    </SelectContent>
                                </Select>
                                {manageLinksConfig.type === 'upskill' && (
                                    <Select value={selectedSpecializationId || ''} onValueChange={(id) => setSelectedSpecializationId(id === 'all' ? null : id)}>
                                        <SelectTrigger className="w-[240px]">
                                            <SelectValue placeholder="Filter by Specialization..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Specializations</SelectItem>
                                            {coreSkills.filter(cs => cs.type === 'Specialization').map(spec => (
                                                <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                              </div>
                              {manageLinksConfig.type === 'resource' && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground w-full mb-2 p-1 border-b">
                                  <Button variant="ghost" size="sm" onClick={() => setFolderPath([])} disabled={folderPath.length === 0}>Root</Button>
                                  {folderPath.map((folderId, index) => {
                                      const folder = resourceFolders.find(f => f.id === folderId);
                                      return ( <React.Fragment key={folderId}> <ChevronRightIcon className="h-4 w-4" /> <Button variant="ghost" size="sm" onClick={() => setFolderPath(p => p.slice(0, index + 1))} disabled={index === folderPath.length - 1}> {folder?.name} </Button> </React.Fragment> )
                                  })}
                                </div>
                              )}
                              <ScrollArea className="flex-grow border rounded-md p-2">
                                  {filteredItemsForLinking.length > 0 ? (
                                      (filteredItemsForLinking as any[]).map(item => {
                                          const isFolder = 'parentId' in item;
                                          const isChecked = tempLinkedIds.includes(item.id);
                                          return (
                                              <div key={item.id} className="flex items-center space-x-2 p-1">
                                                  <Checkbox id={`cb-link-${item.id}`} checked={isChecked} onCheckedChange={() => setTempLinkedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])} disabled={isFolder}/>
                                                  <Label 
                                                      htmlFor={`cb-link-${item.id}`}
                                                      className="font-normal w-full flex items-center gap-2 cursor-pointer"
                                                      onClick={isFolder ? () => setFolderPath(p => [...p, item.id]) : undefined}
                                                  >
                                                      {isFolder ? <Folder className="h-4 w-4 text-primary" /> : manageLinksConfig.type === 'upskill' ? <BookCopy className="h-4 w-4" /> : <Library className="h-4 w-4"/>}
                                                      {item.name}
                                                  </Label>
                                              </div>
                                          )
                                      })
                                  ) : <p className="text-sm text-center text-muted-foreground p-4">No items to link. Try another filter or create a new item.</p>}
                              </ScrollArea>
                              <DialogFooter className="pt-4">
                                  <Button onClick={handleSaveExistingLinks}>Save Links</Button>
                              </DialogFooter>
                          </div>
                      </TabsContent>
                      <TabsContent value="create" className="flex-grow min-h-0">
                          <ScrollArea className="h-full pr-4">
                              {manageLinksConfig.type === 'resource' ? (
                                    <Tabs value={addResourceType} onValueChange={(v) => setAddResourceType(v as any)} className="w-full">
                                        <TabsList className="grid w-full grid-cols-4">
                                            <TabsTrigger value="link">Link</TabsTrigger>
                                            <TabsTrigger value="card">Card</TabsTrigger>
                                            <TabsTrigger value="habit">Habit</TabsTrigger>
                                            <TabsTrigger value="mechanism">Mechanism</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="link" className="pt-4 space-y-4">
                                            <div className="space-y-1"><Label>Folder</Label><Select value={newLinkedItemFolderId} onValueChange={setNewLinkedItemFolderId}><SelectTrigger/><SelectContent>{resourceFolders.map(f => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}</SelectContent></Select></div>
                                            <div className="space-y-1"><Label>Link URL</Label><Input value={newLinkedItemLink} onChange={e => setNewLinkedItemLink(e.target.value)} /></div>
                                        </TabsContent>
                                        <TabsContent value="card" className="pt-4 space-y-4">
                                            <div className="space-y-1"><Label>Folder</Label><Select value={newLinkedItemFolderId} onValueChange={setNewLinkedItemFolderId}><SelectTrigger/><SelectContent>{resourceFolders.map(f => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}</SelectContent></Select></div>
                                            <div className="space-y-1"><Label>Card Name</Label><Input value={newLinkedItemName} onChange={e => setNewLinkedItemName(e.target.value)} /></div>
                                        </TabsContent>
                                        <TabsContent value="habit" className="pt-4 space-y-4">
                                            <div className="space-y-1"><Label>Folder</Label><Select value={newLinkedItemFolderId} onValueChange={setNewLinkedItemFolderId}><SelectTrigger/><SelectContent>{resourceFolders.map(f => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}</SelectContent></Select></div>
                                            <div className="space-y-1"><Label>Habit Name</Label><Input value={newLinkedItemName} onChange={e => setNewLinkedItemName(e.target.value)} /></div>
                                        </TabsContent>
                                        <TabsContent value="mechanism" className="pt-4 space-y-4">
                                            <div className="space-y-1"><Label>Folder</Label><Select value={newLinkedItemFolderId} onValueChange={setNewLinkedItemFolderId}><SelectTrigger/><SelectContent>{resourceFolders.map(f => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}</SelectContent></Select></div>
                                            <div className="space-y-1"><Label>Mechanism Name</Label><Input value={newLinkedItemName} onChange={e => setNewLinkedItemName(e.target.value)} /></div>
                                            <RadioGroup value={mechanismFramework} onValueChange={(v) => setMechanismFramework(v as any)} className="flex items-center space-x-4">
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="negative" id="r-negative-modal" /><Label htmlFor="r-negative-modal">Negative</Label></div>
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="positive" id="r-positive-modal" /><Label htmlFor="r-positive-modal">Positive</Label></div>
                                            </RadioGroup>
                                        </TabsContent>
                                    </Tabs>
                              ) : (
                                  <div className="space-y-4">
                                      <div className="space-y-1">
                                          <Label>Micro-Skill</Label>
                                          <Select value={newLinkedItemMicroSkillId} onValueChange={setNewLinkedItemMicroSkillId}>
                                              <SelectTrigger><SelectValue placeholder="Select a micro-skill..."/></SelectTrigger>
                                              <SelectContent>
                                                  {Object.entries(allMicroSkillsGrouped).map(([group, skills]) => (
                                                      <React.Fragment key={group}>
                                                          <Label className="px-2 py-1.5 text-xs font-semibold">{group}</Label>
                                                          {skills.map(skill => (
                                                              <SelectItem key={skill.id} value={skill.id}>{skill.name}</SelectItem>
                                                          ))}
                                                      </React.Fragment>
                                                  ))}
                                              </SelectContent>
                                          </Select>
                                      </div>
                                      {manageLinksConfig.type === 'upskill' && newLinkedItemMicroSkillId && (
                                          <div className="space-y-1">
                                              <Label>Parent Task (Optional)</Label>
                                                <Select value={newLinkedItemCuriosityId || 'none'} onValueChange={id => setNewLinkedItemCuriosityId(id === 'none' ? null : id)}>
                                                    <SelectTrigger><SelectValue placeholder="Link to existing task..."/></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">None (create as new Curiosity)</SelectItem>
                                                        {curiositiesForLinking.map(curiosity => (
                                                            <SelectItem key={curiosity.id} value={curiosity.id}>{curiosity.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                          </div>
                                      )}
                                      <div className="space-y-1"><Label>Name</Label><Input value={newLinkedItemName} onChange={e => setNewLinkedItemName(e.target.value)} /></div>
                                      <div className="space-y-1"><Label>Description</Label><Textarea value={newLinkedItemDescription} onChange={e => setNewLinkedItemDescription(e.target.value)} /></div>
                                      {manageLinksConfig.type === 'upskill' && <div className="space-y-1"><Label>Link (Optional)</Label><Input value={newLinkedItemLink} onChange={e => setNewLinkedItemLink(e.target.value)} /></div>}
                                      <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-1"><Label>Est. Hours</Label><Input type="number" value={newLinkedItemHours} onChange={e => setNewLinkedItemHours(e.target.value)} /></div>
                                          <div className="space-y-1"><Label>Est. Minutes</Label><Input type="number" value={newLinkedItemMinutes} onChange={e => setNewLinkedItemMinutes(e.target.value)} /></div>
                                      </div>
                                  </div>
                              )}
                              <DialogFooter className="pt-4">
                                  <Button onClick={handleCreateAndLinkItem} disabled={isCreatingLink}>{isCreatingLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create & Link</Button>
                              </DialogFooter>
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

        <Dialog open={isLinkProjectModalOpen} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setLinkingTask(null);
            }
            setIsLinkProjectModalOpen(isOpen);
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Link "{linkingTask?.name}" to Projects</DialogTitle>
                    <DialogDescription>
                        Select projects from the same domain to create strategic links.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <ScrollArea className="h-60">
                        {projectsForLinking.length > 0 ? projectsForLinking.map(proj => (
                            <div key={proj.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`proj-check-${proj.id}`}
                                    checked={(linkingTask?.linkedProjectIds || []).includes(proj.id)}
                                    onCheckedChange={() => linkProjectToTask(linkingTask!.id, proj.id)}
                                />
                                <Label htmlFor={`proj-check-${proj.id}`} className="font-normal">{proj.name}</Label>
                            </div>
                        )) : <p className="text-sm text-muted-foreground text-center">No projects in this domain.</p>}
                    </ScrollArea>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsLinkProjectModalOpen(false)}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </div>
        <DragOverlay>
            {activeId && activeDragItem ? (
                <div className="pointer-events-none">
                    {activeId.startsWith('card-deepwork-') && (
                        <LinkedDeepWorkCard 
                            ref={null}
                            deepworkDef={activeDragItem as ExerciseDefinition}
                            getDeepWorkNodeType={getDeepWorkNodeType}
                            getDeepWorkLoggedMinutes={getDeepWorkLoggedMinutes}
                            permanentlyLoggedActionIds={permanentlyLoggedActionIds}
                            handleAddTaskToSession={handleAddTaskToSession}
                            handleCardClick={handleCardClick}
                            handleToggleReadyForBranding={handleToggleReadyForBranding}
                            handleUnlinkItem={handleUnlinkItem}
                            handleDeleteFocusArea={handleDeleteFocusArea}
                            handleViewProgress={handleViewProgress}
                            deepWorkDefinitions={deepWorkDefinitions}
                            formatDuration={formatMinutes}
                            calculatedEstimate={calculateTotalEstimate(activeDragItem as ExerciseDefinition)}
                            upskillDefinitions={upskillDefinitions}
                            resources={resources}
                            onOpenMindMap={onOpenMindMap}
                            onUpdateName={handleUpdateFocusAreaName}
                            projects={projects}
                            handleOpenLinkProjectModal={handleOpenLinkProjectModal}
                            handleCreateAndLinkChild={handleCreateAndLinkChild}
                        />
                    )}
                    {activeId.startsWith('card-upskill-') && (
                         <LinkedUpskillCard 
                            upskillDef={activeDragItem as ExerciseDefinition}
                            handleAddTaskToSession={(def, slot) => scheduleTaskFromMindMap(def.id, 'upskill', slot)} 
                            setSelectedSubtopic={(d) => handleSelectFocusArea(d, 'upskill')}
                            setViewMode={setViewMode}
                            handleUnlinkItem={handleUnlinkItem} 
                            handleDeleteSubtopic={handleDeleteFocusArea}
                            handleViewProgress={(d) => handleViewProgress(d, 'upskill')} 
                            isComplete={isUpskillObjectiveComplete(activeDragItem.id)} 
                            getUpskillLoggedMinutesRecursive={getUpskillLoggedMinutesRecursive} 
                            upskillDefinitions={upskillDefinitions} 
                            resources={resources} 
                            calculatedEstimate={calculateTotalEstimate(activeDragItem as ExerciseDefinition)} 
                            setEmbedUrl={setEmbedUrl} 
                            setFloatingVideoUrl={setFloatingVideoUrl} 
                            linkedUpskillChildIds={new Set(upskillDefinitions.flatMap(d => d.linkedUpskillIds || []))} 
                            onUpdateName={handleUpdateFocusAreaName} 
                            projectsInDomain={[]} 
                            onLinkProject={() => handleOpenLinkProjectModal(activeDragItem as ExerciseDefinition)}
                            onEdit={setEditingFocusArea} 
                            onCreateAndLinkChild={handleCreateAndLinkChild}
                        />
                    )}
                    {activeId.startsWith('subtask-') && (
                        <div className="bg-card text-xs text-muted-foreground truncate flex items-center gap-1 p-1 rounded-md shadow-lg">
                            <span>-</span>
                            <span>{(activeDragItem as ExerciseDefinition).name}</span>
                        </div>
                    )}
                </div>
            ) : null}
        </DragOverlay>
    </DndContext>
  );
}

export default function DeepWorkPage() {
  return ( <AuthGuard> <DeepWorkPageContent /> </AuthGuard> );
}
    

    










    

    



    













