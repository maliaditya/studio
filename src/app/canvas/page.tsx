
"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Save, X, GripVertical, Eraser, Download, Upload, Pin, PinOff, Search, Link as LinkIcon, Paintbrush } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { Resource, ResourcePoint } from '@/types/workout';
import { AuthGuard } from '@/components/AuthGuard';
import dynamic from 'next/dynamic';
import { OnLinkOpen, PointerDownState, AppState, ExcalidrawElement, NonDeleted } from '@excalidraw/excalidraw/types/types';

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
  const initialData = useMemo(() => {
    try {
      if (activeCanvas.data) {
        const parsedData = JSON.parse(activeCanvas.data);
        if (Array.isArray(parsedData.elements)) {
          return { elements: parsedData.elements };
        }
      }
    } catch (e) {
      console.error("Failed to parse canvas data, defaulting to empty.", e);
    }
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

function DrawingCanvasPageContent() {
    const {
        drawingCanvasState,
        setDrawingCanvasState,
        updateDrawingData,
        togglePinDrawing,
        openDrawingCanvas,
        settings,
        resources,
        setFloatingVideoUrl,
        resourceFolders,
        setResourceFolders,
        setResources,
    } = useAuth();
    
    const [theme, setTheme] = useState('dark');
    const [isMounted, setIsMounted] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isLinkingSearchOpen, setIsLinkingSearchOpen] = useState(false);

    const excalidrawAPIRef = useRef<any>(null);
    const { toast } = useToast();
    
    const [isDirty, setIsDirty] = useState(false);
    const isUserChange = useRef(false);

    useEffect(() => {
        setIsMounted(true);
        const handleThemeChange = (e: MediaQueryListEvent) => {
            setTheme(e.matches ? 'dark' : 'light');
        };
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setTheme(mediaQuery.matches ? 'dark' : 'light');
        mediaQuery.addEventListener('change', handleThemeChange);

        if (resourceFolders && (!drawingCanvasState || !drawingCanvasState.activeCanvasId)) {
            // Find or create the scratchpad resource
            let scratchpadFolder = resourceFolders.find(f => f.name === 'Scratchpad');
            if (!scratchpadFolder) {
                scratchpadFolder = { id: 'folder_scratchpad', name: 'Scratchpad', parentId: null, icon: 'Paintbrush' };
                setResourceFolders(prev => [...prev, scratchpadFolder!]);
            }
            let scratchpadResource = resources.find(r => r.folderId === scratchpadFolder!.id && r.name === 'Default Scratchpad');
            if (!scratchpadResource) {
                scratchpadResource = {
                    id: 'res_scratchpad',
                    name: 'Default Scratchpad',
                    folderId: scratchpadFolder.id,
                    type: 'card',
                    createdAt: new Date().toISOString(),
                    points: [],
                };
                setResources(prev => [...prev, scratchpadResource!]);
            }
            let scratchpadPoint = scratchpadResource.points?.find(p => p.type === 'paint');
            if (!scratchpadPoint) {
                scratchpadPoint = { id: `point_scratchpad_${Date.now()}`, text: 'Default Canvas', type: 'paint' };
                setResources(prev => prev.map(r => r.id === scratchpadResource!.id ? { ...r, points: [...(r.points || []), scratchpadPoint!] } : r));
            }
            
            openDrawingCanvas({
                resourceId: scratchpadResource.id,
                pointId: scratchpadPoint.id,
                name: scratchpadPoint.text || 'Scratchpad',
                initialDrawing: scratchpadPoint.drawing,
            });
        }
        
        return () => mediaQuery.removeEventListener('change', handleThemeChange);
    }, [drawingCanvasState, resourceFolders, resources, settings.pinnedCanvasIds]);

    const activeCanvas = drawingCanvasState?.openCanvases?.find(c => c.id === drawingCanvasState.activeCanvasId);

    useEffect(() => {
        isUserChange.current = false;
        setIsDirty(false);
    }, [drawingCanvasState?.activeCanvasId]);

    const handleSaveClick = useCallback(() => {
        if (!excalidrawAPIRef.current || !drawingCanvasState?.activeCanvasId) return;
        const elements = excalidrawAPIRef.current.getSceneElements();
        const appState = excalidrawAPIRef.current.getAppState();
        const drawingData = JSON.stringify({
            type: "excalidraw",
            version: 2,
            source: "dock-app",
            elements: elements,
            appState: { viewBackgroundColor: appState.viewBackgroundColor, gridSize: appState.gridSize }
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
        if (isDirty) handleSaveClick();
        setDrawingCanvasState(prev => prev ? { ...prev, activeCanvasId: canvasId } : null);
    };

    const handleCloseTab = (e: React.MouseEvent, canvasId: string) => {
        e.stopPropagation();
        if (isDirty) handleSaveClick();
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
        openDrawingCanvas({
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
        handleSaveClick();
        setIsLinkingSearchOpen(false);
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-background">
            <header className="p-2 flex items-center justify-between border-b gap-4 flex-shrink-0">
                <div className="flex-grow min-w-0 overflow-x-auto">
                    <div className="flex items-center gap-2">
                        {(drawingCanvasState?.openCanvases || []).map(canvas => (
                            <Button
                                key={canvas.id}
                                variant={drawingCanvasState?.activeCanvasId === canvas.id ? "secondary" : "ghost"}
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
                </div>
            </header>
            <main className="flex-grow relative">
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
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">Select or open a canvas to start drawing.</div>
                )}
            </main>
        </div>
    );
}

export default function DrawingCanvasPage() {
    return (
        <AuthGuard>
            <DrawingCanvasPageContent />
        </AuthGuard>
    )
}
