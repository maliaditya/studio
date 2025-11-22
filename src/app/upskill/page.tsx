

"use client";

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, BookOpenCheck, ListChecks, Edit3, Save, X, ChevronRight, CalendarIcon, GripVertical, TrendingUp, Filter as FilterIcon, Loader2, Info } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, getISOWeek, isMonday, getYear, parseISO, addDays, differenceInDays } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, TopicGoal } from '@/types/workout';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

function UpskillPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    exportData,
    allUpskillLogs, setAllUpskillLogs,
    upskillDefinitions, setUpskillDefinitions,
    topicGoals, setTopicGoals,
  } = useAuth();

  const [newSubtopicName, setNewSubtopicName] = useState('');
  const [newSubtopicDescription, setNewSubtopicDescription] = useState('');
  const [newSubtopicCategory, setNewSubtopicCategory] = useState<ExerciseCategory | "">("");

  const [editingSubtopic, setEditingSubtopic] = useState<ExerciseDefinition | null>(null);
  const [editingSubtopicName, setEditingSubtopicName] = useState('');
  const [editingSubtopicDescription, setEditingSubtopicDescription] = useState('');
  const [editingSubtopicCategory, setEditingSubtopicCategory] = useState<ExerciseCategory | "">("");

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [viewingProgressSubtopic, setViewingProgressSubtopic] = useState<ExerciseDefinition | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<ExerciseCategory[]>([]);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  
  const [isBackupPromptOpen, setIsBackupPromptOpen] = useState(false);
  
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalTopic, setGoalTopic] = useState<string>('');
  const [goalType, setGoalType] = useState<'pages' | 'hours'>('pages');
  const [goalValue, setGoalValue] = useState<string>('');

  useEffect(() => {
    setIsLoadingPage(false);
  }, []);

  // Check for backup prompt on Mondays
  useEffect(() => {
      if (!currentUser) return;
      const today = new Date();
      const year = getYear(today);
      const week = getISOWeek(today);
      const backupPromptKey = `backupPrompt_upskill_${year}-${week}`;
      const hasBeenPrompted = localStorage.getItem(backupPromptKey);
      if (isMonday(today) && !hasBeenPrompted) setIsBackupPromptOpen(true);
  }, [currentUser]);

  const markBackupPromptAsHandled = () => {
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_upskill_${year}-${week}`;
    localStorage.setItem(backupPromptKey, 'true');
    setIsBackupPromptOpen(false);
  };

  const handleBackupConfirm = () => {
    exportData(); 
    markBackupPromptAsHandled();
  };

  const currentDatedLog = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return allUpskillLogs.find(log => log.id === dateKey);
  }, [selectedDate, allUpskillLogs]);

  const currentSessionTasks = useMemo(() => {
    return currentDatedLog?.exercises || [];
  }, [currentDatedLog]);

  const topicNames = useMemo(() => {
    return Array.from(new Set(upskillDefinitions.map(def => def.category)));
  }, [upskillDefinitions]);

  const filteredSubtopics = useMemo(() => {
    if (selectedCategories.length === 0) {
      return upskillDefinitions;
    }
    return upskillDefinitions.filter(def => selectedCategories.includes(def.category));
  }, [upskillDefinitions, selectedCategories]);

  const handleCategoryFilterChange = (category: ExerciseCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const handleAddSubtopicDefinition = (e: FormEvent) => {
    e.preventDefault();
    if (!newSubtopicName.trim() || !newSubtopicCategory) {
      toast({ title: "Error", description: "Name and topic are required.", variant: "destructive" });
      return;
    }
    const newDef: ExerciseDefinition = { 
      id: `us_def_${Date.now()}`, 
      name: newSubtopicName.trim(),
      category: newSubtopicCategory || "Other",
      description: newSubtopicDescription.trim(),
    };
    setUpskillDefinitions(prev => [...prev, newDef]);
    setNewSubtopicName('');
    setNewSubtopicDescription('');
    setNewSubtopicCategory("");
    toast({ title: "Success", description: `Subtopic "${newDef.name}" added.` });
  };

  const handleDeleteSubtopic = (id: string) => {
    const defToDelete = upskillDefinitions.find(def => def.id === id);
    setUpskillDefinitions(prev => prev.filter(def => def.id !== id));
    setAllUpskillLogs(prevLogs => 
      prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) }))
    );
    toast({ title: "Success", description: `Subtopic "${defToDelete?.name}" removed.` });
  };
  
  const handleStartEditSubtopic = (def: ExerciseDefinition) => {
    setEditingSubtopic(def);
    setEditingSubtopicName(def.name);
    setEditingSubtopicDescription(def.description || '');
    setEditingSubtopicCategory(def.category);
  };

  const handleSaveEditSubtopic = () => {
    if (!editingSubtopic || !editingSubtopicName.trim() || !editingSubtopicCategory) {
      toast({ title: "Error", description: "Name and topic are required.", variant: "destructive" });
      return;
    }
    const updatedDef = { 
        ...editingSubtopic, 
        name: editingSubtopicName.trim(),
        category: editingSubtopicCategory,
        description: editingSubtopicDescription.trim(),
    };
    setUpskillDefinitions(prev => prev.map(def => def.id === editingSubtopic.id ? updatedDef : def));
    setAllUpskillLogs(prevLogs => prevLogs.map(log => ({...log, exercises: log.exercises.map(ex => 
          ex.definitionId === editingSubtopic.id 
            ? { ...ex, name: updatedDef.name, category: updatedDef.category, description: updatedDef.description } 
            : ex
        )})));
    toast({ title: "Success", description: `Subtopic updated to "${updatedDef.name}".` });
    setEditingSubtopic(null);
  };

  const handleAddTaskToSession = (definition: ExerciseDefinition) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newSessionTask: WorkoutExercise = {
      id: `${definition.id}-${Date.now()}`,
      definitionId: definition.id, name: definition.name, category: definition.category,
      description: definition.description,
      loggedSets: [], targetSets: 1, targetReps: "1 session",
    };

    const existingLog = allUpskillLogs.find(log => log.id === dateKey);
    if (existingLog) {
      if (existingLog.exercises.some(ex => ex.definitionId === definition.id)) {
        toast({ title: "Info", description: `"${definition.name}" is already in this session.` }); return;
      }
      setAllUpskillLogs(prev => prev.map(log => log.id === dateKey ? {...log, exercises: [...log.exercises, newSessionTask]} : log));
    } else {
      setAllUpskillLogs(prev => [...prev, { id: dateKey, date: dateKey, exercises: [newSessionTask] }]);
    }
    toast({ title: "Added to Session", description: `"${definition.name}" added for ${format(selectedDate, 'PPP')}.` });
  };

  const handleRemoveExerciseFromSession = (exerciseId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingLog = allUpskillLogs.find(log => log.id === dateKey);
    if (existingLog) {
      const updatedExercises = existingLog.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) setAllUpskillLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      else setAllUpskillLogs(prevLogs => prevLogs.map(log => log.id === dateKey ? { ...log, exercises: updatedExercises } : log));
    }
  };
  
  const handleLogSet = (exerciseId: string, duration: number, progress: number) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingLog = allUpskillLogs.find(log => log.id === dateKey);
    if (existingLog) {
      const newSet: LoggedSet = { id: `${Date.now()}-${Math.random()}`, reps: duration, weight: progress, timestamp: Date.now() };
      const updatedExercises = existingLog.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      setAllUpskillLogs(prevLogs => prevLogs.map(log => log.id === dateKey ? {...log, exercises: updatedExercises} : log));
      toast({ title: "Progress Logged!", description: `Your learning session has been saved.`});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    setAllUpskillLogs(prevLogs => prevLogs.map(log => {
      if (log.id === dateKey) {
        return {...log, exercises: log.exercises.map(ex => ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex)};
      }
      return log;
    }));
  };
  
  const handleUpdateSet = (exerciseId: string, setId: string, duration: number, progress: number) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    setAllUpskillLogs(prevLogs => prevLogs.map(log => {
      if (log.id === dateKey) {
        return {...log, exercises: log.exercises.map(ex => ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.map(set => set.id === setId ? { ...set, reps: duration, weight: progress, timestamp: Date.now() } : set )} : ex )};
      }
      return log;
    }));
  };
  
  const handleViewProgress = (definition: ExerciseDefinition) => {
    setViewingProgressSubtopic(definition);
    setIsProgressModalOpen(true);
  };
  
  const handleSetGoal = () => {
    if (!goalTopic || !goalValue) {
        toast({ title: "Error", description: "Please fill out all goal fields.", variant: "destructive" });
        return;
    }
    const newGoal: TopicGoal = {
        goalType: goalType,
        goalValue: parseInt(goalValue, 10),
    };
    setTopicGoals(prev => ({...prev, [goalTopic]: newGoal}));
    toast({ title: "Goal Set!", description: `Goal for ${goalTopic} has been updated.`});
    setIsGoalModalOpen(false);
    setGoalTopic(''); setGoalType('pages'); setGoalValue('');
  };

  const handleOpenGoalModal = (topic: string) => {
    setGoalTopic(topic);
    const existingGoal = topicGoals[topic];
    if (existingGoal) {
      setGoalType(existingGoal.goalType);
      setGoalValue(String(existingGoal.goalValue));
    } else {
      setGoalType('pages');
      setGoalValue('');
    }
    setIsGoalModalOpen(true);
  }

  if (isLoadingPage) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin" /></div>;
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-primary">
                Upskill Dashboard
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
                Manage your learning resources, track session durations, and monitor progress towards your goals.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <section aria-labelledby="subtopic-library-heading" className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle id="subtopic-library-heading" className="flex items-center gap-2 text-lg text-primary">
                    <BookOpenCheck /> Learning Library
                  </CardTitle>
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
                        {topicNames.map((category) => (
                          <DropdownMenuCheckboxItem
                            key={category} checked={selectedCategories.includes(category as ExerciseCategory)}
                            onCheckedChange={() => handleCategoryFilterChange(category as ExerciseCategory)}
                            onSelect={(e) => e.preventDefault()} 
                          > {category} </DropdownMenuCheckboxItem>
                        ))}
                        {selectedCategories.length > 0 && (
                          <> <DropdownMenuSeparator />
                            <Button variant="ghost" size="sm" className="w-full justify-start text-sm" onClick={() => setSelectedCategories([])}> Clear Filters </Button>
                          </>)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                  <form onSubmit={handleAddSubtopicDefinition} className="space-y-3">
                    <Input type="text" placeholder="New subtopic name" value={newSubtopicName} onChange={(e) => setNewSubtopicName(e.target.value)} aria-label="New subtopic name" className="h-10 text-sm" />
                    <Input type="text" placeholder="Description (optional)" value={newSubtopicDescription} onChange={(e) => setNewSubtopicDescription(e.target.value)} aria-label="New subtopic description" className="h-10 text-sm" />
                    <Input type="text" list="topic-list" placeholder="Topic (e.g., GPU Programming)" value={newSubtopicCategory} onChange={(e) => setNewSubtopicCategory(e.target.value as ExerciseCategory)} aria-label="New subtopic category" className="h-10 text-sm" />
                    <datalist id="topic-list">
                      {topicNames.map(name => <option key={name} value={name} />)}
                    </datalist>
                    <Button type="submit" size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs xl:text-sm xl:h-10 xl:px-4"> <PlusCircle className="mr-2 h-5 w-5" /> Add to Library </Button>
                  </form>
                  <div className="max-h-[calc(100vh-38rem)] overflow-y-auto pr-1">
                    {filteredSubtopics.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">Library empty or no items match filter.</p>
                    ) : (
                      <ul className="space-y-2">
                        <AnimatePresence>
                          {filteredSubtopics.map(def => (
                            <motion.li key={def.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="p-3 bg-card border rounded-lg shadow-sm">
                              {editingSubtopic?.id === def.id ? (
                                <div className="space-y-2">
                                  <Input value={editingSubtopicName} onChange={(e) => setEditingSubtopicName(e.target.value)} className="h-9" aria-label="Edit name"/>
                                  <Input value={editingSubtopicDescription} onChange={(e) => setEditingSubtopicDescription(e.target.value)} className="h-9" aria-label="Edit description"/>
                                  <Input list="topic-list" value={editingSubtopicCategory} onChange={(e) => setEditingSubtopicCategory(e.target.value as ExerciseCategory)} className="h-9" aria-label="Edit topic"/>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={handleSaveEditSubtopic} className="flex-grow bg-green-600 hover:bg-green-500 text-white"><Save className="h-4 w-4 mr-1"/>Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingSubtopic(null)} className="flex-grow"><X className="h-4 w-4 mr-1"/>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-grow min-w-0">
                                      <span className="font-medium text-foreground block" title={def.name}>{def.name}</span>
                                      {def.description && <p className="text-xs text-muted-foreground mt-1 truncate">{def.description}</p>}
                                      <Badge variant="secondary" className="text-xs mt-1 cursor-pointer" onClick={() => handleOpenGoalModal(def.category)}>{def.category}</Badge>
                                  </div>
                                  <div className="flex-shrink-0 flex items-center">
                                    <Button variant="ghost" size="icon" onClick={() => handleViewProgress(def)} className="h-8 w-8 text-muted-foreground hover:text-blue-500" aria-label={`View progress for ${def.name}`}> <TrendingUp className="h-4 w-4" /> </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleStartEditSubtopic(def)} className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label={`Edit ${def.name}`}> <Edit3 className="h-4 w-4" /> </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSubtopic(def.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${def.name}`}> <Trash2 className="h-4 w-4" /> </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleAddTaskToSession(def)} className="h-8 w-8 text-muted-foreground hover:text-accent" aria-label={`Add ${def.name} to session`}> <ChevronRight className="h-5 w-5" /> </Button>
                                  </div>
                                </div>
                              )}
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    )}
                  </div>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="current-session-heading" className="md:col-span-2 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="flex-grow">
                          <CardTitle id="current-session-heading" className="flex items-center gap-2 text-lg text-primary">
                              <ListChecks /> Session for: {format(selectedDate, 'PPP')}
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
                      {currentSessionTasks.length === 0 ? (
                        <div className="text-center py-10">
                            <GripVertical className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">No tasks for {format(selectedDate, 'PPP')}.</p>
                            <p className="text-sm text-muted-foreground/80">Add subtopics from the library to get started!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <AnimatePresence>
                          {currentSessionTasks.map(exercise => (
                                <WorkoutExerciseCard 
                                  key={exercise.id} exercise={exercise} definitionGoal={topicGoals[exercise.category]}
                                  onLogSet={handleLogSet} onDeleteSet={handleDeleteSet} onUpdateSet={handleUpdateSet} 
                                  onRemoveExercise={handleRemoveExerciseFromSession} onViewProgress={() => {const def = upskillDefinitions.find(d => d.id === exercise.definitionId); if(def) handleViewProgress(def);}}
                                  pageType="upskill"
                                />
                              )
                          )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </CardContent>
              </Card>
          </section>
        </div>
      </div>
      <AlertDialog open={isBackupPromptOpen} onOpenChange={setIsBackupPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weekly Backup Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              It's Monday! Would you like to back up your upskill data? This will download a file to your computer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={markBackupPromptAsHandled}>Maybe Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackupConfirm}>Yes, Back Up Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {viewingProgressSubtopic && (
          <ExerciseProgressModal isOpen={isProgressModalOpen} onOpenChange={setIsProgressModalOpen}
            exercise={viewingProgressSubtopic} allWorkoutLogs={allUpskillLogs} topicGoals={topicGoals} pageType="upskill"
          />
      )}

      {isGoalModalOpen && (
         <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Goal for: {goalTopic}</DialogTitle>
              <DialogDescription>
                Define a measurable goal for this learning topic.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-4">
                  <Label htmlFor="goal-type">Goal Type:</Label>
                  <select id="goal-type" value={goalType} onChange={(e) => setGoalType(e.target.value as 'pages' | 'hours')} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="pages">Pages</option>
                      <option value="hours">Hours</option>
                  </select>
              </div>
               <div className="flex items-center space-x-4">
                  <Label htmlFor="goal-value">Target Value:</Label>
                  <Input id="goal-value" type="number" value={goalValue} onChange={(e) => setGoalValue(e.target.value)} />
              </div>
            </div>
             <DialogFooter>
               <Button variant="outline" onClick={() => setIsGoalModalOpen(false)}>Cancel</Button>
               <Button onClick={handleSetGoal}>Set Goal</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default function UpskillPage() {
  return ( <AuthGuard> <UpskillPageContent /> </AuthGuard> );
}

