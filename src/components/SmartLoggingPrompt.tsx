
"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ListChecks, CheckCircle, BrainCircuit, Activity, Workflow, Zap, HeartPulse, Brain, PlusCircle, X, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import type { Project, PostSessionReview, ExerciseDefinition, HabitEquation, MetaRule, Resource, Stopper, Strength } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';

interface SmartLoggingPromptProps {
  promptType: 'empty' | 'inactive' | 'completed' | 'focus' | null;
  activeProjects: Project[];
  onOpenInterruptModal: () => void;
  currentSlot: string;
  activeFocusSession: { activity: any } | null;
  lastSessionReview: PostSessionReview | null;
  openMindsetTechniquePopup: (techniqueId: string, event: React.MouseEvent) => void;
  openHabitDetailPopup: (habitId: string, event: React.MouseEvent) => void;
}

const ResistanceSection = React.memo(({ habit, isNegative }: { habit: Resource, isNegative: boolean }) => {
    const { setResources, mindProgrammingDefinitions, handleDeleteStopper } = useAuth();
    const [newStopperText, setNewStopperText] = React.useState('');
    const placeholder = isNegative ? "Log an urge..." : "Log a resistance...";

    const handleAddStopper = () => {
        if (!newStopperText.trim()) return;
        const newStopper: Stopper = {
            id: `stopper_${Date.now()}`,
            text: newStopperText.trim(),
            status: 'none',
        };
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                return { ...r, stoppers: [...(r.stoppers || []), newStopper] };
            }
            return r;
        }));
        setNewStopperText('');
    };

    const handleLinkTechnique = (stopperId: string, techniqueId: string | null) => {
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                const updatedStoppers = (r.stoppers || []).map(s => 
                    s.id === stopperId ? { ...s, linkedTechniqueId: techniqueId === null ? undefined : techniqueId } : s
                );
                return { ...r, stoppers: updatedStoppers };
            }
            return r;
        }));
    };
    
    return (
        <div className="space-y-2">
            <h4 className="font-semibold text-xs text-muted-foreground">{isNegative ? 'Urges' : 'Resistance'}</h4>
            {(habit.stoppers || []).length > 0 && (
                <ul className="text-xs space-y-1">
                    {(habit.stoppers || []).map(s => {
                        const linkedTechnique = mindProgrammingDefinitions.find(t => t.id === s.linkedTechniqueId);
                        return (
                            <li key={s.id} className="border-t pt-2 group/stopper">
                                <div className="flex justify-between items-start">
                                    <p>{s.text}</p>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/stopper:opacity-100" onClick={() => handleDeleteStopper(habit.id, s.id)}>
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="xs" className="text-xs h-6 px-2">
                                                <PlusCircle className="h-3.5 w-3.5 mr-1"/>
                                                {linkedTechnique ? 'Change' : 'Assign'} Technique
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-56 p-0 z-[150]">
                                            <Select onValueChange={(techId) => handleLinkTechnique(s.id, techId)}>
                                                <SelectTrigger><SelectValue placeholder="Select a technique..." /></SelectTrigger>
                                                <SelectContent>
                                                    {mindProgrammingDefinitions.map(tech => (
                                                        <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </PopoverContent>
                                    </Popover>
                                    {linkedTechnique && (
                                        <Badge variant="secondary" className="font-normal truncate flex-1">
                                            <span className="truncate">{linkedTechnique.name}</span>
                                             <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 -mr-1" onClick={() => handleLinkTechnique(s.id, null)}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </Badge>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
            <div className="flex gap-2">
                <Input
                    value={newStopperText}
                    onChange={(e) => setNewStopperText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddStopper(); }}
                    placeholder={placeholder}
                    className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAddStopper} className="h-8">Add</Button>
            </div>
        </div>
    );
});
ResistanceSection.displayName = 'ResistanceSection';

const TruthSection = React.memo(({ habit }: { habit: Resource }) => {
    const { setResources, handleDeleteStrength } = useAuth();
    const [newStrengthText, setNewStrengthText] = React.useState('');

    const handleAddStrength = () => {
        if (!newStrengthText.trim()) return;
        const newStrength: Strength = {
            id: `strength_${Date.now()}`,
            text: newStrengthText.trim(),
        };
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                return { ...r, strengths: [...(r.strengths || []), newStrength] };
            }
            return r;
        }));
        setNewStrengthText('');
    };

    return (
        <div className="space-y-2">
            <h4 className="font-semibold text-xs text-muted-foreground">Truths / Reinforcements</h4>
            {(habit.strengths || []).length > 0 && (
                <ul className="text-xs list-disc list-inside space-y-1">
                    {(habit.strengths || []).map(s => (
                      <li key={s.id} className="group/truth flex items-center justify-between">
                        <span>{s.text}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/truth:opacity-100" onClick={() => handleDeleteStrength(habit.id, s.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </li>
                    ))}
                </ul>
            )}
            <div className="flex gap-2">
                <Input
                    value={newStrengthText}
                    onChange={(e) => setNewStrengthText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddStrength(); }}
                    placeholder="Log a reinforcing truth..."
                    className="h-8 text-xs"
                />
                <Button size="sm" onClick={handleAddStrength} className="h-8">Add</Button>
            </div>
        </div>
    );
});
TruthSection.displayName = 'TruthSection';

export function SmartLoggingPrompt({ 
    promptType, 
    activeProjects, 
    onOpenInterruptModal, 
    currentSlot, 
    activeFocusSession, 
    lastSessionReview,
    openMindsetTechniquePopup,
    openHabitDetailPopup,
}: SmartLoggingPromptProps) {
  const router = useRouter();
  const { 
    pillarEquations,
    metaRules,
    habitCards,
    mechanismCards,
  } = useAuth();

  const allEquations = React.useMemo(() => Object.values(pillarEquations).flat(), [pillarEquations]);

  const focusContext = React.useMemo(() => {
    if (!activeFocusSession?.activity?.habitEquationIds) return null;
    
    const habitIds = activeFocusSession.activity.habitEquationIds;
    if (habitIds.length === 0) return null;
    
    const uniqueHabitIds = [...new Set(habitIds)];

    const habitDetails = uniqueHabitIds.map(habitId => {
        const habit = habitCards.find(h => h.id === habitId);
        if (!habit) return null;
        
        const positiveMechanism = mechanismCards.find(m => m.id === habit.newResponse?.resourceId);
        const negativeMechanism = mechanismCards.find(m => m.id === habit.response?.resourceId);

        return {
            habit,
            positiveMechanism,
            negativeMechanism,
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
    
    return habitDetails.length > 0 ? habitDetails : null;
  }, [activeFocusSession, allEquations, metaRules, habitCards, mechanismCards]);

  const prompts = {
    empty: {
      icon: <Lightbulb className="h-6 w-6 text-yellow-500" />,
      title: "Your current slot is empty.",
      description: "What's your focus right now? Let's get something scheduled.",
      actions: [
        { label: "Add Task to Agenda", onClick: () => router.push('/my-plate') },
        { label: "Log Interruption", onClick: onOpenInterruptModal, variant: "secondary" },
      ]
    },
    inactive: {
      icon: <ListChecks className="h-6 w-6 text-blue-500" />,
      title: "You have tasks scheduled.",
      description: "Ready to start a focus session and make progress?",
       actions: [
        { label: "View Agenda", onClick: () => router.push('/my-plate') },
        { label: "Log Interruption", onClick: onOpenInterruptModal, variant: "secondary" },
      ]
    },
    completed: {
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
      title: "Great work! You have time left in this slot.",
      description: "What's next? You could tackle a task for an active project.",
      actions: [
        { label: "Log Interruption", onClick: onOpenInterruptModal, variant: "secondary" },
      ]
    },
    focus: {
        icon: <BrainCircuit className="h-6 w-6 text-purple-500" />,
        title: "Focus Session Active",
        description: "Your defined systems are running. Stay on task.",
        actions: []
    }
  };

  const currentPrompt = promptType ? prompts[promptType] : null;

  if (!currentPrompt) return null;

  return (
    <AnimatePresence>
      {currentPrompt && (
        <div className="fixed bottom-24 right-6 z-50 max-w-sm w-full">
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg flex flex-col items-start gap-3 max-h-[calc(100vh-7rem)]"
            >
            <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex-shrink-0">{currentPrompt.icon}</div>
                <h3 className="font-semibold text-foreground">{currentPrompt.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground w-full flex-shrink-0">{currentPrompt.description}</p>
            
            <div className="w-full space-y-3 flex-grow min-h-0">
                {promptType === 'completed' && activeProjects.length > 0 && (
                    <div className="w-full">
                        <p className="text-xs text-left font-semibold mb-2">Active Projects:</p>
                        <div className="flex flex-wrap gap-2">
                            {activeProjects.map(p => (
                                <Button key={p.id} size="sm" variant="outline" onClick={() => router.push(`/deep-work?projectId=${p.id}`)}>
                                    {p.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
                 {promptType === 'focus' && focusContext && (
                     <ScrollArea className="w-full h-full">
                        <div className="space-y-4 pr-4">
                            {focusContext.map(({ habit, positiveMechanism, negativeMechanism }) => (
                                <div key={habit.id} className="space-y-3">
                                    <div className="font-semibold flex items-center gap-2 cursor-pointer" onClick={(e) => openHabitDetailPopup(habit.id, e)}>
                                      <Zap className="h-4 w-4 text-yellow-500"/> Habit: <span className="text-primary truncate">{habit.name}</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {negativeMechanism && (
                                            <Card className="bg-red-900/10 border-red-500/30">
                                                <CardHeader className="p-2">
                                                    <CardTitle className="text-sm text-red-600 dark:text-red-400">{negativeMechanism.name}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-2 pt-0 text-xs text-muted-foreground space-y-2">
                                                  <p><span className="font-semibold text-foreground">Response:</span> {habit.response?.text}</p>
                                                  <ResistanceSection habit={habit} isNegative={true} />
                                                </CardContent>
                                            </Card>
                                        )}
                                        {positiveMechanism && (
                                             <Card className="bg-green-900/10 border-green-500/30">
                                                <CardHeader className="p-2">
                                                    <CardTitle className="text-sm text-green-600 dark:text-green-400">{positiveMechanism.name}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-2 pt-0 text-xs text-muted-foreground space-y-2">
                                                  <p><span className="font-semibold text-foreground">New Response:</span> {habit.newResponse?.text}</p>
                                                  <ResistanceSection habit={habit} isNegative={false} />
                                                  <TruthSection habit={habit} />
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
                <div className="flex gap-2 w-full flex-shrink-0">
                    {currentPrompt.actions.map(action => (
                        <Button key={action.label} size="sm" variant={action.variant as any} onClick={action.onClick} className="flex-1">
                            {action.label}
                        </Button>
                    ))}
                </div>
            </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
