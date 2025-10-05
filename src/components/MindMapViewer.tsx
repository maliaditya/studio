
"use client"

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { GitBranch, BookCopy, GitMerge, ZoomIn, ZoomOut, Expand, Shrink, RefreshCw, Briefcase, Share2, Package, Globe, ArrowRight, ArrowLeft, Linkedin, Youtube, Rocket, Workflow, Calendar, Check, AlertTriangle, ArrowDown, HeartPulse, LayoutDashboard, Magnet, Activity as ActivityIcon, PlusCircle, Link as LinkIcon, Save, MinusCircle, Folder, ExternalLink, Lightbulb, Focus, Frame, Flashlight, Flag, Bolt, Library, Blocks, Database } from 'lucide-react';
import type { ExerciseDefinition, Release, DatedWorkout, ActivityType as ActivityTypeType, Resource, ResourceFolder as ResourceFolderType, DailySchedule, Pattern, MetaRule, FormalizationItem, CanvasLayout, CanvasNode, CanvasEdge } from '@/types/workout'; // Renaming imported ActivityType to avoid conflict with lucide-react
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef, useControls } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays, isBefore, startOfToday, isAfter } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { DndContext, useDraggable, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { Progress } from './ui/progress';
import { IntentionDetailPopup } from './IntentionDetailPopup';


interface MindMapViewerProps {
    defaultView?: string | null;
    showControls?: boolean;
    rootId?: string | null;
}

const CARD_WIDTH = 192;
const CARD_HEIGHT = 90;
const VERTICAL_SPACING = 40;
const HORIZONTAL_SPACING = 240;

const PositionedNode = ({ nodeId, pos, definition, status }: any) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: nodeId });
    const style = {
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        willChange: 'transform',
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    } as React.CSSProperties;

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className="w-48 z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <Card className="shadow-lg hover:shadow-xl transition-shadow border-l-4 border-cyan-500">
                <div className="p-2 cursor-grab" {...listeners} {...attributes}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <Database className="h-4 w-4 text-cyan-500"/>
                             <div className="flex-grow min-w-0">
                                <p className="font-semibold text-xs text-foreground truncate" title={definition.text}>
                                    {definition.text}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                    Global Element
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

