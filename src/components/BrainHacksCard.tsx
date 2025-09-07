

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { Brain, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BrainHack } from '@/types/workout';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const EditableBrainHack = React.memo(({ hack, onUpdate, onDelete }: {
    hack: BrainHack;
    onUpdate: (id: string, newText: string) => void;
    onDelete: (id: string) => void;
}) => {
    const [text, setText] = useState(hack.text);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (hack.text === "New Brain Hack") {
            inputRef.current?.select();
        }
    }, [hack.text]);
    
    useEffect(() => {
        setText(hack.text);
    }, [hack.text]);

    const handleBlur = () => {
        const newText = text.trim();
        if (newText === '') {
            onDelete(hack.id);
        } else if (newText !== hack.text) {
            onUpdate(hack.id, newText);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleBlur();
            e.preventDefault();
        } else if (e.key === 'Escape') {
            setText(hack.text);
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
            <div className="flex items-center flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onDelete(hack.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
            </div>
        </div>
    );
});
EditableBrainHack.displayName = 'EditableBrainHack';

export function BrainHacksCard() {
    const { brainHacks, setBrainHacks } = useAuth();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setIsClient(true);
        const savedPosition = localStorage.getItem('brain_hacks_position');
        if (savedPosition) {
            setPosition(JSON.parse(savedPosition));
        } else {
            setPosition({ x: window.innerWidth - 340, y: 250 });
        }
    }, []);

    const handleAddHack = () => {
        const newHack: BrainHack = {
            id: `hack_${Date.now()}`,
            text: "New Brain Hack",
        };
        setBrainHacks(prev => [...prev, newHack]);
    };

    const handleDeleteHack = (id: string) => {
        setBrainHacks(prev => prev.filter(p => p.id !== id));
    };

    const handleUpdateHack = (id: string, newText: string) => {
        setBrainHacks(prev => prev.map(p => p.id === id ? { ...p, text: newText } : p));
        toast({ title: 'Brain Hack updated!' });
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
        localStorage.setItem('brain_hacks_position', JSON.stringify(position));
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
                            <Brain className="h-5 w-5 text-purple-500" />
                            Brain Hacks
                        </CardTitle>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAddHack}>
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                </div>
                <CardContent className="p-0">
                    <ScrollArea className="h-48 pr-3">
                        <ul className="space-y-2">
                            {brainHacks.map(hack => (
                                <li key={hack.id}>
                                    <EditableBrainHack
                                        hack={hack}
                                        onUpdate={handleUpdateHack}
                                        onDelete={handleDeleteHack}
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
