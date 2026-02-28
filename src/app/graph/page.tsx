"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const colorForNode = (type: GraphNodeType) => {
  if (type === "bothering-type") return "#a855f7";
  if (type === "bothering") return "#f97316";
  if (type === "routine") return "#22c55e";
  if (type === "specialization") return "#38bdf8";
  if (type === "resource") return "#f59e0b";
  return "#e5e7eb";
};

const strokeForEdge = (type: GraphEdgeType) => {
  if (type === "canvas-link") return "rgba(148, 163, 184, 0.75)";
  if (type === "resource-canvas") return "rgba(245, 158, 11, 0.65)";
  if (type === "specialization-fit" || type === "spec-canvas") return "rgba(56, 189, 248, 0.65)";
  if (type === "routine-source") return "rgba(168, 85, 247, 0.65)";
  return "rgba(163, 163, 163, 0.45)";
};

const isCanvasLink = (value?: string) => typeof value === "string" && value.startsWith("canvas://");
const parseCanvasLink = (value?: string) => {
  if (!isCanvasLink(value)) return null;
  const token = String(value).replace("canvas://", "");
  const [resourceId, pointId] = token.split("/");
  if (!resourceId || !pointId) return null;
  return { resourceId, pointId };
};

export default function GraphPage() {
  const { mindsetCards, settings, coreSkills, resources } = useAuth();
  const [query, setQuery] = useState("");
  const [showBotherings, setShowBotherings] = useState(false);
  const [showRoutines, setShowRoutines] = useState(false);
  const [showSpecializations, setShowSpecializations] = useState(false);
  const [showResources, setShowResources] = useState(true);
  const [showCanvases, setShowCanvases] = useState(true);
  const [showOrphans, setShowOrphans] = useState(true);
  const [animate, setAnimate] = useState(true);
  const [repel, setRepel] = useState(2600);
  const [linkDistance, setLinkDistance] = useState(60);
  const [center, setCenter] = useState(0.001);
  const [nodeSize, setNodeSize] = useState(5);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 1200, height: 760 });
  const positionsRef = useRef<Map<string, Position>>(new Map());
  const dragStateRef = useRef<DragMode>({ mode: "none" });
  const lastStepTimeRef = useRef(0);
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

  useEffect(() => {
    const map = positionsRef.current;
    const padding = 120;
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
      pos.x = Math.min(size.width - padding, Math.max(padding, pos.x));
      pos.y = Math.min(size.height - padding, Math.max(padding, pos.y));
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
        const k = 0.0045;
        const fx = (dx / dist) * diff * k;
        const fy = (dy / dist) * diff * k;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      });

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
        p.vx += (cx - p.x) * center;
        p.vy += (cy - p.y) * center;
        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y += p.vy;
        p.x = Math.min(size.width - 24, Math.max(24, p.x));
        p.y = Math.min(size.height - 24, Math.max(24, p.y));
      });

      setFrame((v) => (v + 1) % 100000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, filtered.nodes, filtered.edges, repel, linkDistance, center, size.width, size.height]);

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
    <div className="h-[calc(100vh-4rem)] p-4 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
      <Card className="min-h-0 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle>Graph View</CardTitle>
          <div className="text-xs text-muted-foreground">
            Botherings, routines, specializations, resource cards, and canvas links in one graph.
          </div>
        </CardHeader>
        <CardContent className="h-[calc(100%-4.5rem)]">
          <div ref={containerRef} className="relative h-full w-full rounded-md border border-white/10 bg-black/30">
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md border border-white/10 bg-black/70 p-1">
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
            </div>

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
                      stroke={active ? "rgba(250, 250, 250, 0.95)" : strokeForEdge(edge.type)}
                      strokeOpacity={selectedNodeId ? (active ? 1 : 0.18) : 1}
                      strokeWidth={active ? 2.4 : edge.type === "canvas-link" ? 2 : 1.5}
                      markerEnd={active ? "url(#arrow-active)" : "url(#arrow-default)"}
                    />
                  );
                })}

                {filtered.nodes.map((node) => {
                  const p = positionsRef.current.get(node.id);
                  if (!p) return null;
                  const active = highlighted.nodeIds.has(node.id);
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
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <circle
                        r={nodeSize + (node.type === "bothering-type" ? 3 : 0)}
                        fill={colorForNode(node.type)}
                        stroke={active ? "#fafafa" : "rgba(255,255,255,0.2)"}
                        strokeWidth={active ? 2 : 0.8}
                        opacity={selectedNodeId && !active ? 0.35 : 1}
                      />
                      <text
                        x={nodeSize + 6}
                        y={4}
                        fill="#e5e7eb"
                        fontSize={11}
                        opacity={selectedNodeId && !active ? 0.4 : 1}
                        style={{ userSelect: "none", pointerEvents: "none" }}
                      >
                        {node.label.length > 38 ? `${node.label.slice(0, 38)}...` : node.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </CardContent>
      </Card>

      <Card className="min-h-0 overflow-auto">
        <CardHeader className="pb-2">
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search nodes..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="space-y-2">
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
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Node size</div>
              <input type="range" min={3} max={10} value={nodeSize} onChange={(e) => setNodeSize(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Repel force</div>
              <input type="range" min={400} max={2600} step={50} value={repel} onChange={(e) => setRepel(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Link distance</div>
              <input type="range" min={60} max={260} step={5} value={linkDistance} onChange={(e) => setLinkDistance(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Center force</div>
              <input type="range" min={0.001} max={0.03} step={0.001} value={center} onChange={(e) => setCenter(Number(e.target.value))} className="w-full" />
            </div>
          </div>

          <div className={cn("rounded-md border p-3 text-xs text-muted-foreground")}>
            <div>Nodes: {filtered.nodes.length}</div>
            <div>Links: {filtered.edges.length}</div>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              positionsRef.current.clear();
              setSelectedNodeId(null);
              setZoom(1);
              setPan({ x: 0, y: 0 });
              setFrame((v) => (v + 1) % 100000);
            }}
            className="w-full"
          >
            Reset Layout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
