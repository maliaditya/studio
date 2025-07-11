
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

const InteractiveTutorial = () => {
    const { isAudioPlaying, setIsAudioPlaying } = useAuth();
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
            <div className="h-full flex flex-col">
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


    