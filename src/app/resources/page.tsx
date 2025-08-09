

"use client";

import React, { useState, useMemo, FormEvent, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Library, Folder, Link as LinkIcon, Edit, ExternalLink, ChevronDown, Loader2, Globe, GitMerge, MoreVertical, Youtube, Expand, PictureInPicture, ArrowRight, Workflow, GripVertical, X, Code, MessageSquare, Plus, Share, Pin, PinOff, ChevronLeft, ChevronRight as ChevronRightIcon, Upload, Play, Pause, Copy, Github, Unlink, Edit3, Blocks, Zap, Search, View } from 'lucide-react';
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
import { format, parseISO } from 'date-fns';
import { ModelViewer } from '@/components/ModelViewer';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


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

interface PopupState {
  resourceId: string;
  level: number;
  x: number;
  y: number;
  parentId?: string;
  width?: number;
}

const EditableField = ({ field, subField, prefix, suffix, resource, onUpdate }: { 
    field: keyof Resource, 
    subField?: string, 
    prefix: string, 
    suffix?: string, 
    resource: Resource, 
    onUpdate: (updatedResource: Resource) => void 
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    
    const handleBlur = () => {
        if (!editorRef.current) return;
        const editableSpan = editorRef.current.querySelector<HTMLSpanElement>('[contenteditable=true]');
        const newValue = editableSpan?.textContent || '';
        
        let currentValue = '';
        if (subField && typeof resource[field] === 'object' && resource[field] !== null) {
            currentValue = (resource[field] as any)[subField] || '';
        } else {
            currentValue = (resource[field] as string) || '';
        }

        if (newValue !== currentValue) {
            let updatedResource = { ...resource };
            if (subField) {
                updatedResource[field] = { ...(updatedResource[field] as object), [subField]: newValue };
            } else {
                updatedResource[field] = newValue as any;
            }
            onUpdate(updatedResource);
        }
    };
    
    let displayValue = '';
    if (subField && typeof resource[field] === 'object' && resource[field] !== null) {
      displayValue = (resource[field] as any)[subField] || '';
    } else {
      displayValue = (resource[field] as string) || '';
    }

    return (
        <div 
          ref={editorRef}
          onBlur={handleBlur}
          className="editable-sentence"
        >
          <span contentEditable={false} className="uneditable-text">{prefix}</span>
          <span 
            contentEditable={true} 
            suppressContentEditableWarning={true}
            className="editable-placeholder"
            dangerouslySetInnerHTML={{ __html: displayValue || '...' }} 
          />
          {suffix && <span contentEditable={false} className="uneditable-text">{suffix}</span>}
        </div>
    );
};


const DoubleEditableField = ({ prefix, suffix, value1, value2, onUpdate1, onUpdate2, placeholder1 = "...", placeholder2 = "..." }: { 
    prefix: string;
    suffix: string;
    value1: string;
    value2: string;
    onUpdate1: (newValue: string) => void;
    onUpdate2: (newValue: string) => void;
    placeholder1?: string;
    placeholder2?: string;
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    
    const handleBlur = () => {
        if (!editorRef.current) return;
        const editableSpans = editorRef.current.querySelectorAll<HTMLSpanElement>('[contenteditable=true]');
        const newValue1 = editableSpans[0]?.textContent || '';
        const newValue2 = editableSpans[1]?.textContent || '';
        if (newValue1 !== value1) onUpdate1(newValue1);
        if (newValue2 !== value2) onUpdate2(newValue2);
    };

    return (
        <div 
          ref={editorRef}
          onBlur={handleBlur}
          className="editable-sentence"
        >
          <span contentEditable={false} className="uneditable-text">{prefix}</span>
          <span 
            contentEditable={true} 
            suppressContentEditableWarning={true}
            className="editable-placeholder"
            dangerouslySetInnerHTML={{ __html: value1 || placeholder1 }} 
          />
          <span contentEditable={false} className="uneditable-text">,</span>
          <span 
            contentEditable={true} 
            suppressContentEditableWarning={true}
            className="editable-placeholder"
            dangerouslySetInnerHTML={{ __html: value2 || placeholder2 }} 
          />
          <span contentEditable={false} className="uneditable-text">{suffix}</span>
        </div>
    );
};


const EmotionEditableField = ({ value1, value2, onUpdate1, onUpdate2, label, placeholder1 = "...", placeholder2 = "..." }: { 
    value1: string;
    value2: string;
    onUpdate1: (newValue: string) => void;
    onUpdate2: (newValue: string) => void;
    label: string;
    placeholder1?: string;
    placeholder2?: string;
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    
    const handleBlur = () => {
        if (!editorRef.current) return;
        const editableSpans = editorRef.current.querySelectorAll<HTMLSpanElement>('[contenteditable=true]');
        const newValue1 = editableSpans[0]?.textContent || '';
        const newValue2 = editableSpans[1]?.textContent || '';
        if (newValue1 !== value1) onUpdate1(newValue1);
        if (newValue2 !== value2) onUpdate2(newValue2);
    };

    return (
        <div 
          ref={editorRef}
          onBlur={handleBlur}
          className="editable-sentence"
        >
          <span contentEditable={false} className="uneditable-text">Emotion/Image: That one</span>
          <span 
            contentEditable={true} 
            suppressContentEditableWarning={true}
            className="editable-placeholder"
            dangerouslySetInnerHTML={{ __html: value1 || placeholder1 }} 
          />
          <span contentEditable={false} className="uneditable-text">{label}</span>
          <span 
            contentEditable={true} 
            suppressContentEditableWarning={true}
            className="editable-placeholder"
            dangerouslySetInnerHTML={{ __html: value2 || placeholder2 }} 
          />
          <span contentEditable={false} className="uneditable-text">.</span>
        </div>
    );
};


interface ResourcePopupProps {
  popupState: PopupState;
  resource: Resource;
  onClose: (resourceId: string) => void;
  onUpdate: (updatedResource: Resource) => void;
  playingAudio: { id: string; isPlaying: boolean } | null;
  setPlayingAudio: React.Dispatch<React.SetStateAction<{ id: string; isPlaying: boolean } | null>>;
  onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState: PopupState) => void;
  onEditLinkText: (point: ResourcePoint) => void;
  onConvertToCard: (point: ResourcePoint) => void;
}

const ResourceCardComponent = ({ resource, onUpdate, onDelete, onOpenNestedPopup, onOpenMarkdownModal, playingAudio, setPlayingAudio, onLinkClick, linkingFromId, isPopup = false, onEditLinkText, onClosePopup, onConvertToCard }: { 
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
}) => {
    const { resources, setFloatingVideoUrl } = useAuth();
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
    
    const hasMarkdownContent = (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
    
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
                        {hasMarkdownContent && !isPopup && (
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
              <div className={cn(hasMarkdownContent ? 'h-[450px]' : '')}>
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
                                        onEditLinkText={onEditLinkText}
                                        onConvertToCard={onConvertToCard}
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
};

interface ResourcePopupProps {
  popupState: PopupState;
  resource: Resource;
  onClose: (resourceId: string) => void;
  onUpdate: (updatedResource: Resource) => void;
  playingAudio: { id: string; isPlaying: boolean } | null;
  setPlayingAudio: React.Dispatch<React.SetStateAction<{ id: string; isPlaying: boolean } | null>>;
  onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState: PopupState) => void;
  onEditLinkText: (point: ResourcePoint) => void;
  onConvertToCard: (point: ResourcePoint) => void;
}

const ResourcePopupCard = ({ popupState, resource, onClose, onUpdate, playingAudio, setPlayingAudio, onOpenNestedPopup, onEditLinkText, onConvertToCard }: ResourcePopupProps) => {
    const { resources } = useAuth();
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `popup-${popupState.resourceId}`,
    });
    
    const [editingTitle, setEditingTitle] = useState(false);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const [linkCardPopoverOpen, setLinkCardPopoverOpen] = useState(false);
    const [linkedCardId, setLinkedCardId] = useState<string>('');


    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        width: `${popupState.width || 512}px`,
        willChange: 'transform',
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }
    
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

    const handleTitleChange = (newTitle: string) => {
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

    const handleUpdatePoint = (pointId: string, newText: string) => {
        const updatedPoints = (resource.points || []).map(p =>
            p.id === pointId ? { ...p, text: newText } : p
        );
        onUpdate({ ...resource, points: updatedPoints });
    };

    const handleDeletePoint = (pointId: string) => {
        const updatedPoints = (resource.points || []).filter(p => p.id !== pointId);
        onUpdate({ ...resource, points: updatedPoints });
    };
    
    const handleClose = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        setPlayingAudio(null);
        onClose(resource.id);
    }
    
    const handleLinkClick = (e: React.MouseEvent, pointResourceId: string) => {
      e.stopPropagation();
      onOpenNestedPopup(pointResourceId, e, popupState);
    };

    const handlePointDragEnd = (event: DragEndEvent) => {
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
        <div ref={setNodeRef} style={style} {...attributes} className="z-[70]">
            <input type="file" ref={audioInputRef} onChange={handleAudioUpload} accept="audio/*" className="hidden" />
            <Card className="shadow-2xl border-2 border-primary/30 bg-card max-h-[70vh] flex flex-col relative group">
                <div 
                    className="absolute top-2 left-2 z-20 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                    {...listeners}
                >
                    <GripVertical className="h-5 w-5 text-muted-foreground/50"/>
                </div>
                
                 <div className="absolute top-2 right-2 z-20 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {resource.audioUrl ? (
                        <>
                           <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDownCapture={togglePlayAudio}>
                                {playingAudio?.id === resource.id && playingAudio.isPlaying ? <Pause className="h-4 w-4 text-green-500" /> : <Play className="h-4 w-4 text-green-500" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => audioInputRef.current?.click()}>
                                <Upload className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => audioInputRef.current?.click()}>
                            <Upload className="h-4 w-4" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDownCapture={handleClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <CardHeader className="p-3 pt-8 relative flex-shrink-0 text-center">
                    <div className="flex items-center justify-center gap-2">
                        {resource.type === 'habit' ? <Zap className="h-4 w-4" /> : resource.type === 'mechanism' ? <Workflow className="h-4 w-4"/> : <Library className="h-4 w-4" />}
                        {editingTitle ? (
                            <Input 
                                value={resource.name} 
                                onChange={(e) => handleTitleChange(e.target.value)} 
                                onBlur={() => setEditingTitle(false)} 
                                onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                                className="h-8 text-base"
                                autoFocus
                            />
                        ) : (
                            <CardTitle className="text-base truncate cursor-pointer" onClick={() => setEditingTitle(true)}>
                                {resource.name}
                            </CardTitle>
                        )}
                    </div>
                     {resource.createdAt && (
                        <CardDescription className="text-xs pt-1">
                            Created: {format(parseISO(resource.createdAt), 'MMM d, yyyy')}
                        </CardDescription>
                    )}
                </CardHeader>
                <div className="flex-grow min-h-0 overflow-y-auto">
                    <CardContent className="p-3 pt-0">
                        {(resource.type === 'habit' || resource.type === 'mechanism') ? (
                            <div className="space-y-1">
                                {resource.mechanismFramework === 'positive' ? (
                                    <>
                                        <EditableField field="trigger" subField="action" prefix="Action: When I" suffix="," resource={resource} onUpdate={onUpdate} />
                                        <EditableField field="response" subField="visualize" prefix="Mechanism: It triggers" suffix="internally." resource={resource} onUpdate={onUpdate} />
                                        <EditableField field="benefit" prefix="Benefit: This opens" suffix="." resource={resource} onUpdate={onUpdate} />
                                        <DoubleEditableField 
                                            prefix="Key Condition: Only when"
                                            suffix="happens."
                                            value1={resource.newResponse?.visualize || ""}
                                            value2={resource.newResponse?.action || ""}
                                            onUpdate1={(newValue) => onUpdate({ ...resource, newResponse: { ...resource.newResponse, visualize: newValue } })}
                                            onUpdate2={(newValue) => onUpdate({ ...resource, newResponse: { ...resource.newResponse, action: newValue } })}
                                            placeholder1="..."
                                            placeholder2="..."
                                        />
                                        <EmotionEditableField
                                            value1={resource.trigger?.feeling || ''}
                                            value2={resource.reward || ''}
                                            onUpdate1={(newValue) => onUpdate({ ...resource, trigger: { ...resource.trigger, feeling: newValue } })}
                                            onUpdate2={(newValue) => onUpdate({ ...resource, reward: newValue })}
                                            label="gives me"
                                            placeholder1="..."
                                            placeholder2="..."
                                        />
                                    </>
                                ) : (
                                    <>
                                        <EditableField field="trigger" subField="action" prefix="Action: When I" suffix="," resource={resource} onUpdate={onUpdate} />
                                        <EditableField field="response" subField="visualize" prefix="Mechanism: It causes" suffix="internally." resource={resource} onUpdate={onUpdate} />
                                        <EditableField field="reward" prefix="Cost: This blocks" suffix="." resource={resource} onUpdate={onUpdate} />
                                        <DoubleEditableField 
                                            prefix="Opposite: Only when"
                                            suffix="happens."
                                            value1={resource.newResponse?.visualize || ""}
                                            value2={resource.newResponse?.action || ""}
                                            onUpdate1={(newValue) => onUpdate({ ...resource, newResponse: { ...resource.newResponse, visualize: newValue } })}
                                            onUpdate2={(newValue) => onUpdate({ ...resource, newResponse: { ...resource.newResponse, action: newValue } })}
                                            placeholder1="..."
                                            placeholder2="..."
                                        />
                                        <EmotionEditableField
                                            value1={resource.trigger?.feeling || ''}
                                            value2={resource.benefit || ''}
                                            onUpdate1={(newValue) => onUpdate({ ...resource, trigger: { ...resource.trigger, feeling: newValue } })}
                                            onUpdate2={(newValue) => onUpdate({ ...resource, benefit: newValue })}
                                            label="costs me"
                                            placeholder1="..."
                                            placeholder2="..."
                                        />
                                    </>
                                )}
                            </div>
                        ) : (
                         <DndContext onDragEnd={handlePointDragEnd}>
                            <SortableContext items={(resource.points || []).map(p => p.id)}>
                                <ul className="space-y-3 text-sm text-muted-foreground pr-2">
                                    {(resource.points || []).map(point => (
                                        <SortablePointInPopup
                                            key={point.id}
                                            point={point}
                                            onUpdate={(newText) => handleUpdatePoint(point.id, newText)}
                                            onDelete={() => handleDeletePoint(point.id)}
                                            onOpenNestedPopup={(e: React.MouseEvent) => handleLinkClick(e, point.resourceId!)}
                                            onEditLinkText={onEditLinkText}
                                            onConvertToCard={() => {}}
                                        />
                                    ))}
                                </ul>
                            </SortableContext>
                        </DndContext>
                       )}
                    </CardContent>
                </div>
                {resource.type !== 'habit' && resource.type !== 'mechanism' && (
                 <CardFooter className="p-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Step
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
                 </CardFooter>
                )}
            </Card>
        </div>
    );
};

const HabitResourceCard = ({ resource, onUpdate, onDelete, onLinkClick, linkingFromId, onOpenNestedPopup }: {
    resource: Resource; 
    onUpdate: (updatedResource: Resource) => void; 
    onDelete: (resourceId: string) => void;
    onLinkClick: (resourceId: string) => void;
    linkingFromId: string | null;
    onOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
}) => {
    const { resources } = useAuth();
    const [editingTitle, setEditingTitle] = useState(false);

    const handleUpdateField = (field: keyof Pick<Resource, 'response' | 'newResponse'>, value: { text?: string; resourceId?: string }) => {
        onUpdate({ ...resource, [field]: value });
    };

    const renderEditableResponse = (field: 'response' | 'newResponse', label: string) => {
        const responseValue = resource[field];
        const linkedResource = responseValue?.resourceId ? resources.find(r => r.id === responseValue.resourceId) : null;
        
        return (
            <div className="space-y-1">
                {linkedResource ? (
                    <div className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50 border-l-2 border-primary">
                        <div className="flex items-center gap-2 min-w-0">
                           <Workflow className="h-4 w-4 text-primary flex-shrink-0" />
                           <span className="font-medium text-foreground truncate" title={linkedResource.name}>{linkedResource.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUpdateField(field, { ...responseValue, resourceId: undefined })}>
                            <Unlink className="h-3 w-3 text-destructive" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <EditableField
                          field={field}
                          subField="text"
                          prefix={`${label}:`}
                          resource={resource}
                          onUpdate={onUpdate}
                        />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><LinkIcon className="h-4 w-4" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-0">
                                <Select onValueChange={(val) => handleUpdateField(field, { text: '', resourceId: val })}>
                                    <SelectTrigger className="w-full border-0 focus:ring-0">
                                        <SelectValue placeholder="Link a mechanism..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {resources.filter(r => r.type === 'mechanism').map(r => (
                                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </PopoverContent>
                        </Popover>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card onClick={(e) => onOpenNestedPopup(resource.id, e)} className={cn("flex flex-col rounded-2xl group overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer", linkingFromId === resource.id && "ring-2 ring-primary", linkingFromId && linkingFromId !== resource.id && "cursor-pointer hover:ring-2 hover:ring-primary/50")}>
            <CardHeader onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 flex-grow min-w-0">
                        {editingTitle ? (
                            <Input value={resource.name} onChange={(e) => onUpdate({...resource, name: e.target.value})} onBlur={() => setEditingTitle(false)} autoFocus className="text-lg font-semibold h-9" />
                        ) : (
                            <CardTitle className="flex items-center gap-3 text-lg cursor-pointer" onClick={() => setEditingTitle(true)}>
                                <span className="text-primary"><Zap className="h-5 w-5" /></span>
                                <span className="truncate">{resource.name}</span>
                            </CardTitle>
                        )}
                    </div>
                     <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => onLinkClick(resource.id)}>
                            <LinkIcon className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mr-2 -mt-1"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setEditingTitle(true)}>Edit Title</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onDelete(resource.id)} className="text-destructive">Delete Card</DropdownMenuItem>
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
            <CardContent className="space-y-1" onClick={(e) => e.stopPropagation()}>
                <EditableField field="trigger" subField="action" prefix="Trigger: When I" suffix="." resource={resource} onUpdate={onUpdate} />
                {renderEditableResponse('response', 'Response')}
                <EditableField field="reward" prefix="Reward:" resource={resource} onUpdate={onUpdate} />
                {renderEditableResponse('newResponse', 'New Response')}
            </CardContent>
        </Card>
    );
};

const LinkDropZone = ({ resourceId, linkingFromId }: { resourceId: string; linkingFromId: string | null; }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `link-dropzone-${resourceId}`,
        data: { type: 'link-dropzone', resourceId },
    });
    return (
        <div
            ref={setNodeRef}
            className={cn(
                "absolute -top-3 -right-3 z-20 h-7 w-7 rounded-full bg-muted/80 backdrop-blur-sm border border-dashed flex items-center justify-center transition-all opacity-0",
                linkingFromId && linkingFromId !== resourceId && "opacity-100",
                isOver && "ring-2 ring-primary scale-125 bg-primary/20"
            )}
        >
            <LinkIcon className="h-4 w-4 text-primary" />
        </div>
    );
};

const SortableResourceCard = ({ children, item, className, linkingFromId }: { children: React.ReactNode; item: Resource; className?: string; linkingFromId: string | null; }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, data: { type: 'card', item } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
  
    return (
        <div ref={setNodeRef} style={style} className={cn(className)}>
          <div className="relative group/sortable h-full">
            <button {...attributes} {...listeners} className="absolute -top-2 -left-2 z-10 p-1 bg-muted rounded-full cursor-grab active:cursor-grabbing opacity-0 group-hover/sortable:opacity-100 transition-opacity"><GripVertical className="h-4 w-4 text-muted-foreground/50" /></button>
            {(item.type === 'card' || item.type === 'habit' || item.type === 'mechanism') && <LinkDropZone resourceId={item.id} linkingFromId={linkingFromId} />}
            {children}
          </div>
        </div>
    );
};


const SortablePoint = ({ point, onConvertToCard, onUpdate, onDelete, onOpenNestedPopup, onEditLinkText }: {
    point: ResourcePoint;
    onConvertToCard: (point: ResourcePoint) => void;
    onUpdate: (updatedText: string) => void;
    onDelete: () => void;
    onOpenNestedPopup: (event: React.MouseEvent) => void;
    onEditLinkText: (point: ResourcePoint) => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: point.id, data: { type: 'point', item: point } });

    const style = {
        transform: CSS.Transform.toString(transform),
        zIndex: isDragging ? 10 : 'auto',
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
                onUpdate={onUpdate}
                onDelete={onDelete}
                onEditLinkText={onEditLinkText}
                onConvertToCard={onConvertToCard}
                dragHandle={{ attributes, listeners }}
            />
        </div>
    );
};


