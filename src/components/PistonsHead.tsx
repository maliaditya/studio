
"use client";

import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Heart, Briefcase, TrendingUp, ChevronLeft } from 'lucide-react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { PistonType, PistonsData } from '@/types/workout';

const PISTON_NAMES: PistonType[] = [
  'Desire', 'Curiosity', 'Truth-Seeking', 'Contribution', 
  'Growth', 'Expression', 'Pleasure', 'Protection'
];

// Main component that orchestrates the popups
export function PistonsHead() {
  const { isPistonsHeadOpen, setIsPistonsHeadOpen } = useAuth();
  const [currentView, setCurrentView] = useState<'main' | 'health' | 'wealth' | 'growth'>('main');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const handleClose = () => {
    setIsPistonsHeadOpen(false);
    setTimeout(() => {
        setCurrentView('main');
        setSelectedTopicId(null);
    }, 300); // Delay reset to allow for closing animation
  };

  const handleViewChange = (newView: 'main' | 'health' | 'wealth' | 'growth') => {
    setCurrentView(newView);
  };
  
  const handleTopicSelect = (topicId: string, view: 'wealth' | 'growth') => {
      setSelectedTopicId(topicId);
      setCurrentView(view);
  }

  const renderContent = () => {
    switch (currentView) {
      case 'health':
        return <HealthPistonView onBack={() => handleViewChange('main')} />;
      case 'wealth':
        return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} onBack={() => handleViewChange('main')} /> : <TopicSelector onSelect={handleTopicSelect} type="wealth" onBack={() => handleViewChange('main')} />;
      case 'growth':
         return selectedTopicId ? <TopicPistonView topicId={selectedTopicId} onBack={() => handleViewChange('main')} /> : <TopicSelector onSelect={handleTopicSelect} type="growth" onBack={() => handleViewChange('main')} />;
      default:
        return <MainPistonView onSelect={handleViewChange} />;
    }
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
      <Dialog open={isPistonsHeadOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
            {renderContent()}
        </DialogContent>
      </Dialog>
    </>
  );
}

// The initial view with the 3 options
const MainPistonView = ({ onSelect }: { onSelect: (view: 'health' | 'wealth' | 'growth') => void }) => (
    <div className="text-center p-4">
        <h2 className="text-xl font-bold mb-2">Pistons of Intention</h2>
        <p className="text-muted-foreground mb-6">Select a category to define or review your core motivations.</p>
        <div className="grid grid-cols-1 gap-4">
            <Button onClick={() => onSelect('health')} variant="outline" className="h-16 text-lg"><Heart className="mr-3 h-6 w-6 text-red-500"/>Health</Button>
            <Button onClick={() => onSelect('wealth')} variant="outline" className="h-16 text-lg"><Briefcase className="mr-3 h-6 w-6 text-green-500"/>Wealth</Button>
            <Button onClick={() => onSelect('growth')} variant="outline" className="h-16 text-lg"><TrendingUp className="mr-3 h-6 w-6 text-blue-500"/>Growth</Button>
        </div>
    </div>
);

// View for the Health category, including first-time setup
const HealthPistonView = ({ onBack }: { onBack: () => void }) => {
    const { pistons, setPistons } = useAuth();
    const [activity, setActivity] = useState(pistons.healthActivity || '');
    const [isEditingActivity, setIsEditingActivity] = useState(!pistons.healthActivity);
    
    const handleSaveActivity = () => {
      if (activity.trim()) {
        setPistons(prev => ({...prev, healthActivity: activity.trim() }));
        setIsEditingActivity(false);
      }
    };

    if (isEditingActivity) {
        return (
            <div className="p-4">
                <Button variant="ghost" size="sm" onClick={onBack} className="mb-4"><ChevronLeft className="mr-2 h-4 w-4"/>Back</Button>
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
            </div>
        )
    }

    return <PistonEditorView topicId="health" topicName={`Health: ${activity}`} onBack={onBack} onEditTopicName={() => setIsEditingActivity(true)} />;
};

// View to select a Deep Work or Upskill topic
const TopicSelector = ({ onSelect, type, onBack }: { onSelect: (topicId: string, type: 'wealth' | 'growth') => void, type: 'wealth' | 'growth', onBack: () => void }) => {
    const { deepWorkDefinitions, upskillDefinitions } = useAuth();
    const source = type === 'wealth' ? deepWorkDefinitions : upskillDefinitions;
    const topics = [...new Set(source.map(def => def.category))];

    return (
        <div className="p-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="mb-4"><ChevronLeft className="mr-2 h-4 w-4"/>Back</Button>
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
        </div>
    )
}

// View for a specific topic (Wealth or Growth)
const TopicPistonView = ({ topicId, onBack }: { topicId: string, onBack: () => void }) => {
    return <PistonEditorView topicId={topicId} topicName={topicId} onBack={onBack} />;
};

// The main editor UI for the 8 pistons
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
        <div className="flex flex-col h-[70vh]">
            <div className="flex items-center p-4 border-b flex-shrink-0">
                 <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 h-8 w-8">
                    <ChevronLeft className="h-5 w-5"/>
                </Button>
                <h3 
                  className={`text-lg font-semibold truncate ${onEditTopicName ? 'cursor-pointer hover:underline' : ''}`} 
                  title={topicName}
                  onClick={onEditTopicName}
                >
                  {topicName}
                </h3>
            </div>
            <ScrollArea className="flex-grow min-h-0">
                <div className="p-4 space-y-4">
                {PISTON_NAMES.map(piston => (
                    <div key={piston}>
                        <Label htmlFor={`piston-${piston}`} className="font-semibold text-foreground">{piston}</Label>
                        <Textarea 
                            id={`piston-${piston}`}
                            value={topicPistons[piston]?.text || ''}
                            onChange={(e) => handleTextChange(piston, e.target.value)}
                            placeholder={`What is your intention for ${piston.toLowerCase()}?`}
                            className="mt-1"
                            rows={2}
                        />
                    </div>
                ))}
                </div>
            </ScrollArea>
        </div>
    );
};
