"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, BrainCircuit, ChevronsLeft, ChevronsRight, Expand, ExternalLink, GripHorizontal, Library, Minus, MousePointer2, Pin, PinOff, Plus, Redo2, Search, Undo2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type NodeId = string;
type EdgeId = string;
type SidebarTab = "editor" | "states" | "diagrams" | "analyze";
type EditableField = "id" | "title" | "subtitle" | "note";
type NodeKind = "normal" | "start" | "end";
type ToolMode = "cursor" | "arrow";
type BotheringSourceFilter = "all" | "external" | "mismatch" | "constraint";
type ArrowheadKind = "none" | "triangle" | "bar" | "dot";

type StateNode = {
  id: NodeId;
  title: string;
  subtitle: string;
  note: string;
  x: number;
  y: number;
  fill: string;
  linkedBrainHackId?: string | null;
  linkedDiagramId?: string | null;
  linkedResourceId?: string | null;
  linkedBotheringIds?: string[];
  linkedUrgeIds?: string[];
  linkedResistanceIds?: string[];
  width?: number;
  height?: number;
  kind?: NodeKind;
};

type RuntimeState = 0 | 1 | 2 | 3;
type LinkedTaskCard = {
  id: string;
  botheringId: string;
  botheringText: string;
  source: string;
  task: any;
};

type StateEdge = {
  id: EdgeId;
  from: NodeId;
  to: NodeId;
  label: string;
  color: string;
  event?: string;
  guard?: string;
  action?: string;
  curve?: number;
  geometry?: "auto" | "cubic";
  cp1x?: number;
  cp1y?: number;
  cp2x?: number;
  cp2y?: number;
  startArrowhead?: ArrowheadKind;
  endArrowhead?: ArrowheadKind;
};

type Camera = {
  x: number;
  y: number;
  zoom: number;
};

type DiagramDoc = {
  id: string;
  name: string;
  nodes: StateNode[];
  edges: StateEdge[];
  camera: Camera;
};

type StateDiagramModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

type PersistedState = {
  diagrams: DiagramDoc[];
  activeDiagramId: string;
  openDiagramIds?: string[];
  pinnedDiagramIds?: string[];
};

type DiagramUpdateOptions = {
  recordHistory?: boolean;
  clearRedo?: boolean;
};

const NODE_MIN_W = 210;
const NODE_H = 108;
const NODE_MIN_H = 108;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 20;
const FIT_PADDING = 60;
const CANVAS_BG = "#0d1016";
const LABEL_BG = "#0b1220";
const GRID_SIZE = 24;
const MAX_HISTORY = 120;
const DEFAULT_CURVE = 0;
const DEFAULT_START_ARROWHEAD: ArrowheadKind = "none";
const DEFAULT_END_ARROWHEAD: ArrowheadKind = "triangle";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const createId = (prefix: string) => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
};
const getNextNodeId = (nodes: StateNode[]) => {
  const used = new Set(nodes.map((n) => n.id));
  let i = 1;
  while (used.has(`S${i}`)) i += 1;
  return `S${i}`;
};
const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");
const STATE_COLOR_PALETTE = [
  "#1f3a5a",
  "#2a4a47",
  "#4b3b69",
  "#5a3b3b",
  "#3f4f2f",
  "#2f4f63",
  "#5a4a2f",
  "#3b4569",
  "#2f5a52",
  "#5a2f4a",
];

const randomStateColor = () => STATE_COLOR_PALETTE[Math.floor(Math.random() * STATE_COLOR_PALETTE.length)];
const longestLineLength = (value: string) =>
  (value || "")
    .split("\n")
    .reduce((max, line) => Math.max(max, line.length), 0);

const estimateLineWidth = (value: string, fontSize: number, factor: number) =>
  Math.ceil(longestLineLength(value) * fontSize * factor);

const getNodeWidth = (node: StateNode) => {
  if (typeof node.width === "number" && Number.isFinite(node.width)) {
    return Math.max(NODE_MIN_W, node.width);
  }
  const idW = estimateLineWidth(node.id, 26, 0.62);
  const titleW = estimateLineWidth(node.title, 19, 0.58);
  const subtitleW = estimateLineWidth(node.subtitle, 16, 0.55);
  const noteW = estimateLineWidth(node.note, 14, 0.53);
  const contentW = Math.max(idW, titleW, subtitleW, noteW);
  return Math.max(contentW + 36, NODE_MIN_W);
};

const getNodeHeight = (node: StateNode) =>
  Math.max(NODE_MIN_H, typeof node.height === "number" && Number.isFinite(node.height) ? node.height : NODE_H);

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    return { r, g, b };
  }
  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
};

const parseHsl = (value: string) => {
  const m = value.trim().match(/^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$/i);
  if (!m) return null;
  const h = Number(m[1]) % 360;
  const s = clamp(Number(m[2]) / 100, 0, 1);
  const l = clamp(Number(m[3]) / 100, 0, 1);
  return { h, s, l };
};

const hslToRgb = (h: number, s: number, l: number) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
};

const toLuminance = (r: number, g: number, b: number) => {
  const conv = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * conv(r) + 0.7152 * conv(g) + 0.0722 * conv(b);
};

const getNodeTextColors = (fill: string) => {
  const hex = fill.startsWith("#") ? hexToRgb(fill) : null;
  const hsl = !hex ? parseHsl(fill) : null;
  const rgb = hex || (hsl ? hslToRgb(hsl.h, hsl.s, hsl.l) : null);
  const luminance = rgb ? toLuminance(rgb.r, rgb.g, rgb.b) : 0.2;
  const lightBg = luminance > 0.58;
  return {
    primary: lightBg ? "#0f172a" : "#f8fafc",
    secondary: lightBg ? "#1e293b" : "#cbd5e1",
  };
};

const createDefaultNodes = (): StateNode[] => [
  { id: "S18", title: "Only one Goal", subtitle: "Only one Goal", note: "Free from fear", x: 1248, y: 12, fill: "#6c4863" },
  {
    id: "S13",
    title: "Refine the Simulation Interpretations",
    subtitle: "See clearly that you are not your body, mind or feelings",
    note: "Observe the map without becoming it",
    x: 1248,
    y: 140,
    fill: "#5b7643",
    width: 360,
  },
  { id: "S1", title: "Experience", subtitle: "Ekdhara", note: "Add your skill", x: 1776, y: 302, fill: "#66754a" },
  {
    id: "S12",
    title: "I am the One",
    subtitle: "Awareness = Absolute Reality",
    note: "Self-knowledge reveals who is experiencing that reality.",
    x: 1728,
    y: 610,
    fill: "#66698c",
    width: 320,
  },
  { id: "S11", title: "Dhyan", subtitle: "Attention", note: "Raja Yoga", x: 1728, y: 770, fill: "#84734d" },

  {
    id: "S5",
    title: "Avoidance - Entertainment",
    subtitle: "You are looking for entertainment because you are deeply bored.",
    note: "Find out what is void",
    x: 24,
    y: 290,
    fill: "#8c5428",
    width: 380,
  },
  {
    id: "S9",
    title: "Imagined Reality",
    subtitle: "Imagination + uncertainty = anxiety",
    note: "Simulation = absolute = certainty",
    x: 696,
    y: 290,
    fill: "#62779a",
  },
  {
    id: "S8",
    title: "Mode 1",
    subtitle: "Prediction & Control",
    note: '"What will happen?"',
    x: 208,
    y: 486,
    fill: "#7085a0",
  },
  {
    id: "S10",
    title: "Mode 2 Structure Creation",
    subtitle: 'Analysis = "What structure would solve this?"',
    note: '"What system should I build?"',
    x: 840,
    y: 486,
    fill: "#697697",
    width: 360,
  },

  {
    id: "S0",
    title: "Observe",
    subtitle: "Transactional Reality",
    note: "Use your senses wisely.",
    x: 248,
    y: 720,
    fill: "#273653",
    kind: "start",
  },
  {
    id: "S1-B",
    title: "Bondages",
    subtitle: "Bothering's / Suffering's / pain",
    note: "Where is the mismatch?",
    x: 744,
    y: 702,
    fill: "#5d687c",
    width: 310,
  },
  { id: "S2", title: "Ghutan", subtitle: "Inner Pressure", note: "Energy blocked", x: 1344, y: 720, fill: "#5b3047" },
  { id: "S3", title: "Curiosity", subtitle: "Exploration", note: "Energy accessible", x: 1344, y: 1060, fill: "#446b59" },
  { id: "S4", title: "Observation", subtitle: "Meta Mode", note: "Observe clearly", x: 744, y: 1060, fill: "#4b7180" },
  { id: "S6", title: "Aligned Action", subtitle: "Action from majburi", note: "Situation demands", x: 240, y: 1060, fill: "#485ad0", kind: "end" },
];

const createDefaultEdges = (): StateEdge[] => [
  {
    id: "e1",
    from: "S5",
    to: "S9",
    label: "Realize fear, doubts and urges\nare just your interpretation.\nThese are the lies produced\nby your simulation engine.",
    color: "#94a3b8",
    curve: -0.45,
  },
  {
    id: "e2",
    from: "S5",
    to: "S8",
    label: "Prediction error in\nexpected reality = dukh + fear and doubt.\nYou do not want dukh so action halts.",
    color: "#94a3b8",
    curve: 0.25,
  },
  { id: "e3", from: "S8", to: "S9", label: '"What will happen?"', color: "#94a3b8", curve: -0.12 },
  { id: "e4", from: "S9", to: "S10", label: '"What can I build?"', color: "#94a3b8", curve: 0.12 },
  {
    id: "e5",
    from: "S9",
    to: "S13",
    label: "Remove ignorance.\nIgnorance acts without seeing.\nJnana Yoga",
    color: "#94a3b8",
    curve: 0.34,
  },
  {
    id: "e6",
    from: "S10",
    to: "S2",
    label: "Activates\nKarma Yoga",
    color: "#94a3b8",
    curve: -0.48,
  },
  {
    id: "e7",
    from: "S1-B",
    to: "S13",
    label: "Remove negligence.\nIgnoring what you already know.\nIgnoring your bothering's\n(external / mismatch / constraint)",
    color: "#94a3b8",
    curve: 0.42,
  },
  {
    id: "e8",
    from: "S13",
    to: "S18",
    label: "Realization of\nartificial feelings",
    color: "#94a3b8",
    curve: -0.24,
  },
  { id: "e9", from: "S13", to: "S1", label: "Experience", color: "#94a3b8", curve: -0.28 },
  { id: "e10", from: "S1", to: "S12", label: "brahma satyam jagat mithya", color: "#94a3b8", curve: 0.22 },
  { id: "e11", from: "S12", to: "S11", label: "", color: "#94a3b8", curve: 0 },
  {
    id: "e12",
    from: "S0",
    to: "S1-B",
    label: "Input: Reality as-is\nProcess: clear perception\nOutput: Required action\nSide-effect: Reduced noise",
    color: "#94a3b8",
    curve: -0.08,
  },
  {
    id: "e13",
    from: "S8",
    to: "S0",
    label: "Input: Psychological lack\nProcess: Simulation of future reward\nOutput: Compulsive action\nSide-effect: More loops",
    color: "#94a3b8",
    curve: 0.08,
  },
  {
    id: "e14",
    from: "S1-B",
    to: "S2",
    label: "Feel what's unresolved\nand ask\nHow can I solve it?\nNo expectation, no distortion.\nAction from reality",
    color: "#94a3b8",
    curve: 0,
  },
  {
    id: "e15",
    from: "S2",
    to: "S11",
    label: "updates the map\nAccordingly and\nattention follows",
    color: "#94a3b8",
    curve: 0,
  },
  { id: "e16", from: "S2", to: "S3", label: "curiosity", color: "#22c55e", curve: 0 },
  { id: "e17", from: "S3", to: "S4", label: "observe", color: "#94a3b8", curve: 0 },
  { id: "e18", from: "S4", to: "S6", label: "understanding", color: "#94a3b8", curve: 0 },
  { id: "e19", from: "S6", to: "S0", label: "updated baseline", color: "#60a5fa", curve: 0 },
];

const isLegacyDefaultDiagram = (doc: DiagramDoc) =>
  doc.name === "Default Example Diagram" &&
  doc.nodes.length === 13 &&
  doc.edges.length === 15 &&
  doc.nodes.some((node) => node.id === "S9" && node.title === "Mind") &&
  doc.nodes.some((node) => node.id === "S12" && node.title === "Awareness");

const migrateDefaultDiagram = (doc: DiagramDoc): DiagramDoc => {
  if (!isLegacyDefaultDiagram(doc)) return doc;
  return {
    ...doc,
    nodes: createDefaultNodes(),
    edges: createDefaultEdges(),
    camera: { x: 0, y: 0, zoom: 1 },
  };
};

const createDiagram = (index: number): DiagramDoc => ({
  id: createId("diagram"),
  name: index === 1 ? "Default Example Diagram" : `State Diagram ${index}`,
  nodes: createDefaultNodes(),
  edges: createDefaultEdges(),
  camera: { x: 0, y: 0, zoom: 1 },
});

const createEmptyDiagram = (index: number): DiagramDoc => ({
  id: createId("diagram"),
  name: `State Diagram ${index}`,
  nodes: [],
  edges: [],
  camera: { x: 0, y: 0, zoom: 1 },
});

const centerOf = (node: StateNode) => ({ x: node.x + getNodeWidth(node) / 2, y: node.y + getNodeHeight(node) / 2 });
const clampEdgeCurve = (value?: number) => clamp(typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_CURVE, -6, 6);
const normalizeArrowhead = (value?: string | null): ArrowheadKind =>
  value === "triangle" || value === "bar" || value === "dot" || value === "none" ? value : "none";
const getArrowheadMarkerUrl = (arrowhead: ArrowheadKind) =>
  arrowhead === "none" ? undefined : `url(#arrow-head-${arrowhead})`;
const getMaxBendPx = (distance: number) => Math.min(240, Math.max(36, distance * 0.45));
const getAutoControlFromCurve = (a: { x: number; y: number }, b: { x: number; y: number }, curve: number) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const bendPx = clampEdgeCurve(curve) * getMaxBendPx(dist);
  return {
    x: (a.x + b.x) / 2 + nx * bendPx,
    y: (a.y + b.y) / 2 + ny * bendPx,
  };
};

const cubicPointAt = (
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number
) => {
  const mt = 1 - t;
  const x = mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x;
  const y = mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y;
  return { x, y };
};

const getDefaultCubicControls = (a: { x: number; y: number }, b: { x: number; y: number }, curve = DEFAULT_CURVE) => {
  const auto = getAutoControlFromCurve(a, b, curve);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const bend = ((auto.x - (a.x + b.x) / 2) * nx + (auto.y - (a.y + b.y) / 2) * ny) * 0.66;
  return {
    cp1: { x: a.x + dx / 3 + nx * bend, y: a.y + dy / 3 + ny * bend },
    cp2: { x: a.x + (2 * dx) / 3 + nx * bend, y: a.y + (2 * dy) / 3 + ny * bend },
  };
};

const getEdgeGeometry = (edge: StateEdge, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const hasCubic =
    edge.geometry === "cubic" &&
    typeof edge.cp1x === "number" &&
    typeof edge.cp1y === "number" &&
    typeof edge.cp2x === "number" &&
    typeof edge.cp2y === "number";

  if (hasCubic) {
    const cp1 = { x: edge.cp1x!, y: edge.cp1y! };
    const cp2 = { x: edge.cp2x!, y: edge.cp2y! };
    const mid = cubicPointAt(a, cp1, cp2, b, 0.5);
    return {
      d: `M ${a.x} ${a.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${b.x} ${b.y}`,
      mx: mid.x,
      my: mid.y,
      cp1,
      cp2,
      type: "cubic" as const,
    };
  }

  const c = getAutoControlFromCurve(a, b, edge.curve ?? DEFAULT_CURVE);
  const mx = 0.25 * a.x + 0.5 * c.x + 0.25 * b.x;
  const my = 0.25 * a.y + 0.5 * c.y + 0.25 * b.y;
  return {
    d: `M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`,
    mx,
    my,
    cp1: c,
    cp2: c,
    type: "auto" as const,
  };
};
const INITIAL_DIAGRAM = createDiagram(1);
const STORAGE_KEY = "studio.state-diagram.v1";

const isNode = (value: any): value is StateNode =>
  value &&
  typeof value.id === "string" &&
  typeof value.title === "string" &&
  typeof value.subtitle === "string" &&
  typeof value.note === "string" &&
  typeof value.x === "number" &&
  typeof value.y === "number" &&
  typeof value.fill === "string" &&
  (typeof value.linkedBrainHackId === "undefined" || value.linkedBrainHackId === null || typeof value.linkedBrainHackId === "string") &&
  (typeof value.linkedDiagramId === "undefined" || value.linkedDiagramId === null || typeof value.linkedDiagramId === "string") &&
  (typeof value.linkedResourceId === "undefined" || value.linkedResourceId === null || typeof value.linkedResourceId === "string") &&
  (typeof value.linkedBotheringIds === "undefined" || isStringArray(value.linkedBotheringIds)) &&
  (typeof value.linkedUrgeIds === "undefined" || isStringArray(value.linkedUrgeIds)) &&
  (typeof value.linkedResistanceIds === "undefined" || isStringArray(value.linkedResistanceIds)) &&
  (typeof value.width === "undefined" || typeof value.width === "number") &&
  (typeof value.height === "undefined" || typeof value.height === "number") &&
  (typeof value.kind === "undefined" || value.kind === "normal" || value.kind === "start" || value.kind === "end");

const isEdge = (value: any): value is StateEdge =>
  value &&
  typeof value.id === "string" &&
  typeof value.from === "string" &&
  typeof value.to === "string" &&
  typeof value.label === "string" &&
  typeof value.color === "string" &&
  (typeof value.event === "undefined" || typeof value.event === "string") &&
  (typeof value.guard === "undefined" || typeof value.guard === "string") &&
  (typeof value.action === "undefined" || typeof value.action === "string") &&
  (typeof value.curve === "undefined" || typeof value.curve === "number") &&
  (typeof value.geometry === "undefined" || value.geometry === "auto" || value.geometry === "cubic") &&
  (typeof value.cp1x === "undefined" || typeof value.cp1x === "number") &&
  (typeof value.cp1y === "undefined" || typeof value.cp1y === "number") &&
  (typeof value.cp2x === "undefined" || typeof value.cp2x === "number") &&
  (typeof value.cp2y === "undefined" || typeof value.cp2y === "number") &&
  (typeof value.startArrowhead === "undefined" || value.startArrowhead === "none" || value.startArrowhead === "triangle" || value.startArrowhead === "bar" || value.startArrowhead === "dot") &&
  (typeof value.endArrowhead === "undefined" || value.endArrowhead === "none" || value.endArrowhead === "triangle" || value.endArrowhead === "bar" || value.endArrowhead === "dot");

