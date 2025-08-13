

"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Edit, Save, Trash2, Check, X, BookOpen, ArrowRight, TrendingUp, Briefcase, HeartPulse, ArrowDown, DollarSign, Shield, Zap, Lightbulb, Brain, HandHeart, Package, Activity, ShoppingBag, Smile, Link as LinkIconLucide, Pill, Lock, ArrowLeft, ThumbsUp, ThumbsDown, Workflow, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import type { Resource, DatedWorkout, MetaRule, ExerciseDefinition, CoreSkill, PurposePillar, PopupState, Project, Stopper, Pattern, Strength, RuleDetailPopupState, HabitEquation } from '@/types/workout';
import { DndContext, type DragEndEvent, useDraggable } from '@dnd-kit/core';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, subDays, parseISO, isBefore, startOfToday, addDays, isAfter } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogPortal } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


function PurposePageContent() {
    const { 
        purposeStatement, 
        setPurposeStatement,
        specializationPurposes,
        setSpecializationPurposes,
        coreSkills,
        setCoreSkills,
        projects,
        setProjects,
        patterns,
        metaRules,
        setMetaRules,
        generalPopups,
        handlePopupDragEnd,
        openRuleDetailPopup, ruleDetailPopup,
        pillarEquations, setPillarEquations,
        habitCards,
    } = useAuth();
    const { toast } = useToast();

    const [isEditingPurpose, setIsEditingPurpose] = useState(false);
    const [purposeInput, setPurposeInput] = useState(purposeStatement);
    
    const [editingMetaRuleId, setEditingMetaRuleId] = useState<string | null>(null);
    const [editedMetaRuleText, setEditedMetaRuleText] = useState('');
    
    const [equationPopupState, setEquationPopupState] = useState<{ pillar: string; equation?: HabitEquation; isOpen: boolean }>({ pillar: '', isOpen: false });

    useEffect(() => {
        setPurposeInput(purposeStatement);
    }, [purposeStatement]);

    const specializations = React.useMemo(() => {
        return coreSkills.filter(skill => skill.type === 'Specialization');
    }, [coreSkills]);

    const handleSavePurpose = () => {
        setPurposeStatement(purposeInput);
        setIsEditingPurpose(false);
        toast({ title: "Purpose Updated", description: "Your central purpose has been saved." });
    };

    const handleUpdatePillar = (id: string, pillar: string, type: 'specialization' | 'meta-rule' | 'project') => {
        if (type === 'specialization') {
            setCoreSkills(prev => prev.map(s => s.id === id ? { ...s, purposePillar: pillar as PurposePillar } : s));
        } else if (type === 'project') {
            setProjects(prev => prev.map(p => p.id === id ? { ...p, purposePillar: pillar as PurposePillar } : p));
        } else {
            setMetaRules(prev => prev.map(r => r.id === id ? { ...r, purposePillar: pillar as PurposePillar } : r));
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

    const handleOpenEquationPopup = (pillar: string, equation?: HabitEquation) => {
        setEquationPopupState({ pillar, equation, isOpen: true });
    };

    const handleSaveEquation = (pillar: string, equation: Omit<HabitEquation, 'id'>) => {
        setPillarEquations(prev => {
            const newEquations = { ...prev };
            const pillarEqs = newEquations[pillar] || [];
            if (equationPopupState.equation?.id) { // Editing existing
                const index = pillarEqs.findIndex(eq => eq.id === equationPopupState.equation!.id);
                if (index > -1) {
                    pillarEqs[index] = { ...equationPopupState.equation, ...equation };
                }
            } else { // Adding new
                pillarEqs.push({ id: `eq_${Date.now()}`, ...equation });
            }
            newEquations[pillar] = pillarEqs;
            return newEquations;
        });
        setEquationPopupState({ pillar: '', isOpen: false });
    };

    const handleDeleteEquation = (pillar: string, equationId: string) => {
        setPillarEquations(prev => {
            const newEquations = { ...prev };
            newEquations[pillar] = (newEquations[pillar] || []).filter(eq => eq.id !== equationId);
            return newEquations;
        });
    };


    const pillars = [
        { name: 'Mind', icon: <Brain className="h-6 w-6 text-blue-500" />, attributes: ['Focus', 'Learning', 'Creativity'] },
        { name: 'Body', icon: <HeartPulse className="h-6 w-6 text-red-500" />, attributes: ['Health', 'Strength', 'Energy'] },
        { name: 'Heart', icon: <HandHeart className="h-6 w-6 text-pink-500" />, attributes: ['Relationships', 'Emotional Health'] },
        { name: 'Spirit', icon: <TrendingUp className="h-6 w-6 text-purple-500" />, attributes: ['Meaning', 'Contribution', 'Legacy'] },
    ];
    
    const renderMetaRule = (rule: { id: string, text: string, patternId: string, purposePillar?: string }) => {
        return (
            <div key={rule.id} className="group relative text-sm p-2 rounded-md transition-colors hover:bg-muted/50 cursor-pointer" onClick={(e) => openRuleDetailPopup(rule.id, e)}>
                <p>{rule.text}</p>
                <div className="absolute top-1 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                          <Badge className="capitalize">{rule.purposePillar?.[0] || '?'}</Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        {pillars.map(pillar => (
                            <DropdownMenuGroup key={pillar.name}>
                                <DropdownMenuItem onSelect={() => handleUpdatePillar(rule.id, pillar.name, 'meta-rule')}>
                                    {pillar.name}
                                </DropdownMenuItem>
                                {pillar.attributes.map(attr => (
                                    <DropdownMenuItem key={attr} onSelect={() => handleUpdatePillar(rule.id, attr, 'meta-rule')} className="pl-6">
                                        {attr}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
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
    
    const uncategorizedRules = useMemo(() => {
      return metaRules.filter(r => !r.purposePillar);
    }, [metaRules]);

    const uncategorizedSkills = useMemo(() => {
        return specializations.filter(s => !s.purposePillar);
    }, [specializations]);
    
    const uncategorizedProjects = useMemo(() => {
        return projects.filter(p => !p.purposePillar);
    }, [projects]);


    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <BrainCircuit className="h-6 w-6 text-primary" />
                            My Central Purpose
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isEditingPurpose ? (
                        <div className="space-y-4">
                            <Textarea
                                value={purposeInput}
                                onChange={(e) => setPurposeInput(e.target.value)}
                                placeholder="“Mind like a fort, Body like steel, Heart like a garden, Spirit like the sun.”"
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
                        <p className="text-lg text-muted-foreground whitespace-pre-wrap min-h-[5rem] cursor-pointer" onClick={() => { setPurposeInput(purposeStatement); setIsEditingPurpose(true); }}>
                            {purposeStatement || "Click to define your purpose..."}
                        </p>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pillars.map(pillar => {
                    const rulesForPillar = metaRules.filter(r => r.purposePillar === pillar.name || pillar.attributes.includes(r.purposePillar || ''));
                    const skillsForPillar = specializations.filter(s => s.purposePillar === pillar.name || pillar.attributes.includes(s.purposePillar || ''));
                    const projectsForPillar = projects.filter(p => p.purposePillar === pillar.name || pillar.attributes.includes(p.purposePillar || ''));
                    const equationsForPillar = pillarEquations[pillar.name] || [];
                    
                    return (
                        <Card key={pillar.name}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-xl">{pillar.icon}{pillar.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                                <div className='space-y-4'>
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2">Meta-Rules</h4>
                                        <div className="space-y-1">
                                            {rulesForPillar.length > 0 ? (
                                                rulesForPillar.map(renderMetaRule)
                                            ) : (
                                                <p className="text-xs text-muted-foreground text-center py-2">No rules assigned.</p>
                                            )}
                                        </div>
                                    </div>
                                    <Separator />
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2">Specializations</h4>
                                        <div className="space-y-1">
                                            {skillsForPillar.length > 0 ? (
                                                skillsForPillar.map(skill => (
                                                    <div key={skill.id} className="text-sm p-2 rounded-md flex justify-between items-center group">
                                                        <span>{skill.name}</span>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                                                <Badge className="capitalize">{skill.purposePillar?.[0] || '?'}</Badge>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                {pillars.map(p => (
                                                                    <DropdownMenuGroup key={p.name}>
                                                                        <DropdownMenuItem onSelect={() => handleUpdatePillar(skill.id, p.name, 'specialization')}>
                                                                            {p.name}
                                                                        </DropdownMenuItem>
                                                                        {p.attributes.map(attr => (
                                                                            <DropdownMenuItem key={attr} onSelect={() => handleUpdatePillar(skill.id, attr, 'specialization')} className="pl-6">
                                                                                {attr}
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                    </DropdownMenuGroup>
                                                                ))}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-muted-foreground text-center py-2">No skills assigned.</p>
                                            )}
                                        </div>
                                    </div>
                                    <Separator />
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2">Projects</h4>
                                        <div className="space-y-1">
                                            {projectsForPillar.length > 0 ? (
                                                projectsForPillar.map(project => (
                                                    <div key={project.id} className="text-sm p-2 rounded-md flex justify-between items-center group">
                                                        <span>{project.name}</span>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                                                <Badge className="capitalize">{project.purposePillar?.[0] || '?'}</Badge>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent>
                                                                {pillars.map(p => (
                                                                    <DropdownMenuGroup key={p.name}>
                                                                        <DropdownMenuItem onSelect={() => handleUpdatePillar(project.id, p.name, 'project')}>
                                                                            {p.name}
                                                                        </DropdownMenuItem>
                                                                        {p.attributes.map(attr => (
                                                                            <DropdownMenuItem key={attr} onSelect={() => handleUpdatePillar(project.id, attr, 'project')} className="pl-6">
                                                                                {attr}
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                    </DropdownMenuGroup>
                                                                ))}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-muted-foreground text-center py-2">No projects assigned.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="border-l pl-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold text-sm">Habit Equations</h4>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEquationPopup(pillar.name)}>
                                            <PlusCircle className="h-4 w-4 text-green-500"/>
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {equationsForPillar.length > 0 ? (
                                            equationsForPillar.map(eq => {
                                                const habit1 = habitCards.find(h => h.id === eq.habit1Id);
                                                const habit2 = habitCards.find(h => h.id === eq.habit2Id);
                                                return (
                                                    <div key={eq.id} className="text-xs p-2 rounded-md border bg-muted/30 group relative" onClick={() => handleOpenEquationPopup(pillar.name, eq)}>
                                                        <p>
                                                            <span className="font-medium text-primary">{habit1?.name || 'Habit 1'}</span>
                                                            <span className="mx-1 text-muted-foreground">+</span>
                                                            <span className="font-medium text-primary">{habit2?.name || 'Habit 2'}</span>
                                                        </p>
                                                        <p className="flex items-center gap-1">
                                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                            <span>{eq.outcome}</span>
                                                        </p>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeleteEquation(pillar.name, eq.id)}}>
                                                            <Trash2 className="h-3 w-3 text-destructive"/>
                                                        </Button>
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <p className="text-xs text-muted-foreground text-center py-4">No equations defined.</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {uncategorizedRules.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Uncategorized Meta-Rules</CardTitle>
                      <CardDescription>Assign these rules to a pillar using the dropdown menu.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {uncategorizedRules.map(renderMetaRule)}
                    </CardContent>
                  </Card>
                )}
                {uncategorizedSkills.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Uncategorized Specializations</CardTitle>
                            <CardDescription>Assign these skills to a pillar using the dropdown menu.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {uncategorizedSkills.map(skill => (
                                <div key={skill.id} className="text-sm p-2 rounded-md flex justify-between items-center group hover:bg-muted/50">
                                    <span>{skill.name}</span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                            <Badge className="capitalize">?</Badge>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {pillars.map(p => (
                                                <DropdownMenuGroup key={p.name}>
                                                    <DropdownMenuItem onSelect={() => handleUpdatePillar(skill.id, p.name, 'specialization')}>
                                                        {p.name}
                                                    </DropdownMenuItem>
                                                    {p.attributes.map(attr => (
                                                        <DropdownMenuItem key={attr} onSelect={() => handleUpdatePillar(skill.id, attr, 'specialization')} className="pl-6">
                                                            {attr}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuGroup>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
                {uncategorizedProjects.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Uncategorized Projects</CardTitle>
                            <CardDescription>Assign these projects to a pillar using the dropdown menu.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {uncategorizedProjects.map(project => (
                                <div key={project.id} className="text-sm p-2 rounded-md flex justify-between items-center group hover:bg-muted/50">
                                    <span>{project.name}</span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                            <Badge className="capitalize">?</Badge>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {pillars.map(p => (
                                                <DropdownMenuGroup key={p.name}>
                                                    <DropdownMenuItem onSelect={() => handleUpdatePillar(project.id, p.name, 'project')}>
                                                        {p.name}
                                                    </DropdownMenuItem>
                                                    {p.attributes.map(attr => (
                                                        <DropdownMenuItem key={attr} onSelect={() => handleUpdatePillar(project.id, attr, 'project')} className="pl-6">
                                                            {attr}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuGroup>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
            {editingMetaRuleId && (
              <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditingMetaRuleId(null)}>
                  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
                      <Card className="w-96">
                          <CardHeader><CardTitle>Edit Meta-Rule</CardTitle></CardHeader>
                          <CardContent>
                              <Textarea value={editedMetaRuleText} onChange={(e) => setEditedMetaRuleText(e.target.value)} autoFocus className="min-h-[100px]" />
                          </CardContent>
                          <CardFooter className="flex justify-end gap-2">
                              <Button variant="ghost" onClick={() => setEditingMetaRuleId(null)}>Cancel</Button>
                              <Button onClick={handleSaveMetaRule}>Save</Button>
                          </CardFooter>
                      </Card>
                  </div>
              </div>
            )}
            {equationPopupState.isOpen && (
                <EquationEditor
                    isOpen={equationPopupState.isOpen}
                    onOpenChange={() => setEquationPopupState({ pillar: '', isOpen: false })}
                    pillarName={equationPopupState.pillar}
                    equation={equationPopupState.equation}
                    onSave={handleSaveEquation}
                    habitCards={habitCards}
                />
            )}
        </div>
    );
}

const EquationEditor = ({ isOpen, onOpenChange, pillarName, equation, onSave, habitCards }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    pillarName: string;
    equation?: HabitEquation;
    onSave: (pillar: string, equation: Omit<HabitEquation, 'id'>) => void;
    habitCards: Resource[];
}) => {
    const [habit1Id, setHabit1Id] = useState('');
    const [habit2Id, setHabit2Id] = useState('');
    const [outcome, setOutcome] = useState('');

    useEffect(() => {
        if (equation) {
            setHabit1Id(equation.habit1Id);
            setHabit2Id(equation.habit2Id);
            setOutcome(equation.outcome);
        } else {
            setHabit1Id('');
            setHabit2Id('');
            setOutcome('');
        }
    }, [equation, isOpen]);

    const handleSaveClick = () => {
        if (!habit1Id || !habit2Id || !outcome.trim()) {
            alert('Please fill out all fields.');
            return;
        }
        onSave(pillarName, { habit1Id, habit2Id, outcome: outcome.trim() });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{equation ? 'Edit' : 'Create'} Habit Equation for {pillarName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-1">
                        <Label>Habit 1</Label>
                        <Select value={habit1Id} onValueChange={setHabit1Id}>
                            <SelectTrigger><SelectValue placeholder="Select first habit..."/></SelectTrigger>
                            <SelectContent>
                                {habitCards.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label>Habit 2</Label>
                        <Select value={habit2Id} onValueChange={setHabit2Id}>
                            <SelectTrigger><SelectValue placeholder="Select second habit..."/></SelectTrigger>
                            <SelectContent>
                                {habitCards.filter(h => h.id !== habit1Id).map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-1">
                        <Label>Expected Outcome</Label>
                        <Input value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="e.g., Increased morning focus"/>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSaveClick}>Save Equation</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function PurposePage() {
    return (
        <AuthGuard>
            <PurposePageContent />
        </AuthGuard>
    );
}

