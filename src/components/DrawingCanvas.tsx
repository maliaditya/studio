
"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Save, X, GripVertical, Eraser, Download, Upload, Pin, PinOff, Search, Link as LinkIcon, Paintbrush } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExcalidrawElement, NonDeleted, AppState, PointerDownState, OnLinkOpen } from "@excalidraw/excalidraw";
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { Resource, ResourcePoint } from '@/types/workout';
import { useDraggable } from '@dnd-kit/core';
import dynamic from 'next/dynamic';

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

const SearchPopup = React.memo(({ open, setOpen, onSelect, title }: { open: boolean, setOpen: (open: boolean) => void, onSelect: (resource: Resource, point: ResourcePoint) => void, title: string }) => {
    
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

const ExcalidrawWrapper = ({
  activeCanvas,
  theme,
  apiRef,
  onChange,
  onPointerDown,
  onKeyDown,
  onLinkOpen,
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
}) => {
  // Robustly parse data and provide a safe fallback on every render.
  const initialData = useMemo(() => {
    try {
      if (activeCanvas.data) {
        const parsedData = JSON.parse(activeCanvas.data);
        // Ensure the parsed data has a valid elements array.
        if (Array.isArray(parsedData.elements)) {
          return { elements: parsedData.elements };
        }
      }
    } catch (e) {
      console.error("Failed to parse canvas data, defaulting to empty.", e);
    }
    // Fallback to a safe default if data is missing, malformed, or doesn't have the elements array.
    return { elements: [] };
  }, [activeCanvas.id, activeCanvas.data]);

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
    settings,
    resources,
  } = useAuth();
  
  const [theme, setTheme] = useState('dark');
  const [isMounted, setIsMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLinkingSearchOpen, setIsLinkingSearchOpen] = useState(false);
  
  const excalidrawAPIRef = useRef<any>(null);
  const { toast } = useToast();
  
  const [isDirty, setIsDirty] = useState(false);
  const isUserChange = useRef(false);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'drawing-canvas-popup',
  });
  
  const style: React.CSSProperties = {
    position: 'fixed',
    top: drawingCanvasState?.position.y || '50%',
    left: drawingCanvasState?.position.x || '50%',
    width: '95vw',
    height: '95vh',
    transform: transform ? `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px))` : 'translate(-50%, -50%)',
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
  
  const handleSaveClick = useCallback(() => {
    if (!excalidrawAPIRef.current || !drawingCanvasState?.activeCanvasId) {
        return;
    }
  
    const elements = excalidrawAPIRef.current.getSceneElements();
    const appState = excalidrawAPIRef.current.getAppState();
    const drawingData = JSON.stringify({
        type: "excalidraw",
        version: 2,
        source: "dock-app",
        elements: elements,
        appState: {
            viewBackgroundColor: appState.viewBackgroundColor,
            gridSize: appState.gridSize,
        }
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
        handleSaveClick();
    }
  }, [handleSaveClick]);

  const handleTabClick = (canvasId: string) => {
    if (isDirty) {
      handleSaveClick();
    }
    setDrawingCanvasState(prev => prev ? { ...prev, activeCanvasId: canvasId } : null);
  };
  
  const handleCloseTab = (e: React.MouseEvent, canvasId: string) => {
    e.stopPropagation();
    if (isDirty) {
      handleSaveClick();
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
             const canvasId = `${resource.id}-${point.id}`;
            const isAlreadyOpen = drawingCanvasState?.openCanvases?.some(c => c.id === canvasId);
            
            if (isAlreadyOpen) {
                handleTabClick(canvasId);
            } else {
                 authOpenDrawingCanvas({
                    resourceId: resource.id,
                    pointId: point.id,
                    name: point.text || 'Linked Canvas',
                    initialDrawing: point.drawing,
                });
            }
        } else {
            console.error("Linked canvas not found:", resourceId, pointId);
            toast({ title: 'Error', description: 'Could not find the linked canvas.', variant: 'destructive'});
        }

    } else if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
    }
  }, [authOpenDrawingCanvas, resources, toast, drawingCanvasState, handleTabClick]);
  
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
        containerId: null,
        originalText: point.text || "Untitled Canvas",
        lineHeight: 1.2 as any,
        locked: false,
    }
    api.updateScene({ elements: [...existingElements, newElement] });
    api.history.clear(); // To prevent undoing the add
    handleSaveClick(); // Save immediately after adding
    setIsLinkingSearchOpen(false);
  };
  
  if (!isOpen || !drawingCanvasState) return null;

  return (
    <>
      <div ref={setNodeRef} style={style} {...attributes}>
          <Card className="w-full h-full bg-background text-foreground p-0 flex flex-col shadow-2xl border-2 border-primary/50">
              <CardHeader 
                  className="p-2 pl-3 flex flex-row items-center justify-between border-b gap-4"
              >
                  <div 
                    className="flex items-center gap-2 cursor-grab active:cursor-grabbing flex-shrink-0"
                    {...listeners}
                  >
                       <GripVertical className="h-5 w-5 text-muted-foreground/50"/>
                  </div>
                  <div className="flex-grow min-w-0 overflow-x-auto">
                      <div className="flex items-center gap-2">
                          {(drawingCanvasState.openCanvases || []).map(canvas => (
                              <Button
                                  key={canvas.id}
                                  variant={drawingCanvasState.activeCanvasId === canvas.id ? "secondary" : "ghost"}
                                  size="sm"
                                  className="h-8 pl-2 pr-1 flex items-center gap-1 flex-shrink-0"
                                  onClick={() => handleTabClick(canvas.id)}
                              >
                                  <span className="truncate max-w-[120px]">{canvas.name}</span>
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
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(prev => !prev)}><Search className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsLinkingSearchOpen(prev => !prev)}><LinkIcon className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={handleSaveClick}>
                        <Save className={cn("h-4 w-4", isDirty ? "text-red-500" : "text-green-500")} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4"/></Button>
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
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">Select a canvas to start drawing.</div>
                )}
              </CardContent>
          </Card>
      </div>
      <SearchPopup open={isSearchOpen} setOpen={setIsSearchOpen} onSelect={handleSearchSelect} title="Search & Open Canvas" />
      <SearchPopup open={isLinkingSearchOpen} setOpen={setIsLinkingSearchOpen} onSelect={handleLinkingSearchSelect} title="Link to a Canvas" />
    </>
  );
}
