
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
  Volume2,
  VolumeX,
  Highlighter,
  Pause,
  Play,
} from "lucide-react";
import { getPdfForResource, storePdf } from "@/lib/audioDB";
import { downloadPdfFromSupabase, uploadPdfToSupabase } from "@/lib/supabasePdfStorage";
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useDraggable } from '@dnd-kit/core';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { addDays, addMonths, differenceInDays, differenceInMonths, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import { getAiConfigFromSettings, normalizeAiSettings } from "@/lib/ai/config";
import { cleanSpeechText, getKokoroLocalVoices, getOpenAiCloudVoices, loadSpeechPrefs, parseCloudVoiceURI, pickBestVoice, saveSpeechPrefs } from "@/lib/tts";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type AnnotationPoint = { x: number; y: number };
type AnnotationStroke = { kind?: "stroke"; color: string; size: number; points: AnnotationPoint[] };
type TextHighlightRect = { x: number; y: number; width: number; height: number };
type TextHighlight = { kind: "text-highlight"; color: string; opacity: number; rects: TextHighlightRect[] };
type PageAnnotation = AnnotationStroke | TextHighlight;
type AnnotationByPage = Record<number, PageAnnotation[]>;
type ViewerPrefs = { scale: number; fitMode: "custom" | "width"; rotation: number };
type ChatMessage = { role: "user" | "assistant"; content: string };
type LaserLine = { id: number; left: number; top: number; width: number };

const LASER_PROGRESS_SCALE = 1.0;
const LASER_PROGRESS_OFFSET = 0.008;
const CLOUD_TTS_MAX_CHARS = 600;
const CLOUD_TTS_FIRST_CHUNK_MAX_CHARS = 120;

const persistAnnotationsLocalMirror = (key: string | null, data: AnnotationByPage) => {
    if (!key) return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch {
        // ignore storage issues
    }
};

const isTextHighlight = (value: PageAnnotation): value is TextHighlight =>
    (value?.kind === "text-highlight" || (!("points" in (value as any)) && Array.isArray((value as any)?.rects))) &&
    Array.isArray((value as TextHighlight).rects);

const normalizeAnnotationMap = (input: unknown): AnnotationByPage => {
    const result: AnnotationByPage = {};
    if (!input || typeof input !== "object") return result;
    Object.entries(input as Record<string, unknown>).forEach(([pageKey, rawList]) => {
        const page = Number(pageKey);
        if (!Number.isFinite(page) || !Array.isArray(rawList)) return;
        const normalizedList: PageAnnotation[] = [];
        rawList.forEach((rawItem) => {
            if (!rawItem || typeof rawItem !== "object") return;
            const item = rawItem as any;
            if (Array.isArray(item.rects)) {
                const rects = item.rects
                    .map((rect: any) => ({
                        x: Number(rect?.x),
                        y: Number(rect?.y),
                        width: Number(rect?.width),
                        height: Number(rect?.height),
                    }))
                    .filter((rect: any) =>
                        Number.isFinite(rect.x) &&
                        Number.isFinite(rect.y) &&
                        Number.isFinite(rect.width) &&
                        Number.isFinite(rect.height) &&
                        rect.width > 0 &&
                        rect.height > 0
                    );
                if (rects.length === 0) return;
                normalizedList.push({
                    kind: "text-highlight",
                    color: typeof item.color === "string" ? item.color : "#fde047",
                    opacity: Number.isFinite(Number(item.opacity)) ? Math.max(0.1, Math.min(0.9, Number(item.opacity))) : 0.35,
                    rects,
                });
                return;
            }
            if (Array.isArray(item.points)) {
                const points = item.points
                    .map((point: any) => ({ x: Number(point?.x), y: Number(point?.y) }))
                    .filter((point: any) => Number.isFinite(point.x) && Number.isFinite(point.y));
                if (points.length < 2) return;
                normalizedList.push({
                    kind: "stroke",
                    color: typeof item.color === "string" ? item.color : "#22c55e",
                    size: Number.isFinite(Number(item.size)) ? Math.max(1, Math.min(12, Number(item.size))) : 2,
                    points,
                });
            }
        });
        result[page] = normalizedList;
    });
    return result;
};

const splitTextForCloudTts = (
    rawText: string,
    maxChars = CLOUD_TTS_MAX_CHARS,
    firstChunkMaxChars = CLOUD_TTS_FIRST_CHUNK_MAX_CHARS
): string[] => {
    const text = cleanSpeechText(rawText);
    if (!text) return [];
    if (text.length <= Math.max(firstChunkMaxChars, maxChars)) return [text];

    const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length === 0) {
        const first = text.slice(0, firstChunkMaxChars).trim();
        const rest = text.slice(firstChunkMaxChars).trim();
        return [first, ...splitTextForCloudTts(rest, maxChars, firstChunkMaxChars)].filter(Boolean);
    }

    const chunks: string[] = [];
    let current = "";
    let isFirstChunk = true;
    const pushCurrent = () => {
        const normalized = cleanSpeechText(current);
        if (normalized) chunks.push(normalized);
        current = "";
        isFirstChunk = false;
    };

    for (const sentence of sentences) {
        const limit = isFirstChunk ? Math.max(80, firstChunkMaxChars) : maxChars;
        const candidate = current ? `${current} ${sentence}` : sentence;
        if (candidate.length <= limit) {
            current = candidate;
            continue;
        }
        if (current) pushCurrent();
        const nextLimit = isFirstChunk ? Math.max(80, firstChunkMaxChars) : maxChars;
        if (sentence.length <= nextLimit) {
            current = sentence;
            continue;
        }
        let remaining = sentence;
        while (remaining.length > (isFirstChunk ? Math.max(80, firstChunkMaxChars) : maxChars)) {
            const currentLimit = isFirstChunk ? Math.max(80, firstChunkMaxChars) : maxChars;
            const slice = remaining.slice(0, currentLimit);
            chunks.push(cleanSpeechText(slice));
            remaining = remaining.slice(currentLimit).trim();
            isFirstChunk = false;
        }
        current = remaining;
    }
    if (current) pushCurrent();

    return chunks.filter(Boolean);
};

const buildFallbackLaserRects = (container: HTMLElement | null): TextHighlightRect[] => {
    if (!container) return [];
    const pageRoot = (container.querySelector(".react-pdf__Page") as HTMLElement | null) || container;
    const pageRect = pageRoot.getBoundingClientRect();
    if (pageRect.width <= 0 || pageRect.height <= 0) return [];
    const lineCount = 16;
    const topPad = 0.12;
    const bottomPad = 0.08;
    const usableHeight = Math.max(0.2, 1 - topPad - bottomPad);
    const lineHeight = usableHeight / lineCount;
    const leftPad = 0.07;
    const rightPad = 0.07;
    const width = Math.max(0.2, 1 - leftPad - rightPad);
    return Array.from({ length: lineCount }, (_, idx) => ({
        x: leftPad,
        y: topPad + (idx * lineHeight),
        width,
        height: Math.max(0.008, lineHeight * 0.5),
    }));
};

