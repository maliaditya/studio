
"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, X, GripVertical, Library, MessageSquare, Code, ArrowRight, ArrowUpRight, Upload, Play, Pause, Unlink, Edit3, PlusCircle, PopoverClose, Trash2, Blocks, Loader2, Brain, View, Pin, PinOff, ChevronRight, Link as LinkIcon, Workflow, GitMerge, Paintbrush, Youtube } from 'lucide-react';
import type { Resource, ResourcePoint, PopupState } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { useDraggable } from '@dnd-kit/core';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getAudio, storeAudio, deleteAudio, getAudioForResource } from '@/lib/audioDB';
import { useRouter } from 'next/navigation';
import { EditableResourcePoint } from './EditableFields';
import { MindMapViewer } from './MindMapViewer';
import { VisuallyHidden } from './ui/visually-hidden';
import { HabitResourceCard } from './HabitResourceCard';
import { MechanismResourceCard } from './MechanismResourceCard';
import { SearchPopup } from './DrawingCanvas';
import ReactPlayer from 'react-player/youtube';
import { format, parseISO } from 'date-fns';
import AudioMiniPlayer from './AudioMiniPlayer';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';

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


const PointTree = ({ points, onUpdate, onDelete, onOpenNestedPopup, openContentViewPopup, createResourceWithHierarchy, onSeekTo, currentTime, onOpenDrawingCanvas, onSetEndTime, onClearEndTime }: {
    points: (ResourcePoint & { children: ResourcePoint[] })[];
    onUpdate: (pointId: string, updatedPoint: Partial<ResourcePoint>) => void;
    onDelete: (pointId: string) => void;
    onOpenNestedPopup: (resourceId: string, event: React.MouseEvent) => void;
    openContentViewPopup: (contentId: string, point: ResourcePoint, event: React.MouseEvent) => void;
    createResourceWithHierarchy: (pointToConvert: ResourcePoint, type: Resource['type']) => void;
    onSeekTo: (timestamp: number) => void;
    currentTime: number;
    onOpenDrawingCanvas: (point: ResourcePoint) => void;
    onSetEndTime: (point: ResourcePoint) => void;
    onClearEndTime: (pointId: string) => void;
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
              onSetEndTime={() => onSetEndTime(point)}
              onClearEndTime={() => onClearEndTime(point.id)}
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
                onSetEndTime={onSetEndTime}
                onClearEndTime={onClearEndTime}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </ul>
  );
};

const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  {
    ssr: false,
    loading: () => <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Loading canvas...</div>,
  }
);

