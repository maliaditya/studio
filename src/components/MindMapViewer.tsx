
"use client"

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { GitBranch, BookCopy, GitMerge, ZoomIn, ZoomOut, Expand, Shrink, RefreshCw, Briefcase, Share2, Package, Globe, ArrowRight, ArrowLeft, Linkedin, Youtube, Rocket, Workflow, Calendar, Check, AlertTriangle, ArrowDown, HeartPulse, LayoutDashboard, Magnet, Activity as ActivityIcon, PlusCircle, Link as LinkIcon, Save, MinusCircle, Folder, ExternalLink, Lightbulb, Focus, Frame, Flashlight } from 'lucide-react';
import type { ExerciseDefinition, Release, DatedWorkout, ActivityType as ActivityTypeType, Resource, ResourceFolder as ResourceFolderType } from '@/types/workout'; // Renaming imported ActivityType to avoid conflict with lucide-react
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef, useControls } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays } from 'date-fns';
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
const FlowCard = ({ icon, title, description, children }: { icon: React.ReactNode, title: string, description: string, children?: React.ReactNode }) => (
  <div className="flex flex-col items-center p-4 border rounded-lg bg-card shadow-sm w-64 text-center h-full">
    <div className="text-primary">{icon}</div>
    <h3 className="mt-2 font-semibold text-foreground">{title}</h3>
    <p className="mt-1 text-xs text-muted-foreground flex-grow">{description}</p>
    {children}
  </div>
);

const FeatureList = ({ features }: { features: string[] }) => (
    <div className="mt-3 pt-3 border-t w-full">
        <ul className="text-left text-xs list-disc list-inside space-y-1 text-muted-foreground">
            {features.map((feature, i) => <li key={i}>{feature}</li>)}
        </ul>
    </div>
);

