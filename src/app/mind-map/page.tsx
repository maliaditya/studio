
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { GitBranch, BookCopy, GitMerge, ZoomIn, ZoomOut, Expand, Shrink, RefreshCw } from 'lucide-react';
import type { ExerciseDefinition } from '@/types/workout';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MindMapNode extends ExerciseDefinition {
  children: MindMapNode[];
}

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
    return Object.keys(deepWorkTopicMetadata).sort();
  }, [deepWorkTopicMetadata]);

  const mindMapData = useMemo(() => {
    if (!selectedTopic) return null;

    const focusAreasForTopic = deepWorkDefinitions.filter(
      def => def.category === selectedTopic && !Array.isArray(def.focusAreas)
    );

    const childrenNodes: MindMapNode[] = focusAreasForTopic.map(focusArea => {
      const linkedLearningTasks = (focusArea.linkedUpskillIds || [])
        .map(id => upskillDefinitions.find(ud => ud.id === id))
        .filter((task): task is ExerciseDefinition => !!task)
        .map(task => ({ ...task, children: [] })); // Learning tasks are leaf nodes
      
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
            {level === 0 ? <GitBranch className="h-3.5 w-3.5 text-primary" /> : level === 1 ? <GitMerge className="h-3.5 w-3.5 text-secondary-foreground" /> : <BookCopy className="h-3 w-3 text-muted-foreground" />}
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
            Select a product or service to visualize its structure. Use the controls to pan, zoom, and enter full screen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm mb-6">
            <Select onValueChange={setSelectedTopic} value={selectedTopic}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Product or Service..." />
              </SelectTrigger>
              <SelectContent>
                {allTopics.map(topic => (
                  <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div ref={containerRef} className={cn("relative mt-8 rounded-lg bg-muted/30", isFullScreen && "bg-background")}>
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
              <div className="flex h-[60vh] items-center justify-center">
                <p className="text-muted-foreground text-sm text-center">
                  {selectedTopic ? 'No focus areas defined for this topic.' : 'Select a topic to view the mind map.'}
                </p>
              </div>
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
