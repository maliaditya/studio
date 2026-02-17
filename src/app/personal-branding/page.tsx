
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ListChecks, ChevronRight, CalendarIcon, GripVertical, Briefcase, Share2, Loader2, Check, ChevronDown, ChevronUp, Linkedin, PlusCircle, Package, Info } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';

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
    brandingLogs, setAllBrandingLogs,
    deepWorkDefinitions, setDeepWorkDefinitions,
  } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [isPublishedExpanded, setIsPublishedExpanded] = useState(false);

  // State for bundle creation
  const [newBundleName, setNewBundleName] = useState('');
  const [selectedFocusAreaIds, setSelectedFocusAreaIds] = useState<string[]>([]);

  useEffect(() => {
    setIsLoadingPage(false);
  }, []);
  
  useEffect(() => {
    if (!currentUser) return;
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_branding_${year}-${week}`;
    const hasBeenPrompted = localStorage.getItem(backupPromptKey);
    if (isMonday(today) && !hasBeenPrompted) setShowBackupPrompt(true);
  }, [currentUser]);

  const { activeBundles, publishedBundles, eligibleFocusAreas } = useMemo(() => {
    const allDefinitions = deepWorkDefinitions || [];

    // Eligible areas are individual focus areas (not bundles) marked as ready.
    const eligible = allDefinitions.filter(def => def.isReadyForBranding && !def.focusAreaIds);

    // Bundles are items that HAVE a focusAreaIds array.
    const allBundles = allDefinitions.filter(def => Array.isArray(def.focusAreaIds));

    const isFullyShared = (task: ExerciseDefinition) => 
        task.sharingStatus && 
        task.sharingStatus.twitter && 
        task.sharingStatus.linkedin && 
        task.sharingStatus.devto;

    const active: ExerciseDefinition[] = [];
    const published: ExerciseDefinition[] = [];

    allBundles.forEach(bundle => {
        if (isFullyShared(bundle)) {
            published.push(bundle);
        } else {
            active.push(bundle);
        }
    });
    
    return { activeBundles: active, publishedBundles: published, eligibleFocusAreas: eligible };
  }, [deepWorkDefinitions]);


  const markBackupPromptAsHandled = () => {
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_branding_${year}-${week}`;
    safeSetLocalStorageItem(backupPromptKey, 'true');
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

  const handleCreateBundle = () => {
    if (newBundleName.trim() === '') {
      toast({ title: "Error", description: "Please provide a name for the bundle.", variant: "destructive" });
      return;
    }
    if (selectedFocusAreaIds.length === 0) {
      toast({ title: "Error", description: "Please select at least one focus area for the bundle.", variant: "destructive" });
      return;
    }

    const newBundle: ExerciseDefinition = {
      id: `bundle_${Date.now()}_${Math.random()}`,
      name: newBundleName.trim(),
      category: "Content Bundle",
      focusAreaIds: selectedFocusAreaIds,
      isReadyForBranding: false, // Bundles aren't "ready" themselves, they just exist.
      sharingStatus: { twitter: false, linkedin: false, devto: false }
    };

    setDeepWorkDefinitions(prevDefs => {
      // Mark constituent focus areas as no longer "ready" so they don't show up in the list
      const updatedDefs = prevDefs.map(def => {
        if (selectedFocusAreaIds.includes(def.id)) {
          return { ...def, isReadyForBranding: false };
        }
        return def;
      });
      // Add the new bundle
      return [...updatedDefs, newBundle];
    });

    toast({ title: "Bundle Created!", description: `"${newBundle.name}" is now in your pipeline.` });
    setNewBundleName('');
    setSelectedFocusAreaIds([]);
  };

  const handleAddTaskToSession = (definition: ExerciseDefinition) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newSessionTask: WorkoutExercise = {
      id: `${definition.id}-${Date.now()}-${Math.random()}`,
      definitionId: definition.id,
      name: definition.name,
      category: definition.category,
      loggedSets: [],
      targetSets: 4,
      targetReps: "4 stages",
      focusAreaIds: definition.focusAreaIds,
    };
    const existingLog = brandingLogs.find(log => log.id === dateKey);
    if (existingLog) {
      if (existingLog.exercises.some(ex => ex.definitionId === definition.id)) {
        toast({ title: "Info", description: "This bundle is already in today's session." });
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
      const newSet: LoggedSet = { id: `${Date.now()}-${Math.random()}`, reps: stageIndex, weight: 1, timestamp: Date.now() };
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
    setDeepWorkDefinitions(prevDefs => 
      prevDefs.map(def => 
        def.id === definitionId ? { ...def, sharingStatus: { ...(def.sharingStatus || {}), ...newStatus } } : def
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
          <section aria-labelledby="branding-pipeline-heading" className="md:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-primary"><Package /> Create New Bundle</CardTitle>
                    <CardDescription>Select ready focus areas to group them into a content bundle.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {eligibleFocusAreas.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                            <Info className="mx-auto h-8 w-8 mb-2" />
                            No focus areas are ready for bundling. Go to the Deep Work page and mark items as 'Ready for Branding' to see them here.
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {eligibleFocusAreas.map(area => (
                                    <div key={area.id} className="flex items-center space-x-2 p-2 rounded-md border">
                                        <Checkbox
                                            id={`check-${area.id}`}
                                            checked={selectedFocusAreaIds.includes(area.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedFocusAreaIds(prev => 
                                                    checked ? [...prev, area.id] : prev.filter(id => id !== area.id)
                                                )
                                            }}
                                        />
                                        <Label htmlFor={`check-${area.id}`} className="font-normal w-full cursor-pointer">
                                            {area.name} <span className="text-muted-foreground">({area.category})</span>
                                        </Label>
                                    </div>
                                ))}
                            </div>
                            <Input 
                                placeholder="Name your new bundle"
                                value={newBundleName}
                                onChange={(e) => setNewBundleName(e.target.value)}
                            />
                            <Button className="w-full" onClick={handleCreateBundle}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create Bundle
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                  <CardTitle id="branding-pipeline-heading" className="flex items-center gap-2 text-lg text-primary">
                    <Share2 /> Branding Pipeline
                  </CardTitle>
                  <CardDescription>
                    Content bundles you've created. Add them to a session to start working.
                  </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                  <div className="max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
                    {activeBundles.length === 0 ? (
                      <div className="text-center py-10">
                        <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">Your pipeline is empty.</p>
                        <p className="text-sm text-muted-foreground/80">
                         Create a content bundle to get started.
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {activeBundles.map(task => (
                          <motion.li key={task.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="p-3 bg-card border rounded-lg shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-grow min-w-0">
                                  <span className="font-medium text-foreground block" title={task.name}>{task.name}</span>
                                   <Badge variant="secondary" className="text-xs">{task.category}</Badge>
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
                            {publishedBundles.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-4">No published content yet.</p>
                            ) : (
                            <ul className="space-y-3">
                                {publishedBundles.map(task => (
                                <li key={task.id} className="p-3 bg-card border rounded-lg">
                                    <p className="font-semibold text-foreground">{task.name}</p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        <Badge variant="outline" className="text-xs">{task.category}</Badge>
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
                            <p className="text-sm text-muted-foreground/80">Add bundles from the pipeline to get started!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <AnimatePresence>
                          {currentSessionTasks.map(task => {
                              const definition = deepWorkDefinitions.find(def => def.id === task.definitionId);
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
                                  deepWorkDefinitions={deepWorkDefinitions}
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