const SortablePointInPopup = ({ point, onUpdate, onDelete, onOpenNestedPopup, onEditLinkText }: {
    point: ResourcePoint;
    onUpdate: (text: string) => void;
    onDelete: () => void;
    onOpenNestedPopup: (event: React.MouseEvent) => void;
    onEditLinkText: (point: ResourcePoint) => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: point.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
    };

    if (point.type === 'card' && point.resourceId) {
        return (
            <div ref={setNodeRef} style={style} className="relative flex items-start gap-3 text-sm text-muted-foreground group/item">
                <button {...attributes} {...listeners} className="cursor-grab p-1"><GripVertical className="h-4 w-4 text-muted-foreground/50" /></button>
                <div
                    onClick={onOpenNestedPopup}
                    className="flex items-start gap-3 flex-grow cursor-pointer p-2 rounded-md hover:bg-muted/50 border border-dashed"
                >
                    <Library className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" />
                    <span className="font-medium text-foreground">{point.text}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover/item:opacity-100" onClick={onDelete}>
                    <Trash2 className="h-3 w-3"/>
                </Button>
            </div>
        )
    }

    return (
        <div ref={setNodeRef} style={style} className="relative bg-card">
            <EditableResourcePoint
                point={point}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onEditLinkText={onEditLinkText}
                onConvertToCard={() => {}} // Pass empty function as it's not needed in popup
                dragHandle={{ attributes, listeners }}
            />
        </div>
    );
};

