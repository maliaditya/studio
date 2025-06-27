
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { CalendarIcon, TrendingUp, Activity, Target, Save } from 'lucide-react';
import type { WeightLog, Gender } from '@/types/workout';
import { format, addWeeks, setISOWeek, startOfISOWeek, getISOWeekYear, differenceInDays, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';


interface WeightGoalCardProps {
  weightLogs: WeightLog[];
  goalWeight: number | null;
  onLogWeight: (weight: number, date: Date) => void;
  height: number | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  onSetHeight: (height: number | null) => void;
  onSetDateOfBirth: (dob: string | null) => void;
  onSetGender: (gender: Gender | null) => void;
  onSetGoalWeight: (goal: number | null) => void;
}

export function WeightGoalCard({ 
    weightLogs, 
    goalWeight, 
    onLogWeight,
    height,
    dateOfBirth,
    gender,
    onSetHeight,
    onSetDateOfBirth,
    onSetGender,
    onSetGoalWeight
}: WeightGoalCardProps) {
    const { toast } = useToast();
    const [newWeight, setNewWeight] = useState('');
    const [weightDate, setWeightDate] = useState<Date | undefined>(new Date());
    const [showLogForm, setShowLogForm] = useState(false);

    const [heightInput, setHeightInput] = useState('');
    const [dobInput, setDobInput] = useState<Date | undefined>();
    const [genderInput, setGenderInput] = useState<Gender | null>(null);
    const [goalWeightInput, setGoalWeightInput] = useState('');

    const areDetailsSet = height && dateOfBirth && gender;

    useEffect(() => {
        if (!areDetailsSet) {
            setHeightInput(height ? String(height) : '');
            setDobInput(dateOfBirth ? parseISO(dateOfBirth) : undefined);
            setGenderInput(gender || null);
            setGoalWeightInput(goalWeight ? String(goalWeight) : '');
        }
    }, [height, dateOfBirth, gender, goalWeight, areDetailsSet]);


    useEffect(() => {
        if (!areDetailsSet) return;
        
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
    }, [weightLogs, areDetailsSet]);

    const projectionSummary = useMemo(() => {
        if (!areDetailsSet || !goalWeight || !weightLogs || weightLogs.length < 2) {
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
    }, [goalWeight, weightLogs, areDetailsSet]);

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
    
    const handleSaveDetails = () => {
        let hasError = false;

        if (heightInput) {
            const h = parseFloat(heightInput);
            if (!isNaN(h) && h > 0) {
                onSetHeight(h);
            } else {
                toast({ title: "Invalid Height", description: "Please enter a valid number.", variant: "destructive" });
                hasError = true;
            }
        } else {
            onSetHeight(null);
            toast({ title: "Missing Detail", description: "Please enter your height.", variant: "destructive" });
            hasError = true;
        }

        if (dobInput) {
            onSetDateOfBirth(format(dobInput, 'yyyy-MM-dd'));
        } else {
            onSetDateOfBirth(null);
            toast({ title: "Missing Detail", description: "Please enter your date of birth.", variant: "destructive" });
            hasError = true;
        }

        if (genderInput) {
            onSetGender(genderInput);
        } else {
            onSetGender(null);
            toast({ title: "Missing Detail", description: "Please select your gender.", variant: "destructive" });
            hasError = true;
        }
        
        if (hasError) return;

        if (goalWeightInput) {
            const goal = parseFloat(goalWeightInput);
            if (!isNaN(goal) && goal > 0) {
                onSetGoalWeight(goal);
            } else {
                toast({ title: "Invalid Goal Weight", description: "Please enter a valid number.", variant: "destructive" });
                return;
            }
        } else {
            onSetGoalWeight(null);
        }

        toast({ title: "Details Saved", description: "Your profile has been updated." });
    };

    return (
        <Card className="h-full bg-card/50">
            {areDetailsSet ? (
                <>
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
                </>
            ) : (
                 <>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary"><Target/> Your Details</CardTitle>
                        <CardDescription>Provide these details for accurate health and goal projections.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs text-muted-foreground">Gender (for BMR)</Label>
                                <RadioGroup
                                    value={genderInput || ""}
                                    onValueChange={(value) => setGenderInput(value as Gender)}
                                    className="flex gap-4 pt-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="male" id="gender-male-home" />
                                        <Label htmlFor="gender-male-home" className="font-normal">Male</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="female" id="gender-female-home" />
                                        <Label htmlFor="gender-female-home" className="font-normal">Female</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                            <div>
                                <Label htmlFor="dob-input-home" className="text-xs text-muted-foreground">Date of Birth</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button id="dob-input-home" variant={"outline"} className={cn("h-9 w-full justify-start text-left font-normal", !dobInput && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dobInput ? format(dobInput, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={dobInput}
                                        onSelect={setDobInput}
                                        captionLayout="dropdown-buttons"
                                        fromYear={1950}
                                        toYear={new Date().getFullYear()}
                                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label htmlFor="height-input-home" className="text-xs text-muted-foreground">Height (cm)</Label>
                                <Input
                                    id="height-input-home"
                                    type="number"
                                    placeholder="e.g., 180"
                                    value={heightInput}
                                    onChange={(e) => setHeightInput(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div>
                                <Label htmlFor="goal-weight-input-home" className="text-xs text-muted-foreground">Goal Weight (kg/lb)</Label>
                                <Input
                                    id="goal-weight-input-home"
                                    type="number"
                                    placeholder="e.g., 75 (Optional)"
                                    value={goalWeightInput}
                                    onChange={(e) => setGoalWeightInput(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSaveDetails}>
                                <Save className="mr-2 h-4 w-4"/>
                                Save Details
                            </Button>
                        </div>
                    </CardContent>
                </>
            )}
        </Card>
    );
}
