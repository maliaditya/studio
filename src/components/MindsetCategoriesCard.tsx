
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from './ui/scroll-area';
import { Brain, PlusCircle, Trash2, GitBranch, Link as LinkIcon, Globe, Play, History, LineChart, Workflow, ChevronLeft, Calendar as CalendarIcon, X, Dumbbell, BookOpenCheck, Briefcase, ClipboardList, ClipboardCheck, Share2, Magnet, CheckSquare, Utensils, AlertCircle, Wind, Timer, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { BrainHack, Stopper, MindsetCard, MindsetPoint, Activity, SlotName } from '@/types/workout';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { format, isSameDay, isBefore, subDays, startOfDay, differenceInDays, parseISO, eachDayOfInterval, isAfter, getDay, differenceInMonths, addDays } from 'date-fns';
import { LinkTechniqueModal } from './LinkTechniqueModal';
import { ChartContainer } from './ui/chart';
import { LineChart as RechartsLineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, ResponsiveContainer } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


const EditableBrainHack = React.memo(({ hack, onUpdate, onDelete, onOpenNested, onOpenLink, onEditLinkText }: {
    hack: BrainHack;
    onUpdate: (id: string, newText: string) => void;
    onDelete: (id: string) => void;
    onOpenNested: (hack: BrainHack, event: React.MouseEvent) => void;
    onOpenLink: (url: string) => void;
    onEditLinkText: (hack: BrainHack) => void;
}) => {
    const [text, setText] = useState(hack.text);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFetching, setIsFetching] = useState(false);
    const { toast } = useToast();

    const isMultiLine = text.includes('\n') || text.length > 50;

    useEffect(() => {
        if (hack.text === "New Brain Hack" || hack.text === "https://example.com") {
            inputRef.current?.select();
        }
    }, [hack.text]);
    
    useEffect(() => {
        setText(hack.type === 'link' ? (hack.link || '') : hack.text);
    }, [hack.type, hack.text, hack.link]);

    const handleBlur = async () => {
        const newText = text.trim();
        if (newText === '') {
            onDelete(hack.id);
            return;
        }

        if (hack.type === 'link' && newText !== hack.link) {
            setIsFetching(true);
            onUpdate(hack.id, newText);
            setIsFetching(false);
        } else if (hack.type === 'hack' && newText !== hack.text) {
            onUpdate(hack.id, newText);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            handleBlur();
            e.preventDefault();
        } else if (e.key === 'Escape') {
            setText(hack.type === 'link' ? (hack.link || '') : hack.text);
            e.preventDefault();
            (e.target as HTMLElement).blur();
        }
    };

    if (hack.type === 'link' && !isFetching && hack.displayText) {
        return (
             <div className="flex items-center justify-between group p-2 rounded-md bg-muted/50 hover:bg-muted/80 w-full">
                <Globe className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                <button 
                    className="text-sm font-medium w-full text-left truncate text-primary hover:underline"
                    onClick={() => onOpenLink(hack.link!)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        onEditLinkText(hack);
                    }}
                >
                    {hack.displayText || hack.link}
                </button>
                <div className="flex items-center flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onDelete(hack.id); }}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                </div>
            </div>
        )
    }

    const commonProps = {
        value: text,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(e.target.value),
        onBlur: handleBlur,
        onKeyDown: handleKeyDown,
        className: "h-auto text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring w-full resize-none overflow-hidden p-1 flex-grow min-w-0",
        placeholder: hack.type === 'link' ? 'https://...' : 'New hack...',
    };

    return (
        <div className="flex items-center justify-between group p-2 rounded-md bg-muted/50 hover:bg-muted/80 w-full">
            <div className="flex items-center gap-2 flex-grow min-w-0">
                {isFetching ? (
                     <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                ) : (
                    hack.type === 'link' ? <LinkIcon className="h-4 w-4 text-blue-500 flex-shrink-0" /> : null
                )}
                {isMultiLine ? (
                    <Textarea {...commonProps} rows={1} autoFocus />
                ) : (
                    <Input {...commonProps} ref={inputRef} />
                )}
            </div>
            <div className="flex items-center flex-shrink-0">
                {hack.type !== 'link' && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => onOpenNested(hack, e)}>
                        <GitBranch className="h-3 w-3 text-blue-500" />
                    </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onDelete(hack.id); }}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
            </div>
        </div>
    );
});
EditableBrainHack.displayName = 'EditableBrainHack';

const activityIcons: Record<ActivityType, React.ReactNode> = {
    workout: <Dumbbell className="h-4 w-4" />,
    upskill: <BookOpenCheck className="h-4 w-4" />,
    deepwork: <Briefcase className="h-4 w-4" />,
    planning: <ClipboardList className="h-4 w-4" />,
    tracking: <ClipboardCheck className="h-4 w-4" />,
    branding: <Share2 className="h-4 w-4" />,
    'lead-generation': <Magnet className="h-4 w-4" />,
    essentials: <CheckSquare className="h-4 w-4" />,
    nutrition: <Utensils className="h-4 w-4" />,
    interrupt: <AlertCircle className="h-4 w-4 text-red-500" />,
    distraction: <Wind className="h-4 w-4 text-yellow-500" />,
    mindset: <Brain className="h-4 w-4" />,
    pomodoro: <Timer className="h-4 w-4" />,
};


