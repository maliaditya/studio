
"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Save, X, GripVertical, Eraser, Download, Upload, Pin, PinOff, Search, Link as LinkIcon, Paintbrush, Plus, Library, ArrowUpRight, Copy, Edit3, Sparkles, Loader2, Volume2, VolumeX, RefreshCw } from 'lucide-react';
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
import { safeSetLocalStorageItem } from '@/lib/safeStorage';
import { parseJsonWithRecovery } from '@/lib/jsonRecovery';
import { getAiConfigFromSettings } from '@/lib/ai/config';
import { cleanSpeechText, getKokoroLocalVoices, getOpenAiCloudVoices, loadSpeechPrefs, parseCloudVoiceURI, pickBestVoice, saveSpeechPrefs } from '@/lib/tts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
const DEFAULT_KOKORO_BASE_URL = 'http://127.0.0.1:8880';
const DIAGRAM_EXPLANATION_STORAGE_KEY_PREFIX = 'dock-diagram-explanation:';
type DiagramLaserLine = { id: number; left: number; top: number; width: number; height: number; startChar?: number; endChar?: number };

const normalizeDiagramText = (value: string) => value.replace(/\s+/g, ' ').trim();

const getElementReadableLabel = (
  element: ExcalidrawElement | undefined,
  byId: Map<string, ExcalidrawElement>,
  textByContainerId: Map<string, string>,
  textById: Map<string, string>
) => {
  if (!element) return 'unknown';
  const ownText = textById.get(element.id);
  if (ownText) return ownText;
  const containerText = textByContainerId.get(element.id);
  if (containerText) return containerText;
  if ((element as any).type === 'frame') return 'frame';
  return (element as any).type || 'element';
};

const buildCanvasDiagramSummary = (elements: readonly ExcalidrawElement[]) => {
  const scene = elements.filter((element) => !element.isDeleted);
  if (scene.length === 0) return '';

  const byId = new Map(scene.map((element) => [element.id, element] as const));
  const textElements = scene.filter(
    (element): element is NonDeleted<ExcalidrawElement> & { type: 'text'; text: string; containerId?: string | null } =>
      element.type === 'text' && typeof (element as any).text === 'string' && normalizeDiagramText((element as any).text).length > 0
  );
  const sortedTexts = [...textElements].sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const textById = new Map(sortedTexts.map((element) => [element.id, normalizeDiagramText(element.text)]));
  const textByContainerId = new Map(
    sortedTexts
      .filter((element) => element.containerId)
      .map((element) => [String(element.containerId), normalizeDiagramText(element.text)] as const)
  );

  const arrows = scene.filter((element) => element.type === 'arrow');
  const arrowDescriptions = arrows
    .map((arrow) => {
      const startId = (arrow as any).startBinding?.elementId as string | undefined;
      const endId = (arrow as any).endBinding?.elementId as string | undefined;
      if (!startId || !endId) return null;
      const start = getElementReadableLabel(byId.get(startId), byId, textByContainerId, textById);
      const end = getElementReadableLabel(byId.get(endId), byId, textByContainerId, textById);
      if (!start || !end || start === 'unknown' || end === 'unknown') return null;
      return `${start} -> ${end}`;
    })
    .filter((value): value is string => Boolean(value));

  const nonTextTypes = scene
    .filter((element) => element.type !== 'text')
    .reduce<Record<string, number>>((acc, element) => {
      acc[element.type] = (acc[element.type] || 0) + 1;
      return acc;
    }, {});

  const sections = [
    `Canvas contains ${scene.length} elements.`,
    sortedTexts.length > 0 ? `Text labels:\n${sortedTexts.slice(0, 120).map((element) => `- ${normalizeDiagramText(element.text)}`).join('\n')}` : '',
    arrowDescriptions.length > 0 ? `Explicit arrow relationships:\n${arrowDescriptions.slice(0, 60).map((line) => `- ${line}`).join('\n')}` : '',
    Object.keys(nonTextTypes).length > 0
      ? `Element counts by type:\n${Object.entries(nonTextTypes).map(([type, count]) => `- ${type}: ${count}`).join('\n')}`
      : '',
  ].filter(Boolean);

  return sections.join('\n\n');
};

