
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Brain, BrainCircuit, Heart, Briefcase, TrendingUp, ChevronLeft, Target, HandHeart, Search, Sprout, Blocks, Mic, Smile, Shield, Edit, X, History, Plus, Save, Link as LinkIcon, Library, MessageSquare, Code, ArrowRight, Upload, MoreVertical, GripVertical, PlusCircle, Trash2, Play, Pause, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { PistonEntry, PistonType, PistonsData, Resource, ResourcePoint, ExerciseDefinition, MindsetCard } from '@/types/workout';
import { DndContext, useDraggable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';


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

const PISTON_PLACEHOLDERS: Record<PistonType, string> = {
    'Desire': 'What is the ultimate outcome I want from [topic]?',
    'Curiosity': 'What am I curious about regarding [topic]?',
    'Truth-Seeking': 'What is the core truth I need to accept about [topic]?',
    'Contribution': 'How will [topic] help others? Who am I serving?',
    'Growth': 'How will working on [topic] make me better?',
    'Expression': 'What do I want to create or say about [topic]?',
    'Pleasure': 'What will I enjoy about the process of working on [topic]?',
    'Protection': 'What risks am I mitigating by focusing on [topic]?',
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
                 <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 flex-grow">
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

const ResourcePopupCard = ({ popupState, resource, onClose, onUpdate, playingAudio, setPlayingAudio }: { 
    popupState: ResourcePopupState; 
    resource: Resource; 
    onClose: (resourceId: string) => void;
    onUpdate: (updatedResource: Resource) => void;
    playingAudio: { id: string; isPlaying: boolean } | null;
    setPlayingAudio: React.Dispatch<React.SetStateAction<{ id: string; isPlaying: boolean } | null>>;
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
    
    const togglePlayAudio = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        setPlayingAudio(prev => {
            if (prev?.id === resource.id && prev.isPlaying) {
                return { ...prev, isPlaying: false };
            }
            return { id: resource.id, isPlaying: true };
        });
    };

    const handleTitleChange = (newTitle: string) => {
        onUpdate({ ...resource, name: newTitle });
    };

    const handleAddPoint = (type: ResourcePoint['type']) => {
        const newPoint: ResourcePoint = { id: `point_${Date.now()}`, text: 'New step...', type };
        const updatedPoints = [...(resource.points || []), newPoint];
        onUpdate({ ...resource, points: updatedPoints });
    };

    const handleUpdatePoint = (pointId: string, newText: string) => {
        const updatedPoints = (resource.points || []).map(p =>
            p.id === pointId ? { ...p, text: newText } : p
        );
        onUpdate({ ...resource, points: updatedPoints });
    };

    const handleDeletePoint = (pointId: string) => {
        const updatedPoints = (resource.points || []).filter(p => p.id !== pointId);
        onUpdate({ ...resource, points: updatedPoints });
    };
    
    const handleClose = (e: React.MouseEvent | React.PointerEvent) => {
        e.stopPropagation();
        setPlayingAudio(null);
        onClose(resource.id);
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="z-[70]">
            <input type="file" ref={audioInputRef} onChange={handleAudioUpload} accept="audio/*" className="hidden" />
            <Card className="shadow-2xl border-2 border-primary/30 bg-card max-h-[70vh] flex flex-col relative">
                <div 
                    className="absolute top-0 left-0 h-10 w-full cursor-grab active:cursor-grabbing z-10" 
                    onPointerDownCapture={listeners.onPointerDown}
                    onTouchStartCapture={listeners.onTouchStart}
                />
                
                 <div className="absolute top-2 right-2 z-20 flex items-center">
                    {resource.audioUrl ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDownCapture={togglePlayAudio}>
                            {playingAudio?.id === resource.id && playingAudio.isPlaying ? <Pause className="h-4 w-4 text-green-500" /> : <Play className="h-4 w-4 text-green-500" />}
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => audioInputRef.current?.click()}>
                            <Upload className="h-4 w-4"/>
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDownCapture={handleClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <CardHeader className="p-3 pt-8 relative flex-shrink-0 text-center">
                    <div className="flex items-center justify-center gap-2">
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
                </CardHeader>
                <div className="flex-grow min-h-0 overflow-y-auto">
                    <CardContent className="p-3 pt-0">
                        <ul className="space-y-3 text-sm text-muted-foreground pr-2">
                            {(resource.points || []).map(point => (
                                <EditableResourcePoint 
                                    key={point.id}
                                    point={point}
                                    onUpdate={(newText) => handleUpdatePoint(point.id, newText)}
                                    onDelete={() => handleDeletePoint(point.id)}
                                />
                            ))}
                        </ul>
                    </CardContent>
                </div>
                 <CardFooter className="p-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Step
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1">
                           <div className="space-y-1">
                                <Button variant="ghost" className="w-full justify-start" onClick={() => handleAddPoint('text')}><MessageSquare className="mr-2 h-4 w-4" />Text</Button>
                                <Button variant="ghost" className="w-full justify-start" onClick={() => handleAddPoint('markdown')}><MessageSquare className="mr-2 h-4 w-4" />Markdown</Button>
                                <Button variant="ghost" className="w-full justify-start" onClick={() => handleAddPoint('code')}><Code className="mr-2 h-4 w-4" />Code</Button>
                           </div>
                        </PopoverContent>
                    </Popover>
                 </CardFooter>
            </Card>
        </div>
    );
};

const EditableResourcePoint = ({ point, onUpdate, onDelete }: { point: ResourcePoint, onUpdate: (text: string) => void, onDelete: () => void }) => {
    const [isEditing, setIsEditing] = useState(point.text === 'New step...');
    const [editText, setEditText] = useState(point.text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSave = () => {
        if (editText.trim() === '') {
            onDelete();
        } else {
             onUpdate(editText);
        }
        setIsEditing(false);
    };

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [isEditing]);
    
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditText(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    }

    return (
        <li className="flex items-start gap-3 group/item">
            {point.type === 'code' ? <Code className="h-4 w-4 mt-1.5 text-primary/70 flex-shrink-0" /> :
            point.type === 'markdown' ? <MessageSquare className="h-4 w-4 mt-1.5 text-primary/70 flex-shrink-0" /> :
            <ArrowRight className="h-4 w-4 mt-1.5 text-primary/50 flex-shrink-0" />
            }
             <div className="flex-grow min-w-0" onDoubleClick={() => !isEditing && setIsEditing(true)}>
                {isEditing ? (
                    <Textarea 
                        ref={textareaRef} 
                        value={editText} 
                        onChange={handleTextareaChange} 
                        onBlur={handleSave} 
                        className="text-sm" 
                        rows={1}
                    />
                ) : point.type === 'markdown' ? (
                    <div className="w-full prose dark:prose-invert prose-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{point.text}</ReactMarkdown></div>
                ) : point.type === 'code' ? (
                    <pre className="w-full bg-muted/50 p-2 rounded-md text-xs font-mono text-foreground whitespace-pre-wrap break-words">{point.text}</pre>
                ) : (
                    <p className="whitespace-pre-wrap break-words">{point.text}</p>
                )}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover/item:opacity-100 flex-shrink-0" onClick={onDelete}>
                <Trash2 className="h-3 w-3"/>
            </Button>
        </li>
    );
}

export function PistonsHead() {
  const { 
    isPistonsHeadOpen, setIsPistonsHeadOpen, 
    pistons, setPistons, 
    resources, setResources, 
    deepWorkDefinitions, setDeepWorkDefinitions, 
    mindsetCards, addMindsetCard, 
    deleteDesire, deleteMindsetCard 
  } = useAuth();
  const [currentView, setCurrentView] = useState<'main' | 'health' | 'wealth' | 'growth' | 'desires' | 'mindset'>('main');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [historyPopup, setHistoryPopup] = useState<HistoryPopupState | null>(null);
  const [resourcePopup, setResourcePopup] = useState<ResourcePopupState | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ id: string; isPlaying: boolean } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (playingAudio?.isPlaying) {
      const resourceToPlay = resources.find(r => r.id === playingAudio.id);
      if (resourceToPlay?.audioUrl) {
        if (audioEl.src !== resourceToPlay.audioUrl) {
          audioEl.src = resourceToPlay.audioUrl;
        }
        audioEl.play().catch(e => console.error("Audio play failed:", e));
      }
    } else {
      audioEl.pause();
    }
  }, [playingAudio, resources]);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'pistons-popup',
  });
  
  const handleCloseHistory = () => setHistoryPopup(null);
  const handleCloseResource = (resourceId: string) => {
    if (resourcePopup?.resourceId === resourceId) {
        setPlayingAudio(null);
        setResourcePopup(null);
    }
  };
  
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
        setHistoryPopup(prev => {
            if (!prev) return null;
            const historyPopupWidth = 320;
            const newX = prev.x + delta.x;
            const newY = prev.y + delta.y;
            return { ...prev, x: Math.min(Math.max(20, newX), window.innerWidth - historyPopupWidth - 20), y: Math.max(20, newY) };
        });
    } else if (id.startsWith('resource-popup-')) {
        setResourcePopup(prev => {
            if (!prev) return null;
            const popupWidth = 512;
            const newX = prev.x + delta.x;
            const newY = prev.y + delta.y;
            return { ...prev, x: Math.min(Math.max(20, newX), window.innerWidth - popupWidth - 20), y: Math.max(20, newY) };
        });
    }
  };
  
  const handleClose = () => {
    setIsPistonsHeadOpen(false);
    setHistoryPopup(null);
    setPlayingAudio(null);
    setResourcePopup(null);
    setTimeout(() => {
        setCurrentView('main');
        setSelectedTopicId(null);
    }, 300);
  };
  
  const handleViewChange = (newView: 'main' | 'health' | 'wealth' | 'growth' | 'desires' | 'mindset') => {
    setCurrentView(newView);
  };
  
  const handleTopicSelect = (topicId: string, type: 'wealth' | 'growth' | 'desires' | 'mindset') => {
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
  
  const getTopicName = (view: 'main' | 'health' | 'wealth' | 'growth' | 'desires' | 'mindset') => {
    if (selectedTopicId) {
        if (view === 'mindset') {
            const card = mindsetCards.find(c => c.id === selectedTopicId);
            return card?.title || 'Selected Mindset';
        }
        const def = deepWorkDefinitions.find(d => d.id === selectedTopicId);
        return def?.name || "Selected Topic";
    }
    switch (view) {
      case 'health': return `Health: ${pistons.health?.activity || 'Activity'}`;
      case 'wealth': return `Select Wealth Topic`;
      case 'growth': return `Select Growth Topic`;
      case 'desires': return `Select a Desire`;
      case 'mindset': return `Select a Mindset`;
      default: return 'Pistons of Intention';
    }
  };
  const topicName = getTopicName(currentView);

  const handleOpenHistory = (e: React.MouseEvent, piston: PistonType) => {
    e.stopPropagation();
    if (historyPopup?.piston === piston) {
      setHistoryPopup(null);
      return;
    }
    
    const popupWidth = 320;
    let x;
  
    if (resourcePopup) {
        x = position.x < window.innerWidth / 2 ? resourcePopup.x + 512 + 20 : resourcePopup.x - popupWidth - 20;
    } else {
        x = position.x + 384 + 20;
    }

    if (x < 20) x = position.x + 384 + 20;
    if (x + popupWidth > window.innerWidth) x = position.x - popupWidth - 20;
  
    setHistoryPopup({ piston, x, y: Math.max(20, position.y) });
  };
  
  const handleOpenResource = (e: React.MouseEvent, resourceId: string) => {
    e.stopPropagation();
    const popupWidth = 512;
    let x;
  
    if (historyPopup) {
      x = position.x < window.innerWidth / 2 ? historyPopup.x + 320 + 20 : historyPopup.x - popupWidth - 20;
    } else {
      x = position.x + 384 + 20;
    }
  
    if (x < 20) x = position.x + 384 + 20;
    if (x + popupWidth > window.innerWidth) x = position.x - popupWidth - 20;
  
    setResourcePopup({ resourceId, x, y: Math.max(20, position.y) });
  };


  const [linkingResourceFor, setLinkingResourceFor] = useState<{piston: PistonType; entryId: string; currentResourceId?: string;} | null>(null);

  const handleLinkResource = (resourceId: string | null) => {
    if (!linkingResourceFor) return;
    const { piston, entryId } = linkingResourceFor;
    setPistons(prev => {
        const topicKey = selectedTopicId || (currentView === 'health' ? 'health' : '');
        if (!topicKey) return prev;
        const topicData = { ...(prev[topicKey] || {}) };
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
        return { ...prev, [topicKey]: { ...topicData, [piston]: updatedEntries } };
    });
    setLinkingResourceFor(null);
  };


  const renderContent = () => {
    const commonProps = { 
        onBack: onBack, 
        setHistoryPopup: setHistoryPopup,
        setResourcePopup: setResourcePopup,
        onLinkResource: setLinkingResourceFor,
        handleOpenResource,
        handleOpenHistory,
    };
    switch (currentView) {
      case 'health':
        return <HealthPistonView {...commonProps} />;
      case 'wealth':
        return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} {...commonProps} /> : <TopicSelector onSelect={handleTopicSelect} type="wealth" onBack={onBack} />;
      case 'growth':
         return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} {...commonProps} /> : <TopicSelector onSelect={handleTopicSelect} type="growth" onBack={onBack} />;
      case 'desires':
         return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} {...commonProps} /> : <DesireSelector onSelect={handleTopicSelect} onBack={onBack} />;
      case 'mindset':
         return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} {...commonProps} /> : <MindsetSelector onSelect={handleTopicSelect} onBack={onBack} />;
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
                <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />
                <div
                    ref={setNodeRef}
                    style={style}
                    className="z-[60]"
                >
                    <Card className="w-96 shadow-2xl border-2 border-primary/50 bg-card relative flex flex-col max-h-[90vh]">
                        <CardHeader 
                            className="p-3 text-center flex-shrink-0"
                        >
                            {currentView !== 'main' && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 absolute top-1.5 left-1.5 z-20" onClick={(e) => { e.stopPropagation(); onBack(); }}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="w-full text-center cursor-grab active:cursor-grabbing flex justify-center" {...attributes} {...listeners}>
                                <CardTitle className="text-base truncate px-8" title={topicName as string}>
                                    {topicName}
                                </CardTitle>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 absolute top-1.5 right-1.5 z-20" onClick={handleClose}>
                                <X className="h-4 w-4" />
                            </Button>
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
                            handleCloseHistory();
                        }}
                    />
                )}
                 {resourcePopup && resources.find(r => r.id === resourcePopup.resourceId) && (
                    <ResourcePopupCard 
                        popupState={resourcePopup}
                        resource={resources.find(r => r.id === resourcePopup.resourceId)!}
                        onClose={() => handleCloseResource(resourcePopup.resourceId)}
                        onUpdate={handleUpdateResource}
                        playingAudio={playingAudio}
                        setPlayingAudio={setPlayingAudio}
                    />
                )}
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
        )}
    </DndContext>
  );
}

