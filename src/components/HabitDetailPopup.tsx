
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Workflow, ArrowDown, ThumbsUp, ThumbsDown, Trash2, PlusCircle, Link as LinkIcon, Edit2 } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { HabitDetailPopupState, Resource, Stopper, Strength, PopupState } from '@/types/workout';
import { EditableField, EditableResponse } from './EditableFields';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';

interface HabitDetailPopupProps {
  popupState: HabitDetailPopupState;
  onClose: () => void;
}

export function HabitDetailPopup({ popupState, onClose }: HabitDetailPopupProps) {
    const { habitId, x, y } = popupState;
    const { resources, setResources, mechanismCards, openGeneralPopup, patterns } = useAuth();
    
    const [newStopperText, setNewStopperText] = useState('');
    const [newStrengthText, setNewStrengthText] = useState('');
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `habit-detail-popup-${habitId}`,
    });

    const style: React.CSSProperties = {
        position: 'fixed',
        top: y,
        left: x,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        willChange: 'transform',
        zIndex: 100,
    };
    
    const habit = resources.find(r => r.id === habitId);

    const handleUpdateResource = (updatedResource: Resource) => {
        setResources(prev => prev.map(r => r.id === updatedResource.id ? updatedResource : r));
    };

    const handleStopperStatusChange = (e: React.PointerEvent<HTMLButtonElement>, stopperId: string, status: Stopper['status']) => {
        if (!habit) return;
        const updatedStoppers = (habit.stoppers || []).map(s => 
            s.id === stopperId ? { ...s, status: s.status === status ? 'none' : status } : s
        );
        handleUpdateResource({ ...habit, stoppers: updatedStoppers });
    };

    const handleAddStopper = () => {
        if (!newStopperText.trim() || !habit) return;
        const newStopper: Stopper = {
            id: `stopper_${Date.now()}`,
            text: newStopperText.trim(),
            status: 'none',
        };
        handleUpdateResource({ ...habit, stoppers: [...(habit.stoppers || []), newStopper] });
        setNewStopperText('');
    };
    
    const handleDeleteStopper = (stopperId: string) => {
        if (!habit) return;
        handleUpdateResource({ ...habit, stoppers: (habit.stoppers || []).filter(s => s.id !== stopperId) });
    };
    
    const handleAddStrength = () => {
        if (!newStrengthText.trim() || !habit) return;
        const newStrength: Strength = {
            id: `strength_${Date.now()}`,
            text: newStrengthText.trim(),
        };
        handleUpdateResource({ ...habit, strengths: [...(habit.strengths || []), newStrength] });
        setNewStrengthText('');
    };

    const handleDeleteStrength = (strengthId: string) => {
        if (!habit) return;
        handleUpdateResource({ ...habit, strengths: (habit.strengths || []).filter(s => s.id !== strengthId) });
    };
    
    if (!habit) return null;
    
    const pattern = patterns.find(p => p.phrases.some(ph => ph.category === 'Habit Cards' && ph.mechanismCardId === habit.id));

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className="w-[600px] shadow-2xl border-2 border-primary/30 bg-card">
                <CardHeader className="p-4 relative cursor-grab" {...listeners}>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Workflow className="h-5 w-5 text-primary"/>
                            {habit.name}
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={onClose}><X className="h-4 w-4" /></Button>
                    </div>
                     {pattern && <CardDescription>Pattern: {pattern.name}</CardDescription>}
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="space-y-4">
                        <EditableField field="trigger" subField="action" prefix="Trigger: When I" suffix="." resource={habit} onUpdate={handleUpdateResource} />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-red-500">Old Response</h4>
                                <EditableResponse field="response" label="" resource={habit} onUpdate={handleUpdateResource} onOpenNestedPopup={(id, e) => openGeneralPopup(id, e)} />
                            </div>
                             <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-green-500">New Response</h4>
                                <EditableResponse field="newResponse" label="" resource={habit} onUpdate={handleUpdateResource} onOpenNestedPopup={(id, e) => openGeneralPopup(id, e)} />
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold text-sm text-red-500 mb-2">Resistance</h4>
                                <ResistanceSection habit={habit} handleStopperStatusChange={handleStopperStatusChange} handleDeleteStopper={handleDeleteStopper} newStopperText={newStopperText} setNewStopperText={setNewStopperText} handleAddStopper={handleAddStopper} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-green-500 mb-2">Truth</h4>
                                <TruthSection habit={habit} handleDeleteStrength={handleDeleteStrength} newStrengthText={newStrengthText} setNewStrengthText={setNewStrengthText} handleAddStrength={handleAddStrength} />
                            </div>
                         </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

const ResistanceSection = ({ habit, handleStopperStatusChange, handleDeleteStopper, newStopperText, setNewStopperText, handleAddStopper }: { 
    habit: Resource, 
    handleStopperStatusChange: (e: React.PointerEvent<HTMLButtonElement>, stopperId: string, status: 'manageable' | 'unmanageable') => void,
    handleDeleteStopper: (stopperId: string) => void,
    newStopperText: string,
    setNewStopperText: (text: string) => void,
    handleAddStopper: () => void,
}) => (
    <div>
        <ScrollArea className="h-40 pr-2 border rounded-md p-2">
            <div className="space-y-2">
                {(habit.stoppers || []).map(stopper => (
                    <div key={stopper.id} className="text-xs p-2 rounded-md bg-background group w-full text-left flex items-center justify-between">
                        <p>{stopper.text}</p>
                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => { e.stopPropagation(); handleStopperStatusChange(e, stopper.id, 'manageable'); }}>
                                <ThumbsUp className={cn("h-4 w-4", stopper.status === 'manageable' ? 'text-green-500' : 'text-muted-foreground')} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => { e.stopPropagation(); handleStopperStatusChange(e, stopper.id, 'unmanageable'); }}>
                                <ThumbsDown className={cn("h-4 w-4", stopper.status === 'unmanageable' ? 'text-red-500' : 'text-muted-foreground')} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={() => handleDeleteStopper(stopper.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
        <div className="mt-2 flex gap-2">
            <Input
                value={newStopperText}
                onChange={(e) => setNewStopperText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddStopper(); }}
                placeholder="What's the urge?"
                className="h-8 text-xs"
            />
            <Button size="sm" onClick={handleAddStopper} className="h-8">Add</Button>
        </div>
    </div>
);

const TruthSection = ({ habit, handleDeleteStrength, newStrengthText, setNewStrengthText, handleAddStrength }: { 
    habit: Resource, 
    handleDeleteStrength: (strengthId: string) => void,
    newStrengthText: string,
    setNewStrengthText: (text: string) => void,
    handleAddStrength: () => void,
}) => (
    <div>
        <ScrollArea className="h-40 pr-2 border rounded-md p-2">
            <div className="space-y-2">
                {(habit.strengths || []).map(strength => (
                    <div key={strength.id} className="text-xs flex items-center justify-between p-2 rounded-md bg-background group w-full text-left">
                        <p className="flex-grow pr-2">{strength.text}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onPointerDown={() => handleDeleteStrength(strength.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                    </div>
                ))}
            </div>
        </ScrollArea>
        <div className="mt-2 flex gap-2">
            <Input
                value={newStrengthText}
                onChange={(e) => setNewStrengthText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddStrength(); }}
                placeholder="What's the truth?"
                className="h-8 text-xs"
            />
            <Button size="sm" onClick={handleAddStrength} className="h-8">Add</Button>
        </div>
    </div>
);
