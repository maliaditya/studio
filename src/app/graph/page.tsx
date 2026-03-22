"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseJsonWithRecovery } from "@/lib/jsonRecovery";
import { useToast } from "@/hooks/use-toast";
import { getAiConfigFromSettings, normalizeAiSettings } from "@/lib/ai/config";
import { cleanSpeechText, getKokoroLocalVoices, getOpenAiCloudVoices, loadSpeechPrefs, parseCloudVoiceURI, pickBestVoice, saveSpeechPrefs } from "@/lib/tts";
import type { KnowledgeGraph } from "@/lib/knowledgeTree/types";

type GraphNodeType =
  | "bothering-type"
  | "bothering"
  | "routine"
  | "specialization"
  | "pattern"
  | "project"
  | "kanban-card"
  | "resource"
  | "canvas"
  | "knowledge";
type GraphEdgeType =
  | "contains"
  | "mismatch-link"
  | "linked-task"
  | "routine-source"
  | "specialization-fit"
  | "pattern-flow"
  | "project-board"
  | "resource-canvas"
  | "canvas-link"
  | "knowledge";

type GraphNode = {
  id: string;
  label: string;
  type: GraphNodeType;
  mode?: "threat" | "growth";
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  mode?: "threat" | "growth";
  chainKey?: string;
  chainKeys?: string[];
};

type NodeInsight = {
  id: string;
  label: string;
  type: GraphNodeType;
  degree: number;
};

type PathInsightSection = {
  key: string;
  label: string;
  nodes: GraphNode[];
};

type AiGraphInsights = {
  overview: string;
  clusters: Array<{ label: string; summary: string; nodeLabels: string[] }>;
  leverageNodes: Array<{ label: string; reason: string }>;
  blindSpots: string[];
  nextActions: string[];
};

type Position = { x: number; y: number; vx: number; vy: number };
type DragMode =
  | { mode: "none" }
  | { mode: "node"; nodeId: string }
  | { mode: "pan"; startX: number; startY: number; startPanX: number; startPanY: number };

const BOTHERING_CARDS: Array<{ id: string; label: "External" | "Mismatch" | "Constraint" }> = [
  { id: "mindset_botherings_external", label: "External" },
  { id: "mindset_botherings_mismatch", label: "Mismatch" },
  { id: "mindset_botherings_constraint", label: "Constraint" },
];
const THREAT_TO_GROWTH_PATTERN: Record<string, string> = {
  Resistance: "Initiative",
  Avoidance: "Mastery",
  "Emotional Distress": "Connection",
};
const THREAT_INTERPRETATION_BY_STATE: Record<string, string> = {
  Autonomy: "My freedom or control is being restricted",
  Competence: "I am not capable enough",
  Relatedness: "I may be rejected or not valued",
};
const GROWTH_INTERPRETATION_BY_STATE: Record<string, string> = {
  Autonomy: "I can choose my response.",
  Competence: "I can learn this.",
  Relatedness: "I can connect.",
};

const normalizeText = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\w]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededUnit = (seed: string) => (hashString(seed) % 10000) / 10000;

const estimateLabelWidth = (label: string) => Math.min(240, Math.max(44, label.length * 6.4));
const labelLinesForNode = (node: GraphNode) => {
  if (node.type === "pattern" && node.label.includes("\n")) return node.label.split("\n").map((line) => line.trim()).filter(Boolean);
  const maxLength = node.type === "pattern" ? 54 : 42;
  return [node.label.length > maxLength ? `${node.label.slice(0, maxLength)}...` : node.label];
};

const isHierarchicalEdge = (type: GraphEdgeType) =>
  type === "contains" ||
  type === "linked-task" ||
  type === "pattern-flow" ||
  type === "project-board" ||
  type === "resource-canvas" ||
  type === "knowledge";

const edgeForceMultiplier = (type: GraphEdgeType) => {
  if (type === "contains") return 0.32;
  if (type === "mismatch-link") return 0.42;
  if (type === "linked-task") return 0.48;
  if (type === "pattern-flow") return 0.5;
  if (type === "project-board" || type === "resource-canvas") return 0.38;
  if (type === "knowledge") return 0.32;
  return 1;
};

const logicalColumnForType = (type: GraphNodeType) => {
  if (type === "bothering-type" || type === "bothering") return 0;
  if (type === "routine") return 1;
  if (type === "specialization") return 2;
  if (type === "pattern") return 3;
  return 4;
};

const nodeTypeLabel = (type: GraphNodeType) => {
  if (type === "bothering-type") return "Bothering Group";
  if (type === "bothering") return "Bothering";
  if (type === "routine") return "Routine Task";
  if (type === "specialization") return "Specialization";
  if (type === "pattern") return "Pattern Chain";
  if (type === "project") return "Project";
  if (type === "kanban-card") return "Kanban Task";
  if (type === "resource") return "Resource Card";
  if (type === "knowledge") return "Knowledge Node";
  return "Canvas";
};

const pathAccentForType = (type: GraphNodeType, mode?: GraphNode["mode"]) => {
  if (type === "bothering-type" || type === "bothering") return "#f97316";
  if (type === "routine") return "#22c55e";
  if (type === "specialization") return "#38bdf8";
  if (type === "pattern") return mode === "growth" ? "#34d399" : "#fb7185";
  if (type === "project") return "#a78bfa";
  if (type === "kanban-card") return "#34d399";
  if (type === "resource") return "#f59e0b";
  return "#e5e7eb";
};

const KNOWLEDGE_CLUSTER_PALETTE = [
  "#38bdf8",
  "#f472b6",
  "#34d399",
  "#facc15",
  "#a78bfa",
  "#fb923c",
  "#22d3ee",
  "#e879f9",
  "#4ade80",
  "#fb7185",
];
const DEFAULT_KNOWLEDGE_ACCENT = "#60a5fa";

const toRgba = (hex: string, alpha: number) => {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return `rgba(248, 250, 252, ${alpha})`;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const buildKnowledgeCommunities = (graph: KnowledgeGraph) => {
  const nodeIds = graph.nodes.map((node) => node.id).sort();
  const adjacency = new Map<string, string[]>();
  nodeIds.forEach((id) => adjacency.set(id, []));
  graph.edges.forEach((edge) => {
    if (!adjacency.has(edge.source) || !adjacency.has(edge.target)) return;
    adjacency.get(edge.source)!.push(edge.target);
    adjacency.get(edge.target)!.push(edge.source);
  });

  let labels = new Map<string, string>();
  nodeIds.forEach((id) => labels.set(id, id));

  const rounds = 7;
  for (let round = 0; round < rounds; round += 1) {
    const next = new Map(labels);
    nodeIds.forEach((id) => {
      const neighbors = adjacency.get(id) || [];
      if (neighbors.length === 0) return;
      const counts = new Map<string, number>();
      neighbors.forEach((neighbor) => {
        const label = labels.get(neighbor) || neighbor;
        counts.set(label, (counts.get(label) || 0) + 1);
      });
      const sorted = Array.from(counts.entries()).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      });
      if (sorted.length > 0) next.set(id, sorted[0][0]);
    });
    labels = next;
  }

  const communities = new Map<string, string>();
  labels.forEach((label, id) => communities.set(id, label));

  const uniqueLabels = Array.from(new Set(labels.values()));
  const palette = uniqueLabels.length <= 1 ? [DEFAULT_KNOWLEDGE_ACCENT] : KNOWLEDGE_CLUSTER_PALETTE;
  const communityToColor = new Map<string, string>();
  uniqueLabels.forEach((label) => {
    const idx = hashString(label) % palette.length;
    communityToColor.set(label, palette[idx]);
  });

  const nodeToColor = new Map<string, string>();
  communities.forEach((label, id) => {
    nodeToColor.set(id, communityToColor.get(label) || DEFAULT_KNOWLEDGE_ACCENT);
  });

  return { nodeToColor, communityOf: communities };
};

const colorForNode = (type: GraphNodeType, lightTheme = false, mode?: GraphNode["mode"]) => {
  if (type === "bothering-type") return "#a855f7";
  if (type === "bothering") return "#f97316";
  if (type === "routine") return "#22c55e";
  if (type === "specialization") return lightTheme ? "#0284c7" : "#38bdf8";
  if (type === "pattern") return mode === "growth" ? "#10b981" : "#ef4444";
  if (type === "project") return lightTheme ? "#7c3aed" : "#a78bfa";
  if (type === "kanban-card") return lightTheme ? "#10b981" : "#34d399";
  if (type === "resource") return "#f59e0b";
  if (type === "knowledge") return lightTheme ? "#0f172a" : "#f8fafc";
  return lightTheme ? "#475569" : "#e5e7eb";
};

const strokeForEdge = (type: GraphEdgeType, lightTheme = false, mode?: GraphEdge["mode"]) => {
  if (lightTheme) {
    if (type === "pattern-flow") return mode === "growth" ? "rgba(52, 211, 153, 0.58)" : "rgba(244, 114, 182, 0.58)";
    if (type === "canvas-link") return "rgba(71, 85, 105, 0.65)";
    if (type === "resource-canvas") return "rgba(217, 119, 6, 0.6)";
    if (type === "project-board") return "rgba(124, 58, 237, 0.55)";
    if (type === "mismatch-link") return "rgba(168, 85, 247, 0.65)";
    if (type === "specialization-fit") return "rgba(2, 132, 199, 0.55)";
    if (type === "routine-source") return "rgba(124, 58, 237, 0.6)";
    if (type === "knowledge") return "rgba(15, 23, 42, 0.6)";
    return "rgba(71, 85, 105, 0.38)";
  }
  if (type === "pattern-flow") return mode === "growth" ? "rgba(52, 211, 153, 0.68)" : "rgba(244, 114, 182, 0.68)";
  if (type === "canvas-link") return "rgba(148, 163, 184, 0.75)";
  if (type === "resource-canvas") return "rgba(245, 158, 11, 0.65)";
  if (type === "project-board") return "rgba(167, 139, 250, 0.65)";
  if (type === "mismatch-link") return "rgba(168, 85, 247, 0.78)";
  if (type === "specialization-fit") return "rgba(56, 189, 248, 0.65)";
  if (type === "routine-source") return "rgba(168, 85, 247, 0.65)";
  if (type === "knowledge") return "rgba(248, 250, 252, 0.6)";
  return "rgba(163, 163, 163, 0.45)";
};

const renderNodeIcon = (type: GraphNodeType, radius: number, dimmed: boolean) => {
  if (type !== "canvas" && type !== "resource" && type !== "specialization" && type !== "project" && type !== "kanban-card" && type !== "pattern") return null;

  const scale = Math.max(0.85, Math.min(1.6, radius / 4.8));
  const iconColor = type === "canvas" ? "rgba(15, 23, 42, 0.92)" : "rgba(250, 250, 250, 0.95)";
  const baseOpacity = dimmed ? 0.45 : 0.95;

  if (type === "specialization") {
    return (
      <g transform={`scale(${scale})`} fill={iconColor} opacity={baseOpacity} pointerEvents="none">
        <path d="M0 -3.7 L1.1 -1.2 L3.8 -1.2 L1.7 0.5 L2.4 3.1 L0 1.8 L-2.4 3.1 L-1.7 0.5 L-3.8 -1.2 L-1.1 -1.2 Z" />
      </g>
    );
  }

  if (type === "project") {
    return (
      <g transform={`scale(${scale})`} fill={iconColor} opacity={baseOpacity} pointerEvents="none">
        <rect x={-3.6} y={-2.6} width={7.2} height={5.2} rx={0.9} />
      </g>
    );
  }

  if (type === "pattern") {
    return (
      <g transform={`scale(${scale})`} fill={iconColor} opacity={baseOpacity} pointerEvents="none">
        <circle cx={-2.3} cy={0} r={1} />
        <circle cx={0} cy={0} r={1} />
        <circle cx={2.3} cy={0} r={1} />
        <rect x={-1.3} y={-0.3} width={2.6} height={0.6} rx={0.3} />
      </g>
    );
  }

  if (type === "kanban-card") {
    return (
      <g transform={`scale(${scale})`} fill={iconColor} opacity={baseOpacity} pointerEvents="none">
        <rect x={-3.7} y={-2.8} width={7.4} height={5.6} rx={0.8} />
        <rect x={-2.3} y={-1.3} width={4.6} height={0.8} rx={0.4} fill="rgba(15, 23, 42, 0.45)" />
      </g>
    );
  }

  if (type === "resource") {
    return (
      <g
        transform={`scale(${scale})`}
        stroke={iconColor}
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={baseOpacity}
        pointerEvents="none"
      >
        <rect x={-3.4} y={-3} width={6.8} height={6} rx={0.8} />
        <path d="M0 -3 V3" />
      </g>
    );
  }

  return (
    <g
      transform={`scale(${scale})`}
      stroke={iconColor}
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity={baseOpacity}
      pointerEvents="none"
    >
      <g transform="translate(-4,-4) scale(0.34)">
        <path d="m14.622 17.897-10.68-2.913" />
        <path d="M18.376 2.437a2.121 2.121 0 1 1 3 3L17 9.812l-3-3z" />
        <path d="m2 19.5 6-6" />
        <path d="M3 21c2 0 3-1 3-3 0-1.5-1-2.5-1-4 0-1 1-2 2.5-2C9 12 10 13 10 14c0 1.5-1 2.5-1 4 0 2 1 3 3 3" />
      </g>
    </g>
  );
};

