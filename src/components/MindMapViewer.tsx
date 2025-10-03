
"use client"

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { GitBranch, BookCopy, GitMerge, ZoomIn, ZoomOut, Expand, Shrink, RefreshCw, Briefcase, Share2, Package, Globe, ArrowRight, ArrowLeft, Linkedin, Youtube, Rocket, Workflow, Calendar, Check, AlertTriangle, ArrowDown, HeartPulse, LayoutDashboard, Magnet, Activity as ActivityIcon, PlusCircle, Link as LinkIcon, Save, MinusCircle, Folder, ExternalLink, Lightbulb, Focus, Frame, Flashlight, Flag, Bolt, Library, Blocks, Database } from 'lucide-react';
import type { ExerciseDefinition, Release, DatedWorkout, ActivityType as ActivityTypeType, Resource, ResourceFolder as ResourceFolderType, DailySchedule, Pattern, MetaRule, FormalizationItem } from '@/types/workout'; // Renaming imported ActivityType to avoid conflict with lucide-react
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
        deepWorkDefinitions, 
        upskillDefinitions, 
        resources, 
        schedule, 
        allUpskillLogs, 
        allDeepWorkLogs, 
        brandingLogs,
        openGeneralPopup, 
        patterns,
        metaRules,
    } = useAuth();
    const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [nodes, setNodes] = useState<Map<string, { x: number; y: number }>>(new Map());
    const [edges, setEdges] = useState<Set<string>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [isAutoExpanding, setIsAutoExpanding] = useState(false);
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

    const allDefinitions = useMemo(() => {
        const { elements = [], operations = [], components = [] } = (resources || []).reduce((acc, resource) => {
            if (resource.formalization) {
                if (resource.formalization.elements) {
                    acc.elements.push(...resource.formalization.elements.map(e => ({ ...e, type: 'formalization_element' as const, category: 'Formalization', name: e.text })));
                }
                if (resource.formalization.operations) {
                    acc.operations.push(...resource.formalization.operations.map(o => ({ ...o, type: 'operation' as const, category: 'Formalization', name: o.text })));
                }
                if (resource.formalization.components) {
                    acc.components.push(...resource.formalization.components.map(c => ({ ...c, type: 'component' as const, category: 'Formalization', name: c.text })));
                }
            }
            return acc;
        }, { elements: [] as any[], operations: [] as any[], components: [] as any[] });
        
        const allItems: (ExerciseDefinition | Resource | Pattern | MetaRule | FormalizationItem)[] = [...deepWorkDefinitions, ...upskillDefinitions, ...resources, ...patterns, ...metaRules, ...elements, ...operations, ...components];
        return new Map(allItems.map(def => [def.id, def]));
    }, [deepWorkDefinitions, upskillDefinitions, resources, patterns, metaRules]);
    
    const parentMap = useMemo(() => {
      const map = new Map<string, string[]>();
      allDefinitions.forEach(def => {
        const formalizationDef = def as FormalizationItem;
        let allChildIds: string[] = [
            ...((def as ExerciseDefinition).linkedDeepWorkIds || []), 
            ...((def as ExerciseDefinition).linkedUpskillIds || []),
            ...((def as ExerciseDefinition).linkedResourceIds || []),
            ...((formalizationDef).linkedElementIds || []),
        ];

        if (formalizationDef.type === 'formalization_element' && formalizationDef.properties) {
          allChildIds.push(...Object.values(formalizationDef.properties).filter(val => allDefinitions.has(val)));
        }
        if ((def as Resource).points) {
            allChildIds.push(...(def as Resource).points!.filter(p => p.resourceId).map(p => p.resourceId!));
        }

        allChildIds.forEach(childId => {
            if (!map.has(childId)) map.set(childId, []);
            map.get(childId)!.push(def.id);
        });
      });
      return map;
    }, [allDefinitions]);

    const runCollisionDetection = useCallback((currentNodes: Map<string, { x: number, y: number }>) => {
        const updatedNodes = new Map(currentNodes);
        const nodeArray = Array.from(updatedNodes.entries());
        let changed = true;
        let iterations = 0;
        
        while (changed && iterations < 10) {
            changed = false;
            iterations++;

            for (let i = 0; i < nodeArray.length; i++) {
                for (let j = i + 1; j < nodeArray.length; j++) {
                    const [idA, posA] = nodeArray[i];
                    const [idB, posB] = nodeArray[j];
    
                    const overlapX = (CARD_WIDTH + 20) - Math.abs(posA.x - posB.x);
                    const overlapY = (CARD_HEIGHT + VERTICAL_SPACING) - Math.abs(posA.y - posB.y);
    
                    if (overlapX > 0 && overlapY > 0) {
                        changed = true;
                        // Determine push direction based on position. Push vertically.
                        const pushAmount = overlapY / 2;
                        if (posA.y < posB.y) {
                            posA.y -= pushAmount;
                            posB.y += pushAmount;
                        } else {
                            posA.y += pushAmount;
                            posB.y -= pushAmount;
                        }
                    }
                }
            }
        }
        
        if (changed) {
            setNodes(updatedNodes);
        }
        return changed;
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        const centerX = container ? container.offsetWidth / 2 - (CARD_WIDTH / 2) : 500;
        const centerY = container ? container.offsetHeight / 2 - (CARD_HEIGHT / 2) : 500;

        setNodes(new Map([[rootId, { x: centerX, y: centerY }]]));
        setEdges(new Set());
        
        const timer = setTimeout(() => setIsAutoExpanding(true), 100);
        return () => clearTimeout(timer);
    }, [rootId]);

    const handleExpandAll = useCallback(() => {
        setIsAutoExpanding(true);
    }, []);

    useEffect(() => {
        if (!isAutoExpanding) return;
    
        let madeChanges = false;
        const newNodesMap = new Map<string, { x: number; y: number }>();
        const newEdgesSet = new Set<string>();
        const nodesOnCanvas = new Set([...nodes.keys(), ...newNodesMap.keys()]);

        const nodesToScan = Array.from(nodes.entries());
    
        nodesToScan.forEach(([nodeId, pos]) => {
            const definition = allDefinitions.get(nodeId) as (Resource & Pattern & FormalizationItem);
            if (!definition) return;
    
            // Expand children
            let allChildIds: string[] = [
                ...((definition as ExerciseDefinition).linkedDeepWorkIds || []), 
                ...((definition as ExerciseDefinition).linkedUpskillIds || []),
                ...((definition as ExerciseDefinition).linkedResourceIds || []),
                ...((definition as FormalizationItem).linkedElementIds || []),
            ];
            
            if (definition.type === 'formalization_element' && definition.properties) {
                allChildIds.push(...Object.values(definition.properties).filter(val => allDefinitions.has(val)));
            }
            if ((definition as Resource).points) {
                allChildIds.push(...(definition as Resource).points!.filter(p => p.resourceId).map(p => p.resourceId!));
            }

            const childrenToLoad = allChildIds.filter(childId => allDefinitions.has(childId) && !nodesOnCanvas.has(childId));
            
            if (childrenToLoad.length > 0) {
                madeChanges = true;
                childrenToLoad.forEach((childId, index) => {
                    if (!newNodesMap.has(childId)) {
                        const x = pos.x + (index * (CARD_WIDTH + 20)) - ((childrenToLoad.length - 1) * (CARD_WIDTH + 20) / 2);
                        const y = pos.y + (CARD_HEIGHT + VERTICAL_SPACING);
                        newNodesMap.set(childId, { x, y });
                    }
                    newEdgesSet.add(`${nodeId}-${childId}`);
                });
            }
    
            // Reveal parents
            const parentIds = parentMap.get(nodeId) || [];
            const parentsToLoad = parentIds.filter(parentId => allDefinitions.has(parentId) && !nodesOnCanvas.has(parentId));
            
            if (parentsToLoad.length > 0) {
                madeChanges = true;
                parentsToLoad.forEach((parentId, index) => {
                     if (!newNodesMap.has(parentId)) {
                        const x = pos.x + (index * (CARD_WIDTH + 20)) - ((parentsToLoad.length - 1) * (CARD_WIDTH + 20) / 2);
                        const y = pos.y - (CARD_HEIGHT + VERTICAL_SPACING);
                        newNodesMap.set(parentId, { x, y });
                    }
                    newEdgesSet.add(`${parentId}-${nodeId}`);
                });
            }
        });
    
        if (madeChanges) {
            const finalNodes = new Map([...nodes, ...newNodesMap]);
            setNodes(finalNodes);
            setEdges(prev => new Set([...prev, ...newEdgesSet]));
            
            runCollisionDetection(finalNodes);
            
            const timer = setTimeout(() => setIsAutoExpanding(true), 50);
            setIsAutoExpanding(false);
            return () => clearTimeout(timer);
        } else {
            setIsAutoExpanding(false);
        }
    }, [isAutoExpanding, nodes, allDefinitions, parentMap, runCollisionDetection]);

    const handleExpandChildren = useCallback((nodeId: string) => {
        const currentNodeDef = allDefinitions.get(nodeId) as (Resource & Pattern & FormalizationItem);
        const currentNodePos = nodes.get(nodeId);
        if (!currentNodeDef || !currentNodePos) return;

        let allChildIds: string[] = [
            ...((currentNodeDef as ExerciseDefinition).linkedDeepWorkIds || []),
            ...((currentNodeDef as ExerciseDefinition).linkedUpskillIds || []),
            ...((currentNodeDef as ExerciseDefinition).linkedResourceIds || []),
            ...((currentNodeDef as FormalizationItem).linkedElementIds || []),
        ];
        if (currentNodeDef.type === 'formalization_element' && currentNodeDef.properties) {
            allChildIds.push(...Object.values(currentNodeDef.properties).filter(val => allDefinitions.has(val)));
        }
        if ((currentNodeDef as Resource).points) {
            allChildIds.push(...(currentNodeDef as Resource).points!.filter(p => p.resourceId).map(p => p.resourceId!));
        }

        const validChildIds = allChildIds.filter(id => allDefinitions.has(id));

        const nodesToUpdate = new Map<string, { x: number; y: number }>();
        const edgesToUpdate = new Set<string>();

        const isElementMindMap = allDefinitions.get(rootId)?.category === 'Formalization';

        validChildIds.forEach((childId, index) => {
            if (!nodes.has(childId)) {
                let x, y;
                if (isElementMindMap) {
                    x = currentNodePos.x + (index * (CARD_WIDTH + 20)) - ((validChildIds.length - 1) * (CARD_WIDTH + 20) / 2);
                    y = currentNodePos.y + (CARD_HEIGHT + VERTICAL_SPACING);
                } else {
                    x = currentNodePos.x + HORIZONTAL_SPACING;
                    y = currentNodePos.y + (index * (CARD_HEIGHT + VERTICAL_SPACING)) - ((validChildIds.length - 1) * (CARD_HEIGHT + VERTICAL_SPACING) / 2);
                }
                nodesToUpdate.set(childId, { x, y });
            }
            const edgeId1 = `${nodeId}-${childId}`;
            const edgeId2 = `${childId}-${nodeId}`;
            if (!edges.has(edgeId1) && !edges.has(edgeId2)) {
                edgesToUpdate.add(edgeId1);
            }
        });

        if (nodesToUpdate.size > 0) {
            const newNodes = new Map([...nodes, ...nodesToUpdate]);
            setNodes(newNodes);
            runCollisionDetection(newNodes);
        }
        if (edgesToUpdate.size > 0) {
            setEdges(prev => new Set([...prev, ...edgesToUpdate]));
        }
    }, [nodes, edges, allDefinitions, rootId, runCollisionDetection]);
  
    const handleRevealParents = useCallback((nodeId: string) => {
        const currentNodePos = nodes.get(nodeId);
        if (!currentNodePos) return;

        const potentialParents = parentMap.get(nodeId) || [];
        const parentsToLoad = potentialParents.filter(parentId => allDefinitions.has(parentId));

        const nodesToUpdate = new Map<string, { x: number; y: number }>();
        const edgesToUpdate = new Set<string>();
        const isElementMindMap = allDefinitions.get(rootId)?.category === 'Formalization';

        parentsToLoad.forEach((parentId, index) => {
            if (!nodes.has(parentId)) {
                let x, y;
                if(isElementMindMap) {
                    x = currentNodePos.x + (index * (CARD_WIDTH + 20)) - ((parentsToLoad.length - 1) * (CARD_WIDTH + 20) / 2);
                    y = currentNodePos.y - (CARD_HEIGHT + VERTICAL_SPACING);
                } else {
                    x = currentNodePos.x - HORIZONTAL_SPACING;
                    y = currentNodePos.y + (index * (CARD_HEIGHT + VERTICAL_SPACING)) - ((parentsToLoad.length - 1) * (CARD_HEIGHT + VERTICAL_SPACING) / 2);
                }
                nodesToUpdate.set(parentId, { x, y });
            }
            const edgeId1 = `${parentId}-${nodeId}`;
            const edgeId2 = `${nodeId}-${parentId}`;
            if (!edges.has(edgeId1) && !edges.has(edgeId2)) {
                edgesToUpdate.add(edgeId1);
            }
        });

        if (nodesToUpdate.size > 0) {
            const newNodes = new Map([...nodes, ...nodesToUpdate]);
            setNodes(newNodes);
            runCollisionDetection(newNodes);
        }
        if (edgesToUpdate.size > 0) {
            setEdges(prev => new Set([...prev, ...edgesToUpdate]));
        }
    }, [nodes, edges, allDefinitions, parentMap, runCollisionDetection, rootId]);
    
    const handleDragEnd = (event: DragEndEvent) => {
        setIsDragging(false);
        const { active, delta } = event;
        const scale = transformWrapperRef.current?.instance.transformState.scale || 1;
        
        const newNodes = new Map(nodes);
        const nodePos = newNodes.get(active.id as string);
        if (nodePos) {
            newNodes.set(active.id as string, { x: nodePos.x + delta.x / scale, y: nodePos.y + delta.y / scale });
        }
        
        setNodes(newNodes);
        runCollisionDetection(newNodes);
    };

    const getNodeStatus = useCallback((defId: string) => {
        const today = startOfToday();
        const todayKey = format(today, 'yyyy-MM-dd');
        let status: any = { 
            isLoggedToday: false, 
            isScheduledToday: false, 
            isPending: false, 
            isPastLogged: false,
            text: null,
            subtext: null
        };
        const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];
    
        // 1. Check for today's logs (Green Fill)
        const deepWorkLogToday = allDeepWorkLogs.find(log => log.date === todayKey)?.exercises.find(ex => ex.definitionId === defId);
        const upskillLogToday = allUpskillLogs.find(log => log.date === todayKey)?.exercises.find(ex => ex.definitionId === defId);
        const brandingLogToday = brandingLogs.find(log => log.date === todayKey)?.exercises.find(ex => ex.definitionId === defId);
        const isLoggedToday = (deepWorkLogToday?.loggedSets.length ?? 0) > 0 || (upskillLogToday?.loggedSets.length ?? 0) > 0 || (brandingLogToday?.loggedSets.length ?? 0) > 0;
    
        if (isLoggedToday) {
            const deepWorkTime = deepWorkLogToday?.loggedSets.reduce((sum, set) => sum + set.weight, 0) || 0;
            const upskillTime = upskillLogToday?.loggedSets.reduce((sum, set) => sum + set.reps, 0) || 0;
            const totalTimeToday = deepWorkTime + upskillTime;
            status.isLoggedToday = true;
            status.text = 'Completed';
            status.subtext = totalTimeToday > 0 ? `${totalTimeToday} min today` : `Today`;
            return status;
        }
    
        // 2. Check if scheduled for today (Yellow Fill)
        if (schedule[todayKey]) {
            for (const slotName of slotOrder) {
                const activity = (schedule[todayKey][slotName] || []).find(act => !act.completed && act.taskIds?.some(tid => tid.startsWith(defId)));
                if (activity) {
                    status.isScheduledToday = true;
                    status.text = 'Scheduled Today';
                    status.subtext = `in ${slotName}`;
                    return status;
                }
            }
        }
        
        // 3. Check for pending from past (Orange Fill)
        let mostRecentPendingDate: Date | null = null;
        for (const dateKey in schedule) {
            if (isBefore(parseISO(dateKey), today)) {
                const isPendingInDay = Object.values(schedule[dateKey]).flat().some(activity => 
                    !activity.completed && activity.taskIds?.some(tid => tid.startsWith(defId))
                );
                if (isPendingInDay) {
                    const scheduleDate = parseISO(dateKey);
                    if (!mostRecentPendingDate || isAfter(scheduleDate, mostRecentPendingDate)) {
                        mostRecentPendingDate = scheduleDate;
                    }
                }
            }
        }
    
        if (mostRecentPendingDate) {
            const daysAgo = differenceInDays(today, mostRecentPendingDate);
            status.isPending = true;
            status.text = 'Pending';
            status.subtext = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
            return status;
        }
    
        // 4. Check for past completions (Green Border)
        let mostRecentCompletionDate: Date | null = null;
        const allLogs = [...allDeepWorkLogs, ...allUpskillLogs, ...brandingLogs];
        for (const log of allLogs) {
            if (log.date < todayKey) {
                const hasCompleted = log.exercises.some(ex => ex.definitionId === defId && ex.loggedSets.length > 0);
                if (hasCompleted) {
                    const completionDate = parseISO(log.date);
                     if (!mostRecentCompletionDate || isAfter(completionDate, mostRecentCompletionDate)) {
                        mostRecentCompletionDate = completionDate;
                    }
                }
            }
        }
    
        if (mostRecentCompletionDate) {
            status.isPastLogged = true;
            status.text = 'Completed';
            status.subtext = format(mostRecentCompletionDate, 'MMM d, yyyy');
            return status;
        }
    
        return status;
    }, [schedule, allDeepWorkLogs, allUpskillLogs, brandingLogs]);

    const getNodeProgress = useCallback((nodeId: string) => {
        const getDescendantIds = (startNodeId: string, visited: Set<string>): string[] => {
            if (visited.has(startNodeId)) return [];
            visited.add(startNodeId);

            const nodeDef = allDefinitions.get(startNodeId);
            if (!nodeDef) return [];

            const childIds = [
                ...((nodeDef as ExerciseDefinition).linkedDeepWorkIds || []),
                ...((nodeDef as ExerciseDefinition).linkedUpskillIds || []),
            ];

            let ids = [startNodeId];
            for (const childId of childIds) {
                ids = [...ids, ...getDescendantIds(childId, visited)];
            }
            return ids;
        };
        
        const allNodeIds = getDescendantIds(nodeId, new Set());
        let totalLoggedHours = 0;
        let totalEstimatedHours = 0;

        allNodeIds.forEach(id => {
            const def = allDefinitions.get(id);
            if (def) {
                totalEstimatedHours += ((def as ExerciseDefinition).estimatedDuration || 0) / 60;
            }

            const deepWorkLog = allDeepWorkLogs.flatMap(log => log.exercises).filter(ex => ex.definitionId === id);
            totalLoggedHours += deepWorkLog.reduce((sum, ex) => sum + ex.loggedSets.reduce((setSum, set) => setSum + (set.weight || 0), 0), 0) / 60;
            
            const upskillLog = allUpskillLogs.flatMap(log => log.exercises).filter(ex => ex.definitionId === id);
            totalLoggedHours += upskillLog.reduce((sum, ex) => sum + ex.loggedSets.reduce((setSum, set) => setSum + (set.reps || 0), 0), 0) / 60;
        });

        return { loggedHours: totalLoggedHours, estimatedHours: totalEstimatedHours };
    }, [allDefinitions, allDeepWorkLogs, allUpskillLogs]);
    
    const getPath = (sourcePos: {x:number, y:number}, targetPos: {x:number, y:number}) => {
        const startX = sourcePos.x + CARD_WIDTH / 2;
        const startY = sourcePos.y + CARD_HEIGHT;
        const endX = targetPos.x + CARD_WIDTH / 2;
        const endY = targetPos.y;
        
        const dx = endX - startX;
        const dy = endY - startY;
        
        const controlY1 = startY + dy / 2;
        const controlY2 = endY - dy / 2;
        
        return `M ${startX},${startY} C ${startX},${controlY1} ${endX},${controlY2} ${endX},${endY}`;
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
            <DndContext sensors={sensors} onDragStart={() => setIsDragging(true)} onDragEnd={handleDragEnd}>
                <TransformWrapper ref={transformWrapperRef} initialScale={0.7} panning={{disabled: true}}>
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
                            const definition = allDefinitions.get(nodeId) as (ExerciseDefinition & Resource & Pattern & MetaRule & FormalizationItem);
                            if (!definition) return null;
                            
                            let allChildIds: string[] = [];
                            if (definition) {
                                allChildIds = [
                                    ...((definition as ExerciseDefinition).linkedDeepWorkIds || []),
                                    ...((definition as ExerciseDefinition).linkedUpskillIds || []),
                                    ...((definition as Resource).points || []).filter(p => p.resourceId).map(p => p.resourceId!),
                                    ...((definition as FormalizationItem).linkedElementIds || []),
                                ];

                                if (definition.type === 'formalization_element' && definition.properties) {
                                    allChildIds.push(...Object.values(definition.properties).filter(val => allDefinitions.has(val)));
                                }
                            }

                            const hasUnloadedChild = allChildIds.some(childId => allDefinitions.has(childId) && !nodes.has(childId));
                            const hasUnlinkedChild = allChildIds.some(childId => allDefinitions.has(childId) && nodes.has(childId) && !Array.from(edges).some(edgeId => edgeId === `${nodeId}-${childId}` || edgeId === `${childId}-${nodeId}`));
                            const canExpandChildren = hasUnloadedChild || hasUnlinkedChild;
                            
                            const potentialParents = parentMap.get(nodeId) || [];
                            const hasUnloadedParent = potentialParents.some(parentId => allDefinitions.has(parentId) && !nodes.has(parentId));
                            const hasUnlinkedParent = potentialParents.some(parentId => allDefinitions.has(parentId) && nodes.has(parentId) && !Array.from(edges).some(edgeId => edgeId === `${parentId}-${nodeId}` || edgeId === `${nodeId}-${parentId}`));
                            const canRevealParents = hasUnloadedParent || hasUnlinkedParent;

                            const isRootNode = !(parentMap.get(nodeId) || []).some(parentId => nodes.has(parentId));

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
                                    onExpandAll={handleExpandAll}
                                    isRootNode={isRootNode}
                                    status={getNodeStatus(nodeId)}
                                    progress={getNodeProgress(nodeId)}
                                    openGeneralPopup={openGeneralPopup}
                                />
                            );
                        })}
                    </TransformComponent>
                </TransformWrapper>
            </DndContext>
        </div>
    );
};

