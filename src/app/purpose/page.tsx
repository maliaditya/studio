
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Edit, Save, Trash2, Check, X, BookOpen, ArrowRight, TrendingUp, Briefcase, HeartPulse, ClipboardCheck, ArrowDown, ArrowUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import type { Resource, DatedWorkout, MetaRule, ExerciseDefinition, CoreSkill } from '@/types/workout';
import { HabitPopup } from '@/components/HabitPopup';
import { DndContext, type DragEndEvent, useDraggable } from '@dnd-kit/core';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, subDays, parseISO, isBefore, startOfToday, addDays, isAfter } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription as DialogDescriptionComponent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DashboardStats } from '@/components/DashboardStats';

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
                                            onClick={(e) => handleOpenNestedPopup(habit.habitId, e)}
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
        resources,
        handleOpenNestedPopup,
        allWorkoutLogs, 
        allUpskillLogs,
        allDeepWorkLogs,
        topicGoals,
        brandingLogs,
        productizationPlans,
        offerizationPlans,
        deepWorkDefinitions,
        upskillDefinitions
    } = useAuth();
    const { toast } = useToast();

    const [isEditingPurpose, setIsEditingPurpose] = useState(false);
    const [purposeInput, setPurposeInput] = useState(purposeStatement);
    
    const [editingMetaRuleId, setEditingMetaRuleId] = useState<string | null>(null);
    const [editedMetaRuleText, setEditedMetaRuleText] = useState('');
    
    const [ruleDetailPopup, setRuleDetailPopup] = useState<RuleDetailPopupState | null>(null);

    const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);
    const [today, setToday] = useState<Date | null>(null);

    useEffect(() => {
        const now = new Date();
        setToday(now);
        setOneYearAgo(subDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 365));
    }, []);

    const specializations = React.useMemo(() => {
        return coreSkills.filter(skill => skill.type === 'Specialization');
    }, [coreSkills]);

    const handleSavePurpose = () => {
        setPurposeStatement(purposeInput);
        setIsEditingPurpose(false);
        toast({ title: "Purpose Updated", description: "Your central purpose has been saved." });
    };

    const handleUpdatePillar = (id: string, pillar: 'Health' | 'Wealth' | 'Growth' | 'Direction', type: 'specialization' | 'meta-rule') => {
      if (type === 'specialization') {
        setCoreSkills(prev => prev.map(s => s.id === id ? { ...s, purposePillar: pillar } : s));
      } else {
        setMetaRules(prev => prev.map(r => r.id === id ? { ...r, purposePillar: pillar } : r));
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
    
    const habitCards = useMemo(() => resources.filter(r => r.type === 'habit'), [resources]);
    const mechanismCards = useMemo(() => resources.filter(r => r.type === 'mechanism'), [resources]);


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

    const consistencyData = useMemo(() => {
    if (!allWorkoutLogs || !oneYearAgo || !today) return [];
    const workoutDates = new Set(allWorkoutLogs.filter(log => log.exercises.some(ex => ex.loggedSets.length > 0)).map(log => log.date));
    const data: { date: string; fullDate: string; score: number }[] = [];
    let score = 0.5;
    for (let d = new Date(oneYearAgo); d <= today; d = addDays(d, 1)) {
        const dateKey = format(d, 'yyyy-MM-dd');
        if (workoutDates.has(dateKey)) { score += (1 - score) * 0.1; } else { score *= 0.95; }
        data.push({ date: format(d, 'MMM dd'), fullDate: format(d, 'PPP'), score: Math.round(score * 100) });
    }
    return data;
  }, [allWorkoutLogs, oneYearAgo, today]);
  
    const productivityStats = useMemo(() => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      const getDailyDuration = (logs: DatedWorkout[], dateStr: string, durationField: 'reps' | 'weight') => {
          if (!logs) return 0;
          const logForDay = logs.find(log => log.date === dateStr);
          if (!logForDay) return 0;
          return logForDay.exercises.reduce((total, ex) => total + ex.loggedSets.reduce((sum, set) => sum + (set[durationField] || 0), 0), 0);
      };

      const calculateChange = (todayVal: number, yesterdayVal: number) => {
          if (yesterdayVal === 0) return todayVal > 0 ? 100 : 0;
          return ((todayVal - yesterdayVal) / yesterdayVal) * 100;
      };
      
      const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const todayDeepWork = getDailyDuration(allDeepWorkLogs, todayStr, 'weight');
      const yesterdayDeepWork = getDailyDuration(allDeepWorkLogs, yesterdayStr, 'weight');
      const todayUpskill = getDailyDuration(allUpskillLogs, todayStr, 'reps');
      const yesterdayUpskill = getDailyDuration(allUpskillLogs, yesterdayStr, 'reps');

      return {
          todayDeepWorkHours: todayDeepWork / 60,
          deepWorkChange: calculateChange(todayDeepWork, yesterdayDeepWork),
          todayUpskillHours: todayUpskill / 60,
          upskillChange: calculateChange(todayUpskill, yesterdayUpskill),
          consistencyChange: (consistencyData[consistencyData.length - 1]?.score || 0) - (consistencyData[consistencyData.length - 2]?.score || 0),
          latestConsistency: consistencyData[consistencyData.length - 1]?.score || 0,
      };
  }, [allUpskillLogs, allDeepWorkLogs, consistencyData]);
    
    const pillars = [
        { name: 'Health', icon: <HeartPulse className="h-6 w-6 text-red-500" /> },
        { name: 'Wealth', icon: <Briefcase className="h-6 w-6 text-green-500" /> },
        { name: 'Growth', icon: <TrendingUp className="h-6 w-6 text-blue-500" /> },
        { name: 'Direction', icon: <ClipboardCheck className="h-6 w-6 text-purple-500" /> },
    ];
    
    const renderMetaRule = (rule: { id: string, text: string, patternId: string, purposePillar?: string }) => {
        return (
            <div key={rule.id} className="group relative text-sm p-2 rounded-md transition-colors hover:bg-muted/50 cursor-pointer" onClick={(e) => handleOpenRuleDetail(e, rule)}>
                {editingMetaRuleId === rule.id ? (
                  <Input
                      value={editedMetaRuleText}
                      onChange={(e) => setEditedMetaRuleText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveMetaRule()}
                      onBlur={handleSaveMetaRule}
                      className="text-sm h-8"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p>{rule.text}</p>
                )}
                <div className="absolute top-1 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                          <Badge className="capitalize">{rule.purposePillar?.[0] || '?'}</Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {pillars.map(pillar => (
                          <DropdownMenuItem key={pillar.name} onSelect={() => handleUpdatePillar(rule.id, pillar.name as any, 'meta-rule')}>
                            {pillar.name}
                          </DropdownMenuItem>
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

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-primary">
                        Your Purpose
                    </h1>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        “In Life either you're growing or you're decaying; there's no middle ground. If you're standing still, you're decaying.”
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {pillars.map(pillar => {
                        const rulesForPillar = metaRules.filter(r => r.purposePillar === pillar.name);
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
                    <CardContent className="space-y-6">
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
                        <Separator />
                        <div className="space-y-2">
                            {metaRules.filter(r => !r.purposePillar).map(renderMetaRule)}
                        </div>
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
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full">
                                              {spec.purposePillar || "Assign to a Pillar"}
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent>
                                            {pillars.map(pillar => (
                                              <DropdownMenuItem key={pillar.name} onSelect={() => handleUpdatePillar(spec.id, pillar.name as any, 'specialization')}>
                                                {pillar.name}
                                              </DropdownMenuItem>
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
