
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ListChecks, CheckCircle, BrainCircuit, Activity, Workflow, Zap, HeartPulse, Brain, PlusCircle, X, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import type { Project, PostSessionReview, ExerciseDefinition, HabitEquation, MetaRule, Resource, Stopper, Strength, DailySchedule, Activity as ActivityType, DatedWorkout } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import { Carousel } from './ui/carousel';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

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

const slotOrder: { name: string; time: string; endHour: number }[] = [
    { name: 'Late Night', time: '12am–4am', endHour: 4 },
    { name: 'Dawn', time: '4am–8am', endHour: 8 },
    { name: 'Morning', time: '8am–12pm', endHour: 12 },
    { name: 'Afternoon', time: '12pm–4pm', endHour: 16 },
    { name: 'Evening', time: '4pm–8pm', endHour: 20 },
    { name: 'Night', time: '8pm–12am', endHour: 24 }
];

const DailyReviewDialog = ({ analysis, isOpen, onOpenChange, getLoggedMinutes }: {
    analysis: any,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    getLoggedMinutes: (activity: ActivityType, dateKey: string) => number
}) => {

    const renderSlotContent = (item: any) => {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const activitiesInSlot = (analysis.schedule[todayKey]?.[item.name] as ActivityType[] || [])
            .filter(a => a.completed)
            .map(a => ({
                name: a.details,
                duration: getLoggedMinutes(a, todayKey)
            }))
            .filter(a => a.duration > 0);
        
        const historicalData = (item.historicalData || []).map((d: any) => ({
            ...d,
            date: format(parseISO(d.date), 'MMM d')
        }));
        
        return (
            <CardContent className="p-3 pt-0 text-sm space-y-3 flex-grow">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="font-bold text-lg text-green-500">{item.loggedTime}</p>
                        <p className="text-xs text-muted-foreground">Minutes Logged</p>
                    </div>
                    <div>
                        <p className="font-bold text-lg text-orange-500">{item.wastedTime}</p>
                        <p className="text-xs text-muted-foreground">Minutes Untracked</p>
                    </div>
                </div>
                {historicalData.length > 1 ? (
                    <div className="h-40 -mx-4 -mb-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="date" fontSize={10} />
                                <YAxis fontSize={10} />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="p-2 bg-background border rounded-md text-xs shadow-lg">
                                                    <p>{format(parseISO(data.fullDate), 'PPP')}</p>
                                                    <p>Time: {data.time} min</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Line type="monotone" dataKey="time" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    activitiesInSlot.length > 0 && (
                        <div className="pt-2 border-t text-xs">
                            <h4 className="font-semibold mb-1">Completed:</h4>
                            <ul>
                                {activitiesInSlot.map((act, i) => <li key={i}>{act.name} ({act.duration}m)</li>)}
                            </ul>
                        </div>
                    )
                )}
                <blockquote className="mt-4 border-l-2 pl-4 italic text-xs text-muted-foreground">
                    {item.insight}
                </blockquote>
            </CardContent>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Daily Time Analysis</DialogTitle>
                    <DialogDescription>
                        Here's a breakdown of how your time was spent today.
                    </DialogDescription>
                </DialogHeader>
                <div className="h-[60vh]">
                    <Carousel
                        items={analysis.carouselItems}
                        renderItem={(item) => (
                            <Card className="h-full flex flex-col bg-muted/30 border-0 shadow-none">
                                <CardHeader className="p-3">
                                    <CardTitle className="text-base">{item.type === 'slot' ? `🕒 ${item.name}` : `📊 Daily Summary`}</CardTitle>
                                </CardHeader>
                                {item.type === 'slot' ? renderSlotContent(item) : (
                                    <CardContent className="p-3 pt-0 text-sm space-y-3 flex-grow">
                                        <div className="grid grid-cols-2 gap-4 text-center">
                                            <div>
                                                <p className="font-bold text-lg text-green-500">{item.totalLogged}</p>
                                                <p className="text-xs text-muted-foreground">Total Minutes Logged</p>
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg text-orange-500">{item.totalWasted}</p>
                                                <p className="text-xs text-muted-foreground">Total Minutes Untracked</p>
                                            </div>
                                        </div>
                                         <blockquote className="mt-4 border-l-2 pl-4 italic text-xs text-muted-foreground">
                                            {item.insight}
                                        </blockquote>
                                    </CardContent>
                                )}
                            </Card>
                        )}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
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
    allUpskillLogs,
    allDeepWorkLogs,
    allWorkoutLogs,
    allLeadGenLogs,
    brandingLogs
  } = useAuth();
  
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const getLoggedMinutes = useCallback((activity: ActivityType, dateKey: string): number => {
    if (!activity.completed) return 0;
  
    const activityTaskIds = new Set(activity.taskIds || []);
    
    let logs: DatedWorkout[] = [];
    let durationField: 'reps' | 'weight' | null = null;
    let isWorkout = false;
  
    switch (activity.type) {
      case 'upskill':
        logs = allUpskillLogs;
        durationField = 'reps';
        break;
      case 'deepwork':
      case 'branding':
      case 'lead-generation':
        logs = activity.type === 'deepwork' ? allDeepWorkLogs : activity.type === 'branding' ? brandingLogs : allLeadGenLogs;
        durationField = 'weight'; 
        break;
      case 'workout':
        logs = allWorkoutLogs;
        isWorkout = true;
        break;
      default:
        return activity.duration || 0;
    }
  
    if (activityTaskIds.size === 0) {
      return activity.duration || 0;
    }

    const logForDay = logs.find(l => l.date === dateKey);
    if (!logForDay) return 0;
  
    return logForDay.exercises
      .filter(ex => activityTaskIds.has(ex.id))
      .reduce((sum, ex) => {
        return sum + (ex.loggedSets || []).reduce((setSum, set) => {
          if (isWorkout) {
            return setSum + 15;
          }
          return setSum + (set[durationField!] || 0);
        }, 0);
      }, 0);
  }, [allUpskillLogs, allDeepWorkLogs, allWorkoutLogs, brandingLogs, allLeadGenLogs]);
  
  const dailyAnalysis = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const todaysSchedule = schedule[todayKey] || {};

    let totalLogged = 0;

    const slotAnalyses = slotOrder.map(slot => {
        const activities = (todaysSchedule[slot.name as keyof DailySchedule] as ActivityType[]) || [];
        const loggedTime = activities.reduce((sum, task) => sum + getLoggedMinutes(task, todayKey), 0);
        
        totalLogged += loggedTime;
        const now = new Date();
        const isPastDay = isBefore(startOfDay(parseISO(todayKey)), startOfDay(now));
        const isPastSlot = isPastDay || now.getHours() >= slot.endHour;

        const wastedTime = isPastSlot ? Math.max(0, 240 - loggedTime) : 0;
        
        const plannedTaskDetails = activities.map(a => a.details).join(', ') || 'None';
        
        const historicalData = activities.length > 0 ? Object.entries(schedule)
            .map(([date, dailySchedule]) => {
                let dailyTotalForCategory = 0;
                activities.forEach(activity => {
                    const activityInHistory = (dailySchedule[slot.name as keyof DailySchedule] as ActivityType[])?.find(a => a.details === activity.details && a.type === activity.type && a.completed);
                    if (activityInHistory) {
                        dailyTotalForCategory += getLoggedMinutes(activityInHistory, date);
                    }
                });
                return { date, fullDate: date, time: dailyTotalForCategory };
            })
            .filter(item => item.time > 0)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];


        let insight = "";
        const loggedHours = Math.floor(loggedTime / 60);
        const wastedHours = Math.floor(wastedTime / 60);

        if (!isPastSlot) {
           insight = slot.name === currentSlot ? `This block is active. You have ${240 - loggedTime} min remaining to make an impact.` : "This slot is upcoming. Plan it wisely.";
        } else if (loggedTime === 0) {
          insight = "You let the whole block slip away—4 hours drifted without return.";
        } else if (loggedTime < 180) { // Less than 3 hours
          insight = `You gained ${loggedHours > 0 ? `${loggedHours} hour${loggedHours > 1 ? 's' : ''} of value` : `${loggedTime} minutes of value`}, but ${wastedHours > 0 ? `${wastedHours} hour${wastedHours > 1 ? 's' : ''}`: `${wastedTime} minutes`} were untracked.`;
        } else if (loggedTime < 240) { // 3-4 hours
          insight = "Strong effort: most of the hours worked for you, only a little escaped.";
        } else { // 4+ hours
          insight = "Full power—every minute of this block was captured. Nothing wasted.";
        }

        return {
            type: 'slot' as const,
            name: slot.name,
            time: slot.time,
            plannedTasks: plannedTaskDetails,
            loggedTime: loggedTime,
            wastedTime: wastedTime,
            insight: insight,
            historicalData: historicalData,
        };
    });

    const totalWasted = slotAnalyses.reduce((sum, s) => sum + s.wastedTime, 0);
    const summaryInsight = `You've invested ${totalLogged} minutes in focused work today${totalWasted > 0 ? `, while ${totalWasted} minutes were unallocated` : ''}. Keep the momentum going.`;

    return {
        schedule, // Pass the whole schedule object through
        carouselItems: [
            ...slotAnalyses,
            { type: 'summary' as const, totalLogged, totalWasted, insight: summaryInsight }
        ]
    };
  }, [schedule, currentSlot, getLoggedMinutes]);


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
        { label: "Full Review", onClick: () => setIsReviewOpen(true) },
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
  
  return (
    <>
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
                            <div className="h-48 -mx-2">
                              <Carousel items={dailyAnalysis.carouselItems} renderItem={(item: any) => {
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
                                                  <p className="text-xs text-muted-foreground">Minutes Untracked</p>
                                              </div>
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
                                                        <p className="text-xs text-muted-foreground">Total Minutes Untracked</p>
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
                              }} />
                            </div>
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
    <DailyReviewDialog analysis={dailyAnalysis} isOpen={isReviewOpen} onOpenChange={setIsReviewOpen} getLoggedMinutes={getLoggedMinutes} />
    </>
  );
}
