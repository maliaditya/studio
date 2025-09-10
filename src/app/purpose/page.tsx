

"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BrainCircuit, Edit, Save, Trash2, Check, X, BookOpen, ArrowRight, TrendingUp, Briefcase, HeartPulse, ArrowDown, DollarSign, Shield, Zap, Lightbulb, Brain, HandHeart, Package, Activity, ShoppingBag, Smile, Link as LinkIconLucide, Pill, Lock, ArrowLeft, ThumbsUp, ThumbsDown, Workflow, PlusCircle, Target, Book, Clock, Banknote, Unlink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import type { Resource, DatedWorkout, MetaRule, ExerciseDefinition, CoreSkill, PurposePillar, PopupState, Project, Stopper, Pattern, Strength, RuleDetailPopupState, HabitEquation, SkillAcquisitionPlan, PillarCardData, ProjectPlan } from '@/types/workout';
import { DndContext, useDraggable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, parseISO, isAfter, startOfToday } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogPortal, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';

const PillarCard = ({ cardData, onUpdate, onDelete, onSpecializationClick }: {
    cardData: PillarCardData;
    onUpdate: (updatedCard: PillarCardData) => void;
    onDelete: (cardId: string) => void;
    onSpecializationClick: (specId: string) => void;
}) => {
    const { specializations, allEquations, projects } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editedCardData, setEditedCardData] = useState<PillarCardData>(cardData);

    useEffect(() => {
        setEditedCardData(cardData);
    }, [cardData]);

    const handleTextChange = (field: 'principle' | 'outcome', value: string) => {
        setEditedCardData({ ...editedCardData, [field]: value });
    };

    const handleLinkToggle = (type: 'practice' | 'applicationSpecialization' | 'applicationProject', id: string) => {
        const keyMap = {
            'practice': 'practiceEquationIds',
            'applicationSpecialization': 'applicationSpecializationIds',
            'applicationProject': 'applicationProjectIds',
        };
        const key = keyMap[type];
        
        const currentIds = editedCardData[key as keyof PillarCardData] as string[] || [];
        const newIds = currentIds.includes(id) ? currentIds.filter(i => i !== id) : [...currentIds, id];
        
        if (isEditing) {
            setEditedCardData({ ...editedCardData, [key]: newIds });
        } else {
             onUpdate({ ...cardData, [key]: newIds });
        }
    };

    const handleSave = () => {
        onUpdate(editedCardData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedCardData(cardData); // Reset changes
        setIsEditing(false);
    };

    const linkedPractices = (cardData.practiceEquationIds || [])
        .map(id => allEquations.find(eq => eq.id === id))
        .filter((eq): eq is HabitEquation => !!eq);

    const linkedApplications = (cardData.applicationSpecializationIds || [])
        .map(id => specializations.find(spec => spec.id === id))
        .filter((spec): spec is CoreSkill => !!spec);
        
    const linkedProjects = (cardData.applicationProjectIds || [])
        .map(id => projects.find(p => p.id === id))
        .filter((p): p is Project => !!p);


    if (!isEditing) {
        return (
            <Card className="flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="flex-grow">
                        <CardTitle className="text-base font-semibold text-foreground">
                            {cardData.principle || "Untitled Principle"}
                        </CardTitle>
                    </div>
                    <div className="flex items-center flex-shrink-0 -mr-2 -mt-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                            <Edit className="h-4 w-4"/>
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(cardData.id)}>
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 flex-grow">
                    <div className="space-y-4">
                        <div>
                            <Label className="font-semibold text-sm">Practices</Label>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {linkedPractices.length > 0 ? (
                                    linkedPractices.map(eq => (
                                        <Badge key={eq.id} variant="secondary" className="font-normal text-xs">{eq.outcome}</Badge>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground">No practices linked.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label className="font-semibold text-sm">Application</Label>
                             <div className="mt-2 flex flex-wrap gap-1">
                                {linkedApplications.length > 0 && linkedApplications.map(spec => (
                                    <div key={spec.id} className="relative group/spec">
                                        <Badge 
                                            variant="outline" 
                                            className="font-normal text-xs cursor-pointer hover:bg-accent pr-7" 
                                            onClick={() => onSpecializationClick(spec.id)}
                                        >
                                            {spec.name}
                                        </Badge>
                                        <button 
                                            onClick={() => handleLinkToggle('applicationSpecialization', spec.id)}
                                            className="absolute top-1/2 right-0.5 -translate-y-1/2 h-5 w-5 rounded-full bg-muted/50 hover:bg-destructive/20 text-destructive opacity-0 group-hover/spec:opacity-100 transition-opacity"
                                        >
                                            <Unlink className="h-3 w-3 mx-auto"/>
                                        </button>
                                    </div>
                                ))}
                                {linkedProjects.length > 0 && linkedProjects.map(proj => (
                                     <div key={proj.id} className="relative group/proj">
                                        <Badge 
                                            variant="outline" 
                                            className="font-normal text-xs cursor-pointer hover:bg-accent pr-7 bg-blue-500/10 border-blue-500/50 text-blue-800 dark:text-blue-300"
                                        >
                                            {proj.name}
                                        </Badge>
                                        <button 
                                            onClick={() => handleLinkToggle('applicationProject', proj.id)}
                                            className="absolute top-1/2 right-0.5 -translate-y-1/2 h-5 w-5 rounded-full bg-muted/50 hover:bg-destructive/20 text-destructive opacity-0 group-hover/proj:opacity-100 transition-opacity"
                                        >
                                            <Unlink className="h-3 w-3 mx-auto"/>
                                        </button>
                                    </div>
                                ))}
                                {linkedApplications.length === 0 && linkedProjects.length === 0 && (
                                    <p className="text-xs text-muted-foreground">No specializations or projects linked.</p>
                                )}
                            </div>
                        </div>
                        <div>
                            <Label className="font-semibold text-sm">Expected Outcome</Label>
                            <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">
                                {cardData.outcome || 'Not set.'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    // Edit mode
    const practicesInEdit = (editedCardData.practiceEquationIds || [])
        .map(id => allEquations.find(eq => eq.id === id))
        .filter((eq): eq is HabitEquation => !!eq);

    const applicationsInEdit = (editedCardData.applicationSpecializationIds || [])
        .map(id => specializations.find(spec => spec.id === id))
        .filter((spec): spec is CoreSkill => !!spec);
        
    const projectsInEdit = (editedCardData.applicationProjectIds || [])
        .map(id => projects.find(p => p.id === id))
        .filter((p): p is Project => !!p);


    return (
        <Card className="flex flex-col ring-2 ring-primary">
             <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Textarea 
                    value={editedCardData.principle}
                    onChange={e => handleTextChange('principle', e.target.value)}
                    placeholder="Principle..."
                    className="text-base font-semibold border-0 shadow-none focus-visible:ring-0 resize-none p-0"
                />
                <div className="flex items-center flex-shrink-0 -mr-2 -mt-2">
                    <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
                    <Button size="sm" onClick={handleSave}><Save className="mr-2 h-4 w-4"/>Save</Button>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 flex-grow">
                <div className="space-y-4">
                    <div>
                        <Label className="font-semibold text-sm">Practices</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full mt-1">
                                    <PlusCircle className="mr-2 h-4 w-4"/> Link Rule Equation
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <ScrollArea className="h-60">
                                    <div className="space-y-2 p-1">
                                        {allEquations.map(eq => (
                                            <div key={eq.id} className="flex items-center space-x-2">
                                                <Checkbox 
                                                    id={`eq-${cardData.id}-${eq.id}`}
                                                    checked={(editedCardData.practiceEquationIds || []).includes(eq.id)}
                                                    onCheckedChange={() => handleLinkToggle('practice', eq.id)}
                                                />
                                                <Label htmlFor={`eq-${cardData.id}-${eq.id}`} className="font-normal w-full cursor-pointer">{eq.outcome}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {practicesInEdit.map(eq => (
                                <Badge key={eq.id} variant="secondary" className="font-normal">{eq.outcome}</Badge>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <Label className="font-semibold text-sm">Application</Label>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {applicationsInEdit.map(spec => (
                                <Badge key={spec.id} variant="outline" className="font-normal">{spec.name}</Badge>
                            ))}
                            {projectsInEdit.map(proj => (
                                <Badge key={proj.id} variant="outline" className="font-normal bg-blue-500/10 border-blue-500/50 text-blue-800 dark:text-blue-300">{proj.name}</Badge>
                            ))}
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full mt-2">
                                    <PlusCircle className="mr-2 h-4 w-4"/> Link Application
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <ScrollArea className="h-60">
                                    <div className="space-y-2 p-1">
                                        <h4 className="font-semibold text-xs text-muted-foreground px-1">Specializations</h4>
                                        {specializations.map(spec => (
                                            <div key={spec.id} className="flex items-center space-x-2">
                                                <Checkbox 
                                                    id={`spec-${cardData.id}-${spec.id}`}
                                                    checked={(editedCardData.applicationSpecializationIds || []).includes(spec.id)}
                                                    onCheckedChange={() => handleLinkToggle('applicationSpecialization', spec.id)}
                                                />
                                                <Label htmlFor={`spec-${cardData.id}-${spec.id}`} className="font-normal w-full cursor-pointer">{spec.name}</Label>
                                            </div>
                                        ))}
                                        <Separator className="my-2" />
                                        <h4 className="font-semibold text-xs text-muted-foreground px-1">Projects</h4>
                                        {projects.map(proj => (
                                            <div key={proj.id} className="flex items-center space-x-2">
                                                <Checkbox 
                                                    id={`proj-${cardData.id}-${proj.id}`}
                                                    checked={(editedCardData.applicationProjectIds || []).includes(proj.id)}
                                                    onCheckedChange={() => handleLinkToggle('applicationProject', proj.id)}
                                                />
                                                <Label htmlFor={`proj-${cardData.id}-${proj.id}`} className="font-normal w-full cursor-pointer">{proj.name}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div>
                        <Label className="font-semibold text-sm">Expected Outcome</Label>
                        <Textarea 
                            value={editedCardData.outcome}
                            onChange={e => handleTextChange('outcome', e.target.value)}
                            placeholder="The desired result..."
                             className="mt-1"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


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
        purposeData, 
        setPurposeData,
        specializations,
        coreSkills,
        setCoreSkills,
        projects,
        setProjects,
        patterns,
        setPatterns,
        metaRules,
        setMetaRules,
        generalPopups,
        handlePopupDragEnd,
        openRuleDetailPopup, ruleDetailPopup,
        pillarEquations, setPillarEquations,
        habitCards,
        addPillarCard, updatePillarCard, deletePillarCard,
        offerizationPlans,
        skillAcquisitionPlans,
        productizationPlans,
    } = useAuth();
    const { toast } = useToast();

    const [isEditingPurpose, setIsEditingPurpose] = useState(false);
    const [purposeInput, setPurposeInput] = useState('');
    
    const [editingMetaRuleId, setEditingMetaRuleId] = useState<string | null>(null);
    const [editedMetaRuleText, setEditedMetaRuleText] = useState('');
    
    const [equationPopupState, setEquationPopupState] = useState<{ pillar: string; equation?: HabitEquation; isOpen: boolean }>({ pillar: '', isOpen: false });

    const [isSpecPopupOpen, setIsSpecPopupOpen] = useState(false);
    const [popupContent, setPopupContent] = useState<{ title: string; projects: Project[] }>({ title: '', projects: [] });

    useEffect(() => {
        if (purposeData) {
            setPurposeInput(purposeData.statement);
        }
    }, [purposeData]);

    const handleSpecializationClick = (specId: string) => {
        const spec = specializations.find(s => s.id === specId);
        if (!spec) return;

        const linkedProjects = projects.filter(proj => {
            const plan = offerizationPlans[spec.id];
            return plan?.releases?.some(rel => rel.name === proj.name);
        });

        setPopupContent({
            title: spec.name,
            projects: linkedProjects
        });
        setIsSpecPopupOpen(true);
    };

    const handleSavePurpose = () => {
        setPurposeData(prev => ({ ...prev, statement: purposeInput }));
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
            const newEquationsForPillar = [...(newEquations[pillar] || [])];
            if (equationPopupState.equation?.id) { // Editing existing
                const index = newEquationsForPillar.findIndex(eq => eq.id === equationPopupState.equation!.id);
                if (index > -1) {
                    newEquationsForPillar[index] = { ...equationPopupState.equation, ...equation, metaRuleIds: equation.metaRuleIds || [] };
                }
            } else { // Adding new
                newEquationsForPillar.push({ id: `eq_${Date.now()}`, ...equation, metaRuleIds: equation.metaRuleIds || [] });
            }
            newEquations[pillar] = newEquationsForPillar;
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
    
    const uncategorizedItems = useMemo(() => {
        const assignedItemIds = new Set<string>();

        pillars.forEach(pillar => {
            const allPillarNames = [pillar.name, ...pillar.attributes];
            
            metaRules.forEach(item => {
                if (item.purposePillar && allPillarNames.includes(item.purposePillar)) {
                    assignedItemIds.add(item.id);
                }
            });
            
            specializations.forEach(item => {
                if (item.purposePillar && allPillarNames.includes(item.purposePillar)) {
                    assignedItemIds.add(item.id);
                }
            });

            projects.forEach(item => {
                if (item.purposePillar && allPillarNames.includes(item.purposePillar)) {
                    assignedItemIds.add(item.id);
                }
            });
        });
        
        const plannedSpecIds = new Set((skillAcquisitionPlans || []).map(p => p.specializationId));
        const uncategorizedRules = metaRules.filter(r => !assignedItemIds.has(r.id));
        const uncategorizedSkills = specializations.filter(s => !s.purposePillar && plannedSpecIds.has(s.id));

        const today = startOfToday();
        const activeProjects = projects.filter(project => {
            // Check productization plans by project ID
            if (project.productPlan?.releases?.some(release => isAfter(parseISO(release.launchDate), today) || format(parseISO(release.launchDate), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'))) {
                return true;
            }

            // Check offerization plans by project NAME
            const isOfferedAndActive = Object.values(offerizationPlans).some(plan => 
                plan.releases?.some(release => {
                    if (release.name !== project.name) return false;
                    try {
                        return isAfter(parseISO(release.launchDate), today) || format(parseISO(release.launchDate), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                    } catch { return false; }
                })
            );
            return isOfferedAndActive;
        });
        const uncategorizedProjects = activeProjects.filter(p => !assignedItemIds.has(p.id));

        return { rules: uncategorizedRules, skills: uncategorizedSkills, projects: uncategorizedProjects };
    }, [metaRules, specializations, projects, pillars, skillAcquisitionPlans, productizationPlans, offerizationPlans]);

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
                                placeholder="“Mind like a fort, Body like a steel, Heart like a garden, Spirit like the sun.”"
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
                        <p className="text-lg text-muted-foreground whitespace-pre-wrap min-h-[5rem] cursor-pointer" onClick={() => { setPurposeInput(purposeData?.statement || ''); setIsEditingPurpose(true); }}>
                            {purposeData?.statement || "Click to define your purpose..."}
                        </p>
                    )}
                </CardContent>
            </Card>

            <Separator />

             <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Pillar Cards</h2>
                    <Button onClick={addPillarCard}><PlusCircle className="mr-2 h-4 w-4" />Add Pillar Card</Button>
                </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {purposeData?.pillarCards?.map(card => (
                        <PillarCard key={card.id} cardData={card} onUpdate={updatePillarCard} onDelete={deletePillarCard} onSpecializationClick={handleSpecializationClick} />
                    ))}
                 </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pillars.map(pillar => {
                    const allPillarNames = [pillar.name, ...pillar.attributes];
                    const rulesForPillar = metaRules.filter(r => r.purposePillar && allPillarNames.includes(r.purposePillar));
                    const skillsForPillar = specializations.filter(s => s.purposePillar && allPillarNames.includes(s.purposePillar));
                    const projectsForPillar = projects.filter(p => p.purposePillar && allPillarNames.includes(p.purposePillar));
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
                                                    <div key={skill.id} className="text-sm p-2 rounded-md flex justify-between items-center group hover:bg-muted/50">
                                                        <span className="truncate">{skill.name}</span>
                                                        <div className="flex items-center opacity-0 group-hover:opacity-100">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7"><Badge className="capitalize">{skill.purposePillar?.[0] || '?'}</Badge></Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent>
                                                                    {pillars.map(p => ( <DropdownMenuGroup key={p.name}> <DropdownMenuItem onSelect={() => handleUpdatePillar(skill.id, p.name, 'specialization')}>{p.name}</DropdownMenuItem> {p.attributes.map(attr => (<DropdownMenuItem key={attr} onSelect={() => handleUpdatePillar(skill.id, attr, 'specialization')} className="pl-6">{attr}</DropdownMenuItem>))} </DropdownMenuGroup>))}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                            <button onClick={() => handleUpdatePillar(skill.id, '', 'specialization')} className="p-1 rounded-full hover:bg-destructive/20 text-destructive"><Unlink className="h-3 w-3" /></button>
                                                        </div>
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
                                                    <div key={project.id} className="text-sm p-2 rounded-md flex justify-between items-center group hover:bg-muted/50">
                                                        <span className="truncate">{project.name}</span>
                                                        <div className="flex items-center opacity-0 group-hover:opacity-100">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7"><Badge className="capitalize">{project.purposePillar?.[0] || '?'}</Badge></Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent>
                                                                    {pillars.map(p => ( <DropdownMenuGroup key={p.name}> <DropdownMenuItem onSelect={() => handleUpdatePillar(project.id, p.name, 'project')}>{p.name}</DropdownMenuItem> {p.attributes.map(attr => (<DropdownMenuItem key={attr} onSelect={() => handleUpdatePillar(project.id, attr, 'project')} className="pl-6">{attr}</DropdownMenuItem>))} </DropdownMenuGroup>))}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                            <button onClick={() => handleUpdatePillar(project.id, '', 'project')} className="p-1 rounded-full hover:bg-destructive/20 text-destructive"><Unlink className="h-3 w-3" /></button>
                                                        </div>
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
                                    <Accordion type="multiple" className="w-full">
                                    <div className="space-y-2">
                                        {equationsForPillar.map(eq => {
                                            const rulesInEquation = (eq.metaRuleIds || []).map(id => metaRules.find(r => r.id === id)).filter((r): r is MetaRule => !!r);
                                            return (
                                                <AccordionItem value={eq.id} key={eq.id} className="border p-2 rounded-md bg-muted/30">
                                                    <div className="flex items-center group">
                                                        <AccordionTrigger className="text-sm font-semibold hover:no-underline p-0 flex-grow text-left">
                                                            <div className="flex items-center gap-2">
                                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                                <span>{eq.outcome}</span>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleOpenEquationPopup(pillar.name, eq); }}>
                                                                <Edit className="h-3 w-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDeleteEquation(pillar.name, eq.id); }}>
                                                                <Trash2 className="h-3 w-3 text-destructive"/>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <AccordionContent className="pt-2">
                                                        <div className="space-y-1 pl-2 border-l-2 ml-2">
                                                            {rulesInEquation.map(rule => (
                                                                <button key={rule.id} className="text-left text-xs text-muted-foreground hover:text-primary w-full p-1 rounded" onClick={(e) => openRuleDetailPopup(rule.id, e)}>
                                                                    {rule.text}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            )
                                        })}
                                        {equationsForPillar.length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-4">No equations defined.</p>
                                        )}
                                    </div>
                                    </Accordion>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {uncategorizedItems.rules.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Uncategorized Meta-Rules</CardTitle>
                      <CardDescription>Assign these rules to a pillar using the dropdown menu.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {uncategorizedItems.rules.map(renderMetaRule)}
                    </CardContent>
                  </Card>
                )}
                {uncategorizedItems.skills.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Uncategorized Specializations</CardTitle>
                            <CardDescription>Assign these skills to a pillar. Only planned specializations are shown.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {uncategorizedItems.skills.map(skill => (
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
                {uncategorizedItems.projects.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Uncategorized Projects</CardTitle>
                            <CardDescription>Assign these active projects to a pillar using the dropdown menu.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {uncategorizedItems.projects.map(project => (
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
                    onOpenChange={(open) => setEquationPopupState({ pillar: '', isOpen: open })}
                    pillarName={equationPopupState.pillar}
                    equation={equationPopupState.equation}
                    onSave={handleSaveEquation}
                    metaRules={metaRules}
                />
            )}
            <Dialog open={isSpecPopupOpen} onOpenChange={setIsSpecPopupOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Projects for "{popupContent.title}"</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  {popupContent.projects.length > 0 ? (
                    <ul className="space-y-2">
                      {popupContent.projects.map(p => (
                        <li key={p.id} className="p-2 rounded-md border bg-muted/30">{p.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-muted-foreground">You need to work on this. No projects are currently linked to this specialization in your offerization plan.</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
        </div>
    );
}

export const EquationEditor = ({ isOpen, onOpenChange, pillarName, equation, onSave, metaRules, viewOnly = false }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    pillarName: string;
    equation?: HabitEquation;
    onSave: (pillar: string, equation: Omit<HabitEquation, 'id'>) => void;
    metaRules: MetaRule[];
    viewOnly?: boolean;
}) => {
    const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
    const [outcome, setOutcome] = useState('');
    const [selectedPillar, setSelectedPillar] = useState('');

    useEffect(() => {
        if (equation) {
            setSelectedRuleIds(equation.metaRuleIds || []);
            setOutcome(equation.outcome);
            setSelectedPillar(pillarName);
        } else {
            setSelectedRuleIds([]);
            setOutcome('');
            setSelectedPillar('');
        }
    }, [equation, pillarName, isOpen]);

    const handleSaveClick = () => {
        if (!selectedPillar || selectedRuleIds.length === 0 || !outcome.trim()) {
            alert('Please select a pillar, at least one rule, and provide an outcome.');
            return;
        }
        onSave(selectedPillar, { metaRuleIds: selectedRuleIds, outcome: outcome.trim() });
    };

    const handleToggleRule = (ruleId: string) => {
        setSelectedRuleIds(prev =>
            prev.includes(ruleId) ? prev.filter(id => id !== ruleId) : [...prev, ruleId]
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{viewOnly ? 'View' : equation ? 'Edit' : 'Create'} Rule Equation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Pillar</Label>
                        <Select value={selectedPillar} onValueChange={setSelectedPillar} disabled={viewOnly || !!equation}>
                            <SelectTrigger><SelectValue placeholder="Select Pillar..." /></SelectTrigger>
                            <SelectContent>
                                {['Mind', 'Body', 'Heart', 'Spirit'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Select Meta-Rules</Label>
                        <ScrollArea className="h-40 w-full rounded-md border p-2">
                            {metaRules.map(rule => (
                                <div key={rule.id} className="flex items-center space-x-2 p-1">
                                    <Checkbox
                                        id={`rule-${rule.id}`}
                                        checked={selectedRuleIds.includes(rule.id)}
                                        onCheckedChange={() => !viewOnly && handleToggleRule(rule.id)}
                                        disabled={viewOnly}
                                    />
                                    <Label htmlFor={`rule-${rule.id}`} className="text-sm font-normal w-full cursor-pointer">{rule.text}</Label>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                     <div className="space-y-1">
                        <Label>Expected Outcome</Label>
                        <Input value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="e.g., Increased productivity" disabled={viewOnly}/>
                    </div>
                </div>
                {!viewOnly && (
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleSaveClick}>Save Equation</Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default function PurposePage() {
    return (
        <AuthGuard>
            <PurposePageContent />
        </AuthGuard>
    );
}





    





    