
"use client";

import React, { useState, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { GitBranch, BookCopy, GitMerge } from 'lucide-react';
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

    // Create a root node for the selected topic
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
      {/* Node Box: The visual representation of a single node */}
      <div className="flex-shrink-0 w-64 p-3 rounded-lg shadow-md bg-card border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted flex-shrink-0">
            {level === 0 ? (
              <GitBranch className="h-5 w-5 text-primary" />
            ) : level === 1 ? (
              <GitMerge className="h-5 w-5 text-secondary-foreground" />
            ) : (
              <BookCopy className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate" title={node.name}>
              {node.name}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{node.category}</p>
          </div>
        </div>
      </div>
  
      {/* Children and Connectors */}
      {node.children && node.children.length > 0 && (
        <div className="flex">
          {/* Horizontal line extending from the parent node */}
          <div className="w-8 h-px bg-border self-center" />
  
          {/* List of children with a vertical connector line */}
          <ul className="flex flex-col justify-center border-r border-border pr-8 space-y-8 py-4">
            {node.children.map(child => (
              <li key={child.id} className="relative">
                {/* Horizontal line from the vertical connector to the child node */}
                <div className="absolute -right-8 top-1/2 w-8 h-px bg-border" />
                {/* Recursively render the child node and its own children */}
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
            Select a product or service to visualize its structure, from high-level focus areas down to the specific learning tasks involved.
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

          {selectedTopic && mindMapData && (
            <div className="mt-8 p-4 rounded-lg bg-muted/30 overflow-x-auto flex justify-end">
              <div className="inline-block py-4">
                {renderNode(mindMapData, 0)}
              </div>
            </div>
          )}

          {selectedTopic && (!mindMapData || mindMapData.children.length === 0) && (
             <p className="text-muted-foreground text-sm text-center mt-8 py-4">
              No focus areas defined for this topic.
            </p>
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
