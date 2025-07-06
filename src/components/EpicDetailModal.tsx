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
import { BookCopy, Link as LinkIcon, Briefcase, ExternalLink, Youtube, Globe, Workflow } from 'lucide-react';
import type { ExerciseDefinition, Resource } from '@/types/workout';
import { useAuth } from '@/contexts/AuthContext';

interface EpicDetailModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  epic: ExerciseDefinition | null;
}

const getYouTubeEmbedUrl = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        let videoId: string | null = null;
        if (urlObj.hostname.includes('youtube.com')) videoId = urlObj.searchParams.get('v');
        else if (urlObj.hostname.includes('youtu.be')) videoId = urlObj.pathname.slice(1);
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    } catch (e) {}
    return null;
};

export function EpicDetailModal({ isOpen, onOpenChange, epic }: EpicDetailModalProps) {
  const { upskillDefinitions, deepWorkDefinitions, resources, resourceFolders } = useAuth();

  if (!epic) return null;

  const linkedLearningTasks = (epic.linkedUpskillIds || []).map(id => upskillDefinitions.find(d => d.id === id)).filter(Boolean) as ExerciseDefinition[];
  const linkedWorkTasks = (epic.linkedDeepWorkIds || []).map(id => deepWorkDefinitions.find(d => d.id === id)).filter(Boolean) as ExerciseDefinition[];
  const linkedResources = (epic.linkedResourceIds || []).map(id => resources.find(r => r.id === id)).filter(Boolean) as Resource[];

  const isEpic = (def: ExerciseDefinition) => (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Epic Details: {epic.name}</DialogTitle>
          <DialogDescription>
            A complete overview of all tasks and resources linked to this epic.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full pr-6">
            <div className="space-y-6">
              {/* Linked Learning */}
              {linkedLearningTasks.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3"><BookCopy className="h-5 w-5 text-primary" /> Linked Learning</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {linkedLearningTasks.map(task => {
                        const youtubeEmbedUrl = task.link ? getYouTubeEmbedUrl(task.link) : null;
                        return (
                            <Card key={task.id} className="rounded-2xl flex flex-col group overflow-hidden">
                                {youtubeEmbedUrl ? (
                                    <>
                                        <div className="aspect-video w-full bg-black overflow-hidden rounded-t-2xl">
                                            <iframe src={youtubeEmbedUrl} title={task.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
                                        </div>
                                        <div className="p-4 flex-grow"><p className="font-bold truncate">{task.name}</p></div>
                                    </>
                                ) : (
                                    <>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            <a href={task.link} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title={task.name}>{task.name}</a>
                                        </CardTitle>
                                        <CardDescription>{task.category}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow"><p className="text-sm text-muted-foreground line-clamp-2">{task.description || "No description."}</p></CardContent>
                                    {task.estimatedHours && <CardFooter><Badge variant="outline">{task.estimatedHours}h est.</Badge></CardFooter>}
                                    </>
                                )}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {linkedWorkTasks.map(task => (
                        <Card key={task.id} className="rounded-2xl flex flex-col">
                           <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                {isEpic(task) ? (
                                    <Workflow className="h-5 w-5 text-primary flex-shrink-0" />
                                ) : (
                                    <Briefcase className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className="truncate" title={task.name}>{task.name}</span>
                              </CardTitle>
                              <CardDescription>{task.category}</CardDescription>
                           </CardHeader>
                           <CardContent className="flex-grow">
                              <p className="text-sm text-muted-foreground line-clamp-2">{task.description || "No description."}</p>
                           </CardContent>
                           {task.estimatedHours && <CardFooter><Badge variant="outline">{task.estimatedHours}h est.</Badge></CardFooter>}
                        </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Resources */}
              {linkedResources.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3"><LinkIcon className="h-5 w-5 text-primary" /> Linked Resources</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {linkedResources.map(resource => (
                        <Card key={resource.id} className="rounded-2xl flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <a href={resource.link} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{resource.name}</a>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground"/>
                                </CardTitle>
                                <CardDescription>{resourceFolders.find(f => f.id === resource.folderId)?.name || 'Uncategorized'}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow"><p className="text-sm text-muted-foreground line-clamp-2">{resource.description || 'No description'}</p></CardContent>
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
