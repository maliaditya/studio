
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { CalendarIcon, TrendingUp, Activity, Target } from 'lucide-react';
import type { WeightLog } from '@/types/workout';
import { format, addWeeks, setISOWeek, startOfISOWeek, getISOWeekYear, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface WeightGoalCardProps {
  weightLogs: WeightLog[];
  goalWeight: number | null;
  onLogWeight: (weight: number, date: Date) => void;
}

export function WeightGoalCard({ weightLogs, goalWeight, onLogWeight }: WeightGoalCardProps) {
    const { toast } = useToast();
    const [newWeight, setNewWeight] = useState('');
    const [weightDate, setWeightDate] = useState<Date | undefined>(new Date());
    const [showLogForm, setShowLogForm] = useState(false);

    useEffect(() => {
        if (!weightLogs || weightLogs.length === 0) {
            setShowLogForm(true);
            return;
        }

        const sortedLogs = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
        const lastLog = sortedLogs[sortedLogs.length - 1];
        
        const [year, weekNum] = lastLog.date.split('-W');
        const lastLogDate = startOfISOWeek(setISOWeek(new Date(parseInt(year), 0, 4), parseInt(weekNum)));
        
        if (differenceInDays(new Date(), lastLogDate) >= 7) {
            setShowLogForm(true);
        } else {
            setShowLogForm(false);
        }
    }, [weightLogs]);

    const projectionSummary = useMemo(() => {
        if (!goalWeight || !weightLogs || weightLogs.length < 2) {
            return null;
        }

        const sortedLogs = weightLogs
            .map(log => {
                const [year, weekNum] = log.date.split('-W');
                const dateObj = startOfISOWeek(setISOWeek(new Date(parseInt(year), 0, 4), parseInt(weekNum)));
                return { ...log, dateObj };
            })
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

        const weightChartData = sortedLogs.map((log, index, arr) => {
            let weeklyChange = null;
            if (index > 0) {
                const prevWeight = arr[index - 1].weight;
                weeklyChange = log.weight - prevWeight;
            }
            return {
                weight: log.weight,
                dateObj: log.dateObj,
                weeklyChange: weeklyChange,
            };
        });

        const lastLog = weightChartData[weightChartData.length - 1];
        if (!lastLog) return null;

        const currentWeight = lastLog.weight;
        const weightDifference = goalWeight - currentWeight;

        const changes = weightChartData
            .map(d => d.weeklyChange)
            .filter((c): c is number => c !== null && c !== 0);

        let averageWeeklyChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;

        const baseSummary = {
            currentWeight: parseFloat(currentWeight.toFixed(1)),
            goalWeight,
            weightDifference: parseFloat(weightDifference.toFixed(1)),
            averageWeeklyChange: parseFloat(averageWeeklyChange.toFixed(2)),
        };

        let projectionRate = averageWeeklyChange;
        if (weightDifference < 0) { // Need to lose weight
            if (projectionRate >= 0) projectionRate = -0.5; // Assume 0.5 kg/lb loss per week if current trend is gain/stagnant
        } else { // Need to gain weight
            if (projectionRate <= 0) projectionRate = 0.25; // Assume 0.25 kg/lb gain per week
        }

        if (Math.abs(projectionRate) < 0.01) {
            return baseSummary;
        }

        const weeksToGo = Math.ceil(Math.abs(weightDifference / projectionRate));
        if (weeksToGo <= 0 || weeksToGo > 520) { // Cap at 10 years
            return baseSummary;
        }

        const projectedDate = addWeeks(lastLog.dateObj, weeksToGo);
        const nextProjectedWeight = currentWeight + projectionRate;
        const nextWeekDate = addWeeks(lastLog.dateObj, 1);
        const daysToNextWeek = differenceInDays(nextWeekDate, new Date());
        const daysToGoal = differenceInDays(projectedDate, new Date());

        return {
            ...baseSummary,
            projectedDate: format(projectedDate, 'PPP'),
            nextProjectedWeight: parseFloat(nextProjectedWeight.toFixed(1)),
            weeksToGo,
            daysToNextWeek,
            daysToGoal,
        };
    }, [goalWeight, weightLogs]);

    const handleLogWeightClick = () => {
        const weightValue = parseFloat(newWeight);
        if (!isNaN(weightValue) && weightValue > 0 && weightDate) {
          onLogWeight(weightValue, weightDate);
          setNewWeight('');
          setShowLogForm(false); // Hide form after logging
          toast({ title: "Weight Logged", description: `Your weight has been recorded for this week.` });
        } else {
          toast({ title: "Invalid Input", description: "Please enter a valid weight and select a date.", variant: "destructive" });
        }
    };

    return (
        <Card className="h-full bg-card/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                    <Target /> Weight Goal
                </CardTitle>
            </CardHeader>
            <CardContent>
                {projectionSummary && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            <div>
                                <div className="text-muted-foreground">Current</div>
                                <div className="font-bold text-lg">{projectionSummary.currentWeight}</div>
                                <div className="text-xs text-muted-foreground">kg/lb</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Goal</div>
                                <div className="font-bold text-lg">{projectionSummary.goalWeight}</div>
                                <div className="text-xs text-muted-foreground">kg/lb</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">{projectionSummary.weightDifference > 0 ? "To Gain" : "To Lose"}</div>
                                <div className={`font-bold text-lg ${projectionSummary.weightDifference > 0 ? "text-orange-500" : "text-green-500"}`}>{Math.abs(projectionSummary.weightDifference)}</div>
                                <div className="text-xs text-muted-foreground">kg/lb</div>
                            </div>
                        </div>

                        <Separator />
                        
                        <div className="space-y-2 text-sm">
                            {projectionSummary.averageWeeklyChange !== undefined && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4" /> Avg. Weekly Change</span>
                                <span className={`font-bold ${projectionSummary.averageWeeklyChange > 0 ? "text-orange-500" : projectionSummary.averageWeeklyChange < 0 ? "text-green-500" : ""}`}>
                                    {projectionSummary.averageWeeklyChange > 0 ? '+' : ''}{projectionSummary.averageWeeklyChange.toFixed(2)} kg/lb
                                </span>
                            </div>
                            )}
                            {projectionSummary.projectedDate && (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Next Week Est.</span>
                                    <span className="font-bold">{projectionSummary.nextProjectedWeight} kg/lb</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground pl-6">Days Remaining</span>
                                    <span className="font-bold">{projectionSummary.daysToNextWeek > 0 ? `${projectionSummary.daysToNextWeek} days` : 'Past'}</span>
                                </div>
                                <Separator className="my-2"/>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Est. Goal Date</span>
                                    <span className="font-bold">{projectionSummary.projectedDate}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground pl-6">Days Remaining</span>
                                    <span className="font-bold">{projectionSummary.daysToGoal > 0 ? `${projectionSummary.daysToGoal} days` : 'N/A'}</span>
                                </div>
                            </>
                            )}
                        </div>
                    </div>
                )}

                {showLogForm && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                        <CardDescription>It's time for your weekly weigh-in.</CardDescription>
                        <div className="flex gap-2 items-center">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-auto justify-start text-left font-normal h-9", !weightDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {weightDate ? format(weightDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={weightDate} onSelect={(date) => date && setWeightDate(date)} initialFocus /></PopoverContent>
                            </Popover>
                            <Input
                                type="number"
                                placeholder="Weight (kg/lb)"
                                value={newWeight}
                                onChange={(e) => setNewWeight(e.target.value)}
                                className="h-9 flex-grow"
                            />
                        </div>
                         <Button onClick={handleLogWeightClick} disabled={!newWeight || !weightDate} className="w-full">Log Weight</Button>
                    </div>
                )}
                
                {!projectionSummary && !showLogForm && (
                     <p className="text-sm text-muted-foreground text-center py-8">
                        Log weight for at least two weeks and set a goal to see projections.
                     </p>
                )}
            </CardContent>
        </Card>
    );
}
