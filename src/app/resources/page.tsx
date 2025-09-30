
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


const SortablePoint = React.memo(({ point, onConvertToCard, onUpdate, onDelete, onOpenNestedPopup, onOpenMarkdownModal, onEditLinkText }: {
    point: ResourcePoint;
    onConvertToCard: () => void;
    onUpdate: (updatedText: string) => void;
    onDelete: () => void;
    onOpenNestedPopup: (event: React.MouseEvent) => void;
    onOpenMarkdownModal: () => void;
    onEditLinkText: (point: ResourcePoint) => void;
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
        <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
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
        toast({ title: "Invalid Link", description: "The target must also be a 'Card', 'Habit', or 'Mechanism' type resource.", variant: "destructive" });
        setLinkingFromId(null);
        return;
      }

      // --- Start of automated folder logic ---
      const parentFolderId = targetCard.folderId;
      let subFolderId: string;

      let existingSubFolder = resourceFolders.find(f => f.parentId === parentFolderId && f.name === targetCard.name);
      
      let finalFolders = [...resourceFolders];
      let finalResources = [...resources];

      if (!existingSubFolder) {
        const newFolder: ResourceFolder = {
          id: `folder_${Date.now()}`,
          name: targetCard.name,
          parentId: parentFolderId,
          icon: 'Folder',
        };
        finalFolders.push(newFolder);
        subFolderId = newFolder.id;
      } else {
        subFolderId = existingSubFolder.id;
      }

      // Update the source card to link to the target
      finalResources = finalResources.map(r => {
        if (r.id === targetCard.id) {
            const newPoint: ResourcePoint = {
                id: `point_${Date.now()}`,
                type: 'card',
                text: sourceCard.name,
                resourceId: sourceCard.id
            };
            return { ...r, points: [...(r.points || []), newPoint] };
        }
        return r;
      });

      // Move the source card to the new/existing subfolder
      finalResources = finalResources.map(r => {
        if (r.id === sourceCard.id) {
          return { ...r, folderId: subFolderId };
        }
        return r;
      });
      
      setResourceFolders(finalFolders);
      setResources(finalResources);
      
      setLinkingFromId(null);
      toast({ title: "Success!", description: `Linked "${sourceCard.name}" to "${targetCard.name}" and moved it to the "${targetCard.name}" folder.` });
    }
  }, [linkingFromId, resources, resourceFolders, setResourceFolders, setResources, toast]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (playingAudio?.isPlaying) {
      const resourceToPlay = resources.find(r => r.id === playingAudio.id);
      if (resourceToPlay?.audioUrl) {
        if (audioEl.src !== resourceToPlay.audioUrl) {
          audioEl.src = resourceToPlay.audioUrl;
        }
        audioEl.volume = globalVolume;
        audioEl.play().catch(e => console.error("Audio play failed:", e));
      }
    } else {
      audioEl.pause();
    }
  }, [playingAudio, resources, globalVolume]);

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
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
        if (youtubeModalState.isOpen) {
            if (event.key === 'ArrowRight') handleNextVideo();
            if (event.key === 'ArrowLeft') handlePrevVideo();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}, [youtubeModalState.isOpen, handleNextVideo, handlePrevVideo]);

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
  
  const handleCloseAllTabs = () => {
    const pinned = Array.from(pinnedFolderIds);
    setActiveResourceTabIds(pinned);

    if (selectedResourceFolderId && !pinnedFolderIds.has(selectedResourceFolderId)) {
      setSelectedResourceFolderId(pinned.length > 0 ? pinned[0] : null);
    }
  };
  
  const togglePinFolder = (folderId: string) => {
    setPinnedFolderIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) {
            newSet.delete(folderId);
        } else {
            newSet.add(folderId);
        }
        return newSet;
    });
  };

  const prevPinnedFolderIdsRef = useRef(pinnedFolderIds);
  useEffect(() => {
      const prevSize = prevPinnedFolderIdsRef.current.size;
      const currentSize = pinnedFolderIds.size;
  
      if (currentSize > prevSize) {
          toast({ title: "Folder pinned" });
      } else if (currentSize < prevSize) {
          toast({ title: "Folder unpinned" });
      }
  
      prevPinnedFolderIdsRef.current = pinnedFolderIds;
  }, [pinnedFolderIds, toast]);


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
            setLinkingFromId(null);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
    let resourcesToFilter = resources;
    if (searchTerm && !selectedResourceFolderId) {
        return resourcesToFilter.filter(r => r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedResourceFolderId) {
        resourcesToFilter = resourcesToFilter.filter(r => r.folderId === selectedResourceFolderId);
    }
    if (searchTerm) {
        resourcesToFilter = resourcesToFilter.filter(r => r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return resourcesToFilter;
  }, [resources, selectedResourceFolderId, searchTerm]);
  
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
    setResources(prev => prev.filter(r => r.folderId && !idsToDelete.includes(r.folderId)));
    setActiveResourceTabIds(prev => prev.filter(id => !idsToDelete.includes(id)));
    
    if (selectedResourceFolderId && idsToDelete.includes(selectedResourceFolderId)) {
        setSelectedResourceFolderId(null);
    }
    toast({ title: "Folder Deleted", description: "The folder and all its contents have been removed." });
  };
  
  const handleStartEditingFolder = (folder: ResourceFolder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };
  
  const commitFolderEdit = () => {
    if (!editingFolderId) return;
    if (!editingFolderName.trim()) {
        toast({ title: "Rename Cancelled", description: "Folder name cannot be empty.", variant: "destructive" });
        cancelFolderEdit();
        return;
    }
    setResourceFolders(prev => prev.map(f => f.id === editingFolderId ? { ...f, name: editingFolderName.trim() } : f));
    setEditingFolderId(null);
  };
  
  const handleAddNewNestedFolder = (parentFolder: ResourceFolder) => {
    const newFolder: ResourceFolder = {
      id: `folder_${Date.now()}`,
      name: "New Folder",
      parentId: parentFolder.id,
      icon: 'Folder',
    };
    setResourceFolders(prev => [...prev, newFolder]);
    setEditingFolderId(newFolder.id);
    setEditingFolderName("New Folder");
    setNewlyCreatedFolderId(newFolder.id);

    // Ensure parent is expanded
    setCollapsedFolders(prev => {
      const newSet = new Set(prev);
      newSet.delete(parentFolder.id);
      return newSet;
    });
  };

  const cancelFolderEdit = () => {
    if (newlyCreatedFolderId === editingFolderId) {
        setResourceFolders(prev => prev.filter(f => f.id !== editingFolderId));
    }
    setEditingFolderId(null);
    setEditingFolderName('');
    setNewlyCreatedFolderId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, item: ResourceFolder) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({
        mouseX: rect.left,
        mouseY: rect.bottom,
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
    if ((addResourceType === 'card' || addResourceType === 'habit' || addResourceType === 'mechanism' || addResourceType === 'model3d' || addResourceType === 'pdf') && !newResourceName.trim()) {
      toast({ title: "Error", description: "Name is required.", variant: "destructive" });
      return;
    }

    if (addResourceType === 'card' || addResourceType === 'habit' || addResourceType === 'mechanism' || addResourceType === 'model3d') {
        const newRes: Resource = {
            id: `res_${Date.now()}`,
            name: newResourceName.trim(),
            folderId: selectedResourceFolderId,
            type: addResourceType,
            points: [],
            icon: 'Library',
            createdAt: new Date().toISOString(),
            mechanismFramework: addResourceType === 'mechanism' ? mechanismFramework : undefined,
        };
        setResources(prev => [...prev, newRes]);
        setNewResourceName('');
        setIsAdding(false);
        toast({ title: `Resource Added`, description: `"${newRes.name}" has been saved.`});
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
          type: 'link',
          createdAt: new Date().toISOString(),
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
  
  const handleDeleteResource = (resource: Resource) => {
    const isLinked = resources.some(r => 
        r.points?.some(p => p.type === 'card' && p.resourceId === resource.id)
    );
    
    if (isLinked) {
        setDeleteConfirmation({ item: resource });
    } else {
        performDeleteResource(resource.id);
    }
  };

  const performDeleteResource = (resourceId: string) => {
      setResources(prev => {
          // Also remove any links pointing to this resource from other cards.
          return prev.map(r => ({
              ...r,
              points: r.points?.filter(p => p.resourceId !== resourceId)
          })).filter(r => r.id !== resourceId);
      });
      toast({ title: "Resource Deleted", description: "The resource has been removed." });
  };
  
  const handleResourceFolderChange = (value: string) => {
      setEditingResource(prev => prev ? ({...prev, folderId: value}) : null);
  };

  const handleSaveResourceEdit = () => {
    if (!editingResource) return;
    if (!editingResource.name?.trim() || !editingResource.folderId) {
        toast({ title: "Error", description: "Name and folder are required.", variant: "destructive"});
        return;
    }
    
    let finalData = { ...editingResource };
    if (finalData.type === 'link' && finalData.link && editingResource.link && finalData.link !== editingResource.link) {
        finalData.iconUrl = getFaviconUrl(finalData.link);
    }
    handleUpdateResource(finalData as Resource);
    setEditingResource(null);
    toast({ title: "Resource Updated", description: `"${editingResource.name}" has been updated.` });
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
  
    try {
        const response = await fetch('/api/share/folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                folder, 
                allResources: resources, // Send all resources to the backend
                childFolders, 
                username: currentUser.username
            }),
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
    const folders = resourceFolders.filter(f => f.parentId === parentId).sort((a,b) => (a.name || '').localeCompare(b.name || ''));
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

  const filteredFolders = useMemo(() => {
    if (!searchTerm) {
        return resourceFolders;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    const matchingFolderIds = new Set(
        resourceFolders.filter(f => f.name.toLowerCase().includes(lowercasedTerm)).map(f => f.id)
    );

    // Add all parents of matching folders
    matchingFolderIds.forEach(id => {
        let currentFolder = resourceFolders.find(f => f.id === id);
        while (currentFolder && currentFolder.parentId) {
            matchingFolderIds.add(currentFolder.parentId);
            currentFolder = resourceFolders.find(f => f.id === currentFolder.parentId);
        }
    });

    return resourceFolders.filter(f => matchingFolderIds.has(f.id));
  }, [searchTerm, resourceFolders]);

  const renderSidebarFolders = useCallback((parentId: string | null, level: number) => {
    const foldersToRender = filteredFolders
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
                 {editingFolderId === folder.id ? (
                    <div className="flex items-center gap-2 p-1 w-full">
                        <Folder className="h-4 w-4 flex-shrink-0"/>
                        <Input
                            value={editingFolderName}
                            onChange={e => setEditingFolderName(e.target.value)}
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
                    <DroppableFolder folder={folder}>
                        <DraggableFolder folder={folder} isDragging={activeId === folder.id}>
                            <div
                                onClick={() => { handleSelectFolder(folder.id); toggleFolderCollapse(folder.id); }}
                                onContextMenu={(e) => handleContextMenu(e, folder)}
                                className={cn(
                                "flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer group transition-colors",
                                selectedResourceFolderId === folder.id && "bg-accent font-semibold"
                                )}
                            >
                                {pinnedFolderIds.has(folder.id) && <Pin className="h-3 w-3 text-primary flex-shrink-0" />}
                                <ChevronDown className={cn("h-4 w-4 transition-transform", (collapsedFolders.has(folder.id) && !searchTerm) && "-rotate-90", resourceFolders.every(f => f.parentId !== folder.id) && "invisible")} />
                                <div className="flex items-center gap-2 flex-grow min-w-0">
                                  <Folder className="h-4 w-4 flex-shrink-0"/>
                                  <span className='truncate' title={folder.name}>
                                    {folder.name.length > 25 ? `${folder.name.substring(0,25)}...` : folder.name}
                                  </span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleShareFolder(folder); }}>
                                    <Share className="h-4 w-4" />
                                    <span className="sr-only">Share {folder.name}</span>
                                </Button>
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
                        </DraggableFolder>
                    </DroppableFolder>
                )}
                {(!collapsedFolders.has(folder.id) || searchTerm) && renderSidebarFolders(folder.id, level + 1)}
            </li>
        ))}
      </ul>
    );
  }, [filteredFolders, editingFolderId, editingFolderName, selectedResourceFolderId, collapsedFolders, handleSelectFolder, commitFolderEdit, cancelFolderEdit, handleContextMenu, pinnedFolderIds, handleShareFolder, toggleFolderCollapse, activeId, searchTerm]);

  
  const isDescendant = (childId: string, parentId: string): boolean => {
    if (childId === parentId) return true;
    const parentFolder = resourceFolders.find(f => f.id === childId);
    if (!parentFolder || !parentFolder.parentId) return false;
    return isDescendant(parentFolder.parentId, parentId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over, delta } = event;

    if (!over) return;
    
    if (active.data.current?.type === 'folder' && over.data.current?.type === 'folder') {
        const draggedFolderId = active.id as string;
        const targetFolderId = over.id as string;
        
        if (draggedFolderId !== targetFolderId && !isDescendant(targetFolderId, draggedFolderId)) {
            setResourceFolders(prev => prev.map(f => f.id === draggedFolderId ? { ...f, parentId: targetFolderId } : f));
            setCollapsedFolders(prev => {
                const newSet = new Set(prev);
                newSet.delete(targetFolderId);
                return newSet;
            });
            toast({ title: "Folder Moved", description: "Folder moved successfully." });
        } else if (isDescendant(targetFolderId, draggedFolderId)) {
            toast({ title: "Invalid Move", description: "Cannot move a folder into its own descendant.", variant: "destructive" });
        }
        return;
    }

    if (active.data.current?.type === 'card' && over.data.current?.type) {
        const activeCard = resources.find(r => r.id === active.id);
        const overId = over.id.toString();
        
        if (over.data.current.type === 'folder' && activeCard && activeCard.folderId !== overId) {
            setResources(prev => prev.map(r => r.id === active.id ? { ...r, folderId: overId } : r));
            toast({ title: "Resource Moved", description: `Moved to a new folder.` });
            return;
        }

        const overCard = resources.find(r => r.id === overId);
        if (overCard && activeCard && activeCard.folderId === overCard.folderId && active.id !== over.id) {
            const oldIndex = resources.findIndex(r => r.id === active.id);
            const newIndex = resources.findIndex(r => r.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                setResources(prev => arrayMove(prev, oldIndex, newIndex));
            }
            return;
        }
    }
  };
  
  const handleOpenMarkdownModal = (resourceId: string, pointId: string) => {
      const resource = resources.find(r => r.id === resourceId);
      const point = resource?.points?.find(p => p.id === pointId);
      if (resource && point) {
        setMarkdownModalState({ isOpen: true, resource, point });
      }
  };
  
  const currentMarkdownResource = markdownModalState.resource;

  const sortedTabs = useMemo(() => {
    return [...activeResourceTabIds].sort((a, b) => {
        const aIsPinned = pinnedFolderIds.has(a);
        const bIsPinned = pinnedFolderIds.has(b);
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;
        return 0; // Keep original order for same-pinned-status tabs
    });
  }, [activeResourceTabIds, pinnedFolderIds]);
  
  const showCloseAll = useMemo(() => {
    return activeResourceTabIds.some(id => !pinnedFolderIds.has(id));
  }, [activeResourceTabIds, pinnedFolderIds]);

  const handleEditLinkText = (point: ResourcePoint) => {
    const resource = resources.find(r => r.points?.some(p => p.id === point.id));
    if (!resource) return;
    setCurrentDisplayText(point.displayText || '');
    setLinkTextDialog({ point, resourceId: resource.id });
  };
  
  const handleSaveLinkText = () => {
      if (!linkTextDialog) return;
      const { point, resourceId } = linkTextDialog;
      
      setResources(prev => prev.map(res => {
          if (res.id === resourceId) {
              const updatedPoints = (res.points || []).map(p => {
                  if (p.id === point.id) {
                      return { ...p, displayText: currentDisplayText.trim() };
                  }
                  return p;
              });
              return { ...res, points: updatedPoints };
          }
          return res;
      }));
      
      setLinkTextDialog(null);
      setCurrentDisplayText('');
  };

  const handleConvertToCard = (pointToConvert: ResourcePoint) => {
    const parentResource = resources.find(r => r.points?.some(p => p.id === pointToConvert.id));
    if (!parentResource) return;

    createResourceWithHierarchy(parentResource, pointToConvert, 'card');
  };

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedResourceFolderId) return;

    if (!file.name.toLowerCase().endsWith('.glb') && !file.name.toLowerCase().endsWith('.gltf')) {
      toast({ title: 'Invalid File', description: 'Please upload a .glb or .gltf file.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const modelUrl = event.target?.result as string;
      const newRes: Resource = {
        id: `res_${Date.now()}`,
        name: newResourceName.trim() || file.name,
        folderId: selectedResourceFolderId,
        type: 'model3d',
        modelUrl: modelUrl,
        createdAt: new Date().toISOString(),
      };
      setResources(prev => [...prev, newRes]);
      setNewResourceName('');
      setIsAdding(false);
      toast({ title: `Model Added`, description: `"${newRes.name}" has been saved.` });
    };
    reader.readAsDataURL(file);
  };
  
  const pdfUploadInputRef = useRef<HTMLInputElement>(null);
  
  const handlePdfUploadClick = () => {
    pdfUploadInputRef.current?.click();
  };
  
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedResourceFolderId) return;
  
      const newRes: Resource = {
          id: `res_pdf_${Date.now()}`,
          name: file.name,
          folderId: selectedResourceFolderId,
          type: 'pdf',
          createdAt: new Date().toISOString(),
          pdfFileName: file.name,
          hasLocalPdf: true, 
      };
  
      storePdf(newRes.id, file);
  
      setResources(prev => [...prev, newRes]);
      toast({ title: 'PDF Added', description: `"${file.name}" is ready.` });
      e.target.value = '';
      setIsAdding(false);
  };


  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 gap-4 p-4">
      <input type="file" ref={pdfUploadInputRef} onChange={handlePdfUpload} accept=".pdf" className="hidden" />
      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveId(e.active.id.toString())}
        onDragEnd={handleDragEnd}
      >
        <aside className="col-span-1 flex h-full min-h-0 flex-col md:col-span-2 lg:col-span-2 xl:col-span-1">
                <Card className="flex-grow flex flex-col min-h-0">
                    <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Folders</CardTitle>
                    </div>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col min-h-0">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                placeholder="Search folders & cards..."
                                className="pl-10"
                            />
                        </div>
                        <form onSubmit={handleAddFolder} className="flex gap-2 mb-4">
                            <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="New Root Folder" />
                            <Button size="icon" type="submit"><PlusCircle className="h-4 w-4" /></Button>
                        </form>
                        <ScrollArea className="flex-grow -mx-6 px-6">
                            {renderSidebarFolders(null, 0)}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </aside>

            <main className="h-full flex flex-col min-h-0 col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-3">
                <div className="flex items-center border-b mb-4 flex-shrink-0 sticky top-0 bg-background/80 backdrop-blur-sm z-10 -mt-2 pt-2">
                    <div
                        ref={tabsContainerRef}
                        onWheel={handleWheelScroll}
                        className="flex items-center overflow-x-auto flex-grow"
                    >
                        {sortedTabs.map(tabId => {
                            const folder = resourceFolders.find(f => f.id === tabId);
                            if (!folder) return null;
                            const isPinned = pinnedFolderIds.has(tabId);
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
                                    {isPinned && <Pin className="h-3 w-3 text-primary flex-shrink-0" />}
                                    <Folder className="h-4 w-4" />
                                    <span className="whitespace-nowrap">{folder.name}</span>
                                    {!isPinned && (
                                        <X className="h-4 w-4 ml-2 hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleCloseTab(tabId); }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {showCloseAll && (
                        <Button variant="ghost" size="sm" onClick={handleCloseAllTabs} className="ml-2 flex-shrink-0">
                            Close All
                        </Button>
                    )}
                </div>
                <div className="flex-grow min-h-0">
                  <ScrollArea className="h-full pr-4 -mr-4">
                    <h2 className="text-2xl font-bold mb-4">
                        {selectedResourceFolderId && !searchTerm
                        ? resourceFolders.find(f => f.id === selectedResourceFolderId)?.name
                        : searchTerm ? `Search results for "${searchTerm}"` : 'Select a folder'}
                    </h2>
                    
                    <SortableContext items={filteredResources.map(r => r.id)}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredResources.map(res => {
                                const markdownOrCodeCount = (res.points || []).filter(p => p.type === 'markdown' || p.type === 'code').length;
                                const pointCount = (res.points || []).length;
                                let cardClassName = "";
                                
                                if (markdownOrCodeCount > 1 || pointCount > 15) {
                                    cardClassName = "lg:col-span-3";
                                } else if (markdownOrCodeCount > 0 || pointCount > 5) {
                                    cardClassName = "lg:col-span-2";
                                }
    
                                let cardContent: React.ReactNode;
                                
                                if (res.type === 'pdf') {
                                    cardContent = (
                                        <Card className="flex flex-col rounded-2xl group overflow-hidden transition-all duration-300 hover:shadow-xl h-full cursor-pointer" onClick={() => openPdfViewer(res)}>
                                            <CardHeader className="p-3">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <span className="text-primary"><FileIcon className="h-4 w-4" /></span>
                                                    <span className="truncate">{res.name}</span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex-grow flex items-center justify-center bg-muted/30 aspect-[3/4]">
                                                <p className="text-muted-foreground">PDF Document</p>
                                            </CardContent>
                                        </Card>
                                    );
                                } else if (res.type === 'model3d') {
                                    cardContent = (
                                        <Card className="flex flex-col rounded-2xl group overflow-hidden transition-all duration-300 hover:shadow-xl h-full">
                                            <CardHeader className="p-3">
                                                <div className="flex justify-between items-start gap-2">
                                                    <CardTitle className="text-sm flex items-center gap-2">
                                                        <span className="text-primary"><View className="h-4 w-4" /></span>
                                                        <span className="truncate">{res.name}</span>
                                                    </CardTitle>
                                                    <div className="flex items-center">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModelModalState({ isOpen: true, modelUrl: res.modelUrl || null })}>
                                                            <Expand className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteResource(res)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-grow flex items-center justify-center bg-black/10 dark:bg-black/20 aspect-video">
                                                {res.modelUrl ? <ModelViewer modelUrl={res.modelUrl} /> : <p className="text-muted-foreground">No model</p>}
                                            </CardContent>
                                        </Card>
                                    );
                                } else if (res.type === 'habit') {
                                    cardContent = <HabitResourceCard resource={res} onUpdate={handleUpdateResource} onDelete={() => handleDeleteResource(res)} onLinkClick={handleLinkClick} linkingFromId={linkingFromId} onOpenNestedPopup={(id, e) => handleOpenNestedPopup(id, e)} />;
                                } else if (res.type === 'mechanism') {
                                    cardContent = <MechanismResourceCard resource={res} onUpdate={handleUpdateResource} onDelete={() => handleDeleteResource(res)} onLinkClick={handleLinkClick} linkingFromId={linkingFromId} onOpenNestedPopup={(id, e) => handleOpenNestedPopup(id, e)} />;
                                } else if(res.type === 'card') {
                                    cardContent = <ResourceCardComponent onOpenPdfViewer={openPdfViewer} playingAudio={playingAudio} setPlayingAudio={setPlayingAudio} resource={res} onUpdate={handleUpdateResource} onDelete={() => handleDeleteResource(res)} onOpenNestedPopup={(id, e) => handleOpenNestedPopup(id, e)} onOpenMarkdownModal={handleOpenMarkdownModal} onLinkClick={handleLinkClick} linkingFromId={linkingFromId} onEditLinkText={handleEditLinkText} onConvertToCard={() => createResourceWithHierarchy(res, undefined, 'card')}/>;
                                } else {
                                    const youtubeEmbedUrl = getYouTubeEmbedUrl(res.link);
                                    const isGif = isGifUrl(res.link);
                                    const imageEmbedUrl = isImageUrl(res.link) && !isGif ? res.link : null;
                                    const isObsidianUrlLink = isObsidianUrl(res.link);

                                    const cardProps: any = {};
                                    if (isGif && res.linkedResourceId) {
                                      cardProps.onClick = (e: React.MouseEvent) => handleOpenNestedPopup(res.linkedResourceId!, e);
                                    } else if (youtubeEmbedUrl) {
                                      cardProps.onClick = (e: React.MouseEvent) => {
                                          e.stopPropagation();
                                          setYoutubeModalState({isOpen: true, playlist: filteredResources.filter(r => getYouTubeEmbedUrl(r.link)), currentIndex: filteredResources.filter(r => getYouTubeEmbedUrl(r.link)).findIndex(v => v.id === res.id) });
                                      };
                                    }
                                    
                                    return (
                                    <SortableResourceCard key={res.id} item={res} className={cardClassName} linkingFromId={linkingFromId}>
                                        <Card
                                            {...cardProps}
                                            className={cn(
                                                "relative group rounded-3xl flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 h-full bg-card",
                                                (youtubeEmbedUrl || (isGif && res.linkedResourceId)) && "cursor-pointer"
                                            )}
                                        >
                                            <CardHeader className="flex-row items-center gap-3 p-3 space-y-0">
                                                {res.iconUrl ? <Image src={res.iconUrl} alt="" width={16} height={16} className="flex-shrink-0" unoptimized/> : <Globe className="h-4 w-4 flex-shrink-0"/>}
                                                <CardTitle className="text-sm truncate flex-grow" title={res.name}>{res.name}</CardTitle>
                                            </CardHeader>
                                            <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
                                                {res.githubLink && (<Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white"><a href={res.githubLink} target="_blank" rel="noopener noreferrer"><Github className="h-4 w-4"/></a></Button>)}
                                                {res.demoLink && (<Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white"><a href={res.demoLink} target="_blank" rel="noopener noreferrer"><Globe className="h-4 w-4"/></a></Button>)}
                                                {youtubeEmbedUrl && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setFloatingVideoUrl(res.link!); }}><PictureInPicture className="h-4 w-4" /></Button>}
                                                {youtubeEmbedUrl && <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setYoutubeModalState({isOpen: true, playlist: [res], currentIndex: 0}); }}><Expand className="h-4 w-4" /></Button>}
                                                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}><DropdownMenuItem onSelect={() => setEditingResource(res)}><Edit3 className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem><DropdownMenuItem onSelect={() => handleDeleteResource(res)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                            </div>
                                            {imageEmbedUrl ? (
                                                <>
                                                    <div className="aspect-video w-full bg-black overflow-hidden relative">
                                                        <Image src={imageEmbedUrl} alt={res.name} layout="fill" objectFit="contain" data-ai-hint="illustration" />
                                                    </div>
                                                </>
                                            ) : isGif ? (
                                                <>
                                                    <div className="aspect-video w-full bg-black overflow-hidden relative">
                                                        <Image src={res.link!} alt={res.name} layout="fill" objectFit="contain" data-ai-hint="illustration" />
                                                    </div>
                                                </>
                                            ) : youtubeEmbedUrl ? (
                                                <div className="h-full flex flex-col">
                                                    <div className="aspect-video w-full bg-black overflow-hidden">
                                                      <iframe id={`video-${res.id}`} width="100%" height="100%" src={youtubeEmbedUrl} title={res.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                                                    </div>
                                                </div>
                                            ) : isObsidianUrlLink && res.link ? (
                                                <div className="flex flex-col h-full">
                                                    <div className="flex-grow min-h-0 aspect-[4/3]">
                                                        <iframe src={res.link} title={res.name} frameBorder="0" className="w-full h-full" />
                                                    </div>
                                                    <div className="p-2 border-t flex items-center gap-2">
                                                        <Button asChild variant="secondary" size="sm" className="w-full"><a href={res.link} target="_blank" rel="noopener noreferrer">Visit Site <ExternalLink className="ml-2 h-3 w-3" /></a></Button>
                                                        <Button variant="outline" size="sm" className="w-full" onClick={() => setFloatingVideoUrl(res.link!)}><PictureInPicture className="mr-2 h-3 w-3" /> View in App</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 flex flex-col flex-grow">
                                                    <a href={res.link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground truncate block hover:underline mt-1">{res.link}</a>
                                                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2 flex-grow min-h-[40px]">{res.description || 'No description available.'}</p>
                                                    <div className="mt-auto pt-4 flex items-center gap-2">
                                                        <Button asChild variant="secondary" size="sm" className="w-full"><a href={res.link} target="_blank" rel="noopener noreferrer">Visit Site <ExternalLink className="ml-2 h-3 w-3" /></a></Button>
                                                        {res.link && (
                                                            <Button variant="outline" size="sm" className="w-full" onClick={() => setFloatingVideoUrl(res.link!)}><PictureInPicture className="mr-2 h-3 w-3" /> View in App</Button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </Card>
                                    </SortableResourceCard>
                                    )
                                }
                                return <SortableResourceCard key={res.id} item={res} className={cardClassName} linkingFromId={linkingFromId}>{cardContent}</SortableResourceCard>;
                            })}
                            {selectedResourceFolderId && !searchTerm && (
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
                  </ScrollArea>
                </div>
            </main>
          
        <DragOverlay>
          {activeId?.startsWith('folder-') ? (
            <div className="flex items-center gap-2 p-2 rounded-md bg-accent font-semibold shadow-lg">
              <Folder className="h-4 w-4" />
              <span>{resourceFolders.find(f => f.id === activeId)?.name}</span>
            </div>
          ) : activeId?.startsWith('card-') ? (
            <Card className="w-48 shadow-lg">
              <CardHeader className="p-3">
                <CardTitle className="text-sm truncate">{resources.find(r => r.id === activeId.replace('card-', ''))?.name}</CardTitle>
              </CardHeader>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
      {contextMenu && (
        <div
            ref={contextMenuRef}
            className="fixed z-50 bg-popover border rounded-md shadow-lg p-1"
            style={{ top: `${contextMenu.mouseY}px`, left: `${contextMenu.mouseX}px` }}
        >
            <Button variant="ghost" className="w-full justify-start" onClick={() => { handleAddNewNestedFolder(contextMenu.item); setContextMenu(null); }}><PlusCircle className="mr-2 h-4 w-4"/>Add Nested Folder</Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => { handleStartEditingFolder(contextMenu.item); setContextMenu(null); }}><Edit className="mr-2 h-4 w-4"/>Rename</Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => { handleShareFolder(contextMenu.item); setContextMenu(null); }}><Share className="mr-2 h-4 w-4"/>Share Folder</Button>
            <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => { setDeleteConfirmation({ item: contextMenu.item }); setContextMenu(null); }}><Trash2 className="mr-2 h-4 w-4"/>Delete Folder</Button>
        </div>
      )}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Resource</DialogTitle>
                <DialogDescription>Select the type of resource you want to add to this folder.</DialogDescription>
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
                {addResourceType !== 'link' && addResourceType !== 'pdf' && addResourceType !== 'model3d' && <Input value={newResourceName} onChange={e => setNewResourceName(e.target.value)} placeholder="Resource Name"/>}
                {addResourceType === 'mechanism' && (
                    <RadioGroup value={mechanismFramework} onValueChange={(v) => setMechanismFramework(v as any)} className="flex items-center space-x-4">
                        <Label>Framework:</Label>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="negative" id="r-neg" /><Label htmlFor="r-neg">Negative</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="positive" id="r-pos" /><Label htmlFor="r-pos">Positive</Label></div>
                    </RadioGroup>
                )}
                 {addResourceType === 'model3d' && (
                    <div className="space-y-2">
                        <Input value={newResourceName} onChange={e => setNewResourceName(e.target.value)} placeholder="Model Name"/>
                        <Input type="file" onChange={handleModelUpload} accept=".glb,.gltf" />
                    </div>
                )}
                 {addResourceType === 'pdf' && (
                    <Button onClick={handlePdfUploadClick} className="w-full">
                        <Upload className="mr-2 h-4 w-4"/> Upload PDF
                    </Button>
                 )}

            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button onClick={handleAddResource} disabled={isFetchingMeta}>
                    {isFetchingMeta ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Add Resource
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ResourcesPage() {
    return <AuthGuard><ResourcesPageContent /></AuthGuard>;
}





    
