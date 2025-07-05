"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Briefcase, BookCopy, ArrowRight } from 'lucide-react';
import type { ExerciseDefinition } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';

interface ProjectOverviewCardProps {
  deepWorkDefinitions: ExerciseDefinition[];
  upskillDefinitions: ExerciseDefinition[];
}

export function ProjectOverviewCard({ deepWorkDefinitions, upskillDefinitions }: ProjectOverviewCardProps) {
  const deepWorkTopics = useMemo(() => {
    const topics = new Map<string, number>();
    (deepWorkDefinitions || []).forEach(def => {
      // Only count actual focus areas, not bundles
      if (!def.focusAreaIds) {
        topics.set(def.category, (topics.get(def.category) || 0) + 1);
      }
    });
    return Array.from(topics.entries())
      .map(([topic, count]) => ({ name: topic, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [deepWorkDefinitions]);

  const upskillTopics = useMemo(() => {
    const topics = new Map<string, number>();
    (upskillDefinitions || []).forEach(def => {
      if (def.name !== 'placeholder') {
        topics.set(def.category, (topics.get(def.category) || 0) + 1);
      }
    });
    return Array.from(topics.entries())
      .map(([topic, count]) => ({ name: topic, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [upskillDefinitions]);

  const renderTopicList = (topics: { name: string, count: number }[], type: 'deep-work' | 'upskill') => {
    if (topics.length === 0) {
      return (
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>No active {type === 'deep-work' ? 'projects' : 'learning topics'}.</p>
          <Link href={`/${type}`} className="text-primary hover:underline">
            Go to {type === 'deep-work' ? 'Deep Work' : 'Upskill'} to add some.
          </Link>
        </div>
      );
    }
    return (
      <ul className="space-y-2">
        {topics.map(topic => (
          <li key={topic.name}>
            <Link href={`/${type}`}>
              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  {type === 'deep-work' ? <Briefcase className="h-4 w-4 text-primary" /> : <BookCopy className="h-4 w-4 text-primary" />}
                  <span className="font-medium text-foreground">{topic.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{topic.count} {topic.count === 1 ? 'item' : 'items'}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Projects & Learning</CardTitle>
        <CardDescription>A high-level overview of your ongoing topics.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deep-work" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deep-work">Deep Work</TabsTrigger>
            <TabsTrigger value="upskill">Upskill</TabsTrigger>
          </TabsList>
          <TabsContent value="deep-work" className="mt-4">
            <ScrollArea className="h-48">
              {renderTopicList(deepWorkTopics, 'deep-work')}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="upskill" className="mt-4">
            <ScrollArea className="h-48">
              {renderTopicList(upskillTopics, 'upskill')}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
