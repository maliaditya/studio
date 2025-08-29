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

    const [activeTab, setActiveTab] = useState<'resistance' | 'truth'>('truth');
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
    
    const handleAddEntry = () => {
        if (!newTextInput.trim()) return;

        if (activeTab === 'resistance') {
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
        if (activeTab === 'resistance') {
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
    
    return (
        <>
            <div ref={setNodeRef} style={style} {...attributes} data-popup-id={habit.id}>
                <Card ref={cardRef} className="w-96 shadow-2xl border-2 border-primary/30 bg-card">
                    <CardHeader className="p-4 pb-2 relative cursor-grab" {...listeners}>
                        <div className="absolute top-2 right-2">
                           <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={(e) => { e.stopPropagation(); onClose(); }}><X className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3 text-sm">
                        <div className="text-center space-y-1">
                            <p className="text-lg font-bold text-foreground">{habit.name}</p>
                            {habit.trigger?.action && (
                                <p className="text-xs text-muted-foreground">Trigger: When I {habit.trigger.action}</p>
                            )}
                        </div>
                        <div className="pt-2 mt-2">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="resistance">{negativeMechanism?.mechanismFramework === 'negative' ? 'Urge' : 'Resistance'}</TabsTrigger>
                                <TabsTrigger value="truth">Truth</TabsTrigger>
                            </TabsList>
                            <TabsContent value="resistance" className="mt-2">
                                <ResistanceSection habit={habit} isNegative={negativeMechanism?.mechanismFramework === 'negative'}/>
                            </TabsContent>
                            <TabsContent value="truth" className="mt-2">
                                <TruthSection habit={habit} isNegative={negativeMechanism?.mechanismFramework === 'negative'}/>
                            </TabsContent>
                        </Tabs>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

const ResistanceSection = ({ habit, isNegative }: { habit: Resource, isNegative: boolean }) => {
    const { setResources, openGeneralPopup } = useAuth();
    const [newStopperText, setNewStopperText] = useState('');
    const placeholder = isNegative ? "What's the urge?" : "What's stopping you?";
    const cardRef = useRef<HTMLDivElement>(null);
  
    const handleAddStopper = () => {
        if (!newStopperText.trim()) return;
        const newStopper: Stopper = {
            id: `stopper_${Date.now()}`,
            text: newStopperText.trim(),
            status: 'none',
        };
        setResources(prev => prev.map(r => 
            r.id === habit.id ? { ...r, stoppers: [...(r.stoppers || []), newStopper] } : r
        ));
        setNewStopperText('');
    };

    const handleDeleteStopper = (stopperId: string) => {
        setResources(prev => prev.map(r => 
            r.id === habit.id ? { ...r, stoppers: (r.stoppers || []).filter(s => s.id !== stopperId) } : r
        ));
    };

    const handleStopperStatusChange = (e: React.PointerEvent, stopperId: string, status: Stopper['status']) => {
        e.stopPropagation();
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                const updatedStoppers = (r.stoppers || []).map(s => 
                    s.id === stopperId ? { ...s, status: s.status === status ? 'none' : status } : s
                );
                return { ...r, stoppers: updatedStoppers };
            }
            return r;
        }));
    };

    return (
        <div ref={cardRef}>
            <ScrollArea className={cn((habit.stoppers || []).length > 4 && "h-40", "pr-2")}>
              <div className="space-y-2">
                  {(habit.stoppers || []).map(stopper => (
                      <div key={stopper.id} className={cn("text-xs p-2 rounded-md bg-background group w-full text-left", !!stopper.linkedResourceId && "cursor-pointer hover:bg-muted/50")}
                      >
                          <div className="flex items-start justify-between">
                                <p className="flex-grow pr-2">{stopper.text}</p>
                                <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => handleStopperStatusChange(e, stopper.id, 'manageable')}>
                                        <ThumbsUp className={cn("h-4 w-4", stopper.status === 'manageable' ? 'text-green-500' : 'text-muted-foreground')} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => handleStopperStatusChange(e, stopper.id, 'unmanageable')}>
                                        <ThumbsDown className={cn("h-4 w-4", stopper.status === 'unmanageable' ? 'text-red-500' : 'text-muted-foreground')} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => handleDeleteStopper(stopper.id)}>
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                </div>
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
                    placeholder={placeholder}
                    className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAddStopper} className="h-8">Add</Button>
            </div>
        </div>
    );
};

const TruthSection = ({ habit, isNegative }: { habit: Resource, isNegative: boolean }) => {
    const { setResources } = useAuth();
    const [newStrengthText, setNewStrengthText] = useState('');
    const placeholder = isNegative ? "What's the truth?" : "What's a reinforcing truth?";
  
    const handleAddStrength = () => {
        if (!newStrengthText.trim()) return;
        const newStrength: Strength = {
            id: `strength_${Date.now()}`,
            text: newStrengthText.trim(),
        };
        setResources(prev => prev.map(r => 
            r.id === habit.id ? { ...r, strengths: [...(r.strengths || []), newStrength] } : r
        ));
        setNewStrengthText('');
    };

    const handleDeleteStrength = (strengthId: string) => {
        setResources(prev => prev.map(r => 
            r.id === habit.id ? { ...r, strengths: (r.strengths || []).filter(s => s.id !== strengthId) } : r
        ));
    };

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
                    placeholder={placeholder}
                    className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAddStrength} className="h-8">Add</Button>
            </div>
        </div>
    );
};
