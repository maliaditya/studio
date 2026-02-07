
"use client";

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { StopperProgressPopupState } from '@/types/workout';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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
    const [position, setPosition] = useState(() => ({
        x: typeof window !== 'undefined' ? window.innerWidth / 2 - 300 : 0,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 - 240 : 0,
    }));
    const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setPosition({
            x: window.innerWidth / 2 - 300,
            y: window.innerHeight / 2 - 240,
        });
    }, [isOpen]);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[170] pointer-events-none">
            <div className="pointer-events-auto">
                <div
                    className="fixed w-[640px] max-w-[95vw]"
                    style={{ top: position.y, left: position.x }}
                >
                    <div className="shadow-2xl border border-white/10 bg-[#151517]/95 backdrop-blur rounded-2xl overflow-hidden">
                        <div
                            className="p-4 border-b border-white/10 flex items-start justify-between cursor-grab select-none"
                            onPointerDown={(event) => {
                                dragState.current = {
                                    startX: event.clientX,
                                    startY: event.clientY,
                                    originX: position.x,
                                    originY: position.y,
                                };
                                const handlePointerMove = (e: PointerEvent) => {
                                    if (!dragState.current) return;
                                    const dx = e.clientX - dragState.current.startX;
                                    const dy = e.clientY - dragState.current.startY;
                                    setPosition({
                                        x: dragState.current.originX + dx,
                                        y: dragState.current.originY + dy,
                                    });
                                };
                                const handlePointerUp = () => {
                                    dragState.current = null;
                                    window.removeEventListener('pointermove', handlePointerMove);
                                    window.removeEventListener('pointerup', handlePointerUp);
                                };
                                window.addEventListener('pointermove', handlePointerMove);
                                window.addEventListener('pointerup', handlePointerUp);
                            }}
                        >
                            <div>
                                <div className="text-base font-semibold">Resistance History: "{stopper.text}"</div>
                                <div className="text-sm text-muted-foreground">
                                    From habit: "{habitName}"
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="p-4">
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
                    </div>
                </div>
            </div>
        </div>
    );
}
