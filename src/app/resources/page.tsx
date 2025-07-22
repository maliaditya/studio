

"use client";

import React, { useState, useMemo, FormEvent, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Library, Folder, Link as LinkIcon, Edit, ExternalLink, ChevronDown, Loader2, Globe, GitMerge, MoreVertical, Youtube, Expand, PictureInPicture, ArrowRight, Workflow, GripVertical, X, Code, MessageSquare, Plus, Share, Pin, PinOff, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import type { Resource, ResourceFolder, ResourcePoint } from '@/types/workout';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MindMapViewer } from '@/components/MindMapViewer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthGuard } from '@/components/AuthGuard';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DndContext, useDraggable, useDroppable, type DragEndEvent, DragOverlay, useSensor, PointerSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';


const getFaviconUrl = (link: string): string | undefined => {
  try {
      let url = link;
      if (!url.startsWith('http')) {
          url = `https://${url}`;
      }
      const urlObject = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObject.hostname}&sz=32`;
  } catch (e) {
      console.error("Invalid URL for favicon:", e);
      return undefined;
  }
};

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
        if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } catch (e) {}
    return null;
};

const isImageUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    // Check for common image file extensions
    if (/\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(url)) {
        return true;
    }
    // Check for image hosting domains that use URL parameters
    try {
        const urlObj = new URL(url);
        const imageHosts = ['images.unsplash.com', 'plus.unsplash.com', 'upload.wikimedia.org'];
        if (imageHosts.includes(urlObj.hostname)) {
            return true;
        }
    } catch (e) {
        // Invalid URL
        return false;
    }
    return false;
};
  
const isGifUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    return /\.gif$/i.test(url);
};

const isNotionUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.endsWith('notion.so');
    } catch (e) { return false; }
};

const isObsidianUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.includes('obsidian.md') || urlObj.hostname.includes('publish.obsidian.md');
    } catch (e) { return false; }
};

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
  onOpenNested: (resourceId: string, parentX: number, parentY: number, parentId: string) => void;
  onOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
  onClose: (resourceId: string) => void;
}

const ResourcePopupCard = ({ popupState, onOpenNested, onOpenNestedPopup, onClose }: ResourcePopupProps) => {
    const { resources } = useAuth();
    const { resourceId, level, x, y, width, height } = popupState;
    const resource = resources.find(r => r.id === resourceId);

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `popup-${resourceId}`,
    });

    const [currentSize, setCurrentSize] = useState({ width: width || 512, height: height || 600 });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({ x: e.clientX, y: e.clientY, width: currentSize.width, height: currentSize.height });
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isResizing) {
            const dx = e.clientX - resizeStart.x;
            const dy = e.clientY - resizeStart.y;
            
            setCurrentSize({
                width: Math.max(320, resizeStart.width + dx),
                height: 600, // Fixed height
            });
        }
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
        };
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, resizeStart]);


    const style: React.CSSProperties = {
        position: 'fixed',
        top: y,
        left: x,
        willChange: 'transform',
        width: `${currentSize.width}px`,
        height: `${currentSize.height}px`,
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }

    if (!resource) return null;

    const handleLinkClick = (e: React.MouseEvent, pointResourceId: string) => {
      e.stopPropagation();
      const targetResource = resources.find(r => r.id === pointResourceId);
      const isTargetLeaf = !(targetResource?.points || []).some(p => p.type === 'card');
      
      if (isTargetLeaf) {
        onOpenNestedPopup(pointResourceId, e);
      } else {
        onOpenNested(pointResourceId, x, y, resourceId);
      }
    };

    return (
        <div
            ref={setNodeRef} style={style} {...attributes} className="z-[60]"
        >
            <Card className="max-w-4xl shadow-2xl border-2 border-primary/50 bg-card h-full flex flex-col">
                <CardHeader className="p-3 relative cursor-grab flex-shrink-0" {...listeners}>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Library className="h-4 w-4" />
                        <span className="truncate">{resource.name}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 flex-grow min-h-0">
                    <ScrollArea className="h-full">
                        <ul className="space-y-2 text-sm text-muted-foreground pr-2">
                            {(resource.points || []).map(point => (
                                <li key={point.id} className="flex items-start gap-2">
                                    <ArrowRight className="h-4 w-4 mt-0.5 text-primary/50 flex-shrink-0" />
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
                    </ScrollArea>
                </CardContent>
                <CardFooter className="p-2 flex justify-end flex-shrink-0 relative">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onClose(resource.id); }}>
                        <X className="h-4 w-4" />
                    </Button>
                    <div
                        onMouseDown={handleResizeMouseDown}
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10"
                    />
                </CardFooter>
            </Card>
        </div>
    );
};

const SortableResourceCard = ({ children, item, className }: { children: React.ReactNode; item: Resource; className?: string }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
  
    return (
        <div ref={setNodeRef} style={style} className={className}>
          <div className="relative group/sortable h-full" onClick={(e) => { e.stopPropagation(); (item as any).onClick?.(); }}>
            <button {...attributes} {...listeners} className="absolute -top-2 -left-2 z-10 p-1 bg-muted rounded-full cursor-grab active:cursor-grabbing opacity-0 group-hover/sortable:opacity-100 transition-opacity"><GripVertical className="h-4 w-4 text-muted-foreground/50" /></button>
            {children}
          </div>
        </div>
    );
};


const SortablePoint = ({ point, resource, onUpdate, onDelete, setFloatingVideoUrl, setEmbedUrl, editingPointId, setEditingPointId, onOpenNestedPopup }: {
    point: ResourcePoint;
    resource: Resource;
    onUpdate: (resource: Resource) => void;
    onDelete: (resourceId: string) => void;
    setFloatingVideoUrl: (url: string | null) => void;
    setEmbedUrl: (url: string | null) => void;
    editingPointId: string | null;
    setEditingPointId: (id: string | null) => void;
    onOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
}) => {
    const { resources } = useAuth();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: point.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
    };

    const handleUpdatePoint = (newText: string, newType?: ResourcePoint['type']) => {
        let updatedPointData: Partial<ResourcePoint> = { text: newText };
        if (newType) {
            updatedPointData.type = newType;
        }

        if(updatedPointData.type === 'text' || newType === 'text') {
            const youtubeEmbedUrl = getYouTubeEmbedUrl(newText);
            const obsidianEmbedUrl = (isObsidianUrl(newText) || isNotionUrl(newText)) ? newText : null;
            if (youtubeEmbedUrl) {
                updatedPointData = { text: newText, type: 'youtube', url: youtubeEmbedUrl };
            } else if (obsidianEmbedUrl) {
                updatedPointData = { text: newText, type: 'obsidian', url: obsidianEmbedUrl };
            }
        }
        
        const updatedPoints = (resource.points || []).map(p => 
            p.id === point.id 
                ? { ...p, ...updatedPointData } 
                : p
        );
        onUpdate({ ...resource, points: updatedPoints });
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        if (e.target.value.trim() === '') {
            onDelete(point.id);
        }
        setEditingPointId(null);
    };

    if (point.type === 'card' && point.resourceId) {
        return (
            <div ref={setNodeRef} style={style} className="relative flex items-start gap-3 text-sm text-muted-foreground group/item">
                <button {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-4 w-4 text-muted-foreground/50" /></button>
                <div 
                    onClick={(e) => onOpenNestedPopup(point.resourceId!, e)}
                    className="flex items-start gap-3 flex-grow cursor-pointer p-2 rounded-md hover:bg-muted/50 border border-dashed"
                >
                    <Library className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" />
                    <span className="font-medium text-foreground">{point.text}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover/item:opacity-100" onClick={() => onDelete(point.id)}>
                    <Trash2 className="h-3 w-3"/>
                </Button>
            </div>
        )
    }

    return (
        <div ref={setNodeRef} style={style} className="relative flex items-start gap-3 text-sm text-muted-foreground group/item">
            <button {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-4 w-4 text-muted-foreground/50" /></button>
            <div className="flex-grow">
                {editingPointId === point.id ? (
                    <Textarea value={point.text} onChange={e => handleUpdatePoint(e.target.value)} onBlur={handleBlur} autoFocus placeholder="New step..." className={cn("text-sm", (point.type === 'code' || point.type === 'markdown') && "font-mono text-xs")} rows={(point.type === 'code' || point.type === 'markdown') ? 6 : 2}/>
                ) : point.type === 'youtube' && point.url ? (
                    <div className="w-full aspect-video rounded-md overflow-hidden border">
                        <iframe src={point.url} title={resource.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
                    </div>
                ) : point.type === 'obsidian' && point.url ? (
                    <div className="w-full aspect-[4/3] rounded-md overflow-hidden border">
                        <iframe src={point.url} title={resource.name} frameBorder="0" allowFullScreen className="w-full h-full"></iframe>
                    </div>
                ) : point.type === 'code' ? (
                    <pre onClick={() => setEditingPointId(point.id)} className="w-full cursor-pointer bg-muted/50 p-3 rounded-md text-xs font-mono text-foreground whitespace-pre-wrap break-words">{point.text || <span className="text-muted-foreground italic">New step...</span>}</pre>
                ) : point.type === 'markdown' ? (
                    <div onClick={() => setEditingPointId(point.id)} className="w-full cursor-pointer bg-muted/50 p-3 rounded-md prose dark:prose-invert prose-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text || ""}</ReactMarkdown>
                    </div>
                ) : (
                    <span onClick={() => setEditingPointId(point.id)} className="flex-grow cursor-pointer" dangerouslySetInnerHTML={{ __html: point.text.replace(/<br>/g, '') || '<span class="text-muted-foreground italic">New step...</span>' }} />
                )}
            </div>
            <div className="flex flex-col items-center flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover/item:opacity-100" onClick={() => onDelete(point.id)}>
                    <Trash2 className="h-3 w-3"/>
                </Button>
                {(point.type === 'youtube' || point.type === 'obsidian') && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground opacity-0 group-hover/item:opacity-100" onClick={() => setFloatingVideoUrl(point.text)}>
                        <PictureInPicture className="h-3 w-3"/>
                    </Button>
                )}
            </div>
        </div>
    );
};


const ResourceCard = ({ resource, onUpdate, onDelete, setFloatingVideoUrl, setEmbedUrl, onOpenNestedPopup, onOpenMarkdownModal }: { 
    resource: Resource; 
    onUpdate: (resource: Resource) => void; 
    onDelete: (resourceId: string) => void; 
    setFloatingVideoUrl: (url: string | null) => void; 
    setEmbedUrl: (url: string | null) => void; 
    onOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
    onOpenMarkdownModal: (resourceId: string) => void;
}) => {
    const { resources } = useAuth();
    const [editingTitle, setEditingTitle] = useState(false);
    const [editingPointId, setEditingPointId] = useState<string | null>(null);
    const [activePointId, setActivePointId] = useState<string | null>(null);

    const [linkCardPopoverOpen, setLinkCardPopoverOpen] = useState(false);
    const [linkedCardId, setLinkedCardId] = useState<string>('');
    const sensors = useSensors(useSensor(PointerSensor));

    const handleUpdateTitle = (newTitle: string) => {
        onUpdate({ ...resource, name: newTitle });
    };

    const handleAddPoint = (type: ResourcePoint['type']) => {
        const newPoint: ResourcePoint = { id: `point_${Date.now()}`, text: '', type };
        const updatedPoints = [...(resource.points || []), newPoint];
        onUpdate({ ...resource, points: updatedPoints });
        setEditingPointId(newPoint.id);
    };

    const handleAddCardLinkPoint = () => {
        if (!linkedCardId) return;
        const linkedCard = resources.find(r => r.id === linkedCardId);
        if (!linkedCard) return;

        const newPoint: ResourcePoint = {
            id: `point_${Date.now()}`,
            text: linkedCard.name,
            type: 'card',
            resourceId: linkedCardId
        };
        const updatedPoints = [...(resource.points || []), newPoint];
        onUpdate({ ...resource, points: updatedPoints });
        setLinkCardPopoverOpen(false);
        setLinkedCardId('');
    };

    const handleDeletePoint = (pointId: string) => {
        const updatedPoints = (resource.points || []).filter(p => p.id !== pointId);
        onUpdate({ ...resource, points: updatedPoints });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActivePointId(null);
        if (event.over && event.active.id !== event.over.id) {
          const oldIndex = (resource.points || []).findIndex(p => p.id === event.active.id);
          const newIndex = (resource.points || []).findIndex(p => p.id === event.over!.id);
          if (oldIndex > -1 && newIndex > -1) {
            const newPoints = arrayMove(resource.points || [], oldIndex, newIndex);
            onUpdate({ ...resource, points: newPoints });
          }
        }
    };
    
    const hasMarkdownContent = (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');

    return (
        <Card className="flex flex-col rounded-2xl group overflow-hidden transition-all duration-300 hover:shadow-xl">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                   <div className="flex items-center gap-2 flex-grow min-w-0">
                        {editingTitle ? (
                            <Input value={resource.name} onChange={(e) => handleUpdateTitle(e.target.value)} onBlur={() => setEditingTitle(false)} autoFocus className="text-lg font-semibold h-9" />
                        ) : (
                            <CardTitle className="flex items-center gap-3 text-lg cursor-pointer" onClick={() => setEditingTitle(true)}>
                                <span className="text-primary"><Library className="h-5 w-5" /></span>
                                <span className="truncate">{resource.name}</span>
                            </CardTitle>
                        )}
                   </div>
                   <div className="flex items-center">
                        {hasMarkdownContent && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => onOpenMarkdownModal(resource.id)}>
                                <Expand className="h-4 w-4" />
                            </Button>
                        )}
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mr-2 -mt-1">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setEditingTitle(true)}>Edit Title</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onDelete(resource.id)} className="text-destructive">Delete Card</DropdownMenuItem>
                            </DropdownMenuContent>
                       </DropdownMenu>
                   </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow min-h-0">
              <div className={cn(hasMarkdownContent ? 'h-[450px]' : '')}>
                <ScrollArea className="h-full">
                    <DndContext 
                        sensors={sensors}
                        onDragStart={e => setActivePointId(e.active.id as string)}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={(resource.points || []).map(p => p.id)}>
                            <ul className="space-y-3 pr-3">
                                {(resource.points || []).map((point) => (
                                    <SortablePoint 
                                        key={point.id} 
                                        point={point} 
                                        resource={resource}
                                        onUpdate={onUpdate}
                                        onDelete={handleDeletePoint}
                                        setEmbedUrl={setEmbedUrl}
                                        setFloatingVideoUrl={setFloatingVideoUrl}
                                        editingPointId={editingPointId}
                                        setEditingPointId={setEditingPointId}
                                        onOpenNestedPopup={onOpenNestedPopup}
                                    />
                                ))}
                            </ul>
                        </SortableContext>
                        <DragOverlay>
                            {activePointId ? (
                                <div className="bg-card p-2 rounded-md shadow-lg opacity-80 flex items-start gap-3">
                                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                                    {resource.points?.find(p => p.id === activePointId)?.text}
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </ScrollArea>
              </div>
            </CardContent>
            <CardContent className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                 <div className="flex gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                                <Plus className="mr-2 h-4 w-4" /> Add Step
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1">
                           <div className="space-y-1">
                                <Button variant="ghost" className="w-full justify-start" onClick={() => handleAddPoint('text')}><MessageSquare className="mr-2 h-4 w-4" />Text</Button>
                                <Button variant="ghost" className="w-full justify-start" onClick={() => handleAddPoint('markdown')}><MessageSquare className="mr-2 h-4 w-4" />Markdown</Button>
                                <Button variant="ghost" className="w-full justify-start" onClick={() => handleAddPoint('code')}><Code className="mr-2 h-4 w-4" />Code</Button>
                           </div>
                        </PopoverContent>
                    </Popover>
                    <Popover open={linkCardPopoverOpen} onOpenChange={setLinkCardPopoverOpen}>
                        <PopoverTrigger asChild>
                             <Button variant="outline" size="sm" className="w-full">
                                <LinkIcon className="mr-2 h-4 w-4" /> Link Card
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                           <div className="grid gap-4">
                               <div className="space-y-2">
                                   <h4 className="font-medium leading-none">Link Card</h4>
                                   <p className="text-sm text-muted-foreground">Select an existing card to link as a step.</p>
                               </div>
                                <div className="space-y-2">
                                    <Select value={linkedCardId} onValueChange={setLinkedCardId}>
                                        <SelectTrigger><SelectValue placeholder="Select a card..."/></SelectTrigger>
                                        <SelectContent>
                                            {resources.filter(r => r.type === 'card' && r.id !== resource.id).map(r => (
                                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleAddCardLinkPoint} disabled={!linkedCardId} className="w-full">Link Card</Button>
                                </div>
                           </div>
                        </PopoverContent>
                    </Popover>
                 </div>
            </CardContent>
        </Card>
    );
};


function ResourcesPageContent() {
  const { 
    currentUser,
    resources, setResources, 
    resourceFolders, setResourceFolders,
    setFloatingVideoUrl,
    pinnedFolderIds,
    setPinnedFolderIds,
    activeResourceTabIds,
    setActiveResourceTabIds,
    selectedResourceFolderId,
    setSelectedResourceFolderId,
  } = useAuth();
  const { toast } = useToast();
  
  const [newFolderName, setNewFolderName] = useState('');
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceLink, setNewResourceLink] = useState('');

  const [editingFolder, setEditingFolder] = useState<ResourceFolder | null>(null);
  const [newlyCreatedFolderId, setNewlyCreatedFolderId] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editedResourceData, setEditedResourceData] = useState<Partial<Resource>>({});
  
  const [youtubeModalState, setYoutubeModalState] = useState<{
    isOpen: boolean;
    playlist: Resource[];
    currentIndex: number;
  }>({ isOpen: false, playlist: [], currentIndex: 0 });

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    item: ResourceFolder;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ item: ResourceFolder } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  
  const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
  const [mindMapRootFolderId, setMindMapRootFolderId] = useState<string | null>(null);
  
  const [addResourceType, setAddResourceType] = useState<'link' | 'card'>('link');

  const [openPopups, setOpenPopups] = useState<Map<string, PopupState>>(new Map());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const [markdownModalState, setMarkdownModalState] = useState<{
    isOpen: boolean;
    playlist: Resource[];
    currentIndex: number;
  }>({ isOpen: false, playlist: [], currentIndex: 0 });
  
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const handleNextVideo = useCallback(() => {
    setYoutubeModalState(prev => {
      if (!prev.isOpen) return prev;
      const nextIndex = (prev.currentIndex + 1) % prev.playlist.length;
      return { ...prev, currentIndex: nextIndex };
    });
  }, []);

  const handlePrevVideo = useCallback(() => {
    setYoutubeModalState(prev => {
      if (!prev.isOpen) return prev;
      const prevIndex = (prev.currentIndex - 1 + prev.playlist.length) % prev.playlist.length;
      return { ...prev, currentIndex: prevIndex };
    });
  }, []);
  
  const handleNextMarkdown = useCallback(() => {
    setMarkdownModalState(prev => {
      if (!prev.isOpen) return prev;
      const nextIndex = (prev.currentIndex + 1) % prev.playlist.length;
      return { ...prev, currentIndex: nextIndex };
    });
  }, []);

  const handlePrevMarkdown = useCallback(() => {
    setMarkdownModalState(prev => {
      if (!prev.isOpen) return prev;
      const prevIndex = (prev.currentIndex - 1 + prev.playlist.length) % prev.playlist.length;
      return { ...prev, currentIndex: prevIndex };
    });
  }, []);

  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      if (youtubeModalState.isOpen) {
        if (scrollTimeoutRef.current) return;
        if (e.deltaY > 5) handleNextVideo();
        else if (e.deltaY < -5) handlePrevVideo();
        scrollTimeoutRef.current = setTimeout(() => {
          scrollTimeoutRef.current = null;
        }, 300);
      } else if (markdownModalState.isOpen) {
        if (scrollTimeoutRef.current) return;
        if (e.deltaY > 5) handleNextMarkdown();
        else if (e.deltaY < -5) handlePrevMarkdown();
        scrollTimeoutRef.current = setTimeout(() => {
          scrollTimeoutRef.current = null;
        }, 300);
      }
    };

    window.addEventListener('wheel', handleGlobalWheel);
    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [youtubeModalState.isOpen, markdownModalState.isOpen, handleNextVideo, handlePrevVideo, handleNextMarkdown, handlePrevMarkdown]);

  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY === 0) return;
    e.preventDefault();
    if (tabsContainerRef.current) {
        tabsContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const expandedFoldersKey = useMemo(() => currentUser ? `resource_expanded_folders_${currentUser.username}` : null, [currentUser]);

  useEffect(() => {
    if (expandedFoldersKey) {
        try {
            const storedExpanded = localStorage.getItem(expandedFoldersKey);
            const expandedIds = storedExpanded ? JSON.parse(storedExpanded) : [];
            const allFolderIds = new Set(resourceFolders.map(f => f.id));
            const initialCollapsed = new Set<string>();
            allFolderIds.forEach(id => {
                if (!expandedIds.includes(id)) {
                    initialCollapsed.add(id);
                }
            });
            setCollapsedFolders(initialCollapsed);
        } catch (e) {
            console.error("Failed to parse collapsed folders state from localStorage", e);
            setCollapsedFolders(new Set(resourceFolders.map(f => f.id)));
        }
    } else {
        setCollapsedFolders(new Set(resourceFolders.map(f => f.id)));
    }
  }, [expandedFoldersKey, resourceFolders]);
  
  const handleSelectFolder = (folderId: string) => {
    setSelectedResourceFolderId(folderId);
    if (!activeResourceTabIds.includes(folderId)) {
        setActiveResourceTabIds(prev => [...prev, folderId]);
    }
  };

  const handleCloseTab = (folderIdToClose: string) => {
    let newSelectedFolderId = selectedResourceFolderId;
    const tabIndex = activeResourceTabIds.findIndex(id => id === folderIdToClose);

    if (selectedResourceFolderId === folderIdToClose) {
        if (activeResourceTabIds.length === 1) {
            newSelectedFolderId = null;
        } else if (tabIndex > 0) {
            newSelectedFolderId = activeResourceTabIds[tabIndex - 1];
        } else {
            newSelectedFolderId = activeResourceTabIds[1];
        }
    }
    
    setActiveResourceTabIds(prev => prev.filter(id => id !== folderIdToClose));
    setSelectedResourceFolderId(newSelectedFolderId);
  };
  
  const togglePinFolder = (folderId: string) => {
    setPinnedFolderIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) {
            newSet.delete(folderId);
            toast({ title: "Folder unpinned" });
        } else {
            newSet.add(folderId);
            toast({ title: "Folder pinned" });
        }
        return newSet;
    });
  };

  const toggleFolderCollapse = useCallback((folderId: string) => {
    setCollapsedFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) {
            newSet.delete(folderId);
        } else {
            newSet.add(folderId);
        }

        if (expandedFoldersKey) {
            const allFolderIds = resourceFolders.map(f => f.id);
            const expandedIds = allFolderIds.filter(id => !newSet.has(id));
            localStorage.setItem(expandedFoldersKey, JSON.stringify(expandedIds));
        }
        return newSet;
    });
  }, [expandedFoldersKey, resourceFolders]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            setOpenPopups(new Map());
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (editingResource) {
        setEditedResourceData(editingResource);
    }
  }, [editingResource]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
            setContextMenu(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenuRef]);

  const filteredResources = useMemo(() => {
    if (!selectedResourceFolderId) return [];
    return resources.filter(r => r.folderId === selectedResourceFolderId);
  }, [resources, selectedResourceFolderId]);
  
  const handleAddFolder = (e: FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
        toast({ title: "Error", description: "Folder name cannot be empty.", variant: "destructive" });
        return;
    }
    const newFolder: ResourceFolder = {
        id: `cat_${Date.now()}`,
        name: newFolderName.trim(),
        parentId: null,
        icon: 'Folder',
    };
    setResourceFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
  };

  const handleDeleteFolder = (folderId: string) => {
    let idsToDelete = [folderId];
    let queue = [folderId];

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = resourceFolders.filter(f => f.parentId === currentId);
        for (const child of children) {
            idsToDelete.push(child.id);
            queue.push(child.id);
        }
    }
    
    setResourceFolders(prev => prev.filter(f => !idsToDelete.includes(f.id)));
    setResources(prev => prev.filter(r => !idsToDelete.includes(r.folderId)));
    setActiveResourceTabIds(prev => prev.filter(id => !idsToDelete.includes(id)));
    
    if (selectedResourceFolderId && idsToDelete.includes(selectedResourceFolderId)) {
        setSelectedResourceFolderId(null);
    }
    toast({ title: "Folder Deleted", description: "The folder and all its contents have been removed." });
  };
  
  const commitFolderEdit = () => {
    if (!editingFolder) return;
    if (!editingFolder.name.trim()) {
        toast({ title: "Rename Cancelled", description: "Folder name cannot be empty.", variant: "destructive" });
        cancelFolderEdit();
        return;
    }
    setResourceFolders(prev => prev.map(f => f.id === editingFolder.id ? editingFolder : f));
    setEditingFolder(null);
  };
  
  const handleAddNewNestedFolder = (parentFolder: ResourceFolder) => {
    const newFolder: ResourceFolder = {
      id: `folder_${Date.now()}`,
      name: "New Folder",
      parentId: parentFolder.id,
    };
    setResourceFolders(prev => [...prev, newFolder]);
    setEditingFolder(newFolder);
    setNewlyCreatedFolderId(newFolder.id);

    // Ensure parent is expanded
    setCollapsedFolders(prev => {
      const newSet = new Set(prev);
      newSet.delete(parentFolder.id);
      return newSet;
    });
  };

  const cancelFolderEdit = () => {
    if (!editingFolder) return;
    if (editingFolder.id === newlyCreatedFolderId) {
      setResourceFolders(prev => prev.filter(f => f.id !== editingFolder.id));
    }
    setEditingFolder(null);
    setNewlyCreatedFolderId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, item: ResourceFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
        mouseX: e.clientX,
        mouseY: e.clientY,
        item,
    });
  };
  
  const handleAddResource = async () => {
    if (!selectedResourceFolderId) {
      toast({ title: "Error", description: "Please select a folder first.", variant: "destructive" });
      return;
    }
    if (addResourceType === 'link' && !newResourceLink.trim()) {
      toast({ title: "Error", description: "Resource link is required for a link type.", variant: "destructive" });
      return;
    }
    if (addResourceType === 'card' && !newResourceName.trim()) {
      toast({ title: "Error", description: "Name is required for a card type.", variant: "destructive" });
      return;
    }

    if (addResourceType === 'card') {
        const newRes: Resource = {
            id: `res_${Date.now()}`,
            name: newResourceName.trim(),
            folderId: selectedResourceFolderId,
            type: 'card',
            points: [],
            icon: 'Library'
        };
        setResources(prev => [...prev, newRes]);
        setNewResourceName('');
        setIsAdding(false);
        toast({ title: "Resource Card Added", description: `"${newRes.name}" has been saved.`});
        return;
    }

    // Handle 'link' type
    let fullLink = newResourceLink.trim();
    if (!fullLink.startsWith('http://') && !fullLink.startsWith('https://')) {
        fullLink = 'https://' + fullLink;
    }

    setIsFetchingMeta(true);
    try {
      const response = await fetch('/api/get-link-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fullLink }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch metadata.');
      }

      const newRes: Resource = {
          id: `res_${Date.now()}`,
          name: result.title || 'Untitled Resource',
          link: fullLink,
          description: result.description || '',
          folderId: selectedResourceFolderId,
          iconUrl: getFaviconUrl(fullLink),
          type: 'link'
      };
      setResources(prev => [...prev, newRes]);
      setNewResourceLink('');
      setIsAdding(false);
      toast({ title: "Resource Added", description: `"${newRes.name}" has been saved.`});
    } catch (error) {
        toast({
            title: "Error adding resource",
            description: error instanceof Error ? error.message : "Could not fetch metadata from URL.",
            variant: "destructive",
        });
    } finally {
        setIsFetchingMeta(false);
    }
  };
  
  const handleDeleteResource = (resourceId: string) => {
      setResources(prev => prev.filter(r => r.id !== resourceId));
  };
  
  const handleResourceFolderChange = (value: string) => {
      setEditedResourceData(prev => ({...prev, folderId: value}));
  };

  const handleUpdateResource = (updatedResource: Resource) => {
    setResources(prev =>
      prev.map(res => res.id === updatedResource.id ? updatedResource : res)
    );
  };

  const handleSaveResourceEdit = () => {
    if (!editingResource || !editedResourceData.name?.trim() || !editedResourceData.folderId) {
        toast({ title: "Error", description: "Name and folder are required.", variant: "destructive"});
        return;
    }
    
    let finalData = { ...editedResourceData };
    if (finalData.type === 'link' && finalData.link && finalData.link !== editingResource?.link) {
        finalData.iconUrl = getFaviconUrl(finalData.link);
    }
    onUpdateResource(finalData as Resource);
    setEditingResource(null);
    toast({ title: "Resource Updated", description: `"${editedResourceData.name}" has been updated.` });
  };

  const onUpdateResource = (updatedResource: Resource) => {
    setResources(prev => prev.map(res => res.id === updatedResource.id ? updatedResource : res));
  };

  const getChildFoldersRecursive = (folderId: string): ResourceFolder[] => {
    let children: ResourceFolder[] = [];
    const directChildren = resourceFolders.filter(f => f.parentId === folderId);
    children.push(...directChildren);
    directChildren.forEach(child => {
        children.push(...getChildFoldersRecursive(child.id));
    });
    return children;
  };
  
  const handleShareFolder = async (folder: ResourceFolder) => {
    if (!currentUser?.username) {
        toast({ title: 'Error', description: 'You must be logged in to share.', variant: 'destructive' });
        return;
    }
    toast({ title: 'Sharing Folder...', description: 'Please wait while we generate a public link.' });

    const childFolders = getChildFoldersRecursive(folder.id);
    const allFolderIds = [folder.id, ...childFolders.map(f => f.id)];
    const resourcesToShare = resources.filter(r => allFolderIds.includes(r.folderId));

    try {
        const response = await fetch('/api/share/folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder, resources: resourcesToShare, childFolders, username: currentUser.username }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to share folder.');
        }

        const fullUrl = `${window.location.origin}${result.publicUrl}`;
        setShareUrl(fullUrl);
        setShareDialogOpen(true);

    } catch (error) {
        toast({
            title: "Sharing Failed",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
            variant: "destructive",
        });
    }
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

  const renderSidebarFolders = useCallback((parentId: string | null, level: number) => {
    const foldersToRender = resourceFolders
        .filter(f => f.parentId === parentId)
        .sort((a, b) => {
            const aIsPinned = pinnedFolderIds.has(a.id);
            const bIsPinned = pinnedFolderIds.has(b.id);
            if (aIsPinned && !bIsPinned) return -1;
            if (!aIsPinned && bIsPinned) return 1;
            return a.name.localeCompare(b.name);
        });

    if (foldersToRender.length === 0 && level > 0) return null;

    return (
      <ul className={cn("space-y-1", level > 0 && "pl-4")}>
        {foldersToRender.map(folder => (
            <li key={folder.id}>
                 {editingFolder?.id === folder.id ? (
                    <div className="flex items-center gap-2 p-1 w-full">
                        <Folder className="h-4 w-4 flex-shrink-0"/>
                        <Input
                            value={editingFolder.name}
                            onChange={e => setEditingFolder({...editingFolder, name: e.target.value})}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { commitFolderEdit(); e.preventDefault(); } 
                                else if (e.key === 'Escape') { cancelFolderEdit(); }
                            }}
                            onBlur={commitFolderEdit}
                            className="h-7 border-primary ring-primary"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                        />
                    </div>
                ) : (
                    <div 
                        onClick={() => { handleSelectFolder(folder.id); toggleFolderCollapse(folder.id); }}
                        onDoubleClick={() => setEditingFolder(folder)}
                        onContextMenu={(e) => handleContextMenu(e, folder)}
                        className={cn("flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer group", selectedResourceFolderId === folder.id && "bg-accent font-semibold")}
                    >
                        {pinnedFolderIds.has(folder.id) && <Pin className="h-3 w-3 text-primary flex-shrink-0" />}
                        <ChevronDown className={cn("h-4 w-4 transition-transform", collapsedFolders.has(folder.id) && "-rotate-90", resourceFolders.every(f => f.parentId !== folder.id) && "invisible")} />
                        <Folder className="h-4 w-4"/>
                        <span className='flex-grow truncate'>{folder.name}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation();
                                setMindMapRootFolderId(folder.id);
                                setIsMindMapModalOpen(true);
                            }}
                        >
                            <GitMerge className="h-4 w-4" />
                            <span className="sr-only">View Mind Map for {folder.name}</span>
                        </Button>
                    </div>
                )}
                {!collapsedFolders.has(folder.id) && renderSidebarFolders(folder.id, level + 1)}
            </li>
        ))}
      </ul>
    );
  }, [resourceFolders, editingFolder, selectedResourceFolderId, collapsedFolders, toggleFolderCollapse, commitFolderEdit, cancelFolderEdit, handleContextMenu, pinnedFolderIds]);

  const handleOpenNestedPopup = (resourceId: string, event: React.MouseEvent) => {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    const hasMarkdown = (resource.points || []).some(p => p.type === 'markdown');
    const popupWidth = hasMarkdown ? 896 : 512;
    const popupHeight = 600;

    let x, y;
    if (hasMarkdown) {
        x = (window.innerWidth - popupWidth) / 2;
        y = (window.innerHeight - popupHeight) / 2;
    } else {
        x = event.clientX;
        y = event.clientY;
    }

    setOpenPopups(prev => {
        const newPopups = new Map(prev);
        newPopups.set(resourceId, {
            resourceId,
            level: 0,
            x: x,
            y: y,
            parentId: undefined,
            width: popupWidth,
            height: popupHeight
        });
        return newPopups;
    });
  };

  const handleOpenNested = (resourceId: string, parentX: number, parentY: number, parentId: string) => {
    const level = (openPopups.get(parentId)?.level ?? -1) + 1;
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    const hasMarkdown = (resource.points || []).some(p => p.type === 'markdown');
    const popupWidth = hasMarkdown ? 896 : 512;
    const popupHeight = 600;

    setOpenPopups(prev => {
        const newPopups = new Map(prev);
        // Close any popups at the same or higher level
        prev.forEach((popup) => {
            if (popup.level >= level) {
                newPopups.delete(popup.resourceId);
            }
        });
        // Add new popup, positioned relative to its parent
        newPopups.set(resourceId, {
            resourceId,
            level,
            x: parentX + 40,
            y: parentY + 40,
            parentId: parentId,
            width: popupWidth,
            height: popupHeight,
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
          if (popup.parentId === parentId) {
            findChildren(id);
          }
        }
      }
  
      findChildren(resourceId);
  
      for (const id of popupsToDelete) {
        newPopups.delete(id);
      }
  
      return newPopups;
    });
  };


  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEndMain = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    const activeId = active.id as string;

    if (activeId.startsWith('popup-')) {
        const resourceId = activeId.replace('popup-', '');
        setOpenPopups(prev => {
            const newPopups = new Map(prev);
            const popup = newPopups.get(resourceId);
            if (popup) {
                newPopups.set(resourceId, {
                    ...popup,
                    x: popup.x + delta.x,
                    y: popup.y + delta.y,
                });
            }
            return newPopups;
        });
        setActiveDragId(null);
        return;
    }

    if (activeId && over && activeId !== over.id) {
        setResources(items => {
            const oldIndex = items.findIndex(item => item.id === active.id);
            const newIndex = items.findIndex(item => item.id === over.id);
            return arrayMove(items, oldIndex, newIndex);
        });
    }
    setActiveId(null);
  };
  
  const handleOpenMarkdownModal = (resourceId: string) => {
    const markdownResources = filteredResources.filter(r => r.type === 'card' && r.points?.some(p => p.type === 'markdown' || p.type === 'code'));
    const currentIndex = markdownResources.findIndex(r => r.id === resourceId);
    if (currentIndex !== -1) {
        setMarkdownModalState({
            isOpen: true,
            playlist: markdownResources,
            currentIndex,
        });
    }
  };

  const currentMarkdownResource = markdownModalState.playlist[markdownModalState.currentIndex];
  const fullMarkdownContent = currentMarkdownResource
    ? (currentMarkdownResource.points || [])
        .filter(p => p.type === 'markdown' || p.type === 'code')
        .map(p => (p.type === 'code' ? `\`\`\`\n${p.text}\n\`\`\`` : p.text))
        .join('\n\n---\n\n')
    : null;


  return (
    <>
    <DndContext 
        sensors={sensors}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEndMain}
    >
        <div className="container mx-auto p-4 sm:p-6 lg:p-8" onClick={() => contextMenu && setContextMenu(null)}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Left Sidebar */}
            <aside className="md:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Folders</CardTitle>
                </div>
                </CardHeader>
                <CardContent>
                <form onSubmit={handleAddFolder} className="flex gap-2 mb-4">
                    <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="New Root Folder" />
                    <Button size="icon" type="submit"><PlusCircle className="h-4 w-4" /></Button>
                </form>
                {renderSidebarFolders(null, 0)}
                </CardContent>
            </Card>
            </aside>

            {/* Main Content */}
            <main className="md:col-span-3">
                 <div
                    ref={tabsContainerRef}
                    onWheel={handleWheelScroll}
                    className="flex items-center border-b mb-4 overflow-x-auto"
                >
                    {activeResourceTabIds.map(tabId => {
                        const folder = resourceFolders.find(f => f.id === tabId);
                        if (!folder) return null;
                        return (
                            <button
                                key={tabId}
                                onClick={() => setSelectedResourceFolderId(tabId)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2",
                                    selectedResourceFolderId === tabId 
                                        ? "border-primary text-primary" 
                                        : "border-transparent text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Folder className="h-4 w-4" />
                                <span className="whitespace-nowrap">{folder.name}</span>
                                <X className="h-4 w-4 ml-2 hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleCloseTab(tabId); }} />
                            </button>
                        );
                    })}
                </div>
                <div>
                <h2 className="text-2xl font-bold mb-4">
                    {selectedResourceFolderId
                    ? resourceFolders.find(f => f.id === selectedResourceFolderId)?.name
                    : 'Select a folder to view resources'}
                </h2>
                
                <SortableContext items={filteredResources.map(r => r.id)}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredResources.map(res => {
                            const isCardType = res.type === 'card';
                            const hasMarkdownContent = isCardType && (res.points || []).some(p => p.type === 'markdown' || p.type === 'code');
                            const cardClassName = hasMarkdownContent ? "lg:col-span-3" : "";

                            return (
                                <SortableResourceCard key={res.id} item={res} className={cardClassName}>
                                    {isCardType ? (
                                        <ResourceCard resource={res} onUpdate={handleUpdateResource} onDelete={handleDeleteResource} setFloatingVideoUrl={setFloatingVideoUrl} setEmbedUrl={(url) => {}} onOpenNestedPopup={handleOpenNestedPopup} onOpenMarkdownModal={handleOpenMarkdownModal} />
                                    ) : (
                                    (() => {
                                        const youtubeEmbedUrl = getYouTubeEmbedUrl(res.link);
                                        const imageEmbedUrl = isImageUrl(res.link) || isGifUrl(res.link) ? res.link : null;
                                        const isSpecialEmbed = isNotionUrl(res.link) || isObsidianUrl(res.link);
                                        const isLongContent = res.name.length > 20 && (res.description?.length ?? 0) > 30;

                                        return (
                                            <Card className={cn(
                                                "relative group rounded-3xl flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 h-full",
                                                isLongContent ? "bg-gradient-to-br from-card to-muted/20" : "bg-card"
                                            )}>
                                                {imageEmbedUrl ? (
                                                  <>
                                                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover/sortable:opacity-100 transition-opacity">
                                                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}><DropdownMenuItem onSelect={() => setEditingResource(res)}><Edit className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem><DropdownMenuItem onSelect={() => handleDeleteResource(res.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                                      </div>
                                                      <div className="aspect-video w-full bg-black overflow-hidden rounded-t-3xl relative">
                                                          <Image src={imageEmbedUrl} alt={res.name} layout="fill" objectFit="contain" data-ai-hint="illustration" />
                                                      </div>
                                                      <div className="p-4 flex-grow"><p className="text-base font-bold truncate" title={res.name}>{res.name}</p></div>
                                                  </>
                                                ) : youtubeEmbedUrl && res.link ? (
                                                    <div className="h-full flex flex-col">
                                                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover/sortable:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={() => setFloatingVideoUrl(res.link!)}><PictureInPicture className="h-4 w-4" /></Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={(e) => {
                                                                e.stopPropagation();
                                                                const youtubeVideos = filteredResources.filter(r => getYouTubeEmbedUrl(r.link));
                                                                const currentIndex = youtubeVideos.findIndex(v => v.id === res.id);
                                                                setYoutubeModalState({ isOpen: true, playlist: youtubeVideos, currentIndex });
                                                            }} aria-label="View in App"><Expand className="h-4 w-4" /></Button>
                                                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}><DropdownMenuItem onSelect={() => setEditingResource(res)}><Edit className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem><DropdownMenuItem onSelect={() => handleDeleteResource(res.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                                        </div>
                                                        <div className="aspect-video w-full bg-black overflow-hidden rounded-t-3xl relative">
                                                          <iframe id={`video-${res.id}`} width="100%" height="100%" src={youtubeEmbedUrl} title={res.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                                                        </div>
                                                        <div className="p-4 flex-grow"><div className="flex items-start justify-between gap-2"><div className="flex-grow min-w-0"><div className="flex items-center gap-2"><Youtube className="h-5 w-5 flex-shrink-0 text-red-500" /><p className="text-base font-bold truncate" title={res.name}>{res.name}</p></div></div></div></div>
                                                    </div>
                                                ) : isObsidianUrl(res.link) && res.link ? (
                                                    <div className="flex flex-col h-full">
                                                        <div className="p-3 border-b flex items-start justify-between">
                                                            <div className="flex-grow min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    {res.iconUrl ? <Image src={res.iconUrl} alt="" width={16} height={16} className="rounded-sm flex-shrink-0" unoptimized/> : <Globe className="h-4 w-4 flex-shrink-0" />}
                                                                    <p className="text-sm font-bold truncate" title={res.name}>{res.name}</p>
                                                                </div>
                                                            </div>
                                                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 -mr-2 -mt-1"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setEditingResource(res)}><Edit className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem><DropdownMenuItem onSelect={() => handleDeleteResource(res.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                                        </div>
                                                        <div className="flex-grow min-h-0 aspect-[4/3]">
                                                            <iframe src={res.link} title={res.name} frameBorder="0" className="w-full h-full" />
                                                        </div>
                                                        <div className="p-2 border-t flex items-center gap-2">
                                                            <Button asChild variant="secondary" size="sm" className="w-full"><a href={res.link} target="_blank" rel="noopener noreferrer">Visit Site <ExternalLink className="ml-2 h-3 w-3" /></a></Button>
                                                            <Button variant="outline" size="sm" className="w-full" onClick={() => setFloatingVideoUrl(res.link!)}><PictureInPicture className="mr-2 h-3 w-3" /> View in App</Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-5 flex flex-col flex-grow">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-grow min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    {res.iconUrl ? <Image src={res.iconUrl} alt={`${res.name} favicon`} width={16} height={16} className="rounded-sm flex-shrink-0" unoptimized/> : <LinkIcon className="h-4 w-4 flex-shrink-0" />}
                                                                    <p className="text-base font-bold truncate" title={res.name}>{res.name}</p>
                                                                </div>
                                                            </div>
                                                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 -mr-2 -mt-1"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setEditingResource(res)}><Edit className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem><DropdownMenuItem onSelect={() => handleDeleteResource(res.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                                        </div>
                                                        <a href={res.link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground truncate block hover:underline mt-1">{res.link}</a>
                                                        <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-grow min-h-[60px]">{res.description || 'No description available.'}</p>
                                                        <div className="mt-auto pt-4 flex items-center gap-2">
                                                            <Button asChild variant="secondary" size="sm" className="w-full"><a href={res.link} target="_blank" rel="noopener noreferrer">Visit Site <ExternalLink className="ml-2 h-3 w-3" /></a></Button>
                                                            {res.link && (
                                                                <Button variant="outline" size="sm" className="w-full" onClick={() => setFloatingVideoUrl(res.link!)}><PictureInPicture className="mr-2 h-3 w-3" /> View in App</Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </Card>
                                        );
                                    })()
                                    )}
                                </SortableResourceCard>
                            )
                        })}
                        {selectedResourceFolderId && (
                            <Card 
                                onClick={() => setIsAdding(true)}
                                className="rounded-3xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[220px] hover:shadow-xl hover:-translate-y-1"
                            >
                                <PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                                <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add New Resource</p>
                            </Card>
                            )}
                    </div>
                </SortableContext>
                <DragOverlay>
                    {activeId ? (
                        <Card className="shadow-2xl">
                            <CardContent className="p-4">Moving resource...</CardContent>
                        </Card>
                    ) : null}
                </DragOverlay>
                </div>
            </main>
        </div>
        </div>

        {Array.from(openPopups.values()).map((popupState) => (
            <ResourcePopupCard
                key={popupState.resourceId}
                popupState={popupState}
                onOpenNested={handleOpenNested}
                onOpenNestedPopup={handleOpenNestedPopup}
                onClose={handleClosePopup}
            />
        ))}

        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {Array.from(openPopups.values()).map(popup => {
            if (!popup.parentId) return null;
            const parentPopup = openPopups.get(popup.parentId);
            if (!parentPopup) return null;
            
            const startX = parentPopup.x + 320; // width of card
            const startY = parentPopup.y + 40; // approx middle
            const endX = popup.x;
            const endY = popup.y + 40;
            
            return (
              <line 
                key={`${popup.parentId}-${popup.resourceId}`}
                x1={startX} 
                y1={startY} 
                x2={endX} 
                y2={endY} 
                stroke="hsl(var(--primary))" 
                strokeWidth="2"
                strokeOpacity="0.5"
              />
            )
          })}
        </svg>
    
        {contextMenu && (
            <div ref={contextMenuRef} style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }} className="fixed z-50 min-w-[10rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" className="w-full h-9 justify-start px-2" onClick={() => { togglePinFolder(contextMenu.item.id); setContextMenu(null); }}>
                    {pinnedFolderIds.has(contextMenu.item.id) ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
                    {pinnedFolderIds.has(contextMenu.item.id) ? 'Unpin' : 'Pin'}
                </Button>
                <Button variant="ghost" className="w-full h-9 justify-start px-2" onClick={() => { handleAddNewNestedFolder(contextMenu.item); setContextMenu(null); }}>New Folder</Button>
                <Button variant="ghost" className="w-full h-9 justify-start px-2" onClick={() => { handleShareFolder(contextMenu.item); setContextMenu(null); }}><Share className="mr-2 h-4 w-4" />Share Publicly</Button>
                <Button variant="ghost" className="w-full h-9 justify-start px-2" onClick={() => { setEditingFolder(contextMenu.item); setContextMenu(null); }}>Rename</Button>
                <Button variant="ghost" className="w-full h-9 justify-start px-2 text-destructive hover:text-destructive" onClick={() => { setDeleteConfirmation({ item: contextMenu.item }); setContextMenu(null); }}>Delete</Button>
            </div>
        )}
        
        {deleteConfirmation && (
            <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{deleteConfirmation.item.name}" and all its contents. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setDeleteConfirmation(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { handleDeleteFolder(deleteConfirmation.item.id); setDeleteConfirmation(null); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        )}

        <Dialog open={!!editingResource} onOpenChange={(isOpen) => !isOpen && setEditingResource(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Resource</DialogTitle>
                    <DialogDescription>Update the details or move this resource to a new folder.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="res-name" className="text-right">Name</Label>
                        <Input id="res-name" value={editedResourceData.name || ''} onChange={(e) => setEditedResourceData(prev => ({...prev, name: e.target.value}))} className="col-span-3"/>
                    </div>
                    {editingResource?.type === 'link' && (
                    <>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="res-link" className="text-right">Link</Label>
                            <Input id="res-link" value={editedResourceData.link || ''} onChange={(e) => setEditedResourceData(prev => ({...prev, link: e.target.value}))} className="col-span-3"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="res-desc" className="text-right">Description</Label>
                            <Textarea id="res-desc" value={editedResourceData.description || ''} onChange={(e) => setEditedResourceData(prev => ({...prev, description: e.target.value}))} className="col-span-3"/>
                        </div>
                    </>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="res-folder" className="text-right">Folder</Label>
                        <Select value={editedResourceData.folderId || ''} onValueChange={handleResourceFolderChange}>
                            <SelectTrigger id="res-folder" className="col-span-3"><SelectValue placeholder="Select a folder" /></SelectTrigger>
                            <SelectContent>{renderFolderOptions(null, 0)}</SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingResource(null)}>Cancel</Button>
                    <Button onClick={handleSaveResourceEdit}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={youtubeModalState.isOpen} onOpenChange={(isOpen) => setYoutubeModalState(p => ({...p, isOpen}))}>
          <DialogContent
            className="max-w-4xl h-[90vh] flex flex-col p-2"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>YouTube Playlist</DialogTitle>
            </DialogHeader>
            <div className="flex-grow min-h-0 relative group/modal">
              {youtubeModalState.playlist.length > 0 && (
                <div className="w-full h-full relative">
                  <iframe
                    src={getYouTubeEmbedUrl(youtubeModalState.playlist[youtubeModalState.currentIndex]?.link) || ''}
                    className="w-full h-full border-0 rounded-md"
                    title="Embedded YouTube Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>


        <Dialog open={isMindMapModalOpen} onOpenChange={setIsMindMapModalOpen}>
            <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
                <DialogHeader className="sr-only"><DialogTitle>Resource Mind Map</DialogTitle></DialogHeader>
                <MindMapViewer defaultView="Resources" rootFolderId={mindMapRootFolderId} showControls={false} />
            </DialogContent>
        </Dialog>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Add New Resource</DialogTitle>
                </DialogHeader>
                <Tabs value={addResourceType} onValueChange={(v) => setAddResourceType(v as 'link' | 'card')} className="w-full mt-2 mb-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="link">Link</TabsTrigger>
                        <TabsTrigger value="card">Card</TabsTrigger>
                    </TabsList>
                    <TabsContent value="link" className="pt-4">
                        <Input
                            autoFocus
                            placeholder="https://example.com"
                            value={newResourceLink}
                            onChange={(e) => setNewResourceLink(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddResource()}
                        />
                    </TabsContent>
                    <TabsContent value="card" className="pt-4">
                        <Input
                            autoFocus
                            placeholder="New card name..."
                            value={newResourceName}
                            onChange={(e) => setNewResourceName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddResource()}
                        />
                    </TabsContent>
                </Tabs>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                    <Button onClick={handleAddResource} disabled={isFetchingMeta}>
                        {isFetchingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Folder Shared Publicly</DialogTitle>
                    <DialogDescription>Anyone with this link can view the contents of this folder.</DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                    <Input id="share-link" value={shareUrl} readOnly />
                    <Button onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        toast({ title: 'Copied to clipboard!' });
                    }}>Copy</Button>
                </div>
            </DialogContent>
        </Dialog>
        <Dialog open={markdownModalState.isOpen} onOpenChange={(isOpen) => setMarkdownModalState(p => ({...p, isOpen}))}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>{currentMarkdownResource?.name || "Resource"}</DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <ScrollArea className="h-full">
                        <div className="prose dark:prose-invert max-w-full p-6">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullMarkdownContent || ""}</ReactMarkdown>
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    </DndContext>
    </>
  );
}

export default function ResourcesPage() {
    return <AuthGuard><ResourcesPageContent /></AuthGuard>;
}

    





