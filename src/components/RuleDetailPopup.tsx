

"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Edit, Save, Trash2, Check, X, BookOpen, ArrowRight, TrendingUp, Briefcase, HeartPulse, ArrowDown, DollarSign, Shield, Zap, Lightbulb, Brain, HandHeart, Package, Activity, ShoppingBag, Smile, Link as LinkIconLucide, Pill, Lock, ArrowLeft, ThumbsUp, ThumbsDown, Workflow } from 'lucide-react';
import type { Resource, DatedWorkout, MetaRule, ExerciseDefinition, CoreSkill, PurposePillar, PopupState, Project, Stopper, Pattern, Strength, RuleDetailPopupState } from '@/types/workout';
import { DndContext, type DragEndEvent, useDraggable } from '@dnd-kit/core';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, subDays, parseISO, isBefore, startOfToday, addDays, isAfter } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogPortal } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';


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
        zIndex: 115,
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
                            <SelectContent>
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


export const RuleDetailPopupCard = ({ popupState, onClose }: { 
    popupState: RuleDetailPopupState;
    onClose: () => void; 
}) => {
    const { patterns, habitCards, mechanismCards, openGeneralPopup, metaRules, resources, setResources, handleRulePopupDragEnd } = useAuth();
    const { ruleId, x, y } = popupState;
    const rule = metaRules.find(r => r.id === ruleId);
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `rule-popup-${rule?.id}` });
    const cardRef = useRef<HTMLDivElement>(null);

    const [logicDiagramRule, setLogicDiagramRule] = useState<LogicDiagramPopupState | null>(null);
    const [manageResistancePopupState, setManageResistancePopupState] = useState<ManageResistancePopupState | null>(null);
    const [currentHabitIndex, setCurrentHabitIndex] = useState(0);

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

    useEffect(() => {
        setCurrentHabitIndex(0);
    }, [ruleId]);

    if (!rule) return null;

    const pattern = patterns.find(p => p.id === rule.patternId);
    
    const linkedHabits = useMemo(() => {
        if (!pattern) return [];
        const habitPhrases = pattern.phrases.filter(p => p.category === 'Habit Cards');
        return habitPhrases.map(phrase => {
            return habitCards.find(h => h.id === phrase.mechanismCardId);
        }).filter((h): h is Resource => !!h);
    }, [pattern, habitCards]);

    const currentHabit = linkedHabits[currentHabitIndex];

    const categorizedPhrasesForHabit = useMemo(() => {
        if (!pattern || !currentHabit) return {};

        const relevantMechanismIds = new Set([
            currentHabit.response?.resourceId,
            currentHabit.newResponse?.resourceId
        ].filter(Boolean));

        return pattern.phrases.reduce((acc, phrase) => {
            if (phrase.category === 'Habit Cards' || !relevantMechanismIds.has(phrase.mechanismCardId)) {
                return acc;
            }
            if (!acc[phrase.category]) {
                acc[phrase.category] = [];
            }
            acc[phrase.category].push(phrase.text);
            return acc;
        }, {} as Record<string, string[]>);
    }, [pattern, currentHabit]);


    const handleNextHabit = () => {
        setCurrentHabitIndex((prevIndex) => (prevIndex + 1) % linkedHabits.length);
    };

    const handlePrevHabit = () => {
        setCurrentHabitIndex((prevIndex) => (prevIndex - 1 + linkedHabits.length) % linkedHabits.length);
    };


    const handleAddStopper = (habitId: string, newStopperText: string) => {
        if (!newStopperText.trim()) return;
        const newStopper: Stopper = {
            id: `stopper_${Date.now()}`,
            text: newStopperText.trim(),
            status: 'none',
        };
        setResources(prev => prev.map(r => {
            if (r.id === habitId) {
                return { ...r, stoppers: [...(r.stoppers || []), newStopper] };
            }
            return r;
        }));
    };
    
    const handleAddStrength = (habitId: string, newStrengthText: string) => {
        if (!newStrengthText.trim()) return;
        const newStrength: Strength = {
            id: `strength_${Date.now()}`,
            text: newStrengthText.trim(),
        };
        setResources(prev => prev.map(r => {
            if (r.id === habitId) {
                return { ...r, strengths: [...(r.strengths || []), newStrength] };
            }
            return r;
        }));
    };

    const handleDeleteStopper = (habitId: string, stopperId: string) => {
        setResources(prev => prev.map(r => {
            if (r.id === habitId) {
                return { ...r, stoppers: (r.stoppers || []).filter(s => s.id !== stopperId) };
            }
            return r;
        }));
    };
    
    const handleDeleteStrength = (habitId: string, strengthId: string) => {
        setResources(prev => prev.map(r => {
            if (r.id === habitId) {
                return { ...r, strengths: (r.strengths || []).filter(s => s.id !== strengthId) };
            }
            return r;
        }));
    };

    const handleStopperStatusChange = (e: React.PointerEvent, habitId: string, stopperId: string, status: Stopper['status']) => {
        e.stopPropagation();
        const habit = resources.find(r => r.id === habitId);
        const stopper = habit?.stoppers?.find(s => s.id === stopperId);

        if (status === 'manageable' && stopper) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setManageResistancePopupState({
                habitId,
                stopper,
                x: rect.right + 10,
                y: rect.top
            });
        } else {
            setResources(prev => prev.map(r => {
                if (r.id === habitId) {
                    const updatedStoppers = (r.stoppers || []).map(s => 
                        s.id === stopperId ? { ...s, status: s.status === status ? 'none' : status } : s
                    );
                    return { ...r, stoppers: updatedStoppers };
                }
                return r;
            }));
        }
    };
    
    const ResistanceSection = ({ habit, isNegative }: { habit: Resource, isNegative: boolean }) => {
        const [newStopperText, setNewStopperText] = useState('');
        const placeholder = isNegative ? "What's the urge?" : "What's stopping you?";
      
        return (
            <div>
                <ScrollArea className={cn((habit.stoppers || []).length > 4 && "h-40", "pr-2")}>
                  <div className="space-y-2">
                      {(habit.stoppers || []).map(stopper => {
                          const isClickable = !!stopper.linkedResourceId;
                          return (
                            <div
                                key={stopper.id}
                                className={cn(
                                    "text-xs p-2 rounded-md bg-background group w-full text-left",
                                    isClickable ? "cursor-pointer hover:bg-muted/50" : "flex items-center justify-between"
                                )}
                                onClick={(e) => {
                                    if (isClickable && cardRef.current) {
                                        e.stopPropagation();
                                        openGeneralPopup(stopper.linkedResourceId!, e, popupState, cardRef.current.getBoundingClientRect());
                                    }
                                }}
                            >
                                  <div className="flex-grow pr-2">
                                    <p>{stopper.text}</p>
                                    {stopper.managementStrategy && (
                                      <p className="text-muted-foreground text-blue-600 dark:text-blue-400 mt-1 italic">
                                        Strategy: {stopper.managementStrategy}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => { handleStopperStatusChange(e, habit.id, stopper.id, 'manageable'); }}>
                                          <ThumbsUp className={cn("h-4 w-4", stopper.status === 'manageable' ? 'text-green-500' : 'text-muted-foreground')} />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => { e.stopPropagation(); handleStopperStatusChange(e, habit.id, 'unmanageable'); }}>
                                          <ThumbsDown className={cn("h-4 w-4", stopper.status === 'unmanageable' ? 'text-red-500' : 'text-muted-foreground')} />
                                      </Button>
                                       <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => handleDeleteStopper(habit.id, stopper.id)}>
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
                </ScrollArea>
                <div className="mt-2 flex gap-2">
                    <Input
                        value={newStopperText}
                        onChange={(e) => setNewStopperText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { handleAddStopper(habit.id, newStopperText); setNewStopperText(''); } }}
                        placeholder={placeholder}
                        className="h-8 text-xs"
                    />
                    <Button size="sm" onClick={() => { handleAddStopper(habit.id, newStopperText); setNewStopperText(''); }} className="h-8">Add</Button>
                </div>
            </div>
        );
      };

    const TruthSection = ({ habit, isNegative }: { habit: Resource, isNegative: boolean }) => {
        const [newStrengthText, setNewStrengthText] = useState('');
        const placeholder = isNegative ? "What's the truth?" : "What's a reinforcing truth?";
      
        return (
            <div>
                <ScrollArea className={cn((habit.strengths || []).length > 4 && "h-40", "pr-2")}>
                  <div className="space-y-2">
                      {(habit.strengths || []).map(strength => (
                          <div key={strength.id} className="text-xs flex items-center justify-between p-2 rounded-md bg-background group w-full text-left">
                              <p className="flex-grow pr-2">{strength.text}</p>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onPointerDown={() => handleDeleteStrength(habit.id, strength.id)}>
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
                        onKeyDown={(e) => { if (e.key === 'Enter') { handleAddStrength(habit.id, newStrengthText); setNewStrengthText(''); } }}
                        placeholder={placeholder}
                        className="h-8 text-xs"
                    />
                    <Button size="sm" onClick={() => { handleAddStrength(habit.id, newStrengthText); setNewStrengthText(''); }} className="h-8">Add</Button>
                </div>
            </div>
        );
    };


    return (
        <>
            <div ref={setNodeRef} style={style} {...attributes} data-popup-id={rule.id}>
                <Card ref={cardRef} className="w-[600px] shadow-2xl border-2 border-primary/30 bg-card">
                    <CardHeader className="p-4 relative cursor-grab" {...listeners}>
                        <div className="flex justify-between items-start">
                            <div className="flex-grow pr-10">
                                <CardTitle className="text-lg">{rule.text}</CardTitle>
                                {pattern && (
                                    <CardDescription>Based on pattern: <span className="font-semibold text-foreground">{pattern.name}</span></CardDescription>
                                )}
                            </div>
                            <div className="flex items-center flex-shrink-0 absolute top-2 right-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={(e) => { e.stopPropagation(); setLogicDiagramRule({ rule }); }}>
                                    <Workflow className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={(e) => { e.stopPropagation(); onClose(); }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                            {/* Left Column: Phrases */}
                            <div className="space-y-4">
                                {categorizedPhrasesForHabit && Object.entries(categorizedPhrasesForHabit).map(([category, phrases]) => (
                                    <div key={category}>
                                        <h4 className="font-semibold text-sm mb-2 border-b pb-1">{category}</h4>
                                        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                            {phrases.map((phrase, i) => <li key={i}>{phrase}</li>)}
                                        </ul>
                                    </div>
                                ))}
                            </div>

                            {/* Right Column: Habits and Resistance/Truth */}
                            <div className="space-y-4">
                                {linkedHabits.length > 0 && currentHabit && (
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2 border-b pb-1">
                                            Linked Habit ({currentHabitIndex + 1}/{linkedHabits.length})
                                        </h4>
                                        <div className="space-y-2">
                                            <Card key={currentHabit.id} className="bg-muted/50">
                                                <CardHeader className="p-3">
                                                    <CardTitle 
                                                    className="text-sm font-semibold text-foreground mb-1 cursor-pointer hover:underline"
                                                    onClick={(e) => {
                                                        if (cardRef.current) {
                                                            openGeneralPopup(currentHabit.id, e, popupState, cardRef.current.getBoundingClientRect());
                                                        }
                                                    }}
                                                    >
                                                    {currentHabit.name}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-3 pt-0 text-xs space-y-2">
                                                    <div>
                                                        <p className="font-medium text-red-600 dark:text-red-400">Negative Mechanism:</p>
                                                        <p className="text-muted-foreground">{mechanismCards.find(m => m.id === currentHabit.response?.resourceId)?.response?.visualize || '...'} <span className="text-xs italic">({mechanismCards.find(m => m.id === currentHabit.response?.resourceId)?.name || 'Unlinked'})</span></p>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-green-600 dark:text-green-400">Positive Mechanism:</p>
                                                        <p className="text-muted-foreground">{mechanismCards.find(m => m.id === currentHabit.newResponse?.resourceId)?.newResponse?.action || '...'} <span className="text-xs italic">({mechanismCards.find(m => m.id === currentHabit.newResponse?.resourceId)?.name || 'Unlinked'})</span></p>
                                                    </div>
                                                    <div className="pt-2 mt-2">
                                                    <Tabs defaultValue="resistance" className="w-full">
                                                        <TabsList className="grid w-full grid-cols-2">
                                                            <TabsTrigger value="resistance">{pattern?.type === 'Negative' ? 'Urge' : 'Resistance'}</TabsTrigger>
                                                            <TabsTrigger value="truth">Truth</TabsTrigger>
                                                        </TabsList>
                                                        <TabsContent value="resistance" className="mt-2">
                                                            <ResistanceSection habit={currentHabit} isNegative={pattern?.type === 'Negative'}/>
                                                        </TabsContent>
                                                        <TabsContent value="truth" className="mt-2">
                                                            <TruthSection habit={currentHabit} isNegative={pattern?.type === 'Negative'}/>
                                                        </TabsContent>
                                                    </Tabs>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                     {linkedHabits.length > 1 && (
                        <CardFooter className="p-2 flex justify-between items-center">
                            <Button variant="ghost" size="sm" onClick={handlePrevHabit} className="truncate">
                                <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                                <span className="truncate">
                                    {linkedHabits[(currentHabitIndex - 1 + linkedHabits.length) % linkedHabits.length].name}
                                </span>
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                {currentHabitIndex + 1} / {linkedHabits.length}
                            </span>
                            <Button variant="ghost" size="sm" onClick={handleNextHabit} className="truncate">
                                 <span className="truncate">
                                    {linkedHabits[(currentHabitIndex + 1) % linkedHabits.length].name}
                                </span>
                                <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
            {logicDiagramRule && (
                <LogicDiagramPopup 
                    popupState={logicDiagramRule} 
                    onClose={() => setLogicDiagramRule(null)} 
                />
            )}
             {manageResistancePopupState && (
                <ManageResistancePopup
                    habit={resources.find(r => r.id === manageResistancePopupState.habitId)!}
                    popupState={manageResistancePopupState}
                    onClose={() => setManageResistancePopupState(null)}
                />
            )}
        </>
    );
};
