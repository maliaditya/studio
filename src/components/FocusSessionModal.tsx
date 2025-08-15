
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Play, SkipForward, ChevronUp, ChevronDown } from 'lucide-react';
import type { Activity } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';

interface FocusSessionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activity: Activity | null;
  onStartSession: (activity: Activity, duration: number, breakDuration: number, breakInterval: number) => void;
}

export function FocusSessionModal({
  isOpen,
  onOpenChange,
  activity,
  onStartSession,
}: FocusSessionModalProps) {
  const { allDeepWorkLogs, allUpskillLogs } = useAuth();
  const [duration, setDuration] = useState(45);
  const [skipBreaks, setSkipBreaks] = useState(false);
  
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
      goal: 8 * 60, // 8 hours in minutes
      completed: completed,
      streak: 0, // Placeholder
    };
  }, [allDeepWorkLogs, allUpskillLogs, isOpen]);
  
  const chartData = [
    {
      name: 'completed',
      value: dailyProgress.completed > 0 ? (dailyProgress.completed / dailyProgress.goal) * 100 : 0.1, // Show a sliver for 0
      fill: 'hsl(var(--primary))',
    },
  ];

  const handleStartClick = () => {
    if (activity) {
      onStartSession(activity, duration, breakMinutes, breakAfterMinutes);
      onOpenChange(false);
    }
  };

  const handleDurationChange = (amount: number) => {
    setDuration(prev => Math.max(5, prev + amount));
  };
  
  const breaks = Math.floor(duration / (breakAfterMinutes + breakMinutes));

  if (!activity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Get Ready to Focus */}
            <Card className="lg:col-span-1 shadow-lg">
                <CardHeader>
                    <CardTitle>Get ready to focus</CardTitle>
                    <CardDescription>We'll turn off notifications and app alerts during each session. For longer sessions, we'll add a short break so you can recharge.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-4">
                    <div className="flex items-center justify-center bg-muted/50 rounded-lg p-2 w-40">
                        <div className="text-6xl font-bold w-2/3 text-center">{duration}</div>
                        <div className="flex flex-col items-center w-1/3">
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDurationChange(5)}><ChevronUp /></Button>
                             <span className="text-sm text-muted-foreground -my-1">mins</span>
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDurationChange(-5)}><ChevronDown /></Button>
                        </div>
                    </div>
                     <p className="text-sm text-muted-foreground">You'll have {breaks} break{breaks !== 1 && 's'}.</p>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="skip-breaks" checked={skipBreaks} onCheckedChange={(checked) => setSkipBreaks(!!checked)} />
                        <Label htmlFor="skip-breaks">Skip breaks</Label>
                    </div>
                </CardContent>
                <CardFooter>
                     <Button className="w-full" onClick={handleStartClick}>
                        <Play className="mr-2 h-4 w-4" /> Start focus session
                    </Button>
                </CardFooter>
            </Card>

            {/* Column 2: Daily Progress */}
            <Card className="lg:col-span-1 shadow-lg">
                <CardHeader>
                    <CardTitle>Daily progress</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                    <div className="w-48 h-48 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart
                                innerRadius="75%"
                                outerRadius="100%"
                                data={chartData}
                                startAngle={90}
                                endAngle={-270}
                            >
                                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                <RadialBar
                                    background={{ fill: 'hsl(var(--muted))' }}
                                    dataKey="value"
                                    cornerRadius={10}
                                    angleAxisId={0}
                                />
                            </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-muted-foreground text-sm">Daily goal</p>
                            <p className="text-4xl font-bold">{dailyProgress.goal / 60}</p>
                            <p className="text-muted-foreground">hours</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-6 text-center w-full">
                        <div>
                            <p className="text-muted-foreground text-sm">Yesterday</p>
                            <p className="text-2xl font-bold">{dailyProgress.yesterday}</p>
                            <p className="text-xs text-muted-foreground">minutes</p>
                        </div>
                        <div className="border-l border-r px-4">
                            <p className="text-muted-foreground text-sm">Completed</p>
                            <p className="text-2xl font-bold">{dailyProgress.completed}</p>
                            <p className="text-xs text-muted-foreground">minutes</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm">Streak</p>
                            <p className="text-2xl font-bold">{dailyProgress.streak}</p>
                            <p className="text-xs text-muted-foreground">days</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            {/* Column 3: Task Selection */}
            <Card className="lg:col-span-1 shadow-lg">
                <CardHeader>
                    <CardTitle className="truncate" title={activity.details}>{activity.details}</CardTitle>
                    <CardDescription>This is your selected task for the session.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <p className="text-sm text-muted-foreground">Focusing on this task will contribute to your daily goals. Stay on track!</p>
                </CardContent>
            </Card>

        </div>
      </DialogContent>
    </Dialog>
  );
}

