
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Heart, Briefcase, TrendingUp, ChevronLeft, Target, HandHeart, Search, Sprout, Blocks, Mic, Smile, Shield, Edit, X, History, Plus, Save } from 'lucide-react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { PistonEntry, PistonType, PistonsData } from '@/types/workout';
import { DndContext, useDraggable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';


const PISTON_ICONS: Record<PistonType, React.ReactNode> = {
    'Desire': <Target className="h-5 w-5 text-red-500" />,
    'Curiosity': <Search className="h-5 w-5 text-sky-500" />,
    'Truth-Seeking': <HandHeart className="h-5 w-5 text-purple-500" />,
    'Contribution': <Sprout className="h-5 w-5 text-green-500" />,
    'Growth': <TrendingUp className="h-5 w-5 text-blue-500" />,
    'Expression': <Mic className="h-5 w-5 text-pink-500" />,
    'Pleasure': <Smile className="h-5 w-5 text-yellow-500" />,
    'Protection': <Shield className="h-5 w-5 text-gray-500" />,
};

const PISTON_NAMES: PistonType[] = [
  'Desire', 'Curiosity', 'Truth-Seeking', 'Contribution', 
  'Growth', 'Expression', 'Pleasure', 'Protection'
];

interface HistoryPopupState {
    piston: PistonType;
    x: number;
    y: number;
}
  
const HistoryPopupCard = ({ popupState, entries, onClose, onEdit }: { 
    popupState: HistoryPopupState; 
    entries: PistonEntry[]; 
    onClose: () => void; 
    onEdit: (piston: PistonType, entry: PistonEntry) => void;
}) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `history-popup-${popupState.piston}`,
    });

    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        willChange: 'transform',
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="z-[70]">
            <Card className="w-80 shadow-2xl border-2 border-primary/30 bg-card">
                <CardHeader className="p-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 cursor-grab flex-grow" {...listeners}>
                           {PISTON_ICONS[popupState.piston]} 
                           <CardTitle className="text-base">{popupState.piston} History</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <ScrollArea className="h-60">
                        <ul className="space-y-4 pr-4">
                            {entries.map(entry => (
                                <li key={entry.id} className="border-l-2 pl-3 group">
                                    <p className="text-sm whitespace-pre-wrap">{entry.text}</p>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(entry.timestamp), 'PPP p')}</p>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                            onClick={() => onEdit(popupState.piston, entry)}
                                        >
                                            <Edit className="h-3 w-3"/>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};


