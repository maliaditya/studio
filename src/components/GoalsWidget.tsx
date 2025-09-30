
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isAfter, startOfToday, differenceInDays, isBefore } from 'date-fns';
import { motion } from 'framer-motion';
import { Target, Check } from 'lucide-react';
import type { CoreSkill } from '@/types/workout';
import { Checkbox } from './ui/checkbox';

export function GoalsWidget() {
    const { 
        coreSkills, 
        offerizationPlans, 
        isPistonsHeadOpen, 
        settings, 
        setSettings,
        dailyReviewLogs,
        handleToggleDailyGoalCompletion,
    } = useAuth();
    const [isClient, setIsClient] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setIsClient(true);
        const savedPosition = localStorage.getItem('goals_widget_position');
        if (savedPosition) {
            try {
                setPosition(JSON.parse(savedPosition));
            } catch (error) {
                console.error("Failed to parse position from localStorage", error);
                setPosition({ x: window.innerWidth - 340, y: 300 });
            }
        } else {
            setPosition({ x: window.innerWidth - 340, y: 300 });
        }
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, [role="button"], [role="checkbox"]')) return;
        setIsDragging(true);
        setDragStartOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    };
    
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging) {
            setPosition({ x: e.clientX - dragStartOffset.x, y: e.clientY - dragStartOffset.y });
        }
    }, [isDragging, dragStartOffset]);
    
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        localStorage.setItem('goals_widget_position', JSON.stringify(position));
    }, [position]);

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
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const plannedSpecializations = useMemo(() => {
        return Object.entries(offerizationPlans || {})
            .filter(([, plan]) => plan.learningPlan && ((plan.learningPlan.audioVideoResources?.length || 0) > 0 || (plan.learningPlan.bookWebpageResources?.length || 0) > 0))
            .map(([specId]) => coreSkills.find(s => s.id === specId))
            .filter((spec): spec is CoreSkill => !!spec);
    }, [offerizationPlans, coreSkills]);

    const calculateDailyTarget = (total: number | null, completed: number, start: string | null | undefined, end: string | null | undefined): string | null => {
        if (!total || !start || !end) return null;
        const startDate = parseISO(start);
        const endDate = parseISO(end);
        const today = startOfToday();
        
        if (isAfter(startDate, endDate) || isBefore(endDate, today)) return null;
        
        const remainingWork = total - completed;
        const relevantStartDate = isBefore(startDate, today) ? today : startDate;
        const remainingDays = differenceInDays(endDate, relevantStartDate) + 1;
    
        if (remainingWork <= 0 || remainingDays <= 0) return null;
    
        return (remainingWork / remainingDays).toFixed(1);
    };

    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const todaysCompletions = useMemo(() => {
        const log = dailyReviewLogs.find(log => log.date === todayKey);
        return new Set(log?.completedResourceIds || []);
    }, [dailyReviewLogs, todayKey]);


    if (!isClient || !settings.widgetVisibility.goals || plannedSpecializations.length === 0) {
        return null;
    }

    const style: React.CSSProperties = {
        position: 'fixed',
        top: position.y,
        left: position.x,
        willChange: 'transform',
    };

    return (
        <motion.div
            style={style}
            className="fixed w-full max-w-xs z-50"
            onMouseDown={handleMouseDown}
        >
            <Card className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg">
                <div className="cursor-grab active:cursor-grabbing">
                    <CardHeader className="p-0 mb-3">
                        <CardTitle className="flex items-center gap-2 text-base text-primary">
                            <Target className="h-5 w-5 text-green-500" />
                            Daily Learning Goals
                        </CardTitle>
                    </CardHeader>
                </div>
                <CardContent className="p-0">
                    <ScrollArea className="h-64 pr-3">
                        <ul className="space-y-3">
                            {plannedSpecializations.map(spec => {
                                const plan = offerizationPlans[spec.id]?.learningPlan;
                                if (!plan) return null;
                                const completed = spec.skillAreas.flatMap(sa => sa.microSkills).reduce((acc, ms) => {
                                    acc.items += ms.completedItems || 0;
                                    acc.hours += ms.completedHours || 0;
                                    acc.pages += ms.completedPages || 0;
                                    return acc;
                                }, { items: 0, hours: 0, pages: 0 });

                                return (plan.audioVideoResources || []).concat(plan.bookWebpageResources || []).map((res, index) => {
                                    let dailyTarget, unit, progress, authorOrTutor, resourceId;
                                    if ('totalItems' in res) { // LearningResourceAudio
                                        dailyTarget = calculateDailyTarget(res.totalItems, completed.items, res.startDate, res.completionDate);
                                        unit = 'Rec/day';
                                        progress = `${completed.items}/${res.totalItems} items`;
                                        authorOrTutor = res.tutor;
                                        resourceId = res.id;
                                    } else if ('totalPages' in res) { // LearningResourceBook
                                        dailyTarget = calculateDailyTarget(res.totalPages, completed.pages, res.startDate, res.completionDate);
                                        unit = 'pg/day';
                                        progress = `${completed.pages}/${res.totalPages}pgs`;
                                        authorOrTutor = res.author;
                                        resourceId = res.id;
                                    }

                                    if (!dailyTarget) return null;
                                    const isCompletedToday = todaysCompletions.has(resourceId);

                                    return (
                                        <li key={`${spec.id}-${res.id}-${index}`}>
                                            <div className="text-xs p-2 rounded-md bg-muted/50">
                                                <div className="flex items-start">
                                                    <Checkbox
                                                        id={`goal-check-${resourceId}`}
                                                        checked={isCompletedToday}
                                                        onCheckedChange={() => handleToggleDailyGoalCompletion(resourceId)}
                                                        className="mr-2 mt-0.5"
                                                    />
                                                    <div className="flex-grow">
                                                        <p className={`font-semibold text-foreground truncate ${isCompletedToday ? 'line-through' : ''}`} title={res.name}>{res.name}</p>
                                                        {authorOrTutor && <p className={`text-xs text-muted-foreground ${isCompletedToday ? 'line-through' : ''}`}>{authorOrTutor}</p>}
                                                        <div className="flex justify-between items-baseline mt-1">
                                                            <span className={`text-muted-foreground ${isCompletedToday ? 'line-through' : ''}`}>{progress}</span>
                                                            <span className={`text-primary font-bold text-sm ${isCompletedToday ? 'line-through' : ''}`}>{dailyTarget} {unit}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                });
                            })}
                        </ul>
                    </ScrollArea>
                </CardContent>
            </Card>
        </motion.div>
    );
}
