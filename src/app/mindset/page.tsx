
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, ArrowRight, Play, BookText, BrainCircuit, CheckSquare, Zap, Expand, Shrink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BreathingAnimation } from '@/components/BreathingAnimation';
import { cn } from '@/lib/utils';

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
    const ANIMATION_DURATION_MS = (4.5 * 6 * 1000) + (16 * 4 * 1000) + (5 * 5 * 1000);
    
    const totalPoints = TUTORIAL_CONTENT.reduce((sum, card) => sum + card.points.length, 0) - 1;
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
            return prevCardIndex;
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
        handleNext();
    }, [setIsAudioPlaying, handleNext]);

    return (
        <Card className="h-full flex flex-col border-0 shadow-none bg-transparent">
            <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                    <Brain className="h-8 w-8 text-primary"/>
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
                        className="w-full max-w-lg"
                    >
                        <Card className="bg-card/50">
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
                                            className="text-2xl text-center font-medium"
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
                <div className="w-full flex gap-2 max-w-lg mx-auto">
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
    const [mode, setMode] = useState<'normal' | 'play'>('normal');
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const handleFullScreenChange = useCallback(() => {
        setIsFullScreen(!!document.fullscreenElement);
        if (!document.fullscreenElement) {
            setMode('normal'); // Exit play mode when exiting fullscreen
        }
    }, []);

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
        };
    }, [handleFullScreenChange]);

    const togglePlayMode = () => {
        if (mode === 'normal') {
            setMode('play');
            containerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                setMode('normal'); // Revert if fullscreen fails
            });
        } else {
            setMode('normal');
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        }
    };
    
    return (
        <div ref={containerRef} className={cn("bg-background", isFullScreen && "h-screen w-screen")}>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 h-full flex flex-col">
                <div className="flex justify-end mb-4">
                    <Button variant="outline" onClick={togglePlayMode}>
                        {mode === 'normal' ? <Play className="mr-2 h-4 w-4" /> : <BookText className="mr-2 h-4 w-4" />}
                        {mode === 'normal' ? 'Start Play Mode' : 'Exit Play Mode'}
                        {isFullScreen 
                            ? <Shrink className="ml-2 h-4 w-4" /> 
                            : <Expand className="ml-2 h-4 w-4" />}
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
