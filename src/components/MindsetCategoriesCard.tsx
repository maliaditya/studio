
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import type { Activity, ActivityType, DatedWorkout, DailySchedule, Resource, Stopper } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';
import { PieChart as PieChartIcon, X, Brain, Link as LinkIcon, Workflow, ChevronLeft, PlusCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const activityNameMap: Record<ActivityType, string> = {
    deepwork: 'Deep Work',
    upskill: 'Learning',
    workout: 'Workout',
    mindset: 'Mindset',
    branding: 'Branding',
    essentials: 'Essentials',
    planning: 'Planning',
    tracking: 'Tracking',
    'lead-generation': 'Lead Gen',
    interrupt: 'Interrupts',
    distraction: 'Distractions',
    nutrition: 'Nutrition',
};

const activityColorMapping: Record<string, string> = {
    'Deep Work': 'bg-green-500',
    'Learning': 'bg-blue-500',
    'Workout': 'bg-red-500',
    'Mindset': 'bg-purple-500',
    'Branding': 'bg-pink-500',
    'Lead Gen': 'bg-yellow-500',
    'Essentials': 'bg-gray-400',
    'Planning': 'bg-teal-500',
    'Tracking': 'bg-indigo-500',
    'Interrupts': 'bg-orange-600',
    'Distractions': 'bg-amber-600',
    'Nutrition': 'bg-lime-500',
    'Wasted Time': 'bg-orange-600',
    'Scheduled': 'bg-sky-500',
    'Free Time': 'bg-gray-400',
};

const slotOrder: { name: string; endHour: number, startHour: number }[] = [
    { name: 'Late Night', endHour: 4, startHour: 0 },
    { name: 'Dawn', endHour: 8, startHour: 4 },
    { name: 'Morning', endHour: 12, startHour: 8 },
    { name: 'Afternoon', endHour: 16, startHour: 12 },
    { name: 'Evening', endHour: 20, startHour: 16 },
    { name: 'Night', endHour: 24, startHour: 20 }
];


export function MindsetCategoriesCard() {
    const { 
        mindProgrammingCategories,
        mindProgrammingDefinitions,
        habitCards,
        mechanismCards,
        logStopperEncounter,
        openLinkedResistancePopup,
    } = useAuth();
    
    const [isClient, setIsClient] = useState(false);
    const [view, setView] = useState<'techniques' | 'all-resistances'>('techniques');
    const [hotResistances, setHotResistances] = useState<Set<string>>(new Set());

    const [position, setPosition] = useState({ x: 20, y: 150 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
      setIsClient(true);
    }, []);

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
    
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const today = new Date(now);
            const yesterday = new Date(now - 24 * 60 * 60 * 1000);
            
            const newHotResistances = new Set<string>();

            allLinkedResistances.forEach(link => {
                const timestamps = link.stopper.timestamps || [];
                for (const ts of timestamps) {
                    const eventDate = new Date(ts);
                    // Check for recent clicks (last 30 minutes)
                    if (now - ts < 30 * 60 * 1000) {
                        newHotResistances.add(link.stopper.id);
                        break;
                    }
                    
                    // Check for predictive highlighting
                    if (eventDate.toDateString() === yesterday.toDateString()) {
                        const eventTimeToday = new Date(today);
                        eventTimeToday.setHours(eventDate.getHours(), eventDate.getMinutes(), eventDate.getSeconds());
                        
                        const fifteenMinutes = 15 * 60 * 1000;
                        if (Math.abs(now - eventTimeToday.getTime()) <= fifteenMinutes) {
                            newHotResistances.add(link.stopper.id);
                            break;
                        }
                    }
                }
            });

            setHotResistances(newHotResistances);
        }, 60 * 1000); // Check every minute

        return () => clearInterval(interval);
    }, [allLinkedResistances]);

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) {
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
    };

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
    
    const sortedResistances = [...allLinkedResistances].sort((a, b) => {
        const aIsHot = hotResistances.has(a.stopper.id);
        const bIsHot = hotResistances.has(b.stopper.id);
        if (aIsHot && !bIsHot) return -1;
        if (!aIsHot && bIsHot) return 1;
        const lastTsA = Math.max(0, ...(a.stopper.timestamps || []));
        const lastTsB = Math.max(0, ...(b.stopper.timestamps || []));
        return lastTsB - lastTsA;
    });

    const renderContent = () => {
        if (view === 'all-resistances') {
            return (
                <ul className="space-y-2">
                    {sortedResistances.map((link) => (
                        <li key={`${link.habitId}-${link.stopper.id}`} className={cn("text-sm p-2 rounded-md transition-all", hotResistances.has(link.stopper.id) ? "bg-primary/20" : "bg-muted/50")}>
                            <div
                                className="flex justify-between items-start w-full text-left"
                                onClick={(e) => link.stopper.linkedTechniqueId && openLinkedResistancePopup(link.stopper.linkedTechniqueId, e)}
                            >
                                <p className="font-semibold flex-grow">{link.stopper.text}</p>
                                <div className="flex items-center flex-shrink-0">
                                    <span className="text-xs font-bold mr-1">{(link.stopper.timestamps?.length || 0)}</span>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); logStopperEncounter(link.habitId, link.stopper.id); }}>
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
            style={style}
            className="fixed w-full max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            onMouseDown={handleMouseDown}
        >
            <Card 
                className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg"
            >
                <div className="cursor-grab active:cursor-grabbing">
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
