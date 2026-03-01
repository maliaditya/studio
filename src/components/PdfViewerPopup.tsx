
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
  Sparkles,
  Send,
} from "lucide-react";
import { getPdfForResource, storePdf } from "@/lib/audioDB";
import { downloadPdfFromSupabase, uploadPdfToSupabase } from "@/lib/supabasePdfStorage";
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useDraggable } from '@dnd-kit/core';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { addDays, addMonths, differenceInDays, differenceInMonths, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import { getAiConfigFromSettings, normalizeAiSettings } from "@/lib/ai/config";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

type AnnotationPoint = { x: number; y: number };
type AnnotationStroke = { color: string; size: number; points: AnnotationPoint[] };
type AnnotationByPage = Record<number, AnnotationStroke[]>;
type ViewerPrefs = { scale: number; fitMode: "custom" | "width"; rotation: number };
type ChatMessage = { role: "user" | "assistant"; content: string };

const persistAnnotationsLocalMirror = (key: string | null, data: AnnotationByPage) => {
    if (!key) return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch {
        // ignore storage issues
    }
};

export default function PdfViewerPopup() {
    const { pdfViewerState, setPdfViewerState, settings, setSettings, setResources, currentUser, offerizationPlans, coreSkills } = useAuth();
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
    const [selectedText, setSelectedText] = useState("");
    const [isExplaining, setIsExplaining] = useState(false);
    const [explainError, setExplainError] = useState("");
    const [showExplainPanel, setShowExplainPanel] = useState(false);
    const [activeExplainText, setActiveExplainText] = useState("");
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [showTargetCelebration, setShowTargetCelebration] = useState(false);
    const [celebratedKey, setCelebratedKey] = useState<string | null>(null);
    const isDesktopRuntime =
        typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop);
    const isAiEnabled = normalizeAiSettings(settings.ai, isDesktopRuntime).provider !== "none";

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
                        serviceRoleKey:
                            typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop)
                                ? settings.supabaseServiceRoleKey
                                : undefined,
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
        settings.supabaseServiceRoleKey,
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

    useEffect(() => {
        const activeResourceId = pdfViewerState?.resource?.id;
        if (!activeResourceId || pageNumber <= 0) return;
        const todayKey = new Date().toISOString().slice(0, 10);
        setSettings((prev) => {
            const statsMap = prev.pdfDailyPageStatsByResourceId || {};
            const existing = statsMap[activeResourceId];

            if (!existing || existing.date !== todayKey) {
                return {
                    ...prev,
                    pdfDailyPageStatsByResourceId: {
                        ...statsMap,
                        [activeResourceId]: { date: todayKey, startPage: pageNumber, maxPage: pageNumber },
                    },
                };
            }

            const nextMaxPage = Math.max(existing.maxPage || existing.startPage || 1, pageNumber);
            if (nextMaxPage === existing.maxPage) return prev;

            return {
                ...prev,
                pdfDailyPageStatsByResourceId: {
                    ...statsMap,
                    [activeResourceId]: { ...existing, maxPage: nextMaxPage },
                },
            };
        });
    }, [pdfViewerState?.resource?.id, pageNumber, setSettings]);

    const resourceId = pdfViewerState?.resource?.id || null;
    const learningPageMetrics = useMemo(() => {
        if (!resourceId) {
            return {
                isLinkedToLearningPlan: false,
                targetPagesToday: 0,
                completedPagesBaseline: 0,
            };
        }
        const normalizeDateKey = (value?: string | null) => {
            if (!value) return null;
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) return null;
            return parsed.toISOString().slice(0, 10);
        };
        const normalizeText = (value?: string) => (value || "").trim().toLowerCase().replace(/\s+/g, " ");
        const stripInstanceDateSuffix = (id?: string | null) => (id || "").replace(/_(\d{4}-\d{2}-\d{2})$/, "");
        const today = startOfDay(new Date());

        const countRemainingScheduledSessions = (routine: any, endDateKey: string | null) => {
            if (!routine || !endDateKey) return null;
            const endDate = startOfDay(parseISO(endDateKey));
            if (Number.isNaN(endDate.getTime())) return null;
            if (isBefore(endDate, today)) return 0;

            const rule = routine.routine || null;
            const recurrence = rule?.type || "none";
            const repeatInterval = Math.max(1, rule?.repeatInterval || rule?.days || 1);
            const repeatUnit = rule?.repeatUnit || (recurrence === "weekly" ? "week" : "day");
            const startDateKey = normalizeDateKey(routine.baseDate || routine.startDate || routine.createdAt || null);

            if (recurrence === "none") {
                if (!startDateKey) return null;
                const oneTimeDate = startOfDay(parseISO(startDateKey));
                if (Number.isNaN(oneTimeDate.getTime())) return null;
                return !isBefore(oneTimeDate, today) && !isAfter(oneTimeDate, endDate) ? 1 : 0;
            }

            if (!startDateKey) return null;
            let cursor = startOfDay(parseISO(startDateKey));
            if (Number.isNaN(cursor.getTime())) return null;

            if (repeatUnit === "month") {
                if (isBefore(cursor, today)) {
                    const diffMonths = Math.max(0, differenceInMonths(today, cursor));
                    const jumpCount = Math.floor(diffMonths / repeatInterval);
                    cursor = addMonths(cursor, jumpCount * repeatInterval);
                    while (isBefore(cursor, today)) cursor = addMonths(cursor, repeatInterval);
                }
                let count = 0;
                while (!isAfter(cursor, endDate)) {
                    if (!isBefore(cursor, today)) count += 1;
                    cursor = addMonths(cursor, repeatInterval);
                }
                return count;
            }

            const stepDays = repeatUnit === "week" ? repeatInterval * 7 : repeatInterval;
            if (isBefore(cursor, today)) {
                const diffDays = Math.max(0, differenceInDays(today, cursor));
                const jumpCount = Math.ceil(diffDays / stepDays);
                cursor = addDays(cursor, jumpCount * stepDays);
            }
            let count = 0;
            while (!isAfter(cursor, endDate)) {
                if (!isBefore(cursor, today)) count += 1;
                cursor = addDays(cursor, stepDays);
            }
            return count;
        };

        let isLinkedToLearningPlan = false;
        let bestTarget = 0;
        let bestCompletedPages = 0;
        for (const spec of (coreSkills || []).filter((skill) => skill.type === "Specialization")) {
            const learningPlan = offerizationPlans?.[spec.id]?.learningPlan;
            if (!learningPlan) continue;
            const linkedByBook = (learningPlan.bookWebpageResources || []).some((book) => book.linkedPdfResourceId === resourceId);
            const linkedByPath = (learningPlan.skillTreePaths || []).some((path) => path.linkedPdfResourceId === resourceId);
            if (!linkedByBook && !linkedByPath) continue;
            isLinkedToLearningPlan = true;

            const bookResources = learningPlan.bookWebpageResources || [];
            if (bookResources.length === 0) continue;
            const totalPages = bookResources.reduce((sum, resource) => sum + (resource.totalPages || 0), 0);
            const completedPages = spec.skillAreas.reduce(
                (sum, area) => sum + area.microSkills.reduce((inner, micro) => inner + (micro.completedPages || 0), 0),
                0
            );
            const remainingPages = Math.max(0, totalPages - completedPages);
            if (remainingPages <= 0) continue;

            const latestBookEndDate = bookResources
                .map((resource) => normalizeDateKey(resource.completionDate))
                .filter((date): date is string => !!date)
                .reduce<string | null>((latest, date) => (!latest || date > latest ? date : latest), null);
            if (!latestBookEndDate) continue;

            const matchingRoutine = (settings.routines || []).find((routine) => {
                if (routine.type !== "upskill") return false;
                if (stripInstanceDateSuffix(routine.id) === stripInstanceDateSuffix(spec.id)) return true;
                return normalizeText(routine.details) === normalizeText(spec.name);
            });
            const sessionsRemaining = countRemainingScheduledSessions(matchingRoutine, latestBookEndDate);
            const daysLeft = Math.max(0, differenceInDays(parseISO(latestBookEndDate), today));
            const pageTarget =
                sessionsRemaining != null
                    ? (sessionsRemaining > 0
                        ? Math.max(1, Math.ceil(remainingPages / sessionsRemaining))
                        : remainingPages)
                    : Math.max(1, Math.ceil(remainingPages / Math.max(1, daysLeft || 1)));
            if (pageTarget >= bestTarget) {
                bestTarget = pageTarget;
                bestCompletedPages = completedPages;
            }
        }
        return {
            isLinkedToLearningPlan,
            targetPagesToday: bestTarget,
            completedPagesBaseline: bestCompletedPages,
        };
    }, [resourceId, coreSkills, offerizationPlans, settings.routines]);
    const showLearningTargetUi = learningPageMetrics.isLinkedToLearningPlan;
    const pagesCompletedToday = Math.max(0, pageNumber - learningPageMetrics.completedPagesBaseline);
    const targetPagesToday = showLearningTargetUi
        ? (learningPageMetrics.targetPagesToday > 0
        ? learningPageMetrics.targetPagesToday
        : resourceId
            ? Math.max(0, settings.pdfDailyPageTargetByResourceId?.[resourceId] || 0)
            : 0)
        : 0;
    const floatingCount = showLearningTargetUi ? targetPagesToday - pagesCompletedToday : 0;
    const celebrationKey = showLearningTargetUi && resourceId ? `${resourceId}:${new Date().toISOString().slice(0, 10)}` : null;

    useEffect(() => {
        if (!showLearningTargetUi) {
            setShowTargetCelebration(false);
            return;
        }
        if (!celebrationKey) return;
        if (floatingCount !== -1) return;
        if (celebratedKey === celebrationKey) return;
        setCelebratedKey(celebrationKey);
        setShowTargetCelebration(true);
        const timer = window.setTimeout(() => setShowTargetCelebration(false), 2600);
        return () => window.clearTimeout(timer);
    }, [showLearningTargetUi, floatingCount, celebrationKey, celebratedKey]);
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
                    serviceRoleKey:
                        typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop)
                            ? settings.supabaseServiceRoleKey
                            : undefined,
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

    const captureSelectedText = useCallback(() => {
        if (!popupRef.current) return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            setSelectedText("");
            return;
        }
        const anchorNode = selection.anchorNode;
        const focusNode = selection.focusNode;
        const isInsidePopup =
            (!!anchorNode && popupRef.current.contains(anchorNode)) ||
            (!!focusNode && popupRef.current.contains(focusNode));
        if (!isInsidePopup) {
            setSelectedText("");
            return;
        }
        const text = selection.toString().replace(/\s+/g, " ").trim();
        setSelectedText(text);
    }, []);

    useEffect(() => {
        window.addEventListener("mouseup", captureSelectedText);
        window.addEventListener("keyup", captureSelectedText);
        return () => {
            window.removeEventListener("mouseup", captureSelectedText);
            window.removeEventListener("keyup", captureSelectedText);
        };
    }, [captureSelectedText]);

    const handleExplainSelection = async () => {
        const text = selectedText.trim();
        if (!text || isExplaining) return;
        setActiveExplainText(text);
        setIsExplaining(true);
        setExplainError("");
        setShowExplainPanel(true);
        try {
            const response = await fetch("/api/ai/explain", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(isDesktopRuntime ? { "x-studio-desktop": "1" } : {}),
                },
                body: JSON.stringify({
                    text,
                    context: `PDF: ${resource?.name || "Untitled"}`,
                    aiConfig: getAiConfigFromSettings(settings, isDesktopRuntime),
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.details || result?.error || "Failed to explain selection.");
            }
            const explanation = String(result?.explanation || "");
            setChatMessages([{ role: "assistant", content: explanation }]);
        } catch (error) {
            setChatMessages([]);
            setExplainError(error instanceof Error ? error.message : "Failed to explain selection.");
        } finally {
            setIsExplaining(false);
        }
    };

    const handleAskFollowup = async () => {
        const question = chatInput.trim();
        const text = (activeExplainText || selectedText).trim();
        if (!question || !text || isExplaining) return;
        const nextHistory = [...chatMessages, { role: "user" as const, content: question }];
        setChatMessages(nextHistory);
        setChatInput("");
        setIsExplaining(true);
        setExplainError("");
        try {
            const response = await fetch("/api/ai/explain", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(isDesktopRuntime ? { "x-studio-desktop": "1" } : {}),
                },
                body: JSON.stringify({
                    text,
                    context: `PDF: ${resource?.name || "Untitled"}`,
                    question,
                    history: nextHistory.slice(-8),
                    aiConfig: getAiConfigFromSettings(settings, isDesktopRuntime),
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.details || result?.error || "Failed to answer follow-up.");
            }
            const answer = String(result?.explanation || "");
            setChatMessages((prev) => [...prev, { role: "assistant", content: answer }]);
        } catch (error) {
            setExplainError(error instanceof Error ? error.message : "Failed to answer follow-up.");
        } finally {
            setIsExplaining(false);
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
    const hasSelectedText = selectedText.length > 0;
    const hasExplainableSelection = hasSelectedText && isAiEnabled;
    const explainContextText = activeExplainText || selectedText;

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
                        {showLearningTargetUi && (
                            <div className="flex items-center gap-2 rounded-md border px-2 py-1">
                                <div className="text-xs">
                                    Today: <span className="font-semibold">{pagesCompletedToday}</span> / <span className="font-semibold">{targetPagesToday}</span> pages
                                </div>
                            </div>
                        )}
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
                {showExplainPanel && isAiEnabled && (
                    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col text-zinc-100">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
                            <div className="text-base font-semibold flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                AI Explanation
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setShowExplainPanel(false)}
                                title="Close explanation overlay"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="px-4 py-2 text-xs text-zinc-300 border-b border-zinc-800 bg-zinc-900 truncate">
                            Selected: {explainContextText ? explainContextText : "No active selection."}
                        </div>
                        <div className="flex-1 min-h-0 px-4 py-3">
                            <ScrollArea className="h-full pr-3">
                                <div className="space-y-3">
                                    {chatMessages.map((message, idx) => (
                                        <div key={`${message.role}-${idx}`} className={cn("rounded-md border p-3", message.role === "user" ? "bg-zinc-800 border-zinc-700" : "bg-zinc-900 border-zinc-800")}>
                                            <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-400">
                                                {message.role === "user" ? "You" : "AI"}
                                            </div>
                                            <div className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-100 [&_hr]:my-3 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-zinc-700/90 [&_strong]:font-bold">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    ))}
                                    {isExplaining && (
                                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Thinking...
                                        </div>
                                    )}
                                    {!isExplaining && explainError && (
                                        <div className="text-destructive text-sm">{explainError}</div>
                                    )}
                                    {!isExplaining && !explainError && chatMessages.length === 0 && (
                                        <div className="text-zinc-400 text-sm">Select text and tap Explain.</div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                        <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-900">
                            <div className="flex items-center gap-2">
                                <input
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            void handleAskFollowup();
                                        }
                                    }}
                                    placeholder="Ask follow-up question about selected text..."
                                    className="flex-1 h-10 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                                    disabled={!explainContextText || isExplaining}
                                />
                                <Button
                                    onClick={() => void handleAskFollowup()}
                                    disabled={!explainContextText || !chatInput.trim() || isExplaining}
                                    className="h-10"
                                >
                                    <Send className="h-4 w-4 mr-1.5" />
                                    Ask
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
                {showLearningTargetUi && showTargetCelebration && (
                    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
                        <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[2px]" />
                        {Array.from({ length: 20 }).map((_, i) => (
                            <span
                                key={`pdf-celebrate-${i}`}
                                className="pdf-celebrate-piece"
                                style={
                                    {
                                        left: `${5 + ((i * 7) % 88)}%`,
                                        animationDelay: `${(i % 8) * 0.07}s`,
                                        ["--piece-rotate" as any]: `${(i % 2 === 0 ? 1 : -1) * (8 + (i % 5) * 6)}deg`,
                                    } as React.CSSProperties
                                }
                            />
                        ))}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="rounded-xl border border-emerald-300/40 bg-emerald-950/85 px-5 py-3 text-emerald-100 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                                <div className="text-sm font-semibold flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-emerald-300" />
                                    Today&apos;s target completed
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <Button
                    variant={hasExplainableSelection ? "default" : isReaderOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                        if (hasExplainableSelection) {
                            void handleExplainSelection();
                            return;
                        }
                        setIsReaderOnly((prev) => !prev);
                    }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 shadow-lg"
                    title={hasExplainableSelection ? "Explain selected text" : isReaderOnly ? "Exit page-only mode" : "Show page only"}
                >
                    {hasExplainableSelection ? (
                        <>
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            Explain
                        </>
                    ) : isReaderOnly ? "Show Tools" : "Page Only"}
                </Button>
                {showLearningTargetUi && (
                    <div
                        className="absolute bottom-4 right-4 z-30 h-8 min-w-8 rounded-md border border-border/70 bg-background/90 px-2 text-sm font-semibold flex items-center justify-center shadow-lg"
                        title="Today's completion - target"
                    >
                        {floatingCount}
                    </div>
                )}
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
                <style jsx>{`
                    .pdf-celebrate-piece {
                        position: absolute;
                        top: -10%;
                        width: 8px;
                        height: 14px;
                        border-radius: 2px;
                        background: linear-gradient(180deg, #86efac, #34d399);
                        opacity: 0.95;
                        animation: pdf-confetti-fall 1.35s ease-in forwards;
                    }
                    @keyframes pdf-confetti-fall {
                        0% {
                            transform: translateY(0) rotate(0deg);
                            opacity: 0;
                        }
                        12% {
                            opacity: 1;
                        }
                        100% {
                            transform: translateY(120vh) rotate(var(--piece-rotate, 12deg));
                            opacity: 0;
                        }
                    }
                `}</style>
            </Card>
        </div>
    );
}
