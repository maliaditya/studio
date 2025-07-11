
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, ArrowRight, Clock, Workflow, Play, BookText, BrainCircuit, CheckSquare, Zap } from 'lucide-react';
import type { ExerciseDefinition, DailySchedule, DatedWorkout } from '@/types/workout';
import { format, parseISO, isBefore, startOfToday, addDays, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { BreathingAnimation } from '@/components/BreathingAnimation';

const TUTORIAL_CONTENT = [
    {
      title: "Visualization to Action",
      icon: <BrainCircuit className="h-5 w-5" />,
      points: [
        "Breathe in, out — 5 times",
        "Activate PFC",
        "Visualize task: no judgment, no labels",
        "Say: “See clearly, not judge quickly”",
        "Visualize effort, form, breath",
        "Ask: “Can I do 1 rep, 1 line with control?”",
        "Act: Full focus, match visualization",
        "You’re the observer, not the doer",
        "Start"
      ]
    },
    {
      title: "Mental Checkpoint",
      icon: <CheckSquare className="h-5 w-5" />,
      points: [
        "Spot it: “What image just flashed before action?”",
        "Label it: [[Judgmental]]? [[Mastery]]? [[Shame]]? [[Ego]]? Wish or reality?",
        "Question it: “Is this true?” “Is it helping?” “Am I rushing?” “Will this keep tomorrow intact — and bring fulfillment now?”",
        "Replace it: Visualize from grounded self",
        "Detach: You are not your body",
        "Don’t chase completion. Chase comprehension. *Finishing isn’t winning if nothing sticks.*"
      ]
    },
    {
      title: "Devotion Mode",
      icon: <Zap className="h-5 w-5" />,
      points: [
        "Every sub-action is deliberate",
        "No time wasted",
        "Fully in the task — not above, not beside",
        "No judgment, no past/future",
        "Just you — merged with the motion",
        "No gap between intent and action",
        "No ego, no inner audience"
      ]
    }
];

const getProductivitySuggestion = (hours: number): { title: string; description: string } => {
    if (hours >= 8) {
        return {
            title: "Apex Zone: Monitor for Burnout",
            description: "Your output is exceptional. Ensure this pace is sustainable. Prioritize rest and recovery to maintain this high level of performance without compromising your well-being."
        };
    }
    if (hours >= 4) {
        return {
            title: "High-Intensity Zone: Optimize & Sustain",
            description: "You're in a highly productive zone. Focus on maintaining this momentum with structured breaks. Your current pace is ideal for making significant progress on key objectives."
        };
    }
    if (hours >= 2) {
        return {
            title: "Stable Zone: Build Consistency",
            description: "You have a solid, consistent work habit. Focus on maintaining this routine daily. This is the foundation from which you can build towards more intensive work sprints when needed."
        };
    }
    return {
        title: "The Truth of the Moment",
        description: "Fulfillment doesn't come from chasing feelings or perfection. It comes from taking justified action, aligned with the truth of your current moment."
    };
};

const ConceptualFlowDiagram = ({ intention, avgDailyProductiveHours }: { intention: ExerciseDefinition | null, avgDailyProductiveHours: number }) => {
    const { deepWorkDefinitions, upskillDefinitions, schedule, allDeepWorkLogs, allUpskillLogs } = useAuth();

    const { solutionTasks, outcomeObjectives, totalEstimatedMinutes } = useMemo(() => {
        if (!intention) return { solutionTasks: [], outcomeObjectives: [], totalEstimatedMinutes: 0 };

        const today = startOfToday();
        const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];

        const allDescendantIds = new Set<string>();
        const queue = [intention.id];
        const visited = new Set<string>();
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            allDescendantIds.add(currentId);
            const def = allDefs.find(d => d.id === currentId);
            if (def) {
                (def.linkedDeepWorkIds || []).forEach(childId => queue.push(childId));
                (def.linkedUpskillIds || []).forEach(childId => queue.push(childId));
            }
        }
        
        const scheduledOrPendingDefIds = new Set<string>();
        for (const dateKey in schedule) {
            const scheduleDate = parseISO(dateKey);
            const dailySchedule = schedule[dateKey] as DailySchedule;
            if (dailySchedule) {
                const isTodayOrPast = isBefore(scheduleDate, addDays(today, 1));

                Object.values(dailySchedule).flat().forEach(activity => {
                    if (activity && !activity.completed && isTodayOrPast) {
                        (activity.taskIds || []).forEach(taskId => {
                            let defId: string | undefined;
                            if (activity.type === 'deepwork') {
                               defId = allDeepWorkLogs.flatMap(l => l.exercises).find(t => t.id === taskId)?.definitionId;
                            } else if (activity.type === 'upskill') {
                               defId = allUpskillLogs.flatMap(l => l.exercises).find(t => t.id === taskId)?.definitionId;
                            }
                            if (defId && allDescendantIds.has(defId)) {
                                scheduledOrPendingDefIds.add(defId);
                            }
                        });
                    }
                });
            }
        }

        const allScheduledOrPendingDefs = allDefs.filter(def => scheduledOrPendingDefIds.has(def.id));
        
        const solutionTasks: { action: ExerciseDefinition, linkedVisualizations: ExerciseDefinition[] }[] = [];
        const outcomeObjectiveIds = new Set<string>();
        let estimatedMinutes = 0;

        const solutionLeafs = allScheduledOrPendingDefs.filter(def => {
            const isDWAction = deepWorkDefinitions.some(d => d.id === def.id) && (def.linkedDeepWorkIds?.length ?? 0) === 0;
            const isUpskillViz = upskillDefinitions.some(d => d.id === def.id) && (def.linkedUpskillIds?.length ?? 0) === 0;
            return isDWAction || isUpskillViz;
        });

        solutionLeafs.forEach(leaf => {
            estimatedMinutes += leaf.estimatedDuration || 0;
            if (upskillDefinitions.some(d => d.id === leaf.id)) {
                const parentAction = deepWorkDefinitions.find(action => (action.linkedUpskillIds || []).includes(leaf.id));
                if (parentAction && scheduledOrPendingDefIds.has(parentAction.id)) {
                    let solutionTask = solutionTasks.find(st => st.action.id === parentAction.id);
                    if (!solutionTask) {
                        solutionTask = { action: parentAction, linkedVisualizations: [] };
                        solutionTasks.push(solutionTask);
                        estimatedMinutes += parentAction.estimatedDuration || 0;
                    }
                    solutionTask.linkedVisualizations.push(leaf);
                }
            } else {
                if (!solutionTasks.some(st => st.action.id === leaf.id)) {
                    solutionTasks.push({ action: leaf, linkedVisualizations: [] });
                }
            }
        });

        solutionTasks.forEach(({ action }) => {
            deepWorkDefinitions.forEach(parent => {
                if ((parent.linkedDeepWorkIds || []).includes(action.id)) {
                    outcomeObjectiveIds.add(parent.id);
                }
            });
        });

        const outcomeObjectives = deepWorkDefinitions.filter(def => outcomeObjectiveIds.has(def.id));

        return { solutionTasks, outcomeObjectives, totalEstimatedMinutes: estimatedMinutes };
    }, [intention, schedule, deepWorkDefinitions, upskillDefinitions, allDeepWorkLogs, allUpskillLogs]);

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;

        if (days > 0) return `${days}d ${remainingHours}h ${mins}m`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };
      
    const projectedCompletion = useMemo(() => {
        if (avgDailyProductiveHours <= 0 || totalEstimatedMinutes <= 0) return null;
        const totalHours = totalEstimatedMinutes / 60;
        const days = totalHours / avgDailyProductiveHours;

        if (days < 1) {
            return `${(days * avgDailyProductiveHours).toFixed(1)} hours`;
        }
        return `${Math.ceil(days)} days`;
    }, [totalEstimatedMinutes, avgDailyProductiveHours]);


    if (!intention) return null;
    const suggestion = getProductivitySuggestion(avgDailyProductiveHours);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Workflow className="h-6 w-6 text-primary"/>
                    Conceptual Flow
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col items-center justify-between p-4">
                <div className="relative w-full h-[300px] max-w-2xl">
                    <svg className="absolute top-0 left-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                        <defs>
                            <marker id="arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
                            </marker>
                        </defs>
                        <line x1="5%" y1="90%" x2="50%" y2="20%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                        <line x1="50%" y1="20%" x2="95%" y2="90%" stroke="hsl(var(--muted-foreground))" strokeWidth="1" markerEnd="url(#arrowhead)" />
                    </svg>

                     <div className="absolute left-[5%] top-[90%] -translate-x-1/2 translate-y-4 text-center">
                        <p className="font-semibold text-foreground">Current state</p>
                        <p className="text-xs text-muted-foreground">Productivity: <strong>{avgDailyProductiveHours.toFixed(1)}h/day</strong></p>
                    </div>
                    
                    <div className="absolute left-1/2 top-[20%] -translate-x-1/2 -translate-y-[120%] text-center w-full px-4">
                        <p className="font-semibold text-foreground text-lg">Solution</p>
                         <div className="text-sm text-muted-foreground w-full max-w-sm mx-auto p-2 border rounded-md bg-background/50 backdrop-blur-sm mt-2">
                            <ScrollArea className="h-32">
                              <ul className="text-xs list-disc list-inside space-y-2 text-left">
                                  {solutionTasks.length > 0 ? (
                                    solutionTasks.map(({ action, linkedVisualizations }) => (
                                      <li key={action.id} className="font-semibold text-foreground" title={action.name}>
                                        {action.name}
                                        {linkedVisualizations.length > 0 && (
                                          <ul className="pl-4 list-['▹'] list-inside text-muted-foreground font-normal">
                                            {linkedVisualizations.map(viz => (
                                              <li key={viz.id} className="truncate" title={viz.name}>{viz.name}</li>
                                            ))}
                                          </ul>
                                        )}
                                      </li>
                                    ))
                                  ) : (
                                    <li>No actions scheduled or pending.</li>
                                  )}
                              </ul>
                            </ScrollArea>
                        </div>
                    </div>

                    <div className="absolute right-[5%] top-[90%] translate-x-1/2 translate-y-4 text-center">
                         <p className="font-semibold text-foreground">Outcome</p>
                         <div className="text-xs text-muted-foreground mt-1 max-w-[150px]">
                            {outcomeObjectives.length > 0 ? (
                              outcomeObjectives.map(obj => obj.name).join(', ')
                            ) : (
                              'No objectives targeted.'
                            )}
                         </div>
                          {totalEstimatedMinutes > 0 && (
                            <div className="mt-2 pt-2 border-t font-semibold">
                                <p className="text-xs flex items-center gap-1 justify-center"><Clock className="h-3 w-3" /> {formatDuration(totalEstimatedMinutes)}</p>
                            </div>
                          )}
                    </div>

                    <div className="absolute left-1/2 top-[90%] -translate-x-1/2 translate-y-4 text-center w-full px-4">
                         <p className="font-semibold text-foreground text-lg">Intention</p>
                         <p className="text-sm text-muted-foreground truncate" title={intention.name}>
                            {intention.name}
                         </p>
                         {projectedCompletion && (
                            <div className="mt-2 pt-2 border-t font-semibold">
                                <p className="text-xs flex items-center gap-1 justify-center"><Clock className="h-3 w-3" /> Est. {projectedCompletion}</p>
                            </div>
                         )}
                    </div>
                </div>
            </CardContent>
             <CardFooter className="text-center">
                <div className="w-full">
                    <Separator className="my-8" />
                    <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                    <p className="text-xs text-muted-foreground max-w-xl mx-auto">{suggestion.description}</p>
                </div>
            </CardFooter>
        </Card>
    );
};

