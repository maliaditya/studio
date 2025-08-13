

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
import { format, parseISO, isBefore, startOfToday, addDays, isAfter } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogPortal, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';


const FormattedPatternName = ({ name, type }: { name: string; type: 'Positive' | 'Negative' }) => {
    const parts = name.split(' → ').map(p => p.trim());
    
    const positiveColors = ["text-yellow-500", "text-orange-500", "text-green-500"];
    const negativeColors = ["text-blue-500", "text-teal-500", "text-red-500"];
    
    const colors = type === 'Positive' ? positiveColors : negativeColors;

    if (parts.length >= 2) {
      const primaryPart = parts[0];
      const outcome = parts[parts.length - 1];
      
      if (parts.length >= 3) {
        const secondaryPart = parts[1];
        return (
          <span className="font-semibold">
            <span className={colors[0]}>{primaryPart}</span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className={colors[1]}>{secondaryPart}</span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className={colors[2]}>{outcome}</span>
          </span>
        )
      } else {
         return (
          <span className="font-semibold">
            <span className={colors[0]}>{primaryPart}</span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className={colors[2]}>{outcome}</span>
          </span>
        )
      }
    }
    
    return <span className="font-semibold">{name}</span>;
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
        handlePopupDragEnd,
        openRuleDetailPopup, ruleDetailPopup,
        pillarEquations, setPillarEquations,
        habitCards,
        mechanismCards,
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
            const newEquationsForPillar = [...(prev[pillar] || [])];
            if (equationPopupState.equation?.id) { // Editing existing
                const index = newEquationsForPillar.findIndex(eq => eq.id === equationPopupState.equation!.id);
                if (index > -1) {
                    newEquationsForPillar[index] = { ...equationPopupState.equation, ...equation, metaRuleIds: equation.metaRuleIds || [] };
                }
            } else { // Adding new
                newEquationsForPillar.push({ id: `eq_${Date.now()}`, ...equation, metaRuleIds: equation.metaRuleIds || [] });
            }
            return { ...prev, [pillar]: newEquationsForPillar };
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
    
    const uncategorizedItems = useMemo(() => {
        const assignedPillarItems = new Set<string>();

        pillars.forEach(pillar => {
            const allPillarNames = [pillar.name, ...pillar.attributes];
            
            metaRules.forEach(item => {
                if (item.purposePillar && allPillarNames.includes(item.purposePillar)) assignedPillarItems.add(item.id);
            });
            specializations.forEach(item => {
                if (item.purposePillar && allPillarNames.includes(item.purposePillar)) assignedPillarItems.add(item.id);
            });
            projects.forEach(item => {
                if (item.purposePillar && allPillarNames.includes(item.purposePillar)) assignedPillarItems.add(item.id);
            });
        });

        const assignedEquationRuleIds = new Set(Object.values(pillarEquations).flat().flatMap(eq => eq.metaRuleIds));
        
        const uncategorizedRules = metaRules.filter(r => !assignedPillarItems.has(r.id) && !assignedEquationRuleIds.has(r.id));
        const uncategorizedSkills = specializations.filter(s => !assignedPillarItems.has(s.id));
        const uncategorizedProjects = projects.filter(p => !assignedPillarItems.has(p.id));

        return { rules: uncategorizedRules, skills: uncategorizedSkills, projects: uncategorizedProjects };
    }, [metaRules, specializations, projects, pillars, pillarEquations]);



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
                                        <h4 className="font-semibold text-sm">Rule Equations</h4>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEquationPopup(pillar.name)}>
                                            <PlusCircle className="h-4 w-4 text-green-500"/>
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {equationsForPillar.map(eq => {
                                            const rulesInEquation = (eq.metaRuleIds || []).map(id => metaRules.find(r => r.id === id)).filter((r): r is MetaRule => !!r);
                                            return (
                                                <div key={eq.id} className="group relative">
                                                    <div className="p-2 rounded-md border bg-muted/30">
                                                        <div className="space-y-2">
                                                            {rulesInEquation.map(rule => {
                                                                if (!rule) return null;
                                                                const pattern = patterns.find(p => p.id === rule.patternId);
                                                                const linkedHabits = pattern ? habitCards.filter(h => pattern.phrases.some(p => p.category === 'Habit Cards' && p.mechanismCardId === h.id)) : [];
                                                                
                                                                return (
                                                                    <Card key={rule.id} className="bg-card">
                                                                        <CardContent className="p-2 text-xs space-y-2">
                                                                            <p className="font-medium text-primary cursor-pointer hover:underline" onClick={(e) => openRuleDetailPopup(rule.id, e)}>{rule.text}</p>
                                                                            {pattern && (
                                                                                <p className="text-muted-foreground italic">
                                                                                    <FormattedPatternName name={pattern.name} type={pattern.type} />
                                                                                </p>
                                                                            )}
                                                                             {linkedHabits.length > 0 && (
                                                                                <div className="pt-2 border-t mt-2">
                                                                                    <div className="font-semibold text-foreground">Habit: {
                                                                                        linkedHabits.length > 1 ? (
                                                                                            &lt;div&gt;&lt;ul className="list-disc list-inside font-normal text-muted-foreground"&gt;
                                                                                                {linkedHabits.map(h => &lt;li key={h.id}&gt;{h.name}&lt;/li&gt;)}
                                                                                            &lt;/ul&gt;&lt;/div&gt;
                                                                                        ) : (
                                                                                            &lt;span className="font-normal"&gt;{linkedHabits[0].name}&lt;/span&gt;
                                                                                        )
                                                                                    }&lt;/div&gt;
                                                                                    {linkedHabits.length === 1 && (
                                                                                        &lt;ul className="list-disc list-inside pl-2 text-muted-foreground"&gt;
                                                                                            {mechanismCards.find(m => m.id === linkedHabits[0].response?.resourceId) && &lt;li&gt;Negative: {mechanismCards.find(m => m.id === linkedHabits[0].response?.resourceId)?.response?.visualize || '...'}&lt;/li&gt;}
                                                                                            {mechanismCards.find(m => m.id === linkedHabits[0].newResponse?.resourceId) && &lt;li&gt;Positive: {mechanismCards.find(m => m.id === linkedHabits[0].newResponse?.resourceId)?.newResponse?.action || '...'}&lt;/li&gt;}
                                                                                        &lt;/ul&gt;
                                                                                    )}
                                                                                &lt;/div&gt;
                                                                            )}
                                                                        </CardContent>
                                                                    </Card>
                                                                )
                                                            })}
                                                        &lt;/div&gt;
                                                        &lt;p className="flex items-center gap-1 mt-2 pt-2 border-t text-sm font-semibold"&gt;
                                                            &lt;ArrowRight className="h-4 w-4 text-muted-foreground" /&gt;
                                                            &lt;span&gt;{eq.outcome}&lt;/span&gt;
                                                        &lt;/p&gt;
                                                    &lt;/div&gt;
                                                     &lt;div className="absolute top-1 right-1 flex opacity-0 group-hover:opacity-100 transition-opacity"&gt;
                                                        &lt;Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleOpenEquationPopup(pillar.name, eq); }}&gt;
                                                            &lt;Edit className="h-3 w-3" /&gt;
                                                        &lt;/Button&gt;
                                                        &lt;Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDeleteEquation(pillar.name, eq.id); }}&gt;
                                                            &lt;Trash2 className="h-3 w-3 text-destructive"/&gt;
                                                        &lt;/Button&gt;
                                                    &lt;/div&gt;
                                                &lt;/div&gt;
                                            )
                                        })}
                                        {equationsForPillar.length === 0 && (
                                            &lt;p className="text-xs text-muted-foreground text-center py-4"&gt;No equations defined.&lt;/p&gt;
                                        )}
                                    &lt;/div&gt;
                                &lt;/div&gt;
                            &lt;/CardContent&gt;
                        &lt;/Card&gt;
                    )
                })}
            &lt;/div&gt;
            
            &lt;div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"&gt;
                {uncategorizedItems.rules.length > 0 && (
                  &lt;Card&gt;
                    &lt;CardHeader&gt;
                      &lt;CardTitle&gt;Uncategorized Meta-Rules&lt;/CardTitle&gt;
                      &lt;CardDescription&gt;Assign these rules to a pillar using the dropdown menu.&lt;/CardDescription&gt;
                    &lt;/CardHeader&gt;
                    &lt;CardContent className="space-y-2"&gt;
                      {uncategorizedItems.rules.map(renderMetaRule)}
                    &lt;/CardContent&gt;
                  &lt;/Card&gt;
                )}
                {uncategorizedItems.skills.length > 0 && (
                    &lt;Card&gt;
                        &lt;CardHeader&gt;
                            &lt;CardTitle&gt;Uncategorized Specializations&lt;/CardTitle&gt;
                            &lt;CardDescription&gt;Assign these skills to a pillar using the dropdown menu.&lt;/CardDescription&gt;
                        &lt;/CardHeader&gt;
                        &lt;CardContent className="space-y-2"&gt;
                            {uncategorizedItems.skills.map(skill => (
                                &lt;div key={skill.id} className="text-sm p-2 rounded-md flex justify-between items-center group hover:bg-muted/50"&gt;
                                    &lt;span&gt;{skill.name}&lt;/span&gt;
                                    &lt;DropdownMenu&gt;
                                        &lt;DropdownMenuTrigger asChild&gt;
                                            &lt;Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"&gt;
                                            &lt;Badge className="capitalize"&gt;?&lt;/Badge&gt;
                                            &lt;/Button&gt;
                                        &lt;/DropdownMenuTrigger&gt;
                                        &lt;DropdownMenuContent&gt;
                                            {pillars.map(p => (
                                                &lt;DropdownMenuGroup key={p.name}&gt;
                                                    &lt;DropdownMenuItem onSelect={() => handleUpdatePillar(skill.id, p.name, 'specialization')}&gt;
                                                        {p.name}
                                                    &lt;/DropdownMenuItem&gt;
                                                    {p.attributes.map(attr => (
                                                        &lt;DropdownMenuItem key={attr} onSelect={() => handleUpdatePillar(skill.id, attr, 'specialization')} className="pl-6"&gt;
                                                            {attr}
                                                        &lt;/DropdownMenuItem&gt;
                                                    ))}
                                                &lt;/DropdownMenuGroup&gt;
                                            ))}
                                        &lt;/DropdownMenuContent&gt;
                                    &lt;/DropdownMenu&gt;
                                &lt;/div&gt;
                            ))}
                        &lt;/CardContent&gt;
                    &lt;/Card&gt;
                )}
                {uncategorizedItems.projects.length > 0 && (
                    &lt;Card&gt;
                        &lt;CardHeader&gt;
                            &lt;CardTitle&gt;Uncategorized Projects&lt;/CardTitle&gt;
                            &lt;CardDescription&gt;Assign these projects to a pillar using the dropdown menu.&lt;/CardDescription&gt;
                        &lt;/CardHeader&gt;
                        &lt;CardContent className="space-y-2"&gt;
                            {uncategorizedItems.projects.map(project => (
                                &lt;div key={project.id} className="text-sm p-2 rounded-md flex justify-between items-center group hover:bg-muted/50"&gt;
                                    &lt;span&gt;{project.name}&lt;/span&gt;
                                    &lt;DropdownMenu&gt;
                                        &lt;DropdownMenuTrigger asChild&gt;
                                            &lt;Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"&gt;
                                            &lt;Badge className="capitalize"&gt;?&lt;/Badge&gt;
                                            &lt;/Button&gt;
                                        &lt;/DropdownMenuTrigger&gt;
                                        &lt;DropdownMenuContent&gt;
                                            {pillars.map(p => (
                                                &lt;DropdownMenuGroup key={p.name}&gt;
                                                    &lt;DropdownMenuItem onSelect={() => handleUpdatePillar(project.id, p.name, 'project')}&gt;
                                                        {p.name}
                                                    &lt;/DropdownMenuItem&gt;
                                                    {p.attributes.map(attr => (
                                                        &lt;DropdownMenuItem key={attr} onSelect={() => handleUpdatePillar(project.id, attr, 'project')} className="pl-6"&gt;
                                                            {attr}
                                                        &lt;/DropdownMenuItem&gt;
                                                    ))}
                                                &lt;/DropdownMenuGroup&gt;
                                            ))}
                                        &lt;/DropdownMenuContent&gt;
                                    &lt;/DropdownMenu&gt;
                                &lt;/div&gt;
                            ))}
                        &lt;/CardContent&gt;
                    &lt;/Card&gt;
                )}
            &lt;/div&gt;
            {editingMetaRuleId && (
              &lt;div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditingMetaRuleId(null)}&gt;
                  &lt;div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}&gt;
                      &lt;Card className="w-96"&gt;
                          &lt;CardHeader&gt;&lt;CardTitle&gt;Edit Meta-Rule&lt;/CardTitle&gt;&lt;/CardHeader&gt;
                          &lt;CardContent&gt;
                              &lt;Textarea value={editedMetaRuleText} onChange={(e) => setEditedMetaRuleText(e.target.value)} autoFocus className="min-h-[100px]" /&gt;
                          &lt;/CardContent&gt;
                          &lt;CardFooter className="flex justify-end gap-2"&gt;
                              &lt;Button variant="ghost" onClick={() => setEditingMetaRuleId(null)}&gt;Cancel&lt;/Button&gt;
                              &lt;Button onClick={handleSaveMetaRule}&gt;Save&lt;/Button&gt;
                          &lt;/CardFooter&gt;
                      &lt;/Card&gt;
                  &lt;/div&gt;
              &lt;/div&gt;
            )}
            {equationPopupState.isOpen && (
                &lt;EquationEditor
                    isOpen={equationPopupState.isOpen}
                    onOpenChange={() => setEquationPopupState({ pillar: '', isOpen: false })}
                    pillarName={equationPopupState.pillar}
                    equation={equationPopupState.equation}
                    onSave={handleSaveEquation}
                    metaRules={metaRules}
                /&gt;
            )}
        &lt;/div&gt;
    );
}