const isCanvasLink = (value?: string) => typeof value === "string" && value.startsWith("canvas://");
const parseCanvasLink = (value?: string) => {
  if (!isCanvasLink(value)) return null;
  const token = String(value).replace("canvas://", "");
  const [resourceId, pointId] = token.split("/");
  if (!resourceId || !pointId) return null;
  return { resourceId, pointId };
};

const getPatternPathSummary = (pattern: any) => {
  const parts = String(pattern?.name || "").split(" -> ").map((part) => part.trim());
  return {
    threatSignal: pattern?.threatSignal || parts[0] || "",
    threatAction: pattern?.threatAction || parts[1] || "",
    threatActionType: pattern?.actionType || "",
    threatOutcome: pattern?.threatOutcome || parts[2] || "",
    growthSignal: pattern?.growthSignal || parts[3] || "",
    growthAction: pattern?.growthAction || parts[4] || "",
    growthActionType: pattern?.growthActionType || "",
    growthOutcome: pattern?.growthOutcome || parts[5] || "",
  };
};

const GRAPH_PREFS_KEY = "graphView:filterPrefs:v5";

export default function GraphPage() {
  const { mindsetCards, settings, coreSkills, resources, projects, kanbanBoards, patterns } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [showBotherings, setShowBotherings] = useState(true);
  const [showRoutines, setShowRoutines] = useState(true);
  const [showSpecializations, setShowSpecializations] = useState(true);
  const [showPatterns, setShowPatterns] = useState(true);
  const [showProjects, setShowProjects] = useState(false);
  const [showResources, setShowResources] = useState(true);
  const [showCanvases, setShowCanvases] = useState(true);
  const [showOrphans, setShowOrphans] = useState(false);
  const [showKnowledgeTree, setShowKnowledgeTree] = useState(false);
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraph | null>(null);
  const [knowledgeCanvasId, setKnowledgeCanvasId] = useState<string>("global");
  const [animate, setAnimate] = useState(true);
  const [repel, setRepel] = useState(450);
  const [linkDistance, setLinkDistance] = useState(60);
  const [center, setCenter] = useState(0.001);
  const [nodeSize, setNodeSize] = useState(3);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showArrows, setShowArrows] = useState(true);
  const [pathMode, setPathMode] = useState(true);
  const [labelFadeZoom, setLabelFadeZoom] = useState(0.7);
  const [linkThickness, setLinkThickness] = useState(0.8);
  const [linkForce, setLinkForce] = useState(0.015);
  const [panelOpen, setPanelOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [aiInsights, setAiInsights] = useState<AiGraphInsights | null>(null);
  const [isGeneratingAiInsights, setIsGeneratingAiInsights] = useState(false);
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null);
  const [isSpeakingAiInsights, setIsSpeakingAiInsights] = useState(false);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsVoiceURI, setTtsVoiceURI] = useState<string | undefined>(undefined);
  const [ttsRate, setTtsRate] = useState(0.96);
  const [hasMounted, setHasMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 1200, height: 760 });
  const positionsRef = useRef<Map<string, Position>>(new Map());
  const dragStateRef = useRef<DragMode>({ mode: "none" });
  const lastStepTimeRef = useRef(0);
  const hasLoadedPrefsRef = useRef(false);
  const hasRestoredGraphViewRef = useRef(false);
  const shouldSkipInitialFitRef = useRef(false);
  const [frame, setFrame] = useState(0);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechAudioUrlRef = useRef<string | null>(null);
  const isDesktopRuntime = typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop);
  const showDesktopOnlyUi = hasMounted && isDesktopRuntime;
  const aiConfig = useMemo(() => getAiConfigFromSettings(settings, isDesktopRuntime), [settings, isDesktopRuntime]);
  const isAiEnabled = useMemo(() => normalizeAiSettings(settings.ai, isDesktopRuntime).provider !== "none", [settings.ai, isDesktopRuntime]);
  const kokoroEnabled = isDesktopRuntime && Boolean(settings.kokoroTtsBaseUrl?.trim());
  const cloudVoices = useMemo(() => [...getOpenAiCloudVoices(aiConfig), ...getKokoroLocalVoices(kokoroEnabled)], [aiConfig, kokoroEnabled]);
  const knowledgeCommunities = useMemo(() => {
    if (!knowledgeGraph) return { nodeToColor: new Map<string, string>(), communityOf: new Map<string, string>() };
    return buildKnowledgeCommunities(knowledgeGraph);
  }, [knowledgeGraph]);
  const knowledgeCanvasOptions = useMemo(() => {
    const allResources = Array.isArray(resources) ? resources : [];
    const canvasResource = allResources.find((res) => res.type === "card" && res.name === "Canvas");
    if (!canvasResource?.points) return [];
    return canvasResource.points
      .filter((point) => point.type === "paint")
      .map((point) => ({
        id: `${canvasResource.id}-${point.id}`,
        label: point.text || "Canvas",
      }));
  }, [resources]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setSize({ width: Math.max(600, rect.width), height: Math.max(500, rect.height) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GRAPH_PREFS_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw) as Record<string, unknown>;
      if (typeof prefs.query === "string") setQuery(prefs.query);
      if (typeof prefs.showBotherings === "boolean") setShowBotherings(prefs.showBotherings);
      if (typeof prefs.showRoutines === "boolean") setShowRoutines(prefs.showRoutines);
      if (typeof prefs.showSpecializations === "boolean") setShowSpecializations(prefs.showSpecializations);
      if (typeof prefs.showPatterns === "boolean") setShowPatterns(prefs.showPatterns);
      if (typeof prefs.showProjects === "boolean") setShowProjects(prefs.showProjects);
      if (typeof prefs.showResources === "boolean") setShowResources(prefs.showResources);
      if (typeof prefs.showCanvases === "boolean") setShowCanvases(prefs.showCanvases);
      if (typeof prefs.showOrphans === "boolean") setShowOrphans(prefs.showOrphans);
      if (typeof prefs.showKnowledgeTree === "boolean") setShowKnowledgeTree(prefs.showKnowledgeTree);
      if (typeof prefs.knowledgeCanvasId === "string") setKnowledgeCanvasId(prefs.knowledgeCanvasId);
      if (typeof prefs.animate === "boolean") setAnimate(prefs.animate);
      if (typeof prefs.showLabels === "boolean") setShowLabels(prefs.showLabels);
      if (typeof prefs.showArrows === "boolean") setShowArrows(prefs.showArrows);
      if (typeof prefs.pathMode === "boolean") setPathMode(prefs.pathMode);
      if (typeof prefs.labelFadeZoom === "number") setLabelFadeZoom(prefs.labelFadeZoom);
      if (typeof prefs.nodeSize === "number") setNodeSize(prefs.nodeSize);
      if (typeof prefs.linkThickness === "number") setLinkThickness(prefs.linkThickness);
      if (typeof prefs.repel === "number") setRepel(prefs.repel);
      if (typeof prefs.linkForce === "number") setLinkForce(prefs.linkForce);
      if (typeof prefs.linkDistance === "number") setLinkDistance(prefs.linkDistance);
      if (typeof prefs.center === "number") setCenter(prefs.center);
      if (typeof prefs.panelOpen === "boolean") setPanelOpen(prefs.panelOpen);
      if (typeof prefs.zoom === "number") setZoom(Math.max(0.3, Math.min(2.6, prefs.zoom)));
      if (typeof prefs.panX === "number" && typeof prefs.panY === "number") {
        setPan({ x: prefs.panX, y: prefs.panY });
        shouldSkipInitialFitRef.current = true;
      }
      if (typeof prefs.selectedNodeId === "string" || prefs.selectedNodeId === null) {
        setSelectedNodeId((prefs.selectedNodeId as string | null) ?? null);
      }
    } catch {
      // Ignore malformed saved preferences.
    } finally {
      hasLoadedPrefsRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedPrefsRef.current || hasRestoredGraphViewRef.current) return;
    try {
      const raw = window.localStorage.getItem(GRAPH_PREFS_KEY);
      if (!raw) {
        hasRestoredGraphViewRef.current = true;
        return;
      }
      const prefs = JSON.parse(raw) as { positions?: Array<{ id: string; x: number; y: number }> };
      const storedPositions = Array.isArray(prefs.positions) ? prefs.positions : [];
      if (storedPositions.length > 0) {
        shouldSkipInitialFitRef.current = true;
        const map = positionsRef.current;
        storedPositions.forEach((item) => {
          if (!item || typeof item.id !== "string" || typeof item.x !== "number" || typeof item.y !== "number") return;
          map.set(item.id, { x: item.x, y: item.y, vx: 0, vy: 0 });
        });
      }
    } catch {
      // Ignore malformed saved graph layout.
    } finally {
      hasRestoredGraphViewRef.current = true;
      setFrame((v) => (v + 1) % 100000);
    }
  }, []);

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
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    if (ttsVoiceURI || ttsVoices.length === 0) return;
    const best = pickBestVoice(ttsVoices);
    if (best?.voiceURI) setTtsVoiceURI(best.voiceURI);
  }, [ttsVoiceURI, ttsVoices]);

  useEffect(() => {
    saveSpeechPrefs({ voiceURI: ttsVoiceURI, rate: ttsRate });
  }, [ttsVoiceURI, ttsRate]);

  useEffect(() => {
    if (!showKnowledgeTree) return;
    let cancelled = false;
    const loadKnowledgeGraph = async () => {
      try {
        const effectiveCanvasId = knowledgeCanvasId && knowledgeCanvasId !== "global"
          ? knowledgeCanvasId
          : "";
        const query = effectiveCanvasId ? `?canvasId=${encodeURIComponent(effectiveCanvasId)}` : "";
        const response = await fetch(`/api/knowledge-tree/graph${query}`);
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.graph) return;
        if (!cancelled) setKnowledgeGraph(result.graph as KnowledgeGraph);
      } catch {
        // ignore fetch failures
      }
    };
    void loadKnowledgeGraph();
    return () => {
      cancelled = true;
    };
  }, [showKnowledgeTree, knowledgeCanvasId]);

  useEffect(() => {
    if (!hasLoadedPrefsRef.current) return;
    try {
      window.localStorage.setItem(
        GRAPH_PREFS_KEY,
        JSON.stringify({
          query,
          showBotherings,
          showRoutines,
          showSpecializations,
          showPatterns,
          showProjects,
          showResources,
          showCanvases,
          showOrphans,
          showKnowledgeTree,
          knowledgeCanvasId,
          animate,
          showLabels,
          showArrows,
          pathMode,
          labelFadeZoom,
          nodeSize,
          linkThickness,
          repel,
          linkForce,
          linkDistance,
          center,
          panelOpen,
          zoom,
          panX: pan.x,
          panY: pan.y,
          selectedNodeId,
          positions: Array.from(positionsRef.current.entries()).map(([id, pos]) => ({
            id,
            x: Number(pos.x.toFixed(2)),
            y: Number(pos.y.toFixed(2)),
          })),
        })
      );
    } catch {
      // Ignore localStorage write failures.
    }
  }, [
    query,
    showBotherings,
    showRoutines,
    showSpecializations,
    showPatterns,
    showProjects,
    showResources,
    showCanvases,
    showOrphans,
    showKnowledgeTree,
    knowledgeCanvasId,
    animate,
    showLabels,
    showArrows,
    pathMode,
    labelFadeZoom,
    nodeSize,
    linkThickness,
    repel,
    linkForce,
    linkDistance,
    center,
    panelOpen,
    zoom,
    pan.x,
    pan.y,
    selectedNodeId,
  ]);

  const graph = useMemo(() => {
    if (showKnowledgeTree && knowledgeGraph) {
      return {
        nodes: knowledgeGraph.nodes.map((node) => ({
          id: node.id,
          label: node.label,
          type: "knowledge" as const,
        })),
        edges: knowledgeGraph.edges.map((edge) => ({
          id: edge.id,
          source: edge.from,
          target: edge.to,
          type: "knowledge" as const,
        })),
      };
    }
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();
    const botheringNodeIdByPointId = new Map<string, string>();
    const botheringNodeIdsByNormalizedText = new Map<string, string[]>();
    const botheringTypeByPointId = new Map<string, "External" | "Mismatch" | "Constraint">();
    const botheringPointByPointId = new Map<string, { sourceType: "External" | "Mismatch" | "Constraint"; linkedMismatchIds?: string[] }>();

    const addNode = (node: GraphNode) => {
      if (!nodes.has(node.id)) nodes.set(node.id, node);
    };
    const addEdge = (edge: GraphEdge) => {
      if (edge.source === edge.target) return;
      const existing = edges.get(edge.id);
      if (!existing) {
        edges.set(edge.id, edge.chainKey
          ? { ...edge, chainKeys: [edge.chainKey] }
          : edge
        );
        return;
      }
      if (edge.chainKey) {
        const mergedChainKeys = new Set([...(existing.chainKeys || []), ...(existing.chainKey ? [existing.chainKey] : []), edge.chainKey]);
        existing.chainKeys = Array.from(mergedChainKeys);
      }
    };

    const routineMap = new Map((settings.routines || []).map((r) => [r.id, r] as const));
    const routineByDetails = new Map(
      (settings.routines || []).map((r) => [normalizeText(r.details || ""), r.id] as const)
    );
    const specializationList = (coreSkills || []).filter((c) => c.type === "Specialization");

    BOTHERING_CARDS.forEach((group) => {
      const typeId = `btype:${group.label}`;
      addNode({ id: typeId, label: group.label, type: "bothering-type" });
      const card = (mindsetCards || []).find((c) => c.id === group.id);
      (card?.points || []).forEach((point) => {
        const pid = `bp:${group.label}:${point.id}`;
        const pointLabel = point.text || `${group.label} point`;
        addNode({ id: pid, label: pointLabel, type: "bothering" });
        botheringNodeIdByPointId.set(point.id, pid);
        const normalizedPointLabel = normalizeText(pointLabel);
        if (normalizedPointLabel) {
          const existing = botheringNodeIdsByNormalizedText.get(normalizedPointLabel) || [];
          existing.push(pid);
          botheringNodeIdsByNormalizedText.set(normalizedPointLabel, existing);
        }
        botheringTypeByPointId.set(point.id, group.label);
        botheringPointByPointId.set(point.id, { sourceType: group.label, linkedMismatchIds: point.linkedMismatchIds });
        addEdge({
          id: `edge:${typeId}->${pid}`,
          source: typeId,
          target: pid,
          type: "contains",
        });
        (point.tasks || []).forEach((task) => {
          const baseId = (task.activityId || task.id || "").replace(/_\d{4}-\d{2}-\d{2}$/, "");
          const routineId =
            (baseId && routineMap.has(baseId) ? baseId : "") ||
            routineByDetails.get(normalizeText(task.details || "")) ||
            "";
          if (!routineId) return;
          const routine = routineMap.get(routineId);
          if (!routine) return;
          const rid = `routine:${routine.id}`;
          addNode({ id: rid, label: routine.details || "Routine", type: "routine" });
          addEdge({
            id: `edge:${pid}->${rid}:${task.id}`,
            source: pid,
            target: rid,
            type: "linked-task",
          });
        });
      });
    });

    botheringPointByPointId.forEach((point, pointId) => {
      if (point.sourceType === "Mismatch") return;
      (point.linkedMismatchIds || []).forEach((mismatchId) => {
        const sourceId = botheringNodeIdByPointId.get(pointId);
        const targetId = botheringNodeIdByPointId.get(mismatchId);
        if (!sourceId || !targetId) return;
        if (botheringTypeByPointId.get(mismatchId) !== "Mismatch") return;
        addEdge({
          id: `edge:${sourceId}->${targetId}:mismatch-link`,
          source: sourceId,
          target: targetId,
          type: "mismatch-link",
        });
      });
    });

    (settings.routines || []).forEach((routine) => {
      const rid = `routine:${routine.id}`;
      addNode({ id: rid, label: routine.details || "Routine", type: "routine" });
      const source = settings.routineSourceOverrides?.[routine.id];
      if (source === "external" || source === "mismatch") {
        const sourceId = source === "external" ? "btype:External" : "btype:Mismatch";
        addEdge({
          id: `edge:${sourceId}->${rid}:source`,
          source: sourceId,
          target: rid,
          type: "routine-source",
        });
      }
    });

    specializationList.forEach((spec) => {
      const sid = `spec:${spec.id}`;
      addNode({ id: sid, label: spec.name, type: "specialization" });
      (spec.linkedResourceIds || []).forEach((resourceId) => {
        const resource = (resources || []).find((item) => item.id === resourceId);
        if (!resource) return;
        const resourceNodeId = `resource:${resource.id}`;
        addNode({ id: resourceNodeId, label: resource.name || "Resource", type: "resource" });
        addEdge({
          id: `edge:${sid}->${resourceNodeId}:linked-resource`,
          source: sid,
          target: resourceNodeId,
          type: "specialization-fit",
        });
      });
    });

    const addPatternChain = ({
      chainKey,
      mode,
      state,
      patternName,
      interpretation,
      causeNodeIds,
      signal,
      actionType,
      action,
      outcome,
    }: {
      chainKey: string;
      mode: "threat" | "growth";
      state?: string;
      patternName?: string;
      interpretation?: string;
      causeNodeIds?: string[];
      signal?: string;
      actionType?: string;
      action?: string;
      outcome?: string;
    }) => {
      const safeState = String(state || "").trim();
      const safePattern = String(patternName || "").trim();
      const safeInterpretation = String(interpretation || "").trim();
      const safeSignal = String(signal || "").trim();
      const safeAction = String(action || "").trim();
      const safeOutcome = String(outcome || "").trim();
      if (!safeState || !safePattern || !safeInterpretation || !safeSignal || !safeAction || !safeOutcome) return;

      const safeActionType = String(actionType || "").trim();
      const stage1Id = `pattern:${mode}:core:${normalizeText(`${safeState}|${safePattern}|${safeInterpretation}`)}`;
      const stage2Id = `pattern:${mode}:signal:${normalizeText(safeSignal)}`;
      const stage3Id = `pattern:${mode}:action:${normalizeText(`${safeActionType}|${safeAction}`)}`;
      const stage4Id = `pattern:${mode}:outcome:${normalizeText(safeOutcome)}`;

      addNode({
        id: stage1Id,
        label: `${safeState}\n${safePattern}\n${safeInterpretation}`,
        type: "pattern",
        mode,
      });
      addNode({ id: stage2Id, label: safeSignal, type: "pattern", mode });
      addNode({
        id: stage3Id,
        label: safeActionType ? `${safeActionType} + ${safeAction}` : safeAction,
        type: "pattern",
        mode,
      });
      addNode({ id: stage4Id, label: safeOutcome, type: "pattern", mode });

      (causeNodeIds || []).forEach((causeNodeId) => {
        addEdge({
          id: `edge:${causeNodeId}->${stage1Id}:pattern-cause`,
          source: causeNodeId,
          target: stage1Id,
          type: "pattern-flow",
          mode,
          chainKey,
        });
      });
      addEdge({ id: `edge:${stage1Id}->${stage2Id}`, source: stage1Id, target: stage2Id, type: "pattern-flow", mode, chainKey });
      addEdge({ id: `edge:${stage2Id}->${stage3Id}`, source: stage2Id, target: stage3Id, type: "pattern-flow", mode, chainKey });
      addEdge({ id: `edge:${stage3Id}->${stage4Id}`, source: stage3Id, target: stage4Id, type: "pattern-flow", mode, chainKey });
    };

    (patterns || []).forEach((pattern) => {
      const summary = getPatternPathSummary(pattern);
      const state = String(pattern.state || "").trim();
      const threatPattern = String(pattern.patternCategory || "").trim();
      const growthPattern = THREAT_TO_GROWTH_PATTERN[threatPattern] || "";
      const linkedCauseNodeIds = botheringNodeIdsByNormalizedText.get(normalizeText(String(pattern.sharedCause || ""))) || [];
      addPatternChain({
        chainKey: `${pattern.id}:threat`,
        mode: "threat",
        state,
        patternName: threatPattern,
        interpretation: THREAT_INTERPRETATION_BY_STATE[state] || "",
        causeNodeIds: linkedCauseNodeIds,
        signal: summary.threatSignal,
        actionType: pattern.actionType,
        action: summary.threatAction,
        outcome: summary.threatOutcome,
      });
      addPatternChain({
        chainKey: `${pattern.id}:growth`,
        mode: "growth",
        state,
        patternName: growthPattern,
        interpretation: GROWTH_INTERPRETATION_BY_STATE[state] || "",
        causeNodeIds: linkedCauseNodeIds,
        signal: summary.growthSignal,
        actionType: pattern.growthActionType,
        action: summary.growthAction,
        outcome: summary.growthOutcome,
      });
    });

    const projectById = new Map((projects || []).map((project) => [project.id, project] as const));
    const specById = new Map(specializationList.map((spec) => [spec.id, spec] as const));
    (kanbanBoards || []).forEach((board) => {
      const project =
        (board.projectId ? projectById.get(board.projectId) : undefined) ||
        (projects || []).find((item) => item.name === board.name);
      if (!project) return;

      const projectNodeId = `project:${project.id}`;
      addNode({ id: projectNodeId, label: project.name, type: "project" });

      if (board.specializationId && specById.has(board.specializationId)) {
        addEdge({
          id: `edge:spec:${board.specializationId}->${projectNodeId}:project`,
          source: `spec:${board.specializationId}`,
          target: projectNodeId,
          type: "project-board",
        });
      }

      const orderedLists = board.listOrder
        .map((listId) => board.lists.find((list) => list.id === listId))
        .filter((list): list is NonNullable<typeof board.lists[number]> => !!list)
        .concat(board.lists.filter((list) => !board.listOrder.includes(list.id)))
        .filter((list) => !list.archived)
        .sort((a, b) => a.position - b.position);

      orderedLists.forEach((list, index) => {
        const cardsForList = board.cards
          .filter((card) => card.listId === list.id && !card.archived)
          .sort((a, b) => a.position - b.position);

        cardsForList.forEach((card) => {
          const cardNodeId = `kanban-card:${board.id}:${card.id}`;
          addNode({ id: cardNodeId, label: `${list.title}: ${card.title || "Kanban Task"}`, type: "kanban-card" });
          addEdge({
            id: `edge:${projectNodeId}->${cardNodeId}:card`,
            source: projectNodeId,
            target: cardNodeId,
            type: "project-board",
          });
        });
      });
    });

    (settings.routines || []).forEach((routine) => {
      const rid = `routine:${routine.id}`;
      const routineName = normalizeText(routine.details || "");
      specializationList.forEach((spec) => {
        const specName = normalizeText(spec.name || "");
        if (!specName) return;
        if (!routineName.includes(specName) && !specName.includes(routineName)) return;
        addEdge({
          id: `edge:${rid}->spec:${spec.id}`,
          source: rid,
          target: `spec:${spec.id}`,
          type: "specialization-fit",
        });
      });
    });

    const canvasNodes: Array<{ id: string; label: string; resourceId: string; pointId: string; drawing?: string }> = [];
    (resources || []).forEach((resource) => {
      const resourceNodeId = `resource:${resource.id}`;
      (resource.points || []).forEach((point) => {
        if (point.type !== "paint") return;
        const cid = `canvas:${resource.id}:${point.id}`;
        const label = point.text || `${resource.name} canvas`;
        addNode({ id: cid, label, type: "canvas" });
        addNode({ id: resourceNodeId, label: resource.name || "Resource", type: "resource" });
        addEdge({
          id: `edge:${resourceNodeId}->${cid}:resource-canvas`,
          source: resourceNodeId,
          target: cid,
          type: "resource-canvas",
        });
        canvasNodes.push({ id: cid, label, resourceId: resource.id, pointId: point.id, drawing: point.drawing });
      });
    });

    canvasNodes.forEach((canvas) => {
      if (!canvas.drawing) return;
      try {
        const parsed = parseJsonWithRecovery<{ elements?: any[] }>(canvas.drawing);
        const elements = Array.isArray(parsed?.elements) ? parsed.elements : [];
        elements.forEach((el: any, i: number) => {
          const link = parseCanvasLink(el?.link);
          if (!link) return;
          const targetId = `canvas:${link.resourceId}:${link.pointId}`;
          if (!nodes.has(targetId)) return;
          addEdge({
            id: `edge:${canvas.id}->${targetId}:canvas:${i}`,
            source: canvas.id,
            target: targetId,
            type: "canvas-link",
          });
        });
      } catch {
        // ignore malformed canvas data
      }
    });

    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values()),
    };
  }, [showKnowledgeTree, knowledgeGraph, mindsetCards, settings.routines, settings.routineSourceOverrides, coreSkills, resources, projects, kanbanBoards, patterns]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    const nodeTypeAllowed = (type: GraphNodeType) => {
      if (type === "knowledge") return true;
      if (type === "bothering" || type === "bothering-type") return showBotherings;
      if (type === "routine") return showRoutines;
      if (type === "specialization") return showSpecializations;
      if (type === "pattern") return showPatterns;
      if (type === "project" || type === "kanban-card") return showProjects;
      if (type === "resource") return showResources;
      return showCanvases;
    };

    const nodes = graph.nodes.filter((n) => nodeTypeAllowed(n.type));
    const tempSet = new Set(nodes.map((n) => n.id));
    const edges = graph.edges.filter((e) => tempSet.has(e.source) && tempSet.has(e.target));
    const degree = new Map<string, number>();
    nodes.forEach((n) => degree.set(n.id, 0));
    edges.forEach((e) => {
      degree.set(e.source, (degree.get(e.source) || 0) + 1);
      degree.set(e.target, (degree.get(e.target) || 0) + 1);
    });
    const byOrphan = nodes.filter((n) => showOrphans || (degree.get(n.id) || 0) > 0);
    const byQuery = q
      ? byOrphan.filter((n) => normalizeText(n.label).includes(q) || normalizeText(n.id).includes(q))
      : byOrphan;
    const finalSet = new Set(byQuery.map((n) => n.id));
    const finalEdges = edges.filter((e) => finalSet.has(e.source) && finalSet.has(e.target));
    return { nodes: byQuery, edges: finalEdges };
  }, [graph, query, showBotherings, showRoutines, showSpecializations, showPatterns, showProjects, showResources, showCanvases, showOrphans]);

  const filteredNodeById = useMemo(() => new Map(filtered.nodes.map((n) => [n.id, n] as const)), [filtered.nodes]);
  const filteredDegreeById = useMemo(() => {
    const degree = new Map<string, number>();
    filtered.nodes.forEach((n) => degree.set(n.id, 0));
    filtered.edges.forEach((e) => {
      degree.set(e.source, (degree.get(e.source) || 0) + 1);
      degree.set(e.target, (degree.get(e.target) || 0) + 1);
    });
    return degree;
  }, [filtered.nodes, filtered.edges]);

  const graphInsights = useMemo(() => {
    const adjacency = new Map<string, Set<string>>();
    filtered.nodes.forEach((node) => adjacency.set(node.id, new Set()));
    filtered.edges.forEach((edge) => {
      adjacency.get(edge.source)?.add(edge.target);
      adjacency.get(edge.target)?.add(edge.source);
    });

    const ranked: NodeInsight[] = filtered.nodes
      .map((node) => ({
        id: node.id,
        label: node.label,
        type: node.type,
        degree: filteredDegreeById.get(node.id) || 0,
      }))
      .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label));

    const hubs = ranked.filter((node) => node.degree > 0).slice(0, 4);
    const looseEnds = ranked.filter((node) => node.degree <= 1).slice(0, 5);
    const orphans = ranked.filter((node) => node.degree === 0);

    const visited = new Set<string>();
    const components: Array<{ size: number; focus: string[] }> = [];
    filtered.nodes.forEach((node) => {
      if (visited.has(node.id)) return;
      const stack = [node.id];
      const component: string[] = [];
      visited.add(node.id);
      while (stack.length) {
        const current = stack.pop()!;
        component.push(current);
        (adjacency.get(current) || new Set()).forEach((neighbor) => {
          if (visited.has(neighbor)) return;
          visited.add(neighbor);
          stack.push(neighbor);
        });
      }
      components.push({
        size: component.length,
        focus: component
          .map((id) => filteredNodeById.get(id)?.label || id)
          .sort((a, b) => a.localeCompare(b))
          .slice(0, 3),
      });
    });
    components.sort((a, b) => b.size - a.size);

    const routinesWithoutSpec = filtered.nodes.filter((node) => {
      if (node.type !== "routine") return false;
      return !filtered.edges.some(
        (edge) =>
          edge.type === "specialization-fit" &&
          (edge.source === node.id || edge.target === node.id)
      );
    });

    const botheringsWithoutRoutine = filtered.nodes.filter((node) => {
      if (node.type !== "bothering") return false;
      return !filtered.edges.some(
        (edge) => edge.type === "linked-task" && (edge.source === node.id || edge.target === node.id)
      );
    });

    const specializationWithoutCanvas = filtered.nodes.filter((node) => {
      if (node.type !== "specialization") return false;
      return !filtered.edges.some(
        (edge) =>
          (edge.type === "spec-canvas" || edge.type === "specialization-fit") &&
          (edge.source === node.id || edge.target === node.id)
      );
    });

    const suggestions = [
      routinesWithoutSpec.length > 0
        ? `${routinesWithoutSpec.length} routines are not tied to any specialization, so the graph can't show whether your calendar reinforces your long-term bets.`
        : null,
      botheringsWithoutRoutine.length > 0
        ? `${botheringsWithoutRoutine.length} botherings have no linked routine, which means pain points are still sitting as observations instead of becoming interventions.`
        : null,
      specializationWithoutCanvas.length > 0
        ? `${specializationWithoutCanvas.length} specializations have no canvas/resource trail, so the graph shows intent but not working knowledge artifacts.`
        : null,
      components.length > 1
        ? `${components.length} disconnected clusters exist, which suggests your system is fragmented rather than forming a usable chain from issue -> routine -> specialization -> resource.`
        : null,
    ].filter(Boolean) as string[];

    return {
      hubs,
      looseEnds,
      orphans,
      components,
      suggestions,
    };
  }, [filtered.nodes, filtered.edges, filteredDegreeById, filteredNodeById]);

  const selectedNodeInsight = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = filteredNodeById.get(selectedNodeId);
    if (!node) return null;
    const neighborEdges = filtered.edges.filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId);
    const neighbors = neighborEdges
      .map((edge) => (edge.source === selectedNodeId ? edge.target : edge.source))
      .map((id) => filteredNodeById.get(id))
      .filter(Boolean) as GraphNode[];
    const byType = new Map<GraphNodeType, number>();
    neighbors.forEach((neighbor) => byType.set(neighbor.type, (byType.get(neighbor.type) || 0) + 1));

    let takeaway = `${node.label} has ${neighborEdges.length} visible connection${neighborEdges.length === 1 ? "" : "s"}.`;
    if (node.type === "bothering" && neighborEdges.every((edge) => edge.type !== "linked-task")) {
      takeaway = "This bothering is not connected to any routine, so it is diagnosis without an execution path.";
    } else if (node.type === "routine" && neighborEdges.every((edge) => edge.type !== "specialization-fit")) {
      takeaway = "This routine is active in the graph but not tied to a specialization, so it looks operational rather than strategic.";
    } else if (node.type === "specialization" && neighborEdges.every((edge) => edge.type !== "spec-canvas")) {
      takeaway = "This specialization has weak artifact coverage; it is named, but not backed by canvases or resource flow.";
    } else if (node.type === "resource" && neighborEdges.length <= 1) {
      takeaway = "This resource card is barely connected, so it is acting more like storage than part of a learning or execution chain.";
    }

    return {
      node,
      degree: filteredDegreeById.get(selectedNodeId) || 0,
      neighbors: neighbors.slice(0, 5),
      byType: Array.from(byType.entries()).sort((a, b) => b[1] - a[1]),
      takeaway,
    };
  }, [filtered.edges, filteredDegreeById, filteredNodeById, selectedNodeId]);

  const aiMatchedNodeIds = useMemo(() => {
    if (!aiInsights) return new Set<string>();
    const targetLabels = new Set(
      [
        ...aiInsights.clusters.flatMap((cluster) => cluster.nodeLabels || []),
        ...aiInsights.leverageNodes.map((item) => item.label),
      ]
        .map((label) => normalizeText(label))
        .filter(Boolean)
    );
    const matched = new Set<string>();
    filtered.nodes.forEach((node) => {
      const normalizedNodeLabel = normalizeText(node.label);
      for (const candidate of targetLabels) {
        if (
          normalizedNodeLabel === candidate ||
          normalizedNodeLabel.includes(candidate) ||
          candidate.includes(normalizedNodeLabel)
        ) {
          matched.add(node.id);
          break;
        }
      }
    });
    return matched;
  }, [aiInsights, filtered.nodes]);

  const aiMatchedEdgeIds = useMemo(() => {
    if (!aiInsights || aiMatchedNodeIds.size === 0) return new Set<string>();
    return new Set(
      filtered.edges
        .filter((edge) => aiMatchedNodeIds.has(edge.source) && aiMatchedNodeIds.has(edge.target))
        .map((edge) => edge.id)
    );
  }, [aiInsights, aiMatchedNodeIds, filtered.edges]);

  const handleGenerateAiInsights = useCallback(async () => {
    if (!isDesktopRuntime) return;
    if (!isAiEnabled) {
      toast({
        title: "AI not configured",
        description: "Choose a provider in Settings > AI Settings before generating graph insights.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingAiInsights(true);
    setAiInsightsError(null);
    try {
      const response = await fetch("/api/ai/graph-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-studio-desktop": "1",
        },
        body: JSON.stringify({
          aiConfig,
          graph: {
            nodeCount: filtered.nodes.length,
            edgeCount: filtered.edges.length,
            nodes: filtered.nodes.slice(0, 140).map((node) => ({
              id: node.id,
              label: node.label,
              type: node.type,
              degree: filteredDegreeById.get(node.id) || 0,
            })),
            edges: filtered.edges.slice(0, 220).map((edge) => ({
              source: filteredNodeById.get(edge.source)?.label || edge.source,
              target: filteredNodeById.get(edge.target)?.label || edge.target,
              type: edge.type,
            })),
            structuralFindings: {
              hubs: graphInsights.hubs.map((node) => ({ label: node.label, degree: node.degree })),
              looseEnds: graphInsights.looseEnds.map((node) => node.label),
              disconnectedClusters: graphInsights.components.length,
              systemGaps: graphInsights.suggestions,
            },
          },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(result?.details || result?.error || "Failed to generate AI graph insights."));
      }
      setAiInsights(result.insights as AiGraphInsights);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate AI graph insights.";
      setAiInsightsError(message);
      toast({
        title: "AI graph analysis failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAiInsights(false);
    }
  }, [aiConfig, filtered.nodes, filtered.edges, filteredDegreeById, filteredNodeById, graphInsights, isAiEnabled, isDesktopRuntime, toast]);

  const aiNarrationText = useMemo(() => {
    if (!aiInsights) return "";
    return cleanSpeechText(
      [
        aiInsights.overview,
        aiInsights.clusters.length
          ? `Main clusters: ${aiInsights.clusters
              .slice(0, 3)
              .map((cluster) => `${cluster.label}. ${cluster.summary}`)
              .join(" ")}`
          : "",
        aiInsights.leverageNodes.length
          ? `Key leverage nodes: ${aiInsights.leverageNodes
              .slice(0, 3)
              .map((item) => `${item.label}. ${item.reason}`)
              .join(" ")}`
          : "",
        aiInsights.blindSpots.length
          ? `Blind spots: ${aiInsights.blindSpots.slice(0, 3).join(" ")}`
          : "",
        aiInsights.nextActions.length
          ? `Recommended next actions: ${aiInsights.nextActions.slice(0, 3).join(" ")}`
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    );
  }, [aiInsights]);

  const stopAiNarration = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (speechAudioRef.current) {
      speechAudioRef.current.pause();
      speechAudioRef.current.currentTime = 0;
      speechAudioRef.current = null;
    }
    if (speechAudioUrlRef.current) {
      URL.revokeObjectURL(speechAudioUrlRef.current);
      speechAudioUrlRef.current = null;
    }
    speechRef.current = null;
    setIsSpeakingAiInsights(false);
  }, []);

  const readAiInsightsAloud = useCallback(async () => {
    if (!isDesktopRuntime) return;
    if (!aiNarrationText) return;
    const selectedCloudVoice = parseCloudVoiceURI(ttsVoiceURI);
    const hasExplicitSystemVoice = Boolean(ttsVoiceURI) && !selectedCloudVoice;
    const shouldUseCloud =
      Boolean(selectedCloudVoice) ||
      (!hasExplicitSystemVoice && ttsVoices.length === 0 && cloudVoices.length > 0);

    if (shouldUseCloud) {
      const cloudVoice = selectedCloudVoice || cloudVoices[0];
      if (!cloudVoice) return;
      stopAiNarration();
      setIsSpeakingAiInsights(true);
      try {
        const response = await fetch("/api/ai/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-studio-desktop": "1",
          },
          body: JSON.stringify({
            text: aiNarrationText,
            provider: cloudVoice.provider,
            voice: cloudVoice.id,
            speed: ttsRate,
            kokoroBaseUrl: settings.kokoroTtsBaseUrl,
            aiConfig,
          }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(String(result?.details || result?.error || "Cloud TTS failed."));
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        speechAudioUrlRef.current = url;
        const audio = new Audio(url);
        speechAudioRef.current = audio;
        audio.onended = () => stopAiNarration();
        audio.onerror = () => stopAiNarration();
        await audio.play();
        return;
      } catch (error) {
        stopAiNarration();
        toast({
          title: "Read aloud failed",
          description: error instanceof Error ? error.message : "Unable to read AI insights aloud.",
          variant: "destructive",
        });
        return;
      }
    }

    if (typeof window === "undefined" || !window.speechSynthesis) return;
    stopAiNarration();
    const utterance = new SpeechSynthesisUtterance(aiNarrationText);
    const selectedVoice = pickBestVoice(ttsVoices, ttsVoiceURI);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      utterance.lang = "en-US";
    }
    utterance.rate = ttsRate;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeakingAiInsights(true);
    utterance.onend = () => stopAiNarration();
    utterance.onerror = () => stopAiNarration();
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [aiConfig, aiNarrationText, cloudVoices, isDesktopRuntime, settings.kokoroTtsBaseUrl, stopAiNarration, toast, ttsRate, ttsVoiceURI, ttsVoices]);

  const highlighted = useMemo(() => {
    if (!selectedNodeId) {
      return {
        edgeIds: new Set<string>(),
        nodeIds: new Set<string>(),
      };
    }

    const selectedNode = filteredNodeById.get(selectedNodeId);
    if (pathMode && (selectedNode?.type === "bothering" || selectedNode?.type === "bothering-type")) {
      const outgoing = new Map<string, GraphEdge[]>();
      const incoming = new Map<string, GraphEdge[]>();
      filtered.edges.forEach((edge) => {
        const out = outgoing.get(edge.source);
        if (out) out.push(edge);
        else outgoing.set(edge.source, [edge]);
        const inc = incoming.get(edge.target);
        if (inc) inc.push(edge);
        else incoming.set(edge.target, [edge]);
      });

      const edgeIds = new Set<string>();
      const nodeIds = new Set<string>([selectedNodeId]);
      const queue: Array<{ nodeId: string; chainKey: string | null }> = [{ nodeId: selectedNodeId, chainKey: null }];
      const visited = new Set<string>([`${selectedNodeId}|root`]);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const nextEdges = [
          ...(outgoing.get(current.nodeId) || []),
          ...(incoming.get(current.nodeId) || []),
        ];
        nextEdges.forEach((edge) => {
          const neighborId = edge.source === current.nodeId ? edge.target : edge.source;
          if (edge.type === "pattern-flow") {
            const nextChainKeys = edge.chainKeys?.length
              ? edge.chainKeys
              : edge.chainKey
                ? [edge.chainKey]
                : [];
            if (nextChainKeys.length === 0) return;
            const allowedChainKeys = current.chainKey
              ? nextChainKeys.filter((key) => key === current.chainKey)
              : nextChainKeys;
            if (allowedChainKeys.length === 0) return;
            edgeIds.add(edge.id);
            nodeIds.add(edge.source);
            nodeIds.add(edge.target);
            allowedChainKeys.forEach((allowedChainKey) => {
              const visitKey = `${neighborId}|${allowedChainKey}`;
              if (!visited.has(visitKey)) {
                visited.add(visitKey);
                queue.push({ nodeId: neighborId, chainKey: allowedChainKey });
              }
            });
            return;
          }

          if (current.chainKey) return;
          edgeIds.add(edge.id);
          nodeIds.add(edge.source);
          nodeIds.add(edge.target);
          const visitKey = `${neighborId}|root`;
          if (!visited.has(visitKey)) {
            visited.add(visitKey);
            queue.push({ nodeId: neighborId, chainKey: null });
          }
        });
      }

      return { edgeIds, nodeIds };
    }

    if (pathMode && selectedNode?.type === "bothering-type") {
      const outgoing = new Map<string, GraphEdge[]>();
      filtered.edges.forEach((edge) => {
        const list = outgoing.get(edge.source);
        if (list) list.push(edge);
        else outgoing.set(edge.source, [edge]);
      });

      const edgeIds = new Set<string>();
      const nodeIds = new Set<string>([selectedNodeId]);
      const queue = [selectedNodeId];
      const visited = new Set<string>([selectedNodeId]);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const nextEdges = outgoing.get(currentId) || [];
        nextEdges.forEach((edge) => {
          edgeIds.add(edge.id);
          nodeIds.add(edge.source);
          nodeIds.add(edge.target);
          if (!visited.has(edge.target)) {
            visited.add(edge.target);
            queue.push(edge.target);
          }
        });
      }

      return { edgeIds, nodeIds };
    }

    if (pathMode && selectedNode?.type === "pattern") {
      const outgoing = new Map<string, GraphEdge[]>();
      const incoming = new Map<string, GraphEdge[]>();
      filtered.edges.forEach((edge) => {
        const out = outgoing.get(edge.source);
        if (out) out.push(edge);
        else outgoing.set(edge.source, [edge]);

        const inc = incoming.get(edge.target);
        if (inc) inc.push(edge);
        else incoming.set(edge.target, [edge]);
      });

      const edgeIds = new Set<string>();
      const nodeIds = new Set<string>([selectedNodeId]);
      const queue = [selectedNodeId];
      const visited = new Set<string>([selectedNodeId]);
      const selectedMode = selectedNode.mode;

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const nextEdges = [...(outgoing.get(currentId) || []), ...(incoming.get(currentId) || [])];
        nextEdges.forEach((edge) => {
          if (edge.type !== "pattern-flow") return;
          if (selectedMode && edge.mode && edge.mode !== selectedMode) return;
          edgeIds.add(edge.id);
          nodeIds.add(edge.source);
          nodeIds.add(edge.target);
          const neighborId = edge.source === currentId ? edge.target : edge.source;
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        });
      }

      Array.from(nodeIds).forEach((nodeId) => {
        (incoming.get(nodeId) || []).forEach((edge) => {
          if (edge.type === "pattern-flow") return;
          edgeIds.add(edge.id);
          nodeIds.add(edge.source);
          nodeIds.add(edge.target);
        });
      });

      return { edgeIds, nodeIds };
    }

    const edgeIds = new Set<string>();
    const nodeIds = new Set<string>([selectedNodeId]);
    filtered.edges.forEach((edge) => {
      if (edge.source === selectedNodeId || edge.target === selectedNodeId) {
        edgeIds.add(edge.id);
        nodeIds.add(edge.source);
        nodeIds.add(edge.target);
      }
    });
    return { edgeIds, nodeIds };
  }, [filtered.edges, filteredNodeById, pathMode, selectedNodeId]);

  const selectedPathInsight = useMemo(() => {
    if (!selectedNodeId) return null;
    const selectedNode = filteredNodeById.get(selectedNodeId);
    if (!selectedNode) return null;
    if (!(pathMode && (selectedNode.type === "bothering" || selectedNode.type === "bothering-type" || selectedNode.type === "pattern"))) return null;

    const collect = (type: GraphNodeType) =>
      Array.from(highlighted.nodeIds)
        .map((id) => filteredNodeById.get(id))
        .filter((node): node is GraphNode => !!node && node.type === type)
        .sort((a, b) => a.label.localeCompare(b.label));

    const sections: PathInsightSection[] = [
      { key: "botherings", label: "Botherings", nodes: collect("bothering") },
      { key: "routines", label: "Routine Tasks", nodes: collect("routine") },
      { key: "specializations", label: "Specializations", nodes: collect("specialization") },
      { key: "patterns", label: "Patterns", nodes: collect("pattern") },
      { key: "projects", label: "Projects", nodes: collect("project") },
      { key: "tasks", label: "Kanban Tasks", nodes: collect("kanban-card") },
      { key: "resources", label: "Resource Cards", nodes: collect("resource") },
      { key: "canvases", label: "Canvases", nodes: collect("canvas") },
    ].filter((section) => section.nodes.length > 0);

    const takeawayParts = [
      sections.find((section) => section.key === "routines")?.nodes.length
        ? `${sections.find((section) => section.key === "routines")!.nodes.length} routines activated`
        : null,
      sections.find((section) => section.key === "specializations")?.nodes.length
        ? `${sections.find((section) => section.key === "specializations")!.nodes.length} specializations touched`
        : null,
      sections.find((section) => section.key === "patterns")?.nodes.length
        ? `${sections.find((section) => section.key === "patterns")!.nodes.length} pattern nodes in chain`
        : null,
      sections.find((section) => section.key === "projects")?.nodes.length
        ? `${sections.find((section) => section.key === "projects")!.nodes.length} projects affected`
        : null,
      sections.find((section) => section.key === "tasks")?.nodes.length
        ? `${sections.find((section) => section.key === "tasks")!.nodes.length} delivery tasks visible`
        : null,
      sections.find((section) => section.key === "resources")?.nodes.length
        ? `${sections.find((section) => section.key === "resources")!.nodes.length} resources in play`
        : null,
      sections.find((section) => section.key === "canvases")?.nodes.length
        ? `${sections.find((section) => section.key === "canvases")!.nodes.length} canvases downstream`
        : null,
    ].filter(Boolean);

    return {
      root: selectedNode,
      sections,
      takeaway: takeawayParts.length > 0 ? takeawayParts.join(" | ") : "No downstream chain is visible for this selection yet.",
    };
  }, [filteredNodeById, highlighted.nodeIds, pathMode, selectedNodeId]);

  const anchorForType = useCallback(
    (type: GraphNodeType) => {
      const w = size.width;
      const h = size.height;
      const xByColumn = [w * 0.1, w * 0.28, w * 0.46, w * 0.66, w * 0.86];
      const column = logicalColumnForType(type);
      const centerY = h * 0.48;
      if (type === "bothering-type") return { x: xByColumn[column], y: centerY - h * 0.06 };
      if (type === "bothering") return { x: xByColumn[column], y: centerY };
      if (type === "routine") return { x: xByColumn[column], y: centerY };
      if (type === "specialization") return { x: xByColumn[column], y: centerY };
      if (type === "pattern") return { x: xByColumn[column], y: centerY };
      if (type === "project") return { x: xByColumn[column], y: centerY - h * 0.035 };
      if (type === "kanban-card") return { x: xByColumn[column], y: centerY };
      if (type === "resource") return { x: xByColumn[column], y: centerY + h * 0.035 };
      return { x: xByColumn[column], y: centerY + h * 0.07 };
    },
    [size.width, size.height]
  );

  const hierarchicalParentByNodeId = useMemo(() => {
    const parents = new Map<string, string>();
    filtered.edges.forEach((edge) => {
      if (!isHierarchicalEdge(edge.type)) return;
      const parent = filteredNodeById.get(edge.source);
      const child = filteredNodeById.get(edge.target);
      if (!parent || !child) return;
      if (logicalColumnForType(parent.type) !== logicalColumnForType(child.type)) return;
      if (!parents.has(edge.target)) parents.set(edge.target, edge.source);
    });
    return parents;
  }, [filtered.edges, filteredNodeById]);

  const hierarchicalChildrenByParentId = useMemo(() => {
    const children = new Map<string, GraphNode[]>();
    hierarchicalParentByNodeId.forEach((parentId, childId) => {
      const child = filteredNodeById.get(childId);
      if (!child) return;
      const list = children.get(parentId) || [];
      list.push(child);
      children.set(parentId, list);
    });
    children.forEach((list, parentId) => {
      children.set(parentId, [...list].sort((a, b) => a.label.localeCompare(b.label)));
    });
    return children;
  }, [filteredNodeById, hierarchicalParentByNodeId]);

  const getBranchTarget = useCallback(
    (node: GraphNode) => {
      const parentId = hierarchicalParentByNodeId.get(node.id);
      if (!parentId) return null;
      const parentNode = filteredNodeById.get(parentId);
      const siblings = hierarchicalChildrenByParentId.get(parentId) || [];
      if (!parentNode || siblings.length === 0) return null;

      const siblingCount = siblings.length;
      const index = siblings.findIndex((child) => child.id === node.id);
      if (index < 0) return null;

      const parentPos = positionsRef.current.get(parentNode.id);
      const parentAnchor = parentPos || anchorForType(parentNode.type);
      const baseRotation = seededUnit(`${parentNode.id}:rotation`) * Math.PI * 2;
      const firstRingCount = Math.min(8, siblingCount);
      const ringIndex = index < firstRingCount ? 0 : 1 + Math.floor((index - firstRingCount) / 10);
      const ringStart = ringIndex === 0 ? 0 : firstRingCount + (ringIndex - 1) * 10;
      const nodesInRing = ringIndex === 0 ? firstRingCount : Math.min(10, siblingCount - ringStart);
      const slotIndex = index - ringStart;
      const angle = baseRotation + (slotIndex / Math.max(1, nodesInRing)) * Math.PI * 2;
      const radius =
        (node.type === "bothering"
          ? 118
          : node.type === "routine"
            ? 102
            : node.type === "kanban-card" || node.type === "canvas"
              ? 92
              : 96) + ringIndex * 56;
      const radialJitter = (seededUnit(`${parentNode.id}:${node.id}:radius`) - 0.5) * 12;

      const target = {
        x: parentAnchor.x + Math.cos(angle) * (radius + radialJitter),
        y: parentAnchor.y + Math.sin(angle) * (radius + radialJitter),
      };
      if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return null;
      return target;
    },
    [anchorForType, filteredNodeById, hierarchicalChildrenByParentId, hierarchicalParentByNodeId]
  );

  const laneOffsetForNode = useCallback(
    (node: GraphNode) => {
      const branchTarget = getBranchTarget(node);
      if (branchTarget) {
        return branchTarget;
      }
      const anchor = anchorForType(node.type);
      const ux = seededUnit(`${node.id}:x`) - 0.5;
      const uy = seededUnit(`${node.id}:y`) - 0.5;
      const bandX =
        node.type === "bothering-type"
          ? size.width * 0.04
          : node.type === "bothering" || node.type === "routine" || node.type === "specialization"
            ? size.width * 0.055
            : size.width * 0.06;
      const bandY =
        node.type === "bothering-type"
          ? size.height * 0.08
          : node.type === "bothering" || node.type === "routine"
            ? size.height * 0.24
            : node.type === "specialization"
              ? size.height * 0.2
              : size.height * 0.18;

      const target = {
        x: anchor.x + ux * bandX * 2,
        y: anchor.y + uy * bandY * 2,
      };
      if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) {
        return {
          x: Number.isFinite(anchor.x) ? anchor.x : size.width / 2,
          y: Number.isFinite(anchor.y) ? anchor.y : size.height / 2,
        };
      }
      return target;
    },
    [anchorForType, getBranchTarget, size.height, size.width]
  );

  const fitGraphToViewport = useCallback(() => {
    if (filtered.nodes.length === 0) return;
    const map = positionsRef.current;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    filtered.nodes.forEach((n) => {
      const p = map.get(n.id);
      if (!p) return;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return;
    const padding = 80;
    const worldW = Math.max(1, maxX - minX + padding * 2);
    const worldH = Math.max(1, maxY - minY + padding * 2);
    const fitZoom = Math.max(0.3, Math.min(2.6, Math.min(size.width / worldW, size.height / worldH)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setZoom(fitZoom);
    setPan({
      x: size.width / 2 - centerX * fitZoom,
      y: size.height / 2 - centerY * fitZoom,
    });
  }, [filtered.nodes, size.width, size.height]);

  useEffect(() => {
    const map = positionsRef.current;
    filtered.nodes.forEach((node, i) => {
      if (map.has(node.id)) return;
      const target = laneOffsetForNode(node);
      const angle = (i / Math.max(1, filtered.nodes.length)) * Math.PI * 2;
      const orbit = 34 + (hashString(`${node.id}:orbit`) % 56);
      map.set(node.id, {
        x: target.x + Math.cos(angle) * orbit,
        y: target.y + Math.sin(angle) * orbit,
        vx: 0,
        vy: 0,
      });
    });
    Array.from(map.keys()).forEach((key) => {
      if (!filtered.nodes.some((n) => n.id === key)) map.delete(key);
    });
    filtered.nodes.forEach((n) => {
      const pos = map.get(n.id);
      if (!pos) return;
      // Keep existing positions; don't clamp so users can pan an effectively infinite graph.
      if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
        pos.x = size.width / 2;
        pos.y = size.height / 2;
      }
    });
  }, [filtered.nodes, laneOffsetForNode, size.width, size.height]);

  useEffect(() => {
    let raf = 0;
    const tick = (time: number) => {
      if (!animate || filtered.nodes.length === 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const elapsed = time - lastStepTimeRef.current;
      if (elapsed < 1000 / 30) {
        raf = requestAnimationFrame(tick);
        return;
      }
      lastStepTimeRef.current = time;

      const map = positionsRef.current;
      const nodeIds = filtered.nodes.map((n) => n.id);
      const mass = 1;
      const repulsionStride = nodeIds.length > 280 ? 4 : nodeIds.length > 180 ? 3 : nodeIds.length > 120 ? 2 : 1;

      for (let i = 0; i < nodeIds.length; i += 1) {
        const a = map.get(nodeIds[i]);
        if (!a) continue;
        for (let j = i + 1; j < nodeIds.length; j += repulsionStride) {
          const b = map.get(nodeIds[j]);
          if (!b) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = Math.max(16, dx * dx + dy * dy);
          const force = repel / distSq;
          const fx = (dx / Math.sqrt(distSq)) * force;
          const fy = (dy / Math.sqrt(distSq)) * force;
          a.vx += fx / mass;
          a.vy += fy / mass;
          b.vx -= fx / mass;
          b.vy -= fy / mass;
        }
      }

      filtered.edges.forEach((edge) => {
        const a = map.get(edge.source);
        const b = map.get(edge.target);
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const diff = dist - linkDistance;
        const k = linkForce * edgeForceMultiplier(edge.type);
        const fx = (dx / dist) * diff * k;
        const fy = (dy / dist) * diff * k;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      });

      const collisionStride = nodeIds.length > 240 ? 2 : 1;
      for (let i = 0; i < nodeIds.length; i += 1) {
        const aId = nodeIds[i];
        const a = map.get(aId);
        if (!a) continue;
        const aNode = filteredNodeById.get(aId);
        const aR = nodeSize + (aNode?.type === "bothering-type" ? 4 : 0);
        for (let j = i + 1; j < nodeIds.length; j += collisionStride) {
          const bId = nodeIds[j];
          const b = map.get(bId);
          if (!b) continue;
          const bNode = filteredNodeById.get(bId);
          const bR = nodeSize + (bNode?.type === "bothering-type" ? 4 : 0);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
          const sameTypeBoost = aNode?.type === bNode?.type ? 28 : 16;
          const minDist = aR + bR + sameTypeBoost;
          if (dist >= minDist) continue;
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          a.vx -= nx * overlap * 0.02;
          a.vy -= ny * overlap * 0.02;
          b.vx += nx * overlap * 0.02;
          b.vy += ny * overlap * 0.02;
        }
      }

      const cx = size.width / 2;
      const cy = size.height / 2;
      filtered.nodes.forEach((node) => {
        const p = map.get(node.id);
        if (!p) return;
        if (dragStateRef.current.mode === "node" && dragStateRef.current.nodeId === node.id) {
          p.vx = 0;
          p.vy = 0;
          return;
        }
        const anchor = anchorForType(node.type);
        const laneTarget = laneOffsetForNode(node);
        const hasHierarchicalParent = hierarchicalParentByNodeId.has(node.id);
        const hierarchicalChildren = hierarchicalChildrenByParentId.get(node.id) || [];
        const isHierarchicalParent = hierarchicalChildren.length > 0;
        const anchorStrength = hasHierarchicalParent ? 0.00004 : 0.00018;
        const laneStrength = hasHierarchicalParent ? 0.00175 : 0.00072;
        const centerStrength = hasHierarchicalParent ? center * 0.1 : center;

        if (isHierarchicalParent) {
          const childTargets = hierarchicalChildren
            .map((child) => getBranchTarget(child))
            .filter((target): target is { x: number; y: number } => !!target);
          if (childTargets.length > 0) {
            const centroid = childTargets.reduce(
              (acc, target) => ({ x: acc.x + target.x, y: acc.y + target.y }),
              { x: 0, y: 0 }
            );
            centroid.x /= childTargets.length;
            centroid.y /= childTargets.length;
            p.vx += (p.x - centroid.x) * 0.0009;
            p.vy += (p.y - centroid.y) * 0.0009;
          }
        }

        if (!isHierarchicalParent) {
          p.vx += (anchor.x - p.x) * anchorStrength;
          p.vy += (anchor.y - p.y) * anchorStrength;
        }
        p.vx += (laneTarget.x - p.x) * laneStrength;
        p.vy += (laneTarget.y - p.y) * laneStrength;
        if (!isHierarchicalParent) {
          p.vx += (cx - p.x) * centerStrength;
          p.vy += (cy - p.y) * centerStrength;
        }
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.x += p.vx;
        p.y += p.vy;
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) {
          const fallback = laneOffsetForNode(node);
          p.x = Number.isFinite(fallback.x) ? fallback.x : cx;
          p.y = Number.isFinite(fallback.y) ? fallback.y : cy;
          p.vx = 0;
          p.vy = 0;
        }
      });

      setFrame((v) => (v + 1) % 100000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, filtered.nodes, filtered.edges, filteredNodeById, getBranchTarget, repel, linkDistance, center, size.width, size.height, nodeSize, anchorForType, hierarchicalChildrenByParentId, hierarchicalParentByNodeId, laneOffsetForNode, linkForce]);

  const visibleLabelIds = useMemo(() => {
    if (!showLabels) return new Set<string>();

    const ordered = filtered.nodes
      .map((node) => {
        const pos = positionsRef.current.get(node.id);
        const degree = filteredDegreeById.get(node.id) || 0;
        const active = highlighted.nodeIds.has(node.id);
        const aiActive = aiMatchedNodeIds.has(node.id);
        const forced = active || aiActive || selectedNodeId === node.id || hoveredNodeId === node.id;
        return { node, pos, degree, active, aiActive, forced };
      })
      .filter((entry): entry is typeof entry & { pos: Position } => !!entry.pos)
      .sort((a, b) => {
        const priorityA = (a.forced ? 1000 : 0) + a.degree;
        const priorityB = (b.forced ? 1000 : 0) + b.degree;
        return priorityB - priorityA;
      });

    const placed: Array<{ left: number; right: number; top: number; bottom: number }> = [];
    const visible = new Set<string>();

    ordered.forEach(({ node, pos, degree, forced }) => {
      const neighborCount = filtered.nodes.reduce((count, other) => {
        if (other.id === node.id) return count;
        const otherPos = positionsRef.current.get(other.id);
        if (!otherPos) return count;
        const dx = (otherPos.x - pos.x) * zoom;
        const dy = (otherPos.y - pos.y) * zoom;
        return dx * dx + dy * dy < 110 * 110 ? count + 1 : count;
      }, 0);
      const shouldConsider = forced || zoom >= labelFadeZoom || (degree >= 7 && neighborCount <= 4);
      if (!shouldConsider) return;

      const radius = nodeSize + (node.type === "bothering-type" ? 3 : 0);
      const screenX = pos.x * zoom + pan.x;
      const screenY = pos.y * zoom + pan.y;
      const labelAbove = screenY < size.height / 2;
      const text = node.label.length > 42 ? `${node.label.slice(0, 42)}...` : node.label;
      const width = estimateLabelWidth(text) + 18;
      const height = 24;
      const offsetY = labelAbove ? -(radius + 24) : radius + 10;
      const bounds = {
        left: screenX - width / 2,
        right: screenX + width / 2,
        top: screenY + offsetY - (labelAbove ? height : 0),
        bottom: screenY + offsetY + (labelAbove ? 0 : height),
      };

      const overlaps = placed.some(
        (placedBounds) =>
          bounds.left < placedBounds.right &&
          bounds.right > placedBounds.left &&
          bounds.top < placedBounds.bottom &&
          bounds.bottom > placedBounds.top
      );

      if ((!overlaps && neighborCount <= 6) || forced) {
        visible.add(node.id);
        placed.push(bounds);
      }
    });

    return visible;
  }, [
    aiMatchedNodeIds,
    filtered.nodes,
    filteredDegreeById,
    highlighted.nodeIds,
    hoveredNodeId,
    labelFadeZoom,
    nodeSize,
    pan.x,
    pan.y,
    selectedNodeId,
    showLabels,
    size.height,
    zoom,
  ]);

  useEffect(() => {
    if (!hasRestoredGraphViewRef.current) return;
    if (shouldSkipInitialFitRef.current) {
      shouldSkipInitialFitRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      fitGraphToViewport();
    }, 60);
    return () => window.clearTimeout(t);
  }, [filtered.nodes.length, filtered.edges.length, fitGraphToViewport]);

  const screenToWorld = (screenX: number, screenY: number) => {
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom,
    };
  };

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (dragStateRef.current.mode === "node") {
      const world = screenToWorld(screenX, screenY);
      const pos = positionsRef.current.get(dragStateRef.current.nodeId);
      if (!pos) return;
      pos.x = world.x;
      pos.y = world.y;
      pos.vx = 0;
      pos.vy = 0;
      setFrame((v) => (v + 1) % 100000);
      return;
    }

    if (dragStateRef.current.mode === "pan") {
      const dx = screenX - dragStateRef.current.startX;
      const dy = screenY - dragStateRef.current.startY;
      setPan({ x: dragStateRef.current.startPanX + dx, y: dragStateRef.current.startPanY + dy });
    }
  };

  const onMouseUp = () => {
    dragStateRef.current = { mode: "none" };
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldBefore = screenToWorld(screenX, screenY);
    const zoomDelta = e.deltaY > 0 ? 0.92 : 1.09;
    const nextZoom = Math.max(0.3, Math.min(2.6, zoom * zoomDelta));
    const nextPan = {
      x: screenX - worldBefore.x * nextZoom,
      y: screenY - worldBefore.y * nextZoom,
    };
    setZoom(nextZoom);
    setPan(nextPan);
  };

  return (
    <div className="h-[calc(100vh-4rem)] p-4">
      <Card className="h-full min-h-0 overflow-hidden">
        <CardContent className="h-full p-0">
          <div ref={containerRef} className="relative h-full w-full bg-[#17191f]">
            <div
              className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md border border-white/10 bg-black/70 p-1"
            >
              <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.max(0.3, Number((z * 0.9).toFixed(2))))}>
                -
              </Button>
              <div className="w-14 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</div>
              <Button size="sm" variant="ghost" onClick={() => setZoom((z) => Math.min(2.6, Number((z * 1.1).toFixed(2))))}>
                +
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                Reset
              </Button>
              <Button size="sm" variant="ghost" onClick={fitGraphToViewport}>
                Fit
              </Button>
              {aiInsights ? (
                <div className="rounded-md border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-100">
                  AI overlay
                </div>
              ) : null}
            </div>
            <div className="absolute right-3 top-3 z-20">
              <div className="flex items-center gap-2">
                {showDesktopOnlyUi ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
                    onClick={handleGenerateAiInsights}
                    disabled={isGeneratingAiInsights}
                  >
                    {isGeneratingAiInsights ? "Thinking..." : "AI"}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="secondary"
                  className="border border-white/15 bg-black/70 text-zinc-100 hover:bg-black/80"
                  onClick={() => setPanelOpen((open) => !open)}
                >
                  {panelOpen ? "Hide Filters" : "Show Filters"}
                </Button>
              </div>
            </div>
            {panelOpen ? (
              <div className="absolute right-3 top-14 z-20 max-h-[calc(100%-1.5rem)] w-[300px] overflow-auto rounded-xl border border-white/15 bg-black/72 p-4 backdrop-blur-md">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-base font-semibold text-zinc-100">Filters</div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-zinc-200" onClick={() => setPanelOpen(false)}>
                    x
                  </Button>
                </div>
                <div className="space-y-4">
                  <Input
                    placeholder="Search nodes..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="border-white/20 bg-black/30 text-zinc-100 placeholder:text-zinc-400"
                  />
                  <div className="space-y-2 text-zinc-100">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={showKnowledgeTree} onCheckedChange={(v) => setShowKnowledgeTree(!!v)} id="f-k" />
                      <Label htmlFor="f-k">Knowledge Tree</Label>
                    </div>
                    {showKnowledgeTree ? (
                      <div className="flex items-center gap-2 pl-6">
                        <Label htmlFor="knowledge-canvas" className="text-xs text-zinc-400">Knowledge source</Label>
                        <select
                          id="knowledge-canvas"
                          value={knowledgeCanvasId}
                          onChange={(e) => setKnowledgeCanvasId(e.target.value)}
                          className="h-7 w-full rounded-md border border-white/15 bg-black/40 px-2 text-xs text-zinc-100"
                        >
                          <option value="global">Global (unlinked)</option>
                          {knowledgeCanvasOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <Checkbox checked={showBotherings} onCheckedChange={(v) => setShowBotherings(!!v)} id="f-b" />
                      <Label htmlFor="f-b">Botherings</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={showRoutines} onCheckedChange={(v) => setShowRoutines(!!v)} id="f-r" />
                      <Label htmlFor="f-r">Routines</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={showSpecializations} onCheckedChange={(v) => setShowSpecializations(!!v)} id="f-s" />
                      <Label htmlFor="f-s">Specializations</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={showPatterns} onCheckedChange={(v) => setShowPatterns(!!v)} id="f-pt" />
                      <Label htmlFor="f-pt">Patterns</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={showProjects} onCheckedChange={(v) => setShowProjects(!!v)} id="f-pj" />
                      <Label htmlFor="f-pj">Projects + Kanban</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={showResources} onCheckedChange={(v) => setShowResources(!!v)} id="f-rs" />
                      <Label htmlFor="f-rs">Resource Cards</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={showCanvases} onCheckedChange={(v) => setShowCanvases(!!v)} id="f-c" />
                      <Label htmlFor="f-c">Canvases</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={showOrphans} onCheckedChange={(v) => setShowOrphans(!!v)} id="f-o" />
                      <Label htmlFor="f-o">Orphans</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={animate} onCheckedChange={(v) => setAnimate(!!v)} id="f-a" />
                      <Label htmlFor="f-a">Animate</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={showLabels} onCheckedChange={(v) => setShowLabels(!!v)} id="f-l" />
                      <Label htmlFor="f-l">Labels</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={showArrows} onCheckedChange={(v) => setShowArrows(!!v)} id="f-ar" />
                      <Label htmlFor="f-ar">Arrows</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={pathMode} onCheckedChange={(v) => setPathMode(!!v)} id="f-pm" />
                      <Label htmlFor="f-pm">Path mode</Label>
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-zinc-400">
                    Path mode highlights the downstream chain when the selected node is a bothering or pattern node.
                  </p>

                  <div className="space-y-3 text-zinc-200">
                    <div>
                      <div className="mb-1 text-xs text-zinc-400">Text fade threshold</div>
                      <input type="range" min={0.7} max={1.8} step={0.05} value={labelFadeZoom} onChange={(e) => setLabelFadeZoom(Number(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-zinc-400">Node size</div>
                      <input type="range" min={3} max={10} value={nodeSize} onChange={(e) => setNodeSize(Number(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-zinc-400">Link thickness</div>
                      <input type="range" min={0.8} max={3} step={0.1} value={linkThickness} onChange={(e) => setLinkThickness(Number(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-zinc-400">Repel force</div>
                      <input type="range" min={400} max={2600} step={50} value={repel} onChange={(e) => setRepel(Number(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-zinc-400">Link force</div>
                      <input type="range" min={0.001} max={0.015} step={0.0005} value={linkForce} onChange={(e) => setLinkForce(Number(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-zinc-400">Link distance</div>
                      <input type="range" min={60} max={260} step={5} value={linkDistance} onChange={(e) => setLinkDistance(Number(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-zinc-400">Center force</div>
                      <input type="range" min={0.001} max={0.03} step={0.001} value={center} onChange={(e) => setCenter(Number(e.target.value))} className="w-full" />
                    </div>
                  </div>

                  <div className={cn("rounded-md border border-white/20 bg-black/25 p-3 text-xs text-zinc-300")}>
                    <div>Nodes: {filtered.nodes.length}</div>
                    <div>Links: {filtered.edges.length}</div>
                  </div>

                  <div className="space-y-3 rounded-md border border-white/20 bg-black/25 p-3 text-sm text-zinc-200">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Insights</div>
                    <div>
                      <div className="mb-1 text-xs text-zinc-400">Top hubs</div>
                      <div className="space-y-1 text-xs">
                        {graphInsights.hubs.length > 0 ? graphInsights.hubs.map((node) => (
                          <div key={node.id} className="flex items-start justify-between gap-2">
                            <span className="min-w-0 truncate">{node.label}</span>
                            <span className="flex-shrink-0 text-zinc-500">{node.degree}</span>
                          </div>
                        )) : <div className="text-zinc-500">No connected hubs yet.</div>}
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-zinc-400">Loose ends</div>
                      <div className="space-y-1 text-xs">
                        {graphInsights.looseEnds.length > 0 ? graphInsights.looseEnds.map((node) => (
                          <div key={node.id} className="truncate text-zinc-300">
                            {node.label}
                          </div>
                        )) : <div className="text-zinc-500">No loose ends in current view.</div>}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-300">
                      {graphInsights.components.length} clusters
                      {graphInsights.components[0]?.focus.length ? ` | largest cluster starts around ${graphInsights.components[0].focus.join(", ")}` : ""}
                    </div>
                    <div>
                      <div className="mb-1 text-xs text-zinc-400">What this graph is saying</div>
                      <div className="space-y-2 text-xs leading-5 text-zinc-300">
                        {graphInsights.suggestions.length > 0 ? graphInsights.suggestions.slice(0, 3).map((item, index) => (
                          <p key={index}>{item}</p>
                        )) : <p>The current graph is well-connected enough that no obvious structural gaps stand out in this filtered view.</p>}
                      </div>
                    </div>
                  </div>

                  {showDesktopOnlyUi ? (
                    <div className="space-y-3 rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-zinc-200">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">AI Analysis</div>
                        <div className="flex items-center gap-2">
                          {aiInsights ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-cyan-100 hover:bg-cyan-500/10"
                              onClick={() => {
                                if (isSpeakingAiInsights) {
                                  stopAiNarration();
                                } else {
                                  void readAiInsightsAloud();
                                }
                              }}
                            >
                              {isSpeakingAiInsights ? "Stop" : "Read aloud"}
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-cyan-100 hover:bg-cyan-500/10"
                            onClick={handleGenerateAiInsights}
                            disabled={isGeneratingAiInsights}
                          >
                            {isGeneratingAiInsights ? "Thinking..." : aiInsights ? "Refresh" : "Generate"}
                          </Button>
                        </div>
                      </div>
                      {aiInsightsError ? (
                        <p className="text-xs leading-5 text-rose-300">{aiInsightsError}</p>
                      ) : aiInsights ? (
                        <div className="space-y-3">
                          <p className="text-xs leading-5 text-zinc-300">{aiInsights.overview}</p>
                          {aiInsights.clusters.length > 0 ? (
                            <div>
                              <div className="mb-1 text-xs text-zinc-400">Clusters</div>
                              <div className="space-y-2">
                                {aiInsights.clusters.slice(0, 3).map((cluster, index) => (
                                  <div key={`${cluster.label}-${index}`} className="rounded-md border border-white/10 bg-black/20 p-2">
                                    <div className="text-xs font-medium text-zinc-100">{cluster.label}</div>
                                    <p className="mt-1 text-xs leading-5 text-zinc-300">{cluster.summary}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {aiInsights.leverageNodes.length > 0 ? (
                            <div>
                              <div className="mb-1 text-xs text-zinc-400">Leverage nodes</div>
                              <div className="space-y-2">
                                {aiInsights.leverageNodes.slice(0, 3).map((item, index) => (
                                  <div key={`${item.label}-${index}`} className="text-xs leading-5 text-zinc-300">
                                    <span className="font-medium text-zinc-100">{item.label}:</span> {item.reason}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {aiInsights.blindSpots.length > 0 ? (
                            <div>
                              <div className="mb-1 text-xs text-zinc-400">Blind spots</div>
                              <div className="space-y-1">
                                {aiInsights.blindSpots.slice(0, 3).map((item, index) => (
                                  <p key={index} className="text-xs leading-5 text-zinc-300">{item}</p>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {aiInsights.nextActions.length > 0 ? (
                            <div>
                              <div className="mb-1 text-xs text-zinc-400">Suggested next actions</div>
                              <div className="space-y-1">
                                {aiInsights.nextActions.slice(0, 3).map((item, index) => (
                                  <p key={index} className="text-xs leading-5 text-zinc-300">{item}</p>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs leading-5 text-zinc-400">
                          Generate a desktop-only AI read of this graph to surface latent clusters, leverage nodes, and structural blind spots.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {selectedNodeInsight ? (
                    <div className="space-y-2 rounded-md border border-white/20 bg-black/25 p-3 text-sm text-zinc-200">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">Selected Node</div>
                      <div className="font-medium text-zinc-100">{selectedNodeInsight.node.label}</div>
                      <div className="text-xs text-zinc-400">
                        {selectedNodeInsight.degree} visible links
                      </div>
                      <p className="text-xs leading-5 text-zinc-300">{selectedNodeInsight.takeaway}</p>
                      {selectedNodeInsight.byType.length > 0 ? (
                        <div className="flex flex-wrap gap-2 text-[11px] text-zinc-300">
                          {selectedNodeInsight.byType.map(([type, count]) => (
                            <span key={type} className="rounded-md border border-white/15 px-2 py-1">
                              {type}: {count}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {selectedNodeInsight.neighbors.length > 0 ? (
                        <div className="space-y-1 text-xs text-zinc-300">
                          <div className="text-zinc-400">Connected to</div>
                          {selectedNodeInsight.neighbors.map((neighbor) => (
                            <div key={neighbor.id} className="truncate">
                              {neighbor.label}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedPathInsight ? (
                    <div className="space-y-3 rounded-md border border-cyan-400/20 bg-cyan-500/5 p-3 text-sm text-zinc-200">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Path Insight</div>
                      <div>
                        <div className="font-medium text-zinc-100">{selectedPathInsight.root.label}</div>
                        <p className="mt-1 text-xs leading-5 text-zinc-300">{selectedPathInsight.takeaway}</p>
                      </div>
                      <div className="space-y-2">
                        {selectedPathInsight.sections.map((section) => (
                          <div key={section.key} className="rounded-md border border-white/10 bg-black/20 p-2">
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-zinc-200">{section.label}</span>
                              <span className="text-zinc-500">{section.nodes.length}</span>
                            </div>
                            <div className="space-y-1">
                              {section.nodes.slice(0, 6).map((node) => (
                                <button
                                  key={node.id}
                                  type="button"
                                  className="block w-full truncate text-left text-xs text-zinc-300 hover:text-cyan-200"
                                  onClick={() => setSelectedNodeId(node.id)}
                                  title={node.label}
                                >
                                  {node.label}
                                </button>
                              ))}
                              {section.nodes.length > 6 ? (
                                <div className="text-[11px] text-zinc-500">+{section.nodes.length - 6} more</div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <Button
                    variant="outline"
                    onClick={() => {
                      positionsRef.current.clear();
                      setSelectedNodeId(null);
                      setHoveredNodeId(null);
                      setFrame((v) => (v + 1) % 100000);
                      window.setTimeout(() => fitGraphToViewport(), 20);
                    }}
                    className="w-full border-white/20 bg-transparent text-zinc-100 hover:bg-white/10"
                  >
                    Reset Layout
                  </Button>
                </div>
              </div>
            ) : null}

            <svg
              width={size.width}
              height={size.height}
              className="h-full w-full"
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onWheel={onWheel}
              onMouseDown={(e) => {
                if (e.target !== e.currentTarget) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const screenX = e.clientX - rect.left;
                const screenY = e.clientY - rect.top;
                dragStateRef.current = {
                  mode: "pan",
                  startX: screenX,
                  startY: screenY,
                  startPanX: pan.x,
                  startPanY: pan.y,
                };
                setSelectedNodeId(null);
              }}
            >
              <defs>
                <marker id="arrow-default" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M0,0 L8,4 L0,8 z" fill="rgba(163, 163, 163, 0.72)" />
                </marker>
                <marker id="arrow-active" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
                  <path d="M0,0 L8,4 L0,8 z" fill="rgba(226, 232, 240, 0.78)" />
                </marker>
                <filter id="path-glow" x="-80%" y="-80%" width="260%" height="260%">
                  <feGaussianBlur stdDeviation="3.2" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 0.9 0"
                    result="glow"
                  />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                {filtered.edges.map((edge) => {
                  const s = positionsRef.current.get(edge.source);
                  const t = positionsRef.current.get(edge.target);
                  if (!s || !t) return null;
                  if (!Number.isFinite(s.x) || !Number.isFinite(s.y) || !Number.isFinite(t.x) || !Number.isFinite(t.y)) return null;
                  const active = highlighted.edgeIds.has(edge.id);
                  const aiActive = aiMatchedEdgeIds.has(edge.id);
                  const aiDimmed = !!aiInsights && !aiActive;
                  const sourceNode = filteredNodeById.get(edge.source);
                  const targetNode = filteredNodeById.get(edge.target);
                  const knowledgeColor = edge.type === "knowledge"
                    ? knowledgeCommunities.nodeToColor.get(edge.source) ||
                      knowledgeCommunities.nodeToColor.get(edge.target)
                    : undefined;
                  const pathAccent = edge.type === "knowledge"
                    ? (knowledgeColor || "#e5e7eb")
                    : pathAccentForType(
                        targetNode?.type || sourceNode?.type || "canvas",
                        targetNode?.mode || sourceNode?.mode
                      );
                  const pathPulse = 0.76 + ((frame % 48) / 48) * 0.18;
                  const dashOffset = -((frame * 0.9) % 24);
                  return (
                    <g key={edge.id}>
                      {active ? (
                        <line
                          x1={s.x}
                          y1={s.y}
                          x2={t.x}
                          y2={t.y}
                          stroke={pathAccent}
                          strokeOpacity={0.18 * pathPulse}
                          strokeWidth={Math.max(7.5, linkThickness + 5.5)}
                          filter="url(#path-glow)"
                        />
                      ) : null}
                      <line
                        x1={s.x}
                        y1={s.y}
                        x2={t.x}
                        y2={t.y}
                        stroke={
                          active
                            ? pathAccent
                            : aiActive
                              ? "rgba(34, 211, 238, 0.82)"
                              : edge.type === "knowledge" && knowledgeColor
                                ? toRgba(knowledgeColor, 0.5)
                                : strokeForEdge(edge.type, false, edge.mode)
                        }
                        strokeOpacity={selectedNodeId ? (active ? 0.94 : 0.24) : aiDimmed ? 0.14 : 1}
                        strokeWidth={active ? Math.max(2.15, linkThickness + 0.7) : aiActive ? Math.max(2.1, linkThickness + 0.75) : edge.type === "canvas-link" ? linkThickness + 0.5 : linkThickness}
                        strokeDasharray={active ? "10 8" : undefined}
                        strokeDashoffset={active ? dashOffset : undefined}
                        markerEnd={showArrows ? (active ? "url(#arrow-active)" : "url(#arrow-default)") : undefined}
                      />
                    </g>
                  );
                })}

                {filtered.nodes.map((node) => {
                  const p = positionsRef.current.get(node.id);
                  if (!p) return null;
                  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
                  const active = highlighted.nodeIds.has(node.id);
                  const aiActive = aiMatchedNodeIds.has(node.id);
                  const aiDimmed = !!aiInsights && !aiActive;
                  const deg = filteredDegreeById.get(node.id) || 0;
                  const showLabel = visibleLabelIds.has(node.id);
                  const radius = nodeSize + (node.type === "bothering-type" ? 3 : 0);
                  const screenY = p.y * zoom + pan.y;
                  const labelAbove = screenY < size.height / 2;
                  const labelY = labelAbove ? -(radius + 7) : radius + 7;
                  const tooltipY = labelAbove ? -(radius + 28) : radius + 24;
                  const hovered = hoveredNodeId === node.id;
                  const communityColor = node.type === "knowledge"
                    ? knowledgeCommunities.nodeToColor.get(node.id)
                    : undefined;
                  const pathAccent = node.type === "knowledge"
                    ? (communityColor || "#e5e7eb")
                    : pathAccentForType(node.type, node.mode);
                  const labelLines = labelLinesForNode(node);
                  const pulse = 0.88 + ((frame % 42) / 42) * 0.18;
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${p.x},${p.y})`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        dragStateRef.current = { mode: "node", nodeId: node.id };
                        setSelectedNodeId(node.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId((prev) => (prev === node.id ? null : prev))}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <circle
                        r={radius}
                        fill={
                          aiActive
                            ? "#06b6d4"
                            : node.type === "knowledge" && communityColor
                              ? communityColor
                              : colorForNode(node.type, false, node.mode)
                        }
                        stroke={
                          active
                            ? pathAccent
                            : aiActive
                              ? "rgba(165, 243, 252, 0.9)"
                              : node.type === "knowledge" && communityColor
                                ? toRgba(communityColor, 0.65)
                                : "rgba(255,255,255,0.2)"
                        }
                        strokeWidth={active ? 1.8 : aiActive ? 2.2 : 0.8}
                        opacity={selectedNodeId && !active ? 0.42 : aiDimmed ? 0.28 : 1}
                      />
                      {active ? (
                        <circle
                          r={radius + 4.5}
                          fill="none"
                          stroke={pathAccent}
                          strokeOpacity={0.42 * pulse}
                          strokeWidth={2}
                          filter="url(#path-glow)"
                          pointerEvents="none"
                        />
                      ) : null}
                      {active ? (
                        <circle
                          r={radius + 8}
                          fill={pathAccent}
                          opacity={0.07 * pulse}
                          pointerEvents="none"
                        />
                      ) : null}
                      {renderNodeIcon(node.type, radius, (!!selectedNodeId && !active) || aiDimmed)}
                      {aiActive ? (
                        <circle
                          r={radius + 4}
                          fill="none"
                          stroke="rgba(34, 211, 238, 0.45)"
                          strokeWidth={1.5}
                          pointerEvents="none"
                        />
                      ) : null}
                      {showLabel ? (
                        active ? (
                          <g transform={`translate(0, ${labelY + (labelAbove ? -8 : 8)})`} pointerEvents="none">
                            <text
                              x={0}
                              y={labelAbove ? -7 : 7}
                              fill={pathAccent}
                              fontSize={10.5}
                              fontWeight={600}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              style={{ userSelect: "none" }}
                            >
                              {labelLines.map((line, index) => (
                                <tspan key={`${node.id}-active-${index}`} x={0} dy={index === 0 ? 0 : 12}>
                                  {line}
                                </tspan>
                              ))}
                            </text>
                          </g>
                        ) : (
                          <text
                            x={0}
                            y={labelY}
                            fill={aiActive ? "#cffafe" : "#e5e7eb"}
                            fontSize={11}
                            textAnchor="middle"
                            dominantBaseline={labelAbove ? "auto" : "hanging"}
                            opacity={selectedNodeId && !active ? 0.5 : aiDimmed ? 0.34 : 0.95}
                            style={{ userSelect: "none", pointerEvents: "none" }}
                          >
                            {labelLines.map((line, index) => (
                              <tspan key={`${node.id}-idle-${index}`} x={0} dy={index === 0 ? 0 : 12}>
                                {line}
                              </tspan>
                            ))}
                          </text>
                        )
                      ) : null}
                      {hovered ? (
                        <g transform={`translate(0, ${tooltipY})`} pointerEvents="none">
                          <rect
                            x={-46}
                            y={-9}
                            width={92}
                            height={18}
                            rx={8}
                            fill="rgba(9, 12, 20, 0.9)"
                            stroke="rgba(255,255,255,0.16)"
                            strokeWidth={0.8}
                          />
                          <text
                            x={0}
                            y={0}
                            fill="#e5e7eb"
                            fontSize={10}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            style={{ userSelect: "none" }}
                          >
                            {nodeTypeLabel(node.type)}
                          </text>
                        </g>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
