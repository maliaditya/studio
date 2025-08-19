

"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Check, Magnet, Package, MessageCircle, ArrowRight, Book, Target, Calendar as CalendarIcon, Banknote, Clock, PlusCircle, Briefcase, DraftingCompass, Copy, Download, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { format, parseISO, isAfter } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectLabel } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SkillAcquisitionPlan, HabitEquation, Project, ProjectPlan, GapAnalysis, Release, Offer, ExerciseCategory, ExerciseDefinition, MicroSkill, CoreSkill, SkillArea } from '@/types/workout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { offerTypes, GAP_TYPES, productTypes } from '@/lib/constants';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionComponent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DialogTitle as DialogTitleComponent, DialogDescription as DialogDescriptionComponent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu';


function PlanningContent() {
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
  const { toast } = useToast();

  const [isSkillPlanModalOpen, setIsSkillPlanModalOpen] = useState(false);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [currentSkillPlan, setCurrentSkillPlan] = useState<Partial<SkillAcquisitionPlan>>({});
  
  const [isProductPlanModalOpen, setIsProductPlanModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentProductPlan, setCurrentProductPlan] = useState<Partial<ProjectPlan>>({});

  const specializations = React.useMemo(() => {
    return coreSkills.filter(skill => skill.type === 'Specialization');
  }, [coreSkills]);

  const salesSystemItems = React.useMemo(() => [
    "Auto-reply template for inbound DMs",
    "Pricing sheet or calendar link",
    "Portfolio/demo breakdown to convert leads",
  ], []);

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

  const handleDeleteSkillPlan = (specializationId: string) => {
    setSkillAcquisitionPlans(prev => prev.filter(p => p.specializationId !== specializationId));
    toast({
      title: 'Plan Deleted',
      description: 'The skill acquisition plan has been removed.',
      variant: 'destructive',
    });
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
  
  const handleDeleteProductPlan = (projectId: string) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, productPlan: undefined } : p
    ));
    toast({
      title: 'Plan Deleted',
      description: 'The product plan has been removed.',
      variant: 'destructive',
    });
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                  <div className='flex-grow'>
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <Book className="h-6 w-6 text-primary" />
                      Skill Acquisition Plan
                    </CardTitle>
                    <CardDescription>Define the state and resources required to acquire a new specialization.</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenSkillPlanModal()}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add/Edit Plan
                  </Button>
                </div>
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
                          <Card key={plan.specializationId}>
                              <CardHeader>
                                  <div className="flex justify-between items-start">
                                      <div className='flex-grow cursor-pointer' onClick={() => handleOpenSkillPlanModal(plan)}>
                                          <CardTitle>{spec.name}</CardTitle>
                                          <CardDescription>Acquisition Plan</CardDescription>
                                      </div>
                                      <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                              <AlertDialogHeader>
                                                  <AlertDialogTitleComponent>Delete Plan?</AlertDialogTitleComponent>
                                                  <AlertDialogDescriptionComponent>Are you sure you want to delete the plan for "{spec.name}"?</AlertDialogDescriptionComponent>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => handleDeleteSkillPlan(plan.specializationId)}>Delete</AlertDialogAction>
                                              </AlertDialogFooter>
                                          </AlertDialogContent>
                                      </AlertDialog>
                                  </div>
                              </CardHeader>
                              <CardContent className="space-y-4 cursor-pointer" onClick={() => handleOpenSkillPlanModal(plan)}>
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
                  <p className="text-center text-muted-foreground py-4">No skill acquisition plans defined yet. Click "Add/Edit Plan" to get started.</p>
                )}
            </CardContent>
        </Card>
        
         <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className='flex-grow'>
                        <CardTitle className="flex items-center gap-3 text-xl">
                        <Briefcase className="h-6 w-6 text-primary" />
                        Product Plans
                        </CardTitle>
                        <CardDescription>Define the state and resources required to build a product.</CardDescription>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add/Edit Plan</Button>
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
                </div>
            </CardHeader>
            <CardContent>
                {projects.filter(p => p.productPlan).length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {projects.filter(p => p.productPlan).map(project => {
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
                          <Card key={project.id}>
                              <CardHeader>
                                  <div className="flex justify-between items-start">
                                      <div className='flex-grow cursor-pointer' onClick={() => handleOpenProductPlanModal(project)}>
                                          <CardTitle>{project.name}</CardTitle>
                                          <CardDescription>Product Plan</CardDescription>
                                      </div>
                                       <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4"/></Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                              <AlertDialogHeader>
                                                  <AlertDialogTitleComponent>Delete Plan?</AlertDialogTitleComponent>
                                                  <AlertDialogDescriptionComponent>Are you sure you want to delete the plan for "{project.name}"?</AlertDialogDescriptionComponent>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => handleDeleteProductPlan(project.id)}>Delete</AlertDialogAction>
                                              </AlertDialogFooter>
                                          </AlertDialogContent>
                                      </AlertDialog>
                                  </div>
                              </CardHeader>
                              <CardContent className="space-y-4 cursor-pointer" onClick={() => handleOpenProductPlanModal(project)}>
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
                  <p className="text-center text-muted-foreground py-4">No product plans defined yet. Select a project to create one.</p>
                )}
            </CardContent>
          </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
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
            <Button className="w-full" onClick={() => router.push('/strategic-planning?tab=offerization')}>
              Define Your Offers <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

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
      
      <Dialog open={isSkillPlanModalOpen} onOpenChange={setIsSkillPlanModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitleComponent>Skill Acquisition Plan</DialogTitleComponent><DialogDescriptionComponent>Define the state and resources required to acquire a new specialization.</DialogDescriptionComponent></DialogHeader>
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
      
      <Dialog open={isProductPlanModalOpen} onOpenChange={setIsProductPlanModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitleComponent>Product Plan for "{projects.find(p => p.id === selectedProjectId)?.name}"</DialogTitleComponent>
                <DialogDescriptionComponent>Define the state and resources required to build this product.</DialogDescriptionComponent>
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

function ProductizationContent() {
  const { 
    projects, 
    setProjects, 
    currentUser, 
    productizationPlans,
    addFeatureToRelease,
  } = useAuth();
  const { toast } = useToast();
  
  const [editingRelease, setEditingRelease] = useState<{ projectId: string; release: Partial<Release> } | null>(null);

  const plannedProjects = useMemo(() => {
    return projects.filter(p => p.productPlan);
  }, [projects]);

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plannedProjects.map((project) => {
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
                  <Accordion type="multiple" defaultValue={['item-1']} className="w-full">
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
                                          <AlertDialogTitleComponent>Are you sure?</AlertDialogTitleComponent>
                                          <AlertDialogDescriptionComponent>This will permanently delete the release "{release.name}". This action cannot be undone.</AlertDialogDescriptionComponent>
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
  );
}

function OfferizationContent() {
  const { coreSkills, setCoreSkills, offerizationPlans, setOfferizationPlans, copyOffer, skillAcquisitionPlans, projects, microSkillMap } = useAuth();
  const { toast } = useToast();
  
  const [newMicroSkillNames, setNewMicroSkillNames] = useState<Record<string, string>>({});
  
  const [editingRelease, setEditingRelease] = useState<{ specializationId: string; release: Partial<Release> } | null>(null);
  
  const [editingSpecialization, setEditingSpecialization] = useState<CoreSkill | null>(null);

  const [editingOffer, setEditingOffer] = useState<{ specializationId: string; offer: Partial<Offer> } | null>(null);
  
  // New state for hierarchical selection in the modal
  const [selectedSpecForMicro, setSelectedSpecForMicro] = useState<CoreSkill | null>(null);
  const [selectedSkillAreaForMicro, setSelectedSkillAreaForMicro] = useState<SkillArea | null>(null);

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
    const spec = coreSkills.find(s => s.id === specializationId);
    setEditingRelease({
        specializationId,
        release: release ? { ...release } : { id: `release_${Date.now()}_${Math.random()}`, name: '', description: '', launchDate: format(new Date(), 'yyyy-MM-dd'), focusAreaIds: [] }
    });
    setSelectedSpecForMicro(spec || null);
    setSelectedSkillAreaForMicro(null);
  };

  const handleUpdateEditingRelease = (field: keyof Release, value: any) => {
    setEditingRelease(current => {
      if (!current) return null;
      let newRelease = { ...current.release };
      if (field === 'name') {
          const selectedProject = projects.find(p => p.name === value);
          newRelease = {
              ...newRelease,
              name: value,
              focusAreaIds: selectedProject ? selectedProject.features.flatMap(f => f.linkedSkills.map(l => l.microSkillId)) : []
          };
      } else {
          newRelease = { ...newRelease, [field]: value };
      }
      return { ...current, release: newRelease };
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


  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {specializations.map((spec) => {
          const plan = offerizationPlans[spec.id] || {};
          const selectedOfferTypes = plan.offerTypes || [];
          const gapAnalysis = plan.gapAnalysis;
          const releases = plan.releases || [];
          const offers = plan.offers || [];
          
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
                <Accordion type="multiple" className="w-full">
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
                                          <AlertDialogTitleComponent>Are you sure?</AlertDialogTitleComponent>
                                          <AlertDialogDescriptionComponent>This will permanently delete the project "{release.name}". This action cannot be undone.</AlertDialogDescriptionComponent>
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
                                        <li key={`${id}-${index}`}>{microSkillMap.get(id)?.microSkillName || 'Unknown Micro-Skill'}</li>
                                    ))}
                                  </ul>
                              </CardContent>
                              </Card>
                          ))}

                          {editingRelease?.specializationId === spec.id ? (
                            <ProjectForm 
                                specialization={spec} 
                                editingRelease={editingRelease} 
                                handleUpdateEditingRelease={handleUpdateEditingRelease} 
                                handleToggleFocusAreaInRelease={handleToggleFocusAreaInRelease} 
                                handleSaveRelease={handleSaveRelease}
                                setEditingRelease={setEditingRelease}
                            />
                          ) : (
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
                                                              <AlertDialogTitleComponent>Are you sure?</AlertDialogTitleComponent>
                                                              <AlertDialogDescriptionComponent>This will permanently delete the offer "{offer.name}".</AlertDialogDescriptionComponent>
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
      
      {editingOffer && (
        <Dialog open={!!editingOffer} onOpenChange={(isOpen) => !isOpen && setEditingOffer(null)}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitleComponent>{editingOffer.offer.name ? 'Edit Offer' : 'Create New Offer'}</DialogTitleComponent>
                    <DialogDescriptionComponent>
                        Use this template to turn your service topic into a concrete offer.
                    </DialogDescriptionComponent>
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

const ProjectForm = ({ specialization, editingRelease, handleUpdateEditingRelease, handleToggleFocusAreaInRelease, handleSaveRelease, setEditingRelease }: {
    specialization: CoreSkill,
    editingRelease: { specializationId: string; release: Partial<Release> },
    handleUpdateEditingRelease: (field: keyof Release, value: any) => void,
    handleToggleFocusAreaInRelease: (microSkillId: string) => void,
    handleSaveRelease: () => void,
    setEditingRelease: React.Dispatch<React.SetStateAction<{ specializationId: string; release: Partial<Release> } | null>>,
}) => {
    const { projects, coreSkills } = useAuth();
    const [selectedSpecForMicro, setSelectedSpecForMicro] = useState<CoreSkill | null>(specialization);
    const [selectedSkillAreaForMicro, setSelectedSkillAreaForMicro] = useState<SkillArea | null>(null);

    const { release } = editingRelease;
    const allMicroSkills = useMemo(() => selectedSkillAreaForMicro?.microSkills || [], [selectedSkillAreaForMicro]);
    const projectsInDomain = useMemo(() => projects.filter(p => p.domainId === specialization.domainId), [specialization.domainId, projects]);
    
    return (
        <Card className="mt-4 bg-muted/50">
            <CardHeader>
                <CardTitle className="text-lg">{release.id?.startsWith('release_') ? 'Add New Project' : 'Edit Project'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="release-name">Project Name</Label>
                    <Select value={release.name || ''} onValueChange={(value) => handleUpdateEditingRelease('name', value)}>
                        <SelectTrigger id="release-name">
                            <SelectValue placeholder="Select a project..." />
                        </SelectTrigger>
                        <SelectContent>
                            {projectsInDomain.map(proj => (
                                <SelectItem key={proj.id} value={proj.name}>{proj.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                    <Textarea id="release-desc" value={release.description || ''} onChange={(e) => handleUpdateEditingRelease('description', e.target.value)} placeholder="What is the goal of this project?" />
                </div>
                <div>
                    <Label>Included Micro-Skills</Label>
                    <div className="space-y-2 mt-2 p-3 border rounded-md">
                        <div className='grid grid-cols-2 gap-2 mb-2'>
                            <Select value={selectedSpecForMicro?.id || ''} onValueChange={specId => {
                                setSelectedSpecForMicro(coreSkills.find(s => s.id === specId) || null);
                                setSelectedSkillAreaForMicro(null);
                            }}>
                                <SelectTrigger><SelectValue placeholder="Select Specialization..." /></SelectTrigger>
                                <SelectContent>
                                    {coreSkills.filter(s => s.type === 'Specialization').map(spec => (
                                        <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={selectedSkillAreaForMicro?.id || ''} onValueChange={areaId => {
                                const area = selectedSpecForMicro?.skillAreas.find(a => a.id === areaId) || null;
                                setSelectedSkillAreaForMicro(area);
                            }} disabled={!selectedSpecForMicro}>
                                <SelectTrigger><SelectValue placeholder="Select Skill Area..." /></SelectTrigger>
                                <SelectContent>
                                    {(selectedSpecForMicro?.skillAreas || []).map(area => (
                                        <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <ScrollArea className="max-h-36">
                            <div className="space-y-2">
                                {allMicroSkills.length > 0 ? allMicroSkills.map(ms => (
                                    <div key={ms.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`ms-${ms.id}`}
                                            checked={(release.focusAreaIds || []).includes(ms.id)}
                                            onCheckedChange={() => handleToggleFocusAreaInRelease(ms.id)}
                                        />
                                        <Label htmlFor={`ms-${ms.id}`} className="font-normal">{ms.name}</Label>
                                    </div>
                                )) : <p className="text-xs text-muted-foreground text-center">Select a skill area to see micro-skills.</p>}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setEditingRelease(null)}>Cancel</Button>
                    <Button onClick={handleSaveRelease}>Save Project</Button>
                </div>
            </CardContent>
        </Card>
    );
};


function OffersContent() {
  const { offerizationPlans, coreSkills, copyOffer } = useAuth();
  const { toast } = useToast();
  const offersContainerRef = React.useRef<HTMLDivElement>(null);

  const allOffers = useMemo(() => {
    return Object.entries(offerizationPlans || {})
      .flatMap(([topicId, plan]) => {
          const spec = coreSkills.find(cs => cs.id === topicId);
          return (plan.offers || []).map(offer => ({ ...offer, topic: spec?.name || topicId }))
      });
  }, [offerizationPlans, coreSkills]);

  const renderTextAsList = (text: string) => {
    if (!text || text.trim() === '') {
      return <p className="text-sm text-muted-foreground">-</p>;
    }
  
    if (text.includes('\n')) {
      return (
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          {text.split('\n').filter(line => line.trim()).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    }
    return <p className="text-sm text-muted-foreground">{text}</p>;
  };
  
  const handleCopyToClipboard = (offer: any) => {
    const formatForClipboard = (text: string) => {
      if (!text || text.trim() === '') return '  - Not specified';
      return text.split('\n').filter(line => line.trim()).map(item => `  - ${item.trim()}`).join('\n');
    };

    const textToCopy = `
Offer: ${offer.name}
Topic: ${offer.topic}

Outcome / Promise:
${offer.outcome || '-'}

Audience:
${offer.audience || '-'}

Core Deliverables:
${formatForClipboard(offer.deliverables)}

Value Stack:
${formatForClipboard(offer.valueStack)}

Timeline: ${offer.timeline || '-'}
Price: ${offer.price || '-'}
Format / Delivery: ${offer.format || '-'}
    `.trim().replace(/^\s+/gm, '');

    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({
        title: "Copied to Clipboard!",
        description: `The details for "${offer.name}" have been copied.`,
      });
    }, (err) => {
      toast({
        title: "Copy Failed",
        description: "Could not copy text to clipboard.",
        variant: "destructive",
      });
      console.error('Could not copy text: ', err);
    });
  };

  const handleDownloadHtml = () => {
    if (!offersContainerRef.current) {
        toast({
            title: "Download Failed",
            description: "Could not find the content to download.",
            variant: "destructive",
        });
        return;
    }

    const inlineStyles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      body { 
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
        background-color: #f8f9fa; 
        color: #212529; 
        padding: 2rem; 
        line-height: 1.6;
      }
      .container { 
        max-width: 1200px; 
        margin: 0 auto; 
      }
      .grid { 
        display: grid; 
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); 
        gap: 1.75rem; 
      }
      .card { 
        background-color: #ffffff; 
        border: 1px solid #dee2e6; 
        border-radius: 0.75rem; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.07);
        display: flex; 
        flex-direction: column; 
        overflow: hidden; 
        transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
      }
      .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
      }
      .card-header { 
        padding: 1.25rem 1.5rem; 
        border-bottom: 1px solid #e9ecef; 
      }
      .card-title { 
        font-size: 1.25rem; 
        line-height: 1.2; 
        font-weight: 600; 
        display: flex; 
        align-items: center; 
        gap: 0.75rem; 
        color: #0d1b2a;
      }
      .card-description { 
        color: #6c757d; 
        font-size: 0.875rem; 
        margin-top: 0.25rem; 
      }
      .card-content { 
        padding: 1.5rem; 
        flex-grow: 1; 
      }
      .card-footer { 
        padding: 1.25rem 1.5rem; 
        border-top: 1px solid #e9ecef; 
        background-color: #f8f9fa; 
      }
      h4 { 
        font-weight: 600; 
        font-size: 0.9rem; 
        margin-bottom: 0.5rem; 
        color: #495057;
      }
      p, ul { 
        color: #495057; 
        font-size: 0.875rem; 
        margin: 0; 
      }
      ul { 
        list-style-position: inside; 
        padding-left: 0;
        list-style-type: '— ';
      }
      li { 
        margin-bottom: 0.3rem; 
        padding-left: 0.5rem;
      }
      .grid-cols-2 { 
        display: grid; 
        grid-template-columns: repeat(2, minmax(0, 1fr)); 
        gap: 1.5rem; 
        margin-top: 1rem; 
      }
      svg { 
        display: inline-block; 
        width: 1.25em; 
        height: 1.25em; 
        vertical-align: middle;
      }
    `;

    const containerClone = offersContainerRef.current.cloneNode(true) as HTMLElement;
    
    containerClone.querySelectorAll('button').forEach(btn => btn.remove());
    
    const pageHtml = containerClone.innerHTML;

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LifeOS - Defined Offers</title>
        <style>
          ${inlineStyles}
        </style>
      </head>
      <body>
        <div class="container">
          <header style="text-align: center; margin-bottom: 2rem;">
            <h1 style="font-size: 2.25rem; font-weight: 700;">Defined Service Offers</h1>
            <p style="font-size: 1.125rem; color: #6b7280; margin-top: 0.5rem;">A complete overview of all your tangible service offerings.</p>
          </header>
          <div class="grid">
            ${pageHtml}
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lifeos-offers.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "Your offers page is being downloaded as an HTML file."
    });
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex justify-center items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">
              Defined Service Offers
          </h1>
          <Button variant="outline" size="icon" onClick={handleDownloadHtml}>
              <Download className="h-5 w-5" />
              <span className="sr-only">Download as HTML</span>
          </Button>
        </div>
      </div>
      {allOffers.length > 0 ? (
        <div ref={offersContainerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allOffers.map(offer => (
            <Card key={offer.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {offer.name}
                </CardTitle>
                <CardDescription>From topic: <span className="font-medium text-foreground">{offer.topic}</span></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Outcome</h4>
                  {renderTextAsList(offer.outcome)}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Audience</h4>
                  {renderTextAsList(offer.audience)}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Core Deliverables</h4>
                  {renderTextAsList(offer.deliverables)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <h4 className="font-semibold text-sm mb-1">Timeline</h4>
                      <p className="text-sm text-muted-foreground">{offer.timeline || '-'}</p>
                    </div>
                     <div>
                      <h4 className="font-semibold text-sm mb-1">Price</h4>
                      <p className="text-sm font-bold text-foreground">{offer.price || '-'}</p>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 p-4">
                <Button variant="outline" className="w-full" onClick={() => handleCopyToClipboard(offer)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
          <DraftingCompass className="h-16 w-16 mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No Offers Defined Yet</h3>
          <p className="mt-2 mb-4 max-w-md">
            Go to the Offerization page to turn your services into concrete, well-defined offers that you can present to clients.
          </p>
        </div>
      )}
    </>
  );
}

function MatrixContent() {
  const { projects, offerizationPlans, coreSkills } = useAuth();

  interface MatrixRow {
      topic: string;
      classification: 'product' | 'service';
      gapTypes: string[];
      whatYouCanFill: string;
      coreSolution: string;
      format: string | string[];
      status: 'In Progress' | 'Defined' | 'Planning';
      outcomeGoal: string;
  }

  const matrixData = useMemo(() => {
    const data: MatrixRow[] = [];

    (projects || []).forEach((project) => {
      const plan = project;
      if (plan && plan.gapAnalysis) {
        const isDefined = !!plan.productType;
        const status: MatrixRow['status'] = (plan.releases && plan.releases.length > 0)
            ? 'In Progress'
            : isDefined ? 'Defined' : 'Planning';
        
        data.push({
          topic: project.name,
          classification: 'product',
          gapTypes: plan.gapAnalysis.gapTypes || [],
          whatYouCanFill: plan.gapAnalysis.whatYouCanFill || '-',
          coreSolution: plan.gapAnalysis.coreSolution || '-',
          format: plan.productType || '-',
          status,
          outcomeGoal: plan.gapAnalysis.outcomeGoal || '-',
        });
      }
    });

    Object.entries(offerizationPlans || {}).forEach(([specId, plan]) => {
      const spec = coreSkills.find(s => s.id === specId);
      if (plan && plan.gapAnalysis) {
        const isDefined = !!(plan.offerTypes && plan.offerTypes.length > 0);
        const status: MatrixRow['status'] = (plan.releases && plan.releases.length > 0)
          ? 'In Progress'
          : isDefined ? 'Defined' : 'Planning';

        data.push({
          topic: spec?.name || specId,
          classification: 'service',
          gapTypes: plan.gapAnalysis.gapTypes || [],
          whatYouCanFill: plan.gapAnalysis.whatYouCanFill || '-',
          coreSolution: plan.gapAnalysis.coreSolution || '-',
          format: plan.offerTypes || [],
          status,
          outcomeGoal: plan.gapAnalysis.outcomeGoal || '-',
        });
      }
    });

    return data;
  }, [projects, offerizationPlans, coreSkills]);
  
  const renderTextAsList = (text: string, className?: string) => {
    if (!text || text.trim() === '-' || text.trim() === '') {
      return <p className={cn("text-sm text-muted-foreground", className)}>-</p>;
    }
  
    if (text.includes('\n')) {
      return (
        <ul className={cn("list-disc list-inside space-y-1 text-sm text-muted-foreground", className)}>
          {text.split('\n').filter(line => line.trim()).map((item, index) => (
            <li key={index}>{item.trim()}</li>
          ))}
        </ul>
      );
    }
    return <p className={cn("text-sm text-muted-foreground", className)}>{text}</p>;
  };

  const getStatusVariant = (status: MatrixRow['status']): "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'In Progress': return 'destructive';
      case 'Defined': return 'secondary';
      case 'Planning':
      default: return 'outline';
    }
  };


  return (
    <div className="h-full">
      {matrixData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matrixData.map((row) => (
                <Card key={row.topic} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <div className="flex justify-between items-start gap-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <span>{row.topic}</span>
                              <Badge variant="outline" className="capitalize text-xs font-medium">{row.classification}</Badge>
                            </CardTitle>
                            <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col space-y-4">
                         <div>
                            <h4 className="font-semibold text-sm">Format</h4>
                            {Array.isArray(row.format) ? (
                                row.format.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {row.format.map((f, i) => <Badge key={`${f}-${i}`} variant="secondary" className="text-xs">{f}</Badge>)}
                                    </div>
                                ) : (
                                    <p className="text-sm font-medium mt-1">-</p>
                                )
                            ) : (
                                <p className="text-sm font-medium mt-1">{row.format}</p>
                            )}
                        </div>
                        <Separator/>
                        <div className='flex-grow'>
                            <h4 className="font-semibold text-sm mb-2">Gap Analysis</h4>
                            {row.gapTypes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {row.gapTypes.map((gt, i) => <Badge key={`${gt}-${i}`} variant="outline" className="text-xs whitespace-nowrap">{gt}</Badge>)}
                                </div>
                            )}
                            <h5 className="font-medium text-xs text-muted-foreground">What You Can Fill</h5>
                            {renderTextAsList(row.whatYouCanFill)}
                        </div>
                        <Separator/>
                        <div>
                            <h4 className="font-semibold text-sm mb-1">Core Solution</h4>
                            {renderTextAsList(row.coreSolution, "text-foreground font-medium")}
                        </div>
                         <Separator/>
                        <div>
                            <h4 className="font-semibold text-sm mb-1">Outcome Goal</h4>
                            {renderTextAsList(row.outcomeGoal)}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
       ) : (
        <div className="h-48 flex items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <p>No product or service plans with gap analysis defined. <br/> Go to Productization or Offerization to get started.</p>
        </div>
       )}
    </div>
  );
}

function StrategicPlanningPageContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('planning');

  const tabs = [
    { value: 'planning', label: 'Planning' },
    { value: 'productization', label: 'Productization' },
    { value: 'offerization', label: 'Offerization' },
    { value: 'offers', label: 'Offers' },
    { value: 'matrix', label: 'Matrix' },
  ];
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && tabs.some(t => t.value === tab)) {
      setActiveTab(tab);
    }
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/strategic-planning?tab=${value}`, { scroll: false });
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Strategic Planning</h1>
        <p className="mt-4 text-lg text-muted-foreground">A unified dashboard for your entire monetization strategy, from planning to execution.</p>
      </div>

       <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            {tabs.map(tab => <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="planning" className="mt-6">
          <PlanningContent />
        </TabsContent>
        <TabsContent value="productization" className="mt-6">
          <ProductizationContent />
        </TabsContent>
        <TabsContent value="offerization" className="mt-6">
          <OfferizationContent />
        </TabsContent>
        <TabsContent value="offers" className="mt-6">
          <OffersContent />
        </TabsContent>
        <TabsContent value="matrix" className="mt-6">
          <MatrixContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StrategicPlanningPage() {
    return (
        <AuthGuard>
            <StrategicPlanningPageContent />
        </AuthGuard>
    )
}
