
"use client";

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import type { Activity, ActivityType, DatedWorkout, DailySchedule } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';
import { PieChart as PieChartIcon, X } from 'lucide-react';
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';


const activityNameMap: Record<ActivityType, string> = {
    deepwork: 'Deep Work',
    upskill: 'Learning',
    workout: 'Workout',
    mindset: 'Mindset',
    branding: 'Branding',
    essentials: 'Essentials',
    planning: 'Planning',
    tracking: 'Tracking',
    'lead-generation': 'Lead Gen',
    interrupt: 'Interrupts',
    distraction: 'Distractions',
    nutrition: 'Nutrition',
};

const activityColorMapping: Record<string, string> = {
    'Deep Work': 'bg-green-500',
    'Learning': 'bg-blue-500',
    'Workout': 'bg-red-500',
    'Mindset': 'bg-purple-500',
    'Branding': 'bg-pink-500',
    'Lead Gen': 'bg-yellow-500',
    'Essentials': 'bg-gray-400',
    'Planning': 'bg-teal-500',
    'Tracking': 'bg-indigo-500',
    'Interrupts': 'bg-orange-600',
    'Distractions': 'bg-amber-600',
    'Nutrition': 'bg-lime-500',
    'Wasted Time': 'bg-orange-600',
    'Scheduled': 'bg-sky-500',
    'Free Time': 'bg-gray-400',
};

const formatMinutes = (minutes: number) => {
    if (minutes < 1) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
};

const slotOrder: { name: string; endHour: number, startHour: number }[] = [
    { name: 'Late Night', endHour: 4, startHour: 0 },
    { name: 'Dawn', endHour: 8, startHour: 4 },
    { name: 'Morning', endHour: 12, startHour: 8 },
    { name: 'Afternoon', endHour: 16, startHour: 12 },
    { name: 'Evening', endHour: 20, startHour: 16 },
    { name: 'Night', endHour: 24, startHour: 20 }
];

interface ActivityDetailPopupState {
    category: string;
    tasks: { name: string; duration: number }[];
    x: number;
    y: number;
}

