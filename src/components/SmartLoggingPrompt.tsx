
"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ListChecks, CheckCircle, BrainCircuit, Activity, Workflow, Zap, HeartPulse, Brain } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import type { Project, PostSessionReview, ExerciseDefinition, HabitEquation, MetaRule, Resource } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

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
    mindProgrammingDefinitions,
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
        
        const equation = allEquations.find(eq => eq.linkedResourceId === habit.id);
        const rules = metaRules.filter(rule => equation?.metaRuleIds?.includes(rule.id));
        
        const positiveMechanism = mechanismCards.find(m => m.id === habit.newResponse?.resourceId);
        const negativeMechanism = mechanismCards.find(m => m.id === habit.response?.resourceId);

        return {
            habit,
            rules,
            equation,
            technique: null,
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
            className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg flex flex-col items-start gap-3"
            >
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0">{currentPrompt.icon}</div>
                <h3 className="font-semibold text-foreground">{currentPrompt.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground w-full">{currentPrompt.description}</p>
            <div className="w-full space-y-3">
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
                     <ScrollArea className="max-h-64 w-full">
                        <div className="space-y-4 pr-4">
                            {focusContext.map(({ habit, positiveMechanism, negativeMechanism }) => (
                                <div key={habit.id} className="space-y-3">
                                    <button className="font-semibold flex items-center gap-2 hover:underline w-full text-left" onClick={(e) => openHabitDetailPopup(habit.id, e)}>
                                      <Zap className="h-4 w-4 text-yellow-500"/> Habit: <span className="text-primary truncate">{habit.name}</span>
                                    </button>
                                    <div className="grid grid-cols-1 gap-3">
                                        {negativeMechanism && (
                                            <Card className="bg-red-900/10 border-red-500/30">
                                                <CardHeader className="p-2">
                                                    <CardTitle className="text-sm text-red-600 dark:text-red-400">Negative Mechanism</CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-2 pt-0 text-xs text-muted-foreground">
                                                    {habit.response?.visualize || '...'}
                                                </CardContent>
                                            </Card>
                                        )}
                                        {positiveMechanism && (
                                             <Card className="bg-green-900/10 border-green-500/30">
                                                <CardHeader className="p-2">
                                                    <CardTitle className="text-sm text-green-600 dark:text-green-400">Positive Mechanism</CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-2 pt-0 text-xs text-muted-foreground">
                                                    {habit.newResponse?.action || '...'}
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
                <div className="flex gap-2 w-full">
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

