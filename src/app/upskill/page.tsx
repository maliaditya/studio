
"use client";

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, CalendarIcon, TrendingUp, Loader2, Folder, BookCopy, MoreVertical, ChevronDown } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, getISOWeek, isMonday, getYear, subYears, addDays, parseISO } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, TopicGoal } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { ExerciseProgressModal } from '@/components/ExerciseProgressModal';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { WorkoutHeatmap } from '@/components/WorkoutHeatmap';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription as DialogDescriptionComponent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const getFaviconUrl = (link: string): string | undefined => {
  try {
    let url = link;
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }
    const urlObject = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObject.hostname}&sz=32`;
  } catch (e) {
    return undefined;
  }
};

const DEFAULT_TARGET_SESSIONS = 1;
const DEFAULT_TARGET_DURATION = "25";

const durationChartConfig = {
  totalDuration: { label: "Duration (min)", color: "hsl(var(--primary))" },
} satisfies ChartConfig;


function UpskillPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    exportData,
    allUpskillLogs, setAllUpskillLogs,
    upskillDefinitions, setUpskillDefinitions,
    topicGoals, setTopicGoals
  } = useAuth();

  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicGoalType, setNewTopicGoalType] = useState<'pages' | 'hours'>('pages');
  const [newTopicGoalValue, setNewTopicGoalValue] = useState('');

  const [addingSubtopicTo, setAddingSubtopicTo] = useState<string | null>(null);
  const [newSubtopicName, setNewSubtopicName] = useState('');
  const [newSubtopicDescription, setNewSubtopicDescription] = useState('');
  const [newSubtopicLink, setNewSubtopicLink] = useState('');

  const [editingDefinition, setEditingDefinition] = useState<ExerciseDefinition | null>(null);
  const [editingDefinitionName, setEditingDefinitionName] = useState('');
  const [editingDefinitionDescription, setEditingDefinitionDescription] = useState('');
  const [editingDefinitionLink, setEditingDefinitionLink] = useState('');
  
  const [editingTopicGoal, setEditingTopicGoal] = useState<string | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  const [currentGoal, setCurrentGoal] = useState<TopicGoal>({ goalType: 'pages', goalValue: 0 });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [viewingProgressExercise, setViewingProgressExercise] = useState<ExerciseDefinition | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  
  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  
  const [collapsedTopics, setCollapsedTopics] = useState<Set<string>>(new Set());

  const toggleTopicCollapse = (topic: string) => {
    setCollapsedTopics(prev => {
        const newSet = new Set(prev);
        if (newSet.has(topic)) {
            newSet.delete(topic);
        } else {
            newSet.add(topic);
        }
        return newSet;
    });
  };

  const topicsWithSubtopics = useMemo(() => {
    const grouped: { [key: string]: ExerciseDefinition[] } = {};
    const topics = new Set(upskillDefinitions.map(def => def.category));
    
    Array.from(topics).sort().forEach(topic => {
        grouped[topic] = [];
    });
    
    upskillDefinitions.forEach(def => {
        if (grouped[def.category]) {
            grouped[def.category].push(def);
        }
    });

    return Object.entries(grouped);
  }, [upskillDefinitions]);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setOneYearAgo(subYears(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1));
    setIsLoadingPage(false);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_upskill_${year}-${week}`;
    const hasBeenPrompted = localStorage.getItem(backupPromptKey);
    if (isMonday(today) && !hasBeenPrompted) setShowBackupPrompt(true);
  }, [currentUser]);

  const markBackupPromptAsHandled = () => {
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_upskill_${year}-${week}`;
    localStorage.setItem(backupPromptKey, 'true');
    setShowBackupPrompt(false);
  };

  const handleBackupConfirm = () => {
    exportData();
    markBackupPromptAsHandled();
  };

  const currentDatedWorkout = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return allUpskillLogs.find(log => log.id === dateKey);
  }, [selectedDate, allUpskillLogs]);

  const currentWorkoutExercises = useMemo(() => {
    return currentDatedWorkout?.exercises || [];
  }, [currentDatedWorkout]);

  const updateOrAddWorkoutLog = (updatedWorkout: DatedWorkout) => {
    setAllUpskillLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.id === updatedWorkout.id);
      if (existingLogIndex > -1) {
        const newLogs = [...prevLogs];
        newLogs[existingLogIndex] = updatedWorkout;
        return newLogs;
      }
      return [...prevLogs, updatedWorkout];
    });
  };

  const handleAddTopic = (e: FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) {
      toast({ title: "Error", description: "Topic name cannot be empty.", variant: "destructive" });
      return;
    }
    const topic = newTopicName.trim();
    if (topicsWithSubtopics.some(([t]) => t.toLowerCase() === topic.toLowerCase())) {
        toast({ title: "Error", description: "This topic already exists.", variant: "destructive" });
        return;
    }

    const goalVal = parseInt(newTopicGoalValue, 10);
    if (isNaN(goalVal) || goalVal <= 0) {
        toast({ title: "Invalid Goal", description: "Goal value must be a positive number.", variant: "destructive" });
        return;
    }

    setTopicGoals(prev => ({ ...prev, [topic]: { goalType: newTopicGoalType, goalValue: goalVal } }));
    
    // Add a dummy definition to make the topic appear in the list
    const dummyDef: ExerciseDefinition = {
      id: `topic_placeholder_${Date.now()}`,
      name: 'placeholder',
      category: topic as ExerciseCategory,
    };
    setUpskillDefinitions(prev => prev.filter(d => d.name !== 'placeholder').concat(dummyDef));

    setNewTopicName('');
    setNewTopicGoalValue('');
    toast({ title: "Topic Created", description: `"${topic}" has been added to your library.` });
  };
  
  const handleAddSubtopic = (topic: string) => {
    if (!newSubtopicName.trim()) {
      toast({ title: "Error", description: "Subtopic name cannot be empty.", variant: "destructive" });
      setAddingSubtopicTo(null);
      return;
    }

    if (upskillDefinitions.some(def => def.name.toLowerCase() === newSubtopicName.trim().toLowerCase() && def.category.toLowerCase() === topic.toLowerCase())) {
        toast({ title: "Error", description: "This subtopic already exists for this topic.", variant: "destructive" });
        return;
    }

    const newDef: ExerciseDefinition = { 
        id: `def_${Date.now()}_${Math.random()}`, 
        name: newSubtopicName.trim(),
        category: topic as ExerciseCategory,
        description: newSubtopicDescription.trim(),
        link: newSubtopicLink.trim(),
        iconUrl: getFaviconUrl(newSubtopicLink.trim()),
    };
    
    setUpskillDefinitions(prev => prev.filter(d => d.name !== 'placeholder').concat(newDef));
    setNewSubtopicName('');
    setNewSubtopicDescription('');
    setNewSubtopicLink('');
    setAddingSubtopicTo(null);
    toast({ title: "Success", description: `Subtopic "${newDef.name}" added to ${topic}.` });
  };
  
  const handleDeleteTopic = () => {
    if (!topicToDelete) return;
    setUpskillDefinitions(prev => prev.filter(def => def.category !== topicToDelete));
    setTopicGoals(prev => {
        const newGoals = {...prev};
        delete newGoals[topicToDelete];
        return newGoals;
    });
    setAllUpskillLogs(prevLogs => prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.category !== topicToDelete) })));
    toast({ title: "Topic Deleted", description: `Topic "${topicToDelete}" and all its subtopics have been removed.`});
    setTopicToDelete(null);
  }
  
  const handleStartEditingGoal = (topic: string) => {
    setEditingTopicGoal(topic);
    setCurrentGoal(topicGoals[topic] || { goalType: 'pages', goalValue: 0 });
  }

  const handleSaveGoal = () => {
    if (!editingTopicGoal) return;
    setTopicGoals(prev => ({...prev, [editingTopicGoal]: currentGoal }));
    toast({ title: "Goal Updated", description: `Goal for "${editingTopicGoal}" has been saved.`});
    setEditingTopicGoal(null);
  };
  
  const handleDeleteExerciseDefinition = (id: string) => {
    const defToDelete = upskillDefinitions.find(def => def.id === id);
    setUpskillDefinitions(prev => prev.filter(def => def.id !== id));
    setAllUpskillLogs(prevLogs => 
      prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) }))
    );
    toast({ title: "Success", description: `Task "${defToDelete?.name}" removed.` });
  };

  const handleStartEditDefinition = (def: ExerciseDefinition) => {
    setEditingDefinition(def);
    setEditingDefinitionName(def.name);
    setEditingDefinitionDescription(def.description || '');
    setEditingDefinitionLink(def.link || '');
  };

  const handleSaveEditDefinition = () => {
    if (!editingDefinition || !editingDefinitionName.trim()) {
      toast({ title: "Error", description: "Subtopic name cannot be empty.", variant: "destructive" });
      return;
    }
    const newLink = editingDefinitionLink.trim();
    const oldLink = editingDefinition.link || '';
    
    const updatedDef: ExerciseDefinition = { 
      ...editingDefinition, 
      name: editingDefinitionName.trim(), 
      description: editingDefinitionDescription.trim(),
      link: newLink,
      iconUrl: newLink !== oldLink ? getFaviconUrl(newLink) : editingDefinition.iconUrl,
    };
    
    setUpskillDefinitions(prev => prev.map(def => def.id === editingDefinition.id ? updatedDef : def));
    
    setAllUpskillLogs(prevLogs => 
      prevLogs.map(log => ({
        ...log,
        exercises: log.exercises.map(ex => 
          ex.definitionId === editingDefinition.id ? { ...ex, name: updatedDef.name, category: updatedDef.category } : ex
        )
      }))
    );
    toast({ title: "Success", description: `Task updated to "${updatedDef.name}".` });
    setEditingDefinition(null);
  };

  const handleAddTaskToSession = (definition: ExerciseDefinition) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newWorkoutExercise: WorkoutExercise = {
      id: `${definition.id}-${Date.now()}-${Math.random()}`, definitionId: definition.id, name: definition.name, category: definition.category,
      loggedSets: [], targetSets: parseInt(DEFAULT_TARGET_SESSIONS.toString(), 10), targetReps: DEFAULT_TARGET_DURATION,
    };
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      if (existingWorkout.exercises.some(ex => ex.definitionId === definition.id)) {
        toast({ title: "Info", description: `"${definition.name}" is already in this session.` }); return;
      }
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: [...existingWorkout.exercises, newWorkoutExercise] });
    } else {
      updateOrAddWorkoutLog({ id: dateKey, date: dateKey, exercises: [newWorkoutExercise] });
    }
    toast({ title: "Added to Session", description: `"${definition.name}" added for ${format(selectedDate, 'PPP')}.` });
  };

  const handleRemoveExerciseFromWorkout = (exerciseId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) setAllUpskillLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      else updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => { // Reps will be duration, weight is progress
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout && currentUser?.username) {
      const newSet: LoggedSet = { id: `${Date.now()}-${Math.random()}`, reps, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Progress Logged!", description: `Your learning session has been saved.`});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => { // Reps=duration, weight=progress
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return { ...ex, loggedSets: ex.loggedSets.map(set => 
              set.id === setId ? { ...set, reps, weight, timestamp: Date.now() } : set
            )};
        }
        return ex;
      });
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };

  const handleViewProgress = (definition: ExerciseDefinition) => {
    setViewingProgressExercise(definition);
    setIsProgressModalOpen(true);
  };
  
  const consistencyData = useMemo(() => {
    if (!allUpskillLogs || !oneYearAgo || !today) return [];
    const workoutDates = new Set(allUpskillLogs.filter(log => log.exercises.some(ex => ex.loggedSets.length > 0)).map(log => log.date));
    const data = [];
    let score = 0.5;
    for (let d = new Date(oneYearAgo); d <= today; d = addDays(d, 1)) {
        const dateKey = format(d, 'yyyy-MM-dd');
        if (workoutDates.has(dateKey)) score += (1 - score) * 0.1;
        else score *= 0.95;
        data.push({ date: format(d, 'MMM dd'), fullDate: format(d, 'PPP'), score: Math.round(score * 100) });
    }
    return data;
  }, [allUpskillLogs, oneYearAgo, today]);

  const dailyDurationData = useMemo(() => {
    const dailyData: Record<string, { totalDuration: number; topics: Set<string> }> = {};

    allUpskillLogs.forEach(log => {
        log.exercises.forEach(exercise => {
            const duration = exercise.loggedSets.reduce((sum, set) => sum + set.reps, 0);
            if (duration > 0) {
                if (!dailyData[log.date]) {
                    dailyData[log.date] = { totalDuration: 0, topics: new Set() };
                }
                dailyData[log.date].totalDuration += duration;
                dailyData[log.date].topics.add(exercise.name);
            }
        });
    });

    return Object.entries(dailyData)
        .map(([dateString, data]) => ({
            dateObj: parseISO(dateString),
            totalDuration: data.totalDuration,
            topics: Array.from(data.topics).join(', '),
            date: format(parseISO(dateString), 'MMM dd'),
        }))
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [allUpskillLogs]);
  
  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your upskill data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <aside className="md:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-primary">
                        <Folder /> Topic Library
                    </CardTitle>
                    <CardDescription>Organize your learning tasks by topic and set goals.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddTopic} className="space-y-3 p-3 border rounded-md mb-4">
                        <Input type="text" placeholder="New Topic" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} list="topics-datalist" aria-label="New topic name" className="h-10 text-sm" />
                        <datalist id="topics-datalist">
                          {topicsWithSubtopics.map(([topic]) => <option key={topic} value={topic} />)}
                        </datalist>

                        <div>
                            <Label className="text-xs text-muted-foreground">Set a Goal for this New Topic</Label>
                            <div className="flex gap-2 items-center mt-1">
                                <RadioGroup value={newTopicGoalType} onValueChange={(v) => setNewTopicGoalType(v as 'pages' | 'hours')} className="flex gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="pages" id="type-pages-new" /><Label htmlFor="type-pages-new" className="font-normal">Pages</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="hours" id="type-hours-new" /><Label htmlFor="type-hours-new" className="font-normal">Hours</Label></div>
                                </RadioGroup>
                                <Input type="number" placeholder="Total" value={newTopicGoalValue} onChange={(e) => setNewTopicGoalValue(e.target.value)} aria-label="Goal value" className="h-9" />
                            </div>
                        </div>

                        <Button type="submit" size="sm" className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Topic
                        </Button>
                    </form>

                    <div className="space-y-2 max-h-[calc(100vh-30rem)] overflow-y-auto pr-2">
                        {topicsWithSubtopics.map(([topic, subtopics]) => {
                          const isCollapsed = collapsedTopics.has(topic);
                          return (
                            <div key={topic}>
                                <div className="group flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggleTopicCollapse(topic)}>
                                    <div className="flex items-center gap-2 min-w-0 flex-grow">
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", isCollapsed && "-rotate-90")} />
                                    <Folder className="h-4 w-4 flex-shrink-0 text-primary/80" />
                                    <div className="truncate">
                                        <h4 className="font-semibold text-sm truncate">{topic}</h4>
                                        {topicGoals[topic] && <p className="text-xs text-muted-foreground">Goal: {topicGoals[topic].goalValue} {topicGoals[topic].goalType}</p>}
                                    </div>
                                    </div>
                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => {setAddingSubtopicTo(topic); setNewSubtopicName(''); setNewSubtopicDescription(''); setNewSubtopicLink('');}}>
                                        <PlusCircle className="mr-2 h-4 w-4" /> New Subtopic
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleStartEditingGoal(topic)}>
                                            <Edit3 className="mr-2 h-4 w-4" /> Edit Goal
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onSelect={() => setTopicToDelete(topic)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Topic
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                {!isCollapsed && (
                                  <ul className="space-y-1 pl-4 border-l-2 border-muted ml-4">
                                      {subtopics.filter(s => s.name !== 'placeholder').sort((a,b) => a.name.localeCompare(b.name)).map(def => (
                                      <li key={def.id} className="group flex items-center justify-between p-1.5 rounded-md hover:bg-muted">
                                          {editingDefinition?.id === def.id ? (
                                          <div className='flex-grow flex flex-col gap-2'>
                                              <Input value={editingDefinitionName} onChange={(e) => setEditingDefinitionName(e.target.value)} className="h-8" />
                                              <Textarea value={editingDefinitionDescription} onChange={(e) => setEditingDefinitionDescription(e.target.value)} placeholder="Description" />
                                              <Input value={editingDefinitionLink} onChange={(e) => setEditingDefinitionLink(e.target.value)} placeholder="Link" />
                                              <div className="flex gap-2 self-end">
                                                  <Button size="icon" className="h-8 w-8" onClick={handleSaveEditDefinition}><Save className="h-4 w-4"/></Button>
                                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingDefinition(null)}><X className="h-4 w-4"/></Button>
                                              </div>
                                          </div>
                                          ) : (
                                          <>
                                              <div className="flex items-center gap-2 flex-grow min-w-0">
                                              <BookCopy className="h-4 w-4 flex-shrink-0 text-muted-foreground/80" />
                                              <span className="truncate" title={def.name}>{def.name}</span>
                                              </div>
                                              <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 flex-shrink-0">
                                                  <MoreVertical className="h-4 w-4" />
                                                  </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onSelect={() => handleAddTaskToSession(def)}><PlusCircle className="mr-2 h-4 w-4" /><span>Add to Session</span></DropdownMenuItem>
                                                  <DropdownMenuItem onSelect={() => handleViewProgress(def)}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem onSelect={() => handleStartEditDefinition(def)}><Edit3 className="mr-2 h-4 w-4" /><span>Edit</span></DropdownMenuItem>
                                                  <DropdownMenuItem onSelect={() => handleDeleteExerciseDefinition(def.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Delete</span></DropdownMenuItem>
                                              </DropdownMenuContent>
                                              </DropdownMenu>
                                          </>
                                          )}
                                      </li>
                                      ))}
                                      {addingSubtopicTo === topic && (
                                      <li className="p-1.5">
                                          <form onSubmit={(e) => { e.preventDefault(); handleAddSubtopic(topic); }} className="space-y-2">
                                              <Input value={newSubtopicName} onChange={(e) => setNewSubtopicName(e.target.value)} className="h-8" autoFocus placeholder="New Subtopic Name" />
                                              <Textarea value={newSubtopicDescription} onChange={(e) => setNewSubtopicDescription(e.target.value)} placeholder="Description..." />
                                              <Input value={newSubtopicLink} onChange={(e) => setNewSubtopicLink(e.target.value)} placeholder="Link..." />
                                              <div className="flex justify-end gap-2">
                                                  <Button size="icon" className="h-8 w-8" type="submit"><Save className="h-4 w-4"/></Button>
                                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setAddingSubtopicTo(null)}><X className="h-4 w-4"/></Button>
                                              </div>
                                          </form>
                                      </li>
                                      )}
                                  </ul>
                                )}
                            </div>
                        )})}
                    </div>
                </CardContent>
            </Card>
          </aside>

          <section aria-labelledby="current-learning-heading" className="md:col-span-2 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="flex-grow">
                          <CardTitle id="current-learning-heading" className="flex items-center gap-2 text-lg text-primary">
                              <ListChecks /> Learning Session for: {format(selectedDate, 'PPP')}
                          </CardTitle>
                      </div>
                      <Popover>
                          <PopoverTrigger asChild>
                          <Button variant={"outline"} className="w-[200px] justify-start text-left font-normal h-10">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
                          </PopoverContent>
                      </Popover>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
                      {currentWorkoutExercises.length === 0 ? (
                        <div className="text-center py-10">
                            <BookCopy className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">No tasks for {format(selectedDate, 'PPP')}.</p>
                            <p className="text-sm text-muted-foreground/80">Add tasks from the library to get started!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <AnimatePresence>
                          {currentWorkoutExercises.map(exercise => {
                              const definition = upskillDefinitions.find(def => def.id === exercise.definitionId);
                              return (
                                <WorkoutExerciseCard 
                                  key={exercise.id} 
                                  exercise={exercise}
                                  definitionGoal={topicGoals[exercise.category]}
                                  onLogSet={handleLogSet} 
                                  onDeleteSet={handleDeleteSet} 
                                  onUpdateSet={handleUpdateSet} 
                                  onRemoveExercise={handleRemoveExerciseFromWorkout}
                                  onViewProgress={definition ? () => handleViewProgress(definition) : undefined}
                                  pageType="upskill"
                                />
                              );
                          })}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </CardContent>
              </Card>
              <WorkoutHeatmap
                title="Learning Activity"
                description="Your learning consistency over the last year. Click a square to view that day's log."
                graphDescription="Your probability of learning, based on recent consistency."
                allWorkoutLogs={allUpskillLogs}
                onDateSelect={(date) => setSelectedDate(parseISO(date))}
                consistencyData={consistencyData}
                oneYearAgo={oneYearAgo}
                today={today}
              />
          </section>
        </div>
        {viewingProgressExercise && (
          <ExerciseProgressModal 
            isOpen={isProgressModalOpen} 
            onOpenChange={setIsProgressModalOpen}
            exercise={viewingProgressExercise} 
            allWorkoutLogs={allUpskillLogs}
            topicGoals={topicGoals}
            pageType="upskill"
          />
        )}
      </div>

      <AlertDialog open={showBackupPrompt} onOpenChange={setShowBackupPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weekly Backup Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              It's Monday! Would you like to back up your upskilling data? This will download a file to your computer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={markBackupPromptAsHandled}>Maybe Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackupConfirm}>Yes, Back Up Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!topicToDelete} onOpenChange={() => setTopicToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This will permanently delete the topic "{topicToDelete}" and ALL of its subtopics and logged sessions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTopic} className="bg-destructive hover:bg-destructive/90">
                Delete Topic
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingTopicGoal} onOpenChange={() => setEditingTopicGoal(null)}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Edit Goal for "{editingTopicGoal}"</DialogTitle>
                <DialogDescriptionComponent>
                    Update the target goal for this topic.
                </DialogDescriptionComponent>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <RadioGroup value={currentGoal.goalType} onValueChange={(v) => setCurrentGoal(prev => ({...prev, goalType: v as 'pages' | 'hours'}))} className="flex gap-4">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="pages" id="type-pages" /><Label htmlFor="type-pages" className="font-normal">Pages</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="hours" id="type-hours" /><Label htmlFor="type-hours" className="font-normal">Hours</Label></div>
                </RadioGroup>
                <Input type="number" placeholder="Total" value={currentGoal.goalValue} onChange={(e) => setCurrentGoal(prev => ({...prev, goalValue: parseInt(e.target.value, 10) || 0}))} aria-label="Goal value" />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingTopicGoal(null)}>Cancel</Button>
                <Button onClick={handleSaveGoal}>Save Goal</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function UpskillPage() {
  return ( <AuthGuard> <UpskillPageContent /> </AuthGuard> );
}
