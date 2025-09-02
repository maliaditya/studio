
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import type { Activity, MissedSlotReview, HabitEquation } from '@/types/workout';
import { format } from 'date-fns';

interface MissedSlotModalProps {
  state: {
    isOpen: boolean;
    slotName: string;
    incompleteTasks: Activity[];
  };
  onOpenChange: (isOpen: boolean) => void;
  onSave: (review: MissedSlotReview) => void;
}

export function MissedSlotModal({ state, onOpenChange, onSave }: MissedSlotModalProps) {
  const { isOpen, slotName, incompleteTasks } = state;
  const { pillarEquations } = useAuth();
  
  const [reason, setReason] = useState('');
  const [followedRuleIds, setFollowedRuleIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setFollowedRuleIds([]);
    }
  }, [isOpen]);

  const allEquations = useMemo(() => Object.values(pillarEquations).flat(), [pillarEquations]);

  const handleSave = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const review: MissedSlotReview = {
      id: `${today}-${slotName}`,
      reason,
      followedRuleIds,
    };
    onSave(review);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Your '{slotName}' Slot</DialogTitle>
          <DialogDescription>
            You had some incomplete tasks. Let's reflect on why.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div>
            <Label className="font-semibold">Incomplete Tasks:</Label>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
              {incompleteTasks.map(task => (
                <li key={task.id}>{task.details}</li>
              ))}
            </ul>
          </div>
          <div>
            <Label htmlFor="reason-textarea">What happened? Why were these tasks not completed?</Label>
            <Textarea
              id="reason-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., I was distracted by social media, an unexpected meeting came up..."
              className="mt-2"
            />
          </div>
          <div>
            <Label className="font-semibold">Which rules did you follow during this time?</Label>
            <ScrollArea className="h-40 border rounded-md p-2 mt-2">
              <div className="space-y-2">
                {allEquations.map(eq => (
                  <div key={eq.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rule-${eq.id}`}
                      checked={followedRuleIds.includes(eq.id)}
                      onCheckedChange={(checked) => {
                        setFollowedRuleIds(prev => 
                          checked ? [...prev, eq.id] : prev.filter(id => id !== eq.id)
                        )
                      }}
                    />
                    <Label htmlFor={`rule-${eq.id}`} className="font-normal text-xs cursor-pointer">
                      {eq.outcome}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
