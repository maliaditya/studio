
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { Brain, PlusCircle, Trash2, GitBranch, Link as LinkIcon, Globe, Play, History, LineChart, Workflow } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { BrainHack, Stopper } from '@/types/workout';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const EditableBrainHack = React.memo(({ hack, onUpdate, onDelete, onOpenNested, onOpenLink, onEditLinkText }: {
    hack: BrainHack;
    onUpdate: (id: string, newText: string) => void;
    onDelete: (id: string) => void;
    onOpenNested: (hack: BrainHack, event: React.MouseEvent) => void;
    onOpenLink: (url: string) => void;
    onEditLinkText: (hack: BrainHack) => void;
}) => {
    const [text, setText] = useState(hack.text);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFetching, setIsFetching] = useState(false);
    const { toast } = useToast();

    const isMultiLine = text.includes('\n') || text.length > 50;

    useEffect(() => {
        if (hack.text === "New Brain Hack" || hack.text === "https://example.com") {
            inputRef.current?.select();
        }
    }, [hack.text]);
    
    useEffect(() => {
        setText(hack.type === 'link' ? (hack.link || '') : hack.text);
    }, [hack.type, hack.text, hack.link]);

    const handleBlur = async () => {
        const newText = text.trim();
        if (newText === '') {
            onDelete(hack.id);
            return;
        }

        if (hack.type === 'link' && newText !== hack.link) {
            setIsFetching(true);
            onUpdate(hack.id, newText);
            setIsFetching(false);
        } else if (hack.type === 'hack' && newText !== hack.text) {
            onUpdate(hack.id, newText);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleBlur();
            e.preventDefault();
        } else if (e.key === 'Escape') {
            setText(hack.type === 'link' ? (hack.link || '') : hack.text);
            e.preventDefault();
            (e.target as HTMLElement).blur();
        }
    };

    if (hack.type === 'link' && !isFetching && hack.displayText) {
        return (
             <div className="flex items-center justify-between group p-2 rounded-md bg-muted/50 hover:bg-muted/80 w-full">
                <Globe className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                <button 
                    className="text-sm font-medium w-full text-left truncate text-primary hover:underline"
                    onClick={() => onOpenLink(hack.link!)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        onEditLinkText(hack);
                    }}
                >
                    {hack.displayText || hack.link}
                </button>
                <div className="flex items-center flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onDelete(hack.id); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                </div>
            </div>
        )
    }

    const commonProps = {
        value: text,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(e.target.value),
        onBlur: handleBlur,
        onKeyDown: handleKeyDown,
        className: "h-auto text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring w-full resize-none overflow-hidden p-1 flex-grow min-w-0",
        placeholder: hack.type === 'link' ? 'https://...' : 'New hack...',
    };

    return (
        <div className="flex items-center justify-between group p-2 rounded-md bg-muted/50 hover:bg-muted/80 w-full">
            <div className="flex items-center gap-2 flex-grow min-w-0">
                {isFetching ? (
                     <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                ) : (
                    hack.type === 'link' ? <LinkIcon className="h-4 w-4 text-blue-500 flex-shrink-0" /> : null
                )}
                {isMultiLine ? (
                    <Textarea {...commonProps} rows={1} autoFocus />
                ) : (
                    <Input {...commonProps} ref={inputRef} />
                )}
            </div>
            <div className="flex items-center flex-shrink-0">
                {hack.type !== 'link' && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => onOpenNested(hack, e)}>
                        <GitBranch className="h-3 w-3 text-blue-500" />
                    </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onDelete(hack.id); }}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
            </div>
        </div>
    );
});
EditableBrainHack.displayName = 'EditableBrainHack';

