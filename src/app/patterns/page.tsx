

"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { FileText, Lightbulb, Zap, PlusCircle, Trash2, BookOpen, Workflow, ArrowRight, Brain, HeartPulse, HandHeart, TrendingUp, Edit, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Pattern, PatternPhrase, MetaRule, Resource } from '@/types/workout';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


function PatternsPageContent() {
    const { resources, patterns, setPatterns, metaRules, setMetaRules, handleOpenNestedPopup } = useAuth();
    const { toast } = useToast();

    const [selectedPhrases, setSelectedPhrases] = useState<PatternPhrase[]>([]);
    const [newPatternName, setNewPatternName] = useState('');
    const [newPatternType, setNewPatternType] = useState<'Positive' | 'Negative'>('Positive');
    const [selectedPatternToUpdate, setSelectedPatternToUpdate] = useState<string | null>(null);

    const [newMetaRuleText, setNewMetaRuleText] = useState('');
    const [selectedPatternForRule, setSelectedPatternForRule] = useState<string | null>(null);
    
    const [editingPatternId, setEditingPatternId] = useState<string | null>(null);
    const [editingPatternName, setEditingPatternName] = useState('');

    const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
    const [editedPatternPhrases, setEditedPatternPhrases] = useState<PatternPhrase[]>([]);

    // Effect to update selected phrases when an existing pattern is chosen for editing
    useEffect(() => {
        if (selectedPatternToUpdate) {
            const patternToEdit = patterns.find(p => p.id === selectedPatternToUpdate);
            if (patternToEdit) {
                setSelectedPhrases(patternToEdit.phrases);
            }
        } else {
            // When switching back to "Create New", clear the selection
            setSelectedPhrases([]);
        }
    }, [selectedPatternToUpdate, patterns]);


    const mechanismCards = useMemo(() => {
        return resources.filter(r => r.type === 'mechanism');
    }, [resources]);

    const habitCards = useMemo(() => {
        return resources.filter(r => r.type === 'habit' && (r.response?.resourceId || r.newResponse?.resourceId));
    }, [resources]);

    const aggregatedFields = useMemo(() => {
        const fields: Record<string, PatternPhrase[]> = {
            Benefits: [],
            Costs: [],
            'Positive Laws': [],
            'Negative Laws': [],
            'Habit Cards': [],
        };

        const phrasesFromSelectedHabits = new Set(
            selectedPhrases
                .filter(p => p.category === 'Habit Cards')
                .flatMap(habitPhrase => {
                    const habitCard = habitCards.find(h => h.id === habitPhrase.mechanismCardId);
                    if (!habitCard) return [];
                    const relatedMechanismIds = new Set([habitCard.response?.resourceId, habitCard.newResponse?.resourceId].filter(Boolean));
                    return Object.values(fields)
                        .flat()
                        .filter(p => p.mechanismCardId && relatedMechanismIds.has(p.mechanismCardId))
                        .map(p => p.text);
                })
        );
        
        const allUsedPhrasesText = new Set(patterns.flatMap(p => {
            if (p.id === selectedPatternToUpdate) return [];
            return p.phrases.map(phrase => phrase.text);
        }));

        mechanismCards.forEach(card => {
            const cardName = card.name;
            const cardId = card.id;

            if (card.mechanismFramework === 'positive') {
                if (card.benefit) fields.Benefits.push({ category: 'Benefits', text: card.benefit, mechanismCardId: cardId, mechanismCardName: cardName });
                if (card.reward) fields.Benefits.push({ category: 'Benefits', text: card.reward, mechanismCardId: cardId, mechanismCardName: cardName });
                if (card.law?.premise && card.law?.outcome) {
                  const lawText = `${card.law.premise} can only happen when ${card.law.outcome}`;
                  fields['Positive Laws'].push({ category: 'Positive Laws', text: lawText, mechanismCardId: cardId, mechanismCardName: cardName });
                }
            } else { // Negative Framework
                if (card.trigger?.feeling && card.benefit) {
                    const costText = `That one ${card.trigger.feeling} costs me ${card.benefit}.`;
                    fields.Costs.push({ category: 'Costs', text: costText, mechanismCardId: cardId, mechanismCardName: cardName });
                }
                if (card.reward) { // This is a "Benefit" blocked by the negative action, hence a cost.
                    const costText = `This blocks ${card.reward}.`;
                    fields.Costs.push({ category: 'Costs', text: costText, mechanismCardId: cardId, mechanismCardName: cardName });
                }
                if (card.law?.premise && card.law?.outcome) {
                    const lawText = `${card.law.premise} cannot happen when ${card.law.outcome}`;
                    fields['Negative Laws'].push({ category: 'Negative Laws', text: lawText, mechanismCardId: cardId, mechanismCardName: cardName });
                }
            }
        });
        
        Object.keys(fields).forEach(key => {
            if (key !== 'Habit Cards') {
                const uniquePhrases = Array.from(new Map(fields[key].map(item => [item.text, item])).values());
                 fields[key] = uniquePhrases.filter(phrase => {
                    const isUsedElsewhere = allUsedPhrasesText.has(phrase.text);
                    const isPartOfSelectedHabit = phrasesFromSelectedHabits.has(phrase.text);
                    
                    return !isUsedElsewhere || isPartOfSelectedHabit;
                });
            }
        });
        
        const allUsedHabitCardIds = new Set(patterns.flatMap(p => {
            if (p.id === selectedPatternToUpdate) return [];
            return p.phrases.filter(phrase => phrase.category === 'Habit Cards').map(phrase => phrase.mechanismCardId);
        }));

        let habitIdsForCurrentPattern = new Set<string>();
        if (selectedPatternToUpdate) {
            const patternToEdit = patterns.find(p => p.id === selectedPatternToUpdate);
            if (patternToEdit) {
                habitIdsForCurrentPattern = new Set(
                    patternToEdit.phrases
                        .filter(p => p.category === 'Habit Cards')
                        .map(p => p.mechanismCardId)
                );
            }
        }
        
        fields['Habit Cards'] = habitCards
            .filter(habit => !allUsedHabitCardIds.has(habit.id) || habitIdsForCurrentPattern.has(habit.id))
            .map(habit => {
                const linkedMechanisms: {id: string, name: string}[] = [];
                const mechanismForResponse = mechanismCards.find(m => m.id === habit.response?.resourceId);
                const mechanismForNewResponse = mechanismCards.find(m => m.id === habit.newResponse?.resourceId);

                if (mechanismForResponse) linkedMechanisms.push({id: mechanismForResponse.id, name: mechanismForResponse.name});
                if (mechanismForNewResponse && mechanismForNewResponse.id !== mechanismForResponse?.id) {
                    linkedMechanisms.push({id: mechanismForNewResponse.id, name: mechanismForNewResponse.name});
                }
                
                return {
                    category: 'Habit Cards',
                    text: habit.name,
                    mechanismCardId: habit.id,
                    // @ts-ignore - It's fine to add a temporary property for display
                    linkedMechanisms: linkedMechanisms.map(m => m.name)
                };
            });

        return fields;
    }, [mechanismCards, habitCards, patterns, selectedPatternToUpdate, selectedPhrases]);


    const handlePhraseToggle = (phrase: PatternPhrase) => {
        const isSelected = selectedPhrases.some(p => p.text === phrase.text);

        if (phrase.category === 'Habit Cards') {
            const habitCard = habitCards.find(h => h.id === phrase.mechanismCardId);
            if (!habitCard) return; // Should not happen

            const relatedMechanismIds = new Set([habitCard.response?.resourceId, habitCard.newResponse?.resourceId].filter(Boolean));

            const relatedPhrases = Object.values(aggregatedFields)
                .flat()
                .filter(p => p.category !== 'Habit Cards' && p.mechanismCardId && relatedMechanismIds.has(p.mechanismCardId));

            if (!isSelected) {
                // Add the habit and all its related unselected phrases
                const phrasesToAdd = [...relatedPhrases, phrase];
                setSelectedPhrases(prev => {
                    const newSelectionMap = new Map(prev.map(p => [p.text, p]));
                    phrasesToAdd.forEach(p_to_add => {
                        if (!newSelectionMap.has(p_to_add.text)) {
                            newSelectionMap.set(p_to_add.text, p_to_add);
                        }
                    });
                    return Array.from(newSelectionMap.values());
                });
            } else {
                // Remove the habit and its related phrases, but only if they aren't part of another selected habit.
                const phrasesToRemove = new Set([phrase.text, ...relatedPhrases.map(p => p.text)]);

                // Get mechanism IDs of OTHER selected habits
                const otherSelectedHabitsMechanisms = new Set<string>();
                selectedPhrases.forEach(p => {
                    if (p.category === 'Habit Cards' && p.text !== phrase.text) {
                        const otherHabitCard = habitCards.find(h => h.id === p.mechanismCardId);
                        if (otherHabitCard) {
                            if (otherHabitCard.response?.resourceId) otherSelectedHabitsMechanisms.add(otherHabitCard.response.resourceId);
                            if (otherHabitCard.newResponse?.resourceId) otherSelectedHabitsMechanisms.add(otherHabitCard.newResponse.resourceId);
                        }
                    }
                });

                setSelectedPhrases(prev => prev.filter(p => {
                    if (!phrasesToRemove.has(p.text)) return true; // Keep if not part of the current habit's group
                    if (p.text === phrase.text) return false; // Always remove the clicked habit

                    // Keep a related phrase if it's also related to another selected habit
                    if (p.mechanismCardId && otherSelectedHabitsMechanisms.has(p.mechanismCardId)) {
                        return true;
                    }

                    return false;
                }));
            }
        } else {
             // Default behavior for non-habit phrases
            if (!isSelected) {
                setSelectedPhrases(prev => [...prev, phrase]);
            } else {
                setSelectedPhrases(prev => prev.filter(p => p.text !== phrase.text));
            }
        }
    };

    const handleCreateOrUpdatePattern = () => {
        if (selectedPhrases.length === 0) {
            toast({ title: 'Error', description: 'Please select at least one phrase.', variant: 'destructive' });
            return;
        }

        if (selectedPatternToUpdate) {
            // Update existing pattern
            setPatterns(prev => prev.map(p => 
                p.id === selectedPatternToUpdate ? { ...p, phrases: selectedPhrases } : p
            ));
            toast({ title: 'Pattern Updated!', description: `The pattern has been updated with your new phrase selections.`});
        }
        else {
            if (!newPatternName.trim()) {
                toast({ title: 'Error', description: 'Pattern name cannot be empty.', variant: 'destructive' });
                return;
            }
            const newPattern: Pattern = {
                id: `pattern_${Date.now()}`,
                name: newPatternName,
                type: newPatternType,
                phrases: selectedPhrases,
            };
            setPatterns(prev => [...prev, newPattern]);
            setNewPatternName('');
            toast({ title: 'Pattern Created!', description: `The "${newPattern.name}" pattern has been saved.`});
        }

        setSelectedPhrases([]);
        setSelectedPatternToUpdate(null);
    };

    const handleDeletePattern = (patternId: string) => {
        setPatterns(prev => prev.filter(p => p.id !== patternId));
        setMetaRules(prev => prev.filter(r => r.patternId !== patternId));
    };

    const handleAddMetaRule = () => {
        if (!newMetaRuleText.trim()) {
            toast({ title: 'Error', description: 'Meta-rule cannot be empty.', variant: 'destructive' });
            return;
        }
        if (!selectedPatternForRule) {
            toast({ title: 'Error', description: 'Please select a pattern to base this rule on.', variant: 'destructive' });
            return;
        }

        const newRule: MetaRule = {
            id: `rule_${Date.now()}`,
            text: newMetaRuleText.trim(),
            patternId: selectedPatternForRule,
        };
        setMetaRules(prev => [...prev, newRule]);
        setNewMetaRuleText('');
        setSelectedPatternForRule(null);
        toast({ title: 'Meta-Rule Created!', description: 'A new rule has been added to your Purpose page.' });
    };

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
        handleOpenNestedPopup(habitId, e);
    };

    const pillars = [
        { name: 'Mind', icon: <Brain className="h-6 w-6 text-blue-500" />, attributes: ['Focus', 'Learning', 'Creativity'] },
        { name: 'Body', icon: <HeartPulse className="h-6 w-6 text-red-500" />, attributes: ['Health', 'Strength', 'Energy'] },
        { name: 'Heart', icon: <HandHeart className="h-6 w-6 text-pink-500" />, attributes: ['Relationships', 'Emotional Health'] },
        { name: 'Spirit', icon: <TrendingUp className="h-6 w-6 text-purple-500" />, attributes: ['Meaning', 'Contribution', 'Legacy'] },
    ];

    const handleUpdatePillar = (id: string, pillar: string) => {
        setMetaRules(prev => prev.map(r => r.id === id ? { ...r, purposePillar: pillar } : r));
    };

    const handleStartEditPattern = (pattern: Pattern) => {
        setEditingPatternId(pattern.id);
        setEditingPatternName(pattern.name);
    };

    const handleSavePatternName = () => {
        if (!editingPatternId || !editingPatternName.trim()) {
            setEditingPatternId(null);
            return;
        }
        setPatterns(prev => prev.map(p => 
            p.id === editingPatternId ? { ...p, name: editingPatternName.trim() } : p
        ));
        setEditingPatternId(null);
    };

    const openEditModal = (pattern: Pattern) => {
        setEditingPattern(pattern);
        setEditedPatternPhrases(pattern.phrases);
    };

    const handlePhraseToggleInModal = (phrase: PatternPhrase) => {
        setEditedPatternPhrases(prev => {
            const isSelected = prev.some(p => p.text === phrase.text);
            if (isSelected) {
                return prev.filter(p => p.text !== phrase.text);
            }
            return [...prev, phrase];
        });
    };
    
    const handleSaveChangesInModal = () => {
        if (!editingPattern) return;

        setPatterns(prev => prev.map(p => {
            if (p.id === editingPattern.id) {
                return { ...p, name: editingPattern.name, phrases: editedPatternPhrases };
            }
            return p;
        }));

        setEditingPattern(null);
        toast({ title: 'Pattern Updated!', description: 'Your changes have been saved.' });
    };

    const allAvailablePhrases = useMemo(() => {
        const allPhrasesMap = new Map<string, PatternPhrase>();
        Object.values(aggregatedFields).flat().forEach(p => allPhrasesMap.set(p.text, p));
        if (editingPattern) {
            editingPattern.phrases.forEach(p => allPhrasesMap.set(p.text, p));
        }
        return Array.from(allPhrasesMap.values());
    }, [aggregatedFields, editingPattern]);

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-primary">Pattern Recognition</h1>
                <p className="mt-4 text-lg text-muted-foreground">Discover the underlying rules that govern your behavior.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen/> Step 1: Collect Data</CardTitle>
                    <CardDescription>For a week (or longer), fill out both the Negative and Positive Frameworks for different actions in your life. Don’t overthink — just write what comes to mind, even if it’s messy.</CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText /> Step 2: Review Your Data</CardTitle>
                    <CardDescription>Review aggregated data from your Mechanism cards. Select phrases that repeat or resonate with you.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        {Object.entries(aggregatedFields).map(([title, phrases]) => (
                            <div key={title}>
                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                {title === 'Habit Cards' && <Workflow className="h-4 w-4 text-muted-foreground" />}
                                {title}
                                </h3>
                                <ScrollArea className="h-60 border rounded-md p-2">
                                    {phrases.length > 0 ? (
                                        <div className="space-y-2">
                                            {phrases.map((phrase, i) => (
                                                <div key={i} className="flex items-start space-x-2">
                                                    <Checkbox
                                                        id={`phrase-${title}-${i}`}
                                                        checked={selectedPhrases.some(p => p.text === phrase.text)}
                                                        onCheckedChange={() => handlePhraseToggle(phrase)}
                                                    />
                                                    <Label htmlFor={`phrase-${title}-${i}`} className="font-normal w-full flex-grow cursor-pointer">
                                                    {phrase.category === 'Habit Cards' ? (
                                                        <Card className="p-2 bg-muted/30">
                                                        <p className="font-semibold text-foreground">{phrase.text}</p>
                                                        {(phrase.linkedMechanisms && phrase.linkedMechanisms.length > 0) && (
                                                            <div className="mt-1 pt-1 border-t">
                                                            <p className="text-xs text-muted-foreground font-medium">Linked Mechanisms:</p>
                                                            <ul className="list-disc list-inside text-xs text-muted-foreground">
                                                                {/* @ts-ignore */}
                                                                {phrase.linkedMechanisms.map((mech, hIndex) => <li key={hIndex}>{mech}</li>)}
                                                            </ul>
                                                            </div>
                                                        )}
                                                        </Card>
                                                    ) : (
                                                        phrase.text
                                                    )}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-muted-foreground text-center pt-8">No unassigned data for this category.</p>}
                                </ScrollArea>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Zap /> Step 3: Define Your Pattern</CardTitle>
                    <CardDescription>Group your selected phrases into a new pattern or edit an existing one.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <Label className="font-semibold">Selected Phrases ({selectedPhrases.length})</Label>
                        <ScrollArea className="h-48 border rounded-md p-3 mt-2">
                            {selectedPhrases.length > 0 ? (
                                <ul className="list-disc list-inside space-y-1">
                                    {selectedPhrases.map((phrase, i) => <li key={i} className="text-sm">{phrase.text} <span className="text-xs text-muted-foreground">({phrase.category})</span></li>)}
                                </ul>
                            ) : <p className="text-xs text-muted-foreground text-center pt-10">Select phrases from Step 2 to create or edit a pattern.</p>}
                        </ScrollArea>
                    </div>
                    <div className="space-y-4">
                        <RadioGroup value={selectedPatternToUpdate || 'new'} onValueChange={(v) => setSelectedPatternToUpdate(v === 'new' ? null : v)}>
                        <div className="flex items-center space-x-2">
                                <RadioGroupItem value="new" id="type-new-pattern" />
                                <Label htmlFor="type-new-pattern">Create New Pattern</Label>
                            </div>
                            {patterns.map(p => (
                                <div key={p.id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={p.id} id={`pattern-${p.id}`} />
                                    <Label htmlFor={`pattern-${p.id}`}>Edit Pattern: <span className="font-semibold">{p.name}</span></Label>
                                </div>
                            ))}
                        </RadioGroup>

                        {!selectedPatternToUpdate && (
                            <div className="space-y-4 pl-6 border-l-2 ml-2">
                                <div>
                                    <Label htmlFor="pattern-name">New Pattern Name</Label>
                                    <Input id="pattern-name" value={newPatternName} onChange={e => setNewPatternName(e.target.value)} placeholder="e.g., Energy Feeders" />
                                </div>
                                <div>
                                    <Label>Pattern Type</Label>
                                    <RadioGroup value={newPatternType} onValueChange={(v) => setNewPatternType(v as any)} className="flex items-center space-x-4 mt-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="Positive" id="type-positive" /><Label htmlFor="type-positive">Positive</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="Negative" id="type-negative" /><Label htmlFor="type-negative">Negative</Label></div>
                                    </RadioGroup>
                                </div>
                            </div>
                        )}

                        <Button onClick={handleCreateOrUpdatePattern} disabled={selectedPhrases.length === 0}>
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            {selectedPatternToUpdate ? 'Update Pattern' : 'Create Pattern'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lightbulb /> Step 4: Create Meta-Rules</CardTitle>
                    <CardDescription>Turn your defined patterns into actionable life rules. These will appear on your Purpose page.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <Label className="font-semibold">Your Defined Patterns</Label>
                        <ScrollArea className="h-60 mt-2 pr-4">
                            {patterns.length > 0 ? (
                                <RadioGroup value={selectedPatternForRule || ''} onValueChange={setSelectedPatternForRule} className="space-y-4">
                                    {patterns.map(p => {
                                        const isSelected = selectedPatternForRule === p.id;
                                        const categorizedPhrases = isSelected ? p.phrases.reduce((acc, phrase) => {
                                            if (phrase.category === 'Habit Cards') return acc;
                                            if (!acc[phrase.category]) { // @ts-ignore
                                                acc[phrase.category] = [];
                                            }
                                            // @ts-ignore
                                            acc[phrase.category].push(phrase);
                                            return acc;
                                        }, {} as Record<string, PatternPhrase[]>) : null;

                                        const linkedHabits = isSelected ? getHabitLinksForRule(p) : [];

                                        return (
                                            <Card key={p.id} className={cn("transition-all", isSelected && "ring-2 ring-primary")}>
                                                <CardHeader className="p-3">
                                                <div className="flex flex-row items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-grow min-w-0">
                                                        <RadioGroupItem value={p.id} id={`rule-pattern-${p.id}`} />
                                                        <div className="flex-grow cursor-pointer" onClick={() => handleStartEditPattern(p)}>
                                                            {editingPatternId === p.id ? (
                                                                <Input 
                                                                    value={editingPatternName}
                                                                    onChange={(e) => setEditingPatternName(e.target.value)}
                                                                    onBlur={handleSavePatternName}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleSavePatternName()}
                                                                    className="h-8"
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant={p.type === 'Positive' ? 'default' : 'destructive'}>{p.type}</Badge>
                                                                    <span className="font-semibold">{p.name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                     <div className="flex items-center">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditModal(p); }}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDeletePattern(p.id); }}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                </CardHeader>
                                                {isSelected && (
                                                <CardContent className="p-3 pt-0 text-xs">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                                        {categorizedPhrases && Object.entries(categorizedPhrases).map(([category, phrases]) => {
                                                            if (category === 'Habit Cards') return null;
                                                            return (
                                                                <div key={category}>
                                                                    <h4 className="font-medium text-muted-foreground mb-1">{category}</h4>
                                                                    <ul className="list-disc list-inside space-y-1">
                                                                        {phrases.map((phrase, i) => <li key={i}>{phrase.text}</li>)}
                                                                    </ul>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                    {linkedHabits.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t md:col-span-2">
                                                            <h4 className="font-medium text-muted-foreground mb-1">Habits</h4>
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
                                                </CardContent>
                                                )}
                                            </Card>
                                        );
                                    })}
                                </RadioGroup>
                            ) : (
                                <div className="h-full flex items-center justify-center border rounded-md">
                                    <p className="text-sm text-muted-foreground text-center">No patterns defined yet.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="meta-rule">New Meta-Rule</Label>
                            <Textarea id="meta-rule" value={newMetaRuleText} onChange={e => setNewMetaRuleText(e.target.value)} placeholder="e.g., Every day must start with an Energy Feeder." />
                            <Button onClick={handleAddMetaRule} className="mt-2" disabled={!selectedPatternForRule || !newMetaRuleText.trim()}>Add Rule</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lightbulb /> Defined Meta-Rules</CardTitle>
                    <CardDescription>A list of all the life rules you've created from your patterns.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-60">
                        {metaRules.length > 0 ? (
                            <div className="space-y-2 pr-4">
                                {metaRules.map(rule => {
                                    const pattern = patterns.find(p => p.id === rule.patternId);
                                    return (
                                        <div key={rule.id} className="p-3 rounded-md border bg-muted/30 flex justify-between items-center group">
                                            <div>
                                                <p className="font-medium">{rule.text}</p>
                                                {pattern && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Based on pattern: <span className="font-semibold">{pattern.name}</span>
                                                    </p>
                                                )}
                                            </div>
                                             <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Badge className="capitalize">{rule.purposePillar?.[0] || '?'}</Badge>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-56">
                                                        {pillars.map(pillar => (
                                                            <DropdownMenuGroup key={pillar.name}>
                                                                <DropdownMenuItem onSelect={() => handleUpdatePillar(rule.id, pillar.name)}>
                                                                    {pillar.name}
                                                                </DropdownMenuItem>
                                                                {pillar.attributes.map(attr => (
                                                                    <DropdownMenuItem key={attr} onSelect={() => handleUpdatePillar(rule.id, attr)} className="pl-6">
                                                                        {attr}
                                                                    </DropdownMenuItem>
                                                                ))}
                                                            </DropdownMenuGroup>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-40">
                                <p className="text-muted-foreground">No meta-rules defined yet.</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {editingPattern && (
                <Dialog open={!!editingPattern} onOpenChange={() => setEditingPattern(null)}>
                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Edit Pattern: {editingPattern.name}</DialogTitle>
                            <DialogDescription>Add or remove phrases to refine this pattern.</DialogDescription>
                        </DialogHeader>
                        <div className="flex-grow min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col">
                                <Label className="font-semibold mb-2">Available Phrases</Label>
                                <ScrollArea className="h-full border rounded-md p-2">
                                    {Object.entries(aggregatedFields).map(([title, phrases]) => (
                                        <div key={title} className="mb-4">
                                            <h3 className="font-semibold mb-2 text-sm">{title}</h3>
                                            <div className="space-y-2">
                                                {(phrases || []).map((phrase, i) => (
                                                    <div key={`avail-${i}`} className="flex items-start space-x-2">
                                                        <Checkbox
                                                            id={`avail-phrase-${title}-${i}`}
                                                            checked={editedPatternPhrases.some(p => p.text === phrase.text)}
                                                            onCheckedChange={() => handlePhraseToggleInModal(phrase)}
                                                        />
                                                        <Label htmlFor={`avail-phrase-${title}-${i}`} className="font-normal w-full flex-grow cursor-pointer">{phrase.text}</Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </ScrollArea>
                            </div>
                             <div className="flex flex-col">
                                <Label className="font-semibold mb-2">Selected Phrases ({editedPatternPhrases.length})</Label>
                                <ScrollArea className="h-full border rounded-md p-2">
                                    <div className="space-y-2">
                                        {editedPatternPhrases.map((phrase, i) => (
                                            <div key={`sel-${i}`} className="flex items-start space-x-2">
                                                <Checkbox
                                                    id={`sel-phrase-${i}`}
                                                    checked={true}
                                                    onCheckedChange={() => handlePhraseToggleInModal(phrase)}
                                                />
                                                <Label htmlFor={`sel-phrase-${i}`} className="font-normal w-full flex-grow cursor-pointer">{phrase.text}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingPattern(null)}>Cancel</Button>
                            <Button onClick={handleSaveChangesInModal}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

export default function PatternsPage() {
    return (
        <AuthGuard>
            <PatternsPageContent />
        </AuthGuard>
    );
}
    






