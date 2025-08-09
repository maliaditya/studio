
"use client";

import React, { useState, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, FileText, Lightbulb, Zap, HelpCircle } from 'lucide-react';
import type { Resource } from '@/types/workout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const stepCards = [
    { title: "Step 1: Collect Data", icon: <FileText className="h-6 w-6" />, description: "For a week (or longer), fill out both the Negative and Positive Frameworks for different actions in your life using the Mechanism cards in the Resources page. Don’t overthink — just write what comes to mind, even if it’s messy." },
    { title: "Step 2: Review Side-by-Side", icon: <ChevronRight className="h-6 w-6" />, description: "After you have 10–20 entries, review the aggregated lists below. Put all your “Costs” from the Negative Framework in one list and all your “Benefits” from the Positive Framework in another." },
    { title: "Step 3: Spot Repeats", icon: <Zap className="h-6 w-6" />, description: "Look for phrases, feelings, or outcomes that keep showing up. If the same type of cost or benefit appears in different contexts, that’s a pattern." },
    { title: "Step 4: Name the Pattern", icon: <Lightbulb className="h-6 w-6" />, description: "Give each recurring element a simple name — your subconscious likes labels. Use the form below to define your discovered patterns." },
    { title: "Step 5: Create Meta-Rules", icon: <HelpCircle className="h-6 w-6" />, description: "Turn these patterns into guiding rules for your life. Structure = the container that organizes thoughts. Pattern = the recurring themes your subconscious reveals. Meta-rule = the directive you consciously create from those patterns." },
];

interface Pattern {
  id: string;
  name: string;
  type: 'Positive' | 'Negative';
  rules: string;
}

function PatternsPageContent() {
    const { resources, setResources } = useAuth();
    const [patterns, setPatterns] = useState<Pattern[]>([]);
    const [newPatternName, setNewPatternName] = useState('');
    const [newPatternType, setNewPatternType] = useState<'Positive' | 'Negative'>('Positive');
    const [newPatternRules, setNewPatternRules] = useState('');

    const mechanismCards = useMemo(() => {
        return resources.filter(r => r.type === 'mechanism');
    }, [resources]);

    const aggregatedFields = useMemo(() => {
        const fields: Record<string, string[]> = {
            Costs: [],
            Benefits: [],
            PositiveLaws: [],
            NegativeLaws: [],
        };

        mechanismCards.forEach(card => {
            if (card.mechanismFramework === 'negative') {
                if (card.reward) fields.Costs.push(card.reward);
                if (card.law?.premise && card.law?.outcome) {
                    fields.NegativeLaws.push(`${card.law.premise} cannot happen when ${card.law.outcome}`);
                }
            } else {
                if (card.benefit) fields.Benefits.push(card.benefit);
                 if (card.law?.premise && card.law?.outcome) {
                    fields.PositiveLaws.push(`${card.law.premise} can only happen when ${card.law.outcome}`);
                }
            }
        });
        return fields;
    }, [mechanismCards]);
    
    const handleAddPattern = () => {
        if (!newPatternName.trim()) return;
        const newPattern: Pattern = {
            id: `pattern_${Date.now()}`,
            name: newPatternName,
            type: newPatternType,
            rules: newPatternRules
        };
        setPatterns(prev => [...prev, newPattern]);
        setNewPatternName('');
        setNewPatternRules('');
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-primary">Pattern Recognition</h1>
                <p className="mt-4 text-lg text-muted-foreground">Discover the underlying rules that govern your behavior.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {stepCards.map((step, index) => (
                    <Card key={index} className="text-center">
                        <CardHeader className="items-center">
                            <div className="p-3 rounded-full bg-primary/10 text-primary mb-2">
                                {step.icon}
                            </div>
                            <CardTitle className="text-base">{step.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Review Your Data</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-96 pr-4">
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold mb-2">Benefits (from Positive Frameworks)</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {aggregatedFields.Benefits.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Costs (from Negative Frameworks)</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {aggregatedFields.Costs.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                             <div>
                                <h3 className="font-semibold mb-2">Positive Laws</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {aggregatedFields.PositiveLaws.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                             <div>
                                <h3 className="font-semibold mb-2">Negative Laws</h3>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {aggregatedFields.NegativeLaws.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                        </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
                 <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Define a New Pattern</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <div>
                                <label className="text-sm font-medium">Pattern Name</label>
                                <Input value={newPatternName} onChange={e => setNewPatternName(e.target.value)} placeholder="e.g., Energy Feeders, Focus Killers" />
                            </div>
                             <div>
                                <label className="text-sm font-medium">Pattern Type</label>
                                <div className="flex gap-4 mt-2">
                                     <Button variant={newPatternType === 'Positive' ? 'default' : 'outline'} onClick={() => setNewPatternType('Positive')}>Positive</Button>
                                     <Button variant={newPatternType === 'Negative' ? 'destructive' : 'outline'} onClick={() => setNewPatternType('Negative')}>Negative</Button>
                                </div>
                            </div>
                             <div>
                                <label className="text-sm font-medium">Meta-Rule(s)</label>
                                <Textarea value={newPatternRules} onChange={e => setNewPatternRules(e.target.value)} placeholder="e.g., Every day must start with an Energy Feeder." />
                            </div>
                            <Button onClick={handleAddPattern}>Save Pattern</Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Your Defined Patterns & Rules</CardTitle></CardHeader>
                        <CardContent>
                            <ScrollArea className="h-48">
                            <ul className="space-y-4">
                                {patterns.map(p => (
                                    <li key={p.id}>
                                        <h4 className={`font-semibold ${p.type === 'Positive' ? 'text-green-600' : 'text-red-600'}`}>{p.name}</h4>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.rules}</p>
                                    </li>
                                ))}
                                {patterns.length === 0 && <p className="text-sm text-muted-foreground text-center">No patterns defined yet.</p>}
                            </ul>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
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