const PositionedNode = ({ nodeId, pos, definition, onExpandChildren, onRevealParents, canExpandChildren, canRevealParents, onExpandAll, isRootNode, status, progress, openGeneralPopup }: any) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: nodeId });
    const { upskillDefinitions } = useAuth();
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    
    const { loggedHours = 0, estimatedHours = 0 } = progress || {};
    const showProgress = estimatedHours > 0;
    
    let nodeType = definition.type || 'unknown';

    if (definition.category === 'Formalization') {
        if (definition.type === 'formalization_element') nodeType = 'Element';
        else if (definition.type === 'component') nodeType = 'Component';
        else if (definition.type === 'operation') nodeType = 'Operation';
        else if (definition.type === 'property') nodeType = 'Property';
    } else if (definition.category === 'Content Bundle') {
        nodeType = 'Content Bundle';
    } else if (definition.type === 'meta-rule') {
        nodeType = 'Meta-Rule';
    }


    const getIcon = () => {
        switch (nodeType) {
            case 'Intention': return <Lightbulb className="h-4 w-4 text-amber-500" />;
            case 'Action': return <Bolt className="h-4 w-4 text-blue-500" />;
            case 'Curiosity': return <Flashlight className="h-4 w-4 text-amber-500" />;
            case 'Visualization': return <Frame className="h-4 w-4 text-blue-500" />;
            case 'Objective': return <Flag className="h-4 w-4 text-green-500" />;
            case 'Standalone': return <Focus className="h-4 w-4 text-purple-500" />;
            case 'card': case 'link': case 'Resource': return <Library className="h-4 w-4 text-indigo-500" />;
            case 'Component': return <Blocks className="h-4 w-4 text-teal-500" />;
            case 'Operation': return <Workflow className="h-4 w-4 text-pink-500"/>;
            case 'Property': return <GitBranch className="h-4 w-4 text-gray-500"/>;
            case 'Element': return <Database className="h-4 w-4 text-cyan-500"/>;
            case 'Meta-Rule': return <Workflow className="h-4 w-4 text-rose-500" />;
            case 'Content Bundle': return <Share2 className="h-4 w-4 text-fuchsia-500" />;
            default: return <Briefcase className="h-4 w-4" />;
        }
    };
    
    const isUpskillNode = upskillDefinitions.some((d: any) => d.id === definition.id);

    return (
        <motion.div
            ref={setNodeRef}
            style={{ ...style, position: 'absolute', left: pos.x, top: pos.y, willChange: 'transform' }}
            className="w-48 z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => openGeneralPopup(definition.id, e)}
        >
            <Card className={cn(
                "shadow-lg hover:shadow-xl transition-shadow border-l-4",
                status.isLoggedToday && "bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-400",
                status.isScheduledToday && "dark:bg-transparent border-yellow-500 dark:border-yellow-400",
                status.isPending && "dark:bg-transparent border-orange-400 dark:border-orange-500",
                status.isPastLogged && !status.isLoggedToday && "border-green-400",
                !status.isLoggedToday && !status.isScheduledToday && !status.isPending && !status.isPastLogged && "border-transparent"
            )}>
                <div className="p-2 cursor-grab" {...listeners} {...attributes}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            {getIcon()}
                             <div className="flex-grow min-w-0">
                                <p className="font-semibold text-xs text-foreground truncate" title={definition.name}>
                                    {definition.name}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                    {nodeType}
                                </p>
                            </div>
                        </div>
                    </div>
                     {status.text && (
                        <div className="mt-1.5 text-xs">
                            <p className="font-semibold text-foreground">{status.text}</p>
                            <p className="text-muted-foreground">{status.subtext}</p>
                        </div>
                    )}
                </div>
                {showProgress && (
                  <CardFooter className="p-2 pt-0">
                    <div className="w-full">
                      <Progress value={(loggedHours / estimatedHours) * 100} className="h-1" />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                        <span>{loggedHours.toFixed(1)}h</span>
                        <span>{estimatedHours.toFixed(1)}h</span>
                      </div>
                    </div>
                  </CardFooter>
                )}
                
                <CardContent className="p-2 border-t flex justify-end gap-1">
                    {isRootNode && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onExpandAll(); }}>
                            <Expand className="h-4 w-4 text-purple-500" />
                        </Button>
                    )}
                    {canExpandChildren && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onExpandChildren(); }}>
                            <GitBranch className="h-4 w-4 text-green-500" />
                        </Button>
                    )}
                    {canRevealParents && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onRevealParents(); }}>
                            <GitMerge className="h-4 w-4 text-amber-500" />
                        </Button>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};


