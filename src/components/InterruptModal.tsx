
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface InterruptModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  slotName: string | null;
  onSave: (details: {
    activityType: 'interrupt' | 'distraction';
    interruptDetails: string;
    interruptDuration: string;
    applyToFuture: boolean;
  }) => void;
}

export function InterruptModal({
  isOpen,
  onOpenChange,
  slotName,
  onSave,
}: InterruptModalProps) {
  const [activityType, setActivityType] = useState<'interrupt' | 'distraction' | null>(null);
  const [interruptDetails, setInterruptDetails] = useState('');
  const [interruptDuration, setInterruptDuration] = useState('');
  const [applyToFuture, setApplyToFuture] = useState(false);

  const handleSave = () => {
    if (activityType) {
      onSave({
        activityType,
        interruptDetails,
        interruptDuration,
        applyToFuture,
      });
      // Reset form
      setActivityType(null);
      setInterruptDetails('');
      setInterruptDuration('');
      setApplyToFuture(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log an Interruption or Distraction</DialogTitle>
          <DialogDescription>
            What pulled you away from your planned tasks in the {slotName} slot?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label>Type</Label>
            <RadioGroup
              value={activityType || ''}
              onValueChange={(value) =>
                setActivityType(value as 'interrupt' | 'distraction')
              }
              className="flex items-center space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="interrupt" id="type-interrupt" />
                <Label htmlFor="type-interrupt">Interruption</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="distraction" id="type-distraction" />
                <Label htmlFor="type-distraction">Distraction</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-1">
            <Label htmlFor="interrupt-details">Description</Label>
            <Textarea
              id="interrupt-details"
              value={interruptDetails}
              onChange={(e) => setInterruptDetails(e.target.value)}
              placeholder="e.g., Unexpected phone call, browsing social media..."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="interrupt-duration">Duration (minutes)</Label>
            <Input
              id="interrupt-duration"
              type="number"
              value={applyToFuture ? '240' : interruptDuration}
              onChange={(e) => setInterruptDuration(e.target.value)}
              placeholder="e.g., 30"
              disabled={applyToFuture}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="apply-all-slots"
              checked={applyToFuture}
              onCheckedChange={(checked) => setApplyToFuture(!!checked)}
            />
            <Label htmlFor="apply-all-slots" className="font-normal">
              Apply to all future slots for today (sets duration to 240 mins)
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!activityType || !interruptDetails}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
