

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
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Play, SkipForward, ChevronUp, ChevronDown, Workflow, Link as LinkIcon, Eye, PlusCircle, ArrowRight, Minus, Save, ChevronRight as ChevronRightIcon } from 'lucide-react';
import type { Activity, HabitEquation, Resource, ActivityType, CoreSkill, SkillArea, MicroSkill, ExerciseDefinition, WorkoutExercise, SlotName } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FocusSessionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activity: Activity | null;
  onStartSession: (activity: Activity, duration: number) => void;
  onLogDuration: (
    activity: Activity,
    duration: number,
    moveToSlot?: SlotName,
    progress?: { itemsCompleted?: number; hoursCompleted?: number; pagesCompleted?: number; microSkillName?: string }
  ) => void;
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
    updateActivity, 
    skillDomains, 
    coreSkills,
    handleCreateTask,
    currentSlot,
    expectedActivityDurations,
    offerizationPlans,
    setOfferizationPlans,
    upskillDefinitions,
    deepWorkDefinitions,
    allUpskillLogs,
    allDeepWorkLogs,
    getDeepWorkNodeType,
    getUpskillNodeType,
    handleToggleMicroSkillRepetition,
  } = useAuth();
  const [duration, setDuration] = useState(30);
  const [skipBreaks, setSkipBreaks] = useState(false);
  const [itemsCompletedInput, setItemsCompletedInput] = useState('');
  const [hoursCompletedInput, setHoursCompletedInput] = useState('');
  const [pagesCompletedInput, setPagesCompletedInput] = useState('');
  
  const [linkedActivityType, setLinkedActivityType] = useState<ActivityType | ''>(activity?.linkedActivityType || '');

  // State for hierarchical selection
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [selectedSkillAreaId, setSelectedSkillAreaId] = useState<string | null>(null);
  const [selectedMicroSkillId, setSelectedMicroSkillId] = useState<string | null>(null);
  const [selectedParentTaskId, setSelectedParentTaskId] = useState<string>('new');
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
  
  const parentTasks = useMemo(() => {
    if (!selectedMicroSkillId || !linkedActivityType) return [];
    const microSkill = microSkills.find(ms => ms.id === selectedMicroSkillId);
    if (!microSkill) return [];

    if (linkedActivityType === 'deepwork') {
        return deepWorkDefinitions.filter(def => def.category === microSkill.name && getDeepWorkNodeType(def) === 'Intention');
    }
    if (linkedActivityType === 'upskill') {
        return upskillDefinitions.filter(def => def.category === microSkill.name && getUpskillNodeType(def) === 'Curiosity');
    }
    return [];
  }, [selectedMicroSkillId, linkedActivityType, microSkills, deepWorkDefinitions, upskillDefinitions, getDeepWorkNodeType, getUpskillNodeType]);

  const learningContext = useMemo(() => {
    if (!activity || (activity.type !== 'upskill' && activity.type !== 'deepwork')) {
      return {
        microSkillName: null as string | null,
        hasAudio: false,
        hasBooks: false,
        hasSkillTreePath: false,
        skillTreePathNames: [] as string[],
        matchedSpecId: null as string | null,
        matchedSkillAreaId: null as string | null,
        matchedMicroSkillId: null as string | null,
        matchedMicroSkillReady: false,
      };
    }

    const normalizeText = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
    const logInstanceMap = new Map(
      [...allUpskillLogs, ...allDeepWorkLogs].flatMap(log => (log.exercises || []).map(ex => [ex.id, ex.definitionId] as const))
    );

    const candidateIds = new Set<string>([activity.id, ...(activity.taskIds || [])]);
    let matchedDefinition: ExerciseDefinition | undefined;
    candidateIds.forEach((id) => {
      if (matchedDefinition) return;
      const definitionId = logInstanceMap.get(id) || id;
      const found = allDefs.find(def => def.id === definitionId);
      if (found) matchedDefinition = found;
    });
    if (!matchedDefinition) {
      matchedDefinition = allDefs.find(def => normalizeText(def.name) === normalizeText(activity.details));
    }

    const microSkillFromDefinition = matchedDefinition?.category || null;
    const specs = coreSkills.filter((spec) => spec.type === 'Specialization');

    const findSpecByNameOrId = () =>
      specs.find((spec) => spec.id === activity.id || normalizeText(spec.name) === normalizeText(activity.details));

    let matchedSpec = findSpecByNameOrId();
    let matchedArea: SkillArea | undefined;
    let matchedMicro: MicroSkill | null = null;
    let microSkillName: string | null = microSkillFromDefinition;

    if (microSkillName) {
      const candidateSpecs = specs.filter((spec) =>
        spec.skillAreas.some((area) => area.microSkills.some((ms) => normalizeText(ms.name) === normalizeText(microSkillName!)))
      );

      matchedSpec = candidateSpecs[0] || matchedSpec;
      if (candidateSpecs.length > 1) {
        const byActivitySpecName = candidateSpecs.find(
          spec => normalizeText(spec.name) === normalizeText(activity.details)
        );
        if (byActivitySpecName) matchedSpec = byActivitySpecName;
      }
    }

    if (!matchedSpec) {
      return {
        microSkillName: null as string | null,
        hasAudio: false,
        hasBooks: false,
        hasSkillTreePath: false,
        skillTreePathNames: [] as string[],
        matchedSpecId: null as string | null,
        matchedSkillAreaId: null as string | null,
        matchedMicroSkillId: null as string | null,
        matchedMicroSkillReady: false,
      };
    }

    const learningPlan = offerizationPlans?.[matchedSpec.id]?.learningPlan;
    const audioResources = learningPlan?.audioVideoResources || [];
    const bookResources = learningPlan?.bookWebpageResources || [];
    const skillTreePaths = learningPlan?.skillTreePaths || [];

    if (microSkillName) {
      matchedArea = matchedSpec.skillAreas.find((area) =>
        area.microSkills.some((ms) => normalizeText(ms.name) === normalizeText(microSkillName!))
      );
      matchedMicro = matchedArea?.microSkills.find((ms) => normalizeText(ms.name) === normalizeText(microSkillName!)) || null;
    }

    // Fallback for specialization-level tasks with learning plan but no linked micro-skill definition.
    if (!matchedMicro) {
      const firstAreaWithMicros = matchedSpec.skillAreas.find((area) => area.microSkills.length > 0);
      const firstIncompleteMicro =
        matchedSpec.skillAreas.flatMap((area) => area.microSkills).find((ms) => !ms.isReadyForRepetition) ||
        firstAreaWithMicros?.microSkills[0];
      if (firstIncompleteMicro && firstAreaWithMicros) {
        matchedArea = matchedSpec.skillAreas.find((area) => area.microSkills.some((ms) => ms.id === firstIncompleteMicro.id)) || firstAreaWithMicros;
        matchedMicro = firstIncompleteMicro;
        microSkillName = firstIncompleteMicro.name;
      }
    }

    const matchingSkillTreePaths = skillTreePaths.filter((path) => {
      if (!matchedArea?.id) return true;
      const areaIds = path.skillAreaIds || [];
      if (areaIds.length === 0) return true;
      return areaIds.includes(matchedArea.id);
    });
    const hasAudio = audioResources.some((resource) =>
      !!(resource.name || '').trim() ||
      !!(resource.tutor || '').trim() ||
      (resource.totalHours || 0) > 0 ||
      (resource.totalItems || 0) > 0
    );
    const hasBooks = bookResources.some((resource) =>
      !!(resource.name || '').trim() ||
      !!(resource.author || '').trim() ||
      (resource.totalPages || 0) > 0
    );
    return {
      microSkillName,
      hasAudio,
      hasBooks,
      hasSkillTreePath: matchingSkillTreePaths.length > 0,
      skillTreePathNames: matchingSkillTreePaths.map((path) => path.name).filter((name) => !!name?.trim()),
      matchedSpecId: matchedSpec.id,
      matchedSkillAreaId: matchedArea?.id || null,
      matchedMicroSkillId: matchedMicro?.id || null,
      matchedMicroSkillReady: !!matchedMicro?.isReadyForRepetition,
    };
  }, [activity, allDeepWorkLogs, allUpskillLogs, coreSkills, deepWorkDefinitions, offerizationPlans, upskillDefinitions]);

  const deepworkStageContext = useMemo(() => {
    if (!activity || activity.type !== 'deepwork') {
      return null as {
        specializationId: string;
        specializationName: string;
        releaseId: string;
        releaseName: string;
        stageKey: 'ideaItems' | 'codeItems' | 'breakItems' | 'fixItems';
        stageLabel: string;
        pendingItems: Array<{ index: number; text: string }>;
        hasAnyPending: boolean;
      } | null;
    }

    const normalizeText = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
    const logInstanceMap = new Map(
      [...allUpskillLogs, ...allDeepWorkLogs].flatMap(log => (log.exercises || []).map(ex => [ex.id, ex.definitionId] as const))
    );

    const candidateIds = new Set<string>([activity.id, ...(activity.taskIds || [])]);
    let matchedDefinition: ExerciseDefinition | undefined;
    candidateIds.forEach((id) => {
      if (matchedDefinition) return;
      const definitionId = logInstanceMap.get(id) || id;
      const found = allDefs.find(def => def.id === definitionId);
      if (found) matchedDefinition = found;
    });
    if (!matchedDefinition) {
      matchedDefinition = allDefs.find(def => normalizeText(def.name) === normalizeText(activity.details));
    }

    const specs = coreSkills.filter((skill) => skill.type === 'Specialization');
    let matchedSpec = specs.find((spec) => spec.id === activity.id || normalizeText(spec.name) === normalizeText(activity.details));

    if (!matchedSpec && matchedDefinition?.category) {
      const microSkillKey = normalizeText(matchedDefinition.category);
      matchedSpec = specs.find((spec) =>
        spec.skillAreas.some((area) => area.microSkills.some((micro) => normalizeText(micro.name) === microSkillKey))
      );
    }

    if (!matchedSpec) return null;

    const releases = offerizationPlans?.[matchedSpec.id]?.releases || [];
    if (releases.length === 0) return null;

    const stageDefs: Array<{ key: 'ideaItems' | 'codeItems' | 'breakItems' | 'fixItems'; label: string }> = [
      { key: 'ideaItems', label: 'Idea' },
      { key: 'codeItems', label: 'Code' },
      { key: 'breakItems', label: 'Break' },
      { key: 'fixItems', label: 'Fix' },
    ];

    const normalizeStageItem = (item: string | { text: string; completed?: boolean }) =>
      typeof item === 'string' ? { text: item || '', completed: false } : { text: item.text || '', completed: !!item.completed };

    const releaseWithPending = releases.find((release) => {
      return stageDefs.some((stage) => {
        const items = (release.workflowStages?.[stage.key] || []).map(normalizeStageItem);
        return items.some((item) => item.text.trim() && !item.completed);
      });
    }) || releases[0];

    let activeStageKey: 'ideaItems' | 'codeItems' | 'breakItems' | 'fixItems' = 'ideaItems';
    let activeStageLabel = 'Idea';
    let pendingItems: Array<{ index: number; text: string }> = [];
    let hasAnyPending = false;

    stageDefs.forEach((stage) => {
      if (hasAnyPending) return;
      const stageItems = (releaseWithPending.workflowStages?.[stage.key] || [])
        .map(normalizeStageItem)
        .map((item, index) => ({ ...item, index }))
        .filter((item) => item.text.trim());
      const stagePendingItems = stageItems
        .filter((item) => !item.completed)
        .map((item) => ({ index: item.index, text: item.text }));
      if (stagePendingItems.length > 0) {
        hasAnyPending = true;
        activeStageKey = stage.key;
        activeStageLabel = stage.label;
        pendingItems = stagePendingItems;
      }
    });

    return {
      specializationId: matchedSpec.id,
      specializationName: matchedSpec.name,
      releaseId: releaseWithPending.id,
      releaseName: releaseWithPending.name || 'Project',
      stageKey: activeStageKey,
      stageLabel: activeStageLabel,
      pendingItems,
      hasAnyPending,
    };
  }, [activity, allDeepWorkLogs, allUpskillLogs, coreSkills, deepWorkDefinitions, offerizationPlans, upskillDefinitions]);

  const toggleDeepworkStageItem = (
    specializationId: string,
    releaseId: string,
    stageKey: 'ideaItems' | 'codeItems' | 'breakItems' | 'fixItems',
    itemIndex: number,
    completed: boolean
  ) => {
    setOfferizationPlans(prev => {
      const plan = prev[specializationId];
      if (!plan) return prev;
      const releases = (plan.releases || []).map((release) => {
        if (release.id !== releaseId) return release;
        const workflowStages = release.workflowStages || {
          botheringPointId: null,
          botheringText: '',
          ideaItems: [],
          codeItems: [],
          breakItems: [],
          fixItems: [],
        };
        const existingItems = workflowStages[stageKey] || [];
        const updatedItems = existingItems.map((item, index) => {
          if (index !== itemIndex) return item;
          if (typeof item === 'string') {
            return { text: item, completed };
          }
          return { ...item, completed };
        });
        return {
          ...release,
          workflowStages: {
            ...workflowStages,
            [stageKey]: updatedItems,
          },
        };
      });
      return {
        ...prev,
        [specializationId]: {
          ...plan,
          releases,
        },
      };
    });
  };

  const parseDurationLabelToMinutes = (value?: string): number => {
    if (!value) return 0;
    const text = value.toLowerCase().trim();
    if (!text) return 0;

    const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*h/);
    const minMatch = text.match(/(\d+)\s*m(?:in)?/);

    const hours = hourMatch ? Math.round(parseFloat(hourMatch[1]) * 60) : 0;
    const mins = minMatch ? parseInt(minMatch[1], 10) : 0;

    if (!hourMatch && !minMatch && /^\d+$/.test(text)) {
      return parseInt(text, 10);
    }
    return Math.max(0, hours + mins);
  };

  useEffect(() => {
    const expectedLabel = activity ? expectedActivityDurations[activity.id] : undefined;
    const expectedMinutes = parseDurationLabelToMinutes(expectedLabel);
    const fallbackMinutes = initialDuration > 0 ? initialDuration : 30;
    setDuration(expectedMinutes > 0 ? expectedMinutes : fallbackMinutes);
    setLinkedActivityType(activity?.linkedActivityType || '');
    // Reset selections when modal opens
    setSelectedDomainId(null);
    setSelectedSpecId(null);
    setSelectedSkillAreaId(null);
    setSelectedMicroSkillId(null);
    setSelectedParentTaskId('new');
    setCreatedTaskInfo(null);
    setItemsCompletedInput('');
    setHoursCompletedInput('');
    setPagesCompletedInput('');
  }, [initialDuration, isOpen, activity, expectedActivityDurations]);

  const handleDomainChange = (domainId: string) => {
    setSelectedDomainId(domainId);
    setSelectedSpecId(null);
    setSelectedSkillAreaId(null);
    setSelectedMicroSkillId(null);
    setSelectedParentTaskId('new');
    setCreatedTaskInfo(null);
  };
  
  const handleSpecChange = (specId: string) => {
    setSelectedSpecId(specId);
    setSelectedSkillAreaId(null);
    setSelectedMicroSkillId(null);
    setSelectedParentTaskId('new');
    setCreatedTaskInfo(null);
  };

  const handleSkillAreaChange = (areaId: string) => {
    setSelectedSkillAreaId(areaId);
    setSelectedMicroSkillId(null);
    setSelectedParentTaskId('new');
    setCreatedTaskInfo(null);
  };

  const handleMicroSkillChange = (microSkillId: string) => {
    setSelectedMicroSkillId(microSkillId);
    setSelectedParentTaskId('new');
    setCreatedTaskInfo(null);
  }

  const doCreateTask = async () => {
    if (!activity || !selectedMicroSkillId || !linkedActivityType) return;
    
    const microSkill = microSkills.find(ms => ms.id === selectedMicroSkillId);
    if (!microSkill) return;

    const taskInfo = await handleCreateTask(activity, linkedActivityType, microSkill.name, selectedParentTaskId);
    if (taskInfo) {
      const domain = skillDomains.find(d => d.id === selectedDomainId);
      const spec = coreSkills.find(s => s.id === selectedSpecId);
      const area = spec?.skillAreas.find(sa => sa.id === selectedSkillAreaId);

      setCreatedTaskInfo({
        path: [
          domain?.name || 'Unknown Domain',
          spec?.name || 'Unknown Specialization',
          area?.name || 'Unknown Skill Area',
          microSkill.name,
          taskInfo.parentName,
        ],
        taskName: taskInfo.childName
      });
    }
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
      onLogDuration(activityToLog, duration, undefined, {
        itemsCompleted: parseInt(itemsCompletedInput || '0', 10) || 0,
        hoursCompleted: parseFloat(hoursCompletedInput || '0') || 0,
        pagesCompleted: parseInt(pagesCompletedInput || '0', 10) || 0,
        microSkillName: learningContext.microSkillName || undefined,
      });
      onOpenChange(false);
    }
  };
  
  const canCreateTask = selectedMicroSkillId && linkedActivityType;
  const shouldShowLogAndMove = !!currentSlot && !!activity?.slot && activity.slot !== currentSlot;
  const dialogMaxWidthClass = activity?.type === 'pomodoro' ? 'lg:max-w-3xl' : 'sm:max-w-xl';

  const handleLogAndMoveClick = () => {
    if (activity && currentSlot) {
      const activityToLog: Activity = {
        ...activity,
        linkedActivityType: activity.type === 'pomodoro' ? (linkedActivityType as ActivityType) : undefined,
      };
      onLogDuration(activityToLog, duration, currentSlot as SlotName, {
        itemsCompleted: parseInt(itemsCompletedInput || '0', 10) || 0,
        hoursCompleted: parseFloat(hoursCompletedInput || '0') || 0,
        pagesCompleted: parseInt(pagesCompletedInput || '0', 10) || 0,
        microSkillName: learningContext.microSkillName || undefined,
      });
      onOpenChange(false);
    }
  };

  if (!activity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogMaxWidthClass} max-h-[85dvh] flex flex-col`}>
        <DialogHeader>
          <DialogTitle>Start Focus Session</DialogTitle>
          <DialogDescription>
            Configure your Pomodoro-style focus session for '{activity.details}'.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow min-h-0">
          <div className="space-y-4 pt-4 pr-2">
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
                                <Select onValueChange={handleMicroSkillChange} value={selectedMicroSkillId || ''}>
                                    <SelectTrigger><SelectValue placeholder="Select Micro-Skill..." /></SelectTrigger>
                                    <SelectContent>
                                        {microSkills.map(ms => <SelectItem key={ms.id} value={ms.id}>{ms.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                               </div>
                            )}
                             {selectedMicroSkillId && (
                                <div>
                                    <Label>6. Select {linkedActivityType === 'deepwork' ? 'Intention' : 'Curiosity'}</Label>
                                    <Select onValueChange={setSelectedParentTaskId} value={selectedParentTaskId || 'new'}>
                                        <SelectTrigger><SelectValue placeholder="Select parent task..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">Add New Intention/Curiosity</SelectItem>
                                            {parentTasks.map(task => (
                                                <SelectItem key={task.id} value={task.id}>{task.name}</SelectItem>
                                            ))}
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
            {activity.type === 'deepwork' && deepworkStageContext && (
              <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Project flow: <span className="text-foreground">{deepworkStageContext.releaseName}</span>
                </p>
                {deepworkStageContext.hasAnyPending ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Current stage: <span className="text-foreground">{deepworkStageContext.stageLabel}</span>
                    </p>
                    <div className="space-y-2">
                      {deepworkStageContext.pendingItems.map((item) => {
                        const id = `focus-stage-${deepworkStageContext.releaseId}-${deepworkStageContext.stageKey}-${item.index}`;
                        return (
                          <div key={id} className="flex items-center gap-2 rounded border border-white/10 bg-background/40 px-2 py-1.5">
                            <Checkbox
                              id={id}
                              checked={false}
                              onCheckedChange={(checked) =>
                                toggleDeepworkStageItem(
                                  deepworkStageContext.specializationId,
                                  deepworkStageContext.releaseId,
                                  deepworkStageContext.stageKey,
                                  item.index,
                                  !!checked
                                )
                              }
                            />
                            <Label htmlFor={id} className="text-sm leading-snug">{item.text}</Label>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-emerald-400">All workflow stage items are completed.</p>
                )}
              </div>
            )}
            {(activity.type === 'upskill' || activity.type === 'deepwork') &&
              learningContext.microSkillName &&
              (learningContext.hasAudio || learningContext.hasBooks || learningContext.hasSkillTreePath) && (
              <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Progress for micro-skill: <span className="text-foreground">{learningContext.microSkillName}</span>
                </p>
                {learningContext.hasSkillTreePath && learningContext.matchedSpecId && learningContext.matchedSkillAreaId && learningContext.matchedMicroSkillId && (
                  <div className="space-y-2 rounded border border-emerald-500/20 bg-emerald-500/5 p-2">
                    {learningContext.skillTreePathNames.length > 0 && (
                      <p className="text-[11px] text-emerald-300">
                        Skill Tree Path Plan: {learningContext.skillTreePathNames.join(', ')}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="focus-log-micro-ready"
                        checked={learningContext.matchedMicroSkillReady}
                        onCheckedChange={(checked) =>
                          handleToggleMicroSkillRepetition(
                            learningContext.matchedSpecId!,
                            learningContext.matchedSkillAreaId!,
                            learningContext.matchedMicroSkillId!,
                            !!checked
                          )
                        }
                      />
                      <Label htmlFor="focus-log-micro-ready" className="text-xs text-muted-foreground">
                        Mark this micro-skill completed in Skill Tree
                      </Label>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="focus-log-items">Items Completed</Label>
                    <Input
                      id="focus-log-items"
                      type="number"
                      min={0}
                      step={1}
                      placeholder="e.g., 5"
                      value={itemsCompletedInput}
                      onChange={(e) => setItemsCompletedInput(e.target.value)}
                    />
                  </div>
                  {learningContext.hasAudio && (
                    <div className="space-y-1">
                      <Label htmlFor="focus-log-hours">Hours Watched/Listened</Label>
                      <Input
                        id="focus-log-hours"
                        type="number"
                        min={0}
                        step={0.1}
                        placeholder="e.g., 2.5"
                        value={hoursCompletedInput}
                        onChange={(e) => setHoursCompletedInput(e.target.value)}
                      />
                    </div>
                  )}
                  {learningContext.hasBooks && (
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="focus-log-pages">Pages Read</Label>
                      <Input
                        id="focus-log-pages"
                        type="number"
                        min={0}
                        step={1}
                        placeholder="e.g., 50"
                        value={pagesCompletedInput}
                        onChange={(e) => setPagesCompletedInput(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="border-t pt-3">
            <div className="w-full flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={handleLogDurationClick}>
                    <Save className="mr-2 h-4 w-4" /> Log & Complete
                    </Button>
                    {shouldShowLogAndMove && (
                    <Button variant="outline" className="w-full sm:w-auto" onClick={handleLogAndMoveClick}>
                        <ArrowRight className="mr-2 h-4 w-4" /> Log & Move
                    </Button>
                    )}
                </div>
                <Button className="w-full sm:w-44" onClick={handleStartClick}>
                    <Play className="mr-2 h-4 w-4" /> Start Session
                </Button>
            </div>
            {activity.type === 'pomodoro' && (
                <Button variant="secondary" className="w-full sm:w-auto" onClick={doCreateTask} disabled={!canCreateTask}>
                    Create Task
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
