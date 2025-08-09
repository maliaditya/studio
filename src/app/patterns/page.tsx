"use client";

import React, { useState, useMemo } from 'react';
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
import { FileText, Lightbulb, Zap, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Pattern {
  id: string;
  name: string;
  type: 'Positive' | 'Negative';
  phrases: string[];
}

interface MetaRule {
  id: string;
  text: string;
}

function PatternsPageContent() {
    const { resources } = useAuth();
    const { toast } = useToast();

    const [patterns, setPatterns] = useState<Pattern[]>([]);
    const [metaRules, setMetaRules] = useState<MetaRule[]>([]);
    
    const [selectedPhrases, setSelectedPhrases] = useState<string[]>([]);
    const [newPatternName, setNewPatternName] = useState('');
    const [newPatternType, setNewPatternType] = useState<'Positive' | 'Negative'>('Positive');

    const [newMetaRuleText, setNewMetaRuleText] = useState('');

    const mechanismCards = useMemo(() => {
        return resources.filter(r => r.type === 'mechanism');
    }, [resources]);

    const aggregatedFields = useMemo(() => {
        const fields: Record<string, string[]> = {
            Benefits: [],
            Costs: [],
            PositiveLaws: [],
            NegativeLaws: [],
        };

        mechanismCards.forEach(card => {
            if (card.benefit) fields.Benefits.push(card.benefit);
            if (card.reward) fields.Costs.push(card.reward);
            if (card.law?.premise && card.law?.outcome) {
              if (card.mechanismFramework === 'positive') {
                fields.PositiveLaws.push(`${card.law.premise} can only happen when ${card.law.outcome}`);
              } else {
                fields.NegativeLaws.push(`${card.law.premise} cannot happen when ${card.law.outcome}`);
              }
            }
        });

        // Deduplicate while preserving order
        Object.keys(fields).forEach(key => {
            fields[key] = [...new Set(fields[key])];
        });

        return fields;
    }, [mechanismCards]);

    const handlePhraseToggle = (phrase: string) => {
        setSelectedPhrases(prev => 
            prev.includes(phrase)
                ? prev.filter(p => p !== phrase)
                : [...prev, phrase]
        );
    };

    const handleCreatePattern = () => {
        if (!newPatternName.trim()) {
            toast({ title: 'Error', description: 'Pattern name cannot be empty.', variant: 'destructive' });
            return;
        }
        if (selectedPhrases.length === 0) {
            toast({ title: 'Error', description: 'Please select at least one phrase for the pattern.', variant: 'destructive' });
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
        setSelectedPhrases([]);
        toast({ title: 'Pattern Created!', description: `The "${newPattern.name}" pattern has been saved.`});
    };

    const handleDeletePattern = (patternId: string) => {
        setPatterns(prev => prev.filter(p => p.id !== patternId));
    };

    const handleAddMetaRule = () => {
        if (!newMetaRuleText.trim()) return;
        const newRule: MetaRule = {
            id: `rule_${Date.now()}`,
            text: newMetaRuleText,
        };
        setMetaRules(prev => [...prev, newRule]);
        setNewMetaRuleText('');
    };

    const handleDeleteMetaRule = (ruleId: string) => {
        setMetaRules(prev => prev.filter(r => r.id !== ruleId));
    };


    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-primary">Pattern Recognition</h1>
                <p className="mt-4 text-lg text-muted-foreground">Discover the underlying rules that govern your behavior.</p>
            </div>
            
            {/* Step 2: Review */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText /> Step 2: Review Your Data</CardTitle>
                    <CardDescription>Review aggregated data from your Mechanism cards. Select phrases that repeat or resonate with you.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Object.entries(aggregatedFields).map(([title, phrases]) => (
                            <div key={title}>
                                <h3 className="font-semibold mb-2">{title}</h3>
                                <ScrollArea className="h-60 border rounded-md p-2">
                                    {phrases.length > 0 ? (
                                        <div className="space-y-2">
                                            {phrases.map((phrase, i) => (
                                                <div key={i} className="flex items-start space-x-2">
                                                    <Checkbox
                                                        id={`phrase-${title}-${i}`}
                                                        checked={selectedPhrases.includes(phrase)}
                                                        onCheckedChange={() => handlePhraseToggle(phrase)}
                                                    />
                                                    <Label htmlFor={`phrase-${title}-${i}`} className="text-sm font-normal cursor-pointer">
                                                        {phrase}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-xs text-muted-foreground text-center pt-8">No data for this category yet.</p>}
                                </ScrollArea>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Step 3 & 4: Name Pattern */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Zap /> Steps 3 & 4: Spot & Name Patterns</CardTitle>
                    <CardDescription>Group your selected phrases into a named pattern.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <Label className="font-semibold">Selected Phrases ({selectedPhrases.length})</Label>
                        <ScrollArea className="h-48 border rounded-md p-3 mt-2">
                             {selectedPhrases.length > 0 ? (
                                <ul className="list-disc list-inside space-y-1">
                                    {selectedPhrases.map((phrase, i) => <li key={i} className="text-sm">{phrase}</li>)}
                                </ul>
                            ) : <p className="text-xs text-muted-foreground text-center pt-10">Select phrases from Step 2 to create a pattern.</p>}
                        </ScrollArea>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="pattern-name">Pattern Name</Label>
                            <Input id="pattern-name" value={newPatternName} onChange={e => setNewPatternName(e.target.value)} placeholder="e.g., Energy Feeders, Focus Killers" />
                        </div>
                        <div>
                            <Label>Pattern Type</Label>
                            <RadioGroup value={newPatternType} onValueChange={(v) => setNewPatternType(v as any)} className="flex items-center space-x-4 mt-2">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Positive" id="type-positive" />
                                    <Label htmlFor="type-positive">Positive</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Negative" id="type-negative" />
                                    <Label htmlFor="type-negative">Negative</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <Button onClick={handleCreatePattern} disabled={selectedPhrases.length === 0 || !newPatternName.trim()}>
                            <PlusCircle className="mr-2 h-4 w-4"/>
                            Create Pattern
                        </Button>
                    </div>
                </CardContent>
            </Card>
            
            {/* Step 5: Meta-Rules */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lightbulb /> Step 5: Create Meta-Rules</CardTitle>
                    <CardDescription>Turn your defined patterns into actionable life rules.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <Label className="font-semibold">Your Defined Patterns</Label>
                        <ScrollArea className="h-60 mt-2 pr-4">
                            {patterns.length > 0 ? (
                                <div className="space-y-4">
                                {patterns.map(p => (
                                    <Card key={p.id}>
                                        <CardHeader className="p-3 flex flex-row items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={p.type === 'Positive' ? 'default' : 'destructive'}>{p.type}</Badge>
                                                <CardTitle className="text-base">{p.name}</CardTitle>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeletePattern(p.id)}><Trash2 className="h-4 w-4"/></Button>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-0">
                                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                                {p.phrases.map((phrase, i) => <li key={i}>{phrase}</li>)}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                                </div>
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
                            <Button onClick={handleAddMetaRule} className="mt-2">Add Rule</Button>
                        </div>
                        <div>
                            <Label className="font-semibold">Your Meta-Rules</Label>
                            <ScrollArea className="h-40 border rounded-md p-3 mt-2">
                               {metaRules.length > 0 ? (
                                <ul className="space-y-2">
                                    {metaRules.map(rule => (
                                        <li key={rule.id} className="text-sm flex justify-between items-start group">
                                            <span>{rule.text}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteMetaRule(rule.id)}><Trash2 className="h-3 w-3 text-destructive"/></Button>
                                        </li>
                                    ))}
                                </ul>
                               ) : <p className="text-xs text-muted-foreground text-center pt-10">No meta-rules defined yet.</p>}
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
            </Card>
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
