
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Copy, Trash2 } from 'lucide-react';
import type { Activity, ActivityType } from '@/types/workout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SettingsModal({ isOpen, onOpenChange }: SettingsModalProps) {
  const { currentUser, theme, setTheme, settings, setSettings, habitCards, schedule, setSchedule } = useAuth();
  const { toast } = useToast();

  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [specializationName, setSpecializationName] = useState('');
  const [copyType, setCopyType] = useState<'specialization' | 'micro-skills'>('specialization');

  const settingsKey = currentUser ? `lifeos_settings_${currentUser.username}` : null;

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    if (!settingsKey) return;
    
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      localStorage.setItem(settingsKey, JSON.stringify(newSettings));
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not save your setting.",
        variant: "destructive",
      });
    }
  };

  const handleDefaultHabitChange = (activityType: ActivityType, habitId: string) => {
    const newHabitId = habitId === 'none' ? null : habitId;

    // 1. Update settings
    const newDefaultHabitLinks = {
        ...settings.defaultHabitLinks,
        [activityType]: newHabitId,
    };
    handleSettingChange('defaultHabitLinks', newDefaultHabitLinks);

    // 2. Update all existing non-completed tasks in the schedule
    setSchedule(currentSchedule => {
      const updatedSchedule = { ...currentSchedule };
      
      Object.keys(updatedSchedule).forEach(dateKey => {
        const daySchedule = { ...updatedSchedule[dateKey] };
        let dayWasModified = false;

        Object.keys(daySchedule).forEach(slotName => {
          const activities = daySchedule[slotName] as Activity[] | undefined;

          if (Array.isArray(activities)) {
            let slotWasModified = false;
            const updatedActivities = activities.map(act => {
              if (act.type === activityType && !act.completed) {
                const newHabits = newHabitId ? [newHabitId] : [];
                if (JSON.stringify(act.habitEquationIds || []) !== JSON.stringify(newHabits)) {
                  slotWasModified = true;
                  return { ...act, habitEquationIds: newHabits };
                }
              }
              return act;
            });

            if (slotWasModified) {
              daySchedule[slotName] = updatedActivities;
              dayWasModified = true;
            }
          }
        });
        
        if (dayWasModified) {
          updatedSchedule[dateKey] = daySchedule;
        }
      });

      return updatedSchedule;
    });

    toast({
        title: "Default Habit Updated",
        description: `All scheduled '${activityType}' tasks have been updated.`,
    });
  };


  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast({
        title: "Theme Changed",
        description: `Switched to the new theme.`,
    });
  };

  const handleResetLandingPage = () => {
    localStorage.removeItem('lifeos_hide_landing_page');
    toast({
      title: "Preference Reset",
      description: "The landing page will now be shown on your next visit.",
    });
  };

  const handleOpenCopyModal = (type: 'specialization' | 'micro-skills') => {
    setCopyType(type);
    setIsCopyModalOpen(true);
  };

  const handleCopyTemplate = () => {
    const isMicro = copyType === 'micro-skills';
    const topicName = specializationName.trim() || `[YOUR ${isMicro ? 'MICRO-SKILL CLUSTER' : 'SPECIALIZATION'} NAME]`;
    const template = {
      name: isMicro ? undefined : topicName,
      microSkills: isMicro ? [{
        "name": "Vertex, Edge, Face editing",
        "curiosities": [
          {
            "name": "Mastering Component-Level Edits",
            "description": "Learn the fundamentals of manipulating mesh components.",
            "link": "",
            "estimatedDuration": 240,
            "objectives": [
              {
                "name": "Efficiently Use Basic Transform Tools",
                "description": "Understand how to use Move, Rotate, and Scale on vertices, edges, and faces.",
                "link": "",
                "estimatedDuration": 120,
                "visualizations": [
                  {
                    "name": "Practical Application: Model a Simple Chair",
                    "description": "Create a basic chair model using only component transformations.",
                    "link": "",
                    "estimatedDuration": 60,
                    "resourceCards": [
                      {
                        "name": "Elements",
                        "points": [
                          { "type": "text", "text": "Vertex: A single point in 3D space." },
                          { "type": "text", "text": "Edge: A line connecting two vertices." },
                          { "type": "text", "text": "Face: A flat surface enclosed by edges." }
                        ]
                      },
                      {
                        "name": "Tools",
                        "points": [
                          { "type": "text", "text": "Move Tool (G-key): Repositions selected components." },
                          { "type": "text", "text": "Rotate Tool (R-key): Rotates components around a pivot." },
                          { "type": "text", "text": "Scale Tool (S-key): Resizes components relative to a pivot." },
                          { "type": "code", "text": "import bpy; bpy.ops.transform.translate(value=(1, 0, 0))" }
                        ]
                      },
                      {
                        "name": "Patterns",
                        "points": [
                          { "type": "markdown", "text": "A **Markdown** formatted note with `code` snippets and [links](https://example.com)." }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }] : [],
      skillAreas: isMicro ? undefined : [
        {
          "name": "Name of Skill Area 1",
          "purpose": "A brief description of what this skill area is for.",
          "microSkills": [
            {
              "name": "Name of Micro-Skill 1.1",
              "curiosities": [
                {
                  "name": "Curiosity Name (e.g., Learn CUDA Basics)",
                  "description": "Optional description for the curiosity.",
                  "link": "https://example.com/resource",
                  "estimatedDuration": 120,
                  "objectives": [
                    {
                      "name": "Objective Name (e.g., Understand Memory Management)",
                      "description": "Optional description.",
                      "link": "",
                      "estimatedDuration": 60,
                      "visualizations": [
                        {
                          "name": "Visualization Task (e.g., Code a simple kernel)",
                          "description": "Specific, loggable task.",
                          "link": "",
                          "estimatedDuration": 30,
                          "resourceCards": [
                            {
                              "name": "Elements",
                              "points": [
                                { "type": "text", "text": "Core Concept 1 (e.g. Vertex, Edge, Face)" },
                                { "type": "text", "text": "Core Concept 2 (e.g. Component, State, Prop)" }
                              ]
                            },
                            {
                              "name": "Tools",
                              "points": [
                                { "type": "text", "text": "Tool or operation (e.g. Extrude, Bevel)" },
                                { "type": "code", "text": "printf('Hello, World!');" }
                              ]
                            },
                            {
                              "name": "Patterns",
                              "points": [
                                { "type": "markdown", "text": "A **Markdown** formatted note with `code` snippets and [links](https://example.com)." }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    
    const finalTemplate = isMicro ? template.microSkills : template;
    const roleText = isMicro
        ? "Your task is to take a cluster of related micro-skills and break them down into a comprehensive, hierarchical learning plan."
        : "Your task is to take a high-level technical specialization and break it down into a comprehensive, hierarchical learning plan.";
    const goalText = isMicro 
        ? `Generate a single, valid JSON array that represents a complete learning path for the micro-skill cluster: **\`${topicName}\`**.`
        : `Generate a single, valid JSON object that represents a complete learning path for the specialization: **\`${topicName}\`**.`;

    const fullPrompt = `### AI Prompt for Generating a Comprehensive ${isMicro ? 'Micro-Skill Cluster' : 'Specialization'} JSON

**Your Role:** You are an expert curriculum designer and technical writer. ${roleText}

**Your Goal:** ${goalText}

**Crucial Instructions:**

1.  **Be Thorough and Expansive:** Do not provide a minimal or superficial outline. The goal is a detailed, rich curriculum. Each level of the hierarchy should contain **multiple entries** where appropriate. For example, a "Curiosity" should branch into multiple "Objectives," and an "Objective" should have multiple "Visualizations."
2.  **Follow the JSON Schema Strictly:** The output must be a single, valid JSON ${isMicro ? 'array' : 'object'} matching the structure provided below.
3.  **Logical Hierarchy:** Ensure the breakdown is logical. "Curiosities" are high-level learning goals. "Objectives" are measurable steps. "Visualizations" are the smallest, concrete, loggable tasks.
4.  **Estimate Durations:** Provide realistic \`estimatedDuration\` values in **minutes** for all learning tasks.
5.  **Define \`resourceCards\` with Meaningful Structure:** For each \`visualization\` task, populate the \`resourceCards\` array. Use this mental model:
    *   **Elements Card:** What exists? List fundamental nouns or concepts (e.g., for 3D modeling: Vertex, Edge, Face; for React: Component, State, Prop).
    *   **Tools Card:** How does it interact? List verbs or operations that act upon the Elements (e.g., for 3D modeling: Extrude, Bevel; for React: \`useState\`, \`useEffect\`, \`.map()\`).
    *   **Patterns Card:** What are the recurring use cases? Describe workflows combining Elements and Tools to achieve a specific goal.
6.  **Use Diverse Content Types:** Within the \`points\` array of a \`resourceCard\`, demonstrate the use of different types: \`"type": "text"\`, \`"type": "code"\`, and \`"type": "markdown"\`.

**JSON Schema Definition & Example:**

\`\`\`json
${JSON.stringify(finalTemplate, null, 2)}
\`\`\``;

    navigator.clipboard.writeText(fullPrompt);
    toast({
      title: "Prompt Copied!",
      description: `The AI prompt for "${specializationName}" has been copied.`,
    });
    setSpecializationName('');
    setIsCopyModalOpen(false);
  };
  
  const activityTypesForHabitLinking: ActivityType[] = ['workout', 'upskill', 'deepwork', 'planning', 'tracking', 'branding', 'lead-generation', 'mindset', 'nutrition'];

  const routineTasks = useMemo(() => {
    const routines: Activity[] = [];
    const seenDetails = new Set<string>();
    Object.values(schedule).flat().forEach(day => {
        Object.values(day).flat().forEach(activity => {
            if (activity.isRoutine && !seenDetails.has(activity.details)) {
                routines.push(activity);
                seenDetails.add(activity.details);
            }
        });
    });
    return routines;
  }, [schedule]);

  const handleRemoveRoutine = (activityDetails: string) => {
    setSchedule(prev => {
        const newSchedule = { ...prev };
        Object.keys(newSchedule).forEach(date => {
            const daySchedule = { ...newSchedule[date] };
            Object.keys(daySchedule).forEach(slot => {
                const activities = daySchedule[slot] as Activity[] | undefined;
                if (Array.isArray(activities)) {
                    daySchedule[slot] = activities.map(act => {
                        if (act.details === activityDetails) {
                            return { ...act, isRoutine: false };
                        }
                        return act;
                    });
                }
            });
            newSchedule[date] = daySchedule;
        });
        return newSchedule;
    });
    toast({ title: 'Routine Task Removed', description: `"${activityDetails}" will no longer be carried forward.` });
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Application Settings</DialogTitle>
            <DialogDescription>
              Manage your application preferences here. Changes are saved automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow min-h-0 overflow-hidden">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6 py-4">
                <div className="space-y-4 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Select a visual theme for the application.
                    </p>
                  </div>
                  <RadioGroup
                    value={theme}
                    onValueChange={handleThemeChange}
                    className="grid grid-cols-3 gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="default" id="theme-default" />
                      <Label htmlFor="theme-default" className="font-normal">Default</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="matrix" id="theme-matrix" />
                      <Label htmlFor="theme-matrix" className="font-normal">Matrix</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ad-dark" id="theme-ad-dark" />
                      <Label htmlFor="theme-ad-dark" className="font-normal">Ad Dark</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                 <div className="space-y-4 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Cloud Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      Manage how your data is synced to the cloud.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto-push"
                      checked={settings.autoPush}
                      onCheckedChange={(checked) => handleSettingChange('autoPush', checked)}
                    />
                    <Label htmlFor="auto-push" className="font-normal">
                      Auto Push to Cloud
                    </Label>
                  </div>
                   <div className="flex items-center space-x-2">
                    <Label htmlFor="auto-push-limit" className="font-normal flex-shrink-0">
                      Push when changes reach:
                    </Label>
                    <Input
                      id="auto-push-limit"
                      type="number"
                      value={settings.autoPushLimit}
                      onChange={(e) => handleSettingChange('autoPushLimit', parseInt(e.target.value, 10) || 0)}
                      className="w-24 h-8"
                      disabled={!settings.autoPush}
                    />
                  </div>
                </div>

                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="item-1" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3">
                      <div className="space-y-0.5 text-left">
                        <Label className="text-base">Default Habit Links</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically link a habit when creating a new activity.
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3 pt-4 border-t">
                            {activityTypesForHabitLinking.map(type => (
                                <div key={type} className="flex items-center justify-between">
                                    <Label htmlFor={`habit-${type}`} className="capitalize font-normal">
                                        {type.replace('-', ' ')}
                                    </Label>
                                    <Select
                                        value={settings.defaultHabitLinks?.[type] || 'none'}
                                        onValueChange={(value) => handleDefaultHabitChange(type, value)}
                                    >
                                        <SelectTrigger className="w-[200px]" id={`habit-${type}`}>
                                            <SelectValue placeholder="Select a habit..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- None --</SelectItem>
                                            {habitCards.map(habit => (
                                                <SelectItem key={habit.id} value={habit.id}>{habit.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="item-2" className="border rounded-lg mt-4">
                    <AccordionTrigger className="px-4 py-3">
                        <div className="space-y-0.5 text-left">
                        <Label className="text-base">Manage Routine Tasks</Label>
                        <p className="text-sm text-muted-foreground">
                            View and remove tasks from your daily routine.
                        </p>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <div className="space-y-2 pt-4 border-t">
                        {routineTasks.length > 0 ? (
                            routineTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                <span className="text-sm font-medium">{task.details}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveRoutine(task.details)}>
                                <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                            </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No routine tasks defined.</p>
                        )}
                        </div>
                    </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <div className="space-y-4 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">General</Label>
                    <p className="text-sm text-muted-foreground">
                      Manage general application behavior.
                    </p>
                  </div>
                   <div className="flex items-center space-x-2">
                    <Switch
                      id="smart-logging"
                      checked={settings.smartLogging}
                      onCheckedChange={(checked) => handleSettingChange('smartLogging', checked)}
                    />
                    <Label htmlFor="smart-logging" className="font-normal">
                      Enable Smart Logging Prompts
                    </Label>
                  </div>
                   <div className="flex items-center justify-between">
                    <Label htmlFor="reset-landing" className="font-normal">
                      Show the welcome page on next visit.
                    </Label>
                    <Button id="reset-landing" variant="outline" size="sm" onClick={handleResetLandingPage}>
                      Reset
                    </Button>
                  </div>
                  <Separator />
                   <div className="flex items-center justify-between">
                    <Label htmlFor="copy-spec-template" className="font-normal">
                      Copy specialization upload prompt.
                    </Label>
                    <Button id="copy-spec-template" variant="outline" size="sm" onClick={() => handleOpenCopyModal('specialization')}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="copy-micro-template" className="font-normal">
                      Copy micro-skill upload prompt.
                    </Label>
                    <Button id="copy-micro-template" variant="outline" size="sm" onClick={() => handleOpenCopyModal('micro-skills')}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isCopyModalOpen} onOpenChange={setIsCopyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter {copyType === 'specialization' ? 'Specialization' : 'Micro-Skill Cluster'} Name</DialogTitle>
            <DialogDescription>This name will be added to the JSON template before copying.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              id="spec-name-input"
              value={specializationName}
              onChange={(e) => setSpecializationName(e.target.value)}
              placeholder={copyType === 'specialization' ? "e.g., GPU Programming" : "e.g., Advanced CSS"}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCopyModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCopyTemplate}>Copy Prompt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
