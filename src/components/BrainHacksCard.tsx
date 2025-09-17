

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { Brain, PlusCircle, Trash2, GitBranch, Link as LinkIcon, Globe, Play, BookCopy, Briefcase } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { BrainHack, ExerciseDefinition } from '@/types/workout';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const EditableBrainHack = React.memo(({ hack, onUpdate, onDelete, onOpenNested, onOpenLink, onEditLinkText, onLinkTasks }: {
    hack: BrainHack;
    onUpdate: (id: string, newText: string) => void;
    onDelete: (id: string) => void;
    onOpenNested: (hack: BrainHack, event: React.MouseEvent) => void;
    onOpenLink: (url: string) => void;
    onEditLinkText: (hack: BrainHack) => void;
    onLinkTasks: (hack: BrainHack) => void;
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
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onLinkTasks(hack); }}>
                    <LinkIcon className="h-3 w-3 text-primary" />
                </Button>
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

export function BrainHacksCard({ parentId = null, initialPosition }: { parentId?: string | null, initialPosition?: { x: number, y: number } }) {
    const { 
        brainHacks, setBrainHacks, 
        setFloatingVideoUrl, setFloatingVideoPlaylist,
        upskillDefinitions, deepWorkDefinitions 
    } = useAuth();
    const { toast } = useToast();
    const [isClient, setIsClient] = useState(false);

    const [position, setPosition] = useState(initialPosition || { x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
    const [openChildPopups, setOpenChildPopups] = useState<Record<string, {x: number, y: number}>>({});
    
    const [linkTextDialog, setLinkTextDialog] = useState<{hack: BrainHack} | null>(null);
    const [currentDisplayText, setCurrentDisplayText] = useState('');

    const [linkTaskModal, setLinkTaskModal] = useState<{ isOpen: boolean; hack: BrainHack | null }>({ isOpen: false, hack: null });
    const [tempLinkedUpskillIds, setTempLinkedUpskillIds] = useState<string[]>([]);
    const [tempLinkedDeepWorkIds, setTempLinkedDeepWorkIds] = useState<string[]>([]);

    const cardRef = useRef<HTMLDivElement>(null);
    
    const parentHack = parentId ? brainHacks.find(h => h.id === parentId) : null;

    useEffect(() => {
        setIsClient(true);
        if (parentId === null && !initialPosition) {
            const savedPosition = localStorage.getItem('brain_hacks_position');
            if (savedPosition) {
                setPosition(JSON.parse(savedPosition));
            } else {
                if (typeof window !== 'undefined') {
                    const x = window.innerWidth - 340;
                    setPosition({ x, y: 250 });
                }
            }
        }
    }, [parentId, initialPosition]);
    
    const currentHacks = React.useMemo(() => {
        return brainHacks.filter(h => h.parentId === parentId);
    }, [brainHacks, parentId]);
    
    const youtubeLinks = React.useMemo(() => {
        return currentHacks
            .filter(h => h.type === 'link' && h.link && /youtube\.com|youtu\.be/.test(h.link))
            .map(h => h.link!);
    }, [currentHacks]);

    const handlePlayAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (youtubeLinks.length > 0) {
            setFloatingVideoPlaylist(youtubeLinks);
        } else {
            toast({
                title: "No Videos",
                description: "There are no YouTube videos in this list to play.",
            });
        }
    };


    const handleAddHack = (type: 'hack' | 'link' = 'hack') => {
        const newHack: BrainHack = {
            id: `hack_${Date.now()}`,
            text: type === 'link' ? "https://example.com" : "New Brain Hack",
            type: type,
            parentId: parentId,
            link: type === 'link' ? 'https://example.com' : undefined,
        };
        setBrainHacks(prev => [...prev, newHack]);
    };

    const handleDeleteHack = (id: string) => {
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

    const handleUpdateHack = async (id: string, newText: string) => {
        const hackToUpdate = brainHacks.find(h => h.id === id);
        if (!hackToUpdate) return;
    
        let updatedHack: BrainHack = { ...hackToUpdate, text: newText.trim() };
    
        if (hackToUpdate.type === 'link') {
            updatedHack.link = newText.trim();
            try {
                const response = await fetch('/api/get-link-metadata', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: newText.trim() }),
                });
                const data = await response.json();
                if (response.ok && data.title) {
                    updatedHack.displayText = data.title;
                } else {
                    updatedHack.displayText = newText.trim();
                }
            } catch (error) {
                console.error("Failed to fetch link metadata", error);
                updatedHack.displayText = newText.trim();
            }
        }
    
        setBrainHacks(prev => prev.map(h => (h.id === id ? updatedHack : h)));
        toast({ title: 'Brain Hack updated!' });
    };

    const handleHackClick = (hack: BrainHack, event: React.MouseEvent) => {
        event.stopPropagation();
        if (openChildPopups[hack.id]) {
             setOpenChildPopups(prev => {
                const newPopups = {...prev};
                delete newPopups[hack.id];
                return newPopups;
            });
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

    const handleOpenLink = (url: string) => {
        setFloatingVideoUrl(url);
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, textarea, [role="button"]')) {
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

    const handleEditLinkText = (hack: BrainHack) => {
        setCurrentDisplayText(hack.displayText || hack.link || '');
        setLinkTextDialog({ hack });
    };

    const handleSaveLinkText = () => {
        if (!linkTextDialog) return;
        setBrainHacks(prev => prev.map(h => 
            h.id === linkTextDialog.hack.id ? { ...h, displayText: currentDisplayText.trim() } : h
        ));
        setLinkTextDialog(null);
        setCurrentDisplayText('');
    };

    const openLinkTaskModal = (hack: BrainHack) => {
        setLinkTaskModal({ isOpen: true, hack });
        setTempLinkedUpskillIds(hack.linkedUpskillIds || []);
        setTempLinkedDeepWorkIds(hack.linkedDeepWorkIds || []);
    };
    
    const handleSaveTaskLinks = () => {
        if (!linkTaskModal.hack) return;
        setBrainHacks(prev => prev.map(h => 
            h.id === linkTaskModal.hack?.id ? { ...h, linkedUpskillIds: tempLinkedUpskillIds, linkedDeepWorkIds: tempLinkedDeepWorkIds } : h
        ));
        setLinkTaskModal({ isOpen: false, hack: null });
        toast({ title: 'Tasks Linked!' });
    };
    
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
                                {parentHack ? parentHack.text : 'Brain Hacks'}
                            </CardTitle>
                            <div className="flex items-center">
                                {youtubeLinks.length > 0 && (
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handlePlayAll}>
                                        <Play className="h-4 w-4 text-green-500" />
                                    </Button>
                                )}
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddHack('link')}>
                                    <LinkIcon className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddHack('hack')}>
                                    <PlusCircle className="h-4 w-4 text-green-500" />
                                </Button>
                            </div>
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
                                            onOpenNested={handleHackClick}
                                            onOpenLink={handleOpenLink}
                                            onEditLinkText={handleEditLinkText}
                                            onLinkTasks={openLinkTaskModal}
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
            <Dialog open={!!linkTextDialog} onOpenChange={() => setLinkTextDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Link Text</DialogTitle>
                        <DialogDescription>
                            Change the display text for this link. The original URL will be preserved.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="display-text">Display Text</Label>
                        <Input 
                            id="display-text" 
                            value={currentDisplayText}
                            onChange={(e) => setCurrentDisplayText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveLinkText()}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground mt-2 truncate">
                            URL: {linkTextDialog?.hack.link}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLinkTextDialog(null)}>Cancel</Button>
                        <Button onClick={handleSaveLinkText}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={linkTaskModal.isOpen} onOpenChange={(isOpen) => setLinkTaskModal({ isOpen, hack: null })}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Link Tasks to "{linkTaskModal.hack?.text}"</DialogTitle>
                        <DialogDescription>Select the tasks this brain hack applies to.</DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="deepwork">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="deepwork"><Briefcase className="mr-2 h-4 w-4"/>Deep Work</TabsTrigger>
                            <TabsTrigger value="upskill"><BookCopy className="mr-2 h-4 w-4"/>Upskill</TabsTrigger>
                        </TabsList>
                        <TabsContent value="deepwork">
                            <ScrollArea className="h-72">
                                <div className="space-y-2 p-1">
                                    {deepWorkDefinitions.map(def => (
                                        <div key={def.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`dw-${def.id}`}
                                                checked={tempLinkedDeepWorkIds.includes(def.id)}
                                                onCheckedChange={() => setTempLinkedDeepWorkIds(prev => prev.includes(def.id) ? prev.filter(id => id !== def.id) : [...prev, def.id])}
                                            />
                                            <Label htmlFor={`dw-${def.id}`} className="font-normal">{def.name}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                        <TabsContent value="upskill">
                             <ScrollArea className="h-72">
                                <div className="space-y-2 p-1">
                                    {upskillDefinitions.map(def => (
                                        <div key={def.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`us-${def.id}`}
                                                checked={tempLinkedUpskillIds.includes(def.id)}
                                                onCheckedChange={() => setTempLinkedUpskillIds(prev => prev.includes(def.id) ? prev.filter(id => id !== def.id) : [...prev, def.id])}
                                            />
                                            <Label htmlFor={`us-${def.id}`} className="font-normal">{def.name}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLinkTaskModal({ isOpen: false, hack: null })}>Cancel</Button>
                        <Button onClick={handleSaveTaskLinks}>Save Links</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
