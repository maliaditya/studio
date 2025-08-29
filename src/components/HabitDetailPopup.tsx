
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

interface HabitDetailPopupProps {
  popupState: HabitDetailPopupState;
  onClose: () => void;
}

export function HabitDetailPopup({ popupState, onClose }: HabitDetailPopupProps) {
    const { habitId, x, y } = popupState;
    const { resources, setResources, mechanismCards, openGeneralPopup, patterns } = useAuth();
    
    const [newStopperText, setNewStopperText] = useState('');
    const [newStrengthText, setNewStrengthText] = useState('');
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `habit-detail-popup-${habitId}` });

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

    const negativeMechanism = mechanismCards.find(m => m.id === habit.response?.resourceId);
    const positiveMechanism = mechanismCards.find(m => m.id === habit.newResponse?.resourceId);
    
    const pattern = patterns.find(p => p.phrases.some(ph => ph.category === 'Habit Cards' && ph.mechanismCardId === habit.id));

    return (
        <div ref={setNodeRef} style={style} {...attributes} data-popup-id={`habit-${habitId}`}>
            <Card className="w-96 shadow-2xl border-2 border-primary/30 bg-card">
                <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base flex items-center gap-2">
                           {habit.name}
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={onClose}><X className="h-4 w-4" /></Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-semibold text-red-500">Negative Mechanism:</p>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-bold text-foreground">{habit.trigger?.action || '...'}:</span> {negativeMechanism?.response?.visualize || '...'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-green-500">Positive Mechanism:</p>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-bold text-foreground">{positiveMechanism?.newResponse?.action || '...'}:</span> {`Only when ${positiveMechanism?.newResponse?.visualize || '...'}, this happens.`}
                            </p>
                        </div>
                        <Tabs defaultValue="truth" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="resistance">{pattern?.type === 'Negative' ? 'Urge' : 'Resistance'}</TabsTrigger>
                                <TabsTrigger value="truth">Truth</TabsTrigger>
                            </TabsList>
                            <TabsContent value="resistance" className="mt-2">
                                <ResistanceSection habit={habit} handleDeleteStopper={handleDeleteStopper} newStopperText={newStopperText} setNewStopperText={setNewStopperText} handleAddStopper={handleAddStopper} isNegative={pattern?.type === 'Negative'}/>
                            </TabsContent>
                            <TabsContent value="truth" className="mt-2">
                                <TruthSection habit={habit} handleDeleteStrength={handleDeleteStrength} newStrengthText={newStrengthText} setNewStrengthText={setNewStrengthText} handleAddStrength={handleAddStrength} isNegative={pattern?.type === 'Negative'}/>
                            </TabsContent>
                        </Tabs>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

const ResistanceSection = ({ habit, handleDeleteStopper, newStopperText, setNewStopperText, handleAddStopper, isNegative }: { 
    habit: Resource, 
    handleDeleteStopper: (stopperId: string) => void,
    newStopperText: string,
    setNewStopperText: (text: string) => void,
    handleAddStopper: () => void,
    isNegative?: boolean
}) => {
    return (
        <div>
            <ScrollArea className="h-28 pr-2">
              <div className="space-y-2">
                  {(habit.stoppers || []).map(stopper => (
                      <div key={stopper.id} className="text-xs p-2 rounded-md bg-background group w-full text-left flex items-center justify-between">
                          <p>{stopper.text}</p>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onPointerDown={() => handleDeleteStopper(stopper.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                      </div>
                  ))}
              </div>
            </ScrollArea>
            <div className="mt-2 flex gap-2">
                <Input
                    value={newStopperText}
                    onChange={(e) => setNewStopperText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddStopper(); }}
                    placeholder={isNegative ? "What's the urge?" : "What's stopping you?"}
                    className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAddStopper} className="h-8">Add</Button>
            </div>
        </div>
    );
};

const TruthSection = ({ habit, handleDeleteStrength, newStrengthText, setNewStrengthText, handleAddStrength, isNegative }: { 
    habit: Resource, 
    handleDeleteStrength: (strengthId: string) => void,
    newStrengthText: string,
    setNewStrengthText: (text: string) => void,
    handleAddStrength: () => void,
    isNegative?: boolean
}) => {
    return (
        <div>
            <ScrollArea className="h-28 pr-2">
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
                    placeholder={isNegative ? "What's the truth?" : "What's a reinforcing truth?"}
                    className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAddStrength} className="h-8">Add</Button>
            </div>
        </div>
    );
};
