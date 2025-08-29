"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Workflow, ArrowDown, ThumbsUp, ThumbsDown, Trash2, PlusCircle, Link as LinkIcon, Edit2, PieChart as PieChartIcon, Brain, GitBranch } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { HabitDetailPopupState, Resource, Stopper, Strength, PopupState, MetaRule } from '@/types/workout';
import { EditableField, EditableResponse } from './EditableFields';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Separator } from './ui/separator';
import { format, parseISO } from 'date-fns';

interface LogicDiagramPopupState {
    rule: MetaRule;
}

interface ManageResistancePopupState {
    habitId: string;
    stopper: Stopper;
    x: number;
    y: number;
}


const FlowNode = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("bg-card border p-2 rounded-md text-center text-xs shadow", className)}>
        {children}
    </div>
);

const LogicDiagramPopup = ({ popupState, onClose }: { popupState: LogicDiagramPopupState; onClose: () => void; }) => {
    const { rule } = popupState;
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `logic-diagram-${rule.id}` });
    const { habitCards, mechanismCards, patterns } = useAuth();
    
    const pattern = patterns.find(p => p.id === rule.patternId);

    const style: React.CSSProperties = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: transform ? `translate3d(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px), 0)` : 'translate(-50%, -50%)',
        zIndex: 110,
    };

    const linkedHabit = useMemo(() => {
        if (!pattern) return null;
        const habitPhrase = pattern.phrases.find(p => p.category === 'Habit Cards');
        if (!habitPhrase) return null;
        return habitCards.find(h => h.id === habitPhrase.mechanismCardId);
    }, [pattern, habitCards]);

    if (!linkedHabit) {
        return (
            <div ref={setNodeRef} style={style} {...attributes}>
                <Card className="w-[400px] shadow-2xl border-2 border-primary/30 bg-card">
                     <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base flex items-center gap-2"><Workflow className="h-4 w-4 text-primary"/>Decision Logic</CardTitle>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={onClose}><X className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 text-center text-muted-foreground">
                        No Habit Card is linked to this pattern. A logic diagram cannot be generated.
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    const negativeMechanism = mechanismCards.find(m => m.id === linkedHabit.response?.resourceId);
    const positiveMechanism = mechanismCards.find(m => m.id === linkedHabit.newResponse?.resourceId);
    const stoppers = linkedHabit.stoppers || [];
    
    const negativeCosts = [
        negativeMechanism?.reward ? `Blocks: ${negativeMechanism.reward}` : null,
        negativeMechanism?.benefit ? `Costs me: ${negativeMechanism.benefit}` : null
    ].filter(Boolean);

    const positiveBenefits = [
        positiveMechanism?.benefit ? `Enables: ${positiveMechanism.benefit}` : null,
        positiveMechanism?.reward ? `Gives me: ${positiveMechanism.reward}` : null
    ].filter(Boolean);


    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className="w-auto max-w-[90vw] shadow-2xl border-2 border-primary/30 bg-card">
                <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base flex items-center gap-2"><Workflow className="h-4 w-4 text-primary"/>Decision Logic for: "{rule.text}"</CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={onClose}><X className="h-4 w-4" /></Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <div className="flex flex-col items-center space-y-2">
                        <FlowNode>Trigger: When I {linkedHabit.trigger?.action || '...'}</FlowNode>
                        <ArrowDown className="h-5 w-5 text-muted-foreground" />
                        <FlowNode className="font-bold bg-primary/10">{rule.text}</FlowNode>
                        <ArrowDown className="h-5 w-5 text-muted-foreground" />
                        
                        <div className="flex w-full justify-around items-start gap-4">
                            {/* Negative Path */}
                            <div className="flex flex-col items-center space-y-2 w-1/2">
                                <Badge variant="destructive">Old Path</Badge>
                                <ArrowDown className="h-5 w-5 text-muted-foreground" />
                                <FlowNode className="bg-red-100/50 border-red-500/50 w-full">Response: {linkedHabit.response?.visualize || '...'}</FlowNode>
                                {stoppers.length > 0 && (
                                    <>
                                        <ArrowDown className="h-5 w-5 text-muted-foreground" />
                                        <FlowNode className="border-yellow-500/50 bg-yellow-100/30 w-full">
                                            <p className="font-semibold text-yellow-700 dark:text-yellow-300">Resistance</p>
                                            <ul className="list-disc list-inside text-left mt-1">
                                                {stoppers.map(s => <li key={s.id}>{s.text}</li>)}
                                            </ul>
                                        </FlowNode>
                                    </>
                                )}
                                <ArrowDown className="h-5 w-5 text-muted-foreground" />
                                <FlowNode className="w-full bg-red-100/20">
                                    <p className="font-semibold">Costs & Consequences</p>
                                    <ul className="list-disc list-inside text-left mt-1">
                                        {negativeCosts.length > 0 ? negativeCosts.map((c, i) => <li key={i}>{c}</li>) : <li>Not specified</li>}
                                    </ul>
                                </FlowNode>
                            </div>

                             {/* Positive Path */}
                            <div className="flex flex-col items-center space-y-2 w-1/2">
                                <Badge variant="secondary" className="bg-green-600 text-white">New Path</Badge>
                                <ArrowDown className="h-5 w-5 text-muted-foreground" />
                                <FlowNode className="bg-green-100/50 border-green-500/50 w-full">New Response: {linkedHabit.newResponse?.action || '...'}</FlowNode>
                                <ArrowDown className="h-5 w-5 text-muted-foreground" />
                                <FlowNode className="w-full bg-green-100/20">
                                     <p className="font-semibold">Benefits & Rewards</p>
                                     <ul className="list-disc list-inside text-left mt-1">
                                        {positiveBenefits.length > 0 ? positiveBenefits.map((b, i) => <li key={i}>{b}</li>) : <li>Not specified</li>}
                                    </ul>
                                </FlowNode>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const ManageResistancePopup = ({ habit, popupState, onClose }: {
    habit: Resource;
    popupState: ManageResistancePopupState;
    onClose: () => void;
}) => {
    const { setResources, resources: allResources } = useAuth();
    const { stopper, x, y } = popupState;
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `manage-resistance-${stopper.id}` });
    
    const [managementStrategy, setManagementStrategy] = useState(stopper.managementStrategy || '');
    const [linkedResourceId, setLinkedResourceId] = useState(stopper.linkedResourceId || '');

    const style: React.CSSProperties = {
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 75,
        willChange: 'transform',
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }

    const handleSaveManagementStrategy = () => {
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                const updatedStoppers = (r.stoppers || []).map(s =>
                    s.id === stopper.id ? { ...s, status: 'manageable', managementStrategy: managementStrategy.trim(), linkedResourceId: linkedResourceId || undefined } : s
                );
                return { ...r, stoppers: updatedStoppers };
            }
            return r;
        }));
        onClose();
    };

    return (
            <div ref={setNodeRef} style={style} {...attributes}>
                <Card className="w-96 shadow-2xl border-2 border-primary/30 bg-card">
                    <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base">Manage Resistance</CardTitle>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={(e) => { e.stopPropagation(); onClose(); }}><X className="h-4 w-4" /></Button>
                        </div>
                        <CardDescription>Create a strategy to overcome this obstacle.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        <p className="font-semibold border p-3 rounded-md bg-muted/50 text-sm">"{stopper.text}"</p>
                        <div>
                            <Label htmlFor="management-strategy">How will you manage this?</Label>
                            <Textarea 
                                id="management-strategy" 
                                value={managementStrategy}
                                onChange={(e) => setManagementStrategy(e.target.value)}
                                placeholder="e.g., Use the 2-minute rule, put my phone in another room..."
                            />
                        </div>
                        <div>
                            <Label htmlFor="linked-resource">Link a Resource Card (Optional)</Label>
                            <Select value={linkedResourceId || 'none'} onValueChange={(value) => setLinkedResourceId(value === 'none' ? '' : value)}>
                                <SelectTrigger id="linked-resource">
                                    <SelectValue placeholder="Select a resource..." />
                                </SelectTrigger>
                                <SelectContent side="right" align="start" sideOffset={5}>
                                    <SelectItem value="none">-- None --</SelectItem>
                                    {allResources.filter(card => card.type === 'habit' || card.type === 'mechanism').map(card => (
                                        <SelectItem key={card.id} value={card.id}>{card.name} ({card.type})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter className="p-3 flex justify-end gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSaveManagementStrategy}>Save Strategy</Button>
                    </CardFooter>
                </Card>
            </div>
    );
};


export function HabitDetailPopup({ popupState, onClose }: { 
    popupState: HabitDetailPopupState;
    onClose: () => void; 
}) {
    const { setResources, mechanismCards } = useAuth();
    const { habitId, x, y } = popupState;
    const habit = useAuth().habitCards.find(h => h.id === habitId);
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `habit-detail-popup-${habit?.id}` });
    const cardRef = useRef<HTMLDivElement>(null);

    const [activeTab, setActiveTab] = useState<'urge' | 'truth'>('truth');
    const [newTextInput, setNewTextInput] = useState('');

    const style: React.CSSProperties = {
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 60,
        willChange: 'transform',
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }
    
    if (!habit) return null;
    
    const negativeMechanism = mechanismCards.find(m => m.id === habit.response?.resourceId);
    const positiveMechanism = mechanismCards.find(m => m.id === habit.newResponse?.resourceId);
    
    const handleAddEntry = () => {
        if (!newTextInput.trim()) return;

        if (activeTab === 'urge') {
            const newStopper: Stopper = {
                id: `stopper_${Date.now()}`,
                text: newTextInput.trim(),
                status: 'none',
            };
             setResources(prev => prev.map(r => {
                if (r.id === habit.id) {
                    return { ...r, stoppers: [...(r.stoppers || []), newStopper] };
                }
                return r;
            }));
        } else {
            const newStrength: Strength = {
                id: `strength_${Date.now()}`,
                text: newTextInput.trim(),
            };
            setResources(prev => prev.map(r => {
                if (r.id === habit.id) {
                    return { ...r, strengths: [...(r.strengths || []), newStrength] };
                }
                return r;
            }));
        }
        setNewTextInput('');
    };
    
    const handleDeleteEntry = (entryId: string) => {
        if (activeTab === 'urge') {
            setResources(prev => prev.map(r => {
                if (r.id === habit.id) {
                    return { ...r, stoppers: (r.stoppers || []).filter(s => s.id !== entryId) };
                }
                return r;
            }));
        } else {
            setResources(prev => prev.map(r => {
                if (r.id === habit.id) {
                    return { ...r, strengths: (r.strengths || []).filter(s => s.id !== entryId) };
                }
                return r;
            }));
        }
    };
    
    const listItems = activeTab === 'urge' ? (habit.stoppers || []) : (habit.strengths || []);

    return (
        <>
            <div ref={setNodeRef} style={style} {...attributes} data-popup-id={habit.id}>
                <Card ref={cardRef} className="w-96 shadow-2xl border-2 border-primary/30 bg-card">
                    <CardHeader className="p-4 pb-2 relative cursor-grab" {...listeners}>
                        <CardTitle className="text-lg pr-8">{habit.name}</CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7 absolute top-2 right-2" onPointerDown={(e) => { e.stopPropagation(); onClose(); }}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3 text-sm">
                        <div>
                            <p className="text-red-500 font-semibold">Negative Mechanism:</p>
                            <p className="text-muted-foreground">
                                <span className="font-bold text-foreground">{negativeMechanism?.trigger?.action || 'Smoking'}:</span> It causes {negativeMechanism?.response?.visualize || 'lung irritation and reduced oxygen flow'} internally.
                            </p>
                        </div>
                         <div>
                            <p className="text-green-500 font-semibold">Positive Mechanism:</p>
                            <p className="text-muted-foreground">
                                <span className="font-bold text-foreground">{positiveMechanism?.trigger?.action || 'Brisk Walk'}:</span> Only when I {positiveMechanism?.newResponse?.visualize || 'choose movement over smoking'}, my body {positiveMechanism?.newResponse?.action || 'stays healthier'} happens.
                            </p>
                        </div>
                        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'urge' | 'truth')} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="urge">Urge</TabsTrigger>
                                <TabsTrigger value="truth">Truth</TabsTrigger>
                            </TabsList>
                            <TabsContent value={activeTab}>
                                <div className="mt-2">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={activeTab === 'urge' ? "What's the urge?" : "What's the truth?"}
                                            value={newTextInput}
                                            onChange={(e) => setNewTextInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddEntry(); }}
                                            className="h-9"
                                        />
                                        <Button onClick={handleAddEntry} size="sm" className="h-9">Add</Button>
                                    </div>
                                    <ScrollArea className="h-32 mt-3 pr-2">
                                        <div className="space-y-2">
                                            {listItems.map(item => (
                                                <div key={item.id} className="flex justify-between items-center group text-xs p-2 rounded-md bg-muted/50">
                                                    <p className="flex-grow pr-2">{item.text}</p>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDeleteEntry(item.id)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {listItems.length === 0 && <p className="text-center text-xs text-muted-foreground pt-8">No entries yet.</p>}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};