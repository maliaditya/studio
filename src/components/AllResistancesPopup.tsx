
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { History, PlusCircle, LineChart, Workflow, X, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Stopper } from '@/types/workout';
import { isBefore, startOfDay, subDays } from 'date-fns';

export function AllResistancesPopup() {
    const { 
        isAllResistancesPopupOpen, 
        setIsAllResistancesPopupOpen,
        habitCards,
        mechanismCards,
        logStopperEncounter,
        openStopperProgressPopup,
    } = useAuth();
    
    const [isClient, setIsClient] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
    const [isHourlyLogOpen, setIsHourlyLogOpen] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const savedPosition = localStorage.getItem('all_resistances_position');
        if (savedPosition) {
            setPosition(JSON.parse(savedPosition));
        } else {
            const initialX = window.innerWidth - 340; // 320px width + 20px padding
            setPosition({ x: initialX, y: 550 });
        }
    }, []);

    const allLinkedResistances = React.useMemo(() => {
        const links: { habitId: string; habitName: string; stopper: Stopper; isUrge: boolean; mechanismName?: string; }[] = [];
        
        habitCards.forEach(habit => {
            const processStoppers = (stoppers: Stopper[] = [], isUrge: boolean) => {
                stoppers.forEach(stopper => {
                    const mechanism = mechanismCards.find(m => m.id === (isUrge ? habit.response?.resourceId : habit.newResponse?.resourceId));
                    links.push({
                        habitId: habit.id,
                        habitName: habit.name,
                        stopper: stopper,
                        isUrge: isUrge,
                        mechanismName: mechanism?.name,
                    });
                });
            };
            processStoppers(habit.urges, true);
            processStoppers(habit.resistances, false);
        });
        return links;
    }, [habitCards, mechanismCards]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, [role="button"]')) {
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
        localStorage.setItem('all_resistances_position', JSON.stringify(position));
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
    
    const getResistanceHighlightClass = (stopper: Stopper) => {
        const todayStart = startOfDay(new Date());
        const todayTimestamps = (stopper.timestamps || []).filter(ts => ts >= todayStart.getTime());
        const count = todayTimestamps.length;
        const sevenDaysAgo = subDays(todayStart, 7);
        const lastTimestamp = Math.max(0, ...(stopper.timestamps || []));
        const isDormant = lastTimestamp > 0 && isBefore(new Date(lastTimestamp), sevenDaysAgo);

        let highlightClass = 'bg-muted/50';
        if (count === 1) highlightClass = 'bg-yellow-500/20';
        else if (count === 2) highlightClass = 'bg-orange-500/20';
        else if (count >= 3) highlightClass = 'bg-red-500/20';
        else if (count === 0 && !isDormant) highlightClass = 'bg-green-500/10';

        return { className: highlightClass, dormant: isDormant };
    };
    
    const sortedResistances = [...allLinkedResistances].sort((a, b) => {
        const lastTsA = Math.max(0, ...(a.stopper.timestamps || []));
        const lastTsB = Math.max(0, ...(b.stopper.timestamps || []));
        return lastTsB - lastTsA;
    });

    if (!isClient || !isAllResistancesPopupOpen) {
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
                    <CardHeader className="p-0 mb-3 flex flex-row justify-between items-center">
                        <CardTitle className="flex items-center gap-2 text-base text-primary">
                            <Workflow className="h-5 w-5 text-orange-500" />
                            All Linked Resistances
                        </CardTitle>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsHourlyLogOpen(true)}>
                                <History className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsAllResistancesPopupOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                </div>
                <CardContent className="p-0">
                    <ScrollArea className="h-48 pr-3">
                         <ul className="space-y-2">
                            {sortedResistances.map((link) => {
                                const { className: highlightClass, dormant } = getResistanceHighlightClass(link.stopper);
                                return (
                                    <li key={`${link.habitId}-${link.stopper.id}`} className={cn("text-sm p-2 rounded-md transition-all", highlightClass)}>
                                        <div
                                            className="flex justify-between items-start w-full text-left"
                                        >
                                            <div 
                                                className={cn("flex-grow pr-2 cursor-pointer", dormant && "line-through text-muted-foreground")}
                                            >
                                                <p className="font-semibold">{link.stopper.text}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {link.isUrge ? 'Urge' : 'Resistance'} in: {link.habitName}
                                                </p>
                                            </div>
                                            <div className="flex items-center flex-shrink-0">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openStopperProgressPopup(link.stopper, link.habitName)}>
                                                    <LineChart className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <span className="text-xs font-bold mr-1">{(link.stopper.timestamps?.length || 0)}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); logStopperEncounter(link.habitId, link.stopper.id); }}>
                                                    <PlusCircle className="h-4 w-4 text-green-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                            {allLinkedResistances.length === 0 && (
                                <p className="text-center text-sm text-muted-foreground py-8">
                                    No urges or resistances are linked to any techniques yet.
                                </p>
                            )}
                        </ul>
                    </ScrollArea>
                </CardContent>
            </Card>
        </motion.div>
    );
}
