"use client";

import React from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from './ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { BookCopy, Link as LinkIcon, Briefcase, ExternalLink, Globe, Workflow } from 'lucide-react';
import type { ExerciseDefinition, Resource } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';

interface IntentionDetailModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  intention: ExerciseDefinition | null;
}

const getYouTubeThumbnailUrl = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        let videoId: string | null = null;
        if (urlObj.hostname.includes('youtube.com')) videoId = urlObj.searchParams.get('v');
        else if (urlObj.hostname.includes('youtu.be')) videoId = urlObj.pathname.slice(1);
        if (videoId) return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    } catch (e) {}
    return null;
};

export function IntentionDetailModal({ isOpen, onOpenChange, intention }: IntentionDetailModalProps) {
  const { upskillDefinitions, deepWorkDefinitions, resources, resourceFolders } = useAuth();

  if (!intention) return null;

  const linkedLearningTasks = (intention.linkedUpskillIds || []).map(id => upskillDefinitions.find(d => d.id === id)).filter(Boolean) as ExerciseDefinition[];
  const linkedWorkTasks = (intention.linkedDeepWorkIds || []).map(id => deepWorkDefinitions.find(d => d.id === id)).filter(Boolean) as ExerciseDefinition[];
  const linkedResources = (intention.linkedResourceIds || []).map(id => resources.find(r => r.id === id)).filter(Boolean) as Resource[];
  const isIntentionCheck = (def: ExerciseDefinition) => (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Intention Details: {intention.name}</DialogTitle>
          <DialogDescription>
            A complete overview of all tasks and resources linked to this intention.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-6">
            <div className="space-y-6">
              {/* Linked Learning */}
              {linkedLearningTasks.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3"><BookCopy className="h-5 w-5 text-primary" /> Linked Learning</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {linkedLearningTasks.map(task => {
                        const thumbnailUrl = task.link ? getYouTubeThumbnailUrl(task.link) : null;
                        return (
                            <Card key={task.id} className="rounded-lg flex flex-col group overflow-hidden">
                                {thumbnailUrl ? (
                                    <a href={task.link} target="_blank" rel="noopener noreferrer" className="block">
                                        <Image src={thumbnailUrl} alt={task.name} width={320} height={180} className="w-full h-auto object-cover" />
                                    </a>
                                ) : null}
                                <div className="p-4 flex-grow flex flex-col">
                                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                      <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <a href={task.link} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title={task.name}>{task.name}</a>
                                  </CardTitle>
                                  <CardDescription className="text-xs mt-1">{task.category}</CardDescription>
                                  <CardContent className="p-0 pt-2 flex-grow">
                                      <p className="text-xs text-muted-foreground line-clamp-2">{task.description || "No description."}</p>
                                  </CardContent>
                                  {task.estimatedHours && <CardFooter className="p-0 pt-2"><Badge variant="outline" className="text-xs">{task.estimatedHours}h est.</Badge></CardFooter>}
                                </div>
                            </Card>
                        )
                    })}
                  </div>
                </div>
              )}

              {/* Linked Work */}
              {linkedWorkTasks.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3"><Briefcase className="h-5 w-5 text-primary" /> Linked Work</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {linkedWorkTasks.map(task => (
                        <Card key={task.id} className="rounded-lg flex flex-col">
                           <div className="p-4 flex-grow flex flex-col">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                {isIntentionCheck(task) ? (
                                    <Workflow className="h-4 w-4 text-primary flex-shrink-0" />
                                ) : (
                                    <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className="truncate" title={task.name}>{task.name}</span>
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">{task.category}</CardDescription>
                              <CardContent className="p-0 pt-2 flex-grow">
                                <p className="text-xs text-muted-foreground line-clamp-2">{task.description || "No description."}</p>
                              </CardContent>
                           </div>
                           {task.estimatedHours && <CardFooter className="p-4 pt-0"><Badge variant="outline" className="text-xs">{task.estimatedHours}h est.</Badge></CardFooter>}
                        </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Resources */}
              {linkedResources.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3"><LinkIcon className="h-5 w-5 text-primary" /> Linked Resources</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {linkedResources.map(resource => (
                        <Card key={resource.id} className="rounded-lg flex flex-col">
                            <div className="p-4 flex-grow flex flex-col">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                  <a href={resource.link} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{resource.name}</a>
                                  <ExternalLink className="h-3 w-3 text-muted-foreground"/>
                                </CardTitle>
                                <CardDescription className="text-xs mt-1">{resourceFolders.find(f => f.id === resource.folderId)?.name || 'Uncategorized'}</CardDescription>
                                <CardContent className="p-0 pt-2 flex-grow">
                                  <p className="text-xs text-muted-foreground line-clamp-2">{resource.description || 'No description'}</p>
                                </CardContent>
                            </div>
                        </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
