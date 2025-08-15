

"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, ChevronLeft, Target, Shield, Edit, X, History, Plus, Save, Star, Mic, MessageSquare, Lightbulb, ThumbsUp, Flame, Compass, Sun, GitBranch, Anchor, Trash2, Calendar as CalendarIcon, HeartPulse, Search, Workflow, PlusCircle, Library, Database } from 'lucide-react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { PistonEntry, PistonType, PistonsData, Resource, DailySchedule, PurposeData, Pattern, MetaRule, PistonsInitialState, PistonEntry as AutoSuggestionEntry, RuleDetailPopupState, HabitEquation } from '@/types/workout';
import { DndContext, useDraggable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';


const PISTON_ICONS: Record<PistonType, React.ReactNode> = {
    'Gratitude': <HeartPulse className="h-5 w-5 text-pink-500" />,
    'Curiosity': <Search className="h-5 w-5 text-sky-500" />,
    'Inspiration': <Flame className="h-5 w-5 text-red-500" />,
    'Compassion': <HeartPulse className="h-5 w-5 text-green-500" />,
    'Truth Seeking': <Lightbulb className="h-5 w-5 text-yellow-500" />,
};


export function PistonsHead() {
  const { 
    isPistonsHeadOpen, setIsPistonsHeadOpen, 
    pistonsInitialState,
  } = useAuth();
  const [currentView, setCurrentView] = useState<'main' | 'quick-access' | 'rule-equations' | 'autosuggestion' | 'starred'>('main');
  
  const [position, setPosition] = useState({ x: 50, y: 50 });
  
  useEffect(() => {
    if (isPistonsHeadOpen && pistonsInitialState) {
        setCurrentView(pistonsInitialState.view as any);
    } else if (!isPistonsHeadOpen) {
        setCurrentView('main');
    }
  }, [isPistonsHeadOpen, pistonsInitialState]);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'pistons-popup',
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const id = active.id as string;
    
    if (id === 'pistons-popup') {
        setPosition(prev => ({ x: prev.x + delta.x, y: prev.y + delta.y }));
    }
  };
  
  const handleClose = () => {
    setIsPistonsHeadOpen(false);
    setTimeout(() => {
        setCurrentView('main');
    }, 300);
  };
  
  const onBack = () => {
    setCurrentView('main');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'quick-access': return <QuickAccessView />;
      case 'rule-equations': return <RuleEquationsView />;
      case 'autosuggestion': return <AutoSuggestionView />;
      case 'starred': return <StarredView />;
      default: return <MainPistonView onSelect={setCurrentView} />;
    }
  };
  
  const style: React.CSSProperties = {
    position: 'fixed',
    top: position.y,
    left: position.x,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : `translate3d(0px, 0px, 0)`,
    willChange: 'transform',
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
        {!isPistonsHeadOpen && (
            <Button
            onClick={() => setIsPistonsHeadOpen(true)}
            variant="secondary"
            size="icon"
            className="fixed bottom-4 left-4 z-50 h-12 w-12 rounded-full shadow-lg"
            >
            <BrainCircuit className="h-6 w-6" />
            </Button>
        )}

        {isPistonsHeadOpen && (
            <div
                ref={setNodeRef}
                style={style}
                className="z-[60]"
            >
                <Card className="w-96 shadow-2xl border-2 border-primary/50 bg-card flex flex-col max-h-[90vh]">
                    <CardHeader 
                        className="p-3 text-center flex-shrink-0"
                    >
                        {(currentView !== 'main') && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 absolute top-1.5 left-1.5 z-20" onClick={(e) => { e.stopPropagation(); onBack(); }}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <div className="w-full text-center cursor-grab active:cursor-grabbing flex justify-center" {...attributes} {...listeners}>
                            <CardTitle className="text-base truncate px-8">
                                Pistons of Intention
                            </CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 absolute top-1.5 right-1.5 z-20" onClick={handleClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    {renderContent()}
                </Card>
            </div>
        )}
    </DndContext>
  );
}

const MainPistonView = ({ onSelect }: { onSelect: (view: 'quick-access' | 'rule-equations' | 'autosuggestion' | 'starred') => void }) => (
    <CardContent className="p-4">
        <p className="text-muted-foreground text-center mb-4 text-sm">Select a category to define or review your core motivations.</p>
        <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => onSelect('quick-access')} variant="outline" className="flex-col h-20"><Database className="h-6 w-6 text-purple-500 mb-1"/>Quick Access</Button>
            <Button onClick={() => onSelect('rule-equations')} variant="outline" className="flex-col h-20"><Workflow className="h-6 w-6 text-orange-500 mb-1"/>Rule Equations</Button>
            <Button onClick={() => onSelect('autosuggestion')} variant="outline" className="flex-col h-20"><Lightbulb className="h-6 w-6 text-yellow-500 mb-1"/>Auto Suggestion</Button>
            <Button onClick={() => onSelect('starred')} variant="outline" className="flex-col h-20"><Star className="h-6 w-6 text-primary mb-1"/>Starred</Button>
        </div>
    </CardContent>
);