export function PistonsHead() {
  const { isPistonsHeadOpen, setIsPistonsHeadOpen, pistons, setPistons } = useAuth();
  const [currentView, setCurrentView] = useState<'main' | 'health' | 'wealth' | 'growth'>('main');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [historyPopup, setHistoryPopup] = useState<HistoryPopupState | null>(null);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'pistons-popup',
  });
  
  const handleCloseHistory = () => {
    setHistoryPopup(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (active.id === 'pistons-popup') {
        setPosition(prev => ({
            x: prev.x + delta.x,
            y: prev.y + delta.y,
        }));
    }
    if (typeof active.id === 'string' && active.id.startsWith('history-popup-')) {
        setHistoryPopup(prev => {
            if (!prev) return null;
            return {
                ...prev,
                x: prev.x + delta.x,
                y: prev.y + delta.y,
            }
        });
    }
  };
  
  const handleClose = () => {
    setIsPistonsHeadOpen(false);
    setHistoryPopup(null);
    setTimeout(() => {
        setCurrentView('main');
        setSelectedTopicId(null);
    }, 300);
  };
  
  const handleViewChange = (newView: 'main' | 'health' | 'wealth' | 'growth') => {
    setCurrentView(newView);
  };
  
  const handleTopicSelect = (topicId: string, type: 'wealth' | 'growth') => {
      setSelectedTopicId(topicId);
      setCurrentView(type);
  }

  const onBack = () => {
    if (selectedTopicId) {
        setSelectedTopicId(null);
    } else {
        setCurrentView('main');
    }
  };
  
  const getTopicName = (view: 'main' | 'health' | 'wealth' | 'growth') => {
    switch (view) {
      case 'health':
        return `Health: ${pistons.health?.activity || 'Activity'}`;
      case 'wealth':
         return selectedTopicId || `Select Wealth Topic`;
      case 'growth':
         return selectedTopicId || `Select Growth Topic`;
      default: return 'Pistons of Intention';
    }
  };
  const topicName = getTopicName(currentView);

  const renderContent = () => {
    switch (currentView) {
      case 'health':
        return <HealthPistonView onBack={onBack} setHistoryPopup={setHistoryPopup} mainPosition={position} />;
      case 'wealth':
        return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} onBack={onBack} setHistoryPopup={setHistoryPopup} mainPosition={position} /> : <TopicSelector onSelect={handleTopicSelect} type="wealth" onBack={onBack} />;
      case 'growth':
         return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} onBack={onBack} setHistoryPopup={setHistoryPopup} mainPosition={position} /> : <TopicSelector onSelect={handleTopicSelect} type="growth" onBack={onBack} />;
      default:
        return <MainPistonView onSelect={handleViewChange} />;
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
            <>
                <div
                    ref={setNodeRef}
                    style={style}
                    className="z-[60]"
                >
                    <Card className="w-96 shadow-2xl border-2 border-primary/50 bg-card relative">
                        <Button variant="ghost" size="icon" className="h-7 w-7 absolute top-1.5 right-1.5 z-20" onClick={handleClose}>
                            <X className="h-4 w-4" />
                        </Button>
                        <CardHeader 
                            className="p-3 text-center relative cursor-grab active:cursor-grabbing"
                            {...attributes} 
                            {...listeners}
                        >
                            {currentView !== 'main' && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 absolute top-1.5 left-1.5 z-20" onClick={(e) => { e.stopPropagation(); onBack(); }}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="w-full text-center">
                            <CardTitle className="text-base truncate px-8" title={topicName as string}>
                                {topicName}
                            </CardTitle>
                            </div>
                        </CardHeader>
                        {renderContent()}
                    </Card>
                </div>
                {historyPopup && (
                    <HistoryPopupCard 
                        popupState={historyPopup}
                        entries={pistons[selectedTopicId || (currentView === 'health' ? 'health' : '')]?.[historyPopup.piston] || []}
                        onClose={handleCloseHistory}
                        onEdit={(piston, entry) => {
                            if (currentView !== 'main' && selectedTopicId) {
                                // Find the right editor component and trigger its edit state
                                // This is a bit complex, might need a context or direct prop drilling.
                                // For now, we'll just log it. A better solution would involve a shared state for editing.
                                console.log("Edit request for", piston, entry.id);
                            }
                        }}
                    />
                )}
            </>
        )}
    </DndContext>
  );
}

const MainPistonView = ({ onSelect }: { onSelect: (view: 'health' | 'wealth' | 'growth') => void }) => (
    <CardContent className="p-4">
        <p className="text-muted-foreground text-center mb-4 text-sm">Select a category to define your core motivations.</p>
        <div className="flex justify-around items-center p-2 rounded-lg bg-muted/50">
            <Button onClick={() => onSelect('health')} variant="ghost" size="icon" className="h-12 w-12 text-red-500 hover:bg-red-500/10 hover:text-red-600"><Heart className="h-6 w-6"/></Button>
            <Button onClick={() => onSelect('wealth')} variant="ghost" size="icon" className="h-12 w-12 text-green-500 hover:bg-green-500/10 hover:text-green-600"><Briefcase className="h-6 w-6"/></Button>
            <Button onClick={() => onSelect('growth')} variant="ghost" size="icon" className="h-12 w-12 text-blue-500 hover:bg-blue-500/10 hover:text-blue-600"><TrendingUp className="h-6 w-6"/></Button>
        </div>
    </CardContent>
);