const DraggableFolder = ({ folder, children, isDragging, ...props }: { folder: ResourceFolder, children: React.ReactNode, isDragging: boolean } & React.HTMLAttributes<HTMLDivElement>) => {
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
  };
  
const DroppableFolder = ({ folder, children, ...props }: { folder: ResourceFolder, children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) => {
    const { isOver, setNodeRef } = useDroppable({
        id: folder.id,
        data: { type: 'folder' }
    });

    return (
        <div ref={setNodeRef} {...props} className={cn(isOver && "bg-primary/10 ring-1 ring-primary")}>
            {children}
        </div>
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
    globalVolume,
  } = useAuth();
  const { toast } = useToast();
  
  const [newFolderName, setNewFolderName] = useState('');
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceLink, setNewResourceLink] = useState('');
  
  const [editingFolder, setEditingFolder] = useState<ResourceFolder | null>(null);
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
  
  const [addResourceType, setAddResourceType] = useState<'link' | 'card' | 'habit' | 'model3d' | 'mechanism'>('link');
  const [mechanismFramework, setMechanismFramework] = useState<'negative' | 'positive'>('negative');

  const [openPopups, setOpenPopups] = useState<Map<string, PopupState>>(new Map());
  
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const [markdownModalState, setMarkdownModalState] = useState<{
    isOpen: boolean;
    resourceId: string | null;
    pointId: string | null;
  }>({ isOpen: false, resourceId: null, pointId: null });
  
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  
  const [playingAudio, setPlayingAudio] = useState<{ id: string; isPlaying: boolean } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [modelModalState, setModelModalState] = useState<{ isOpen: boolean; modelUrl: string | null }>({ isOpen: false, modelUrl: null });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));


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
            setOpenPopups(new Map());
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
        return resourcesToFilter.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedResourceFolderId) {
        resourcesToFilter = resourcesToFilter.filter(r => r.folderId === selectedResourceFolderId);
    }
    if (searchTerm) {
        resourcesToFilter = resourcesToFilter.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
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
      icon: 'Folder',
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
    if ((addResourceType === 'card' || addResourceType === 'habit' || addResourceType === 'mechanism' || addResourceType === 'model3d') && !newResourceName.trim()) {
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

  const handleUpdateResource = (updatedResource: Resource) => {
    setResources(prev =>
      prev.map(res => res.id === updatedResource.id ? updatedResource : res)
    );
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
                    <DroppableFolder folder={folder}>
                        <DraggableFolder folder={folder} isDragging={activeId === folder.id}>
                            <div
                                onClick={() => { handleSelectFolder(folder.id); toggleFolderCollapse(folder.id); }}
                                onContextMenu={(e) => handleContextMenu(e, folder)}
                                className={cn("flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer group transition-colors", selectedResourceFolderId === folder.id && "bg-accent font-semibold")}
                            >
                                {pinnedFolderIds.has(folder.id) && <Pin className="h-3 w-3 text-primary flex-shrink-0" />}
                                <ChevronDown className={cn("h-4 w-4 transition-transform", (collapsedFolders.has(folder.id) && !searchTerm) && "-rotate-90", resourceFolders.every(f => f.parentId !== folder.id) && "invisible")} />
                                <Folder className="h-4 w-4"/>
                                <span className='flex-grow truncate'>{folder.name}</span>
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
  }, [filteredFolders, editingFolder, selectedResourceFolderId, collapsedFolders, handleSelectFolder, commitFolderEdit, cancelFolderEdit, handleContextMenu, pinnedFolderIds, handleShareFolder, toggleFolderCollapse, activeId, searchTerm]);

  const handleOpenNestedPopup = (resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState) => {
    setOpenPopups(prev => {
        const newPopups = new Map(prev);
        const resource = resources.find(r => r.id === resourceId);
        if (!resource) return newPopups;
        
        const hasMarkdown = (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
        const popupWidth = hasMarkdown ? 896 : 512;
    
        let x, y, level, parentId;
    
        if (parentPopupState) {
            level = parentPopupState.level + 1;
            parentId = parentPopupState.resourceId;
            x = parentPopupState.x + 40;
            y = parentPopupState.y + 40;
        } else {
            level = 0;
            parentId = undefined;
            if (hasMarkdown) {
                // Center large popups
                x = window.innerWidth / 2 - popupWidth / 2;
                y = window.innerHeight / 2 - Math.min(window.innerHeight * 0.7, 700) / 2;
            } else {
                x = event.clientX;
                y = event.clientY;
            }
        }
        
        newPopups.set(resourceId, {
            resourceId, level, x, y, parentId, width: popupWidth
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
        if (playingAudio?.id === id) {
            setPlayingAudio(null);
        }
        newPopups.delete(id);
      }
  
      return newPopups;
    });
  };

  const isDescendant = (childId: string, parentId: string): boolean => {
    if (childId === parentId) return true;
    const parentFolder = resourceFolders.find(f => f.id === childId);
    if (!parentFolder || !parentFolder.parentId) return false;
    return isDescendant(parentFolder.parentId, parentId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over, delta } = event;

    if (active.id.toString().startsWith('popup-')) {
        setOpenPopups(prev => {
            const newPopups = new Map(prev);
            const popupId = active.id.toString().replace('popup-', '');
            const popup = newPopups.get(popupId);
            if (popup) {
                newPopups.set(popupId, { ...popup, x: popup.x + delta.x, y: popup.y + delta.y });
            }
            return newPopups;
        });
        return;
    }

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
      setMarkdownModalState({ isOpen: true, resourceId, pointId });
  };
  
  const currentMarkdownResource = resources.find(r => r.id === markdownModalState.resourceId);

  const sortedTabs = useMemo(() => {
    return [...activeResourceTabIds].sort((a, b) => {
        const aIsPinned = pinnedFolderIds.has(a);
        const bIsPinned = pinnedFolderIds.has(b);
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;
        return 0; // Keep original order for same-pinned-status tabs
    });
  }, [activeResourceTabIds, pinnedFolderIds]);
  
  const handleLinkClick = (resourceId: string) => {
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
  };

  const [linkTextDialog, setLinkTextDialog] = useState<{ point: ResourcePoint, resourceId: string } | null>(null);
  const [currentDisplayText, setCurrentDisplayText] = useState('');

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

  const handleConvertToCard = (point: ResourcePoint) => {
    const parentResource = resources.find(r => r.points?.some(p => p.id === point.id));
    if (!parentResource) return;

    let finalFolders = [...resourceFolders];
    const parentFolderId = parentResource.folderId;
    let subFolderId: string;

    // Check if a sub-folder named after the parent card already exists
    let subFolder = finalFolders.find(f => f.parentId === parentFolderId && f.name === parentResource.name);

    if (!subFolder) {
      // If not, create it
      const newSubFolder: ResourceFolder = {
        id: `folder_${Date.now()}`,
        name: parentResource.name,
        parentId: parentFolderId,
        icon: 'Folder',
      };
      finalFolders.push(newSubFolder);
      subFolderId = newSubFolder.id;
    } else {
      subFolderId = subFolder.id;
    }

    // Create a new resource card in the determined sub-folder
    const newCard: Resource = {
        id: `res_${Date.now()}`,
        name: point.text,
        folderId: subFolderId,
        type: 'card',
        points: [],
        icon: 'Library',
        createdAt: new Date().toISOString(),
    };
    
    // Update the original point to link to the new card
    const updatedPoints = (parentResource.points || []).map(p => {
        if (p.id === point.id) {
            return {
                ...p,
                type: 'card' as const,
                resourceId: newCard.id
            };
        }
        return p;
    });
    
    const updatedParentResource = { ...parentResource, points: updatedPoints };

    // Update state
    setResourceFolders(finalFolders);
    setResources(prev => [...prev.map(r => r.id === parentResource.id ? updatedParentResource : r), newCard]);

    toast({ title: "Converted to Card", description: `A new card "${newCard.name}" has been created and linked.` });
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


  return (
    <>
    <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveId(e.active.id.toString())}
      onDragEnd={handleDragEnd}
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
                <div>
                <h2 className="text-2xl font-bold mb-4">
                    {selectedResourceFolderId && !searchTerm
                    ? resourceFolders.find(f => f.id === selectedResourceFolderId)?.name
                    : searchTerm ? `Search results for "${searchTerm}"` : 'Select a folder'}
                </h2>
                
                <SortableContext items={filteredResources.map(r => r.id)}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredResources.map(res => {
                             const isCardType = res.type === 'card';
                             const isHabitType = res.type === 'habit' || res.type === 'mechanism';
                             const isModelType = res.type === 'model3d';
                             const hasMarkdownContent = isCardType && (res.points || []).some(p => p.type === 'markdown' || p.type === 'code');
                             const cardClassName = hasMarkdownContent ? "lg:col-span-3" : "";
 
                            let cardContent: React.ReactNode;
                            
                            if (isModelType) {
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
                            }
                            else if (isHabitType) {
                                cardContent = <HabitResourceCard resource={res} onUpdate={handleUpdateResource} onDelete={() => handleDeleteResource(res)} onLinkClick={handleLinkClick} linkingFromId={linkingFromId} onOpenNestedPopup={handleOpenNestedPopup} />;
                            }
                            else if(isCardType) {
                                cardContent = <ResourceCardComponent resource={res} onUpdate={handleUpdateResource} onDelete={() => handleDeleteResource(res)} onOpenNestedPopup={handleOpenNestedPopup} onOpenMarkdownModal={handleOpenMarkdownModal} playingAudio={playingAudio} setPlayingAudio={setPlayingAudio} onLinkClick={handleLinkClick} linkingFromId={linkingFromId} onEditLinkText={handleEditLinkText} onConvertToCard={handleConvertToCard}/>;
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
                <DragOverlay>
                  {activeId && activeId.startsWith('res_') ? (
                    <div className="w-48">
                        <Card className="shadow-2xl">
                            <CardHeader><CardTitle className="text-base">{resources.find(r=>r.id===activeId)?.name}</CardTitle></CardHeader>
                        </Card>
                    </div>
                  ) : activeId && activeId.startsWith('point_') ? (
                     <div className="bg-card p-2 rounded-md shadow-lg opacity-80 flex items-start gap-3 w-64">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                        {resources.flatMap(r => r.points || []).find(p => p.id === activeId)?.text}
                    </div>
                  ) : activeId && activeId.startsWith('cat_') ? (
                    <div className="w-48">
                        <Card className="shadow-2xl p-2 bg-primary/10">
                           <div className="flex items-center gap-2">
                                <Folder className="h-4 w-4" />
                                <p className="font-semibold text-sm">{resourceFolders.find(f => f.id === activeId)?.name}</p>
                           </div>
                        </Card>
                    </div>
                  ) : null}
                </DragOverlay>
                </div>
            </main>
        </div>
        </div>
        {Array.from(openPopups.values()).map((popupState) => {
            const resource = resources.find(r => r.id === popupState.resourceId);
            if (!resource) return null;
            return (
                <ResourcePopupCard
                    key={popupState.resourceId}
                    popupState={popupState}
                    resource={resource}
                    onClose={handleClosePopup}
                    onUpdate={handleUpdateResource}
                    playingAudio={playingAudio}
                    setPlayingAudio={setPlayingAudio}
                    onOpenNestedPopup={handleOpenNestedPopup}
                    onEditLinkText={handleEditLinkText}
                    onConvertToCard={handleConvertToCard}
                />
            );
        })}

        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {Array.from(openPopups.values()).map(popup => {
            if (!popup.parentId) return null;
            const parentPopup = openPopups.get(popup.parentId);
            if (!parentPopup) return null;
            
            const startX = popup.x + (popup.width || 0) / 2;
            const startY = popup.y + ((popup.height || 0) / 2);
            const endX = parentPopup.x + (parentPopup.width || 0) / 2;
            const endY = parentPopup.y + ((parentPopup.height || 0) / 2);
            
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
    </DndContext>
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
            <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteConfirmation.item.hasOwnProperty('folderId') 
                                ? `This resource is linked in other cards. Deleting it will break those links. Are you sure you want to proceed?`
                                : `This will permanently delete "${deleteConfirmation.item.name}" and all its contents. This action cannot be undone.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteConfirmation(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { 
                            if ('parentId' in deleteConfirmation.item) {
                                handleDeleteFolder(deleteConfirmation.item.id);
                            } else {
                                performDeleteResource(deleteConfirmation.item.id);
                            }
                            setDeleteConfirmation(null); 
                        }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}

        {editingResource && (
          <Dialog open={!!editingResource} onOpenChange={(isOpen) => !isOpen && setEditingResource(null)}>
            <DialogContent className="sm:max-w-md">
                {editingResource && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Edit Resource</DialogTitle>
                            <DialogDescription>Update the details or move this resource to a new folder.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="res-name" className="text-right">Name</Label>
                                <Input id="res-name" value={editingResource.name || ''} onChange={(e) => setEditingResource(prev => prev ? {...prev, name: e.target.value} : null)} className="col-span-3"/>
                            </div>
                            {editingResource?.type === 'link' && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="res-link" className="text-right">Link</Label>
                                    <Input id="res-link" value={editingResource.link || ''} onChange={(e) => setEditingResource(prev => prev ? {...prev, link: e.target.value} : null)} className="col-span-3"/>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="res-desc" className="text-right">Description</Label>
                                    <Textarea id="res-desc" value={editingResource.description || ''} onChange={(e) => setEditingResource(prev => prev ? {...prev, description: e.target.value} : null)} className="col-span-3"/>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="res-github" className="text-right">GitHub Link</Label>
                                    <Input id="res-github" value={editingResource.githubLink || ''} onChange={(e) => setEditingResource(prev => prev ? {...prev, githubLink: e.target.value} : null)} className="col-span-3"/>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="res-demo" className="text-right">Demo Link</Label>
                                    <Input id="res-demo" value={editingResource.demoLink || ''} onChange={(e) => setEditingResource(prev => prev ? {...prev, demoLink: e.target.value} : null)} className="col-span-3"/>
                                </div>
                                {isGifUrl(editingResource.link) && (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="res-linked-card" className="text-right">Link to Card</Label>
                                        <Select
                                            value={editingResource.linkedResourceId || 'none'}
                                            onValueChange={(value) => setEditingResource(prev => prev ? { ...prev, linkedResourceId: value === 'none' ? undefined : value } : null)}
                                        >
                                            <SelectTrigger id="res-linked-card" className="col-span-3">
                                                <SelectValue placeholder="Select a card to link..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">-- None --</SelectItem>
                                                {resources.filter(r => r.type === 'card' && r.id !== editingResource?.id).map(r => (
                                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </>
                            )}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="res-folder" className="text-right">Folder</Label>
                                <Select value={editingResource.folderId || ''} onValueChange={handleResourceFolderChange}>
                                    <SelectTrigger id="res-folder" className="col-span-3"><SelectValue placeholder="Select a folder" /></SelectTrigger>
                                    <SelectContent>{renderFolderOptions(null, 0)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingResource(null)}>Cancel</Button>
                            <Button onClick={handleSaveResourceEdit}>Save Changes</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
          </Dialog>
        )}
        
        <Dialog open={youtubeModalState.isOpen} onOpenChange={(isOpen) => setYoutubeModalState(p => ({...p, isOpen}))}>
          <DialogContent
            className="max-w-4xl h-[90vh] flex flex-col p-2"
            onWheel={(e) => {
              if (youtubeModalState.playlist.length > 1) {
                e.deltaY > 0 ? handleNextVideo() : handlePrevVideo();
              }
            }}
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
        
        <Dialog open={modelModalState.isOpen} onOpenChange={(isOpen) => setModelModalState({ ...modelModalState, isOpen })}>
            <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>3D Model Viewer</DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    {modelModalState.modelUrl ? (
                        <ModelViewer modelUrl={modelModalState.modelUrl} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            No model to display.
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
                <Tabs value={addResourceType} onValueChange={(v) => setAddResourceType(v as any)} className="w-full mt-2 mb-4">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="link">Link</TabsTrigger>
                        <TabsTrigger value="card">Card</TabsTrigger>
                        <TabsTrigger value="habit">Habit</TabsTrigger>
                        <TabsTrigger value="mechanism">Mechanism</TabsTrigger>
                        <TabsTrigger value="model3d">3D Model</TabsTrigger>
                    </TabsList>
                    <TabsContent value="link" className="pt-4">
                        <Input autoFocus placeholder="https://example.com" value={newResourceLink} onChange={(e) => setNewResourceLink(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddResource()} />
                    </TabsContent>
                    <TabsContent value="card" className="pt-4">
                        <Input autoFocus placeholder="New card name..." value={newResourceName} onChange={(e) => setNewResourceName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddResource()} />
                    </TabsContent>
                    <TabsContent value="habit" className="pt-4">
                        <Input autoFocus placeholder="New habit name..." value={newResourceName} onChange={(e) => setNewResourceName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddResource()} />
                    </TabsContent>
                    <TabsContent value="mechanism" className="pt-4 space-y-4">
                        <Input autoFocus placeholder="New mechanism name..." value={newResourceName} onChange={(e) => setNewResourceName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddResource()} />
                        <RadioGroup value={mechanismFramework} onValueChange={(v) => setMechanismFramework(v as any)} className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="negative" id="r-negative" />
                                <Label htmlFor="r-negative">Negative Framework</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="positive" id="r-positive" />
                                <Label htmlFor="r-positive">Positive Framework</Label>
                            </div>
                        </RadioGroup>
                    </TabsContent>
                    <TabsContent value="model3d" className="pt-4 space-y-2">
                        <Input autoFocus placeholder="Model name..." value={newResourceName} onChange={(e) => setNewResourceName(e.target.value)} />
                        <Input type="file" accept=".glb,.gltf" onChange={handleModelUpload} className="file:text-primary file:font-medium" />
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
                    }}><Copy className="mr-2 h-4 w-4"/>Copy</Button>
                </div>
            </DialogContent>
        </Dialog>
        <Dialog open={markdownModalState.isOpen} onOpenChange={(isOpen) => setMarkdownModalState(prev => ({...prev, isOpen}))}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2">
              <DialogHeader className="p-4 border-b">
                  <DialogTitle>{currentMarkdownResource?.name || "Resource"}</DialogTitle>
              </DialogHeader>
              <div className="flex-grow min-h-0">
                  <ScrollArea className="h-full">
                      <div className="p-6 space-y-4">
                        {(currentMarkdownResource?.points || [])
                            .filter(p => p.type === 'markdown' || p.type === 'code')
                            .map((point) => (
                                <div key={point.id}>
                                    {point.type === 'markdown' ? (
                                        <div className="prose dark:prose-invert max-w-full">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text || ""}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <pre className="w-full bg-muted/50 p-3 rounded-md text-sm font-mono text-foreground whitespace-pre-wrap break-words">{point.text}</pre>
                                    )}
                                </div>
                            ))
                        }
                      </div>
                  </ScrollArea>
              </div>
          </DialogContent>
        </Dialog>
        <Dialog open={!!linkTextDialog} onOpenChange={() => setLinkTextDialog(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Display Text</DialogTitle>
                    <DialogDescription>Set the text that will be displayed for this link.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="display-text-input">Display Text</Label>
                    <Input
                        id="display-text-input"
                        value={currentDisplayText}
                        onChange={(e) => setCurrentDisplayText(e.target.value)}
                        placeholder="Enter display text..."
                        autoFocus
                    />
                    {linkTextDialog?.point.url && (
                        <p className="text-xs text-muted-foreground mt-2">URL: <span className="font-mono text-xs truncate">{linkTextDialog.point.text}</span></p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setLinkTextDialog(null)}>Cancel</Button>
                    <Button onClick={handleSaveLinkText}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}

const EditableResourcePoint = ({ point, onConvertToCard, onUpdate, onDelete, onEditLinkText, dragHandle }: { 
    point: ResourcePoint, 
    onUpdate: (text: string) => void, 
    onDelete: () => void,
    onEditLinkText: (point: ResourcePoint) => void;
    onConvertToCard: () => void;
    dragHandle?: { attributes: any; listeners: any };
}) => {
    const { setFloatingVideoUrl } = useAuth();
    
    const [isEditing, setIsEditing] = useState(point.text === 'New step...');
    const [editText, setEditText] = useState(point.text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSave = () => {
        if (editText.trim() === '') {
            onDelete();
        } else {
             onUpdate(editText);
        }
        setIsEditing(false);
    };

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditing]);
    
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditText(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    }

    return (
        <li className="flex items-start gap-3 group/item w-full">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity" {...dragHandle?.attributes} {...dragHandle?.listeners}>
                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            </div>
            
            <div className="flex-grow min-w-0 pl-8 pr-8" onDoubleClick={() => !isEditing && setIsEditing(true)}>
                {isEditing ? (
                    <Textarea 
                        ref={textareaRef} 
                        value={editText} 
                        onChange={handleTextareaChange} 
                        onBlur={handleSave} 
                        className="text-sm" 
                        rows={1}
                    />
                ) : point.type === 'markdown' ? (
                    <div className="w-full prose dark:prose-invert prose-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text}</ReactMarkdown></div>
                ) : point.type === 'code' ? (
                    <pre className="w-full bg-muted/50 p-2 rounded-md text-xs font-mono text-foreground whitespace-pre-wrap break-words">{point.text}</pre>
                ) : point.type === 'link' ? (
                     <div className="flex-grow min-w-0 flex items-center gap-2">
                        {point.text && <Image src={getFaviconUrl(point.text)!} alt="" width={16} height={16} className="flex-shrink-0"/>}
                        <span 
                            className="cursor-pointer text-primary hover:underline truncate" 
                            title={point.text} 
                            onClick={() => point.text && setFloatingVideoUrl(point.text)}
                            onContextMenu={(e) => { e.preventDefault(); onEditLinkText(point); }}
                        >
                            {point.displayText || point.text || <span className="text-muted-foreground italic">New link...</span>}
                        </span>
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap text-muted-foreground">{point.text}</p>
                )}
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                 {point.type === 'text' && (
                     <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={onConvertToCard}>
                        <Blocks className="h-3 w-3"/>
                    </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
                    <Trash2 className="h-3 w-3"/>
                </Button>
            </div>
        </li>
    );
}

export default function ResourcesPage() {
    return <AuthGuard><ResourcesPageContent /></AuthGuard>;
}
