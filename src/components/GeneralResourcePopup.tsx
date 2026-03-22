
"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, X, GripVertical, Library, MessageSquare, Code, ArrowRight, ArrowUpRight, Upload, Play, Pause, Unlink, Edit3, PlusCircle, Trash2, Blocks, Loader2, Brain, Pin, PinOff, ChevronRight, Link as LinkIcon, Workflow, GitMerge, Paintbrush, Youtube, Volume2, VolumeX, Expand, Minimize2, Bot, Mic, MicOff, Save } from 'lucide-react';
import type { Resource, ResourcePoint, PopupState } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getAudio, storeAudio, deleteAudio, getAudioForResource } from '@/lib/audioDB';
import { EditableResourcePoint, RESOURCE_BLOCK_OPTIONS, ResourceBlockMenu } from './EditableFields';
import { MindMapViewer } from './MindMapViewer';
import { VisuallyHidden } from './ui/visually-hidden';
import { HabitResourceCard } from './HabitResourceCard';
import { MechanismResourceCard } from './MechanismResourceCard';
import { SearchPopup } from './DrawingCanvas';
import ReactPlayer from 'react-player/youtube';
import { format, parseISO } from 'date-fns';
import AudioMiniPlayer from './AudioMiniPlayer';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';
import { parseJsonWithRecovery } from '@/lib/jsonRecovery';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FlashcardMcqPanel } from './FlashcardMcqPanel';
import { buildReadableTextFromResource } from '@/lib/resourceSpeech';
import { useBufferedResource } from '@/hooks/useBufferedResource';
import { loadAstraVoicePrefs, pickBestVoice } from '@/lib/tts';
import { getAiConfigFromSettings } from '@/lib/ai/config';
import { useToast } from '@/hooks/use-toast';

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
  onNavigatePath: (popupId: string, resourceId: string) => void;
  onUpdate: (resource: Resource) => void;
  onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState) => void;
  onResize?: (popupId: string, resourceId: string, width: number, height: number) => void;
  onPositionChange?: (popupId: string, resourceId: string, x: number, y: number) => void;
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


const PointTree = ({ resource, points, onUpdate, onDelete, onOpenNestedPopup, openContentViewPopup, createResourceWithHierarchy, onSeekTo, currentTime, onOpenDrawingCanvas, onSetEndTime, onClearEndTime, onInsertBelow, onChangeType, autoFocusPointId, onAutoFocusConsumed, onRequestFocusPoint }: {
    resource: Resource;
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
    onInsertBelow: (pointId: string, type?: ResourcePoint['type']) => void;
    onChangeType: (pointId: string, type: ResourcePoint['type']) => void;
    autoFocusPointId: string | null;
    onAutoFocusConsumed: () => void;
    onRequestFocusPoint: (pointId: string | null) => void;
}) => {
  return (
    <ul className="space-y-1 text-sm text-muted-foreground pr-2">
      {points.map((point, index) => {
        const numberedIndex =
          point.type === 'numbered-list'
            ? points.filter((entry, entryIndex) => entry.type === 'numbered-list' && entryIndex <= index).length - 1
            : index;
        return (
        <React.Fragment key={point.id}>
          <EditableResourcePoint 
              resource={resource}
              point={point}
              onUpdate={onUpdate}
              onDelete={() => onDelete(point.id)}
              onOpenNestedPopup={(e) => onOpenNestedPopup(point.resourceId!, e)}
              onConvertToCard={() => createResourceWithHierarchy(point, 'card')}
              onSeekTo={onSeekTo}
              currentTime={currentTime}
              onOpenDrawingCanvas={() => onOpenDrawingCanvas(point)}
              onSetEndTime={() => onSetEndTime(point)}
              onClearEndTime={() => onClearEndTime(point.id)}
              onInsertBelow={onInsertBelow}
              onChangeType={onChangeType}
              autoFocus={autoFocusPointId === point.id}
              onAutoFocusConsumed={onAutoFocusConsumed}
              blockIndex={numberedIndex}
              onFocusPrevious={() => {
                const previousPoint = points[index - 1];
                if (previousPoint) {
                  onRequestFocusPoint(previousPoint.id);
                }
              }}
          />
          {point.children.length > 0 && (
            <div className="pl-4 mt-1 border-l-2 border-dashed border-primary/20">
              <PointTree 
                resource={resource}
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
                onInsertBelow={onInsertBelow}
                onChangeType={onChangeType}
                autoFocusPointId={autoFocusPointId}
                onAutoFocusConsumed={onAutoFocusConsumed}
                onRequestFocusPoint={onRequestFocusPoint}
              />
            </div>
          )}
        </React.Fragment>
      )})}
    </ul>
  );
};

type ResourceAstraMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    mode: 'ask' | 'transcribe';
    savable?: boolean;
};

