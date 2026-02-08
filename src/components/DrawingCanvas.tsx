
"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Save, X, GripVertical, Eraser, Download, Upload, Pin, PinOff, Search, Link as LinkIcon, Paintbrush, Plus, Library, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExcalidrawElement, NonDeleted, AppState, PointerDownState, OnLinkOpen } from "@excalidraw/excalidraw";
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { Resource, ResourcePoint } from '@/types/workout';
import { useDraggable } from '@dnd-kit/core';
import dynamic from 'next/dynamic';
import { loadExcalidrawFiles, saveExcalidrawFiles, type ExcalidrawFilesMetaMap } from '@/lib/excalidrawFileStore';

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
  
  const searchResults = useMemo(() => {
      return resources.flatMap(resource =>
          (resource.points || [])
              .filter(point => point.type === 'paint' && point.text)
              .map(point => ({ resource, point }))
      );
  }, [resources]);

  return (
    <Command shouldFilter={true}>
        <CommandInput placeholder="Search all canvases..." />
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
                <CardHeader className="p-3 border-b">
                    <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <SearchContent onSelect={onSelect} />
            </Card>
        </div>
    );
});
SearchPopup.displayName = 'SearchPopup';

const CanvasPreviewPopup = ({
  title,
  drawingData,
  canvasId,
  initialRect,
  onClose,
  onOpenInTab,
  storageKey,
}: {
  title: string;
  drawingData?: string | null;
  canvasId: string;
  initialRect: { x: number; y: number; width: number; height: number };
  onClose: () => void;
  onOpenInTab: () => void;
  storageKey: string;
}) => {
  const excalidrawAPIRef = useRef<any>(null);
  const [position, setPosition] = useState({ x: initialRect.x, y: initialRect.y });
  const [size, setSize] = useState({ width: initialRect.width, height: initialRect.height });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBackgroundBlurred, setIsBackgroundBlurred] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<Record<string, any>>({});
  const [loadedFilesKey, setLoadedFilesKey] = useState<string | null>(null);
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const parsedPreview = useMemo(() => {
    if (!drawingData) return { elements: [] as any[] };
    try {
      const parsed = JSON.parse(drawingData);
      if (Array.isArray(parsed.elements)) {
        return { elements: parsed.elements, appState: parsed.appState, filesMeta: parsed.files };
      }
    } catch (e) {
      console.error('Failed to parse preview canvas data:', e);
    }
    return { elements: [] as any[] };
  }, [drawingData]);

  const initialData = useMemo(() => {
    return { elements: parsedPreview.elements, appState: parsedPreview.appState };
  }, [parsedPreview.elements, parsedPreview.appState]);

  useEffect(() => {
    const loadFiles = async () => {
      if (!canvasId) {
        setLoadedFiles({});
        setLoadedFilesKey(null);
        return;
      }

      const filesMeta = parsedPreview?.filesMeta;
      if (!filesMeta || Object.keys(filesMeta).length === 0) {
        setLoadedFiles({});
        setLoadedFilesKey(canvasId);
        return;
      }

      try {
        const files = await loadExcalidrawFiles(canvasId, filesMeta);
        setLoadedFiles(files);
        setLoadedFilesKey(canvasId);
      } catch (e) {
        console.error("Failed to load preview files from IndexedDB:", e);
        setLoadedFiles({});
        setLoadedFilesKey(canvasId);
      }
    };

    void loadFiles();
  }, [canvasId, parsedPreview?.filesMeta]);

  useEffect(() => {
    const api = excalidrawAPIRef.current;
    if (!api) return;
    if (!loadedFilesKey || loadedFilesKey !== canvasId) return;
    if (!loadedFiles || Object.keys(loadedFiles).length === 0) return;

    if (typeof api.addFiles === 'function') {
      api.addFiles(Object.values(loadedFiles));
    } else if (typeof api.updateScene === 'function') {
      api.updateScene({ files: loadedFiles });
    }
  }, [loadedFiles, loadedFilesKey, canvasId]);

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
    const api = excalidrawAPIRef.current;
    const zoom = api?.getAppState?.()?.zoom?.value;
    try {
      if (!isLoaded) return;
      localStorage.setItem(
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
    <>
      {isBackgroundBlurred && (
        <div className="fixed inset-0 z-[150] bg-black/30 backdrop-blur-sm pointer-events-none" />
      )}
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => setIsBackgroundBlurred(prev => !prev)}
            title="Toggle background blur"
          >
            {isBackgroundBlurred ? 'Unblur' : 'Blur'}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenInTab} title="Open in New Tab">
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
    </>
  );
};