const ConceptualFlowDiagram = () => {
    return (
        <div className="flex items-start justify-center p-8 overflow-x-auto">
            {/* Main container changed to flex-row */}
            <div className="flex flex-row items-center gap-8">

                {/* Stage 1: Foundation (Vertical stack) */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <FlowCard icon={<HeartPulse size={32} />} title="1. Health" description="Track workouts, diet, and physical progress.">
                        <FeatureList features={["Workout Plans", "Exercise Library", "Diet Planning", "Weight Tracking"]} />
                    </FlowCard>
                    <FlowCard icon={<BookCopy size={32} />} title="2. Upskill" description="Structured learning and skill acquisition.">
                        <FeatureList features={["Topic & Goal Setting", "Session Logging", "Progress Visualization"]} />
                    </FlowCard>
                </div>

                <ArrowRight className="w-10 h-10 text-muted-foreground/30 shrink-0" />

                {/* Stage 2: Application */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <FlowCard icon={<Briefcase size={32} />} title="3. Deep Work" description="Apply skills to focus areas, creating tangible value.">
                        <FeatureList features={["Focus Area Management", "Skill Integration", "Time Tracking", "Ready for Branding Pipeline"]} />
                    </FlowCard>
                </div>

                <ArrowRight className="w-10 h-10 text-muted-foreground/30 shrink-0" />

                {/* Stage 3: Systemization & Monetization (Vertical stack) */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <FlowCard icon={<Share2 size={32} />} title="4a. Personal Branding" description="Bundle completed Deep Work into shareable content.">
                        <FeatureList features={["Content Bundling", "Creation Workflow (4-stage)", "Publishing Checklist"]} />
                    </FlowCard>
                    <FlowCard icon={<Package size={32} />} title="4b. Productization & Offerization" description="Systematically plan products and services.">
                        <FeatureList features={["Gap Analysis", "Product/Service Definition", "Release Planning"]} />
                    </FlowCard>
                     <FlowCard icon={<Magnet size={32} />} title="4c. Lead Gen & Offer System" description="Define and track outreach and service offerings.">
                        <FeatureList features={["Daily Action Tracking", "Service Offer Definition"]} />
                    </FlowCard>
                </div>

                 <ArrowRight className="w-10 h-10 text-muted-foreground/30 shrink-0" />

                {/* Stage 4: Overview & Control (Vertical stack) */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <FlowCard icon={<LayoutDashboard size={32} />} title="5. Dashboard" description="Your daily command center for all activities.">
                        <FeatureList features={["Time-Slotted Agenda", "Productivity Snapshot", "Activity Heatmap"]} />
                    </FlowCard>
                    <FlowCard icon={<GitMerge size={32} />} title="6. Strategic Views" description="High-level visualization of all plans.">
                        <FeatureList features={["Strategic Matrix", "Interactive Mind Map"]} />
                    </FlowCard>
                </div>

            </div>
        </div>
    );
};


interface MindMapNode extends Partial<ExerciseDefinition>, Partial<Release>, Partial<Resource>, Partial<ResourceFolderType> {
  id: string;
  definitionId: string;
  name: string;
  category: string;
  children: MindMapNode[];
  totalLoggedHours?: number;
  topic?: string;
  type?: 'product' | 'service';
}

interface MindMapViewerProps {
    defaultView?: string | null;
    showControls?: boolean;
    rootFolderId?: string | null;
    rootFocusAreaId?: string | null;
}

// Sub-component for the new interactive map
const InteractiveFocusAreaMap = ({ rootId }: { rootId: string }) => {
    const { deepWorkDefinitions, upskillDefinitions, resources, schedule, allUpskillLogs, allDeepWorkLogs, brandingLogs } = useAuth();
    const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null);

    const [nodes, setNodes] = useState<Map<string, { x: number; y: number }>>(new Map());
    const [edges, setEdges] = useState<Set<string>>(new Set());
    const [isDragging, setIsDragging] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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

    useEffect(() => {
        const linkedDeepWorkChildIds = new Set<string>((deepWorkDefinitions || []).flatMap(def => def.linkedDeepWorkIds || []));
        let currentId = rootId;
        let trueRootId = rootId;

        while (linkedDeepWorkChildIds.has(currentId)) {
            const parent = deepWorkDefinitions.find(def => (def.linkedDeepWorkIds || []).includes(currentId));
            if (parent) {
                currentId = parent.id;
                trueRootId = parent.id;
            } else { break; }
        }
        
        setNodes(new Map([[trueRootId, { x: 100, y: 300 }]]));
        setEdges(new Set());
    }, [rootId, deepWorkDefinitions]);

    const handleExpandChildren = useCallback((nodeId: string) => {
        const currentNodeDef = allDefinitions.get(nodeId);
        const currentNodePos = nodes.get(nodeId);
        if (!currentNodeDef || !currentNodePos) return;
        
        const childIds = [...(currentNodeDef.linkedDeepWorkIds || []), ...(currentNodeDef.linkedUpskillIds || []), ...(currentNodeDef.linkedResourceIds || [])];
        const validChildIds = childIds.filter(id => allDefinitions.has(id) && !nodes.has(id));

        if (validChildIds.length > 0) {
            const newNodes = new Map(nodes);
            const newEdges = new Set(edges);
            
            validChildIds.forEach((childId, index) => {
                newNodes.set(childId, {
                    x: currentNodePos.x + 240, 
                    y: currentNodePos.y + (index * 90) - ((validChildIds.length - 1) * 45),
                });
                newEdges.add(`${nodeId}-${childId}`);
            });
            setNodes(newNodes);
            setEdges(newEdges);
        }
    }, [nodes, edges, allDefinitions]);
  
    const handleRevealParents = useCallback((nodeId: string) => {
        const currentNodePos = nodes.get(nodeId);
        if (!currentNodePos) return;

        const potentialParents = parentMap.get(nodeId) || [];
        const parentsToLoad = potentialParents.filter(parentId => allDefinitions.has(parentId) && !nodes.has(parentId));

        if (parentsToLoad.length > 0) {
            const newNodes = new Map(nodes);
            const newEdges = new Set(edges);
            
            parentsToLoad.forEach((parentId, index) => {
                newNodes.set(parentId, {
                    x: currentNodePos.x + 240,
                    y: currentNodePos.y + (index * 90) - ((parentsToLoad.length - 1) * 45),
                });
                newEdges.add(`${parentId}-${nodeId}`);
            });
            setNodes(newNodes);
            setEdges(newEdges);
        }
    }, [nodes, edges, allDefinitions, parentMap]);
    
    const handleDragEnd = (event: DragEndEvent) => {
        setIsDragging(false);
        const { active, delta } = event;
        const scale = transformWrapperRef.current?.instance.transformState.scale || 1;
        setNodes(prev => {
            const newNodes = new Map(prev);
            const nodePos = newNodes.get(active.id as string);
            if (nodePos) {
                newNodes.set(active.id as string, { x: nodePos.x + delta.x / scale, y: nodePos.y + delta.y / scale });
            }
            return newNodes;
        });
    };

    const getNodeStatus = useCallback((defId: string) => {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const scheduledInfo = schedule[todayKey] ? Object.values(schedule[todayKey]).flat().find(act => act.taskIds?.some(tid => tid.startsWith(defId))) : undefined;
        
        const deepWorkLog = allDeepWorkLogs.find(log => log.date === todayKey)?.exercises.find(ex => ex.definitionId === defId);
        const upskillLog = allUpskillLogs.find(log => log.date === todayKey)?.exercises.find(ex => ex.definitionId === defId);
        const brandingLog = brandingLogs.find(log => log.date === todayKey)?.exercises.find(ex => ex.definitionId === defId);

        const isLoggedToday = (deepWorkLog?.loggedSets.length ?? 0) > 0 || (upskillLog?.loggedSets.length ?? 0) > 0 || (brandingLog?.loggedSets.length ?? 0) > 0;
        
        return { isLoggedToday, isScheduledToday: !!scheduledInfo, isPending: false };
    }, [schedule, allDeepWorkLogs, allUpskillLogs, brandingLogs]);
    
    const getPath = (sourcePos: {x:number, y:number}, targetPos: {x:number, y:number}) => {
        const sourceIsLeft = sourcePos.x < targetPos.x;
        const startX = sourceIsLeft ? sourcePos.x + 192 : sourcePos.x;
        const startY = sourcePos.y + 45;
        const endX = sourceIsLeft ? targetPos.x : targetPos.x + 192;
        const endY = targetPos.y + 45;
        
        const dx = endX - startX;
        const controlPointX1 = startX + dx / 2;
        const controlPointX2 = endX - dx / 2;
        
        return `M ${startX},${startY} C ${controlPointX1},${startY} ${controlPointX2},${endY} ${endX},${endY}`;
    };

    const Controls = () => {
        const { zoomIn, zoomOut, resetTransform } = useControls();
        return (
            <div className="absolute top-2 right-2 z-20 flex flex-col gap-2">
                <Button size="icon" onClick={() => zoomIn()}><ZoomIn/></Button>
                <Button size="icon" onClick={() => zoomOut()}><ZoomOut/></Button>
                <Button size="icon" onClick={() => resetTransform()}><RefreshCw/></Button>
            </div>
        );
    };

    return (
        <DndContext sensors={sensors} onDragStart={() => setIsDragging(true)} onDragEnd={handleDragEnd}>
            <TransformWrapper ref={transformWrapperRef} disabled={isDragging}>
                <Controls />
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '200vw', height: '200vh' }}>
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--border))" />
                            </marker>
                        </defs>
                        {Array.from(edges).map(edgeId => {
                            const [sourceId, targetId] = edgeId.split('-');
                            const sourcePos = nodes.get(sourceId);
                            const targetPos = nodes.get(targetId);
                            if (!sourcePos || !targetPos) return null;
                            return (
                                <g key={edgeId}>
                                    <path d={getPath(sourcePos, targetPos)} stroke="hsl(var(--border))" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                                </g>
                            );
                        })}
                    </svg>
                    {Array.from(nodes.entries()).map(([nodeId, pos]) => {
                        const definition = allDefinitions.get(nodeId);
                        if (!definition) return null;
                        
                        const allChildIds = [...(definition.linkedDeepWorkIds || []), ...(definition.linkedUpskillIds || []), ...(definition.linkedResourceIds || [])];
                        const canExpandChildren = allChildIds.some(childId => allDefinitions.has(childId) && !nodes.has(childId));
                        const canRevealParents = (parentMap.get(nodeId) || []).some(parentId => allDefinitions.has(parentId) && !nodes.has(parentId));
                        
                        return (
                            <PositionedNode
                                key={nodeId}
                                nodeId={nodeId}
                                pos={pos}
                                definition={definition}
                                onExpandChildren={() => handleExpandChildren(nodeId)}
                                onRevealParents={() => handleRevealParents(nodeId)}
                                canExpandChildren={canExpandChildren}
                                canRevealParents={canRevealParents}
                                status={getNodeStatus(nodeId)}
                            />
                        );
                    })}
                </TransformComponent>
            </TransformWrapper>
        </DndContext>
    );
};

