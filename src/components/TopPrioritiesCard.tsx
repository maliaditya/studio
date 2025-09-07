
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { Target, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Priority } from '@/types/workout';
import { cn } from '@/lib/utils';

export function TopPrioritiesCard() {
    const { topPriorities, setTopPriorities } = useAuth();
    const [isClient, setIsClient] = useState(false);
    const [newPriority, setNewPriority] = useState('');

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setIsClient(true);
        const savedPosition = localStorage.getItem('top_priorities_position');
        if (savedPosition) {
            setPosition(JSON.parse(savedPosition));
        } else {
            // Set initial position after mounting on client
            setPosition({ x: window.innerWidth - 340, y: 50 });
        }
    }, []);

    const handleAddPriority = () => {
        if (newPriority.trim()) {
            const newPriorityItem: Priority = {
                id: `priority_${Date.now()}`,
                text: newPriority.trim()
            };
            setTopPriorities(prev => [...prev, newPriorityItem]);
            setNewPriority('');
        }
    };

    const handleDeletePriority = (id: string) => {
        setTopPriorities(prev => prev.filter(p => p.id !== id));
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, input')) {
            return;
        }
        setIsDragging(true);
        setDragStartOffset({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
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
        localStorage.setItem('top_priorities_position', JSON.stringify(position));
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
    
    const style: React.CSSProperties = {
        position: 'fixed',
        top: position.y,
        left: position.x,
        willChange: 'transform',
        userSelect: isDragging ? 'none' : 'auto',
    };
    
    if (!isClient) {
        return null;
    }

    return (
        <motion.div
            style={style}
            className="fixed w-full max-w-xs z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            onMouseDown={handleMouseDown}
        >
            <Card className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg">
                <div className="cursor-grab active:cursor-grabbing">
                    <CardHeader className="p-0 mb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-primary">
                            <Target className="h-5 w-5 text-red-500" />
                            Top Priorities
                        </CardTitle>
                    </CardHeader>
                </div>
                <CardContent className="p-0">
                    <div className="flex gap-2 mb-2">
                        <Input 
                            placeholder="Add a new priority..." 
                            value={newPriority} 
                            onChange={(e) => setNewPriority(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPriority()}
                            className="h-8"
                        />
                        <Button size="icon" className="h-8 w-8" onClick={handleAddPriority}>
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </div>
                    <ScrollArea className="h-48 pr-3">
                        <ul className="space-y-2">
                            {topPriorities.map(priority => (
                                <li key={priority.id} className="flex items-center justify-between group p-2 rounded-md bg-muted/50 hover:bg-muted/80">
                                    <span className="text-sm font-medium text-foreground">{priority.text}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeletePriority(priority.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </CardContent>
            </Card>
        </motion.div>
    );
}
