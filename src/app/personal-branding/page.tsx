"use client";

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, ChevronRight, CalendarIcon, GripVertical, TrendingUp, Filter as FilterIcon, Loader2, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, parse, getISOWeek, isMonday, getYear, subYears, addDays } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, SharingStatus } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
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

function PersonalBrandingPageContent() {
  const { toast } = useToast();
  const { currentUser, exportData } = useAuth();
  
  const [contentDefinitions, setContentDefinitions] = useState<ExerciseDefinition[]>([]);
  const [newContentTitle, setNewContentTitle] = useState('');
  const [newContentTopic, setNewContentTopic] = useState('');

  const [editingDefinition, setEditingDefinition] = useState<ExerciseDefinition | null>(null);
  const [editingDefinitionName, setEditingDefinitionName] = useState('');
  const [editingDefinitionCategory, setEditingDefinitionCategory] = useState<string>('');

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allBrandingLogs, setAllBrandingLogs] = useState<DatedWorkout[]>([]);
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);

  const allTopics = useMemo(() => {
    const topics = new Set(contentDefinitions.map(def => def.category));
    return Array.from(topics).sort();
  }, [contentDefinitions]);

  useEffect(() => {
    if (currentUser?.username) {
      const username = currentUser.username;
      const defsKey = `branding_definitions_${username}`;
      const logsKey = `branding_logs_${username}`;

      try { const storedDefs = localStorage.getItem(defsKey); setContentDefinitions(storedDefs ? JSON.parse(storedDefs) : []); } catch (e) { setContentDefinitions([]); }
      try { const storedLogs = localStorage.getItem(logsKey); setAllBrandingLogs(storedLogs ? JSON.parse(storedLogs) : []); } catch (e) { setAllBrandingLogs([]); }
    } else {
      setContentDefinitions([]);
      setAllBrandingLogs([]);
    }
    const timer = setTimeout(() => setIsLoadingPage(false), 300);
    return () => clearTimeout(timer);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.username && !isLoadingPage) {
      const username = currentUser.username;
      const defsKey = `branding_definitions_${username}`;
      const logsKey = `branding_logs_${username}`;
      localStorage.setItem(defsKey, JSON.stringify(contentDefinitions));
      localStorage.setItem(logsKey, JSON.stringify(allBrandingLogs));
    }
  }, [contentDefinitions, allBrandingLogs, currentUser, isLoadingPage]);

  useEffect(() => {
      if (!currentUser) return;
      const today = new Date();
      const year = getYear(today);
      const week = getISOWeek(today);
      const backupPromptKey = `backupPrompt_branding_${year}-${week}`;
      const hasBeenPrompted = localStorage.getItem(backupPromptKey);
      if (isMonday(today) && !hasBeenPrompted) setShowBackupPrompt(true);
  }, [currentUser]);

  const markBackupPromptAsHandled = () => {
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_branding_${year}-${week}`;
    localStorage.setItem(backupPromptKey, 'true');
    setShowBackupPrompt(false);
  };

  const handleBackupConfirm = () => {
    exportData(); // This should be adapted if branding data needs separate export
    markBackupPromptAsHandled();
  };
  
  const currentDatedLog = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return allBrandingLogs.find(log => log.id === dateKey);
  }, [selectedDate, allBrandingLogs]);

  const currentSessionTasks = useMemo(() => {
    return currentDatedLog?.exercises || [];
  }, [currentDatedLog]);

  const filteredContentDefinitions = useMemo(() => {
    if (selectedCategories.length === 0) return contentDefinitions;
    return contentDefinitions.filter(def => selectedCategories.includes(def.category));
  }, [contentDefinitions, selectedCategories]);

  const handleCategoryFilterChange = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const updateOrAddLog = (updatedLog: DatedWorkout) => {
    setAllBrandingLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.id === updatedLog.id);
      if (existingLogIndex > -1) {
        const newLogs = [...prevLogs];
        newLogs[existingLogIndex] = updatedLog;
        return newLogs;
      }
      return [...prevLogs, updatedLog];
    });
  };

  const handleAddContentDefinition = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newContentTitle.trim() === '' || newContentTopic.trim() === '') {
      toast({ title: "Error", description: "Topic and Content Idea cannot be empty.", variant: "destructive" });
      return;
    }
    const newDef: ExerciseDefinition = { 
      id: `branding_${Date.now().toString()}`, 
      name: newContentTitle.trim(),
      category: newContentTopic.trim() as ExerciseCategory,
      sharingStatus: { twitter: false, linkedin: false, devto: false }
    };
    setContentDefinitions(prev => [...prev, newDef]);
    setNewContentTitle('');
    setNewContentTopic('');
    toast({ title: "Success", description: `Content Idea "${newDef.name}" added.` });
  };

  const handleDeleteContentDefinition = (id: string) => {
    const defToDelete = contentDefinitions.find(def => def.id === id);
    setContentDefinitions(prev => prev.filter(def => def.id !== id));
    setAllBrandingLogs(prevLogs => 
      prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) }))
    );
    toast({ title: "Success", description: `Content Idea "${defToDelete?.name}" removed.` });
  };

  const handleStartEditDefinition = (def: ExerciseDefinition) => {
    setEditingDefinition(def);
    setEditingDefinitionName(def.name);
    setEditingDefinitionCategory(def.category);
  };

  const handleSaveEditDefinition = () => {
    if (!editingDefinition || editingDefinitionName.trim() === '' || editingDefinitionCategory.trim() === '') return;
    
    const updatedDef = { ...editingDefinition, name: editingDefinitionName.trim(), category: editingDefinitionCategory.trim() as ExerciseCategory };
    setContentDefinitions(prev => prev.map(def => def.id === editingDefinition.id ? updatedDef : def));
    
    setAllBrandingLogs(prevLogs => 
      prevLogs.map(log => ({
        ...log,
        exercises: log.exercises.map(ex => 
          ex.definitionId === editingDefinition.id ? { ...ex, name: updatedDef.name, category: updatedDef.category } : ex
        )
      }))
    );
    toast({ title: "Success", description: "Content Idea updated." });
    setEditingDefinition(null);
  };

  const handleAddTaskToSession = (definition: ExerciseDefinition) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newSessionTask: WorkoutExercise = {
      id: `${definition.id}-${Date.now()}`, definitionId: definition.id, name: definition.name, category: definition.category,
      loggedSets: [], targetSets: 4, targetReps: "4 stages",
    };
    const existingLog = allBrandingLogs.find(log => log.id === dateKey);
    if (existingLog) {
      if (existingLog.exercises.some(ex => ex.definitionId === definition.id)) {
        toast({ title: "Info", description: "This idea is already in today's session." }); return;
      }
      updateOrAddLog({ ...existingLog, exercises: [...existingLog.exercises, newSessionTask] });
    } else {
      updateOrAddLog({ id: dateKey, date: dateKey, exercises: [newSessionTask] });
    }
    toast({ title: "Added to Session", description: `"${definition.name}" added for ${format(selectedDate, 'PPP')}.` });
  };

  const handleRemoveTaskFromSession = (exerciseId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingLog = allBrandingLogs.find(log => log.id === dateKey);
    if (existingLog) {
      const updatedExercises = existingLog.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) setAllBrandingLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      else updateOrAddLog({ ...existingLog, exercises: updatedExercises });
    }
  };

  const handleLogStage = (exerciseId: string, stageIndex: number) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingLog = allBrandingLogs.find(log => log.id === dateKey);
    if (existingLog) {
      const newSet: LoggedSet = { id: Date.now().toString(), reps: stageIndex, weight: 1, timestamp: Date.now() };
      const updatedExercises = existingLog.exercises.map(ex => {
        if (ex.id === exerciseId) {
          // Prevent logging the same stage twice
          if (ex.loggedSets.some(s => s.reps === stageIndex)) return ex;
          return { ...ex, loggedSets: [...ex.loggedSets, newSet] };
        }
        return ex;
      });
      updateOrAddLog({ ...existingLog, exercises: updatedExercises });
      toast({ title: "Stage Logged!" });
    }
  };

  const handleUpdateSharingStatus = (definitionId: string, newStatus: SharingStatus) => {
    setContentDefinitions(prevDefs => 
      prevDefs.map(def => 
        def.id === definitionId ? { ...def, sharingStatus: newStatus } : def
      )
    );
  };
  
  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your branding pipeline...</p>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <section aria-labelledby="content-library-heading" className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle id="content-library-heading" className="flex items-center gap-2 text-lg text-primary">
                    <Share2 /> Content Library
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
                      <form onSubmit={handleAddContentDefinition} className="space-y-3">
                        <Input type="text" placeholder="New Topic" value={newContentTopic} onChange={(e) => setNewContentTopic(e.target.value)} list="topics-datalist" aria-label="New topic name" className="h-10 text-sm" />
                        <datalist id="topics-datalist">
                          {allTopics.map(topic => <option key={topic} value={topic} />)}
                        </datalist>
                        <Input type="text" placeholder="New Content Idea" value={newContentTitle} onChange={(e) => setNewContentTitle(e.target.value)} aria-label="New content idea" className="h-10 text-sm" />
                        <Button type="submit" size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs xl:text-sm xl:h-10 xl:px-4"> <PlusCircle className="mr-2 h-5 w-5" /> Add Content Idea </Button>
                      </form>
                      <div className="max-h-[calc(100vh-38rem)] overflow-y-auto pr-1">
                        {filteredContentDefinitions.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">Library empty. Add a new topic and content idea to get started!</p>
                        ) : (
                          <ul className="space-y-2">
                            {filteredContentDefinitions.sort((a,b) => a.name.localeCompare(b.name)).map(def => (
                              <motion.li key={def.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="p-3 bg-card border rounded-lg shadow-sm">
                                {editingDefinition?.id === def.id ? (
                                  <div className="space-y-2">
                                    <Input value={editingDefinitionCategory} onChange={(e) => setEditingDefinitionCategory(e.target.value)} className="h-9" aria-label="Edit topic"/>
                                    <Input value={editingDefinitionName} onChange={(e) => setEditingDefinitionName(e.target.value)} className="h-9" aria-label="Edit content idea"/>
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={handleSaveEditDefinition} className="flex-grow bg-green-600 hover:bg-green-500 text-white"><Save className="h-4 w-4 mr-1"/>Save</Button>
                                      <Button size="sm" variant="ghost" onClick={() => setEditingDefinition(null)} className="flex-grow"><X className="h-4 w-4 mr-1"/>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex-grow min-w-0">
                                        <span className="font-medium text-foreground block" title={def.name}>{def.name}</span>
                                        <Badge variant="secondary" className="text-xs ml-0 my-0.5">{def.category}</Badge>
                                    </div>
                                    <div className="flex-shrink-0 flex items-center">
                                      <Button variant="ghost" size="icon" onClick={() => handleStartEditDefinition(def)} className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label={`Edit ${def.name}`}> <Edit3 className="h-4 w-4" /> </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleDeleteContentDefinition(def.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${def.name}`}> <Trash2 className="h-4 w-4" /> </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleAddTaskToSession(def)} className="h-8 w-8 text-muted-foreground hover:text-accent" aria-label={`Add ${def.name} to session`}> <ChevronRight className="h-5 w-5" /> </Button>
                                    </div>
                                  </div>
                                )}
                              </motion.li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="branding-session-heading" className="md:col-span-2 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="flex-grow">
                          <CardTitle id="branding-session-heading" className="flex items-center gap-2 text-lg text-accent">
                              <ListChecks /> Branding Session for: {format(selectedDate, 'PPP')}
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
                            <p className="text-muted-foreground">No content ideas for {format(selectedDate, 'PPP')}.</p>
                            <p className="text-sm text-muted-foreground/80">Add ideas from the library to get started!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <AnimatePresence>
                          {currentSessionTasks.map(task => {
                              const definition = contentDefinitions.find(def => def.id === task.definitionId);
                              return (
                                <WorkoutExerciseCard 
                                  key={task.id} 
                                  exercise={{...task, sharingStatus: definition?.sharingStatus}}
                                  onLogSet={handleLogStage} 
                                  onDeleteSet={() => {}} 
                                  onUpdateSet={() => {}}
                                  onUpdateSharingStatus={handleUpdateSharingStatus}
                                  onRemoveExercise={handleRemoveTaskFromSession}
                                  pageType="branding"
                                />
                              );
                          })}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </CardContent>
              </Card>>
          </section>
        </div>
      </div>

      <AlertDialog open={showBackupPrompt} onOpenChange={setShowBackupPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weekly Backup Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              It's Monday! Would you like to back up your branding data? This will download a file to your computer.
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

export default function PersonalBrandingPage() {
  return ( <AuthGuard> <PersonalBrandingPageContent /> </AuthGuard> );
}
