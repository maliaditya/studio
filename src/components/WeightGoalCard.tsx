

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';
import { CalendarIcon, TrendingUp, Activity, Target, Save, LineChart as LineChartIcon, Utensils, Expand } from 'lucide-react';
import type { WeightLog, Gender, UserDietPlan } from '@/types/workout';
import { format, addWeeks, setISOWeek, startOfISOWeek, getISOWeekYear, differenceInDays, parseISO, isAfter, startOfToday, isBefore } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ChartContainer, ChartConfig } from './ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

interface WeightGoalCardProps {
  weightLogs: WeightLog[];
  goalWeight: number | null;
  height: number | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  onSetHeight: (height: number | null) => void;
  onSetDateOfBirth: (dob: string | null) => void;
  onSetGender: (gender: Gender | null) => void;
  onSetGoalWeight: (goal: number | null) => void;
  onLogWeight: (weight: number, date: Date) => void;
  dietPlan: UserDietPlan;
  onEditDietClick: () => void;
  onOpenChartModal: () => void;
}

const weightChartConfig = {
  historicalWeight: { label: "Weight", color: "hsl(var(--chart-2))" },
  projectedWeight: { label: "Projection", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const SimpleTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const value = data.historicalWeight ?? data.projectedWeight;
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{format(data.dateObj, 'PPP')}</span>
                    <span className="font-bold">{value.toFixed(1)} kg/lb</span>
                </div>
            </div>
        );
    }
    return null;
}

