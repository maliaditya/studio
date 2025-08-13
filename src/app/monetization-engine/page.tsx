
"use client";

import React, { useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Check, Magnet, Package, MessageCircle, ArrowRight, Book, Target, Calendar as CalendarIcon, Banknote, Clock, PlusCircle, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SkillAcquisitionPlan, HabitEquation, Project, ProjectPlan } from '@/types/workout';

function MonetizationEnginePageContent() {
  const { 
    leadGenDefinitions, 
    offerizationPlans,
    skillAcquisitionPlans, 
    setSkillAcquisitionPlans,
    projects,
    setProjects,
    coreSkills,
    pillarEquations,
    metaRules,
  } = useAuth();
  const router = useRouter();

  // State for Skill Acquisition Plan modal
  const [isSkillPlanModalOpen, setIsSkillPlanModalOpen] = useState(false);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [currentSkillPlan, setCurrentSkillPlan] = useState<Partial<SkillAcquisitionPlan>>({});
  
  // State for Product Plan modal
  const [isProductPlanModalOpen, setIsProductPlanModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentProductPlan, setCurrentProductPlan] = useState<Partial<ProjectPlan>>({});


  const specializations = React.useMemo(() => {
    return coreSkills.filter(skill => skill.type === 'Specialization');
  }, [coreSkills]);

  const salesSystemItems = [
    "Auto-reply template for inbound DMs",
    "Pricing sheet or calendar link",
    "Portfolio/demo breakdown to convert leads",
  ];

  const definedOffers = React.useMemo(() => {
    return Object.values(offerizationPlans || {}).flatMap(plan => plan.offers || []).slice(0, 3);
  }, [offerizationPlans]);

  const handleOpenSkillPlanModal = (plan?: SkillAcquisitionPlan) => {
    if (plan) {
      setSelectedSpecId(plan.specializationId);
      setCurrentSkillPlan(plan);
    } else {
      setSelectedSpecId(null);
      setCurrentSkillPlan({ linkedRuleEquationIds: [] });
    }
    setIsSkillPlanModalOpen(true);
  };
  
  const handleSaveSkillPlan = () => {
    if (!selectedSpecId) return;

    const planToSave: SkillAcquisitionPlan = {
      specializationId: selectedSpecId,
      targetDate: currentSkillPlan.targetDate || '',
      requiredMoney: currentSkillPlan.requiredMoney || null,
      requiredHours: currentSkillPlan.requiredHours || null,
      linkedRuleEquationIds: currentSkillPlan.linkedRuleEquationIds || [],
    };
    
    setSkillAcquisitionPlans(prev => {
        const existingIndex = prev.findIndex(p => p.specializationId === selectedSpecId);
        if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = planToSave;
            return updated;
        }
        return [...prev, planToSave];
    });
    setIsSkillPlanModalOpen(false);
  };
  
  const handleSkillPlanFieldChange = (field: keyof Omit<SkillAcquisitionPlan, 'specializationId'>, value: any) => {
    setCurrentSkillPlan(prev => ({...prev, [field]: value}));
  };

  const handleSkillRuleLinkToggle = (ruleId: string) => {
    setCurrentSkillPlan(prev => {
      const currentIds = prev.linkedRuleEquationIds || [];
      const newIds = currentIds.includes(ruleId)
        ? currentIds.filter(id => id !== ruleId)
        : [...currentIds, ruleId];
      return { ...prev, linkedRuleEquationIds: newIds };
    });
  };

  const handleOpenProductPlanModal = (project: Project) => {
    setSelectedProjectId(project.id);
    setCurrentProductPlan(project.productPlan || { linkedRuleEquationIds: [] });
    setIsProductPlanModalOpen(true);
  };

  const handleProductPlanFieldChange = (field: keyof ProjectPlan, value: any) => {
    setCurrentProductPlan(prev => ({...prev, [field]: value}));
  };
  
  const handleProductRuleLinkToggle = (ruleId: string) => {
    setCurrentProductPlan(prev => {
      const currentIds = prev.linkedRuleEquationIds || [];
      const newIds = currentIds.includes(ruleId)
        ? currentIds.filter(id => id !== ruleId)
        : [...currentIds, ruleId];
      return { ...prev, linkedRuleEquationIds: newIds };
    });
  };

  const handleSaveProductPlan = () => {
    if (!selectedProjectId) return;
    setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, productPlan: currentProductPlan as ProjectPlan } : p));
    setIsProductPlanModalOpen(false);
  };

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            Monetization Engine
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            A framework to convert your attention, skills, and branding into income.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Skill Acquisition Plan */}
          <Card>
              <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <Book className="h-6 w-6 text-primary" />
                      Skill Acquisition Plan
                    </CardTitle>
                    <Button onClick={() => handleOpenSkillPlanModal()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add/Edit Plan
                    </Button>
                  </div>
                  <CardDescription>Define the state and resources required to acquire a new specialization.</CardDescription>
              </CardHeader>
              <CardContent>
                  {skillAcquisitionPlans.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                      {skillAcquisitionPlans.map(plan => {
                        const spec = specializations.find(s => s.id === plan.specializationId);
                        if (!spec) return null;
                        
                        const linkedEquations = (plan.linkedRuleEquationIds || []).map(id => {
                            for (const pillar in pillarEquations) {
                                const found = pillarEquations[pillar].find(eq => eq.id === id);
                                if (found) return found;
                            }
                            return null;
                        }).filter((eq): eq is HabitEquation => !!eq);

                        return (
                            <Card key={plan.specializationId} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenSkillPlanModal(plan)}>
                                <CardHeader>
                                    <CardTitle>{spec.name}</CardTitle>
                                    <CardDescription>Acquisition Plan</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Target/> Required State</h4>
                                        {linkedEquations.length > 0 ? (
                                            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                                {linkedEquations.map(eq => <li key={eq.id}>{eq.outcome}</li>)}
                                            </ul>
                                        ) : <p className="text-xs text-muted-foreground">No state linked.</p>}
                                    </div>
                                    <Separator />
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Package/> Required Resources</h4>
                                        <ul className="text-xs space-y-1">
                                            <li className="flex justify-between">
                                                <span className="text-muted-foreground flex items-center gap-2"><CalendarIcon className="h-4 w-4"/> Target Date:</span>
                                                <span className="font-medium">{plan.targetDate ? format(parseISO(plan.targetDate), 'PPP') : 'Not set'}</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-muted-foreground flex items-center gap-2"><Banknote className="h-4 w-4"/> Money Needed:</span>
                                                <span className="font-medium">{plan.requiredMoney != null ? `$${plan.requiredMoney}` : 'Not set'}</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4"/> Energy Needed:</span>
                                                <span className="font-medium">{plan.requiredHours != null ? `${plan.requiredHours} hrs` : 'Not set'}</span>
                                            </li>
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No skill acquisition plans defined yet. Click "Add Plan" to get started.</p>
                  )}
              </CardContent>
          </Card>
          
          {/* Product Plan */}
           <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Briefcase className="h-6 w-6 text-primary" />
                    Product Plans
                  </CardTitle>
                  <CardDescription>Define the state and resources required to build a product.</CardDescription>
              </CardHeader>
              <CardContent>
                  {projects.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                      {projects.map(project => {
                        const plan = project.productPlan;
                        if (!plan) return null;
                        
                        const linkedEquations = (plan.linkedRuleEquationIds || []).map(id => {
                            for (const pillar in pillarEquations) {
                                const found = pillarEquations[pillar].find(eq => eq.id === id);
                                if (found) return found;
                            }
                            return null;
                        }).filter((eq): eq is HabitEquation => !!eq);

                        return (
                            <Card key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenProductPlanModal(project)}>
                                <CardHeader>
                                    <CardTitle>{project.name}</CardTitle>
                                    <CardDescription>Product Plan</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Target/> Required State</h4>
                                        {linkedEquations.length > 0 ? (
                                            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                                {linkedEquations.map(eq => <li key={eq.id}>{eq.outcome}</li>)}
                                            </ul>
                                        ) : <p className="text-xs text-muted-foreground">No state linked.</p>}
                                    </div>
                                    <Separator />
                                    <div>
                                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Package/> Required Resources</h4>
                                        <ul className="text-xs space-y-1">
                                            <li className="flex justify-between">
                                                <span className="text-muted-foreground flex items-center gap-2"><CalendarIcon className="h-4 w-4"/> Target Date:</span>
                                                <span className="font-medium">{plan.targetDate ? format(parseISO(plan.targetDate), 'PPP') : 'Not set'}</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-muted-foreground flex items-center gap-2"><Banknote className="h-4 w-4"/> Money Needed:</span>
                                                <span className="font-medium">{plan.requiredMoney != null ? `$${plan.requiredMoney}` : 'Not set'}</span>
                                            </li>
                                            <li className="flex justify-between">
                                                <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4"/> Energy Needed:</span>
                                                <span className="font-medium">{plan.requiredHours != null ? `${plan.requiredHours} hrs` : 'Not set'}</span>
                                            </li>
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                      })}
                      {projects.every(p => !p.productPlan) && (
                         <p className="text-center text-muted-foreground py-4">Select a project to create a plan.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No projects exist. Create a project on the 'Skill' page to start a plan.</p>
                  )}
                   <Popover>
                        <PopoverTrigger asChild>
                            <Button className="w-full mt-4"><PlusCircle className="mr-2 h-4 w-4" /> Add/Edit Product Plan</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Select a Project</h4>
                                </div>
                                <div className="grid gap-2">
                                    {projects.map(project => (
                                        <Button key={project.id} variant="ghost" className="justify-start" onClick={() => handleOpenProductPlanModal(project)}>
                                            {project.name}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
              </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lead Generation */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Magnet className="h-6 w-6 text-primary" />
                Lead Generation
              </CardTitle>
              <CardDescription>Attract and capture opportunities by consistently performing these actions.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-3">
                {leadGenDefinitions.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-muted-foreground">{item.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => router.push('/lead-generation')}>
                Go to Lead Gen Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Offer System */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Package className="h-6 w-6 text-primary" />
                Offer System
              </CardTitle>
              <CardDescription>
                <span className="font-semibold block mt-2">"What do you offer?"</span>
                This is your product/service definition — what people are hiring you for.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-3">
                {definedOffers.length > 0 ? (
                    definedOffers.map((offer, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                            <span className="text-muted-foreground">{offer.name}</span>
                        </li>
                    ))
                ) : (
                    <li className="text-muted-foreground text-sm">No concrete offers defined yet. Go to the Offerization page to create them.</li>
                )}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => router.push('/offerization')}>
                Define Your Offers <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Sales System */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <MessageCircle className="h-6 w-6 text-primary" />
                Sales System
              </CardTitle>
              <CardDescription>Convert leads into commitments.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-3">
                {salesSystemItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Skill Acquisition Plan Modal */}
      <Dialog open={isSkillPlanModalOpen} onOpenChange={setIsSkillPlanModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Skill Acquisition Plan</DialogTitle>
            <DialogDescription>Define the state and resources required to acquire a new specialization.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow min-h-0 py-4">
              <ScrollArea className="h-full pr-4">
                  <div className="space-y-6">
                      <div>
                          <Label>Select Specialization to Plan</Label>
                          <Select value={selectedSpecId || ''} onValueChange={setSelectedSpecId}>
                              <SelectTrigger><SelectValue placeholder="Choose a specialization..." /></SelectTrigger>
                              <SelectContent>
                                  {specializations.map(spec => (
                                      <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>

                      {selectedSpecId && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                              <div className="space-y-4">
                                  <h3 className="font-semibold flex items-center gap-2"><Target className="h-5 w-5"/> Required State</h3>
                                  <p className="text-xs text-muted-foreground">Link the meta-rule equations that create the necessary mindset for this skill acquisition.</p>
                                  <Popover>
                                      <PopoverTrigger asChild>
                                          <Button variant="outline" className="w-full justify-start">Link Rule Equations...</Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-80">
                                          <ScrollArea className="h-60">
                                              <div className="space-y-2 p-1">
                                                  {Object.values(pillarEquations).flat().map(eq => (
                                                      <div key={eq.id} className="flex items-center space-x-2 p-1">
                                                          <Checkbox 
                                                              id={`eq-${eq.id}`}
                                                              checked={(currentSkillPlan.linkedRuleEquationIds || []).includes(eq.id)}
                                                              onCheckedChange={() => handleSkillRuleLinkToggle(eq.id)}
                                                          />
                                                          <Label htmlFor={`eq-${eq.id}`} className="font-normal w-full cursor-pointer">{eq.outcome}</Label>
                                                      </div>
                                                  ))}
                                              </div>
                                          </ScrollArea>
                                      </PopoverContent>
                                  </Popover>
                              </div>
                              <div className="space-y-4">
                                  <h3 className="font-semibold flex items-center gap-2"><Package className="h-5 w-5"/> Required Resources</h3>
                                  <div className="space-y-1">
                                      <Label className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarIcon className="h-4 w-4"/> Time (Target Date)</Label>
                                      <Popover>
                                          <PopoverTrigger asChild>
                                          <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !currentSkillPlan.targetDate && "text-muted-foreground")}>
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {currentSkillPlan.targetDate ? format(parseISO(currentSkillPlan.targetDate), 'PPP') : <span>Pick a date</span>}
                                          </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0">
                                          <Calendar
                                              mode="single"
                                              selected={currentSkillPlan.targetDate ? parseISO(currentSkillPlan.targetDate) : undefined}
                                              onSelect={(date) => handleSkillPlanFieldChange('targetDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                              initialFocus
                                          />
                                          </PopoverContent>
                                      </Popover>
                                  </div>
                                  <div className="space-y-1">
                                      <Label className="flex items-center gap-2 text-xs text-muted-foreground"><Banknote className="h-4 w-4"/> Money (Total Amount)</Label>
                                      <Input type="number" value={currentSkillPlan.requiredMoney || ''} onChange={(e) => handleSkillPlanFieldChange('requiredMoney', e.target.value === '' ? null : Number(e.target.value))} placeholder="e.g., 500" />
                                  </div>
                                  <div className="space-y-1">
                                      <Label className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-4 w-4"/> Energy (Total Productive Hours)</Label>
                                      <Input type="number" value={currentSkillPlan.requiredHours || ''} onChange={(e) => handleSkillPlanFieldChange('requiredHours', e.target.value === '' ? null : Number(e.target.value))} placeholder="e.g., 200" />
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSkillPlanModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSkillPlan} disabled={!selectedSpecId}>Save Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Product Plan Modal */}
      <Dialog open={isProductPlanModalOpen} onOpenChange={setIsProductPlanModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Product Plan for "{projects.find(p => p.id === selectedProjectId)?.name}"</DialogTitle>
                <DialogDescription>Define the state and resources required to build this product.</DialogDescription>
            </DialogHeader>
            <div className="flex-grow min-h-0 py-4">
                <ScrollArea className="h-full pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                          <h3 className="font-semibold flex items-center gap-2"><Target className="h-5 w-5"/> Required State</h3>
                          <p className="text-xs text-muted-foreground">Link the meta-rule equations that create the necessary mindset for this product.</p>
                          <Popover>
                              <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full justify-start">Link Rule Equations...</Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                  <ScrollArea className="h-60">
                                      <div className="space-y-2 p-1">
                                          {Object.values(pillarEquations).flat().map(eq => (
                                              <div key={eq.id} className="flex items-center space-x-2 p-1">
                                                  <Checkbox 
                                                      id={`prod-eq-${eq.id}`}
                                                      checked={(currentProductPlan.linkedRuleEquationIds || []).includes(eq.id)}
                                                      onCheckedChange={() => handleProductRuleLinkToggle(eq.id)}
                                                  />
                                                  <Label htmlFor={`prod-eq-${eq.id}`} className="font-normal w-full cursor-pointer">{eq.outcome}</Label>
                                              </div>
                                          ))}
                                      </div>
                                  </ScrollArea>
                              </PopoverContent>
                          </Popover>
                      </div>
                      <div className="space-y-4">
                          <h3 className="font-semibold flex items-center gap-2"><Package className="h-5 w-5"/> Required Resources</h3>
                          <div className="space-y-1">
                              <Label className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarIcon className="h-4 w-4"/> Time (Target Date)</Label>
                              <Popover>
                                  <PopoverTrigger asChild>
                                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !currentProductPlan.targetDate && "text-muted-foreground")}>
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {currentProductPlan.targetDate ? format(parseISO(currentProductPlan.targetDate), 'PPP') : <span>Pick a date</span>}
                                  </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                  <Calendar
                                      mode="single"
                                      selected={currentProductPlan.targetDate ? parseISO(currentProductPlan.targetDate) : undefined}
                                      onSelect={(date) => handleProductPlanFieldChange('targetDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                      initialFocus
                                  />
                                  </PopoverContent>
                              </Popover>
                          </div>
                          <div className="space-y-1">
                              <Label className="flex items-center gap-2 text-xs text-muted-foreground"><Banknote className="h-4 w-4"/> Money (Total Amount)</Label>
                              <Input type="number" value={currentProductPlan.requiredMoney || ''} onChange={(e) => handleProductPlanFieldChange('requiredMoney', e.target.value === '' ? null : Number(e.target.value))} placeholder="e.g., 500" />
                          </div>
                          <div className="space-y-1">
                              <Label className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-4 w-4"/> Energy (Total Productive Hours)</Label>
                              <Input type="number" value={currentProductPlan.requiredHours || ''} onChange={(e) => handleProductPlanFieldChange('requiredHours', e.target.value === '' ? null : Number(e.target.value))} placeholder="e.g., 200" />
                          </div>
                      </div>
                  </div>
                </ScrollArea>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsProductPlanModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveProductPlan}>Save Plan</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function MonetizationEnginePage() {
    return (
        <AuthGuard>
            <MonetizationEnginePageContent />
        </AuthGuard>
    )
}
