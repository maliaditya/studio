

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Brain, BrainCircuit, Heart, Briefcase, TrendingUp, ChevronLeft, Target, HandHeart, Search, Sprout, Blocks, Mic, Smile, Shield, Edit, X, History, Plus, Save, Link as LinkIcon, Library, MessageSquare, Code, ArrowRight, Upload, MoreVertical, GripVertical, PlusCircle, Trash2, Play, Pause, ChevronRight as ChevronRightIcon, Workflow, Folder, ArrowLeft, Anchor, Flame, Compass, Sun, GitBranch, Info, Calendar } from 'lucide-react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { PistonEntry, PistonType, PistonsData, Resource, ResourcePoint, ExerciseDefinition, MindsetCard, SkillDomain, CoreSkill, Project, Feature, Company, Position, WorkProject, ActivityType, DailySchedule } from '@/types/workout';
import { DndContext, useDraggable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';


const PISTON_ICONS: Record<PistonType, React.ReactNode> = {
    'Stabilizer': <Anchor className="h-5 w-5 text-purple-500" />,
    'Fire': <Flame className="h-5 w-5 text-red-500" />,
    'Explorer': <Compass className="h-5 w-5 text-sky-500" />,
    'Clarity': <Sun className="h-5 w-5 text-yellow-500" />,
    'Bridge': <GitBranch className="h-5 w-5 text-green-500" />,
};

const PISTON_PLACEHOLDERS: Record<PistonType, string> = {
    'Stabilizer': 'Grounds you in sufficiency. No grasping.',
    'Fire': 'Ignites action from soul, not ego.',
    'Explorer': 'Opens new paths without needing safety.',
    'Clarity': 'Cuts illusion; brings light to the shadows.',
    'Bridge': 'Connects self to others; dissolves division.',
};

const PISTON_NAMES: PistonType[] = [
  'Stabilizer', 'Fire', 'Explorer', 'Clarity', 'Bridge'
];

const PISTON_FULL_NAMES: Record<PistonType, string> = {
    'Stabilizer': 'Gratitude',
    'Fire': 'Inspiration',
    'Explorer': 'Curiosity',
    'Clarity': 'Truth-Seeking',
    'Bridge': 'Compassion',
};

const PISTON_DETAILS: Record<PistonType, {
    why: string;
    negates: string[];
    fuels: string[];
    virtues: string[];
    comparisons: { ego: string; virtue: string; }[];
    conclusion: string;
    biochemical: {
        linked: string;
        details: string[];
    }
}> = {
    'Stabilizer': {
        why: "When you're grateful, you already feel full.",
        negates: ["Desire", "Pleasure"],
        fuels: ["Contribution", "Love"],
        virtues: ["Forgiveness", "Contentment"],
        comparisons: [
            { ego: "“I need more.”", virtue: "“This is already enough.”" },
            { ego: "“Comfort will make me happy.”", virtue: "“Joy is already here, in this moment.”" }
        ],
        conclusion: "It dissolves craving and the illusion of lack. You stop chasing highs because you're grounded in contentment.",
        biochemical: {
            linked: "Serotonin + GABA",
            details: [
                "Gratitude boosts serotonin (peace, sufficiency).",
                "It also increases GABA, calming the nervous system.",
                "That’s why gratitude grounds you, removes grasping.",
                "Gratitude is a spiritual expression of biochemical balance."
            ]
        }
    },
    'Fire': {
        why: "You stop performing for attention and start creating from alignment. My father showed me what’s possible, not with words — but with action, pain, and persistence.",
        negates: ["Egoic Expression", "Status-based Desire"],
        fuels: ["Growth", "Contribution"],
        virtues: ["Contentment", "Innocence"],
        comparisons: [
            { ego: "“Look at me.”", virtue: "“Look at what’s flowing through me.”" },
            { ego: "“I want to be famous/successful.”", virtue: "“This creation is worthy — even if unseen.”" }
        ],
        conclusion: "It replaces external validation with internal ignition.",
        biochemical: {
            linked: "Dopamine + Acetylcholine + Testosterone",
            details: [
                "Inspiration sparks dopamine (energy/motivation),",
                "Acetylcholine helps focus on new ideas,",
                "Testosterone may rise slightly with bold vision.",
                "It’s like dopamine but not from ego — from the soul.",
                "That’s why you feel driven but pure."
            ]
        }
    },
    'Explorer': {
        why: "Certainty says: “Stay safe, stay sure.” Curiosity thrives in not knowing, allowing real learning and growth.",
        negates: ["Certainty-seeking", "Protection"],
        fuels: ["Growth", "Variety"],
        virtues: ["Innocence"],
        comparisons: [
            { ego: "“Don’t go there, it’s risky.”", virtue: "“Let’s see what’s behind this discomfort.”" },
            { ego: "Certainty says: “Stay safe, stay sure.”", virtue: "Curiosity thrives in not knowing, allowing real learning and growth." }
        ],
        conclusion: "You don’t need control — because you trust the process of discovery.",
        biochemical: {
            linked: "Dopamine + Acetylcholine",
            details: [
                "Curiosity = safe, controlled dopamine seeking.",
                "Acetylcholine helps in exploring and learning.",
                "It creates a “mental explorer mode” → playful energy without needing full safety.",
                "Curiosity is dopamine without addiction."
            ]
        }
    },
    'Clarity': {
        why: "You no longer need protection mechanisms (lies, manipulation, image control).",
        negates: ["Illusion", "Egoic Significance", "Fear-based Expression"],
        fuels: ["Growth", "Contribution", "Certainty"],
        virtues: ["Truth"],
        comparisons: [
            { ego: "“Let’s hide the uncomfortable.”", virtue: "“Let’s look at it.”" },
            { ego: "Expression (egoic) wants to impress.", virtue: "Truth wants to express what is, even if it's raw or humbling." }
        ],
        conclusion: "You don't need approval — you need clarity.",
        biochemical: {
            linked: "Cortisol suppression + High Acetylcholine",
            details: [
                "Seeking truth requires mental silence, not fear.",
                "Low cortisol enables openness.",
                "Acetylcholine supports pattern recognition and insight.",
                "When fear drops, you’re no longer blinded — you can see."
            ]
        }
    },
    'Bridge': {
        why: "It replaces the separation illusion with unity — removing the fuel of ego-driven engines.",
        negates: ["Competition", "Significance", "Cruelty"],
        fuels: ["Contribution", "Love"],
        virtues: ["Compassion"],
        comparisons: [
            { ego: "“I’m better than you.”", virtue: "“You and I are the same.”" },
            { ego: "“Win at all costs.”", virtue: "“Let’s grow together.”" },
            { ego: "“You deserve your pain.”", virtue: "“Your pain is mine too.”" }
        ],
        conclusion: "It replaces the separation illusion with unity — removing the fuel of ego-driven engines.",
        biochemical: {
            linked: "Oxytocin + Serotonin + GABA",
            details: [
                "Oxytocin = trust, bonding",
                "GABA = emotional calm",
                "Serotonin = higher mood, openness",
                "Compassion is neurochemical alignment with others."
            ]
        }
    }
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

interface HistoryPopupState {
    piston: PistonType | EmotionalState;
    x: number;
    y: number;
}
  
const HistoryPopupCard = ({ popupState, entries, onClose, onEdit }: { 
    popupState: HistoryPopupState; 
    entries: PistonEntry[]; 
    onClose: () => void; 
    onEdit: (piston: PistonType | EmotionalState, entry: PistonEntry) => void;
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
                           {PISTON_ICONS[popupState.piston as PistonType] || <Shield className="h-5 w-5 text-red-500"/>} 
                           <CardTitle className="text-base">{PISTON_FULL_NAMES[popupState.piston as PistonType] || popupState.piston} History</CardTitle>
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

const DetailsPopupCard = ({ popupState, onClose }: { popupState: HistoryPopupState; onClose: () => void; }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `details-popup-${popupState.piston}`,
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
    
    const details = PISTON_DETAILS[popupState.piston as PistonType];

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="z-[70]">
            <Card className="w-96 shadow-2xl border-2 border-primary/30 bg-card">
                 <CardHeader className="p-3 relative cursor-grab" {...listeners}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 flex-grow">
                           {PISTON_ICONS[popupState.piston as PistonType]} 
                           <CardTitle className="text-base">{PISTON_FULL_NAMES[popupState.piston as PistonType]}</CardTitle>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <ScrollArea className="max-h-[80vh] pr-4">
                        <div className="text-sm space-y-4">
                            <p className="italic text-muted-foreground">{details.why}</p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Negates:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {details.negates.map(item => <Badge key={item} variant="secondary">{item}</Badge>)}
                                    </div>
                                </div>
                                 <div className="space-y-1">
                                    <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Fuels Needs:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {details.fuels.map(item => <Badge key={item} variant="secondary">{item}</Badge>)}
                                    </div>
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Virtues:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {details.virtues.map(item => <Badge key={item} variant="secondary">{item}</Badge>)}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Biochemical Links: <span className="font-normal normal-case text-primary">{details.biochemical.linked}</span></p>
                                <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                                    {details.biochemical.details.map((item, index) => <li key={index}>{item}</li>)}
                                </ul>
                            </div>

                            {details.comparisons.map((comp, index) => (
                                <div key={index} className="grid grid-cols-[auto,1fr] items-start gap-x-3 text-xs">
                                    <div className="text-right text-muted-foreground">{comp.ego.startsWith("“") ? "Ego says:" : comp.ego}</div>
                                    <div className="font-medium text-foreground">{comp.ego.startsWith("“") ? comp.ego : comp.virtue}</div>
                                    
                                    {comp.ego.startsWith("“") && (
                                        <>
                                            <div className="text-right text-muted-foreground">{PISTON_FULL_NAMES[popupState.piston as PistonType]} says:</div>
                                            <div className="font-medium text-foreground">{comp.virtue}</div>
                                        </>
                                    )}
                                </div>
                            ))}

                            <div className="pt-2">
                                <p className="font-semibold text-primary">👉 {details.conclusion}</p>
                            </div>
                        </div>
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
  level: number;
  parentId?: string;
  width?: number;
}

const ResourcePopupCard = ({ popupState, resource, onClose, onUpdate, playingAudio, setPlayingAudio, onOpenNestedPopup, onEditLinkText }: { 
    popupState: ResourcePopupState; 
    resource: Resource; 
    onClose: (resourceId: string) => void;
    onUpdate: (updatedResource: Resource) => void;
    playingAudio: { id: string; isPlaying: boolean } | null;
    setPlayingAudio: React.Dispatch<React.SetStateAction<{ id: string; isPlaying: boolean } | null>>;
    onOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState: ResourcePopupState) => void;
    onEditLinkText: (point: ResourcePoint) => void;
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
        width: `${popupState.width || 512}px`,
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
    
    const handleLinkClick = (e: React.MouseEvent, pointResourceId: string) => {
      e.stopPropagation();
      onOpenNestedPopup(pointResourceId, e, popupState);
    };


    return (
        <div ref={setNodeRef} style={style} {...attributes} className="z-[70]">
            <input type="file" ref={audioInputRef} onChange={handleAudioUpload} accept="audio/*" className="hidden" />
            <Card className="shadow-2xl border-2 border-primary/30 bg-card max-h-[70vh] flex flex-col relative group">
                <div 
                    className="absolute top-2 left-2 z-20 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                    {...listeners}
                >
                    <GripVertical className="h-5 w-5 text-muted-foreground/50"/>
                </div>
                
                 <div className="absolute top-2 right-2 z-20 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {resource.audioUrl ? (
                        <>
                           <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDownCapture={togglePlayAudio}>
                                {playingAudio?.id === resource.id && playingAudio.isPlaying ? <Pause className="h-4 w-4 text-green-500" /> : <Play className="h-4 w-4 text-green-500" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => audioInputRef.current?.click()}>
                                <Upload className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => audioInputRef.current?.click()}>
                            <Upload className="h-4 w-4" />
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
                            {(resource.points || []).map(point => {
                                if (point.type === 'card' && point.resourceId) {
                                    return (
                                        <li key={point.id} className="flex items-start gap-3 group/item">
                                            <ArrowRight className="h-4 w-4 mt-1.5 text-primary/50 flex-shrink-0" />
                                            <button
                                                onClick={(e) => handleLinkClick(e, point.resourceId!)}
                                                className="text-left font-medium text-primary hover:underline"
                                            >
                                                {point.text}
                                            </button>
                                             <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover/item:opacity-100 flex-shrink-0" onClick={() => handleDeletePoint(point.id)}>
                                                <Trash2 className="h-3 w-3"/>
                                            </Button>
                                        </li>
                                    )
                                }
                                return (
                                    <EditableResourcePoint 
                                        key={point.id}
                                        point={point}
                                        onUpdate={(newText) => handleUpdatePoint(point.id, newText)}
                                        onDelete={() => handleDeletePoint(point.id)}
                                        onEditLinkText={onEditLinkText}
                                    />
                                );
                            })}
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
                                <Button variant="ghost" className="w-full justify-start" onClick={() => handleAddPoint('link')}><LinkIcon className="mr-2 h-4 w-4" />Link</Button>
                           </div>
                        </PopoverContent>
                    </Popover>
                 </CardFooter>
            </Card>
        </div>
    );
};

const EditableResourcePoint = ({ point, onUpdate, onDelete, onEditLinkText }: { 
    point: ResourcePoint, 
    onUpdate: (text: string) => void, 
    onDelete: () => void,
    onEditLinkText: (point: ResourcePoint) => void 
}) => {
    const { setFloatingVideoUrl } = useAuth();
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
            point.type === 'link' ? <LinkIcon className="h-4 w-4 mt-1.5 text-primary/70 flex-shrink-0" /> :
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
                ) : point.type === 'link' ? (
                     <div className="flex-grow min-w-0">
                        <span 
                            className="cursor-pointer text-primary hover:underline truncate" 
                            title={point.text} 
                            onClick={() => point.text && setFloatingVideoUrl(point.text)}
                            onContextMenu={(e) => { e.preventDefault(); onEditLinkText(point); }}
                        >
                            {point.displayText || point.text || <span className="text-muted-foreground italic">New link...</span>}
                        </span>
                    </div>
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
    deleteDesire, deleteMindsetCard,
    globalVolume,
    skillDomains, coreSkills, projects,
    pistonsInitialState,
    scheduleTaskFromMindMap,
  } = useAuth();
  const [currentView, setCurrentView] = useState<'main' | 'health' | 'projects' | 'specializations' | 'desires' | 'mindset' | 'thoughts' | 'negative-thoughts'>('main');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedTopicName, setSelectedTopicName] = useState<string | null>(null);
  
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [historyPopup, setHistoryPopup] = useState<HistoryPopupState | null>(null);
  const [detailsPopup, setDetailsPopup] = useState<HistoryPopupState | null>(null);
  
  const [openResourcePopups, setOpenResourcePopups] = useState<Map<string, ResourcePopupState>>(new Map());

  const [playingAudio, setPlayingAudio] = useState<{ id: string; isPlaying: boolean } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [linkTextDialog, setLinkTextDialog] = useState<{ point: ResourcePoint, resourceId: string } | null>(null);
  const [currentDisplayText, setCurrentDisplayText] = useState('');
  
  const [schedulePopover, setSchedulePopover] = useState<{ piston: EmotionalState; anchor: HTMLElement | null } | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date());
  const [scheduleSlot, setScheduleSlot] = useState<string>('Morning');


  useEffect(() => {
    if (isPistonsHeadOpen && pistonsInitialState) {
        setCurrentView(pistonsInitialState.view);
        if (pistonsInitialState.topicId && pistonsInitialState.topicName) {
            setSelectedTopicId(pistonsInitialState.topicId);
            setSelectedTopicName(pistonsInitialState.topicName);
        }
    } else if (!isPistonsHeadOpen) {
        setCurrentView('main');
        setSelectedTopicId(null);
    }
  }, [isPistonsHeadOpen, pistonsInitialState]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (playingAudio?.isPlaying) {
      const resourceToPlay = resources.find(r => r.id === playingAudio.id);
      if (resourceToPlay?.audioUrl) {
        if (audioEl.src !== resourceToPlay.audioUrl) {
          audioEl.src = resourceToPlay.audioUrl;
        }
        audioEl.volume = globalVolume; // Use global volume
        audioEl.play().catch(e => console.error("Audio play failed:", e));
      }
    } else {
      audioEl.pause();
    }
  }, [playingAudio, resources, globalVolume]);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'pistons-popup',
  });
  
  const handleCloseHistory = () => setHistoryPopup(null);
  const handleCloseDetails = () => setDetailsPopup(null);
  
  const handleOpenNestedPopup = (resourceId: string, event: React.MouseEvent, parentPopupState?: ResourcePopupState) => {
      setOpenResourcePopups(prev => {
          const newPopups = new Map(prev);
          const resource = resources.find(r => r.id === resourceId);
          if (!resource) return newPopups;
          
          const hasMarkdown = (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
          const popupWidth = hasMarkdown ? 896 : 512;
      
          let x, y, level, parentId;
      
          if (parentPopupState) {
              level = parentPopupState.level + 1;
              parentId = parentPopupState.resourceId;
              x = parentPopupState.x + 40;
              y = parentPopupState.y + 40;
          } else {
              level = 0;
              parentId = undefined;
              x = event.clientX;
              y = event.clientY;
          }
          
          newPopups.set(resourceId, {
              resourceId, level, x, y, parentId, width: popupWidth
          });
          return newPopups;
      });
  };

  const handleCloseResource = (resourceId: string) => {
    setOpenResourcePopups(prev => {
      const newPopups = new Map(prev);
      const popupsToDelete = new Set<string>();
      function findChildren(parentId: string) {
        popupsToDelete.add(parentId);
        for (const [id, popup] of newPopups.entries()) {
          if (popup.parentId === parentId) findChildren(id);
        }
      }
      findChildren(resourceId);
      for (const id of popupsToDelete) {
        if (playingAudio?.id === id) {
            setPlayingAudio(null);
        }
        newPopups.delete(id);
      }
      return newPopups;
    });
  };
  
  const handleUpdateResource = (updatedResource: Resource) => {
    setResources(prev =>
      prev.map(res => res.id === updatedResource.id ? updatedResource : res)
    );
  };
  
  const handleEditLinkText = (point: ResourcePoint) => {
      const resource = Array.from(openResourcePopups.values()).map(p => resources.find(r => r.id === p.resourceId)).find(r => r?.points?.some(p => p.id === point.id));
      if (!resource) return;
      setCurrentDisplayText(point.displayText || '');
      setLinkTextDialog({ point, resourceId: resource.id });
  };
  
  const handleSaveLinkText = () => {
    if (!linkTextDialog) return;
    const { point, resourceId } = linkTextDialog;
    
    setResources(prev => prev.map(res => {
        if (res.id === resourceId) {
            const updatedPoints = (res.points || []).map(p => {
                if (p.id === point.id) {
                    return { ...p, displayText: currentDisplayText.trim() };
                }
                return p;
            });
            return { ...res, points: updatedPoints };
        }
        return res;
    }));
    
    setLinkTextDialog(null);
    setCurrentDisplayText('');
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
    } else if (id.startsWith('details-popup-')) {
        setDetailsPopup(prev => {
            if (!prev) return null;
            const detailsPopupWidth = 320;
            const newX = prev.x + delta.x;
            const newY = prev.y + delta.y;
            return { ...prev, x: Math.min(Math.max(20, newX), window.innerWidth - detailsPopupWidth - 20), y: Math.max(20, newY) };
        });
    }
    else if (id.startsWith('resource-popup-')) {
        setOpenResourcePopups(prev => {
            const newPopups = new Map(prev);
            const popupId = id.replace('resource-popup-', '');
            const popup = newPopups.get(popupId);
            if(popup) {
                const popupWidth = popup.width || 512;
                const newX = popup.x + delta.x;
                const newY = popup.y + delta.y;
                newPopups.set(popupId, {...popup, x: newX, y: newY});
            }
            return newPopups;
        });
    }
  };
  
  const handleClose = () => {
    setIsPistonsHeadOpen(false);
    setHistoryPopup(null);
    setDetailsPopup(null);
    setPlayingAudio(null);
    setOpenResourcePopups(new Map());
    setTimeout(() => {
        setCurrentView('main');
        setSelectedTopicId(null);
    }, 300);
  };
  
  const handleViewChange = (newView: 'main' | 'health' | 'projects' | 'specializations' | 'desires' | 'mindset' | 'thoughts' | 'negative-thoughts') => {
    setCurrentView(newView);
  };
  
  const handleTopicSelect = (topicId: string, name: string) => {
      setSelectedTopicId(topicId);
      setSelectedTopicName(name);
  }

  const onBack = () => {
    if (currentView === 'negative-thoughts' && selectedTopicId) {
        setSelectedTopicId(null);
        setSelectedTopicName(null);
    } else if (currentView === 'negative-thoughts') {
        setCurrentView('thoughts');
    } else if (selectedTopicId) {
        setSelectedTopicId(null);
        setSelectedTopicName(null);
    } else {
        setCurrentView('main');
    }
  };
  
  const getTopicName = () => {
    if (selectedTopicName) {
        return selectedTopicName;
    }
    switch (currentView) {
      case 'health': return `Health: ${pistons.health?.activity || 'Activity'}`;
      case 'projects': return `Select a Project Feature`;
      case 'specializations': return `Select a Micro-Skill`;
      case 'desires': return `Select a Desire`;
      case 'mindset': return `Select a Mindset`;
      case 'thoughts': return 'Thoughts';
      case 'negative-thoughts': return 'Log a Thought';
      default: return 'Pistons of Intention';
    }
  };
  const topicNameDisplay = getTopicName();

  const handleOpenHistory = (e: React.MouseEvent, piston: PistonType | EmotionalState) => {
    e.stopPropagation();
    if (historyPopup?.piston === piston) {
      setHistoryPopup(null);
      return;
    }
    
    const popupWidth = 320;
    let x;
  
    if (openResourcePopups.size > 0) {
        const lastPopup = Array.from(openResourcePopups.values()).pop()!;
        x = position.x < window.innerWidth / 2 ? lastPopup.x + (lastPopup.width || 512) + 20 : lastPopup.x - popupWidth - 20;
    } else {
      x = position.x + 384 + 20;
    }
  
    if (x < 20) x = position.x + 384 + 20;
    if (x + popupWidth > window.innerWidth) x = position.x - popupWidth - 20;
  
    setHistoryPopup({ piston, x, y: Math.max(20, position.y) });
  };
  
  const handleOpenDetails = (e: React.MouseEvent, piston: PistonType) => {
    e.stopPropagation();
    if (detailsPopup?.piston === piston) {
      setDetailsPopup(null);
      return;
    }
    
    const popupWidth = 384; // increased width
    let x;
  
    if (historyPopup) {
      x = position.x < window.innerWidth / 2 ? historyPopup.x + 320 + 20 : historyPopup.x - popupWidth - 20;
    } else {
      x = position.x + 384 + 20;
    }
  
    if (x < 20) x = position.x + 384 + 20;
    if (x + popupWidth > window.innerWidth) x = position.x - popupWidth - 20;
  
    setDetailsPopup({ piston, x, y: Math.max(20, position.y) });
  };
  
  const handleOpenResource = (e: React.MouseEvent, resourceId: string) => {
    e.stopPropagation();
    
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) {
        console.warn(`Resource with ID ${resourceId} not found.`);
        return;
    }

    const popupWidth = 512;
    let x;
  
    if (historyPopup) {
      x = position.x < window.innerWidth / 2 ? historyPopup.x + 320 + 20 : historyPopup.x - popupWidth - 20;
    } else {
      x = position.x + 384 + 20;
    }
  
    if (x < 20) x = position.x + 384 + 20;
    if (x + popupWidth > window.innerWidth) x = position.x - popupWidth - 20;
  
    setOpenResourcePopups(prev => {
        const newPopups = new Map(prev);
        newPopups.set(resourceId, { resourceId, x, y: Math.max(20, position.y), level: 0, width: popupWidth });
        return newPopups;
    });
  };


  const [linkingResourceFor, setLinkingResourceFor] = useState<{piston: PistonType | EmotionalState; currentResourceId?: string;} | null>(null);

  const handleLinkResource = (resourceId: string | null) => {
    if (!linkingResourceFor) return;
    const { piston } = linkingResourceFor;
    
    setPistons(prev => {
        const topicKey = selectedTopicId || (currentView === 'health' ? 'health' : `thought_${piston}`);
        if (!topicKey) return prev;
        
        const topicData = { ...(prev[topicKey] || {}) };
        const linkedIds = { ...(topicData.linkedResourceIds || {}) };

        if (resourceId === 'none' || resourceId === null) {
            delete linkedIds[piston as PistonType];
        } else {
            linkedIds[piston as PistonType] = resourceId;
        }

        return { ...prev, [topicKey]: { ...topicData, linkedResourceIds: linkedIds } };
    });
    setLinkingResourceFor(null);
  };
  
  const handleScheduleSubmit = () => {
    if (schedulePopover && scheduleDate && scheduleSlot) {
        scheduleTaskFromMindMap(
            `thought_${schedulePopover.piston}`,
            'thoughtwork',
            scheduleSlot
        );
        setSchedulePopover(null);
    }
  };

  const renderContent = () => {
    const commonProps = { 
        onBack: onBack, 
        setHistoryPopup: setHistoryPopup,
        setDetailsPopup: setDetailsPopup,
        setResourcePopup: setOpenResourcePopups,
        onLinkResource: setLinkingResourceFor,
        handleOpenResource,
        handleOpenHistory,
        handleOpenDetails,
    };
    switch (currentView) {
      case 'health': return <HealthPistonView {...commonProps} />;
      case 'projects': return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} topicName={selectedTopicName || 'Project'} {...commonProps} /> : <ProjectSelector onSelect={handleTopicSelect} onBack={onBack} />;
      case 'specializations': return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} topicName={selectedTopicName || 'Skill'} {...commonProps} /> : <SpecializationSelector onSelect={handleTopicSelect} onBack={onBack} />;
      case 'desires': return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} topicName={selectedTopicName || 'Desire'} {...commonProps} /> : <DesireSelector onSelect={handleTopicSelect} onBack={onBack} />;
      case 'mindset': return selectedTopicId ? <TopicPistonView topicId={selectedTopicName} topicName={selectedTopicName || 'Mindset'} {...commonProps} /> : <MindsetSelector onSelect={handleTopicSelect} onBack={onBack} />;
      case 'thoughts': return <ThoughtsView onSelect={(type) => setCurrentView(type === 'Positive' ? 'positive-thoughts' : 'negative-thoughts')} />;
      case 'negative-thoughts':
        if (selectedTopicId) {
            return <TopicPistonView topicId={selectedTopicId} topicName={selectedTopicName || 'Thought'} {...commonProps} />;
        }
        return <NegativeThoughtsView onSelect={(state) => handleTopicSelect(`thought_${state}`, state)} onSchedule={(e, state) => setSchedulePopover({ piston: state, anchor: e.currentTarget })}/>;
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
            <>
                <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />
                <div
                    ref={setNodeRef}
                    style={style}
                    className="z-[60]"
                >
                    <Card className="w-96 shadow-2xl border-2 border-primary/50 bg-card flex flex-col max-h-[90vh]">
                        <CardHeader 
                            className="p-3 text-center flex-shrink-0"
                        >
                            {(currentView !== 'main' || selectedTopicId) && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 absolute top-1.5 left-1.5 z-20" onClick={(e) => { e.stopPropagation(); onBack(); }}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="w-full text-center cursor-grab active:cursor-grabbing flex justify-center" {...attributes} {...listeners}>
                                <CardTitle className="text-base truncate px-8" title={topicNameDisplay as string}>
                                    {topicNameDisplay}
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
                        entries={pistons[selectedTopicId || (currentView === 'health' ? 'health' : `thought_${historyPopup.piston}`)]?.[historyPopup.piston as PistonType] || []}
                        onClose={handleCloseHistory}
                        onEdit={(piston, entry) => {
                            handleCloseHistory();
                        }}
                    />
                )}
                {detailsPopup && (
                    <DetailsPopupCard 
                        popupState={detailsPopup}
                        onClose={handleCloseDetails}
                    />
                )}
                 {Array.from(openResourcePopups.values()).map(popupState => {
                    const resource = resources.find(r => r.id === popupState.resourceId);
                    if (!resource) {
                        handleCloseResource(popupState.resourceId);
                        return null;
                    }
                    return (
                        <ResourcePopupCard
                            key={popupState.resourceId}
                            popupState={popupState}
                            resource={resource}
                            onClose={handleCloseResource}
                            onUpdate={handleUpdateResource}
                            playingAudio={playingAudio}
                            setPlayingAudio={setPlayingAudio}
                            onOpenNestedPopup={handleOpenNestedPopup}
                            onEditLinkText={handleEditLinkText}
                        />
                    );
                 })}
                 {linkingResourceFor && (
                    <Dialog open={!!linkingResourceFor} onOpenChange={() => setLinkingResourceFor(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Link Resource to {linkingResourceFor.piston}</DialogTitle>
                                <DialogDescription>Select an existing resource card to connect to this piston.</DialogDescription>
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
                {linkTextDialog && (
                    <Dialog open={!!linkTextDialog} onOpenChange={() => setLinkTextDialog(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Set Display Text</DialogTitle>
                                <DialogDescription>Set the text that will be displayed for this link.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <Label htmlFor="display-text-input">Display Text</Label>
                                <Input
                                    id="display-text-input"
                                    value={currentDisplayText}
                                    onChange={(e) => setCurrentDisplayText(e.target.value)}
                                    placeholder="Enter display text..."
                                    autoFocus
                                />
                                <p className="text-xs text-muted-foreground mt-2">URL: <span className="font-mono text-xs truncate">{linkTextDialog.point.text}</span></p>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setLinkTextDialog(null)}>Cancel</Button>
                                <Button onClick={handleSaveLinkText}>Save</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
                 <Popover open={!!schedulePopover} onOpenChange={() => setSchedulePopover(null)}>
                    <PopoverTrigger asChild>
                        <div style={{ position: 'fixed', top: schedulePopover?.anchor?.getBoundingClientRect().top, left: schedulePopover?.anchor?.getBoundingClientRect().left }} />
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">Schedule Thought Work</h4>
                                <p className="text-sm text-muted-foreground">Schedule a session to address "{schedulePopover?.piston}".</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <CalendarComponent mode="single" selected={scheduleDate} onSelect={setScheduleDate} />
                            </div>
                            <div className="space-y-2">
                                <Label>Time Slot</Label>
                                <Select value={scheduleSlot} onValueChange={setScheduleSlot}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        {['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleScheduleSubmit}>Schedule Session</Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </>
        )}
    </DndContext>
  );
}

const MainPistonView = ({ onSelect }: { onSelect: (view: 'health' | 'projects' | 'specializations' | 'desires' | 'mindset' | 'thoughts') => void }) => (
    <CardContent className="p-4">
        <p className="text-muted-foreground text-center mb-4 text-sm">Select a category to define your core motivations.</p>
        <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => onSelect('health')} variant="outline" className="flex-col h-20"><Heart className="h-6 w-6 text-red-500 mb-1"/>Health</Button>
            <Button onClick={() => onSelect('projects')} variant="outline" className="flex-col h-20"><Briefcase className="h-6 w-6 text-green-500 mb-1"/>Projects</Button>
            <Button onClick={() => onSelect('specializations')} variant="outline" className="flex-col h-20"><BrainCircuit className="h-6 w-6 text-blue-500 mb-1"/>Specializations</Button>
            <Button onClick={() => onSelect('desires')} variant="outline" className="flex-col h-20"><Target className="h-6 w-6 text-purple-500 mb-1"/>Desires</Button>
            <Button onClick={() => onSelect('mindset')} variant="outline" className="flex-col h-20"><Brain className="h-6 w-6 text-primary mb-1"/>Mindset</Button>
            <Button onClick={() => onSelect('thoughts')} variant="outline" className="flex-col h-20"><MessageSquare className="h-6 w-6 text-orange-500 mb-1"/>Thoughts</Button>
        </div>
    </CardContent>
);


const HealthPistonView = ({ onBack, setHistoryPopup, setDetailsPopup, setResourcePopup, onLinkResource, handleOpenResource, handleOpenHistory, handleOpenDetails }: { onBack: () => void, setHistoryPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, setDetailsPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, setResourcePopup: React.Dispatch<React.SetStateAction<Map<string, ResourcePopupState>>>, onLinkResource: (data: { piston: PistonType; currentResourceId?: string; }) => void; handleOpenResource: (e: React.MouseEvent, resourceId: string) => void; handleOpenHistory: (e: React.MouseEvent, piston: PistonType) => void; handleOpenDetails: (e: React.MouseEvent, piston: PistonType) => void; }) => {
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

    return <PistonEditorView topicId="health" topicName={`Health: ${activity}`} onBack={onBack} onEditTopicName={() => setIsEditingActivity(true)} setHistoryPopup={setHistoryPopup} setDetailsPopup={setDetailsPopup} setResourcePopup={setResourcePopup} onLinkResource={onLinkResource} handleOpenResource={handleOpenResource} handleOpenHistory={handleOpenHistory} handleOpenDetails={handleOpenDetails} />;
};

const DesireSelector = ({ onSelect, onBack }: { onSelect: (topicId: string, name: string) => void, onBack: () => void }) => {
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
        <CardContent className="p-4 flex-grow min-h-0 flex flex-col">
            <div className="flex gap-2 mb-4 flex-shrink-0">
                <Input value={newDesireName} onChange={e => setNewDesireName(e.target.value)} placeholder="Add a new desire..."/>
                <Button onClick={handleAddDesire}><Plus/></Button>
            </div>
            <ScrollArea className="flex-grow min-h-0">
                <ul className="space-y-2 pr-2">
                    {desires.map(desire => (
                        <li key={desire.id} className="flex items-center justify-between group p-2 rounded-md border bg-muted/20">
                            <button onClick={() => onSelect(desire.id, desire.name)} className="flex items-center justify-between w-full text-left group">
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

const MindsetSelector = ({ onSelect, onBack }: { onSelect: (topicId: string, name: string) => void, onBack: () => void }) => {
    const { mindsetCards, addMindsetCard, deleteMindsetCard } = useAuth();
    const [newMindsetName, setNewMindsetName] = useState('');
    
    const handleAddMindset = () => {
        if (!newMindsetName.trim()) return;
        addMindsetCard(newMindsetName.trim());
        setNewMindsetName('');
    };

    return (
        <CardContent className="p-4 flex-grow min-h-0 flex flex-col">
            <div className="flex gap-2 mb-4 flex-shrink-0">
                <Input value={newMindsetName} onChange={e => setNewMindsetName(e.target.value)} placeholder="Add a new mindset..."/>
                <Button onClick={handleAddMindset}><Plus/></Button>
            </div>
            <ScrollArea className="flex-grow min-h-0">
                <ul className="space-y-2 pr-2">
                    {mindsetCards.map(card => (
                        <li key={card.id} className="flex items-center justify-between group p-2 rounded-md border bg-muted/20">
                             <button onClick={() => onSelect(card.id, card.title)} className="flex items-center justify-between w-full text-left group">
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


const ProjectSelector = ({ onSelect, onBack }: { onSelect: (topicId: string, name: string) => void, onBack: () => void }) => {
    const { projects } = useAuth();
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    return (
        <CardContent className="p-4">
            <div className="flex items-center mb-2">
                {selectedProject && <Button variant="ghost" size="icon" className="h-7 w-7 mr-1" onClick={() => setSelectedProject(null)}><ArrowLeft className="h-4 w-4" /></Button>}
                <h3 className="text-lg font-semibold text-center flex-grow">{selectedProject ? `Select Feature` : 'Select Project'}</h3>
            </div>
            
            {selectedProject ? (
                <ul className="space-y-2">
                    {selectedProject.features.map(feature => (
                        <li key={feature.id}>
                            <Button variant="outline" className="w-full justify-start" onClick={() => onSelect(feature.id, feature.name)}><Workflow className="mr-2 h-4 w-4"/>{feature.name}</Button>
                        </li>
                    ))}
                </ul>
            ) : (
                <ul className="space-y-2">
                    {projects.map(project => (
                        <li key={project.id}>
                            <Button variant="outline" className="w-full justify-start" onClick={() => setSelectedProject(project)}><Briefcase className="mr-2 h-4 w-4"/>{project.name}</Button>
                        </li>
                    ))}
                </ul>
            )}
        </CardContent>
    )
}

const SpecializationSelector = ({ onSelect, onBack }: { onSelect: (topicId: string, name: string) => void, onBack: () => void }) => {
    const { skillDomains, coreSkills } = useAuth();
    const [step, setStep] = useState(0); // 0: domain, 1: specialization, 2: skill area, 3: micro-skill
    const [selectedDomain, setSelectedDomain] = useState<SkillDomain | null>(null);
    const [selectedSpecialization, setSelectedSpecialization] = useState<CoreSkill | null>(null);
    const [selectedSkillArea, setSelectedSkillArea] = useState<SkillArea | null>(null);

    const specializations = coreSkills.filter(cs => cs.domainId === selectedDomain?.id && cs.type === 'Specialization');
    
    const handleBack = () => {
        if (step > 0) setStep(step - 1);
        else onBack();
    };

    const getTitle = () => {
        if (step === 3) return selectedSkillArea?.name || "Select Micro-Skill";
        if (step === 2) return selectedSpecialization?.name || "Select Skill Area";
        if (step === 1) return selectedDomain?.name || "Select Specialization";
        return "Select Domain";
    }

    return (
        <CardContent className="p-4">
            <div className="flex items-center mb-2">
                {step > 0 && <Button variant="ghost" size="icon" className="h-7 w-7 mr-1" onClick={handleBack}><ArrowLeft className="h-4 w-4" /></Button>}
                <h3 className="text-lg font-semibold text-center flex-grow">{getTitle()}</h3>
            </div>

            {step === 0 && (
                <ul className="space-y-2">
                    {skillDomains.map(domain => <li key={domain.id}><Button variant="outline" className="w-full justify-start" onClick={() => { setSelectedDomain(domain); setStep(1); }}><Folder className="mr-2 h-4 w-4"/>{domain.name}</Button></li>)}
                </ul>
            )}
            {step === 1 && selectedDomain && (
                <ul className="space-y-2">
                    {specializations.map(spec => <li key={spec.id}><Button variant="outline" className="w-full justify-start" onClick={() => { setSelectedSpecialization(spec); setStep(2); }}><BrainCircuit className="mr-2 h-4 w-4"/>{spec.name}</Button></li>)}
                </ul>
            )}
            {step === 2 && selectedSpecialization && (
                <ul className="space-y-2">
                    {selectedSpecialization.skillAreas.map(area => <li key={area.id}><Button variant="outline" className="w-full justify-start" onClick={() => { setSelectedSkillArea(area); setStep(3); }}><Folder className="mr-2 h-4 w-4"/>{area.name}</Button></li>)}
                </ul>
            )}
             {step === 3 && selectedSkillArea && (
                <ul className="space-y-2">
                    {selectedSkillArea.microSkills.map(micro => <li key={micro.id}><Button variant="outline" className="w-full justify-start" onClick={() => onSelect(micro.name, micro.name)}><TrendingUp className="mr-2 h-4 w-4"/>{micro.name}</Button></li>)}
                </ul>
            )}
        </CardContent>
    );
};

const ThoughtsView = ({ onSelect }: { onSelect: (type: 'Positive' | 'Negative') => void }) => (
    <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => onSelect('Positive')} variant="outline" className="flex-col h-20"><Smile className="h-6 w-6 text-green-500 mb-1"/>Positive</Button>
            <Button onClick={() => onSelect('Negative')} variant="outline" className="flex-col h-20"><Shield className="h-6 w-6 text-red-500 mb-1"/>Negative</Button>
        </div>
    </CardContent>
);

const NegativeThoughtsView = ({ onSelect, onSchedule }: { onSelect: (state: EmotionalState) => void; onSchedule: (e: React.MouseEvent<HTMLButtonElement>, state: EmotionalState) => void; }) => {
    return (
        <CardContent className="p-4">
            <ScrollArea className="h-80">
                <ul className="space-y-2 pr-2">
                    {Object.keys(EMOTIONAL_STATES).map(state => (
                        <li key={state}>
                             <div className="flex items-center justify-between group p-2 rounded-md border bg-muted/20">
                                <button onClick={() => onSelect(state as EmotionalState)} className="flex items-center justify-between w-full text-left group">
                                    <span className="font-medium group-hover:text-primary transition-colors">{state}</span>
                                    <ChevronRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"/>
                                </button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => onSchedule(e, state as EmotionalState)}>
                                    <Calendar className="h-4 w-4 text-primary"/>
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            </ScrollArea>
        </CardContent>
    );
};

const PistonEditorView = ({ topicId, topicName, onBack, onEditTopicName, setHistoryPopup, setDetailsPopup, setResourcePopup, onLinkResource, handleOpenResource, handleOpenHistory, handleOpenDetails }: { topicId: string, topicName: string, onBack: () => void, onEditTopicName?: () => void, setHistoryPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, setDetailsPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, setResourcePopup: React.Dispatch<React.SetStateAction<Map<string, ResourcePopupState>>>, onLinkResource: (data: { piston: PistonType | EmotionalState; currentResourceId?: string; }) => void; handleOpenResource: (e: React.MouseEvent, resourceId: string) => void; handleOpenHistory: (e: React.MouseEvent, piston: PistonType | EmotionalState) => void; handleOpenDetails: (e: React.MouseEvent, piston: PistonType) => void; }) => {
    const { pistons, setPistons } = useAuth();
    const [newEntryPiston, setNewEntryPiston] = useState<PistonType | EmotionalState | null>(null);
    const [newEntryText, setNewEntryText] = useState('');
    
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [editedEntryText, setEditedEntryText] = useState('');
    
    const topicIsThought = topicId.startsWith('thought_');
    const topicKey = topicIsThought ? topicId : topicId.split('_')[0];
    const thoughtType = topicIsThought ? topicName as EmotionalState : null;
    
    const topicPistons = pistons[topicKey] || {};
    
    const handleStartEditing = (entry: PistonEntry) => {
        setEditingEntryId(entry.id);
        setEditedEntryText(entry.text);
    };

    const handleSaveEdit = (piston: PistonType | EmotionalState) => {
        if (!editingEntryId) return;

        setPistons(prev => {
            const topicData = { ...(prev[topicKey] || {}) };
            const entries = topicData[piston as PistonType] || [];
            const updatedEntries = entries.map(e =>
                e.id === editingEntryId ? { ...e, text: editedEntryText } : e
            );
            return { ...prev, [topicKey]: { ...topicData, [piston as PistonType]: updatedEntries } };
        });
        setEditingEntryId(null);
    };


    const handleSaveNewEntry = (piston: PistonType | EmotionalState) => {
        if (!newEntryText.trim()) { setNewEntryPiston(null); setNewEntryText(''); return; }
        const newEntry: PistonEntry = { id: `piston_${Date.now()}`, text: newEntryText.trim(), timestamp: Date.now() };
        setPistons(prev => {
            const topicData = { ...(prev[topicKey] || {}) };
            const entries = topicData[piston as PistonType] || [];
            return { ...prev, [topicKey]: { ...topicData, [piston as PistonType]: [newEntry, ...entries] } };
        });
        setNewEntryPiston(null); setNewEntryText('');
    };
    
    const handleDeleteEntry = (piston: PistonType | EmotionalState, entryId: string) => {
        setPistons(prev => {
            const topicData = { ...(prev[topicKey] || {}) };
            const entries = topicData[piston as PistonType] || [];
            const updatedEntries = entries.filter(entry => entry.id !== entryId);
            return { ...prev, [topicKey]: { ...topicData, [piston as PistonType]: updatedEntries } };
        });
    };
    
    return (
      <CardContent className="p-0 flex-grow min-h-0 flex flex-col">
          <ScrollArea className="flex-grow p-4">
              <ul className="space-y-2">
                  {(topicIsThought && thoughtType ? [thoughtType] : PISTON_NAMES).map(piston => {
                      const entries = topicPistons[piston as PistonType] || [];
                      const currentEntry = entries[0];
                      const isAddingNewToThisPiston = newEntryPiston === piston;
                      const isResourceLinked = !!topicPistons.linkedResourceIds?.[piston as PistonType];
                      const details = topicIsThought ? null : PISTON_DETAILS[piston as PistonType];
                      const thoughtDetails = topicIsThought ? EMOTIONAL_STATES[thoughtType!] : null;
                      
                      return (
                          <li key={piston} className="p-2 rounded-lg bg-muted/30">
                              <div className="flex items-start gap-3">
                                  <span className="mt-1">{PISTON_ICONS[piston as PistonType] || <Shield className="h-5 w-5 text-red-500"/>}</span>
                                  <div className="flex-grow min-w-0">
                                      <div className="flex justify-between items-center">
                                         <h4 className="font-semibold text-sm">{PISTON_FULL_NAMES[piston as PistonType] || piston}</h4>
                                         {details && <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDown={(e) => handleOpenDetails(e, piston as PistonType)}><Info className="h-4 w-4"/></Button>}
                                      </div>
                                      <p className="text-xs text-muted-foreground italic mb-2">{PISTON_PLACEHOLDERS[piston as PistonType] || thoughtDetails?.message}</p>
                                      
                                      <div className="text-sm min-h-[2.5rem] pt-1.5 w-full flex justify-between items-start group">
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
                                              <div className="flex-grow min-w-0 pr-2 break-words" onDoubleClick={() => currentEntry && handleStartEditing(currentEntry)}>
                                                  {currentEntry?.text && <p className="whitespace-pre-wrap">{currentEntry.text}</p>}
                                              </div>
                                          )}
                                          <div className="flex-shrink-0 flex items-center">
                                              {isResourceLinked ? (
                                                  <Button variant="ghost" size="icon" className="h-6 w-6" onPointerDownCapture={(e) => handleOpenResource(e, topicPistons.linkedResourceIds![piston as PistonType]!)}>
                                                      <Library className="h-4 w-4 text-primary" />
                                                  </Button>
                                              ) : null }
                                                  <DropdownMenu>
                                                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                                  <DropdownMenuPortal>
                                                      <DropdownMenuContent side="right" align="start" sideOffset={5}>
                                                          <DropdownMenuItem onSelect={() => setNewEntryPiston(piston)}><Plus className="mr-2 h-4 w-4"/>New Entry</DropdownMenuItem>
                                                          {entries.length > 0 && <DropdownMenuItem onSelect={(e) => handleOpenHistory(e, piston)}><History className="mr-2 h-4 w-4"/>View History</DropdownMenuItem>}
                                                           <DropdownMenuItem onSelect={() => onLinkResource({ piston, currentResourceId: topicPistons.linkedResourceIds?.[piston as PistonType] })}>
                                                              <LinkIcon className="mr-2 h-4 w-4"/> {isResourceLinked ? 'Change Resource' : 'Link Resource'}
                                                          </DropdownMenuItem>
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
          </ScrollArea>
    </CardContent>
    );
};

const TopicPistonView = ({ topicId, topicName, onBack, onEditTopicName, setHistoryPopup, setDetailsPopup, setResourcePopup, onLinkResource, handleOpenResource, handleOpenHistory, handleOpenDetails }: { topicId: string, topicName: string, onBack: () => void, onEditTopicName?: () => void, setHistoryPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, setDetailsPopup: React.Dispatch<React.SetStateAction<HistoryPopupState | null>>, setResourcePopup: React.Dispatch<React.SetStateAction<Map<string, ResourcePopupState>>>, onLinkResource: (data: { piston: PistonType | EmotionalState; currentResourceId?: string; }) => void; handleOpenResource: (e: React.MouseEvent, resourceId: string) => void; handleOpenHistory: (e: React.MouseEvent, piston: PistonType | EmotionalState) => void; handleOpenDetails: (e: React.MouseEvent, piston: PistonType) => void; }) => {
    return <PistonEditorView topicId={topicId} topicName={topicName} onBack={onBack} setHistoryPopup={setHistoryPopup} setDetailsPopup={setDetailsPopup} setResourcePopup={setResourcePopup} onLinkResource={onLinkResource} handleOpenResource={handleOpenResource} handleOpenHistory={handleOpenHistory} handleOpenDetails={handleOpenDetails} />;
};
    

    






