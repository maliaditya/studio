
"use client";

import React, { useState, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { GitBranch, BookCopy } from 'lucide-react';
import type { ExerciseDefinition } from '@/types/workout';

interface MindMapNode extends ExerciseDefinition {
  children: MindMapNode[];
}

function MindMapPageContent() {
  const { deepWorkDefinitions, upskillDefinitions, deepWorkTopicMetadata } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  const allTopics = useMemo(() => {
    return Object.keys(deepWorkTopicMetadata).sort();
  }, [deepWorkTopicMetadata]);

  const mindMapData = useMemo(() => {
    if (!selectedTopic) return null;

    const focusAreasForTopic = deepWorkDefinitions.filter(
      def => def.category === selectedTopic && !Array.isArray(def.focusAreas)
    );

    const data: MindMapNode[] = focusAreasForTopic.map(focusArea => {
      const linkedLearningTasks = (focusArea.linkedUpskillIds || [])
        .map(id => upskillDefinitions.find(ud => ud.id === id))
        .filter((task): task is ExerciseDefinition => !!task)
        .map(task => ({ ...task, children: [] }));
      
      return {
        ...focusArea,
        children: linkedLearningTasks,
      };
    });

    return data;
  }, [selectedTopic, deepWorkDefinitions, upskillDefinitions]);

  const renderNode = (node: MindMapNode, level: number) => (
    <div key={node.id} className="ml-8 mt-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted flex-shrink-0">
          {level === 0 ? <GitBranch className="h-5 w-5 text-primary" /> : <BookCopy className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="p-3 rounded-lg bg-card border flex-grow">
          <p className="font-semibold text-foreground">{node.name}</p>
          <p className="text-xs text-muted-foreground">{node.category}</p>
        </div>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="pl-4 border-l-2 border-muted-foreground/20 ml-4">
          {node.children.map(child => renderNode(child, level + 1))}
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
            Select a product or service to visualize its structure, from high-level focus areas down to the specific learning tasks involved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm mb-8">
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

          {selectedTopic && (
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground flex-shrink-0">
                  <GitBranch className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-primary">{selectedTopic}</h2>
                  <p className="text-muted-foreground capitalize">{deepWorkTopicMetadata[selectedTopic]?.classification}</p>
                </div>
              </div>

              <div className="mt-4 pl-4 border-l-2 border-primary ml-6">
                {mindMapData && mindMapData.length > 0 ? (
                  mindMapData.map(node => renderNode(node, 0))
                ) : (
                  <p className="text-muted-foreground text-sm ml-8 mt-4">No focus areas defined for this topic.</p>
                )}
              </div>
            </div>
          )}
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
