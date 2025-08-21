
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDraggable } from '@dnd-kit/core';
import { X, GripVertical, BookCopy } from 'lucide-react';
import { TodaysDietCard } from './TodaysDietCard';
import { useAuth } from '@/contexts/AuthContext';
import { DietPlanModal } from './DietPlanModal';
import { TodaysDietPopupState } from '@/types/workout';

interface TodaysDietPopupProps {
  popupState: TodaysDietPopupState;
  onClose: () => void;
  onOpenEdit: () => void;
}

export function TodaysDietPopup({ popupState, onClose, onOpenEdit }: TodaysDietPopupProps) {
  const { dietPlan } = useAuth();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `todays-diet-popup`,
  });

  const style: React.CSSProperties = {
    position: 'fixed',
    top: popupState.y,
    left: popupState.x,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    willChange: 'transform',
    zIndex: popupState.z || 80,
  };

  return (
    <div ref={setNodeRef} style={style}>
        <Card className="w-96 shadow-2xl border-2 border-primary/30 bg-card">
            <CardHeader 
                className="p-3 relative cursor-grab flex items-center justify-between"
                {...listeners}
                {...attributes}
            >
                <CardTitle className="text-base">Today's Diet</CardTitle>
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenEdit}>
                        <BookCopy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={(e) => { e.stopPropagation(); onClose(); }}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <TodaysDietCard dietPlan={dietPlan} onEditClick={onOpenEdit} />
            </CardContent>
        </Card>
    </div>
  );
}
