
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays, subDays, isAfter, parseISO, differenceInDays } from 'date-fns';
import type { DatedWorkout, ExerciseDefinition, TopicGoal, WeightLog } from '@/types/workout';
import { LocalUser } from '@/types/workout';

interface LifePerspectiveCardProps {
    currentUser: LocalUser | null;
    allWorkoutLogs: DatedWorkout[];
    deepWorkDefinitions: ExerciseDefinition[];
    allDeepWorkLogs: DatedWorkout[];
    upskillDefinitions: ExerciseDefinition[];
    allUpskillLogs: DatedWorkout[];
    topicGoals: Record<string, TopicGoal>;
    weeklyStats: any; // Simplified for brevity
    weightLogs: WeightLog[];
}

export function LifePerspectiveCard({
    currentUser,
    allWorkoutLogs,
    deepWorkDefinitions,
    allDeepWorkLogs,
    upskillDefinitions,
    allUpskillLogs,
    topicGoals,
    weeklyStats,
    weightLogs
}: LifePerspectiveCardProps) {

    const lifePerspectiveNarrative = useMemo(() => {
        const nextWeek = addDays(new Date(), 7);
        const header = `🌱 A Glimpse Into Your Future – ${format(nextWeek, 'MMMM d, yyyy')}`;

        // Health
        const workoutLogsForYear = allWorkoutLogs.filter(log => isAfter(parseISO(log.date), subDays(new Date(), 365)));
        const workoutDates = new Set(workoutLogsForYear.map(log => log.date));
        let currentScore = 0.5;
        for (let i = 0; i < 365; i++) {
            const date = subDays(new Date(), 365 - i);
            const dateKey = format(date, 'yyyy-MM-dd');
            if (workoutDates.has(dateKey)) currentScore += (1 - currentScore) * 0.1;
            else currentScore *= 0.95;
        }
        const scoreWithWorkouts = Math.round((currentScore + (1 - currentScore) * 0.3) * 100);
        let weightNarrative = "";
        if (weightLogs.length >= 2) {
            const lastTwoLogs = [...weightLogs].sort((a,b) => a.date.localeCompare(b.date)).slice(-2);
            const weeklyChange = lastTwoLogs[1].weight - lastTwoLogs[0].weight;
            const nextWeekWeight = lastTwoLogs[1].weight + weeklyChange;
            weightNarrative = `Your discipline is paying off; you are projected to be around <b>${nextWeekWeight.toFixed(1)} kg/lb</b>.`
        }
        const healthNarrative = `Your energy is steady. With consistent effort this week, your health score could climb to ${scoreWithWorkouts}%. ${weightNarrative}`;

        // Deep Work
        const allDefsMap = new Map([...deepWorkDefinitions, ...upskillDefinitions].map(d => [d.id, d]));
        const linkedDeepWorkChildIds = new Set(deepWorkDefinitions.flatMap(def => def.linkedDeepWorkIds || []));
        const activeIntention = deepWorkDefinitions.find(def => ((def.linkedDeepWorkIds?.length ?? 0) > 0) && !linkedDeepWorkChildIds.has(def.id));
        let deepWorkNarrative = "";
        
        const getLoggedHours = (defId: string, logType: 'deepwork' | 'upskill'): number => {
          let totalMinutes = 0;
          const logs = logType === 'deepwork' ? allDeepWorkLogs : allUpskillLogs;
          const durationField = logType === 'deepwork' ? 'weight' : 'reps';
          logs.forEach(log => {
            log.exercises.forEach(ex => {
              if (ex.definitionId === defId) {
                totalMinutes += ex.loggedSets.reduce((sum, set) => sum + (set[durationField as keyof typeof set] || 0), 0);
              }
            });
          });
          return totalMinutes / 60;
        };
        
        if (activeIntention) {
          const allTasks: { id: string; name: string; type: 'Objective' | 'Action'; remainingHours: number }[] = [];
          const visited = new Set<string>();
          const topLevelObjectives: string[] = [];

          const recurse = (nodeId: string, isTopLevel: boolean) => {
              if (visited.has(nodeId)) return;
              visited.add(nodeId);

              const node = allDefsMap.get(nodeId);
              if (!node) return;

              const isParent = (node.linkedDeepWorkIds?.length ?? 0) > 0;
              const remainingHours = (node.estimatedHours || 0) - getLoggedHours(node.id, 'deepwork');
              
              if (remainingHours > 0.01) {
                const taskType = isParent ? 'Objective' : 'Action';
                allTasks.push({
                    id: node.id,
                    name: node.name,
                    type: taskType,
                    remainingHours,
                });
                if (isTopLevel && taskType === 'Objective') {
                    topLevelObjectives.push(node.name);
                }
              }

              if (isParent) (node.linkedDeepWorkIds || []).forEach(childId => recurse(childId, false));
          };
          
          (activeIntention.linkedDeepWorkIds || []).forEach(id => recurse(id, true));
          
          allTasks.sort((a, b) => a.remainingHours - b.remainingHours); // Prioritize smaller tasks

          const avgDailyProductiveHours = (weeklyStats.deepWork.current + weeklyStats.upskill.current) / 7;
          let workBudget = avgDailyProductiveHours > 0 ? avgDailyProductiveHours * 7 : 7;
          
          const projectedCompletedObjectives: string[] = [];
          const projectedCompletedActions: string[] = [];
          
          for (const task of allTasks) {
              if (workBudget >= task.remainingHours) {
                  workBudget -= task.remainingHours;
                  if (task.type === 'Objective') projectedCompletedObjectives.push(task.name);
                  else projectedCompletedActions.push(task.name);
              } else break;
          }
          
          let intentionNarrative = `Within your grand intention, '${activeIntention.name}', the path is clearing. By this time next week, you are on track to have completed`;
          if (projectedCompletedObjectives.length > 0) {
              intentionNarrative += ` the objective${projectedCompletedObjectives.length > 1 ? 's' : ''}: <b>${projectedCompletedObjectives.join(', ')}</b>.`;
          }
          if (projectedCompletedActions.length > 0) {
              if (projectedCompletedObjectives.length > 0) intentionNarrative += ' Further, you will have executed';
              intentionNarrative += ` the action${projectedCompletedActions.length > 1 ? 's' : ''}: <b>${projectedCompletedActions.join(', ')}</b>.`;
          }
          if (projectedCompletedObjectives.length === 0 && projectedCompletedActions.length === 0) {
              intentionNarrative = `Your intention, '${activeIntention.name}', is a significant undertaking. The momentum you build this week will be crucial.`;
              if (topLevelObjectives.length > 0) {
                  intentionNarrative += ` The objective for this week is: <b>${topLevelObjectives[0]}</b>.`;
              }
          }
          deepWorkNarrative = intentionNarrative;
        }

        // Upskill
        let upskillNarrative = "";
        if (Object.keys(topicGoals).length > 0) {
            const topic = Object.keys(topicGoals)[0];
            const goal = topicGoals[topic];
            const logsForTopic = allUpskillLogs.flatMap(log => log.exercises.filter(ex => ex.category === topic));
            const totalProgress = logsForTopic.reduce((sum, ex) => sum + ex.loggedSets.reduce((s, set) => s + set.weight, 0), 0);
            const sortedLogs = logsForTopic.map(ex => ex.loggedSets.map(s => s.timestamp)).flat().sort();
            const firstDay = sortedLogs.length > 0 ? new Date(sortedLogs[0]) : new Date();
            const durationDays = differenceInDays(new Date(), firstDay) + 1;
            const avgRate = durationDays > 0 ? totalProgress / durationDays : 0;
            const projectedProgress = totalProgress + (avgRate * 7);
            upskillNarrative = `On your desk, the ${topic} material lies open. You're projected to cross <b>${projectedProgress.toFixed(0)}</b> ${goal.goalType}—each concept is less foreign, more intuitive.`;
        }

        const affirmations = [
            "Consistency is not about pressure, it's about rhythm.",
            "One hour each day rewrites the next ten years of your life.",
            "You are not chasing progress—you are becoming it."
        ];
        const affirmation = affirmations[Math.floor(Math.random() * affirmations.length)];
        
        const alternatePath = `You break the rhythm, the story ends. You wake up where you had started, free to believe whatever you want. But if you stay on this path, you stay in Wonderland, and I show you how deep the rabbit hole goes.`;

        return { header, healthNarrative, deepWorkNarrative, upskillNarrative, affirmation, alternatePath };

    }, [allWorkoutLogs, deepWorkDefinitions, upskillDefinitions, allDeepWorkLogs, allUpskillLogs, topicGoals, weeklyStats, weightLogs, currentUser]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{lifePerspectiveNarrative.header}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: lifePerspectiveNarrative.healthNarrative}} />
                {lifePerspectiveNarrative.deepWorkNarrative && (
                    <p className="text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: lifePerspectiveNarrative.deepWorkNarrative}} />
                )}
                {lifePerspectiveNarrative.upskillNarrative && (
                    <p className="text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: lifePerspectiveNarrative.upskillNarrative}} />
                )}
                <blockquote className="mt-6 border-l-2 pl-6 italic text-muted-foreground">
                    {lifePerspectiveNarrative.affirmation}
                </blockquote>
                 <details className="text-xs text-muted-foreground pt-4">
                    <summary className="cursor-pointer">What if my rhythm breaks?</summary>
                    <p className="mt-2 italic" dangerouslySetInnerHTML={{__html: lifePerspectiveNarrative.alternatePath}} />
                </details>
            </CardContent>
        </Card>
    );
}
