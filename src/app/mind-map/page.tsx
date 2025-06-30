
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { GitBranch, BookCopy, GitMerge, ZoomIn, ZoomOut, Expand, Shrink, RefreshCw, Briefcase, Share2, Package, Globe, ArrowRight, Linkedin, Youtube, Rocket } from 'lucide-react';
import type { ExerciseDefinition, Release } from '@/types/workout';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MindMapNode extends Partial<ExerciseDefinition> {
  id: string;
  name: string;
  category: string;
  children: MindMapNode[];
}

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
  <div className="flex flex-col items-center p-4 border rounded-lg bg-card shadow-sm w-56 text-center h-full">
    <div className="text-primary">{icon}</div>
    <h3 className="mt-2 font-semibold text-foreground">{title}</h3>
    <p className="mt-1 text-xs text-muted-foreground flex-grow">{description}</p>
    {children}
  </div>
);

const ConceptualFlowDiagram = () => {
    return (
        <div className="flex items-center justify-center p-8 overflow-x-auto">
            <div className="flex flex-wrap items-stretch justify-center gap-4">
                <div className="flex items-center gap-4">
                  <FlowCard icon={<BookCopy size={32} />} title="1. Upskill" description="Learn new skills and gain knowledge on specific topics." />
                </div>
                <div className="flex items-center"><ArrowRight className="w-10 h-10 text-muted-foreground/30 shrink-0" /></div>
                <div className="flex items-center gap-4">
                  <FlowCard icon={<Briefcase size={32} />} title="2. Deep Work" description="Apply skills to focus areas. This is where value is created." />
                </div>
                <div className="flex items-center"><ArrowRight className="w-10 h-10 text-muted-foreground/30 shrink-0" /></div>
                
                <div className="flex flex-col gap-4 justify-center">
                    {/* Branch 1 */}
                    <div className="flex flex-wrap items-stretch justify-center gap-4">
                        <FlowCard icon={<Share2 size={32} />} title="3a. Branding" description="Bundle focus areas into shareable content.">
                            <div className="mt-2 pt-2 border-t w-full">
                                <p className="text-xs font-bold text-foreground">Output:</p>
                                <p className="text-xs text-muted-foreground">Content Bundles</p>
                            </div>
                        </FlowCard>
                        <div className="flex items-center"><ArrowRight className="w-10 h-10 text-muted-foreground/30 shrink-0" /></div>
                        <FlowCard icon={<Globe size={32} />} title="4a. Publishing" description="Share content on social platforms to build authority.">
                            <div className="mt-2 pt-2 border-t w-full">
                                <div className="flex justify-center gap-3 mt-1 text-muted-foreground">
                                    <TwitterIcon className="h-4 w-4" />
                                    <Linkedin className="h-4 w-4" />
                                    <Youtube className="h-4 w-4" />
                                    <DevToIcon className="h-4 w-4" />
                                </div>
                            </div>
                        </FlowCard>
                    </div>
                    
                    {/* Branch 2 */}
                    <div className="flex flex-wrap items-stretch justify-center gap-4">
                        <FlowCard icon={<Package size={32} />} title="3b. Productization" description="Systematize topics into scalable products or services." >
                            <div className="mt-2 pt-2 border-t w-full">
                                <p className="text-xs font-bold text-foreground">Output:</p>
                                <p className="text-xs text-muted-foreground">Products & Services</p>
                            </div>
                        </FlowCard>
                    </div>
                </div>
            </div>
        </div>
    );
};


