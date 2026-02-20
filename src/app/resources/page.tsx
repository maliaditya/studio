

"use client";

import React, { useState, useMemo, FormEvent, useEffect, useRef, useCallback, useDeferredValue } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Library, Folder, Link as LinkIcon, Edit, ExternalLink, ChevronDown, Loader2, Globe, GitMerge, MoreVertical, Youtube, Expand, PictureInPicture, ArrowRight, Workflow, GripVertical, X, Code, MessageSquare, Plus, Share, Pin, PinOff, ChevronLeft, ChevronRight as ChevronRightIcon, Upload, Play, Pause, Copy, Github, Unlink, Edit3, Blocks, Zap, Search, View, File as FileIcon, Paintbrush } from 'lucide-react';
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
import { safeSetLocalStorageItem } from '@/lib/safeStorage';
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

const getYouTubeVideoId = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtube.com')) {
            if (urlObj.pathname.startsWith('/shorts/')) {
                return urlObj.pathname.split('/shorts/')[1] || null;
            }
            return urlObj.searchParams.get('v');
        }
        if (urlObj.hostname.includes('youtu.be')) {
            return urlObj.pathname.slice(1) || null;
        }
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

interface FolderTreeViewProps {
  folders: ResourceFolder[];
  allFolders: ResourceFolder[];
  selectedFolderId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onContextMenu: (event: React.MouseEvent, folder: ResourceFolder) => void;
  editingFolderId: string | null;
  editingFolderName: string;
  setEditingFolderName: (name: string) => void;
  handleSaveEditFolder: () => void;
  setEditingFolderId: (id: string | null) => void;
  level?: number;
  collapsedFolders: Set<string>;
  toggleFolderCollapse: (id: string) => void;
  onPin: (folderId: string) => void;
  pinnedFolderIds: Set<string>;
  activeDragId: string | null;
}

const FolderTreeView: React.FC<FolderTreeViewProps> = ({
  folders, allFolders, selectedFolderId, onSelect, onEdit, onDelete, onContextMenu,
  editingFolderId, editingFolderName, setEditingFolderName, handleSaveEditFolder, setEditingFolderId,
  level = 0, collapsedFolders, toggleFolderCollapse, onPin, pinnedFolderIds, activeDragId
}) => {
  return (
    <ul className={cn("min-w-0", level > 0 && "pl-4 border-l ml-2 space-y-1")}>
      {folders.map(folder => {
        const children = allFolders.filter(f => f.parentId === folder.id).sort((a,b) => a.name.localeCompare(b.name));
        const isCollapsed = collapsedFolders.has(folder.id);
        const isSelected = selectedFolderId === folder.id;
        const isPinned = pinnedFolderIds.has(folder.id);

        return (
          <li key={folder.id} className="min-w-0">
            <DroppableFolder folder={folder} className="min-w-0 w-full">
                <DraggableFolder folder={folder} isDragging={activeDragId === folder.id} className="min-w-0 w-full">
                    <div 
                        onContextMenu={(e) => onContextMenu(e, folder)} 
                        onClick={() => onSelect(folder.id)}
                        className={cn("flex w-full items-start gap-1 p-1 rounded-md hover:bg-muted cursor-pointer group min-w-0 overflow-hidden", isSelected && "bg-accent")}
                    >
                        {children.length > 0 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={(e) => {e.stopPropagation(); toggleFolderCollapse(folder.id); }}>
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isCollapsed && "-rotate-90")} />
                            </Button>
                        )}
                        <Folder className={cn("h-4 w-4 flex-shrink-0", children.length === 0 && "ml-7", isPinned && 'text-yellow-500 fill-yellow-500/20')} />
                        
                        {editingFolderId === folder.id ? (
                            <Input
                                value={editingFolderName}
                                onChange={e => setEditingFolderName(e.target.value)}
                                onBlur={handleSaveEditFolder}
                                onKeyDown={e => e.key === 'Enter' && handleSaveEditFolder()}
                                autoFocus
                                className="h-7 text-sm min-w-0 flex-1"
                            />
                        ) : (
                            <div className="min-w-0 flex-1 overflow-hidden">
                                <span className="block w-full whitespace-normal break-words leading-snug" title={folder.name}>{folder.name}</span>
                            </div>
                        )}
                        
                        <div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onPin(folder.id); }}>
                                {isPinned ? <PinOff className="h-4 w-4 text-yellow-500"/> : <Pin className="h-4 w-4"/>}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(folder.id); }}><Edit className="h-4 w-4"/></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </div>
                    </div>
                </DraggableFolder>
            </DroppableFolder>
            {!isCollapsed && children.length > 0 && (
                <FolderTreeView
                    folders={children}
                    allFolders={allFolders}
                    selectedFolderId={selectedFolderId}
                    onSelect={onSelect}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onContextMenu={onContextMenu}
                    editingFolderId={editingFolderId}
                    editingFolderName={editingFolderName}
                    setEditingFolderName={setEditingFolderName}
                    handleSaveEditFolder={handleSaveEditFolder}
                    setEditingFolderId={setEditingFolderId}
                    level={level + 1}
                    collapsedFolders={collapsedFolders}
                    toggleFolderCollapse={toggleFolderCollapse}
                    onPin={onPin}
                    pinnedFolderIds={pinnedFolderIds}
                    activeDragId={activeDragId}
                />
            )}
          </li>
        );
      })}
    </ul>
  );
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
                                        onConvertToCard={onConvertToCard}
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