const HealthPistonView = ({ onBack, setHistoryPopup, mainPosition }: { onBack: () => void, setHistoryPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, mainPosition: {x: number, y: number} }) => {
    const { pistons, setPistons } = useAuth();
    const [activity, setActivity] = useState(pistons.health?.activity || '');
    const [isEditingActivity, setIsEditingActivity] = useState(!pistons.health?.activity);
    
    const handleSaveActivity = () => {
      if (activity.trim()) {
        setPistons(prev => ({...prev, health: { ...prev.health, activity: activity.trim() } as PistonsData }));
        setIsEditingActivity(false);
      }
    };

    if (isEditingActivity) {
        return (
            <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-center mb-2">Define Your Health Activity</h3>
                <p className="text-muted-foreground text-center mb-4">This will be the focus for your health intentions.</p>
                <div className="flex gap-2">
                    <Input 
                        value={activity}
                        onChange={(e) => setActivity(e.target.value)}
                        placeholder="e.g., GYM, Walking, Yoga"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveActivity()}
                    />
                    <Button onClick={handleSaveActivity}>Save</Button>
                </div>
            </CardContent>
        )
    }

    return <PistonEditorView topicId="health" topicName={`Health: ${activity}`} onBack={onBack} onEditTopicName={() => setIsEditingActivity(true)} setHistoryPopup={setHistoryPopup} mainPosition={mainPosition} />;
};

