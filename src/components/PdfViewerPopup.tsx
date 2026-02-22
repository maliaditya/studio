
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import {
  Loader2,
  ZoomIn,
  ZoomOut,
  GripVertical,
  X,
  Upload,
  RotateCw,
  Maximize2,
  Minimize2,
  Pencil,
  Undo2,
  Eraser,
  Download,
} from "lucide-react";
import { getPdfForResource, storePdf } from "@/lib/audioDB";
import { downloadPdfFromSupabase, uploadPdfToSupabase } from "@/lib/supabasePdfStorage";
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useDraggable } from '@dnd-kit/core';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from "@/contexts/AuthContext";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

type AnnotationPoint = { x: number; y: number };
type AnnotationStroke = { color: string; size: number; points: AnnotationPoint[] };
type AnnotationByPage = Record<number, AnnotationStroke[]>;
type ViewerPrefs = { scale: number; fitMode: "custom" | "width"; rotation: number };

const persistAnnotationsLocalMirror = (key: string | null, data: AnnotationByPage) => {
    if (!key) return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch {
        // ignore storage issues
    }
};

export default function PdfViewerPopup() {
    const { pdfViewerState, setPdfViewerState, settings, setSettings, setResources, currentUser } = useAuth();
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [file, setFile] = useState<Blob | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [scale, setScale] = useState(1.5);
    const [fitMode, setFitMode] = useState<"custom" | "width">("custom");
    const [rotation, setRotation] = useState(0);
    const [pageInput, setPageInput] = useState("1");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isReaderOnly, setIsReaderOnly] = useState(false);
    const [isAnnotating, setIsAnnotating] = useState(false);
    const [penColor, setPenColor] = useState("#22c55e");
    const [penSize, setPenSize] = useState(2);
    const [annotations, setAnnotations] = useState<AnnotationByPage>({});
    const [pageRenderWidth, setPageRenderWidth] = useState<number | undefined>(undefined);

    const [resizeMode, setResizeMode] = useState<null | "x" | "y" | "xy">(null);
    const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, mode: "x" as "x" | "y" | "xy" });
    const pdfUploadInputRef = useRef<HTMLInputElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const fitContainerRef = useRef<HTMLDivElement>(null);
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
    const drawingStrokeRef = useRef<AnnotationStroke | null>(null);
    const isResizing = resizeMode !== null;
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: 'pdf-viewer-popup',
        disabled: isResizing,
    });

    useEffect(() => {
        const load = async () => {
            const resource = pdfViewerState?.resource;
            if (!resource?.id) {
                setFile(null);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const local = await getPdfForResource(resource.id, resource.pdfFileName);
                if (local.blob) {
                    setFile(local.blob);
                } else if (currentUser?.username) {
                    const remote = await downloadPdfFromSupabase(currentUser.username, resource.id, {
                        url: settings.supabaseUrl,
                        anonKey: settings.supabaseAnonKey,
                        bucket: settings.supabasePdfBucket,
                    });
                    if (remote) {
                        await storePdf(resource.id, remote);
                        setResources(prev => prev.map(r => r.id === resource.id ? { ...r, hasLocalPdf: true } : r));
                        setFile(remote);
                    } else {
                        setFile(null);
                    }
                } else {
                    setFile(null);
                }
            } catch (err) {
                console.error("Failed to load PDF:", err);
                setFile(null);
            } finally {
                setIsLoading(false);
            }

            setNumPages(null);
            const lastOpenedPage = settings.pdfLastOpenedPageByResourceId?.[resource.id] || 1;
            setPageNumber(Math.max(1, lastOpenedPage));
        };
        void load();
    }, [
        pdfViewerState?.resource?.id,
        pdfViewerState?.resource?.pdfFileName,
        currentUser?.username,
        settings.supabaseUrl,
        settings.supabaseAnonKey,
        settings.supabasePdfBucket,
        setResources,
    ]);

    useEffect(() => {
        const resourceId = pdfViewerState?.resource?.id;
        if (!resourceId || !numPages) return;
        setSettings((prev) => {
            const currentMap = prev.pdfLastOpenedPageByResourceId || {};
            const nextPage = Math.min(Math.max(1, pageNumber), numPages);
            if (currentMap[resourceId] === nextPage) return prev;
            return {
                ...prev,
                pdfLastOpenedPageByResourceId: {
                    ...currentMap,
                    [resourceId]: nextPage,
                },
            };
        });
    }, [numPages, pageNumber, pdfViewerState?.resource?.id, setSettings]);

    const resourceId = pdfViewerState?.resource?.id || null;
    const annotationStorageKey = useMemo(() => {
        return resourceId ? `pdf-annotations:${resourceId}` : null;
    }, [resourceId]);
    const viewerPrefsStorageKey = useMemo(() => {
        const resourceId = pdfViewerState?.resource?.id;
        return resourceId ? `pdf-viewer-prefs:${resourceId}` : null;
    }, [pdfViewerState?.resource?.id]);

    useEffect(() => {
        if (!viewerPrefsStorageKey) return;
        try {
            const raw = localStorage.getItem(viewerPrefsStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Partial<ViewerPrefs>;
            if (typeof parsed.scale === "number" && Number.isFinite(parsed.scale)) {
                setScale(Math.min(5, Math.max(0.5, parsed.scale)));
            }
            if (parsed.fitMode === "custom" || parsed.fitMode === "width") {
                setFitMode(parsed.fitMode);
            }
            if (typeof parsed.rotation === "number" && Number.isFinite(parsed.rotation)) {
                const normalized = ((parsed.rotation % 360) + 360) % 360;
                setRotation(normalized);
            }
        } catch {
            // ignore malformed local data
        }
    }, [viewerPrefsStorageKey]);

    useEffect(() => {
        if (!viewerPrefsStorageKey) return;
        const payload: ViewerPrefs = { scale, fitMode, rotation };
        try {
            localStorage.setItem(viewerPrefsStorageKey, JSON.stringify(payload));
        } catch {
            // ignore storage issues
        }
    }, [viewerPrefsStorageKey, scale, fitMode, rotation]);

    useEffect(() => {
        if (!resourceId) {
            setAnnotations({});
            return;
        }
        const fromSettings = settings.pdfAnnotationsByResourceId?.[resourceId];
        if (fromSettings && Object.keys(fromSettings).length > 0) {
            setAnnotations(fromSettings as AnnotationByPage);
            // Keep a local mirror for compatibility with existing offline behavior.
            persistAnnotationsLocalMirror(annotationStorageKey, fromSettings as AnnotationByPage);
            return;
        }
        if (!annotationStorageKey) {
            setAnnotations({});
            return;
        }
        try {
            const raw = localStorage.getItem(annotationStorageKey);
            if (!raw) {
                setAnnotations({});
                return;
            }
            const parsed = JSON.parse(raw) as Record<string, AnnotationStroke[]>;
            const normalized: AnnotationByPage = {};
            Object.entries(parsed).forEach(([key, value]) => {
                const page = Number(key);
                if (Number.isFinite(page) && Array.isArray(value)) {
                    normalized[page] = value;
                }
            });
            setAnnotations(normalized);
            // One-time migration path from localStorage to settings-backed storage.
            setSettings((prev) => ({
                ...prev,
                pdfAnnotationsByResourceId: {
                    ...(prev.pdfAnnotationsByResourceId || {}),
                    [resourceId]: normalized,
                },
            }));
        } catch {
            setAnnotations({});
        }
    }, [resourceId, annotationStorageKey, setSettings]);

    useEffect(() => {
        if (!resourceId) return;
        setSettings((prev) => {
            const current = prev.pdfAnnotationsByResourceId?.[resourceId] || {};
            const currentSerialized = JSON.stringify(current);
            const nextSerialized = JSON.stringify(annotations);
            if (currentSerialized === nextSerialized) return prev;
            return {
                ...prev,
                pdfAnnotationsByResourceId: {
                    ...(prev.pdfAnnotationsByResourceId || {}),
                    [resourceId]: annotations,
                },
            };
        });
        persistAnnotationsLocalMirror(annotationStorageKey, annotations);
    }, [resourceId, annotationStorageKey, annotations, setSettings]);

    useEffect(() => {
        setPageInput(String(pageNumber));
    }, [pageNumber]);

    const handleResizeMouseDown = (mode: "x" | "y" | "xy") => (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setResizeMode(mode);
        resizeStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            width: pdfViewerState?.size?.width || 1024,
            height: pdfViewerState?.size?.height || settings.pdfViewerHeight || Math.max(520, Math.floor(window.innerHeight * 0.9)),
            mode,
        };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!resizeMode || !pdfViewerState) return;
        const dx = e.clientX - resizeStartRef.current.x;
        const dy = e.clientY - resizeStartRef.current.y;
        const next = {
            width: resizeStartRef.current.width,
            height: resizeStartRef.current.height,
        };
        if (resizeStartRef.current.mode === "x" || resizeStartRef.current.mode === "xy") {
            next.width = Math.max(500, resizeStartRef.current.width + dx);
        }
        if (resizeStartRef.current.mode === "y" || resizeStartRef.current.mode === "xy") {
            next.height = Math.max(360, resizeStartRef.current.height + dy);
        }
        setPdfViewerState(prev => prev ? { ...prev, size: { ...prev.size, ...next } } : null);
    }, [resizeMode, pdfViewerState, setPdfViewerState]);
    
    const handleMouseUp = useCallback(() => {
        if (resizeMode) {
            setResizeMode(null);
            if (pdfViewerState?.size?.width || pdfViewerState?.size?.height) {
              setSettings(prev => ({
                ...prev,
                pdfViewerWidth: pdfViewerState?.size?.width || prev.pdfViewerWidth,
                pdfViewerHeight: pdfViewerState?.size?.height || prev.pdfViewerHeight,
              }));
            }
        }
    }, [resizeMode, pdfViewerState?.size?.width, pdfViewerState?.size?.height, setSettings]);
    
    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", onFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const isTextInput =
                target?.tagName === "INPUT" ||
                target?.tagName === "TEXTAREA" ||
                target?.getAttribute("contenteditable") === "true";
            if (isTextInput) return;

            if (event.key === "ArrowRight") {
                setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p + 1));
            } else if (event.key === "ArrowLeft") {
                setPageNumber((p) => Math.max(1, p - 1));
            } else if (event.key === "=" || event.key === "+") {
                setScale((prev) => Math.min(prev + 0.2, 5));
                setFitMode("custom");
            } else if (event.key === "-" || event.key === "_") {
                setScale((prev) => Math.max(prev - 0.2, 0.5));
                setFitMode("custom");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [numPages]);

    const drawStrokesToCanvas = useCallback((previewStroke?: AnnotationStroke | null) => {
        const canvas = annotationCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const cssWidth = canvas.clientWidth;
        const cssHeight = canvas.clientHeight;
        const ratio = window.devicePixelRatio || 1;
        const targetWidth = Math.max(1, Math.floor(cssWidth * ratio));
        const targetHeight = Math.max(1, Math.floor(cssHeight * ratio));

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }

        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, cssWidth, cssHeight);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const pageStrokes = annotations[pageNumber] || [];
        const allStrokes = previewStroke ? [...pageStrokes, previewStroke] : pageStrokes;

        allStrokes.forEach((stroke) => {
            if (!stroke.points || stroke.points.length < 2) return;
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.beginPath();
            stroke.points.forEach((point, index) => {
                const x = point.x * cssWidth;
                const y = point.y * cssHeight;
                if (index === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        });
    }, [annotations, pageNumber]);

    const syncAnnotationCanvasSize = useCallback(() => {
        const canvas = annotationCanvasRef.current;
        const container = pageContainerRef.current;
        if (!canvas || !container) return;
        const pdfCanvas = container.querySelector("canvas.react-pdf__Page__canvas") as HTMLCanvasElement | null;
        const targetWidth = Math.max(1, pdfCanvas?.clientWidth || container.clientWidth);
        const targetHeight = Math.max(1, pdfCanvas?.clientHeight || container.clientHeight);
        canvas.style.left = `${pdfCanvas?.offsetLeft || 0}px`;
        canvas.style.top = `${pdfCanvas?.offsetTop || 0}px`;
        canvas.style.width = `${targetWidth}px`;
        canvas.style.height = `${targetHeight}px`;
        drawStrokesToCanvas(drawingStrokeRef.current);
    }, [drawStrokesToCanvas]);

    useEffect(() => {
        syncAnnotationCanvasSize();
    }, [syncAnnotationCanvasSize, pageNumber, fitMode, scale, rotation]);

    useEffect(() => {
        const container = fitContainerRef.current;
        if (!container) return;
        const updateWidth = () => {
            const rect = container.getBoundingClientRect();
            const horizontalInset = isReaderOnly ? 0 : 24;
            setPageRenderWidth(Math.max(240, Math.floor(rect.width - horizontalInset)));
            syncAnnotationCanvasSize();
        };
        updateWidth();
        const observer = new ResizeObserver(() => {
            updateWidth();
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [syncAnnotationCanvasSize, isReaderOnly]);

    useEffect(() => {
        if (fitMode !== "width") return;
        const container = fitContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const horizontalInset = isReaderOnly ? 0 : 24;
        setPageRenderWidth(Math.max(240, Math.floor(rect.width - horizontalInset)));
    }, [fitMode, pdfViewerState?.size?.width, isFullscreen, isReaderOnly]);

    const handlePageJump = () => {
        if (!numPages) return;
        const parsed = Number(pageInput);
        if (!Number.isFinite(parsed)) {
            setPageInput(String(pageNumber));
            return;
        }
        const next = Math.min(numPages, Math.max(1, Math.floor(parsed)));
        setPageNumber(next);
        setPageInput(String(next));
    };

    const handleToggleFullscreen = async () => {
        if (!popupRef.current) return;
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }
        await popupRef.current.requestFullscreen();
    };

    const handleDownload = () => {
        if (!file || !pdfViewerState?.resource) return;
        const url = URL.createObjectURL(file);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${pdfViewerState.resource.name || "document"}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const getNormalizedPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = annotationCanvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;
        return {
            x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
            y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
        };
    };

    const handleCanvasPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isAnnotating) return;
        if (event.button !== 0) return;
        event.preventDefault();
        const point = getNormalizedPoint(event);
        if (!point) return;
        drawingStrokeRef.current = { color: penColor, size: penSize, points: [point] };
        event.currentTarget.setPointerCapture(event.pointerId);
        drawStrokesToCanvas(drawingStrokeRef.current);
    };

    const handleCanvasPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isAnnotating) return;
        const stroke = drawingStrokeRef.current;
        if (!stroke) return;
        const point = getNormalizedPoint(event);
        if (!point) return;
        stroke.points.push(point);
        drawStrokesToCanvas(stroke);
    };

    const handleCanvasPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isAnnotating) return;
        const stroke = drawingStrokeRef.current;
        if (!stroke) return;
        try {
            event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
            // ignore if pointer capture already released
        }
        drawingStrokeRef.current = null;
        if (stroke.points.length < 2) {
            drawStrokesToCanvas(null);
            return;
        }
        setAnnotations((prev) => {
            const next: AnnotationByPage = {
                ...prev,
                [pageNumber]: [...(prev[pageNumber] || []), stroke],
            };
            persistAnnotationsLocalMirror(annotationStorageKey, next);
            return next;
        });
    };

    const handleUndoAnnotation = () => {
        setAnnotations((prev) => {
            const pageStrokes = prev[pageNumber] || [];
            if (pageStrokes.length === 0) return prev;
            const next: AnnotationByPage = {
                ...prev,
                [pageNumber]: pageStrokes.slice(0, -1),
            };
            persistAnnotationsLocalMirror(annotationStorageKey, next);
            return next;
        });
    };

    const handleClearAnnotations = () => {
        setAnnotations((prev) => {
            const next: AnnotationByPage = {
                ...prev,
                [pageNumber]: [],
            };
            persistAnnotationsLocalMirror(annotationStorageKey, next);
            return next;
        });
    };

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const resource = pdfViewerState?.resource;
        if (!file || !resource) return;

        try {
            await storePdf(resource.id, file);
            if (currentUser?.username) {
                await uploadPdfToSupabase(currentUser.username, resource.id, file, {
                    url: settings.supabaseUrl,
                    anonKey: settings.supabaseAnonKey,
                    bucket: settings.supabasePdfBucket,
                });
            }
            setResources(prev => prev.map(r => 
                r.id === resource.id ? { ...r, hasLocalPdf: true, pdfFileName: file.name } : r
            ));
            // Trigger a re-render/reload in the popup
            setPdfViewerState(prev => prev ? { ...prev, resource: { ...resource, hasLocalPdf: true, pdfFileName: file.name } } : null);
        } catch (error) {
            console.error("Failed to store PDF:", error);
        }
    };


    if (!pdfViewerState || !pdfViewerState.isOpen) return null;
    
    const style: React.CSSProperties = {
        position: "fixed",
        top: pdfViewerState.position.y,
        left: pdfViewerState.position.x,
        width: `${pdfViewerState.size?.width || 1024}px`,
        height: `${pdfViewerState.size?.height || settings.pdfViewerHeight || Math.max(520, Math.floor(window.innerHeight * 0.9))}px`,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        willChange: "transform",
        zIndex: 180,
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setPageNumber((prev) => Math.min(Math.max(1, prev), numPages));
    }
    
    function zoomIn() {
        setFitMode("custom");
        setScale(prev => Math.min(prev + 0.2, 5));
    }

    function zoomOut() {
        setFitMode("custom");
        setScale(prev => Math.max(prev - 0.2, 0.5));
    }
    
    const resource = pdfViewerState.resource;
    const hasPageAnnotations = (annotations[pageNumber] || []).length > 0;
    const canGoPrev = pageNumber > 1;
    const canGoNext = !!numPages && pageNumber < numPages;

    return (
        <div ref={setNodeRef} style={style}>
            <input type="file" ref={pdfUploadInputRef} onChange={handlePdfUpload} accept=".pdf" className="hidden" />
            <Card ref={popupRef} className="h-full w-full shadow-2xl border-2 border-primary/30 flex flex-col relative overflow-hidden">
                {!isReaderOnly && (
                <CardHeader 
                    className="px-2 py-1.5 border-b flex flex-col gap-1.5"
                >
                    <div className="flex items-center justify-between gap-2">
                        <div 
                            className="flex items-center gap-2 cursor-grab active:cursor-grabbing flex-grow min-w-0"
                            {...attributes}
                            {...listeners}
                        >
                           <GripVertical className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
                           <CardTitle className="text-base truncate" title={resource?.name}>{resource?.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} title="Download PDF">
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPdfViewerState(prev => (prev ? {...prev, isOpen: false} : null))}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={!canGoPrev}>Prev</Button>
                            <div className="flex items-center gap-1 rounded-md border px-1.5 h-9">
                                <input
                                    value={pageInput}
                                    onChange={(e) => setPageInput(e.target.value)}
                                    onBlur={handlePageJump}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handlePageJump();
                                    }}
                                    className="w-14 bg-transparent text-center text-sm outline-none"
                                />
                                <span className="text-xs text-muted-foreground">/ {numPages ?? "-"}</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setPageNumber(p => (numPages ? Math.min(numPages, p + 1) : p + 1))} disabled={!canGoNext}>Next</Button>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomOut}><ZoomOut className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => setFitMode(fitMode === "width" ? "custom" : "width")}>
                                {fitMode === "width" ? "Fit: On" : "Fit: Off"}
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomIn}><ZoomIn className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setRotation((r) => (r + 90) % 360)} title="Rotate">
                                <RotateCw className="h-4 w-4" />
                            </Button>
                            <div className="text-xs text-muted-foreground px-1.5">
                                {fitMode === "custom" ? `${Math.round(scale * 100)}%` : "Fit Width"}
                            </div>
                        </div>
                        <div className="flex items-center gap-1 rounded-md border px-1 py-1">
                            <Button
                                variant={isAnnotating ? "default" : "ghost"}
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setIsAnnotating((prev) => !prev)}
                                title="Toggle draw mode"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <input
                                type="color"
                                value={penColor}
                                onChange={(e) => setPenColor(e.target.value)}
                                className={cn("h-7 w-7 rounded border bg-transparent p-0.5", !isAnnotating && "opacity-50")}
                                disabled={!isAnnotating}
                                title="Pen color"
                            />
                            <input
                                type="range"
                                min={1}
                                max={8}
                                step={1}
                                value={penSize}
                                onChange={(e) => setPenSize(Number(e.target.value))}
                                disabled={!isAnnotating}
                                className={cn("w-20", !isAnnotating && "opacity-50")}
                                title="Pen size"
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleUndoAnnotation} disabled={!hasPageAnnotations} title="Undo stroke">
                                <Undo2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClearAnnotations} disabled={!hasPageAnnotations} title="Clear page drawings">
                                <Eraser className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                )}
                <CardContent className="p-0 flex-grow min-h-0">
                    <ScrollArea className="h-full">
                       {isLoading ? (
                           <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                               <Loader2 className="h-8 w-8 animate-spin mb-4" />
                               <p>Loading PDF...</p>
                           </div>
                       ) : file ? (
                           <div
                               ref={fitContainerRef}
                               className={cn(
                                   "w-full flex justify-center",
                                   isReaderOnly ? "px-0 py-0" : "px-3 py-4"
                               )}
                           >
                               <div
                                   ref={pageContainerRef}
                                   className={cn(
                                       "relative",
                                       isAnnotating && "[&_.react-pdf__Page__textContent]:pointer-events-none [&_.react-pdf__Page__annotations]:pointer-events-none"
                                   )}
                               >
                                   <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
                                       <Page
                                           pageNumber={pageNumber}
                                           scale={fitMode === "custom" ? scale : undefined}
                                           width={fitMode === "width" ? pageRenderWidth : undefined}
                                           rotate={rotation}
                                           onRenderSuccess={syncAnnotationCanvasSize}
                                       />
                                   </Document>
                                   <canvas
                                       ref={annotationCanvasRef}
                                       onPointerDown={handleCanvasPointerDown}
                                       onPointerMove={handleCanvasPointerMove}
                                       onPointerUp={handleCanvasPointerUp}
                                       onPointerCancel={handleCanvasPointerUp}
                                       onPointerLeave={handleCanvasPointerUp}
                                       className={cn(
                                           "absolute z-20",
                                           isAnnotating ? "cursor-crosshair pointer-events-auto touch-none" : "pointer-events-none"
                                       )}
                                   />
                               </div>
                           </div>
                       ) : (
                           <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                               <p className="mb-4">No PDF attached to this resource.</p>
                               <Button onClick={() => pdfUploadInputRef.current?.click()}>
                                   <Upload className="mr-2 h-4 w-4"/> Upload PDF
                               </Button>
                           </div>
                       )}
                    </ScrollArea>
                </CardContent>
                <Button
                    variant={isReaderOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsReaderOnly((prev) => !prev)}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 shadow-lg"
                    title={isReaderOnly ? "Exit page-only mode" : "Show page only"}
                >
                    {isReaderOnly ? "Show Tools" : "Page Only"}
                </Button>
                 <div
                    onMouseDown={handleResizeMouseDown("x")}
                    className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-10"
                />
                 <div
                    onMouseDown={handleResizeMouseDown("y")}
                    className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize z-10"
                />
                 <div
                    onMouseDown={handleResizeMouseDown("xy")}
                    className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize z-20 bg-primary/30 border-t border-l border-white/20"
                />
            </Card>
        </div>
    );
}
