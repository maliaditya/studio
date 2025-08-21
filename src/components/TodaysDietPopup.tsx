
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
    <div ref={setNodeRef} style={style} data-popup-id="todays-diet-popup" {...attributes} {...listeners}>
        <TodaysDietCard dietPlan={dietPlan} onEditClick={onOpenEdit} />
    </div>
  );
}