const MainPistonView = ({ onSelect }: { onSelect: (view: 'health' | 'wealth' | 'growth' | 'desires' | 'mindset') => void }) => (
    <CardContent className="p-4">
        <p className="text-muted-foreground text-center mb-4 text-sm">Select a category to define your core motivations.</p>
        <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => onSelect('health')} variant="outline" className="flex-col h-20"><Heart className="h-6 w-6 text-red-500 mb-1"/>Health</Button>
            <Button onClick={() => onSelect('wealth')} variant="outline" className="flex-col h-20"><Briefcase className="h-6 w-6 text-green-500 mb-1"/>Wealth</Button>
            <Button onClick={() => onSelect('growth')} variant="outline" className="flex-col h-20"><TrendingUp className="h-6 w-6 text-blue-500 mb-1"/>Growth</Button>
            <Button onClick={() => onSelect('desires')} variant="outline" className="flex-col h-20"><Target className="h-6 w-6 text-purple-500 mb-1"/>Desires</Button>
            <Button onClick={() => onSelect('mindset')} variant="outline" className="flex-col h-20 col-span-2"><Brain className="h-6 w-6 text-primary mb-1"/>Mindset</Button>
        </div>
    </CardContent>
);


const HealthPistonView = ({ onBack, setHistoryPopup, setResourcePopup, onLinkResource, handleOpenResource, handleOpenHistory }: { onBack: () => void, setHistoryPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, setResourcePopup: React.Dispatch<React.SetStateAction<ResourcePopupState | null>>, onLinkResource: (data: { piston: PistonType; entryId: string; currentResourceId?: string | undefined; }) => void; handleOpenResource: (e: React.MouseEvent, resourceId: string) => void; handleOpenHistory: (e: React.MouseEvent, piston: PistonType) => void; }) => {
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

    return <PistonEditorView topicId="health" topicName={`Health: ${activity}`} onBack={onBack} onEditTopicName={() => setIsEditingActivity(true)} setHistoryPopup={setHistoryPopup} setResourcePopup={setResourcePopup} onLinkResource={onLinkResource} handleOpenResource={handleOpenResource} handleOpenHistory={handleOpenHistory} />;
};