const PositionedNode = ({ nodeId, pos, definition, onExpandChildren, onRevealParents, canExpandChildren, canRevealParents, status }: any) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: nodeId });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    
    const getIcon = () => {
        if (definition.category === 'Learning Task' || upskillDefinitions.some(d => d.id === definition.id)) {
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
            style={{ ...style, position: 'absolute', left: pos.x, top: pos.y, willChange: 'transform' }}
            className="w-48 z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <Card className={cn("shadow-lg hover:shadow-xl transition-shadow border-2", status.isLoggedToday && "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700", status.isScheduledToday && !status.isLoggedToday && "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700")}>
                <div className="p-2 cursor-grab" {...listeners} {...attributes}>
                    <div className="flex items-center gap-2">
                        {getIcon()}
                        <p className="font-semibold text-xs text-foreground truncate" title={definition.name}>
                            {definition.name}
                        </p>
                    </div>
                </div>
                <CardContent className="p-2 border-t flex justify-end gap-1">
                    {canExpandChildren && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onExpandChildren}>
                            <GitBranch className="h-4 w-4 text-green-500" />
                        </Button>
                    )}
                    {canRevealParents && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRevealParents}>
                            <GitMerge className="h-4 w-4 text-amber-500" />
                        </Button>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};


// Main Component
export function MindMapViewer({ defaultView, showControls = true, rootFolderId = null, rootFocusAreaId = null }: MindMapViewerProps) {
  const { toast } = useToast();
  const { 
      deepWorkDefinitions, upskillDefinitions, deepWorkTopicMetadata, productizationPlans, offerizationPlans, schedule, allUpskillLogs, allDeepWorkLogs, brandingLogs, scheduleTaskFromMindMap, addFeatureToRelease, setDeepWorkDefinitions, resources, resourceFolders,
  } = useAuth();
  
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null);
  
  // State for hover highlight
  const [hoveredNodeIds, setHoveredNodeIds] = useState<Set<string>>(new Set());
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // State for linking learning popover
  const [isLinkLearningPopoverOpen, setIsLinkLearningPopoverOpen] = useState(false);
  const [linkingLearningToFocusArea, setLinkingLearningToFocusArea] = useState<MindMapNode | null>(null);
  const [editableLinkedUpskillIds, setEditableLinkedUpskillIds] = useState<string[]>([]);

  // State for inline adding
  const [inlineAddInfo, setInlineAddInfo] = useState<{ parentReleaseId: string; newFeatureName: string } | null>(null);

  const toggleNode = useCallback((nodeId: string) => {
    setCollapsedNodes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
            newSet.delete(nodeId);
        } else {
            newSet.add(nodeId);
        }
        return newSet;
    });
  }, []);

  useEffect(() => {
    if (defaultView) {
        setSelectedTopic(defaultView);
    } else {
        setSelectedTopic(showControls ? '' : 'Strategic Overview');
    }
  }, [defaultView, showControls]);
  
  const totalTimePerFocusArea = useMemo(() => {
    const timeMap = new Map<string, number>();
    (allDeepWorkLogs || []).forEach(log => {
        (log.exercises || []).forEach(ex => {
            const duration = ex.loggedSets.reduce((sum, set) => sum + set.weight, 0);
            if (duration > 0) {
                timeMap.set(ex.definitionId, (timeMap.get(ex.definitionId) || 0) + duration);
            }
        });
    });
    return timeMap;
  }, [allDeepWorkLogs]);

  const allTopics = useMemo(() => {
    const productAndServiceTopics = Object.keys(deepWorkTopicMetadata).sort();
    const hasBundles = deepWorkDefinitions.some(def => Array.isArray(def.focusAreaIds));
    const hasResources = resourceFolders.length > 0;
    
    const availableTopics = [];
    if (hasBundles) availableTopics.push("Content Bundles");
    if (hasResources) availableTopics.push("Resources");
    availableTopics.push(...productAndServiceTopics);
    
    return ["Strategic Overview", ...availableTopics.sort()];
  }, [deepWorkTopicMetadata, deepWorkDefinitions, resourceFolders]);
  
  const mindMapData = useMemo((): MindMapNode | null => {
    const nodeRegistry = new Map<string, MindMapNode>();

    const getNode = (def: any, category: string, children: MindMapNode[] = [], extraProps: Partial<MindMapNode> = {}): MindMapNode => {
      const definitionId = def.id;
      if (nodeRegistry.has(definitionId)) {
        const existingNode = nodeRegistry.get(definitionId)!;
        if (existingNode.children.length === 0 && children.length > 0) existingNode.children = children;
        return existingNode;
      }
      const newNode: MindMapNode = { ...def, id: definitionId, definitionId: definitionId, category: category, children: children, ...extraProps };
      nodeRegistry.set(definitionId, newNode);
      return newNode;
    };
    
    const buildUpskillTree = (defId: string): MindMapNode | null => {
      const def = upskillDefinitions.find(d => d.id === defId);
      if (!def) return null;
      if (nodeRegistry.has(def.id)) return nodeRegistry.get(def.id)!;
      const node = getNode(def, 'Learning Task');
      const linkedUpskillChildren = (def.linkedUpskillIds || []).map(buildUpskillTree).filter((n): n is MindMapNode => !!n);
      const linkedResourceChildren = (def.linkedResourceIds || []).map(id => resources.find(r => r.id === id)).filter((r): r is Resource => !!r).map(r => getNode(r, 'Resource'));
      node.children = [...linkedUpskillChildren, ...linkedResourceChildren];
      return node;
    }

    const buildDeepWorkTree = (defId: string): MindMapNode | null => {
        const def = deepWorkDefinitions.find(d => d.id === defId);
        if (!def) return null;
        if (nodeRegistry.has(def.id)) return nodeRegistry.get(def.id)!;
        const node = getNode(def, 'FocusArea');
        const linkedWorkChildren = (def.linkedDeepWorkIds || []).map(buildDeepWorkTree).filter((n): n is MindMapNode => !!n);
        const linkedLearningChildren = (def.linkedUpskillIds || []).map(buildUpskillTree).filter((n): n is MindMapNode => !!n);
        node.children = [...linkedWorkChildren, ...linkedLearningChildren];
        return node;
    };
    
    if (!selectedTopic) return null;

    if (selectedTopic === 'Resources') {
        const buildFolderTree = (parentId: string | null): MindMapNode[] => {
            return resourceFolders.filter(f => f.parentId === parentId).sort((a,b) => a.name.localeCompare(b.name)).map(folder => {
                const childrenResources = resources.filter(r => r.folderId === folder.id).sort((a,b) => a.name.localeCompare(b.name)).map(r => getNode(r, 'Resource'));
                const childrenFolders = buildFolderTree(folder.id);
                return getNode(folder, 'Folder', [...childrenFolders, ...childrenResources]);
            });
        };
        return { id: 'resources-root', definitionId: 'resources-root', name: 'Resource Library', category: 'System', children: buildFolderTree(null) };
    }
    
    const buildFullTopicTree = (topic: string, plan: any, type: 'product' | 'service'): MindMapNode => {
        nodeRegistry.clear();
        const releaseNodes: MindMapNode[] = (plan?.releases || []).map((release: Release) => {
            const focusAreaNodes = (release.focusAreaIds || []).map(buildDeepWorkTree).filter((n): n is MindMapNode => !!n);
            const totalMinutes = (release.focusAreaIds || []).reduce((sum, id) => sum + (totalTimePerFocusArea.get(id) || 0), 0);
            return getNode(release, 'Release', focusAreaNodes, { totalLoggedHours: totalMinutes > 0 ? totalMinutes / 60 : 0, topic: topic, type: type });
        });
        const totalTopicHours = releaseNodes.reduce((sum, release) => sum + (release.totalLoggedHours || 0), 0);
        return getNode({ id: topic, name: topic }, type, releaseNodes, { totalLoggedHours: totalTopicHours > 0 ? totalTopicHours : undefined });
    };

    if (selectedTopic === 'Strategic Overview') {
        nodeRegistry.clear();
        const productNodes = Object.keys(productizationPlans).map(topic => buildFullTopicTree(topic, productizationPlans[topic], 'product'));
        const serviceNodes = Object.keys(offerizationPlans).map(topic => buildFullTopicTree(topic, offerizationPlans[topic], 'service'));
        const bundles = deepWorkDefinitions.filter(def => def.focusAreaIds && def.focusAreaIds.length > 0);
        const bundleNodes: MindMapNode[] = bundles.map(bundle => {
            const socialChildren: MindMapNode[] = [];
            if (bundle.sharingStatus?.twitter) socialChildren.push(getNode({ id: `${bundle.id}-twitter`, name: 'X/Twitter' }, 'Social'));
            if (bundle.sharingStatus?.linkedin) socialChildren.push(getNode({ id: `${bundle.id}-linkedin`, name: 'LinkedIn' }, 'Social'));
            if (bundle.sharingStatus?.devto) socialChildren.push(getNode({ id: `${bundle.id}-devto`, name: 'Dev.to' }, 'Social'));
            const focusAreaChildren = (bundle.focusAreaIds || []).map(buildDeepWorkTree).filter((n): n is MindMapNode => !!n);
            return getNode(bundle, 'Content Bundle', [...focusAreaChildren, ...socialChildren]);
        });
        const productsBranch = getNode({id: 'products-branch', name: 'Products'}, 'System Branch', productNodes);
        const servicesBranch = getNode({id: 'services-branch', name: 'Services'}, 'System Branch', serviceNodes);
        const bundlesBranch = getNode({id: 'bundles-branch', name: 'Content Bundles'}, 'System Branch', bundleNodes);
        return getNode({id: 'strategic-overview', name: 'Strategic Overview'}, 'System', [productsBranch, servicesBranch, bundlesBranch].filter(b => b.children.length > 0));
    }

    if (selectedTopic === 'Content Bundles') {
        nodeRegistry.clear();
        const bundles = deepWorkDefinitions.filter(def => def.focusAreaIds && def.focusAreaIds.length > 0);
        const bundleNodes: MindMapNode[] = bundles.map(bundle => {
            const socialChildren: MindMapNode[] = [];
            if (bundle.sharingStatus?.twitter) socialChildren.push(getNode({ id: `${bundle.id}-twitter`, name: 'X/Twitter' }, 'Social'));
            if (bundle.sharingStatus?.linkedin) socialChildren.push(getNode({ id: `${bundle.id}-linkedin`, name: 'LinkedIn' }, 'Social'));
            if (bundle.sharingStatus?.devto) socialChildren.push(getNode({ id: `${bundle.id}-devto`, name: 'Dev.to' }, 'Social'));
            const focusAreaChildren = (bundle.focusAreaIds || []).map(buildDeepWorkTree).filter((n): n is MindMapNode => !!n);
            return getNode(bundle, 'Content Bundle', [...focusAreaChildren, ...socialChildren]);
        });
        return getNode({ id: 'content-bundles-root', name: 'Content Bundles' }, 'Branding', bundleNodes);
    }
    
    const plan = productizationPlans[selectedTopic] || offerizationPlans[selectedTopic];
    const type = productizationPlans[selectedTopic] ? 'product' : 'service';
    return buildFullTopicTree(selectedTopic, plan, type);

  }, [selectedTopic, rootFocusAreaId, rootFolderId, deepWorkDefinitions, upskillDefinitions, deepWorkTopicMetadata, productizationPlans, offerizationPlans, totalTimePerFocusArea, resources, resourceFolders]);

  // ... (rest of the component is the same) ...
  useEffect(() => {
    const timer = setTimeout(() => {
        if (transformWrapperRef.current) {
            transformWrapperRef.current.centerView();
        }
    }, 100); 
    return () => clearTimeout(timer);
  }, [mindMapData]);

  const scheduledTaskInfo = useMemo(() => {
    // ... same as before
  }, [schedule, allUpskillLogs, allDeepWorkLogs, brandingLogs, deepWorkDefinitions]);

  const loggedTaskInfo = useMemo(() => {
    // ... same as before
  }, [allUpskillLogs, allDeepWorkLogs, brandingLogs, deepWorkDefinitions]);
  
  const pendingTaskInfo = useMemo(() => {
    // ... same as before
  }, [schedule, allUpskillLogs, allDeepWorkLogs, brandingLogs, deepWorkDefinitions]);

  const pastLoggedTaskInfo = useMemo(() => {
    // ... same as before
  }, [allUpskillLogs, allDeepWorkLogs, brandingLogs, deepWorkDefinitions]);
  
  const handleSaveNewFeature = () => {
    // ... same as before
  };

  const handleOpenLinkLearningPopover = (node: MindMapNode) => {
    // ... same as before
  };
  
  const handleToggleUpskillLink = (upskillId: string) => {
    // ... same as before
  };

  const handleSaveLinkedLearning = () => {
    // ... same as before
  };
  
  const loggedUpskillDefinitions = useMemo(() => {
    // ... same as before
  }, [allUpskillLogs, upskillDefinitions]);

  const getDescendantIds = useCallback((node: MindMapNode): string[] => {
    // ... same as before
  }, []);

  const handleNodeMouseEnter = useCallback((node: MindMapNode) => {
    // ... same as before
  }, [getDescendantIds]);

  const handleNodeMouseLeave = useCallback(() => {
    // ... same as before
  }, []);
  
  // The recursive rendering function.
  const renderNode = (node: MindMapNode, level: number, parentNode?: MindMapNode) => {
    // ... same as before
  };
  
  if (rootFocusAreaId) {
    return <InteractiveFocusAreaMap rootId={rootFocusAreaId} />;
  }
  
  // ... rest of the original component's return for non-interactive views
  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-full flex flex-col">
          {/* ... existing non-interactive view logic ... */}
      </div>
    </>
  );
}
