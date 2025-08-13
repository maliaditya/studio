
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
import { FileText, Lightbulb, Zap, PlusCircle, Trash2, BookOpen, Workflow, ArrowRight, Brain, HeartPulse, HandHeart, TrendingUp, Edit, Save, MinusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Pattern, PatternPhrase, MetaRule, Resource } from '@/types/workout';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


const FormattedPatternName = ({ name, type }: { name: string; type: 'Positive' | 'Negative' }) => {
    const parts = name.split(' → ').map(p => p.trim());
    
    const positiveColors = ["text-yellow-500", "text-orange-500", "text-green-500"];
    const negativeColors = ["text-blue-500", "text-teal-500", "text-red-500"];
    
    const colors = type === 'Positive' ? positiveColors : negativeColors;

    if (parts.length >= 3) {
      const primaryPart = parts[0];
      const outcome = parts[parts.length - 1];
      
      if (parts.length >= 5) { // secondary action/cause exists
        const secondaryPart = parts[2] + ' + ' + parts[3];
        const causePart = parts[1];
        return (
          <span className="font-semibold">
            <span className={colors[0]}>{primaryPart} + {causePart}</span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className={colors[1]}>{secondaryPart}</span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className={colors[2]}>{outcome}</span>
          </span>
        )
      } else { // only primary action/cause
         const causePart = parts[1];
         return (
          <span className="font-semibold">
            <span className={colors[0]}>{primaryPart} + {causePart}</span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className={colors[1]}>{outcome}</span>
          </span>
        )
      }
    }
    
    // Fallback for old format or simple patterns
    return <span className="font-semibold">{name}</span>;
};