const DesireSelector = ({ onSelect, onBack }: { onSelect: (topicId: string, type: 'desires') => void, onBack: () => void }) => {
    const { deepWorkDefinitions, setDeepWorkDefinitions, deleteDesire } = useAuth();
    const [newDesireName, setNewDesireName] = useState('');
    
    const desires = deepWorkDefinitions.filter(def => def.category === 'Desire');

    const handleAddDesire = () => {
        if (!newDesireName.trim()) return;
        const newDesire: ExerciseDefinition = {
            id: `desire_${Date.now()}`,
            name: newDesireName.trim(),
            category: 'Desire'
        };
        setDeepWorkDefinitions(prev => [...prev, newDesire]);
        setNewDesireName('');
    };

    return (
        <CardContent className="p-4">
            <div className="flex gap-2 mb-4">
                <Input value={newDesireName} onChange={e => setNewDesireName(e.target.value)} placeholder="Add a new desire..."/>
                <Button onClick={handleAddDesire}><Plus/></Button>
            </div>
            <ScrollArea className="h-60">
                <ul className="space-y-2 pr-2">
                    {desires.map(desire => (
                        <li key={desire.id} className="flex items-center justify-between group p-2 rounded-md border bg-muted/20">
                            <button onClick={() => onSelect(desire.id, 'desires')} className="flex items-center justify-between w-full text-left group">
                                <span className="font-medium group-hover:text-primary transition-colors">{desire.name}</span>
                                <ChevronRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"/>
                            </button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the desire "{desire.name}".</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteDesire(desire.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </li>
                    ))}
                </ul>
            </ScrollArea>
        </CardContent>
    );
};

const MindsetSelector = ({ onSelect, onBack }: { onSelect: (topicId: string, type: 'mindset') => void, onBack: () => void }) => {
    const { mindsetCards, addMindsetCard, deleteMindsetCard } = useAuth();
    const [newMindsetName, setNewMindsetName] = useState('');
    
    const handleAddMindset = () => {
        if (!newMindsetName.trim()) return;
        addMindsetCard(newMindsetName.trim());
        setNewMindsetName('');
    };

    return (
        <CardContent className="p-4">
            <div className="flex gap-2 mb-4">
                <Input value={newMindsetName} onChange={e => setNewMindsetName(e.target.value)} placeholder="Add a new mindset..."/>
                <Button onClick={handleAddMindset}><Plus/></Button>
            </div>
            <ScrollArea className="h-60">
                <ul className="space-y-2 pr-2">
                    {mindsetCards.map(card => (
                        <li key={card.id} className="flex items-center justify-between group p-2 rounded-md border bg-muted/20">
                             <button onClick={() => onSelect(card.id, 'mindset')} className="flex items-center justify-between w-full text-left group">
                                <span className="font-medium group-hover:text-primary transition-colors">{card.title}</span>
                                <ChevronRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"/>
                            </button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the mindset "{card.title}".</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMindsetCard(card.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </li>
                    ))}
                </ul>
            </ScrollArea>
        </CardContent>
    );
};


const TopicSelector = ({ onSelect, type, onBack }: { onSelect: (topicId: string, type: 'wealth' | 'growth') => void, type: 'wealth' | 'growth', onBack: () => void }) => {
    const { deepWorkDefinitions, upskillDefinitions } = useAuth();
    const source = type === 'wealth' ? deepWorkDefinitions : upskillDefinitions;
    const topics = [...new Set(source.filter(def => def.category !== 'Desire').map(def => def.category))];

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

const PistonEditorView = ({ topicId, topicName, onBack, onEditTopicName, setHistoryPopup, setResourcePopup, onLinkResource, handleOpenResource, handleOpenHistory }: { topicId: string, topicName: string, onBack: () => void, onEditTopicName?: () => void, setHistoryPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, setResourcePopup: React.Dispatch<React.SetStateAction<ResourcePopupState | null>>, onLinkResource: (data: { piston: PistonType; entryId: string; currentResourceId?: string | undefined; }) => void; handleOpenResource: (e: React.MouseEvent, resourceId: string) => void; handleOpenHistory: (e: React.MouseEvent, piston: PistonType) => void; }) => {
    const { pistons, setPistons } = useAuth();
    const [newEntryPiston, setNewEntryPiston] = useState<PistonType | null>(null);
    const [newEntryText, setNewEntryText] = useState('');
    
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editedEntryText, setEditedEntryText] = useState('');

    const topicPistons = pistons[topicId] || {};
    
    const handleStartEditing = (entry: PistonEntry) => {
        setEditingEntryId(entry.id);
        setEditedEntryText(entry.text);
    };

    const handleSaveEdit = (piston: PistonType) => {
        if (!editingEntryId) return;

        setPistons(prev => {
            const topicData = { ...(prev[topicId] || {}) };
            const entries = topicData[piston] || [];
            const updatedEntries = entries.map(e =>
                e.id === editingEntryId ? { ...e, text: editedEntryText } : e
            );
            return { ...prev, [topicId]: { ...topicData, [piston]: updatedEntries } };
        });
        setEditingEntryId(null);
    };


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
    
    const handleDeleteEntry = (piston: PistonType, entryId: string) => {
        setPistons(prev => {
            const topicData = { ...(prev[topicId] || {}) };
            const entries = topicData[piston] || [];
            const updatedEntries = entries.filter(entry => entry.id !== entryId);
            return { ...prev, [topicId]: { ...topicData, [piston]: updatedEntries } };
        });
    };
    
    const getPlaceholderText = (piston: PistonType) => {
        const defaultPlaceholder = PISTON_PLACEHOLDERS[piston];
        return defaultPlaceholder.replace('[topic]', `"${topicName}"`);
    };
    
    return (
        <CardContent className="p-4 flex-grow min-h-0 overflow-y-auto">
            <ul className="space-y-2">
                {PISTON_NAMES.map(piston => {
                    const entries = topicPistons[piston] || [];
                    const currentEntry = entries[0];
                    const isAddingNewToThisPiston = newEntryPiston === piston;
                    const isResourceLinked = !!currentEntry?.linkedResourceId;
                    
                    return (
                        <li key={piston} className="p-2 rounded-lg bg-muted/30">
                            <div className="flex items-start gap-3">
                                <span className="mt-1">{PISTON_ICONS[piston]}</span>
                                <div className="flex-grow min-w-0">
                                    <h4 className="font-semibold text-sm">{piston}</h4>
                                    <div className="text-sm text-muted-foreground min-h-[2.5rem] pt-1.5 w-full flex justify-between items-start group">
                                        {editingEntryId === currentEntry?.id ? (
                                            <Textarea 
                                                value={editedEntryText} 
                                                onChange={e => setEditedEntryText(e.target.value)}
                                                onBlur={() => handleSaveEdit(piston)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(piston); }
                                                    if (e.key === 'Escape') { setEditingEntryId(null); }
                                                }}
                                                className="text-sm bg-background"
                                                autoFocus
                                            />
                                        ) : (
                                            <p className="whitespace-pre-wrap flex-grow pr-2 break-words" onDoubleClick={() => currentEntry && handleStartEditing(currentEntry)}>
                                                {currentEntry?.text || <span className="italic opacity-70">{getPlaceholderText(piston)}</span>}
                                            </p>
                                        )}
                                        <div className="flex-shrink-0 flex items-center">
                                            {isResourceLinked ? (
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDownCapture={(e) => handleOpenResource(e, currentEntry.linkedResourceId!)}>
                                                    <Library className="h-4 w-4 text-primary" />
                                                </Button>
                                            ) : currentEntry ? (
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onPointerDownCapture={() => onLinkResource({piston, entryId: currentEntry.id, currentResourceId: currentEntry.linkedResourceId})}>
                                                    <LinkIcon className="h-4 w-4" />
                                                </Button>
                                            ) : <div className="w-6 h-6"/> }
                                                <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                <DropdownMenuPortal>
                                                    <DropdownMenuContent side="right" align="start" sideOffset={5}>
                                                        <DropdownMenuItem onSelect={() => setNewEntryPiston(piston)}><Plus className="mr-2 h-4 w-4"/>New Entry</DropdownMenuItem>
                                                        {entries.length > 0 && <DropdownMenuItem onSelect={(e) => handleOpenHistory(e, piston)}><History className="mr-2 h-4 w-4"/>View History</DropdownMenuItem>}
                                                        {currentEntry && (
                                                            <DropdownMenuItem onSelect={() => onLinkResource({ piston, entryId: currentEntry.id, currentResourceId: currentEntry.linkedResourceId })}>
                                                                <LinkIcon className="mr-2 h-4 w-4"/> {isResourceLinked ? 'Change Resource' : 'Link Resource'}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {currentEntry && <DropdownMenuItem onSelect={() => handleDeleteEntry(piston, currentEntry.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Current</DropdownMenuItem>}
                                                    </DropdownMenuContent>
                                                </DropdownMenuPortal>
                                            </DropdownMenu>
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
        </CardContent>
    );
};

const TopicPistonView = ({ topicId, onBack, setHistoryPopup, setResourcePopup, onLinkResource, handleOpenResource, handleOpenHistory }: { topicId: string, onBack: () => void, setHistoryPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, setResourcePopup: React.Dispatch<React.SetStateAction<ResourcePopupState | null>>, onLinkResource: (data: { piston: PistonType; entryId: string; currentResourceId?: string | undefined; }) => void; handleOpenResource: (e: React.MouseEvent, resourceId: string) => void; handleOpenHistory: (e: React.MouseEvent, piston: PistonType) => void; }) => {
    const { deepWorkDefinitions, mindsetCards } = useAuth();
    const topicDef = deepWorkDefinitions.find(d => d.id === topicId);
    const mindsetDef = mindsetCards.find(c => c.id === topicId);
    const topicName = topicDef?.name || mindsetDef?.title || topicId;

    return <PistonEditorView topicId={topicId} topicName={topicName} onBack={onBack} setHistoryPopup={setHistoryPopup} setResourcePopup={setResourcePopup} onLinkResource={onLinkResource} handleOpenResource={handleOpenResource} handleOpenHistory={handleOpenHistory} />;
};

    