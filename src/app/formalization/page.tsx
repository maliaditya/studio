
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Resource, CoreSkill } from '@/types/workout';
import { BrainCircuit, BookCopy } from 'lucide-react';

function FormalizationPageContent() {
    const { resources, setResources, coreSkills, upskillDefinitions } = useAuth();
    const { toast } = useToast();
    
    const [selectedSpecializationId, setSelectedSpecializationId] = useState<string>('');
    const [selectedResourceId, setSelectedResourceId] = useState<string>('');

    const [elements, setElements] = useState('');
    const [operations, setOperations] = useState('');
    const [patterns, setPatterns] = useState('');
    
    const specializations = useMemo(() => {
        return coreSkills.filter(skill => skill.type === 'Specialization');
    }, [coreSkills]);

    const curiositiesForSpecialization = useMemo(() => {
        if (!selectedSpecializationId) return [];
        const spec = coreSkills.find(s => s.id === selectedSpecializationId);
        if (!spec) return [];
        
        const microSkillNames = new Set(spec.skillAreas.flatMap(sa => sa.microSkills.map(ms => ms.name)));
        
        return upskillDefinitions.filter(def => microSkillNames.has(def.category));
    }, [selectedSpecializationId, coreSkills, upskillDefinitions]);

    const resourcesForCuriosity = useMemo(() => {
        if (!selectedResourceId) return [];
        const curiosity = upskillDefinitions.find(def => def.id === selectedResourceId);
        if (!curiosity || !curiosity.linkedResourceIds) return [];

        return resources.filter(res => curiosity.linkedResourceIds?.includes(res.id));
    }, [selectedResourceId, upskillDefinitions, resources]);

    const selectedResource = useMemo(() => {
        if (!selectedResourceId) return null;
        return resources.find(res => res.id === selectedResourceId);
    }, [selectedResourceId, resources]);

    useEffect(() => {
        if (selectedResource?.formalization) {
            setElements(selectedResource.formalization.elements || '');
            setOperations(selectedResource.formalization.operations || '');
            setPatterns(selectedResource.formalization.patterns || '');
        } else {
            setElements('');
            setOperations('');
            setPatterns('');
        }
    }, [selectedResource]);

    const handleSave = () => {
        if (!selectedResourceId) {
            toast({ title: "Error", description: "No resource selected.", variant: "destructive" });
            return;
        }

        setResources(prevResources => 
            prevResources.map(res => {
                if (res.id === selectedResourceId) {
                    return {
                        ...res,
                        formalization: {
                            elements,
                            operations,
                            patterns
                        }
                    };
                }
                return res;
            })
        );
        toast({ title: "Success", description: "Formalization data saved." });
    };


    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <header className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-3">
                    <BrainCircuit className="h-10 w-10" />
                    Formalization
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Deconstruct curiosities into their fundamental building blocks.
                </p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Selection</CardTitle>
                    <CardDescription>Choose a specialization and a curiosity to begin formalization.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select value={selectedSpecializationId} onValueChange={setSelectedSpecializationId}>
                        <SelectTrigger><SelectValue placeholder="Select Specialization..." /></SelectTrigger>
                        <SelectContent>
                            {specializations.map(spec => (
                                <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedResourceId} onValueChange={setSelectedResourceId} disabled={!selectedSpecializationId}>
                        <SelectTrigger><SelectValue placeholder="Select Curiosity Resource..." /></SelectTrigger>
                        <SelectContent>
                            {curiositiesForSpecialization.map(curiosity => (
                                <SelectItem key={curiosity.id} value={curiosity.id}>{curiosity.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Button onClick={handleSave} disabled={!selectedResourceId}>
                        Save Formalization
                    </Button>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Elements</CardTitle>
                        <CardDescription>Atomic concepts, formulas, functions, or code snippets.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            value={elements} 
                            onChange={(e) => setElements(e.target.value)} 
                            placeholder="Define one element per line..." 
                            className="h-64"
                            disabled={!selectedResourceId}
                        />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Operations</CardTitle>
                        <CardDescription>Define how elements interact. Inputs, outputs, and processes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            value={operations} 
                            onChange={(e) => setOperations(e.target.value)} 
                            placeholder="Describe an operation..." 
                            className="h-64"
                            disabled={!selectedResourceId}
                        />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Patterns</CardTitle>
                        <CardDescription>Combine operations and elements into reusable templates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            value={patterns} 
                            onChange={(e) => setPatterns(e.target.value)} 
                            placeholder="Describe a pattern..." 
                            className="h-64"
                            disabled={!selectedResourceId}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


export default function FormalizationPage() {
    return (
        <AuthGuard>
            <FormalizationPageContent />
        </AuthGuard>
    );
}
