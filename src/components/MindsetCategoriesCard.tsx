
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Brain, Link as LinkIcon, Workflow, ChevronLeft, PlusCircle } from 'lucide-react';
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from './ui/button';
import type { Stopper, Resource } from '@/types/workout';

export function MindsetCategoriesCard() {
    const { 
        mindProgrammingCategories,
        mindProgrammingDefinitions,
        openLinkedResistancePopup,
        habitCards,
        mechanismCards,
        incrementStopperCount,
    } = useAuth();
    
    const [isClient, setIsClient] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [position, setPosition] = useState({ x: 20, y: 150 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
    
    const [view, setView] = useState<'techniques' | 'all-resistances'>('techniques');

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
        const target = e.target as HTMLElement;
        // This is the key fix: Check if the click originated from a button or a descendant of a button.
        if (target.closest('button')) {
            return;
        }
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
    
    const allLinkedResistances = React.useMemo(() => {
        const links: { habitId: string; habitName: string; stopper: Stopper; isUrge: boolean; mechanismName?: string; }[] = [];
        
        habitCards.forEach(habit => {
            const processStoppers = (stoppers: Stopper[] = [], isUrge: boolean) => {
                stoppers.forEach(stopper => {
                    if (stopper.linkedTechniqueId) {
                        const mechanism = mechanismCards.find(m => m.id === (isUrge ? habit.response?.resourceId : habit.newResponse?.resourceId));
                        links.push({
                            habitId: habit.id,
                            habitName: habit.name,
                            stopper: stopper,
                            isUrge: isUrge,
                            mechanismName: mechanism?.name,
                        });
                    }
                });
            };
            processStoppers(habit.urges, true);
            processStoppers(habit.resistances, false);
        });
        return links;
    }, [habitCards, mechanismCards]);
    
    if (!isClient) {
        return null;
    }

    const renderContent = () => {
        if (view === 'all-resistances') {
            return (
                <ul className="space-y-2">
                    {allLinkedResistances.map((link) => (
                        <li key={`${link.habitId}-${link.stopper.id}`} className="text-sm bg-muted/50 p-2 rounded-md">
                            <div className="flex justify-between items-start">
                                <p className="font-semibold flex-grow">{link.stopper.text}</p>
                                <div className="flex items-center flex-shrink-0">
                                    <span className="text-xs font-bold mr-1">({link.stopper.count || 0})</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => incrementStopperCount(link.habitId, link.stopper.id)}>
                                        <PlusCircle className="h-4 w-4 text-green-500" />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {link.isUrge ? 'Urge' : 'Resistance'} in: {link.habitName}
                            </p>
                            {link.mechanismName && (
                                <div className="text-xs text-muted-foreground mt-1 pt-1 border-t">
                                    <p>Mechanism: {link.mechanismName}</p>
                                </div>
                            )}
                        </li>
                    ))}
                    {allLinkedResistances.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-8">
                            No urges or resistances are linked to any techniques yet.
                        </p>
                    )}
                </ul>
            );
        }

        return (
            <Accordion type="single" collapsible className="w-full">
                {Object.entries(techniquesByCategory).map(([category, techniques]) => (
                   <AccordionItem value={category} key={category}>
                       <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                           {category}
                       </AccordionTrigger>
                       <AccordionContent>
                           {techniques.length > 0 ? (
                               <ul className="text-xs space-y-1 pl-2">
                                   {techniques.map(tech => (
                                     <li key={tech.id} className="flex items-center justify-between group">
                                       <span className="text-muted-foreground">{tech.name}</span>
                                       <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => openLinkedResistancePopup(tech.id, e)}>
                                         <LinkIcon className="h-3 w-3 text-primary" />
                                       </Button>
                                     </li>
                                   ))}
                               </ul>
                           ) : (
                               <p className="text-xs text-muted-foreground italic">No techniques defined.</p>
                           )}
                       </AccordionContent>
                   </AccordionItem>
               ))}
           </Accordion>
        );
    };

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className="fixed w-full max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
        >
            <Card 
                className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg"
                onMouseDown={handleMouseDown}
            >
                <div className="cursor-grab active:cursor-grabbing" {...listeners} {...attributes}>
                    <CardHeader className="p-0 mb-3 flex flex-row justify-between items-center">
                        {view === 'all-resistances' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView('techniques')}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <CardTitle className="flex items-center gap-2 text-base text-primary">
                            <Brain className="h-5 w-5" />
                            {view === 'techniques' ? 'Mindset Techniques' : 'All Linked Resistances'}
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView(v => v === 'techniques' ? 'all-resistances' : 'techniques')}>
                            <Workflow className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                </div>
                <CardContent className="p-0">
                    <ScrollArea className="h-96 pr-3">
                        {renderContent()}
                    </ScrollArea>
                </CardContent>
            </Card>
        </motion.div>
    );
}

