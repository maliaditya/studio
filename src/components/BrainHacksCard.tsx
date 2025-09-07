
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { Brain, PlusCircle, Trash2, GitBranch } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BrainHack } from '@/types/workout';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const EditableBrainHack = React.memo(({ hack, onUpdate, onDelete, onClick }: {
    hack: BrainHack;
    onUpdate: (id: string, newText: string) => void;
    onDelete: (id: string) => void;
    onClick: (e: React.MouseEvent) => void;
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
            setText(hack.text); // Revert changes
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
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={onClick}>
                    <GitBranch className="h-3 w-3 text-blue-500" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onDelete(hack.id); }}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
            </div>
        </div>
    );
});
EditableBrainHack.displayName = 'EditableBrainHack';

export function BrainHacksCard({ parentId = null, initialPosition }: { parentId?: string | null, initialPosition?: { x: number, y: number } }) {
    const { brainHacks, setBrainHacks } = useAuth();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);

    // Initialize position with a safe default or the passed prop.
    const [position, setPosition] = useState(initialPosition || { x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
    const [openChildPopups, setOpenChildPopups] = useState<Record<string, {x: number, y: number}>>({});
    
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsClient(true);
        // Only set the default position from window if it's the root card and no initial position was provided.
        if (parentId === null && !initialPosition) {
            const savedPosition = localStorage.getItem('brain_hacks_position');
            if (savedPosition) {
                setPosition(JSON.parse(savedPosition));
            } else {
                // This will only run if there's no saved position.
                setPosition({ x: window.innerWidth - 340, y: 250 });
            }
        }
    }, [parentId, initialPosition]);
    
    const currentHacks = React.useMemo(() => {
        return brainHacks.filter(h => h.parentId === parentId);
    }, [brainHacks, parentId]);

    const handleAddHack = () => {
        const newHack: BrainHack = {
            id: `hack_${Date.now()}`,
            text: "New Brain Hack",
            parentId: parentId,
        };
        setBrainHacks(prev => [...prev, newHack]);
    };

    const handleDeleteHack = (id: string) => {
        // Recursively find all children to delete
        const idsToDelete = new Set<string>();
        const queue = [id];
        while(queue.length > 0) {
            const currentId = queue.shift()!;
            if (!idsToDelete.has(currentId)) {
                idsToDelete.add(currentId);
                const children = brainHacks.filter(h => h.parentId === currentId);
                children.forEach(child => queue.push(child.id));
            }
        }
        setBrainHacks(prev => prev.filter(p => !idsToDelete.has(p.id)));
        setOpenChildPopups(prev => {
            const newPopups = {...prev};
            idsToDelete.forEach(deletedId => delete newPopups[deletedId]);
            return newPopups;
        });
    };

    const handleUpdateHack = (id: string, newText: string) => {
        setBrainHacks(prev => prev.map(p => p.id === id ? { ...p, text: newText } : p));
        toast({ title: 'Brain Hack updated!' });
    };

    const handleHackClick = (hack: BrainHack, event: React.MouseEvent) => {
        if (openChildPopups[hack.id]) {
            return;
        }

        const parentRect = cardRef.current?.getBoundingClientRect();
        const initialX = parentRect ? parentRect.right + 20 : event.clientX + 20;
        const initialY = parentRect ? parentRect.top : event.clientY;

        setOpenChildPopups(prev => ({
            ...prev,
            [hack.id]: {x: initialX, y: initialY}
        }));
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
        if (parentId === null) {
            localStorage.setItem('brain_hacks_position', JSON.stringify(position));
        }
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
    }, [isDragging, dragStartOffset, parentId, position]);
    
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
    
    if (parentId !== null && currentHacks.length === 0) {
       // Hide empty child popups to prevent them from becoming permanent orphans
       // A more robust solution might involve a close button
       return null;
    }


    return (
        <>
            <motion.div
                ref={cardRef}
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
                                {currentHacks.map(hack => (
                                    <li key={hack.id}>
                                        <EditableBrainHack
                                            hack={hack}
                                            onUpdate={handleUpdateHack}
                                            onDelete={handleDeleteHack}
                                            onClick={(e) => handleHackClick(hack, e)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </motion.div>
            {Object.entries(openChildPopups).map(([hackId, pos]) => (
                <BrainHacksCard key={hackId} parentId={hackId} initialPosition={pos} />
            ))}
        </>
    );
}
