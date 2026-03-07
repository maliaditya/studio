

"use client";

import React, { useState, useEffect, FormEvent, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, CalendarIcon, TrendingUp, Loader2, Briefcase, BookCopy, MoreVertical, Link as LinkIcon, Folder, Library, Globe, ExternalLink, Youtube, Share2, ArrowRight, Expand, Filter as FilterIcon, LineChart as LineChartIcon, Unlink, GitMerge, Clock, Lightbulb, Flag, Bolt, Flashlight, Focus, GripVertical, PictureInPicture, Code, MessageSquare, BrainCircuit, Blocks, Sprout, ChevronRight as ChevronRightIcon, ChevronDown, Frame, History, ChevronLeft, CheckSquare, Search, Workflow, Zap, Upload, File as FileIcon, View } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, getISOWeek, isMonday, getYear, addDays, parseISO, differenceInDays } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, Resource, ResourceFolder, SkillArea, SkillDomain, CoreSkill, MicroSkill, Project, Feature, DailySchedule, Activity, BrainHack, NodeType, ResourcePoint } from '@/types/workout';
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
import { LinkedDeepWorkCard } from '@/components/LinkedDeepWorkCard';
import { getAiConfigFromSettings, normalizeAiSettings } from '@/lib/ai/config';
import { getPdfForResource, storePdf } from '@/lib/audioDB';
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

