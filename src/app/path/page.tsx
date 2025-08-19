
"use client";

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, ArrowUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PathNode } from '@/types/workout';

const NODE_DIAMETER = 192; // Corresponds to w-48 and h-48
const HORIZONTAL_SPACING = 300;
const VERTICAL_SPACING = 150;

function PathPageContent() {
  const { pathNodes, setPathNodes } = useAuth();
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAddNode = () => {
    const newNode: PathNode = {
      id: `path_node_${Date.now()}`,
      text: "New Step",
    };
    setPathNodes(prev => [...prev, newNode]);
    setEditingNodeId(newNode.id);
    setEditText(newNode.text);
  };
  
  const handleDeleteNode = (nodeId: string) => {
    setPathNodes(prev => prev.filter(node => node.id !== nodeId));
  };

  const handleTextClick = (node: PathNode) => {
    setEditingNodeId(node.id);
    setEditText(node.text);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
  };

  const handleSaveText = (nodeId: string) => {
    setPathNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, text: editText } : node
    ));
    setEditingNodeId(null);
  };
  
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    pathNodes.forEach((node, index) => {
      const isLeft = index % 2 === 0;
      const x = isLeft ? HORIZONTAL_SPACING / 2 : HORIZONTAL_SPACING * 1.5;
      const y = (pathNodes.length - 1 - index) * VERTICAL_SPACING + NODE_DIAMETER / 2;
      positions.set(node.id, { x, y });
    });
    return positions;
  }, [pathNodes]);
  
  const svgSize = useMemo(() => {
    const height = pathNodes.length * VERTICAL_SPACING + NODE_DIAMETER;
    const width = HORIZONTAL_SPACING * 2 + NODE_DIAMETER;
    return { width: Math.max(width, 800), height: Math.max(height, 600) };
  }, [pathNodes]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-8 overflow-auto relative pb-24">
      <div className="w-full max-w-4xl flex items-center justify-center">
        {pathNodes.length === 0 ? (
          <div className="text-center absolute inset-0 flex flex-col items-center justify-center">
             <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-700 rounded-lg">
                <Zap className="h-16 w-16 text-yellow-400 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Define Your Path</h2>
                <p className="text-gray-400 mb-6 max-w-sm">This is your strategic map. Add the first step to visualize your journey from where you are to where you want to be.</p>
                <Button onClick={handleAddNode} variant="outline" className="bg-gray-800 border-gray-600 hover:bg-gray-700">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Step
                </Button>
            </div>
             <div className="flex flex-col items-center text-gray-500 mt-12">
                <ArrowUp className="h-6 w-6 animate-bounce" />
                <p className="text-sm">The path will build upwards from here.</p>
            </div>
          </div>
        ) : (
            <svg width={svgSize.width} height={svgSize.height} className="overflow-visible">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto" markerUnits="strokeWidth">
                        <polygon points="0 0, 10 3.5, 0 7" fill="hsl(210 40% 96.1% / 0.5)" />
                    </marker>
                </defs>
                {/* Render Connectors */}
                {pathNodes.slice(0, -1).map((node, index) => {
                    const startPos = nodePositions.get(node.id);
                    const endPos = nodePositions.get(pathNodes[index + 1].id);

                    if (!startPos || !endPos) return null;

                    const dx = endPos.x - startPos.x;
                    const dy = endPos.y - startPos.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const offsetX = (dx / dist) * (NODE_DIAMETER / 2 + 10); // +10 for arrowhead
                    const offsetY = (dy / dist) * (NODE_DIAMETER / 2 + 10);

                    return (
                        <line
                            key={`line-${node.id}`}
                            x1={startPos.x}
                            y1={startPos.y}
                            x2={endPos.x - offsetX}
                            y2={endPos.y - offsetY}
                            stroke="hsl(210 40% 96.1% / 0.5)"
                            strokeWidth="2"
                            markerEnd="url(#arrowhead)"
                        />
                    );
                })}
            </svg>
        )}
      </div>

      {/* Render Nodes on top of SVG */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{ width: `${svgSize.width}px`, height: `${svgSize.height}px` }}>
        {pathNodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;
          return (
            <div
              key={node.id}
              className="absolute flex items-center justify-center text-center p-4 shadow-2xl"
              style={{
                left: pos.x - NODE_DIAMETER / 2,
                top: pos.y - NODE_DIAMETER / 2,
                width: NODE_DIAMETER,
                height: NODE_DIAMETER,
              }}
            >
              <div className="relative w-full h-full bg-gray-800 border-2 border-gray-600 rounded-full flex items-center justify-center">
                  {editingNodeId === node.id ? (
                    <Textarea
                      value={editText}
                      onChange={handleTextChange}
                      onBlur={() => handleSaveText(node.id)}
                      autoFocus
                      className="bg-transparent text-white border-none focus-visible:ring-0 text-center resize-none text-lg p-2"
                    />
                  ) : (
                    <p className="text-lg cursor-pointer p-2" onClick={() => handleTextClick(node)}>
                      {node.text}
                    </p>
                  )}
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-red-500 opacity-50 hover:opacity-100" onClick={() => handleDeleteNode(node.id)}>
                      <Trash2 className="h-4 w-4"/>
                  </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-8">
            <Button onClick={handleAddNode} variant="outline" className="bg-gray-800 border-gray-600 hover:bg-gray-700 shadow-lg">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Step
            </Button>
      </div>
    </div>
  );
}

export default function PathPage() {
    return <AuthGuard><PathPageContent /></AuthGuard>
}