const ActivityDetailPopup = ({ popupState, onClose }: {
    popupState: ActivityDetailPopupState;
    onClose: () => void;
}) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: 'activity-detail-popup' });

    const style: React.CSSProperties = {
        position: 'fixed',
        top: popupState.y,
        left: popupState.x,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        willChange: 'transform',
        zIndex: 100,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className="w-96 shadow-2xl border-2 border-primary/50 bg-card">
                <CardHeader className="p-3 cursor-grab active:cursor-grabbing flex flex-row items-center justify-between" {...listeners}>
                    <CardTitle className="text-base">{popupState.category} Details</CardTitle>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} onPointerDown={(e) => e.stopPropagation()}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="p-3">
                    <ScrollArea className="h-48 pr-3">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead className="text-right">Duration</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {popupState.tasks.map((task, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium truncate" title={task.name}>{task.name}</TableCell>
                                        <TableCell className="text-right">{formatMinutes(task.duration)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

export function ActivityDistributionCard() {
    const { 
        schedule, 
        currentSlot,
        activityDurations
    } = useAuth();
    
    const [isClient, setIsClient] = useState(false);
    const [detailPopupState, setDetailPopupState] = useState<ActivityDetailPopupState | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [position, setPosition] = useState({ x: 20, y: 890 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
      setIsClient(true);
    }, []);

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

    const timeAllocation = useMemo(() => {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const dailySchedule = schedule[todayKey] || {};
        const totals: Record<string, { time: number; activities: { name: string; duration: number }[] }> = {};
        
        let wastedTime = 0;
        let scheduledTime = 0;
        let totalLoggedMinutes = 0;

        const now = new Date();
        const currentHour = now.getHours();
        
        slotOrder.forEach(slot => {
            const activities = (dailySchedule[slot.name as keyof DailySchedule] as Activity[]) || [];
            let loggedInSlot = 0;
            let scheduledInSlot = 0;
            const isPastSlot = currentHour >= slot.endHour;

            activities.forEach(activity => {
                const duration = parseDurationToMinutes(activityDurations[activity.id]);
                if (activity.completed) {
                    const mappedName = activityNameMap[activity.type];
                    if (mappedName) {
                        if (!totals[mappedName]) {
                            totals[mappedName] = { time: 0, activities: [] };
                        }
                        totals[mappedName].time += duration;
                        totals[mappedName].activities.push({ name: activity.details, duration });
                    }
                    loggedInSlot += duration;
                } else if (!isPastSlot) {
                    scheduledInSlot += duration;
                }
            });

            totalLoggedMinutes += loggedInSlot;
            
            if (isPastSlot) {
                wastedTime += Math.max(0, 240 - loggedInSlot);
            }
            
            scheduledTime += scheduledInSlot;
        });
        
        if (wastedTime > 0) {
          if (!totals['Wasted Time']) totals['Wasted Time'] = { time: 0, activities: [] };
          totals['Wasted Time'].time = wastedTime;
        }

        if (scheduledTime > 0) {
            if (!totals['Scheduled']) totals['Scheduled'] = { time: 0, activities: [] };
            totals['Scheduled'].time = scheduledTime;
        }
        
        const totalAccountedForTime = totalLoggedMinutes + wastedTime + scheduledTime;
        const totalMinutesInDay = 24 * 60;
        const freeTime = totalMinutesInDay - totalAccountedForTime;

        if (freeTime > 0) {
             if (!totals['Free Time']) totals['Free Time'] = { time: 0, activities: [] };
            totals['Free Time'].time = freeTime;
        }

        const PREFERRED_ORDER = ['Wasted Time', 'Free Time', 'Scheduled', 'Distractions'];

        return Object.entries(totals)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => {
                const aIndex = PREFERRED_ORDER.indexOf(a.name);
                const bIndex = PREFERRED_ORDER.indexOf(b.name);
        
                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;
                return b.time - a.time;
            });
        
    }, [schedule, currentSlot, activityDurations]);

    const handleItemClick = (item: { name: string, activities: {name: string, duration: number}[] }, event: React.MouseEvent) => {
        if (!containerRef.current) return;
        if (item.name === 'Wasted Time' || item.name === 'Free Time' || item.name === 'Scheduled') return;
        const cardRect = containerRef.current.getBoundingClientRect();
        setDetailPopupState({
            category: item.name,
            tasks: item.activities,
            x: cardRect.right + 20,
            y: cardRect.top,
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        if (detailPopupState) {
            setDetailPopupState(prev => prev ? {
                ...prev,
                x: prev.x + event.delta.x,
                y: prev.y + event.delta.y,
            } : null);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, [role="button"]')) {
            return;
        }
        setIsDragging(true);
        setDragStartOffset({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
    };
    
    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            setPosition({
            x: e.clientX - dragStartOffset.x,
            y: e.clientY - dragStartOffset.y,
            });
        }
    };
    
    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
        } else {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStartOffset]);
    
    const style: React.CSSProperties = {
        position: 'fixed',
        top: position.y,
        left: position.x,
        willChange: 'transform',
        userSelect: isDragging ? 'none' : 'auto',
    };
    
    if (!isClient) {
        return null;
    }
    
    if (timeAllocation.length === 0) {
        return null;
    }

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <motion.div
                ref={containerRef}
                style={style}
                className="fixed w-full max-w-xs z-50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                onMouseDown={handleMouseDown}
            >
                <Card className="p-4 border rounded-lg bg-card/80 backdrop-blur-sm shadow-lg">
                    <CardHeader className="p-0 mb-3 cursor-grab active:cursor-grabbing">
                        <CardTitle className="flex items-center gap-2 text-base text-primary">
                            <PieChartIcon className="h-5 w-5" />
                            Activity Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-48 pr-3">
                            <ul className="space-y-2">
                                {timeAllocation.map(item => (
                                    <li key={item.name}>
                                        <button
                                            className="flex justify-between items-center text-sm w-full text-left"
                                            onClick={(e) => handleItemClick(item, e)}
                                            disabled={item.name === 'Wasted Time' || item.name === 'Free Time' || item.name === 'Scheduled'}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${activityColorMapping[item.name] || 'bg-gray-400'}`}></div>
                                                <span className="font-medium text-foreground">{item.name}</span>
                                            </div>
                                            <span className="font-semibold text-muted-foreground">{formatMinutes(item.time)}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </motion.div>
            {detailPopupState && (
                <ActivityDetailPopup
                    popupState={detailPopupState}
                    onClose={() => setDetailPopupState(null)}
                />
            )}
        </DndContext>
    );
}
