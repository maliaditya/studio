
"use client";

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import type { CoreSkill } from '@/types/workout';

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function WeeklyReviewModal({ isOpen, onOpenChange }: WeeklyReviewModalProps) {
  const { 
    allUpskillLogs,
    allDeepWorkLogs,
    brandingLogs,
    coreSkills,
    offerizationPlans,
    permanentlyLoggedTaskIds,
    getDescendantLeafNodes,
    deepWorkDefinitions, 
    upskillDefinitions,
  } = useAuth();

  const weeklyData = useMemo(() => {
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });

    const getWeeklyTotalMinutes = (logs: any[], durationField: 'reps' | 'weight'): number => {
      return logs.reduce((total, log) => {
        const logDate = parseISO(log.date);
        if (isWithinInterval(logDate, { start: startOfThisWeek, end: endOfThisWeek })) {
          return total + log.exercises.reduce((sum: number, ex: any) => 
            sum + (ex.loggedSets || []).reduce((setSum: number, set: any) => setSum + (set[durationField] || 0), 0), 0);
        }
        return total;
      }, 0);
    };

    const learningHours = getWeeklyTotalMinutes(allUpskillLogs, 'reps') / 60;
    const deepWorkHours = getWeeklyTotalMinutes(allDeepWorkLogs, 'weight') / 60;
    const brandingTasksCompleted = brandingLogs.reduce((total, log) => {
        const logDate = parseISO(log.date);
        if (isWithinInterval(logDate, { start: startOfThisWeek, end: endOfThisWeek })) {
            return total + log.exercises.filter(ex => ex.loggedSets.length >= 4).length;
        }
        return total;
    }, 0);

    const plannedSpecializations = Object.entries(offerizationPlans || {})
        .filter(([, plan]) => plan.learningPlan && ((plan.learningPlan.audioVideoResources?.length || 0) > 0 || (plan.learningPlan.bookWebpageResources?.length || 0) > 0))
        .map(([specId]) => coreSkills.find(s => s.id === specId))
        .filter((spec): spec is CoreSkill => !!spec);
        
    const specializationProgress = plannedSpecializations.map(spec => {
        let completedMicroSkills: string[] = [];
        let completedSkillAreas: string[] = [];
        
        spec.skillAreas.forEach(area => {
            const allMicroSkillsComplete = area.microSkills.every(ms => {
                const intentions = deepWorkDefinitions.filter(def => def.category === ms.name);
                const curiosities = upskillDefinitions.filter(def => def.category === ms.name);
                const allLeafNodes = [
                    ...intentions.flatMap(i => getDescendantLeafNodes(i.id, 'deepwork')),
                    ...curiosities.flatMap(c => getDescendantLeafNodes(c.id, 'upskill'))
                ];
                if(allLeafNodes.length === 0) return false;
                return allLeafNodes.every(node => permanentlyLoggedTaskIds.has(node.id));
            });
            if(allMicroSkillsComplete) {
                completedSkillAreas.push(area.name);
            } else {
                area.microSkills.forEach(ms => {
                    const intentions = deepWorkDefinitions.filter(def => def.category === ms.name);
                    const curiosities = upskillDefinitions.filter(def => def.category === ms.name);
                    const allLeafNodes = [
                        ...intentions.flatMap(i => getDescendantLeafNodes(i.id, 'deepwork')),
                        ...curiosities.flatMap(c => getDescendantLeafNodes(c.id, 'upskill'))
                    ];
                     if(allLeafNodes.length > 0 && allLeafNodes.every(node => permanentlyLoggedTaskIds.has(node.id))) {
                        completedMicroSkills.push(ms.name);
                     }
                });
            }
        });
        
        return {
            name: spec.name,
            completedMicroSkills,
            completedSkillAreas,
        };
    });

    return {
      learningHours,
      deepWorkHours,
      brandingTasksCompleted,
      specializationProgress,
    };
  }, [allUpskillLogs, allDeepWorkLogs, brandingLogs, coreSkills, offerizationPlans, permanentlyLoggedTaskIds, getDescendantLeafNodes, deepWorkDefinitions, upskillDefinitions]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>This Week's Productivity Review</DialogTitle>
          <DialogDescription>
            Summary of your progress from Monday to Sunday.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader><CardTitle>Total Learning</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold">{weeklyData.learningHours.toFixed(1)} hrs</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Total Deep Work</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold">{weeklyData.deepWorkHours.toFixed(1)} hrs</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Spaced Repetitions</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold">0</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Branding Tasks Done</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold">{weeklyData.brandingTasksCompleted}</p></CardContent>
                    </Card>
                </div>
                
                <div>
                    <h3 className="text-lg font-semibold mb-2">Specialization Progress</h3>
                    <div className="space-y-4">
                        {weeklyData.specializationProgress.map(spec => (
                            <Card key={spec.name}>
                                <CardHeader><CardTitle className="text-base">{spec.name}</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <h4 className="font-semibold text-sm">Skills Completed</h4>
                                        {spec.completedSkillAreas.length > 0 ? (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {spec.completedSkillAreas.map(area => <Badge key={area}>{area}</Badge>)}
                                            </div>
                                        ) : <p className="text-xs text-muted-foreground">No full skill areas completed this week.</p>}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm">Micro-Skills Completed</h4>
                                        {spec.completedMicroSkills.length > 0 ? (
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {spec.completedMicroSkills.map(ms => <Badge variant="secondary" key={ms}>{ms}</Badge>)}
                                            </div>
                                        ) : <p className="text-xs text-muted-foreground">No new micro-skills completed this week.</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
