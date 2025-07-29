
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Heart, Briefcase, TrendingUp, ChevronLeft, Target, HandHeart, Search, Sprout, Blocks, Mic, Smile, Shield } from 'lucide-react';
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

interface PistonsHeadProps {
  isPistonsHeadOpen: boolean;
  setIsPistonsHeadOpen: (isOpen: boolean) => void;
}

export function PistonsHead({ isPistonsHeadOpen, setIsPistonsHeadOpen }: PistonsHeadProps) {
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
  
  const handleTopicSelect = (topicId: string, view: 'wealth' | 'growth') => {
      setSelectedTopicId(topicId);
      setCurrentView(view);
  }

  const onBack = () => {
    if (selectedTopicId) {
        setSelectedTopicId(null);
    } else {
        setCurrentView('main');
    }
  };
  
  const { pistons } = useAuth();
  
  const getTopicName = () => {
    switch (currentView) {
      case 'health':
        return `Health: ${pistons.health?.activity || 'Activity'}`;
      case 'wealth':
        return selectedTopicId || 'Select Wealth Topic';
      case 'growth':
        return selectedTopicId || 'Select Growth Topic';
      default: return 'Pistons of Intention';
    }
  };
  const topicName = getTopicName();

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
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
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
                <Card className="w-96 shadow-2xl border-2 border-primary/50 bg-card">
                    <CardHeader 
                        className="p-3 relative cursor-grab flex items-center justify-between" 
                        {...attributes} 
                        {...listeners}
                    >
                         <div className="flex-1">
                             {currentView !== 'main' && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onBack(); }}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                             )}
                        </div>
                        <div className="flex-1 text-center">
                            <CardTitle className="text-base truncate" title={topicName as string}>
                                {topicName}
                            </CardTitle>
                        </div>
                        <div className="flex-1 flex justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </Button>
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
        <p className="text-muted-foreground text-center mb-6 text-sm">Select a category to define or review your core motivations.</p>
        <div className="grid grid-cols-1 gap-4">
            <Button onClick={() => onSelect('health')} variant="outline" className="h-16 text-lg"><Heart className="mr-3 h-6 w-6 text-red-500"/>Health</Button>
            <Button onClick={() => onSelect('wealth')} variant="outline" className="h-16 text-lg"><Briefcase className="mr-3 h-6 w-6 text-green-500"/>Wealth</Button>
            <Button onClick={() => onSelect('growth')} variant="outline" className="h-16 text-lg"><TrendingUp className="mr-3 h-6 w-6 text-blue-500"/>Growth</Button>
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
    const topicPistons = pistons[topicId] || {};

    const handleTextChange = (piston: PistonType, text: string) => {
        setPistons(prev => ({
            ...prev,
            [topicId]: {
                ...prev[topicId],
                [piston]: { text }
            }
        }));
    };

    return (
        <div className="flex flex-col h-[60vh] md:h-[50vh]">
            <ScrollArea className="flex-grow min-h-0">
                <div className="p-4 space-y-3">
                {PISTON_NAMES.map(piston => (
                    <div key={piston} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1.5">
                            {PISTON_ICONS[piston]}
                            <label htmlFor={`piston-${piston}`} className="font-semibold text-sm text-foreground">{piston}</label>
                        </div>
                        <Textarea 
                            id={`piston-${piston}`}
                            value={topicPistons[piston]?.text || ''}
                            onChange={(e) => handleTextChange(piston, e.target.value)}
                            placeholder={`Define your intention for ${piston.toLowerCase()}...`}
                            className="mt-1 bg-transparent border-0 ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                            rows={2}
                        />
                    </div>
                ))}
                </div>
            </ScrollArea>
        </div>
    );
};