const EquationEditor = ({ isOpen, onOpenChange, pillarName, equation, onSave, metaRules }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    pillarName: string;
    equation?: HabitEquation;
    onSave: (pillar: string, equation: Omit&lt;HabitEquation, 'id'&gt;) => void;
    metaRules: MetaRule[];
}) => {
    const [selectedRuleIds, setSelectedRuleIds] = useState&lt;string[]&gt;([]);
    const [outcome, setOutcome] = useState('');

    useEffect(() => {
        if (equation) {
            setSelectedRuleIds(equation.metaRuleIds || []);
            setOutcome(equation.outcome);
        } else {
            setSelectedRuleIds([]);
            setOutcome('');
        }
    }, [equation, isOpen]);

    const handleSaveClick = () => {
        if (selectedRuleIds.length === 0 || !outcome.trim()) {
            alert('Please select at least one rule and provide an outcome.');
            return;
        }
        onSave(pillarName, { metaRuleIds: selectedRuleIds, outcome: outcome.trim() });
    };

    const handleToggleRule = (ruleId: string) => {
        setSelectedRuleIds(prev =>
            prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId]
        );
    };

    return (
        &lt;Dialog open={isOpen} onOpenChange={onOpenChange}&gt;
            &lt;DialogContent className="sm:max-w-md"&gt;
                &lt;DialogHeader&gt;
                    &lt;DialogTitle&gt;{equation ? 'Edit' : 'Create'} Rule Equation for {pillarName}&lt;/DialogTitle&gt;
                &lt;/DialogHeader&gt;
                &lt;div className="space-y-4 py-4"&gt;
                    &lt;div className="space-y-2"&gt;
                        &lt;Label&gt;Select Meta-Rules&lt;/Label&gt;
                        &lt;ScrollArea className="h-40 w-full rounded-md border p-2"&gt;
                            {metaRules.map(rule => (
                                &lt;div key={rule.id} className="flex items-center space-x-2 p-1"&gt;
                                    &lt;Checkbox
                                        id={`rule-${rule.id}`}
                                        checked={selectedRuleIds.includes(rule.id)}
                                        onCheckedChange={() => handleToggleRule(rule.id)}
                                    /&gt;
                                    &lt;Label htmlFor={`rule-${rule.id}`} className="text-sm font-normal w-full cursor-pointer"&gt;{rule.text}&lt;/Label&gt;
                                &lt;/div&gt;
                            ))}
                        &lt;/ScrollArea&gt;
                    &lt;/div&gt;
                     &lt;div className="space-y-1"&gt;
                        &lt;Label&gt;Expected Outcome&lt;/Label&gt;
                        &lt;Input value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="e.g., Increased productivity"/&gt;
                    &lt;/div&gt;
                &lt;/div&gt;
                &lt;DialogFooter&gt;
                    &lt;Button variant="outline" onClick={() => onOpenChange(false)}&gt;Cancel&lt;/Button&gt;
                    &lt;Button onClick={handleSaveClick}&gt;Save Equation&lt;/Button&gt;
                &lt;/DialogFooter&gt;
            &lt;/DialogContent&gt;
        &lt;/Dialog&gt;
    )
}

export default function PurposePage() {
    return (
        &lt;AuthGuard&gt;
            &lt;PurposePageContent /&gt;
        &lt;/AuthGuard&gt;
    );
}


