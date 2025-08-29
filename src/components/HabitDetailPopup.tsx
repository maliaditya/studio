
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

const MechanismDetailView = ({ mechanism }: { mechanism: Resource | null }) => {
    if (!mechanism) {
        return <p className="text-xs text-muted-foreground text-center py-4">No mechanism linked.</p>;
    }

    return (
        <div className="space-y-3 text-sm">
            <div>
                <p className="font-semibold text-muted-foreground text-xs">Internal Effect</p>
                <p>{mechanism.response?.visualize || '-'}</p>
            </div>
             {mechanism.mechanismFramework === 'positive' ? (
                <div>
                    <p className="font-semibold text-muted-foreground text-xs">Reward</p>
                    <p>{mechanism.reward || '-'}</p>
                </div>
            ) : (
                 <div>
                    <p className="font-semibold text-muted-foreground text-xs">Blocks</p>
                    <p>{mechanism.reward || '-'}</p>
                </div>
            )}
        </div>
    );
};


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
                                <MechanismDetailView mechanism={negativeMechanism} />
                            </div>
                             <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-green-500">New Response</h4>
                                <MechanismDetailView mechanism={positiveMechanism} />
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold text-sm text-red-500 mb-2">{pattern?.type === 'Negative' ? 'Urge' : 'Resistance'}</h4>
                                <ResistanceSection habit={habit} handleDeleteStopper={handleDeleteStopper} newStopperText={newStopperText} setNewStopperText={setNewStopperText} handleAddStopper={handleAddStopper} />
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

const ResistanceSection = ({ habit, handleDeleteStopper, newStopperText, setNewStopperText, handleAddStopper }: { 
    habit: Resource, 
    handleDeleteStopper: (stopperId: string) => void,
    newStopperText: string,
    setNewStopperText: (text: string) => void,
    handleAddStopper: () => void,
}) => {
    return (
        <div>
            <ScrollArea className={cn((habit.stoppers || []).length > 4 && "h-40", "pr-2")}>
              <div className="space-y-2">
                  {(habit.stoppers || []).map(stopper => (
                      <div key={stopper.id} className="text-xs p-2 rounded-md bg-background group w-full text-left">
                          <div className="flex items-center justify-between">
                            <p>{stopper.text}</p>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onPointerDown={() => handleDeleteStopper(stopper.id)}>
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
                    placeholder="What's stopping you?"
                    className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAddStopper} className="h-8">Add</Button>
            </div>
        </div>
    );
};

const TruthSection = ({ habit, handleDeleteStrength, newStrengthText, setNewStrengthText, handleAddStrength }: { 
    habit: Resource, 
    handleDeleteStrength: (strengthId: string) => void,
    newStrengthText: string,
    setNewStrengthText: (text: string) => void,
    handleAddStrength: () => void,
}) => {
    return (
        <div>
            <ScrollArea className={cn((habit.strengths || []).length > 4 && "h-40", "pr-2")}>
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
                    placeholder="What's a reinforcing truth?"
                    className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAddStrength} className="h-8">Add</Button>
            </div>
        </div>
    );
};
