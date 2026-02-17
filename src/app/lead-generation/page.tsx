
"use client";

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, ChevronRight, CalendarIcon, GripVertical, TrendingUp, Filter as FilterIcon, Loader2, Info, ChevronDown, ChevronUp, Briefcase } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, parse, getISOWeek, isMonday, getYear } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, DatedWorkout, ExerciseCategory } from '@/types/workout';
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
import { safeSetLocalStorageItem } from '@/lib/safeStorage';

function LeadGenerationPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    exportData,
    leadGenDefinitions, setLeadGenDefinitions,
    allLeadGenLogs, setAllLeadGenLogs,
  } = useAuth();

  const [newActionName, setNewActionName] = useState('');
  const [newActionDescription, setNewActionDescription] = useState('');
  
  const [editingDefinition, setEditingDefinition] = useState<ExerciseDefinition | null>(null);
  const [editingDefinitionName, setEditingDefinitionName] = useState('');
  const [editingDefinitionDescription, setEditingDefinitionDescription] = useState('');

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);

  useEffect(() => {
    setIsLoadingPage(false); // Data is loaded from context
  }, []);

  // Check for backup prompt on Mondays
  useEffect(() => {
      if (!currentUser) return;
      const today = new Date();
      const year = getYear(today);
      const week = getISOWeek(today);
      const backupPromptKey = `backupPrompt_leadgen_${year}-${week}`;
      const hasBeenPrompted = localStorage.getItem(backupPromptKey);
      if (isMonday(today) && !hasBeenPrompted) setShowBackupPrompt(true);
  }, [currentUser]);

  const markBackupPromptAsHandled = () => {
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_leadgen_${year}-${week}`;
    safeSetLocalStorageItem(backupPromptKey, 'true');
    setShowBackupPrompt(false);
  };

  const handleBackupConfirm = () => {
    exportData(); 
    markBackupPromptAsHandled();
  };

  const currentDatedLog = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return allLeadGenLogs.find(log => log.id === dateKey);
  }, [selectedDate, allLeadGenLogs]);

  const currentSessionTasks = useMemo(() => {
    return currentDatedLog?.exercises || [];
  }, [currentDatedLog]);

  const updateOrAddLog = (updatedLog: DatedWorkout) => {
    setAllLeadGenLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.id === updatedLog.id);
      if (existingLogIndex > -1) {
        const newLogs = [...prevLogs];
        newLogs[existingLogIndex] = updatedLog;
        return newLogs;
      }
      return [...prevLogs, updatedLog];
    });
  };

  const handleAddActionDefinition = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newActionName.trim() === '') {
      toast({ title: "Error", description: "Action name cannot be empty.", variant: "destructive" });
      return;
    }
    if (leadGenDefinitions.some(def => def.name.toLowerCase() === newActionName.trim().toLowerCase())) {
      toast({ title: "Error", description: "This action already exists in the library.", variant: "destructive" });
      return;
    }
    const newDef: ExerciseDefinition = { 
      id: `lg_${Date.now()}_${Math.random()}`, 
      name: newActionName.trim(),
      category: "Lead Generation",
      description: newActionDescription.trim(),
    };
    setLeadGenDefinitions(prev => [...prev, newDef]);
    setNewActionName('');
    setNewActionDescription('');
    toast({ title: "Success", description: `Action "${newDef.name}" added to library.` });
  };

  const handleDeleteActionDefinition = (id: string) => {
    const defToDelete = leadGenDefinitions.find(def => def.id === id);

    setLeadGenDefinitions(prev => prev.filter(def => def.id !== id));
    setAllLeadGenLogs(prevLogs => 
      prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) }))
    );
    toast({ title: "Success", description: `Action "${defToDelete?.name}" removed.` });
  };

  const handleStartEditDefinition = (def: ExerciseDefinition) => {
    setEditingDefinition(def);
    setEditingDefinitionName(def.name);
    setEditingDefinitionDescription(def.description || '');
  };

  const handleSaveEditDefinition = () => {
    if (!editingDefinition || editingDefinitionName.trim() === '') {
      toast({ title: "Error", description: "Action name cannot be empty.", variant: "destructive" });
      return;
    }
    const updatedDef = { 
        ...editingDefinition, 
        name: editingDefinitionName.trim(),
        description: editingDefinitionDescription.trim(),
    };
    setLeadGenDefinitions(prev => prev.map(def => def.id === editingDefinition.id ? updatedDef : def));
    setAllLeadGenLogs(prevLogs => 
      prevLogs.map(log => ({
        ...log,
        exercises: log.exercises.map(ex => 
          ex.definitionId === editingDefinition.id 
            ? { ...ex, name: updatedDef.name, description: updatedDef.description } 
            : ex
        )
      }))
    );
    toast({ title: "Success", description: `Action updated to "${updatedDef.name}".` });
    setEditingDefinition(null);
  };

  const handleAddTaskToSession = (definition: ExerciseDefinition) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    
    const name = definition.name;
    const match = name.match(/(\d+)/); // Find the first number in the name
    const targetSets = match ? parseInt(match[0], 10) : 1;

    const newWorkoutExercise: WorkoutExercise = {
      id: `${definition.id}-${Date.now()}-${Math.random()}`,
      definitionId: definition.id, name: definition.name, category: definition.category,
      description: definition.description,
      loggedSets: [], 
      targetSets: targetSets, 
      targetReps: `${targetSets} actions`,
    };

    const existingLog = allLeadGenLogs.find(log => log.id === dateKey);
    if (existingLog) {
      if (existingLog.exercises.some(ex => ex.definitionId === definition.id)) {
        toast({ title: "Info", description: `"${definition.name}" is already in this session.` }); return;
      }
      updateOrAddLog({ ...existingLog, exercises: [...existingLog.exercises, newWorkoutExercise] });
    } else {
      updateOrAddLog({ id: dateKey, date: dateKey, exercises: [newWorkoutExercise] });
    }
    toast({ title: "Added to Session", description: `"${definition.name}" added for ${format(selectedDate, 'PPP')}.` });
  };

  const handleRemoveExerciseFromSession = (exerciseId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingLog = allLeadGenLogs.find(log => log.id === dateKey);
    if (existingLog) {
      const updatedExercises = existingLog.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) setAllLeadGenLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      else updateOrAddLog({ ...existingLog, exercises: updatedExercises });
    }
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingLog = allLeadGenLogs.find(log => log.id === dateKey);
    if (existingLog) {
      const newSet = { id: `${Date.now()}-${Math.random()}`, reps, weight, timestamp: Date.now() };
      const updatedExercises = existingLog.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      updateOrAddLog({ ...existingLog, exercises: updatedExercises });
      toast({ title: "Action Logged!", description: `One action logged.`});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingLog = allLeadGenLogs.find(log => log.id === dateKey);
    if (existingLog) {
      const updatedExercises = existingLog.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
      );
      updateOrAddLog({ ...existingLog, exercises: updatedExercises });
    }
  };

  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading Lead Generation module...</p>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-primary">
                Lead Generation Engine
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
                Turn visibility into conversations. Track your daily outreach and engagement.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <section aria-labelledby="task-library-heading" className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle id="task-library-heading" className="flex items-center gap-2 text-lg text-primary">
                    <Briefcase /> Action Library
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setIsLibraryExpanded(!isLibraryExpanded)} className="h-8 w-8" aria-label={isLibraryExpanded ? "Collapse library" : "Expand library"}>
                      {isLibraryExpanded ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-primary" />}
                  </Button>
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
                      <form onSubmit={handleAddActionDefinition} className="space-y-3">
                        <Input type="text" placeholder="New Action (e.g., Post 1 time)" value={newActionName} onChange={(e) => setNewActionName(e.target.value)} aria-label="New action name" className="h-10 text-sm" />
                        <Input type="text" placeholder="Description (optional)" value={newActionDescription} onChange={(e) => setNewActionDescription(e.target.value)} aria-label="New action description" className="h-10 text-sm" />
                        
                        <Button type="submit" size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs xl:text-sm xl:h-10 xl:px-4"> <PlusCircle className="mr-2 h-5 w-5" /> Add Action </Button>
                      </form>
                      <div className="max-h-[calc(100vh-38rem)] overflow-y-auto pr-1">
                        {leadGenDefinitions.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">Library empty. Add a new action to get started!</p>
                        ) : (
                          <ul className="space-y-2">
                            <AnimatePresence>
                              {leadGenDefinitions.map(def => (
                                <motion.li key={def.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="p-3 bg-card border rounded-lg shadow-sm">
                                  {editingDefinition?.id === def.id ? (
                                    <div className="space-y-2">
                                      <Input value={editingDefinitionName} onChange={(e) => setEditingDefinitionName(e.target.value)} className="h-9" aria-label="Edit action name"/>
                                      <Input value={editingDefinitionDescription} onChange={(e) => setEditingDefinitionDescription(e.target.value)} placeholder="Description (optional)" className="h-9" aria-label="Edit action description"/>
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={handleSaveEditDefinition} className="flex-grow bg-green-600 hover:bg-green-500 text-white"><Save className="h-4 w-4 mr-1"/>Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingDefinition(null)} className="flex-grow"><X className="h-4 w-4 mr-1"/>Cancel</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-grow min-w-0">
                                          <span className="font-medium text-foreground block" title={def.name}>{def.name}</span>
                                          {def.description && <p className="text-xs text-muted-foreground mt-1">{def.description}</p>}
                                      </div>
                                      <div className="flex-shrink-0 flex items-center">
                                        <Button variant="ghost" size="icon" onClick={() => handleStartEditDefinition(def)} className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label={`Edit ${def.name}`}> <Edit3 className="h-4 w-4" /> </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteActionDefinition(def.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${def.name}`}> <Trash2 className="h-4 w-4" /> </Button>
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
                    </motion.div>
                  )}
                </AnimatePresence>
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
                            <p className="text-muted-foreground">No actions for {format(selectedDate, 'PPP')}.</p>
                            <p className="text-sm text-muted-foreground/80">Add actions from the library to get started!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <AnimatePresence>
                          {currentSessionTasks.map(exercise => (
                                <WorkoutExerciseCard 
                                  key={exercise.id} 
                                  exercise={exercise}
                                  onLogSet={handleLogSet} 
                                  onDeleteSet={handleDeleteSet} 
                                  onUpdateSet={() => {}} // No editing for this simple log
                                  onRemoveExercise={handleRemoveExerciseFromSession}
                                  pageType="lead-generation"
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

      <AlertDialog open={showBackupPrompt} onOpenChange={setShowBackupPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weekly Backup Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              It's Monday! Would you like to back up your Lead Generation data? This will download a file to your computer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={markBackupPromptAsHandled}>Maybe Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackupConfirm}>Yes, Back Up Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function LeadGenerationPage() {
  return ( <AuthGuard> <LeadGenerationPageContent /> </AuthGuard> );
}