const TopicSelector = ({ onSelect, type, onBack }: { onSelect: (topicId: string, type: 'wealth' | 'growth') => void, type: 'wealth' | 'growth', onBack: () => void }) => {
    const { deepWorkDefinitions, upskillDefinitions } = useAuth();
    const source = type === 'wealth' ? deepWorkDefinitions : upskillDefinitions;
    const topics = [...new Set(source.map(def => def.category))];

    return (
        <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-center mb-2">Select a Topic</h3>
            <p className="text-muted-foreground text-center mb-4">Choose a {type} topic to define its core motivations.</p>
            <Select onValueChange={(value) => onSelect(value, type)}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a topic..." />
                </SelectTrigger>
                <SelectContent>
                    {topics.map(topic => (
                        <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </CardContent>
    )
}

const TopicPistonView = ({ topicId, onBack, setHistoryPopup, mainPosition }: { topicId: string, onBack: () => void, setHistoryPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, mainPosition: {x: number, y: number} }) => {
    const { pistons } = useAuth();
    const topicName = topicId === 'health' ? `Health: ${pistons.health?.activity || 'Activity'}` : topicId;
    return <PistonEditorView topicId={topicId} topicName={topicName} onBack={onBack} setHistoryPopup={setHistoryPopup} mainPosition={mainPosition} />;
};

const PistonEditorView = ({ topicId, topicName, onBack, onEditTopicName, setHistoryPopup, mainPosition }: { topicId: string, topicName: string, onBack: () => void, onEditTopicName?: () => void, setHistoryPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, mainPosition: {x: number, y: number} }) => {
    const { pistons, setPistons } = useAuth();
    const [editingEntry, setEditingEntry] = useState<{ piston: PistonType; entryId: string; } | null>(null);
    const [newEntryPiston, setNewEntryPiston] = useState<PistonType | null>(null);
    const [editText, setEditText] = useState('');
    
    const topicPistons = pistons[topicId] || {};
    const simpleTopicName = topicName.startsWith('Health: ') ? pistons.health?.activity : topicName;

    const pistonPlaceholders: Record<PistonType, string> = {
        'Desire': `What is your desire for ${simpleTopicName}?`,
        'Curiosity': `What makes you curious about ${simpleTopicName}?`,
        'Truth-Seeking': `What core truth are you seeking with ${simpleTopicName}?`,
        'Contribution': `How will ${simpleTopicName} contribute to others?`,
        'Growth': `How will ${simpleTopicName} help you grow?`,
        'Expression': `How does ${simpleTopicName} allow you to express yourself?`,
        'Pleasure': `What is the inherent joy or pleasure in ${simpleTopicName}?`,
        'Protection': `What does pursuing ${simpleTopicName} protect you from?`
    };

    const handleSaveEdit = () => {
        if (!editingEntry || !editText.trim()) {
            setEditingEntry(null);
            setEditText('');
            return;
        }
        
        setPistons(prev => {
            const topicData = prev[topicId] || {};
            const entries = topicData[editingEntry.piston] || [];
            const updatedEntries = entries.map(entry =>
                entry.id === editingEntry.entryId ? { ...entry, text: editText, timestamp: Date.now() } : entry
            );
            return {
                ...prev,
                [topicId]: {
                    ...topicData,
                    [editingEntry.piston]: updatedEntries,
                }
            };
        });

        setEditingEntry(null);
        setEditText('');
    };

    const handleSaveNewEntry = () => {
        if (!newEntryPiston || !editText.trim()) {
            setNewEntryPiston(null);
            setEditText('');
            return;
        }

        const newEntry: PistonEntry = {
            id: `piston_${Date.now()}`,
            text: editText.trim(),
            timestamp: Date.now()
        };

        setPistons(prev => {
            const topicData = prev[topicId] || {};
            const entries = topicData[newEntryPiston] || [];
            return {
                ...prev,
                [topicId]: {
                    ...topicData,
                    [newEntryPiston]: [newEntry, ...entries],
                }
            };
        });
        
        setNewEntryPiston(null);
        setEditText('');
    };
    
    const handleOpenHistory = (e: React.MouseEvent, piston: PistonType) => {
        e.stopPropagation();
        setHistoryPopup({
            piston,
            x: mainPosition.x + 384 + 20, // 384 is card width, 20 is offset
            y: mainPosition.y,
        });
    };

    return (
        <CardContent className="p-4">
            <ul className="space-y-2">
                {PISTON_NAMES.map(piston => {
                    const entries = topicPistons[piston] || [];
                    const currentEntry = entries[0];
                    const isEditingThisPiston = editingEntry?.piston === piston;
                    const isAddingNewToThisPiston = newEntryPiston === piston;
                    
                    return (
                        <li key={piston} className="p-2 rounded-lg bg-muted/30">
                            <div className="flex items-start gap-3">
                                <span className="mt-1">{PISTON_ICONS[piston]}</span>
                                <div className="flex-grow">
                                    <h4 className="font-semibold text-sm">{piston}</h4>
                                    
                                    {/* Displaying Current Entry or Edit Form for it */}
                                    {currentEntry && isEditingThisPiston && editingEntry?.entryId === currentEntry.id ? (
                                         <div className="mt-1">
                                            <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="bg-background text-sm min-h-[4rem] border-primary" autoFocus rows={2} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSaveEdit())}/>
                                            <div className="flex justify-end gap-2 mt-2">
                                                <Button size="sm" variant="ghost" onClick={() => setEditingEntry(null)}>Cancel</Button>
                                                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground min-h-[2.5rem] pt-1.5 w-full flex justify-between items-start">
                                            <div className="flex-grow cursor-text" onClick={() => { setEditingEntry({piston, entryId: currentEntry?.id || ''}); setEditText(currentEntry?.text || '')}}>
                                                {currentEntry?.text ? (
                                                    <p className="whitespace-pre-wrap">{currentEntry.text}</p>
                                                ) : (
                                                    <p className="italic opacity-70">{pistonPlaceholders[piston]}</p>
                                                )}
                                            </div>
                                            <div className="flex-shrink-0">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNewEntryPiston(piston)}>
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                                {entries.length > 0 && (
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleOpenHistory(e, piston)}>
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Displaying "Add New" form */}
                                    {isAddingNewToThisPiston && (
                                        <div className="mt-2 pt-2 border-t">
                                             <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} placeholder={`Add a new entry for ${piston}...`} className="bg-background text-sm min-h-[4rem]" autoFocus rows={2} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSaveNewEntry())}/>
                                            <div className="flex justify-end gap-2 mt-2">
                                                <Button size="sm" variant="ghost" onClick={() => setNewEntryPiston(null)}>Cancel</Button>
                                                <Button size="sm" onClick={handleSaveNewEntry}>Add</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </CardContent>
    );
};
