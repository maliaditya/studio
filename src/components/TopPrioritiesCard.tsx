
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { Target, PlusCircle, Trash2, MoreVertical, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Priority } from '@/types/workout';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from './ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { format, differenceInDays, startOfToday, parseISO } from 'date-fns';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';

const EditablePriority = React.memo(({ priority, onUpdate, onDelete, onToggle, onSetDeadline }: {
    priority: Priority;
    onUpdate: (id: string, newText: string) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
    onSetDeadline: (id: string, deadline: Date | undefined) => void;
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

    const daysLeft = priority.deadline ? differenceInDays(parseISO(priority.deadline), startOfToday()) : null;

    return (
        <div className="flex items-center justify-between group p-2 rounded-md bg-muted/50 hover:bg-muted/80 w-full">
            <Checkbox
                checked={priority.completed}
                onCheckedChange={() => onToggle(priority.id)}
                className="mr-2"
                aria-label={`Mark priority ${priority.text} as ${priority.completed ? 'not completed' : 'completed'}`}
            />
            <Input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={cn("h-7 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring w-full", priority.completed && "line-through text-muted-foreground")}
            />
            <div className="flex items-center flex-shrink-0">
                {daysLeft !== null && (
                    <span className={cn(
                        "text-xs font-semibold mr-2",
                        daysLeft < 0 && "text-destructive",
                        daysLeft >= 0 && daysLeft <= 3 && "text-orange-500",
                        daysLeft > 3 && "text-muted-foreground"
                    )}>
                        {daysLeft < 0 ? `Overdue` : `${daysLeft}d`}
                    </span>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="w-full justify-start font-normal h-8 px-2">
                                    <CalendarIcon className="mr-2 h-4 w-4"/>
                                    Set Deadline
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={priority.deadline ? parseISO(priority.deadline) : undefined}
                                    onSelect={(date) => onSetDeadline(priority.id, date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <DropdownMenuItem onSelect={() => onDelete(priority.id)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
});
EditablePriority.displayName = 'EditablePriority';

export function TopPrioritiesCard() {
    const { topPriorities, setTopPriorities } = useAuth();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);

    // Initialize with a default, non-window-dependent position
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setIsClient(true);
        // Only access window and localStorage after the component has mounted
        const savedPosition = localStorage.getItem('top_priorities_position');
        if (savedPosition) {
            try {
                setPosition(JSON.parse(savedPosition));
            } catch (error) {
                console.error("Failed to parse position from localStorage", error);
                // Fallback to default position if parsing fails
                setPosition({ x: window.innerWidth - 340, y: 50 });
            }
        } else {
            setPosition({ x: window.innerWidth - 340, y: 50 });
        }
    }, []);

    const handleAddPriority = () => {
        const newPriorityItem: Priority = {
            id: `priority_${Date.now()}`,
            text: "New Priority",
            completed: false,
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

    const handleTogglePriority = (id: string) => {
        setTopPriorities(prev => prev.map(p => p.id === id ? { ...p, completed: !p.completed } : p));
    };
    
    const handleSetDeadline = (id: string, deadline: Date | undefined) => {
        setTopPriorities(prev => prev.map(p => p.id === id ? { ...p, deadline: deadline ? format(deadline, 'yyyy-MM-dd') : undefined } : p));
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, [role="checkbox"], [role="menuitem"], [role="dialog"]')) {
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
        safeSetLocalStorageItem('top_priorities_position', JSON.stringify(position));
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
                                        onToggle={handleTogglePriority}
                                        onSetDeadline={handleSetDeadline}
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
