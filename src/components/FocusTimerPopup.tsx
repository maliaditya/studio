
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, SkipForward, BrainCircuit } from 'lucide-react';
import type { Activity } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';

interface FocusTimerPopupProps {
  activity: Activity | null;
  duration: number; // in minutes
  onClose: () => void;
  onLogTime: (activity: Activity, minutes: number) => void;
}

export function FocusTimerPopup({ activity, duration, onClose, onLogTime }: FocusTimerPopupProps) {
  const totalSeconds = duration * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(s => s - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      // Handle session completion
      handleStop(true);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft]);

  const handleStop = (completed: boolean) => {
    setIsActive(false);
    const elapsedSeconds = totalSeconds - secondsLeft;
    if (elapsedSeconds > 0 && activity) {
      onLogTime(activity, Math.floor(elapsedSeconds / 60));
    }
    onClose();
  };

  const progress = (totalSeconds - secondsLeft) / totalSeconds * 100;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  if (!activity) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <Card className="w-80 shadow-2xl border-primary/50">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold truncate" title={activity.details}>
                {activity.details}
              </p>
            </div>
            <p className="text-sm font-mono text-muted-foreground">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </p>
          </div>
          <Progress value={progress} className="h-2 mb-4" />
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsActive(!isActive)}>
              {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
             <Button variant="destructive" size="icon" onClick={() => handleStop(false)}>
              <Square className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

