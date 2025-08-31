
"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ListChecks, CheckCircle, BrainCircuit, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import type { Project, PostSessionReview } from '@/types/workout';

interface SmartLoggingPromptProps {
  promptType: 'empty' | 'inactive' | 'completed' | 'focus' | null;
  activeProjects: Project[];
  onOpenInterruptModal: () => void;
  currentSlot: string;
  activeFocusSession: { activity: any } | null;
  lastSessionReview: PostSessionReview | null;
}

export function SmartLoggingPrompt({ promptType, activeProjects, onOpenInterruptModal, currentSlot, activeFocusSession, lastSessionReview }: SmartLoggingPromptProps) {
  const router = useRouter();
  const { mindProgrammingDefinitions } = useAuth();

  const handleAddTaskClick = () => {
    const slotCardId = `slot-card-${currentSlot.replace(/\s+/g, '-')}`;
    const slotElement = document.getElementById(slotCardId);
    slotElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

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
        description: lastSessionReview ? "Based on your last session, here's what you noted." : "Stay on task. Use a mindset technique if you feel resistance.",
        actions: [
            { label: "End Session Early", onClick: () => {}, variant: "destructive" },
        ]
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
                {promptType === 'focus' && lastSessionReview && (
                    <div className="p-3 rounded-md bg-muted/50 border text-sm">
                        <p className="font-semibold">Last Session's Insight:</p>
                        <p className="mt-1"><span className="font-medium text-muted-foreground">Resistance:</span> {lastSessionReview.resistance}</p>
                        <p className="mt-1"><span className="font-medium text-muted-foreground">Helpful Technique:</span> {mindProgrammingDefinitions.find(def => def.id === lastSessionReview.helpfulTechniqueId)?.name || 'Unknown'}</p>
                    </div>
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
