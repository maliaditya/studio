
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ListChecks, CheckCircle, BrainCircuit, Activity, Workflow, Zap, HeartPulse, Brain, PlusCircle, X, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import type { Project, PostSessionReview, ExerciseDefinition, HabitEquation, MetaRule, Resource, Stopper, Strength, DailySchedule, Activity as ActivityType } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { Carousel } from './ui/carousel';

interface SmartLoggingPromptProps {
  promptType: 'empty' | 'inactive' | 'completed' | 'focus' | null;
  activeProjects: Project[];
  onOpenInterruptModal: () => void;
  currentSlot: string;
  activeFocusSession: { activity: any } | null;
  lastSessionReview: PostSessionReview | null;
  openMindsetTechniquePopup: (techniqueId: string, event: React.MouseEvent) => void;
  openHabitDetailPopup: (habitId: string, event: React.MouseEvent) => void;
}

const EditableStep = React.memo(({ point, onUpdate, onDelete }: { point: { id: string; text: string }, onUpdate: (id: string, newText: string) => void, onDelete: (id: string) => void }) => {
  const [text, setText] = useState(point.text);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(point.text);
    if(point.text === '') {
        textareaRef.current?.focus();
    }
  }, [point.text]);
  
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleBlur = () => {
    const newText = text.trim();
    if (newText === '') {
      onDelete(point.id);
    } else if (newText !== point.text) {
      onUpdate(point.id, newText);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
    }
  }

  return (
    <div className="text-sm flex items-start gap-2 group w-full">
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="editable-placeholder w-full min-h-[1.5rem] resize-none overflow-hidden bg-transparent border-none focus-visible:ring-1 p-1"
        rows={1}
      />
    </div>
  );
});
EditableStep.displayName = 'EditableStep';


