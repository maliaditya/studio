
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Brain } from 'lucide-react';
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

export function MindsetCategoriesCard() {
    const { 
        mindProgrammingCategories,
        mindProgrammingDefinitions
    } = useAuth();
    
    const [isClient, setIsClient] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [position, setPosition] = useState({ x: 20, y: 150 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
      setIsClient(true);
    }, []);

    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: 'mindset-categories-popup' });
    
    const style: React.CSSProperties = {
        position: 'fixed',
        top: position.y,
        left: position.x,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        willChange: 'transform',
        zIndex: 50,
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, a')) return;
        setIsDragging(true);
        setDragStartOffset({
          x: e.clientX - position.x - (transform?.x || 0),
          y: e.clientY - position.y - (transform?.y || 0),
        });
    };
    
    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            setPosition({
            x: e.clientX - dragStartOffset.x,
            y: e.clientY - dragStartOffset.y,
            });
        }
    };
    
    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
        } else {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStartOffset]);

    const techniquesByCategory = React.useMemo(() => {
        const map: Record<string, typeof mindProgrammingDefinitions> = {};
        mindProgrammingCategories.forEach(cat => {
            map[cat] = mindProgrammingDefinitions.filter(def => def.category === cat);
        });
        return map;
    }, [mindProgrammingCategories, mindProgrammingDefinitions]);
    
    if (!isClient) {
        return null;
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className="fixed w-full max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            {...attributes}
            {...listeners}
        >
            <Card className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg">
                <CardHeader className="p-0 mb-3 cursor-grab active:cursor-grabbing">
                    <CardTitle className="flex items-center gap-2 text-base text-primary">
                        <Brain className="h-5 w-5" />
                        Mindset Techniques
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-96 pr-3">
                        <ul className="space-y-3">
                            {Object.entries(techniquesByCategory).map(([category, techniques]) => (
                                <li key={category}>
                                    <h4 className="text-sm font-semibold text-foreground mb-1">{category}</h4>
                                    {techniques.length > 0 ? (
                                        <ul className="text-xs space-y-1 list-disc list-inside pl-2">
                                            {techniques.map(tech => (
                                                <li key={tech.id} className="text-muted-foreground">{tech.name}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">No techniques defined.</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </CardContent>
            </Card>
        </motion.div>
    );
}