const QuickAccessView = () => {
    const { resources, resourceFolders, setResources, openGeneralPopup } = useAuth();
    const { toast } = useToast();
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const quickAccessFolder = useMemo(() => resourceFolders.find(f => f.name === 'Quick Access' && !f.parentId), [resourceFolders]);

    const quickAccessCards = useMemo(() => {
        if (!quickAccessFolder) return [];
        return resources.filter(r => r.folderId === quickAccessFolder.id);
    }, [resources, quickAccessFolder]);

    const handleAddCard = () => {
        if (!quickAccessFolder) {
            toast({ title: 'Error', description: 'Quick Access folder not found.', variant: 'destructive'});
            return;
        }
        const newCard: Resource = {
            id: `res_card_${Date.now()}`,
            name: "New Card",
            folderId: quickAccessFolder.id,
            type: 'card',
            createdAt: new Date().toISOString(),
        };
        setResources(prev => [...prev, newCard]);
        setEditingCardId(newCard.id);
        setEditingName("New Card");
    };

    const handleNameSave = () => {
        if (!editingCardId) return;

        if (editingName.trim() === '') {
            setResources(prev => prev.filter(r => r.id !== editingCardId));
            toast({ title: 'Card Discarded', description: 'Empty card was not saved.' });
        } else {
            setResources(prev => prev.map(r => r.id === editingCardId ? { ...r, name: editingName } : r));
        }

        setEditingCardId(null);
        setEditingName('');
    };

    return (
        <CardContent className="p-4">
             <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Quick Access</h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddCard}>
                    <PlusCircle className="h-4 w-4 text-green-500"/>
                </Button>
            </div>
            <ScrollArea className="h-80">
                <ul className="space-y-2 pr-2">
                    {quickAccessCards.map(card => (
                        <li key={card.id} className="p-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors">
                            {editingCardId === card.id ? (
                                <Input
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    onBlur={handleNameSave}
                                    onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                                    autoFocus
                                    className="h-8 text-sm"
                                />
                            ) : (
                                <button className="text-sm font-medium w-full text-left" onClick={(e) => openGeneralPopup(card.id, e)}>
                                    {card.name}
                                </button>
                            )}
                        </li>
                    ))}
                    {quickAccessCards.length === 0 && <p className="text-center text-sm text-muted-foreground pt-8">No quick access cards found.</p>}
                </ul>
            </ScrollArea>
        </CardContent>
    );
};

