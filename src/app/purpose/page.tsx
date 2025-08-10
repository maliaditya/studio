

"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Edit, Save, Trash2, Check, X, BookOpen, ArrowRight, TrendingUp, Briefcase, HeartPulse, ArrowDown, DollarSign, Shield, Zap, Lightbulb, Brain, HandHeart, Package, Activity, ShoppingBag, Smile, Link as LinkIconLucide, Pill, Lock, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import type { Resource, DatedWorkout, MetaRule, ExerciseDefinition, CoreSkill, PurposePillar } from '@/types/workout';
import { DndContext, type DragEndEvent, useDraggable } from '@dnd-kit/core';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, subDays, parseISO, isBefore, startOfToday, addDays, isAfter } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface RuleDetailPopupState {
    rule: MetaRule;
    x: number;
    y: number;
}

const RuleDetailPopupCard = ({ popupState, onClose }: { popupState: RuleDetailPopupState; onClose: () => void; }) => {
    const { patterns, habitCards, mechanismCards, handleOpenNestedPopup } = useAuth();
    const { rule, x, y } = popupState;
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `rule-popup-${rule.id}` });

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

    const pattern = patterns.find(p => p.id === rule.patternId);

    const getHabitLinksForRule = (rule: MetaRule) => {
        if (!pattern || !habitCards || !mechanismCards) return [];
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

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className="w-[450px] shadow-2xl border-2 border-primary/30 bg-card">
                <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base flex-grow pr-8" title={rule.text}>{rule.text}</CardTitle>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    {pattern && (
                         <CardDescription>Based on pattern: <span className="font-semibold text-foreground">{pattern.name}</span></CardDescription>
                    )}
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categorizedPhrases && Object.entries(categorizedPhrases).map(([category, phrases]) => (
                            <div key={category}>
                                <h4 className="font-medium text-sm mb-1">{category}</h4>
                                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                    {phrases.map((phrase, i) => <li key={i}>{phrase}</li>)}
                                </ul>
                            </div>
                        ))}
                         {linkedHabits.length > 0 && (
                            <div className="md:col-span-2">
                                <h4 className="font-medium text-sm mb-1">Habits</h4>
                                <div className="space-y-1">
                                    {linkedHabits.map((habit, i) => (
                                        <button 
                                            key={i} 
                                            className="text-left p-1 rounded hover:bg-muted/50 w-full"
                                            onClick={(e) => {
                                                if (handleOpenNestedPopup) {
                                                    handleOpenNestedPopup(habit.habitId, e);
                                                }
                                            }}
                                        >
                                            <span className="font-semibold text-foreground text-xs">{habit.habitName}</span> = <span className="text-muted-foreground text-xs">{habit.response} <ArrowRight className="inline h-3 w-3" /> {habit.newResponse}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
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
        patterns,
        metaRules,
        setMetaRules,
        handleOpenNestedPopup,
        habitCards,
        mechanismCards,
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

    const handleUpdatePillar = (id: string, pillar: string, type: 'specialization' | 'meta-rule') => {
      if (type === 'specialization') {
        setCoreSkills(prev => prev.map(s => s.id === id ? { ...s, purposePillar: pillar as PurposePillar } : s));
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
        setRuleDetailPopup({ rule, x: e.clientX, y: e.clientY });
    };
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta } = event;
        if (ruleDetailPopup && active.id === `rule-popup-${ruleDetailPopup.rule.id}`) {
            setRuleDetailPopup(prev => prev ? {
                ...prev,
                x: prev.x + delta.x,
                y: prev.y + delta.y,
            } : null);
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

    return (
        <DndContext onDragEnd={handleDragEnd}>
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
                                            {pillars.map(pillar => (
                                                <DropdownMenuGroup key={pillar.name}>
                                                    <DropdownMenuItem onSelect={() => handleUpdatePillar(spec.id, pillar.name, 'specialization')}>
                                                        {pillar.name}
                                                    </DropdownMenuItem>
                                                    {pillar.attributes.map(attr => (
                                                        <DropdownMenuItem key={attr} onSelect={() => handleUpdatePillar(spec.id, attr, 'specialization')} className="pl-6">
                                                            {attr}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuGroup>
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
            {ruleDetailPopup && (
                <RuleDetailPopupCard 
                    popupState={ruleDetailPopup}
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




