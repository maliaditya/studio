
"use client";

import React, { useMemo } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from './ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { BookCopy, Link as LinkIcon, Briefcase, ExternalLink, Globe, Workflow } from 'lucide-react';
import type { ExerciseDefinition, Resource, DatedWorkout } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays } from 'date-fns';

interface IntentionDetailModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  intention: ExerciseDefinition | null;
}

const productivityLevels = [
    { level: 'L1', min: 15, max: 30, description: 'Just showing up', zone: '⚪️ Entry Zone' },
    { level: 'L2', min: 30, max: 45, description: 'Light touch / spark', zone: '⚪️ Entry Zone' },
    { level: 'L3', min: 45, max: 60, description: 'Single Pomodoro session', zone: '⚪️ Entry Zone' },
    { level: 'L4', min: 60, max: 90, description: 'Basic learner habit', zone: '🟢 Stable Zone' },
    { level: 'L5', min: 90, max: 120, description: 'Focused beginner phase', zone: '🟢 Stable Zone' },
    { level: 'L6', min: 120, max: 150, description: 'Mini deep work commitment', zone: '🟢 Stable Zone' },
    { level: 'L7', min: 150, max: 180, description: 'Structured discipline zone', zone: '🟢 Stable Zone' },
    { level: 'L8', min: 180, max: 210, description: 'Daily scholar mode', zone: '🟡 Progress Zone' },
    { level: 'L9', min: 210, max: 240, description: 'Solid effort / Part-time student', zone: '🟡 Progress Zone' },
    { level: 'L10', min: 240, max: 300, description: 'Full-time learner level', zone: '🟡 Progress Zone' },
    { level: 'L11', min: 300, max: 360, description: 'Deep learner zone', zone: '🟡 Progress Zone' },
    { level: 'L12', min: 360, max: 420, description: 'Advanced practice / Bootcamp ready', zone: '🟠 High Intensity' },
    { level: 'L13', min: 420, max: 480, description: 'Peak state zone', zone: '🟠 High Intensity' },
    { level: 'L14', min: 480, max: 540, description: 'Monastic discipline', zone: '🔴 Extreme Zone' },
    { level: 'L15', min: 540, max: 600, description: 'Total immersion day', zone: '🔴 Extreme Zone' },
    { level: 'L16', min: 600, max: 660, description: 'Elite performer stretch', zone: '🔴 Extreme Zone' },
    { level: 'L17', min: 660, max: 720, description: 'Near-max capacity', zone: '🔴 Extreme Zone' },
    { level: 'L18', min: 720, max: 780, description: 'Obsessive learner', zone: '🔴 Extreme Zone' },
    { level: 'L19', min: 780, max: 900, description: 'Burning fuel — not sustainable daily', zone: '🔥 Overdrive Zone' },
    { level: 'L20', min: 900, max: Infinity, description: 'Legendary grind day (Rare / Purpose-driven only)', zone: '⚠️ Apex Zone' },
];

