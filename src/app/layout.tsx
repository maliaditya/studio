

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { BackgroundAudioPlayer } from '@/components/BackgroundAudioPlayer';
import { MatrixBackground } from '@/components/MatrixBackground';
import { DefaultBackground } from '@/components/DefaultBackground';
import { ClothBackground } from '@/components/ClothBackground';
import { FloatingVideoPlayer } from '@/components/FloatingVideoPlayer';
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { GeneralResourcePopup } from '@/components/GeneralResourcePopup';
import { RuleDetailPopupCard, MindsetTechniquePopup } from '@/components/HabitDetailPopup';
import { TaskContextPopup } from '@/components/TaskContextPopup';
import { FocusTimerPopup } from '@/components/FocusTimerPopup';
import { TodaysDietPopup } from '@/components/TodaysDietPopup';
import { DietPlanModal } from '@/components/DietPlanModal';
import { TodaysScheduleCard } from '@/components/TodaysScheduleCard';
import { FocusSessionModal } from '@/components/FocusSessionModal';
import { SmartLoggingPrompt } from '@/components/SmartLoggingPrompt';
import { MissedSlotModal } from '@/components/MissedSlotModal';
import { InterruptModal } from '@/components/InterruptModal';
import { IntentionDetailPopup } from '@/components/IntentionDetailModal';
import { PistonsHead } from '@/components/PistonsHead';
import { format, startOfToday, isAfter, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Project, Activity, MissedSlotReview } from '@/types/workout';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MindsetCategoriesCard } from '@/components/MindsetCategoriesCard';
import { ActivityDistributionCard } from '@/components/ActivityDistributionCard';
import { FavoriteCards } from '@/components/FavoriteCards';
import { TopPrioritiesCard } from '@/components/TopPrioritiesCard';
import { GoalsWidget } from '@/components/GoalsWidget';
import { BrainHacksCard } from '@/components/BrainHacksCard';
import { RuleEquationsCard } from '@/components/RuleEquationsCard';
import { VisualizationTechniquesCard } from '@/components/VisualizationTechniquesCard';
import { SpacedRepetitionPopup } from '@/components/SpacedRepetitionPopup';
import { StopperProgressModal } from '@/components/StopperProgressModal';
import { PillarPopup } from '@/components/PillarPopup';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import dynamic from 'next/dynamic';

const PdfViewerPopup = dynamic(() => import('@/components/PdfViewerPopup'), {
  ssr: false,
});


const slotEndHours: Record<string, number> = {
  'Late Night': 4, 'Dawn': 8, 'Morning': 12, 'Afternoon': 16, 'Evening': 20, 'Night': 24,
};

const parseDurationToMinutes = (durationStr: string | undefined): number => {
    if (!durationStr || typeof durationStr !== 'string') return 0;

    let totalMinutes = 0;
    const trimmedStr = durationStr.trim();
    
    // Case 1: "4h", "2h", "1h 30m"
    const hourMatch = trimmedStr.match(/(\d+(?:\.\d+)?)\s*h/);
    const minMatch = trimmedStr.match(/(\d+)\s*m/);

    if (hourMatch) {
        totalMinutes += parseFloat(hourMatch[1]) * 60;
    }
    if (minMatch) {
        totalMinutes += parseInt(minMatch[1], 10);
    }

    // Case 2: No units found, treat as minutes. E.g., "240", "30"
    if (!hourMatch && !minMatch && /^\d+$/.test(trimmedStr)) {
        totalMinutes += parseInt(trimmedStr, 10);
    }

    return totalMinutes;
};


