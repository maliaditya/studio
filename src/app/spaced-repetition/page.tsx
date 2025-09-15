
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Lightbulb, BookCopy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { ExerciseDefinition, MicroSkill } from '@/types/workout';

function SpacedRepetitionPageContent() {
  const { 
    deepWorkDefinitions, 
    allDeepWorkLogs, 
    getDeepWorkNodeType, 
    coreSkills, 
    getDescendantLeafNodes,
    getDeepWorkLoggedMinutes 
  } = useAuth();

  const microSkillsForRepetition = useMemo(() => {
    const repetitionSkills = coreSkills
      .flatMap(cs => cs.skillAreas.flatMap(sa => sa.microSkills))
      .filter(ms => ms.isReadyForRepetition);
      
    return repetitionSkills.map(skill => {
        const associatedIntentions = deepWorkDefinitions.filter(def => 
            def.category === skill.name && getDeepWorkNodeType(def) === 'Intention'
        );
        
        return {
            ...skill,
            intentions: associatedIntentions.map(intention => {
                const totalLoggedMinutes = getDeepWorkLoggedMinutes(intention);

                let lastLoggedDate: string | null = null;
                if (totalLoggedMinutes > 0) {
                    const leafNodeIds = new Set(getDescendantLeafNodes(intention.id, 'deepwork').map(n => n.id));
                    let mostRecentDate: Date | null = null;

                    for (const log of allDeepWorkLogs) {
                        const hasLoggedLeaf = log.exercises.some(ex => 
                            leafNodeIds.has(ex.definitionId) && ex.loggedSets.length > 0
                        );
                        if (hasLoggedLeaf) {
                            const logDate = parseISO(log.date);
                            if (!mostRecentDate || logDate > mostRecentDate) {
                                mostRecentDate = logDate;
                            }
                        }
                    }
                    if (mostRecentDate) {
                        lastLoggedDate = format(mostRecentDate, 'MMM d, yyyy');
                    }
                }

                return {
                    ...intention,
                    totalLoggedMinutes: totalLoggedMinutes,
                    lastLoggedDate: lastLoggedDate
                };
            })
        };
    });
  }, [coreSkills, deepWorkDefinitions, getDeepWorkNodeType, getDeepWorkLoggedMinutes, allDeepWorkLogs, getDescendantLeafNodes]);

  const formatMinutes = (minutes: number) => {
    if (minutes < 1) return "0m";
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`.trim();
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Spaced Repetition</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Review your logged Intentions and marked micro-skills to reinforce your knowledge.
        </p>
      </div>
      
      {microSkillsForRepetition.length > 0 && (
        <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><BookCopy className="h-6 w-6 text-blue-500" />Micro-Skills for Repetition</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {microSkillsForRepetition.map(skill => (
                    <Card key={skill.id}>
                        <CardHeader>
                            <CardTitle>{skill.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {skill.intentions.length > 0 ? (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-muted-foreground">Intentions:</h4>
                              <ul className="space-y-2 text-sm list-inside">
                                {skill.intentions.map(intention => (
                                  <li key={intention.id} className="p-2 rounded-md bg-muted/50">
                                    <div className="flex justify-between items-start">
                                      <span className="font-medium text-foreground">{intention.name}</span>
                                      {intention.totalLoggedMinutes > 0 && (
                                        <Badge variant="secondary">{formatMinutes(intention.totalLoggedMinutes)}</Badge>
                                      )}
                                    </div>
                                    {intention.lastLoggedDate && (
                                      <p className="text-xs text-muted-foreground mt-1">Last logged: {intention.lastLoggedDate}</p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No intentions defined for this skill yet.</p>
                          )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      )}

      {microSkillsForRepetition.length === 0 && (
        <Card className="mt-8">
            <CardContent className="p-8 text-center text-muted-foreground">
                <p>You haven't marked any "Micro-Skills" for repetition yet.</p>
                <p className="mt-2">Go to the Skill page and check the box next to a micro-skill to begin.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SpacedRepetitionPage() {
  return (
    <AuthGuard>
      <SpacedRepetitionPageContent />
    </AuthGuard>
  );
}
