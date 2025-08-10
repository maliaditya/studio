
"use client";

import React, { useState, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Edit, Save, Trash2, Check, X, BookOpen, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import type { Resource } from '@/types/workout';
import { HabitPopup } from '@/components/HabitPopup';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { Separator } from '@/components/ui/separator';


function PurposePageContent() {
    const { 
        purposeStatement, 
        setPurposeStatement,
        specializationPurposes,
        setSpecializationPurposes,
        patterns,
        metaRules,
        setMetaRules,
        resources,
        coreSkills,
        handleOpenNestedPopup,
    } = useAuth();
    const { toast } = useToast();

    const [isEditingPurpose, setIsEditingPurpose] = useState(false);
    const [purposeInput, setPurposeInput] = useState(purposeStatement);
    const [editingSpecializationId, setEditingSpecializationId] = useState<string | null>(null);
    const [specializationPurposeInput, setSpecializationPurposeInput] = useState('');
    
    const [selectedHabit, setSelectedHabit] = useState<{ habit: Resource; position: { x: number; y: number; } } | null>(null);

    const specializations = React.useMemo(() => {
        return coreSkills.filter(skill => skill.type === 'Specialization');
    }, [coreSkills]);

    const handleSavePurpose = () => {
        setPurposeStatement(purposeInput);
        setIsEditingPurpose(false);
        toast({ title: "Purpose Updated", description: "Your central purpose has been saved." });
    };

    const handleStartEditSpecialization = (specId: string) => {
        setEditingSpecializationId(specId);
        setSpecializationPurposeInput(specializationPurposes[specId] || '');
    };

    const handleSaveSpecializationPurpose = () => {
        if (editingSpecializationId) {
            setSpecializationPurposes(prev => ({
                ...prev,
                [editingSpecializationId]: specializationPurposeInput
            }));
            setEditingSpecializationId(null);
            setSpecializationPurposeInput('');
            toast({ title: "Connection Saved", description: "The specialization's contribution to your purpose has been updated." });
        }
    };
    
    const handleCancelEditSpecialization = () => {
        setEditingSpecializationId(null);
        setSpecializationPurposeInput('');
    };
    
    const handleClearSpecializationPurpose = (specId: string) => {
        setSpecializationPurposes(prev => {
            const newPurposes = { ...prev };
            delete newPurposes[specId];
            return newPurposes;
        });
        toast({ title: "Connection Cleared", description: "The specialization's link to your purpose has been removed." });
    };

    const handleDeleteMetaRule = (ruleId: string) => {
        setMetaRules(prev => prev.filter(r => r.id !== ruleId));
    };
    
    const habitCards = useMemo(() => resources.filter(r => r.type === 'habit'), [resources]);
    const mechanismCards = useMemo(() => resources.filter(r => r.type === 'mechanism'), [resources]);


    const getHabitLinksForRule = (rule: { id: string, patternId: string, text: string }) => {
        const pattern = patterns.find(p => p.id === rule.patternId);
        if (!pattern) return [];

        const habitPhrases = pattern.phrases.filter(p => p.category === 'Habit Cards');
        
        return habitPhrases.map(phrase => {
            const habit = habitCards.find(h => h.id === phrase.mechanismCardId);
            if (!habit) return null;

            const responseMechanism = mechanismCards.find(m => m.id === habit.response?.resourceId);
            const newResponseMechanism = mechanismCards.find(m => m.id === habit.newResponse?.resourceId);

            return {
                habitId: habit.id,
                habitName: habit.name,
                response: responseMechanism?.response?.visualize || '...',
                newResponse: newResponseMechanism?.newResponse?.action || '...'
            };
        }).filter((h): h is NonNullable<typeof h> => h !== null);
    };

    const handleOpenHabitPopup = (e: React.MouseEvent, habitId: string) => {
        const habit = resources.find(r => r.id === habitId);
        if (habit) {
            setSelectedHabit({
                habit,
                position: { x: e.clientX, y: e.clientY }
            });
        }
    };
    
    const handleDragEnd = (event: DragEndEvent) => {
        if (selectedHabit && event.active.id === `habit-popup-${selectedHabit.habit.id}`) {
            const { delta } = event;
            setSelectedHabit(prev => prev ? {
                ...prev,
                position: {
                    x: prev.position.x + delta.x,
                    y: prev.position.y + delta.y,
                }
            } : null);
        }
    };

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-primary">
                        Your Purpose
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Define your central mission. Then, connect your specializations and meta-rules to see how every skill and insight serves your ultimate goal.
                    </p>
                </div>

                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <BrainCircuit className="h-6 w-6 text-primary" />
                                My Central Purpose
                            </CardTitle>
                            {!isEditingPurpose && (
                                <Button variant="outline" size="sm" onClick={() => { setPurposeInput(purposeStatement); setIsEditingPurpose(true); }}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    {purposeStatement ? 'Edit' : 'Define'} Purpose
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isEditingPurpose ? (
                            <div className="space-y-4">
                                <Textarea
                                    value={purposeInput}
                                    onChange={(e) => setPurposeInput(e.target.value)}
                                    placeholder="What is your ultimate goal? What is the core mission that drives you?"
                                    className="min-h-[100px] text-base"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" onClick={() => setIsEditingPurpose(false)}>Cancel</Button>
                                    <Button onClick={handleSavePurpose}>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Purpose
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-lg text-muted-foreground whitespace-pre-wrap min-h-[5rem]">
                                {purposeStatement || "Your purpose is not yet defined. Click the button to set it."}
                            </p>
                        )}
                        
                        {metaRules.length > 0 && (
                            <>
                                <Separator />
                                <div className="space-y-4">
                                    {metaRules.map(rule => {
                                        const pattern = patterns.find(p => p.id === rule.patternId);
                                        if (!pattern) return null;

                                        const categorizedPhrases = pattern.phrases.reduce((acc, phrase) => {
                                            if (phrase.category === 'Habit Cards') return acc;
                                            if (!acc[phrase.category]) {
                                                acc[phrase.category] = [];
                                            }
                                            acc[phrase.category].push(phrase.text);
                                            return acc;
                                        }, {} as Record<string, string[]>);
                                        
                                        const linkedHabits = getHabitLinksForRule(rule);

                                        return (
                                            <Card key={rule.id} className="bg-muted/50">
                                                <CardHeader className="flex flex-row items-center justify-between pb-3">
                                                    <CardTitle className="text-lg">{rule.text}</CardTitle>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteMetaRule(rule.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-sm text-muted-foreground mb-2">Based on pattern: <span className="font-semibold text-foreground">{pattern.name}</span></p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {Object.entries(categorizedPhrases).map(([category, phrases]) => (
                                                            <div key={category}>
                                                                <h4 className="font-medium text-sm mb-1">{category}</h4>
                                                                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                                                    {phrases.map((phrase, i) => <li key={i}>{phrase}</li>)}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                        {linkedHabits.length > 0 && (
                                                            <div className="md:col-span-2">
                                                                <h4 className="font-medium text-sm mb-1">Habits</h4>
                                                                <div className="space-y-1">
                                                                    {linkedHabits.map((habit, i) => (
                                                                        <button 
                                                                            key={i} 
                                                                            className="text-left p-1 rounded hover:bg-background w-full"
                                                                            onClick={(e) => handleOpenHabitPopup(e, habit.habitId)}
                                                                        >
                                                                            <span className="font-semibold text-foreground text-xs">{habit.habitName}</span> = <span className="text-muted-foreground text-xs">{habit.response} <ArrowRight className="inline h-3 w-3" /> {habit.newResponse}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <div>
                    <h2 className="text-2xl font-bold text-center mb-6">How Your Specializations Serve Your Purpose</h2>
                    {specializations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {specializations.map(spec => (
                                <Card key={spec.id} className="flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="text-lg">{spec.name}</CardTitle>
                                        <CardDescription>Specialization</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        {editingSpecializationId === spec.id ? (
                                            <div className="space-y-2">
                                                <Label htmlFor={`purpose-${spec.id}`}>How does this help your purpose?</Label>
                                                <Textarea 
                                                    id={`purpose-${spec.id}`}
                                                    value={specializationPurposeInput}
                                                    onChange={(e) => setSpecializationPurposeInput(e.target.value)}
                                                    placeholder="e.g., 'Allows me to build the tools required for...'"
                                                    className="min-h-[80px]"
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground min-h-[6rem]">
                                                {specializationPurposes[spec.id] || "No contribution defined yet."}
                                            </p>
                                        )}
                                    </CardContent>
                                    <CardFooter className="flex justify-between">
                                        {editingSpecializationId === spec.id ? (
                                            <div className="flex justify-end gap-2 w-full">
                                                <Button variant="ghost" onClick={handleCancelEditSpecialization}>Cancel</Button>
                                                <Button onClick={handleSaveSpecializationPurpose}><Save className="mr-2 h-4 w-4"/>Save</Button>
                                            </div>
                                        ) : (
                                            <>
                                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleClearSpecializationPurpose(spec.id)}>
                                                    <X className="mr-2 h-4 w-4"/>Clear
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleStartEditSpecialization(spec.id)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    {specializationPurposes[spec.id] ? 'Edit' : 'Define'} Connection
                                                </Button>
                                            </>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-10 border-2 border-dashed rounded-lg">
                            <p>You haven't defined any specializations yet.</p>
                            <Button variant="link" asChild><Link href="/skill">Go to the Skill page to add one.</Link></Button>
                        </div>
                    )}
                </div>
            </div>
            {selectedHabit && (
                <HabitPopup 
                    habit={selectedHabit.habit} 
                    position={selectedHabit.position}
                    onClose={() => setSelectedHabit(null)} 
                />
            )}
        </DndContext>
    );
}

export default function PurposePage() {
    return (
        <AuthGuard>
            <PurposePageContent />
        </AuthGuard>
    );
}