export function IntentionDetailModal({ isOpen, onOpenChange, intention }: IntentionDetailModalProps) {
  const { upskillDefinitions, deepWorkDefinitions, allUpskillLogs, allDeepWorkLogs } = useAuth();

  const { linkedLearningTasks, linkedWorkTasks, totalEstimatedHours } = useMemo(() => {
    if (!intention) return { linkedLearningTasks: [], linkedWorkTasks: [], totalEstimatedHours: 0 };
    
    const learningTasks = (intention.linkedUpskillIds || []).map(id => upskillDefinitions.find(d => d.id === id)).filter(Boolean) as ExerciseDefinition[];
    const workTasks = (intention.linkedDeepWorkIds || []).map(id => deepWorkDefinitions.find(d => d.id === id)).filter(Boolean) as ExerciseDefinition[];

    const totalLearningMinutes = learningTasks.reduce((sum, task) => sum + (task.estimatedDuration || 0), 0);
    const totalWorkMinutes = workTasks.reduce((sum, task) => sum + (task.estimatedDuration || 0), 0);
    const intentionMinutes = intention.estimatedDuration || 0;
    
    const totalMinutes = intentionMinutes + totalLearningMinutes + totalWorkMinutes;
    const totalHours = totalMinutes / 60;

    return { linkedLearningTasks: learningTasks, linkedWorkTasks: workTasks, totalEstimatedHours: totalHours };
  }, [intention, upskillDefinitions, deepWorkDefinitions]);
  
  const productivityStats = useMemo(() => {
    const calculateWeeklyAverage = (logs: DatedWorkout[], durationField: 'reps' | 'weight') => {
      if (!logs) return 0;
      
      const today = new Date();
      let totalMinutes = 0;
      
      for (let i = 0; i < 7; i++) {
        const day = subDays(today, i);
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayLog = logs.find(log => log.date === dateKey);
        if (dayLog) {
          totalMinutes += dayLog.exercises.reduce((total, ex) => total + ex.loggedSets.reduce((sum, set) => sum + (set[durationField] || 0), 0), 0);
        }
      }
      return totalMinutes / 7; // Average daily minutes over the last 7 days
    };
    
    const avgUpskillMinutes = calculateWeeklyAverage(allUpskillLogs, 'reps');
    const avgDeepWorkMinutes = calculateWeeklyAverage(allDeepWorkLogs, 'weight');

    const totalProductiveMinutes = avgUpskillMinutes + avgDeepWorkMinutes;
    const avgProductiveHours = totalProductiveMinutes / 60;
    const currentLevel = productivityLevels.find(l => totalProductiveMinutes >= l.min && totalProductiveMinutes < l.max) || null;

    return {
      avgProductiveHours: avgProductiveHours.toFixed(1),
      currentLevel: currentLevel?.level || 'N/A'
    };
  }, [allUpskillLogs, allDeepWorkLogs]);

  if (!intention) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Conceptual Flow: {intention.name}</DialogTitle>
          <DialogDescription>
            This diagram illustrates the strategic path from your current state to your desired outcome.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0 flex items-center justify-center p-8">
            <div className="relative w-full h-full max-w-3xl">
                {/* SVG for lines */}
                <svg className="absolute top-0 left-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                        <marker id="arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
                        </marker>
                    </defs>
                    {/* Base line */}
                    <line x1="5%" y1="90%" x2="95%" y2="90%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                    {/* Left line */}
                    <line x1="5%" y1="90%" x2="50%" y2="10%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                    {/* Right line */}
                    <line x1="50%" y1="10%" x2="95%" y2="90%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                </svg>

                {/* Text labels */}
                 <div className="absolute left-[5%] bottom-[10%] -translate-x-1/2 translate-y-[150%] text-center">
                    <p className="font-semibold text-foreground">Current state</p>
                    <div className="text-xs text-muted-foreground mt-1">
                        <p>Avg. Productive: {productivityStats.avgProductiveHours}h/day</p>
                        <p>Productivity Level: {productivityStats.currentLevel}</p>
                    </div>
                </div>
                
                <div className="absolute left-1/2 top-[10%] -translate-x-1/2 -translate-y-full text-center w-full px-4">
                    <p className="font-semibold text-foreground text-lg">Solution</p>
                    <div className="text-sm text-muted-foreground w-full max-w-sm mx-auto p-2 border rounded-md bg-background/50 backdrop-blur-sm mt-2">
                        <p className="font-bold text-primary mb-2">Total Est: {totalEstimatedHours.toFixed(1)}h</p>
                        <ScrollArea className="max-h-32">
                          <ul className="text-xs list-disc list-inside space-y-1 text-left">
                              {[...linkedWorkTasks, ...linkedLearningTasks].map(task => (
                                  <li key={task.id} className="truncate" title={task.name}>
                                      {task.name}
                                      {task.estimatedDuration && <span className="font-mono text-muted-foreground/80"> - {(task.estimatedDuration / 60).toFixed(1)}h</span>}
                                  </li>
                              ))}
                          </ul>
                        </ScrollArea>
                    </div>
                </div>

                <div className="absolute right-[5%] bottom-[10%] translate-x-1/2 translate-y-[150%] text-center">
                     <p className="font-semibold text-foreground">Outcome</p>
                     <p className="text-sm text-muted-foreground">To be defined</p>
                </div>

                <div className="absolute left-1/2 bottom-[10%] -translate-x-1/2 translate-y-[120%] text-center w-full px-4">
                     <p className="font-semibold text-foreground text-lg">Intention</p>
                     <p className="text-sm text-muted-foreground truncate" title={intention.name}>
                        {intention.name}
                     </p>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
