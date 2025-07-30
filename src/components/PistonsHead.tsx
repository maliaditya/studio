"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Heart, Briefcase, TrendingUp, ChevronLeft, Target, HandHeart, Search, Sprout, Blocks, Mic, Smile, Shield, Edit, X } from 'lucide-react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { PistonType, PistonsData } from '@/types/workout';
import { DndContext, useDraggable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';


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

export function PistonsHead() {
  const { isPistonsHeadOpen, setIsPistonsHeadOpen } = useAuth();
  const [currentView, setCurrentView] = useState<'main' | 'health' | 'wealth' | 'growth'>('main');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  
  const [position, setPosition] = useState({ x: 50, y: 50 });

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'pistons-popup',
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { delta } = event;
    setPosition(prev => ({
        x: prev.x + delta.x,
        y: prev.y + delta.y,
    }));
  };
  
  const handleClose = () => {
    setIsPistonsHeadOpen(false);
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
  
  const { pistons } = useAuth();
  
  const getTopicName = (view: 'main' | 'health' | 'wealth' | 'growth') => {
    switch (view) {
      case 'health':
        return `Health: ${pistons.health?.activity || 'Activity'}`;
      case 'wealth':
         return selectedTopicId ? selectedTopicId : 'Select Wealth Topic';
      case 'growth':
         return selectedTopicId ? selectedTopicId : 'Select Growth Topic';
      default: return 'Pistons of Intention';
    }
  };
  const topicName = getTopicName(currentView);

  const renderContent = () => {
    switch (currentView) {
      case 'health':
        return <HealthPistonView onBack={onBack} />;
      case 'wealth':
        return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} onBack={onBack} /> : <TopicSelector onSelect={handleTopicSelect} type="wealth" onBack={onBack} />;
      case 'growth':
         return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} onBack={onBack} /> : <TopicSelector onSelect={handleTopicSelect} type="growth" onBack={onBack} />;
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
    <>
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
          <DndContext onDragEnd={handleDragEnd}>
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
                        className="p-3 cursor-grab text-center" 
                        {...attributes} 
                        {...listeners}
                    >
                        <div className="flex justify-between items-center w-full">
                            <div className="w-8">
                                {currentView !== 'main' && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onBack(); }}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <CardTitle className="text-base truncate flex-grow" title={topicName as string}>
                                {topicName}
                            </CardTitle>
                             <div className="w-8" />
                        </div>
                    </CardHeader>
                    {renderContent()}
                </Card>
            </div>
          </DndContext>
      )}
    </>
  );
}

const MainPistonView = ({ onSelect }: { onSelect: (view: 'health' | 'wealth' | 'growth') => void }) => (
    <CardContent className="p-4">
        <p className="text-muted-foreground text-center mb-4 text-sm">Select a category to define your core motivations.</p>
        <div className="flex justify-around items-center p-2 rounded-lg bg-muted/50">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={() => onSelect('health')} variant="ghost" size="icon" className="h-12 w-12 text-red-500 hover:bg-red-500/10 hover:text-red-600"><Heart className="h-6 w-6"/></Button>
                    </TooltipTrigger>
                    <TooltipContent>Health</TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={() => onSelect('wealth')} variant="ghost" size="icon" className="h-12 w-12 text-green-500 hover:bg-green-500/10 hover:text-green-600"><Briefcase className="h-6 w-6"/></Button>
                    </TooltipTrigger>
                    <TooltipContent>Wealth</TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={() => onSelect('growth')} variant="ghost" size="icon" className="h-12 w-12 text-blue-500 hover:bg-blue-500/10 hover:text-blue-600"><TrendingUp className="h-6 w-6"/></Button>
                    </TooltipTrigger>
                    <TooltipContent>Growth</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    </CardContent>
);


const HealthPistonView = ({ onBack }: { onBack: () => void }) => {
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

    return <PistonEditorView topicId="health" topicName={`Health: ${activity}`} onBack={onBack} onEditTopicName={() => setIsEditingActivity(true)} />;
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

const TopicPistonView = ({ topicId, onBack }: { topicId: string, onBack: () => void }) => {
    const { pistons } = useAuth();
    const topicName = topicId === 'health' ? `Health: ${pistons.health?.activity || 'Activity'}` : topicId;
    return <PistonEditorView topicId={topicId} topicName={topicName} onBack={onBack} />;
};

const PistonEditorView = ({ topicId, topicName, onBack, onEditTopicName }: { topicId: string, topicName: string, onBack: () => void, onEditTopicName?: () => void }) => {
    const { pistons, setPistons } = useAuth();
    const [editingPiston, setEditingPiston] = useState<PistonType | null>(null);
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

    const handleTextChange = (piston: PistonType, text: string) => {
        setPistons(prev => ({
            ...prev,
            [topicId]: {
                ...prev[topicId],
                [piston]: { text }
            }
        }));
    };

    const handleStartEdit = (piston: PistonType) => {
        setEditingPiston(piston);
        setEditText(topicPistons[piston]?.text || '');
    };
    
    const handleSaveEdit = () => {
        if (editingPiston) {
            handleTextChange(editingPiston, editText);
            setEditingPiston(null);
            setEditText('');
        }
    };
    
    return (
        <CardContent className="p-4">
            <ul className="space-y-2">
                {PISTON_NAMES.map(piston => (
                    <li key={piston} className="p-2 rounded-lg bg-muted/30">
                        <div className="flex items-start gap-3">
                            <span className="mt-1">{PISTON_ICONS[piston]}</span>
                            <div className="flex-grow">
                                <h4 className="font-semibold text-sm">{piston}</h4>
                                {editingPiston === piston ? (
                                    <Textarea 
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        onBlur={handleSaveEdit}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); } }}
                                        placeholder={pistonPlaceholders[piston]}
                                        className="mt-1 bg-background text-sm min-h-[4rem] border-primary"
                                        autoFocus
                                        rows={2}
                                    />
                                ) : (
                                    <div
                                        onClick={() => handleStartEdit(piston)}
                                        className="text-sm text-muted-foreground min-h-[2.5rem] pt-1.5 cursor-text w-full"
                                    >
                                        {topicPistons[piston]?.text ? (
                                            <p className="whitespace-pre-wrap">{topicPistons[piston]?.text}</p>
                                        ) : (
                                            <p className="italic opacity-70">{pistonPlaceholders[piston]}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </CardContent>
    );
};

