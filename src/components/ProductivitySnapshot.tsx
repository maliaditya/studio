

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Share2, ArrowUp, ArrowDown, Rocket, LayoutDashboard, Brain as BrainIcon, Lightbulb, Flashlight, Check, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid, XAxis, YAxis, PieChart, Pie } from 'recharts';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { Carousel } from './ui/carousel';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Release, ExerciseDefinition, SharingStatus, Activity, DailySchedule, ActivityType } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>X</title>
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
    </svg>
);

const DevToIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>DEV Community</title>
        <path d="M11.472 24a1.5 1.5 0 0 1-1.06-.44L.439 13.587a1.5 1.5 0 0 1 0-2.12l9.97-9.97a1.5 1.5 0 0 1 2.12 0L22.503 11.47a1.5 1.5 0 0 1 0 2.121l-9.972 9.971a1.5 1.5 0 0 1-1.06.44Zm-8.485-11.25 8.485 8.485 8.485-8.485-8.485-8.485-8.485 8.485ZM19.5 18h-3V9h3v9Z"/>
    </svg>
);

interface ProductivitySnapshotProps {
  stats: any;
  timeAllocationData: { name: string; time: number; activities: { name: string, duration: number }[] }[];
  onOpenStatsModal: () => void;
  onOpenKanbanModal: () => void;
  todaysSchedule: DailySchedule;
  activityDurations: Record<string, string>;
}

const activityColorMapping: Record<string, string> = {
    'Deep Work': 'hsl(var(--chart-1))',
    'Learning': 'hsl(var(--chart-2))',
    'Workout': 'hsl(var(--chart-3))',
    'Branding': 'hsl(var(--chart-4))',
    'Lead Gen': 'hsl(var(--chart-5))',
    'Essentials': 'hsl(var(--chart-1))',
    'Planning': 'hsl(var(--chart-2))',
    'Tracking': 'hsl(var(--chart-3))',
    'Interrupts': 'hsl(var(--destructive))',
    'Nutrition': 'hsl(var(--chart-4))',
    'Free Time': 'hsl(var(--muted))',
};

const useThemeColors = () => {
    const [colors, setColors] = useState<string[]>([]);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const style = getComputedStyle(document.documentElement);
            const chartColors = [
                style.getPropertyValue('--chart-1').trim(),
                style.getPropertyValue('--chart-2').trim(),
                style.getPropertyValue('--chart-3').trim(),
                style.getPropertyValue('--chart-4').trim(),
                style.getPropertyValue('--chart-5').trim(),
            ];
            setColors(chartColors.map(c => `hsl(${c})`));
        }
    }, []);
    return colors;
};

const activityTypeMapping: Record<string, Activity['type']> = {
    'Deep Work': 'deepwork',
    'Learning': 'upskill',
    'Workout': 'workout',
    'Branding': 'branding',
    'Essentials': 'essentials',
    'Planning': 'planning',
    'Tracking': 'tracking',
    'Lead Gen': 'lead-generation',
    'Interrupts': 'interrupt',
    'Nutrition': 'nutrition',
};

const formatMinutes = (minutes: number) => {
    if (minutes <= 0) return "0m";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
};


