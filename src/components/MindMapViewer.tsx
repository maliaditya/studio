
"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { CanvasNode, CanvasEdge, FormalizationItem, Side, Resource } from "@/types/workout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Maximize, Minus, Download, Upload, Database } from 'lucide-react';
import { cn } from "@/lib/utils";
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core';
import { Badge } from "./ui/badge";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "./ui/tooltip";


// Simple unique ID generator
const id = (prefix = "n") => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

function DraggableNode({ node, selected, onReleaseConnect, onStartConnect, addNodeForComponent, allComponentsMap, openGeneralPopup }: {
    node: any;
    selected: boolean;
    onReleaseConnect: (e: React.PointerEvent, nodeId: string, side: Side) => void;
    onStartConnect: (e: React.PointerEvent, fromId: string, fromSide: Side) => void;
    addNodeForComponent: (componentId: string, sourceNodeId: string) => void;
    allComponentsMap: Map<string, FormalizationItem>;
    openGeneralPopup: (componentId: string, event: React.MouseEvent) => void;
}) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: node.id,
    });

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
            data-node-id={node.id}
        >
            <div {...attributes} {...listeners}>
              <Card className={cn("shadow-lg border-2 relative group", selected ? "border-primary" : "border-border")}>
                <div className="relative z-10 bg-card rounded-lg">
                    <CardHeader className="p-2 flex flex-row items-center justify-between cursor-grab active:cursor-grabbing">
                        <CardTitle className="text-sm font-semibold truncate">{node.text}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                        {node.properties && Object.keys(node.properties).length > 0 && (
                            <ul className="text-xs space-y-2">
                            {Object.entries(node.properties).map(([key, value]) => {
                                const linkedComponent = allComponentsMap.get(value as string);
                                return (
                                    <li key={key} className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground font-medium text-xs truncate">{key}:</span>
                                        {linkedComponent ? (
                                            <div
                                                className="truncate"
                                                onPointerDown={(e) => {
                                                    e.stopPropagation();
                                                    if (typeof openGeneralPopup === 'function') {
                                                        openGeneralPopup(linkedComponent.id, e as any);
                                                    } else {
                                                        console.warn('openGeneralPopup not a function (or not provided).', { openGeneralPopup, linkedComponentId: linkedComponent.id });
                                                    }
                                                }}
                                                title={linkedComponent.text}
                                            >
                                                <Badge
                                                    variant="secondary"
                                                    className="cursor-pointer hover:ring-1 hover:ring-primary truncate"
                                                >
                                                    {linkedComponent.text}
                                                </Badge>
                                            </div>
                                        ) : (
                                            <span className="font-medium text-right truncate text-foreground" title={value as string}>{value as string}</span>
                                        )}
                                    </li>
                                );
                            })}
                            </ul>
                        )}
                    </CardContent>
                </div>
                {/* Connection points */}
                <div className="absolute inset-0 pointer-events-none group-hover:pointer-events-auto z-0">
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
    openGeneralPopup,
  } = useAuth();
  
  const allComponentsMap = useMemo(() => {
      const map = new Map<string, FormalizationItem>();
      if (!resources) return map;
      resources.forEach(r => {
          (r.formalization?.components || []).forEach(c => map.set(c.id, c));
      });
      return map;
  }, [resources]);

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
    let nodesToDisplay: FormalizationItem[] = [];

    if (rootId) {
        const hierarchyNodes = new Map<string, any>();
        const visited = new Set<string>();

        const buildHierarchy = (elementId: string, x: number, y: number) => {
            if (visited.has(elementId)) return;
            visited.add(elementId);

            const element = globalElements.find(e => e.id === elementId);
            if (!element) return;
            
            const layout = canvasLayout.nodes.find(n => n.id === element.id);
            hierarchyNodes.set(elementId, { ...element, x: layout?.x ?? x, y: layout?.y ?? y, w: 384, h: 'auto' });

            if (element.properties) {
                Object.values(element.properties).forEach((value, index) => {
                    const linkedComponent = Array.from(allComponentsMap.values()).find(c => c.id === value);
                    if (linkedComponent && linkedComponent.linkedElementIds) {
                        linkedComponent.linkedElementIds.forEach((childElementId, childIndex) => {
                            buildHierarchy(childElementId, x + 450, y + (index * 200) + (childIndex * 150));
                        });
                    }
                });
            }
        };
        buildHierarchy(rootId, 50, 400);
        nodesToDisplay = Array.from(hierarchyNodes.values());
    } else {
        nodesToDisplay = globalElements;
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
  }, [globalElements, canvasLayout.nodes, rootId, allComponentsMap]);
  
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
  
  const addNodeForComponent = useCallback((componentId: string, sourceNodeId: string) => {
    const component = allComponentsMap.get(componentId);
    if (!component || !component.linkedElementIds) return;

    setCanvasLayout(prevLayout => {
        const sourceNodeLayout = prevLayout.nodes.find(n => n.id === sourceNodeId);
        if (!sourceNodeLayout) return prevLayout;

        const currentNodesMap = new Map(prevLayout.nodes.map(n => [n.id, n]));
        const newNodesToAdd: CanvasNode[] = [];
        const newEdgesToAdd: CanvasEdge[] = [];

        component.linkedElementIds!.forEach((elementId, index) => {
            if (!currentNodesMap.has(elementId)) {
                const newNodeX = sourceNodeLayout.x + (sourceNodeLayout.width || 300) + 100;
                const newNodeY = sourceNodeLayout.y + (index * 180);
                newNodesToAdd.push({ id: elementId, x: newNodeX, y: newNodeY, width: 300, height: 150 });
            }
            newEdgesToAdd.push({
                id: id('e'),
                source: sourceNodeId,
                fromSide: 'right',
                target: elementId,
                toSide: 'left',
                label: 'contains'
            });
        });

        if (newNodesToAdd.length === 0 && newEdgesToAdd.length === 0) {
            return prevLayout;
        }

        return {
            nodes: [...prevLayout.nodes, ...newNodesToAdd],
            edges: [...prevLayout.edges, ...newEdgesToAdd],
        };
    });
}, [allComponentsMap, setCanvasLayout]);

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
        addGlobalElement("New Element", x, y);
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
    let height = 150; // Default height
    if (nodeElement?.firstElementChild) {
        const cs = getComputedStyle(nodeElement.firstElementChild);
        height = parseFloat(cs.height);
    }
  
    switch(side) {
        case 'top': return { x: node.x + node.w / 2, y: node.y };
        case 'bottom': return { x: node.x + node.w / 2, y: node.y + height };
        case 'left': return { x: node.x, y: node.y + height / 2 };
        case 'right': return { x: node.x + node.w, y: node.y + height / 2 };
        default: return { x: node.x + node.w / 2, y: node.y + height / 2 };
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
            <DraggableNode 
                key={node.id} 
                node={node} 
                selected={selected === node.id} 
                onReleaseConnect={onReleaseConnect} 
                onStartConnect={onStartConnect}
                addNodeForComponent={addNodeForComponent}
                allComponentsMap={allComponentsMap}
                openGeneralPopup={openGeneralPopup}
            />
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
        </>
      )}
    </div>
    </DndContext>
  );
}

    