
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { addWeeks, format, parseISO, setISOWeek, startOfISOWeek, differenceInDays } from 'date-fns';
import type { WeightLog } from '@/types/workout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Weight as WeightIcon, Edit2, Trash2, Save, X, ZoomOut, CalendarIcon, Target } from 'lucide-react';
import { ChartContainer, ChartConfig } from './ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine, Brush } from 'recharts';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';

interface WeightChartModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  weightLogs: WeightLog[];
  goalWeight: number | null;
  onLogWeight: (weight: number, date: Date) => void;
  onUpdateWeightLog: (dateKey: string, newWeight: number) => void;
  onDeleteWeightLog: (dateKey: string) => void;
  onSetGoalWeight: (goal: number) => void;
}

const weightChartConfig = {
  historicalWeight: {
    label: "Weight (kg/lb)",
    color: "hsl(var(--chart-2))",
  },
  projectedWeight: {
    label: "Projection",
    color: "hsl(var(--chart-2))",
  }
} satisfies ChartConfig;

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const value = data.historicalWeight ?? data.projectedWeight;

        if (data.isProjection) {
            return (
                <div className="rounded-lg border bg-background p-2.5 shadow-sm min-w-[14rem]">
                    <div className="grid gap-1.5">
                        <div className="flex flex-col">
                            <span className="text-[0.7rem] uppercase text-muted-foreground">
                                Projected Weight
                            </span>
                            <span className="font-bold text-foreground">
                                {value.toFixed(1)} kg/lb
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
                            {value.toFixed(1)} kg/lb
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

export function WeightChartModal({ 
  isOpen,
  onOpenChange,
  weightLogs, 
  goalWeight,
  onLogWeight,
  onUpdateWeightLog,
  onDeleteWeightLog,
  onSetGoalWeight,
}: WeightChartModalProps) {
  const { toast } = useToast();
  
  const [newWeight, setNewWeight] = useState('');
  const [goalWeightInput, setGoalWeightInput] = useState('');
  const [weightDate, setWeightDate] = useState<Date | undefined>(new Date());
  
  const [editingLog, setEditingLog] = useState<{ date: string; weight: string } | null>(null);
  
  const [chartKey, setChartKey] = useState(Date.now());
  const [brushIndex, setBrushIndex] = useState<{ startIndex?: number; endIndex?: number }>({});

  useEffect(() => {
    if (goalWeight) {
      setGoalWeightInput(String(goalWeight));
    } else {
      setGoalWeightInput('');
    }
  }, [goalWeight, isOpen]);

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
    if (weeksToGo <= 0) return allData;
    
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

  const handleLogWeightClick = () => {
    const weightValue = parseFloat(newWeight);
    if (!isNaN(weightValue) && weightValue > 0 && weightDate) {
      onLogWeight(weightValue, weightDate);
      setNewWeight('');
    } else {
      toast({ title: "Invalid Input", description: "Please enter a valid weight and select a date.", variant: "destructive" });
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

  const handleSetGoalWeightClick = () => {
    const goal = parseFloat(goalWeightInput);
    if (!isNaN(goal) && goal > 0) {
      onSetGoalWeight(goal);
    } else {
      toast({ title: "Invalid Input", description: "Please enter a valid goal weight.", variant: "destructive" });
    }
  };

  const isZoomed = useMemo(() => {
    if (combinedChartData.length <= 1) return false;
    const { startIndex, endIndex } = brushIndex;
    return (
      startIndex !== undefined &&
      endIndex !== undefined &&
      (startIndex !== 0 || endIndex !== combinedChartData.length - 1)
    );
  }, [brushIndex, combinedChartData.length]);

  const handleResetZoom = () => {
    setBrushIndex({});
    setChartKey(Date.now());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Weight Progress & History</DialogTitle>
          <DialogDescription>
            Track your weekly body weight trend. Drag on the timeline below to zoom.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow min-h-0 overflow-y-auto pr-4 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Weight Chart</CardTitle>
                        {isZoomed && (
                            <Button variant="outline" size="sm" onClick={handleResetZoom}>
                                <ZoomOut className="mr-2 h-4 w-4" />
                                Reset Zoom
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {weightChartData.length < 1 ? (
                        <div className="flex justify-center items-center min-h-[300px]">
                            <p className="text-center text-muted-foreground">
                                Not enough data for a weight chart. Log your weight for at least one week.
                            </p>
                        </div>
                    ) : (
                        <ChartContainer config={weightChartConfig} key={chartKey} className="min-h-[350px] w-full pr-4">
                            <LineChart 
                                accessibilityLayer 
                                data={combinedChartData} 
                                margin={{ top: 5, right: 20, left: 0, bottom: 40 }}
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
                                <Line dataKey="historicalWeight" type="monotone" stroke="var(--color-historicalWeight)" strokeWidth={2} dot={true} name="Weight" connectNulls={false} />
                                <Line dataKey="projectedWeight" type="monotone" stroke="var(--color-projectedWeight)" strokeDasharray="5 5" strokeWidth={2} dot={{r: 4}} name="Projection" connectNulls={false} />
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
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Target/> Set Your Goal</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2 items-center">
                            <Input
                                type="number"
                                placeholder="Your ideal weight (kg/lb)"
                                value={goalWeightInput}
                                onChange={(e) => setGoalWeightInput(e.target.value)}
                                className="h-9 flex-grow"
                            />
                            <Button onClick={handleSetGoalWeightClick} disabled={!goalWeightInput} className="h-9">
                                Set Goal
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><WeightIcon/> Log Your Weight</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                            <Button onClick={handleLogWeightClick} disabled={!newWeight || !weightDate} className="h-9">Log</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Log History</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[250px] border rounded-md">
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
                </CardContent>
            </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
