
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, ChevronLeft, Target, Shield, Edit, X, History, Plus, Save, Star, Mic, MessageSquare, Lightbulb, ThumbsUp, Flame, Compass, Sun, GitBranch, Anchor, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { PistonEntry, PistonType, PistonsData, Resource, DailySchedule, PurposeData, Pattern, MetaRule, PistonsInitialState, AutoSuggestionEntry } from '@/types/workout';
import { DndContext, useDraggable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';


const PISTON_ICONS: Record<PistonType, React.ReactNode> = {
    'Stabilizer': <Anchor className="h-5 w-5 text-purple-500" />,
    'Fire': <Flame className="h-5 w-5 text-red-500" />,
    'Explorer': <Compass className="h-5 w-5 text-sky-500" />,
    'Clarity': <Sun className="h-5 w-5 text-yellow-500" />,
    'Bridge': <GitBranch className="h-5 w-5 text-green-500" />,
};

const EMOTIONAL_STATES = {
    'Doubt': { imbalance: '🔻 Dopamine, 🔺 Cortisol', message: '“I don’t trust my next move.”' },
    'Fear': { imbalance: '🔺 Adrenaline, Norepinephrine, Cortisol', message: '“Something might hurt me.”' },
    'Shame': { imbalance: '🔻 Serotonin, Oxytocin', message: '“I’m not worthy to connect or try again.”' },
    'Regret': { imbalance: '🔺 Cortisol, 🔻 Dopamine', message: '“The past stole my future.”' },
    'Overwhelm': { imbalance: '🔺 Norepinephrine, Cortisol, Adrenaline', message: '“Too much. Can’t handle.”' },
    'Hopelessness': { imbalance: '🔻 Dopamine, Serotonin', message: '“Nothing will change.”' },
    'Loneliness': { imbalance: '🔻 Oxytocin, Serotonin', message: '“I don’t matter to anyone.”' },
    'Imposter Syndrome': { imbalance: '🔻 Serotonin, 🔺 Cortisol', message: '“I’ll be exposed. I don’t belong.”' },
    'Resentment / Envy': { imbalance: '🔻 Dopamine, 🔺 Cortisol', message: '“They have what I should.”' }
};

type EmotionalState = keyof typeof EMOTIONAL_STATES;

const FANTASY_STATES = {
    'Excitement': { imbalance: '🔺 Dopamine, Norepinephrine', message: '“This is going to be amazing.”' },
    'Anticipation': { imbalance: '🔺 Dopamine', message: '“I can’t wait for this to happen.”' },
    'Euphoria': { imbalance: '🔺 Dopamine, Endorphins', message: '“This feels incredible.”' },
    'Pride': { imbalance: '🔺 Serotonin, Dopamine', message: '“I accomplished something great.”' },
    'Desire': { imbalance: '🔺 Dopamine', message: '“I want this intensely.”' },
    'Longing': { imbalance: '🔺 Dopamine, 🔻 Serotonin', message: '“If only I had this.”' },
    'Curiosity': { imbalance: '🔺 Dopamine, Acetylcholine', message: '“I need to know more.”' },
    'Hope': { imbalance: '🔺 Dopamine, Serotonin', message: '“Things can get better.”' },
    'Satisfaction': { imbalance: '🔺 Serotonin, Oxytocin', message: '“This is complete and good.”' }
};

type FantasyState = keyof typeof FANTASY_STATES;


export function PistonsHead() {
  const { 
    isPistonsHeadOpen, setIsPistonsHeadOpen, 
    pistons, setPistons, 
    pistonsInitialState,
    autoSuggestions, setAutoSuggestions,
  } = useAuth();
  const [currentView, setCurrentView] = useState<'main' | 'desires' | 'thoughts' | 'negative-thoughts' | 'positive-thoughts' | 'autosuggestion' | 'starred'>('main');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  
  const [position, setPosition] = useState({ x: 50, y: 50 });
  
  useEffect(() => {
    if (isPistonsHeadOpen && pistonsInitialState) {
        setCurrentView(pistonsInitialState.view as any);
        if (pistonsInitialState.topicId && pistonsInitialState.topicName) {
            setSelectedTopicId(pistonsInitialState.topicId);
        }
    } else if (!isPistonsHeadOpen) {
        setCurrentView('main');
        setSelectedTopicId(null);
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
        setSelectedTopicId(null);
    }, 300);
  };
  
  const handleViewChange = (newView: 'desires' | 'thoughts' | 'autosuggestion' | 'starred' | PistonType) => {
    if (Object.keys(PISTON_ICONS).includes(newView)) {
        setCurrentView('desires');
        setSelectedTopicId(newView);
    } else {
        setCurrentView(newView);
        setSelectedTopicId(null);
    }
  };

  const onBack = () => {
    if ((currentView === 'negative-thoughts' || currentView === 'positive-thoughts') && selectedTopicId) {
        setSelectedTopicId(null);
    } else if (currentView === 'negative-thoughts' || currentView === 'positive-thoughts') {
        setCurrentView('thoughts');
    } else if (selectedTopicId) {
        setSelectedTopicId(null);
    } else {
        setCurrentView('main');
    }
  };

  const renderContent = () => {
    const commonProps = { onBack };
    if (currentView === 'desires' && selectedTopicId) {
        return <DesireDetailView type={selectedTopicId as PistonType} {...commonProps} />;
    }
    switch (currentView) {
      case 'desires': return <DesiresView onSelect={(type) => handleViewChange(type)} />;
      case 'thoughts': return <ThoughtsView onSelect={(type) => setCurrentView(type === 'Fantasy' ? 'positive-thoughts' : 'negative-thoughts')} />;
      case 'negative-thoughts': return <NegativeThoughtsView onSelect={(state) => { /* handle selection */ }} onSchedule={() => {}} />;
      case 'positive-thoughts': return <PositiveThoughtsView onSelect={(state) => { /* handle selection */ }} onSchedule={() => {}} />;
      case 'autosuggestion': return <AutoSuggestionView />;
      case 'starred': return <StarredView />;
      default: return <MainPistonView onSelect={handleViewChange} />;
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

const MainPistonView = ({ onSelect }: { onSelect: (view: 'desires' | 'thoughts' | 'autosuggestion' | 'starred') => void }) => (
    <CardContent className="p-4">
        <p className="text-muted-foreground text-center mb-4 text-sm">Select a category to define your core motivations.</p>
        <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => onSelect('desires')} variant="outline" className="flex-col h-20"><Target className="h-6 w-6 text-purple-500 mb-1"/>Desires</Button>
            <Button onClick={() => onSelect('thoughts')} variant="outline" className="flex-col h-20"><MessageSquare className="h-6 w-6 text-orange-500 mb-1"/>Thoughts</Button>
            <Button onClick={() => onSelect('autosuggestion')} variant="outline" className="flex-col h-20"><Lightbulb className="h-6 w-6 text-yellow-500 mb-1"/>Auto Suggestion</Button>
            <Button onClick={() => onSelect('starred')} variant="outline" className="flex-col h-20"><Star className="h-6 w-6 text-primary mb-1"/>Starred</Button>
        </div>
    </CardContent>
);

const DesiresView = ({ onSelect }: { onSelect: (type: PistonType) => void }) => {
    return (
        <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-2">
                <Button onClick={() => onSelect('Fire')} variant="outline" className="justify-start h-12 text-base"><Flame className="h-5 w-5 mr-3 text-red-500"/>Fire (Passion, Inspiration)</Button>
                <Button onClick={() => onSelect('Clarity')} variant="outline" className="justify-start h-12 text-base"><Sun className="h-5 w-5 mr-3 text-yellow-500"/>Clarity (Focus, Vision)</Button>
                <Button onClick={() => onSelect('Bridge')} variant="outline" className="justify-start h-12 text-base"><GitBranch className="h-5 w-5 mr-3 text-green-500"/>Bridge (Connection, Empathy)</Button>
                <Button onClick={() => onSelect('Stabilizer')} variant="outline" className="justify-start h-12 text-base"><Anchor className="h-5 w-5 mr-3 text-purple-500"/>Stabilizer (Security, Grounding)</Button>
                <Button onClick={() => onSelect('Explorer')} variant="outline" className="justify-start h-12 text-base"><Compass className="h-5 w-5 mr-3 text-sky-500"/>Explorer (Curiosity, Growth)</Button>
            </div>
        </CardContent>
    )
}

const DesireDetailView = ({ type, onBack }: { type: PistonType; onBack: () => void; }) => {
    const { pistons, setPistons, resources, setResources } = useAuth();
    const [newDesire, setNewDesire] = useState('');

    const currentPistonState = pistons[type] || [];
    
    const handleAddDesire = () => {
        if (!newDesire.trim()) return;
        const newEntry: PistonEntry = {
            id: `piston_${Date.now()}`,
            text: newDesire.trim(),
            timestamp: Date.now()
        };
        setPistons(prev => ({
            ...prev,
            [type]: [...(prev[type] || []), newEntry]
        }));
        setNewDesire('');
    };
    
    const handleDeleteDesire = (id: string) => {
        setPistons(prev => ({
            ...prev,
            [type]: (prev[type] || []).filter(d => d.id !== id)
        }));
    };

    const handleConvertToMechanism = (desire: PistonEntry) => {
        const newMechanism: Resource = {
            id: `res_mech_${Date.now()}`,
            name: desire.text,
            folderId: '', // User will need to assign this later
            type: 'mechanism',
            mechanismFramework: 'positive',
            trigger: { action: desire.text },
            createdAt: new Date().toISOString(),
        };
        setResources(prev => [...prev, newMechanism]);
        handleDeleteDesire(desire.id);
    };

    return (
        <CardContent className="p-4">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 font-semibold">
                    {PISTON_ICONS[type]}
                    {type}
                </div>
                <div className="flex gap-2">
                    <Input value={newDesire} onChange={e => setNewDesire(e.target.value)} placeholder="What do you want?" onKeyDown={e => e.key === 'Enter' && handleAddDesire()} />
                    <Button onClick={handleAddDesire} size="icon"><Plus/></Button>
                </div>
                <ScrollArea className="h-60">
                    <ul className="space-y-2 pr-2">
                        {currentPistonState.map(desire => (
                            <li key={desire.id} className="flex items-center justify-between group p-2 rounded-md border bg-muted/30">
                                <span className="text-sm">{desire.text}</span>
                                <div className="flex items-center">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleConvertToMechanism(desire)}>
                                        <Workflow className="h-4 w-4"/>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteDesire(desire.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </div>
                            </li>
                        ))}
                         {currentPistonState.length === 0 && <p className="text-center text-sm text-muted-foreground pt-8">No desires logged for this category.</p>}
                    </ul>
                </ScrollArea>
            </div>
        </CardContent>
    )
};


const ThoughtsView = ({ onSelect }: { onSelect: (type: 'Fantasy' | 'Disruptive') => void }) => (
    <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => onSelect('Fantasy')} variant="outline" className="flex-col h-20"><ThumbsUp className="h-6 w-6 text-green-500 mb-1"/>Fantasy</Button>
            <Button onClick={() => onSelect('Disruptive')} variant="outline" className="flex-col h-20"><Shield className="h-6 w-6 text-red-500 mb-1"/>Disruptive</Button>
        </div>
    </CardContent>
);

const NegativeThoughtsView = ({ onSelect, onSchedule }: { onSelect: (state: EmotionalState) => void; onSchedule: () => void; }) => {
    return (
        <CardContent className="p-4">
            <ScrollArea className="h-80">
                <ul className="space-y-2 pr-2">
                    {Object.keys(EMOTIONAL_STATES).map(state => (
                        <li key={state}>
                             <div className="flex items-center justify-between group p-2 rounded-md border bg-muted/20">
                                <span className="font-medium group-hover:text-primary transition-colors">{state}</span>
                                <p className='text-xs text-muted-foreground'>{EMOTIONAL_STATES[state as EmotionalState].message}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </ScrollArea>
        </CardContent>
    );
};

const PositiveThoughtsView = ({ onSelect, onSchedule }: { onSelect: (state: FantasyState) => void; onSchedule: () => void; }) => {
    return (
        <CardContent className="p-4">
            <ScrollArea className="h-80">
                <ul className="space-y-2 pr-2">
                    {Object.keys(FANTASY_STATES).map(state => (
                        <li key={state}>
                             <div className="flex items-center justify-between group p-2 rounded-md border bg-muted/20">
                                <span className="font-medium group-hover:text-primary transition-colors">{state}</span>
                                <p className='text-xs text-muted-foreground'>{FANTASY_STATES[state as FantasyState].message}</p>
                            </div>
                        </li>
                    ))}
                </ul>
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
