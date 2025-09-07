
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { Target, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Priority } from '@/types/workout';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const EditablePriority = React.memo(({ priority, onUpdate, onDelete }: {
    priority: Priority;
    onUpdate: (id: string, newText: string) => void;
    onDelete: (id: string) => void;
}) => {
    const [text, setText] = useState(priority.text);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (priority.text === "New Priority") {
            inputRef.current?.select();
        }
    }, [priority.text]);
    
    useEffect(() => {
        setText(priority.text);
    }, [priority.text]);

    const handleBlur = () => {
        const newText = text.trim();
        if (newText === '') {
            onDelete(priority.id);
        } else if (newText !== priority.text) {
            onUpdate(priority.id, newText);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleBlur();
            e.preventDefault();
        } else if (e.key === 'Escape') {
            setText(priority.text); // Revert changes
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <div className="flex items-center justify-between group p-2 rounded-md bg-muted/50 hover:bg-muted/80 w-full">
            <Input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="h-7 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring w-full"
            />
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={() => onDelete(priority.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
    );
});
EditablePriority.displayName = 'EditablePriority';

export function TopPrioritiesCard() {
    const { topPriorities, setTopPriorities } = useAuth();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setIsClient(true);
        const savedPosition = localStorage.getItem('top_priorities_position');
        if (savedPosition) {
            setPosition(JSON.parse(savedPosition));
        } else {
            setPosition({ x: window.innerWidth - 340, y: 50 });
        }
    }, []);

    const handleAddPriority = () => {
        const newPriorityItem: Priority = {
            id: `priority_${Date.now()}`,
            text: "New Priority"
        };
        setTopPriorities(prev => [...prev, newPriorityItem]);
    };

    const handleDeletePriority = (id: string) => {
        setTopPriorities(prev => prev.filter(p => p.id !== id));
    };

    const handleUpdatePriority = (id: string, newText: string) => {
        setTopPriorities(prev => prev.map(p => p.id === id ? { ...p, text: newText } : p));
        toast({ title: 'Priority updated!' });
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
                    <CardHeader className="p-0 mb-3 flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base text-primary">
                            <Target className="h-5 w-5 text-red-500" />
                            Top Priorities
                        </CardTitle>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAddPriority}>
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                </div>
                <CardContent className="p-0">
                    <ScrollArea className="h-48 pr-3">
                        <ul className="space-y-2">
                            {topPriorities.map(priority => (
                                <li key={priority.id}>
                                    <EditablePriority
                                        priority={priority}
                                        onUpdate={handleUpdatePriority}
                                        onDelete={handleDeletePriority}
                                    />
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </CardContent>
            </Card>
        </motion.div>
    );
}
