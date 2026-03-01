
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { BackgroundAudioPlayer } from '@/components/BackgroundAudioPlayer';
import { MatrixBackground } from '@/components/MatrixBackground';
import { DefaultBackground } from '@/components/DefaultBackground';
import { ClothBackground } from '@/components/ClothBackground';
import { FloatingVideoPlayer } from '@/components/FloatingVideoPlayer';
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { GeneralResourcePopup } from '@/components/GeneralResourcePopup';
import { RuleDetailPopupCard } from '@/components/HabitDetailPopup';
import { TaskContextPopup } from '@/components/TaskContextPopup';
import { FocusTimerPopup } from '@/components/FocusTimerPopup';
import { TodaysDietPopup } from '@/components/TodaysDietPopup';
import { DietPlanModal } from '@/components/DietPlanModal';
import { TodaysScheduleCard } from '@/components/TodaysScheduleCard';
import { MissedSlotModal } from '@/components/MissedSlotModal';
import { InterruptModal } from '@/components/InterruptModal';
import { IntentionDetailPopup } from '@/components/IntentionDetailModal';
import { format, startOfToday, isAfter, parseISO, isBefore } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Project, Activity, MissedSlotReview, SlotName } from '@/types/workout';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { StopperProgressModal } from '@/components/StopperProgressModal';
import { PillarPopup } from '@/components/PillarPopup';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import { MindsetCategoriesCard } from '@/components/MindsetCategoriesCard';
import dynamic from 'next/dynamic';
import { FocusSessionModal } from '@/components/FocusSessionModal';
import { usePathname } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { trackEngagementMetric } from '@/lib/metricsClient';

