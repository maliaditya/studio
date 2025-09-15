
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

const retentionChartConfig = {
  retention: { label: "Retention", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const DOUBLING_INTERVALS = [1, 2, 4, 8, 16, 32, 64, 128];

// Ebbinghaus Forgetting Curve: R = e^(-t/S)
const calculateRetention = (daysSinceLastReview: number, lastInterval: number): number => {
    if (daysSinceLastReview < 0) return 100;
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
            repHistor