// Main Component
export function MindMapViewer({ defaultView, showControls = true, rootId = null }: MindMapViewerProps) {
  const { toast, openIntentionPopup } = useAuth();
  const { 
      deepWorkDefinitions, upskillDefinitions, productizationPlans, offerizationPlans, schedule, allUpskillLogs, allDeepWorkLogs, brandingLogs, scheduleTaskFromMindMap, addFeatureToRelease, setDeepWorkDefinitions, resources, resourceFolders,
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
    } else if (!rootId) {
        setSelectedTopic('Strategic Overview');
    }
  }, [defaultView, rootId]);
  
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
    const productAndServiceTopics = [...Object.keys(productizationPlans || {}), ...Object.keys(offerizationPlans || {})].sort();
    const hasBundles = deepWorkDefinitions.some(def => def.focusAreaIds && def.focusAreaIds.length > 0);
    const hasResources = resourceFolders.length > 0;
    
    const availableTopics = [];
    if (hasBundles) availableTopics.push("Content Bundles");
    if (hasResources) availableTopics.push("Resources");
    availableTopics.push(...productAndServiceTopics);
    
    return ["Strategic Overview", "Conceptual Flow", ...new Set(availableTopics)].sort();
  }, [productizationPlans, offerizationPlans, deepWorkDefinitions, resourceFolders]);
  
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
      const linkedResourceChildren = (def.linkedResourceIds || []).map(id => resources.find(r => r.id === id)).filter((r): r is Resource => !!r).map(r => getNode(r, r.type || 'link', [], { name: r.name }));
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

    if (rootId) {
        const rootDef = deepWorkDefinitions.find(d => d.id === rootId) || upskillDefinitions.find(d => d.id === rootId) || resources.find(r => r.id === rootId);
        if (rootDef) {
            const rootNode = buildDeepWorkTree(rootId) || buildUpskillTree(rootId) || getNode(rootDef, rootDef.type || 'Resource', []);
            if (rootNode) {
                return {id: 'root-wrapper', name: 'Root', category: 'System', children: [rootNode]};
            }
        }
    }
    
    if (!selectedTopic) return null;
    if (selectedTopic === 'Conceptual Flow') return null; // Handled separately

    if (selectedTopic === 'Resources') {
        const buildFolderTree = (parentId: string | null): MindMapNode[] => {
            return resourceFolders.filter(f => f.parentId === parentId).sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(folder => {
                const childrenResources = resources.filter(r => r.folderId === folder.id).sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(r => getNode(r, r.type || 'link', [], { name: r.name }));
                const childrenFolders = buildFolderTree(folder.id);
                return getNode(folder, 'Folder', [...childrenFolders, ...childrenResources]);
            });
        };
        return { id: 'resources-root', name: 'Resource Library', category: 'System', children: buildFolderTree(null) };
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

  }, [selectedTopic, rootId, deepWorkDefinitions, upskillDefinitions, productizationPlans, offerizationPlans, totalTimePerFocusArea, resources, resourceFolders]);

  const scheduledTaskInfo = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const scheduled = new Set<string>();
    const activities = Object.values(schedule[today] || {}).flat();
    
    activities.forEach(activity => {
      let logsSource: DatedWorkout[] | undefined;
      let defSource: ExerciseDefinition[] | undefined;
      
      if (activity.type === 'upskill') {
        logsSource = allUpskillLogs;
        defSource = upskillDefinitions;
      } else if (activity.type === 'deepwork') {
        logsSource = allDeepWorkLogs;
        defSource = deepWorkDefinitions;
      } else if (activity.type === 'branding') {
        logsSource = brandingLogs;
        defSource = deepWorkDefinitions.filter(def => Array.isArray(def.focusAreaIds));
      }

      if (logsSource && defSource) {
        const log = logsSource.find(l => l.date === today);
        (activity.taskIds || []).forEach(taskId => {
          const task = log?.exercises.find(t => t.id === taskId);
          if (task) scheduled.add(task.definitionId);
        });
      }
    });
    return scheduled;
  }, [schedule, allUpskillLogs, allDeepWorkLogs, brandingLogs, upskillDefinitions, deepWorkDefinitions]);

  const loggedTaskInfo = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const logged = new Set<string>();
    
    const processLogs = (logs: DatedWorkout[]) => {
      const logToday = logs.find(log => log.date === today);
      if (logToday) {
        logToday.exercises.forEach(ex => {
          if (ex.loggedSets.length > 0) logged.add(ex.definitionId);
        });
      }
    };
    
    processLogs(allUpskillLogs);
    processLogs(allDeepWorkLogs);
    processLogs(brandingLogs);
    return logged;
  }, [allUpskillLogs, allDeepWorkLogs, brandingLogs]);
  
  const pendingTaskInfo = useMemo(() => {
      const pending = new Set<string>();
      const today = startOfToday();
      Object.keys(schedule).forEach(dateKey => {
          const scheduleDate = parseISO(dateKey);
          if (isBefore(scheduleDate, today)) {
              Object.values(schedule[dateKey]).flat().forEach(activity => {
                  if (!activity.completed && activity.taskIds) {
                      activity.taskIds.forEach(taskId => {
                        let defId: string | undefined;
                        if(activity.type === 'upskill') defId = allUpskillLogs.flatMap(l => l.exercises).find(t => t.id === taskId)?.definitionId;
                        else if (activity.type === 'deepwork') defId = allDeepWorkLogs.flatMap(l => l.exercises).find(t => t.id === taskId)?.definitionId;
                        else if (activity.type === 'branding') defId = brandingLogs.flatMap(l => l.exercises).find(t => t.id === taskId)?.definitionId;
                        if(defId) pending.add(defId);
                      });
                  }
              });
          }
      });
      return pending;
  }, [schedule, allUpskillLogs, allDeepWorkLogs, brandingLogs]);

  const pastLoggedTaskInfo = useMemo(() => {
    const pastLogged = new Set<string>();
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const processLogs = (logs: DatedWorkout[]) => {
      logs.forEach(log => {
        if (log.date < today) {
          log.exercises.forEach(ex => {
            if (ex.loggedSets.length > 0) pastLogged.add(ex.definitionId);
          });
        }
      });
    };

    processLogs(allUpskillLogs);
    processLogs(allDeepWorkLogs);
    processLogs(brandingLogs);
    return pastLogged;
  }, [allUpskillLogs, allDeepWorkLogs, brandingLogs]);
  
  const handleSaveNewFeature = () => {
    if (inlineAddInfo) {
      addFeatureToRelease(mindMapData!.children[0].children.find(r => r.id === inlineAddInfo.parentReleaseId)!, mindMapData!.topic!, inlineAddInfo.newFeatureName, mindMapData!.type!);
      setInlineAddInfo(null);
    }
  };

  const handleOpenLinkLearningPopover = (node: MindMapNode) => {
    setIsLinkLearningPopoverOpen(true);
    setLinkingLearningToFocusArea(node);
    setEditableLinkedUpskillIds(node.linkedUpskillIds || []);
  };
  
  const handleToggleUpskillLink = (upskillId: string) => {
    setEditableLinkedUpskillIds(prev =>
      prev.includes(upskillId)
        ? prev.filter(id => id !== id)
        : [...prev, upskillId]
    );
  };

  const handleSaveLinkedLearning = () => {
    if (!linkingLearningToFocusArea || !setDeepWorkDefinitions) return;
    
    setDeepWorkDefinitions(prevDefs => 
      prevDefs.map(def => 
        def.id === linkingLearningToFocusArea.id 
          ? { ...def, linkedUpskillIds: editableLinkedUpskillIds } 
          : def
      )
    );
    
    toast({ title: "Links updated", description: "Learning tasks have been linked." });
    setIsLinkLearningPopoverOpen(false);
    setLinkingLearningToFocusArea(null);
  };
  
  const loggedUpskillDefinitions = useMemo(() => {
    const ids = new Set<string>();
    allUpskillLogs.forEach(log => {
        log.exercises.forEach(ex => {
            if(ex.loggedSets.length > 0) ids.add(ex.definitionId);
        });
    });
    return Array.from(ids).map(id => upskillDefinitions.find(d => d.id === id)).filter(Boolean);
  }, [allUpskillLogs, upskillDefinitions]);

  const getDescendantIds = useCallback((node: MindMapNode): string[] => {
    let ids = [node.id];
    for (const child of node.children) {
      ids = [...ids, ...getDescendantIds(child)];
    }
    return ids;
  }, []);

  const handleNodeMouseEnter = useCallback((node: MindMapNode) => {
    const descendantIds = new Set(getDescendantIds(node));
    setHoveredNodeIds(descendantIds);
  }, [getDescendantIds]);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeIds(new Set());
  }, []);
  
  const renderNode = (node: MindMapNode, level: number, parentNode?: MindMapNode) => {
    const isNodeCollapsed = collapsedNodes.has(node.id);
    const isHighlighted = hoveredNodeIds.has(node.id);
    const linkedDeepWorkChildIds = new Set<string>((deepWorkDefinitions || []).flatMap(def => def.linkedDeepWorkIds || []));
    const linkedUpskillChildIds = new Set<string>((upskillDefinitions || []).flatMap(def => def.linkedUpskillIds || []));

    const getIcon = () => {
        if (node.category === 'Learning Task') {
            const isParent = (node.linkedUpskillIds?.length ?? 0) > 0 || (node.linkedResourceIds?.length ?? 0) > 0;
            const isChild = linkedUpskillChildIds.has(node.id);
            if (isParent && !isChild) return <Flashlight className="h-4 w-4 text-amber-500" />; // Curiosity
            if (isParent && isChild) return <Flag className="h-4 w-4 text-green-500" />; // Objective
            if (isParent && isChild) return <Frame className="h-4 w-4 text-blue-500" />; // Visualization
            return <Focus className="h-4 w-4 text-purple-500" />; // Standalone
        }
        if (node.category === 'Release') return <Calendar className="h-4 w-4" />;
        if (node.category === 'product' || node.category === 'service') return <Package className="h-4 w-4" />;
        if (node.category === 'System') return <GitMerge className="h-4 w-4" />;
        if (node.category === 'System Branch') return <Rocket className="h-4 w-4" />;
        if (node.category === 'Social') {
            if (node.name === 'X/Twitter') return <TwitterIcon className="h-4 w-4" />;
            if (node.name === 'LinkedIn') return <Linkedin className="h-4 w-4" />;
            if (node.name === 'Dev.to') return <DevToIcon className="h-4 w-4" />;
        }
        if (node.category === 'Content Bundle') return <Share2 className="h-4 w-4" />;
        if (node.category === 'Branding') return <Share2 className="h-4 w-4" />;
        if (node.type === 'link') return <Globe className="h-4 w-4" />;
        if (node.type === 'card' || node.category === 'Resource') return <Library className="h-4 w-4" />;
        if (node.category === 'Folder') return <Folder className="h-4 w-4" />;
        if (node.category === 'FocusArea') {
            const isParent = (node.linkedDeepWorkIds?.length ?? 0) > 0 || (node.linkedUpskillIds?.length ?? 0) > 0 || (node.linkedResourceIds?.length ?? 0) > 0;
            const isChild = linkedDeepWorkChildIds.has(node.id);
            if (isParent && !isChild) return <Lightbulb className="h-4 w-4 text-amber-500" />; // Intention
            if (isParent && isChild) return <Flag className="h-4 w-4 text-green-500" />; // Objective
            if (isParent && isChild) return <Bolt className="h-4 w-4 text-blue-500" />; // Action
            return <Focus className="h-4 w-4 text-purple-500" />; // Standalone
        }
        return <Briefcase className="h-4 w-4" />;
    };
    
    const nodeStatus = {
        isScheduled: scheduledTaskInfo.has(node.definitionId!),
        isLogged: loggedTaskInfo.has(node.definitionId!),
        isPending: pendingTaskInfo.has(node.definitionId!),
        isPastLogged: pastLoggedTaskInfo.has(node.definitionId!),
    };
    const nodeClass = cn(
        "p-2 rounded-md shadow-md transition-all duration-300 relative border-l-4",
        isHighlighted ? 'bg-primary/10' : 'bg-card',
        nodeStatus.isLogged ? "bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-400" :
        nodeStatus.isScheduled ? "dark:bg-transparent border-yellow-500 dark:border-yellow-400" :
        nodeStatus.isPending ? "dark:bg-transparent border-orange-400 dark:border-orange-500" :
        nodeStatus.isPastLogged ? "border-green-400" :
        "border-transparent"
    );

    const isExpandable = node.children.length > 0 || (inlineAddInfo && inlineAddInfo.parentReleaseId === node.id);
    
    const handleClick = (e: React.MouseEvent) => {
        if (node.category === 'FocusArea') {
            openIntentionPopup(node.id);
        }
    }
    const isUpskillNode = upskillDefinitions.some(d => d.id === node.definitionId);
    const hasFooterActions = node.category !== 'Social' && node.type !== 'link' && node.type !== 'card' && node.category !== 'Folder' && !getIcon().props.className?.includes('lucide');

    
    return (
        <div key={node.id} className="flex items-center" onMouseEnter={() => handleNodeMouseEnter(node)} onMouseLeave={handleNodeMouseLeave}>
            <div className="flex flex-col items-center">
                <div className={nodeClass} onClick={handleClick}>
                    <div className="flex items-center gap-2">
                        {isExpandable && (
                            <button onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }} className="p-1 rounded-full hover:bg-muted -ml-1">
                                {isNodeCollapsed ? <PlusCircle className="h-4 w-4" /> : <MinusCircle className="h-4 w-4" />}
                            </button>
                        )}
                        <span className="text-primary">{getIcon()}</span>
                        <div className='flex flex-col text-left'>
                            <span className="font-semibold text-sm text-foreground truncate">{node.name}</span>
                             {node.category !== 'product' && node.category !== 'service' && node.category !== 'System' && node.category !== 'System Branch' && node.category !== 'Release' && node.category !== 'Content Bundle' && node.category !== 'Social' && node.category !== 'Folder' && node.type !== 'card' && node.type !== 'link' && (
                                <span className="text-xs text-muted-foreground capitalize">{isUpskillNode ? "Learning" : "Deep Work"}</span>
                            )}
                        </div>
                    </div>
                </div>
                {!isNodeCollapsed && node.children.length > 0 && <div className="h-4 w-px bg-border" />}
            </div>
            {!isNodeCollapsed && node.children.length > 0 && (
                <div className="pl-6 flex flex-col justify-center">
                    {node.children.map((child, index) => (
                        <div key={child.id} className="flex items-center relative">
                            <div className="w-6 h-px bg-border absolute left-0" />
                            {index > 0 && <div className="h-full w-px bg-border absolute left-0 -top-1/2" />}
                            {index < node.children.length - 1 && <div className="h-full w-px bg-border absolute left-0 top-1/2" />}
                            <div className="pl-6">{renderNode(child, level + 1, node)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
  };

  if (rootId) {
    return <InteractiveFocusAreaMap rootId={rootId} />;
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-full flex flex-col">
        {showControls && (
          <Card className="mb-6 flex-shrink-0">
            <CardHeader>
              <CardTitle>Mind Map</CardTitle>
              <CardDescription>Select a topic to generate its mind map. Use the controls to navigate.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                    <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Select a Topic or View..." />
                    </SelectTrigger>
                    <SelectContent>
                        {allTopics.map(topic => (
                            <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => transformWrapperRef.current?.zoomIn()}><ZoomIn className="mr-2 h-4 w-4"/>Zoom In</Button>
                    <Button variant="outline" onClick={() => transformWrapperRef.current?.zoomOut()}><ZoomOut className="mr-2 h-4 w-4"/>Zoom Out</Button>
                    <Button variant="outline" onClick={() => transformWrapperRef.current?.resetTransform()}><RefreshCw className="mr-2 h-4 w-4"/>Reset</Button>
                  </div>
              </div>
            </CardContent>
          </Card>
        )}
        <div className="flex-grow rounded-lg border bg-muted/30 relative overflow-hidden">
          <TransformWrapper ref={transformWrapperRef} minScale={0.1} initialScale={0.8} wheel={{ step: 0.1 }}>
            {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
              <>
                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                  {selectedTopic === 'Conceptual Flow' ? (
                    <ConceptualFlowDiagram />
                  ) : mindMapData ? (
                    <div className="flex justify-center items-center min-w-full min-h-full">
                        {renderNode(mindMapData, 0)}
                    </div>
                  ) : selectedTopic ? (
                     <div className="w-full h-full flex items-center justify-center">
                        <p className="text-muted-foreground">No data for this topic. Add some releases or focus areas to get started.</p>
                     </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-muted-foreground">Select a view to get started</p>
                    </div>
                  )}
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>
      </div>
      <Dialog open={isLinkLearningPopoverOpen} onOpenChange={setIsLinkLearningPopoverOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Learning to "{linkingLearningToFocusArea?.name}"</DialogTitle>
              <DialogDescription>Select the upskill tasks that directly support this focus area.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96 my-4">
              <div className="space-y-2 pr-4">
                {loggedUpskillDefinitions.map(def => (
                  <div key={def.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`link-upskill-${def.id}`}
                      checked={editableLinkedUpskillIds.includes(def.id)}
                      onCheckedChange={() => handleToggleUpskillLink(def.id)}
                    />
                    <Label htmlFor={`link-upskill-${def.id}`} className="font-normal w-full cursor-pointer">
                      {def.name} <span className="text-muted-foreground text-xs">({def.category})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsLinkLearningPopoverOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveLinkedLearning}>Save Links</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