export default function PdfViewerPopup() {
    const { pdfViewerState, setPdfViewerState, settings, setSettings, setResources, currentUser, offerizationPlans, coreSkills } = useAuth();
    const { toast } = useToast();
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [file, setFile] = useState<Blob | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [scale, setScale] = useState(1.5);
    const [fitMode, setFitMode] = useState<"custom" | "width">("width");
    const [rotation, setRotation] = useState(0);
    const [pageInput, setPageInput] = useState("1");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isReaderOnly, setIsReaderOnly] = useState(true);
    const [isAnnotating, setIsAnnotating] = useState(false);
    const [isTextHighlighting, setIsTextHighlighting] = useState(false);
    const [penColor, setPenColor] = useState("#22c55e");
    const [penSize, setPenSize] = useState(2);
    const [annotations, setAnnotations] = useState<AnnotationByPage>({});
    const [pageRenderWidth, setPageRenderWidth] = useState<number | undefined>(undefined);
    const [selectedText, setSelectedText] = useState("");
    const [selectedTextRects, setSelectedTextRects] = useState<TextHighlightRect[]>([]);
    const [isExplaining, setIsExplaining] = useState(false);
    const [explainError, setExplainError] = useState("");
    const [showExplainPanel, setShowExplainPanel] = useState(false);
    const [activeExplainText, setActiveExplainText] = useState("");
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSpeechPaused, setIsSpeechPaused] = useState(false);
    const [isStartingKokoro, setIsStartingKokoro] = useState(false);
    const [isKokoroHealthy, setIsKokoroHealthy] = useState(false);
    const [kokoroMode, setKokoroMode] = useState<"cpu" | "gpu" | "custom" | "existing" | null>(null);
    const [activeSpeechKey, setActiveSpeechKey] = useState<string | null>(null);
    const [ttsVoiceURI, setTtsVoiceURI] = useState<string | undefined>(undefined);
    const [ttsRate, setTtsRate] = useState(0.96);
    const [showTargetCelebration, setShowTargetCelebration] = useState(false);
    const [celebratedKey, setCelebratedKey] = useState<string | null>(null);
    const [laserCurrentLine, setLaserCurrentLine] = useState<LaserLine | null>(null);
    const [laserTrailLines, setLaserTrailLines] = useState<LaserLine[]>([]);
    const [laserCurrentLineProgress, setLaserCurrentLineProgress] = useState(1);
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
    const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const speechAudioRef = useRef<HTMLAudioElement | null>(null);
    const speechAudioUrlRef = useRef<string | null>(null);
    const speechSessionIdRef = useRef(0);
    const laserAdvanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const laserTrailTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const laserLinesRef = useRef<LaserLine[]>([]);
    const laserLineWeightsRef = useRef<number[]>([]);
    const laserCurrentLineIndexRef = useRef(-1);
    const speechPausedRef = useRef(false);
    const kokoroWarmupStartedRef = useRef(false);
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
            setIsReaderOnly(true);
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
    const aiConfig = useMemo(
        () => getAiConfigFromSettings(settings, isDesktopRuntime),
        [settings, isDesktopRuntime]
    );
    const kokoroEnabled = useMemo(
        () =>
            isDesktopRuntime &&
            Boolean(settings.kokoroTtsBaseUrl?.trim()),
        [isDesktopRuntime, settings.kokoroTtsBaseUrl]
    );
    const cloudVoices = useMemo(
        () => [...getOpenAiCloudVoices(aiConfig), ...getKokoroLocalVoices(kokoroEnabled)],
        [aiConfig, kokoroEnabled]
    );
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
            if (!raw) {
                setFitMode("width");
                return;
            }
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
            const normalizedFromSettings = normalizeAnnotationMap(fromSettings);
            setAnnotations(normalizedFromSettings);
            // Keep a local mirror for compatibility with existing offline behavior.
            persistAnnotationsLocalMirror(annotationStorageKey, normalizedFromSettings);
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
            const parsed = JSON.parse(raw) as unknown;
            const normalized = normalizeAnnotationMap(parsed);
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
        setSelectedTextRects([]);
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

        const pageAnnotations = annotations[pageNumber] || [];
        const allAnnotations: PageAnnotation[] = previewStroke ? [...pageAnnotations, previewStroke] : pageAnnotations;

        allAnnotations.forEach((annotation) => {
            if (isTextHighlight(annotation)) {
                ctx.fillStyle = annotation.color;
                ctx.globalAlpha = annotation.opacity;
                annotation.rects.forEach((rect) => {
                    const x = rect.x * cssWidth;
                    const y = rect.y * cssHeight;
                    const width = rect.width * cssWidth;
                    const height = rect.height * cssHeight;
                    if (width > 0 && height > 0) {
                        ctx.fillRect(x, y, width, height);
                    }
                });
                ctx.globalAlpha = 1;
                return;
            }

            if (!annotation.points || annotation.points.length < 2) return;
            ctx.strokeStyle = annotation.color;
            ctx.lineWidth = annotation.size;
            ctx.beginPath();
            annotation.points.forEach((point, index) => {
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

    const recomputeFitWidth = useCallback(() => {
        if (fitMode !== "width") return;
        const container = fitContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const horizontalInset = isReaderOnly ? 0 : 24;
        const width = Math.max(240, Math.floor(rect.width - horizontalInset));
        setPageRenderWidth(width);
        syncAnnotationCanvasSize();
    }, [fitMode, isReaderOnly, syncAnnotationCanvasSize]);

    useEffect(() => {
        const container = fitContainerRef.current;
        if (!container) return;
        recomputeFitWidth();
        const observer = new ResizeObserver(() => {
            recomputeFitWidth();
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [recomputeFitWidth]);

    useEffect(() => {
        recomputeFitWidth();
    }, [recomputeFitWidth, pdfViewerState?.size?.width, pdfViewerState?.size?.height, isFullscreen, isReaderOnly, file]);

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

    const getNormalizedRectsFromRange = useCallback((range: Range): TextHighlightRect[] => {
        const container = pageContainerRef.current;
        if (!container) return [];
        const textLayer = container.querySelector(".react-pdf__Page__textContent") as HTMLElement | null;
        if (!textLayer) return [];
        const layerRect = textLayer.getBoundingClientRect();
        if (layerRect.width <= 0 || layerRect.height <= 0) return [];

        return Array.from(range.getClientRects())
            .map((rect) => {
                const left = (rect.left - layerRect.left) / layerRect.width;
                const top = (rect.top - layerRect.top) / layerRect.height;
                const width = rect.width / layerRect.width;
                const height = rect.height / layerRect.height;
                return {
                    x: Math.max(0, Math.min(1, left)),
                    y: Math.max(0, Math.min(1, top)),
                    width: Math.max(0, Math.min(1, width)),
                    height: Math.max(0, Math.min(1, height)),
                };
            })
            .filter((rect) => rect.width > 0.002 && rect.height > 0.002);
    }, []);

    const stopLaserGuide = useCallback(() => {
        if (laserAdvanceTimerRef.current) {
            clearInterval(laserAdvanceTimerRef.current);
            laserAdvanceTimerRef.current = null;
        }
        laserTrailTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        laserTrailTimeoutsRef.current = [];
        laserLinesRef.current = [];
        laserLineWeightsRef.current = [];
        laserCurrentLineIndexRef.current = -1;
        setLaserCurrentLine(null);
        setLaserTrailLines([]);
        setLaserCurrentLineProgress(1);
    }, []);

    useEffect(() => {
        stopLaserGuide();
    }, [pageNumber, stopLaserGuide]);

    const syncLaserProgress = useCallback((progress: number) => {
        const lines = laserLinesRef.current;
        const weights = laserLineWeightsRef.current;
        if (lines.length === 0 || weights.length === 0) return;

        const calibratedProgress = (progress * LASER_PROGRESS_SCALE) + LASER_PROGRESS_OFFSET;
        const clampedProgress = Math.max(0, Math.min(1, calibratedProgress));
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        if (totalWeight <= 0) return;
        let remaining = clampedProgress * totalWeight;
        let idx = 0;
        while (idx < weights.length - 1 && remaining > weights[idx]) {
            remaining -= weights[idx];
            idx += 1;
        }
        const lineWeight = Math.max(0.000001, weights[idx]);
        const lineProgress = Math.max(0.08, Math.min(1, remaining / lineWeight));

        if (laserCurrentLineIndexRef.current !== idx) {
            const prevIndex = laserCurrentLineIndexRef.current;
            if (prevIndex >= 0 && prevIndex < lines.length) {
                const prevLine = lines[prevIndex];
                setLaserTrailLines((currentTrail) => [...currentTrail, { ...prevLine, id: Date.now() + Math.random() }]);
                const timeoutId = setTimeout(() => {
                    setLaserTrailLines((currentTrail) => currentTrail.slice(1));
                }, 900);
                laserTrailTimeoutsRef.current.push(timeoutId);
            }
            laserCurrentLineIndexRef.current = idx;
            setLaserCurrentLine(lines[idx]);
            setLaserCurrentLineProgress(0.08);
        }
        setLaserCurrentLineProgress(lineProgress);
    }, []);

    const startLaserGuide = useCallback((sourceRects: TextHighlightRect[]) => {
        stopLaserGuide();
        if (!sourceRects || sourceRects.length === 0) return;

        const container = pageContainerRef.current;
        if (!container) return;
        const textLayer = container.querySelector(".react-pdf__Page__textContent") as HTMLElement | null;
        const pageCanvas = container.querySelector(".react-pdf__Page__canvas") as HTMLElement | null;
        const pageRoot = container.querySelector(".react-pdf__Page") as HTMLElement | null;
        const anchor = textLayer || pageCanvas || pageRoot || container;
        const layerRect = anchor.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (layerRect.width <= 0 || layerRect.height <= 0) return;

        const sorted = [...sourceRects].sort((a, b) => (a.y - b.y) || (a.x - b.x));
        const grouped: TextHighlightRect[] = [];
        sorted.forEach((rect) => {
            const previous = grouped[grouped.length - 1];
            if (!previous) {
                grouped.push({ ...rect });
                return;
            }
            const sameLine = Math.abs(previous.y - rect.y) < 0.01 && Math.abs(previous.height - rect.height) < 0.02;
            if (sameLine) {
                const x1 = Math.min(previous.x, rect.x);
                const x2 = Math.max(previous.x + previous.width, rect.x + rect.width);
                const y1 = Math.min(previous.y, rect.y);
                const y2 = Math.max(previous.y + previous.height, rect.y + rect.height);
                previous.x = x1;
                previous.y = y1;
                previous.width = x2 - x1;
                previous.height = y2 - y1;
                return;
            }
            grouped.push({ ...rect });
        });

        const lines: LaserLine[] = grouped.map((rect, idx) => ({
            id: Date.now() + idx,
            left: (layerRect.left - containerRect.left) + rect.x * layerRect.width,
            top: Math.max(2, (layerRect.top - containerRect.top) + (rect.y + rect.height) * layerRect.height - 2),
            width: Math.max(14, rect.width * layerRect.width),
        }));
        if (lines.length === 0) return;

        laserLinesRef.current = lines;
        laserLineWeightsRef.current = lines.map((line) => Math.max(10, line.width));
        laserCurrentLineIndexRef.current = 0;
        setLaserCurrentLine(lines[0]);
        setLaserCurrentLineProgress(0.08);
    }, [stopLaserGuide]);

    const addRangeTextHighlight = useCallback((range: Range) => {
        const container = pageContainerRef.current;
        if (!container) return false;
        const textLayer = container.querySelector(".react-pdf__Page__textContent") as HTMLElement | null;
        if (!textLayer) return false;
        if (range.collapsed) return false;
        if (!textLayer.contains(range.startContainer) || !textLayer.contains(range.endContainer)) {
            return false;
        }

        const selectedTextRaw = range.toString();
        const selectedText = selectedTextRaw.replace(/\s+/g, " ").trim();
        if (!selectedText || selectedText.length < 2) return false;

        const rects = getNormalizedRectsFromRange(range);

        if (rects.length === 0) return false;
        if (rects.length > 140) return false; // Guard against accidental whole-page selection.

        const totalCoverage = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
        if (totalCoverage > 0.42) return false; // Reject giant bulk selection caused by drag misses.

        const overlapArea = (a: TextHighlightRect, b: TextHighlightRect) => {
            const x1 = Math.max(a.x, b.x);
            const y1 = Math.max(a.y, b.y);
            const x2 = Math.min(a.x + a.width, b.x + b.width);
            const y2 = Math.min(a.y + a.height, b.y + b.height);
            if (x2 <= x1 || y2 <= y1) return 0;
            return (x2 - x1) * (y2 - y1);
        };
        const rectSignature = (items: TextHighlightRect[]) =>
            items
                .map((r) => ({
                    x: Number(r.x.toFixed(3)),
                    y: Number(r.y.toFixed(3)),
                    w: Number(r.width.toFixed(3)),
                    h: Number(r.height.toFixed(3)),
                }))
                .sort((a, b) => (a.y - b.y) || (a.x - b.x))
                .map((r) => `${r.x},${r.y},${r.w},${r.h}`)
                .join("|");

        const pageAnnotations = annotations[pageNumber] || [];
        const existingHighlights = pageAnnotations
            .filter((annotation): annotation is TextHighlight => isTextHighlight(annotation))
            .map((annotation) => annotation.rects || []);
        const existingRects = existingHighlights.flatMap((rectList) => rectList);
        if (existingHighlights.length > 0) {
            const incomingSignature = rectSignature(rects);
            const hasExactDuplicate = existingHighlights.some((rectList) => rectSignature(rectList) === incomingSignature);
            if (hasExactDuplicate) {
                return false; // Exact highlight already exists.
            }
        }
        if (existingRects.length > 0) {
            const newArea = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
            if (newArea > 0) {
                let coveredArea = 0;
                rects.forEach((rect) => {
                    let coveredForRect = 0;
                    existingRects.forEach((existing) => {
                        coveredForRect += overlapArea(rect, existing);
                    });
                    const rectArea = rect.width * rect.height;
                    coveredArea += Math.min(rectArea, coveredForRect);
                });
                const coveredRatio = coveredArea / newArea;
                if (coveredArea > 0.0005 || coveredRatio >= 0.05) {
                    return false; // Prevent re-highlighting any already highlighted region.
                }
            }
        }

        const highlight: TextHighlight = {
            kind: "text-highlight",
            color: "#fde047",
            opacity: 0.35,
            rects,
        };

        setAnnotations((prev) => {
            const next: AnnotationByPage = {
                ...prev,
                [pageNumber]: [...(prev[pageNumber] || []), highlight],
            };
            persistAnnotationsLocalMirror(annotationStorageKey, next);
            return next;
        });
        return true;
    }, [annotationStorageKey, annotations, getNormalizedRectsFromRange, pageNumber]);

    const captureSelectedText = useCallback(() => {
        if (!popupRef.current) return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            setSelectedText("");
            setSelectedTextRects([]);
            return;
        }
        const anchorNode = selection.anchorNode;
        const focusNode = selection.focusNode;
        const isInsidePopup =
            (!!anchorNode && popupRef.current.contains(anchorNode)) ||
            (!!focusNode && popupRef.current.contains(focusNode));
        if (!isInsidePopup) {
            setSelectedText("");
            setSelectedTextRects([]);
            return;
        }
        const range = selection.getRangeAt(0);
        setSelectedTextRects(getNormalizedRectsFromRange(range));
        if (isTextHighlighting) {
            const highlighted = addRangeTextHighlight(range);
            if (highlighted) {
                selection.removeAllRanges();
                setSelectedText("");
                setSelectedTextRects([]);
                return;
            }
        }
        const text = selection.toString().replace(/\s+/g, " ").trim();
        setSelectedText(text);
    }, [addRangeTextHighlight, getNormalizedRectsFromRange, isTextHighlighting]);

    useEffect(() => {
        window.addEventListener("mouseup", captureSelectedText);
        window.addEventListener("keyup", captureSelectedText);
        return () => {
            window.removeEventListener("mouseup", captureSelectedText);
            window.removeEventListener("keyup", captureSelectedText);
        };
    }, [captureSelectedText]);

    const stopSpeaking = useCallback((clearLaser = true) => {
        speechSessionIdRef.current += 1;
        if (clearLaser) {
            stopLaserGuide();
        }
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        speechUtteranceRef.current = null;
        if (speechAudioRef.current) {
            speechAudioRef.current.pause();
            speechAudioRef.current.src = "";
            speechAudioRef.current = null;
        }
        if (speechAudioUrlRef.current) {
            URL.revokeObjectURL(speechAudioUrlRef.current);
            speechAudioUrlRef.current = null;
        }
        setIsSpeaking(false);
        setIsSpeechPaused(false);
        speechPausedRef.current = false;
        setActiveSpeechKey(null);
    }, [stopLaserGuide]);

    const togglePauseSpeaking = useCallback(async () => {
        if (!isSpeaking) return;
        const audio = speechAudioRef.current;
        if (audio) {
            if (audio.paused) {
                try {
                    await audio.play();
                    setIsSpeechPaused(false);
                    speechPausedRef.current = false;
                } catch {
                    // ignore resume errors
                }
            } else {
                audio.pause();
                setIsSpeechPaused(true);
                speechPausedRef.current = true;
            }
            return;
        }
        if (typeof window !== "undefined" && window.speechSynthesis) {
            if (isSpeechPaused) {
                window.speechSynthesis.resume();
                setIsSpeechPaused(false);
                speechPausedRef.current = false;
            } else {
                window.speechSynthesis.pause();
                setIsSpeechPaused(true);
                speechPausedRef.current = true;
            }
        }
    }, [isSpeaking, isSpeechPaused]);

    useEffect(() => {
        const prefs = loadSpeechPrefs();
        setTtsVoiceURI(prefs.voiceURI);
        setTtsRate(typeof prefs.rate === "number" ? Math.min(1.2, Math.max(0.8, prefs.rate)) : 0.96);
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !window.speechSynthesis) return;
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setTtsVoices(Array.isArray(voices) ? voices : []);
        };
        loadVoices();
        window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
        return () => {
            window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
        };
    }, []);

    useEffect(() => {
        if (ttsVoiceURI || ttsVoices.length === 0) return;
        const best = pickBestVoice(ttsVoices);
        if (best?.voiceURI) {
            setTtsVoiceURI(best.voiceURI);
        }
    }, [ttsVoiceURI, ttsVoices]);

    useEffect(() => {
        saveSpeechPrefs({ voiceURI: ttsVoiceURI, rate: ttsRate });
    }, [ttsVoiceURI, ttsRate]);

    useEffect(() => {
        if (!isDesktopRuntime || !kokoroEnabled) return;
        if (kokoroWarmupStartedRef.current) return;
        const kokoroVoice =
            (parseCloudVoiceURI(ttsVoiceURI)?.provider === "kokoro"
                ? parseCloudVoiceURI(ttsVoiceURI)
                : cloudVoices.find((voice) => voice.provider === "kokoro")) || null;
        if (!kokoroVoice) return;
        kokoroWarmupStartedRef.current = true;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        void fetch("/api/ai/tts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(isDesktopRuntime ? { "x-studio-desktop": "1" } : {}),
            },
            body: JSON.stringify({
                text: "Ready.",
                provider: "kokoro",
                voice: kokoroVoice.id,
                speed: 1,
                kokoroBaseUrl: settings.kokoroTtsBaseUrl,
                aiConfig,
            }),
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) return;
                await response.arrayBuffer().catch(() => undefined);
            })
            .catch(() => undefined)
            .finally(() => {
                clearTimeout(timeoutId);
            });
        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [aiConfig, cloudVoices, isDesktopRuntime, kokoroEnabled, settings.kokoroTtsBaseUrl, ttsVoiceURI]);

    useEffect(() => {
        return () => {
            stopSpeaking();
        };
    }, [stopSpeaking]);

    const handleStartKokoroServer = useCallback(async () => {
        if (!isDesktopRuntime) return;
        const bridge = (window as any)?.studioDesktop?.kokoro;
        if (!bridge?.startServer) {
            toast({
                title: "Unavailable",
                description: "Desktop Kokoro bridge is not available in this runtime.",
                variant: "destructive",
            });
            return;
        }
        const baseUrl = (settings.kokoroTtsBaseUrl || "http://127.0.0.1:8880").trim();
        setIsStartingKokoro(true);
        try {
            const result = await new Promise<{
                success?: boolean;
                error?: string;
                details?: string[];
                baseUrl?: string;
                image?: string;
                mode?: string;
            }>((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error("Kokoro startup timed out. Verify Docker Desktop is running and retry."));
                }, 185000);
                Promise.resolve(bridge.startServer({ baseUrl }))
                    .then((value) => {
                        clearTimeout(timeoutId);
                        resolve(value);
                    })
                    .catch((err) => {
                        clearTimeout(timeoutId);
                        reject(err);
                    });
            });
            if (!result?.success) {
                const details = Array.isArray(result?.details) && result.details.length > 0 ? ` (${result.details.join(" | ")})` : "";
                throw new Error((result?.error || "Failed to start Kokoro server.") + details);
            }
            if (result.baseUrl) {
                setSettings((prev) => ({ ...prev, kokoroTtsBaseUrl: String(result.baseUrl) }));
            }
            const modeText = String(result?.mode || "").toLowerCase();
            if (modeText.includes("gpu")) setKokoroMode("gpu");
            else if (modeText.includes("cpu")) setKokoroMode("cpu");
            else if (modeText.includes("existing")) setKokoroMode("existing");
            else if (modeText) setKokoroMode("custom");
            setIsKokoroHealthy(true);
            const modeLabel =
                result?.mode === "gpu" ? "GPU" : result?.mode === "cpu-fallback" || result?.mode === "cpu" ? "CPU" : "Custom";
            toast({
                title: "Kokoro Started",
                description: `${modeLabel} mode (${result?.image || "kokoro image"}).`,
            });
        } catch (error) {
            toast({
                title: "Kokoro Start Failed",
                description: error instanceof Error ? error.message : "Unknown error.",
                variant: "destructive",
            });
        } finally {
            setIsStartingKokoro(false);
        }
    }, [isDesktopRuntime, setSettings, settings.kokoroTtsBaseUrl, toast]);

    const checkKokoroServerHealth = useCallback(async () => {
        if (!isDesktopRuntime) {
            setIsKokoroHealthy(false);
            setKokoroMode(null);
            return;
        }
        const bridge = (window as any)?.studioDesktop?.kokoro;
        const baseUrl = (settings.kokoroTtsBaseUrl || "http://127.0.0.1:8880").trim().replace(/\/+$/, "");
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
                    const modeText = String(status.mode || "").toLowerCase();
                    if (modeText === "gpu") setKokoroMode("gpu");
                    else if (modeText === "cpu") setKokoroMode("cpu");
                    else if (modeText === "custom") setKokoroMode("custom");
                    else if (modeText === "existing") setKokoroMode("existing");
                    else setKokoroMode(null);
                    return;
                }
            } catch {
                // fallback to direct health below
            }
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        try {
            const response = await fetch(`${baseUrl}/health`, {
                method: "GET",
                signal: controller.signal,
            });
            if (!response.ok) {
                setIsKokoroHealthy(false);
                return;
            }
            const text = await response.text().catch(() => "");
            setIsKokoroHealthy(/healthy|ok/i.test(text || ""));
            setKokoroMode((prev) => (prev ? prev : /healthy|ok/i.test(text || "") ? "existing" : null));
        } catch {
            setIsKokoroHealthy(false);
            setKokoroMode(null);
        } finally {
            clearTimeout(timeoutId);
        }
    }, [isDesktopRuntime, settings.kokoroTtsBaseUrl]);

    useEffect(() => {
        if (!isDesktopRuntime) return;
        void checkKokoroServerHealth();
        const timerId = setInterval(() => {
            void checkKokoroServerHealth();
        }, 5000);
        return () => clearInterval(timerId);
    }, [checkKokoroServerHealth, isDesktopRuntime]);

    const speakText = useCallback(async (rawText: string, key: string) => {
        if (typeof window === "undefined") return;
        const text = cleanSpeechText(rawText);
        if (!text) return;
        if (activeSpeechKey === key && isSpeaking) {
            stopSpeaking();
            return;
        }
        let laserRects: TextHighlightRect[] =
            key.startsWith("selection:") ? selectedTextRects :
            key.startsWith("highlights:") ? (annotations[pageNumber] || [])
                .filter((annotation): annotation is TextHighlight => isTextHighlight(annotation))
                .flatMap((annotation) => annotation.rects || [])
            : key.startsWith("page:") ? (() => {
                const container = pageContainerRef.current;
                if (!container) return [];
                const textLayer = container.querySelector(".react-pdf__Page__textContent") as HTMLElement | null;
                if (!textLayer) return [];
                const layerRect = textLayer.getBoundingClientRect();
                if (layerRect.width <= 0 || layerRect.height <= 0) return [];
                const spans = Array.from(textLayer.querySelectorAll("span")) as HTMLElement[];
                return spans
                    .map((span) => {
                        const content = (span.textContent || "").replace(/\s+/g, " ").trim();
                        if (!content) return null;
                        const rect = span.getBoundingClientRect();
                        if (rect.width <= 0 || rect.height <= 0) return null;
                        return {
                            x: Math.max(0, Math.min(1, (rect.left - layerRect.left) / layerRect.width)),
                            y: Math.max(0, Math.min(1, (rect.top - layerRect.top) / layerRect.height)),
                            width: Math.max(0, Math.min(1, rect.width / layerRect.width)),
                            height: Math.max(0, Math.min(1, rect.height / layerRect.height)),
                        } as TextHighlightRect;
                    })
                    .filter((rect): rect is TextHighlightRect => Boolean(rect));
            })()
                : [];
        if (laserRects.length === 0) {
            laserRects = buildFallbackLaserRects(pageContainerRef.current);
        }
        if (laserRects.length > 0) {
            startLaserGuide(laserRects);
        } else {
            stopLaserGuide();
        }
        const selectedCloudVoice = parseCloudVoiceURI(ttsVoiceURI);
        const hasExplicitSystemVoice = Boolean(ttsVoiceURI) && !selectedCloudVoice;
        const shouldUseCloud =
            Boolean(selectedCloudVoice) ||
            (!hasExplicitSystemVoice && ttsVoices.length === 0 && cloudVoices.length > 0);
        if (shouldUseCloud) {
            const cloudVoice = selectedCloudVoice || cloudVoices[0];
            if (!cloudVoice) return;
            stopSpeaking(false);
            setIsSpeaking(true);
            setIsSpeechPaused(false);
            speechPausedRef.current = false;
            setActiveSpeechKey(key);
            const sessionId = ++speechSessionIdRef.current;
            const textChunks = splitTextForCloudTts(text);
            if (textChunks.length === 0) {
                setIsSpeaking(false);
                setActiveSpeechKey(null);
                return;
            }
            const chunkWeights = textChunks.map((chunk) => Math.max(1, cleanSpeechText(chunk).length));
            const totalChunkWeight = chunkWeights.reduce((sum, weight) => sum + weight, 0);
            const getChunkBaseProgress = (chunkIndex: number) => {
                if (totalChunkWeight <= 0) return 0;
                const priorWeight = chunkWeights.slice(0, chunkIndex).reduce((sum, weight) => sum + weight, 0);
                return priorWeight / totalChunkWeight;
            };
            const getChunkSpanProgress = (chunkIndex: number) => {
                if (totalChunkWeight <= 0) return 1 / Math.max(1, textChunks.length);
                return chunkWeights[chunkIndex] / totalChunkWeight;
            };
            try {
                const fetchChunkAudio = async (chunkText: string): Promise<Blob> => {
                    const response = await fetch("/api/ai/tts", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            ...(isDesktopRuntime ? { "x-studio-desktop": "1" } : {}),
                        },
                        body: JSON.stringify({
                            text: chunkText,
                            provider: cloudVoice.provider,
                            voice: cloudVoice.id,
                            speed: ttsRate,
                            kokoroBaseUrl: settings.kokoroTtsBaseUrl,
                            aiConfig,
                        }),
                    });
                    if (!response.ok) {
                        const result = await response.json().catch(() => ({}));
                        throw new Error(result?.details || result?.error || "Cloud TTS failed.");
                    }
                    return response.blob();
                };
                let nextChunkPromise: Promise<Blob> | null = fetchChunkAudio(textChunks[0]);
                for (let chunkIndex = 0; chunkIndex < textChunks.length; chunkIndex += 1) {
                    if (speechSessionIdRef.current !== sessionId) return;
                    if (!nextChunkPromise) break;
                    const blob = await nextChunkPromise;
                    if (speechSessionIdRef.current !== sessionId) return;
                    nextChunkPromise =
                        chunkIndex + 1 < textChunks.length
                            ? fetchChunkAudio(textChunks[chunkIndex + 1])
                            : null;
                    if (speechAudioUrlRef.current) {
                        URL.revokeObjectURL(speechAudioUrlRef.current);
                    }
                    const url = URL.createObjectURL(blob);
                    speechAudioUrlRef.current = url;
                    const audio = new Audio(url);
                    speechAudioRef.current = audio;

                    await new Promise<void>(async (resolve, reject) => {
                        audio.onplay = () => {
                            setIsSpeechPaused(false);
                            speechPausedRef.current = false;
                        };
                        audio.onpause = () => {
                            setIsSpeechPaused(true);
                            speechPausedRef.current = true;
                        };
                        audio.onloadedmetadata = () => {
                            const base = getChunkBaseProgress(chunkIndex);
                            syncLaserProgress(Math.max(0.02, base));
                        };
                        audio.ontimeupdate = () => {
                            if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
                            const base = getChunkBaseProgress(chunkIndex);
                            const span = getChunkSpanProgress(chunkIndex);
                            const progress = base + ((audio.currentTime / audio.duration) * span);
                            syncLaserProgress(progress);
                        };
                        audio.onended = () => {
                            speechAudioRef.current = null;
                            try { URL.revokeObjectURL(url); } catch {}
                            resolve();
                        };
                        audio.onerror = () => {
                            speechAudioRef.current = null;
                            try { URL.revokeObjectURL(url); } catch {}
                            reject(new Error("Cloud audio playback failed."));
                        };
                        try {
                            await audio.play();
                        } catch (err) {
                            reject(err instanceof Error ? err : new Error("Cloud audio playback failed."));
                        }
                    });
                }
                if (speechSessionIdRef.current !== sessionId) return;
                setIsSpeaking(false);
                setIsSpeechPaused(false);
                speechPausedRef.current = false;
                setActiveSpeechKey((prev) => (prev === key ? null : prev));
                syncLaserProgress(1);
                stopLaserGuide();
            } catch (error) {
                console.error("Cloud TTS failed:", error);
                setIsSpeaking(false);
                setIsSpeechPaused(false);
                speechPausedRef.current = false;
                setActiveSpeechKey((prev) => (prev === key ? null : prev));
                stopLaserGuide();
            }
            return;
        }
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoice = pickBestVoice(ttsVoices, ttsVoiceURI);
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
        } else {
            utterance.lang = "en-US";
        }
        utterance.rate = ttsRate;
        utterance.pitch = 1;
        let sawBoundary = false;
        let fallbackStartMs = 0;
        const totalChars = Math.max(1, text.length);
        utterance.onstart = () => {
            setIsSpeaking(true);
            setIsSpeechPaused(false);
            speechPausedRef.current = false;
            setActiveSpeechKey(key);
            fallbackStartMs = Date.now();
            syncLaserProgress(0.02);
            const approxWpm = 170 * Math.max(0.5, ttsRate);
            const totalMs = Math.max(1400, Math.round((Math.max(1, text.split(/\s+/).filter(Boolean).length) / approxWpm) * 60000));
            if (laserAdvanceTimerRef.current) clearInterval(laserAdvanceTimerRef.current);
            laserAdvanceTimerRef.current = setInterval(() => {
                if (sawBoundary || speechPausedRef.current) return;
                const elapsed = Date.now() - fallbackStartMs;
                syncLaserProgress(Math.min(0.98, elapsed / totalMs));
            }, 80);
        };
        utterance.onboundary = (event: SpeechSynthesisEvent) => {
            if (typeof event.charIndex !== "number") return;
            sawBoundary = true;
            const charLength = typeof (event as any).charLength === "number" ? Number((event as any).charLength) : 1;
            const progress = (event.charIndex + Math.max(1, charLength) * 0.8) / totalChars;
            syncLaserProgress(Math.max(0.02, Math.min(1, progress)));
        };
        utterance.onend = () => {
            setIsSpeaking(false);
            setIsSpeechPaused(false);
            speechPausedRef.current = false;
            setActiveSpeechKey((prev) => (prev === key ? null : prev));
            speechUtteranceRef.current = null;
            syncLaserProgress(1);
            stopLaserGuide();
        };
        utterance.onerror = () => {
            setIsSpeaking(false);
            setIsSpeechPaused(false);
            speechPausedRef.current = false;
            setActiveSpeechKey((prev) => (prev === key ? null : prev));
            speechUtteranceRef.current = null;
            stopLaserGuide();
        };
        utterance.onpause = () => {
            setIsSpeechPaused(true);
            speechPausedRef.current = true;
        };
        utterance.onresume = () => {
            setIsSpeechPaused(false);
            speechPausedRef.current = false;
        };
        speechUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [activeSpeechKey, aiConfig, annotations, cloudVoices, isDesktopRuntime, isSpeaking, pageNumber, selectedTextRects, settings.kokoroTtsBaseUrl, startLaserGuide, stopLaserGuide, stopSpeaking, syncLaserProgress, ttsRate, ttsVoiceURI, ttsVoices]);

    const getHighlightedTextForCurrentPage = useCallback(() => {
        const container = pageContainerRef.current;
        if (!container) return "";
        const textLayer = container.querySelector(".react-pdf__Page__textContent") as HTMLElement | null;
        if (!textLayer) return "";

        const pageAnnotations = annotations[pageNumber] || [];
        const textHighlights = pageAnnotations.filter(
            (annotation): annotation is TextHighlight => isTextHighlight(annotation) && (annotation.rects || []).length > 0
        );
        if (textHighlights.length === 0) return "";

        const layerRect = textLayer.getBoundingClientRect();
        if (layerRect.width <= 0 || layerRect.height <= 0) return "";

        const overlapArea = (a: TextHighlightRect, b: TextHighlightRect) => {
            const x1 = Math.max(a.x, b.x);
            const y1 = Math.max(a.y, b.y);
            const x2 = Math.min(a.x + a.width, b.x + b.width);
            const y2 = Math.min(a.y + a.height, b.y + b.height);
            if (x2 <= x1 || y2 <= y1) return 0;
            return (x2 - x1) * (y2 - y1);
        };

        const spans = Array.from(textLayer.querySelectorAll("span")) as HTMLElement[];
        const spanEntries = spans
            .map((span, idx) => {
                const text = (span.textContent || "").replace(/\s+/g, " ").trim();
                if (!text) return null;
                const rect = span.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0) return null;
                return {
                    idx,
                    text,
                    rect: {
                        x: (rect.left - layerRect.left) / layerRect.width,
                        y: (rect.top - layerRect.top) / layerRect.height,
                        width: rect.width / layerRect.width,
                        height: rect.height / layerRect.height,
                    } as TextHighlightRect,
                };
            })
            .filter((entry): entry is { idx: number; text: string; rect: TextHighlightRect } => Boolean(entry));

        const chunks = textHighlights
            .map((highlight) => {
                const selected = spanEntries
                    .map((entry) => {
                        const spanArea = Math.max(0.000001, entry.rect.width * entry.rect.height);
                        let covered = 0;
                        highlight.rects.forEach((hlRect) => {
                            covered += overlapArea(entry.rect, hlRect);
                        });
                        const coveredRatio = covered / spanArea;
                        if (coveredRatio < 0.2) return null;
                        return {
                            idx: entry.idx,
                            text: entry.text,
                            y: entry.rect.y,
                            x: entry.rect.x,
                        };
                    })
                    .filter((item): item is { idx: number; text: string; y: number; x: number } => Boolean(item))
                    .sort((a, b) => (a.y - b.y) || (a.x - b.x) || (a.idx - b.idx));

                if (selected.length === 0) return "";
                return selected
                    .map((item) => item.text)
                    .join(" ")
                    .replace(/\s+([,.;:!?])/g, "$1")
                    .replace(/([(\[])\s+/g, "$1")
                    .replace(/\s+([)\]])/g, "$1")
                    .replace(/\s+/g, " ")
                    .trim();
            })
            .filter(Boolean);

        if (chunks.length === 0) return "";
        return chunks.join(". ");
    }, [annotations, pageNumber]);

    const readHighlightedText = useCallback(() => {
        const text = getHighlightedTextForCurrentPage();
        if (!text) return;
        void speakText(text, `highlights:${pageNumber}`);
    }, [getHighlightedTextForCurrentPage, pageNumber, speakText]);

    const getCurrentPageText = useCallback(() => {
        const container = pageContainerRef.current;
        if (!container) return "";
        const textLayer = container.querySelector(".react-pdf__Page__textContent") as HTMLElement | null;
        if (!textLayer) return "";
        const spans = Array.from(textLayer.querySelectorAll("span")) as HTMLElement[];
        const text = spans
            .map((span) => (span.textContent || "").replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .join(" ")
            .replace(/\s+([,.;:!?])/g, "$1")
            .replace(/([(\[])\s+/g, "$1")
            .replace(/\s+([)\]])/g, "$1")
            .replace(/\s+/g, " ")
            .trim();
        return text;
    }, []);

    const readSelectedOrPageText = useCallback(() => {
        const selected = cleanSpeechText(selectedText);
        if (selected) {
            void speakText(selectedText, `selection:${pageNumber}`);
            return;
        }
        const pageText = cleanSpeechText(getCurrentPageText());
        if (!pageText) return;
        void speakText(pageText, `page:${pageNumber}`);
    }, [getCurrentPageText, pageNumber, selectedText, speakText]);

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
                    aiConfig,
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
                    aiConfig,
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
        requestAnimationFrame(() => {
            recomputeFitWidth();
            setTimeout(() => {
                recomputeFitWidth();
            }, 60);
        });
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
    const hasTextHighlights = (annotations[pageNumber] || []).some(
        (annotation) => isTextHighlight(annotation) && (annotation.rects || []).length > 0
    );
    const hasExplainableSelection = isDesktopRuntime && hasSelectedText && isAiEnabled;
    const explainContextText = activeExplainText || selectedText;

    return (
        <div ref={setNodeRef} style={style}>
            <input type="file" ref={pdfUploadInputRef} onChange={handlePdfUpload} accept=".pdf" className="hidden" />
            <Card
                ref={popupRef}
                className={cn(
                    "h-full w-full shadow-2xl border-2 border-primary/30 flex flex-col relative overflow-hidden",
                    isTextHighlighting && "pdf-text-highlight-mode"
                )}
            >
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
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
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
                            </div>
                            <div className="flex items-center gap-1 rounded-md border border-border/70 bg-muted/20 px-1.5 py-1">
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomOut}><ZoomOut className="h-4 w-4" /></Button>
                                <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => setFitMode(fitMode === "width" ? "custom" : "width")}>
                                    {fitMode === "width" ? "Fit: On" : "Fit: Off"}
                                </Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomIn}><ZoomIn className="h-4 w-4" /></Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setRotation((r) => (r + 90) % 360)} title="Rotate">
                                    <RotateCw className="h-4 w-4" />
                                </Button>
                                <div className="text-xs text-muted-foreground px-1.5 min-w-[72px] text-right">
                                    {fitMode === "custom" ? `${Math.round(scale * 100)}%` : "Fit Width"}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-2 py-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={readSelectedOrPageText}
                                disabled={!isSpeaking && !file}
                                title={hasSelectedText ? "Read selected text aloud" : "Read full page aloud"}
                            >
                                <Volume2 className="h-3.5 w-3.5 mr-1.5" />
                                Read
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={stopSpeaking}
                                disabled={!isSpeaking}
                                title="Stop read aloud"
                            >
                                <VolumeX className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => void togglePauseSpeaking()}
                                disabled={!isSpeaking}
                                title={isSpeechPaused ? "Resume read aloud" : "Pause read aloud"}
                            >
                                {isSpeechPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                            </Button>
                            <select
                                value={ttsVoiceURI || ""}
                                onChange={(e) => setTtsVoiceURI(e.target.value || undefined)}
                                className="h-8 min-w-[220px] flex-1 rounded border border-input bg-background px-2 text-xs"
                                title="Read aloud voice"
                            >
                                {ttsVoices.length === 0 && cloudVoices.length === 0 && (
                                    <option value="">Default Voice</option>
                                )}
                                {ttsVoices.length > 0 && (
                                    <optgroup label="System Voices">
                                        {ttsVoices.map((voice) => (
                                            <option key={voice.voiceURI || voice.name} value={voice.voiceURI}>
                                                {voice.name} ({voice.lang})
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                                {cloudVoices.length > 0 && (
                                    <optgroup label="Provider Voices">
                                        {cloudVoices.map((voice) => (
                                            <option key={voice.voiceURI} value={voice.voiceURI}>
                                                {voice.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                            {isDesktopRuntime && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={() => void handleStartKokoroServer()}
                                    disabled={isStartingKokoro || isKokoroHealthy}
                                    title={isKokoroHealthy ? "Kokoro server is running" : "Start Kokoro Docker server"}
                                >
                                    {!isKokoroHealthy && <Play className="h-3.5 w-3.5 mr-1.5" />}
                                    {isStartingKokoro ? "Starting..." : isKokoroHealthy ? "" : "Start Kokoro"}
                                    {isKokoroHealthy ? (
                                        <span className="inline-flex items-center gap-1">
                                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-emerald-300">{`kokoro-${kokoroMode || "on"}`}</span>
                                        </span>
                                    ) : null}
                                </Button>
                            )}
                            <div className="ml-auto flex items-center gap-1.5 rounded border border-input px-2 h-8">
                                <span className="text-[11px] text-muted-foreground">Speed</span>
                                <input
                                    type="range"
                                    min={0.8}
                                    max={1.2}
                                    step={0.02}
                                    value={ttsRate}
                                    onChange={(e) => setTtsRate(Number(e.target.value))}
                                    className="w-20"
                                    title="Read aloud speed"
                                />
                                <span className="text-[11px] text-muted-foreground w-9 text-right">{ttsRate.toFixed(2)}x</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 rounded-md border border-border/70 px-2 py-1">
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
                                className={cn("w-24", !isAnnotating && "opacity-50")}
                                title="Pen size"
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleUndoAnnotation} disabled={!hasPageAnnotations} title="Undo last annotation or highlight">
                                <Undo2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClearAnnotations} disabled={!hasPageAnnotations} title="Clear page annotations and highlights">
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
                                   <div className="absolute inset-0 z-[60] pointer-events-none">
                                       {laserTrailLines.map((line) => (
                                           <span
                                               key={`laser-trail-${line.id}`}
                                               className="pdf-laser-line pdf-laser-trail"
                                               style={{
                                                   left: `${line.left}px`,
                                                   top: `${line.top}px`,
                                                   width: `${line.width}px`,
                                               }}
                                           />
                                       ))}
                                       {laserCurrentLine && (
                                           <span
                                               key={`laser-current-${laserCurrentLine.id}`}
                                               className="pdf-laser-line pdf-laser-current"
                                               style={{
                                                   left: `${laserCurrentLine.left}px`,
                                                   top: `${laserCurrentLine.top}px`,
                                                   width: `${Math.max(10, laserCurrentLine.width * laserCurrentLineProgress)}px`,
                                               }}
                                           />
                                       )}
                                   </div>
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
                {isDesktopRuntime && showExplainPanel && isAiEnabled && (
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
                                onClick={() => {
                                    stopSpeaking();
                                    setShowExplainPanel(false);
                                }}
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
                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                                                    {message.role === "user" ? "You" : "AI"}
                                                </div>
                                                {message.role === "assistant" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 border-zinc-700 bg-zinc-950 px-2 text-[11px] text-zinc-100 hover:bg-zinc-800"
                                                        onClick={() => speakText(message.content, `assistant:${idx}`)}
                                                        title="Read this AI response aloud"
                                                    >
                                                        {activeSpeechKey === `assistant:${idx}` && isSpeaking ? (
                                                            <VolumeX className="h-3.5 w-3.5 mr-1" />
                                                        ) : (
                                                            <Volume2 className="h-3.5 w-3.5 mr-1" />
                                                        )}
                                                        {activeSpeechKey === `assistant:${idx}` && isSpeaking ? "Stop" : "Read"}
                                                    </Button>
                                                )}
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
                                <Button
                                    variant="outline"
                                    onClick={stopSpeaking}
                                    disabled={!isSpeaking}
                                    className="h-10 border-zinc-700 bg-zinc-950 text-zinc-100 hover:bg-zinc-800"
                                    title="Stop read aloud"
                                >
                                    <VolumeX className="h-4 w-4 mr-1.5" />
                                    Stop
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
                {isReaderOnly && (
                    <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
                        <Button
                            variant={isSpeaking ? "default" : "outline"}
                            size="icon"
                            className="h-9 w-9 shadow-lg"
                            onClick={() => {
                                if (isSpeaking) {
                                    stopSpeaking();
                                    return;
                                }
                                readSelectedOrPageText();
                            }}
                            disabled={!isSpeaking && !file}
                            title={
                                isSpeaking
                                    ? "Stop read aloud"
                                    : hasSelectedText
                                        ? "Read selected text aloud"
                                        : "Read full page aloud"
                            }
                        >
                            {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        {isSpeaking && (
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shadow-lg"
                                onClick={() => void togglePauseSpeaking()}
                                title={isSpeechPaused ? "Resume read aloud" : "Pause read aloud"}
                            >
                                {isSpeechPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                            </Button>
                        )}
                        <Button
                            variant={activeSpeechKey === `highlights:${pageNumber}` && isSpeaking ? "default" : "outline"}
                            size="icon"
                            className="h-9 w-9 shadow-lg"
                            onClick={readHighlightedText}
                            disabled={!hasTextHighlights}
                            title={
                                activeSpeechKey === `highlights:${pageNumber}` && isSpeaking
                                    ? "Stop reading highlights"
                                    : "Read highlighted text"
                            }
                        >
                            {activeSpeechKey === `highlights:${pageNumber}` && isSpeaking ? (
                                <VolumeX className="h-4 w-4" />
                            ) : (
                                <Volume2 className="h-4 w-4 text-amber-500" />
                            )}
                        </Button>
                        <Button
                            variant={isAnnotating ? "default" : "outline"}
                            size="icon"
                            className="h-9 w-9 shadow-lg"
                            onClick={() => {
                                setIsAnnotating((prev) => !prev);
                                if (!isAnnotating) {
                                    setIsTextHighlighting(false);
                                }
                            }}
                            title={isAnnotating ? "Disable marker" : "Enable marker"}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={isTextHighlighting ? "default" : "outline"}
                            size="icon"
                            className="h-9 w-9 shadow-lg"
                            onClick={() => {
                                setIsTextHighlighting((prev) => {
                                    const next = !prev;
                                    if (next) setIsAnnotating(false);
                                    return next;
                                });
                            }}
                            title={isTextHighlighting ? "Disable text highlight mode" : "Enable text highlight mode"}
                        >
                            <Highlighter className="h-4 w-4" />
                        </Button>
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
                    :global(.pdf-text-highlight-mode .react-pdf__Page__textContent ::selection) {
                        background: rgba(253, 224, 71, 0.45);
                        color: inherit;
                    }
                    :global(.pdf-text-highlight-mode .react-pdf__Page__textContent span::selection) {
                        background: rgba(253, 224, 71, 0.45);
                        color: inherit;
                    }
                    .pdf-laser-line {
                        position: absolute;
                        height: 3px;
                        border-radius: 999px;
                        background: linear-gradient(90deg, rgba(239, 68, 68, 0.35) 0%, rgba(239, 68, 68, 1) 60%, rgba(248, 113, 113, 1) 100%);
                        box-shadow: 0 0 8px rgba(239, 68, 68, 0.95), 0 0 18px rgba(248, 113, 113, 0.7);
                        transform-origin: left center;
                        mix-blend-mode: normal;
                    }
                    .pdf-laser-current {
                        animation: pdf-laser-pulse 0.45s ease-out;
                    }
                    .pdf-laser-trail {
                        animation: pdf-laser-trail-fade 0.9s ease-out forwards;
                    }
                    @keyframes pdf-laser-pulse {
                        0% {
                            opacity: 0.65;
                        }
                        100% {
                            opacity: 1;
                        }
                    }
                    @keyframes pdf-laser-trail-fade {
                        0% {
                            opacity: 0.65;
                            transform: translateX(0) scaleX(1);
                        }
                        100% {
                            opacity: 0;
                            transform: translateX(8px) scaleX(0.86);
                        }
                    }
                `}</style>
            </Card>
        </div>
    );
}
