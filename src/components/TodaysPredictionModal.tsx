
"use client";

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, startOfDay, isSameDay } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, CartesianGrid } from 'recharts';

export function TodaysPredictionModal() {
  const { isTodaysPredictionModalOpen, setIsTodaysPredictionModalOpen, habitCards, mechanismCards } = useAuth();

  const predictionData = useMemo(() => {
    const today = startOfDay(new Date());
    const fiveDaysAgo = subDays(today, 5);

    const hourlyCounts: { [hour: number]: { urges: number; resistances: number } } = {};
    for (let i = 0; i < 24; i++) {
      hourlyCounts[i] = { urges: 0, resistances: 0 };
    }

    let totalDaysWithData = 0;
    const datesWithData = new Set<string>();

    const allLinks: { stopper: any; isUrge: boolean }[] = [];
    habitCards.forEach(habit => {
      (habit.urges || []).forEach(stopper => allLinks.push({ stopper, isUrge: true }));
      (habit.resistances || []).forEach(stopper => allLinks.push({ stopper, isUrge: false }));
    });

    allLinks.forEach(link => {
      (link.stopper.timestamps || []).forEach((ts: number) => {
        const eventDate = new Date(ts);
        if (eventDate >= fiveDaysAgo && eventDate < today) {
          const dateString = eventDate.toISOString().split('T')[0];
          datesWithData.add(dateString);
          const hour = eventDate.getHours();
          if (link.isUrge) {
            hourlyCounts[hour].urges += 1;
          } else {
            hourlyCounts[hour].resistances += 1;
          }
        }
      });
    });

    totalDaysWithData = datesWithData.size > 0 ? datesWithData.size : 1;

    return Object.entries(hourlyCounts).map(([hour, counts]) => ({
      hour: parseInt(hour),
      name: `${parseInt(hour) % 12 === 0 ? 12 : parseInt(hour) % 12}${parseInt(hour) < 12 ? 'am' : 'pm'}`,
      urges: parseFloat((counts.urges / totalDaysWithData).toFixed(2)),
      resistances: parseFloat((counts.resistances / totalDaysWithData).toFixed(2)),
    }));
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
            Based on your logged urges and resistances from the last 5 days.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <h3 className="font-semibold mb-2">Predicted Hourly Hotspots</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer>
              <BarChart data={predictionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} interval={1} />
                <YAxis fontSize={10} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="p-2 bg-background border rounded-md text-xs shadow-lg">
                          <p className="font-bold">{label}</p>
                          <p className="text-red-500">Urges: {payload[0].value} (avg)</p>
                          <p className="text-blue-500">Resistances: {payload[1].value} (avg)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="urges" fill="#ef4444" name="Avg Urges" />
                <Bar dataKey="resistances" fill="#3b82f6" name="Avg Resistances" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