const HourlyResistanceLogDialog = ({ isOpen, onOpenChange, allLinkedResistances }: { 
    isOpen: boolean; 
    onOpenChange: (isOpen: boolean) => void;
    allLinkedResistances: { habitId: string; habitName: string; stopper: Stopper; isUrge: boolean; mechanismName?: string; }[];
}) => {
    const hourlyLog = React.useMemo(() => {
        const log: { hour: number, label: string, urges: Map<string, number>, resistances: Map<string, number> }[] = Array.from({ length: 24 }, (_, i) => {
            const start = i % 12 === 0 ? 12 : i % 12;
            const startAmPm = i < 12 ? 'AM' : 'PM';
            const end = (i + 1) % 12 === 0 ? 12 : (i + 1) % 12;
            const endAmPm = (i + 1) < 12 || (i + 1) === 24 ? 'AM' : 'PM';
            
            return {
                hour: i,
                label: `${start} ${startAmPm} - ${end} ${i+1 === 24 ? 'AM' : endAmPm}`,
                urges: new Map(),
                resistances: new Map(),
            };
        });

        allLinkedResistances.forEach(link => {
            if (link.stopper.timestamps) {
                link.stopper.timestamps.forEach(ts => {
                    const hour = new Date(ts).getHours();
                    const targetMap = link.isUrge ? log[hour].urges : log[hour].resistances;
                    targetMap.set(link.stopper.text, (targetMap.get(link.stopper.text) || 0) + 1);
                });
            }
        });
        return log.filter(hour => hour.urges.size > 0 || hour.resistances.size > 0);
    }, [allLinkedResistances]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Hourly Resistance Log</DialogTitle>
                    <DialogDescription>
                        A historical log of all your urges and resistances, grouped by the hour of the day they were recorded.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <ScrollArea className="h-full pr-4">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead className="w-[120px]">Hour</TableHead>
                                    <TableHead>Urges</TableHead>
                                    <TableHead>Resistances</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {hourlyLog.length > 0 ? hourlyLog.map(({ hour, label, urges, resistances }) => (
                                    <TableRow key={hour}>
                                        <TableCell className="font-medium text-xs">{label}</TableCell>
                                        <TableCell>
                                            <ul className="list-disc list-inside space-y-1">
                                                {Array.from(urges.entries()).map(([text, count]) => (
                                                    <li key={text} className="text-xs text-muted-foreground">{text} {count > 1 && <span className="font-bold">({count})</span>}</li>
                                                ))}
                                            </ul>
                                        </TableCell>
                                        <TableCell>
                                            <ul className="list-disc list-inside space-y-1">
                                                {Array.from(resistances.entries()).map(([text, count]) => (
                                                    <li key={text} className="text-xs text-muted-foreground">{text} {count > 1 && <span className="font-bold">({count})</span>}</li>
                                                ))}
                                            </ul>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">No logged urges or resistances found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    )
};


export function MindsetCategoriesCard() {
    const { 
        mindProgrammingCategories,
        mindProgrammingDefinitions,
        habitCards,
        mechanismCards,
        logStopperEncounter,
        openLinkedResistancePopup,
        openStopperProgressPopup,
    } = useAuth();
    
    const [isClient, setIsClient] = useState(false);
    const [view, setView] = useState<'techniques' | 'all-resistances'>('techniques');
    const [hotResistances, setHotResistances] = useState<Set<string>>(new Set());
    const [isHourlyLogOpen, setIsHourlyLogOpen] = useState(false);

    const [position, setPosition] = useState({ x: 20, y: 320 });
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
                            >
                                <div 
                                    className="flex-grow pr-2 cursor-pointer"
                                    onClick={(e) => link.stopper.linkedTechniqueId && openLinkedResistancePopup(link.stopper.linkedTechniqueId, e)}
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
        <>
            <motion.div
                style={style}
                className="fixed w-full max-w-xs z-50"
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
                                <Brain className="h-5 w-5 text-purple-500" />
                                {view === 'techniques' ? 'Mindset Techniques' : 'All Linked Resistances'}
                            </CardTitle>
                            <div className="flex items-center">
                                {view === 'all-resistances' && (
                                     <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsHourlyLogOpen(true)}>
                                        <History className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView(v => v === 'techniques' ? 'all-resistances' : 'techniques')}>
                                    <Workflow className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                    </div>
                    <CardContent className="p-0">
                        <ScrollArea className="h-48 pr-3">
                            {renderContent()}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </motion.div>
            <HourlyResistanceLogDialog 
                isOpen={isHourlyLogOpen}
                onOpenChange={setIsHourlyLogOpen}
                allLinkedResistances={allLinkedResistances}
            />
        </>
    );
}