const isCamera = (value: any): value is Camera =>
  value &&
  typeof value.x === "number" &&
  typeof value.y === "number" &&
  typeof value.zoom === "number";

const isDiagramDoc = (value: any): value is DiagramDoc =>
  value &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  Array.isArray(value.nodes) &&
  value.nodes.every(isNode) &&
  Array.isArray(value.edges) &&
  value.edges.every(isEdge) &&
  isCamera(value.camera);

const readPersistedState = (): PersistedState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizeStore(parsed);
  } catch {
    return null;
  }
};

const sanitizeStore = (value: any): PersistedState | null => {
  if (!value || !Array.isArray(value.diagrams) || typeof value.activeDiagramId !== "string") return null;
  const diagrams = value.diagrams.filter(isDiagramDoc).map(migrateDefaultDiagram);
  if (diagrams.length === 0) return null;
  const activeDiagramId = diagrams.some((d) => d.id === value.activeDiagramId) ? value.activeDiagramId : diagrams[0].id;
  const allIds = new Set(diagrams.map((d) => d.id));
  const openDiagramIds = Array.isArray(value.openDiagramIds)
    ? value.openDiagramIds.filter((id: unknown): id is string => typeof id === "string" && allIds.has(id))
    : [activeDiagramId];
  const pinnedDiagramIds = Array.isArray(value.pinnedDiagramIds)
    ? value.pinnedDiagramIds.filter((id: unknown): id is string => typeof id === "string" && allIds.has(id))
    : [];
  const normalizedOpen = openDiagramIds.length > 0 ? [...openDiagramIds] : [activeDiagramId];
  if (!normalizedOpen.includes(activeDiagramId)) {
    normalizedOpen.push(activeDiagramId);
  }
  pinnedDiagramIds.forEach((id) => {
    if (!normalizedOpen.includes(id)) {
      normalizedOpen.push(id);
    }
  });
  return {
    diagrams,
    activeDiagramId,
    openDiagramIds: normalizedOpen,
    pinnedDiagramIds,
  };
};

const cloneStore = (store: PersistedState): PersistedState => ({
  activeDiagramId: store.activeDiagramId,
  openDiagramIds: [...(store.openDiagramIds || [])],
  pinnedDiagramIds: [...(store.pinnedDiagramIds || [])],
  diagrams: store.diagrams.map((doc) => ({
    ...doc,
    nodes: doc.nodes.map((node) => ({ ...node })),
    edges: doc.edges.map((edge) => ({ ...edge })),
    camera: { ...doc.camera },
  })),
});

const sameIdList = (a: string[], b: string[]) => a.length === b.length && a.every((id, idx) => id === b[idx]);

const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;
const wrapTextToLines = (value: string, maxChars: number, maxLines = 3) => {
  const words = (value || "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(0, maxChars - 3))}...`;
  }
  return lines;
};

const getTaskLabel = (task: any) =>
  String(task?.details || task?.text || task?.title || task?.name || task?.activityName || task?.id || "Task");
const normalizeText = (value?: string) => (value || "").trim().toLowerCase().replace(/\s+/g, " ");
const stripInstanceDateSuffix = (value?: string) => (value || "").replace(/_\d{4}-\d{2}-\d{2}$/, "");
const normalizeDateKey = (value?: string | null) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toDateKey(parsed);
};
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const addDaysLocal = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const addMonthsLocal = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};
const SCHEDULE_SLOT_ORDER = ["Late Night", "Dawn", "Morning", "Afternoon", "Evening", "Night"];
const SLOT_START_HOUR: Record<string, number> = {
  "Late Night": 0,
  Dawn: 5,
  Morning: 8,
  Afternoon: 13,
  Evening: 18,
  Night: 21,
};
const formatDateLabel = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const getTaskScheduleSnapshot = (task: any, schedule: Record<string, any>) => {
  const now = new Date();
  const todayKey = toDateKey(now);
  const taskId = stripInstanceDateSuffix(task?.id || task?.activityId || "");
  const taskNameKey = normalizeText(getTaskLabel(task));
  const nowHour = now.getHours() + now.getMinutes() / 60;

  const matchesActivity = (activity: any) => {
    const ids = new Set<string>([
      stripInstanceDateSuffix(activity?.id || ""),
      ...((activity?.taskIds || []).map((id: string) => stripInstanceDateSuffix(id))),
    ].filter(Boolean));
    if (taskId && ids.has(taskId)) return true;
    const activityName = normalizeText(activity?.details || "");
    return !!taskNameKey && taskNameKey === activityName;
  };

  const collectMatchesForDate = (dateKey: string) => {
    const day = schedule?.[dateKey] || {};
    const matches: Array<{ slot: string; completed: boolean }> = [];
    Object.entries(day).forEach(([slot, value]) => {
      if (!Array.isArray(value)) return;
      value.forEach((activity: any) => {
        if (!matchesActivity(activity)) return;
        matches.push({ slot, completed: !!activity?.completed });
      });
    });
    return matches;
  };

  const todayMatches = collectMatchesForDate(todayKey);
  if (todayMatches.length > 0) {
    if (todayMatches.some((m) => m.completed)) {
      return { mode: "today" as const, dateKey: todayKey, status: "completed" as const };
    }
    const slotIdx = todayMatches
      .map((m) => SCHEDULE_SLOT_ORDER.indexOf(m.slot))
      .filter((idx) => idx >= 0)
      .sort((a, b) => a - b)[0];
    if (typeof slotIdx === "number") {
      const slot = SCHEDULE_SLOT_ORDER[slotIdx];
      const start = SLOT_START_HOUR[slot] ?? 0;
      return { mode: "today" as const, dateKey: todayKey, status: (nowHour >= start ? "due" : "pending") as "due" | "pending" };
    }
    return { mode: "today" as const, dateKey: todayKey, status: "due" as const };
  }

  const dateKeys = Object.keys(schedule || {})
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .sort((a, b) => (a < b ? 1 : -1));

  for (const key of dateKeys) {
    if (key >= todayKey) continue;
    const matches = collectMatchesForDate(key);
    if (matches.length === 0) continue;
    return {
      mode: "recent" as const,
      dateKey: key,
      status: (matches.some((m) => m.completed) ? "completed" : "pending") as "completed" | "pending",
    };
  }

  return null;
};

const countRoutineOccurrencesBetween = (routine: any, startDate: Date, endDate: Date): number | null => {
  if (!routine?.routine) return null;
  const rule = routine.routine;
  const interval = Math.max(1, Number(rule.repeatInterval || rule.days || 1));
  const unit = rule.repeatUnit || (rule.type === "weekly" ? "week" : "day");
  const baseDateKey = normalizeDateKey(routine.baseDate) || normalizeDateKey(routine.createdAt) || toDateKey(startDate);
  if (!baseDateKey) return null;
  let cursor = new Date(`${baseDateKey}T00:00:00`);
  if (Number.isNaN(cursor.getTime())) return null;
  if (endDate < startDate) return 0;

  if (unit === "month") {
    while (cursor < startDate) cursor = addMonthsLocal(cursor, interval);
    let count = 0;
    while (cursor <= endDate) {
      if (cursor >= startDate) count += 1;
      cursor = addMonthsLocal(cursor, interval);
    }
    return count;
  }

  const stepDays = unit === "week" ? interval * 7 : interval;
  while (cursor < startDate) cursor = addDaysLocal(cursor, stepDays);
  let count = 0;
  while (cursor <= endDate) {
    if (cursor >= startDate) count += 1;
    cursor = addDaysLocal(cursor, stepDays);
  }
  return count;
};

const getRoutineRepeatabilityLabel = (routine?: any | null) => {
  const rule = routine?.routine;
  if (!rule) return "None";
  const interval = Math.max(1, Number(rule.repeatInterval || rule.days || 1));
  const unit = rule.repeatUnit || (rule.type === "weekly" ? "week" : "day");
  if (rule.type === "daily" && unit === "day" && interval === 1) return "Daily";
  if (rule.type === "weekly" && unit === "week" && interval === 1) return "Weekly";
  if (unit === "day") return `Every ${interval} day${interval > 1 ? "s" : ""}`;
  if (unit === "week") return `Every ${interval} week${interval > 1 ? "s" : ""}`;
  if (unit === "month") return `Every ${interval} month${interval > 1 ? "s" : ""}`;
  return "Custom";
};

const getLoggedMinutesForActivity = (
  activity: any,
  allDeepWorkLogs: any[],
  allUpskillLogs: any[],
  brandingLogs: any[],
  allLeadGenLogs: any[],
  allWorkoutLogs: any[],
  allMindProgrammingLogs: any[],
  dateKey: string
) => {
  if (!activity?.completed) return 0;
  if (activity.focusSessionInitialStartTime && activity.focusSessionEndTime) {
    const totalSessionMs = activity.focusSessionEndTime - activity.focusSessionInitialStartTime;
    const pauseDurationsMs = (activity.focusSessionPauses || [])
      .filter((p: any) => p.resumeTime)
      .reduce((sum: number, p: any) => sum + (p.resumeTime - p.pauseTime), 0);
    const totalWorkTimeMs = totalSessionMs - pauseDurationsMs;
    return Math.round(totalWorkTimeMs / 60000);
  }
  if (typeof activity.duration === "number" && activity.duration > 0) return activity.duration;
  if (activity.completed && typeof activity.focusSessionInitialDuration === "number") return activity.focusSessionInitialDuration;

  const activityTaskInstanceIds = new Set(Array.isArray(activity.taskIds) ? activity.taskIds : []);
  if (activityTaskInstanceIds.size === 0) return 0;

  const findDurationInLogs = (logs: any[], durationField: "reps" | "weight") => {
    const logForDay = logs.find((l: any) => l.date === dateKey || l.id === dateKey);
    if (!logForDay) return 0;
    return (logForDay.exercises || [])
      .filter((ex: any) => activityTaskInstanceIds.has(ex.id))
      .reduce(
        (sum: number, ex: any) =>
          sum + (ex.loggedSets || []).reduce((setSum: number, set: any) => setSum + Number(set?.[durationField] || 0), 0),
        0
      );
  };

  switch (activity.type) {
    case "deepwork":
      return findDurationInLogs(allDeepWorkLogs, "weight");
    case "upskill":
      return findDurationInLogs(allUpskillLogs, "reps");
    case "branding":
      return findDurationInLogs(brandingLogs, "weight");
    case "lead-generation":
      return findDurationInLogs(allLeadGenLogs, "weight");
    case "workout":
      return findDurationInLogs(allWorkoutLogs, "reps");
    case "mindset":
      return findDurationInLogs(allMindProgrammingLogs, "reps");
    default:
      return 0;
  }
};

const getTaskRepeatability = (task: any) => {
  if (task?.routine?.type === "daily" || task?.recurrence === "daily") return "Daily";
  if (task?.routine?.type === "weekly" || task?.recurrence === "weekly") return "Weekly";
  if (task?.routine?.type === "custom") {
    const interval = Math.max(1, Number(task?.routine?.repeatInterval || 1));
    const unit = String(task?.routine?.repeatUnit || "day");
    return `Every ${interval} ${unit}${interval > 1 ? "s" : ""}`;
  }
  return "One-time";
};

const collectNodeTaskCards = (node: StateNode, botheringPointById: Map<string, any>): LinkedTaskCard[] => {
  const linked = node.linkedBotheringIds || [];
  const cards: LinkedTaskCard[] = [];
  linked.forEach((botheringId) => {
    const point = botheringPointById.get(botheringId);
    const tasks = Array.isArray(point?.tasks) ? point.tasks : [];
    const source = String(point?.source || point?.type || "bothering");
    const botheringText = String(point?.text || botheringId);
    tasks.forEach((task: any, idx: number) => {
      const taskKey = String(task?.id || task?.activityId || `${botheringId}_${idx}`);
      cards.push({
        id: `${node.id}:${botheringId}:${taskKey}`,
        botheringId,
        botheringText,
        source,
        task,
      });
    });
  });
  return cards;
};