const PdfViewerPopup = dynamic(() => import('@/components/PdfViewerPopup'), {
  ssr: false,
});
const Header = dynamic(() => import('@/components/Header').then((mod) => mod.Header), {
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
    openGeneralPopup, handleUpdateResource, closeGeneralPopup, navigateGeneralPopupPath, updateGeneralPopupSize,
    ruleDetailPopup, openRuleDetailPopup, closeRuleDetailPopup, handleRulePopupDragEnd,
    pillarPopupState, closePillarPopup, handlePillarPopupDragEnd,
    habitDetailPopup, openHabitDetailPopup, closeHabitDetailPopup, handleHabitDetailPopupDragEnd,
    taskContextPopups, closeTaskContextPopup, handleTaskContextPopupDragEnd, openTaskContextPopup,
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
    onOpenFocusModal,
    focusActivity,
    setFocusActivity,
    focusSessionModalOpen,
    setFocusSessionModalOpen,
    onLogDuration,
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
    openHabitDetailPopup: openHabitPopup,
  } = authContext;
  const [isBrowser, setIsBrowser] = React.useState(false);
  const [isDietPlanModalOpen, setIsDietPlanModalOpen] = React.useState(false);
  const [remainingTime, setRemainingTime] = React.useState<string | null>(null);
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isWidgetSuppressedRoute = pathname === '/' || pathname === '/login';
  const shouldShowAgendaWidget = !isWidgetSuppressedRoute;
  
  const [interruptModalState, setInterruptModalState] = useState<{isOpen: boolean, slotName: string | null, activityType: 'interrupt' | 'distraction' | null}>({ isOpen: false, slotName: null, activityType: null });
  const [interruptDetails, setInterruptDetails] = useState('');
  const [interruptDuration, setInterruptDuration] = useState('');
  const [applyInterruptToFutureSlots, setApplyInterruptToFutureSlots] = useState(false);

  // State for end-of-slot modal
  const [missedSlotModalState, setMissedSlotModalState] = React.useState<{ isOpen: boolean; slotName: string; allTasks: Activity[]; incompleteTasks: Activity[] }>({ isOpen: false, slotName: '', allTasks: [], incompleteTasks: [] });

  const prevSlotRef = useRef<string | null>(null);

  useEffect(() => {
      document.body.classList.remove('theme-default', 'theme-matrix', 'theme-ad-dark');
      document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
      setIsBrowser(true);
  }, []);

  useEffect(() => {
    const username = authContext.currentUser?.username?.trim().toLowerCase();
    if (!username) return;

    const dayKey = format(new Date(), 'yyyy-MM-dd');
    const storageKey = `metrics_engagement_${dayKey}_${username}`;

    try {
      if (localStorage.getItem(storageKey)) return;
    } catch {
      return;
    }

    let isCancelled = false;
    const sendEngagementSignal = async () => {
      try {
        const response = await trackEngagementMetric(username, new Date().toISOString());
        if (!response.ok || isCancelled) return;
        localStorage.setItem(storageKey, '1');
      } catch {
        // Metrics should never block app usage.
      }
    };

    void sendEngagementSignal();
    return () => {
      isCancelled = true;
    };
  }, [authContext.currentUser?.username]);

  useEffect(() => {
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      const first = args[0];
      if (typeof first === "string" && first.includes("ResponsiveContainer") && first.includes("width(") && first.includes("height(")) {
        return;
      }
      originalWarn(...args);
    };
    return () => {
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
      if (!currentSlot) return;
      const timerInterval = setInterval(() => {
          const now = new Date();
          const slotEndHour = slotEndHours[currentSlot];
          const slotEndTime = new Date(); slotEndTime.setHours(slotEndHour, 0, 0, 0);
          
          if (now > slotEndTime) {
            slotEndTime.setDate(slotEndTime.getDate() + 1);
          }

          const diff = slotEndTime.getTime() - now.getTime();
          
          if (diff > 0) {
              const hours = Math.floor(diff / (1000 * 60 * 60));
              const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((diff % (1000 * 60)) / 1000);
              setRemainingTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
          } else { 
              setRemainingTime('00:00:00'); 
          }
      }, 1000);
      return () => clearInterval(timerInterval);
  }, [currentSlot]);
  
  useEffect(() => {
    if (prevSlotRef.current && prevSlotRef.current !== currentSlot && authContext.settings.smartLogging) {
        const slotToReview = prevSlotRef.current;
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const daySchedule = schedule[todayKey] || {};
        const slotActivities = (daySchedule[slotToReview as keyof DailySchedule] as Activity[]) || [];
        const reviewKey = `${todayKey}-${slotToReview}`;
        
        const hasBeenReviewed = missedSlotReviews[reviewKey] && missedSlotReviews[reviewKey].reason;
        
        const snoozedUntil = missedSlotReviews[reviewKey]?.snoozedUntil;
        const isSnoozed = snoozedUntil && snoozedUntil > Date.now();

        if (slotActivities.length > 0 && !hasBeenReviewed && !isSnoozed) {
            const incompleteTasks = slotActivities.filter(a => !a.completed);
            if (incompleteTasks.length > 0) {
                setMissedSlotModalState({ isOpen: true, slotName: slotToReview, allTasks: slotActivities, incompleteTasks });
            }
        }
    }
    prevSlotRef.current = currentSlot;
}, [currentSlot, authContext.settings.smartLogging, schedule, missedSlotReviews]);


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
        const timeParts = remainingTime.split(':').map(Number);
        if (timeParts.length === 3) {
            const remainingMinutes = timeParts[0] * 60 + timeParts[1];
            if (remainingMinutes > 15) {
                return { promptType: 'completed', lastSessionReview: null };
            }
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
      {pathname !== '/canvas' && pathname !== '/' && <Header />}

      {pathname !== '/canvas' && (
        <>
          <main>{children}</main>
          <Toaster />
          <BackgroundAudioPlayer />
          <FloatingVideoPlayer />
          <MindsetCategoriesCard />
          <DietPlanModal isOpen={isDietPlanModalOpen} onOpenChange={setIsDietPlanModalOpen} />
          <StopperProgressModal 
            popupState={stopperProgressPopup}
            onOpenChange={(isOpen) => setStopperProgressPopup(prev => ({ ...prev, isOpen }))}
          />
          {activeFocusSession && (
              <FocusTimerPopup
                activity={activeFocusSession.activity}
                duration={activeFocusSession.duration}
                initialSecondsLeft={activeFocusSession.secondsLeft}
                onClose={() => setActiveFocusSession(null)}
                onLogDuration={onLogDuration}
                onToggleMicroSkillRepetition={authContext.handleToggleMicroSkillRepetition}
              />
            )}
          <FocusSessionModal
            isOpen={focusSessionModalOpen}
            onOpenChange={setFocusSessionModalOpen}
            activity={focusActivity}
            onStartSession={handleStartFocusSession}
            onLogDuration={onLogDuration}
            initialDuration={focusDuration}
          />
          {(shouldShowAgendaWidget && !isAgendaDocked && !isMobile) && (
            <TodaysScheduleCard
                date={new Date()}
                schedule={schedule}
                activityDurations={activityDurations}
                isAgendaDocked={isAgendaDocked}
                onToggleDock={() => setIsAgendaDocked(prev => !prev)}
                onOpenFocusModal={onOpenFocusModal}
                onOpenHabitPopup={openHabitPopup}
                currentSlot={currentSlot}
            />
          )}
        </>
      )}

      {pathname === '/canvas' && children}
      
      <MissedSlotModal 
          state={missedSlotModalState}
          onOpenChange={(isOpen) => setMissedSlotModalState(prev => ({ ...prev, isOpen }))}
          onSave={handleSaveMissedSlotReview}
      />
      <InterruptModal
        isOpen={interruptModalState.isOpen}
        onOpenChange={(isOpen) => setInterruptModalState(prev => ({...prev, isOpen}))}
        slotName={interruptModalState.slotName}
        onSave={() => handleSaveInterrupt()}
      />
      {isBrowser && document.getElementById('global-popup-root') &&
        createPortal(
          <>
            {drawingCanvasState?.isOpen && pathname !== '/canvas' && (
              <DrawingCanvas
                isOpen={drawingCanvasState.isOpen}
                onClose={() => setDrawingCanvasState(null)}
              />
            )}
            {Object.entries(openBrainHackPopups).map(([hackId, pos]) => (
                <BrainHacksCard key={hackId} parentId={hackId} initialPosition={pos} />
            ))}
            {Array.from(intentionPopups.values()).map(popupState => (
              <IntentionDetailPopup key={popupState.resourceId} popupState={popupState} onClose={closeIntentionPopup} />
            ))}
            {ResourcePopup && Array.from(openPopups.values()).map(popupState => (
              <ResourcePopup key={popupState.resourceId} popupState={popupState} />
            ))}
            {Array.from(generalPopups.entries()).map(([popupId, popupState]) => (
              <GeneralResourcePopup 
                key={popupId}
                popupState={popupState} 
                onClose={closeGeneralPopup}
                onNavigatePath={navigateGeneralPopupPath}
                onUpdate={handleUpdateResource}
                onOpenNestedPopup={(resourceId, event, parentPopupState) => openGeneralPopup(resourceId, event, parentPopupState)}
                onResize={updateGeneralPopupSize}
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
            {taskContextPopups && Array.from(taskContextPopups.values()).map(popupState => (
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
            {authContext.pdfViewerState?.isOpen && <PdfViewerPopup />}
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
