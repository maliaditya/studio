
"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, X, GripVertical, Library, MessageSquare, Code, ArrowRight, Upload, Play, Pause, Unlink, Edit3, PlusCircle, PopoverClose, Trash2, Blocks, Loader2, Brain, View, Pin, PinOff, ChevronRight, Link as LinkIcon, Workflow, GitMerge, Paintbrush } from 'lucide-react';
import type { Resource, ResourcePoint, PopupState } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getAudio, storeAudio, deleteAudio } from '@/lib/audioDB';
import { useRouter } from 'next/navigation';
import { EditableResourcePoint } from './EditableFields';
import { MindMapViewer } from './MindMapViewer';
import { VisuallyHidden } from './ui/visually-hidden';
import { HabitResourceCard } from './HabitResourceCard';
import { MechanismResourceCard } from './MechanismResourceCard';
import { DrawingCanvas } from './DrawingCanvas';


interface GeneralResourcePopupProps {
  popupState: PopupState;
  onClose: (id: string) => void;
  onUpdate: (resource: Resource) => void;
  onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState) => void;
}

const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};


const buildPointTree = (points: ResourcePoint[]): (ResourcePoint & { children: ResourcePoint[] })[] => {
  if (!points) return [];
  
  const pointsWithChildren = points.map(p => ({ ...p, children: [] as ResourcePoint[] }));

  const sortedTimestampPoints = pointsWithChildren
    .filter(p => p.type === 'timestamp' && p.timestamp !== undefined)
    .sort((a, b) => a.timestamp! - b.timestamp!);
  
  const otherPoints = pointsWithChildren
    .filter(p => p.type !== 'timestamp' || p.timestamp === undefined);

  const isContained = (child: ResourcePoint, parent: ResourcePoint) => {
    if (child.id === parent.id) return false;
    if (parent.timestamp === undefined || parent.endTime === undefined) return false;
    if (child.timestamp === undefined) return false;
    return child.timestamp >= parent.timestamp && (child.endTime || child.timestamp) <= parent.endTime;
  };

  const roots: (ResourcePoint & { children: ResourcePoint[] })[] = [];
  
  sortedTimestampPoints.forEach(point => {
    let parentFound = false;
    // Try to find the smallest possible container
    for (let i = sortedTimestampPoints.length - 1; i >= 0; i--) {
      const potentialParent = sortedTimestampPoints[i];
      if (isContained(point, potentialParent)) {
        potentialParent.children.push(point);
        parentFound = true;
        break;
      }
    }
    if (!parentFound) {
      roots.push(point);
    }
  });

  return [...otherPoints, ...roots];
};


