
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

interface LoggedIntention {
  id: string;
  name: string;
  category: string;
  dates: string[];
}

function SpacedRepetitionPageContent() {
  const { 
    deepWorkDefinitions, 
    allDeepWorkLogs, 
    getDeepWorkNodeType, 
    coreSkills, 
    getDescendantLeafNodes,
    getDeepWorkLoggedMinutes 
  } = useAuth();

  const loggedIntentions = useMemo(() => {
    const intentionNodes = deepWorkDefinitions.filter(
      def => getDeepWorkNodeType(def) === 'Intention'
    );
    
    const intentionLogsMap = new Map<string, { def: ExerciseDefinition, dates: Set<string> }>();

    allDeepWorkLogs.forEach(log => {
      log.exercises.forEach(ex => {
        const intentionNode = intentionNodes.find(n => {
            const leafNodes = getDescendantLeafNodes(n.id, 'deepwork');
            return leafNodes.some(leaf => leaf.id === ex.definitionId);
        });
        
        if (intentionNode && (ex.loggedSets?.length ?? 0) > 0) {
          if (!intentionLogsMap.has(intentionNode.id)) {
            intentionLogsMap.set(intentionNode.id, { def: intentionNode, dates: new Set() });
          }
          intentionLogsMap.get(intentionNode.id)?.dates.add(log.date);
        }
      });
    });

    const result: LoggedIntention[] = [];
    intentionLogsMap.forEach((value, key) => {
        const totalLogged = getDeepWorkLoggedMinutes(value.def);
        if (totalLogged > 0) {
            result.push({
                id: key,
                name: value.def.name,
                category: value.def.category,
                dates: Array.from(value.dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()),
            });
        }
    });
    
    return result.sort((a, b) => 
        new Date(b.dates[0]).getTime() - new Date(a.dates[0]).getTime()
    );

  }, [deepWorkDefinitions, allDeepWorkLogs, getDeepWorkNodeType, getDescendantLeafNodes, getDeepWorkLoggedMinutes]);

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
            intentions: associatedIntentions.map(intention => ({
                ...intention,
                totalLoggedMinutes: getDeepWorkLoggedMinutes(intention)
            }))
        };
    });
  }, [coreSkills, deepWorkDefinitions, getDeepWorkNodeType, getDeepWorkLoggedMinutes]);

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
      
      {loggedIntentions.length > 0 && (
        <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Lightbulb className="h-6 w-6 text-amber-500" />Logged Intentions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loggedIntentions.map(intention => (
                <Card key={intention.id} className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-start gap-2">
                    <span>{intention.name}</span>
                    </CardTitle>
                    <CardDescription>{intention.category}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <h4 className="font-semibold text-sm mb-2">Logged Dates:</h4>
                    <ScrollArea className="h-32 pr-4">
                    <div className="flex flex-wrap gap-1">
                        {intention.dates.map(date => (
                        <Badge key={date} variant="outline" className="font-normal">
                            {format(parseISO(date), 'MMM d, yyyy')}
                        </Badge>
                        ))}
                    </div>
                    </ScrollArea>
                </CardContent>
                </Card>
            ))}
            </div>
        </div>
      )}

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
                              <ul className="space-y-1 text-sm list-disc list-inside">
                                {skill.intentions.map(intention => (
                                  <li key={intention.id} className="flex justify-between items-center">
                                    <span>{intention.name}</span>
                                    {intention.totalLoggedMinutes > 0 && (
                                        <Badge variant="secondary">{formatMinutes(intention.totalLoggedMinutes)}</Badge>
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

      {loggedIntentions.length === 0 && microSkillsForRepetition.length === 0 && (
        <Card className="mt-8">
            <CardContent className="p-8 text-center text-muted-foreground">
                <p>You haven't logged any "Intentions" or marked any "Micro-Skills" for repetition yet.</p>
                <p className="mt-2">Once you do, they will appear here for review.</p>
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