const ResistanceSection = React.memo(({ habit, isNegative, onTechniqueClick }: { habit: Resource, isNegative: boolean, onTechniqueClick: (techniqueId: string, event: React.MouseEvent) => void }) => {
    const { setResources, mindProgrammingDefinitions, handleDeleteStopper } = useAuth();
    const stoppers = isNegative ? (habit.urges || []) : (habit.resistances || []);

    const handleAddStopper = () => {
        const newStopper: Stopper = {
            id: `stopper_${Date.now()}`,
            text: '', // Start with empty text
            status: 'none',
        };
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                if (isNegative) {
                    return { ...r, urges: [...(r.urges || []), newStopper] };
                } else {
                    return { ...r, resistances: [...(r.resistances || []), newStopper] };
                }
            }
            return r;
        }));
    };
    
    const handleUpdateStopper = (stopperId: string, newText: string) => {
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                 const update = (list: Stopper[] = []) => list.map(s => s.id === stopperId ? {...s, text: newText} : s);
                 if(isNegative) return {...r, urges: update(r.urges)};
                 else return {...r, resistances: update(r.resistances)};
            }
            return r;
        }));
    };

    const handleLinkTechnique = (stopperId: string, techniqueId: string | null) => {
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                const updateStoppers = (stoppersList: Stopper[] = []) =>
                    stoppersList.map(s => 
                        s.id === stopperId ? { ...s, linkedTechniqueId: techniqueId === null ? undefined : techniqueId } : s
                    );

                if (isNegative) {
                    return { ...r, urges: updateStoppers(r.urges) };
                } else {
                    return { ...r, resistances: updateStoppers(r.resistances) };
                }
            }
            return r;
        }));
    };
    
    const handleStopperStatusChange = (e: React.PointerEvent, stopperId: string, status: Stopper['status']) => {
        e.stopPropagation();
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                const update = (list: Stopper[] = []) => list.map(s => s.id === stopperId ? { ...s, status: s.status === status ? 'none' : status } : s);
                if (isNegative) return { ...r, urges: update(r.urges) };
                else return { ...r, resistances: update(r.resistances) };
            }
            return r;
        }));
    };
    
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-xs text-muted-foreground">{isNegative ? 'Urges' : 'Resistance'}</h4>
              <div className="flex items-center">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddStopper}><PlusCircle className="h-4 w-4 text-green-500" /></Button>
              </div>
            </div>
            {stoppers.length > 0 && (
                <ul className="text-xs space-y-1">
                    {stoppers.map(s => {
                        const linkedTechnique = mindProgrammingDefinitions.find(t => t.id === s.linkedTechniqueId);
                        return (
                            <li key={s.id} className="border-t pt-2 group/stopper">
                                <div className="flex items-center gap-1">
                                    <EditableStep point={s} onUpdate={(id, text) => handleUpdateStopper(id, text)} onDelete={() => handleDeleteStopper(habit.id, s.id)} />
                                    <div className="flex-shrink-0 flex items-center opacity-0 group-hover/stopper:opacity-100 transition-opacity">
                                       <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                             <Button variant="ghost" size="icon" className="h-6 w-6">
                                                  <PlusCircle className="h-3.5 w-3.5 text-blue-500"/>
                                              </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent className="w-56 z-[150]">
                                              {mindProgrammingDefinitions.map(tech => (
                                                  <DropdownMenuItem key={tech.id} onSelect={() => handleLinkTechnique(s.id, tech.id)}>
                                                      {tech.name}
                                                  </DropdownMenuItem>
                                              ))}
                                              <DropdownMenuItem onSelect={() => handleLinkTechnique(s.id, null)} className="text-destructive">
                                                  Unlink
                                              </DropdownMenuItem>
                                          </DropdownMenuContent>
                                      </DropdownMenu>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteStopper(habit.id, s.id)}>
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                </div>
                                {linkedTechnique ? (
                                    <div className="mt-1 pl-6">
                                        <Badge 
                                            variant="secondary" 
                                            className="font-normal truncate cursor-pointer hover:ring-1 hover:ring-primary"
                                            onClick={(e) => onTechniqueClick(linkedTechnique.id, e)}
                                        >
                                            <span className="truncate">{linkedTechnique.name}</span>
                                        </Badge>
                                    </div>
                                ) : null}
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    );
});
ResistanceSection.displayName = 'ResistanceSection';

const TruthSection = React.memo(({ habit }: { habit: Resource }) => {
    const { setResources, handleDeleteStrength } = useAuth();

    const handleAddStrength = () => {
        const newStrength: Strength = {
            id: `strength_${Date.now()}`,
            text: '',
        };
        setResources(prev => prev.map(r => {
            if (r.id === habit.id) {
                return { ...r, strengths: [...(r.strengths || []), newStrength] };
            }
            return r;
        }));
    };
    
    const handleUpdateStrength = (strengthId: string, newText: string) => {
      setResources(prev => prev.map(r => {
          if (r.id === habit.id) {
              return {...r, strengths: (r.strengths || []).map(s => s.id === strengthId ? {...s, text: newText} : s)}
          }
          return r;
      }));
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-xs text-muted-foreground">Truths / Reinforcements</h4>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddStrength}><PlusCircle className="h-4 w-4 text-green-500" /></Button>
            </div>
            {(habit.strengths || []).length > 0 && (
                <ul className="text-xs list-disc list-inside space-y-1">
                    {(habit.strengths || []).map(s => (
                       <EditableStep key={s.id} point={s} onUpdate={(id, text) => handleUpdateStrength(id, text)} onDelete={() => handleDeleteStrength(habit.id, s.id)} />
                    ))}
                </ul>
            )}
        </div>
    );
});
TruthSection.displayName = 'TruthSection';

const slotOrder: (keyof DailySchedule)[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];

const parseDurationToMinutes = (durationStr: string | undefined): number => {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    if (/^\d+$/.test(durationStr.trim())) {
        return parseInt(durationStr.trim(), 10);
    }
    let totalMinutes = 0;
    const hourMatch = durationStr.match(/(\d+)\s*h/);
    if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
    const minMatch = durationStr.match(/(\d+)\s*m/);
    if (minMatch) totalMinutes += parseInt(minMatch[1], 10) * 60;
    return totalMinutes;
};


export function SmartLoggingPrompt({ 
    promptType, 
    activeProjects, 
    onOpenInterruptModal, 
    currentSlot, 
    activeFocusSession, 
    lastSessionReview,
    openMindsetTechniquePopup,
    openHabitDetailPopup,
}: SmartLoggingPromptProps) {
  const router = useRouter();
  const { 
    pillarEquations,
    metaRules,
    habitCards,
    mechanismCards,
    schedule,
    activityDurations,
  } = useAuth();
  
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const allEquations = React.useMemo(() => Object.values(pillarEquations).flat(), [pillarEquations]);

  const focusContext = React.useMemo(() => {
    if (!activeFocusSession?.activity?.habitEquationIds) return null;
    
    const habitIds = activeFocusSession.activity.habitEquationIds;
    if (habitIds.length === 0) return null;
    
    const uniqueHabitIds = [...new Set(habitIds)];

    const habitDetails = uniqueHabitIds.map(habitId => {
        const habit = habitCards.find(h => h.id === habitId);
        if (!habit) return null;
        
        const positiveMechanism = mechanismCards.find(m => m.id === habit.newResponse?.resourceId);
        const negativeMechanism = mechanismCards.find(m => m.id === habit.response?.resourceId);

        return {
            habit,
            positiveMechanism,
            negativeMechanism,
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
    
    return habitDetails.length > 0 ? habitDetails : null;
  }, [activeFocusSession, allEquations, metaRules, habitCards, mechanismCards]);
  
  const dailyAnalysis = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const todaysSchedule = schedule[todayKey] || {};
    const slotTimes: Record<string, string> = { 'Late Night': '12am–4am', 'Dawn': '4am–8am', 'Morning': '8am–12pm', 'Afternoon': '12pm–4pm', 'Evening': '4pm–8pm', 'Night': '8pm–12am' };
    
    const slotAnalyses = slotOrder.map(slotName => {
        const activities = (todaysSchedule[slotName] as ActivityType[]) || [];
        const loggedTime = activities
            .filter(a => a.completed)
            .reduce((sum, task) => {
                const duration = parseDurationToMinutes(activityDurations[task.id]);
                return sum + duration;
            }, 0);
        
        const now = new Date();
        const slotEndHour = { 'Late Night': 4, 'Dawn': 8, 'Morning': 12, 'Afternoon': 16, 'Evening': 20, 'Night': 24 }[slotName] || 0;
        const slotEndTime = new Date();
        slotEndTime.setHours(slotEndHour, 0, 0, 0);

        const isPast = now > slotEndTime;
        const isCurrent = slotName === currentSlot;
        
        const wastedTime = isPast ? Math.max(0, 240 - loggedTime) : 0;
        const freeTime = isCurrent ? Math.max(0, 240 - loggedTime) : 0;
        
        let insight = "";
        if (isPast) {
            insight = `You captured ${loggedTime} min of value, but ${wastedTime} min drifted away. Imagine if you had used even 2 of those hours for sleep or upskill—you’d have felt fresher and moved closer to your goals.`;
        } else if (slotName === currentSlot) {
            insight = `This block is active. You have ${freeTime} min remaining to make an impact.`;
        } else {
            insight = "This slot is upcoming. Plan it wisely.";
        }

        return {
            type: 'slot' as const,
            name: slotName,
            time: slotTimes[slotName],
            plannedTasks: (activities.map(a => a.details).join(', ') || 'None'),
            loggedTime,
            wastedTime,
            insight,
        };
    });

    const totalLogged = slotAnalyses.reduce((sum, s) => sum + s.loggedTime, 0);
    const totalWasted = slotAnalyses.reduce((sum, s) => sum + s.wastedTime, 0);
    const summaryInsight = `You invested in ${totalLogged} minutes of focused work, but let go of ${totalWasted} minutes. Turning just 1 of those wasted hours into focus daily compounds into 7 hours a week—a massive shift in progress.`;

    return {
        carouselItems: [
            ...slotAnalyses,
            { type: 'summary' as const, totalLogged, totalWasted, insight: summaryInsight }
        ]
    };
  }, [schedule, activityDurations, currentSlot]);


  const prompts = {
    empty: {
      icon: <Lightbulb className="h-6 w-6 text-yellow-500" />,
      title: "Your current slot is empty.",
      description: "What's your focus right now? Let's get something scheduled.",
      actions: [
        { label: "Add Task to Agenda", onClick: () => router.push('/my-plate') },
        { label: "Log Interruption", onClick: onOpenInterruptModal, variant: "secondary" },
      ]
    },
    inactive: {
      icon: <ListChecks className="h-6 w-6 text-blue-500" />,
      title: "Today's Analysis",
      description: "You have tasks scheduled. Ready to start a focus session?",
       actions: [
        { label: "View Agenda", onClick: () => router.push('/my-plate') },
       ]
    },
    completed: {
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
      title: "Great work! You have time left in this slot.",
      description: "What's next? You could tackle a task for an active project.",
      actions: [
        { label: "Log Interruption", onClick: onOpenInterruptModal, variant: "secondary" },
      ]
    },
    focus: {
        icon: <BrainCircuit className="h-6 w-6 text-purple-500" />,
        title: "Focus Session Active",
        description: "Visualize what you want to do, then your actions will follow.",
        actions: []
    }
  };

  const currentPrompt = promptType ? prompts[promptType] : null;

  if (!currentPrompt) return null;

  const renderCarouselItem = (item: any) => {
    if (item.type === 'slot') {
        return (
          <Card className="h-full flex flex-col bg-muted/30 border-0 shadow-none">
            <CardHeader className="p-3">
              <CardTitle className="text-base">🕒 {item.name} <span className="text-sm font-normal text-muted-foreground">({item.time})</span></CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 text-sm space-y-3 flex-grow">
              <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                      <p className="font-bold text-lg text-green-500">{item.loggedTime}</p>
                      <p className="text-xs text-muted-foreground">Minutes Logged</p>
                  </div>
                  <div>
                      <p className="font-bold text-lg text-orange-500">{item.wastedTime}</p>
                      <p className="text-xs text-muted-foreground">Minutes Wasted</p>
                  </div>
              </div>
              <div>
                  <p className="font-semibold text-xs text-foreground">Planned:</p>
                  <p className="text-xs text-muted-foreground">{item.plannedTasks}</p>
              </div>
              <blockquote className="mt-4 border-l-2 pl-4 italic text-xs text-muted-foreground">
                  {item.insight}
              </blockquote>
            </CardContent>
          </Card>
        );
    }
    if (item.type === 'summary') {
        return (
            <Card className="h-full flex flex-col justify-between bg-muted/30 border-0 shadow-none">
                <CardHeader className="p-3">
                    <CardTitle className="text-base">📊 Daily Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 text-sm space-y-3">
                     <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <p className="font-bold text-lg text-green-500">{item.totalLogged}</p>
                            <p className="text-xs text-muted-foreground">Total Minutes Logged</p>
                        </div>
                        <div>
                            <p className="font-bold text-lg text-orange-500">{item.totalWasted}</p>
                            <p className="text-xs text-muted-foreground">Total Minutes Wasted</p>
                        </div>
                    </div>
                     <blockquote className="mt-4 border-l-2 pl-4 italic text-xs text-muted-foreground">
                        {item.insight}
                    </blockquote>
                </CardContent>
            </Card>
        )
    }
    return null;
  }

  return (
    <AnimatePresence>
      {currentPrompt && (
        <div className="fixed bottom-24 right-6 z-50 max-w-sm w-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg flex flex-col items-start gap-3"
            >
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex-shrink-0">{currentPrompt.icon}</div>
                    <h3 className="font-semibold text-foreground">{currentPrompt.title}</h3>
                </div>
                
                <div className="w-full space-y-3 flex-grow min-h-0 flex flex-col">
                    <div className="flex-grow">
                        {promptType === 'inactive' ? (
                            <Carousel items={dailyAnalysis.carouselItems} renderItem={renderCarouselItem} />
                        ) : (
                            <p className="text-sm text-muted-foreground w-full flex-shrink-0">{currentPrompt.description}</p>
                        )}
                        {promptType === 'completed' && activeProjects.length > 0 && (
                            <div className="w-full">
                                <p className="text-xs text-left font-semibold mb-2">Active Projects:</p>
                                <div className="flex flex-wrap gap-2">
                                    {activeProjects.map(p => (
                                        <Button key={p.id} size="sm" variant="outline" onClick={() => router.push(`/deep-work?projectId=${p.id}`)}>
                                            {p.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {promptType === 'focus' && focusContext && (
                          <ScrollArea className="h-64 pr-2">
                              {focusContext.map(({ habit, positiveMechanism, negativeMechanism }) => (
                                  <div key={habit.id} className="space-y-3">
                                      <div className="font-semibold flex items-center gap-2 cursor-pointer" onClick={(e) => openHabitDetailPopup(habit.id, e)}>
                                      <Zap className="h-4 w-4 text-yellow-500"/> Habit: <span className="text-primary">{habit.name}</span>
                                      </div>
                                      <div className="grid grid-cols-1 gap-3">
                                          {positiveMechanism && (
                                              <Card className="bg-green-900/10 border-green-500/30">
                                                  <CardHeader className="p-2">
                                                      <CardTitle className="text-sm text-green-600 dark:text-green-400">{positiveMechanism.name}</CardTitle>
                                                  </CardHeader>
                                                  <CardContent className="p-2 pt-0 text-xs text-muted-foreground space-y-2">
                                                    <p><span className="font-semibold text-foreground">New Response:</span> {habit.newResponse?.text}</p>
                                                    <ResistanceSection habit={habit} isNegative={false} onTechniqueClick={openMindsetTechniquePopup} />
                                                    <TruthSection habit={habit} />
                                                  </CardContent>
                                              </Card>
                                          )}
                                          {negativeMechanism && (
                                              <Card className="bg-red-900/10 border-red-500/30">
                                                  <CardHeader className="p-2">
                                                      <CardTitle className="text-sm text-red-600 dark:text-red-400">{negativeMechanism.name}</CardTitle>
                                                  </CardHeader>
                                                  <CardContent className="p-2 pt-0 text-xs text-muted-foreground space-y-2">
                                                    <p><span className="font-semibold text-foreground">Response:</span> {habit.response?.text}</p>
                                                    <ResistanceSection habit={habit} isNegative={true} onTechniqueClick={openMindsetTechniquePopup} />
                                                  </CardContent>
                                              </Card>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </ScrollArea>
                        )}
                    </div>
                    <div className="flex gap-2 w-full flex-shrink-0 pt-2">
                        {currentPrompt.actions.map(action => (
                            <Button key={action.label} size="sm" variant={action.variant as any} onClick={action.onClick} className="flex-1">
                                {action.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
