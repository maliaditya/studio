
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRouter } from 'next/navigation';
import { HeartPulse, Briefcase, TrendingUp, ClipboardCheck, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductivityStats {
  latestConsistency: number;
  consistencyChange: number;
  todayDeepWorkHours: number;
  deepWorkChange: number;
  todayUpskillHours: number;
  upskillChange: number;
  direction: boolean;
  overallNextMilestone: any;
}

interface DashboardStatsProps {
  stats: ProductivityStats;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const router = useRouter();
  const {
    latestConsistency,
    consistencyChange,
    todayDeepWorkHours,
    deepWorkChange,
    todayUpskillHours,
    upskillChange,
    direction,
    overallNextMilestone,
  } = stats;

  return (
    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="cursor-pointer hover:bg-muted/50" onClick={() => router.push('/workout-tracker')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Health</CardTitle>
          <HeartPulse className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{latestConsistency}%</div>
          <p className="text-xs text-muted-foreground">Workout Consistency</p>
          {consistencyChange !== undefined && consistencyChange !== 0 && (
            <p className={cn("text-xs text-muted-foreground mt-1 flex items-center", consistencyChange > 0 ? "text-emerald-500" : "text-red-500")}>
              {consistencyChange > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              {consistencyChange.toFixed(1)} points vs yesterday
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:bg-muted/50" onClick={() => router.push('/deep-work')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Wealth</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayDeepWorkHours.toFixed(1)} hrs</div>
          <p className="text-xs text-muted-foreground">Today's Deep Work</p>
          {deepWorkChange !== undefined && deepWorkChange !== 0 && (
            <p className={cn("text-xs text-muted-foreground mt-1 flex items-center", deepWorkChange > 0 ? "text-emerald-500" : "text-red-500")}>
              {deepWorkChange > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              {Math.abs(deepWorkChange).toFixed(0)}% vs yesterday
            </p>
          )}
        </CardContent>
      </Card>

      <Popover>
        <PopoverTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayUpskillHours.toFixed(1)} hrs</div>
              <p className="text-xs text-muted-foreground">Today's Learning</p>
              {upskillChange !== undefined && upskillChange !== 0 && (
                <p className={cn("text-xs text-muted-foreground mt-1 flex items-center", upskillChange > 0 ? "text-emerald-500" : "text-red-500")}>
                  {upskillChange > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  {Math.abs(upskillChange).toFixed(0)}% vs yesterday
                </p>
              )}
            </CardContent>
          </Card>
        </PopoverTrigger>
        {overallNextMilestone && (
          <PopoverContent className="w-60" align="end">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Next Milestone</h4>
              <p className="text-sm text-muted-foreground">
                Your closest goal is for <span className="font-bold text-foreground">{overallNextMilestone.topic}</span>.
              </p>
              <div className="grid gap-2">
                <div className="grid grid-cols-2 items-center">
                  <span className="text-sm text-muted-foreground">Progress Needed:</span>
                  <span className="font-bold text-right">{overallNextMilestone.progressNeeded} {overallNextMilestone.unit}</span>
                </div>
                <div className="grid grid-cols-2 items-center">
                  <span className="text-sm text-muted-foreground">Est. Date:</span>
                  <span className="font-bold text-right">{overallNextMilestone.date}</span>
                </div>
              </div>
            </div>
          </PopoverContent>
        )}
      </Popover>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Direction</CardTitle>
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${direction ? 'text-green-500' : ''}`}>{direction ? 'Aligned' : 'Pending'}</div>
          <p className="text-xs text-muted-foreground">Daily Planning & Tracking</p>
        </CardContent>
      </Card>
    </div>
  );
}
