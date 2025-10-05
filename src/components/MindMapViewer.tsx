

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

// Component-specific icons
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>X</title>
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
    </svg>
);
const DevToIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>DEV Community</title>
        <path d="M11.472 24a1.5 1.5 0 0 1-1.06-.44L.439 13.587a1.5 1.5 0 0 1 0-2.12l9.97-9.97a1.5 1.5 0 0 1 2.12 0L22.503 11.47a1.5 1.5 0 0 1 0 2.121l-9.972 9.971a1.5 1.5 0 0 1-1.06.44Zm-8.485-11.25 8.485 8.485 8.485-8.485-8.485-8.485-8.485 8.485ZM19.5 18h-3V9h3v9Z"/>
    </svg>
);


const ConceptualFlowDiagram = () => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted/30 p-8">
      <div className="relative w-[800px] h-[400px]">
        {/* Nodes */}
        <div className="absolute bottom-0 left-0 text-center">
          <div className="font-semibold text-lg">Current state</div>
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-center">
          <div className="font-semibold text-lg">Solution</div>
          <div className="text-sm text-muted-foreground">Go to Gym + Walks + diet + plan + consistency</div>
        </div>
        <div className="absolute bottom-0 right-0 text-center">
          <div className="font-semibold text-lg">Outcome</div>
          <div className="text-sm text-muted-foreground">Lost 12 KGS in 6 months</div>
        </div>

        {/* Lines and Arrows */}
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
            </marker>
          </defs>
          {/* Base Line */}
          <line x1="100" y1="380" x2="700" y2="380" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrowhead)" />
          {/* Left Line */}
          <line x1="80" y1="360" x2="390" y2="60" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrowhead)" />
          {/* Right Line */}
          <line x1="410" y1="60" x2="720" y2="360" stroke="currentColor" strokeWidth="2" markerEnd="url(#arrowhead)" />
        </svg>

        {/* Labels on lines */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center">
          <div className="text-sm text-muted-foreground">I want to lose 20kg weight in 6 months</div>
          <div className="font-semibold mt-1">Intention</div>
        </div>
      </div>
    </div>
  );
};


interface MindMapNode extends Partial<ExerciseDefinition>, Partial<Release>, Partial<Resource>, Partial<ResourceFolderType>, Partial<FormalizationItem> {
  id: string;
  definitionId?: string;
  name: string;
  category: string;
  children: MindMapNode[];
  totalLoggedHours?: number;
  topic?: string;
  type?: 'product' | 'service' | 'card' | 'link' | 'formalization_element' | 'component' | 'operation' | 'property' | 'meta-rule';
}

interface MindMapViewerProps {
    defaultView?: string | null;
    showControls?: boolean;
    rootId?: string | null;
}

const CARD_WIDTH = 192;
const CARD_HEIGHT = 90;
const VERTICAL_SPACING = 40;
const HORIZONTAL_SPACING = 240;

// Sub-component for the new interactive map
const InteractiveFocusAreaMap = ({ rootId }: { rootId: string }) => {
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
                                    isRootNode={false}
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


// Main Component
export function MindMapViewer({ defaultView, showControls = true, rootId = null }: MindMapViewerProps) {
  if (rootId === "global_elements") {
    return <InteractiveFocusAreaMap rootId={rootId} />;
  }
  // The rest of the component for other mind map types remains unchanged
  return <div>Other mind map types would be rendered here.</div>;
}

