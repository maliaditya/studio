
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Share2, Globe, Code, Linkedin, CheckCircle2, Youtube, Edit3, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from "@/components/ui/badge";
import { ExerciseDefinition, DatedWorkout, TopicBrandingInfo, SharingStatus } from '@/types/workout';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>X</title>
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
    </svg>
);

const DevToIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>DEV Community</title>
        <path d="M11.472 24a1.5 1.5 0 0 1-1.06-.44L.439 13.587a1.5 1.5 0 0 1 0-2.12l9.97-9.97a1.5 1.5 0 0 1 2.12 0L22.503 11.47a1.5 1.5 0 0 1 0 2.121l-9.972 9.971a1.5 1.5 0 0 1-1.06.44Zm-8.485-11.25 8.485 8.485 8.485-8.485-8.485-8.485-8.485 8.485ZM19.5 18h-3V9h3v9Z"/>
    </svg>
);

interface EligibleTopic {
  topic: string;
  focusAreas: (ExerciseDefinition & { sessionCount: number })[];
  totalSessions: number;
  brandingInfo: TopicBrandingInfo;
  brandingKey: string;
  chunkIndex: number;
}

function PersonalBrandingPageContent() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  const [allWorkoutLogs, setAllWorkoutLogs] = useState<DatedWorkout[]>([]);
  const [brandedTopics, setBrandedTopics] = useState<Record<string, TopicBrandingInfo>>({});
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  // State for branding modal
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [selectedBrandingCandidate, setSelectedBrandingCandidate] = useState<EligibleTopic | null>(null);
  const [brandingModalType, setBrandingModalType] = useState<'blog' | 'blog_demo' | null>(null);
  const [blogUrl, setBlogUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');

  // Load data from localStorage
  useEffect(() => {
    if (currentUser?.username) {
        const username = currentUser.username;
        const defsKey = `deepwork_definitions_${username}`;
        const logsKey = `deepwork_logs_${username}`;
        const brandedTopicsKey = `deepwork_branded_topics_${username}`;

        try { const storedDefinitions = localStorage.getItem(defsKey); setExerciseDefinitions(storedDefinitions ? JSON.parse(storedDefinitions) : []); } catch (e) { setExerciseDefinitions([]); }
        try { const storedLogs = localStorage.getItem(logsKey); setAllWorkoutLogs(storedLogs ? JSON.parse(storedLogs) : []); } catch (e) { setAllWorkoutLogs([]); }
        try { const storedBrandedTopics = localStorage.getItem(brandedTopicsKey); setBrandedTopics(storedBrandedTopics ? JSON.parse(storedBrandedTopics) : {}); } catch (e) { setBrandedTopics({}); }
    } else {
        setExerciseDefinitions([]);
        setAllWorkoutLogs([]);
        setBrandedTopics({});
    }
    const timer = setTimeout(() => setIsLoadingPage(false), 300);
    return () => clearTimeout(timer);
  }, [currentUser]);

  // Save branding data back to localStorage
  useEffect(() => {
    if (currentUser?.username && !isLoadingPage) {
      try {
        const username = currentUser.username;
        const brandedTopicsKey = `deepwork_branded_topics_${username}`;
        localStorage.setItem(brandedTopicsKey, JSON.stringify(brandedTopics));
      } catch (e) {
        console.error("Error saving branding data to localStorage", e);
        toast({ title: "Save Error", description: "Could not save branding data.", variant: "destructive"});
      }
    }
  }, [brandedTopics, currentUser, isLoadingPage, toast]);


  const brandingCandidates = useMemo((): EligibleTopic[] => {
    // 1. Calculate session counts for every focus area
    const sessionCounts = new Map<string, number>();
    allWorkoutLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (ex.loggedSets.length > 0) {
          const currentCount = sessionCounts.get(ex.definitionId) || 0;
          sessionCounts.set(ex.definitionId, currentCount + ex.loggedSets.length);
        }
      });
    });

    // 2. Group focus areas with their session counts by topic
    const topicsMap = new Map<string, (ExerciseDefinition & { sessionCount: number })[]>();
    exerciseDefinitions.forEach(def => {
      if (!topicsMap.has(def.category)) {
        topicsMap.set(def.category, []);
      }
      topicsMap.get(def.category)!.push({
        ...def,
        sessionCount: sessionCounts.get(def.id) || 0,
      });
    });

    const eligibleTopics: EligibleTopic[] = [];

    // 3. Iterate through topics, find eligible ones, and chunk them
    topicsMap.forEach((defs, topic) => {
      // Find focus areas within this topic that have at least 4 sessions
      const focusAreasWithEnoughSessions = defs.filter(d => d.sessionCount >= 4).sort((a,b) => a.name.localeCompare(b.name));

      // Chunk the eligible focus areas into groups of 4
      for (let i = 0; i < focusAreasWithEnoughSessions.length; i += 4) {
        const chunk = focusAreasWithEnoughSessions.slice(i, i + 4);

        // A chunk is only eligible if it contains exactly 4 focus areas.
        if (chunk.length === 4) {
          const chunkIndex = i / 4;
          const brandingKey = `${topic}-${chunkIndex}`;
          const brandingInfo = brandedTopics[brandingKey] || {};

          eligibleTopics.push({
            topic,
            focusAreas: chunk,
            totalSessions: chunk.reduce((sum, fa) => sum + fa.sessionCount, 0),
            brandingInfo,
            brandingKey,
            chunkIndex,
          });
        }
      }
    });

    return eligibleTopics.sort((a, b) => {
        if (a.topic !== b.topic) return a.topic.localeCompare(b.topic);
        return a.brandingKey.localeCompare(b.brandingKey);
    });
  }, [allWorkoutLogs, exerciseDefinitions, brandedTopics]);


  const handleOpenBrandingModal = (topic: EligibleTopic, type: 'blog' | 'blog_demo') => {
    setSelectedBrandingCandidate(topic);
    setBrandingModalType(type);
    setBlogUrl(topic.brandingInfo.contentUrls?.blog || '');
    setYoutubeUrl(topic.brandingInfo.contentUrls?.youtube || '');
    setDemoUrl(topic.brandingInfo.contentUrls?.demo || '');
    setIsBrandingModalOpen(true);
  };

  const handleSaveBranding = () => {
    if (!selectedBrandingCandidate) return;
    const { brandingKey } = selectedBrandingCandidate;
    setBrandedTopics(prev => ({
        ...prev,
        [brandingKey]: {
            ...prev[brandingKey],
            brandingStatus: 'converted',
            contentUrls: {
                blog: blogUrl,
                youtube: brandingModalType === 'blog_demo' ? youtubeUrl : undefined,
                demo: brandingModalType === 'blog_demo' ? demoUrl : undefined,
            }
        }
    }));
    setIsBrandingModalOpen(false);
    toast({ title: "Content URLs Saved!", description: `Your links for "${selectedBrandingCandidate.topic}" have been saved.` });
  };
  
  const handleToggleSharing = (brandingKey: string, platform: keyof SharingStatus) => {
    setBrandedTopics(prev => {
        const currentTopic = prev[brandingKey] || {};
        const newSharingStatus = { ...currentTopic.sharingStatus, [platform]: !currentTopic.sharingStatus?.[platform] };
        const newBrandingStatus = Object.values(newSharingStatus).some(Boolean) ? 'published' : 'converted';
        
        return {
            ...prev,
            [brandingKey]: {
                ...currentTopic,
                sharingStatus: newSharingStatus,
                brandingStatus: newBrandingStatus,
            }
        };
    });
  };

  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your branding pipeline...</p>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-primary">
                    <Share2 /> Personal Branding Pipeline
                </CardTitle>
                <CardDescription>
                    Convert deep work into content. A topic becomes a brandable bundle when it has 4 focus areas with 4+ sessions each.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {brandingCandidates.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                        Log 4+ sessions on at least 4 focus areas within the same topic to unlock your first brandable content bundle.
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {brandingCandidates.map(topic => {
                            const bundlesForThisTopic = brandingCandidates.filter(t => t.topic === topic.topic);
                            const showBundleNumber = bundlesForThisTopic.length > 1;

                            return (
                            <li key={topic.brandingKey} className="p-4 bg-muted/30 rounded-lg space-y-4 text-sm flex flex-col">
                                <div className="flex-grow space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-foreground text-base">
                                                {topic.topic} {showBundleNumber && `- Bundle #${topic.chunkIndex + 1}`}
                                            </h4>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                <Badge variant="outline">{topic.focusAreas.length} Focus Areas</Badge>
                                                <Badge variant="secondary">{topic.totalSessions} Total Sessions</Badge>
                                            </div>
                                        </div>
                                        {topic.brandingInfo.brandingStatus === 'published' && (
                                            <div className="flex items-center gap-1.5 text-green-600">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span className="font-medium">Published</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <p className="font-medium text-muted-foreground">Included Focus Areas:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {topic.focusAreas.map(fa => <Badge key={fa.id} variant="default" className='bg-primary/20 text-primary-foreground hover:bg-primary/30'>{fa.name}</Badge>)}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-auto pt-4 border-t">
                                  {topic.brandingInfo.brandingStatus === 'converted' || topic.brandingInfo.brandingStatus === 'published' ? (
                                      <div className="space-y-4">
                                          {topic.brandingInfo.contentUrls && (
                                              <div className="space-y-2">
                                                  <h5 className="font-medium text-muted-foreground">Content Links</h5>
                                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                      {topic.brandingInfo.contentUrls.blog && <a href={topic.brandingInfo.contentUrls.blog} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Globe className="h-4 w-4" /> Blog Post</a>}
                                                      {topic.brandingInfo.contentUrls.youtube && <a href={topic.brandingInfo.contentUrls.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Youtube className="h-4 w-4" /> YouTube</a>}
                                                      {topic.brandingInfo.contentUrls.demo && <a href={topic.brandingInfo.contentUrls.demo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Code className="h-4 w-4" /> Demo</a>}
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenBrandingModal(topic, topic.brandingInfo.contentUrls?.youtube ? 'blog_demo' : 'blog')} className="h-7 w-7"><Edit3 className="h-4 w-4 text-muted-foreground" /></Button>
                                                  </div>
                                              </div>
                                          )}
                                          <div className="space-y-2">
                                                <h5 className="font-medium text-muted-foreground">Sharing Checklist</h5>
                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                                  <div className="flex items-center space-x-2">
                                                      <Checkbox id={`share-twitter-${topic.brandingKey}`} checked={topic.brandingInfo.sharingStatus?.twitter} onCheckedChange={() => handleToggleSharing(topic.brandingKey, 'twitter')} />
                                                      <label htmlFor={`share-twitter-${topic.brandingKey}`} className="flex items-center gap-1.5 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                          <TwitterIcon className="h-4 w-4" /> X / Twitter
                                                      </label>
                                                  </div>
                                                    <div className="flex items-center space-x-2">
                                                      <Checkbox id={`share-linkedin-${topic.brandingKey}`} checked={topic.brandingInfo.sharingStatus?.linkedin} onCheckedChange={() => handleToggleSharing(topic.brandingKey, 'linkedin')} />
                                                      <label htmlFor={`share-linkedin-${topic.brandingKey}`} className="flex items-center gap-1.5 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                          <Linkedin className="h-4 w-4" /> LinkedIn
                                                      </label>
                                                  </div>
                                                  <div className="flex items-center space-x-2">
                                                      <Checkbox id={`share-devto-${topic.brandingKey}`} checked={topic.brandingInfo.sharingStatus?.devto} onCheckedChange={() => handleToggleSharing(topic.brandingKey, 'devto')} />
                                                      <label htmlFor={`share-devto-${topic.brandingKey}`} className="flex items-center gap-1.5 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                          <DevToIcon className="h-4 w-4" /> DEV.to
                                                      </label>
                                                  </div>
                                                </div>
                                          </div>
                                      </div>
                                  ) : (
                                        <div className="flex items-center gap-2">
                                          <Button size="sm" onClick={() => handleOpenBrandingModal(topic, 'blog')} className="flex-1">Create Blog</Button>
                                          <Button size="sm" onClick={() => handleOpenBrandingModal(topic, 'blog_demo')} className="flex-1">Blog + Demo</Button>
                                      </div>
                                  )}
                                </div>
                            </li>
                        )})}
                    </ul>
                )}
            </CardContent>
        </Card>
      </div>

       <Dialog open={isBrandingModalOpen} onOpenChange={setIsBrandingModalOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Convert to Content: {selectedBrandingCandidate?.topic}</DialogTitle>
            <DialogDescription>
                Add the URLs for your created content. Click save when you're done.
            </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="blog-url">Blog Post URL</Label>
                    <Input id="blog-url" value={blogUrl} onChange={e => setBlogUrl(e.target.value)} placeholder="https://my.blog/post-title" />
                </div>
                {brandingModalType === 'blog_demo' && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="youtube-url">YouTube Video URL</Label>
                            <Input id="youtube-url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="demo-url">Live Demo URL</Label>
                            <Input id="demo-url" value={demoUrl} onChange={e => setDemoUrl(e.target.value)} placeholder="https://my-demo.vercel.app" />
                        </div>
                    </>
                )}
            </div>
            <DialogFooter>
                <Button onClick={handleSaveBranding}>Save URLs</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function PersonalBrandingPage() {
  return ( <AuthGuard> <PersonalBrandingPageContent /> </AuthGuard> );
}