export function StateDiagramModal({ isOpen, onOpenChange }: StateDiagramModalProps) {
  const {
    settings,
    setSettings,
    brainHacks,
    setOpenBrainHackPopups,
    mindsetCards,
    schedule,
    allDeepWorkLogs,
    allUpskillLogs,
    brandingLogs,
    allLeadGenLogs,
    allWorkoutLogs,
    allMindProgrammingLogs,
    resources,
    openGeneralPopup,
  } = useAuth();
  const [diagrams, setDiagrams] = useState<DiagramDoc[]>(() => {
    const fromSettings = sanitizeStore((settings as any)?.stateDiagramStore);
    if (fromSettings) return fromSettings.diagrams;
    const fromLocal = readPersistedState();
    return fromLocal?.diagrams || [INITIAL_DIAGRAM];
  });
  const [activeDiagramId, setActiveDiagramId] = useState<string>(() => {
    const fromSettings = sanitizeStore((settings as any)?.stateDiagramStore);
    if (fromSettings) return fromSettings.activeDiagramId;
    const fromLocal = readPersistedState();
    return fromLocal?.activeDiagramId || INITIAL_DIAGRAM.id;
  });
  const [openDiagramIds, setOpenDiagramIds] = useState<string[]>(() => {
    const fromSettings = sanitizeStore((settings as any)?.stateDiagramStore);
    if (fromSettings?.openDiagramIds?.length) return fromSettings.openDiagramIds;
    const fromLocal = readPersistedState();
    return fromLocal?.openDiagramIds?.length ? fromLocal.openDiagramIds : [INITIAL_DIAGRAM.id];
  });
  const [pinnedDiagramIds, setPinnedDiagramIds] = useState<string[]>(() => {
    const fromSettings = sanitizeStore((settings as any)?.stateDiagramStore);
    if (fromSettings?.pinnedDiagramIds) return fromSettings.pinnedDiagramIds;
    const fromLocal = readPersistedState();
    return fromLocal?.pinnedDiagramIds || [];
  });
  const [diagramSearchOpen, setDiagramSearchOpen] = useState(false);
  const [diagramSearchQuery, setDiagramSearchQuery] = useState("");
  const [tabContextMenu, setTabContextMenu] = useState<{ diagramId: string; x: number; y: number } | null>(null);
  const [editingTabDiagramId, setEditingTabDiagramId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState("");
  const [fitNonce, setFitNonce] = useState(0);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("editor");

  const [selectedNodeId, setSelectedNodeId] = useState<NodeId | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<EdgeId | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<NodeId[]>([]);
  const [textEdit, setTextEdit] = useState<{ nodeId: NodeId; field: EditableField } | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [edgeTextEditId, setEdgeTextEditId] = useState<EdgeId | null>(null);
  const [edgeTextDraft, setEdgeTextDraft] = useState("");
  const [edgeBendEditId, setEdgeBendEditId] = useState<EdgeId | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [simNodeId, setSimNodeId] = useState<NodeId | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [connectDraft, setConnectDraft] = useState<{ fromId: NodeId; x: number; y: number } | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>("cursor");
  const [taskOverlayNodeId, setTaskOverlayNodeId] = useState<NodeId | null>(null);
  const [taskOverlayCardPositions, setTaskOverlayCardPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [taskOverlayClosedCardIds, setTaskOverlayClosedCardIds] = useState<string[]>([]);

  const [newEdgeFrom, setNewEdgeFrom] = useState<NodeId>("S2");
  const [newEdgeTo, setNewEdgeTo] = useState<NodeId>("S3");
  const [newEdgeLabel, setNewEdgeLabel] = useState("new transition");
  const [newEdgeColor, setNewEdgeColor] = useState("#94a3b8");
  const [diagramNameDraft, setDiagramNameDraft] = useState("");
  const [linkEditor, setLinkEditor] = useState<{ nodeId: NodeId; hackId: string; diagramId: string; resourceId: string; botheringIds: string[] } | null>(null);
  const [botheringSearchQuery, setBotheringSearchQuery] = useState("");
  const [botheringSourceFilter, setBotheringSourceFilter] = useState<BotheringSourceFilter>("all");
  const [onlyBotheringsWithTasks, setOnlyBotheringsWithTasks] = useState(false);
  const [resourceSearchQuery, setResourceSearchQuery] = useState("");

  const frameRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [frameSize, setFrameSize] = useState({ width: 1200, height: 700 });
  const nodesRef = useRef<StateNode[]>([]);
  const didInitialFitRef = useRef(false);
  const didHydrateFromStorageRef = useRef(false);
  const lastPersistedSignatureRef = useRef<string>("");
  const shouldSkipInitialFitRef = useRef<boolean>(
    Boolean(sanitizeStore((settings as any)?.stateDiagramStore) || readPersistedState())
  );

  const panRef = useRef<{ startX: number; startY: number; camX: number; camY: number } | null>(null);
  const dragRef = useRef<{ nodeId: string; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const bendDragRef = useRef<{
    edgeId: EdgeId;
    handle: "cp1" | "cp2" | "center";
    startX: number;
    startY: number;
    originCp1x: number;
    originCp1y: number;
    originCp2x: number;
    originCp2y: number;
  } | null>(null);
  const taskCardDragRef = useRef<{ cardId: string; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const moveRafRef = useRef<number | null>(null);
  const latestPointerRef = useRef<{ clientX: number; clientY: number; altKey: boolean } | null>(null);
  const marqueeRef = useRef<{ startX: number; startY: number } | null>(null);
  const diagramsRef = useRef<DiagramDoc[]>(diagrams);
  const activeDiagramIdRef = useRef<string>(activeDiagramId);
  const openDiagramIdsRef = useRef<string[]>(openDiagramIds);
  const pinnedDiagramIdsRef = useRef<string[]>(pinnedDiagramIds);
  const sharedZoomRef = useRef<number>(1);
  const prevActiveDiagramIdForZoomRef = useRef<string>(activeDiagramId);
  const tabNameInputRef = useRef<HTMLInputElement | null>(null);
  const historyPastRef = useRef<PersistedState[]>([]);
  const historyFutureRef = useRef<PersistedState[]>([]);
  const [, setHistoryVersion] = useState(0);

  useEffect(() => {
    if (diagrams.length === 0) {
      const d = createDiagram(1);
      setDiagrams([d]);
      setActiveDiagramId(d.id);
      setOpenDiagramIds([d.id]);
      return;
    }
    if (!diagrams.some((d) => d.id === activeDiagramId)) {
      setActiveDiagramId(diagrams[0].id);
    }
  }, [activeDiagramId, diagrams]);

  useEffect(() => {
    const valid = new Set(diagrams.map((d) => d.id));
    const nextPinned = pinnedDiagramIds.filter((id) => valid.has(id));
    setOpenDiagramIds((prev) => {
      const next = prev.filter((id) => valid.has(id));
      nextPinned.forEach((id) => {
        if (!next.includes(id)) next.push(id);
      });
      if (!next.includes(activeDiagramId) && valid.has(activeDiagramId)) next.push(activeDiagramId);
      const fallback = next.length > 0 ? next : diagrams[0] ? [diagrams[0].id] : [];
      return sameIdList(prev, fallback) ? prev : fallback;
    });
    setPinnedDiagramIds((prev) => (sameIdList(prev, nextPinned) ? prev : nextPinned));
  }, [diagrams, activeDiagramId, pinnedDiagramIds]);

  useEffect(() => {
    diagramsRef.current = diagrams;
  }, [diagrams]);

  useEffect(() => {
    activeDiagramIdRef.current = activeDiagramId;
  }, [activeDiagramId]);

  useEffect(() => {
    openDiagramIdsRef.current = openDiagramIds;
  }, [openDiagramIds]);

  useEffect(() => {
    pinnedDiagramIdsRef.current = pinnedDiagramIds;
  }, [pinnedDiagramIds]);

  useEffect(() => {
    if (didHydrateFromStorageRef.current) return;
    const fromSettings = sanitizeStore((settings as any)?.stateDiagramStore);
    if (fromSettings) {
      setDiagrams(fromSettings.diagrams);
      setActiveDiagramId(fromSettings.activeDiagramId);
      setOpenDiagramIds(fromSettings.openDiagramIds?.length ? fromSettings.openDiagramIds : [fromSettings.activeDiagramId]);
      setPinnedDiagramIds(fromSettings.pinnedDiagramIds || []);
      lastPersistedSignatureRef.current = JSON.stringify(fromSettings);
      didHydrateFromStorageRef.current = true;
      return;
    }
    const persisted = readPersistedState();
    if (persisted) {
      setDiagrams(persisted.diagrams);
      setActiveDiagramId(persisted.activeDiagramId);
      setOpenDiagramIds(persisted.openDiagramIds?.length ? persisted.openDiagramIds : [persisted.activeDiagramId]);
      setPinnedDiagramIds(persisted.pinnedDiagramIds || []);
      // Keep empty signature so local fallback gets written into synced settings once.
      lastPersistedSignatureRef.current = "";
    } else {
      lastPersistedSignatureRef.current = "";
    }
    didHydrateFromStorageRef.current = true;
  }, [settings]);

  useEffect(() => {
    if (!didHydrateFromStorageRef.current) return;
    if (typeof window === "undefined") return;
    const payload: PersistedState = { diagrams, activeDiagramId, openDiagramIds, pinnedDiagramIds };
    const nextSignature = JSON.stringify(payload);
    if (nextSignature === lastPersistedSignatureRef.current) return;
    lastPersistedSignatureRef.current = nextSignature;
    try {
      window.localStorage.setItem(STORAGE_KEY, nextSignature);
    } catch {
      // no-op: fail silently for storage quota/private mode
    }
    setSettings((prev) => {
      const current = sanitizeStore((prev as any).stateDiagramStore);
      if (current) {
        const currentSerialized = JSON.stringify(current);
        if (currentSerialized === nextSignature) return prev;
      }
      return {
        ...prev,
        stateDiagramStore: payload as any,
      };
    });
  }, [diagrams, activeDiagramId, openDiagramIds, pinnedDiagramIds, setSettings]);

  const resetHistory = useCallback(() => {
    historyPastRef.current = [];
    historyFutureRef.current = [];
    setHistoryVersion((v) => v + 1);
  }, []);

  const didHistoryInitRef = useRef(false);
  useEffect(() => {
    if (!didHydrateFromStorageRef.current) return;
    if (didHistoryInitRef.current) return;
    didHistoryInitRef.current = true;
    resetHistory();
  }, [diagrams, activeDiagramId, resetHistory]);

  const pushHistorySnapshot = useCallback((snapshot: PersistedState, clearRedo: boolean) => {
    historyPastRef.current.push(cloneStore(snapshot));
    if (historyPastRef.current.length > MAX_HISTORY) {
      historyPastRef.current.shift();
    }
    if (clearRedo) {
      historyFutureRef.current = [];
    }
    setHistoryVersion((v) => v + 1);
  }, []);

  const applyStoreUpdate = useCallback(
    (updater: (store: PersistedState) => PersistedState, options?: DiagramUpdateOptions) => {
      const prevStore: PersistedState = {
        diagrams: diagramsRef.current,
        activeDiagramId: activeDiagramIdRef.current,
        openDiagramIds: openDiagramIdsRef.current,
        pinnedDiagramIds: pinnedDiagramIdsRef.current,
      };
      const nextStore = updater(prevStore);
      if (!nextStore) return;

      if (options?.recordHistory ?? true) {
        pushHistorySnapshot(prevStore, options?.clearRedo ?? true);
      }

      setDiagrams(nextStore.diagrams);
      setActiveDiagramId(nextStore.activeDiagramId);
      setOpenDiagramIds(nextStore.openDiagramIds?.length ? nextStore.openDiagramIds : [nextStore.activeDiagramId]);
      setPinnedDiagramIds(nextStore.pinnedDiagramIds || []);
    },
    [pushHistorySnapshot]
  );

  const activeDiagram = useMemo(() => diagrams.find((d) => d.id === activeDiagramId) || diagrams[0], [activeDiagramId, diagrams]);
  const nodes = activeDiagram?.nodes || [];
  const edges = activeDiagram?.edges || [];
  const camera = activeDiagram?.camera || { x: 0, y: 0, zoom: 1 };

  const updateActiveDiagram = useCallback(
    (updater: (doc: DiagramDoc) => DiagramDoc, options?: DiagramUpdateOptions) => {
      applyStoreUpdate((store) => ({
        ...store,
        diagrams: store.diagrams.map((doc) => (doc.id === store.activeDiagramId ? updater(doc) : doc)),
      }), options);
    },
    [applyStoreUpdate]
  );

  const setNodes = useCallback(
    (next: StateNode[] | ((prev: StateNode[]) => StateNode[]), options?: DiagramUpdateOptions) => {
      updateActiveDiagram((doc) => ({
        ...doc,
        nodes: typeof next === "function" ? (next as (prev: StateNode[]) => StateNode[])(doc.nodes) : next,
      }), options);
    },
    [updateActiveDiagram]
  );

  const setEdges = useCallback(
    (next: StateEdge[] | ((prev: StateEdge[]) => StateEdge[]), options?: DiagramUpdateOptions) => {
      updateActiveDiagram((doc) => ({
        ...doc,
        edges: typeof next === "function" ? (next as (prev: StateEdge[]) => StateEdge[])(doc.edges) : next,
      }), options);
    },
    [updateActiveDiagram]
  );

  const setCamera = useCallback((next: Camera | ((prev: Camera) => Camera)) => {
    updateActiveDiagram((doc) => ({
      ...doc,
      camera: typeof next === "function" ? (next as (prev: Camera) => Camera)(doc.camera) : next,
    }), { recordHistory: false });
  }, [updateActiveDiagram]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, StateNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId) || null, [edges, selectedEdgeId]);
  const updateSelectedEdge = useCallback((patch: Partial<StateEdge>) => {
    if (!selectedEdgeId) return;
    setEdges((prev) => prev.map((edge) => (edge.id === selectedEdgeId ? { ...edge, ...patch } : edge)));
  }, [selectedEdgeId, setEdges]);
  const buildDefaultEdge = useCallback(
    (fromId: NodeId, toId: NodeId, label: string, color: string): StateEdge => {
      const fromNode = nodeMap.get(fromId);
      const toNode = nodeMap.get(toId);
      if (!fromNode || !toNode) {
        return {
          id: createId("edge"),
          from: fromId,
          to: toId,
          label,
          color,
          curve: DEFAULT_CURVE,
          geometry: "auto",
          startArrowhead: DEFAULT_START_ARROWHEAD,
          endArrowhead: DEFAULT_END_ARROWHEAD,
        };
      }
      const a = centerOf(fromNode);
      const b = centerOf(toNode);
      const { cp1, cp2 } = getDefaultCubicControls(a, b, DEFAULT_CURVE);
      return {
        id: createId("edge"),
        from: fromId,
        to: toId,
        label,
        color,
        curve: DEFAULT_CURVE,
        geometry: "cubic",
        cp1x: cp1.x,
        cp1y: cp1.y,
        cp2x: cp2.x,
        cp2y: cp2.y,
        startArrowhead: DEFAULT_START_ARROWHEAD,
        endArrowhead: DEFAULT_END_ARROWHEAD,
      };
    },
    [nodeMap]
  );
  const ensureEdgeCubic = useCallback(
    (edge: StateEdge) => {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (!fromNode || !toNode) return null;
      const a = centerOf(fromNode);
      const b = centerOf(toNode);
      const hasCubic =
        edge.geometry === "cubic" &&
        typeof edge.cp1x === "number" &&
        typeof edge.cp1y === "number" &&
        typeof edge.cp2x === "number" &&
        typeof edge.cp2y === "number";
      if (hasCubic) {
        return {
          cp1x: edge.cp1x!,
          cp1y: edge.cp1y!,
          cp2x: edge.cp2x!,
          cp2y: edge.cp2y!,
        };
      }
      const { cp1, cp2 } = getDefaultCubicControls(a, b, edge.curve ?? DEFAULT_CURVE);
      return {
        cp1x: cp1.x,
        cp1y: cp1.y,
        cp2x: cp2.x,
        cp2y: cp2.y,
      };
    },
    [nodeMap]
  );
  const nudgeSelectedEdgeCurvature = useCallback(
    (delta: number) => {
      if (!selectedEdgeId) return;
      setEdges((prev) =>
        prev.map((edge) => {
          if (edge.id !== selectedEdgeId) return edge;
          const controls = ensureEdgeCubic(edge);
          if (!controls) return edge;
          const fromNode = nodeMap.get(edge.from);
          const toNode = nodeMap.get(edge.to);
          if (!fromNode || !toNode) return edge;
          const a = centerOf(fromNode);
          const b = centerOf(toNode);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;
          const nx = -dy / dist;
          const ny = dx / dist;
          const shift = delta * Math.min(220, Math.max(32, dist * 0.32));
          return {
            ...edge,
            geometry: "cubic",
            cp1x: controls.cp1x + nx * shift,
            cp1y: controls.cp1y + ny * shift,
            cp2x: controls.cp2x + nx * shift,
            cp2y: controls.cp2y + ny * shift,
          };
        })
      );
    },
    [ensureEdgeCubic, nodeMap, selectedEdgeId, setEdges]
  );
  const resetSelectedEdgeCurve = useCallback(() => {
    if (!selectedEdgeId) return;
    setEdges((prev) =>
      prev.map((edge) => {
        if (edge.id !== selectedEdgeId) return edge;
        const controls = ensureEdgeCubic(edge);
        if (!controls) return edge;
        return {
          ...edge,
          geometry: "auto",
          cp1x: undefined,
          cp1y: undefined,
          cp2x: undefined,
          cp2y: undefined,
          curve: DEFAULT_CURVE,
        };
      })
    );
  }, [ensureEdgeCubic, selectedEdgeId, setEdges]);
  const parentBrainHacks = useMemo(
    () => brainHacks.filter((hack) => !hack.parentId && (hack.type ?? "hack") === "hack"),
    [brainHacks]
  );
  useEffect(() => {
    if (!edgeBendEditId) return;
    if (edges.some((edge) => edge.id === edgeBendEditId)) return;
    setEdgeBendEditId(null);
  }, [edgeBendEditId, edges]);
  const brainHackById = useMemo(() => {
    const map = new Map<string, (typeof brainHacks)[number]>();
    brainHacks.forEach((hack) => map.set(hack.id, hack));
    return map;
  }, [brainHacks]);
  const linkEditorNode = useMemo(() => {
    if (!linkEditor?.nodeId) return null;
    return nodes.find((n) => n.id === linkEditor.nodeId) || null;
  }, [nodes, linkEditor?.nodeId]);
  const botheringPointById = useMemo(() => {
    const map = new Map<string, any>();
    (mindsetCards || []).forEach((card: any) => {
      if (!String(card?.id || "").startsWith("mindset_botherings_")) return;
      (card.points || []).forEach((point: any) => {
        if (point?.id) map.set(point.id, point);
      });
    });
    return map;
  }, [mindsetCards]);

  const availableBotherings = useMemo(() => {
    const list: Array<{ id: string; text: string; source: Exclude<BotheringSourceFilter, "all">; taskCount: number; hasTasks: boolean }> = [];
    (mindsetCards || []).forEach((card: any) => {
      const cardId = String(card?.id || "");
      if (!cardId.startsWith("mindset_botherings_")) return;
      const source = cardId.replace("mindset_botherings_", "") as Exclude<BotheringSourceFilter, "all">;
      if (source !== "external" && source !== "mismatch" && source !== "constraint") return;
      (card.points || []).forEach((point: any) => {
        if (!point?.id) return;
        const taskCount = Array.isArray(point.tasks) ? point.tasks.length : 0;
        list.push({
          id: point.id,
          text: point.text || point.id,
          source,
          taskCount,
          hasTasks: taskCount > 0,
        });
      });
    });
    return list;
  }, [mindsetCards]);
  const filteredBotherings = useMemo(() => {
    const q = botheringSearchQuery.trim().toLowerCase();
    return availableBotherings.filter((b) => {
      if (botheringSourceFilter !== "all" && b.source !== botheringSourceFilter) return false;
      if (onlyBotheringsWithTasks && !b.hasTasks) return false;
      if (!q) return true;
      return b.text.toLowerCase().includes(q);
    });
  }, [availableBotherings, botheringSearchQuery, botheringSourceFilter, onlyBotheringsWithTasks]);
  const linkableResourceCards = useMemo(
    () =>
      (resources || [])
        .filter((resource: any) => resource?.type === "card" && typeof resource?.id === "string" && resource.id.trim().length > 0)
        .map((resource: any) => ({ id: String(resource.id), name: String(resource.name || resource.id) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [resources]
  );
  const linkableResourceCardById = useMemo(
    () => new Map(linkableResourceCards.map((resource) => [resource.id, resource])),
    [linkableResourceCards]
  );
  const filteredResourceCards = useMemo(() => {
    const query = resourceSearchQuery.trim().toLowerCase();
    if (!query) return linkableResourceCards;
    return linkableResourceCards.filter((resource) => resource.name.toLowerCase().includes(query));
  }, [linkableResourceCards, resourceSearchQuery]);
  const taskOverlayNode = useMemo(() => {
    if (!taskOverlayNodeId) return null;
    return nodes.find((n) => n.id === taskOverlayNodeId) || null;
  }, [nodes, taskOverlayNodeId]);
  const taskOverlayCards = useMemo(() => {
    if (!taskOverlayNode) return [];
    return collectNodeTaskCards(taskOverlayNode, botheringPointById);
  }, [taskOverlayNode, botheringPointById]);
  const taskOverlayRows = useMemo(() => {
    if (taskOverlayCards.length === 0) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const fullMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthEnd = today < fullMonthEnd ? today : fullMonthEnd;
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;

    const loggedById = new Map<string, { minutes: number; sessions: number }>();
    const loggedByName = new Map<string, { minutes: number; sessions: number }>();
    Object.entries(schedule || {}).forEach(([dateKey, day]) => {
      if (!dateKey.startsWith(monthPrefix)) return;
      Object.values(day as any).forEach((value: any) => {
        if (!Array.isArray(value)) return;
        value.forEach((activity: any) => {
          const minutes = getLoggedMinutesForActivity(
            activity,
            allDeepWorkLogs,
            allUpskillLogs,
            brandingLogs,
            allLeadGenLogs,
            allWorkoutLogs,
            allMindProgrammingLogs,
            dateKey
          );
          if (minutes <= 0) return;

          const ids = new Set<string>([
            stripInstanceDateSuffix(activity?.id),
            ...((activity?.taskIds || []).map((id: string) => stripInstanceDateSuffix(id))),
          ].filter(Boolean));
          ids.forEach((id) => {
            const existing = loggedById.get(id) || { minutes: 0, sessions: 0 };
            loggedById.set(id, { minutes: existing.minutes + minutes, sessions: existing.sessions + 1 });
          });

          const activityName = normalizeText(activity?.details || "");
          if (activityName) {
            const existing = loggedByName.get(activityName) || { minutes: 0, sessions: 0 };
            loggedByName.set(activityName, { minutes: existing.minutes + minutes, sessions: existing.sessions + 1 });
          }
        });
      });
    });

    const rows = taskOverlayCards
      .map((card) => {
        const task = card.task || {};
        const taskName = getTaskLabel(task);
        const taskNameKey = normalizeText(taskName);
        const taskId = stripInstanceDateSuffix(task.id || task.activityId || "");
        const logged = (taskId && loggedById.get(taskId)) || loggedByName.get(taskNameKey) || { minutes: 0, sessions: 0 };
        const hoursConsumed = Number((logged.minutes / 60).toFixed(2));

        const matchedRoutines = (settings.routines || []).filter((routine: any) => {
          const routineId = stripInstanceDateSuffix(routine.id || "");
          const routineName = normalizeText(routine.details || "");
          if (taskId && routineId === taskId) return true;
          if (taskNameKey && routineName === taskNameKey) return true;
          return false;
        });
        const dueInRange =
          matchedRoutines.length > 0
            ? matchedRoutines.reduce(
                (sum: number, routine: any) => sum + (countRoutineOccurrencesBetween(routine, monthStart, monthEnd) || 0),
                0
              )
            : null;
        const missedCount = dueInRange == null ? 0 : Math.max(0, dueInRange - logged.sessions);
        const missedRate = dueInRange && dueInRange > 0 ? missedCount / dueInRange : 0;
        const cadenceLabels = Array.from(new Set(matchedRoutines.map((routine: any) => getRoutineRepeatabilityLabel(routine)).filter(Boolean)));
        const repeatability = cadenceLabels.length === 0 ? getTaskRepeatability(task) : cadenceLabels.length === 1 ? cadenceLabels[0] : "Mixed";
        const coreState = String(task?.coreState || task?.domain || (card.source === "external" ? "Health" : card.source === "mismatch" ? "Meaning" : "N/A"));
        const scheduleSnapshot = getTaskScheduleSnapshot(task, schedule as Record<string, any>);
        return {
          card,
          taskName,
          hoursConsumed,
          missedCount,
          missedRate,
          repeatability,
          coreState,
          scheduleSnapshot,
        };
      })
      .filter((row) => row.hoursConsumed > 0);

    const maxHours = Math.max(1, ...rows.map((row) => row.hoursConsumed));
    return rows.map((row) => ({
      ...row,
      consumptionPct: Math.min(100, (row.hoursConsumed / maxHours) * 100),
    }));
  }, [
    taskOverlayCards,
    schedule,
    settings.routines,
    allDeepWorkLogs,
    allUpskillLogs,
    brandingLogs,
    allLeadGenLogs,
    allWorkoutLogs,
    allMindProgrammingLogs,
  ]);
  const visibleTaskOverlayRows = useMemo(
    () => taskOverlayRows.filter((row) => !taskOverlayClosedCardIds.includes(row.card.id)),
    [taskOverlayRows, taskOverlayClosedCardIds]
  );
  const getLinkedTaskCount = useCallback(
    (node: StateNode) => {
      if (!node.linkedBotheringIds?.length) return 0;
      return node.linkedBotheringIds.reduce((sum, botheringId) => {
        const tasks = botheringPointById.get(botheringId)?.tasks;
        return sum + (Array.isArray(tasks) ? tasks.length : 0);
      }, 0);
    },
    [botheringPointById]
  );
  const nodeLinkedTaskStatusById = useMemo(() => {
    const map = new Map<string, { pending: number; positive: number; unknown: number }>();
    nodes.forEach((node) => {
      const cards = collectNodeTaskCards(node, botheringPointById);
      let pending = 0;
      let positive = 0;
      let unknown = 0;
      cards.forEach((card) => {
        const snapshot = getTaskScheduleSnapshot(card.task, schedule as Record<string, any>);
        if (!snapshot) {
          unknown += 1;
          return;
        }
        if (snapshot.status === "pending") {
          pending += 1;
          return;
        }
        positive += 1; // due + completed => green
      });
      map.set(node.id, { pending, positive, unknown });
    });
    return map;
  }, [nodes, botheringPointById, schedule]);
  useEffect(() => {
    if (!taskOverlayNodeId) return;
    if (nodes.some((node) => node.id === taskOverlayNodeId)) return;
    setTaskOverlayNodeId(null);
  }, [nodes, taskOverlayNodeId]);
  useEffect(() => {
    setTaskOverlayClosedCardIds([]);
  }, [taskOverlayNodeId]);

  const activityMapByDate = useMemo(() => {
    const map = new Map<string, Map<string, { completed?: boolean }>>();
    Object.entries(schedule || {}).forEach(([dateKey, day]) => {
      const activityMap = new Map<string, { completed?: boolean }>();
      Object.values(day as any).forEach((value: any) => {
        if (!Array.isArray(value)) return;
        value.forEach((act: any) => {
          if (!act?.id) return;
          activityMap.set(act.id, act);
          const baseMatch = String(act.id).match(/_(\d{4}-\d{2}-\d{2})$/);
          if (baseMatch) {
            const baseId = String(act.id).slice(0, -11);
            if (!activityMap.has(baseId)) activityMap.set(baseId, act);
          }
        });
      });
      map.set(dateKey, activityMap);
    });
    return map;
  }, [schedule]);

  const isTaskDueOnDate = useCallback((task: any, dateKey: string) => {
    const startKey = task?.startDate || task?.dateKey;
    if (!startKey) return false;
    const start = new Date(startKey);
    const date = new Date(dateKey);
    if (Number.isNaN(start.getTime()) || Number.isNaN(date.getTime())) return false;
    if (getDateKey(start) > getDateKey(date)) return false;
    if (task?.recurrence === "daily") return true;
    if (task?.recurrence === "weekly") return start.getDay() === date.getDay();
    return startKey === dateKey;
  }, []);

  const isTaskCompletedOnDate = useCallback((task: any, dateKey: string) => {
    const activityMap = activityMapByDate.get(dateKey);
    const activity = activityMap?.get(task?.activityId || task?.id);
    if (activity?.completed) return true;
    if (task?.recurrence && task.recurrence !== "none") {
      return !!task?.completionHistory?.[dateKey];
    }
    if (task?.dateKey && task.dateKey !== dateKey) return false;
    return !!task?.completed;
  }, [activityMapByDate]);

  const nodeRuntimeById = useMemo(() => {
    const now = new Date();
    const todayKey = getDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getDateKey(yesterday);
    const map = new Map<string, RuntimeState>();

    nodes.forEach((node) => {
      const linked = node.linkedBotheringIds || [];
      if (linked.length === 0) {
        map.set(node.id, 0);
        return;
      }
      const tasks = linked.flatMap((id) => (botheringPointById.get(id)?.tasks || []));
      if (tasks.length === 0) {
        map.set(node.id, 1);
        return;
      }
      const dueToday = tasks.filter((t: any) => isTaskDueOnDate(t, todayKey));
      if (dueToday.length > 0 && dueToday.every((t: any) => isTaskCompletedOnDate(t, todayKey))) {
        map.set(node.id, 3);
        return;
      }
      const dueYesterday = tasks.filter((t: any) => isTaskDueOnDate(t, yesterdayKey));
      if (dueYesterday.some((t: any) => !isTaskCompletedOnDate(t, yesterdayKey))) {
        map.set(node.id, 2);
        return;
      }
      map.set(node.id, 1);
    });
    return map;
  }, [nodes, botheringPointById, isTaskDueOnDate, isTaskCompletedOnDate]);

  const runtimeMeta: Record<RuntimeState, { level: number; label: string; meaning: string; color: string }> = {
    0: { level: 0, label: "Uninitialized", meaning: "botherings not linked", color: "#6b7280" }, // grey
    1: { level: 1, label: "Dormant", meaning: "botherings linked not tasks added", color: "#f97316" }, // orange
    2: { level: 2, label: "Suspended", meaning: "tasks missed", color: "#facc15" }, // yellow
    3: { level: 3, label: "Active", meaning: "tasks completed", color: "#22c55e" }, // green
  };
  const filteredDiagramSearch = useMemo(() => {
    const q = diagramSearchQuery.trim().toLowerCase();
    if (!q) return diagrams;
    return diagrams.filter((d) => d.name.toLowerCase().includes(q));
  }, [diagramSearchQuery, diagrams]);
  const openedDiagrams = useMemo(
    () => openDiagramIds.map((id) => diagrams.find((d) => d.id === id)).filter(Boolean) as DiagramDoc[],
    [openDiagramIds, diagrams]
  );
  const outgoingByNode = useMemo(() => {
    const map = new Map<string, StateEdge[]>();
    edges.forEach((e) => {
      const list = map.get(e.from) || [];
      list.push(e);
      map.set(e.from, list);
    });
    return map;
  }, [edges]);
  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    const ids = new Set<string>();
    const duplicates = new Set<string>();
    nodes.forEach((n) => {
      if (ids.has(n.id)) duplicates.add(n.id);
      ids.add(n.id);
    });
    duplicates.forEach((id) => issues.push(`Duplicate state id: ${id}`));

    const starts = nodes.filter((n) => (n.kind || "normal") === "start");
    const ends = nodes.filter((n) => (n.kind || "normal") === "end");
    if (starts.length === 0) issues.push("No start state defined.");
    if (starts.length > 1) issues.push(`Multiple start states: ${starts.map((n) => n.id).join(", ")}`);
    if (ends.length === 0) issues.push("No end state defined.");

    edges.forEach((e) => {
      if (!ids.has(e.from) || !ids.has(e.to)) issues.push(`Broken transition: ${e.id} (${e.from} -> ${e.to})`);
    });

    const graphStart = starts[0]?.id;
    if (graphStart) {
      const visited = new Set<string>([graphStart]);
      const queue = [graphStart];
      while (queue.length) {
        const current = queue.shift()!;
        (outgoingByNode.get(current) || []).forEach((edge) => {
          if (!visited.has(edge.to)) {
            visited.add(edge.to);
            queue.push(edge.to);
          }
        });
      }
      nodes.forEach((n) => {
        if (!visited.has(n.id)) issues.push(`Unreachable state from start: ${n.id}`);
      });
    }

    nodes.forEach((n) => {
      const outgoing = outgoingByNode.get(n.id) || [];
      if (outgoing.length === 0 && (n.kind || "normal") !== "end") {
        issues.push(`Dead-end non-end state: ${n.id}`);
      }
    });
    return issues;
  }, [nodes, edges, outgoingByNode]);
  const metrics = useMemo(() => {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const startCount = nodes.filter((n) => (n.kind || "normal") === "start").length;
    const endCount = nodes.filter((n) => (n.kind || "normal") === "end").length;
    const avgOut = nodeCount ? edgeCount / nodeCount : 0;
    return {
      nodeCount,
      edgeCount,
      startCount,
      endCount,
      avgOut,
      issues: validationIssues.length,
    };
  }, [nodes, edges, validationIssues.length]);
  const searchableNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return nodes;
    return nodes.filter((n) =>
      [n.id, n.title, n.subtitle, n.note].some((x) => String(x || "").toLowerCase().includes(q))
    );
  }, [nodes, searchQuery]);
  const canUndo = historyPastRef.current.length > 0;
  const canRedo = historyFutureRef.current.length > 0;

  const undo = useCallback(() => {
    const previous = historyPastRef.current.pop();
    if (!previous) return;
    historyFutureRef.current.push(cloneStore({
      diagrams: diagramsRef.current,
      activeDiagramId: activeDiagramIdRef.current,
      openDiagramIds: openDiagramIdsRef.current,
      pinnedDiagramIds: pinnedDiagramIdsRef.current,
    }));
    if (historyFutureRef.current.length > MAX_HISTORY) {
      historyFutureRef.current.shift();
    }
    setDiagrams(previous.diagrams);
    setActiveDiagramId(previous.activeDiagramId);
    setOpenDiagramIds(previous.openDiagramIds?.length ? previous.openDiagramIds : [previous.activeDiagramId]);
    setPinnedDiagramIds(previous.pinnedDiagramIds || []);
    setHistoryVersion((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    const next = historyFutureRef.current.pop();
    if (!next) return;
    historyPastRef.current.push(cloneStore({
      diagrams: diagramsRef.current,
      activeDiagramId: activeDiagramIdRef.current,
      openDiagramIds: openDiagramIdsRef.current,
      pinnedDiagramIds: pinnedDiagramIdsRef.current,
    }));
    if (historyPastRef.current.length > MAX_HISTORY) {
      historyPastRef.current.shift();
    }
    setDiagrams(next.diagrams);
    setActiveDiagramId(next.activeDiagramId);
    setOpenDiagramIds(next.openDiagramIds?.length ? next.openDiagramIds : [next.activeDiagramId]);
    setPinnedDiagramIds(next.pinnedDiagramIds || []);
    setHistoryVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    return {
      x: (clientX - r.left - camera.x) / camera.zoom,
      y: (clientY - r.top - camera.y) / camera.zoom,
    };
  }, [camera.x, camera.y, camera.zoom]);

  const fitToView = useCallback(() => {
    const currentNodes = nodesRef.current;
    if (!frameRef.current || currentNodes.length === 0) return;

    const minX = Math.min(...currentNodes.map((n) => n.x));
    const minY = Math.min(...currentNodes.map((n) => n.y));
    const maxX = Math.max(...currentNodes.map((n) => n.x + getNodeWidth(n)));
    const maxY = Math.max(...currentNodes.map((n) => n.y + getNodeHeight(n)));
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);

    const availW = Math.max(200, frameSize.width - FIT_PADDING * 2);
    const availH = Math.max(200, frameSize.height - FIT_PADDING * 2);
    const zoom = clamp(Math.min(availW / width, availH / height), MIN_ZOOM, MAX_ZOOM);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    setCamera({
      zoom,
      x: frameSize.width / 2 - cx * zoom,
      y: frameSize.height / 2 - cy * zoom,
    });
  }, [frameSize.height, frameSize.width, setCamera]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new ResizeObserver(() => {
      setFrameSize({ width: frame.clientWidth, height: frame.clientHeight });
    });

    observer.observe(frame);
    setFrameSize({ width: frame.clientWidth, height: frame.clientHeight });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (didInitialFitRef.current) return;
    if (shouldSkipInitialFitRef.current) {
      didInitialFitRef.current = true;
      return;
    }
    const id = requestAnimationFrame(() => {
      fitToView();
      didInitialFitRef.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, fitToView]);

  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => fitToView());
    return () => cancelAnimationFrame(id);
  }, [fitNonce, fitToView, isOpen]);

  useEffect(() => {
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setTaskOverlayNodeId(null);
    setTextEdit(null);
    setTextDraft("");
    setEdgeTextEditId(null);
    setEdgeTextDraft("");
    setDiagramNameDraft(activeDiagram?.name || "");
    if (nodes.length > 0) {
      setNewEdgeFrom(nodes[0].id);
      setNewEdgeTo(nodes[Math.min(1, nodes.length - 1)].id);
    }
  }, [activeDiagramId, nodes, activeDiagram?.name]);

  const startPan = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    if (toolMode === "arrow") return;
    setEdgeBendEditId(null);
    if (e.shiftKey) {
      const world = toWorld(e.clientX, e.clientY);
      marqueeRef.current = { startX: world.x, startY: world.y };
      setSelectionBox({ x1: world.x, y1: world.y, x2: world.x, y2: world.y });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    panRef.current = { startX: e.clientX, startY: e.clientY, camX: camera.x, camY: camera.y };
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setEdgeTextEditId(null);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const startNodeDrag = (e: React.PointerEvent<SVGGElement>, nodeId: string) => {
    e.stopPropagation();
    setEdgeBendEditId(null);
    const w = toWorld(e.clientX, e.clientY);
    const node = nodeMap.get(nodeId);
    if (!node) return;

    pushHistorySnapshot({
      diagrams: diagramsRef.current,
      activeDiagramId: activeDiagramIdRef.current,
      openDiagramIds: openDiagramIdsRef.current,
      pinnedDiagramIds: pinnedDiagramIdsRef.current,
    }, true);
    dragRef.current = { nodeId, offsetX: w.x - node.x, offsetY: w.y - node.y, moved: false };
    if (e.shiftKey) {
      setSelectedNodeIds((prev) => (prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]));
    } else {
      setSelectedNodeId(nodeId);
      setSelectedNodeIds((prev) => (prev.includes(nodeId) ? prev : [nodeId]));
    }
    setSelectedEdgeId(null);
    setTextEdit(null);
    setEdgeTextEditId(null);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const startOrCompleteConnectFromNode = (nodeId: NodeId) => {
    setEdgeBendEditId(null);
    const node = nodeMap.get(nodeId);
    if (!node) return;
    if (connectDraft && connectDraft.fromId !== nodeId) {
      completeConnect(nodeId);
      return;
    }
    const c = centerOf(node);
    setConnectDraft({ fromId: nodeId, x: c.x, y: c.y });
    setSelectedEdgeId(null);
    setSelectedNodeId(nodeId);
    setSelectedNodeIds([nodeId]);
  };

  const completeConnect = (toId: NodeId) => {
    if (!connectDraft || connectDraft.fromId === toId) {
      setConnectDraft(null);
      return;
    }
    const edge = buildDefaultEdge(connectDraft.fromId, toId, "transition", "#94a3b8");
    setEdges((prev) => [...prev, edge]);
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setConnectDraft(null);
  };

  const startEdgeBendDrag = (
    e: React.PointerEvent<SVGCircleElement>,
    edge: StateEdge,
    handle: "cp1" | "cp2" | "center"
  ) => {
    e.stopPropagation();
    const controls = ensureEdgeCubic(edge);
    if (!controls) return;
    const start = toWorld(e.clientX, e.clientY);
    pushHistorySnapshot({
      diagrams: diagramsRef.current,
      activeDiagramId: activeDiagramIdRef.current,
      openDiagramIds: openDiagramIdsRef.current,
      pinnedDiagramIds: pinnedDiagramIdsRef.current,
    }, true);
    bendDragRef.current = {
      edgeId: edge.id,
      handle,
      startX: start.x,
      startY: start.y,
      originCp1x: controls.cp1x,
      originCp1y: controls.cp1y,
      originCp2x: controls.cp2x,
      originCp2y: controls.cp2y,
    };
    setEdges((prev) =>
      prev.map((ed) =>
        ed.id === edge.id
          ? {
              ...ed,
              geometry: "cubic",
              cp1x: controls.cp1x,
              cp1y: controls.cp1y,
              cp2x: controls.cp2x,
              cp2y: controls.cp2y,
            }
          : ed
      ),
      { recordHistory: false }
    );
    setEdgeBendEditId(edge.id);
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };

  const toggleNodeTaskOverlay = useCallback(
    (node: StateNode) => {
      const cards = collectNodeTaskCards(node, botheringPointById);
      if (cards.length === 0) {
        setTaskOverlayNodeId(null);
        return;
      }
      if (taskOverlayNodeId === node.id) {
        setTaskOverlayNodeId(null);
        return;
      }

      const nodeWidth = getNodeWidth(node);
      const anchorX = camera.x + (node.x + nodeWidth + 18) * camera.zoom;
      const anchorY = camera.y + (node.y + 12) * camera.zoom;
      setTaskOverlayCardPositions((prev) => {
        const next = { ...prev };
        cards.forEach((card, idx) => {
          if (!next[card.id]) {
            next[card.id] = {
              x: anchorX + (idx % 2) * 14,
              y: anchorY + idx * 28,
            };
          }
        });
        return next;
      });
      setTaskOverlayNodeId(node.id);
    },
    [botheringPointById, camera.x, camera.y, camera.zoom, taskOverlayNodeId]
  );

  const startTaskOverlayDrag = (e: React.PointerEvent<HTMLDivElement>, cardId: string) => {
    e.stopPropagation();
    const pos = taskOverlayCardPositions[cardId] || { x: e.clientX, y: e.clientY };
    taskCardDragRef.current = {
      cardId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMoveInternal = (clientX: number, clientY: number, altKey: boolean) => {
    const marquee = marqueeRef.current;
    if (marquee) {
      const world = toWorld(clientX, clientY);
      setSelectionBox({ x1: marquee.startX, y1: marquee.startY, x2: world.x, y2: world.y });
      return;
    }

    if (connectDraft) {
      const world = toWorld(clientX, clientY);
      setConnectDraft((prev) => {
        if (!prev) return prev;
        if (Math.abs(prev.x - world.x) < 0.8 && Math.abs(prev.y - world.y) < 0.8) return prev;
        return { ...prev, x: world.x, y: world.y };
      });
      return;
    }

    const bendDrag = bendDragRef.current;
    if (bendDrag) {
      const w = toWorld(clientX, clientY);
      const dx = w.x - bendDrag.startX;
      const dy = w.y - bendDrag.startY;
      const nextCp1x = bendDrag.handle === "cp2" ? bendDrag.originCp1x : bendDrag.originCp1x + dx;
      const nextCp1y = bendDrag.handle === "cp2" ? bendDrag.originCp1y : bendDrag.originCp1y + dy;
      const nextCp2x = bendDrag.handle === "cp1" ? bendDrag.originCp2x : bendDrag.originCp2x + dx;
      const nextCp2y = bendDrag.handle === "cp1" ? bendDrag.originCp2y : bendDrag.originCp2y + dy;
      setEdges(
        (prev) => {
          let changed = false;
          const next = prev.map((ed) => {
            if (ed.id !== bendDrag.edgeId) return ed;
            if (
              Math.abs((ed.cp1x ?? bendDrag.originCp1x) - nextCp1x) < 0.2 &&
              Math.abs((ed.cp1y ?? bendDrag.originCp1y) - nextCp1y) < 0.2 &&
              Math.abs((ed.cp2x ?? bendDrag.originCp2x) - nextCp2x) < 0.2 &&
              Math.abs((ed.cp2y ?? bendDrag.originCp2y) - nextCp2y) < 0.2 &&
              ed.geometry === "cubic"
            ) {
              return ed;
            }
            changed = true;
            return {
              ...ed,
              geometry: "cubic",
              cp1x: nextCp1x,
              cp1y: nextCp1y,
              cp2x: nextCp2x,
              cp2y: nextCp2y,
            };
          });
          return changed ? next : prev;
        },
        { recordHistory: false }
      );
      return;
    }

    const drag = dragRef.current;
    if (drag) {
      const w = toWorld(clientX, clientY);
      const nextX = w.x - drag.offsetX;
      const nextY = w.y - drag.offsetY;
      const snappedX = altKey ? nextX : snapToGrid(nextX);
      const snappedY = altKey ? nextY : snapToGrid(nextY);
      drag.moved = true;
      const group = selectedNodeIds.includes(drag.nodeId) ? selectedNodeIds : [drag.nodeId];
      const sourceNode = nodeMap.get(drag.nodeId);
      const dx = sourceNode ? snappedX - sourceNode.x : 0;
      const dy = sourceNode ? snappedY - sourceNode.y : 0;
      if (dx === 0 && dy === 0) return;
      setNodes(
        (prev) => {
          let changed = false;
          const next = prev.map((n) => {
            if (!group.includes(n.id)) return n;
            changed = true;
            return { ...n, x: n.x + dx, y: n.y + dy };
          });
          return changed ? next : prev;
        },
        { recordHistory: false }
      );
      return;
    }

    const pan = panRef.current;
    if (!pan) return;

    const nextX = pan.camX + (clientX - pan.startX);
    const nextY = pan.camY + (clientY - pan.startY);
    setCamera((prev) => {
      if (Math.abs(prev.x - nextX) < 0.25 && Math.abs(prev.y - nextY) < 0.25) return prev;
      return { ...prev, x: nextX, y: nextY };
    });
  };

  const flushPointerMove = useCallback(() => {
    moveRafRef.current = null;
    const sample = latestPointerRef.current;
    if (!sample) return;
    onPointerMoveInternal(sample.clientX, sample.clientY, sample.altKey);
  }, [connectDraft, edges, nodeMap, selectedNodeIds]);

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    latestPointerRef.current = { clientX: e.clientX, clientY: e.clientY, altKey: e.altKey };
    if (moveRafRef.current !== null) return;
    moveRafRef.current = requestAnimationFrame(flushPointerMove);
  };

  const stopPointer = () => {
    const marquee = marqueeRef.current;
    if (marquee && selectionBox) {
      const minX = Math.min(selectionBox.x1, selectionBox.x2);
      const minY = Math.min(selectionBox.y1, selectionBox.y2);
      const maxX = Math.max(selectionBox.x1, selectionBox.x2);
      const maxY = Math.max(selectionBox.y1, selectionBox.y2);
      const hits = nodes.filter((n) => {
        const w = getNodeWidth(n);
        const h = getNodeHeight(n);
        return n.x + w >= minX && n.x <= maxX && n.y + h >= minY && n.y <= maxY;
      }).map((n) => n.id);
      setSelectedNodeIds(hits);
      setSelectedNodeId(hits[0] || null);
      setSelectedEdgeId(null);
    }
    if (dragRef.current && !dragRef.current.moved) {
      historyPastRef.current.pop();
      setHistoryVersion((v) => v + 1);
    }
    if (bendDragRef.current) {
      bendDragRef.current = null;
    }
    if (moveRafRef.current !== null) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
    }
    latestPointerRef.current = null;
    marqueeRef.current = null;
    setSelectionBox(null);
    if (toolMode === "cursor") {
      setConnectDraft(null);
    }
    panRef.current = null;
    dragRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (moveRafRef.current !== null) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = null;
      }
    };
  }, []);

  const zoomAtPoint = useCallback((px: number, py: number, deltaY: number) => {
    setCamera((prev) => {
      const step = deltaY > 0 ? -0.08 : 0.08;
      const nextZoom = clamp(Number((prev.zoom + step).toFixed(3)), MIN_ZOOM, MAX_ZOOM);
      if (nextZoom === prev.zoom) return prev;

      const worldX = (px - prev.x) / prev.zoom;
      const worldY = (py - prev.y) / prev.zoom;

      return {
        zoom: nextZoom,
        x: px - worldX * nextZoom,
        y: py - worldY * nextZoom,
      };
    });
  }, [setCamera]);

  const zoomByStep = useCallback((deltaY: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    zoomAtPoint(frame.clientWidth / 2, frame.clientHeight / 2, deltaY);
  }, [zoomAtPoint]);
  const handleFrameWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    zoomAtPoint(px, py, event.deltaY);
  }, [zoomAtPoint]);

  useEffect(() => {
    const activeChanged = prevActiveDiagramIdForZoomRef.current !== activeDiagramId;
    if (activeChanged) {
      prevActiveDiagramIdForZoomRef.current = activeDiagramId;
      return;
    }
    sharedZoomRef.current = clamp(camera.zoom, MIN_ZOOM, MAX_ZOOM);
  }, [activeDiagramId, camera.zoom]);

  useEffect(() => {
    const targetZoom = clamp(sharedZoomRef.current, MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(camera.zoom - targetZoom) < 0.0001) return;
    setCamera((prev) => ({ ...prev, zoom: targetZoom }));
  }, [activeDiagramId, camera.zoom, setCamera]);

  const addNode = () => {
    const id = getNextNodeId(nodes);
    const idx = nodes.length + 1;
    const created: StateNode = {
      id,
      title: "New State",
      subtitle: "Editable",
      note: "Add your note",
      x: snapToGrid(200 + (idx % 6) * 180),
      y: snapToGrid(200 + (idx % 4) * 130),
      fill: randomStateColor(),
    };
    setNodes((prev) => [...prev, created]);
    setSelectedNodeId(id);
    setTextEdit({ nodeId: id, field: "title" });
    setTextDraft(created.title);
    setNewEdgeFrom(id);
    setNewEdgeTo(id);
  };

  const addEdge = () => {
    if (!newEdgeFrom || !newEdgeTo || newEdgeFrom === newEdgeTo) return;
    const edge = buildDefaultEdge(newEdgeFrom, newEdgeTo, newEdgeLabel.trim() || "transition", newEdgeColor);
    setEdges((prev) => [...prev, edge]);
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  };

  const addNewDiagram = () => {
    const nextIndex = diagrams.length + 1;
    const doc = createEmptyDiagram(nextIndex);
    applyStoreUpdate((store) => ({
      diagrams: [...store.diagrams, doc],
      activeDiagramId: doc.id,
      openDiagramIds: [...(store.openDiagramIds || []), doc.id],
      pinnedDiagramIds: store.pinnedDiagramIds || [],
    }));
    setEditingTabDiagramId(doc.id);
    setEditingTabName(doc.name);
    setTabContextMenu(null);
    setSidebarTab("diagrams");
    setFitNonce((v) => v + 1);
  };

  const renameActiveDiagram = () => {
    const next = diagramNameDraft.trim();
    if (!next) return;
    updateActiveDiagram((doc) => ({ ...doc, name: next }));
  };

  const resetTemplate = () => {
    updateActiveDiagram((doc) => ({
      ...doc,
      nodes: createDefaultNodes(),
      edges: createDefaultEdges(),
      camera: { x: 0, y: 0, zoom: 1 },
    }));
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setTextEdit(null);
    setTextDraft("");
    setNewEdgeLabel("new transition");
    setNewEdgeColor("#94a3b8");
    setFitNonce((v) => v + 1);
  };

  const removeSelectedNode = () => {
    const ids = selectedNodeIds.length > 0 ? selectedNodeIds : selectedNodeId ? [selectedNodeId] : [];
    if (ids.length === 0) return;
    const setIds = new Set(ids);
    updateActiveDiagram((doc) => ({
      ...doc,
      nodes: doc.nodes.filter((n) => !setIds.has(n.id)),
      edges: doc.edges.filter((e) => !setIds.has(e.from) && !setIds.has(e.to)),
    }));
    setSelectedNodeId(null);
    setSelectedNodeIds([]);
    setTextEdit(null);
    setTextDraft("");
  };

  const removeSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setEdges((prev) => prev.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    const isTypingElement = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      const tag = element.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select" || element.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingElement(event.target)) return;
      const key = event.key.toLowerCase();
      const modifier = event.metaKey || event.ctrlKey;

      if (modifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (modifier && key === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (modifier && key === "d" && selectedNodeIds.length > 0) {
        event.preventDefault();
        const selectedSet = new Set(selectedNodeIds);
        const clones = nodes
          .filter((n) => selectedSet.has(n.id))
          .map((n, idx) => ({
            ...n,
            id: `${n.id}_copy_${Date.now()}_${idx}`,
            x: n.x + GRID_SIZE * 2,
            y: n.y + GRID_SIZE * 2,
          }));
        setNodes((prev) => [...prev, ...clones]);
        setSelectedNodeIds(clones.map((n) => n.id));
        setSelectedNodeId(clones[0]?.id || null);
        return;
      }
      if (key.startsWith("arrow") && selectedNodeIds.length > 0) {
        event.preventDefault();
        const step = event.shiftKey ? GRID_SIZE * 2 : GRID_SIZE;
        const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
        const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
        if (dx || dy) {
          setNodes((prev) => prev.map((n) => (selectedNodeIds.includes(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n)));
        }
        return;
      }
      if (key === "delete" || key === "backspace") {
        event.preventDefault();
        if (selectedNodeId) removeSelectedNode();
        else if (selectedEdgeId) removeSelectedEdge();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, undo, redo, selectedNodeId, selectedEdgeId, selectedNodeIds, nodes, setNodes, removeSelectedNode, removeSelectedEdge, toolMode]);

  const startTextEdit = (node: StateNode, field: EditableField) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setTextEdit({ nodeId: node.id, field });
    setTextDraft(String(node[field] ?? ""));
  };

  const commitTextEdit = () => {
    if (!textEdit) return;
    const { nodeId, field } = textEdit;
    const nextValue = textDraft.trim();
    if (!nextValue) {
      setTextEdit(null);
      setTextDraft("");
      return;
    }
    if (field === "id") {
      updateActiveDiagram((doc) => ({
        ...doc,
        nodes: doc.nodes.map((n) => (n.id === nodeId ? { ...n, id: nextValue } : n)),
        edges: doc.edges.map((edge) => ({
          ...edge,
          from: edge.from === nodeId ? nextValue : edge.from,
          to: edge.to === nodeId ? nextValue : edge.to,
        })),
      }));
      if (selectedNodeId === nodeId) setSelectedNodeId(nextValue);
      if (newEdgeFrom === nodeId) setNewEdgeFrom(nextValue);
      if (newEdgeTo === nodeId) setNewEdgeTo(nextValue);
      setTextEdit({ nodeId: nextValue, field });
      setTextDraft(nextValue);
      return;
    }
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, [field]: nextValue } : n)));
    setTextEdit(null);
    setTextDraft("");
  };

  const cancelTextEdit = () => {
    setTextEdit(null);
    setTextDraft("");
  };

  const startEdgeTextEdit = (edge: StateEdge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setTextEdit(null);
    setEdgeTextEditId(edge.id);
    setEdgeTextDraft(edge.label);
  };

  const commitEdgeTextEdit = () => {
    if (!edgeTextEditId) return;
    setEdges((prev) => prev.map((ed) => (ed.id === edgeTextEditId ? { ...ed, label: edgeTextDraft } : ed)));
    setEdgeTextEditId(null);
    setEdgeTextDraft("");
  };

  const cancelEdgeTextEdit = () => {
    setEdgeTextEditId(null);
    setEdgeTextDraft("");
  };

  const resolveLinkedHackId = (hackId: string | null | undefined) => {
    const cleanId = (hackId || "").trim();
    if (!cleanId) return null;
    return brainHackById.has(cleanId) ? cleanId : null;
  };
  const resolveLinkedDiagramId = (diagramId: string | null | undefined) => {
    const cleanId = (diagramId || "").trim();
    if (!cleanId) return null;
    return diagrams.some((d) => d.id === cleanId) ? cleanId : null;
  };
  const resolveLinkedResourceId = (resourceId: string | null | undefined) => {
    const cleanId = (resourceId || "").trim();
    if (!cleanId) return null;
    return linkableResourceCardById.has(cleanId) ? cleanId : null;
  };

  const openLinkedBrainHack = (hackId: string | null | undefined, origin: { x: number; y: number }) => {
    const cleanId = resolveLinkedHackId(hackId);
    if (!cleanId) return;
    const maxX = typeof window !== "undefined" ? window.innerWidth - 360 : origin.x;
    const maxY = typeof window !== "undefined" ? window.innerHeight - 260 : origin.y;
    const safeX = Math.max(16, Math.min(origin.x + 20, maxX));
    const safeY = Math.max(16, Math.min(origin.y, maxY));
    setOpenBrainHackPopups((prev) => {
      const next = { ...prev };
      // Reinsert clicked id so it renders on top of earlier cards.
      delete next[cleanId];
      const openCount = Object.keys(next).length;
      next[cleanId] = {
        x: Math.min(safeX + openCount * 14, maxX),
        y: Math.min(safeY + openCount * 10, maxY),
      };
      return next;
    });
  };

  const openLinkEditorForNode = (node: StateNode) => {
    const currentResourceId = resolveLinkedResourceId(node.linkedResourceId) || "";
    const currentResourceName = currentResourceId ? (linkableResourceCardById.get(currentResourceId)?.name || "") : "";
    setLinkEditor({
      nodeId: node.id,
      hackId: node.linkedBrainHackId || "",
      diagramId: node.linkedDiagramId || "",
      resourceId: currentResourceId,
      botheringIds: node.linkedBotheringIds || [],
    });
    setResourceSearchQuery(currentResourceName);
    setBotheringSearchQuery("");
    setBotheringSourceFilter("all");
    setOnlyBotheringsWithTasks(false);
  };

  const updateNodeBrainHackLink = (nodeId: NodeId, nextHackId: string | null) => {
    const resolved = resolveLinkedHackId(nextHackId) || undefined;
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, linkedBrainHackId: resolved } : n)));
  };

  const saveLinkEditor = () => {
    if (!linkEditor?.nodeId) return;
    updateNodeBrainHackLink(linkEditor.nodeId, linkEditor.hackId);
    setNodes((prev) =>
      prev.map((n) =>
        n.id === linkEditor.nodeId
          ? {
              ...n,
              linkedDiagramId: linkEditor.diagramId || undefined,
              linkedResourceId: resolveLinkedResourceId(linkEditor.resourceId) || undefined,
              linkedBotheringIds: linkEditor.botheringIds || [],
            }
          : n
      )
    );
    setLinkEditor(null);
  };
  const toggleBotheringSelection = (botheringId: string) => {
    setLinkEditor((prev) => {
      if (!prev) return prev;
      const exists = prev.botheringIds.includes(botheringId);
      return {
        ...prev,
        botheringIds: exists ? prev.botheringIds.filter((id) => id !== botheringId) : [...prev.botheringIds, botheringId],
      };
    });
  };

  const openDiagramInTab = useCallback((diagramId: string) => {
    if (!diagrams.some((d) => d.id === diagramId)) return;
    setOpenDiagramIds((prev) => (prev.includes(diagramId) ? prev : [...prev, diagramId]));
    setActiveDiagramId(diagramId);
    setDiagramSearchOpen(false);
    setDiagramSearchQuery("");
  }, [diagrams]);

  const closeDiagramTab = useCallback((diagramId: string) => {
    if (pinnedDiagramIds.includes(diagramId)) return;
    setOpenDiagramIds((prev) => {
      const next = prev.filter((id) => id !== diagramId);
      if (next.length === 0) return prev;
      if (activeDiagramId === diagramId) {
        setActiveDiagramId(next[next.length - 1]);
      }
      return next;
    });
  }, [activeDiagramId, pinnedDiagramIds]);

  const togglePinDiagramTab = useCallback((diagramId: string) => {
    setPinnedDiagramIds((prev) => (prev.includes(diagramId) ? prev.filter((id) => id !== diagramId) : [...prev, diagramId]));
  }, []);

  const beginRenameDiagramTab = useCallback((diagramId: string) => {
    const target = diagrams.find((d) => d.id === diagramId);
    if (!target) return;
    openDiagramInTab(diagramId);
    setEditingTabDiagramId(diagramId);
    setEditingTabName(target.name);
    setTabContextMenu(null);
  }, [diagrams, openDiagramInTab]);

  const cancelRenameDiagramTab = useCallback(() => {
    setEditingTabDiagramId(null);
    setEditingTabName("");
  }, []);

  const commitRenameDiagramTab = useCallback(() => {
    if (!editingTabDiagramId) return;
    const current = diagrams.find((d) => d.id === editingTabDiagramId);
    if (!current) {
      cancelRenameDiagramTab();
      return;
    }
    const nextName = editingTabName.trim();
    const finalName = nextName || current.name;
    if (finalName !== current.name) {
      applyStoreUpdate((store) => ({
        ...store,
        diagrams: store.diagrams.map((doc) => (doc.id === editingTabDiagramId ? { ...doc, name: finalName } : doc)),
      }));
    }
    cancelRenameDiagramTab();
  }, [editingTabDiagramId, editingTabName, diagrams, applyStoreUpdate, cancelRenameDiagramTab]);

  const deleteDiagram = useCallback((diagramId: string) => {
    setTabContextMenu(null);
    if (editingTabDiagramId === diagramId) {
      cancelRenameDiagramTab();
    }
    applyStoreUpdate((store) => {
      if (store.diagrams.length <= 1) return store;
      const remaining = store.diagrams.filter((doc) => doc.id !== diagramId);
      if (remaining.length === store.diagrams.length) return store;

      const cleaned = remaining.map((doc) => ({
        ...doc,
        nodes: doc.nodes.map((node) => (
          node.linkedDiagramId === diagramId ? { ...node, linkedDiagramId: undefined } : node
        )),
      }));
      const fallbackId = cleaned[0]?.id || store.activeDiagramId;
      const nextActive = store.activeDiagramId === diagramId ? fallbackId : store.activeDiagramId;
      let nextOpen = (store.openDiagramIds || []).filter((id) => id !== diagramId);
      if (nextOpen.length === 0 && fallbackId) nextOpen = [fallbackId];
      if (nextActive && !nextOpen.includes(nextActive)) nextOpen.push(nextActive);
      const nextPinned = (store.pinnedDiagramIds || []).filter((id) => id !== diagramId);

      return {
        ...store,
        diagrams: cleaned,
        activeDiagramId: nextActive,
        openDiagramIds: nextOpen,
        pinnedDiagramIds: nextPinned,
      };
    });
  }, [applyStoreUpdate, editingTabDiagramId, cancelRenameDiagramTab]);

  useEffect(() => {
    if (!editingTabDiagramId) return;
    const raf = requestAnimationFrame(() => {
      tabNameInputRef.current?.focus();
      tabNameInputRef.current?.select();
    });
    return () => cancelAnimationFrame(raf);
  }, [editingTabDiagramId]);

  useEffect(() => {
    if (!tabContextMenu) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('[data-tab-context-menu="true"]')) return;
      setTabContextMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTabContextMenu(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [tabContextMenu]);

  useEffect(() => {
    if (!isOpen) return;
    if (!edgeBendEditId) return;
    const onWindowPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (svgRef.current?.contains(target)) return;
      setEdgeBendEditId(null);
    };
    window.addEventListener("pointerdown", onWindowPointerDown);
    return () => window.removeEventListener("pointerdown", onWindowPointerDown);
  }, [isOpen, edgeBendEditId]);

  useEffect(() => {
    const onWindowPointerMove = (event: PointerEvent) => {
      const drag = taskCardDragRef.current;
      if (!drag) return;
      const nextX = drag.originX + (event.clientX - drag.startX);
      const nextY = drag.originY + (event.clientY - drag.startY);
      setTaskOverlayCardPositions((prev) => {
        const current = prev[drag.cardId];
        if (current && Math.abs(current.x - nextX) < 0.5 && Math.abs(current.y - nextY) < 0.5) return prev;
        return { ...prev, [drag.cardId]: { x: nextX, y: nextY } };
      });
    };
    const onWindowPointerUp = () => {
      taskCardDragRef.current = null;
    };
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    return () => {
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onWindowPointerUp);
    };
  }, []);

  const focusNode = (nodeId: NodeId) => {
    const n = nodeMap.get(nodeId);
    if (!n) return;
    setSelectedNodeId(nodeId);
    setSelectedNodeIds([nodeId]);
    const cx = n.x + getNodeWidth(n) / 2;
    const cy = n.y + getNodeHeight(n) / 2;
    setCamera((prev) => ({
      ...prev,
      x: frameSize.width / 2 - cx * prev.zoom,
      y: frameSize.height / 2 - cy * prev.zoom,
    }));
  };

  const alignSelected = (mode: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    if (selectedNodeIds.length < 2) return;
    const picked = nodes.filter((n) => selectedNodeIds.includes(n.id));
    if (picked.length < 2) return;
    const minX = Math.min(...picked.map((n) => n.x));
    const maxX = Math.max(...picked.map((n) => n.x + getNodeWidth(n)));
    const minY = Math.min(...picked.map((n) => n.y));
    const maxY = Math.max(...picked.map((n) => n.y + getNodeHeight(n)));
    setNodes((prev) =>
      prev.map((n) => {
        if (!selectedNodeIds.includes(n.id)) return n;
        if (mode === "left") return { ...n, x: minX };
        if (mode === "right") return { ...n, x: maxX - getNodeWidth(n) };
        if (mode === "center") return { ...n, x: snapToGrid((minX + maxX - getNodeWidth(n)) / 2) };
        if (mode === "top") return { ...n, y: minY };
        if (mode === "bottom") return { ...n, y: maxY - getNodeHeight(n) };
        return { ...n, y: snapToGrid((minY + maxY - getNodeHeight(n)) / 2) };
      })
    );
  };

  const distributeSelected = (axis: "x" | "y") => {
    if (selectedNodeIds.length < 3) return;
    const picked = nodes.filter((n) => selectedNodeIds.includes(n.id));
    const sorted = [...picked].sort((a, b) => (axis === "x" ? a.x - b.x : a.y - b.y));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const span = axis === "x" ? last.x - first.x : last.y - first.y;
    const gap = span / (sorted.length - 1);
    const targets = new Map<string, number>();
    sorted.forEach((n, i) => targets.set(n.id, snapToGrid((axis === "x" ? first.x : first.y) + gap * i)));
    setNodes((prev) =>
      prev.map((n) => {
        const next = targets.get(n.id);
        if (typeof next !== "number") return n;
        return axis === "x" ? { ...n, x: next } : { ...n, y: next };
      })
    );
  };

  const exportJson = () => {
    const payload = JSON.stringify({ diagrams, activeDiagramId, openDiagramIds, pinnedDiagramIds }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `state-diagram-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      const clean = sanitizeStore(parsed);
      if (!clean) return;
      applyStoreUpdate(() => clean);
      setFitNonce((v) => v + 1);
    } catch {
      // ignore invalid payload
    }
  };

  const exportSvg = () => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `state-diagram-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPng = () => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const xml = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = frameSize.width;
      canvas.height = frameSize.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = CANVAS_BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `state-diagram-${Date.now()}.png`;
        a.click();
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const showSidebar = false;
  const gridColsClass = showSidebar
    ? sidebarCollapsed
      ? "lg:grid-cols-[minmax(0,1fr)_46px]"
      : "lg:grid-cols-[minmax(0,1fr)_320px]"
    : "lg:grid-cols-[minmax(0,1fr)]";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        className="max-w-[97vw] w-[97vw] h-[94vh] p-0 gap-0 overflow-hidden flex flex-col [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b border-border/60">
          <DialogTitle className="sr-only">State Diagram</DialogTitle>
          <DialogDescription className="sr-only">
            Interactive state diagram canvas for editing nodes, transitions, and linked task cards.
          </DialogDescription>
          <div className="relative flex items-center justify-between gap-3 px-2 py-1">
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="inline-flex items-center gap-1">
                {openedDiagrams.map((d) => {
                  const active = d.id === activeDiagramId;
                  const pinned = pinnedDiagramIds.includes(d.id);
                  return (
                    <div
                      key={`tab-${d.id}`}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${active ? "border-primary bg-primary/10" : "border-border/60 bg-muted/30"}`}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setTabContextMenu({ diagramId: d.id, x: event.clientX, y: event.clientY });
                      }}
                    >
                      {editingTabDiagramId === d.id ? (
                        <input
                          ref={tabNameInputRef}
                          value={editingTabName}
                          onChange={(e) => setEditingTabName(e.target.value)}
                          onBlur={commitRenameDiagramTab}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitRenameDiagramTab();
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelRenameDiagramTab();
                            }
                          }}
                          className="h-5 w-[160px] rounded border border-border/70 bg-background px-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                      ) : (
                        <button
                          type="button"
                          className="text-xs max-w-[180px] truncate"
                          onClick={() => openDiagramInTab(d.id)}
                          onDoubleClick={() => beginRenameDiagramTab(d.id)}
                        >
                          {d.name}
                        </button>
                      )}
                      <button
                        type="button"
                        className="rounded p-0.5 hover:bg-muted"
                        onClick={() => togglePinDiagramTab(d.id)}
                        title={pinned ? "Unpin tab" : "Pin tab"}
                      >
                        {pinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                      </button>
                      {!pinned ? (
                        <button
                          type="button"
                          className="rounded p-0.5 hover:bg-destructive/20"
                          onClick={() => closeDiagramTab(d.id)}
                          title="Close tab"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={addNewDiagram} title="New diagram">
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setDiagramSearchOpen((v) => !v)}
                title="Search diagrams"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onOpenChange(false)} title="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            {diagramSearchOpen ? (
              <div className="absolute right-0 top-10 z-40 w-80 rounded-md border border-border bg-popover p-2 shadow-lg">
                <Input
                  value={diagramSearchQuery}
                  onChange={(e) => setDiagramSearchQuery(e.target.value)}
                  placeholder="Search diagrams..."
                  className="h-8"
                />
                <div className="mt-2 max-h-52 overflow-y-auto space-y-1">
                  {filteredDiagramSearch.map((d) => (
                    <button
                      key={`search-diagram-${d.id}`}
                      type="button"
                      className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                      onClick={() => openDiagramInTab(d.id)}
                    >
                      {d.name}
                    </button>
                  ))}
                  {filteredDiagramSearch.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No diagrams found.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {tabContextMenu ? (
              <div
                data-tab-context-menu="true"
                className="fixed z-[120] min-w-[132px] rounded-md border border-border bg-popover p-1 shadow-lg"
                style={{ left: tabContextMenu.x, top: tabContextMenu.y }}
              >
                <button
                  type="button"
                  className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                  onClick={() => beginRenameDiagramTab(tabContextMenu.diagramId)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1 text-left text-xs text-destructive hover:bg-destructive/10 disabled:opacity-40"
                  disabled={diagrams.length <= 1}
                  onClick={() => deleteDiagram(tabContextMenu.diagramId)}
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </DialogHeader>

        <div className={`flex-1 min-h-0 grid grid-cols-1 ${gridColsClass}`}>
          <div className="min-w-0 flex flex-col">
            <div ref={frameRef} className="relative flex-1" style={{ touchAction: "none" }} onWheel={handleFrameWheel}>
              <div
                className="absolute left-1/2 top-4 z-30 -translate-x-1/2"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="inline-flex rounded-lg border border-border/70 bg-background/90 backdrop-blur-md shadow-lg px-1.5 py-1.5 gap-1">
                  <Button
                    size="icon"
                    variant={toolMode === "cursor" ? "default" : "outline"}
                    className="h-8 w-8"
                    title="Cursor mode"
                    onClick={() => {
                      setToolMode("cursor");
                      setConnectDraft(null);
                    }}
                  >
                    <MousePointer2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant={toolMode === "arrow" ? "default" : "outline"}
                    className="h-8 w-8"
                    title="Arrow mode"
                    onClick={() => setToolMode("arrow")}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    title="Add state"
                    onClick={addNode}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  {selectedEdge ? (
                    <>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        title="Curve left"
                        onClick={() => nudgeSelectedEdgeCurvature(-0.18)}
                      >
                        <ChevronsLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs"
                        title="Reset curve"
                        onClick={resetSelectedEdgeCurve}
                      >
                        0
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        title="Curve right"
                        onClick={() => nudgeSelectedEdgeCurvature(0.18)}
                      >
                        <ChevronsRight className="h-3.5 w-3.5" />
                      </Button>
                      <select
                        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                        title="Start arrowhead"
                        value={normalizeArrowhead(selectedEdge.startArrowhead)}
                        onChange={(e) => updateSelectedEdge({ startArrowhead: normalizeArrowhead(e.target.value) })}
                      >
                        <option value="none">Start: none</option>
                        <option value="triangle">Start: arrow</option>
                        <option value="bar">Start: bar</option>
                        <option value="dot">Start: dot</option>
                      </select>
                      <select
                        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                        title="End arrowhead"
                        value={normalizeArrowhead(selectedEdge.endArrowhead || DEFAULT_END_ARROWHEAD)}
                        onChange={(e) => updateSelectedEdge({ endArrowhead: normalizeArrowhead(e.target.value) })}
                      >
                        <option value="none">End: none</option>
                        <option value="triangle">End: arrow</option>
                        <option value="bar">End: bar</option>
                        <option value="dot">End: dot</option>
                      </select>
                    </>
                  ) : null}
                </div>
              </div>
              <div
                className="absolute bottom-4 left-4 z-30 flex items-center gap-2"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="inline-flex items-center rounded-lg border border-border/70 bg-background/90 backdrop-blur-md shadow-lg overflow-hidden">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-none"
                    title="Zoom out"
                    onClick={() => zoomByStep(1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <div className="min-w-[64px] text-center text-sm font-medium tabular-nums">
                    {Math.round(camera.zoom * 100)}%
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-none"
                    title="Zoom in"
                    onClick={() => zoomByStep(-1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="inline-flex items-center rounded-lg border border-border/70 bg-background/90 backdrop-blur-md shadow-lg overflow-hidden">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-none"
                    title="Undo"
                    onClick={undo}
                    disabled={!canUndo}
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-none"
                    title="Redo"
                    onClick={redo}
                    disabled={!canRedo}
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="h-full w-full overflow-hidden" style={{ backgroundColor: CANVAS_BG }}>
                <svg
                  ref={svgRef}
                  className="h-full w-full cursor-grab active:cursor-grabbing"
                  onPointerDown={startPan}
                  onPointerMove={onPointerMove}
                  onPointerUp={stopPointer}
                  onPointerLeave={stopPointer}
                  style={{ touchAction: "none", userSelect: "none" }}
                >
                  <defs>
                    <pattern id="grid-minor" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                      <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="#1e293b" strokeWidth="1" />
                    </pattern>
                    <pattern id="grid-major" width={GRID_SIZE * 4} height={GRID_SIZE * 4} patternUnits="userSpaceOnUse">
                      <rect width={GRID_SIZE * 4} height={GRID_SIZE * 4} fill="url(#grid-minor)" />
                      <path d={`M ${GRID_SIZE * 4} 0 L 0 0 0 ${GRID_SIZE * 4}`} fill="none" stroke="#334155" strokeWidth="1.4" />
                    </pattern>
                    <marker id="arrow-head-triangle" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
                    </marker>
                    <marker id="arrow-head-bar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M 5 0 L 5 10" stroke="context-stroke" strokeWidth="2.2" />
                    </marker>
                    <marker id="arrow-head-dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <circle cx="5" cy="5" r="3" fill="context-stroke" />
                    </marker>
                  </defs>

                  <g transform={`translate(${camera.x}, ${camera.y}) scale(${camera.zoom})`}>
                    <rect x={-12000} y={-12000} width={24000} height={24000} fill="url(#grid-major)" />
                    {edges.map((edge) => {
                      const from = nodeMap.get(edge.from);
                      const to = nodeMap.get(edge.to);
                      if (!from || !to) return null;

                      const a = centerOf(from);
                      const b = centerOf(to);
                      const geometry = getEdgeGeometry(edge, a, b);
                      const mx = geometry.mx;
                      const my = geometry.my;
                      const startArrowhead = normalizeArrowhead(edge.startArrowhead);
                      const endArrowhead = normalizeArrowhead(edge.endArrowhead || DEFAULT_END_ARROWHEAD);
                      const labelLines = [
                        ...(edge.label ? edge.label.split("\n") : []),
                        ...(edge.event ? [`on: ${edge.event}`] : []),
                        ...(edge.guard ? [`if: ${edge.guard}`] : []),
                        ...(edge.action ? [`do: ${edge.action}`] : []),
                      ];
                      const hasLabelContent = labelLines.some((line) => line.trim().length > 0);
                      const maxChars = labelLines.reduce((m, line) => Math.max(m, line.length), 0);
                      const textLineHeight = 18;
                      const labelW = Math.max(72, maxChars * 8 + 16);
                      const labelH = Math.max(22, labelLines.length * textLineHeight + 10);
                      const labelX = mx - labelW / 2;
                      const labelY = my - labelH / 2;

                      return (
                        <g
                          key={edge.id}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setSelectedEdgeId(edge.id);
                            setSelectedNodeId(null);
                            setSelectedNodeIds([]);
                            setEdgeBendEditId(null);
                          }}
                          className="cursor-pointer"
                        >
                          <path
                            d={geometry.d}
                            stroke="transparent"
                            strokeWidth={18}
                            fill="none"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setSelectedEdgeId(edge.id);
                              setSelectedNodeId(null);
                              setSelectedNodeIds([]);
                              setEdgeBendEditId(edge.id);
                            }}
                          />
                          <path
                            d={geometry.d}
                            stroke={selectedEdgeId === edge.id ? "#f8fafc" : edge.color}
                            strokeWidth={selectedEdgeId === edge.id ? 5 : 3}
                            opacity={0.9}
                            markerStart={getArrowheadMarkerUrl(startArrowhead)}
                            markerEnd={getArrowheadMarkerUrl(endArrowhead)}
                            fill="none"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setSelectedEdgeId(edge.id);
                              setSelectedNodeId(null);
                              setSelectedNodeIds([]);
                              setEdgeBendEditId(edge.id);
                            }}
                          />
                          {hasLabelContent ? (
                            <rect
                              x={labelX}
                              y={labelY}
                              width={labelW}
                              height={labelH}
                              rx={8}
                              fill={LABEL_BG}
                              onPointerDown={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                startEdgeTextEdit(edge);
                              }}
                            />
                          ) : null}
                          {edgeTextEditId === edge.id ? (
                            <foreignObject x={labelX + 4} y={labelY + 3} width={labelW - 8} height={labelH - 6}>
                              <textarea
                                autoFocus
                                value={edgeTextDraft}
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setEdgeTextDraft(e.target.value)}
                                onBlur={commitEdgeTextEdit}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") cancelEdgeTextEdit();
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    commitEdgeTextEdit();
                                  }
                                }}
                                className="h-full w-full resize-none border-0 bg-transparent p-0 text-center outline-none"
                                style={{ color: "#e2e8f0", fontSize: "14px", lineHeight: "18px" }}
                              />
                            </foreignObject>
                          ) : hasLabelContent ? (
                            <text
                              x={mx}
                              y={my - ((labelLines.length - 1) * textLineHeight) / 2 + 5}
                              textAnchor="middle"
                              fill="#e2e8f0"
                              fontSize="14"
                              style={{ userSelect: "none", cursor: "text" }}
                              onPointerDown={(e) => e.stopPropagation()}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                startEdgeTextEdit(edge);
                              }}
                            >
                              {labelLines.map((line, idx) => (
                                <tspan key={`${edge.id}-line-${idx}`} x={mx} dy={idx === 0 ? 0 : textLineHeight}>
                                  {line || " "}
                                </tspan>
                              ))}
                            </text>
                          ) : null}
                          {edgeBendEditId === edge.id ? (
                            <>
                              <line
                                x1={a.x}
                                y1={a.y}
                                x2={geometry.cp1.x}
                                y2={geometry.cp1.y}
                                stroke="#94a3b8"
                                strokeWidth={1.2}
                                strokeDasharray="4 3"
                                opacity={0.65}
                              />
                              <line
                                x1={b.x}
                                y1={b.y}
                                x2={geometry.cp2.x}
                                y2={geometry.cp2.y}
                                stroke="#94a3b8"
                                strokeWidth={1.2}
                                strokeDasharray="4 3"
                                opacity={0.65}
                              />
                              <circle
                                cx={geometry.cp1.x}
                                cy={geometry.cp1.y}
                                r={6}
                                fill="#0b1220"
                                stroke="#93c5fd"
                                strokeWidth={1.8}
                                onPointerDown={(e) => startEdgeBendDrag(e, edge, "cp1")}
                              />
                              <circle
                                cx={geometry.cp2.x}
                                cy={geometry.cp2.y}
                                r={6}
                                fill="#0b1220"
                                stroke="#93c5fd"
                                strokeWidth={1.8}
                                onPointerDown={(e) => startEdgeBendDrag(e, edge, "cp2")}
                              />
                              <circle
                                cx={mx}
                                cy={my}
                                r={7}
                                fill="#0b1220"
                                stroke="#e2e8f0"
                                strokeWidth={2}
                                data-edge-bend-handle="true"
                                onPointerDown={(e) => startEdgeBendDrag(e, edge, "center")}
                              />
                            </>
                          ) : null}
                        </g>
                      );
                    })}

                    {nodes.map((node) => {
                      const isEditing = textEdit?.nodeId === node.id;
                      const nodeWidth = getNodeWidth(node);
                      const nodeHeight = getNodeHeight(node);
                      const selected = selectedNodeId === node.id || selectedNodeIds.includes(node.id);
                      const textColors = getNodeTextColors(node.fill);
                      const runtime = nodeRuntimeById.get(node.id) ?? 0;
                      const linkedHackId = resolveLinkedHackId(node.linkedBrainHackId);
                      const linkedResourceId = resolveLinkedResourceId(node.linkedResourceId);
                      const hasNodeLinks =
                        !!linkedHackId ||
                        !!resolveLinkedDiagramId(node.linkedDiagramId) ||
                        !!linkedResourceId ||
                        (node.linkedBotheringIds?.length || 0) > 0;
                      const linkedTaskCount = getLinkedTaskCount(node);
                      const hasLinkedTaskCards = (node.linkedBotheringIds?.length || 0) > 0;
                      const linkedTaskStatus = nodeLinkedTaskStatusById.get(node.id) || { pending: 0, positive: 0, unknown: 0 };
                      const visibleTaskStatusDots = [
                        ...(linkedTaskStatus.pending > 0 ? [{ color: "#facc15", pulse: "0.78;1;0.78", r: "2.3;2.8;2.3" }] : []),
                        ...(linkedTaskStatus.positive > 0 ? [{ color: "#22c55e", pulse: "0.78;1;0.78", r: "2.3;2.8;2.3" }] : []),
                      ];
                      const runtimeBadge = runtimeMeta[runtime];
                      const lineMeta: Array<{ field: EditableField; y: number; fontSize: number; weight?: string; color: string; maxLines?: number }> = [
                        { field: "id", y: node.y + 30, fontSize: 26, weight: "700", color: textColors.primary, maxLines: 1 },
                        { field: "title", y: node.y + 58, fontSize: 20, weight: "600", color: textColors.primary, maxLines: 1 },
                        { field: "subtitle", y: node.y + 82, fontSize: 13, color: textColors.secondary, maxLines: 1 },
                        { field: "note", y: node.y + nodeHeight - 12, fontSize: 10, color: textColors.secondary, maxLines: 1 },
                      ];
                      return (
                        <g key={node.id} className="cursor-default">
                          <rect
                            x={node.x}
                            y={node.y}
                            width={nodeWidth}
                            height={nodeHeight}
                            rx={14}
                            fill={node.fill}
                            stroke={simNodeId === node.id ? "#22c55e" : selected ? "#f8fafc" : "#cbd5e1"}
                            strokeWidth={simNodeId === node.id ? 5 : selected ? 4 : 2}
                            onPointerDown={(e) => {
                              if (toolMode === "arrow") {
                                e.stopPropagation();
                                startOrCompleteConnectFromNode(node.id);
                                return;
                              }
                              startNodeDrag(e, node.id);
                            }}
                            style={{ cursor: toolMode === "arrow" ? "crosshair" : "move" }}
                          />
                          {(node.kind || "normal") === "start" ? (
                            <circle cx={node.x + 14} cy={node.y + 14} r={7} fill="#22c55e" stroke="#e2e8f0" strokeWidth={1.2} />
                          ) : null}
                          {(node.kind || "normal") === "end" ? (
                            <>
                              <circle cx={node.x + 14} cy={node.y + 14} r={7} fill="none" stroke="#f8fafc" strokeWidth={1.2} />
                              <circle cx={node.x + 14} cy={node.y + 14} r={11} fill="none" stroke="#f8fafc" strokeWidth={1.2} />
                            </>
                          ) : null}
                          <g>
                            <title>{`Level ${runtimeBadge.level} - ${runtimeBadge.label}: ${runtimeBadge.meaning}`}</title>
                            <circle cx={node.x + 24} cy={node.y + 21} r={13} fill={runtimeBadge.color} opacity={0.22}>
                              <animate attributeName="opacity" values="0.15;0.35;0.15" dur="1.2s" repeatCount="indefinite" />
                              <animate attributeName="r" values="11;15;11" dur="1.2s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={node.x + 24} cy={node.y + 21} r={8} fill={runtimeBadge.color} stroke="#0b1220" strokeWidth={1}>
                              <animate attributeName="opacity" values="0.75;1;0.75" dur="1.2s" repeatCount="indefinite" />
                            </circle>
                          </g>
                          {visibleTaskStatusDots.length > 0 ? (
                            <g>
                              <title>
                                {`Linked task status: ${linkedTaskStatus.pending > 0 ? "pending" : ""}${linkedTaskStatus.pending > 0 && linkedTaskStatus.positive > 0 ? ", " : ""}${linkedTaskStatus.positive > 0 ? "due/completed" : ""}`}
                              </title>
                              {visibleTaskStatusDots.map((dot, idx) => (
                                <circle
                                  key={`${node.id}-task-status-dot-${idx}`}
                                  cx={node.x + 44 + idx * 10}
                                  cy={node.y + 21}
                                  r={2.6}
                                  fill={dot.color}
                                  stroke="#0b1220"
                                  strokeWidth={0.8}
                                >
                                  <animate attributeName="opacity" values={dot.pulse} dur="1.2s" repeatCount="indefinite" />
                                  <animate attributeName="r" values={dot.r} dur="1.2s" repeatCount="indefinite" />
                                </circle>
                              ))}
                            </g>
                          ) : null}

                          <g
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNodeId(node.id);
                              setSelectedNodeIds((prev) => (e.shiftKey ? (prev.includes(node.id) ? prev.filter((id) => id !== node.id) : [...prev, node.id]) : [node.id]));
                              setSelectedEdgeId(null);
                              openLinkEditorForNode(node);
                            }}
                            style={{ cursor: "pointer" }}
                          >
                            <circle cx={node.x + nodeWidth - 14} cy={node.y + 14} r={10} fill={hasNodeLinks ? "#22c55e" : "#334155"} stroke="#e2e8f0" strokeWidth={1.5} />
                            <foreignObject x={node.x + nodeWidth - 20} y={node.y + 8} width={12} height={12} onPointerDown={(e) => e.stopPropagation()}>
                              <div className="h-full w-full flex items-center justify-center text-slate-100">
                                <BrainCircuit size={10} />
                              </div>
                            </foreignObject>
                          </g>
                          {hasLinkedTaskCards || linkedHackId || linkedResourceId ? (
                            <g>
                              {hasLinkedTaskCards ? (
                                <g
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNodeId(node.id);
                                    setSelectedNodeIds([node.id]);
                                    setSelectedEdgeId(null);
                                    toggleNodeTaskOverlay(node);
                                  }}
                                  style={{ cursor: "pointer" }}
                                >
                                  <circle
                                    cx={node.x + nodeWidth - 38}
                                    cy={node.y + 14}
                                    r={10}
                                    fill={taskOverlayNodeId === node.id ? "#38bdf8" : "#334155"}
                                    stroke="#e2e8f0"
                                    strokeWidth={1.5}
                                  />
                                  <foreignObject x={node.x + nodeWidth - 44} y={node.y + 8} width={12} height={12} onPointerDown={(e) => e.stopPropagation()}>
                                    <div className="h-full w-full flex items-center justify-center text-slate-100">
                                      <Expand size={9} />
                                    </div>
                                  </foreignObject>
                                  <text
                                    x={node.x + nodeWidth - 38}
                                    y={node.y + 28}
                                    textAnchor="middle"
                                    fontSize={8}
                                    fill="#e2e8f0"
                                    style={{ userSelect: "none" }}
                                  >
                                    {Math.min(99, linkedTaskCount)}
                                  </text>
                                </g>
                              ) : null}
                              {linkedHackId ? (
                                <g
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = svgRef.current?.getBoundingClientRect();
                                    const worldX = node.x + nodeWidth;
                                    const worldY = node.y;
                                    openLinkedBrainHack(linkedHackId, {
                                      x: (rect?.left || 0) + camera.x + worldX * camera.zoom + 8,
                                      y: (rect?.top || 0) + camera.y + worldY * camera.zoom,
                                    });
                                  }}
                                  style={{ cursor: "pointer" }}
                                >
                                  <circle cx={node.x + nodeWidth - (hasLinkedTaskCards ? 62 : 38)} cy={node.y + 14} r={10} fill="#2563eb" stroke="#e2e8f0" strokeWidth={1.5} />
                                  <foreignObject
                                    x={node.x + nodeWidth - (hasLinkedTaskCards ? 68 : 44)}
                                    y={node.y + 8}
                                    width={12}
                                    height={12}
                                    onPointerDown={(e) => e.stopPropagation()}
                                  >
                                    <div className="h-full w-full flex items-center justify-center text-slate-100">
                                      <ExternalLink size={9} />
                                    </div>
                                  </foreignObject>
                                </g>
                              ) : null}
                              {linkedResourceId ? (
                                <g
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openGeneralPopup(linkedResourceId, null);
                                  }}
                                  style={{ cursor: "pointer" }}
                                >
                                  <circle
                                    cx={node.x + nodeWidth - (hasLinkedTaskCards ? (linkedHackId ? 86 : 62) : (linkedHackId ? 62 : 38))}
                                    cy={node.y + 14}
                                    r={10}
                                    fill="#0ea5a4"
                                    stroke="#e2e8f0"
                                    strokeWidth={1.5}
                                  />
                                  <foreignObject
                                    x={node.x + nodeWidth - (hasLinkedTaskCards ? (linkedHackId ? 92 : 68) : (linkedHackId ? 68 : 44))}
                                    y={node.y + 8}
                                    width={12}
                                    height={12}
                                    onPointerDown={(e) => e.stopPropagation()}
                                  >
                                    <div className="h-full w-full flex items-center justify-center text-slate-100">
                                      <Library size={9} />
                                    </div>
                                  </foreignObject>
                                </g>
                              ) : null}
                            </g>
                          ) : null}
                          {resolveLinkedDiagramId(node.linkedDiagramId) ? (
                            <g
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetDiagramId = resolveLinkedDiagramId(node.linkedDiagramId);
                                if (!targetDiagramId) return;
                                openDiagramInTab(targetDiagramId);
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              <circle cx={node.x + nodeWidth - 14} cy={node.y + 36} r={9} fill="#1d4ed8" stroke="#e2e8f0" strokeWidth={1.2} />
                              <foreignObject x={node.x + nodeWidth - 20} y={node.y + 30} width={12} height={12} onPointerDown={(e) => e.stopPropagation()}>
                                <div className="h-full w-full flex items-center justify-center text-slate-100">
                                  <ArrowRight className="h-2.5 w-2.5" />
                                </div>
                              </foreignObject>
                            </g>
                          ) : null}

                          {lineMeta.map((line) => {
                            const active = isEditing && textEdit?.field === line.field;
                            const value = String(node[line.field] ?? "");
                            const maxChars = Math.max(8, Math.floor((nodeWidth - 24) / 8));
                            const wrapped = wrapTextToLines(value, maxChars, line.maxLines || 1);
                            return (
                              <g key={`${node.id}-${line.field}`}>
                                {!active ? (
                                  <text
                                    x={node.x + nodeWidth / 2}
                                    y={line.y}
                                    textAnchor="middle"
                                    fill={line.color}
                                    fontSize={line.fontSize}
                                    fontWeight={line.weight}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      startTextEdit(node, line.field);
                                    }}
                                    style={{ cursor: "text" }}
                                  >
                                    {wrapped.map((entry, idx) => (
                                      <tspan key={`${node.id}-${line.field}-${idx}`} x={node.x + nodeWidth / 2} dy={idx === 0 ? 0 : line.fontSize + 3}>
                                        {entry}
                                      </tspan>
                                    ))}
                                  </text>
                                ) : (
                                  <foreignObject x={node.x + 12} y={line.y - line.fontSize + 2} width={nodeWidth - 24} height={line.fontSize + 10}>
                                    <input
                                      autoFocus
                                      value={textDraft}
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => setTextDraft(e.target.value)}
                                      onBlur={commitTextEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") commitTextEdit();
                                        if (e.key === "Escape") cancelTextEdit();
                                      }}
                                      className="h-full w-full border-0 bg-transparent p-0 text-center outline-none"
                                      style={{ color: line.color, fontSize: `${line.fontSize}px`, fontWeight: line.weight as any }}
                                    />
                                  </foreignObject>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      );
                    })}

                    {connectDraft ? (
                      (() => {
                        const fromNode = nodeMap.get(connectDraft.fromId);
                        const start = fromNode ? centerOf(fromNode) : { x: connectDraft.x, y: connectDraft.y };
                        return (
                          <line
                            x1={start.x}
                            y1={start.y}
                            x2={connectDraft.x}
                            y2={connectDraft.y}
                            stroke="#f8fafc"
                            strokeDasharray="6 4"
                            strokeWidth={2}
                          />
                        );
                      })()
                    ) : null}

                    {selectionBox ? (
                      <rect
                        x={Math.min(selectionBox.x1, selectionBox.x2)}
                        y={Math.min(selectionBox.y1, selectionBox.y2)}
                        width={Math.abs(selectionBox.x2 - selectionBox.x1)}
                        height={Math.abs(selectionBox.y2 - selectionBox.y1)}
                        fill="rgba(56,189,248,0.15)"
                        stroke="#38bdf8"
                        strokeWidth={1.2}
                        strokeDasharray="4 4"
                      />
                    ) : null}
                  </g>
                </svg>
                {visibleTaskOverlayRows.length > 0
                  ? visibleTaskOverlayRows.map((row, idx) => {
                      const card = row.card;
                      const pos = taskOverlayCardPositions[card.id] || { x: 120 + idx * 12, y: 120 + idx * 20 };
                      const riskState = row.missedRate >= 0.8 ? "critical" : row.missedRate >= 0.5 ? "at-risk" : "safe";
                      const hours = row.hoursConsumed;

                      return (
                        <div
                          key={card.id}
                          className="absolute z-40 w-[320px] rounded-xl border border-red-900/40 bg-[#12141b]/95 p-3 shadow-2xl backdrop-blur-sm"
                          style={{ left: pos.x, top: pos.y }}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <div
                            className="mb-2 flex cursor-move items-center justify-between rounded-md border border-border/40 bg-background/40 px-2 py-1"
                            onPointerDown={(e) => startTaskOverlayDrag(e, card.id)}
                            title="Drag card"
                          >
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <GripHorizontal className="h-3 w-3" />
                              <span>{card.source}</span>
                            </div>
                            <button
                              type="button"
                              className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                              onClick={() => {
                                if (visibleTaskOverlayRows.length <= 1) {
                                  setTaskOverlayNodeId(null);
                                  return;
                                }
                                setTaskOverlayClosedCardIds((prev) => (prev.includes(card.id) ? prev : [...prev, card.id]));
                              }}
                              title="Close card"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                            <div className="mb-1 flex items-start justify-between gap-2">
                              <p className="line-clamp-2 text-sm font-semibold text-foreground">{row.taskName}</p>
                              <div className="text-right">
                                <p className="text-[10px] text-muted-foreground leading-none">Hours</p>
                                <p className="text-base font-semibold tabular-nums leading-tight">{hours.toFixed(2)}</p>
                              </div>
                            </div>
                            {(riskState === "critical" || riskState === "at-risk") ? (
                              <div className={`mb-2 rounded border px-2 py-1 text-[11px] ${riskState === "critical" ? "border-rose-400/50 bg-rose-500/10 text-rose-200" : "border-orange-400/50 bg-orange-500/10 text-orange-200"}`}>
                                {riskState === "critical" ? "Critical Risk" : "At Risk"} ({Math.round(row.missedRate * 100)}% missed)
                              </div>
                            ) : null}
                            <div className="space-y-1">
                              <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                                <div className="h-full bg-cyan-400/80 rounded-full" style={{ width: `${row.consumptionPct}%` }} />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>{row.consumptionPct.toFixed(0)}% consumption</span>
                                <span className={`tabular-nums ${row.missedCount > 0 ? "text-rose-300" : "text-emerald-300"}`}>Missed {row.missedCount}</span>
                              </div>
                            </div>
                            <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                              <p>Repeatability: <span className="font-medium text-foreground">{row.repeatability}</span></p>
                              <p>Bothering: <span className="font-medium text-foreground">{card.botheringText}</span></p>
                              <p>Core State: <span className="font-medium text-foreground">{row.coreState}</span></p>
                              {row.scheduleSnapshot ? (
                                row.scheduleSnapshot.mode === "today" ? (
                                  <p>
                                    Today Status:{" "}
                                    <span className={`font-medium ${row.scheduleSnapshot.status === "completed" ? "text-emerald-300" : row.scheduleSnapshot.status === "due" ? "text-rose-300" : "text-amber-300"}`}>
                                      {row.scheduleSnapshot.status}
                                    </span>
                                  </p>
                                ) : (
                                  <p>
                                    Last Scheduled:{" "}
                                    <span className="font-medium text-foreground">{formatDateLabel(row.scheduleSnapshot.dateKey)}</span>{" "}
                                    <span className={`font-medium ${row.scheduleSnapshot.status === "completed" ? "text-emerald-300" : "text-amber-300"}`}>
                                      ({row.scheduleSnapshot.status})
                                    </span>
                                  </p>
                                )
                              ) : (
                                <p>
                                  Last Scheduled: <span className="font-medium text-muted-foreground">N/A</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  : taskOverlayNodeId ? (
                    <div className="absolute z-40 left-6 top-6 rounded-md border border-border/60 bg-background/90 px-3 py-2 text-xs text-muted-foreground">
                      No month-view task cards found for linked botherings.
                    </div>
                  ) : null
                }
              </div>
            </div>
          </div>

          {showSidebar ? (
          <div className="shrink-0 bg-background border-l border-border/60">
            {sidebarCollapsed ? (
              <div className="h-full flex items-start justify-center pt-3">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSidebarCollapsed(false)}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <div className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant={sidebarTab === "editor" ? "default" : "outline"} onClick={() => setSidebarTab("editor")}>Editor</Button>
                      <Button size="sm" variant={sidebarTab === "states" ? "default" : "outline"} onClick={() => setSidebarTab("states")}>States</Button>
                      <Button size="sm" variant={sidebarTab === "diagrams" ? "default" : "outline"} onClick={() => setSidebarTab("diagrams")}>Diagrams</Button>
                      <Button size="sm" variant={sidebarTab === "analyze" ? "default" : "outline"} onClick={() => setSidebarTab("analyze")}>Analyze</Button>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSidebarCollapsed(true)}>
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {sidebarTab === "editor" ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={addNode}>Add State</Button>
                        <Button size="sm" variant="outline" onClick={addEdge}>Add Arrow</Button>
                        <Button size="sm" variant="outline" onClick={resetTemplate}>Reset</Button>
                      </div>
                      <div className="rounded-lg border border-border/70 p-3 space-y-2">
                        <p className="text-sm font-semibold">Selection Tools</p>
                        <p className="text-xs text-muted-foreground">Shift+Drag on empty space for box select. Ctrl/Cmd+D duplicates. Arrow keys nudge.</p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => alignSelected("left")}>Align L</Button>
                          <Button size="sm" variant="outline" onClick={() => alignSelected("center")}>Align C</Button>
                          <Button size="sm" variant="outline" onClick={() => alignSelected("right")}>Align R</Button>
                          <Button size="sm" variant="outline" onClick={() => distributeSelected("x")}>Distribute X</Button>
                          <Button size="sm" variant="outline" onClick={() => distributeSelected("y")}>Distribute Y</Button>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/70 p-3 space-y-2">
                        <p className="text-sm font-semibold">New Arrow</p>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">From</p>
                          <select className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm" value={newEdgeFrom} onChange={(e) => setNewEdgeFrom(e.target.value)}>
                            {nodes.map((n) => <option key={`from-${n.id}`} value={n.id}>{n.id} - {n.title}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">To</p>
                          <select className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm" value={newEdgeTo} onChange={(e) => setNewEdgeTo(e.target.value)}>
                            {nodes.map((n) => <option key={`to-${n.id}`} value={n.id}>{n.id} - {n.title}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Label</p>
                          <Textarea value={newEdgeLabel} onChange={(e) => setNewEdgeLabel(e.target.value)} rows={2} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Color</p>
                          <Input value={newEdgeColor} onChange={(e) => setNewEdgeColor(e.target.value)} />
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/70 p-3 space-y-2">
                        <p className="text-sm font-semibold">Selected State</p>
                        {selectedNode ? (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Fill Color</p>
                              <Input value={selectedNode.fill} onChange={(e) => setNodes((prev) => prev.map((n) => n.id === selectedNode.id ? { ...n, fill: e.target.value } : n))} />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Type</p>
                              <select
                                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                                value={selectedNode.kind || "normal"}
                                onChange={(e) => setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, kind: e.target.value as NodeKind } : n)))}
                              >
                                <option value="normal">Normal</option>
                                <option value="start">Start</option>
                                <option value="end">End</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Width</p>
                                <Input
                                  type="number"
                                  value={Math.round(getNodeWidth(selectedNode))}
                                  onChange={(e) =>
                                    setNodes((prev) =>
                                      prev.map((n) =>
                                        n.id === selectedNode.id ? { ...n, width: Math.max(NODE_MIN_W, Number(e.target.value) || NODE_MIN_W) } : n
                                      )
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Height</p>
                                <Input
                                  type="number"
                                  value={Math.round(getNodeHeight(selectedNode))}
                                  onChange={(e) =>
                                    setNodes((prev) =>
                                      prev.map((n) =>
                                        n.id === selectedNode.id ? { ...n, height: Math.max(NODE_MIN_H, Number(e.target.value) || NODE_MIN_H) } : n
                                      )
                                    )
                                  }
                                />
                              </div>
                            </div>
                            <Button size="sm" variant="destructive" onClick={removeSelectedNode}>Delete State</Button>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Select a state node from canvas.</p>
                        )}
                      </div>

                      <div className="rounded-lg border border-border/70 p-3 space-y-2">
                        <p className="text-sm font-semibold">Selected Arrow</p>
                        {selectedEdge ? (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Label</p>
                              <Textarea value={selectedEdge.label} onChange={(e) => setEdges((prev) => prev.map((ed) => ed.id === selectedEdge.id ? { ...ed, label: e.target.value } : ed))} rows={3} />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Color</p>
                              <Input value={selectedEdge.color} onChange={(e) => setEdges((prev) => prev.map((ed) => ed.id === selectedEdge.id ? { ...ed, color: e.target.value } : ed))} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEdges((prev) =>
                                    prev.map((ed) => {
                                      if (ed.id !== selectedEdge.id) return ed;
                                      const fromNode = nodeMap.get(ed.from);
                                      const toNode = nodeMap.get(ed.to);
                                      if (!fromNode || !toNode) return ed;
                                      const a = centerOf(fromNode);
                                      const b = centerOf(toNode);
                                      const controls = getDefaultCubicControls(a, b, ed.curve ?? DEFAULT_CURVE);
                                      return {
                                        ...ed,
                                        geometry: "cubic",
                                        cp1x: controls.cp1.x,
                                        cp1y: controls.cp1.y,
                                        cp2x: controls.cp2.x,
                                        cp2y: controls.cp2.y,
                                      };
                                    })
                                  )
                                }
                              >
                                Free Curve
                              </Button>
                              <Button size="sm" variant="outline" onClick={resetSelectedEdgeCurve}>
                                Auto Curve
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Start Head</p>
                                <select
                                  className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                                  value={normalizeArrowhead(selectedEdge.startArrowhead)}
                                  onChange={(e) =>
                                    setEdges((prev) =>
                                      prev.map((ed) =>
                                        ed.id === selectedEdge.id ? { ...ed, startArrowhead: normalizeArrowhead(e.target.value) } : ed
                                      )
                                    )
                                  }
                                >
                                  <option value="none">None</option>
                                  <option value="triangle">Arrow</option>
                                  <option value="bar">Bar</option>
                                  <option value="dot">Dot</option>
                                </select>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">End Head</p>
                                <select
                                  className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                                  value={normalizeArrowhead(selectedEdge.endArrowhead || DEFAULT_END_ARROWHEAD)}
                                  onChange={(e) =>
                                    setEdges((prev) =>
                                      prev.map((ed) =>
                                        ed.id === selectedEdge.id ? { ...ed, endArrowhead: normalizeArrowhead(e.target.value) } : ed
                                      )
                                    )
                                  }
                                >
                                  <option value="none">None</option>
                                  <option value="triangle">Arrow</option>
                                  <option value="bar">Bar</option>
                                  <option value="dot">Dot</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Event</p>
                              <Input value={selectedEdge.event || ""} onChange={(e) => setEdges((prev) => prev.map((ed) => ed.id === selectedEdge.id ? { ...ed, event: e.target.value } : ed))} />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Guard Condition</p>
                              <Input value={selectedEdge.guard || ""} onChange={(e) => setEdges((prev) => prev.map((ed) => ed.id === selectedEdge.id ? { ...ed, guard: e.target.value } : ed))} />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Action</p>
                              <Input value={selectedEdge.action || ""} onChange={(e) => setEdges((prev) => prev.map((ed) => ed.id === selectedEdge.id ? { ...ed, action: e.target.value } : ed))} />
                            </div>
                            <Button size="sm" variant="destructive" onClick={removeSelectedEdge}>Delete Arrow</Button>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Select an arrow from canvas.</p>
                        )}
                      </div>

                      <div className="rounded-lg border border-border/70 p-3 space-y-2">
                        <p className="text-sm font-semibold">Simulation</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSimNodeId(nodes.find((n) => (n.kind || "normal") === "start")?.id || null)}
                          >
                            Start
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setSimNodeId(null)}>Stop</Button>
                        </div>
                        {simNodeId ? (
                          <div className="space-y-2">
                            <p className="text-xs">Current: <span className="font-semibold">{simNodeId}</span></p>
                            {(outgoingByNode.get(simNodeId) || []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">No outgoing transitions from current state.</p>
                            ) : (
                              <div className="space-y-1">
                                {(outgoingByNode.get(simNodeId) || []).map((edge) => (
                                  <Button key={`sim-${edge.id}`} size="sm" variant="outline" className="w-full justify-start" onClick={() => setSimNodeId(edge.to)}>
                                    {edge.label || edge.id} {"->"} {edge.to}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Run transitions from start state to test behavior.</p>
                        )}
                      </div>
                    </>
                  ) : null}

                  {sidebarTab === "states" ? (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-border/70 p-2">
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search states..."
                          className="mb-2 h-8"
                        />
                        <p className="px-1 py-1 text-sm font-semibold">All States ({nodes.length})</p>
                        <div className="space-y-1 max-h-[45vh] overflow-y-auto pr-1">
                          {searchableNodes.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              className="w-full rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 text-left hover:bg-muted/40 relative"
                              onClick={() => {
                                focusNode(n.id);
                              }}
                            >
                              <p className="text-xs font-semibold">{n.id} - {n.title}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{n.subtitle} | {n.note}</p>
                              {n.linkedBrainHackId ? (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  Linked Brain Hack: {brainHackById.get(n.linkedBrainHackId)?.text || n.linkedBrainHackId}
                                </p>
                              ) : null}
                              {resolveLinkedHackId(n.linkedBrainHackId) ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="absolute right-1 top-1 h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                    openLinkedBrainHack(n.linkedBrainHackId, { x: rect.right, y: rect.top });
                                  }}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/70 p-3 space-y-2">
                        <p className="text-sm font-semibold">Selected State Link</p>
                        {selectedNode ? (
                          <>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Brain Hack Card</p>
                              <select
                                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                                value={selectedNode.linkedBrainHackId || ""}
                                onChange={(e) => {
                                  const next = e.target.value.trim() || null;
                                  updateNodeBrainHackLink(selectedNode.id, next);
                                }}
                              >
                                <option value="">No linked Brain Hack</option>
                                {parentBrainHacks.map((hack) => (
                                  <option key={`brainhack-link-${hack.id}`} value={hack.id}>
                                    {hack.text || hack.id}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!resolveLinkedHackId(selectedNode.linkedBrainHackId)}
                                onClick={(e) => {
                                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                  openLinkedBrainHack(selectedNode.linkedBrainHackId, { x: rect.right, y: rect.top });
                                }}
                              >
                                Open Linked Card
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!resolveLinkedHackId(selectedNode.linkedBrainHackId)}
                                onClick={() =>
                                  updateNodeBrainHackLink(selectedNode.id, null)
                                }
                              >
                                Clear Link
                              </Button>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Resource Card</p>
                              <select
                                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                                value={resolveLinkedResourceId(selectedNode.linkedResourceId) || ""}
                                onChange={(e) => {
                                  const next = resolveLinkedResourceId(e.target.value);
                                  setNodes((prev) =>
                                    prev.map((n) =>
                                      n.id === selectedNode.id ? { ...n, linkedResourceId: next || undefined } : n
                                    )
                                  );
                                }}
                              >
                                <option value="">No linked resource card</option>
                                {linkableResourceCards.map((resource) => (
                                  <option key={`resource-link-${resource.id}`} value={resource.id}>
                                    {resource.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!resolveLinkedResourceId(selectedNode.linkedResourceId)}
                                onClick={() => {
                                  const targetId = resolveLinkedResourceId(selectedNode.linkedResourceId);
                                  if (!targetId) return;
                                  openGeneralPopup(targetId, null);
                                }}
                              >
                                Open Linked Resource
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!resolveLinkedResourceId(selectedNode.linkedResourceId)}
                                onClick={() =>
                                  setNodes((prev) =>
                                    prev.map((n) =>
                                      n.id === selectedNode.id ? { ...n, linkedResourceId: undefined } : n
                                    )
                                  )
                                }
                              >
                                Clear Resource
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Select a state to link a Brain Hack card.</p>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {sidebarTab === "diagrams" ? (
                    <div className="rounded-lg border border-border/70 p-2 space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-sm font-semibold">Diagrams ({diagrams.length})</p>
                        <Button size="sm" variant="outline" onClick={addNewDiagram}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 px-1">
                        <Button size="sm" variant="outline" onClick={exportJson}>Export JSON</Button>
                        <label className="inline-flex">
                          <input
                            type="file"
                            accept="application/json"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void importJson(file);
                              e.currentTarget.value = "";
                            }}
                          />
                          <span className="inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background px-3 text-sm cursor-pointer">
                            Import JSON
                          </span>
                        </label>
                        <Button size="sm" variant="outline" onClick={exportSvg}>Export SVG</Button>
                        <Button size="sm" variant="outline" onClick={exportPng}>Export PNG</Button>
                      </div>
                      <div className="space-y-1 px-1">
                        <p className="text-xs text-muted-foreground">Active diagram name</p>
                        <div className="flex items-center gap-2">
                          <Input
                            value={diagramNameDraft}
                            onChange={(e) => setDiagramNameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renameActiveDiagram();
                            }}
                            placeholder="Diagram name"
                          />
                          <Button size="sm" variant="outline" onClick={renameActiveDiagram}>Save</Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {diagrams.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            className={`w-full rounded-md border px-2 py-1.5 text-left ${d.id === activeDiagramId ? "border-primary bg-primary/10" : "border-border/60 bg-muted/20 hover:bg-muted/40"}`}
                            onClick={() => {
                              setActiveDiagramId(d.id);
                              setFitNonce((v) => v + 1);
                            }}
                          >
                            <p className="text-xs font-semibold">{d.name}</p>
                            <p className="text-[11px] text-muted-foreground">{d.nodes.length} states, {d.edges.length} arrows</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {sidebarTab === "analyze" ? (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-border/70 p-3 space-y-1">
                        <p className="text-sm font-semibold">Metrics</p>
                        <p className="text-xs">States: {metrics.nodeCount}</p>
                        <p className="text-xs">Transitions: {metrics.edgeCount}</p>
                        <p className="text-xs">Start states: {metrics.startCount}</p>
                        <p className="text-xs">End states: {metrics.endCount}</p>
                        <p className="text-xs">Avg outgoing/state: {metrics.avgOut.toFixed(2)}</p>
                        <p className="text-xs">Validation issues: {metrics.issues}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 p-3 space-y-2">
                        <p className="text-sm font-semibold">Validation</p>
                        {validationIssues.length === 0 ? (
                          <p className="text-xs text-emerald-400">No issues found.</p>
                        ) : (
                          <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                            {validationIssues.map((issue, idx) => (
                              <p key={`issue-${idx}`} className="text-xs text-amber-300">{issue}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
          ) : null}
        </div>

        <Dialog open={!!linkEditorNode} onOpenChange={(open) => { if (!open) setLinkEditor(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Link Node</DialogTitle>
              <DialogDescription>
                {linkEditorNode ? `Configure links for ${linkEditorNode.id} - ${linkEditorNode.title}` : "Configure links."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Linked Botherings</p>
                <Input
                  value={botheringSearchQuery}
                  onChange={(e) => setBotheringSearchQuery(e.target.value)}
                  placeholder="Search botherings..."
                  className="h-8"
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(["all", "external", "mismatch", "constraint"] as BotheringSourceFilter[]).map((source) => (
                    <Button
                      key={`bothering-source-${source}`}
                      type="button"
                      size="sm"
                      variant={botheringSourceFilter === source ? "default" : "outline"}
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setBotheringSourceFilter(source)}
                    >
                      {source === "all" ? "All" : source[0].toUpperCase() + source.slice(1)}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant={onlyBotheringsWithTasks ? "default" : "outline"}
                    className="h-7 px-2 text-[11px]"
                    onClick={() => setOnlyBotheringsWithTasks((v) => !v)}
                  >
                    Only With Tasks
                  </Button>
                </div>
                <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-border bg-background/40 p-1">
                  {filteredBotherings.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No botherings found for current filters.</p>
                  ) : (
                    filteredBotherings.map((b) => {
                      const selected = (linkEditor?.botheringIds || []).includes(b.id);
                      return (
                        <button
                          key={`quick-bothering-link-${b.id}`}
                          type="button"
                          className={`mb-1 w-full rounded border px-2 py-1.5 text-left text-xs last:mb-0 ${
                            selected ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:bg-muted/40"
                          }`}
                          onClick={() => toggleBotheringSelection(b.id)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="line-clamp-2">{b.text}</span>
                            <span className="shrink-0 rounded border border-border/60 px-1.5 py-0.5 text-[10px]">
                              {b.source}
                            </span>
                          </div>
                          <p className="mt-1 text-[10px] text-muted-foreground">{b.taskCount} task{b.taskCount === 1 ? "" : "s"}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Linked Diagram Tab</p>
                <select
                  className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                  value={linkEditor?.diagramId || ""}
                  onChange={(e) =>
                    setLinkEditor((prev) => (prev ? { ...prev, diagramId: e.target.value } : prev))
                  }
                >
                  <option value="">No linked diagram</option>
                  {diagrams.map((d) => (
                      <option key={`quick-diagram-link-${d.id}`} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Linked Resource Card</p>
                <Input
                  value={resourceSearchQuery}
                  onChange={(e) => setResourceSearchQuery(e.target.value)}
                  placeholder="Search resource cards..."
                  className="h-8"
                />
                <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border bg-background/40 p-1">
                  <button
                    type="button"
                    className={`mb-1 w-full rounded border px-2 py-1.5 text-left text-xs ${
                      !(linkEditor?.resourceId || "") ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:bg-muted/40"
                    }`}
                    onClick={() => {
                      setLinkEditor((prev) => (prev ? { ...prev, resourceId: "" } : prev));
                    }}
                  >
                    No linked resource card
                  </button>
                  {filteredResourceCards.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No resource cards found.</p>
                  ) : (
                    filteredResourceCards.slice(0, 120).map((resource) => {
                      const isSelected = (linkEditor?.resourceId || "") === resource.id;
                      return (
                        <button
                          key={`quick-resource-link-${resource.id}`}
                          type="button"
                          className={`mb-1 w-full rounded border px-2 py-1.5 text-left text-xs last:mb-0 ${
                            isSelected ? "border-primary bg-primary/10" : "border-border/60 bg-background hover:bg-muted/40"
                          }`}
                          onClick={() => {
                            setLinkEditor((prev) => (prev ? { ...prev, resourceId: resource.id } : prev));
                            setResourceSearchQuery(resource.name);
                          }}
                        >
                          {resource.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Brain Hack Card</p>
              <select
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                value={linkEditor?.hackId || ""}
                onChange={(e) =>
                  setLinkEditor((prev) => (prev ? { ...prev, hackId: e.target.value } : prev))
                }
              >
                <option value="">No linked Brain Hack</option>
                {parentBrainHacks.map((hack) => (
                  <option key={`quick-brainhack-link-${hack.id}`} value={hack.id}>
                    {hack.text || hack.id}
                  </option>
                ))}
              </select>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setLinkEditor(null)}>Cancel</Button>
                <Button variant="outline" onClick={saveLinkEditor}>Save Link</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