export function WeightGoalCard({ 
    weightLogs, 
    goalWeight, 
    height,
    dateOfBirth,
    gender,
    onSetHeight,
    onSetDateOfBirth,
    onSetGender,
    onSetGoalWeight,
    onLogWeight,
    dietPlan,
    onEditDietClick,
    onOpenChartModal,
}: WeightGoalCardProps) {
    const { toast } = useToast();
    
    const [weightView, setWeightView] = useState<'details' | 'chart'>('details');
    
    const [heightInput, setHeightInput] = useState('');
    const [dobInput, setDobInput] = useState<Date | undefined>();
    const [genderInput, setGenderInput] = useState<Gender | null>(null);
    const [goalWeightInput, setGoalWeightInput] = useState('');
    const [newWeight, setNewWeight] = useState('');

    const areDetailsSet = height && dateOfBirth && gender;

    useEffect(() => {
        if (!areDetailsSet) {
            setHeightInput(height ? String(height) : '');
            setDobInput(dateOfBirth ? parseISO(dateOfBirth) : undefined);
            setGenderInput(gender || null);
            setGoalWeightInput(goalWeight ? String(goalWeight) : '');
        }
    }, [height, dateOfBirth, gender, goalWeight, areDetailsSet]);


    const weightChartData = useMemo(() => {
        if (!weightLogs) return [];
        const sortedLogs = weightLogs
        .map(log => {
            const [year, weekNum] = log.date.split('-W');
            const dateObj = startOfISOWeek(setISOWeek(new Date(parseInt(year), 0, 4), parseInt(weekNum)));
            return { ...log, dateObj };
        })
        .sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());

        return sortedLogs.map((log, index, arr) => {
            let weeklyChange = null;
            if (index > 0) {
                const prevWeight = arr[index - 1].weight;
                weeklyChange = log.weight - prevWeight;
            }

            return {
                weight: log.weight,
                fullWeek: log.date,
                dateObj: log.dateObj,
                weeklyChange: weeklyChange,
                timestamp: log.dateObj.getTime(),
            }
        });
    }, [weightLogs]);

    const combinedChartData = useMemo(() => {
        let allData = weightChartData.map(log => ({
            ...log,
            historicalWeight: log.weight,
            projectedWeight: null,
            isProjection: false,
        }));

        if (!goalWeight || weightChartData.length < 1) {
            return allData;
        }
        
        const lastLog = weightChartData[weightChartData.length - 1];
        const weightToChange = goalWeight - lastLog.weight;
        
        if (Math.abs(weightToChange) < 0.1) return allData;

        const changes = weightChartData
            .map(d => d.weeklyChange)
            .filter((c): c is number => c !== null && c !== 0);
        
        let averageWeeklyChange = changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;

        let projectionRate = averageWeeklyChange;

        if (weightToChange < 0) { 
            if (projectionRate >= 0) projectionRate = -0.5;
        } else {
            if (projectionRate <= 0) projectionRate = 0.25;
        }
        
        if (Math.abs(projectionRate) < 0.01) return allData;

        const weeksToGo = Math.ceil(Math.abs(weightToChange / projectionRate));
        if (weeksToGo <= 0 || weeksToGo > 520) { // Cap at 10 years
            return allData;
        }
        
        const lastLogIndex = allData.findIndex(d => d.timestamp === lastLog.timestamp);
        if (lastLogIndex !== -1) {
            allData[lastLogIndex].projectedWeight = lastLog.weight;
        }

        for (let i = 1; i <= weeksToGo; i++) {
            const projectedDate = addWeeks(lastLog.dateObj, i);
            const projectedWeight = lastLog.weight + (i * projectionRate);
            const daysToGo = differenceInDays(projectedDate, new Date());

            allData.push({
                weight: null,
                historicalWeight: null,
                projectedWeight: parseFloat(projectedWeight.toFixed(1)),
                timestamp: projectedDate.getTime(),
                dateObj: projectedDate,
                isProjection: true,
                daysToGo: daysToGo,
                rate: Math.abs(projectionRate),
                weeklyChange: null,
                fullWeek: null
            });
        }
        
        if (allData.length > weightChartData.length) {
            const lastPoint = allData[allData.length - 1];
            lastPoint.projectedWeight = goalWeight;
        }

        return allData;
    }, [goalWeight, weightChartData]);


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
        
        return {
            ...baseSummary,
            projectedDate: format(projectedDate, 'PPP'),
            nextProjectedWeight: parseFloat(nextProjectedWeight.toFixed(1)),
        };
    }, [goalWeight, weightLogs, areDetailsSet]);

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
            onSetGoalWeight(null); // Allow clearing the goal
        }

        toast({ title: "Details Saved", description: "Your profile has been updated." });
    };

    const handleLogWeightClick = () => {
        const weightValue = parseFloat(newWeight);
        if (isNaN(weightValue) || weightValue <= 0) {
            toast({ title: "Invalid Weight", description: "Please enter a valid weight.", variant: "destructive" });
            return;
        }
        onLogWeight(weightValue, new Date());
        setNewWeight('');
    };

    const renderWeightContent = () => {
        if (weightView === 'chart') {
            return (
                <div className="h-[250px] w-full -ml-4">
                   {combinedChartData.length < 1 ? (
                       <div className="flex justify-center items-center h-full text-muted-foreground text-sm">
                           Log weight to see chart.
                       </div>
                   ) : (
                        <ChartContainer config={weightChartConfig} className="min-h-[250px] w-full">
                            <ResponsiveContainer>
                                <LineChart accessibilityLayer data={combinedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5, }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM dd')} tickLine={false} axisLine={false} tickMargin={8} fontSize={10}/>
                                    <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={['dataMin - 2', 'dataMax + 2']} fontSize={10} />
                                    <RechartsTooltip cursor={true} content={<SimpleTooltip />} />
                                    {goalWeight !== null && <ReferenceLine y={goalWeight} stroke="hsl(var(--primary))" strokeDasharray="4 4" />}
                                    <Line dataKey="historicalWeight" type="monotone" stroke="var(--color-historicalWeight)" strokeWidth={2} dot={true} name="Weight" connectNulls={false} />
                                    <Line dataKey="projectedWeight" type="monotone" stroke="var(--color-projectedWeight)" strokeDasharray="5 5" strokeWidth={2} dot={{r: 4}} name="Projection" connectNulls={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                   )}
               </div>
            );
        }

        if (projectionSummary) {
            return (
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
                        {projectionSummary.nextProjectedWeight && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Next Week Est.</span>
                                <span className="font-bold">{projectionSummary.nextProjectedWeight} kg/lb</span>
                            </div>
                        )}
                        {projectionSummary.projectedDate && (
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Est. Goal Date</span>
                                <span className="font-bold">{projectionSummary.projectedDate}</span>
                            </div>
                        )}
                    </div>
                </div>
            )
        }
        
        return (
            <p className="text-sm text-muted-foreground text-center py-8">
                Log weight for at least two weeks and set a goal to see projections.
            </p>
        );
    };

    return (
        <Card className="bg-card/50">
            {areDetailsSet ? (
                <>
                    <CardHeader className="flex flex-row items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <Target />
                                Weight Goal
                            </CardTitle>
                            <CardDescription>Your weekly weight trend and projections.</CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" onClick={onOpenChartModal} className="h-8 w-8"><Expand className="h-4 w-4" /></Button>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => setWeightView(v => v === 'chart' ? 'details' : 'chart')}
                                className="h-8 w-8"
                            >
                                {weightView === 'chart' ? <Activity className="h-4 w-4" /> : <LineChartIcon className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {renderWeightContent()}
                    </CardContent>
                    <CardFooter className="pt-4">
                        <div className="flex gap-2 w-full">
                            <Input
                                type="number"
                                placeholder="Log this week's weight..."
                                value={newWeight}
                                onChange={e => setNewWeight(e.target.value)}
                                className="h-9"
                            />
                            <Button onClick={handleLogWeightClick} disabled={!newWeight} className="h-9">Log</Button>
                        </div>
                    </CardFooter>
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
