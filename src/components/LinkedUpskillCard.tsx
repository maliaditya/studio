
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { PlusCircle, Trash2, Edit3, MoreVertical, Link as LinkIcon, Folder, Library, Globe, ExternalLink, Youtube, Share2, ArrowRight, Expand, TrendingUp, Unlink, Flashlight, Focus, Frame, Lightbulb, PictureInPicture, GripVertical, Flag, Bolt, BookCopy, Briefcase, CheckSquare, GitMerge } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ExerciseDefinition, Resource, Project, DailySchedule } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useRouter } from 'next/navigation';


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
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    } catch (e) {}
    return null;
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
             {childName.length > 25 ? `${childName.substring(0, 25)}...` : childName}
          </span>
        </div>
    );
};

export const LinkedUpskillCard = React.forwardRef<HTMLDivElement, {
  upskillDef: ExerciseDefinition;
  getUpskillNodeType: (def: ExerciseDefinition) => string;
  getUpskillLoggedMinutesRecursive: (def: ExerciseDefinition) => number;
  isComplete: boolean;
  calculatedEstimate: number;
  handleAddTaskToSession: (definitionId: string, activityType: 'upskill', slotName: string) => void;
  handleCardClick: (def: ExerciseDefinition) => void;
  handleDeleteSubtopic: (id: string) => void;
  handleUnlinkItem: (type: 'upskill' | 'resource', id: string) => void;
  handleViewProgress: (def: ExerciseDefinition) => void;
  onEdit: (def: ExerciseDefinition) => void;
  onOpenLinkProjectModal: (task: ExerciseDefinition) => void;
  onOpenMindMap: (id: string) => void;
  onUpdateName: (id: string, newName: string) => void;
  resources: Resource[];
  upskillDefinitions: ExerciseDefinition[];
  projectsInDomain: Project[];
  handleCreateAndLinkChild: (parentId: string, type: 'upskill' | 'deepwork') => void;
  activeProjectIds: Set<string>;
  currentSlot: string;
}>(({ 
  upskillDef, 
  getUpskillNodeType,
  getUpskillLoggedMinutesRecursive,
  isComplete,
  calculatedEstimate,
  handleAddTaskToSession, 
  handleCardClick,
  handleDeleteSubtopic, 
  handleUnlinkItem,
  handleViewProgress,
  onEdit, 
  onOpenLinkProjectModal,
  onOpenMindMap,
  onUpdateName,
  resources,
  upskillDefinitions,
  projectsInDomain,
  handleCreateAndLinkChild,
  activeProjectIds,
  currentSlot,
}, ref) => {
  const { permanentlyLoggedTaskIds, getDescendantLeafNodes } = useAuth();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: `card-upskill-${upskillDef.id}`,
      data: { type: 'card', itemType: 'upskill', definition: upskillDef, id: upskillDef.id }
  });
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id: `card-upskill-${upskillDef.id}`, data: { type: 'card', itemType: 'upskill', definition: upskillDef, id: upskillDef.id } });
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentName, setCurrentName] = useState(upskillDef.name);

  const setCombinedRefs = (node: HTMLDivElement | null) => {
    if (typeof ref === 'function') {
        ref(node);
    } else if (ref) {
        ref.current = node;
    }
    setDroppableNodeRef(node);
    setNodeRef(node);
  };
  
  const nodeType = getUpskillNodeType(upskillDef);
  
  const leafNodes = useMemo(() => {
    if (nodeType === 'Objective' || nodeType === 'Curiosity') {
        return getDescendantLeafNodes(upskillDef.id, 'upskill');
    }
    return [];
  }, [upskillDef.id, nodeType, getDescendantLeafNodes]);

  const completedCount = useMemo(() => {
    return leafNodes.filter(node => permanentlyLoggedTaskIds.has(node.id)).length;
  }, [leafNodes, permanentlyLoggedTaskIds]);

  const isObjectiveComplete = useMemo(() => {
    if (leafNodes.length === 0) {
        return permanentlyLoggedTaskIds.has(upskillDef.id);
    }
    return completedCount >= leafNodes.length;
  }, [leafNodes, completedCount, permanentlyLoggedTaskIds, upskillDef.id]);
  
  const parentCuriosity = useMemo(() => {
    if (nodeType !== 'Objective') return null;
    return upskillDefinitions.find(d => (d.linkedUpskillIds || []).includes(upskillDef.id));
  }, [nodeType, upskillDef.id, upskillDefinitions]);

  const isAddToSessionEnabled = useMemo(() => {
    const isActionableNode = nodeType === 'Visualization' || nodeType === 'Standalone';
    if (isActionableNode) return true;

    if (nodeType === 'Objective' && parentCuriosity) {
      return (parentCuriosity.linkedProjectIds || []).some(id => activeProjectIds.has(id));
    }

    return false;
  }, [nodeType, parentCuriosity, activeProjectIds]);
  
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
  const estDuration = calculatedEstimate;
  
  const formatMinutes = (minutes: number) => {
    if (minutes === 0) return "0m";
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h > 0 ? `${h}h` : ''} ${m > 0 ? `${m}m` : ''}`.trim();
  };

  const handleNameSave = () => {
    if (currentName.trim()) {
      onUpdateName(upskillDef.id, currentName.trim());
    } else {
      setCurrentName(upskillDef.name);
    }
    setIsEditingName(false);
  };
  
  const linkedProjects = (upskillDef.linkedProjectIds || [])
    .map(pid => projectsInDomain.find(p => p.id === pid))
    .filter((p): p is Project => !!p);
  const finalIsComplete = nodeType === 'Curiosity' || nodeType === 'Objective' ? isObjectiveComplete : isComplete;

  return (
    <div ref={setCombinedRefs} className={cn(isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg", isDragging && "opacity-50")}>
      <Card className={cn("relative group transition-all duration-300 hover:shadow-xl min-h-[230px]", finalIsComplete && "opacity-70 bg-muted/30")}>
        <div className="absolute inset-0 z-0" onMouseDown={(e) => isDragging && e.stopPropagation()}/>
         <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4" /></Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <AddToSessionPopover 
                      definition={upskillDef} 
                      onSelectSlot={(slot) => handleAddTaskToSession(upskillDef.id, 'upskill', slot)} 
                      disabled={!isAddToSessionEnabled}
                      currentSlot={currentSlot}
                    />
                  </div>
                </TooltipTrigger>
                {!isAddToSessionEnabled && (
                  <TooltipContent>
                    <p>Link parent to an active project to enable.</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); handleCardClick(upskillDef); }}><ArrowRight className="h-4 w-4" /></Button>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => onEdit(upskillDef)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenMindMap(upskillDef.id)}><GitMerge className="mr-2 h-4 w-4"/>View Mind Map</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleViewProgress(upskillDef)}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem>
            <DropdownMenuSeparator /><DropdownMenuItem onSelect={() => handleUnlinkItem('upskill', upskillDef.id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem><DropdownMenuItem onSelect={() => handleDeleteSubtopic(upskillDef.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
        <CardHeader className="pb-3" onDoubleClick={() => setIsEditingName(true)}>
            <div className="flex items-center gap-2">
                {getIcon()}
                {isEditingName ? (
                    <Input 
                        value={currentName}
                        onChange={(e) => setCurrentName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                        className="text-base font-semibold h-8 flex-grow"
                        autoFocus
                    />
                ) : (
                    <CardTitle className="text-base flex items-center gap-2 min-w-0" onClick={() => setIsEditingName(true)}>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className={cn("truncate", finalIsComplete && "line-through text-muted-foreground")} title={upskillDef.name}>
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
                 <Badge variant="outline" className="text-xs flex-shrink-0">{nodeType}</Badge>
            </div>
            {linkedProjects.length > 0 ? (
                <CardDescription className="flex flex-wrap gap-x-2 gap-y-1 text-xs mt-1">
                    <span>Projects:</span>
                    {linkedProjects.map(p => <Badge key={p.id} variant="secondary">{p.name}</Badge>)}
                </CardDescription>
            ) : (
                <CardDescription>{upskillDef.category}</CardDescription>
            )}
        </CardHeader>
        <CardContent className="min-h-[50px]">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                {(upskillDef.linkedUpskillIds || []).map(childId => {
                    const childDef = upskillDefinitions.find(d => d.id === childId);
                    if (!childDef) return null;
                    return <DraggableSubtaskItem key={childId} childId={childId} parentId={upskillDef.id} childName={childDef.name} isLogged={finalIsComplete} type="upskill" onClick={() => handleCardClick(childDef)} />;
                })}
                 {(upskillDef.linkedResourceIds || []).map(childId => {
                    const childDef = resources.find(d => d.id === childId);
                    if (!childDef) return null;
                    return <DraggableSubtaskItem key={childId} childId={childId} parentId={upskillDef.id} childName={childDef.name} isLogged={false} type="resource" onClick={() => {}} />;
                })}
            </div>
        </CardContent>
        <CardFooter className="pt-3 flex items-center justify-end">
            <div className="flex items-center gap-1 flex-shrink-0">
                {leafNodes.length > 0 && <Badge variant="default" className="flex items-center gap-1"><CheckSquare className="h-3 w-3"/>{completedCount}/{leafNodes.length}</Badge>}
                {estDuration && estDuration > 0 && <Badge variant="outline" className="flex-shrink-0">{formatMinutes(estDuration)}</Badge>}
                {loggedMinutes > 0 && <Badge variant="secondary">{formatMinutes(loggedMinutes)} logged</Badge>}
            </div>
        </CardFooter>
      </Card>
    </div>
  );
});
LinkedUpskillCard.displayName = 'LinkedUpskillCard';
