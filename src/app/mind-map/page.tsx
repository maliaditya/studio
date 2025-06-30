
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { GitBranch, BookCopy, GitMerge, ZoomIn, ZoomOut, Expand, Shrink, RefreshCw, Briefcase, Share2, Package, Globe, ArrowRight, Linkedin, Youtube } from 'lucide-react';
import type { ExerciseDefinition } from '@/types/workout';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MindMapNode extends ExerciseDefinition {
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
  const { deepWorkDefinitions, upskillDefinitions, deepWorkTopicMetadata } = useAuth();
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
    const hasBundles = deepWorkDefinitions.some(def => Array.isArray(def.focusAreas));
    
    if (hasBundles) {
      return ["Content Bundles", ...productAndServiceTopics].sort();
    }
    
    return productAndServiceTopics;
  }, [deepWorkTopicMetadata, deepWorkDefinitions]);

  const mindMapData = useMemo(() => {
    if (!selectedTopic) return null;

    if (selectedTopic === 'Content Bundles') {
        const bundles = deepWorkDefinitions.filter(def => Array.isArray(def.focusAreas));
        const allFocusAreaDefs = deepWorkDefinitions.filter(def => !Array.isArray(def.focusAreas));
        const focusAreaDefMap = new Map(allFocusAreaDefs.map(def => [def.name.toLowerCase(), def]));

        const bundleNodes: MindMapNode[] = bundles.map(bundle => {
            const constituentFocusAreas = (bundle.focusAreas || [])
                .map(name => focusAreaDefMap.get(name.toLowerCase()))
                .filter((def): def is ExerciseDefinition => !!def)
                .map(def => ({ ...def, children: [] }));
            
            return {
                ...bundle,
                children: constituentFocusAreas
            };
        });

        return {
            id: 'content-bundles-root',
            name: 'Content Bundles',
            category: 'Branding',
            children: bundleNodes,
        };
    }
    
    const focusAreasForTopic = deepWorkDefinitions.filter(
      def => def.category === selectedTopic && !Array.isArray(def.focusAreas)
    );

    const childrenNodes: MindMapNode[] = focusAreasForTopic.map(focusArea => {
      const linkedLearningTasks = (focusArea.linkedUpskillIds || [])
        .map(id => upskillDefinitions.find(ud => ud.id === id))
        .filter((task): task is ExerciseDefinition => !!task)
        .map(task => ({ ...task, children: [] }));
      
      return {
        ...focusArea,
        children: linkedLearningTasks,
      };
    });

    const rootNode: MindMapNode = {
      id: selectedTopic,
      name: selectedTopic,
      category: deepWorkTopicMetadata[selectedTopic]?.classification || 'Topic',
      children: childrenNodes,
    };

    return rootNode;
  }, [selectedTopic, deepWorkDefinitions, upskillDefinitions, deepWorkTopicMetadata]);

  const renderNode = (node: MindMapNode, level: number) => (
    <div className="flex items-center flex-row-reverse">
      <div className="flex-shrink-0 w-48 p-2 rounded-lg shadow-md bg-card border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-muted flex-shrink-0">
            {level === 0 ? <GitBranch className="h-3.5 w-3.5 text-primary" /> 
              : node.category === 'Content Bundle' ? <Package className="h-3.5 w-3.5 text-secondary-foreground" />
              : Array.isArray(node.focusAreas) ? <Package className="h-3.5 w-3.5 text-secondary-foreground" />
              : (node.category === 'product' || node.category === 'service' || level === 1) ? <GitMerge className="h-3.5 w-3.5 text-secondary-foreground" />
              : <BookCopy className="h-3 w-3 text-muted-foreground" />}
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
