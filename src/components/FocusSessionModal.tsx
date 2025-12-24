

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Play, SkipForward, ChevronUp, ChevronDown, Workflow, Link as LinkIcon, Eye, PlusCircle, ArrowRight, Minus, Save, ChevronRight as ChevronRightIcon } from 'lucide-react';
import type { Activity, HabitEquation, Resource, ActivityType, CoreSkill, SkillArea, MicroSkill, ExerciseDefinition, WorkoutExercise } from '@/types/workout';
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
    setDeepWorkDefinitions,
    setAllUpskillLogs,
    setAllDeepWorkLogs,
  } = useAuth();
  const [duration, setDuration] = useState(30);
  const [skipBreaks, setSkipBreaks] = useState(false);
  
  const [linkedActivityType, setLinkedActivityType] = useState<ActivityType | ''>(activity?.linkedActivityType || '');

  // New state for hierarchical selection
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [selectedSkillAreaId, setSelectedSkillAreaId] = useState<string | null>(null);
  const [selectedMicroSkillId, setSelectedMicroSkillId] = useState<string | null>(null);
  const [createdTaskInfo, setCreatedTaskInfo] = useState<{ path: string[]; taskName: string } | null>(null);
  
  const specializations = useMemo(() => {
    if (!selectedDomainId) return [];
    return coreSkills.filter(cs => cs.domainId === selectedDomainId && cs.type === 'Specialization');
  }, [selectedDomainId, coreSkills]);

  const skillAreas = useMemo(() => {
    if (!selectedSpecId) return [];
    const spec = coreSkills.find(cs => cs.id === selectedSpecId);
    return spec?.skillAreas || [];
  }, [selectedSpecId, coreSkills]);

  const microSkills = useMemo(() => {
      if (!selectedSkillAreaId) return [];
      const spec = coreSkills.find(cs => cs.id === selectedSpecId);
      if (!spec) return [];
      const skillArea = spec.skillAreas.find(sa => sa.id === selectedSkillAreaId);
      return skillArea?.microSkills || [];
  }, [selectedSkillAreaId, selectedSpecId, coreSkills]);

  useEffect(() => {
    setDuration(initialDuration > 0 ? initialDuration : 30);
    setLinkedActivityType(activity?.linkedActivityType || '');
    // Reset selections when modal opens
    setSelectedDomainId(null);
    setSelectedSpecId(null);
    setSelectedSkillAreaId(null);
    setSelectedMicroSkillId(null);
    setCreatedTaskInfo(null);
  }, [initialDuration, isOpen, activity]);

  const handleDomainChange = (domainId: string) => {
    setSelectedDomainId(domainId);
    setSelectedSpecId(null);
    setSelectedSkillAreaId(null);
    setSelectedMicroSkillId(null);
    setCreatedTaskInfo(null);
  };
  
  const handleSpecChange = (specId: string) => {
    setSelectedSpecId(specId);
    setSelectedSkillAreaId(null);
    setSelectedMicroSkillId(null);
    setCreatedTaskInfo(null);
  };

  const handleSkillAreaChange = (areaId: string) => {
    setSelectedSkillAreaId(areaId);
    setSelectedMicroSkillId(null);
    setCreatedTaskInfo(null);
  };

  const handleCreateTask = () => {
    if (!activity || !selectedMicroSkillId || !linkedActivityType) return;

    const microSkill = microSkills.find(ms => ms.id === selectedMicroSkillId);
    if (!microSkill) return;

    const now = Date.now();
    const taskName = activity.details;
    
    const childId = `def_${now}_child`;
    const parentId = `def_${now}_parent`;

    const childTask: ExerciseDefinition = {
      id: childId,
      name: taskName,
      category: microSkill.name as any,
      nodeType: linkedActivityType === 'deepwork' ? 'Action' : 'Visualization',
    };
    
    const parentTask: ExerciseDefinition = {
        id: parentId,
        name: taskName,
        category: microSkill.name as any,
        nodeType: linkedActivityType === 'deepwork' ? 'Intention' : 'Curiosity',
        [linkedActivityType === 'deepwork' ? 'linkedDeepWorkIds' : 'linkedUpskillIds']: [childId],
    };

    if (linkedActivityType === 'deepwork') {
      setDeepWorkDefinitions(prev => [...prev, parentTask, childTask]);
    } else if (linkedActivityType === 'upskill') {
      setUpskillDefinitions(prev => [...prev, parentTask, childTask]);
    }

    const updatedActivity: Activity = {
      ...activity,
      taskIds: [childId], // Link to the leaf node (Action/Visualization)
      linkedActivityType: linkedActivityType,
      linkedEntityType: linkedActivityType === 'deepwork' ? 'intention' : 'curiosity',
    };
    updateActivity(updatedActivity);

    const domain = skillDomains.find(d => d.id === selectedDomainId);
    const spec = coreSkills.find(s => s.id === selectedSpecId);
    const area = spec?.skillAreas.find(sa => sa.id === selectedSkillAreaId);

    setCreatedTaskInfo({
      path: [
        domain?.name || 'Unknown Domain',
        spec?.name || 'Unknown Specialization',
        area?.name || 'Unknown Skill Area',
        microSkill.name,
        parentTask.name,
      ],
      taskName: childTask.name
    });
  };


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
        linkedActivityType: activity.type === 'pomodoro' ? (linkedActivityType as ActivityType) : undefined,
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
  
  const canCreateTask = selectedMicroSkillId && linkedActivityType;

  if (!activity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="lg:max-w-3xl">
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
                                <Label>4. Select Skill Area</Label>
                                <Select onValueChange={handleSkillAreaChange} value={selectedSkillAreaId || ''}>
                                    <SelectTrigger><SelectValue placeholder="Select Skill Area..." /></SelectTrigger>
                                    <SelectContent>
                                        {skillAreas.map(sa => <SelectItem key={sa.id} value={sa.id}>{sa.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                               </div>
                            )}
                            {selectedSkillAreaId && (
                               <div>
                                <Label>5. Select Micro-Skill</Label>
                                <Select onValueChange={setSelectedMicroSkillId} value={selectedMicroSkillId || ''}>
                                    <SelectTrigger><SelectValue placeholder="Select Micro-Skill..." /></SelectTrigger>
                                    <SelectContent>
                                        {microSkills.map(ms => <SelectItem key={ms.id} value={ms.id}>{ms.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                               </div>
                            )}
                             {createdTaskInfo && (
                                <div className="p-3 bg-muted rounded-md text-sm">
                                    <p className="font-semibold text-foreground">Task Created:</p>
                                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">
                                        {createdTaskInfo.path.map((part, index) => (
                                            <React.Fragment key={index}>
                                                <span>{part}</span>
                                                {index < createdTaskInfo.path.length - 1 && <ChevronRightIcon className="h-3 w-3" />}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <p className="font-medium text-primary mt-1 pl-4">└ {createdTaskInfo.taskName}</p>
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
        <DialogFooter className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="w-full" onClick={handleLogDurationClick}>
                <Save className="mr-2 h-4 w-4" /> Log & Complete
            </Button>
            {activity.type === 'pomodoro' ? (
                <Button variant="secondary" onClick={handleCreateTask} disabled={!canCreateTask}>
                    Create Task
                </Button>
            ) : <div/>}
            <Button className="w-full" onClick={handleStartClick}>
                <Play className="mr-2 h-4 w-4" /> Start Session
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
