
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, ArrowUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PathNode } from '@/types/workout';

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

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-8 overflow-hidden relative pb-24">
      <div className="w-full max-w-4xl">
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
            <div className="relative space-y-[-100px] mb-20">
            {pathNodes.map((node, index) => {
                const isLeft = index % 2 === 0;
                const hasNext = index < pathNodes.length - 1;

                return (
                <div key={node.id} className="relative h-64">
                    <div className={cn("absolute flex items-center w-1/2", isLeft ? "left-0" : "right-0")}>
                    {/* Circle */}
                    <div className="relative w-48 h-48 bg-gray-800 border-2 border-gray-600 rounded-full flex items-center justify-center text-center p-4 shadow-2xl">
                        {editingNodeId === node.id ? (
                        <Textarea
                            value={editText}
                            onChange={handleTextChange}
                            onBlur={() => handleSaveText(node.id)}
                            autoFocus
                            className="bg-transparent text-white border-none focus-visible:ring-0 text-center resize-none text-lg"
                        />
                        ) : (
                        <p className="text-lg cursor-pointer" onClick={() => handleTextClick(node)}>
                            {node.text}
                        </p>
                        )}
                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-red-500 opacity-50 hover:opacity-100" onClick={() => handleDeleteNode(node.id)}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </div>
                    {/* Arrow stem from circle */}
                    {hasNext && (
                        <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 h-0.5 bg-gray-500 w-1/2",
                        isLeft ? "left-full" : "right-full"
                        )} />
                    )}
                    </div>

                    {/* Vertical line and arrowhead connecting to next node */}
                    {hasNext && (
                    <div className={cn("absolute top-full w-0.5 bg-gray-500", isLeft ? "left-3/4" : "left-1/4")} style={{height: '100px'}}>
                        <div className={cn("absolute w-0 h-0 border-x-8 border-x-transparent", 
                        isLeft ? "bottom-0 -translate-x-1/2 border-b-[16px] border-b-gray-500" : "top-0 -translate-x-1/2 border-t-[16px] border-t-gray-500")}>
                        </div>
                    </div>
                    )}
                </div>
                );
            })}
            </div>
        )}
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