const InteractiveCanvas = ({ rootId }: { rootId: string }) => {
    const { 
        resources, 
        canvasLayout, setCanvasLayout,
    } = useAuth();
    const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [isFullScreen, setIsFullScreen] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const handleFullScreenChange = useCallback(() => {
        setIsFullScreen(!!document.fullscreenElement);
    }, []);

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
        };
    }, [handleFullScreenChange]);

    const toggleFullScreen = useCallback(() => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    const allGlobalElements = useMemo(() => {
      const elements: FormalizationItem[] = [];
      (resources || []).forEach(resource => {
          if (resource.formalization && resource.formalization.elements) {
              elements.push(...resource.formalization.elements.filter(e => e.isGlobal));
          }
      });
      return Array.from(new Map(elements.map(item => [item.id, item])).values());
    }, [resources]);

    useEffect(() => {
      if (allGlobalElements.length > 0 && canvasLayout.nodes.length === 0) {
        // Initialize positions if not already set
        const newNodes: CanvasNode[] = allGlobalElements.map((el, index) => ({
          id: el.id,
          x: (index % 5) * (CARD_WIDTH + 80),
          y: Math.floor(index / 5) * (CARD_HEIGHT + VERTICAL_SPACING),
        }));
        setCanvasLayout({ nodes: newNodes, edges: [] });
      }
    }, [allGlobalElements, canvasLayout.nodes.length, setCanvasLayout]);


    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta } = event;
        const scale = transformWrapperRef.current?.instance.transformState.scale || 1;
        
        setCanvasLayout(prevLayout => {
            const nodeIndex = prevLayout.nodes.findIndex(n => n.id === active.id);
            if (nodeIndex === -1) return prevLayout;
            
            const newNodes = [...prevLayout.nodes];
            const node = newNodes[nodeIndex];
            newNodes[nodeIndex] = {
                ...node,
                x: node.x + delta.x / scale,
                y: node.y + delta.y / scale
            };
            return { ...prevLayout, nodes: newNodes };
        });
    };

    const getPath = (sourcePos: {x:number, y:number}, targetPos: {x:number, y:number}) => {
        const startX = sourcePos.x + CARD_WIDTH / 2;
        const startY = sourcePos.y + CARD_HEIGHT / 2;
        const endX = targetPos.x + CARD_WIDTH / 2;
        const endY = targetPos.y + CARD_HEIGHT / 2;
        
        return `M ${startX},${startY} L ${endX},${endY}`;
    };

    const Controls = () => {
        return (
            <div className="absolute top-2 right-2 z-20 flex flex-col gap-2">
                <Button size="icon" onClick={() => transformWrapperRef.current?.zoomIn()}><ZoomIn/></Button>
                <Button size="icon" onClick={() => transformWrapperRef.current?.zoomOut()}><ZoomOut/></Button>
                <Button size="icon" onClick={() => transformWrapperRef.current?.resetTransform()}><RefreshCw/></Button>
                <Button size="icon" onClick={toggleFullScreen}>
                    {isFullScreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                </Button>
            </div>
        );
    };

    return (
        <div ref={containerRef} className="w-full h-full relative bg-background">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <TransformWrapper ref={transformWrapperRef} initialScale={0.7} panning={{disabled: false}}>
                    <Controls />
                    <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '200vw', height: '200vh' }}>
                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                            {canvasLayout.edges.map(edge => {
                                const sourceNode = canvasLayout.nodes.find(n => n.id === edge.source);
                                const targetNode = canvasLayout.nodes.find(n => n.id === edge.target);
                                if (!sourceNode || !targetNode) return null;
                                return <path key={edge.id} d={getPath(sourceNode, targetNode)} stroke="hsl(var(--border))" strokeWidth="2" fill="none" />;
                            })}
                        </svg>
                        {canvasLayout.nodes.map(nodeState => {
                            const definition = allGlobalElements.find(el => el.id === nodeState.id);
                            if (!definition) return null;
                            
                            return (
                                <PositionedNode
                                    key={nodeState.id}
                                    nodeId={nodeState.id}
                                    pos={nodeState}
                                    definition={definition}
                                    status={{}}
                                />
                            );
                        })}
                    </TransformComponent>
                </TransformWrapper>
            </DndContext>
        </div>
    );
};


// Main Component
export function MindMapViewer({ defaultView, showControls = true, rootId = null }: MindMapViewerProps) {
  if (rootId === "global_elements") {
    return <InteractiveCanvas rootId={rootId} />;
  }
  
  // This is a basic placeholder for the original mind map functionality.
  // We'll need to build this out to fully restore the previous views.
  const OriginalMindMapComponent = () => {
    const { 
        deepWorkDefinitions,
        upskillDefinitions,
        resources,
        projects,
        offerizationPlans,
        productizationPlans,
    } = useAuth();
    
    const [view, setView] = useState(defaultView || 'Offerization');

    return (
        <div className="p-4">
            <h3 className="font-semibold text-lg">Original Mind Map (Restored)</h3>
            <p className="text-sm text-muted-foreground">
                This view shows the hierarchical structure of your skills, projects, and plans.
            </p>
            <div className="mt-4">
                <Select value={view} onValueChange={setView}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select a view..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Strategic Overview">Strategic Overview</SelectItem>
                        {/* Add other view options here */}
                    </SelectContent>
                </Select>
            </div>
            <div className="mt-4 border p-4 rounded-md bg-muted/20 min-h-[400px]">
                {/* 
                  Here you would implement the D3 or other library logic 
                  to render the actual nodes and links based on the selected `view`
                  and the data from the AuthContext.
                */}
                <p className="text-center text-muted-foreground">
                    Rendering for '{view}' view would appear here.
                </p>
            </div>
        </div>
    );
  };
  
  return <OriginalMindMapComponent />;
}
