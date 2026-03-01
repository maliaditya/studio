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

type GraphNodeType = "bothering-type" | "bothering" | "routine" | "specialization" | "resource" | "canvas";
type GraphEdgeType =
  | "contains"
  | "linked-task"
  | "routine-source"
  | "specialization-fit"
  | "resource-canvas"
  | "canvas-link"
  | "spec-canvas";

type GraphNode = {
  id: string;
  label: string;
  type: GraphNodeType;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
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

const normalizeText = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\w]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const colorForNode = (type: GraphNodeType, lightTheme = false) => {
  if (type === "bothering-type") return "#a855f7";
  if (type === "bothering") return "#f97316";
  if (type === "routine") return "#22c55e";
  if (type === "specialization") return lightTheme ? "#0284c7" : "#38bdf8";
  if (type === "resource") return "#f59e0b";
  return lightTheme ? "#475569" : "#e5e7eb";
};

const strokeForEdge = (type: GraphEdgeType, lightTheme = false) => {
  if (lightTheme) {
    if (type === "canvas-link") return "rgba(71, 85, 105, 0.65)";
    if (type === "resource-canvas") return "rgba(217, 119, 6, 0.6)";
    if (type === "specialization-fit" || type === "spec-canvas") return "rgba(2, 132, 199, 0.55)";
    if (type === "routine-source") return "rgba(124, 58, 237, 0.6)";
    return "rgba(71, 85, 105, 0.38)";
  }
  if (type === "canvas-link") return "rgba(148, 163, 184, 0.75)";
  if (type === "resource-canvas") return "rgba(245, 158, 11, 0.65)";
  if (type === "specialization-fit" || type === "spec-canvas") return "rgba(56, 189, 248, 0.65)";
  if (type === "routine-source") return "rgba(168, 85, 247, 0.65)";
  return "rgba(163, 163, 163, 0.45)";
};