const PointTree = ({ points, onUpdate, onDelete, onOpenNestedPopup, openContentViewPopup, createResourceWithHierarchy, onSeekTo, currentTime, onOpenDrawingCanvas }: {
    points: (ResourcePoint & { children: ResourcePoint[] })[];
    onUpdate: (pointId: string, updatedPoint: Partial<ResourcePoint>) => void;
    onDelete: (pointId: string) => void;
    onOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
    openContentViewPopup: (contentId: string, point: ResourcePoint, event: React.MouseEvent) => void;
    createResourceWithHierarchy: (pointToConvert: ResourcePoint, type: Resource['type']) => void;
    onSeekTo: (timestamp: number) => void;
    currentTime: number;
    onOpenDrawingCanvas: (point: ResourcePoint) => void;
}) => {
  return (
    <ul className="space-y-1 text-sm text-muted-foreground pr-2">
      {points.map(point => (
        <React.Fragment key={point.id}>
          <EditableResourcePoint 
              point={point}
              onUpdate={onUpdate}
              onDelete={() => onDelete(point.id)}
              onOpenNestedPopup={(e) => onOpenNestedPopup(point.resourceId!, e)}
              onOpenContentView={(e) => openContentViewPopup(`content-${point.id}`, point, e)}
              onConvertToCard={() => createResourceWithHierarchy(point, 'card')}
              onSeekTo={onSeekTo}
              currentTime={currentTime}
              onOpenDrawingCanvas={() => onOpenDrawingCanvas(point)}
          />
          {point.children.length > 0 && (
            <div className="pl-4 mt-1 border-l-2 border-dashed border-primary/20">
              <PointTree 
                points={point.children}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onOpenNestedPopup={onOpenNestedPopup}
                openContentViewPopup={openContentViewPopup}
                createResourceWithHierarchy={createResourceWithHierarchy}
                onSeekTo={onSeekTo}
                currentTime={currentTime}
                onOpenDrawingCanvas={onOpenDrawingCanvas}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </ul>
  );
};


export function GeneralResourcePopup({ popupState, onClose, onUpdate, onOpenNestedPopup }: GeneralResourcePopupProps) {
    const { 
      resources, 
      resourceFolders, 
      globalVolume, 
      openContentViewPopup, 
      createResourceWithHierarchy: createResourceWithHierarchyAuth, 
      setFloatingVideoUrl, 
      openBrainHackPopup, 
      settings, 
      setSettings, 
      playbackRequest, 
      setPlaybackRequest, 
      setSelectedResourceFolderId,
      drawingCanvasState,
      openDrawingCanvas: authOpenDrawingCanvas,
    } = useAuth();
    const router = useRouter();
    const [editingTitle, setEditingTitle] = useState(false);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const [playingAudio, setPlayingAudio] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [newAnnotation, setNewAnnotation] = useState('');
    const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
    
    const resource = resources.find(r => r.id === popupState.resourceId);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `general-popup-${popupState.resourceId}`,
    });

    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        width: `${popupState.width || 420}px`,
        willChange: 'transform',
        zIndex: 65 + (popupState.level || 0),
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }
    
     useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl || !resource?.id) return;
        
        let objectUrl: string | null = null;
        
        const loadAudio = async () => {
          if (resource.hasLocalAudio) {
            try {
              const audioBlob = await getAudio(resource.id);
              if (audioBlob) {
                objectUrl = URL.createObjectURL(audioBlob);
                setAudioSrc(objectUrl);
              } else {
                setAudioSrc(null);
              }
            } catch (error) {
              console.error("Failed to load audio from DB:", error);
              setAudioSrc(null);
            }
          } else {
              setAudioSrc(null);
          }
        };
        
        loadAudio();

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        }
     }, [resource?.id, resource?.hasLocalAudio]);

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl || !audioSrc) return;
    
        if (audioEl.src !== audioSrc) {
          audioEl.src = audioSrc;
        }
    
        if (playingAudio) {
          audioEl.volume = globalVolume;
          audioEl.play().catch(e => console.error("Audio play failed:", e));
        } else {
          audioEl.pause();
        }
    }, [playingAudio, audioSrc, globalVolume]);

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;
        
        const handleTimeUpdate = () => setCurrentTime(audioEl.currentTime);
        const handleDurationChange = () => setDuration(audioEl.duration);

        audioEl.addEventListener('timeupdate', handleTimeUpdate);
        audioEl.addEventListener('durationchange', handleDurationChange);

        return () => {
            if (audioEl) {
                audioEl.removeEventListener('timeupdate', handleTimeUpdate);
                audioEl.removeEventListener('durationchange', handleDurationChange);
            }
        };
    }, []);

    useEffect(() => {
      const audioEl = audioRef.current;
      if (!audioEl || !playbackRequest || playbackRequest.resourceId !== resource?.id) return;

      const handlePlayback = () => {
        audioEl.currentTime = playbackRequest.timestamp;
        setPlayingAudio(true);
        if (playbackRequest.endTime) {
          const checkEnd = () => {
            if (audioEl.currentTime >= playbackRequest.endTime!) {
              audioEl.pause();
              setPlayingAudio(false);
              setPlaybackRequest(null);
              audioEl.removeEventListener('timeupdate', checkEnd);
            }
          };
          audioEl.addEventListener('timeupdate', checkEnd);
        } else {
          setPlaybackRequest(null);
        }
      };

      if(audioEl.readyState >= 1) { // HAVE_METADATA
        handlePlayback();
      } else {
        audioEl.addEventListener('loadedmetadata', handlePlayback, { once: true });
      }

    }, [playbackRequest, resource?.id, setPlaybackRequest]);

    const folderPath = useMemo(() => {
      if (!resource || !resource.folderId || !resourceFolders) {
        return '';
      }
      const path: string[] = [];
      let currentFolderId: string | null = resource.folderId;
      while (currentFolderId) {
        const folder = resourceFolders.find(f => f.id === currentFolderId);
        if (folder) {
          path.unshift(folder.name);
          currentFolderId = folder.parentId;
        } else {
          currentFolderId = null;
        }
      }
      return path.join(' / ');
    }, [resource, resourceFolders]);


    if (!resource) return null;

    const handleTitleChange = (newTitle: string) => {
        onUpdate({ ...resource, name: newTitle });
    };

    const handleAddPoint = (type: ResourcePoint['type']) => {
        let newPoint: ResourcePoint;
        if (type === 'timestamp') {
          const newTimestamp = Math.max(0, currentTime);
          newPoint = { id: `point_${Date.now()}`, text: newAnnotation || 'New Note', type, timestamp: newTimestamp };
          setNewAnnotation('');
        } else {
          newPoint = { id: `point_${Date.now()}`, text: 'New step...', type };
        }
        
        const updatedPoints = [...(resource.points || []), newPoint];
        
        onUpdate({ ...resource, points: updatedPoints });
    };

    const handleUpdatePoint = (pointId: string, updatedPoint: Partial<ResourcePoint>) => {
        const updatedPoints = (resource.points || []).map(p =>
            p.id === pointId ? { ...p, ...updatedPoint } : p
        );
        onUpdate({ ...resource, points: updatedPoints });
    };

    const handleDeletePoint = (pointId: string) => {
        const updatedPoints = (resource.points || []).filter(p => p.id !== pointId);
        onUpdate({ ...resource, points: updatedPoints });
    };
    
    const handleClose = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        setPlayingAudio(false);
        onClose(resource.id);
    };

    const handleSeekTo = (timestamp: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = timestamp;
            if (audioRef.current.paused) {
                setPlayingAudio(true);
            }
        }
    };
    
    const handleViewOnPage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (resource.folderId) {
            setSelectedResourceFolderId(resource.folderId);
            router.push('/resources');
            onClose(resource.id);
        }
    };


    const getIcon = () => {
        switch (resource.type) {
            case 'habit': return <Zap className="h-5 w-5 text-primary"/>;
            case 'mechanism': return <Workflow className="h-5 w-5 text-primary"/>;
            case 'card': default: return <Library className="h-5 w-5 text-primary"/>;
        }
    };

    const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        try {
          await storeAudio(resource.id, file);
          onUpdate({ ...resource, hasLocalAudio: true, audioFileName: file.name });
          setAudioSrc(URL.createObjectURL(file));
        } catch (error) {
          console.error("Failed to store audio in IndexedDB", error);
        }
      }
    };
    
    const handleDeleteLocalAudio = async () => {
        try {
            await deleteAudio(resource.id);
            onUpdate({ ...resource, hasLocalAudio: false, audioFileName: undefined });
            setAudioSrc(null);
            if (audioRef.current) {
                audioRef.current.src = '';
            }
            setPlayingAudio(false);
        } catch (error) {
            console.error("Failed to delete audio from IndexedDB", error);
        }
    };

    const togglePlayAudio = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        setPlayingAudio(prev => !prev);
    };

    const handleToggleFavorite = () => {
      onUpdate({ ...resource, isFavorite: !resource.isFavorite });
    };
    
    const pointTree = useMemo(() => buildPointTree(resource.points || []), [resource.points]);
    
    const openDrawingCanvas = useCallback((point: ResourcePoint) => {
        authOpenDrawingCanvas({
            resourceId: resource.id,
            pointId: point.id,
            initialDrawing: point.drawing,
        });
    }, [resource.id, authOpenDrawingCanvas]);
    
    const renderContent = () => {
        switch (resource.type) {
            case 'habit':
                return <HabitResourceCard resource={resource} onUpdate={onUpdate} onDelete={() => {}} onLinkClick={() => {}} linkingFromId={null} onOpenNestedPopup={onOpenNestedPopup} />;
            case 'mechanism':
                return <MechanismResourceCard resource={resource} onUpdate={onUpdate} onDelete={() => {}} onLinkClick={() => {}} linkingFromId={null} onOpenNestedPopup={onOpenNestedPopup} />;
            case 'card':
            default:
                return (
                    <PointTree
                        points={pointTree}
                        onUpdate={handleUpdatePoint}
                        onDelete={handleDeletePoint}
                        onOpenNestedPopup={(resourceId, event) => onOpenNestedPopup(resourceId, event, popupState)}
                        openContentViewPopup={(id, point, event) => openContentViewPopup(id, resource, point, event)}
                        createResourceWithHierarchy={(point) => createResourceWithHierarchyAuth(resource, point, 'card')}
                        onSeekTo={handleSeekTo}
                        currentTime={currentTime}
                        onOpenDrawingCanvas={openDrawingCanvas}
                    />
                );
        }
    };


    return (
        <>
            <div ref={setNodeRef} style={style} {...attributes} data-popup-id={popupState.resourceId}>
                <audio ref={audioRef} onEnded={() => setPlayingAudio(false)} />
                <input type="file" ref={audioInputRef} onChange={handleAudioUpload} accept="audio/*" className="hidden" />
                <Card className="shadow-2xl border-2 border-primary/30 bg-card flex flex-col max-h-[80vh] relative group">
                    <div className="absolute top-2 right-2 z-20 flex items-center">
                        <TooltipProvider delayDuration={200}>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMindMapModalOpen(true)}><GitMerge className="h-4 w-4 text-purple-500" /></Button></TooltipTrigger><TooltipContent><p>View Mind Map</p></TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggleFavorite}>
                                {resource.isFavorite ? <PinOff className="h-4 w-4 text-yellow-400" /> : <Pin className="h-4 w-4" />}
                            </Button></TooltipTrigger><TooltipContent><p>{resource.isFavorite ? 'Un-favorite' : 'Favorite'}</p></TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleViewOnPage}><View className="h-4 w-4 text-blue-500" /></Button></TooltipTrigger><TooltipContent><p>View on Page</p></TooltipContent></Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={(e) => { e.stopPropagation(); audioInputRef.current?.click();}} disabled={resource.hasLocalAudio}>
                                        <Upload className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{resource.hasLocalAudio ? 'Local audio already exists' : 'Upload Audio'}</p></TooltipContent>
                            </Tooltip>
                            {resource.hasLocalAudio && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={(e) => { e.stopPropagation(); handleDeleteLocalAudio(); }}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Delete Local Audio</p></TooltipContent>
                                </Tooltip>
                            )}
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddPoint('text')}><MessageSquare className="h-4 w-4 text-blue-500" /></Button></TooltipTrigger><TooltipContent><p>Add Text</p></TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddPoint('markdown')}><MessageSquare className="h-4 w-4 text-blue-500" /></Button></TooltipTrigger><TooltipContent><p>Add Markdown</p></TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddPoint('code')}><Code className="h-4 w-4 text-green-500" /></Button></TooltipTrigger><TooltipContent><p>Add Code</p></TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddPoint('link')}><LinkIcon className="h-4 w-4 text-purple-500" /></Button></TooltipTrigger><TooltipContent><p>Add Link</p></TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAddPoint('paint')}><Paintbrush className="h-4 w-4 text-red-500" /></Button></TooltipTrigger><TooltipContent><p>Add Paint Canvas</p></TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => createResourceWithHierarchyAuth(resource, undefined, 'brain_hack')}><Brain className="h-4 w-4 text-pink-500" /></Button></TooltipTrigger><TooltipContent><p>Create Brain Hack</p></TooltipContent></Tooltip>
                        </TooltipProvider>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={handleClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <CardHeader 
                        className="p-3 pt-8 relative flex-shrink-0"
                    >
                        <div
                            className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing"
                            {...listeners}
                        >
                            <GripVertical className="h-5 w-5 text-muted-foreground/30" />
                        </div>
                        <div className="flex items-center gap-2">
                            {getIcon()}
                            {editingTitle ? (
                                 <Input 
                                    value={resource.name || ''}
                                    onChange={(e) => handleTitleChange(e.target.value)} 
                                    onBlur={() => setEditingTitle(false)} 
                                    onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                                    className="h-8 text-base font-semibold border-none bg-transparent shadow-none focus-visible:ring-0 p-0"
                                    autoFocus
                                />
                            ) : (
                                <CardTitle className="text-base truncate cursor-pointer" onClick={() => setEditingTitle(true)}>
                                    {resource.name || <span className="text-muted-foreground">[Untitled]</span>}
                                </CardTitle>
                            )}
                        </div>
                        {folderPath && (
                            <CardDescription className="text-xs pt-1 truncate" title={folderPath}>
                              <span className="flex items-center gap-1">
                                {folderPath.split(' / ').map((part, index, arr) => (
                                    <React.Fragment key={index}>
                                        <span>{part}</span>
                                        {index < arr.length - 1 && <ChevronRight className="h-3 w-3" />}
                                    </React.Fragment>
                                ))}
                              </span>
                            </CardDescription>
                        )}
                         {audioSrc && (
                            <div className="w-full space-y-2 pt-2">
                                <div className="flex items-center gap-2">
                                     <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={togglePlayAudio}>
                                        {playingAudio ? <Pause className="h-4 w-4 text-green-500" /> : <Play className="h-4 w-4 text-green-500" />}
                                    </Button>
                                    <span className="text-xs font-mono text-muted-foreground">{formatTime(currentTime)}</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration || 0}
                                        value={currentTime}
                                        onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = parseFloat(e.target.value); }}
                                        className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-xs font-mono text-muted-foreground">{formatTime(duration)}</span>
                                </div>
                                 {resource.audioFileName && (
                                    <p className="text-xs text-muted-foreground truncate" title={resource.audioFileName}>
                                      Now Playing: {resource.audioFileName}
                                    </p>
                                )}
                            </div>
                        )}
                    </CardHeader>
                    <div className="flex-grow min-h-0 overflow-y-auto">
                        <CardContent className="p-3 pt-0">
                           {renderContent()}
                        </CardContent>
                    </div>
                     <CardFooter className="p-3 border-t">
                         <div className="flex gap-2 w-full">
                            {audioSrc && (
                              <div className="flex gap-2 w-full">
                                 <Input value={newAnnotation} onChange={e => setNewAnnotation(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddPoint('timestamp')} placeholder="Add a note at current time..." className="h-8 text-xs" />
                                 <Button size="sm" onClick={() => handleAddPoint('timestamp')}>Add Note</Button>
                             </div>
                            )}
                         </div>
                     </CardFooter>
                </Card>
                 <Dialog open={isMindMapModalOpen} onOpenChange={setIsMindMapModalOpen}>
                    <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
                        <DialogHeader className="p-4 border-b">
                            <DialogTitle>Mind Map for: {resource.name}</DialogTitle>
                        </DialogHeader>
                        <div className="flex-grow min-h-0">
                          <MindMapViewer showControls={false} rootFocusAreaId={resource.id} />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

