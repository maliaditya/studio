
"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from './ui/button';
import { Save, X, GripVertical, Eraser, Download, Upload, Pin, PinOff, Search } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import type { ExcalidrawElement, NonDeleted, AppState } from "@excalidraw/excalidraw/types/types";
import type { ExcalidrawAPIRefValue } from '@excalidraw/excalidraw';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import type { Resource, ResourcePoint } from '@/types/workout';

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  {
    ssr: false,
    loading: () => <div className="flex h-full w-full items-center justify-center">Loading Canvas...</div>
  }
);

interface DrawingCanvasProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExcalidrawWrapper = ({ 
    activeCanvas, 
    onSave, 
    theme, 
    apiRef 
}: {
    activeCanvas: { id: string, data?: string };
    onSave: (drawingData: string) => void;
    theme: string;
    apiRef: React.MutableRefObject<ExcalidrawAPIRefValue | null>;
}) => {
    const [initialData, setInitialData] = useState<{
        elements: readonly NonDeleted<ExcalidrawElement>[];
        appState?: Partial<AppState>;
    } | null>(null);

    const { settings } = useAuth();
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    useEffect(() => {
        if (activeCanvas.data) {
            try {
                const parsedData = JSON.parse(activeCanvas.data);
                setInitialData({
                    elements: parsedData.elements || [],
                    appState: parsedData.appState || {}
                });
            } catch (e) {
                console.error("Failed to parse initial drawing data:", e);
                setInitialData({ elements: [] });
            }
        } else {
            setInitialData({ elements: [] });
        }
    }, [activeCanvas.id, activeCanvas.data]);

    const handleChange = (elements: readonly ExcalidrawElement[], appState: AppState) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        
        saveTimeoutRef.current = setTimeout(() => {
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
            onSave(drawingData);
        }, settings.drawingCanvasAutoSaveInterval || 30000);
    };

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    if (initialData === null) {
        return <div className="flex h-full w-full items-center justify-center">Preparing Canvas...</div>;
    }

    return (
        <div style={{ height: "100%", width: "100%" }}>
            <Excalidraw
                excalidrawAPI={(api) => apiRef.current = api}
                initialData={initialData}
                theme={theme}
                onChange={handleChange}
            />
        </div>
    );
}

export function DrawingCanvas({ isOpen, onClose }: DrawingCanvasProps) {
  const { resources, drawingCanvasState, setDrawingCanvasState, updateDrawingData, togglePinDrawing, openDrawingCanvas: authOpenDrawingCanvas } = useAuth();
  const [theme, setTheme] = useState('dark');
  const [isMounted, setIsMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const excalidrawAPIRef = useRef<ExcalidrawAPIRefValue | null>(null);
  const { toast } = useToast();

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
  
  const handleSaveClick = () => {
    if (excalidrawAPIRef.current && drawingCanvasState?.activeCanvasId) {
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
      updateDrawingData(drawingCanvasState.activeCanvasId, drawingData);
      toast({ title: "Canvas Saved" });
    }
  };

  const handleTabClick = (canvasId: string) => {
    setDrawingCanvasState(prev => prev ? { ...prev, activeCanvasId: canvasId } : null);
  };
  
  const handleCloseTab = (e: React.MouseEvent, canvasId: string) => {
    e.stopPropagation();
    setDrawingCanvasState(prev => {
        if (!prev) return null;
        
        const newOpenCanvases = (prev.openCanvases || []).filter(c => c.id !== canvasId);
        
        // If we closed the active tab, find a new one to activate
        if (prev.activeCanvasId === canvasId) {
            let newActiveId: string | null = null;
            if (newOpenCanvases.length > 0) {
                const pinned = newOpenCanvases.filter(c => c.isPinned);
                const notPinned = newOpenCanvases.filter(c => !c.isPinned);
                newActiveId = (pinned[0] || notPinned[0])?.id || null;
            }
            return { ...prev, openCanvases: newOpenCanvases, activeCanvasId: newActiveId };
        }
        
        return { ...prev, openCanvases: newOpenCanvases };
    });
  };

  const handleTogglePin = (e: React.MouseEvent, canvasId: string) => {
    e.stopPropagation();
    togglePinDrawing(canvasId);
  };
  
  const allCanvases = useMemo(() => {
    const canvasList: { resource: Resource; point: ResourcePoint }[] = [];
    resources.forEach(resource => {
      resource.points?.forEach(point => {
        if (point.type === 'paint') {
          canvasList.push({ resource, point });
        }
      });
    });
    return canvasList;
  }, [resources]);

  const handleSearchSelect = (resource: Resource, point: ResourcePoint) => {
    authOpenDrawingCanvas({
        resourceId: resource.id,
        pointId: point.id,
        name: point.text,
        initialDrawing: point.drawing,
    });
    setIsSearchOpen(false);
  };

  const activeCanvas = drawingCanvasState?.openCanvases?.find(c => c.id === drawingCanvasState.activeCanvasId);
  
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
                                      <Pin className={cn("h-3 w-3", canvas.isPinned ? "text-primary fill-current" : "text-muted-foreground")}/>
                                  </button>
                                  {!canvas.isPinned && (
                                      <button onClick={(e) => handleCloseTab(e, canvas.id)} className="p-1 rounded hover:bg-destructive/20">
                                          <X className="h-3 w-3 text-destructive"/>
                                      </button>
                                  )}
                              </Button>
                          ))}
                      </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}><Search className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={handleSaveClick}><Save className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4"/></Button>
                  </div>
              </CardHeader>
              <CardContent className="p-0 flex-grow relative">
                {isMounted && activeCanvas ? (
                  <ExcalidrawWrapper 
                      key={activeCanvas.id} // Important to re-mount Excalidraw when canvas changes
                      activeCanvas={activeCanvas}
                      onSave={(data) => updateDrawingData(activeCanvas.id, data)}
                      theme={theme}
                      apiRef={excalidrawAPIRef}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">Select a canvas to start drawing.</div>
                )}
              </CardContent>
          </Card>
      </div>
      <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <CommandInput placeholder="Search all canvases..." />
          <CommandList>
              <CommandEmpty>No canvases found.</CommandEmpty>
              <CommandGroup heading="Canvases">
                  {allCanvases.map(({ resource, point }) => (
                      <CommandItem
                          key={point.id}
                          onSelect={() => handleSearchSelect(resource, point)}
                          className="flex justify-between items-center"
                      >
                          <span>{point.text || 'Untitled Canvas'}</span>
                          <span className="text-xs text-muted-foreground">{resource.name}</span>
                      </CommandItem>
                  ))}
              </CommandGroup>
          </CommandList>
      </CommandDialog>
    </>
  );
}
