
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ListChecks, ChevronRight, CalendarIcon, GripVertical, Briefcase, Share2, Loader2 } from 'lucide-react';
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

function PersonalBrandingPageContent() {
  const { toast } = useToast();
  const { currentUser, exportData } = useAuth();
  
  const [brandingTasks, setBrandingTasks] = useState<ExerciseDefinition[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allBrandingLogs, setAllBrandingLogs] = useState<DatedWorkout[]>([]);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);

  useEffect(() => {
    if (currentUser?.username) {
      const username = currentUser.username;
      
      const deepWorkDefsKey = `deepwork_definitions_${username}`;
      const deepWorkLogsKey = `deepwork_logs_${username}`;
      const storedDeepWorkDefs: ExerciseDefinition[] = JSON.parse(localStorage.getItem(deepWorkDefsKey) || '[]');
      const storedDeepWorkLogs: DatedWorkout[] = JSON.parse(localStorage.getItem(deepWorkLogsKey) || '[]');

      const brandingTasksKey = `branding_tasks_${username}`;
      const brandingLogsKey = `branding_logs_${username}`;
      const storedBrandingTasks: ExerciseDefinition[] = JSON.parse(localStorage.getItem(brandingTasksKey) || '[]');
      const storedBrandingLogs: DatedWorkout[] = JSON.parse(localStorage.getItem(brandingLogsKey) || '[]');

      const focusAreaSessionCounts: Record<string, number> = {};
      storedDeepWorkLogs.forEach(log => {
        log.exercises.forEach(ex => {
          focusAreaSessionCounts[ex.definitionId] = (focusAreaSessionCounts[ex.definitionId] || 0) + ex.loggedSets.length;
        });
      });

      const eligibleFocusAreas = storedDeepWorkDefs.filter(def => (focusAreaSessionCounts[def.id] || 0) >= 4);
      
      const topics: Record<string, ExerciseDefinition[]> = {};
      eligibleFocusAreas.forEach(def => {
        if (!topics[def.category]) topics[def.category] = [];
        topics[def.category].push(def);
      });

      const newGeneratedTasks: ExerciseDefinition[] = [];
      Object.keys(topics).forEach(topicName => {
        const focusAreas = topics[topicName];
        if (focusAreas.length >= 4) {
          for (let i = 0; i < focusAreas.length; i += 4) {
            const bundle = focusAreas.slice(i, i + 4);
            if (bundle.length === 4) {
              const bundleNumber = Math.floor(i / 4) + 1;
              const bundleId = `branding_${topicName.replace(/\s+/g, '_')}_bundle_${bundleNumber}`;
              const bundleName = `${topicName} - Bundle #${bundleNumber}`;
              
              const existingTask = storedBrandingTasks.find(t => t.id === bundleId);
              if (existingTask) {
                newGeneratedTasks.push(existingTask);
              } else {
                newGeneratedTasks.push({
                  id: bundleId,
                  name: bundleName,
                  category: 'Personal Branding' as ExerciseCategory,
                  sharingStatus: { twitter: false, linkedin: false, devto: false },
                });
              }
            }
          }
        }
      });

      setBrandingTasks(newGeneratedTasks);
      setAllBrandingLogs(storedBrandingLogs);
    } else {
      setBrandingTasks([]);
      setAllBrandingLogs([]);
    }
    const timer = setTimeout(() => setIsLoadingPage(false), 300);
    return () => clearTimeout(timer);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.username && !isLoadingPage) {
      const username = currentUser.username;
      const brandingTasksKey = `branding_tasks_${username}`;
      const brandingLogsKey = `branding_logs_${username}`;
      localStorage.setItem(brandingTasksKey, JSON.stringify(brandingTasks));
      localStorage.setItem(brandingLogsKey, JSON.stringify(allBrandingLogs));
    }
  }, [brandingTasks, allBrandingLogs, currentUser, isLoadingPage]);

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
    exportData();
    markBackupPromptAsHandled();
  };
  
  const currentDatedLog = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return allBrandingLogs.find(log => log.id === dateKey);
  }, [selectedDate, allBrandingLogs]);

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
    };
    const existingLog = allBrandingLogs.find(log => log.id === dateKey);
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
                    These topic bundles are automatically generated from your Deep Work sessions. Add them to a branding session to start content creation.
                  </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                  <div className="max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
                    {brandingTasks.length === 0 ? (
                      <div className="text-center py-10">
                        <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">Your pipeline is empty.</p>
                        <p className="text-sm text-muted-foreground/80">
                          A topic appears here when it has 4 focus areas with at least 4 logged sessions each in Deep Work.
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {brandingTasks.map(task => (
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
                          </motion.li>
                        ))}
                      </ul>
                    )}
                  </div>
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
