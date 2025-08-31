
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Edit, Save, Trash2, Check, X, BookOpen, ArrowRight, TrendingUp, Briefcase, HeartPulse, ArrowDown, DollarSign, Shield, Zap, Lightbulb, Brain, HandHeart, Package, Activity, ShoppingBag, Smile, Link as LinkIcon, Pill, Lock, ArrowLeft, ThumbsUp, ThumbsDown, Workflow, PlusCircle, Target, Unlink } from 'lucide-react';
import type { Resource, DatedWorkout, MetaRule, ExerciseDefinition, CoreSkill, PurposePillar, PopupState, Project, Stopper, Pattern, Strength, RuleDetailPopupState, HabitDetailPopupState, HabitEquation } from '@/types/workout';
import { useDraggable } from '@dnd-kit/core';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Badge } from './ui/badge';


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


const ResistanceSection = React.memo(({ habit, isNegative, onAddStopper, onDeleteStopper, onStopperStatusChange, onLinkTechnique }: { 
    habit: Resource, 
    isNegative: boolean,
    onAddStopper: (text: string) => void,
    onDeleteStopper: (stopperId: string) => void,
    onStopperStatusChange: (e: React.PointerEvent, stopperId: string, status: Stopper['status']) => void,
    onLinkTechnique: (stopperId: string, techniqueId: string | null) => void,
}) => {
    const { openGeneralPopup, mindProgrammingDefinitions } = useAuth();
    const [newStopperText, setNewStopperText] = useState('');
    const placeholder = isNegative ? "What's the urge?" : "What's stopping you?";
  
    const handleAdd = () => {
        onAddStopper(newStopperText);
        setNewStopperText('');
    };

    return (
        <div>
            <ScrollArea className={cn((habit.stoppers || []).length > 4 && "h-40", "pr-2")}>
              <div className="space-y-2">
                  {(habit.stoppers || []).map(stopper => {
                      const isClickable = !!stopper.linkedResourceId;
                      const linkedTechnique = mindProgrammingDefinitions.find(t => t.id === stopper.linkedTechniqueId);
                      return (
                        <div key={stopper.id} className="text-xs p-2 rounded-md bg-background group w-full text-left">
                              <div className="flex items-start justify-between">
                                  <div className="flex-grow pr-2">
                                    <p
                                      className={cn(isClickable ? "cursor-pointer hover:underline" : "")}
                                      onClick={(e) => {
                                          if (isClickable) {
                                              e.stopPropagation();
                                              openGeneralPopup(stopper.linkedResourceId!, e);
                                          }
                                      }}
                                    >{stopper.text}</p>
                                    {stopper.managementStrategy && (
                                      <p className="text-muted-foreground text-blue-600 dark:text-blue-400 mt-1 italic">
                                        Strategy: {stopper.managementStrategy}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => { onStopperStatusChange(e, stopper.id, 'manageable'); }}>
                                          <ThumbsUp className={cn("h-4 w-4", stopper.status === 'manageable' ? 'text-green-500' : 'text-muted-foreground')} />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => { e.stopPropagation(); onStopperStatusChange(e, stopper.id, 'unmanageable'); }}>
                                          <ThumbsDown className={cn("h-4 w-4", stopper.status === 'unmanageable' ? 'text-red-500' : 'text-muted-foreground')} />
                                      </Button>
                                       <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={() => onDeleteStopper(stopper.id)}>
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                  </div>
                              </div>
                              <div className="mt-2 pt-2 border-t flex items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="xs" className="text-xs h-6 px-2">
                                            <PlusCircle className="h-3.5 w-3.5 mr-1"/>
                                            {linkedTechnique ? 'Change' : 'Assign'} Technique
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56 p-0 z-[150]">
                                        <Select onValueChange={(techId) => onLinkTechnique(stopper.id, techId)}>
                                            <SelectTrigger><SelectValue placeholder="Select a technique..." /></SelectTrigger>
                                            <SelectContent>
                                                {mindProgrammingDefinitions.map(tech => (
                                                    <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </PopoverContent>
                                </Popover>
                                {linkedTechnique && (
                                    <Badge variant="secondary" className="font-normal truncate flex-1">
                                        <span className="truncate">{linkedTechnique.name}</span>
                                         <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 -mr-1" onClick={() => onLinkTechnique(stopper.id, null)}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </Badge>
                                )}
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
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleAdd(); } }}
                    placeholder={placeholder}
                    className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAdd} className="h-8">Add</Button>
            </div>
        </div>
    );
});
ResistanceSection.displayName = 'ResistanceSection';

const TruthSection = React.memo(({ habit, onAddStrength, onDeleteStrength }: {
    habit: Resource,
    onAddStrength: (text: string) => void,
    onDeleteStrength: (strengthId: string) => void
}) => {
    const [newStrengthText, setNewStrengthText] = useState('');
    const placeholder = "What's a reinforcing truth?";
    
    const handleAdd = () => {
        onAddStrength(newStrengthText);
        setNewStrengthText('');
    };

    return (
        <div>
            <ScrollArea className={cn((habit.strengths || []).length > 4 && "h-40", "pr-2")}>
              <div className="space-y-2">
                  {(habit.strengths || []).map(strength => (
                      <div key={strength.id} className="text-xs flex items-center justify-between p-2 rounded-md bg-background group w-full text-left">
                          <p className="flex-grow pr-2">{strength.text}</p>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onPointerDown={() => onDeleteStrength(strength.id)}>
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
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleAdd(); } }}
                    placeholder={placeholder}
                    className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAdd} className="h-8">Add</Button>
            </div>
        </div>
    );
});
TruthSection.displayName = 'TruthSection';

export function HabitDetailPopup({ popupState, onClose }: { 
    popupState: HabitDetailPopupState;
    onClose: () => void; 
}) {
    const { setResources, mechanismCards, resources, openGeneralPopup, mindProgrammingDefinitions, patterns, habitCards } = useAuth();
    const { habitId, x, y } = popupState;
    const habit = resources.find(r => r.id === habitId);
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `habit-detail-popup-${habit?.id}` });
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
    }, [habitId]);
    
    const pattern = useMemo(() => {
        if (!habit) return null;
        return patterns.find(p => p.phrases.some(ph => ph.category === 'Habit Cards' && ph.mechanismCardId === habit.id));
    }, [habit, patterns]);


    const handleAddStopper = useCallback((habitId: string, newStopperText: string) => {
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
    }, [setResources]);
    
    const handleAddStrength = useCallback((habitId: string, newStrengthText: string) => {
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
    }, [setResources]);

    const handleDeleteStopper = useCallback((habitId: string, stopperId: string) => {
        setResources(prev => prev.map(r => {
            if (r.id === habitId) {
                return { ...r, stoppers: (r.stoppers || []).filter(s => s.id !== stopperId) };
            }
            return r;
        }));
    }, [setResources]);
    
    const handleDeleteStrength = useCallback((habitId: string, strengthId: string) => {
        setResources(prev => prev.map(r => {
            if (r.id === habitId) {
                return { ...r, strengths: (r.strengths || []).filter(s => s.id !== strengthId) };
            }
            return r;
        }));
    }, [setResources]);

    const handleStopperStatusChange = useCallback((e: React.PointerEvent, habitId: string, stopperId: string, status: Stopper['status']) => {
        e.stopPropagation();
        const habitForStopper = resources.find(r => r.id === habitId);
        const stopper = habitForStopper?.stoppers?.find(s => s.id === stopperId);

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
    }, [resources, setResources]);
    
    const handleLinkTechniqueToStopper = useCallback((stopperId: string, techniqueId: string | null) => {
        if (!habit) return;
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                const updatedStoppers = (r.stoppers || []).map(s => 
                    s.id === stopperId ? { ...s, linkedTechniqueId: techniqueId === null ? undefined : techniqueId } : s
                );
                return { ...r, stoppers: updatedStoppers };
            }
            return r;
        }));
    }, [habit, setResources]);

    if (!habit) return null;
    
    const negativeMechanism = habit ? mechanismCards.find(m => m.id === habit.response?.resourceId) : null;
    const positiveMechanism = habit ? mechanismCards.find(m => m.id === habit.newResponse?.resourceId) : null;

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

    return (
        <>
            <div ref={setNodeRef} style={style} {...attributes} data-popup-id={habit.id}>
                <Card ref={cardRef} className="w-96 shadow-2xl border-2 border-primary/30 bg-card">
                    <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base flex items-center gap-2">
                                <span className="text-primary"><Zap className="h-5 w-5" /></span>
                                {habit.name}
                            </CardTitle>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={(e) => { e.stopPropagation(); onClose(); }}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <CardDescription>
                            Trigger: When I {habit.trigger?.action || '...'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm space-y-4">
                         <div className="p-3 rounded-md bg-muted/30">
                            <h4 className="font-semibold text-red-600 dark:text-red-400">Negative Mechanism</h4>
                             <div className="text-xs space-y-1 mt-1">
                                <p><span className="text-muted-foreground">Habit Name:</span> <span className="font-semibold text-foreground">{negativeMechanism?.name || 'Unlinked'}</span></p>
                                <p><span className="text-muted-foreground">Internal Effect:</span> <span className="text-foreground">{negativeMechanism?.response?.visualize || '...'}</span></p>
                                <p><span className="text-muted-foreground">Blocks:</span> <span className="text-foreground">{negativeMechanism?.reward || '...'}</span></p>
                            </div>
                        </div>
                        <div className="p-3 rounded-md bg-muted/30">
                            <h4 className="font-semibold text-green-600 dark:text-green-400">Positive Mechanism</h4>
                             <div className="text-xs space-y-1 mt-1">
                                <p><span className="text-muted-foreground">Habit Name:</span> <span className="font-semibold text-foreground">{positiveMechanism?.name || 'Unlinked'}</span></p>
                                <p><span className="text-muted-foreground">Internal Effect:</span> <span className="text-foreground">{positiveMechanism?.response?.visualize || '...'}</span></p>
                                <p><span className="text-muted-foreground">Reward:</span> <span className="text-foreground">{positiveMechanism?.benefit || '...'}</span></p>
                            </div>
                        </div>
                         <div className="pt-2">
                            <Tabs defaultValue="truth" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="resistance">{negativeMechanism?.mechanismFramework === 'negative' ? 'Urge' : 'Resistance'}</TabsTrigger>
                                    <TabsTrigger value="truth">Truth</TabsTrigger>
                                </TabsList>
                                <TabsContent value="resistance" className="mt-2">
                                    <ResistanceSection 
                                        habit={habit} 
                                        isNegative={negativeMechanism?.mechanismFramework === 'negative'}
                                        onAddStopper={(text) => handleAddStopper(habit.id, text)}
                                        onDeleteStopper={(id) => handleDeleteStopper(habit.id, id)}
                                        onStopperStatusChange={(e, id, status) => handleStopperStatusChange(e, habit.id, id, status)}
                                        onLinkTechnique={handleLinkTechniqueToStopper}
                                    />
                                </TabsContent>
                                <TabsContent value="truth" className="mt-2">
                                    <TruthSection 
                                        habit={habit} 
                                        onAddStrength={(text) => handleAddStrength(habit.id, text)}
                                        onDeleteStrength={(id) => handleDeleteStrength(habit.id, id)}
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>
                    </CardContent>
                </Card>
            </div>
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
