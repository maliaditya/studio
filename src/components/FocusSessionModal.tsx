

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
import { Play, SkipForward, ChevronUp, ChevronDown, Workflow, Link as LinkIcon, Eye, PlusCircle, ArrowRight, Minus } from 'lucide-react';
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
  initialDuration: number;
}

export function FocusSessionModal({
  isOpen,
  onOpenChange,
  activity,
  onStartSession,
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

  if (!activity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-8">
        <DialogHeader>
          <DialogTitle>Start Focus Session</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <Card className="lg:col-span-1 shadow-lg" disabled={!!activeFocusSession}>
                <fieldset disabled={!!activeFocusSession} className="group">
                    <CardHeader>
                        <CardTitle>Get ready to focus</CardTitle>
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
                </fieldset>
            </Card>

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
                            <div className="flex items-center justify-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setDailyGoalHours(h => Math.max(1, h-1))}><Minus className="h-4 w-4" /></Button>
                                <p className="text-4xl font-bold w-16 text-center">{dailyGoalHours}</p>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setDailyGoalHours(h => h+1)}><PlusCircle className="h-4 w-4" /></Button>
                            </div>
                            <p className="text-muted-foreground">hours</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-6 text-center w-full">
                        <div>
                            <p className="text-muted-foreground text-sm">Yesterday</p>
                            <p className="text-2xl font-bold">{dailyProgress.yesterday || 0}</p>
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
            
            <Card className="lg:col-span-1 shadow-lg flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Rules for this Session</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => setIsSelectRulesOpen(true)}>Select</Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow min-h-0">
                  <ScrollArea className="h-full -mr-4 pr-4">
                    {selectedRules.length > 0 ? (
                        <div className="space-y-2">
                          {selectedRules.map(rule => {
                            const linkedResource = rule.linkedResourceId ? resources.find(r => r.id === rule.linkedResourceId) : null;
                            const relatedMetaRules = (rule.metaRuleIds || []).map(id => metaRules.find(r => r.id === id)).filter(Boolean);

                            return (
                              <Card key={rule.id}>
                                <CardContent className="p-3 text-sm">
                                  <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                                    {relatedMetaRules.map(metaRule => (
                                      <li key={metaRule!.id} className="cursor-pointer hover:text-primary" onClick={(e) => openRuleDetailPopup(metaRule!.id, e)}>
                                        {metaRule!.text}
                                      </li>
                                    ))}
                                  </ul>
                                  <div className="flex items-center gap-1 mt-2 pt-2 border-t font-semibold">
                                    <ArrowRight className="h-4 w-4 text-primary" />
                                    <span>{rule.outcome}</span>
                                  </div>
                                  <div className="flex justify-end items-center gap-1 mt-2">
                                    <Popover onOpenChange={(open) => {
                                      if (open) {
                                        setLinkingToEquationId(rule.id);
                                        setSelectedResourceId(rule.linkedResourceId || '');
                                      } else {
                                        setLinkingToEquationId(null);
                                      }
                                    }}>
                                      <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6"><LinkIcon className="h-3 w-3"/></Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-64 p-2">
                                        <div className="space-y-2">
                                          <Label>Link Resource Card</Label>
                                          <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
                                            <SelectTrigger><SelectValue placeholder="Select a card..."/></SelectTrigger>
                                            <SelectContent>
                                              {resources.filter(r => r.type === 'card' || r.type === 'habit' || r.type === 'mechanism').map(r => (
                                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <Button onClick={handleLinkResourceSave} size="sm" className="w-full">Save Link</Button>
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                    {rule.linkedResourceId && (
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => openGeneralPopup(rule.linkedResourceId!, e)}>
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground h-full flex items-center justify-center">
                            <p>No rules selected for this session.</p>
                        </div>
                    )}
                  </ScrollArea>
                </CardContent>
            </Card>
        </div>
         <Dialog open={isSelectRulesOpen} onOpenChange={setIsSelectRulesOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select Rule Equations for Session</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-80 my-4 pr-4">
                    <div className="space-y-2">
                        {allEquations.map(eq => (
                            <div key={eq.id} className="flex items-center space-x-2 p-2 border rounded-md">
                                <Checkbox
                                    id={`rule-eq-${eq.id}`}
                                    checked={tempSelectedRuleIds.includes(eq.id)}
                                    onCheckedChange={() => {
                                        setTempSelectedRuleIds(prev => prev.includes(eq.id) ? prev.filter(id => id !== eq.id) : [...prev, eq.id])
                                    }}
                                />
                                <Label htmlFor={`rule-eq-${eq.id}`} className="font-normal w-full cursor-pointer">{eq.outcome}</Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button onClick={handleSaveRuleSelection}>Save Selection</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
