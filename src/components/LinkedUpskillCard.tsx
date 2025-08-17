
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit3, MoreVertical, Link as LinkIcon, Folder, Library, Globe, ExternalLink, Youtube, Share2, ArrowRight, Expand, TrendingUp, Unlink, Flashlight, Focus, Frame, Lightbulb, PictureInPicture, GripVertical, Flag, Bolt, BookCopy } from 'lucide-react';
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
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
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

export function LinkedUpskillCard({ upskillDef, handleAddTaskToSession, setSelectedSubtopic, setViewMode, handleUnlinkItem, handleDeleteSubtopic, handleViewProgress, isComplete, getUpskillLoggedMinutesRecursive, upskillDefinitions, resources, calculatedEstimate, setEmbedUrl, setFloatingVideoUrl, linkedUpskillChildIds, onUpdateName, projectsInDomain, onLinkProject, onEdit, onCreateAndLinkChild }: {
  upskillDef: ExerciseDefinition;
  handleAddTaskToSession: (definition: ExerciseDefinition, slot: string) => void;
  setSelectedSubtopic: (def: ExerciseDefinition | null) => void;
  setViewMode: (mode: 'session' | 'library') => void;
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
  onUpdateName: (id: string, newName: string) => void;
  projectsInDomain: Project[];
  onLinkProject: (curiosityId: string, projectId: string | null) => void;
  onEdit: (def: ExerciseDefinition) => void;
  onCreateAndLinkChild: (parentId: string, type: 'upskill' | 'deepwork') => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: upskillDef.id });
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({ id: upskillDef.id });
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentName, setCurrentName] = useState(upskillDef.name);

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

  const handleNameSave = () => {
    if (currentName.trim()) {
      onUpdateName(upskillDef.id, currentName.trim());
    } else {
      setCurrentName(upskillDef.name); // Revert if empty
    }
    setIsEditingName(false);
  };
  
  const linkedProject = upskillDef.linkedProjectId ? projectsInDomain.find(p => p.id === upskillDef.linkedProjectId) : null;
  const isActionable = nodeType === 'Visualization' || nodeType === 'Standalone';

  return (
    <div ref={setCombinedRefs} style={style} className={cn(isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg")}>
      <Card className={cn("relative group transition-all duration-300 hover:shadow-xl", isComplete && "opacity-70 bg-muted/30")}>
        <div className="absolute inset-0 z-0" onMouseDown={(e) => isDragging && e.stopPropagation()}/>
         <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button {...listeners} {...attributes} variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm cursor-grab active:cursor-grabbing"><GripVertical className="h-4 w-4" /></Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={isActionable ? 0 : -1}>
                    {isActionable ? (
                      <AddToSessionPopover definition={upskillDef} onSelectSlot={(slot) => handleAddTaskToSession(upskillDef, slot)} />
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" disabled>
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{isActionable ? 'Add to Session' : 'Add sub-tasks instead'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setSelectedSubtopic(upskillDef); setViewMode('library'); }}><ArrowRight className="h-4 w-4" /></Button>
            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => onEdit(upskillDef)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleViewProgress(upskillDef)}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem>
            <DropdownMenuSeparator /><DropdownMenuItem onSelect={() => handleUnlinkItem('upskill', upskillDef.id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem><DropdownMenuItem onSelect={() => handleDeleteSubtopic(upskillDef.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        </div>
        <CardHeader className="pb-3">
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
                    <CardTitle className="text-base flex items-center gap-2 cursor-pointer min-w-0" onClick={() => setIsEditingName(true)}>
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
                 <Badge variant="outline" className="text-xs flex-shrink-0">{nodeType}</Badge>
            </div>
            {linkedProject ? (
                <CardDescription>
                    Project: <span className="font-semibold text-foreground">{linkedProject.name}</span>
                </CardDescription>
            ) : (
                <CardDescription>{upskillDef.category}</CardDescription>
            )}
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
