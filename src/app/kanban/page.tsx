
"use client";

import React, { useMemo, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Calendar, Trash2, BookOpenCheck, Magnet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isBefore, startOfToday, isSameDay } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';

interface KanbanPageContentProps {
  isModal?: boolean;
}

const getTaskCategory = (type: string) => {
    switch (type) {
        case 'workout': return 'Health';
        case 'upskill': return 'Growth';
        case 'deepwork': return 'Wealth';
        case 'branding': return 'Branding';
        case 'lead-generation': return 'Lead Gen';
        case 'planning': return 'Planning';
        case 'tracking': return 'Tracking';
        default: return 'Task';
    }
}

const getCategoryColor = (type: string) => {
    switch (type) {
        case 'workout': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        case 'upskill': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
        case 'deepwork': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case 'branding': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
        case 'lead-generation': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
    }
}


const KanbanColumn = ({ title, tasks, isModal, onDelete }: { title: string, tasks: any[], isModal?: boolean, onDelete: (slot: string, id: string) => void }) => (
    <div className={cn("flex flex-col flex-shrink-0 bg-muted/50 rounded-xl", isModal ? "w-64" : "w-80")}>
        <h2 className="font-semibold px-3 pt-3 text-foreground">{title} <Badge variant="secondary" className="ml-1">{tasks.length}</Badge></h2>
        <ScrollArea className="h-full mt-2">
            <div className="p-3 space-y-3">
                {tasks.length > 0 ? tasks.map(task => (
                <Card key={task.id} className="p-3 rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-muted rounded-md mt-0.5">
                            {task.type === 'upskill' ? <BookOpenCheck className="h-4 w-4 text-muted-foreground" /> :
                             task.type === 'lead-generation' ? <Magnet className="h-4 w-4 text-muted-foreground" /> :
                             <Briefcase className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-grow min-w-0">
                            <p className="font-medium text-sm leading-tight text-foreground">{task.details}</p>
                            <Badge className={cn("mt-1.5 text-xs", getCategoryColor(task.type))}>{getTaskCategory(task.type)}</Badge>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete the task "{task.details}".</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(task.slot, task.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <div className="mt-3 pt-2 border-t flex items-center justify-end text-xs text-orange-500 font-semibold">
                        <Calendar className="h-3 w-3 mr-1"/>
                        {format(parseISO(task.date), 'MMM d')}
                    </div>
                </Card>
                )) : (
                <div className="flex items-center justify-center border-2 border-dashed rounded-md h-24">
                    <p className="text-sm text-muted-foreground">No tasks</p>
                </div>
                )}
            </div>
        </ScrollArea>
    </div>
);

export function KanbanPageContent({ isModal = false }: KanbanPageContentProps) {
    const { schedule, setSchedule, allDeepWorkLogs, allUpskillLogs, allLeadGenLogs } = useAuth();
    const [tasks, setTasks] = useState<{ pending: any[], scheduled: any[], logged: any[], completed: any[] }>({ pending: [], scheduled: [], logged: [], completed: [] });

    useMemo(() => {
        const today = startOfToday();
        const todayKey = format(today, 'yyyy-MM-dd');
        
        const pending: any[] = [];
        const scheduled: any[] = [];
        const logged: any[] = [];
        const completed: any[] = [];

        Object.entries(schedule).forEach(([date, dailySchedule]) => {
            Object.entries(dailySchedule).forEach(([slot, activities]) => {
                if (Array.isArray(activities)) {
                    activities.forEach(activity => {
                        const fullActivity = { ...activity, slot, date };
                        if (isBefore(parseISO(date), today) && !activity.completed) {
                            pending.push(fullActivity);
                        } else if (isSameDay(parseISO(date), today)) {
                            if (activity.completed) {
                                completed.push(fullActivity);
                            } else {
                                const hasLogs = (allDeepWorkLogs.find(l => l.date === todayKey)?.exercises.some(e => activity.taskIds?.includes(e.id) && e.loggedSets.length > 0)) || 
                                                (allUpskillLogs.find(l => l.date === todayKey)?.exercises.some(e => activity.taskIds?.includes(e.id) && e.loggedSets.length > 0)) ||
                                                (allLeadGenLogs.find(l => l.date === todayKey)?.exercises.some(e => activity.taskIds?.includes(e.id) && e.loggedSets.length > 0));
                                if (hasLogs) {
                                    logged.push(fullActivity);
                                } else {
                                    scheduled.push(fullActivity);
                                }
                            }
                        }
                    });
                }
            });
        });
        
        // Also add completed tasks from the past
        Object.entries(schedule).forEach(([date, dailySchedule]) => {
            if (isBefore(parseISO(date), today)) {
                 Object.entries(dailySchedule).forEach(([slot, activities]) => {
                    if (Array.isArray(activities)) {
                        activities.forEach(activity => {
                             if (activity.completed) {
                                completed.push({ ...activity, slot, date });
                             }
                        });
                    }
                 });
            }
        });
        
        setTasks({ pending, scheduled, logged, completed });

    }, [schedule, allDeepWorkLogs, allUpskillLogs, allLeadGenLogs]);
    
    const handleDeleteActivity = (slot: string, activityId: string) => {
        const activity = [...tasks.pending, ...tasks.scheduled, ...tasks.logged, ...tasks.completed].find(a => a.id === activityId);
        if (activity) {
            const { date } = activity;
            setSchedule(prev => {
                const newSchedule = { ...prev };
                if (newSchedule[date]) {
                    const daySchedule = { ...newSchedule[date] };
                    if (daySchedule[slot]) {
                        daySchedule[slot] = (daySchedule[slot] as any[]).filter(act => act.id !== activityId);
                        newSchedule[date] = daySchedule;
                    }
                }
                return newSchedule;
            });
        }
    };

    return (
        <div className={cn(
            "flex flex-col",
            isModal ? "p-4 bg-background h-full" : "container mx-auto p-4 sm:p-6 lg:p-8 h-[calc(100vh-4rem)]"
        )}>
            {!isModal && (
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h1 className="text-2xl font-bold">Task Board</h1>
                <p className="text-muted-foreground">A Kanban-style view of all your tasks.</p>
              </div>
            )}
            <div className="flex-grow flex gap-4 overflow-x-auto pb-4">
                <KanbanColumn title="Pending from Past" tasks={tasks.pending} isModal={isModal} onDelete={handleDeleteActivity} />
                <KanbanColumn title="Scheduled for Today" tasks={tasks.scheduled} isModal={isModal} onDelete={handleDeleteActivity} />
                <KanbanColumn title="Logged Today" tasks={tasks.logged} isModal={isModal} onDelete={handleDeleteActivity} />
                <KanbanColumn title="Completed" tasks={tasks.completed} isModal={isModal} onDelete={handleDeleteActivity} />
            </div>
        </div>
    );
}

export default function KanbanPage() {
    return (
        <AuthGuard>
            <KanbanPageContent />
        </AuthGuard>
    );
}