const SearchResultCard = React.memo(({
    resource,
    onOpen,
    onDelete,
    onOpenFolder,
}: {
    resource: Resource;
    onOpen: (resourceId: string, event: React.MouseEvent) => void;
    onDelete: (resource: Resource) => void;
    onOpenFolder: (folderId: string) => void;
}) => {
    const youtubeEmbedUrl = getYouTubeEmbedUrl(resource.link);
    const icon = resource.type === 'habit' ? <Zap className="h-4 w-4 text-primary" /> :
        resource.type === 'mechanism' ? <Workflow className="h-4 w-4 text-primary" /> :
        resource.type === 'pdf' ? <FileIcon className="h-4 w-4 text-red-500" /> :
        youtubeEmbedUrl ? <Youtube className="h-4 w-4 text-red-500" /> :
        resource.type === 'card' ? <Library className="h-4 w-4 text-primary" /> :
        <Globe className="h-4 w-4 text-muted-foreground" />;

    return (
        <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
                {icon}
                <CardTitle className="text-base truncate flex-grow" title={resource.name || ""}>{resource.name || "Untitled"}</CardTitle>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenFolder(resource.folderId);
                        }}
                        title="Open Folder"
                    >
                        <Folder className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(resource);
                        }}
                        title="Delete Resource"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2 flex-grow">
                    {resource.description || (resource.link ? resource.link : "No description provided.")}
                </p>
                <div className="mt-auto pt-2 flex gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpen(resource.id, e);
                        }}
                    >
                        Open
                    </Button>
                    {resource.link && (
                        <Button asChild variant="outline" size="sm" className="w-full">
                            <a href={resource.link} target="_blank" rel="noopener noreferrer">Visit</a>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});
