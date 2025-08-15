
"use client";

import React, { } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, MoreHorizontal, BrainCircuit, X, Link as LinkIcon, GitBranch } from 'lucide-react';
import type { Activity } from '@/types/workout';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts"
import { useAuth } from '@/contexts/AuthContext';

interface FocusTimerPopupProps {
  activity: Activity;
  duration: number; // in minutes
  initialSecondsLeft: number;
  onClose: () => void;
  onLogTime: (activity: Activity, minutes: number) => void;
}

export function FocusTimerPopup({ activity, duration, initialSecondsLeft, onClose, onLogTime }: FocusTimerPopupProps) {
  const { setActiveFocusSession, setIsAudioPlaying, openTaskContextPopup } = useAuth();
  const totalSeconds = duration * 60;
  const [secondsLeft, setSecondsLeft] = React.useState(initialSecondsLeft);
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    setIsActive(true);
    setIsAudioPlaying(true);
  }, []);

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(s => s - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      handleStop(true);
    }
    
    if (isActive) {
        setActiveFocusSession({ activity, duration, secondsLeft });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft]);

  const handleStop = (completed: boolean) => {
    setIsActive(false);
    setIsAudioPlaying(false);
    const elapsedSeconds = totalSeconds - secondsLeft;
    if (elapsedSeconds > 0 && activity) {
      onLogTime(activity, Math.floor(elapsedSeconds / 60));
    }
    onClose();
  };
  
  const togglePlayPause = () => {
    const newIsActive = !isActive;
    setIsActive(newIsActive);
    setIsAudioPlaying(newIsActive);
  };

  const progressPercentage = (totalSeconds - secondsLeft) / totalSeconds * 100;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  
  const chartData = [{ name: 'progress', value: progressPercentage, fill: 'hsl(var(--primary))' }];
  
  const handleOpenContext = (e: React.MouseEvent) => {
      if (activity.taskIds && activity.taskIds.length > 0) {
          openTaskContextPopup(activity.taskIds[0], e);
      }
  };

  if (!activity) return null;

  const isContextAvailable = (activity.type === 'deepwork' || activity.type === 'upskill') && (activity.taskIds?.length ?? 0) > 0;

  return (
    <div className="fixed top-6 right-6 z-[100]">
      <Card className="w-64 shadow-2xl rounded-xl border-border/20 bg-background/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Focus period...</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStop(false)}>
                <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="relative w-40 h-40 mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="80%"
                outerRadius="100%"
                data={chartData}
                startAngle={90}
                endAngle={-270}
                barSize={8}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  background={{ fill: 'hsl(var(--muted))' }}
                  dataKey="value"
                  cornerRadius={10}
                  angleAxisId={0}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold font-mono">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>
          </div>
          
          <div className="flex justify-center items-center gap-4 mt-4">
             <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={togglePlayPause}>
              {isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
             <Popover>
                <PopoverTrigger asChild>
                     <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                        <MoreHorizontal className="h-5 w-5" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1" side="top" align="center">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-destructive hover:text-destructive"
                        onClick={() => handleStop(false)}
                    >
                        <Square className="mr-2 h-4 w-4" /> Stop Session
                    </Button>
                </PopoverContent>
            </Popover>
          </div>

          <div className="mt-4 pt-4 border-t border-border/20 text-center">
            {isContextAvailable ? (
                 <Button variant="outline" className="w-full" onClick={handleOpenContext} title={activity.details}>
                    <span className="truncate">Task: {activity.details}</span>
                    <LinkIcon className="h-4 w-4 ml-2 text-primary flex-shrink-0" />
                 </Button>
            ) : (
                <p className="text-sm font-semibold truncate bg-muted/50 py-2 px-3 rounded-md" title={activity.details}>
                    Task: {activity.details}
                </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
