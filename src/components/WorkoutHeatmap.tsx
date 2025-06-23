
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { subYears, format, addDays, parse, addWeeks, differenceInDays } from 'date-fns';
import type { DatedWorkout, WeightLog } from '@/types/workout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { LineChart as LineChartIcon, Calendar as CalendarIcon, Weight as WeightIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ChartContainer, ChartConfig } from './ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Dot } from 'recharts';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WorkoutHeatmapProps {
  allWorkoutLogs: DatedWorkout[];
  onDateSelect: (dateString: string) => void;
  weightLogs: WeightLog[];
  onLogWeight: (weight: number, date: Date) => void;
  selectedDate: Date;
}

interface HeatmapValue {
    date: string;
    count: number;
    exercises: string;
}

interface TooltipData {
    value: HeatmapValue;
    x: number;
    y: number;
}

const consistencyChartConfig = {
  score: {
    label: "Consistency",
    color: "hsl(var(--primary))",
  }
} satisfies ChartConfig;

const weightChartConfig = {
  weight: {
    label: "Weight (kg/lb)",
    color: "hsl(var(--chart-2))",
  },
  projection: {
    label: "Projection",
    color: "hsl(var(--chart-3))",
  }
} satisfies ChartConfig;


export function WorkoutHeatmap({ allWorkoutLogs, onDateSelect, weightLogs, onLogWeight, selectedDate }: WorkoutHeatmapProps) {
  const { currentUser, updateUserProfile } = useAuth();
  const { toast } = useToast();
  
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [view, setView] = useState<'heatmap' | 'graph' | 'weight'>('heatmap');
  const [newWeight, setNewWeight] = useState('');
  const [weightDate, setWeightDate] = useState<Date | undefined>();
  
  const [isSettingHeight, setIsSettingHeight] = useState(false);
  const [heightInput, setHeightInput] = useState('');

  const [today, setToday] = useState<Date | null>(null);
  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setWeightDate(now);
    setOneYearAgo(subYears(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1));
  }, []);

  useEffect(() => {
    if (view === 'weight' && currentUser && !currentUser.heightInCm) {
        setIsSettingHeight(true);
    } else {
        setIsSettingHeight(false);
    }
  }, [view, currentUser]);


  const heatmapValues: HeatmapValue[] = useMemo(() => allWorkoutLogs
    .filter(log => log.exercises.some(ex => ex.loggedSets.length > 0))
    .map(log => {
      const totalSets = log.exercises.reduce((sum, ex) => sum + ex.loggedSets.length, 0);
      const exercisesPerformed = log.exercises
        .filter(ex => ex.loggedSets.length > 0)
        .map(ex => ex.name)
        .slice(0, 3) 
        .join(', ');
        
      return {
        date: log.date,
        count: totalSets,
        exercises: exercisesPerformed,
      };
    }), [allWorkoutLogs]);

    const consistencyData = useMemo(() => {
        if (!allWorkoutLogs || !oneYearAgo || !today) return [];
    
        const workoutDates = new Set(
          allWorkoutLogs
            .filter(log => log.exercises.some(ex => ex.loggedSets.length > 0))
            .map(log => log.date)
        );
    
        const data = [];
        let score = 0.5;
    
        for (let d = new Date(oneYearAgo); d <= today; d = addDays(d, 1)) {
            const dateKey = format(d, 'yyyy-MM-dd');
            
            if (workoutDates.has(dateKey)) {
                score += (1 - score) * 0.1;
            } else {
                score *= 0.95;
            }
    
            data.push({
                date: format(d, 'MMM dd'),
                fullDate: format(d, 'PPP'),
                score: Math.round(score * 100),
            });
        }
    
        return data;
    }, [allWorkoutLogs, oneYearAgo, today]);

    const weightChartData = useMemo(() => {
      return weightLogs.map(log => {
          const [year, weekNum] = log.date.split('-W');
          return {
              week: `W${weekNum}`,
              weight: log.weight,
              fullWeek: log.date,
              dateObj: parse(log.date, "YYYY-'W'ww", new Date()),
          }
      }).sort((a,b) => a.dateObj.getTime() - b.dateObj.getTime());
    }, [weightLogs]);

    const idealWeightData = useMemo(() => {
        if (!currentUser?.heightInCm || weightChartData.length < 2) return null;

        const idealWeight = currentUser.heightInCm - 100;
        const lastLog = weightChartData[weightChartData.length - 1];
        const firstLog = weightChartData[0];
        
        const weeksDiff = (lastLog.dateObj.getTime() - firstLog.dateObj.getTime()) / (1000 * 60 * 60 * 24 * 7);
        const weightDiff = lastLog.weight - firstLog.weight;
        
        let avgWeeklyChange = weeksDiff > 0 ? weightDiff / weeksDiff : 0;
        
        const weightToGoal = idealWeight - lastLog.weight;
        
        // If not making progress or no change, assume a default change rate
        if ((weightToGoal < 0 && avgWeeklyChange >= 0) || (weightToGoal > 0 && avgWeeklyChange <= 0)) {
            avgWeeklyChange = weightToGoal > 0 ? 0.25 : -0.5; // default gain/loss
        }

        if (avgWeeklyChange === 0) return null;

        const weeksToGo = weightToGoal / avgWeeklyChange;
        const projectedEndDate = addWeeks(lastLog.dateObj, weeksToGo);
        const daysToGo = differenceInDays(projectedEndDate, new Date());

        const projectionLine = [
            {...lastLog},
            {
                week: 'Ideal',
                weight: idealWeight,
                fullWeek: format(projectedEndDate, 'PPP'),
                dateObj: projectedEndDate,
                isIdeal: true,
                tooltipData: {
                    idealWeight: idealWeight.toFixed(1),
                    projectedDate: format(projectedEndDate, 'PPP'),
                    daysToGoal: Math.round(daysToGo),
                    weeklyChange: avgWeeklyChange.toFixed(2),
                }
            }
        ];

        return { idealWeight, projectionLine };
    }, [currentUser?.heightInCm, weightChartData]);


    const handleLogWeightClick = () => {
      const weightValue = parseFloat(newWeight);
      if (!isNaN(weightValue) && weightValue > 0 && weightDate) {
        onLogWeight(weightValue, weightDate);
        setNewWeight('');
      }
    };
    
    const handleSaveHeight = () => {
        const input = heightInput.trim().toLowerCase();
        let cm = 0;

        const ftMatch = input.match(/(\d+)\s*(?:ft|'|feet)/);
        const inMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:in|"|inch|inches)/);
        const cmMatch = input.match(/(\d+(?:\.\d+)?)\s*cm/);

        if (cmMatch) {
            cm = parseFloat(cmMatch[1]);
        } else {
            let totalInches = 0;
            if (ftMatch) totalInches += parseInt(ftMatch[1]) * 12;
            if (inMatch) totalInches += parseFloat(inMatch[1]);
            
            // Allow just a number to be interpreted as inches
            if (!ftMatch && !inMatch && !isNaN(parseFloat(input))) {
              totalInches = parseFloat(input);
            }

            if (totalInches > 0) {
                cm = totalInches * 2.54;
            }
        }

        if (cm > 0) {
            updateUserProfile({ heightInCm: cm });
            setIsSettingHeight(false);
            setHeightInput('');
        } else {
            toast({
                title: "Invalid Format",
                description: "Please use a format like '180cm', '70in', or '5ft 10in'.",
                variant: "destructive"
            });
        }
    };


    const CustomTooltip = () => {
        if (!tooltipData) return null;
        const { value, x, y } = tooltipData;

        const style: React.CSSProperties = {
            position: 'fixed',
            left: `${x + 15}px`,
            top: `${y + 15}px`,
            pointerEvents: 'none',
        };
        
        return (
            <div style={style} className={cn("z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95")}>
                 <div className="text-center">
                    <p className="font-bold text-base">{format(parse(value.date, 'yyyy-MM-dd', new Date()), 'PPP')}</p>
                    <p className="text-sm">{value.count} sets logged</p>
                    {value.exercises && (
                        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground max-w-xs">
                            <p>{value.exercises}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    if (!oneYearAgo || !today) {
        return (
          <Card className="shadow-xl rounded-xl overflow-hidden mb-8">
            <CardHeader>
              <CardTitle>Workout Activity</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[200px] w-full animate-pulse bg-muted rounded-md" />
            </CardContent>
          </Card>
        );
    }

  return (
    <>
      <Card className="shadow-xl rounded-xl overflow-hidden mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Workout Activity</CardTitle>
              <CardDescription>
                {view === 'heatmap' && "Your workout consistency over the last year. Click a square to view that day's log."}
                {view === 'graph' && 'Your probability of working out, based on recent consistency.'}
                {view === 'weight' && 'Your weekly body weight trend. Log weight and set height to see your ideal projection.'}
              </CardDescription>
            </div>
             <div className='flex items-center gap-2'>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setView(v => v === 'graph' ? 'heatmap' : 'graph')}
                                className="flex-shrink-0"
                            >
                                {view === 'heatmap' || view === 'weight' ? <LineChartIcon className="h-4 w-4" /> : <CalendarIcon className="h-4 w-4" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{view === 'graph' ? 'Show Heatmap' : 'Show Consistency Graph'}</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setView(v => v === 'weight' ? 'heatmap' : 'weight')}
                                className="flex-shrink-0"
                            >
                                <WeightIcon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{view === 'weight' ? 'Show Heatmap' : 'Show Weight Tracker'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
            {view === 'heatmap' ? (
                <div className="min-w-[720px] overflow-x-auto">
                    <CalendarHeatmap
                        startDate={oneYearAgo}
                        endDate={today}
                        values={heatmapValues}
                        classForValue={(value) => {
                        if (!value || value.count === 0) { return 'color-empty'; }
                        if (value.count > 15) return 'color-scale-4';
                        if (value.count > 10) return 'color-scale-3';
                        if (value.count > 5) return 'color-scale-2';
                        return 'color-scale-1';
                        }}
                        onMouseOver={(event, value) => {
                            if (value && value.date && value.count > 0) {
                                setTooltipData({ value: value as HeatmapValue, x: event.clientX, y: event.clientY });
                            } else {
                                setTooltipData(null);
                            }
                        }}
                        onMouseOut={() => {
                            setTooltipData(null);
                        }}
                        onClick={(value) => {
                          if (value && value.date) {
                              setTooltipData(null);
                              onDateSelect(value.date);
                          }
                        }}
                        showMonthLabels={true}
                        showWeekdayLabels={true}
                    />
                </div>
            ) : view === 'graph' ? (
                <>
                {consistencyData.length > 0 ? (
                    <ChartContainer config={consistencyChartConfig} className="min-h-[250px] w-full pr-4">
                        <LineChart accessibilityLayer data={consistencyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value, index) => {
                                    if (index % 30 !== 0) return '';
                                    return value.split(' ')[0]; 
                                }}
                            />
                            <YAxis 
                                tickLine={false} 
                                axisLine={false} 
                                tickMargin={8} 
                                domain={[0, 100]}
                                tickFormatter={(value) => `${value}%`}
                            />
                            <RechartsTooltip
                                cursor={true}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="rounded-lg border bg-background p-2.5 shadow-sm">
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.7rem] uppercase text-muted-foreground">
                                                            Date
                                                        </span>
                                                        <span className="font-bold text-foreground">
                                                            {data.fullDate}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col text-right">
                                                        <span className="text-[0.7rem] uppercase text-muted-foreground">
                                                            Consistency
                                                        </span>
                                                        <span className="font-bold text-foreground">
                                                            {data.score}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Line
                                dataKey="score"
                                type="monotone"
                                stroke="var(--color-score)"
                                strokeWidth={2}
                                dot={false}
                                name="Consistency"
                            />
                        </LineChart>
                    </ChartContainer>
                ) : (
                    <p className="text-center text-muted-foreground py-8">
                        Not enough data to calculate consistency. Log some workouts!
                    </p>
                )}
                </>
            ) : (
                 <>
                    {isSettingHeight ? (
                         <div className="flex flex-col items-center justify-center min-h-[250px] gap-4 p-4 border rounded-lg bg-muted/20">
                            <h3 className="text-lg font-semibold text-center">Set Your Height</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm">To calculate your ideal weight, please enter your height. This is used for projection only and is saved locally.</p>
                            <Input 
                                value={heightInput} 
                                onChange={(e) => setHeightInput(e.target.value)}
                                placeholder="e.g., 180cm, 70in, or 5ft 10in" 
                                className="w-full max-w-xs" 
                            />
                            <Button onClick={handleSaveHeight}>Save Height</Button>
                        </div>
                    ) : weightChartData.length < 2 ? (
                        <div className="flex justify-center items-center min-h-[250px]">
                            <p className="text-center text-muted-foreground">
                                Not enough data for a weight chart. Log your weight for at least two different weeks.
                            </p>
                        </div>
                    ) : (
                        <ChartContainer config={weightChartConfig} className="min-h-[250px] w-full pr-4">
                            <LineChart accessibilityLayer margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
                                <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={8} domain={['dataMin - 2', 'dataMax + 2']} />
                                <RechartsTooltip
                                    cursor={true}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            if (data.isIdeal) {
                                                const { tooltipData } = data;
                                                return (
                                                    <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[200px]">
                                                        <div className="font-bold text-center mb-2">Ideal Weight Goal</div>
                                                        <div className="flex justify-between"><span className="text-muted-foreground">Target:</span> <span>{tooltipData.idealWeight} kg/lb</span></div>
                                                        <div className="flex justify-between"><span className="text-muted-foreground">Est. Date:</span> <span>{tooltipData.projectedDate}</span></div>
                                                        <div className="flex justify-between"><span className="text-muted-foreground">Days to Go:</span> <span>{tooltipData.daysToGoal}</span></div>
                                                        <div className="flex justify-between"><span className="text-muted-foreground">Est. Change:</span> <span>{tooltipData.weeklyChange} kg/lb/wk</span></div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div className="rounded-lg border bg-background p-2.5 shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-[0.7rem] uppercase text-muted-foreground">
                                                            {data.fullWeek}
                                                        </span>
                                                        <span className="font-bold text-foreground">
                                                            {data.weight} kg/lb
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Line yAxisId="left" dataKey="weight" type="monotone" stroke="var(--color-weight)" strokeWidth={2} dot={true} data={weightChartData} name="Weight" />
                                {idealWeightData && (
                                     <Line 
                                        yAxisId="left" 
                                        dataKey="weight" 
                                        stroke="var(--color-projection)" 
                                        strokeWidth={2} 
                                        strokeDasharray="5 5"
                                        data={idealWeightData.projectionLine}
                                        name="Projection"
                                        dot={(props) => {
                                          if (props.payload.isIdeal) {
                                            return <Dot {...props} r={5} fill="var(--color-projection)" />;
                                          }
                                          return null;
                                        }}
                                     />
                                )}
                            </LineChart>
                        </ChartContainer>
                    )}
                    {!isSettingHeight && (
                        <div className="flex flex-col sm:flex-row gap-2 items-center mt-4 pt-4 border-t">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full sm:w-auto justify-start text-left font-normal h-9", !weightDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {weightDate ? format(weightDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={weightDate} onSelect={(date) => date && setWeightDate(date)} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <Input
                                type="number"
                                placeholder="Enter weight (kg/lb)"
                                value={newWeight}
                                onChange={(e) => setNewWeight(e.target.value)}
                                className="h-9 flex-grow"
                            />
                            <Button onClick={handleLogWeightClick} disabled={!newWeight || !weightDate} className="h-9 w-full sm:w-auto">
                                Log Weight
                            </Button>
                        </div>
                    )}
                </>
            )}
        </CardContent>
      </Card>
      {view === 'heatmap' && <CustomTooltip />}
    </>
  );
}
