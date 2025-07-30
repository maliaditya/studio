
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Heart, Briefcase, TrendingUp, ChevronLeft, Target, HandHeart, Search, Sprout, Blocks, Mic, Smile, Shield, Edit, X, History, Plus, Save, Link as LinkIcon, Library, MessageSquare, Code, ArrowRight, Upload, MoreVertical } from 'lucide-react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { PistonEntry, PistonType, PistonsData, Resource } from '@/types/workout';
import { DndContext, useDraggable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


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
                 <CardHeader className="p-3 relative">
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
                             {entries.slice().reverse().map(entry => (
                                <li key={entry.id} className="border-l-2 pl-3 group relative">
                                    <p className="text-sm whitespace-pre-wrap">{entry.text}</p>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(entry.timestamp), 'PPP p')}</p>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 absolute top-0 right-0"
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

interface ResourcePopupState {
  resourceId: string;
  x: number;
  y: number;
}

const ResourcePopupCard = ({ popupState, resource, onClose, onUpdate }: { 
    popupState: ResourcePopupState; 
    resource: Resource; 
    onClose: () => void;
    onUpdate: (updatedResource: Resource) => void;
}) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `resource-popup-${popupState.resourceId}`,
    });
    
    const [editingTitle, setEditingTitle] = useState(false);
    const audioInputRef = useRef<HTMLInputElement>(null);

    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        width: '512px',
        willChange: 'transform',
    };

    if (transform) {
        style.transform = `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    }
    
    const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const audioUrl = e.target?.result as string;
                onUpdate({ ...resource, audioUrl });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleTitleChange = (newTitle: string) => {
        onUpdate({ ...resource, name: newTitle });
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="z-[70]">
             <input type="file" ref={audioInputRef} onChange={handleAudioUpload} accept="audio/*" className="hidden" />
            <Card className="shadow-2xl border-2 border-primary/30 bg-card max-h-[70vh] flex flex-col">
                <CardHeader className="p-3 relative cursor-grab flex-shrink-0" {...listeners}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 flex-grow min-w-0">
                            <Library className="h-4 w-4" />
                            {editingTitle ? (
                                <Input 
                                    value={resource.name} 
                                    onChange={(e) => handleTitleChange(e.target.value)} 
                                    onBlur={() => setEditingTitle(false)} 
                                    onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                                    className="h-8 text-base"
                                    autoFocus
                                />
                            ) : (
                                <CardTitle className="text-base truncate cursor-pointer" onClick={() => setEditingTitle(true)}>
                                    {resource.name}
                                </CardTitle>
                            )}
                        </div>
                        <div>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={(e) => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => setEditingTitle(true)}><Edit className="mr-2 h-4 w-4" />Edit Title</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => audioInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Upload Audio</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <div className="flex-grow min-h-0 overflow-y-auto">
                    <CardContent className="p-3 pt-0">
                        <ul className="space-y-2 text-sm text-muted-foreground pr-2">
                            {(resource.points || []).map(point => (
                                <li key={point.id} className="flex items-start gap-2">
                                    {point.type === 'code' ? <Code className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> :
                                    point.type === 'markdown' ? <MessageSquare className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" /> :
                                    <ArrowRight className="h-4 w-4 mt-0.5 text-primary/50 flex-shrink-0" />
                                    }
                                    {point.type === 'card' && point.resourceId ? (
                                       <span className="font-medium text-primary">{point.text}</span>
                                    ) : point.type === 'markdown' ? (
                                        <div className="w-full prose dark:prose-invert prose-sm">
                                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text || ""}</ReactMarkdown>
                                        </div>
                                    ) : point.type === 'code' ? (
                                         <pre className="w-full bg-muted/50 p-2 rounded-md text-xs font-mono text-foreground whitespace-pre-wrap break-words">{point.text}</pre>
                                    ) : (
                                        <span className="break-words w-full" title={point.text}>{point.text}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </div>
            </Card>
        </div>
    );
};


export function PistonsHead() {
  const { isPistonsHeadOpen, setIsPistonsHeadOpen, pistons, setPistons, resources, setResources } = useAuth();
  const [currentView, setCurrentView] = useState<'main' | 'health' | 'wealth' | 'growth'>('main');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [historyPopup, setHistoryPopup] = useState<HistoryPopupState | null>(null);
  const [resourcePopup, setResourcePopup] = useState<ResourcePopupState | null>(null);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'pistons-popup',
  });
  
  const handleCloseHistory = () => setHistoryPopup(null);
  const handleCloseResource = () => setResourcePopup(null);
  
  const handleUpdateResource = (updatedResource: Resource) => {
    setResources(prev =>
      prev.map(res => res.id === updatedResource.id ? updatedResource : res)
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const id = active.id as string;
    
    if (id === 'pistons-popup') {
        setPosition(prev => ({ x: prev.x + delta.x, y: prev.y + delta.y }));
    } else if (id.startsWith('history-popup-')) {
        setHistoryPopup(prev => prev ? { ...prev, x: prev.x + delta.x, y: prev.y + delta.y } : null);
    } else if (id.startsWith('resource-popup-')) {
        setResourcePopup(prev => prev ? { ...prev, x: prev.x + delta.x, y: prev.y + delta.y } : null);
    }
  };
  
  const handleClose = () => {
    setIsPistonsHeadOpen(false);
    setHistoryPopup(null);
    setResourcePopup(null);
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
  
  const [editingPistonEntry, setEditingPistonEntry] = useState<{ piston: PistonType; entry: PistonEntry; } | null>(null);

  const renderContent = () => {
    const commonProps = { 
        onBack: onBack, 
        mainPosition: position,
        setHistoryPopup: setHistoryPopup,
        setResourcePopup: setResourcePopup,
        onEditEntry: setEditingPistonEntry,
    };
    switch (currentView) {
      case 'health':
        return <HealthPistonView {...commonProps} />;
      case 'wealth':
        return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} {...commonProps} /> : <TopicSelector onSelect={handleTopicSelect} type="wealth" onBack={onBack} />;
      case 'growth':
         return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} {...commonProps} /> : <TopicSelector onSelect={handleTopicSelect} type="growth" onBack={onBack} />;
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
                            setEditingPistonEntry({ piston, entry });
                            handleCloseHistory();
                        }}
                    />
                )}
                 {resourcePopup && resources.find(r => r.id === resourcePopup.resourceId) && (
                    <ResourcePopupCard 
                        popupState={resourcePopup}
                        resource={resources.find(r => r.id === resourcePopup.resourceId)!}
                        onClose={handleCloseResource}
                        onUpdate={handleUpdateResource}
                    />
                )}
                {editingPistonEntry && (
                    <Dialog open={!!editingPistonEntry} onOpenChange={() => setEditingPistonEntry(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit {editingPistonEntry.piston} Entry</DialogTitle>
                            </DialogHeader>
                            <Textarea 
                                value={editingPistonEntry.entry.text} 
                                onChange={e => setEditingPistonEntry(prev => prev ? {...prev, entry: {...prev.entry, text: e.target.value}} : null)}
                                className="min-h-[120px] text-base"
                                autoFocus
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingPistonEntry(null)}>Cancel</Button>
                                <Button onClick={() => {
                                    setPistons(prev => {
                                        const topicKey = selectedTopicId || (currentView === 'health' ? 'health' : '');
                                        if (!topicKey) return prev;
                                        const topicData = { ...(prev[topicKey] || {}) };
                                        const entries = topicData[editingPistonEntry.piston] || [];
                                        const updatedEntries = entries.map(entry =>
                                            entry.id === editingPistonEntry.entry.id ? editingPistonEntry.entry : entry
                                        );
                                        return { ...prev, [topicKey]: { ...topicData, [editingPistonEntry.piston]: updatedEntries } };
                                    });
                                    setEditingPistonEntry(null);
                                }}>Save Changes</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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


const HealthPistonView = ({ onBack, setHistoryPopup, mainPosition, setResourcePopup, onEditEntry }: { onBack: () => void, setHistoryPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, mainPosition: {x: number, y: number}, setResourcePopup: React.Dispatch<React.SetStateAction<ResourcePopupState | null>>, onEditEntry: (data: { piston: PistonType; entry: PistonEntry; }) => void; }) => {
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

    return <PistonEditorView topicId="health" topicName={`Health: ${activity}`} onBack={onBack} onEditTopicName={() => setIsEditingActivity(true)} setHistoryPopup={setHistoryPopup} mainPosition={mainPosition} setResourcePopup={setResourcePopup} onEditEntry={onEditEntry} />;
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

const TopicPistonView = ({ topicId, onBack, setHistoryPopup, mainPosition, setResourcePopup, onEditEntry }: { topicId: string, onBack: () => void, setHistoryPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, mainPosition: {x: number, y: number}, setResourcePopup: React.Dispatch<React.SetStateAction<ResourcePopupState | null>>, onEditEntry: (data: { piston: PistonType; entry: PistonEntry; }) => void; }) => {
    const { pistons } = useAuth();
    const topicName = topicId === 'health' ? `Health: ${pistons.health?.activity || 'Activity'}` : topicId;
    return <PistonEditorView topicId={topicId} topicName={topicName} onBack={onBack} setHistoryPopup={setHistoryPopup} mainPosition={mainPosition} setResourcePopup={setResourcePopup} onEditEntry={onEditEntry} />;
};

const PistonEditorView = ({ topicId, topicName, onBack, onEditTopicName, setHistoryPopup, mainPosition, setResourcePopup, onEditEntry }: { topicId: string, topicName: string, onBack: () => void, onEditTopicName?: () => void, setHistoryPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, mainPosition: {x: number, y: number}, setResourcePopup: React.Dispatch<React.SetStateAction<ResourcePopupState | null>>, onEditEntry: (data: { piston: PistonType; entry: PistonEntry; }) => void; }) => {
    const { pistons, setPistons, resources } = useAuth();
    const [newEntryPiston, setNewEntryPiston] = useState<PistonType | null>(null);
    const [newEntryText, setNewEntryText] = useState('');
    const [linkingResourceFor, setLinkingResourceFor] = useState<{piston: PistonType; entryId: string; currentResourceId?: string;} | null>(null);
    
    const topicPistons = pistons[topicId] || {};
    const simpleTopicName = topicName.startsWith('Health: ') ? pistons.health?.activity : topicName;
    
    const handleSaveNewEntry = (piston: PistonType) => {
        if (!newEntryText.trim()) { setNewEntryPiston(null); setNewEntryText(''); return; }
        const newEntry: PistonEntry = { id: `piston_${Date.now()}`, text: newEntryText.trim(), timestamp: Date.now() };
        setPistons(prev => {
            const topicData = { ...(prev[topicId] || {}) };
            const entries = topicData[piston] || [];
            return { ...prev, [topicId]: { ...topicData, [piston]: [newEntry, ...entries] } };
        });
        setNewEntryPiston(null); setNewEntryText('');
    };

    const handleOpenHistory = (e: React.MouseEvent, piston: PistonType) => {
        e.stopPropagation();
        setHistoryPopup({ piston, x: mainPosition.x + 384 + 20, y: mainPosition.y });
    };

    const handleOpenResource = (e: React.MouseEvent, resourceId: string) => {
        e.stopPropagation();
        const popupX = Math.max(20, mainPosition.x - 512 - 20);
        setResourcePopup({ resourceId, x: popupX, y: mainPosition.y });
    };

    const handleLinkResource = (resourceId: string | null) => {
        if (!linkingResourceFor) return;
        const { piston, entryId } = linkingResourceFor;
        setPistons(prev => {
            const topicData = { ...(prev[topicId] || {}) };
            const entries = topicData[piston] || [];
            const updatedEntries = entries.map(entry => {
                if (entry.id === entryId) {
                    const newEntry = { ...entry };
                    if (resourceId === 'none' || resourceId === null) {
                        delete newEntry.linkedResourceId;
                    } else {
                        newEntry.linkedResourceId = resourceId;
                    }
                    return newEntry;
                }
                return entry;
            });
            return { ...prev, [topicId]: { ...topicData, [piston]: updatedEntries } };
        });
        setLinkingResourceFor(null);
    };

    return (
        <>
            <CardContent className="p-4 max-h-[70vh]">
                <ScrollArea className="h-full pr-2">
                    <ul className="space-y-2">
                        {PISTON_NAMES.map(piston => {
                            const entries = topicPistons[piston] || [];
                            const currentEntry = entries[0];
                            const isAddingNewToThisPiston = newEntryPiston === piston;
                            
                            return (
                                <li key={piston} className="p-2 rounded-lg bg-muted/30">
                                    <div className="flex items-start gap-3">
                                        <span className="mt-1">{PISTON_ICONS[piston]}</span>
                                        <div className="flex-grow">
                                            <h4 className="font-semibold text-sm">{piston}</h4>
                                            <div className="text-sm text-muted-foreground min-h-[2.5rem] pt-1.5 w-full flex justify-between items-start">
                                                <div className="flex-grow cursor-text pr-2" onClick={() => { if(currentEntry) { onEditEntry({piston, entry: currentEntry}); }}}>
                                                    {currentEntry?.text ? (<p className="whitespace-pre-wrap">{currentEntry.text}</p>) : (<p className="italic opacity-70">Define your {piston} for {simpleTopicName}</p>)}
                                                </div>
                                                <div className="flex-shrink-0 flex items-center">
                                                    {currentEntry && (
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLinkingResourceFor({piston, entryId: currentEntry.id, currentResourceId: currentEntry.linkedResourceId})}>
                                                            <LinkIcon className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {currentEntry?.linkedResourceId && (<Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleOpenResource(e, currentEntry.linkedResourceId!)}><Library className="h-4 w-4 text-primary" /></Button>)}
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNewEntryPiston(piston)}><Plus className="h-4 w-4" /></Button>
                                                    {entries.length > 0 && (<Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleOpenHistory(e, piston)}><History className="h-4 w-4" /></Button>)}
                                                </div>
                                            </div>
                                            {isAddingNewToThisPiston && (
                                                <div className="mt-2 pt-2 border-t">
                                                    <Textarea value={newEntryText} onChange={(e) => setNewEntryText(e.target.value)} placeholder={`Add a new entry for ${piston}...`} className="bg-background text-sm min-h-[4rem]" autoFocus rows={2} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSaveNewEntry(piston))}/>
                                                    <div className="flex justify-end gap-2 mt-2">
                                                        <Button size="sm" variant="ghost" onClick={() => {setNewEntryPiston(null); setNewEntryText('')}}>Cancel</Button>
                                                        <Button size="sm" onClick={() => handleSaveNewEntry(piston)}>Add</Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </ScrollArea>
            </CardContent>
            {linkingResourceFor && (
                <Dialog open={!!linkingResourceFor} onOpenChange={() => setLinkingResourceFor(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Link Resource to {linkingResourceFor.piston}</DialogTitle>
                            <DialogDescription>Select an existing resource card to connect to this intention.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Select
                                value={linkingResourceFor.currentResourceId || 'none'}
                                onValueChange={(val) => handleLinkResource(val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a resource card..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- None --</SelectItem>
                                    {resources.filter(r => r.type === 'card').map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};