const getResourceNoteTitle = (content: string, fallback = 'AI Note') => {
    const firstLine = String(content || '')
        .split('\n')
        .map((line) => line.replace(/^[-#*\s>]+/, '').trim())
        .find(Boolean);
    return (firstLine || fallback).slice(0, 80);
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
      const parsed = parseJsonWithRecovery<{ elements?: any[]; appState?: any }>(drawingData);
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
          minWidth: 520,
          minHeight: 360,
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


export function GeneralResourcePopup({ popupState, onClose, onNavigatePath, onUpdate, onOpenNestedPopup, onResize, onPositionChange }: GeneralResourcePopupProps) {
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
      drawingCanvasState,
      openDrawingCanvas: authOpenDrawingCanvas,
    } = useAuth();
    const { toast } = useToast();
    const [editingTitle, setEditingTitle] = useState(false);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const [playingAudio, setPlayingAudio] = useState(false);
    const [isReadingAloud, setIsReadingAloud] = useState(false);
    const [autoFocusPointId, setAutoFocusPointId] = useState<string | null>(null);
    const [isAddBlockMenuOpen, setIsAddBlockMenuOpen] = useState(false);
    const [canvasPreview, setCanvasPreview] = useState<{ title: string; drawing: string | null; x: number; y: number; width: number; height: number; resourceId: string; pointId: string } | null>(null);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const playerRef = useRef<ReactPlayer>(null);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [newAnnotation, setNewAnnotation] = useState('');
    const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
    const [isLinkingCanvasOpen, setIsLinkingCanvasOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [astraPanelMode, setAstraPanelMode] = useState<'ask' | 'transcribe'>('ask');
    const [astraMessages, setAstraMessages] = useState<ResourceAstraMessage[]>([]);
    const [astraInput, setAstraInput] = useState('');
    const [astraError, setAstraError] = useState<string | null>(null);
    const [isAstraLoading, setIsAstraLoading] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isRecordingAstraNote, setIsRecordingAstraNote] = useState(false);
    const [selectedAiNoteId, setSelectedAiNoteId] = useState<string | null>(null);
    const preFullscreenRectRef = useRef<{ width: number; height: number } | null>(null);
    const astraMediaRecorderRef = useRef<MediaRecorder | null>(null);
    const astraMediaStreamRef = useRef<MediaStream | null>(null);
    const astraMediaChunksRef = useRef<Blob[]>([]);
    
    const liveResource = resources.find(r => r.id === popupState.resourceId);
    const bufferedResource = useBufferedResource(liveResource || null, onUpdate);
    const resource = bufferedResource.draftResource ?? liveResource ?? null;
    const { queueUpdate, flush } = bufferedResource;
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    
    const popupId = popupState.popupId || popupState.resourceId;
    const popupContainerRef = useRef<HTMLDivElement | null>(null);
    const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number; dx: number; dy: number } | null>(null);
    const dragFrameRef = useRef<number | null>(null);

    const setPopupRef = useCallback((node: HTMLDivElement | null) => {
      popupContainerRef.current = node;
    }, []);

    const baseZ = (drawingCanvasState?.isOpen ? 150 : 65) + (popupState.level || 0);
    const viewportWidth = typeof window === 'undefined' ? 1440 : window.innerWidth;
    const viewportHeight = typeof window === 'undefined' ? 900 : window.innerHeight;
    const expandedWidth = Math.round(viewportWidth * 0.95);
    const expandedHeight = Math.round(viewportHeight * 0.95);
    const style: React.CSSProperties = {
        position: 'fixed',
        top: isFullscreen
            ? Math.max(16, Math.round((viewportHeight - expandedHeight) / 2))
            : popupState.y,
        left: isFullscreen
            ? Math.max(16, Math.round((viewportWidth - expandedWidth) / 2))
            : popupState.x,
        width: isFullscreen ? `${expandedWidth}px` : `${popupState.width || 420}px`,
        height: isFullscreen ? `${expandedHeight}px` : `${popupState.height || 600}px`,
        minWidth: 360,
        minHeight: 260,
        maxWidth: isFullscreen ? `${expandedWidth}px` : '95vw',
        maxHeight: isFullscreen ? `${expandedHeight}px` : '90vh',
        overflow: 'hidden',
        willChange: 'transform',
        zIndex: Math.max(popupState.z ?? 0, baseZ),
    };

    const applyDragTransform = useCallback((dx: number, dy: number) => {
      const node = popupContainerRef.current;
      if (!node) return;
      node.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }, []);

    const clearDragTransform = useCallback(() => {
      const node = popupContainerRef.current;
      if (!node) return;
      node.style.transform = '';
    }, []);

    const handleDragPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
      if (isFullscreen) return;
      if (event.button !== 0) return;
      dragStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: popupState.x,
        originY: popupState.y,
        dx: 0,
        dy: 0,
      };
      (event.currentTarget as HTMLDivElement).setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }, [isFullscreen, popupState.x, popupState.y]);

    useEffect(() => {
      const handlePointerMove = (event: PointerEvent) => {
        const drag = dragStateRef.current;
        if (!drag) return;
        drag.dx = event.clientX - drag.startX;
        drag.dy = event.clientY - drag.startY;
        if (dragFrameRef.current !== null) return;
        dragFrameRef.current = window.requestAnimationFrame(() => {
          dragFrameRef.current = null;
          const latest = dragStateRef.current;
          if (!latest) return;
          applyDragTransform(latest.dx, latest.dy);
        });
      };

      const handlePointerUp = () => {
        const drag = dragStateRef.current;
        if (!drag) return;
        if (dragFrameRef.current !== null) {
          window.cancelAnimationFrame(dragFrameRef.current);
          dragFrameRef.current = null;
        }
        clearDragTransform();
        onPositionChange?.(popupId, popupState.resourceId, drag.originX + drag.dx, drag.originY + drag.dy);
        dragStateRef.current = null;
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        if (dragFrameRef.current !== null) {
          window.cancelAnimationFrame(dragFrameRef.current);
          dragFrameRef.current = null;
        }
      };
    }, [applyDragTransform, clearDragTransform, onPositionChange, popupId, popupState.resourceId]);

    useEffect(() => {
      const node = popupContainerRef.current;
      if (!node) return;
      if (isFullscreen) return;
      const observer = new ResizeObserver(() => {
        const rect = node.getBoundingClientRect();
        onResize?.(popupId, popupState.resourceId, rect.width, rect.height);
      });
      observer.observe(node);
      return () => observer.disconnect();
    }, [isFullscreen, onResize, popupId, popupState.resourceId]);
    
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
                    queueUpdate((current) => ({ ...current, hasLocalAudio: true, audioFileName: foundKey }));
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

    const navigationPathResources = useMemo(() => {
      const ids = popupState.navigationPath && popupState.navigationPath.length > 0
        ? popupState.navigationPath
        : [popupState.resourceId];
      return ids
        .map(id => resources.find(r => r.id === id))
        .filter((r): r is Resource => !!r);
    }, [popupState.navigationPath, popupState.resourceId, resources]);

    if (!resource) return null;

    const handleTitleChange = (newTitle: string) => {
        queueUpdate((current) => ({ ...current, name: newTitle }));
    };

    const createPoint = (type: ResourcePoint['type'] = 'text', text = 'New step...'): ResourcePoint => ({
        id: `point_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text,
        type,
        checked: type === 'todo' ? false : undefined,
    });

    const handleAddPoint = (type: ResourcePoint['type']) => {
        let newPoint: ResourcePoint;
        if (type === 'timestamp') {
          const newTimestamp = Math.max(0, currentTime - (settings.timestampAnnotationOffset || 30));
          newPoint = { id: `point_${Date.now()}`, text: newAnnotation || 'New Note', type, timestamp: newTimestamp };
          setNewAnnotation('');
        } else {
          newPoint = createPoint(type || 'text');
          setAutoFocusPointId(newPoint.id);
        }

        queueUpdate((current) => ({ ...current, points: [...(current.points || []), newPoint] }));
    };

    const handleInsertPointBelow = (pointId: string, type: ResourcePoint['type'] = 'text') => {
        const newPoint = createPoint(type || 'text', '');
        setAutoFocusPointId(newPoint.id);
        queueUpdate((current) => {
            const points = current.points || [];
            const insertIndex = points.findIndex((p) => p.id === pointId);
            const updatedPoints = [...points];
            updatedPoints.splice(insertIndex >= 0 ? insertIndex + 1 : updatedPoints.length, 0, newPoint);
            return { ...current, points: updatedPoints };
        });
    };

    const handleChangePointType = (pointId: string, type: ResourcePoint['type']) => {
        queueUpdate((current) => ({
            ...current,
            points: (current.points || []).map((p) =>
                p.id === pointId
                    ? { ...p, type, checked: type === 'todo' ? Boolean(p.checked) : undefined }
                    : p
            ),
        }));
    };

    const handleUpdatePoint = (pointId: string, updatedPoint: Partial<ResourcePoint>) => {
        queueUpdate((current) => ({
            ...current,
            points: (current.points || []).map((p) =>
                p.id === pointId ? { ...p, ...updatedPoint } : p
            ),
        }));
    };

    const handleDeletePoint = (pointId: string) => {
        queueUpdate((current) => ({
            ...current,
            points: (current.points || []).filter((p) => p.id !== pointId),
        }));
    };
    
    const handleClose = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        stopAstraRecording();
        flush();
        setPlayingAudio(false);
        onClose(popupId);
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
            case 'flashcard': return <Library className="h-5 w-5 text-orange-400"/>;
            case 'card': default: return <Library className="h-5 w-5 text-primary"/>;
        }
    };

    const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        try {
          await storeAudio(resource.id, file);
          queueUpdate((current) => ({ ...current, hasLocalAudio: true, audioFileName: file.name }));
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
	            queueUpdate((current) => ({ ...current, hasLocalAudio: false, audioFileName: undefined }));
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

    useEffect(() => {
        return () => {
            if (speechUtteranceRef.current && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            astraMediaRecorderRef.current?.stop?.();
            astraMediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    useEffect(() => {
        setIsReadingAloud(false);
    }, [resource.id]);

    const toggleReadAloud = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        if (typeof window === 'undefined' || !('speechSynthesis' in window) || !readableText) return;
        if (isReadingAloud) {
            window.speechSynthesis.cancel();
            speechUtteranceRef.current = null;
            setIsReadingAloud(false);
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(readableText);
        const astraVoicePrefs = loadAstraVoicePrefs();
        utterance.rate = Math.max(0.6, Math.min(1.6, astraVoicePrefs.rate || 0.96));
        const preferredVoice = pickBestVoice(window.speechSynthesis.getVoices(), astraVoicePrefs.systemVoiceUri);
        if (preferredVoice) {
            utterance.voice = preferredVoice;
            utterance.lang = preferredVoice.lang;
        }
        utterance.onend = () => {
            speechUtteranceRef.current = null;
            setIsReadingAloud(false);
        };
        utterance.onerror = () => {
            speechUtteranceRef.current = null;
            setIsReadingAloud(false);
        };
        speechUtteranceRef.current = utterance;
        setIsReadingAloud(true);
        window.speechSynthesis.speak(utterance);
    };

    const handleToggleFavorite = () => {
      queueUpdate((current) => ({ ...current, isFavorite: !current.isFavorite }));
    };

    const handleOpenResourceAstra = useCallback(() => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(
            new CustomEvent('open-astra-resource-chat', {
                detail: {
                    resourceId: resource.id,
                    resourceName: resource.name || 'Resource Card',
                },
            })
        );
    }, [resource.id, resource.name]);

    const handleToggleFullscreen = () => {
      if (!isFullscreen) {
        preFullscreenRectRef.current = {
          width: popupState.width || 768,
          height: popupState.height || 600,
        };
        flush();
        setIsFullscreen(true);
        return;
      }

      const restoreWidth = preFullscreenRectRef.current?.width || popupState.width || 768;
      const restoreHeight = preFullscreenRectRef.current?.height || popupState.height || 600;
      const centeredX = Math.max(16, Math.round((viewportWidth - restoreWidth) / 2));
      const centeredY = Math.max(16, Math.round((viewportHeight - restoreHeight) / 2));

      onResize?.(popupId, popupState.resourceId, restoreWidth, restoreHeight);
      onPositionChange?.(popupId, popupState.resourceId, centeredX, centeredY);
      setIsFullscreen(false);
    };
    
    const visiblePoints = useMemo(() => {
        if (!isFullscreen) return resource.points || [];
        return (resource.points || []).filter((point) => point.type !== 'card' && point.type !== 'paint' && point.type !== 'ai-note' && point.type !== 'link');
    }, [isFullscreen, resource.points]);
    const pointTree = useMemo(() => buildPointTree(visiblePoints), [visiblePoints]);
    const pointCount = resource.points?.length ?? 0;
    const linkedSidebarItems = useMemo(() => {
        const pointLinkedItems = (resource.points || [])
            .filter((point) => point.type === 'card' && point.resourceId)
            .map((point) => {
                const linkedResource = resources.find((entry) => entry.id === point.resourceId);
                return {
                    id: point.id,
                    resourceId: point.resourceId!,
                    label: point.text || linkedResource?.name || 'Untitled link',
                    kind: 'resource-card' as const,
                    removable: true,
                };
            });

        if (resource.type !== 'habit') {
            return pointLinkedItems;
        }

        const habitMechanismItems = [
            {
                id: resource.response?.resourceId ? `habit-negative-${resource.id}` : '',
                resourceId: resource.response?.resourceId || '',
                label: (() => {
                    const linked = resources.find((entry) => entry.id === resource.response?.resourceId);
                    return linked?.name || resource.response?.text || 'Negative Mechanism';
                })(),
                kind: 'negative-mechanism' as const,
                removable: false,
            },
            {
                id: resource.newResponse?.resourceId ? `habit-positive-${resource.id}` : '',
                resourceId: resource.newResponse?.resourceId || '',
                label: (() => {
                    const linked = resources.find((entry) => entry.id === resource.newResponse?.resourceId);
                    return linked?.name || resource.newResponse?.text || 'Positive Mechanism';
                })(),
                kind: 'positive-mechanism' as const,
                removable: false,
            },
        ].filter((item) => item.resourceId);

        return [...habitMechanismItems, ...pointLinkedItems];
    }, [resource.id, resource.newResponse?.resourceId, resource.newResponse?.text, resource.points, resource.response?.resourceId, resource.response?.text, resource.type, resources]);
    const linkedCanvasSidebarItems = useMemo(() => {
        return (resource.points || [])
            .filter((point) => point.type === 'paint')
            .map((point) => ({
                id: point.id,
                label: point.text || 'Untitled Canvas',
                kind: 'canvas' as const,
                point,
            }));
    }, [resource.points]);
    const linkedUrlSidebarItems = useMemo(() => {
        return (resource.points || [])
            .filter((point) => point.type === 'link' && point.url)
            .map((point) => ({
                id: point.id,
                label: point.displayText || point.text || point.url || 'Untitled Link',
                url: point.url!,
            }));
    }, [resource.points]);
    const aiNoteSidebarItems = useMemo(() => {
        return (resource.points || [])
            .filter((point) => point.type === 'ai-note')
            .map((point) => ({
                id: point.id,
                label: point.displayText || getResourceNoteTitle(point.text, 'AI Note'),
                content: point.text || '',
            }));
    }, [resource.points]);
    const selectedAiNote = useMemo(() => {
        if (aiNoteSidebarItems.length === 0) return null;
        if (!selectedAiNoteId) return null;
        return aiNoteSidebarItems.find((item) => item.id === selectedAiNoteId) || null;
    }, [aiNoteSidebarItems, selectedAiNoteId]);
    const flashcardTopicNames = useMemo(() => {
        if (resource.type !== 'flashcard' || !resource.flashcard) return [];
        const topicTable = settings.flashcardTopicTablesBySpecializationId?.[resource.flashcard.specializationId];
        const topicNameById = new Map((topicTable?.topics || []).map((topic) => [topic.id, topic.name] as const));
        return (resource.flashcard.topicIds || []).map((topicId) => topicNameById.get(topicId) || topicId).filter(Boolean);
    }, [resource, settings.flashcardTopicTablesBySpecializationId]);
    const metadataCountLabel = resource.type === 'flashcard'
        ? `${resource.flashcard?.topicIds?.length || 0} topics`
        : `${pointCount} points`;
    const resourceTypeLabel = resource.type === 'card'
      ? 'Resource Card'
      : resource.type === 'habit'
        ? 'Habit'
        : resource.type === 'mechanism'
          ? 'Mechanism'
          : resource.type === 'flashcard'
            ? 'Flash Card'
          : resource.type === 'pdf'
            ? 'PDF'
            : resource.type === 'model3d'
              ? '3D Model'
              : 'Link';
    const createdLabel = resource.createdAt ? format(parseISO(resource.createdAt), 'MMM d, yyyy') : null;
    const readableText = useMemo(() => buildReadableTextFromResource(resource), [resource]);
    
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

        const width = Math.round(window.innerWidth * 0.95);
        const height = Math.round(window.innerHeight * 0.95);
        const x = Math.max(16, Math.round((window.innerWidth - width) / 2));
        const y = Math.max(16, Math.round((window.innerHeight - height) / 2));

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
        queueUpdate((current) => ({ ...current, points: [...(current.points || []), newPoint] }));
        setIsLinkingCanvasOpen(false);
    };

    const saveAiNote = useCallback((content: string, title?: string) => {
        const text = String(content || '').trim();
        if (!text) return;
        const point: ResourcePoint = {
            id: `point_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            type: 'ai-note',
            text,
            displayText: title || getResourceNoteTitle(text, 'AI Note'),
        };
        queueUpdate((current) => ({ ...current, points: [...(current.points || []), point] }));
        setSelectedAiNoteId(point.id);
        toast({ title: 'AI note saved' });
    }, [queueUpdate, toast]);

    const askAstra = useCallback(async (question: string, history: Array<Pick<ResourceAstraMessage, 'role' | 'content'>> = []) => {
        const trimmedQuestion = String(question || '').trim();
        if (!trimmedQuestion) {
            throw new Error('Question is required.');
        }
        const isDesktopRuntime =
            typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
        const aiConfig = getAiConfigFromSettings(settings, isDesktopRuntime);
        const response = await fetch('/api/ai/ask-shiv', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-studio-desktop': isDesktopRuntime ? '1' : '0',
            },
            body: JSON.stringify({
                question: `${trimmedQuestion}\n\nResource context:\n- Name: ${resource.name}\n- Type: ${resource.type}\n- Notes count: ${(resource.points || []).length}`,
                history,
                appContext: {
                    currentResource: {
                        id: resource.id,
                        name: resource.name,
                        type: resource.type,
                    },
                },
                aiConfig,
                openMode: true,
                replyLanguage: String(settings?.astraReplyLanguage || 'auto').trim().toLowerCase(),
            }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(String(result?.details || result?.error || 'Failed to get Astra response.'));
        }
        const answer = typeof result?.answer === 'string' ? result.answer.trim() : '';
        if (!answer) {
            throw new Error('Astra returned an empty answer.');
        }
        return answer;
    }, [resource.id, resource.name, resource.points, resource.type, settings]);

    const handleAskAstra = useCallback(async () => {
        const question = astraInput.trim();
        if (!question || isAstraLoading) return;
        const userMessage: ResourceAstraMessage = {
            id: `astra_user_${Date.now()}`,
            role: 'user',
            content: question,
            mode: 'ask',
        };
        const nextHistory = [...astraMessages, userMessage].slice(-8);
        setAstraMessages(nextHistory);
        setAstraInput('');
        setAstraError(null);
        setIsAstraLoading(true);
        try {
            const answer = await askAstra(
                question,
                nextHistory.map((message) => ({ role: message.role, content: message.content }))
            );
            setAstraMessages((prev) => [
                ...prev,
                {
                    id: `astra_assistant_${Date.now()}`,
                    role: 'assistant',
                    content: answer,
                    mode: 'ask',
                    savable: true,
                },
            ].slice(-10));
        } catch (error) {
            setAstraError(error instanceof Error ? error.message : 'Failed to ask Astra.');
        } finally {
            setIsAstraLoading(false);
        }
    }, [askAstra, astraInput, astraMessages, isAstraLoading]);

    const transcribeAudioBlob = useCallback(async (audioBlob: Blob) => {
        const isDesktopRuntime =
            typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
        const aiConfig = getAiConfigFromSettings(settings, isDesktopRuntime);
        const formData = new FormData();
        formData.append('audio', audioBlob, audioBlob.type === 'audio/wav' ? 'speech.wav' : 'speech.webm');
        formData.append('aiConfig', JSON.stringify(aiConfig));
        formData.append('localSttBaseUrl', String(settings?.localSttBaseUrl || '').trim() || 'http://127.0.0.1:9890');
        const response = await fetch('/api/ai/stt', {
            method: 'POST',
            headers: {
                'x-studio-desktop': isDesktopRuntime ? '1' : '0',
            },
            body: formData,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(String(result?.details || result?.error || 'Speech transcription failed.'));
        }
        const text = String(result?.text || '').trim();
        if (!text) {
            throw new Error('Speech transcription returned empty text.');
        }
        return text;
    }, [settings]);

    const handleProcessTranscript = useCallback(async (transcript: string) => {
        const cleanedTranscript = String(transcript || '').trim();
        if (!cleanedTranscript) return;
        const userMessage: ResourceAstraMessage = {
            id: `astra_transcript_${Date.now()}`,
            role: 'user',
            content: cleanedTranscript,
            mode: 'transcribe',
        };
        setAstraMessages((prev) => [...prev, userMessage].slice(-10));
        setIsTranscribing(true);
        setAstraError(null);
        try {
            const answer = await askAstra(
                `Convert the following spoken transcript into polished notes for the resource "${resource.name}". Preserve meaning, remove grammatical mistakes, organize clearly in markdown, and do not invent facts.\n\nTranscript:\n${cleanedTranscript}`,
                []
            );
            setAstraMessages((prev) => [
                ...prev,
                {
                    id: `astra_formatted_${Date.now()}`,
                    role: 'assistant',
                    content: answer,
                    mode: 'transcribe',
                    savable: true,
                },
            ].slice(-10));
        } catch (error) {
            setAstraError(error instanceof Error ? error.message : 'Failed to convert transcript into notes.');
        } finally {
            setIsTranscribing(false);
        }
    }, [askAstra, resource.name]);

    const stopAstraRecording = useCallback(() => {
        const recorder = astraMediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
        }
    }, []);

    const startAstraRecording = useCallback(async () => {
        if (isRecordingAstraNote || isTranscribing || typeof navigator === 'undefined' || typeof MediaRecorder === 'undefined') {
            return;
        }
        try {
            setAstraError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            astraMediaStreamRef.current = stream;
            const preferredMimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
            const mimeType = preferredMimeTypes.find((type) => {
                try {
                    return MediaRecorder.isTypeSupported(type);
                } catch {
                    return false;
                }
            });
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            astraMediaRecorderRef.current = recorder;
            astraMediaChunksRef.current = [];
            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    astraMediaChunksRef.current.push(event.data);
                }
            };
            recorder.onstop = async () => {
                const blobType = mimeType || 'audio/webm';
                const blob = new Blob(astraMediaChunksRef.current, { type: blobType });
                astraMediaChunksRef.current = [];
                astraMediaStreamRef.current?.getTracks().forEach((track) => track.stop());
                astraMediaStreamRef.current = null;
                setIsRecordingAstraNote(false);
                if (blob.size <= 0) return;
                try {
                    const transcript = await transcribeAudioBlob(blob);
                    await handleProcessTranscript(transcript);
                } catch (error) {
                    setAstraError(error instanceof Error ? error.message : 'Failed to transcribe audio.');
                }
            };
            recorder.start();
            setIsRecordingAstraNote(true);
        } catch (error) {
            setAstraError(error instanceof Error ? error.message : 'Microphone access failed.');
        }
    }, [handleProcessTranscript, isRecordingAstraNote, isTranscribing, transcribeAudioBlob]);

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
                return <HabitResourceCard resource={resource} onUpdate={onUpdate} onDelete={() => {}} onLinkClick={() => {}} linkingFromId={null} onOpenNestedPopup={(resourceId, event) => onOpenNestedPopup(resourceId, event, popupState)} />;
            case 'mechanism':
                return <MechanismResourceCard resource={resource} onUpdate={onUpdate} onDelete={() => {}} onLinkClick={() => {}} linkingFromId={null} onOpenNestedPopup={(resourceId, event) => onOpenNestedPopup(resourceId, event, popupState)} />;
            case 'flashcard':
                return (
                    <div className="space-y-4">
                        <FlashcardMcqPanel flashcard={resource.flashcard} />
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Source</div>
                                <div className="mt-2 text-sm text-foreground">
                                    {resource.flashcard?.specializationName || 'Unknown specialization'}
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    PDF page {resource.flashcard?.pageNumber || '-'}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                    {resource.flashcard?.sourceText || 'No source highlight saved.'}
                                </div>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Topics</div>
                                {flashcardTopicNames.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {flashcardTopicNames.map((topicName) => (
                                            <span key={topicName} className="rounded-full border border-border/70 bg-background px-2 py-1 text-xs text-foreground">
                                                {topicName}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mt-2 text-sm text-muted-foreground">No topics assigned.</div>
                                )}
                            </div>
                        </div>
                    </div>
                );
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
                            resource={resource}
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
                            onInsertBelow={handleInsertPointBelow}
                            onChangeType={handleChangePointType}
                            autoFocusPointId={autoFocusPointId}
                            onAutoFocusConsumed={() => setAutoFocusPointId(null)}
                            onRequestFocusPoint={setAutoFocusPointId}
                        />
                    </>
                );
        }
    };

    useEffect(() => {
        if (aiNoteSidebarItems.length === 0) {
            setSelectedAiNoteId(null);
            return;
        }
        if (selectedAiNoteId && !aiNoteSidebarItems.some((item) => item.id === selectedAiNoteId)) {
            setSelectedAiNoteId(null);
        }
    }, [aiNoteSidebarItems, selectedAiNoteId]);

    const hasLeftSidebar = linkedSidebarItems.length > 0 || linkedCanvasSidebarItems.length > 0 || linkedUrlSidebarItems.length > 0 || aiNoteSidebarItems.length > 0;


    return (
        <>
            <div ref={setPopupRef} style={style} data-popup-id={popupId} className={cn(!isFullscreen && "resize both")}>
                <audio ref={audioRef} onEnded={() => setPlayingAudio(false)} className="hidden" />
                <input type="file" ref={audioInputRef} onChange={handleAudioUpload} accept="audio/*" className="hidden" />
                <Card ref={cardRef} className="shadow-2xl border border-border/70 bg-background/95 flex h-full flex-col relative group rounded-2xl overflow-hidden">
	                    <CardHeader className="relative flex-shrink-0 border-b border-border/60 px-4 pb-3 pt-3">
	                        <div
	                            className={cn("absolute inset-x-0 top-0 h-10", !isFullscreen && "cursor-grab active:cursor-grabbing")}
	                            onPointerDown={handleDragPointerDown}
	                        />
                            <div className="space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/30">
	                                        {getIcon()}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                {resourceTypeLabel}
                                            </span>
                                            <span className="rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                                                {metadataCountLabel}
                                            </span>
                                            {createdLabel && (
                                                <span className="rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                                                    {createdLabel}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative z-10 flex flex-shrink-0 items-center rounded-full border border-border/70 bg-background/90 px-1 py-0.5">
                                        <TooltipProvider delayDuration={200}>
                                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggleFavorite}>
                                                {resource.isFavorite ? <PinOff className="h-4 w-4 text-yellow-400" /> : <Pin className="h-4 w-4" />}
                                            </Button></TooltipTrigger><TooltipContent><p>{resource.isFavorite ? 'Un-favorite' : 'Favorite'}</p></TooltipContent></Tooltip>
                                            {readableText && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={toggleReadAloud}>
                                                            {isReadingAloud ? <VolumeX className="h-4 w-4 text-sky-500" /> : <Volume2 className="h-4 w-4 text-sky-500" />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>{isReadingAloud ? 'Stop read aloud' : 'Read aloud'}</p></TooltipContent>
                                                </Tooltip>
                                            )}
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleToggleFullscreen}>
                                                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>{isFullscreen ? 'Exit full screen' : 'Full screen'}</p></TooltipContent>
                                            </Tooltip>
                                            {resource.type !== 'flashcard' && (
                                                <>
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
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenResourceAstra}>
                                                                <Bot className="h-4 w-4 text-sky-400" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>Open in Astra</p></TooltipContent>
                                                    </Tooltip>
                                                    <Popover open={isAddBlockMenuOpen} onOpenChange={setIsAddBlockMenuOpen}>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                                <PlusCircle className="h-4 w-4 text-blue-500" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="z-[220] w-[18rem] border-0 bg-transparent p-0 shadow-none" align="end" side="top" sideOffset={6}>
                                                            <ResourceBlockMenu
                                                                allowedValues={RESOURCE_BLOCK_OPTIONS.filter((option) => option.value !== 'timestamp' && option.value !== 'youtube' && option.value !== 'obsidian' && option.value !== 'card').map((option) => option.value)}
                                                                onClose={() => setIsAddBlockMenuOpen(false)}
                                                                onSelect={(type) => handleAddPoint(type || 'text')}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsLinkingCanvasOpen(true)}><LinkIcon className="h-4 w-4 text-red-500" /></Button></TooltipTrigger><TooltipContent><p>Link Canvas</p></TooltipContent></Tooltip>
                                                </>
                                            )}
                                        </TooltipProvider>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={handleClose}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="min-w-0">
	                                {editingTitle ? (
	                                     <Input 
	                                        value={resource.name || ''}
	                                        onChange={(e) => handleTitleChange(e.target.value)} 
	                                        onBlur={() => { flush(); setEditingTitle(false); }} 
	                                        onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
	                                        className="h-8 text-xl font-semibold border-none bg-transparent shadow-none focus-visible:ring-0 p-0"
	                                        autoFocus
	                                    />
	                                ) : (
	                                    <CardTitle className="block max-w-full cursor-pointer text-xl leading-tight tracking-tight break-words" title={resource.name || ''} onClick={() => setEditingTitle(true)}>
	                                        {resource.name || <span className="text-muted-foreground">[Untitled]</span>}
	                                    </CardTitle>
	                                )}
                                    {navigationPathResources.length > 1 && (
                                        <CardDescription className="pt-1 text-xs text-muted-foreground" title={navigationPathResources.map(r => r.name).join(' / ')}>
                                          <span className="flex items-center gap-1 flex-wrap">
                                            {navigationPathResources.map((pathResource, index, arr) => {
                                              const isLast = index === arr.length - 1;
                                              return (
                                                <React.Fragment key={pathResource.id}>
                                                  <button
                                                    type="button"
                                                    disabled={isLast}
                                                    className={cn(
                                                      "inline-block max-w-[220px] truncate px-2 py-0.5 rounded-md border border-border/70 transition-colors align-middle",
                                                      isLast
                                                        ? "bg-muted/50 text-foreground"
                                                        : "bg-transparent hover:bg-muted/40"
                                                    )}
                                                    title={pathResource.name || '[Untitled]'}
                                                    onClick={() => onNavigatePath(popupId, pathResource.id)}
                                                  >
                                                    {pathResource.name || '[Untitled]'}
                                                  </button>
                                                  {index < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
                                                </React.Fragment>
                                              );
                                            })}
                                          </span>
                                        </CardDescription>
                                    )}
                                    {navigationPathResources.length <= 1 && folderPath && (
                                            <CardDescription className="pt-1 text-xs text-muted-foreground" title={folderPath}>
                                              <span className="flex items-center gap-1 flex-wrap">
                                                {folderPath.split(' / ').map((part, index, arr) => (
                                                    <React.Fragment key={index}>
                                                        <span className="inline-block max-w-[220px] truncate rounded-md border border-border/70 bg-muted/30 px-2 py-0.5 align-middle" title={part}>{part}</span>
                                                        {index < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" />}
                                                    </React.Fragment>
                                                ))}
                                          </span>
                                        </CardDescription>
                                    )}
                                </div>
                                {resource.hasLocalAudio && (
	                                <div className="mt-2">
	                                  <AudioMiniPlayer resource={resource} />
	                                </div>
	                            )}
                                {(audioSrc || youtubeEmbedUrl) && (
                                    <div className="w-full space-y-2 pt-2">
                                        <div className="flex items-center gap-2">
                                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-muted/50" onPointerDown={togglePlayAudio}>
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
                            </div>
                    </CardHeader>
                    <div className={cn("flex-grow min-h-0 overflow-y-auto px-4 py-4", isFullscreen && "px-8")}>
                        <CardContent className="p-0">
                           {isFullscreen ? (
                                <div className={cn("mx-auto grid w-full max-w-[1800px] gap-8", hasLeftSidebar ? "xl:grid-cols-[220px_minmax(0,1fr)]" : "xl:grid-cols-[minmax(0,1fr)]")}>
                                    {hasLeftSidebar ? (
                                        <aside className="hidden xl:block">
                                            <div className="sticky top-8 space-y-6">
                                                {aiNoteSidebarItems.length > 0 ? (
                                                    <div>
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                                            AI Notes
                                                        </div>
                                                        <div className="mt-3 space-y-0.5">
                                                            {aiNoteSidebarItems.map((item) => (
                                                                <div
                                                                    key={item.id}
                                                                    className={cn(
                                                                        "group flex w-full items-center gap-2 rounded-md px-1 py-1 pr-0 text-left transition-colors hover:bg-muted/20",
                                                                        selectedAiNote?.id === item.id && "bg-muted/20"
                                                                    )}
                                                                >
                                                                    <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setSelectedAiNoteId(item.id)}>
                                                                        <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-sky-400/80" />
                                                                        <div className="min-w-0 truncate text-sm text-foreground/90">
                                                                            {item.label}
                                                                        </div>
                                                                    </button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="ml-auto h-6 w-6 flex-shrink-0 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            handleDeletePoint(item.id);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}
                                                {linkedSidebarItems.length > 0 ? (
                                                    <div>
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                                            Resource Cards
                                                        </div>
                                                        <div className="mt-3 space-y-0.5">
                                                            {linkedSidebarItems.map((item) => (
                                                                <div
                                                                    key={item.id}
                                                                    className="group flex w-full items-center gap-2 rounded-md px-1 py-1 pr-0 text-left transition-colors hover:bg-muted/20"
                                                                >
                                                                    <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={(event) => onOpenNestedPopup(item.resourceId, event, popupState)}>
                                                                        <Library className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70 transition-colors group-hover:text-foreground" />
                                                                        <div className="min-w-0">
                                                                            <div className="truncate text-sm text-foreground/90 transition-colors group-hover:text-foreground">
                                                                                {item.label}
                                                                            </div>
                                                                            {item.kind === 'negative-mechanism' || item.kind === 'positive-mechanism' ? (
                                                                                <div className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                                                                                    {item.kind === 'negative-mechanism' ? 'Negative Mechanism' : 'Positive Mechanism'}
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                    </button>
                                                                    {item.removable ? (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="ml-auto h-6 w-6 flex-shrink-0 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
                                                                            onClick={(event) => {
                                                                                event.stopPropagation();
                                                                                handleDeletePoint(item.id);
                                                                            }}
                                                                        >
                                                                            <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                                                        </Button>
                                                                    ) : null}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}
                                                {linkedCanvasSidebarItems.length > 0 ? (
                                                    <div>
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                                            Canvas
                                                        </div>
                                                        <div className="mt-3 space-y-0.5">
                                                            {linkedCanvasSidebarItems.map((item) => (
                                                                <div
                                                                    key={item.id}
                                                                    className="group flex w-full items-center gap-2 rounded-md px-1 py-1 pr-0 text-left transition-colors hover:bg-muted/20"
                                                                >
                                                                    <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => openDrawingCanvas(item.point)}>
                                                                        <Paintbrush className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70 transition-colors group-hover:text-foreground" />
                                                                        <div className="min-w-0 truncate text-sm text-foreground/90 transition-colors group-hover:text-foreground">
                                                                            {item.label}
                                                                        </div>
                                                                    </button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="ml-auto h-6 w-6 flex-shrink-0 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            handleDeletePoint(item.id);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}
                                                {linkedUrlSidebarItems.length > 0 ? (
                                                    <div>
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                                            Links
                                                        </div>
                                                        <div className="mt-3 space-y-0.5">
                                                            {linkedUrlSidebarItems.map((item) => (
                                                                <div
                                                                    key={item.id}
                                                                    className="group flex w-full items-center gap-2 rounded-md px-1 py-1 pr-0 text-left transition-colors hover:bg-muted/20"
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                                                        onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                                                                    >
                                                                        <Link2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70 transition-colors group-hover:text-foreground" />
                                                                        <div className="min-w-0 truncate text-sm text-foreground/90 transition-colors group-hover:text-foreground">
                                                                            {item.label}
                                                                        </div>
                                                                    </button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="ml-auto h-6 w-6 flex-shrink-0 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            handleDeletePoint(item.id);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </aside>
                                    ) : null}
                                    <div className="min-w-0">
                                        <div className="mx-auto w-full max-w-4xl space-y-6">
                                            {selectedAiNote ? (
                                                <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div>
                                                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">AI Notes</div>
                                                            <div className="mt-2 text-lg font-semibold text-foreground">{selectedAiNote.label}</div>
                                                        </div>
                                                        <Button variant="outline" size="sm" className="h-8" onClick={() => saveAiNote(selectedAiNote.content, selectedAiNote.label)}>
                                                            <Save className="mr-2 h-3.5 w-3.5" />
                                                            Save Copy
                                                        </Button>
                                                    </div>
                                                    <div className="prose prose-sm mt-4 max-w-none dark:prose-invert">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedAiNote.content}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            ) : null}
                                            {resource.type === 'card' && (
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                                    Notes
                                                </div>
                                            )}
                                            {renderContent()}
                                        </div>
                                    </div>
                                </div>
                           ) : (
                                renderContent()
                           )}
                        </CardContent>
                    </div>
                     <CardFooter className="border-t border-border/60 bg-background p-3">
                         <div className={cn("flex gap-2 w-full", isFullscreen && "mx-auto max-w-4xl")}>
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
                      setCanvasPreview(null);
                      onClose(popupId);
                    }}
                    storageKey={`canvasPreview:${canvasPreview.resourceId}-${canvasPreview.pointId}`}
                />
            )}
            <SearchPopup open={isLinkingCanvasOpen} setOpen={setIsLinkingCanvasOpen} onSelect={handleLinkCanvas} title="Link an Existing Canvas" />
        </>
    );
}
