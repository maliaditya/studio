
"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, X, Pin, PinOff, Search, Link as LinkIcon, LayoutDashboard, Copy, ChevronsDown, ChevronsUp, Smartphone, Plus, Paintbrush, Library, Edit3, Circle, Square, Play, Scissors, List, Trash2, FastForward } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { Resource, ResourcePoint, ResourceFolder } from '@/types/workout';
import { AuthGuard } from '@/components/AuthGuard';
import dynamic from 'next/dynamic';
import { OnLinkOpen, PointerDownState, AppState, ExcalidrawElement, NonDeleted } from '@excalidraw/excalidraw/types/types';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { loadExcalidrawFiles, saveExcalidrawFiles, type ExcalidrawFilesMetaMap } from '@/lib/excalidrawFileStore';
import { parseJsonWithRecovery } from '@/lib/jsonRecovery';
import { useCanvasRecording } from '@/hooks/useCanvasRecording';

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  {
    ssr: false,
    loading: () => <div className="flex h-full w-full items-center justify-center">Loading Canvas...</div>
  }
);

// Self-contained random ID generator to avoid dependency issues.
const randomId = () => Math.random().toString(36).slice(2, 11);

const SearchContent = React.memo(({ onSelect }: { onSelect: (resource: Resource, point: ResourcePoint) => void }) => {
  const { resources } = useAuth();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
      const frame = requestAnimationFrame(() => {
          inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
  }, []);
  
  const searchResults = useMemo(() => {
      if (!resources) return [];
      return resources.flatMap(resource =>
          (resource.points || [])
              .filter(point => point.type === 'paint' && point.text)
              .map(point => ({ resource, point }))
      );
  }, [resources]);

  return (
    <Command shouldFilter={true}>
        <CommandInput ref={inputRef} autoFocus placeholder="Search all canvases..." />
        <CommandList>
            <CommandEmpty>No canvases found.</CommandEmpty>
            <CommandGroup>
                {searchResults.map(({ resource, point }) => (
                    <CommandItem
                        key={point.id}
                        value={point.text || 'Untitled Canvas'}
                        onSelect={() => onSelect(resource, point)}
                        className="flex justify-between items-center cursor-pointer"
                    >
                        <span>{point.text || 'Untitled Canvas'}</span>
                        <span className="text-xs text-muted-foreground">{resource.name}</span>
                    </CommandItem>
                ))}
            </CommandGroup>
        </CommandList>
    </Command>
  );
});
SearchContent.displayName = 'SearchContent';

export const SearchPopup = React.memo(({ open, setOpen, onSelect, title }: { open: boolean, setOpen: (open: boolean) => void, onSelect: (resource: Resource, point: ResourcePoint) => void, title: string }) => {
    
    const style: React.CSSProperties = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 130,
    };

    if (!open) return null;

    return (
        <div style={style}>
             <Card className="w-[512px] shadow-2xl border-2 bg-popover">
                <CardHeader className="p-3 border-b flex flex-row justify-between items-center">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
                </CardHeader>
                <SearchContent onSelect={onSelect} />
            </Card>
        </div>
    );
});
SearchPopup.displayName = 'SearchPopup';

