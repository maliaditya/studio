
"use client";

import React, { useState, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Package, PlusCircle, Calendar as CalendarIcon, Edit, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import type { ExerciseCategory, ExerciseDefinition, GapAnalysis, ProductizationPlan, Release } from '@/types/workout';
import { productTypes, GAP_TYPES } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


function ProductizationPageContent() {
  const { deepWorkDefinitions, setDeepWorkDefinitions, productizationPlans, setProductizationPlans, deepWorkTopicMetadata } = useAuth();
  const { toast } = useToast();
  const [newActionTasks, setNewActionTasks] = useState<Record<string, string>>({});
  
  // State for release planning
  const [editingRelease, setEditingRelease] = useState<{ topic: string; release: Partial<Release> } | null>(null);
  const [selectedReleaseForTask, setSelectedReleaseForTask] = useState<Record<string, string>>({});

  const topics = useMemo(() => {
    const topicMap = new Map<string, { name: string; category: string }[]>();
    (deepWorkDefinitions || []).forEach(def => {
      if (Array.isArray(def.focusAreas)) return;
      
      const topic = def.category;
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic)!.push(def);
    });
    return Array.from(topicMap.entries()).filter(([topic]) => {
        return deepWorkTopicMetadata[topic]?.classification === 'product';
    });
  }, [deepWorkDefinitions, deepWorkTopicMetadata]);

  const handleProductTypeChange = (topic: string, productType: string) => {
    setProductizationPlans(prev => ({
        ...prev,
        [topic]: { ...(prev[topic] || {}), productType }
    }));
    toast({ title: "Product Type Set!", description: `Set to "${productType}" for ${topic}.` });
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
        setProductizationPlans(prev => {
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
    toast({ title: 'Focus Area Added', description: `"${taskName}" is now in your Deep Work library and linked to the release if selected.` });
  };

  const handleGapAnalysisChange = (topic: string, field: keyof Omit<GapAnalysis, 'gapTypes'>, value: string) => {
    setProductizationPlans(prev => ({
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
    setProductizationPlans(prev => {
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
        release: release ? { ...release } : { id: `release_${Date.now()}`, name: '', description: '', launchDate: format(new Date(), 'yyyy-MM-dd'), focusAreaIds: [] }
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
      toast({ title: "Error", description: "Release name cannot be empty.", variant: "destructive" });
      return;
    }

    setProductizationPlans(prev => {
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

    toast({ title: "Release Saved", description: `"${release.name}" has been saved.`});
    setEditingRelease(null);
  };

  const handleDeleteRelease = (topic: string, releaseId: string) => {
     setProductizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[topic];
        if (!currentPlan || !currentPlan.releases) return prev;

        currentPlan.releases = currentPlan.releases.filter(r => r.id !== releaseId);
        newPlans[topic] = currentPlan;
        
        return newPlans;
    });
    toast({ title: "Release Deleted", description: "The release has been removed from your plan.", variant: "destructive" });
  };


  const renderReleaseForm = (topic: string, focusAreas: ExerciseDefinition[]) => {
    if (!editingRelease || editingRelease.topic !== topic) return null;
    const { release } = editingRelease;
    
    return (
      <Card className="mt-4 bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">{release.id?.startsWith('release_') ? 'Add New Release' : 'Edit Release'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="release-name">Release Name</Label>
            <Input id="release-name" value={release.name || ''} onChange={(e) => handleUpdateEditingRelease('name', e.target.value)} placeholder="e.g., V1 Launch, MVP"/>
          </div>
          <div>
            <Label htmlFor="release-date">Launch Date</Label>
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
            <Textarea id="release-desc" value={release.description || ''} onChange={(e) => handleUpdateEditingRelease('description', e.target.value)} placeholder="What is the goal of this release?"/>
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
            <Button onClick={handleSaveRelease}>Save Release</Button>
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
            Productization
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Turn your deep work topics into valuable products.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map(([topic, focusAreas]) => {
            const plan = productizationPlans[topic] || {};
            const selectedProductType = plan.productType;
            const gapAnalysis = plan.gapAnalysis;
            const releases = plan.releases || [];

            const focusAreaMap = new Map(focusAreas.map(fa => [fa.id, fa.name]));
            
            return (
                <Card key={topic} className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-primary"/>
                        {topic}
                    </CardTitle>
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
                       <AccordionTrigger>Product Type</AccordionTrigger>
                       <AccordionContent>
                          <Select value={selectedProductType || ''} onValueChange={(value) => handleProductTypeChange(topic, value)}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Select a product type..." />
                              </SelectTrigger>
                              <SelectContent>
                                  {productTypes.map((group) => (
                                  <SelectGroup key={group.group || group.title}>
                                      <SelectLabel>{group.group || group.title}</SelectLabel>
                                      {group.items.map(item => (
                                          <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>
                                      ))}
                                  </SelectGroup>
                                  ))}
                              </SelectContent>
                          </Select>
                          {selectedProductType && (
                              <p className="text-xs text-muted-foreground mt-2">
                                  {productTypes.flatMap(g => g.items).find(i => i.name === selectedProductType)?.description}
                              </p>
                          )}
                       </AccordionContent>
                    </AccordionItem>
                     {selectedProductType && (
                      <>
                        <AccordionItem value="item-3">
                           <AccordionTrigger>Gap Analysis</AccordionTrigger>
                           <AccordionContent className="space-y-4">
                              <p className="text-xs text-muted-foreground">Answer these questions to define your product strategy.</p>
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
                                  <Textarea id={`solution-${topic}`} value={gapAnalysis?.coreSolution || ''} onChange={(e) => handleGapAnalysisChange(topic, 'coreSolution', e.target.value)} placeholder="What is the core product or service?" />
                              </div>
                              <div>
                                  <Label htmlFor={`goal-${topic}`} className="text-sm">Outcome Goal</Label>
                                  <Textarea id={`goal-${topic}`} value={gapAnalysis?.outcomeGoal || ''} onChange={(e) => handleGapAnalysisChange(topic, 'outcomeGoal', e.target.value)} placeholder="What is the desired result?" />
                              </div>
                           </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                           <AccordionTrigger>Release Planner</AccordionTrigger>
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
                                              <AlertDialogDescription>This will permanently delete the release "{release.name}". This action cannot be undone.</AlertDialogDescription>
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

                              {editingRelease?.topic === topic ? renderReleaseForm(topic, focusAreas) : (
                                 <Button className="w-full mt-2" variant="outline" onClick={() => handleStartEditingRelease(topic)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Release
                                </Button>
                              )}
                           </AccordionContent>
                        </AccordionItem>
                      </>
                     )}
                  </Accordion>
                  
                  {selectedProductType && (
                    <div>
                        <Separator className="my-4"/>
                        <div>
                            <h4 className="font-semibold text-foreground mb-2">Add Focus Area</h4>
                            <form onSubmit={(e) => handleAddActionTask(e, topic)} className="space-y-2">
                               <div className="flex items-center gap-2">
                                  <Input 
                                      placeholder="New focus area for this product..."
                                      value={newActionTasks[topic] || ''}
                                      onChange={(e) => handleActionTaskChange(topic, e.target.value)}
                                  />
                                  <Button type="submit" size="icon" className="flex-shrink-0">
                                      <PlusCircle className="h-5 w-5"/>
                                  </Button>
                               </div>
                               {releases.length > 0 && (
                                <div>
                                    <Label htmlFor={`release-select-${topic}`} className="text-xs">Add to Release (Optional)</Label>
                                    <Select 
                                        value={selectedReleaseForTask[topic] || ''} 
                                        onValueChange={(value) => setSelectedReleaseForTask(prev => ({...prev, [topic]: value}))}
                                    >
                                        <SelectTrigger id={`release-select-${topic}`}>
                                            <SelectValue placeholder="Select a release..." />
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
    </>
  );
}

export default function ProductizationPage() {
    return (
        <AuthGuard>
            <ProductizationPageContent />
        </AuthGuard>
    )
}
