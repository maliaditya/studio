

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
    } = useAuth();
    const { toast } = useToast();

    const [isEditingPurpose, setIsEditingPurpose] = useState(false);
    const [purposeInput, setPurposeInput] = useState(purposeStatement);
    const [editingSpecializationId, setEditingSpecializationId] = useState<string | null>(null);
    const [specializationPurposeInput, setSpecializationPurposeInput] = useState('');

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

    const getHabitLinksForRule = (rule: { id: string, patternId: string, text: string }) => {
        const pattern = patterns.find(p => p.id === rule.patternId);
        if (!pattern) return [];

        const mechanismIds = new Set(pattern.phrases.map(p => p.mechanismCardId));
        
        const linkedHabits = habitCards.filter(habit => {
            if (!habit.response?.resourceId && !habit.newResponse?.resourceId) {
                return false;
            }
            return mechanismIds.has(habit.response?.resourceId || '') || mechanismIds.has(habit.newResponse?.resourceId || '');
        });

        return linkedHabits.map(habit => ({
            habitName: habit.name,
            response: habit.response?.text || 'N/A',
            newResponse: habit.newResponse?.text || 'N/A',
        }));
    };

    return (
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
                <CardContent>
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
                </CardContent>
            </Card>

            {metaRules.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookOpen /> Your Meta-Rules</CardTitle>
                        <CardDescription>Your guiding principles, derived from your own data.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {metaRules.map(rule => {
                            const pattern = patterns.find(p => p.id === rule.patternId);
                            if (!pattern) return null;

                            const categorizedPhrases = pattern.phrases.reduce((acc, phrase) => {
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
                                        </div>
                                        {linkedHabits.length > 0 && (
                                            <div className="mt-4 pt-3 border-t">
                                                <h4 className="font-medium text-sm mb-2">Habits</h4>
                                                <div className="space-y-2">
                                                    {linkedHabits.map((link, i) => (
                                                        <div key={i} className="text-xs p-2 rounded bg-background/50">
                                                          <p className="font-semibold text-foreground">{link.habitName} = <span className="font-normal text-muted-foreground">{link.response} <ArrowRight className="inline h-3 w-3" /> {link.newResponse}</span></p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </CardContent>
                </Card>
            )}

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
                                <CardFooter>
                                    {editingSpecializationId === spec.id ? (
                                        <div className="flex justify-end gap-2 w-full">
                                            <Button variant="ghost" size="icon" onClick={handleCancelEditSpecialization}><X className="h-4 w-4" /></Button>
                                            <Button variant="secondary" size="icon" onClick={handleSaveSpecializationPurpose}><Check className="h-4 w-4" /></Button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end gap-2 w-full">
                                            {specializationPurposes[spec.id] && (
                                                 <Button variant="ghost" size="icon" onClick={() => handleClearSpecializationPurpose(spec.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            )}
                                            <Button variant="outline" size="sm" onClick={() => handleStartEditSpecialization(spec.id)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                {specializationPurposes[spec.id] ? 'Edit' : 'Connect'}
                                            </Button>
                                        </div>
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
    );
}

export default function PurposePage() {
    return (
        <AuthGuard>
            <PurposePageContent />
        </AuthGuard>
    );
}
