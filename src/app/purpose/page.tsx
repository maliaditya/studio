
"use client";

import React, { useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Edit, Save, Trash2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

function PurposePageContent() {
    const { 
        coreSkills, 
        purposeStatement, 
        setPurposeStatement,
        specializationPurposes,
        setSpecializationPurposes
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

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-primary">
                    Your Purpose
                </h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Define your central mission. Then, connect your specializations to see how every skill you build serves your ultimate goal.
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
                        <Button variant="link" asChild><a href="/skill">Go to the Skill page to add one.</a></Button>
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