const ResourceSearchContent = React.memo(({ onSelect }: { onSelect: (resource: Resource) => void }) => {
  const { resources } = useAuth();

  const searchResults = useMemo(() => {
      return resources.filter(resource => resource.type === 'card' || resource.type === 'habit' || resource.type === 'mechanism');
  }, [resources]);

  return (
    <Command shouldFilter={true}>
        <CommandInput placeholder="Search resources..." />
        <CommandList>
            <CommandEmpty>No resources found.</CommandEmpty>
            <CommandGroup>
                {searchResults.map((resource) => (
                    <CommandItem
                        key={resource.id}
                        value={resource.name || 'Untitled'}
                        onSelect={() => onSelect(resource)}
                        className="flex justify-between items-center cursor-pointer"
                    >
                        <span>{resource.name || 'Untitled'}</span>
                        <span className="text-xs text-muted-foreground">{resource.type}</span>
                    </CommandItem>
                ))}
            </CommandGroup>
        </CommandList>
    </Command>
  );
});
ResourceSearchContent.displayName = 'ResourceSearchContent';

const ResourceSearchPopup = React.memo(({ open, setOpen, onSelect, title }: { open: boolean, setOpen: (open: boolean) => void, onSelect: (resource: Resource) => void, title: string }) => {
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
              <CardHeader className="p-3 border-b">
                  <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <ResourceSearchContent onSelect={onSelect} />
          </Card>
      </div>
  );
});
ResourceSearchPopup.displayName = 'ResourceSearchPopup';

