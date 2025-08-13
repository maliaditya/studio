
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Package, PlusCircle, Calendar as CalendarIcon, Edit, Trash2, Book, Target, Clock, Banknote } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import type { ExerciseCategory, ExerciseDefinition, GapAnalysis, Project, Release, ProjectPlan } from '@/types/workout';
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
  const { currentUser, projects, setProjects, deepWorkDefinitions, setDeepWorkDefinitions, productizationPlans, setProductizationPlans, metaRules, pillarEquations } = useAuth();
  const { toast } = useToast();
  
  // State for release planning
  const [editingRelease, setEditingRelease] = useState<{ projectId: string; release: Partial<Release> } | null>(null);

  const handleProductTypeChange = (projectId: string, productType: string) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, productType } : p));
    toast({ title: "Product Type Set!", description: `Set to "${productType}" for the project.` });
  };
  
  const handleGapAnalysisChange = (projectId: string, field: keyof Omit<GapAnalysis, 'gapTypes'>, value: string) => {
    setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
            return {
                ...p,
                gapAnalysis: {
                    ...(p.gapAnalysis || { gapTypes: [], whatYouCanFill: '', coreSolution: '', outcomeGoal: '' }),
                    [field]: value
                }
            }
        }
        return p;
    }));
  };

  const handleGapTypeChange = (projectId: string, gapToAddOrRemove: string) => {
    setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
            const currentGapAnalysis = p.gapAnalysis || { gapTypes: [], whatYouCanFill: '', coreSolution: '', outcomeGoal: '' };
            const currentGapTypes = currentGapAnalysis.gapTypes || [];
            const newGapTypes = currentGapTypes.includes(gapToAddOrRemove)
                ? currentGapTypes.filter(g => g !== gapToAddOrRemove)
                : [...currentGapTypes, gapToAddOrRemove];
            return {
                ...p,
                gapAnalysis: { ...currentGapAnalysis, gapTypes: newGapTypes }
            }
        }
        return p;
    }));
  };

  const handleStartEditingRelease = (projectId: string, release?: Release) => {
    setEditingRelease({
        projectId,
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

  const handleToggleFocusAreaInRelease = (featureId: string) => {
     setEditingRelease(current => {
        if (!current) return null;
        const currentIds = current.release.focusAreaIds || [];
        const newIds = currentIds.includes(featureId)
            ? currentIds.filter(id => id !== featureId)
            : [...currentIds, featureId];
        return {
            ...current,
            release: { ...current.release, focusAreaIds: newIds }
        }
     });
  };
  
  const handleSaveRelease = () => {
    if (!editingRelease) return;
    const { projectId, release } = editingRelease;
    if (!release.name?.trim()) {
      toast({ title: "Error", description: "Release name cannot be empty.", variant: "destructive" });
      return;
    }
  
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const existingReleases = p.releases || [];
        const releaseIndex = existingReleases.findIndex(r => r.id === release.id);
        let newReleasesList: Release[];
  
        if (releaseIndex > -1) {
          newReleasesList = existingReleases.map(r => r.id === release.id ? release as Release : r);
        } else {
          newReleasesList = [...existingReleases, release as Release];
        }
        
        const sortedNewReleases = newReleasesList.sort((a,b) => new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime());
        return { ...p, releases: sortedNewReleases };
      }
      return p;
    }));
    
    toast({ title: "Release Saved", description: `"${release.name}" has been saved.`});
    setEditingRelease(null);
  
    if (projectId === 'proj_LifeOS' && currentUser?.username === 'Lonewolf') { // Example check
      const updatedProject = projects.find(p => p.id === projectId);
      if(updatedProject?.releases) {
          publishReleases(updatedProject.releases);
      }
    }
  };

  const handleDeleteRelease = (projectId: string, releaseId: string) => {
    setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
            const updatedReleases = (p.releases || []).filter(r => r.id !== releaseId);
            return { ...p, releases: updatedReleases };
        }
        return p;
    }));
    
    toast({ title: "Release Deleted", description: "The release has been removed from your plan.", variant: "destructive" });
  };
  
  const publishReleases = async (releasesToPublish: Release[]) => {
    if (!currentUser?.username || currentUser.username !== 'Lonewolf') return;

    if (!releasesToPublish) {
        releasesToPublish = [];
    }

    const augmentedReleases = releasesToPublish.map(release => {
      const featureNames = (release.focusAreaIds || [])
        .map(id => projects.flatMap(p => p.features).find(f => f.id === id)?.name)
        .filter((name): name is string => !!name);
      return { ...release, features: featureNames };
    });

    toast({ title: "Publishing...", description: "Updating the public release plan for Life OS." });

    try {
        const response = await fetch('/api/publish-releases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username, releases: augmentedReleases }),
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to publish releases.');
        }

        toast({ title: "Success!", description: result.message || "Life OS release plan updated." });

    } catch (error) {
        console.error("Failed to publish releases:", error);
        toast({
            title: "Error Publishing",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
            variant: "destructive",
        });
    }
  };

  const renderReleaseForm = (project: Project) => {
    if (!editingRelease || editingRelease.projectId !== project.id) return null;
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
            <Label>Included Features</Label>
            <div className="space-y-2 mt-2 rounded-md border p-3 max-h-48 overflow-y-auto">
              {project.features.map(fa => (
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
            Turn your projects into valuable products.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const selectedProductType = project.productType;
            const gapAnalysis = project.gapAnalysis;
            const releases = project.releases || [];

            return (
                <Card key={project.id} className="flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start gap-4">
                            <CardTitle className="flex items-center gap-3">
                                <Briefcase className="h-5 w-5 text-primary"/>
                                {project.name}
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                      <Accordion type="multiple" collapsible className="w-full" defaultValue={['item-1']}>
                        <AccordionItem value="item-1">
                           <AccordionTrigger>Product Type</AccordionTrigger>
                           <AccordionContent>
                              <Select value={selectedProductType || ''} onValueChange={(value) => handleProductTypeChange(project.id, value)}>
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
                        <AccordionItem value="item-2">
                           <AccordionTrigger>Gap Analysis</AccordionTrigger>
                           <AccordionContent className="space-y-4">
                              <p className="text-xs text-muted-foreground">Answer these questions to define your product strategy.</p>
                              <div>
                                  <Label htmlFor={`gapType-${project.id}`} className="text-sm">Gap Type</Label>
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
                                                          onCheckedChange={() => handleGapTypeChange(project.id, item.name)}
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
                                  <Label htmlFor={`strain-${project.id}`} className="text-sm">How will this reduce strain on the human body or mind?</Label>
                                  <Textarea id={`strain-${project.id}`} value={gapAnalysis?.strainReduction || ''} onChange={(e) => handleGapAnalysisChange(project.id, 'strainReduction', e.target.value)} placeholder="Assist or automate daily manual work..." />
                              </div>
                              <div>
                                  <Label htmlFor={`fill-${project.id}`} className="text-sm">What You Can Fill</Label>
                                  <Textarea id={`fill-${project.id}`} value={gapAnalysis?.whatYouCanFill || ''} onChange={(e) => handleGapAnalysisChange(project.id, 'whatYouCanFill', e.target.value)} placeholder="How can you specifically address this gap?" />
                              </div>
                              <div>
                                  <Label htmlFor={`solution-${project.id}`} className="text-sm">Core Solution / Offer</Label>
                                  <Textarea id={`solution-${project.id}`} value={gapAnalysis?.coreSolution || ''} onChange={(e) => handleGapAnalysisChange(project.id, 'coreSolution', e.target.value)} placeholder="What is the core product or service?" />
                              </div>
                              <div>
                                  <Label htmlFor={`goal-${project.id}`} className="text-sm">Outcome Goal</Label>
                                  <Textarea id={`goal-${project.id}`} value={gapAnalysis?.outcomeGoal || ''} onChange={(e) => handleGapAnalysisChange(project.id, 'outcomeGoal', e.target.value)} placeholder="What is the desired result?" />
                              </div>
                           </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
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
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEditingRelease(project.id, release)}><Edit className="h-4 w-4"/></Button>
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
                                              <AlertDialogAction onClick={() => handleDeleteRelease(project.id, release.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="p-3 text-sm">
                                    {release.description && <p className="mb-2 text-muted-foreground">{release.description}</p>}
                                    <p className="font-medium text-foreground">Features:</p>
                                    <ul className="list-disc list-inside text-muted-foreground">
                                      {(release.focusAreaIds || []).map((id, index) => {
                                        const feature = project.features.find(f => f.id === id);
                                        return <li key={`${id}-${index}`}>{feature?.name || 'Unknown Feature'}</li>;
                                      })}
                                    </ul>
                                  </CardContent>
                                </Card>
                              ))}

                              {editingRelease?.projectId === project.id ? renderReleaseForm(project) : (
                                 <Button className="w-full mt-2" variant="outline" onClick={() => handleStartEditingRelease(project.id)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Release
                                </Button>
                              )}
                           </AccordionContent>
                        </AccordionItem>
                      </Accordion>
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