export function ProductivitySnapshot({ stats, timeAllocationData, onOpenStatsModal, onOpenKanbanModal, todaysSchedule, activityDurations }: ProductivitySnapshotProps) {
  const router = useRouter();
  const [isProjectDetailsModalOpen, setIsProjectDetailsModalOpen] = useState(false);
  const [selectedReleaseInfo, setSelectedReleaseInfo] = useState<{ release: Release, topic: string, type: 'product' | 'service' } | null>(null);
  const { microSkillMap, deepWorkDefinitions, upskillDefinitions, allDeepWorkLogs, allUpskillLogs } = useAuth();
  
  const [isAllocationDetailModalOpen, setIsAllocationDetailModalOpen] = useState(false);
  const [allocationDetailData, setAllocationDetailData] = useState<{ category: string; tasks: { name: string; duration: number }[] } | null>(null);
  
  const themeColors = useThemeColors();
  
  const topSpecializations = useMemo(() => {
    return Object.entries(stats.learningStats || {})
        .map(([name, data]: [string, any]) => ({ 
            name, 
            hours: data.logged || 0,
        }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5)
        .reverse();
  }, [stats.learningStats]);
  
  const microSkillsForRelease = React.useMemo(() => {
    if (!selectedReleaseInfo || !selectedReleaseInfo.release.focusAreaIds) {
      return [];
    }
    return selectedReleaseInfo.release.focusAreaIds
      .map(id => {
        const info = microSkillMap.get(id);
        const curiosities = upskillDefinitions.filter(def => def.category === info?.microSkillName && (def.linkedUpskillIds?.length ?? 0 > 0));
        const intentions = deepWorkDefinitions.filter(def => def.category === info?.microSkillName && (def.linkedDeepWorkIds?.length ?? 0 > 0));
        
        return {
            id,
            name: info?.microSkillName,
            curiosities,
            intentions
        };
      })
      .filter((skill): skill is { id: string; name: string; curiosities: ExerciseDefinition[], intentions: ExerciseDefinition[] } => !!skill.name);
  }, [selectedReleaseInfo, microSkillMap, upskillDefinitions, deepWorkDefinitions]);

  const isMicroSkillComplete = (skill: { curiosities: ExerciseDefinition[], intentions: ExerciseDefinition[] }) => {
    const allChildTasks: { id: string; type: 'upskill' | 'deepwork' }[] = [];

    const getDescendants = (startNodeId: string, defs: ExerciseDefinition[], linkKey: 'linkedUpskillIds' | 'linkedDeepWorkIds', type: 'upskill' | 'deepwork') => {
        const queue: string[] = [startNodeId];
        const visited = new Set<string>();
        while(queue.length > 0) {
            const currentId = queue.shift()!;
            if(visited.has(currentId)) continue;
            visited.add(currentId);
            const node = defs.find(d => d.id === currentId);
            if(node) {
                const childIds = node[linkKey] || [];
                if(childIds.length === 0 && !allChildTasks.some(t => t.id === node.id)) {
                    allChildTasks.push({ id: node.id, type });
                }
                childIds.forEach(childId => {
                    if(!visited.has(childId)) queue.push(childId);
                });
            }
        }
    }

    skill.curiosities.forEach(c => getDescendants(c.id, upskillDefinitions, 'linkedUpskillIds', 'upskill'));
    skill.intentions.forEach(i => getDescendants(i.id, deepWorkDefinitions, 'linkedDeepWorkIds', 'deepwork'));
    
    if (allChildTasks.length === 0) return false;

    const loggedTaskIds = new Set([
        ...allDeepWorkLogs.flatMap(log => log.exercises.filter(ex => ex.loggedSets.length > 0).map(ex => ex.definitionId)),
        ...allUpskillLogs.flatMap(log => log.exercises.filter(ex => ex.loggedSets.length > 0).map(ex => ex.definitionId))
    ]);

    return allChildTasks.every(task => loggedTaskIds.has(task.id));
  };


  const learningItems = Object.entries(stats.learningStats || {}).map(([topic, data]: [string, any]) => ({ name: topic, logged: data.logged, estimated: data.estimated }));
  
  const roadmapItems = stats.upcomingReleases || [];
  
  const handleBarClick = (data: any) => {
    if (!data || !data.activePayload) return;
    const categoryName = data.activePayload[0].payload.name;
    
    const categoryData = timeAllocationData.find(item => item.name === categoryName);

    setAllocationDetailData({
        category: categoryName,
        tasks: categoryData ? categoryData.activities : []
    });
    setIsAllocationDetailModalOpen(true);
  };

  const pieData = useMemo(() => {
    const totalMinutesInDay = 24 * 60;
    const totalAllocatedMinutes = timeAllocationData.reduce((sum, act) => sum + act.time, 0);
    const freeTimeMinutes = totalMinutesInDay - totalAllocatedMinutes;

    const data = timeAllocationData.map((entry, index) => ({
      name: entry.name,
      value: entry.time, // value should be in minutes for the chart
      activities: entry.activities,
      fill: activityColorMapping[entry.name] || themeColors[index % themeColors.length]
    }));

    if (freeTimeMinutes > 0) {
        data.push({
            name: 'Free Time',
            value: freeTimeMinutes,
            activities: [],
            fill: activityColorMapping['Free Time'],
        });
    }

    return data;
  }, [timeAllocationData, themeColors]);

  return (
    <>
      <Card className="h-full bg-card/50">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">Your Productivity Snapshot</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={onOpenKanbanModal}>
              <LayoutDashboard className="h-4 w-4" />
              <span className="sr-only">Open Kanban Board</span>
            </Button>
            <Button variant="outline" size="icon" onClick={onOpenStatsModal}>
              <BarChart3 className="h-4 w-4" />
              <span className="sr-only">Open Stats Overview</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col items-center justify-center text-center p-4 rounded-lg bg-muted/50">
                <p className="text-muted-foreground">Productivity Level</p>
                <p className="text-muted-foreground mt-2">Not enough data</p>
              <Separator className="my-4" />
              <p className="text-muted-foreground">Total Productive Hours</p>
              <h3 className="text-2xl font-bold">{stats.totalProductiveHours.toFixed(2)}</h3>
              <p className="text-xs text-muted-foreground mb-1">per day (average)</p>
              {stats.avgProductiveHoursChange !== 0 && (
                <p className={cn("text-xs text-muted-foreground flex items-center justify-center", stats.avgProductiveHoursChange > 0 ? "text-emerald-500" : "text-red-500")}>
                  {stats.avgProductiveHoursChange > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  {stats.avgProductiveHoursChange === Infinity ? 'vs yesterday' : `${Math.abs(stats.avgProductiveHoursChange).toFixed(0)}% vs yesterday`}
                </p>
              )}
            </div>

            <div className="md:col-span-2 space-y-4">
               <div className="relative">
                <h4 className="font-semibold mb-2 flex items-center gap-2"><BarChart3 /> Top Specializations</h4>
                {topSpecializations.length > 0 && themeColors.length > 0 ? (
                    <ChartContainer config={{}} className="h-[150px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={topSpecializations} layout="vertical" margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                                <CartesianGrid horizontal={false} />
                                <XAxis type="number" dataKey="hours" domain={[0, 'dataMax + 2']} fontSize={12} tickFormatter={(value) => value.toFixed(1)} />
                                <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} fontSize={10} interval={0} />
                                <RechartsTooltip
                                    cursor={{ fill: "hsl(var(--muted))" }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                    <p className="font-bold text-foreground">{data.name}</p>
                                                    <p className="text-muted-foreground">{data.hours.toFixed(1)} hours logged</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                                    {topSpecializations.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={themeColors[index % themeColors.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-2 min-h-[6rem]">Log time for specializations to see your top 5 here.</p>
                )}
               </div>
               <Separator className="my-2" />
               <div className="relative">
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp /> Learning Progress</h4>
                   {learningItems.length > 0 ? (
                      <Carousel
                          items={learningItems}
                          renderItem={(item) => {
                              const progress = item.estimated > 0 ? (item.logged / item.estimated) * 100 : 0;
                              const isOverspent = item.logged > item.estimated;
                              const overspentHours = item.logged - item.estimated;
                              return (
                                <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                                  <div className="flex justify-between items-start">
                                    <span className="font-semibold text-sm text-foreground">{item.name}</span>
                                  </div>
                                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                                    {isOverspent ? (
                                        <>
                                            <div 
                                                className="h-full bg-primary" 
                                                style={{ width: `${(item.estimated / item.logged) * 100}%` }}
                                            />
                                            <div 
                                                className="h-full bg-orange-500"
                                                style={{ width: `${((item.logged - item.estimated) / item.logged) * 100}%` }}
                                            />
                                        </>
                                    ) : (
                                        <div 
                                            className="h-full bg-primary" 
                                            style={{ width: `${progress}%` }} 
                                        />
                                    )}
                                  </div>
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>{item.logged.toFixed(1)}h logged</span>
                                    {isOverspent ? (
                                        <span className="font-medium text-orange-500">+{overspentHours.toFixed(1)}h over</span>
                                    ) : (
                                        <span>{item.estimated.toFixed(1)}h est.</span>
                                    )}
                                  </div>
                                </div>
                              )
                          }}
                      />
                  ) : (
                      <p className="text-sm text-muted-foreground text-center py-2 min-h-[6rem]">Log time against estimated goals to see your learning progress.</p>
                  )}
              </div>
              <Separator className="my-2" />
              <div className="relative">
                <h4 className="font-semibold mb-2 flex items-center gap-2"><Rocket /> Upcoming Roadmap</h4>
                <motion.div layout>
                  {roadmapItems.length > 0 ? (
                      <Carousel
                        items={roadmapItems}
                        renderItem={(item: any) => {
                          const loggedHours = item.release.totalLoggedHours || 0;
                          const estimatedHours = item.release.totalEstimatedHours || 0;

                          return (
                            <div 
                              className="flex flex-col justify-between p-3 rounded-md bg-muted/30 border-b-0 h-[100px] cursor-pointer" 
                              onClick={() => {
                                setSelectedReleaseInfo({ release: item.release, topic: item.topic, type: item.type });
                                setIsProjectDetailsModalOpen(true);
                              }}
                            >
                                <div className="flex justify-between items-start">
                                    <div className='min-w-0'>
                                        <p className="font-bold text-foreground truncate" title={item.release.name}>{item.release.name}</p>
                                        <p className="text-xs text-muted-foreground truncate" title={item.topic}>Topic: <span className="font-medium">{item.topic}</span></p>
                                    </div>
                                    <div className="flex flex-col items-end ml-2 flex-shrink-0">
                                        <Badge variant="outline" className="capitalize text-xs mb-1">{item.type}</Badge>
                                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                                            {format(parseISO(item.release.launchDate), 'MMM dd')} ({item.release.daysRemaining} days)
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                    <div className="flex justify-between items-center">
                                        <span>Logged / Est.</span>
                                        <span className="font-mono font-medium text-foreground">
                                            {loggedHours.toFixed(1)}h / {estimatedHours > 0 ? `${estimatedHours.toFixed(1)}h` : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Prod. / Total Hours</span>
                                        <span className="font-mono font-medium text-foreground">
                                            {item.release.availableHours?.toFixed(0) ?? '0'}h / {item.release.totalAvailableHours?.toFixed(0) ?? '0'}h
                                        </span>
                                    </div>
                                </div>
                            </div>
                          )
                        }}
                      />
                  ) : (
                      <div className="text-sm text-muted-foreground p-2 min-h-[6rem] flex flex-col justify-center">
                      <p>No upcoming releases planned.</p>
                      <p className="text-xs mt-1">Go to Productization or Offerization to create a release plan.</p>
                      </div>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
          <Separator className="my-6" />
          <div>
            <h4 className="font-semibold mb-4 text-center">Daily Time Allocation (24h)</h4>
            {pieData.length > 0 ? (
                <ChartContainer config={{}} className="h-[200px] w-full cursor-pointer" onClick={handleBarClick}>
                  <ResponsiveContainer>
                      <PieChart>
                          <ChartTooltip
                              cursor={{ fill: "hsl(var(--muted))" }}
                              content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      const categoryName = data.name;
                                      
                                      if (categoryName === 'Free Time') {
                                        return (
                                           <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                <p className="font-bold text-foreground">{categoryName}: {formatMinutes(data.value)}</p>
                                           </div>
                                        );
                                      }

                                      const categoryData = timeAllocationData.find(item => item.name === categoryName);

                                      return (
                                          <div className="grid min-w-[12rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                              <p className="font-bold text-foreground">{categoryName}: {formatMinutes(data.value)}</p>
                                              {categoryData && categoryData.activities && categoryData.activities.length > 0 && (
                                                <>
                                                  <Separator />
                                                  <ul className="space-y-1">
                                                      {categoryData.activities.map((act, index) => (
                                                          <li key={index} className="text-muted-foreground">{act.name} ({formatMinutes(act.duration)})</li>
                                                      ))}
                                                  </ul>
                                                </>
                                              )}
                                          </div>
                                      );
                                  }
                                  return null;
                              }}
                          />
                          <Pie
                              data={pieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              innerRadius={50}
                              labelLine={false}
                              label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                          >
                              {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                          </Pie>
                      </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
            ) : <div className="h-[200px] w-full bg-muted animate-pulse rounded-md" />}
          </div>
        </CardContent>
      </Card>

      {selectedReleaseInfo && (
        <Dialog open={isProjectDetailsModalOpen} onOpenChange={setIsProjectDetailsModalOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Project Details: "{selectedReleaseInfo.release.name}"</DialogTitle>
              <DialogDescription>
                 {selectedReleaseInfo.release.description}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label className="font-semibold">Associated Micro-Skills</Label>
              <div className="mt-2 space-y-3 max-h-96 overflow-y-auto pr-2">
                {microSkillsForRelease.map((skill) => {
                   const isComplete = isMicroSkillComplete(skill);
                   return(
                      <Card key={skill.id} className={cn("transition-colors", isComplete && "bg-muted/50 dark:bg-muted/30")}>
                        <CardHeader className="p-3">
                          <CardTitle className={cn("text-base", isComplete && "line-through text-muted-foreground")}>{skill.name}</CardTitle>
                        </CardHeader>
                        {(skill.curiosities.length > 0 || skill.intentions.length > 0) && (
                           <CardContent className="p-3 pt-0 text-xs text-muted-foreground space-y-2">
                            {skill.curiosities.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-foreground flex items-center gap-1.5"><Flashlight className="h-3.5 w-3.5"/>Curiosities</h4>
                                <ul className="list-disc list-inside pl-2">
                                    {skill.curiosities.map(c => <li key={c.id}>{c.name}</li>)}
                                </ul>
                              </div>
                            )}
                            {skill.intentions.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-foreground flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5"/>Intentions</h4>
                                 <ul className="list-disc list-inside pl-2">
                                    {skill.intentions.map(i => <li key={i.id}>{i.name}</li>)}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                   )
                })}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProjectDetailsModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {allocationDetailData && (
        <Dialog open={isAllocationDetailModalOpen} onOpenChange={setIsAllocationDetailModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Time Allocation for {allocationDetailData.category}</DialogTitle>
                    <DialogDescription>
                        A breakdown of how your time was spent in this category today.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {allocationDetailData.tasks.length > 0 ? (
                        <ChartContainer config={{}} className="h-60 w-full">
                            <ResponsiveContainer>
                                <BarChart data={allocationDetailData.tasks} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                                    <CartesianGrid horizontal={false} />
                                    <XAxis type="number" dataKey="duration" domain={[0, 'dataMax + 5']} fontSize={12} tickFormatter={(value) => `${value}m`} />
                                    <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} fontSize={12} interval={0} />
                                    <RechartsTooltip
                                        cursor={{ fill: "hsl(var(--muted))" }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                                                        <p className="font-bold text-foreground">{data.name}</p>
                                                        <p className="text-muted-foreground">{data.duration} minutes</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="duration" radius={[0, 4, 4, 0]}>
                                        {allocationDetailData.tasks.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={themeColors[index % themeColors.length] || themeColors[0]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-8">No specific tasks with logged time for this category today.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
