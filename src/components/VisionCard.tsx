
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, isAfter, startOfToday, differenceInDays } from 'date-fns';
import { ArrowRight, Workflow, Brain } from 'lucide-react';
import type { CoreSkill } from '@/types/workout';
import Link from 'next/link';

export function VisionCard() {
    const { skillAcquisitionPlans, coreSkills, deepWorkDefinitions, upskillDefinitions } = useAuth();
    
    const specializations = useMemo(() => {
        return coreSkills.filter(skill => skill.type === 'Specialization');
    }, [coreSkills]);

    const renderVisionContent = () => {
        const allDefinitions = [...deepWorkDefinitions, ...upskillDefinitions];
        const defById = new Map(allDefinitions.map(def => [def.id, def]));

        const calculateEstimatedMinutes = (definitionId: string, visited = new Set<string>()): number => {
            const def = defById.get(definitionId);
            if (!def || visited.has(definitionId)) return 0;
            visited.add(definitionId);
            const children = [...(def.linkedDeepWorkIds || []), ...(def.linkedUpskillIds || [])];
            if (children.length === 0) {
                return def.estimatedDuration || 0;
            }
            return children.reduce((sum, childId) => sum + calculateEstimatedMinutes(childId, visited), 0);
        };

        const plannedSpecs = (skillAcquisitionPlans || [])
            .map(plan => {
                const spec = specializations.find(s => s.id === plan.specializationId);
                if (!spec) return null;

                const microSkillNames = new Set(
                    spec.skillAreas.flatMap(area => area.microSkills.map(ms => ms.name))
                );
                const relatedDefs = allDefinitions.filter(def => microSkillNames.has(def.category));
                const totalMinutes = relatedDefs.reduce((sum, def) => sum + calculateEstimatedMinutes(def.id), 0);
                const computedHours = totalMinutes > 0 ? Math.round((totalMinutes / 60) * 10) / 10 : null;

                const daysRemaining = plan.targetDate ? differenceInDays(parseISO(plan.targetDate), new Date()) : null;
                const isOverdue = daysRemaining !== null && daysRemaining < 0;

                return { ...plan, specName: spec.name, daysRemaining, isOverdue, computedHours };
            })
            .filter((p): p is NonNullable<typeof p> => !!p)
            .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

        if (plannedSpecs.length === 0) {
            return (
                <div className="text-center text-sm text-muted-foreground py-4 flex flex-col items-center justify-center h-full">
                    <p>No skill acquisition plans found.</p>
                    <Link href="/strategic-planning" className="text-primary hover:underline mt-1">
                        Create a plan to see your vision here.
                    </Link>
                </div>
            );
        }

        return (
            <ScrollArea className="h-[250px] pr-3">
                <ul className="space-y-3">
                    {plannedSpecs.map(plan => (
                        <li key={plan.specializationId}>
                            <Card className="bg-muted/50">
                                <CardHeader className="p-3">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base">{plan.specName}</CardTitle>
                                        {plan.targetDate && (
                                            <p className={`text-xs font-medium whitespace-nowrap ${plan.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                {format(parseISO(plan.targetDate), 'MMM d, yyyy')}
                                            </p>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 pt-0 text-xs">
                                    <div className="grid grid-cols-2 gap-x-4">
                                        <div>
                                            <p className="text-muted-foreground">Est. Hours</p>
                                            <p className="font-bold">{plan.requiredHours != null ? plan.requiredHours : (plan.computedHours != null ? plan.computedHours : 'N/A')}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Est. Cost</p>
                                            <p className="font-bold">{plan.requiredMoney != null ? `$${plan.requiredMoney}` : 'N/A'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </li>
                    ))}
                </ul>
            </ScrollArea>
        );
    };

    return (
        <Card className="bg-card/50">
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2 text-primary">
                        <Brain />
                        Vision
                    </CardTitle>
                    <CardDescription>Your high-level skill acquisition goals.</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/strategic-planning">
                        <Workflow className="mr-2 h-4 w-4" />
                        Full Strategy
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                {renderVisionContent()}
            </CardContent>
        </Card>
    );
}
