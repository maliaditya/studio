
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Route, Lightbulb, Flashlight, ArrowRight } from 'lucide-react';
import type { ExerciseDefinition } from '@/types/workout';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';

export function SkillPathWidget() {
    const { 
        upskillDefinitions, 
        deepWorkDefinitions,
        getDescendantLeafNodes,
        permanentlyLoggedTaskIds,
        settings,
        scheduleTaskFromMindMap,
        currentSlot,
    } = useAuth();
    
    const [isClient, setIsClient] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setIsClient(true);
        const savedPosition = localStorage.getItem('skill_path_widget_position');
        if (savedPosition) {
            try {
                setPosition(JSON.parse(savedPosition));
            } catch (error) {
                setPosition({ x: window.innerWidth - 340, y: 850 });
            }
        } else {
            setPosition({ x: window.innerWidth - 340, y: 850 });
        }
    }, []);

    const nextAvailableTask = useMemo(() => {
        const allLeafNodes = [
            ...upskillDefinitions.filter(def => (def.linkedUpskillIds?.length ?? 0) === 0),
            ...deepWorkDefinitions.filter(def => (def.linkedDeepWorkIds?.length ?? 0) === 0),
        ];

        const loggedLeafNodes = allLeafNodes
            .filter(node => node.last_logged_date && !permanentlyLoggedTaskIds.has(node.id))
            .sort((a, b) => new Date(b.last_logged_date!).getTime() - new Date(a.last_logged_date!).getTime());
        
        if (loggedLeafNodes.length > 0) {
            const mostRecentLogged = loggedLeafNodes[0];
            const allDefs = [...upskillDefinitions, ...deepWorkDefinitions];

            let parentId: string | undefined;
            for (const def of allDefs) {
                if (def.linkedUpskillIds?.includes(mostRecentLogged.id) || def.linkedDeepWorkIds?.includes(mostRecentLogged.id)) {
                    parentId = def.id;
                    break;
                }
            }
            
            if (parentId) {
                const isUpskillParent = upskillDefinitions.some(u => u.id === parentId);
                const parentLeaves = getDescendantLeafNodes(parentId, isUpskillParent ? 'upskill' : 'deepwork');
                const nextTaskInParent = parentLeaves.find(leaf => !permanentlyLoggedTaskIds.has(leaf.id));
                if (nextTaskInParent) {
                    return { ...nextTaskInParent, type: isUpskillParent ? 'upskill' : 'deepwork' };
                }
            }
        }

        // Fallback to original logic if no recent context is found
        const curiosities = upskillDefinitions.filter(def => (def.linkedUpskillIds?.length ?? 0) > 0);
        const intentions = deepWorkDefinitions.filter(def => (def.linkedDeepWorkIds?.length ?? 0) > 0);
        
        const allParentTasks = [...curiosities, ...intentions].sort((a, b) => 
            (b.loggedDuration || 0) - (a.loggedDuration || 0)
        );

        for (const parent of allParentTasks) {
            const isUpskill = upskillDefinitions.some(u => u.id === parent.id);
            const leaves = getDescendantLeafNodes(parent.id, isUpskill ? 'upskill' : 'deepwork');
            const nextLeaf = leaves.find(leaf => !permanentlyLoggedTaskIds.has(leaf.id));

            if (nextLeaf) {
                return { ...nextLeaf, type: isUpskill ? 'upskill' : 'deepwork' };
            }
        }

        return null;
    }, [upskillDefinitions, deepWorkDefinitions, getDescendantLeafNodes, permanentlyLoggedTaskIds]);


    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, [role="button"]')) return;
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
        safeSetLocalStorageItem('skill_path_widget_position', JSON.stringify(position));
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
    
    const style: React.CSSProperties = {
        position: 'fixed',
        top: position.y,
        left: position.x,
        willChange: 'transform',
    };
    
    const handleSchedule = () => {
        if (nextAvailableTask) {
            scheduleTaskFromMindMap(nextAvailableTask.id, nextAvailableTask.type as 'upskill' | 'deepwork', currentSlot);
        }
    };
    
    if (!isClient || !settings.widgetVisibility.goals) {
        return null;
    }

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
                            <Route className="h-5 w-5 text-green-500" />
                            Skill Path
                        </CardTitle>
                    </CardHeader>
                </div>
                <CardContent className="p-0">
                    {nextAvailableTask ? (
                        <div className="space-y-2">
                             <p className="text-xs text-muted-foreground">Your next step to gain XP:</p>
                             <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                                {nextAvailableTask.type === 'upskill' 
                                    ? <Flashlight className="h-4 w-4 text-amber-500 flex-shrink-0"/>
                                    : <Lightbulb className="h-4 w-4 text-green-500 flex-shrink-0"/>
                                }
                                <p className="font-semibold text-sm truncate" title={nextAvailableTask.name}>{nextAvailableTask.name}</p>
                             </div>
                             <Button size="sm" className="w-full" onClick={handleSchedule}>
                                Add to Current Slot <ArrowRight className="ml-2 h-4 w-4"/>
                             </Button>
                        </div>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-4">
                            You've completed all defined tasks. Add more to your skill tree!
                        </p>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
