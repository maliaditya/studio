
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
import type { Activity, HabitEquation, Resource, ActivityType, CoreSkill, SkillArea, MicroSkill, ExerciseDefinition } from '@/types/workout';
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

const pomodoroActivityTypes: ActivityType[] = ['deepwork', 'upskill', 'essentials', 'distraction'];

export function FocusSessionModal({
  isOpen,
  onOpenChange,
  activity,
  onStartSession,
  onLogDuration,
  initialDuration,
}: FocusSessionModalProps) {
  const { 
    allDeepWorkLogs, 
    allUpskillLogs,
    updateActivity, 
    skillDomains, 
    coreSkills,
    setUpskillDefinitions,
    setDeepWorkDefinitions
  } = useAuth();
  const [duration, setDuration] = useState(30);
  const [skipBreaks, setSkipBreaks] = useState(false);
  
  const [linkedActivityType, setLinkedActivityType] = useState<ActivityType | ''>(activity?.linkedActivityType || '');

  // New state for hierarchical selection
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [selectedMicroSkillId, setSelectedMicroSkillId] = useState<string | null>(null);
  
  const specializations = useMemo(() => {
    if (!selectedDomainId) return [];
    return coreSkills.filter(cs => cs.domainId === selectedDomainId && cs.type === 'Specialization');
  }, [selectedDomainId, coreSkills]);

  const microSkills = useMemo(() => {
      if (!selectedSpecId) return [];
      const spec = coreSkills.find(cs => cs.id === selectedSpecId);
      return spec?.skillAreas.flatMap(sa => sa.microSkills) || [];
  }, [selectedSpecId, coreSkills]);

  useEffect(() => {
    setDuration(initialDuration > 0 ? initialDuration : 30);
    setLinkedActivityType(activity?.linkedActivityType || '');
    // Reset selections when modal opens
    setSelectedDomainId(null);
    setSelectedSpecId(null);
    setSelectedMicroSkillId(null);
  }, [initialDuration, isOpen, activity]);

  const handleDomainChange = (domainId: string) => {
    setSelectedDomainId(domainId);
    setSelectedSpecId(null);
    setSelectedMicroSkillId(null);
  };
  
  const handleSpecChange = (specId: string) => {
    setSelectedSpecId(specId);
    setSelectedMicroSkillId(null);
  };

  const dailyProgress = useMemo(() => {
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
      goal: 8 * 60,
      completed: completed,
      streak: 0,
    };
  }, [allDeepWorkLogs, allUpskillLogs, isOpen]);
  
  const handleStartClick = () => {
    if (activity) {
      let taskToLink: Partial<ExerciseDefinition> | null = null;

      if (selectedMicroSkillId && linkedActivityType) {
        const microSkill = microSkills.find(ms => ms.id === selectedMicroSkillId);
        if (microSkill) {
          const newDef: ExerciseDefinition = {
            id: `def_${Date.now()}`,
            name: activity.details,
            category: microSkill.name as any,
            linkedDeepWorkIds: [],
            linkedUpskillIds: [],
          };

          if (linkedActivityType === 'deepwork') {
            setDeepWorkDefinitions(prev => [...prev, newDef]);
          } else if (linkedActivityType === 'upskill') {
            setUpskillDefinitions(prev => [...prev, newDef]);
          }
          taskToLink = newDef;
        }
      }

      const now = Date.now();
      const updatedActivity: Activity = {
        ...activity,
        focusSessionInitialStartTime: now,
        focusSessionStartTime: now,
        focusSessionEndTime: undefined,
        focusSessionPauses: [],
        focusSessionInitialDuration: duration,
        linkedActivityType: activity.type === 'pomodoro' ? (linkedActivityType as ActivityType) : undefined,
        taskIds: taskToLink ? [taskToLink.id!] : activity.taskIds,
      };
      updateActivity(updatedActivity); 
      onStartSession(updatedActivity, duration);
      onOpenChange(false);
    }
  };

  const handleDurationChange = (amount: number) => {
    setDuration(prev => Math.max(5, prev + amount));
  };
  
  const handleLogDurationClick = () => {
    if (activity) {
      const activityToLog: Activity = {
        ...activity,
        linkedActivityType: activity.type === 'pomodoro' ? (linkedActivityType as ActivityType) : undefined,
      };
      onLogDuration(activityToLog, duration);
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
        <div className="space-y-4 pt-4">
            <div className="flex items-center justify-center space-x-4">
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => handleDurationChange(-5)}><Minus /></Button>
                <div className="text-6xl font-bold w-24 text-center">{duration}</div>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => handleDurationChange(5)}><PlusCircle /></Button>
            </div>
            <p className="text-center text-sm text-muted-foreground -mt-2">minutes</p>
            {activity.type === 'pomodoro' && (
                <div className="space-y-3">
                    <div>
                      <Label htmlFor="link-activity-type">1. Link to Activity Type</Label>
                      <Select value={linkedActivityType} onValueChange={(value) => setLinkedActivityType(value as ActivityType)}>
                          <SelectTrigger id="link-activity-type">
                              <SelectValue placeholder="Select activity type..." />
                          </SelectTrigger>
                          <SelectContent>
                              {pomodoroActivityTypes.map(type => (
                                  <SelectItem key={type} value={type} className="capitalize">
                                      {type.replace('-', ' ')}
                                  </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                    </div>
                    {linkedActivityType && (
                        <div className="space-y-3 pl-4 border-l-2">
                           <div>
                            <Label>2. Select Domain</Label>
                            <Select onValueChange={handleDomainChange} value={selectedDomainId || ''}>
                                <SelectTrigger><SelectValue placeholder="Select Domain..." /></SelectTrigger>
                                <SelectContent>
                                    {skillDomains.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                           </div>
                            {selectedDomainId && (
                               <div>
                                <Label>3. Select Specialization</Label>
                                <Select onValueChange={handleSpecChange} value={selectedSpecId || ''}>
                                    <SelectTrigger><SelectValue placeholder="Select Specialization..." /></SelectTrigger>
                                    <SelectContent>
                                        {specializations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                               </div>
                            )}
                            {selectedSpecId && (
                               <div>
                                <Label>4. Select Micro-Skill</Label>
                                <Select onValueChange={setSelectedMicroSkillId} value={selectedMicroSkillId || ''}>
                                    <SelectTrigger><SelectValue placeholder="Select Micro-Skill..." /></SelectTrigger>
                                    <SelectContent>
                                        {microSkills.map(ms => <SelectItem key={ms.id} value={ms.id}>{ms.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                               </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            <div className="flex items-center space-x-2 justify-center">
                <Checkbox id="skip-breaks-modal" checked={skipBreaks} onCheckedChange={(checked) => setSkipBreaks(!!checked)} />
                <Label htmlFor="skip-breaks-modal">Skip breaks</Label>
            </div>
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="w-full" onClick={handleLogDurationClick}>
            <Save className="mr-2 h-4 w-4" /> Log Duration & Complete
          </Button>
          <Button className="w-full" onClick={handleStartClick}>
            <Play className="mr-2 h-4 w-4" /> Start Focus Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
