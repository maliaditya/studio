
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { DndContext, useDraggable, type DragEndEvent, PointerSensor, useSensor, useSensors, DragStartEvent } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Link, X, Lightbulb, Focus, Frame, Flashlight, Briefcase, GitMerge, GitBranch, RefreshCw, ZoomIn, ZoomOut, Expand } from 'lucide-react';
import type { ExerciseDefinition, CanvasNode, ActivityType, CanvasEdge } from '@/types/workout';
import { format } from 'date-fns';
import { TransformWrapper, TransformComponent, useControls, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

const Controls = () => {
    const { zoomIn, zoomOut, resetTransform } = useControls();
    return (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
            <Button size="icon" onClick={() => zoomIn()}><ZoomIn/></Button>
            <Button size="icon" onClick={() => zoomOut()}><ZoomOut/></Button>
            <Button size="icon" onClick={() => resetTransform()}><RefreshCw/></Button>
        </div>
    );
};

// Draggable Node Component
function DraggableNode({ node, definition, status, onConnectClick, onRemoveClick, onExpandChildren, onRevealParents, onClickForConnection, isConnecting, isHovered, canExpandChildren, canRevealParents, onExpandAll, isRootNode }: {
  node: CanvasNode;
  definition: ExerciseDefinition;
  status: any;
  onConnectClick: (e: React.MouseEvent, nodeId: string) => void;
  onRemoveClick: (nodeId: string) => void;
  onExpandChildren: (nodeId: string) => void;
  onRevealParents: (nodeId: string) => void;
  onClickForConnection: (nodeId: string) => void;
  isConnecting: boolean;
  isHovered: boolean;
  canExpandChildren: boolean;
  canRevealParents: boolean;
  onExpandAll: (nodeId: string) => void;
  isRootNode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: node.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const getIcon = () => {
    if (definition.category === 'Learning Task') {
      const isParent = (definition.linkedUpskillIds?.length ?? 0) > 0 || (definition.linkedResourceIds?.length ?? 0) > 0;
      if(isParent) return <Flashlight className="h-4 w-4 text-amber-500" />;
      return <Frame className="h-4 w-4 text-blue-500" />;
    }
    const isParent = (definition.linkedDeepWorkIds?.length ?? 0) > 0;
    if (isParent) return <Lightbulb className="h-4 w-4 text-amber-500" />;
    return <Briefcase className="h-4 w-4 text-blue-500" />;
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={{ ...style, position: 'absolute', left: node.x, top: node.y, willChange: 'transform' }}
      className="w-48 z-10"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card
        className={cn(
          "shadow-lg hover:shadow-xl transition-shadow border-2",
          isConnecting && "cursor-pointer hover:border-primary",
          isHovered && "border-primary",
          status.isLoggedToday && "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700",
          status.isScheduledToday && !status.isLoggedToday && "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700",
          status.isPending && "bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700"
        )}
        onClick={() => isConnecting && onClickForConnection(node.id)}
      >
        <div className="p-2 cursor-grab" {...listeners} {...attributes}>
          <div className="flex items-center gap-2">
            {getIcon()}
            <p className="font-semibold text-xs text-foreground truncate" title={definition.name}>
              {definition.name}
            </p>
          </div>
        </div>
        <CardContent className="p-2 border-t flex justify-end gap-1">
          {isRootNode && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onExpandAll(node.id)}>
                <Expand className="h-4 w-4 text-purple-500" />
            </Button>
          )}
          {canExpandChildren && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onExpandChildren(node.id)}>
                <GitBranch className="h-4 w-4 text-green-500" />
            </Button>
          )}
          {canRevealParents && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRevealParents(node.id)}>
                <GitMerge className="h-4 w-4 text-amber-500" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => onConnectClick(e, node.id)}>
            <Link className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveClick(node.id)}>
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Main Canvas Page Component
function CanvasPageContent() {
  const {
    deepWorkDefinitions,
    upskillDefinitions,
    resources,
    canvasLayout,
    setCanvasLayout,
    schedule,
    allUpskillLogs,
    allDeepWorkLogs,
    brandingLogs
  } = useAuth();
  
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null);
  const [isAutoExpanding, setIsAutoExpanding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleAddNode = (definition: ExerciseDefinition) => {
    if (canvasLayout.nodes.find(n => n.id === definition.id)) {
        return; // Already on canvas
    }
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const newNode: CanvasNode = {
      id: definition.id,
      x: canvasRect ? (canvasRect.width / 2) - 96 : 200,
      y: canvasRect ? (canvasRect.height / 2) - 50 : 200,
    };
    setCanvasLayout(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, delta } = event;
    const scale = transformWrapperRef.current?.instance.transformState.scale || 1;
    setCanvasLayout(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === active.id ? { ...node, x: node.x + delta.x / scale, y: node.y + delta.y / scale } : node
      )
    }));
  };
  
  const handleConnectClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectingFrom) {
      if (connectingFrom === nodeId) {
        setConnectingFrom(null);
        return;
      }
      const edgeId = `${connectingFrom}-${nodeId}`;
      const reverseEdgeId = `${nodeId}-${connectingFrom}`;
      if (!canvasLayout.edges.some(e => e.id === edgeId || e.id === reverseEdgeId)) {
        setCanvasLayout(prev => ({ ...prev, edges: [...prev.edges, { id: edgeId, source: connectingFrom, target: nodeId }] }));
      }
      setConnectingFrom(null);
    } else {
      setConnectingFrom(nodeId);
    }
  };

  const handleNodeClickForConnection = (nodeId: string) => {
    if (connectingFrom && connectingFrom !== nodeId) {
        const edgeId = `${connectingFrom}-${nodeId}`;
        const reverseEdgeId = `${nodeId}-${connectingFrom}`;
        if (!canvasLayout.edges.some(e => e.id === edgeId || e.id === reverseEdgeId)) {
            setCanvasLayout(prev => ({ ...prev, edges: [...prev.edges, { id: edgeId, source: connectingFrom, target: nodeId }] }));
        }
        setConnectingFrom(null);
    }
  };

  const handleRemoveNode = (nodeId: string) => {
    setCanvasLayout(prev => ({
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    }));
  };
  
  const handleRemoveEdge = (edgeId: string) => {
    setCanvasLayout(prev => ({ ...prev, edges: prev.edges.filter(e => e.id !== edgeId)}));
  };

  const allDefinitions = useMemo(() => new Map(
      [...deepWorkDefinitions, ...upskillDefinitions, ...resources].map(def => [def.id, def])
  ), [deepWorkDefinitions, upskillDefinitions, resources]);

  const parentMap = useMemo(() => {
    const map = new Map<string, string[]>();
    allDefinitions.forEach(def => {
        const childIds = [...(def.linkedDeepWorkIds || []), ...(def.linkedUpskillIds || []), ...(def.linkedResourceIds || [])];
        childIds.forEach(childId => {
            if (!map.has(childId)) map.set(childId, []);
            map.get(childId)!.push(def.id);
        });
    });
    return map;
  }, [allDefinitions]);

  const nodePositions = useMemo(() => new Map(
      canvasLayout.nodes.map(node => [node.id, { x: node.x, y: node.y }])
  ), [canvasLayout.nodes]);
  
  const handleExpandChildren = useCallback((nodeId: string) => {
    const currentNodeDef = allDefinitions.get(nodeId);
    const currentNode = canvasLayout.nodes.find(n => n.id === nodeId);
    if (!currentNodeDef || !currentNode) return;
    
    const childIds = [
        ...(currentNodeDef.linkedDeepWorkIds || []),
        ...(currentNodeDef.linkedUpskillIds || []),
        ...(currentNodeDef.linkedResourceIds || []),
    ];
    
    if (childIds.length > 0) {
        const newNodes: CanvasNode[] = [];
        const newEdges: CanvasEdge[] = [];
        const existingNodeIds = new Set(canvasLayout.nodes.map(n => n.id));
        const validChildIds = childIds.filter(id => allDefinitions.has(id));

        validChildIds.forEach((childId, index) => {
            if (!existingNodeIds.has(childId)) {
                newNodes.push({
                    id: childId,
                    x: currentNode.x + 240, 
                    y: currentNode.y + (index * 90) - ((validChildIds.length - 1) * 45),
                });
                existingNodeIds.add(childId);
            }
            const edgeId = `${nodeId}-${childId}`;
            if (!canvasLayout.edges.some(e => e.id === edgeId || e.id === `${childId}-${nodeId}`)) {
                newEdges.push({ id: edgeId, source: nodeId, target: childId });
            }
        });

        if (newNodes.length > 0 || newEdges.length > 0) {
            setCanvasLayout(prev => ({
                nodes: [...prev.nodes, ...newNodes],
                edges: [...prev.edges, ...newEdges],
            }));
        }
    }
  }, [allDefinitions, canvasLayout, setCanvasLayout]);
  
  const handleRevealParents = useCallback((nodeId: string) => {
    const currentNode = canvasLayout.nodes.find(n => n.id === nodeId);
    if (!currentNode) return;
    
    const potentialParents = parentMap.get(nodeId) || [];
    const parentsToLoad = potentialParents.filter(parentId => allDefinitions.has(parentId) && !nodePositions.has(parentId));

    if (parentsToLoad.length > 0) {
        const newNodes: CanvasNode[] = [];
        const newEdges: CanvasEdge[] = [];

        parentsToLoad.forEach((parentId, index) => {
            newNodes.push({
                id: parentId,
                x: currentNode.x - 240, // Place to the left
                y: currentNode.y + (index * 90) - ((parentsToLoad.length - 1) * 45),
            });
            const edgeId = `${parentId}-${nodeId}`;
             if (!canvasLayout.edges.some(e => e.id === edgeId || e.id === `${nodeId}-${parentId}`)) {
                newEdges.push({ id: edgeId, source: parentId, target: nodeId });
            }
        });

        if (newNodes.length > 0 || newEdges.length > 0) {
            setCanvasLayout(prev => ({
                nodes: [...prev.nodes, ...newNodes],
                edges: [...prev.edges, ...newEdges],
            }));
        }
    }
  }, [allDefinitions, canvasLayout, nodePositions, parentMap, setCanvasLayout]);
  
  const handleExpandAll = useCallback((nodeId: string) => {
    setIsAutoExpanding(true);
  }, []);

  useEffect(() => {
    if (!isAutoExpanding) return;

    let madeChanges = false;
    const allNewNodes: CanvasNode[] = [];
    const allNewEdges: CanvasEdge[] = [];
    const nodesOnCanvas = new Set(canvasLayout.nodes.map(n => n.id));

    // Create a stable copy of nodes to iterate over
    const nodesToScan = [...canvasLayout.nodes];

    nodesToScan.forEach(node => {
        const definition = allDefinitions.get(node.id);
        if (!definition) return;

        // Expand children
        const childIds = [...(definition.linkedDeepWorkIds || []), ...(definition.linkedUpskillIds || []), ...(definition.linkedResourceIds || [])];
        const childrenToLoad = childIds.filter(childId => allDefinitions.has(childId) && !nodesOnCanvas.has(childId) && !allNewNodes.some(n => n.id === childId));
        
        if (childrenToLoad.length > 0) {
            madeChanges = true;
            childrenToLoad.forEach((childId, index) => {
                allNewNodes.push({
                    id: childId,
                    x: node.x + 240,
                    y: node.y + (index * 90) - ((childrenToLoad.length - 1) * 45),
                });
                allNewEdges.push({ id: `${node.id}-${childId}`, source: node.id, target: childId });
            });
        }

        // Reveal parents
        const parentIds = parentMap.get(node.id) || [];
        const parentsToLoad = parentIds.filter(parentId => allDefinitions.has(parentId) && !nodesOnCanvas.has(parentId) && !allNewNodes.some(n => n.id === parentId));
        
        if (parentsToLoad.length > 0) {
            madeChanges = true;
            parentsToLoad.forEach((parentId, index) => {
                allNewNodes.push({
                    id: parentId,
                    x: node.x - 240,
                    y: node.y + (index * 90) - ((parentsToLoad.length - 1) * 45),
                });
                allNewEdges.push({ id: `${parentId}-${node.id}`, source: parentId, target: node.id });
            });
        }
    });

    if (madeChanges) {
        setCanvasLayout(prev => ({
            nodes: [...prev.nodes, ...allNewNodes],
            edges: [...prev.edges, ...allNewEdges],
        }));
    } else {
        setIsAutoExpanding(false); // Stop when a full pass results in no new nodes
    }
  }, [isAutoExpanding, canvasLayout, allDefinitions, parentMap, setCanvasLayout]);


  const getNodeStatus = useCallback((defId: string, category: string) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const scheduledInfo = schedule[todayKey] ? Object.values(schedule[todayKey]).flat().find(act => act.taskIds?.some(tid => tid.startsWith(defId))) : undefined;
    
    if (!category) {
        return { isLoggedToday: false, isScheduledToday: false, isPending: false, totalTime: 0 };
    }

    const logs = category.includes('Upskill') ? allUpskillLogs : category.includes('Branding') ? brandingLogs : allDeepWorkLogs;
    const timeField = category.includes('Upskill') ? 'reps' : 'weight';

    const logForToday = logs.find(log => log.date === todayKey)?.exercises.find(ex => ex.definitionId === defId);
    const loggedTimeToday = logForToday?.loggedSets.reduce((sum, set) => sum + set[timeField], 0) || 0;

    return {
        isLoggedToday: loggedTimeToday > 0,
        isScheduledToday: !!scheduledInfo,
        isPending: false,
        totalTime: loggedTimeToday,
    };
}, [schedule, allUpskillLogs, allDeepWorkLogs, brandingLogs]);

  const filteredDefs = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filterFn = (def: ExerciseDefinition) => 
        def.name.toLowerCase().includes(lowercasedFilter) ||
        def.category.toLowerCase().includes(lowercasedFilter);

    return {
      deepWork: deepWorkDefinitions.filter(filterFn),
      upskill: upskillDefinitions.filter(filterFn)
    };
  }, [searchTerm, deepWorkDefinitions, upskillDefinitions]);

  const getPath = (sourcePos: {x:number, y:number}, targetPos: {x:number, y:number}) => {
    const sourceIsLeft = sourcePos.x < targetPos.x;
    const startX = sourceIsLeft ? sourcePos.x + 192 : sourcePos.x;
    const startY = sourcePos.y + 78 / 2;
    const endX = sourceIsLeft ? targetPos.x : targetPos.x + 192;
    const endY = targetPos.y + 78 / 2;
    
    const dx = endX - startX;
    const controlPointX1 = startX + dx / 2;
    const controlPointX2 = endX - dx / 2;
    
    return `M ${startX},${startY} C ${controlPointX1},${startY} ${controlPointX2},${endY} ${endX},${endY}`;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row">
      <aside className="w-full md:w-80 border-r flex-shrink-0 flex flex-col bg-background">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Library</h2>
          <Input 
            placeholder="Search tasks..." 
            className="mt-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Tabs defaultValue="deep-work" className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deep-work">Deep Work</TabsTrigger>
            <TabsTrigger value="upskill">Upskill</TabsTrigger>
          </TabsList>
          <TabsContent value="deep-work" className="flex-grow min-h-0">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {filteredDefs.deepWork.map(def => (
                  <Button key={def.id} variant="ghost" className="w-full justify-start h-auto text-left" onClick={() => handleAddNode(def)}>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{def.name}</span>
                      <span className="text-xs text-muted-foreground">{def.category}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="upskill" className="flex-grow min-h-0">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                 {filteredDefs.upskill.map(def => (
                  <Button key={def.id} variant="ghost" className="w-full justify-start h-auto text-left" onClick={() => handleAddNode(def)}>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{def.name}</span>
                      <span className="text-xs text-muted-foreground">{def.category}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </aside>

      <main ref={canvasRef} className="flex-grow relative bg-muted/30 overflow-hidden">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <TransformWrapper 
                ref={transformWrapperRef} 
                disabled={isDragging} 
                wheel={{ step: 0.1, activationKeys: ['Control'] }}
                panning={{ allowLeftClick: false, allowRightClick: false, allowMiddleClick: false }}
            >
                <Controls/>
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '200vw', height: '200vh' }}>
                  <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                    <defs>
                      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--border))" />
                      </marker>
                    </defs>
                    {canvasLayout.edges.map(edge => {
                      const sourcePos = nodePositions.get(edge.source);
                      const targetPos = nodePositions.get(edge.target);
                      if (!sourcePos || !targetPos) return null;
                      return (
                        <g key={edge.id} onMouseEnter={() => setHoveredEdge(edge.id)} onMouseLeave={() => setHoveredEdge(null)}>
                            <path d={getPath(sourcePos, targetPos)} stroke="hsl(var(--border))" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                            <path d={getPath(sourcePos, targetPos)} stroke="transparent" strokeWidth="10" fill="none" className="cursor-pointer pointer-events-auto" onClick={() => handleRemoveEdge(edge.id)}/>
                            {hoveredEdge === edge.id && <path d={getPath(sourcePos, targetPos)} stroke="hsl(var(--destructive))" strokeWidth="2" fill="none" />}
                        </g>
                      );
                    })}
                  </svg>
                  {canvasLayout.nodes.map(node => {
                    const definition = allDefinitions.get(node.id);
                    if (!definition) return null;

                    const allChildIds = [
                        ...(definition.linkedDeepWorkIds || []),
                        ...(definition.linkedUpskillIds || []),
                        ...(definition.linkedResourceIds || []),
                    ];
                    const hasUnloadedChild = allChildIds.some(childId => allDefinitions.has(childId) && !nodePositions.has(childId));
                    const canExpandChildren = hasUnloadedChild;

                    const potentialParents = parentMap.get(node.id) || [];
                    const hasUnloadedParent = potentialParents.some(parentId => allDefinitions.has(parentId) && !nodePositions.has(parentId));
                    const canRevealParents = hasUnloadedParent;
                    
                    const isRootNode = !(parentMap.get(node.id) || []).some(parentId => nodePositions.has(parentId));


                    return (
                      <DraggableNode
                        key={node.id}
                        node={node}
                        definition={definition}
                        status={getNodeStatus(node.id, definition.category)}
                        onConnectClick={handleConnectClick}
                        onRemoveClick={handleRemoveNode}
                        onExpandChildren={handleExpandChildren}
                        onRevealParents={handleRevealParents}
                        onClickForConnection={handleNodeClickForConnection}
                        isConnecting={!!connectingFrom}
                        isHovered={connectingFrom === node.id}
                        canExpandChildren={canExpandChildren}
                        canRevealParents={canRevealParents}
                        onExpandAll={handleExpandAll}
                        isRootNode={isRootNode}
                      />
                    );
                  })}
                </TransformComponent>
            </TransformWrapper>
        </DndContext>
      </main>
    </div>
  );
}

export default function CanvasPage() {
    return <AuthGuard><CanvasPageContent /></AuthGuard>;
}
