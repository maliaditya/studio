
"use client";

import React, { useState, useMemo, FormEvent, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Library, Folder, Link as LinkIcon, Edit, ExternalLink, ChevronDown, Loader2, Globe, GitMerge, MoreVertical, Youtube, Expand, PictureInPicture, ArrowRight, Workflow, GripVertical, X, Code, MessageSquare, Plus, Share, Pin, PinOff, ChevronLeft, ChevronRight as ChevronRightIcon, Upload, Play, Pause, Copy, Github, Unlink, Edit3, Blocks, Zap, Search, View, File as FileIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import type { Resource, ResourceFolder, ResourcePoint, PopupState } from '@/types/workout';
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
import { format, parseISO } from 'date-fns';
import { ModelViewer } from '@/components/ModelViewer';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { EditableField, DoubleEditableField, EmotionEditableField, EditableResourcePoint } from '@/components/EditableFields';
import { HabitResourceCard } from '@/components/HabitResourceCard';
import { MechanismResourceCard } from '@/components/MechanismResourceCard';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { storePdf } from '@/lib/audioDB';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';


const getFaviconUrl = (link: string): string | undefined => {
  try {
      let url = link;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
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
        if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=0`;
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

interface ResourceCardComponentProps {
    resource: Resource; 
    onUpdate: (resource: Resource) => void; 
    onDelete: (resourceId: string) => void; 
    onOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void; 
    onOpenMarkdownModal: (resourceId: string, pointId: string) => void;
    playingAudio: { id: string; isPlaying: boolean } | null;
    setPlayingAudio: React.Dispatch<React.SetStateAction<{ id: string; isPlaying: boolean } | null>>;
    onLinkClick: (resourceId: string) => void;
    linkingFromId: string | null;
    isPopup?: boolean;
    onEditLinkText: (point: ResourcePoint) => void;
    onClosePopup?: (e: React.MouseEvent | React.PointerEvent) => void;
    onConvertToCard: (point: ResourcePoint) => void;
    onOpenPdfViewer: (resource: Resource) => void;
}

const ResourceCardComponent = React.memo(({ resource, onUpdate, onDelete, onOpenNestedPopup, onOpenMarkdownModal, playingAudio, setPlayingAudio, onLinkClick, linkingFromId, isPopup = false, onEditLinkText, onClosePopup, onConvertToCard, onOpenPdfViewer }: ResourceCardComponentProps) => {
    const { resources, setFloatingVideoUrl, setFloatingVideoPlaylist } = useAuth();
    const [editingTitle, setEditingTitle] = useState(false);
    
    const [linkCardPopoverOpen, setLinkCardPopoverOpen] = useState(false);
    const [linkedCardId, setLinkedCardId] = useState<string>('');
    const audioInputRef = useRef<HTMLInputElement>(null);

    const handleUpdateTitle = (newTitle: string) => {
        onUpdate({ ...resource, name: newTitle });
    };

    const handleAddPoint = (type: ResourcePoint['type']) => {
        const newPoint: ResourcePoint = { id: `point_${Date.now()}`, text: 'New step...', type };
        const updatedPoints = [...(resource.points || []), newPoint];
        onUpdate({ ...resource, points: updatedPoints });
    };

    const handleAddCardLinkPoint = () => {
        if (!linkedCardId) return;
        const linkedCard = resources.find(r => r.id === linkedCardId);
        if (!linkedCard) return;

        const newPoint: ResourcePoint = {
            id: `point_${Date.now()}`,
            type: 'card',
            text: linkedCard.name,
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
    
    const markdownOrCodeCount = (resource.points || []).filter(p => p.type === 'markdown' || p.type === 'code').length;
    
    const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const audioUrl = e.target?.result as string;
                onUpdate({ ...resource, audioUrl });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const togglePlayAudio = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        setPlayingAudio(prev => {
            if (prev?.id === resource.id && prev.isPlaying) {
                return { ...prev, isPlaying: false };
            }
            return { id: resource.id, isPlaying: true };
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = (resource.points || []).findIndex(p => p.id === active.id);
      const newIndex = (resource.points || []).findIndex(p => p.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newPoints = arrayMove(resource.points!, oldIndex, newIndex);
        onUpdate({ ...resource, points: newPoints });
      }
    };

    return (
        <Card className={cn("flex flex-col rounded-2xl group overflow-hidden transition-all duration-300 hover:shadow-xl", linkingFromId === resource.id && "ring-2 ring-primary", linkingFromId && linkingFromId !== resource.id && "cursor-pointer hover:ring-2 hover:ring-primary/50")}>
             <input type="file" ref={audioInputRef} onChange={handleAudioUpload} accept="audio/*" className="hidden" />
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
                        {markdownOrCodeCount > 0 && !isPopup && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => onOpenMarkdownModal(resource.id, '')}>
                                <Expand className="h-4 w-4" />
                            </Button>
                        )}
                        {resource.audioUrl && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onPointerDownCapture={togglePlayAudio}>
                                {playingAudio?.id === resource.id && playingAudio.isPlaying ? <Pause className="h-4 w-4 text-green-500" /> : <Play className="h-4 w-4 text-green-500" />}
                            </Button>
                        )}
                        {!isPopup && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => onLinkClick(resource.id)}>
                                <LinkIcon className="h-4 w-4" />
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
                                <DropdownMenuItem onSelect={() => audioInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload Audio</DropdownMenuItem>
                                {!isPopup && <DropdownMenuItem onSelect={() => onDelete(resource.id)} className="text-destructive">Delete Card</DropdownMenuItem>}
                            </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                </div>
                {resource.createdAt && (
                    <CardDescription className="text-xs pt-1">
                        Created: {format(parseISO(resource.createdAt), 'MMM d, yyyy')}
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="flex-grow min-h-0">
              <div className={cn(markdownOrCodeCount > 0 ? 'h-[450px]' : '')}>
                <ScrollArea className="h-full">
                    <DndContext onDragEnd={handleDragEnd}>
                        <SortableContext items={(resource.points || []).map(p => p.id)}>
                            <ul className="space-y-3 pr-3">
                                {(resource.points || []).map((point) => (
                                    <SortablePoint 
                                        key={point.id} 
                                        point={point} 
                                        onUpdate={(newText) => {
                                            const updatedPoints = (resource.points || []).map(p => p.id === point.id ? { ...p, text: newText } : p);
                                            onUpdate({ ...resource, points: updatedPoints });
                                        }}
                                        onDelete={() => handleDeletePoint(point.id)}
                                        onOpenNestedPopup={(e: React.MouseEvent) => onOpenNestedPopup(point.resourceId!, e)}
                                        onOpenMarkdownModal={() => onOpenMarkdownModal(resource.id, point.id)}
                                        onEditLinkText={onEditLinkText}
                                        onConvertToCard={() => onConvertToCard(point)}
                                        onOpenPdfViewer={() => {}}
                                    />
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                </ScrollArea>
              </div>
            </CardContent>
            <CardFooter className="p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                 <div className="flex gap-2 w-full">
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
                                <Button variant="ghost" className="w-full justify-start" onClick={() => handleAddPoint('link')}><LinkIcon className="mr-2 h-4 w-4" />Link</Button>
                                <Button variant="ghost" className="w-full justify-start" onClick={() => handleAddPoint('paint')}><Paintbrush className="mr-2 h-4 w-4" />Paint Canvas</Button>
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
                                            {resources.filter(r => (r.type === 'card' || r.type === 'habit' || r.type === 'mechanism') && r.id !== resource.id).map(r => (
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
            </CardFooter>
        </Card>
    );
});
ResourceCardComponent.displayName = 'ResourceCardComponent';


const SortableResourceCard = React.memo(({ item, children, className, linkingFromId }: { 
    item: Resource; 
    children: React.ReactNode;
    className?: string;
    linkingFromId: string | null;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id, data: { type: 'card', item }});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: linkingFromId && linkingFromId !== item.id ? 'pointer' : 'default',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={className}>
            {children}
        </div>
    );
});
SortableResourceCard.displayName = 'SortableResourceCard';


const SortablePoint = React.memo(({ point, onConvertToCard, onUpdate, onDelete, onOpenNestedPopup, onOpenMarkdownModal, onEditLinkText, onOpenPdfViewer }: {
    point: ResourcePoint;
    onConvertToCard: () => void;
    onUpdate: (updatedText: string) => void;
    onDelete: () => void;
    onOpenNestedPopup: (event: React.MouseEvent) => void;
    onOpenMarkdownModal: () => void;
    onEditLinkText: (point: ResourcePoint) => void;
    onOpenPdfViewer: () => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: point.id, data: { type: 'point', item: point } });

    const style = {
        transform: CSS.Transform.toString(transform),
        zIndex: isDragging ? 10 : 'auto',
        transition,
    };
    
    if (point.type === 'card' && point.resourceId) {
        return (
            <div ref={setNodeRef} style={style} className="relative flex items-center gap-3 group/item">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-full flex items-center justify-center">
                    <button {...attributes} {...listeners} className="cursor-grab p-1 opacity-0 group-hover/item:opacity-100 transition-opacity"><GripVertical className="h-4 w-4 text-muted-foreground/50" /></button>
                </div>
                <div 
                    onClick={onOpenNestedPopup}
                    className="flex items-start gap-3 flex-grow cursor-pointer p-2 pl-8 rounded-md hover:bg-muted/50 border border-dashed"
                >
                    <Library className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" />
                    <span className="font-medium text-foreground">{point.text}</span>
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-full flex items-center justify-center">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover/item:opacity-100" onClick={onDelete}>
                        <Trash2 className="h-3 w-3"/>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div ref={setNodeRef} style={style} className="relative bg-card">
            <EditableResourcePoint 
                point={point}
                onUpdate={(pointId, updates) => {
                    const newText = (updates as { text: string }).text;
                    if (typeof newText === 'string') {
                        onUpdate(newText);
                    }
                }}
                onDelete={onDelete}
                onOpenNestedPopup={onOpenNestedPopup}
                onOpenContentView={onOpenMarkdownModal}
                onConvertToCard={onConvertToCard}
                onEditLinkText={onEditLinkText}
                dragHandle={{ attributes, listeners }}
                onSeekTo={()=>{}}
                currentTime={0}
                onSetEndTime={()=>{}}
                onClearEndTime={()=>{}}
                onOpenDrawingCanvas={()=>{}}
                onOpenPdfViewer={onOpenPdfViewer}
            />
        </div>
    );
});
SortablePoint.displayName = 'SortablePoint';


const DraggableFolder = React.memo(({ folder, children, isDragging, ...props }: { folder: ResourceFolder, children: React.ReactNode, isDragging: boolean } & React.HTMLAttributes<HTMLDivElement>) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: folder.id,
        data: { type: 'folder' }
    });
  
    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      zIndex: 1000,
    } : undefined;
  
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cn(isDragging && "opacity-50")}>
            <div {...attributes} {...listeners} {...props}>
                {children}
            </div>
        </div>
    );
});
DraggableFolder.displayName = 'DraggableFolder';

  
const DroppableFolder = React.memo(({ folder, children, ...props }: { folder: ResourceFolder, children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) => {
    const { isOver, setNodeRef } = useDroppable({
        id: folder.id,
        data: { type: 'folder' }
    });

    return (
        <div ref={setNodeRef} {...props} className={cn(isOver && "bg-primary/10 ring-1 ring-primary")}>
            {children}
        </div>
    );
});
DroppableFolder.displayName = 'DroppableFolder';


function ResourcesPageContent() {
  const { 
    currentUser,
    resources, setResources, 
    resourceFolders, setResourceFolders,
    setFloatingVideoUrl,
    setFloatingVideoPlaylist,
    pinnedFolderIds,
    setPinnedFolderIds,
    activeResourceTabIds,
    setActiveResourceTabIds,
    selectedResourceFolderId,
    setSelectedResourceFolderId,
    globalVolume,
    openGeneralPopup,
    createResourceWithHierarchy,
    openPdfViewer,
  } = useAuth();
  const { toast } = useToast();
  
  const [newFolderName, setNewFolderName] = useState('');
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceLink, setNewResourceLink] = useState('');
  
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  
  const [newlyCreatedFolderId, setNewlyCreatedFolderId] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  
  const [youtubeModalState, setYoutubeModalState] = useState<{
    isOpen: boolean;
    playlist: Resource[];
    currentIndex: number;
  }>({ isOpen: false, playlist: [], currentIndex: 0 });
  
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    item: ResourceFolder;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ item: ResourceFolder | Resource } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  
  const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
  const [mindMapRootFolderId, setMindMapRootFolderId] = useState<string | null>(null);
  
  const [addResourceType, setAddResourceType] = useState<'link' | 'card' | 'habit' | 'model3d' | 'mechanism' | 'pdf'>('link');
  const [mechanismFramework, setMechanismFramework] = useState<'negative' | 'positive'>('negative');

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const [markdownModalState, setMarkdownModalState] = useState<{
    isOpen: boolean;
    resource: Resource | null;
    point: ResourcePoint | null;
  }>({ isOpen: false, resource: null, point: null });
  
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  
  const [playingAudio, setPlayingAudio] = useState<{ id: string; isPlaying: boolean } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [modelModalState, setModelModalState] = useState<{ isOpen: boolean; modelUrl: string | null }>({ isOpen: false, modelUrl: null });

  const [linkTextDialog, setLinkTextDialog] = useState<{ point: ResourcePoint, resourceId: string } | null>(null);
  const [currentDisplayText, setCurrentDisplayText] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleOpenNestedPopup = useCallback((resourceId: string, event: React.MouseEvent) => {
    openGeneralPopup(resourceId, event);
  }, [openGeneralPopup]);

  const handleUpdateResource = (updatedResource: Resource) => {
    setResources(prev =>
      prev.map(res => res.id === updatedResource.id ? updatedResource : res)
    );
  };
  
  const handleLinkClick = useCallback((resourceId: string) => {
    if (linkingFromId === null) {
      const sourceCard = resources.find(r => r.id === resourceId);
      if (sourceCard?.type !== 'card' && sourceCard?.type !== 'habit' && sourceCard?.type !== 'mechanism') {
        toast({ title: "Invalid Source", description: "You can only start a link from a 'Card', 'Habit', or 'Mechanism' type resource.", variant: "destructive" });
        return;
      }
      setLinkingFromId(resourceId);
      toast({ title: "Linking Mode", description: "Click the link icon on another card to complete the link." });
    } else {
      if (linkingFromId === resourceId) {
        setLinkingFromId(null);
        toast({ title: "Linking Canceled" });
        return;
      }

      const sourceCard = resources.find(r => r.id === linkingFromId);
      const targetCard = resources.find(r => r.id === resourceId);

      if (!sourceCard || !targetCard || (targetCard.type !== 'card' && targetCard.type !== 'habit' && targetCard.type !== 'mechanism')) {
        toast({ title: "Invalid Link", description: "The target must also be a 'Card', 'Habit'