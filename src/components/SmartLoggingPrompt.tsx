
"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ListChecks, CheckCircle, BrainCircuit, Activity, Workflow, Zap, HeartPulse } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import type { Project, PostSessionReview, ExerciseDefinition, HabitEquation, MetaRule, Resource } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface SmartLoggingPromptProps {
  promptType: 'empty' | 'inactive' | 'completed' | 'focus' | null;
  activeProjects: Project[];
  onOpenInterruptModal: () => void;
  currentSlot: string;
  activeFocusSession: { activity: any } | null;
  lastSessionReview: PostSessionReview | null;
  mindProgrammingDefinitions: ExerciseDefinition[];
  habitCards: Resource[];
  pillarEquations: Record<string, HabitEquation[]>;
  metaRules: MetaRule[];
  deepWorkDefinitions: ExerciseDefinition[];
  upskillDefinitions: ExerciseDefinition[];
}

export function SmartLoggingPrompt({ 
    promptType, 
    activeProjects, 
    onOpenInterruptModal, 
    currentSlot, 
    activeFocusSession, 
    lastSessionReview,
    mindProgrammingDefinitions,
    habitCards,
    pillarEquations,
    metaRules,
    deepWorkDefinitions,
    upskillDefinitions,
}: SmartLoggingPromptProps) {
  const router = useRouter();

  const handleAddTaskClick = () => {
    const slotCardId = `slot-card-${currentSlot.replace(/\s+/g, '-')}`;
    const slotElement = document.getElementById(slotCardId);
    slotElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  
  const allEquations = React.useMemo(() => Object.values(pillarEquations).flat(), [pillarEquations]);

  const focusContext = React.useMemo(() => {
    if (!activeFocusSession?.activity) return null;
  
    const { activity } = activeFocusSession;
    
    // This is the direct link from the scheduled activity.
    const habitIds = activity.habitEquationIds || [];

    if (habitIds.length === 0) return null;
    
    const uniqueHabitIds = [...new Set(habitIds)];

    const habitDetails = uniqueHabitIds.map(habitId => {
        const habit = habitCards.find(h => h.id === habitId);
        if (!habit) return null;
        
        // Find equations that link to THIS habit
        const equation = allEquations.find(eq => eq.linkedResourceId === habit.id);
        const rules = metaRules.filter(rule => equation?.metaRuleIds?.includes(rule.id));

        return {
            habit,
            rules,
            equation,
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
    
    return habitDetails.length > 0 ? habitDetails : null;
  }, [activeFocusSession, allEquations, metaRules, habitCards]);


  const prompts = {
    empty: {
      icon: <Lightbulb className="h-6 w-6 text-yellow-500" />,
      title: "Your current slot is empty.",
      description: "What's your focus right now? Let's get something scheduled.",
      actions: [
        { label: "Add Task to Agenda", onClick: handleAddTaskClick },
        { label: "Log Interruption", onClick: onOpenInterruptModal, variant: "secondary" },
      ]
    },
    inactive: {
      icon: <ListChecks className="h-6 w-6 text-blue-500" />,
      title: "You have tasks scheduled.",
      description: "Ready to start a focus session and make progress?",
       actions: [
        { label: "View Agenda", onClick: handleAddTaskClick },
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
                     <ScrollArea className="max-h-60 w-full">
                        <div className="space-y-3 pr-4">
                        {focusContext.map(({ habit, rules, equation }) => (
                            <div key={habit.id} className="p-3 rounded-md bg-muted/50 border text-sm">
                                <p className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500"/> Habit: <span className="text-primary">{habit.name}</span></p>
                                {equation && (
                                    <div className="mt-2 pt-2 border-t">
                                        <p className="font-medium text-xs mb-1">Equation: <span className="text-muted-foreground">{equation.outcome}</span></p>
                                    </div>
                                )}
                                {rules.length > 0 && (
                                    <div className="mt-2 pt-2 border-t">
                                        <h4 className="font-medium text-xs mb-1">Meta-Rules:</h4>
                                        <ul className="space-y-1 list-disc list-inside text-xs">
                                            {rules.map(rule => <li key={rule.id}>{rule.text}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {(habit.stoppers && habit.stoppers.length > 0) && (
                                    <div className="mt-2 pt-2 border-t">
                                        <h4 className="font-semibold text-xs mb-1 text-red-500">Urges / Resistance</h4>
                                        <ul className="pl-2 space-y-1 text-xs">
                                            {(habit.stoppers || []).map(stopper => {
                                                const technique = mindProgrammingDefinitions.find(t => t.id === stopper.linkedTechniqueId);
                                                return (
                                                    <li key={stopper.id}>
                                                        <span className="font-medium">{stopper.text}</span>
                                                        {technique && (
                                                            <p className="text-blue-600 dark:text-blue-400 pl-4">↳ Technique: {technique.name}</p>
                                                        )}
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    </div>
                                )}
                                {(habit.strengths && habit.strengths.length > 0) && (
                                    <div className="mt-2 pt-2 border-t">
                                        <h4 className="font-semibold text-xs mb-1 text-green-600">Truths / Reinforcements</h4>
                                        <ul className="list-disc list-inside pl-2 space-y-0.5 text-xs">
                                            {(habit.strengths || []).map(strength => <li key={strength.id}>{strength.text}</li>)}
                                        </ul>
                                    </div>
                                )}
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
