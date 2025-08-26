
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Play, SkipForward, ChevronUp, ChevronDown, Workflow, Link as LinkIcon, Eye, PlusCircle, ArrowRight, Minus, Save } from 'lucide-react';
import type { Activity, HabitEquation, Resource } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';


interface FocusSessionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activity: Activity | null;
  onStartSession: (activity: Activity, duration: number) => void;
  onLogDuration: (activity: Activity, duration: number) => void;
  initialDuration: number;
}

export function FocusSessionModal({
  isOpen,
  onOpenChange,
  activity,
  onStartSession,
  onLogDuration,
  initialDuration,
}: FocusSessionModalProps) {
  const { allDeepWorkLogs, allUpskillLogs, pillarEquations, metaRules, resources, openRuleDetailPopup, openGeneralPopup, setPillarEquations, schedule, setSchedule, activeFocusSession, updateActivity } = useAuth();
  const [duration, setDuration] = useState(45);
  const [skipBreaks, setSkipBreaks] = useState(false);
  
  const [isSelectRulesOpen, setIsSelectRulesOpen] = useState(false);
  const [tempSelectedRuleIds, setTempSelectedRuleIds] = useState<string[]>([]);
  
  const [isLinkResourceOpen, setIsLinkResourceOpen] = useState(false);
  const [linkingToEquationId, setLinkingToEquationId] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');

  const [dailyGoalHours, setDailyGoalHours] = useState(8);

  useEffect(() => {
    setDuration(initialDuration > 0 ? initialDuration : 45);
  }, [initialDuration, isOpen]);

  useEffect(() => {
    if (activity?.habitEquationIds) {
      setTempSelectedRuleIds(activity.habitEquationIds);
    } else {
      setTempSelectedRuleIds([]);
    }
  }, [activity]);
  
  // These are placeholders for future functionality.
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [breakAfterMinutes, setBreakAfterMinutes] = useState(25);

  const dailyProgress = useMemo(() => {
    // This logic can be expanded to be more robust
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const getMinutesForDay = (dateKey: string) => {
        let total = 0;
        const deepLog = allDeepWorkLogs.find(log => log.date === dateKey);
        if(deepLog) total += deepLog.exercises.reduce((sum, ex) => sum + ex.loggedSets.reduce((s, set) => s + set.weight, 0), 0);
        
        const upskillLog = allUpskillLogs.find(log => log.date === dateKey);
        if(upskillLog) total += upskillLog.exercises.reduce((sum, ex) => sum + ex.loggedSets.reduce((s, set) => s + set.reps, 0), 0);
        
        return total;
    }
    
    const completed = getMinutesForDay(today);
    const yesterdayCompleted = getMinutesForDay(yesterday);
    
    return {
      yesterday: yesterdayCompleted,
      goal: dailyGoalHours * 60,
      completed: completed,
      streak: 0, // Placeholder
    };
  }, [allDeepWorkLogs, allUpskillLogs, isOpen, dailyGoalHours]);
  
  const chartData = [
    {
      name: 'completed',
      value: dailyProgress.goal > 0 ? (dailyProgress.completed / dailyProgress.goal) * 100 : 0,
      fill: 'hsl(var(--primary))',
    },
  ];

  const handleStartClick = () => {
    if (activity) {
      const now = Date.now();
      const updatedActivity: Activity = {
        ...activity,
        focusSessionInitialStartTime: now,
        focusSessionStartTime: now,
        focusSessionEndTime: undefined,
        focusSessionPauses: [],
        focusSessionInitialDuration: duration,
      };
      updateActivity(updatedActivity); // Persist the initial start time immediately
      onStartSession(updatedActivity, duration);
      onOpenChange(false);
    }
  };

  const handleDurationChange = (amount: number) => {
    setDuration(prev => Math.max(5, prev + amount));
  };
  
  const breaks = Math.floor(duration / (breakAfterMinutes + breakMinutes));

  const allEquations = useMemo(() => Object.values(pillarEquations).flat(), [pillarEquations]);
  
  const handleSaveRuleSelection = () => {
    if (!activity) return;
    const { slot } = activity;

    setSchedule(prevSchedule => {
        const dateKey = Object.keys(prevSchedule).find(key => 
            Object.values(prevSchedule[key]).flat().some(act => act.id === activity.id)
        );

        if (!dateKey) return prevSchedule;

        const newSchedule = { ...prevSchedule };
        const daySchedule = { ...newSchedule[dateKey] };

        if (daySchedule[slot]) {
            daySchedule[slot] = (daySchedule[slot] as Activity[]).map(act => 
                act.id === activity.id ? { ...act, habitEquationIds: tempSelectedRuleIds } : act
            );
            newSchedule[dateKey] = daySchedule;
        }
        return newSchedule;
    });
    setIsSelectRulesOpen(false);
  };
  
  
  const handleLinkResourceSave = () => {
    if (!linkingToEquationId || !selectedResourceId) return;

    setPillarEquations(prevPillars => {
        const newPillars = { ...prevPillars };
        for (const pillar in newPillars) {
            newPillars[pillar] = (newPillars[pillar] || []).map(eq =>
                eq.id === linkingToEquationId ? { ...eq, linkedResourceId: selectedResourceId } : eq
            );
        }
        return newPillars;
    });
    setIsLinkResourceOpen(false);
    setLinkingToEquationId(null);
    setSelectedResourceId('');
  };
  
  const selectedRules = useMemo(() => {
    if (!activity?.habitEquationIds) return [];
    return allEquations.filter(eq => activity.habitEquationIds!.includes(eq.id));
  }, [activity, allEquations]);

  const handleLogDurationClick = () => {
    if (activity) {
      onLogDuration(activity, duration);
      onOpenChange(false);
    }
  };

  if (!activity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Focus Session</DialogTitle>
          <DialogDescription>
            Configure your Pomodoro-style focus session for '{activity.details}'.
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={!!activeFocusSession} className="group space-y-4 pt-4">
            <div className="flex items-center justify-center space-x-4">
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => handleDurationChange(-5)}><Minus /></Button>
                <div className="text-6xl font-bold w-24 text-center">{duration}</div>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => handleDurationChange(5)}><PlusCircle /></Button>
            </div>
            <p className="text-center text-sm text-muted-foreground -mt-2">minutes</p>
            <div className="flex items-center space-x-2 justify-center">
                <Checkbox id="skip-breaks-modal" checked={skipBreaks} onCheckedChange={(checked) => setSkipBreaks(!!checked)} />
                <Label htmlFor="skip-breaks-modal">Skip breaks</Label>
            </div>
        </fieldset>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="w-full" onClick={handleLogDurationClick} disabled={!!activeFocusSession}>
            <Save className="mr-2 h-4 w-4" /> Log Duration
          </Button>
          <Button className="w-full" onClick={handleStartClick} disabled={!!activeFocusSession}>
            <Play className="mr-2 h-4 w-4" /> Start Focus Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
