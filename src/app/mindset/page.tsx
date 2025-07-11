
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, ArrowRight, Play, BookText, BrainCircuit, CheckSquare, Zap, Expand, Shrink, PlusCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BreathingAnimation } from '@/components/BreathingAnimation';
import { cn } from '@/lib/utils';
import { MindsetCard, MindsetPoint } from '@/types/workout';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface InteractiveTutorialProps {
  cards: MindsetCard[];
}

const InteractiveTutorial = ({ cards }: InteractiveTutorialProps) => {
    const { isAudioPlaying, setIsAudioPlaying } = useAuth();
    const [cardIndex, setCardIndex] = useState(0);
    const [pointIndex, setPointIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(true); // Start with animation
    
    const TOTAL_DURATION_MINUTES = 7;
    const TOTAL_DURATION_MS = TOTAL_DURATION_MINUTES * 60 * 1000;
    const ANIMATION_DURATION_MS = (4.5 * 6 * 1000) + (16 * 4 * 1000) + (5 * 5 * 1000);
    
    const totalPoints = cards.reduce((sum, card) => sum + card.points.length, 0) - 1;
    const DURATION_PER_POINT_MS = totalPoints > 0 ? (TOTAL_DURATION_MS - ANIMATION_DURATION_MS) / totalPoints : 0;

    const currentCard = cards[cardIndex];
    const currentPoint = currentCard.points[pointIndex];
    
    useEffect(() => {
        setIsAnimating(true);
        setIsAudioPlaying(true);
    }, [setIsAudioPlaying]);

    const handleNext = useCallback(() => {
        setCardIndex(prevCardIndex => {
            const currentCardData = cards[prevCardIndex];
            if (pointIndex < currentCardData.points.length - 1) {
                setPointIndex(prevPointIndex => prevPointIndex + 1);
                return prevCardIndex;
            } else if (prevCardIndex < cards.length - 1) {
                setPointIndex(0);
                return prevCardIndex + 1;
            }
            // End of tutorial
            setIsAudioPlaying(false);
            return prevCardIndex;
        });
    }, [pointIndex, cards, setIsAudioPlaying]);

    useEffect(() => {
        if (!isAnimating && totalPoints > 0) {
            const timer = setTimeout(handleNext, DURATION_PER_POINT_MS);
            return () => clearTimeout(timer);
        }
    }, [isAnimating, handleNext, DURATION_PER_POINT_MS, totalPoints]);
    
    const handleBreathingComplete = useCallback(() => {
        setIsAnimating(false);
        setIsAudioPlaying(false);
        handleNext();
    }, [setIsAudioPlaying, handleNext]);

    if (isAnimating) {
        return <BreathingAnimation onComplete={handleBreathingComplete} />;
    }

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
                                <motion.p
                                    key={`${cardIndex}-${pointIndex}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-2xl text-center font-medium"
                                    dangerouslySetInnerHTML={{ __html: currentPoint.text }}
                                />
                            </CardContent>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </CardContent>
            <CardFooter>
                <div className="w-full flex gap-2 max-w-lg mx-auto">
                    {cards.map((card, index) => (
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
};

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'BrainCircuit': return <BrainCircuit className="h-5 w-5" />;
    case 'CheckSquare': return <CheckSquare className="h-5 w-5" />;
    case 'Zap': return <Zap className="h-5 w-5" />;
    default: return <Brain className="h-5 w-5" />;
  }
};

const NormalModeTutorial = () => {
    const { mindsetCards, setMindsetCards } = useAuth();
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [editingPointId, setEditingPointId] = useState<string | null>(null);

    const handleUpdateCard = (cardId: string, newTitle: string) => {
        setMindsetCards(prev => prev.map(c => c.id === cardId ? { ...c, title: newTitle } : c));
    };

    const handleUpdatePoint = (cardId: string, pointId: string, newText: string) => {
        setMindsetCards(prev => prev.map(c => {
            if (c.id === cardId) {
                return { ...c, points: c.points.map(p => p.id === pointId ? { ...p, text: newText } : p) };
            }
            return c;
        }));
    };
    
    const handleAddPoint = (cardId: string) => {
        const newPoint: MindsetPoint = { id: `point_${Date.now()}`, text: 'New step' };
        setMindsetCards(prev => prev.map(c => c.id === cardId ? { ...c, points: [...c.points, newPoint] } : c));
        setEditingPointId(newPoint.id);
    };

    const handleDeletePoint = (cardId: string, pointId: string) => {
        setMindsetCards(prev => prev.map(c => c.id === cardId ? { ...c, points: c.points.filter(p => p.id !== pointId) } : c));
    };

    const handleAddCard = () => {
        const newCard: MindsetCard = { id: `card_${Date.now()}`, title: 'New Card', icon: 'Brain', points: [] };
        setMindsetCards(prev => [...prev, newCard]);
        setEditingCardId(newCard.id);
    };

    const handleDeleteCard = (cardId: string) => {
        setMindsetCards(prev => prev.filter(c => c.id !== cardId));
    };

    return (
        <div className="space-y-4">
            {mindsetCards.map((card) => (
                <Card key={card.id} className="bg-gradient-to-br from-card to-muted/20 hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                           {editingCardId === card.id ? (
                                <Input value={card.title} onChange={(e) => handleUpdateCard(card.id, e.target.value)} onBlur={() => setEditingCardId(null)} autoFocus className="text-lg font-semibold" />
                           ) : (
                                <CardTitle className="flex items-center gap-3 text-lg cursor-pointer" onClick={() => setEditingCardId(card.id)}>
                                    <span className="text-primary">{getIcon(card.icon)}</span>
                                    {card.title}
                                </CardTitle>
                           )}
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteCard(card.id)}>
                                <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {card.points.map((point) => (
                                <li key={point.id} className="flex items-start gap-3 text-sm text-muted-foreground group">
                                    <ArrowRight className="h-4 w-4 mt-0.5 text-primary/70 flex-shrink-0" />
                                    {editingPointId === point.id ? (
                                        <Textarea value={point.text} onChange={e => handleUpdatePoint(card.id, point.id, e.target.value)} onBlur={() => setEditingPointId(null)} autoFocus className="text-sm" rows={2}/>
                                    ) : (
                                        <span onClick={() => setEditingPointId(point.id)} className="flex-grow cursor-pointer" dangerouslySetInnerHTML={{ __html: point.text.replace(/<br>/g, '') }} />
                                    )}
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDeletePoint(card.id, point.id)}>
                                        <Trash2 className="h-3 w-3"/>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                         <Button variant="outline" size="sm" className="mt-4" onClick={() => handleAddPoint(card.id)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Step
                        </Button>
                    </CardContent>
                </Card>
            ))}
             <Button variant="secondary" className="w-full" onClick={handleAddCard}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Card
            </Button>
        </div>
    );
};

function MindsetPageContent() {
    const { mindsetCards } = useAuth();
    const [mode, setMode] = useState<'normal' | 'play'>('normal');
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const handleFullScreenChange = useCallback(() => {
        const isCurrentlyFullScreen = !!document.fullscreenElement;
        setIsFullScreen(isCurrentlyFullScreen);
        if (!isCurrentlyFullScreen) {
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
        <div ref={containerRef} className={cn("bg-background transition-all", isFullScreen ? "h-screen w-screen" : "h-full")}>
            <div className={cn("container mx-auto h-full flex flex-col transition-all", isFullScreen ? "p-0" : "p-4 sm:p-6 lg:p-8")}>
                <div className={cn("flex justify-end mb-4", isFullScreen && "hidden")}>
                    <Button variant="outline" onClick={togglePlayMode}>
                        {mode === 'normal' ? <Play className="mr-2 h-4 w-4" /> : <BookText className="mr-2 h-4 w-4" />}
                        {mode === 'normal' ? 'Start Guided Session' : 'View as Text'}
                        {isFullScreen 
                            ? <Shrink className="ml-2 h-4 w-4" /> 
                            : <Expand className="ml-2 h-4 w-4" />}
                    </Button>
                </div>
                <div className="flex-grow min-h-0">
                    {mode === 'play' ? <InteractiveTutorial cards={mindsetCards} /> : <NormalModeTutorial />}
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
