
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
import type { ExerciseCategory, ExerciseDefinition, GapAnalysis, Offer, ProductizationPlan as OfferizationPlan, Release, MicroSkill, CoreSkill } from '@/types/workout';
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
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';


function OfferizationPageContent() {
  const { coreSkills, setCoreSkills, offerizationPlans, setOfferizationPlans, copyOffer, skillAcquisitionPlans } = useAuth();
  const { toast } = useToast();
  
  const [newMicroSkillNames, setNewMicroSkillNames] = useState<Record<string, string>>({});
  
  const [editingRelease, setEditingRelease] = useState<{ specializationId: string; release: Partial<Release> } | null>(null);
  
  const [editingSpecialization, setEditingSpecialization] = useState<CoreSkill | null>(null);

  const [editingOffer, setEditingOffer] = useState<{ specializationId: string; offer: Partial<Offer> } | null>(null);
  
  const specializations = useMemo(() => {
    const plannedSpecializationIds = new Set((skillAcquisitionPlans || []).map(p => p.specializationId));
    return coreSkills.filter(skill => skill.type === 'Specialization' && plannedSpecializationIds.has(skill.id));
  }, [coreSkills, skillAcquisitionPlans]);

  const handleOfferTypeChange = (specializationId: string, offerTypeToAddOrRemove: string) => {
    setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[specializationId] || {};
        const currentOfferTypes = currentPlan.offerTypes || [];
        const newOfferTypes = currentOfferTypes.includes(offerTypeToAddOrRemove)
            ? currentOfferTypes.filter(o => o !== offerTypeToAddOrRemove)
            : [...currentOfferTypes, offerTypeToAddOrRemove];
        
        newPlans[specializationId] = {
            ...currentPlan,
            offerTypes: newOfferTypes
        };
        return newPlans;
    });
  };
  
  const handleMicroSkillChange = (areaId: string, value: string) => {
    setNewMicroSkillNames(prev => ({ ...prev, [areaId]: value }));
  };

  const handleAddMicroSkill = (e: React.FormEvent, specializationId: string, areaId: string) => {
    e.preventDefault();
    const name = newMicroSkillNames[areaId]?.trim();
    if (!name) {
        toast({ title: 'Error', description: 'Micro-skill name cannot be empty.', variant: "destructive" });
        return;
    }

    setCoreSkills(prev => prev.map(s => {
        if (s.id === specializationId) {
            return {
                ...s,
                skillAreas: s.skillAreas.map(area => {
                    if (area.id === areaId) {
                        return { ...area, microSkills: [...area.microSkills, { id: `ms_${Date.now()}`, name }] };
                    }
                    return area;
                })
            };
        }
        return s;
    }));

    setNewMicroSkillNames(prev => ({ ...prev, [areaId]: '' }));
    toast({ title: 'Micro-Skill Added', description: `"${name}" has been added.` });
  };

  const handleGapAnalysisChange = (specializationId: string, field: keyof GapAnalysis, value: string) => {
    setOfferizationPlans(prev => ({
      ...prev,
      [specializationId]: {
        ...(prev[specializationId] || {}),
        gapAnalysis: {
          ...(prev[specializationId]?.gapAnalysis || { gapTypes: [], whatYouCanFill: '', coreSolution: '', outcomeGoal: '' }),
          [field]: value
        }
      }
    }));
  };

  const handleGapTypeChange = (specializationId: string, gapToAddOrRemove: string) => {
    setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[specializationId] || {};
        const currentGapAnalysis = currentPlan.gapAnalysis || { gapTypes: [], whatYouCanFill: '', coreSolution: '', outcomeGoal: '' };
        
        const currentGapTypes = currentGapAnalysis.gapTypes || [];
        const newGapTypes = currentGapTypes.includes(gapToAddOrRemove)
            ? currentGapTypes.filter(g => g !== gapToAddOrRemove)
            : [...currentGapTypes, gapToAddOrRemove];
            
        newPlans[specializationId] = {
            ...currentPlan,
            gapAnalysis: {
                ...currentGapAnalysis,
                gapTypes: newGapTypes
            }
        };
        return newPlans;
    });
  };

  const handleStartEditingRelease = (specializationId: string, release?: Release) => {
    setEditingRelease({
        specializationId,
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

  const handleToggleFocusAreaInRelease = (microSkillId: string) => {
     setEditingRelease(current => {
        if (!current) return null;
        const currentIds = current.release.focusAreaIds || [];
        const newIds = currentIds.includes(microSkillId)
            ? currentIds.filter(id => id !== microSkillId)
            : [...currentIds, microSkillId];
        return {
            ...current,
            release: { ...current.release, focusAreaIds: newIds }
        }
     });
  };

  const handleSaveRelease = () => {
    if (!editingRelease) return;
    const { specializationId, release } = editingRelease;
    if (!release.name?.trim()) {
      toast({ title: "Error", description: "Project name cannot be empty.", variant: "destructive" });
      return;
    }

    setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[specializationId] || {};
        const existingReleases = currentPlan.releases || [];
        
        const releaseIndex = existingReleases.findIndex(r => r.id === release.id);

        if (releaseIndex > -1) {
            existingReleases[releaseIndex] = release as Release;
        } else {
            existingReleases.push(release as Release);
        }

        newPlans[specializationId] = { ...currentPlan, releases: existingReleases.sort((a,b) => new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime()) };
        return newPlans;
    });

    toast({ title: "Project Saved", description: `"${release.name}" has been saved.`});
    setEditingRelease(null);
  };

  const handleDeleteRelease = (specializationId: string, releaseId: string) => {
     setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[specializationId];
        if (!currentPlan || !currentPlan.releases) return prev;

        currentPlan.releases = currentPlan.releases.filter(r => r.id !== releaseId);
        newPlans[specializationId] = currentPlan;
        
        return newPlans;
    });
    toast({ title: "Project Deleted", description: "The project has been removed from your plan.", variant: "destructive" });
  };
  
  const handleStartEditingOffer = (specializationId: string, offer?: Offer) => {
    setEditingOffer({
        specializationId,
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
    const { specializationId, offer } = editingOffer;
    if (!offer.name?.trim()) {
      toast({ title: "Error", description: "Offer name cannot be empty.", variant: "destructive" });
      return;
    }

    setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[specializationId] || {};
        const existingOffers = currentPlan.offers || [];
        
        const offerIndex = existingOffers.findIndex(o => o.id === offer.id);

        if (offerIndex > -1) {
            existingOffers[offerIndex] = offer as Offer;
        } else {
            existingOffers.push(offer as Offer);
        }

        newPlans[specializationId] = { ...currentPlan, offers: existingOffers };
        return newPlans;
    });

    toast({ title: "Offer Saved", description: `"${offer.name}" has been saved.`});
    setEditingOffer(null);
  };

  const handleDeleteOffer = (specializationId: string, offerId: string) => {
     setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[specializationId];
        if (!currentPlan || !currentPlan.offers) return prev;

        currentPlan.offers = currentPlan.offers.filter(o => o.id !== offerId);
        newPlans[specializationId] = currentPlan;
        
        return newPlans;
    });
    toast({ title: "Offer Deleted", description: "The offer has been removed from your plan.", variant: "destructive" });
  };


  const renderProjectForm = (specialization: CoreSkill) => {
    if (!editingRelease || editingRelease.specializationId !== specialization.id) return null;
    const { release } = editingRelease;
    const allMicroSkills = specialization.skillAreas.flatMap(area => area.microSkills);
    
    return (
      <Card className="mt-4 bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">{release.id?.startsWith('release_') ? 'Add New Project' : 'Edit Project'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="release-name">Project Name</Label>
            <Input id="release-name" value={release.name || ''} onChange={(e) => handleUpdateEditingRelease('name', e.target.value)} placeholder="e.g., CUDA Optimization, WebGL Development"/>
          </div>
          <div>
            <Label htmlFor="release-date">EST completion date</Label>
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
            <Textarea id="release-desc" value={release.description || ''} onChange={(e) => handleUpdateEditingRelease('description', e.target.value)} placeholder="What is the goal of this project?"/>
          </div>
          <div>
            <Label>Included Micro-Skills</Label>
            <div className="space-y-2 mt-2 rounded-md border p-3 max-h-48 overflow-y-auto">
              {allMicroSkills.map(ms => (
                <div key={ms.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`ms-${ms.id}`} 
                    checked={(release.focusAreaIds || []).includes(ms.id)}
                    onCheckedChange={() => handleToggleFocusAreaInRelease(ms.id)}
                  />
                  <Label htmlFor={`ms-${ms.id}`} className="font-normal">{ms.name}</Label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditingRelease(null)}>Cancel</Button>
            <Button onClick={handleSaveRelease}>Save Project</Button>
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
            Turn your specializations into valuable services and offers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specializations.map((spec) => {
            const plan = offerizationPlans[spec.id] || {};
            const selectedOfferTypes = plan.offerTypes || [];
            const gapAnalysis = plan.gapAnalysis;
            const releases = plan.releases || [];
            const offers = plan.offers || [];

            const microSkillMap = new Map(spec.skillAreas.flatMap(area => area.microSkills).map(ms => [ms.id, ms.name]));
            
            return (
                <Card key={spec.id} className="flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="flex items-center gap-3">
                            <Briefcase className="h-5 w-5 text-primary"/>
                            {spec.name}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                  <Accordion type="single" collapsible className="w-full">
                     <AccordionItem value="item-1">
                       <AccordionTrigger>Micro-Skills</AccordionTrigger>
                       <AccordionContent>
                          {spec.skillAreas.map(area => (
                              <div key={area.id} className="mb-2">
                                  <h4 className="font-semibold text-sm text-muted-foreground">{area.name}</h4>
                                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-2">
                                      {area.microSkills.map(ms => <li key={ms.id}>{ms.name}</li>)}
                                  </ul>
                                  <form onSubmit={(e) => handleAddMicroSkill(e, spec.id, area.id)} className="flex items-center gap-2 mt-2">
                                      <Input value={newMicroSkillNames[area.id] || ''} onChange={(e) => handleMicroSkillChange(area.id, e.target.value)} placeholder="Add new micro-skill..." className="h-8"/>
                                      <Button size="sm" className="h-8">Add</Button>
                                  </form>
                              </div>
                          ))}
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
                                                  onCheckedChange={() => handleOfferTypeChange(spec.id, item.name)}
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
                                  <Label htmlFor={`gapType-${spec.id}`} className="text-sm">Gap Type</Label>
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
                                                          onCheckedChange={() => handleGapTypeChange(spec.id, item.name)}
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
                                  <Label htmlFor={`strain-${spec.id}`} className="text-sm">How will this reduce strain on the human body or mind?</Label>
                                  <Textarea id={`strain-${spec.id}`} value={gapAnalysis?.strainReduction || ''} onChange={(e) => handleGapAnalysisChange(spec.id, 'strainReduction', e.target.value)} placeholder="Assist or automate daily manual work..." />
                              </div>
                              <div>
                                  <Label htmlFor={`fill-${spec.id}`} className="text-sm">What You Can Fill</Label>
                                  <Textarea id={`fill-${spec.id}`} value={gapAnalysis?.whatYouCanFill || ''} onChange={(e) => handleGapAnalysisChange(spec.id, 'whatYouCanFill', e.target.value)} placeholder="How can you specifically address this gap?" />
                              </div>
                              <div>
                                  <Label htmlFor={`solution-${spec.id}`} className="text-sm">Core Solution / Offer</Label>
                                  <Textarea id={`solution-${spec.id}`} value={gapAnalysis?.coreSolution || ''} onChange={(e) => handleGapAnalysisChange(spec.id, 'coreSolution', e.target.value)} placeholder="What is the core service or offer?" />
                              </div>
                              <div>
                                  <Label htmlFor={`goal-${spec.id}`} className="text-sm">Outcome Goal</Label>
                                  <Textarea id={`goal-${spec.id}`} value={gapAnalysis?.outcomeGoal || ''} onChange={(e) => handleGapAnalysisChange(spec.id, 'outcomeGoal', e.target.value)} placeholder="What is the desired result?" />
                              </div>
                           </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                           <AccordionTrigger>Project Planner</AccordionTrigger>
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
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEditingRelease(spec.id, release)}><Edit className="h-4 w-4"/></Button>
                                        <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete the project "{release.name}". This action cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteRelease(spec.id, release.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 text-sm">
                                    {release.description && <p className="mb-2 text-muted-foreground">{release.description}</p>}
                                    <p className="font-medium text-foreground">Micro-Skills:</p>
                                    <ul className="list-disc list-inside text-muted-foreground">
                                    {(release.focusAreaIds || []).map((id, index) => (
                                        <li key={`${id}-${index}`}>{microSkillMap.get(id) || 'Unknown Micro-Skill'}</li>
                                    ))}
                                    </ul>
                                </CardContent>
                                </Card>
                            ))}

                            {editingRelease?.specializationId === spec.id ? renderProjectForm(spec) : (
                                <Button className="w-full mt-2" variant="outline" onClick={() => handleStartEditingRelease(spec.id)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Project
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
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyOffer(spec.id, offer.id)}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEditingOffer(spec.id, offer)}><Edit className="h-4 w-4" /></Button>
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
                                                                <AlertDialogAction onClick={() => handleDeleteOffer(spec.id, offer.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                            <CardDescription className="text-xs">{offer.outcome}</CardDescription>
                                        </CardHeader>
                                    </Card>
                                ))}
                                <Button className="w-full mt-2" variant="outline" onClick={() => handleStartEditingOffer(spec.id)}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Offer
                                </Button>
                            </AccordionContent>
                        </AccordionItem>
                      </>
                     )}
                  </Accordion>
                </CardContent>
                </Card>
            )
          })}
        </div>
      </div>
      
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