const CanvasPreviewPopup = ({
  title,
  drawingData,
  onClose,
  initialRect,
  onOpenInCanvas,
  storageKey,
}: {
  title: string;
  drawingData?: string | null;
  onClose: () => void;
  initialRect: { x: number; y: number; width: number; height: number };
  onOpenInCanvas: () => void;
  storageKey: string;
}) => {
  const [position, setPosition] = useState({ x: initialRect.x, y: initialRect.y });
  const [size, setSize] = useState({ width: initialRect.width, height: initialRect.height });
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const excalidrawAPIRef = useRef<any>(null);
  const initialData = useMemo(() => {
    if (!drawingData) return { elements: [] as any[] };
    try {
      const parsed = JSON.parse(drawingData);
      if (Array.isArray(parsed.elements)) {
        return { elements: parsed.elements, appState: parsed.appState };
      }
    } catch (e) {
      console.error('Failed to parse preview canvas data:', e);
    }
    return { elements: [] as any[] };
  }, [drawingData]);

  useEffect(() => {
    const api = excalidrawAPIRef.current;
    if (!api) return;
    const t = setTimeout(() => {
      if (api?.scrollToContent) {
        api.scrollToContent(api.getSceneElements(), { fitToContent: true });
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? (JSON.parse(raw) as { zoom?: number }) : null;
        const zoom = typeof parsed?.zoom === 'number' ? parsed!.zoom : 0.3;
        if (api.updateScene) {
          api.updateScene({ appState: { zoom: { value: zoom } } });
        }
      }
    }, 0);
    return () => clearTimeout(t);
  }, [drawingData, storageKey]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragState.current) return;
      const dx = event.clientX - dragState.current.startX;
      const dy = event.clientY - dragState.current.startY;
      setPosition({
        x: dragState.current.originX + dx,
        y: dragState.current.originY + dy,
      });
    };
    const handlePointerUp = () => {
      dragState.current = null;
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { x?: number; y?: number; width?: number; height?: number; zoom?: number };
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        setPosition({ x: parsed.x, y: parsed.y });
      }
      if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
        setSize({ width: parsed.width, height: parsed.height });
      }
    } catch {
      // ignore
    }
    setIsLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    const api = excalidrawAPIRef.current;
    const zoom = api?.getAppState?.()?.zoom?.value;
    try {
      if (!isLoaded) return;
      safeSetLocalStorageItem(
        storageKey,
        JSON.stringify({
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
          zoom: typeof zoom === 'number' ? zoom : undefined,
        })
      );
    } catch {
      // ignore
    }
  }, [position, size, storageKey, isLoaded]);

  return (
    <div
      ref={containerRef}
      style={{
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
        minWidth: 320,
        minHeight: 240,
      }}
      className="fixed z-[160] rounded-2xl border border-white/10 bg-background/90 backdrop-blur-md shadow-2xl overflow-hidden resize both canvas-preview"
    >
      <div
        className="absolute top-2 left-2 z-20 flex items-center gap-1 rounded-full bg-background/60 border border-white/10 px-2 py-1 cursor-grab active:cursor-grabbing"
        onPointerDown={(event) => {
          dragState.current = {
            startX: event.clientX,
            startY: event.clientY,
            originX: position.x,
            originY: position.y,
          };
        }}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/70" />
        <span className="text-[10px] text-muted-foreground/70">Drag</span>
      </div>
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 rounded-full bg-background/60 border border-white/10 px-1 py-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenInCanvas} title="Open in Canvas">
          <ArrowUpRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="h-full w-full">
        <Excalidraw
          initialData={initialData}
          excalidrawAPI={(api) => (excalidrawAPIRef.current = api)}
          theme="dark"
          viewModeEnabled={true}
          zenModeEnabled={true}
          gridModeEnabled={false}
          UIOptions={{
            canvasActions: {
              export: false,
              loadScene: false,
              saveToActiveFile: false,
              toggleTheme: false,
              clearCanvas: false,
              changeViewBackgroundColor: false,
            },
          }}
        />
      </div>
    </div>
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
    const cardRef = useRef<HTMLDivElement>(null);
    const [playingAudio, setPlayingAudio] = useState(false);
    const [canvasPreview, setCanvasPreview] = useState<{ title: string; drawing: string | null; x: number; y: number; width: number; height: number; resourceId: string; pointId: string } | null>(null);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const playerRef = useRef<ReactPlayer>(null);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [newAnnotation, setNewAnnotation] = useState('');
    const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
    const [isLinkingCanvasOpen, setIsLinkingCanvasOpen] = useState(false);
    
    const resource = resources.find(r => r.id === popupState.resourceId);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `general-popup-${popupState.resourceId}`,
    });

    const baseZ = (drawingCanvasState?.isOpen ? 150 : 65) + (popupState.level || 0);
    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        width: `${popupState.width || 420}px`,
        willChange: 'transform',
        zIndex: Math.max(popupState.z ?? 0, baseZ),
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }
    
     useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl || !resource?.id) return;
        
        let objectUrl: string | null = null;
        
        const loadAudio = async () => {
          console.debug('GeneralResourcePopup: loading audio for', resource?.id, resource?.audioFileName, 'hasLocalAudio=', resource?.hasLocalAudio);
          if (resource.hasLocalAudio) {
            try {
              const { blob: audioBlob, key: foundKey } = await getAudioForResource(resource.id, resource.audioFileName);
              console.debug('GeneralResourcePopup: getAudioForResource result', { foundKey, hasBlob: !!audioBlob });

              if (audioBlob) {
                objectUrl = URL.createObjectURL(audioBlob);
                setAudioSrc(objectUrl);
                // If we loaded audio from a filename key different from the resource id, update the resource so future loads are consistent
                if (foundKey && foundKey !== resource.id) {
                  try {
                    onUpdate({ ...resource, hasLocalAudio: true, audioFileName: foundKey });
                  } catch (e) {
                    // ignore update errors
                  }
                }
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
          const newTimestamp = Math.max(0, currentTime - (settings.timestampAnnotationOffset || 30));
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
        if (playerRef.current) {
            playerRef.current.seekTo(timestamp, 'seconds');
            setPlayingAudio(true);
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

    const handleSetEndTime = (point: ResourcePoint) => {
        const audioEl = audioRef.current;
        const player = playerRef.current;
        let time: number | undefined;

        if (audioEl && !audioEl.paused) time = audioEl.currentTime;
        if (player) time = player.getCurrentTime();

        if (time !== undefined) {
            handleUpdatePoint(point.id, { endTime: time });
        }
    };
    
    const handleClearEndTime = (pointId: string) => {
        handleUpdatePoint(pointId, { endTime: undefined });
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
	            const { key: foundKey } = await getAudioForResource(resource.id, resource.audioFileName);
	            if (foundKey && foundKey !== resource.id) {
	              await deleteAudio(foundKey);
	            }
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
        let title = point.text || 'Canvas';
        let drawing = point.drawing;
        let resourceId = resource.id;
        let pointId = point.id;

        if (typeof drawing === 'string' && drawing.startsWith('canvas://')) {
            const [resId, linkedPointId] = drawing.replace('canvas://', '').split('/');
            const linkedResource = resources.find(r => r.id === resId);
            const linkedPoint = linkedResource?.points?.find(p => p.id === linkedPointId);
            if (linkedPoint) {
                title = linkedPoint.text || title;
                drawing = linkedPoint.drawing;
                resourceId = resId;
                pointId = linkedPointId;
            }
        }

        const rect = cardRef.current?.getBoundingClientRect();
        const width = Math.max(360, Math.min(window.innerWidth * 0.6, 720));
        const height = Math.max(260, Math.min(window.innerHeight * 0.55, 520));
        const x = (rect?.x ?? (window.innerWidth - width) / 2) + 20;
        const y = (rect?.y ?? (window.innerHeight - height) / 2) + 20;

        setCanvasPreview({
            title,
            drawing: typeof drawing === 'string' ? drawing : null,
            x,
            y,
            width,
            height,
            resourceId,
            pointId,
        });
    }, [resources]);
    
    const handleLinkCanvas = (selectedResource: Resource, selectedPoint: ResourcePoint) => {
        const newPoint: ResourcePoint = {
            id: `point_${Date.now()}`,
            type: 'paint',
            text: selectedPoint.text || 'Linked Canvas',
            drawing: `canvas://${selectedResource.id}/${selectedPoint.id}`,
        };
        const updatedPoints = [...(resource.points || []), newPoint];
        onUpdate({ ...resource, points: updatedPoints });
        setIsLinkingCanvasOpen(false);
    };

    const youtubeEmbedUrl = getYouTubeEmbedUrl(resource.link);

    const canvasPreviewRect = useMemo(() => {
        if (!canvasPreview) return null;
        return {
            x: canvasPreview.x,
            y: canvasPreview.y,
            width: canvasPreview.width,
            height: canvasPreview.height,
        };
    }, [canvasPreview]);
    
    const renderContent = () => {
        switch (resource.type) {
            case 'habit':
                return <HabitResourceCard resource={resource} onUpdate={onUpdate} onDelete={() => {}} onLinkClick={() => {}} linkingFromId={null} onOpenNestedPopup={onOpenNestedPopup} />;
            case 'mechanism':
                return <MechanismResourceCard resource={resource} onUpdate={onUpdate} onDelete={() => {}} onLinkClick={() => {}} linkingFromId={null} onOpenNestedPopup={onOpenNestedPopup} />;
            case 'card':
            default:
                return (
                    <>
                        {youtubeEmbedUrl && (
                            <div className="aspect-video w-full bg-black overflow-hidden mb-4 rounded-md">
                                <ReactPlayer
                                    ref={playerRef}
                                    url={resource.link!}
                                    width="100%"
                                    height="100%"
                                    playing={playingAudio}
                                    controls={true}
                                    volume={globalVolume}
                                    onProgress={(state) => setCurrentTime(state.playedSeconds)}
                                    onDuration={setDuration}
                                />
                            </div>
                        )}
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
                            onSetEndTime={(point) => handleSetEndTime(point)}
                            onClearEndTime={handleClearEndTime}
                        />
                    </>
                );
        }
    };


    return (
        <>
            <div ref={setNodeRef} style={style} {...attributes} data-popup-id={popupState.resourceId}>
                <audio ref={audioRef} onEnded={() => setPlayingAudio(false)} className="hidden" />
                <input type="file" ref={audioInputRef} onChange={handleAudioUpload} accept="audio/*" className="hidden" />
                <Card ref={cardRef} className="shadow-2xl border border-primary/20 bg-gradient-to-b from-card/95 via-card/90 to-card/80 flex flex-col max-h-[80vh] relative group rounded-2xl overflow-hidden">
                    <div className="absolute top-3 right-3 z-20 flex items-center bg-background/60 backdrop-blur-md border border-white/10 rounded-full px-1 py-0.5 shadow-lg">
                        <TooltipProvider delayDuration={200}>
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
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsLinkingCanvasOpen(true)}><LinkIcon className="h-4 w-4 text-red-500" /></Button></TooltipTrigger><TooltipContent><p>Link Canvas</p></TooltipContent></Tooltip>
                        </TooltipProvider>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={handleClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

	                    <CardHeader 
	                        className="p-4 pt-10 relative flex-shrink-0"
	                    >
	                        <div
	                            className="absolute top-0 left-0 right-0 h-9 flex items-center justify-center cursor-grab active:cursor-grabbing"
	                            {...listeners}
	                        >
	                            <GripVertical className="h-5 w-5 text-muted-foreground/30" />
	                        </div>
	                        <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-muted/40 border border-white/10 flex items-center justify-center">
	                            {getIcon()}
                              </div>
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
	                          {resource.hasLocalAudio && (
	                            <div className="mt-2">
	                              <AudioMiniPlayer resource={resource} />
	                            </div>
	                          )}
	                        {folderPath && (
	                            <CardDescription className="text-xs pt-2" title={folderPath}>
	                              <span className="flex items-center gap-1 flex-wrap">
	                                {folderPath.split(' / ').map((part, index, arr) => (
	                                    <React.Fragment key={index}>
	                                        <span className="px-2 py-0.5 rounded-full bg-muted/40 border border-white/10">{part}</span>
	                                        {index < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
	                                    </React.Fragment>
	                                ))}
	                              </span>
	                            </CardDescription>
	                        )}
                         {(audioSrc || youtubeEmbedUrl) && (
                            <div className="w-full space-y-2 pt-3">
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
                                        onChange={(e) => {
                                            const newTime = parseFloat(e.target.value);
                                            setCurrentTime(newTime);
                                            if (audioRef.current) audioRef.current.currentTime = newTime;
                                            if (playerRef.current) playerRef.current.seekTo(newTime, 'seconds');
                                        }}
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
                        <CardContent className="p-4 pt-0">
                           {renderContent()}
                        </CardContent>
                    </div>
                     <CardFooter className="p-3 border-t border-white/10 bg-muted/30">
                         <div className="flex gap-2 w-full">
                            {(audioSrc || youtubeEmbedUrl) && (
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
            {canvasPreview && canvasPreviewRect && (
                <CanvasPreviewPopup
                    title={canvasPreview.title}
                    drawingData={canvasPreview.drawing}
                    onClose={() => setCanvasPreview(null)}
                    initialRect={canvasPreviewRect}
                    onOpenInCanvas={() => {
                      authOpenDrawingCanvas({
                        resourceId: canvasPreview.resourceId,
                        pointId: canvasPreview.pointId,
                        name: canvasPreview.title,
                        initialDrawing: canvasPreview.drawing ?? undefined,
                        size: 'normal',
                      });
                    }}
                    storageKey={`canvasPreview:${canvasPreview.resourceId}-${canvasPreview.pointId}`}
                />
            )}
            <SearchPopup open={isLinkingCanvasOpen} setOpen={setIsLinkingCanvasOpen} onSelect={handleLinkCanvas} title="Link an Existing Canvas" />
        </>
    );
}
