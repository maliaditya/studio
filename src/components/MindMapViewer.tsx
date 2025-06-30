
"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { GitBranch, BookCopy, GitMerge, ZoomIn, ZoomOut, Expand, Shrink, RefreshCw, Briefcase, Share2, Package, Globe, ArrowRight, ArrowLeft, Linkedin, Youtube, Rocket, Workflow, Calendar, Check, AlertTriangle, ArrowDown, HeartPulse, LayoutDashboard, Magnet, Activity as ActivityIcon, PlusCircle, Link as LinkIcon, Save } from 'lucide-react';
import type { ExerciseDefinition, Release, DatedWorkout, ActivityType as ActivityTypeType } from '@/types/workout'; // Renaming imported ActivityType to avoid conflict with lucide-react
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
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


interface MindMapNode extends Partial<ExerciseDefinition>, Partial<Release> {
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
}

const Controls = () => {
  useEffect(() => {
    // Re-center logic is removed as per user request.
  }, []);
  return null;
};
  

export function MindMapViewer({ defaultView, showControls = true }: MindMapViewerProps) {
  const { toast } = useToast();
  const { 
      deepWorkDefinitions, 
      upskillDefinitions, 
      deepWorkTopicMetadata, 
      productizationPlans, 
      offerizationPlans, 
      schedule,
      allUpskillLogs,
      allDeepWorkLogs,
      brandingLogs,
      scheduleTaskFromMindMap,
      addFeatureToRelease,
      setDeepWorkDefinitions,
  } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const timeSlots = [ 'Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night' ];

  // Modal State for linking learning tasks
  const [selectedFocusArea, setSelectedFocusArea] = useState<ExerciseDefinition | null>(null);
  const [isLinkLearningModalOpen, setIsLinkLearningModalOpen] = useState(false);
  const [editableLinkedUpskillIds, setEditableLinkedUpskillIds] = useState<string[]>([]);

  // State for inline adding
  const [inlineAddInfo, setInlineAddInfo] = useState<{ parentReleaseId: string; newFeatureName: string } | null>(null);


  useEffect(() => {
    if (defaultView) {
        setSelectedTopic(defaultView);
    } else {
        setSelectedTopic(showControls ? '' : 'Strategic Overview');
    }
  }, [defaultView, showControls]);
  
  const scheduledTaskInfo = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const todaysActivities = schedule[todayKey];
    const infoMap = new Map<string, { slot: string; type: ActivityTypeType }[]>();

    if (!todaysActivities) return infoMap;

    const instanceIdToDefIdMap = new Map<string, string>();
    const logs = [...allUpskillLogs, ...allDeepWorkLogs, ...brandingLogs];
    const todayLogs = logs.filter(log => log.date === todayKey);

    todayLogs.forEach(log => {
        (log.exercises || []).forEach(ex => {
            if (ex.id && ex.definitionId) {
                instanceIdToDefIdMap.set(ex.id, ex.definitionId);
            }
        });
    });

    Object.entries(todaysActivities).forEach(([slotName, activities]) => {
      (activities || []).forEach(activity => {
        (activity.taskIds || []).forEach(instanceId => {
          const defId = instanceIdToDefIdMap.get(instanceId);
          if (!defId) return;

          const addInfo = (definitionId: string, activityType: ActivityTypeType) => {
              if (!infoMap.has(definitionId)) {
                  infoMap.set(definitionId, []);
              }
              const existingEntries = infoMap.get(definitionId)!;
              if (!existingEntries.some(e => e.type === activityType)) {
                  existingEntries.push({ slot: slotName, type: activityType });
              }
          };
          
          if (activity.type === 'branding') {
              const bundleDef = deepWorkDefinitions.find(d => d.id === defId);
              if (bundleDef?.focusAreaIds) {
                  bundleDef.focusAreaIds.forEach(focusAreaDefId => {
                      addInfo(focusAreaDefId, 'branding');
                  });
              }
          } else {
              addInfo(defId, activity.type);
          }
        });
      });
    });

    return infoMap;
  }, [schedule, allUpskillLogs, allDeepWorkLogs, brandingLogs, deepWorkDefinitions]);
  
  const loggedTaskInfo = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const infoMap = new Map<string, { type: ActivityTypeType; totalTime: number }[]>();

    const processLogs = (logs: DatedWorkout[], activityType: ActivityTypeType, timeField: 'reps' | 'weight') => {
      const todayLog = (logs || []).find(log => log.date === todayKey);
      if (todayLog) {
        todayLog.exercises.forEach(ex => {
          const loggedTime = ex.loggedSets.reduce((sum, set) => sum + set[timeField], 0);
          if (loggedTime > 0) {
            if (!infoMap.has(ex.definitionId)) {
              infoMap.set(ex.definitionId, []);
            }
            const entries = infoMap.get(ex.definitionId)!;
            const existingEntry = entries.find(e => e.type === activityType);
            if (existingEntry) {
              existingEntry.totalTime += loggedTime;
            } else {
              entries.push({ type: activityType, totalTime: loggedTime });
            }
          }
        });
      }
    };
    
    const processBrandingLogs = () => {
        const todayLog = (brandingLogs || []).find(log => log.date === todayKey);
        if (todayLog) {
            todayLog.exercises.forEach(bundleExercise => {
                if (bundleExercise.loggedSets.length > 0) {
                    const bundleDef = deepWorkDefinitions.find(d => d.id === bundleExercise.definitionId);
                    if (bundleDef?.focusAreaIds) {
                        bundleDef.focusAreaIds.forEach(focusAreaDefId => {
                            if (!infoMap.has(focusAreaDefId)) {
                                infoMap.set(focusAreaDefId, []);
                            }
                            const entries = infoMap.get(focusAreaDefId)!;
                            const existingEntry = entries.find(e => e.type === 'branding');
                            if (!existingEntry) {
                                entries.push({ type: 'branding', totalTime: 1 });
                            }
                        });
                    }
                }
            });
        }
    };

    processLogs(allUpskillLogs, 'upskill', 'reps');
    processLogs(allDeepWorkLogs, 'deepwork', 'weight');
    processBrandingLogs();

    return infoMap;
  }, [allUpskillLogs, allDeepWorkLogs, brandingLogs, deepWorkDefinitions]);

  const pendingTaskInfo = useMemo(() => {
    const pendingInfo = new Map<string, { oldestDate: string; type: ActivityTypeType }[]>();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const instanceIdToDefIdMap = new Map<string, string>();
    [...allUpskillLogs, ...allDeepWorkLogs, ...brandingLogs].forEach(log => {
        (log.exercises || []).forEach(ex => {
            if (ex.id && ex.definitionId) {
              instanceIdToDefIdMap.set(ex.id, ex.definitionId);
            }
        });
    });

    Object.keys(schedule).forEach(dateKey => {
        if (dateKey < todayStr) {
            const dailySchedule = schedule[dateKey];
            Object.values(dailySchedule).forEach(activities => {
                (activities || []).forEach(activity => {
                    if (!activity.completed && activity.taskIds && activity.taskIds.length > 0) {
                        activity.taskIds.forEach(taskId => {
                            const defId = instanceIdToDefIdMap.get(taskId);
                            if (!defId) return;

                            const addInfo = (definitionId: string, activityType: ActivityTypeType) => {
                                if (!pendingInfo.has(definitionId)) {
                                    pendingInfo.set(definitionId, []);
                                }
                                const entries = pendingInfo.get(definitionId)!;
                                const existingEntry = entries.find(e => e.type === activityType);
                                if (!existingEntry || dateKey < existingEntry.oldestDate) {
                                    const newEntries = entries.filter(e => e.type !== activityType);
                                    newEntries.push({ oldestDate: dateKey, type: activityType });
                                    pendingInfo.set(definitionId, newEntries);
                                }
                            };

                            if (activity.type === 'branding') {
                                const bundleDef = deepWorkDefinitions.find(d => d.id === defId);
                                if (bundleDef?.focusAreaIds) {
                                    bundleDef.focusAreaIds.forEach(focusAreaDefId => {
                                        addInfo(focusAreaDefId, 'branding');
                                    });
                                }
                            } else {
                                addInfo(defId, activity.type);
                            }
                        });
                    }
                });
            });
        }
    });
    return pendingInfo;
  }, [schedule, allUpskillLogs, allDeepWorkLogs, brandingLogs, deepWorkDefinitions]);

  const pastLoggedTaskInfo = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const infoMap = new Map<string, { type: ActivityTypeType; lastLogDate: string; totalTime: number }[]>();

    const processLogs = (logs: DatedWorkout[], activityType: ActivityTypeType, timeField: 'reps' | 'weight') => {
        (logs || []).forEach(log => {
            if (log.date < todayStr) {
                (log.exercises || []).forEach(ex => {
                    const loggedTime = ex.loggedSets.reduce((sum, set) => sum + set[timeField], 0);
                    if (loggedTime > 0) {
                        if (!infoMap.has(ex.definitionId)) {
                            infoMap.set(ex.definitionId, []);
                        }
                        const entries = infoMap.get(ex.definitionId)!;
                        const existingEntry = entries.find(e => e.type === activityType);
                        if (!existingEntry || log.date > existingEntry.lastLogDate) {
                            const newEntries = entries.filter(e => e.type !== activityType);
                            newEntries.push({ type: activityType, lastLogDate: log.date, totalTime: loggedTime });
                            infoMap.set(ex.definitionId, newEntries);
                        }
                    }
                });
            }
        });
    };

    const processBrandingLogs = () => {
        (brandingLogs || []).forEach(log => {
            if (log.date < todayStr) {
                log.exercises.forEach(bundleExercise => {
                    if (bundleExercise.loggedSets.length > 0) {
                        const bundleDef = deepWorkDefinitions.find(d => d.id === bundleExercise.definitionId);
                        if (bundleDef?.focusAreaIds) {
                            bundleDef.focusAreaIds.forEach(focusAreaDefId => {
                                if (!infoMap.has(focusAreaDefId)) {
                                    infoMap.set(focusAreaDefId, []);
                                }
                                const entries = infoMap.get(focusAreaDefId)!;
                                const existingEntry = entries.find(e => e.type === 'branding');
                                if (!existingEntry || log.date > existingEntry.lastLogDate) {
                                    const newEntries = entries.filter(e => e.type !== 'branding');
                                    newEntries.push({ type: 'branding', lastLogDate: log.date, totalTime: 1 });
                                    infoMap.set(focusAreaDefId, newEntries);
                                }
                            });
                        }
                    }
                });
            }
        });
    };
    
    processLogs(allUpskillLogs, 'upskill', 'reps');
    processLogs(allDeepWorkLogs, 'deepwork', 'weight');
    processBrandingLogs();

    return infoMap;
  }, [allUpskillLogs, allDeepWorkLogs, brandingLogs, deepWorkDefinitions]);
  
  const totalTimePerFocusArea = useMemo(() => {
    const timeMap = new Map<string, number>();
    allDeepWorkLogs.forEach(log => {
        log.exercises.forEach(ex => {
            const duration = ex.loggedSets.reduce((sum, set) => sum + set.weight, 0);
            if (duration > 0) {
                timeMap.set(ex.definitionId, (timeMap.get(ex.definitionId) || 0) + duration);
            }
        });
    });
    return timeMap;
  }, [allDeepWorkLogs]);


  const toggleFullScreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  const allTopics = useMemo(() => {
    const productAndServiceTopics = Object.keys(deepWorkTopicMetadata).sort();
    const hasBundles = deepWorkDefinitions.some(def => Array.isArray(def.focusAreaIds));
    
    const availableTopics = [];
    if (hasBundles) {
      availableTopics.push("Content Bundles");
    }
    availableTopics.push(...productAndServiceTopics);
    
    return ["Strategic Overview", ...availableTopics.sort()];
  }, [deepWorkTopicMetadata, deepWorkDefinitions]);

  const mindMapData = useMemo((): MindMapNode | null => {
    if (!selectedTopic) return null;

    const createFocusAreaNode = (focusAreaDef: ExerciseDefinition, parentId: string): MindMapNode => {
        const linkedLearningTasks = (focusAreaDef.linkedUpskillIds || [])
            .map(id => upskillDefinitions.find(ud => ud.id === id))
            .filter((task): task is ExerciseDefinition => !!task)
            .map(task => ({ 
                ...task, 
                definitionId: task.id,
                id: `${task.id}-from-${focusAreaDef.id}-in-${parentId}`, 
                category: 'Learning Task', 
                children: [] 
            }));
        return { 
            ...focusAreaDef, 
            definitionId: focusAreaDef.id,
            id: `${focusAreaDef.id}-in-${parentId}`, 
            children: linkedLearningTasks 
        };
    };

    const buildFullTopicTree = (topic: string, plan: any, type: 'product' | 'service'): MindMapNode => {
        const releaseNodes: MindMapNode[] = (plan?.releases || []).map((release: Release) => {
            const focusAreaNodes = (release.focusAreaIds || [])
                .map(id => deepWorkDefinitions.find(def => def.id === id))
                .filter((def): def is ExerciseDefinition => !!def)
                .map(fa => createFocusAreaNode(fa, release.id));
            
            const totalMinutes = (release.focusAreaIds || [])
                .reduce((sum, id) => sum + (totalTimePerFocusArea.get(id) || 0), 0);

            return { 
              ...release,
              id: release.id, 
              definitionId: release.id, 
              name: release.name, 
              category: 'Release', 
              children: focusAreaNodes,
              totalLoggedHours: totalMinutes > 0 ? totalMinutes / 60 : 0,
              topic: topic,
              type: type
            };
        });

        const totalTopicHours = releaseNodes.reduce((sum, release) => sum + (release.totalLoggedHours || 0), 0);
        return { 
            id: topic, 
            definitionId: topic, 
            name: topic, 
            category: type, 
            children: releaseNodes,
            totalLoggedHours: totalTopicHours > 0 ? totalTopicHours : undefined
        };
    };

    if (selectedTopic === 'Strategic Overview') {
        const productNodes = Object.keys(productizationPlans)
            .map(topic => buildFullTopicTree(topic, productizationPlans[topic], 'product'));
        
        const serviceNodes = Object.keys(offerizationPlans)
            .map(topic => buildFullTopicTree(topic, offerizationPlans[topic], 'service'));
        
        const bundles = deepWorkDefinitions.filter(def => def.focusAreaIds && def.focusAreaIds.length > 0);
        const bundleNodes: MindMapNode[] = bundles.map(bundle => {
            const socialChildren: MindMapNode[] = [];
            if (bundle.sharingStatus?.twitter) socialChildren.push({ id: `${bundle.id}-twitter`, definitionId: `${bundle.id}-twitter`, name: 'X/Twitter', category: 'Social', children: [] });
            if (bundle.sharingStatus?.linkedin) socialChildren.push({ id: `${bundle.id}-linkedin`, definitionId: `${bundle.id}-linkedin`, name: 'LinkedIn', category: 'Social', children: [] });
            if (bundle.sharingStatus?.devto) socialChildren.push({ id: `${bundle.id}-devto`, definitionId: `${bundle.id}-devto`, name: 'Dev.to', category: 'Social', children: [] });

            const focusAreaChildren = (bundle.focusAreaIds || [])
                .map(id => deepWorkDefinitions.find(d => d.id === id))
                .filter((def): def is ExerciseDefinition => !!def)
                .map(fa => createFocusAreaNode(fa, bundle.id));

            return { ...bundle, definitionId: bundle.id, children: [...focusAreaChildren, ...socialChildren] };
        });

        const rootNode: MindMapNode = {
            id: 'strategic-overview',
            definitionId: 'strategic-overview',
            name: 'Strategic Overview',
            category: 'System',
            children: [
                { id: 'products-branch', definitionId: 'products-branch', name: 'Products', category: 'System Branch', children: productNodes },
                { id: 'services-branch', definitionId: 'services-branch', name: 'Services', category: 'System Branch', children: serviceNodes },
                { id: 'bundles-branch', definitionId: 'bundles-branch', name: 'Content Bundles', category: 'System Branch', children: bundleNodes },
            ].filter(branch => branch.children.length > 0)
        };
        return rootNode;
    }

    if (selectedTopic === 'Content Bundles') {
        const bundles = deepWorkDefinitions.filter(def => def.focusAreaIds && def.focusAreaIds.length > 0);
        const bundleNodes: MindMapNode[] = bundles.map(bundle => {
            const socialChildren: MindMapNode[] = [];
            if (bundle.sharingStatus?.twitter) socialChildren.push({ id: `${bundle.id}-twitter`, definitionId: `${bundle.id}-twitter`, name: 'X/Twitter', category: 'Social', children: [] });
            if (bundle.sharingStatus?.linkedin) socialChildren.push({ id: `${bundle.id}-linkedin`, definitionId: `${bundle.id}-linkedin`, name: 'LinkedIn', category: 'Social', children: [] });
            if (bundle.sharingStatus?.devto) socialChildren.push({ id: `${bundle.id}-devto`, definitionId: `${bundle.id}-devto`, name: 'Dev.to', category: 'Social', children: [] });
            
            const focusAreaChildren = (bundle.focusAreaIds || [])
                .map(id => deepWorkDefinitions.find(d => d.id === id))
                .filter((def): def is ExerciseDefinition => !!def)
                .map(faDef => createFocusAreaNode(faDef, bundle.id));

            return { ...bundle, definitionId: bundle.id, children: [...focusAreaChildren, ...socialChildren] };
        });
        return {
            id: 'content-bundles-root',
            definitionId: 'content-bundles-root',
            name: 'Content Bundles',
            category: 'Branding',
            children: bundleNodes,
        };
    }
    
    const plan = productizationPlans[selectedTopic] || offerizationPlans[selectedTopic];
    const type = productizationPlans[selectedTopic] ? 'product' : 'service';
    return buildFullTopicTree(selectedTopic, plan, type);

  }, [selectedTopic, deepWorkDefinitions, upskillDefinitions, deepWorkTopicMetadata, productizationPlans, offerizationPlans, totalTimePerFocusArea]);

  // Modal Handlers
  const handleSaveNewFeature = () => {
    if (inlineAddInfo && inlineAddInfo.newFeatureName.trim() && mindMapData) {
        const { parentReleaseId, newFeatureName } = inlineAddInfo;
        
        let releaseNode: Release | undefined;
        let topic: string | undefined;
        let type: 'product' | 'service' | undefined;

        const findNode = (node: MindMapNode): MindMapNode | null => {
            if (node.id === parentReleaseId) return node;
            if (node.children) {
                for (const child of node.children) {
                    const found = findNode(child);
                    if (found) return found;
                }
            }
            return null;
        }
        
        const foundNode = findNode(mindMapData);

        if (foundNode && foundNode.topic && foundNode.type) {
            releaseNode = foundNode as Release;
            topic = foundNode.topic;
            type = foundNode.type;
        } else {
             toast({ title: "Error", description: "Could not find release information to add feature.", variant: "destructive" });
             setInlineAddInfo(null);
             return;
        }

        addFeatureToRelease(
            releaseNode,
            topic,
            newFeatureName,
            type
        );

        setInlineAddInfo(null); // Reset after save
    }
  };

  const handleToggleUpskillLink = (upskillId: string) => {
    setEditableLinkedUpskillIds(currentIds => {
      const newIds = new Set(currentIds);
      if (newIds.has(upskillId)) {
        newIds.delete(upskillId);
      } else {
        newIds.add(upskillId);
      }
      return Array.from(newIds);
    });
  };

  const handleSaveLinkedLearning = () => {
    if (!selectedFocusArea) return;
    setDeepWorkDefinitions(prevDefs => prevDefs.map(def =>
        def.id === selectedFocusArea!.id
            ? { ...def, linkedUpskillIds: editableLinkedUpskillIds }
            : def
    ));
    setIsLinkLearningModalOpen(false);
    toast({ title: "Saved", description: "Learning tasks have been linked." });
  };


  const renderNode = (node: MindMapNode, level: number, parentNode?: MindMapNode) => {
    const nodeIcons: Record<string, React.ReactNode> = {
        'System': <GitMerge className="h-3.5 w-3.5 text-primary" />,
        'System Branch:Products': <Package className="h-3.5 w-3.5 text-blue-500" />,
        'System Branch:Services': <Briefcase className="h-3.5 w-3.5 text-green-500" />,
        'System Branch:Content Bundles': <Share2 className="h-3.5 w-3.5 text-purple-500" />,
        'product': <GitBranch className="h-3.5 w-3.5 text-secondary-foreground" />,
        'service': <GitBranch className="h-3.5 w-3.5 text-secondary-foreground" />,
        'Release': <Rocket className="h-3 w-3 text-muted-foreground" />,
        'FocusArea': <Workflow className="h-3 w-3 text-muted-foreground" />,
        'Learning Task': <BookCopy className="h-3 w-3 text-muted-foreground" />,
        'Content Bundle': <Package className="h-3.5 w-3.5 text-secondary-foreground" />,
        'Social:X/Twitter': <TwitterIcon className="h-3 w-3 text-muted-foreground" />,
        'Social:LinkedIn': <Linkedin className="h-3 w-3 text-muted-foreground" />,
        'Social:Dev.to': <DevToIcon className="h-3 w-3 text-muted-foreground" />,
    };
    
    let iconKey = node.category;
    if (node.category === 'System Branch') iconKey = `System Branch:${node.name}`;
    if (node.category === 'Social') iconKey = `Social:${node.name}`;
    if (node.category === deepWorkTopicMetadata[node.name]?.classification) iconKey = node.category;
    if (!nodeIcons[iconKey] && level >= 4) iconKey = 'FocusArea';

    let activityTypeForNode: ActivityTypeType | undefined;
    if (parentNode?.category === 'Release' || parentNode?.category === 'product' || parentNode?.category === 'service' || parentNode?.name === 'Products' || parentNode?.name === 'Services') {
      activityTypeForNode = 'deepwork';
    } else if (parentNode?.category === 'Content Bundle' || parentNode?.name === 'Content Bundles') {
      activityTypeForNode = 'branding';
    } else if (node.category === 'Learning Task') {
      activityTypeForNode = 'upskill';
    }

    const scheduledInfoForNode = scheduledTaskInfo.get(node.definitionId)?.find(act => act.type === activityTypeForNode);
    const loggedInfoForNode = loggedTaskInfo.get(node.definitionId)?.find(info => info.type === activityTypeForNode);
    const pendingInfoForNode = pendingTaskInfo.get(node.definitionId)?.find(info => info.type === activityTypeForNode);
    const pastLogForNode = pastLoggedTaskInfo.get(node.definitionId)?.find(info => info.type === activityTypeForNode);

    const isLoggedToday = !!loggedInfoForNode;
    const isScheduledToday = !!scheduledInfoForNode;
    const isPending = !!pendingInfoForNode && !isLoggedToday && !isScheduledToday;
    const isPastAndDone = !!pastLogForNode && !isLoggedToday && !isScheduledToday && !isPending;

    let daysPending = 0;
    if (isPending && pendingInfoForNode) {
        daysPending = differenceInDays(new Date(), parseISO(pendingInfoForNode.oldestDate));
    }
    
    const isSchedulable = activityTypeForNode && ['FocusArea', 'Learning Task', 'Content Bundle'].includes(node.category);

    return (
    <div className="flex items-center flex-row-reverse">
      <div 
        id={node.id}
        className={cn(
        "relative flex-shrink-0 w-48 p-2 rounded-lg shadow-md bg-card border",
        isLoggedToday && "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700",
        isScheduledToday && !isLoggedToday && "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700",
        isPending && "bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700",
        isPastAndDone && "bg-background border-green-500/50"
      )}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted flex-shrink-0">
            {nodeIcons[iconKey] || <GitBranch className="h-3.5 w-3.5 text-primary" />}
          </div>
          <div className="min-w-0 flex-grow">
            <p className="font-semibold text-xs text-foreground truncate" title={node.name}>{node.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{node.category}</p>
          </div>
        </div>

        {isSchedulable && !isLoggedToday && !isScheduledToday && !isPending && (
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-background border">
                        <PlusCircle className="h-4 w-4 text-primary" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1">
                    <div className="flex flex-col">
                        <p className="p-2 text-xs font-semibold text-muted-foreground">Schedule for Today</p>
                        {timeSlots.map(slot => (
                            <Button
                                key={slot}
                                variant="ghost"
                                className="justify-start h-8 text-sm"
                                onClick={() => {
                                    if (activityTypeForNode) {
                                        scheduleTaskFromMindMap(node.definitionId, activityTypeForNode, slot);
                                    }
                                }}
                            >
                                {slot}
                            </Button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        )}

        {node.category === 'Release' && node.topic && node.type && (
            <Button variant="ghost" size="icon" className="absolute right-1 -bottom-2 h-6 w-6"
                onClick={() => setInlineAddInfo({ parentReleaseId: node.id, newFeatureName: '' })}
            >
                <PlusCircle className="h-4 w-4 text-primary" />
            </Button>
        )}
        
        {node.category === 'FocusArea' && (
             <Button variant="ghost" size="icon" className="absolute right-8 -bottom-2 h-6 w-6"
                onClick={() => {
                    setSelectedFocusArea(node as ExerciseDefinition);
                    setEditableLinkedUpskillIds(node.linkedUpskillIds || []);
                    setIsLinkLearningModalOpen(true);
                }}
            >
                <LinkIcon className="h-4 w-4 text-primary" />
            </Button>
        )}

        {(node.category === 'Release' || node.category === 'product' || node.category === 'service') && node.totalLoggedHours && node.totalLoggedHours > 0 && (
          <div className="mt-1 pt-1 border-t border-muted-foreground/20">
              <Badge variant="secondary" className="w-full justify-center text-xs">
                  Total Logged: {node.totalLoggedHours.toFixed(1)}h
              </Badge>
          </div>
        )}

        {isLoggedToday ? (
            <div className="mt-1 pt-1 border-t border-green-300/50 flex items-center gap-1.5 text-xs text-green-800 dark:text-green-200">
                <Check className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Logged: {loggedInfoForNode.totalTime > 60 ? `${(loggedInfoForNode.totalTime / 60).toFixed(1)}h` : `${loggedInfoForNode.totalTime}m`}</span>
                <span className="ml-auto font-mono">{format(new Date(), 'MMM dd')}</span>
            </div>
        ) : isScheduledToday ? (
            <div className="mt-1 pt-1 border-t border-yellow-300/50 flex items-center gap-1.5 text-xs text-yellow-800 dark:text-yellow-400">
                <Calendar className="h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <span className="font-medium">Scheduled Today</span>
                {!['Afternoon', 'Late Night', 'Evening'].includes(scheduledInfoForNode.slot) && <Badge variant="outline" className="ml-auto text-yellow-900 border-yellow-500/50 bg-yellow-500/10 text-xs">{scheduledInfoForNode.slot}</Badge>}
            </div>
        ) : isPending ? (
            <div className="mt-1 pt-1 border-t border-orange-300/50 flex items-center gap-1.5 text-xs text-orange-800 dark:text-orange-400">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-orange-600 dark:text-orange-400" />
                <span className="font-medium">Pending from Past</span>
                {daysPending > 0 && (
                    <Badge variant="destructive" className="ml-auto text-xs font-mono">{daysPending}d</Badge>
                )}
            </div>
        ) : isPastAndDone ? (
            <div className="mt-1 pt-1 border-t border-green-500/50 flex items-center gap-1.5 text-xs text-green-800 dark:text-green-400">
                <Check className="h-4 w-4 flex-shrink-0" />
                <div className="flex-grow flex items-center justify-between">
                  <div>
                    <span className="font-medium">Logged</span>
                    <span className="font-mono ml-2">{format(parseISO(pastLogForNode.lastLogDate), 'MMM dd')}</span>
                  </div>
                  {pastLogForNode.totalTime > 0 && (
                      <span className="font-mono font-semibold">
                          {pastLogForNode.totalTime > 60
                              ? `${(pastLogForNode.totalTime / 60).toFixed(1)}h`
                              : `${pastLogForNode.totalTime}m`}
                      </span>
                  )}
                </div>
            </div>
        ) : null}
      </div>
  
      {node.children && node.children.length > 0 && (
        <div className="flex items-center flex-row-reverse">
          <div className="w-4 h-px bg-border self-center" />
          <ul className="flex flex-col justify-center border-r border-border pr-4 space-y-2 py-1">
            {node.children.map(child => (
              <li key={child.id} className="relative">
                <div className="absolute -right-4 top-1/2 w-4 h-px bg-border" />
                {renderNode(child, level + 1, node)}
              </li>
            ))}
            {inlineAddInfo?.parentReleaseId === node.id && (
                <li className="relative">
                    <div className="absolute -right-4 top-1/2 w-4 h-px bg-border" />
                    <div className="flex items-center flex-row-reverse">
                        <div className="relative flex-shrink-0 w-48 p-2 rounded-lg shadow-md bg-card border-2 border-primary border-dashed">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted flex-shrink-0">
                                    <Workflow className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <Input
                                    value={inlineAddInfo.newFeatureName}
                                    onChange={(e) => setInlineAddInfo({ ...inlineAddInfo, newFeatureName: e.target.value })}
                                    placeholder="New feature name..."
                                    className="h-7 text-xs"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveNewFeature();
                                        if (e.key === 'Escape') setInlineAddInfo(null);
                                    }}
                                />
                            </div>
                             <div className="flex justify-end gap-1 mt-2">
                                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setInlineAddInfo(null)}>Cancel</Button>
                                <Button size="sm" className="h-6 px-2" onClick={handleSaveNewFeature}><Save className="h-3 w-3"/></Button>
                            </div>
                        </div>
                        <div className="w-4 h-px bg-border self-center" />
                    </div>
                </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
  }

  const MapContent = (
    <div 
        ref={containerRef} 
        className={cn(
            "relative overflow-auto flex-grow", 
            isFullScreen && "bg-background", 
            !showControls ? "h-full w-full" : "mt-2 rounded-lg bg-muted/30"
        )}
    >
        {selectedTopic && mindMapData ? (
          <TransformWrapper 
            initialScale={0.15} 
            minScale={0.01} 
            limitToBounds={false}
          >
            {(props) => {
              
              return (
              <>
                <Controls />
                <div className="absolute top-2 right-2 z-10 flex gap-2">
                  <Button size="icon" variant="outline" onClick={() => props.zoomIn()} aria-label="Zoom in">
                    <ZoomIn />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => props.zoomOut()} aria-label="Zoom out">
                    <ZoomOut />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => props.resetTransform()} aria-label="Reset view">
                    <RefreshCw />
                  </Button>
                  <Button size="icon" variant="outline" onClick={toggleFullScreen} aria-label="Toggle full screen">
                    {isFullScreen ? <Shrink /> : <Expand />}
                  </Button>
                </div>
                <TransformComponent
                  wrapperClass="!w-full !h-full"
                  contentClass={cn("flex items-center justify-center", isFullScreen ? "h-screen" : "h-full")}
                >
                    <div className="inline-block py-4">
                        {renderNode(mindMapData, 0)}
                    </div>
                </TransformComponent>
              </>
            )}}
          </TransformWrapper>
        ) : (
          <ConceptualFlowDiagram />
        )}
    </div>
  );

  if (!showControls) {
    return MapContent;
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-full flex flex-col">
        <Card className="flex-grow flex flex-col">
          <CardHeader>
            <CardTitle>Flow Mind Map</CardTitle>
            <CardDescription>
              A conceptual map of the LifeOS workflow. Select an item from the dropdown to visualize its unique structure.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col">
            <div className="max-w-sm mb-6">
              <Select onValueChange={setSelectedTopic} value={selectedTopic}>
                <SelectTrigger>
                  <SelectValue placeholder="View Conceptual Flow..." />
                </SelectTrigger>
                <SelectContent>
                  {allTopics.map(topic => (
                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {MapContent}
          </CardContent>
        </Card>
      </div>
      
      <Dialog open={isLinkLearningModalOpen} onOpenChange={setIsLinkLearningModalOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>Link Learning to "{selectedFocusArea?.name}"</DialogTitle>
                  <DialogDescription>Select the learning tasks that support this focus area.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <ScrollArea className="h-60 w-full rounded-md border p-2">
                      {upskillDefinitions.length > 0 ? (
                        <div className="space-y-2">
                            {upskillDefinitions.map(def => (
                                <div key={def.id} className="flex items-center space-x-3">
                                    <Checkbox
                                        id={`link-${def.id}`}
                                        checked={editableLinkedUpskillIds.includes(def.id)}
                                        onCheckedChange={() => handleToggleUpskillLink(def.id)}
                                    />
                                    <Label htmlFor={`link-${def.id}`} className="font-normal w-full cursor-pointer">
                                        {def.name} <span className="text-muted-foreground/80">({def.category})</span>
                                    </Label>
                                </div>
                            ))}
                        </div>
                      ) : (
                          <p className="text-center text-sm text-muted-foreground p-4">No learning tasks in library. Add some on the Upskill page.</p>
                      )}
                  </ScrollArea>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsLinkLearningModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveLinkedLearning}>Save Links</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
