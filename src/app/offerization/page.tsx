
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Package, PlusCircle, Calendar as CalendarIcon, Edit, Trash2, Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import type { ExerciseCategory, ExerciseDefinition, GapAnalysis, Offer, ProductizationPlan as OfferizationPlan, Release } from '@/types/workout';
import { offerTypes, GAP_TYPES } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';


function OfferizationPageContent() {
  const { deepWorkDefinitions, setDeepWorkDefinitions, offerizationPlans, setOfferizationPlans, deepWorkTopicMetadata, updateTopic, deleteTopic, copyOffer } = useAuth();
  const { toast } = useToast();
  const [newActionTasks, setNewActionTasks] = useState<Record<string, string>>({});
  
  // State for expertise planning
  const [editingRelease, setEditingRelease] = useState<{ topic: string; release: Partial<Release> } | null>(null);
  const [selectedReleaseForTask, setSelectedReleaseForTask] = useState<Record<string, string>>({});

  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicClassification, setNewTopicClassification] = useState<'product' | 'service'>('product');

  const [editingOffer, setEditingOffer] = useState<{ topic: string; offer: Partial<Offer> } | null>(null);

  useEffect(() => {
    if (editingTopic) {
        setNewTopicName(editingTopic);
        setNewTopicClassification(deepWorkTopicMetadata[editingTopic]?.classification || 'product');
    }
  }, [editingTopic, deepWorkTopicMetadata]);

  const handleSaveTopic = () => {
    if (!editingTopic || !newTopicName.trim()) {
        toast({ title: "Error", description: "Topic name cannot be empty.", variant: "destructive" });
        return;
    }
    updateTopic(editingTopic, newTopicName.trim(), newTopicClassification);
    setEditingTopic(null);
  };

  const topics = useMemo(() => {
    const topicMap = new Map<string, ExerciseDefinition[]>();
    (deepWorkDefinitions || []).forEach(def => {
      if (Array.isArray(def.focusAreaIds)) return;
      
      const topic = def.category;
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic)!.push(def);
    });

    const topicEntries = Array.from(topicMap.entries());

    const classifiedAndSortedTopics = topicEntries
      .filter(([topic]) => deepWorkTopicMetadata[topic]?.classification === 'service')
      .map(([topic, defs]) => {
        const latestTimestamp = Math.max(
            ...defs.map(d => parseInt(d.id.split('_')[1], 10) || 0)
        );
        return { topic, defs, latestTimestamp };
      })
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp)
      .map(({ topic, defs }) => [topic, defs] as [string, ExerciseDefinition[]]);

    return classifiedAndSortedTopics;
  }, [deepWorkDefinitions, deepWorkTopicMetadata]);

  const handleOfferTypeChange = (topic: string, offerTypeToAddOrRemove: string) => {
    setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[topic] || {};
        const currentOfferTypes = currentPlan.offerTypes || [];
        const newOfferTypes = currentOfferTypes.includes(offerTypeToAddOrRemove)
            ? currentOfferTypes.filter(o => o !== offerTypeToAddOrRemove)
            : [...currentOfferTypes, offerTypeToAddOrRemove];
        
        newPlans[topic] = {
            ...currentPlan,
            offerTypes: newOfferTypes
        };
        return newPlans;
    });
  };
  
  const handleActionTaskChange = (topic: string, value: string) => {
    setNewActionTasks(prev => ({ ...prev, [topic]: value }));
  };

  const handleAddActionTask = (e: React.FormEvent, topic: string) => {
    e.preventDefault();
    const taskName = newActionTasks[topic]?.trim();
    if (!taskName) {
        toast({ title: 'Error', description: 'Focus area name cannot be empty.', variant: "destructive" });
        return;
    }

    if (deepWorkDefinitions.some(def => def.name.toLowerCase() === taskName.toLowerCase() && def.category === topic)) {
        toast({ title: 'Error', description: 'This focus area already exists for this topic.', variant: "destructive" });
        return;
    }

    const newDef: ExerciseDefinition = {
        id: `def_${Date.now()}_${Math.random()}`,
        name: taskName,
        category: topic as ExerciseCategory,
    };

    setDeepWorkDefinitions(prev => [...prev, newDef]);

    const releaseId = selectedReleaseForTask[topic];
    if (releaseId) {
        setOfferizationPlans(prev => {
            const newPlans = { ...prev };
            const currentPlan = newPlans[topic];
            if (currentPlan && currentPlan.releases) {
                const releaseIndex = currentPlan.releases.findIndex(r => r.id === releaseId);
                if (releaseIndex > -1) {
                    const release = currentPlan.releases[releaseIndex];
                    const focusAreaIds = Array.from(new Set(release.focusAreaIds || []));
                    focusAreaIds.push(newDef.id);
                    release.focusAreaIds = focusAreaIds;
                }
            }
            return newPlans;
        });
    }

    setNewActionTasks(prev => ({ ...prev, [topic]: '' }));
    setSelectedReleaseForTask(prev => ({...prev, [topic]: ''}));
    toast({ title: 'Focus Area Added', description: `"${taskName}" is now in your Deep Work library and linked to the expertise if selected.` });
  };

  const handleGapAnalysisChange = (topic: string, field: keyof GapAnalysis, value: string) => {
    setOfferizationPlans(prev => ({
      ...prev,
      [topic]: {
        ...(prev[topic] || {}),
        gapAnalysis: {
          ...(prev[topic]?.gapAnalysis || { gapTypes: [], whatYouCanFill: '', coreSolution: '', outcomeGoal: '' }),
          [field]: value
        }
      }
    }));
  };

  const handleGapTypeChange = (topic: string, gapToAddOrRemove: string) => {
    setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[topic] || {};
        const currentGapAnalysis = currentPlan.gapAnalysis || { gapTypes: [], whatYouCanFill: '', coreSolution: '', outcomeGoal: '' };
        
        const currentGapTypes = currentGapAnalysis.gapTypes || [];
        const newGapTypes = currentGapTypes.includes(gapToAddOrRemove)
            ? currentGapTypes.filter(g => g !== gapToAddOrRemove)
            : [...currentGapTypes, gapToAddOrRemove];
            
        newPlans[topic] = {
            ...currentPlan,
            gapAnalysis: {
                ...currentGapAnalysis,
                gapTypes: newGapTypes
            }
        };
        return newPlans;
    });
  };

  const handleStartEditingRelease = (topic: string, release?: Release) => {
    setEditingRelease({
        topic,
        release: release ? { ...release } : { id: `release_${Date.now()}_${Math.random()}`, name: '', description: '', launchDate: format(new Date(), 'yyyy-MM-dd'), focusAreaIds: [] }
    });
  };

  const handleUpdateEditingRelease = (field: keyof Release, value: any) => {
    setEditingRelease(current => {
      if (!current) return null;
      return {
        ...current,
        release: {
          ...current.release,
          [field]: value,
        }
      }
    });
  };

  const handleToggleFocusAreaInRelease = (focusAreaId: string) => {
     setEditingRelease(current => {
        if (!current) return null;
        const currentIds = current.release.focusAreaIds || [];
        const newIds = currentIds.includes(focusAreaId)
            ? currentIds.filter(id => id !== focusAreaId)
            : [...currentIds, focusAreaId];
        return {
            ...current,
            release: { ...current.release, focusAreaIds: newIds }
        }
     });
  };

  const handleSaveRelease = () => {
    if (!editingRelease) return;
    const { topic, release } = editingRelease;
    if (!release.name?.trim()) {
      toast({ title: "Error", description: "Expertise name cannot be empty.", variant: "destructive" });
      return;
    }

    setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[topic] || {};
        const existingReleases = currentPlan.releases || [];
        
        const releaseIndex = existingReleases.findIndex(r => r.id === release.id);

        if (releaseIndex > -1) {
            // Update existing release
            existingReleases[releaseIndex] = release as Release;
        } else {
            // Add new release
            existingReleases.push(release as Release);
        }

        newPlans[topic] = { ...currentPlan, releases: existingReleases.sort((a,b) => new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime()) };
        return newPlans;
    });

    toast({ title: "Expertise Saved", description: `"${release.name}" has been saved.`});
    setEditingRelease(null);
  };

  const handleDeleteRelease = (topic: string, releaseId: string) => {
     setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[topic];
        if (!currentPlan || !currentPlan.releases) return prev;

        currentPlan.releases = currentPlan.releases.filter(r => r.id !== releaseId);
        newPlans[topic] = currentPlan;
        
        return newPlans;
    });
    toast({ title: "Expertise Deleted", description: "The expertise has been removed from your plan.", variant: "destructive" });
  };
  
  const handleStartEditingOffer = (topic: string, offer?: Offer) => {
    setEditingOffer({
        topic,
        offer: offer ? { ...offer } : { 
            id: `offer_${Date.now()}_${Math.random()}`, 
            name: '', 
            outcome: '',
            audience: '',
            deliverables: '',
            valueStack: '',
            timeline: '',
            price: '',
            format: '',
        }
    });
  };

  const handleUpdateEditingOffer = (field: keyof Offer, value: string) => {
    setEditingOffer(current => {
      if (!current) return null;
      return {
        ...current,
        offer: {
          ...current.offer,
          [field]: value,
        }
      }
    });
  };

  const handleSaveOffer = () => {
    if (!editingOffer) return;
    const { topic, offer } = editingOffer;
    if (!offer.name?.trim()) {
      toast({ title: "Error", description: "Offer name cannot be empty.", variant: "destructive" });
      return;
    }

    setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[topic] || {};
        const existingOffers = currentPlan.offers || [];
        
        const offerIndex = existingOffers.findIndex(o => o.id === offer.id);

        if (offerIndex > -1) {
            // Update existing offer
            existingOffers[offerIndex] = offer as Offer;
        } else {
            // Add new offer
            existingOffers.push(offer as Offer);
        }

        newPlans[topic] = { ...currentPlan, offers: existingOffers };
        return newPlans;
    });

    toast({ title: "Offer Saved", description: `"${offer.name}" has been saved.`});
    setEditingOffer(null);
  };

  const handleDeleteOffer = (topic: string, offerId: string) => {
     setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[topic];
        if (!currentPlan || !currentPlan.offers) return prev;

        currentPlan.offers = currentPlan.offers.filter(o => o.id !== offerId);
        newPlans[topic] = currentPlan;
        
        return newPlans;
    });
    toast({ title: "Offer Deleted", description: "The offer has been removed from your plan.", variant: "destructive" });
  };


  const renderExpertiseForm = (topic: string, focusAreas: ExerciseDefinition[]) => {
    if (!editingRelease || editingRelease.topic !== topic) return null;
    const { release } = editingRelease;
    
    return (
      <Card className="mt-4 bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">{release.id?.startsWith('release_') ? 'Add New Expertise' : 'Edit Expertise'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="release-name">Expertise Name</Label>
            <Input id="release-name" value={release.name || ''} onChange={(e) => handleUpdateEditingRelease('name', e.target.value)} placeholder="e.g., CUDA Optimization, WebGL Development"/>
          </div>
          <div>
            <Label htmlFor="release-date">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="release-date" variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {release.launchDate ? format(parseISO(release.launchDate), 'PPP') : 'Select a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={release.launchDate ? parseISO(release.launchDate) : new Date()} onSelect={(date) => handleUpdateEditingRelease('launchDate', format(date as Date, 'yyyy-MM-dd'))} />
              </PopoverContent>
            </Popover>
          </div>
           <div>
            <Label htmlFor="release-desc">Description</Label>
            <Textarea id="release-desc" value={release.description || ''} onChange={(e) => handleUpdateEditingRelease('description', e.target.value)} placeholder="What is the goal of this expertise area?"/>
          </div>
          <div>
            <Label>Included Focus Areas</Label>
            <div className="space-y-2 mt-2 rounded-md border p-3 max-h-48 overflow-y-auto">
              {focusAreas.map(fa => (
                <div key={fa.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`fa-${fa.id}`} 
                    checked={(release.focusAreaIds || []).includes(fa.id)}
                    onCheckedChange={() => handleToggleFocusAreaInRelease(fa.id)}
                  />
                  <Label htmlFor={`fa-${fa.id}`} className="font-normal">{fa.name}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditingRelease(null)}>Cancel</Button>
            <Button onClick={handleSaveRelease}>Save Expertise</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            Offerization
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Turn your deep work topics into valuable services and offers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map(([topic, focusAreas]) => {
            const plan = offerizationPlans[topic] || {};
            const selectedOfferTypes = plan.offerTypes || [];
            const gapAnalysis = plan.gapAnalysis;
            const releases = plan.releases || [];
            const offers = plan.offers || [];

            const focusAreaMap = new Map(focusAreas.map(fa => [fa.id, fa.name]));
            
            return (
                <Card key={topic} className="flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="flex items-center gap-3">
                            <Briefcase className="h-5 w-5 text-primary"/>
                            {topic}
                        </CardTitle>
                         <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTopic(topic)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the topic "{topic}" and all of its associated data, including focus areas, logged sessions, and expertise plans.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteTopic(topic)}>
                                        Delete
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                    <CardDescription>{focusAreas.length} focus area(s)</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>Focus Areas</AccordionTrigger>
                      <AccordionContent>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {focusAreas.map(fa => <li key={fa.id}>{fa.name}</li>)}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                       <AccordionTrigger>Offer Type</AccordionTrigger>
                       <AccordionContent>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                                      {selectedOfferTypes.length > 0 ? `${selectedOfferTypes.length} selected` : "Select offer types..."}
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-[--radix-select-trigger-width] max-h-60 overflow-y-auto">
                                  {offerTypes.map((group) => (
                                      <React.Fragment key={group.group}>
                                          <DropdownMenuLabel>{group.group}</DropdownMenuLabel>
                                          {group.items.map(item => (
                                              <DropdownMenuCheckboxItem
                                                  key={item.name}
                                                  checked={selectedOfferTypes.includes(item.name)}
                                                  onCheckedChange={() => handleOfferTypeChange(topic, item.name)}
                                              >
                                                  {item.name}
                                              </DropdownMenuCheckboxItem>
                                          ))}
                                      </React.Fragment>
                                  ))}
                              </DropdownMenuContent>
                          </DropdownMenu>

                          {selectedOfferTypes.length > 0 && (
                              <div className="mt-2 space-y-2">
                                  {selectedOfferTypes.map(offerName => {
                                      const offer = offerTypes.flatMap(g => g.items).find(i => i.name === offerName);
                                      return offer ? (
                                          <div key={offer.name} className="text-xs p-2 bg-muted/50 rounded-md">
                                              <p className="font-semibold">{offer.name}</p>
                                              <p className="text-muted-foreground">{offer.description}</p>
                                          </div>
                                      ) : null;
                                  })}
                              </div>
                          )}
                       </AccordionContent>
                    </AccordionItem>
                     {selectedOfferTypes.length > 0 && (
                      <>
                        <AccordionItem value="item-3">
                           <AccordionTrigger>Gap Analysis</AccordionTrigger>
                           <AccordionContent className="space-y-4">
                              <p className="text-xs text-muted-foreground">Answer these questions to define your offer strategy.</p>
                              <div>
                                  <Label htmlFor={`gapType-${topic}`} className="text-sm">Gap Type</Label>
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                                              {(gapAnalysis?.gapTypes && gapAnalysis.gapTypes.length > 0)
                                                  ? `${gapAnalysis.gapTypes.length} selected`
                                                  : "Select gap types..."}
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent className="w-[--radix-select-trigger-width] max-h-60 overflow-y-auto">
                                          {GAP_TYPES.map(group => (
                                              <React.Fragment key={group.group}>
                                                  <DropdownMenuLabel>{group.group}</DropdownMenuLabel>
                                                  {group.items.map(item => (
                                                      <DropdownMenuCheckboxItem
                                                          key={item.name}
                                                          checked={(gapAnalysis?.gapTypes || []).includes(item.name)}
                                                          onCheckedChange={() => handleGapTypeChange(topic, item.name)}
                                                      >
                                                          {item.name}
                                                      </DropdownMenuCheckboxItem>
                                                  ))}
                                              </React.Fragment>
                                          ))}
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                              </div>
                              <div>
                                  <Label htmlFor={`fill-${topic}`} className="text-sm">What You Can Fill</Label>
                                  <Textarea id={`fill-${topic}`} value={gapAnalysis?.whatYouCanFill || ''} onChange={(e) => handleGapAnalysisChange(topic, 'whatYouCanFill', e.target.value)} placeholder="How can you specifically address this gap?" />
                              </div>
                              <div>
                                  <Label htmlFor={`solution-${topic}`} className="text-sm">Core Solution / Offer</Label>
                                  <Textarea id={`solution-${topic}`} value={gapAnalysis?.coreSolution || ''} onChange={(e) => handleGapAnalysisChange(topic, 'coreSolution', e.target.value)} placeholder="What is the core service or offer?" />
                              </div>
                              <div>
                                  <Label htmlFor={`goal-${topic}`} className="text-sm">Outcome Goal</Label>
                                  <Textarea id={`goal-${topic}`} value={gapAnalysis?.outcomeGoal || ''} onChange={(e) => handleGapAnalysisChange(topic, 'outcomeGoal', e.target.value)} placeholder="What is the desired result?" />
                              </div>
                           </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                           <AccordionTrigger>Expertise Planner</AccordionTrigger>
                           <AccordionContent>
                                {releases.map(release => (
                                <Card key={release.id} className="mb-3">
                                <CardHeader className="p-3">
                                    <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base">{release.name}</CardTitle>
                                        <CardDescription>{format(parseISO(release.launchDate), 'PPP')}</CardDescription>
                                    </div>
                                    <div className="flex items-center">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEditingRelease(topic, release)}><Edit className="h-4 w-4"/></Button>
                                        <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete the expertise "{release.name}". This action cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteRelease(topic, release.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 text-sm">
                                    {release.description && <p className="mb-2 text-muted-foreground">{release.description}</p>}
                                    <p className="font-medium text-foreground">Focus Areas:</p>
                                    <ul className="list-disc list-inside text-muted-foreground">
                                    {(release.focusAreaIds || []).map((id, index) => (
                                        <li key={`${id}-${index}`}>{focusAreaMap.get(id) || 'Unknown Focus Area'}</li>
                                    ))}
                                    </ul>
                                </CardContent>
                                </Card>
                            ))}

                            {editingRelease?.topic === topic ? renderExpertiseForm(topic, focusAreas) : (
                                <Button className="w-full mt-2" variant="outline" onClick={() => handleStartEditingRelease(topic)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Expertise
                                </Button>
                            )}
                           </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-5">
                            <AccordionTrigger>Offers</AccordionTrigger>
                            <AccordionContent className="space-y-3">
                                {offers.map(offer => (
                                    <Card key={offer.id}>
                                        <CardHeader className="p-3">
                                            <div className="flex justify-between items-start">
                                                <CardTitle className="text-base">{offer.name}</CardTitle>
                                                <div className="flex items-center">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyOffer(topic, offer.id)}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEditingOffer(topic, offer)}><Edit className="h-4 w-4" /></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will permanently delete the offer "{offer.name}".</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteOffer(topic, offer.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                            <CardDescription className="text-xs">{offer.outcome}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                ))}
                                <Button className="w-full mt-2" variant="outline" onClick={() => handleStartEditingOffer(topic)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Offer
                                </Button>
                            </AccordionContent>
                        </AccordionItem>
                      </>
                     )}
                  </Accordion>

                  {selectedOfferTypes.length > 0 && (
                    <div>
                        <Separator className="my-4"/>
                        <div>
                            <h4 className="font-semibold text-foreground mb-2">Add Focus Area</h4>
                            <form onSubmit={(e) => handleAddActionTask(e, topic)} className="space-y-2">
                               <div className="flex items-center gap-2">
                                  <Input 
                                      placeholder="New focus area for this offer..."
                                      value={newActionTasks[topic] || ''}
                                      onChange={(e) => handleActionTaskChange(topic, e.target.value)}
                                  />
                                  <Button type="submit" size="icon" className="flex-shrink-0">
                                      <PlusCircle className="h-5 w-5"/>
                                  </Button>
                               </div>
                               {releases.length > 0 && (
                                <div>
                                    <Label htmlFor={`release-select-${topic}`} className="text-xs">Add to Expertise (Optional)</Label>
                                    <Select 
                                        value={selectedReleaseForTask[topic] || ''} 
                                        onValueChange={(value) => setSelectedReleaseForTask(prev => ({...prev, [topic]: value}))}
                                    >
                                        <SelectTrigger id={`release-select-${topic}`}>
                                            <SelectValue placeholder="Select an expertise..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {releases.map(r => (
                                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                               )}
                            </form>
                            <p className="text-xs text-muted-foreground mt-2">
                                Added focus areas will appear in your Deep Work library under the "{topic}" topic.
                            </p>
                        </div>
                    </div>
                  )}
                </CardContent>
                </Card>
            )
          })}
        </div>
      </div>
      <Dialog open={!!editingTopic} onOpenChange={(isOpen) => !isOpen && setEditingTopic(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Topic</DialogTitle>
                <DialogDescription>Rename the topic or change its classification. This will affect all associated focus areas and plans.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="topic-name">Topic Name</Label>
                    <Input id="topic-name" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Classification</Label>
                    <RadioGroup value={newTopicClassification} onValueChange={(v) => setNewTopicClassification(v as 'product' | 'service')} className="flex gap-4 pt-1">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="product" id="class-product" />
                            <Label htmlFor="class-product" className="font-normal">Product</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="service" id="class-service" />
                            <Label htmlFor="class-service" className="font-normal">Service</Label>
                        </div>
                    </RadioGroup>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingTopic(null)}>Cancel</Button>
                <Button onClick={handleSaveTopic}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {editingOffer && (
        <Dialog open={!!editingOffer} onOpenChange={(isOpen) => !isOpen && setEditingOffer(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{editingOffer.offer.name ? 'Edit Offer' : 'Create New Offer'}</DialogTitle>
                    <DialogDescription>
                        Use this template to turn your service topic into a concrete offer.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <ScrollArea className="h-full pr-6">
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="offer-name">1. Offer Name</Label>
                                <Input id="offer-name" value={editingOffer.offer.name || ''} onChange={(e) => handleUpdateEditingOffer('name', e.target.value)} placeholder="e.g., Launch Starter, GPU Boost Sprint" />
                            </div>
                            <div>
                                <Label htmlFor="offer-outcome">2. Outcome / Promise</Label>
                                <Textarea id="offer-outcome" value={editingOffer.offer.outcome || ''} onChange={(e) => handleUpdateEditingOffer('outcome', e.target.value)} placeholder="Get [X result] in [Y time] using [Z method]" />
                            </div>
                            <div>
                                <Label htmlFor="offer-audience">3. Who It's For (Audience)</Label>
                                <Textarea id="offer-audience" value={editingOffer.offer.audience || ''} onChange={(e) => handleUpdateEditingOffer('audience', e.target.value)} placeholder="Describe the ideal client segment" />
                            </div>
                            <div>
                                <Label htmlFor="offer-deliverables">4. Core Deliverables</Label>
                                <Textarea id="offer-deliverables" value={editingOffer.offer.deliverables || ''} onChange={(e) => handleUpdateEditingOffer('deliverables', e.target.value)} placeholder="List tangible items the client will receive, one per line." />
                            </div>
                            <div>
                                <Label htmlFor="offer-valueStack">5. Value Stack</Label>
                                <Textarea id="offer-valueStack" value={editingOffer.offer.valueStack || ''} onChange={(e) => handleUpdateEditingOffer('valueStack', e.target.value)} placeholder="List all included items, one per line. Include core work, support, and bonuses." />
                            </div>
                            <div>
                                <Label htmlFor="offer-timeline">6. Timeline</Label>
                                <Input id="offer-timeline" value={editingOffer.offer.timeline || ''} onChange={(e) => handleUpdateEditingOffer('timeline', e.target.value)} placeholder="e.g., Delivered in 3 working days" />
                            </div>
                            <div>
                                <Label htmlFor="offer-price">7. Price</Label>
                                <Input id="offer-price" value={editingOffer.offer.price || ''} onChange={(e) => handleUpdateEditingOffer('price', e.target.value)} placeholder="e.g., $500 flat (50% upfront)" />
                            </div>
                             <div>
                                <Label htmlFor="offer-format">8. Format / Delivery</Label>
                                <Textarea id="offer-format" value={editingOffer.offer.format || ''} onChange={(e) => handleUpdateEditingOffer('format', e.target.value)} placeholder="How is the service delivered? (e.g., GitHub, Loom, Notion)" />
                            </div>
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingOffer(null)}>Cancel</Button>
                    <Button onClick={handleSaveOffer}>Save Offer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default function OfferizationPage() {
    return (
        <AuthGuard>
            <OfferizationPageContent />
        </AuthGuard>
    )
}