SearchResultCard.displayName = 'SearchResultCard';


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
  const defaultCollapseAppliedRef = useRef(false);
  const collapseStateSourceRef = useRef<'saved' | 'default' | null>(null);
  
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

  const [markdownModalState, setMarkdownModalState] = useState<{ isOpen: boolean; resource: Resource | null; point: ResourcePoint | null; }>({ isOpen: false, resource: null, point: null });
  
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  
  const [playingAudio, setPlayingAudio] = useState<{ id: string; isPlaying: boolean } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearchTerm = useMemo(
    () => deferredSearchTerm.trim().toLowerCase(),
    [deferredSearchTerm]
  );
  const isSearching = normalizedSearchTerm.length > 0;
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

      const newPoint: ResourcePoint = {
        id: `point_${Date.now()}`,
        type: 'card',
        text: targetCard.name,
        resourceId: targetCard.id
      };
      
      const updatedSourceCard = { ...sourceCard, points: [...(sourceCard.points || []), newPoint] };
      setResources(prev => prev.map(r => r.id === linkingFromId ? updatedSourceCard : r));
      setLinkingFromId(null);
      toast({ title: "Link Created!", description: `Linked "${targetCard.name}" in "${sourceCard.name}".`});
    }
  }, [linkingFromId, resources, setResources, toast]);
  
  const handleOpenMarkdownModal = (resourceId: string, pointId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    const point = resource?.points?.find(p => p.id === pointId);
    setMarkdownModalState({
      isOpen: true,
      resource: resource || null,
      point: point || null,
    });
  };

  const handleContextMenu = useCallback((event: React.MouseEvent, item: ResourceFolder) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      item: item
    });
  }, []);
  
  const pdfUploadInputRef = useRef<HTMLInputElement>(null);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedResourceFolderId) return;
    const file = e.target.files?.[0];
    if (!file) return;
  
    const newResource: Resource = {
      id: `res_pdf_${Date.now()}`,
      name: file.name,
      folderId: selectedResourceFolderId,
      type: 'pdf',
      createdAt: new Date().toISOString(),
      pdfFileName: file.name,
      hasLocalPdf: true,
    };
  
    try {
      await storePdf(newResource.id, file);
      setResources(prev => [...prev, newResource]);
      toast({ title: `PDF Uploaded`, description: `"${file.name}" has been added.` });
    } catch (error) {
      console.error("Failed to store PDF:", error);
      toast({ title: `Error storing PDF`, description: "Could not save the PDF file to the local database.", variant: "destructive" });
    }
  
    if(e.target) e.target.value = ''; // Reset file input
    setIsAdding(false);
  };
  
  const onConvertToCard = (point: ResourcePoint) => {
    const parentResource = resources.find(r => r.points?.some(p => p.id === point.id));
    if (!parentResource) return;
    createResourceWithHierarchy(parentResource, point, 'card');
  };

  const modelUploadInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateResource = (updatedResource: Resource) => {
    setResources(prev => prev.map(r => r.id === updatedResource.id ? updatedResource : r));
  };
  
  const handleEditLinkText = useCallback((point: ResourcePoint) => {
    const resource = resources.find(r => r.points?.some(p => p.id === point.id));
    if (resource) {
        setCurrentDisplayText(point.displayText || point.text || '');
        setLinkTextDialog({ point, resourceId: resource.id });
    }
  }, [resources]);

  const handleSaveLinkText = () => {
    if (!linkTextDialog) return;
    const { point, resourceId } = linkTextDialog;
    
    setResources(prev => prev.map(r => {
        if (r.id === resourceId) {
            return {
                ...r,
                points: r.points?.map(p => p.id === point.id ? { ...p, displayText: currentDisplayText } : p)
            };
        }
        return r;
    }));

    setLinkTextDialog(null);
    setCurrentDisplayText('');
  };
  

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
            setContextMenu(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // When a new folder is created, expand its parents
    if (newlyCreatedFolderId) {
      const folder = resourceFolders.find(f => f.id === newlyCreatedFolderId);
      if (folder && folder.parentId) {
        let currentId: string | null = folder.parentId;
        const toExpand = new Set<string>();
        while (currentId) {
          toExpand.add(currentId);
          currentId = resourceFolders.find(f => f.id === currentId)?.parentId || null;
        }
        setCollapsedFolders(prev => new Set([...prev].filter(id => !toExpand.has(id))));
      }
      setNewlyCreatedFolderId(null); // Reset after expanding
    }
  }, [newlyCreatedFolderId, resourceFolders]);

  const rootFolders = useMemo(() => {
    return (resourceFolders || []).filter(folder => folder.parentId === null);
  }, [resourceFolders]);
  
  useEffect(() => {
    // Load collapsed state from localStorage
    const savedCollapsed = localStorage.getItem('collapsedResourceFolders');
    if (savedCollapsed) {
        try {
            setCollapsedFolders(new Set(JSON.parse(savedCollapsed)));
            collapseStateSourceRef.current = 'saved';
        } catch (e) {
            console.error("Failed to parse collapsed folders state from localStorage", e);
            collapseStateSourceRef.current = 'default';
        }
    } else {
        collapseStateSourceRef.current = 'default';
    }
  }, []);

  useEffect(() => {
    if (collapseStateSourceRef.current !== 'default' || defaultCollapseAppliedRef.current) return;
    if (!resourceFolders || resourceFolders.length === 0) return;
    setCollapsedFolders(new Set(resourceFolders.map(folder => folder.id)));
    defaultCollapseAppliedRef.current = true;
  }, [resourceFolders]);

  useEffect(() => {
    // Save collapsed state to localStorage
    if (resourceFolders) {
        safeSetLocalStorageItem('collapsedResourceFolders', JSON.stringify(Array.from(collapsedFolders)));
    }
  }, [collapsedFolders, resourceFolders]);
  
  const handleAddFolder = (parentId: string | null = null) => {
    if (!newFolderName.trim()) {
      toast({ title: 'Folder name cannot be empty', variant: 'destructive' });
      return;
    }
    const newFolder: ResourceFolder = {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      parentId: parentId,
      icon: 'Folder'
    };
    setResourceFolders(prev => [...(prev || []), newFolder]);
    setNewFolderName('');
    setIsAdding(false);
    
    // If it's a subfolder, make sure the parent is expanded
    if(parentId) {
        setCollapsedFolders(prev => {
            const newSet = new Set(prev);
            newSet.delete(parentId);
            return newSet;
        });
    }
  };

  const handleEditFolder = (folderId: string) => {
    setEditingFolderId(folderId);
    setEditingFolderName(resourceFolders.find(f => f.id === folderId)?.name || '');
    setContextMenu(null);
  };
  
  const handleSaveEditFolder = () => {
    if (!editingFolderId || !editingFolderName.trim()) return;
    setResourceFolders(prev => prev.map(f => f.id === editingFolderId ? { ...f, name: editingFolderName.trim() } : f));
    setEditingFolderId(null);
  };

  const handleDeleteItem = () => {
    if (!deleteConfirmation) return;
    const { item } = deleteConfirmation;

    if ('parentId' in item) { // It's a ResourceFolder
      const folderToDelete = item as ResourceFolder;
      const childIds = new Set<string>();
      const queue = [folderToDelete.id];
      childIds.add(folderToDelete.id);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        resourceFolders.forEach(folder => {
          if (folder.parentId === currentId) {
            childIds.add(folder.id);
            queue.push(folder.id);
          }
        });
      }
      
      setResourceFolders(prev => prev.filter(f => !childIds.has(f.id)));
      setResources(prev => prev.filter(r => !childIds.has(r.folderId)));
      
      if (selectedResourceFolderId && childIds.has(selectedResourceFolderId)) {
        setSelectedResourceFolderId(folderToDelete.parentId);
      }
      
      toast({ title: "Folder Deleted", description: `"${folderToDelete.name}" and all its contents were deleted.`});
    } else { // It's a Resource
      const resourceToDelete = item as Resource;
      setResources(prev => prev.filter(r => r.id !== resourceToDelete.id));
      toast({ title: "Resource Deleted", description: `"${resourceToDelete.name}" was deleted.`});
    }

    setDeleteConfirmation(null);
    setContextMenu(null);
  };

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleAddResource = async () => {
    if (!selectedResourceFolderId) return;

    if (addResourceType === 'pdf') {
        pdfUploadInputRef.current?.click();
        return;
    }

    let resourceName = newResourceName.trim();
    if (addResourceType === 'link' && !newResourceLink.trim()) {
      toast({ title: "URL is required for link type.", variant: "destructive" });
      return;
    }
    if ((addResourceType === 'card' || addResourceType === 'habit' || addResourceType === 'mechanism' || addResourceType === 'model3d') && !resourceName) {
      toast({ title: "Name is required for this resource type.", variant: "destructive" });
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
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch metadata.');
        }

        finalResource = {
          id: `res_${Date.now()}`,
          name: result.title || 'Untitled Resource',
          link: newResourceLink.trim(),
          description: result.description || '',
          folderId: selectedResourceFolderId,
          iconUrl: getFaviconUrl(newResourceLink.trim()),
          type: 'link',
          createdAt: new Date().toISOString(),
        };
      } catch (error) {
        toast({
          title: "Error adding resource",
          description: error instanceof Error ? error.message : "Could not fetch metadata from URL.",
          variant: "destructive",
        });
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
            name: resourceName || file3d.name,
            folderId: selectedResourceFolderId,
            type: 'model3d',
            modelUrl,
            createdAt: new Date().toISOString(),
        };
    } else {
      finalResource = {
        id: `res_${Date.now()}`,
        name: resourceName,
        folderId: selectedResourceFolderId,
        type: addResourceType,
        points: [],
        icon: 'Library',
        createdAt: new Date().toISOString(),
        mechanismFramework: addResourceType === 'mechanism' ? mechanismFramework : undefined,
      };
    }

    setResources(prev => [...prev, finalResource]);
    setIsAdding(false);
    setNewResourceName('');
    setNewResourceLink('');
  };
  
  const handleOpenMindMapForFolder = (folderId: string) => {
      setMindMapRootFolderId(folderId);
      setIsMindMapModalOpen(true);
      setContextMenu(null);
  };
  
  const handleShareFolder = async (folder: ResourceFolder) => {
      setContextMenu(null);
      const childFolders = getDescendantFolders(folder.id, resourceFolders);
      const sharedFolderIds = new Set<string>([folder.id, ...childFolders.map((f) => f.id)]);
      const scopedResources = resources.filter((r) => sharedFolderIds.has(r.folderId));
      const payload = { folder, allResources: scopedResources, childFolders, username: currentUser?.username || 'anonymous' };
      try {
          const response = await fetch('/api/share/folder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
          });
          const raw = await response.text();
          let result: any = null;
          try {
            result = raw ? JSON.parse(raw) : null;
          } catch {
            result = null;
          }
          if (!response.ok) {
            const message = result?.error
              || (response.status === 413 ? 'Share payload is too large. Try sharing a smaller folder.' : null)
              || (raw?.trim() || 'Failed to share folder');
            throw new Error(message);
          }
          
          setShareUrl(`${window.location.origin}${result.publicUrl}`);
          setShareDialogOpen(true);
      } catch (error) {
          toast({ title: "Sharing Failed", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
      }
  };

  const getDescendantFolders = (folderId: string, allFolders: ResourceFolder[]): ResourceFolder[] => {
    const descendants: ResourceFolder[] = [];
    const queue = [folderId];
    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = allFolders.filter(f => f.parentId === currentId);
        descendants.push(...children);
        children.forEach(child => queue.push(child.id));
    }
    return descendants;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
        const activeItem = active.data.current;
        const overItem = over.data.current;

        if (activeItem?.type === 'folder' && overItem?.type === 'folder') {
             // Re-parent folder
            setResourceFolders(folders => folders.map(f => 
                f.id === active.id ? { ...f, parentId: over.id as string } : f
            ));
        } else if (activeItem?.type === 'card' && overItem?.type === 'folder') {
            // Move card to folder
            setResources(resources => resources.map(r => 
                r.id === active.id ? { ...r, folderId: over.id as string } : r
            ));
        }
    }
  };

  const toggleFolderPin = (folderId: string) => {
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

  const closeTab = (folderId: string) => {
      setActiveResourceTabIds(prev => prev.filter(id => id !== folderId));
      if (selectedResourceFolderId === folderId) {
          setSelectedResourceFolderId(null);
      }
  };
  
  const handleTabSelect = (folderId: string) => {
    setSelectedResourceFolderId(folderId);
    if (!activeResourceTabIds.includes(folderId)) {
        setActiveResourceTabIds(prev => [...prev, folderId]);
    }
  };
  
  const searchIndex = useMemo(() => {
    if (!resources) return [];
    return resources.map(res => {
      const pointsText = (res.points || []).map(p => p.text ?? "").join(" ");
      const pointsDisplayText = (res.points || []).map(p => (p as { displayText?: string }).displayText ?? "").join(" ");
      const haystack = [
        res.name ?? "",
        res.description ?? "",
        res.link ?? "",
        pointsText,
        pointsDisplayText,
      ].join(" ").toLowerCase();
      return { res, haystack };
    });
  }, [resources]);

  const filteredResources = useMemo(() => {
    if (!resources) return [];

    if (normalizedSearchTerm) {
      return searchIndex
        .filter(item => item.haystack.includes(normalizedSearchTerm))
        .map(item => item.res);
    }
    
    if (selectedResourceFolderId) {
        return resources.filter(res => res.folderId === selectedResourceFolderId);
    }

    return [];
  }, [resources, selectedResourceFolderId, normalizedSearchTerm, searchIndex]);

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden">
    <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 gap-4 p-4">
      <input type="file" ref={pdfUploadInputRef} onChange={handlePdfUpload} accept=".pdf" className="hidden" />
      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveId(e.active.id.toString())}
        onDragEnd={handleDragEnd}
      >
        <div className="md:col-span-1 h-full min-h-0">
            <Card className="h-full min-h-0 flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Folders</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCollapsedFolders(new Set(resourceFolders.map(folder => folder.id)))}
                            >
                                Collapse All
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <PlusCircle className="h-4 w-4" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-60">
                                    <form onSubmit={(e) => { e.preventDefault(); handleAddFolder(); }} className="flex gap-2">
                                    <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="New folder name..." />
                                    <Button type="submit">Add</Button>
                                    </form>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow min-h-0 p-2 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="min-w-0 overflow-x-hidden">
                            <FolderTreeView
                                folders={rootFolders}
                                allFolders={resourceFolders}
                                selectedFolderId={selectedResourceFolderId}
                                onSelect={setSelectedResourceFolderId}
                                onEdit={handleEditFolder}
                                onDelete={(id) => setDeleteConfirmation({ item: resourceFolders.find(f => f.id === id)! })}
                                onContextMenu={handleContextMenu}
                                editingFolderId={editingFolderId}
                                editingFolderName={editingFolderName}
                                setEditingFolderName={setEditingFolderName}
                                handleSaveEditFolder={handleSaveEditFolder}
                                setEditingFolderId={setEditingFolderId}
                                collapsedFolders={collapsedFolders}
                                toggleFolderCollapse={toggleFolderCollapse}
                                onPin={toggleFolderPin}
                                pinnedFolderIds={pinnedFolderIds}
                                activeDragId={activeId}
                            />
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
        <div className="h-full min-h-0 md:col-span-3 lg:col-span-4 xl:col-span-3">
            <Card className="h-full min-h-0 flex flex-col">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
                         <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search resources..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => setIsAdding(true)} disabled={!selectedResourceFolderId}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Resource
                            </Button>
                            <Button variant="outline" onClick={() => handleOpenMindMapForFolder(selectedResourceFolderId || 'root')} disabled={!selectedResourceFolderId}>
                                <GitMerge className="mr-2 h-4 w-4 text-purple-500" />
                                Mind Map
                            </Button>
                        </div>
                    </div>
                    {/* Tabs for active/pinned folders */}
                    {activeResourceTabIds.length > 0 && (
                        <div className="mt-4 border-t pt-2" ref={tabsContainerRef}>
                            <ScrollArea className="w-full whitespace-nowrap">
                                <div className="flex space-x-2 pb-2">
                                {activeResourceTabIds.map(id => {
                                    const folder = resourceFolders?.find(f => f.id === id);
                                    return folder ? (
                                    <Button
                                        key={id}
                                        variant={selectedResourceFolderId === id ? "default" : "secondary"}
                                        size="sm"
                                        onClick={() => handleTabSelect(id)}
                                        className="h-8 group/tab relative min-w-0 max-w-[220px] justify-start pr-5 overflow-hidden"
                                    >
                                        <span className="block min-w-0 max-w-full truncate" title={folder.name}>{folder.name}</span>
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => { e.stopPropagation(); closeTab(id); }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    closeTab(id);
                                                }
                                            }}
                                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover/tab:opacity-100 transition-opacity flex items-center justify-center"
                                            aria-label={`Close ${folder.name}`}
                                        >
                                            <X className="h-3 w-3" />
                                        </span>
                                    </Button>
                                    ) : null;
                                })}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-4 flex-grow min-h-0 overflow-hidden">
                    <h2 className="text-2xl font-bold mb-4 truncate" title={selectedResourceFolderId && !searchTerm && resourceFolders?.find(f => f.id === selectedResourceFolderId)?.name
                        ? resourceFolders.find(f => f.id === selectedResourceFolderId)?.name
                        : searchTerm ? `Search results for "${searchTerm}"` : 'Select a folder'}>
                        {selectedResourceFolderId && !searchTerm && resourceFolders?.find(f => f.id === selectedResourceFolderId)?.name
                        ? resourceFolders.find(f => f.id === selectedResourceFolderId)?.name
                        : searchTerm ? `Search results for "${searchTerm}"` : 'Select a folder'}
                    </h2>
                    
                    <ScrollArea className="h-full pr-4">
                        {filteredResources.length > 0 ? (
                            isSearching ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredResources.map(res => (
                                        <SearchResultCard
                                            key={res.id}
                                            resource={res}
                                            onOpen={(resourceId, event) => openGeneralPopup(resourceId, event)}
                                            onDelete={(resource) => setDeleteConfirmation({ item: resource })}
                                            onOpenFolder={(folderId) => {
                                                handleTabSelect(folderId);
                                                setSearchTerm('');
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <SortableContext items={filteredResources.map(r => r.id)}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredResources.map(res => (
                                        <SortableResourceCard key={res.id} item={res} className="h-full" linkingFromId={linkingFromId}>
                                        {res.type === 'habit' ? (
                                            <HabitResourceCard resource={res} onUpdate={handleUpdateResource} onDelete={() => setDeleteConfirmation({item: res})} onLinkClick={handleLinkClick} linkingFromId={linkingFromId} onOpenNestedPopup={(resourceId, event) => openGeneralPopup(resourceId, event)} />
                                        ) : res.type === 'mechanism' ? (
                                            <MechanismResourceCard resource={res} onUpdate={handleUpdateResource} onDelete={() => setDeleteConfirmation({item: res})} onLinkClick={handleLinkClick} linkingFromId={linkingFromId} onOpenNestedPopup={(resourceId, event) => openGeneralPopup(resourceId, event)} />
                                        ) : res.type === 'card' ? (
                                            <ResourceCardComponent
                                                resource={res}
                                                onUpdate={handleUpdateResource}
                                                onDelete={() => setDeleteConfirmation({ item: res })}
                                                onOpenNestedPopup={(resourceId, event) => openGeneralPopup(resourceId, event)}
                                                onOpenMarkdownModal={handleOpenMarkdownModal}
                                                playingAudio={playingAudio}
                                                setPlayingAudio={setPlayingAudio}
                                                onLinkClick={handleLinkClick}
                                                linkingFromId={linkingFromId}
                                                onEditLinkText={handleEditLinkText}
                                                onConvertToCard={onConvertToCard}
                                                onOpenPdfViewer={openPdfViewer}
                                            />
                                        ) : (
                                            <ResourceCard
                                                resource={res}
                                                onUpdate={handleUpdateResource}
                                                onDelete={() => setDeleteConfirmation({ item: res })}
                                                onOpenNestedPopup={(resourceId, event) => openGeneralPopup(resourceId, event)}
                                                onLinkClick={handleLinkClick}
                                                linkingFromId={linkingFromId}
                                                onEditLinkText={handleEditLinkText}
                                                onConvertToCard={onConvertToCard}
                                                onOpenPdfViewer={openPdfViewer}
                                            />
                                        )}
                                        </SortableResourceCard>
                                    ))}
                                </div>
                                </SortableContext>
                            )
                        ) : (
                            <div className="text-center text-muted-foreground pt-16">
                            <p>{searchTerm ? "No resources found matching your search." : "This folder is empty. Add a resource to get started."}</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
        <DragOverlay>
            {activeId && activeId.startsWith('folder_') ? <div className="p-2 bg-primary text-primary-foreground rounded-md shadow-lg flex items-center gap-2"><Folder className="h-4 w-4"/> {resourceFolders?.find(f => f.id === activeId)?.name}</div> : null}
            {activeId && activeId.startsWith('res_') ? <div className="p-2 bg-primary text-primary-foreground rounded-md shadow-lg flex items-center gap-2"><Library className="h-4 w-4"/> {resources.find(r => r.id === activeId)?.name}</div> : null}
        </DragOverlay>
      </DndContext>
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="absolute z-50 w-48 bg-popover border rounded-md shadow-lg p-1"
          style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }}
        >
          <Button variant="ghost" className="w-full justify-start" onClick={() => handleOpenMindMapForFolder(contextMenu.item.id)}>
            <GitMerge className="h-4 w-4 mr-2" /> Mind Map
          </Button>
           <Button variant="ghost" className="w-full justify-start" onClick={() => handleShareFolder(contextMenu.item)}>
            <Share className="h-4 w-4 mr-2" /> Share
          </Button>
          <Button variant="ghost" className="w-full justify-start text-destructive" onClick={() => setDeleteConfirmation({ item: contextMenu.item })}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </div>
      )}

      {deleteConfirmation && (
          <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will permanently delete "{deleteConfirmation.item.name}" and all of its contents. This action cannot be undone.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteItem}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      )}

        <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Resource</DialogTitle>
                    <DialogDescription>Select the type of resource you want to add.</DialogDescription>
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

        <Dialog open={isMindMapModalOpen} onOpenChange={setIsMindMapModalOpen}>
            <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Mind Map for: {resourceFolders?.find(f => f.id === mindMapRootFolderId)?.name || 'Root'}</DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                  <MindMapViewer rootFolderId={mindMapRootFolderId} />
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Folder</DialogTitle>
              <DialogDescription>
                Anyone with this link can view the contents of this folder and its subfolders.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <Input value={shareUrl} readOnly />
              <Button onClick={() => { navigator.clipboard.writeText(shareUrl); toast({ title: 'Copied to clipboard!' }); }} size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={markdownModalState.isOpen} onOpenChange={(isOpen) => setMarkdownModalState(prev => ({...prev, isOpen}))}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>{markdownModalState.resource?.name || "Content"}</DialogTitle>
            </DialogHeader>
            <div className="flex-grow min-h-0">
                <ScrollArea className="h-full">
                    <div className="p-6">
                      {markdownModalState.point?.type === 'markdown' ? (
                        <div className="prose dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownModalState.point.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <SyntaxHighlighter language="javascript" style={vscDarkPlus} customStyle={{margin: 0}} showLineNumbers>
                          {markdownModalState.point?.text || ""}
                        </SyntaxHighlighter>
                      )}
                    </div>
                </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

         <Dialog open={modelModalState.isOpen} onOpenChange={(isOpen) => setModelModalState({isOpen, modelUrl: null})}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>3D Model Viewer</DialogTitle>
                </DialogHeader>
                 <div className="flex-grow min-h-0">
                    {modelModalState.modelUrl && <ModelViewer modelUrl={modelModalState.modelUrl} />}
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={!!linkTextDialog} onOpenChange={() => setLinkTextDialog(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Link Display Text</DialogTitle>
                    <DialogDescription>
                        Change how the link is displayed without changing the URL.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="display-text">Display Text</Label>
                    <Input 
                        id="display-text" 
                        value={currentDisplayText}
                        onChange={(e) => setCurrentDisplayText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveLinkText()}
                        autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-2 truncate">
                        URL: {linkTextDialog?.point.text}
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setLinkTextDialog(null)}>Cancel</Button>
                    <Button onClick={handleSaveLinkText}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
    </div>
  );
}


