
"use client";

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { DndContext, useDraggable, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
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
import { PlusCircle, Link, X, Lightbulb, Focus, Frame, Flashlight, AlertTriangle, Briefcase, GitMerge, BookCopy } from 'lucide-react';
import type { ExerciseDefinition, CanvasNode, ActivityType, CanvasEdge } from '@/types/workout';
import { format } from 'date-fns';

// Draggable Node Component
function DraggableNode({ node, definition, status, onConnectClick, onRemoveClick, onExpandNode, onClickForConnection, isConnecting, isHovered }: {
  node: CanvasNode;
  definition: ExerciseDefinition;
  status: any;
  onConnectClick: (e: React.MouseEvent, nodeId: string) => void;
  onRemoveClick: (nodeId: string) => void;
  onExpandNode: (nodeId: string) => void;
  onClickForConnection: (nodeId: string) => void;
  isConnecting: boolean;
  isHovered: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: node.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;
  
  const hasChildren = (definition.linkedDeepWorkIds?.length ?? 0) > 0 || (definition.linkedUpskillIds?.length ?? 0) > 0;

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
      style={{ ...style, position: 'absolute', left: node.x, top: node.y }}
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
          {hasChildren && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onExpandNode(node.id)}>
                <PlusCircle className="h-4 w-4" />
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
  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require mouse to move 8px before a drag is initiated
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
      x: canvasRect ? (canvasRect.width / 2) - 96 : 200, // Center it horizontally
      y: canvasRect ? (canvasRect.height / 2) - 50 : 200, // Center it vertically
    };
    setCanvasLayout(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    setCanvasLayout(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === active.id ? { ...node, x: node.x + delta.x, y: node.y + delta.y } : node
      )
    }));
  };
  
  const handleConnectClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectingFrom) {
      // Trying to connect to the same node
      if (connectingFrom === nodeId) {
        setConnectingFrom(null);
        return;
      }
      // Create edge
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
      [...deepWorkDefinitions, ...upskillDefinitions].map(def => [def.id, def])
  ), [deepWorkDefinitions, upskillDefinitions]);

  const handleExpandNode = (nodeId: string) => {
    const parentDef = allDefinitions.get(nodeId);
    const parentNode = canvasLayout.nodes.find(n => n.id === nodeId);
    if (!parentDef || !parentNode) return;

    const childIds = [
        ...(parentDef.linkedDeepWorkIds || []),
        ...(parentDef.linkedUpskillIds || []),
    ];
    
    if (childIds.length === 0) return;

    const newNodes: CanvasNode[] = [];
    const newEdges: CanvasEdge[] = [];
    const existingNodeIds = new Set(canvasLayout.nodes.map(n => n.id));

    const validChildIds = childIds.filter(id => allDefinitions.has(id));

    validChildIds.forEach((childId, index) => {
        if (!existingNodeIds.has(childId)) {
            newNodes.push({
                id: childId,
                x: parentNode.x + 240,
                y: parentNode.y + (index * 90) - ((validChildIds.length - 1) * 45),
            });
            existingNodeIds.add(childId);
        }
        
        const edgeId = `${nodeId}-${childId}`;
        const reverseEdgeId = `${childId}-${nodeId}`;
        const edgeExists = canvasLayout.edges.some(e => e.id === edgeId || e.id === reverseEdgeId);
        
        if (!edgeExists) {
            newEdges.push({
                id: edgeId,
                source: nodeId,
                target: childId,
            });
        }
    });

    if (newNodes.length > 0 || newEdges.length > 0) {
        setCanvasLayout(prev => ({
            nodes: [...prev.nodes, ...newNodes],
            edges: [...prev.edges, ...newEdges],
        }));
    }
  };

  const nodePositions = useMemo(() => new Map(
      canvasLayout.nodes.map(node => [node.id, { x: node.x, y: node.y }])
  ), [canvasLayout.nodes]);
  
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
        isPending: false, // This logic can be expanded if needed
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
    const startX = sourcePos.x + 192 / 2;
    const startY = sourcePos.y + 78 / 2;
    const endX = targetPos.x + 192 / 2;
    const endY = targetPos.y + 78 / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    return `M ${startX},${startY} C ${startX + dx / 2},${startY} ${endX - dx / 2},${endY} ${endX},${endY}`;
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
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
            return (
              <DraggableNode
                key={node.id}
                node={node}
                definition={definition}
                status={getNodeStatus(node.id, definition.category)}
                onConnectClick={handleConnectClick}
                onRemoveClick={handleRemoveNode}
                onExpandNode={handleExpandNode}
                onClickForConnection={handleNodeClickForConnection}
                isConnecting={!!connectingFrom}
                isHovered={connectingFrom === node.id}
              />
            );
          })}
        </DndContext>
      </main>
    </div>
  );
}

export default function CanvasPage() {
    return <AuthGuard><CanvasPageContent /></AuthGuard>;
}
