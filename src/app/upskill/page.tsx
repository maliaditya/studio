
"use client";

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, ChevronRight, CalendarIcon, GripVertical, TrendingUp, Filter as FilterIcon, Loader2, Info, Youtube, ChevronDown, ChevronUp, Target, LineChart as LineChartIcon, BookCopy } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, parse, getISOWeek, isMonday, getYear, subYears, addDays, parseISO } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, WeightLog, Gender, TopicGoal } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { ExerciseProgressModal } from '@/components/ExerciseProgressModal';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { WorkoutHeatmap } from '@/components/WorkoutHeatmap';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WeightChartModal } from '@/components/WeightChartModal';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const DEFAULT_TARGET_SESSIONS = 1;
const DEFAULT_TARGET_DURATION = "25";

const durationChartConfig = {
  totalDuration: { label: "Duration (min)", color: "hsl(var(--primary))" },
} satisfies ChartConfig;


function UpskillPageContent() {
  const { toast } = useToast();
  const { currentUser, exportData } = useAuth();

  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  const [topicGoals, setTopicGoals] = useState<Record<string, TopicGoal>>({});
  const [newSubtopicName, setNewSubtopicName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicGoalType, setNewTopicGoalType] = useState<'pages' | 'hours'>('pages');
  const [newTopicGoalValue, setNewTopicGoalValue] = useState('');

  const [editingDefinition, setEditingDefinition] = useState<ExerciseDefinition | null>(null);
  const [editingDefinitionName, setEditingDefinitionName] = useState('');
  const [editingDefinitionCategory, setEditingDefinitionCategory] = useState<string>('');

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allWorkoutLogs, setAllWorkoutLogs] = useState<DatedWorkout[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);

  const [viewingProgressExercise, setViewingProgressExercise] = useState<ExerciseDefinition | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);

  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [isWeightChartModalOpen, setIsWeightChartModalOpen] = useState(false);

  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  const allTopics = useMemo(() => {
    const topics = new Set(exerciseDefinitions.map(def => def.category));
    return Array.from(topics).sort();
  }, [exerciseDefinitions]);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setOneYearAgo(subYears(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1));
  }, []);

  useEffect(() => {
    if (currentUser?.username) {
        const username = currentUser.username;
        const defsKey = `upskill_definitions_${username}`;
        const logsKey = `upskill_logs_${username}`;
        const goalsKey = `upskill_topic_goals_${username}`;
        
        // Shared health data
        const weightLogsKey = `weightLogs_${username}`;
        const goalWeightKey = `goalWeight_${username}`;
        const heightKey = `height_${username}`;
        const dobKey = `dateOfBirth_${username}`;
        const genderKey = `gender_${username}`;

        try {
            const storedDefinitions = localStorage.getItem(defsKey);
            setExerciseDefinitions(storedDefinitions ? JSON.parse(storedDefinitions) : []);
        } catch (e) { setExerciseDefinitions([]); }

        try {
            const storedGoals = localStorage.getItem(goalsKey);
            setTopicGoals(storedGoals ? JSON.parse(storedGoals) : {});
        } catch (e) { setTopicGoals({}); }
        
        try {
            const storedLogs = localStorage.getItem(logsKey);
            setAllWorkoutLogs(storedLogs ? JSON.parse(storedLogs) : []);
        } catch (e) { setAllWorkoutLogs([]); }
        
        const storedGoal = localStorage.getItem(goalWeightKey);
        if (storedGoal) setGoalWeight(parseFloat(storedGoal));
        
        const storedHeight = localStorage.getItem(heightKey);
        if (storedHeight) setHeight(parseFloat(storedHeight));
        
        const storedDob = localStorage.getItem(dobKey);
        if (storedDob) setDateOfBirth(storedDob);
        
        const storedGender = localStorage.getItem(genderKey);
        if (storedGender === 'male' || storedGender === 'female') setGender(storedGender as Gender);

        try {
            const storedWeightLogs = localStorage.getItem(weightLogsKey);
            setWeightLogs(storedWeightLogs ? JSON.parse(storedWeightLogs) : []);
        } catch (e) { setWeightLogs([]); }
    } else {
      setExerciseDefinitions([]);
      setAllWorkoutLogs([]);
      setTopicGoals({});
      setWeightLogs([]);
      setGoalWeight(null);
      setHeight(null);
      setDateOfBirth(null);
      setGender(null);
    }
    const timer = setTimeout(() => setIsLoadingPage(false), 300);
    return () => clearTimeout(timer);
}, [currentUser]);

  useEffect(() => {
    if (currentUser?.username && !isLoadingPage) {
      try {
        const username = currentUser.username;
        const defsKey = `upskill_definitions_${username}`;
        const logsKey = `upskill_logs_${username}`;
        const goalsKey = `upskill_topic_goals_${username}`;

        localStorage.setItem(defsKey, JSON.stringify(exerciseDefinitions));
        localStorage.setItem(logsKey, JSON.stringify(allWorkoutLogs));
        localStorage.setItem(goalsKey, JSON.stringify(topicGoals));

        // Shared data - avoid duplicating this logic if possible, but keep for standalone page functionality
        const weightLogsKey = `weightLogs_${username}`;
        const goalWeightKey = `goalWeight_${username}`;
        const heightKey = `height_${username}`;
        const dobKey = `dateOfBirth_${username}`;
        const genderKey = `gender_${username}`;
        localStorage.setItem(weightLogsKey, JSON.stringify(weightLogs));
        if (goalWeight !== null) localStorage.setItem(goalWeightKey, goalWeight.toString()); else localStorage.removeItem(goalWeightKey);
        if (height !== null) localStorage.setItem(heightKey, height.toString()); else localStorage.removeItem(heightKey);
        if (dateOfBirth) localStorage.setItem(dobKey, dateOfBirth); else localStorage.removeItem(dobKey);
        if (gender) localStorage.setItem(genderKey, gender); else localStorage.removeItem(genderKey);
      } catch (e) {
        console.error("Error saving upskill data to localStorage", e);
        toast({ title: "Save Error", description: "Could not save data locally.", variant: "destructive"});
      }
    }
  }, [exerciseDefinitions, allWorkoutLogs, topicGoals, currentUser, isLoadingPage, toast, weightLogs, goalWeight, height, dateOfBirth, gender]);

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
    return allWorkoutLogs.find(log => log.id === dateKey);
  }, [selectedDate, allWorkoutLogs]);

  const currentWorkoutExercises = useMemo(() => {
    return currentDatedWorkout?.exercises || [];
  }, [currentDatedWorkout]);

  const filteredExerciseDefinitions = useMemo(() => {
    if (selectedCategories.length === 0) return exerciseDefinitions;
    return exerciseDefinitions.filter(def => selectedCategories.includes(def.category));
  }, [exerciseDefinitions, selectedCategories]);

  const handleCategoryFilterChange = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const updateOrAddWorkoutLog = (updatedWorkout: DatedWorkout) => {
    setAllWorkoutLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.id === updatedWorkout.id);
      if (existingLogIndex > -1) {
        const newLogs = [...prevLogs];
        newLogs[existingLogIndex] = updatedWorkout;
        return newLogs;
      }
      return [...prevLogs, updatedWorkout];
    });
  };

  const handleAddTaskDefinition = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newSubtopicName.trim() === '' || newTopicName.trim() === '') {
      toast({ title: "Error", description: "Topic and Subtopic cannot be empty.", variant: "destructive" });
      return;
    }
    const topic = newTopicName.trim();
    const subtopic = newSubtopicName.trim();

    if (exerciseDefinitions.some(def => def.name.toLowerCase() === subtopic.toLowerCase() && def.category.toLowerCase() === topic.toLowerCase())) {
      toast({ title: "Error", description: "This subtopic already exists for this topic.", variant: "destructive" });
      return;
    }
    
    // If it's a new topic, a goal must be provided
    const isNewTopic = !allTopics.includes(topic);
    if (isNewTopic && newTopicGoalValue.trim() !== '') {
        const goalVal = parseInt(newTopicGoalValue, 10);
        if (!isNaN(goalVal) && goalVal > 0) {
            setTopicGoals(prev => ({ ...prev, [topic]: { goalType: newTopicGoalType, goalValue: goalVal } }));
        } else {
            toast({ title: "Invalid Goal", description: "Goal value must be a positive number.", variant: "destructive" });
            return;
        }
    }

    const newDef: ExerciseDefinition = { 
      id: `def_${Date.now().toString()}`, 
      name: subtopic,
      category: topic as ExerciseCategory,
    };
    setExerciseDefinitions(prev => [...prev, newDef]);
    setNewSubtopicName('');
    setNewTopicName('');
    setNewTopicGoalValue('');
    toast({ title: "Success", description: `Task "${newDef.name}" added to library.` });
  };

  const handleDeleteExerciseDefinition = (id: string) => {
    const defToDelete = exerciseDefinitions.find(def => def.id === id);
    setExerciseDefinitions(prev => prev.filter(def => def.id !== id));
    setAllWorkoutLogs(prevLogs => 
      prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) }))
    );
    toast({ title: "Success", description: `Task "${defToDelete?.name}" removed.` });
  };

  const handleStartEditDefinition = (def: ExerciseDefinition) => {
    setEditingDefinition(def);
    setEditingDefinitionName(def.name);
    setEditingDefinitionCategory(def.category);
  };

  const handleSaveEditDefinition = () => {
    if (!editingDefinition || editingDefinitionName.trim() === '' || editingDefinitionCategory.trim() === '') {
      toast({ title: "Error", description: "Topic and Subtopic cannot be empty.", variant: "destructive" });
      return;
    }
    const updatedDef: ExerciseDefinition = { 
      ...editingDefinition, 
      name: editingDefinitionName.trim(), 
      category: editingDefinitionCategory.trim() as ExerciseCategory,
    };
    setExerciseDefinitions(prev => prev.map(def => def.id === editingDefinition.id ? updatedDef : def));
    setAllWorkoutLogs(prevLogs => 
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
      id: `${definition.id}-${Date.now()}`, definitionId: definition.id, name: definition.name, category: definition.category,
      loggedSets: [], targetSets: parseInt(DEFAULT_TARGET_SESSIONS.toString(), 10), targetReps: DEFAULT_TARGET_DURATION,
    };
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
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
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) setAllWorkoutLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      else updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => { // Reps will be duration, weight is progress
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout && currentUser?.username) {
      const newSet: LoggedSet = { id: Date.now().toString(), reps, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Progress Logged!", description: `Your learning session has been saved.`});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => { // Reps=duration, weight=progress
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
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
  
  const handleLogWeight = (weight: number, date: Date) => {
    if (!currentUser) return;
    const year = getYear(date);
    const week = getISOWeek(date).toString().padStart(2, '0');
    const weekKey = `${year}-W${week}`;
    setWeightLogs(prevLogs => {
        const logIndex = prevLogs.findIndex(log => log.date === weekKey);
        const newLog: WeightLog = { date: weekKey, weight: weight };
        if (logIndex > -1) {
            const updatedLogs = [...prevLogs];
            updatedLogs[logIndex] = newLog;
            return updatedLogs;
        } else {
            return [...prevLogs, newLog].sort((a,b) => a.date.localeCompare(b.date));
        }
    });
    toast({ title: "Weight Logged", description: `Weight for the week of ${format(date, 'PPP')} has been saved.` });
  };

  const consistencyData = useMemo(() => {
    if (!allWorkoutLogs || !oneYearAgo || !today) return [];
    const workoutDates = new Set(allWorkoutLogs.filter(log => log.exercises.some(ex => ex.loggedSets.length > 0)).map(log => log.date));
    const data = [];
    let score = 0.5;
    for (let d = new Date(oneYearAgo); d <= today; d = addDays(d, 1)) {
        const dateKey = format(d, 'yyyy-MM-dd');
        if (workoutDates.has(dateKey)) score += (1 - score) * 0.1;
        else score *= 0.95;
        data.push({ date: format(d, 'MMM dd'), fullDate: format(d, 'PPP'), score: Math.round(score * 100) });
    }
    return data;
  }, [allWorkoutLogs, oneYearAgo, today]);

  const dailyDurationData = useMemo(() => {
    const dailyData: Record<string, { totalDuration: number; topics: Set<string> }> = {};

    allWorkoutLogs.forEach(log => {
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
  }, [allWorkoutLogs]);
  
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
          <section aria-labelledby="task-library-heading" className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle id="task-library-heading" className="flex items-center gap-2 text-lg text-primary">
                    <BookCopy /> Task Library
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          <FilterIcon className="h-4 w-4 mr-2" />
                          Filter ({selectedCategories.length > 0 ? selectedCategories.length : "All"})
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Filter by Topic</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {allTopics.map((category) => (
                          <DropdownMenuCheckboxItem
                            key={category} checked={selectedCategories.includes(category)}
                            onCheckedChange={() => handleCategoryFilterChange(category)}
                            onSelect={(e) => e.preventDefault()} 
                          > {category} </DropdownMenuCheckboxItem>
                        ))}
                        {selectedCategories.length > 0 && (
                          <> <DropdownMenuSeparator />
                            <Button variant="ghost" size="sm" className="w-full justify-start text-sm" onClick={() => setSelectedCategories([])}> Clear Filters </Button>
                          </>)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="icon" onClick={() => setIsLibraryExpanded(!isLibraryExpanded)} className="h-8 w-8" aria-label={isLibraryExpanded ? "Collapse task library" : "Expand task library"}>
                      {isLibraryExpanded ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-primary" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <AnimatePresence>
                  {isLibraryExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                      className="space-y-4"
                    >
                      <form onSubmit={handleAddTaskDefinition} className="space-y-3">
                        <Input type="text" placeholder="New Topic" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} list="topics-datalist" aria-label="New topic name" className="h-10 text-sm" />
                        <datalist id="topics-datalist">
                          {allTopics.map(topic => <option key={topic} value={topic} />)}
                        </datalist>

                        <Input type="text" placeholder="New Subtopic (Book, Course, etc.)" value={newSubtopicName} onChange={(e) => setNewSubtopicName(e.target.value)} aria-label="New subtopic name" className="h-10 text-sm" />
                        
                        {!allTopics.includes(newTopicName.trim()) && newTopicName.trim() !== '' && (
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
                        )}

                        <Button type="submit" size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs xl:text-sm xl:h-10 xl:px-4"> <PlusCircle className="mr-2 h-5 w-5" /> Add Task </Button>
                      </form>
                      <div className="max-h-[calc(100vh-38rem)] overflow-y-auto pr-1">
                        {filteredExerciseDefinitions.length === 0 && exerciseDefinitions.length > 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">No tasks match filter.</p>
                        ) : filteredExerciseDefinitions.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">Library empty. Add a new topic and subtopic to get started!</p>
                        ) : (
                          <ul className="space-y-2">
                            <AnimatePresence>
                              {filteredExerciseDefinitions.sort((a,b) => a.name.localeCompare(b.name)).map(def => {
                                const topicGoal = topicGoals[def.category];
                                return (
                                <motion.li key={def.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="p-3 bg-card border rounded-lg shadow-sm">
                                  {editingDefinition?.id === def.id ? (
                                    <div className="space-y-2">
                                      <Input value={editingDefinitionCategory} onChange={(e) => setEditingDefinitionCategory(e.target.value)} className="h-9" aria-label="Edit topic name"/>
                                      <Input value={editingDefinitionName} onChange={(e) => setEditingDefinitionName(e.target.value)} className="h-9" aria-label="Edit subtopic name"/>
                                      {/* Goal editing would require a separate UI, removed from subtopic edit for now */}
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={handleSaveEditDefinition} className="flex-grow bg-green-600 hover:bg-green-500 text-white"><Save className="h-4 w-4 mr-1"/>Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingDefinition(null)} className="flex-grow"><X className="h-4 w-4 mr-1"/>Cancel</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex-grow min-w-0">
                                          <span className="font-medium text-foreground block" title={def.name}>{def.name}</span>
                                          <div className='flex flex-wrap gap-1 mt-0.5'>
                                            <Badge variant="secondary" className="text-xs">{def.category}</Badge>
                                            {topicGoal && <Badge variant="outline" className="text-xs">Goal: {topicGoal.goalValue} {topicGoal.goalType}</Badge>}
                                          </div>
                                      </div>
                                      <div className="flex-shrink-0 flex items-center">
                                        <Button variant="ghost" size="icon" onClick={() => handleViewProgress(def)} className="h-8 w-8 text-muted-foreground hover:text-blue-500" aria-label={`View progress for ${def.name}`}> <TrendingUp className="h-4 w-4" /> </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleStartEditDefinition(def)} className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label={`Edit ${def.name}`}> <Edit3 className="h-4 w-4" /> </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteExerciseDefinition(def.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${def.name}`}> <Trash2 className="h-4 w-4" /> </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleAddTaskToSession(def)} className="h-8 w-8 text-muted-foreground hover:text-accent" aria-label={`Add ${def.name} to session`}> <ChevronRight className="h-5 w-5" /> </Button>
                                      </div>
                                    </div>
                                  )}
                                </motion.li>
                              )})}
                            </AnimatePresence>
                          </ul>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-primary">
                        <LineChartIcon /> Daily Learning Duration
                    </CardTitle>
                    <CardDescription>
                       Total minutes of learning logged each day.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {dailyDurationData.length > 1 ? (
                      <ChartContainer config={durationChartConfig} className="h-[200px] w-full">
                        <ResponsiveContainer>
                          <LineChart data={dailyDurationData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                            <YAxis 
                                tickLine={false} 
                                axisLine={false} 
                                tickMargin={8}
                                fontSize={12}
                                domain={['auto', 'auto']}
                                label={{ value: "Minutes", angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '0.8rem', fill: 'hsl(var(--muted-foreground))' }}}
                            />
                            <RechartsTooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="grid min-w-[12rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                <div className="font-bold text-foreground">{format(data.dateObj, 'PPP')}</div>
                                                <div className="grid gap-1.5">
                                                    <div className="flex w-full items-center gap-2">
                                                        <div className="w-2.5 h-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: 'hsl(var(--primary))' }} />
                                                        <div className="flex flex-1 justify-between">
                                                            <span className="text-muted-foreground">Duration</span>
                                                            <span className="font-mono font-medium text-foreground">{data.totalDuration} min</span>
                                                        </div>
                                                    </div>
                                                    {data.topics && (
                                                        <div className="mt-1 pt-1.5 border-t">
                                                            <p className="font-medium text-foreground mb-1">Subtopics:</p>
                                                            <p className="text-muted-foreground whitespace-normal">{data.topics}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Line type="monotone" dataKey="totalDuration" stroke="var(--color-totalDuration)" strokeWidth={2} dot={false} name="totalDuration" />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    ) : (
                      <div className="flex h-[200px] items-center justify-center text-center text-sm text-muted-foreground">
                        <p>Log learning sessions on multiple days to see a chart of your daily duration.</p>
                      </div>
                    )}
                </CardContent>
            </Card>

          </section>

          <section aria-labelledby="current-learning-heading" className="md:col-span-2 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="flex-grow">
                          <CardTitle id="current-learning-heading" className="flex items-center gap-2 text-lg text-accent">
                              <ListChecks /> Learning Session for: {format(selectedDate, 'PPP')}
                          </CardTitle>
                      </div>
                      <Popover>
                          <PopoverTrigger asChild>
                          <Button variant={"outline"} className={cn("w-[200px] justify-start text-left font-normal h-10",!selectedDate && "text-muted-foreground")}>
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
                            <GripVertical className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">No tasks for {format(selectedDate, 'PPP')}.</p>
                            <p className="text-sm text-muted-foreground/80">Add tasks from the library to get started!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <AnimatePresence>
                          {currentWorkoutExercises.map(exercise => {
                              return (
                                <WorkoutExerciseCard 
                                  key={exercise.id} 
                                  exercise={exercise}
                                  definitionGoal={topicGoals[exercise.category]}
                                  onLogSet={handleLogSet} 
                                  onDeleteSet={handleDeleteSet} 
                                  onUpdateSet={handleUpdateSet} 
                                  onRemoveExercise={handleRemoveExerciseFromWorkout}
                                  onViewProgress={() => handleViewProgress(exerciseDefinitions.find(def => def.id === exercise.definitionId)!)}
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
              <div>
                <WorkoutHeatmap
                  allWorkoutLogs={allWorkoutLogs}
                  onDateSelect={(date) => setSelectedDate(parse(date, 'yyyy-MM-dd', new Date()))}
                  consistencyData={consistencyData}
                  oneYearAgo={oneYearAgo}
                  today={today}
                />
              </div>
          </section>
        </div>
        {viewingProgressExercise && (
          <ExerciseProgressModal 
            isOpen={isProgressModalOpen} 
            onOpenChange={setIsProgressModalOpen}
            exercise={viewingProgressExercise} 
            allWorkoutLogs={allWorkoutLogs}
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

      <WeightChartModal
        isOpen={isWeightChartModalOpen}
        onOpenChange={setIsWeightChartModalOpen}
        weightLogs={weightLogs}
        goalWeight={goalWeight}
        height={height}
        dateOfBirth={dateOfBirth}
        gender={gender}
        onLogWeight={handleLogWeight}
        onUpdateWeightLog={(dateKey, weight) => { /* Implement if needed */ }}
        onDeleteWeightLog={(dateKey) => { /* Implement if needed */ }}
        onSetGoalWeight={(goal) => setGoalWeight(goal)}
        onSetHeight={(h) => setHeight(h)}
        onSetDateOfBirth={(dob) => setDateOfBirth(dob)}
        onSetGender={(g) => setGender(g)}
      />
    </>
  );
}

export default function UpskillPage() {
  return ( <AuthGuard> <UpskillPageContent /> </AuthGuard> );
}