if (typeof window !== "undefined" && (pdfjs as any).GlobalWorkerOptions) {
  (pdfjs as any).GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${(pdfjs as any).version}/build/pdf.worker.min.mjs`;
}


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
  onClick?: () => void;
}> = ({ childId, parentId, childName = '', isLogged, type, onClick }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `subtask-${type}-${childId}-from-${parentId}`,
    data: { type: 'subtask', itemType: type, subtaskId: childId, name: childName, parentId: parentId },
  });

  const name = childName || "Untitled";

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
      title={name}
    >
      <span>-</span>
      <span
        onClick={onClick}
        className={cn(
          onClick && "cursor-pointer hover:text-foreground"
        )}
      >
        {name.length > 25 ? `${name.substring(0, 25)}...` : name}
      </span>
    </div>
  );
};


const SLOT_NAMES: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

function AddToSessionPopover({ definition, onSelectSlot, disabled = false, currentSlot }: { 
    definition: ExerciseDefinition; 
    onSelectSlot: (slotName: string) => void; 
    disabled?: boolean;
    currentSlot: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" disabled={disabled}>
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
              className={cn(
                "w-full justify-start h-8",
                slotName === currentSlot && "bg-primary/10 text-primary"
              )}
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

function LinkedResourceItem({ resource, handleUnlinkItem, handleDelete, setEmbedUrl, handleOpenNestedPopup, handleStartEditResource, openPdfViewer }: {
  resource: Resource;
  handleUnlinkItem: (type: 'upskill' | 'resource', id: string) => void;
  handleDelete: (id: string) => void;
  setEmbedUrl: (url: string | null) => void;
  handleOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
  handleStartEditResource: (resource: Resource) => void;
  openPdfViewer: (resource: Resource) => void;
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
  
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (resource.type === 'pdf') {
      openPdfViewer(resource);
    } else {
      handleStartEditResource(resource);
    }
  };

  if (resource.type === 'card' || resource.type === 'pdf') {
    const pointCount = resource.points?.length || 0;
    const hasSpecialContent = resource.points?.some(p => p.type === 'markdown' || p.type === 'code') || false;

    const getColumnSpan = () => {
        if (pointCount > 8 || hasSpecialContent) {
            return "md:col-span-3 xl:col-span-3";
        }
        if (pointCount > 4) {
            return "md:col-span-2 xl:col-span-2";
        }
        return "";
    };

    return (
      <div ref={setCombinedRefs} className={cn(getColumnSpan(), isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg", isDragging && "opacity-50")}>
        <Card className="relative flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer h-full" onClick={handleCardClick}>
           <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4" /></Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={handleCardClick}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleUnlinkItem('resource', resource.id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => handleDelete(resource.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                  {resource.type === 'pdf' ? <FileIcon className="h-5 w-5 text-red-500" /> : <Library className="h-5 w-5 text-primary" />}
                  <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="truncate" title={resource.name || ''}>
                                {resource.name && resource.name.length > 25 ? `${resource.name.substring(0, 25)}...` : resource.name}
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
              <ScrollArea className="h-full">
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
        <Card className="relative group transition-all duration-300 hover:shadow-xl" onClick={handleCardClick}>
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
                            <p className="text-sm font-bold truncate" title={resource.name || ''}>{resource.name}</p>
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                    {resource.iconUrl ? <Image src={resource.iconUrl} alt="" width={16} height={16} className="h-4 w-4 rounded-sm flex-shrink-0" unoptimized /> : <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    <span className="truncate" title={resource.name || ''}>{resource.name}</span>
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
    getDeepWorkNodeType: (def: ExerciseDefinition) => string;
    getUpskillNodeType: (def: ExerciseDefinition) => string;
    getDeepWorkLoggedMinutes: (def: ExerciseDefinition) => number;
    getUpskillLoggedMinutesRecursive: (def: ExerciseDefinition) => number;
    calculateTotalEstimate: (def: ExerciseDefinition) => number;
    formatMinutes: (minutes: number) => string;
    handleAddTaskToSession: (definitionId: string, activityType: 'upskill' | 'deepwork', slotName: string) => void;
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
    handleGenerateVisualizationsFromLinkedPdf: (parentTask: ExerciseDefinition & { type: 'deepwork' | 'upskill' }) => void;
    isGeneratingVisualizationsFromLinkedPdf: boolean;
    isAiEnabled: boolean;
    setEmbedUrl: (url: string | null) => void;
    setFloatingVideoUrl: (url: string | null) => void;
    handleOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
    handleStartEditResource: (resource: Resource) => void;
    setViewMode: (mode: 'session' | 'library') => void;
    handleOpenLinkProjectModal: (task: ExerciseDefinition) => void;
    linkProjectToTask: (taskId: string, projectId: string | null) => void;
    onEdit: (def: ExerciseDefinition) => void;
    handleOpenManageLinksModal: (parent: ExerciseDefinition) => void;
    handleCreateResource: () => void;
    activeProjectIds: Set<string>;
    currentSlot: string;
}>(({
    currentTask,
    deepWorkDefinitions,
    upskillDefinitions,
    resources,
    getDeepWorkNodeType,
    getUpskillNodeType,
    getDeepWorkLoggedMinutes,
    getUpskillLoggedMinutesRecursive,
    calculateTotalEstimate,
    formatMinutes,
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
    handleGenerateVisualizationsFromLinkedPdf,
    isGeneratingVisualizationsFromLinkedPdf,
    isAiEnabled,
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
    activeProjectIds,
    currentSlot,
}, ref) => {

    const { microSkillMap, coreSkills, skillDomains, projects, scheduleTaskFromMindMap, setUpskillDefinitions, setDeepWorkDefinitions, getDescendantLeafNodes, permanentlyLoggedTaskIds, openPdfViewer } = useAuth();
    
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
    const isCuriosityNode = currentTask.type === 'upskill' && nodeType === 'Curiosity';
    const linkedPdfNameForCurrentTask = useMemo(() => {
        if (currentTask.type !== 'upskill') return null;
        const microSkill = Array.from(microSkillMap.values()).find(ms => ms.microSkillName === currentTask.category);
        if (!microSkill) return null;
        const coreSkill = coreSkills.find(cs => cs.name === microSkill.coreSkillName);
        if (!coreSkill?.linkedPdfResourceId) return null;
        const resource = resources.find(r => r.id === coreSkill.linkedPdfResourceId && r.type === 'pdf');
        return resource?.name || null;
    }, [currentTask, microSkillMap, coreSkills, resources]);
    const linkedProjects = (currentTask.linkedProjectIds || [])
      .map(pid => projects.find(p => p.id === pid))
      .filter((p): p is Project => !!p);

    return (
        <div ref={ref} className="space-y-4">
            <div className="flex items-center gap-4 justify-between">
                <h3 className="text-xl font-bold">{currentTask.name}</h3>
                <div className="flex items-center gap-1">
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(currentTask)}><Edit3 className="h-4 w-4"/></Button>
                    </TooltipTrigger><TooltipContent><p>Edit Task</p></TooltipContent></Tooltip></TooltipProvider>
                    
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onOpenMindMap(currentTask.id)}><GitMerge className="h-4 w-4"/></Button>
                    </TooltipTrigger><TooltipContent><p>View Mind Map</p></TooltipContent></Tooltip></TooltipProvider>
                    
                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleViewProgress(currentTask, currentTask.type)}><TrendingUp className="h-4 w-4"/></Button>
                    </TooltipTrigger><TooltipContent><p>View Progress</p></TooltipContent></Tooltip></TooltipProvider>
                    
                    <Button size="sm" variant="outline" onClick={() => handleOpenManageLinksModal(currentTask as ExerciseDefinition)}>
                        <LinkIcon className="mr-2 h-4 w-4" /> Link Items
                    </Button>

                    {isHighLevelNode && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-2">
                                    <Briefcase className="h-4 w-4" />
                                    {linkedProjects.length > 0 ? `${linkedProjects.length} Project(s)` : "Link Project"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {projectsInDomain.map(proj => (
                                    <DropdownMenuCheckboxItem
                                        key={proj.id}
                                        checked={(currentTask.linkedProjectIds || []).includes(proj.id)}
                                        onCheckedChange={() => linkProjectToTask(currentTask.id, proj.id)}
                                    >
                                        {proj.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                            handleAddTaskToSession={scheduleTaskFromMindMap}
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
                            handleCreateBrainHack={() => {}}
                            activeProjectIds={activeProjectIds}
                            currentSlot={currentSlot}
                        />
                    );
                })}
                 {(currentTask.linkedUpskillIds || []).map((id: string) => {
                    const def = upskillDefinitions.find((d: ExerciseDefinition) => d.id === id);
                    if (!def) return null;
                    const domain = getDomainForCategory(def.category);
                    const projectsInDomainForChild = domain ? projects.filter((p: Project) => p.domainId === domain.id) : [];
                    
                    const isComplete = permanentlyLoggedTaskIds.has(def.id);

                    return (
                        <LinkedUpskillCard 
                            key={id} 
                            upskillDef={def} 
                            getUpskillNodeType={getUpskillNodeType}
                            getUpskillLoggedMinutesRecursive={getUpskillLoggedMinutesRecursive}
                            isComplete={isComplete}
                            calculatedEstimate={calculateTotalEstimate(def)}
                            handleAddTaskToSession={scheduleTaskFromMindMap}
                            handleCardClick={handleCardClick}
                            handleDeleteSubtopic={handleDeleteFocusArea}
                            handleUnlinkItem={handleUnlinkItem}
                            handleViewProgress={handleViewProgress}
                            onEdit={onEdit}
                            onOpenLinkProjectModal={handleOpenLinkProjectModal}
                            onOpenMindMap={onOpenMindMap}
                            onUpdateName={handleUpdateFocusAreaName}
                            resources={resources}
                            upskillDefinitions={upskillDefinitions}
                            projectsInDomain={projectsInDomainForChild}
                            handleCreateAndLinkChild={handleCreateAndLinkChild}
                            handleCreateBrainHack={() => {}}
                            activeProjectIds={activeProjectIds}
                            currentSlot={currentSlot}
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
                            openPdfViewer={openPdfViewer}
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
                    onClick={() => handleCreateResource()}
                    className="rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[230px] hover:shadow-xl hover:-translate-y-1"
                >
                    <Folder className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                    <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                        Add New Resource
                    </p>
                </Card>
                {isCuriosityNode && isAiEnabled && (
                    <Card
                        onClick={() => {
                            if (!isGeneratingVisualizationsFromLinkedPdf) {
                                handleGenerateVisualizationsFromLinkedPdf(currentTask);
                            }
                        }}
                        className={cn(
                            "rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed transition-all duration-300 min-h-[230px]",
                            isGeneratingVisualizationsFromLinkedPdf
                                ? "cursor-wait opacity-80 border-primary/50"
                                : "cursor-pointer hover:border-primary hover:bg-muted/50 hover:shadow-xl hover:-translate-y-1"
                        )}
                    >
                        {isGeneratingVisualizationsFromLinkedPdf ? (
                            <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        ) : (
                            <BrainCircuit className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                        <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors text-center">
                            Generate with AI
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground text-center">
                            Curiosity: {currentTask.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground text-center">
                            {linkedPdfNameForCurrentTask ? `PDF: ${linkedPdfNameForCurrentTask}` : "Link a PDF in Skill Tree first"}
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
});
LibraryContent.displayName = 'LibraryContent';

export function DeepWorkPageContent({ isModal = false, onClose }: { isModal?: boolean, onClose?: () => void }) {
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
    selectedProjectId,
    setSelectedProjectId,
    createResourceWithHierarchy,
    deleteResource,
    getDeepWorkNodeType,
    getUpskillNodeType,
    getDescendantLeafNodes,
    activeProjectIds,
    currentSlot,
    permanentlyLoggedTaskIds,
    openPdfViewer,
    settings,
  } = useAuth();
  const router = useRouter();
  
  const [navigationStack, setNavigationStack] = useState<(ExerciseDefinition & { type: 'deepwork' | 'upskill' })[]>([]);
  const currentTask = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1] : null;
  const currentTaskType = currentTask?.type || null;

  const [editingFocusArea, setEditingFocusArea] = useState<ExerciseDefinition | null>(null);
  const [editedFocusAreaData, setEditedFocusAreaData] = useState<Partial<ExerciseDefinition> & { estHours?: string; estMinutes?: string; nodeType?: NodeType }>({});
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [progressModalConfig, setProgressModalConfig] = useState<{ isOpen: boolean; exercise: ExerciseDefinition | null; type: 'deepwork' | 'upskill' }>({ isOpen: false, exercise: null, type: 'deepwork' });
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  const [viewMode, setViewMode] = useState<'session' | 'library'>('library');
  const [libraryView, setLibraryView] = useState<'deepwork' | 'upskill'>('deepwork');
  
  const [isManageLinksModalOpen, setIsManageLinksModalOpen] = useState(false);
  const [manageLinksConfig, setManageLinksConfig] = useState<{ parent: ExerciseDefinition } | null>(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [tempLinkedIds, setTempLinkedIds] = useState<string[]>([]);
  const [linkTab, setLinkTab] = useState<'deepwork' | 'upskill' | 'resource'>('deepwork');

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
  
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  
  const [isLinkProjectModalOpen, setIsLinkProjectModalOpen] = useState(false);
  const [linkingTask, setLinkingTask] = useState<ExerciseDefinition | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [addResourceType, setAddResourceType] = useState<Resource['type']>('link');
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceLink, setNewResourceLink] = useState('');
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [mechanismFramework, setMechanismFramework] = useState<'negative' | 'positive'>('negative');
  const modelUploadInputRef = useRef<HTMLInputElement>(null);
  const pdfUploadInputRef = useRef<HTMLInputElement>(null);
  const [isGeneratingCuriositiesFromLinkedPdf, setIsGeneratingCuriositiesFromLinkedPdf] = useState(false);
  const [isGeneratingVisualizationsFromLinkedPdf, setIsGeneratingVisualizationsFromLinkedPdf] = useState(false);
  const isDesktopRuntime = typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop);
  const isAiEnabled = normalizeAiSettings(settings.ai, isDesktopRuntime).provider !== 'none';

  const extractLinesFromPageItems = useCallback((items: any[]): string[] => {
    const rows = new Map<number, Array<{ x: number; text: string }>>();
    items.forEach((item) => {
      const text = typeof item?.str === "string" ? item.str : "";
      if (!text.trim()) return;
      const x = Number(item?.transform?.[4] ?? 0);
      const y = Number(item?.transform?.[5] ?? 0);
      const key = Math.round(y * 2) / 2;
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key)!.push({ x, text });
    });

    return Array.from(rows.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([, words]) =>
        words
          .sort((a, b) => a.x - b.x)
          .map((w) => w.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter((line) => line.length > 0);
  }, []);

  const pickIndexLikeLines = useCallback((lines: string[]): string[] => {
    const candidates = lines.filter((line) => {
      if (line.length < 4 || line.length > 160) return false;
      if (/^\d+$/.test(line)) return false;
      if (/^(contents|table of contents|index)$/i.test(line.trim())) return true;
      if (/\b\d{1,4}\s*$/.test(line) && /[A-Za-z]/.test(line)) return true;
      if (/\.\.\.+\s*\d+\s*$/.test(line)) return true;
      if (/^\d+(\.\d+){0,3}\s+[A-Za-z]/.test(line)) return true;
      return false;
    });
    return candidates.length > 20 ? candidates.slice(0, 240) : lines.slice(0, 240);
  }, []);

  const extractPdfOutlineTextFromBlob = useCallback(async (pdfBlob: Blob): Promise<string> => {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const loadingTask = (pdfjs as any).getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;

    try {
      const outline = await pdf.getOutline();
      if (Array.isArray(outline) && outline.length > 0) {
        const outlineLines: string[] = [];
        const walk = (items: any[], prefix: number[] = []) => {
          items.forEach((item, idx) => {
            const title = String(item?.title || "").replace(/\s+/g, " ").trim();
            const number = [...prefix, idx + 1].join(".");
            if (title) outlineLines.push(`${number} ${title}`);
            const children = Array.isArray(item?.items) ? item.items : [];
            if (children.length > 0) walk(children, [...prefix, idx + 1]);
          });
        };
        walk(outline, []);
        if (outlineLines.length >= 4) {
          return outlineLines.slice(0, 1200).join("\n").slice(0, 24000);
        }
      }
    } catch {
      // Fallback to page text extraction.
    }

    const maxPages = Math.min(pdf.numPages, 24);
    const allLines: string[] = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageLines = extractLinesFromPageItems(Array.isArray(textContent.items) ? textContent.items : []);
      if (pageLines.length > 0) {
        allLines.push(`--- Page ${pageNum} ---`);
        allLines.push(...pageLines);
      }
    }

    return pickIndexLikeLines(allLines).join("\n").slice(0, 24000);
  }, [extractLinesFromPageItems, pickIndexLikeLines]);


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

  const selectedMicroSkillCoreSkill = useMemo(() => {
    if (!selectedMicroSkill) return null;
    const info = microSkillMap.get(selectedMicroSkill.id);
    if (info) {
      return coreSkills.find((skill) => skill.name === info.coreSkillName) || null;
    }
    const fallback = Array.from(microSkillMap.values()).find((ms) => ms.microSkillName === selectedMicroSkill.name);
    if (!fallback) return null;
    return coreSkills.find((skill) => skill.name === fallback.coreSkillName) || null;
  }, [selectedMicroSkill, microSkillMap, coreSkills]);

  const selectedMicroSkillLinkedPdfResource = useMemo(() => {
    if (!selectedMicroSkillCoreSkill?.linkedPdfResourceId) return null;
    return (
      resources.find(
        (resource) => resource.id === selectedMicroSkillCoreSkill.linkedPdfResourceId && resource.type === 'pdf'
      ) || null
    );
  }, [resources, selectedMicroSkillCoreSkill]);

  const selectedMicroSkillCuriosityCount = useMemo(() => {
    if (!selectedMicroSkill) return 0;
    return upskillDefinitions.filter(
      (def) => def.category === selectedMicroSkill.name && getUpskillNodeType(def) === 'Curiosity'
    ).length;
  }, [selectedMicroSkill, upskillDefinitions, getUpskillNodeType]);

  const handleGenerateCuriositiesFromLinkedPdf = useCallback(async () => {
    if (!selectedMicroSkill) {
      toast({ title: "Error", description: "Please select a micro-skill first.", variant: "destructive" });
      return;
    }
    if (!selectedMicroSkillLinkedPdfResource?.id) {
      toast({
        title: "Linked PDF Required",
        description: "Link a PDF to this specialization in Skill Tree first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingCuriositiesFromLinkedPdf(true);
    try {
      const localPdf = await getPdfForResource(
        selectedMicroSkillLinkedPdfResource.id,
        selectedMicroSkillLinkedPdfResource.pdfFileName || undefined
      );
      if (!localPdf.blob) {
        throw new Error("Linked PDF was not found in local IndexedDB. Open/upload it in the PDF viewer first.");
      }

      const extractedText = await extractPdfOutlineTextFromBlob(localPdf.blob);
      if (!extractedText.trim()) {
        throw new Error("Could not extract readable headings from the linked PDF.");
      }

      const response = await fetch('/api/ai/skill-from-pdf-index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
        },
        body: JSON.stringify({
          specializationName: selectedMicroSkillCoreSkill?.name || selectedMicroSkill.name,
          targetMicroSkill: selectedMicroSkill.name,
          extractedText,
          aiConfig: getAiConfigFromSettings(settings, isDesktopRuntime),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(result?.details || result?.error || 'Failed to generate curiosities.'));
      }

      const normalizeKey = (value: string) =>
        value
          .trim()
          .toLowerCase()
          .replace(/[^\w\s]/g, " ")
          .replace(/\s+/g, " ");
      const matchedMicroSkillName = String(result?.matchedMicroSkill || selectedMicroSkill.name).replace(/\s+/g, " ").trim();
      if (normalizeKey(matchedMicroSkillName) !== normalizeKey(selectedMicroSkill.name)) {
        throw new Error(
          `AI matched "${matchedMicroSkillName}" instead of "${selectedMicroSkill.name}". Please refine the PDF index or micro-skill naming and try again.`
        );
      }
      const curiosities = Array.from(
        new Set(
          (Array.isArray(result?.curiosities) ? result.curiosities : [])
            .map((value: unknown) => String(value || "").replace(/\s+/g, " ").trim())
            .filter((value: string) => value.length >= 2)
        )
      );

      if (curiosities.length === 0) {
        throw new Error("No curiosities were detected for this micro-skill from the linked PDF.");
      }

      let createdCount = 0;
      setUpskillDefinitions((prev) => {
        const existing = new Set(prev.map((def) => `${normalizeKey(def.category)}::${normalizeKey(def.name)}`));
        const additions: ExerciseDefinition[] = [];

        curiosities.forEach((name) => {
          const key = `${normalizeKey(selectedMicroSkill.name)}::${normalizeKey(name)}`;
          if (existing.has(key)) return;
          existing.add(key);
          additions.push({
            id: `def_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            name,
            category: selectedMicroSkill.name as ExerciseCategory,
            nodeType: 'Curiosity',
            linkedUpskillIds: [],
          });
        });

        createdCount = additions.length;
        if (additions.length === 0) return prev;
        return [...prev, ...additions];
      });

      toast({
        title: createdCount > 0 ? "Curiosities Generated" : "No New Curiosities",
        description:
          createdCount > 0
            ? `Added ${createdCount} curiosities for "${selectedMicroSkill.name}".`
            : `All detected curiosities already exist under "${selectedMicroSkill.name}".`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unable to generate curiosities from linked PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCuriositiesFromLinkedPdf(false);
    }
  }, [
    selectedMicroSkill,
    selectedMicroSkillLinkedPdfResource,
    selectedMicroSkillCoreSkill,
    extractPdfOutlineTextFromBlob,
    isDesktopRuntime,
    settings,
    setUpskillDefinitions,
    toast,
  ]);

  const handleGenerateVisualizationsFromLinkedPdf = useCallback(async (parentTask: ExerciseDefinition & { type: 'deepwork' | 'upskill' }) => {
    if (parentTask.type !== 'upskill') {
      toast({ title: "Error", description: "AI visualization generation is available for curiosity tasks only.", variant: "destructive" });
      return;
    }
    if (getUpskillNodeType(parentTask) !== 'Curiosity') {
      toast({ title: "Error", description: "Select a curiosity card to generate visualizations.", variant: "destructive" });
      return;
    }

    const microSkillInfo = Array.from(microSkillMap.values()).find((ms) => ms.microSkillName === parentTask.category);
    const coreSkill = microSkillInfo ? coreSkills.find((cs) => cs.name === microSkillInfo.coreSkillName) : null;
    const linkedPdf =
      coreSkill?.linkedPdfResourceId
        ? resources.find((resource) => resource.id === coreSkill.linkedPdfResourceId && resource.type === 'pdf') || null
        : null;

    if (!linkedPdf?.id) {
      toast({
        title: "Linked PDF Required",
        description: "Link a PDF to this specialization in Skill Tree first.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingVisualizationsFromLinkedPdf(true);
    try {
      const localPdf = await getPdfForResource(linkedPdf.id, linkedPdf.pdfFileName || undefined);
      if (!localPdf.blob) {
        throw new Error("Linked PDF was not found in local IndexedDB. Open/upload it in the PDF viewer first.");
      }

      const extractedText = await extractPdfOutlineTextFromBlob(localPdf.blob);
      if (!extractedText.trim()) {
        throw new Error("Could not extract readable headings from the linked PDF.");
      }

      const response = await fetch('/api/ai/skill-from-pdf-index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
        },
        body: JSON.stringify({
          specializationName: coreSkill?.name || parentTask.category,
          targetMicroSkill: parentTask.name,
          targetMode: 'bci',
          extractedText,
          aiConfig: getAiConfigFromSettings(settings, isDesktopRuntime),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(result?.details || result?.error || 'Failed to generate visualizations.'));
      }

      const normalizeKey = (value: string) =>
        value
          .trim()
          .toLowerCase()
          .replace(/[^\w\s]/g, " ")
          .replace(/\s+/g, " ");
      const stripSectionPrefix = (value: string) => value.replace(/^\d+(?:\.\d+){0,6}\s+/, "").trim();

      const matchedName = String(result?.matchedMicroSkill || parentTask.name).replace(/\s+/g, " ").trim();
      const matchedKey = normalizeKey(stripSectionPrefix(matchedName));
      const parentKey = normalizeKey(stripSectionPrefix(parentTask.name));
      if (matchedKey !== parentKey) {
        throw new Error(`AI matched "${matchedName}" instead of "${parentTask.name}".`);
      }

      const toItems = (value: unknown) =>
        Array.from(
          new Set(
            (Array.isArray(value) ? value : [])
              .map((entry: unknown) => String(entry || "").replace(/\s+/g, " ").trim())
              .filter((entry: string) => entry.length >= 2)
          )
        ).slice(0, 24);

      const bci = result?.bci || {};
      const sections = [
        { key: 'boundary', name: 'Boundary', items: toItems(bci.boundary) },
        { key: 'contents', name: 'Contents', items: toItems(bci.contents) },
        { key: 'invariant', name: 'Invariant', items: toItems(bci.invariant) },
      ] as const;

      const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0);
      if (totalItems === 0) {
        throw new Error("AI returned empty Boundary/Contents/Invariant details for this curiosity.");
      }

      const linkedResources = (parentTask.linkedResourceIds || [])
        .map((id) => resources.find((resource) => resource.id === id))
        .filter((resource): resource is Resource => !!resource);

      const existingBySection = new Map<string, Resource>();
      linkedResources.forEach((resource) => {
        const key = normalizeKey(resource.name);
        if (key.includes('boundary') && !existingBySection.has('boundary')) existingBySection.set('boundary', resource);
        if (key.includes('contents') && !existingBySection.has('contents')) existingBySection.set('contents', resource);
        if (key.includes('invariant') && !existingBySection.has('invariant')) existingBySection.set('invariant', resource);
      });

      const createdResourceIds: string[] = [];
      let mutableParent = parentTask as ExerciseDefinition & { type: 'deepwork' | 'upskill' };

      sections.forEach((section) => {
        const points: ResourcePoint[] = section.items.map((text, idx) => ({
          id: `point_${Date.now()}_${section.key}_${idx}_${Math.random().toString(36).slice(2, 8)}`,
          text,
          type: 'text',
        }));
        const existing = existingBySection.get(section.key);

        if (existing) {
          setResources((prev) =>
            prev.map((resource) =>
              resource.id === existing.id
                ? {
                    ...resource,
                    name: section.name,
                    points,
                  }
                : resource
            )
          );
          return;
        }

        const updatedParent = createResourceWithHierarchy(mutableParent, undefined, 'card') as ExerciseDefinition | undefined;
        if (!updatedParent) return;
        const newResourceId = (updatedParent.linkedResourceIds || [])[updatedParent.linkedResourceIds!.length - 1];
        if (!newResourceId) return;

        createdResourceIds.push(newResourceId);
        setResources((prev) =>
          prev.map((resource) =>
            resource.id === newResourceId
              ? {
                  ...resource,
                  name: section.name,
                  points,
                }
              : resource
          )
        );

        mutableParent = { ...updatedParent, type: 'upskill' };
      });

      if (createdResourceIds.length > 0) {
        setNavigationStack((prev) =>
          prev.map((item) =>
            item.id === parentTask.id
              ? { ...item, linkedResourceIds: Array.from(new Set([...(item.linkedResourceIds || []), ...createdResourceIds])) }
              : item
          )
        );
      }

      toast({
        title: "Model Cards Generated",
        description: `Boundary, Contents, and Invariant cards are ready for "${parentTask.name}".`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unable to generate model cards from linked PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingVisualizationsFromLinkedPdf(false);
    }
  }, [
    getUpskillNodeType,
    microSkillMap,
    coreSkills,
    resources,
    createResourceWithHierarchy,
    extractPdfOutlineTextFromBlob,
    isDesktopRuntime,
    settings,
    setResources,
    toast,
  ]);

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
  
  const calculateTotalEstimate = useCallback((def: ExerciseDefinition) => {
    let total = 0;
    const visited = new Set<string>();
    
    const definitions = [...deepWorkDefinitions, ...upskillDefinitions];

    function recurse(d: ExerciseDefinition) {
        if (visited.has(d.id)) return;
        visited.add(d.id);
  
        const hasChildren = (d.linkedDeepWorkIds?.length ?? 0) > 0 || (d.linkedUpskillIds?.length ?? 0) > 0;
  
        if (hasChildren) {
            (d.linkedDeepWorkIds || []).forEach(childId => {
                const childDef = definitions.find(c => c.id === childId);
                if (childDef) recurse(childDef);
            });
            (d.linkedUpskillIds || []).forEach(childId => {
                const childDef = definitions.find(d => d.id === childId);
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
  
  const getLoggedMinutes = useCallback((definition: ExerciseDefinition, type: 'deepwork' | 'upskill'): number => {
      const leafNodes = getDescendantLeafNodes(definition.id, type);
      if (leafNodes.length > 0) {
          return leafNodes.reduce((total, node) => total + (node.loggedDuration || 0), 0);
      }
      return definition.loggedDuration || 0;
  }, [getDescendantLeafNodes]);

  const getDeepWorkLoggedMinutes = useCallback((definition: ExerciseDefinition): number => {
    return getLoggedMinutes(definition, 'deepwork');
  }, [getLoggedMinutes]);

  const getUpskillLoggedMinutesRecursive = useCallback((definition: ExerciseDefinition): number => {
      return getLoggedMinutes(definition, 'upskill');
  }, [getLoggedMinutes]);


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
        const isDeepWork = deepWorkDefinitions.some(d => d.id === editingFocusArea.id);
        const nodeType = isDeepWork ? getDeepWorkNodeType(editingFocusArea) : getUpskillNodeType(editingFocusArea);
        
        setEditedFocusAreaData({
          ...editingFocusArea,
          estHours: hours > 0 ? String(hours) : '',
          estMinutes: minutes > 0 ? String(minutes) : '',
          nodeType: editingFocusArea.nodeType || nodeType as NodeType,
        });
    }
  }, [editingFocusArea, deepWorkDefinitions, getDeepWorkNodeType, getUpskillNodeType]);
  
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
        loggedDuration: 0,
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

  const handleToggleReadyForBranding = (defId: string) => {
    setDeepWorkDefinitions(prev => prev.map(def =>
      def.id === defId ? { ...def, isReadyForBranding: !def.isReadyForBranding } : def
    ));
    toast({ title: "Status Updated", description: "Ready for Branding status has been toggled." });
  };

  const handleSaveFocusAreaEdit = () => {
    if (!editingFocusArea || !editedFocusAreaData.name?.trim()) { toast({ title: "Error", description: "Task name cannot be empty.", variant: "destructive" }); return; }
    
    const hours = parseInt(editedFocusAreaData.estHours || '0', 10);
    const minutes = parseInt(editedFocusAreaData.estMinutes || '0', 10);
    const totalMinutes = hours * 60 + minutes;

    let finalData: Partial<ExerciseDefinition> = { 
      ...editedFocusAreaData,
      estimatedDuration: totalMinutes > 0 ? totalMinutes : undefined,
      nodeType: editedFocusAreaData.nodeType,
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


  const handleOpenManageLinksModal = (parent: ExerciseDefinition) => {
    setManageLinksConfig({ parent });
    const allLinkedIds = [
      ...(parent.linkedDeepWorkIds || []),
      ...(parent.linkedUpskillIds || []),
      ...(parent.linkedResourceIds || [])
    ];
    setTempLinkedIds(allLinkedIds);
    setLinkSearchTerm(''); 
    setIsManageLinksModalOpen(true);
  };
  
  const handleSaveLinks = () => {
    if (!manageLinksConfig) return;
    const { parent } = manageLinksConfig;

    const newDeepWorkIds = tempLinkedIds.filter(id => deepWorkDefinitions.some(d => d.id === id));
    const newUpskillIds = tempLinkedIds.filter(id => upskillDefinitions.some(d => d.id === id));
    const newResourceIds = tempLinkedIds.filter(id => resources.some(r => r.id === id));

    const updatedParent = {
      ...parent,
      linkedDeepWorkIds: newDeepWorkIds,
      linkedUpskillIds: newUpskillIds,
      linkedResourceIds: newResourceIds,
    };
    
    const setParentDefinitions = upskillDefinitions.some(d => d.id === parent.id) ? setUpskillDefinitions : setDeepWorkDefinitions;
    
    setParentDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
    setNavigationStack(prev => prev.map(item => item.id === parent.id ? { ...item, ...updatedParent } : item));
    
    toast({ title: "Success", description: "Links have been updated." });
    setIsManageLinksModalOpen(false);
  };
  
  const filteredItemsForLinking = useMemo(() => {
    if (!manageLinksConfig) return [];
    
    let sourceDefs: (ExerciseDefinition | Resource)[] = [];

    if (linkTab === 'deepwork') {
      sourceDefs = deepWorkDefinitions.filter(def => {
        if (def.id === manageLinksConfig.parent.id) return false;
        const nodeType = getDeepWorkNodeType(def);
        return nodeType === 'Action' || nodeType === 'Standalone' || nodeType === 'Objective';
      });
    } else if (linkTab === 'upskill') {
      sourceDefs = upskillDefinitions.filter(def => {
        if (def.id === manageLinksConfig.parent.id) return false;
        const nodeType = getUpskillNodeType(def);
        return nodeType === 'Visualization' || nodeType === 'Standalone' || nodeType === 'Objective';
      });
    } else if (linkTab === 'resource') {
      sourceDefs = resources;
    }
    
    if (linkSearchTerm) {
      return sourceDefs.filter(item => 
        item.name && item.name.toLowerCase().includes(linkSearchTerm.toLowerCase())
      );
    }
    
    return sourceDefs;
  }, [linkTab, linkSearchTerm, manageLinksConfig, deepWorkDefinitions, upskillDefinitions, resources, getDeepWorkNodeType, getUpskillNodeType]);


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
    openGeneralPopup(res.id, null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over || active.id === over.id || !over.data.current) {
        return;
    }

    const { itemType: activeSubtaskType, subtaskId } = active.data.current || {};
    const { id: targetCardId, itemType: targetCardType } = over.data.current;

    if (!activeSubtaskType || !subtaskId || !targetCardId || !targetCardType) {
        return;
    }

    // Unlink from old parent
    const oldParentId = active.data.current?.parentId;
    if (oldParentId) {
        const isOldParentDeepWork = deepWorkDefinitions.some(d => d.id === oldParentId);
        const setOldParentDefs = isOldParentDeepWork ? setDeepWorkDefinitions : setUpskillDefinitions;

        setOldParentDefs((prev: ExerciseDefinition[]) => prev.map(def => {
            if (def.id === oldParentId) {
                return {
                    ...def,
                    linkedDeepWorkIds: (def.linkedDeepWorkIds || []).filter(id => id !== subtaskId),
                    linkedUpskillIds: (def.linkedUpskillIds || []).filter(id => id !== subtaskId),
                    linkedResourceIds: (def.linkedResourceIds || []).filter(id => id !== subtaskId),
                };
            }
            return def;
        }));
    }

    // Link to new parent
    const isNewParentDeepWork = targetCardType === 'deepwork';
    const setNewParentDefs = isNewParentDeepWork ? setDeepWorkDefinitions : setUpskillDefinitions;
    const newLinkKey = activeSubtaskType === 'deepwork' ? 'linkedDeepWorkIds' :
                       activeSubtaskType === 'upskill' ? 'linkedUpskillIds' : 'linkedResourceIds';

    setNewParentDefs((prev: ExerciseDefinition[]) => prev.map(def => {
        if (def.id === targetCardId) {
            const currentLinks = def[newLinkKey as keyof ExerciseDefinition] as string[] || [];
            if (!currentLinks.includes(subtaskId)) {
                return { ...def, [newLinkKey]: [...currentLinks, subtaskId] };
            }
        }
        return def;
    }));

    toast({ title: "Task Re-linked!", description: `Item moved to a new parent.` });
  };
  
  const currentTaskIsIntention = currentTask && getDeepWorkNodeType(currentTask) === 'Intention';

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
    const findRootParent = (startNode: ExerciseDefinition): { type: 'deepwork' | 'upskill', root: ExerciseDefinition } => {
        let current: ExerciseDefinition | undefined = startNode;
        const allDefs = new Map([...deepWorkDefinitions.map(d => [d.id, d]), ...upskillDefinitions.map(u => [u.id, u])]);
        
        let pathType: 'deepwork' | 'upskill' = upskillDefinitions.some(d => d.id === startNode.id) ? 'upskill' : 'deepwork';

        while (current) {
            let foundParent: ExerciseDefinition | undefined;
            
            const parentId = Array.from(allDefs.values()).find(parent => 
                (parent.linkedDeepWorkIds || []).includes(current!.id) || 
                (parent.linkedUpskillIds || []).includes(current!.id)
            )?.id;
            
            if (parentId) {
                foundParent = allDefs.get(parentId);
                if (foundParent) {
                    current = foundParent;
                    pathType = upskillDefinitions.some(d => d.id === current?.id) ? 'upskill' : 'deepwork';
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        
        const finalType = upskillDefinitions.some(d => d.id === (current?.id || startNode.id)) ? 'upskill' : 'deepwork';
        return { type: finalType, root: current || startNode };
    };

    const { type: rootType, root: rootNode } = findRootParent(def);
    const nodeType = rootType === 'deepwork' ? getDeepWorkNodeType(rootNode) : getUpskillNodeType(rootNode);

    setLibraryView(rootType);
    
    if (nodeType === 'Intention' || nodeType === 'Curiosity') {
        addToRecents({ ...def, type: rootType });
    }
    
    const existingIndex = navigationStack.findIndex(item => item.id === def.id);
    if (existingIndex !== -1) {
        setNavigationStack(prev => prev.slice(0, existingIndex + 1));
    } else {
        setNavigationStack(prev => [...prev, { ...def, type: rootType }]);
    }
  };

  const handleCreateResource = async () => {
    if (!currentTask) return;
    
    if (addResourceType === 'pdf') {
        pdfUploadInputRef.current?.click();
        return;
    }
  
    if (addResourceType === 'link' && !newResourceLink.trim()) {
      toast({ title: "Error", description: "Resource link is required for a link type.", variant: "destructive" });
      return;
    }
    if ((addResourceType === 'card' || addResourceType === 'habit' || addResourceType === 'mechanism' || addResourceType === 'model3d') && !newResourceName.trim()) {
      toast({ title: "Error", description: "Name is required for this resource type.", variant: "destructive" });
      return;
    }
  
    let finalResource: Resource;
  
    if (addResourceType === 'link') {
      setIsFetchingMeta(true);
      try {
        const response = await fetch('/api/get-link-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: newResourceLink.trim() }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to fetch metadata.');
  
        finalResource = {
          id: `res_${Date.now()}`,
          name: result.title || 'Untitled Resource',
          link: newResourceLink.trim(),
          description: result.description || '',
          folderId: 'temp',
          iconUrl: getFaviconUrl(newResourceLink.trim()),
          type: 'link',
          createdAt: new Date().toISOString(),
        };
      } catch (error) {
        toast({ title: "Error adding resource", description: error instanceof Error ? error.message : "Could not fetch metadata from URL.", variant: "destructive" });
        setIsFetchingMeta(false);
        return;
      } finally {
        setIsFetchingMeta(false);
      }
    } else if (addResourceType === 'model3d') {
        const file3d = modelUploadInputRef.current?.files?.[0];
        if (!file3d) {
            toast({ title: 'GLB/GLTF file is required', variant: 'destructive' });
            return;
        }
        const modelUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file3d);
        });
        finalResource = {
            id: `res_model_${Date.now()}`,
            name: newResourceName.trim() || file3d.name,
            folderId: 'temp',
            type: 'model3d',
            modelUrl,
            createdAt: new Date().toISOString(),
        };
    } else {
      finalResource = {
        id: `res_${Date.now()}`,
        name: newResourceName.trim(),
        folderId: 'temp',
        type: addResourceType,
        points: [],
        icon: 'Library',
        createdAt: new Date().toISOString(),
        mechanismFramework: addResourceType === 'mechanism' ? mechanismFramework : undefined,
      };
    }
  
    const updatedTask = createResourceWithHierarchy(currentTask, undefined, finalResource.type, finalResource);
  
    if (updatedTask) {
      const taskWithType = updatedTask as (ExerciseDefinition & { type: 'deepwork' | 'upskill' });
      setNavigationStack(prev => prev.map(item =>
          item.id === taskWithType.id ? { ...item, ...taskWithType } : item
      ));
    }
  
    setNewResourceName('');
    setNewResourceLink('');
    setIsAddResourceModalOpen(false);
    toast({ title: `Resource Added`, description: `"${finalResource.name}" has been saved and linked.` });
  };
  
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!currentTask) return;
      const file = e.target.files?.[0];
      if (!file) return;

      const finalResource: Resource = {
          id: `res_pdf_${Date.now()}`,
          name: file.name,
          folderId: 'temp',
          type: 'pdf',
          createdAt: new Date().toISOString(),
          pdfFileName: file.name,
          hasLocalPdf: true,
      };

      try {
          await storePdf(finalResource.id, file);
          const updatedTask = createResourceWithHierarchy(currentTask, undefined, 'pdf', finalResource);

          if (updatedTask) {
              const taskWithType = updatedTask as (ExerciseDefinition & { type: 'deepwork' | 'upskill' });
              setNavigationStack(prev => prev.map(item =>
                  item.id === taskWithType.id ? { ...item, ...taskWithType } : item
              ));
          }
        
          setIsAddResourceModalOpen(false);
          toast({ title: `PDF Resource Added`, description: `"${finalResource.name}" has been saved and linked.` });
      } catch (error) {
          console.error("Failed to store PDF:", error);
          toast({ title: `Error storing PDF`, description: "Could not save the PDF file to the local database.", variant: "destructive" });
      }

      e.target.value = ''; // Reset file input
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
  
  const handleProjectSelect = (project: Project | null) => {
    setSelectedProject(project);
    if (project) {
        addToRecents({ ...project, type: 'project' });
        setSelectedProjectId(project.id);
        setSelectedSkillId(null);
        onSelectMicroSkill(null);
        setNavigationStack([]);
    } else {
        setSelectedProjectId(null);
    }
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
  
  const wrapperClass = isModal 
    ? "p-4 h-full overflow-auto"
    : "container mx-auto p-4 sm:p-6 lg:p-8";

  const mainPanelHeader = isModal 
    ? ( <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4"/></Button>
        </div>
      )
    : ( <CardHeader className="flex flex-row items-center justify-between p-4">
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
    );

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setActiveId(e.active.id.toString())} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <div className={wrapperClass}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            
            <aside className="lg:col-span-1 space-y-6 lg:sticky top-20">
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
                    onSelectProject={handleProjectSelect}
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
                    {mainPanelHeader}
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
                                getDeepWorkNodeType={getDeepWorkNodeType}
                                getUpskillNodeType={getUpskillNodeType}
                                getDeepWorkLoggedMinutes={getDeepWorkLoggedMinutes}
                                getUpskillLoggedMinutesRecursive={getUpskillLoggedMinutesRecursive}
                                calculateTotalEstimate={calculateTotalEstimate}
                                formatMinutes={formatMinutes}
                                handleAddTaskToSession={scheduleTaskFromMindMap}
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
                                handleGenerateVisualizationsFromLinkedPdf={handleGenerateVisualizationsFromLinkedPdf}
                                isGeneratingVisualizationsFromLinkedPdf={isGeneratingVisualizationsFromLinkedPdf}
                                isAiEnabled={isAiEnabled}
                                setEmbedUrl={setEmbedUrl}
                                setFloatingVideoUrl={setFloatingVideoUrl}
                                handleOpenNestedPopup={handleOpenNestedPopup}
                                handleStartEditResource={handleStartEditResource}
                                setViewMode={setViewMode}
                                handleOpenLinkProjectModal={handleOpenLinkProjectModal}
                                linkProjectToTask={linkProjectToTask}
                                onEdit={setEditingFocusArea}
                                handleOpenManageLinksModal={handleOpenManageLinksModal}
                                handleCreateResource={() => setIsAddResourceModalOpen(true)}
                                activeProjectIds={activeProjectIds}
                                currentSlot={currentSlot}
                            />
                        ) : (
                           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {(selectedProject ? deepWorkDefinitions.filter(def => (def.linkedProjectIds || []).includes(selectedProject.id) && getDeepWorkNodeType(def) === 'Intention') : deepWorkDefinitions.filter(def => !allChildIds.has(def.id) && def.category === selectedMicroSkill?.name)).map(def => (
                                    <LinkedDeepWorkCard 
                                        key={def.id} 
                                        deepworkDef={def}
                                        getDeepWorkNodeType={getDeepWorkNodeType}
                                        getDeepWorkLoggedMinutes={getDeepWorkLoggedMinutes}
                                        handleAddTaskToSession={scheduleTaskFromMindMap}
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
                                        handleCreateBrainHack={() => {}}
                                        activeProjectIds={activeProjectIds}
                                        currentSlot={currentSlot}
                                    />
                                ))}
                                {(selectedProject ? upskillDefinitions.filter(def => (def.linkedProjectIds || []).includes(selectedProject!.id) && getUpskillNodeType(def) === 'Curiosity') : upskillDefinitions.filter(def => !allChildIds.has(def.id) && def.category === selectedMicroSkill?.name)).map(def => {
                                    const isComplete = permanentlyLoggedTaskIds.has(def.id);
                                    
                                    return (
                                        <LinkedUpskillCard 
                                            key={def.id} 
                                            upskillDef={def}
                                            getUpskillNodeType={getUpskillNodeType}
                                            isComplete={isComplete}
                                            getUpskillLoggedMinutesRecursive={getUpskillLoggedMinutesRecursive}
                                            calculatedEstimate={calculateTotalEstimate(def)}
                                            handleAddTaskToSession={scheduleTaskFromMindMap}
                                            handleCardClick={handleCardClick}
                                            handleDeleteSubtopic={handleDeleteFocusArea}
                                            handleUnlinkItem={handleUnlinkItem}
                                            handleViewProgress={handleViewProgress}
                                            onEdit={setEditingFocusArea}
                                            onOpenLinkProjectModal={handleOpenLinkProjectModal}
                                            onOpenMindMap={onOpenMindMap}
                                            onUpdateName={handleUpdateFocusAreaName}
                                            resources={resources}
                                            upskillDefinitions={upskillDefinitions}
                                            projectsInDomain={[]}
                                            handleCreateAndLinkChild={handleCreateAndLinkChild}
                                            handleCreateBrainHack={() => {}}
                                            activeProjectIds={activeProjectIds}
                                            currentSlot={currentSlot}
                                        />
                                    );
                                })}
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
                                {selectedMicroSkill && !selectedProject && selectedMicroSkillCuriosityCount === 0 && isAiEnabled && (
                                    <Card
                                        onClick={() => {
                                            if (!isGeneratingCuriositiesFromLinkedPdf) {
                                                void handleGenerateCuriositiesFromLinkedPdf();
                                            }
                                        }}
                                        className={cn(
                                            "rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed transition-all duration-300 min-h-[230px]",
                                            isGeneratingCuriositiesFromLinkedPdf
                                                ? "cursor-wait opacity-80 border-primary/50"
                                                : "cursor-pointer hover:border-primary hover:bg-muted/50 hover:shadow-xl hover:-translate-y-1"
                                        )}
                                    >
                                        {isGeneratingCuriositiesFromLinkedPdf ? (
                                            <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                        ) : (
                                            <BrainCircuit className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                                        )}
                                        <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors text-center">
                                            Generate Curiosities with AI
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground text-center">
                                            Micro-skill: {selectedMicroSkill.name}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground text-center">
                                            {selectedMicroSkillLinkedPdfResource
                                                ? `Use linked PDF: ${selectedMicroSkillLinkedPdfResource.name}`
                                                : "Link a PDF in Skill Tree first"}
                                        </p>
                                    </Card>
                                )}
                                {!selectedMicroSkill && !selectedProject && <div className="col-span-3 text-center py-10 text-muted-foreground">Select a micro-skill or project from the library to view its tasks.</div>}
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
                        <div className="space-y-1">
                          <Label htmlFor="edit-nodetype">Node Type</Label>
                          <Select value={editedFocusAreaData.nodeType || ''} onValueChange={(value) => setEditedFocusAreaData(d => ({...d, nodeType: value as NodeType}))}>
                            <SelectTrigger id="edit-nodetype">
                              <SelectValue placeholder="Select a type..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(editingFocusArea && deepWorkDefinitions.some(d => d.id === editingFocusArea.id) ? ['Intention', 'Objective', 'Action', 'Standalone'] : ['Curiosity', 'Objective', 'Visualization', 'Standalone']).map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                    <DialogTitle>Link Items to: {manageLinksConfig.parent.name}</DialogTitle>
                    <DialogDescription>Search for items and select them to create a link.</DialogDescription>
                  </DialogHeader>
                  <div className="flex-grow flex flex-col min-h-0">
                      <div className="flex gap-2 mb-2 p-1">
                        <div className="relative flex-grow">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Search tasks and resources..." value={linkSearchTerm} onChange={e => setLinkSearchTerm(e.target.value)} className="pl-10" />
                        </div>
                      </div>
                      <Tabs value={linkTab} onValueChange={(value) => setLinkTab(value as any)} className="flex-grow flex flex-col min-h-0">
                          <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="deepwork">Deep Work</TabsTrigger>
                              <TabsTrigger value="upskill">Upskill</TabsTrigger>
                              <TabsTrigger value="resource">Resources</TabsTrigger>
                          </TabsList>
                           <ScrollArea className="flex-grow border rounded-md p-2 mt-2">
                               {filteredItemsForLinking.length > 0 ? (
                                   (filteredItemsForLinking as any[]).map(item => {
                                       const isChecked = tempLinkedIds.includes(item.id);
                                       const itemType = item.type ? 'resource' : (deepWorkDefinitions.some(d => d.id === item.id) ? 'deepwork' : 'upskill');

                                       return (
                                           <div key={item.id} className="flex items-center space-x-2 p-1">
                                               <Checkbox
                                                 id={`cb-link-${item.id}`}
                                                 checked={isChecked}
                                                 onCheckedChange={() => setTempLinkedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                                               />
                                               <Label htmlFor={`cb-link-${item.id}`} className="font-normal w-full flex items-center gap-2 cursor-pointer">
                                                 {itemType === 'deepwork' ? <Briefcase className="h-4 w-4 text-primary" /> : itemType === 'upskill' ? <BookCopy className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-primary" />}
                                                 {item.name}
                                               </Label>
                                           </div>
                                       )
                                   })
                               ) : <p className="text-sm text-center text-muted-foreground p-4">No items found.</p>}
                           </ScrollArea>
                      </Tabs>
                      <DialogFooter className="pt-4">
                          <Button variant="outline" onClick={() => setIsManageLinksModalOpen(false)}>Cancel</Button>
                          <Button onClick={handleSaveLinks}>Save Links</Button>
                      </DialogFooter>
                  </div>
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

        <Dialog open={isAddResourceModalOpen} onOpenChange={setIsAddResourceModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Resource</DialogTitle>
                    <DialogDescription>Select the type of resource to add to "{currentTask?.name}".</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <RadioGroup value={addResourceType} onValueChange={(value) => setAddResourceType(value as any)} className="grid grid-cols-3 gap-4">
                        <div><RadioGroupItem value="link" id="r-link" className="peer sr-only" /><Label htmlFor="r-link" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><LinkIcon className="mb-3 h-6 w-6"/>Link</Label></div>
                        <div><RadioGroupItem value="card" id="r-card" className="peer sr-only" /><Label htmlFor="r-card" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Library className="mb-3 h-6 w-6"/>Card</Label></div>
                        <div><RadioGroupItem value="habit" id="r-habit" className="peer sr-only" /><Label htmlFor="r-habit" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Zap className="mb-3 h-6 w-6"/>Habit</Label></div>
                        <div><RadioGroupItem value="mechanism" id="r-mechanism" className="peer sr-only" /><Label htmlFor="r-mechanism" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Workflow className="mb-3 h-6 w-6"/>Mechanism</Label></div>
                        <div><RadioGroupItem value="model3d" id="r-model3d" className="peer sr-only" /><Label htmlFor="r-model3d" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><View className="mb-3 h-6 w-6"/>3D Model</Label></div>
                        <div><RadioGroupItem value="pdf" id="r-pdf" className="peer sr-only" /><Label htmlFor="r-pdf" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><FileIcon className="mb-3 h-6 w-6"/>PDF</Label></div>
                    </RadioGroup>
                    
                    {addResourceType === 'link' && <Input value={newResourceLink} onChange={e => setNewResourceLink(e.target.value)} placeholder="https://example.com" />}
                    {(addResourceType === 'card' || addResourceType === 'habit' || addResourceType === 'mechanism' || addResourceType === 'model3d') && <Input value={newResourceName} onChange={e => setNewResourceName(e.target.value)} placeholder="Resource Name"/>}
                    
                    {addResourceType === 'mechanism' && (
                        <RadioGroup value={mechanismFramework} onValueChange={(v) => setMechanismFramework(v as any)} className="flex items-center space-x-4">
                            <Label>Framework:</Label>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="negative" id="r-neg" /><Label htmlFor="r-neg">Negative</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="positive" id="r-pos" /><Label htmlFor="r-pos">Positive</Label></div>
                        </RadioGroup>
                    )}

                    {addResourceType === 'model3d' && (
                        <div className="space-y-2">
                            <Input type="file" ref={modelUploadInputRef} accept=".glb,.gltf" />
                        </div>
                    )}
                     {addResourceType === 'pdf' && (
                        <>
                            <Input type="file" ref={pdfUploadInputRef} onChange={handlePdfUpload} accept=".pdf" className="hidden" />
                            <Button onClick={() => pdfUploadInputRef.current?.click()} className="w-full">
                                <Upload className="mr-2 h-4 w-4"/> Upload PDF
                            </Button>
                        </>
                     )}

                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddResourceModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateResource} disabled={isFetchingMeta}>
                        {isFetchingMeta ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Add Resource
                    </Button>
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
                            handleAddTaskToSession={scheduleTaskFromMindMap}
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
                            handleCreateBrainHack={() => {}}
                            activeProjectIds={activeProjectIds}
                            currentSlot={currentSlot}
                        />
                    )}
                    {activeId.startsWith('card-upskill-') && (
                         <LinkedUpskillCard 
                            upskillDef={activeDragItem as ExerciseDefinition}
                            getUpskillNodeType={getUpskillNodeType}
                            isComplete={(activeDragItem as ExerciseDefinition).loggedDuration! > 0}
                            getUpskillLoggedMinutesRecursive={getUpskillLoggedMinutesRecursive}
                            calculatedEstimate={calculateTotalEstimate(activeDragItem as ExerciseDefinition)}
                            handleAddTaskToSession={scheduleTaskFromMindMap}
                            handleCardClick={handleCardClick}
                            handleDeleteSubtopic={handleDeleteFocusArea}
                            handleUnlinkItem={handleUnlinkItem}
                            handleViewProgress={handleViewProgress}
                            onEdit={setEditingFocusArea}
                            onOpenLinkProjectModal={handleOpenLinkProjectModal}
                            onOpenMindMap={onOpenMindMap}
                            onUpdateName={handleUpdateFocusAreaName}
                            resources={resources}
                            upskillDefinitions={upskillDefinitions}
                            projectsInDomain={[]}
                            handleCreateAndLinkChild={handleCreateAndLinkChild}
                            handleCreateBrainHack={() => {}}
                            activeProjectIds={activeProjectIds}
                            currentSlot={currentSlot}
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
    

    





















