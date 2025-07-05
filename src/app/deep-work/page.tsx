
"use client";

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, ChevronRight, CalendarIcon, TrendingUp, Loader2, Briefcase, BookCopy, MoreVertical, Link as LinkIcon, Folder, Library } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, getISOWeek, isMonday, getYear } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { ExerciseProgressModal } from '@/components/ExerciseProgressModal';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from '@/lib/utils';


const DEFAULT_TARGET_SESSIONS = 1;
const DEFAULT_TARGET_DURATION = "25";

function DeepWorkPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    exportData,
    allDeepWorkLogs, setAllDeepWorkLogs,
    deepWorkDefinitions, setDeepWorkDefinitions,
    upskillDefinitions, setUpskillDefinitions,
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
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);

  // New state for right panel view
  const [viewMode, setViewMode] = useState<'session' | 'library'>('session');
  const [selectedFocusArea, setSelectedFocusArea] = useState<ExerciseDefinition | null>(null);

  // State for the "Create & Link" functionality
  const [createLinkModalOpen, setCreateLinkModalOpen] = useState(false);
  const [createLinkModalConfig, setCreateLinkModalConfig] = useState<{type: 'upskill' | 'deepwork', parent: ExerciseDefinition} | null>(null);
  const [newLinkedItemName, setNewLinkedItemName] = useState('');
  const [newLinkedItemTopic, setNewLinkedItemTopic] = useState('');
  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);
  
  const topicsWithFocusAreas = useMemo(() => {
    const grouped: Record<string, ExerciseDefinition[]> = {};
    deepWorkDefinitions.forEach(def => {
      if (!grouped[def.category]) {
        grouped[def.category] = [];
      }
      grouped[def.category].push(def);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [deepWorkDefinitions]);

  const allTopics = useMemo(() => topicsWithFocusAreas.map(([topic]) => topic), [topicsWithFocusAreas]);

  useEffect(() => {
    if (allTopics.length > 0) {
        setActiveAccordionItems(allTopics);
    }
  }, [allTopics]);

  const isNewTopic = newTopicName.trim() !== '' && !allTopics.includes(newTopicName.trim());

  useEffect(() => {
    setIsLoadingPage(false); // Data is loaded from context
  }, []);

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
      isReadyForBranding: false,
      sharingStatus: { twitter: false, linkedin: false, devto: false }
    };
    setDeepWorkDefinitions(prev => [...prev, newDef]);
    setNewSubtopicName('');
    toast({ title: "Success", description: `Focus Area "${newDef.name}" added to library.` });
  };

  const handleDeleteExerciseDefinition = (id: string) => {
    const defToDelete = deepWorkDefinitions.find(def => def.id === id);
    if (!defToDelete) return;
    setDeepWorkDefinitions(prev => prev.filter(def => def.id !== id));
    setAllDeepWorkLogs(prevLogs => prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) })));
    if (selectedFocusArea?.id === id) {
        setSelectedFocusArea(null);
        setViewMode('session');
    }
    toast({ title: "Success", description: `Focus Area "${defToDelete.name}" removed.` });
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
    setAllDeepWorkLogs(prevLogs => prevLogs.map(log => ({...log, exercises: log.exercises.map(ex => ex.definitionId === editingDefinition.id ? { ...ex, name: updatedDef.name, category: updatedDef.category } : ex)})));
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
  
  const handleOpenCreateLinkModal = (type: 'upskill' | 'deepwork', parent: ExerciseDefinition) => {
    setCreateLinkModalConfig({ type, parent });
    setNewLinkedItemTopic('');
    setNewLinkedItemName('');
    setCreateLinkModalOpen(true);
  };
  
  const handleCreateAndLinkItem = () => {
    if (!createLinkModalConfig || !newLinkedItemName.trim() || !newLinkedItemTopic.trim()) {
        toast({ title: "Error", description: "Topic and Name are required.", variant: "destructive" });
        return;
    }
    const { type, parent } = createLinkModalConfig;
    let updatedParent;
    if (type === 'upskill') {
        const newUpskillDef: ExerciseDefinition = {
            id: `def_${Date.now()}_upskill_${Math.random()}`,
            name: newLinkedItemName.trim(),
            category: newLinkedItemTopic.trim() as ExerciseCategory,
        };
        setUpskillDefinitions(prev => [...prev, newUpskillDef]);
        updatedParent = { ...parent, linkedUpskillIds: [...(parent.linkedUpskillIds || []), newUpskillDef.id] };
    } else { // 'deepwork'
        const newDeepWorkDef: ExerciseDefinition = {
            id: `def_${Date.now()}_deepwork_${Math.random()}`,
            name: newLinkedItemName.trim(),
            category: newLinkedItemTopic.trim() as ExerciseCategory,
        };
        setDeepWorkDefinitions(prev => [...prev, newDeepWorkDef]);
        updatedParent = { ...parent, linkedDeepWorkIds: [...(parent.linkedDeepWorkIds || []), newDeepWorkDef.id] };
    }
    setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
    setSelectedFocusArea(updatedParent);
    toast({ title: "Success", description: "New item created and linked." });
    setCreateLinkModalOpen(false);
  };

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
          
          <aside className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-primary">
                  <Folder /> Topic Library
                </CardTitle>
                <CardDescription>Organize your focus areas by topic.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTaskDefinition} className="space-y-3 mb-4 p-3 border rounded-lg bg-muted/30">
                  <Input type="text" placeholder="New Topic" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} list="topics-datalist" aria-label="New topic name" className="h-10 text-sm" />
                  <datalist id="topics-datalist">
                    {allTopics.map(topic => <option key={topic} value={topic} />)}
                  </datalist>
                  <Input type="text" placeholder="New Focus Area" value={newSubtopicName} onChange={(e) => setNewSubtopicName(e.target.value)} aria-label="New focus area" className="h-10 text-sm" />
                  {isNewTopic && (
                    <div className="space-y-2 rounded-md border p-3 bg-background/50">
                      <Label className="text-xs font-medium">Classify this new topic</Label>
                      <RadioGroup value={newTopicClassification} onValueChange={(v) => setNewTopicClassification(v as 'product' | 'service')} className="flex gap-4 pt-1">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="product" id="class-product-new" /><Label htmlFor="class-product-new" className="font-normal">Product</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="service" id="class-service-new" /><Label htmlFor="class-service-new" className="font-normal">Service</Label></div>
                      </RadioGroup>
                    </div>
                  )}
                  <Button type="submit" size="sm" className="w-full"> <PlusCircle className="mr-2 h-4 w-4" /> Add to Library </Button>
                </form>
                <Accordion type="multiple" value={activeAccordionItems} onValueChange={setActiveAccordionItems} className="w-full">
                  {topicsWithFocusAreas.map(([topic, focusAreas]) => (
                    <AccordionItem key={topic} value={topic}>
                      <AccordionTrigger>{topic}</AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-1">
                          {focusAreas.sort((a,b) => a.name.localeCompare(b.name)).map(def => (
                            <li key={def.id} className="group flex items-center justify-between p-1.5 rounded-md hover:bg-muted">
                              <span className="flex-grow truncate cursor-pointer pl-1" onClick={() => { setSelectedFocusArea(def); setViewMode('library'); }} title={`View details for ${def.name}`}>{def.name}</span>
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
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </aside>

          <section aria-labelledby="main-panel-heading" className="md:col-span-2 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="flex-grow">
                          <CardTitle id="main-panel-heading" className="flex items-center gap-2 text-lg">
                              {viewMode === 'session' ? <ListChecks /> : <Library />}
                              {viewMode === 'session' ? `Session for: ${format(selectedDate, 'PPP')}` : `Library: ${selectedFocusArea?.name || 'Select an item'}`}
                          </CardTitle>
                          {viewMode === 'library' && <CardDescription className="text-xs mt-1">{selectedFocusArea?.category}</CardDescription>}
                      </div>
                      <div className='flex items-center gap-2'>
                        <Button variant={viewMode === 'session' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('session')}>Session</Button>
                        <Button variant={viewMode === 'library' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('library')} disabled={!selectedFocusArea}>Library</Button>
                        <Popover>
                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-[150px] justify-start text-left font-normal h-9",!selectedDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{selectedDate ? format(selectedDate, "MMM dd") : <span>Pick a date</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus /></PopoverContent>
                        </Popover>
                      </div>
                  </CardHeader>
                  <CardContent className="p-4">
                      {viewMode === 'session' ? (
                          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
                              {currentWorkoutExercises.length === 0 ? (
                                <div className="text-center py-10"><Briefcase className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">No focus areas for {format(selectedDate, 'PPP')}.</p><p className="text-sm text-muted-foreground/80">Add focus areas from the library to get started!</p></div>
                              ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                  {currentWorkoutExercises.map((exercise) => {
                                      const definition = deepWorkDefinitions.find(def => def.id === exercise.definitionId);
                                      return (
                                        <WorkoutExerciseCard 
                                          key={exercise.id} 
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
                                </div>
                              )}
                          </div>
                      ) : selectedFocusArea ? (
                          <ScrollArea className="h-[calc(100vh-16rem)] pr-2">
                            <div className="space-y-6">
                              <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2"><BookCopy className="h-5 w-5 text-primary" /> Linked Learning</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {(selectedFocusArea.linkedUpskillIds || []).map(id => {
                                    const upskillDef = upskillDefinitions.find(ud => ud.id === id);
                                    return upskillDef ? (
                                      <Card key={id}><CardContent className="p-3"><p className="font-medium">{upskillDef.name}</p><p className="text-sm text-muted-foreground">{upskillDef.category}</p></CardContent></Card>
                                    ) : null;
                                  })}
                                  <Card className="border-dashed hover:border-primary hover:bg-muted transition-colors cursor-pointer" onClick={() => handleOpenCreateLinkModal('upskill', selectedFocusArea)}>
                                    <CardContent className="p-3 h-full flex flex-col items-center justify-center text-center">
                                      <PlusCircle className="h-6 w-6 text-muted-foreground mb-1" />
                                      <p className="text-sm font-medium">Add & Link New Task</p>
                                    </CardContent>
                                  </Card>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2"><LinkIcon className="h-5 w-5 text-primary" /> Linked Work</h3>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {(selectedFocusArea.linkedDeepWorkIds || []).map(id => {
                                    const deepworkDef = deepWorkDefinitions.find(dd => dd.id === id);
                                    return deepworkDef ? (
                                       <Card key={id}><CardContent className="p-3"><p className="font-medium">{deepworkDef.name}</p><p className="text-sm text-muted-foreground">{deepworkDef.category}</p></CardContent></Card>
                                    ) : null;
                                  })}
                                  <Card className="border-dashed hover:border-primary hover:bg-muted transition-colors cursor-pointer" onClick={() => handleOpenCreateLinkModal('deepwork', selectedFocusArea)}>
                                    <CardContent className="p-3 h-full flex flex-col items-center justify-center text-center">
                                      <PlusCircle className="h-6 w-6 text-muted-foreground mb-1" />
                                      <p className="text-sm font-medium">Add & Link New Focus Area</p>
                                    </CardContent>
                                  </Card>
                                </div>
                              </div>
                            </div>
                        </ScrollArea>
                      ) : (
                          <div className="text-center py-10"><p className="text-muted-foreground">Select a Focus Area from the library to view its details.</p></div>
                      )}
                  </CardContent>
              </Card>
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
            <AlertDialogDescription>It's Monday! Would you like to back up your deep work data?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={markBackupPromptAsHandled}>Maybe Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackupConfirm}>Yes, Back Up Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createLinkModalOpen} onOpenChange={setCreateLinkModalOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create & Link New {createLinkModalConfig?.type === 'upskill' ? 'Learning Task' : 'Focus Area'}</DialogTitle>
              <DialogDescription>
                This will create a new item in the respective library and link it to "{createLinkModalConfig?.parent.name}".
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="new-linked-topic">Topic</Label>
                  <Input id="new-linked-topic" value={newLinkedItemTopic} onChange={e => setNewLinkedItemTopic(e.target.value)} placeholder="e.g., GPU Programming" />
                </div>
                 <div className="space-y-1">
                  <Label htmlFor="new-linked-name">Name</Label>
                  <Input id="new-linked-name" value={newLinkedItemName} onChange={e => setNewLinkedItemName(e.target.value)} placeholder={createLinkModalConfig?.type === 'upskill' ? 'e.g., CUDA Fundamentals Course' : 'e.g., Implement Ray Tracing'} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setCreateLinkModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateAndLinkItem}>Create & Link</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}

export default function DeepWorkPage() {
  return ( <AuthGuard> <DeepWorkPageContent /> </AuthGuard> );
}
