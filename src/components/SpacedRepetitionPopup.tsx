
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { Repeat, Focus, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './ui/button';
import { SpacedRepetitionModal } from './SpacedRepetitionModal';
import type { MicroSkill } from '@/types/workout';
import { format, parseISO, addDays, differenceInDays, isBefore, isToday, startOfToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';

export function SpacedRepetitionPopup() {
    const { coreSkills, deepWorkDefinitions, getDescendantLeafNodes, scheduleTaskFromMindMap, currentSlot } = useAuth();
    const [isClient, setIsClient] = useState(false);
    
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    const [repetitionModalState, setRepetitionModalState] = useState<{ isOpen: boolean; skill: MicroSkill | null }>({ isOpen: false, skill: null });
    const [showOnlyToday, setShowOnlyToday] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setIsClient(true);
        const savedPosition = localStorage.getItem('spaced_repetition_position');
        if (savedPosition) {
            try {
                setPosition(JSON.parse(savedPosition));
            } catch (error) {
                console.error("Failed to parse position from localStorage", error);
                setPosition({ x: window.innerWidth - 340, y: 620 });
            }
        } else {
            setPosition({ x: window.innerWidth - 340, y: 620 });
        }
        const savedFilterState = localStorage.getItem('spacedRepetition_showOnlyToday');
        if (savedFilterState) {
            setShowOnlyToday(JSON.parse(savedFilterState));
        }
    }, []);

    useEffect(() => {
      if (isClient) {
        safeSetLocalStorageItem('spacedRepetition_showOnlyToday', JSON.stringify(showOnlyToday));
      }
    }, [showOnlyToday, isClient]);

    const DOUBLING_INTERVALS = [1, 2, 4, 8, 16, 32, 64, 128];

    const repetitionSkillsWithDates = useMemo(() => {
        const repetitionSkills = coreSkills.flatMap(cs => 
            cs.skillAreas.flatMap(sa => 
                sa.microSkills.filter(ms => ms.isReadyForRepetition)
            )
        );

        let skillsToReview = repetitionSkills.map(skill => {
            const intentions = deepWorkDefinitions.filter(def => def.category === skill.name);
            const mainIntention = intentions.find(i => !deepWorkDefinitions.some(d => d.linkedDeepWorkIds?.includes(i.id)));
            const allLeafNodes = intentions.flatMap(intention => getDescendantLeafNodes(intention.id, 'deepwork'));
            const completionDates = new Set<string>();
            allLeafNodes.forEach(node => {
                if (node.last_logged_date) completionDates.add(node.last_logged_date);
            });
            const sortedDates = Array.from(completionDates).map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());

            let reps = 0;
            let lastReviewDate = sortedDates.length > 0 ? sortedDates[0] : new Date();

            if (sortedDates.length > 0) {
                reps = 1;
                for (let i = 1; i < sortedDates.length; i++) {
                    const daysBetween = differenceInDays(sortedDates[i], lastReviewDate);
                    if (daysBetween <= (DOUBLING_INTERVALS[reps - 1] || 128)) {
                        reps++;
                    } else {
                        reps = 1;
                    }
                    lastReviewDate = sortedDates[i];
                }
            }

            const nextInterval = DOUBLING_INTERVALS[reps] || 128;
            const nextReviewDate = addDays(lastReviewDate, nextInterval);

            return {
                ...skill,
                mainIntentionId: mainIntention?.id,
                nextReviewDate: sortedDates.length > 0 ? nextReviewDate : new Date(),
                isOverdue: sortedDates.length > 0 && isBefore(nextReviewDate, startOfToday()),
            };
        });

        if (showOnlyToday) {
            const today = startOfToday();
            skillsToReview = skillsToReview.filter(skill => 
                isBefore(skill.nextReviewDate, today) || isToday(skill.nextReviewDate)
            );
        }

        return skillsToReview.sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime());

    }, [coreSkills, deepWorkDefinitions, getDescendantLeafNodes, showOnlyToday]);
    
    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, [role="button"]')) {
            return;
        }
        setIsDragging(true);
        setDragStartOffset({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
    };
    
    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStartOffset.x,
                y: e.clientY - dragStartOffset.y,
            });
        }
    };
    
    const handleMouseUp = () => {
        setIsDragging(false);
        safeSetLocalStorageItem('spaced_repetition_position', JSON.stringify(position));
    };

    useEffect(() => {
        if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
        } else {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStartOffset]);
    
    const style: React.CSSProperties = {
        position: 'fixed',
        top: position.y,
        left: position.x,
        willChange: 'transform',
        userSelect: isDragging ? 'none' : 'auto',
    };
    
    const handleScheduleClick = (e: React.MouseEvent, skill: { mainIntentionId?: string, name: string }) => {
        e.stopPropagation();
        if (skill.mainIntentionId) {
            scheduleTaskFromMindMap(skill.mainIntentionId, 'deepwork', currentSlot);
        } else {
            toast({
                title: "Cannot Schedule",
                description: `No main intention found for "${skill.name}".`,
                variant: "destructive",
            });
        }
    };

    if (!isClient || coreSkills.flatMap(cs => cs.skillAreas.flatMap(sa => sa.microSkills.filter(ms => ms.isReadyForRepetition))).length === 0) {
        return null;
    }

    return (
        <>
            <motion.div
                style={style}
                className="fixed w-full max-w-xs z-50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                onMouseDown={handleMouseDown}
            >
                <Card className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg">
                    <div className="cursor-grab active:cursor-grabbing">
                        <CardHeader className="p-0 mb-3 flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base text-primary">
                                <Repeat className="h-5 w-5 text-blue-500" />
                                Spaced Repetition Queue
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setShowOnlyToday(prev => !prev)}
                            >
                                <Focus className={cn("h-4 w-4 text-muted-foreground", showOnlyToday && "text-primary")} />
                            </Button>
                        </CardHeader>
                    </div>
                    <CardContent className="p-0">
                        <ScrollArea className="h-48 pr-3">
                            <ul className="space-y-2">
                                {repetitionSkillsWithDates.map(skill => (
                                    <li key={skill.id} className="group">
                                        <div className="flex items-center justify-between">
                                            <Button
                                                variant="secondary"
                                                className="w-full justify-between h-auto text-left flex-grow"
                                                onClick={() => setRepetitionModalState({ isOpen: true, skill })}
                                            >
                                                <span className="truncate pr-2">{skill.name}</span>
                                                <span className={`text-xs whitespace-nowrap ${skill.isOverdue ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                                                    {format(skill.nextReviewDate, 'MMM dd')}
                                                </span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => handleScheduleClick(e, skill)}
                                            >
                                                <CalendarIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                                {repetitionSkillsWithDates.length === 0 && (
                                    <p className="text-center text-sm text-muted-foreground pt-16">
                                        {showOnlyToday ? "No reviews for today!" : "No skills in queue."}
                                    </p>
                                )}
                            </ul>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </motion.div>

            <SpacedRepetitionModal
                modalState={repetitionModalState}
                onOpenChange={(isOpen) => setRepetitionModalState(prev => ({...prev, isOpen}))}
            />
        </>
    );
}