const InteractiveTutorial = () => {
    const { setIsAudioPlaying } = useAuth();
    const [cardIndex, setCardIndex] = useState(0);
    const [pointIndex, setPointIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    
    const TOTAL_DURATION_MINUTES = 7;
    const TOTAL_DURATION_MS = TOTAL_DURATION_MINUTES * 60 * 1000;
    const ANIMATION_DURATION_MS = (4.5 * 6 * 1000) + (16 * 4 * 1000) + (5 * 5 * 1000); // from BreathingAnimation
    
    const totalPoints = TUTORIAL_CONTENT.reduce((sum, card) => sum + card.points.length, 0) - 1; // -1 for animation point
    const DURATION_PER_POINT_MS = (TOTAL_DURATION_MS - ANIMATION_DURATION_MS) / totalPoints;

    const currentCard = TUTORIAL_CONTENT[cardIndex];
    const currentPoint = currentCard.points[pointIndex];
    
    useEffect(() => {
        setIsAnimating(true);
        setIsAudioPlaying(true);
    }, [setIsAudioPlaying]);

    const handleNext = useCallback(() => {
        setCardIndex(prevCardIndex => {
            const currentCard = TUTORIAL_CONTENT[prevCardIndex];
            if (pointIndex < currentCard.points.length - 1) {
                setPointIndex(prevPointIndex => prevPointIndex + 1);
                return prevCardIndex;
            } else if (prevCardIndex < TUTORIAL_CONTENT.length - 1) {
                setPointIndex(0);
                return prevCardIndex + 1;
            }
            return prevCardIndex; // End of tutorial
        });
    }, [pointIndex]);

    useEffect(() => {
        if (!isAnimating) {
            const timer = setTimeout(handleNext, DURATION_PER_POINT_MS);
            return () => clearTimeout(timer);
        }
    }, [isAnimating, handleNext, DURATION_PER_POINT_MS]);
    
    const handleBreathingComplete = useCallback(() => {
        setIsAnimating(false);
        setIsAudioPlaying(false);
        // Start the timer for the next point immediately
        handleNext();
    }, [setIsAudioPlaying, handleNext]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Brain className="h-6 w-6 text-primary"/>
                    Mindset Tutorial
                </CardTitle>
                <CardDescription>
                    A guided practice to prime your mental state for deep work.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-center items-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={cardIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full"
                    >
                        <Card className="bg-muted/50">
                            <CardHeader>
                                <CardTitle>{currentCard.title}</CardTitle>
                                <CardDescription>Step {pointIndex + 1} of {currentCard.points.length}</CardDescription>
                            </CardHeader>
                            <CardContent className="min-h-[250px] flex items-center justify-center">
                                <AnimatePresence mode="wait">
                                    {isAnimating ? (
                                        <motion.div
                                            key="animation"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.5 }}
                                            className="w-full"
                                        >
                                            <BreathingAnimation onComplete={handleBreathingComplete} />
                                        </motion.div>
                                    ) : (
                                        <motion.p
                                            key={`${cardIndex}-${pointIndex}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="text-lg text-center font-medium"
                                            dangerouslySetInnerHTML={{ __html: currentPoint }}
                                        />
                                    )}
                                </AnimatePresence>
                            </CardContent>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </CardContent>
            <CardFooter>
                <div className="w-full flex gap-2">
                    {TUTORIAL_CONTENT.map((card, index) => (
                        <div key={index} className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div 
                                className="h-full bg-primary transition-all duration-500"
                                style={{
                                    width: index < cardIndex ? '100%' : index === cardIndex ? `${((pointIndex + 1) / card.points.length) * 100}%` : '0%'
                                }}
                            />
                        </div>
                    ))}
                </div>
            </CardFooter>
        </Card>
    );
}

const NormalModeTutorial = () => (
    <div className="space-y-4">
        {TUTORIAL_CONTENT.map((card, cardIndex) => (
            <Card key={cardIndex} className="bg-gradient-to-br from-card to-muted/20 hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg">
                        <span className="text-primary">{card.icon}</span>
                        {card.title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {card.points.map((point, pointIndex) => (
                            <li key={pointIndex} className="flex items-start gap-3 text-sm text-muted-foreground">
                                <ArrowRight className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" />
                                <span dangerouslySetInnerHTML={{ __html: point.replace(/<br>/g, '') }} />
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        ))}
    </div>
);

function MindsetPageContent() {
    const searchParams = useSearchParams();
    const { deepWorkDefinitions } = useAuth();
    const intentionId = searchParams.get('intentionId');
    const [mode, setMode] = useState<'normal' | 'play'>('normal');
    
    const calculateProductiveHours = useCallback((allUpskillLogs: DatedWorkout[], allDeepWorkLogs: DatedWorkout[]) => {
        const dailyDurations: Record<string, number> = {};
        const processLogs = (logs: DatedWorkout[], durationField: 'reps' | 'weight') => {
            if (!logs) return;
            logs.forEach(log => {
                const duration = log.exercises.reduce((total, ex) => total + ex.loggedSets.reduce((sum, set) => sum + (set[durationField] || 0), 0), 0);
                if (duration > 0) {
                    dailyDurations[log.date] = (dailyDurations[log.date] || 0) + duration;
                }
            });
        };
        processLogs(allUpskillLogs, 'reps');
        processLogs(allDeepWorkLogs, 'weight');

        const daysWithActivity = Object.keys(dailyDurations).length;
        if (daysWithActivity === 0) return 1;
        const totalDuration = Object.values(dailyDurations).reduce((sum, d) => sum + d, 0);
        const avgMinutesPerDay = totalDuration / daysWithActivity;
        return avgMinutesPerDay > 0 ? avgMinutesPerDay / 60 : 1;
    }, []);

    const { allUpskillLogs, allDeepWorkLogs } = useAuth();

    const avgDailyProductiveHours = useMemo(() => 
        calculateProductiveHours(allUpskillLogs, allDeepWorkLogs), 
    [allUpskillLogs, allDeepWorkLogs, calculateProductiveHours]);
    
    const intention = useMemo(() => {
        return deepWorkDefinitions.find(def => def.id === intentionId) || null;
    }, [intentionId, deepWorkDefinitions]);

    if (!intentionId || !intention) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Intention not found. Please select one from the dashboard.</p>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-[calc(100vh-4rem)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                <div className="lg:col-span-1 h-full">
                    <ConceptualFlowDiagram intention={intention} avgDailyProductiveHours={avgDailyProductiveHours} />
                </div>
                <div className="lg:col-span-1 h-full flex flex-col">
                    <div className="flex justify-end mb-4">
                        <Button variant="outline" onClick={() => setMode(prev => prev === 'normal' ? 'play' : 'normal')}>
                            {mode === 'normal' ? <Play className="mr-2 h-4 w-4" /> : <BookText className="mr-2 h-4 w-4" />}
                            {mode === 'normal' ? 'Start Play Mode' : 'Switch to Normal Mode'}
                        </Button>
                    </div>
                    <div className="flex-grow min-h-0">
                      {mode === 'play' ? <InteractiveTutorial /> : <NormalModeTutorial />}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MindsetPage() {
    return (
        <AuthGuard>
            <React.Suspense fallback={<div>Loading...</div>}>
                <MindsetPageContent />
            </React.Suspense>
        </AuthGuard>
    );
}
