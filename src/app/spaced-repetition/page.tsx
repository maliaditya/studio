
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BookCopy, BrainCircuit } from 'lucide-react';
import { format, parseISO, differenceInDays, addDays, startOfDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import type { RepetitionData } from '@/types/workout';

const retentionChartConfig = {
  retention: { label: "Retention", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const DOUBLING_INTERVALS = [1, 2, 4, 8, 16, 32, 64, 128];

// Ebbinghaus Forgetting Curve: R = e^(-t/S)
// We'll model S (memory strength) as being proportional to the interval.
// A larger interval means stronger memory and slower decay.
const calculateRetention = (daysSinceLastReview: number, lastInterval: number): number => {
    if (daysSinceLastReview < 0) return 100;
    // The "strength" of the memory. A longer interval means a stronger memory.
    // We add 1 to avoid division by zero and to make the initial decay faster.
    const strength = lastInterval + 1; 
    const decayRate = 1 / strength;
    const retention = Math.exp(-daysSinceLastReview * decayRate) * 100;
    return retention;
};


function SpacedRepetitionPageContent() {
  const { coreSkills, deepWorkDefinitions, getDeepWorkNodeType } = useAuth();

  const repetitionData = useMemo(() => {
    const microSkillsForRepetition = coreSkills
      .flatMap(cs => cs.skillAreas.flatMap(sa => sa.microSkills))
      .filter(ms => ms.isReadyForRepetition);

    return microSkillsForRepetition.map(skill => {
        const intentions = deepWorkDefinitions.filter(def => 
            def.category === skill.name && getDeepWorkNodeType(def) === 'Intention'
        );

        // Get all unique completion dates from all intentions for this skill
        const completionDates = new Set<string>();
        intentions.forEach(intention => {
            if (intention.last_logged_date) {
                completionDates.add(intention.last_logged_date);
            }
        });

        const sortedDates = Array.from(completionDates).map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());

        const repHistory: { date: Date, interval: number }[] = [];
        let reps = 0;
        let lastReviewDate = sortedDates.length > 0 ? sortedDates[0] : new Date();

        sortedDates.forEach((date, index) => {
            const interval = DOUBLING_INTERVALS[reps] || DOUBLING_INTERVALS[DOUBLING_INTERVALS.length - 1];
            const nextReviewDate = addDays(lastReviewDate, interval);

            // If the review happened on or after the scheduled date, it's a success
            if (date >= startOfDay(nextReviewDate) || index === 0) {
                reps++;
            } else { // Failed recall, reset
                reps = 1;
            }
            lastReviewDate = date;
            repHistory.push({ date, interval: DOUBLING_INTERVALS[reps - 1] });
        });
        
        const lastRep = repHistory[repHistory.length - 1];
        const nextInterval = DOUBLING_INTERVALS[reps] || null;
        const nextReviewDate = lastRep && nextInterval ? addDays(lastRep.date, nextInterval) : null;
        
        // Generate graph data
        const graphData: { date: string, retention: number }[] = [];
        if(sortedDates.length > 0) {
            const firstDate = sortedDates[0];
            const today = new Date();
            const endDate = nextReviewDate && nextReviewDate > today ? addDays(nextReviewDate, 7) : addDays(today, 7);
            
            let lastDate = firstDate;
            let lastIntervalForDecay = 1;

            repHistory.forEach(rep => {
                const daysBetween = differenceInDays(rep.date, lastDate);
                for (let i = 0; i < daysBetween; i++) {
                    const currentDate = addDays(lastDate, i);
                    graphData.push({
                        date: format(currentDate, 'yyyy-MM-dd'),
                        retention: calculateRetention(i, lastIntervalForDecay),
                    });
                }
                graphData.push({
                    date: format(rep.date, 'yyyy-MM-dd'),
                    retention: 100, // Spike to 100 on review
                });
                lastDate = rep.date;
                lastIntervalForDecay = rep.interval;
            });

            // Project decay from the last review date to the end date
             const daysSinceLast = differenceInDays(endDate, lastDate);
             for (let i = 1; i <= daysSinceLast; i++) {
                const currentDate = addDays(lastDate, i);
                graphData.push({
                    date: format(currentDate, 'yyyy-MM-dd'),
                    retention: calculateRetention(i, lastIntervalForDecay),
                });
            }
        }

        return {
            skillId: skill.id,
            skillName: skill.name,
            reps,
            nextReviewDate,
            graphData
        };

    });
  }, [coreSkills, deepWorkDefinitions, getDeepWorkNodeType]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Spaced Repetition</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Review your marked micro-skills to strengthen your memory and knowledge retention.
        </p>
      </div>
      
      {repetitionData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repetitionData.map(data => (
            <Card key={data.skillId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-blue-500" />{data.skillName}</CardTitle>
                <CardDescription>
                  {data.nextReviewDate 
                    ? `Next review due on ${format(data.nextReviewDate, 'MMM d, yyyy')}` 
                    : `Repetition cycle complete.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={retentionChartConfig} className="h-48 w-full">
                    <ResponsiveContainer>
                        <LineChart data={data.graphData} margin={{ top: 5, right: 20, left: -20, bottom: -10 }}>
                             <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                             <XAxis 
                                dataKey="date" 
                                tickFormatter={(tick) => format(parseISO(tick), 'MMM d')}
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                interval="preserveStartEnd"
                                tickCount={5}
                             />
                             <YAxis domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} fontSize={10} tickLine={false} axisLine={false} />
                             <RechartsTooltip 
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                        <div className="p-2 bg-background border rounded-md text-xs shadow-lg">
                                            <p className="font-bold">{format(parseISO(label), 'PPP')}</p>
                                            <p>Retention: {payload[0].value?.toFixed(0)}%</p>
                                        </div>
                                        )
                                    }
                                    return null;
                                }}
                             />
                             {data.nextReviewDate && (
                                <ReferenceLine x={format(data.nextReviewDate, 'yyyy-MM-dd')} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                             )}
                             <Line type="monotone" dataKey="retention" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-8">
            <CardContent className="p-8 text-center text-muted-foreground">
                <p>You haven't marked any "Micro-Skills" for repetition yet.</p>
                <p className="mt-2">Go to the Skill page and check the box next to a micro-skill to begin.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SpacedRepetitionPage() {
  return (
    <AuthGuard>
      <SpacedRepetitionPageContent />
    </AuthGuard>
  );
}
