
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import { addWeeks, format, parseISO, setISOWeek, startOfISOWeek, differenceInDays, subYears, addDays } from 'date-fns';
import type { DatedWorkout, WeightLog } from '@/types/workout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { LineChart as LineChartIcon, Calendar as CalendarIcon, Weight as WeightIcon, Edit2, Trash2, Save, X, ZoomOut } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ChartContainer, ChartConfig } from './ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine, Brush } from 'recharts';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';

interface WorkoutHeatmapProps {
  allWorkoutLogs: DatedWorkout[];
  onDateSelect: (dateString: string) => void;
  weightLogs: WeightLog[];
  onLogWeight: (weight: number, date: Date) => void;
  onUpdateWeightLog: (dateKey: string, newWeight: number) => void;
  onDeleteWeightLog: (dateKey: string) => void;
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
} satisfies ChartConfig;

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;

        if (data.isProjection) {
            return (
                <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[14rem]">
                    <div className="grid gap-1.5">
                        <div className="flex flex-col">
                            <span className="text-[0.7rem] uppercase text-muted-foreground">
                                Ideal Weight Goal
                            </span>
                            <span className="font-bold text-foreground">
                                {data.weight.toFixed(1)} kg/lb
                            </span>
                        </div>
                        <div className="flex flex-col border-t pt-1.5 mt-1.5">
                            <span className="text-[0.7rem] uppercase text-muted-foreground">
                                Est. Date
                            </span>
                            <span className="font-bold text-foreground">
                                {format(data.dateObj, 'PPP')} ({data.daysToGo} days)
                            </span>
                        </div>
                        <div className="flex flex-col border-t pt-1.5 mt-1.5">
                             <span className="text-[0.7rem] uppercase text-muted-foreground">
                                Required Change
                            </span>
                             <span className="font-bold text-foreground">
                                {data.rate.toFixed(2)} kg/lb per week
                            </span>
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[12rem]">
                <div className="grid gap-1.5">
                    <div className="flex flex-col">
                        <span className="text-[0.7rem] uppercase text-muted-foreground">
                            {format(data.dateObj, 'PPP')}
                        </span>
                        <span className="font-bold text-foreground">
                            {data.weight.toFixed(1)} kg/lb
                        </span>
                    </div>
                    {data.weeklyChange !== null && data.weeklyChange !== undefined && (
                        <div className="flex flex-col border-t pt-1.5 mt-1.5">
                            <span className="text-[0.7rem] uppercase text-muted-foreground">
                                Weekly Change
                            </span>
                            <span className={cn(
                                "font-bold",
                                data.weeklyChange > 0 ? "text-red-500" : data.weeklyChange < 0 ? "text-green-500" : "text-muted-foreground"
                            )}>
                                {data.weeklyChange > 0 ? '+' : ''}{data.weeklyChange.toFixed(1)} kg/lb
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
}


export function WorkoutHeatmap({ 
  allWorkoutLogs, 
  onDateSelect, 
  weightLogs, 
  onLogWeight,
  onUpdateWeightLog,
  onDeleteWeightLog,
}: WorkoutHeatmapProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [view, setView] = useState<'heatmap' | 'graph' | 'weight'>('heatmap');
  const [newWeight, setNewWeight] = useState('');
  const [weightDate, setWeightDate] = useState<Date | undefined>(new Date());
  
  const [editingLog, setEditingLog] = useState<{ date: string; weight: string } | null>(null);

  const [today, setToday] = useState<Date | null>(null);
  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);

  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [goalWeightInput, setGoalWeightInput] = useState('');

  const [chartKey, setChartKey] = useState(Date.now());
  const [brushIndex, setBrushIndex] = useState<{ startIndex?: number; endIndex?: number }>({});


  useEffect(() => {
    const now = new Date();
    setToday(now);
    setWeightDate(now);
    setOneYearAgo(subYears(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1));
  }, []);

  useEffect(() => {
    if (currentUser?.username) {
        const storedGoal = localStorage.getItem(`goalWeight_${currentUser.username}`);
        if (storedGoal) {
            setGoalWeight(parseFloat(storedGoal));
        }
    } else {
        setGoalWeight(null); // Clear goal if user logs out
    }
  }, [currentUser]);

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

  const projectionData = useMemo(() => {
    if (!goalWeight || weightChartData.length < 1) return [];
    
    const lastLog = weightChartData[weightChartData.length - 1];
    const weightToChange = goalWeight - lastLog.weight;
    
    if (Math.abs(weightToChange) < 0.1) return [];

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
    
    if (Math.abs(projectionRate) < 0.01) return [];

    const weeksToGo = weightToChange / projectionRate;
    if (weeksToGo <= 0) return [];
    
    const projectionEndDate = addWeeks(lastLog.dateObj, weeksToGo);
    const daysToGo = differenceInDays(projectionEndDate, new Date());

    if (daysToGo < 1) return [];

    const projectionEndPoint = {
        weight: goalWeight,
        timestamp: projectionEndDate.getTime(),
        dateObj: projectionEndDate,
        isProjection: true,
        daysToGo: daysToGo,
        rate: Math.abs(projectionRate),
    }

    return [
      { ...lastLog, isProjection: false },
      projectionEndPoint
    ];
  }, [goalWeight, weightChartData]);


    const handleLogWeightClick = () => {
      const weightValue = parseFloat(newWeight);
      if (!isNaN(weightValue) && weightValue > 0 && weightDate) {
        onLogWeight(weightValue, weightDate);
        setNewWeight('');
      } else {
        toast({ title: "Invalid Input", description: "Please enter a valid weight and select a date.", variant: "destructive" });
      }
    };

    const handleSetGoalWeight = () => {
        const goal = parseFloat(goalWeightInput);
        if (!isNaN(goal) && goal > 0) {
            if (currentUser?.username) {
                setGoalWeight(goal);
                localStorage.setItem(`goalWeight_${currentUser.username}`, goal.toString());
                toast({ title: "Goal Set!", description: `Your new goal weight is ${goal} kg/lb.` });
                setGoalWeightInput('');
            } else {
                toast({ title: "Error", description: "You must be logged in to set a goal.", variant: "destructive" });
            }
        } else {
            toast({ title: "Invalid Input", description: "Please enter a valid goal weight.", variant: "destructive" });
        }
    };

    const handleSaveEdit = () => {
      if (editingLog) {
        const weightValue = parseFloat(editingLog.weight);
        if (!isNaN(weightValue) && weightValue > 0) {
          onUpdateWeightLog(editingLog.date, weightValue);
          setEditingLog(null);
        } else {
          toast({ title: "Invalid Weight", description: "Please enter a valid weight.", variant: "destructive" });
        }
      }
    };
    
    const CustomHeatmapTooltip = () => {
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
                    <p className="font-bold text-base">{format(parseISO(value.date), 'PPP')}</p>
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
    
    const isZoomed = useMemo(() => {
      if (weightChartData.length <= 1) return false;
      const { startIndex, endIndex } = brushIndex;
      return (
        startIndex !== undefined &&
        endIndex !== undefined &&
        (startIndex !== 0 || endIndex !== weightChartData.length - 1)
      );
    }, [brushIndex, weightChartData.length]);

    const handleResetZoom = () => {
      setBrushIndex({}); // Reset the index state
      setChartKey(Date.now()); // Force the chart to re-mount with a new key
    };
    
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
                {view === 'weight' && 'Your weekly body weight trend. Drag on the timeline below to zoom.'}
              </CardDescription>
            </div>
             <div className='flex items-center gap-2'>
                {view === 'weight' && isZoomed && (
                  <Button variant="outline" size="sm" onClick={handleResetZoom}>
                    <ZoomOut className="mr-2 h-4 w-4" />
                    Reset Zoom
                  </Button>
                )}
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
                    <ChartContainer config={consistencyChartConfig} className="min-h-[300px] w-full pr-4">
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
                    {weightChartData.length < 2 ? (
                        <div className="flex justify-center items-center min-h-[300px]">
                            <p className="text-center text-muted-foreground">
                                Not enough data for a weight chart. Log your weight for at least two different weeks.
                            </p>
                        </div>
                    ) : (
                        <ChartContainer config={weightChartConfig} key={chartKey} className="min-h-[350px] w-full pr-4">
                            <LineChart 
                                accessibilityLayer 
                                data={weightChartData} 
                                margin={{ top: 5, right: 20, left: 0, bottom: 20 }}
                            >
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="timestamp"
                                    type="number"
                                    domain={['dataMin', 'dataMax']}
                                    tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM dd')}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    interval="preserveStartEnd"
                                />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={['dataMin - 2', 'dataMax + 2']} />
                                <RechartsTooltip
                                    cursor={true}
                                    content={<CustomTooltip />}
                                />
                                {goalWeight !== null && (
                                    <ReferenceLine 
                                        y={goalWeight} 
                                        label={{ value: `Goal: ${goalWeight}`, position: 'insideTopRight', fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                                        stroke="hsl(var(--primary))" 
                                        strokeDasharray="4 4" 
                                    />
                                )}
                                <Line dataKey="weight" type="monotone" stroke="var(--color-weight)" strokeWidth={2} dot={true} name="Weight" />
                                {projectionData && projectionData.length > 0 && (
                                <Line 
                                    data={projectionData} 
                                    dataKey="weight"
                                    type="monotone"
                                    stroke="var(--color-weight)" 
                                    strokeDasharray="5 5"
                                    dot={{r: 4}}
                                    name="Projection" 
                                />
                                )}
                                <Brush 
                                    dataKey="timestamp" 
                                    height={40} 
                                    stroke="hsl(var(--primary))" 
                                    tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM dd')}
                                    travellerWidth={15}
                                    onChange={(e) => setBrushIndex({startIndex: e.startIndex, endIndex: e.endIndex})}
                                />
                            </LineChart>
                        </ChartContainer>
                    )}
                    
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
                            placeholder={goalWeight ? `Log weight (Goal: ${goalWeight} kg/lb)` : "Enter weight (kg/lb)"}
                            value={newWeight}
                            onChange={(e) => setNewWeight(e.target.value)}
                            className="h-9 flex-grow"
                        />
                        <Button onClick={handleLogWeightClick} disabled={!newWeight || !weightDate} className="h-9 w-full sm:w-auto">
                            Log Weight
                        </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 items-center mt-2">
                        <Input
                            type="number"
                            placeholder="Enter your ideal weight"
                            value={goalWeightInput}
                            onChange={(e) => setGoalWeightInput(e.target.value)}
                            className="h-9 flex-grow"
                        />
                        <Button onClick={handleSetGoalWeight} disabled={!goalWeightInput} className="h-9 w-full sm:w-auto">
                            Set Goal
                        </Button>
                    </div>

                    <div className="mt-6">
                        <h3 className="text-lg font-semibold mb-2">Log History</h3>
                        <ScrollArea className="h-[200px] border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Week Of</TableHead>
                                        <TableHead>Weight (kg/lb)</TableHead>
                                        <TableHead className="text-right w-[100px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {weightChartData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground h-24">No weights logged yet.</TableCell>
                                        </TableRow>
                                    ) : (
                                        [...weightChartData].reverse().map((log) => (
                                            <TableRow key={log.fullWeek}>
                                                {editingLog?.date === log.fullWeek ? (
                                                    <>
                                                        <TableCell>{format(log.dateObj, 'MMM dd, yyyy')}</TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                value={editingLog.weight}
                                                                onChange={(e) => setEditingLog({ ...editingLog, weight: e.target.value })}
                                                                className="h-8"
                                                                autoFocus
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button size="icon" onClick={handleSaveEdit} className="h-8 w-8 mr-1 bg-green-600 hover:bg-green-700"><Save className="h-4 w-4" /></Button>
                                                            <Button size="icon" variant="ghost" onClick={() => setEditingLog(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
                                                        </TableCell>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TableCell className="font-medium">{format(log.dateObj, 'MMM dd, yyyy')}</TableCell>
                                                        <TableCell>{log.weight}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => setEditingLog({ date: log.fullWeek, weight: log.weight.toString() })} className="h-8 w-8"><Edit2 className="h-4 w-4" /></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => onDeleteWeightLog(log.fullWeek)} className="h-8 w-8 text-destructive hover:text-destructive/90"><Trash2 className="h-4 w-4" /></Button>
                                                        </TableCell>
                                                    </>
                                                )}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </>
            )}
        </CardContent>
      </Card>
      {view === 'heatmap' && <CustomHeatmapTooltip />}
    </>
  );
}