function MindMapPageContent() {
  const { deepWorkDefinitions, upskillDefinitions, deepWorkTopicMetadata, productizationPlans, offerizationPlans } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

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
            .map(task => ({ ...task, id: `${task.id}-from-${focusAreaDef.id}-in-${parentId}`, category: 'Learning Task', children: [] }));
        return { ...focusAreaDef, id: `${focusAreaDef.id}-in-${parentId}`, children: linkedLearningTasks };
    };

    const buildFullTopicTree = (topic: string, plan: any): MindMapNode => {
        const releaseNodes: MindMapNode[] = (plan?.releases || []).map((release: Release) => {
            const focusAreaNodes = (release.focusAreaIds || [])
                .map(id => deepWorkDefinitions.find(def => def.id === id))
                .filter((def): def is ExerciseDefinition => !!def)
                .map(fa => createFocusAreaNode(fa, release.id));
            return { id: release.id, name: release.name, category: 'Release', children: focusAreaNodes };
        });
        const classification = deepWorkTopicMetadata[topic]?.classification || 'Topic';
        return { id: topic, name: topic, category: classification, children: releaseNodes };
    };

    if (selectedTopic === 'Strategic Overview') {
        const productNodes = Object.keys(productizationPlans)
            .map(topic => buildFullTopicTree(topic, productizationPlans[topic]));
        
        const serviceNodes = Object.keys(offerizationPlans)
            .map(topic => buildFullTopicTree(topic, offerizationPlans[topic]));
        
        const bundles = deepWorkDefinitions.filter(def => def.focusAreaIds && def.focusAreaIds.length > 0);
        const bundleNodes: MindMapNode[] = bundles.map(bundle => {
            const socialChildren: MindMapNode[] = [];
            if (bundle.sharingStatus?.twitter) socialChildren.push({ id: `${bundle.id}-twitter`, name: 'X/Twitter', category: 'Social', children: [] });
            if (bundle.sharingStatus?.linkedin) socialChildren.push({ id: `${bundle.id}-linkedin`, name: 'LinkedIn', category: 'Social', children: [] });
            if (bundle.sharingStatus?.devto) socialChildren.push({ id: `${bundle.id}-devto`, name: 'Dev.to', category: 'Social', children: [] });

            const focusAreaChildren = (bundle.focusAreaIds || [])
                .map(id => deepWorkDefinitions.find(d => d.id === id))
                .filter((def): def is ExerciseDefinition => !!def)
                .map(faDef => createFocusAreaNode(faDef, bundle.id));

            return { ...bundle, children: [...focusAreaChildren, ...socialChildren] };
        });

        const rootNode: MindMapNode = {
            id: 'strategic-overview',
            name: 'Strategic Overview',
            category: 'System',
            children: [
                { id: 'products-branch', name: 'Products', category: 'System Branch', children: productNodes },
                { id: 'services-branch', name: 'Services', category: 'System Branch', children: serviceNodes },
                { id: 'bundles-branch', name: 'Content Bundles', category: 'System Branch', children: bundleNodes },
            ].filter(branch => branch.children.length > 0)
        };
        return rootNode;
    }

    if (selectedTopic === 'Content Bundles') {
        const bundles = deepWorkDefinitions.filter(def => def.focusAreaIds && def.focusAreaIds.length > 0);
        const bundleNodes: MindMapNode[] = bundles.map(bundle => {
            const socialChildren: MindMapNode[] = [];
            if (bundle.sharingStatus?.twitter) socialChildren.push({ id: `${bundle.id}-twitter`, name: 'X/Twitter', category: 'Social', children: [] });
            if (bundle.sharingStatus?.linkedin) socialChildren.push({ id: `${bundle.id}-linkedin`, name: 'LinkedIn', category: 'Social', children: [] });
            if (bundle.sharingStatus?.devto) socialChildren.push({ id: `${bundle.id}-devto`, name: 'Dev.to', category: 'Social', children: [] });
            
            const focusAreaChildren = (bundle.focusAreaIds || [])
                .map(id => deepWorkDefinitions.find(d => d.id === id))
                .filter((def): def is ExerciseDefinition => !!def)
                .map(faDef => createFocusAreaNode(faDef, bundle.id));

            return { ...bundle, children: [...focusAreaChildren, ...socialChildren] };
        });
        return {
            id: 'content-bundles-root',
            name: 'Content Bundles',
            category: 'Branding',
            children: bundleNodes,
        };
    }
    
    const plan = productizationPlans[selectedTopic] || offerizationPlans[selectedTopic];
    return buildFullTopicTree(selectedTopic, plan);

  }, [selectedTopic, deepWorkDefinitions, upskillDefinitions, deepWorkTopicMetadata, productizationPlans, offerizationPlans]);

  const renderNode = (node: MindMapNode, level: number) => {
    const nodeIcons: Record<string, React.ReactNode> = {
        'System': <GitMerge className="h-3.5 w-3.5 text-primary" />,
        'System Branch:Products': <Package className="h-3.5 w-3.5 text-blue-500" />,
        'System Branch:Services': <Briefcase className="h-3.5 w-3.5 text-green-500" />,
        'System Branch:Content Bundles': <Share2 className="h-3.5 w-3.5 text-purple-500" />,
        'product': <GitBranch className="h-3.5 w-3.5 text-secondary-foreground" />,
        'service': <GitBranch className="h-3.5 w-3.5 text-secondary-foreground" />,
        'Release': <Rocket className="h-3 w-3 text-muted-foreground" />,
        'FocusArea': <GitMerge className="h-3.5 w-3.5 text-secondary-foreground" />,
        'Learning Task': <BookCopy className="h-3 w-3 text-muted-foreground" />,
        'Content Bundle': <Package className="h-3.5 w-3.5 text-secondary-foreground" />,
        'Social:X/Twitter': <TwitterIcon className="h-3 w-3 text-muted-foreground" />,
        'Social:LinkedIn': <Linkedin className="h-3 w-3 text-muted-foreground" />,
        'Social:Dev.to': <DevToIcon className="h-3 w-3 text-muted-foreground" />,
    };
    
    // Determine the key for the icon
    let iconKey = node.category;
    if (node.category === 'System Branch') iconKey = `System Branch:${node.name}`;
    if (node.category === 'Social') iconKey = `Social:${node.name}`;
    if (node.category === deepWorkTopicMetadata[node.name]?.classification) iconKey = node.category; // To handle product/service topics
    if (!nodeIcons[iconKey] && level === 4) iconKey = 'FocusArea';

    return (
    <div className="flex items-center flex-row-reverse">
      <div className="flex-shrink-0 w-48 p-2 rounded-lg shadow-md bg-card border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted flex-shrink-0">
             {nodeIcons[iconKey] || <GitBranch className="h-3.5 w-3.5 text-primary" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-xs text-foreground truncate" title={node.name}>{node.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{node.category}</p>
          </div>
        </div>
      </div>
  
      {node.children && node.children.length > 0 && (
        <div className="flex">
          <div className="w-4 h-px bg-border self-center" />
          <ul className="flex flex-col justify-center border-r border-border pr-4 space-y-2 py-1">
            {node.children.map(child => (
              <li key={child.id} className="relative">
                <div className="absolute -right-4 top-1/2 w-4 h-px bg-border" />
                {renderNode(child, level + 1)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Flow Mind Map</CardTitle>
          <CardDescription>
            A conceptual map of the LifeOS workflow. Select an item from the dropdown to visualize its unique structure.
          </CardDescription>
        </CardHeader>
        <CardContent>
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

          <div ref={containerRef} className={cn("relative mt-8 rounded-lg bg-muted/30 overflow-auto", isFullScreen && "bg-background")}>
            {selectedTopic && mindMapData ? (
              <TransformWrapper initialScale={1} centerOnInit={true}>
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    <div className="absolute top-2 right-2 z-10 flex gap-2">
                      <Button size="icon" variant="outline" onClick={() => zoomIn()} aria-label="Zoom in">
                        <ZoomIn />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => zoomOut()} aria-label="Zoom out">
                        <ZoomOut />
                      </Button>
                      <Button size="icon" variant="outline" onClick={() => resetTransform()} aria-label="Reset view">
                        <RefreshCw />
                      </Button>
                      <Button size="icon" variant="outline" onClick={toggleFullScreen} aria-label="Toggle full screen">
                        {isFullScreen ? <Shrink /> : <Expand />}
                      </Button>
                    </div>
                    <TransformComponent
                      wrapperClass="!w-full !h-full"
                      contentClass={cn("flex items-center justify-center", isFullScreen ? "h-screen" : "h-[60vh]")}
                    >
                      <div className="inline-block py-4">
                        {renderNode(mindMapData, 0)}
                      </div>
                    </TransformComponent>
                  </>
                )}
              </TransformWrapper>
            ) : (
                <ConceptualFlowDiagram />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function MindMapPage() {
    return (
        <AuthGuard>
            <MindMapPageContent />
        </AuthGuard>
    )
}

    
