
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { Workflow, ArrowRight } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

export function RuleEquationsCard() {
    const { pillarEquations, metaRules } = useAuth();
    const [isClient, setIsClient] = useState(false);

    const [position, setPosition] = useState({ x: 20, y: 596 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: 'rule-equations-card',
    });

    useEffect(() => {
        setIsClient(true);
    }, []);

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
        transform: transform ? `translate3d(${'${transform.x}'}px, ${'${transform.y}'}px, 0)` : undefined,
        willChange: 'transform',
        userSelect: isDragging ? 'none' : 'auto',
    };
    
    const allEquations = React.useMemo(() => {
        return Object.values(pillarEquations).flat();
    }, [pillarEquations]);

    if (!isClient || allEquations.length === 0) {
        return null;
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            className="fixed w-full max-w-xs z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            onMouseDown={handleMouseDown}
            {...attributes}
            {...listeners}
        >
            <Card className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg">
                <CardHeader className="p-0 mb-3 cursor-grab active:cursor-grabbing">
                    <CardTitle className="flex items-center gap-2 text-base text-primary">
                        <Workflow className="h-5 w-5" />
                        Rule Equations
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-48 pr-3">
                        <ul className="space-y-2">
                            {allEquations.map(equation => (
                                <li key={equation.id} className="p-2 rounded-md border bg-muted/30">
                                    <div className="space-y-1">
                                        {(equation.metaRuleIds || []).map(ruleId => {
                                            const rule = metaRules.find(r => r.id === ruleId);
                                            return rule ? <p key={ruleId} className="text-xs text-muted-foreground">IF: {rule.text}</p> : null;
                                        })}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 pt-1 border-t">
                                        <ArrowRight className="h-4 w-4 text-primary" />
                                        <p className="text-sm font-semibold">{equation.outcome}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </CardContent>
            </Card>
        </motion.div>
    );
}
