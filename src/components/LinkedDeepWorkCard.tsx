
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, CalendarIcon, TrendingUp, Loader2, Briefcase, BookCopy, MoreVertical, Link as LinkIcon, Folder, Library, Globe, ExternalLink, Youtube, Share2, ArrowRight, Expand, Filter as FilterIcon, LineChart as LineChartIcon, Unlink, GitMerge, Clock, Lightbulb, Flag, Bolt, Flashlight, Focus, GripVertical, PictureInPicture, Code, MessageSquare, BrainCircuit, Blocks, Sprout, ChevronRight as ChevronRightIcon, ChevronDown, Frame, History, ChevronLeft, CheckSquare } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, getISOWeek, isMonday, getYear, addDays, parseISO, differenceInDays } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, Resource, ResourceFolder, SkillArea, SkillDomain, CoreSkill, MicroSkill, Project, Feature, DailySchedule, Activity, BrainHack } from '@/types/workout';
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
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
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
      <span>{name.length > 25 ? `${name.substring(0, 25)}...` : name}</span>
    </div>
  );
};


export const LinkedDeepWorkCard = React.forwardRef<HTMLDivElement, {
    deepworkDef: ExerciseDefinition;
    getDeepWorkNodeType: (def: ExerciseDefinition) => string;
    getDeepWorkLoggedMinutes: (def: ExerciseDefinition) => number;
    handleAddTaskToSession: (definitionId: string, activityType: 'deepwork', slotName: string) => void;
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
    handleCreateBrainHack: (linkedTaskId: string, taskType: 'deepwork' | 'upskill') => void;
    activeProjectIds: Set<string>;
    currentSlot: string;
}>(({
    deepworkDef,
    getDeepWorkNodeType,
    getDeepWorkLoggedMinutes,
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
    handleCreateBrainHack,
    activeProjectIds,
    currentSlot,
}, ref) => {
    const { permanentlyLoggedTaskIds, getDescendantLeafNodes, settings, scheduleTaskFromMindMap } = useAuth();
    const { schedulingLevel = 3 } = settings;

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `card-deepwork-${deepworkDef.id}`,
        data: { type: 'card', itemType: 'deepwork', definition: deepworkDef, id: deepworkDef.id }
    });
    const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id: `card-deepwork-${deepworkDef.id}`, data: { type: 'card', itemType: 'deepwork', definition: deepworkDef, id: deepworkDef.id } });
    const [isEditingName, setIsEditingName] = useState(false);
    const [currentName, setCurrentName] = useState(deepworkDef.name);

    const setCombinedRefs = (node: HTMLDivElement | null) => {
        if (typeof ref === 'function') {
            ref(node);
        } else if (ref) {
            ref.current = node;
        }
        setDroppableNodeRef(node);
        setNodeRef(node);
    };
    
    const nodeType = getDeepWorkNodeType(deepworkDef);

    const leafNodes = useMemo(() => {
        if (nodeType === 'Objective' || nodeType === 'Intention') {
            return getDescendantLeafNodes(deepworkDef.id, 'deepwork');
        }
        return [];
    }, [deepworkDef.id, nodeType, getDescendantLeafNodes]);
    
    const completedCount = useMemo(() => {
        return leafNodes.filter(node => permanentlyLoggedTaskIds.has(node.id)).length;
    }, [leafNodes, permanentlyLoggedTaskIds]);

    const isObjectiveComplete = useMemo(() => {
        if (leafNodes.length === 0) {
            return permanentlyLoggedTaskIds.has(deepworkDef.id);
        }
        return completedCount >= leafNodes.length;
    }, [leafNodes, completedCount, permanentlyLoggedTaskIds, deepworkDef.id]);

    const isAddToSessionEnabled = useMemo(() => {
        const typeLevelMap = { 'Intention': 1, 'Objective': 2, 'Action': 3, 'Standalone': 3 };
        return typeLevelMap[nodeType as keyof typeof typeLevelMap] === schedulingLevel;
    }, [nodeType, schedulingLevel]);


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

    const isActionable = ['Action', 'Standalone'].includes(nodeType);
    const isComplete = isActionable ? permanentlyLoggedTaskIds.has(deepworkDef.id) : isObjectiveComplete;
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

    const linkedProjectIds = Array.from(new Set([
        ...(deepworkDef.primaryProjectId ? [deepworkDef.primaryProjectId] : []),
        ...(deepworkDef.linkedProjectIds || []),
    ]));
    const linkedProjects = linkedProjectIds
        .map(pid => projects.find(p => p.id === pid))
        .filter((p): p is Project => !!p);
    
    return (
        <div ref={setCombinedRefs} className={cn(isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg", isDragging && "opacity-50")}>
            <Card className={cn("relative flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl min-h-[230px]", isComplete && "opacity-70 bg-muted/30")}>
                 <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4" /></Button>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <Button
                                        variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"
                                        onClick={() => handleAddTaskToSession(deepworkDef.id, 'deepwork', currentSlot)}
                                        disabled={!isAddToSessionEnabled}
                                    >
                                        <PlusCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            {!isAddToSessionEnabled && (
                                <TooltipContent>
                                    <p>Can only schedule tasks at Level {schedulingLevel}.</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={() => handleCardClick(deepworkDef)}><ArrowRight className="h-4 w-4" /></Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => onOpenMindMap(deepworkDef.id)}><GitMerge className="mr-2 h-4 w-4"/>View Mind Map</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleViewProgress(deepworkDef, 'deepwork')}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleCreateBrainHack(deepworkDef.id, 'deepwork')}>
                                <BrainCircuit className="mr-2 h-4 w-4" /> Create Brain Hack
                            </DropdownMenuItem>
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
                            return <DraggableSubtaskItem key={childId} parentId={deepworkDef.id} childId={childId} childName={childDef.name} isLogged={permanentlyLoggedTaskIds.has(childId)} type="deepwork" />;
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
                         {leafNodes.length > 0 && <Badge variant="default" className="flex items-center gap-1"><CheckSquare className="h-3 w-3"/>{completedCount}/{leafNodes.length}</Badge>}
                         {loggedMinutes > 0 && <Badge variant="secondary">{formatDuration(loggedMinutes)} logged</Badge>}
                        {estDuration && estDuration > 0 && <Badge variant="outline" className="flex-shrink-0">{formatDuration(estDuration)} est.</Badge>}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
});
LinkedDeepWorkCard.displayName = 'LinkedDeepWorkCard';
