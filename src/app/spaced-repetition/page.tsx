
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Lightbulb } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { ExerciseDefinition } from '@/types/workout';

interface LoggedIntention {
  id: string;
  name: string;
  category: string;
  dates: string[];
}

function SpacedRepetitionPageContent() {
  const { deepWorkDefinitions, allDeepWorkLogs, getDeepWorkNodeType } = useAuth();

  const loggedIntentions = useMemo(() => {
    // 1. Find all 'Intention' type definitions that have been worked on.
    const intentionNodes = deepWorkDefinitions.filter(
      def => getDeepWorkNodeType(def) === 'Intention' && (def.loggedDuration || 0) > 0
    );
    const intentionIds = new Set(intentionNodes.map(i => i.id));
    
    // 2. Create a map to store logged dates for each intention.
    const intentionLogsMap = new Map<string, { def: ExerciseDefinition, dates: Set<string> }>();

    // 3. Efficiently iterate through logs once to gather dates for the relevant intentions.
    allDeepWorkLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (intentionIds.has(ex.definitionId) && ex.loggedSets.length > 0) {
          if (!intentionLogsMap.has(ex.definitionId)) {
            const definition = intentionNodes.find(n => n.id === ex.definitionId);
            if (definition) {
              intentionLogsMap.set(ex.definitionId, { def: definition, dates: new Set() });
            }
          }
          intentionLogsMap.get(ex.definitionId)?.dates.add(log.date);
        }
      });
    });

    // 4. Convert the map to an array for rendering.
    const result: LoggedIntention[] = [];
    intentionLogsMap.forEach((value, key) => {
      result.push({
        id: key,
        name: value.def.name,
        category: value.def.category,
        dates: Array.from(value.dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()),
      });
    });
    
    // 5. Sort intentions by the most recent log date.
    return result.sort((a, b) => 
        new Date(b.dates[0]).getTime() - new Date(a.dates[0]).getTime()
    );

  }, [deepWorkDefinitions, allDeepWorkLogs, getDeepWorkNodeType]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Spaced Repetition</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Review your logged Intentions to reinforce your knowledge.
        </p>
      </div>
      
      {loggedIntentions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loggedIntentions.map(intention => (
            <Card key={intention.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500 mt-1 flex-shrink-0" />
                  <span>{intention.name}</span>
                </CardTitle>
                <CardDescription>{intention.category}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <h4 className="font-semibold text-sm mb-2">Logged Dates:</h4>
                <ScrollArea className="h-32 pr-4">
                  <div className="space-y-1">
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
      ) : (
        <Card className="mt-8">
            <CardContent className="p-8 text-center text-muted-foreground">
                <p>You haven't logged any "Intentions" from your Deep Work yet.</p>
                <p className="mt-2">Once you start logging your work on them, they will appear here for review.</p>
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
