
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Share2, ArrowUp, ArrowDown, Rocket, LayoutDashboard, Brain as BrainIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { Carousel } from './ui/carousel';
import { useState } from 'react';
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
import type { Release } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';

interface ProductivitySnapshotProps {
  stats: any;
  timeAllocationData: { name: string; time: number; fill: string; }[];
  onOpenStatsModal: () => void;
  onOpenKanbanModal: () => void;
}

export function ProductivitySnapshot({ stats, timeAllocationData, onOpenStatsModal, onOpenKanbanModal }: ProductivitySnapshotProps) {
  const router = useRouter();
  const [isAddFeatureModalOpen, setIsAddFeatureModalOpen] = useState(false);
  const [selectedReleaseInfo, setSelectedReleaseInfo] = useState<{ release: Release, topic: string, type: 'product' | 'service' } | null>(null);
  const [newFeatureName, setNewFeatureName] = useState('');
  const { addFeatureToRelease, microSkillMap } = useAuth();

  const handleAddFeature = () => {
    if (selectedReleaseInfo) {
      addFeatureToRelease(selectedReleaseInfo.release, selectedReleaseInfo.topic, newFeatureName, selectedReleaseInfo.type);
      setNewFeatureName('');
      // Keep the modal open after adding
    }
  };

  const microSkillsForRelease = React.useMemo(() => {
    if (!selectedReleaseInfo || !selectedReleaseInfo.release.focusAreaIds) {
      return [];
    }
    return selectedReleaseInfo.release.focusAreaIds
      .map(id => microSkillMap.get(id)?.microSkillName)
      .filter((name): name is string => !!name);
  }, [selectedReleaseInfo, microSkillMap]);

  const learningItems = Object.entries(stats.learningStats);
  const brandingItems = stats.brandingStatus?.status === 'in_progress' ? stats.brandingStatus.items : [];
  const roadmapItems = stats.upcomingReleases || [];

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
              {stats.currentLevel ? (
                <>
                  <h3 className="text-4xl font-bold text-primary">{stats.currentLevel.level}</h3>
                  <p className="text-sm">{stats.currentLevel.description}</p>
                  <p className="text-xs text-muted-foreground">{stats.currentLevel.zone}</p>
                </>
              ) : (
                <p className="text-muted-foreground mt-2">Not enough data</p>
              )}
              <Separator className="my-4" />
              <p className="text-muted-foreground">Total Productive Hours</p>
              <h3 className="text-2xl font-bold">{stats.totalProductiveHours.toFixed(2)}</h3>
              <p className="text-xs text-muted-foreground mb-1">per day (average)</p>
              {stats.avgProductiveHoursChange !== 0 && (
                <p className={cn("text-xs text-muted-foreground flex items-center justify-center", stats.avgProductiveHoursChange > 0 ? "text-emerald-500" : "text-red-500")}>
                  {stats.avgProductiveHoursChange > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  {Math.abs(stats.avgProductiveHoursChange).toFixed(0)}% vs previous average
                </p>
              )}
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="relative">
                <h4 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp /> Learning Progress</h4>
                <motion.div layout>
                  {learningItems.length > 0 ? (
                    <Carousel
                      items={learningItems}
                      renderItem={([topic, topicStats]: [string, any]) => {
                        const showTodayStats = topicStats.todaysProgress > 0 || (topicStats.requiredDailyRate && topicStats.requiredDailyRate > 0.01);
                        return (
                          <Accordion type="single" collapsible className="w-full" key={topic}>
                              <AccordionItem value={topic} className="p-0 rounded-md bg-muted/30 border-b-0">
                                <AccordionTrigger className="py-2 px-3 text-left hover:no-underline">
                                    <div className="flex flex-col items-start flex-grow min-w-0">
                                      <h5 className="font-bold text-foreground text-base truncate" title={topic}>{topic}</h5>
                                      <div className="text-xs text-muted-foreground font-normal truncate">
                                        Progress: {topicStats.totalProgress.toLocaleString()} / {topicStats.goalValue.toLocaleString()} {topicStats.unit.split('/')[0]}
                                      </div>
                                    </div>
                                    {showTodayStats && (
                                      <div className="text-right text-xs ml-4 flex-shrink-0">
                                        <div className="font-semibold text-foreground whitespace-nowrap">Today</div>
                                        {topicStats.todaysProgress > 0 ? (
                                          <div className="text-muted-foreground whitespace-nowrap text-green-500">
                                            +{topicStats.todaysProgress.toLocaleString()} {topicStats.todaysProgress === 1 ? topicStats.progressUnit.slice(0, -1) : topicStats.progressUnit}
                                            {topicStats.timeForTodaysProgress !== null && ` (est. ${(topicStats.timeForTodaysProgress / 60).toFixed(1)} hr)`}
                                          </div>
                                        ) : null}
                                        {topicStats.remainingForToday > 0 ? (
                                          <div className="text-muted-foreground whitespace-nowrap">
                                            {topicStats.remainingForToday.toLocaleString()} {topicStats.remainingForToday === 1 ? topicStats.progressUnit.slice(0, -1) : topicStats.progressUnit} left
                                          </div>
                                        ) : (topicStats.todaysProgress > 0 && topicStats.requiredDailyRate > 0) ? (
                                          <div className="text-muted-foreground whitespace-nowrap text-green-500">
                                            Daily goal met!
                                          </div>
                                        ) : (topicStats.todaysProgress === 0 && topicStats.requiredDailyRate === 0) ? (
                                          <div className="text-muted-foreground whitespace-nowrap">
                                            -
                                          </div>
                                        ) : null}
                                      </div>
                                    )}
                                </AccordionTrigger>
                                <AccordionContent className="px-3">
                                    <Progress value={(topicStats.totalProgress / topicStats.goalValue) * 100} className="h-2 my-2" />
                                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                      {topicStats.nextMilestone && (
                                        <div className="space-y-1">
                                          <div className="font-semibold">Next Milestone ({topicStats.nextMilestone.percent}%)</div>
                                          <div>Est. Date: <span className="font-medium text-foreground">{topicStats.nextMilestone.date}</span></div>
                                          <div>Days Left: <span className="font-medium text-foreground">{topicStats.nextMilestone.daysRemaining}</span></div>
                                          <div>Needed: <span className="font-medium text-foreground">{topicStats.nextMilestone.progressNeeded} {topicStats.nextMilestone.unit}</span></div>
                                          {topicStats.nextMilestone.timeNeeded !== null && (
                                            <div>Est. Time: <span className="font-medium text-foreground">{(topicStats.nextMilestone.timeNeeded / 60).toFixed(1)} hr</span></div>
                                          )}
                                        </div>
                                      )}
                                      <div className="space-y-1">
                                        <div className="font-semibold">Goal Completion</div>
                                        {topicStats.completion ? (
                                          <>
                                            <div>Est. Date: <span className="font-medium text-foreground">{topicStats.completion.date}</span></div>
                                            <div>Days Left: <span className="font-medium text-foreground">{topicStats.completion.daysRemaining}</span></div>
                                            {topicStats.completion.timeNeeded !== null && (
                                              <div>Est. Time: <span className="font-medium text-foreground">{(topicStats.completion.timeNeeded / 60).toFixed(1)} hr</span></div>
                                            )}
                                          </>
                                        ) : (topicStats.totalProgress >= topicStats.goalValue) ? <div className="text-green-500 font-bold">Completed!</div> : <div className="text-muted-foreground">Not enough data to project.</div>}
                                      </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Learning Speed</span>
                                        <span className="font-medium text-foreground">{topicStats.speed.toFixed(1)} {topicStats.unit}</span>
                                      </div>
                                    </div>
                                </AccordionContent>
                              </AccordionItem>
                          </Accordion>
                        )
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">No learning stats yet. Log progress and duration in the Upskill page.</p>
                  )}
                </motion.div>
              </div>
              <Separator className="my-2" />
              <div className="relative">
                <h4 className="font-semibold mb-2 flex items-center gap-2"><Share2 /> Personal Branding</h4>
                <motion.div layout>
                  {brandingItems.length > 0 ? (
                      <Carousel
                          items={brandingItems}
                          renderItem={(item: any) => (
                              <div className="flex flex-col justify-center p-3 rounded-md bg-muted/30 border-b-0 h-[88px] cursor-pointer" onClick={() => router.push('/personal-branding')}>
                                  <div className="flex justify-between items-center">
                                    <h5 className="font-bold text-foreground text-base truncate" title={item.taskName}>{item.taskName}</h5>
                                    <div className="text-right text-xs ml-4 flex-shrink-0">
                                        <div className="font-semibold text-foreground whitespace-nowrap">{item.stage}</div>
                                        <div className="text-muted-foreground whitespace-nowrap">({item.progress})</div>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1 truncate">Go to Personal Branding page to continue...</p>
                              </div>
                          )}
                      />
                  ) : (
                      <div className="text-sm text-muted-foreground p-2 min-h-[6rem] flex flex-col justify-center">
                        <p>{stats.brandingStatus?.message || 'No branding tasks.'}</p>
                        <p className="text-xs mt-1">{stats.brandingStatus?.subMessage || ''}</p>
                      </div>
                  )}
                </motion.div>
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
                                setIsAddFeatureModalOpen(true);
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
                                            {loggedHours.toFixed(1)}h / {estimatedHours > 0 ? `${estimatedHours}h` : 'N/A'}
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
            <ChartContainer config={{}} className="h-[150px] w-full">
              <ResponsiveContainer>
                <BarChart data={timeAllocationData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="time" domain={[0, 24]} tickCount={7} fontSize={12} />
                  <YAxis type="category" dataKey="name" width={70} tickLine={false} axisLine={false} fontSize={12} />
                  <RechartsTooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl">
                            <p className="font-bold text-foreground">{data.name}</p>
                            <p className="text-muted-foreground">{data.time.toFixed(1)} hours</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="time" radius={[0, 4, 4, 0]}>
                    {timeAllocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {selectedReleaseInfo && (
        <Dialog open={isAddFeatureModalOpen} onOpenChange={setIsAddFeatureModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Features for "{selectedReleaseInfo.release.name}"</DialogTitle>
              <DialogDescription>
                {selectedReleaseInfo.release.description
                  ? `Goal: ${selectedReleaseInfo.release.description}`
                  : "Break down this release into smaller, actionable features. This will create new Deep Work tasks."
                }
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-4 text-center my-4">
                <div className="p-2 bg-muted/50 rounded-md">
                    <p className="text-sm text-muted-foreground">Days Remaining</p>
                    <p className="text-2xl font-bold">{selectedReleaseInfo.release.daysRemaining}</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-md">
                    <p className="text-sm text-muted-foreground">Productive Hours</p>
                    <p className="text-2xl font-bold">{selectedReleaseInfo.release.availableHours?.toFixed(1) ?? 'N/A'}</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-md">
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold">{selectedReleaseInfo.release.totalAvailableHours ?? 'N/A'}</p>
                </div>
            </div>
            
            {(selectedReleaseInfo.release.totalLoggedHours !== undefined || (selectedReleaseInfo.release.totalEstimatedHours && selectedReleaseInfo.release.totalEstimatedHours > 0)) && (
                <div className="flex justify-around items-center text-center p-3 my-2 bg-muted/50 rounded-lg">
                    <div>
                        <p className="text-sm text-muted-foreground">Logged Hours</p>
                        <p className="text-2xl font-bold">{(selectedReleaseInfo.release.totalLoggedHours || 0).toFixed(1)}h</p>
                    </div>
                    {selectedReleaseInfo.release.totalEstimatedHours && selectedReleaseInfo.release.totalEstimatedHours > 0 && (
                        <>
                            <div className="text-2xl text-muted-foreground">/</div>
                            <div>
                                <p className="text-sm text-muted-foreground">Estimated Hours</p>
                                <p className="text-2xl font-bold">{selectedReleaseInfo.release.totalEstimatedHours}h</p>
                            </div>
                        </>
                    )}
                </div>
            )}
            
             {microSkillsForRelease.length > 0 && (
                <div className="space-y-2">
                    <Label className="font-semibold">Associated Micro-Skills</Label>
                    <div className="flex flex-wrap gap-1">
                        {microSkillsForRelease.map((skillName, index) => (
                            <Badge key={index} variant="secondary">{skillName}</Badge>
                        ))}
                    </div>
                </div>
            )}

            <div className="pt-2">
                <Label htmlFor="feature-name" className="text-sm font-medium">Add New Feature</Label>
                <div className="flex gap-2 mt-1">
                    <Input
                        id="feature-name"
                        value={newFeatureName}
                        onChange={(e) => setNewFeatureName(e.target.value)}
                        placeholder="e.g., Implement user authentication"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleAddFeature()}
                        className="flex-grow"
                    />
                    <Button onClick={handleAddFeature}>Add</Button>
                </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddFeatureModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
