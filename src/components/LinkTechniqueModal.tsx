
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import type { ExerciseDefinition, Stopper } from '@/types/workout';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

interface LinkTechniqueModalProps {
  modalState: {
    isOpen: boolean;
    habitId: string;
    stopper: Stopper;
    stage: 2 | 3;
  };
  onOpenChange: (isOpen: boolean) => void;
}

export function LinkTechniqueModal({ modalState, onOpenChange }: LinkTechniqueModalProps) {
  const { mindProgrammingDefinitions, setResources } = useAuth();
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<string | null>(null);

  useEffect(() => {
    if (modalState.isOpen) {
      const field = `linkedTechniqueId_stage${modalState.stage}` as keyof Stopper;
      setSelectedTechniqueId(modalState.stopper[field] as string || null);
    }
  }, [modalState]);
  
  const handleSave = () => {
    if (!selectedTechniqueId) return;

    setResources(prev => prev.map(r => {
      if (r.id === modalState.habitId) {
        const updateStoppers = (stoppersList: Stopper[] = []) =>
          stoppersList.map(s => {
            if (s.id === modalState.stopper.id) {
              const field = `linkedTechniqueId_stage${modalState.stage}` as const;
              return { ...s, [field]: selectedTechniqueId };
            }
            return s;
          });

        return {
          ...r,
          urges: updateStoppers(r.urges),
          resistances: updateStoppers(r.resistances),
        };
      }
      return r;
    }));
    onOpenChange(false);
  };

  return (
    <Dialog open={modalState.isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link Stage {modalState.stage} Technique</DialogTitle>
          <DialogDescription>
            Select a stronger technique to manage the resistance: "{modalState.stopper.text}"
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-72">
            <RadioGroup value={selectedTechniqueId || ''} onValueChange={setSelectedTechniqueId} className="space-y-2">
              {mindProgrammingDefinitions.map(tech => (
                <div key={tech.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={tech.id} id={`tech-${tech.id}`} />
                  <Label htmlFor={`tech-${tech.id}`} className="font-normal">{tech.name}</Label>
                </div>
              ))}
            </RadioGroup>
          </ScrollArea>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!selectedTechniqueId}>Link Technique</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