const getDiagramExplanationStorageKey = (canvasId: string) => `${DIAGRAM_EXPLANATION_STORAGE_KEY_PREFIX}${canvasId}`;

const buildDiagramLaserLines = (container: HTMLElement | null): DiagramLaserLine[] => {
  if (!container) return [];
  const containerRect = container.getBoundingClientRect();
  const lines: DiagramLaserLine[] = [];
  let runningChar = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return NodeFilter.FILTER_REJECT;
      const style = window.getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let currentNode = walker.nextNode();
  while (currentNode) {
    const textNode = currentNode as Text;
    const rawText = textNode.textContent || '';
    const matches = Array.from(rawText.matchAll(/\S+/g));
    matches.forEach((match) => {
      const word = match[0];
      const startOffset = match.index || 0;
      const endOffset = startOffset + word.length;
      const range = document.createRange();
      range.setStart(textNode, startOffset);
      range.setEnd(textNode, endOffset);
      const rect = Array.from(range.getClientRects()).find((candidate) => candidate.width > 1 && candidate.height > 1);
      range.detach?.();
      if (!rect) return;
      const startChar = runningChar;
      const endChar = runningChar + word.length;
      lines.push({
        id: lines.length,
        left: rect.left - containerRect.left,
        top: rect.top - containerRect.top + Math.max(1, Math.round(rect.height * 0.72)),
        width: rect.width,
        height: 2,
        startChar,
        endChar,
      });
      runningChar = endChar + 1;
    });
    currentNode = walker.nextNode();
  }

  return lines;
};

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
      const parsed = parseJsonWithRecovery<{ elements?: any[]; appState?: AppState; files?: ExcalidrawFilesMetaMap }>(drawingData);
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
          minWidth: 520,
          minHeight: 360,
        }}
        className="fixed z-[160] rounded-2xl border border-white/10 bg-background/90 backdrop-blur-md shadow-2xl overflow-hidden resize both canvas-preview"
        onMouseEnter={() => setIsBackgroundBlurred(true)}
        onMouseLeave={() => setIsBackgroundBlurred(false)}
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
        <CardHeader className="p-3 border-b">
          <CardTitle className="text-base">Sub Canvases: {resource.name}</CardTitle>
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
        const parsedData = parseJsonWithRecovery<{ elements?: unknown[]; appState?: AppState }>(activeCanvas.data);
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
    handleUpdateResource,
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
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; canvasId: string } | null>(null);
  const [subCanvasListResourceId, setSubCanvasListResourceId] = useState<string | null>(null);
  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
  const [editingCanvasName, setEditingCanvasName] = useState('');
  const editingInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  const excalidrawAPIRef = useRef<any>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechAudioUrlRef = useRef<string | null>(null);
  const diagramExplainScrollRef = useRef<HTMLDivElement | null>(null);
  const diagramExplainContentRef = useRef<HTMLDivElement | null>(null);
  const diagramLaserLinesRef = useRef<DiagramLaserLine[]>([]);
  const diagramLaserWeightsRef = useRef<number[]>([]);
  const diagramLaserCurrentIndexRef = useRef(-1);
  const diagramAutoScrollFrameRef = useRef<number | null>(null);
  const diagramAutoScrollLastTsRef = useRef<number | null>(null);
  const { toast } = useToast();
  
  const [isDirty, setIsDirty] = useState(false);
  const isUserChange = useRef(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [loadedFiles, setLoadedFiles] = useState<Record<string, any>>({});
  const [loadedFilesCanvasId, setLoadedFilesCanvasId] = useState<string | null>(null);
  const [showDiagramExplainPanel, setShowDiagramExplainPanel] = useState(false);
  const [isExplainingDiagram, setIsExplainingDiagram] = useState(false);
  const [diagramExplanation, setDiagramExplanation] = useState('');
  const [diagramExplainError, setDiagramExplainError] = useState('');
  const [isReadingDiagram, setIsReadingDiagram] = useState(false);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsVoiceURI, setTtsVoiceURI] = useState<string | undefined>(undefined);
  const [isKokoroHealthy, setIsKokoroHealthy] = useState(false);
  const [kokoroMode, setKokoroMode] = useState<'cpu' | 'gpu' | 'custom' | 'existing' | null>(null);
  const [diagramLaserCurrentLine, setDiagramLaserCurrentLine] = useState<DiagramLaserLine | null>(null);
  const [diagramLaserTrailLines, setDiagramLaserTrailLines] = useState<DiagramLaserLine[]>([]);
  const [diagramLaserCurrentLineProgress, setDiagramLaserCurrentLineProgress] = useState(1);

  useEffect(() => {
    if (!editingCanvasId) return;
    const t = setTimeout(() => {
      editingInputRef.current?.focus();
      editingInputRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, [editingCanvasId]);

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

  useEffect(() => {
    if (!isOpen || !drawingCanvasState?.activeCanvasId) return;
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
  }, [isOpen, drawingCanvasState?.activeCanvasId, handleSaveClick]);

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
  const isDesktopRuntime = typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
  const aiConfig = useMemo(() => getAiConfigFromSettings(settings, isDesktopRuntime), [settings, isDesktopRuntime]);
  const isAiEnabled = aiConfig.provider !== 'none';
  const kokoroBaseUrl = (settings.kokoroTtsBaseUrl || DEFAULT_KOKORO_BASE_URL).trim();
  const kokoroEnabled = isDesktopRuntime && (isKokoroHealthy || Boolean(kokoroBaseUrl));
  const cloudVoices = useMemo(
    () => [...getOpenAiCloudVoices(aiConfig), ...getKokoroLocalVoices(kokoroEnabled)],
    [aiConfig, kokoroEnabled]
  );
  const kokoroStatusLabel = !isDesktopRuntime
    ? 'web'
    : isKokoroHealthy
    ? kokoroMode
      ? `kokoro-${kokoroMode}`
      : 'kokoro-ready'
    : 'kokoro-offline';

  useEffect(() => {
    isUserChange.current = false;
    setIsDirty(false);
  }, [drawingCanvasState?.activeCanvasId]);

  useEffect(() => {
    setShowDiagramExplainPanel(false);
    setIsExplainingDiagram(false);
    setDiagramExplainError('');
    setIsReadingDiagram(false);
    const canvasId = activeCanvas?.id;
    if (!canvasId || typeof window === 'undefined') {
      setDiagramExplanation('');
      return;
    }
    try {
      const saved = localStorage.getItem(getDiagramExplanationStorageKey(canvasId));
      setDiagramExplanation(saved || '');
    } catch {
      setDiagramExplanation('');
    }
  }, [activeCanvas?.id]);

  useEffect(() => {
    const canvasId = activeCanvas?.id;
    if (!canvasId || typeof window === 'undefined') return;
    try {
      const storageKey = getDiagramExplanationStorageKey(canvasId);
      if (diagramExplanation.trim()) {
        safeSetLocalStorageItem(storageKey, diagramExplanation);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // ignore
    }
  }, [activeCanvas?.id, diagramExplanation]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setTtsVoices(Array.isArray(voices) ? voices : []);
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    const prefs = loadSpeechPrefs();
    if (prefs.voiceURI) setTtsVoiceURI(prefs.voiceURI);
  }, []);

  useEffect(() => {
    if (ttsVoiceURI) return;
    const best = pickBestVoice(ttsVoices);
    if (best?.voiceURI) {
      setTtsVoiceURI(best.voiceURI);
      return;
    }
    if (cloudVoices.length > 0) {
      setTtsVoiceURI(cloudVoices[0].voiceURI);
    }
  }, [cloudVoices, ttsVoiceURI, ttsVoices]);

  useEffect(() => {
    saveSpeechPrefs({ voiceURI: ttsVoiceURI });
  }, [ttsVoiceURI]);

  const stopDiagramLaserGuide = useCallback(() => {
    diagramLaserLinesRef.current = [];
    diagramLaserWeightsRef.current = [];
    diagramLaserCurrentIndexRef.current = -1;
    setDiagramLaserCurrentLine(null);
    setDiagramLaserTrailLines([]);
    setDiagramLaserCurrentLineProgress(0);
  }, []);

  const syncDiagramLaserProgress = useCallback((progress: number) => {
    const lines = diagramLaserLinesRef.current;
    if (!lines.length) return;
    const linesWithChars = lines.filter((line) => typeof line.startChar === 'number' && typeof line.endChar === 'number');
    const totalChars =
      linesWithChars.length > 0
        ? Math.max(1, (linesWithChars[linesWithChars.length - 1].endChar || 1))
        : Math.max(1, diagramLaserWeightsRef.current.reduce((sum, value) => sum + value, 0));
    const targetChar = Math.max(0, Math.min(totalChars - 1, Math.floor(progress * totalChars)));
    let idx = 0;
    let lineProgress = Math.max(0.04, Math.min(0.96, progress));

    if (linesWithChars.length > 0) {
      idx = lines.findIndex((line) => {
        const start = line.startChar ?? 0;
        const end = line.endChar ?? start + 1;
        return targetChar >= start && targetChar < end;
      });
      if (idx < 0) idx = lines.length - 1;
      const targetLine = lines[idx];
      const start = targetLine.startChar ?? 0;
      const end = targetLine.endChar ?? start + 1;
      lineProgress = Math.max(0.04, Math.min(0.96, (targetChar - start) / Math.max(1, end - start)));
    } else {
      const weights = diagramLaserWeightsRef.current;
      if (!weights.length) return;
      const totalWeight = weights.reduce((sum, value) => sum + value, 0);
      if (totalWeight <= 0) return;
      const target = Math.max(0, Math.min(0.9999, progress)) * totalWeight;
      let acc = 0;
      for (let i = 0; i < lines.length; i += 1) {
        const next = acc + weights[i];
        if (target <= next) {
          idx = i;
          lineProgress = Math.max(0.04, Math.min(0.96, (target - acc) / Math.max(1, weights[i])));
          break;
        }
        acc = next;
        idx = i;
      }
    }

    if (diagramLaserCurrentIndexRef.current !== idx) {
      diagramLaserCurrentIndexRef.current = idx;
      setDiagramLaserCurrentLine(lines[idx]);
      setDiagramLaserTrailLines([]);
    }
    setDiagramLaserCurrentLineProgress(lineProgress);
  }, []);

  const startDiagramLaserGuide = useCallback(() => {
    const lines = buildDiagramLaserLines(diagramExplainContentRef.current);
    if (!lines.length) {
      stopDiagramLaserGuide();
      return;
    }
    diagramLaserLinesRef.current = lines;
    diagramLaserWeightsRef.current = lines.map((line) => Math.max(8, (line.endChar ?? 0) - (line.startChar ?? 0), line.width * 0.08));
    diagramLaserCurrentIndexRef.current = 0;
    setDiagramLaserTrailLines([]);
    setDiagramLaserCurrentLine(lines[0]);
    setDiagramLaserCurrentLineProgress(0.04);
  }, [stopDiagramLaserGuide]);

  useEffect(() => {
    if (!isReadingDiagram) {
      if (diagramAutoScrollFrameRef.current !== null) {
        cancelAnimationFrame(diagramAutoScrollFrameRef.current);
        diagramAutoScrollFrameRef.current = null;
      }
      diagramAutoScrollLastTsRef.current = null;
      return;
    }

    const scrollHost = diagramExplainScrollRef.current;
    if (!scrollHost) return;

    const pixelsPerSecond = 14;
    const step = (timestamp: number) => {
      const host = diagramExplainScrollRef.current;
      if (!host) return;
      const lastTs = diagramAutoScrollLastTsRef.current ?? timestamp;
      const deltaMs = Math.max(0, timestamp - lastTs);
      diagramAutoScrollLastTsRef.current = timestamp;

      const maxScrollTop = Math.max(0, host.scrollHeight - host.clientHeight);
      if (host.scrollTop < maxScrollTop) {
        const nextTop = Math.min(maxScrollTop, host.scrollTop + (pixelsPerSecond * deltaMs) / 1000);
        host.scrollTop = nextTop;
      }

      diagramAutoScrollFrameRef.current = requestAnimationFrame(step);
    };

    diagramAutoScrollFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (diagramAutoScrollFrameRef.current !== null) {
        cancelAnimationFrame(diagramAutoScrollFrameRef.current);
        diagramAutoScrollFrameRef.current = null;
      }
      diagramAutoScrollLastTsRef.current = null;
    };
  }, [isReadingDiagram]);

  const stopDiagramSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (speechAudioRef.current) {
      speechAudioRef.current.pause();
      speechAudioRef.current.src = '';
      speechAudioRef.current = null;
    }
    if (speechAudioUrlRef.current) {
      URL.revokeObjectURL(speechAudioUrlRef.current);
      speechAudioUrlRef.current = null;
    }
    speechUtteranceRef.current = null;
    stopDiagramLaserGuide();
    setIsReadingDiagram(false);
  }, [stopDiagramLaserGuide]);

  useEffect(() => {
    return () => {
      stopDiagramSpeech();
    };
  }, [stopDiagramSpeech]);

  useEffect(() => {
    if (!showDiagramExplainPanel || !diagramExplanation) {
      stopDiagramLaserGuide();
      return;
    }
    const refresh = () => startDiagramLaserGuide();
    const timeoutId = window.setTimeout(refresh, 0);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && diagramExplainContentRef.current
        ? new ResizeObserver(() => startDiagramLaserGuide())
        : null;
    if (resizeObserver && diagramExplainContentRef.current) {
      resizeObserver.observe(diagramExplainContentRef.current);
    }
    return () => {
      window.clearTimeout(timeoutId);
      resizeObserver?.disconnect();
    };
  }, [diagramExplanation, showDiagramExplainPanel, startDiagramLaserGuide, stopDiagramLaserGuide]);

  useEffect(() => {
    if (showDiagramExplainPanel) return;
    stopDiagramSpeech();
  }, [showDiagramExplainPanel, stopDiagramSpeech]);

  const checkKokoroServerHealth = useCallback(async () => {
    if (!isDesktopRuntime) {
      setIsKokoroHealthy(false);
      setKokoroMode(null);
      return;
    }
    const bridge = (window as any)?.studioDesktop?.kokoro;
    const baseUrl = kokoroBaseUrl.replace(/\/+$/, '');
    if (!baseUrl) {
      setIsKokoroHealthy(false);
      setKokoroMode(null);
      return;
    }
    if (bridge?.status) {
      try {
        const status = await Promise.resolve(bridge.status({ baseUrl }));
        if (status?.success) {
          setIsKokoroHealthy(Boolean(status.healthy));
          const modeText = String(status.mode || '').toLowerCase();
          if (modeText === 'gpu') setKokoroMode('gpu');
          else if (modeText === 'cpu') setKokoroMode('cpu');
          else if (modeText === 'custom') setKokoroMode('custom');
          else if (modeText === 'existing') setKokoroMode('existing');
          else setKokoroMode(null);
          return;
        }
      } catch {
        // fallback below
      }
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      const text = response.ok ? await response.text().catch(() => '') : '';
      const healthy = response.ok && /healthy|ok/i.test(text || '');
      setIsKokoroHealthy(healthy);
      setKokoroMode(healthy ? 'existing' : null);
    } catch {
      setIsKokoroHealthy(false);
      setKokoroMode(null);
    }
  }, [isDesktopRuntime, kokoroBaseUrl]);

  useEffect(() => {
    if (!isDesktopRuntime) return;
    void checkKokoroServerHealth();
    const timerId = setInterval(() => {
      void checkKokoroServerHealth();
    }, 5000);
    return () => clearInterval(timerId);
  }, [checkKokoroServerHealth, isDesktopRuntime]);

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
  
  useEffect(() => {
    if (!isOpen) return;
    if (!isDirty) return;
    const intervalSeconds = Math.max(0, settings.drawingCanvasAutoSaveInterval ?? 30);
    if (!intervalSeconds) return;
    const timer = setTimeout(() => {
      void handleSaveClick();
    }, intervalSeconds * 1000);
    return () => clearTimeout(timer);
  }, [isOpen, isDirty, settings.drawingCanvasAutoSaveInterval, handleSaveClick]);

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

  const handleRenameCanvas = useCallback((canvasId: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) {
      setEditingCanvasId(null);
      return;
    }
    const targetCanvas = drawingCanvasState?.openCanvases?.find(c => c.id === canvasId);
    if (!targetCanvas) {
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

  const handleExplainDiagram = useCallback(async (forceRegenerate = false) => {
    if (!activeCanvas?.id || !excalidrawAPIRef.current) return;
    if (!isAiEnabled) {
      toast({
        title: 'AI not configured',
        description: 'Choose a provider in Settings > AI Settings first.',
        variant: 'destructive',
      });
      return;
    }

    if (!forceRegenerate && diagramExplanation.trim()) {
      setShowDiagramExplainPanel(true);
      setDiagramExplainError('');
      return;
    }

    const sceneElements = excalidrawAPIRef.current.getSceneElements?.() || [];
    const diagramText = buildCanvasDiagramSummary(sceneElements);
    if (!diagramText.trim()) {
      toast({
        title: 'Canvas is empty',
        description: 'Add some diagram content first, then ask AI to explain it.',
        variant: 'destructive',
      });
      return;
    }

    setShowDiagramExplainPanel(true);
    setIsExplainingDiagram(true);
    setDiagramExplainError('');
    try {
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
        },
        body: JSON.stringify({
          text: diagramText,
          context: `Canvas diagram: ${activeCanvas.name || 'Untitled Canvas'}`,
          question:
            'Explain this diagram in plain language. Identify the core logic, key clusters, important relationships, causal flow, and likely intended meaning. If some relationships are ambiguous, say that clearly.',
          aiConfig,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(result?.details || result?.error || 'Failed to explain diagram.'));
      }
      setDiagramExplanation(String(result?.explanation || ''));
    } catch (error) {
      setDiagramExplanation('');
      setDiagramExplainError(error instanceof Error ? error.message : 'Failed to explain diagram.');
    } finally {
      setIsExplainingDiagram(false);
    }
  }, [activeCanvas?.id, activeCanvas?.name, aiConfig, diagramExplanation, isAiEnabled, isDesktopRuntime, toast]);

  const handleReadDiagramExplanation = useCallback(() => {
    const run = async () => {
      if (isReadingDiagram) {
        stopDiagramSpeech();
        return;
      }
      const text = cleanSpeechText(diagramExplanation);
      if (!text) return;
      stopDiagramSpeech();
      startDiagramLaserGuide();

      const selectedCloudVoice = parseCloudVoiceURI(ttsVoiceURI);
      if (selectedCloudVoice) {
        try {
          setIsReadingDiagram(true);
          const response = await fetch('/api/ai/tts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
            },
            body: JSON.stringify({
              text,
              provider: selectedCloudVoice.provider,
              voice: selectedCloudVoice.id,
              speed: 1,
              kokoroBaseUrl,
              aiConfig,
            }),
          });
          if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            throw new Error(result?.details || result?.error || 'TTS failed.');
          }
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          speechAudioUrlRef.current = url;
          const audio = new Audio(url);
          speechAudioRef.current = audio;
          audio.onloadedmetadata = () => syncDiagramLaserProgress(0.02);
          audio.ontimeupdate = () => {
            if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
            syncDiagramLaserProgress(Math.max(0.02, Math.min(1, audio.currentTime / audio.duration)));
          };
          audio.onended = () => {
            syncDiagramLaserProgress(1);
            stopDiagramSpeech();
          };
          audio.onerror = () => stopDiagramSpeech();
          await audio.play();
          return;
        } catch (error) {
          stopDiagramSpeech();
          toast({
            title: 'Read aloud failed',
            description: error instanceof Error ? error.message : 'Could not generate speech.',
            variant: 'destructive',
          });
          return;
        }
      }

      if (typeof window === 'undefined' || !window.speechSynthesis) {
        toast({
          title: 'Read aloud unavailable',
          description: 'Speech synthesis is not supported in this browser.',
          variant: 'destructive',
        });
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      const selectedVoice = pickBestVoice(ttsVoices, ttsVoiceURI);
      const totalChars = Math.max(1, text.length);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.onstart = () => {
        syncDiagramLaserProgress(0.02);
      };
      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        if (typeof event.charIndex !== 'number') return;
        const charLength = typeof (event as any).charLength === 'number' ? Number((event as any).charLength) : 1;
        const progress = (event.charIndex + Math.max(1, charLength) * 0.8) / totalChars;
        syncDiagramLaserProgress(Math.max(0.02, Math.min(1, progress)));
      };
      utterance.onend = () => {
        syncDiagramLaserProgress(1);
        setIsReadingDiagram(false);
        stopDiagramLaserGuide();
      };
      utterance.onerror = () => {
        setIsReadingDiagram(false);
        stopDiagramLaserGuide();
      };
      speechUtteranceRef.current = utterance;
      window.speechSynthesis.cancel();
      setIsReadingDiagram(true);
      window.speechSynthesis.speak(utterance);
    };
    void run();
  }, [aiConfig, diagramExplanation, isDesktopRuntime, isReadingDiagram, kokoroBaseUrl, startDiagramLaserGuide, stopDiagramLaserGuide, stopDiagramSpeech, syncDiagramLaserProgress, toast, ttsVoiceURI, ttsVoices]);

  const handleCreateSubCanvas = useCallback((canvasId: string) => {
    const targetCanvas = drawingCanvasState?.openCanvases?.find(c => c.id === canvasId);
    if (!targetCanvas) return;
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
    authOpenDrawingCanvas({
      resourceId: resource.id,
      pointId: newPoint.id,
      name: newPoint.text || 'Sub Canvas',
      initialDrawing: newPoint.drawing,
    });
    setEditingCanvasId(newCanvasId);
    setEditingCanvasName(newPoint.text || 'Sub Canvas');
  }, [authOpenDrawingCanvas, drawingCanvasState?.openCanvases, handleUpdateResource, resources, toast]);

  const onLinkOpen: OnLinkOpen = useCallback((element, event) => {
    event.preventDefault();
    const link = element.link;
    
    if (link?.startsWith('canvas://')) {
        const [resourceId, pointId] = link.replace('canvas://', '').split('/');
        
        const resource = resources.find(r => r.id === resourceId);
        const point = resource?.points?.find(p => p.id === pointId);
        
        if (resource && point) {
            const width = Math.max(520, Math.min(window.innerWidth * 0.8, 1100));
            const height = Math.max(360, Math.min(window.innerHeight * 0.75, 760));
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

  const handleClose = useCallback(async () => {
    if (isDirty) {
      await handleSaveClick();
    }
    onClose();
  }, [isDirty, handleSaveClick, onClose]);
  
  if (!isOpen || !drawingCanvasState) return null;

  const subCanvasListResource = resources.find(r => r.id === subCanvasListResourceId);

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
                                      className="h-4 text-[10px] px-1 py-0.5"
                                    />
                                  ) : (
                                    <span className="truncate max-w-[88px]">{canvas.name}</span>
                                  )}
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
                    {isDesktopRuntime ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => void handleExplainDiagram()}
                        title={isAiEnabled ? "Explain this diagram with AI" : "Configure AI provider first"}
                      >
                        {isExplainingDiagram ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={openCanvasResourceCard}><Plus className="h-2.5 w-2.5"/></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsSearchOpen(prev => !prev)}><Search className="h-2.5 w-2.5"/></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsLinkingSearchOpen(prev => !prev)}><LinkIcon className="h-2.5 w-2.5"/></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsLinkingResourceOpen(prev => !prev)}><Library className="h-2.5 w-2.5"/></Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleSaveClick}>
                        <Save className={cn("h-2.5 w-2.5", isDirty ? "text-red-500" : "text-green-500")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleClose}><X className="h-2.5 w-2.5"/></Button>
                  </div>
              </CardHeader>
              <CardContent className="p-0 flex-grow relative">
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
                    />
                    {isDesktopRuntime && showDiagramExplainPanel && (
                      <div className="absolute right-3 top-3 z-20 w-[380px] max-w-[calc(100%-1.5rem)] max-h-[calc(100%-1.5rem)] overflow-hidden rounded-2xl border bg-background/95 shadow-2xl backdrop-blur">
                        <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <Sparkles className="h-4 w-4 text-primary" />
                              Diagram Explanation
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {activeCanvas.name || 'Untitled Canvas'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => void handleExplainDiagram(true)}
                              disabled={isExplainingDiagram}
                              title="Regenerate explanation"
                            >
                              <RefreshCw className={cn("h-4 w-4", isExplainingDiagram && "animate-spin")} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={handleReadDiagramExplanation}
                              disabled={!diagramExplanation}
                              title={isReadingDiagram ? 'Stop read aloud' : 'Read aloud'}
                            >
                              {isReadingDiagram ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => {
                                stopDiagramSpeech();
                                setShowDiagramExplainPanel(false);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div ref={diagramExplainScrollRef} className="max-h-[calc(100vh-13rem)] overflow-y-auto px-4 py-3">
                          <div className="mb-3 rounded-xl border bg-muted/30 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-xs font-medium">Read Aloud</div>
                              <div className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide',
                                isKokoroHealthy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'
                              )}>
                                {kokoroStatusLabel}
                              </div>
                            </div>
                            <div className="mt-2">
                              <label className="mb-1 block text-[11px] text-muted-foreground">Voice</label>
                              <select
                                className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                                value={ttsVoiceURI || ''}
                                onChange={(event) => setTtsVoiceURI(event.target.value || undefined)}
                              >
                                {ttsVoices.length === 0 && cloudVoices.length === 0 && (
                                  <option value="">Default voice</option>
                                )}
                                {ttsVoices.length > 0 && (
                                  <optgroup label="System voices">
                                    {ttsVoices.map((voice) => (
                                      <option key={voice.voiceURI} value={voice.voiceURI}>
                                        {voice.name} {voice.lang ? `(${voice.lang})` : ''}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                                {cloudVoices.length > 0 && (
                                  <optgroup label="Cloud voices">
                                    {cloudVoices.map((voice) => (
                                      <option key={voice.voiceURI} value={voice.voiceURI}>
                                        {voice.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            </div>
                          </div>
                          {isExplainingDiagram ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Analyzing the current diagram...
                            </div>
                          ) : diagramExplainError ? (
                            <div className="text-sm text-destructive">{diagramExplainError}</div>
                          ) : diagramExplanation ? (
                            <div ref={diagramExplainContentRef} className="relative prose prose-sm dark:prose-invert max-w-none">
                              {diagramLaserCurrentLine && (
                                <div
                                  key={`diagram-laser-current-${diagramLaserCurrentLine.id}`}
                                  className="pointer-events-none absolute z-10 transition-[top,left] duration-100"
                                  style={{
                                    left: `${diagramLaserCurrentLine.left + Math.max(0, diagramLaserCurrentLine.width * diagramLaserCurrentLineProgress - 42)}px`,
                                    top: `${diagramLaserCurrentLine.top - 2}px`,
                                    width: `${Math.min(54, Math.max(18, diagramLaserCurrentLine.width * 0.22))}px`,
                                    height: `8px`,
                                    background:
                                      'linear-gradient(90deg, rgba(34,211,238,0) 0%, rgba(34,211,238,0.14) 38%, rgba(34,211,238,0.45) 72%, rgba(165,243,252,0.95) 100%)',
                                    filter: 'drop-shadow(0 0 5px rgba(34,211,238,0.45))',
                                    borderRadius: '999px',
                                  }}
                                >
                                  <div
                                    className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-cyan-200"
                                    style={{
                                      width: '6px',
                                      height: '2px',
                                      boxShadow: '0 0 7px rgba(165,243,252,0.95)',
                                    }}
                                  />
                                </div>
                              )}
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {diagramExplanation}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Click the AI icon to generate an explanation for this diagram.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">Select a canvas to start drawing.</div>
                )}
              </CardContent>
          </Card>
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
              const canvas = drawingCanvasState.openCanvases?.find(c => c.id === tabContextMenu.canvasId);
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
              const canvas = drawingCanvasState.openCanvases?.find(c => c.id === tabContextMenu.canvasId);
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
      <ResourceSearchPopup open={isLinkingResourceOpen} setOpen={setIsLinkingResourceOpen} onSelect={handleLinkingResourceSelect} title="Link a Resource Card" />
      {subCanvasListResource && (
        <SubCanvasListPopup
          open={!!subCanvasListResourceId}
          setOpen={(open) => setSubCanvasListResourceId(open ? subCanvasListResourceId : null)}
          resource={subCanvasListResource}
          onSelect={(resource, point) => {
            authOpenDrawingCanvas({
              resourceId: resource.id,
              pointId: point.id,
              name: point.text || 'Untitled Canvas',
              initialDrawing: point.drawing,
            });
            setSubCanvasListResourceId(null);
          }}
        />
      )}
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
            setCanvasPreview(null);
          }}
          storageKey={`canvasPreview:${canvasPreview.resourceId}-${canvasPreview.pointId}`}
        />
      )}
    </>
  );
}
