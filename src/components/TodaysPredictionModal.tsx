
"use client";

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, startOfDay, format } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { AlertTriangle, Briefcase } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import type { Stopper, DailySchedule, Activity } from '@/types/workout';

const slotOrder: { name: string; startHour: number; endHour: number }[] = [
    { name: 'Late Night', startHour: 0, endHour: 4 },
    { name: 'Dawn', startHour: 4, endHour: 8 },
    { name: 'Morning', startHour: 8, endHour: 12 },
    { name: 'Afternoon', startHour: 12, endHour: 16 },
    { name: 'Evening', startHour: 16, endHour: 20 },
    { name: 'Night', startHour: 20, endHour: 24 },
];

export function TodaysPredictionModal() {
  const { isTodaysPredictionModalOpen, setIsTodaysPredictionModalOpen, habitCards, mechanismCards, schedule } = useAuth();

  const predictionData = useMemo(() => {
    const today = startOfDay(new Date());
    const fiveDaysAgo = subDays(today, 5);
    const todayKey = format(today, 'yyyy-MM-dd');
    const todaysSchedule = schedule[todayKey] || {};

    const predictions: {
      time: Date;
      text: string;
      type: 'Urge' | 'Resistance';
      originalDate: string;
      scheduledTasks: Activity[];
    }[] = [];

    const allLinks: { stopper: Stopper; isUrge: boolean }[] = [];
    
    habitCards.forEach(habit => {
      const negativeMechanism = mechanismCards.find(m => m.id === habit.response?.resourceId);
      (negativeMechanism?.urges || []).forEach(stopper => allLinks.push({ stopper, isUrge: true }));
      (habit.urges || []).forEach(stopper => allLinks.push({ stopper, isUrge: true }));

      const positiveMechanism = mechanismCards.find(m => m.id === habit.newResponse?.resourceId);
      (positiveMechanism?.resistances || []).forEach(stopper => allLinks.push({ stopper, isUrge: false }));
      (habit.resistances || []).forEach(stopper => allLinks.push({ stopper, isUrge: false }));
    });

    allLinks.forEach(link => {
      (link.stopper.timestamps || []).forEach((ts: number) => {
        const eventDate = new Date(ts);
        if (eventDate >= fiveDaysAgo && eventDate < today) {
          const predictionTime = new Date();
          predictionTime.setHours(eventDate.getHours(), eventDate.getMinutes(), 0, 0);

          const predictionHour = predictionTime.getHours();
          const relevantSlot = slotOrder.find(slot => predictionHour >= slot.startHour && predictionHour < slot.endHour);
          const scheduledTasks = relevantSlot ? (todaysSchedule[relevantSlot.name as keyof DailySchedule] as Activity[] || []) : [];

          predictions.push({
            time: predictionTime,
            text: link.stopper.text,
            type: link.isUrge ? 'Urge' : 'Resistance',
            originalDate: format(eventDate, 'MMM d'),
            scheduledTasks: scheduledTasks.filter(task => !task.completed),
          });
        }
      });
    });

    return predictions.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [habitCards, mechanismCards, schedule]);

  return (
    <Dialog open={isTodaysPredictionModalOpen} onOpenChange={setIsTodaysPredictionModalOpen}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Today's Resistance Prediction
          </DialogTitle>
          <DialogDescription>
            Based on your logged urges and resistances from the last 5 days, here's what might come up today.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <h3 className="font-semibold mb-2">Predicted Hourly Hotspots</h3>
          <ScrollArea className="h-[60vh] border rounded-md">
            {predictionData.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Time</TableHead>
                            <TableHead>Predicted Event</TableHead>
                            <TableHead>Scheduled Task</TableHead>
                            <TableHead className="w-[120px]">Type</TableHead>
                            <TableHead className="w-[100px] text-right">Source</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {predictionData.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-mono">{format(item.time, 'h:mm a')}</TableCell>
                                <TableCell className="font-medium">{item.text}</TableCell>
                                <TableCell>
                                    {item.scheduledTasks.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            {item.scheduledTasks.map(task => (
                                                <div key={task.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Briefcase className="h-3 w-3 flex-shrink-0" />
                                                    <span className="truncate" title={task.details}>{task.details}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">No tasks</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 text-xs rounded-full ${item.type === 'Urge' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                                        {item.type}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">{item.originalDate}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                    <AlertTriangle className="h-10 w-10 mb-2" />
                    <p className="font-semibold">No recent data.</p>
                    <p className="text-sm">Log some urges or resistances to see predictions here.</p>
                </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