const ExcalidrawWrapper = ({
  activeCanvas,
  theme,
  apiRef,
  onChange,
  onPointerDown,
  onKeyDown,
  onLinkOpen,
  files,
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
}) => {
  // Robustly parse data and provide a safe fallback on every render.
  const initialData = useMemo(() => {
    try {
      if (activeCanvas.data) {
        const parsedData = JSON.parse(activeCanvas.data);
        // Ensure the parsed data has a valid elements array.
        if (Array.isArray(parsedData.elements)) {
          return { elements: parsedData.elements, appState: parsedData.appState, files };
        }
      }
    } catch (e) {
      console.error("Failed to parse canvas data, defaulting to empty.", e);
    }
    // Fallback to a safe default if data is missing, malformed, or doesn't have the elements array.
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
      />
    </div>
  );
};
ExcalidrawWrapper.displayName = "ExcalidrawWrapper";

export function DrawingCanvas({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) {
  const { 
    drawingCanvasState, 
    setDrawingCanvasState, 
    updateDrawingData, 
    togglePinDrawing, 
    openDrawingCanvas: authOpenDrawingCanvas, 
    openCanvasResourceCard,
    openGeneralPopup,
    settings,
    resources,
    setFloatingVideoUrl,
  } = useAuth();
  
  const [theme, setTheme] = useState('dark');
  const [isMounted, setIsMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLinkingSearchOpen, setIsLinkingSearchOpen] = useState(false);
  const [isLinkingResourceOpen, setIsLinkingResourceOpen] = useState(false);
  const [canvasPreview, setCanvasPreview] = useState<{ title: string; drawing: string | null; x: number; y: number; width: number; height: number; resourceId: string; pointId: string } | null>(null);
  
  const excalidrawAPIRef = useRef<any>(null);
  const { toast } = useToast();
  
  const [isDirty, setIsDirty] = useState(false);
  const isUserChange = useRef(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [loadedFiles, setLoadedFiles] = useState<Record<string, any>>({});
  const [loadedFilesCanvasId, setLoadedFilesCanvasId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const centerCanvas = () => {
        setPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
      };
      centerCanvas();
      window.addEventListener('resize', centerCanvas);
      return () => window.removeEventListener('resize', centerCanvas);
    }
  }, [isOpen]);
  
  const sizeMode = drawingCanvasState?.size ?? 'normal';
  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${position.y}px`,
    left: `${position.x}px`,
    width: sizeMode === 'compact' ? '75vw' : '95vw',
    height: sizeMode === 'compact' ? '75vh' : '95vh',
    transform: 'translate(-50%, -50%)',
    willChange: 'transform',
    zIndex: 110,
  };

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
  
  const activeCanvas = drawingCanvasState?.openCanvases?.find(c => c.id === drawingCanvasState.activeCanvasId);

  useEffect(() => {
    isUserChange.current = false;
    setIsDirty(false);
  }, [drawingCanvasState?.activeCanvasId]);

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
          const parsed = JSON.parse(activeCanvas.data);
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
    if (!excalidrawAPIRef.current || !drawingCanvasState?.activeCanvasId) {
        return;
    }
  
    const elements = excalidrawAPIRef.current.getSceneElements();
    const appState = excalidrawAPIRef.current.getAppState();
    const files = typeof excalidrawAPIRef.current.getFiles === 'function' ? excalidrawAPIRef.current.getFiles() : {};
    const filesMeta = await saveExcalidrawFiles(drawingCanvasState.activeCanvasId, files);
    const drawingData = JSON.stringify({
        type: "excalidraw",
        version: 2,
        source: "dock-app",
        elements: elements,
        appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            gridSize: appState.gridSize,
        },
        files: filesMeta,
    });
  
    updateDrawingData(drawingCanvasState.activeCanvasId, drawingData, () => {
        setIsDirty(false);
        isUserChange.current = false;
        toast({ title: "Canvas Saved" });
    });
  }, [drawingCanvasState?.activeCanvasId, updateDrawingData, toast]);

  const handleCanvasChange = useCallback(() => {
    if (isUserChange.current) {
        setIsDirty(true);
    }
  }, []);
  
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

  const handleTabClick = (canvasId: string) => {
    if (isDirty) {
      void handleSaveClick();
    }
    setDrawingCanvasState(prev => prev ? { ...prev, activeCanvasId: canvasId } : null);
  };
  
  const handleCloseTab = (e: React.MouseEvent, canvasId: string) => {
    e.stopPropagation();
    if (isDirty) {
      void handleSaveClick();
    }
    setDrawingCanvasState(prev => {
        if (!prev) return null;
        const newOpenCanvases = (prev.openCanvases || []).filter(c => c.id !== canvasId);
        if (prev.activeCanvasId === canvasId) {
            const newActiveId = newOpenCanvases[0]?.id || null;
            return { ...prev, openCanvases: newOpenCanvases, activeCanvasId: newActiveId };
        }
        return { ...prev, openCanvases: newOpenCanvases };
    });
  };

  const handleTogglePin = (e: React.MouseEvent, canvasId: string) => {
    e.stopPropagation();
    togglePinDrawing(canvasId);
  };
  
  const handleSearchSelect = (resource: Resource, point: ResourcePoint) => {
    authOpenDrawingCanvas({
        resourceId: resource.id,
        pointId: point.id,
        name: point.text || 'Untitled Canvas',
        initialDrawing: point.drawing,
    });
    setIsSearchOpen(false);
  };

  const onLinkOpen: OnLinkOpen = useCallback((element, event) => {
    event.preventDefault();
    const link = element.link;
    
    if (link?.startsWith('canvas://')) {
        const [resourceId, pointId] = link.replace('canvas://', '').split('/');
        
        const resource = resources.find(r => r.id === resourceId);
        const point = resource?.points?.find(p => p.id === pointId);
        
        if (resource && point) {
            const width = Math.max(360, Math.min(window.innerWidth * 0.6, 720));
            const height = Math.max(260, Math.min(window.innerHeight * 0.55, 520));
            const x = (window.innerWidth - width) / 2 + 20;
            const y = (window.innerHeight - height) / 2 + 20;
            setCanvasPreview({
              title: point.text || 'Linked Canvas',
              drawing: typeof point.drawing === 'string' ? point.drawing : null,
              x,
              y,
              width,
              height,
              resourceId: resource.id,
              pointId: point.id,
            });
        } else {
            console.error("Linked canvas not found:", resourceId, pointId);
            toast({ title: 'Error', description: 'Could not find the linked canvas.', variant: 'destructive'});
        }
    } else if (link?.startsWith('resource://')) {
        const resourceId = link.replace('resource://', '');
        const resource = resources.find(r => r.id === resourceId);
        if (resource) {
          openGeneralPopup(resourceId, null);
        } else {
          console.error("Linked resource not found:", resourceId);
          toast({ title: 'Error', description: 'Could not find the linked resource.', variant: 'destructive'});
        }
    } else if (link) {
        setFloatingVideoUrl(link);
    }
  }, [authOpenDrawingCanvas, resources, toast, drawingCanvasState, handleTabClick, setFloatingVideoUrl, openGeneralPopup]);
  
  const handleLinkingSearchSelect = (resource: Resource, point: ResourcePoint) => {
    const api = excalidrawAPIRef.current;
    if (!api) return;
    
    const { scrollX, scrollY, width, height } = api.getAppState();
    const existingElements = api.getSceneElements();

    const newElement: NonDeleted<ExcalidrawElement> = {
        id: randomId(),
        type: 'text',
        x: scrollX + width / 2,
        y: scrollY + height / 2,
        width: 200,
        height: 24,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 1e9),
        version: 1,
        versionNonce: Math.floor(Math.random() * 1e9),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: `canvas://${resource.id}/${point.id}`,
        text: point.text || "Untitled Canvas",
        fontSize: 20,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
        baseline: 8,
        lineHeight: 1.2 as any,
        locked: false,
    }
    api.updateScene({ elements: [...existingElements, newElement] });
    api.history.clear(); // To prevent undoing the add
    void handleSaveClick(); // Save immediately after adding
    setIsLinkingSearchOpen(false);
  };

  const handleLinkingResourceSelect = (resource: Resource) => {
    const api = excalidrawAPIRef.current;
    if (!api) return;
    
    const { scrollX, scrollY, width, height } = api.getAppState();
    const existingElements = api.getSceneElements();

    const newElement: NonDeleted<ExcalidrawElement> = {
        id: randomId(),
        type: 'text',
        x: scrollX + width / 2,
        y: scrollY + height / 2,
        width: 220,
        height: 24,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 1e9),
        version: 1,
        versionNonce: Math.floor(Math.random() * 1e9),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: `resource://${resource.id}`,
        text: resource.name || "Linked Resource",
        fontSize: 20,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
        baseline: 8,
        lineHeight: 1.2 as any,
        locked: false,
    }
    api.updateScene({ elements: [...existingElements, newElement] });
    api.history.clear();
    void handleSaveClick();
    setIsLinkingResourceOpen(false);
  };
  
  if (!isOpen || !drawingCanvasState) return null;

  return (
    <>
      <div style={style}>
          <Card className="w-full h-full bg-background text-foreground p-0 flex flex-col shadow-2xl border-2 border-primary/50">
              <CardHeader 
                  className="p-1 pl-2 flex flex-row items-center justify-between border-b gap-2"
              >
                  <div 
                    className="flex items-center gap-1.5 flex-shrink-0"
                  >
                       <GripVertical className="h-3 w-3 text-muted-foreground/50"/>
                  </div>
                  <div className="flex-grow min-w-0 overflow-x-auto">
                      <div className="flex items-center gap-1">
                          {(drawingCanvasState.openCanvases || []).map(canvas => (
                              <Button
                                  key={canvas.id}
                                  variant={drawingCanvasState.activeCanvasId === canvas.id ? "secondary" : "ghost"}
                                  size="sm"
                                  className="h-5 pl-1 pr-1 flex items-center gap-1 flex-shrink-0 text-[10px]"
                                  onClick={() => handleTabClick(canvas.id)}
                              >
                                  <span className="truncate max-w-[88px]">{canvas.name}</span>
                                  <button onClick={(e) => handleTogglePin(e, canvas.id)} className="p-0.5 rounded hover:bg-muted">
                                      <Pin className={cn("h-2 w-2", (settings.pinnedCanvasIds || []).includes(canvas.id) ? "text-primary fill-current" : "text-muted-foreground")}/>
                                  </button>
                                  {!(settings.pinnedCanvasIds || []).includes(canvas.id) && (
                                      <button onClick={(e) => handleCloseTab(e, canvas.id)} className="p-0.5 rounded hover:bg-destructive/20">
                                          <X className="h-2 w-2 text-destructive"/>
                                      </button>
                                  )}
                              </Button>
                          ))}
                      </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={openCanvasResourceCard}><Plus className="h-2.5 w-2.5"/></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsSearchOpen(prev => !prev)}><Search className="h-2.5 w-2.5"/></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsLinkingSearchOpen(prev => !prev)}><LinkIcon className="h-2.5 w-2.5"/></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsLinkingResourceOpen(prev => !prev)}><Library className="h-2.5 w-2.5"/></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleSaveClick}>
                        <Save className={cn("h-2.5 w-2.5", isDirty ? "text-red-500" : "text-green-500")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}><X className="h-2.5 w-2.5"/></Button>
                  </div>
              </CardHeader>
              <CardContent className="p-0 flex-grow relative">
                {isMounted && activeCanvas ? (
                  <ExcalidrawWrapper 
                      activeCanvas={activeCanvas}
                      theme={theme}
                      apiRef={excalidrawAPIRef}
                      onChange={handleCanvasChange}
                      onPointerDown={handlePointerDown}
                      onKeyDown={handleKeyDown}
                      onLinkOpen={onLinkOpen}
                      files={loadedFilesCanvasId === activeCanvas.id ? loadedFiles : {}}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">Select a canvas to start drawing.</div>
                )}
              </CardContent>
          </Card>
      </div>
      <SearchPopup open={isSearchOpen} setOpen={setIsSearchOpen} onSelect={handleSearchSelect} title="Search & Open Canvas" />
      <SearchPopup open={isLinkingSearchOpen} setOpen={setIsLinkingSearchOpen} onSelect={handleLinkingSearchSelect} title="Link to a Canvas" />
      <ResourceSearchPopup open={isLinkingResourceOpen} setOpen={setIsLinkingResourceOpen} onSelect={handleLinkingResourceSelect} title="Link a Resource Card" />
      {canvasPreview && (
        <CanvasPreviewPopup
          title={canvasPreview.title}
          drawingData={canvasPreview.drawing}
          canvasId={`${canvasPreview.resourceId}-${canvasPreview.pointId}`}
          initialRect={{ x: canvasPreview.x, y: canvasPreview.y, width: canvasPreview.width, height: canvasPreview.height }}
          onClose={() => setCanvasPreview(null)}
          onOpenInTab={() => {
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
    </>
  );
}
