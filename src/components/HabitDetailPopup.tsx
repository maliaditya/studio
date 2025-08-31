

"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Workflow, ArrowDown, ThumbsUp, ThumbsDown, Trash2, PlusCircle, Link as LinkIcon, Edit2, PieChart as PieChartIcon, Brain, GitBranch, ArrowLeft, ArrowRight, Zap, Target } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { HabitDetailPopupState, Resource, Stopper, Strength, PopupState, MetaRule, ExerciseDefinition } from '@/types/workout';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';

const ManageResistancePopup = ({ habit, popupState, onClose }: {
    habit: Resource;
    popupState: { stopper: Stopper; x: number; y: number; };
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
    const { setResources, mechanismCards, resources, openGeneralPopup, mindProgrammingDefinitions } = useAuth();
    const { habitId, x, y } = popupState;
    const habit = resources.find(r => r.id === habitId);
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `habit-detail-popup-${habit?.id}` });
    const cardRef = useRef<HTMLDivElement>(null);

    const [manageResistancePopupState, setManageResistancePopupState] = useState<{ stopper: Stopper; x: number; y: number; } | null>(null);
    const [currentHabitIndex, setCurrentHabitIndex] = useState(0);

    const [newStopperText, setNewStopperText] = useState('');
    const [newStrengthText, setNewStrengthText] = useState('');


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
    
    const negativeMechanism = habit ? mechanismCards.find(m => m.id === habit.response?.resourceId) : null;
    const positiveMechanism = habit ? mechanismCards.find(m => m.id === habit.newResponse?.resourceId) : null;

    const handleAddStopper = () => {
        if (!newStopperText.trim()) return;
        const newStopper: Stopper = {
            id: `stopper_${Date.now()}`,
            text: newStopperText.trim(),
            status: 'none',
        };
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                return { ...r, stoppers: [...(r.stoppers || []), newStopper] };
            }
            return r;
        }));
        setNewStopperText('');
    };
    
    const handleAddStrength = () => {
        if (!newStrengthText.trim()) return;
        const newStrength: Strength = {
            id: `strength_${Date.now()}`,
            text: newStrengthText.trim(),
        };
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                return { ...r, strengths: [...(r.strengths || []), newStrength] };
            }
            return r;
        }));
        setNewStrengthText('');
    };

    const handleDeleteStopper = (stopperId: string) => {
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                return { ...r, stoppers: (r.stoppers || []).filter(s => s.id !== stopperId) };
            }
            return r;
        }));
    };
    
    const handleDeleteStrength = (strengthId: string) => {
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                return { ...r, strengths: (r.strengths || []).filter(s => s.id !== strengthId) };
            }
            return r;
        }));
    };

    const handleStopperStatusChange = (e: React.PointerEvent, stopperId: string, status: Stopper['status']) => {
        e.stopPropagation();
        const stopper = habit?.stoppers?.find(s => s.id === stopperId);

        if (status === 'manageable' && stopper) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setManageResistancePopupState({
                stopper,
                x: rect.right + 10,
                y: rect.top
            });
        } else {
            setResources(prev => prev.map(r => {
                if (r.id === habit.id) {
                    const updatedStoppers = (r.stoppers || []).map(s => 
                        s.id === stopperId ? { ...s, status: s.status === status ? 'none' : status } : s
                    );
                    return { ...r, stoppers: updatedStoppers };
                }
                return r;
            }));
        }
    };
    
    const handleLinkTechniqueToStopper = (stopperId: string, techniqueId: string) => {
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                const updatedStoppers = (r.stoppers || []).map(s => 
                    s.id === stopperId ? { ...s, linkedTechniqueId: techniqueId } : s
                );
                return { ...r, stoppers: updatedStoppers };
            }
            return r;
        }));
    };
    
    const ResistanceSection = React.memo(({ habit, isNegative }: { habit: Resource, isNegative: boolean }) => {
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
                        onKeyDown={(e) => { if (e.key === 'Enter') { handleAddStopper(); } }}
                        placeholder={placeholder}
                        className="h-8 text-xs"
                    />
                    <Button size="sm" onClick={handleAddStopper} className="h-8">Add</Button>
                </div>
            </div>
        );
    });
    ResistanceSection.displayName = 'ResistanceSection';

    const TruthSection = React.memo(({ habit, isNegative }: { habit: Resource, isNegative: boolean }) => {
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
                        onKeyDown={(e) => { if (e.key === 'Enter') { handleAddStrength(); } }}
                        placeholder={placeholder}
                        className="h-8 text-xs"
                    />
                    <Button size="sm" onClick={handleAddStrength} className="h-8">Add</Button>
                </div>
            </div>
        );
    });
    TruthSection.displayName = 'TruthSection';

    const TechniquesSection = React.memo(({ habit }: { habit: Resource }) => {
        const unassignedStoppers = (habit.stoppers || []).filter(s => !s.linkedTechniqueId);
    
        return (
            <div>
                <ScrollArea className={cn((mindProgrammingDefinitions || []).length > 4 && "h-[22.5rem]", "pr-2")}>
                  <div className="space-y-4">
                    {mindProgrammingDefinitions.map(technique => {
                        const assignedStoppers = (habit.stoppers || []).filter(s => s.linkedTechniqueId === technique.id);
                        return (
                            <Card key={technique.id} className="bg-background">
                                <CardHeader className="p-3">
                                    <CardTitle className="text-sm">{technique.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-0">
                                    <div className="space-y-2">
                                        {assignedStoppers.map(stopper => (
                                            <div key={stopper.id} className="text-xs p-1.5 rounded-md border bg-muted/50">{stopper.text}</div>
                                        ))}
                                    </div>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="mt-2 text-xs h-7 w-full">
                                                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                                                Assign Urge
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent>
                                            <Select onValueChange={(stopperId) => handleLinkTechniqueToStopper(stopperId, technique.id)}>
                                                <SelectTrigger><SelectValue placeholder="Select an urge..." /></SelectTrigger>
                                                <SelectContent>
                                                    {unassignedStoppers.map(s => (
                                                        <SelectItem key={s.id} value={s.id}>{s.text}</SelectItem>
                                                    ))}
                                                    {unassignedStoppers.length === 0 && <SelectItem value="none" disabled>No unassigned urges</SelectItem>}
                                                </SelectContent>
                                            </Select>
                                        </PopoverContent>
                                    </Popover>
                                </CardContent>
                            </Card>
                        )
                    })}
                  </div>
                </ScrollArea>
            </div>
        );
    });
    TechniquesSection.displayName = 'TechniquesSection';


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
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="resistance">{negativeMechanism?.mechanismFramework === 'negative' ? 'Urge' : 'Resistance'}</TabsTrigger>
                                    <TabsTrigger value="truth">Truth</TabsTrigger>
                                    <TabsTrigger value="techniques">Techniques</TabsTrigger>
                                </TabsList>
                                <TabsContent value="resistance" className="mt-2">
                                    <ResistanceSection habit={habit} isNegative={negativeMechanism?.mechanismFramework === 'negative'}/>
                                </TabsContent>
                                <TabsContent value="truth" className="mt-2">
                                    <TruthSection habit={habit} isNegative={negativeMechanism?.mechanismFramework === 'negative'}/>
                                </TabsContent>
                                <TabsContent value="techniques" className="mt-2">
                                    <TechniquesSection habit={habit} />
                                </TabsContent>
                            </Tabs>
                        </div>
                    </CardContent>
                </Card>
            </div>
             {manageResistancePopupState && (
                <ManageResistancePopup
                    habit={resources.find(r => r.id === manageResistancePopupState!.habitId)!}
                    popupState={manageResistancePopupState}
                    onClose={() => setManageResistancePopupState(null)}
                />
            )}
        </>
    );
};
