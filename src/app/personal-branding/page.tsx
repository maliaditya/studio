
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ListChecks, ChevronRight, CalendarIcon, GripVertical, Briefcase, Share2, Loader2, Check, ChevronDown, ChevronUp, Linkedin, Trash2, PlusCircle, X } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isMonday, getYear, getISOWeek } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, SharingStatus } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>X</title>
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
    </svg>
);

const DevToIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>DEV Community</title>
        <path d="M11.472 24a1.5 1.5 0 0 1-1.06-.44L.439 13.587a1.5 1.5 0 0 1 0-2.12l9.97-9.97a1.5 1.5 0 0 1 2.12 0L22.503 11.47a1.5 1.5 0 0 1 0 2.121l-9.972 9.971a1.5 1.5 0 0 1-1.06.44Zm-8.485-11.25 8.485 8.485 8.485-8.485-8.485-8.485-8.485 8.485ZM19.5 18h-3V9h3v9Z"/>
    </svg>
);


function PersonalBrandingPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    exportData,
    brandingTasks, setBrandingTasks,
    brandingLogs, setAllBrandingLogs,
    deepWorkDefinitions, deepWorkLogs
  } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [isPublishedExpanded, setIsPublishedExpanded] = useState(false);
  const [addSelection, setAddSelection] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentUser?.username) {
      const bundledFocusAreaNames = new Set<string>();
      brandingTasks.forEach(task => {
          if (task.focusAreas) {
              task.focusAreas.forEach(name => bundledFocusAreaNames.add(name));
          }
      });

      const focusAreaSessionCounts: Record<string, number> = {};
      deepWorkLogs.forEach(log => {
        log.exercises.forEach(ex => {
          focusAreaSessionCounts[ex.definitionId] = (focusAreaSessionCounts[ex.definitionId] || 0) + ex.loggedSets.length;
        });
      });

      const eligibleFocusAreas = deepWorkDefinitions.filter(def => {
        const hasEnoughSessions = (focusAreaSessionCounts[def.id] || 0) >= 4;
        const isAlreadyBundled = bundledFocusAreaNames.has(def.name);
        return hasEnoughSessions && !isAlreadyBundled;
      });
      
      const topics: Record<string, ExerciseDefinition[]> = {};
      eligibleFocusAreas.forEach(def => {
        if (!topics[def.category]) topics[def.category] = [];
        topics[def.category].push(def);
      });

      const newGeneratedTasks: ExerciseDefinition[] = [...brandingTasks];
      let wasChanged = false;
      const newlyBundledNames = new Set<string>();

      Object.keys(topics).forEach(topicName => {
        const focusAreasInTopic = topics[topicName];
        if (focusAreasInTopic.length >= 4) {
          for (let i = 0; i < focusAreasInTopic.length; i += 4) {
            const bundle = focusAreasInTopic.slice(i, i + 4);
            if (bundle.length === 4) {
              wasChanged = true;
              const existingBundlesForTopic = newGeneratedTasks.filter(t => t.name.startsWith(`${topicName} - Bundle`)).length;
              const bundleNumber = existingBundlesForTopic + 1;
              const bundleId = `branding_${topicName.replace(/\s+/g, '_')}_bundle_${bundleNumber}_${Date.now()}`;
              const bundleName = `${topicName} - Bundle #${bundleNumber}`;
              const bundleFocusAreas = bundle.map(def => def.name);
              
              newGeneratedTasks.push({
                id: bundleId,
                name: bundleName,
                category: 'Personal Branding' as ExerciseCategory,
                sharingStatus: { twitter: false, linkedin: false, devto: false },
                focusAreas: bundleFocusAreas,
              });
              
              bundleFocusAreas.forEach(name => newlyBundledNames.add(name));
            }
          }
        }
      });
      
      if(wasChanged) {
        toast({ title: 'New Content Bundles Created!', description: `${newlyBundledNames.size} focus areas have been bundled into new content ideas.` });
        setBrandingTasks(newGeneratedTasks);
      }
    }
    const timer = setTimeout(() => setIsLoadingPage(false), 300);
    return () => clearTimeout(timer);
  }, [currentUser, deepWorkDefinitions, deepWorkLogs, brandingTasks, setBrandingTasks, toast]);
  
  const availableFocusAreas = useMemo(() => {
    if (!deepWorkDefinitions.length || !deepWorkLogs.length) {
      return [];
    }

    const focusAreaSessionCounts: Record<string, number> = {};
    deepWorkLogs.forEach(log => {
      log.exercises.forEach(ex => {
        focusAreaSessionCounts[ex.definitionId] = (focusAreaSessionCounts[ex.definitionId] || 0) + ex.loggedSets.length;
      });
    });

    const allEligibleFocusAreas = deepWorkDefinitions.filter(def => 
        (focusAreaSessionCounts[def.id] || 0) >= 4
    );
    
    const usedFocusAreaNames = new Set<string>();
    brandingTasks.forEach(task => {
      task.focusAreas?.forEach(name => usedFocusAreaNames.add(name));
    });
    
    return allEligibleFocusAreas.filter(def => !usedFocusAreaNames.has(def.name));
  }, [deepWorkDefinitions, deepWorkLogs, brandingTasks]);

  useEffect(() => {
    if (!currentUser) return;
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_branding_${year}-${week}`;
    const hasBeenPrompted = localStorage.getItem(backupPromptKey);
    if (isMonday(today) && !hasBeenPrompted) setShowBackupPrompt(true);
  }, [currentUser]);

  const { activeTasks, publishedTasks } = useMemo(() => {
      const isFullyShared = (task: ExerciseDefinition) => 
          task.sharingStatus && 
          task.sharingStatus.twitter && 
          task.sharingStatus.linkedin && 
          task.sharingStatus.devto;
      
      const active: ExerciseDefinition[] = [];
      const published: ExerciseDefinition[] = [];

      brandingTasks.forEach(task => {
          if (isFullyShared(task)) {
              published.push(task);
          } else {
              active.push(task);
          }
      });

      return { activeTasks: active, publishedTasks: published };
  }, [brandingTasks]);

  const markBackupPromptAsHandled = () => {
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_branding_${year}-${week}`;
    localStorage.setItem(backupPromptKey, 'true');
    setShowBackupPrompt(false);
  };

  const handleBackupConfirm = () => {
    exportData();
    markBackupPromptAsHandled();
  };
  
  const currentDatedLog = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return brandingLogs.find(log => log.id === dateKey);
  }, [selectedDate, brandingLogs]);

  const currentSessionTasks = useMemo(() => {
    return currentDatedLog?.exercises || [];
  }, [currentDatedLog]);

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

  const handleAddTaskToSession = (definition: ExerciseDefinition) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newSessionTask: WorkoutExercise = {
      id: `${definition.id}-${Date.now()}`,
      definitionId: definition.id,
      name: definition.name,
      category: definition.category,
      loggedSets: [],
      targetSets: 4,
      targetReps: "4 stages",
      focusAreas: definition.focusAreas,
    };
    const existingLog = brandingLogs.find(log => log.id === dateKey);
    if (existingLog) {
      if (existingLog.exercises.some(ex => ex.definitionId === definition.id)) {
        toast({ title: "Info", description: "This task is already in today's session." });
        return;
      }
      updateOrAddLog({ ...existingLog, exercises: [...existingLog.exercises, newSessionTask] });
    } else {
      updateOrAddLog({ id: dateKey, date: dateKey, exercises: [newSessionTask] });
    }
    toast({ title: "Added to Session", description: `"${definition.name}" added for ${format(selectedDate, 'PPP')}.` });
  };

  const handleRemoveTaskFromSession = (exerciseId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingLog = brandingLogs.find(log => log.id === dateKey);
    if (existingLog) {
      const updatedExercises = existingLog.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) setAllBrandingLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      else updateOrAddLog({ ...existingLog, exercises: updatedExercises });
    }
  };

  const handleLogStage = (exerciseId: string, stageIndex: number) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingLog = brandingLogs.find(log => log.id === dateKey);
    if (existingLog) {
      const newSet: LoggedSet = { id: Date.now().toString(), reps: stageIndex, weight: 1, timestamp: Date.now() };
      const updatedExercises = existingLog.exercises.map(ex => {
        if (ex.id === exerciseId) {
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
    setBrandingTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === definitionId ? { ...task, sharingStatus: newStatus } : task
      )
    );
  };
  
  const handleRemoveFocusAreaFromBundle = (bundleId: string, focusAreaName: string) => {
    setBrandingTasks(prevTasks => {
        const newTasks = prevTasks.map(task => {
            if (task.id === bundleId) {
                return {
                    ...task,
                    focusAreas: task.focusAreas?.filter(fa => fa !== focusAreaName)
                };
            }
            return task;
        }).filter(task => task.focusAreas && task.focusAreas.length > 0); 

        if (newTasks.length < prevTasks.length) {
            toast({ title: "Bundle Removed", description: "The bundle was removed as it became empty." });
        } else {
            toast({ title: "Focus Area Removed" });
        }
        return newTasks;
    });
  };

  const handleAddFocusAreaToBundle = (bundleId: string) => {
    const focusAreaName = addSelection[bundleId];
    if (!focusAreaName) {
        toast({ title: "No Selection", description: "Please select a focus area to add.", variant: "destructive" });
        return;
    }

    setBrandingTasks(prevTasks => prevTasks.map(task => {
        if (task.id === bundleId) {
            const existingFocusAreas = Array.isArray(task.focusAreas) ? task.focusAreas : [];
            if (existingFocusAreas.includes(focusAreaName)) {
                toast({ title: "Already Exists", description: `"${focusAreaName}" is already in this bundle.` });
                return task;
            }
            return {
                ...task,
                focusAreas: [...existingFocusAreas, focusAreaName]
            };
        }
        return task;
    }));

    setAddSelection(prev => ({ ...prev, [bundleId]: '' }));
    toast({ title: "Focus Area Added" });
  };
  
  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Generating your branding pipeline...</p>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <section aria-labelledby="branding-pipeline-heading" className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                  <CardTitle id="branding-pipeline-heading" className="flex items-center gap-2 text-lg text-primary">
                    <Share2 /> Branding Pipeline
                  </CardTitle>
                  <CardDescription>
                    Topic bundles are automatically generated from your Deep Work. Add them to a session to start content creation.
                  </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                  <div className="max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
                    {activeTasks.length === 0 ? (
                      <div className="text-center py-10">
                        <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">Your pipeline is empty.</p>
                        <p className="text-sm text-muted-foreground/80">
                          A topic bundle appears here when it has 4 focus areas with at least 4 logged sessions each in Deep Work.
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {activeTasks.map(task => (
                          <motion.li key={task.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="p-3 bg-card border rounded-lg shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-grow min-w-0">
                                  <span className="font-medium text-foreground block" title={task.name}>{task.name}</span>
                              </div>
                              <div className="flex-shrink-0 flex items-center">
                                <Button variant="ghost" size="icon" onClick={() => handleAddTaskToSession(task)} className="h-8 w-8 text-muted-foreground hover:text-accent" aria-label={`Add ${task.name} to session`}>
                                    <ChevronRight className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {task.focusAreas?.map(fa => (
                                    <Badge key={fa} variant="secondary" className="py-1 pl-2 pr-1 inline-flex items-center gap-1">
                                        <span className="truncate max-w-[150px]" title={fa}>{fa}</span>
                                        <button 
                                            onClick={() => handleRemoveFocusAreaFromBundle(task.id, fa)}
                                            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                                            aria-label={`Remove ${fa}`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t flex gap-2">
                                <Select value={addSelection[task.id] || ''} onValueChange={(value) => setAddSelection(prev => ({ ...prev, [task.id]: value }))}>
                                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Add eligible area..." /></SelectTrigger>
                                    <SelectContent>
                                        {availableFocusAreas.length > 0 ? (
                                            availableFocusAreas.map(def => (
                                                <SelectItem key={def.id} value={def.name}>{def.name} ({def.category})</SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-2 text-xs text-muted-foreground">No eligible areas found.</div>
                                        )}
                                    </SelectContent>
                                </Select>
                                <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => handleAddFocusAreaToBundle(task.id)} disabled={!addSelection[task.id]}>
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </div>
                          </motion.li>
                        ))}
                      </ul>
                    )}
                  </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader className="cursor-pointer p-4" onClick={() => setIsPublishedExpanded(!isPublishedExpanded)}>
                    <div className="flex justify-between items-center">
                        <div className='flex-grow'>
                            <CardTitle className="flex items-center gap-2 text-lg text-primary">
                                <Check /> Published Content
                            </CardTitle>
                            <CardDescription className='mt-1'>
                                A log of your successfully published bundles.
                            </CardDescription>
                        </div>
                        {isPublishedExpanded ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-primary" />}
                    </div>
                </CardHeader>
                <AnimatePresence>
                    {isPublishedExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <CardContent className="p-4 pt-0">
                        <div className="max-h-[300px] overflow-y-auto pr-1">
                            {publishedTasks.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-4">No published content yet.</p>
                            ) : (
                            <ul className="space-y-3">
                                {publishedTasks.map(task => (
                                <li key={task.id} className="p-3 bg-card border rounded-lg">
                                    <p className="font-semibold text-foreground">{task.name}</p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {task.focusAreas?.map(fa => <Badge key={fa} variant="outline" className="text-xs">{fa}</Badge>)}
                                    </div>
                                    <div className="mt-3 pt-2 border-t flex items-center gap-4 text-muted-foreground">
                                        <span className="text-xs font-semibold">SHARED ON:</span>
                                        <div className="flex items-center gap-3">
                                          {task.sharingStatus?.twitter && <TwitterIcon className="h-4 w-4" title="Shared on X/Twitter"/>}
                                          {task.sharingStatus?.linkedin && <Linkedin className="h-4 w-4" title="Shared on LinkedIn" />}
                                          {task.sharingStatus?.devto && <DevToIcon className="h-4 w-4" title="Shared on DEV.to" />}
                                        </div>
                                    </div>
                                </li>
                                ))}
                            </ul>
                            )}
                        </div>
                        </CardContent>
                    </motion.div>
                    )}
                </AnimatePresence>
            </Card>

          </section>

          <section aria-labelledby="branding-session-heading" className="md:col-span-2 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="flex-grow">
                          <CardTitle id="branding-session-heading" className="flex items-center gap-2 text-lg text-primary">
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
                            <p className="text-muted-foreground">No content creation tasks for {format(selectedDate, 'PPP')}.</p>
                            <p className="text-sm text-muted-foreground/80">Add tasks from the pipeline to get started!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <AnimatePresence>
                          {currentSessionTasks.map(task => {
                              const definition = brandingTasks.find(def => def.id === task.definitionId);
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
              </Card>
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
