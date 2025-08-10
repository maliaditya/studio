

"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Edit, Save, Trash2, Check, X, BookOpen, ArrowRight, TrendingUp, Briefcase, HeartPulse, ClipboardCheck, ArrowDown, ArrowUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import type { Resource, DatedWorkout, MetaRule } from '@/types/workout';
import { HabitPopup } from '@/components/HabitPopup';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, subDays, parseISO, isBefore, startOfToday, addDays } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogHeader, DialogTitle } from '@/components/ui/dialog';


function PurposePageContent() {
    const { 
        purposeStatement, 
        setPurposeStatement,
        specializationPurposes,
        setSpecializationPurposes,
        coreSkills,
        setCoreSkills,
        patterns,
        metaRules,
        setMetaRules,
        resources,
        handleOpenNestedPopup,
    } = useAuth();
    const { toast } = useToast();

    const [isEditingPurpose, setIsEditingPurpose] = useState(false);
    const [purposeInput, setPurposeInput] = useState(purposeStatement);
    
    const [selectedHabit, setSelectedHabit] = useState<{ habit: Resource; position: { x: number; y: number; } } | null>(null);

    const [editingMetaRuleId, setEditingMetaRuleId] = useState<string | null>(null);
    const [editedMetaRuleText, setEditedMetaRuleText] = useState('');
    
    const [selectedRuleForDetails, setSelectedRuleForDetails] = useState<MetaRule | null>(null);

    const specializations = React.useMemo(() => {
        return coreSkills.filter(skill => skill.type === 'Specialization');
    }, [coreSkills]);

    const handleSavePurpose = () => {
        setPurposeStatement(purposeInput);
        setIsEditingPurpose(false);
        toast({ title: "Purpose Updated", description: "Your central purpose has been saved." });
    };

    const handleUpdatePillar = (id: string, pillar: 'Health' | 'Wealth' | 'Growth' | 'Direction', type: 'specialization' | 'meta-rule') => {
      if (type === 'specialization') {
        setCoreSkills(prev => prev.map(s => s.id === id ? { ...s, purposePillar: pillar } : s));
      } else {
        setMetaRules(prev => prev.map(r => r.id === id ? { ...r, purposePillar: pillar } : r));
      }
    };
    
    const handleStartEditMetaRule = (e: React.MouseEvent, rule: { id: string, text: string }) => {
        e.stopPropagation();
        setEditingMetaRuleId(rule.id);
        setEditedMetaRuleText(rule.text);
    };

    const handleSaveMetaRule = () => {
        if (!editingMetaRuleId) return;
        setMetaRules(prev => prev.map(rule =>
            rule.id === editingMetaRuleId ? { ...rule, text: editedMetaRuleText } : rule
        ));
        setEditingMetaRuleId(null);
        setEditedMetaRuleText('');
    };

    const handleDeleteMetaRule = (e: React.MouseEvent, ruleId: string) => {
        e.stopPropagation();
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
        e.stopPropagation();
        handleOpenNestedPopup(habitId, e);
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
    
    const pillars = [
        { name: 'Health', icon: <HeartPulse className="h-6 w-6 text-red-500" /> },
        { name: 'Wealth', icon: <Briefcase className="h-6 w-6 text-green-500" /> },
        { name: 'Growth', icon: <TrendingUp className="h-6 w-6 text-blue-500" /> },
        { name: 'Direction', icon: <ClipboardCheck className="h-6 w-6 text-purple-500" /> },
    ];
    
    const renderMetaRule = (rule: { id: string, text: string, patternId: string, purposePillar?: string }) => {
        return (
            <div key={rule.id} className="group relative text-sm p-2 rounded-md transition-colors hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedRuleForDetails(rule)}>
                {editingMetaRuleId === rule.id ? (
                  <Input
                      value={editedMetaRuleText}
                      onChange={(e) => setEditedMetaRuleText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveMetaRule()}
                      onBlur={handleSaveMetaRule}
                      className="text-sm h-8"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p>{rule.text}</p>
                )}
                <div className="absolute top-1 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                          <Badge className="capitalize">{rule.purposePillar?.[0] || '?'}</Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {pillars.map(pillar => (
                          <DropdownMenuItem key={pillar.name} onSelect={() => handleUpdatePillar(rule.id, pillar.name as any, 'meta-rule')}>
                            {pillar.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleStartEditMetaRule(e, rule)}>
                      <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleDeleteMetaRule(e, rule.id)}>
                      <Trash2 className="h-3 w-3 text-destructive"/>
                  </Button>
                </div>
            </div>
        )
    }
    
    const renderRuleDetailContent = () => {
        if (!selectedRuleForDetails) return null;
        
        const pattern = patterns.find(p => p.id === selectedRuleForDetails.patternId);
        if (!pattern) return <p>Pattern not found.</p>;

        const categorizedPhrases = pattern.phrases.reduce((acc, phrase) => {
            if (phrase.category === 'Habit Cards') return acc;
            if (!acc[phrase.category]) { // @ts-ignore
                acc[phrase.category] = [];
            }
            // @ts-ignore
            acc[phrase.category].push(phrase.text);
            return acc;
        }, {} as Record<string, string[]>);
        
        const linkedHabits = getHabitLinksForRule(selectedRuleForDetails);

        return (
             <>
                <p className="text-sm text-muted-foreground mb-4">Based on pattern: <span className="font-semibold text-foreground">{pattern.name}</span></p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(categorizedPhrases).map(([category, phrases]) => {
                        if (category === 'Habit Cards') return null;
                        return (
                            <div key={category}>
                                <h4 className="font-medium text-sm mb-1">{category}</h4>
                                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                    {phrases.map((phrase, i) => <li key={i}>{phrase}</li>)}
                                </ul>
                            </div>
                        )
                    })}
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
            </>
        )
    }

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-primary">
                        Your Purpose
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        “In Life either you're growing or you're decaying; there's no middle ground. If you're standing still, you're decaying.”
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {pillars.map(pillar => {
                        const rulesForPillar = metaRules.filter(r => r.purposePillar === pillar.name);
                        return (
                            <Card key={pillar.name}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3 text-xl">{pillar.icon}{pillar.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {rulesForPillar.length > 0 ? (
                                        rulesForPillar.map(renderMetaRule)
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            <p>No meta-rules assigned.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
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
                        <Separator />
                        <div className="space-y-2">
                            {metaRules.filter(r => !r.purposePillar).map(renderMetaRule)}
                        </div>
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
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full">
                                              {spec.purposePillar || "Assign to a Pillar"}
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent>
                                            {(['Health', 'Wealth', 'Growth', 'Direction'] as const).map(pillar => (
                                              <DropdownMenuItem key={pillar} onSelect={() => handleUpdatePillar(spec.id, pillar, 'specialization')}>
                                                {pillar.name}
                                              </DropdownMenuItem>
                                            ))}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardContent>
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
             <Dialog open={!!selectedRuleForDetails} onOpenChange={(open) => !open && setSelectedRuleForDetails(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{selectedRuleForDetails?.text}</DialogTitle>
                        <DialogDescriptionComponent>
                            Details about the pattern that this rule is based on.
                        </DialogDescriptionComponent>
                    </DialogHeader>
                    <div className="py-4">
                        {renderRuleDetailContent()}
                    </div>
                </DialogContent>
            </Dialog>
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




