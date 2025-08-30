
"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ListChecks, CheckCircle, BrainCircuit } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import type { Project } from '@/types/workout';

interface SmartLoggingPromptProps {
  promptType: 'empty' | 'inactive' | 'completed' | null;
  activeProjects: Project[];
  onOpenInterruptModal: () => void;
  currentSlot: string;
}

export function SmartLoggingPrompt({ promptType, activeProjects, onOpenInterruptModal, currentSlot }: SmartLoggingPromptProps) {
  const router = useRouter();

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
  };

  const currentPrompt = promptType ? prompts[promptType] : null;

  return (
    <AnimatePresence>
      {currentPrompt && (
        <div className="fixed bottom-6 left-6 z-50 max-w-sm w-full">
            <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg flex flex-col items-center md:items-start gap-4"
            >
            <div className="flex-shrink-0">{currentPrompt.icon}</div>
            <div className="flex-grow text-center md:text-left">
                <h3 className="font-semibold text-foreground">{currentPrompt.title}</h3>
                <p className="text-sm text-muted-foreground">{currentPrompt.description}</p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-stretch justify-center gap-2 w-full">
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
                <div className="flex gap-2 mt-2 w-full">
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
