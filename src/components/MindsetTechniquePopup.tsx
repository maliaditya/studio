
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import type { MindsetTechniquePopupState, ExerciseDefinition } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';

interface MindsetTechniquePopupProps {
  popupState: MindsetTechniquePopupState;
  onClose: (id: string) => void;
}

export function MindsetTechniquePopup({ popupState, onClose }: MindsetTechniquePopupProps) {
  const { mindProgrammingDefinitions } = useAuth();
  const { techniqueId, x, y } = popupState;

  const technique = mindProgrammingDefinitions.find(t => t.id === techniqueId);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `mindset-technique-popup-${techniqueId}`,
  });

  const style: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: transform
      ? `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px))`
      : 'translate(-50%, -50%)',
    willChange: 'transform',
    zIndex: 105,
  };

  if (!technique) return null;

  return (
    <div ref={setNodeRef} style={style} data-popup-id={`mindset-technique-${technique.id}`}>
      <Card className="w-96 shadow-2xl border-2 border-primary/30 bg-card flex flex-col max-h-[70vh]">
        <CardHeader className="p-3 relative cursor-grab" {...listeners}>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base truncate">{technique.name}</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={(e) => { e.stopPropagation(); onClose(techniqueId); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 text-sm flex-grow min-h-0">
            <ScrollArea className="h-full pr-2">
                <div className="space-y-3">
                    {(technique.decompositionData || []).map(point => (
                        <div key={point.id} className="text-sm p-2 rounded-md bg-muted/30">
                            <p className="whitespace-pre-wrap">{point.text}</p>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
