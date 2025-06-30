
"use client";

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, ChevronRight, CalendarIcon, GripVertical, TrendingUp, Filter as FilterIcon, Loader2, Puzzle, ChevronDown, ChevronUp, Briefcase, LineChart as LineChartIcon, BookCopy, ClipboardList, Link as LinkIcon } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, parse, getISOWeek, isMonday, getYear, subYears, addDays, parseISO } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, WeightLog, Gender, ProductizationPlan } from '@/types/workout';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { WeightChartModal } from '@/components/WeightChartModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from '@/components/ui/textarea';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkoutHeatmap } from '@/components/WorkoutHeatmap';


const DEFAULT_TARGET_SESSIONS = 1;
const DEFAULT_TARGET_DURATION = "25";

const durationChartConfig = {
  totalDuration: { label: "Duration (min)", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

function DeepWorkPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    exportData,
    weightLogs, setWeightLogs,
    goalWeight, setGoalWeight,
    height, setHeight,
    dateOfBirth, setDateOfBirth,
    gender, setGender,
    allDeepWorkLogs, setAllDeepWorkLogs,
    deepWorkDefinitions, setDeepWorkDefinitions,
    setProductizationPlans,
    setOfferizationPlans,
    upskillDefinitions, allUpskillLogs,
    deepWorkTopicMetadata, setDeepWorkTopicMetadata,
  } = useAuth();

  const [newSubtopicName, setNewSubtopicName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicClassification, setNewTopicClassification] = useState<'product' | 'service'>('product');
  
  const [editingDefinition, setEditingDefinition] = useState<ExerciseDefinition | null>(null);
  const [editingDefinitionName, setEditingDefinitionName] = useState('');
  const [editingDefinitionCategory, setEditingDefinitionCategory] = useState<string>('');

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [viewingProgressExercise, setViewingProgressExercise] = useState<ExerciseDefinition | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);

  const [isWeightChartModalOpen, setIsWeightChartModalOpen] = useState(false);

  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  // State for details modal
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedFocusArea, setSelectedFocusArea] = useState<ExerciseDefinition | null>(null);
  const [isDetailsEditing, setIsDetailsEditing] = useState(false);
  const [editableLinkedUpskillIds, setEditableLinkedUpskillIds] = useState<string[]>([]);
  
  // State for linking deep work modal
  const [isLinkDeepWorkModalOpen, setIsLinkDeepWorkModalOpen] = useState(false);
  const [linkingFocusArea, setLinkingFocusArea] = useState<ExerciseDefinition | null>(null);
  const [editableLinkedDeepWorkIds, setEditableLinkedDeepWorkIds] = useState<string[]>([]);

  const allTopics = useMemo(() => {
    const topics = new Set(deepWorkDefinitions.map(def => def.category));
    return Array.from(topics).sort();
  }, [deepWorkDefinitions]);

  const isNewTopic = newTopicName.trim() !== '' && !allTopics.includes(newTopicName.trim());

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setOneYearAgo(subYears(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1));
    setIsLoadingPage(false); // Data is loaded from context
  }, []);

  const handleToggleReadyForBranding = (id: string) => {
    setDeepWorkDefinitions(prev => 
      prev.map(def => 
        def.id === id 
          ? { ...def, isReadyForBranding: !def.isReadyForBranding, sharingStatus: def.isReadyForBranding ? def.sharingStatus : { twitter: false, linkedin: false, devto: false } }
          : def
      )
    );
  };


  // Check for backup prompt on Mondays
  useEffect(() => {
      if (!currentUser) return;
      const today = new Date();
      const year = getYear(today);
      const week = getISOWeek(today);
      const backupPromptKey = `backupPrompt_deepwork_${year}-${week}`;
      const hasBeenPrompted = localStorage.getItem(backupPromptKey);
      if (isMonday(today) && !hasBeenPrompted) setShowBackupPrompt(true);
  }, [currentUser]);

  const markBackupPromptAsHandled = () => {
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_deepwork_${year}-${week}`;
    localStorage.setItem(backupPromptKey, 'true');
    setShowBackupPrompt(false);
  };

  const handleBackupConfirm = () => {
    exportData(); 
    markBackupPromptAsHandled();
  };

  const currentDatedWorkout = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return allDeepWorkLogs.find(log => log.id === dateKey);
  }, [selectedDate, allDeepWorkLogs]);

  const currentWorkoutExercises = useMemo(() => {
    return currentDatedWorkout?.exercises || [];
  }, [currentDatedWorkout]);

  const filteredExerciseDefinitions = useMemo(() => {
    if (selectedCategories.length === 0) return deepWorkDefinitions;
    return deepWorkDefinitions.filter(def => selectedCategories.includes(def.category));
  }, [deepWorkDefinitions, selectedCategories]);

  const handleCategoryFilterChange = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const updateOrAddWorkoutLog = (updatedWorkout: DatedWorkout) => {
    setAllDeepWorkLogs(prevLogs => {
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
      toast({ title: "Error", description: "Topic and Focus Area cannot be empty.", variant: "destructive" });
      return;
    }
    const topic = newTopicName.trim();
    if (deepWorkDefinitions.some(def => def.name.toLowerCase() === newSubtopicName.trim().toLowerCase() && def.category.toLowerCase() === topic.toLowerCase())) {
      toast({ title: "Error", description: "This focus area already exists for this topic.", variant: "destructive" });
      return;
    }
    
    if (isNewTopic) {
        setDeepWorkTopicMetadata(prev => ({
            ...prev,
            [topic]: { classification: newTopicClassification }
        }));
    }

    const newDef: ExerciseDefinition = { 
      id: `def_${Date.now()}_${Math.random()}`, 
      name: newSubtopicName.trim(),
      category: topic as ExerciseCategory,
    };
    setDeepWorkDefinitions(prev => [...prev, newDef]);
    setNewSubtopicName('');
    setNewTopicName('');
    setNewTopicClassification('product'); // Reset to default
    toast({ title: "Success", description: `Focus Area "${newDef.name}" added to library.` });
  };

  const handleDeleteExerciseDefinition = (id: string) => {
    const defToDelete = deepWorkDefinitions.find(def => def.id === id);
    if (!defToDelete) return;
  
    const wasLastForTopic = deepWorkDefinitions.filter(d => d.category === defToDelete.category).length === 1;
  
    setDeepWorkDefinitions(prev => prev.filter(def => def.id !== id));
    
    setAllDeepWorkLogs(prevLogs => 
      prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) }))
    );
  
    const cleanPlans = (plans: Record<string, ProductizationPlan>) => {
        const newPlans = { ...plans };
        for (const topic in newPlans) {
            if (newPlans[topic].releases) {
                newPlans[topic].releases = newPlans[topic].releases?.map(release => ({
                    ...release,
                    focusAreaIds: (release.focusAreaIds || []).filter(faId => faId !== id)
                }));
            }
        }
        return newPlans;
    }
  
    if (setProductizationPlans) setProductizationPlans(cleanPlans);
    if (setOfferizationPlans) setOfferizationPlans(cleanPlans);
  
    if (wasLastForTopic) {
        const topicToRemove = defToDelete.category;
        if (setDeepWorkTopicMetadata) {
            setDeepWorkTopicMetadata(prev => {
                const newMeta = { ...prev };
                delete newMeta[topicToRemove];
                return newMeta;
            });
        }
        if (setProductizationPlans) {
            setProductizationPlans(prev => {
                const newPlans = { ...prev };
                delete newPlans[topicToRemove];
                return newPlans;
            });
        }
        if (setOfferizationPlans) {
            setOfferizationPlans(prev => {
                const newPlans = { ...prev };
                delete newPlans[topicToRemove];
                return newPlans;
            });
        }
        toast({ title: "Focus Area & Topic Removed", description: `"${defToDelete.name}" was removed, and because it was the last in its topic, "${defToDelete.category}" was removed as well.`});
    } else {
        toast({ title: "Success", description: `Focus Area "${defToDelete.name}" removed.` });
    }
  };

  const handleStartEditDefinition = (def: ExerciseDefinition) => {
    setEditingDefinition(def);
    setEditingDefinitionName(def.name);
    setEditingDefinitionCategory(def.category);
  };

  const handleSaveEditDefinition = () => {
    if (!editingDefinition || editingDefinitionName.trim() === '' || editingDefinitionCategory.trim() === '') {
      toast({ title: "Error", description: "Topic and Focus Area cannot be empty.", variant: "destructive" });
      return;
    }
    const updatedDef = { ...editingDefinition, name: editingDefinitionName.trim(), category: editingDefinitionCategory.trim() as ExerciseCategory };
    setDeepWorkDefinitions(prev => prev.map(def => def.id === editingDefinition.id ? updatedDef : def));
    setAllDeepWorkLogs(prevLogs => 
      prevLogs.map(log => ({
        ...log,
        exercises: log.exercises.map(ex => 
          ex.definitionId === editingDefinition.id ? { ...ex, name: updatedDef.name, category: updatedDef.category } : ex
        )
      }))
    );
    toast({ title: "Success", description: `Focus Area updated to "${updatedDef.name}".` });
    setEditingDefinition(null);
  };

  const handleAddTaskToSession = (definition: ExerciseDefinition) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newWorkoutExercise: WorkoutExercise = {
      id: `dwex_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      definitionId: definition.id, name: definition.name, category: definition.category,
      loggedSets: [], targetSets: parseInt(DEFAULT_TARGET_SESSIONS.toString(), 10), targetReps: DEFAULT_TARGET_DURATION,
    };
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
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
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) setAllDeepWorkLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      else updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => { // Reps will be 1, weight is duration
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const newSet: LoggedSet = { id: `${Date.now()}-${Math.random()}`, reps, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Session Logged!", description: `Logged ${weight} minutes.`});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => { // Reps=1, weight=duration
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
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
  
  const handleOpenDetailsModal = (def: ExerciseDefinition) => {
    setSelectedFocusArea(def);
    setEditableLinkedUpskillIds(def.linkedUpskillIds || []);
    setIsDetailsModalOpen(true);
    setIsDetailsEditing(false);
  };

  const handleToggleUpskillLink = (upskillId: string) => {
    setEditableLinkedUpskillIds(currentIds => {
      const newIds = new Set(currentIds);
      if (newIds.has(upskillId)) {
        newIds.delete(upskillId);
      } else {
        newIds.add(upskillId);
      }
      return Array.from(newIds);
    });
  };
  
  const handleSaveDetails = () => {
    if (!selectedFocusArea) return;
    setDeepWorkDefinitions(prevDefs => prevDefs.map(def =>
        def.id === selectedFocusArea.id
            ? { ...def, linkedUpskillIds: editableLinkedUpskillIds }
            : def
    ));
    setIsDetailsEditing(false);
    toast({ title: "Saved", description: "Focus area details have been updated." });
  };
  
  const handleOpenLinkDeepWorkModal = (def: ExerciseDefinition) => {
    setLinkingFocusArea(def);
    setEditableLinkedDeepWorkIds(def.linkedDeepWorkIds || []);
    setIsLinkDeepWorkModalOpen(true);
  };

  const handleToggleDeepWorkLink = (deepWorkId: string) => {
      setEditableLinkedDeepWorkIds(currentIds => {
          const newIds = new Set(currentIds);
          if (newIds.has(deepWorkId)) {
              newIds.delete(deepWorkId);
          } else {
              newIds.add(deepWorkId);
          }
          return Array.from(newIds);
      });
  };

  const handleSaveDeepWorkLinks = () => {
      if (!linkingFocusArea) return;
      setDeepWorkDefinitions(prevDefs => prevDefs.map(def =>
          def.id === linkingFocusArea.id
              ? { ...def, linkedDeepWorkIds: editableLinkedDeepWorkIds }
              : def
      ));
      setIsLinkDeepWorkModalOpen(false);
      toast({ title: "Saved", description: "Deep work links have been updated." });
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
    if (!allDeepWorkLogs || !oneYearAgo || !today) return [];
    const workoutDates = new Set(allDeepWorkLogs.filter(log => log.exercises.some(ex => ex.loggedSets.length > 0)).map(log => log.date));
    const data = [];
    let score = 0.5;
    for (let d = new Date(oneYearAgo); d <= today; d = addDays(d, 1)) {
        const dateKey = format(d, 'yyyy-MM-dd');
        if (workoutDates.has(dateKey)) score += (1 - score) * 0.1;
        else score *= 0.95;
        data.push({ date: format(d, 'MMM dd'), fullDate: format(d, 'PPP'), score: Math.round(score * 100) });
    }
    return data;
  }, [allDeepWorkLogs, oneYearAgo, today]);
  
  const dailyDurationData = useMemo(() => {
    const dailyData: Record<string, { totalDuration: number; topics: Set<string> }> = {};

    allDeepWorkLogs.forEach(log => {
        log.exercises.forEach(exercise => {
            // In deep work, `weight` is the duration in minutes.
            const duration = exercise.loggedSets.reduce((sum, set) => sum + set.weight, 0);
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
  }, [allDeepWorkLogs]);

  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your deep work data...</p>
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
                    <Briefcase /> Focus Area Library
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
                    <Button variant="ghost" size="icon" onClick={() => setIsLibraryExpanded(!isLibraryExpanded)} className="h-8 w-8" aria-label={isLibraryExpanded ? "Collapse library" : "Expand library"}>
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

                        <Input type="text" placeholder="New Focus Area" value={newSubtopicName} onChange={(e) => setNewSubtopicName(e.target.value)} aria-label="New focus area" className="h-10 text-sm" />

                        {isNewTopic && (
                          <div className="space-y-2 rounded-md border p-3 bg-muted/50">
                            <Label className="text-xs font-medium">Classify this new topic</Label>
                            <RadioGroup value={newTopicClassification} onValueChange={(v) => setNewTopicClassification(v as 'product' | 'service')} className="flex gap-4 pt-1">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="product" id="class-product-new" />
                                <Label htmlFor="class-product-new" className="font-normal">Product</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="service" id="class-service-new" />
                                <Label htmlFor="class-service-new" className="font-normal">Service</Label>
                              </div>
                            </RadioGroup>
                          </div>
                        )}
                        
                        <Button type="submit" size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs xl:text-sm xl:h-10 xl:px-4"> <PlusCircle className="mr-2 h-5 w-5" /> Add Focus Area </Button>
                      </form>
                      <div className="max-h-[calc(100vh-38rem)] overflow-y-auto pr-1">
                        {filteredExerciseDefinitions.length === 0 && deepWorkDefinitions.length > 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">No focus areas match filter.</p>
                        ) : filteredExerciseDefinitions.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">Library empty. Add a new topic and focus area to get started!</p>
                        ) : (
                          <ul className="space-y-2">
                            <AnimatePresence>
                              {filteredExerciseDefinitions.sort((a,b) => a.name.localeCompare(b.name)).map(def => (
                                <motion.li key={def.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="p-3 bg-card border rounded-lg shadow-sm">
                                  {editingDefinition?.id === def.id ? (
                                    <div className="space-y-2">
                                      <Input value={editingDefinitionCategory} onChange={(e) => setEditingDefinitionCategory(e.target.value)} className="h-9" aria-label="Edit topic name"/>
                                      <Input value={editingDefinitionName} onChange={(e) => setEditingDefinitionName(e.target.value)} className="h-9" aria-label="Edit focus area name"/>
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={handleSaveEditDefinition} className="flex-grow bg-green-600 hover:bg-green-500 text-white"><Save className="h-4 w-4 mr-1"/>Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingDefinition(null)} className="flex-grow"><X className="h-4 w-4 mr-1"/>Cancel</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex-grow min-w-0">
                                            <span className="font-medium text-foreground block" title={def.name}>{def.name}</span>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                              <Badge variant="secondary" className="text-xs">{def.category}</Badge>
                                              {deepWorkTopicMetadata[def.category] && (
                                                  <Badge variant="outline" className="text-xs capitalize">{deepWorkTopicMetadata[def.category].classification}</Badge>
                                              )}
                                              {def.linkedUpskillIds && def.linkedUpskillIds.length > 0 && (
                                                <Badge variant="outline" className="text-xs">
                                                  <BookCopy className="h-3 w-3 mr-1" />
                                                  {def.linkedUpskillIds.length}
                                                </Badge>
                                              )}
                                              {def.linkedDeepWorkIds && def.linkedDeepWorkIds.length > 0 && (
                                                <Badge variant="outline" className="text-xs">
                                                    <Briefcase className="h-3 w-3 mr-1" />
                                                    {def.linkedDeepWorkIds.length}
                                                </Badge>
                                              )}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 flex items-center">
                                          <Button variant="ghost" size="icon" onClick={() => handleOpenDetailsModal(def)} className="h-8 w-8 text-muted-foreground hover:text-yellow-500" aria-label={`View details for ${def.name}`}> <ClipboardList className="h-4 w-4" /> </Button>
                                          <Button variant="ghost" size="icon" onClick={() => handleViewProgress(def)} className="h-8 w-8 text-muted-foreground hover:text-blue-500" aria-label={`View progress for ${def.name}`}> <TrendingUp className="h-4 w-4" /> </Button>
                                          <Button variant="ghost" size="icon" onClick={() => handleOpenLinkDeepWorkModal(def)} className="h-8 w-8 text-muted-foreground hover:text-purple-500" aria-label={`Link other work to ${def.name}`}> <LinkIcon className="h-4 w-4" /> </Button>
                                          <Button variant="ghost" size="icon" onClick={() => handleStartEditDefinition(def)} className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label={`Edit ${def.name}`}> <Edit3 className="h-4 w-4" /> </Button>
                                          <Button variant="ghost" size="icon" onClick={() => handleDeleteExerciseDefinition(def.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${def.name}`}> <Trash2 className="h-4 w-4" /> </Button>
                                          <Button variant="ghost" size="icon" onClick={() => handleAddTaskToSession(def)} className="h-8 w-8 text-muted-foreground hover:text-accent" aria-label={`Add ${def.name} to session`}> <ChevronRight className="h-5 w-5" /> </Button>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2 pt-3 mt-3 border-t">
                                        <Checkbox
                                          id={`branding-${def.id}`}
                                          checked={!!def.isReadyForBranding}
                                          onCheckedChange={() => handleToggleReadyForBranding(def.id)}
                                        />
                                        <Label htmlFor={`branding-${def.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                          Ready for Branding
                                        </Label>
                                      </div>
                                    </>
                                  )}
                                </motion.li>
                              ))}
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
                        <LineChartIcon /> Daily Deep Work Duration
                    </CardTitle>
                    <CardDescription>
                       Total minutes of deep work logged each day.
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
                                                            <p className="font-medium text-foreground mb-1">Focus Areas:</p>
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
                        <p>Log deep work sessions on multiple days to see a chart of your daily duration.</p>
                      </div>
                    )}
                </CardContent>
            </Card>
          </section>

          <section aria-labelledby="current-learning-heading" className="md:col-span-2 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="flex-grow">
                          <CardTitle id="current-learning-heading" className="flex items-center gap-2 text-lg text-primary">
                              <ListChecks /> Deep Work Session for: {format(selectedDate, 'PPP')}
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
                            <p className="text-muted-foreground">No focus areas for {format(selectedDate, 'PPP')}.</p>
                            <p className="text-sm text-muted-foreground/80">Add focus areas from the library to get started!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <AnimatePresence>
                          {currentWorkoutExercises.map((exercise, index) => {
                              const definition = deepWorkDefinitions.find(def => def.id === exercise.definitionId);
                              return (
                                <WorkoutExerciseCard 
                                  key={`${exercise.id}-${index}`} 
                                  exercise={exercise}
                                  onLogSet={handleLogSet} 
                                  onDeleteSet={handleDeleteSet} 
                                  onUpdateSet={handleUpdateSet} 
                                  onRemoveExercise={handleRemoveExerciseFromWorkout}
                                  onViewProgress={definition ? () => handleViewProgress(definition) : undefined}
                                  pageType="deepwork"
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
                  title="Deep Work Activity"
                  description="Your deep work consistency over the last year. Click a square to view that day's log."
                  graphDescription="Your probability of doing deep work, based on recent consistency."
                  allWorkoutLogs={allDeepWorkLogs}
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
            allWorkoutLogs={allDeepWorkLogs}
            pageType="deepwork"
          />
        )}
      </div>

      <AlertDialog open={showBackupPrompt} onOpenChange={setShowBackupPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weekly Backup Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              It's Monday! Would you like to back up your deep work data? This will download a file to your computer.
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

      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex flex-row justify-between items-center">
            <DialogTitle>Details for: {selectedFocusArea?.name}</DialogTitle>
            <div className="flex-shrink-0">
              {isDetailsEditing ? (
                  <Button variant="ghost" size="icon" onClick={handleSaveDetails} aria-label="Save Changes">
                      <Save className="h-5 w-5 text-green-500" />
                  </Button>
              ) : (
                  <Button variant="ghost" size="icon" onClick={() => setIsDetailsEditing(true)} aria-label="Edit Details">
                      <Edit3 className="h-5 w-5" />
                  </Button>
              )}
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-6">
            
            {/* Linked Learning Section */}
            <div>
              <h4 className="font-semibold mb-2 text-foreground">Linked Learning</h4>
              {isDetailsEditing ? (
                <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {editableLinkedUpskillIds.map(id => {
                            const upskillDef = upskillDefinitions.find(ud => ud.id === id);
                            return upskillDef ? (
                                <Badge key={id} variant="secondary" className="text-sm">
                                    {upskillDef.name}
                                    <button onClick={() => handleToggleUpskillLink(id)} className="ml-1.5 rounded-full hover:bg-destructive/20 p-0.5">
                                        <X className="h-3 w-3"/>
                                    </button>
                                </Badge>
                            ) : null;
                        })}
                    </div>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Link a Learning Task
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-80 max-h-72 overflow-y-auto">
                            <DropdownMenuLabel>Available Learning Tasks</DropdownMenuLabel>
                            <DropdownMenuSeparator/>
                            {upskillDefinitions.filter(ud => !editableLinkedUpskillIds.includes(ud.id)).length > 0 ?
                              upskillDefinitions.filter(ud => !editableLinkedUpskillIds.includes(ud.id)).map(ud => (
                                <DropdownMenuCheckboxItem
                                    key={ud.id}
                                    checked={false}
                                    onCheckedChange={() => handleToggleUpskillLink(ud.id)}
                                >
                                    {ud.name} ({ud.category})
                                </DropdownMenuCheckboxItem>
                              )) : (
                                <p className="px-2 py-1.5 text-sm text-muted-foreground">No other tasks to link.</p>
                              )
                            }
                        </DropdownMenuContent>
                     </DropdownMenu>
                </div>
              ) : (
                 editableLinkedUpskillIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {editableLinkedUpskillIds.map(id => {
                            const upskillDef = upskillDefinitions.find(ud => ud.id === id);
                            return upskillDef ? (
                                <Badge key={id} variant="secondary" className="text-sm">{upskillDef.name} ({upskillDef.category})</Badge>
                            ) : null;
                        })}
                    </div>
                 ) : (
                    <p className="text-sm text-muted-foreground">No learning tasks linked. Click edit to add some.</p>
                 )
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isLinkDeepWorkModalOpen} onOpenChange={setIsLinkDeepWorkModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Link work to: {linkingFocusArea?.name}</DialogTitle>
            <DialogDescription>
              Select other focus areas to link as related or foundational work.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-72 w-full">
              <div className="pr-6 space-y-2">
                {deepWorkDefinitions
                  .filter(def => def.id !== linkingFocusArea?.id)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(def => (
                    <div key={def.id} className="flex items-center space-x-3 p-2 rounded-md border has-[[data-state=checked]]:bg-muted/50 transition-colors">
                        <Checkbox
                            id={`deepwork-link-${def.id}`}
                            checked={editableLinkedDeepWorkIds.includes(def.id)}
                            onCheckedChange={() => handleToggleDeepWorkLink(def.id)}
                        />
                        <Label htmlFor={`deepwork-link-${def.id}`} className="font-normal w-full cursor-pointer">
                            {def.name}
                            <span className="text-muted-foreground ml-2 text-xs">({def.category})</span>
                        </Label>
                    </div>
                ))}
              </div>
            </ScrollArea>
          </div>
           <DialogFooter>
              <Button variant="outline" onClick={() => setIsLinkDeepWorkModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveDeepWorkLinks}>Save Links</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function DeepWorkPage() {
  return ( <AuthGuard> <DeepWorkPageContent /> </AuthGuard> );
}
