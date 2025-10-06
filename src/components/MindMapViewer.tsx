

"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { CanvasNode, CanvasEdge, FormalizationItem, Side, Resource } from "@/types/workout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Maximize, Minus, Download, Upload } from 'lucide-react';
import { cn } from "@/lib/utils";
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core';
import { Badge } from "./ui/badge";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";


// Simple unique ID generator
const id = (prefix = "n") => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

function DraggableNode({ node, selected, onReleaseConnect, onStartConnect, onOpenPopup, globalElements }: { 
    node: any; 
    selected: boolean; 
    onReleaseConnect: (e: React.PointerEvent, nodeId: string, side: Side) => void; 
    onStartConnect: (e: React.PointerEvent, fromId: string, fromSide: Side) => void;
    onOpenPopup: (e: React.MouseEvent, componentId: string) => void;
    globalElements: FormalizationItem[];
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: node.id,
    });
    const { allComponentsForSpec } = useAuth();

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;
    
    const sides: Side[] = ['top', 'right', 'bottom', 'left'];

    const getSideClass = (side: Side) => {
        switch (side) {
            case 'top': return 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2';
            case 'bottom': return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2';
            case 'left': return 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2';
            case 'right': return 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2';
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, left: node.x, top: node.y, width: node.w, height: "auto" }}
            className="absolute"
        >
            <div {...attributes} {...listeners}>
              <Card className={cn("shadow-lg border-2 relative group", selected ? "border-primary" : "border-border")}>
                <CardHeader className="p-2 flex flex-row items-center justify-between cursor-grab active:cursor-grabbing">
                  <CardTitle className="text-sm font-semibold truncate">{node.text}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {node.properties && Object.keys(node.properties).length > 0 && (
                    <ul className="text-xs space-y-2">
                      {Object.entries(node.properties).map(([key, value]) => {
                        const linkedComponent = allComponentsForSpec.find(c => c.id === value);
                        return (
                            <li key={key} className="flex flex-col gap-1 items-start">
                                <span className="text-muted-foreground font-medium text-xs">{key}:</span>
                                {linkedComponent ? (
                                    <Card
                                        className="w-full bg-muted/50 cursor-pointer hover:ring-1 hover:ring-primary"
                                        onClick={(e) => onOpenPopup(e, linkedComponent.id)}
                                    >
                                        <CardHeader className="p-2">
                                            <CardTitle className="text-xs font-semibold">{linkedComponent.text}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-2 pt-0">
                                            {(linkedComponent.linkedElementIds && linkedComponent.linkedElementIds.length > 0) && (
                                                <div className="mt-1">
                                                    <p className="font-semibold text-xs text-muted-foreground">Elements:</p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {(linkedComponent.linkedElementIds || []).map(elId => {
                                                            const el = globalElements.find(e => e.id === elId);
                                                            return el ? <Badge key={elId} variant="outline">{el.text}</Badge> : null;
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <span className="font-medium text-right truncate text-foreground self-end">{value as string}</span>
                                )}
                            </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
                {/* Connection points */}
                <div className="absolute inset-0 pointer-events-none group-hover:pointer-events-auto">
                    {sides.map(side => (
                        <div
                            key={side}
                            onPointerDown={(e) => onStartConnect(e, node.id, side)}
                            onPointerUp={(e) => onReleaseConnect(e, node.id, side)}
                            className={cn(
                                "absolute w-3 h-3 rounded-full bg-background border-2 border-primary/50 cursor-pointer hover:bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto",
                                getSideClass(side)
                            )}
                            title={`Connect from ${side}`}
                        />
                    ))}
                </div>
              </Card>
            </div>
        </div>
    );
}

export function MindMapViewer({ defaultView, rootId, showControls = true }: { defaultView?: string, rootId?: string | null, showControls?: boolean }) {
  const { 
    resources, 
    canvasLayout, setCanvasLayout, 
    addGlobalElement, updateGlobalElement, deleteGlobalElement,
    deepWorkDefinitions, upskillDefinitions, getDescendantLeafNodes,
    allComponentsForSpec,
    openComponentPopup,
    selectedFormalizationSpecId,
    handleAddNewResourceCard,
  } = useAuth();
  
  const globalElements = useMemo(() => {
    if (!resources) return [];
    return resources
      .flatMap(r => r.formalization?.elements || [])
      .filter(el => el.isGlobal);
  }, [resources]);
  
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ fromId: string; fromSide: Side; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const nodesWithLayout = useMemo(() => {
    if (rootId || !globalElements) {
        return [];
    }
    return globalElements.map(element => {
      const layout = canvasLayout.nodes.find(n => n.id === element.id);
      return {
        ...element,
        x: layout?.x || Math.random() * 800,
        y: layout?.y || Math.random() * 600,
        w: layout?.width || 384,
        h: layout?.height || 150,
      };
    });
  }, [globalElements, canvasLayout.nodes, rootId]);
  
  const edges = useMemo(() => canvasLayout.edges || [], [canvasLayout.edges]);

  const updateNodePosition = useCallback((nodeId: string, newX: number, newY: number) => {
    setCanvasLayout(prev => {
        const existingNodeIndex = prev.nodes.findIndex(n => n.id === nodeId);
        if (existingNodeIndex > -1) {
            const newNodes = [...prev.nodes];
            newNodes[existingNodeIndex] = { ...newNodes[existingNodeIndex], x: newX, y: newY };
            return { ...prev, nodes: newNodes };
        } else {
            return { ...prev, nodes: [...prev.nodes, { id: nodeId, x: newX, y: newY, width: 384, height: 150 }] };
        }
    });
  }, [setCanvasLayout]);

  const handleRemoveNode = (nodeId: string) => {
    deleteGlobalElement(nodeId);
    setCanvasLayout(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
    }));
    if (selected === nodeId) setSelected(null);
  };

  const addEdge = (from: string, fromSide: Side, to: string, toSide: Side) => {
    if (from === to) return;
    const eid = id("e");
    setCanvasLayout(prev => ({
        ...prev,
        edges: [...prev.edges, { id: eid, source: from, fromSide, target: to, toSide, label: 'relates' }],
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
    if (e.button === 2) {
        e.preventDefault();
        const { x, y } = screenToWorld(e.clientX, e.clientY);
        handleAddNewResourceCard(null, {x, y});
        return;
    }
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
  const onStartConnect = (e: React.PointerEvent, fromId: string, fromSide: Side) => {
    e.stopPropagation();

    const existingEdge = edges.find(edge => edge.source === fromId && edge.fromSide === fromSide);

    if (existingEdge) {
      setCanvasLayout(prev => ({
        ...prev,
        edges: prev.edges.filter(e => e.id !== existingEdge.id),
      }));
      setConnecting(null);
    } else {
      setConnecting({ fromId, fromSide, x: e.clientX, y: e.clientY });
    }
  };
  const onMoveConnect = (e: React.PointerEvent) => {
    if (connecting) {
      setConnecting((c) => c && { ...c, x: e.clientX, y: e.clientY });
    }
  };
  const onReleaseConnect = (e: React.PointerEvent, targetId: string, toSide: Side) => {
    if (connecting) {
      if (targetId && connecting.fromId !== targetId) addEdge(connecting.fromId, connecting.fromSide, targetId, toSide);
      setConnecting(null);
    }
  };

  // Render helpers
  const screenToWorld = (x: number, y: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
        x: (x - rect.left - transform.x) / transform.k,
        y: (y - rect.top - transform.y) / transform.k,
    };
  };
  
  const getNodeEdgePoint = (node: any, side: Side): { x: number; y: number } => {
    const nodeHeight = node.h || 150;
    const handleSize = 6; // Half the size of the handle (12px / 2)
  
    switch(side) {
        case 'top': return { x: node.x + node.w / 2, y: node.y - handleSize };
        case 'bottom': return { x: node.x + node.w / 2, y: node.y + nodeHeight + handleSize };
        case 'left': return { x: node.x - handleSize, y: node.y + nodeHeight / 2 };
        case 'right': return { x: node.x + node.w + handleSize, y: node.y + nodeHeight / 2 };
        default: return { x: node.x + node.w / 2, y: node.y + nodeHeight / 2 };
    }
  };


  return (
    <DndContext onDragEnd={handleDragEnd}>
    <div className="relative h-full w-full overflow-hidden bg-gray-900">
      <div
        ref={containerRef}
        className="canvas-bg absolute inset-0 touch-none"
        onPointerDown={onPointerDownBackground}
        onPointerMove={(e) => { onPointerMoveBackground(e); onMoveConnect(e); }}
        onPointerUp={onPointerUpBackground}
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
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

              const p1 = getNodeEdgePoint(fromNode, edge.fromSide);
              const p2 = getNodeEdgePoint(toNode, edge.toSide);
              
              const CUBIC_OFFSET = 80;
              let cp1 = { ...p1 }, cp2 = { ...p2 };

              if (edge.fromSide === 'left') cp1.x -= CUBIC_OFFSET;
              if (edge.fromSide === 'right') cp1.x += CUBIC_OFFSET;
              if (edge.fromSide === 'top') cp1.y -= CUBIC_OFFSET;
              if (edge.fromSide === 'bottom') cp1.y += CUBIC_OFFSET;

              if (edge.toSide === 'left') cp2.x -= CUBIC_OFFSET;
              if (edge.toSide === 'right') cp2.x += CUBIC_OFFSET;
              if (edge.toSide === 'top') cp2.y -= CUBIC_OFFSET;
              if (edge.toSide === 'bottom') cp2.y += CUBIC_OFFSET;

              return (
                <g key={edge.id}>
                  <path d={`M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${p2.x} ${p2.y}`} stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} fill="none" />
                </g>
              );
            })}
            {connecting && (() => {
              const fromNode = nodesWithLayout.find(n => n.id === connecting.fromId);
              if (!fromNode) return null;
              const p1 = getNodeEdgePoint(fromNode, connecting.fromSide);
              const { x: toX, y: toY } = screenToWorld(connecting.x, connecting.y);

              const CUBIC_OFFSET = 80;
              let cp1 = { ...p1 };
              if (connecting.fromSide === 'left') cp1.x -= CUBIC_OFFSET;
              if (connecting.fromSide === 'right') cp1.x += CUBIC_OFFSET;
              if (connecting.fromSide === 'top') cp1.y -= CUBIC_OFFSET;
              if (connecting.fromSide === 'bottom') cp1.y += CUBIC_OFFSET;

              return (
                  <path d={`M ${p1.x} ${p1.y} C ${cp1.x} ${cp1.y} ${toX} ${toY} ${toX} ${toY}`} stroke="hsl(var(--primary))" strokeWidth={1.8} fill="none" />
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
                onOpenPopup={(e, componentId) => openComponentPopup(componentId, e)}
                globalElements={globalElements}
             />
          ))}
        </div>
      </div>
      {showControls && (
        <>
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <Button size="icon" onClick={() => addGlobalElement("New Element", 0, 0)}><Plus /></Button>
            <Button size="icon" onClick={() => setTransform(t => ({ ...t, k: t.k * 1.1 }))}><Maximize className="h-4 w-4"/></Button>
            <Button size="icon" onClick={() => setTransform(t => ({ ...t, k: t.k * 0.9 }))}><Minus className="h-4 w-4"/></Button>
          </div>
          <div className="absolute top-4 right-4 z-10">
            <Button onClick={() => {
                const {x, y} = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
                handleAddNewResourceCard(null, { x, y });
            }}>New Card</Button>
          </div>
        </>
      )}
    </div>
    </DndContext>
  );
}
