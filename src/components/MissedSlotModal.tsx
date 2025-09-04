
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
    allTasks: Activity[];
    incompleteTasks: Activity[];
  };
  onOpenChange: (isOpen: boolean) => void;
  onSave: (review: MissedSlotReview, newDistraction?: Activity) => void;
}

const parseDurationToMinutes = (durationStr: string | undefined): number => {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    if (/^\d+$/.test(durationStr.trim())) {
        return parseInt(durationStr.trim(), 10);
    }
    let totalMinutes = 0;
    const hourMatch = durationStr.match(/(\d+)\s*h/);
    if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
    const minMatch = durationStr.match(/(\d+)\s*m/);
    if (minMatch) totalMinutes += parseInt(minMatch[1], 10) * 60;
    return totalMinutes;
};


export function MissedSlotModal({ state, onOpenChange, onSave }: MissedSlotModalProps) {
  const { isOpen, slotName, allTasks, incompleteTasks } = state;
  const { pillarEquations, activityDurations, setMissedSlotReviews } = useAuth();
  
  const [reason, setReason] = useState('');
  const [followedRuleIds, setFollowedRuleIds] = useState<string[]>([]);
  const [logAsDistraction, setLogAsDistraction] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setFollowedRuleIds([]);
      setLogAsDistraction(true); // Reset on close
    }
  }, [isOpen]);

  const allEquations = useMemo(() => Object.values(pillarEquations).flat(), [pillarEquations]);
  
  const loggedMinutes = useMemo(() => {
    return allTasks
      .filter(t => t.completed)
      .reduce((sum, task) => sum + parseDurationToMinutes(activityDurations[task.id]), 0);
  }, [allTasks, activityDurations]);


  const modalContent = useMemo(() => {
    const totalMinutesInSlot = 240;
    const remainingMinutes = totalMinutesInSlot - loggedMinutes;

    if (incompleteTasks.length > 0) {
      return {
        title: `Review Your Incomplete '${slotName}' Slot`,
        question: "What was the main reason these tasks were not completed?",
        taskList: incompleteTasks,
        isDistractionLoggable: true,
        freeTime: remainingMinutes,
      };
    }
    if (allTasks.length > 0 && incompleteTasks.length === 0) {
      return {
        title: `Review Your Completed '${slotName}' Slot`,
        question: `You finished all tasks with ${remainingMinutes > 0 ? `${remainingMinutes} minutes` : 'time'} to spare. What did you do with the extra time?`,
        taskList: allTasks,
        isDistractionLoggable: true,
        freeTime: remainingMinutes,
      };
    }
    // No tasks were scheduled
    return {
      title: `Review Your Empty '${slotName}' Slot`,
      question: "You had nothing scheduled for this block. What did you end up doing?",
      taskList: [],
      isDistractionLoggable: true,
      freeTime: totalMinutesInSlot,
    };
  }, [slotName, allTasks, incompleteTasks, loggedMinutes]);

  const handleSave = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const review: MissedSlotReview = {
      id: `${today}-${slotName}`,
      reason,
      followedRuleIds,
    };

    let newDistraction: Activity | undefined = undefined;
    if (logAsDistraction && reason.trim() && modalContent.freeTime > 0) {
        newDistraction = {
            id: `distraction_${Date.now()}`,
            type: 'distraction',
            details: reason.trim(),
            completed: true,
            duration: modalContent.freeTime,
            slot: slotName,
        };
    }

    onSave(review, newDistraction);
  };
  
  const handleSnooze = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const reviewKey = `${today}-${slotName}`;

    setMissedSlotReviews(prev => ({
        ...prev,
        [reviewKey]: {
            ...(prev[reviewKey] || { id: reviewKey, reason: '', followedRuleIds: [] }),
            snoozedUntil: Date.now() + 5 * 60 * 1000 // 5 minutes from now
        }
    }));
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modalContent.title}</DialogTitle>
          <DialogDescription>
            Reflecting on each time block helps build self-awareness.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          {modalContent.taskList.length > 0 && (
            <div>
              <Label className="font-semibold">
                {incompleteTasks.length > 0 ? "Incomplete Tasks:" : "Completed Tasks:"}
              </Label>
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
                {modalContent.taskList.map(task => (
                  <li key={task.id}>{task.details}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <Label htmlFor="reason-textarea">{modalContent.question}</Label>
            <Textarea
              id="reason-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., I was distracted, an unexpected meeting came up, I chose to rest..."
              className="mt-2"
            />
          </div>
          {modalContent.isDistractionLoggable && modalContent.freeTime > 0 && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="log-distraction-check"
                checked={logAsDistraction}
                onCheckedChange={(checked) => setLogAsDistraction(!!checked)}
              />
              <Label htmlFor="log-distraction-check" className="text-sm font-normal">
                Log remaining {modalContent.freeTime} minutes as a distraction
              </Label>
            </div>
          )}
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
        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={handleSnooze}>Remind in 5 Mins</Button>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Review</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