const ResourceCard = React.memo(({ resource, onUpdate, onDelete, onOpenNestedPopup, onLinkClick, linkingFromId, onEditLinkText, onConvertToCard, onOpenPdfViewer }: Omit<ResourceCardComponentProps, 'onOpenMarkdownModal' | 'playingAudio' | 'setPlayingAudio'> & { onOpenPdfViewer: (resource: Resource) => void }) => {
    const { setFloatingVideoUrl } = useAuth();
    const [embedUrl, setEmbedUrl] = useState<string | null>(null);
    const [showEmbed, setShowEmbed] = useState(false);
    const [showModelViewer, setShowModelViewer] = useState(false);

    const youtubeEmbedUrl = getYouTubeEmbedUrl(resource.link);
    const youtubeVideoId = getYouTubeVideoId(resource.link);
    const youtubeThumbUrl = youtubeVideoId ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg` : null;
    const imageEmbedUrl = isImageUrl(resource.link) ? resource.link : null;

    if (imageEmbedUrl) {
        return (
            <Card className="overflow-hidden h-full flex flex-col">
                <div className="aspect-video w-full bg-black relative">
                    <Image src={imageEmbedUrl} alt={resource.name} fill style={{ objectFit: "contain" }} data-ai-hint="illustration" />
                </div>
                <CardContent className="p-3 flex-grow flex flex-col">
                    <p className="font-semibold text-sm truncate" title={resource.name}>{resource.name}</p>
                    <div className="mt-auto pt-2">
                        <Button asChild variant="secondary" size="sm" className="w-full"><a href={resource.link} target="_blank" rel="noopener noreferrer">View Full Size <ExternalLink className="ml-2 h-3 w-3"/></a></Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (youtubeEmbedUrl) {
         return (
            <>
                <Card className="overflow-hidden h-full flex flex-col">
                    <div className="aspect-video w-full bg-black relative group">
                        {showEmbed ? (
                            <iframe src={youtubeEmbedUrl} title={resource.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" className="w-full h-full"></iframe>
                        ) : (
                            <div
                                role="button"
                                tabIndex={0}
                                className="relative w-full h-full cursor-pointer"
                                onClick={() => setShowEmbed(true)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setShowEmbed(true);
                                    }
                                }}
                                aria-label={`Play ${resource.name}`}
                            >
                                {youtubeThumbUrl ? (
                                    <Image src={youtubeThumbUrl} alt={resource.name} fill style={{ objectFit: "cover" }} unoptimized />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Preview unavailable</div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="h-14 w-14 rounded-full bg-black/60 flex items-center justify-center">
                                        <Play className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                            </div>
                        )}
                         <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={() => setFloatingVideoUrl(resource.link!)}><PictureInPicture className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={() => setEmbedUrl(youtubeEmbedUrl)}><Expand className="h-4 w-4" /></Button>
                        </div>
                    </div>
                    <CardContent className="p-3 flex-grow flex flex-col">
                        <div className="flex items-center gap-2"><Youtube className="h-4 w-4 text-red-500"/><p className="font-semibold text-sm truncate" title={resource.name}>{resource.name}</p></div>
                    </CardContent>
                </Card>
                <Dialog open={!!embedUrl} onOpenChange={(isOpen) => !isOpen && setEmbedUrl(null)}>
                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2"><div className="flex-grow min-h-0">{embedUrl && (<iframe src={embedUrl} className="w-full h-full border-0 rounded-md" title="Embedded Resource"></iframe>)}</div></DialogContent>
                </Dialog>
            </>
        )
    }

    if (resource.type === 'model3d') {
        const modelSrc = resource.modelUrl || resource.link;
        return (
            <>
                <Card className="h-full flex flex-col">
                    <CardHeader className="flex-row items-center gap-3 space-y-0">
                        <Library className="h-5 w-5 flex-shrink-0 text-primary" />
                        <CardTitle className="text-base truncate flex-grow" title={resource.name}>{resource.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col pt-0">
                        <p className="text-xs text-muted-foreground line-clamp-2 flex-grow">{resource.description || '3D model resource.'}</p>
                        <div className="mt-auto pt-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="w-full"
                                disabled={!modelSrc}
                                onClick={() => setShowModelViewer(true)}
                            >
                                Open 3D Model
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <Dialog open={showModelViewer} onOpenChange={setShowModelViewer}>
                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2">
                        <div className="flex-grow min-h-0">
                            {modelSrc ? <ModelViewer modelUrl={modelSrc} /> : <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No model source available.</div>}
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        );
    }
     
     if (resource.type === 'pdf') {
        return (
            <Card className="h-full flex flex-col cursor-pointer" onClick={() => onOpenPdfViewer(resource)}>
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                    <FileIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <CardTitle className="text-base truncate flex-grow" title={resource.name}>{resource.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Click to view PDF</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
                {resource.iconUrl ? <Image src={resource.iconUrl} alt="" width={16} height={16} className="flex-shrink-0" unoptimized/> : <Globe className="h-4 w-4 flex-shrink-0"/>}
                <CardTitle className="text-base truncate flex-grow" title={resource.name}>{resource.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col pt-0">
                <p className="text-xs text-muted-foreground line-clamp-2 flex-grow">{resource.description || 'No description provided.'}</p>
                <div className="mt-auto pt-2">
                    <Button asChild variant="secondary" size="sm" className="w-full"><a href={resource.link} target="_blank" rel="noopener noreferrer">Visit Link <ExternalLink className="ml-2 h-3 w-3"/></a></Button>
                </div>
            </CardContent>
        </Card>
    );
});
ResourceCard.displayName = 'ResourceCard';


export default function ResourcesPage() {
    return (
        <AuthGuard>
            <ResourcesPageContent />
        </AuthGuard>
    )
}

    
