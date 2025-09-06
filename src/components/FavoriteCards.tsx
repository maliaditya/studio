
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { Star } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export function FavoriteCards() {
    const { resources, openGeneralPopup } = useAuth();
    const [isClient, setIsClient] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    const [position, setPosition] = useState({ x: 20, y: 50 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setIsClient(true);
    }, []);
    
    const favoriteCards = React.useMemo(() => {
        return resources.filter(r => r.isFavorite && r.type === 'card');
    }, [resources]);
    
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
        willChange: 'transform',
        userSelect: isDragging ? 'none' : 'auto',
    };
    
    if (!isClient || favoriteCards.length === 0) {
        return null;
    }

    return (
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
                <div className="cursor-grab active:cursor-grabbing" onClick={() => setIsExpanded(!isExpanded)}>
                    <CardHeader className="p-0 mb-3 flex flex-row justify-between items-center">
                        <CardTitle className="flex items-center gap-2 text-base text-primary">
                            <Star className="h-5 w-5 text-yellow-400 fill-current" />
                            Favorite Cards
                        </CardTitle>
                    </CardHeader>
                </div>
                {isExpanded && (
                    <CardContent className="p-0">
                        <ScrollArea className="h-48 pr-3">
                            <ul className="space-y-2">
                                {favoriteCards.map(card => (
                                    <li key={card.id}>
                                        <Button 
                                            variant="secondary"
                                            className="w-full justify-start h-auto text-left"
                                            onClick={(e) => openGeneralPopup(card.id, e)}
                                        >
                                            {card.name}
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </CardContent>
                )}
            </Card>
        </motion.div>
    );
}
