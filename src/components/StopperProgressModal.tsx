
"use client";

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { StopperProgressPopupState } from '@/types/workout';

interface StopperProgressModalProps {
    popupState: StopperProgressPopupState | null;
    onOpenChange: (isOpen: boolean) => void;
}

const chartConfig = {
  count: {
    label: "Encounters",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;


export function StopperProgressModal({ popupState, onOpenChange }: StopperProgressModalProps) {
    if (!popupState) {
        return null;
    }

    const { isOpen, stopper, habitName } = popupState;

    const chartData = useMemo(() => {
        if (!stopper?.timestamps) return [];
        const dailyCounts: Record<string, number> = {};
        stopper.timestamps.forEach(ts => {
            const dateKey = format(new Date(ts), 'yyyy-MM-dd');
            dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
        });
        return Object.entries(dailyCounts)
            .map(([date, count]) => ({ date, count, dateObj: parseISO(date) }))
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    }, [stopper]);

    if (!stopper) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Resistance History: "{stopper.text}"</DialogTitle>
                    <DialogDescription>
                        From habit: "{habitName}"
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow flex flex-col items-center justify-center min-h-[300px] py-4">
                    <h4 className="font-semibold text-center mb-4 text-sm text-muted-foreground">Daily Encounters Trend</h4>
                    <div className="w-full h-[300px]">
                       {chartData.length > 1 ? (
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <ResponsiveContainer>
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tickFormatter={(val) => format(parseISO(val), 'MMM d')} />
                                        <YAxis allowDecimals={false} />
                                        <RechartsTooltip
                                            cursor={{ fill: "hsl(var(--muted))" }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                            <p className="font-bold text-foreground">{format(data.dateObj, 'PPP')}</p>
                                                            <p className="text-muted-foreground">{data.count} times</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={{r: 4}}/>
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        ) : <div className="flex items-center justify-center h-full"><p className="text-center text-muted-foreground pt-10">{chartData.length > 0 ? 'Need at least two days of data for a trend line.' : 'No data to display.'}</p></div>}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
