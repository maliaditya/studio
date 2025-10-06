
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
                            <li key={key} className="flex items-center justify-between gap-2">
                                <span className="text-muted-foreground font-medium text-xs truncate">{key}:</span>
                                {linkedComponent ? (
                                    <Badge
                                        variant="secondary"
                                        className="cursor-pointer hover:ring-1 hover:ring-primary truncate"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenPopup(e, linkedComponent.id);
                                        }}
                                        title={linkedComponent.text}
                                    >
                                        {linkedComponent.text}
                                    </Badge>
                                ) : (
                                    <span className="font-medium text-right truncate text-foreground" title={value as string}>{value as string}</span>
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
                                "absolute w-4 h-4 rounded-full bg-background border-2 border-primary/50 cursor-pointer hover:bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto",
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
    let nodesToDisplay = globalElements;
    if (rootId) {
        const hierarchyNodes = new Map<string, any>();
        const hierarchyEdges: CanvasEdge[] = [];
        const visited = new Set<string>();

        const buildHierarchy = (elementId: string, x: number, y: number, level: number) => {
            if (visited.has(elementId)) return;
            visited.add(elementId);

            const element = globalElements.find(e => e.id === elementId);
            if (!element) return;
            
            const layout = canvasLayout.nodes.find(n => n.id === element.id);

            hierarchyNodes.set(elementId, {
                ...element,
                x: layout?.x ?? x,
                y: layout?.y ?? y,
                w: layout?.width || 384,
                h: layout?.height || 'auto'
            });

            if (element.properties) {
                Object.values(element.properties).forEach((value, index) => {
                    const linkedComponent = allComponentsForSpec.find(c => c.id === value);
                    if (linkedComponent && linkedComponent.linkedElementIds) {
                        linkedComponent.linkedElementIds.forEach((childElementId, childIndex) => {
                            hierarchyEdges.push({
                                id: id('e'),
                                source: elementId,
                                fromSide: 'right',
                                target: childElementId,
                                toSide: 'left'
                            });
                            buildHierarchy(childElementId, x + 450, y + (index * 200) + (childIndex * 150), level + 1);
                        });
                    }
                });
            }
        };

        buildHierarchy(rootId, 50, 400, 0);
        
        // This is a side-effect in useMemo, which is not ideal, but for now it's here.
        // A better solution would use a useEffect that depends on the calculated hierarchy.
        if(hierarchyEdges.length > 0) {
            setCanvasLayout(prev => ({...prev, edges: [...prev.edges, ...hierarchyEdges]}));
        }

        nodesToDisplay = Array.from(hierarchyNodes.values());
    }

    if (!nodesToDisplay) return [];

    return nodesToDisplay.map(element => {
      const layout = canvasLayout.nodes.find(n => n.id === element.id);
      return {
        ...element,
        x: layout?.x || Math.random() * 800,
        y: layout?.y || Math.random() * 600,
        w: layout?.width || 300,
        h: layout?.height || 150,
      };
    });
  }, [globalElements, canvasLayout.nodes, rootId, allComponentsForSpec, setCanvasLayout]);
  
  const edges = useMemo(() => canvasLayout.edges || [], [canvasLayout.edges]);

  const updateNodePosition = useCallback((nodeId: string, newX: number, newY: number) => {
    setCanvasLayout(prev => {
        const existingNodeIndex = prev.nodes.findIndex(n => n.id === nodeId);
        if (existingNodeIndex > -1) {
            const newNodes = [...prev.nodes];
            newNodes[existingNodeIndex] = { ...newNodes[existingNodeIndex], x: newX, y: newY };
            return { ...prev, nodes: newNodes };
        } else {
            return { ...prev, nodes: [...prev.nodes, { id: nodeId, x: newX, y: newY, width: 300, height: 150 }] };
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

  const getNodeEdgePoint = (node: any, side: Side): { x: number; y: number } => {
    const nodeElement = document.querySelector(`[data-node-id='${node.id}']`);
    const nodeHeight = nodeElement?.firstElementChild?.clientHeight || (node.h || 150);
  
    switch(side) {
        case 'top': return { x: node.x + node.w / 2, y: node.y };
        case 'bottom': return { x: node.x + node.w / 2, y: node.y + nodeHeight };
        case 'left': return { x: node.x, y: node.y + nodeHeight / 2 };
        case 'right': return { x: node.x + node.w, y: node.y + nodeHeight / 2 };
        default: return { x: node.x + node.w / 2, y: node.y + nodeHeight / 2 };
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
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      setConnecting({ fromId, fromSide, x, y });
    }
  };
  const onMoveConnect = (e: React.PointerEvent) => {
    if (connecting) {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      setConnecting((c) => c && { ...c, x, y });
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
    if (!containerRef.current) return {x: 0, y: 0};
    const rect = containerRef.current.getBoundingClientRect();
    return {
        x: (x - rect.left - transform.x) / transform.k,
        y: (y - rect.top - transform.y) / transform.k,
    };
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
              const p1Node = nodesWithLayout.find(n => n.id === connecting.fromId);
              if (!p1Node) return null;
              const p1 = getNodeEdgePoint(p1Node, connecting.fromSide);
              const { x: toX, y: toY } = connecting;

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
             <div key={node.id} data-node-id={node.id}>
                <DraggableNode 
                    node={node} 
                    selected={selected === node.id} 
                    onReleaseConnect={onReleaseConnect} 
                    onStartConnect={onStartConnect}
                    onOpenPopup={openComponentPopup}
                    globalElements={globalElements}
                />
            </div>
          ))}
        </div>
      </div>
      {showControls && (
        <>
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <Button size="icon" onClick={() => {
                const {x, y} = screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
                addGlobalElement("New Element", x, y);
            }}><Plus /></Button>
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