const RuleEquationsView = () => {
    const { pillarEquations, setPillarEquations, metaRules } = useAuth();
    const [isAddEquationOpen, setIsAddEquationOpen] = useState(false);
    const [selectedPillar, setSelectedPillar] = useState('');
    const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
    const [outcome, setOutcome] = useState('');

    const handleSaveEquation = () => {
        if (!selectedPillar || selectedRuleIds.length === 0 || !outcome.trim()) {
            alert('Please select a pillar, at least one rule, and provide an outcome.');
            return;
        }
        const newEquation: HabitEquation = {
            id: `eq_${Date.now()}`,
            metaRuleIds: selectedRuleIds,
            outcome: outcome.trim(),
        };
        setPillarEquations(prev => ({
            ...prev,
            [selectedPillar]: [...(prev[selectedPillar] || []), newEquation]
        }));
        setIsAddEquationOpen(false);
        setSelectedPillar('');
        setSelectedRuleIds([]);
        setOutcome('');
    };

    return (
        <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Rule Equations</h3>
                <Dialog open={isAddEquationOpen} onOpenChange={setIsAddEquationOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><PlusCircle className="h-4 w-4 text-green-500"/></Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create New Rule Equation</DialogTitle></DialogHeader>
                        <div className="py-4 space-y-4">
                            <Select value={selectedPillar} onValueChange={setSelectedPillar}>
                                <SelectTrigger><SelectValue placeholder="Select Pillar..." /></SelectTrigger>
                                <SelectContent>
                                    {['Mind', 'Body', 'Heart', 'Spirit'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <ScrollArea className="h-40 border rounded-md p-2">
                                {metaRules.map(rule => (
                                    <div key={rule.id} className="flex items-center space-x-2 p-1">
                                        <Checkbox 
                                            id={`rule-${rule.id}`} 
                                            checked={selectedRuleIds.includes(rule.id)}
                                            onCheckedChange={() => setSelectedRuleIds(prev => prev.includes(rule.id) ? prev.filter(id => id !== rule.id) : [...prev, rule.id])}
                                        />
                                        <Label htmlFor={`rule-${rule.id}`} className="font-normal w-full cursor-pointer">{rule.text}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                            <Input value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="Expected Outcome..." />
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveEquation}>Save Equation</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <ScrollArea className="h-80 pr-2">
                <div className="space-y-4">
                    {Object.entries(pillarEquations).map(([pillar, equations]) => (
                        <div key={pillar}>
                            <h4 className="font-medium text-sm mb-1">{pillar}</h4>
                            <div className="space-y-2">
                                {equations.map(eq => (
                                    <Card key={eq.id} className="bg-muted/30 p-3">
                                        <ul className="list-disc list-inside text-xs space-y-1">
                                            {(eq.metaRuleIds || []).map(id => metaRules.find(r => r.id === id)?.text).filter(Boolean).map(text => <li key={text}>{text}</li>)}
                                        </ul>
                                        <p className="flex items-center gap-1 mt-2 pt-2 border-t text-sm font-semibold">
                                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                            <span>{eq.outcome}</span>
                                        </p>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </CardContent>
    );
};

const AutoSuggestionView = () => {
    const { autoSuggestions, setAutoSuggestions } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [newSuggestion, setNewSuggestion] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const suggestionsForDate = autoSuggestions[dateKey] || [];

    const handleAddSuggestion = () => {
        if (!newSuggestion.trim()) return;
        const newEntry: AutoSuggestionEntry = {
            id: `sg_${Date.now()}`,
            text: newSuggestion.trim(),
            starred: false,
            timestamp: Date.now(),
        };
        setAutoSuggestions(prev => ({
            ...prev,
            [dateKey]: [...(prev[dateKey] || []), newEntry]
        }));
        setNewSuggestion('');
    };
    
    const handleToggleStar = (id: string) => {
        setAutoSuggestions(prev => ({
            ...prev,
            [dateKey]: (prev[dateKey] || []).map(s => s.id === id ? { ...s, starred: !s.starred } : s)
        }));
    };
    
    const handleDeleteSuggestion = (id: string) => {
        setAutoSuggestions(prev => ({
            ...prev,
            [dateKey]: (prev[dateKey] || []).filter(s => s.id !== id)
        }));
    };

    return (
        <CardContent className="p-4">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Suggestions for:</p>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(selectedDate, 'PPP')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end" side="right" sideOffset={12} alignOffset={10}>
                            <CalendarComponent
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                    if (date) setSelectedDate(date);
                                    setIsCalendarOpen(false);
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex gap-2">
                    <Input value={newSuggestion} onChange={e => setNewSuggestion(e.target.value)} placeholder="Log an idea..." onKeyDown={e => e.key === 'Enter' && handleAddSuggestion()} />
                    <Button onClick={handleAddSuggestion} size="icon"><Plus/></Button>
                </div>
                <ScrollArea className="h-60">
                    <ul className="space-y-2 pr-2">
                        {suggestionsForDate.map(suggestion => (
                            <li key={suggestion.id} className="flex items-center justify-between group p-2 rounded-md border bg-muted/30">
                                <span className="text-sm flex-grow pr-2">{suggestion.text}</span>
                                <div className="flex items-center flex-shrink-0">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleStar(suggestion.id)}>
                                        <Star className={cn("h-4 w-4", suggestion.starred ? "text-yellow-400 fill-current" : "text-muted-foreground")}/>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteSuggestion(suggestion.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </div>
                            </li>
                        ))}
                         {suggestionsForDate.length === 0 && <p className="text-center text-sm text-muted-foreground pt-8">No suggestions for this date.</p>}
                    </ul>
                </ScrollArea>
            </div>
        </CardContent>
    );
};

const StarredView = () => {
    const { autoSuggestions, setAutoSuggestions } = useAuth();
    
    const starredSuggestions = React.useMemo(() => {
        return Object.entries(autoSuggestions)
            .flatMap(([date, suggestions]) => suggestions.filter(s => s.starred).map(s => ({...s, date})))
            .sort((a,b) => b.timestamp - a.timestamp);
    }, [autoSuggestions]);
    
    const handleDeleteStarred = (dateKey: string, id: string) => {
        setAutoSuggestions(prev => {
            const newSuggestionsForDate = (prev[dateKey] || []).filter(s => s.id !== id);
            if (newSuggestionsForDate.length > 0) {
                return { ...prev, [dateKey]: newSuggestionsForDate };
            } else {
                const newAutoSuggestions = { ...prev };
                delete newAutoSuggestions[dateKey];
                return newAutoSuggestions;
            }
        });
    };

    return (
         <CardContent className="p-4">
            <ScrollArea className="h-96">
                <ul className="space-y-2 pr-2">
                    {starredSuggestions.map(suggestion => (
                        <li key={suggestion.id} className="flex items-center justify-between group p-2 rounded-md border bg-muted/30">
                             <div className="flex-grow">
                                <p className="text-sm">{suggestion.text}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(suggestion.date), 'PPP')}</p>
                             </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteStarred(suggestion.date, suggestion.id)}>
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                        </li>
                    ))}
                    {starredSuggestions.length === 0 && <p className="text-center text-sm text-muted-foreground pt-8">No starred suggestions yet.</p>}
                </ul>
            </ScrollArea>
        </CardContent>
    );
};