const HourlyResistanceLogDialog = ({ isOpen, onOpenChange, allLinkedResistances }: { 
    isOpen: boolean; 
    onOpenChange: (isOpen: boolean) => void;
    allLinkedResistances: { habitId: string; habitName: string; stopper: Stopper; isUrge: boolean; mechanismName?: string; }[];
}) => {
    const [position, setPosition] = useState(() => ({
        x: typeof window !== 'undefined' ? window.innerWidth / 2 - 420 : 0,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 - 260 : 0,
    }));
    const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
    const [filter, setFilter] = useState<'all' | 'today' | 'lastX'>('lastX');
    const [lastXDays, setLastXDays] = useState(5);

    useEffect(() => {
        if (!isOpen) return;
        setPosition({
            x: window.innerWidth / 2 - 420,
            y: window.innerHeight / 2 - 260,
        });
    }, [isOpen]);
    
    const chartData = React.useMemo(() => {
        const log = Array.from({ length: 24 }, (_, i) => {
            const startAmPm = i < 12 ? 'AM' : 'PM';
            const hourLabel = i % 12 === 0 ? 12 : i % 12;
            
            return {
                hour: i,
                name: `${hourLabel}${startAmPm}`,
                urges: 0,
                resistances: 0,
                urgeDetails: [] as string[],
                resistanceDetails: [] as string[],
            };
        });

        const today = startOfDay(new Date());
        const filterStartDate = filter === 'today' ? today : subDays(today, lastXDays - 1);
        
        allLinkedResistances.forEach(link => {
            if (link.stopper.timestamps) {
                link.stopper.timestamps.forEach(ts => {
                    const eventDate = new Date(ts);
                    
                    if (filter === 'all' || (filter === 'today' && isSameDay(eventDate, today)) || (filter === 'lastX' && eventDate >= filterStartDate)) {
                        const hour = eventDate.getHours();
                        if (link.isUrge) {
                            log[hour].urges++;
                            log[hour].urgeDetails.push(link.stopper.text);
                        } else {
                            log[hour].resistances++;
                            log[hour].resistanceDetails.push(link.stopper.text);
                        }
                    }
                });
            }
        });
        return log;
    }, [allLinkedResistances, filter, lastXDays]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const hourData = chartData.find(d => d.name === label);
            return (
                <div className="p-2 bg-background border rounded-md text-xs shadow-lg max-w-sm">
                    <p className="font-bold text-lg">{label}</p>
                    {payload.map((pld: any) => (
                        <div key={pld.dataKey} style={{ color: pld.color }}>
                            <strong>{pld.name}:</strong> {pld.value}
                        </div>
                    ))}
                    {hourData?.urgeDetails.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                            <p className="font-semibold">Urges:</p>
                            <ul className="list-disc list-inside">
                                {hourData.urgeDetails.map((d, i) => <li key={`urge-${i}`}>{d}</li>)}
                            </ul>
                        </div>
                    )}
                    {hourData?.resistanceDetails.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                            <p className="font-semibold">Resistances:</p>
                             <ul className="list-disc list-inside">
                                {hourData.resistanceDetails.map((d, i) => <li key={`res-${i}`}>{d}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] pointer-events-none">
            <div className="pointer-events-auto">
                <div
                    className="fixed w-[840px] max-w-[95vw]"
                    style={{ top: position.y, left: position.x }}
                >
                    <div className="shadow-2xl border border-white/10 bg-[#151517]/95 backdrop-blur rounded-2xl overflow-hidden">
                        <div
                            className="p-4 border-b border-white/10 flex items-start justify-between cursor-grab select-none"
                            onPointerDown={(event) => {
                                dragState.current = {
                                    startX: event.clientX,
                                    startY: event.clientY,
                                    originX: position.x,
                                    originY: position.y,
                                };
                                const handlePointerMove = (e: PointerEvent) => {
                                    if (!dragState.current) return;
                                    const dx = e.clientX - dragState.current.startX;
                                    const dy = e.clientY - dragState.current.startY;
                                    setPosition({
                                        x: dragState.current.originX + dx,
                                        y: dragState.current.originY + dy,
                                    });
                                };
                                const handlePointerUp = () => {
                                    dragState.current = null;
                                    window.removeEventListener('pointermove', handlePointerMove);
                                    window.removeEventListener('pointerup', handlePointerUp);
                                };
                                window.addEventListener('pointermove', handlePointerMove);
                                window.addEventListener('pointerup', handlePointerUp);
                            }}
                        >
                            <div>
                                <div className="text-base font-semibold">Hourly Resistance Log</div>
                                <div className="text-sm text-muted-foreground">
                                    A historical log of urges and resistances grouped by hour.
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All Time</Button>
                                <Button variant={filter === 'today' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('today')}>Today</Button>
                                <div className="flex items-center gap-2">
                                  <Button variant={filter === 'lastX' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('lastX')}>Last</Button>
                                  <Input 
                                    type="number" 
                                    value={lastXDays}
                                    onChange={(e) => setLastXDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="w-16 h-8 text-sm"
                                    onFocus={() => setFilter('lastX')}
                                  />
                                  <span className="text-sm">Days</span>
                                </div>
                            </div>
                            <div className="w-full h-[400px] py-2">
                               <ResponsiveContainer width="100%" height="100%">
                                    <RechartsLineChart
                                        data={chartData}
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <XAxis dataKey="name" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip content={<CustomTooltip />}/>
                                        <Legend />
                                        <Line type="monotone" dataKey="urges" stroke="#ef4444" name="Urges" />
                                        <Line type="monotone" dataKey="resistances" stroke="#3b82f6" name="Resistances" />
                                    </RechartsLineChart>
                               </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};


export function MindsetCategoriesCard() {
    const { 
        mindProgrammingDefinitions,
        habitCards,
        mechanismCards,
        logStopperEncounter,
        openLinkedResistancePopup,
        openStopperProgressPopup,
        isMindsetModalOpen,
        setIsMindsetModalOpen,
        setResources,
        mindsetCards,
        setMindsetCards,
        schedule,
        setSchedule,
        toggleRoutine,
        settings,
        setSettings,
    } = useAuth();
    const { toast } = useToast();
    
    const [hotResistances, setHotResistances] = useState<Set<string>>(new Set());
    const [isHourlyLogOpen, setIsHourlyLogOpen] = useState(false);
    const [linkTechniqueModalState, setLinkTechniqueModalState] = useState({ isOpen: false, habitId: '', stopper: {} as Stopper, stage: 2 as 2 | 3 });
    
    const [newEntryText, setNewEntryText] = useState('');
    const [newEntryType, setNewEntryType] = useState<'urge' | 'resistance'>('urge');
    const [selectedHabitId, setSelectedHabitId] = useState<string>('');
    const [isAddPopoverOpen, setIsAddPopoverOpen] = useState(false);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [botheringPopup, setBotheringPopup] = useState<{ type: 'mismatch' | 'constraint' | 'external'; pointId: string } | null>(null);
    const [selectedBotheringHabitId, setSelectedBotheringHabitId] = useState('');
    const [newBotheringText, setNewBotheringText] = useState('');
    const [newMismatchType, setNewMismatchType] = useState<MindsetPoint['mismatchType']>('mental-model');
    const [botheringType, setBotheringType] = useState<'mismatch' | 'constraint' | 'external'>('mismatch');
    const [pendingBotheringTaskIds, setPendingBotheringTaskIds] = useState<Set<string> | null>(null);
    const [selectedMismatchLinkId, setSelectedMismatchLinkId] = useState('');
    const [consistencyModal, setConsistencyModal] = useState<{ pointId: string; title: string; data: { date: string; fullDate: string; score: number }[] } | null>(null);
    const [position, setPosition] = useState(() => ({
        x: typeof window !== 'undefined' ? window.innerWidth / 2 - 360 : 0,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 - 260 : 0,
    }));
    const dragState = React.useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

    useEffect(() => {
        if (!isMindsetModalOpen) return;
        setPosition({
            x: window.innerWidth / 2 - 460,
            y: window.innerHeight / 2 - 320,
        });
    }, [isMindsetModalOpen]);

    useEffect(() => {
        if (!isMindsetModalOpen) {
            setPendingBotheringTaskIds(null);
        }
    }, [isMindsetModalOpen]);

    useEffect(() => {
        if (isAddPopoverOpen && !selectedHabitId && habitCards.length > 0) {
            setSelectedHabitId(habitCards[0].id);
        }
    }, [isAddPopoverOpen, selectedHabitId, habitCards]);

    const getOrCreateBotheringCard = useCallback((type: 'mismatch' | 'constraint' | 'external') => {
        const id = `mindset_botherings_${type}`;
        const existing = mindsetCards.find(c => c.id === id);
        if (existing) return existing;
        const titleMap: Record<'mismatch' | 'constraint' | 'external', string> = {
            mismatch: 'Mismatch Botherings',
            constraint: 'Constraint Botherings',
            external: 'External Botherings',
        };
        const newCard: MindsetCard = {
            id,
            title: titleMap[type],
            icon: 'Brain',
            points: [],
        };
        setMindsetCards(prev => [...prev, newCard]);
        return newCard;
    }, [mindsetCards, setMindsetCards]);

    const addBothering = () => {
        if (!newBotheringText.trim()) return;
        const card = getOrCreateBotheringCard(botheringType);
        const newPoint: MindsetPoint = {
            id: `bother_${Date.now()}`,
            text: newBotheringText.trim(),
            ...(botheringType === 'mismatch' ? { mismatchType: newMismatchType } : {}),
        };
        setMindsetCards(prev => prev.map(c => c.id === card.id ? { ...c, points: [...c.points, newPoint] } : c));
        setNewBotheringText('');
    };

    const deleteBothering = (type: 'mismatch' | 'constraint' | 'external', pointId: string) => {
        const cardId = `mindset_botherings_${type}`;
        setMindsetCards(prev => prev.map(c => c.id === cardId ? { ...c, points: c.points.filter(p => p.id !== pointId) } : c));
    };

    const mismatchCard = mindsetCards.find(c => c.id === 'mindset_botherings_mismatch');
    const constraintCard = mindsetCards.find(c => c.id === 'mindset_botherings_constraint');
    const externalCard = mindsetCards.find(c => c.id === 'mindset_botherings_external');

    const activeBotheringCard =
        botheringPopup?.type === 'mismatch'
            ? mismatchCard
            : botheringPopup?.type === 'constraint'
                ? constraintCard
                : externalCard;
    const activeBotheringPoint = activeBotheringCard?.points.find(p => p.id === botheringPopup?.pointId);

    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const getTodayTaskStats = (point?: MindsetPoint) => {
        const tasks = point?.tasks || [];
        if (tasks.length === 0) return { total: 0, completed: 0, remaining: 0 };
        let total = 0;
        let completed = 0;
        tasks.forEach(task => {
            if (!isTaskDueOnDate(task, todayKey)) return;
            total += 1;
            if (isTaskCompletedOnDate(task, todayKey)) completed += 1;
        });
        return { total, completed, remaining: Math.max(0, total - completed) };
    };
    const isBotheringActive = (point?: MindsetPoint) => {
        const stats = getTodayTaskStats(point);
        return !!point && stats.total > 0 && stats.completed < stats.total;
    };
    const isTaskDueOnDate = (task: MindsetPoint['tasks'][number], dateKey: string) => {
        const startKey = task.startDate || task.dateKey;
        if (!startKey) return false;
        const start = parseISO(startKey);
        const date = parseISO(dateKey);
        if (Number.isNaN(start.getTime()) || Number.isNaN(date.getTime())) return false;
        if (isAfter(startOfDay(start), startOfDay(date))) return false;
        if (task.recurrence === 'daily') return true;
        if (task.recurrence === 'weekly') return getDay(start) === getDay(date);
            if (task.recurrence === 'custom') {
                const interval = Math.max(1, task.repeatInterval || 1);
                if (task.repeatUnit === 'month') {
                    if (start.getDate() !== date.getDate()) return false;
                    const diffMonths = differenceInMonths(date, start);
                    return diffMonths >= 0 && diffMonths % interval === 0;
                }
                if (task.repeatUnit === 'week') {
                    const diffDays = differenceInDays(date, start);
                    return diffDays >= 0 && diffDays % (interval * 7) === 0;
                }
                const diffDays = differenceInDays(date, start);
                return diffDays >= 0 && diffDays % interval === 0;
            }
            return startKey === dateKey;
        };
    const activityMapByDate = useMemo(() => {
        const map = new Map<string, Map<string, { completed?: boolean }>>();
        Object.entries(schedule || {}).forEach(([dateKey, day]) => {
            const activityMap = new Map<string, { completed?: boolean }>();
            Object.values(day).forEach((value: any) => {
                if (!Array.isArray(value)) return;
                value.forEach((act: any) => {
                    if (!act?.id) return;
                    activityMap.set(act.id, act);
                    const baseMatch = act.id.match(/_(\d{4}-\d{2}-\d{2})$/);
                    if (baseMatch) {
                        const baseId = act.id.slice(0, -11);
                        if (!activityMap.has(baseId)) activityMap.set(baseId, act);
                    }
                });
            });
            map.set(dateKey, activityMap);
        });
        return map;
    }, [schedule]);
    const scheduledDatesByTaskId = useMemo(() => {
        const map = new Map<string, Set<string>>();
        Object.entries(schedule || {}).forEach(([dateKey, day]) => {
            Object.values(day).forEach((value: any) => {
                if (!Array.isArray(value)) return;
                value.forEach((act: any) => {
                    if (!act?.id) return;
                    const ids = new Set<string>();
                    ids.add(act.id);
                    const baseMatch = act.id.match(/_(\d{4}-\d{2}-\d{2})$/);
                    if (baseMatch) {
                        ids.add(act.id.slice(0, -11));
                    }
                    (act.taskIds || []).forEach((taskId: string) => {
                        if (taskId) ids.add(taskId);
                    });
                    ids.forEach((id) => {
                        if (!id) return;
                        if (!map.has(id)) map.set(id, new Set<string>());
                        map.get(id)!.add(dateKey);
                    });
                });
            });
        });
        return map;
    }, [schedule]);

    const isTaskCompletedOnDate = (task: MindsetPoint['tasks'][number], dateKey: string) => {
        const activityMap = activityMapByDate.get(dateKey);
        const activity: any = activityMap?.get(task.activityId || task.id);
        if (activity) {
            if (activity.completed) return true;
            if (activity.duration && activity.duration > 0) return true;
            if (activity.focusSessionInitialStartTime && activity.focusSessionEndTime) return true;
            if (activity.focusSessionInitialDuration && activity.focusSessionInitialDuration > 0) return true;
        }
        if (task.recurrence && task.recurrence !== 'none') {
            return !!task.completionHistory?.[dateKey];
        }
        if (task.dateKey && task.dateKey !== dateKey) return false;
        return !!task.completed;
    };
    const isTaskScheduledOnDate = (task: MindsetPoint['tasks'][number], dateKey: string) => {
        const activityId = task.activityId || task.id;
        if (activityId && scheduledDatesByTaskId.get(activityId)?.has(dateKey)) return true;
        if (task.id && task.id !== activityId && scheduledDatesByTaskId.get(task.id)?.has(dateKey)) return true;
        return false;
    };

    const buildBotheringConsistency = useCallback((point: MindsetPoint) => {
        const today = startOfDay(new Date());
        const oneYearAgo = addDays(today, -365);
        let score = 0;
        let hasAnyCompletion = false;
        const data: { date: string; fullDate: string; score: number }[] = [];

        for (let d = new Date(oneYearAgo); d <= today; d = addDays(d, 1)) {
            const dateKey = format(d, 'yyyy-MM-dd');
            const tasks = point.tasks || [];
            let due = 0;
            let completed = 0;
            tasks.forEach(task => {
                if (!isTaskDueOnDate(task, dateKey)) return;
                if (!isTaskScheduledOnDate(task, dateKey)) return;
                due += 1;
                if (isTaskCompletedOnDate(task, dateKey)) completed += 1;
            });

            if (due === 0) continue;
            if (completed === due) {
                hasAnyCompletion = true;
                score += (1 - score) * 0.1;
            } else if (hasAnyCompletion) {
                score *= 0.95;
            }

            data.push({
                date: format(d, 'MMM dd'),
                fullDate: format(d, 'PPP'),
                score: Math.round(score * 100),
            });
        }

        return data;
    }, [isTaskDueOnDate, isTaskScheduledOnDate, isTaskCompletedOnDate]);
    const getRecurringTaskCounts = (task: MindsetPoint['tasks'][number]) => {
        if (!task.recurrence || task.recurrence === 'none') return null;
        const startKey = task.startDate || task.dateKey;
        if (!startKey) return { completed: 0, missed: 0 };
        const start = parseISO(startKey);
        const today = startOfDay(new Date());
        if (Number.isNaN(start.getTime())) return { completed: 0, missed: 0 };
        const days = eachDayOfInterval({ start: startOfDay(start), end: today });
        let completed = 0;
        let missed = 0;
        days.forEach(day => {
            const key = format(day, 'yyyy-MM-dd');
            if (!isTaskDueOnDate(task, key)) return;
            if (!isTaskScheduledOnDate(task, key)) return;
            if (isTaskCompletedOnDate(task, key)) completed += 1;
            else if (key !== todayKey) missed += 1;
        });
        return { completed, missed };
    };
    const getDaysLeftLabel = (endDate?: string) => {
        if (!endDate) return null;
        const target = parseISO(endDate);
        if (Number.isNaN(target.getTime())) return null;
        const today = startOfDay(new Date());
        const diff = differenceInDays(target, today);
        if (diff < 0) return `Overdue ${Math.abs(diff)}d`;
        if (diff === 0) return "Due today";
        return `${diff}d left`;
    };

    useEffect(() => {
        if (!botheringPopup?.pointId) return;
        setSelectedBotheringHabitId('');
    }, [botheringPopup]);

    const updateBotheringPoint = useCallback((type: 'mismatch' | 'constraint' | 'external', pointId: string, updater: (point: MindsetPoint) => MindsetPoint) => {
        const cardId = `mindset_botherings_${type}`;
        setMindsetCards(prev => prev.map(c => c.id === cardId ? { ...c, points: c.points.map(p => p.id === pointId ? updater(p) : p) } : c));
    }, [setMindsetCards]);

    const addStopperToBothering = useCallback((link: { stopper: Stopper; isUrge: boolean }) => {
        if (!botheringPopup || !activeBotheringPoint) return;
        updateBotheringPoint(botheringPopup.type, activeBotheringPoint.id, (point) => {
            if (link.isUrge) {
                const next = Array.from(new Set([...(point.linkedUrgeIds || []), link.stopper.id]));
                return { ...point, linkedUrgeIds: next };
            }
            const next = Array.from(new Set([...(point.linkedResistanceIds || []), link.stopper.id]));
            return { ...point, linkedResistanceIds: next };
        });
    }, [botheringPopup, activeBotheringPoint, updateBotheringPoint]);

    const addStopperToLinkedBotheringsForTask = useCallback((link: { stopper: Stopper; isUrge: boolean }, taskIds: Set<string>) => {
        let updatedCount = 0;
        setMindsetCards(prev => prev.map(card => {
            if (!card.id.startsWith('mindset_botherings_')) return card;
            let cardChanged = false;
            const nextPoints = card.points.map(point => {
                const matches = (point.tasks || []).some(t => taskIds.has(t.id) || (t.activityId && taskIds.has(t.activityId)));
                if (!matches) return point;
                cardChanged = true;
                updatedCount += 1;
                if (link.isUrge) {
                    const next = Array.from(new Set([...(point.linkedUrgeIds || []), link.stopper.id]));
                    return { ...point, linkedUrgeIds: next };
                }
                const next = Array.from(new Set([...(point.linkedResistanceIds || []), link.stopper.id]));
                return { ...point, linkedResistanceIds: next };
            });
            return cardChanged ? { ...card, points: nextPoints } : card;
        }));
        return updatedCount;
    }, [setMindsetCards]);

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent).detail as { type?: 'mismatch' | 'constraint' | 'external'; pointId?: string } | undefined;
            if (!detail?.type || !detail?.pointId) return;
            setBotheringType(detail.type);
            setBotheringPopup({ type: detail.type, pointId: detail.pointId });
        };
        window.addEventListener('open-bothering-popup', handler as EventListener);
        return () => window.removeEventListener('open-bothering-popup', handler as EventListener);
    }, []);

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent).detail as { taskId?: string; taskIds?: string[]; baseId?: string } | undefined;
            if (!detail?.taskId) return;
            const ids = new Set<string>([detail.taskId]);
            (detail.taskIds || []).forEach(id => ids.add(id));
            if (detail.baseId) ids.add(detail.baseId);
            const baseMatch = detail.taskId.match(/_(\d{4}-\d{2}-\d{2})$/);
            if (baseMatch) ids.add(detail.taskId.slice(0, -11));
            setPendingBotheringTaskIds(ids);
            setIsMindsetModalOpen(true);
        };
        window.addEventListener('open-resistance-list-for-task', handler as EventListener);
        return () => window.removeEventListener('open-resistance-list-for-task', handler as EventListener);
    }, [setIsMindsetModalOpen]);


    const allLinkedResistances = React.useMemo(() => {
        const links: { habitId: string; habitName: string; stopper: Stopper; isUrge: boolean; mechanismName?: string; }[] = [];
        
        habitCards.forEach(habit => {
            const processStoppers = (stoppers: Stopper[] = [], isUrge: boolean) => {
                stoppers.forEach(stopper => {
                    const mechanism = mechanismCards.find(m => m.id === (isUrge ? habit.response?.resourceId : habit.newResponse?.resourceId));
                    links.push({
                        habitId: habit.id,
                        habitName: habit.name,
                        stopper: stopper,
                        isUrge: isUrge,
                        mechanismName: mechanism?.name,
                    });
                });
            };
            processStoppers(habit.urges, true);
            processStoppers(habit.resistances, false);
        });
        return links;
    }, [habitCards, mechanismCards]);

    const stopperById = useMemo(() => {
        const map = new Map<string, { habitId: string; habitName: string; stopper: Stopper; isUrge: boolean; mechanismName?: string }>();
        allLinkedResistances.forEach(link => {
            map.set(link.stopper.id, link);
        });
        return map;
    }, [allLinkedResistances]);

    const linkedStoppers = useMemo(() => {
        if (!activeBotheringPoint) return [];
        const entries: { id: string; isUrge: boolean }[] = [
            ...(activeBotheringPoint.linkedUrgeIds || []).map(id => ({ id, isUrge: true })),
            ...(activeBotheringPoint.linkedResistanceIds || []).map(id => ({ id, isUrge: false })),
        ];
        return entries
            .map(entry => {
                const link = stopperById.get(entry.id);
                if (!link) return null;
                return { ...entry, ...link };
            })
            .filter(Boolean) as Array<{ id: string; isUrge: boolean; habitId: string; habitName: string; stopper: Stopper; mechanismName?: string }>;
    }, [activeBotheringPoint, stopperById]);

    const scheduleActivityMap = useMemo(() => {
        const map = new Map<string, { activity: Activity; dateKey: string; slotName: SlotName }>();
        Object.entries(schedule).forEach(([dateKey, day]) => {
            Object.entries(day).forEach(([slotName, activities]) => {
                (activities as Activity[] | undefined)?.forEach(activity => {
                    if (!activity?.id) return;
                    map.set(activity.id, { activity, dateKey, slotName: slotName as SlotName });
                    (activity.taskIds || []).forEach(taskId => {
                        map.set(taskId, { activity, dateKey, slotName: slotName as SlotName });
                    });
                });
            });
        });
        return map;
    }, [schedule]);

    useEffect(() => {
        setMindsetCards(prev => {
            let changed = false;
            const next = prev.map(card => {
                if (!card.id.startsWith('mindset_botherings_')) return card;
                const updatedPoints = card.points.map(point => {
                    if (!point.tasks || point.tasks.length === 0) return point;
                    let tasksChanged = false;
                    const newTasks = point.tasks
                        .map(task => {
                            const activityId = task.activityId || task.id;
                            if (!activityId) return task;
                            const match = scheduleActivityMap.get(activityId);
                            if (!match) {
                                if (task.recurrence && task.recurrence !== 'none') {
                                    return task;
                                }
                                tasksChanged = true;
                                return null;
                            }
                            const { activity, dateKey, slotName } = match;
                            if (
                                task.details !== activity.details ||
                                task.completed !== activity.completed ||
                                task.type !== activity.type ||
                                task.dateKey !== dateKey ||
                                task.slotName !== slotName
                            ) {
                                tasksChanged = true;
                                return {
                                    ...task,
                                    activityId,
                                    details: activity.details,
                                    completed: activity.completed,
                                    type: activity.type,
                                    dateKey,
                                    slotName,
                                };
                            }
                            if (task.recurrence && task.recurrence !== 'none') {
                                const history = { ...(task.completionHistory || {}) };
                                history[dateKey] = activity.completed;
                                if (!task.completionHistory || task.completionHistory[dateKey] !== activity.completed) {
                                    tasksChanged = true;
                                    return { ...task, completionHistory: history };
                                }
                            }
                            return task;
                        })
                        .filter(Boolean) as MindsetPoint['tasks'];
                    if (!tasksChanged) return point;
                    changed = true;
                    return { ...point, tasks: newTasks };
                });
                return changed ? { ...card, points: updatedPoints } : card;
            });
            return changed ? next : prev;
        });
    }, [scheduleActivityMap, setMindsetCards]);
    
    const handleResistanceClick = (e: React.MouseEvent, link: { habitId: string, stopper: Stopper }) => {
        const { habitId, stopper } = link;
        const todayStart = startOfDay(new Date());
        const todayTimestamps = (stopper.timestamps || []).filter(ts => ts >= todayStart.getTime());
        const todayCount = todayTimestamps.length;
    
        if (todayCount === 1) { // Second click today
            if (!stopper.linkedTechniqueId_stage2) {
                setLinkTechniqueModalState({ isOpen: true, habitId, stopper, stage: 2 });
            } else {
                openLinkedResistancePopup(stopper.linkedTechniqueId_stage2, e);
            }
        } else if (todayCount >= 2) { // Third or more clicks today
            if (!stopper.linkedTechniqueId_stage3) {
                setLinkTechniqueModalState({ isOpen: true, habitId, stopper, stage: 3 });
            } else {
                openLinkedResistancePopup(stopper.linkedTechniqueId_stage3, e);
            }
        } else { // First click today
            if (stopper.linkedTechniqueId) {
                openLinkedResistancePopup(stopper.linkedTechniqueId, e);
            } else {
                 setLinkTechniqueModalState({ isOpen: true, habitId, stopper, stage: 2 });
            }
        }
    };
    
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const today = new Date(now);
            const yesterday = new Date(now - 24 * 60 * 60 * 1000);
            
            const newHotResistances = new Set<string>();

            allLinkedResistances.forEach(link => {
                const timestamps = link.stopper.timestamps || [];
                for (const ts of timestamps) {
                    const eventDate = new Date(ts);
                    // Check for recent clicks (last 30 minutes)
                    if (now - ts < 30 * 60 * 1000) {
                        newHotResistances.add(link.stopper.id);
                        break;
                    }
                    
                    // Check for predictive highlighting
                    if (isSameDay(eventDate, yesterday)) {
                        const eventTimeToday = new Date(today);
                        eventTimeToday.setHours(eventDate.getHours(), eventDate.getMinutes(), eventDate.getSeconds());
                        
                        const fifteenMinutes = 15 * 60 * 1000;
                        if (Math.abs(now - eventTimeToday.getTime()) <= fifteenMinutes) {
                            newHotResistances.add(link.stopper.id);
                            break;
                        }
                    }
                }
            });

            setHotResistances(newHotResistances);
        }, 60 * 1000); // Check every minute

        return () => clearInterval(interval);
    }, [allLinkedResistances]);

    const sortedResistances = [...allLinkedResistances].sort((a, b) => {
        const aIsHot = hotResistances.has(a.stopper.id);
        const bIsHot = hotResistances.has(b.stopper.id);
        if (aIsHot && !bIsHot) return -1;
        if (!aIsHot && bIsHot) return 1;
        const lastTsA = Math.max(0, ...(a.stopper.timestamps || []));
        const lastTsB = Math.max(0, ...(b.stopper.timestamps || []));
        return lastTsB - lastTsA;
    });

    const getResistanceHighlightClass = (stopper: Stopper) => {
        const todayStart = startOfDay(new Date());
        const todayTimestamps = (stopper.timestamps || []).filter(ts => ts >= todayStart.getTime());
        const count = todayTimestamps.length;

        const sevenDaysAgo = subDays(todayStart, 7);
        const lastTimestamp = Math.max(0, ...(stopper.timestamps || []));
        
        const isDormant = lastTimestamp > 0 && isBefore(new Date(lastTimestamp), sevenDaysAgo);

        let highlightClass = 'bg-muted/50';
        if (count === 1) highlightClass = 'bg-yellow-500/20';
        else if (count === 2) highlightClass = 'bg-orange-500/20';
        else if (count >= 3) highlightClass = 'bg-red-500/20';
        else if (count === 0 && !isDormant) highlightClass = 'bg-green-500/10';

        return { className: highlightClass, dormant: isDormant };
    };
    
    const handleAddEntry = () => {
        if (!newEntryText.trim()) return;
        if (!selectedHabitId) {
            alert('Please select a habit to associate this with.');
            return;
        }

        const newStopper: Stopper = {
            id: `stopper_${Date.now()}`,
            text: newEntryText.trim(),
            status: 'none',
        };

        setResources(prev => prev.map(r => {
            if (r.id === selectedHabitId) {
                const updatedResource = { ...r };
                if (newEntryType === 'urge') {
                    updatedResource.urges = [...(updatedResource.urges || []), newStopper];
                } else {
                    updatedResource.resistances = [...(updatedResource.resistances || []), newStopper];
                }
                return updatedResource;
            }
            return r;
        }));

        setNewEntryText('');
        setSelectedHabitId('');
        setIsAddPopoverOpen(false);
    };

    const updateActivityById = useCallback((activityId: string, updater: (activity: Activity) => Activity) => {
        setSchedule(prev => {
            const next = { ...prev };
            let updated = false;
            for (const dateKey of Object.keys(next)) {
                const day = { ...(next[dateKey] || {}) };
                let dayChanged = false;
                for (const slotName of Object.keys(day)) {
                    const activities = (day[slotName as SlotName] as Activity[]) || [];
                    const index = activities.findIndex(a => a.id === activityId);
                    if (index > -1) {
                        const updatedActivities = [...activities];
                        updatedActivities[index] = updater(updatedActivities[index]);
                        day[slotName as SlotName] = updatedActivities;
                        dayChanged = true;
                        updated = true;
                        break;
                    }
                }
                if (dayChanged) {
                    next[dateKey] = day;
                    break;
                }
            }
            if (updated) return next;

            // If not found, materialize a routine instance (for bothering repeat tasks)
            const match = activityId.match(/_(\d{4}-\d{2}-\d{2})$/);
            const inferredDateKey = match?.[1] || format(new Date(), 'yyyy-MM-dd');
            const baseId = match ? activityId.slice(0, -11) : activityId;
            const routine = (settings.routines || []).find(r => r.id === baseId);
            if (!routine) return prev;

            const slotName = routine.slot || 'Evening';
            const day = { ...(next[inferredDateKey] || {}) };
            const slotActivities = [...((day[slotName as SlotName] as Activity[]) || [])];
            if (!slotActivities.some(a => a.id === activityId)) {
                const fallbackTaskIds = routine.taskIds && routine.taskIds.length > 0 ? routine.taskIds : [baseId];
                const instance: Activity = updater({ ...routine, id: activityId, completed: false, isRoutine: false, taskIds: fallbackTaskIds });
                slotActivities.push(instance);
                day[slotName as SlotName] = slotActivities;
                next[inferredDateKey] = day;
                return next;
            }
            return prev;
        });
    }, [setSchedule, settings.routines]);

    const removeActivityById = useCallback((activityId: string) => {
        setSchedule(prev => {
            const next = { ...prev };
            let updated = false;
            for (const dateKey of Object.keys(next)) {
                const day = { ...(next[dateKey] || {}) };
                let dayChanged = false;
                for (const slotName of Object.keys(day)) {
                    const activities = (day[slotName as SlotName] as Activity[]) || [];
                    const filtered = activities.filter(a => a.id !== activityId);
                    if (filtered.length !== activities.length) {
                        day[slotName as SlotName] = filtered;
                        dayChanged = true;
                        updated = true;
                        break;
                    }
                }
                if (dayChanged) {
                    next[dateKey] = day;
                    break;
                }
            }
            return updated ? next : prev;
        });
    }, [setSchedule]);

    return (
        <>
            {isMindsetModalOpen && (
            <div className="fixed inset-0 z-[140] pointer-events-none">
                <div className="pointer-events-auto">
                    <div
                        className="fixed w-[920px] max-w-[95vw]"
                        style={{ top: position.y, left: position.x }}
                    >
                        <div className="shadow-2xl border border-white/10 bg-[#141416]/95 backdrop-blur rounded-3xl overflow-hidden">
                            <div
                                className="px-5 py-4 border-b border-white/10 flex items-start justify-between cursor-grab select-none"
                                onPointerDown={(event) => {
                                    dragState.current = {
                                        startX: event.clientX,
                                        startY: event.clientY,
                                        originX: position.x,
                                        originY: position.y,
                                    };
                                    const handlePointerMove = (e: PointerEvent) => {
                                        if (!dragState.current) return;
                                        const dx = e.clientX - dragState.current.startX;
                                        const dy = e.clientY - dragState.current.startY;
                                        setPosition({
                                            x: dragState.current.originX + dx,
                                            y: dragState.current.originY + dy,
                                        });
                                    };
                                    const handlePointerUp = () => {
                                        dragState.current = null;
                                        window.removeEventListener('pointermove', handlePointerMove);
                                        window.removeEventListener('pointerup', handlePointerUp);
                                    };
                                    window.addEventListener('pointermove', handlePointerMove);
                                    window.addEventListener('pointerup', handlePointerUp);
                                }}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-base font-semibold">
                                        <Brain className="h-5 w-5 text-pink-500" />
                                        Resistances, Urges &amp; Botherings
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Expectation vs reality. Capacity vs container.
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => setIsHourlyLogOpen(true)}>
                                        <LineChart className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setIsMindsetModalOpen(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="p-5 grid grid-cols-[1.35fr_1fr] gap-4">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-sm font-semibold">Resistances &amp; Urges</div>
                                        <span className="text-xs text-muted-foreground">
                                            {sortedResistances.length} items
                                        </span>
                                    </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3 mb-4">
                            <button
                                type="button"
                                onClick={() => setIsQuickAddOpen((prev) => !prev)}
                                className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground"
                            >
                                Quick add
                                <span className="text-[10px]">{isQuickAddOpen ? 'Hide' : 'Show'}</span>
                            </button>
                            {isQuickAddOpen && (
                                <div className="mt-3 space-y-3">
                                    <Tabs value={newEntryType} onValueChange={(v) => setNewEntryType(v as any)} className="w-full">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="urge">Urge</TabsTrigger>
                                            <TabsTrigger value="resistance">Resistance</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    <Input 
                                        value={newEntryText}
                                        onChange={(e) => setNewEntryText(e.target.value)}
                                        placeholder={`Describe the ${newEntryType}...`}
                                    />
                                    <Select onValueChange={setSelectedHabitId} value={selectedHabitId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Link to a Habit..." />
                                        </SelectTrigger>
                                        <SelectContent className="z-[200]">
                                            {habitCards.map(habit => (
                                                <SelectItem key={habit.id} value={habit.id}>{habit.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleAddEntry} className="w-full">Add</Button>
                                </div>
                            )}
                        </div>
                        <ScrollArea className="h-[420px] pr-4">
                             <ul className="space-y-2">
                                {sortedResistances.map((link) => {
                                    const { className: highlightClass, dormant } = getResistanceHighlightClass(link.stopper);
                                    return (
                                        <li key={`${link.habitId}-${link.stopper.id}`} className={cn("text-sm p-2 rounded-xl transition-all border border-white/5", highlightClass)}>
                                            <div
                                                className="flex justify-between items-start w-full text-left"
                                            >
                                                <div 
                                                    className={cn("flex-grow pr-2 cursor-pointer", dormant && "line-through text-muted-foreground")}
                                                    onClick={(e) => handleResistanceClick(e, link)}
                                                >
                                                    <p className="font-semibold">{link.stopper.text}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {link.isUrge ? 'Urge' : 'Resistance'} in: {link.habitName}
                                                    </p>
                                                </div>
                                                <div className="flex items-center flex-shrink-0">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openStopperProgressPopup(link.stopper, link.habitName)}>
                                                        <LineChart className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                    <span className="text-xs font-bold mr-1">{(link.stopper.timestamps?.length || 0)}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (botheringPopup && activeBotheringPoint) {
                                                                addStopperToBothering(link);
                                                                toast({ title: "Linked", description: "Added to this bothering." });
                                                            }
                                                            if (pendingBotheringTaskIds && pendingBotheringTaskIds.size > 0) {
                                                                const count = addStopperToLinkedBotheringsForTask(link, pendingBotheringTaskIds);
                                                                if (count > 0) {
                                                                    toast({ title: "Linked", description: `Added to ${count} bothering${count > 1 ? 's' : ''}.` });
                                                                } else {
                                                                    toast({ title: "No linked bothering", description: "This task isn't linked to any bothering.", variant: "destructive" });
                                                                }
                                                            }
                                                            logStopperEncounter(link.habitId, link.stopper.id);
                                                        }}
                                                    >
                                                        <PlusCircle className="h-4 w-4 text-green-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                                {allLinkedResistances.length === 0 && (
                                    <p className="text-center text-sm text-muted-foreground py-8">
                                        No urges or resistances are defined in your habits yet.
                                    </p>
                                )}
                            </ul>
                         </ScrollArea>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div className="text-sm font-semibold mb-3">Botherings</div>
    <Tabs value={botheringType} onValueChange={(v) => setBotheringType(v as any)}>
        <TabsList className="grid grid-cols-3 w-full mb-3">
            <TabsTrigger value="mismatch">Mismatch</TabsTrigger>
            <TabsTrigger value="constraint">Constraint</TabsTrigger>
            <TabsTrigger value="external">External</TabsTrigger>
        </TabsList>
                                        <TabsContent value="mismatch" className="space-y-3">
                                            <div className="text-xs text-muted-foreground">
                                                Expectation vs Reality. Cognitive. Debuggable by understanding.
                                            </div>
                                            <div className="flex gap-2">
                                                <Input value={newBotheringText} onChange={(e) => setNewBotheringText(e.target.value)} placeholder="Describe the mismatch..." />
                                                <Button onClick={addBothering}>Add</Button>
                                            </div>
                                            <ScrollArea className="h-[420px] pr-2">
                                                <ul className="space-y-2">
                                                    {(mismatchCard?.points || [])
                                                        .slice()
                                                        .sort((a, b) => {
                                                            const aActive = isBotheringActive(a);
                                                            const bActive = isBotheringActive(b);
                                                            if (aActive !== bActive) return aActive ? -1 : 1;
                                                            if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
                                                            return 0;
                                                        })
                                                        .map(point => {
                                                            const stats = getTodayTaskStats(point);
                                                            const isDoneToday = stats.total > 0 && stats.completed === stats.total;
                                                            return (
                                                                <li key={point.id} className={cn("flex items-center justify-between text-sm p-2 rounded-xl border", isDoneToday ? "bg-emerald-500/10 border-emerald-500/40" : isBotheringActive(point) ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/30 border-white/5")}>
                                                                    <button
                                                                        type="button"
                                                                        className="flex-1 min-w-0 text-left"
                                                                        onClick={() => setBotheringPopup({ type: 'mismatch', pointId: point.id })}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            {isDoneToday ? <Check className="h-4 w-4 text-emerald-400" /> : null}
                                                                            <span className={cn(isDoneToday && "line-through text-muted-foreground")}>{point.text}</span>
                                                                        </div>
                                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                                            {getDaysLeftLabel(point.endDate) ? (
                                                                                <span className="px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300/90 bg-amber-400/10">
                                                                                    {getDaysLeftLabel(point.endDate)}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="px-2 py-0.5 rounded-full border border-muted-foreground/30 text-muted-foreground bg-muted/10">
                                                                                    No end date
                                                                                </span>
                                                                            )}
                                                                            {stats.total > 0 && (
                                                                                <span className="text-muted-foreground">
                                                                                    {stats.completed}/{stats.total}
                                                                                </span>
                                                                            )}
                                                                            {isBotheringActive(point) && (
                                                                                <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                    <div className="flex items-center gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6"
                                                                            onClick={() => setConsistencyModal({ pointId: point.id, title: point.text, data: buildBotheringConsistency(point) })}
                                                                        >
                                                                            <LineChart className="h-3.5 w-3.5 text-blue-500" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteBothering('mismatch', point.id)}>
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                </li>
                                                            );
                                                        })}
                                                </ul>
                                            </ScrollArea>
                                        </TabsContent>
        <TabsContent value="constraint" className="space-y-3">
            <div className="text-xs text-muted-foreground">
                Capacity &gt; Allowed space. Energy &gt; Channel. Growth &gt; Container. Produces ghutan and baichaini.
            </div>
            <div className="flex gap-2">
                <Input value={newBotheringText} onChange={(e) => setNewBotheringText(e.target.value)} placeholder="Describe the constraint..." />
                <Button onClick={addBothering}>Add</Button>
            </div>
            <ScrollArea className="h-[420px] pr-2">
                <ul className="space-y-2">
                                                    {(constraintCard?.points || [])
                                                        .slice()
                                                        .sort((a, b) => {
                                                            const aActive = isBotheringActive(a);
                                                            const bActive = isBotheringActive(b);
                                                            if (aActive !== bActive) return aActive ? -1 : 1;
                                                            if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
                                                            return 0;
                                                        })
                                                        .map(point => {
                                                            const stats = getTodayTaskStats(point);
                                                            const isDoneToday = stats.total > 0 && stats.completed === stats.total;
                                                            return (
                                                                <li key={point.id} className={cn("flex items-center justify-between text-sm p-2 rounded-xl border", isDoneToday ? "bg-emerald-500/10 border-emerald-500/40" : isBotheringActive(point) ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/30 border-white/5")}>
                                                                    <button
                                                                        type="button"
                                                                        className="flex-1 min-w-0 text-left"
                                                                        onClick={() => setBotheringPopup({ type: 'constraint', pointId: point.id })}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            {isDoneToday ? <Check className="h-4 w-4 text-emerald-400" /> : null}
                                                                            <span className={cn(isDoneToday && "line-through text-muted-foreground")}>{point.text}</span>
                                                                        </div>
                                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                                            {getDaysLeftLabel(point.endDate) ? (
                                                                                <span className="px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300/90 bg-amber-400/10">
                                                                                    {getDaysLeftLabel(point.endDate)}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="px-2 py-0.5 rounded-full border border-muted-foreground/30 text-muted-foreground bg-muted/10">
                                                                                    No end date
                                                                                </span>
                                                                            )}
                                                                            {stats.total > 0 && (
                                                                                <span className="text-muted-foreground">
                                                                                    {stats.completed}/{stats.total}
                                                                                </span>
                                                                            )}
                                                                            {isBotheringActive(point) && (
                                                                                <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteBothering('constraint', point.id)}>
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </li>
                                                            );
                                                        })}
                </ul>
            </ScrollArea>
        </TabsContent>
        <TabsContent value="external" className="space-y-3">
            <div className="text-xs text-muted-foreground">
                External friction: people, environment, systems, or context outside you.
            </div>
            <div className="flex gap-2">
                <Input value={newBotheringText} onChange={(e) => setNewBotheringText(e.target.value)} placeholder="Describe the external bothering..." />
                <Button onClick={addBothering}>Add</Button>
            </div>
            <ScrollArea className="h-[420px] pr-2">
                <ul className="space-y-2">
                    {(externalCard?.points || [])
                        .slice()
                        .sort((a, b) => {
                            const aActive = isBotheringActive(a);
                            const bActive = isBotheringActive(b);
                            if (aActive !== bActive) return aActive ? -1 : 1;
                            if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
                            return 0;
                        })
                        .map(point => {
                            const stats = getTodayTaskStats(point);
                            const isDoneToday = stats.total > 0 && stats.completed === stats.total;
                            return (
                                <li key={point.id} className={cn("flex items-center justify-between text-sm p-2 rounded-xl border", isDoneToday ? "bg-emerald-500/10 border-emerald-500/40" : isBotheringActive(point) ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/30 border-white/5")}>
                                    <button
                                        type="button"
                                        className="flex-1 min-w-0 text-left"
                                        onClick={() => setBotheringPopup({ type: 'external', pointId: point.id })}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isDoneToday ? <Check className="h-4 w-4 text-emerald-400" /> : null}
                                            <span className={cn(isDoneToday && "line-through text-muted-foreground")}>{point.text}</span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            {getDaysLeftLabel(point.endDate) ? (
                                                <span className="px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300/90 bg-amber-400/10">
                                                    {getDaysLeftLabel(point.endDate)}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full border border-muted-foreground/30 text-muted-foreground bg-muted/10">
                                                    No end date
                                                </span>
                                            )}
                                            {stats.total > 0 && (
                                                <span className="text-muted-foreground">
                                                    {stats.completed}/{stats.total}
                                                </span>
                                            )}
                                            {isBotheringActive(point) && (
                                                <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                                            )}
                                        </div>
                                    </button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteBothering('external', point.id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </li>
                            );
                        })}
                </ul>
            </ScrollArea>
        </TabsContent>
    </Tabs>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}
            
            <LinkTechniqueModal
                modalState={linkTechniqueModalState}
                onOpenChange={(isOpen) => setLinkTechniqueModalState(prev => ({ ...prev, isOpen }))}
            />

            <HourlyResistanceLogDialog 
                isOpen={isHourlyLogOpen}
                onOpenChange={setIsHourlyLogOpen}
                allLinkedResistances={allLinkedResistances}
            />

            {botheringPopup && activeBotheringPoint && (
                <div className="fixed inset-0 z-[170] pointer-events-none">
                    <div className="pointer-events-auto fixed inset-0 flex items-center justify-center">
                        <div className="w-[700px] max-w-[95vw] bg-[#151517]/95 border border-white/10 rounded-2xl shadow-2xl">
                            <div className="p-4 border-b border-white/10 flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="text-base font-semibold">
                                        {botheringPopup.type === 'mismatch' ? 'Mismatch Bothering' : botheringPopup.type === 'constraint' ? 'Constraint Bothering' : 'External Bothering'}
                                    </div>
                                    <div className="text-sm text-muted-foreground">{activeBotheringPoint.text}</div>
                                    {botheringPopup.type === 'mismatch' && (
                                        <div className="pt-2">
                                            <Select
                                                value={activeBotheringPoint.mismatchType ?? 'mental-model'}
                                                onValueChange={(v) => updateBotheringPoint(botheringPopup.type, activeBotheringPoint.id, (point) => ({ ...point, mismatchType: v as MindsetPoint['mismatchType'] }))}
                                            >
                                                <SelectTrigger className="h-8 w-[240px]">
                                                    <SelectValue placeholder="Mismatch type" />
                                                </SelectTrigger>
                                                <SelectContent className="z-[200]">
                                                    <SelectItem value="mental-model">Mental model mismatch</SelectItem>
                                                    <SelectItem value="cognitive-load">Cognitive load mismatch</SelectItem>
                                                    <SelectItem value="threat-prediction">Threat prediction mismatch</SelectItem>
                                                    <SelectItem value="action-sequencing">Action sequencing mismatch</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setBotheringPopup(null)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Helping Habits</div>
                                        <div className="flex gap-2">
                                            <Select value={selectedBotheringHabitId} onValueChange={setSelectedBotheringHabitId}>
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Select habit..." />
                                                </SelectTrigger>
                                                <SelectContent className="z-[200]">
                                                    {habitCards.map(habit => (
                                                        <SelectItem key={habit.id} value={habit.id}>{habit.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                onClick={() => {
                                                    if (!selectedBotheringHabitId) return;
                                                    updateBotheringPoint(botheringPopup.type, activeBotheringPoint.id, (point) => ({
                                                        ...point,
                                                        linkedHabitIds: Array.from(new Set([...(point.linkedHabitIds || []), selectedBotheringHabitId])),
                                                    }));
                                                    setSelectedBotheringHabitId('');
                                                }}
                                            >
                                                Add
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {(activeBotheringPoint.linkedHabitIds || []).map((hid) => {
                                                const habit = habitCards.find(h => h.id === hid);
                                                if (!habit) return null;
                                                return (
                                                    <div key={hid} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30 border border-white/5">
                                                        <span>{habit.name}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => updateBotheringPoint(botheringPopup.type, activeBotheringPoint.id, (point) => ({
                                                                ...point,
                                                                linkedHabitIds: (point.linkedHabitIds || []).filter(id => id !== hid),
                                                            }))}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Resistances &amp; Urges</div>
                                        {linkedStoppers.length === 0 ? (
                                            <div className="text-xs text-muted-foreground">No urges or resistances linked yet.</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {linkedStoppers.map((link) => (
                                                    <div key={`${link.id}-${link.isUrge ? 'u' : 'r'}`} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30 border border-white/5">
                                                        <div className="min-w-0">
                                                            <div className="truncate font-medium">{link.stopper.text}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {link.isUrge ? 'Urge' : 'Resistance'} in: {link.habitName}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs font-bold">{link.stopper.timestamps?.length || 0}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6"
                                                                onClick={() => {
                                                                    updateBotheringPoint(botheringPopup.type, activeBotheringPoint.id, (point) => ({
                                                                        ...point,
                                                                        linkedUrgeIds: link.isUrge ? (point.linkedUrgeIds || []).filter(id => id !== link.id) : point.linkedUrgeIds,
                                                                        linkedResistanceIds: !link.isUrge ? (point.linkedResistanceIds || []).filter(id => id !== link.id) : point.linkedResistanceIds,
                                                                    }));
                                                                }}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Completion</div>
                                        <Textarea
                                            value={activeBotheringPoint.resolution || ''}
                                            onChange={(e) => updateBotheringPoint(botheringPopup.type, activeBotheringPoint.id, (point) => ({ ...point, resolution: e.target.value }))}
                                            placeholder="What ends this bothering? (clear resolution)"
                                        />
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs text-muted-foreground">End date</Label>
                                            <Input
                                                type="date"
                                                value={activeBotheringPoint.endDate || ''}
                                                onChange={(e) => updateBotheringPoint(botheringPopup.type, activeBotheringPoint.id, (point) => ({ ...point, endDate: e.target.value }))}
                                                className="h-8 w-auto"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(!activeBotheringPoint.endDate || activeBotheringPoint.endDate.trim() === "") && (
                                                <span className="text-xs text-muted-foreground">No end date</span>
                                            )}
                                            <Button
                                                variant={activeBotheringPoint.completed ? "secondary" : "default"}
                                                disabled={
                                                    !activeBotheringPoint.completed &&
                                                    !!activeBotheringPoint.endDate &&
                                                    (activeBotheringPoint.tasks?.some(t => !t.completed) ?? false)
                                                }
                                                onClick={() => updateBotheringPoint(botheringPopup.type, activeBotheringPoint.id, (point) => ({ ...point, completed: !point.completed }))}
                                            >
                                                {activeBotheringPoint.completed ? 'Mark Active' : 'Mark Complete'}
                                            </Button>
                                            {activeBotheringPoint.completed && (
                                                <span className="text-xs text-emerald-400">Completed</span>
                                            )}
                                            {!activeBotheringPoint.completed && !!activeBotheringPoint.endDate && (activeBotheringPoint.tasks?.some(t => !t.completed) ?? false) && (
                                                <span className="text-xs text-muted-foreground">Complete all tasks to finish</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {botheringPopup.type !== 'constraint' && (
                                <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Tasks</div>
                                        {botheringPopup.type !== 'constraint' && (
                                            <>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>Link routine</span>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="w-full justify-start h-8">
                                                            <PlusCircle className="mr-2 h-4 w-4" /> Link Routine Task
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="w-64">
                                                        {(settings.routines || []).length === 0 && (
                                                            <DropdownMenuItem disabled>No routines available</DropdownMenuItem>
                                                        )}
                                                        {(settings.routines || []).map(r => (
                                                            <DropdownMenuItem
                                                                key={r.id}
                                                                onSelect={() => {
                                                                    const existing = (activeBotheringPoint.tasks || []).some(t => t.activityId === r.id || t.id === r.id);
                                                                    if (existing) return;
                                                                    updateBotheringPoint(botheringPopup.type, activeBotheringPoint.id, (point) => ({
                                                                        ...point,
                                                                        tasks: [
                                                                            ...(point.tasks || []),
                                                                            {
                                                                                id: r.id,
                                                                                activityId: r.id,
                                                                                type: r.type,
                                                                                details: r.details,
                                                                                completed: false,
                                                                                dateKey: format(new Date(), 'yyyy-MM-dd'),
                                                                                slotName: r.slot as SlotName,
                                                                                recurrence: r.routine?.type || 'none',
                                                                                startDate: r.baseDate || r.createdAt || format(new Date(), 'yyyy-MM-dd'),
                                                                                completionHistory: {},
                                                                            },
                                                                        ],
                                                                    }));
                                                                    setSettings(prev => ({
                                                                        ...prev,
                                                                        routines: (prev.routines || []).map(rr => rr.id === r.id
                                                                            ? { ...rr, taskIds: Array.from(new Set([...(rr.taskIds || []), r.id])) }
                                                                            : rr
                                                                        ),
                                                                    }));
                                                                }}
                                                            >
                                                                <span className="truncate">{r.details}</span>
                                                                <span className="ml-auto text-xs text-muted-foreground">{r.slot}</span>
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </>
                                        )}
                                <ScrollArea className="h-[420px] pr-2">
    <ul className="space-y-2">
        {(activeBotheringPoint.tasks || []).map((task) => {
            const counts = getRecurringTaskCounts(task);
            return (
            <li key={task.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30 border border-white/5">
                <div className="flex-1 min-w-0">
                    <p className="truncate">{task.details}</p>
                    {counts && (
                        <p className="text-[11px] text-muted-foreground">
                            {counts.completed} done | {counts.missed} missed
                        </p>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                        updateBotheringPoint(botheringPopup.type, activeBotheringPoint.id, (point) => ({
                            ...point,
                            tasks: (point.tasks || []).filter(t => t.id !== task.id),
                        }));
                        const activityId = task.activityId || task.id;
                        if (activityId) {
                            removeActivityById(activityId);
                        }
                    }}
                >
                    <Trash2 className="h-3 w-3" />
                </Button>
            </li>
            );
        })}
        {(!activeBotheringPoint.tasks || activeBotheringPoint.tasks.length === 0) && (
            <div className="text-xs text-muted-foreground">No tasks yet. Link a routine to start.</div>
        )}
    </ul>
</ScrollArea>
                                </div>
                                )}
                                {botheringPopup.type === 'constraint' && (
                                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
                                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Linked mismatches</div>
                                        <div className="rounded-lg border border-white/10 bg-black/20 p-2 space-y-2">
                                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Link mismatch bothering</div>
                                            <div className="flex gap-2">
                                                <Select value={selectedMismatchLinkId} onValueChange={setSelectedMismatchLinkId}>
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue placeholder="Select mismatch..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[200]">
                                                        {(mismatchCard?.points || []).map(point => (
                                                            <SelectItem key={point.id} value={point.id}>{point.text}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    onClick={() => {
                                                        if (!selectedMismatchLinkId) return;
                                                        updateBotheringPoint('constraint', activeBotheringPoint.id, (point) => ({
                                                            ...point,
                                                            linkedMismatchIds: Array.from(new Set([...(point.linkedMismatchIds || []), selectedMismatchLinkId])),
                                                        }));
                                                        setSelectedMismatchLinkId('');
                                                    }}
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                {(activeBotheringPoint.linkedMismatchIds || []).map(mid => {
                                                    const mismatch = mismatchCard?.points?.find(p => p.id === mid);
                                                    if (!mismatch) return null;
                                                    const data = buildBotheringConsistency(mismatch);
                                                    const lastScore = data.length ? data[data.length - 1].score : 0;
                                                    return (
                                                        <div key={mid} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30 border border-white/5">
                                                            <div className="min-w-0">
                                                                <div className="truncate font-medium">{mismatch.text}</div>
                                                                <div className="text-xs text-muted-foreground">Consistency: {lastScore}%</div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    onClick={() => setConsistencyModal({ pointId: mismatch.id, title: mismatch.text, data })}
                                                                >
                                                                    <LineChart className="h-3.5 w-3.5 text-blue-500" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6"
                                                                    onClick={() => updateBotheringPoint('constraint', activeBotheringPoint.id, (point) => ({
                                                                        ...point,
                                                                        linkedMismatchIds: (point.linkedMismatchIds || []).filter(id => id !== mid),
                                                                    }))}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {consistencyModal && (
                <Dialog open onOpenChange={() => setConsistencyModal(null)}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Consistency</DialogTitle>
                            <DialogDescription>{consistencyModal.title}</DialogDescription>
                        </DialogHeader>
                        {consistencyModal.data.length > 0 ? (
                            <ChartContainer config={{ score: { label: 'Consistency %' } }} className="min-h-[300px] w-full pr-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsLineChart data={consistencyModal.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <XAxis dataKey="date" fontSize={10} />
                                        <YAxis fontSize={10} domain={[0, 100]} />
                                        <Tooltip content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="p-2 bg-background border rounded-md text-xs shadow-lg max-w-sm">
                                                        <p>{payload[0].payload.fullDate}: <strong>{payload[0].value}%</strong></p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Line type="monotone" dataKey="score" stroke="#38bdf8" strokeWidth={2} dot={false} />
                                    </RechartsLineChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        ) : (
                            <p className="text-center text-sm text-muted-foreground py-8">Not enough data to calculate consistency.</p>
                        )}
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