function AppWrapper({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const authContext = useAuth();
  const { 
    theme,
    isPistonsHeadOpen,
    handlePopupDragEnd,
    openPopups, 
    ResourcePopup, 
    intentionPopups, 
    closeIntentionPopup,
    closeAllResourcePopups, generalPopups, 
    openGeneralPopup, handleUpdateResource, closeGeneralPopup,
    ruleDetailPopup, openRuleDetailPopup, closeRuleDetailPopup, handleRulePopupDragEnd,
    pillarPopupState, closePillarPopup, handlePillarPopupDragEnd,
    habitDetailPopup, closeHabitDetailPopup, handleHabitDetailPopupDragEnd,
    taskContextPopups, closeTaskContextPopup, handleTaskContextPopupDragEnd,
    handlePdfViewerPopupDragEnd,
    drawingCanvasState, setDrawingCanvasState, handleDrawingCanvasPopupDragEnd,
    activeFocusSession,
    setActiveFocusSession,
    handleLogLearning,
    handleToggleMicroSkillRepetition,
    todaysDietPopup,
    closeTodaysDietPopup,
    handleTodaysDietPopupDragEnd,
    isAgendaDocked,
    setIsAgendaDocked,
    schedule,
    setSchedule,
    activityDurations,
    handleToggleComplete,
    handleStartWorkoutLog,
    handleStartLeadGenLog,
    openTaskContextPopup,
    onOpenFocusModal,
    focusSessionModalOpen,
    setFocusSessionModalOpen,
    focusActivity,
    handleStartFocusSession,
    focusDuration,
    currentSlot,
    openMindsetTechniquePopup,
    missedSlotReviews,
    setMissedSlotReviews,
    linkedResistancePopup,
    setLinkedResistancePopup,
    stopperProgressPopup,
    setStopperProgressPopup,
    openBrainHackPopups,
  } = authContext;
  const [isBrowser, setIsBrowser] = React.useState(false);
  const [isDietPlanModalOpen, setIsDietPlanModalOpen] = React.useState(false);
  const [remainingTime, setRemainingTime] = React.useState('');
  
  const [interruptModalState, setInterruptModalState] = React.useState<{isOpen: boolean, slotName: string | null, activityType: 'interrupt' | 'distraction' | null}>({ isOpen: false, slotName: null, activityType: null });
  const [interruptDetails, setInterruptDetails] = React.useState('');
  const [interruptDuration, setInterruptDuration] = React.useState('');
  const [applyInterruptToFutureSlots, setApplyInterruptToFutureSlots] = React.useState(false);

  // State for end-of-slot modal
  const [missedSlotModalState, setMissedSlotModalState] = React.useState<{ isOpen: boolean; slotName: string; allTasks: Activity[]; incompleteTasks: Activity[] }>({ isOpen: false, slotName: '', allTasks: [], incompleteTasks: [] });


  useEffect(() => {
    document.body.classList.remove('theme-default', 'theme-matrix', 'theme-ad-dark');
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    setIsBrowser(true);
  }, []);
  
  useEffect(() => {
    const timerInterval = setInterval(() => {
        const now = new Date();
        const slotEndHour = slotEndHours[currentSlot];
        const slotEndTime = new Date(); slotEndTime.setHours(slotEndHour, 0, 0, 0);
        const diff = slotEndTime.getTime() - now.getTime();
        
        if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff / 1000 * 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            setRemainingTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        } else { 
            setRemainingTime('00:00:00'); 
        }
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [currentSlot]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Close all popups if clicking completely outside any of them
      if (!target.closest('[data-popup-id]')) {
        closeAllResourcePopups();
        if (ruleDetailPopup) closeRuleDetailPopup();
        if (habitDetailPopup) closeHabitDetailPopup();
        if (todaysDietPopup) closeTodaysDietPopup();
        return;
      }
      
      // Specifically check for Today's Diet popup
      if (todaysDietPopup && !target.closest('[data-popup-id="todays-diet-popup"]')) {
          closeTodaysDietPopup();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openPopups, generalPopups, closeAllResourcePopups, ruleDetailPopup, closeRuleDetailPopup, habitDetailPopup, closeHabitDetailPopup, todaysDietPopup, closeTodaysDietPopup]);
  
  const handleDragEnd = (event: DragEndEvent) => {
    handlePopupDragEnd(event);
    handleRulePopupDragEnd(event);
    handlePillarPopupDragEnd(event);
    handleHabitDetailPopupDragEnd(event);
    handleTaskContextPopupDragEnd(event);
    handleTodaysDietPopupDragEnd(event);
    handlePdfViewerPopupDragEnd(event);
    handleDrawingCanvasPopupDragEnd(event);
  };
  
  const selectedDateKey = format(new Date(), 'yyyy-MM-dd');
  const selectedDaySchedule = schedule[selectedDateKey] || {};

  const { promptType, lastSessionReview } = useMemo(() => {
    if (!authContext.settings.smartLogging || !currentSlot) return { promptType: null, lastSessionReview: null };
  
    if (activeFocusSession) {
      return { 
        promptType: 'focus',
        lastSessionReview: activeFocusSession.activity?.postSessionReview || null,
      };
    }
  
    const currentSlotActivities = selectedDaySchedule[currentSlot] as Activity[] | undefined;
  
    if (!currentSlotActivities || currentSlotActivities.length === 0) {
      return { promptType: 'empty', lastSessionReview: null };
    }
  
    const hasIncompleteTasks = currentSlotActivities.some(a => !a.completed);
  
    if (hasIncompleteTasks) {
      return { promptType: 'inactive', lastSessionReview: null };
    }
    
    if (!hasIncompleteTasks && remainingTime) {
        const remainingMinutes = parseDurationToMinutes(remainingTime.replace(/:\\d\\d$/, 'm'));
        if (remainingMinutes > 15) {
             return { promptType: 'completed', lastSessionReview: null };
        }
    }
  
    return { promptType: null, lastSessionReview: null };
  }, [authContext.settings.smartLogging, selectedDaySchedule, currentSlot, activeFocusSession, remainingTime]);

  const activeProjectsForPrompt = useMemo(() => {
    if (promptType !== 'completed') return [];
    
    const activeProjectIds = new Set<string>();
    const today = startOfToday();
  
    (authContext.projects || []).forEach(project => {
      if (authContext.productizationPlans && authContext.productizationPlans[project.name]) {
          activeProjectIds.add(project.id);
          return;
      }

      const isOfferedAndActive = Object.values(authContext.offerizationPlans).some(plan => 
          plan.releases?.some(release => {
              if (release.name !== project.name) return false;
              try {
                  return isAfter(parseISO(release.launchDate), today) || format(parseISO(release.launchDate), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
              } catch { return false; }
          })
      );
      if (isOfferedAndActive) {
          activeProjectIds.add(project.id);
      }
    });
  
    return (authContext.projects || []).filter(p => activeProjectIds.has(p.id));
  }, [promptType, authContext.projects, authContext.productizationPlans, authContext.offerizationPlans]);

  const handleSaveInterrupt = () => {
    const { slotName, activityType } = interruptModalState;
    if (!slotName || !activityType || !interruptDetails.trim()) {
        toast({ title: 'Invalid Input', description: 'Please provide a description and type.', variant: 'destructive' });
        return;
    }
    
    let durationMinutes = parseInt(interruptDuration, 10);
    if (applyInterruptToFutureSlots) {
        durationMinutes = 240;
    } else if (isNaN(durationMinutes) || durationMinutes <= 0) {
        toast({ title: 'Invalid Duration', description: 'Please enter a valid number of minutes.', variant: 'destructive' });
        return;
    }

    setSchedule(prev => {
        const newDaySchedule = { ...(prev[selectedDateKey] || {}) };

        if (applyInterruptToFutureSlots) {
            const currentSlotIndex = Object.keys(slotEndHours).indexOf(slotName);
            const slotsToUpdate = Object.keys(slotEndHours).slice(currentSlotIndex);
            
            slotsToUpdate.forEach(sName => {
                const newActivity: Activity = {
                    id: `${activityType}-${Date.now()}-${Math.random()}`,
                    type: activityType,
                    details: interruptDetails,
                    completed: true,
                    taskIds: [],
                    duration: durationMinutes,
                    slot: sName,
                };
                const currentActivities = Array.isArray(newDaySchedule[sName]) ? newDaySchedule[sName] as Activity[] : [];
                newDaySchedule[sName] = [...currentActivities, newActivity];
            });
            toast({ title: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} Logged`, description: `Added to all future slots.` });
        } else {
            const newActivity: Activity = {
                id: `${activityType}-${Date.now()}`,
                type: activityType,
                details: interruptDetails,
                completed: true,
                taskIds: [],
                duration: durationMinutes,
                slot: slotName,
            };
            const currentActivities = Array.isArray(newDaySchedule[slotName]) ? newDaySchedule[slotName] as Activity[] : [];
            newDaySchedule[slotName] = [...currentActivities, newActivity];
            toast({ title: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} Logged`, description: `The ${activityType} has been added to your agenda.` });
        }

        return { ...prev, [selectedDateKey]: newDaySchedule };
    });

    setInterruptDetails('');
    setInterruptDuration('');
    setApplyInterruptToFutureSlots(false);
    setInterruptModalState({ isOpen: false, slotName: null, activityType: null });
  };
  
  const handleSaveMissedSlotReview = (review: MissedSlotReview, newDistraction?: Activity) => {
    setMissedSlotReviews(prev => ({
        ...prev,
        [review.id]: review
    }));

    if (newDistraction) {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        setSchedule(prev => {
            const newDaySchedule = { ...(prev[todayKey] || {}) };
            const currentActivities = Array.isArray(newDaySchedule[newDistraction.slot]) 
                ? newDaySchedule[newDistraction.slot] as Activity[]
                : [];
            
            newDaySchedule[newDistraction.slot] = [...currentActivities, newDistraction];
            
            return { ...prev, [todayKey]: newDaySchedule };
        });
        toast({ title: 'Distraction Logged', description: 'Your unscheduled time has been logged as a distraction.' });
    }

    setMissedSlotModalState({ isOpen: false, slotName: '', incompleteTasks: [], allTasks: [] });
  };


  return (
    <DndContext onDragEnd={handleDragEnd}>
      <DefaultBackground />
      <MatrixBackground />
      <ClothBackground />
      <Header />
      {authContext.settings.allWidgetsVisible && authContext.settings.widgetVisibility.pistons && <PistonsHead />}
      <main>{children}</main>
      <Toaster />
      <BackgroundAudioPlayer />
      <FloatingVideoPlayer />
      <MindsetCategoriesCard />
      {authContext.settings.allWidgetsVisible && authContext.settings.widgetVisibility.activityDistribution && <ActivityDistributionCard />}
      {authContext.settings.allWidgetsVisible && authContext.settings.widgetVisibility.favorites && <FavoriteCards />}
      {authContext.settings.allWidgetsVisible && authContext.settings.widgetVisibility.topPriorities && <TopPrioritiesCard />}
      {authContext.settings.allWidgetsVisible && authContext.settings.widgetVisibility.goals && <GoalsWidget />}
      {authContext.settings.allWidgetsVisible && authContext.settings.widgetVisibility.brainHacks && <BrainHacksCard />}
      {authContext.settings.allWidgetsVisible && authContext.settings.widgetVisibility.ruleEquations && <RuleEquationsCard />}
      {authContext.settings.allWidgetsVisible && authContext.settings.widgetVisibility.visualizationTechniques && <VisualizationTechniquesCard />}
      {authContext.settings.allWidgetsVisible && authContext.settings.widgetVisibility.spacedRepetition && <SpacedRepetitionPopup />}
      <DietPlanModal isOpen={isDietPlanModalOpen} onOpenChange={setIsDietPlanModalOpen} />
      <StopperProgressModal 
        popupState={stopperProgressPopup}
        onOpenChange={(isOpen) => setStopperProgressPopup(prev => ({ ...prev, isOpen }))}
      />
       <FocusSessionModal
          isOpen={focusSessionModalOpen}
          onOpenChange={setFocusSessionModalOpen}
          activity={focusActivity}
          onStartSession={handleStartFocusSession}
          onLogDuration={handleLogLearning}
          initialDuration={focusDuration}
        />
      {activeFocusSession && (
          <FocusTimerPopup
            activity={activeFocusSession.activity}
            duration={activeFocusSession.duration}
            initialSecondsLeft={activeFocusSession.secondsLeft}
            onClose={() => setActiveFocusSession(null)}
            onLogTime={handleLogLearning}
            onToggleMicroSkillRepetition={authContext.handleToggleMicroSkillRepetition}
          />
        )}
      {(!isAgendaDocked && authContext.settings.widgetVisibility.agenda) && (
        <TodaysScheduleCard
            schedule={schedule}
            date={new Date()}
            activityDurations={activityDurations}
            isAgendaDocked={isAgendaDocked}
            onToggleDock={() => setIsAgendaDocked(prev => !prev)}
            onLogLearning={handleLogLearning}
            onStartWorkoutLog={handleStartWorkoutLog}
            onStartLeadGenLog={handleStartLeadGenLog}
            onToggleComplete={handleToggleComplete}
            onOpenFocusModal={onOpenFocusModal}
            onOpenTaskContext={openTaskContextPopup}
            onOpenHabitPopup={openRuleDetailPopup}
            currentSlot={currentSlot}
            onRemoveActivity={() => {}}
        />
      )}
      {authContext.settings.widgetVisibility.smartLogging && (
          <SmartLoggingPrompt 
              promptType={promptType} 
              onOpenInterruptModal={() => setInterruptModalState({ isOpen: true, slotName: currentSlot, activityType: null })} 
              activeProjects={activeProjectsForPrompt}
              currentSlot={currentSlot}
              activeFocusSession={activeFocusSession}
              lastSessionReview={lastSessionReview}
              openMindsetTechniquePopup={openMindsetTechniquePopup}
              openHabitDetailPopup={authContext.openHabitDetailPopup}
          />
      )}
      <MissedSlotModal 
          state={missedSlotModalState}
          onOpenChange={(isOpen) => setMissedSlotModalState(prev => ({ ...prev, isOpen }))}
          onSave={handleSaveMissedSlotReview}
      />
      <Dialog open={interruptModalState.isOpen} onOpenChange={(isOpen) => setInterruptModalState({ isOpen, slotName: null, activityType: null })}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Log an Interruption or Distraction</DialogTitle>
                  <DialogDescription>What pulled you away from your planned tasks?</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-1">
                      <Label>Type</Label>
                       <RadioGroup value={interruptModalState.activityType || ""} onValueChange={(value) => setInterruptModalState(prev => ({...prev, activityType: value as 'interrupt' | 'distraction'}))} className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="interrupt" id="type-interrupt" /><Label htmlFor="type-interrupt">Interruption</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="distraction" id="type-distraction" /><Label htmlFor="type-distraction">Distraction</Label></div>
                        </RadioGroup>
                  </div>
                  <div className="space-y-1">
                      <Label htmlFor="interrupt-details">Description</Label>
                      <Textarea id="interrupt-details" value={interruptDetails} onChange={(e) => setInterruptDetails(e.target.value)} placeholder="e.g., Unexpected phone call, browsing social media..." />
                  </div>
                  <div className="space-y-1">
                      <Label htmlFor="interrupt-duration">Duration (minutes)</Label>
                      <Input 
                        id="interrupt-duration" 
                        type="number" 
                        value={applyInterruptToFutureSlots ? '240' : interruptDuration} 
                        onChange={(e) => setInterruptDuration(e.target.value)} 
                        placeholder="e.g., 30"
                        disabled={applyInterruptToFutureSlots}
                      />
                  </div>
                  <div className="flex items-center space-x-2">
                      <Checkbox 
                          id="apply-all-slots" 
                          checked={applyInterruptToFutureSlots} 
                          onCheckedChange={(checked) => setApplyInterruptToFutureSlots(!!checked)}
                      />
                      <Label htmlFor="apply-all-slots" className="font-normal">Apply to all future slots for today (sets duration to 240 mins)</Label>
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setInterruptModalState({ isOpen: false, slotName: null, activityType: null })}>Cancel</Button>
                  <Button onClick={handleSaveInterrupt}>Save</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      {isBrowser && document.getElementById('global-popup-root') &&
        createPortal(
          <>
            {drawingCanvasState?.isOpen && (
              <DrawingCanvas
                isOpen={drawingCanvasState.isOpen}
                onClose={() => setDrawingCanvasState(null)}
              />
            )}
            {Object.entries(openBrainHackPopups).map(([hackId, pos]) => (
                <BrainHacksCard key={hackId} parentId={hackId} initialPosition={pos} />
            ))}
            {ResourcePopup && Array.from(openPopups.values()).map(popupState => (
              <ResourcePopup key={popupState.resourceId} popupState={popupState} />
            ))}
            {Array.from(generalPopups.values()).map(popupState => (
              <GeneralResourcePopup 
                key={popupState.resourceId} 
                popupState={popupState} 
                onClose={closeGeneralPopup}
                onUpdate={handleUpdateResource}
                onOpenNestedPopup={(resourceId, event, parentPopupState) => openGeneralPopup(resourceId, event, parentPopupState)}
              />
            ))}
             {ruleDetailPopup && (
                <RuleDetailPopupCard 
                    popupState={ruleDetailPopup}
                    onClose={closeRuleDetailPopup}
                />
            )}
             {pillarPopupState && (
                <PillarPopup
                  popupState={pillarPopupState}
                  onClose={closePillarPopup}
                />
             )}
             {linkedResistancePopup && (
                <MindsetTechniquePopup
                    popupState={linkedResistancePopup}
                    onClose={() => setLinkedResistancePopup(null)}
                />
            )}
            {Array.from(taskContextPopups.values()).map(popupState => (
                <TaskContextPopup
                    key={popupState.activityId}
                    popupState={popupState}
                />
            ))}
            {todaysDietPopup && (
                <TodaysDietPopup 
                    popupState={todaysDietPopup}
                    onClose={closeTodaysDietPopup}
                    onOpenEdit={() => {
                        closeTodaysDietPopup();
                        setIsDietPlanModalOpen(true);
                    }}
                />
            )}
            <PdfViewerPopup />
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-[65]">
              {Array.from(openPopups.values()).map(popup => {
                  if (!popup.parentId) return null;
                  const parentPopup = openPopups.get(popup.parentId);
                  if (!parentPopup) return null;
                  
                  const startX = parentPopup.x + (parentPopup.width || 0) / 2;
                  const startY = parentPopup.y + 20; // Start from a consistent vertical point
                  const endX = popup.x + (popup.width || 0) / 2;
                  const endY = popup.y + 20;
                  
                  // Simple straight line for now, can be curved later
                  const d = `M ${startX},${startY} L ${endX},${endY}`;

                  return (
                    <path 
                      key={`${popup.parentId}-${popup.resourceId}`}
                      d={d}
                      stroke="hsl(var(--primary))" 
                      strokeWidth="1"
                      strokeOpacity="0.3"
                      fill="none"
                    />
                  )
              })}
            </svg>
          </>,
          document.getElementById('global-popup-root')!
        )
      }
    </DndContext>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Dock</title>
        <meta name="description" content="Your personal dashboard for growth and productivity." />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M12 2a10 10 0 0 0-3.91 19.84c.62.12 1.63-.3 1.63-1.12 0-.54-.02-1.98-.03-3.88-2.6.56-3.15-1.08-3.32-1.57-.17-.48-.68-1.22-1.1-1.47-.35-.2-.85-.65-.01-.66.78-.01 1.35.73 1.53 1.05.9 1.55 2.35 1.1 2.93.84.09-.65.35-1.1.63-1.35-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-12.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.35-.01 2.44-.01 2.77 0 .83 1.01 1.23 1.64 1.1A10 10 0 0 0 12 2Z%22/><path d=%22M12 8.4v3.3M10.35 7.5a2.5 2.5 0 0 1 3.3 0%22/><path d=%22M6.1 12.3a6 6 0 0 1 11.8 0%22/><path d=%22M12 11.6v6.3%22/><path d=%22M9.15 15.8a3.5 3.5 0 0 1 5.7 0%22/></svg>" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22currentColor%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M12 2a10 10 0 0 0-3.91 19.84c.62.12 1.63-.3 1.63-1.12 0-.54-.02-1.98-.03-3.88-2.6.56-3.15-1.08-3.32-1.57-.17-.48-.68-1.22-1.1-1.47-.35-.2-.85-.65-.01-.66.78-.01 1.35.73 1.53 1.05.9 1.55 2.35 1.1 2.93.84.09-.65.35-1.1.63-1.35-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-12.27.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85 0 1.35-.01 2.44-.01 2.77 0 .83 1.01 1.23 1.64 1.1A10 10 0 0 0 12 2Z%22/><path d=%22M12 8.4v3.3M10.35 7.5a2.5 2.5 0 0 1 3.3 0%22/><path d=%22M6.1 12.3a6 6 0 0 1 11.8 0%22/><path d=%22M12 11.6v6.3%22/><path d=%22M9.15 15.8a3.5 3.5 0 0 1 5.7 0%22/></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("font-body antialiased")}>
        <AuthProvider>
          <AppWrapper>{children}</AppWrapper>
        </AuthProvider>
        
        <div id="global-popup-root" style={{ position: 'fixed', top: 0, left: 0, zIndex: 60 }} />
      </body>
    </html>
  );
}
