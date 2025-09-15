
"use client";

import React, { useMemo, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BookCopy, BrainCircuit } from 'lucide-react';
import { format, parseISO, differenceInDays, addDays, startOfDay, isBefore } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';

const retentionChartConfig = {
  retention: { label: "Retention", color: "hsl(var(--chart-1))" },
  projection: { label: "Projection", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const DOUBLING_INTERVALS = [1, 2, 4, 8, 16, 32, 64, 128];

// Ebbinghaus Forgetting Curve: R = e^(-t/S)
const calculateRetention = (daysSinceLastReview: number, lastInterval: number): number => {
    if (daysSinceLastReview < 0) return 100;
    // Strength is influenced by the previous interval. A longer interval means a stronger memory.
    const strength = lastInterval > 0 ? lastInterval * 1.5 : 1; 
    const decayRate = 1 / strength;
    const retention = Math.exp(-daysSinceLastReview * decayRate) * 100;
    return Math.max(0, retention);
};


function SpacedRepetitionPageContent() {
  const { coreSkills, deepWorkDefinitions, getDeepWorkNodeType, getDescendantLeafNodes } = useAuth();

  const repetitionData = useMemo(() => {
    const microSkillsForRepetition = coreSkills
      .flatMap(cs => cs.skillAreas.flatMap(sa => sa.microSkills))
      .filter(ms => ms.isReadyForRepetition);

    return microSkillsForRepetition.map(skill => {
        const intentions = deepWorkDefinitions.filter(def => 
            def.category === skill.name && getDeepWorkNodeType(def) === 'Intention'
        );

        const allLeafNodes = intentions.flatMap(intention => getDescendantLeafNodes(intention.id, 'deepwork'));
        
        const completionDates = new Set<string>();
        allLeafNodes.forEach(node => {
          if (node.last_logged_date) {
            completionDates.add(node.last_logged_date);
          }
        });

        const sortedDates = Array.from(completionDates).map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());

        const repHistory: { date: Date, interval: number }[] = [];
        let reps = 0;
        let lastReviewDate = sortedDates.length > 0 ? sortedDates[0] : new Date();

        if (sortedDates.length > 0) {
            reps = 1;
            lastReviewDate = sortedDates[0];
            repHistor.push({ date: lastReviewDate, interval: 0 });

            for(let i = 1; i < sortedDates.length; i++) {
                const currentReviewDate = sortedDates[i];
                const daysBetween = differenceInDays(currentReviewDate, lastReviewDate);
                
                if (daysBetween <= (DOUBLING_INTERVALS[reps - 1] || 128)) {
                    reps++;
                } else {
                    reps = 1;
                }
                repHistor.push({ date: currentReviewDate, interval: DOUBLING_INTERVALS[reps-1] || 128 });
                lastReviewDate = currentReviewDate;
            }
        }
        
        const nextInterval = DOUBLING_INTERVALS[reps] || 128;
        const nextReviewDate = addDays(lastReviewDate, nextInterval);

        const retentionCurve: { date: string; retention: number | null; projection: number | null; isReview: boolean }[] = [];
        if (repHistor.length > 0) {
            const firstDate = repHistor[0].date;
            const today = startOfDay(new Date());
            const lastDate = nextReviewDate > today ? nextReviewDate : today;
            
            for (let d = startOfDay(firstDate); d <= lastDate && isBefore(d, addDays(today, 365)); d = addDays(d, 1)) {
                let currentRep = repHistor.find(r => format(r.date, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd'));
                
                if (currentRep) {
                    retentionCurve.push({ date: format(d, 'MMM d'), retention: 100, projection: null, isReview: true });
                } else {
                    const latestPastRep = [...repHistor].reverse().find(r => r.date <= d);
                    if (latestPastRep) {
                        const daysSince = differenceInDays(d, latestPastRep.date);
                        const retention = calculateRetention(daysSince, latestPastRep.interval);
                        
                        if (d > today) {
                             retentionCurve.push({ date: format(d, 'MMM d'), retention: null, projection: retention, isReview: false });
                        } else {
                            retentionCurve.push({ date: format(d, 'MMM d'), retention, projection: null, isReview: false });
                        }
                    }
                }
            }
        }

        return {
          skill,
          retentionCurve,
          nextReviewDate,
          nextInterval,
          reps
        };
    });
  }, [coreSkills, deepWorkDefinitions, getDescendantLeafNodes, getDeepWorkNodeType]);

  if (repetitionData.length === 0) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Spaced Repetition</h1>
        <p className="text-muted-foreground">
          No micro-skills marked for repetition. Go to the <a href="/skill" className="text-primary underline">Skills</a> page and check "Ready for Repetition" on any micro-skill to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
       <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-3">
              <BrainCircuit /> Spaced Repetition Schedule
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
              Review your micro-skills to strengthen your memory retention over time.
          </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {repetitionData.map(({ skill, retentionCurve, nextReviewDate, nextInterval, reps }) => (
          <Card key={skill.id} className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookCopy className="text-primary h-5 w-5"/>
                {skill.name}
              </CardTitle>
              <CardDescription>
                Next review in {nextInterval} days on {format(nextReviewDate, 'MMM d, yyyy')}. Total reps: {reps}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {retentionCurve.length > 0 ? (
                <ChartContainer config={retentionChartConfig} className="h-[250px] w-full">
                  <ResponsiveContainer>
                    <LineChart data={retentionCurve} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={(val, index) => index % 14 === 0 ? val : ''} fontSize={10}/>
                      <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} fontSize={10}/>
                      <RechartsTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const dataPoint = payload[0];
                            const value = dataPoint.value;
                            return (
                                <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[12rem]">
                                    <div className="grid gap-1.5">
                                        <div className="flex flex-col">
                                            <span className="text-[0.7rem] uppercase text-muted-foreground">{label}</span>
                                            <span className="font-bold text-foreground">{dataPoint.name}: {value?.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            )
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="retention"
                        stroke="var(--color-retention)"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        name="Retention"
                      />
                      <Line
                        type="monotone"
                        dataKey="projection"
                        stroke="var(--color-projection)"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                        name="Projection"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Log an intention for this micro-skill to start tracking retention.
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
    return <AuthGuard><SpacedRepetitionPageContent /></AuthGuard>;
}
