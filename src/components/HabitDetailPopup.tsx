
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Workflow, ArrowDown, ThumbsUp, ThumbsDown, Trash2, PlusCircle, Link as LinkIcon, Edit2, PieChart as PieChartIcon } from 'lucide-react';
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
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Separator } from './ui/separator';
import { format, parseISO } from 'date-fns';

interface HabitDetailPopupProps {
  popupState: HabitDetailPopupState;
  onClose: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d'];

const getTaskTypeDisplayName = (type: string) => {
    switch (type) {
        case 'lead-generation': return 'Lead Gen';
        case 'deepwork': return 'Deep Work';
        default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
};

export function HabitDetailPopup({ popupState, onClose }: HabitDetailPopupProps) {
    const { habitId, x, y } = popupState;
    const { resources, setResources, mechanismCards, openGeneralPopup, patterns, schedule } = useAuth();
    
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
        if (!habit) return;
        const newStopper: Stopper = { id: `stopper_${Date.now()}`, text: 'New Resistance', status: 'none' };
        handleUpdateResource({ ...habit, stoppers: [...(habit.stoppers || []), newStopper] });
    };
    
    const handleDeleteStopper = (stopperId: string) => {
        if (!habit) return;
        handleUpdateResource({ ...habit, stoppers: (habit.stoppers || []).filter(s => s.id !== stopperId) });
    };
    
    const handleAddStrength = () => {
        if (!habit) return;
        const newStrength: Strength = { id: `strength_${Date.now()}`, text: 'New Truth' };
        handleUpdateResource({ ...habit, strengths: [...(habit.strengths || []), newStrength] });
    };

    const handleDeleteStrength = (strengthId: string) => {
        if (!habit) return;
        handleUpdateResource({ ...habit, strengths: (habit.strengths || []).filter(s => s.id !== strengthId) });
    };

    const completionData = useMemo(() => {
        const counts: Record<string, number> = {};
        const log: { id: string; date: string; details: string; type: string }[] = [];

        if (!habitId) return { pieData: [], log: [] };

        Object.entries(schedule).forEach(([date, daySchedule]) => {
            Object.values(daySchedule).flat().forEach(activity => {
                if (activity && activity.completed && activity.habitEquationIds?.includes(habitId)) {
                    const typeName = getTaskTypeDisplayName(activity.type);
                    counts[typeName] = (counts[typeName] || 0) + 1;
                    log.push({
                        id: activity.id,
                        date: format(parseISO(date), 'MMM d'),
                        details: activity.details,
                        type: typeName
                    });
                }
            });
        });

        const pieData = Object.entries(counts).map(([name, value]) => ({ name, value }));
        return { pieData, log: log.reverse() };

    }, [habitId, schedule]);
    
    if (!habit) return null;

    const negativeMechanism = mechanismCards.find(m => m.id === habit.response?.resourceId);
    const positiveMechanism = mechanismCards.find(m => m.id === habit.newResponse?.resourceId);
    
    const pattern = patterns.find(p => p.phrases.some(ph => ph.category === 'Habit Cards' && ph.mechanismCardId === habit.id));

    return (
        <div ref={setNodeRef} style={style} {...attributes} data-popup-id={`habit-${habitId}`}>
            <Card className="w-[800px] shadow-2xl border-2 border-primary/30 bg-card flex flex-col max-h-[90vh]">
                <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base flex items-center gap-2">
                           {habit.name}
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={(e) => { e.stopPropagation(); onClose(); }}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 grid grid-cols-2 gap-6 flex-grow min-h-0">
                    {/* Left Column */}
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
                                <ResistanceSection habit={habit} handleDeleteStopper={handleDeleteStopper} handleAddStopper={handleAddStopper} isNegative={pattern?.type === 'Negative'}/>
                            </TabsContent>
                            <TabsContent value="truth" className="mt-2">
                                <TruthSection habit={habit} handleDeleteStrength={handleDeleteStrength} handleAddStrength={handleAddStrength} isNegative={pattern?.type === 'Negative'}/>
                            </TabsContent>
                        </Tabs>
                    </div>
                    {/* Right Column */}
                     <div className="border-l pl-6 flex flex-col space-y-4">
                        <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-primary" /> Habit Application</h4>
                            {completionData.pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={150}>
                                    <PieChart>
                                        <Pie data={completionData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                            {completionData.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[150px] flex items-center justify-center text-xs text-muted-foreground bg-muted/50 rounded-md">
                                    No completed tasks linked to this habit yet.
                                </div>
                            )}
                        </div>
                        <Separator />
                        <div>
                           <h4 className="font-semibold text-sm mb-2">Completion Log</h4>
                            <ScrollArea className="h-40">
                                <ul className="space-y-1 pr-2">
                                    {completionData.log.map(item => (
                                        <li key={item.id} className="flex justify-between items-center text-xs p-1.5 bg-muted/50 rounded-md">
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">{item.details}</p>
                                                <p className="text-muted-foreground">{item.type}</p>
                                            </div>
                                            <Badge variant="outline" className="flex-shrink-0">{item.date}</Badge>
                                        </li>
                                    ))}
                                    {completionData.log.length === 0 && <p className="text-xs text-center text-muted-foreground py-4">Log is empty.</p>}
                                </ul>
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

const ResistanceSection = ({ habit, handleDeleteStopper, handleAddStopper, isNegative }: { 
    habit: Resource, 
    handleDeleteStopper: (stopperId: string) => void,
    handleAddStopper: () => void,
    isNegative?: boolean
}) => {
    const [newStopperText, setNewStopperText] = useState('');
    const placeholder = isNegative ? "What's the urge?" : "What's stopping you?";

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
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleAddStopper(); setNewStopperText(''); } }}
                    placeholder={placeholder}
                    className="h-8 text-xs"
                />
                <Button size="sm" onClick={() => { handleAddStopper(); setNewStopperText(''); }} className="h-8">Add</Button>
            </div>
        </div>
    );
};

const TruthSection = ({ habit, handleDeleteStrength, handleAddStrength, isNegative }: { 
    habit: Resource, 
    handleDeleteStrength: (strengthId: string) => void,
    handleAddStrength: () => void,
    isNegative?: boolean
}) => {
    const [newStrengthText, setNewStrengthText] = useState('');
    const placeholder = isNegative ? "What's the truth?" : "What's a reinforcing truth?";

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
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleAddStrength(); setNewStrengthText(''); } }}
                    placeholder={placeholder}
                    className="h-8 text-xs"
                />
                <Button size="sm" onClick={() => { handleAddStrength(); setNewStrengthText(''); }} className="h-8">Add</Button>
            </div>
        </div>
    );
};
