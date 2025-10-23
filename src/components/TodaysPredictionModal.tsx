
"use client";

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, startOfDay, isSameDay } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Activity, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { format } from 'date-fns';

export function TodaysPredictionModal() {
  const { isTodaysPredictionModalOpen, setIsTodaysPredictionModalOpen, habitCards } = useAuth();

  const predictionData = useMemo(() => {
    const today = startOfDay(new Date());
    const fiveDaysAgo = subDays(today, 5);

    const predictions: { time: Date; text: string; type: 'Urge' | 'Resistance'; originalDate: string }[] = [];

    const allLinks: { stopper: any; isUrge: boolean }[] = [];
    habitCards.forEach(habit => {
      (habit.urges || []).forEach(stopper => allLinks.push({ stopper, isUrge: true }));
      (habit.resistances || []).forEach(stopper => allLinks.push({ stopper, isUrge: false }));
    });

    allLinks.forEach(link => {
      (link.stopper.timestamps || []).forEach((ts: number) => {
        const eventDate = new Date(ts);
        if (eventDate >= fiveDaysAgo && eventDate < today) {
          const predictionTime = new Date(); // Today's date
          predictionTime.setHours(eventDate.getHours(), eventDate.getMinutes(), 0, 0);

          predictions.push({
            time: predictionTime,
            text: link.stopper.text,
            type: link.isUrge ? 'Urge' : 'Resistance',
            originalDate: format(eventDate, 'MMM d'),
          });
        }
      });
    });

    // Sort by time of day
    return predictions.sort((a, b) => a.time.getTime() - b.time.getTime());

  }, [habitCards]);

  return (
    <Dialog open={isTodaysPredictionModalOpen} onOpenChange={setIsTodaysPredictionModalOpen}>
      <DialogContent className="sm:max-w-2xl">
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
                                    <span className={`px-2 py-1 text-xs rounded-full ${item.type === 'Urge' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
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
