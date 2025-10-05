
"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { CanvasNode, CanvasEdge } from "@/types/workout";

// Obsidian-like Canvas Component for Next.js (single-file)
// - Tailwind CSS classes used for styling (no imports required)
// - Features: Pan & zoom, drag nodes, create/delete nodes, connect nodes with edges,
//   inline edit node title/content, localStorage persistence (export/import), minimap
// - Drop this component into a Next.js page (e.g., pages/canvas.jsx) or as a component

// Simple unique id generator
const id = (prefix = "n") => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

function useLocalStorage(key: string, initial: any) {
  const [state, setState] = useState(() => {
    try {
      const raw = typeof window !== "undefined" && window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch (e) {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {}
  }, [key, state]);
  return [state, setState];
}

export function MindMapViewer() {
  // Canvas transform state
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [nodes, setNodes] = useLocalStorage("obs_canvas_nodes", {
    list: {
      // example starter node
      [id()]: { id: id(), x: 100, y: 80, w: 240, h: 120, title: "Welcome", content: "Double-click to edit", color: "bg-indigo-50" },
    },
    edges: {},
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{fromId: string, x: number, y: number} | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef<{x: number, y: number} | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // Helpers to update nodes & edges immutably
  const updateNode = useCallback((nodeId: string, patch: any) => {
    setNodes((prev: any) => ({ ...prev, list: { ...prev.list, [nodeId]: { ...prev.list[nodeId], ...patch } } }));
  }, [setNodes]);

  const addNode = (x: number, y: number) => {
    const nid = id();
    setNodes((prev: any) => ({
      ...prev,
      list: {
        ...prev.list,
        [nid]: { id: nid, x, y, w: 240, h: 120, title: "New Node", content: "", color: "bg-white" },
      },
    }));
    setSelected(nid);
  };

  const removeNode = (nodeId: string) => {
    setNodes((prev: any) => {
      const newList = { ...prev.list };
      delete newList[nodeId];
      const newEdges = { ...prev.edges };
      Object.keys(newEdges).forEach((eId) => {
        if (newEdges[eId].from === nodeId || newEdges[eId].to === nodeId) delete newEdges[eId];
      });
      return { list: newList, edges: newEdges };
    });
    if (selected === nodeId) setSelected(null);
  };

  const addEdge = (from: string, to: string) => {
    if (from === to) return;
    const eid = id("e");
    setNodes((prev: any) => ({ ...prev, edges: { ...prev.edges, [eid]: { id: eid, from, to } } }));
  };

  // background pointer handlers (pan & zoom)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      // zoom on wheel - ctrl/alt for zoom-only, otherwise normal scroll
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY;
        const scaleFactor = delta > 0 ? 1.08 : 0.92;
        const rect = container.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const { x, y, k } = transform;
        const newK = Math.max(0.2, Math.min(3, k * scaleFactor));
        // zoom around cursor
        const nx = cx - ((cx - x) / k) * newK;
        const ny = cy - ((cy - y) / k) * newK;
        setTransform({ x: nx, y: ny, k: newK });
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [transform]);

  // pointerdown for panning background
  const onPointerDownBackground = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // left only
    // only start pan if background clicked (not node)
    if (e.target !== containerRef.current && !(e.target as HTMLElement).classList.contains("canvas-bg")) return;
    setIsPanning(true);
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    containerRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onPointerMoveBackground = (e: React.PointerEvent) => {
    if (!isPanning) return;
    const last = lastPointerRef.current;
    if (!last) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUpBackground = (e: React.PointerEvent) => {
    setIsPanning(false);
    lastPointerRef.current = null;
  };

  // Node drag
  const startNodeDrag = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    const p = { x: e.clientX, y: e.clientY };
    lastPointerRef.current = p;
    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const lp = lastPointerRef.current;
      if (!lp) return;
      const dx = (ev.clientX - lp.x) / transform.k;
      const dy = (ev.clientY - lp.y) / transform.k;
      lastPointerRef.current = { x: ev.clientX, y: ev.clientY };
      updateNode(nodeId, {}); // placeholder to keep reference
      setNodes((prev: any) => {
        const n = { ...prev.list[nodeId] };
        n.x += dx;
        n.y += dy;
        return { ...prev, list: { ...prev.list, [nodeId]: n } };
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      lastPointerRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    setSelected(nodeId);
  };

  // Connect by dragging from handle
  const onStartConnect = (e: React.PointerEvent, fromId: string) => {
    e.stopPropagation();
    setConnecting({ fromId, x: e.clientX, y: e.clientY });
  };
  const onMoveConnect = (e: React.PointerEvent) => {
    if (!connecting) return;
    setConnecting((c) => c && { ...c, x: e.clientX, y: e.clientY });
  };
  const onReleaseConnect = (e: React.PointerEvent, targetId: string) => {
    if (!connecting) return;
    if (targetId && connecting.fromId !== targetId) addEdge(connecting.fromId, targetId);
    setConnecting(null);
  };

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" && selected) {
        removeNode(selected);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && selected) {
        // duplicate
        const orig = nodes.list[selected];
        if (!orig) return;
        const nid = id();
        setNodes((prev: any) => ({
          ...prev,
          list: { ...prev.list, [nid]: { ...orig, id: nid, x: orig.x + 30, y: orig.y + 30 } },
        }));
        setSelected(nid);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, nodes, setNodes]);

  // Export / Import
  const exportJSON = () => {
    const data = JSON.stringify(nodes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "canvas.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target!.result as string);
        setNodes(parsed);
      } catch (e) {
        alert("Invalid JSON");
      }
    };
    reader.readAsText(file);
  };

  // Render helpers
  const worldToScreen = (x: number, y: number) => ({ x: x * transform.k + transform.x, y: y * transform.k + transform.y });
  const screenToWorld = (x: number, y: number) => ({ x: (x - transform.x) / transform.k, y: (y - transform.y) / transform.k });

  return (
    <div className="flex h-full w-full bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 p-3 border-r bg-white flex-shrink-0">
        <h2 className="text-lg font-semibold mb-2">Canvas Controls</h2>
        <div className="space-y-2">
          <button
            className="w-full p-2 rounded shadow-sm border hover:bg-gray-50"
            onClick={() => {
              // add node near center
              const rect = containerRef.current!.getBoundingClientRect();
              const center = screenToWorld(rect.width / 2, rect.height / 2);
              addNode(center.x - 120, center.y - 60);
            }}
          >
            + Add node
          </button>
          <label className="block">
            <span className="text-sm text-gray-600">Import JSON</span>
            <input
              type="file"
              accept="application/json"
              className="mt-1 block w-full text-sm"
              onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])}
            />
          </label>
          <button className="w-full p-2 rounded shadow-sm border" onClick={exportJSON}>
            Export JSON
          </button>
          <div className="pt-2">
            <div className="text-xs text-gray-500">Shortcuts:</div>
            <div className="text-sm mt-1">Delete — remove node</div>
            <div className="text-sm">Ctrl/Cmd + D — duplicate</div>
            <div className="text-sm">Ctrl/Cmd + MouseWheel — zoom</div>
          </div>
          <div className="mt-4">
            <div className="text-sm font-medium">Selected</div>
            {selected ? (
              <div className="mt-2 p-2 rounded border bg-white">
                <div className="text-sm font-semibold">{nodes.list[selected]?.title}</div>
                <div className="text-xs text-gray-500">ID: {selected}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    className="px-2 py-1 text-sm border rounded"
                    onClick={() => {
                      const n = nodes.list[selected];
                      setNodes((prev: any) => ({ ...prev, list: { ...prev.list, [selected]: { ...n, x: n.x + 20, y: n.y + 20 } } }));
                    }}
                  >
                    Nudge
                  </button>
                  <button className="px-2 py-1 text-sm border rounded" onClick={() => removeNode(selected)}>
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-500">No node selected</div>
            )}
          </div>
        </div>
      </aside>

      {/* Main canvas area */}
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="canvas-bg absolute inset-0 touch-none"
          onPointerDown={onPointerDownBackground}
          onPointerMove={(e) => {
            onPointerMoveBackground(e);
            onMoveConnect(e);
          }}
          onPointerUp={onPointerUpBackground}
          style={{ backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px, 40px 40px' }}
        >
          {/* viewport that will be transformed for pan/zoom */}
          <div
            ref={viewportRef}
            className="absolute left-0 top-0"
            style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`, transformOrigin: "0 0", width: "100%", height: "100%" }}
          >
            {/* SVG edges layer */}
            <svg width="2000" height="2000" className="pointer-events-none absolute left-0 top-0">
              {/* existing edges */}
              {Object.values(nodes.edges || {}).map((edge: any) => {
                const a = nodes.list[edge.from];
                const b = nodes.list[edge.to];
                if (!a || !b) return null;
                const ax = a.x + a.w / 2;
                const ay = a.y + a.h / 2;
                const bx = b.x + b.w / 2;
                const by = b.y + b.h / 2;
                const dx = Math.abs(bx - ax);
                const mx = (ax + bx) / 2;
                const my = (ay + by) / 2;
                // simple bezier control
                const cx1 = ax + Math.sign(bx - ax) * Math.max(60, dx * 0.3);
                const cy1 = ay;
                const cx2 = bx - Math.sign(bx - ax) * Math.max(60, dx * 0.3);
                const cy2 = by;
                return (
                  <g key={edge.id}>
                    <path d={`M ${ax} ${ay} C ${cx1} ${cy1} ${cx2} ${cy2} ${bx} ${by}`} stroke="#111827" strokeWidth={1.5} fill="none" opacity={0.8} />
                    <circle cx={bx} cy={by} r={6} fill="#111827" stroke="#fff" strokeWidth={1} />
                  </g>
                );
              })}

              {/* dragging connection line */}
              {connecting && (() => {
                const from = nodes.list[connecting.fromId];
                if (!from) return null;
                const fx = from.x + from.w / 2;
                const fy = from.y + from.h / 2;
                // convert pointer to world
                const rect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
                const world = screenToWorld(connecting.x - rect.left, connecting.y - rect.top);
                const tx = world.x;
                const ty = world.y;
                const dx = Math.abs(tx - fx);
                const cx1 = fx + Math.sign(tx - fx) * Math.max(60, dx * 0.3);
                const cx2 = tx - Math.sign(tx - fx) * Math.max(60, dx * 0.3);
                return (
                  <path key="connTemp" d={`M ${fx} ${fy} C ${cx1} ${fy} ${cx2} ${ty} ${tx} ${ty}`} stroke="#ef4444" strokeWidth={1.8} fill="none" opacity={0.9} />
                );
              })()}
            </svg>

            {/* nodes */}
            {Object.values(nodes.list).map((n: any) => (
              <div
                key={n.id}
                className={`absolute shadow rounded border ${n.color} cursor-default select-none`}
                style={{ left: n.x, top: n.y, width: n.w, height: n.h, transformOrigin: "0 0" }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setSelected(n.id);
                }}
                onPointerDown={(e) => startNodeDrag(e, n.id)}
                onPointerUp={(e) => onReleaseConnect(e, n.id)}
              >
                <div className={`flex items-center justify-between px-3 py-2 border-b ${selected === n.id ? "ring-2 ring-indigo-300" : ""}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    <div className="font-semibold text-sm">{n.title}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full bg-white border cursor-pointer flex items-center justify-center"
                      onPointerDown={(e) => onStartConnect(e, n.id)}
                      title="Drag to connect"
                    >
                      ↔
                    </div>
                    <div className="text-xs text-gray-500">{n.id ? n.id.slice(-4) : ''}</div>
                  </div>
                </div>
                <div className="p-3 h-full overflow-auto">
                  <textarea
                    value={n.content}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes((prev: any) => ({ ...prev, list: { ...prev.list, [n.id]: { ...n, content: val } } }));
                    }}
                    className="w-full h-full resize-none bg-transparent outline-none text-sm"
                    placeholder="Write notes..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* minimap (simple) */}
        <div className="absolute right-4 bottom-4 w-48 h-36 bg-white/90 rounded shadow p-2 border">
          <div className="text-xs font-medium text-gray-600">Mini-map</div>
          <div className="relative mt-2 bg-gray-100 h-full overflow-hidden">
            <div className="absolute inset-1 border rounded" />
            {Object.values(nodes.list).map((n: any) => {
              const miniX = (n.x / 2000) * 100;
              const miniY = (n.y / 2000) * 100;
              const miniW = (n.w / 2000) * 100;
              const miniH = (n.h / 2000) * 100;
              return <div key={n.id} className="absolute bg-indigo-300/60" style={{ left: `${miniX}%`, top: `${miniY}%`, width: `${miniW}%`, height: `${miniH}%`, borderRadius: 4 }} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

    