const renderNodeIcon = (type: GraphNodeType, radius: number, dimmed: boolean) => {
  if (type !== "canvas" && type !== "resource" && type !== "specialization") return null;

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

const GRAPH_PREFS_KEY = "graphView:filterPrefs:v1";

export default function GraphPage() {
  const { mindsetCards, settings, coreSkills, resources } = useAuth();
  const [query, setQuery] = useState("");
  const [showBotherings, setShowBotherings] = useState(true);
  const [showRoutines, setShowRoutines] = useState(true);
  const [showSpecializations, setShowSpecializations] = useState(false);
  const [showResources, setShowResources] = useState(true);
  const [showCanvases, setShowCanvases] = useState(true);
  const [showOrphans, setShowOrphans] = useState(true);
  const [animate, setAnimate] = useState(true);
  const [repel, setRepel] = useState(1800);
  const [linkDistance, setLinkDistance] = useState(110);
  const [center, setCenter] = useState(0.002);
  const [nodeSize, setNodeSize] = useState(5);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showArrows, setShowArrows] = useState(true);
  const [labelFadeZoom, setLabelFadeZoom] = useState(1.12);
  const [linkThickness, setLinkThickness] = useState(1.5);
  const [linkForce, setLinkForce] = useState(0.0045);
  const [panelOpen, setPanelOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 1200, height: 760 });
  const positionsRef = useRef<Map<string, Position>>(new Map());
  const dragStateRef = useRef<DragMode>({ mode: "none" });
  const lastStepTimeRef = useRef(0);
  const hasLoadedPrefsRef = useRef(false);
  const [, setFrame] = useState(0);

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
      if (typeof prefs.showResources === "boolean") setShowResources(prefs.showResources);
      if (typeof prefs.showCanvases === "boolean") setShowCanvases(prefs.showCanvases);
      if (typeof prefs.showOrphans === "boolean") setShowOrphans(prefs.showOrphans);
      if (typeof prefs.animate === "boolean") setAnimate(prefs.animate);
      if (typeof prefs.showLabels === "boolean") setShowLabels(prefs.showLabels);
      if (typeof prefs.showArrows === "boolean") setShowArrows(prefs.showArrows);
      if (typeof prefs.labelFadeZoom === "number") setLabelFadeZoom(prefs.labelFadeZoom);
      if (typeof prefs.nodeSize === "number") setNodeSize(prefs.nodeSize);
      if (typeof prefs.linkThickness === "number") setLinkThickness(prefs.linkThickness);
      if (typeof prefs.repel === "number") setRepel(prefs.repel);
      if (typeof prefs.linkForce === "number") setLinkForce(prefs.linkForce);
      if (typeof prefs.linkDistance === "number") setLinkDistance(prefs.linkDistance);
      if (typeof prefs.center === "number") setCenter(prefs.center);
      if (typeof prefs.panelOpen === "boolean") setPanelOpen(prefs.panelOpen);
    } catch {
      // Ignore malformed saved preferences.
    } finally {
      hasLoadedPrefsRef.current = true;
    }
  }, []);

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
          showResources,
          showCanvases,
          showOrphans,
          animate,
          showLabels,
          showArrows,
          labelFadeZoom,
          nodeSize,
          linkThickness,
          repel,
          linkForce,
          linkDistance,
          center,
          panelOpen,
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
    showResources,
    showCanvases,
    showOrphans,
    animate,
    showLabels,
    showArrows,
    labelFadeZoom,
    nodeSize,
    linkThickness,
    repel,
    linkForce,
    linkDistance,
    center,
    panelOpen,
  ]);

  const graph = useMemo(() => {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();

    const addNode = (node: GraphNode) => {
      if (!nodes.has(node.id)) nodes.set(node.id, node);
    };
    const addEdge = (edge: GraphEdge) => {
      if (!edges.has(edge.id) && edge.source !== edge.target) edges.set(edge.id, edge);
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
        addNode({ id: pid, label: point.text || `${group.label} point`, type: "bothering" });
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

    canvasNodes.forEach((canvas) => {
      const canvasName = normalizeText(canvas.label);
      specializationList.forEach((spec) => {
        const specName = normalizeText(spec.name || "");
        if (!specName) return;
        if (!canvasName.includes(specName) && !specName.includes(canvasName)) return;
        addEdge({
          id: `edge:spec:${spec.id}->${canvas.id}:name-fit`,
          source: `spec:${spec.id}`,
          target: canvas.id,
          type: "spec-canvas",
        });
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values()),
    };
  }, [mindsetCards, settings.routines, settings.routineSourceOverrides, coreSkills, resources]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    const nodeTypeAllowed = (type: GraphNodeType) => {
      if (type === "bothering" || type === "bothering-type") return showBotherings;
      if (type === "routine") return showRoutines;
      if (type === "specialization") return showSpecializations;
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
  }, [graph, query, showBotherings, showRoutines, showSpecializations, showResources, showCanvases, showOrphans]);

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

  const highlighted = useMemo(() => {
    if (!selectedNodeId) {
      return {
        edgeIds: new Set<string>(),
        nodeIds: new Set<string>(),
      };
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
  }, [filtered.edges, selectedNodeId]);

  const anchorForType = useCallback(
    (type: GraphNodeType) => {
      const w = size.width;
      const h = size.height;
      if (type === "bothering-type") return { x: w * 0.15, y: h * 0.18 };
      if (type === "bothering") return { x: w * 0.18, y: h * 0.48 };
      if (type === "routine") return { x: w * 0.35, y: h * 0.48 };
      if (type === "specialization") return { x: w * 0.55, y: h * 0.45 };
      if (type === "resource") return { x: w * 0.72, y: h * 0.45 };
      return { x: w * 0.82, y: h * 0.52 };
    },
    [size.width, size.height]
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
      const angle = (i / Math.max(1, filtered.nodes.length)) * Math.PI * 2;
      const radius = Math.min(size.width, size.height) * 0.3 + (i % 7) * 8;
      map.set(node.id, {
        x: size.width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
        y: size.height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
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
  }, [filtered.nodes, size.width, size.height]);

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
        const k = linkForce;
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
          const minDist = aR + bR + 10;
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
        p.vx += (anchor.x - p.x) * 0.0009;
        p.vy += (anchor.y - p.y) * 0.0009;
        p.vx += (cx - p.x) * center;
        p.vy += (cy - p.y) * center;
        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y += p.vy;
      });

      setFrame((v) => (v + 1) % 100000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, filtered.nodes, filtered.edges, filteredNodeById, repel, linkDistance, center, size.width, size.height, nodeSize, anchorForType, linkForce]);

  useEffect(() => {
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
            </div>
            <div className="absolute right-3 top-3 z-20">
              <Button
                size="sm"
                variant="secondary"
                className="border border-white/15 bg-black/70 text-zinc-100 hover:bg-black/80"
                onClick={() => setPanelOpen((open) => !open)}
              >
                {panelOpen ? "Hide Filters" : "Show Filters"}
              </Button>
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
                  </div>

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
                  <path d="M0,0 L8,4 L0,8 z" fill="rgba(250, 250, 250, 0.95)" />
                </marker>
              </defs>

              <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                {filtered.edges.map((edge) => {
                  const s = positionsRef.current.get(edge.source);
                  const t = positionsRef.current.get(edge.target);
                  if (!s || !t) return null;
                  const active = highlighted.edgeIds.has(edge.id);
                  return (
                    <line
                      key={edge.id}
                      x1={s.x}
                      y1={s.y}
                      x2={t.x}
                      y2={t.y}
                      stroke={active ? "rgba(250, 250, 250, 0.95)" : strokeForEdge(edge.type, false)}
                      strokeOpacity={selectedNodeId ? (active ? 1 : 0.18) : 1}
                      strokeWidth={active ? Math.max(2.2, linkThickness + 0.8) : edge.type === "canvas-link" ? linkThickness + 0.5 : linkThickness}
                      markerEnd={showArrows ? (active ? "url(#arrow-active)" : "url(#arrow-default)") : undefined}
                    />
                  );
                })}

                {filtered.nodes.map((node) => {
                  const p = positionsRef.current.get(node.id);
                  if (!p) return null;
                  const active = highlighted.nodeIds.has(node.id);
                  const deg = filteredDegreeById.get(node.id) || 0;
                  const showLabel = showLabels && (active || selectedNodeId === node.id || hoveredNodeId === node.id || zoom >= labelFadeZoom || deg >= 3);
                  const radius = nodeSize + (node.type === "bothering-type" ? 3 : 0);
                  const screenY = p.y * zoom + pan.y;
                  const labelAbove = screenY < size.height / 2;
                  const labelY = labelAbove ? -(radius + 7) : radius + 7;
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
                        fill={colorForNode(node.type, false)}
                        stroke={active ? "#fafafa" : "rgba(255,255,255,0.2)"}
                        strokeWidth={active ? 2 : 0.8}
                        opacity={selectedNodeId && !active ? 0.35 : 1}
                      />
                      {renderNodeIcon(node.type, radius, !!selectedNodeId && !active)}
                      {showLabel ? (
                        <text
                          x={0}
                          y={labelY}
                          fill="#e5e7eb"
                          fontSize={11}
                          textAnchor="middle"
                          dominantBaseline={labelAbove ? "auto" : "hanging"}
                          opacity={selectedNodeId && !active ? 0.4 : 1}
                          style={{ userSelect: "none", pointerEvents: "none" }}
                        >
                          {node.label.length > 42 ? `${node.label.slice(0, 42)}...` : node.label}
                        </text>
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
