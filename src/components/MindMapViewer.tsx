
"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { CanvasNode, CanvasEdge, FormalizationItem } from "@/types/workout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Maximize, Minus, Download, Upload } from 'lucide-react';
import { cn } from "@/lib/utils";
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core';

// Simple unique ID generator
const id = (prefix = "n") => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

function DraggableNode({ node, selected, onReleaseConnect, onStartConnect }: { node: any; selected: boolean; onReleaseConnect: (e: React.PointerEvent, nodeId: string) => void; onStartConnect: (e: React.PointerEvent, fromId: string) => void; }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: node.id,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, left: node.x, top: node.y, width: node.w, height: "auto" }}
            className="absolute cursor-default"
            onPointerUp={(e) => onReleaseConnect(e, node.id)}
        >
            <div {...attributes} {...listeners}>
              <Card className={cn("shadow-lg border-2", selected ? "border-primary" : "border-border")}>
                <CardHeader className="p-2 flex flex-row items-center justify-between cursor-grab active:cursor-grabbing">
                  <CardTitle className="text-sm font-semibold truncate">{node.text}</CardTitle>
                  <div className="flex items-center">
                     <div
                      className="w-3 h-3 rounded-full bg-background border cursor-pointer"
                      onPointerDown={(e) => onStartConnect(e, node.id)}
                      title="Drag to connect"
                     />
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {node.properties && Object.keys(node.properties).length > 0 && (
                    <ul className="text-xs space-y-1">
                      {Object.entries(node.properties).map(([key, value]) => (
                        <li key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="font-medium truncate">{value as string}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
        </div>
    );
}

export function MindMapViewer() {
  const { 
    resources, 
    canvasLayout, setCanvasLayout, 
    addGlobalElement, updateGlobalElement, deleteGlobalElement
  } = useAuth();
  
  const globalElements = useMemo(() => {
    return resources
      .flatMap(r => r.formalization?.elements || [])
      .filter(el => el.isGlobal);
  }, [resources]);
  
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ fromId: string; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  // Combine elements with their layout info
  const nodesWithLayout = useMemo(() => {
    return globalElements.map(element => {
      const layout = canvasLayout.nodes.find(n => n.id === element.id);
      return {
        ...element,
        x: layout?.x || Math.random() * 800,
        y: layout?.y || Math.random() * 600,
        w: layout?.width || 250,
        h: layout?.height || 150,
      };
    });
  }, [globalElements, canvasLayout.nodes]);
  
  const edges = useMemo(() => canvasLayout.edges || [], [canvasLayout.edges]);

  const updateNodePosition = useCallback((nodeId: string, newX: number, newY: number) => {
    setCanvasLayout(prev => {
        const existingNodeIndex = prev.nodes.findIndex(n => n.id === nodeId);
        if (existingNodeIndex > -1) {
            const newNodes = [...prev.nodes];
            newNodes[existingNodeIndex] = { ...newNodes[existingNodeIndex], x: newX, y: newY };
            return { ...prev, nodes: newNodes };
        } else {
            return { ...prev, nodes: [...prev.nodes, { id: nodeId, x: newX, y: newY }] };
        }
    });
  }, [setCanvasLayout]);

  const handleAddNode = () => {
    const rect = containerRef.current!.getBoundingClientRect();
    const center = screenToWorld(rect.width / 2, rect.height / 2);
    const newNode = addGlobalElement("New Element", center.x, center.y);
    if(newNode) {
      setSelected(newNode.id);
    }
  };

  const handleRemoveNode = (nodeId: string) => {
    deleteGlobalElement(nodeId);
    setCanvasLayout(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
    }));
    if (selected === nodeId) setSelected(null);
  };

  const addEdge = (from: string, to: string) => {
    if (from === to) return;
    const eid = id("e");
    setCanvasLayout(prev => ({
        ...prev,
        edges: [...prev.edges, { id: eid, source: from, target: to, label: 'relates' }],
    }));
  };

  // Panning and Zooming handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const { x, y, k } = transform;
      const newK = Math.max(0.1, Math.min(2, k * scaleFactor));
      const nx = cx - ((cx - x) / k) * newK;
      const ny = cy - ((cy - y) / k) * newK;
      setTransform({ x: nx, y: ny, k: newK });
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [transform]);
  
  const onPointerDownBackground = (e: React.PointerEvent) => {
    if (e.target !== containerRef.current && !(e.target as HTMLElement).classList.contains("canvas-bg")) return;
    setIsPanning(true);
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    containerRef.current?.setPointerCapture?.(e.pointerId);
  };
  const onPointerMoveBackground = (e: React.PointerEvent) => {
    if (!isPanning || !lastPointerRef.current) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUpBackground = (e: React.PointerEvent) => {
    setIsPanning(false);
    lastPointerRef.current = null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const nodeId = active.id as string;
    const node = nodesWithLayout.find(n => n.id === nodeId);
    if (node) {
        updateNodePosition(nodeId, node.x + delta.x / transform.k, node.y + delta.y / transform.k);
    }
  };

  // Connection handlers
  const onStartConnect = (e: React.PointerEvent, fromId: string) => {
    e.stopPropagation();
    setConnecting({ fromId, x: e.clientX, y: e.clientY });
  };
  const onMoveConnect = (e: React.PointerEvent) => {
    if (connecting) {
      setConnecting((c) => c && { ...c, x: e.clientX, y: e.clientY });
    }
  };
  const onReleaseConnect = (e: React.PointerEvent, targetId: string) => {
    if (connecting) {
      if (targetId && connecting.fromId !== targetId) addEdge(connecting.fromId, targetId);
      setConnecting(null);
    }
  };

  // Render helpers
  const screenToWorld = (x: number, y: number) => ({ x: (x - transform.x) / transform.k, y: (y - transform.y) / transform.k });

  const getEdgePoints = (fromNode: any, toNode: any) => {
    const fromCenter = { x: fromNode.x + fromNode.w / 2, y: fromNode.y + fromNode.h / 2 };
    const toCenter = { x: toNode.x + toNode.w / 2, y: toNode.y + toNode.h / 2 };
    return { fromCenter, toCenter };
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
    <div className="relative h-full w-full overflow-hidden bg-gray-100 dark:bg-gray-900">
      <div
        ref={containerRef}
        className="canvas-bg absolute inset-0 touch-none"
        onPointerDown={onPointerDownBackground}
        onPointerMove={(e) => { onPointerMoveBackground(e); onMoveConnect(e); }}
        onPointerUp={onPointerUpBackground}
        style={{ backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      >
        <div
          className="absolute left-0 top-0"
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`, transformOrigin: "0 0" }}
        >
          <svg width="4000" height="4000" className="pointer-events-none absolute left-0 top-0">
            {edges.map((edge) => {
              const fromNode = nodesWithLayout.find(n => n.id === edge.source);
              const toNode = nodesWithLayout.find(n => n.id === edge.target);
              if (!fromNode || !toNode) return null;

              const { fromCenter, toCenter } = getEdgePoints(fromNode, toNode);
              const dx = toCenter.x - fromCenter.x;
              const cx1 = fromCenter.x + dx * 0.3;
              const cx2 = toCenter.x - dx * 0.3;

              return (
                <g key={edge.id}>
                  <path d={`M ${fromCenter.x} ${fromCenter.y} C ${cx1} ${fromCenter.y} ${cx2} ${toCenter.y} ${toCenter.x} ${toCenter.y}`} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} fill="none" />
                </g>
              );
            })}
            {connecting && (() => {
              const fromNode = nodesWithLayout.find(n => n.id === connecting.fromId);
              if (!fromNode) return null;
              const { x: fromX, y: fromY } = getEdgePoints(fromNode, { x:0, y:0, w:0, h:0 }).fromCenter;
              const { x: toX, y: toY } = screenToWorld(connecting.x, connecting.y);
              const dx = toX - fromX;
              const cx1 = fromX + dx * 0.3;
              const cx2 = toX - dx * 0.3;
              return (
                  <path d={`M ${fromX} ${fromY} C ${cx1} ${fromY} ${cx2} ${toY} ${toX} ${toY}`} stroke="hsl(var(--primary))" strokeWidth={1.8} fill="none" />
              );
            })()}
          </svg>
          {nodesWithLayout.map((node) => (
             <DraggableNode 
                key={node.id} 
                node={node} 
                selected={selected === node.id} 
                onReleaseConnect={onReleaseConnect} 
                onStartConnect={onStartConnect}
             />
          ))}
        </div>
      </div>
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button size="icon" onClick={handleAddNode}><Plus /></Button>
        <Button size="icon" onClick={() => setTransform(t => ({ ...t, k: t.k * 1.1 }))}><Maximize className="h-4 w-4"/></Button>
        <Button size="icon" onClick={() => setTransform(t => ({ ...t, k: t.k * 0.9 }))}><Minus className="h-4 w-4"/></Button>
      </div>
    </div>
    </DndContext>
  );
}