function PatternsPageContent() {
    const { resources, patterns, setPatterns, metaRules, setMetaRules, handleOpenNestedPopup } = useAuth();
    const { toast } = useToast();

    const [selectedPhrases, setSelectedPhrases] = useState<PatternPhrase[]>([]);
    const [newPatternAction, setNewPatternAction] = useState('');
    const [newPatternCause, setNewPatternCause] = useState('');
    const [newPatternAction2, setNewPatternAction2] = useState('');
    const [newPatternCause2, setNewPatternCause2] = useState('');
    const [newPatternOutcome, setNewPatternOutcome] = useState('');
    const [newPatternType, setNewPatternType] = useState<'Positive' | 'Negative'>('Positive');
    const [selectedPatternToUpdate, setSelectedPatternToUpdate] = useState<string | null>(null);

    const [newMetaRuleText, setNewMetaRuleText] = useState('');
    const [selectedPatternForRule, setSelectedPatternForRule] = useState<string | null>(null);
    
    const [editingPatternId, setEditingPatternId] = useState<string | null>(null);
    const [editingPatternName, setEditingPatternName] = useState('');
    
    const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
    const [editedPatternPhrases, setEditedPatternPhrases] = useState<PatternPhrase[]>([]);
    
    const [showSecondaryAction, setShowSecondaryAction] = useState(false);
    
    const [editedPatternFields, setEditedPatternFields] = useState({
        action1: '', cause1: '', action2: '', cause2: '', outcome: '', type: 'Positive' as 'Positive' | 'Negative'
    });
    const [showSecondaryActionEdit, setShowSecondaryActionEdit] = useState(false);


    useEffect(() => {
        if (selectedPatternToUpdate) {
            const patternToEdit = patterns.find(p => p.id === selectedPatternToUpdate);
            if (patternToEdit) {
                setSelectedPhrases(patternToEdit.phrases);
                
                const parts = patternToEdit.name.split(' → ');
                if (parts.length >= 5) { // Action + Cause → Action + Cause → Outcome
                    const action1 = parts[0].split(' + ')[0] || '';
                    const cause1 = parts[0].split(' + ')[1] || '';
                    const action2 = parts[1].split(' + ')[0] || '';
                    const cause2 = parts[1].split(' + ')[1] || '';
                    const outcome = parts[2] || '';
                    setEditedPatternFields({ action1, cause1, action2, cause2, outcome, type: patternToEdit.type });
                    setShowSecondaryActionEdit(true);
                } else if (parts.length >= 2) { // Action + Cause → Outcome
                    const action1 = parts[0].split(' + ')[0] || '';
                    const cause1 = parts[0].split(' + ')[1] || '';
                    const outcome = parts[1] || '';
                    setEditedPatternFields({ action1, cause1, outcome, action2: '', cause2: '', type: patternToEdit.type });
                    setShowSecondaryActionEdit(false);
                } else { // Fallback for old format
                    setEditedPatternFields({ action1: patternToEdit.name, cause1: '', action2: '', cause2: '', outcome: '', type: patternToEdit.type });
                    setShowSecondaryActionEdit(false);
                }
            }
        } else {
            setSelectedPhrases([]);
        }
    }, [selectedPatternToUpdate, patterns]);

    const { habitCards, mechanismCards } = useMemo(() => {
        const habits = resources.filter(r => r.type === 'habit');
        const mechanisms = resources.filter(r => r.type === 'mechanism');
        return { habitCards: habits, mechanismCards: mechanisms };
    }, [resources]);
    
    const aggregatedFields = useMemo(() => {
        const allPossiblePhrases: PatternPhrase[] = [];
        mechanismCards.forEach(card => {
            if (card.mechanismFramework === 'positive') {
                if (card.benefit) allPossiblePhrases.push({ category: 'Benefits', text: card.benefit, mechanismCardId: card.id, mechanismCardName: card.name });
                if (card.reward) allPossiblePhrases.push({ category: 'Benefits', text: card.reward, mechanismCardId: card.id, mechanismCardName: card.name });
                if (card.law?.premise && card.law?.outcome) allPossiblePhrases.push({ category: 'Positive Laws', text: `${card.law.premise} can only happen when ${card.law.outcome}`, mechanismCardId: card.id, mechanismCardName: card.name });
            } else { // negative
                if (card.trigger?.feeling && card.benefit) allPossiblePhrases.push({ category: 'Costs', text: `That one ${card.trigger.feeling} costs me ${card.benefit}.`, mechanismCardId: card.id, mechanismCardName: card.name });
                if (card.reward) allPossiblePhrases.push({ category: 'Costs', text: `This blocks ${card.reward}.`, mechanismCardId: card.id, mechanismCardName: card.name });
                if (card.law?.premise && card.law?.outcome) allPossiblePhrases.push({ category: 'Negative Laws', text: `${card.law.premise} cannot happen when ${card.law.outcome}`, mechanismCardId: card.id, mechanismCardName: card.name });
            }
        });

        let habitsToDisplay: Resource[];
        
        if (selectedPatternToUpdate) {
            const currentPatternHabitIds = new Set(
                patterns.find(p => p.id === selectedPatternToUpdate)?.phrases
                    .filter(ph => ph.category === 'Habit Cards')
                    .map(ph => ph.mechanismCardId) || []
            );
            const allOtherHabitIds = new Set(
                patterns.flatMap(p => p.id === selectedPatternToUpdate ? [] : p.phrases.filter(ph => ph.category === 'Habit Cards').map(ph => ph.mechanismCardId))
            );
            habitsToDisplay = habitCards.filter(h => currentPatternHabitIds.has(h.id) || !allOtherHabitIds.has(h.id));
        } else {
            const allHabitIdsInAnyPattern = new Set(patterns.flatMap(p => p.phrases.filter(ph => ph.category === 'Habit Cards').map(ph => ph.mechanismCardId)));
            habitsToDisplay = habitCards.filter(h => !allHabitIdsInAnyPattern.has(h.id));
        }

        const habitPhrases = habitsToDisplay.map(habit => {
            const linkedMechanisms = [
                habit.response?.resourceId,
                habit.newResponse?.resourceId
            ].filter(Boolean).map(id => mechanismCards.find(m => m.id === id)?.name).filter(Boolean);
            return { category: 'Habit Cards' as const, text: habit.name, mechanismCardId: habit.id, linkedMechanisms: linkedMechanisms as string[] };
        });

        const phrasesByCategory: Record<string, PatternPhrase[]> = { 'Habit Cards': habitPhrases };
        
        const displayedHabitMechanismIds = new Set(
            habitsToDisplay.flatMap(h => [h.response?.resourceId, h.newResponse?.resourceId]).filter(Boolean)
        );

        allPossiblePhrases.forEach(p => {
            if (p.mechanismCardId && displayedHabitMechanismIds.has(p.mechanismCardId)) {
                if (!phrasesByCategory[p.category]) phrasesByCategory[p.category] = [];
                phrasesByCategory[p.category].push(p);
            }
        });
        
        return phrasesByCategory;
    }, [habitCards, mechanismCards, patterns, selectedPatternToUpdate]);


     const handlePhraseToggle = (phrase: PatternPhrase) => {
        const isSelected = selectedPhrases.some(p => p.text === phrase.text);
        
        const allPossiblePhrases: PatternPhrase[] = [];
        mechanismCards.forEach(card => {
          if (card.mechanismFramework === 'positive') {
            if (card.benefit) allPossiblePhrases.push({ category: 'Benefits', text: card.benefit, mechanismCardId: card.id, mechanismCardName: card.name });
            if (card.reward) allPossiblePhrases.push({ category: 'Benefits', text: card.reward, mechanismCardId: card.id, mechanismCardName: card.name });
            if (card.law?.premise && card.law?.outcome) allPossiblePhrases.push({ category: 'Positive Laws', text: `${card.law.premise} can only happen when ${card.law.outcome}`, mechanismCardId: card.id, mechanismCardName: card.name });
          } else {
            if (card.trigger?.feeling && card.benefit) allPossiblePhrases.push({ category: 'Costs', text: `That one ${card.trigger.feeling} costs me ${card.benefit}.`, mechanismCardId: card.id, mechanismCardName: card.name });
            if (card.reward) allPossiblePhrases.push({ category: 'Costs', text: `This blocks ${card.reward}.`, mechanismCardId: card.id, mechanismCardName: card.name });
            if (card.law?.premise && card.law?.outcome) allPossiblePhrases.push({ category: 'Negative Laws', text: `${card.law.premise} cannot happen when ${card.law.outcome}`, mechanismCardId: card.id, mechanismCardName: card.name });
          }
        });
    
        if (phrase.category === 'Habit Cards') {
            const habitCard = habitCards.find(h => h.id === phrase.mechanismCardId);
            if (!habitCard) return; 
            
            const relatedMechanismIds = new Set([habitCard.response?.resourceId, habitCard.newResponse?.resourceId].filter(Boolean));
            const relatedPhrases = allPossiblePhrases.filter(p => p.mechanismCardId && relatedMechanismIds.has(p.mechanismCardId));
            const allPhrasesToToggle = [phrase, ...relatedPhrases];
    
            if (!isSelected) {
                // Add habit and all related phrases if not already present
                setSelectedPhrases(prev => {
                    const newPhrasesToAdd = allPhrasesToToggle.filter(p => !prev.some(sp => sp.text === p.text));
                    return [...prev, ...newPhrasesToAdd];
                });
            } else {
                // Remove habit and all its related phrases from the selection
                const phrasesToRemoveTexts = new Set(allPhrasesToToggle.map(p => p.text));
                setSelectedPhrases(prev => prev.filter(p => !phrasesToRemoveTexts.has(p.text)));
            }
        } else {
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
            const { action1, cause1, action2, cause2, outcome, type } = editedPatternFields;
            if (!action1.trim() || !outcome.trim()) {
                 toast({ title: 'Error', description: 'Action and Outcome cannot be empty.', variant: 'destructive' });
                return;
            }
            let nameParts = [`${action1.trim()}${cause1 ? ' + ' + cause1.trim() : ''}`];
            if (showSecondaryActionEdit && action2.trim()) {
                nameParts.push(`${action2.trim()}${cause2 ? ' + ' + cause2.trim() : ''}`);
            }
            nameParts.push(outcome.trim());
            const updatedName = nameParts.join(' → ');

            setPatterns(prev => prev.map(p => 
                p.id === selectedPatternToUpdate ? { ...p, phrases: selectedPhrases, name: updatedName, type: type } : p
            ));
            toast({ title: 'Pattern Updated!', description: `The pattern has been updated.`});
        } else {
            if (!newPatternAction.trim() || !newPatternOutcome.trim()) {
                toast({ title: 'Error', description: 'Action and Outcome cannot be empty.', variant: 'destructive' });
                return;
            }
            let nameParts = [`${newPatternAction.trim()}${newPatternCause ? ' + ' + newPatternCause.trim() : ''}`];
            if (showSecondaryAction && newPatternAction2.trim()) {
                nameParts.push(`${newPatternAction2.trim()}${newPatternCause2 ? ' + ' + newPatternCause2.trim() : ''}`);
            }
            nameParts.push(newPatternOutcome.trim());

            const newPatternName = nameParts.join(' → ');

            const newPattern: Pattern = {
                id: `pattern_${Date.now()}`,
                name: newPatternName,
                type: newPatternType,
                phrases: selectedPhrases,
            };
            setPatterns(prev => [...prev, newPattern]);
            setNewPatternAction('');
            setNewPatternCause('');
            setNewPatternAction2('');
            setNewPatternCause2('');
            setNewPatternOutcome('');
            setShowSecondaryAction(false);
            toast({ title: 'Pattern Created!', description: `The "${newPatternName}" pattern has been saved.`});
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
        const isSelected = editedPatternPhrases.some(p => p.text === phrase.text);
    
        if (phrase.category === 'Habit Cards') {
            const habitCard = habitCards.find(h => h.id === phrase.mechanismCardId);
            if (!habitCard) return; 

            const allPhrasesFromAllMechanisms = Object.values(aggregatedFields).flat();
            const relatedMechanismIds = new Set([habitCard.response?.resourceId, habitCard.newResponse?.resourceId].filter(Boolean));
            const relatedPhrases = allPhrasesFromAllMechanisms.filter(p => p.mechanismCardId && relatedMechanismIds.has(p.mechanismCardId));
            const allPhrasesToToggle = [phrase, ...relatedPhrases];
            
            if (!isSelected) {
                setEditedPatternPhrases(prev => [...prev, ...allPhrasesToToggle]);
            } else {
                const phrasesToRemoveTexts = new Set(allPhrasesToToggle.map(p => p.text));
                setEditedPatternPhrases(prev => prev.filter(p => !phrasesToRemoveTexts.has(p.text)));
            }
        } else {
            if (isSelected) {
                setEditedPatternPhrases(prev => prev.filter(p => p.text !== phrase.text));
            } else {
                setEditedPatternPhrases(prev => [...prev, phrase]);
            }
        }
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
        <>
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
                                    {(phrases || []).length > 0 ? (
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
                                    ) : <p className="text-xs text-muted-foreground text-center pt-8">No data for this category.</p>}
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
                                    <Label htmlFor={`pattern-${p.id}`} className="truncate">Edit Pattern: <span className="font-semibold" title={p.name}>{p.name}</span></Label>
                                </div>
                            ))}
                        </RadioGroup>

                        {!selectedPatternToUpdate ? (
                            <div className="space-y-4 pl-6 border-l-2 ml-2">
                                 <div className="space-y-1">
                                    <Label htmlFor="pattern-action">Action</Label>
                                    <Input id="pattern-action" value={newPatternAction} onChange={e => setNewPatternAction(e.target.value)} placeholder="e.g., Late Night Snacking" />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="pattern-cause">→ causes</Label>
                                    <Input id="pattern-cause" value={newPatternCause} onChange={e => setNewPatternCause(e.target.value)} placeholder="e.g., Lowered Cortisol" />
                                </div>
                                {!showSecondaryAction ? (
                                    <Button type="button" variant="outline" size="sm" onClick={() => setShowSecondaryAction(true)}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add secondary action
                                    </Button>
                                ) : (
                                    <div className="space-y-4 border-l-2 pl-4 border-dashed">
                                        <div className="space-y-1">
                                            <Label htmlFor="pattern-action2">→ Action</Label>
                                            <Input id="pattern-action2" value={newPatternAction2} onChange={e => setNewPatternAction2(e.target.value)} placeholder="e.g., Procrastination" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="pattern-cause2">→ causes</Label>
                                            <Input id="pattern-cause2" value={newPatternCause2} onChange={e => setNewPatternCause2(e.target.value)} placeholder="e.g., Dopamine depletion" />
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowSecondaryAction(false)} className="text-destructive hover:text-destructive">
                                            <MinusCircle className="mr-2 h-4 w-4" /> Remove secondary
                                        </Button>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <Label htmlFor="pattern-outcome">Outcome</Label>
                                    <Input id="pattern-outcome" value={newPatternOutcome} onChange={e => setNewPatternOutcome(e.target.value)} placeholder="e.g., Low Energy" />
                                </div>
                                <div>
                                    <Label>Pattern Type</Label>
                                    <RadioGroup value={newPatternType} onValueChange={(v) => setNewPatternType(v as any)} className="flex items-center space-x-4 mt-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="Positive" id="type-positive" /><Label htmlFor="type-positive">Positive</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="Negative" id="type-negative" /><Label htmlFor="type-negative">Negative</Label></div>
                                    </RadioGroup>
                                </div>
                            </div>
                        ) : (
                             <div className="space-y-4 pl-6 border-l-2 ml-2">
                                 <div className="space-y-1">
                                    <Label htmlFor="edit-pattern-action1">Action</Label>
                                    <Input id="edit-pattern-action1" value={editedPatternFields.action1} onChange={e => setEditedPatternFields(f => ({...f, action1: e.target.value}))} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="edit-pattern-cause1">→ causes</Label>
                                    <Input id="edit-pattern-cause1" value={editedPatternFields.cause1} onChange={e => setEditedPatternFields(f => ({...f, cause1: e.target.value}))} />
                                </div>
                                {!showSecondaryActionEdit ? (
                                    <Button type="button" variant="outline" size="sm" onClick={() => setShowSecondaryActionEdit(true)}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add secondary action
                                    </Button>
                                ) : (
                                    <div className="space-y-4 border-l-2 pl-4 border-dashed">
                                        <div className="space-y-1">
                                            <Label htmlFor="edit-pattern-action2">→ Action</Label>
                                            <Input id="edit-pattern-action2" value={editedPatternFields.action2} onChange={e => setEditedPatternFields(f => ({...f, action2: e.target.value}))} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="edit-pattern-cause2">→ causes</Label>
                                            <Input id="edit-pattern-cause2" value={editedPatternFields.cause2} onChange={e => setEditedPatternFields(f => ({...f, cause2: e.target.value}))} />
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowSecondaryActionEdit(false)} className="text-destructive hover:text-destructive">
                                            <MinusCircle className="mr-2 h-4 w-4" /> Remove secondary
                                        </Button>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <Label htmlFor="edit-pattern-outcome">Outcome</Label>
                                    <Input id="edit-pattern-outcome" value={editedPatternFields.outcome} onChange={e => setEditedPatternFields(f => ({...f, outcome: e.target.value}))} />
                                </div>
                                <div>
                                    <Label>Pattern Type</Label>
                                    <RadioGroup value={editedPatternFields.type} onValueChange={(v) => setEditedPatternFields(f => ({...f, type: v as any}))} className="flex items-center space-x-4 mt-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="Positive" id="edit-type-positive" /><Label htmlFor="edit-type-positive">Positive</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="Negative" id="edit-type-negative" /><Label htmlFor="edit-type-negative">Negative</Label></div>
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
                                                        <div className="flex-grow cursor-pointer" onClick={(e) => { e.stopPropagation(); openEditModal(p); }}>
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
                                                                    <div className="truncate" title={p.name}>
                                                                        <FormattedPatternName name={p.name} type={p.type} />
                                                                    </div>
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
                    <CardDescription>A list of all the life rules you've created from your patterns. These will appear on your Purpose page.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-60">
                        {metaRules.length > 0 ? (
                            <div className="space-y-2 pr-4">
                                {metaRules.map(rule => {
                                    const pattern = patterns.find(p => p.id === rule.patternId);
                                    return (
                                        <Dialog key={rule.id}>
                                            <DialogTrigger asChild>
                                                <div className="p-3 rounded-md border bg-muted/30 flex justify-between items-center group cursor-pointer">
                                                    <p className="font-medium">{rule.text}</p>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Badge className="capitalize">{rule.purposePillar?.[0] || '?'}</Badge>
                                                    </div>
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Meta-Rule Details</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <p className="font-semibold text-lg">{rule.text}</p>
                                                    {pattern && (
                                                        <div>
                                                            <h4 className="font-semibold text-muted-foreground">Based on Pattern:</h4>
                                                            <div className="p-2 rounded-md bg-muted/50 mt-1">
                                                                <FormattedPatternName name={pattern.name} type={pattern.type} />
                                                            </div>
                                                        </div>
                                                    )}
                                                     <div>
                                                        <Label>Assign to Pillar</Label>
                                                         <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="outline" className="w-full justify-start mt-1">{rule.purposePillar || 'Select Pillar...'}</Button>
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
                                            </DialogContent>
                                        </Dialog>
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
        </>
    );
}

export default function PatternsPage() {
    return (
        <AuthGuard>
            <PatternsPageContent />
        </AuthGuard>
    );
}
    









    

    






    












    