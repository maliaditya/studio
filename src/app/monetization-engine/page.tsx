
"use client";

import React, { useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Check, Magnet, Package, MessageCircle, ArrowRight, Book, Target, Calendar as CalendarIcon, Banknote, Clock, PlusCircle } from 'lucide-react';
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
import type { SkillAcquisitionPlan, HabitEquation } from '@/types/workout';

function MonetizationEnginePageContent() {
  const { 
    leadGenDefinitions, 
    offerizationPlans,
    skillAcquisitionPlans, 
    setSkillAcquisitionPlans,
    coreSkills, // Use coreSkills
    pillarEquations,
    metaRules,
  } = useAuth();
  const router = useRouter();

  // Derive specializations from coreSkills
  const specializations = React.useMemo(() => {
    return coreSkills.filter(skill => skill.type === 'Specialization');
  }, [coreSkills]);

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedPlanSpecId, setSelectedPlanSpecId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Partial<SkillAcquisitionPlan>>({});
  
  const salesSystemItems = [
    "Auto-reply template for inbound DMs",
    "Pricing sheet or calendar link",
    "Portfolio/demo breakdown to convert leads",
  ];

  const definedOffers = React.useMemo(() => {
    return Object.values(offerizationPlans || {}).flatMap(plan => plan.offers || []).slice(0, 3);
  }, [offerizationPlans]);

  const handleOpenPlanModal = (plan?: SkillAcquisitionPlan) => {
    if (plan) {
      setSelectedPlanSpecId(plan.specializationId);
      setCurrentPlan(plan);
    } else {
      setSelectedPlanSpecId(null);
      setCurrentPlan({ linkedRuleEquationIds: [] });
    }
    setIsPlanModalOpen(true);
  };
  
  const handleSavePlan = () => {
    if (!selectedPlanSpecId) return;

    const planToSave: SkillAcquisitionPlan = {
      specializationId: selectedPlanSpecId,
      targetDate: currentPlan.targetDate || '',
      requiredMoney: currentPlan.requiredMoney || null,
      requiredHours: currentPlan.requiredHours || null,
      linkedRuleEquationIds: currentPlan.linkedRuleEquationIds || [],
    };
    
    setSkillAcquisitionPlans(prev => {
        const existingIndex = prev.findIndex(p => p.specializationId === selectedPlanSpecId);
        if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = planToSave;
            return updated;
        }
        return [...prev, planToSave];
    });
    setIsPlanModalOpen(false);
  };
  
  const handlePlanFieldChange = (field: keyof Omit<SkillAcquisitionPlan, 'specializationId'>, value: any) => {
    setCurrentPlan(prev => ({...prev, [field]: value}));
  };

  const handleRuleLinkToggle = (ruleId: string) => {
    setCurrentPlan(prev => {
      const currentIds = prev.linkedRuleEquationIds || [];
      const newIds = currentIds.includes(ruleId)
        ? currentIds.filter(id => id !== ruleId)
        : [...currentIds, ruleId];
      return { ...prev, linkedRuleEquationIds: newIds };
    });
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
        
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Book className="h-6 w-6 text-primary" />
                    Skill Acquisition Plan
                  </CardTitle>
                  <Button onClick={() => handleOpenPlanModal()}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add/Edit Plan
                  </Button>
                </div>
                <CardDescription>Define the state and resources required to acquire a new specialization.</CardDescription>
            </CardHeader>
            <CardContent>
                {skillAcquisitionPlans.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                          <Card key={plan.specializationId} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenPlanModal(plan)}>
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
      
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
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
                          <Select value={selectedPlanSpecId || ''} onValueChange={setSelectedPlanSpecId}>
                              <SelectTrigger><SelectValue placeholder="Choose a specialization..." /></SelectTrigger>
                              <SelectContent>
                                  {specializations.map(spec => (
                                      <SelectItem key={spec.id} value={spec.id}>{spec.name}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>

                      {selectedPlanSpecId && (
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
                                                              checked={(currentPlan.linkedRuleEquationIds || []).includes(eq.id)}
                                                              onCheckedChange={() => handleRuleLinkToggle(eq.id)}
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
                                          <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !currentPlan.targetDate && "text-muted-foreground")}>
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {currentPlan.targetDate ? format(parseISO(currentPlan.targetDate), 'PPP') : <span>Pick a date</span>}
                                          </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0">
                                          <Calendar
                                              mode="single"
                                              selected={currentPlan.targetDate ? parseISO(currentPlan.targetDate) : undefined}
                                              onSelect={(date) => handlePlanFieldChange('targetDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                              initialFocus
                                          />
                                          </PopoverContent>
                                      </Popover>
                                  </div>
                                  <div className="space-y-1">
                                      <Label className="flex items-center gap-2 text-xs text-muted-foreground"><Banknote className="h-4 w-4"/> Money (Total Amount)</Label>
                                      <Input type="number" value={currentPlan.requiredMoney || ''} onChange={(e) => handlePlanFieldChange('requiredMoney', e.target.value === '' ? null : Number(e.target.value))} placeholder="e.g., 500" />
                                  </div>
                                  <div className="space-y-1">
                                      <Label className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-4 w-4"/> Energy (Total Productive Hours)</Label>
                                      <Input type="number" value={currentPlan.requiredHours || ''} onChange={(e) => handlePlanFieldChange('requiredHours', e.target.value === '' ? null : Number(e.target.value))} placeholder="e.g., 200" />
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPlanModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePlan} disabled={!selectedPlanSpecId}>Save Plan</Button>
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
