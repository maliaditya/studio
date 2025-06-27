
"use client";

import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Share2, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface ProductivitySnapshotProps {
  stats: any;
  timeAllocationData: { name: string; time: number; fill: string; }[];
  onOpenStatsModal: () => void;
}

export function ProductivitySnapshot({ stats, timeAllocationData, onOpenStatsModal }: ProductivitySnapshotProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 gap-6 mb-6">
      <div>
        <Card className="h-full bg-card/50">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-primary">Your Productivity Snapshot</CardTitle>
            </div>
            <Button variant="outline" size="icon" onClick={onOpenStatsModal}>
              <BarChart3 className="h-4 w-4" />
              <span className="sr-only">Open Stats Overview</span>
            </Button>
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
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp /> Learning Progress</h4>
                  <div className="text-sm">
                    {Object.keys(stats.learningStats).length > 0 ? (
                      <Accordion type="single" collapsible className="w-full space-y-2">
                        {Object.entries(stats.learningStats).map(([topic, topicStats]: [string, any]) => {
                          const showTodayStats = topicStats.todaysProgress > 0 || (topicStats.requiredDailyRate && topicStats.requiredDailyRate > 0.01);
                          return (
                            <AccordionItem key={topic} value={topic} className="p-3 rounded-md bg-muted/30 border-0">
                              <AccordionTrigger className="py-0 text-left hover:no-underline">
                                <div className="flex flex-col items-start">
                                  <h5 className="font-bold text-foreground text-base">{topic}</h5>
                                  <div className="text-xs text-muted-foreground font-normal">
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
                              <AccordionContent className="pt-2">
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
                          )
                        })}
                      </Accordion>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-2">No learning stats yet. Log progress and duration in the Upskill page.</p>
                    )}
                  </div>
                </div>
                <Separator className="my-2" />
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><Share2 /> Personal Branding</h4>
                  {stats.brandingStatus && (
                    stats.brandingStatus.status === 'in_progress' ? (
                      <div className="text-sm cursor-pointer hover:bg-muted/50 p-2 rounded-md" onClick={() => router.push('/personal-branding')}>
                        <p>Next up: <span className="font-bold text-foreground">{stats.brandingStatus.taskName}</span></p>
                        <p>Current Stage: <span className="font-bold text-foreground">{stats.brandingStatus.stage} ({stats.brandingStatus.progress})</span></p>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-2">
                        <p>{stats.brandingStatus.message}</p>
                        <p className="text-xs mt-1">{stats.brandingStatus.subMessage}</p>
                        {stats.brandingStatus.eligibleFocusAreas.length > 0 && (
                          <div className="mt-2">
                            <p className="font-medium text-foreground text-xs">Eligible Areas:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {stats.brandingStatus.eligibleFocusAreas.map((area: string) => <Badge key={area} variant="secondary" className="text-xs">{area}</Badge>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  )}
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
      </div>
    </div>
  );
}
