
"use client";

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ReferenceDot } from 'recharts';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import type { MicroSkill } from '@/types/workout';

interface SpacedRepetitionModalProps {
  modalState: {
    isOpen: boolean;
    skill: MicroSkill | null;
  };
  onOpenChange: (isOpen: boolean) => void;
}

const retentionChartConfig = {
  retention: { label: "Retention", color: "hsl(var(--chart-1))" },
  projection: { label: "Projection", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const DOUBLING_INTERVALS = [1, 2, 4, 8, 16, 32, 64, 128];

const calculateRetention = (daysSinceLastReview: number, lastInterval: number): number => {
    if (daysSinceLastReview < 0) return 100;
    const strength = lastInterval > 0 ? lastInterval * 1.5 : 1; 
    const decayRate = 1 / strength;
    const retention = Math.exp(-daysSinceLastReview * decayRate) * 100;
    return Math.max(0, retention);
};

export function SpacedRepetitionModal({ modalState, onOpenChange }: SpacedRepetitionModalProps) {
  const { deepWorkDefinitions, upskillDefinitions, getDescendantLeafNodes } = useAuth();
  const { isOpen, skill } = modalState;

  const repetitionData = useMemo(() => {
    if (!skill) return null;

    const intentions = deepWorkDefinitions.filter(def => def.category === skill.name);
    const curiosities = upskillDefinitions.filter(def => def.category === skill.name);
    const deepWorkLeafNodes = intentions.flatMap(intention => getDescendantLeafNodes(intention.id, 'deepwork'));
    const upskillLeafNodes = curiosities.flatMap(curiosity => getDescendantLeafNodes(curiosity.id, 'upskill'));
    const allTrackableNodes = [...deepWorkLeafNodes, ...upskillLeafNodes];
    const fallbackNodes = [...intentions, ...curiosities];
    const completionDates = new Set<string>();
    (allTrackableNodes.length > 0 ? allTrackableNodes : fallbackNodes).forEach(node => {
      if (node.last_logged_date) completionDates.add(node.last_logged_date);
    });
    
    const sortedDates = Array.from(completionDates).map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());

    const repHistory: { date: Date, interval: number }[] = [];
    let reps = 0;
    let lastReviewDate = sortedDates.length > 0 ? sortedDates[0] : new Date();

    if (sortedDates.length > 0) {
        reps = 1;
        lastReviewDate = sortedDates[0];
        repHistory.push({ date: lastReviewDate, interval: 0 });

        for(let i = 1; i < sortedDates.length; i++) {
            const daysBetween = differenceInDays(sortedDates[i], lastReviewDate);
            if (daysBetween <= (DOUBLING_INTERVALS[reps - 1] || 128)) reps++;
            else reps = 1;
            repHistory.push({ date: sortedDates[i], interval: DOUBLING_INTERVALS[reps-1] || 128 });
            lastReviewDate = sortedDates[i];
        }
    }
    
    const nextInterval = DOUBLING_INTERVALS[reps] || 128;
    const nextReviewDate = addDays(lastReviewDate, nextInterval);

    const retentionCurve: { date: string; retention: number | null; projection: number | null; timestamp: number; }[] = [];
    const milestonePoints: { x: number; y: number; label: string }[] = [];
    
    if (repHistory.length > 0) {
        let futureReviewDate = lastReviewDate;
        for (let i = reps; i < DOUBLING_INTERVALS.length; i++) {
            futureReviewDate = addDays(futureReviewDate, DOUBLING_INTERVALS[i]);
            milestonePoints.push({
                x: futureReviewDate.getTime(),
                y: calculateRetention(DOUBLING_INTERVALS[i], DOUBLING_INTERVALS[i-1] || 0),
                label: `Review in ${DOUBLING_INTERVALS[i]} days`
            });
        }

        const lastDate = milestonePoints.length > 0 ? new Date(milestonePoints[milestonePoints.length - 1].x) : nextReviewDate;

        for (let d = repHistory[0].date; d <= lastDate; d = addDays(d, 1)) {
            const latestPastRep = [...repHistory].reverse().find(r => r.date <= d);
            if (latestPastRep) {
                const daysSince = differenceInDays(d, latestPastRep.date);
                const retention = calculateRetention(daysSince, latestPastRep.interval);
                if (d > new Date()) {
                     retentionCurve.push({ date: format(d, 'MMM d'), retention: null, projection: retention, timestamp: d.getTime() });
                } else {
                    retentionCurve.push({ date: format(d, 'MMM d'), retention, projection: null, timestamp: d.getTime() });
                }
            }
        }
    }
    
    return { retentionCurve, nextReviewDate, nextInterval, reps, milestonePoints };
  }, [skill, deepWorkDefinitions, upskillDefinitions, getDescendantLeafNodes]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Retention for: {skill?.name}</DialogTitle>
          {repetitionData && (
            <DialogDescription>
              Next review recommended on {format(repetitionData.nextReviewDate, 'PPP')} ({repetitionData.nextInterval} days). Total reps: {repetitionData.reps}.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-4">
          {repetitionData && repetitionData.retentionCurve.length > 0 ? (
             <ChartContainer config={retentionChartConfig} className="h-[300px] w-full">
               <ResponsiveContainer>
                 <LineChart data={repetitionData.retentionCurve} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM dd')} fontSize={10} />
                   <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} fontSize={10}/>
                   <Tooltip content={({ active, payload, label }) => {
                     if (active && payload && payload.length) {
                       const value = payload[0].value;
                       return (
                         <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[12rem]">
                             <p className="font-bold text-foreground">{format(new Date(label), 'PPP')}</p>
                             <p>{payload[0].name}: {value?.toFixed(0)}%</p>
                         </div>
                       )
                     }
                     return null;
                   }} />
                   <Line type="monotone" dataKey="retention" stroke="var(--color-retention)" strokeWidth={2} dot={false} name="Retention" />
                   <Line type="monotone" dataKey="projection" stroke="var(--color-projection)" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Projection" />
                   {repetitionData.milestonePoints.map((dot, i) => (
                      <ReferenceDot key={i} x={dot.x} y={dot.y} r={4} fill="var(--color-projection)" stroke="none">
                          <title>{dot.label}</title>
                      </ReferenceDot>
                  ))}
                 </LineChart>
               </ResponsiveContainer>
             </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground text-center">Log a deep work or upskill session for this micro-skill to start tracking retention.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
