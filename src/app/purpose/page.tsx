
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Edit, Save, Trash2, Check, X, BookOpen, ArrowRight, TrendingUp, Briefcase, HeartPulse, ArrowDown, DollarSign, Shield, Zap, Lightbulb, Brain, HandHeart, Package, Activity, ShoppingBag, Smile, Link as LinkIconLucide, Pill, Lock, ArrowLeft, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import type { Resource, DatedWorkout, MetaRule, ExerciseDefinition, CoreSkill, PurposePillar, PopupState, Project, Stopper } from '@/types/workout';
import { DndContext, type DragEndEvent, useDraggable } from '@dnd-kit/core';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, subDays, parseISO, isBefore, startOfToday, addDays, isAfter } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RuleDetailPopupState {
    ruleId: string;
    x: number;
    y: number;
}

const RuleDetailPopupCard = ({ popupState, onClose, rule }: { 
    popupState: RuleDetailPopupState & { rule: MetaRule | undefined }; 
    onClose: () => void; 
}) => {
    const { patterns, habitCards, mechanismCards, openGeneralPopup, setMetaRules } = useAuth();
    const { rule, x, y } = popupState;
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `rule-popup-${rule?.id}` });
    const cardRef = useRef<HTMLDivElement>(null);

    const [newStopperText, setNewStopperText] = useState('');

    const style: React.CSSProperties = {
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 60,
        willChange: 'transform',
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }

    if (!rule) return null;

    const pattern = patterns.find(p => p.id === rule.patternId);

    const getHabitLinksForRule = (currentRule: MetaRule) => {
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
                negativeMechanismText: responseMechanism?.response?.visualize || '...',
                negativeMechanismName: responseMechanism?.name || 'Unlinked',
                positiveMechanismText: newResponseMechanism?.newResponse?.action || '...',
                positiveMechanismName: newResponseMechanism?.name || 'Unlinked',
            };
        }).filter((h): h is NonNullable<typeof h> => h !== null);
    };
    
    const categorizedPhrases = pattern?.phrases.reduce((acc, phrase) => {
        if (phrase.category === 'Habit Cards') return acc;
        if (!acc[phrase.category]) { // @ts-ignore
            acc[phrase.category] = [];
        }
        // @ts-ignore
        acc[phrase.category].push(phrase.text);
        return acc;
    }, {} as Record<string, string[]>);

    const linkedHabits = getHabitLinksForRule(rule);

    const handleAddStopper = () => {
        if (!newStopperText.trim()) return;
        const newStopper: Stopper = {
            id: `stopper_${Date.now()}`,
            text: newStopperText.trim(),
            status: 'none',
        };
        const updatedStoppers = [...(rule.stoppers || []), newStopper];
        setMetaRules(prev => prev.map(r => r.id === rule.id ? { ...r, stoppers: updatedStoppers } : r));
        setNewStopperText('');
    };

    const handleStopperStatusChange = (stopperId: string, status: Stopper['status']) => {
        const updatedStoppers = (rule.stoppers || []).map(stopper =>
            stopper.id === stopperId ? { ...stopper, status: stopper.status === status ? 'none' : status } : stopper
        );
        setMetaRules(prev => prev.map(r => r.id === rule.id ? { ...r, stoppers: updatedStoppers } : r));
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card ref={cardRef} className="w-[600px] shadow-2xl border-2 border-primary/30 bg-card">
                <CardHeader className="p-4 relative cursor-grab" {...listeners}>
                    <div className="flex justify-between items-start">
                        <div className="flex-grow pr-10">
                            <CardTitle className="text-lg">{rule.text}</CardTitle>
                            {pattern && (
                                <CardDescription>Based on pattern: <span className="font-semibold text-foreground">{pattern.name}</span></CardDescription>
                            )}
                        </div>
                         <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 absolute top-2 right-2" onPointerDown={(e) => { e.stopPropagation(); onClose(); }}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                        {/* Left Column: Phrases */}
                        <div className="space-y-4">
                            {categorizedPhrases && Object.entries(categorizedPhrases).map(([category, phrases]) => (
                                <div key={category}>
                                    <h4 className="font-semibold text-sm mb-2 border-b pb-1">{category}</h4>
                                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                        {phrases.map((phrase, i) => <li key={i}>{phrase}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        {/* Right Column: Habits and Stoppers */}
                        <div className="space-y-4">
                            {linkedHabits.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-sm mb-2 border-b pb-1">Linked Habits</h4>
                                    <div className="space-y-2">
                                        {linkedHabits.map((habit, i) => (
                                            <Card 
                                                key={i} 
                                                className="bg-muted/50 cursor-pointer hover:bg-muted"
                                                onClick={(e) => {
                                                    if (cardRef.current) {
                                                        const parentPopupState = {
                                                            resourceId: rule.id,
                                                            x,
                                                            y,
                                                            level: 0,
                                                        }
                                                        openGeneralPopup(habit.habitId, e, parentPopupState, cardRef.current.getBoundingClientRect());
                                                    }
                                                }}
                                            >
                                                <CardHeader className="p-3">
                                                    <CardTitle className="text-sm font-semibold text-foreground mb-1">{habit.habitName}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-3 pt-0 text-xs space-y-2">
                                                    <div>
                                                        <p className="font-medium text-red-600 dark:text-red-400">Negative Mechanism:</p>
                                                        <p className="text-muted-foreground">{habit.negativeMechanismText} <span className="text-xs italic">({habit.negativeMechanismName})</span></p>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-green-600 dark:text-green-400">Positive Mechanism:</p>
                                                        <p className="text-muted-foreground">{habit.positiveMechanismText} <span className="text-xs italic">({habit.positiveMechanismName})</span></p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                             <div>
                                <h4 className="font-semibold text-sm mb-2 border-b pb-1">Stoppers</h4>
                                <div className="space-y-2">
                                    {(rule.stoppers || []).map(stopper => (
                                        <div key={stopper.id} className="text-xs flex items-center justify-between p-2 rounded-md bg-muted/50">
                                            <p className="flex-grow pr-2">{stopper.text}</p>
                                            <div className="flex-shrink-0 flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => { e.stopPropagation(); handleStopperStatusChange(stopper.id, 'manageable'); }}>
                                                    <ThumbsUp className={cn("h-4 w-4", stopper.status === 'manageable' ? 'text-green-500' : 'text-muted-foreground')} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => { e.stopPropagation(); handleStopperStatusChange(stopper.id, 'unmanageable'); }}>
                                                    <ThumbsDown className={cn("h-4 w-4", stopper.status === 'unmanageable' ? 'text-red-500' : 'text-muted-foreground')} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 flex gap-2">
                                    <Input
                                        value={newStopperText}
                                        onChange={(e) => setNewStopperText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddStopper()}
                                        placeholder="What's stopping you?"
                                        className="h-8 text-xs"
                                    />
                                    <Button size="sm" onClick={handleAddStopper} className="h-8">Add</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const StrategicOverviewDiagram = () => {
    const PillarCard = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
      <div className="flex flex-col items-center text-center p-3 border rounded-lg bg-card/50 w-40 shadow-sm">
        <div className="text-primary">{icon}</div>
        <h4 className="font-semibold mt-2 text-sm text-foreground">{title}</h4>
      </div>
    );
  
    const ActionCard = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
      <div className="flex flex-col items-center text-center p-3 border rounded-lg bg-card/50 w-32 shadow-sm">
        <div className="text-primary">{icon}</div>
        <h4 className="font-semibold mt-2 text-sm text-foreground">{title}</h4>
      </div>
    );
  
    const OutcomeBadge = ({ children }: { children: React.ReactNode }) => (
      <Badge variant="outline" className="text-sm py-1 px-3 border-primary/30 text-primary">{children}</Badge>
    );
  
    const EgoOutcomeBadge = ({ children }: { children: React.ReactNode }) => (
      <Badge variant="destructive" className="text-sm py-1 px-3 bg-destructive/10 text-destructive-foreground border-destructive/30">{children}</Badge>
    );
  
    return (
      <div className="flex flex-col xl:flex-row items-center justify-center gap-8 lg:gap-6 p-4 overflow-x-auto">
  
        {/* Negative Flow (Ego Path) - Flows Right to Left */}
        <div className="flex flex-col-reverse xl:flex-row items-center gap-4 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
                <EgoOutcomeBadge>Dependent</EgoOutcomeBadge>
                <EgoOutcomeBadge>Poor</EgoOutcomeBadge>
                <EgoOutcomeBadge>Addict</EgoOutcomeBadge>
                <EgoOutcomeBadge>Fear</EgoOutcomeBadge>
                <EgoOutcomeBadge>Bondages</EgoOutcomeBadge>
            </div>
            <ArrowLeft className="h-6 w-6 text-muted-foreground shrink-0 rotate-90 xl:rotate-0" />
            <div className="flex xl:flex-col gap-3">
                <ActionCard icon={<ShoppingBag className="h-5 w-5"/>} title="Consumption" />
                <ActionCard icon={<Smile className="h-5 w-5"/>} title="Pleasure" />
            </div>
        </div>

        <ArrowLeft className="h-6 w-6 text-muted-foreground shrink-0 rotate-90 xl:rotate-0" />

        {/* Central Heart */}
        <div className="flex flex-col items-center gap-4 text-center">
            <PillarCard icon={<HandHeart className="h-5 w-5"/>} title="Heart" />
        </div>

        <ArrowRight className="h-6 w-6 text-muted-foreground shrink-0 rotate-90 xl:rotate-0" />
  
        {/* Positive Flow (Virtue Path) - Flows Left to Right */}
        <div className="flex flex-col xl:flex-row items-center gap-4 text-center">
          <div className="flex xl:flex-col gap-3">
            <PillarCard icon={<Brain className="h-5 w-5" />} title="Mind" />
            <PillarCard icon={<HeartPulse className="h-5 w-5" />} title="Body" />
            <PillarCard icon={<TrendingUp className="h-5 w-5" />} title="Spirit" />
          </div>
          <ArrowRight className="h-6 w-6 text-muted-foreground shrink-0 rotate-90 xl:rotate-0" />
          <div className="flex xl:flex-col gap-3">
            <ActionCard icon={<Activity className="h-5 w-5" />} title="Skill" />
            <ActionCard icon={<Package className="h-5 w-5" />} title="Product" />
          </div>
          <ArrowRight className="h-6 w-6 text-muted-foreground shrink-0 rotate-90 xl:rotate-0" />
          <div className="flex items-center gap-2 p-3 border-2 border-primary/50 rounded-lg bg-card/80 shadow">
            <DollarSign className="h-6 w-6 text-green-500" />
            <h3 className="text-lg font-bold">Monetization</h3>
          </div>
          <ArrowRight className="h-6 w-6 text-muted-foreground shrink-0 rotate-90 xl:rotate-0" />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <OutcomeBadge>Freedom</OutcomeBadge>
            <OutcomeBadge>Limitless</OutcomeBadge>
            <OutcomeBadge>Fearless</OutcomeBadge>
            <OutcomeBadge>Independent</OutcomeBadge>
          </div>
        </div>
      </div>
    );
  };


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
        handlePopupDragEnd
    } = useAuth();
    const { toast } = useToast();

    const [isEditingPurpose, setIsEditingPurpose] = useState(false);
    const [purposeInput, setPurposeInput] = useState(purposeStatement);
    
    const [editingMetaRuleId, setEditingMetaRuleId] = useState<string | null>(null);
    const [editedMetaRuleText, setEditedMetaRuleText] = useState('');
    
    const [ruleDetailPopup, setRuleDetailPopup] = useState<RuleDetailPopupState | null>(null);
    
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


    const handleOpenRuleDetail = (e: React.MouseEvent, rule: MetaRule) => {
        const popupWidth = 600;
        const popupHeight = 500; // Approximate height
        const x = window.innerWidth / 2 - popupWidth / 2;
        const y = window.innerHeight / 2 - popupHeight / 2;
        setRuleDetailPopup({ ruleId: rule.id, x: Math.max(20, x), y: Math.max(20, y) });
    };
    
    const handleDragEndLocal = (event: DragEndEvent) => {
        const { active, delta } = event;
        const activeId = active.id as string;
    
        if (ruleDetailPopup && activeId === `rule-popup-${ruleDetailPopup.ruleId}`) {
            setRuleDetailPopup(prev => prev ? {
                ...prev,
                x: prev.x + delta.x,
                y: prev.y + delta.y,
            } : null);
        } else {
            handlePopupDragEnd(event);
        }
    };

    const pillars = [
        { name: 'Mind', icon: <Brain className="h-6 w-6 text-blue-500" />, attributes: ['Focus', 'Learning', 'Creativity'] },
        { name: 'Body', icon: <HeartPulse className="h-6 w-6 text-red-500" />, attributes: ['Health', 'Strength', 'Energy'] },
        { name: 'Heart', icon: <HandHeart className="h-6 w-6 text-pink-500" />, attributes: ['Relationships', 'Emotional Health'] },
        { name: 'Spirit', icon: <TrendingUp className="h-6 w-6 text-purple-500" />, attributes: ['Meaning', 'Contribution', 'Legacy'] },
    ];
    
    const renderMetaRule = (rule: { id: string, text: string, patternId: string, purposePillar?: string }) => {
        return (
            <div key={rule.id} className="group relative text-sm p-2 rounded-md transition-colors hover:bg-muted/50 cursor-pointer" onClick={(e) => handleOpenRuleDetail(e, rule)}>
                <p>{rule.text}</p>
                <div className="absolute top-1 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                          <Badge className="capitalize">{rule.purposePillar?.[0] || '?'}</Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
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
        <DndContext onDragEnd={handleDragEndLocal}>
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
                                    placeholder="“In Life either you're growing or you're decaying; there's no middle ground. If you're standing still, you're decaying.”"
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
                        <StrategicOverviewDiagram />
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {pillars.map(pillar => {
                        const rulesForPillar = metaRules.filter(r => r.purposePillar === pillar.name || pillar.attributes.includes(r.purposePillar || ''));
                        const skillsForPillar = specializations.filter(s => s.purposePillar === pillar.name || pillar.attributes.includes(s.purposePillar || ''));
                        const projectsForPillar = projects.filter(p => p.purposePillar === pillar.name || pillar.attributes.includes(p.purposePillar || ''));
                        
                        return (
                            <Card key={pillar.name}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3 text-xl">{pillar.icon}{pillar.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2">Meta-Rules</h4>
                                        <div className="space-y-1">
                                            {rulesForPillar.length > 0 ? (
                                                rulesForPillar.map(renderMetaRule)
                                            ) : (
                                                <p className="text-xs text-muted-foreground text-center py-4">No rules assigned.</p>
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
                                                <p className="text-xs text-muted-foreground text-center py-4">No skills assigned.</p>
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
                                                <p className="text-xs text-muted-foreground text-center py-4">No projects assigned.</p>
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

            </div>
            {ruleDetailPopup && (
                <RuleDetailPopupCard 
                    popupState={{
                        ...ruleDetailPopup,
                        rule: metaRules.find(r => r.id === ruleDetailPopup.ruleId),
                    }}
                    onClose={() => setRuleDetailPopup(null)}
                />
            )}
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