const SubCanvasListContent = React.memo(({ resource, onSelect }: { resource: Resource; onSelect: (resource: Resource, point: ResourcePoint) => void }) => {
  const canvasPoints = useMemo(() => {
    return (resource.points || []).filter(point => point.type === 'paint');
  }, [resource.points]);

  return (
    <Command shouldFilter={true}>
      <CommandInput placeholder="Search sub canvases..." />
      <CommandList>
        <CommandEmpty>No canvases found.</CommandEmpty>
        <CommandGroup>
          {canvasPoints.map((point) => (
            <CommandItem
              key={point.id}
              value={point.text || 'Untitled Canvas'}
              onSelect={() => onSelect(resource, point)}
              className="flex justify-between items-center cursor-pointer"
            >
              <span>{point.text || 'Untitled Canvas'}</span>
              <span className="text-xs text-muted-foreground">{resource.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
});
SubCanvasListContent.displayName = 'SubCanvasListContent';

const SubCanvasListPopup = React.memo(({ open, setOpen, resource, onSelect }: { open: boolean; setOpen: (open: boolean) => void; resource: Resource; onSelect: (resource: Resource, point: ResourcePoint) => void }) => {
  const style: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 130,
  };

  if (!open) return null;

  return (
    <div style={style}>
      <Card className="w-[512px] shadow-2xl border-2 bg-popover">
        <CardHeader className="p-3 border-b flex flex-row justify-between items-center">
          <CardTitle className="text-base">Sub Canvases: {resource.name}</CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <SubCanvasListContent resource={resource} onSelect={onSelect} />
      </Card>
    </div>
  );
});
SubCanvasListPopup.displayName = 'SubCanvasListPopup';

const ExcalidrawWrapper = ({
  activeCanvas,
  theme,
  apiRef,
  onChange,
  onPointerDown,
  onKeyDown,
  onLinkOpen,
  files,
  viewModeEnabled,
}: {
  activeCanvas: { id: string; data?: string };
  theme: string;
  apiRef: React.MutableRefObject<any | null>;
  onChange: (elements: readonly ExcalidrawElement[], appState: AppState) => void;
  onPointerDown: (
    activeTool: Readonly<{ type: string }>,
    pointerDownState: PointerDownState
  ) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onLinkOpen: OnLinkOpen;
  files: Record<string, any>;
  viewModeEnabled?: boolean;
}) => {
  const initialData = useMemo(() => {
    try {
      if (activeCanvas.data) {
        const parsedData = parseJsonWithRecovery<{ elements?: unknown[]; appState?: AppState }>(activeCanvas.data);
        if (Array.isArray(parsedData.elements)) {
          return { elements: parsedData.elements, appState: parsedData.appState, files };
        }
      }
    } catch (e) {
      console.error("Failed to parse canvas data, defaulting to empty.", e);
    }
    return { elements: [], files };
  }, [activeCanvas.id, activeCanvas.data, files]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Excalidraw
        key={activeCanvas.id}
        excalidrawAPI={(api) => (apiRef.current = api)}
        initialData={initialData}
        theme={theme}
        onChange={onChange}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onLinkOpen={onLinkOpen}
        viewModeEnabled={viewModeEnabled}
      />
    </div>
  );
};
ExcalidrawWrapper.displayName = "ExcalidrawWrapper";

function DrawingCanvasPageContent() {
    const {
        drawingCanvasState,
        setDrawingCanvasState,
        updateDrawingData,
        togglePinDrawing,
        openDrawingCanvas,
        openCanvasResourceCard,
        handleUpdateResource,
        settings,
        setSettings,
        resources,
        setResources,
        resourceFolders,
        setResourceFolders,
        setFloatingVideoUrl,
    } = useAuth();
    
    const isMobile = useIsMobile();
    const [theme, setTheme] = useState('dark');
    const [isMounted, setIsMounted] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isLinkingSearchOpen, setIsLinkingSearchOpen] = useState(false);
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; canvasId: string } | null>(null);
    const [subCanvasListResourceId, setSubCanvasListResourceId] = useState<string | null>(null);
    const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
    const [editingCanvasName, setEditingCanvasName] = useState('');
    const editingInputRef = useRef<HTMLInputElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    const excalidrawAPIRef = useRef<any>(null);
    const { toast } = useToast();
    
    const [isDirty, setIsDirty] = useState(false);
    const isUserChange = useRef(false);
    const [loadedFiles, setLoadedFiles] = useState<Record<string, any>>({});
    const [loadedFilesCanvasId, setLoadedFilesCanvasId] = useState<string | null>(null);

    useEffect(() => {
        if (!tabContextMenu) return;
        const handlePointerDown = (event: MouseEvent) => {
            if (!contextMenuRef.current) {
                setTabContextMenu(null);
                return;
            }
            if (!contextMenuRef.current.contains(event.target as Node)) {
                setTabContextMenu(null);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setTabContextMenu(null);
            }
        };
        window.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', handlePointerDown, true);
        return () => {
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handlePointerDown, true);
        };
    }, [tabContextMenu]);

    useEffect(() => {
        if (!editingCanvasId) return;
        const t = setTimeout(() => {
            editingInputRef.current?.focus();
            editingInputRef.current?.select();
        }, 0);
        return () => clearTimeout(t);
    }, [editingCanvasId]);

    useEffect(() => {
        if (!drawingCanvasState?.activeCanvasId) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'F2') return;
            const target = event.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            event.preventDefault();
            const active = drawingCanvasState.openCanvases?.find(c => c.id === drawingCanvasState.activeCanvasId);
            if (!active) return;
            setEditingCanvasId(active.id);
            setEditingCanvasName(active.name || 'Untitled Canvas');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [drawingCanvasState?.activeCanvasId, drawingCanvasState?.openCanvases]);

    useEffect(() => {
      setIsMounted(true);
      const handleThemeChange = (e: MediaQueryListEvent) => {
          setTheme(e.matches ? 'dark' : 'light');
      };
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setTheme(mediaQuery.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handleThemeChange);
      
      return () => mediaQuery.removeEventListener('change', handleThemeChange);
    }, []);

    useEffect(() => {
        if (!isMounted || !resources || !resourceFolders) {
            return;
        }
    
        if (drawingCanvasState && drawingCanvasState.openCanvases.length > 0 && drawingCanvasState.activeCanvasId) {
            return;
        }
    
        let localFolders = [...resourceFolders];
        let localResources = [...resources];
        let shouldUpdateState = false;
    
        let scratchpadFolder = localFolders.find(f => f.name === 'Scratchpad' && !f.parentId);
        if (!scratchpadFolder) {
            scratchpadFolder = { id: 'folder_scratchpad', name: 'Scratchpad', parentId: null, icon: 'Paintbrush' };
            localFolders.push(scratchpadFolder);
            shouldUpdateState = true;
        }
    
        let scratchpadResource = localResources.find(r => r.folderId === scratchpadFolder!.id && r.name === 'Default Scratchpad');
        if (!scratchpadResource) {
            scratchpadResource = {
                id: 'res_scratchpad',
                name: 'Default Scratchpad',
                folderId: scratchpadFolder.id,
                type: 'card',
                createdAt: new Date().toISOString(),
                points: []
            };
            localResources.push(scratchpadResource);
            shouldUpdateState = true;
        }
    
        let scratchpadPoint = scratchpadResource.points?.find(p => p.type === 'paint');
        if (!scratchpadPoint) {
            scratchpadPoint = { id: `point_scratchpad_${Date.now()}`, text: 'Default Canvas', type: 'paint' };
            const resIndex = localResources.findIndex(r => r.id === scratchpadResource!.id);
            if (resIndex > -1) {
                const updatedPoints = [...(localResources[resIndex].points || []), scratchpadPoint];
                localResources[resIndex] = { ...localResources[resIndex], points: updatedPoints };
            } else {
                 localResources.push({...scratchpadResource, points: [scratchpadPoint]});
            }
            shouldUpdateState = true;
        }
    
        if (shouldUpdateState) {
            setResourceFolders(localFolders);
            setResources(localResources);
        }
    
        const openCanvasesMap = new Map();
        const scratchpadCanvasId = `${scratchpadResource.id}-${scratchpadPoint.id}`;
        
        openCanvasesMap.set(scratchpadCanvasId, {
            id: scratchpadCanvasId,
            resourceId: scratchpadResource.id,
            pointId: scratchpadPoint.id,
            name: scratchpadPoint.text || 'Scratchpad',
            data: scratchpadPoint.drawing,
            isPinned: (settings.pinnedCanvasIds || []).includes(scratchpadCanvasId) || true,
        });
    
        (settings.pinnedCanvasIds || []).forEach(pinnedId => {
            if (!openCanvasesMap.has(pinnedId)) {
                const resource = localResources.find(r => r.points?.some(p => `${r.id}-${p.id}` === pinnedId));
                const point = resource?.points?.find(p => `${resource.id}-${p.id}` === pinnedId);
                if (resource && point) {
                    openCanvasesMap.set(pinnedId, {
                        id: pinnedId,
                        resourceId: resource.id,
                        pointId: point.id,
                        name: point.text || 'Untitled Canvas',
                        data: point.drawing,
                        isPinned: true,
                    });
                }
            }
        });
    
        const lastActiveCanvasId = settings.lastActiveCanvasId;
        const finalActiveCanvasId = lastActiveCanvasId && openCanvasesMap.has(lastActiveCanvasId) 
            ? lastActiveCanvasId 
            : scratchpadCanvasId;

        setDrawingCanvasState({
            isOpen: true,
            position: { x: 0, y: 0 },
            openCanvases: Array.from(openCanvasesMap.values()),
            activeCanvasId: finalActiveCanvasId,
        });
    
    }, [isMounted, resources, resourceFolders, settings.pinnedCanvasIds, settings.lastActiveCanvasId, drawingCanvasState, setDrawingCanvasState, setResources, setResourceFolders]);

    useEffect(() => {
        if (drawingCanvasState?.activeCanvasId) {
            setSettings(prev => ({...prev, lastActiveCanvasId: drawingCanvasState.activeCanvasId}));
        }
    }, [drawingCanvasState?.activeCanvasId, setSettings]);


    const activeCanvas = drawingCanvasState?.openCanvases?.find(c => c.id === drawingCanvasState.activeCanvasId);
    const {
        recording,
        recordings,
        activeRecordingId,
        hasRecording,
        isRecording,
        isPlaying,
        playbackFrameIndex,
        playbackSpeed,
        setPlaybackSpeed,
        startRecording,
        stopRecording,
        renameRecording,
        selectRecording,
        playRecording,
        stopPlayback,
        handleRecordingChange,
        cutRecording,
        deleteFrames,
        toggleSkippedFrames,
        deleteRecording,
    } = useCanvasRecording({
        canvasId: activeCanvas?.id,
        excalidrawAPIRef,
        toast,
    });
    const [showRecordingEditor, setShowRecordingEditor] = useState(false);
    const [showKeyframeEditor, setShowKeyframeEditor] = useState(false);
    const [cutStartSeconds, setCutStartSeconds] = useState('0');
    const [cutEndSeconds, setCutEndSeconds] = useState('0');
    const [showRecordingNamePrompt, setShowRecordingNamePrompt] = useState(false);
    const [recordingNameDraft, setRecordingNameDraft] = useState('');
    const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);
    const [selectedKeyframes, setSelectedKeyframes] = useState<Set<number>>(new Set());

    useEffect(() => {
        isUserChange.current = false;
        setIsDirty(false);
    }, [drawingCanvasState?.activeCanvasId]);

    useEffect(() => {
        setShowRecordingEditor(false);
        setShowKeyframeEditor(false);
        setShowRecordingNamePrompt(false);
        setSelectedKeyframes(new Set());
    }, [activeCanvas?.id]);

    useEffect(() => {
        if (!showRecordingNamePrompt) return;
        const nextDefault = `Recording ${recordings.length + 1}`;
        setRecordingNameDraft(nextDefault);
    }, [showRecordingNamePrompt, recordings.length]);

    useEffect(() => {
        const loadFiles = async () => {
            if (!activeCanvas?.id) {
                setLoadedFiles({});
                setLoadedFilesCanvasId(null);
                return;
            }

            let filesMeta: ExcalidrawFilesMetaMap | undefined;
            if (activeCanvas.data) {
                try {
                    const parsed = parseJsonWithRecovery<{ files?: ExcalidrawFilesMetaMap }>(activeCanvas.data);
                    filesMeta = parsed.files;
                } catch (e) {
                    console.error("Failed to parse canvas file metadata:", e);
                }
            }

            if (!filesMeta || Object.keys(filesMeta).length === 0) {
                setLoadedFiles({});
                setLoadedFilesCanvasId(activeCanvas.id);
                return;
            }

            try {
                const files = await loadExcalidrawFiles(activeCanvas.id, filesMeta);
                setLoadedFiles(files);
                setLoadedFilesCanvasId(activeCanvas.id);
            } catch (e) {
                console.error("Failed to load Excalidraw files from IndexedDB:", e);
                setLoadedFiles({});
                setLoadedFilesCanvasId(activeCanvas.id);
            }
        };

        loadFiles();
    }, [activeCanvas?.id, activeCanvas?.data]);

    useEffect(() => {
        if (!excalidrawAPIRef.current) return;
        if (!activeCanvas?.id || loadedFilesCanvasId !== activeCanvas.id) return;
        if (!loadedFiles || Object.keys(loadedFiles).length === 0) return;

        const api = excalidrawAPIRef.current;
        if (typeof api.addFiles === 'function') {
            api.addFiles(Object.values(loadedFiles));
        } else if (typeof api.updateScene === 'function') {
            api.updateScene({ files: loadedFiles });
        }
    }, [loadedFiles, loadedFilesCanvasId, activeCanvas?.id]);

    const handleSaveClick = useCallback(async () => {
        if (!excalidrawAPIRef.current || !drawingCanvasState?.activeCanvasId) return;
        const elements = excalidrawAPIRef.current.getSceneElements();
        const appState = excalidrawAPIRef.current.getAppState();
        const files = typeof excalidrawAPIRef.current.getFiles === 'function' ? excalidrawAPIRef.current.getFiles() : {};
        const filesMeta = await saveExcalidrawFiles(drawingCanvasState.activeCanvasId, files);
        const drawingData = JSON.stringify({
            type: "excalidraw",
            version: 2,
            source: "dock-app",
            elements: elements,
            appState: { viewBackgroundColor: appState.viewBackgroundColor, gridSize: appState.gridSize },
            files: filesMeta,
        });
        updateDrawingData(drawingCanvasState.activeCanvasId, drawingData, () => {
            setIsDirty(false);
            isUserChange.current = false;
            toast({ title: "Canvas Saved" });
        });
    }, [drawingCanvasState?.activeCanvasId, updateDrawingData, toast]);

    useEffect(() => {
        if (!drawingCanvasState?.activeCanvasId) return;
        const handleSaveShortcut = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
            const target = event.target as HTMLElement | null;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }
            event.preventDefault();
            void handleSaveClick();
        };
        window.addEventListener('keydown', handleSaveShortcut);
        return () => window.removeEventListener('keydown', handleSaveShortcut);
    }, [drawingCanvasState?.activeCanvasId, handleSaveClick]);

    const handleCanvasChange = useCallback((elements: readonly ExcalidrawElement[], appState: AppState) => {
        if (isUserChange.current) {
            setIsDirty(true);
        }
        handleRecordingChange(elements, appState);
    }, [handleRecordingChange]);

    useEffect(() => {
        if (!showRecordingEditor) return;
        const durationSeconds = Math.max(0, Math.round(((recording?.durationMs || 0) / 1000) * 10) / 10);
        setCutStartSeconds('0');
        setCutEndSeconds(String(durationSeconds));
    }, [showRecordingEditor, recording?.durationMs]);

    const handleCutRecording = useCallback(() => {
        const startSeconds = Number(cutStartSeconds);
        const endSeconds = Number(cutEndSeconds);
        if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
            toast({ title: "Enter valid times", description: "Use seconds for start/end values.", variant: "destructive" });
            return;
        }
        const startMs = Math.max(0, startSeconds * 1000);
        const endMs = Math.max(0, endSeconds * 1000);
        stopPlayback();
        const ok = cutRecording(startMs, endMs);
        if (ok) {
            toast({ title: "Recording updated", description: "Selected range removed. Audio was cleared to avoid desync." });
            setShowRecordingEditor(false);
        } else {
            toast({ title: "Cut failed", description: "Range was empty or removed all frames.", variant: "destructive" });
        }
    }, [cutStartSeconds, cutEndSeconds, cutRecording, stopPlayback, toast]);

    const skippedKeyframes = useMemo(() => new Set(recording?.skippedFrameIndices || []), [recording?.skippedFrameIndices]);

    const keyframeList = useMemo(() => {
        if (!recording?.frames?.length) return [];
        const frames = recording.frames;
        const maxItems = 80;
        const minGapMs = 800;
        const results: Array<{ index: number; t: number; count: number; skipped: boolean }> = [];
        let lastT = -Infinity;
        for (let i = 0; i < frames.length; i += 1) {
            const frame = frames[i];
            if (!frame) continue;
            if (results.length >= maxItems) break;
            if (frame.t - lastT < minGapMs && i !== frames.length - 1) continue;
            results.push({ index: i, t: frame.t, count: frame.elements?.length || 0, skipped: skippedKeyframes.has(i) });
            lastT = frame.t;
        }
        if (results.length === 0 && frames.length > 0) {
            results.push({ index: 0, t: frames[0].t, count: frames[0].elements?.length || 0, skipped: skippedKeyframes.has(0) });
        }
        return results;
    }, [recording?.frames, skippedKeyframes]);

    const activeKeyframeIndex = useMemo(() => {
        if (!isPlaying || playbackFrameIndex === null) return null;
        let active: number | null = null;
        for (const frame of keyframeList) {
            if (frame.index <= playbackFrameIndex) active = frame.index;
            else break;
        }
        return active;
    }, [isPlaying, playbackFrameIndex, keyframeList]);

    const handleDeleteKeyframes = useCallback(() => {
        if (selectedKeyframes.size === 0) {
            toast({ title: "Select frames", description: "Pick at least one frame to delete.", variant: "destructive" });
            return;
        }
        stopPlayback();
        const ok = deleteFrames(Array.from(selectedKeyframes));
        if (ok) {
            toast({ title: "Frames deleted", description: "Audio was cleared to avoid desync." });
            setSelectedKeyframes(new Set());
            setShowKeyframeEditor(false);
        } else {
            toast({ title: "Delete failed", description: "Cannot remove all frames.", variant: "destructive" });
        }
    }, [selectedKeyframes, deleteFrames, stopPlayback, toast]);

    const handleDeleteRecording = useCallback(() => {
        if (!activeRecordingId) return;
        const confirmed = window.confirm("Delete this recording? This cannot be undone.");
        if (!confirmed) return;
        stopPlayback();
        const ok = deleteRecording(activeRecordingId);
        if (!ok) {
            toast({ title: "Delete failed", description: "Unable to delete recording.", variant: "destructive" });
        }
    }, [activeRecordingId, deleteRecording, stopPlayback, toast]);

    const handleCycleSpeed = useCallback(() => {
        const next = playbackSpeed >= 3 ? 0 : Math.round((playbackSpeed + 0.5) * 10) / 10;
        setPlaybackSpeed(next);
    }, [playbackSpeed, setPlaybackSpeed]);

    const handleSkipKeyframes = useCallback(() => {
        if (selectedKeyframes.size === 0) {
            toast({ title: "Select frames", description: "Pick at least one frame to skip.", variant: "destructive" });
            return;
        }
        const ok = toggleSkippedFrames(Array.from(selectedKeyframes));
        if (!ok) {
            toast({ title: "Skip failed", description: "Unable to update skipped frames.", variant: "destructive" });
        }
    }, [selectedKeyframes, toggleSkippedFrames, toast]);

    const handleConfirmStopRecording = useCallback(async () => {
        const name = recordingNameDraft.trim();
        if (!name) {
            toast({ title: "Name required", description: "Please enter a recording name.", variant: "destructive" });
            return;
        }
        if (pendingRenameId) {
            renameRecording(pendingRenameId, name);
        }
        setShowRecordingNamePrompt(false);
        setPendingRenameId(null);
    }, [recordingNameDraft, pendingRenameId, renameRecording, toast]);

    const handleStopRecording = useCallback(async () => {
        const fallbackName = `Recording ${recordings.length + 1}`;
        const saved = await stopRecording(fallbackName);
        if (saved?.id) {
            setPendingRenameId(saved.id);
            setRecordingNameDraft(saved.name);
            setShowRecordingNamePrompt(true);
        }
    }, [recordings.length, stopRecording]);

    const handlePointerDown = useCallback((activeTool: Readonly<{ type: string; }>, pointerDownState: PointerDownState) => {
        if (!isUserChange.current) {
            isUserChange.current = true;
        }
    }, []);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 's') {
            event.preventDefault();
            void handleSaveClick();
        }
    }, [handleSaveClick]);

    const handleTabClick = useCallback((canvasId: string) => {
        if (isDirty) void handleSaveClick();
        setDrawingCanvasState(prev => prev ? { ...prev, activeCanvasId: canvasId } : null);
    }, [isDirty, handleSaveClick, setDrawingCanvasState]);

    const handleCloseTab = (e: React.MouseEvent, canvasId: string) => {
        e.stopPropagation();
        if (isDirty) void handleSaveClick();
        setDrawingCanvasState(prev => {
            if (!prev) return null;
            const newOpenCanvases = (prev.openCanvases || []).filter(c => c.id !== canvasId);
            if (prev.activeCanvasId === canvasId) {
                const newActiveId = newOpenCanvases.length > 0 ? newOpenCanvases[0].id : null;
                return { ...prev, openCanvases: newOpenCanvases, activeCanvasId: newActiveId };
            }
            return { ...prev, openCanvases: newOpenCanvases };
        });
    };

    const handleTogglePin = (e: React.MouseEvent, canvasId: string) => {
        e.stopPropagation();
        togglePinDrawing(canvasId);
    };
    
    const handleSearchSelect = useCallback((resource: Resource, point: ResourcePoint) => {
        openDrawingCanvas({
            resourceId: resource.id,
            pointId: point.id,
            name: point.text || 'Untitled Canvas',
            initialDrawing: point.drawing,
        });
        setIsSearchOpen(false);
    }, [openDrawingCanvas]);

    const onLinkOpen: OnLinkOpen = useCallback((element, event) => {
        event.preventDefault();
        const link = element.link;
        
        if (link?.startsWith('canvas://')) {
            const [resourceId, pointId] = link.replace('canvas://', '').split('/');
            if (!resources) return;
            const resource = resources.find(r => r.id === resourceId);
            const point = resource?.points?.find(p => p.id === pointId);
            
            if (resource && point) {
                const canvasId = `${resource.id}-${point.id}`;
                if (drawingCanvasState?.openCanvases?.some(c => c.id === canvasId)) {
                    handleTabClick(canvasId);
                } else {
                    openDrawingCanvas({
                        resourceId: resource.id,
                        pointId: point.id,
                        name: point.text || 'Linked Canvas',
                        initialDrawing: point.drawing,
                    });
                }
            } else {
                toast({ title: 'Error', description: 'Could not find the linked canvas.', variant: 'destructive'});
            }
        } else if (link) {
            setFloatingVideoUrl(link);
        }
    }, [openDrawingCanvas, resources, toast, drawingCanvasState, handleTabClick, setFloatingVideoUrl]);
  
    const handleLinkingSearchSelect = useCallback((resource: Resource, point: ResourcePoint) => {
        const api = excalidrawAPIRef.current;
        if (!api) return;
        const { scrollX, scrollY, width, height } = api.getAppState();
        const existingElements = api.getSceneElements();

        const newElement: NonDeleted<ExcalidrawElement> = {
            id: randomId(),
            type: 'text',
            x: scrollX + width / 2,
            y: scrollY + height / 2,
            width: 200, height: 24, angle: 0, strokeColor: '#1e1e1e', backgroundColor: 'transparent',
            fillStyle: 'hachure', strokeWidth: 1, strokeStyle: 'solid', roughness: 1, opacity: 100,
            groupIds: [], frameId: null, roundness: null, seed: Math.floor(Math.random() * 1e9),
            version: 1, versionNonce: Math.floor(Math.random() * 1e9), isDeleted: false,
            boundElements: null, updated: Date.now(), link: `canvas://${resource.id}/${point.id}`,
            text: point.text || "Untitled Canvas", fontSize: 20, fontFamily: 1, textAlign: 'center',
            verticalAlign: 'middle', baseline: 8, lineHeight: 1.2 as any, locked: false,
        };
        api.updateScene({ elements: [...existingElements, newElement] });
        api.history.clear();
        void handleSaveClick();
        setIsLinkingSearchOpen(false);
    }, [handleSaveClick]);

    const handleCopyLink = () => {
        if (!activeCanvas) return;
        const link = `canvas://${activeCanvas.resourceId}/${activeCanvas.pointId}`;
        navigator.clipboard.writeText(link).then(() => {
            toast({ title: "Copied to clipboard!", description: link });
        }, (err) => {
            toast({ title: "Failed to copy", description: "Could not copy link to clipboard.", variant: "destructive" });
        });
    };

    const handleCopyCanvasLink = useCallback((canvasId: string) => {
        const targetCanvas = drawingCanvasState?.openCanvases?.find(c => c.id === canvasId);
        if (!targetCanvas) return;
        const link = `canvas://${targetCanvas.resourceId}/${targetCanvas.pointId}`;
        navigator.clipboard.writeText(link).then(() => {
            toast({ title: "Copied to clipboard!", description: link });
        }, () => {
            toast({ title: "Failed to copy", description: "Could not copy link to clipboard.", variant: "destructive" });
        });
    }, [drawingCanvasState?.openCanvases, toast]);

    const handleRenameCanvas = useCallback((canvasId: string, nextName: string) => {
        const trimmed = nextName.trim();
        if (!trimmed) {
            setEditingCanvasId(null);
            return;
        }
        const targetCanvas = drawingCanvasState?.openCanvases?.find(c => c.id === canvasId);
        if (!targetCanvas || !resources) {
            setEditingCanvasId(null);
            return;
        }
        const resource = resources.find(r => r.id === targetCanvas.resourceId);
        if (!resource) {
            setEditingCanvasId(null);
            return;
        }
        const updatedResource: Resource = {
            ...resource,
            points: (resource.points || []).map(point => {
                if (point.id === targetCanvas.pointId && point.type === 'paint') {
                    return { ...point, text: trimmed };
                }
                return point;
            }),
        };
        handleUpdateResource(updatedResource);
        setDrawingCanvasState(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                openCanvases: (prev.openCanvases || []).map(c => c.id === canvasId ? { ...c, name: trimmed } : c),
            };
        });
        setEditingCanvasId(null);
    }, [drawingCanvasState?.openCanvases, handleUpdateResource, resources, setDrawingCanvasState]);

    const handleCreateSubCanvas = useCallback((canvasId: string) => {
        const targetCanvas = drawingCanvasState?.openCanvases?.find(c => c.id === canvasId);
        if (!targetCanvas) return;
        if (!resources) return;
        const resource = resources.find(r => r.id === targetCanvas.resourceId);
        if (!resource) {
            toast({ title: "Resource not found", description: "Could not locate the canvas resource.", variant: "destructive" });
            return;
        }
        const existingCanvases = (resource.points || []).filter(p => p.type === 'paint');
        const nextIndex = existingCanvases.length + 1;
        const newPoint: ResourcePoint = {
            id: `point_canvas_${Date.now()}`,
            text: `Sub Canvas ${nextIndex}`,
            type: 'paint',
        };
        const updatedResource: Resource = {
            ...resource,
            points: [...(resource.points || []), newPoint],
        };
        handleUpdateResource(updatedResource);
        const newCanvasId = `${resource.id}-${newPoint.id}`;
        openDrawingCanvas({
            resourceId: resource.id,
            pointId: newPoint.id,
            name: newPoint.text || 'Sub Canvas',
            initialDrawing: newPoint.drawing,
        });
        setEditingCanvasId(newCanvasId);
        setEditingCanvasName(newPoint.text || 'Sub Canvas');
    }, [drawingCanvasState?.openCanvases, handleUpdateResource, openDrawingCanvas, resources, toast]);
    
    if (isMobile) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background p-4 text-center text-foreground">
                <div className="space-y-4">
                    <Smartphone className="mx-auto h-16 w-16" />
                    <h1 className="text-2xl font-bold">Please Rotate Your Device</h1>
                    <p className="text-muted-foreground">
                        For the best drawing experience, please use landscape mode.
                    </p>
                </div>
            </div>
        );
    }

    const subCanvasListResource =
        resources?.find((resource) => resource.id === subCanvasListResourceId) || null;

    return (
        <>
            <div className="h-screen w-screen flex flex-col bg-background">
                <header className="p-2 flex items-center justify-between border-b gap-4 flex-shrink-0">
                    <div className="flex-grow min-w-0 flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setIsHeaderCollapsed(p => !p)}>
                            {isHeaderCollapsed ? <ChevronsDown className="h-4 w-4" /> : <ChevronsUp className="h-4 w-4" />}
                        </Button>
                        {!isHeaderCollapsed && (
                            <div className="overflow-x-auto">
                                <div className="flex items-center gap-2">
                                    {(drawingCanvasState?.openCanvases || []).map(canvas => (
                                        <Button
                                            key={canvas.id}
                                            variant={drawingCanvasState?.activeCanvasId === canvas.id ? "secondary" : "ghost"}
                                            size="sm"
                                            className="h-8 pl-2 pr-1 flex items-center gap-1 flex-shrink-0"
                                            onClick={() => handleTabClick(canvas.id)}
                                            onContextMenu={(event) => {
                                                event.preventDefault();
                                                setTabContextMenu({
                                                    x: event.clientX,
                                                    y: event.clientY,
                                                    canvasId: canvas.id,
                                                });
                                            }}
                                        >
                                            {editingCanvasId === canvas.id ? (
                                                <Input
                                                    ref={editingInputRef}
                                                    value={editingCanvasName}
                                                    onChange={(event) => setEditingCanvasName(event.target.value)}
                                                    onClick={(event) => event.stopPropagation()}
                                                    onPointerDown={(event) => event.stopPropagation()}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter') {
                                                            event.preventDefault();
                                                            handleRenameCanvas(canvas.id, editingCanvasName);
                                                        }
                                                        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
                                                            event.preventDefault();
                                                            handleRenameCanvas(canvas.id, editingCanvasName);
                                                        }
                                                        if (event.key === 'Escape') {
                                                            event.preventDefault();
                                                            setEditingCanvasId(null);
                                                        }
                                                    }}
                                                    onBlur={() => handleRenameCanvas(canvas.id, editingCanvasName)}
                                                    className="h-6 text-sm px-1 py-0.5"
                                                />
                                            ) : (
                                                <span className="truncate max-w-[120px]">{canvas.name}</span>
                                            )}
                                            <button onClick={(e) => handleTogglePin(e, canvas.id)} className="p-1 rounded hover:bg-muted">
                                                <Pin className={cn("h-3 w-3", (settings.pinnedCanvasIds || []).includes(canvas.id) ? "text-primary fill-current" : "text-muted-foreground")}/>
                                            </button>
                                            {!(settings.pinnedCanvasIds || []).includes(canvas.id) && (
                                                <button onClick={(e) => handleCloseTab(e, canvas.id)} className="p-1 rounded hover:bg-destructive/20">
                                                    <X className="h-3 w-3 text-destructive"/>
                                                </button>
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/my-plate">
                                <LayoutDashboard className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={openCanvasResourceCard}><Plus className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(prev => !prev)}><Search className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => setIsLinkingSearchOpen(prev => !prev)}><LinkIcon className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="icon" onClick={handleCopyLink}><Copy className="h-4 w-4"/></Button>
                        {recordings.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={handleDeleteRecording}
                              title="Delete recording"
                              disabled={isRecording || isPlaying}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                            <select
                              value={activeRecordingId || ""}
                              onChange={(event) => selectRecording(event.target.value)}
                              className="h-7 max-w-[180px] rounded border bg-background px-2 text-xs text-muted-foreground"
                              title="Select recording"
                              disabled={isRecording || isPlaying}
                            >
                              {recordings.map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                  {entry.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => (isRecording ? handleStopRecording() : startRecording())}
                          title={isRecording ? "Stop recording" : "Record drawing (with voice)"}
                          disabled={!activeCanvas || isPlaying || showRecordingNamePrompt}
                        >
                          {isRecording ? <Square className="h-4 w-4 text-red-500" /> : <Circle className="h-4 w-4 text-red-500" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => (isPlaying ? stopPlayback() : playRecording())}
                          title={isPlaying ? "Stop playback" : hasRecording ? "Play recording" : "No recording yet"}
                          disabled={!activeCanvas || isRecording || !hasRecording}
                        >
                          {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowRecordingEditor((prev) => !prev)}
                          title="Cut recording range"
                          disabled={!activeCanvas || isRecording || isPlaying || !hasRecording}
                        >
                          <Scissors className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowKeyframeEditor((prev) => !prev)}
                          title="Delete keyframes"
                          disabled={!activeCanvas || isRecording || isPlaying || !hasRecording}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCycleSpeed}
                          title="Playback speed"
                          disabled={!activeCanvas || isRecording || !hasRecording}
                        >
                          <FastForward className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground min-w-[32px]">
                          {playbackSpeed === 0 ? "1x" : `${playbackSpeed}x`}
                        </span>
                        <Button variant="ghost" size="icon" onClick={handleSaveClick}>
                            <Save className={cn("h-4 w-4", isDirty ? "text-red-500" : "text-green-500")} />
                        </Button>
                    </div>
                </header>
                <main className="flex-grow min-h-0 relative">
                    {isMounted && activeCanvas ? (
                        <>
                        <ExcalidrawWrapper 
                            activeCanvas={activeCanvas}
                            theme={theme}
                            apiRef={excalidrawAPIRef}
                            onChange={handleCanvasChange}
                            onPointerDown={handlePointerDown}
                            onKeyDown={handleKeyDown}
                            onLinkOpen={onLinkOpen}
                            files={loadedFilesCanvasId === activeCanvas.id ? loadedFiles : {}}
                            viewModeEnabled={isPlaying}
                        />
                        {showRecordingEditor && hasRecording && (
                          <div className="absolute right-4 top-4 z-20 w-[280px] rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur">
                            <div className="text-xs font-semibold">Cut Recording Range</div>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div>
                                <label className="mb-1 block text-[11px] text-muted-foreground">Start (sec)</label>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  value={cutStartSeconds}
                                  onChange={(event) => setCutStartSeconds(event.target.value)}
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[11px] text-muted-foreground">End (sec)</label>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  value={cutEndSeconds}
                                  onChange={(event) => setCutEndSeconds(event.target.value)}
                                  className="h-7 text-xs"
                                />
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Button size="sm" className="h-7 px-2 text-xs" onClick={handleCutRecording}>
                                Cut Range
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => setShowRecordingEditor(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                            <p className="mt-2 text-[10px] text-muted-foreground">
                              Audio is cleared after cutting to avoid desync.
                            </p>
                          </div>
                        )}
                        {showKeyframeEditor && hasRecording && (
                          <div className="absolute right-4 top-4 z-20 w-[300px] rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur">
                            <div className="text-xs font-semibold">Delete Keyframes</div>
                            <div className="mt-2 max-h-56 overflow-y-auto rounded border bg-background/60 p-2 text-[11px]">
                              {keyframeList.length === 0 && (
                                <div className="text-muted-foreground">No frames found.</div>
                              )}
                              {keyframeList.map((frame) => (
                                <label
                                  key={frame.index}
                                  className={cn(
                                    "flex items-center gap-2 py-1 rounded px-1",
                                    activeKeyframeIndex === frame.index && "bg-primary/20"
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedKeyframes.has(frame.index)}
                                    onChange={(event) => {
                                      setSelectedKeyframes((prev) => {
                                        const next = new Set(prev);
                                        if (event.target.checked) next.add(frame.index);
                                        else next.delete(frame.index);
                                        return next;
                                      });
                                    }}
                                  />
                                  <span className="flex-1">
                                    <span className={cn(frame.skipped && "line-through text-muted-foreground")}>
                                      {`${(frame.t / 1000).toFixed(1)}s`} · {frame.count} elements
                                      {frame.skipped ? " (skipped)" : ""}
                                    </span>
                                  </span>
                                </label>
                              ))}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSkipKeyframes}>
                                Skip
                              </Button>
                              <Button size="sm" className="h-7 px-2 text-xs" onClick={handleDeleteKeyframes}>
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => setShowKeyframeEditor(false)}
                              >
                                Close
                              </Button>
                            </div>
                            <p className="mt-2 text-[10px] text-muted-foreground">
                              Audio is cleared after deleting frames to avoid desync.
                            </p>
                          </div>
                        )}
                        {showRecordingNamePrompt && (
                          <div className="absolute right-4 top-4 z-30 w-[280px] rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur">
                            <div className="text-xs font-semibold">Name This Recording</div>
                            <div className="mt-2">
                              <Input
                                value={recordingNameDraft}
                                onChange={(event) => setRecordingNameDraft(event.target.value)}
                                className="h-7 text-xs"
                                placeholder="Recording name"
                              />
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Button size="sm" className="h-7 px-2 text-xs" onClick={handleConfirmStopRecording}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  setShowRecordingNamePrompt(false);
                                  setPendingRenameId(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                        </>
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">Select or open a canvas to start drawing.</div>
                    )}
                </main>
            </div>
            {tabContextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-[200] w-56 rounded-md border bg-popover shadow-lg p-1"
                    style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
                >
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                            handleCreateSubCanvas(tabContextMenu.canvasId);
                            setTabContextMenu(null);
                        }}
                    >
                        <Paintbrush className="mr-2 h-4 w-4" />
                        Sub Canvas
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                            const canvas = drawingCanvasState?.openCanvases?.find(c => c.id === tabContextMenu.canvasId);
                            setEditingCanvasId(tabContextMenu.canvasId);
                            setEditingCanvasName(canvas?.name || 'Untitled Canvas');
                            setTabContextMenu(null);
                        }}
                    >
                        <Edit3 className="mr-2 h-4 w-4" />
                        Rename
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                            const canvas = drawingCanvasState?.openCanvases?.find(c => c.id === tabContextMenu.canvasId);
                            setSubCanvasListResourceId(canvas?.resourceId || null);
                            setTabContextMenu(null);
                        }}
                    >
                        <Library className="mr-2 h-4 w-4" />
                        View All Sub Canvas
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => {
                            handleCopyCanvasLink(tabContextMenu.canvasId);
                            setTabContextMenu(null);
                        }}
                    >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy URL
                    </Button>
                </div>
            )}
            <SearchPopup open={isSearchOpen} setOpen={setIsSearchOpen} onSelect={handleSearchSelect} title="Search & Open Canvas" />
            <SearchPopup open={isLinkingSearchOpen} setOpen={setIsLinkingSearchOpen} onSelect={handleLinkingSearchSelect} title="Link to a Canvas" />
            {subCanvasListResource && (
                <SubCanvasListPopup
                    open={!!subCanvasListResourceId}
                    setOpen={(open) => setSubCanvasListResourceId(open ? subCanvasListResourceId : null)}
                    resource={subCanvasListResource}
                    onSelect={(resource, point) => {
                        openDrawingCanvas({
                            resourceId: resource.id,
                            pointId: point.id,
                            name: point.text || 'Untitled Canvas',
                            initialDrawing: point.drawing,
                        });
                        setSubCanvasListResourceId(null);
                    }}
                />
            )}
        </>
    );
}

export default function DrawingCanvasPage() {
    return (
        <AuthGuard>
            <DrawingCanvasPageContent />
        </AuthGuard>
    )
}
